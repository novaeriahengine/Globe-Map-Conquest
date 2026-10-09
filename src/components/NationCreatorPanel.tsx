import { useGameStore } from "../store/useGameStore";

export function NationCreatorPanel() {
  const tool = useGameStore((state) => state.tool);
  const setTool = useGameStore((state) => state.setTool);
  const size = useGameStore((state) => state.nationPlacementSize);
  const name = useGameStore((state) => state.nationPlacementName);
  const color = useGameStore((state) => state.nationPlacementColor);
  const setNationPlacement = useGameStore((state) => state.setNationPlacement);

  return (
    <section className="panel nation-creator-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">WORLD EDITOR</div>
          <strong>Create Nation</strong>
        </div>
        <span className={tool === "nation" ? "tool-ready active" : "tool-ready"}>
          {tool === "nation" ? "PLACEMENT ON" : "OFF"}
        </span>
      </div>

      <input
        className="text-input"
        value={name}
        placeholder="Nation name (optional)"
        onChange={(event) => setNationPlacement({ name: event.target.value })}
      />

      <div className="nation-brush-row">
        <label>
          <span>Nation color</span>
          <input
            type="color"
            value={color}
            onChange={(event) =>
              setNationPlacement({ color: event.target.value })
            }
          />
        </label>
        <div className="nation-brush-size">
          <strong>{size}×{size}</strong>
          <span>map pixels</span>
        </div>
      </div>

      <label className="nation-size-slider">
        <span>Starting land size — from one map pixel upward</span>
        <input
          type="range"
          min={1}
          max={120}
          step={1}
          value={size}
          onChange={(event) =>
            setNationPlacement({ size: Number(event.target.value) })
          }
        />
      </label>

      <div className="population-presets nation-size-presets">
        {[1, 3, 8, 16, 32].map((value) => (
          <button
            key={value}
            className="button compact"
            onClick={() => setNationPlacement({ size: value })}
          >
            {value}px
          </button>
        ))}
      </div>

      <button
        className={tool === "nation" ? "button success full active" : "button full"}
        onClick={() => setTool(tool === "nation" ? "select" : "nation")}
      >
        {tool === "nation" ? "✓ Tap Map to Place Nation" : "＋ Start Nation Brush"}
      </button>

      <p className="panel-note">
        With placement on, tap anywhere on the 2D world. A new sovereign country,
        civilization record, homeland, population, and land/sea/air forces are
        created there.
      </p>
    </section>
  );
}
