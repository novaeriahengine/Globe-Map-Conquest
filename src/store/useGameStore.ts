import { create } from "zustand";
import { DEFAULT_CATALOG, DEFAULT_QUESTS } from "../data/catalogDefaults";
import { createInitialFactions } from "../game/countries";
import { latLonToXYZ, seededColor } from "../game/geo";
import type {
  CivilizationRecord,
  ConflictScenario,
  EditorTool,
  Era,
  Faction,
  FlagPresetId,
  LatLon,
  LegacySavedWorldV1,
  NameCatalog,
  NationEffect,
  NationEffectKind,
  NationFocus,
  NpcUnit,
  ObjectKind,
  Quest,
  Relation,
  SavedWorld,
  SceneObject,
  TerritoryPatch,
  TraitStats,
  Vec3,
  ViewMode,
  WorkspaceMode,
  WorldMode
} from "../game/types";

interface GameStore {
  worldName: string;
  worldMode: WorldMode;
  viewMode: ViewMode;
  supportedFactionId: string | null;
  workspaceMode: WorkspaceMode;
  era: Era;
  conflictScenario: ConflictScenario;
  populationSeed: number;
  seed: number;
  playMode: boolean;
  tool: EditorTool;
  objects: SceneObject[];
  factions: Faction[];
  civilizations: CivilizationRecord[];
  territories: TerritoryPatch[];
  territoryDraft: LatLon[];
  selectedTerritoryId: string | null;
  npcs: NpcUnit[];
  quests: Quest[];
  catalog: NameCatalog;
  selectedObjectId: string | null;
  selectedFactionId: string | null;
  selectedSubdivisionId: string | null;
  logs: string[];
  tick: number;

