import type { CSSProperties } from "react";
import type { FlagPresetId } from "./types";

export interface FlagPreset {
  id: FlagPresetId;
  name: string;
  style: CSSProperties;
  before?: CSSProperties;
  symbol?: string;
}

export const FLAG_PRESETS: FlagPreset[] = [
  {
    id: "ocean-tricolor",
    name: "Ocean Tricolor",
    style: { background: "linear-gradient(#1f6feb 0 33%, #f5f7fa 33% 66%, #d73a49 66%)" }
  },
  {
    id: "sunrise",
    name: "Sunrise",
    style: { background: "linear-gradient(90deg, #f7b32b 0 50%, #b23a48 50%)" },
    symbol: "☀"
  },
  {
    id: "royal-cross",
    name: "Royal Cross",
    style: { background: "linear-gradient(90deg, transparent 42%, #f4d35e 42% 58%, transparent 58%), linear-gradient(transparent 40%, #f4d35e 40% 60%, transparent 60%), #25316d" }
  },
  {
    id: "forest-band",
    name: "Forest Band",
    style: { background: "linear-gradient(#1b4332 0 40%, #f8f9fa 40% 60%, #2d6a4f 60%)" }
  },
  {
    id: "midnight-star",
    name: "Midnight Star",
    style: { background: "#141b41" },
    symbol: "★"
  },
  {
    id: "republic",
    name: "Republic",
    style: { background: "linear-gradient(90deg, #0b6e4f 0 33%, #ffffff 33% 66%, #d7263d 66%)" }
  }
];
