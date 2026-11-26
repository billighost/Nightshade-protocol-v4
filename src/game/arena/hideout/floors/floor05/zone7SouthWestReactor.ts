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
  buildTacticalConsoleBenches,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import type { OcclusionCell } from '../../types';
import { buildExplosiveBarrel } from '../../mechanics';
import {
  F5_BASE_Y,
  F5_CEILINGS,
  F5_UPPER_Y,
  F5_WALLS,
} from './layout';

/**
 * FLOOR 05 — ZONE 7 (SOUTH-WEST OCCLUSION CELL): THERMAL CONDUIT & TURBINE REACTOR GALLERY
 * Footprint: x ∈ [-48.0, -18.0] (30m wide) × z ∈ [+10.0, +32.0] (22m deep), Ceiling: 10.6m
 *
 * Industrial Geothermal Power & Coolant Hall (Control NSC Power Plant / Halo Generator Bay):
 * - 3 Monumental Counter-Rotating Thermal Turbine Rotors (`animatedSpinners`) at `x = -36.5, -30.5, -24.5, z = +24.2`
 *   housed in armored cylindrical shrouds with molten plasma cores and overhead coolant manifolds!
 * - Flush West Wall Staircase (`x = -46.32, width = 2.70` -> `-47.67` flush to `-47.70` wall — ZERO gap!)
 * - Continuous Upper Turbine Overlook Gallery (`y = 60.4m`) linking Zone 3 `simToReactorUpperX`
 *   straight across the turbine gallery into Zone 9 / Coliseum `westSouthUpperZ`!
 * - Clerestory `0.4m` concrete header along `z = +10.0` sealing Zone 3's `10.2m` top cleanly up to `10.6m`!
 * - 4 Chain-Detonating Explosive Plasma Barrels flanking the turbine catwalk approaches!
 */
