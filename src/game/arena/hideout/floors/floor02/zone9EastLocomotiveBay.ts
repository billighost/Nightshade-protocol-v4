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
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildJumpPad,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  addF2PortalSill,
  F2_CEIL_H,
  F2_GRID,
  F2_IDS,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_PORTAL_L0,
  F2_PORTAL_L1,
  F2_PORTAL_L2,
  F2_PORTALS,
  F2_ROOF_CENTER_Y,
  F2_ROOF_THICK,
} from './layout';

/**
 * FLOOR 02 — ZONE 9 (EAST OCCLUSION CELL): EAST LOCOMOTIVE MAINTENANCE BAY & 12M EXPRESS GANTRY STAIR
 * Footprint: x ∈ [+12.0, +56.0], z ∈ [-9.0, +4.0] (`44m × 13m`)
 *
 * - Heavy rail-yard repair bay featuring a hoisted Maglev Engine Core Rig beneath amber-alloy
 *   overhead gantry cranes with a spinning copper induction rotor (`animatedSpinners`)!
 * - EXPRESS GRAND GANTRY STAIRCASE #2: Monumental `12.0m`-long uninterrupted steel flight climbing
 *   straight from `L0 (14.0m) -> L2 (20.2m)` down the center bay (`x: +29.0 -> +41.0, z = -2.5`)!
 * - Calibrated `L0 -> L1` Locomotive Jump Pad #5 (`f2_pad_locomotive_l0_l1`) onto the SW Gantry Walk!
 * - Retractable Level 2 Locomotive Gantry Skybridge #2 (`f2_bridge_locomotive_l2`, `15.0m` span) with
 *   dual `[E]` Switch + Shootable Relay!
 */
