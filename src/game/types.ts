export type Vec3 = [number, number, number];
export type LatLon = [number, number];

export type WorldMode = "earth" | "procedural" | "sandbox";
export type ViewMode = "globe3d" | "map2d";
export type WorkspaceMode = "play" | "god" | "editor" | "player";
export type Era = "ancient" | "medieval" | "industrial" | "modern" | "future";
export type ConflictScenario = "organic" | "regional-war" | "world-war";
export type NationFocus =
  | "balanced"
  | "military"
  | "economy"
  | "integration"
  | "cities"
  | "diplomacy"
  | "naval";
export type IntegrationPolicy = "local" | "balanced" | "settler";
export type IncidentType =
  | "border-clash"
  | "assassination"
  | "naval-incident"
  | "embargo"
  | "territorial-claim"
  | "alliance-crisis"
  | "ultimatum"
  | "rebellion-support";
export type WarStatus = "mobilizing" | "war" | "peace-talks" | "ended";
export type EditorTool =
  | "select"
  | "move"
  | "rotate"
  | "scale"
  | "territory"
  | "nation";
export type ObjectKind = "block" | "sphere" | "cylinder" | "spawn" | "king";
export type Relation = "neutral" | "allied" | "war";
export type NpcState = "idle" | "marching" | "fighting" | "dead";
export type GarrisonBranch = "land" | "sea" | "air";
export type GarrisonOrder = "hold" | "move" | "attack" | "support";

export type FlagPresetId =
  | "ocean-tricolor"
  | "sunrise"
  | "royal-cross"
  | "forest-band"
  | "midnight-star"
  | "republic"
  | "golden-eagle"
  | "island-wave"
  | "crimson-saltire"
  | "emerald-sun"
  | "sky-chevron"
  | "imperial-band";

export type NationEffectKind =
  | "military-aid"
  | "economic-aid"
  | "morale-boost"
  | "sanctions"
  | "combat-fatigue"
  | "unrest";

export interface NationEffect {
  id: string;
  kind: NationEffectKind;
  label: string;
  attackMultiplier: number;
  defenseMultiplier: number;
  incomeMultiplier: number;
  moraleModifier: number;
  remainingTicks: number;
  positive: boolean;
}

export interface SceneObject {
  id: string;
  name: string;
  kind: ObjectKind;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: string;
  factionId?: string;
}

export interface CivilizationRecord {
  id: string;
  name: string;
  adjective: string;
  foundingTick: number;
  extinctionTick: number | null;
  homeland: LatLon;
  color: string;
  flagPresetId: FlagPresetId;
  legacyNames: string[];
  revivalCount: number;
  history: string[];
}

export interface DiplomaticMemory {
  tension: number;
  trust: number;
  lastIncidentTick?: number | null;
  lastWarTick?: number | null;
}

export interface DiplomaticIncident {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  actorId: string;
  targetId: string;
  createdTick: number;
  severity: number;
  tensionDelta: number;
  resolved: boolean;
}

export interface ActiveWar {
  id: string;
  name: string;
  status: WarStatus;
  createdTick: number;
  startsTick: number;
  endedTick?: number | null;
  causeIncidentId: string;
  primaryAttackerId: string;
  primaryDefenderId: string;
  attackerIds: string[];
  defenderIds: string[];
  attackerAllianceName?: string | null;
  defenderAllianceName?: string | null;
  frontProgress?: Record<string, number>;
  summary?: string;
}

export interface Garrison {
  id: string;
  factionId: string;
  name: string;
  branch: GarrisonBranch;
  size: number;
  lat: number;
  lon: number;
  homeLat: number;
  homeLon: number;
  order: GarrisonOrder;
  targetFactionId?: string | null;
  targetLat?: number | null;
  targetLon?: number | null;
  readiness: number;
}

export interface MilitaryProfile {
  army: number;
  navy: number;
  airForce: number;
  reserves: number;
  doctrine: "defensive" | "balanced" | "aggressive" | "maneuver" | "naval";
}

export interface Faction {
  id: string;
  name: string;
  cca2: string;
  cca3: string;
  numericCode?: string;
  emoji: string;
  capital?: string;
  lat: number;
  lon: number;
  color: string;
  accentColor: string;
  army: number;
  treasury: number;
  stability: number;
  controlledBy: string | null;
  rulerName: string | null;
  flagPresetId: FlagPresetId;
  allianceName?: string | null;
  relations: Record<string, Relation>;
  effects: NationEffect[];
  civilizationId: string;
  occupationStartedTick?: number | null;
  revivalCount?: number;
  focus?: NationFocus;
  integrationPolicy?: IntegrationPolicy;
  population?: number;
  cityCount?: number;
  townCount?: number;
  integrationProgress?: number;
  military?: MilitaryProfile;
  diplomacy?: Record<string, DiplomaticMemory>;
}

export interface TerritoryPatch {
  id: string;
  name: string;
  parentFactionId: string | null;
  ownerFactionId: string | null;
  color: string;
  points: LatLon[];
  createdAt: number;
  genericName: boolean;
}

export interface TraitStats {
  aggression: number;
  courage: number;
  discipline: number;
  speed: number;
  luck: number;
}

export interface NpcUnit {
  id: string;
  factionId: string;
  civilizationId: string;
  loyalty: number;
  name: string;
  species: string;
  traits: string[];
  nationality?: string;
  tags?: string[];
  sex?: "female" | "male";
  birthTick?: number;
  generation?: number;
  parentIds?: string[];
  partnerId?: string | null;
  childIds?: string[];
  populationWeight?: number;
  stats: TraitStats;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  lat: number;
  lon: number;
  targetFactionId?: string | null;
  state: NpcState;
  kills: number;
}

export type QuestType =
  | "alliance"
  | "war"
  | "conquest"
  | "territory"
  | "world-domination"
  | "survival";

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  progress: number;
  completed: boolean;
  reward: string;
}

export interface NameCatalog {
  countryNames: string[];
  territoryNames: string[];
  allianceNames: string[];
  species: string[];
  npcFirstNames: string[];
  npcLastNames: string[];
  traitNames: string[];
}

export interface SavedWorld {
  version: 2;
  worldName: string;
  worldMode: WorldMode;
  viewMode?: ViewMode;
  supportedFactionId?: string | null;
  playerFactionId?: string | null;
  workspaceMode?: WorkspaceMode;
  era?: Era;
  conflictScenario?: ConflictScenario;
  populationSeed?: number;
  seed: number;
  objects: SceneObject[];
  factions: Faction[];
  civilizations: CivilizationRecord[];
  territories: TerritoryPatch[];
  npcs: NpcUnit[];
  garrisons?: Garrison[];
  quests: Quest[];
  incidents?: DiplomaticIncident[];
  wars?: ActiveWar[];
  logs: string[];
  tick: number;
}

export interface LegacySavedWorldV1 {
  version: 1;
  worldName: string;
  worldMode: "earth" | "procedural";
  seed: number;
  objects: SceneObject[];
  factions: Array<Omit<Faction, "accentColor" | "effects" | "civilizationId">>;
  logs: string[];
  tick: number;
}
