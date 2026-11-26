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
 * FLOOR 02 — ZONE 5 (FAR SW OCCLUSION CELL): THERMAL SLAG SILO & EXPRESS L0→L2 SUPER-LIFT #1
 * Footprint: x ∈ [-56.0, -34.0], z ∈ [+4.0, +34.0] (`22m × 30m`)
 *
 * - Monumental cylindrical Thermal Slag Reactor Silo (`center = (-45.0, +20.0)`) rising from L0 to
 *   the roof with Twin Counter-Rotating Industrial Exhaust Turbines (`animatedSpinners`)!
 * - EXPRESS `L0 → L2` PNEUMATIC SUPER-LIFT JUMP PAD #1 (`f2_pad_slagsilo_super_l0_l2`): Launches
 *   operatives `6.2m` vertically in one breathtaking arc from L0 (`14.0m`) directly onto the L2
 *   North Crown Deck (`20.2m`) with ZERO WASD input!
 * - Flush South-wall `L0 → L1` Stair + L1 & L2 Perimeter Galleries connecting Zone 3 & Zone 4!
 */
export function buildFloor2Zone5FarSouthWestSlagSilo(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const accentMat = mats.floorAccent[2];
  const moltenMat = mats.moltenGlow;

  const cx = -45.0;
  const cz = 19.8;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F2_CELL_Z5_SW_SLAG_SILO';
  collector.group.add(cellGroup);

  // 1. Full L0 Floor (`x ∈ [-56, -34], z ∈ [+4, +34]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_WEST_OUTER,
    maxX: F2_GRID.X_WEST_MID,
    minZ: F2_GRID.Z_CUSTOMS,
    maxZ: F2_GRID.Z_SOUTH_OUTER,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z5_L0_Floor',
  });

  // 2. Single-Owner Exterior Walls: West (`x = -56.0`) & South (`z = +34.0`)
  //    (East wall `x = -34.0` owned by Zone 4; North wall `z = +4.0` owned by Zone 3!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_WEST_OUTER,
    spanStart: F2_GRID.Z_CUSTOMS + 0.3,
    spanEnd: F2_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z5_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_SOUTH_OUTER,
    spanStart: F2_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F2_GRID.X_WEST_MID - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z5_SouthOuterWall',
  });

  // 3. LEVEL 1 (`17.1m`) WEST GALLERY + SOUTH BRIDGE + FLUSH SOUTH-WALL `L0 -> L1` STAIR!
  addWalkableDeck(collector, {
    minX: -55.69,
    maxX: -49.6,
    minZ: 4.31,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z5_L1_WestGallery',
  });
  addWalkableDeck(collector, {
    minX: -49.6,
    maxX: -34.31,
    minZ: 25.4,
    maxZ: 29.2,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z5_L1_SouthBridge',
  });

  // L1 Guardrails (OPEN at South-wall stair mouth `z ∈ [31.69, 33.69]` on `x = -49.6` & South Bridge join!)
  buildGuardrailRun(collector, mats, { x1: -49.6, z1: 4.35, x2: -49.6, z2: 25.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -49.6, z1: 29.2, x2: -49.6, z2: 31.69, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -49.6, z1: 25.4, x2: -34.35, z2: 25.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -49.6, z1: 29.2, x2: -34.35, z2: 29.2, y: y1, accentMat, targetGroup: cellGroup });

  // Flush South-Wall `L0 -> L1` Stair (`z = 32.69`, `maxZ = 33.69` flush with South wall, `x: -43.8 -> -49.6`)
  buildStraightStairFlight(collector, mats, {
    x: -46.7,
    z: 32.69,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = -49.6 -> 17.1m (West Gallery)
    yEnd: y0, // x = -43.8 -> 14.0m (L0 Floor)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  // 4. LEVEL 2 (`20.2m`) NORTH CROWN DECK (`x ∈ [-55.69, -34.31], z ∈ [+4.31, +12.6]`)
  //    Receives Express `L0 -> L2` Super-Lift Jump Pad #1 (`(-37.8, 14.0, +16.4)`) & links Zones 3 & 4!
  addWalkableDeck(collector, {
    minX: -55.69,
    maxX: -34.31,
    minZ: 4.31,
    maxZ: 12.6,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z5_L2_NorthCrownDeck',
  });
  // L2 Guardrails (OPEN at Super-Lift #1 landing slot `x ∈ [-39.8, -35.8]` on `z = +12.6`!)
  buildGuardrailRun(collector, mats, { x1: -55.65, z1: 12.6, x2: -39.8, z2: 12.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -35.8, z1: 12.6, x2: -34.35, z2: 12.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // 5. EXPRESS `L0 -> L2` PNEUMATIC SUPER-LIFT JUMP PAD #1 (`14.0m -> 20.2m`, soaring cleanly over `z = +12.6`!)
  buildJumpPad(collector, mats, {
    id: F2_IDS.padSlagSiloSuperL0ToL2,
    x: -37.8,
    y: y0,
    z: 16.4,
    launchVy: 15.2,
    launchVx: 0,
    launchVz: -3.7,
    targetGroup: cellGroup,
  });

  // 6. HERO MONUMENTAL THERMAL SLAG SILO STACK + TWIN COUNTER-ROTATING EXHAUST TURBINES!
  const siloH = ceilH - 0.16;
  const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.72, siloH, 18), mats.armoredSteel);
  siloBody.position.set(cx, y0 + siloH * 0.5 + 0.01, cz);
  siloBody.castShadow = true;
  siloBody.receiveShadow = true;
  siloBody.name = 'F2_Z5_SlagSiloCore';
  cellGroup.add(siloBody);
  collector.wallMeshes.push(siloBody);

  // Glowing molten telemetry bands wrapping the silo cylinder
  for (const bandY of [y0 + 1.8, y1 + 1.5, y2 + 1.6]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.68, 2.68, 0.34, 18), moltenMat);
    band.position.set(cx, bandY, cz);
    cellGroup.add(band);
  }
  collector.boxes.push({
    id: 'f2_z5_slag_silo',
    minX: cx - 2.75,
    maxX: cx + 2.75,
    minY: y0,
    maxY: y0 + ceilH,
    minZ: cz - 2.75,
    maxZ: cz + 2.75,
    walkableTop: false,
    tag: 'slag_silo',
  });

  // Twin counter-rotating turbine exhaust rings orbiting the silo
  for (const [idx, ty, speed, mat] of [
    [0, y1 + 0.6, 0.9, mats.amberAlloy],
    [1, y2 + 0.8, -1.1, accentMat],
  ] as const) {
    const rotor = new THREE.Group();
    rotor.name = `F2_Z5_SiloTurbine_${idx}`;
    rotor.position.set(cx, ty, cz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.11, 10, 32), mat);
    ring.rotation.x = Math.PI * 0.5;
    rotor.add(ring);
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.24), mats.structuralSteel);
      const a = (b / 6) * Math.PI * 2;
      blade.position.set(Math.cos(a) * 3.05, 0, Math.sin(a) * 3.05);
      blade.rotation.y = -a;
      rotor.add(blade);
    }
    cellGroup.add(rotor);
    collector.animatedSpinners?.push({ obj: rotor, speed });
  }

  // Grounded columns, ceiling lights & Watertight Roof Slab (`top = 25.40m`)
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const colH2 = y2 - 0.34 - (y0 + 0.006);
  for (const colX of [-49.8, -40.8]) {
    steelSpecs.push({ w: 0.62, h: colH2, d: 0.62, x: colX, y: y0 + 0.006 + colH2 * 0.5, z: 12.1 });
    collector.boxes.push({
      minX: colX - 0.34,
      maxX: colX + 0.34,
      minY: y0,
      maxY: y2,
      minZ: 11.76,
      maxZ: 12.44,
      walkableTop: false,
    });
  }
  for (const lz of [9.5, 19.5, 29.0]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.44, x: cx, y: y0 + ceilH - 0.06, z: lz });
  }

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 22.3, h: F2_ROOF_THICK, d: 30.3, x: cx - 0.15, y: F2_ROOF_CENTER_Y, z: 19.15 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z5_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const colMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z5_Columns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z5_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -41.5, y: y0, z: 26.5, w: 2.3, h: 0.98, d: 0.88, walkableTop: true },
      { x: -49.0, y: y2, z: 8.5, w: 0.88, h: 0.98, d: 2.3, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z5_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z5_l0', x: -38.8, y: y0, z: 23.2, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z5_l2', x: -44.2, y: y2, z: 8.4, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-SS',
    title: 'THERMAL SLAG SILO',
    subtitle: 'EXPRESS L0→L2 SUPER-LIFT · COUNTER-ROTATING TURBINES',
    accentHex: 0xf97316,
    x: cx,
    y: y2 + 2.4,
    z: F2_GRID.Z_SOUTH_OUTER - 0.36,
    rotY: Math.PI,
    width: 7.2,
    height: 1.4,
  });

  return {
    id: 'f2_zone5_sw_slag_silo',
    group: cellGroup,
    triggerBounds: { minX: -56.0, maxX: -30.0, minZ: 1.0, maxZ: 34.0 },
    center: { x: cx, z: 19.0 },
    maxViewDistance: 66.0,
  };
}
