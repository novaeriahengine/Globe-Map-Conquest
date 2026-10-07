export type Vec3 = [number, number, number];
export type WorldMode = "earth" | "procedural";
export type EditorTool = "select" | "move" | "rotate" | "scale";
export type ObjectKind = "block" | "sphere" | "cylinder" | "spawn" | "king";
export type Relation = "neutral" | "allied" | "war";

export type FlagPresetId =
  | "ocean-tricolor"
  | "sunrise"
  | "royal-cross"
  | "forest-band"
  | "midnight-star"
  | "republic";

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
  army: number;
  treasury: number;
  stability: number;
  controlledBy: string | null;
  rulerName: string | null;
  flagPresetId: FlagPresetId;
  relations: Record<string, Relation>;
}

export interface SavedWorld {
  version: 1;
  worldName: string;
  worldMode: WorldMode;
  seed: number;
  objects: SceneObject[];
  factions: Faction[];
  logs: string[];
  tick: number;
}
