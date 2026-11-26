import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';

export interface JerseyBarricadeSpec {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  walkableTop?: boolean;
}

/**
 * Multi-part ballistic Jersey barricades batched into 3 tiny draw calls total.
 */
export function buildJerseyBarricades(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  specs: JerseyBarricadeSpec[],
  opts?: { targetGroup?: THREE.Group; accentMat?: THREE.Material; name?: string }
): void {
  if (specs.length === 0) return;
  const hostGroup = opts?.targetGroup ?? collector.group;
  const name = opts?.name ?? 'JerseyBarricades';

  const baseSpecs: BoxSpec[] = [];
  const coreSpecs: BoxSpec[] = [];
  const capSpecs: BoxSpec[] = [];
  const trimSpecs: BoxSpec[] = [];

  for (const s of specs) {
    const baseH = Math.min(0.24, s.h * 0.25);
    const capH = 0.1;
    const coreH = Math.max(0.2, s.h - baseH - capH - 0.008);
    const coreW = Math.max(0.3, s.w - 0.14);
    const coreD = Math.max(0.3, s.d - 0.18);

    baseSpecs.push({
      w: s.w,
      h: baseH - 0.004,
      d: s.d,
      x: s.x,
      y: s.y + 0.004 + (baseH - 0.004) * 0.5,
      z: s.z,
    });
    coreSpecs.push({
      w: coreW,
      h: coreH,
      d: coreD,
      x: s.x,
      y: s.y + baseH + 0.004 + coreH * 0.5,
      z: s.z,
    });
    capSpecs.push({
      w: Math.max(0.32, s.w - 0.08),
      h: capH,
      d: Math.max(0.32, s.d - 0.12),
      x: s.x,
      y: s.y + s.h - capH * 0.5,
      z: s.z,
    });

    const endThick = 0.05;
    const gussetY = s.y + baseH + 0.004 + coreH * 0.5;
    if (s.w >= s.d) {
      const endOffset = coreW * 0.5 + endThick * 0.5 + 0.004;
      capSpecs.push(
        { w: endThick, h: coreH - 0.02, d: coreD - 0.04, x: s.x - endOffset, y: gussetY, z: s.z },
        { w: endThick, h: coreH - 0.02, d: coreD - 0.04, x: s.x + endOffset, y: gussetY, z: s.z }
      );
      const trimZ = coreD * 0.5 + 0.012;
      trimSpecs.push(
        { w: Math.max(0.2, coreW - 0.18), h: 0.06, d: 0.016, x: s.x, y: s.y + baseH + coreH * 0.72, z: s.z - trimZ },
        { w: Math.max(0.2, coreW - 0.18), h: 0.06, d: 0.016, x: s.x, y: s.y + baseH + coreH * 0.72, z: s.z + trimZ }
      );
    } else {
      const endOffset = coreD * 0.5 + endThick * 0.5 + 0.004;
      capSpecs.push(
        { w: coreW - 0.04, h: coreH - 0.02, d: endThick, x: s.x, y: gussetY, z: s.z - endOffset },
        { w: coreW - 0.04, h: coreH - 0.02, d: endThick, x: s.x, y: gussetY, z: s.z + endOffset }
      );
      const trimX = coreW * 0.5 + 0.012;
      trimSpecs.push(
        { w: 0.016, h: 0.06, d: Math.max(0.2, coreD - 0.18), x: s.x - trimX, y: s.y + baseH + coreH * 0.72, z: s.z },
        { w: 0.016, h: 0.06, d: Math.max(0.2, coreD - 0.18), x: s.x + trimX, y: s.y + baseH + coreH * 0.72, z: s.z }
      );
    }

    collector.boxes.push({
      minX: s.x - s.w * 0.5,
      maxX: s.x + s.w * 0.5,
      minY: s.y,
      maxY: s.y + s.h,
      minZ: s.z - s.d * 0.5,
      maxZ: s.z + s.d * 0.5,
      walkableTop: s.walkableTop ?? true,
    });
  }

  const baseMesh = buildBatchedBoxesMesh(baseSpecs, mats.darkConcrete, {
    castShadow: true,
    receiveShadow: true,
    name: `${name}_Base`,
  });
  const coreMesh = buildBatchedBoxesMesh(coreSpecs, mats.concreteWallLight, {
    castShadow: true,
    receiveShadow: true,
    name: `${name}_Core`,
  });
  const capMesh = buildBatchedBoxesMesh(capSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: `${name}_ArmorCap`,
  });
  const trimMesh = buildBatchedBoxesMesh(trimSpecs, opts?.accentMat ?? mats.hazardStripe, {
    name: `${name}_Trim`,
  });

  for (const m of [baseMesh, coreMesh, capMesh]) {
    if (m) {
      hostGroup.add(m);
      collector.wallMeshes.push(m);
    }
  }
  if (trimMesh) hostGroup.add(trimMesh);
}

