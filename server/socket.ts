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

interface RoomState {
  participants: Map<string, Participant>;
  locked: boolean;
  chatEnabled: boolean;
  startedAt: number;
  waitingRoom: Socket[];
}

// Room state: roomId -> RoomState
const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      participants: new Map(),
      locked: false,
      chatEnabled: true,
      startedAt: Date.now(),
      waitingRoom: [],
    });
  }
  return rooms.get(roomId)!;
}

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

      // Server-side host verification
      let isHost = false;
      if (data.isHost && data.hostSecret) {
        try {
          isHost = await verifyHostSecret(roomId, data.hostSecret);
        } catch {
          isHost = false;
        }
      }

      const room = getOrCreateRoom(roomId);

      // If room is locked and user is not host, put in waiting room
      if (room.locked && !isHost) {
        room.waitingRoom.push(socket);
        socket.emit("waiting-room", { message: "The host has locked this meeting. Please wait." });
        // Notify host about waiting participant
        for (const [, p] of room.participants) {
          if (p.isHost) {
            io.to(p.socketId).emit("waiting-room-update", {
              waiting: room.waitingRoom.map((s, i) => ({ id: i, socketId: s.id, displayName })),
            });
          }
        }
        return;
      }

      // Enforce max 10 participants
      if (room.participants.size >= 10) {
        socket.emit("room-full");
        return;
      }

      // Store participant
      const participant: Participant = { socketId: socket.id, displayName, isHost };
      room.participants.set(socket.id, participant);
      currentRoom = roomId;

      // Join socket.io room
      socket.join(roomId);

      // Send room config to new joiner
      socket.emit("room-config", {
        locked: room.locked,
        chatEnabled: room.chatEnabled,
        startedAt: room.startedAt,
      });

      // Notify existing participants about new peer
      const existingParticipants = Array.from(room.participants.entries())
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, p]) => ({ socketId: sid, displayName: p.displayName, isHost: p.isHost }));

      socket.emit("room-participants", existingParticipants);

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
      if (!currentRoom || currentRoom !== data.roomId) return;
      const room = rooms.get(data.roomId);
      if (!room || !room.participants.has(socket.id)) return;
      if (!room.chatEnabled) {
        socket.emit("error", { message: "Chat is disabled by the host." });
        return;
      }

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

    // Host: lock/unlock room
    socket.on("lock-room", (data: { roomId: string; locked: boolean }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;
      room.locked = !!data.locked;
      io.to(data.roomId).emit("room-config-update", { locked: room.locked });
    });

    // Host: enable/disable chat
    socket.on("toggle-chat", (data: { roomId: string; enabled: boolean }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;
      room.chatEnabled = !!data.enabled;
      io.to(data.roomId).emit("room-config-update", { chatEnabled: room.chatEnabled });
    });

    // Host: mute a participant
    socket.on("mute-participant", (data: { roomId: string; targetSocketId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;
      io.to(data.targetSocketId).emit("host-muted-you");
    });

    // Host: mute all
    socket.on("mute-all", (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;
      socket.to(data.roomId).emit("host-muted-you");
    });

    // Host: admit from waiting room
    socket.on("admit-participant", (data: { roomId: string; waitingSocketId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;
      const idx = room.waitingRoom.findIndex(s => s.id === data.waitingSocketId);
      if (idx !== -1) {
        const waitingSocket = room.waitingRoom.splice(idx, 1)[0];
        waitingSocket.emit("admitted");
      }
    });

    // Host: deny from waiting room
    socket.on("deny-participant", (data: { roomId: string; waitingSocketId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;
      const idx = room.waitingRoom.findIndex(s => s.id === data.waitingSocketId);
      if (idx !== -1) {
        const waitingSocket = room.waitingRoom.splice(idx, 1)[0];
        waitingSocket.emit("denied-entry");
      }
    });

    // Host: end meeting for all
    socket.on("end-meeting", (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;

      io.to(data.roomId).emit("meeting-ended");
      rooms.delete(data.roomId);
    });

    // Host: remove participant
    socket.on("remove-participant", (data: { roomId: string; targetSocketId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant?.isHost) return;
      if (!data.targetSocketId || typeof data.targetSocketId !== "string") return;

      io.to(data.targetSocketId).emit("removed-from-meeting");
      const targetSocket = io.sockets.sockets.get(data.targetSocketId);
      if (targetSocket) {
        targetSocket.leave(data.roomId);
      }
      const removed = room.participants.get(data.targetSocketId);
      room.participants.delete(data.targetSocketId);

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

      const participant = room.participants.get(socket.id);
      room.participants.delete(socket.id);
      // Also remove from waiting room if present
      room.waitingRoom = room.waitingRoom.filter(s => s.id !== socket.id);

      socket.to(currentRoom).emit("participant-left", {
        socketId: socket.id,
        displayName: participant?.displayName || "Unknown",
      });

      if (room.participants.size === 0) {
        rooms.delete(currentRoom);
      }
    });

    // Leave room explicitly
    socket.on("leave-room", (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      room.participants.delete(socket.id);
      socket.leave(data.roomId);
      currentRoom = null;

      socket.to(data.roomId).emit("participant-left", {
        socketId: socket.id,
        displayName: participant?.displayName || "Unknown",
      });

      if (room.participants.size === 0) {
        rooms.delete(data.roomId);
      }
    });
  });

  return io;
}
