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
  F4_BASE_Y,
  F4_CEILINGS,
  F4_IDS,
  F4_PORTALS,
  F4_UPPER_Y,
  F4_WALLS,
} from './layout';

/**
 * FLOOR 04 — ZONE 4 (EAST OCCLUSION CELL): SUSPENDED CABLE-CAR TRAM DEPOT & CANYON FOUNDRY
 * Footprint: x ∈ [+18.0, +48.0] (30m) × z ∈ [-10.0, +10.0] (20m), 10.6m tall!
 *
 * Signature CoD Cable-Car Foundry × Control Brutalist Transit Bay:
 * - Multi-Part Composite 3D Armored Canyon Gondola Tram ("NIGHTSHADE-04") suspended cleanly
 *   from massive overhead steel twin I-beam gantry rails (`x = 33.0, z = +2.4`)!
 * - Elevated East Spine Mezzanine (`46.4m`) + West Canyon Entry Balcony (`46.4m`) linked by
 *   18.8m Retractable Foundry Crane Skybridge #2 (`f4_bridge_foundry_crane`) deployable via
 *   `[E]` switch OR sniping the crimson Relay Lock mounted on the overhead tram crane!
 * - Flush South-Wall Staircase (`z = +8.42`, `maxZ = +9.67` flush against `+9.70` -> ZERO wall gap!)
 * - Shared North (`z = -10.0`) & South (`z = +10.0`) partition walls featuring:
 *   - Jammed Roll-Under Blast Shutter #2 (`f4_jammed_foundry_se`) into SE Freight Yard!
 *   - Motorized Auto Doors into NE Overwatch & SE Freight Yard!
 */