export interface TacticalBenchSpec {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  accentEdge?: 'front' | 'back' | 'both';
}

/**
 * Sleek AAA tactical briefing / gunsmith / firing-range workstation consoles.
 */
export function buildTacticalConsoleBenches(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  specs: TacticalBenchSpec[],
  opts?: { targetGroup?: THREE.Group; accentMat: THREE.Material; name?: string }
): void {
  if (specs.length === 0) return;
  const hostGroup = opts?.targetGroup ?? collector.group;
  const name = opts?.name ?? 'TacticalBenches';

  const frameSpecs: BoxSpec[] = [];
  const topSpecs: BoxSpec[] = [];
  const trimSpecs: BoxSpec[] = [];

  for (const s of specs) {
    const topH = 0.12;
    const legH = s.h - topH - 0.008;
    const alongX = s.w >= s.d;
    const legThick = 0.14;
    const legInset = 0.09;

    topSpecs.push({
      w: s.w,
      h: topH,
      d: s.d,
      x: s.x,
      y: s.y + s.h - topH * 0.5,
      z: s.z,
    });

    if (alongX) {
      const innerSpan = Math.max(0.24, s.w - 0.34);
      const chassisD = Math.max(0.24, s.d - 0.24);
      const chassisH = legH * 0.66;
      frameSpecs.push({
        w: innerSpan,
        h: chassisH,
        d: chassisD,
        x: s.x,
        y: s.y + 0.004 + legH * 0.56,
        z: s.z,
      });
      frameSpecs.push(
        { w: legThick, h: legH, d: s.d - 0.06, x: s.x - s.w * 0.5 + legInset, y: s.y + 0.004 + legH * 0.5, z: s.z },
        { w: legThick, h: legH, d: s.d - 0.06, x: s.x + s.w * 0.5 - legInset, y: s.y + 0.004 + legH * 0.5, z: s.z }
      );
      const trimZ = s.d * 0.5 + 0.012;
      trimSpecs.push(
        { w: innerSpan, h: 0.036, d: 0.016, x: s.x, y: s.y + s.h - topH * 0.5, z: s.z - trimZ },
        { w: innerSpan, h: 0.036, d: 0.016, x: s.x, y: s.y + s.h - topH * 0.5, z: s.z + trimZ }
      );
    } else {
      const innerSpan = Math.max(0.24, s.d - 0.34);
      const chassisW = Math.max(0.24, s.w - 0.24);
      const chassisH = legH * 0.66;
      frameSpecs.push({
        w: chassisW,
        h: chassisH,
        d: innerSpan,
        x: s.x,
        y: s.y + 0.004 + legH * 0.56,
        z: s.z,
      });
      frameSpecs.push(
        { w: s.w - 0.06, h: legH, d: legThick, x: s.x, y: s.y + 0.004 + legH * 0.5, z: s.z - s.d * 0.5 + legInset },
        { w: s.w - 0.06, h: legH, d: legThick, x: s.x, y: s.y + 0.004 + legH * 0.5, z: s.z + s.d * 0.5 - legInset }
      );
      const trimX = s.w * 0.5 + 0.012;
      trimSpecs.push(
        { w: 0.016, h: 0.036, d: innerSpan, x: s.x - trimX, y: s.y + s.h - topH * 0.5, z: s.z },
        { w: 0.016, h: 0.036, d: innerSpan, x: s.x + trimX, y: s.y + s.h - topH * 0.5, z: s.z }
      );
    }

    collector.boxes.push({
      minX: s.x - s.w * 0.5,
      maxX: s.x + s.w * 0.5,
      minY: s.y,
      maxY: s.y + s.h,
      minZ: s.z - s.d * 0.5,
      maxZ: s.z + s.d * 0.5,
      walkableTop: true,
    });
  }

  const frameMesh = buildBatchedBoxesMesh(frameSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: `${name}_Frame`,
  });
  const topMesh = buildBatchedBoxesMesh(topSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: `${name}_Top`,
  });
  const trimMesh = opts?.accentMat
    ? buildBatchedBoxesMesh(trimSpecs, opts.accentMat, { name: `${name}_Trim` })
    : null;

  for (const m of [frameMesh, topMesh]) {
    if (m) {
      hostGroup.add(m);
      collector.wallMeshes.push(m);
    }
  }
  if (trimMesh) hostGroup.add(trimMesh);
}

export interface WallEquipmentBaySpec {
  axis: 'x' | 'z';
  coord: number;
  inwardDir: 1 | -1;
  centerAlong: number;
  baseY: number;
  width: number;
  height: number;
  depth?: number;
}

/**
 * Recessed architectural armored weapon-locker / tactical gear wall bays.
 */
