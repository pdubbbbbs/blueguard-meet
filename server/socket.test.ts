import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { setupSocketIO } from "./socket";

let httpServer: ReturnType<typeof createServer>;
let ioServer: Server;
let port: number;

function createClient(): ClientSocket {
  return ioClient(`http://localhost:${port}`, {
    path: "/api/socket.io",
    transports: ["websocket"],
    autoConnect: false,
  });
}

function waitFor(socket: ClientSocket, event: string, timeout = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    socket.once(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      httpServer = createServer();
      ioServer = setupSocketIO(httpServer);
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    })
);

afterAll(
  () =>
    new Promise<void>((resolve) => {
      ioServer.close();
      httpServer.close(() => resolve());
    })
);

describe("Socket.IO Signaling", () => {
  let client1: ClientSocket;
  let client2: ClientSocket;

  afterEach(() => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
  });

  it("allows a client to join a room and receive empty participants list", async () => {
    client1 = createClient();
    client1.connect();

    const participantsPromise = waitFor(client1, "room-participants");
    client1.emit("join-room", { roomId: "test-room-1", displayName: "Alice", isHost: true });

    const participants = await participantsPromise;
    expect(participants).toEqual([]);
  });

  it("notifies existing participants when a new peer joins", async () => {
    client1 = createClient();
    client2 = createClient();

    client1.connect();
    await waitFor(client1, "connect");

    // Client 1 joins first
    const p1Ready = waitFor(client1, "room-participants");
    client1.emit("join-room", { roomId: "test-room-2", displayName: "Alice", isHost: true });
    await p1Ready;

    // Client 2 joins
    const joinedPromise = waitFor(client1, "participant-joined");
    client2.connect();
    await waitFor(client2, "connect");
    client2.emit("join-room", { roomId: "test-room-2", displayName: "Bob", isHost: false });

    const joined = await joinedPromise;
    expect(joined.displayName).toBe("Bob");
    expect(joined.isHost).toBe(false);
  });

  it("relays chat messages to all room participants", async () => {
    client1 = createClient();
    client2 = createClient();

    client1.connect();
    await waitFor(client1, "connect");
    const p1Ready = waitFor(client1, "room-participants");
    client1.emit("join-room", { roomId: "test-room-3", displayName: "Alice", isHost: true });
    await p1Ready;

    client2.connect();
    await waitFor(client2, "connect");
    const p2Ready = waitFor(client2, "room-participants");
    client2.emit("join-room", { roomId: "test-room-3", displayName: "Bob", isHost: false });
    await p2Ready;

    // Send chat message from client1
    const msgPromise = waitFor(client2, "chat-message");
    client1.emit("chat-message", { roomId: "test-room-3", text: "Hello!", sender: "Alice" });

    const msg = await msgPromise;
    expect(msg.text).toBe("Hello!");
    expect(msg.sender).toBe("Alice");
    expect(msg.id).toBeDefined();
    expect(msg.timestamp).toBeDefined();
  });

  it("relays WebRTC offer to target peer", async () => {
    client1 = createClient();
    client2 = createClient();

    client1.connect();
    await waitFor(client1, "connect");
    const p1Ready = waitFor(client1, "room-participants");
    client1.emit("join-room", { roomId: "test-room-4", displayName: "Alice", isHost: true });
    await p1Ready;

    client2.connect();
    await waitFor(client2, "connect");
    const p2Ready = waitFor(client2, "room-participants");
    client2.emit("join-room", { roomId: "test-room-4", displayName: "Bob", isHost: false });
    await p2Ready;

    // Client1 sends offer to client2
    const offerPromise = waitFor(client2, "offer");
    client1.emit("offer", { to: client2.id, offer: { type: "offer", sdp: "test-sdp" } });

    const offer = await offerPromise;
    expect(offer.from).toBe(client1.id);
    expect(offer.offer.sdp).toBe("test-sdp");
  });

  it("notifies room when participant disconnects", async () => {
    client1 = createClient();
    client2 = createClient();

    client1.connect();
    await waitFor(client1, "connect");
    const p1Ready = waitFor(client1, "room-participants");
    client1.emit("join-room", { roomId: "test-room-5", displayName: "Alice", isHost: true });
    await p1Ready;

    client2.connect();
    await waitFor(client2, "connect");
    const p2Ready = waitFor(client2, "room-participants");
    client2.emit("join-room", { roomId: "test-room-5", displayName: "Bob", isHost: false });
    await p2Ready;

    // Client2 disconnects
    const leftPromise = waitFor(client1, "participant-left");
    client2.disconnect();

    const left = await leftPromise;
    expect(left.displayName).toBe("Bob");
  });
});
