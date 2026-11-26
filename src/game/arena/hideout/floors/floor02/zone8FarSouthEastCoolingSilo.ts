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
  type FloorGeometryCollector,
} from '../../stairs';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildJumpPad,
} from '../../mechanics';
import {
  F2_CEIL_H,
  F2_GRID,
  F2_IDS,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_ROOF_CENTER_Y,
  F2_ROOF_THICK,
} from './layout';

/**
 * FLOOR 02 — ZONE 8 (FAR SE OCCLUSION CELL): DOUBLE-HELIX TURBINE COOLING SILO & SUPER-LIFT #2
 * Footprint: x ∈ [+34.0, +56.0], z ∈ [+4.0, +34.0] (`22m × 30m`)
 *
 * - Monumental cylindrical Voltaic Heat-Exchanger Cooling Core (`center = (+45.0, +19.0)`) rising
 *   all the way to the roof surrounded by Counter-Rotating Copper-Alloy Turbine Halos!
 * - TWO CONTINUOUS STACKED HELICAL SPIRAL STAIRCASES (`buildCurvedSpiralStairs`, `innerRadius: 2.3, outerRadius: 4.5`):
 *   1. Lower Helix (`L0 14.0m -> L1 17.1m`, East semicircle `angle: -π/2 -> +π/2 - 0.28`)
 *   2. Curved L1 South Apex Junction (`buildRingWalkwayDeck` + bridge stub onto L1 South Terrace!)
 *   3. Upper Helix (`L1 17.1m -> L2 20.2m`, West semicircle `angle: +π/2 + 0.28 -> +3π/2`)
 *   Walk in a single sweeping 360° spiral ascent straight up all 3 stories with ZERO slab overlap!
 * - ALSO features Express `L0 -> L2` Pneumatic Super-Lift Jump Pad #2 (`f2_pad_silo_super_l0_l2`)
 *   catapulting operatives from `14.0m` directly onto the `20.2m` North L2 Crown Deck!
 */
