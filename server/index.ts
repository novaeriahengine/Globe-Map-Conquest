import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

type Room = {
  clients: Set<WebSocket>;
  snapshot: unknown | null;
};

type ClientMessage =
  | { type: "join"; worldId: string; clientId: string }
  | { type: "snapshot"; worldId: string; clientId: string; snapshot: unknown }
  | { type: "ping" };

const rooms = new Map<string, Room>();

function roomFor(id: string) {
  let room = rooms.get(id);
  if (!room) {
    room = { clients: new Set(), snapshot: null };
    rooms.set(id, room);
  }
  return room;
}

function safeSend(socket: WebSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end("Globe Map Conquest realtime server");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  let joinedRoomId: string | null = null;

  socket.on("message", (raw) => {
    let message: ClientMessage;

    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      safeSend(socket, { type: "error", message: "Invalid JSON message." });
      return;
    }

    if (message.type === "ping") {
      safeSend(socket, { type: "pong" });
      return;
    }

    if (message.type === "join") {
      const worldId = message.worldId.trim().slice(0, 64);
      if (!/^[a-zA-Z0-9_-]{2,64}$/.test(worldId)) {
        safeSend(socket, { type: "error", message: "Room IDs use letters, numbers, _ or -." });
        return;
      }

      if (joinedRoomId) {
        rooms.get(joinedRoomId)?.clients.delete(socket);
      }

      joinedRoomId = worldId;
      const room = roomFor(worldId);
      room.clients.add(socket);

      safeSend(socket, {
        type: "joined",
        worldId,
        peers: Math.max(0, room.clients.size - 1),
        hasSnapshot: room.snapshot !== null
      });

      if (room.snapshot !== null) {
        safeSend(socket, {
          type: "snapshot",
          worldId,
          clientId: "server",
          snapshot: room.snapshot
        });
      }
      return;
    }

    if (message.type === "snapshot") {
      if (!joinedRoomId || joinedRoomId !== message.worldId) return;
      const room = roomFor(joinedRoomId);
      room.snapshot = message.snapshot;

      for (const peer of room.clients) {
        if (peer === socket) continue;
        safeSend(peer, message);
      }
    }
  });

  socket.on("close", () => {
    if (!joinedRoomId) return;
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    room.clients.delete(socket);
    if (room.clients.size === 0 && room.snapshot === null) {
      rooms.delete(joinedRoomId);
    }
  });
});

const port = Number(process.env.PORT ?? 8787);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Globe Map Conquest realtime server listening on :${port}`);
});
