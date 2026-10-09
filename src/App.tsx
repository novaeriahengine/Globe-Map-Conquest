import { useEffect, useState } from "react";
import { CountryPanel } from "./components/CountryPanel";
import { Inspector } from "./components/Inspector";
import { MilitaryPanel } from "./components/MilitaryPanel";
import { NationCreatorPanel } from "./components/NationCreatorPanel";
import { OnlinePanel } from "./components/OnlinePanel";
import { PlayerPanel } from "./components/PlayerPanel";
import { QuestPanel } from "./components/QuestPanel";
import { SaveLoadPanel } from "./components/SaveLoadPanel";
import { SimulationPanel } from "./components/SimulationPanel";
import { Toolbar } from "./components/Toolbar";
import { WarRoomPanel } from "./components/WarRoomPanel";
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
  const playerFactionId = useGameStore((state) => state.playerFactionId);

  useEffect(() => {
    if (!playMode || !workspaceOpen) return;
    const timer = window.setInterval(() => simulateTick(), 700);
    return () => window.clearInterval(timer);
  }, [playMode, simulateTick, workspaceOpen]);

  const leftPanel =
    workspaceMode === "editor" ? (
      <>
        <SaveLoadPanel />
        <OnlinePanel />
        <NationCreatorPanel />
        <CountryPanel />
        <MilitaryPanel />
      </>
    ) : workspaceMode === "player" ? (
      <>
        <PlayerPanel />
        <MilitaryPanel factionId={playerFactionId} />
      </>
    ) : workspaceMode === "god" ? (
      <>
        <SimulationPanel god />
        <NationCreatorPanel />
        <CountryPanel />
        <MilitaryPanel />
      </>
    ) : (
      <>
        <SimulationPanel />
        <CountryPanel />
        <MilitaryPanel />
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
            Living nations · progressive fronts · garrisons · diplomacy · Firestore
          </div>
          <button className="button compact" onClick={() => setWorkspaceOpen(false)}>
            Worlds / Role
          </button>
        </div>
      </header>

      {workspaceOpen && (
        <>
          <Toolbar />

          <div className="workspace">
            <aside className="left-sidebar mode-sidebar">{leftPanel}</aside>

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
                  ? "Tap nations · drag/zoom · front circles show control % · military groups move independently on land, sea and air"
                  : "Rotate globe · zoom · tap a country · use 2D mode for conquest fronts and garrison movement"}
              </div>

              {playMode && (
                <div className="play-badge">
                  <span className="play-dot" />
                  LIVE WORLD · {workspaceMode.toUpperCase()} MODE
                </div>
              )}
            </section>

            <aside className="right-sidebar">
              <WarRoomPanel />
              {workspaceMode === "editor" ? <Inspector /> : <QuestPanel />}
            </aside>
          </div>
        </>
      )}

      {!workspaceOpen && <WorldPicker onOpen={() => setWorkspaceOpen(true)} />}
    </main>
  );
}
