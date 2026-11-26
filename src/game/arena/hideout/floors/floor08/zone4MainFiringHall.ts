import * as THREE from 'three';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  buildInstancedBoxes,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addLaneMarkerPlaque,
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
  buildTacticalConsoleBenches,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import { buildExplosiveBarrel } from '../../mechanics';
import { F8_BASE_Y, F8_CEILINGS, F8_MEZZ_Y, F8_PORTALS } from './layout';

/**
 * FLOOR 08 — ZONE 4 (CENTER HERO): MONUMENTAL BALLISTIC PROVING CATHEDRAL
 * Footprint: x ∈ [-17, +17] (34m wide) × z ∈ [-1, +33] (34m long), Ceiling: 13.5m!
 *
 * Inspired by Call of Duty: Modern Warfare Firing Range + Control FBC Brutalist Scale:
 * - 5 Modular Acoustic Shooting Booths (`01`–`05`) with warm ballistic dividers, armored firing desks, & canopy signs
 * - 10M / 20M / 30M glowing range datum strips across the concrete firing deck
 * - Iconic Louvered 35° Armored Steel Bullet-Trap Backstop at z = -0.35 with vertical lane ribs & hazard apron
 * - 1.45m-deep suspended Overhead Acoustic Ballistic Baffles & cathedral lighting at +10.5m..13.5m
 * - Full wrap-around Elevated Observation Mezzanine (+4.4m = 102.4m) + North Sky-Walkway over the backstop
 * - TWO MILLIMETER-ALIGNED ZERO-GLITCH GRAND STAIRCASES whose outer rails (`x = ±12.60`, `±9.80`) join
 *   the mezzanine & top-landing guardrails at exact corner posts with 100% solid colliders!
 */