export function buildFloor5Zone7SouthWestReactor(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F5_BASE_Y; // 56.0m
  const upperY = F5_UPPER_Y; // 60.4m
  const ceilH = F5_CEILINGS.swReactor; // 10.6m
  const accentMat = mats.floorAccent[4]; // Molten thermal orange!
  const cellGroup = new THREE.Group();
  cellGroup.name = 'F5_ZONE7_SW_REACTOR';
  collector.group.add(cellGroup);

  // 1. Floor, Roof & Clerestory Seal (`z = +10.0`, sealing Zone 3's 10.2m wall top up to 10.6m -> ZERO cracks!)
  addWalkableDeck(collector, {
    minX: F5_WALLS.westOuterX,
    maxX: F5_WALLS.coliseumWestX,
    minZ: F5_WALLS.southSplitZ,
    maxZ: F5_WALLS.southWingsOuterZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F5_Z7_ReactorFloor',
  });
  const sealH = ceilH - F5_CEILINGS.westSimDeck + 0.04;
  const ceilMesh = buildBatchedBoxesMesh(
    [
      { w: 29.4, h: 0.5, d: 21.4, x: -33.0, y: baseY + ceilH + 0.25, z: 21.0 },
      // Clerestory concrete header bridging Zone 3's wall top cleanly up to Zone 7's roof!
      { w: 29.4, h: sealH, d: 0.6, x: -33.0, y: baseY + F5_CEILINGS.westSimDeck + sealH * 0.5 + 0.004, z: F5_WALLS.southSplitZ },
    ],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F5_Z7_ReactorCeilingAndSeal' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // 2. Exterior Perimeter Walls (West `x = -48`, South `z = +32`, East `x = -18` for `z ∈ [17.3, 31.7]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.westOuterX,
    spanStart: F5_WALLS.southSplitZ + 0.3,
    spanEnd: F5_WALLS.southWingsOuterZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z7_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.southWingsOuterZ,
    spanStart: F5_WALLS.westOuterX - 0.3,
    spanEnd: F5_WALLS.coliseumWestX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z7_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.coliseumWestX,
    spanStart: F5_WALLS.coliseumSouthZ + 0.3, // Cleanly butts Zone 9 South wall at +17.3!
    spanEnd: F5_WALLS.southWingsOuterZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z7_EastOuterWall',
  });

  // Overhead Heavy Industrial Ceiling Girders & High-Bay Lights
  const beamSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const bz of [15.5, 21.0, 26.5]) {
    beamSpecs.push({ w: 29.32, h: 0.46, d: 0.44, x: -33.0, y: baseY + ceilH - 0.24, z: bz });
    lightSpecs.push(
      { w: 9.6, h: 0.08, d: 0.34, x: -39.2, y: baseY + ceilH - 0.06, z: bz - 2.2 },
      { w: 9.6, h: 0.08, d: 0.34, x: -26.8, y: baseY + ceilH - 0.06, z: bz - 2.2 }
    );
  }
  const beamMesh = buildBatchedBoxesMesh(beamSpecs, mats.structuralSteel, { name: 'F5_Z7_RoofBeams' });
  if (beamMesh) cellGroup.add(beamMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F5_Z7_RoofLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 3. THREE MONUMENTAL COUNTER-ROTATING THERMAL TURBINE ROTORS (`x = -36.5, -30.5, -24.5, z = +24.2`)!
  const turbineXs = [-36.5, -30.5, -24.5] as const;
  const tz = 24.2;
  const plinthSpecs: BoxSpec[] = [];
  const shroudSpecs: BoxSpec[] = [];
  const pipeSpecs: BoxSpec[] = [];

  for (let i = 0; i < turbineXs.length; i++) {
    const tx = turbineXs[i];
    // Grounded armored plinth & overhead collector manifold housing
    plinthSpecs.push(
      { w: 3.6, h: 0.46, d: 3.6, x: tx, y: baseY + 0.234, z: tz },
      { w: 3.2, h: 0.56, d: 3.2, x: tx, y: baseY + 7.8, z: tz }
    );
    // 4 heavy vertical armored corner stanchions framing the spinning rotor core!
    for (const sx of [-1.42, 1.42]) {
      for (const sz of [-1.42, 1.42]) {
        shroudSpecs.push({ w: 0.36, h: 7.06, d: 0.36, x: tx + sx, y: baseY + 4.0, z: tz + sz });
      }
    }
    // Overhead vertical coolant exhaust stack rising cleanly into the ceiling (clear of overhead high-bay lights!)
    const stackH = ceilH - 8.22;
    pipeSpecs.push({ w: 1.45, h: stackH, d: 1.45, x: tx, y: baseY + 8.08 + stackH * 0.5, z: tz });

    // Glowing molten plasma containment core column inside the turbine frame
    const coreCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 6.9, 16), accentMat);
    coreCyl.position.set(tx, baseY + 4.0, tz);
    cellGroup.add(coreCyl);

    // Kinetic Multi-Blade Counter-Rotating Turbine Rotor (`animatedSpinners`) — 4 distinct radial hub-mounted blades!
    const rotorPivot = new THREE.Group();
    rotorPivot.name = `F5_Z7_ThermalTurbineRotor_${i + 1}`;
    rotorPivot.position.set(tx, baseY + 4.0, tz);

    const bladeRingSpecs: BoxSpec[] = [];
    for (const ry of [-2.0, 0.0, 2.0]) {
      for (let b = 0; b < 4; b++) {
        const ang = (b * Math.PI) * 0.5 + (ry === 0 ? Math.PI * 0.25 : 0);
        const radialOffset = 0.86;
        bladeRingSpecs.push({
          w: 0.72,
          h: 0.24,
          d: 0.14,
          x: Math.cos(ang) * radialOffset,
          y: ry,
          z: -Math.sin(ang) * radialOffset,
          rotY: ang,
        });
      }
    }
    const rotorMesh = buildBatchedBoxesMesh(bladeRingSpecs, mats.brushedMetal, {
      castShadow: true,
      name: `F5_Z7_RotorBlades_${i + 1}`,
    });
    if (rotorMesh) rotorPivot.add(rotorMesh);
    cellGroup.add(rotorPivot);
    collector.animatedSpinners?.push({ obj: rotorPivot, speed: i % 2 === 0 ? 2.15 : -2.45 });

    // Solid turbine housing collider
    collector.boxes.push({
      minX: tx - 1.85,
      maxX: tx + 1.85,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: tz - 1.85,
      maxZ: tz + 1.85,
      walkableTop: false,
    });
  }

  // Horizontal overhead thermal header conduit linking all 3 turbines cleanly
  pipeSpecs.push({ w: 16.5, h: 0.72, d: 0.72, x: -30.5, y: baseY + 8.6, z: tz });

  const plinthMesh = buildBatchedBoxesMesh(plinthSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z7_TurbinePlinths',
  });
  const shroudMesh = buildBatchedBoxesMesh(shroudSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z7_TurbineShrouds',
  });
  const pipeMesh = buildBatchedBoxesMesh(pipeSpecs, mats.brushedMetal, {
    castShadow: true,
    name: 'F5_Z7_CoolantPipes',
  });
  for (const m of [plinthMesh, shroudMesh, pipeMesh]) {
    if (m) {
      cellGroup.add(m);
      collector.wallMeshes.push(m);
    }
  }

  // 4. FLUSH WEST WALL STAIRCASE (`x = -46.32, width = 2.70 -> minX = -47.67` flush to `-47.70` wall — ZERO GAP!)
  // Climbs Northward from `z = +26.4` (baseY 56.0) -> `z = +17.6` (upperY 60.4, length = 8.8m)
  buildStraightStairFlight(collector, mats, {
    x: -46.32,
    z: 22.0,
    width: 2.7,
    length: 8.8,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: false, // Flush to West perimeter wall!
    railMaxSide: true,
    accentMat,
    targetGroup: cellGroup,
  });

  // 5. CONTINUOUS UPPER TURBINE OVERLOOK GALLERY (`y = 60.4m`)
  // West Spine Landing (`x ∈ [-47.68, -42.4], z ∈ [10.32, 17.6]` — joins stair top & Zone 3 `simToReactorUpperX`!)
  addWalkableDeck(collector, {
    minX: -47.68,
    maxX: -42.4,
    minZ: 10.32,
    maxZ: 17.6,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z7_WestSpineLanding',
  });
  // Main Turbine Overlook Gallery (`x ∈ [-42.4, -18.32], z ∈ [10.8, 15.6]` — connects straight to Coliseum `westSouthUpperZ`!)
  addWalkableDeck(collector, {
    minX: -42.4,
    maxX: -18.32,
    minZ: 10.8,
    maxZ: 15.6,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z7_TurbineOverlookDeck',
  });

  // Grounded structural columns under Overlook Gallery
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [-42.65, 17.35],
    [-36.0, 15.35],
    [-28.0, 15.35],
    [-20.4, 15.35],
  ] as const) {
    colSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: cz });
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
    name: 'F5_Z7_GalleryColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Upper Gallery Guardrails overlooking all 3 spinning Thermal Turbines!
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: 15.6, x2: -42.4, z2: 17.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -44.92, z1: 17.6, x2: -42.4, z2: 17.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: 15.6, x2: -18.32, z2: 15.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: 10.8, x2: -18.32, z2: 10.8, y: upperY, accentMat, targetGroup: cellGroup });

  // 6. Control Consoles, Cover & 4 Chain-Detonating Explosive Plasma Barrels!
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -30.5, y: upperY, z: 14.8, w: 4.4, h: 1.0, d: 0.72 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z7_TurbineMonitorDesk' }
  );

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -38.6, y: baseY, z: 18.8, w: 2.6, h: 1.0, d: 0.9, walkableTop: true },
      { x: -24.0, y: baseY, z: 18.8, w: 2.6, h: 1.0, d: 0.9, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: mats.hazardStripe, name: 'F5_Z7_ReactorCover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_sw_w1', x: -39.6, y: baseY, z: 24.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_sw_w2', x: -40.8, y: baseY, z: 25.6, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_sw_e1', x: -20.6, y: baseY, z: 24.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_sw_e2', x: -20.6, y: baseY, z: 26.2, targetGroup: cellGroup });

  // Clean Unobstructed Reactor Signage
  addWallStencilPlaque(cellGroup, mats, {
    code: 'THM-5',
    title: 'THERMAL CONDUIT TURBINE GALLERY',
    subtitle: 'TRIPLE COUNTER-ROTATING COOLANT REACTORS',
    accentHex: 0xf97316,
    x: -30.5,
    y: baseY + 7.8,
    z: 31.62,
    rotY: Math.PI,
    width: 6.6,
    height: 1.48,
  });

  return {
    id: 'f5_sw_reactor',
    group: cellGroup,
    triggerBounds: { minX: -48.5, maxX: -14.0, minZ: 6.5, maxZ: 32.5 },
    center: { x: -33.0, z: 21.0 },
    maxViewDistance: 46.0,
  };
}
