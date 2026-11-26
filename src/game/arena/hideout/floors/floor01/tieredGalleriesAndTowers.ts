import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addWalkableDeck,
  buildJerseyBarricades,
} from '../../architecture';
import {
  buildCurvedSpiralStairs,
  buildGuardrailRun,
  buildRingWalkwayDeck,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import {
  buildJumpPad,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F1_GRID,
  F1_IDS,
  F1_L0_Y,
  F1_L1_Y,
  F1_L2_Y,
  F1_L3_Y,
} from './layout';

/**
 * FLOOR 01 — FOUR-TIER ARENA GALLERIES, TWIN CURVED SPIRAL ASCENT TOWERS,
 * RETRACTABLE AERIAL SIEGE SKYBRIDGES, APEX VANTAGE CROWNS & 6 GRAVITY-VORTEX JUMP PADS.
 *
 * Every vertical tier is crafted with ZERO deck/wall overlap, flush landings, open landing gates for Jump Pads,
 * solid cover parapets, and seamless circular rotational kiting lanes!
 */
export function buildFloor1TieredGalleriesAndTowers(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const y0 = F1_L0_Y; // -12.0m
  const y1 = F1_L1_Y; //  -6.0m
  const y2 = F1_L2_Y; //   0.0m
  const y3 = F1_L3_Y; //  +5.2m
  const goldMat = mats.sovereignGold;
  const crimsonMat = mats.eclipseCrimson;

  // =========================================================================
  // 1. L1 (-6.0m) 360° MID-RING BASTION GALLERIES (inset cleanly inside ±43.68 / -3.68 / +83.68!)
  // =========================================================================
  // West L1 Bastion (`x ∈ [-43.68, -36.0], z ∈ [-3.68, +83.68]`)
  addWalkableDeck(collector, {
    minX: -43.68,
    maxX: -36.0,
    minZ: -3.68,
    maxZ: 83.68,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L1_WestBastion',
  });
  // East L1 Bastion (`x ∈ [+36.0, +43.68], z ∈ [-3.68, +83.68]`)
  addWalkableDeck(collector, {
    minX: 36.0,
    maxX: 43.68,
    minZ: -3.68,
    maxZ: 83.68,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L1_EastBastion',
  });
  // North-West & North-East L1 Bastions (split around center Overlook drop vista x ∈ [-9.2, +9.2]!)
  addWalkableDeck(collector, {
    minX: -35.98,
    maxX: -9.2,
    minZ: -3.68,
    maxZ: 4.0,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L1_NorthWestBastion',
  });
  addWalkableDeck(collector, {
    minX: 9.2,
    maxX: 35.98,
    minZ: -3.68,
    maxZ: 4.0,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L1_NorthEastBastion',
  });
  // South-West & South-East L1 Bastions (split cleanly around colossal 6.8m × 6.5m Final Core Vault 01!)
  addWalkableDeck(collector, {
    minX: -35.98,
    maxX: -6.0,
    minZ: 76.0,
    maxZ: 83.68,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L1_SouthWestBastion',
  });
  addWalkableDeck(collector, {
    minX: 6.0,
    maxX: 35.98,
    minZ: 76.0,
    maxZ: 83.68,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L1_SouthEastBastion',
  });

  // 4 Flush L0→L1 Stair Landing Spurs (`x ∈ [-35.98, -32.8]` & `[+32.8, +35.98]`, `z ∈ [9.0, 14.0]` & `[66.0, 71.0]`)
  for (const side of [-1, 1] as const) {
    const minX = side < 0 ? -35.98 : 32.8;
    const maxX = side < 0 ? -32.8 : 35.98;
    addWalkableDeck(collector, {
      minX,
      maxX,
      minZ: 9.0,
      maxZ: 14.0,
      y: y1,
      thickness: 0.34,
      material: mats.sacredBoneStone,
      name: `F1_L1_StairSpurN_${side < 0 ? 'W' : 'E'}`,
    });
    addWalkableDeck(collector, {
      minX,
      maxX,
      minZ: 66.0,
      maxZ: 71.0,
      y: y1,
      thickness: 0.34,
      material: mats.sacredBoneStone,
      name: `F1_L1_StairSpurS_${side < 0 ? 'W' : 'E'}`,
    });
    // Seamless slab seam bridges across the 2cm visual gap
    collector.slabs.push(
      { minX: side * 36.2 - 0.3, maxX: side * 35.8 + 0.3, minZ: -3.68, maxZ: 83.68, y: y1 }
    );
  }

  // Open-Sky L1 Launch Piers for the 2 L1→L2 Sovereign Boosters (strictly outside L2 overhang!)
  // South-West L1 Launch Pier (`x ∈ [-24.5, -19.5], z ∈ [71.4, 75.98]`, `y = -6.0m`)
  addWalkableDeck(collector, {
    minX: -24.5,
    maxX: -19.5,
    minZ: 71.4,
    maxZ: 75.98,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_L1_SWLaunchPier',
  });
  collector.slabs.push({ minX: -24.5, maxX: -19.5, minZ: 75.6, maxZ: 76.4, y: y1 });

  // North-East L1 Launch Pier (`x ∈ [+19.5, +24.5], z ∈ [4.02, 8.6]`, `y = -6.0m`)
  addWalkableDeck(collector, {
    minX: 19.5,
    maxX: 24.5,
    minZ: 4.02,
    maxZ: 8.6,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_L1_NELaunchPier',
  });
  collector.slabs.push({ minX: 19.5, maxX: 24.5, minZ: 3.6, maxZ: 4.4, y: y1 });

  // L1 Bastion Guardrails with CLEAN openings at:
  // - Jump Pad landing gates (`z ∈ [4.2, 8.4]` and `[71.6, 75.8]` on West & East L1)
  // - Stair landing spurs (`z ∈ [9.0, 14.0]` and `[66.0, 71.0]`)
  // - Spiral Tower L1 Bridges (`z ∈ [38.0, 42.0]`)
  for (const side of [-1, 1] as const) {
    const gx = side < 0 ? -36.08 : 36.08;
    // Mid-North segment between North stair spur (14.0) and Spiral bridge (38.0)
    buildGuardrailRun(collector, mats, { x1: gx, z1: 14.1, x2: gx, z2: 37.9, y: y1, accentMat: goldMat });
    // Mid-South segment between Spiral bridge (42.0) and South stair spur (66.0)
    buildGuardrailRun(collector, mats, { x1: gx, z1: 42.1, x2: gx, z2: 65.9, y: y1, accentMat: goldMat });
    // Outer edge of the two stair spurs
    const spurOuterX = side < 0 ? -32.88 : 32.88;
    buildGuardrailRun(collector, mats, { x1: spurOuterX, z1: 9.1, x2: spurOuterX, z2: 13.9, y: y1, accentMat: goldMat });
    buildGuardrailRun(collector, mats, { x1: spurOuterX, z1: 66.1, x2: spurOuterX, z2: 70.9, y: y1, accentMat: goldMat });
  }
  // North L1 Bastion inner guardrails (open at NW L1→L2 stair entry and NE Launch Pier!)
  buildGuardrailRun(collector, mats, { x1: -35.9, z1: 3.92, x2: -26.2, z2: 3.92, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -13.8, z1: 3.92, x2: -9.28, z2: 3.92, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -9.28, z1: -3.55, x2: -9.28, z2: 3.86, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 9.28, z1: 3.92, x2: 19.4, z2: 3.92, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 24.6, z1: 3.92, x2: 35.9, z2: 3.92, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 9.28, z1: -3.55, x2: 9.28, z2: 3.86, y: y1, accentMat: goldMat });

  // South L1 Bastion inner guardrails (open at SW Launch Pier and SE L1→L2 stair entry!)
  buildGuardrailRun(collector, mats, { x1: -35.9, z1: 76.08, x2: -24.6, z2: 76.08, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -19.4, z1: 76.08, x2: -6.08, z2: 76.08, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -6.08, z1: 76.16, x2: -6.08, z2: 83.55, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 6.08, z1: 76.08, x2: 13.8, z2: 76.08, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 26.2, z1: 76.08, x2: 35.9, z2: 76.08, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 6.08, z1: 76.16, x2: 6.08, z2: 83.55, y: y1, accentMat: goldMat });

  // =========================================================================
  // 2. FOUR FLUSH L0 (-12.0m) -> L1 (-6.0m) GRAND ARENA STAIRCASES
  // =========================================================================
  // NW Stair (`x = -34.4, z ∈ [14.0, 26.0]`, ascends North `-12.0 -> -6.0`)
  buildStraightStairFlight(collector, mats, {
    x: -34.4,
    z: 20.0,
    width: 3.0,
    length: 12.0,
    yStart: y1,
    yEnd: y0,
    axis: 'z',
    steps: 26,
    railMinSide: false,
    railMaxSide: true,
    accentMat: crimsonMat,
  });
  // SW Stair (`x = -34.4, z ∈ [54.0, 66.0]`, ascends South `-12.0 -> -6.0`)
  buildStraightStairFlight(collector, mats, {
    x: -34.4,
    z: 60.0,
    width: 3.0,
    length: 12.0,
    yStart: y0,
    yEnd: y1,
    axis: 'z',
    steps: 26,
    railMinSide: false,
    railMaxSide: true,
    accentMat: crimsonMat,
  });
  // NE Stair (`x = +34.4, z ∈ [14.0, 26.0]`, ascends North `-12.0 -> -6.0`)
  buildStraightStairFlight(collector, mats, {
    x: 34.4,
    z: 20.0,
    width: 3.0,
    length: 12.0,
    yStart: y1,
    yEnd: y0,
    axis: 'z',
    steps: 26,
    railMinSide: true,
    railMaxSide: false,
    accentMat: crimsonMat,
  });
  // SE Stair (`x = +34.4, z ∈ [54.0, 66.0]`, ascends South `-12.0 -> -6.0`)
  buildStraightStairFlight(collector, mats, {
    x: 34.4,
    z: 60.0,
    width: 3.0,
    length: 12.0,
    yStart: y0,
    yEnd: y1,
    axis: 'z',
    steps: 26,
    railMinSide: true,
    railMaxSide: false,
    accentMat: crimsonMat,
  });

  // =========================================================================
  // 3. L2 (0.0m) HIGH SOVEREIGN CROWN GALLERIES (Full 360° Perimeter Ring!)
  // =========================================================================
  addWalkableDeck(collector, {
    minX: -43.68,
    maxX: -39.2,
    minZ: -3.68,
    maxZ: 83.68,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L2_WestCrown',
  });
  addWalkableDeck(collector, {
    minX: 39.2,
    maxX: 43.68,
    minZ: -3.68,
    maxZ: 83.68,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L2_EastCrown',
  });
  addWalkableDeck(collector, {
    minX: -39.18,
    maxX: -8.82,
    minZ: -3.68,
    maxZ: 1.8,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L2_NorthWestCrown',
  });
  addWalkableDeck(collector, {
    minX: 8.82,
    maxX: 39.18,
    minZ: -3.68,
    maxZ: 1.8,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L2_NorthEastCrown',
  });
  // Continuous Grand South L2 Crown Gallery (`x ∈ [-39.18, +39.18], z ∈ [77.6, 83.68]`) — hosts Control Center!
  addWalkableDeck(collector, {
    minX: -39.18,
    maxX: 39.18,
    minZ: 77.6,
    maxZ: 83.68,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L2_SouthCrown',
  });
  // Seamless walkable links at the 2cm L2 corner seams
  collector.slabs.push(
    { minX: -39.6, maxX: -38.8, minZ: -3.68, maxZ: 83.68, y: y2 },
    { minX: 38.8, maxX: 39.6, minZ: -3.68, maxZ: 83.68, y: y2 }
  );

  // L2 Landing Spurs for NW & SE L1→L2 Grand Stairs (`y = 0.0m`)
  addWalkableDeck(collector, {
    minX: -14.0,
    maxX: -8.82,
    minZ: 1.82,
    maxZ: 4.0,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_L2_NWStairLanding',
  });
  collector.slabs.push({ minX: -14.0, maxX: -8.82, minZ: 1.4, maxZ: 2.2, y: y2 });

  addWalkableDeck(collector, {
    minX: 10.0,
    maxX: 14.0,
    minZ: 75.38,
    maxZ: 77.58,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_L2_SEStairLanding',
  });
  collector.slabs.push({ minX: 10.0, maxX: 14.0, minZ: 77.2, maxZ: 78.0, y: y2 });

  // Two Flush L1 (-6.0m) -> L2 (0.0m) Grand Stairs
  buildStraightStairFlight(collector, mats, {
    x: -20.0,
    z: 2.9,
    width: 2.2,
    length: 12.0,
    yStart: y1,
    yEnd: y2,
    axis: 'x',
    steps: 26,
    railMinSide: false,
    railMaxSide: true,
    accentMat: goldMat,
  });
  buildStraightStairFlight(collector, mats, {
    x: 20.0,
    z: 76.48,
    width: 2.2,
    length: 12.0,
    yStart: y2,
    yEnd: y1,
    axis: 'x',
    steps: 26,
    railMinSide: true,
    railMaxSide: false,
    accentMat: goldMat,
  });

  // L2 Crown Guardrails (cleanly open at Spiral Bridges `z ∈ [38, 42]`, NW/SE L1→L2 landings, & L1→L2 Jump Pad gates!)
  for (const side of [-1, 1] as const) {
    const gx = side < 0 ? -39.28 : 39.28;
    buildGuardrailRun(collector, mats, { x1: gx, z1: 1.88, x2: gx, z2: 37.9, y: y2, accentMat: goldMat });
    buildGuardrailRun(collector, mats, { x1: gx, z1: 42.1, x2: gx, z2: 77.52, y: y2, accentMat: goldMat });
  }
  // North L2 guardrails (open at NE Jump Pad gate `x ∈ [19.5, 24.5]` and NW stair landing `x ∈ [-14.0, -8.8]`)
  buildGuardrailRun(collector, mats, { x1: -39.1, z1: 1.72, x2: -14.1, z2: 1.72, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -13.9, z1: 3.92, x2: -8.9, z2: 3.92, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 8.9, z1: 1.72, x2: 19.4, z2: 1.72, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 24.6, z1: 1.72, x2: 39.1, z2: 1.72, y: y2, accentMat: goldMat });
  // South L2 guardrails (open at SW Jump Pad gate `x ∈ [-24.5, -19.5]` and SE stair landing `x ∈ [10.0, 14.0]`)
  buildGuardrailRun(collector, mats, { x1: -39.1, z1: 77.68, x2: -24.6, z2: 77.68, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -19.4, z1: 77.68, x2: 9.9, z2: 77.68, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 10.1, z1: 75.46, x2: 13.9, z2: 75.46, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 14.1, z1: 77.68, x2: 39.1, z2: 77.68, y: y2, accentMat: goldMat });

  // =========================================================================
  // 4. L3 (+5.2m) TWIN EAST & WEST APEX VANTAGE CROWNS (+17.2m ABOVE BOSS PIT!)
  // =========================================================================
  addWalkableDeck(collector, {
    minX: -43.68,
    maxX: -38.4,
    minZ: 26.0,
    maxZ: 54.0,
    y: y3,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L3_WestApexCrown',
  });
  addWalkableDeck(collector, {
    minX: 38.4,
    maxX: 43.68,
    minZ: 26.0,
    maxZ: 54.0,
    y: y3,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_L3_EastApexCrown',
  });

  // Guardrails framing both L3 Apex Vantage Crowns (open at stair entry ends!)
  buildGuardrailRun(collector, mats, { x1: -38.48, z1: 26.1, x2: -38.48, z2: 53.9, y: y3, accentMat: crimsonMat });
  buildGuardrailRun(collector, mats, { x1: -43.55, z1: 53.92, x2: -38.55, z2: 53.92, y: y3, accentMat: crimsonMat });
  buildGuardrailRun(collector, mats, { x1: 38.48, z1: 26.1, x2: 38.48, z2: 53.9, y: y3, accentMat: crimsonMat });
  buildGuardrailRun(collector, mats, { x1: 38.55, z1: 26.08, x2: 43.55, z2: 26.08, y: y3, accentMat: crimsonMat });

  // Two Flush L2 (0.0m) -> L3 (+5.2m) Express Apex Stairs
  buildStraightStairFlight(collector, mats, {
    x: -41.4,
    z: 20.8,
    width: 2.4,
    length: 10.4,
    yStart: y2,
    yEnd: y3,
    axis: 'z',
    steps: 24,
    railMinSide: false,
    railMaxSide: true,
    accentMat: crimsonMat,
  });
  buildStraightStairFlight(collector, mats, {
    x: 41.4,
    z: 59.2,
    width: 2.4,
    length: 10.4,
    yStart: y3,
    yEnd: y2,
    axis: 'z',
    steps: 24,
    railMinSide: true,
    railMaxSide: false,
    accentMat: crimsonMat,
  });

  // =========================================================================
  // 5. TWIN STACKED CURVED SPIRAL ASCENT TOWERS (`(±28.0, 40.0)`, 4 `arcRamps`!)
  //    Climbing L0 (-12.0m) -> L1 (-6.0m) -> L2 (0.0m) around blazing obsidian-gold core shafts!
  // =========================================================================
  const rIn = F1_GRID.SPIRAL_R_IN; // 2.4m
  const rOut = F1_GRID.SPIRAL_R_OUT; // 4.8m
  const sz = F1_GRID.SPIRAL_Z; // 40.0m

  // --- WEST SPIRAL TOWER (`x = -28.0, z = 40.0`) ---
  const wx = F1_GRID.SPIRAL_W_X;
  // Lower Spiral Flight: L0 (-12.0) at -π/2 (North) -> L1 (-6.0) at +π (West, 270° CCW)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: wx,
    centerZ: sz,
    innerRadius: rIn,
    outerRadius: rOut,
    startAngle: -Math.PI * 0.5,
    endAngle: Math.PI,
    yStart: y0,
    yEnd: y1,
    steps: 28,
    accentMat: crimsonMat,
    innerGuardrail: true,
    outerGuardrail: true,
  });
  // L1 Junction Ring Sector (`[0.86π, 1.28π]`, `y = -6.0`) linking straight to West L1 Bastion & Upper Spiral!
  buildRingWalkwayDeck(collector, mats, {
    centerX: wx,
    centerZ: sz,
    y: y1,
    innerRadius: rIn,
    outerRadius: rOut,
    thickness: 0.34,
    startAngle: Math.PI * 0.86,
    endAngle: Math.PI * 1.28,
    material: mats.sacredBoneStone,
    accentMat: goldMat,
    innerGuardrail: true,
    outerGuardrail: true,
    outerRailGaps: [{ minAngle: Math.PI * 0.88, maxAngle: Math.PI * 1.12 }],
  });
  // West L1 Bridge linking Spiral Tower (`x = -32.8`) <-> West L1 Bastion (`x = -36.0`)
  addWalkableDeck(collector, {
    minX: -35.98,
    maxX: -32.72,
    minZ: sz - 1.8,
    maxZ: sz + 1.8,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_WestSpiralBridgeL1',
  });
  collector.slabs.push({ minX: -36.4, maxX: -32.0, minZ: sz - 1.8, maxZ: sz + 1.8, y: y1 });
  buildGuardrailRun(collector, mats, { x1: -35.9, z1: sz - 1.72, x2: -32.8, z2: sz - 1.72, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -35.9, z1: sz + 1.72, x2: -32.8, z2: sz + 1.72, y: y1, accentMat: goldMat });

  // Upper Spiral Flight: L1 (-6.0) at 1.28π -> L2 (0.0) at 2.5π (South, 220° CCW!)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: wx,
    centerZ: sz,
    innerRadius: rIn,
    outerRadius: rOut,
    startAngle: Math.PI * 1.28,
    endAngle: Math.PI * 2.5,
    yStart: y1,
    yEnd: y2,
    steps: 26,
    accentMat: goldMat,
    innerGuardrail: true,
    outerGuardrail: true,
  });
  // West L2 Crown Ring Sector (`[-0.22π, +1.18π]` -> spans East Retractable Bridge at 0, South entry at +0.5π, West L2 Bridge at +π!)
  buildRingWalkwayDeck(collector, mats, {
    centerX: wx,
    centerZ: sz,
    y: y2,
    innerRadius: rIn,
    outerRadius: rOut,
    thickness: 0.34,
    startAngle: -Math.PI * 0.22,
    endAngle: Math.PI * 1.18,
    material: mats.sacredBoneStone,
    accentMat: goldMat,
    innerGuardrail: true,
    outerGuardrail: true,
    outerRailGaps: [
      { minAngle: -0.32, maxAngle: 0.32 }, // Open East for West Retractable Aerial Siege Skybridge!
      { minAngle: Math.PI * 0.86, maxAngle: Math.PI * 1.14 }, // Open West for West L2 Crown Bridge!
    ],
  });
  // West L2 Bridge linking Spiral Tower (`x = -32.8`) <-> West L2 Crown (`x = -39.2`)
  addWalkableDeck(collector, {
    minX: -39.18,
    maxX: -32.72,
    minZ: sz - 1.8,
    maxZ: sz + 1.8,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_WestSpiralBridgeL2',
  });
  collector.slabs.push({ minX: -39.6, maxX: -32.0, minZ: sz - 1.8, maxZ: sz + 1.8, y: y2 });
  buildGuardrailRun(collector, mats, { x1: -39.1, z1: sz - 1.72, x2: -32.8, z2: sz - 1.72, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -39.1, z1: sz + 1.72, x2: -32.8, z2: sz + 1.72, y: y2, accentMat: goldMat });

  // --- EAST SPIRAL TOWER (`x = +28.0, z = 40.0`, clean mirror!) ---
  const ex = F1_GRID.SPIRAL_E_X;
  // Lower Spiral Flight: L0 (-12.0) at +π/2 (South) -> L1 (-6.0) at 2π / 0 (East, 270° CCW)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: ex,
    centerZ: sz,
    innerRadius: rIn,
    outerRadius: rOut,
    startAngle: Math.PI * 0.5,
    endAngle: Math.PI * 2.0,
    yStart: y0,
    yEnd: y1,
    steps: 28,
    accentMat: crimsonMat,
    innerGuardrail: true,
    outerGuardrail: true,
  });
  // East L1 Junction Ring Sector (`[-0.14π, +0.28π]`, `y = -6.0`)
  buildRingWalkwayDeck(collector, mats, {
    centerX: ex,
    centerZ: sz,
    y: y1,
    innerRadius: rIn,
    outerRadius: rOut,
    thickness: 0.34,
    startAngle: -Math.PI * 0.14,
    endAngle: Math.PI * 0.28,
    material: mats.sacredBoneStone,
    accentMat: goldMat,
    innerGuardrail: true,
    outerGuardrail: true,
    outerRailGaps: [{ minAngle: -Math.PI * 0.12, maxAngle: Math.PI * 0.12 }],
  });
  // East L1 Bridge (`x ∈ [+32.72, +35.98]`)
  addWalkableDeck(collector, {
    minX: 32.72,
    maxX: 35.98,
    minZ: sz - 1.8,
    maxZ: sz + 1.8,
    y: y1,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_EastSpiralBridgeL1',
  });
  collector.slabs.push({ minX: 32.0, maxX: 36.4, minZ: sz - 1.8, maxZ: sz + 1.8, y: y1 });
  buildGuardrailRun(collector, mats, { x1: 32.8, z1: sz - 1.72, x2: 35.9, z2: sz - 1.72, y: y1, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 32.8, z1: sz + 1.72, x2: 35.9, z2: sz + 1.72, y: y1, accentMat: goldMat });

  // Upper Spiral Flight: L1 (-6.0) at +0.28π -> L2 (0.0) at +1.5π (North, 220° CCW!)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: ex,
    centerZ: sz,
    innerRadius: rIn,
    outerRadius: rOut,
    startAngle: Math.PI * 0.28,
    endAngle: Math.PI * 1.5,
    yStart: y1,
    yEnd: y2,
    steps: 26,
    accentMat: goldMat,
    innerGuardrail: true,
    outerGuardrail: true,
  });
  // East L2 Crown Ring Sector (`[0.78π, 2.18π]` -> spans West Retractable Bridge at π, North entry at 1.5π, East L2 Bridge at 2π!)
  buildRingWalkwayDeck(collector, mats, {
    centerX: ex,
    centerZ: sz,
    y: y2,
    innerRadius: rIn,
    outerRadius: rOut,
    thickness: 0.34,
    startAngle: Math.PI * 0.78,
    endAngle: Math.PI * 2.18,
    material: mats.sacredBoneStone,
    accentMat: goldMat,
    innerGuardrail: true,
    outerGuardrail: true,
    outerRailGaps: [
      { minAngle: Math.PI - 0.32, maxAngle: Math.PI + 0.32 }, // Open West for East Retractable Siege Skybridge!
      { minAngle: Math.PI * 1.86, maxAngle: Math.PI * 2.14 }, // Open East for East L2 Crown Bridge!
    ],
  });
  // East L2 Bridge (`x ∈ [+32.72, +39.18]`)
  addWalkableDeck(collector, {
    minX: 32.72,
    maxX: 39.18,
    minZ: sz - 1.8,
    maxZ: sz + 1.8,
    y: y2,
    thickness: 0.34,
    material: mats.sacredBoneStone,
    name: 'F1_EastSpiralBridgeL2',
  });
  collector.slabs.push({ minX: 32.0, maxX: 39.6, minZ: sz - 1.8, maxZ: sz + 1.8, y: y2 });
  buildGuardrailRun(collector, mats, { x1: 32.8, z1: sz - 1.72, x2: 39.1, z2: sz - 1.72, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 32.8, z1: sz + 1.72, x2: 39.1, z2: sz + 1.72, y: y2, accentMat: goldMat });

  // Central Obsidian & Gold Core Spires inside both Spiral Tower hollow cores (r = 1.0m < rIn = 2.4m!)
  const spireDarkSpecs: BoxSpec[] = [];
  const spireGoldSpecs: BoxSpec[] = [];
  const spireCrimsonSpecs: BoxSpec[] = [];
  for (const tx of [wx, ex]) {
    spireDarkSpecs.push({ w: 1.5, h: 24.4, d: 1.5, x: tx, y: y0 + 12.22, z: sz });
    for (const ringY of [y0 + 2.5, y1 + 0.2, y2 + 0.2, y3 + 1.4]) {
      spireGoldSpecs.push({ w: 1.74, h: 0.24, d: 1.74, x: tx, y: ringY, z: sz });
    }
    spireCrimsonSpecs.push(
      { w: 0.14, h: 18.0, d: 1.62, x: tx, y: y0 + 11.4, z: sz },
      { w: 1.62, h: 17.92, d: 0.14, x: tx, y: y0 + 11.4, z: sz }
    );
    collector.boxes.push({
      minX: tx - 0.85,
      maxX: tx + 0.85,
      minY: y0,
      maxY: 12.5,
      minZ: sz - 0.85,
      maxZ: sz + 0.85,
      walkableTop: false,
    });
  }

  // =========================================================================
  // 6. TWIN SUSPENDED CRUCIBLE WEAPON ISLANDS & RETRACTABLE AERIAL SIEGE SKYBRIDGES (`L2 = 0.0m`)
  // =========================================================================
  for (const side of [-1, 1] as const) {
    const islandMinX = side < 0 ? -17.8 : 12.6;
    const islandMaxX = side < 0 ? -12.6 : 17.8;
    const islandCx = (islandMinX + islandMaxX) * 0.5;
    addWalkableDeck(collector, {
      minX: islandMinX,
      maxX: islandMaxX,
      minZ: sz - 3.2,
      maxZ: sz + 3.2,
      y: y2,
      thickness: 0.42,
      material: mats.obsidianBasalt,
      castShadow: true,
      name: `F1_CrucibleIsland_${side < 0 ? 'W' : 'E'}`,
    });
    // Guardrails framing the 3 outer edges (open facing the Retractable Siege Skybridge!)
    buildGuardrailRun(collector, mats, { x1: islandMinX + 0.1, z1: sz - 3.12, x2: islandMaxX - 0.1, z2: sz - 3.12, y: y2, accentMat: crimsonMat });
    buildGuardrailRun(collector, mats, { x1: islandMinX + 0.1, z1: sz + 3.12, x2: islandMaxX - 0.1, z2: sz + 3.12, y: y2, accentMat: crimsonMat });
    const innerEdgeX = side < 0 ? islandMaxX - 0.08 : islandMinX + 0.08;
    buildGuardrailRun(collector, mats, { x1: innerEdgeX, z1: sz - 3.04, x2: innerEdgeX, z2: sz + 3.04, y: y2, accentMat: crimsonMat });

    // Golden hanging suspension cables anchoring the Crucible Island to the Colosseum roof (`y = 0.0 -> 12.56m`)
    for (const czOff of [-2.8, 2.8]) {
      spireGoldSpecs.push({ w: 0.22, h: 12.5, d: 0.22, x: islandCx, y: 6.26, z: sz + czOff });
    }

    const bridgeId = side < 0 ? F1_IDS.bridgeWestSiege : F1_IDS.bridgeEastSiege;
    const switchId = side < 0 ? F1_IDS.switchWestSiege : F1_IDS.switchEastSiege;
    const lockId = side < 0 ? F1_IDS.lockWestSiege : F1_IDS.lockEastSiege;

    // Retractable Aerial Siege Skybridge extending inward from Spiral Tower L2 (`±23.2`) -> Crucible Island (`±17.8`)
    buildRetractableBridge(collector, mats, {
      id: bridgeId,
      label: side < 0 ? 'WEST AERIAL SIEGE BRIDGE' : 'EAST AERIAL SIEGE BRIDGE',
      anchorX: side < 0 ? -23.2 : 23.2,
      y: y2,
      anchorZ: sz,
      extendDirX: side < 0 ? 1 : -1,
      extendDirZ: 0,
      length: 5.4,
      width: 2.6,
      accentMat: crimsonMat,
    });
    // Seamless walkable bridge-to-ring landing lip on the Spiral Tower side
    collector.slabs.push({
      minX: side < 0 ? -24.2 : 22.8,
      maxX: side < 0 ? -22.8 : 24.2,
      minZ: sz - 1.5,
      maxZ: sz + 1.5,
      y: y2,
    });

    // Dual Activation: [E] World Switch on the Spiral Tower L2 Deck + Shootable Relay on the Crucible Island!
    buildWorldSwitch(collector, mats, {
      id: switchId,
      x: side < 0 ? -24.4 : 24.4,
      y: y2,
      z: sz + (side < 0 ? 2.4 : -2.4),
      rotY: side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
      promptLocked: `[E] DEPLOY ${side < 0 ? 'WEST' : 'EAST'} AERIAL SIEGE BRIDGE`,
      promptActivated: `${side < 0 ? 'WEST' : 'EAST'} AERIAL SIEGE BRIDGE DEPLOYED`,
      bannerText: `${side < 0 ? 'WEST' : 'EAST'} AERIAL SIEGE BRIDGE EXTENDED · CRUCIBLE ISLAND ACCESSIBLE!`,
      deployBridgeId: bridgeId,
    });

    buildShootableLock(collector, mats, {
      id: lockId,
      bannerText: `CRUCIBLE RELAY SHATTERED · ${side < 0 ? 'WEST' : 'EAST'} SIEGE BRIDGE DEPLOYED!`,
      x: side < 0 ? -17.3 : 17.3,
      y: y2 + 1.85,
      z: sz,
      rotY: side < 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
      deployBridgeId: bridgeId,
    });
  }

  // =========================================================================
  // 7. SIX CALIBRATED GRAVITY-VORTEX JUMP PADS (ZERO UNDERSIDE BONKS ACROSS [-0.95..+0.95]!)
  // =========================================================================
  // 4 Corner L0 (-12.0m) -> L1 (-6.0m) Escape Man-Cannons (`ΔY = +6.0m`, `launchVy = 14.8`, `launchVx = ±5.2`)
  buildJumpPad(collector, mats, {
    id: F1_IDS.padNwL1,
    x: -31.5,
    y: y0,
    z: 6.2,
    launchVx: -5.2,
    launchVy: 14.8,
    launchVz: 0,
  });
  buildJumpPad(collector, mats, {
    id: F1_IDS.padNeL1,
    x: 31.5,
    y: y0,
    z: 6.2,
    launchVx: 5.2,
    launchVy: 14.8,
    launchVz: 0,
  });
  buildJumpPad(collector, mats, {
    id: F1_IDS.padSwL1,
    x: -31.5,
    y: y0,
    z: 73.8,
    launchVx: -5.2,
    launchVy: 14.8,
    launchVz: 0,
  });
  buildJumpPad(collector, mats, {
    id: F1_IDS.padSeL1,
    x: 31.5,
    y: y0,
    z: 73.8,
    launchVx: 5.2,
    launchVy: 14.8,
    launchVz: 0,
  });

  // 2 Open-Sky L1 (-6.0m) -> L2 (0.0m) Sovereign Crown Boosters (ZERO overhang above launch piers!)
  buildJumpPad(collector, mats, {
    id: F1_IDS.padSwL2,
    x: -22.0,
    y: y1,
    z: 73.2,
    launchVx: 0,
    launchVy: 14.8,
    launchVz: 5.0,
  });
  buildJumpPad(collector, mats, {
    id: F1_IDS.padNeL2,
    x: 22.0,
    y: y1,
    z: 6.4,
    launchVx: 0,
    launchVy: 14.8,
    launchVz: -5.0,
  });

  // =========================================================================
  // 8. ELEVATED GALLERY & APEX TACTICAL COVER BARRICADES (strictly clear of Jump Pad landing lanes!)
  // =========================================================================
  buildJerseyBarricades(
    collector,
    mats,
    [
      // West & East L1 Bastion tactical cover
      { x: -39.5, y: y1, z: 24.0, w: 1.0, h: 1.15, d: 3.4 },
      { x: -39.5, y: y1, z: 56.0, w: 1.0, h: 1.15, d: 3.4 },
      { x: 39.5, y: y1, z: 24.0, w: 1.0, h: 1.15, d: 3.4 },
      { x: 39.5, y: y1, z: 56.0, w: 1.0, h: 1.15, d: 3.4 },
      // South L2 Crown flanking cover near Sovereign Control Center
      { x: -12.0, y: y2, z: 79.4, w: 3.2, h: 1.15, d: 0.9 },
      { x: 12.0, y: y2, z: 79.4, w: 3.2, h: 1.15, d: 0.9 },
      // Twin L3 Apex Vantage Crown sniper parapets!
      { x: -39.8, y: y3, z: 34.0, w: 0.9, h: 1.15, d: 3.2 },
      { x: -39.8, y: y3, z: 46.0, w: 0.9, h: 1.15, d: 3.2 },
      { x: 39.8, y: y3, z: 34.0, w: 0.9, h: 1.15, d: 3.2 },
      { x: 39.8, y: y3, z: 46.0, w: 0.9, h: 1.15, d: 3.2 },
    ],
    { accentMat: goldMat, name: 'F1_GalleryCoverBarricades' }
  );

  const sDarkMesh = buildBatchedBoxesMesh(spireDarkSpecs, mats.obsidianBasalt, {
    castShadow: true,
    receiveShadow: true,
    name: 'F1_SpiralCoreSpires',
  });
  if (sDarkMesh) {
    collector.group.add(sDarkMesh);
    collector.wallMeshes.push(sDarkMesh);
  }
  const sGoldMesh = buildBatchedBoxesMesh(spireGoldSpecs, goldMat, {
    name: 'F1_SpiralCoreGoldAndCables',
  });
  if (sGoldMesh) detailGroup.add(sGoldMesh);
  const sCrimsonMesh = buildBatchedBoxesMesh(spireCrimsonSpecs, crimsonMat, {
    name: 'F1_SpiralCoreCrimson',
  });
  if (sCrimsonMesh) detailGroup.add(sCrimsonMesh);
}
