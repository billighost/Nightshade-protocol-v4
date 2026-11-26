# NIGHTSHADE PROTOCOL — MASTER ARCHITECTURE & PRODUCTION GUIDE

> **Living Source of Truth** for **Nightshade Protocol** (React + TypeScript + Three.js + Tailwind CSS).
> This guide documents the completed **Player & Weapons Core (Phase 1)**, the completed **8-Floor Vertical Hideout & Modular Architecture (Phase 2)**, the completed **Floor 08 Showcase, AAA HUD & Fog-of-War Minimap (Phase 3A)**, strict **Zero-Defect Engineering Laws**, and the active blueprint for **Floor 07 through Floor 01**.

---

## 1. PROJECT IDENTITY & CURRENT PROGRESS

- **Title**: **NIGHTSHADE PROTOCOL**
- **Genre**: Third-person Over-the-Shoulder (OTS) Tactical Action Shooter
- **Core Premise**: Descend an 8-floor subterranean megastructure (`Floor 08 → Floor 07 → Floor 06 → Floor 05 → Floor 04 → Floor 03 → Floor 02 → Floor 01`) with a sleek tactical operative, mastering kinetic movement, three distinct reload/cooling weapon systems, interactive level mechanics, and handcrafted enemy & boss encounters culminating in the Floor 01 Sovereign Boss Colosseum.
- **Completed Milestones**:
  - **Phase 1 — Operative, Weapons, Audio & Combat Feel (COMPLETE)**:
    - Sculpted hierarchical 3D operative (`src/game/player/`) with procedural locomotion, 8-way combat strafing, velocity-aligned free-run, sprint, crouch, variable jump, directional dodge-roll, and smooth aim/reload/swap animations.
    - Three signature weapons (`src/game/weapons/`):
      1. `SPECTRE-9` Suppressed Tactical Pistol (18-rd mag, Active Reload sweet-spot -> cyan overcharged rounds; missed sweet-spot -> brief jam).
      2. `VIPER-X4` Cryo-Rail SMG (Thermal buildup, manual vent `[R]`, pressurized cryo steam/sparks, Flash-Cool RPM surge window).
      3. `VULCAN-50` Heavy `.50 HV` Kinetic Rifle (High-impact armor-piercing rounds, heavy brake flash, 3D Ammo Crate resupply).
    - Pooled 3D Combat VFX (`src/game/effects/vfxPool.ts`) and Procedural WebAudio Synthesizer (`src/game/effects/audio.ts`).
  - **Phase 2 — Full 8-Floor Vertical Hideout & Modular Refactoring (COMPLETE)**:
    - All **8 bespoke vertical floors** (`Floor 08` at `Y = 98.0m` down to `Floor 01` at `Y = 0.0m` arrival / `-12.0m` boss pit) connected by **7 watertight U-turn Descent Airlock Galleries** with `BulkheadDoor` seals, `ControlCenter` consoles, and distance-based streaming (`floorStreamer.ts`) + per-room `OcclusionCell` culling.
    - Full interactive world-mechanics suite: `TacticalDoor` (`auto_slide` & `jammed_roll_under`), `LockedSecurityGate`, `ShootableLock`, `RetractableBridge`, `JumpPad` (36+ calibrated pads across the facility), `WorldSwitch`, `ExplosiveBarrel` (chain-detonation), `HeavyAmmoCrate`, and `InteractiveTarget`.
  - **Phase 3A — Floor 08 Complete Showcase + AAA HUD + Fog-of-War Minimap (COMPLETE)**:
    - **Floor 08 (`Tactical Arrival & Shoot House 08`) is 100% DONE**:
      - Interactive 5-station Holographic Tutorial (`src/game/tutorial/`) with instant `[Tab]` skip & entry-gate live-combat respawn.
      - All **6 bespoke Floor 08 enemies** upgraded to AAA showcase quality (`src/game/enemies/floor08/`):
        1. `Breacher-08` (burst-rifle flanker, shoulder EMP battery weakpoint, laser sight & jet-dash)
        2. `Razor-Strider` (iaijutsu katana duelist, floor slash scars, post-lunge spine thruster weakpoint)
        3. `Aegis-Riot Trooper` (hard-light barrier + bull-rush + shield slam, shatterable projector lens weakpoint)
        4. `Killhouse Warden-08` *(Zone Mini-Boss — West CQB Killhouse)* (akimbo SMG flash-dash + cyclone sweep, dorsal vent capacitors)
        5. `Ordnance Pyro-Tech "Forge-08"` *(Zone Mini-Boss — East Tactical Armory)* (thermal sweep + mortar canister + napalm slam, pressurized crimson back tank)
        6. `Commander Kestrel-08` *(Floor 08 Main-Hall Boss)* (multi-phase jet-blade + meteor slam + overdrive vents)
      - **COD / Halo Combat Durability Tuning**: Challenging enemy HP pools & weakpoint thresholds so every encounter demands smart cover, aim, and weakpoint counterplay instead of melting instantly.
      - **Strict All-Enemies-Vanquished Control Center Gating**: Control Center stays strictly disabled (crimson lock + `"All enemies must be vanquished first"`) until EVERY hostile (normals + mini-bosses + Floor Boss) is eliminated.
      - **Polished Floor Cleared Celebration**: Cinematic sculpted golden `FLOOR XX CLEARED` crest banner (`FloorClearedBanner.tsx`), refined Halo/BOTW shrine waypoint (`ObjectiveWaypoint.tsx`), and 3D volumetric golden-cyan light pillar with orbiting holographic gyro rings (`controlCenter.ts`).
      - **Real-Game AAA HUD (`TacticalHud.tsx`, `VitalityBar.tsx`, `WeaponArsenalHud.tsx`, `TacticalCompass.tsx`)**: Zero stance text anywhere (`COMBAT/CROUCH/SPRINT/ADS` permanently banned), zero website boxes or permanent `SCORE 0` noise, reactive 3-plate kinetic Vitality Bar with trailing damage ghost & impact shake, Gunsmith SVG weapon silhouettes with contextual low-ammo/heat prompts.
      - **Flagship Architectural Minimap + Dynamic Fog of War (`TacticalMinimap.tsx`, `minimapMath.ts`, `fogOfWar.ts`)**: Walkable room-vs-void blueprint contrast, unmistakable luminous directional enemy chevrons with facing cones & bright off-radar edge arrows, mini-boss/boss emblems, AND wall-occluded **Dynamic Fog of War** that obscures unvisited rooms and smoothly clears as the operative moves and looks through each floor!
