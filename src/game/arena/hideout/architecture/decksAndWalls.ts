import type * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';

export interface WallPortalSpec {
  start: number;
  end: number;
  bottomY: number;
  topY: number;
  kind: 'door' | 'window';
  framed?: boolean;
  accentHeader?: boolean;
}

export interface ArchitecturalWallOptions {
  axis: 'x' | 'z';
  coord: number;
  spanStart: number;
  spanEnd: number;
  baseY: number;
  height: number;
  thickness?: number;
  portals?: WallPortalSpec[];
  wallMat?: THREE.Material;
  accentMat?: THREE.Material;
  targetGroup?: THREE.Group;
  includeColliders?: boolean;
  name?: string;
}

/**
 * Reusable AAA segmented architectural wall builder:
 * - Cleanly slices concrete walls around 0, 1, or many doorways & windows with ZERO Z-fighting
 * - Batches concrete into 1 draw call, dark-steel portal frames into 1 draw call, glass into 1 draw call
 * - Emits exact non-overlapping `ColliderBox3D` boxes (open for doors, full-height solid for windows)
 */
export function buildArchitecturalWall(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: ArchitecturalWallOptions
): void {
  const {
    axis,
    coord,
    spanStart,
    spanEnd,
    baseY,
    height,
    thickness = 0.6,
    portals = [],
    wallMat = mats.concreteWall,
    accentMat,
    targetGroup,
    includeColliders = true,
    name = 'ArchWall',
  } = opts;

  const hostGroup = targetGroup ?? collector.group;
  const topYAll = baseY + height;
  const sorted = [...portals].sort((a, b) => a.start - b.start);

  const concreteSpecs: BoxSpec[] = [];
  const frameSpecs: BoxSpec[] = [];
  const glassSpecs: BoxSpec[] = [];
  const accentSpecs: BoxSpec[] = [];

  const pushBox = (
    arr: BoxSpec[],
    s0: number,
    s1: number,
    y0: number,
    y1: number,
    thick: number,
    coordOffset = 0
  ) => {
    const len = s1 - s0;
    const h = y1 - y0;
    if (len <= 0.02 || h <= 0.02) return;
    const mid = (s0 + s1) * 0.5;
    const midY = (y0 + y1) * 0.5;
    if (axis === 'x') {
      arr.push({ w: len, h, d: thick, x: mid, y: midY, z: coord + coordOffset });
    } else {
      arr.push({ w: thick, h, d: len, x: coord + coordOffset, y: midY, z: mid });
    }
  };

  const pushCollider = (s0: number, s1: number, y0: number, y1: number) => {
    if (!includeColliders) return;
    if (s1 - s0 <= 0.02 || y1 - y0 <= 0.02) return;
    const halfT = thickness * 0.5;
    if (axis === 'x') {
      collector.boxes.push({
        minX: s0,
        maxX: s1,
        minY: y0,
        maxY: y1,
        minZ: coord - halfT,
        maxZ: coord + halfT,
        walkableTop: false,
      });
    } else {
      collector.boxes.push({
        minX: coord - halfT,
        maxX: coord + halfT,
        minY: y0,
        maxY: y1,
        minZ: s0,
        maxZ: s1,
        walkableTop: false,
      });
    }
  };

  const concreteThick = axis === 'z' ? Math.max(0.12, thickness - 0.008) : thickness;
  const concreteBaseY = axis === 'z' ? baseY + 0.004 : baseY;
  const concreteTopY = axis === 'z' ? topYAll - 0.004 : topYAll;

  const clampedPortals = sorted
    .map((p) => ({
      p,
      pStart: Math.max(spanStart, p.start),
      pEnd: Math.min(spanEnd, p.end),
    }))
    .filter((entry) => entry.pEnd > entry.pStart + 0.005);

  const rawCuts: number[] = [spanStart, spanEnd];
  for (let i = 0; i < clampedPortals.length; i++) {
    rawCuts.push(clampedPortals[i].pStart, clampedPortals[i].pEnd);
  }
  rawCuts.sort((a, b) => a - b);
  const cuts: number[] = [];
  for (let i = 0; i < rawCuts.length; i++) {
    if (cuts.length === 0 || rawCuts[i] - cuts[cuts.length - 1] > 0.005) {
      cuts.push(rawCuts[i]);
    }
  }

  for (let s = 0; s < cuts.length - 1; s++) {
    const s0 = cuts[s];
    const s1 = cuts[s + 1];
    if (s1 - s0 <= 0.02) continue;
    const midS = (s0 + s1) * 0.5;

    const visualHoles: Array<[number, number]> = [];
    const colliderHoles: Array<[number, number]> = [];
    for (let i = 0; i < clampedPortals.length; i++) {
      const { p, pStart, pEnd } = clampedPortals[i];
      if (midS < pStart || midS > pEnd) continue;
      const openBot =
        p.kind === 'door' && p.bottomY > baseY + 0.02
          ? Math.max(concreteBaseY, p.bottomY - 0.45)
          : p.bottomY;
      visualHoles.push([openBot, p.topY]);
      if (p.kind === 'door') {
        const colBot = p.bottomY > baseY + 0.02 ? Math.max(baseY, p.bottomY - 0.45) : p.bottomY;
        colliderHoles.push([colBot, p.topY]);
      }
    }

    visualHoles.sort((a, b) => a[0] - b[0]);
    let yCur = concreteBaseY;
    for (let h = 0; h < visualHoles.length; h++) {
      const [hBot, hTop] = visualHoles[h];
      if (hBot > yCur + 0.02) {
        pushBox(concreteSpecs, s0, s1, yCur, Math.min(hBot, concreteTopY), concreteThick);
      }
      if (hTop > yCur) yCur = hTop;
    }
    if (concreteTopY > yCur + 0.02) {
      pushBox(concreteSpecs, s0, s1, yCur, concreteTopY, concreteThick);
    }

    colliderHoles.sort((a, b) => a[0] - b[0]);
    let cCur = baseY;
    for (let h = 0; h < colliderHoles.length; h++) {
      const [hBot, hTop] = colliderHoles[h];
      if (hBot > cCur + 0.02) {
        pushCollider(s0, s1, cCur, Math.min(hBot, topYAll));
      }
      if (hTop > cCur) cCur = hTop;
    }
    if (topYAll > cCur + 0.02) {
      pushCollider(s0, s1, cCur, topYAll);
    }
  }

  for (let i = 0; i < clampedPortals.length; i++) {
    const { p, pStart, pEnd } = clampedPortals[i];

    if (p.kind === 'window') {
      pushBox(glassSpecs, pStart + 0.14, pEnd - 0.14, p.bottomY + 0.12, p.topY - 0.12, 0.08);
      const wSpan = pEnd - pStart;
      if (wSpan > 4.2) {
        const mullionCount = Math.floor(wSpan / 3.4);
        for (let m = 1; m <= mullionCount; m++) {
          const mx = pStart + (wSpan * m) / (mullionCount + 1);
          pushBox(frameSpecs, mx - 0.08, mx + 0.08, p.bottomY + 0.1, p.topY - 0.1, concreteThick + 0.06);
        }
      }
    }

    if (p.framed !== false) {
      const jambW = 0.22;
      const frameT = concreteThick + 0.14;
      const jambBottom = p.kind === 'door' ? p.bottomY + 0.006 : p.bottomY;
      pushBox(frameSpecs, pStart, pStart + jambW, jambBottom, p.topY - 0.24, frameT);
      pushBox(frameSpecs, pEnd - jambW, pEnd, jambBottom, p.topY - 0.24, frameT);
      pushBox(frameSpecs, pStart - 0.08, pEnd + 0.08, p.topY - 0.24, p.topY + 0.12, frameT + 0.04);
      if (p.kind === 'window') {
        pushBox(frameSpecs, pStart - 0.06, pEnd + 0.06, p.bottomY - 0.08, p.bottomY + 0.14, frameT + 0.04);
      }
      if (p.accentHeader && accentMat) {
        pushBox(
          accentSpecs,
          pStart + 0.35,
          pEnd - 0.35,
          p.topY - 0.08,
          p.topY + 0.04,
          frameT + 0.08
        );
      }
    }
  }

  const wallMesh = buildBatchedBoxesMesh(concreteSpecs, wallMat, {
    receiveShadow: true,
    name: `${name}_Concrete`,
  });
  if (wallMesh) {
    hostGroup.add(wallMesh);
    collector.wallMeshes.push(wallMesh);
  }

  const frameMesh = buildBatchedBoxesMesh(frameSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: `${name}_Frames`,
  });
  if (frameMesh) {
    hostGroup.add(frameMesh);
    collector.wallMeshes.push(frameMesh);
  }

  const glassMesh = buildBatchedBoxesMesh(glassSpecs, mats.glassPanel, {
    receiveShadow: false,
    name: `${name}_Glass`,
  });
  if (glassMesh) {
    hostGroup.add(glassMesh);
  }

  if (accentMat) {
    const accMesh = buildBatchedBoxesMesh(accentSpecs, accentMat, {
      name: `${name}_Accents`,
    });
    if (accMesh) hostGroup.add(accMesh);
  }
}

