import * as THREE from 'three';
import { buildMassiveBulkheadDoor } from '../../mechanics';
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
import { buildGuardrailRun, type FloorGeometryCollector } from '../../stairs';
import type { BulkheadDoorRig } from '../../types';
import { F1_GRID, F1_L2_Y, F1_META } from './layout';

/**
 * FLOOR 01 — THRESHOLD OMEN VESTIBULE & SOVEREIGN VIEWING OVERLOOK (`L2 = 0.0m`)
 *
 * Delivers an unmistakable "POINT OF NO RETURN" dread reveal the moment the player enters Floor 01:
 * - Dark volcanic obsidian entry hall framed by towering gold-capped omen pillars and blazing crimson braziers.
 * - Opens directly through a monumental 17.6m-wide colosseum arch onto the cantilevered Sovereign Viewing Overlook
 *   suspended 12.0 meters ABOVE the sunken Boss Pit, staring straight across 24.6m of vertical height at the
 *   hovering Black-Sun Eclipse Singularity and Boss Throne Dais!
 * - Center 6.4m drop-in threshold lets the operative leap straight into the Boss Pit OR flank West/East onto L2 Crowns.
 */
export function buildFloor1VestibuleAndOverlook(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const y2 = F1_L2_Y; // 0.0m
  const vestH = 8.4; // Vaulted vestibule ceiling cleanly inside Colosseum arch (zero roof overlap!)
  const halfW = F1_GRID.VEST_HALF_W; // 9.0m
  const group = collector.group;

  // 1. Omen Vestibule Floor (`x ∈ [-9.0, +9.0], z ∈ [-17.0, -4.02]`) — stops 2cm clear of North Colosseum wall!
  addWalkableDeck(collector, {
    minX: -halfW,
    maxX: halfW,
    minZ: F1_GRID.Z_ARRIVAL,
    maxZ: F1_GRID.Z_NORTH - 0.02,
    y: y2,
    thickness: 0.5,
    material: mats.obsidianBasalt,
    name: 'F1_VestibuleFloor',
  });
  // Extra walkable bridge slab bridging the 0.62m North Colosseum arch threshold cleanly
  collector.slabs.push({
    minX: -8.8,
    maxX: 8.8,
    minZ: F1_GRID.Z_NORTH - 0.5,
    maxZ: F1_GRID.Z_NORTH + 0.5,
    y: y2,
  });

  // 2. Cantilevered Sovereign Viewing Overlook (`x ∈ [-8.8, +8.8], z ∈ [-3.98, +3.6]`, `y = 0.0m`)
  //    Suspended 12.0m above the sunken Boss Colosseum floor!
  addWalkableDeck(collector, {
    minX: -8.8,
    maxX: 8.8,
    minZ: F1_GRID.Z_NORTH + 0.02,
    maxZ: 3.6,
    y: y2,
    thickness: 0.44,
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_SovereignOverlookDeck',
  });
  // Seamless walkable links to NW and NE L2 Crowns (x = ±8.82)
  collector.slabs.push(
    { minX: -9.4, maxX: -8.4, minZ: -3.68, maxZ: 1.8, y: y2 },
    { minX: 8.4, maxX: 9.4, minZ: -3.68, maxZ: 1.8, y: y2 }
  );

  // Guardrails framing the Overlook flanks while leaving the central 6.4m Boss-Pit Drop Edge wide open!
  buildGuardrailRun(collector, mats, {
    x1: -8.72,
    z1: 3.52,
    x2: -3.2,
    z2: 3.52,
    y: y2,
    accentMat: mats.eclipseCrimson,
  });
  buildGuardrailRun(collector, mats, {
    x1: 3.2,
    z1: 3.52,
    x2: 8.72,
    z2: 3.52,
    y: y2,
    accentMat: mats.eclipseCrimson,
  });
  // Short side guardrails on the cantilevered South tips beyond the L2 Crown depth (z ∈ [1.84, 3.46])
  buildGuardrailRun(collector, mats, {
    x1: -8.72,
    z1: 1.84,
    x2: -8.72,
    z2: 3.46,
    y: y2,
    accentMat: mats.sovereignGold,
  });
  buildGuardrailRun(collector, mats, {
    x1: 8.72,
    z1: 1.84,
    x2: 8.72,
    z2: 3.46,
    y: y2,
    accentMat: mats.sovereignGold,
  });

  // 3. Vestibule Enclosing Perimeter Walls (`z = -17.0` North Arrival + `x = ±9.0` West/East Side Walls)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F1_GRID.Z_ARRIVAL,
    spanStart: -halfW - 0.3,
    spanEnd: halfW + 0.3,
    baseY: y2,
    height: vestH,
    wallMat: mats.obsidianBasalt,
    accentMat: mats.eclipseCrimson,
    portals: [
      {
        start: -2.8,
        end: 2.8,
        bottomY: y2,
        topY: y2 + 5.4,
        kind: 'door',
        framed: false,
      },
    ],
    name: 'F1_VestibuleNorthWall',
  });

  for (const side of [-1, 1] as const) {
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord: side * halfW,
      spanStart: F1_GRID.Z_ARRIVAL + 0.32,
      spanEnd: F1_GRID.Z_NORTH - 0.32,
      baseY: y2,
      height: vestH,
      wallMat: mats.obsidianBasalt,
      name: side < 0 ? 'F1_VestibuleWestWall' : 'F1_VestibuleEastWall',
    });
  }

  // Watertight Vestibule Roof Cap (`y = 8.40..8.84m`, trimmed clear of North Colosseum wall at z = -4.32)
  const vestRoof = buildBatchedBoxesMesh(
    [{ w: halfW * 2 + 0.64, h: 0.44, d: 13.0, x: 0, y: y2 + vestH + 0.22, z: -10.82 }],
    mats.obsidianBasalt,
    { receiveShadow: true, name: 'F1_VestibuleRoof' }
  );
  if (vestRoof) {
    group.add(vestRoof);
    collector.wallMeshes.push(vestRoof);
  }

  // 4. Ominous Ritual Architecture: Fluted Bone-Stone Omen Columns, Blazing Crimson Braziers & Sovereign Gold Inlays
  const stoneSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const crimsonSpecs: BoxSpec[] = [];

  for (const sx of [-6.2, 6.2]) {
    for (const sz of [-13.2, -8.2]) {
      // Tall fluted vestibule monoliths rising cleanly from floor to vestibule ceiling
      stoneSpecs.push({ w: 0.86, h: vestH - 0.16, d: 0.86, x: sx, y: y2 + 0.08 + (vestH - 0.16) * 0.5, z: sz });
      goldSpecs.push(
        { w: 1.04, h: 0.16, d: 1.04, x: sx, y: y2 + 0.088, z: sz },
        { w: 1.04, h: 0.18, d: 1.04, x: sx, y: y2 + vestH - 0.12, z: sz }
      );
      crimsonSpecs.push({ w: 0.12, h: vestH - 1.4, d: 0.92, x: sx, y: y2 + vestH * 0.5, z: sz });
      collector.boxes.push({
        minX: sx - 0.52,
        maxX: sx + 0.52,
        minY: y2,
        maxY: y2 + vestH,
        minZ: sz - 0.52,
        maxZ: sz + 0.52,
        walkableTop: false,
      });
    }
  }

  // Twin Blazing Crimson Omen Braziers flanking the Overlook Drop Edge (`x = ±3.55, z = +2.85`)
  for (const sx of [-3.55, 3.55]) {
    stoneSpecs.push({ w: 0.78, h: 1.04, d: 0.78, x: sx, y: y2 + 0.148 + 0.52, z: 2.85 });
    goldSpecs.push(
      { w: 0.94, h: 0.14, d: 0.94, x: sx, y: y2 + 0.078, z: 2.85 },
      { w: 0.98, h: 0.14, d: 0.98, x: sx, y: y2 + 1.258, z: 2.85 }
    );
    crimsonSpecs.push({ w: 0.52, h: 0.24, d: 0.52, x: sx, y: y2 + 1.45, z: 2.85 });
    const brazierFlame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      mats.eclipseCrimson
    );
    brazierFlame.scale.set(0.85, 1.55, 0.85);
    brazierFlame.position.set(sx, y2 + 1.92, 2.85);
    brazierFlame.name = `F1_OverlookFlame_${sx < 0 ? 'W' : 'E'}`;
    detailGroup.add(brazierFlame);
    collector.animatedSpinners?.push({ obj: brazierFlame, speed: sx < 0 ? 1.15 : -1.15, axis: 'y' });
    collector.boxes.push({
      minX: sx - 0.48,
      maxX: sx + 0.48,
      minY: y2,
      maxY: y2 + 2.2,
      minZ: 2.37,
      maxZ: 3.33,
      walkableTop: false,
    });
  }

  // Sovereign crimson-and-gold ceremonial carpet runway guiding the eye straight out to the Boss Overlook drop!
  goldSpecs.push(
    { w: 0.14, h: 0.016, d: 19.2, x: -2.1, y: y2 + 0.012, z: -6.4 },
    { w: 0.14, h: 0.016, d: 19.2, x: 2.1, y: y2 + 0.012, z: -6.4 },
    // Bold golden dive-edge threshold marker along the 6.4m drop-in lip
    { w: 6.1, h: 0.022, d: 0.24, x: 0, y: y2 + 0.015, z: 3.38 }
  );
  crimsonSpecs.push(
    { w: 0.28, h: 0.014, d: 18.6, x: 0, y: y2 + 0.01, z: -6.5 },
    { w: 5.8, h: 0.018, d: 0.09, x: 0, y: y2 + 0.032, z: 3.38 }
  );

  // Heavy cantilevered architectural underside stepped corbels supporting the Overlook strictly BELOW y2 - 0.46m (ZERO floor poke-through!)
  for (const bx of [-6.4, 0, 6.4]) {
    stoneSpecs.push(
      { w: 1.05, h: 1.1, d: 5.4, x: bx, y: y2 - 1.02, z: -0.6 },
      { w: 0.92, h: 1.3, d: 3.6, x: bx, y: y2 - 2.24, z: -1.5 },
      { w: 0.82, h: 1.5, d: 1.9, x: bx, y: y2 - 3.66, z: -2.35 }
    );
  }

  // Vestibule ceiling overhead crimson-gold ribs
  for (const lz of [-14.2, -10.5, -6.8]) {
    goldSpecs.push({ w: 16.4, h: 0.26, d: 0.34, x: 0, y: y2 + vestH - 0.15, z: lz });
    crimsonSpecs.push({ w: 11.0, h: 0.08, d: 0.16, x: 0, y: y2 + vestH - 0.33, z: lz });
  }

  const stoneMesh = buildBatchedBoxesMesh(stoneSpecs, mats.sacredBoneStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F1_VestibuleOmenPillars',
  });
  if (stoneMesh) {
    group.add(stoneMesh);
    collector.wallMeshes.push(stoneMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, mats.sovereignGold, {
    name: 'F1_VestibuleGoldTrim',
  });
  if (goldMesh) detailGroup.add(goldMesh);
  const crimsonMesh = buildBatchedBoxesMesh(crimsonSpecs, mats.eclipseCrimson, {
    name: 'F1_VestibuleCrimsonRunes',
  });
  if (crimsonMesh) detailGroup.add(crimsonMesh);

  // Ominous high-contrast Dread Warning Plaque mounted proudly on the Colosseum Arch Lintel facing Spawn (-Z)
  addWallStencilPlaque(group, mats, {
    code: '01',
    title: 'POINT OF NO RETURN',
    subtitle: 'THE ECLIPSE SOVEREIGN COLOSSEUM · FINAL ARENA',
    accentHex: F1_META.accentHex,
    x: 0,
    y: y2 + 9.45,
    z: F1_GRID.Z_NORTH + 0.42,
    rotY: 0,
    width: 7.4,
    height: 1.55,
  });

  // 5. Arrival Bulkhead 01 (`z = -17.0, y = 0.0, rotY = 0` facing South into Omen Vestibule)
  const arrivalDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 1,
    x: 0,
    y: y2,
    z: F1_GRID.Z_ARRIVAL,
    rotY: 0,
    width: 5.6,
    height: 5.4,
    isArrivalShutter: true,
    plaqueTitle: 'BULKHEAD 01 ARRIVAL',
    plaqueSubtitle: 'ECLIPSE SOVEREIGN BOSS ARENA',
  });
  collector.boxes.push(arrivalDoor.collider);
  collector.wallMeshes.push(...arrivalDoor.raycastMeshes);

  return arrivalDoor;
}
