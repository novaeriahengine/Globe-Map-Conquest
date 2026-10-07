import { useGameStore } from "../store/useGameStore";

export function Toolbar() {
  const playMode = useGameStore((state) => state.playMode);
  const setPlayMode = useGameStore((state) => state.setPlayMode);
  const viewMode = useGameStore((state) => state.viewMode);
  const setViewMode = useGameStore((state) => state.setViewMode);
  const tool = useGameStore((state) => state.tool);
  const beginTerritoryDraw = useGameStore((state) => state.beginTerritoryDraw);
  const undoTerritoryPoint = useGameStore((state) => state.undoTerritoryPoint);
  const cancelTerritoryDraw = useGameStore((state) => state.cancelTerritoryDraw);
  const finishTerritory = useGameStore((state) => state.finishTerritory);
  const territoryDraft = useGameStore((state) => state.territoryDraft);

  return (
    <div className="toolbar">
      <button
        className={playMode ? "button danger active" : "button success"}
        onClick={() => setPlayMode(!playMode)}
      >
        {playMode ? "■ Pause" : "▶ Run World"}
      </button>

      <div className="toolbar-divider" />

      <div className="toolbar-group view-toggle">
        <button
          className={viewMode === "globe3d" ? "button active" : "button"}
          onClick={() => setViewMode("globe3d")}
        >
          🌍 3D Globe
        </button>
        <button
          className={viewMode === "map2d" ? "button active" : "button"}
          onClick={() => setViewMode("map2d")}
        >
          🗺 2D Map
        </button>
      </div>

      <div className="toolbar-divider" />

      <button
        className={tool === "territory" ? "button active territory-tool" : "button territory-tool"}
        onClick={beginTerritoryDraw}
      >
        ✎ Split Territory
      </button>

      {tool === "territory" && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group territory-actions">
            <span className="draft-count">{territoryDraft.length} points</span>
            <button
              className="button compact"
              disabled={territoryDraft.length === 0}
              onClick={undoTerritoryPoint}
            >
              Undo
            </button>
            <button
              className="button compact success"
              disabled={territoryDraft.length < 3}
              onClick={() => finishTerritory()}
            >
              Finish
            </button>
            <button className="button compact danger" onClick={cancelTerritoryDraw}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
