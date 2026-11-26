import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector, GuardrailRunOptions } from './types';

/**
 * Builds a clean, axis-aligned architectural balcony/mezzanine/catwalk guardrail with:
 * - Toe-kick steel curb, evenly spaced vertical stanchion posts, brushed-metal mid & top rails
 * - Exact solid `ColliderBox3D` (`y .. y + 1.38`, `walkableTop: false`) so players can NEVER
 *   walk through balcony/catwalk handrails while walking underneath remains 100% unobstructed!
 */
export function buildGuardrailRun(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: GuardrailRunOptions
): void {
  const {
    x1,
    z1,
    x2,
    z2,
    y,
    height = 1.08,
    accentMat,
    targetGroup,
    includeCollider = true,
  } = opts;

  const hostGroup = targetGroup ?? collector.group;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  if (len < 0.2) return;

  const alongX = Math.abs(dx) >= Math.abs(dz);
  const cx = (x1 + x2) * 0.5;
  const cz = (z1 + z2) * 0.5;

  const postSpecs: BoxSpec[] = [];
  const barSpecs: BoxSpec[] = [];
  // Clean non-overlapping vertical & horizontal offsets between X and Z runs eliminate 100% of rail/post Z-fighting!
  const axisYOff = alongX ? 0 : 0.006;
  const curbH = 0.11;
  const curbY = y + 0.008 + axisYOff + curbH * 0.5;
  const postBottomY = y + 0.128 + axisYOff;
  const postTopY = y + height - 0.042 + axisYOff;
  const postH = Math.max(0.2, postTopY - postBottomY);

  // Toe-kick base curb (trimmed 6cm inside corner ends on Z runs so 90° corners never fight!)
  const curbLen = alongX ? len : Math.max(0.1, len - 0.11);
  postSpecs.push({
    w: alongX ? curbLen : 0.092,
    h: curbH,
    d: alongX ? 0.1 : curbLen,
    x: cx,
    y: curbY,
    z: cz,
  });

  // Vertical stanchions strictly between toe-kick curb and top rail (narrower than top rail -> zero Z-fighting!)
  const spans = Math.max(1, Math.round(len / 2.2));
  for (let i = 0; i <= spans; i++) {
    const t = i / spans;
    // Slight inset on Z-run endpoints avoids colliding with X-run corner posts at 90° joints!
    if (!alongX && (i === 0 || i === spans) && len > 0.6) continue;
    postSpecs.push({
      w: alongX ? 0.046 : 0.044,
      h: postH,
      d: alongX ? 0.046 : 0.044,
      x: x1 + dx * t,
      y: postBottomY + postH * 0.5,
      z: z1 + dz * t,
    });
  }

  // Brushed-metal top rail & mid safety rail (Z runs trimmed cleanly at corner posts & shifted +6mm in Y)
  const barLen = alongX ? len + 0.04 : Math.max(0.1, len - 0.09);
  barSpecs.push(
    {
      w: alongX ? barLen : 0.072,
      h: 0.072,
      d: alongX ? 0.074 : barLen,
      x: cx,
      y: y + height + axisYOff,
      z: cz,
    },
    {
      w: alongX ? barLen : 0.03,
      h: 0.032,
      d: alongX ? 0.032 : barLen,
      x: cx,
      y: y + height * 0.52 + axisYOff,
      z: cz,
    }
  );

  const postMesh = buildBatchedBoxesMesh(postSpecs, mats.structuralSteel, {
    name: 'GuardrailPosts',
  });
  if (postMesh) hostGroup.add(postMesh);

  const barMesh = buildBatchedBoxesMesh(barSpecs, mats.brushedMetal, {
    name: 'GuardrailBars',
  });
  if (barMesh) hostGroup.add(barMesh);

  if (accentMat) {
    const stripLen = Math.max(0.1, len - 0.12);
    const strip = buildBatchedBoxesMesh(
      [
        {
          w: alongX ? stripLen : 0.076,
          h: 0.056,
          d: alongX ? 0.076 : stripLen,
          x: cx,
          y: y - 0.18 + (alongX ? 0 : 0.008),
          z: cz,
        },
      ],
      accentMat,
      { name: 'GuardrailAccent' }
    );
    if (strip) hostGroup.add(strip);
  }

  if (includeCollider) {
    const halfThick = 0.1;
    collector.boxes.push({
      minX: Math.min(x1, x2) - (alongX ? 0 : halfThick),
      maxX: Math.max(x1, x2) + (alongX ? 0 : halfThick),
      minY: y,
      maxY: y + 1.38,
      minZ: Math.min(z1, z2) - (alongX ? halfThick : 0),
      maxZ: Math.max(z1, z2) + (alongX ? halfThick : 0),
      walkableTop: false,
      tag: 'guardrail',
    });
  }
}

