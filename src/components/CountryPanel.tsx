import { useEffect, useMemo, useState } from "react";
import { US_STATES } from "../data/usStates";
import { FLAG_PRESETS } from "../game/flags";
import type { NationEffectKind, NationFocus, Relation } from "../game/types";
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

const focuses: Array<{ id: NationFocus; label: string; icon: string }> = [
  { id: "balanced", label: "Balanced", icon: "⚖" },
  { id: "military", label: "Military", icon: "⚔" },
  { id: "economy", label: "Economy", icon: "💰" },
  { id: "integration", label: "Integrate Land", icon: "🧩" },
  { id: "cities", label: "Cities", icon: "🏙" },
  { id: "diplomacy", label: "Diplomacy", icon: "🤝" },
  { id: "naval", label: "Navy", icon: "⚓" }
];

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.round(value));
}

export function CountryPanel() {
  const factions = useGameStore((state) => state.factions);
  const npcs = useGameStore((state) => state.npcs);
  const civilizations = useGameStore((state) => state.civilizations);
  const tick = useGameStore((state) => state.tick);
  const era = useGameStore((state) => state.era);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const supportedFactionId = useGameStore((state) => state.supportedFactionId);
  const selectedSubdivisionId = useGameStore((state) => state.selectedSubdivisionId);
  const selectFaction = useGameStore((state) => state.selectFaction);
  const selectSubdivision = useGameStore((state) => state.selectSubdivision);
  const supportFaction = useGameStore((state) => state.supportFaction);
  const applyNationEffect = useGameStore((state) => state.applyNationEffect);
  const clearNationEffects = useGameStore((state) => state.clearNationEffects);
  const setNationFocus = useGameStore((state) => state.setNationFocus);
  const setIntegrationPolicy = useGameStore((state) => state.setIntegrationPolicy);
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
        <p className="muted">Tap a nation on the map.</p>
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
    (npc) => npc.state !== "dead" && npc.civilizationId === selected.civilizationId
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
  const occupiedFor =
    selected.occupationStartedTick == null ? 0 : Math.max(0, tick - selected.occupationStartedTick);
  const selectedState =
    selected.id === "USA"
      ? US_STATES.find((state) => state.id === selectedSubdivisionId) ?? null
      : null;
  const military = selected.military ?? {
    army: selected.army,
    navy: 0,
    airForce: 0,
    reserves: 0,
    doctrine: "balanced" as const
  };

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

      {controller && (
        <button
          className="occupation-banner occupation-button"
          onClick={() => selectFaction(controller.id)}
        >
          <span>CONQUERED / OCCUPIED BY</span>
          <strong>{controller.emoji} {controller.name}</strong>
          <small>
            Occupied for {occupiedFor} ticks · tap to inspect conqueror
          </small>
        </button>
      )}

      <div className="stat-grid nation-main-stats">
        <div><span>Population</span><strong>{compact(selected.population ?? 0)}</strong></div>
        <div><span>Active military</span><strong>{compact(selected.army)}</strong></div>
        <div><span>Treasury</span><strong>{compact(selected.treasury)}</strong></div>
        <div><span>Stability</span><strong>{Math.round(selected.stability)}%</strong></div>
        <div><span>Cities</span><strong>{selected.cityCount ?? 0}</strong></div>
        <div><span>Towns</span><strong>{selected.townCount ?? 0}</strong></div>
      </div>

      <div className="section-label">National priority</div>
      <div className="focus-grid">
        {focuses.map((focus) => (
          <button
            key={focus.id}
            className={selected.focus === focus.id ? "focus-button active" : "focus-button"}
            onClick={() => setNationFocus(selected.id, focus.id)}
          >
            <span>{focus.icon}</span>
            <strong>{focus.label}</strong>
          </button>
        ))}
      </div>

      {selected.focus === "integration" && (
        <div className="integration-policy">
          <span>Integration policy</span>
          <select
            className="select-input"
            value={selected.integrationPolicy ?? "balanced"}
            onChange={(event) =>
              setIntegrationPolicy(
                selected.id,
                event.target.value as "local" | "balanced" | "settler"
              )
            }
          >
            <option value="local">Local autonomy</option>
            <option value="balanced">Balanced integration</option>
            <option value="settler">Settler migration</option>
          </select>
          <small>
            Stronger settlement policies move more citizens into conquered land and
            build integration faster, but cost money and population at home.
          </small>
        </div>
      )}

      <div className="section-label">Military · {era}</div>
      <div className="military-grid">
        <div><span>🪖 Army</span><strong>{compact(military.army)}</strong></div>
        <div><span>⚓ Navy</span><strong>{compact(military.navy)}</strong></div>
        <div>
          <span>✈ Air</span>
          <strong>{era === "ancient" || era === "medieval" ? "—" : compact(military.airForce)}</strong>
        </div>
        <div><span>🛡 Reserves</span><strong>{compact(military.reserves)}</strong></div>
      </div>
      <div className="doctrine-row">
        <span>Doctrine</span>
        <strong>{military.doctrine}</strong>
      </div>

      <button
        className={supported ? "button support-button active full" : "button support-button full"}
        onClick={() => supportFaction(supported ? null : selected.id)}
      >
        {supported ? "★ FAVORITE NATION — ACTIVE" : "☆ Make Favorite Nation"}
      </button>

      {supported && (
        <div className="favorite-card">
          <strong>You are backing {selected.name}</strong>
          <span>
            Favorite nations stay highlighted in gold and are easier to control from
            God/Play mode.
          </span>
          <div className="nation-adjust-grid">
            <button className="button compact" onClick={() => adjustNation(selected.id, "army", 25_000)}>
              +25K Troops
            </button>
            <button className="button compact" onClick={() => adjustNation(selected.id, "treasury", 25_000)}>
              +25K Funds
            </button>
            <button className="button compact" onClick={() => adjustNation(selected.id, "stability", 10)}>
              +10 Stability
            </button>
          </div>
        </div>
      )}

      <div className="section-label">God buffs</div>
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

      <div className="section-label">God debuffs</div>
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
        <small>Used on the 2D map and 3D globe.</small>
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

      <div className="section-label">Ruler / tracked people</div>
      <div className="inline-row">
        <span className="muted">{selected.rulerName ?? "No ruler spawned"}</span>
        <button className="button compact" onClick={() => spawnKing(selected.id)}>
          Spawn King
        </button>
      </div>

      <div className="npc-summary">
        <div><span>Tracked alive</span><strong>{countryNpcs.length}</strong></div>
        <div><span>Tracked dead</span><strong>{deadNpcs}</strong></div>
      </div>

      <div className="npc-list">
        {countryNpcs.slice(0, 7).map((npc) => {
          const parents = (npc.parentIds ?? [])
            .map((id) => npcs.find((person) => person.id === id)?.name)
            .filter(Boolean);
          return (
            <div key={npc.id}>
              <div>
                <strong>{npc.name}</strong>
                <span>{npc.nationality ?? selected.name} · gen {npc.generation ?? 0}</span>
              </div>
              <small>
                {npc.species} · {npc.state} · loyalty {Math.round(npc.loyalty)}%
                {parents.length ? ` · child of ${parents.join(" + ")}` : " · founder line"}
              </small>
            </div>
          );
        })}
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
              <div><span>Loyal agents</span><strong>{civilizationPeople.length}</strong></div>
              <div><span>Avg loyalty</span><strong>{Math.round(averageLoyalty)}%</strong></div>
              <div><span>Revivals</span><strong>{civilization.revivalCount}</strong></div>
            </div>

            <p>
              Conquest does not delete this people. Descendants can restore the
              homeland or found a successor state while keeping the same history.
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
