import { useEffect, useMemo, useState } from "react";
import { FLAG_PRESETS } from "../game/flags";
import type { Relation } from "../game/types";
import { useGameStore } from "../store/useGameStore";
import { FlagPreview } from "./FlagPreview";

export function CountryPanel() {
  const factions = useGameStore((state) => state.factions);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const selectFaction = useGameStore((state) => state.selectFaction);
  const setRelation = useGameStore((state) => state.setRelation);
  const spawnKing = useGameStore((state) => state.spawnKing);
  const setFactionFlag = useGameStore((state) => state.setFactionFlag);

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
      .filter((faction) =>
        faction.name.toLowerCase().includes(normalized) ||
        faction.cca3.toLowerCase().includes(normalized)
      )
      .slice(0, 8);
  }, [query, factions]);

  if (!selected) {
    return (
      <section className="panel country-panel">
        <div className="panel-title">Countries</div>
        <p className="muted">Select a country marker on Earth.</p>
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

      <div className="stat-grid">
        <div><span>Army</span><strong>{Math.round(selected.army)}</strong></div>
        <div><span>Treasury</span><strong>{Math.round(selected.treasury)}</strong></div>
        <div><span>Stability</span><strong>{Math.round(selected.stability)}%</strong></div>
        <div><span>Capital</span><strong>{selected.capital ?? "—"}</strong></div>
      </div>

      {controller && (
        <div className="occupation-banner">
          Controlled by <strong>{controller.name}</strong>
        </div>
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
        <span className={`relation-pill ${relation}`}>{relation.toUpperCase()}</span>
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

      <div className="section-label">Custom flag preset</div>
      <div className="flag-grid">
        {FLAG_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={selected.flagPresetId === preset.id ? "flag-choice active" : "flag-choice"}
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