- **ACTIVE NEXT MILESTONE — FLOOR 07 (AND BEYOND)**:
  - **Floor 08 is FINISHED.** We are now advancing to the **next floor in the vertical descent: Floor 07 (`Logistics Rotunda, Skybridge & Ordnance Vault`, `Y = 84.0m`)** — building the full Floor 07 enemy roster, encounter director, modular scaffolding, challenging COD/Halo combat balance, zone mini-bosses, and Floor 07 Boss (`TITAN-RIG "BASTION-VII"`), then continuing floor-by-floor down to `Floor 01`!

---

## 2. MODULAR CODEBASE MAP

Every major subsystem has a dedicated folder with focused modules and a clean `index.ts` barrel:

```text
src/
├── App.tsx                             # React shell hosting 3D canvas + HUD/Pause/Title overlays
├── components/
│   ├── TacticalHud.tsx                 # Uncluttered AAA HUD shell (crosshair, threat arc, compass, boss bar)
│   ├── TacticalMinimap.tsx             # Architectural radar minimap + dynamic Fog of War shroud + enemy blips
│   ├── TitleOverlay.tsx                # Hero title screen overlay
│   ├── PauseOverlay.tsx                # Pause/controls/reset overlay
│   └── hud/
│       ├── VitalityBar.tsx             # Reactive 3-plate kinetic shield & hull bar (ZERO stance text!)
│       ├── WeaponArsenalHud.tsx        # Floating Gunsmith weapon silhouettes, tabular ammo & pips
│       ├── TacticalCompass.tsx         # Floating COD/BOTW top-center bearing ribbon
│       ├── ObjectiveWaypoint.tsx       # 3D-to-2D projected BOTW/Halo shrine diamond waypoint
│       └── FloorClearedBanner.tsx      # Cinematic sculpted golden/cyan FLOOR XX CLEARED emblem banner
└── game/
    ├── NightshadeEngine.ts             # 1-line barrel re-exporting ./engine
    ├── engine/                         # Modular Core Engine Orchestrator
    │   ├── NightshadeEngine.ts         # Scene, renderer, loop, Hideout/Player/VFX/Audio/FogOfWar wiring
    │   ├── inputController.ts          # Keyboard/mouse/pointer-lock + Dev Ctrl+1..8 floor warp
    │   ├── inputController.test.ts     # Unit tests for Ctrl+1..8 warp & weapon hotkey isolation
    │   ├── cameraRig.ts                # OTS camera, wall occlusion raycast, recoil/trauma/thermal impulses
    │   ├── combatController.ts         # Ballistic raycast, lock/barrel/target/enemy impact resolution
    │   ├── inspectApi.ts               # Non-intrusive window.__nightshadeInspect QA automation bridge
    │   ├── types.ts                    # Engine telemetry & inspect override types
    │   └── index.ts
    ├── hud/
    │   ├── minimapMath.ts              # Heading-up radar math, floor/wall extraction, sector resolver
    │   ├── fogOfWar.ts                 # Per-floor wall-occluded dynamic Fog of War grid & LOS reveal
    │   └── fogOfWar.test.ts            # Unit tests for Fog of War discovery, cone & wall occlusion
    ├── core/                           # Pure math, settings, shared types, procedural PBR textures
    ├── player/                         # Hierarchical 3D operative rig, animations, locomotion, hitReaction
    ├── weapons/                        # Weapon state machine, 3D models & unit tests
    ├── effects/                        # Ballistics helpers, CombatVfxPool, WebAudio TacticalAudioEngine
    ├── arena/
    │   ├── props/                      # Ammo crates & reactive range targets
    │   └── hideout/                    # 8-Floor Vertical Megastructure (floors 08..01 + mechanics + collision)
    ├── tutorial/                       # Floor 08 Interactive 5-Station Holographic Orientation
    └── enemies/                        # Shared enemy core + 1-folder-per-floor / 1-folder-per-enemy
        ├── core/                       # EnemyManager, EnemyNav, EnemyProjectiles, EnemyVfx, HealthHud
        ├── floor08/                    # [COMPLETE] All 6 Floor 08 enemies + encounter director + tests
        └── floor07/                    # [NEXT] Floor 07 Apex Exo-Mercenaries & Siege Walkers + Bastion-VII
```

