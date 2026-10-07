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
  population?: number;
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
    .map((country, index) => {
      const population = Math.max(
        50_000,
        Math.round(country.population ?? stableNumber(country.cca3 + "population", 500_000, 85_000_000))
      );
      const activeArmy = Math.max(
        5_000,
        Math.min(
          650_000,
          Math.round(population * (0.0012 + stableNumber(country.cca3 + "army-rate", 8, 30) / 10000))
        )
      );
      const navy = Math.round(
        activeArmy * (stableNumber(country.cca3 + "navy", 4, 26) / 100)
      );
      const airForce = Math.round(
        activeArmy * (stableNumber(country.cca3 + "air", 3, 19) / 100)
      );

      return {
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
        accentColor: seededColor(country.cca3 + "-accent"),
        army: activeArmy,
        treasury: stableNumber(country.cca3 + "treasury", 25_000, 950_000),
        stability: stableNumber(country.cca3 + "stability", 55, 95),
        controlledBy: null,
        rulerName: null,
        flagPresetId: flagPresets[index % flagPresets.length],
        relations: {},
        effects: [],
        civilizationId: `civ-${country.cca3}`,
        occupationStartedTick: null,
        revivalCount: 0,
        focus: "balanced" as const,
        integrationPolicy: "balanced" as const,
        population,
        cityCount: stableNumber(country.cca3 + "cities", 3, 48),
        townCount: stableNumber(country.cca3 + "towns", 14, 280),
        integrationProgress: 55,
        military: {
          army: activeArmy,
          navy,
          airForce,
          reserves: Math.round(activeArmy * (1.2 + stableNumber(country.cca3 + "reserve", 5, 20) / 10)),
          doctrine: "balanced" as const
        }
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