export function buildFloor8Zone4MainFiringHall(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  detailGroup: THREE.Group,
  accentMat: THREE.Material
): void {
  const baseY = F8_BASE_Y; // 98.0m
  const mezzY = F8_MEZZ_Y; // 102.4m
  const ceilH = F8_CEILINGS.firingHall; // 13.5m
  const group = collector.group;

  // 1. Main Ballistic Range Floor (34m × 34m) & High Cathedral Ceiling
  addWalkableDeck(collector, {
    minX: -17.0,
    maxX: 17.0,
    minZ: -1.0,
    maxZ: 33.0,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F8_Z4_MainRangeFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 33.4, h: 0.7, d: 33.4, x: 0, y: baseY + ceilH + 0.35, z: 16.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F8_Z4_CathedralCeiling' }
  );
  if (ceilMesh) group.add(ceilMesh);

  // 2. Cathedral Perimeter Walls (trimmed cleanly at corners & gable seam for ZERO Z-fighting!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 33.0,
    spanStart: -17.3,
    spanEnd: -13.02,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    name: 'F8_Z4_SouthWestWingWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 33.0,
    spanStart: 13.02,
    spanEnd: 17.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    name: 'F8_Z4_SouthEastWingWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 33.0,
    spanStart: -13.0,
    spanEnd: 13.0,
    baseY: baseY + F8_CEILINGS.briefing + 0.008,
    height: ceilH - F8_CEILINGS.briefing - 0.014,
    thickness: 0.588,
    wallMat: mats.concreteWallLight,
    includeColliders: false,
    name: 'F8_Z4_SouthUpperGable',
  });

  // West Shared Wall (x = -17.0) -> Zone 3 CQB Killhouse (trimmed cleanly inside North & South walls!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -17.0,
    spanStart: -0.7,
    spanEnd: 32.7,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      {
        start: 2.5,
        end: 9.0,
        bottomY: mezzY + 1.0,
        topY: mezzY + 3.6,
        kind: 'window',
        framed: true,
      },
      {
        start: F8_PORTALS.hallToKillhouseGroundZ[0],
        end: F8_PORTALS.hallToKillhouseGroundZ[1],
        bottomY: baseY,
        topY: baseY + 3.9,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F8_PORTALS.hallToKillhouseUpperZ[0],
        end: F8_PORTALS.hallToKillhouseUpperZ[1],
        bottomY: mezzY,
        topY: mezzY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z4_WestSharedWall',
  });

  // East Shared Wall (x = +17.0) -> Zone 2 Armory Corridor (trimmed cleanly inside North & South walls!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 17.0,
    spanStart: -0.7,
    spanEnd: 32.7,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      {
        start: 6.5,
        end: 18.0,
        bottomY: baseY + 1.1,
        topY: baseY + 3.5,
        kind: 'window',
        framed: true,
      },
      {
        start: F8_PORTALS.hallToArmoryGroundZ[0],
        end: F8_PORTALS.hallToArmoryGroundZ[1],
        bottomY: baseY,
        topY: baseY + 3.9,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: 27.0,
        end: 31.2,
        bottomY: mezzY,
        topY: mezzY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z4_EastSharedWall',
  });

  // North Shared Armored Backstop Wall (z = -1.0) -> Zone 5 North Security Atrium
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -1.0,
    spanStart: -17.0,
    spanEnd: 17.0,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat,
    portals: [
      {
        start: F8_PORTALS.hallWestToAtriumX[0],
        end: F8_PORTALS.hallWestToAtriumX[1],
        bottomY: baseY,
        topY: baseY + 3.9,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F8_PORTALS.hallUpperBridgeToAtriumX[0],
        end: F8_PORTALS.hallUpperBridgeToAtriumX[1],
        bottomY: mezzY,
        topY: mezzY + 4.4,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F8_PORTALS.hallEastToAtriumX[0],
        end: F8_PORTALS.hallEastToAtriumX[1],
        bottomY: baseY,
        topY: baseY + 3.9,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z4_NorthBackstopWall',
  });

  // Interior Motorized Proximity Sliding Doors & Jammed Half-Open Dodge-Roll Blast Shutters!
  // 1. West Ground Breach -> CQB Killhouse: JAMMED HALF-OPEN BLAST SHUTTER (Dodge Roll [V] underneath!)
  buildTacticalDoor(collector, mats, {
    id: 'f8_jammed_killhouse_breach',
    mode: 'jammed_roll',
    x: -17.0,
    y: baseY,
    z: (F8_PORTALS.hallToKillhouseGroundZ[0] + F8_PORTALS.hallToKillhouseGroundZ[1]) * 0.5,
    width: F8_PORTALS.hallToKillhouseGroundZ[1] - F8_PORTALS.hallToKillhouseGroundZ[0],
    height: 3.9,
    spanAxis: 'z',
  });
  // 2. East Ground Flank -> Armory Observation Corridor: Smooth Motorized Proximity Sliding Door
  buildTacticalDoor(collector, mats, {
    id: 'f8_auto_armory_flank',
    mode: 'automatic',
    x: 17.0,
    y: baseY,
    z: (F8_PORTALS.hallToArmoryGroundZ[0] + F8_PORTALS.hallToArmoryGroundZ[1]) * 0.5,
    width: F8_PORTALS.hallToArmoryGroundZ[1] - F8_PORTALS.hallToArmoryGroundZ[0],
    height: 3.9,
    spanAxis: 'z',
  });
  // 3. North-West Passage -> North Security Atrium: Smooth Motorized Proximity Sliding Door
  buildTacticalDoor(collector, mats, {
    id: 'f8_auto_atrium_west',
    mode: 'automatic',
    x: (F8_PORTALS.hallWestToAtriumX[0] + F8_PORTALS.hallWestToAtriumX[1]) * 0.5,
    y: baseY,
    z: -1.0,
    width: F8_PORTALS.hallWestToAtriumX[1] - F8_PORTALS.hallWestToAtriumX[0],
    height: 3.9,
    spanAxis: 'x',
  });
  // 4. North-East Passage -> North Security Atrium: JAMMED HALF-OPEN BLAST SHUTTER (Dodge Roll [V] underneath!)
  buildTacticalDoor(collector, mats, {
    id: 'f8_jammed_atrium_east',
    mode: 'jammed_roll',
    x: (F8_PORTALS.hallEastToAtriumX[0] + F8_PORTALS.hallEastToAtriumX[1]) * 0.5,
    y: baseY,
    z: -1.0,
    width: F8_PORTALS.hallEastToAtriumX[1] - F8_PORTALS.hallEastToAtriumX[0],
    height: 3.9,
    spanAxis: 'x',
  });

  // 3. ICONIC AAA LOUVERED 35° ARMORED STEEL BULLET-TRAP BACKSTOP (z = -0.35)!
  const trapArmorSpecs: BoxSpec[] = [
    // Deep armored backing wall (cleanly lifted 8mm off floor & separated from ribs!)
    { w: 22.0, h: 3.82, d: 0.52, x: 0, y: baseY + 0.008 + 1.91, z: -0.42 },
    // Heavy overhead ballistic brow canopy overhanging the trap
    { w: 22.4, h: 0.34, d: 1.12, x: 0, y: baseY + 3.84, z: -0.05 },
  ];
  // 4 horizontal 35°-canted armored steel bullet-deflection louvers spanning the full 21.6m range width!
  for (let row = 0; row < 4; row++) {
    trapArmorSpecs.push({
      w: 21.4,
      h: 0.62,
      d: 0.14,
      x: 0,
      y: baseY + 0.72 + row * 0.78,
      z: 0.04,
      rotX: 0.58,
    });
  }
  const trapRibSpecs: BoxSpec[] = [];
  for (const rx of [-10.8, -7.2, -3.6, 0, 3.6, 7.2, 10.8]) {
    trapRibSpecs.push({ w: 0.24, h: 3.62, d: 0.56, x: rx, y: baseY + 0.02 + 1.81, z: -0.06 });
  }
  const backstopMesh = buildBatchedBoxesMesh(trapArmorSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z4_LouveredBulletTrap',
  });
  if (backstopMesh) {
    group.add(backstopMesh);
    collector.wallMeshes.push(backstopMesh);
  }
  const trapRibMesh = buildBatchedBoxesMesh(trapRibSpecs, mats.structuralSteel, {
    receiveShadow: true,
    name: 'F8_Z4_BackstopRibs',
  });
  if (trapRibMesh) group.add(trapRibMesh);

  // Solid collider on the Louvered Bullet-Trap Backstop rack right beside the East Jammed Shutter & West Auto Door!
  collector.boxes.push({
    minX: -11.05,
    maxX: 11.05,
    minY: baseY,
    maxY: baseY + 4.02,
    minZ: -0.72,
    maxZ: 0.44,
    walkableTop: false,
  });

  const trapHazard = buildBatchedBoxesMesh(
    [
      { w: 22.0, h: 0.3, d: 0.1, x: 0, y: baseY + 0.15, z: 0.26 },
      { w: 22.0, h: 0.02, d: 0.5, x: 0, y: baseY + 0.012, z: 0.56 },
    ],
    mats.hazardStripe,
    { name: 'F8_Z4_BackstopHazard' }
  );
  if (trapHazard) detailGroup.add(trapHazard);

  // 4. SOARING OVERHEAD ACOUSTIC BALLISTIC BAFFLES & CATHEDRAL CEILING TRUSSES (+10.5m .. +13.5m)
  const baffleSpecs: BoxSpec[] = [];
  const ceilingLightSpecs: BoxSpec[] = [];
  for (let z = 3.0; z <= 29.0; z += 4.3) {
    baffleSpecs.push({
      w: 33.4,
      h: 1.45,
      d: 0.42,
      x: 0,
      y: baseY + ceilH - 1.35,
      z,
      rotX: 0.22,
    });
    baffleSpecs.push({
      w: 33.4,
      h: 0.38,
      d: 0.38,
      x: 0,
      y: baseY + ceilH - 0.35,
      z: z + 2.15,
    });
    ceilingLightSpecs.push({
      w: 22.0,
      h: 0.1,
      d: 0.36,
      x: 0,
      y: baseY + ceilH - 0.65,
      z: z + 2.15,
    });
  }
  // Vertical monumental brutalist wall pilasters flush IN FRONT of concrete walls (|x| <= 16.68 -> ZERO wall Z-fighting!)
  // Split cleanly into ground-to-mezzanine & mezzanine-to-ceiling tiers so they never clip through the Mezzanine deck slab!
  const lowerPilasterH = 3.952;
  const upperPilasterH = ceilH - 4.412;
  const westPilasterZs = [0.8, 10.0, 18.0, 26.4, 31.6];
  for (const z of westPilasterZs) {
    baffleSpecs.push(
      { w: 0.36, h: lowerPilasterH, d: 0.62, x: -16.49, y: baseY + 0.004 + lowerPilasterH * 0.5, z },
      { w: 0.36, h: upperPilasterH, d: 0.62, x: -16.49, y: mezzY + 0.004 + upperPilasterH * 0.5, z }
    );
    collector.boxes.push({
      minX: -16.72,
      maxX: -16.28,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: z - 0.34,
      maxZ: z + 0.34,
      walkableTop: false,
    });
  }
  const eastPilasterZs = [1.4, 5.4, 19.6, 32.1];
  for (const z of eastPilasterZs) {
    baffleSpecs.push(
      { w: 0.36, h: lowerPilasterH, d: 0.62, x: 16.49, y: baseY + 0.004 + lowerPilasterH * 0.5, z },
      { w: 0.36, h: upperPilasterH, d: 0.62, x: 16.49, y: mezzY + 0.004 + upperPilasterH * 0.5, z }
    );
    collector.boxes.push({
      minX: 16.28,
      maxX: 16.72,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: z - 0.34,
      maxZ: z + 0.34,
      walkableTop: false,
    });
  }
  const baffleMesh = buildBatchedBoxesMesh(baffleSpecs, mats.structuralSteel, {
    castShadow: false,
    receiveShadow: true,
    name: 'F8_Z4_AcousticBaffles',
  });
  if (baffleMesh) group.add(baffleMesh);

  const highBayLights = buildBatchedBoxesMesh(ceilingLightSpecs, mats.ceilingLight, {
    name: 'F8_Z4_HighBayLights',
  });
  if (highBayLights) group.add(highBayLights);

  // 5. WRAP-AROUND ELEVATED OBSERVATION MEZZANINE (+4.4m = 102.4m) — ZERO wall/deck overlaps!
  addWalkableDeck(collector, {
    minX: -16.68,
    maxX: -12.6,
    minZ: -0.68,
    maxZ: 32.68,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_WestMezzanine',
  });
  addWalkableDeck(collector, {
    minX: 12.6,
    maxX: 16.68,
    minZ: -0.68,
    maxZ: 32.68,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_EastMezzanine',
  });
  addWalkableDeck(collector, {
    minX: -12.6,
    maxX: 12.6,
    minZ: 28.8,
    maxZ: 32.68,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_SouthOverlook',
  });
  addWalkableDeck(collector, {
    minX: -12.6,
    maxX: 12.6,
    minZ: -0.68,
    maxZ: 3.2,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_NorthOverlookBridge',
  });
  // Clean dedicated portal threshold bridges spanning strictly inside the framed upper wall portals (ZERO Z-fighting!)
  addWalkableDeck(collector, {
    minX: -4.78,
    maxX: 4.78,
    minZ: -1.32,
    maxZ: -0.68,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_NorthPortalBridge',
  });
  addWalkableDeck(collector, {
    minX: -17.32,
    maxX: -16.68,
    minZ: 20.22,
    maxZ: 24.18,
    y: mezzY,
    thickness: 0.4,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_WestUpperPortalBridge',
  });
  addWalkableDeck(collector, {
    minX: 16.68,
    maxX: 17.32,
    minZ: 27.22,
    maxZ: 30.98,
    y: mezzY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_EastUpperPortalBridge',
  });
  // Dedicated Top Landing Pads seamlessly joining Twin Grand Staircases (z=27.2) -> Mezzanine & South Overlook (z=28.8)!
  addWalkableDeck(collector, {
    minX: -12.6,
    maxX: -9.8,
    minZ: 27.2,
    maxZ: 28.8,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_WestStairTopLanding',
  });
  addWalkableDeck(collector, {
    minX: 9.8,
    maxX: 12.6,
    minZ: 27.2,
    maxZ: 28.8,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F8_Z4_EastStairTopLanding',
  });

  // Heavy structural columns supporting the Mezzanine (flush beneath 0.44m deck slab — clean stair entry clearance!)
  const colSpecs: BoxSpec[] = [];
  for (const cx of [-12.85, 12.85]) {
    for (const cz of [3.2, 9.8, 16.0, 28.8]) {
      colSpecs.push({ w: 0.48, h: 3.952, d: 0.48, x: cx, y: baseY + 0.004 + 1.976, z: cz });
      collector.boxes.push({
        minX: cx - 0.28,
        maxX: cx + 0.28,
        minY: baseY,
        maxY: mezzY,
        minZ: cz - 0.28,
        maxZ: cz + 0.28,
        walkableTop: false,
      });
    }
  }
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z4_MezzColumns',
  });
  if (colMesh) {
    group.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // 6. MILLIMETER-ALIGNED ZERO-GLITCH TWIN GRAND STAIRCASES (baseY 98.0 -> mezzY 102.4)!
  // West Grand Stair: x = -11.20, width = 2.66 -> outer rails at EXACT x = -12.60 and x = -9.80!
  // Zero gap, zero double-post step, 100% solid stepped handrail colliders!
  buildStraightStairFlight(collector, mats, {
    x: -11.2,
    z: 22.8,
    width: 2.66,
    length: 8.8,
    yStart: baseY,
    yEnd: mezzY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    accentMat,
  });

  // East Grand Stair mirror: x = +11.20, width = 2.66 -> outer rails at EXACT x = +9.80 and x = +12.60!
  buildStraightStairFlight(collector, mats, {
    x: 11.2,
    z: 22.8,
    width: 2.66,
    length: 8.8,
    yStart: baseY,
    yEnd: mezzY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    accentMat,
  });

  // 7. MATHEMATICALLY EXACT MEZZANINE GUARDRAILS joining stair top corner posts cleanly at (±12.60, 27.2) & (±9.80, 27.2)!
  buildGuardrailRun(collector, mats, {
    x1: -12.6,
    z1: 3.2,
    x2: -12.6,
    z2: 27.2,
    y: mezzY,
    accentMat,
  });
  buildGuardrailRun(collector, mats, {
    x1: 12.6,
    z1: 3.2,
    x2: 12.6,
    z2: 27.2,
    y: mezzY,
    accentMat,
  });
  buildGuardrailRun(collector, mats, {
    x1: -9.8,
    z1: 28.8,
    x2: 9.8,
    z2: 28.8,
    y: mezzY,
    accentMat,
  });
  buildGuardrailRun(collector, mats, {
    x1: -9.8,
    z1: 27.2,
    x2: -9.8,
    z2: 28.8,
    y: mezzY,
    accentMat,
  });
  buildGuardrailRun(collector, mats, {
    x1: 9.8,
    z1: 27.2,
    x2: 9.8,
    z2: 28.8,
    y: mezzY,
    accentMat,
  });
  buildGuardrailRun(collector, mats, {
    x1: -12.6,
    z1: 3.2,
    x2: 12.6,
    z2: 3.2,
    y: mezzY,
    accentMat,
  });

  // 8. CALL OF DUTY FIRING RANGE — 5 MODULAR ACOUSTIC SHOOTING BOOTHS (`01`–`05`) & BALLISTIC MARKINGS!
  const boothSteelSpecs: BoxSpec[] = [];
  const boothAcousticSpecs: BoxSpec[] = [];
  const boothLightSpecs: BoxSpec[] = [];
  const laneMarkingSpecs: BoxSpec[] = [];
  const boothXs = [-7.2, -3.6, 0, 3.6, 7.2];

  for (let i = 0; i < boothXs.length; i++) {
    const bx = boothXs[i];
    const divX = bx - 1.8;
    // Heavy steel perimeter frame (clean butt joints — zero corner Z-fighting!) + warm acoustic ballistic composite panel
    boothSteelSpecs.push(
      { w: 0.16, h: 2.23, d: 0.16, x: divX, y: baseY + 0.004 + 1.115, z: 24.68 },
      { w: 0.16, h: 2.23, d: 0.16, x: divX, y: baseY + 0.004 + 1.115, z: 26.92 },
      { w: 0.16, h: 0.14, d: 2.4, x: divX, y: baseY + 2.31, z: 25.8 }
    );
    boothAcousticSpecs.push({ w: 0.1, h: 2.16, d: 2.06, x: divX, y: baseY + 1.14, z: 25.8 });
    // Focused overhead LED light bar inside each shooting booth!
    boothLightSpecs.push({ w: 2.2, h: 0.06, d: 0.18, x: bx, y: baseY + 2.32, z: 25.6 });

    collector.boxes.push({
      minX: divX - 0.12,
      maxX: divX + 0.12,
      minY: baseY,
      maxY: baseY + 2.38,
      minZ: 24.62,
      maxZ: 26.98,
      walkableTop: false,
    });
    laneMarkingSpecs.push({ w: 0.1, h: 0.01, d: 22.8, x: divX, y: baseY + 0.013, z: 12.6 });

    // Crisp numbered lane marker plaque (`01` .. `05`) mounted above each shooting stall!
    const laneNum = `0${i + 1}`;
    addLaneMarkerPlaque(group, mats, {
      label: laneNum,
      accentHex: 0x06b6d4,
      x: bx,
      y: baseY + 2.57,
      z: 27.12,
      rotY: 0,
      width: 0.96,
      height: 0.44,
    });
    // Matching lane number above the Bullet-Trap Backstop downrange!
    addLaneMarkerPlaque(group, mats, {
      label: laneNum,
      accentHex: 0x06b6d4,
      x: bx,
      y: baseY + 3.84,
      z: 0.56,
      rotY: 0,
      width: 1.05,
      height: 0.46,
    });
  }
  // Rightmost divider fin on Stall 05 (clean butt joints!)
  boothSteelSpecs.push(
    { w: 0.16, h: 2.23, d: 0.16, x: 9.0, y: baseY + 0.004 + 1.115, z: 24.68 },
    { w: 0.16, h: 2.23, d: 0.16, x: 9.0, y: baseY + 0.004 + 1.115, z: 26.92 },
    { w: 0.16, h: 0.14, d: 2.4, x: 9.0, y: baseY + 2.31, z: 25.8 }
  );
  boothAcousticSpecs.push({ w: 0.1, h: 2.16, d: 2.06, x: 9.0, y: baseY + 1.14, z: 25.8 });
  collector.boxes.push({
    minX: 8.88,
    maxX: 9.12,
    minY: baseY,
    maxY: baseY + 2.38,
    minZ: 24.62,
    maxZ: 26.98,
    walkableTop: false,
  });
  laneMarkingSpecs.push({ w: 0.1, h: 0.01, d: 22.8, x: 9.0, y: baseY + 0.013, z: 12.6 });

  // Overhead ballistic stall canopy beam cleanly resting above divider frames (zero overlap!)
  boothSteelSpecs.push({ w: 18.28, h: 0.38, d: 2.55, x: 0, y: baseY + 2.576, z: 25.8 });

  // 10M, 20M, and 30M transverse range distance datum bars (cleanly ABOVE longitudinal lane lines — ZERO crossing Z-fighting!)
  for (const lz of [23.8, 16.0, 8.5, 2.2]) {
    laneMarkingSpecs.push({ w: 18.4, h: 0.01, d: 0.14, x: 0, y: baseY + 0.024, z: lz });
  }

  const boothMesh = buildBatchedBoxesMesh(boothSteelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z4_ShootingBoothFrames',
  });
  if (boothMesh) {
    group.add(boothMesh);
    collector.wallMeshes.push(boothMesh);
  }
  const boothAcousticMesh = buildBatchedBoxesMesh(boothAcousticSpecs, mats.ballisticPanel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z4_ShootingBoothPanels',
  });
  if (boothAcousticMesh) {
    group.add(boothAcousticMesh);
    collector.wallMeshes.push(boothAcousticMesh);
  }
  const boothLights = buildBatchedBoxesMesh(boothLightSpecs, mats.ceilingLight, {
    name: 'F8_Z4_ShootingBoothLights',
  });
  if (boothLights) group.add(boothLights);

  const laneMesh = buildInstancedBoxes(laneMarkingSpecs, accentMat, {
    name: 'F8_Z4_RangeLaneLines',
  });
  if (laneMesh) detailGroup.add(laneMesh);

  // Armored Tactical Shooting Bench Workstations inside booths 01, 02, 04, 05 (leaving center lane 03 clear!)
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -7.2, y: baseY, z: 24.98, w: 3.1, h: 0.96, d: 0.78 },
      { x: -3.6, y: baseY, z: 24.98, w: 3.1, h: 0.96, d: 0.78 },
      { x: 3.6, y: baseY, z: 24.98, w: 3.1, h: 0.96, d: 0.78 },
      { x: 7.2, y: baseY, z: 24.98, w: 3.1, h: 0.96, d: 0.78 },
    ],
    { accentMat, name: 'F8_Z4_FiringBenches' }
  );

  // Downrange AAA Jersey Ballistic Barricades (walkableTop: true so players can vault or take cover!)
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -5.4, y: baseY, z: 13.8, w: 2.7, h: 1.04, d: 1.1, walkableTop: true },
      { x: 5.4, y: baseY, z: 13.8, w: 2.7, h: 1.04, d: 1.1, walkableTop: true },
      { x: 0.0, y: baseY, z: 10.2, w: 3.0, h: 0.98, d: 0.98, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F8_Z4_RangeBarricades' }
  );

  // Interactive Downrange Pressurized Explosive Plasma Barrels (paired for chain-reaction live-fire tests!)
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_range_w1',
    x: -6.8,
    y: baseY,
    z: 15.6,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_range_w2',
    x: -5.6,
    y: baseY,
    z: 11.4,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_range_e1',
    x: 6.8,
    y: baseY,
    z: 15.6,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_range_e2',
    x: 5.6,
    y: baseY,
    z: 11.4,
  });

  // Twin Overhead Ballistic Doppler Telemetry Scanner Rings flanking the cathedral rafters (zero sightline obstruction!)
  for (let idx = 0; idx < 2; idx++) {
    const sx = idx === 0 ? -13.2 : 13.2;
    const sz = 14.5;
    const mountY = baseY + ceilH - 2.6;
    const scannerMount = buildBatchedBoxesMesh(
      [
        { w: 0.28, h: 2.55, d: 0.28, x: sx, y: baseY + ceilH - 1.32, z: sz },
        { w: 0.72, h: 0.34, d: 0.72, x: sx, y: mountY, z: sz },
      ],
      mats.structuralSteel,
      { name: `F8_Z4_DopplerMount_${idx}` }
    );
    if (scannerMount) detailGroup.add(scannerMount);

    const rotor = new THREE.Group();
    rotor.name = `F8_Z4_DopplerRotor_${idx}`;
    rotor.position.set(sx, mountY - 0.32, sz);
    const armMesh = buildBatchedBoxesMesh(
      [
        { w: 2.1, h: 0.14, d: 0.22, x: 0, y: 0, z: 0 },
        { w: 0.26, h: 0.34, d: 0.32, x: -1.02, y: -0.06, z: 0 },
        { w: 0.26, h: 0.34, d: 0.32, x: 1.02, y: -0.06, z: 0 },
      ],
      mats.armoredSteel,
      { name: `F8_Z4_DopplerArms_${idx}` }
    );
    if (armMesh) rotor.add(armMesh);
    const beaconMesh = buildBatchedBoxesMesh(
      [
        { w: 0.14, h: 0.18, d: 0.14, x: -1.02, y: -0.26, z: 0 },
        { w: 0.14, h: 0.18, d: 0.14, x: 1.02, y: -0.26, z: 0 },
      ],
      accentMat,
      { name: `F8_Z4_DopplerBeacons_${idx}` }
    );
    if (beaconMesh) rotor.add(beaconMesh);
    detailGroup.add(rotor);
    collector.animatedSpinners?.push({
      obj: rotor,
      speed: idx === 0 ? 0.95 : -0.95,
    });
  }

  // 9. Monumental High-Resolution Architectural Wall Stencils (zero overlap/clipping!)
  addWallStencilPlaque(group, mats, {
    code: '08-C',
    title: 'BALLISTIC PROVING HALL',
    subtitle: 'LIVE FIRE LANES 01–05 · NORTH EXTRACTION BEYOND BACKSTOP',
    accentHex: 0x06b6d4,
    x: 0,
    y: baseY + 10.6,
    z: -0.62,
    rotY: 0,
    width: 7.8,
    height: 1.8,
  });
  addWallStencilPlaque(group, mats, {
    code: '08-W',
    title: 'KILLHOUSE BREACH',
    subtitle: 'WEST CQB WING ACCESS',
    accentHex: 0xf97316,
    x: -16.64,
    y: baseY + 7.6,
    z: 13.5,
    rotY: Math.PI * 0.5,
    width: 5.0,
    height: 1.4,
  });
  addWallStencilPlaque(group, mats, {
    code: '08-E',
    title: 'ARMORY GALLERY',
    subtitle: 'EAST OBSERVATION WING',
    accentHex: 0x38bdf8,
    x: 16.64,
    y: baseY + 7.6,
    z: 23.5,
    rotY: -Math.PI * 0.5,
    width: 5.0,
    height: 1.4,
  });
}
