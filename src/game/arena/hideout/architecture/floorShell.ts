import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  buildInstancedBoxes,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';
import type { ColliderBox3D, OcclusionCell } from '../types';

export interface PerimeterPortalSpec {
  width: number;
  height: number;
}

export interface RoomPerimeterOptions {
  halfW: number;
  halfD: number;
  baseY: number;
  ceilingH: number;
  northPortal?: PerimeterPortalSpec;
  southPortal?: PerimeterPortalSpec;
  /** Optional doorway cutout on West wall (-halfW) into an OcclusionCell alcove */
  westAlcoveCutout?: { zCenter: number; width: number; height: number };
  /** Optional doorway cutout on East wall (+halfW) into an OcclusionCell alcove */
  eastAlcoveCutout?: { zCenter: number; width: number; height: number };
  wallThickness?: number;
  /** Skip floor slab when the floor uses custom sunken trenches or central holes */
  includeMainFloor?: boolean;
  includeCeiling?: boolean;
  /** Accent material for architectural wall strip & ceiling cornice */
  accentMat: THREE.Material;
}

/**
 * Helper that builds crisp architectural greybox perimeter walls with exact portal/alcove cutouts,
 * vertical concrete pilasters, ceiling structural ribs, and matching 3D colliders — all merged into
 * minimal draw calls!
 */
