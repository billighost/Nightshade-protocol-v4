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
} from '../../architecture';
import {
  buildCurvedSpiralStairs,
  buildGuardrailRun,
  buildRingWalkwayDeck,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildJumpPad,
} from '../../mechanics';
import {
  F3_CEIL_H,
  F3_GRID,
  F3_IDS,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_ROOF_CENTER_Y,
  F3_ROOF_THICK,
  F3_SUB_Y,
} from './layout';

/**
 * FLOOR 03 — ZONE 5 (FAR NW OCCLUSION CELL): THE GLACIAL CRYPT & DOUBLE-HELIX SPIRAL SPIRE
 * Footprint: x ∈ [-54.0, -32.0], z ∈ [-34.0, -4.0] (`22m × 30m`)
 *
 * - Monumental ancient Cryo-Core Spire rising from a sunken `26.2m` Crystal Well (`center = (-43.0, -19.0)`)
 *   all the way to the `38.3m` temple ceiling, surrounded by spinning Aurora-Gold & Cyan Gyro-Rings!
 * - TWO CONTINUOUS STACKED HELICAL SPIRAL STAIRCASES (`buildCurvedSpiralStairs`, `innerRadius: 2.3, outerRadius: 4.5`):
 *   1. Lower Helix (`L0 28.0m → L1 31.1m`, West semicircle `angle: +π/2 → +3π/2`)
 *   2. Upper Helix (`L1 31.1m → L2 34.2m`, East semicircle `angle: -π/2 → +π/2`)
 *   Walk in a single sweeping 360° spiral ascent straight up all 3 stories!
 * - ALSO features Express `L0 → L2` Super Cryo-Lift Jump Pad #1 (`f3_pad_crypt_super_l0_l2`, `launchVy: 14.8`)
 *   catapulting operatives from `28.0m` directly onto the `34.2m` South L2 Crypt Crown Deck!
 */