---

## 3. THE 8-FLOOR VERTICAL HIDEOUT & ENCOUNTER PROGRESSION CHART

| Floor | Base Y | Exit Side | Architectural Identity | Floor Scale & Enemy Density Target | Encounter Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **08** | `98.0m` | North (`-Z`) | **Tactical Arrival & Shoot House 08** | Medium proving hall + West Killhouse + East Armory — **13 hostiles** (10 normals + 2 Zone Mini-Bosses + Commander Kestrel-08) | **COMPLETE** |
| **07** | `84.0m` | South (`+Z`) | **Logistics Rotunda & Turbine Complex** | Large multi-level circular rotunda + upper retractable skybridge + West Barracks/Vault + East Server/Turbine Hall — **18–22 hostiles** (3–4 unique normal types + 2–3 Zone Mini-Bosses + Bastion-VII) | **NEXT UP** |
| **06** | `70.0m` | North (`-Z`) | **Brutalist Monolith Cathedral** | Vast 15.5m nave + SW Munitions Bunker + NW/NE Research Labs + skybridges — **20–24 hostiles** (4 unique normal types + 2–3 Mini-Bosses + Monolith Archon) | Planned |
| **05** | `56.0m` | South (`+Z`) | **Grand Orbital Amphitheater** | Expansive multi-tier curved rings + radial catwalks + side security wings + balconies — **22–26 hostiles** (4 unique normal types + 2–3 Mini-Bosses + Apex Arena Marauder) | Planned |
| **04** | `42.0m` | North (`-Z`) | **Abyssal Chasm & Skybridge Network** | Sprawling suspended islands + twin steel bridges + jump-pad chains + remote pylon — **22–26 hostiles** (aerial + ground mix + 2–3 Mini-Bosses + Leviathan Sky-Serpent) | Planned |
| **03** | `28.0m` | South (`+Z`) | **Glacial Forerunner Citadel** | Massive 12-zone temple (Threshold, Aqueduct, Spiral Crypt, Crown Reliquary) — **24–28 hostiles** (4+ unique normal types + 3 Zone Mini-Bosses + Aurora Seraph Warden) | Planned |
| **02** | `14.0m` | North (`-Z`) | **Voltaic Maglev Rail Canyon & Foundry** | Huge 12-zone industrial canyon (Maglev Track, Smelter Foundry, Cooling Silo, High-Line Skybridge, Vault) — **26–30 hostiles** (4+ unique normal types + 3 Zone Mini-Bosses + Vulcan-02) | Planned |
| **01** | `0.0m` (`-12.0m` Pit) | Final Vault | **Eclipse Sovereign Colosseum** | Monumental `92m × 92m` 4-tier Final Boss arena — **Pure 3-Phase Final Boss Showcase** (`THE ECLIPSE SOVEREIGN`) | Planned |

