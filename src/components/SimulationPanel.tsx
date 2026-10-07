import { useEffect, useMemo, useState } from "react";
import type { ConflictScenario, Era } from "../game/types";
import { useGameStore } from "../store/useGameStore";

const eras: Array<{ id: Era; label: string; note: string }> = [
  { id: "ancient", label: "Ancient", note: "Slow armies, local wars, primitive fleets." },
  { id: "medieval", label: "Medieval", note: "Sword-era armies, castles, regional conquest." },
  { id: "industrial", label: "Industrial", note: "Rail, rifles, large navies and early air power." },
  { id: "modern", label: "Modern", note: "Combined arms, aircraft and global logistics." },
  { id: "future", label: "Future", note: "Fast warfare, strong air power and long-range logistics." }
];

const scenarios: Array<{ id: ConflictScenario; label: string; note: string }> = [
  {
    id: "organic",
    label: "Normal / Organic",
    note: "No forced war. Nations negotiate, ally, split and sometimes fight naturally."
  },
  {
    id: "regional-war",
    label: "Regional War",
    note: "Starts a local war around the selected nation and only pulls nearby existing allies."
  },
  {
    id: "world-war",
    label: "World War",
    note: "Builds two limited coalitions around major powers. Nations get fronts instead of everyone fighting everyone."
  }
];

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.round(value));
}

export function SimulationPanel({ god = false }: { god?: boolean }) {
  const factions = useGameStore((state) => state.factions);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const era = useGameStore((state) => state.era);
  const setEra = useGameStore((state) => state.setEra);
  const conflictScenario = useGameStore((state) => state.conflictScenario);
  const setConflictScenario = useGameStore((state) => state.setConflictScenario);
  const startConflictScenario = useGameStore((state) => state.startConflictScenario);
  const populationSeed = useGameStore((state) => state.populationSeed);
  const seedPopulation = useGameStore((state) => state.seedPopulation);
  const npcs = useGameStore((state) => state.npcs);
  const territories = useGameStore((state) => state.territories);
  const selectedTerritoryId = useGameStore((state) => state.selectedTerritoryId);
  const tick = useGameStore((state) => state.tick);

  const [population, setPopulation] = useState(populationSeed);
  const [spawnTerritoryId, setSpawnTerritoryId] = useState("");

  useEffect(() => {
    if (selectedTerritoryId) setSpawnTerritoryId(selectedTerritoryId);
  }, [selectedTerritoryId]);
  const selected =
    factions.find((faction) => faction.id === selectedFactionId) ?? factions[0];

  const familyStats = useMemo(() => {
    if (!selected) return { tracked: 0, births: 0, maxGeneration: 0 };
    const people = npcs.filter(
      (npc) => npc.factionId === selected.id && npc.state !== "dead"
    );
    return {
      tracked: people.length,
      births: people.filter((npc) => (npc.generation ?? 0) > 0).length,
      maxGeneration: Math.max(0, ...people.map((npc) => npc.generation ?? 0))
    };
  }, [npcs, selected]);

  const scenario = scenarios.find((item) => item.id === conflictScenario)!;
  const spawnTerritories = selected
    ? territories.filter(
        (territory) =>
          territory.ownerFactionId === selected.id ||
          territory.parentFactionId === selected.id
      )
    : [];

  return (
    <section className="panel simulation-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">{god ? "GOD WORLD CONTROLS" : "SIMULATION"}</div>
          <strong>World Rules</strong>
        </div>
        <span className="sim-tick">Tick {tick}</span>
      </div>

      <div className="section-label">Era</div>
      <select
        className="select-input"
        value={era}
        onChange={(event) => setEra(event.target.value as Era)}
      >
        {eras.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
      <p className="panel-note">{eras.find((item) => item.id === era)?.note}</p>

      <div className="section-label">Conflict style</div>
      <select
        className="select-input"
        value={conflictScenario}
        onChange={(event) =>
          setConflictScenario(event.target.value as ConflictScenario)
        }
      >
        {scenarios.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
      <p className="panel-note">{scenario.note}</p>

      <button
        className={
          conflictScenario === "world-war"
            ? "button danger full"
            : conflictScenario === "regional-war"
              ? "button full scenario-regional"
              : "button success full"
        }
        onClick={() => {
          if (
            conflictScenario === "world-war" &&
            !window.confirm(
              "Start a coalition world war? Only a limited set of nations will enter initially; others may join later through diplomacy."
            )
          ) {
            return;
          }
          startConflictScenario(conflictScenario);
        }}
      >
        {conflictScenario === "organic"
          ? "▶ Run Organic World"
          : conflictScenario === "regional-war"
            ? "⚔ Start Regional War"
            : "☢ Start World War"}
      </button>

      {selected && (
        <>
          <div className="section-label">Population founder tool</div>
          <div className="population-seed-card">
            <div className="population-seed-heading">
              <strong>{selected.emoji} {selected.name}</strong>
              <span>{population.toLocaleString()} people</span>
            </div>

            <input
              className="population-slider"
              type="range"
              min={2}
              max={10_000}
              step={1}
              value={population}
              onChange={(event) => setPopulation(Number(event.target.value))}
            />

            <div className="population-presets">
              {[2, 10, 100, 1000, 10_000].map((value) => (
                <button
                  key={value}
                  className="button compact"
                  onClick={() => setPopulation(value)}
                >
                  {value >= 1000 ? `${value / 1000}K` : value}
                </button>
              ))}
            </div>

            <select
              className="select-input"
              value={spawnTerritoryId}
              onChange={(event) => setSpawnTerritoryId(event.target.value)}
            >
              <option value="">Spawn at capital / nation center</option>
              {spawnTerritories.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name}
                </option>
              ))}
            </select>

            <button
              className="button full"
              onClick={() =>
                seedPopulation(
                  selected.id,
                  population,
                  spawnTerritoryId || null
                )
              }
            >
              Seed / Reset Founding Population
            </button>

            <small>
              Large populations stay aggregated for performance. Up to 240 named
              founder agents are tracked with family ancestry; births descend from
              those founder lines.
            </small>
          </div>

          <div className="family-summary">
            <div><span>Population</span><strong>{compact(selected.population ?? 0)}</strong></div>
            <div><span>Tracked people</span><strong>{familyStats.tracked}</strong></div>
            <div><span>Born in sim</span><strong>{familyStats.births}</strong></div>
            <div><span>Generation</span><strong>{familyStats.maxGeneration}</strong></div>
          </div>
        </>
      )}
    </section>
  );
}
