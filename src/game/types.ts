export type Vec3 = [number, number, number];
export type LatLon = [number, number];

export type WorldMode = "earth" | "procedural" | "sandbox";
export type ViewMode = "globe3d" | "map2d";
export type EditorTool = "select" | "move" | "rotate" | "scale" | "territory";
export type ObjectKind = "block" | "sphere" | "cylinder" | "spawn" | "king";
export type Relation = "neutral" | "allied" | "war";
export type NpcState = "idle" | "marching" | "fighting" | "dead";

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
  name: string;
  species: string;
  traits: string[];
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
  seed: number;
  objects: SceneObject[];
  factions: Faction[];
  territories: TerritoryPatch[];
  npcs: NpcUnit[];
  quests: Quest[];
  logs: string[];
  tick: number;
}

export interface LegacySavedWorldV1 {
  version: 1;
  worldName: string;
  worldMode: "earth" | "procedural";
  seed: number;
  objects: SceneObject[];
  factions: Array<Omit<Faction, "accentColor" | "effects">>;
  logs: string[];
  tick: number;
}
