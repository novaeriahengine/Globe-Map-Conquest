import { useEffect, useState } from "react";
import { CountryPanel } from "./components/CountryPanel";
import { Inspector } from "./components/Inspector";
import { OnlinePanel } from "./components/OnlinePanel";
import { SaveLoadPanel } from "./components/SaveLoadPanel";
import { Toolbar } from "./components/Toolbar";
import { Map2D, WorldCanvas } from "./components/WorldCanvas";
import { WorldPicker } from "./components/WorldPicker";
import { useGameStore } from "./store/useGameStore";

export default function App() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const playMode = useGameStore((state) => state.playMode);
  const simulateTick = useGameStore((state) => state.simulateTick);
  const worldMode = useGameStore((state) => state.worldMode);
  const viewMode = useGameStore((state) => state.viewMode);
  const worldName = useGameStore((state) => state.worldName);

  useEffect(() => {
    if (!playMode || !workspaceOpen) return;

    const timer = window.setInterval(() => {
      simulateTick();
    }, 700);

    return () => window.clearInterval(timer);
  }, [playMode, simulateTick, workspaceOpen]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>Globe Map Conquest</strong>
            <span>
              {worldName} · {viewMode === "map2d" ? "2D Battle Map" : "3D Globe"} ·{" "}
              {worldMode === "earth"
                ? "Earth"
                : worldMode === "sandbox"
                  ? "Sandbox"
                  : "Procedural Planet"}
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="topbar-note">
            Living nations · diplomacy · war · Firestore saves
          </div>
          <button className="button compact" onClick={() => setWorkspaceOpen(false)}>
            Saves / Worlds
          </button>
        </div>
      </header>

      {workspaceOpen && (
        <>
          <Toolbar />

          <div className="workspace">
            <aside className="left-sidebar">
              <SaveLoadPanel />
              <OnlinePanel />
              <CountryPanel />
            </aside>

            <section className={viewMode === "map2d" ? "viewport viewport-2d" : "viewport"}>
              {viewMode === "map2d" ? <Map2D /> : <WorldCanvas />}

              <div className="viewport-hint">
                {viewMode === "map2d"
                  ? "2D mode: click nations · watch NPC armies move and fight · select a nation to support it"
                  : "3D mode: rotate globe · zoom · click a country · switch to 2D for the battle view"}
              </div>

              {playMode && (
                <div className="play-badge">
                  <span className="play-dot" />
                  LIVE WORLD SIMULATION
                </div>
              )}
            </section>

            <Inspector />
          </div>
        </>
      )}

      {!workspaceOpen && <WorldPicker onOpen={() => setWorkspaceOpen(true)} />}
    </main>
  );
}
