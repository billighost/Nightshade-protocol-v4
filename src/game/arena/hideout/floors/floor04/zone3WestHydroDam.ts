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
import { buildExplosiveBarrel, buildJumpPad } from '../../mechanics';
import {
  F4_BASE_Y,
  F4_CEILINGS,
  F4_IDS,
  F4_PORTALS,
  F4_UPPER_Y,
  F4_WALLS,
} from './layout';

/**
 * FLOOR 04 — ZONE 3 (WEST OCCLUSION CELL): HYDRO-ELECTRIC DAM TURBINE HALL
 * Footprint: x ∈ [-48.0, -18.0] (30m) × z ∈ [-10.0, +10.0] (20m), 10.4m tall!
 *
 * Signature CoD Dam × Halo Forerunner Hydro Architecture:
 * - 3 Colossal Kinetic Rotating Hydro-Turbine Generators aligned down the South spillway bay!
 * - Zero-Z-fighting recessed cyan Hydro-Spillway Floor Conduit running East-West!
 * - Full `+4.4m` Upper Catwalk Network (`y = 46.4m`) linking Zone 2 Canyon (`westMidUpperZ`),
 *   Zone 5 NW Substation (`hydroToSubstationUpperX`) & Zone 7 SW Geothermal (`hydroToGeoUpperX`)!
 * - Flush North-Wall Staircase (`z = -8.42`, `minZ = -9.67` flush against `-9.70` -> ZERO wall gap!)
 * - Calibrated Pneumatic Jump Pad (`f4_pad_hydro_west`) launching cleanly onto the Transverse Dam Bridge!
 * - Shared North (`z = -10.0`) & South (`z = +10.0`) partition walls featuring:
 *   - Jammed Roll-Under Blast Shutter (`f4_jammed_hydro_nw`) into NW Substation (`[V]` Dodge Roll!)
 *   - Motorized Auto Doors into NW Substation & SW Geothermal!
 */