export function buildFloor2Zone9EastLocomotiveBay(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const accentMat = mats.floorAccent[2];
  const moltenMat = mats.moltenGlow;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F2_CELL_Z9_EAST_LOCOMOTIVE_BAY';
  collector.group.add(cellGroup);

  // 1. Full L0 Locomotive Bay Floor (`x ∈ [+12, +56], z ∈ [-9, +4]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_CORE_EAST,
    maxX: F2_GRID.X_EAST_OUTER,
    minZ: F2_GRID.Z_CONCOURSE_NORTH,
    maxZ: F2_GRID.Z_CUSTOMS,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z9_L0_Floor',
  });

  // 2. Single-Owner Walls: South (`z = +4.0` into Zones 6 & 8), North (`z = -9.0` into Zone 11), East outer (`x = +56.0`)
  //    (West wall `x = +12.0` owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_CUSTOMS,
    spanStart: F2_GRID.X_CORE_EAST + 0.3,
    spanEnd: F2_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F2_PORTALS.Z9_Z6_L0_X[0], end: F2_PORTALS.Z9_Z6_L0_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z6_L1_X[0], end: F2_PORTALS.Z9_Z6_L1_X[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z6_L2_X[0], end: F2_PORTALS.Z9_Z6_L2_X[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z8_L0_X[0], end: F2_PORTALS.Z9_Z8_L0_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z8_L1_X[0], end: F2_PORTALS.Z9_Z8_L1_X[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z8_L2_X[0], end: F2_PORTALS.Z9_Z8_L2_X[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F2_Z9_SouthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_CONCOURSE_NORTH,
    spanStart: F2_GRID.X_CORE_EAST + 0.3,
    spanEnd: F2_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F2_PORTALS.Z9_Z11_L0_WEST_X[0], end: F2_PORTALS.Z9_Z11_L0_WEST_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z11_L0_EAST_X[0], end: F2_PORTALS.Z9_Z11_L0_EAST_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z11_L1_X[0], end: F2_PORTALS.Z9_Z11_L1_X[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z9_Z11_L2_X[0], end: F2_PORTALS.Z9_Z11_L2_X[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F2_Z9_NorthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_EAST_OUTER,
    spanStart: F2_GRID.Z_CONCOURSE_NORTH + 0.3,
    spanEnd: F2_GRID.Z_CUSTOMS - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z9_EastOuterWall',
  });

  // Zero-gap elevated portal sills on South & North partition walls
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z9_Z6_L1_X, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z9_Sill_Z6_L1' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z9_Z6_L2_X, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z9_Sill_Z6_L2' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z9_Z8_L1_X, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z9_Sill_Z8_L1' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z9_Z8_L2_X, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z9_Sill_Z8_L2' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CONCOURSE_NORTH, span: F2_PORTALS.Z9_Z11_L1_X, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z9_Sill_Z11_L1' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CONCOURSE_NORTH, span: F2_PORTALS.Z9_Z11_L2_X, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z9_Sill_Z11_L2' });

  // 3. LEVEL 1 (`17.1m`) GANTRY CATWALKS (ZERO overlap with Express Grand Stair `x ∈ [+29, +41], z ∈ [-3.8, -1.2]`!)
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 31.0,
    minZ: 0.4,
    maxZ: 3.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L1_SouthWestCatwalk',
  });
  addWalkableDeck(collector, {
    minX: 25.4,
    maxX: 28.4,
    minZ: -5.2,
    maxZ: 0.4,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L1_CrossBridge',
  });
  addWalkableDeck(collector, {
    minX: 25.4,
    maxX: 38.0,
    minZ: -8.69,
    maxZ: -5.2,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L1_NorthDeck',
  });
  addWalkableDeck(collector, {
    minX: 49.2,
    maxX: 55.69,
    minZ: -8.69,
    maxZ: 3.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L1_EastGallery',
  });

  // L1 Guardrails (OPEN at Jump Pad #5 landing slot `x ∈ [15.6, 19.4]` on `z = +0.4` & CrossBridge joins!)
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 0.4, x2: 15.6, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 19.4, z1: 0.4, x2: 25.4, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 28.4, z1: 0.4, x2: 31.0, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 31.0, z1: 0.4, x2: 31.0, z2: 3.65, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 25.4, z1: -8.65, x2: 25.4, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 28.4, z1: -5.2, x2: 28.4, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 28.4, z1: -5.2, x2: 38.0, z2: -5.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 38.0, z1: -8.65, x2: 38.0, z2: -5.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 49.2, z1: -8.65, x2: 49.2, z2: 3.65, y: y1, accentMat, targetGroup: cellGroup });

  // Calibrated `L0 -> L1` Locomotive Jump Pad #5 (`(+17.5, 14.0, -2.6)` -> arcs South over `z = +0.4` onto SW Gantry, ~47cm clear below L2 underside!)
  buildJumpPad(collector, mats, {
    id: F2_IDS.padLocomotiveL0ToL1,
    x: 17.5,
    y: y0,
    z: -2.6,
    launchVy: 10.4,
    launchVx: 0,
    launchVz: 4.6,
    targetGroup: cellGroup,
  });

  // 4. LEVEL 2 (`20.2m`) GANTRY DECKS + 12.0M EXPRESS GRAND STAIRCASE #2 + RETRACTABLE SKYBRIDGE #2!
  addWalkableDeck(collector, {
    minX: 41.0,
    maxX: 55.69,
    minZ: -8.69,
    maxZ: 3.69,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L2_EastCraneDeck',
  });
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 26.0,
    minZ: -4.8,
    maxZ: -0.2,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L2_WestBridgehead',
  });
  addWalkableDeck(collector, {
    minX: 21.0,
    maxX: 25.0,
    minZ: -0.2,
    maxZ: 3.69,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L2_SouthSpur',
  });
  addWalkableDeck(collector, {
    minX: 21.5,
    maxX: 26.0,
    minZ: -8.4,
    maxZ: -4.8,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z9_L2_NorthReceiverSpur',
  });

  // L2 Guardrails (OPEN at Express Stair mouth `z ∈ [-3.8, -1.2]` and Retractable Skybridge #2 mouth `z ∈ [-8.4, -5.2]`!)
  buildGuardrailRun(collector, mats, { x1: 41.0, z1: -5.2, x2: 41.0, z2: -3.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 41.0, z1: -1.2, x2: 41.0, z2: 3.65, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 26.0, z1: -5.2, x2: 26.0, z2: -0.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 21.5, z1: -8.4, x2: 21.5, z2: -4.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: -4.8, x2: 21.5, z2: -4.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: -0.2, x2: 21.0, z2: -0.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 21.0, z1: -0.2, x2: 21.0, z2: 3.65, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 25.0, z1: -0.2, x2: 25.0, z2: 3.65, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // MONUMENTAL 12.0M EXPRESS GRAND GANTRY STAIRCASE #2 (`L0 14.0m -> L2 20.2m`)
  buildStraightStairFlight(collector, mats, {
    x: 35.0,
    z: -2.5,
    width: 2.6,
    length: 12.0,
    yStart: y0, // x = +29.0 -> 14.0m (L0 Floor)
    yEnd: y2, // x = +41.0 -> 20.2m (East L2 Crane Deck!)
    axis: 'x',
    steps: 28,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: moltenMat,
  });

  // RETRACTABLE LEVEL 2 LOCOMOTIVE GANTRY SKYBRIDGE #2 (`x: +41.0 -> +26.0`, `z = -6.8`, `length = 15.0m`, `width = 3.2m`!)
  buildRetractableBridge(collector, mats, {
    id: F2_IDS.bridgeLocomotiveL2,
    label: 'LOCOMOTIVE GANTRY L2 SKYBRIDGE',
    anchorX: 41.0,
    y: y2,
    anchorZ: -6.8,
    extendDirX: -1,
    extendDirZ: 0,
    length: 15.0,
    width: 3.2,
    targetGroup: cellGroup,
    accentMat: moltenMat,
  });
  buildWorldSwitch(collector, mats, {
    id: F2_IDS.switchLocomotiveL2,
    x: 42.4,
    y: y2,
    z: -4.4,
    rotY: Math.PI * 0.5,
    promptLocked: '[E] EXTEND LOCOMOTIVE GANTRY L2 SKYBRIDGE',
    promptActivated: 'LOCOMOTIVE GANTRY SKYBRIDGE EXTENDED',
    bannerText: 'LOCOMOTIVE GANTRY L2 SKYBRIDGE DEPLOYED ACROSS REPAIR BAY!',
    deployBridgeId: F2_IDS.bridgeLocomotiveL2,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F2_IDS.lockLocomotiveL2,
    bannerText: 'GANTRY BRIDGE RELAY SHATTERED · L2 SKYBRIDGE DEPLOYED!',
    x: 25.4,
    y: y2 + 1.55,
    z: -4.98,
    rotY: -Math.PI * 0.5,
    deployBridgeId: F2_IDS.bridgeLocomotiveL2,
    targetGroup: cellGroup,
  });

  // 5. HERO COMPOSITE PROP: HOISTED MAGLEV ENGINE CORE RIG + SPINNING COPPER ROTOR (`(+36.0, +1.8)`)
  const rigX = 36.0;
  const rigZ = 1.8;
  const gantrySpecs: BoxSpec[] = [
    // Heavy twin crane gantry legs straddling the suspended turbine core
    { w: 0.64, h: 7.2, d: 0.64, x: rigX - 2.35, y: y0 + 3.61, z: rigZ },
    { w: 0.64, h: 7.2, d: 0.64, x: rigX + 2.35, y: y0 + 3.61, z: rigZ },
    { w: 5.8, h: 0.54, d: 0.96, x: rigX, y: y0 + 7.45, z: rigZ },
    // Engine service cradle on L0
    { w: 3.4, h: 1.25, d: 2.0, x: rigX, y: y0 + 0.63, z: rigZ },
  ];
  const gantryMesh = buildBatchedBoxesMesh(gantrySpecs, mats.amberAlloy, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z9_EngineGantryRig',
  });
  if (gantryMesh) {
    cellGroup.add(gantryMesh);
    collector.wallMeshes.push(gantryMesh);
  }
  collector.boxes.push({
    id: 'f2_z9_engine_rig',
    minX: rigX - 2.7,
    maxX: rigX + 2.7,
    minY: y0,
    maxY: y0 + 7.75,
    minZ: rigZ - 1.15,
    maxZ: rigZ + 1.15,
    walkableTop: false,
    tag: 'engine_gantry',
  });

  // Spinning suspended Maglev Induction Rotor inside the crane frame!
  const rotorGroup = new THREE.Group();
  rotorGroup.name = 'F2_Z9_MaglevTurbineRotor';
  rotorGroup.position.set(rigX, y0 + 3.4, rigZ);
  const rotorDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.8, 16), mats.armoredSteel);
  rotorDrum.rotation.z = Math.PI * 0.5;
  const rotorRing = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.11, 10, 24), accentMat);
  rotorRing.rotation.y = Math.PI * 0.5;
  rotorGroup.add(rotorDrum, rotorRing);
  cellGroup.add(rotorGroup);
  collector.animatedSpinners?.push({ obj: rotorGroup, speed: 1.35, axis: 'x' });

  // Grounded L2 columns, ceiling lights & Watertight Roof Slab (`top = 25.40m`)
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const colH2 = y2 - 0.34 - (y0 + 0.006);
  for (const cx of [22.2, 42.2]) {
    steelSpecs.push({ w: 0.62, h: colH2, d: 0.62, x: cx, y: y0 + 0.006 + colH2 * 0.5, z: -0.6 });
    collector.boxes.push({
      minX: cx - 0.34,
      maxX: cx + 0.34,
      minY: y0,
      maxY: y2,
      minZ: -0.94,
      maxZ: -0.26,
      walkableTop: false,
    });
  }
  for (const lx of [20.0, 34.0, 48.0]) {
    lightSpecs.push({ w: 10.0, h: 0.1, d: 0.44, x: lx, y: y0 + ceilH - 0.06, z: -2.5 });
  }

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 44.3, h: F2_ROOF_THICK, d: 13.0, x: 34.15, y: F2_ROOF_CENTER_Y, z: -2.5 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z9_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const colMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z9_Columns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z9_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 16.8, y: y0, z: -4.8, w: 0.9, h: 1.0, d: 2.5, walkableTop: true },
      { x: 46.5, y: y2, z: -2.5, w: 0.88, h: 0.98, d: 2.4, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z9_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z9_l0', x: 20.8, y: y0, z: -6.2, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z9_l2', x: 49.5, y: y2, z: 0.8, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-LB',
    title: 'LOCOMOTIVE BAY',
    subtitle: '12M EXPRESS L0→L2 GANTRY STAIR · RETRACTABLE L2 SKYBRIDGE',
    accentHex: 0xeab308,
    x: 55.62,
    y: y2 + 2.5,
    z: -2.5,
    rotY: -Math.PI * 0.5,
    width: 7.4,
    height: 1.45,
  });

  return {
    id: 'f2_zone9_east_locomotive_bay',
    group: cellGroup,
    triggerBounds: { minX: 8.0, maxX: 56.0, minZ: -12.0, maxZ: 7.0 },
    center: { x: 34.0, z: -2.5 },
    maxViewDistance: 68.0,
  };
}
