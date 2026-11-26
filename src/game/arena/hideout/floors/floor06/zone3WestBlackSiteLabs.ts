import * as THREE from 'three';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
  buildTacticalConsoleBenches,
  buildWallEquipmentBays,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import type { OcclusionCell } from '../../types';
import { buildExplosiveBarrel, buildJumpPad } from '../../mechanics';
import {
  F6_BASE_Y,
  F6_CEILINGS,
  F6_IDS,
  F6_PORTALS,
  F6_UPPER_Y,
  F6_WALLS,
} from './layout';

/**
 * FLOOR 06 — ZONE 3 (WEST OCCLUSION CELL): BLACK-SITE TACTICAL LABS & GLASS CLEANROOMS
 * Footprint: x ∈ [-44.0, -18.0] (26m wide) × z ∈ [-8.0, +14.0] (22m deep), Ceiling: 9.6m
 *
 * Call of Duty: Modern Warfare Black-Site / Cleanroom Lab Wing:
 * - Central glass-walled Cleanroom Analysis Pod (`3.4m` tall) with wide CQB breach doorways & panoramic glass sightlines
 * - Elevated Upper Lab Observation Catwalk (`+4.4m = 74.4m`) linking Zone 2 Cathedral <-> Zone 7 Cryo Vault
 * - Flush West Wall Staircase (`x = -42.32`, ZERO wall gap!) + Calibrated Pneumatic Jump Pad (`padWestLabs`)
 * - Jammed Half-Open Roll-Under Blast Shutter (`f6_jammed_labs_cryo`) & Motorized Proximity Doors into Cryo Vault & SW Bunker
 */
