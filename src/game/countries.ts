import rawCountries from "world-countries";
import { seededColor } from "./geo";
import type { Faction, FlagPresetId } from "./types";

type CountryRecord = {
  independent?: boolean;
  status?: string;
  cca2: string;
  cca3: string;
  ccn3?: string;
  flag?: string;
  name: { common: string };
  capital?: string[];
  latlng?: [number, number];
};

const flagPresets: FlagPresetId[] = [
  "ocean-tricolor",
  "sunrise",
  "royal-cross",
  "forest-band",
  "midnight-star",
  "republic"
];

function stableNumber(key: string, min: number, max: number): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const t = (hash >>> 0) / 4294967295;
  return Math.round(min + (max - min) * t);
}

export function createInitialFactions(): Faction[] {
  return (rawCountries as CountryRecord[])
    .filter((country) => country.cca3 && country.latlng?.length === 2)
    .map((country, index) => ({
      id: country.cca3,
      name: country.name.common,
      cca2: country.cca2,
      cca3: country.cca3,
      numericCode: country.ccn3,
      emoji: country.flag ?? "🏳️",
      capital: country.capital?.[0],
      lat: country.latlng![0],
      lon: country.latlng![1],
      color: seededColor(country.cca3),
      army: stableNumber(country.cca3 + "army", 35, 140),
      treasury: stableNumber(country.cca3 + "treasury", 250, 1800),
      stability: stableNumber(country.cca3 + "stability", 55, 95),
      controlledBy: null,
      rulerName: null,
      flagPresetId: flagPresets[index % flagPresets.length],
      relations: {}
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