export function buildFloor4Zone3WestHydroDam(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.westHydroDam; // 10.4m
  const hydroMat = mats.floorAccent[6]; // Crisp hydro-coolant cyan!
  const amberMat = mats.floorAccent[4]; // Volcanic amber warning trim

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F4_Z3_WEST_HYDRO_DAM';
  collector.group.add(cellGroup);

  // 1. Floor & Coffered Ceiling Slabs (`x ∈ [-48.0, -18.0], z ∈ [-10.0, +10.0]`)
  addWalkableDeck(collector, {
    minX: F4_WALLS.westOuterX,
    maxX: F4_WALLS.canyonWestX,
    minZ: F4_WALLS.northSplitZ,
    maxZ: F4_WALLS.southSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F4_Z3_HydroFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 19.4, x: -33.0, y: baseY + ceilH + 0.25, z: 0.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F4_Z3_HydroCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // Overhead Dam Vault Trusses & High-Bay Cool-White Lights
  const trussSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const tx of [-42.5, -35.5, -28.5, -21.5]) {
    trussSpecs.push({ w: 0.44, h: 0.48, d: 19.3, x: tx, y: baseY + ceilH - 0.26, z: 0.0 });
    lightSpecs.push(
      { w: 0.34, h: 0.08, d: 6.2, x: tx + 3.2, y: baseY + ceilH - 0.06, z: -4.2 },
      { w: 0.34, h: 0.08, d: 6.2, x: tx + 3.2, y: baseY + ceilH - 0.06, z: 4.2 }
    );
  }
  const trussMesh = buildBatchedBoxesMesh(trussSpecs, mats.structuralSteel, { name: 'F4_Z3_RoofTrusses' });
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F4_Z3_RoofLights' });
  if (trussMesh) cellGroup.add(trussMesh);
  if (lightMesh) cellGroup.add(lightMesh);

  // 2. Perimeter & Shared Partition Walls
  // West Outer Dam Face (`x = -48.0`, solid reinforced dam retaining wall!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.westOuterX,
    spanStart: F4_WALLS.northSplitZ + 0.3,
    spanEnd: F4_WALLS.southSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    name: 'F4_Z3_WestOuterWall',
  });

  // Shared North Partition Wall (`z = -10.0`, Zone 3 <-> Zone 5 NW Substation)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.northSplitZ,
    spanStart: F4_WALLS.westOuterX + 0.3,
    spanEnd: F4_WALLS.canyonWestX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    portals: [
      {
        start: F4_PORTALS.hydroToSubstationUpperX[0],
        end: F4_PORTALS.hydroToSubstationUpperX[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.hydroToSubstationJammedX[0],
        end: F4_PORTALS.hydroToSubstationJammedX[1],
        bottomY: baseY,
        topY: baseY + 3.8,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.hydroToSubstationAutoX[0],
        end: F4_PORTALS.hydroToSubstationAutoX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F4_Z3_NorthPartitionWall',
  });

  // Shared South Partition Wall (`z = +10.0`, Zone 3 <-> Zone 7 SW Geothermal)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.southSplitZ,
    spanStart: F4_WALLS.westOuterX + 0.3,
    spanEnd: F4_WALLS.canyonWestX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    portals: [
      {
        start: F4_PORTALS.hydroToGeoUpperX[0],
        end: F4_PORTALS.hydroToGeoUpperX[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.hydroToGeoAutoX[0],
        end: F4_PORTALS.hydroToGeoAutoX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F4_PORTALS.hydroToGeoOpenX[0],
        end: F4_PORTALS.hydroToGeoOpenX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F4_Z3_SouthPartitionWall',
  });

  // Jammed Roll-Under Blast Shutter #1 (`f4_jammed_hydro_nw`, z = -10.0) + 2 Motorized Auto Doors!
  buildTacticalDoor(collector, mats, {
    id: F4_IDS.jammedHydroNw,
    mode: 'jammed_roll',
    x: (F4_PORTALS.hydroToSubstationJammedX[0] + F4_PORTALS.hydroToSubstationJammedX[1]) * 0.5,
    y: baseY,
    z: F4_WALLS.northSplitZ,
    width: F4_PORTALS.hydroToSubstationJammedX[1] - F4_PORTALS.hydroToSubstationJammedX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f4_auto_hydro_substation',
    mode: 'automatic',
    x: (F4_PORTALS.hydroToSubstationAutoX[0] + F4_PORTALS.hydroToSubstationAutoX[1]) * 0.5,
    y: baseY,
    z: F4_WALLS.northSplitZ,
    width: F4_PORTALS.hydroToSubstationAutoX[1] - F4_PORTALS.hydroToSubstationAutoX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f4_auto_hydro_geo',
    mode: 'automatic',
    x: (F4_PORTALS.hydroToGeoAutoX[0] + F4_PORTALS.hydroToGeoAutoX[1]) * 0.5,
    y: baseY,
    z: F4_WALLS.southSplitZ,
    width: F4_PORTALS.hydroToGeoAutoX[1] - F4_PORTALS.hydroToGeoAutoX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });

  // 3. HERO LANDMARK: 3 COLOSSAL KINETIC HYDRO-TURBINE GENERATORS + GLOWING CYAN SPILLWAY CONDUIT!
  // Zero-Z-fighting floor coolant channel (`y = baseY + 0.018` glass over `baseY + 0.008` glow borders)
  const spillwayGlow = buildBatchedBoxesMesh(
    [
      { w: 22.8, h: 0.014, d: 0.14, x: -31.0, y: baseY + 0.014, z: 3.3 },
      { w: 22.8, h: 0.014, d: 0.14, x: -31.0, y: baseY + 0.014, z: 6.7 },
    ],
    hydroMat,
    { name: 'F4_Z3_SpillwayRails' }
  );
  const spillwayGlass = buildBatchedBoxesMesh(
    [{ w: 22.4, h: 0.022, d: 3.1, x: -31.0, y: baseY + 0.026, z: 5.0 }],
    mats.floorGlass,
    { name: 'F4_Z3_SpillwayGlass' }
  );
  if (spillwayGlow) cellGroup.add(spillwayGlow);
  if (spillwayGlass) cellGroup.add(spillwayGlass);

  // 3 Grounded Multi-Part Hydro-Turbine Generator Assemblies (`x = -38.0, -31.0, -24.0, z = +5.0`)
  const housingSpecs: BoxSpec[] = [];
  const pipeSpecs: BoxSpec[] = [];
  for (let i = 0; i < 3; i++) {
    const tx = -38.0 + i * 7.0;
    const tz = 5.0;
    // Heavy grounded concrete-steel generator plinth + twin stator yoke cradles (zero overlap!)
    housingSpecs.push(
      { w: 3.2, h: 0.42, d: 3.0, x: tx, y: baseY + 0.214, z: tz },
      { w: 0.48, h: 3.1, d: 2.6, x: tx - 1.32, y: baseY + 1.98, z: tz },
      { w: 0.48, h: 3.1, d: 2.6, x: tx + 1.32, y: baseY + 1.98, z: tz },
      { w: 3.24, h: 0.36, d: 1.4, x: tx, y: baseY + 3.72, z: tz }
    );
    // Vertical penstock pressure intake pipes connecting top header straight to ceiling!
    const pipeH = ceilH - 3.92;
    pipeSpecs.push(
      { w: 0.56, h: pipeH, d: 0.56, x: tx - 0.72, y: baseY + 3.9 + pipeH * 0.5, z: tz },
      { w: 0.56, h: pipeH, d: 0.56, x: tx + 0.72, y: baseY + 3.9 + pipeH * 0.5, z: tz }
    );
    collector.boxes.push({
      minX: tx - 1.65,
      maxX: tx + 1.65,
      minY: baseY,
      maxY: baseY + 3.95,
      minZ: tz - 1.55,
      maxZ: tz + 1.55,
      walkableTop: false,
    });

    // Kinetic Rotating Horizontal-Axis Hydro-Turbine Rotor Core (rotated parent pivot spins cleanly on local Y -> world X!)
    const rotorPivot = new THREE.Group();
    rotorPivot.name = `F4_Z3_HydroTurbinePivot_${i}`;
    rotorPivot.position.set(tx, baseY + 2.05, tz);
    rotorPivot.rotation.z = Math.PI * 0.5;
    const rotorGroup = new THREE.Group();
    rotorGroup.name = `F4_Z3_HydroTurbineRotor_${i}`;
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.02, 1.96, 20),
      mats.brushedMetal
    );
    const glowBandL = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.055, 8, 24), hydroMat);
    glowBandL.rotation.x = Math.PI * 0.5;
    glowBandL.position.y = -0.58;
    const glowBandR = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.055, 8, 24), hydroMat);
    glowBandR.rotation.x = Math.PI * 0.5;
    glowBandR.position.y = 0.58;
    const finSpecs: BoxSpec[] = [
      { w: 2.38, h: 1.82, d: 0.14, x: 0, y: 0, z: 0 },
      { w: 0.14, h: 1.82, d: 2.38, x: 0, y: 0, z: 0 },
    ];
    const fins = buildBatchedBoxesMesh(finSpecs, mats.structuralSteel, { name: `F4_Z3_TurbineFins_${i}` });
    rotorGroup.add(drum, glowBandL, glowBandR);
    if (fins) rotorGroup.add(fins);
    rotorPivot.add(rotorGroup);
    cellGroup.add(rotorPivot);
    collector.animatedSpinners?.push({ obj: rotorGroup, speed: i % 2 === 0 ? 1.5 : -1.5 });
  }

  const housingMesh = buildBatchedBoxesMesh(housingSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z3_TurbineHousings',
  });
  const pipeMesh = buildBatchedBoxesMesh(pipeSpecs, mats.structuralSteel, {
    castShadow: true,
    name: 'F4_Z3_PenstockPipes',
  });
  if (housingMesh) {
    cellGroup.add(housingMesh);
    collector.wallMeshes.push(housingMesh);
  }
  if (pipeMesh) {
    cellGroup.add(pipeMesh);
    collector.wallMeshes.push(pipeMesh);
  }

  // 4. ELEVATED `+4.4m` HYDRO DAM CATWALK NETWORK (`y = 46.4m`) + FLUSH NORTH-WALL STAIRCASE!
  // (A) Continuous West Spine Catwalk (`x ∈ [-47.68, -42.4], z ∈ [-9.68, +9.68]`) linking NW & SW Upper Portals!
  addWalkableDeck(collector, {
    minX: -47.68,
    maxX: -42.4,
    minZ: -9.68,
    maxZ: 9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z3_WestSpineCatwalk',
  });
  // (B) Transverse Dam Overlook Bridge (`x ∈ [-42.4, -18.32], z ∈ [-6.4, -2.0]`) straight into Zone 2 `westMidUpperZ`!
  // Visually inset 6mm from `x = -42.4` -> ZERO Z-fighting!
  const damBridgeMesh = buildBatchedBoxesMesh(
    [
      { w: 24.074, h: 0.42, d: 4.4, x: -30.357, y: upperY - 0.21, z: -4.2 },
      // North Stair Top Landing Deck (`x ∈ [-42.4, -34.0], z ∈ [-9.68, -6.4]`, inset 6mm at X & Z seams!)
      { w: 8.394, h: 0.42, d: 3.274, x: -38.197, y: upperY - 0.21, z: -8.043 },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z3_DamOverlookAndLanding' }
  );
  if (damBridgeMesh) {
    cellGroup.add(damBridgeMesh);
    collector.wallMeshes.push(damBridgeMesh);
  }
  collector.slabs.push(
    { minX: -42.4, maxX: -18.32, minZ: -6.4, maxZ: -2.0, y: upperY, thickness: 0.42 },
    { minX: -42.4, maxX: -34.0, minZ: -9.68, maxZ: -6.4, y: upperY, thickness: 0.42 }
  );

  // Upper Portal Threshold Bridges through North (`z = -10.0`) & South (`z = +10.0`) Partition Walls!
  addWalkableDeck(collector, {
    minX: F4_PORTALS.hydroToSubstationUpperX[0] + 0.18,
    maxX: F4_PORTALS.hydroToSubstationUpperX[1] - 0.18,
    minZ: -10.32,
    maxZ: -9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F4_Z3_NorthUpperThresh',
  });
  addWalkableDeck(collector, {
    minX: F4_PORTALS.hydroToGeoUpperX[0] + 0.18,
    maxX: F4_PORTALS.hydroToGeoUpperX[1] - 0.18,
    minZ: 9.68,
    maxZ: 10.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F4_Z3_SouthUpperThresh',
  });

  // Flush North-Wall Staircase (`z = -8.42`, `width = 2.50` -> `minZ = -9.67` flush against `-9.70`!)
  // Ascends East->West from `x = -25.8` (`baseY`) up to `x = -34.0` (`upperY`) — ZERO wall gap, ZERO portal conflict!
  buildStraightStairFlight(collector, mats, {
    x: -29.9,
    z: -8.42,
    width: 2.5,
    length: 8.2,
    yStart: upperY,
    yEnd: baseY,
    axis: 'x',
    steps: 20,
    railMinSide: false,
    railMaxSide: true,
    accentMat: hydroMat,
    targetGroup: cellGroup,
  });

  // Grounded Support Columns under Upper Catwalks (cleanly clear of all doors & jump pad!)
  const colSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const [cx, cz] of [
    [-42.7, -5.8],
    [-42.7, 2.2],
    [-42.7, 9.2],
    [-34.2, -2.3],
    [-25.6, -2.3],
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
    name: 'F4_Z3_CatwalkCols',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Guardrails with clean opening `x ∈ [-31.6, -28.4]` on `z = -2.0` for `f4_pad_hydro_west`!
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -2.0, x2: -42.4, z2: 9.68, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -2.0, x2: -31.6, z2: -2.0, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -28.4, z1: -2.0, x2: -18.32, z2: -2.0, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -34.0, z1: -6.4, x2: -18.32, z2: -6.4, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });

  // 5. Calibrated Pneumatic Jump Pad (`f4_pad_hydro_west`) launching North onto Transverse Dam Overlook Bridge!
  buildJumpPad(collector, mats, {
    id: F4_IDS.padHydroWest,
    x: -30.0,
    y: baseY,
    z: -0.2,
    launchVy: 13.4,
    launchVx: 0,
    launchVz: -3.2, // lands squarely at z ≈ -3.88 inside [-6.4, -2.0] through the [-31.6, -28.4] rail gap!
    targetGroup: cellGroup,
  });

  // 6. Ballistic Cover + 2 Explosive Plasma Barrels + Wayfinding Signage
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -35.8, y: baseY, z: 0.4, w: 2.6, h: 0.96, d: 0.9, walkableTop: true },
      { x: -24.0, y: baseY, z: 0.4, w: 2.6, h: 0.96, d: 0.9, walkableTop: true },
      { x: -38.8, y: upperY, z: -4.2, w: 1.0, h: 0.92, d: 2.0, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: amberMat, name: 'F4_Z3_HydroCover' }
  );
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_hydro_w', x: -40.8, y: baseY, z: 2.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_hydro_e', x: -21.8, y: baseY, z: 2.2, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '04-Z3',
    title: 'HYDRO-ELECTRIC DAM',
    subtitle: 'SPILLWAY TURBINES · ROLL-UNDER SHUTTER TO NW SUBSTATION',
    accentHex: 0x06b6d4,
    x: -47.62,
    y: baseY + 8.4,
    z: 0.0,
    rotY: Math.PI * 0.5,
    width: 6.4,
    height: 1.48,
  });

  return {
    id: 'f4_zone3_west_hydro_dam',
    group: cellGroup,
    triggerBounds: { minX: -49.5, maxX: 6.0, minZ: -32.5, maxZ: 32.5 },
    center: { x: -33.0, z: 0.0 },
    maxViewDistance: 46.0,
  };
}
