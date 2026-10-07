import { create } from "zustand";
import { createInitialFactions } from "../game/countries";
import { latLonToXYZ } from "../game/geo";
import type {
  EditorTool,
  Faction,
  FlagPresetId,
  ObjectKind,
  Relation,
  SavedWorld,
  SceneObject,
  Vec3,
  WorldMode
} from "../game/types";

interface GameStore {
  worldName: string;
  worldMode: WorldMode;
  seed: number;
  playMode: boolean;
  tool: EditorTool;
  objects: SceneObject[];
  factions: Faction[];
  selectedObjectId: string | null;
  selectedFactionId: string | null;
  logs: string[];
  tick: number;

  setWorldName: (name: string) => void;
  setWorldMode: (mode: WorldMode) => void;
  setSeed: (seed: number) => void;
  randomizeSeed: () => void;
  setPlayMode: (value: boolean) => void;
  setTool: (tool: EditorTool) => void;
  selectObject: (id: string | null) => void;
  selectFaction: (id: string | null) => void;
  addObject: (kind: ObjectKind, position?: Vec3, factionId?: string) => void;
  deleteSelectedObject: () => void;
  updateObjectTransform: (
    id: string,
    transform: Partial<Pick<SceneObject, "position" | "rotation" | "scale">>
  ) => void;
  updateObjectColor: (id: string, color: string) => void;
  setFactionFlag: (factionId: string, preset: FlagPresetId) => void;
  setRelation: (aId: string, bId: string, relation: Relation) => void;
  spawnKing: (factionId: string) => void;
  simulateTick: () => void;
  saveLocal: () => void;
  loadLocal: () => boolean;
  resetWorld: () => void;
}

const STORAGE_KEY = "globe-map-conquest-world-v1";

