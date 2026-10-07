import { useEffect, useMemo, useState } from "react";
import { US_STATES } from "../data/usStates";
import { FLAG_PRESETS } from "../game/flags";
import type { NationEffectKind, Relation } from "../game/types";
import { useGameStore } from "../store/useGameStore";
import { FlagPreview } from "./FlagPreview";

const buffs: Array<{ kind: NationEffectKind; label: string }> = [
  { kind: "military-aid", label: "Military Aid" },
  { kind: "economic-aid", label: "Economic Aid" },
  { kind: "morale-boost", label: "Morale Boost" }
];

const debuffs: Array<{ kind: NationEffectKind; label: string }> = [
  { kind: "sanctions", label: "Sanctions" },
  { kind: "combat-fatigue", label: "Combat Fatigue" },
  { kind: "unrest", label: "Unrest" }
];

export function CountryPanel() {
  const factions = useGameStore((state) => state.factions);
  const npcs = useGameStore((state) => state.npcs);
  const civilizations = useGameStore((state) => state.civilizations);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const supportedFactionId = useGameStore((state) => state.supportedFactionId);
  const selectedSubdivisionId = useGameStore((state) => state.selectedSubdivisionId);
  const selectFaction = useGameStore((state) => state.selectFaction);
  const selectSubdivision = useGameStore((state) => state.selectSubdivision);
  const supportFaction = useGameStore((state) => state.supportFaction);
  const applyNationEffect = useGameStore((state) => state.applyNationEffect);
  const clearNationEffects = useGameStore((state) => state.clearNationEffects);
  const adjustNation = useGameStore((state) => state.adjustNation);
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
        <div className="panel-title">Nations</div>
        <p className="muted">Click a nation on the 2D map or 3D globe.</p>
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
  const supported = supportedFactionId === selected.id;
  const civilization = civilizations.find(
    (item) => item.id === selected.civilizationId
  );
  const civilizationPeople = npcs.filter(
    (npc) =>
      npc.state !== "dead" &&
      npc.civilizationId === selected.civilizationId
  );
  const averageLoyalty =
    civilizationPeople.reduce((sum, npc) => sum + npc.loyalty, 0) /
    Math.max(1, civilizationPeople.length);

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
          <div className="eyebrow">SELECTED NATION</div>
          <div className="country-title">
            <span>{selected.emoji}</span>
            <strong>{selected.name}</strong>
            {supported && <span className="support-star">★</span>}
          </div>
        </div>
        <FlagPreview presetId={selected.flagPresetId} small />
      </div>

      <input
        className="text-input"
        value={query}
        placeholder="Find a nation..."
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
        <div><span>Alive NPCs</span><strong>{countryNpcs.length}</strong></div>
      </div>

      {controller && (
        <div className="occupation-banner">
          Controlled by <strong>{controller.name}</strong>
        </div>
      )}

      <button
        className={supported ? "button support-button active full" : "button support-button full"}
        onClick={() => supportFaction(supported ? null : selected.id)}
      >
        {supported ? "★ You Support This Nation" : "☆ Support This Nation"}
      </button>

      <div className="section-label">Direct support</div>
      <div className="nation-adjust-grid">
        <button className="button compact" onClick={() => adjustNation(selected.id, "army", 25)}>
          +25 Army
        </button>
        <button className="button compact" onClick={() => adjustNation(selected.id, "treasury", 300)}>
          +300 Money
        </button>
        <button className="button compact" onClick={() => adjustNation(selected.id, "stability", 10)}>
          +10 Stability
        </button>
      </div>

      <div className="section-label">Buffs</div>
      <div className="effect-button-grid">
        {buffs.map((buff) => (
          <button
            key={buff.kind}
            className="button compact effect-positive"
            onClick={() => applyNationEffect(selected.id, buff.kind)}
          >
            + {buff.label}
          </button>
        ))}
      </div>

      <div className="section-label">Debuffs</div>
      <div className="effect-button-grid">
        {debuffs.map((debuff) => (
          <button
            key={debuff.kind}
            className="button compact effect-negative"
            onClick={() => applyNationEffect(selected.id, debuff.kind)}
          >
            − {debuff.label}
          </button>
        ))}
      </div>

      {selected.effects.length > 0 && (
        <div className="active-effects">
          {selected.effects.map((effect) => (
            <div key={effect.id} className={effect.positive ? "positive" : "negative"}>
              <strong>{effect.label}</strong>
              <span>{effect.remainingTicks} ticks</span>
            </div>
          ))}
          <button className="button compact subtle" onClick={() => clearNationEffects(selected.id)}>
            Clear Effects
          </button>
        </div>
      )}

      <div className="country-color-row">
        <label>
          <span>Nation color</span>
          <input
            type="color"
            value={selected.color}
            onChange={(event) => setFactionColor(selected.id, event.target.value)}
          />
        </label>
        <div className="color-swatch" style={{ background: selected.color }} />
        <small>This color is used on both the flat map and globe.</small>
      </div>

      {selected.id === "USA" && (
        <>
          <div className="section-label">States</div>
          <select
            className="select-input"
            value={selectedSubdivisionId ?? ""}
            onChange={(event) => selectSubdivision(event.target.value || null)}
          >
            <option value="">Select a state</option>
            {US_STATES.map((state) => (
              <option key={state.id} value={state.id}>{state.name}</option>
            ))}
          </select>
          {selectedState && (
            <div className="state-selection">
              <span>{selectedState.id}</span>
              <strong>{selectedState.name}</strong>
            </div>
          )}
        </>
      )}

      <div className="section-label">Diplomacy / Conflict</div>
      <select
        className="select-input"
        value={targetId}
        onChange={(event) => setTargetId(event.target.value)}
      >
        {factions
          .filter((faction) => faction.id !== selected.id)
          .map((faction) => (
            <option key={faction.id} value={faction.id}>{faction.name}</option>
          ))}
      </select>

      <div className="relation-row">
        <span className={`relation-pill ${relation}`}>{relation.toUpperCase()}</span>
        <div className="relation-actions">
          <button className="button compact" disabled={!target} onClick={() => target && setRelation(selected.id, target.id, "allied")}>
            Ally
          </button>
          <button className="button compact" disabled={!target} onClick={() => target && setRelation(selected.id, target.id, "neutral")}>
            Peace
          </button>
          <button className="button compact danger" disabled={!target} onClick={() => target && setRelation(selected.id, target.id, "war")}>
            War
          </button>
        </div>
      </div>

      <div className="section-label">Ruler / NPC army</div>
      <div className="inline-row">
        <span className="muted">{selected.rulerName ?? "No ruler spawned"}</span>
        <button className="button compact" onClick={() => spawnKing(selected.id)}>
          Spawn King
        </button>
      </div>

      <div className="npc-summary">
        <div><span>Alive</span><strong>{countryNpcs.length}</strong></div>
        <div><span>Lost</span><strong>{deadNpcs}</strong></div>
      </div>

      <div className="npc-list">
        {countryNpcs.slice(0, 5).map((npc) => (
          <div key={npc.id}>
            <div>
              <strong>{npc.name}</strong>
              <span>{npc.species} · {npc.state}</span>
            </div>
            <small>{npc.traits.join(" / ")} · {npc.kills} kills</small>
          </div>
        ))}
      </div>

      {civilization && (
        <>
          <div className="section-label">Civilization memory</div>
          <div className="civilization-card">
            <div className="civilization-heading">
              <div>
                <strong>{civilization.name}</strong>
                <span>{civilization.adjective} identity</span>
              </div>
              <span className={selected.controlledBy ? "civ-status occupied" : "civ-status active"}>
                {selected.controlledBy ? "Occupied · identity survives" : "Active"}
              </span>
            </div>

            <div className="civilization-stats">
              <div>
                <span>Loyal people</span>
                <strong>{civilizationPeople.length}</strong>
              </div>
              <div>
                <span>Avg loyalty</span>
                <strong>{Math.round(averageLoyalty)}%</strong>
              </div>
              <div>
                <span>Revivals</span>
                <strong>{civilization.revivalCount}</strong>
              </div>
            </div>

            <p>
              If this state is conquered, its civilization remains in civilians and
              descendants. Loyal people can restore the homeland later or found a
              successor such as New {civilization.name} somewhere else.
            </p>

            <div className="civilization-history">
              {civilization.history.slice(-5).reverse().map((entry, index) => (
                <div key={`${entry}-${index}`}>{entry}</div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="section-label">Flags</div>
      <div className="flag-grid">
        {FLAG_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={selected.flagPresetId === preset.id ? "flag-choice active" : "flag-choice"}
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