export interface WalkableDeckSpec {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  thickness?: number;
  material: THREE.Material;
  targetGroup?: THREE.Group;
  castShadow?: boolean;
  name?: string;
}

/**
 * Adds a crisp architectural floor/mezzanine/catwalk deck mesh and registers its exact `WalkableSlab`.
 */
export function addWalkableDeck(
  collector: FloorGeometryCollector,
  spec: WalkableDeckSpec
): THREE.Mesh | null {
  const {
    minX,
    maxX,
    minZ,
    maxZ,
    y,
    thickness = 0.44,
    material,
    targetGroup,
    castShadow = false,
    name = 'WalkableDeck',
  } = spec;

  const w = maxX - minX;
  const d = maxZ - minZ;
  if (w <= 0.05 || d <= 0.05) return null;

  const mesh = buildBatchedBoxesMesh(
    [{ w, h: thickness, d, x: (minX + maxX) * 0.5, y: y - thickness * 0.5, z: (minZ + maxZ) * 0.5 }],
    material,
    { castShadow, receiveShadow: true, name }
  );
  const hostGroup = targetGroup ?? collector.group;
  if (mesh) {
    hostGroup.add(mesh);
    collector.wallMeshes.push(mesh);
  }

  collector.slabs.push({ minX, maxX, minZ, maxZ, y, thickness });
  return mesh;
}
