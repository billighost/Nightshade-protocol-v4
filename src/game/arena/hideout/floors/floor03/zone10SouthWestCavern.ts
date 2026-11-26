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
  buildLockedSecurityGate,
  buildShootableLock,
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
 * FLOOR 03 — ZONE 10 (SW OCCLUSION CELL): SUNKEN CRYSTAL CAVERN & SEALED FROZEN ARMORY VAULT
 * Footprint: x ∈ [-54.0, -12.0], z ∈ [+9.0, +34.0] (`42m × 25m`)
 *
 * - Deep `26.2m` Sunken Crystal Cavern Basin (`x ∈ [-41.0, -24.0], z ∈ [+15.5, +26.5]`, bottom `25.72m > 25.40m`)
 *   studded with towering glowing frost crystal stalagmites + Cavern Updraft Jump Pad (`26.2m → 28.0m`)!
 * - Brightly Lit Panoramic Shoot-Through **Frozen Armory Vault** (`x ∈ [-53.69, -45.5], z ∈ [+24.0, +33.69]`):
 *   Snipe the glowing crimson Relay (`f3_lock_crystal_vault`) through the wide frost-glass viewing window
 *   to unseal the vault gate (`f3_gate_crystal_vault`) and claim 2 `.50 HV` Heavy Ammo Crates!
 * - Two-Stage Cavern Ascent (`L0 → L1` East Stair + `L1 → L2` North-West Stair) linking Zone 3 & Zone 12 on L0, L1, L2!
 */
