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
} from './layout';

/**
 * FLOOR 03 — ZONE 8 (FAR NE OCCLUSION CELL): THE AURORA RESONANCE SPIRE
 * Footprint: x ∈ [+32.0, +54.0], z ∈ [-34.0, -4.0] (`22m × 30m`)
 *
 * - Towering crystalline **Aurora Resonance Obelisk** surrounded by 3 counter-rotating
 *   Aurora-Gold & Cyan Resonance Gyro-Halos spanning all 3 vertical stories!
 * - Two-Stage Stepped Ascent (`L0 → L1` North Stair + `L1 → L2` East Stair) wrapping the spire!
 * - ALSO features Express `L0 → L2` Super Cryo-Lift Jump Pad #2 (`f3_pad_spire_super_l0_l2`, `launchVy: 14.8`)
 *   launching straight from `28.0m` onto the `34.2m` South L2 Spire Crown Balcony!
 */
export function buildFloor3Zone8FarNorthEastSpire(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  const cx = 43.0;
  const cz = -19.0;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F3_CELL_Z8_AURORA_SPIRE';
  collector.group.add(cellGroup);

  // 1. L0 Full Spire Sanctuary Floor (`x ∈ [+32, +54], z ∈ [-34, -4]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_EAST_MID,
    maxX: F3_GRID.X_EAST_OUTER,
    minZ: F3_GRID.Z_NORTH_OUTER,
    maxZ: F3_GRID.Z_THRESHOLD,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z8_L0_Floor',
  });

  // 2. Single-Owner Exterior Walls: North (`z = -34.0`) & East (`x = +54.0`)
  //    (West `x = +32.0` owned by Zone 7; South `z = -4.0` owned by Zone 9!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_NORTH_OUTER,
    spanStart: F3_GRID.X_EAST_MID + 0.3,
    spanEnd: F3_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z8_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_EAST_OUTER,
    spanStart: F3_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F3_GRID.Z_THRESHOLD - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z8_EastOuterWall',
  });

  // 3. LEVEL 1 (`31.1m`) WRAP-AROUND SPIRE GALLERIES (North Terrace + East Perimeter Walk!)
  //    North L1 Spire Terrace (`x ∈ [+32.31, +48.0], z ∈ [-33.69, -24.4]`) — receives Flush North `L0 → L1` Stair (`x = +43.0`? Let's place North stair `x: +48.0 → +42.2, z = -32.7`, climbing West onto North L1 Terrace `x ∈ [+32.31, +42.2]` + East L1 Walk `x ∈ [+48.0, +53.69]`!)
  //    Wait — even cleaner! Climb North `L0 → L1` along West Wall (`x = +33.3, z: -21.0 → -26.8` -> Wait, `z ∈ [-20, -16]` is Zone 7 L0 portal! So place `L0 → L1` stair along NORTH Wall from `x = +42.2 (28.0m)` → `x = +48.0 (31.1m)`!)
  //    Let's verify:
  //    - North-West L1 Terrace (`x ∈ [+32.31, +48.0], z ∈ [-30.0, -24.6]`) — connects Zone 7 L1 (`z ∈ [-29.0, -25.4]`)!
  //    - East L1 Spire Gallery (`x ∈ [+48.0, +53.69], z ∈ [-33.69, -4.31]`) — receives `L0 → L1` North Stair (`x = +48.0, z ∈ [-33.7, -31.7]`), connects Zone 9 L1 (`x ∈ [+48.0, +51.5]`), AND feeds East `L1 → L2` Stair (`z = -21.4 → -15.6`)!
  addWalkableDeck(collector, {
    minX: 32.31,
    maxX: 48.0,
    minZ: -30.0,
    maxZ: -24.6,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z8_L1_NorthWestTerrace',
  });
  addWalkableDeck(collector, {
    minX: 48.0,
    maxX: 53.69,
    minZ: -33.69,
    maxZ: -4.31,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z8_L1_EastGallery',
  });

  // L1 Guardrails
  buildGuardrailRun(collector, mats, { x1: 32.35, z1: -30.0, x2: 48.0, z2: -30.0, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 32.35, z1: -24.6, x2: 48.0, z2: -24.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 48.0, z1: -24.6, x2: 48.0, z2: -4.35, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`34.2m`) SOUTH SPIRE CROWN BALCONY (`x ∈ [+32.31, +53.69], z ∈ [-15.6, -4.31]`)
  //    Receives BOTH Flush East `L1 → L2` Stair (`z = -15.6`) AND Express `L0 → L2` Super Jump Pad (`(+36.5, -13.19)`)!
  //    Connects Zone 7 L2 (`z ∈ [-12.0, -8.2]`) AND Zone 9 L2 (`x ∈ [+41.0, +45.0]`)!
  addWalkableDeck(collector, {
    minX: 32.31,
    maxX: 53.69,
    minZ: -15.6,
    maxZ: -4.31,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z8_L2_SouthCrownBalcony',
  });

  // L2 Guardrails (OPEN at Super Jump Pad landing slot `x ∈ [+34.7, +38.3]` AND East `L1→L2` stair mouth `x ∈ [+51.6, +53.69]`!)
  buildGuardrailRun(collector, mats, { x1: 32.35, z1: -15.6, x2: 34.7, z2: -15.6, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 38.3, z1: -15.6, x2: 51.6, z2: -15.6, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  // 5. TWO-STAGE FLUSH STAIRS (`L0 → L1` North Wall + `L1 → L2` East Wall) + EXPRESS `L0 → L2` SUPER JUMP PAD #2!
  //    Flush North Wall `L0 → L1` Stair (`z = -32.7, width = 2.0 -> z ∈ [-33.7, -31.7]` flush against `z = -33.7`!)
  buildStraightStairFlight(collector, mats, {
    x: 45.1,
    z: -32.7,
    width: 2.0,
    length: 5.8,
    yStart: y0, // x = +42.2 -> 28.0m
    yEnd: y1, // x = +48.0 -> 31.1m (East L1 Spire Gallery!)
    axis: 'x',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });

  //    Flush East Wall `L1 → L2` Stair (`x = +52.7, width = 2.0 -> x ∈ [+51.7, +53.7]` flush against `x = +53.7`!)
  buildStraightStairFlight(collector, mats, {
    x: 52.7,
    z: -18.5,
    width: 2.0,
    length: 5.8,
    yStart: y1, // z = -21.4 -> 31.1m (East L1 Spire Gallery!)
    yEnd: y2, // z = -15.6 -> 34.2m (South L2 Spire Crown Balcony!)
    axis: 'z',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  //    EXPRESS `L0 → L2` SUPER CRYO-LIFT JUMP PAD #2 (`(+36.5, 28.0, -19.4)` -> arcs cleanly OVER z = -15.6 lip onto L2!)
  buildJumpPad(collector, mats, {
    id: F3_IDS.padSpireSuperL0ToL2,
    x: 36.5,
    y: y0,
    z: -19.4,
    launchVy: 15.0,
    launchVx: 0,
    launchVz: 3.6,
    targetGroup: cellGroup,
  });

  // 6. HERO AURORA RESONANCE OBELISK + 3 COUNTER-ROTATING GYRO-HALOS!
  //    Stepped basalt-and-gold altar base at `(43.0, 28.0, -19.5)`
  const basaltSpecs: BoxSpec[] = [
    { w: 4.2, h: 0.42, d: 4.2, x: cx, y: y0 + 0.214, z: cz - 0.5 },
    { w: 2.8, h: 0.42, d: 2.8, x: cx, y: y0 + 0.634, z: cz - 0.5 },
  ];
  const goldSpecs: BoxSpec[] = [
    { w: 4.38, h: 0.08, d: 4.38, x: cx, y: y0 + 0.44, z: cz - 0.5 },
    { w: 2.98, h: 0.08, d: 2.98, x: cx, y: y0 + 0.86, z: cz - 0.5 },
  ];
  collector.boxes.push({
    minX: cx - 2.15,
    maxX: cx + 2.15,
    minY: y0,
    maxY: y0 + 1.0,
    minZ: cz - 2.65,
    maxZ: cz + 1.65,
    walkableTop: true,
  });

  // Floating Crystalline Obelisk Spire (suspended cleanly above altar base, rising through L1 & L2!)
  const obeliskCore = new THREE.Group();
  obeliskCore.name = 'F3_Z8_AuroraObelisk';
  obeliskCore.position.set(cx, y1 + 1.6, cz - 0.5);
  const shard = new THREE.Mesh(new THREE.OctahedronGeometry(1.45, 0), mats.cryoFrost);
  shard.scale.set(0.85, 2.9, 0.85);
  obeliskCore.add(shard);
  cellGroup.add(obeliskCore);
  collector.animatedSpinners?.push({ obj: obeliskCore, speed: 0.35 });
  collector.boxes.push({
    minX: cx - 0.98,
    maxX: cx + 0.98,
    minY: y0 + 0.95,
    maxY: y2 + 2.6,
    minZ: cz - 0.5 - 0.98,
    maxZ: cz - 0.5 + 0.98,
    walkableTop: false,
    tag: 'aurora_obelisk',
  });

  // 3 Concentric Counter-Rotating Aurora-Gold & Cyan Gyro-Halos orbiting the Obelisk!
  for (const [idx, rad, tiltX, speed, mat] of [
    [0, 2.35, 0.28, 0.72, goldMat],
    [1, 3.05, -0.35, -0.54, accentMat],
    [2, 3.7, 0.16, 0.41, goldMat],
  ] as const) {
    const halo = new THREE.Group();
    halo.name = `F3_Z8_GyroHalo_${idx}`;
    halo.position.set(cx, y1 + 1.6, cz - 0.5);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.085, 10, 36), mat);
    torus.rotation.x = Math.PI * 0.5 + tiltX;
    halo.add(torus);
    cellGroup.add(halo);
    collector.animatedSpinners?.push({ obj: halo, speed });
  }

  // Ceiling lights & Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  const lightSpecs: BoxSpec[] = [];
  for (const lz of [-28.5, -19.0, -9.5]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.44, x: cx, y: y0 + ceilH - 0.06, z: lz });
  }
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 22.3, h: F3_ROOF_THICK, d: 30.3, x: cx + 0.15, y: F3_ROOF_CENTER_Y, z: cz - 0.15 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z8_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const altarMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z8_AltarBase',
  });
  if (altarMesh) {
    cellGroup.add(altarMesh);
    collector.wallMeshes.push(altarMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z8_GoldTrim' });
  if (goldMesh) cellGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z8_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 37.0, y: y0, z: -26.5, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
      { x: 45.0, y: y2, z: -10.5, w: 2.6, h: 0.98, d: 0.88, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: goldMat, name: 'F3_Z8_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z8_l0', x: 47.0, y: y0, z: -12.2, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z8_l2', x: 39.5, y: y2, z: -8.8, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '03-SP',
    title: 'AURORA RESONANCE SPIRE',
    subtitle: 'GYRO-HALO OBELISK · L0→L2 SUPER-LIFT',
    accentHex: 0xe6ad46,
    x: cx,
    y: y2 + 2.4,
    z: F3_GRID.Z_NORTH_OUTER + 0.36,
    rotY: 0,
    width: 6.8,
    height: 1.4,
  });

  return {
    id: 'f3_zone8_ne_aurora_spire',
    group: cellGroup,
    triggerBounds: { minX: 28.0, maxX: 54.0, minZ: -34.0, maxZ: -1.0 },
    center: { x: cx, z: cz },
    maxViewDistance: 68.0,
  };
}
