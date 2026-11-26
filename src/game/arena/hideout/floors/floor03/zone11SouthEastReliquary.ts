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
  F3_CEIL_H,
  F3_CONTROL_CENTER_POS,
  F3_GRID,
  F3_IDS,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_ROOF_CENTER_Y,
  F3_ROOF_THICK,
  F3_SUB_Y,
} from './layout';

export interface Floor3Zone11ReliquaryResult {
  cell: OcclusionCell;
  controlCenter: ControlCenterRig;
}

/**
 * FLOOR 03 — ZONE 11 (SE OCCLUSION CELL): THE GRAND CROWN RELIQUARY & REMOTE LEVEL 2 MASTER CONTROL SANCTUM
 * Footprint: x ∈ [+12.0, +54.0], z ∈ [+9.0, +34.0] (`42m × 25m`)
 *
 * The crowning architectural climax of Floor 03 — deliberately placed FAR AWAY from both the spawn
 * vestibule AND Exit Bulkhead 03, elevated all the way on **Level 2 (`Y = 34.2m`)**:
 * - Deep `26.2m` Sacred Cryo-Mirror Basin (`x ∈ [+23.0, +37.0], z ∈ [+16.0, +27.0]`, bottom `25.72m > 25.40m`)
 *   crowned by colossal **Twin Counter-Rotating Aurora Cathedral Halo Rings (`animatedSpinners`)**!
 * - **Grand Ceremonial Two-Stage Ascent (`L0 → L1` South Stair + `L1 → L2` South Crown Stair)** PLUS
 *   Calibrated **`L1 → L2` Crown Ascent Jump Pad (`f3_pad_reliquary_l1_l2`)** launching straight onto the Dais!
 * - **FLOOR 03 MASTER CONTROL CENTER (`[E]`) at `(45.5, 34.2, 24.0)`** atop the Level 2 Obsidian-Gold
 *   Throne Dais — unseals Exit Bulkhead 03 in Zone 12 & wakes Floor 02!
 * - **Retractable Level 2 Crown Extraction Skybridge #3 (`f3_bridge_crown_exit_l2`, `22.5m` span!)**
 *   telescoping dramatically across the Cathedral Halo void straight toward Zone 12's L2 Overlook!
 */
