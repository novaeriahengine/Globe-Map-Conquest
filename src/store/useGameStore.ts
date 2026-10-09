import { create } from "zustand";
import { DEFAULT_CATALOG, DEFAULT_QUESTS } from "../data/catalogDefaults";
import { createInitialFactions } from "../game/countries";
import { latLonToXYZ, seededColor } from "../game/geo";
import type {
  ActiveWar,
  CivilizationRecord,
  ConflictScenario,
  DiplomaticIncident,
  DiplomaticMemory,
  EditorTool,
  Era,
  Faction,
  FlagPresetId,
  Garrison,
  GarrisonBranch,
  LatLon,
  LegacySavedWorldV1,
  NameCatalog,
  NationEffect,
  NationEffectKind,
  NationFocus,
  NpcUnit,
  IncidentType,
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
  playerFactionId: string | null;
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
  garrisons: Garrison[];
  quests: Quest[];
  incidents: DiplomaticIncident[];
  wars: ActiveWar[];
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
  setPlayerFaction: (factionId: string | null) => void;
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
  seedPopulation: (
    factionId: string,
    count: number,
    territoryId?: string | null
  ) => void;
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
  provokeConflict: (aId: string, bId: string) => void;
  createNationAt: (
    point: LatLon,
    size: number,
    name?: string,
    color?: string
  ) => void;
  createGarrison: (
    factionId: string,
    branch: GarrisonBranch,
    size: number
  ) => void;
  orderGarrison: (
    garrisonId: string,
    order: "hold" | "move" | "attack" | "support",
    targetFactionId?: string | null
  ) => void;
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
    diplomacy: faction.diplomacy ?? {},
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

function ensureDiplomaticMemory(
  faction: Faction,
  otherId: string
): DiplomaticMemory {
  if (!faction.diplomacy) faction.diplomacy = {};
  const existing = faction.diplomacy[otherId];
  if (existing) return existing;

  const memory: DiplomaticMemory = {
    tension: 12,
    trust: 45,
    lastIncidentTick: null,
    lastWarTick: null
  };
  faction.diplomacy[otherId] = memory;
  return memory;
}

function pairTension(a: Faction, b: Faction) {
  const aMemory = ensureDiplomaticMemory(a, b.id);
  const bMemory = ensureDiplomaticMemory(b, a.id);
  return (aMemory.tension + bMemory.tension) / 2;
}

function changePairDiplomacy(
  a: Faction,
  b: Faction,
  tensionDelta: number,
  trustDelta: number,
  tick: number,
  markIncident = false
) {
  const aMemory = ensureDiplomaticMemory(a, b.id);
  const bMemory = ensureDiplomaticMemory(b, a.id);

  for (const memory of [aMemory, bMemory]) {
    memory.tension = Math.max(0, Math.min(100, memory.tension + tensionDelta));
    memory.trust = Math.max(0, Math.min(100, memory.trust + trustDelta));
    if (markIncident) memory.lastIncidentTick = tick;
  }
}

function incidentDetails(
  type: IncidentType,
  actor: Faction,
  target: Faction
) {
  const templates: Record<
    IncidentType,
    { title: string; description: string; severity: number; tensionDelta: number }
  > = {
    "border-clash": {
      title: `Border clash between ${actor.name} and ${target.name}`,
      description: `Patrols from ${actor.name} and ${target.name} exchanged fire in a disputed border zone. Both governments blamed the other side and began moving troops toward the frontier.`,
      severity: 58,
      tensionDelta: 24
    },
    assassination: {
      title: `${target.name} blames ${actor.name} for an assassination`,
      description: `A senior ${target.name} official was assassinated. Intelligence leaks pointed toward agents connected to ${actor.name}, triggering public outrage and emergency security talks.`,
      severity: 86,
      tensionDelta: 38
    },
    "naval-incident": {
      title: `Naval incident involving ${actor.name} and ${target.name}`,
      description: `Warships from ${actor.name} and ${target.name} collided during a tense interception. Casualties and conflicting claims turned the encounter into an international crisis.`,
      severity: 72,
      tensionDelta: 31
    },
    embargo: {
      title: `${actor.name} imposes an embargo on ${target.name}`,
      description: `${actor.name} cut strategic trade with ${target.name}, accusing it of hostile economic pressure. ${target.name} called the embargo an act of aggression.`,
      severity: 46,
      tensionDelta: 19
    },
    "territorial-claim": {
      title: `${actor.name} renews a claim against ${target.name}`,
      description: `${actor.name} formally claimed territory administered by ${target.name}. Demonstrations, military exercises and competing maps pushed the dispute into a dangerous new phase.`,
      severity: 63,
      tensionDelta: 27
    },
    "alliance-crisis": {
      title: `Alliance crisis draws in ${actor.name} and ${target.name}`,
      description: `A confrontation involving treaty partners forced ${actor.name} and ${target.name} to choose sides. Emergency summits began while both blocs prepared contingency plans.`,
      severity: 76,
      tensionDelta: 32
    },
    ultimatum: {
      title: `${actor.name} issues an ultimatum to ${target.name}`,
      description: `${actor.name} demanded concessions from ${target.name} under threat of military action. ${target.name} rejected the deadline and ordered partial mobilization.`,
      severity: 82,
      tensionDelta: 36
    },
    "rebellion-support": {
      title: `${target.name} accuses ${actor.name} of backing rebels`,
      description: `${target.name} presented evidence that weapons and money from ${actor.name} were reaching insurgents inside its territory. Diplomatic relations rapidly deteriorated.`,
      severity: 68,
      tensionDelta: 29
    }
  };

  return templates[type];
}

function chooseIncidentType(
  actor: Faction,
  target: Faction,
  tick: number,
  worldWar = false
): IncidentType {
  if (worldWar) {
    const major: IncidentType[] = [
      "assassination",
      "naval-incident",
      "alliance-crisis",
      "ultimatum"
    ];
    const index = Math.floor(
      deterministicRoll(`${actor.id}:${target.id}:world-cause`, tick) *
        major.length
    );
    return major[index] ?? "alliance-crisis";
  }

  const nearby: IncidentType[] = [
    "border-clash",
    "territorial-claim",
    "embargo",
    "rebellion-support",
    "naval-incident"
  ];
  const index = Math.floor(
    deterministicRoll(`${actor.id}:${target.id}:incident`, tick) *
      nearby.length
  );
  return nearby[index] ?? "border-clash";
}

function createIncident(
  actor: Faction,
  target: Faction,
  tick: number,
  type: IncidentType
): DiplomaticIncident {
  const details = incidentDetails(type, actor, target);
  return {
    id: makeId("incident"),
    type,
    title: details.title,
    description: details.description,
    actorId: actor.id,
    targetId: target.id,
    createdTick: tick,
    severity: details.severity,
    tensionDelta: details.tensionDelta,
    resolved: false
  };
}

function warNameFromIncident(
  incident: DiplomaticIncident,
  actor: Faction,
  target: Faction,
  worldWar = false
) {
  if (worldWar) {
    return incident.type === "assassination"
      ? "The Assassination Crisis"
      : incident.type === "naval-incident"
        ? "The Ocean Crisis"
        : incident.type === "ultimatum"
          ? "The Great Ultimatum War"
          : "The Alliance Crisis War";
  }

  return `${actor.name}–${target.name} War`;
}


function proceduralLandValue(lat: number, lon: number, seed: number) {
  return (
    Math.sin((lon + seed * 0.01) * 0.075) +
    Math.cos((lat - seed * 0.008) * 0.11) +
    Math.sin((lon + lat) * 0.19 + seed * 0.003) * 0.55
  );
}

function createProceduralFactions(
  seed: number,
  catalog: NameCatalog,
  count: number
): Faction[] {
  const positions: LatLon[] = [];
  let attempt = 0;

  while (positions.length < count && attempt < count * 80) {
    const t = ((attempt + 1) * 0.61803398875 + (seed % 997) / 997) % 1;
    const u = ((attempt + 1) * 0.41421356237 + (seed % 577) / 577) % 1;
    const lat = -62 + t * 124;
    const lon = -178 + u * 356;
    const terrain = proceduralLandValue(lat, lon, seed);
    const separated = positions.every(
      (point) => angleDistance(point, [lat, lon]) > 15
    );

    if (terrain > -0.08 && terrain < 1.25 && separated) {
      positions.push([lat, lon]);
    }
    attempt += 1;
  }

  while (positions.length < count) {
    const index = positions.length;
    positions.push([
      -45 + ((index * 37 + seed) % 90),
      -170 + ((index * 71 + seed) % 340)
    ]);
  }

  return positions.map(([lat, lon], index) => {
    const name = choose(
      catalog.countryNames,
      `Kingdom ${index + 1}`,
      ((index + 1) * 0.193 + (seed % 101) / 101) % 1
    );
    const id = `PROC-${index + 1}-${Math.abs(seed % 9999)}`;
    const population = 100;
    const army = 12;

    return {
      id,
      name,
      cca2: "--",
      cca3: `P${String(index + 1).padStart(2, "0")}`,
      emoji: "🏳️",
      capital: `${name} Camp`,
      lat,
      lon,
      color: seededColor(id),
      accentColor: seededColor(id + "-accent"),
      army,
      treasury: 800,
      stability: 72,
      controlledBy: null,
      rulerName: null,
      flagPresetId: index % 2 === 0 ? "sunrise" : "forest-band",
      allianceName: null,
      relations: {},
      effects: [],
      civilizationId: `civ-${id}`,
      occupationStartedTick: null,
      revivalCount: 0,
      focus: "balanced",
      integrationPolicy: "balanced",
      population,
      cityCount: 1,
      townCount: 1,
      integrationProgress: 45,
      diplomacy: {},
      military: {
        army,
        navy: 0,
        airForce: 0,
        reserves: 20,
        doctrine: "balanced"
      }
    } as Faction;
  });
}

function createProceduralTerritories(
  factions: Faction[],
  seed: number
): TerritoryPatch[] {
  return factions.map((faction, factionIndex) => {
    const points: LatLon[] = [];
    const vertices = 10;

    for (let index = 0; index < vertices; index += 1) {
      const angle = (index / vertices) * Math.PI * 2;
      const baseRadius = 7 + ((factionIndex * 17 + index * 7 + seed) % 5);
      const testLat = faction.lat + Math.sin(angle) * baseRadius;
      const lonScale = Math.max(0.35, Math.cos((faction.lat * Math.PI) / 180));
      const testLon = faction.lon + (Math.cos(angle) * baseRadius) / lonScale;
      const terrain = proceduralLandValue(testLat, testLon, seed);
      const boundaryPressure =
        terrain > 1.0 ? 0.48 : terrain < -0.08 ? 0.38 : 1;

      points.push([
        faction.lat + Math.sin(angle) * baseRadius * boundaryPressure,
        ((faction.lon +
          (Math.cos(angle) * baseRadius * boundaryPressure) / lonScale +
          540) %
          360) -
          180
      ]);
    }

    return {
      id: `region-${faction.id}`,
      name: `${faction.name} Homeland`,
      parentFactionId: faction.id,
      ownerFactionId: faction.id,
      color: faction.color,
      points,
      createdAt: Date.now() + factionIndex,
      genericName: false
    };
  });
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

function createInitialGarrisons(factions: Faction[]): Garrison[] {
  const result: Garrison[] = [];

  for (const faction of factions) {
    const military = faction.military;
    if (!military) continue;

    const entries: Array<[GarrisonBranch, number, number, number]> = [
      ["land", military.army, 0, 0],
      ["sea", military.navy, -2.4, 2.4],
      ["air", military.airForce, 1.8, -1.8]
    ];

    for (const [branch, size, dLat, dLon] of entries) {
      if (size <= 0) continue;
      result.push({
        id: makeId("garrison"),
        factionId: faction.id,
        name:
          branch === "land"
            ? `${faction.name} Field Army`
            : branch === "sea"
              ? `${faction.name} Fleet`
              : `${faction.name} Air Wing`,
        branch,
        size,
        lat: faction.lat + dLat,
        lon: faction.lon + dLon,
        homeLat: faction.lat + dLat,
        homeLon: faction.lon + dLon,
        order: "hold",
        targetFactionId: null,
        targetLat: null,
        targetLon: null,
        readiness: 82
      });
    }
  }

  return result;
}

function moveGarrisonToward(
  garrison: Garrison,
  lat: number,
  lon: number,
  speed: number
) {
  const [nextLat, nextLon] = moveToward(
    [garrison.lat, garrison.lon],
    [lat, lon],
    speed
  );
  garrison.lat = nextLat;
  garrison.lon = nextLon;
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
    incidents: [],
    wars: [],
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
  incidents: [],
  wars: [],
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

  seedPopulation: (factionId, rawCount, territoryId = null) =>
    set((state) => {
      const faction = state.factions.find((item) => item.id === factionId);
      if (!faction) return state;

      const territory = territoryId
        ? state.territories.find((item) => item.id === territoryId)
        : null;
      const spawnPoint: LatLon =
        territory && territory.points.length
          ? [
              territory.points.reduce((sum, point) => sum + point[0], 0) /
                territory.points.length,
              territory.points.reduce((sum, point) => sum + point[1], 0) /
                territory.points.length
            ]
          : [faction.lat, faction.lon];

      const count = Math.max(2, Math.min(10_000, Math.round(rawCount)));
      const trackedCount = Math.min(count, 240);
      const founders: NpcUnit[] = [];

      for (let index = 0; index < trackedCount; index += 1) {
        const npc = makeNpc(faction, state.catalog, index);
        npc.populationWeight = count / trackedCount;
        npc.lat = spawnPoint[0] + ((index % 7) - 3) * 0.08;
        npc.lon = spawnPoint[1] + ((Math.floor(index / 7) % 7) - 3) * 0.08;
        npc.tags = Array.from(
          new Set([
            ...(npc.tags ?? []),
            "Founding Population",
            territory?.name ?? faction.capital ?? faction.name
          ])
        );
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
          `Seeded ${faction.name} with ${count.toLocaleString()} simulated people at ${territory?.name ?? faction.capital ?? faction.name}, represented by ${trackedCount} tracked founder NPCs.`,
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
    const worldSeed = Math.floor(Math.random() * 999_999_999);
    const catalog = get().catalog;
    const factions =
      worldMode === "earth"
        ? createInitialFactions()
        : createProceduralFactions(
            worldSeed,
            catalog,
            worldMode === "sandbox" ? 18 : 12
          );
    const territories =
      worldMode === "earth"
        ? []
        : createProceduralTerritories(factions, worldSeed);
    const initialNpcs =
      worldMode === "earth"
        ? []
        : factions.flatMap((faction) => {
            const founders = [
              makeNpc(faction, catalog, 0),
              makeNpc(faction, catalog, 1)
            ];
            founders.forEach((npc) => {
              npc.populationWeight = (faction.population ?? 100) / founders.length;
              npc.tags = Array.from(
                new Set([...(npc.tags ?? []), "Original Founder"])
              );
            });
            return founders;
          });

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
      era: worldMode === "earth" ? "modern" : "medieval",
      conflictScenario: "organic",
      populationSeed: 100,
      seed: worldSeed,
      playMode: false,
      tool: "select",
      objects: [],
      factions,
      civilizations: civilizationsFromFactions(factions),
      territories,
      territoryDraft: [],
      selectedTerritoryId: null,
      npcs: initialNpcs,
      quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
      incidents: [],
      wars: [],
      selectedObjectId: null,
      selectedFactionId: factions[0]?.id ?? null,
      selectedSubdivisionId: null,
      logs: [
        worldMode === "earth"
          ? "Created Earth world in 2D battle mode."
          : `Created ${worldMode} world with ${factions.length} terrain-shaped starting civilizations and founder families.`
      ],
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
      const factions = state.factions.map((faction) => ({
        ...normalizeFactionCivilization(faction),
        relations: { ...faction.relations },
        diplomacy: { ...(faction.diplomacy ?? {}) }
      }));
      const a = factions.find((faction) => faction.id === aId);
      const b = factions.find((faction) => faction.id === bId);
      if (!a || !b) return state;

      const allianceName =
        relation === "allied"
          ? choose(
              state.catalog.allianceNames,
              "United Alliance",
              ((a.name.length + b.name.length) * 0.137) % 1
            )
          : null;

      a.relations[b.id] = relation;
      b.relations[a.id] = relation;

      if (relation === "allied") {
        a.allianceName = a.allianceName ?? allianceName;
        b.allianceName = b.allianceName ?? allianceName;
        changePairDiplomacy(a, b, -18, 22, state.tick);
      } else if (relation === "neutral") {
        changePairDiplomacy(a, b, -26, 6, state.tick);
      } else {
        changePairDiplomacy(a, b, 35, -30, state.tick);
        const aMemory = ensureDiplomaticMemory(a, b.id);
        const bMemory = ensureDiplomaticMemory(b, a.id);
        aMemory.lastWarTick = state.tick;
        bMemory.lastWarTick = state.tick;
      }

      return {
        factions,
        logs: [
          `${a.name} ${relationLabel(relation)} ${b.name}${allianceName ? ` as the ${allianceName}` : ""}.`,
          ...state.logs
        ].slice(0, 120)
      };
    });
  },

  provokeConflict: (aId, bId) => {
    if (!aId || !bId || aId === bId) return;

    set((state) => {
      const factions = state.factions.map((faction) => ({
        ...normalizeFactionCivilization(faction),
        relations: { ...faction.relations },
        diplomacy: { ...(faction.diplomacy ?? {}) }
      }));
      const a = factions.find((faction) => faction.id === aId);
      const b = factions.find((faction) => faction.id === bId);
      if (!a || !b) return state;

      const existingWar = state.wars.some(
        (war) =>
          war.status !== "ended" &&
          ((war.attackerIds.includes(a.id) && war.defenderIds.includes(b.id)) ||
            (war.attackerIds.includes(b.id) && war.defenderIds.includes(a.id)))
      );
      if (existingWar) return state;

      const type = chooseIncidentType(a, b, state.tick);
      const incident = createIncident(a, b, state.tick, type);
      changePairDiplomacy(
        a,
        b,
        incident.tensionDelta,
        -Math.round(incident.tensionDelta * 0.72),
        state.tick,
        true
      );

      const startsTick = state.tick + 8;
      const war: ActiveWar = {
        id: makeId("war"),
        name: warNameFromIncident(incident, a, b),
        status: "mobilizing",
        createdTick: state.tick,
        startsTick,
        causeIncidentId: incident.id,
        primaryAttackerId: a.id,
        primaryDefenderId: b.id,
        attackerIds: [a.id],
        defenderIds: [b.id],
        attackerAllianceName: a.allianceName ?? null,
        defenderAllianceName: b.allianceName ?? null
      };

      return {
        factions,
        incidents: [...state.incidents, incident].slice(-120),
        wars: [...state.wars, war].slice(-40),
        playMode: true,
        logs: [
          `CRISIS: ${incident.title}. ${a.name} and ${b.name} are mobilizing. If diplomacy fails, war begins at tick ${startsTick}.`,
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
        revivalCount: 0,
        focus: "balanced",
        integrationPolicy: "balanced",
        population: 180_000,
        cityCount: 1,
        townCount: 8,
        integrationProgress: 50,
        military: {
          army: 42_000,
          navy: 3_500,
          airForce: state.era === "modern" || state.era === "future" ? 2_400 : 0,
          reserves: 75_000,
          doctrine: "balanced"
        }
      };
      faction.army = faction.military!.army;

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

  startWorldWar: () => get().startConflictScenario("world-war"),

  startConflictScenario: (scenario) =>
    set((state) => {
      if (scenario === "organic") {
        return {
          conflictScenario: "organic",
          playMode: true,
          logs: [
            "Organic diplomacy enabled. Nations will negotiate, ally, break alliances and occasionally start wars on their own.",
            ...state.logs
          ].slice(0, 120)
        };
      }

      const factions = state.factions.map((faction) => ({
        ...faction,
        relations: { ...faction.relations }
      }));
      const active = factions
        .filter((faction) => !faction.controlledBy)
        .sort(
          (a, b) =>
            b.army + b.treasury * 0.08 - (a.army + a.treasury * 0.08)
        );

      if (active.length < 2) return state;

      const byId = new Map(factions.map((faction) => [faction.id, faction]));
      const setPair = (aId: string, bId: string, relation: Relation) => {
        const a = byId.get(aId);
        const b = byId.get(bId);
        if (!a || !b || aId === bId) return;
        a.relations[bId] = relation;
        b.relations[aId] = relation;
      };

      const selected =
        active.find((faction) => faction.id === state.selectedFactionId) ??
        active[0];

      let npcs = state.npcs;
      const participants = new Set<string>();
      const events: string[] = [];

      if (scenario === "regional-war") {
        const rivals = nearestNations(selected, active, 10).filter(
          (candidate) => selected.relations[candidate.id] !== "allied"
        );
        const rival = rivals[0] ?? active.find((item) => item.id !== selected.id);
        if (!rival) return state;

        setPair(selected.id, rival.id, "war");
        participants.add(selected.id);
        participants.add(rival.id);

        const selectedAllies = nearestNations(selected, active, 14)
          .filter((candidate) => selected.relations[candidate.id] === "allied")
          .slice(0, 2);
        const rivalAllies = nearestNations(rival, active, 14)
          .filter((candidate) => rival.relations[candidate.id] === "allied")
          .slice(0, 2);

        for (const ally of selectedAllies) {
          setPair(ally.id, selected.id, "allied");
          setPair(ally.id, rival.id, "war");
          participants.add(ally.id);
        }
        for (const ally of rivalAllies) {
          setPair(ally.id, rival.id, "allied");
          setPair(ally.id, selected.id, "war");
          participants.add(ally.id);
        }

        events.push(
          `Regional war began between ${selected.name} and ${rival.name}. Existing nearby allies may be pulled in, but the rest of the world remains outside the conflict.`
        );
      } else {
        const anchorA = active[0];
        const anchorB =
          active
            .slice(1)
            .filter((candidate) => geographicDistance(anchorA, candidate) > 35)
            .sort(
              (a, b) =>
                b.army + b.treasury * 0.08 - (a.army + a.treasury * 0.08)
            )[0] ?? active[1];

        const chooseCoalition = (
          anchor: Faction,
          opposingAnchor: Faction
        ) => {
          const existingAllies = nearestNations(anchor, active, 24)
            .filter((candidate) => anchor.relations[candidate.id] === "allied")
            .slice(0, 3);
          const nearbyPartners = nearestNations(anchor, active, 12)
            .filter(
              (candidate) =>
                candidate.id !== opposingAnchor.id &&
                !existingAllies.some((ally) => ally.id === candidate.id)
            )
            .slice(0, 2);

          return [anchor, ...existingAllies, ...nearbyPartners].filter(
            (item, index, list) =>
              list.findIndex((candidate) => candidate.id === item.id) === index
          );
        };

        const teamA = chooseCoalition(anchorA, anchorB);
        const teamAIds = new Set(teamA.map((item) => item.id));
        const teamB = chooseCoalition(anchorB, anchorA).filter(
          (item) => !teamAIds.has(item.id)
        );

        const allianceA = choose(
          state.catalog.allianceNames,
          "Northern Coalition",
          0.27
        );
        const allianceB = choose(
          state.catalog.allianceNames,
          "Southern Coalition",
          0.73
        );

        for (const member of teamA) {
          member.allianceName = allianceA;
          participants.add(member.id);
          for (const ally of teamA) {
            if (member.id !== ally.id) setPair(member.id, ally.id, "allied");
          }
        }
        for (const member of teamB) {
          member.allianceName = allianceB;
          participants.add(member.id);
          for (const ally of teamB) {
            if (member.id !== ally.id) setPair(member.id, ally.id, "allied");
          }
        }

        for (const member of teamA) {
          const target = [...teamB].sort(
            (a, b) =>
              geographicDistance(member, a) - geographicDistance(member, b)
          )[0];
          if (target) setPair(member.id, target.id, "war");
        }
        for (const member of teamB) {
          const target = [...teamA].sort(
            (a, b) =>
              geographicDistance(member, a) - geographicDistance(member, b)
          )[0];
          if (target) setPair(member.id, target.id, "war");
        }

        events.push(
          `World War began around ${anchorA.name} and ${anchorB.name}: ${teamA.length} nations in ${allianceA} and ${teamB.length} in ${allianceB}. Other nations can remain neutral or enter later through diplomacy.`
        );
      }

      for (const id of participants) {
        const faction = byId.get(id);
        if (faction) npcs = ensureSquad(npcs, faction, state.catalog, 10);
      }

      return {
        factions,
        npcs,
        conflictScenario: scenario,
        playMode: true,
        logs: [...events, ...state.logs].slice(0, 120)
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

      const nextTick = state.tick + 1;
      const eraConfig = eraSettings(state.era);
      const governanceEvents: string[] = [];
      const diplomacyEvents: string[] = [];
      const birthEvents: string[] = [];

      const nextFactions: Faction[] = state.factions.map((rawFaction) => {
        const faction = normalizeFactionCivilization(rawFaction);
        const modifiers = nationModifiers(faction);
        const effects = (faction.effects ?? [])
          .map((effect) => ({
            ...effect,
            remainingTicks: effect.remainingTicks - 1
          }))
          .filter((effect) => effect.remainingTicks > 0);

        const focus = faction.focus ?? "balanced";
        const population = Math.max(2, faction.population ?? 100_000);
        const focusIncome =
          focus === "economy" ? 1.75 : focus === "cities" ? 1.2 : 1;
        const baseIncome =
          Math.max(8, population / 750_000) *
          focusIncome *
          modifiers.income;

        const recruitmentRate =
          focus === "military"
            ? 0.000012
            : focus === "balanced"
              ? 0.000004
              : 0.0000018;
        const recruitment =
          faction.controlledBy
            ? 0
            : population *
              recruitmentRate *
              Math.max(0.5, 1 + modifiers.morale / 100);

        const military = {
          ...(faction.military ?? {
            army: faction.army,
            navy: Math.round(faction.army * 0.1),
            airForce: Math.round(faction.army * 0.07),
            reserves: Math.round(faction.army * 1.5),
            doctrine: "balanced" as const
          })
        };

        const army = Math.min(
          Math.max(5_000, population * 0.12),
          Math.max(0, faction.army + recruitment)
        );

        if (focus === "naval" && !faction.controlledBy) {
          military.navy = Math.min(
            Math.max(1_000, population * 0.02),
            military.navy + Math.max(8, population * 0.0000025)
          );
          military.doctrine = "naval";
        }
        if (focus === "military" && !faction.controlledBy) {
          military.reserves += Math.max(20, population * 0.000004);
          military.doctrine = "aggressive";
        }
        if (focus === "diplomacy") {
          military.doctrine =
            military.doctrine === "aggressive" ? "balanced" : military.doctrine;
        }

        military.army = army;

        let cityCount = faction.cityCount ?? 3;
        let townCount = faction.townCount ?? 12;
        let nextPopulation = population;

        if (focus === "cities" && nextTick % 24 === 0 && faction.treasury > 200) {
          cityCount += 1;
          townCount += 2;
          nextPopulation += Math.max(25, Math.round(population * 0.00008));
        } else if (!faction.controlledBy) {
          nextPopulation += Math.max(
            1,
            Math.round(population * (focus === "economy" ? 0.000035 : 0.00002))
          );
        }

        return {
          ...faction,
          effects,
          population: nextPopulation,
          cityCount,
          townCount,
          military,
          relations: { ...faction.relations },
          treasury: Math.max(0, faction.treasury + baseIncome),
          stability: Math.max(
            0,
            Math.min(
              100,
              faction.stability +
                modifiers.morale * 0.015 +
                (focus === "diplomacy" ? 0.025 : 0) +
                (focus === "cities" ? 0.02 : 0)
            )
          ),
          army
        };
      });

      // Territorial integration can deliberately move citizens into newly
      // conquered lands. This raises long-term control but costs population and
      // money in the homeland.
      for (const nation of nextFactions) {
        if (nation.controlledBy || nation.focus !== "integration") continue;
        const subjects = nextFactions.filter(
          (candidate) => candidate.controlledBy === nation.id
        );
        if (!subjects.length) continue;

        const policy = nation.integrationPolicy ?? "balanced";
        const policyRate =
          policy === "settler" ? 0.00006 : policy === "balanced" ? 0.00003 : 0.000012;

        for (const subject of subjects.slice(0, 3)) {
          const migrants = Math.max(
            20,
            Math.min(
              5_000,
              Math.round((nation.population ?? 100_000) * policyRate)
            )
          );
          nation.population = Math.max(2, (nation.population ?? 2) - migrants);
          subject.population = (subject.population ?? 2) + migrants;
          subject.integrationProgress = Math.min(
            100,
            (subject.integrationProgress ?? 25) +
              (policy === "settler" ? 0.5 : policy === "balanced" ? 0.28 : 0.12)
          );
          nation.treasury = Math.max(0, nation.treasury - migrants * 0.02);

          if (nextTick % 30 === 0) {
            subject.townCount = (subject.townCount ?? 0) + 1;
            if ((subject.integrationProgress ?? 0) > 70 && nextTick % 60 === 0) {
              subject.cityCount = (subject.cityCount ?? 0) + 1;
            }
            governanceEvents.push(
              `${nation.name} moved ${migrants.toLocaleString()} settlers into ${subject.name}; integration is now ${Math.round(subject.integrationProgress ?? 0)}%.`
            );
          }
        }
      }

      const byId = new Map(nextFactions.map((faction) => [faction.id, faction]));
      const warEvents: string[] = [];
      const processed = new Set<string>();

      // Organic diplomacy remains active even during larger scenarios. Only a
      // small number of relations change at once so the whole planet does not
      // instantly collapse into universal war.
      if (nextTick % 8 === 0) {
        const sovereign = nextFactions.filter((faction) => !faction.controlledBy);
        if (sovereign.length > 1) {
          const actor =
            sovereign[
              Math.abs(Math.floor(nextTick / 8 + state.seed)) % sovereign.length
            ];
          const nearby = nearestNations(actor, sovereign, 10);
          const target =
            nearby[
              Math.floor(
                deterministicRoll(actor.id + ":diplomacy", nextTick) *
                  Math.max(1, nearby.length)
              )
            ];

          if (target) {
            const relation = actor.relations[target.id] ?? "neutral";
            const roll = deterministicRoll(
              `${actor.id}:${target.id}:${state.conflictScenario}`,
              nextTick
            );
            const distance = geographicDistance(actor, target);
            const diplomacyBonus =
              actor.focus === "diplomacy" || target.focus === "diplomacy"
                ? 0.16
                : 0;
            const militaryPressure =
              actor.focus === "military" ? 0.1 : 0;
            const scenarioPressure =
              state.conflictScenario === "world-war"
                ? 0.12
                : state.conflictScenario === "regional-war"
                  ? 0.05
                  : 0;

            if (
              relation === "neutral" &&
              roll < 0.28 * eraConfig.diplomacyRate + diplomacyBonus
            ) {
              actor.relations[target.id] = "allied";
              target.relations[actor.id] = "allied";
              const allianceName = choose(
                state.catalog.allianceNames,
                "Mutual Defense Pact",
                roll
              );
              actor.allianceName = actor.allianceName ?? allianceName;
              target.allianceName = target.allianceName ?? allianceName;
              diplomacyEvents.push(
                `${actor.name} and ${target.name} formed the ${allianceName}.`
              );
            } else if (
              relation === "neutral" &&
              distance < 48 &&
              roll >
                0.91 -
                  militaryPressure -
                  scenarioPressure +
                  diplomacyBonus * 0.5
            ) {
              actor.relations[target.id] = "war";
              target.relations[actor.id] = "war";
              diplomacyEvents.push(
                `${actor.name} entered a new war with nearby ${target.name}.`
              );

              const supportingAlly = nearestNations(actor, sovereign, 16).find(
                (candidate) =>
                  candidate.relations[actor.id] === "allied" &&
                  candidate.id !== target.id &&
                  deterministicRoll(candidate.id + target.id, nextTick) > 0.45
              );
              if (supportingAlly) {
                supportingAlly.relations[target.id] = "war";
                target.relations[supportingAlly.id] = "war";
                diplomacyEvents.push(
                  `${supportingAlly.name} entered the war in support of ${actor.name}.`
                );
              }
            } else if (relation === "allied" && roll > 0.985) {
              actor.relations[target.id] = "neutral";
              target.relations[actor.id] = "neutral";
              diplomacyEvents.push(
                `${actor.name} and ${target.name} ended their alliance.`
              );
            } else if (relation === "war" && roll < 0.045 + diplomacyBonus) {
              actor.relations[target.id] = "neutral";
              target.relations[actor.id] = "neutral";
              diplomacyEvents.push(
                `${actor.name} and ${target.name} agreed to peace.`
              );
            }
          }
        }
      }

      for (const faction of nextFactions) {
        const warTargetId = Object.entries(faction.relations).find(([, relation]) => relation === "war")?.[0];
        if (!warTargetId) continue;
        npcs = ensureSquad(npcs, faction, state.catalog, 8);
      }

      const mutableNpcs: NpcUnit[] = npcs.map((npc) => ({
        ...npc,
        tags: [...(npc.tags ?? [])],
        parentIds: [...(npc.parentIds ?? [])],
        childIds: [...(npc.childIds ?? [])],
        stats: { ...npc.stats }
      }));

      // Family simulation uses tracked agents while large civilian populations stay
      // aggregated. This keeps a real ancestry graph without trying to render or
      // store millions of individual people in one world document.
      if (
        nextTick % eraConfig.birthEvery === 0 &&
        mutableNpcs.length < 600
      ) {
        const familyFactions = nextFactions
          .filter(
            (faction) =>
              mutableNpcs.filter(
                (npc) =>
                  npc.factionId === faction.id &&
                  npc.state !== "dead"
              ).length >= 2
          )
          .slice(0, 12);

        for (const faction of familyFactions) {
          const adults = mutableNpcs.filter(
            (npc) =>
              npc.factionId === faction.id &&
              npc.state !== "dead" &&
              npcAgeYears(npc, nextTick) >= 18 &&
              npcAgeYears(npc, nextTick) <= 46
          );
          const mother = adults.find((npc) => npc.sex === "female");
          const father = adults.find(
            (npc) => npc.sex === "male" && npc.id !== mother?.id
          );
          if (!mother || !father) continue;

          const birthRoll = deterministicRoll(
            `${mother.id}:${father.id}:birth`,
            nextTick
          );
          if (birthRoll > 0.64) continue;

          const child = makeChildNpc(
            mother,
            father,
            faction,
            state.catalog,
            nextTick
          );
          mutableNpcs.push(child);
          mother.partnerId = mother.partnerId ?? father.id;
          father.partnerId = father.partnerId ?? mother.id;
          mother.childIds = Array.from(
            new Set([...(mother.childIds ?? []), child.id])
          );
          father.childIds = Array.from(
            new Set([...(father.childIds ?? []), child.id])
          );
          faction.population = (faction.population ?? 2) + 1;

          birthEvents.push(
            `${child.name} was born in ${faction.name}, generation ${child.generation ?? 1}.`
          );
        }
      }

      for (const npc of mutableNpcs) {
        if (npc.state === "dead") continue;

        if (npcAgeYears(npc, nextTick) < 16) {
          npc.state = "idle";
          npc.targetFactionId = null;
          continue;
        }

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
          const military = faction.military;
          const expeditionPenalty =
            distance > 24 && (military?.navy ?? 0) < 2_500 ? 0.42 : 1;
          const terrainValue =
            state.worldMode === "earth"
              ? 0
              : proceduralLandValue(
                  (npc.lat + targetFaction.lat) / 2,
                  (npc.lon + targetFaction.lon) / 2,
                  state.seed
                );
          const terrainPenalty =
            state.worldMode === "earth"
              ? 1
              : terrainValue > 0.95
                ? 0.46
                : terrainValue < -0.08
                  ? (military?.navy ?? 0) > 500
                    ? 0.72
                    : 0.22
                  : 1;
          const step =
            (0.16 + npc.stats.speed * 0.006) *
            eraConfig.movement *
            expeditionPenalty *
            terrainPenalty;
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

          const frontDistance = geographicDistance(attacker, defender);
          const attackerMilitary = attacker.military ?? {
            army: attacker.army,
            navy: 0,
            airForce: 0,
            reserves: 0,
            doctrine: "balanced" as const
          };
          const defenderMilitary = defender.military ?? {
            army: defender.army,
            navy: 0,
            airForce: 0,
            reserves: 0,
            doctrine: "balanced" as const
          };

          const expedition =
            frontDistance > 20
              ? Math.max(
                  0.42,
                  Math.min(
                    1.18,
                    0.55 +
                      (attackerMilitary.navy /
                        Math.max(1, attacker.army)) *
                        3.5 *
                        eraConfig.navalPower
                  )
                )
              : 1;

          const defenderNaval =
            frontDistance > 20
              ? Math.max(
                  0.5,
                  Math.min(
                    1.15,
                    0.62 +
                      (defenderMilitary.navy /
                        Math.max(1, defender.army)) *
                        3 *
                        eraConfig.navalPower
                  )
                )
              : 1;

          const attackerAir =
            1 +
            Math.min(
              0.32,
              (attackerMilitary.airForce / Math.max(1, attacker.army)) *
                1.8 *
                eraConfig.airPower
            );
          const defenderAir =
            1 +
            Math.min(
              0.28,
              (defenderMilitary.airForce / Math.max(1, defender.army)) *
                1.6 *
                eraConfig.airPower
            );

          const attackerDoctrine =
            attackerMilitary.doctrine === "aggressive"
              ? 1.12
              : attackerMilitary.doctrine === "maneuver"
                ? 1.08
                : 1;
          const defenderDoctrine =
            defenderMilitary.doctrine === "defensive" ? 1.14 : 1;

          const attackRoll =
            attacker.army *
            attackerMods.attack *
            eraConfig.battleRate *
            (0.75 + Math.random() * 0.5) *
            (0.75 + attackerDiscipline / 150) *
            expedition *
            attackerAir *
            attackerDoctrine;
          const defenseRoll =
            defender.army *
            defenderMods.defense *
            eraConfig.battleRate *
            (0.75 + Math.random() * 0.5) *
            (0.75 + defenderDiscipline / 150) *
            defenderNaval *
            defenderAir *
            defenderDoctrine;

          const attackerLoss = defenseRoll * 0.55;
          const defenderLoss = attackRoll * 0.62;
          attacker.army = Math.max(0, attacker.army - attackerLoss);
          defender.army = Math.max(0, defender.army - defenderLoss);
          attacker.population = Math.max(
            2,
            (attacker.population ?? 2) - Math.round(attackerLoss * 0.08)
          );
          defender.population = Math.max(
            2,
            (defender.population ?? 2) - Math.round(defenderLoss * 0.1)
          );
          attacker.treasury = Math.max(
            0,
            attacker.treasury - Math.max(4, attackerLoss / 200)
          );
          defender.treasury = Math.max(
            0,
            defender.treasury - Math.max(4, defenderLoss / 200)
          );

          if (attacker.military) attacker.military.army = attacker.army;
          if (defender.military) defender.military.army = defender.army;

          const defenderCollapse = Math.max(
            600,
            (defender.population ?? 100_000) * 0.000035
          );
          const attackerCollapse = Math.max(
            600,
            (attacker.population ?? 100_000) * 0.000035
          );

          if (
            defender.army <= defenderCollapse &&
            attacker.army > defender.army * 1.25
          ) {
            defender.controlledBy = attacker.controlledBy ?? attacker.id;
            defender.occupationStartedTick = state.tick + 1;
            defender.stability = 30;
            defender.army = Math.max(800, defenderCollapse * 0.55);
            if (defender.military) defender.military.army = defender.army;
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
            attacker.army <= attackerCollapse &&
            defender.army > attacker.army * 1.25
          ) {
            attacker.controlledBy = defender.controlledBy ?? defender.id;
            attacker.occupationStartedTick = state.tick + 1;
            attacker.stability = 30;
            attacker.army = Math.max(800, attackerCollapse * 0.55);
            if (attacker.military) attacker.military.army = attacker.army;
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
          occupied.army = Math.max(5_000, loyalPeople.length * 2_500);
          if (occupied.military) {
            occupied.military.army = occupied.army;
            occupied.military.reserves = Math.max(
              occupied.military.reserves,
              occupied.army * 1.5
            );
          }
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

        const successorArmy = Math.max(6_000, survivors.length * 2_000);
        const successorPopulation = Math.max(
          35_000,
          survivors.reduce(
            (sum, person) => sum + (person.populationWeight ?? 1),
            0
          ) * 250
        );
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
          army: successorArmy,
          treasury: 18_000,
          stability: 64,
          controlledBy: null,
          rulerName: null,
          flagPresetId: civilization.flagPresetId,
          allianceName: null,
          relations: {},
          effects: [],
          civilizationId: civilization.id,
          occupationStartedTick: null,
          revivalCount: civilization.revivalCount + 1,
          focus: "integration",
          integrationPolicy: "settler",
          population: successorPopulation,
          cityCount: 1,
          townCount: 4,
          integrationProgress: 35,
          military: {
            army: successorArmy,
            navy: Math.round(successorArmy * 0.05),
            airForce: state.era === "modern" || state.era === "future"
              ? Math.round(successorArmy * 0.025)
              : 0,
            reserves: successorArmy * 2,
            doctrine: "defensive"
          }
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
          ...diplomacyEvents,
          ...governanceEvents,
          ...birthEvents,
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
      workspaceMode: state.workspaceMode,
      era: state.era,
      conflictScenario: state.conflictScenario,
      populationSeed: state.populationSeed,
      seed: state.seed,
      objects: state.objects,
      factions: state.factions,
      civilizations: state.civilizations,
      territories: state.territories,
      npcs: state.npcs,
      quests: state.quests,
      incidents: state.incidents,
      wars: state.wars,
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
      workspaceMode: snapshot.workspaceMode ?? "play",
      era: snapshot.era ?? "modern",
      conflictScenario: snapshot.conflictScenario ?? "organic",
      populationSeed: snapshot.populationSeed ?? 100,
      seed: snapshot.seed,
      objects: snapshot.objects,
      factions: snapshot.factions,
      civilizations: snapshot.civilizations,
      territories: snapshot.territories,
      territoryDraft: [],
      selectedTerritoryId: null,
      npcs: snapshot.npcs,
      quests: snapshot.quests,
      incidents: snapshot.incidents ?? [],
      wars: snapshot.wars ?? [],
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
      workspaceMode: "play",
      era: "modern",
      conflictScenario: "organic",
      populationSeed: 100,
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
      incidents: [],
      wars: [],
      selectedObjectId: null,
      selectedFactionId: "USA",
      selectedSubdivisionId: null,
      logs: ["World reset in 2D battle mode."],
      tick: 0
    });
  }
  };
});
