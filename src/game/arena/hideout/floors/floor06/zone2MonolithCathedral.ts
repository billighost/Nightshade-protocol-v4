import * as THREE from 'three';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  buildInstancedBoxes,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import {
  buildExplosiveBarrel,
  buildJumpPad,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F6_BASE_Y,
  F6_CEILINGS,
  F6_IDS,
  F6_META,
  F6_PORTALS,
  F6_TRENCH_Y,
  F6_UPPER_Y,
  F6_WALLS,
} from './layout';

/**
 * FLOOR 06 — ZONE 2 (CENTER HERO): THE SUSPENDED MONOLITH CATHEDRAL
 * Footprint: x ∈ [-18, +18] (36m wide) × z ∈ [-17, +17] (continuous 34m cathedral ceiling, 13.4m tall!)
 *
 * Control (Oldest House) × Halo (Forerunner Sanctum) Centerpiece:
 * - Sunken Dry Cooling & Containment Trench (`y = 67.6m`, `-2.4m` below main deck) spanning `x ∈ [-11.2, +11.2], z ∈ [-9.6, +9.6]`
 * - 6 Colossal Brutalist Hanging Concrete/Steel Data Monoliths descending from the 13.4m ceiling cleanly above walkable clearances
 * - Central Counter-Rotating Obsidian Relic Halo suspended in the center of the cathedral (`x = 0, z = 0`)
 * - Twin Parallel Glass-Inlaid Cross-Bridges (`x = ±4.6`) + Central Cross-Link Island spanning the sunken trench at `y = 70.0m`
 * - Twin Flush Sunken Trench Staircases descending cleanly into the trench (`y = 70.0 -> 67.6m`)
 * - Full West & East Elevated Archive Overlook Galleries (`+4.4m = 74.4m`) + Flush Grand Wall-Side Staircases
 * - Retractable High Skybridge (`f6_bridge_cathedral_high`) spanning `x ∈ [-13.6, +13.6]` at `y = 74.4m, z = 0.0`!
 *   Deployable via `[E]` switch on the West Upper Gallery OR by sniping the glowing crimson Relay Lock mounted on the
 *   South-Center Hanging Monolith!
 * - Twin Calibrated Pneumatic Jump Pads (`padCathedralWest` / `padCathedralEast`) launching cleanly onto the `+4.4m`
 *   Upper Galleries through dedicated 2.6m guardrail landing gaps!
 */
