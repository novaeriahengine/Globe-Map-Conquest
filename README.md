# Globe Map Conquest

Globe Map Conquest is a browser-based 3D world editor and living grand-strategy sandbox. The project is being built toward a Roblox-Studio-style creator workflow for Earth maps, fictional planets, custom kingdoms, diplomacy, wars, editable borders, NPC civilizations, quests and published online worlds.

## Current build

The current editor now includes:

- Startup **World Picker** with Earth, Procedural Planet and WorldBox-style Sandbox templates
- 3D Earth using real Natural Earth country geometry
- Individually colored country land, selectable country markers and editable faction colors
- U.S. state/subdivision selection as the first subnational data layer
- Seed-based procedural planets with oceans, continents, mountains and generated forests
- Dense colorful WorldBox-style sandbox mode
- Studio-style Select / Move / Rotate / Scale tools
- Blocks, spheres, cylinders, spawn points and kings
- **Draw Territory** mode: click points directly on the globe to carve out a custom territory
- Rename/recolor custom territories
- Promote a drawn territory into a new independent country with a generated country name
- Expanded flag preset library
- Diplomacy, alliances and wars
- Generated alliance names from the shared catalog
- Living NPC soldiers with:
  - generated names
  - species
  - personality/combat traits
  - HP, attack, defense, speed, courage, discipline, luck and aggression
  - marching, fighting, deaths and kill counts
- Country conquest and occupation
- One-click **World War** scenario with two coalitions and living armies
- World-domination and progression quests
- Local browser saves
- WebSocket room sync
- **Cloud Firestore world memory**
- Firestore-backed shared name/species/trait catalogs
- Multi-tab IndexedDB Firestore cache for better browser persistence
- GitHub Pages deployment workflow

## Firestore structure

Firestore is used as JSON-like persistent world memory.

```text
worlds/{worldId}
  name
  mode
  seed
  tick
  version
  updatedAt

worlds/{worldId}/state/current
  snapshot
    worldName
    worldMode
    seed
    factions[]
    territories[]
    npcs[]
    quests[]
    objects[]
    logs[]
    tick

catalogs/defaults
  countryNames[]
  territoryNames[]
  allianceNames[]
  species[]
  npcFirstNames[]
  npcLastNames[]
  traitNames[]
```

The current snapshot format is version 2. Version 1 browser saves are upgraded automatically when loaded.

## Firebase one-time setup

The web Firebase configuration for project `globe-map-conquest` is already connected in the code.

To allow cloud saves without showing users a login screen:

1. In Firebase Console, open **Authentication → Sign-in method**.
2. Enable **Anonymous** authentication.
3. Deploy the included `firestore.rules`.

With Firebase CLI:

```bash
firebase login
firebase use globe-map-conquest
firebase deploy --only firestore:rules
```

The rules allow public reads for discoverable worlds but require an authenticated anonymous Firebase session for writes.

## Run locally

```bash
npm install
npm run dev
```

This starts:

- Vite editor: port 5173
- WebSocket room server: port 8787

## Production build

```bash
npm run build
```

GitHub Actions validates every push. The `deploy-pages` workflow also builds the Vite app and publishes `dist/` to GitHub Pages when Pages is configured to use GitHub Actions.

## Architecture direction

The code is separated into rendering, world state, simulation, Firestore persistence, editor tools and online synchronization so the editor can grow into a creator platform instead of becoming one hard-coded strategy game.

Major next systems:

1. Real subdivision boundary datasets for countries beyond the U.S.
2. Province/city/resource layers and settlement simulation
3. True polygon boolean editing for cutting one territory into multiple geometric pieces
4. Roads, buildings, farms, biomes and terrain brushes
5. NPC professions, families, reproduction, migration and economies
6. Armies with formations, equipment, generals and battle fronts
7. Treaties, vassals, rebellions and peace conferences
8. User scripts/components and reusable prefabs
9. Asset library, models, audio and animation
10. World publishing, permissions, moderation and creator collaboration

The project uses familiar editor concepts such as hierarchy, inspectors, transform gizmos and play mode while remaining an original implementation with its own code, assets and game systems.
