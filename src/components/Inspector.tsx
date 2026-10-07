import { useGameStore } from "../store/useGameStore";
import { QuestPanel } from "./QuestPanel";
import { TerritoryPanel } from "./TerritoryPanel";

export function Inspector() {
  const worldName = useGameStore((state) => state.worldName);
  const setWorldName = useGameStore((state) => state.setWorldName);
  const worldMode = useGameStore((state) => state.worldMode);
  const setWorldMode = useGameStore((state) => state.setWorldMode);
  const seed = useGameStore((state) => state.seed);
  const setSeed = useGameStore((state) => state.setSeed);
  const randomizeSeed = useGameStore((state) => state.randomizeSeed);
  const logs = useGameStore((state) => state.logs);
  const tick = useGameStore((state) => state.tick);
  const factions = useGameStore((state) => state.factions);
  const npcs = useGameStore((state) => state.npcs);

  const activeWars = new Set<string>();
  for (const faction of factions) {
    for (const [otherId, relation] of Object.entries(faction.relations)) {
      if (relation !== "war") continue;
      activeWars.add([faction.id, otherId].sort().join(":"));
    }
  }

  const fighting = npcs.filter((npc) => npc.state === "fighting").length;
  const marching = npcs.filter((npc) => npc.state === "marching").length;

  return (
    <aside className="right-sidebar">
      <section className="panel">
        <div className="panel-title">World</div>
        <input
          className="text-input"
          value={worldName}
          onChange={(event) => setWorldName(event.target.value)}
        />

        <div className="segmented three">
          <button
            className={worldMode === "earth" ? "active" : ""}
            onClick={() => setWorldMode("earth")}
          >
            Earth
          </button>
          <button
            className={worldMode === "procedural" ? "active" : ""}
            onClick={() => setWorldMode("procedural")}
          >
            Planet
          </button>
          <button
            className={worldMode === "sandbox" ? "active" : ""}
            onClick={() => setWorldMode("sandbox")}
          >
            Sandbox
          </button>
        </div>

        {worldMode !== "earth" && (
          <div className="seed-row">
            <input
              type="number"
              className="text-input"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
            <button className="button compact" onClick={randomizeSeed}>
              Randomize
            </button>
          </div>
        )}

        <div className="world-stats-strip">
          <div>
            <span>Tick</span>
            <strong>{tick}</strong>
          </div>
          <div>
            <span>Wars</span>
            <strong>{activeWars.size}</strong>
          </div>
          <div>
            <span>Marching</span>
            <strong>{marching}</strong>
          </div>
          <div>
            <span>Fighting</span>
            <strong>{fighting}</strong>
          </div>
        </div>
      </section>

      <TerritoryPanel />
      <QuestPanel />

      <section className="panel log-panel">
        <div className="panel-title">World Log</div>
        <div className="log-list">
          {logs.slice(0, 18).map((entry, index) => (
            <div key={`${entry}-${index}`}>{entry}</div>
          ))}
        </div>
      </section>
    </aside>
  );
}
