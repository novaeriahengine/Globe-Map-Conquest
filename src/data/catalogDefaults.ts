import type { NameCatalog, Quest } from "../game/types";

export const DEFAULT_CATALOG: NameCatalog = {
  countryNames: [
    "Aurelia", "Valoria", "Kantara", "Nova Kreyol", "Eldoria", "Solmere",
    "Dravon", "Marisol", "Kaelora", "Verdania", "Orinth", "Zafara",
    "Arcadia", "Montara", "Bellaris", "Tyrenia", "Lumera", "Caldris",
    "Asteria", "Novera", "Demeris", "Azuria", "Koralis", "Tavora"
  ],
  territoryNames: [
    "Northreach", "Sun Coast", "Emerald March", "King's Vale", "Red Delta",
    "Blue Highlands", "Silver Plains", "Storm Cape", "Crown District",
    "Riverlands", "West Haven", "Golden Basin", "Ironwood", "Eastwatch",
    "Cloud Steppe", "Green Frontier", "Sapphire Coast", "Liberty Province"
  ],
  allianceNames: [
    "Atlantic Concord", "Crown League", "Emerald Pact", "Free Nations Union",
    "Sunrise Coalition", "Northern Compact", "Blue Sea Alliance",
    "Continental Defense League", "Unity Council", "Sovereign Accord",
    "World Peace Forum", "Iron Shield Pact", "Golden Federation"
  ],
  species: [
    "Human", "Highlander", "Island Folk", "Desertborn", "Forest Kin",
    "Frostborn", "Skyborn", "River Folk", "Dwarf", "Elf", "Orc",
    "Goblin", "Lizardfolk", "Feline", "Avian", "Machine"
  ],
  npcFirstNames: [
    "Ari", "Mika", "Noel", "Zuri", "Kade", "Lena", "Tomas", "Maya",
    "Dario", "Nia", "Eli", "Rhea", "Jalen", "Amara", "Kai", "Sol",
    "Milo", "Ada", "Theo", "Iris", "Niko", "Sana", "Remy", "Vera"
  ],
  npcLastNames: [
    "Vale", "Pierre", "Stone", "Rivers", "Marin", "North", "Dawn",
    "Cross", "Fields", "Crown", "Woods", "Storm", "Lake", "Knight",
    "Bright", "Ash", "Reed", "Gray", "Rose", "Hill"
  ],
  traitNames: [
    "Brave", "Aggressive", "Disciplined", "Swift", "Lucky", "Cautious",
    "Stubborn", "Tactical", "Loyal", "Ambitious", "Merciful", "Ruthless",
    "Explorer", "Defender", "Berserker", "Strategist"
  ]
};

export const DEFAULT_QUESTS: Quest[] = [
  {
    id: "first-alliance",
    title: "A Handshake Across Borders",
    description: "Create your first alliance between two countries.",
    type: "alliance",
    target: 1,
    progress: 0,
    completed: false,
    reward: "+100 treasury to the selected nation"
  },
  {
    id: "first-war",
    title: "The Drums of War",
    description: "Start a war and watch NPC armies mobilize.",
    type: "war",
    target: 1,
    progress: 0,
    completed: false,
    reward: "Unlock veteran army generation"
  },
  {
    id: "territory-maker",
    title: "Draw a New Border",
    description: "Carve out three custom territories on the globe.",
    type: "territory",
    target: 3,
    progress: 0,
    completed: false,
    reward: "Custom territory title"
  },
  {
    id: "conqueror",
    title: "Regional Power",
    description: "Control three countries through conquest.",
    type: "conquest",
    target: 3,
    progress: 0,
    completed: false,
    reward: "Empire status"
  },
  {
    id: "world-domination",
    title: "World Domination",
    description: "Bring 75% of countries under one controlling power.",
    type: "world-domination",
    target: 75,
    progress: 0,
    completed: false,
    reward: "World ruler victory"
  }
];
