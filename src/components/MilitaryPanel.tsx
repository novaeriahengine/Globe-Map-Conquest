import { useMemo, useState } from "react";
import type { GarrisonBranch } from "../game/types";
import { useGameStore } from "../store/useGameStore";

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.round(value));
}

export function MilitaryPanel({ factionId }: { factionId?: string | null }) {
  const factions = useGameStore((state) => state.factions);
  const garrisons = useGameStore((state) => state.garrisons);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const createGarrison = useGameStore((state) => state.createGarrison);
  const orderGarrison = useGameStore((state) => state.orderGarrison);

  const ownerId = factionId ?? selectedFactionId;
  const owner = factions.find((faction) => faction.id === ownerId) ?? null;
  const [branch, setBranch] = useState<GarrisonBranch>("land");
  const [size, setSize] = useState(5000);
  const [targetId, setTargetId] = useState("");

  const ownerGarrisons = useMemo(
    () => garrisons.filter((garrison) => garrison.factionId === ownerId),
    [garrisons, ownerId]
  );

  if (!owner) {
    return (
      <section className="panel military-panel">
        <div className="panel-title">Military Commands</div>
        <p className="muted">Select a nation first.</p>
      </section>
    );
  }

  const branchAvailable =
    branch === "land"
      ? owner.military?.army ?? owner.army
      : branch === "sea"
        ? owner.military?.navy ?? 0
        : owner.military?.airForce ?? 0;

  return (
    <section className="panel military-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">MILITARY COMMAND</div>
          <strong>{owner.emoji} {owner.name}</strong>
        </div>
        <span className="garrison-count">{ownerGarrisons.length} groups</span>
      </div>

      <div className="garrison-create">
        <select
          className="select-input"
          value={branch}
          onChange={(event) => setBranch(event.target.value as GarrisonBranch)}
        >
          <option value="land">🪖 Land Army</option>
          <option value="sea">⚓ Naval Fleet</option>
          <option value="air">✈ Air Wing</option>
        </select>

        <label>
          <span>Group size: {compact(size)} / {compact(branchAvailable)}</span>
          <input
            type="range"
            min={100}
            max={Math.max(100, Math.round(branchAvailable))}
            step={100}
            value={Math.min(size, Math.max(100, Math.round(branchAvailable)))}
            onChange={(event) => setSize(Number(event.target.value))}
          />
        </label>

        <button
          className="button full"
          disabled={branchAvailable <= 0}
          onClick={() => createGarrison(owner.id, branch, size)}
        >
          ＋ Create {branch === "land" ? "Army Group" : branch === "sea" ? "Fleet" : "Air Group"}
        </button>
      </div>

      <div className="section-label">Target nation</div>
      <select
        className="select-input"
        value={targetId}
        onChange={(event) => setTargetId(event.target.value)}
      >
        <option value="">Choose a target</option>
        {factions
          .filter((faction) => faction.id !== owner.id && !faction.controlledBy)
          .map((faction) => (
            <option key={faction.id} value={faction.id}>
              {faction.emoji} {faction.name}
            </option>
          ))}
      </select>

      <div className="garrison-list">
        {ownerGarrisons.map((garrison) => {
          const target = factions.find(
            (faction) => faction.id === garrison.targetFactionId
          );
          return (
            <article key={garrison.id} className={`garrison-card ${garrison.order}`}>
              <div className="garrison-card-head">
                <div>
                  <strong>
                    {garrison.branch === "land" ? "🪖" : garrison.branch === "sea" ? "⚓" : "✈"}{" "}
                    {garrison.name}
                  </strong>
                  <span>
                    {compact(garrison.size)} · readiness {Math.round(garrison.readiness)}%
                  </span>
                </div>
                <span className="garrison-order">{garrison.order}</span>
              </div>

              {target && (
                <small>Target: {target.emoji} {target.name}</small>
              )}

              <div className="garrison-actions">
                <button
                  className="button compact"
                  onClick={() => orderGarrison(garrison.id, "hold", null)}
                >
                  Hold
                </button>
                <button
                  className="button compact"
                  disabled={!targetId}
                  onClick={() => orderGarrison(garrison.id, "move", targetId)}
                >
                  Move
                </button>
                <button
                  className="button compact danger"
                  disabled={!targetId}
                  onClick={() => orderGarrison(garrison.id, "attack", targetId)}
                >
                  Attack
                </button>
                <button
                  className="button compact success"
                  disabled={!targetId}
                  onClick={() => orderGarrison(garrison.id, "support", targetId)}
                >
                  Support
                </button>
              </div>
            </article>
          );
        })}

        {ownerGarrisons.length === 0 && (
          <div className="empty-state">
            No deployed groups yet. Create a land, sea, or air garrison above.
          </div>
        )}
      </div>
    </section>
  );
}
