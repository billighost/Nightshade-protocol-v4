import * as THREE from 'three';
import { buildBatchedBoxesMesh, type BoxSpec, type HideoutMaterialRegistry } from '../../materials';
import {
  addLaneMarkerPlaque,
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
  buildRetractableBridge,
  buildWorldSwitch,
} from '../../mechanics';
import { F7_BASE_Y, F7_CEILINGS, F7_IDS, F7_META, F7_UPPER_Y, F7_WALLS } from './layout';

/**
 * Zone 6 — South-East Coolant Turbine Gallery (`x ∈ [+16, +42], z ∈ [+10, +32]`, ceil `9.6m`)
 * Monumental industrial energy hall connecting Zone 4 Server Atrium (North) & Zone 7 Extraction (West):
 * - 3 massive grounded **Coolant Turbine Columns** along `z = +23.8` with glowing cyan/amber reactor rings & solid colliders!
 * - Split-level elevated Turbine Overlooks (`y = 88.4m`) bridged by a **Retractable Hydraulic Shortcut Skybridge
 *   (`f7_bridge_turbine_catwalk`)**, deployed via an `[E]` Override Switch (`f7_switch_turbine_bridge`)!
 */
export function buildZone6SouthEastTurbines(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F7_BASE_Y;
  const upperY = F7_UPPER_Y;
  const ceilH = F7_CEILINGS.turbineGallery;
  const ceilY = baseY + ceilH;
  const accentMat = mats.floorAccent[7];

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F7_Z6_SouthEastTurbinesCell';
  collector.group.add(cellGroup);

  // 1. Seamless Ground Floor Slab (`x ∈ [+16.04, +42.0], z ∈ [+10.04, +32]`)
  addWalkableDeck(collector, {
    minX: F7_WALLS.rotundaEastX + 0.04,
    maxX: F7_WALLS.eastOuterX,
    minZ: F7_WALLS.wingSplitZ + 0.04,
    maxZ: F7_WALLS.wingSouthZ,
    y: baseY,
    thickness: 0.5,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F7_Z6_Floor',
  });

  // 2. Ceiling Slab + Zero-Overlap Structural Ribs & Lights (`y = 93.6m`)
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 26.2, h: 0.42, d: 22.2, x: 29.0, y: ceilY + 0.21, z: 21.0 }],
    mats.darkConcrete,
    { receiveShadow: true, name: 'F7_Z6_Ceiling' }
  );
  if (ceilMesh) {
    cellGroup.add(ceilMesh);
    collector.wallMeshes.push(ceilMesh);
  }
  const ribSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const rz of [14.5, 21.0, 27.5]) {
    ribSpecs.push({ w: 25.0, h: 0.44, d: 0.48, x: 29.0, y: ceilY - 0.24, z: rz });
    lightSpecs.push(
      { w: 7.4, h: 0.08, d: 0.24, x: 23.6, y: ceilY - 0.54, z: rz },
      { w: 7.4, h: 0.08, d: 0.24, x: 34.2, y: ceilY - 0.54, z: rz }
    );
  }
  const ribMesh = buildBatchedBoxesMesh(ribSpecs, mats.structuralSteel, { name: 'F7_Z6_CeilingRibs' });
  if (ribMesh) cellGroup.add(ribMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F7_Z6_CeilingLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 3. Perimeter Walls (North split owned by Zone 4; West `z <= 17` owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.eastOuterX,
    spanStart: F7_WALLS.wingSplitZ + 0.32,
    spanEnd: F7_WALLS.wingSouthZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z6_EastWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.wingSouthZ,
    spanStart: F7_WALLS.rotundaEastX,
    spanEnd: F7_WALLS.eastOuterX,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z6_SouthWall',
  });
  // West Wall South of Rotunda (`x = +16.0, z ∈ [+17.32, +31.68]`, 9.8m clear of South Descent Shaft!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaEastX,
    spanStart: F7_WALLS.rotundaSouthZ + 0.32,
    spanEnd: F7_WALLS.wingSouthZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z6_WestSouthWall',
  });

  // =========================================================================
  // 4. THREE MONUMENTAL GROUNDED COOLANT TURBINE COLUMNS (100% SOLID COLLIDERS!)
  // =========================================================================
  const turbinePlinthSpecs: BoxSpec[] = [];
  const turbineXs = [21.6, 28.4, 34.4];
  const turbZ = 24.4;
  const shaftH = ceilH - 1.3;

  for (const tx of turbineXs) {
    // Heavy grounded concrete-steel base plinth (`baseY + 0.004 .. baseY + 0.65`)
    turbinePlinthSpecs.push(
      { w: 3.1, h: 0.64, d: 3.1, x: tx, y: baseY + 0.004 + 0.32, z: turbZ },
      // Top ceiling collar strictly below ceiling slab (`ceilY - 0.66 .. ceilY - 0.02`)
      { w: 3.0, h: 0.62, d: 3.0, x: tx, y: ceilY - 0.33, z: turbZ }
    );
    // Main armored turbine pressure cylinder
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, shaftH, 20), mats.armoredSteel);
    cyl.position.set(tx, baseY + 0.66 + shaftH * 0.5, turbZ);
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    cellGroup.add(cyl);
    collector.wallMeshes.push(cyl);

    // 3 luminous coolant telemetry rings cleanly encircling the turbine cylinder
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.075, 8, 24), accentMat);
      ring.rotation.x = Math.PI * 0.5;
      ring.position.set(tx, baseY + 2.0 + r * 2.4, turbZ);
      cellGroup.add(ring);
    }

    // 4 vertical armored manifold flange struts hugging the turbine shell (`r = 1.24`, outer radius `1.33`)
    for (let s = 0; s < 4; s++) {
      const ang = (s * Math.PI) / 2 + Math.PI * 0.25;
      turbinePlinthSpecs.push({
        w: 0.18,
        h: shaftH - 0.12,
        d: 0.18,
        x: tx + Math.cos(ang) * 1.24,
        y: baseY + 0.66 + shaftH * 0.5,
        z: turbZ + Math.sin(ang) * 1.24,
      });
    }

    // Twin counter-rotating kinetic impeller rotor assemblies orbiting cleanly OUTSIDE the struts (`r = 1.56`, inner edge `1.41` -> ZERO clipping!)
    const rotorSpecs: Array<{ yOff: number; speed: number }> = [
      { yOff: 3.2, speed: 1.8 },
      { yOff: 5.6, speed: -1.35 },
    ];
    for (const rs of rotorSpecs) {
      const rotorGroup = new THREE.Group();
      rotorGroup.name = `F7_Z6_TurbineRotor_${tx}_${rs.yOff}`;
      rotorGroup.position.set(tx, baseY + rs.yOff, turbZ);
      const bladeSpecs: BoxSpec[] = [];
      for (let b = 0; b < 4; b++) {
        const a = (b * Math.PI) / 2;
        bladeSpecs.push({
          w: b % 2 === 0 ? 0.3 : 0.14,
          h: 0.3,
          d: b % 2 === 0 ? 0.14 : 0.3,
          x: Math.cos(a) * 1.56,
          y: 0,
          z: Math.sin(a) * 1.56,
        });
      }
      const bladesMesh = buildBatchedBoxesMesh(bladeSpecs, mats.brushedMetal, {
        name: `F7_Z6_RotorBlades_${tx}_${rs.yOff}`,
      });
      if (bladesMesh) rotorGroup.add(bladesMesh);
      const rotorHalo = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.04, 6, 28), accentMat);
      rotorHalo.rotation.x = Math.PI * 0.5;
      rotorGroup.add(rotorHalo);
      cellGroup.add(rotorGroup);
      collector.animatedSpinners?.push({ obj: rotorGroup, speed: rs.speed });
    }

    // 100% solid collider matching the turbine plinth so players NEVER clip into turbines!
    collector.boxes.push({
      minX: tx - 1.58,
      maxX: tx + 1.58,
      minY: baseY,
      maxY: ceilY,
      minZ: turbZ - 1.58,
      maxZ: turbZ + 1.58,
      walkableTop: false,
      tag: 'coolant_turbine',
    });
  }

  const plinthMesh = buildBatchedBoxesMesh(turbinePlinthSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z6_TurbinePlinths',
  });
  if (plinthMesh) {
    cellGroup.add(plinthMesh);
    collector.wallMeshes.push(plinthMesh);
  }

  // Tactical combat cover barricades around the Turbine Gallery (generously clear of catwalk columns!)
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 25.0, y: baseY, z: 17.8, w: 2.8, h: 1.08, d: 0.82 },
      { x: 31.6, y: baseY, z: 17.8, w: 2.8, h: 1.08, d: 0.82 },
      { x: 25.0, y: baseY, z: 29.4, w: 3.0, h: 1.08, d: 0.82 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z6_TurbineCover' }
  );

  // Chain-detonating Pressurized Plasma Hazard Barrels in the Turbine Gallery lane!
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_turbines_1',
    x: 24.6,
    y: baseY,
    z: 20.6,
    targetGroup: cellGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_turbines_2',
    x: 26.4,
    y: baseY,
    z: 21.0,
    targetGroup: cellGroup,
  });

  // =========================================================================
  // 5. SPLIT-LEVEL TURBINE CATWALKS + RETRACTABLE HYDRAULIC SHORTCUT SKYBRIDGE!
  // =========================================================================
  // West Turbine Overlook (`x ∈ [+16.35, +22.6], z ∈ [+10.05, +16.2]`) linking Zone 4 <-> Zone 7!
  addWalkableDeck(collector, {
    minX: 16.35,
    maxX: 22.6,
    minZ: 10.05,
    maxZ: 16.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z6_WestTurbineOverlook',
  });
  // East Turbine Balcony (`x ∈ [+33.0, +41.65], z ∈ [+10.35, +16.2]`) with stair down to floor!
  addWalkableDeck(collector, {
    minX: 33.0,
    maxX: 41.65,
    minZ: 10.35,
    maxZ: 16.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z6_EastTurbineBalcony',
  });

  // Crisp Zero-Glitch Straight Staircase sitting millimeter-flush against East wall (`x = +40.16, width = 3.0 -> maxX = 41.69 vs wall 41.70`)!
  buildStraightStairFlight(collector, mats, {
    x: 40.16,
    z: 20.8,
    width: 3.0,
    length: 9.2,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  // Retractable Hydraulic Shortcut Skybridge spanning the 10.3m gap between West & East Turbine Catwalks!
  buildRetractableBridge(collector, mats, {
    id: F7_IDS.bridgeTurbineCatwalk,
    label: 'TURBINE CATWALK SKYBRIDGE',
    anchorX: 22.66,
    y: upperY,
    anchorZ: 13.2,
    extendDirX: 1,
    extendDirZ: 0,
    length: 10.34,
    width: 2.8,
    targetGroup: cellGroup,
    accentMat,
  });

  // Override Switch on West Turbine Overlook (`[E]` extends the Turbine Catwalk Skybridge!)
  buildWorldSwitch(collector, mats, {
    id: F7_IDS.switchTurbineBridge,
    x: 21.4,
    y: upperY,
    z: 15.2,
    rotY: Math.PI,
    promptLocked: 'PRESS [E] TO EXTEND TURBINE SKYBRIDGE',
    promptActivated: 'TURBINE SKYBRIDGE DEPLOYED',
    bannerText: 'TURBINE CATWALK SKYBRIDGE EXTENDING',
    deployBridgeId: F7_IDS.bridgeTurbineCatwalk,
    targetGroup: cellGroup,
  });

  // Guardrails along Turbine Catwalks (leaving clean skybridge opening at `z ∈ [11.6, 14.8]` on both facing edges!)
  buildGuardrailRun(collector, mats, { x1: 16.4, z1: 16.12, x2: 22.52, z2: 16.12, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 22.52, z1: 10.2, x2: 22.52, z2: 11.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 22.52, z1: 14.8, x2: 22.52, z2: 16.12, y: upperY, accentMat, targetGroup: cellGroup });

  buildGuardrailRun(collector, mats, { x1: 33.08, z1: 10.45, x2: 33.08, z2: 11.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 33.08, z1: 14.8, x2: 33.08, z2: 16.12, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 33.08, z1: 16.12, x2: 38.54, z2: 16.12, y: upperY, accentMat, targetGroup: cellGroup });

  // Grounded structural support columns under West & East Turbine Overlooks
  const colH = upperY - 0.44 - (baseY + 0.004);
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [22.2, 15.8],
    [33.4, 15.8],
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
    name: 'F7_Z6_CatwalkColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  addLaneMarkerPlaque(cellGroup, mats, {
    label: 'TURBINE SECTOR 06',
    accentHex: F7_META.accentHex,
    x: 16.42,
    y: baseY + 4.1,
    z: 21.0,
    rotY: Math.PI * 0.5,
    width: 3.4,
    height: 0.72,
  });

  return {
    id: 'floor7_zone6_se_turbines',
    group: cellGroup,
    center: new THREE.Vector3(29.0, baseY + 3.0, 21.0),
    maxViewDistance: 44,
    triggerBounds: { minX: 12.0, maxX: 43.0, minZ: 7.0, maxZ: 33.0 },
  };
}