function makeId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${suffix}`;
}

function objectDefaults(kind: ObjectKind): Omit<SceneObject, "id" | "position"> {
  const names: Record<ObjectKind, string> = {
    block: "Block",
    sphere: "Sphere",
    cylinder: "Cylinder",
    spawn: "Spawn Point",
    king: "King"
  };

  const colors: Record<ObjectKind, string> = {
    block: "#ffb703",
    sphere: "#8ecae6",
    cylinder: "#90be6d",
    spawn: "#e9c46a",
    king: "#ffd166"
  };

  return {
    name: names[kind],
    kind,
    rotation: [0, 0, 0],
    scale: kind === "king" ? [0.08, 0.14, 0.08] : [0.18, 0.18, 0.18],
    color: colors[kind]
  };
}

function relationLabel(relation: Relation) {
  if (relation === "war") return "declared war on";
  if (relation === "allied") return "formed an alliance with";
  return "normalized relations with";
}

export const useGameStore = create<GameStore>((set, get) => ({
  worldName: "New Globe World",
  worldMode: "earth",
  seed: 48271,
  playMode: false,
  tool: "select",
  objects: [],
  factions: createInitialFactions(),
  selectedObjectId: null,
  selectedFactionId: "USA",
  logs: ["World initialized. Select a country or add an object to begin."],
  tick: 0,

  setWorldName: (worldName) => set({ worldName }),
  setWorldMode: (worldMode) =>
    set((state) => ({
      worldMode,
      logs: [`World mode changed to ${worldMode}.`, ...state.logs].slice(0, 80)
    })),
  setSeed: (seed) => set({ seed: Math.max(0, Math.floor(seed || 0)) }),
  randomizeSeed: () =>
    set({
      seed: Math.floor(Math.random() * 999_999_999)
    }),
  setPlayMode: (playMode) =>
    set((state) => ({
      playMode,
      logs: [playMode ? "Simulation started." : "Simulation paused.", ...state.logs].slice(0, 80)
    })),
  setTool: (tool) => set({ tool }),
  selectObject: (selectedObjectId) => set({ selectedObjectId }),
  selectFaction: (selectedFactionId) => set({ selectedFactionId }),

  addObject: (kind, position = [0, 2.25, 0], factionId) => {
    const base = objectDefaults(kind);
    const id = makeId(kind);
    const object: SceneObject = {
      ...base,
      id,
      position,
      factionId
    };
    set((state) => ({
      objects: [...state.objects, object],
      selectedObjectId: id,
      logs: [`Added ${base.name}.`, ...state.logs].slice(0, 80)
    }));
  },

  deleteSelectedObject: () => {
    const id = get().selectedObjectId;
    if (!id) return;
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== id),
      selectedObjectId: null,
      logs: ["Deleted selected object.", ...state.logs].slice(0, 80)
    }));
  },

  updateObjectTransform: (id, transform) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? { ...object, ...transform } : object
      )
    })),

  updateObjectColor: (id, color) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? { ...object, color } : object
      )
    })),

  setFactionFlag: (factionId, flagPresetId) =>
    set((state) => ({
      factions: state.factions.map((faction) =>
        faction.id === factionId ? { ...faction, flagPresetId } : faction
      ),
      logs: [
        `${state.factions.find((faction) => faction.id === factionId)?.name ?? "Country"} changed its flag.`,
        ...state.logs
      ].slice(0, 80)
    })),

  setRelation: (aId, bId, relation) => {
    if (!aId || !bId || aId === bId) return;
    set((state) => {
      const a = state.factions.find((faction) => faction.id === aId);
      const b = state.factions.find((faction) => faction.id === bId);
      if (!a || !b) return state;

      return {
        factions: state.factions.map((faction) => {
          if (faction.id === aId) {
            return { ...faction, relations: { ...faction.relations, [bId]: relation } };
          }
          if (faction.id === bId) {
            return { ...faction, relations: { ...faction.relations, [aId]: relation } };
          }
          return faction;
        }),
        logs: [`${a.name} ${relationLabel(relation)} ${b.name}.`, ...state.logs].slice(0, 80)
      };
    });
  },

  spawnKing: (factionId) => {
    const faction = get().factions.find((item) => item.id === factionId);
    if (!faction) return;

    const kingName = `King of ${faction.name}`;
    const position = latLonToXYZ(faction.lat, faction.lon, 2.12);
    const id = makeId("king");
    const object: SceneObject = {
      ...objectDefaults("king"),
      id,
      name: kingName,
      position,
      factionId,
      color: faction.color
    };

    set((state) => ({
      objects: [...state.objects, object],
      selectedObjectId: id,
      factions: state.factions.map((item) =>
        item.id === factionId ? { ...item, rulerName: kingName } : item
      ),
      logs: [`${kingName} spawned at ${faction.capital ?? faction.name}.`, ...state.logs].slice(0, 80)
    }));
  },

  simulateTick: () =>
    set((state) => {
      const next = state.factions.map((faction) => ({
        ...faction,
        relations: { ...faction.relations },
        treasury: faction.treasury + 2,
        army: Math.min(250, faction.army + (faction.controlledBy ? 0 : 0.12))
      }));

      const byId = new Map(next.map((faction) => [faction.id, faction]));
      const warEvents: string[] = [];
      const processed = new Set<string>();

      for (const attacker of next) {
        for (const [targetId, relation] of Object.entries(attacker.relations)) {
          if (relation !== "war") continue;
          const key = [attacker.id, targetId].sort().join(":");
          if (processed.has(key)) continue;
          processed.add(key);

          const defender = byId.get(targetId);
          if (!defender) continue;

          const attackRoll = attacker.army * (0.06 + Math.random() * 0.05);
          const defenseRoll = defender.army * (0.05 + Math.random() * 0.05);

          attacker.army = Math.max(0, attacker.army - defenseRoll * 0.45);
          defender.army = Math.max(0, defender.army - attackRoll * 0.55);
          attacker.treasury = Math.max(0, attacker.treasury - 4);
          defender.treasury = Math.max(0, defender.treasury - 4);

          if (defender.army <= 1 && attacker.army > defender.army) {
            defender.controlledBy = attacker.controlledBy ?? attacker.id;
            defender.stability = 35;
            defender.army = 12;
            defender.relations[attacker.id] = "neutral";
            attacker.relations[defender.id] = "neutral";
            warEvents.push(`${attacker.name} conquered ${defender.name}.`);
          } else if (attacker.army <= 1 && defender.army > attacker.army) {
            attacker.controlledBy = defender.controlledBy ?? defender.id;
            attacker.stability = 35;
            attacker.army = 12;
            attacker.relations[defender.id] = "neutral";
            defender.relations[attacker.id] = "neutral";
            warEvents.push(`${defender.name} conquered ${attacker.name}.`);
          }
        }
      }

      return {
        factions: next,
        tick: state.tick + 1,
        logs: [...warEvents, ...state.logs].slice(0, 80)
      };
    }),

  saveLocal: () => {
    const state = get();
    const snapshot: SavedWorld = {
      version: 1,
      worldName: state.worldName,
      worldMode: state.worldMode,
      seed: state.seed,
      objects: state.objects,
      factions: state.factions,
      logs: state.logs,
      tick: state.tick
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    set((current) => ({
      logs: ["World saved in this browser.", ...current.logs].slice(0, 80)
    }));
  },

  loadLocal: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const snapshot = JSON.parse(raw) as SavedWorld;
      if (snapshot.version !== 1) return false;
      set({
        worldName: snapshot.worldName,
        worldMode: snapshot.worldMode,
        seed: snapshot.seed,
        objects: snapshot.objects,
        factions: snapshot.factions,
        logs: ["Saved world loaded.", ...snapshot.logs].slice(0, 80),
        tick: snapshot.tick,
        selectedObjectId: null,
        selectedFactionId: snapshot.factions[0]?.id ?? null,
        playMode: false
      });
      return true;
    } catch {
      return false;
    }
  },

  resetWorld: () =>
    set({
      worldName: "New Globe World",
      worldMode: "earth",
      seed: 48271,
      playMode: false,
      tool: "select",
      objects: [],
      factions: createInitialFactions(),
      selectedObjectId: null,
      selectedFactionId: "USA",
      logs: ["World reset."],
      tick: 0
    })
}));