export function buildChamberShell(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: RoomPerimeterOptions
): void {
  const {
    halfW,
    halfD,
    baseY,
    ceilingH,
    northPortal,
    southPortal,
    westAlcoveCutout,
    eastAlcoveCutout,
    wallThickness = 0.75,
    includeMainFloor = true,
    includeCeiling = true,
    accentMat,
  } = opts;

  const wallSpecs: BoxSpec[] = [];
  const trimSpecs: BoxSpec[] = [];
  const accentSpecs: BoxSpec[] = [];
  const floorSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  const midY = baseY + ceilingH * 0.5;
  const wallCol = (minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) => {
    collector.boxes.push({ minX, maxX, minY, maxY, minZ, maxZ, walkableTop: false, tag: 'perimeter_wall' });
  };

  const wallColTopY = baseY + ceilingH + 0.25;

  // Helper to emit a Z-facing wall (North at -halfD or South at +halfD) with optional centered portal cutout
  const addZWall = (zFace: number, portal?: PerimeterPortalSpec) => {
    const zCenter = zFace + (zFace < 0 ? -wallThickness * 0.5 : wallThickness * 0.5);
    const zMin = zCenter - wallThickness * 0.5;
    const zMax = zCenter + wallThickness * 0.5;
    if (!portal) {
      wallSpecs.push({ w: halfW * 2 + wallThickness * 2, h: ceilingH, d: wallThickness, x: 0, y: midY, z: zCenter });
      wallCol(-halfW - wallThickness, halfW + wallThickness, baseY - 2, wallColTopY, zMin, zMax);
      return;
    }
    const pHalf = portal.width * 0.5;
    const sideW = halfW - pHalf + wallThickness;
    const leftX = -(pHalf + sideW * 0.5);
    const rightX = pHalf + sideW * 0.5;
    wallSpecs.push(
      { w: sideW, h: ceilingH, d: wallThickness, x: leftX, y: midY, z: zCenter },
      { w: sideW, h: ceilingH, d: wallThickness, x: rightX, y: midY, z: zCenter }
    );
    wallCol(-halfW - wallThickness, -pHalf, baseY - 2, wallColTopY, zMin, zMax);
    wallCol(pHalf, halfW + wallThickness, baseY - 2, wallColTopY, zMin, zMax);

    // Transom wall above the massive bulkhead door opening
    const transomH = Math.max(0.5, ceilingH - portal.height);
    wallSpecs.push({
      w: portal.width + 0.2,
      h: transomH,
      d: wallThickness,
      x: 0,
      y: baseY + portal.height + transomH * 0.5,
      z: zCenter,
    });
    wallCol(-pHalf, pHalf, baseY + portal.height, wallColTopY, zMin, zMax);
  };

  // Helper to emit an X-facing wall (West at -halfW or East at +halfW) with optional alcove cutout
  const addXWall = (xFace: number, cutout?: { zCenter: number; width: number; height: number }) => {
    const xCenter = xFace + (xFace < 0 ? -wallThickness * 0.5 : wallThickness * 0.5);
    const xMin = xCenter - wallThickness * 0.5;
    const xMax = xCenter + wallThickness * 0.5;
    if (!cutout) {
      wallSpecs.push({ w: wallThickness, h: ceilingH, d: halfD * 2 + wallThickness * 2, x: xCenter, y: midY, z: 0 });
      wallCol(xMin, xMax, baseY - 2, wallColTopY, -halfD - wallThickness, halfD + wallThickness);
      return;
    }
    const z0 = cutout.zCenter - cutout.width * 0.5;
    const z1 = cutout.zCenter + cutout.width * 0.5;
    const northLen = z0 - (-halfD - wallThickness);
    const southLen = (halfD + wallThickness) - z1;
    if (northLen > 0.2) {
      const nz = -halfD - wallThickness + northLen * 0.5;
      wallSpecs.push({ w: wallThickness, h: ceilingH, d: northLen, x: xCenter, y: midY, z: nz });
      wallCol(xMin, xMax, baseY - 2, wallColTopY, -halfD - wallThickness, z0);
    }
    if (southLen > 0.2) {
      const sz = z1 + southLen * 0.5;
      wallSpecs.push({ w: wallThickness, h: ceilingH, d: southLen, x: xCenter, y: midY, z: sz });
      wallCol(xMin, xMax, baseY - 2, wallColTopY, z1, halfD + wallThickness);
    }
    const transomH = Math.max(0.5, ceilingH - cutout.height);
    wallSpecs.push({
      w: wallThickness,
      h: transomH,
      d: cutout.width + 0.1,
      x: xCenter,
      y: baseY + cutout.height + transomH * 0.5,
      z: cutout.zCenter,
    });
    wallCol(xMin, xMax, baseY + cutout.height, wallColTopY, z0, z1);
  };

  addZWall(-halfD, northPortal);
  addZWall(halfD, southPortal);
  addXWall(-halfW, westAlcoveCutout);
  addXWall(halfW, eastAlcoveCutout);

  // Main floor slab & ceiling deck (strictly capped at baseY + ceilingH + 0.50m for inter-floor clearance!)
  if (includeMainFloor) {
    floorSpecs.push({ w: halfW * 2 + 0.8, h: 0.6, d: halfD * 2 + 0.8, x: 0, y: baseY - 0.3, z: 0 });
    collector.slabs.push({ minX: -halfW, maxX: halfW, minZ: -halfD, maxZ: halfD, y: baseY });
  }
  if (includeCeiling) {
    wallSpecs.push({ w: halfW * 2 + 1.5, h: 0.5, d: halfD * 2 + 1.5, x: 0, y: baseY + ceilingH + 0.25, z: 0 });
  }

  // Rhythmic structural pilasters along East/West walls & ceiling roof ribs (dramatic AAA depth!)
  const bayCount = 5;
  for (let i = 0; i <= bayCount; i++) {
    const z = -halfD + 2.6 + (i / bayCount) * (halfD * 2 - 5.2);
    const skipWest = westAlcoveCutout && Math.abs(z - westAlcoveCutout.zCenter) < westAlcoveCutout.width * 0.5 + 0.6;
    const skipEast = eastAlcoveCutout && Math.abs(z - eastAlcoveCutout.zCenter) < eastAlcoveCutout.width * 0.5 + 0.6;

    if (!skipWest) {
      trimSpecs.push({ w: 0.65, h: ceilingH - 0.3, d: 0.72, x: -halfW + 0.32, y: midY, z });
    }
    if (!skipEast) {
      trimSpecs.push({ w: 0.65, h: ceilingH - 0.3, d: 0.72, x: halfW - 0.32, y: midY, z });
    }
    // Overhead steel ceiling truss beam spanning full width!
    trimSpecs.push({ w: halfW * 2 - 0.4, h: 0.55, d: 0.46, x: 0, y: baseY + ceilingH - 0.35, z });
    // Recessed ceiling light bay between trusses
    if (i < bayCount) {
      const lz = z + (halfD * 2 - 5.2) / (bayCount * 2);
      lightSpecs.push({ w: halfW * 1.12, h: 0.14, d: 0.9, x: 0, y: baseY + ceilingH - 0.08, z: lz });
    }
  }

  // Horizontal mid-wall architectural accent strip framing chamber proportions
  accentSpecs.push(
    { w: 0.08, h: 0.12, d: halfD * 1.65, x: -halfW + 0.06, y: baseY + 3.4, z: 0 },
    { w: 0.08, h: 0.12, d: halfD * 1.65, x: halfW - 0.06, y: baseY + 3.4, z: 0 }
  );

  const wallMesh = buildBatchedBoxesMesh(wallSpecs, mats.concreteWall, {
    receiveShadow: true,
    name: 'ChamberPerimeterWalls',
  });
  if (wallMesh) {
    collector.group.add(wallMesh);
    collector.wallMeshes.push(wallMesh);
  }

  if (floorSpecs.length > 0) {
    const floorMesh = buildBatchedBoxesMesh(floorSpecs, mats.concreteFloor, {
      receiveShadow: true,
      name: 'ChamberMainFloor',
    });
    if (floorMesh) {
      collector.group.add(floorMesh);
      collector.wallMeshes.push(floorMesh);
    }
  }

  const trimMesh = buildBatchedBoxesMesh(trimSpecs, mats.structuralSteel, {
    castShadow: false,
    receiveShadow: true,
    name: 'ChamberPilastersAndTrusses',
  });
  if (trimMesh) {
    collector.group.add(trimMesh);
    collector.wallMeshes.push(trimMesh);
  }

  const accentMesh = buildBatchedBoxesMesh(accentSpecs, accentMat, { name: 'ChamberAccentBands' });
  if (accentMesh) collector.group.add(accentMesh);

  const lightMesh = buildInstancedBoxes(lightSpecs, mats.ceilingLight, { name: 'ChamberSkylightBays' });
  if (lightMesh) collector.group.add(lightMesh);
}