export function buildFloor3Zone5FarNorthWestCrypt(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const ySub = F3_SUB_Y; // 26.2m
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  const cx = -43.0;
  const cz = -19.0;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F3_CELL_Z5_GLACIAL_CRYPT';
  collector.group.add(cellGroup);

  // 1. Sunken Crystal Crypt Well (`26.2m`, bottom `25.72m > 25.40m` Floor 02 maxY!)
  //    Full `9.6m × 9.6m` opening (`x ∈ [-47.8, -38.2], z ∈ [-23.8, -14.2]`) strictly larger than `outerRadius = 4.5m`
  //    so ZERO floor slab ever overlaps a single spiral stair tread!
  addWalkableDeck(collector, {
    minX: -47.8,
    maxX: -38.2,
    minZ: -23.8,
    maxZ: -14.2,
    y: ySub,
    thickness: 0.48,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z5_CryptWellFloor',
  });
  // L0 North Slab (`z ∈ [-34.0, -23.8]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_OUTER,
    maxX: F3_GRID.X_WEST_MID,
    minZ: F3_GRID.Z_NORTH_OUTER,
    maxZ: -23.8,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z5_L0_North',
  });
  // L0 South Slab (`z ∈ [-14.2, -4.0]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_OUTER,
    maxX: F3_GRID.X_WEST_MID,
    minZ: -14.2,
    maxZ: F3_GRID.Z_THRESHOLD,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z5_L0_South',
  });
  // L0 West Slab (`x ∈ [-54.0, -47.8], z ∈ [-23.8, -14.2]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_OUTER,
    maxX: -47.8,
    minZ: -23.8,
    maxZ: -14.2,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z5_L0_West',
  });
  // L0 East Slab (`x ∈ [-38.2, -32.0], z ∈ [-23.8, -14.2]`) -> hosts Jammed Shutter #1 & Super Jump Pad!
  addWalkableDeck(collector, {
    minX: -38.2,
    maxX: F3_GRID.X_WEST_MID,
    minZ: -23.8,
    maxZ: -14.2,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z5_L0_East',
  });
  // L0 South-East Spiral Entry Landing (`x ∈ [-43.0, -38.2], z ∈ [-16.7, -14.2]`) — feeds Lower Helix (`angle = +π/2`) tangentially with +5.4m clearance under Upper Helix!
  addWalkableDeck(collector, {
    minX: -43.0,
    maxX: -38.2,
    minZ: -16.7,
    maxZ: -14.2,
    y: y0,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z5_L0_SpiralEntryLanding',
  });

  // Solid basalt well liner walls (`26.2m → 28.0m`) around the sunken well
  const wellLiners: BoxSpec[] = [
    { w: 10.08, h: 1.24, d: 0.24, x: cx, y: ySub + 0.62, z: -23.92 },
    { w: 10.08, h: 1.24, d: 0.24, x: cx, y: ySub + 0.62, z: -14.08 },
    { w: 0.24, h: 1.24, d: 9.6, x: -47.92, y: ySub + 0.62, z: cz },
    { w: 0.24, h: 1.24, d: 9.6, x: -38.08, y: ySub + 0.62, z: cz },
  ];
  const linerMesh = buildBatchedBoxesMesh(wellLiners, mats.basaltStone, {
    receiveShadow: true,
    name: 'F3_Z5_WellLiners',
  });
  if (linerMesh) {
    cellGroup.add(linerMesh);
    collector.wallMeshes.push(linerMesh);
  }
  // Watertight pit-wall colliders (`26.2m → 28.0m`) enclosing the sunken Crypt Well (open at NE escape stair `x ∈ [-39.6, -38.2]`)
  collector.boxes.push(
    { minX: -48.1, maxX: -39.6, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: -24.12, maxZ: -23.8, walkableTop: false, tag: 'pit_wall' },
    { minX: -48.1, maxX: -37.9, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: -14.2, maxZ: -13.88, walkableTop: false, tag: 'pit_wall' },
    { minX: -48.12, maxX: -47.8, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: -23.8, maxZ: -14.2, walkableTop: false, tag: 'pit_wall' },
    { minX: -38.2, maxX: -37.88, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: -23.8, maxZ: -14.2, walkableTop: false, tag: 'pit_wall' }
  );

  // Compact NE basalt escape stair climbing cleanly out of the `26.2m` Crypt Well onto L0 North (`28.0m`)
  buildStraightStairFlight(collector, mats, {
    x: -38.9,
    z: -22.3,
    width: 1.4,
    length: 3.0,
    yStart: y0, // z = -23.8 -> 28.0m (L0 North Slab)
    yEnd: ySub, // z = -20.8 -> 26.2m (Crypt Well Floor)
    axis: 'z',
    steps: 9,
    railMinSide: true,
    railMaxSide: false,
    accentMat,
    targetGroup: cellGroup,
  });

  // L0 Well Guardrails (OPEN at NE Escape Stair `x ∈ [-39.6, -38.2]` AND SE Spiral Entry Landing `x ∈ [-43.0, -38.2]`!)
  buildGuardrailRun(collector, mats, { x1: -47.8, z1: -23.8, x2: -39.6, z2: -23.8, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -47.8, z1: -14.2, x2: -43.0, z2: -14.2, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -43.0, z1: -16.7, x2: -38.2, z2: -16.7, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -47.8, z1: -23.8, x2: -47.8, z2: -14.2, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -38.2, z1: -23.8, x2: -38.2, z2: -16.7, y: y0, accentMat, targetGroup: cellGroup });

  // 2. Single-Owner Exterior Walls: North (`z = -34.0`) & West (`x = -54.0`)
  //    (East wall `x = -32.0` owned by Zone 4; South wall `z = -4.0` owned by Zone 3!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_NORTH_OUTER,
    spanStart: F3_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F3_GRID.X_WEST_MID - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z5_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_WEST_OUTER,
    spanStart: F3_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F3_GRID.Z_THRESHOLD - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z5_WestOuterWall',
  });

  // 3. LEVEL 1 (`31.1m`) CRYPT TERRACES (North L1 Terrace + West L1 Perimeter Gallery + Curved Spiral Junction!)
  //    North L1 Crypt Terrace (`x ∈ [-48.2, -32.31], z ∈ [-33.69, -23.8]`) — connects Zone 4 L1 portal (`z ∈ [-29.0, -25.4]`)
  //    AND meets the curved L1 Spiral Junction Ring at `z = -23.8` with ZERO tread overlap!
  addWalkableDeck(collector, {
    minX: -48.2,
    maxX: -32.31,
    minZ: -33.69,
    maxZ: -23.8,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z5_L1_NorthTerrace',
  });
  //    West L1 Perimeter Gallery (`x ∈ [-53.69, -48.2], z ∈ [-33.69, -4.31]`) — connects Zone 3 L1 (`x ∈ [-51.5, -48.0]`)!
  addWalkableDeck(collector, {
    minX: -53.69,
    maxX: -48.2,
    minZ: -33.69,
    maxZ: -4.31,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z5_L1_WestGallery',
  });
  //    Curved L1 North Spiral Junction Landing (`a ∈ [3π/2 - 0.28, 3π/2 + 0.28]`) + flat tongue to North Terrace (`z ∈ [-23.8, -23.38]`)!
  buildRingWalkwayDeck(collector, mats, {
    centerX: cx,
    centerZ: cz,
    y: y1,
    innerRadius: 2.3,
    outerRadius: 4.5,
    thickness: 0.34,
    segments: 10,
    startAngle: Math.PI * 1.5 - 0.28,
    endAngle: Math.PI * 1.5 + 0.28,
    material: mats.basaltStone,
    accentMat,
    innerGuardrail: true,
    outerGuardrail: false,
    targetGroup: cellGroup,
  });
  addWalkableDeck(collector, {
    minX: -44.2,
    maxX: -41.8,
    minZ: -23.8,
    maxZ: -23.38,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z5_L1_SpiralBridgeStub',
  });

  // L1 Guardrails (OPEN cleanly at Spiral Junction Bridge `x ∈ [-44.2, -41.8]` on `z = -23.8`!)
  buildGuardrailRun(collector, mats, { x1: -48.2, z1: -23.8, x2: -44.2, z2: -23.8, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -41.8, z1: -23.8, x2: -32.35, z2: -23.8, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -48.2, z1: -23.8, x2: -48.2, z2: -4.35, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`34.2m`) SOUTH CRYPT CROWN DECK (`x ∈ [-53.69, -32.31], z ∈ [-14.2, -4.31]`) + SW Spiral Exit Landing!
  //    Receives BOTH Upper Helix (`angle = +π/2`) AND Express `L0 → L2` Super Jump Pad (`(-35.2, -11.6)`)!
  //    Connects Zone 3 L2 (`x ∈ [-45.0, -41.0]`) AND Zone 4 L2 (`z ∈ [-12.0, -8.2]`)!
  addWalkableDeck(collector, {
    minX: -53.69,
    maxX: -32.31,
    minZ: -14.2,
    maxZ: -4.31,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z5_L2_SouthCrownDeck',
  });
  //    L2 South-West Spiral Exit Landing (`x ∈ [-47.8, -43.0], z ∈ [-16.7, -14.2]`) — receives Upper Helix (`angle = +π/2`) cleanly above Lower Helix!
  addWalkableDeck(collector, {
    minX: -47.8,
    maxX: -43.0,
    minZ: -16.7,
    maxZ: -14.2,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z5_L2_SpiralExitLanding',
  });

  // L2 Guardrails (OPEN at SW Spiral Exit Landing `x ∈ [-47.8, -43.0]` AND Super Jump Pad landing slot `x ∈ [-37.0, -33.4]`!)
  buildGuardrailRun(collector, mats, { x1: -53.65, z1: -14.2, x2: -47.8, z2: -14.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -47.8, z1: -16.7, x2: -47.8, z2: -14.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -47.8, z1: -16.7, x2: -43.0, z2: -16.7, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -43.0, z1: -14.2, x2: -37.0, z2: -14.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -33.4, z1: -14.2, x2: -32.35, z2: -14.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  // 5. MONUMENTAL DOUBLE-TIER HELICAL SPIRAL STAIRCASES AROUND THE CRYO-CORE SPIRE (`28.0 → 31.1 → 34.2m`)!
  //    Lower Helix (`L0 → L1`, West arc `angle: +π/2 → +3π/2 - 0.28`, `innerRadius: 2.3, outerRadius: 4.5`)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: cx,
    centerZ: cz,
    innerRadius: 2.3,
    outerRadius: 4.5,
    startAngle: Math.PI * 0.5,
    endAngle: Math.PI * 1.5 - 0.28,
    yStart: y0,
    yEnd: y1,
    steps: 18,
    accentMat,
    innerGuardrail: true,
    outerGuardrail: true,
    targetGroup: cellGroup,
  });

  //    Upper Helix (`L1 → L2`, East arc `angle: -π/2 + 0.28 → +π/2`, `innerRadius: 2.3, outerRadius: 4.5`)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: cx,
    centerZ: cz,
    innerRadius: 2.3,
    outerRadius: 4.5,
    startAngle: -Math.PI * 0.5 + 0.28,
    endAngle: Math.PI * 0.5,
    yStart: y1,
    yEnd: y2,
    steps: 18,
    accentMat: goldMat,
    innerGuardrail: true,
    outerGuardrail: true,
    targetGroup: cellGroup,
  });

  // 6. EXPRESS `L0 → L2` SUPER CRYO-LIFT JUMP PAD #1 (`28.0m → 34.2m` soaring cleanly OVER the z = -14.2 lip!)
  buildJumpPad(collector, mats, {
    id: F3_IDS.padCryptSuperL0ToL2,
    x: -35.2,
    y: y0,
    z: -18.0,
    launchVy: 15.0,
    launchVx: 0,
    launchVz: 3.6, // Arcs cleanly over z = -14.2 lip & lands dead-center on South L2 Crown Deck (`z ≈ -12.6`)!
    targetGroup: cellGroup,
  });

  // 7. HERO FROSTED CRYO-CORE PILLAR + COUNTER-ROTATING AURORA GYRO RINGS!
  const cryoCoreH = y0 + ceilH - ySub - 0.12;
  const cryoCore = new THREE.Mesh(
    new THREE.CylinderGeometry(1.58, 1.72, cryoCoreH, 16),
    mats.cryoFrost
  );
  cryoCore.position.set(cx, ySub + cryoCoreH * 0.5, cz);
  cryoCore.name = 'F3_Z5_CryoCorePillar';
  cellGroup.add(cryoCore);
  collector.boxes.push({
    minX: cx - 1.78,
    maxX: cx + 1.78,
    minY: ySub,
    maxY: y0 + ceilH,
    minZ: cz - 1.78,
    maxZ: cz + 1.78,
    walkableTop: false,
  });

  // Inner luminous plasma conduit rod inside the translucent frost pillar
  const innerRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, cryoCoreH - 0.4, 12),
    accentMat
  );
  innerRod.position.set(cx, ySub + cryoCoreH * 0.5, cz);
  cellGroup.add(innerRod);

  // Twin counter-rotating Aurora-Gold & Cyan Gyro Halos orbiting the Cryo-Core Pillar!
  for (const [idx, ry, speed, mat] of [
    [0, y1 + 1.4, 0.65, goldMat],
    [1, y2 + 1.8, -0.85, accentMat],
  ] as const) {
    const haloGroup = new THREE.Group();
    haloGroup.name = `F3_Z5_SpireHalo_${idx}`;
    haloGroup.position.set(cx, ry, cz);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.08, 10, 32), mat);
    torus.rotation.x = Math.PI * 0.5 + (idx === 0 ? 0.14 : -0.16);
    haloGroup.add(torus);
    cellGroup.add(haloGroup);
    collector.animatedSpinners?.push({ obj: haloGroup, speed });
  }

  // Grounded structural temple columns, ceiling lights & Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const lz of [-28.5, -19.0, -9.5]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.44, x: cx, y: y0 + ceilH - 0.06, z: lz });
  }
  const colH = y2 - 0.34 - (y0 + 0.006);
  for (const colX of [-49.8, -37.6]) {
    basaltSpecs.push({ w: 0.68, h: colH, d: 0.68, x: colX, y: y0 + 0.006 + colH * 0.5, z: -13.4 });
    goldSpecs.push({ w: 0.84, h: 0.14, d: 0.84, x: colX, y: y2 - 0.42, z: -13.4 });
    collector.boxes.push({
      minX: colX - 0.38,
      maxX: colX + 0.38,
      minY: y0,
      maxY: y2,
      minZ: -13.78,
      maxZ: -13.02,
      walkableTop: false,
    });
  }

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 22.3, h: F3_ROOF_THICK, d: 30.3, x: cx - 0.15, y: F3_ROOF_CENTER_Y, z: cz - 0.15 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z5_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const colMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z5_Columns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z5_GoldTrim' });
  if (goldMesh) cellGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z5_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z5_l0', x: -35.8, y: y0, z: -26.5, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z5_l2', x: -49.5, y: y2, z: -9.5, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '03-CR',
    title: 'GLACIAL CRYPT',
    subtitle: 'DOUBLE-HELIX SPIRAL SPIRE · L0→L2 SUPER-LIFT',
    accentHex: 0x67e8f9,
    x: cx,
    y: y2 + 2.4,
    z: F3_GRID.Z_NORTH_OUTER + 0.36,
    rotY: 0,
    width: 6.8,
    height: 1.4,
  });

  return {
    id: 'f3_zone5_nw_glacial_crypt',
    group: cellGroup,
    triggerBounds: { minX: -54.0, maxX: -28.0, minZ: -34.0, maxZ: -1.0 },
    center: { x: cx, z: cz },
    maxViewDistance: 68.0,
  };
}