### Developer & QA Testing Shortcuts
- **`Ctrl + 1` through `Ctrl + 8`**: Instantly teleports the operative to **Floor 01 .. Floor 08** with camera snap, floor streaming activation, and floor banner.
- **`window.__nightshadeInspect`**: Automated Playwright QA inspection bridge (`skipTutorial`, `teleportPlayer`, `teleportToFloor`, `setCamera`, `spawnBossNow`, `clearAllFloor08Enemies`, `triggerPlayerHitTest`, `stepSim`, `getDrawCalls`, etc.).

---

## 4. STRICT ZERO-DEFECT ENGINEERING & UX LAWS (NON-NEGOTIABLE)

Every future floor, enemy rig, HUD adjustment, or boss encounter MUST obey these permanent laws:

1. **Zero Overlapping / Z-Fighting Geometry & Zero Door Clipping**:
   - Never place two visible faces within `5mm` coplanar overlap (`hideoutCollision.test.ts` Test 25 & 26 MUST pass with `0` defects).
   - Every sliding `SecurityGate` / `auto_slide` `TacticalDoor` telescopes cleanly into its jamb pocket; every walkable slab/ramp/cover emits exact colliders.
2. **Real-Game AAA HUD Purity (NO Website Chrome, NO Stance Clutter)**:
   - **NEVER display player stance text** (`COMBAT`, `WALK`, `CROUCH`, `SPRINT`, `ADS LOCK`, `L/R`) anywhere on the HUD while moving or acting.
   - **NEVER render boxy SaaS/website panels** (`bg-slate-900/80 rounded-xl`), permanent `SCORE 0` counters, always-on `[R] RELOAD` hints when magazines are full, or duplicate degree readouts across HUD elements.
   - Keep `>= 85%` of the viewport clean and unobstructed; use zero `backdrop-filter` / `backdrop-blur` over WebGL.
   - Keep the **reactive Vitality Bar** (trailing damage ghost, impact shake, crimson rim flash, Halo recharge sweep) and **Gunsmith SVG weapon silhouettes** crisp and responsive.
