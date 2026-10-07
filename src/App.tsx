import { useEffect } from "react";
import { CountryPanel } from "./components/CountryPanel";
import { Inspector } from "./components/Inspector";
import { OnlinePanel } from "./components/OnlinePanel";
import { Toolbar } from "./components/Toolbar";
import { WorldCanvas } from "./components/WorldCanvas";
import { useGameStore } from "./store/useGameStore";

export default function App() {
  const playMode = useGameStore((state) => state.playMode);
  const simulateTick = useGameStore((state) => state.simulateTick);
  const worldMode = useGameStore((state) => state.worldMode);

  useEffect(() => {
    if (!playMode) return;
    const timer = window.setInterval(() => {
      simulateTick();
    }, 1100);
    return () => window.clearInterval(timer);
  }, [playMode, simulateTick]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>Globe Map Conquest</strong>
            <span>Studio Alpha · {worldMode === "earth" ? "Earth" : "Procedural Planet"}</span>
          </div>
        </div>
        <div className="topbar-note">
          Browser world editor + strategy simulation
        </div>
      </header>

      <Toolbar />

      <div className="workspace">
        <aside className="left-sidebar">
          <OnlinePanel />
          <CountryPanel />
        </aside>

        <section className="viewport">
          <WorldCanvas />
          <div className="viewport-hint">
            Left drag: orbit · Scroll: zoom · Click country marker: select · Transform objects with toolbar
          </div>
          {playMode && (
            <div className="play-badge">
              <span className="play-dot" />
              LIVE SIMULATION
            </div>
          )}
        </section>

        <Inspector />
      </div>
    </main>
  );
}
