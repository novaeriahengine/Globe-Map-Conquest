import { useEffect, useState } from "react";
import { CountryPanel } from "./components/CountryPanel";
import { Inspector } from "./components/Inspector";
import { OnlinePanel } from "./components/OnlinePanel";
import { PlayerPanel } from "./components/PlayerPanel";
import { QuestPanel } from "./components/QuestPanel";
import { SaveLoadPanel } from "./components/SaveLoadPanel";
import { SimulationPanel } from "./components/SimulationPanel";
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
  const setViewMode = useGameStore((state) => state.setViewMode);
  const workspaceMode = useGameStore((state) => state.workspaceMode);
  const worldName = useGameStore((state) => state.worldName);
  const era = useGameStore((state) => state.era);

  useEffect(() => {
    if (!playMode || !workspaceOpen) return;

    const timer = window.setInterval(() => {
      simulateTick();
    }, 700);

    return () => window.clearInterval(timer);
  }, [playMode, simulateTick, workspaceOpen]);

  const leftPanel =
    workspaceMode === "editor" ? (
      <>
        <SaveLoadPanel />
        <OnlinePanel />
        <CountryPanel />
      </>
    ) : workspaceMode === "player" ? (
      <PlayerPanel />
    ) : workspaceMode === "god" ? (
      <>
        <SimulationPanel god />
        <CountryPanel />
      </>
    ) : (
      <>
        <SimulationPanel />
        <CountryPanel />
      </>
    );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>Globe Map Conquest</strong>
            <span>
              {worldName} · {viewMode === "map2d" ? "2D World" : "3D Globe"} ·{" "}
              {era} · {workspaceMode}
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="topbar-note">
            Living nations · families · eras · strategy · Firestore
          </div>
          <button className="button compact" onClick={() => setWorkspaceOpen(false)}>
            Saves / Worlds
          </button>
        </div>
      </header>

      {workspaceOpen && (
        <>
          <Toolbar />

          <div
            className={
              workspaceMode === "player"
                ? "workspace workspace-player"
                : "workspace"
            }
          >
            <aside className="left-sidebar mode-sidebar">
              {leftPanel}
            </aside>

            <section className={viewMode === "map2d" ? "viewport viewport-2d" : "viewport"}>
              {viewMode === "map2d" ? <Map2D /> : <WorldCanvas />}

              <div className="viewport-mode-switch" aria-label="World view mode">
                <button
                  className={viewMode === "map2d" ? "active" : ""}
                  onClick={() => setViewMode("map2d")}
                >
                  🗺 2D WORLD
                </button>
                <button
                  className={viewMode === "globe3d" ? "active" : ""}
                  onClick={() => setViewMode("globe3d")}
                >
                  🌍 3D GLOBE
                </button>
              </div>

              <div className="viewport-hint">
                {viewMode === "map2d"
                  ? "Tap nations · drag the map · use the zoom slider · armies collapse into flag groups at long range"
                  : "Rotate globe · zoom · tap a country · switch back to 2D for strategy and battle detail"}
              </div>

              {playMode && (
                <div className="play-badge">
                  <span className="play-dot" />
                  LIVE WORLD · {workspaceMode.toUpperCase()} MODE
                </div>
              )}
            </section>

            {workspaceMode === "editor" ? (
              <Inspector />
            ) : workspaceMode !== "player" ? (
              <aside className="right-sidebar">
                <QuestPanel />
              </aside>
            ) : null}
          </div>
        </>
      )}

      {!workspaceOpen && <WorldPicker onOpen={() => setWorkspaceOpen(true)} />}
    </main>
  );
}
