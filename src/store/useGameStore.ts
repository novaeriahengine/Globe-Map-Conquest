import { create } from "zustand";
import { DEFAULT_CATALOG, DEFAULT_QUESTS } from "../data/catalogDefaults";
import { createInitialFactions } from "../game/countries";
import { latLonToXYZ, seededColor } from "../game/geo";
import type {
  EditorTool,
  Faction,
  FlagPresetId,
  LatLon,
  LegacySavedWorldV1,
  NameCatalog,
  NpcUnit,
  ObjectKind,
  Quest,
  Relation,
  SavedWorld,
  SceneObject,
  TerritoryPatch,
  TraitStats,
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
  territories: TerritoryPatch[];
  territoryDraft: LatLon[];
  selectedTerritoryId: string | null;
  npcs: NpcUnit[];
  quests: Quest[];
  catalog: NameCatalog;
  selectedObjectId: string | null;
  selectedFactionId: string | null;
  logs: string[];
  tick: number;

  setWorldName: (name: string) => void;
  setWorldMode: (mode: WorldMode) => void;
  createWorld: (mode: WorldMode, name?: string) => void;
  setSeed: (seed: number) => void;
  randomizeSeed: () => void;
  setPlayMode: (value: boolean) => void;
  setTool: (tool: EditorTool) => void;
  setCatalog: (catalog: NameCatalog) => void;
  selectObject: (id: string | null) => void;
  selectFaction: (id: string | null) => void;
  selectTerritory: (id: string | null) => void;
  addObject: (kind: ObjectKind, position?: Vec3, factionId?: string) => void;
  deleteSelectedObject: () => void;
  updateObjectTransform: (
    id: string,
    transform: Partial<Pick<SceneObject, "position" | "rotation" | "scale">>
  ) => void;
  updateObjectColor: (id: string, color: string) => void;
  setFactionFlag: (factionId: string, preset: FlagPresetId) => void;
  setFactionColor: (factionId: string, color: string) => void;
  setRelation: (aId: string, bId: string, relation: Relation) => void;
  spawnKing: (factionId: string) => void;
  beginTerritoryDraw: () => void;
  addTerritoryPoint: (point: LatLon) => void;
  undoTerritoryPoint: () => void;
  cancelTerritoryDraw: () => void;
  finishTerritory: (name?: string) => void;
  renameTerritory: (id: string, name: string) => void;
  recolorTerritory: (id: string, color: string) => void;
  deleteTerritory: (id: string) => void;
  simulateTick: () => void;
  exportWorld: () => SavedWorld;
  importWorld: (snapshot: SavedWorld | LegacySavedWorldV1, source?: string) => void;
  saveLocal: () => void;
  loadLocal: () => boolean;
  resetWorld: () => void;
}

const STORAGE_KEY = "globe-map-conquest-world-v2";

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

function choose<T>(items: T[], fallback: T, seed = Math.random()) {
  if (!items.length) return fallback;
  const index = Math.abs(Math.floor(seed * items.length)) % items.length;
  return items[index] ?? fallback;
}

function traitStats(traits: string[]): TraitStats {
  const stats: TraitStats = {
    aggression: 48,
    courage: 52,
    discipline: 50,
    speed: 50,
    luck: 50
  };

  for (const trait of traits) {
    const t = trait.toLowerCase();
    if (t.includes("aggressive") || t.includes("ruthless") || t.includes("berserker")) stats.aggression += 24;
    if (t.includes("brave") || t.includes("loyal")) stats.courage += 22;
    if (t.includes("disciplined") || t.includes("tactical") || t.includes("strategist")) stats.discipline += 24;
    if (t.includes("swift") || t.includes("explorer")) stats.speed += 22;
    if (t.includes("lucky")) stats.luck += 28;
    if (t.includes("cautious") || t.includes("defender")) stats.aggression -= 14;
    if (t.includes("stubborn")) {
      stats.courage += 12;
      stats.speed -= 8;
    }
    if (t.includes("merciful")) stats.aggression -= 10;
  }

  for (const key of Object.keys(stats) as Array<keyof TraitStats>) {
    stats[key] = Math.max(5, Math.min(100, stats[key]));
  }
  return stats;
}