/**
 * Builds a side architectural alcove enclosed inside a dedicated sub-floor `OcclusionCell` group
 * so distant/unseen side bays cull completely when the player is across the main chamber!
 */
export function buildSideAlcoveCell(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: {
    id: string;
    side: 'west' | 'east';
    wallX: number;
    zCenter: number;
    baseY: number;
    depth: number;
    width: number;
    height: number;
    accentMat: THREE.Material;
  }
): OcclusionCell {
  const { id, side, wallX, zCenter, baseY, depth, width, height, accentMat } = opts;
  const dir = side === 'west' ? -1 : 1;
  const cellGroup = new THREE.Group();
  cellGroup.name = `OCCLUSION_CELL_${id}`;
  collector.group.add(cellGroup);

  const xInner = wallX;
  const xOuter = wallX + dir * depth;
  const minX = Math.min(xInner, xOuter);
  const maxX = Math.max(xInner, xOuter);
  const cx = (minX + maxX) * 0.5;
  const minZ = zCenter - width * 0.5;
  const maxZ = zCenter + width * 0.5;
  const midY = baseY + height * 0.5;

  const walls: BoxSpec[] = [
    // Far outer wall
    { w: 0.55, h: height, d: width + 0.8, x: xOuter + dir * 0.25, y: midY, z: zCenter },
    // North & South alcove side walls
    { w: depth + 0.6, h: height, d: 0.55, x: cx, y: midY, z: minZ - 0.25 },
    { w: depth + 0.6, h: height, d: 0.55, x: cx, y: midY, z: maxZ + 0.25 },
    // Ceiling cap
    { w: depth + 0.8, h: 0.45, d: width + 0.8, x: cx, y: baseY + height + 0.22, z: zCenter },
  ];

  const wallMesh = buildBatchedBoxesMesh(walls, mats.concreteWallLight, {
    receiveShadow: true,
    name: `AlcoveWalls_${id}`,
  });
  if (wallMesh) {
    cellGroup.add(wallMesh);
    collector.wallMeshes.push(wallMesh);
  }

  const floorMesh = buildBatchedBoxesMesh(
    [{ w: depth + 1.0, h: 0.5, d: width + 0.6, x: cx, y: baseY - 0.25, z: zCenter }],
    mats.concreteFloor,
    { receiveShadow: true, name: `AlcoveFloor_${id}` }
  );
  if (floorMesh) {
    cellGroup.add(floorMesh);
    collector.wallMeshes.push(floorMesh);
  }

  const lightStrip = buildBatchedBoxesMesh(
    [
      { w: depth * 0.72, h: 0.1, d: 0.4, x: cx, y: baseY + height - 0.06, z: zCenter },
      { w: 0.1, h: height * 0.65, d: 0.12, x: xOuter - dir * 0.08, y: baseY + height * 0.48, z: zCenter },
    ],
    accentMat,
    { name: `AlcoveAccent_${id}` }
  );
  if (lightStrip) cellGroup.add(lightStrip);

  // Register walkable slab & outer wall colliders on the floor
  collector.slabs.push({ minX: minX - 0.8, maxX: maxX + 0.8, minZ, maxZ, y: baseY });
  collector.boxes.push(
    {
      minX: dir === -1 ? xOuter - 0.55 : xOuter,
      maxX: dir === -1 ? xOuter : xOuter + 0.55,
      minY: baseY,
      maxY: baseY + height + 0.5,
      minZ: minZ - 0.5,
      maxZ: maxZ + 0.5,
      walkableTop: false,
    },
    { minX: minX - 0.5, maxX: maxX + 0.5, minY: baseY, maxY: baseY + height + 0.5, minZ: minZ - 0.55, maxZ: minZ, walkableTop: false },
    { minX: minX - 0.5, maxX: maxX + 0.5, minY: baseY, maxY: baseY + height + 0.5, minZ: maxZ, maxZ: maxZ + 0.55, walkableTop: false }
  );

  return {
    id,
    group: cellGroup,
    triggerBounds: {
      minX: Math.min(minX, wallX - 8.5),
      maxX: Math.max(maxX, wallX + 8.5),
      minZ: minZ - 7.5,
      maxZ: maxZ + 7.5,
    },
    center: { x: cx, z: zCenter },
    maxViewDistance: 26,
  };
}