  setWorldName: (name: string) => void;
  setWorldMode: (mode: WorldMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setEra: (era: Era) => void;
  setConflictScenario: (scenario: ConflictScenario) => void;
  supportFaction: (factionId: string | null) => void;
  applyNationEffect: (factionId: string, kind: NationEffectKind) => void;
  clearNationEffects: (factionId: string) => void;
  setNationFocus: (factionId: string, focus: NationFocus) => void;
  setIntegrationPolicy: (
    factionId: string,
    policy: "local" | "balanced" | "settler"
  ) => void;
  seedPopulation: (factionId: string, count: number) => void;
  adjustNation: (
    factionId: string,
    field: "army" | "treasury" | "stability",
    amount: number
  ) => void;
  createWorld: (mode: WorldMode, name?: string) => void;
  setSeed: (seed: number) => void;
  randomizeSeed: () => void;
  setPlayMode: (value: boolean) => void;
  setTool: (tool: EditorTool) => void;
  setCatalog: (catalog: NameCatalog) => void;
  selectObject: (id: string | null) => void;
  selectFaction: (id: string | null) => void;
  selectSubdivision: (id: string | null) => void;
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
  promoteTerritoryToFaction: (id: string, name?: string) => void;
  startWorldWar: () => void;
  startConflictScenario: (scenario: ConflictScenario) => void;
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

function makeNationEffect(kind: NationEffectKind): NationEffect {
  const configs: Record<
    NationEffectKind,
    Omit<NationEffect, "id" | "kind">
  > = {
    "military-aid": {
      label: "Military Aid",
      attackMultiplier: 1.28,
      defenseMultiplier: 1.14,
      incomeMultiplier: 1,
      moraleModifier: 8,
      remainingTicks: 45,
      positive: true
    },
    "economic-aid": {
      label: "Economic Aid",
      attackMultiplier: 1,
      defenseMultiplier: 1,
      incomeMultiplier: 2,
      moraleModifier: 4,
      remainingTicks: 60,
      positive: true
    },
    "morale-boost": {
      label: "Morale Boost",
      attackMultiplier: 1.1,
      defenseMultiplier: 1.1,
      incomeMultiplier: 1,
      moraleModifier: 18,
      remainingTicks: 50,
      positive: true
    },
    sanctions: {
      label: "Sanctions",
      attackMultiplier: 0.94,
      defenseMultiplier: 0.96,
      incomeMultiplier: 0.48,
      moraleModifier: -10,
      remainingTicks: 55,
      positive: false
    },
    "combat-fatigue": {
      label: "Combat Fatigue",
      attackMultiplier: 0.72,
      defenseMultiplier: 0.88,
      incomeMultiplier: 1,
      moraleModifier: -14,
      remainingTicks: 40,
      positive: false
    },
    unrest: {
      label: "Unrest",
      attackMultiplier: 0.9,
      defenseMultiplier: 0.72,
      incomeMultiplier: 0.8,
      moraleModifier: -22,
      remainingTicks: 45,
      positive: false
    }
  };

  return {
    id: makeId("effect"),
    kind,
    ...configs[kind]
  };
}

function nationModifiers(faction: Faction) {
  return (faction.effects ?? []).reduce(
    (result, effect) => ({
      attack: result.attack * effect.attackMultiplier,
      defense: result.defense * effect.defenseMultiplier,
      income: result.income * effect.incomeMultiplier,
      morale: result.morale + effect.moraleModifier
    }),
    { attack: 1, defense: 1, income: 1, morale: 0 }
  );
}

function choose<T>(items: T[], fallback: T, seed = Math.random()) {
  if (!items.length) return fallback;
  const index = Math.abs(Math.floor(seed * items.length)) % items.length;
  return items[index] ?? fallback;
}


function civilizationAdjective(name: string) {
  if (name.endsWith("y")) return `${name.slice(0, -1)}ian`;
  if (name.endsWith("a")) return `${name}n`;
  if (name.endsWith("land")) return `${name.slice(0, -4)}ish`;
  return `${name}ian`;
}

function civilizationsFromFactions(
  factions: Faction[],
  tick = 0
): CivilizationRecord[] {
  const seen = new Set<string>();
  const records: CivilizationRecord[] = [];

  for (const faction of factions) {
    const id = faction.civilizationId || `civ-${faction.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    records.push({
      id,
      name: faction.name,
      adjective: civilizationAdjective(faction.name),
      foundingTick: tick,
      extinctionTick: faction.controlledBy ? tick : null,
      homeland: [faction.lat, faction.lon],
      color: faction.color,
      flagPresetId: faction.flagPresetId,
      legacyNames: [faction.name],
      revivalCount: faction.revivalCount ?? 0,
      history: [`${faction.name} civilization entered recorded history at tick ${tick}.`]
    });
  }

  return records;
}

function normalizeFactionCivilization(faction: Faction): Faction {
  const activeArmy =
    faction.army < 1_000 ? Math.round(faction.army * 1_000) : faction.army;
  const population =
    faction.population ??
    Math.max(100_000, Math.round(activeArmy * 180 + faction.treasury * 90));

  return {
    ...faction,
    army: activeArmy,
    effects: faction.effects ?? [],
    civilizationId: faction.civilizationId || `civ-${faction.id}`,
    occupationStartedTick: faction.occupationStartedTick ?? null,
    revivalCount: faction.revivalCount ?? 0,
    focus: faction.focus ?? "balanced",
    integrationPolicy: faction.integrationPolicy ?? "balanced",
    population,
    cityCount: faction.cityCount ?? Math.max(2, Math.round(population / 2_500_000)),
    townCount: faction.townCount ?? Math.max(8, Math.round(population / 220_000)),
    integrationProgress: faction.integrationProgress ?? 55,
    military:
      faction.military ?? {
        army: activeArmy,
        navy: Math.round(activeArmy * 0.11),
        airForce: Math.round(activeArmy * 0.08),
        reserves: Math.round(activeArmy * 1.7),
        doctrine: "balanced"
      }
  };
}

function eraSettings(era: Era) {
  switch (era) {
    case "ancient":
      return {
        movement: 0.28,
        battleRate: 0.0018,
        diplomacyRate: 0.65,
        navalPower: 0.35,
        airPower: 0,
        birthEvery: 30
      };
    case "medieval":
      return {
        movement: 0.36,
        battleRate: 0.0024,
        diplomacyRate: 0.72,
        navalPower: 0.5,
        airPower: 0,
        birthEvery: 28
      };
    case "industrial":
      return {
        movement: 0.62,
        battleRate: 0.0035,
        diplomacyRate: 0.85,
        navalPower: 0.82,
        airPower: 0.28,
        birthEvery: 24
      };
    case "future":
      return {
        movement: 1.28,
        battleRate: 0.0062,
        diplomacyRate: 1.1,
        navalPower: 1.15,
        airPower: 1.35,
        birthEvery: 18
      };
    case "modern":
    default:
      return {
        movement: 1,
        battleRate: 0.0048,
        diplomacyRate: 1,
        navalPower: 1,
        airPower: 1,
        birthEvery: 20
      };
  }
}

function deterministicRoll(seed: string, tick: number) {
  let hash = 2166136261 ^ tick;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

function geographicDistance(a: Faction, b: Faction) {
  return angleDistance([a.lat, a.lon], [b.lat, b.lon]);
}

function nearestNations(
  origin: Faction,
  factions: Faction[],
  limit = 8
) {
  return factions
    .filter(
      (candidate) =>
        candidate.id !== origin.id &&
        !candidate.controlledBy
    )
    .sort(
      (a, b) =>
        geographicDistance(origin, a) - geographicDistance(origin, b)
    )
    .slice(0, limit);
}

function focusLabel(focus: NationFocus) {
  const labels: Record<NationFocus, string> = {
    balanced: "Balanced Development",
    military: "Military Expansion",
    economy: "Economic Growth",
    integration: "Territorial Integration",
    cities: "Cities & Infrastructure",
    diplomacy: "Diplomacy",
    naval: "Naval Power"
  };
  return labels[focus];
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

  const sex = ordinal % 2 === 0 ? "female" : "male";
  const adultAge = 18 + Math.round(((seed * 97) % 1) * 24);

  return {
    id: makeId("npc"),
    factionId: faction.id,
    civilizationId: faction.civilizationId,
    loyalty: Math.max(35, Math.min(100, 55 + Math.round(stats.courage * 0.25 + stats.discipline * 0.2))),
    name: `${first} ${last}`,
    species: choose(catalog.species, "Human", (seed * 7.03 + 0.12) % 1),
    traits,
    nationality: faction.name,
    tags: [
      faction.name,
      civilizationAdjective(faction.name),
      ordinal < 2 ? "Founder" : "Citizen"
    ],
    sex,
    birthTick: -adultAge * 12,
    generation: 0,
    parentIds: [],
    partnerId: null,
    childIds: [],
    populationWeight: 1,
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

function npcAgeYears(npc: NpcUnit, tick: number) {
  return Math.max(0, Math.floor((tick - (npc.birthTick ?? -18 * 12)) / 12));
}

function makeChildNpc(
  mother: NpcUnit,
  father: NpcUnit,
  faction: Faction,
  catalog: NameCatalog,
  tick: number
): NpcUnit {
  const ordinal = Math.abs(
    Math.round(
      deterministicRoll(`${mother.id}:${father.id}`, tick) * 100_000
    )
  );
  const child = makeNpc(faction, catalog, ordinal);
  const motherLast = mother.name.split(" ").slice(-1)[0] || faction.name;
  const first = choose(
    catalog.npcFirstNames,
    "Child",
    deterministicRoll(mother.id + father.id, tick)
  );
  child.name = `${first} ${motherLast}`;
  child.birthTick = tick;
  child.generation = Math.max(mother.generation ?? 0, father.generation ?? 0) + 1;
  child.parentIds = [mother.id, father.id];
  child.partnerId = null;
  child.childIds = [];
  child.tags = [
    faction.name,
    civilizationAdjective(faction.name),
    "Born Citizen",
    `Generation ${child.generation}`
  ];
  child.nationality = faction.name;
  child.sex = ordinal % 2 === 0 ? "female" : "male";
  child.populationWeight = 1;
  child.lat = mother.lat;
  child.lon = mother.lon;
  child.attack *= 0.35;
  child.defense *= 0.35;
  child.state = "idle";

  return child;
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
  if (snapshot.version === 2) {
    const factions = snapshot.factions.map(normalizeFactionCivilization);
    const civilizations =
      snapshot.civilizations?.length
        ? snapshot.civilizations
        : civilizationsFromFactions(factions, snapshot.tick);

    return {
      ...snapshot,
      viewMode: snapshot.viewMode ?? "map2d",
      supportedFactionId: snapshot.supportedFactionId ?? null,
      workspaceMode: snapshot.workspaceMode ?? "play",
      era: snapshot.era ?? "modern",
      conflictScenario: snapshot.conflictScenario ?? "organic",
      populationSeed: snapshot.populationSeed ?? 100,
      factions,
      civilizations,
      npcs: snapshot.npcs.map((npc, index) => {
        const faction = factions.find((item) => item.id === npc.factionId);
        return {
          ...npc,
          civilizationId:
            npc.civilizationId ?? faction?.civilizationId ?? `civ-${npc.factionId}`,
          loyalty: npc.loyalty ?? 70,
          nationality: npc.nationality ?? faction?.name ?? "Unknown",
          tags: npc.tags ?? [faction?.name ?? "Citizen"],
          sex: npc.sex ?? (index % 2 === 0 ? "female" : "male"),
          birthTick: npc.birthTick ?? snapshot.tick - (18 + (index % 24)) * 12,
          generation: npc.generation ?? 0,
          parentIds: npc.parentIds ?? [],
          partnerId: npc.partnerId ?? null,
          childIds: npc.childIds ?? [],
          populationWeight: npc.populationWeight ?? 1
        };
      })
    };
  }

  const factions = snapshot.factions.map((faction) =>
    normalizeFactionCivilization({
      ...faction,
      accentColor: seededColor(faction.id + "-accent"),
      effects: [],
      civilizationId: `civ-${faction.id}`
    } as Faction)
  );

  return {
    version: 2,
    worldName: snapshot.worldName,
    worldMode: snapshot.worldMode,
    viewMode: "map2d",
    supportedFactionId: null,
    workspaceMode: "play",
    era: "modern",
    conflictScenario: "organic",
    populationSeed: 100,
    seed: snapshot.seed,
    objects: snapshot.objects,
    factions,
    civilizations: civilizationsFromFactions(factions, snapshot.tick),
    territories: [],
    npcs: [],
    quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
    logs: snapshot.logs,
    tick: snapshot.tick
  };
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialFactions = createInitialFactions();
  return {
  worldName: "New Globe World",
  worldMode: "earth",
  viewMode: "map2d",
  supportedFactionId: null,
  workspaceMode: "play",
  era: "modern",
  conflictScenario: "organic",
  populationSeed: 100,
  seed: 48271,
  playMode: false,
  tool: "select",
  objects: [],
  factions: initialFactions,
  civilizations: civilizationsFromFactions(initialFactions),
  territories: [],
  territoryDraft: [],
  selectedTerritoryId: null,
  npcs: [],
  quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
  catalog: DEFAULT_CATALOG,
  selectedObjectId: null,
  selectedFactionId: "USA",
  selectedSubdivisionId: null,
  logs: ["World initialized. Select a country or draw a territory to begin."],
  tick: 0,

  setWorldName: (worldName) => set({ worldName }),

  setWorldMode: (worldMode) =>
    set((state) => ({
      worldMode,
      logs: [`World mode changed to ${worldMode}.`, ...state.logs].slice(0, 120)
    })),

  setViewMode: (viewMode) =>
    set((state) => ({
      viewMode,
      tool: state.tool === "territory" ? "territory" : "select",
      logs: [
        viewMode === "map2d" ? "Switched to 2D battle map." : "Switched to 3D globe.",
        ...state.logs
      ].slice(0, 120)
    })),

  setWorkspaceMode: (workspaceMode) =>
    set((state) => ({
      workspaceMode,
      logs: [`Workspace changed to ${workspaceMode} mode.`, ...state.logs].slice(0, 120)
    })),

  setEra: (era) =>
    set((state) => ({
      era,
      logs: [`World era changed to ${era}.`, ...state.logs].slice(0, 120)
    })),

  setConflictScenario: (conflictScenario) =>
    set({ conflictScenario }),

  supportFaction: (supportedFactionId) =>
    set((state) => ({
      supportedFactionId,
      selectedFactionId: supportedFactionId ?? state.selectedFactionId,
      logs: [
        supportedFactionId
          ? `You are now supporting ${state.factions.find((faction) => faction.id === supportedFactionId)?.name ?? "this nation"}.`
          : "Nation support cleared.",
        ...state.logs
      ].slice(0, 120)
    })),

  applyNationEffect: (factionId, kind) =>
    set((state) => {
      const target = state.factions.find((faction) => faction.id === factionId);
      if (!target) return state;
      const effect = makeNationEffect(kind);
      return {
        factions: state.factions.map((faction) =>
          faction.id === factionId
            ? { ...faction, effects: [...(faction.effects ?? []), effect].slice(-8) }
            : faction
        ),
        logs: [
          `${effect.positive ? "Buff" : "Debuff"} applied to ${target.name}: ${effect.label}.`,
          ...state.logs
        ].slice(0, 120)
      };
    }),

  clearNationEffects: (factionId) =>
    set((state) => ({
      factions: state.factions.map((faction) =>
        faction.id === factionId ? { ...faction, effects: [] } : faction
      )
    })),

  setNationFocus: (factionId, focus) =>
    set((state) => ({
      factions: state.factions.map((faction) =>
        faction.id === factionId ? { ...faction, focus } : faction
      ),
      logs: [
        `${state.factions.find((faction) => faction.id === factionId)?.name ?? "Nation"} is now prioritizing ${focusLabel(focus)}.`,
        ...state.logs
      ].slice(0, 120)
    })),

  setIntegrationPolicy: (factionId, integrationPolicy) =>
    set((state) => ({
      factions: state.factions.map((faction) =>
        faction.id === factionId
          ? { ...faction, integrationPolicy }
          : faction
      )
    })),

  seedPopulation: (factionId, rawCount) =>
    set((state) => {
      const faction = state.factions.find((item) => item.id === factionId);
      if (!faction) return state;

      const count = Math.max(2, Math.min(10_000, Math.round(rawCount)));
      const trackedCount = Math.min(count, 240);
      const founders: NpcUnit[] = [];

      for (let index = 0; index < trackedCount; index += 1) {
        const npc = makeNpc(faction, state.catalog, index);
        npc.populationWeight = count / trackedCount;
        npc.tags = Array.from(new Set([...(npc.tags ?? []), "Founding Population"]));
        founders.push(npc);
      }

      const activeArmy = Math.max(0, Math.round(count * 0.025));

      return {
        populationSeed: count,
        npcs: [
          ...state.npcs.filter((npc) => npc.factionId !== factionId),
          ...founders
        ],
        factions: state.factions.map((item) =>
          item.id === factionId
            ? {
                ...item,
                population: count,
                army: activeArmy,
                military: {
                  ...(item.military ?? {
                    army: activeArmy,
                    navy: 0,
                    airForce: 0,
                    reserves: 0,
                    doctrine: "balanced"
                  }),
                  army: activeArmy,
                  reserves: Math.max(activeArmy, Math.round(count * 0.06))
                }
              }
            : item
        ),
        logs: [
          `Seeded ${faction.name} with ${count.toLocaleString()} simulated people represented by ${trackedCount} tracked founder NPCs.`,
          ...state.logs
        ].slice(0, 120)
      };
    }),

  adjustNation: (factionId, field, amount) =>
    set((state) => ({
      factions: state.factions.map((faction) => {
        if (faction.id !== factionId) return faction;
        if (field === "army") {
          const army = Math.max(0, Math.min(5_000_000, faction.army + amount));
          return {
            ...faction,
            army,
            military: faction.military
              ? { ...faction.military, army }
              : faction.military
          };
        }
        if (field === "treasury") {
          return {
            ...faction,
            treasury: Math.max(0, faction.treasury + amount)
          };
        }
        return {
          ...faction,
          stability: Math.max(0, Math.min(100, faction.stability + amount))
        };
      })
    })),

  createWorld: (worldMode, name) => {
    const factions = createInitialFactions();
    set({
      worldName:
        name ??
        (worldMode === "earth"
          ? "World Map"
          : worldMode === "sandbox"
            ? "WorldBox Sandbox"
            : "Procedural Planet"),
      worldMode,
      viewMode: "map2d",
      supportedFactionId: null,
      workspaceMode: "play",
      era: "modern",
      conflictScenario: "organic",
      populationSeed: 100,
      seed: Math.floor(Math.random() * 999_999_999),
      playMode: false,
      tool: "select",
      objects: [],
      factions,
      civilizations: civilizationsFromFactions(factions),
      territories: [],
      territoryDraft: [],
      selectedTerritoryId: null,
      npcs: [],
      quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
      selectedObjectId: null,
      selectedFactionId: "USA",
      selectedSubdivisionId: null,
      logs: [`Created ${worldMode} world in 2D battle mode.`],
      tick: 0
    });
  },

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
  selectFaction: (selectedFactionId) =>
    set({ selectedFactionId, selectedSubdivisionId: null }),
  selectSubdivision: (selectedSubdivisionId) => set({ selectedSubdivisionId }),
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

  promoteTerritoryToFaction: (id, name) =>
    set((state) => {
      const territory = state.territories.find((item) => item.id === id);
      if (!territory || territory.points.length < 3) return state;

      const nationName =
        name?.trim() ||
        choose(
          state.catalog.countryNames,
          `New Nation ${state.factions.length + 1}`,
          ((state.factions.length + state.territories.length) * 0.217) % 1
        );

      const factionId = makeId("nation");
      const lat =
        territory.points.reduce((sum, point) => sum + point[0], 0) /
        territory.points.length;
      const lon =
        territory.points.reduce((sum, point) => sum + point[1], 0) /
        territory.points.length;

      const civilizationId = makeId("civ");
      const faction: Faction = {
        id: factionId,
        name: nationName,
        cca2: "--",
        cca3: "NEW",
        emoji: "🏳️",
        capital: territory.name,
        lat,
        lon,
        color: territory.color,
        accentColor: seededColor(factionId + "-accent"),
        army: 42,
        treasury: 420,
        stability: 72,
        controlledBy: null,
        rulerName: null,
        flagPresetId: "sunrise",
        allianceName: null,
        relations: {},
        effects: [],
        civilizationId,
        occupationStartedTick: null,
        revivalCount: 0
      };

      const civilization: CivilizationRecord = {
        id: civilizationId,
        name: nationName,
        adjective: civilizationAdjective(nationName),
        foundingTick: state.tick,
        extinctionTick: null,
        homeland: [lat, lon],
        color: territory.color,
        flagPresetId: "sunrise",
        legacyNames: [nationName],
        revivalCount: 0,
        history: [`${nationName} was founded from ${territory.name} at tick ${state.tick}.`]
      };

      return {
        factions: [...state.factions, faction],
        civilizations: [...state.civilizations, civilization],
        territories: state.territories.map((item) =>
          item.id === id
            ? { ...item, ownerFactionId: factionId, name: territory.name }
            : item
        ),
        selectedFactionId: factionId,
        logs: [
          `${nationName} declared independence from ${state.factions.find((item) => item.id === territory.parentFactionId)?.name ?? "its parent territory"}.`,
          ...state.logs
        ].slice(0, 120)
      };
    }),

  startWorldWar: () =>
    set((state) => {
      const candidates = [...state.factions]
        .filter((faction) => !faction.controlledBy)
        .sort((a, b) => b.army + b.treasury * 0.03 - (a.army + a.treasury * 0.03))
        .slice(0, 40);

      if (candidates.length < 2) return state;

      const teamA = candidates.filter((_, index) => index % 2 === 0);
      const teamB = candidates.filter((_, index) => index % 2 === 1);
      const teamAIds = new Set(teamA.map((faction) => faction.id));
      const teamBIds = new Set(teamB.map((faction) => faction.id));

      let npcs = state.npcs;
      for (const faction of candidates) {
        npcs = ensureSquad(npcs, faction, state.catalog, 6);
      }

      const factions = state.factions.map((faction) => {
        if (!teamAIds.has(faction.id) && !teamBIds.has(faction.id)) return faction;

        const enemies = teamAIds.has(faction.id) ? teamB : teamA;
        const allies = teamAIds.has(faction.id) ? teamA : teamB;
        const relations = { ...faction.relations };

        for (const enemy of enemies) {
          relations[enemy.id] = "war";
        }
        for (const ally of allies) {
          if (ally.id !== faction.id) relations[ally.id] = "allied";
        }

        return {
          ...faction,
          allianceName: teamAIds.has(faction.id)
            ? "Blue World Coalition"
            : "Golden World Coalition",
          relations
        };
      });

      return {
        factions,
        npcs,
        playMode: true,
        logs: [
          `World War started: ${teamA.length} nations vs ${teamB.length} nations.`,
          ...state.logs
        ].slice(0, 120)
      };
    }),

  simulateTick: () =>
    set((state) => {
      let npcs = state.npcs.map((npc) => ({
        ...npc,
        traits: [...npc.traits],
        stats: { ...npc.stats }
      }));
      let civilizations = state.civilizations.map((civilization) => ({
        ...civilization,
        legacyNames: [...civilization.legacyNames],
        history: [...civilization.history]
      }));

      const nextFactions = state.factions.map((faction) => {
        const modifiers = nationModifiers(faction);
        const effects = (faction.effects ?? [])
          .map((effect) => ({
            ...effect,
            remainingTicks: effect.remainingTicks - 1
          }))
          .filter((effect) => effect.remainingTicks > 0);

        return {
          ...faction,
          effects,
          relations: { ...faction.relations },
          treasury: faction.treasury + 2 * modifiers.income,
          stability: Math.max(
            0,
            Math.min(100, faction.stability + modifiers.morale * 0.015)
          ),
          army: Math.min(
            500,
            faction.army +
              (faction.controlledBy
                ? 0
                : 0.12 * Math.max(0.35, 1 + modifiers.morale / 100))
          )
        };
      });

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
        const attackerMods = nationModifiers(faction);
        const enemyFaction = byId.get(enemy.factionId);
        const defenderMods = enemyFaction
          ? nationModifiers(enemyFaction)
          : { attack: 1, defense: 1, income: 1, morale: 0 };
        const rawDamage =
          npc.attack * attackerMods.attack * luck -
          enemy.defense * defenderMods.defense * 0.25;
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

          const attackerMods = nationModifiers(attacker);
          const defenderMods = nationModifiers(defender);

          const attackRoll =
            attacker.army *
            attackerMods.attack *
            (0.035 + Math.random() * 0.035) *
            (0.75 + attackerDiscipline / 150);
          const defenseRoll =
            defender.army *
            defenderMods.defense *
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
            defender.occupationStartedTick = state.tick + 1;
            defender.stability = 30;
            defender.army = 12;
            defender.relations[attacker.id] = "neutral";
            attacker.relations[defender.id] = "neutral";
            civilizations = civilizations.map((civilization) =>
              civilization.id === defender.civilizationId
                ? {
                    ...civilization,
                    extinctionTick: state.tick + 1,
                    history: [
                      ...civilization.history,
                      `${defender.name} lost sovereignty to ${attacker.name} at tick ${state.tick + 1}; its people retained their ${civilization.adjective} identity.`
                    ].slice(-160)
                  }
                : civilization
            );
            warEvents.push(
              `${attacker.name} conquered ${defender.name}. The ${civilizations.find((item) => item.id === defender.civilizationId)?.adjective ?? defender.name} civilization survived the fall.`
            );
          } else if (
            (attacker.army <= 1 || attackerAlive === 0) &&
            defender.army > attacker.army &&
            defenderAlive > 0
          ) {
            attacker.controlledBy = defender.controlledBy ?? defender.id;
            attacker.occupationStartedTick = state.tick + 1;
            attacker.stability = 30;
            attacker.army = 12;
            attacker.relations[defender.id] = "neutral";
            defender.relations[attacker.id] = "neutral";
            civilizations = civilizations.map((civilization) =>
              civilization.id === attacker.civilizationId
                ? {
                    ...civilization,
                    extinctionTick: state.tick + 1,
                    history: [
                      ...civilization.history,
                      `${attacker.name} lost sovereignty to ${defender.name} at tick ${state.tick + 1}; its identity continued through civilians and descendants.`
                    ].slice(-160)
                  }
                : civilization
            );
            warEvents.push(
              `${defender.name} conquered ${attacker.name}, but its old civilization remains alive.`
            );
          }
        }
      }

      const nextTick = state.tick + 1;
      const revivalEvents: string[] = [];
      const nextTerritories = [...state.territories];

      // Occupation does not erase a people. Loyal civilians keep their civilization
      // identity and can eventually restore the old country.
      for (const occupied of nextFactions) {
        if (!occupied.controlledBy || occupied.occupationStartedTick == null) continue;

        const loyalPeople = mutableNpcs.filter(
          (npc) =>
            npc.state !== "dead" &&
            npc.civilizationId === occupied.civilizationId &&
            npc.loyalty >= 58
        );

        for (const person of loyalPeople) {
          person.loyalty = Math.min(100, person.loyalty + 0.08);
        }

        const elapsed = nextTick - occupied.occupationStartedTick;
        const resistance =
          loyalPeople.reduce((sum, npc) => sum + npc.loyalty, 0) /
            Math.max(1, loyalPeople.length) +
          loyalPeople.length * 4 +
          (100 - occupied.stability) * 0.35;

        const clock =
          (nextTick +
            occupied.id.length * 11 +
            (occupied.id.charCodeAt(0) || 0)) %
          47;

        if (elapsed >= 70 && loyalPeople.length >= 2 && resistance >= 82 && clock === 0) {
          const controllerId = occupied.controlledBy;
          const controller = byId.get(controllerId);
          occupied.controlledBy = null;
          occupied.occupationStartedTick = null;
          occupied.revivalCount = (occupied.revivalCount ?? 0) + 1;
          occupied.army = Math.max(34, loyalPeople.length * 7);
          occupied.stability = 58;
          occupied.relations[controllerId] = "war";
          if (controller) controller.relations[occupied.id] = "war";

          civilizations = civilizations.map((civilization) =>
            civilization.id === occupied.civilizationId
              ? {
                  ...civilization,
                  extinctionTick: null,
                  revivalCount: civilization.revivalCount + 1,
                  history: [
                    ...civilization.history,
                    `${occupied.name} restored its homeland at tick ${nextTick} after ${elapsed} ticks of occupation.`
                  ].slice(-160)
                }
              : civilization
          );

          revivalEvents.push(
            `${occupied.name} returned after ${elapsed} ticks under foreign rule. Loyal civilians rebuilt the state.`
          );
        }
      }

      // If the homeland stays occupied for generations, a civilization may found a
      // successor state somewhere else without losing its old historical identity.
      const successorFactions: Faction[] = [];
      for (const civilization of civilizations) {
        const activeState = nextFactions.some(
          (faction) =>
            faction.civilizationId === civilization.id && !faction.controlledBy
        );
        if (activeState) continue;

        const occupiedStates = nextFactions.filter(
          (faction) =>
            faction.civilizationId === civilization.id && Boolean(faction.controlledBy)
        );
        if (!occupiedStates.length) continue;

        const oldestOccupation = Math.min(
          ...occupiedStates.map((faction) => faction.occupationStartedTick ?? nextTick)
        );
        const elapsed = nextTick - oldestOccupation;
        const diasporaClock =
          (nextTick + civilization.name.length * 13) % 131;

        if (elapsed < 180 || diasporaClock !== 0) continue;

        const survivors = mutableNpcs
          .filter(
            (npc) =>
              npc.state !== "dead" &&
              npc.civilizationId === civilization.id &&
              npc.loyalty >= 62
          )
          .sort((a, b) => b.loyalty - a.loyalty);

        const anchor = survivors[0];
        const direction = civilization.revivalCount % 2 === 0 ? 1 : -1;
        const lat = Math.max(
          -72,
          Math.min(72, (anchor?.lat ?? civilization.homeland[0]) + 10 * direction)
        );
        const lon =
          (((anchor?.lon ?? civilization.homeland[1]) +
            18 +
            civilization.revivalCount * 7 +
            540) %
            360) -
          180;

        const factionId = makeId("successor");
        const successorName =
          civilization.revivalCount % 2 === 0
            ? `New ${civilization.name}`
            : civilization.name;

        const successor: Faction = {
          id: factionId,
          name: successorName,
          cca2: "--",
          cca3: "NEW",
          emoji: "🏳️",
          capital: `${successorName} Settlement`,
          lat,
          lon,
          color: civilization.color,
          accentColor: seededColor(factionId + "-accent"),
          army: Math.max(28, survivors.length * 6),
          treasury: 320,
          stability: 64,
          controlledBy: null,
          rulerName: null,
          flagPresetId: civilization.flagPresetId,
          allianceName: null,
          relations: {},
          effects: [],
          civilizationId: civilization.id,
          occupationStartedTick: null,
          revivalCount: civilization.revivalCount + 1
        };

        successorFactions.push(successor);

        const territoryId = makeId("diaspora");
        nextTerritories.push({
          id: territoryId,
          name: `${successorName} Territory`,
          parentFactionId: occupiedStates[0]?.id ?? null,
          ownerFactionId: factionId,
          color: civilization.color,
          points: [
            [lat - 3.5, lon - 4.5],
            [lat - 3.5, lon + 4.5],
            [lat + 3.5, lon + 4.5],
            [lat + 3.5, lon - 4.5]
          ],
          createdAt: Date.now(),
          genericName: false
        });

        for (const person of survivors.slice(0, Math.max(2, Math.min(5, survivors.length)))) {
          person.factionId = factionId;
          person.lat = lat + (Math.random() - 0.5) * 1.5;
          person.lon = lon + (Math.random() - 0.5) * 1.5;
          person.state = "idle";
          person.targetFactionId = null;
        }

        civilizations = civilizations.map((item) =>
          item.id === civilization.id
            ? {
                ...item,
                extinctionTick: null,
                revivalCount: item.revivalCount + 1,
                legacyNames: Array.from(
                  new Set([...item.legacyNames, successorName])
                ).slice(-20),
                history: [
                  ...item.history,
                  `${successorName} was founded in a new land at tick ${nextTick}, continuing the older ${item.adjective} civilization.`
                ].slice(-160)
              }
            : item
        );

        revivalEvents.push(
          `${successorName} was founded in a new land by descendants of ${civilization.name}.`
        );
      }

      if (successorFactions.length) {
        nextFactions.push(...successorFactions);
        for (const successor of successorFactions) {
          npcs = ensureSquad(mutableNpcs, successor, state.catalog, 5);
          for (const npc of npcs) {
            if (!mutableNpcs.some((existing) => existing.id === npc.id)) {
              mutableNpcs.push(npc);
            }
          }
        }
      }

      const progress = questProgress(state.quests, nextFactions, nextTerritories);

      return {
        factions: nextFactions,
        civilizations,
        territories: nextTerritories,
        npcs: mutableNpcs,
        quests: progress.quests,
        tick: state.tick + 1,
        logs: [
          ...revivalEvents,
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
      viewMode: state.viewMode,
      supportedFactionId: state.supportedFactionId,
      seed: state.seed,
      objects: state.objects,
      factions: state.factions,
      civilizations: state.civilizations,
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
      viewMode: snapshot.viewMode ?? "map2d",
      supportedFactionId: snapshot.supportedFactionId ?? null,
      seed: snapshot.seed,
      objects: snapshot.objects,
      factions: snapshot.factions,
      civilizations: snapshot.civilizations,
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
          : snapshot.factions[0]?.id ?? null,
      selectedSubdivisionId: null
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

  resetWorld: () => {
    const factions = createInitialFactions();
    set({
      worldName: "New Globe World",
      worldMode: "earth",
      viewMode: "map2d",
      supportedFactionId: null,
      seed: 48271,
      playMode: false,
      tool: "select",
      objects: [],
      factions,
      civilizations: civilizationsFromFactions(factions),
      territories: [],
      territoryDraft: [],
      selectedTerritoryId: null,
      npcs: [],
      quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
      selectedObjectId: null,
      selectedFactionId: "USA",
      selectedSubdivisionId: null,
      logs: ["World reset in 2D battle mode."],
      tick: 0
    });
  }
  };
});
