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
import { buildExplosiveBarrel } from '../../mechanics';
import {
  F4_BASE_Y,
  F4_CEILINGS,
  F4_UPPER_Y,
  F4_WALLS,
} from './layout';

/**
 * FLOOR 04 — ZONE 7 (SW OCCLUSION CELL): GEOTHERMAL PUMP & PRESSURE MANIFOLD CAVERN
 * Footprint: x ∈ [-48.0, -18.0] (30m) × z ∈ [+10.0, +32.0] (22m), 10.4m tall!
 *
 * Signature CoD Industrial Geothermal Plant × Halo Deep-Core Pump Vault:
 * - 3 Colossal Vertical-Axis Kinetic Geothermal Pressure Turbines glowing molten-amber along `z = +23.0`
 *   with towering overhead heat-exchanger manifold ducts & glowing thermal floor conduits!
 * - Elevated `+4.4m` Geothermal Overlook Gallery (`y = 46.4m`) linking Zone 3 Hydro Dam
 *   (`hydroToGeoUpperX`) & Zone 1 South Overlook (`westSouthUpperZ`)!
 * - Flush West-Wall Staircase (`x = -46.42`, `minX = -47.67` flush against `-47.70` -> ZERO wall gap!)
 */
export function buildFloor4Zone7SouthWestGeothermal(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.swGeothermal; // 10.4m
  const moltenMat = mats.floorAccent[4]; // Molten volcanic geothermal orange-amber!
  const hazardMat = mats.hazardStripe;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F4_Z7_SW_GEOTHERMAL';
  collector.group.add(cellGroup);

  // 1. Floor & Coffered Ceiling Slabs (`x ∈ [-48.0, -18.0], z ∈ [+10.0, +32.0]`)
  addWalkableDeck(collector, {
    minX: F4_WALLS.westOuterX,
    maxX: F4_WALLS.canyonWestX,
    minZ: F4_WALLS.southSplitZ,
    maxZ: F4_WALLS.southWingsOuterZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F4_Z7_GeothermalFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 21.4, x: -33.0, y: baseY + ceilH + 0.25, z: 21.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F4_Z7_GeothermalCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // Overhead Heat-Exchanger Manifold Ducts & Lights
  const ductSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const dz of [14.0, 21.0, 28.0]) {
    ductSpecs.push({ w: 29.3, h: 0.52, d: 0.46, x: -33.0, y: baseY + ceilH - 0.28, z: dz });
    lightSpecs.push(
      { w: 9.0, h: 0.08, d: 0.34, x: -39.0, y: baseY + ceilH - 0.06, z: dz - 2.2 },
      { w: 9.0, h: 0.08, d: 0.34, x: -27.0, y: baseY + ceilH - 0.06, z: dz - 2.2 }
    );
  }
  const ductMesh = buildBatchedBoxesMesh(ductSpecs, mats.structuralSteel, { name: 'F4_Z7_ManifoldDucts' });
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F4_Z7_RoofLights' });
  if (ductMesh) cellGroup.add(ductMesh);
  if (lightMesh) cellGroup.add(lightMesh);

  // 2. Perimeter Walls (South Outer `z = +32.0`, West Outer `x = -48.0`, East Solid Segment `x = -18.0, z ∈ [+16.7, +31.7]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.southWingsOuterZ,
    spanStart: F4_WALLS.westOuterX,
    spanEnd: F4_WALLS.canyonWestX,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: moltenMat,
    targetGroup: cellGroup,
    name: 'F4_Z7_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.westOuterX,
    spanStart: F4_WALLS.southSplitZ + 0.3,
    spanEnd: F4_WALLS.southWingsOuterZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: moltenMat,
    targetGroup: cellGroup,
    name: 'F4_Z7_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.canyonWestX,
    spanStart: F4_WALLS.canyonSouthZ + 0.31,
    spanEnd: F4_WALLS.southWingsOuterZ - 0.31,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: moltenMat,
    targetGroup: cellGroup,
    name: 'F4_Z7_EastSolidWall',
  });

  // 3. HERO LANDMARK: 3 COLOSSAL KINETIC GEOTHERMAL PRESSURE TURBINES (`x = -38.0, -31.0, -24.0, z = +23.0`)!
  const manifoldSpecs: BoxSpec[] = [];
  const glowConduitSpecs: BoxSpec[] = [
    { w: 22.0, h: 0.02, d: 0.24, x: -31.0, y: baseY + 0.016, z: 23.0 },
  ];
  for (let i = 0; i < 3; i++) {
    const gx = -38.0 + i * 7.0;
    const gz = 23.0;
    // Heavy octagonal-feel stepped pedestal base + overhead exhaust hood joining straight into ceiling!
    manifoldSpecs.push(
      { w: 3.4, h: 0.43, d: 3.4, x: gx, y: baseY + 0.245, z: gz },
      { w: 2.8, h: 0.44, d: 2.8, x: gx, y: baseY + 5.8, z: gz },
      { w: 1.5, h: ceilH - 6.02, d: 1.5, x: gx, y: baseY + 6.02 + (ceilH - 6.02) * 0.5, z: gz },
      // 4 corner cage stanchions around turbine core
      { w: 0.28, h: 5.1, d: 0.28, x: gx - 1.38, y: baseY + 3.02, z: gz - 1.38 },
      { w: 0.28, h: 5.1, d: 0.28, x: gx + 1.38, y: baseY + 3.02, z: gz - 1.38 },
      { w: 0.28, h: 5.1, d: 0.28, x: gx - 1.38, y: baseY + 3.02, z: gz + 1.38 },
      { w: 0.28, h: 5.1, d: 0.28, x: gx + 1.38, y: baseY + 3.02, z: gz + 1.38 }
    );
    collector.boxes.push({
      minX: gx - 1.72,
      maxX: gx + 1.72,
      minY: baseY,
      maxY: baseY + 6.0,
      minZ: gz - 1.72,
      maxZ: gz + 1.72,
      walkableTop: false,
    });

    // Kinetic Vertical-Axis Rotating Geothermal Pressure Rotor!
    const turbineGroup = new THREE.Group();
    turbineGroup.name = `F4_Z7_GeothermalRotor_${i}`;
    turbineGroup.position.set(gx, baseY + 3.05, gz);
    const coreCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.78, 4.9, 18),
      mats.armoredSteel
    );
    const glowRingLo = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.075, 8, 24), moltenMat);
    glowRingLo.rotation.x = Math.PI * 0.5;
    glowRingLo.position.y = -1.2;
    const glowRingHi = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.075, 8, 24), moltenMat);
    glowRingHi.rotation.x = Math.PI * 0.5;
    glowRingHi.position.y = 1.2;
    const blades = buildBatchedBoxesMesh(
      [
        { w: 2.32, h: 3.6, d: 0.14, x: 0, y: 0, z: 0 },
        { w: 0.14, h: 3.6, d: 2.32, x: 0, y: 0.01, z: 0 },
      ],
      mats.brushedMetal,
      { name: `F4_Z7_GeoBlades_${i}` }
    );
    turbineGroup.add(coreCyl, glowRingLo, glowRingHi);
    if (blades) turbineGroup.add(blades);
    cellGroup.add(turbineGroup);
    collector.animatedSpinners?.push({ obj: turbineGroup, speed: i % 2 === 0 ? 1.35 : -1.35 });
  }

  const manifoldMesh = buildBatchedBoxesMesh(manifoldSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z7_GeothermalManifolds',
  });
  const glowMesh = buildBatchedBoxesMesh(glowConduitSpecs, moltenMat, { name: 'F4_Z7_ThermalConduit' });
  if (manifoldMesh) {
    cellGroup.add(manifoldMesh);
    collector.wallMeshes.push(manifoldMesh);
  }
  if (glowMesh) cellGroup.add(glowMesh);

  // 4. ELEVATED `+4.4m` GEOTHERMAL OVERLOOK GALLERY (`y = 46.4m`) + FLUSH WEST-WALL STAIRCASE!
  // West Spine (`x ∈ [-47.68, -42.4], z ∈ [10.32, 21.0]`) meeting Zone 3 `hydroToGeoUpperX`!
  addWalkableDeck(collector, {
    minX: -47.68,
    maxX: -42.4,
    minZ: 10.32,
    maxZ: 21.0,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z7_WestGeoSpine',
  });
  // North Transverse Overlook Catwalk (`x ∈ [-42.4, -18.32], z ∈ [10.8, 15.2]`, inset 6mm at `-42.4`!) meeting `westSouthUpperZ`!
  const northWalkMesh = buildBatchedBoxesMesh(
    [{ w: 24.074, h: 0.42, d: 4.4, x: -30.357, y: upperY - 0.21, z: 13.0 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z7_NorthGeoCatwalk' }
  );
  if (northWalkMesh) {
    cellGroup.add(northWalkMesh);
    collector.wallMeshes.push(northWalkMesh);
  }
  collector.slabs.push({ minX: -42.4, maxX: -18.32, minZ: 10.8, maxZ: 15.2, y: upperY, thickness: 0.42 });

  // Flush West-Wall Staircase (`x = -46.42`, `width = 2.50` -> `minX = -47.67` flush against `-47.70`!)
  // Ascends South->North from `z = 29.2` (`baseY`) up to `z = 21.0` (`upperY`) — ZERO wall gap!
  buildStraightStairFlight(collector, mats, {
    x: -46.42,
    z: 25.1,
    width: 2.5,
    length: 8.2,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: false,
    railMaxSide: true,
    accentMat: moltenMat,
    targetGroup: cellGroup,
  });

  // Grounded Support Columns
  const colSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const [cx, cz] of [
    [-42.7, 15.0],
    [-42.7, 20.6],
    [-31.0, 14.9],
    [-21.2, 14.9],
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
    name: 'F4_Z7_GeoCols',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Guardrails
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: 15.2, x2: -42.4, z2: 21.0, y: upperY, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -45.14, z1: 21.0, x2: -42.4, z2: 21.0, y: upperY, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: 15.2, x2: -18.32, z2: 15.2, y: upperY, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: 10.8, x2: -18.32, z2: 10.8, y: upperY, accentMat: moltenMat, targetGroup: cellGroup });

  // 5. Tactical Barricades + 2 Explosive Plasma Barrels + Signage
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -34.5, y: baseY, z: 17.6, w: 2.6, h: 0.96, d: 0.9, walkableTop: true },
      { x: -27.5, y: baseY, z: 29.0, w: 2.6, h: 0.96, d: 0.9, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: hazardMat, name: 'F4_Z7_GeoCover' }
  );
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_geo_w', x: -41.2, y: baseY, z: 18.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_geo_e', x: -21.2, y: baseY, z: 27.6, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '04-Z7',
    title: 'GEOTHERMAL MANIFOLD',
    subtitle: 'HIGH-PRESSURE THERMAL TURBINES · WEST UPPER GALLERY',
    accentHex: 0xf97316,
    x: -33.0,
    y: baseY + 8.2,
    z: 31.62,
    rotY: Math.PI,
    width: 6.4,
    height: 1.48,
  });

  return {
    id: 'f4_zone7_sw_geothermal',
    group: cellGroup,
    triggerBounds: { minX: -49.5, maxX: 6.0, minZ: -12.0, maxZ: 32.5 },
    center: { x: -33.0, z: 21.0 },
    maxViewDistance: 46.0,
  };
}
