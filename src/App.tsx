import { useEffect, useState } from "react";
import { CloudPanel } from "./components/CloudPanel";
import { CountryPanel } from "./components/CountryPanel";
import { Inspector } from "./components/Inspector";
import { OnlinePanel } from "./components/OnlinePanel";
import { Toolbar } from "./components/Toolbar";
import { WorldCanvas } from "./components/WorldCanvas";
import { WorldPicker } from "./components/WorldPicker";
import { useGameStore } from "./store/useGameStore";

export default function App() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const playMode = useGameStore((state) => state.playMode);
  const simulateTick = useGameStore((state) => state.simulateTick);
  const worldMode = useGameStore((state) => state.worldMode);
  const worldName = useGameStore((state) => state.worldName);

  useEffect(() => {
    if (!playMode || !workspaceOpen) return;

    const timer = window.setInterval(() => {
      simulateTick();
    }, 900);

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
              {worldName} ·{" "}
              {worldMode === "earth"
                ? "Earth"
                : worldMode === "sandbox"
                  ? "WorldBox Sandbox"
                  : "Procedural Planet"}
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="topbar-note">
            Firestore world memory · living NPC wars · editable borders
          </div>
          <button className="button compact" onClick={() => setWorkspaceOpen(false)}>
            Worlds
          </button>
        </div>
      </header>

      <Toolbar />

      <div className="workspace">
        <aside className="left-sidebar">
          <CloudPanel />
          <OnlinePanel />
          <CountryPanel />
        </aside>

        <section className="viewport">
          <WorldCanvas />
          <div className="viewport-hint">
            Orbit: drag · Zoom: wheel · Click colored land: country · Draw Territory:
            click 3+ points, then Finish
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

      {!workspaceOpen && <WorldPicker onOpen={() => setWorkspaceOpen(true)} />}
    </main>
  );
}
