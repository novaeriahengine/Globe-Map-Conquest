import { useState } from "react";
import { useOnlineRoom } from "../online/useOnlineRoom";

export function OnlinePanel() {
  const [roomId, setRoomId] = useState("earth-001");
  const { status, peers, error, activeRoom, connect, disconnect } = useOnlineRoom();

  return (
    <section className="panel online-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">ONLINE WORLD</div>
          <strong>Realtime Room</strong>
        </div>
        <span className={`online-status ${status}`}>{status}</span>
      </div>

      <div className="online-row">
        <input
          className="text-input"
          value={roomId}
          disabled={status === "online" || status === "connecting"}
          onChange={(event) => setRoomId(event.target.value)}
          placeholder="room-id"
        />
        {status === "online" ? (
          <button className="button compact danger" onClick={disconnect}>
            Leave
          </button>
        ) : (
          <button className="button compact" onClick={() => connect(roomId)}>
            Join
          </button>
        )}
      </div>

      {status === "online" && (
        <div className="tiny-status">
          Room <strong>{activeRoom}</strong> · {peers} other creator{peers === 1 ? "" : "s"}
        </div>
      )}

      {error && <div className="online-error">{error}</div>}

      <p className="muted online-note">
        Edits, diplomacy, flags, spawned kings and simulation state sync across connected browsers.
      </p>
    </section>
  );
}
