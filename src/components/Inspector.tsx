import type { SceneObject, Vec3 } from "../game/types";
import { useGameStore } from "../store/useGameStore";

function VectorEditor({
  label,
  value,
  onChange,
  step = 0.05
}: {
  label: string;
  value: Vec3;
  onChange: (value: Vec3) => void;
  step?: number;
}) {
  return (
    <div className="vector-editor">
      <span>{label}</span>
      <div>
        {value.map((number, index) => (
          <input
            key={index}
            type="number"
            step={step}
            value={Number(number.toFixed(3))}
            onChange={(event) => {
              const next = [...value] as Vec3;
              next[index] = Number(event.target.value);
              onChange(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SelectedObjectInspector({ object }: { object: SceneObject }) {
  const updateObjectTransform = useGameStore((state) => state.updateObjectTransform);
  const updateObjectColor = useGameStore((state) => state.updateObjectColor);
  const deleteSelectedObject = useGameStore((state) => state.deleteSelectedObject);

  return (
    <div className="inspector-block">
      <div className="selected-object-heading">
        <div>
          <div className="eyebrow">SELECTED OBJECT</div>
          <strong>{object.name}</strong>
        </div>
        <span className="kind-badge">{object.kind}</span>
      </div>

      <VectorEditor
        label="Position"
        value={object.position}
        onChange={(position) => updateObjectTransform(object.id, { position })}
      />
      <VectorEditor
        label="Rotation"
        value={object.rotation}
        step={0.1}
        onChange={(rotation) => updateObjectTransform(object.id, { rotation })}
      />
      <VectorEditor
        label="Scale"
        value={object.scale}
        onChange={(scale) => updateObjectTransform(object.id, { scale })}
      />

      <label className="color-row">
        <span>Color</span>
        <input
          type="color"
          value={object.color.startsWith("#") ? object.color : "#ffffff"}
          onChange={(event) => updateObjectColor(object.id, event.target.value)}
        />
      </label>

      <button className="button danger full" onClick={deleteSelectedObject}>
        Delete object
      </button>
    </div>
  );
}

export function Inspector() {
  const worldName = useGameStore((state) => state.worldName);
  const setWorldName = useGameStore((state) => state.setWorldName);
  const worldMode = useGameStore((state) => state.worldMode);
  const setWorldMode = useGameStore((state) => state.setWorldMode);
  const seed = useGameStore((state) => state.seed);
  const setSeed = useGameStore((state) => state.setSeed);
  const randomizeSeed = useGameStore((state) => state.randomizeSeed);
  const objects = useGameStore((state) => state.objects);
  const selectedObjectId = useGameStore((state) => state.selectedObjectId);
  const selectObject = useGameStore((state) => state.selectObject);
  const logs = useGameStore((state) => state.logs);
  const tick = useGameStore((state) => state.tick);

  const selected = objects.find((object) => object.id === selectedObjectId) ?? null;

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

        <div className="tiny-status">
          Simulation tick <strong>{tick}</strong>
        </div>
      </section>

      <section className="panel scene-panel">
        <div className="panel-title">Hierarchy</div>
        <div className="scene-list">
          {objects.length === 0 && (
            <div className="empty-state">Add a Block, Sphere, Cylinder, Spawn, or King.</div>
          )}
          {objects.map((object) => (
            <button
              key={object.id}
              className={selectedObjectId === object.id ? "active" : ""}
              onClick={() => selectObject(object.id)}
            >
              <span className="object-icon">{object.kind === "king" ? "♛" : "◆"}</span>
              <span>{object.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Inspector</div>
        {selected ? (
          <SelectedObjectInspector object={selected} />
        ) : (
          <div className="empty-state">Select an object to edit its transform.</div>
        )}
      </section>

      <section className="panel log-panel">
        <div className="panel-title">World Log</div>
        <div className="log-list">
          {logs.slice(0, 12).map((entry, index) => (
            <div key={`${entry}-${index}`}>{entry}</div>
          ))}
        </div>
      </section>
    </aside>
  );
}
