import { useEffect, useState } from "react";
import {
  ensureDefaultCatalog,
  listCloudWorlds,
  listSaveSlots,
  loadSaveSlot,
  loadWorldFromCloud,
  type CloudWorldSummary,
  type SaveSlotSummary
} from "../firebase/worldCloud";
import type { WorldMode } from "../game/types";
import { useGameStore } from "../store/useGameStore";

interface TemplateCard {
  mode: WorldMode;
  title: string;
  subtitle: string;
  icon: string;
}

const templates: TemplateCard[] = [
  {
    mode: "earth",
    title: "World Map",
    subtitle: "Real countries, 3D globe + flat 2D battle map, diplomacy and editable territories.",
    icon: "🌍"
  },
  {
    mode: "procedural",
    title: "Procedural Planet",
    subtitle: "Seeded continents and a flat simulation view for generated worlds.",
    icon: "🪐"
  },
  {
    mode: "sandbox",
    title: "WorldBox Sandbox",
    subtitle: "Fast living-world simulation with NPC armies, trees and war.",
    icon: "🌳"
  }
];

export function WorldPicker({ onOpen }: { onOpen: () => void }) {
  const createWorld = useGameStore((state) => state.createWorld);
  const importWorld = useGameStore((state) => state.importWorld);
  const setCatalog = useGameStore((state) => state.setCatalog);

  const [cloudWorlds, setCloudWorlds] = useState<CloudWorldSummary[]>([]);
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      ensureDefaultCatalog(),
      listCloudWorlds(),
      listSaveSlots()
    ]).then(([catalogResult, worldsResult, savesResult]) => {
      if (cancelled) return;

      if (catalogResult.status === "fulfilled") {
        setCatalog(catalogResult.value);
      }
      if (worldsResult.status === "fulfilled") {
        setCloudWorlds(worldsResult.value);
      }
      if (savesResult.status === "fulfilled") {
        setSaveSlots(savesResult.value);
      }

      if (
        worldsResult.status === "rejected" &&
        savesResult.status === "rejected"
      ) {
        setCloudError("Firestore is not readable yet. Local templates still work.");
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [setCatalog]);

  const create = (mode: WorldMode, title: string) => {
    createWorld(mode, title);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    localStorage.setItem(
      "gmc-cloud-world-id",
      `${slug}-${Date.now().toString(36).slice(-6)}`
    );
    onOpen();
  };

  const openCloud = async (id: string) => {
    setLoading(true);
    setCloudError("");
    try {
      const snapshot = await loadWorldFromCloud(id);
      if (!snapshot) {
        setCloudError("That cloud world has no saved snapshot.");
        return;
      }
      importWorld(snapshot, `Loaded Firestore world ${id}.`);
      localStorage.setItem("gmc-cloud-world-id", id);
      onOpen();
    } catch (error) {
      setCloudError(
        error instanceof Error ? error.message : "Could not load cloud world."
      );
    } finally {
      setLoading(false);
    }
  };

  const openSave = async (id: string) => {
    setLoading(true);
    setCloudError("");
    try {
      const snapshot = await loadSaveSlot(id);
      if (!snapshot) {
        setCloudError("That save slot could not be found.");
        return;
      }
      importWorld(snapshot, "Loaded Firestore save slot.");
      onOpen();
    } catch (error) {
      setCloudError(
        error instanceof Error ? error.message : "Could not load save."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="world-picker-overlay">
      <div className="world-picker">
        <div className="world-picker-header">
          <div>
            <div className="eyebrow">GLOBE MAP CONQUEST</div>
            <h1>Choose a world or load a save</h1>
            <p>
              Use the 3D globe when you want the planet view, then switch to the
              2D battle map to watch countries, armies and conflicts from above.
            </p>
          </div>
          <div className="world-picker-logo">G</div>
        </div>

        <div className="template-grid">
          {templates.map((template) => (
            <button
              key={template.mode}
              className="template-card"
              onClick={() => create(template.mode, template.title)}
            >
              <span className="template-icon">{template.icon}</span>
              <strong>{template.title}</strong>
              <span>{template.subtitle}</span>
            </button>
          ))}
        </div>

        <div className="cloud-worlds-header">
          <strong>My Firestore save slots</strong>
          <span>{loading ? "Loading…" : `${saveSlots.length} saves`}</span>
        </div>

        <div className="cloud-world-grid">
          {saveSlots.map((save) => (
            <button key={save.id} onClick={() => void openSave(save.id)}>
              <span className="cloud-world-icon">
                {save.viewMode === "map2d" ? "🗺" : "🌎"}
              </span>
              <span>
                <strong>{save.name}</strong>
                <small>
                  {save.worldName} · {save.viewMode === "map2d" ? "2D" : "3D"} · tick {save.tick}
                </small>
              </span>
            </button>
          ))}

          {!loading && saveSlots.length === 0 && (
            <div className="empty-cloud-worlds">
              No save slots yet. Open a world and use Save / Load to create one.
            </div>
          )}
        </div>

        <div className="cloud-worlds-header">
          <strong>Cloud worlds</strong>
          <span>{loading ? "Loading…" : `${cloudWorlds.length} worlds`}</span>
        </div>

        <div className="cloud-world-grid">
          {cloudWorlds.map((world) => (
            <button key={world.id} onClick={() => void openCloud(world.id)}>
              <span className="cloud-world-icon">
                {world.mode === "earth"
                  ? "🌎"
                  : world.mode === "sandbox"
                    ? "🌲"
                    : "🪐"}
              </span>
              <span>
                <strong>{world.name}</strong>
                <small>{world.id} · tick {world.tick}</small>
              </span>
            </button>
          ))}
        </div>

        {cloudError && <div className="online-error">{cloudError}</div>}
      </div>
    </div>
  );
}