3. **Flagship Architectural Minimap + Dynamic Fog of War**:
   - Every floor uses the heading-up architectural blueprint minimap (lit walkable interior rooms vs obsidian exterior void, elevated dashed catwalks, structural wall rims).
   - **Dynamic Fog of War** (`fogOfWar.ts`) obscures unvisited/unseen rooms behind walls and smoothly clears via proximity bubble + forward camera sight-cone as the player explores each floor.
   - **Unmistakable Enemy Visibility**: Every alive hostile on the active floor MUST be pushed into `minimap.enemies` (rendered with luminous crimson directional chevrons + facing cones + off-radar edge arrows + orange-gold Mini-Boss diamonds + crowned gold-crimson Floor Boss reticle) so the player can always read threats cleanly!
4. **Strict All-Enemies-Vanquished Control Center Gating & Post-Clear Polish**:
   - On every combat floor (`08` through `02`), the floor's **Control Center MUST remain strictly disabled** (`lockoutMode = 'disabled'`) until **EVERY SINGLE enemy** on that floor (all normal hostiles + all Zone Mini-Bosses + the Floor Boss) is vanquished.
   - Attempting to interact early displays `"ALL ENEMIES MUST BE VANQUISHED FIRST"` and plays the locked buzzer.
   - The moment the final hostile falls, trigger the full AAA **Floor Cleared Sequence**: sculpted golden `FLOOR XX CLEARED` crest banner (`FloorClearedBanner`), pulsing golden `CONTROL CENTER` shrine waypoint (`ObjectiveWaypoint`), golden minimap beacon + animated dashed guidance route, and the 3D volumetric golden-cyan light pillar with orbiting holographic gyro rings (`controlCenter.ts`)!
5. **COD / Halo Combat Challenge & Floor-Size Enemy Scaling (NEW MANDATORY RULE)**:
   - **No Fragile Paper Enemies**: Enemies must never melt in 2 casual shots. Tune HP pools, armor resistance, weakpoint thresholds, flanking pressure, and telegraphed attacks to feel genuinely challenging and exciting like **Call of Duty Veteran/Hardened + Halo Heroic**!
   - **Bigger Floors = More Enemies & Richer Archetype Diversity**: Floor 08 was our introductory proving bay (`13` total enemies). Larger, multi-wing, multi-elevation floors like **Floor 07 (`18–22+` enemies)**, **Floor 06 (`20–24+`)**, through **Floor 02 (`26–30+`)** MUST scale up both **total enemy count** and **distinct enemy types (3–4+ unique normal archetypes + 2–3 Zone Mini-Bosses + bespoke Floor Boss)** so massive chambers, balconies, skybridges, and side vaults feel alive, tense, and deeply replayable!
6. **Performance Budget & Verification Gate (Ultra Mode)**:
   - Keep draw calls batched, zero per-frame GC in hot `update(dt)` loops, decouple pure combat/AI/fog logic with `node:test` unit tests, co-execute `compile_applet` + `lint_applet`, and visually inspect every new enemy, boss, and combat scene in headless Chromium via `playwright-cli`.

---

## 5. PHASE 3 ENCOUNTER ARCHITECTURE — FLOOR-BY-FLOOR ROSTER BIBLE

### 5.1 Rollout Cadence: One Floor Fully Finished at a Time
- Build, upgrade each enemy individually to AAA player-rig fidelity, unit-test, and visually verify **ONE floor completely at a time** (`08 [DONE] → 07 [NEXT] → 06 → 05 → 04 → 03 → 02 → 01`).
- **HARD ANTI-RECYCLE RULE**: Every floor has **100% unique enemy archetypes, Zone Mini-Bosses, and Floor Boss**. NEVER copy-paste or palette-swap an enemy from Floor 08 onto Floor 07 or any lower floor!

### 5.2 Multi-Floor Unique Enemy & Boss Roster

