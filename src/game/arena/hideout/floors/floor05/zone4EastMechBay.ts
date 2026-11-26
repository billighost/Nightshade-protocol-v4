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
  buildWallEquipmentBays,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F5_BASE_Y,
  F5_CEILINGS,
  F5_IDS,
  F5_PORTALS,
  F5_UPPER_Y,
  F5_WALLS,
} from './layout';

/**
 * FLOOR 05 — ZONE 4 (EAST OCCLUSION CELL): ARMORED MECH-BAY & DROPSHIP HANGAR
 * Footprint: x ∈ [+18.0, +48.0] (30m wide) × z ∈ [-10.0, +10.0] (20m deep), Ceiling: 10.8m
 *
 * Halo UNSC Pelican / Titanfall Heavy Maintenance Hangar:
 * - Monumental Armored Tactical Dropship suspended on hydraulic maintenance cradles (`x = 33.0, z = +1.8`)
 *   with swept armored wings, tinted glass flight canopy, and glowing twin thruster nacelles!
 * - Flush East Wall Staircase (`x = +46.32, width = 2.70` -> `+47.67` flush to `+47.70` wall — ZERO gap!)
 * - 18.8m Retractable Mech Gantry Skybridge (`f5_bridge_mech_gantry`) linking East Spine (`x = 42.4`)
 *   to Coliseum Balcony Receiver (`x = 23.6`), activated via `[E]` switch OR sniping the South Wall Relay!
 * - Jammed Half-Open Roll-Under Blast Shutter (`f5_jammed_mech_se`) into SE Ordnance Depot (`[V]` dodge-roll!)
 * - 4 Pressurized Explosive Plasma Barrels (2 chain-detonating pairs flanking the Dropship bay)!
 */
