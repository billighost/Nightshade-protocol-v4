import * as THREE from 'three';
import { buildFloorControlCenter } from '../../mechanics';
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
import type { ControlCenterRig, OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildJumpPad,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F2_CEIL_H,
  F2_CONTROL_CENTER_POS,
  F2_GRID,
  F2_IDS,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_ROOF_CENTER_Y,
  F2_ROOF_THICK,
} from './layout';

export interface Floor2Zone10SignalTowerResult {
  cell: OcclusionCell;
  controlCenter: ControlCenterRig;
}

/**
 * FLOOR 02 — ZONE 10 (NW OCCLUSION CELL): HIGH-VOLTAGE SIGNAL CONTROL TOWER & REMOTE LEVEL 2 MASTER DISPATCH
 * Footprint: x ∈ [-56.0, -12.0], z ∈ [-34.0, -9.0] (`44m × 25m`)
 *
 * The architectural climax of Floor 02 — deliberately placed FAR AWAY from both the South Customs
 * Airlock AND Exit Bulkhead 02, elevated all the way on **Level 2 (`Y = 20.2m`)**:
 * - Colossal **Twin Counter-Rotating Voltaic Transit Radar Rings (`animatedSpinners`)** suspended
 *   above the central Signal Relay Chasm!
 * - **Two-Stage Signal Tower Ascent (`L0 → L1` North Stair + `L1 → L2` North Stair)** PLUS
 *   Calibrated **`L1 → L2` Signal Tower Jump Pad (`f2_pad_tower_l1_l2`)** launching straight onto the Dais!
 * - **FLOOR 02 MASTER DISPATCH CONTROL CENTER (`[E]`) at `(-46.5, 20.2, -24.5)`** atop the Level 2
 *   Command Dais — unseals Exit Bulkhead 02 in Zone 12 & wakes Floor 01 Abyssal Reactor Core!
 * - **Retractable Level 2 High-Line Extraction Skybridge #3 (`f2_bridge_highline_exit_l2`, `22.5m` span!)**
 *   telescoping dramatically East across the Radar Chasm straight to Zone 12's L2 Extraction Gallery!
 */