| Floor | Faction Theme & AAA Inspirations | Normal Enemies (Unique to Floor — Scale Count With Floor Size!) | Zone Mini-Bosses & Main-Hall Floor Boss |
| :---: | :--- | :--- | :--- |
| **08 *(DONE)*** | **Black-Ops Cyber Vanguard** *(CoD / Titanfall / Ghostrunner)* | 1. **Breacher-08** (burst rifle + laser lock + jet-dash; shoulder EMP battery weakpoint) <br> 2. **Razor-Strider** (iaijutsu katana duelist + slash scars; post-lunge spine thruster) <br> 3. **Aegis-Riot Trooper** (hard-light barrier + bull-rush + shield slam; projector lens) | **Mini-Bosses**: *Killhouse Warden-08* & *Ordnance Pyro-Tech "Forge-08"*. <br> **Floor 08 Boss**: **COMMANDER KESTREL-08** *(ALL COMPLETE)* |
| **07 *(NEXT)*** | **Apex Exo-Mercenaries & Siege Walkers** *(Titanfall 2 / Halo / Armored Core VI)* | 1. **Exo-Carbine Trooper** (jet-boost flanker + suppressing pulse bursts; glowing dorsal exo-pack) <br> 2. **Grapple-Lance Duelist** (tether-zip gap closer + plasma pike sweeps; glowing chest tether winch) <br> 3. **Mortar-Pod Bombardier** (elevated skybridge/balcony artillery lobber + laser target rings; twin shoulder ordnance drums) <br> 4. **Valkyrie Hover-Drone / Suppressor** (rotunda aerial harrier weaving around upper galleries; central optic gyro-core) | **Zone Mini-Bosses**: <br> • *Turbine Heavy Juggernaut* (East Server/Turbine Hall — rotary autocannon + cooling radiator backplate) <br> • *Vault Stalker-Sniper* (West Barracks & Ordnance Vault — active-camo shimmer + rail-laser lock + glowing visor optic) <br> **Floor 07 Boss**: **TITAN-RIG "BASTION-VII"** (massive bipedal armored siege mech in the Central Rotunda with destructible shoulder missile pods, shockwave stomp, and overheating chest reactor core!). |
| **06** | **Paranatural Brutalist Constructs** *(Control / Returnal / Destiny Vex)* | Astral Shard Levitators, Monolith Claymore Knights, Resonant Beam Prisms, Phase-Blink Wardens | **Mini-Bosses**: Archive Reality-Weaver, Bunker Gravity-Hound. <br> **Floor 06 Boss**: **THE MONOLITH ARCHON** |
| **05** | **Gladiator Hunter-Beasts & Arena Champions** *(DOOM Eternal / Monster Hunter / Halo Elites)* | Plasma-Spear Hoplites, Leaping Carapace Stalkers, Arena Net-Shooters, Shield-Chariot Brutes | **Mini-Bosses**: Dual-Cleaver Executioner, Twin-Tail Acid Wyvern-Construct. <br> **Floor 05 Boss**: **APEX ARENA MARAUDER** |
| **04** | **Void-Chasm Winged Predators & Gravity Reavers** *(Metroid Prime / Returnal / Dead Space)* | Shrieking Void-Mantas, Tentacle-Grapple Reavers, Plasma-Spitter Lurkers, Abyssal Phase-Stalkers | **Mini-Bosses**: Skybridge Abyssal Matriarch, Pylon Sniper-Wraith. <br> **Floor 04 Boss**: **LEVIATHAN SKY-SERPENT** |
| **03** | **Ancient Glacial Forerunner Sentinels** *(Halo Forerunner / Elden Ring / Zelda Guardians)* | Cryo-Halberd Temple Guardians, Frost-Beam Obelisk Eyes, Ice-Golem Chargers, Shard-Weaver Acolytes | **Mini-Bosses**: Aqueduct Cryo-Centurion, Crypt Mirror-Phantasm, Reliquary Frost-Colossus. <br> **Floor 03 Boss**: **AURORA SERAPH WARDEN** |
| **02** | **Voltaic Foundry Titans & Magma Forgelords** *(DOOM / Soulsborne Iron Keep / Bioshock)* | Riveted Hammer-Brutes, Arc-Welder Gunners, Molten Slag-Hounds, Rail-Spire Snipers | **Mini-Bosses**: Smelter Furnace-Juggernaut, Maglev Rail-Reaper, Cooling-Silo Coil-Golem. <br> **Floor 02 Boss**: **IRON-FORGE SOVEREIGN "VULCAN-02"** |
| **01** | **The Eclipse Sovereign (Final Boss)** *(Elden Ring + DOOM + Armored Core + Halo Finale)* | *No trash mobs — pure monumental 3-phase Final Boss encounter across all 4 tiers!* | **FINAL BOSS: THE ECLIPSE SOVEREIGN** |

