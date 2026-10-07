import { useGameStore } from "../store/useGameStore";
import { FlagPreview } from "./FlagPreview";

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.round(value));
}

export function PlayerPanel() {
  const factions = useGameStore((state) => state.factions);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const supportedFactionId = useGameStore((state) => state.supportedFactionId);
  const selectFaction = useGameStore((state) => state.selectFaction);

  const selected =
    factions.find((faction) => faction.id === selectedFactionId) ??
    factions.find((faction) => faction.id === supportedFactionId) ??
    factions[0];

  if (!selected) return null;

  const controller = selected.controlledBy
    ? factions.find((faction) => faction.id === selected.controlledBy)
    : null;
  const allies = Object.entries(selected.relations)
    .filter(([, relation]) => relation === "allied")
    .map(([id]) => factions.find((faction) => faction.id === id))
    .filter(Boolean);
  const enemies = Object.entries(selected.relations)
    .filter(([, relation]) => relation === "war")
    .map(([id]) => factions.find((faction) => faction.id === id))
    .filter(Boolean);

  return (
    <section className="panel player-panel">
      <div className="player-country-hero">
        <FlagPreview presetId={selected.flagPresetId} />
        <div>
          <div className="eyebrow">PLAYER VIEW</div>
          <h2>{selected.emoji} {selected.name}</h2>
          <span>{controller ? `Occupied by ${controller.name}` : "Sovereign nation"}</span>
        </div>
      </div>

      <div className="player-stat-grid">
        <div><span>Population</span><strong>{compact(selected.population ?? 0)}</strong></div>
        <div><span>Military</span><strong>{compact(selected.army)}</strong></div>
        <div><span>Stability</span><strong>{Math.round(selected.stability)}%</strong></div>
        <div><span>Focus</span><strong>{selected.focus ?? "balanced"}</strong></div>
      </div>

      {controller && (
        <button className="occupation-banner occupation-button" onClick={() => selectFaction(controller.id)}>
          <span>OCCUPYING POWER</span>
          <strong>{controller.emoji} {controller.name}</strong>
        </button>
      )}

      <div className="section-label">Diplomacy</div>
      <div className="player-relations">
        <div>
          <span>Allies</span>
          <strong>{allies.length}</strong>
        </div>
        <div>
          <span>Wars</span>
          <strong>{enemies.length}</strong>
        </div>
      </div>

      {enemies.length > 0 && (
        <div className="player-war-list">
          {enemies.slice(0, 5).map((enemy) => (
            <button key={enemy!.id} onClick={() => selectFaction(enemy!.id)}>
              ⚔ {enemy!.emoji} {enemy!.name}
            </button>
          ))}
        </div>
      )}

      <p className="panel-note">
        Player View hides developer and god controls. This is the base presentation
        a normal web/Steam player can receive.
      </p>
    </section>
  );
}