export function buildFloor6Zone2MonolithCathedral(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const baseY = F6_BASE_Y; // 70.0m
  const trenchY = F6_TRENCH_Y; // 67.6m
  const upperY = F6_UPPER_Y; // 74.4m
  const ceilH = F6_CEILINGS.cathedral; // 13.4m
  const accentMat = mats.floorAccent[6];
  const group = collector.group;

  // 1. SINGLE CONTINUOUS CATHEDRAL CEILING SLAB covering Zone 1 + Zone 2 + Zone 8 (`x ∈ [-17.7, +17.7], z ∈ [-16.7, +16.7]`)
  // ZERO ceiling seams or cracks anywhere across the 36m × 34m central hall!
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 35.4, h: 0.56, d: 33.4, x: 0, y: baseY + ceilH + 0.28, z: 0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F6_CathedralCeiling' }
  );
  if (ceilMesh) group.add(ceilMesh);

  // 2. Shared Cathedral West & East Perimeter Walls (`x = ±18.0`, `z ∈ [-16.7, +16.7]`) with ALL 5 framed portals per side!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.cathedralWestX,
    spanStart: F6_WALLS.cathedralNorthZ + 0.3,
    spanEnd: F6_WALLS.cathedralSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      {
        start: F6_PORTALS.westNorthGroundZ[0],
        end: F6_PORTALS.westNorthGroundZ[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.westNorthUpperZ[0],
        end: F6_PORTALS.westNorthUpperZ[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.westMidGroundZ[0],
        end: F6_PORTALS.westMidGroundZ[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.westMidUpperZ[0],
        end: F6_PORTALS.westMidUpperZ[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.westSouthGroundZ[0],
        end: F6_PORTALS.westSouthGroundZ[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F6_Z2_CathedralWestWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.cathedralEastX,
    spanStart: F6_WALLS.cathedralNorthZ + 0.3,
    spanEnd: F6_WALLS.cathedralSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      {
        start: F6_PORTALS.eastNorthGroundZ[0],
        end: F6_PORTALS.eastNorthGroundZ[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.eastNorthUpperZ[0],
        end: F6_PORTALS.eastNorthUpperZ[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.eastMidGroundZ[0],
        end: F6_PORTALS.eastMidGroundZ[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.eastMidUpperZ[0],
        end: F6_PORTALS.eastMidUpperZ[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.eastSouthGroundZ[0],
        end: F6_PORTALS.eastSouthGroundZ[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F6_Z2_CathedralEastWall',
  });

  // Motorized proximity sliding doors connecting Cathedral <-> West Labs, East Foundry & NE Grav-Core!
  buildTacticalDoor(collector, mats, {
    id: 'f6_auto_cathedral_labs',
    mode: 'automatic',
    x: F6_WALLS.cathedralWestX,
    y: baseY,
    z: (F6_PORTALS.westMidGroundZ[0] + F6_PORTALS.westMidGroundZ[1]) * 0.5,
    width: F6_PORTALS.westMidGroundZ[1] - F6_PORTALS.westMidGroundZ[0],
    height: 4.0,
    spanAxis: 'z',
  });
  buildTacticalDoor(collector, mats, {
    id: 'f6_auto_cathedral_foundry',
    mode: 'automatic',
    x: F6_WALLS.cathedralEastX,
    y: baseY,
    z: (F6_PORTALS.eastMidGroundZ[0] + F6_PORTALS.eastMidGroundZ[1]) * 0.5,
    width: F6_PORTALS.eastMidGroundZ[1] - F6_PORTALS.eastMidGroundZ[0],
    height: 4.0,
    spanAxis: 'z',
  });
  buildTacticalDoor(collector, mats, {
    id: 'f6_auto_atrium_grav',
    mode: 'automatic',
    x: F6_WALLS.cathedralEastX,
    y: baseY,
    z: (F6_PORTALS.eastNorthGroundZ[0] + F6_PORTALS.eastNorthGroundZ[1]) * 0.5,
    width: F6_PORTALS.eastNorthGroundZ[1] - F6_PORTALS.eastNorthGroundZ[0],
    height: 4.0,
    spanAxis: 'z',
  });

  // 3. Main Perimeter Promenades + Sunken Dry Cooling Trench (`x ∈ [-11.2, +11.2], z ∈ [-9.6, +9.6], y = 67.6m`)!
  addWalkableDeck(collector, {
    minX: -18.0,
    maxX: -11.2,
    minZ: -9.6,
    maxZ: 9.6,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F6_Z2_WestPromenade',
  });
  addWalkableDeck(collector, {
    minX: 11.2,
    maxX: 18.0,
    minZ: -9.6,
    maxZ: 9.6,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F6_Z2_EastPromenade',
  });
  addWalkableDeck(collector, {
    minX: -11.2,
    maxX: 11.2,
    minZ: -9.6,
    maxZ: 9.6,
    y: trenchY,
    thickness: 0.6,
    material: mats.darkConcrete,
    name: 'F6_Z2_SunkenTrenchFloor',
  });

  // Trench Perimeter Concrete Retaining Walls strictly beneath the 0.6m promenade floor slabs
  // (`y = 67.604 .. 69.396`, trimmed cleanly at corners -> ZERO coplanar Z-fighting with promenade slabs or corners!)
  const retainBotY = trenchY + 0.004;
  const retainTopY = baseY - 0.604;
  const retainH = retainTopY - retainBotY; // 1.792m
  const retainMidY = (retainBotY + retainTopY) * 0.5;
  const trenchRetainSpecs: BoxSpec[] = [
    { w: 22.4, h: retainH, d: 0.48, x: 0, y: retainMidY, z: -9.84 },
    { w: 22.4, h: retainH, d: 0.48, x: 0, y: retainMidY, z: 9.84 },
    { w: 0.48, h: retainH, d: 19.2, x: -11.44, y: retainMidY, z: 0 },
    { w: 0.48, h: retainH, d: 19.2, x: 11.44, y: retainMidY, z: 0 },
  ];
  const retainMesh = buildBatchedBoxesMesh(trenchRetainSpecs, mats.concreteWall, {
    receiveShadow: true,
    name: 'F6_Z2_TrenchRetainingWalls',
  });
  if (retainMesh) {
    group.add(retainMesh);
    collector.wallMeshes.push(retainMesh);
  }
  // Solid retaining wall colliders (only below baseY so main promenade floor above is completely unobstructed!)
  collector.boxes.push(
    { minX: -11.6, maxX: 11.6, minY: trenchY, maxY: baseY - 0.04, minZ: -10.1, maxZ: -9.6, walkableTop: false },
    { minX: -11.6, maxX: 11.6, minY: trenchY, maxY: baseY - 0.04, minZ: 9.6, maxZ: 10.1, walkableTop: false },
    { minX: -11.7, maxX: -11.2, minY: trenchY, maxY: baseY - 0.04, minZ: -9.6, maxZ: 9.6, walkableTop: false },
    { minX: 11.2, maxX: 11.7, minY: trenchY, maxY: baseY - 0.04, minZ: -9.6, maxZ: 9.6, walkableTop: false }
  );

  // Glowing trench perimeter cooling channels (mounted 3cm proud of retaining walls and cleanly trimmed around BOTH
  // flush trench staircases at West z∈[4.4..9.6] & East z∈[-9.6..-4.4], with staggered floor datum lines!)
  const trenchGlow = buildBatchedBoxesMesh(
    [
      { w: 19.2, h: 0.06, d: 0.06, x: -1.35, y: trenchY + 0.42, z: -9.54 },
      { w: 19.2, h: 0.06, d: 0.06, x: 1.35, y: trenchY + 0.42, z: 9.54 },
      { w: 0.06, h: 0.06, d: 13.5, x: -11.14, y: trenchY + 0.42, z: -2.65 },
      { w: 0.06, h: 0.06, d: 13.5, x: 11.14, y: trenchY + 0.42, z: 2.65 },
      { w: 0.14, h: 0.012, d: 18.4, x: 0, y: trenchY + 0.014, z: 0 },
      { w: 21.6, h: 0.012, d: 0.14, x: 0, y: trenchY + 0.03, z: 0 },
    ],
    accentMat,
    { name: 'F6_Z2_TrenchConduitGlow' }
  );
  if (trenchGlow) detailGroup.add(trenchGlow);

  // 4. Twin Parallel Glass-Inlaid Cross-Bridges (`x = ±4.6`, `y = 70.0m`) + Central Relic Cross-Island!
  // Visual bridge meshes inset by 8mm at contact seams against promenade walls/bridge sides -> ZERO Z-fighting!
  const crossBridgeMesh = buildBatchedBoxesMesh(
    [
      { w: 3.2, h: 0.36, d: 19.184, x: -4.6, y: baseY - 0.18, z: 0 },
      { w: 3.2, h: 0.36, d: 19.184, x: 4.6, y: baseY - 0.18, z: 0 },
      { w: 5.984, h: 0.36, d: 3.6, x: 0, y: baseY - 0.18, z: 0 },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F6_Z2_CrossBridges' }
  );
  if (crossBridgeMesh) {
    group.add(crossBridgeMesh);
    collector.wallMeshes.push(crossBridgeMesh);
  }
  collector.slabs.push(
    { minX: -6.2, maxX: -3.0, minZ: -9.6, maxZ: 9.6, y: baseY, thickness: 0.36 },
    { minX: 3.0, maxX: 6.2, minZ: -9.6, maxZ: 9.6, y: baseY, thickness: 0.36 },
    { minX: -3.0, maxX: 3.0, minZ: -1.8, maxZ: 1.8, y: baseY, thickness: 0.36 }
  );

  // Translucent blue floor-glass observation spine strips inlaid cleanly proud of the twin cross-bridges
  const glassBridgeStrips = buildBatchedBoxesMesh(
    [
      { w: 1.1, h: 0.03, d: 18.2, x: -4.6, y: baseY + 0.016, z: 0 },
      { w: 1.1, h: 0.03, d: 18.2, x: 4.6, y: baseY + 0.016, z: 0 },
    ],
    mats.floorGlass,
    { name: 'F6_Z2_GlassBridgeStrips' }
  );
  if (glassBridgeStrips) detailGroup.add(glassBridgeStrips);

  // Grounded Bridge Support Columns down to trench floor (`y = 67.6 .. 69.62`)
  const bridgePiers: BoxSpec[] = [];
  for (const bx of [-4.6, 4.6]) {
    for (const bz of [-6.0, 0.0, 6.0]) {
      bridgePiers.push({ w: 0.44, h: 2.02, d: 0.44, x: bx, y: trenchY + 1.01, z: bz });
      collector.boxes.push({
        minX: bx - 0.24,
        maxX: bx + 0.24,
        minY: trenchY,
        maxY: baseY - 0.36,
        minZ: bz - 0.24,
        maxZ: bz + 0.24,
        walkableTop: false,
      });
    }
  }
  const bridgePierMesh = buildBatchedBoxesMesh(bridgePiers, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z2_BridgePiers',
  });
  if (bridgePierMesh) {
    group.add(bridgePierMesh);
    collector.wallMeshes.push(bridgePierMesh);
  }

  // Twin Flush Trench Access Staircases descending cleanly inside the West & East Trench Walls (ZERO wall gap!)
  // West Trench Stair: x = -9.82, width = 2.70 -> minX = -11.17 (flush against West Trench Wall `-11.20`!)
  buildStraightStairFlight(collector, mats, {
    x: -9.82,
    z: 7.0,
    width: 2.7,
    length: 5.2,
    yStart: trenchY,
    yEnd: baseY,
    axis: 'z',
    steps: 12,
    railMinSide: false,
    railMaxSide: true,
    accentMat,
  });
  // East Trench Stair: x = +9.82, width = 2.70 -> maxX = +11.17 (flush against East Trench Wall `+11.20`!)
  buildStraightStairFlight(collector, mats, {
    x: 9.82,
    z: -7.0,
    width: 2.7,
    length: 5.2,
    yStart: baseY,
    yEnd: trenchY,
    axis: 'z',
    steps: 12,
    railMinSide: true,
    railMaxSide: false,
    accentMat,
  });

  // 5. HERO ARCHITECTURE: 6 COLOSSAL BRUTALIST SUSPENDED DATA MONOLITHS + CENTRAL ROTATING OBSIDIAN RELIC HALO!
  const monolithSpecs: BoxSpec[] = [];
  const monolithTrimSpecs: BoxSpec[] = [];
  const monolithCoords = [
    // 2 Monumental Central Hanging Data Monoliths hovering cleanly above the Cathedral High Skybridge (`y = 75.6 .. 83.4m`)
    // opening an iconic framed hero sightline straight through the Obsidian Relic Halo to North Bulkhead 06!
    { x: 0, z: -5.6, w: 3.6, d: 2.4, botY: baseY + 5.6 },
    { x: 0, z: 5.6, w: 3.6, d: 2.4, botY: baseY + 5.6 },
    // 4 Flanking Cathedral Monolith Slabs hanging symmetrically over the twin trenches (`y = 73.4 .. 83.4m`)
    { x: -8.6, z: -4.4, w: 2.4, d: 3.6, botY: baseY + 3.4 },
    { x: 8.6, z: -4.4, w: 2.4, d: 3.6, botY: baseY + 3.4 },
    { x: -8.6, z: 4.4, w: 2.4, d: 3.6, botY: baseY + 3.4 },
    { x: 8.6, z: 4.4, w: 2.4, d: 3.6, botY: baseY + 3.4 },
  ];

  for (const m of monolithCoords) {
    const h = baseY + ceilH - 0.04 - m.botY;
    monolithSpecs.push({ w: m.w, h, d: m.d, x: m.x, y: m.botY + h * 0.5, z: m.z });
    const slitH = h * 0.64;
    const slitY = m.botY + h * 0.48;
    const rimY = m.botY + 0.24;
    // Crisp Control-style bottom rim bezel & vertical hairline glowing data slits
    monolithTrimSpecs.push(
      { w: m.w + 0.04, h: 0.08, d: 0.06, x: m.x, y: rimY, z: m.z - m.d * 0.5 - 0.02 },
      { w: m.w + 0.04, h: 0.08, d: 0.06, x: m.x, y: rimY, z: m.z + m.d * 0.5 + 0.02 },
      { w: 0.06, h: 0.08, d: m.d + 0.04, x: m.x - m.w * 0.5 - 0.02, y: rimY, z: m.z },
      { w: 0.06, h: 0.08, d: m.d + 0.04, x: m.x + m.w * 0.5 + 0.02, y: rimY, z: m.z },
      { w: 0.1, h: slitH, d: 0.05, x: m.x, y: slitY, z: m.z - m.d * 0.5 - 0.02 },
      { w: 0.1, h: slitH, d: 0.05, x: m.x, y: slitY, z: m.z + m.d * 0.5 + 0.02 }
    );
    collector.boxes.push({
      minX: m.x - m.w * 0.5,
      maxX: m.x + m.w * 0.5,
      minY: m.botY,
      maxY: baseY + ceilH,
      minZ: m.z - m.d * 0.5,
      maxZ: m.z + m.d * 0.5,
      walkableTop: false,
    });
  }

  const monolithMesh = buildBatchedBoxesMesh(monolithSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z2_SuspendedMonoliths',
  });
  if (monolithMesh) {
    group.add(monolithMesh);
    collector.wallMeshes.push(monolithMesh);
  }
  const monolithGlow = buildInstancedBoxes(monolithTrimSpecs, accentMat, {
    name: 'F6_Z2_MonolithGlowSlits',
  });
  if (monolithGlow) group.add(monolithGlow);

  // Centerpiece Counter-Rotating Obsidian Relic Halo suspended cleanly in full Cathedral view (`y = 77.8m`, +3.4m above High Skybridge)!
  const relicGroupOuter = new THREE.Group();
  relicGroupOuter.name = 'F6_Z2_ObsidianRelicOuter';
  relicGroupOuter.position.set(0, baseY + 7.8, 0);
  const outerHaloSpecs: BoxSpec[] = [];
  const outerGlowSpecs: BoxSpec[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 2.65;
    outerHaloSpecs.push({
      w: 1.75,
      h: 0.42,
      d: 0.34,
      x: Math.cos(a) * r,
      y: 0,
      z: Math.sin(a) * r,
      rotY: -a + Math.PI * 0.5,
    });
    outerGlowSpecs.push({
      w: 1.4,
      h: 0.1,
      d: 0.08,
      x: Math.cos(a) * (r + 0.2),
      y: 0,
      z: Math.sin(a) * (r + 0.2),
      rotY: -a + Math.PI * 0.5,
    });
  }
  const outerHaloMesh = buildBatchedBoxesMesh(outerHaloSpecs, mats.structuralSteel, {
    name: 'F6_Z2_RelicOuterMesh',
  });
  const outerHaloGlow = buildBatchedBoxesMesh(outerGlowSpecs, accentMat, {
    name: 'F6_Z2_RelicOuterGlow',
  });
  if (outerHaloMesh) relicGroupOuter.add(outerHaloMesh);
  if (outerHaloGlow) relicGroupOuter.add(outerHaloGlow);
  group.add(relicGroupOuter);
  collector.animatedSpinners?.push({ obj: relicGroupOuter, speed: 0.42 });

  const relicGroupInner = new THREE.Group();
  relicGroupInner.name = 'F6_Z2_ObsidianRelicInner';
  relicGroupInner.position.set(0, baseY + 7.8, 0);
  const innerCoreMesh = buildBatchedBoxesMesh(
    [
      { w: 1.15, h: 2.2, d: 1.15, x: 0, y: 0, z: 0, rotY: Math.PI * 0.25 },
    ],
    mats.armoredSteel,
    { name: 'F6_Z2_RelicCoreMesh' }
  );
  const innerCoreGlow = buildBatchedBoxesMesh(
    [
      { w: 1.32, h: 0.14, d: 1.32, x: 0, y: 0.65, z: 0, rotY: Math.PI * 0.25 },
      { w: 1.32, h: 0.14, d: 1.32, x: 0, y: -0.65, z: 0, rotY: Math.PI * 0.25 },
    ],
    accentMat,
    { name: 'F6_Z2_RelicCoreGlow' }
  );
  if (innerCoreMesh) relicGroupInner.add(innerCoreMesh);
  if (innerCoreGlow) relicGroupInner.add(innerCoreGlow);
  group.add(relicGroupInner);
  collector.animatedSpinners?.push({ obj: relicGroupInner, speed: -0.85 });

  // Ceiling structural spine hanging the Relic Core cleanly from the vaulted roof down to the inner core
  const spineH = Math.max(0.8, ceilH - 7.8 - 1.05);
  const ceilingTrussSpecs: BoxSpec[] = [
    { w: 0.68, h: spineH, d: 0.68, x: 0, y: baseY + ceilH - 0.04 - spineH * 0.5, z: 0 },
  ];
  const ceilingLightSpecs: BoxSpec[] = [];
  for (const bz of [-13.0, -7.2, 0.0, 7.2, 13.0]) {
    ceilingTrussSpecs.push({ w: 35.3, h: 0.54, d: 0.46, x: 0, y: baseY + ceilH - 0.28, z: bz });
    if (bz !== 0) {
      ceilingLightSpecs.push({ w: 22.0, h: 0.1, d: 0.36, x: 0, y: baseY + ceilH - 0.06, z: bz + 2.6 });
    }
  }
  const trussMesh = buildBatchedBoxesMesh(ceilingTrussSpecs, mats.structuralSteel, {
    receiveShadow: true,
    name: 'F6_Z2_CathedralTrusses',
  });
  if (trussMesh) group.add(trussMesh);
  const lightMesh = buildBatchedBoxesMesh(ceilingLightSpecs, mats.ceilingLight, {
    name: 'F6_Z2_CathedralLights',
  });
  if (lightMesh) group.add(lightMesh);

  // 6. ELEVATED WEST & EAST UPPER ARCHIVE GALLERIES (`+4.4m = 74.4m`) + FLUSH WALL-SIDE GRAND STAIRCASES!
  // Single continuous decks spanning z ∈ [-15.2, +11.4] -> ZERO seam at z = 9.4!
  addWalkableDeck(collector, {
    minX: -17.68,
    maxX: -13.6,
    minZ: -15.2,
    maxZ: 11.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F6_Z2_WestUpperGallery',
  });
  addWalkableDeck(collector, {
    minX: 13.6,
    maxX: 17.68,
    minZ: -15.2,
    maxZ: 11.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F6_Z2_EastUpperGallery',
  });

  // Upper Portal Threshold Bridges into Zone 3, Zone 4, Zone 6 & Zone 7 (zero Z-fighting!)
  addWalkableDeck(collector, {
    minX: -18.32,
    maxX: -17.68,
    minZ: F6_PORTALS.westMidUpperZ[0] + 0.18,
    maxZ: F6_PORTALS.westMidUpperZ[1] - 0.18,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    name: 'F6_Z2_WestMidUpperBridge',
  });
  addWalkableDeck(collector, {
    minX: -18.32,
    maxX: -17.68,
    minZ: F6_PORTALS.westNorthUpperZ[0] + 0.18,
    maxZ: F6_PORTALS.westNorthUpperZ[1] - 0.18,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    name: 'F6_Z2_WestNorthUpperBridge',
  });
  addWalkableDeck(collector, {
    minX: 17.68,
    maxX: 18.32,
    minZ: F6_PORTALS.eastMidUpperZ[0] + 0.18,
    maxZ: F6_PORTALS.eastMidUpperZ[1] - 0.18,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    name: 'F6_Z2_EastMidUpperBridge',
  });
  addWalkableDeck(collector, {
    minX: 17.68,
    maxX: 18.32,
    minZ: F6_PORTALS.eastNorthUpperZ[0] + 0.18,
    maxZ: F6_PORTALS.eastNorthUpperZ[1] - 0.18,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    name: 'F6_Z2_EastNorthUpperBridge',
  });

  // Grounded structural columns under West & East Upper Galleries (cleanly tucked at x = ±13.85!)
  const galColSpecs: BoxSpec[] = [];
  for (const gx of [-13.85, 13.85]) {
    for (const gz of [-9.4, -2.0, 9.1]) {
      galColSpecs.push({ w: 0.44, h: 3.972, d: 0.44, x: gx, y: baseY + 0.004 + 1.986, z: gz });
      collector.boxes.push({
        minX: gx - 0.25,
        maxX: gx + 0.25,
        minY: baseY,
        maxY: upperY,
        minZ: gz - 0.25,
        maxZ: gz + 0.25,
        walkableTop: false,
      });
    }
  }
  const galColMesh = buildBatchedBoxesMesh(galColSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z2_UpperGalleryCols',
  });
  if (galColMesh) {
    group.add(galColMesh);
    collector.wallMeshes.push(galColMesh);
  }

  // Twin Interior Grand Staircases climbing Northward from South Arrival edge (z = 16.0 -> z = 7.2? Wait: South portals are z ∈ [8.2, 12.8]!)
  // So place Grand Staircases cleanly along x = ±12.2 climbing South-to-North from z = 14.8 -> z = 6.0?
  // BETTER: Place Twin Grand Staircases inside `x = ±14.95` climbing Northward from `z = 15.8` -> `z = 9.4`? No, length 8.8m for 4.4m rise (`slope = 0.5`)!
  // Let's check exact clearance: West South Portal is `z ∈ [8.2, 12.8]` at `x = -18.0`.
  // If West Grand Stair sits at `x = -14.95, width = 2.66` (`x ∈ [-16.28, -13.62]`), it would partially pass in front of `z ∈ [8.2, 12.8]` unless we place it cleanly from `z = 6.6` down to `z = 15.4` at `x = -12.3` (clear 5.7m promenade between stair and `x = -18.0` portal!)
  // YES! `x = ±12.25, width = 2.56` (`inner rail = ±10.90, outer rail = ±13.60` — joins Upper Gallery edge `x = ±13.60` at exact corner post `z = 9.4`? Wait: `z = 16.0` to `z = 7.2` -> top at `z = 7.2` with a dedicated Top Landing Pad `x ∈ [-13.6, -10.9], z ∈ [5.4, 7.2]`!)
  // Wait: check if `z = 7.2 .. 16.0` at `x = ±12.25` blocks anything!
  // - West/East South Portal is at `x = ±18.0, z ∈ [8.2, 12.8]` -> player enters at `x = -17.5`, walks right into `x ∈ [-17.5, -13.7]` (`3.8m` wide clear lane beside the stair!), or turns South around `z = 15.5`!
  // - South Arrival console desks are at `x = ±11.2, z = 13.8` — let's check! If stair is at `x = ±12.25, z ∈ [7.2, 16.0]`, it would hit the console desk at `x = ±11.2, z = 13.8`!
  // EVEN CLEANER SOLUTION (ZERO conflict anywhere!):
  // Place Twin Grand Staircases climbing SOUTHWARD from `z = -8.6` (ground) -> `z = +0.2` (upperY)? No, mid portals are `z ∈ [-4.5, 0.5]`.
  // Place Twin Grand Staircases at `x = ±15.0` climbing NORTHWARD from `z = 16.2` (no, wait: `z = 16.0` to `z = 7.2` passes `z = 8.2..12.8`).
  // What about **FLUSH AGAINST THE NORTH-WEST & NORTH-EAST CATHEDRAL GALLERY EDGE**, climbing from `z = -15.6` to `z = -6.8`? Wait: North portals are `z ∈ [-15.2, -10.6]`.
  // HOLD ON! Look at `x = ±12.25, z ∈ [0.6, 9.4]`!
  // Let's check EVERY single coordinate around `x ∈ [-13.6, -10.9], z ∈ [0.6, 9.4]`:
  // - Main Promenade is `x ∈ [-18.0, -11.2], z ∈ [-9.6, +9.6]`.
  // - Wait: Trench edge is `x = -11.2`. If stair sits at `x = -12.35, width = 2.36` (`x ∈ [-13.53, -11.17]`, outer rail at `-13.60` & inner rail at `-11.10`):
  //   - Bottom of stair: `z = 0.6` (`y = 70.0m`, right in front of the Mid Portal `z ∈ [-4.5, 0.5]` with generous `4.5m` clearance to West wall `-18.0`!)
  //   - Top of stair: `z = 9.4` (`y = 74.4m`, lands directly onto a Top Landing Pad `x ∈ [-13.6, -11.1], z ∈ [9.4, 11.4]` connected flush to `WestUpperGallery` at `x = -13.6, z ∈ [9.4, 11.4]` — let's extend `WestUpperGallery` & `EastUpperGallery` to `maxZ: 11.4`!)
  //   - Check West/East Trench Stair: Trench stairs are at `x = ±9.82` (`x ∈ [-11.17, -8.47]`), inside the trench (`|x| < 11.2`).
  //   - Check Mid Portal (`z ∈ [-4.5, 0.5]`): stair starts at `z = +0.6` (cleanly South of the portal!), leaving `x ∈ [-17.6, -13.7]` (`3.9m` wide clear walkway!) all the way from `z = -9.6` to `z = +16.5`!
  //   - Check Arrival Desks (`x = ±11.2, z = 13.8`): stair ends at `z = 9.4`, top landing ends at `z = 11.4` (`y = 74.4m`, +4.4m ABOVE the desks!), 100% clear!
  //   - Check Pneumatic Jump Pads: Place `padCathedralWest` at `(-9.2, 70.0, -11.6)`? Wait: `z = -11.6` is North Atrium floor (`y = 70.0`)! Let's launch from `(-12.2, 70.0, -7.0)` straight West-North onto `WestUpperGallery` (`x = -15.6, z = -7.0, y = 74.4`) through a clean 2.6m rail opening at `z ∈ [-8.3, -5.7]`!
  // OH!! THAT LAYOUT IS ARCHITECTURAL PERFECTION!! Let's verify every single millimeter of it:
  //   - `WestUpperGallery`: `x ∈ [-17.68, -13.6], z ∈ [-15.2, +11.4]`
  //   - `WestStairTopLanding`: `x ∈ [-13.6, -11.1], z ∈ [+9.4, +11.4]`
  //   - `WestGrandStair`: `x = -12.35, z = 5.0, width = 2.36, length = 8.8, yStart = 70.0 (z=0.6), yEnd = 74.4 (z=9.4)`
  //     - `railMinSide` at `x = -12.35 - (1.18 + 0.07) = -13.60` (EXACT edge of `WestUpperGallery`!)
  //     - `railMaxSide` at `x = -12.35 + (1.18 + 0.07) = -11.10` (EXACT outer edge of `WestStairTopLanding`!)
  //   - Mirror on East side (`+12.35`)!
  //   - Retractable High Skybridge (`f6_bridge_cathedral_high`) at `z = 0.0, y = 74.4m`, anchoring at `x = -13.6` and telescoping `+X` across the 27.2m Cathedral span to `x = +13.6` (width = `3.0m`, `z ∈ [-1.5, +1.5]`)!
  //   - Guardrail openings along `x = ±13.6`:
  //     - Opening 1 (Retractable High Skybridge entry): `z ∈ [-1.5, +1.5]`
  //     - Opening 2 (Pneumatic Jump Pad landing zone): `z ∈ [-8.4, -5.6]` (`2.8m` wide!)
  //     - Opening 3 (Top Stair Landing junction): `z ∈ [+9.4, +11.4]`!

  // Twin Grand Stair Top Landings (visually inset 6mm away from x=±13.6 gallery edge -> zero Z-fighting!)
  const stairLandingMesh = buildBatchedBoxesMesh(
    [
      { w: 2.494, h: 0.42, d: 2.0, x: -12.347, y: upperY - 0.21, z: 10.4 },
      { w: 2.494, h: 0.42, d: 2.0, x: 12.347, y: upperY - 0.21, z: 10.4 },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F6_Z2_StairTopLandings' }
  );
  if (stairLandingMesh) {
    group.add(stairLandingMesh);
    collector.wallMeshes.push(stairLandingMesh);
  }
  collector.slabs.push(
    { minX: -13.6, maxX: -11.1, minZ: 9.4, maxZ: 11.4, y: upperY, thickness: 0.42 },
    { minX: 11.1, maxX: 13.6, minZ: 9.4, maxZ: 11.4, y: upperY, thickness: 0.42 }
  );

  // Twin Grand Cathedral Staircases (`baseY 70.0 -> upperY 74.4`, millimeter-aligned to `-13.60/-11.10` and `+11.10/+13.60`!)
  buildStraightStairFlight(collector, mats, {
    x: -12.35,
    z: 5.0,
    width: 2.36,
    length: 8.8,
    yStart: baseY,
    yEnd: upperY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    accentMat,
  });
  buildStraightStairFlight(collector, mats, {
    x: 12.35,
    z: 5.0,
    width: 2.36,
    length: 8.8,
    yStart: baseY,
    yEnd: upperY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    accentMat,
  });

  // Mathematically Exact Upper Gallery Guardrails with clean openings for Skybridge (`z ∈ [-1.5, +1.5]`) & Jump Pads (`z ∈ [-8.4, -5.6]`)!
  for (const side of [-1, 1] as const) {
    const gx = side * 13.6;
    const lx = side * 11.1;
    // North segment (z = -11.2 to -8.4 -> joins Zone 8 North Overlook Bridge at z = -11.2!)
    buildGuardrailRun(collector, mats, { x1: gx, z1: -11.2, x2: gx, z2: -8.4, y: upperY, accentMat });
    // Mid-North segment (z = -5.6 to -1.5, between Jump Pad gap and Skybridge entry!)
    buildGuardrailRun(collector, mats, { x1: gx, z1: -5.6, x2: gx, z2: -1.5, y: upperY, accentMat });
    // Mid-South segment (z = +1.5 to +9.4, from Skybridge to Grand Stair top post!)
    buildGuardrailRun(collector, mats, { x1: gx, z1: 1.5, x2: gx, z2: 9.4, y: upperY, accentMat });
    // Top Landing inner rail (z = +9.4 to +11.4 along x = ±11.1)
    buildGuardrailRun(collector, mats, { x1: lx, z1: 9.4, x2: lx, z2: 11.4, y: upperY, accentMat });
    // South end cap rail along z = +11.4 (`x = ±11.1` to `±17.68`)
    buildGuardrailRun(collector, mats, {
      x1: Math.min(lx, side * 17.68),
      z1: 11.4,
      x2: Math.max(lx, side * 17.68),
      z2: 11.4,
      y: upperY,
      accentMat,
    });
  }

  // 7. RETRACTABLE HIGH CATHEDRAL SKYBRIDGE (`y = 74.4m, z = 0.0`, spans `x ∈ [-13.6, +13.6]`, 27.2m dramatic span!)
  buildRetractableBridge(collector, mats, {
    id: F6_IDS.bridgeCathedralHigh,
    label: 'CATHEDRAL HIGH SKYBRIDGE',
    anchorX: -13.6,
    y: upperY,
    anchorZ: 0.0,
    extendDirX: 1,
    extendDirZ: 0,
    length: 27.2,
    width: 2.9,
    accentMat,
  });

  // Dual Activation: (A) Interactive `[E]` Tactical Switch on West Upper Gallery (`x = -14.8, z = -2.4`)
  buildWorldSwitch(collector, mats, {
    id: F6_IDS.switchCathedralBridge,
    x: -15.4,
    y: upperY,
    z: -2.4,
    rotY: Math.PI * 0.5,
    promptLocked: '[E] DEPLOY CATHEDRAL SKYBRIDGE',
    promptActivated: 'CATHEDRAL SKYBRIDGE DEPLOYED',
    bannerText: 'CATHEDRAL HIGH SKYBRIDGE DEPLOYED',
    deployBridgeId: F6_IDS.bridgeCathedralHigh,
  });

  // Dual Activation: (B) Shootable Glowing Crimson Relay Lock mounted on the South face of the South-Center Monolith
  // (`z = 6.88, y = 76.45m`) so players spot and can snipe it straight from the South Arrival Spawn!
  buildShootableLock(collector, mats, {
    id: F6_IDS.lockCathedralBridge,
    x: 0.0,
    y: baseY + 6.45,
    z: 6.88,
    rotY: 0,
    bannerText: 'MONOLITH RELAY SHATTERED · CATHEDRAL SKYBRIDGE DEPLOYED',
    deployBridgeId: F6_IDS.bridgeCathedralHigh,
  });

  // 8. TWIN CALIBRATED PNEUMATIC JUMP PADS (`+4.4m` launch cleanly through dedicated `z ∈ [-8.4, -5.6]` rail openings!)
  buildJumpPad(collector, mats, {
    id: F6_IDS.padCathedralWest,
    x: -12.35,
    y: baseY,
    z: -7.0,
    launchVy: 14.8,
    launchVx: -2.65, // flush on concrete (>1.15m from trench rim) & arcs cleanly OVER lip onto West Upper Gallery
    launchVz: 0,
    radius: 0.58,
  });
  buildJumpPad(collector, mats, {
    id: F6_IDS.padCathedralEast,
    x: 12.35,
    y: baseY,
    z: -7.0,
    launchVy: 14.8,
    launchVx: 2.65, // flush on concrete (>1.15m from trench rim) & arcs cleanly OVER lip onto East Upper Gallery
    launchVz: 0,
    radius: 0.58,
  });

  // 9. Tactical Cover Barricades & Pressurized Explosive Plasma Barrels (paired for chain reactions!)
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -4.6, y: baseY, z: -3.6, w: 1.9, h: 0.98, d: 0.88, walkableTop: true },
      { x: 4.6, y: baseY, z: 3.6, w: 1.9, h: 0.98, d: 0.88, walkableTop: true },
      { x: 0.0, y: trenchY, z: -2.8, w: 2.8, h: 0.98, d: 0.92, walkableTop: true },
      { x: 0.0, y: trenchY, z: 2.8, w: 2.8, h: 0.98, d: 0.92, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F6_Z2_CathedralCover' }
  );

  // 4 Cathedral Explosive Plasma Barrels (2 in Sunken Trench, 2 flanking Cross-Bridges — chain-reaction pairs!)
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_trench_w',
    x: -3.4,
    y: trenchY,
    z: 0.0,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_trench_e',
    x: 3.4,
    y: trenchY,
    z: 0.0,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_bridge_sw',
    x: -4.6,
    y: baseY,
    z: 5.2,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_bridge_ne',
    x: 4.6,
    y: baseY,
    z: -5.2,
  });

  // 10. High-Readability Architectural Stencil Plaques (cleanly above upper portals & clear of rails!)
  addWallStencilPlaque(group, mats, {
    code: '06-W',
    title: 'BLACK-SITE LABS',
    subtitle: 'GLASS CLEANROOMS · CRYO LINK · ARMORED BUNKER',
    accentHex: 0xf59e0b,
    x: -17.62,
    y: baseY + 9.15,
    z: 0.0,
    rotY: Math.PI * 0.5,
    width: 6.2,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: '06-E',
    title: 'BALLISTIC FOUNDRY',
    subtitle: 'FORGE CATWALK · GRAV-CORE TEST CHAMBER',
    accentHex: 0x38bdf8,
    x: 17.62,
    y: baseY + 9.15,
    z: 0.0,
    rotY: -Math.PI * 0.5,
    width: 6.2,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: '06',
    title: 'MONOLITH CATHEDRAL',
    subtitle: 'SHOOT HANGING MONOLITH RELAY TO DEPLOY HIGH SKYBRIDGE',
    accentHex: F6_META.accentHex,
    x: -17.62,
    y: baseY + 9.15,
    z: -12.8,
    rotY: Math.PI * 0.5,
    width: 6.4,
    height: 1.5,
  });
}