function makeNpc(
  faction: Faction,
  catalog: NameCatalog,
  ordinal: number
): NpcUnit {
  const seed = ((ordinal + 1) * 0.173 + faction.name.length * 0.071) % 1;
  const first = choose(catalog.npcFirstNames, "Unit", seed);
  const last = choose(catalog.npcLastNames, faction.name, (seed * 2.37) % 1);
  const traitA = choose(catalog.traitNames, "Brave", (seed * 3.11) % 1);
  const traitB = choose(catalog.traitNames, "Disciplined", (seed * 5.29 + 0.21) % 1);
  const traits = traitA === traitB ? [traitA] : [traitA, traitB];
  const stats = traitStats(traits);
  const maxHp = 78 + Math.round(stats.courage * 0.42 + stats.discipline * 0.18);

  return {
    id: makeId("npc"),
    factionId: faction.id,
    name: `${first} ${last}`,
    species: choose(catalog.species, "Human", (seed * 7.03 + 0.12) % 1),
    traits,
    stats,
    hp: maxHp,
    maxHp,
    attack: 12 + stats.aggression * 0.11 + stats.discipline * 0.05,
    defense: 7 + stats.courage * 0.07 + stats.discipline * 0.09,
    lat: faction.lat + (ordinal % 3 - 1) * 0.35,
    lon: faction.lon + (Math.floor(ordinal / 3) - 1) * 0.35,
    targetFactionId: null,
    state: "idle",
    kills: 0
  };
}

function ensureSquad(
  npcs: NpcUnit[],
  faction: Faction,
  catalog: NameCatalog,
  desired = 8
) {
  const alive = npcs.filter((npc) => npc.factionId === faction.id && npc.state !== "dead");
  if (alive.length >= desired) return npcs;

  const next = [...npcs];
  for (let i = alive.length; i < desired; i += 1) {
    next.push(makeNpc(faction, catalog, i));
  }
  return next;
}