export function buildFloor6Zone3WestBlackSiteLabs(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F6_BASE_Y;
  const upperY = F6_UPPER_Y;
  const ceilH = F6_CEILINGS.westLabs; // 9.6m
  const labAccent = mats.floorAccent[7]; // Crisp high-contrast warm amber lab trim!

  const wingGroup = new THREE.Group();
  wingGroup.name = 'F6_Z3_WEST_LABS_CELL';
  collector.group.add(wingGroup);

  // 1. Floor Slab & Watertight Ceiling Slab (`x ∈ [-43.7, -18.3], z ∈ [-7.7, +13.7]`)
  addWalkableDeck(collector, {
    minX: F6_WALLS.westOuterX,
    maxX: F6_WALLS.cathedralWestX,
    minZ: F6_WALLS.northWingsSplitZ,
    maxZ: F6_WALLS.westSouthSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F6_Z3_LabsFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 25.4, h: 0.6, d: 21.4, x: -31.0, y: baseY + ceilH + 0.3, z: 3.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F6_Z3_LabsCeiling' }
  );
  if (ceilMesh) wingGroup.add(ceilMesh);

  // 2. Perimeter & Shared Divider Walls (East wall x = -18.0 owned by Zone 2 Cathedral!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.westOuterX,
    spanStart: F6_WALLS.northWingsSplitZ + 0.3,
    spanEnd: F6_WALLS.westSouthSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    targetGroup: wingGroup,
    name: 'F6_Z3_WestOuterWall',
  });

  // North Shared Wall (z = -8.0 -> Zone 7 NW Cryo Vault) with Jammed Roll Shutter, Auto Door & Upper Catwalk Arch!
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.northWingsSplitZ,
    spanStart: F6_WALLS.westOuterX - 0.3,
    spanEnd: F6_WALLS.cathedralWestX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: mats.floorAccent[3], // Frost cyan indicator for Cryo Sanctum!
    targetGroup: wingGroup,
    portals: [
      {
        start: F6_PORTALS.labsToCryoJammedX[0],
        end: F6_PORTALS.labsToCryoJammedX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.labsToCryoAutoX[0],
        end: F6_PORTALS.labsToCryoAutoX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.labsToCryoUpperX[0],
        end: F6_PORTALS.labsToCryoUpperX[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F6_Z3_NorthCryoWall',
  });

  // South Shared Wall (z = +14.0 -> Zone 5 SW Armored Bunker)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.westSouthSplitZ,
    spanStart: F6_WALLS.westOuterX - 0.3,
    spanEnd: F6_WALLS.cathedralWestX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: labAccent,
    targetGroup: wingGroup,
    portals: [
      {
        start: F6_PORTALS.labsToBunkerWestX[0],
        end: F6_PORTALS.labsToBunkerWestX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.labsToBunkerEastX[0],
        end: F6_PORTALS.labsToBunkerEastX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F6_Z3_SouthBunkerWall',
  });

  // Interactive Tactical Doors along Zone 3 North & South portals!
  buildTacticalDoor(collector, mats, {
    id: F6_IDS.jammedLabsCryo,
    mode: 'jammed_roll',
    x: (F6_PORTALS.labsToCryoJammedX[0] + F6_PORTALS.labsToCryoJammedX[1]) * 0.5,
    y: baseY,
    z: F6_WALLS.northWingsSplitZ,
    width: F6_PORTALS.labsToCryoJammedX[1] - F6_PORTALS.labsToCryoJammedX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: wingGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f6_auto_labs_cryo',
    mode: 'automatic',
    x: (F6_PORTALS.labsToCryoAutoX[0] + F6_PORTALS.labsToCryoAutoX[1]) * 0.5,
    y: baseY,
    z: F6_WALLS.northWingsSplitZ,
    width: F6_PORTALS.labsToCryoAutoX[1] - F6_PORTALS.labsToCryoAutoX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: wingGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f6_auto_labs_bunker',
    mode: 'automatic',
    x: (F6_PORTALS.labsToBunkerWestX[0] + F6_PORTALS.labsToBunkerWestX[1]) * 0.5,
    y: baseY,
    z: F6_WALLS.westSouthSplitZ,
    width: F6_PORTALS.labsToBunkerWestX[1] - F6_PORTALS.labsToBunkerWestX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: wingGroup,
  });

  // 3. CENTRAL BLACK-SITE GLASS CLEANROOM LAB POD (`x ∈ [-33.6, -24.4], z ∈ [-1.6, +6.4]`, height = 3.4m)
  const podH = 3.4;
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -1.6,
    spanStart: -33.6,
    spanEnd: -24.4,
    baseY,
    height: podH,
    thickness: 0.34,
    wallMat: mats.concreteWallLight,
    accentMat: labAccent,
    targetGroup: wingGroup,
    portals: [
      { start: -30.8, end: -27.2, bottomY: baseY, topY: baseY + 2.8, kind: 'door', framed: true },
    ],
    name: 'F6_Z3_CleanroomNorthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 6.4,
    spanStart: -33.6,
    spanEnd: -24.4,
    baseY,
    height: podH,
    thickness: 0.34,
    wallMat: mats.concreteWallLight,
    accentMat: labAccent,
    targetGroup: wingGroup,
    portals: [
      { start: -30.8, end: -27.2, bottomY: baseY, topY: baseY + 2.8, kind: 'door', framed: true },
    ],
    name: 'F6_Z3_CleanroomSouthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -33.6,
    spanStart: -1.43,
    spanEnd: 6.23,
    baseY,
    height: podH,
    thickness: 0.34,
    wallMat: mats.concreteWallLight,
    targetGroup: wingGroup,
    portals: [
      { start: -0.2, end: 5.0, bottomY: baseY + 1.05, topY: baseY + 2.65, kind: 'window', framed: true },
    ],
    name: 'F6_Z3_CleanroomWestWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -24.4,
    spanStart: -1.43,
    spanEnd: 6.23,
    baseY,
    height: podH,
    thickness: 0.34,
    wallMat: mats.concreteWallLight,
    targetGroup: wingGroup,
    portals: [
      { start: -0.2, end: 5.0, bottomY: baseY + 1.05, topY: baseY + 2.65, kind: 'window', framed: true },
    ],
    name: 'F6_Z3_CleanroomEastWall',
  });

  // Cleanroom dark-steel top capping channels (non-overlapping butt joints!)
  const podCapMesh = buildBatchedBoxesMesh(
    [
      { w: 9.54, h: 0.14, d: 0.42, x: -29.0, y: baseY + podH + 0.072, z: -1.6 },
      { w: 9.54, h: 0.14, d: 0.42, x: -29.0, y: baseY + podH + 0.072, z: 6.4 },
      { w: 0.42, h: 0.14, d: 7.58, x: -33.6, y: baseY + podH + 0.072, z: 2.4 },
      { w: 0.42, h: 0.14, d: 7.58, x: -24.4, y: baseY + podH + 0.072, z: 2.4 },
    ],
    mats.armoredSteel,
    { castShadow: true, receiveShadow: true, name: 'F6_Z3_CleanroomCaps' }
  );
  if (podCapMesh) wingGroup.add(podCapMesh);

  // 4. ELEVATED UPPER LAB OBSERVATION CATWALK (`+4.4m = 74.4m`) + FLUSH WEST WALL STAIRCASE + JUMP PAD!
  // Deck A: West Spine Catwalk (`x ∈ [-43.68, -38.4], z ∈ [-7.68, +4.4]`)
  addWalkableDeck(collector, {
    minX: -43.68,
    maxX: -38.4,
    minZ: -7.68,
    maxZ: 4.4,
    y: upperY,
    thickness: 0.4,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z3_WestLabCatwalk',
  });
  // Deck B: Corner Pad joining West Spine -> East Connector (`x ∈ [-40.9, -38.4], z ∈ [+4.4, +6.4]`)
  addWalkableDeck(collector, {
    minX: -40.9,
    maxX: -38.4,
    minZ: 4.4,
    maxZ: 6.4,
    y: upperY,
    thickness: 0.4,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z3_CatwalkCornerPad',
  });
  // Deck C: East Connector Bridge spanning straight over the Cleanroom to Zone 2 Cathedral (`x ∈ [-38.4, -18.32], z ∈ [+2.0, +6.4]`)!
  addWalkableDeck(collector, {
    minX: -38.4,
    maxX: -18.32,
    minZ: 2.0,
    maxZ: 6.4,
    y: upperY,
    thickness: 0.4,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z3_CathedralUpperLink',
  });
  // Portal Threshold Bridge through z = -8.0 into Zone 7 Cryo Vault!
  addWalkableDeck(collector, {
    minX: F6_PORTALS.labsToCryoUpperX[0] + 0.18,
    maxX: F6_PORTALS.labsToCryoUpperX[1] - 0.18,
    minZ: -8.32,
    maxZ: -7.68,
    y: upperY,
    thickness: 0.4,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    name: 'F6_Z3_CryoUpperThreshold',
  });

  // FLUSH West Wall Staircase: climbs Northward from z = +13.2 (baseY 70.0) -> z = +4.4 (upperY 74.4)
  // x = -42.32, width = 2.70 -> minX = -43.67 (FLUSH against West Wall `-43.70`!), railMaxSide at EXACT `x = -40.90`!
  buildStraightStairFlight(collector, mats, {
    x: -42.32,
    z: 8.8,
    width: 2.7,
    length: 8.8,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: false,
    railMaxSide: true,
    targetGroup: wingGroup,
    accentMat: labAccent,
  });

  // Mathematically Exact Catwalk Guardrails (with dedicated 2.8m Jump Pad opening at `z ∈ [-4.0, -1.2]` along `x = -38.4`!)
  buildGuardrailRun(collector, mats, {
    x1: -38.4,
    z1: -7.68,
    x2: -38.4,
    z2: -4.0,
    y: upperY,
    accentMat: labAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -38.4,
    z1: -1.2,
    x2: -38.4,
    z2: 2.0,
    y: upperY,
    accentMat: labAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -38.4,
    z1: 2.0,
    x2: -18.32,
    z2: 2.0,
    y: upperY,
    accentMat: labAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -40.9,
    z1: 6.4,
    x2: -18.32,
    z2: 6.4,
    y: upperY,
    accentMat: labAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -40.9,
    z1: 4.4,
    x2: -40.9,
    z2: 6.4,
    y: upperY,
    accentMat: labAccent,
    targetGroup: wingGroup,
  });

  // Calibrated Pneumatic Jump Pad (`padWestLabs`) launching cleanly West onto West Spine Catwalk (`z = -2.6`)!
  buildJumpPad(collector, mats, {
    id: F6_IDS.padWestLabs,
    x: -36.2,
    y: baseY,
    z: -2.6,
    launchVy: 13.4,
    launchVx: -3.5, // lands squarely on West Lab Catwalk (`x ∈ [-43.68, -38.4], y = 74.4`)
    launchVz: 0,
    targetGroup: wingGroup,
  });

  // 5. Overhead Steel Trusses, Grounded Catwalk Support Columns, Ceiling Lights & Non-Clipping Wall Accents
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];

  for (let z = -5.0; z <= 11.0; z += 5.2) {
    steelSpecs.push({ w: 25.32, h: 0.44, d: 0.38, x: -31.0, y: baseY + ceilH - 0.23, z });
    lightSpecs.push({ w: 18.0, h: 0.08, d: 0.3, x: -31.0, y: baseY + ceilH - 0.06, z: z + 2.4 });
  }
  for (const [cx, cz] of [
    [-38.62, -7.2],
    [-38.62, 2.22],
    [-38.62, 6.18],
    [-21.2, 2.22],
    [-21.2, 6.18],
  ] as const) {
    steelSpecs.push({ w: 0.4, h: 3.992, d: 0.4, x: cx, y: baseY + 0.004 + 1.996, z: cz });
    collector.boxes.push({
      minX: cx - 0.24,
      maxX: cx + 0.24,
      minY: baseY,
      maxY: upperY,
      minZ: cz - 0.24,
      maxZ: cz + 0.24,
      walkableTop: false,
    });
  }

  // Clean floor guidance stripes + West wall accent strictly above LabLockers (`h = 3.0m`)!
  accSpecs.push(
    { w: 0.08, h: 0.08, d: 11.0, x: -43.64, y: baseY + 3.24, z: -1.6 },
    { w: 0.12, h: 0.012, d: 18.0, x: -21.8, y: baseY + 0.008, z: 3.0 },
    { w: 0.12, h: 0.012, d: 12.0, x: -35.8, y: baseY + 0.008, z: 4.5 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z3_LabsSteel',
  });
  if (steelMesh) {
    wingGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F6_Z3_LabsLights' });
  if (lightMesh) wingGroup.add(lightMesh);
  const accMesh = buildBatchedBoxesMesh(accSpecs, labAccent, { name: 'F6_Z3_LabsAccents' });
  if (accMesh) wingGroup.add(accMesh);

  // 6. Lab Cleanroom Workstations, Wall Equipment Bays, Cover Barricades & Explosive Plasma Barrels!
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'z', coord: -43.7, inwardDir: 1, centerAlong: -2.0, baseY, width: 5.0, height: 3.0, depth: 0.54 },
    ],
    { targetGroup: wingGroup, accentMat: labAccent, name: 'F6_Z3_LabLockers' }
  );
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      // Cleanroom interior diagnostic consoles
      { x: -31.8, y: baseY, z: 2.4, w: 1.0, h: 0.96, d: 3.8 },
      { x: -26.2, y: baseY, z: 2.4, w: 1.0, h: 0.96, d: 3.8 },
      // South-West staging bench
      { x: -35.6, y: baseY, z: 11.4, w: 3.0, h: 0.98, d: 1.05 },
    ],
    { targetGroup: wingGroup, accentMat: labAccent, name: 'F6_Z3_LabConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -21.2, y: baseY, z: 9.8, w: 2.6, h: 1.0, d: 0.98, walkableTop: true },
      { x: -29.0, y: baseY, z: -4.8, w: 2.8, h: 1.0, d: 0.98, walkableTop: true },
    ],
    { targetGroup: wingGroup, accentMat: mats.hazardStripe, name: 'F6_Z3_LabBarricades' }
  );

  // 2 Pressurized Explosive Plasma Barrels in the West Labs combat corridors!
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_labs_n',
    x: -26.2,
    y: baseY,
    z: -4.2,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_labs_s',
    x: -32.6,
    y: baseY,
    z: 9.8,
    targetGroup: wingGroup,
  });

  // High-Readability Wall Stencil Signage cleanly above upper catwalk rail & clear of East-West bridge!
  addWallStencilPlaque(wingGroup, mats, {
    code: '06-L',
    title: 'BLACK-SITE TACTICAL LABS',
    subtitle: 'CLEANROOM POD · NORTH CRYO LINK · SOUTH ARMORY BUNKER',
    accentHex: 0xf59e0b,
    x: -43.62,
    y: baseY + 8.35,
    z: -2.4,
    rotY: Math.PI * 0.5,
    width: 6.4,
    height: 1.5,
  });

  return {
    id: 'f6_west_labs',
    group: wingGroup,
    center: new THREE.Vector3(-31.0, baseY + 3.5, 3.0),
    triggerBounds: {
      minX: -46.0,
      maxX: -12.0,
      minZ: -12.0,
      maxZ: 18.0,
    },
    maxViewDistance: 36.0,
  };
}
