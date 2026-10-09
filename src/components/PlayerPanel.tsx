import { useMemo } from "react";
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
  const playerFactionId = useGameStore((state) => state.playerFactionId);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const supportedFactionId = useGameStore((state) => state.supportedFactionId);
  const selectFaction = useGameStore((state) => state.selectFaction);
  const supportFaction = useGameStore((state) => state.supportFaction);
  const setNationFocus = useGameStore((state) => state.setNationFocus);
  const sendNationSupport = useGameStore((state) => state.sendNationSupport);
  const provokeConflict = useGameStore((state) => state.provokeConflict);

  const playerNation =
    factions.find((faction) => faction.id === playerFactionId) ?? null;
  const selected =
    factions.find((faction) => faction.id === selectedFactionId) ??
    playerNation ??
    factions[0] ??
    null;

  const allies = useMemo(() => {
    if (!playerNation) return [];
    return Object.entries(playerNation.relations)
      .filter(([, relation]) => relation === "allied")
      .map(([id]) => factions.find((faction) => faction.id === id))
      .filter(Boolean);
  }, [factions, playerNation]);

  const enemies = useMemo(() => {
    if (!playerNation) return [];
    return Object.entries(playerNation.relations)
      .filter(([, relation]) => relation === "war")
      .map(([id]) => factions.find((faction) => faction.id === id))
      .filter(Boolean);
  }, [factions, playerNation]);

  if (!selected) return null;

  const controller = selected.controlledBy
    ? factions.find((faction) => faction.id === selected.controlledBy)
    : null;
  const isOwnNation = playerNation?.id === selected.id;
  const relationToSelected =
    playerNation && !isOwnNation
      ? playerNation.relations[selected.id] ?? "neutral"
      : "neutral";

  return (
    <section className="panel player-panel">
      {playerNation ? (
        <div className="player-control-banner">
          <span>YOU CONTROL</span>
          <strong>{playerNation.emoji} {playerNation.name}</strong>
          <small>
            Tap another nation on the map to inspect it, support it, negotiate, or
            begin a crisis.
          </small>
        </div>
      ) : (
        <div className="player-control-banner spectator">
          <span>SPECTATOR</span>
          <strong>No country selected</strong>
          <small>Return to world selection to choose a country to control.</small>
        </div>
      )}

      <div className="player-country-hero">
        <FlagPreview presetId={selected.flagPresetId} />
        <div>
          <div className="eyebrow">{isOwnNation ? "YOUR NATION" : "SELECTED NATION"}</div>
          <h2>{selected.emoji} {selected.name}</h2>
          <span>
            {controller
              ? `Occupied by ${controller.name}`
              : selected.allianceName
                ? `Alliance: ${selected.allianceName}`
                : "Sovereign nation"}
          </span>
        </div>
      </div>

      <div className="player-stat-grid">
        <div><span>Population</span><strong>{compact(selected.population ?? 0)}</strong></div>
        <div><span>Military</span><strong>{compact(selected.army)}</strong></div>
        <div><span>Stability</span><strong>{Math.round(selected.stability)}%</strong></div>
        <div><span>Focus</span><strong>{selected.focus ?? "balanced"}</strong></div>
      </div>

      {controller && (
        <button
          className="occupation-banner occupation-button"
          onClick={() => selectFaction(controller.id)}
        >
          <span>OCCUPYING POWER</span>
          <strong>{controller.emoji} {controller.name}</strong>
        </button>
      )}

      {isOwnNation && playerNation && (
        <>
          <div className="section-label">National focus</div>
          <select
            className="select-input"
            value={playerNation.focus ?? "balanced"}
            onChange={(event) =>
              setNationFocus(
                playerNation.id,
                event.target.value as
                  | "balanced"
                  | "military"
                  | "economy"
                  | "integration"
                  | "cities"
                  | "diplomacy"
                  | "naval"
              )
            }
          >
            <option value="balanced">Balanced</option>
            <option value="military">Military</option>
            <option value="economy">Economy</option>
            <option value="integration">Integrate New Land</option>
            <option value="cities">Cities / Infrastructure</option>
            <option value="diplomacy">Diplomacy</option>
            <option value="naval">Naval Power</option>
          </select>
        </>
      )}

      {playerNation && !isOwnNation && (
        <>
          <div className="section-label">Your interaction with {selected.name}</div>
          <div className="player-target-card">
            <div className="player-relation-row">
              <span>Relation</span>
              <strong className={`relation-pill ${relationToSelected}`}>
                {relationToSelected.toUpperCase()}
              </strong>
            </div>

            <div className="player-action-grid">
              <button
                className={
                  supportedFactionId === selected.id
                    ? "button compact active"
                    : "button compact"
                }
                onClick={() =>
                  supportFaction(
                    supportedFactionId === selected.id ? null : selected.id
                  )
                }
              >
                {supportedFactionId === selected.id ? "★ Favorited" : "☆ Favorite"}
              </button>
              <button
                className="button compact success"
                onClick={() =>
                  sendNationSupport(playerNation.id, selected.id, "funds")
                }
              >
                Send Funds
              </button>
              <button
                className="button compact success"
                onClick={() =>
                  sendNationSupport(playerNation.id, selected.id, "troops")
                }
              >
                Send Troops
              </button>
              <button
                className="button compact"
                onClick={() =>
                  sendNationSupport(playerNation.id, selected.id, "stability")
                }
              >
                Political Aid
              </button>
              <button
                className="button compact danger player-crisis-button"
                disabled={relationToSelected === "war"}
                onClick={() =>
                  provokeConflict(playerNation.id, selected.id)
                }
              >
                Create Crisis
              </button>
            </div>

            <small>
              Attacks no longer begin instantly. A crisis creates a reason,
              raises tension, starts mobilization, and can escalate into war.
            </small>
          </div>
        </>
      )}

      {playerNation && (
        <>
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
                <button
                  key={enemy!.id}
                  onClick={() => selectFaction(enemy!.id)}
                >
                  ⚔ {enemy!.emoji} {enemy!.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