/**
 * Builds a single watertight, zero-Z-fighting annular or helical prism BufferGeometry
 * spanning `[aStart, aEnd]` (automatically normalized to increasing angle for 100% outward-facing CCW normals!).
 */
export function buildHelicalAnnularGeometry(opts: {
  centerX: number;
  centerZ: number;
  rIn: number;
  rOut: number;
  aStart: number;
  aEnd: number;
  yBotStart: number;
  yBotEnd: number;
  yTopStart: number;
  yTopEnd: number;
  segments: number;
  capEnds?: boolean;
  uvScale?: number;
}): THREE.BufferGeometry {
  const {
    centerX,
    centerZ,
    rIn,
    rOut,
    segments,
    capEnds = true,
    uvScale = 0.25,
  } = opts;

  const reversed = opts.aEnd < opts.aStart;
  const a0All = reversed ? opts.aEnd : opts.aStart;
  const a1All = reversed ? opts.aStart : opts.aEnd;
  const yB0All = reversed ? opts.yBotEnd : opts.yBotStart;
  const yB1All = reversed ? opts.yBotStart : opts.yBotEnd;
  const yT0All = reversed ? opts.yTopEnd : opts.yTopStart;
  const yT1All = reversed ? opts.yTopStart : opts.yTopEnd;

  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    ax: number,
    ay: number,
    az: number,
    au: number,
    av: number,
    bx: number,
    by: number,
    bz: number,
    bu: number,
    bv: number,
    cx: number,
    cy: number,
    cz: number,
    cu: number,
    cv: number
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(au, av, bu, bv, cu, cv);
  };

  const span = a1All - a0All;
  const rMid = (rIn + rOut) * 0.5;
  const arcTotal = Math.abs(span) * rMid;

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const a0 = a0All + span * t0;
    const a1 = a0All + span * t1;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);

    const yb0 = yB0All + (yB1All - yB0All) * t0;
    const yb1 = yB0All + (yB1All - yB0All) * t1;
    const yt0 = yT0All + (yT1All - yT0All) * t0;
    const yt1 = yT0All + (yT1All - yT0All) * t1;

    const i0x = centerX + c0 * rIn;
    const i0z = centerZ + s0 * rIn;
    const o0x = centerX + c0 * rOut;
    const o0z = centerZ + s0 * rOut;
    const i1x = centerX + c1 * rIn;
    const i1z = centerZ + s1 * rIn;
    const o1x = centerX + c1 * rOut;
    const o1z = centerZ + s1 * rOut;

    const u0 = t0 * arcTotal * uvScale;
    const u1 = t1 * arcTotal * uvScale;
    const vRad = (rOut - rIn) * uvScale;

    pushTri(i0x, yt0, i0z, u0, 0, i1x, yt1, i1z, u1, 0, o0x, yt0, o0z, u0, vRad);
    pushTri(i1x, yt1, i1z, u1, 0, o1x, yt1, o1z, u1, vRad, o0x, yt0, o0z, u0, vRad);

    pushTri(i0x, yb0, i0z, u0, 0, o0x, yb0, o0z, u0, vRad, i1x, yb1, i1z, u1, 0);
    pushTri(i1x, yb1, i1z, u1, 0, o0x, yb0, o0z, u0, vRad, o1x, yb1, o1z, u1, vRad);

    pushTri(o0x, yb0, o0z, u0, yb0 * uvScale, o0x, yt0, o0z, u0, yt0 * uvScale, o1x, yb1, o1z, u1, yb1 * uvScale);
    pushTri(o0x, yt0, o0z, u0, yt0 * uvScale, o1x, yt1, o1z, u1, yt1 * uvScale, o1x, yb1, o1z, u1, yb1 * uvScale);

    pushTri(i0x, yb0, i0z, u0, yb0 * uvScale, i1x, yb1, i1z, u1, yb1 * uvScale, i0x, yt0, i0z, u0, yt0 * uvScale);
    pushTri(i0x, yt0, i0z, u0, yt0 * uvScale, i1x, yb1, i1z, u1, yb1 * uvScale, i1x, yt1, i1z, u1, yt1 * uvScale);

    if (capEnds && i === 0) {
      pushTri(i0x, yb0, i0z, 0, yb0 * uvScale, i0x, yt0, i0z, 0, yt0 * uvScale, o0x, yb0, o0z, vRad, yb0 * uvScale);
      pushTri(i0x, yt0, i0z, 0, yt0 * uvScale, o0x, yt0, o0z, vRad, yt0 * uvScale, o0x, yb0, o0z, vRad, yb0 * uvScale);
    }

    if (capEnds && i === segments - 1) {
      pushTri(i1x, yb1, i1z, 0, yb1 * uvScale, o1x, yb1, o1z, vRad, yb1 * uvScale, i1x, yt1, i1z, 0, yt1 * uvScale);
      pushTri(i1x, yt1, i1z, 0, yt1 * uvScale, o1x, yb1, o1z, vRad, yb1 * uvScale, o1x, yt1, o1z, vRad, yt1 * uvScale);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Merges multiple non-indexed `BufferGeometry` slices (positions + uvs) into a single draw call.
 */
export function mergeSimpleGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalPos = 0;
  let totalUv = 0;
  for (const g of geos) {
    totalPos += g.attributes.position.array.length;
    totalUv += g.attributes.uv.array.length;
  }
  const pos = new Float32Array(totalPos);
  const uv = new Float32Array(totalUv);
  let pOff = 0;
  let uOff = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, pOff);
    uv.set(g.attributes.uv.array as Float32Array, uOff);
    pOff += g.attributes.position.array.length;
    uOff += g.attributes.uv.array.length;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Subtracts angle gap ranges from `[startAngle, endAngle]` (assuming `startAngle < endAngle`),
 * returning clean contiguous sub-arc intervals for zero-overlap curved guardrails.
 */
export function subtractArcGaps(
  startAngle: number,
  endAngle: number,
  gaps?: Array<{ minAngle: number; maxAngle: number }>
): Array<[number, number]> {
  let arcs: Array<[number, number]> = [[startAngle, endAngle]];
  if (!gaps || gaps.length === 0) return arcs;

  const twoPi = Math.PI * 2;
  for (const g of gaps) {
    for (const shift of [-twoPi, 0, twoPi]) {
      const gMin = g.minAngle + shift;
      const gMax = g.maxAngle + shift;
      const next: Array<[number, number]> = [];
      for (const [a0, a1] of arcs) {
        if (gMax <= a0 + 0.002 || gMin >= a1 - 0.002) {
          next.push([a0, a1]);
        } else {
          if (gMin > a0 + 0.015) next.push([a0, gMin]);
          if (gMax < a1 - 0.015) next.push([gMax, a1]);
        }
      }
      arcs = next;
    }
  }
  return arcs;
}
