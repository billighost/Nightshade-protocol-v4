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
  addF3PortalSill,
  F3_CEIL_H,
  F3_GRID,
  F3_IDS,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_PORTAL_L0,
  F3_PORTAL_L1,
  F3_PORTAL_L2,
  F3_PORTALS,
  F3_ROOF_CENTER_Y,
  F3_ROOF_THICK,
} from './layout';

/**
 * FLOOR 03 — ZONE 7 (NE OCCLUSION CELL): THE PRISM ARCHIVE & THREE-TIER CLOISTER VAULT
 * Footprint: x ∈ [+12.0, +32.0], z ∈ [-34.0, -4.0] (`20m × 30m`)
 *
 * - Towering obsidian-and-gold monolithic data-steles with suspended rotating **Archive Prism Orbs**.
 * - Full 3-story connectivity:
 *   - Flush West-wall `L0 → L1` stair (`x = +13.3`)
 *   - Flush East-wall `L1 → L2` stair (`x = +30.7`) PLUS Calibrated **`L1 → L2` Cryo-Lift Jump Pad**
 *     (`f3_pad_archive_l1_l2` at `(+18.0, 31.1, -25.6)` launching North straight onto North L2 Balcony!)
 * - Connects Zone 1 L1/L2 Overhead Galleries <-> Zone 8 Aurora Spire <-> Zone 9 East Monolith Conduit!
 */
