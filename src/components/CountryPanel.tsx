import { useEffect, useMemo, useState } from "react";
import { US_STATES } from "../data/usStates";
import { FLAG_PRESETS } from "../game/flags";
import type { Relation } from "../game/types";
import { useGameStore } from "../store/useGameStore";
import { FlagPreview } from "./FlagPreview";

export function CountryPanel() {
  const factions = useGameStore((state) => state.factions);
  const npcs = useGameStore((state) => state.npcs);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const selectedSubdivisionId = useGameStore((state) => state.selectedSubdivisionId);
  const selectFaction = useGameStore((state) => state.selectFaction);
  const selectSubdivision = useGameStore((state) => state.selectSubdivision);
  const setRelation = useGameStore((state) => state.setRelation);
  const spawnKing = useGameStore((state) => state.spawnKing);
  const setFactionFlag = useGameStore((state) => state.setFactionFlag);
  const setFactionColor = useGameStore((state) => state.setFactionColor);

  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState("");

  const selected = factions.find((faction) => faction.id === selectedFactionId) ?? null;

  useEffect(() => {
    if (!selected) return;
    if (!targetId || targetId === selected.id) {
      setTargetId(factions.find((faction) => faction.id !== selected.id)?.id ?? "");
    }
  }, [selected, targetId, factions]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return factions
      .filter(
        (faction) =>
          faction.name.toLowerCase().includes(normalized) ||
          faction.cca3.toLowerCase().includes(normalized)
      )
      .slice(0, 8);
  }, [query, factions]);

  if (!selected) {
    return (
      <section className="panel country-panel">
        <div className="panel-title">Countries</div>
        <p className="muted">Select a colored country on Earth.</p>
      </section>
    );
  }

  const target = factions.find((faction) => faction.id === targetId);
  const relation: Relation = target
    ? selected.relations[target.id] ?? "neutral"
    : "neutral";

  const controller = selected.controlledBy
    ? factions.find((faction) => faction.id === selected.controlledBy)
    : null;

  const countryNpcs = npcs
    .filter((npc) => npc.factionId === selected.id && npc.state !== "dead")
    .sort((a, b) => b.kills - a.kills);

  const deadNpcs = npcs.filter(
    (npc) => npc.factionId === selected.id && npc.state === "dead"
  ).length;

  const selectedState =
    selected.id === "USA"
      ? US_STATES.find((state) => state.id === selectedSubdivisionId) ?? null
      : null;

  return (
    <section className="panel country-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">COUNTRY / FACTION</div>
          <div className="country-title">
            <span>{selected.emoji}</span>
            <strong>{selected.name}</strong>
          </div>
        </div>
        <FlagPreview presetId={selected.flagPresetId} small />
      </div>

      <input
        className="text-input"
        value={query}
        placeholder="Find another country..."
        onChange={(event) => setQuery(event.target.value)}
      />

      {matches.length > 0 && (
        <div className="country-search-results">
          {matches.map((faction) => (
            <button
              key={faction.id}
              onClick={() => {
                selectFaction(faction.id);
                setQuery("");
              }}
            >
              <span>{faction.emoji}</span>
              <span>{faction.name}</span>
              <small>{faction.cca3}</small>
            </button>
          ))}
        </div>
      )}

      <div className="country-color-row">
        <label>
          <span>Map color</span>
          <input
            type="color"
            value={selected.color.startsWith("#") ? selected.color : "#4f8cff"}
            onChange={(event) => setFactionColor(selected.id, event.target.value)}
          />
        </label>
        <div className="color-swatch" style={{ background: selected.color }} />
        <small>Country land uses this color, so neighbors are easier to identify.</small>
      </div>

      <div className="stat-grid">
        <div>
          <span>Army</span>
          <strong>{Math.round(selected.army)}</strong>
        </div>
        <div>
          <span>Treasury</span>
          <strong>{Math.round(selected.treasury)}</strong>
        </div>
        <div>
          <span>Stability</span>
          <strong>{Math.round(selected.stability)}%</strong>
        </div>
        <div>
          <span>Capital</span>
          <strong>{selected.capital ?? "—"}</strong>
        </div>
      </div>

      {controller && (
        <div className="occupation-banner">
          Controlled by <strong>{controller.name}</strong>
        </div>
      )}

      {selected.allianceName && (
        <div className="alliance-banner">
          Alliance: <strong>{selected.allianceName}</strong>
        </div>
      )}

      {selected.id === "USA" && (
        <>
          <div className="section-label">States / subnational selection</div>
          <select
            className="select-input"
            value={selectedSubdivisionId ?? ""}
            onChange={(event) => selectSubdivision(event.target.value || null)}
          >
            <option value="">Select a state</option>
            {US_STATES.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
          {selectedState && (
            <div className="state-selection">
              <span>{selectedState.id}</span>
              <strong>{selectedState.name}</strong>
              <small>
                This is the first subdivision layer. The same system can accept
                Firestore subdivision datasets for other countries.
              </small>
            </div>
          )}
        </>
      )}

      <div className="section-label">Ruler</div>
      <div className="inline-row">
        <span className="muted">{selected.rulerName ?? "No ruler spawned"}</span>
        <button className="button compact" onClick={() => spawnKing(selected.id)}>
          Spawn King
        </button>
      </div>

      <div className="section-label">Diplomacy</div>
      <select
        className="select-input"
        value={targetId}
        onChange={(event) => setTargetId(event.target.value)}
      >
        {factions
          .filter((faction) => faction.id !== selected.id)
          .map((faction) => (
            <option key={faction.id} value={faction.id}>
              {faction.name}
            </option>
          ))}
      </select>

      <div className="relation-row">
        <span className={`relation-pill ${relation}`}>
          {relation.toUpperCase()}
        </span>
        <div className="relation-actions">
          <button
            className="button compact"
            disabled={!target}
            onClick={() => target && setRelation(selected.id, target.id, "allied")}
          >
            Alliance
          </button>
          <button
            className="button compact"
            disabled={!target}
            onClick={() => target && setRelation(selected.id, target.id, "neutral")}
          >
            Neutral
          </button>
          <button
            className="button compact danger"
            disabled={!target}
            onClick={() => target && setRelation(selected.id, target.id, "war")}
          >
            War
          </button>
        </div>
      </div>

      <div className="section-label">Living NPC army</div>
      <div className="npc-summary">
        <div>
          <span>Alive</span>
          <strong>{countryNpcs.length}</strong>
        </div>
        <div>
          <span>Lost</span>
          <strong>{deadNpcs}</strong>
        </div>
      </div>

      {countryNpcs.length === 0 ? (
        <p className="muted">
          Declare war to generate NPC soldiers with species, traits and combat stats.
        </p>
      ) : (
        <div className="npc-list">
          {countryNpcs.slice(0, 6).map((npc) => (
            <div key={npc.id}>
              <div>
                <strong>{npc.name}</strong>
                <span>{npc.species} · {npc.state}</span>
              </div>
              <small>{npc.traits.join(" / ")} · {npc.kills} kills</small>
            </div>
          ))}
        </div>
      )}

      <div className="section-label">Flag designer presets</div>
      <div className="flag-grid">
        {FLAG_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={
              selected.flagPresetId === preset.id
                ? "flag-choice active"
                : "flag-choice"
            }
            title={preset.name}
            onClick={() => setFactionFlag(selected.id, preset.id)}
          >
            <FlagPreview presetId={preset.id} />
            <span>{preset.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
