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
 * FLOOR 02 — ZONE 11 (NE OCCLUSION CELL): NEON-AMBER CYBER-CARGO BAZAAR & CONTAINER STACK
 * Footprint: x ∈ [+12.0, +56.0], z ∈ [-34.0, -9.0] (`44m × 25m`)
 *
 * - Atmospheric underground cyber-industrial black-market cargo district lined with staggered
 *   corrugated shipping containers (`walkableTop: true`), glowing amber/cyan dispatch kiosks, and a
 *   spinning Overhead Container Crane Beacon (`animatedSpinners`)!
 * - Two-Stage Container Ascent (`L0 → L1` North Stair + `L1 → L2` North Stair) PLUS Calibrated
 *   `L1 → L2` Bazaar Pneumatic Jump Pad (`f2_pad_bazaar_l1_l2`) onto the East Bazaar Crown!
 * - Connects Zone 9 (East Locomotive Bay) <-> Zone 11 <-> Zone 12 (North Extraction) across all 3 tiers!
 */
export function buildFloor2Zone11NorthEastCyberBazaar(
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
  cellGroup.name = 'F2_CELL_Z11_NE_CYBER_BAZAAR';
  collector.group.add(cellGroup);

  // 1. Full L0 Bazaar Floor (`x ∈ [+12, +56], z ∈ [-34, -9]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_CORE_EAST,
    maxX: F2_GRID.X_EAST_OUTER,
    minZ: F2_GRID.Z_NORTH_OUTER,
    maxZ: F2_GRID.Z_CONCOURSE_NORTH,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z11_L0_Floor',
  });

  // 2. Single-Owner Exterior Walls: North (`z = -34.0`), East (`x = +56.0`), West Descent-Shaft Wall (`x = +12.0, z ∈ [-34, -17]`)
  //    (South `z = -9.0` owned by Zone 9; West `z ∈ [-17, -9]` owned by Zone 12!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_NORTH_OUTER,
    spanStart: F2_GRID.X_CORE_EAST - 0.3,
    spanEnd: F2_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z11_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_EAST_OUTER,
    spanStart: F2_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F2_GRID.Z_CONCOURSE_NORTH - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z11_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_CORE_EAST,
    spanStart: F2_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F2_GRID.Z_EXIT - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z11_WestShaftWall',
  });

  // 3. LEVEL 1 (`17.1m`) BAZAAR MEZZANINE (South Gallery + East Mezzanine + North Landing!)
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 38.0,
    minZ: -15.2,
    maxZ: -9.31,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z11_L1_SouthGallery',
  });
  addWalkableDeck(collector, {
    minX: 38.0,
    maxX: 55.69,
    minZ: -33.69,
    maxZ: -9.31,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z11_L1_EastMezzanine',
  });
  addWalkableDeck(collector, {
    minX: 31.8,
    maxX: 38.0,
    minZ: -33.69,
    maxZ: -27.8,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z11_L1_NorthLanding',
  });

  // L1 Guardrails (OPEN at Stage 1 Stair mouth `z ∈ [-33.65, -31.65]` on `x = +31.8`!)
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: -15.2, x2: 38.0, z2: -15.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 38.0, z1: -27.8, x2: 38.0, z2: -15.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 31.8, z1: -27.8, x2: 38.0, z2: -27.8, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 31.8, z1: -31.65, x2: 31.8, z2: -27.8, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`20.2m`) EAST BAZAAR CROWN + SOUTH SKYWAY!
  addWalkableDeck(collector, {
    minX: 45.8,
    maxX: 55.69,
    minZ: -33.69,
    maxZ: -9.31,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z11_L2_EastBazaarCrown',
  });
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 45.8,
    minZ: -15.2,
    maxZ: -10.8,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z11_L2_SouthSkyway',
  });

  // L2 Guardrails (OPEN at Stage 2 Stair mouth `z ∈ [-33.65, -31.65]` AND Bazaar Jump Pad slot `z ∈ [-24.3, -20.7]` on `x = +45.8`!)
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: -15.2, x2: 45.8, z2: -15.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: -10.8, x2: 45.8, z2: -10.8, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 45.8, z1: -20.7, x2: 45.8, z2: -15.2, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 45.8, z1: -31.65, x2: 45.8, z2: -24.3, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // 5. TWO-STAGE CONTAINER ASCENT (`L0 -> L1` & `L1 -> L2` flush against North Wall `z = -33.7`!)
  //    PLUS Calibrated `L1 -> L2` Bazaar Jump Pad #3 (`f2_pad_bazaar_l1_l2`)!
  buildStraightStairFlight(collector, mats, {
    x: 28.9,
    z: -32.7,
    width: 2.0,
    length: 5.8,
    yStart: y0, // x = +26.0 -> 14.0m
    yEnd: y1, // x = +31.8 -> 17.1m (North L1 Landing)
    axis: 'x',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });
  buildStraightStairFlight(collector, mats, {
    x: 42.9,
    z: -32.7,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = +40.0 -> 17.1m (East L1 Mezzanine)
    yEnd: y2, // x = +45.8 -> 20.2m (East L2 Bazaar Crown!)
    axis: 'x',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: moltenMat,
  });

  // Calibrated `L1 -> L2` Bazaar Jump Pad #3 (`(+42.8, 17.1, -22.5)` -> arcs East onto East L2 Bazaar Crown!)
  buildJumpPad(collector, mats, {
    id: F2_IDS.padBazaarL1ToL2,
    x: 42.8,
    y: y1,
    z: -22.5,
    launchVy: 11.8,
    launchVx: 3.3,
    launchVz: 0,
    targetGroup: cellGroup,
  });

  // 6. CYBER-BAZAAR SHIPPING CONTAINERS (`walkableTop: true`), MARKET STALLS & SPINNING DISPATCH BEACON!
  const containerSpecs: BoxSpec[] = [
    { w: 5.8, h: 2.4, d: 2.6, x: 20.5, y: y0 + 1.21, z: -20.5 },
    { w: 2.6, h: 2.4, d: 5.6, x: 32.0, y: y0 + 1.21, z: -21.2 },
    { w: 5.2, h: 2.35, d: 2.5, x: 18.5, y: y0 + 1.18, z: -28.6 },
  ];
  const containerColliders = [
    { id: 'f2_z11_cont_1', minX: 17.6, maxX: 23.4, minY: y0, maxY: y0 + 2.42, minZ: -21.8, maxZ: -19.2, walkableTop: true, tag: 'cargo_container' },
    { id: 'f2_z11_cont_2', minX: 30.7, maxX: 33.3, minY: y0, maxY: y0 + 2.42, minZ: -24.0, maxZ: -18.4, walkableTop: true, tag: 'cargo_container' },
    { id: 'f2_z11_cont_3', minX: 15.9, maxX: 21.1, minY: y0, maxY: y0 + 2.36, minZ: -29.85, maxZ: -27.35, walkableTop: true, tag: 'cargo_container' },
  ];
  collector.boxes.push(...containerColliders);

  const containerMesh = buildBatchedBoxesMesh(containerSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z11_ShippingContainers',
  });
  if (containerMesh) {
    cellGroup.add(containerMesh);
    collector.wallMeshes.push(containerMesh);
  }

  // Corrugated copper-alloy container corner stanchions, structural ribs & glowing cyan/amber bazaar stall counters!
  const alloyRibSpecs: BoxSpec[] = [];
  const cyanStallSpecs: BoxSpec[] = [];
  for (const c of containerSpecs) {
    const hw = c.w * 0.5;
    const hd = c.d * 0.5;
    // Heavy corner steel-alloy bumpers
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        alloyRibSpecs.push({
          w: 0.22,
          h: c.h + 0.04,
          d: 0.22,
          x: c.x + sx * (hw - 0.06),
          y: c.y,
          z: c.z + sz * (hd - 0.06),
        });
      }
    }
    // Vertical corrugated side ribs along the container's long faces
    if (c.w >= c.d) {
      for (const frac of [-0.32, -0.11, 0.11, 0.32]) {
        alloyRibSpecs.push(
          { w: 0.14, h: c.h - 0.28, d: 0.08, x: c.x + c.w * frac, y: c.y, z: c.z + hd + 0.03 },
          { w: 0.14, h: c.h - 0.28, d: 0.08, x: c.x + c.w * frac, y: c.y, z: c.z - hd - 0.03 }
        );
      }
      cyanStallSpecs.push({ w: c.w * 0.62, h: 0.16, d: 0.08, x: c.x, y: y0 + 1.15, z: c.z + hd + 0.05 });
    } else {
      for (const frac of [-0.32, -0.11, 0.11, 0.32]) {
        alloyRibSpecs.push(
          { w: 0.08, h: c.h - 0.28, d: 0.14, x: c.x + hw + 0.03, y: c.y, z: c.z + c.d * frac },
          { w: 0.08, h: c.h - 0.28, d: 0.14, x: c.x - hw - 0.03, y: c.y, z: c.z + c.d * frac }
        );
      }
      cyanStallSpecs.push({ w: 0.08, h: 0.16, d: c.d * 0.62, x: c.x - hw - 0.05, y: y0 + 1.15, z: c.z });
    }
  }
  const ribMesh = buildBatchedBoxesMesh(alloyRibSpecs, mats.amberAlloy, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z11_ContainerAlloyRibs',
  });
  if (ribMesh) cellGroup.add(ribMesh);
  const cyanStallMesh = buildBatchedBoxesMesh(cyanStallSpecs, mats.floorAccent[3], { name: 'F2_Z11_BazaarCyanDisplays' });
  if (cyanStallMesh) cellGroup.add(cyanStallMesh);

  // Luminous neon-amber bazaar awning strips along containers
  const neonSpecs: BoxSpec[] = [
    { w: 5.6, h: 0.14, d: 0.1, x: 20.5, y: y0 + 2.28, z: -19.16 },
    { w: 0.1, h: 0.14, d: 5.4, x: 30.66, y: y0 + 2.28, z: -21.2 },
    { w: 5.0, h: 0.14, d: 0.1, x: 18.5, y: y0 + 2.24, z: -27.31 },
  ];
  const neonMesh = buildBatchedBoxesMesh(neonSpecs, accentMat, { name: 'F2_Z11_BazaarNeonTrim' });
  if (neonMesh) cellGroup.add(neonMesh);

  // Overhead Spinning Cyber-Bazaar Dispatch Beacon Halo (`(+26.5, y1 + 3.2, -23.0)`)
  const beaconGroup = new THREE.Group();
  beaconGroup.name = 'F2_Z11_BazaarBeaconHalo';
  beaconGroup.position.set(26.5, y1 + 3.4, -23.0);
  const bRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.1, 10, 32), accentMat);
  bRing.rotation.x = Math.PI * 0.5 + 0.15;
  const bCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), moltenMat);
  beaconGroup.add(bRing, bCore);
  cellGroup.add(beaconGroup);
  collector.animatedSpinners?.push({ obj: beaconGroup, speed: 0.65 });

  // Ceiling Lights & Watertight Roof Slab (`top = 25.40m`)
  const lightSpecs: BoxSpec[] = [];
  for (const lx of [20.0, 34.0, 48.0]) {
    lightSpecs.push({ w: 9.5, h: 0.1, d: 0.46, x: lx, y: y0 + ceilH - 0.06, z: -21.5 });
  }
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 44.3, h: F2_ROOF_THICK, d: 25.3, x: 34.15, y: F2_ROOF_CENTER_Y, z: -21.65 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z11_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z11_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 26.5, y: y0, z: -15.8, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
      { x: 50.2, y: y2, z: -22.5, w: 0.88, h: 0.98, d: 2.5, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z11_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z11_l0', x: 26.2, y: y0, z: -24.5, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z11_l1', x: 43.0, y: y1, z: -17.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z11_l2', x: 50.8, y: y2, z: -16.8, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-CB',
    title: 'CYBER-CARGO BAZAAR',
    subtitle: 'CONTAINER STACK · TWO-STAGE ASCENT & L1→L2 PAD',
    accentHex: 0xeab308,
    x: 55.62,
    y: y2 + 2.45,
    z: -22.5,
    rotY: -Math.PI * 0.5,
    width: 7.4,
    height: 1.5,
  });

  return {
    id: 'f2_zone11_ne_cyber_bazaar',
    group: cellGroup,
    triggerBounds: { minX: 8.0, maxX: 56.0, minZ: -34.0, maxZ: -5.0 },
    center: { x: 34.0, z: -21.5 },
    maxViewDistance: 68.0,
  };
}
