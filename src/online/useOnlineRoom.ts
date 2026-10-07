import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedWorld } from "../game/types";
import { useGameStore } from "../store/useGameStore";

export type OnlineStatus = "offline" | "connecting" | "online" | "error";

type ServerMessage =
  | { type: "joined"; worldId: string; peers: number; hasSnapshot: boolean }
  | { type: "snapshot"; worldId: string; clientId: string; snapshot: SavedWorld }
  | { type: "error"; message: string }
  | { type: "pong" };

function makeClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function useOnlineRoom() {
  const [status, setStatus] = useState<OnlineStatus>("offline");
  const [peers, setPeers] = useState(0);
  const [error, setError] = useState("");
  const [activeRoom, setActiveRoom] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const sendTimerRef = useRef<number | null>(null);
  const applyingRemoteRef = useRef(false);
  const clientIdRef = useRef(makeClientId());

  const disconnect = useCallback(() => {
    if (sendTimerRef.current !== null) {
      window.clearTimeout(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("offline");
    setPeers(0);
    setActiveRoom("");
    setError("");
  }, []);

  const connect = useCallback((rawRoomId: string) => {
    const worldId = rawRoomId.trim();
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(worldId)) {
      setError("Use 2–64 letters, numbers, _ or - for the room ID.");
      setStatus("error");
      return;
    }

    disconnect();
    setStatus("connecting");
    setError("");

    const endpoint = import.meta.env.VITE_WS_URL || "ws://localhost:8787";
    const socket = new WebSocket(endpoint);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "join",
          worldId,
          clientId: clientIdRef.current
        })
      );

      unsubscribeRef.current = useGameStore.subscribe((state, previous) => {
        if (applyingRemoteRef.current || socket.readyState !== WebSocket.OPEN) return;

        const changed =
          state.worldName !== previous.worldName ||
          state.worldMode !== previous.worldMode ||
          state.seed !== previous.seed ||
          state.objects !== previous.objects ||
          state.factions !== previous.factions ||
          state.logs !== previous.logs ||
          state.tick !== previous.tick;

        if (!changed) return;

        if (sendTimerRef.current !== null) {
          window.clearTimeout(sendTimerRef.current);
        }

        sendTimerRef.current = window.setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send(
            JSON.stringify({
              type: "snapshot",
              worldId,
              clientId: clientIdRef.current,
              snapshot: useGameStore.getState().exportWorld()
            })
          );
        }, 140);
      });
    });

    socket.addEventListener("message", (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }

      if (message.type === "joined") {
        setStatus("online");
        setPeers(message.peers);
        setActiveRoom(message.worldId);

        if (!message.hasSnapshot && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "snapshot",
              worldId,
              clientId: clientIdRef.current,
              snapshot: useGameStore.getState().exportWorld()
            })
          );
        }
        return;
      }

      if (message.type === "snapshot" && message.clientId !== clientIdRef.current) {
        applyingRemoteRef.current = true;
        useGameStore
          .getState()
          .importWorld(message.snapshot, `Synchronized from online room ${message.worldId}.`);
        applyingRemoteRef.current = false;
        return;
      }

      if (message.type === "error") {
        setError(message.message);
        setStatus("error");
      }
    });

    socket.addEventListener("close", () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      socketRef.current = null;
      setStatus((current) => (current === "error" ? current : "offline"));
      setPeers(0);
    });

    socket.addEventListener("error", () => {
      setError("Could not connect to the realtime server.");
      setStatus("error");
    });
  }, [disconnect]);

  useEffect(() => disconnect, [disconnect]);

  return {
    status,
    peers,
    error,
    activeRoom,
    connect,
    disconnect
  };
}
