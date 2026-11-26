import * as THREE from 'three';
import { buildBatchedBoxesMesh, type BoxSpec, type HideoutMaterialRegistry } from '../../materials';
import {
  addLaneMarkerPlaque,
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
  buildShippingContainer,
  buildWallEquipmentBays,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import type { OcclusionCell } from '../../types';
import { buildExplosiveBarrel, buildJumpPad } from '../../mechanics';
import { F7_BASE_Y, F7_CEILINGS, F7_IDS, F7_META, F7_UPPER_Y, F7_WALLS } from './layout';

/**
 * Zone 5 — South-West Heavy Cargo Loading Bay (`x ∈ [-42, -16], z ∈ [+10, +32]`, ceil `9.6m`)
 * Industrial heavy-freight kill-box connecting Zone 3 Barracks (North) & Zone 7 Extraction (East):
 * - Two staggered corrugated shipping containers forming aggressive CQB sightline breakers
 * - Overhead **Cargo Gantry (`y = 88.4m`)** linking Zone 3 Upper Catwalk -> Zone 7 South Overlook
 * - Crisp straight gantry staircase + **Pneumatic Cargo Jump Pad (`f7_pad_cargo_gantry`)** for instant high-ground flanks!
 */
export function buildZone5SouthWestCargo(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F7_BASE_Y;
  const upperY = F7_UPPER_Y;
  const ceilH = F7_CEILINGS.cargoBay;
  const ceilY = baseY + ceilH;
  const accentMat = mats.floorAccent[7];

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F7_Z5_SouthWestCargoCell';
  collector.group.add(cellGroup);

  // 1. Seamless Ground Floor Slab (`x ∈ [-42, -16.04], z ∈ [+10.04, +32]`)
  addWalkableDeck(collector, {
    minX: F7_WALLS.westOuterX,
    maxX: F7_WALLS.rotundaWestX - 0.04,
    minZ: F7_WALLS.wingSplitZ + 0.04,
    maxZ: F7_WALLS.wingSouthZ,
    y: baseY,
    thickness: 0.5,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F7_Z5_Floor',
  });

  // 2. Ceiling Slab + Zero-Overlap Structural Ribs & Lights (`y = 93.6m`)
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 26.2, h: 0.42, d: 21.8, x: -29.0, y: ceilY + 0.21, z: 21.15 }],
    mats.darkConcrete,
    { receiveShadow: true, name: 'F7_Z5_Ceiling' }
  );
  if (ceilMesh) {
    cellGroup.add(ceilMesh);
    collector.wallMeshes.push(ceilMesh);
  }
  const ribSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const rz of [14.5, 21.0, 27.5]) {
    ribSpecs.push({ w: 25.0, h: 0.44, d: 0.48, x: -29.0, y: ceilY - 0.24, z: rz });
    lightSpecs.push(
      { w: 7.4, h: 0.08, d: 0.24, x: -34.2, y: ceilY - 0.54, z: rz },
      { w: 7.4, h: 0.08, d: 0.24, x: -23.6, y: ceilY - 0.54, z: rz }
    );
  }
  const ribMesh = buildBatchedBoxesMesh(ribSpecs, mats.structuralSteel, { name: 'F7_Z5_CeilingRibs' });
  if (ribMesh) cellGroup.add(ribMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F7_Z5_CeilingLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 3. Perimeter Walls (North split owned by Zone 3; East `z <= 17` owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.westOuterX,
    spanStart: F7_WALLS.wingSplitZ + 0.32,
    spanEnd: F7_WALLS.wingSouthZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z5_WestWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.wingSouthZ,
    spanStart: F7_WALLS.westOuterX,
    spanEnd: F7_WALLS.rotundaWestX,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z5_SouthWall',
  });
  // East Wall South of Rotunda (`x = -16.0, z ∈ [+17.32, +31.68]`, 9.8m clear of South Descent Shaft!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaWestX,
    spanStart: F7_WALLS.rotundaSouthZ + 0.32,
    spanEnd: F7_WALLS.wingSouthZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z5_EastSouthWall',
  });

  // 4. Staggered Corrugated Shipping Containers & Ballistic Cargo Cover
  buildShippingContainer(collector, mats, {
    x: -33.2,
    y: baseY,
    z: 25.4,
    w: 7.4,
    h: 2.85,
    d: 3.2,
    targetGroup: cellGroup,
    name: 'F7_Z5_ContainerSouth',
  });
  buildShippingContainer(collector, mats, {
    x: -20.8,
    y: baseY,
    z: 24.0,
    w: 3.2,
    h: 2.85,
    d: 7.0,
    targetGroup: cellGroup,
    name: 'F7_Z5_ContainerEast',
  });

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -30.5, y: baseY, z: 16.4, w: 3.0, h: 1.08, d: 0.82 },
      { x: -24.8, y: baseY, z: 28.4, w: 3.2, h: 1.08, d: 0.82 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z5_CargoCover' }
  );

  // Chain-detonating Pressurized Plasma Hazard Barrels tucked beside cargo containers!
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_cargo_1',
    x: -26.2,
    y: baseY,
    z: 23.2,
    targetGroup: cellGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_cargo_2',
    x: -28.0,
    y: baseY,
    z: 23.8,
    targetGroup: cellGroup,
  });

  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: 31.68, inwardDir: -1, centerAlong: -31.0, baseY, width: 5.6, height: 3.1 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z5_CargoRacks' }
  );

  // 5. Overhead Cargo Gantry (`y = 88.4m`) + Straight Stair + Pneumatic Jump Pad!
  // East Gantry Hub linking Zone 3 Upper Catwalk (`z = 10`) <-> Zone 7 South Overlook (`x = -16, z ∈ [11.4, 14.8]`)
  addWalkableDeck(collector, {
    minX: -22.6,
    maxX: -16.35,
    minZ: 10.05,
    maxZ: 16.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z5_EastGantryHub',
  });
  // West Gantry Arm running to the West Stair Landing (`x ∈ [-39.6, -22.62], z ∈ [11.6, 15.4]`)
  addWalkableDeck(collector, {
    minX: -39.6,
    maxX: -22.62,
    minZ: 11.6,
    maxZ: 15.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z5_WestGantryArm',
  });

  // Crisp Zero-Glitch Straight Staircase descending South along West side (`x = -38.0, z = 15.4 -> 24.6`)
  buildStraightStairFlight(collector, mats, {
    x: -38.0,
    z: 20.0,
    width: 3.0,
    length: 9.2,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });

  // Pneumatic Cargo Jump-Boost Pad launching straight up onto the West Gantry Arm!
  buildJumpPad(collector, mats, {
    id: F7_IDS.padCargoGantry,
    x: -26.8,
    y: baseY,
    z: 19.6,
    launchVy: 13.4,
    launchVx: 0,
    launchVz: -4.6,
    targetGroup: cellGroup,
  });

  // Guardrails along Cargo Gantry (leaving clean openings for Jump Pad at `x ∈ [-28.8, -24.8]` & Stair at `x ∈ [-39.6, -36.4]`)
  buildGuardrailRun(collector, mats, { x1: -39.52, z1: 11.68, x2: -22.65, z2: 11.68, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -36.35, z1: 15.32, x2: -28.8, z2: 15.32, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -24.8, z1: 15.32, x2: -22.65, z2: 15.32, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -22.52, z1: 16.12, x2: -16.4, z2: 16.12, y: upperY, accentMat, targetGroup: cellGroup });

  // Grounded structural columns under Cargo Gantry
  const colH = upperY - 0.44 - (baseY + 0.004);
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [-22.2, 15.8],
    [-32.5, 11.9],
    [-32.5, 15.1],
  ] as Array<[number, number]>) {
    colSpecs.push(
      { w: 0.5, h: colH, d: 0.5, x: cx, y: baseY + 0.004 + colH * 0.5, z: cz },
      { w: 0.72, h: 0.22, d: 0.72, x: cx, y: baseY + 0.004 + 0.11, z: cz }
    );
    collector.boxes.push({
      minX: cx - 0.3,
      maxX: cx + 0.3,
      minY: baseY,
      maxY: upperY - 0.42,
      minZ: cz - 0.3,
      maxZ: cz + 0.3,
      walkableTop: false,
    });
  }
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z5_GantryColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  addLaneMarkerPlaque(cellGroup, mats, {
    label: 'CARGO SECTOR 05',
    accentHex: F7_META.accentHex,
    x: -16.42,
    y: baseY + 4.1,
    z: 21.0,
    rotY: -Math.PI * 0.5,
    width: 3.4,
    height: 0.72,
  });

  return {
    id: 'floor7_zone5_sw_cargo',
    group: cellGroup,
    center: new THREE.Vector3(-29.0, baseY + 3.0, 21.0),
    maxViewDistance: 44,
    triggerBounds: { minX: -43.0, maxX: -12.0, minZ: 7.0, maxZ: 33.0 },
  };
}