export function buildFloor3Zone11SouthEastReliquary(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): Floor3Zone11ReliquaryResult {
  const ySub = F3_SUB_Y; // 26.2m
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F3_CELL_Z11_CROWN_RELIQUARY';
  collector.group.add(cellGroup);

  // 1. Sunken `26.2m` Cryo-Mirror Basin (`x ∈ [+23.0, +37.0], z ∈ [+16.0, +27.0]`) + 4 Non-Overlapping L0 Slabs
  addWalkableDeck(collector, {
    minX: 23.0,
    maxX: 37.0,
    minZ: 16.0,
    maxZ: 27.0,
    y: ySub,
    thickness: 0.48,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z11_MirrorBasinFloor',
  });
  // L0 North Rim (`z ∈ [+9.0, +16.0]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_CORE_EAST,
    maxX: F3_GRID.X_EAST_OUTER,
    minZ: F3_GRID.Z_CLOISTER_SOUTH,
    maxZ: 16.0,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z11_L0_NorthRim',
  });
  // L0 South Rim (`z ∈ [+27.0, +34.0]`) -> hosts Stage 1 `L0 → L1` Stair (`z = +32.7`)!
  addWalkableDeck(collector, {
    minX: F3_GRID.X_CORE_EAST,
    maxX: F3_GRID.X_EAST_OUTER,
    minZ: 27.0,
    maxZ: F3_GRID.Z_SOUTH_OUTER,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z11_L0_SouthRim',
  });
  // L0 West Rim (`x ∈ [+12.0, +23.0], z ∈ [+16.0, +27.0]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_CORE_EAST,
    maxX: 23.0,
    minZ: 16.0,
    maxZ: 27.0,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z11_L0_WestRim',
  });
  // L0 East Rim (`x ∈ [+37.0, +54.0], z ∈ [+16.0, +27.0]`)
  addWalkableDeck(collector, {
    minX: 37.0,
    maxX: F3_GRID.X_EAST_OUTER,
    minZ: 16.0,
    maxZ: 27.0,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z11_L0_EastRim',
  });

  // Solid basalt basin liners (`26.2m → 28.0m`) + glowing mirror frost sheen + L0 guardrails
  const basinLiners: BoxSpec[] = [
    { w: 14.48, h: 1.24, d: 0.24, x: 30.0, y: ySub + 0.62, z: 15.88 },
    { w: 14.48, h: 1.24, d: 0.24, x: 30.0, y: ySub + 0.62, z: 27.12 },
    { w: 0.24, h: 1.24, d: 11.0, x: 22.88, y: ySub + 0.62, z: 21.5 },
    { w: 0.24, h: 1.24, d: 11.0, x: 37.12, y: ySub + 0.62, z: 21.5 },
  ];
  const linerMesh = buildBatchedBoxesMesh(basinLiners, mats.basaltStone, {
    receiveShadow: true,
    name: 'F3_Z11_BasinLiners',
  });
  if (linerMesh) {
    cellGroup.add(linerMesh);
    collector.wallMeshes.push(linerMesh);
  }
  // Watertight pit-wall colliders (`26.2m → 28.0m`) enclosing the sunken Cryo-Mirror Basin,
  // open cleanly at the SW escape stair mouth (`z ∈ [25.4, 27.0]` on `x = 23.0`)!
  collector.boxes.push(
    { minX: 22.7, maxX: 37.3, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 15.68, maxZ: 16.0, walkableTop: false, tag: 'pit_wall' },
    { minX: 22.7, maxX: 37.3, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 27.0, maxZ: 27.32, walkableTop: false, tag: 'pit_wall' },
    { minX: 22.68, maxX: 23.0, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 16.0, maxZ: 25.4, walkableTop: false, tag: 'pit_wall' },
    { minX: 37.0, maxX: 37.32, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 16.0, maxZ: 27.0, walkableTop: false, tag: 'pit_wall' }
  );

  // Compact SW basalt escape stair climbing cleanly out of the `26.2m` Mirror Basin onto West L0 Rim (`28.0m`)
  buildStraightStairFlight(collector, mats, {
    x: 24.5,
    z: 26.2,
    width: 1.6,
    length: 3.0,
    yStart: y0, // x = 23.0 -> 28.0m (West L0 Rim)
    yEnd: ySub, // x = 26.0 -> 26.2m (Mirror Basin Floor)
    axis: 'x',
    steps: 9,
    railMinSide: true,
    railMaxSide: false,
    accentMat: goldMat,
    targetGroup: cellGroup,
  });

  const mirrorSheet = buildBatchedBoxesMesh(
    [{ w: 13.4, h: 0.024, d: 10.4, x: 30.0, y: ySub + 0.016, z: 21.5 }],
    mats.cryoFrost,
    { name: 'F3_Z11_CryoMirrorSheet' }
  );
  if (mirrorSheet) cellGroup.add(mirrorSheet);

  // Protective guardrails around the sunken mirror basin on L0 (open at SW escape stair `z ∈ [25.4, 27.0]`!)
  buildGuardrailRun(collector, mats, { x1: 23.0, z1: 16.0, x2: 37.0, z2: 16.0, y: y0, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.0, z1: 27.0, x2: 37.0, z2: 27.0, y: y0, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.0, z1: 16.0, x2: 23.0, z2: 25.4, y: y0, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 37.0, z1: 16.0, x2: 37.0, z2: 27.0, y: y0, accentMat: goldMat, targetGroup: cellGroup });

  // 2. Single-Owner Exterior Walls: South (`z = +34.0`), East (`x = +54.0`), West Descent-Shaft Wall (`x = +12.0, z ∈ [+17, +34]`)
  //    (North `z = +9.0` owned by Zone 9; West `z ∈ [+9, +17]` owned by Zone 12!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_SOUTH_OUTER,
    spanStart: F3_GRID.X_CORE_EAST - 0.3,
    spanEnd: F3_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z11_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_EAST_OUTER,
    spanStart: F3_GRID.Z_CLOISTER_SOUTH + 0.3,
    spanEnd: F3_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z11_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_CORE_EAST,
    spanStart: F3_GRID.Z_EXIT + 0.3,
    spanEnd: F3_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z11_WestShaftWall',
  });

  // Interior [E] Switch unlocking the Reliquary L0 Shortcut Gate (`f3_gate_reliquary_bypass`) back into Zone 9!
  buildWorldSwitch(collector, mats, {
    id: F3_IDS.switchReliquaryBypass,
    x: 27.2,
    y: y0,
    z: 11.4,
    rotY: 0,
    promptLocked: '[E] UNSEAL RELIQUARY SHORTCUT GATE',
    promptActivated: 'RELIQUARY SHORTCUT GATE UNSEALED',
    bannerText: 'RELIQUARY SHORTCUT GATE OPENED TO MONOLITH CONDUIT!',
    unlockGateId: F3_IDS.gateReliquaryBypass,
    targetGroup: cellGroup,
  });

  // 3. LEVEL 1 (`31.1m`) RELIQUARY PROMENADE (North Gallery + East Promenade + South Terrace!)
  //    North L1 Gallery (`x ∈ [+12.31, +37.0], z ∈ [+9.31, +15.2]`) -> connects Zone 12 L1 (`z ∈ [+11, +15]`) & Zone 9 L1 (`x ∈ [+32.4, +36.0]`)!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 37.0,
    minZ: 9.31,
    maxZ: 15.2,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z11_L1_NorthGallery',
  });
  //    East L1 Reliquary Promenade (`x ∈ [+37.0, +53.69], z ∈ [+9.31, +33.69]` minus South L1→L2 stair slot `x ∈ [+39.0, +44.8]`? No, stair starts on L1 at x = 39.0!)
  //    Let's keep East L1 Promenade solid across `x ∈ [+37.0, +53.69], z ∈ [+9.31, +33.69]` + South-Central L1 Landing `x ∈ [+30.8, +37.0], z ∈ [+27.8, +33.69]`!
  addWalkableDeck(collector, {
    minX: 37.0,
    maxX: 53.69,
    minZ: 9.31,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z11_L1_EastPromenade',
  });
  addWalkableDeck(collector, {
    minX: 30.8,
    maxX: 37.0,
    minZ: 27.8,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z11_L1_SouthLanding',
  });

  // L1 Guardrails (open cleanly at Stage 1 Stair mouth `z ∈ [+31.6, +33.69]` on `x = +30.8`!)
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 15.2, x2: 37.0, z2: 15.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 37.0, z1: 15.2, x2: 37.0, z2: 27.8, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 30.8, z1: 27.8, x2: 37.0, z2: 27.8, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 30.8, z1: 27.8, x2: 30.8, z2: 31.65, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`34.2m`) OBSIDIAN-GOLD THRONE DAIS + WEST EXTRACTION APPROACH DECK + RETRACTABLE SKYBRIDGE #3!
  //    Main Level 2 Crown Throne Dais (`x ∈ [+41.5, +53.69], z ∈ [+9.31, +31.65]`) + SE Stair Top Landing (`x ∈ [+44.8, +53.69], z ∈ [+31.65, +33.69]`)!
  //    Receives Zone 9 L2 portal (`x ∈ [+45.0, +49.0]`), Stage 2 `L1→L2` Stair (`x = +44.8`), AND `L1→L2` Jump Pad (`x = +42.04, z = +24.0`)!
  addWalkableDeck(collector, {
    minX: 41.5,
    maxX: 53.69,
    minZ: 9.31,
    maxZ: 31.65,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z11_L2_CrownThroneDais',
  });
  addWalkableDeck(collector, {
    minX: 44.8,
    maxX: 53.69,
    minZ: 31.65,
    maxZ: 33.69,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z11_L2_SEStairLanding',
  });
  //    West L2 Extraction Approach Deck (`x ∈ [+12.31, +19.0], z ∈ [+10.8, +15.2]`) -> receives Retractable Crown Bridge #3 & feeds Zone 12 L2 (`z ∈ [+11.0, +15.0]`)!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 19.0,
    minZ: 10.8,
    maxZ: 15.2,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z11_L2_WestExtractionApproach',
  });

  // L2 Throne Dais Guardrails:
  // OPEN at Retractable Crown Bridge #3 mouth (`z ∈ [+11.2, +14.8]` on `x = +41.5`)
  // AND OPEN at `L1→L2` Crown Jump Pad landing slot (`z ∈ [+22.2, +25.8]` on `x = +41.5`)!
  buildGuardrailRun(collector, mats, { x1: 41.5, z1: 9.35, x2: 41.5, z2: 11.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 41.5, z1: 14.8, x2: 41.5, z2: 22.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 41.5, z1: 25.8, x2: 41.5, z2: 31.65, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 41.5, z1: 31.65, x2: 44.8, z2: 31.65, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  // West Extraction Approach Guardrails (open cleanly on East edge `x = +19.0` for incoming Retractable Bridge #3!)
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 10.8, x2: 19.0, z2: 10.8, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 15.2, x2: 19.0, z2: 15.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  // Retractable Level 2 Crown Extraction Skybridge #3 (`x: +41.5 → +19.0`, `z = +13.0`, `length = 22.5m`, `width = 3.6m`!)
  buildRetractableBridge(collector, mats, {
    id: F3_IDS.bridgeCrownExitL2,
    label: 'CROWN EXTRACTION L2 SKYBRIDGE',
    anchorX: 41.5,
    y: y2,
    anchorZ: 13.0,
    extendDirX: -1,
    extendDirZ: 0,
    length: 22.5,
    width: 3.6,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });
  buildWorldSwitch(collector, mats, {
    id: F3_IDS.switchCrownExitL2,
    x: 42.8,
    y: y2,
    z: 16.0,
    rotY: Math.PI * 0.5,
    promptLocked: '[E] EXTEND CROWN EXTRACTION L2 SKYBRIDGE',
    promptActivated: 'CROWN EXTRACTION SKYBRIDGE EXTENDED',
    bannerText: 'CROWN EXTRACTION L2 SKYBRIDGE DEPLOYED · DIRECT ROUTE TO BULKHEAD 03!',
    deployBridgeId: F3_IDS.bridgeCrownExitL2,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F3_IDS.lockCrownExitL2,
    bannerText: 'CROWN BRIDGE RELAY SHATTERED · EXTRACTION SKYBRIDGE DEPLOYED!',
    x: 18.8,
    y: y2 + 1.5,
    z: 10.98,
    rotY: -Math.PI * 0.5,
    deployBridgeId: F3_IDS.bridgeCrownExitL2,
    targetGroup: cellGroup,
  });

  // 5. GRAND TWO-STAGE CEREMONIAL ASCENT (`L0 → L1` & `L1 → L2` flush against South Wall `z = +33.7`!)
  //    PLUS Calibrated `L1 → L2` Crown Ascent Jump Pad!
  buildStraightStairFlight(collector, mats, {
    x: 27.9,
    z: 32.7,
    width: 2.0,
    length: 5.8,
    yStart: y0, // x = +25.0 -> 28.0m
    yEnd: y1, // x = +30.8 -> 31.1m (South-Central L1 Landing!)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  buildStraightStairFlight(collector, mats, {
    x: 41.9,
    z: 32.7,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = +39.0 -> 31.1m (East L1 Promenade!)
    yEnd: y2, // x = +44.8 -> 34.2m (Level 2 Throne Dais!)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  // Calibrated `L1 → L2` Crown Ascent Jump Pad (`(+38.8, 31.1, +24.0)` -> lands at `(+42.04, 34.2, +24.0)` right on the Throne Dais!)
  buildJumpPad(collector, mats, {
    id: F3_IDS.padReliquaryL1ToL2,
    x: 38.8,
    y: y1,
    z: 24.0,
    launchVy: 11.4,
    launchVx: 3.0,
    launchVz: 0,
    targetGroup: cellGroup,
  });

  // 6. REMOTE LEVEL 2 MASTER CONTROL CENTER (`(45.5, 34.2, 24.0)` — Unseals Exit Bulkhead 03 in Zone 12!)
  const controlCenter = buildFloorControlCenter(
    cellGroup,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 3,
      x: F3_CONTROL_CENTER_POS.x,
      y: F3_CONTROL_CENTER_POS.y,
      z: F3_CONTROL_CENTER_POS.z,
      rotY: -Math.PI * 0.5, // Faces West straight out over the Cathedral Halo Sanctuary!
    }
  );

  // Monumental Obsidian-Gold Throne Sanctuary Framing behind the Level 2 Master Control Center!
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  for (const tz of [20.4, 27.6]) {
    basaltSpecs.push({ w: 0.92, h: 3.58, d: 0.92, x: 48.8, y: y2 + 1.796, z: tz });
    goldSpecs.push(
      { w: 1.1, h: 0.14, d: 1.1, x: 48.8, y: y2 + 0.08, z: tz },
      { w: 1.1, h: 0.14, d: 1.1, x: 48.8, y: y2 + 3.66, z: tz }
    );
    collector.boxes.push({
      minX: 48.3,
      maxX: 49.3,
      minY: y2,
      maxY: y2 + 4.0,
      minZ: tz - 0.5,
      maxZ: tz + 0.5,
      walkableTop: false,
    });
  }
  // Golden Crown Lintel seated cleanly ON TOP of the Twin Throne Pylon capitals (zero overlap!)
  goldSpecs.push({ w: 0.72, h: 0.32, d: 8.3, x: 48.8, y: y2 + 3.90, z: 24.0 });

  // 7. COLOSSAL TWIN COUNTER-ROTATING AURORA CATHEDRAL HALO RINGS SUSPENDED OVER THE MIRROR BASIN!
  for (const [idx, rad, tiltX, speed, mat] of [
    [0, 4.4, 0.22, 0.45, goldMat],
    [1, 3.2, -0.34, -0.68, accentMat],
  ] as const) {
    const halo = new THREE.Group();
    halo.name = `F3_Z11_CathedralHalo_${idx}`;
    halo.position.set(30.0, y1 + 2.2, 21.5);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.12, 12, 42), mat);
    torus.rotation.x = Math.PI * 0.5 + tiltX;
    halo.add(torus);
    cellGroup.add(halo);
    collector.animatedSpinners?.push({ obj: halo, speed });
  }
  // Floating central Sacred Relic Crystal inside the Cathedral Halos
  const relicCrystal = new THREE.Group();
  relicCrystal.name = 'F3_Z11_SacredRelicCrystal';
  relicCrystal.position.set(30.0, y1 + 2.2, 21.5);
  const relicMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.55, 0), mats.cryoFrost);
  relicMesh.scale.set(0.85, 2.2, 0.85);
  relicCrystal.add(relicMesh);
  cellGroup.add(relicCrystal);
  collector.animatedSpinners?.push({ obj: relicCrystal, speed: 0.3 });

  // Ceiling light strips & Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  for (const lx of [20.0, 32.0, 46.5]) {
    lightSpecs.push({ w: 9.0, h: 0.1, d: 0.46, x: lx, y: y0 + ceilH - 0.06, z: 21.5 });
  }
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 42.3, h: F3_ROOF_THICK, d: 25.3, x: 33.15, y: F3_ROOF_CENTER_Y, z: 21.65 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z11_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const throneMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z11_ThronePylons',
  });
  if (throneMesh) {
    cellGroup.add(throneMesh);
    collector.wallMeshes.push(throneMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z11_GoldTrim' });
  if (goldMesh) cellGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z11_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 18.0, y: y0, z: 21.5, w: 0.9, h: 1.0, d: 2.6, walkableTop: true },
      { x: 43.2, y: y2, z: 28.5, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: goldMat, name: 'F3_Z11_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z11_l0', x: 19.5, y: y0, z: 29.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z11_l1', x: 41.0, y: y1, z: 18.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z11_l2', x: 47.8, y: y2, z: 16.5, targetGroup: cellGroup });

  // Unmistakable Golden Cathedral Plaque behind Master Control Center!
  addWallStencilPlaque(cellGroup, mats, {
    code: '03-CMD',
    title: 'CROWN RELIQUARY CONTROL',
    subtitle: 'LEVEL 2 MASTER SEAL · UNSEALS BULKHEAD 03',
    accentHex: 0xe6ad46,
    x: 53.62,
    y: y2 + 2.4,
    z: 24.0,
    rotY: -Math.PI * 0.5,
    width: 7.4,
    height: 1.5,
  });

  const cell: OcclusionCell = {
    id: 'f3_zone11_se_crown_reliquary',
    group: cellGroup,
    triggerBounds: { minX: 8.0, maxX: 54.0, minZ: 5.0, maxZ: 34.0 },
    center: { x: 33.0, z: 21.5 },
    maxViewDistance: 68.0,
  };

  return { cell, controlCenter };
}