export function buildFloor2Zone10NorthWestSignalTower(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): Floor2Zone10SignalTowerResult {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const accentMat = mats.floorAccent[2];
  const moltenMat = mats.moltenGlow;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F2_CELL_Z10_NW_SIGNAL_TOWER';
  collector.group.add(cellGroup);

  // 1. Full L0 Signal Tower Floor (`x ∈ [-56, -12], z ∈ [-34, -9]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_WEST_OUTER,
    maxX: F2_GRID.X_CORE_WEST,
    minZ: F2_GRID.Z_NORTH_OUTER,
    maxZ: F2_GRID.Z_CONCOURSE_NORTH,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z10_L0_Floor',
  });

  // 2. Single-Owner Exterior Walls: North (`z = -34.0`), West (`x = -56.0`), East Descent-Shaft Wall (`x = -12.0, z ∈ [-34, -17]`)
  //    (South `z = -9.0` owned by Zone 3; East `z ∈ [-17, -9]` owned by Zone 12!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_NORTH_OUTER,
    spanStart: F2_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F2_GRID.X_CORE_WEST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z10_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_WEST_OUTER,
    spanStart: F2_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F2_GRID.Z_CONCOURSE_NORTH - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z10_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_CORE_WEST,
    spanStart: F2_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F2_GRID.Z_EXIT - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z10_EastShaftWall',
  });

  // Interior [E] Switch + Shootable Relay unlocking the Signal Tower L0 Bypass Gate (`f2_gate_tower_bypass`) back into Zone 3!
  buildWorldSwitch(collector, mats, {
    id: F2_IDS.switchTowerBypass,
    x: -28.5,
    y: y0,
    z: -11.4,
    rotY: Math.PI,
    promptLocked: '[E] UNSEAL SIGNAL TOWER SHORTCUT GATE',
    promptActivated: 'SIGNAL TOWER SHORTCUT GATE UNSEALED',
    bannerText: 'SIGNAL TOWER SECURITY GATE OPENED TO SMELTER FOUNDRY!',
    unlockGateId: F2_IDS.gateTowerBypass,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F2_IDS.lockTowerBypass,
    bannerText: 'TOWER GATE RELAY SHATTERED · SMELTER SHORTCUT OPENED!',
    x: -42.2,
    y: y0 + 2.25,
    z: F2_GRID.Z_CONCOURSE_NORTH - 0.42,
    rotY: Math.PI,
    unlockGateId: F2_IDS.gateTowerBypass,
    targetGroup: cellGroup,
  });

  // 3. LEVEL 1 (`17.1m`) SIGNAL TOWER PROMENADE (South Gallery + West Promenade + North Landing)
  addWalkableDeck(collector, {
    minX: -38.0,
    maxX: -12.31,
    minZ: -15.2,
    maxZ: -9.31,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z10_L1_SouthGallery',
  });
  addWalkableDeck(collector, {
    minX: -55.69,
    maxX: -38.0,
    minZ: -33.69,
    maxZ: -9.31,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z10_L1_WestPromenade',
  });
  addWalkableDeck(collector, {
    minX: -38.0,
    maxX: -31.8,
    minZ: -33.69,
    maxZ: -27.8,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z10_L1_NorthLanding',
  });

  // L1 Guardrails (OPEN at Stage 1 Stair mouth `z ∈ [-33.65, -31.65]` on `x = -31.8`!)
  buildGuardrailRun(collector, mats, { x1: -38.0, z1: -15.2, x2: -12.35, z2: -15.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -38.0, z1: -27.8, x2: -38.0, z2: -15.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -38.0, z1: -27.8, x2: -31.8, z2: -27.8, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -31.8, z1: -31.65, x2: -31.8, z2: -27.8, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`20.2m`) MASTER SIGNAL COMMAND DAIS + EAST EXTRACTION APPROACH + 22.5M HIGH-LINE SKYBRIDGE #3!
  addWalkableDeck(collector, {
    minX: -55.69,
    maxX: -42.5,
    minZ: -31.65,
    maxZ: -9.31,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z10_L2_MasterCommandDais',
  });
  addWalkableDeck(collector, {
    minX: -55.69,
    maxX: -45.8,
    minZ: -33.69,
    maxZ: -31.65,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z10_L2_NWStairLanding',
  });
  addWalkableDeck(collector, {
    minX: -20.0,
    maxX: -12.31,
    minZ: -15.2,
    maxZ: -10.8,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z10_L2_EastExtractionApproach',
  });

  // L2 Command Dais Guardrails:
  // OPEN at High-Line Skybridge #3 mouth (`z ∈ [-14.8, -11.2]` on `x = -42.5`)
  // AND OPEN at `L1 -> L2` Tower Jump Pad landing slot (`z ∈ [-26.3, -22.7]` on `x = -42.5`)!
  buildGuardrailRun(collector, mats, { x1: -42.5, z1: -11.2, x2: -42.5, z2: -9.35, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.5, z1: -22.7, x2: -42.5, z2: -14.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.5, z1: -31.65, x2: -42.5, z2: -26.3, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -45.8, z1: -31.65, x2: -42.5, z2: -31.65, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  // East Extraction Approach Guardrails (open cleanly on West edge `x = -20.0` for incoming High-Line Skybridge #3!)
  buildGuardrailRun(collector, mats, { x1: -20.0, z1: -15.2, x2: -12.35, z2: -15.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -20.0, z1: -10.8, x2: -12.35, z2: -10.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // RETRACTABLE LEVEL 2 HIGH-LINE EXTRACTION SKYBRIDGE #3 (`x: -42.5 -> -20.0`, `z = -13.0`, `length = 22.5m`, `width = 3.6m`!)
  buildRetractableBridge(collector, mats, {
    id: F2_IDS.bridgeHighlineExitL2,
    label: 'HIGH-LINE EXTRACTION L2 SKYBRIDGE',
    anchorX: -42.5,
    y: y2,
    anchorZ: -13.0,
    extendDirX: 1,
    extendDirZ: 0,
    length: 22.5,
    width: 3.6,
    targetGroup: cellGroup,
    accentMat: moltenMat,
  });
  buildWorldSwitch(collector, mats, {
    id: F2_IDS.switchHighlineExitL2,
    x: -43.8,
    y: y2,
    z: -16.0,
    rotY: -Math.PI * 0.5,
    promptLocked: '[E] EXTEND HIGH-LINE EXTRACTION L2 SKYBRIDGE',
    promptActivated: 'HIGH-LINE EXTRACTION SKYBRIDGE EXTENDED',
    bannerText: 'HIGH-LINE EXTRACTION L2 SKYBRIDGE DEPLOYED · DIRECT ROUTE TO BULKHEAD 02!',
    deployBridgeId: F2_IDS.bridgeHighlineExitL2,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F2_IDS.lockHighlineExitL2,
    bannerText: 'HIGH-LINE RELAY SHATTERED · EXTRACTION SKYBRIDGE DEPLOYED!',
    x: -19.8,
    y: y2 + 1.5,
    z: -10.98,
    rotY: Math.PI * 0.5,
    deployBridgeId: F2_IDS.bridgeHighlineExitL2,
    targetGroup: cellGroup,
  });

  // 5. TWO-STAGE SIGNAL TOWER ASCENT (`L0 -> L1` & `L1 -> L2` flush against North Wall `z = -33.7`!)
  //    PLUS Calibrated `L1 -> L2` Tower Jump Pad!
  buildStraightStairFlight(collector, mats, {
    x: -28.9,
    z: -32.7,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = -31.8 -> 17.1m (North L1 Landing)
    yEnd: y0, // x = -26.0 -> 14.0m (L0 Floor)
    axis: 'x',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });
  buildStraightStairFlight(collector, mats, {
    x: -42.9,
    z: -32.7,
    width: 2.0,
    length: 5.8,
    yStart: y2, // x = -45.8 -> 20.2m (NW L2 Stair Landing)
    yEnd: y1, // x = -40.0 -> 17.1m (West L1 Promenade)
    axis: 'x',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: moltenMat,
  });

  // Calibrated `L1 -> L2` Signal Tower Jump Pad (`(-39.6, 17.1, -24.5)` -> arcs West onto L2 Command Dais!)
  buildJumpPad(collector, mats, {
    id: F2_IDS.padTowerL1ToL2,
    x: -39.6,
    y: y1,
    z: -24.5,
    launchVy: 11.8,
    launchVx: -3.2,
    launchVz: 0,
    targetGroup: cellGroup,
  });

  // 6. REMOTE LEVEL 2 MASTER DISPATCH CONTROL CENTER (`(-46.5, 20.2, -24.5)` — Unseals Exit Bulkhead 02 & wakes Floor 01!)
  const controlCenter = buildFloorControlCenter(
    cellGroup,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 2,
      x: F2_CONTROL_CENTER_POS.x,
      y: F2_CONTROL_CENTER_POS.y,
      z: F2_CONTROL_CENTER_POS.z,
      rotY: Math.PI * 0.5, // Faces East straight across the Voltaic Radar Array toward Extraction!
    }
  );

  // Monumental Copper-Alloy & Steel Signal Pylon Arch framing the Master Control Center!
  const steelSpecs: BoxSpec[] = [];
  const alloySpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  for (const tz of [-28.1, -20.9]) {
    steelSpecs.push({ w: 0.92, h: 4.08, d: 0.92, x: -49.8, y: y2 + 2.046, z: tz });
    alloySpecs.push(
      { w: 1.1, h: 0.14, d: 1.1, x: -49.8, y: y2 + 0.08, z: tz },
      { w: 1.1, h: 0.14, d: 1.1, x: -49.8, y: y2 + 4.16, z: tz }
    );
    collector.boxes.push({
      minX: -50.3,
      maxX: -49.3,
      minY: y2,
      maxY: y2 + 4.45,
      minZ: tz - 0.5,
      maxZ: tz + 0.5,
      walkableTop: false,
    });
  }
  alloySpecs.push({ w: 0.72, h: 0.28, d: 8.3, x: -49.8, y: y2 + 4.36, z: -24.5 });

  // 7. HERO ANIMATED CENTERPIECE: VOLTAIC TRANSIT RADAR ARRAY & HIGH-VOLTAGE TELEMETRY MAST (`(-27.0, -22.5)`)
  const mastX = -27.0;
  const mastZ = -22.5;
  const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.45, 3.2, 12), mats.armoredSteel);
  mastBase.position.set(mastX, y0 + 1.61, mastZ);
  mastBase.castShadow = true;
  mastBase.receiveShadow = true;
  cellGroup.add(mastBase);
  collector.wallMeshes.push(mastBase);
  collector.boxes.push({
    id: 'f2_z10_radar_mast',
    minX: mastX - 1.45,
    maxX: mastX + 1.45,
    minY: y0,
    maxY: y0 + 5.6,
    minZ: mastZ - 1.45,
    maxZ: mastZ + 1.45,
    walkableTop: false,
    tag: 'signal_radar_mast',
  });

  const radarCore = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 5.2, 12), accentMat);
  radarCore.position.set(mastX, y1 + 1.8, mastZ);
  cellGroup.add(radarCore);

  for (const [idx, rad, tiltX, speed, mat] of [
    [0, 4.1, 0.22, 0.48, moltenMat],
    [1, 2.9, -0.34, -0.72, accentMat],
  ] as const) {
    const ringGroup = new THREE.Group();
    ringGroup.name = `F2_Z10_RadarHalo_${idx}`;
    ringGroup.position.set(mastX, y1 + 2.3, mastZ);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.11, 10, 36), mat);
    torus.rotation.x = Math.PI * 0.5 + tiltX;
    ringGroup.add(torus);
    cellGroup.add(ringGroup);
    collector.animatedSpinners?.push({ obj: ringGroup, speed });
  }

  for (const lx of [-47.5, -33.0, -20.0]) {
    lightSpecs.push({ w: 9.5, h: 0.1, d: 0.46, x: lx, y: y0 + ceilH - 0.06, z: -21.5 });
  }
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 44.3, h: F2_ROOF_THICK, d: 25.3, x: -34.15, y: F2_ROOF_CENTER_Y, z: -21.65 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z10_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const pylonMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z10_CommandPylons',
  });
  if (pylonMesh) {
    cellGroup.add(pylonMesh);
    collector.wallMeshes.push(pylonMesh);
  }
  const alloyMesh = buildBatchedBoxesMesh(alloySpecs, mats.amberAlloy, { name: 'F2_Z10_AlloyTrim' });
  if (alloyMesh) cellGroup.add(alloyMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z10_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -18.5, y: y0, z: -21.5, w: 0.9, h: 1.0, d: 2.5, walkableTop: true },
      { x: -44.2, y: y2, z: -28.8, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z10_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z10_l0', x: -19.5, y: y0, z: -28.5, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z10_l1', x: -42.0, y: y1, z: -18.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z10_l2', x: -48.5, y: y2, z: -17.0, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-CMD',
    title: 'SIGNAL TOWER DISPATCH',
    subtitle: 'LEVEL 2 MASTER OVERRIDE · UNSEALS BULKHEAD 02',
    accentHex: 0xeab308,
    x: -55.62,
    y: y2 + 3.38,
    z: -24.5,
    rotY: Math.PI * 0.5,
    width: 7.0,
    height: 1.35,
  });

  const cell: OcclusionCell = {
    id: 'f2_zone10_nw_signal_tower',
    group: cellGroup,
    triggerBounds: { minX: -56.0, maxX: -8.0, minZ: -34.0, maxZ: -5.0 },
    center: { x: -34.0, z: -21.5 },
    maxViewDistance: 68.0,
  };

  return { cell, controlCenter };
}