### 5.3 Player Health & Damage Reaction Rule (Testing/Tuning Phase)
- While building & tuning Floors `07 → 01`, the operative's HP remains non-lethal during testing while **fully driving all reactive hit systems**:
  - Reactive 3-plate Vitality Bar shield drop + trailing white-amber damage ghost + bar impact tremor + Halo recharge sweep (`VitalityBar.tsx`)
  - 360° directional reticle threat arc + minimap outer-rim threat arc + directional screen-edge crimson vignette flash
  - Camera roll/trauma kick + operative torso flinch animation + visceral armor-impact SFX
- All enemy damage flows cleanly through `NightshadeEngine.applyPlayerHit(damage, fromWorldPos, staggerStrength)` so enabling lethal damage later is a single toggle.

### 5.4 Hyper-Modular Enemy Folder Architecture (Mandatory For Floor 07+)
Every enemy type on Floor 07 (`src/game/enemies/floor07/`) gets its **own dedicated folder** matching Floor 08's player-grade modular craftsmanship:

```text
src/game/enemies/floor07/
├── index.ts                  # Floor 07 Encounter Director (zone waves, Mini-Bosses -> Bastion-VII Boss, Control Center gate)
├── floor07Combat.test.ts     # Pure-logic unit tests (weakpoints, boss phases, all-enemies-vanquished gate)
├── exoCarbineTrooper/        # mesh/, animations/, rig.ts, weakpoints.ts, attacks.ts, ai.ts, index.ts
├── grappleLanceDuelist/      # mesh/, animations/, rig.ts, weakpoints.ts, attacks.ts, ai.ts, index.ts
├── mortarPodBombardier/      # mesh/, animations/, rig.ts, weakpoints.ts, attacks.ts, ai.ts, index.ts
├── valkyrieHoverDrone/       # mesh/, animations/, rig.ts, weakpoints.ts, attacks.ts, ai.ts, index.ts
├── turbineJuggernaut/        # Zone Mini-Boss #1 (East Server/Turbine Hall)
├── vaultStalkerSniper/       # Zone Mini-Boss #2 (West Barracks & Ordnance Vault)
└── bastionSevenBoss/         # Floor 07 Main-Rotunda Floor Boss (TITAN-RIG "BASTION-VII")
```

### 5.5 Floor 07 Integration Checklist (Engine & UI Wiring)
When wiring `Floor07EncounterDirector` into `NightshadeEngine.ts`:
1. Activate Floor 07 combat seamlessly when the player descends through Bulkhead 08 into Floor 07 (or warps via `Ctrl+7` / `inspectApi`).
2. Feed ALL alive Floor 07 enemies into `buildMinimapSnapshot()` (`minimap.enemies`) and `computeObjectiveAndWaypoint()` (closest hostile / Mini-Boss / Bastion-VII / Control Center Ready / Open Bulkhead 07).
3. Enforce strict **all-enemies-vanquished Control Center gating** on Floor 07 (`canUseFloorControlCenter` extended per floor so Floor 07's Control Center stays locked crimson until every Floor 07 normal, Mini-Boss, and Bastion-VII is eliminated!).
4. Surface Floor 07 Mini-Boss & Bastion-VII health bars + concise weakpoint cues cleanly through the existing `TacticalHud` boss bar & lower-center cue.
5. Upgrade each Floor 07 enemy & boss to player-grade sculpted 3D silhouettes, expressive animations, dramatic VFX/telegraphs, and crisp Playwright multi-angle visual verification!
