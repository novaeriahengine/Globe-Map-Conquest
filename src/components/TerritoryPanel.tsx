import { useEffect, useState } from "react";
import { useGameStore } from "../store/useGameStore";

export function TerritoryPanel() {
  const territories = useGameStore((state) => state.territories);
  const factions = useGameStore((state) => state.factions);
  const selectedTerritoryId = useGameStore((state) => state.selectedTerritoryId);
  const selectTerritory = useGameStore((state) => state.selectTerritory);
  const beginTerritoryDraw = useGameStore((state) => state.beginTerritoryDraw);
  const renameTerritory = useGameStore((state) => state.renameTerritory);
  const recolorTerritory = useGameStore((state) => state.recolorTerritory);
  const deleteTerritory = useGameStore((state) => state.deleteTerritory);

  const selected =
    territories.find((territory) => territory.id === selectedTerritoryId) ?? null;

  const [name, setName] = useState("");

  useEffect(() => {
    setName(selected?.name ?? "");
  }, [selected?.id, selected?.name]);

  const parent = selected?.parentFactionId
    ? factions.find((faction) => faction.id === selected.parentFactionId)
    : null;

  const owner = selected?.ownerFactionId
    ? factions.find((faction) => faction.id === selected.ownerFactionId)
    : null;

  return (
    <section className="panel territory-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">BORDER EDITOR</div>
          <strong>Territories</strong>
        </div>
        <button className="button compact" onClick={beginTerritoryDraw}>
          + Draw split
        </button>
      </div>

      <p className="muted">
        Select a country, choose Draw Territory, then click around the part you want
        to carve out. The new polygon becomes an editable territory layered over the
        original country.
      </p>

      {territories.length > 0 && (
        <div className="territory-list">
          {territories.slice(-16).reverse().map((territory) => (
            <button
              key={territory.id}
              className={territory.id === selectedTerritoryId ? "active" : ""}
              onClick={() => selectTerritory(territory.id)}
            >
              <span
                className="territory-color-dot"
                style={{ background: territory.color }}
              />
              <span>{territory.name}</span>
              <small>{territory.points.length} pts</small>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="territory-editor">
          <div className="section-label">Selected territory</div>

          <div className="territory-name-row">
            <input
              className="text-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => renameTerritory(selected.id, name)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  renameTerritory(selected.id, name);
                  (event.currentTarget as HTMLInputElement).blur();
                }
              }}
            />
            <input
              type="color"
              value={selected.color}
              onChange={(event) =>
                recolorTerritory(selected.id, event.target.value)
              }
              title="Territory color"
            />
          </div>

          <div className="territory-meta">
            <span>Parent: <strong>{parent?.name ?? "Independent"}</strong></span>
            <span>Owner: <strong>{owner?.name ?? "Unclaimed"}</strong></span>
            <span>Vertices: <strong>{selected.points.length}</strong></span>
          </div>

          <button
            className="button danger full"
            onClick={() => deleteTerritory(selected.id)}
          >
            Delete territory
          </button>
        </div>
      )}
    </section>
  );
}