export function buildWallEquipmentBays(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  specs: WallEquipmentBaySpec[],
  opts?: { targetGroup?: THREE.Group; accentMat: THREE.Material; name?: string }
): void {
  if (specs.length === 0) return;
  const hostGroup = opts?.targetGroup ?? collector.group;
  const name = opts?.name ?? 'WallEquipmentBays';

  const frameSpecs: BoxSpec[] = [];
  const backSpecs: BoxSpec[] = [];
  const rackSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  for (const s of specs) {
    const depth = s.depth ?? 0.52;
    const midOut = s.coord + s.inwardDir * (depth * 0.5);
    const backCoord = s.coord + s.inwardDir * 0.06;
    const frontCoord = s.coord + s.inwardDir * (depth - 0.08);
    const cols = Math.max(2, Math.round(s.width / 1.1));
    const capH = 0.22;
    const plinthH = 0.24;
    const sideH = s.height - capH - plinthH - 0.008;
    const sideMidY = s.baseY + plinthH + 0.004 + sideH * 0.5;

    const push = (arr: BoxSpec[], alongLen: number, h: number, thick: number, alongPos: number, y: number, cPos: number) => {
      if (s.axis === 'x') {
        arr.push({ w: alongLen, h, d: thick, x: alongPos, y, z: cPos });
      } else {
        arr.push({ w: thick, h, d: alongLen, x: cPos, y, z: alongPos });
      }
    };

    push(backSpecs, s.width - 0.38, sideH - 0.02, 0.08, s.centerAlong, sideMidY, backCoord);
    push(frameSpecs, s.width, capH, depth, s.centerAlong, s.baseY + s.height - capH * 0.5, midOut);
    push(frameSpecs, s.width, plinthH - 0.004, depth, s.centerAlong, s.baseY + 0.004 + (plinthH - 0.004) * 0.5, midOut);
    push(frameSpecs, 0.18, sideH, depth, s.centerAlong - s.width * 0.5 + 0.09, sideMidY, midOut);
    push(frameSpecs, 0.18, sideH, depth, s.centerAlong + s.width * 0.5 - 0.09, sideMidY, midOut);

    const shelfY = s.baseY + s.height * 0.42;
    const divH = sideH - 0.1;
    const divMidY = s.baseY + plinthH + 0.004 + divH * 0.5;
    for (let i = 1; i < cols; i++) {
      const p = s.centerAlong - s.width * 0.5 + (s.width * i) / cols;
      push(frameSpecs, 0.07, divH, depth - 0.2, p, divMidY, s.coord + s.inwardDir * (0.12 + (depth - 0.2) * 0.5));
    }

    const bayCellW = (s.width - 0.36) / cols;
    for (let c = 0; c < cols; c++) {
      const cellCenter = s.centerAlong - s.width * 0.5 + 0.18 + bayCellW * (c + 0.5);
      const cellInnerW = Math.max(0.2, bayCellW - 0.09);
      push(rackSpecs, cellInnerW, 0.07, depth - 0.22, cellCenter, shelfY, s.coord + s.inwardDir * (0.13 + (depth - 0.22) * 0.5));
      push(rackSpecs, cellInnerW, 0.055, 0.07, cellCenter, s.baseY + s.height * 0.72, backCoord + s.inwardDir * 0.12);
    }

    push(lightSpecs, s.width - 0.44, 0.05, 0.06, s.centerAlong, s.baseY + s.height - capH - 0.04, frontCoord);

    const paddedDepth = depth + 0.06;
    const minC = Math.min(s.coord, s.coord + s.inwardDir * paddedDepth);
    const maxC = Math.max(s.coord, s.coord + s.inwardDir * paddedDepth);
    if (s.axis === 'x') {
      collector.boxes.push({
        minX: s.centerAlong - s.width * 0.5,
        maxX: s.centerAlong + s.width * 0.5,
        minY: s.baseY,
        maxY: s.baseY + s.height,
        minZ: minC,
        maxZ: maxC,
        walkableTop: false,
      });
    } else {
      collector.boxes.push({
        minX: minC,
        maxX: maxC,
        minY: s.baseY,
        maxY: s.baseY + s.height,
        minZ: s.centerAlong - s.width * 0.5,
        maxZ: s.centerAlong + s.width * 0.5,
        walkableTop: false,
      });
    }
  }

  const backMesh = buildBatchedBoxesMesh(backSpecs, mats.armoredSteel, { receiveShadow: true, name: `${name}_Back` });
  const frameMesh = buildBatchedBoxesMesh(frameSpecs, mats.structuralSteel, { castShadow: true, receiveShadow: true, name: `${name}_Frame` });
  const rackMesh = buildBatchedBoxesMesh(rackSpecs, mats.brushedMetal, { name: `${name}_Racks` });
  const lightMesh = opts?.accentMat
    ? buildBatchedBoxesMesh(lightSpecs, opts.accentMat, { name: `${name}_Lights` })
    : null;

  for (const m of [backMesh, frameMesh, rackMesh]) {
    if (m) {
      hostGroup.add(m);
      collector.wallMeshes.push(m);
    }
  }
  if (lightMesh) hostGroup.add(lightMesh);
}

