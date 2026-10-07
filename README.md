# Globe Map Conquest

A browser-based 3D world editor and grand-strategy sandbox. The long-term target is a Roblox-Studio-style creation workflow focused on globe worlds: Earth, fictional planets, kingdoms, countries, diplomacy, war, rulers, flags, scripted objects, multiplayer worlds, and user-created experiences.

## Phase 1 foundation

This repository starts with a playable web prototype that includes:

- 3D Earth globe with real country borders from Natural Earth / `world-atlas`
- Country/faction markers and country selection
- Procedural planet generation with seed-based terrain
- Studio-style Edit / Play modes
- Select / Move / Rotate / Scale transform tools
- Add Block, Sphere, Cylinder, Spawn and King objects
- Scene hierarchy and object inspector
- Country stats, diplomacy states, alliances and war
- Simple conquest simulation
- King spawning for a selected country
- Preset flag creator
- Save/load world state in the browser

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Architecture direction

The browser editor is intentionally separated into world rendering, simulation state, editor tools, and data types so the project can grow into an online creation platform rather than a single hard-coded game.

Next major systems:

1. Authoritative multiplayer server + accounts + cloud saves
2. Project/world browser and publish workflow
3. Full terrain/biome editor, roads, cities and resource layers
4. Script/component system for user-made gameplay
5. Server-side country AI, armies, battles, occupations and peace treaties
6. Asset library, prefabs, models, audio and animations
7. Permissions/collaboration for creators
8. User-created experiences with versioning and moderation

This is an original globe strategy/editor platform. It can use familiar editor concepts such as hierarchy, inspector, transform gizmos and play mode without copying proprietary Roblox code or assets.
