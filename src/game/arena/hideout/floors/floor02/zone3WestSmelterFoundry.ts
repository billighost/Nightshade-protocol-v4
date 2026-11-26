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
  buildJumpPad,
  buildLockedSecurityGate,
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
 * FLOOR 02 — ZONE 3 (WEST OCCLUSION CELL): WEST MOLTEN SMELTER FOUNDRY & 12M EXPRESS GRAND STAIRWAY
 * Footprint: x ∈ [-56.0, -12.0], z ∈ [-9.0, +4.0] (`44m × 13m`)
 *
 * - Towering blast-furnace foundry dominated by a glowing Molten Alloy Crucible Stack with a
 *   spinning overhead induction blower (`animatedSpinners`)!
 * - EXPRESS GRAND FOUNDRY STAIRCASE: Monumental `12.0m`-long uninterrupted steel flight climbing
 *   straight from `L0 (14.0m) -> L2 (20.2m)` down the center bay (`x: -29.0 -> -41.0, z = -2.5`)!
 * - Calibrated `L0 -> L1` Smelter Pneumatic Jump Pad (`f2_pad_smelter_l0_l1`) onto the SE Crucible Catwalk!
 * - Retractable Level 2 Smelter Crane Skybridge #1 (`f2_bridge_smelter_l2`, `15.0m` span) with dual
 *   `[E]` Switch + Shootable Relay!
 * - Jammed Roll-Under Blast Shutter #1 (`f2_jammed_smelter_tower`) AND Locked Signal Tower Bypass
 *   Gate (`f2_gate_tower_bypass`) along the North wall into Zone 10!
 */
