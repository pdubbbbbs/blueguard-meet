import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyHostSecret } from "./db";

interface Participant {
  socketId: string;
  displayName: string;
  isHost: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

// Room state: roomId -> Map<socketId, Participant>
const rooms = new Map<string, Map<string, Participant>>();

// Connection rate limiting: IP -> { count, resetAt }
const connectionRateLimit = new Map<string, { count: number; resetAt: number }>();

// Sanitize user-provided strings: strip HTML tags, limit length
function sanitize(input: string, maxLength: number = 255): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{S}\p{M}]/gu, "")
    .trim()
    .slice(0, maxLength);
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://blueguardmt.com",
  "https://www.blueguardmt.com",
  "https://bluetoothdefense.com",
  "https://www.bluetoothdefense.com",
  "https://meet.bluetoothdefense.com",
];

// In development, also allow localhost
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000");
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Connection rate limiting middleware
  io.use((socket, next) => {
    const ip = socket.handshake.address;
    const now = Date.now();
    const entry = connectionRateLimit.get(ip);

    if (!entry || now > entry.resetAt) {
      connectionRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }

    if (entry.count >= 30) {
      return next(new Error("Rate limit exceeded. Try again later."));
    }

    entry.count++;
    next();
  });

  // Clean up rate limit entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of connectionRateLimit) {
      if (now > entry.resetAt) connectionRateLimit.delete(key);
    }
  }, 5 * 60 * 1000);

  io.on("connection", (socket: Socket) => {
    let currentRoom: string | null = null;

    socket.on("join-room", async (data: { roomId: string; displayName: string; isHost: boolean; hostSecret?: string }) => {
      // Validate inputs
      if (!data.roomId || typeof data.roomId !== "string" || !data.displayName || typeof data.displayName !== "string") {
        socket.emit("error", { message: "Invalid join data" });
        return;
      }

      const roomId = sanitize(data.roomId, 36);
      const displayName = sanitize(data.displayName, 100);

      // Server-side host verification: only grant host if valid hostSecret provided
      let isHost = false;
      if (data.isHost && data.hostSecret) {
        try {
          isHost = await verifyHostSecret(roomId, data.hostSecret);
        } catch {
          isHost = false;
        }
      }

      // Get or create room
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const room = rooms.get(roomId)!;

      // Enforce max 10 participants
      if (room.size >= 10) {
        socket.emit("room-full");
        return;
      }

      // Store participant
      const participant: Participant = { socketId: socket.id, displayName, isHost };
      room.set(socket.id, participant);
      currentRoom = roomId;

      // Join socket.io room
      socket.join(roomId);

      // Notify existing participants about new peer
      const existingParticipants = Array.from(room.entries())
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, p]) => ({ socketId: sid, displayName: p.displayName, isHost: p.isHost }));

      // Send existing participants to the new joiner
      socket.emit("room-participants", existingParticipants);

      // Notify others about the new participant
      socket.to(roomId).emit("participant-joined", {
        socketId: socket.id,
        displayName,
        isHost,
      });
    });

    // WebRTC signaling
    socket.on("offer", (data: { to: string; offer: RTCSessionDescriptionInit }) => {
      if (!data.to || typeof data.to !== "string") return;
      io.to(data.to).emit("offer", {
        from: socket.id,
        offer: data.offer,
      });
    });

    socket.on("answer", (data: { to: string; answer: RTCSessionDescriptionInit }) => {
      if (!data.to || typeof data.to !== "string") return;
      io.to(data.to).emit("answer", {
        from: socket.id,
        answer: data.answer,
      });
    });

    socket.on("ice-candidate", (data: { to: string; candidate: RTCIceCandidateInit }) => {
      if (!data.to || typeof data.to !== "string") return;
      io.to(data.to).emit("ice-candidate", {
        from: socket.id,
        candidate: data.candidate,
      });
    });

    // Chat messages
    socket.on("chat-message", (data: { roomId: string; text: string; sender: string }) => {
      // Only allow messages from participants in the room
      if (!currentRoom || currentRoom !== data.roomId) return;
      const room = rooms.get(data.roomId);
      if (!room || !room.has(socket.id)) return;

      const msg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: sanitize(data.sender, 100),
        text: sanitize(data.text, 2000),
        timestamp: Date.now(),
      };
      io.to(data.roomId).emit("chat-message", msg);
    });

    // Media state changes
    socket.on("media-state-change", (data: { roomId: string; audio: boolean; video: boolean }) => {
      if (!currentRoom || currentRoom !== data.roomId) return;
      socket.to(data.roomId).emit("media-state-change", {
        socketId: socket.id,
        audio: !!data.audio,
        video: !!data.video,
      });
    });

    // Host controls: end meeting for all
    socket.on("end-meeting", (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.get(socket.id);
      if (!participant?.isHost) return;

      io.to(data.roomId).emit("meeting-ended");
      // Clean up room
      rooms.delete(data.roomId);
    });

    // Host controls: remove participant
    socket.on("remove-participant", (data: { roomId: string; targetSocketId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.get(socket.id);
      if (!participant?.isHost) return;
      if (!data.targetSocketId || typeof data.targetSocketId !== "string") return;

      io.to(data.targetSocketId).emit("removed-from-meeting");
      const targetSocket = io.sockets.sockets.get(data.targetSocketId);
      if (targetSocket) {
        targetSocket.leave(data.roomId);
      }
      const removed = room.get(data.targetSocketId);
      room.delete(data.targetSocketId);

      // Notify others
      io.to(data.roomId).emit("participant-left", {
        socketId: data.targetSocketId,
        displayName: removed?.displayName || "Unknown",
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      const participant = room.get(socket.id);
      room.delete(socket.id);

      // Notify others
      socket.to(currentRoom).emit("participant-left", {
        socketId: socket.id,
        displayName: participant?.displayName || "Unknown",
      });

      // Clean up empty rooms
      if (room.size === 0) {
        rooms.delete(currentRoom);
      }
    });

    // Leave room explicitly
    socket.on("leave-room", (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;

      const participant = room.get(socket.id);
      room.delete(socket.id);
      socket.leave(data.roomId);
      currentRoom = null;

      socket.to(data.roomId).emit("participant-left", {
        socketId: socket.id,
        displayName: participant?.displayName || "Unknown",
      });

      if (room.size === 0) {
        rooms.delete(data.roomId);
      }
    });
  });

  return io;
}
