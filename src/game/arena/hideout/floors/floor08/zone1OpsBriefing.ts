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
  buildTacticalConsoleBenches,
  buildWallEquipmentBays,
} from '../../architecture';
import type { FloorGeometryCollector } from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import { F8_BASE_Y, F8_CEILINGS, F8_PORTALS } from './layout';

/**
 * FLOOR 08 — ZONE 1: OPS BRIEFING ROTUNDA & DEPLOYMENT CONCOURSE (South)
 * Footprint: x ∈ [-13, +13], z ∈ [+33, +50], Ceiling: 7.2m
 *
 * Designed around Valve / CoD / Control "Compression & Release":
 * - Spawn at (0, 98, 45.5) facing North toward an 11m-wide steel-framed Blast Archway opening straight into
 *   the soaring 13.5m Ballistic Proving Cathedral!
 * - Behind spawn (z = 49.6): Dramatic tiered armored Operations Monolith Backdrop framing the operative on Title Screen.
 * - Flanking East (Armory & Express Lift) and West (CQB Breaching Killhouse) portals with recessed gear locker bays,
 *   tactical briefing console desks, and color-coded wing floor guidance strips.
 */
export function buildFloor8Zone1OpsBriefing(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  detailGroup: THREE.Group,
  accentMat: THREE.Material
): void {
  const baseY = F8_BASE_Y;
  const ceilH = F8_CEILINGS.briefing; // 7.2m
  const group = collector.group;
  const killhouseAccent = mats.floorAccent[4]; // Warm tactical orange-amber -> West Killhouse
  const armoryAccent = mats.floorAccent[7]; // Warm gold-amber -> East Armory / Express Lift

  // 1. Main Briefing Floor Deck & Recessed Ceiling Slab
  addWalkableDeck(collector, {
    minX: -13.0,
    maxX: 13.0,
    minZ: 33.0,
    maxZ: 50.0,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F8_Z1_BriefingFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 25.4, h: 0.6, d: 16.4, x: 0, y: baseY + ceilH + 0.3, z: 41.5 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F8_Z1_BriefingCeiling' }
  );
  if (ceilMesh) group.add(ceilMesh);

  // 2. Perimeter Walls with Cleanly Framed Portals
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 50.0,
    spanStart: -13.3,
    spanEnd: 13.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    name: 'F8_Z1_SouthWall',
  });

  // North shared wall (z = 33.0, height 7.2m) with grand 11m-wide Blast Archway into Ballistic Hall
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 33.0,
    spanStart: -13.0,
    spanEnd: 13.0,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      {
        start: F8_PORTALS.briefingToHallX[0],
        end: F8_PORTALS.briefingToHallX[1],
        bottomY: baseY,
        topY: baseY + 5.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z1_NorthPortalWall',
  });

  // West shared wall (x = -13.0) -> West Wing CQB Breaching Killhouse (trimmed cleanly between North & South walls!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -13.0,
    spanStart: 33.3,
    spanEnd: 49.7,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: killhouseAccent,
    portals: [
      {
        start: F8_PORTALS.briefingToKillhouseZ[0],
        end: F8_PORTALS.briefingToKillhouseZ[1],
        bottomY: baseY,
        topY: baseY + 4.3,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z1_WestWall',
  });

  // East shared wall (x = +13.0) -> East Wing Tactical Armory (trimmed cleanly between North & South walls!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 13.0,
    spanStart: 33.3,
    spanEnd: 49.7,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: armoryAccent,
    portals: [
      {
        start: F8_PORTALS.briefingToArmoryZ[0],
        end: F8_PORTALS.briefingToArmoryZ[1],
        bottomY: baseY,
        topY: baseY + 4.3,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z1_EastWall',
  });

  // Motorized proximity sliding blast doors leading into West Killhouse & East Armory wings
  buildTacticalDoor(collector, mats, {
    id: 'f8_auto_briefing_killhouse',
    mode: 'automatic',
    x: -13.0,
    y: baseY,
    z: 41.0,
    width: F8_PORTALS.briefingToKillhouseZ[1] - F8_PORTALS.briefingToKillhouseZ[0],
    height: 4.3,
    spanAxis: 'z',
  });
  buildTacticalDoor(collector, mats, {
    id: 'f8_auto_briefing_armory',
    mode: 'automatic',
    x: 13.0,
    y: baseY,
    z: 41.0,
    width: F8_PORTALS.briefingToArmoryZ[1] - F8_PORTALS.briefingToArmoryZ[0],
    height: 4.3,
    spanAxis: 'z',
  });

  // 3. Hero Title-Screen Armored Monolith Backdrop behind Spawn (z = 49.55) + Non-Overlapping Coffered Ceiling Trusses
  const monoH = ceilH - 0.016;
  const finH = ceilH - 0.012;
  const pilasterH = ceilH - 0.82; // Stops cleanly UNDER longitudinal ceiling chords (y = ceilH - 0.80) — ZERO roof Z-fighting!
  const steelSpecs: BoxSpec[] = [
    // Deep armored central Title backdrop slab & flanking vertical fins (strictly separated from SouthWall & locker bays!)
    { w: 6.92, h: monoH, d: 0.32, x: 0, y: baseY + 0.008 + monoH * 0.5, z: 49.52 },
    { w: 0.54, h: finH, d: 0.56, x: -3.75, y: baseY + 0.006 + finH * 0.5, z: 49.40 },
    { w: 0.54, h: finH, d: 0.56, x: 3.75, y: baseY + 0.006 + finH * 0.5, z: 49.40 },
    { w: 0.44, h: finH, d: 0.36, x: -8.6, y: baseY + 0.006 + finH * 0.5, z: 49.50 },
    { w: 0.44, h: finH, d: 0.36, x: 8.6, y: baseY + 0.006 + finH * 0.5, z: 49.50 },
    // Horizontal armored shelf bars trimmed cleanly inside central monolith bay (never slicing flanking locker bays!)
    { w: 6.9, h: 0.26, d: 0.24, x: 0, y: baseY + 3.92, z: 49.24 },
    { w: 6.9, h: 0.22, d: 0.24, x: 0, y: baseY + 1.4, z: 49.24 },
    // Structural coffered overhead East-West ceiling beams (cleanly below ceiling slab, y ∈ [ceilH - 0.47, ceilH - 0.01])
    { w: 25.32, h: 0.46, d: 0.44, x: 0, y: baseY + ceilH - 0.24, z: 36.2 },
    { w: 25.32, h: 0.46, d: 0.44, x: 0, y: baseY + ceilH - 0.24, z: 41.0 },
    { w: 25.32, h: 0.46, d: 0.44, x: 0, y: baseY + ceilH - 0.24, z: 46.2 },
    // Longitudinal lower chords stepping cleanly BELOW transverse ceiling beams (y ∈ [ceilH - 0.80, ceilH - 0.48]) — ZERO crossing overlap!
    { w: 0.42, h: 0.32, d: 15.8, x: -6.2, y: baseY + ceilH - 0.64, z: 41.5 },
    { w: 0.42, h: 0.32, d: 15.8, x: 6.2, y: baseY + ceilH - 0.64, z: 41.5 },
    // Monumental chamfered pilasters flush IN FRONT of North Portal Wall (z >= 33.31) & supporting longitudinal chords cleanly!
    { w: 0.92, h: pilasterH, d: 0.68, x: -6.2, y: baseY + 0.004 + pilasterH * 0.5, z: 33.66 },
    { w: 0.92, h: pilasterH, d: 0.68, x: 6.2, y: baseY + 0.004 + pilasterH * 0.5, z: 33.66 },
  ];

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z1_SteelTrusses',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  // Solid colliders for Grand Blast Archway framing pilasters at x = ±6.2, z = 33.66
  for (const px of [-6.2, 6.2]) {
    collector.boxes.push({
      minX: px - 0.48,
      maxX: px + 0.48,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: 33.28,
      maxZ: 34.04,
      walkableTop: false,
    });
  }
  // Solid full-height collider covering the ENTIRE South Monolith backdrop & shelf under "08 APEX PROVING COMPLEX"!
  collector.boxes.push({
    minX: -4.06,
    maxX: 4.06,
    minY: baseY,
    maxY: baseY + ceilH,
    minZ: 49.06,
    maxZ: 49.75,
    walkableTop: false,
  });
  // Solid colliders for outer South vertical monolith fins at x = ±8.6
  for (const fx of [-8.6, 8.6]) {
    collector.boxes.push({
      minX: fx - 0.26,
      maxX: fx + 0.26,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: 49.28,
      maxZ: 49.75,
      walkableTop: false,
    });
  }

  // Luminous coffered ceiling troffer light strips (all seated cleanly in recessed coffers between beams!)
  const lightSpecs: BoxSpec[] = [
    { w: 11.4, h: 0.08, d: 0.48, x: 0, y: baseY + ceilH - 0.05, z: 38.6 },
    { w: 11.4, h: 0.08, d: 0.48, x: 0, y: baseY + ceilH - 0.05, z: 43.6 },
    { w: 4.8, h: 0.08, d: 0.34, x: -9.5, y: baseY + ceilH - 0.05, z: 38.6 },
    { w: 4.8, h: 0.08, d: 0.34, x: 9.5, y: baseY + ceilH - 0.05, z: 38.6 },
    { w: 4.8, h: 0.08, d: 0.34, x: -9.5, y: baseY + ceilH - 0.05, z: 43.6 },
    { w: 4.8, h: 0.08, d: 0.34, x: 9.5, y: baseY + ceilH - 0.05, z: 43.6 },
  ];
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, {
    name: 'F8_Z1_CeilingLights',
  });
  if (lightMesh) group.add(lightMesh);

  // Color-coded architectural wayfinding strips & Title-backdrop luminous cyan fins
  const cyanAccentMesh = buildBatchedBoxesMesh(
    [
      // Crisp vertical & horizontal cyan datum light blades framing the Title Screen operative
      { w: 6.5, h: 0.07, d: 0.08, x: 0, y: baseY + 1.58, z: 49.1 },
      { w: 6.5, h: 0.07, d: 0.08, x: 0, y: baseY + 3.74, z: 49.1 },
      { w: 0.08, h: 4.6, d: 0.08, x: -3.44, y: baseY + 2.6, z: 49.08 },
      { w: 0.08, h: 4.6, d: 0.08, x: 3.44, y: baseY + 2.6, z: 49.08 },
      // Central North runway floor guide lines stopping cleanly BEFORE ArchHazard (z = 33.48)
      { w: 0.14, h: 0.012, d: 13.0, x: -2.4, y: baseY + 0.008, z: 40.0 },
      { w: 0.14, h: 0.012, d: 13.0, x: 2.4, y: baseY + 0.008, z: 40.0 },
    ],
    accentMat,
    { name: 'F8_Z1_CyanAccents' }
  );
  if (cyanAccentMesh) detailGroup.add(cyanAccentMesh);

  // Amber West floor guidance path -> CQB Killhouse
  const westPathMesh = buildBatchedBoxesMesh(
    [
      { w: 10.2, h: 0.012, d: 0.14, x: -7.6, y: baseY + 0.008, z: 40.3 },
      { w: 10.2, h: 0.012, d: 0.14, x: -7.6, y: baseY + 0.008, z: 41.7 },
    ],
    killhouseAccent,
    { name: 'F8_Z1_KillhouseFloorPath' }
  );
  if (westPathMesh) detailGroup.add(westPathMesh);

  // Gold-Amber East floor guidance path -> Tactical Armory
  const eastPathMesh = buildBatchedBoxesMesh(
    [
      { w: 10.2, h: 0.012, d: 0.14, x: 7.6, y: baseY + 0.008, z: 40.3 },
      { w: 10.2, h: 0.012, d: 0.14, x: 7.6, y: baseY + 0.008, z: 41.7 },
    ],
    armoryAccent,
    { name: 'F8_Z1_ArmoryFloorPath' }
  );
  if (eastPathMesh) detailGroup.add(eastPathMesh);

  // Blast Archway floor threshold hazard strip (cleanly above floor guide lines!)
  const archHazard = buildBatchedBoxesMesh(
    [{ w: 10.4, h: 0.014, d: 0.36, x: 0, y: baseY + 0.018, z: 33.15 }],
    mats.hazardStripe,
    { name: 'F8_Z1_ArchHazard' }
  );
  if (archHazard) detailGroup.add(archHazard);

  // 4. Recessed Armored Gear & Briefing Locker Bays built cleanly into flanking walls!
  buildWallEquipmentBays(
    collector,
    mats,
    [
      // North wall flanking recessed gear bays (left & right of the 11m Grand Blast Archway!)
      { axis: 'x', coord: 33.3, inwardDir: 1, centerAlong: -9.5, baseY, width: 4.4, height: 3.1, depth: 0.56 },
      { axis: 'x', coord: 33.3, inwardDir: 1, centerAlong: 9.5, baseY, width: 4.4, height: 3.1, depth: 0.56 },
      // South wall flanking recessed tactical kit lockers
      { axis: 'x', coord: 49.7, inwardDir: -1, centerAlong: -6.2, baseY, width: 3.6, height: 2.9, depth: 0.52 },
      { axis: 'x', coord: 49.7, inwardDir: -1, centerAlong: 6.2, baseY, width: 3.6, height: 2.9, depth: 0.52 },
    ],
    { accentMat, name: 'F8_Z1_LockerBays' }
  );

  // 5. Sleek AAA Tactical Briefing Console Workstations flanking the central promenade!
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -6.8, y: baseY, z: 45.2, w: 3.4, h: 0.98, d: 1.15 },
      { x: 6.8, y: baseY, z: 45.2, w: 3.4, h: 0.98, d: 1.15 },
      { x: -8.9, y: baseY, z: 36.4, w: 2.8, h: 0.98, d: 1.1 },
      { x: 8.9, y: baseY, z: 36.4, w: 2.8, h: 0.98, d: 1.1 },
    ],
    { accentMat, name: 'F8_Z1_BriefingConsoles' }
  );

  // 6. Crisp High-Resolution Architectural Wayfinding Stencil Plaques (cleanly ABOVE steel lintel y=5.72, ZERO overlap!)
  addWallStencilPlaque(group, mats, {
    code: '08',
    title: 'BALLISTIC PROVING HALL',
    subtitle: 'LIVE FIRE LANES 01–05 · UPPER MEZZANINE · BULKHEAD 08',
    accentHex: 0x06b6d4,
    x: 0,
    y: baseY + 6.46,
    z: 33.42,
    rotY: 0,
    width: 5.8,
    height: 1.24,
  });
  addWallStencilPlaque(group, mats, {
    code: '08-W',
    title: 'CQB KILLHOUSE',
    subtitle: 'SHOOT HOUSE 08 · INSTRUCTOR CATWALK · NORTH FLANK',
    accentHex: 0xf97316,
    x: -12.64,
    y: baseY + 5.25,
    z: 41.0,
    rotY: Math.PI * 0.5,
    width: 5.2,
    height: 1.35,
  });
  addWallStencilPlaque(group, mats, {
    code: '08-E',
    title: 'TACTICAL ARMORY',
    subtitle: 'OBSERVATION GALLERY · HEAVY ORDNANCE VAULT',
    accentHex: 0xf59e0b,
    x: 12.64,
    y: baseY + 5.25,
    z: 41.0,
    rotY: -Math.PI * 0.5,
    width: 5.2,
    height: 1.35,
  });
  // Title Screen South Wall Command Designation Plaque cleanly proud of the central monolith slab
  addWallStencilPlaque(group, mats, {
    code: '08',
    title: 'APEX PROVING COMPLEX',
    subtitle: 'NIGHTSHADE PROTOCOL · TACTICAL DEPLOYMENT',
    accentHex: 0x06b6d4,
    x: 0,
    y: baseY + 4.95,
    z: 49.3,
    rotY: Math.PI,
    width: 5.8,
    height: 1.35,
  });
}