/**
 * Adds a batch of jumpable tactical greybox cover blocks (`walkableTop: true`) and returns a single merged mesh.
 */
export function addCoverBlocks(
  collector: FloorGeometryCollector,
  material: THREE.Material,
  blocks: Array<{ x: number; y: number; z: number; w: number; h: number; d: number; walkableTop?: boolean }>,
  name = 'TacticalCoverBlocks'
): void {
  const specs: BoxSpec[] = [];
  for (const b of blocks) {
    specs.push({ w: b.w, h: b.h, d: b.d, x: b.x, y: b.y + b.h * 0.5, z: b.z });
    const col: ColliderBox3D = {
      minX: b.x - b.w * 0.5,
      maxX: b.x + b.w * 0.5,
      minY: b.y,
      maxY: b.y + b.h,
      minZ: b.z - b.d * 0.5,
      maxZ: b.z + b.d * 0.5,
      walkableTop: b.walkableTop ?? true,
      tag: 'cover',
    };
    collector.boxes.push(col);
  }
  const mesh = buildBatchedBoxesMesh(specs, material, {
    castShadow: true,
    receiveShadow: true,
    name,
  });
  if (mesh) {
    collector.group.add(mesh);
    collector.wallMeshes.push(mesh);
  }
}

/**
 * Helper to mount an architectural wall stencil sign plaque at a given world position & yaw.
 */
export function addWallStencilPlaque(
  parent: THREE.Group,
  mats: HideoutMaterialRegistry,
  opts: {
    code: string;
    title: string;
    subtitle?: string;
    accentHex: number;
    x: number;
    y: number;
    z: number;
    rotY?: number;
    width?: number;
    height?: number;
  }
): void {
  const mat = mats.createStencilMaterial(opts.code, opts.title, opts.accentHex, opts.subtitle);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(opts.width ?? 4.6, opts.height ?? 2.3),
    mat
  );
  mesh.position.set(opts.x, opts.y, opts.z);
  mesh.rotation.y = opts.rotY ?? 0;
  parent.add(mesh);
}