/**
 * Corrugated tactical steel shipping container monolith.
 */
export function buildShippingContainer(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
    targetGroup?: THREE.Group;
    name?: string;
  }
): void {
  const { x, y, z, w, h, d, targetGroup, name = 'ShippingContainer' } = opts;
  const hostGroup = targetGroup ?? collector.group;

  const coreSpecs: BoxSpec[] = [{ w: w - 0.18, h: h - 0.18, d: d - 0.18, x, y: y + h * 0.5, z }];
  const frameSpecs: BoxSpec[] = [];
  const ribSpecs: BoxSpec[] = [];
  const hazardSpecs: BoxSpec[] = [];

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      frameSpecs.push({
        w: 0.22,
        h: h - 0.004,
        d: 0.22,
        x: x + sx * (w * 0.5 - 0.11),
        y: y + 0.004 + (h - 0.004) * 0.5,
        z: z + sz * (d * 0.5 - 0.11),
      });
    }
    frameSpecs.push(
      { w: 0.18, h: 0.18, d: Math.max(0.2, d - 0.46), x: x + sx * (w * 0.5 - 0.09), y: y + h - 0.09, z },
      { w: 0.18, h: 0.18, d: Math.max(0.2, d - 0.46), x: x + sx * (w * 0.5 - 0.09), y: y + 0.094, z }
    );
  }
  for (const sz of [-1, 1]) {
    frameSpecs.push(
      { w: Math.max(0.2, w - 0.46), h: 0.18, d: 0.18, x, y: y + h - 0.09, z: z + sz * (d * 0.5 - 0.09) },
      { w: Math.max(0.2, w - 0.46), h: 0.18, d: 0.18, x, y: y + 0.094, z: z + sz * (d * 0.5 - 0.09) }
    );
    hazardSpecs.push({
      w: w - 0.48,
      h: 0.22,
      d: 0.04,
      x,
      y: y + 0.34,
      z: z + sz * (d * 0.5 - 0.04),
    });
  }

  const ribCount = Math.max(4, Math.floor(d / 0.52));
  for (let i = 1; i < ribCount; i++) {
    const rz = z - d * 0.5 + (d * i) / ribCount;
    ribSpecs.push(
      { w: 0.07, h: h - 0.42, d: 0.14, x: x - w * 0.5 + 0.045, y: y + h * 0.5, z: rz },
      { w: 0.07, h: h - 0.42, d: 0.14, x: x + w * 0.5 - 0.045, y: y + h * 0.5, z: rz }
    );
  }

  const coreMesh = buildBatchedBoxesMesh(coreSpecs, mats.armoredSteel, { castShadow: true, receiveShadow: true, name: `${name}_Core` });
  const frameMesh = buildBatchedBoxesMesh(frameSpecs, mats.structuralSteel, { castShadow: true, receiveShadow: true, name: `${name}_Frame` });
  const ribMesh = buildBatchedBoxesMesh(ribSpecs, mats.brushedMetal, { receiveShadow: true, name: `${name}_Ribs` });
  const hazMesh = buildBatchedBoxesMesh(hazardSpecs, mats.hazardStripe, { name: `${name}_Hazard` });

  for (const m of [coreMesh, frameMesh, ribMesh]) {
    if (m) {
      hostGroup.add(m);
      collector.wallMeshes.push(m);
    }
  }
  if (hazMesh) hostGroup.add(hazMesh);

  collector.boxes.push({
    minX: x - w * 0.5,
    maxX: x + w * 0.5,
    minY: y,
    maxY: y + h,
    minZ: z - d * 0.5,
    maxZ: z + d * 0.5,
    walkableTop: false,
  });
}

/**
 * Mounts a compact, high-contrast lane / breach bay stencil plaque.
 */
export function addLaneMarkerPlaque(
  group: THREE.Group,
  mats: HideoutMaterialRegistry,
  opts: {
    label: string;
    accentHex: number;
    x: number;
    y: number;
    z: number;
    rotY?: number;
    width?: number;
    height?: number;
  }
): void {
  const mat = mats.createLaneMarkerMaterial(opts.label, opts.accentHex);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(opts.width ?? 1.2, opts.height ?? 0.6),
    mat
  );
  mesh.position.set(opts.x, opts.y, opts.z);
  mesh.rotation.y = opts.rotY ?? 0;
  group.add(mesh);
}
