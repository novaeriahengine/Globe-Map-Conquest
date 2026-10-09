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
  { mode: "earth", title: "World Map", subtitle: "Real countries, conquest, diplomacy, crises, armies and progressive occupation.", icon: "🌍" },
  { mode: "procedural", title: "Procedural Planet", subtitle: "Generated civilizations and terrain-shaped regions.", icon: "🪐" },
  { mode: "sandbox", title: "WorldBox Sandbox", subtitle: "Fast living-world simulation for custom nations and families.", icon: "🌳" }
];

export function WorldPicker({ onOpen }: { onOpen: () => void }) {
  const createWorld = useGameStore((state) => state.createWorld);
  const importWorld = useGameStore((state) => state.importWorld);
  const setCatalog = useGameStore((state) => state.setCatalog);
  const setWorkspaceMode = useGameStore((state) => state.setWorkspaceMode);
  const setPlayerFaction = useGameStore((state) => state.setPlayerFaction);
  const factions = useGameStore((state) => state.factions);

  const [cloudWorlds, setCloudWorlds] = useState<CloudWorldSummary[]>([]);
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState("");
  const [choosePlayStyle, setChoosePlayStyle] = useState(false);
  const [countryId, setCountryId] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([ensureDefaultCatalog(), listCloudWorlds(), listSaveSlots()])
      .then(([catalogResult, worldsResult, savesResult]) => {
        if (cancelled) return;
        if (catalogResult.status === "fulfilled") setCatalog(catalogResult.value);
        if (worldsResult.status === "fulfilled") setCloudWorlds(worldsResult.value);
        if (savesResult.status === "fulfilled") setSaveSlots(savesResult.value);
        if (worldsResult.status === "rejected" && savesResult.status === "rejected") {
          setCloudError("Firestore is not readable yet. Local templates still work.");
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [setCatalog]);

  useEffect(() => {
    if (choosePlayStyle && !countryId && factions.length) {
      setCountryId(factions.find((faction) => !faction.controlledBy)?.id ?? factions[0].id);
    }
  }, [choosePlayStyle, countryId, factions]);

  const finishWorldSelection = () => {
    setChoosePlayStyle(true);
  };

  const create = (mode: WorldMode, title: string) => {
    createWorld(mode, title);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    localStorage.setItem("gmc-cloud-world-id", `${slug}-${Date.now().toString(36).slice(-6)}`);
    finishWorldSelection();
  };

  const openCloud = async (id: string) => {
    setLoading(true);
    setCloudError("");
    try {
      const snapshot = await loadWorldFromCloud(id);
      if (!snapshot) return setCloudError("That cloud world has no saved snapshot.");
      importWorld(snapshot, `Loaded Firestore world ${id}.`);
      localStorage.setItem("gmc-cloud-world-id", id);
      finishWorldSelection();
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : "Could not load cloud world.");
    } finally {
      setLoading(false);
    }
  };

  const openSave = async (id: string) => {
    setLoading(true);
    setCloudError("");
    try {
      const snapshot = await loadSaveSlot(id);
      if (!snapshot) return setCloudError("That save slot could not be found.");
      importWorld(snapshot, "Loaded Firestore save slot.");
      finishWorldSelection();
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : "Could not load save.");
    } finally {
      setLoading(false);
    }
  };

  if (choosePlayStyle) {
    return (
      <div className="world-picker-overlay">
        <div className="world-picker play-style-picker">
          <div className="world-picker-header">
            <div>
              <div className="eyebrow">HOW DO YOU WANT TO PLAY?</div>
              <h1>Enter the world</h1>
              <p>Watch everything as a god, or control one nation while the rest of the world keeps simulating on its own.</p>
            </div>
            <div className="world-picker-logo">G</div>
          </div>

          <div className="play-style-grid">
            <button
              className="play-style-card"
              onClick={() => {
                setPlayerFaction(null);
                setWorkspaceMode("god");
                onOpen();
              }}
            >
              <span>✦</span>
              <strong>God / Watch Mode</strong>
              <small>Watch, favor nations, intervene, create countries, change wars and use editor powers.</small>
            </button>

            <div className="play-style-card country-control-card">
              <span>👑</span>
              <strong>Control a Country</strong>
              <small>Pick a nation and play from its point of view while every other country stays AI-controlled.</small>
              <select
                className="select-input"
                value={countryId}
                onChange={(event) => setCountryId(event.target.value)}
              >
                {factions.filter((faction) => !faction.controlledBy).map((faction) => (
                  <option key={faction.id} value={faction.id}>
                    {faction.emoji} {faction.name}
                  </option>
                ))}
              </select>
              <button
                className="button success full"
                disabled={!countryId}
                onClick={() => {
                  setPlayerFaction(countryId);
                  setWorkspaceMode("player");
                  onOpen();
                }}
              >
                Play as Selected Country
              </button>
            </div>
          </div>

          <button className="button full subtle" onClick={() => setChoosePlayStyle(false)}>
            ← Back to worlds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="world-picker-overlay">
      <div className="world-picker">
        <div className="world-picker-header">
          <div>
            <div className="eyebrow">GLOBE MAP CONQUEST</div>
            <h1>Choose a world or load a save</h1>
            <p>After choosing the world, pick God/Watch mode or choose a country to control.</p>
          </div>
          <div className="world-picker-logo">G</div>
        </div>

        <div className="template-grid">
          {templates.map((template) => (
            <button key={template.mode} className="template-card" onClick={() => create(template.mode, template.title)}>
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
              <span className="cloud-world-icon">{save.viewMode === "map2d" ? "🗺" : "🌎"}</span>
              <span><strong>{save.name}</strong><small>{save.worldName} · tick {save.tick}</small></span>
            </button>
          ))}
          {!loading && saveSlots.length === 0 && <div className="empty-cloud-worlds">No save slots yet.</div>}
        </div>

        <div className="cloud-worlds-header">
          <strong>Cloud worlds</strong>
          <span>{loading ? "Loading…" : `${cloudWorlds.length} worlds`}</span>
        </div>
        <div className="cloud-world-grid">
          {cloudWorlds.map((world) => (
            <button key={world.id} onClick={() => void openCloud(world.id)}>
              <span className="cloud-world-icon">{world.mode === "earth" ? "🌎" : world.mode === "sandbox" ? "🌲" : "🪐"}</span>
              <span><strong>{world.name}</strong><small>{world.id} · tick {world.tick}</small></span>
            </button>
          ))}
        </div>

        {cloudError && <div className="online-error">{cloudError}</div>}
      </div>
    </div>
  );
}