export function buildFloor3Zone7NorthEastArchive(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F3_CELL_Z7_NE_ARCHIVE';
  collector.group.add(cellGroup);

  // 1. L0 Full Archive Floor (`x ∈ [+12, +32], z ∈ [-34, -4]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_CORE_EAST,
    maxX: F3_GRID.X_EAST_MID,
    minZ: F3_GRID.Z_NORTH_OUTER,
    maxZ: F3_GRID.Z_THRESHOLD,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z7_L0_Floor',
  });

  // 2. Single-Owner Walls: North exterior (`z = -34.0`), West shaft wall (`x = +12.0, z ∈ [-34, -17]`),
  //    East partition wall (`x = +32.0, z ∈ [-34, -4]` into Zone 8 on L0, L1, L2)!
  //    (South `z = -4.0` owned by Zone 9; West `z ∈ [-17, -4]` owned by Zone 1!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_NORTH_OUTER,
    spanStart: F3_GRID.X_CORE_EAST - 0.3,
    spanEnd: F3_GRID.X_EAST_MID + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z7_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_CORE_EAST,
    spanStart: F3_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F3_GRID.Z_ARRIVAL - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z7_WestShaftWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_EAST_MID,
    spanStart: F3_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F3_GRID.Z_THRESHOLD - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    targetGroup: cellGroup,
    portals: [
      { start: F3_PORTALS.Z7_Z8_L0_Z[0], end: F3_PORTALS.Z7_Z8_L0_Z[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z7_Z8_L1_Z[0], end: F3_PORTALS.Z7_Z8_L1_Z[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z7_Z8_L2_Z[0], end: F3_PORTALS.Z7_Z8_L2_Z[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F3_Z7_EastPartitionWall',
  });

  // Zero-gap elevated doorway threshold sills on East partition wall into Zone 8
  addF3PortalSill(collector, { axis: 'z', coord: F3_GRID.X_EAST_MID, span: F3_PORTALS.Z7_Z8_L1_Z, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z7_Sill_Z8_L1' });
  addF3PortalSill(collector, { axis: 'z', coord: F3_GRID.X_EAST_MID, span: F3_PORTALS.Z7_Z8_L2_Z, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z7_Sill_Z8_L2' });

  // 3. LEVEL 1 (`31.1m`) ARCHIVE GALLERIES (North Terrace + East Gallery + South Gallery)
  //    North L1 Archive Terrace (`x ∈ [+12.31, +27.4], z ∈ [-33.69, -24.4]`) — hosts `L1 → L2` Jump Pad (`(+18.0, -25.6)`)!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 27.4,
    minZ: -33.69,
    maxZ: -24.4,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z7_L1_NorthTerrace',
  });
  //    East L1 Gallery (`x ∈ [+27.4, +31.69], z ∈ [-33.69, -14.2]`) -> links Zone 8 L1 (`z ∈ [-29.0, -25.4]`) & feeds East `L1 → L2` Stair!
  addWalkableDeck(collector, {
    minX: 27.4,
    maxX: 31.69,
    minZ: -33.69,
    maxZ: -14.2,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z7_L1_EastGallery',
  });
  //    South L1 Gallery (`x ∈ [+12.31, +31.69], z ∈ [-14.2, -4.31]`) -> receives West `L0 → L1` Stair (`z = -14.2`)
  //    AND links Zone 1 L1 Overhead Gallery (`z ∈ [-11.4, -7.6]`) & Zone 9 L1 (`x ∈ [+14.4, +18.0]`)!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 31.69,
    minZ: -14.2,
    maxZ: -4.31,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z7_L1_SouthGallery',
  });

  // L1 Guardrails (open cleanly at West stair top `x ∈ [+12.31, +14.3]` on `z = -14.2`!)
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: -24.4, x2: 27.4, z2: -24.4, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 27.4, z1: -24.4, x2: 27.4, z2: -14.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 14.3, z1: -14.2, x2: 27.4, z2: -14.2, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`34.2m`) ARCHIVE CROWN BALCONIES (North Balcony + West Sky-Bridge + South Crown Hub!)
  //    North L2 Crown Balcony (`x ∈ [+12.31, +31.69], z ∈ [-33.69, -27.8]`) — receives `L1 → L2` Jump Pad at `(+18.0, -28.84)`!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 31.69,
    minZ: -33.69,
    maxZ: -27.8,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z7_L2_NorthBalcony',
  });
  //    West L2 Sky-Bridge (`x ∈ [+12.31, +16.0], z ∈ [-27.8, -14.2]`) linking North L2 Balcony <-> South L2 Hub!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 16.0,
    minZ: -27.8,
    maxZ: -14.2,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z7_L2_WestBridge',
  });
  //    South L2 Crown Hub (`x ∈ [+12.31, +31.69], z ∈ [-14.2, -4.31]`) — receives Flush East `L1 → L2` Stair (`z = -14.2`)
  //    AND connects Zone 1 L2 (`z ∈ [-11.4, -7.6]`), Zone 9 L2 (`x ∈ [+20.0, +24.0]`) & Zone 8 L2 (`z ∈ [-12.0, -8.2]`)!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 31.69,
    minZ: -14.2,
    maxZ: -4.31,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z7_L2_SouthHub',
  });

  // L2 Guardrails (OPEN at Jump Pad landing slot `x ∈ [+16.2, +19.8]` on `z = -27.8`, and open at East stair top `x ∈ [+29.6, +31.69]` on `z = -14.2`!)
  buildGuardrailRun(collector, mats, { x1: 19.8, z1: -27.8, x2: 31.65, z2: -27.8, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 16.0, z1: -27.8, x2: 16.0, z2: -14.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 16.0, z1: -14.2, x2: 29.6, z2: -14.2, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  // 5. TWO-STAGE FLUSH STAIRS (`L0 → L1` West Wall + `L1 → L2` East Wall) + CALIBRATED `L1 → L2` JUMP PAD!
  //    Flush West Wall `L0 → L1` Stair (`x = +13.3, width = 2.0 -> x ∈ [+12.3, +14.3]` flush against `x = +12.3`!)
  buildStraightStairFlight(collector, mats, {
    x: 13.3,
    z: -17.1,
    width: 2.0,
    length: 5.8,
    yStart: y0, // z = -20.0 -> 28.0m
    yEnd: y1, // z = -14.2 -> 31.1m (South L1 Gallery!)
    axis: 'z',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });

  //    Flush East Wall `L1 → L2` Stair (`x = +30.7, width = 2.0 -> x ∈ [+29.7, +31.7]` flush against `x = +31.7`!)
  buildStraightStairFlight(collector, mats, {
    x: 30.7,
    z: -17.1,
    width: 2.0,
    length: 5.8,
    yStart: y1, // z = -20.0 -> 31.1m (East L1 Gallery!)
    yEnd: y2, // z = -14.2 -> 34.2m (South L2 Crown Hub!)
    axis: 'z',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  //    Calibrated `L1 → L2` Cryo-Lift Jump Pad (`(+18.0, 31.1, -25.6)` -> lands at `(+18.0, 34.2, -28.84)` on North L2 Balcony!)
  buildJumpPad(collector, mats, {
    id: F3_IDS.padArchiveL1ToL2,
    x: 18.0,
    y: y1,
    z: -25.6,
    launchVy: 11.4,
    launchVx: 0,
    launchVz: -3.0,
    targetGroup: cellGroup,
  });

  // 6. Monumental Carved Obsidian Data-Steles + Floating Rotating Archive Prism Orbs!
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  for (const [idx, sz] of [
    [0, -22.2],
    [1, -16.8],
  ] as const) {
    // Tall carved obsidian data-stele pedestals flanking the central archive lane (`x = +21.5`)
    basaltSpecs.push({ w: 1.5, h: 2.1, d: 1.5, x: 21.5, y: y0 + 1.056, z: sz });
    goldSpecs.push(
      { w: 1.72, h: 0.14, d: 1.72, x: 21.5, y: y0 + 0.08, z: sz },
      { w: 1.72, h: 0.14, d: 1.72, x: 21.5, y: y0 + 2.14, z: sz }
    );
    collector.boxes.push({
      minX: 20.68,
      maxX: 22.32,
      minY: y0,
      maxY: y0 + 2.25,
      minZ: sz - 0.82,
      maxZ: sz + 0.82,
      walkableTop: false,
    });

    // Floating kinetic Archive Prism Orb rotating gracefully above each data-stele!
    const orbGroup = new THREE.Group();
    orbGroup.name = `F3_Z7_ArchivePrism_${idx}`;
    orbGroup.position.set(21.5, y0 + 4.1, sz);
    const oct = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), mats.cryoFrost);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 24), goldMat);
    ring.rotation.x = Math.PI * 0.25;
    orbGroup.add(oct, ring);
    cellGroup.add(orbGroup);
    collector.animatedSpinners?.push({ obj: orbGroup, speed: idx === 0 ? 0.62 : -0.74 });
  }

  for (const lz of [-28.0, -19.5, -10.0]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.42, x: 22.0, y: y0 + ceilH - 0.06, z: lz });
  }

  // Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 20.0, h: F3_ROOF_THICK, d: 30.3, x: 22.0, y: F3_ROOF_CENTER_Y, z: -19.15 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z7_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const steleMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z7_DataSteles',
  });
  if (steleMesh) {
    cellGroup.add(steleMesh);
    collector.wallMeshes.push(steleMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z7_GoldTrim' });
  if (goldMesh) cellGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z7_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 17.6, y: y0, z: -19.0, w: 0.88, h: 0.98, d: 2.4, walkableTop: true },
      { x: 22.0, y: y2, z: -9.0, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: goldMat, name: 'F3_Z7_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z7_l0', x: 25.5, y: y0, z: -19.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z7_l2', x: 24.5, y: y2, z: -30.5, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '03-AR',
    title: 'PRISM ARCHIVE',
    subtitle: 'THREE-TIER CLOISTER VAULT · L1→L2 CRYO-LIFT',
    accentHex: 0xe6ad46,
    x: 22.0,
    y: y2 + 2.4,
    z: F3_GRID.Z_NORTH_OUTER + 0.36,
    rotY: 0,
    width: 6.4,
    height: 1.4,
  });

  return {
    id: 'f3_zone7_ne_prism_archive',
    group: cellGroup,
    triggerBounds: { minX: 8.0, maxX: 36.0, minZ: -34.0, maxZ: -1.0 },
    center: { x: 22.0, z: -19.0 },
    maxViewDistance: 68.0,
  };
}