function angleDistance(a: LatLon, b: LatLon) {
  const dLat = a[0] - b[0];
  let dLon = a[1] - b[1];
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function moveToward(
  current: LatLon,
  target: LatLon,
  amount: number
): LatLon {
  let dLon = target[1] - current[1];
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;

  const dLat = target[0] - current[0];
  const length = Math.sqrt(dLat * dLat + dLon * dLon);
  if (length <= amount || length === 0) return [target[0], target[1]];

  const lat = current[0] + (dLat / length) * amount;
  const lon = ((current[1] + (dLon / length) * amount + 540) % 360) - 180;
  return [lat, lon];
}

function questProgress(
  quests: Quest[],
  factions: Faction[],
  territories: TerritoryPatch[]
) {
  const pairKeys = new Set<string>();
  let alliances = 0;
  let wars = 0;

  for (const faction of factions) {
    for (const [otherId, relation] of Object.entries(faction.relations)) {
      const key = [faction.id, otherId].sort().join(":");
      if (pairKeys.has(key)) continue;
      pairKeys.add(key);
      if (relation === "allied") alliances += 1;
      if (relation === "war") wars += 1;
    }
  }

  const conquests = factions.filter((faction) => faction.controlledBy).length;
  const controllerCounts = new Map<string, number>();
  for (const faction of factions) {
    const controller = faction.controlledBy ?? faction.id;
    controllerCounts.set(controller, (controllerCounts.get(controller) ?? 0) + 1);
  }
  const maxControlled = Math.max(1, ...controllerCounts.values());
  const domination = Math.round((maxControlled / Math.max(1, factions.length)) * 100);

  const newlyCompleted: string[] = [];
  const updated = quests.map((quest) => {
    let progress = quest.progress;
    if (quest.type === "alliance") progress = alliances;
    if (quest.type === "war") progress = wars;
    if (quest.type === "territory") progress = territories.length;
    if (quest.type === "conquest") progress = conquests;
    if (quest.type === "world-domination") progress = domination;

    const completed = progress >= quest.target;
    if (completed && !quest.completed) newlyCompleted.push(quest.title);
    return { ...quest, progress, completed };
  });

  return { quests: updated, newlyCompleted };
}

function upgradeSnapshot(snapshot: SavedWorld | LegacySavedWorldV1): SavedWorld {
  if (snapshot.version === 2) return snapshot;

  return {
    version: 2,
    worldName: snapshot.worldName,
    worldMode: snapshot.worldMode,
    seed: snapshot.seed,
    objects: snapshot.objects,
    factions: snapshot.factions.map((faction) => ({
      ...faction,
      accentColor: seededColor(faction.id + "-accent")
    })),
    territories: [],
    npcs: [],
    quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
    logs: snapshot.logs,
    tick: snapshot.tick
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  worldName: "New Globe World",
  worldMode: "earth",
  seed: 48271,
  playMode: false,
  tool: "select",
  objects: [],
  factions: createInitialFactions(),
  territories: [],
  territoryDraft: [],
  selectedTerritoryId: null,
  npcs: [],
  quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
  catalog: DEFAULT_CATALOG,
  selectedObjectId: null,
  selectedFactionId: "USA",
  logs: ["World initialized. Select a country or draw a territory to begin."],
  tick: 0,

  setWorldName: (worldName) => set({ worldName }),

  setWorldMode: (worldMode) =>
    set((state) => ({
      worldMode,
      logs: [`World mode changed to ${worldMode}.`, ...state.logs].slice(0, 120)
    })),

  createWorld: (worldMode, name) =>
    set({
      worldName:
        name ??
        (worldMode === "earth"
          ? "World Map"
          : worldMode === "sandbox"
            ? "WorldBox Sandbox"
            : "Procedural Planet"),
      worldMode,
      seed: Math.floor(Math.random() * 999_999_999),
      playMode: false,
      tool: "select",
      objects: [],
      factions: createInitialFactions(),
      territories: [],
      territoryDraft: [],
      selectedTerritoryId: null,
      npcs: [],
      quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
      selectedObjectId: null,
      selectedFactionId: "USA",
      logs: [`Created ${worldMode} world.`],
      tick: 0
    }),

  setSeed: (seed) => set({ seed: Math.max(0, Math.floor(seed || 0)) }),

  randomizeSeed: () =>
    set({
      seed: Math.floor(Math.random() * 999_999_999)
    }),

  setPlayMode: (playMode) =>
    set((state) => ({
      playMode,
      logs: [playMode ? "Simulation started." : "Simulation paused.", ...state.logs].slice(0, 120)
    })),

  setTool: (tool) => set({ tool }),
  setCatalog: (catalog) => set({ catalog }),
  selectObject: (selectedObjectId) => set({ selectedObjectId }),
  selectFaction: (selectedFactionId) => set({ selectedFactionId }),
  selectTerritory: (selectedTerritoryId) => set({ selectedTerritoryId }),

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
      logs: [`Added ${base.name}.`, ...state.logs].slice(0, 120)
    }));
  },

  deleteSelectedObject: () => {
    const id = get().selectedObjectId;
    if (!id) return;

    set((state) => ({
      objects: state.objects.filter((object) => object.id !== id),
      selectedObjectId: null,
      logs: ["Deleted selected object.", ...state.logs].slice(0, 120)
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
      ].slice(0, 120)
    })),

  setFactionColor: (factionId, color) =>
    set((state) => ({
      factions: state.factions.map((faction) =>
        faction.id === factionId ? { ...faction, color } : faction
      )
    })),

  setRelation: (aId, bId, relation) => {
    if (!aId || !bId || aId === bId) return;

    set((state) => {
      const a = state.factions.find((faction) => faction.id === aId);
      const b = state.factions.find((faction) => faction.id === bId);
      if (!a || !b) return state;

      let npcs = state.npcs;
      if (relation === "war") {
        npcs = ensureSquad(npcs, a, state.catalog, 8);
        npcs = ensureSquad(npcs, b, state.catalog, 8);
      }

      const allianceName =
        relation === "allied"
          ? choose(
              state.catalog.allianceNames,
              "United Alliance",
              ((a.name.length + b.name.length) * 0.137) % 1
            )
          : null;

      return {
        factions: state.factions.map((faction) => {
          if (faction.id === aId) {
            return {
              ...faction,
              allianceName: relation === "allied" ? allianceName : faction.allianceName,
              relations: { ...faction.relations, [bId]: relation }
            };
          }
          if (faction.id === bId) {
            return {
              ...faction,
              allianceName: relation === "allied" ? allianceName : faction.allianceName,
              relations: { ...faction.relations, [aId]: relation }
            };
          }
          return faction;
        }),
        npcs,
        logs: [
          `${a.name} ${relationLabel(relation)} ${b.name}${allianceName ? ` as the ${allianceName}` : ""}.`,
          ...state.logs
        ].slice(0, 120)
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
      logs: [`${kingName} spawned at ${faction.capital ?? faction.name}.`, ...state.logs].slice(0, 120)
    }));
  },

  beginTerritoryDraw: () =>
    set((state) => ({
      tool: "territory",
      territoryDraft: [],
      selectedTerritoryId: null,
      logs: ["Territory drawing started. Click points on the globe, then Finish Territory.", ...state.logs].slice(0, 120)
    })),

  addTerritoryPoint: (point) =>
    set((state) => ({
      territoryDraft: [...state.territoryDraft, point].slice(0, 120)
    })),

  undoTerritoryPoint: () =>
    set((state) => ({
      territoryDraft: state.territoryDraft.slice(0, -1)
    })),

  cancelTerritoryDraw: () =>
    set({
      territoryDraft: [],
      tool: "select"
    }),

  finishTerritory: (name) => {
    const state = get();
    if (state.territoryDraft.length < 3) return;

    const id = makeId("territory");
    const selectedFaction = state.factions.find(
      (faction) => faction.id === state.selectedFactionId
    );
    const generatedName = choose(
      state.catalog.territoryNames,
      `Territory ${state.territories.length + 1}`,
      ((state.territories.length + 1) * 0.319) % 1
    );

    const territory: TerritoryPatch = {
      id,
      name: name?.trim() || generatedName,
      parentFactionId: selectedFaction?.id ?? null,
      ownerFactionId: selectedFaction?.id ?? null,
      color: selectedFaction?.accentColor ?? seededColor(id),
      points: state.territoryDraft,
      createdAt: Date.now(),
      genericName: !name?.trim()
    };

    const territories = [...state.territories, territory];
    const progress = questProgress(state.quests, state.factions, territories);

    set({
      territories,
      selectedTerritoryId: id,
      territoryDraft: [],
      tool: "select",
      quests: progress.quests,
      logs: [
        `Created territory ${territory.name}${selectedFaction ? ` from ${selectedFaction.name}` : ""}.`,
        ...progress.newlyCompleted.map((title) => `Quest completed: ${title}.`),
        ...state.logs
      ].slice(0, 120)
    });
  },

  renameTerritory: (id, name) =>
    set((state) => ({
      territories: state.territories.map((territory) =>
        territory.id === id
          ? { ...territory, name: name.trim() || territory.name, genericName: false }
          : territory
      )
    })),

  recolorTerritory: (id, color) =>
    set((state) => ({
      territories: state.territories.map((territory) =>
        territory.id === id ? { ...territory, color } : territory
      )
    })),

  deleteTerritory: (id) =>
    set((state) => ({
      territories: state.territories.filter((territory) => territory.id !== id),
      selectedTerritoryId:
        state.selectedTerritoryId === id ? null : state.selectedTerritoryId
    })),

  simulateTick: () =>
    set((state) => {
      let npcs = state.npcs.map((npc) => ({
        ...npc,
        traits: [...npc.traits],
        stats: { ...npc.stats }
      }));

      const nextFactions = state.factions.map((faction) => ({
        ...faction,
        relations: { ...faction.relations },
        treasury: faction.treasury + 2,
        army: Math.min(250, faction.army + (faction.controlledBy ? 0 : 0.12))
      }));

      const byId = new Map(nextFactions.map((faction) => [faction.id, faction]));
      const warEvents: string[] = [];
      const processed = new Set<string>();

      for (const faction of nextFactions) {
        const warTargetId = Object.entries(faction.relations).find(([, relation]) => relation === "war")?.[0];
        if (!warTargetId) continue;
        npcs = ensureSquad(npcs, faction, state.catalog, 8);
      }

      const mutableNpcs = npcs.map((npc) => ({ ...npc, stats: { ...npc.stats } }));

      for (const npc of mutableNpcs) {
        if (npc.state === "dead") continue;

        const faction = byId.get(npc.factionId);
        if (!faction) continue;

        const targetFactionId = Object.entries(faction.relations).find(
          ([, relation]) => relation === "war"
        )?.[0];

        if (!targetFactionId) {
          npc.state = "idle";
          npc.targetFactionId = null;
          continue;
        }

        const targetFaction = byId.get(targetFactionId);
        if (!targetFaction) continue;

        npc.targetFactionId = targetFactionId;
        const target: LatLon = [targetFaction.lat, targetFaction.lon];
        const current: LatLon = [npc.lat, npc.lon];
        const distance = angleDistance(current, target);

        if (distance > 4.5) {
          const step = 0.22 + npc.stats.speed * 0.008;
          const [lat, lon] = moveToward(current, target, step);
          npc.lat = lat;
          npc.lon = lon;
          npc.state = "marching";
          continue;
        }

        npc.state = "fighting";
        const enemy = mutableNpcs.find(
          (candidate) =>
            candidate.factionId === targetFactionId &&
            candidate.state !== "dead" &&
            angleDistance([candidate.lat, candidate.lon], [npc.lat, npc.lon]) < 8
        );

        if (!enemy) continue;

        const luck = 0.82 + Math.random() * (0.36 + npc.stats.luck / 400);
        const rawDamage = npc.attack * luck - enemy.defense * 0.25;
        const damage = Math.max(1, rawDamage);
        enemy.hp -= damage;

        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.state = "dead";
          npc.kills += 1;
          warEvents.push(`${npc.name} defeated ${enemy.name} near ${targetFaction.name}.`);
        }
      }

      for (const attacker of nextFactions) {
        for (const [targetId, relation] of Object.entries(attacker.relations)) {
          if (relation !== "war") continue;

          const key = [attacker.id, targetId].sort().join(":");
          if (processed.has(key)) continue;
          processed.add(key);

          const defender = byId.get(targetId);
          if (!defender) continue;

          const attackerUnits = mutableNpcs.filter(
            (npc) => npc.factionId === attacker.id && npc.state !== "dead"
          );
          const defenderUnits = mutableNpcs.filter(
            (npc) => npc.factionId === defender.id && npc.state !== "dead"
          );

          const attackerDiscipline =
            attackerUnits.reduce((sum, npc) => sum + npc.stats.discipline, 0) /
            Math.max(1, attackerUnits.length);
          const defenderDiscipline =
            defenderUnits.reduce((sum, npc) => sum + npc.stats.discipline, 0) /
            Math.max(1, defenderUnits.length);

          const attackRoll =
            attacker.army *
            (0.035 + Math.random() * 0.035) *
            (0.75 + attackerDiscipline / 150);
          const defenseRoll =
            defender.army *
            (0.035 + Math.random() * 0.035) *
            (0.75 + defenderDiscipline / 150);

          attacker.army = Math.max(0, attacker.army - defenseRoll * 0.42);
          defender.army = Math.max(0, defender.army - attackRoll * 0.5);
          attacker.treasury = Math.max(0, attacker.treasury - 3);
          defender.treasury = Math.max(0, defender.treasury - 3);

          const attackerAlive = attackerUnits.length;
          const defenderAlive = defenderUnits.length;

          if (
            (defender.army <= 1 || defenderAlive === 0) &&
            attacker.army > defender.army &&
            attackerAlive > 0
          ) {
            defender.controlledBy = attacker.controlledBy ?? attacker.id;
            defender.stability = 30;
            defender.army = 12;
            defender.relations[attacker.id] = "neutral";
            attacker.relations[defender.id] = "neutral";
            warEvents.push(`${attacker.name} conquered ${defender.name}.`);
          } else if (
            (attacker.army <= 1 || attackerAlive === 0) &&
            defender.army > attacker.army &&
            defenderAlive > 0
          ) {
            attacker.controlledBy = defender.controlledBy ?? defender.id;
            attacker.stability = 30;
            attacker.army = 12;
            attacker.relations[defender.id] = "neutral";
            defender.relations[attacker.id] = "neutral";
            warEvents.push(`${defender.name} conquered ${attacker.name}.`);
          }
        }
      }

      const progress = questProgress(state.quests, nextFactions, state.territories);

      return {
        factions: nextFactions,
        npcs: mutableNpcs,
        quests: progress.quests,
        tick: state.tick + 1,
        logs: [
          ...warEvents,
          ...progress.newlyCompleted.map((title) => `Quest completed: ${title}.`),
          ...state.logs
        ].slice(0, 120)
      };
    }),

  exportWorld: () => {
    const state = get();

    return {
      version: 2,
      worldName: state.worldName,
      worldMode: state.worldMode,
      seed: state.seed,
      objects: state.objects,
      factions: state.factions,
      territories: state.territories,
      npcs: state.npcs,
      quests: state.quests,
      logs: state.logs,
      tick: state.tick
    };
  },

  importWorld: (incoming, source = "World synchronized.") => {
    const snapshot = upgradeSnapshot(incoming);

    set((state) => ({
      worldName: snapshot.worldName,
      worldMode: snapshot.worldMode,
      seed: snapshot.seed,
      objects: snapshot.objects,
      factions: snapshot.factions,
      territories: snapshot.territories,
      territoryDraft: [],
      selectedTerritoryId: null,
      npcs: snapshot.npcs,
      quests: snapshot.quests,
      logs: [source, ...snapshot.logs].slice(0, 120),
      tick: snapshot.tick,
      selectedObjectId: null,
      selectedFactionId:
        state.selectedFactionId &&
        snapshot.factions.some((faction) => faction.id === state.selectedFactionId)
          ? state.selectedFactionId
          : snapshot.factions[0]?.id ?? null
    }));
  },

  saveLocal: () => {
    const snapshot = get().exportWorld();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

    set((current) => ({
      logs: ["World saved in this browser.", ...current.logs].slice(0, 120)
    }));
  },

  loadLocal: () => {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("globe-map-conquest-world-v1");

    if (!raw) return false;

    try {
      const snapshot = JSON.parse(raw) as SavedWorld | LegacySavedWorldV1;
      get().importWorld(snapshot, "Saved world loaded.");
      set({ playMode: false });
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
      territories: [],
      territoryDraft: [],
      selectedTerritoryId: null,
      npcs: [],
      quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
      selectedObjectId: null,
      selectedFactionId: "USA",
      logs: ["World reset."],
      tick: 0
    })
}));
