import type { EditorTool, ObjectKind } from "../game/types";
import { useGameStore } from "../store/useGameStore";

const tools: Array<{ id: EditorTool; label: string }> = [
  { id: "select", label: "Select" },
  { id: "move", label: "Move" },
  { id: "rotate", label: "Rotate" },
  { id: "scale", label: "Scale" }
];

const objects: Array<{ kind: ObjectKind; label: string }> = [
  { kind: "block", label: "+ Block" },
  { kind: "sphere", label: "+ Sphere" },
  { kind: "cylinder", label: "+ Cylinder" },
  { kind: "spawn", label: "+ Spawn" }
];

export function Toolbar() {
  const playMode = useGameStore((state) => state.playMode);
  const setPlayMode = useGameStore((state) => state.setPlayMode);
  const tool = useGameStore((state) => state.tool);
  const setTool = useGameStore((state) => state.setTool);
  const addObject = useGameStore((state) => state.addObject);
  const saveLocal = useGameStore((state) => state.saveLocal);
  const loadLocal = useGameStore((state) => state.loadLocal);
  const resetWorld = useGameStore((state) => state.resetWorld);
  const beginTerritoryDraw = useGameStore((state) => state.beginTerritoryDraw);
  const undoTerritoryPoint = useGameStore((state) => state.undoTerritoryPoint);
  const cancelTerritoryDraw = useGameStore((state) => state.cancelTerritoryDraw);
  const finishTerritory = useGameStore((state) => state.finishTerritory);
  const territoryDraft = useGameStore((state) => state.territoryDraft);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className={playMode ? "button danger active" : "button success"}
          onClick={() => setPlayMode(!playMode)}
        >
          {playMode ? "■ Stop" : "▶ Play"}
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {tools.map((item) => (
          <button
            key={item.id}
            className={tool === item.id ? "button active" : "button"}
            onClick={() => setTool(item.id)}
          >
            {item.label}
          </button>
        ))}

        <button
          className={tool === "territory" ? "button active territory-tool" : "button territory-tool"}
          onClick={beginTerritoryDraw}
        >
          ✎ Draw Territory
        </button>
      </div>

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
              Undo Point
            </button>
            <button
              className="button compact success"
              disabled={territoryDraft.length < 3}
              onClick={() => finishTerritory()}
            >
              Finish Territory
            </button>
            <button className="button compact danger" onClick={cancelTerritoryDraw}>
              Cancel
            </button>
          </div>
        </>
      )}

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {objects.map((item) => (
          <button
            key={item.kind}
            className="button"
            onClick={() => addObject(item.kind)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button className="button" onClick={saveLocal}>
          Save Local
        </button>
        <button
          className="button"
          onClick={() => {
            if (!loadLocal()) window.alert("No saved world found in this browser.");
          }}
        >
          Load Local
        </button>
        <button
          className="button subtle"
          onClick={() => {
            if (window.confirm("Reset this world?")) resetWorld();
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