export function buildFloor2Zone3WestSmelterFoundry(
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
  cellGroup.name = 'F2_CELL_Z3_WEST_SMELTER';
  collector.group.add(cellGroup);

  // 1. Full L0 Foundry Floor (`x ∈ [-56, -12], z ∈ [-9, +4]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_WEST_OUTER,
    maxX: F2_GRID.X_CORE_WEST,
    minZ: F2_GRID.Z_CONCOURSE_NORTH,
    maxZ: F2_GRID.Z_CUSTOMS,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z3_L0_Floor',
  });

  // 2. Single-Owner Walls: South (`z = +4.0` into Zones 4 & 5), North (`z = -9.0` into Zone 10), West outer (`x = -56.0`)
  //    (East wall `x = -12.0` owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_CUSTOMS,
    spanStart: F2_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F2_GRID.X_CORE_WEST - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F2_PORTALS.Z3_Z4_L0_X[0], end: F2_PORTALS.Z3_Z4_L0_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z4_L1_X[0], end: F2_PORTALS.Z3_Z4_L1_X[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z4_L2_X[0], end: F2_PORTALS.Z3_Z4_L2_X[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z5_L0_X[0], end: F2_PORTALS.Z3_Z5_L0_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z5_L1_X[0], end: F2_PORTALS.Z3_Z5_L1_X[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z5_L2_X[0], end: F2_PORTALS.Z3_Z5_L2_X[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F2_Z3_SouthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_CONCOURSE_NORTH,
    spanStart: F2_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F2_GRID.X_CORE_WEST - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat: moltenMat,
    targetGroup: cellGroup,
    portals: [
      { start: F2_PORTALS.Z3_Z10_JAMMED_X[0], end: F2_PORTALS.Z3_Z10_JAMMED_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z10_GATE_X[0], end: F2_PORTALS.Z3_Z10_GATE_X[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z10_L1_X[0], end: F2_PORTALS.Z3_Z10_L1_X[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z3_Z10_L2_X[0], end: F2_PORTALS.Z3_Z10_L2_X[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F2_Z3_NorthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_WEST_OUTER,
    spanStart: F2_GRID.Z_CONCOURSE_NORTH + 0.3,
    spanEnd: F2_GRID.Z_CUSTOMS - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z3_WestOuterWall',
  });

  // Zero-gap elevated portal sills on South & North partition walls
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z3_Z4_L1_X, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z3_Sill_Z4_L1' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z3_Z4_L2_X, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z3_Sill_Z4_L2' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z3_Z5_L1_X, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z3_Sill_Z5_L1' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CUSTOMS, span: F2_PORTALS.Z3_Z5_L2_X, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z3_Sill_Z5_L2' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CONCOURSE_NORTH, span: F2_PORTALS.Z3_Z10_L1_X, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z3_Sill_Z10_L1' });
  addF2PortalSill(collector, { axis: 'x', coord: F2_GRID.Z_CONCOURSE_NORTH, span: F2_PORTALS.Z3_Z10_L2_X, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z3_Sill_Z10_L2' });

  // Jammed Roll-Under Blast Shutter #1 (`x ∈ [-26, -22], z = -9.0`) into Zone 10!
  buildTacticalDoor(collector, mats, {
    id: F2_IDS.jammedSmelterTower,
    mode: 'jammed_roll',
    x: -24.0,
    y: y0,
    z: F2_GRID.Z_CONCOURSE_NORTH,
    width: 4.0,
    height: 2.65,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });

  // Locked Signal Tower Security Bypass Gate (`x ∈ [-48, -44], z = -9.0`) — unlocked from Zone 10 switch OR shootable relay!
  buildLockedSecurityGate(collector, mats, {
    id: F2_IDS.gateTowerBypass,
    label: 'SIGNAL TOWER SECURITY GATE',
    x: -46.0,
    y: y0,
    z: F2_GRID.Z_CONCOURSE_NORTH,
    width: 4.0,
    height: 2.65,
    spanAxis: 'x',
    lockedHint: 'TOWER GATE LOCKED · ROLL UNDER EAST JAMMED SHUTTER OR SNIPE RELAY INSIDE TOWER',
    targetGroup: cellGroup,
  });

  // 3. LEVEL 1 (`17.1m`) CRUCIBLE CATWALKS (ZERO overlap with Express Grand Stair `x ∈ [-41, -29], z ∈ [-3.8, -1.2]`!)
  //    SE Crucible Catwalk (`x ∈ [-31.0, -12.31], z ∈ [+0.4, +3.69]` -> connects Zone 2 L1 & Zone 4 L1 & receives Jump Pad #1!)
  addWalkableDeck(collector, {
    minX: -31.0,
    maxX: -12.31,
    minZ: 0.4,
    maxZ: 3.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L1_SouthEastCatwalk',
  });
  //    Cross-Bridge East of Express Stair (`x ∈ [-28.4, -25.4], z ∈ [-5.2, +0.4]`)
  addWalkableDeck(collector, {
    minX: -28.4,
    maxX: -25.4,
    minZ: -5.2,
    maxZ: 0.4,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L1_CrossBridge',
  });
  //    North L1 Deck (`x ∈ [-38.0, -25.4], z ∈ [-8.69, -5.2]` -> meets Zone 10 L1 `x ∈ [-36.4, -32.8]`!)
  addWalkableDeck(collector, {
    minX: -38.0,
    maxX: -25.4,
    minZ: -8.69,
    maxZ: -5.2,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L1_NorthDeck',
  });
  //    Far-West L1 Gallery (`x ∈ [-55.69, -49.2], z ∈ [-8.69, +3.69]` -> meets Zone 5 L1 `x ∈ [-53.2, -49.6]`!)
  addWalkableDeck(collector, {
    minX: -55.69,
    maxX: -49.2,
    minZ: -8.69,
    maxZ: 3.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L1_WestGallery',
  });

  // L1 Guardrails (OPEN at Jump Pad #1 landing slot `x ∈ [-19.4, -15.6]` on `z = +0.4` AND CrossBridge joins!)
  buildGuardrailRun(collector, mats, { x1: -31.0, z1: 0.4, x2: -28.4, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -25.4, z1: 0.4, x2: -19.4, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -15.6, z1: 0.4, x2: -12.35, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -31.0, z1: 0.4, x2: -31.0, z2: 3.65, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -28.4, z1: -5.2, x2: -28.4, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -25.4, z1: -8.65, x2: -25.4, z2: 0.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -38.0, z1: -5.2, x2: -28.4, z2: -5.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -38.0, z1: -8.65, x2: -38.0, z2: -5.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -49.2, z1: -8.65, x2: -49.2, z2: 3.65, y: y1, accentMat, targetGroup: cellGroup });

  // Calibrated `L0 -> L1` Pneumatic Jump Pad #1 (`(-17.5, 14.0, -2.6)` -> arcs South over `z = +0.4` onto SE Crucible Catwalk, ~47cm clear below L2 underside!)
  buildJumpPad(collector, mats, {
    id: F2_IDS.padSmelterL0ToL1,
    x: -17.5,
    y: y0,
    z: -2.6,
    launchVy: 10.4,
    launchVx: 0,
    launchVz: 4.6,
    targetGroup: cellGroup,
  });

  // 4. LEVEL 2 (`20.2m`) CRANE SKY-YARD + 12.0M EXPRESS GRAND FOUNDRY STAIRCASE + RETRACTABLE SKYBRIDGE #1!
  //    West L2 Crane Deck (`x ∈ [-55.69, -41.0], z ∈ [-8.69, +3.69]` -> receives Express Stair top at `x = -41.0`,
  //    connects Zone 5 L2 `[-47,-43]`, Zone 10 L2 `[-53.2,-49.8]`, and hosts Retractable Skybridge #1!)
  addWalkableDeck(collector, {
    minX: -55.69,
    maxX: -41.0,
    minZ: -8.69,
    maxZ: 3.69,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L2_WestCraneDeck',
  });
  //    East L2 Viaduct Bridgehead (`x ∈ [-26.0, -12.31], z ∈ [-4.8, -0.2]` -> connects Zone 2 L2!)
  addWalkableDeck(collector, {
    minX: -26.0,
    maxX: -12.31,
    minZ: -4.8,
    maxZ: -0.2,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L2_EastBridgehead',
  });
  //    East L2 South Spur (`x ∈ [-25.0, -21.0], z ∈ [-0.2, +3.69]` -> connects Zone 4 L2!)
  addWalkableDeck(collector, {
    minX: -25.0,
    maxX: -21.0,
    minZ: -0.2,
    maxZ: 3.69,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L2_SouthSpur',
  });
  //    East L2 North Receiver Spur (`x ∈ [-26.0, -21.5], z ∈ [-8.4, -4.8]` -> receives Retractable Skybridge #1!)
  addWalkableDeck(collector, {
    minX: -26.0,
    maxX: -21.5,
    minZ: -8.4,
    maxZ: -4.8,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z3_L2_NorthReceiverSpur',
  });

  // L2 Guardrails (OPEN at Express Stair mouth `z ∈ [-3.8, -1.2]` and Retractable Skybridge #1 mouth `z ∈ [-8.4, -5.2]`!)
  buildGuardrailRun(collector, mats, { x1: -41.0, z1: -5.2, x2: -41.0, z2: -3.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -41.0, z1: -1.2, x2: -41.0, z2: 3.65, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -26.0, z1: -5.2, x2: -26.0, z2: -0.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -21.5, z1: -8.4, x2: -21.5, z2: -4.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -21.5, z1: -4.8, x2: -12.35, z2: -4.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -21.0, z1: -0.2, x2: -12.35, z2: -0.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -25.0, z1: -0.2, x2: -25.0, z2: 3.65, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -21.0, z1: -0.2, x2: -21.0, z2: 3.65, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // MONUMENTAL 12.0M EXPRESS GRAND FOUNDRY STAIRCASE (`L0 14.0m -> L2 20.2m` in one sweeping flight!)
  buildStraightStairFlight(collector, mats, {
    x: -35.0,
    z: -2.5,
    width: 2.6,
    length: 12.0,
    yStart: y2, // x = -41.0 -> 20.2m (West L2 Crane Deck!)
    yEnd: y0, // x = -29.0 -> 14.0m (Foundry Floor!)
    axis: 'x',
    steps: 28,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: moltenMat,
  });

  // RETRACTABLE LEVEL 2 SMELTER CRANE SKYBRIDGE #1 (`x: -41.0 -> -26.0`, `z = -6.8`, `length = 15.0m`, `width = 3.2m`!)
  buildRetractableBridge(collector, mats, {
    id: F2_IDS.bridgeSmelterL2,
    label: 'SMELTER CRANE L2 SKYBRIDGE',
    anchorX: -41.0,
    y: y2,
    anchorZ: -6.8,
    extendDirX: 1,
    extendDirZ: 0,
    length: 15.0,
    width: 3.2,
    targetGroup: cellGroup,
    accentMat: moltenMat,
  });
  buildWorldSwitch(collector, mats, {
    id: F2_IDS.switchSmelterL2,
    x: -42.4,
    y: y2,
    z: -4.4,
    rotY: -Math.PI * 0.5,
    promptLocked: '[E] EXTEND SMELTER CRANE L2 SKYBRIDGE',
    promptActivated: 'SMELTER CRANE SKYBRIDGE EXTENDED',
    bannerText: 'SMELTER CRANE L2 SKYBRIDGE DEPLOYED ACROSS FOUNDRY BAY!',
    deployBridgeId: F2_IDS.bridgeSmelterL2,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F2_IDS.lockSmelterL2,
    bannerText: 'SMELTER CRANE RELAY SHATTERED · L2 SKYBRIDGE DEPLOYED!',
    x: -25.4,
    y: y2 + 1.55,
    z: -4.98,
    rotY: Math.PI * 0.5,
    deployBridgeId: F2_IDS.bridgeSmelterL2,
    targetGroup: cellGroup,
  });

  // 5. HERO COMPOSITE PROP: MOLTEN ALLOY BLAST FURNACE STACK + SPINNING INDUCTION BLOWER (`(-36.0, +1.8)`)
  const furnaceX = -36.0;
  const furnaceZ = 1.8;
  const furnaceBase = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.28, 2.4, 16), mats.armoredSteel);
  furnaceBase.position.set(furnaceX, y0 + 1.21, furnaceZ);
  furnaceBase.castShadow = true;
  furnaceBase.receiveShadow = true;
  cellGroup.add(furnaceBase);
  collector.wallMeshes.push(furnaceBase);

  const furnaceCore = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.48, 3.8, 16), moltenMat);
  furnaceCore.position.set(furnaceX, y0 + 4.3, furnaceZ);
  cellGroup.add(furnaceCore);

  const furnaceCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.02, 4.4, 16), mats.foundryIron);
  furnaceCrown.position.set(furnaceX, y0 + 8.4, furnaceZ);
  furnaceCrown.castShadow = true;
  cellGroup.add(furnaceCrown);
  collector.wallMeshes.push(furnaceCrown);

  // Solid furnace collider
  collector.boxes.push({
    id: 'f2_z3_blast_furnace',
    minX: furnaceX - 2.15,
    maxX: furnaceX + 2.15,
    minY: y0,
    maxY: y0 + ceilH,
    minZ: furnaceZ - 2.15,
    maxZ: furnaceZ + 2.15,
    walkableTop: false,
    tag: 'blast_furnace',
  });

  // Spinning induction exhaust halo orbiting the molten core!
  const blowerRing = new THREE.Group();
  blowerRing.name = 'F2_Z3_FurnaceInductionHalo';
  blowerRing.position.set(furnaceX, y0 + 4.3, furnaceZ);
  const bTorus = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.1, 10, 28), mats.amberAlloy);
  bTorus.rotation.x = Math.PI * 0.5;
  blowerRing.add(bTorus);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.14), mats.structuralSteel);
    const a = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 1.92, 0, Math.sin(a) * 1.92);
    fin.rotation.y = -a;
    blowerRing.add(fin);
  }
  cellGroup.add(blowerRing);
  collector.animatedSpinners?.push({ obj: blowerRing, speed: 1.15 });

  // Grounded L2 support columns, ceiling trusses, lights & Watertight Roof Slab (`top = 25.40m`)
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const colH2 = y2 - 0.34 - (y0 + 0.006);
  for (const cx of [-42.2, -22.2]) {
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
  for (const lx of [-48.0, -34.0, -20.0]) {
    lightSpecs.push({ w: 10.0, h: 0.1, d: 0.44, x: lx, y: y0 + ceilH - 0.06, z: -2.5 });
  }

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 44.3, h: F2_ROOF_THICK, d: 13.0, x: -34.15, y: F2_ROOF_CENTER_Y, z: -2.5 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z3_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const colMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z3_Columns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z3_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -16.8, y: y0, z: -4.8, w: 0.9, h: 1.0, d: 2.5, walkableTop: true },
      { x: -46.5, y: y2, z: -2.5, w: 0.88, h: 0.98, d: 2.4, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z3_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z3_l0', x: -20.8, y: y0, z: -6.2, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z3_l2', x: -49.5, y: y2, z: 0.8, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-SM',
    title: 'SMELTER FOUNDRY',
    subtitle: '12M EXPRESS L0→L2 GRAND STAIR · RETRACTABLE L2 CRANE BRIDGE',
    accentHex: 0xf97316,
    x: -55.62,
    y: y2 + 2.5,
    z: -2.5,
    rotY: Math.PI * 0.5,
    width: 7.4,
    height: 1.45,
  });

  return {
    id: 'f2_zone3_west_smelter',
    group: cellGroup,
    triggerBounds: { minX: -56.0, maxX: -8.0, minZ: -12.0, maxZ: 7.0 },
    center: { x: -34.0, z: -2.5 },
    maxViewDistance: 68.0,
  };
}