export function buildFloor2Zone8FarSouthEastCoolingSilo(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const accentMat = mats.floorAccent[2];
  const moltenMat = mats.moltenGlow;

  const cx = 45.0;
  const cz = 19.0;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F2_CELL_Z8_SE_COOLING_SILO';
  collector.group.add(cellGroup);

  // 1. Full Solid L0 Silo Floor (`x ∈ [+34, +56], z ∈ [+4, +34]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_EAST_MID,
    maxX: F2_GRID.X_EAST_OUTER,
    minZ: F2_GRID.Z_CUSTOMS,
    maxZ: F2_GRID.Z_SOUTH_OUTER,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z8_L0_Floor',
  });

  // 2. Single-Owner Exterior Walls: East (`x = +56.0`) & South (`z = +34.0`)
  //    (West wall `x = +34.0` owned by Zone 6; North wall `z = +4.0` owned by Zone 9!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_EAST_OUTER,
    spanStart: F2_GRID.Z_CUSTOMS + 0.3,
    spanEnd: F2_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z8_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_SOUTH_OUTER,
    spanStart: F2_GRID.X_EAST_MID + 0.3,
    spanEnd: F2_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z8_SouthOuterWall',
  });

  // 3. LEVEL 1 (`17.1m`) COOLING SILO TERRACES + CURVED SOUTH APEX SPIRAL JUNCTION!
  //    South L1 Terrace (`x ∈ [+34.31, +49.6], z ∈ [+24.0, +33.69]` -> connects Zone 6 L1 `[25.4, 29.0]` & spiral apex!)
  addWalkableDeck(collector, {
    minX: 34.31,
    maxX: 49.6,
    minZ: 24.0,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z8_L1_SouthTerrace',
  });
  //    East L1 Perimeter Gallery (`x ∈ [+49.6, +55.69], z ∈ [+4.31, +33.69]` -> connects Zone 9 L1 `[49.6, 53.2]`; clear of spiral `r_max = 4.5 -> x <= 49.5`!)
  addWalkableDeck(collector, {
    minX: 49.6,
    maxX: 55.69,
    minZ: 4.31,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z8_L1_EastGallery',
  });
  //    Curved L1 South Spiral Apex Junction (`a ∈ [π/2 - 0.28, π/2 + 0.28]`) + bridge stub to South Terrace!
  buildRingWalkwayDeck(collector, mats, {
    centerX: cx,
    centerZ: cz,
    y: y1,
    innerRadius: 2.3,
    outerRadius: 4.5,
    thickness: 0.34,
    segments: 10,
    startAngle: Math.PI * 0.5 - 0.28,
    endAngle: Math.PI * 0.5 + 0.28,
    material: mats.catwalkGrate,
    accentMat,
    innerGuardrail: true,
    outerGuardrail: false,
    targetGroup: cellGroup,
  });
  addWalkableDeck(collector, {
    minX: 43.8,
    maxX: 46.2,
    minZ: 23.32,
    maxZ: 24.02,
    y: y1 - 0.008,
    thickness: 0.324,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z8_L1_SpiralBridgeStub',
  });

  // L1 Guardrails (OPEN cleanly at Spiral Junction Bridge `x ∈ [43.8, 46.2]` on `z = +24.0`!)
  buildGuardrailRun(collector, mats, { x1: 34.35, z1: 24.0, x2: 43.8, z2: 24.0, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 46.2, z1: 24.0, x2: 49.6, z2: 24.0, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 49.6, z1: 4.35, x2: 49.6, z2: 24.0, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`20.2m`) NORTH CROWN DECK (`x ∈ [+34.31, +55.69], z ∈ [+4.31, +14.2]`) + NE SPIRAL EXIT LANDING!
  addWalkableDeck(collector, {
    minX: 34.31,
    maxX: 55.69,
    minZ: 4.31,
    maxZ: 14.2,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z8_L2_NorthCrownDeck',
  });
  //    L2 NE Spiral Exit Landing (`x ∈ [+45.0, +49.6], z ∈ [+14.2, +16.7]`) — receives Upper Helix (`angle = 3π/2` heading East) cleanly `+5.86m` above Lower Helix start!
  addWalkableDeck(collector, {
    minX: 45.0,
    maxX: 49.6,
    minZ: 14.2,
    maxZ: 16.7,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z8_L2_SpiralExitLanding',
  });

  // L2 Guardrails (OPEN at Super-Lift #2 landing slot `x ∈ [35.4, 39.4]` AND NE Spiral Exit Landing `x ∈ [45.0, 49.6]`!)
  buildGuardrailRun(collector, mats, { x1: 34.35, z1: 14.2, x2: 35.4, z2: 14.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 39.4, z1: 14.2, x2: 45.0, z2: 14.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 45.0, z1: 16.7, x2: 49.6, z2: 16.7, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 49.6, z1: 14.2, x2: 49.6, z2: 16.7, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 49.6, z1: 14.2, x2: 55.65, z2: 14.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // 5. MONUMENTAL DOUBLE-HELIX CURVED SPIRAL STAIRCASES (`14.0 -> 17.1 -> 20.2m`)!
  //    Lower Helix (`L0 -> L1`, East arc `angle: -π/2 -> +π/2 - 0.28`)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: cx,
    centerZ: cz,
    innerRadius: 2.3,
    outerRadius: 4.5,
    startAngle: -Math.PI * 0.5,
    endAngle: Math.PI * 0.5 - 0.28,
    yStart: y0,
    yEnd: y1,
    steps: 18,
    accentMat,
    innerGuardrail: true,
    outerGuardrail: true,
    targetGroup: cellGroup,
  });
  //    Upper Helix (`L1 -> L2`, West arc `angle: +π/2 + 0.28 -> +3π/2`)
  buildCurvedSpiralStairs(collector, mats, {
    centerX: cx,
    centerZ: cz,
    innerRadius: 2.3,
    outerRadius: 4.5,
    startAngle: Math.PI * 0.5 + 0.28,
    endAngle: Math.PI * 1.5,
    yStart: y1,
    yEnd: y2,
    steps: 18,
    accentMat: moltenMat,
    innerGuardrail: true,
    outerGuardrail: true,
    targetGroup: cellGroup,
  });

  // 6. EXPRESS `L0 -> L2` PNEUMATIC SUPER-LIFT JUMP PAD #2 (`14.0m -> 20.2m`, soaring cleanly over `z = +14.2`!)
  buildJumpPad(collector, mats, {
    id: F2_IDS.padCoolingSiloSuperL0ToL2,
    x: 37.4,
    y: y0,
    z: 18.0,
    launchVy: 15.2,
    launchVx: 0,
    launchVz: -3.7,
    targetGroup: cellGroup,
  });

  // 7. HERO VOLTAIC HEAT-EXCHANGER COOLING COLUMN + COUNTER-ROTATING TURBINE RINGS!
  const coreH = ceilH - 0.14;
  const coolingCore = new THREE.Mesh(
    new THREE.CylinderGeometry(1.56, 1.72, coreH, 16),
    mats.armoredSteel
  );
  coolingCore.position.set(cx, y0 + coreH * 0.5 + 0.01, cz);
  coolingCore.castShadow = true;
  coolingCore.receiveShadow = true;
  coolingCore.name = 'F2_Z8_CoolingSiloColumn';
  cellGroup.add(coolingCore);
  collector.wallMeshes.push(coolingCore);
  collector.boxes.push({
    id: 'f2_z8_cooling_column',
    minX: cx - 1.76,
    maxX: cx + 1.76,
    minY: y0,
    maxY: y0 + ceilH,
    minZ: cz - 1.76,
    maxZ: cz + 1.76,
    walkableTop: false,
    tag: 'cooling_silo_core',
  });

  // Glowing copper-amber radiator bands along the core
  for (const by of [y0 + 1.6, y1 + 1.5, y2 + 1.6]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.74, 1.74, 0.36, 16), moltenMat);
    band.position.set(cx, by, cz);
    cellGroup.add(band);
  }

  for (const [idx, ry, speed, mat] of [
    [0, y1 + 1.3, 0.72, mats.amberAlloy],
    [1, y2 + 1.6, -0.92, accentMat],
  ] as const) {
    const halo = new THREE.Group();
    halo.name = `F2_Z8_CoolingHalo_${idx}`;
    halo.position.set(cx, ry, cz);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(2.04, 0.085, 10, 32), mat);
    torus.rotation.x = Math.PI * 0.5 + (idx === 0 ? 0.14 : -0.16);
    halo.add(torus);
    cellGroup.add(halo);
    collector.animatedSpinners?.push({ obj: halo, speed });
  }

  // Grounded structural columns, ceiling lights & Watertight Roof Slab (`top = 25.40m`)
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const colH2 = y2 - 0.34 - (y0 + 0.006);
  for (const colX of [40.8, 51.4]) {
    steelSpecs.push({ w: 0.62, h: colH2, d: 0.62, x: colX, y: y0 + 0.006 + colH2 * 0.5, z: 13.4 });
    collector.boxes.push({
      minX: colX - 0.34,
      maxX: colX + 0.34,
      minY: y0,
      maxY: y2,
      minZ: 13.06,
      maxZ: 13.74,
      walkableTop: false,
    });
  }
  for (const lz of [9.5, 19.0, 28.5]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.44, x: cx, y: y0 + ceilH - 0.06, z: lz });
  }

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 22.3, h: F2_ROOF_THICK, d: 30.3, x: cx + 0.15, y: F2_ROOF_CENTER_Y, z: 19.15 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z8_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const colMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z8_Columns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z8_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z8_l0', x: 37.8, y: y0, z: 26.8, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z8_l2', x: 51.5, y: y2, z: 9.5, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-CS',
    title: 'DOUBLE-HELIX COOLING SILO',
    subtitle: '360° CURVED SPIRAL ASCENT · L0→L2 SUPER-LIFT',
    accentHex: 0xf97316,
    x: cx,
    y: y2 + 2.4,
    z: F2_GRID.Z_SOUTH_OUTER - 0.36,
    rotY: Math.PI,
    width: 7.4,
    height: 1.4,
  });

  return {
    id: 'f2_zone8_se_cooling_silo',
    group: cellGroup,
    triggerBounds: { minX: 30.0, maxX: 56.0, minZ: 1.0, maxZ: 34.0 },
    center: { x: cx, z: cz },
    maxViewDistance: 68.0,
  };
}
