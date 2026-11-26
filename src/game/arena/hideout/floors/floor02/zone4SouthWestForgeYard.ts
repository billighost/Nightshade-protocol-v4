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
import { buildExplosiveBarrel } from '../../mechanics';
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
 * FLOOR 02 — ZONE 4 (SW OCCLUSION CELL): HYDRAULIC FORGE YARD & KINETIC FLYWHEEL PRESS
 * Footprint: x ∈ [-34.0, -12.0], z ∈ [+4.0, +34.0] (`22m × 30m`)
 *
 * - Heavy cyber-industrial cargo & hydraulic stamping yard featuring Twin Kinetic Spinning Forge
 *   Flywheels (`animatedSpinners`) mounted in armored A-frames!
 * - Houses Jammed Roll-Under Blast Shutter #2 (`f2_jammed_forge_silo`) along the West partition
 *   (`x = -34.0, z ∈ [16.2, 20.2]`) into Zone 5 Far SW Slag Silo!
 * - Flush East-wall `L0 -> L1` staircase + soaring L1 & L2 Skyways linking Zone 1 Customs Overpass,
 *   Zone 3 Smelter Foundry, and Zone 5 Slag Silo seamlessly!
 */
export function buildFloor2Zone4SouthWestForgeYard(
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
  cellGroup.name = 'F2_CELL_Z4_SW_FORGE_YARD';
  collector.group.add(cellGroup);

  // 1. Full L0 Forge Yard Floor (`x ∈ [-34, -12], z ∈ [+4, +34]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_WEST_MID,
    maxX: F2_GRID.X_CORE_WEST,
    minZ: F2_GRID.Z_CUSTOMS,
    maxZ: F2_GRID.Z_SOUTH_OUTER,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z4_L0_Floor',
  });

  // 2. Single-Owner Walls:
  //    - West (`x = -34.0`, z ∈ [+4, +34]) -> Zone 5 Far SW Slag Silo
  //    - South outer (`z = +34.0`, x ∈ [-34, -12])
  //    - East shaft wall (`x = -12.0`, z ∈ [+17, +34]; z ∈ [+4, +17] owned by Zone 1!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_WEST_MID,
    spanStart: F2_GRID.Z_CUSTOMS + 0.3,
    spanEnd: F2_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F2_PORTALS.Z4_Z5_JAMMED_Z[0], end: F2_PORTALS.Z4_Z5_JAMMED_Z[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z4_Z5_L1_Z[0], end: F2_PORTALS.Z4_Z5_L1_Z[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z4_Z5_L2_Z[0], end: F2_PORTALS.Z4_Z5_L2_Z[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F2_Z4_WestPartitionWall',
  });
  addF2PortalSill(collector, { axis: 'z', coord: F2_GRID.X_WEST_MID, span: F2_PORTALS.Z4_Z5_L1_Z, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z4_Sill_Z5_L1' });
  addF2PortalSill(collector, { axis: 'z', coord: F2_GRID.X_WEST_MID, span: F2_PORTALS.Z4_Z5_L2_Z, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z4_Sill_Z5_L2' });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_SOUTH_OUTER,
    spanStart: F2_GRID.X_WEST_MID - 0.3,
    spanEnd: F2_GRID.X_CORE_WEST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z4_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_CORE_WEST,
    spanStart: F2_GRID.Z_ARRIVAL + 0.3,
    spanEnd: F2_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z4_EastShaftWall',
  });

  // Jammed Roll-Under Blast Shutter #2 (`x = -34.0, z ∈ [16.2, 20.2]`) into Zone 5!
  buildTacticalDoor(collector, mats, {
    id: F2_IDS.jammedForgeSilo,
    mode: 'jammed_roll',
    x: F2_GRID.X_WEST_MID,
    y: y0,
    z: 18.2,
    width: 4.0,
    height: 2.65,
    spanAxis: 'z',
    targetGroup: cellGroup,
  });

  // 3. LEVEL 1 (`17.1m`) FORGE CATWALK NETWORK + FLUSH EAST-WALL `L0 -> L1` STAIR!
  //    South L1 Deck (`x ∈ [-33.69, -12.31], z ∈ [+25.3, +33.69]` -> connects Zone 5 L1 `z ∈ [25.4, 29.0]` & receives stair!)
  addWalkableDeck(collector, {
    minX: -33.69,
    maxX: -12.31,
    minZ: 25.3,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z4_L1_SouthDeck',
  });
  //    North-East L1 Overpass (`x ∈ [-18.2, -12.31], z ∈ [+4.31, +14.0]` -> connects Zone 1 L1 & Zone 3 L1!)
  addWalkableDeck(collector, {
    minX: -18.2,
    maxX: -12.31,
    minZ: 4.31,
    maxZ: 14.0,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z4_L1_NorthEastOverpass',
  });
  //    Connecting East Spine (`x ∈ [-18.2, -14.3], z ∈ [+14.0, +25.3]` -> flush beside the East-wall stair!)
  addWalkableDeck(collector, {
    minX: -18.2,
    maxX: -14.3,
    minZ: 14.0,
    maxZ: 25.3,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z4_L1_EastConnector',
  });

  // L1 Guardrails (open cleanly at East-wall stair top `x ∈ [-14.3, -12.31]` on `z = +25.3`!)
  buildGuardrailRun(collector, mats, { x1: -33.65, z1: 25.3, x2: -18.2, z2: 25.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -18.2, z1: 4.35, x2: -18.2, z2: 25.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -14.3, z1: 14.0, x2: -14.3, z2: 25.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -14.3, z1: 14.0, x2: -12.35, z2: 14.0, y: y1, accentMat, targetGroup: cellGroup });

  // Flush East-Wall `L0 -> L1` Stair (`x = -13.3, z: 19.5 -> 25.3`)
  buildStraightStairFlight(collector, mats, {
    x: -13.3,
    z: 22.4,
    width: 2.0,
    length: 5.8,
    yStart: y0, // z = 19.5 -> 14.0m
    yEnd: y1, // z = 25.3 -> 17.1m (South L1 Deck)
    axis: 'z',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  // 4. LEVEL 2 (`20.2m`) SOARING NORTH SKYWAY (`x ∈ [-33.69, -12.31], z ∈ [+7.6, +12.0]` + North Spur into Zone 3!)
  addWalkableDeck(collector, {
    minX: -33.69,
    maxX: -12.31,
    minZ: 7.6,
    maxZ: 12.0,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z4_L2_NorthSkyway',
  });
  addWalkableDeck(collector, {
    minX: -25.0,
    maxX: -21.0,
    minZ: 4.31,
    maxZ: 7.6,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z4_L2_NorthSpur',
  });
  buildGuardrailRun(collector, mats, { x1: -33.65, z1: 12.0, x2: -12.35, z2: 12.0, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -33.65, z1: 7.6, x2: -25.0, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -21.0, z1: 7.6, x2: -12.35, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -25.0, z1: 4.35, x2: -25.0, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -21.0, z1: 4.35, x2: -21.0, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // 5. HERO KINETIC PROPS: TWIN SPINNING HYDRAULIC FORGE FLYWHEELS (`(-25.8, 18.2)` & `(-25.8, 22.4)`)
  const pressFrameSpecs: BoxSpec[] = [];
  for (const [idx, fz] of [17.4, 21.8].entries()) {
    const fx = -25.5;
    pressFrameSpecs.push(
      { w: 0.56, h: 4.8, d: 0.56, x: fx, y: y0 + 2.41, z: fz - 1.35 },
      { w: 0.56, h: 4.8, d: 0.56, x: fx, y: y0 + 2.41, z: fz + 1.35 },
      { w: 0.68, h: 0.44, d: 3.3, x: fx, y: y0 + 4.98, z: fz }
    );
    collector.boxes.push({
      id: `f2_z4_flywheel_${idx}`,
      minX: fx - 0.65,
      maxX: fx + 0.65,
      minY: y0,
      maxY: y0 + 5.2,
      minZ: fz - 1.65,
      maxZ: fz + 1.65,
      walkableTop: false,
      tag: 'forge_flywheel',
    });

    const wheelGroup = new THREE.Group();
    wheelGroup.name = `F2_Z4_ForgeFlywheel_${idx}`;
    wheelGroup.position.set(fx, y0 + 2.6, fz);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.14, 10, 24), mats.amberAlloy);
    rim.rotation.y = Math.PI * 0.5;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.65, 12), moltenMat);
    hub.rotation.z = Math.PI * 0.5;
    wheelGroup.add(rim, hub);
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.24, 0.14), mats.structuralSteel);
      spoke.rotation.x = (s / 3) * Math.PI;
      wheelGroup.add(spoke);
    }
    cellGroup.add(wheelGroup);
    collector.animatedSpinners?.push({ obj: wheelGroup, speed: idx === 0 ? 1.4 : -1.4, axis: 'x' });
  }

  // Corrugated Heavy Alloy Cargo Container (`(-29.2, y0, 10.2)`, walkableTop!)
  pressFrameSpecs.push({ w: 3.4, h: 2.35, d: 5.2, x: -29.2, y: y0 + 1.18, z: 10.2 });
  collector.boxes.push({
    id: 'f2_z4_cargo_container',
    minX: -30.9,
    maxX: -27.5,
    minY: y0,
    maxY: y0 + 2.36,
    minZ: 7.6,
    maxZ: 12.8,
    walkableTop: true,
    tag: 'cargo_container',
  });

  const frameMesh = buildBatchedBoxesMesh(pressFrameSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z4_ForgeMachinery',
  });
  if (frameMesh) {
    cellGroup.add(frameMesh);
    collector.wallMeshes.push(frameMesh);
  }

  // Ceiling Lights & Watertight Roof Slab (`top = 25.40m`)
  const lightSpecs: BoxSpec[] = [];
  for (const lz of [9.5, 19.0, 28.5]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.44, x: -23.0, y: y0 + ceilH - 0.06, z: lz });
  }
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 22.0, h: F2_ROOF_THICK, d: 30.3, x: -23.0, y: F2_ROOF_CENTER_Y, z: 19.15 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z4_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z4_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -19.5, y: y0, z: 14.5, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
      { x: -25.0, y: y1, z: 29.0, w: 0.88, h: 0.98, d: 2.4, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z4_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z4_l0', x: -21.2, y: y0, z: 22.5, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z4_l1', x: -29.2, y: y1, z: 29.8, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-FY',
    title: 'HYDRAULIC FORGE YARD',
    subtitle: 'WEST JAMMED SHUTTER TO SLAG SILO · L1/L2 SKYWAYS',
    accentHex: 0xeab308,
    x: -23.0,
    y: y2 + 2.4,
    z: F2_GRID.Z_SOUTH_OUTER - 0.36,
    rotY: Math.PI,
    width: 7.2,
    height: 1.4,
  });

  return {
    id: 'f2_zone4_sw_forge_yard',
    group: cellGroup,
    triggerBounds: { minX: -36.0, maxX: -8.0, minZ: 1.0, maxZ: 34.0 },
    center: { x: -23.0, z: 19.0 },
    maxViewDistance: 66.0,
  };
}
