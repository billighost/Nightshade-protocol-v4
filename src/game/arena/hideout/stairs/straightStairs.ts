import {
  buildBatchedBoxesMesh,
  buildInstancedBoxes,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector, StraightStairOptions } from './types';

/**
 * Builds an AAA-precision, silky-walkable straight staircase with ZERO overlapping/Z-fighting faces
 * and 100% solid stepped handrail colliders:
 * - Treads & crisp recessed risers stay strictly inside `[-width/2, +width/2]` (no coplanar side faces!)
 * - Structural steel stringers & stanchions sit cleanly OUTSIDE the treads (`±(width/2 + 0.07)`)
 *   at exact `diagLen` so nothing ever pokes into stairs or clips landings
 * - Automatic stepped `ColliderBox3D` segments along every enabled handrail side physically block
 *   walking through handrails at the bottom, middle, or top while keeping walking underneath unobstructed!
 */
export function buildStraightStairFlight(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: StraightStairOptions
): void {
  const {
    x,
    z,
    width,
    length,
    yStart,
    yEnd,
    axis,
    railMinSide = true,
    railMaxSide = true,
    targetGroup,
    accentMat,
  } = opts;

  const hostGroup = targetGroup ?? collector.group;
  const deltaY = Math.abs(yEnd - yStart);
  const steps = opts.steps ?? Math.max(8, Math.round(deltaY / 0.22));
  const treadSpecs: BoxSpec[] = [];
  const riserSpecs: BoxSpec[] = [];
  const nosingSpecs: BoxSpec[] = [];
  const stringerSpecs: BoxSpec[] = [];
  const railBarSpecs: BoxSpec[] = [];

  const runPerStep = length / steps;
  const risePerStep = (yEnd - yStart) / steps;
  const absRise = Math.abs(risePerStep);
  const minX = axis === 'x' ? x - length / 2 : x - width / 2;
  const maxX = axis === 'x' ? x + length / 2 : x + width / 2;
  const minZ = axis === 'z' ? z - length / 2 : z - width / 2;
  const maxZ = axis === 'z' ? z + length / 2 : z + width / 2;

  const treadW = Math.max(0.4, width - 0.04);
  const riserW = Math.max(0.36, width - 0.08);
  const treadThick = 0.12;
  const climbSign = yEnd >= yStart ? 1 : -1;

  for (let i = 0; i < steps; i++) {
    const tMid = (i + 0.5) / steps;
    const stepTopY = climbSign > 0 ? yStart + risePerStep * (i + 1) : yStart + risePerStep * i;
    const localTreadThick = treadThick;
    const riserCenterY = stepTopY - localTreadThick - Math.max(0.04, absRise - localTreadThick * 0.4) * 0.5;
    const riserH = Math.max(0.08, absRise + 0.03);

    if (axis === 'z') {
      const sz = minZ + tMid * length;
      treadSpecs.push({
        w: treadW,
        h: localTreadThick,
        d: Math.max(0.06, runPerStep - 0.008),
        x,
        y: stepTopY - localTreadThick * 0.5,
        z: sz,
      });
      riserSpecs.push({
        w: riserW,
        h: riserH,
        d: 0.06,
        x,
        y: riserCenterY,
        z: sz - climbSign * (runPerStep * 0.46),
      });
      nosingSpecs.push({
        w: Math.max(0.3, width - 0.24),
        h: 0.02,
        d: 0.04,
        x,
        y: stepTopY + 0.012,
        z: sz - climbSign * (runPerStep * 0.45),
      });
    } else {
      const sx = minX + tMid * length;
      treadSpecs.push({
        w: Math.max(0.06, runPerStep - 0.008),
        h: localTreadThick,
        d: treadW,
        x: sx,
        y: stepTopY - localTreadThick * 0.5,
        z,
      });
      riserSpecs.push({
        w: 0.06,
        h: riserH,
        d: riserW,
        x: sx - climbSign * (runPerStep * 0.46),
        y: riserCenterY,
        z,
      });
      nosingSpecs.push({
        w: 0.04,
        h: 0.02,
        d: Math.max(0.3, width - 0.24),
        x: sx - climbSign * (runPerStep * 0.45),
        y: stepTopY + 0.012,
        z,
      });
    }
  }

  const slopeAngle = Math.atan2(yEnd - yStart, length);
  const diagLen = Math.hypot(length, yEnd - yStart);
  const midY = (yStart + yEnd) * 0.5;
  const sideOffsets: number[] = [];
  if (railMinSide) sideOffsets.push(-(width * 0.5 + 0.07));
  if (railMaxSide) sideOffsets.push(width * 0.5 + 0.07);

  const postCount = Math.max(4, Math.round(length / 1.75));
  const segCount = Math.max(4, Math.ceil(length / 1.35));

  for (const offset of sideOffsets) {
    if (axis === 'z') {
      stringerSpecs.push({
        w: 0.14,
        h: 0.28,
        d: diagLen,
        x: x + offset,
        y: midY - 0.19,
        z,
        rotX: -slopeAngle,
      });
      const railLen = Math.max(0.2, diagLen - 0.08);
      railBarSpecs.push(
        {
          w: 0.06,
          h: 0.06,
          d: railLen,
          x: x + offset,
          y: midY + 1.08,
          z,
          rotX: -slopeAngle,
        },
        {
          w: 0.028,
          h: 0.028,
          d: railLen,
          x: x + offset,
          y: midY + 0.56,
          z,
          rotX: -slopeAngle,
        }
      );
      const skipTopPostIdx = yEnd >= yStart ? postCount : 0;
      for (let p = 0; p <= postCount; p++) {
        if (p === skipTopPostIdx) continue;
        const pt = p / postCount;
        const postBaseY = yStart + (yEnd - yStart) * pt;
        stringerSpecs.push({
          w: 0.046,
          h: 1.01,
          d: 0.046,
          x: x + offset,
          y: postBaseY + 0.02 + 0.505,
          z: minZ + pt * length,
        });
      }
      for (let s = 0; s < segCount; s++) {
        const t0 = s / segCount;
        const t1 = (s + 1) / segCount;
        const sy0 = yStart + (yEnd - yStart) * t0;
        const sy1 = yStart + (yEnd - yStart) * t1;
        const segMinY = Math.min(sy0, sy1) - 0.12;
        const segMaxY = Math.max(sy0, sy1) + 1.28;
        collector.boxes.push({
          minX: x + offset - 0.09,
          maxX: x + offset + 0.09,
          minY: segMinY,
          maxY: segMaxY,
          minZ: minZ + t0 * length,
          maxZ: minZ + t1 * length,
          walkableTop: false,
          tag: 'stair_rail',
        });
      }
    } else {
      stringerSpecs.push({
        w: diagLen,
        h: 0.28,
        d: 0.14,
        x,
        y: midY - 0.19,
        z: z + offset,
        rotZ: slopeAngle,
      });
      const railLen = Math.max(0.2, diagLen - 0.08);
      railBarSpecs.push(
        {
          w: railLen,
          h: 0.06,
          d: 0.06,
          x,
          y: midY + 1.08,
          z: z + offset,
          rotZ: slopeAngle,
        },
        {
          w: railLen,
          h: 0.028,
          d: 0.028,
          x,
          y: midY + 0.56,
          z: z + offset,
          rotZ: slopeAngle,
        }
      );
      const skipTopPostIdx = yEnd >= yStart ? postCount : 0;
      for (let p = 0; p <= postCount; p++) {
        if (p === skipTopPostIdx) continue;
        const pt = p / postCount;
        const postBaseY = yStart + (yEnd - yStart) * pt;
        stringerSpecs.push({
          w: 0.046,
          h: 1.01,
          d: 0.046,
          x: minX + pt * length,
          y: postBaseY + 0.02 + 0.505,
          z: z + offset,
        });
      }
      for (let s = 0; s < segCount; s++) {
        const t0 = s / segCount;
        const t1 = (s + 1) / segCount;
        const sy0 = yStart + (yEnd - yStart) * t0;
        const sy1 = yStart + (yEnd - yStart) * t1;
        const segMinY = Math.min(sy0, sy1) - 0.12;
        const segMaxY = Math.max(sy0, sy1) + 1.28;
        collector.boxes.push({
          minX: minX + t0 * length,
          maxX: minX + t1 * length,
          minY: segMinY,
          maxY: segMaxY,
          minZ: z + offset - 0.09,
          maxZ: z + offset + 0.09,
          walkableTop: false,
          tag: 'stair_rail',
        });
      }
    }
  }

  const soffitW = Math.max(0.32, width - 0.1);
  const soffitLen = Math.max(0.25, diagLen - 0.36);
  const soffitSpecs: BoxSpec[] =
    axis === 'z'
      ? [
          {
            w: soffitW,
            h: 0.34,
            d: soffitLen,
            x,
            y: midY - 0.31,
            z,
            rotX: -slopeAngle,
          },
        ]
      : [
          {
            w: soffitLen,
            h: 0.34,
            d: soffitW,
            x,
            y: midY - 0.31,
            z,
            rotZ: slopeAngle,
          },
        ];

  const soffitMesh = buildBatchedBoxesMesh(soffitSpecs, mats.darkConcrete, {
    receiveShadow: true,
    name: 'StairSoffit',
  });
  if (soffitMesh) {
    hostGroup.add(soffitMesh);
    collector.wallMeshes.push(soffitMesh);
  }

  const bodySegCount = Math.max(steps, Math.ceil(length / 0.44));
  const halfFullW = width * 0.5 + 0.08;
  for (let b = 0; b < bodySegCount; b++) {
    const t0 = b / bodySegCount;
    const t1 = (b + 1) / bodySegCount;
    const sy0 = yStart + (yEnd - yStart) * t0;
    const sy1 = yStart + (yEnd - yStart) * t1;
    const lowY = Math.min(sy0, sy1);
    if (axis === 'z') {
      collector.boxes.push({
        minX: x - halfFullW,
        maxX: x + halfFullW,
        minY: lowY - 0.56,
        maxY: lowY - 0.02,
        minZ: minZ + t0 * length,
        maxZ: minZ + t1 * length,
        walkableTop: false,
        tag: 'stair_body',
      });
    } else {
      collector.boxes.push({
        minX: minX + t0 * length,
        maxX: minX + t1 * length,
        minY: lowY - 0.56,
        maxY: lowY - 0.02,
        minZ: z - halfFullW,
        maxZ: z + halfFullW,
        walkableTop: false,
        tag: 'stair_body',
      });
    }
  }

  const treadInst = buildInstancedBoxes(treadSpecs, mats.stairTread, {
    receiveShadow: true,
    name: 'StairTreads',
  });
  if (treadInst) {
    hostGroup.add(treadInst);
    collector.wallMeshes.push(treadInst);
  }

  const riserInst = buildInstancedBoxes(riserSpecs, mats.stairRiser, {
    receiveShadow: true,
    name: 'StairRisers',
  });
  if (riserInst) {
    hostGroup.add(riserInst);
  }

  const nosingInst = buildInstancedBoxes(nosingSpecs, accentMat, {
    name: 'StairNosing',
  });
  if (nosingInst) hostGroup.add(nosingInst);

  const stringerMesh = buildBatchedBoxesMesh(stringerSpecs, mats.structuralSteel, {
    name: 'StairStringersAndPosts',
  });
  if (stringerMesh) hostGroup.add(stringerMesh);

  const railBarMesh = buildBatchedBoxesMesh(railBarSpecs, mats.brushedMetal, {
    name: 'StairHandrails',
  });
  if (railBarMesh) hostGroup.add(railBarMesh);

  collector.ramps.push({
    minX,
    maxX,
    minZ,
    maxZ,
    yStart,
    yEnd,
    axis,
  });
}