export function buildFloor5Zone4EastMechBay(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F5_BASE_Y; // 56.0m
  const upperY = F5_UPPER_Y; // 60.4m
  const ceilH = F5_CEILINGS.eastMechBay; // 10.8m
  const accentMat = mats.floorAccent[7]; // Warm UNSC amber!
  const cyanMat = mats.floorAccent[6]; // Thruster glow!
  const cellGroup = new THREE.Group();
  cellGroup.name = 'F5_ZONE4_EAST_MECHBAY';
  collector.group.add(cellGroup);

  // 1. Floor & Roof Slabs
  addWalkableDeck(collector, {
    minX: F5_WALLS.coliseumEastX,
    maxX: F5_WALLS.eastOuterX,
    minZ: F5_WALLS.northSplitZ,
    maxZ: F5_WALLS.southSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F5_Z4_MechBayFloor',
  });
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 19.4, x: 33.0, y: baseY + ceilH + 0.25, z: 0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F5_Z4_MechBayCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // 2. Exterior East Wall & North/South Shared Walls (`height = 10.8m >= Zones 6 & 8`, ZERO cracks!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.eastOuterX,
    spanStart: F5_WALLS.northSplitZ + 0.3,
    spanEnd: F5_WALLS.southSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z4_EastOuterWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.northSplitZ,
    spanStart: F5_WALLS.coliseumEastX + 0.3,
    spanEnd: F5_WALLS.eastOuterX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F5_PORTALS.mechToCommandAutoX[0], end: F5_PORTALS.mechToCommandAutoX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.mechToCommandOpenX[0], end: F5_PORTALS.mechToCommandOpenX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.mechToCommandUpperX[0], end: F5_PORTALS.mechToCommandUpperX[1], bottomY: upperY, topY: upperY + 3.4, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F5_Z4_NorthSharedWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.southSplitZ,
    spanStart: F5_WALLS.coliseumEastX + 0.3,
    spanEnd: F5_WALLS.eastOuterX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F5_PORTALS.mechToOrdnanceAutoX[0], end: F5_PORTALS.mechToOrdnanceAutoX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.mechToOrdnanceJammedX[0], end: F5_PORTALS.mechToOrdnanceJammedX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.mechToOrdnanceUpperX[0], end: F5_PORTALS.mechToOrdnanceUpperX[1], bottomY: upperY, topY: upperY + 3.4, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F5_Z4_SouthSharedWall',
  });

  // Motorized Proximity Doors + Jammed Roll-Under Blast Shutter into SE Ordnance Depot!
  buildTacticalDoor(collector, mats, {
    id: 'f5_auto_mech_command',
    mode: 'automatic',
    x: (F5_PORTALS.mechToCommandAutoX[0] + F5_PORTALS.mechToCommandAutoX[1]) * 0.5,
    y: baseY,
    z: F5_WALLS.northSplitZ,
    width: F5_PORTALS.mechToCommandAutoX[1] - F5_PORTALS.mechToCommandAutoX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f5_auto_mech_ordnance',
    mode: 'automatic',
    x: (F5_PORTALS.mechToOrdnanceAutoX[0] + F5_PORTALS.mechToOrdnanceAutoX[1]) * 0.5,
    y: baseY,
    z: F5_WALLS.southSplitZ,
    width: F5_PORTALS.mechToOrdnanceAutoX[1] - F5_PORTALS.mechToOrdnanceAutoX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: F5_IDS.jammedMechSe,
    mode: 'jammed_roll',
    x: (F5_PORTALS.mechToOrdnanceJammedX[0] + F5_PORTALS.mechToOrdnanceJammedX[1]) * 0.5,
    y: baseY,
    z: F5_WALLS.southSplitZ,
    width: F5_PORTALS.mechToOrdnanceJammedX[1] - F5_PORTALS.mechToOrdnanceJammedX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });

  // 3. Overhead Heavy Crane Gantry Rail Beams & Hangar High-Bay Lights
  const craneBeamSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const bx of [24.0, 33.0, 42.0]) {
    craneBeamSpecs.push({ w: 0.46, h: 0.52, d: 19.32, x: bx, y: baseY + ceilH - 0.28, z: 0 });
    lightSpecs.push(
      { w: 0.36, h: 0.08, d: 7.2, x: bx + 3.4, y: baseY + ceilH - 0.06, z: -4.4 },
      { w: 0.36, h: 0.08, d: 7.2, x: bx + 3.4, y: baseY + ceilH - 0.06, z: 4.4 }
    );
  }
  // Overhead yellow-black industrial overhead crane trolley rail spanning above Dropship
  craneBeamSpecs.push(
    { w: 28.8, h: 0.38, d: 0.44, x: 33.0, y: baseY + ceilH - 1.12, z: -1.4 },
    { w: 28.8, h: 0.38, d: 0.44, x: 33.0, y: baseY + ceilH - 1.12, z: 4.8 }
  );
  const craneMesh = buildBatchedBoxesMesh(craneBeamSpecs, mats.structuralSteel, { name: 'F5_Z4_HangarRoofTrusses' });
  if (craneMesh) cellGroup.add(craneMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F5_Z4_HangarRoofLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 4. CENTERPIECE HERO: ARMORED TACTICAL DROPSHIP ("VANGUARD-05") ON HYDRAULIC MAINTENANCE CRADLES!
  const dx = 33.0;
  const dz = 1.8;
  const hullSpecs: BoxSpec[] = [
    // Main armored fuselage spine & cargo bay body (`x ∈ [28.0, 38.0], z ∈ [0.1, 3.5]`)
    { w: 9.8, h: 2.15, d: 3.1, x: dx, y: baseY + 2.25, z: dz },
    // Tapered nose command cockpit lower hull facing West toward Coliseum (`x = 26.8`)
    { w: 2.8, h: 1.45, d: 2.2, x: dx - 6.0, y: baseY + 1.95, z: dz },
    // Armored upper dorsal engine cowling
    { w: 6.2, h: 0.72, d: 2.3, x: dx + 1.0, y: baseY + 3.68, z: dz },
    // Swept heavy armored port & starboard VTOL wings
    { w: 3.4, h: 0.48, d: 2.4, x: dx + 0.6, y: baseY + 2.45, z: dz - 2.65 },
    { w: 3.4, h: 0.48, d: 2.4, x: dx + 0.6, y: baseY + 2.45, z: dz + 2.65 },
    // Twin tail vertical stabilizer fins
    { w: 2.1, h: 1.75, d: 0.26, x: dx + 4.4, y: baseY + 3.65, z: dz - 1.45 },
    { w: 2.1, h: 1.75, d: 0.26, x: dx + 4.4, y: baseY + 3.65, z: dz + 1.45 },
  ];
  const cradleSpecs: BoxSpec[] = [
    // Heavy hydraulic cradle plinths & twin thruster nacelle pods (strictly grounded 4mm above floor!)
    { w: 11.2, h: 0.28, d: 4.8, x: dx, y: baseY + 0.144, z: dz },
    { w: 1.1, h: 1.02, d: 3.6, x: dx - 3.6, y: baseY + 0.78, z: dz },
    { w: 1.1, h: 1.02, d: 3.6, x: dx + 3.4, y: baseY + 0.78, z: dz },
    // Twin wingtip VTOL thruster nacelles
    { w: 3.8, h: 1.15, d: 1.15, x: dx + 0.86, y: baseY + 2.45, z: dz - 4.15 },
    { w: 3.8, h: 1.15, d: 1.15, x: dx + 0.86, y: baseY + 2.45, z: dz + 4.15 },
  ];
  const thrusterGlowSpecs: BoxSpec[] = [
    { w: 0.16, h: 0.82, d: 0.82, x: dx + 2.76, y: baseY + 2.45, z: dz - 4.15 },
    { w: 0.16, h: 0.82, d: 0.82, x: dx + 2.76, y: baseY + 2.45, z: dz + 4.15 },
    // Rear main afterburner vents
    { w: 0.16, h: 0.9, d: 0.9, x: dx + 4.98, y: baseY + 2.35, z: dz - 0.75 },
    { w: 0.16, h: 0.9, d: 0.9, x: dx + 4.98, y: baseY + 2.35, z: dz + 0.75 },
  ];
  const hazardCradleSpecs: BoxSpec[] = [
    { w: 11.24, h: 0.14, d: 0.12, x: dx, y: baseY + 0.22, z: dz - 2.44 },
    { w: 11.24, h: 0.14, d: 0.12, x: dx, y: baseY + 0.22, z: dz + 2.44 },
  ];

  const armorTrimSpecs: BoxSpec[] = [
    // Crisp high-contrast brushed titanium upper fuselage plates & wing leading-edge armor!
    { w: 9.2, h: 0.42, d: 3.22, x: dx, y: baseY + 3.06, z: dz },
    { w: 2.5, h: 0.34, d: 2.32, x: dx - 6.0, y: baseY + 2.48, z: dz },
    { w: 3.1, h: 0.24, d: 2.56, x: dx + 0.6, y: baseY + 2.74, z: dz - 2.65 },
    { w: 3.1, h: 0.24, d: 2.56, x: dx + 0.6, y: baseY + 2.74, z: dz + 2.65 },
  ];
  const navLightSpecs: BoxSpec[] = [
    // Glowing UNSC amber fuselage tactical racing strips & wingtip position lights!
    { w: 8.6, h: 0.14, d: 0.08, x: dx, y: baseY + 2.38, z: dz - 1.59 },
    { w: 8.6, h: 0.14, d: 0.08, x: dx, y: baseY + 2.38, z: dz + 1.59 },
    { w: 2.2, h: 0.12, d: 0.08, x: dx - 6.0, y: baseY + 2.15, z: dz - 1.14 },
    { w: 2.2, h: 0.12, d: 0.08, x: dx - 6.0, y: baseY + 2.15, z: dz + 1.14 },
    { w: 0.14, h: 0.32, d: 0.32, x: dx - 1.14, y: baseY + 2.45, z: dz - 4.15 },
    { w: 0.14, h: 0.32, d: 0.32, x: dx - 1.14, y: baseY + 2.45, z: dz + 4.15 },
  ];

  const hullMesh = buildBatchedBoxesMesh(hullSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z4_DropshipHull',
  });
  const armorTrimMesh = buildBatchedBoxesMesh(armorTrimSpecs, mats.brushedMetal, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z4_DropshipArmorTrim',
  });
  const cradleMesh = buildBatchedBoxesMesh(cradleSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z4_DropshipCradles',
  });
  const canopyMesh = buildBatchedBoxesMesh(
    [{ w: 2.1, h: 0.78, d: 1.85, x: dx - 5.5, y: baseY + 2.86, z: dz }],
    mats.glassPanel,
    { name: 'F5_Z4_DropshipCanopy' }
  );
  const thrusterMesh = buildBatchedBoxesMesh(thrusterGlowSpecs, cyanMat, { name: 'F5_Z4_DropshipThrusters' });
  const navLightMesh = buildBatchedBoxesMesh(navLightSpecs, accentMat, { name: 'F5_Z4_DropshipNavLights' });
  const hazCradleMesh = buildBatchedBoxesMesh(hazardCradleSpecs, mats.hazardStripe, { name: 'F5_Z4_CradleHazard' });

  for (const m of [hullMesh, armorTrimMesh, cradleMesh]) {
    if (m) {
      cellGroup.add(m);
      collector.wallMeshes.push(m);
    }
  }
  if (canopyMesh) cellGroup.add(canopyMesh);
  if (thrusterMesh) cellGroup.add(thrusterMesh);
  if (navLightMesh) cellGroup.add(navLightMesh);
  if (hazCradleMesh) cellGroup.add(hazCradleMesh);

  // Solid colliders around Dropship fuselage & wing nacelles
  collector.boxes.push(
    {
      minX: dx - 7.45,
      maxX: dx + 5.65,
      minY: baseY,
      maxY: baseY + 4.4,
      minZ: dz - 2.45,
      maxZ: dz + 2.45,
      walkableTop: false,
    },
    {
      minX: dx - 1.2,
      maxX: dx + 2.8,
      minY: baseY + 1.4,
      maxY: baseY + 3.2,
      minZ: dz - 4.8,
      maxZ: dz + 4.8,
      walkableTop: false,
    }
  );

  // 5. FLUSH EAST WALL STAIRCASE (`x = +46.32, width = 2.70 -> maxX = +47.67` flush to `+47.70` wall — ZERO GAP!)
  // Climbs Northward from `z = +6.0` (baseY 56.0) -> `z = -2.8` (upperY 60.4, length = 8.8m)
  buildStraightStairFlight(collector, mats, {
    x: 46.32,
    z: 1.6,
    width: 2.7,
    length: 8.8,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false, // Flush to East exterior wall!
    accentMat,
    targetGroup: cellGroup,
  });

  // 6. ELEVATED `+4.4m` EAST SPINE & WEST RECEIVER DOCK + 18.8m RETRACTABLE MECH GANTRY SKYBRIDGE!
  // Split East Spine cleanly around stairwell cutout (`x ∈ [44.92, 47.68], z ∈ [-2.8, +6.4]`)
  addWalkableDeck(collector, {
    minX: 42.4,
    maxX: 47.68,
    minZ: -9.68,
    maxZ: -2.8,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z4_EastSpineNorth',
  });
  addWalkableDeck(collector, {
    minX: 42.4,
    maxX: 44.92,
    minZ: -2.8,
    maxZ: 6.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z4_EastSpineMidWalkway',
  });
  addWalkableDeck(collector, {
    minX: 42.4,
    maxX: 47.68,
    minZ: 6.4,
    maxZ: 9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z4_EastSpineSouth',
  });

  // West Receiver Dock connecting directly to Coliseum `eastMidUpperZ [-6.4, -2.0]`!
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 23.6,
    minZ: -6.8,
    maxZ: -1.6,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z4_WestReceiverDock',
  });

  // Upper Threshold Bridges through `z = -10.0` (into Zone 6) & `z = +10.0` (into Zone 8)!
  addWalkableDeck(collector, {
    minX: F5_PORTALS.mechToCommandUpperX[0] + 0.18,
    maxX: F5_PORTALS.mechToCommandUpperX[1] - 0.18,
    minZ: -10.32,
    maxZ: -9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F5_Z4_NorthUpperThresh',
  });
  addWalkableDeck(collector, {
    minX: F5_PORTALS.mechToOrdnanceUpperX[0] + 0.18,
    maxX: F5_PORTALS.mechToOrdnanceUpperX[1] - 0.18,
    minZ: 9.68,
    maxZ: 10.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F5_Z4_SouthUpperThresh',
  });

  // Grounded structural columns under East Spine & West Receiver Dock
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [42.65, -9.2],
    [42.65, -1.8],
    [42.65, 9.2],
    [23.35, -6.5],
    [23.35, -1.9],
  ] as const) {
    colSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: cz });
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
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z4_CatwalkColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Guardrails leaving clean 3.0m skybridge docking openings (`z ∈ [-5.7, -2.7]`) on both sides!
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: -9.68, x2: 42.4, z2: -5.7, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: -2.7, x2: 42.4, z2: 9.68, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 44.92, z1: 6.4, x2: 47.68, z2: 6.4, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 44.92, z1: -2.8, x2: 44.92, z2: 6.4, y: upperY, accentMat, targetGroup: cellGroup });

  buildGuardrailRun(collector, mats, { x1: 18.32, z1: -6.8, x2: 23.6, z2: -6.8, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 18.32, z1: -1.6, x2: 23.6, z2: -1.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: -6.8, x2: 23.6, z2: -5.7, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: -2.7, x2: 23.6, z2: -1.6, y: upperY, accentMat, targetGroup: cellGroup });

  // 18.8m RETRACTABLE MECH GANTRY CRANE SKYBRIDGE (`x = 42.4 -> 23.6, z = -4.2, y = 60.4m`)!
  buildRetractableBridge(collector, mats, {
    id: F5_IDS.bridgeMechGantry,
    label: 'MECH-BAY OVERHEAD GANTRY SKYBRIDGE',
    anchorX: 42.4,
    y: upperY,
    anchorZ: -4.2,
    extendDirX: -1,
    extendDirZ: 0,
    length: 18.8,
    width: 3.0,
    accentMat,
    targetGroup: cellGroup,
  });

  // Dual Activation: `[E]` Override Switch on East Spine + Shootable Relay on South Shared Wall!
  buildWorldSwitch(collector, mats, {
    id: F5_IDS.switchMechGantry,
    x: 43.8,
    y: upperY,
    z: -7.6,
    rotY: -Math.PI * 0.5,
    promptLocked: '[E] EXTEND MECH GANTRY SKYBRIDGE',
    promptActivated: 'MECH GANTRY SKYBRIDGE DEPLOYED',
    bannerText: 'MECH-BAY OVERHEAD GANTRY SKYBRIDGE DEPLOYED',
    deployBridgeId: F5_IDS.bridgeMechGantry,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F5_IDS.lockMechGantry,
    x: 30.0,
    y: baseY + 6.4,
    z: 9.52,
    rotY: Math.PI, // Faces North (-Z) across the Dropship hangar!
    bannerText: 'CRANE RELAY SHATTERED · MECH GANTRY SKYBRIDGE DEPLOYED',
    deployBridgeId: F5_IDS.bridgeMechGantry,
    targetGroup: cellGroup,
  });

  // 7. Ground Cover, Tool Lockers & 4 Chain-Detonating Explosive Plasma Barrels!
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 22.8, y: baseY, z: -4.6, w: 2.6, h: 1.0, d: 0.9, walkableTop: true },
      { x: 22.8, y: baseY, z: 5.8, w: 2.6, h: 1.0, d: 0.9, walkableTop: true },
      { x: 39.2, y: baseY, z: -5.6, w: 2.4, h: 1.0, d: 0.9, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: mats.hazardStripe, name: 'F5_Z4_HangarCover' }
  );

  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'z', coord: 47.66, inwardDir: -1, centerAlong: -6.4, baseY, width: 4.6, height: 3.1 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z4_HangarToolBays' }
  );

  // 2 Pairs of Chain-Detonating Explosive Plasma Barrels flanking the Dropship bay!
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_mech_nw', x: 28.0, y: baseY, z: -4.8, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_mech_nw2', x: 30.2, y: baseY, z: -4.8, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_mech_se', x: 39.6, y: baseY, z: 5.2, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_mech_se2', x: 41.2, y: baseY, z: 3.8, targetGroup: cellGroup });

  // Clean Unobstructed Hangar Signage
  addWallStencilPlaque(cellGroup, mats, {
    code: 'BAY-5',
    title: 'ARMORED MECH-BAY & DROPSHIP HANGAR',
    subtitle: 'VANGUARD-05 MAINTENANCE · GANTRY CRANE · ORDNANCE LINK',
    accentHex: 0xf59e0b,
    x: 33.0,
    y: baseY + 7.6,
    z: -9.62,
    rotY: 0,
    width: 6.6,
    height: 1.48,
  });

  return {
    id: 'f5_east_mechbay',
    group: cellGroup,
    triggerBounds: { minX: 14.0, maxX: 48.5, minZ: -14.0, maxZ: 14.0 },
    center: { x: 33.0, z: 0.0 },
    maxViewDistance: 44.0,
  };
}