export function buildFloor4Zone4EastTramFoundry(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.eastTramFoundry; // 10.6m
  const amberMat = mats.floorAccent[4]; // Volcanic foundry amber
  const hydroMat = mats.floorAccent[6]; // Coolant telemetry cyan

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F4_Z4_EAST_TRAM_FOUNDRY';
  collector.group.add(cellGroup);

  // 1. Floor & Coffered Foundry Ceiling Slabs (`x ∈ [+18.0, +48.0], z ∈ [-10.0, +10.0]`)
  addWalkableDeck(collector, {
    minX: F4_WALLS.canyonEastX,
    maxX: F4_WALLS.eastOuterX,
    minZ: F4_WALLS.northSplitZ,
    maxZ: F4_WALLS.southSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F4_Z4_FoundryFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 19.4, x: 33.0, y: baseY + ceilH + 0.25, z: 0.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F4_Z4_FoundryCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // Overhead Twin Gondola Crane I-Beams running East-West + High-Bay Lights
  const craneRailSpecs: BoxSpec[] = [
    { w: 29.2, h: 0.64, d: 0.46, x: 33.0, y: baseY + ceilH - 0.54, z: 0.9 },
    { w: 29.2, h: 0.64, d: 0.46, x: 33.0, y: baseY + ceilH - 0.54, z: 3.9 },
    { w: 29.2, h: 0.46, d: 0.42, x: 33.0, y: baseY + ceilH - 0.26, z: -4.2 },
  ];
  const lightSpecs: BoxSpec[] = [];
  for (const lx of [22.5, 29.5, 36.5, 43.5]) {
    lightSpecs.push(
      { w: 0.34, h: 0.08, d: 5.8, x: lx, y: baseY + ceilH - 0.06, z: -5.4 },
      { w: 0.34, h: 0.08, d: 5.8, x: lx, y: baseY + ceilH - 0.06, z: 5.8 }
    );
  }
  const craneRailMesh = buildBatchedBoxesMesh(craneRailSpecs, mats.structuralSteel, {
    castShadow: true,
    name: 'F4_Z4_OverheadTramRails',
  });
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F4_Z4_RoofLights' });
  if (craneRailMesh) cellGroup.add(craneRailMesh);
  if (lightMesh) cellGroup.add(lightMesh);

  // 2. Perimeter & Shared Partition Walls
  // East Outer Foundry Wall (`x = +48.0`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.eastOuterX,
    spanStart: F4_WALLS.northSplitZ + 0.3,
    spanEnd: F4_WALLS.southSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    name: 'F4_Z4_EastOuterWall',
  });

  // Shared North Partition Wall (`z = -10.0`, Zone 4 <-> Zone 6 NE Overwatch)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.northSplitZ,
    spanStart: F4_WALLS.canyonEastX + 0.3,
    spanEnd: F4_WALLS.eastOuterX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    portals: [
      {
        start: F4_PORTALS.foundryToOverwatchAutoX[0],
        end: F4_PORTALS.foundryToOverwatchAutoX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.foundryToOverwatchOpenX[0],
        end: F4_PORTALS.foundryToOverwatchOpenX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.foundryToOverwatchUpperX[0],
        end: F4_PORTALS.foundryToOverwatchUpperX[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F4_Z4_NorthPartitionWall',
  });

  // Shared South Partition Wall (`z = +10.0`, Zone 4 <-> Zone 8 SE Freight Yard)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.southSplitZ,
    spanStart: F4_WALLS.canyonEastX + 0.3,
    spanEnd: F4_WALLS.eastOuterX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    portals: [
      {
        start: F4_PORTALS.foundryToFreightAutoX[0],
        end: F4_PORTALS.foundryToFreightAutoX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.foundryToFreightJammedX[0],
        end: F4_PORTALS.foundryToFreightJammedX[1],
        bottomY: baseY,
        topY: baseY + 3.8,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.foundryToFreightUpperX[0],
        end: F4_PORTALS.foundryToFreightUpperX[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F4_Z4_SouthPartitionWall',
  });

  // Jammed Roll-Under Blast Shutter #2 (`f4_jammed_foundry_se`) + 2 Motorized Auto Doors!
  buildTacticalDoor(collector, mats, {
    id: F4_IDS.jammedFoundrySe,
    mode: 'jammed_roll',
    x: (F4_PORTALS.foundryToFreightJammedX[0] + F4_PORTALS.foundryToFreightJammedX[1]) * 0.5,
    y: baseY,
    z: F4_WALLS.southSplitZ,
    width: F4_PORTALS.foundryToFreightJammedX[1] - F4_PORTALS.foundryToFreightJammedX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f4_auto_foundry_overwatch',
    mode: 'automatic',
    x: (F4_PORTALS.foundryToOverwatchAutoX[0] + F4_PORTALS.foundryToOverwatchAutoX[1]) * 0.5,
    y: baseY,
    z: F4_WALLS.northSplitZ,
    width: F4_PORTALS.foundryToOverwatchAutoX[1] - F4_PORTALS.foundryToOverwatchAutoX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f4_auto_foundry_freight',
    mode: 'automatic',
    x: (F4_PORTALS.foundryToFreightAutoX[0] + F4_PORTALS.foundryToFreightAutoX[1]) * 0.5,
    y: baseY,
    z: F4_WALLS.southSplitZ,
    width: F4_PORTALS.foundryToFreightAutoX[1] - F4_PORTALS.foundryToFreightAutoX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });

  // 3. HERO LANDMARK: COMPOSITE 3D SUSPENDED ARMORED CANYON GONDOLA TRAM ("NIGHTSHADE-04")!
  // Suspended cleanly from overhead twin I-beams (`y = baseY + 2.55 .. baseY + 5.75`) over grounded maintenance cradle!
  const tramX = 33.0;
  const tramZ = 2.4;
  const tramHullSpecs: BoxSpec[] = [
    // Heavy overhead bogie carriage clamping cleanly onto both I-beams (`z = 0.9` & `3.9`)
    { w: 7.4, h: 0.58, d: 3.7, x: tramX, y: baseY + ceilH - 0.9, z: tramZ },
    // Dual reinforced steel suspension hanger yokes connecting bogie cleanly down to gondola roof
    { w: 0.42, h: 3.15, d: 0.36, x: tramX - 2.6, y: baseY + 7.4, z: tramZ - 1.0 },
    { w: 0.42, h: 3.15, d: 0.36, x: tramX + 2.6, y: baseY + 7.4, z: tramZ - 1.0 },
    { w: 0.42, h: 3.15, d: 0.36, x: tramX - 2.6, y: baseY + 7.4, z: tramZ + 1.0 },
    { w: 0.42, h: 3.15, d: 0.36, x: tramX + 2.6, y: baseY + 7.4, z: tramZ + 1.0 },
    // Armored gondola cabin roof, armored chassis floor & tapered end nose cowls
    { w: 8.6, h: 0.38, d: 3.2, x: tramX, y: baseY + 5.65, z: tramZ },
    { w: 8.8, h: 0.46, d: 3.3, x: tramX, y: baseY + 2.72, z: tramZ },
    { w: 0.68, h: 2.5, d: 3.16, x: tramX - 4.06, y: baseY + 4.21, z: tramZ },
    { w: 0.68, h: 2.5, d: 3.16, x: tramX + 4.06, y: baseY + 4.21, z: tramZ },
    // Vertical cabin window mullions along North & South flanks
    { w: 0.34, h: 2.54, d: 0.24, x: tramX - 1.5, y: baseY + 4.18, z: tramZ - 1.52 },
    { w: 0.34, h: 2.54, d: 0.24, x: tramX + 1.5, y: baseY + 4.18, z: tramZ - 1.52 },
    { w: 0.34, h: 2.54, d: 0.24, x: tramX - 1.5, y: baseY + 4.18, z: tramZ + 1.52 },
    { w: 0.34, h: 2.54, d: 0.24, x: tramX + 1.5, y: baseY + 4.18, z: tramZ + 1.52 },
    // Grounded Hydraulic Service Jacks beneath the gondola (clear 2.5m walk-under pass-through in center!)
    { w: 0.72, h: 2.48, d: 2.6, x: tramX - 3.6, y: baseY + 1.244, z: tramZ },
    { w: 0.72, h: 2.48, d: 2.6, x: tramX + 3.6, y: baseY + 1.244, z: tramZ },
  ];
  const tramGlassSpecs: BoxSpec[] = [
    { w: 7.4, h: 1.88, d: 0.1, x: tramX, y: baseY + 4.32, z: tramZ - 1.48 },
    { w: 7.4, h: 1.88, d: 0.1, x: tramX, y: baseY + 4.32, z: tramZ + 1.48 },
  ];
  const tramAccentSpecs: BoxSpec[] = [
    { w: 8.2, h: 0.12, d: 0.06, x: tramX, y: baseY + 2.98, z: tramZ - 1.66 },
    { w: 8.2, h: 0.12, d: 0.06, x: tramX, y: baseY + 2.98, z: tramZ + 1.66 },
    { w: 0.08, h: 0.36, d: 2.2, x: tramX - 4.44, y: baseY + 3.9, z: tramZ },
    { w: 0.08, h: 0.36, d: 2.2, x: tramX + 4.44, y: baseY + 3.9, z: tramZ },
  ];

  const tramHullMesh = buildBatchedBoxesMesh(tramHullSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z4_GondolaTramHull',
  });
  const tramGlassMesh = buildBatchedBoxesMesh(tramGlassSpecs, mats.glassPanel, { name: 'F4_Z4_GondolaGlass' });
  const tramAccentMesh = buildBatchedBoxesMesh(tramAccentSpecs, amberMat, { name: 'F4_Z4_GondolaTrim' });
  if (tramHullMesh) {
    cellGroup.add(tramHullMesh);
    collector.wallMeshes.push(tramHullMesh);
  }
  if (tramGlassMesh) cellGroup.add(tramGlassMesh);
  if (tramAccentMesh) cellGroup.add(tramAccentMesh);

  // Glowing cyan interior cabin telemetry console strips visible cleanly through gondola panoramic glass!
  const tramConsoleGlow = buildBatchedBoxesMesh(
    [
      { w: 6.4, h: 0.14, d: 0.18, x: tramX, y: baseY + 3.45, z: tramZ - 1.18 },
      { w: 6.4, h: 0.14, d: 0.18, x: tramX, y: baseY + 3.45, z: tramZ + 1.18 },
    ],
    hydroMat,
    { name: 'F4_Z4_GondolaCabinConsoles' }
  );
  if (tramConsoleGlow) cellGroup.add(tramConsoleGlow);

  // Kinetic Rotating Overhead Cable-Drive Bullwheel Tension Pulley driving the Gondola Tram line!
  const pulleyGroup = new THREE.Group();
  pulleyGroup.name = 'F4_Z4_TramDrivePulley';
  pulleyGroup.position.set(40.8, baseY + ceilH - 1.25, tramZ);
  const pulleyRim = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.12, 10, 28), mats.structuralSteel);
  pulleyRim.rotation.x = Math.PI * 0.5;
  const pulleyHub = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.48, 16), amberMat);
  const pulleySpokes = buildBatchedBoxesMesh(
    [
      { w: 2.68, h: 0.1, d: 0.16, x: 0, y: 0, z: 0 },
      { w: 0.16, h: 0.1, d: 2.68, x: 0, y: 0.012, z: 0 },
    ],
    mats.brushedMetal,
    { name: 'F4_Z4_PulleySpokes' }
  );
  pulleyGroup.add(pulleyRim, pulleyHub);
  if (pulleySpokes) pulleyGroup.add(pulleySpokes);
  cellGroup.add(pulleyGroup);
  collector.animatedSpinners?.push({ obj: pulleyGroup, speed: 1.25 });

  // Solid colliders for Gondola Service Jacks (left/right) + Suspended Cabin Body (clean 2.48m walk-under center!)
  collector.boxes.push(
    { minX: tramX - 4.0, maxX: tramX - 3.2, minY: baseY, maxY: baseY + 2.52, minZ: tramZ - 1.35, maxZ: tramZ + 1.35, walkableTop: false },
    { minX: tramX + 3.2, maxX: tramX + 4.0, minY: baseY, maxY: baseY + 2.52, minZ: tramZ - 1.35, maxZ: tramZ + 1.35, walkableTop: false },
    { minX: tramX - 4.42, maxX: tramX + 4.42, minY: baseY + 2.52, maxY: baseY + 5.88, minZ: tramZ - 1.66, maxZ: tramZ + 1.66, walkableTop: true }
  );

  addWallStencilPlaque(cellGroup, mats, {
    code: 'NS-04',
    title: 'NIGHTSHADE-04 TRAM',
    subtitle: 'CANYON CABLE-CAR FOUNDRY · SHOOT GANTRY RELAY FOR SKYBRIDGE',
    accentHex: 0xf97316,
    x: tramX,
    y: baseY + 4.35,
    z: tramZ - 1.68,
    rotY: Math.PI,
    width: 4.8,
    height: 1.05,
  });

  // 4. ELEVATED `+4.4m` FOUNDRY MEZZANINES (`y = 46.4m`) + FLUSH SOUTH-WALL STAIRCASE + RETRACTABLE SKYBRIDGE #2!
  // (A) East Spine Mezzanine (`x ∈ [42.4, 47.68], z ∈ [-9.68, +9.68]`) linking NE Overwatch & SE Freight Upper Portals!
  addWalkableDeck(collector, {
    minX: 42.4,
    maxX: 47.68,
    minZ: -9.68,
    maxZ: 9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z4_EastSpineMezzanine',
  });
  // (B) West Canyon Entry Balcony (`x ∈ [18.32, 23.6], z ∈ [-6.6, -1.8]`) meeting Zone 2 `eastMidUpperZ: [-6.4, -2.0]`!
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 23.6,
    minZ: -6.6,
    maxZ: -1.8,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z4_WestEntryBalcony',
  });
  // (C) South Foundry Stair Top Walk (`x ∈ [34.0, 42.4], z ∈ [6.6, 9.68]`, inset 6mm at `x = 42.4` -> ZERO Z-fighting!)
  const southTopWalkMesh = buildBatchedBoxesMesh(
    [{ w: 8.394, h: 0.42, d: 3.08, x: 38.197, y: upperY - 0.21, z: 8.14 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z4_SouthStairTopWalk' }
  );
  if (southTopWalkMesh) {
    cellGroup.add(southTopWalkMesh);
    collector.wallMeshes.push(southTopWalkMesh);
  }
  collector.slabs.push({ minX: 34.0, maxX: 42.4, minZ: 6.6, maxZ: 9.68, y: upperY, thickness: 0.42 });

  // Upper Portal Threshold Bridges through North & South Partition Walls
  addWalkableDeck(collector, {
    minX: F4_PORTALS.foundryToOverwatchUpperX[0] + 0.18,
    maxX: F4_PORTALS.foundryToOverwatchUpperX[1] - 0.18,
    minZ: -10.32,
    maxZ: -9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F4_Z4_NorthUpperThresh',
  });
  addWalkableDeck(collector, {
    minX: F4_PORTALS.foundryToFreightUpperX[0] + 0.18,
    maxX: F4_PORTALS.foundryToFreightUpperX[1] - 0.18,
    minZ: 9.68,
    maxZ: 10.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F4_Z4_SouthUpperThresh',
  });

  // Flush South-Wall Staircase (`z = +8.42`, `width = 2.50` -> `maxZ = +9.67` flush against `+9.70`!)
  // Ascends West->East from `x = 26.0` (`baseY`) up to `x = 34.0` (`upperY`) — ZERO wall gap!
  buildStraightStairFlight(collector, mats, {
    x: 30.0,
    z: 8.42,
    width: 2.5,
    length: 8.0,
    yStart: baseY,
    yEnd: upperY,
    axis: 'x',
    steps: 20,
    railMinSide: true,
    railMaxSide: false,
    accentMat: amberMat,
    targetGroup: cellGroup,
  });

  // Grounded Support Columns for East Spine & West Balcony (cleanly clear of all doorways & tram!)
  const colSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const [cx, cz] of [
    [23.3, -6.3],
    [23.3, -2.1],
    [42.7, -6.4],
    [42.7, 0.2],
    [42.7, 6.8],
  ] as const) {
    colSpecs.push({ w: 0.42, h: colH, d: 0.42, x: cx, y: baseY + 0.004 + colH * 0.5, z: cz });
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
    name: 'F4_Z4_MezzanineCols',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Guardrails leaving clean 3.0m opening (`z ∈ [-5.7, -2.7]`) on BOTH East & West edges for Skybridge #2!
  buildGuardrailRun(collector, mats, { x1: 18.32, z1: -6.6, x2: 23.6, z2: -6.6, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 18.32, z1: -1.8, x2: 23.6, z2: -1.8, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: -6.6, x2: 23.6, z2: -5.7, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: -2.7, x2: 23.6, z2: -1.8, y: upperY, accentMat: amberMat, targetGroup: cellGroup });

  buildGuardrailRun(collector, mats, { x1: 42.4, z1: -9.68, x2: 42.4, z2: -5.7, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: -2.7, x2: 42.4, z2: 6.6, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 34.0, z1: 6.6, x2: 42.4, z2: 6.6, y: upperY, accentMat: amberMat, targetGroup: cellGroup });

  // 5. RETRACTABLE FOUNDRY CRANE SKYBRIDGE #2 (`f4_bridge_foundry_crane`, 18.8m span across `z = -4.2`!)
  buildRetractableBridge(collector, mats, {
    id: F4_IDS.bridgeFoundryCrane,
    label: 'FOUNDRY CRANE SKYBRIDGE',
    anchorX: 23.6,
    y: upperY,
    anchorZ: -4.2,
    extendDirX: 1,
    extendDirZ: 0,
    length: 18.8,
    width: 3.0,
    accentMat: amberMat,
    targetGroup: cellGroup,
  });

  // Dual Activation: `[E]` Switch on West Entry Balcony + Shootable Crimson Relay Lock on overhead crane beam!
  buildWorldSwitch(collector, mats, {
    id: F4_IDS.switchFoundryCrane,
    x: 21.8,
    y: upperY,
    z: -2.4,
    rotY: Math.PI,
    promptLocked: '[E] DEPLOY FOUNDRY CRANE SKYBRIDGE',
    promptActivated: 'FOUNDRY CRANE SKYBRIDGE DEPLOYED',
    bannerText: 'FOUNDRY CRANE SKYBRIDGE DEPLOYED',
    deployBridgeId: F4_IDS.bridgeFoundryCrane,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F4_IDS.lockFoundryCrane,
    x: 33.0,
    y: baseY + ceilH - 1.35,
    z: -4.2,
    rotY: -Math.PI * 0.5, // Faces West straight toward West Entry Balcony & Canyon!
    bannerText: 'CRANE RELAY SHATTERED · FOUNDRY SKYBRIDGE DEPLOYED',
    deployBridgeId: F4_IDS.bridgeFoundryCrane,
    targetGroup: cellGroup,
  });

  // 6. Tactical Foundry Cover + 2 Explosive Plasma Barrels + Signage
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 26.0, y: baseY, z: -4.2, w: 2.2, h: 0.96, d: 0.9, walkableTop: true },
      { x: 38.4, y: baseY, z: -4.2, w: 2.2, h: 0.96, d: 0.9, walkableTop: true },
      { x: 45.0, y: upperY, z: 2.2, w: 2.0, h: 0.92, d: 0.9, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: hydroMat, name: 'F4_Z4_FoundryCover' }
  );
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_foundry_w', x: 22.8, y: baseY, z: 5.4, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_foundry_e', x: 40.4, y: baseY, z: -1.6, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '04-Z4',
    title: 'TRAM DEPOT FOUNDRY',
    subtitle: 'GONDOLA BAY · ROLL-UNDER SHUTTER TO SE FREIGHT YARD',
    accentHex: 0xf97316,
    x: 47.62,
    y: baseY + 8.4,
    z: 0.0,
    rotY: -Math.PI * 0.5,
    width: 6.4,
    height: 1.48,
  });

  return {
    id: 'f4_zone4_east_tram_foundry',
    group: cellGroup,
    triggerBounds: { minX: -6.0, maxX: 49.5, minZ: -32.5, maxZ: 32.5 },
    center: { x: 33.0, z: 0.0 },
    maxViewDistance: 46.0,
  };
}
