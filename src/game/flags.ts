import type { CSSProperties } from "react";
import type { FlagPresetId } from "./types";

export interface FlagPreset {
  id: FlagPresetId;
  name: string;
  style: CSSProperties;
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
    style: {
      background:
        "linear-gradient(90deg, transparent 42%, #f4d35e 42% 58%, transparent 58%), linear-gradient(transparent 40%, #f4d35e 40% 60%, transparent 60%), #25316d"
    }
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
  },
  {
    id: "golden-eagle",
    name: "Golden Eagle",
    style: { background: "linear-gradient(#101820 0 52%, #f2aa4c 52%)" },
    symbol: "◆"
  },
  {
    id: "island-wave",
    name: "Island Wave",
    style: { background: "linear-gradient(155deg, #00a6fb 0 45%, #ffffff 45% 55%, #0582ca 55%)" },
    symbol: "●"
  },
  {
    id: "crimson-saltire",
    name: "Crimson Saltire",
    style: {
      background:
        "linear-gradient(35deg, transparent 43%, #f4d35e 43% 57%, transparent 57%), linear-gradient(-35deg, transparent 43%, #f4d35e 43% 57%, transparent 57%), #9b1c31"
    }
  },
  {
    id: "emerald-sun",
    name: "Emerald Sun",
    style: { background: "linear-gradient(90deg, #073b3a 0 50%, #0b6e4f 50%)" },
    symbol: "☀"
  },
  {
    id: "sky-chevron",
    name: "Sky Chevron",
    style: { background: "linear-gradient(135deg, #65c7f7 0 35%, #ffffff 35% 47%, #0052d4 47%)" },
    symbol: "✦"
  },
  {
    id: "imperial-band",
    name: "Imperial Band",
    style: { background: "linear-gradient(#3a0ca3 0 28%, #f72585 28% 42%, #3a0ca3 42% 72%, #f72585 72% 86%, #3a0ca3 86%)" },
    symbol: "♛"
  }
];