export function buildFloor3Zone10SouthWestCavern(
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

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F3_CELL_Z10_SW_CAVERN';
  collector.group.add(cellGroup);

  // 1. Sunken Crystal Cavern Basin (`26.2m`, `x ∈ [-41.0, -24.0], z ∈ [+15.5, +26.5]`) + 4 Non-Overlapping L0 Rim Slabs
  addWalkableDeck(collector, {
    minX: -41.0,
    maxX: -24.0,
    minZ: 15.5,
    maxZ: 26.5,
    y: ySub,
    thickness: 0.48,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z10_SubCavernFloor',
  });
  // L0 North Rim (`z ∈ [+9.0, +15.5]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_OUTER,
    maxX: F3_GRID.X_CORE_WEST,
    minZ: F3_GRID.Z_CLOISTER_SOUTH,
    maxZ: 15.5,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z10_L0_NorthRim',
  });
  // L0 South Rim (`z ∈ [+26.5, +34.0]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_OUTER,
    maxX: F3_GRID.X_CORE_WEST,
    minZ: 26.5,
    maxZ: F3_GRID.Z_SOUTH_OUTER,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z10_L0_SouthRim',
  });
  // L0 West Rim (`x ∈ [-54.0, -41.0], z ∈ [+15.5, +26.5]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_OUTER,
    maxX: -41.0,
    minZ: 15.5,
    maxZ: 26.5,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z10_L0_WestRim',
  });
  // L0 East Rim (`x ∈ [-24.0, -12.0], z ∈ [+15.5, +26.5]`) -> receives Cavern Updraft Jump Pad!
  addWalkableDeck(collector, {
    minX: -24.0,
    maxX: F3_GRID.X_CORE_WEST,
    minZ: 15.5,
    maxZ: 26.5,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z10_L0_EastRim',
  });

  // Solid basalt basin liners (`26.2m → 28.0m`)
  const basinLiners: BoxSpec[] = [
    { w: 17.48, h: 1.24, d: 0.24, x: -32.5, y: ySub + 0.62, z: 15.38 },
    { w: 17.48, h: 1.24, d: 0.24, x: -32.5, y: ySub + 0.62, z: 26.62 },
    { w: 0.24, h: 1.24, d: 11.0, x: -41.12, y: ySub + 0.62, z: 21.0 },
    { w: 0.24, h: 1.24, d: 11.0, x: -23.88, y: ySub + 0.62, z: 21.0 },
  ];
  const linerMesh = buildBatchedBoxesMesh(basinLiners, mats.basaltStone, {
    receiveShadow: true,
    name: 'F3_Z10_BasinLiners',
  });
  if (linerMesh) {
    cellGroup.add(linerMesh);
    collector.wallMeshes.push(linerMesh);
  }
  // Watertight pit-wall colliders (`26.2m → 28.0m`) enclosing the sunken Crystal Cavern Basin,
  // split cleanly around the West Cavern Stair mouth (`z ∈ [16.9, 19.1]` on `x = -41.0`)!
  collector.boxes.push(
    { minX: -41.3, maxX: -23.7, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 15.18, maxZ: 15.5, walkableTop: false, tag: 'pit_wall' },
    { minX: -41.3, maxX: -23.7, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 26.5, maxZ: 26.82, walkableTop: false, tag: 'pit_wall' },
    { minX: -41.32, maxX: -41.0, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 15.5, maxZ: 16.9, walkableTop: false, tag: 'pit_wall' },
    { minX: -41.32, maxX: -41.0, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 19.1, maxZ: 26.5, walkableTop: false, tag: 'pit_wall' },
    { minX: -24.0, maxX: -23.68, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 15.5, maxZ: 26.5, walkableTop: false, tag: 'pit_wall' }
  );

  // Cavern Stair descending from West L0 Rim into `26.2m` Sunken Basin (`x: -41.0 → -37.2, z = 18.0, width: 2.2`)
  buildStraightStairFlight(collector, mats, {
    x: -39.1,
    z: 18.0,
    width: 2.2,
    length: 3.8,
    yStart: y0, // x = -41.0 -> 28.0m
    yEnd: ySub, // x = -37.2 -> 26.2m
    axis: 'x',
    railMinSide: true,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });

  // Cavern Updraft Jump Pad (`26.2m → 28.0m`, launches East onto East L0 Rim `x = -23.6`!)
  buildJumpPad(collector, mats, {
    id: F3_IDS.padCavernSubToL0,
    x: -26.8,
    y: ySub,
    z: 21.0,
    launchVy: 9.8,
    launchVx: 3.2,
    launchVz: 0,
    targetGroup: cellGroup,
  });

  // L0 Basin Guardrails (OPEN at West Cavern Stair mouth `z ∈ [16.9, 19.1]` & East Updraft Landing `z ∈ [19.4, 22.6]`!)
  buildGuardrailRun(collector, mats, { x1: -41.0, z1: 15.5, x2: -24.0, z2: 15.5, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -41.0, z1: 26.5, x2: -24.0, z2: 26.5, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -41.0, z1: 15.5, x2: -41.0, z2: 16.9, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -41.0, z1: 19.1, x2: -41.0, z2: 26.5, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -24.0, z1: 15.5, x2: -24.0, z2: 19.4, y: y0, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -24.0, z1: 22.6, x2: -24.0, z2: 26.5, y: y0, accentMat, targetGroup: cellGroup });

  // 2. Single-Owner Exterior Walls: South (`z = +34.0`), West (`x = -54.0`), East Descent-Shaft Wall (`x = -12.0, z ∈ [+17, +34]`)
  //    (North `z = +9.0` owned by Zone 3; East `z ∈ [+9, +17]` owned by Zone 12!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_SOUTH_OUTER,
    spanStart: F3_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F3_GRID.X_CORE_WEST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z10_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_WEST_OUTER,
    spanStart: F3_GRID.Z_CLOISTER_SOUTH + 0.3,
    spanEnd: F3_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z10_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_CORE_WEST,
    spanStart: F3_GRID.Z_EXIT + 0.3,
    spanEnd: F3_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z10_EastShaftWall',
  });

  // 3. BRIGHTLY LIT PANORAMIC SHOOT-THROUGH FROZEN ARMORY VAULT (`x ∈ [-53.69, -45.5], z ∈ [+24.0, +33.69]`)
  //    North Vault Wall (`z = +24.0`): Wide panoramic glass viewing window (`x ∈ [-52.0, -47.0]`) to snipe Relay inside!
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 24.0,
    spanStart: -53.69,
    spanEnd: -45.2,
    baseY: y0,
    height: 2.76,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    targetGroup: cellGroup,
    portals: [
      { start: -52.0, end: -47.0, bottomY: y0 + 0.9, topY: y0 + 2.6, kind: 'window', framed: true },
    ],
    name: 'F3_Z10_VaultNorthWindowWall',
  });
  //    East Vault Wall (`x = -45.5`): Locked Security Gate (`z ∈ [+27.0, +31.0]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -45.5,
    spanStart: 24.3,
    spanEnd: 33.69,
    baseY: y0,
    height: 2.76,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    targetGroup: cellGroup,
    portals: [
      { start: 27.0, end: 31.0, bottomY: y0, topY: y0 + 2.65, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F3_Z10_VaultEastGateWall',
  });
  //    Vault Roof (`y = 31.1m`, doubles as SW L1 Overlook Platform!)
  addWalkableDeck(collector, {
    minX: -53.69,
    maxX: -45.2,
    minZ: 24.0,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z10_VaultRoofL1',
  });
  //    Bright interior vault ceiling luminaire + Locked Gate + Shootable Relay visible through panoramic glass!
  const vaultLamp = buildBatchedBoxesMesh(
    [{ w: 5.2, h: 0.1, d: 4.8, x: -49.5, y: y1 - 0.4, z: 28.8 }],
    mats.ceilingLight,
    { name: 'F3_Z10_VaultLamp' }
  );
  if (vaultLamp) cellGroup.add(vaultLamp);

  buildLockedSecurityGate(collector, mats, {
    id: F3_IDS.gateCrystalVault,
    label: 'FROZEN ARMORY VAULT',
    x: -45.5,
    y: y0,
    z: 29.0,
    width: 4.0,
    height: 2.65,
    spanAxis: 'z',
    lockedHint: 'FROZEN VAULT SEALED · SHOOT RELAY THROUGH NORTH PANORAMIC WINDOW',
    targetGroup: cellGroup,
  });

  buildShootableLock(collector, mats, {
    id: F3_IDS.lockCrystalVault,
    bannerText: 'VAULT CIRCUIT SHATTERED · FROZEN ARMORY UNSEALED!',
    x: -49.5,
    y: y0 + 1.85,
    z: 28.4,
    rotY: Math.PI, // Faces North straight through the panoramic window at z = 24.0!
    unlockGateId: F3_IDS.gateCrystalVault,
    targetGroup: cellGroup,
  });

  // 4. LEVEL 1 (`31.1m`) & LEVEL 2 (`34.2m`) CAVERN GALLERIES + TWO-STAGE ASCENT!
  //    North L1 Cavern Gallery (`x ∈ [-37.0, -12.31], z ∈ [+9.31, +15.2]`) -> links Zone 3 L1 (`x ∈ [-36.0, -32.4]`) & Zone 12 L1 (`z ∈ [11, 15]`)!
  addWalkableDeck(collector, {
    minX: -37.0,
    maxX: -12.31,
    minZ: 9.31,
    maxZ: 15.2,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z10_L1_NorthGallery',
  });
  //    East L1 Rim Walk (`x ∈ [-16.2, -12.31], z ∈ [+15.2, +22.5]`) -> receives Flush East `L0 → L1` Stair (`z = +22.5`)!
  addWalkableDeck(collector, {
    minX: -16.2,
    maxX: -12.31,
    minZ: 15.2,
    maxZ: 22.5,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z10_L1_EastWalk',
  });
  //    L1 Guardrails (including West edge at `x = -37.0, z ∈ [11.3, 15.2]` beside stair mouth)
  buildGuardrailRun(collector, mats, { x1: -37.0, z1: 11.3, x2: -37.0, z2: 15.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -37.0, z1: 15.2, x2: -16.2, z2: 15.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -16.2, z1: 15.2, x2: -16.2, z2: 22.5, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -16.2, z1: 22.5, x2: -14.3, z2: 22.5, y: y1, accentMat, targetGroup: cellGroup });

  //    Level 2 (`34.2m`) High Cavern Sky-Gallery (`x ∈ [-53.69, -12.31], z ∈ [+9.31, +15.2]` minus `L1→L2` stair slot `x ∈ [-42.8, -37.0], z ∈ [+9.31, +11.4]`!)
  //    Connects Zone 3 L2 (`x ∈ [-53.2, -49.8]`) straight across to Zone 12 L2 (`z ∈ [+11.0, +15.0]`)!
  addWalkableDeck(collector, {
    minX: -53.69,
    maxX: -42.8,
    minZ: 9.31,
    maxZ: 15.2,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z10_L2_WestDeck',
  });
  addWalkableDeck(collector, {
    minX: -42.8,
    maxX: -12.31,
    minZ: 11.4,
    maxZ: 15.2,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z10_L2_SouthSpan',
  });
  buildGuardrailRun(collector, mats, { x1: -53.65, z1: 15.2, x2: -12.35, z2: 15.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.8, z1: 11.4, x2: -12.35, z2: 11.4, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  //    Flush East `L0 → L1` Stair (`x = -13.3, z: +28.3 → +22.5`, flush against `x = -12.3`!)
  buildStraightStairFlight(collector, mats, {
    x: -13.3,
    z: 25.4,
    width: 2.0,
    length: 5.8,
    yStart: y1, // z = +22.5 -> 31.1m (East L1 Walk!)
    yEnd: y0, // z = +28.3 -> 28.0m (South-East L0 Floor!)
    axis: 'z',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  //    Flush North `L1 → L2` Stair (`z = +10.3, x: -37.0 → -42.8`, flush against `z = +9.3`!)
  buildStraightStairFlight(collector, mats, {
    x: -39.9,
    z: 10.3,
    width: 2.0,
    length: 5.8,
    yStart: y2, // x = -42.8 -> 34.2m (West L2 Deck!)
    yEnd: y1, // x = -37.0 -> 31.1m (North L1 Gallery!)
    axis: 'x',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  // 5. Towering Glacial Crystal Stalagmite Monoliths in the Sunken Cavern + Roof Slab (`top = 38.80m`)
  const crystalPositions = [
    [-34.5, 22.8, 0.9, 4.6],
    [-31.2, 18.2, 0.75, 3.8],
    [-29.0, 24.4, 0.85, 4.2],
    [-37.8, 24.2, 0.7, 3.4],
  ] as const;
  for (const [kx, kz, kr, kh] of crystalPositions) {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(kr, kh, 6), mats.cryoFrost);
    spire.position.set(kx, ySub + kh * 0.5, kz);
    cellGroup.add(spire);
    collector.boxes.push({
      minX: kx - kr * 0.72,
      maxX: kx + kr * 0.72,
      minY: ySub,
      maxY: ySub + kh * 0.8,
      minZ: kz - kr * 0.72,
      maxZ: kz + kr * 0.72,
      walkableTop: false,
    });
  }

  const lightSpecs: BoxSpec[] = [];
  for (const lx of [-46.0, -33.0, -20.0]) {
    lightSpecs.push({ w: 9.0, h: 0.1, d: 0.44, x: lx, y: y0 + ceilH - 0.06, z: 21.0 });
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z10_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 42.3, h: F3_ROOF_THICK, d: 25.3, x: -33.15, y: F3_ROOF_CENTER_Y, z: 21.65 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z10_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -33.0, y: y0, z: 30.2, w: 2.6, h: 1.0, d: 0.88, walkableTop: true },
      { x: -20.0, y: y0, z: 29.8, w: 2.4, h: 1.0, d: 0.88, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F3_Z10_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z10_sub', x: -32.6, y: ySub, z: 21.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z10_rim', x: -39.2, y: y0, z: 30.0, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '03-CV',
    title: 'CRYSTAL CAVERN',
    subtitle: 'FROZEN ARMORY VAULT · SNIPE RELAY THROUGH GLASS',
    accentHex: 0x67e8f9,
    x: -33.0,
    y: y2 + 2.4,
    z: F3_GRID.Z_SOUTH_OUTER - 0.36,
    rotY: Math.PI,
    width: 6.8,
    height: 1.4,
  });

  return {
    id: 'f3_zone10_sw_crystal_cavern',
    group: cellGroup,
    triggerBounds: { minX: -54.0, maxX: -8.0, minZ: 5.0, maxZ: 34.0 },
    center: { x: -33.0, z: 21.5 },
    maxViewDistance: 68.0,
  };
}
