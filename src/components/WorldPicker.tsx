import { useEffect, useState } from "react";
import {
  ensureDefaultCatalog,
  listCloudWorlds,
  loadWorldFromCloud,
  type CloudWorldSummary
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
    subtitle: "Real countries, selectable borders, diplomacy, editable breakaway territories.",
    icon: "🌍"
  },
  {
    mode: "procedural",
    title: "Procedural Planet",
    subtitle: "Seeded continents, mountains, oceans, forests and generated civilizations.",
    icon: "🪐"
  },
  {
    mode: "sandbox",
    title: "WorldBox Sandbox",
    subtitle: "Colorful low-poly planet with dense trees, NPC armies and fast simulation.",
    icon: "🌳"
  }
];

export function WorldPicker({ onOpen }: { onOpen: () => void }) {
  const createWorld = useGameStore((state) => state.createWorld);
  const importWorld = useGameStore((state) => state.importWorld);
  const setCatalog = useGameStore((state) => state.setCatalog);
  const [cloudWorlds, setCloudWorlds] = useState<CloudWorldSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([ensureDefaultCatalog(), listCloudWorlds()]).then(
      ([catalogResult, worldsResult]) => {
        if (cancelled) return;

        if (catalogResult.status === "fulfilled") {
          setCatalog(catalogResult.value);
        }

        if (worldsResult.status === "fulfilled") {
          setCloudWorlds(worldsResult.value);
        } else {
          setCloudError("Firestore is not readable yet. The local templates still work.");
        }

        setLoading(false);
      }
    );

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
    const cloudId = `${slug}-${Date.now().toString(36).slice(-6)}`;
    localStorage.setItem("gmc-cloud-world-id", cloudId);
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
      setCloudError(error instanceof Error ? error.message : "Could not load cloud world.");
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
            <h1>Choose a world</h1>
            <p>
              Start from Earth, generate a planet, or load a world saved as JSON-like Firestore data.
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
          <strong>Firestore worlds</strong>
          <span>{loading ? "Loading…" : `${cloudWorlds.length} saved`}</span>
        </div>

        <div className="cloud-world-grid">
          {cloudWorlds.map((world) => (
            <button key={world.id} onClick={() => void openCloud(world.id)}>
              <span className="cloud-world-icon">
                {world.mode === "earth" ? "🌎" : world.mode === "sandbox" ? "🌲" : "🪐"}
              </span>
              <span>
                <strong>{world.name}</strong>
                <small>{world.id} · tick {world.tick}</small>
              </span>
            </button>
          ))}

          {!loading && cloudWorlds.length === 0 && (
            <div className="empty-cloud-worlds">
              No cloud worlds yet. Create a map, then use the Firestore panel to save it.
            </div>
          )}
        </div>

        {cloudError && <div className="online-error">{cloudError}</div>}
      </div>
    </div>
  );
}
