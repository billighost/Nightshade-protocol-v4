import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { WalkableRingSlab } from '../types';
import {
  buildHelicalAnnularGeometry,
  mergeSimpleGeometries,
  subtractArcGaps,
} from './guardrails';
import type { CurvedSpiralStairOptions, FloorGeometryCollector } from './types';

/**
 * Builds an AAA-precision **Round / Spiral Staircase wrapping around an Open Central Hole/Shaft**:
 * - True non-overlapping radial annular-wedge treads (1 merged BufferGeometry, ZERO inner-rim Z-fighting!)
 * - Continuous smooth helical handrails (ZERO segment overlap!)
 * - Slim vertical stanchions stopping cleanly below top rail
 * - Solid `stair_body` underside colliders AND solid waist-high colliders on BOTH inner AND outer enabled rails
 * - Exact polar `WalkableArcRamp` collider (`r ∈ [innerRadius, outerRadius]`) leaving `r < innerRadius` truly open!
 */
export function buildCurvedSpiralStairs(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: CurvedSpiralStairOptions
): void {
  const {
    centerX,
    centerZ,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    yStart,
    yEnd,
    accentMat,
    innerGuardrail = true,
    outerGuardrail = false,
    targetGroup,
  } = opts;
  const hostGroup = targetGroup ?? collector.group;

  const deltaY = Math.abs(yEnd - yStart);
  const absAngle = Math.abs(endAngle - startAngle);
  const steps = opts.steps ?? Math.max(18, Math.round(Math.max(deltaY / 0.19, absAngle * 11)));
  const radialWidth = outerRadius - innerRadius;
  const climbSign = yEnd >= yStart ? 1 : -1;
  const risePerStep = (yEnd - yStart) / steps;
  const absRise = Math.abs(risePerStep);
  const treadThick = Math.max(0.16, absRise + 0.04);

  const treadGeos: THREE.BufferGeometry[] = [];
  const accentGeos: THREE.BufferGeometry[] = [];
  const railPostSpecs: BoxSpec[] = [];
  const railRibbonGeos: THREE.BufferGeometry[] = [];

  const angleSpan = endAngle - startAngle;
  const anglePad = 0.0012;

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const a0 = startAngle + angleSpan * t0 + Math.sign(angleSpan) * anglePad;
    const a1 = startAngle + angleSpan * t1 - Math.sign(angleSpan) * anglePad;
    const aMid = (a0 + a1) * 0.5;
    const rawTopY = climbSign > 0 ? yStart + risePerStep * (i + 1) : yStart + risePerStep * i;
    const stepTopY =
      (climbSign > 0 && i === steps - 1) || (climbSign < 0 && i === 0)
        ? rawTopY - 0.008
        : rawTopY;
    const stepBotY = stepTopY - treadThick;

    treadGeos.push(
      buildHelicalAnnularGeometry({
        centerX,
        centerZ,
        rIn: innerRadius + 0.02,
        rOut: outerRadius - 0.02,
        aStart: a0,
        aEnd: a1,
        yBotStart: stepBotY,
        yBotEnd: stepBotY,
        yTopStart: stepTopY,
        yTopEnd: stepTopY,
        segments: 1,
        capEnds: true,
      })
    );

    if (i % 2 === 0) {
      accentGeos.push(
        buildHelicalAnnularGeometry({
          centerX,
          centerZ,
          rIn: innerRadius + 0.08,
          rOut: innerRadius + 0.18,
          aStart: a0,
          aEnd: a1,
          yBotStart: stepTopY + 0.004,
          yBotEnd: stepTopY + 0.004,
          yTopStart: stepTopY + 0.026,
          yTopEnd: stepTopY + 0.026,
          segments: 1,
          capEnds: true,
        })
      );
    }

    const cosA = Math.cos(aMid);
    const sinA = Math.sin(aMid);
    const rotY = -aMid;
    if (innerGuardrail && (i % 3 === 0 || i === steps - 1)) {
      const rInPost = innerRadius + 0.06;
      railPostSpecs.push({
        w: 0.044,
        h: 0.99,
        d: 0.044,
        x: centerX + cosA * rInPost,
        y: stepTopY + 0.015 + 0.495,
        z: centerZ + sinA * rInPost,
        rotY,
      });
    }
    if (outerGuardrail && (i % 4 === 0 || i === steps - 1)) {
      const rOutPost = outerRadius - 0.06;
      railPostSpecs.push({
        w: 0.044,
        h: 0.99,
        d: 0.044,
        x: centerX + cosA * rOutPost,
        y: stepTopY + 0.015 + 0.495,
        z: centerZ + sinA * rOutPost,
        rotY,
      });
    }
  }

  const railSegs = Math.max(24, steps);
  if (innerGuardrail) {
    const rInRail = innerRadius + 0.06;
    railRibbonGeos.push(
      buildHelicalAnnularGeometry({
        centerX,
        centerZ,
        rIn: rInRail - 0.036,
        rOut: rInRail + 0.036,
        aStart: startAngle,
        aEnd: endAngle,
        yBotStart: yStart + 1.03,
        yBotEnd: yEnd + 1.03,
        yTopStart: yStart + 1.1,
        yTopEnd: yEnd + 1.1,
        segments: railSegs,
        capEnds: true,
      }),
      buildHelicalAnnularGeometry({
        centerX,
        centerZ,
        rIn: rInRail - 0.025,
        rOut: rInRail + 0.025,
        aStart: startAngle,
        aEnd: endAngle,
        yBotStart: yStart + 0.55,
        yBotEnd: yEnd + 0.55,
        yTopStart: yStart + 0.585,
        yTopEnd: yEnd + 0.585,
        segments: railSegs,
        capEnds: true,
      })
    );
  }
  if (outerGuardrail) {
    const rOutRail = outerRadius - 0.06;
    railRibbonGeos.push(
      buildHelicalAnnularGeometry({
        centerX,
        centerZ,
        rIn: rOutRail - 0.036,
        rOut: rOutRail + 0.036,
        aStart: startAngle,
        aEnd: endAngle,
        yBotStart: yStart + 1.03,
        yBotEnd: yEnd + 1.03,
        yTopStart: yStart + 1.1,
        yTopEnd: yEnd + 1.1,
        segments: railSegs,
        capEnds: true,
      }),
      buildHelicalAnnularGeometry({
        centerX,
        centerZ,
        rIn: rOutRail - 0.025,
        rOut: rOutRail + 0.025,
        aStart: startAngle,
        aEnd: endAngle,
        yBotStart: yStart + 0.55,
        yBotEnd: yEnd + 0.55,
        yTopStart: yStart + 0.585,
        yTopEnd: yEnd + 0.585,
        segments: railSegs,
        capEnds: true,
      })
    );
  }

  if (treadGeos.length > 0) {
    const treadMesh = new THREE.Mesh(mergeSimpleGeometries(treadGeos), mats.stairTread);
    treadMesh.name = 'SpiralStairTreads';
    treadMesh.receiveShadow = true;
    treadMesh.castShadow = true;
    hostGroup.add(treadMesh);
    collector.wallMeshes.push(treadMesh);
  }

  if (accentGeos.length > 0) {
    const accMesh = new THREE.Mesh(mergeSimpleGeometries(accentGeos), accentMat);
    accMesh.name = 'SpiralStairAccents';
    hostGroup.add(accMesh);
  }

  const posts = buildBatchedBoxesMesh(railPostSpecs, mats.structuralSteel, {
    name: 'SpiralRailPosts',
  });
  if (posts) hostGroup.add(posts);

  if (railRibbonGeos.length > 0) {
    const barsMesh = new THREE.Mesh(mergeSimpleGeometries(railRibbonGeos), mats.brushedMetal);
    barsMesh.name = 'SpiralRailBars';
    hostGroup.add(barsMesh);
  }

  collector.arcRamps.push({
    centerX,
    centerZ,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    yStart,
    yEnd,
  });

  const radialSamples = Math.max(2, Math.ceil((radialWidth - 0.36) / 0.46));
  const subHalf = 0.24;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const angle = startAngle + angleSpan * t;
    const stepTopY = yStart + (yEnd - yStart) * t;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (let k = 0; k < radialSamples; k++) {
      const rf = radialSamples === 1 ? 0.5 : k / (radialSamples - 1);
      const r = innerRadius + 0.28 + rf * Math.max(0.1, radialWidth - 0.56);
      const sx = centerX + cosA * r;
      const sz = centerZ + sinA * r;
      collector.boxes.push({
        minX: sx - subHalf,
        maxX: sx + subHalf,
        minY: stepTopY - 0.62,
        maxY: stepTopY - 0.16,
        minZ: sz - subHalf,
        maxZ: sz + subHalf,
        walkableTop: false,
        tag: 'stair_body',
      });
    }
  }

  if (innerGuardrail) {
    const segs = Math.max(14, Math.round(absAngle * 6.5));
    const rCol = innerRadius - 0.1;
    for (let s = 0; s < segs; s++) {
      const t = (s + 0.5) / segs;
      const a = startAngle + angleSpan * t;
      const segY = yStart + (yEnd - yStart) * t;
      const px = centerX + Math.cos(a) * rCol;
      const pz = centerZ + Math.sin(a) * rCol;
      collector.boxes.push({
        minX: px - 0.24,
        maxX: px + 0.24,
        minY: segY - 0.12,
        maxY: segY + 1.32,
        minZ: pz - 0.24,
        maxZ: pz + 0.24,
        walkableTop: false,
        tag: 'spiral_inner_rail',
      });
    }
  }

  if (outerGuardrail) {
    const segs = Math.max(16, Math.round(absAngle * 7.5));
    const rCol = outerRadius + 0.08;
    for (let s = 0; s < segs; s++) {
      const t = (s + 0.5) / segs;
      const a = startAngle + angleSpan * t;
      const segY = yStart + (yEnd - yStart) * t;
      const px = centerX + Math.cos(a) * rCol;
      const pz = centerZ + Math.sin(a) * rCol;
      collector.boxes.push({
        minX: px - 0.24,
        maxX: px + 0.24,
        minY: segY - 0.12,
        maxY: segY + 1.32,
        minZ: pz - 0.24,
        maxZ: pz + 0.24,
        walkableTop: false,
        tag: 'spiral_outer_rail',
      });
    }
  }
}

/**
 * Builds an AAA zero-overlap circular / annular walkway deck around an open central hole:
 * - Single watertight custom annular `BufferGeometry` deck (ZERO wedge box seams, ZERO Z-fighting!)
 * - Continuous curved inner toe-kick curb, top handrail, mid bar, and glowing edge accent ribbons
 * - Optional `railGaps` cleanly open rail & colliders where skybridges or spiral stairs join the ring!
 */
export function buildRingWalkwayDeck(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: {
    centerX: number;
    centerZ: number;
    y: number;
    innerRadius: number;
    outerRadius: number;
    thickness?: number;
    segments?: number;
    startAngle?: number;
    endAngle?: number;
    material?: THREE.Material;
    accentMat?: THREE.Material;
    innerGuardrail?: boolean;
    railGaps?: Array<{ minAngle: number; maxAngle: number }>;
    outerGuardrail?: boolean;
    outerRailGaps?: Array<{ minAngle: number; maxAngle: number }>;
    targetGroup?: THREE.Group;
  }
): void {
  const {
    centerX,
    centerZ,
    y,
    innerRadius,
    outerRadius,
    thickness = 0.45,
    segments = 32,
    startAngle = 0,
    endAngle = Math.PI * 2,
    material = mats.concreteFloor,
    accentMat,
    innerGuardrail = true,
    railGaps,
    outerGuardrail = false,
    outerRailGaps,
    targetGroup,
  } = opts;
  const hostGroup = targetGroup ?? collector.group;

  const loA = Math.min(startAngle, endAngle);
  const hiA = Math.max(startAngle, endAngle);
  const span = hiA - loA;
  const isFullRing = span >= Math.PI * 2 - 0.01;

  const deckGeo = buildHelicalAnnularGeometry({
    centerX,
    centerZ,
    rIn: innerRadius,
    rOut: outerRadius,
    aStart: loA,
    aEnd: hiA,
    yBotStart: y - thickness,
    yBotEnd: y - thickness,
    yTopStart: y,
    yTopEnd: y,
    segments,
    capEnds: !isFullRing,
  });
  const deckMesh = new THREE.Mesh(deckGeo, material);
  deckMesh.name = 'RingWalkwayDeck';
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;
  hostGroup.add(deckMesh);
  collector.wallMeshes.push(deckMesh);

  if (accentMat) {
    const accGeo = buildHelicalAnnularGeometry({
      centerX,
      centerZ,
      rIn: innerRadius + 0.06,
      rOut: innerRadius + 0.18,
      aStart: loA,
      aEnd: hiA,
      yBotStart: y + 0.004,
      yBotEnd: y + 0.004,
      yTopStart: y + 0.032,
      yTopEnd: y + 0.032,
      segments,
      capEnds: !isFullRing,
    });
    const accMesh = new THREE.Mesh(accGeo, accentMat);
    accMesh.name = 'RingEdgeAccent';
    hostGroup.add(accMesh);
  }

  if (innerGuardrail) {
    const railArcs = subtractArcGaps(loA, hiA, railGaps);
    const railBarGeos: THREE.BufferGeometry[] = [];
    const curbGeos: THREE.BufferGeometry[] = [];
    const postSpecs: BoxSpec[] = [];
    const rIn = innerRadius + 0.08;

    for (const [arcStart, arcEnd] of railArcs) {
      const arcSpan = arcEnd - arcStart;
      const arcSegs = Math.max(4, Math.round((arcSpan / (Math.PI * 2)) * segments));
      const cap = !isFullRing || railArcs.length > 1 || arcSpan < Math.PI * 2 - 0.02;

      curbGeos.push(
        buildHelicalAnnularGeometry({
          centerX,
          centerZ,
          rIn: rIn - 0.044,
          rOut: rIn + 0.044,
          aStart: arcStart,
          aEnd: arcEnd,
          yBotStart: y + 0.036,
          yBotEnd: y + 0.036,
          yTopStart: y + 0.13,
          yTopEnd: y + 0.13,
          segments: arcSegs,
          capEnds: cap,
        })
      );

      railBarGeos.push(
        buildHelicalAnnularGeometry({
          centerX,
          centerZ,
          rIn: rIn - 0.036,
          rOut: rIn + 0.036,
          aStart: arcStart,
          aEnd: arcEnd,
          yBotStart: y + 1.03,
          yBotEnd: y + 1.03,
          yTopStart: y + 1.1,
          yTopEnd: y + 1.1,
          segments: arcSegs,
          capEnds: cap,
        }),
        buildHelicalAnnularGeometry({
          centerX,
          centerZ,
          rIn: rIn - 0.025,
          rOut: rIn + 0.025,
          aStart: arcStart,
          aEnd: arcEnd,
          yBotStart: y + 0.55,
          yBotEnd: y + 0.55,
          yTopStart: y + 0.585,
          yTopEnd: y + 0.585,
          segments: arcSegs,
          capEnds: cap,
        })
      );

      const postCount = Math.max(2, Math.round((arcSpan * rIn) / 1.9));
      for (let p = 0; p <= postCount; p++) {
        if (!cap && p === postCount) continue;
        const a = arcStart + arcSpan * (p / postCount);
        postSpecs.push({
          w: 0.044,
          h: 0.885,
          d: 0.044,
          x: centerX + Math.cos(a) * rIn,
          y: y + 0.136 + 0.4425,
          z: centerZ + Math.sin(a) * rIn,
          rotY: -a,
        });
      }

      const colSegs = Math.max(3, Math.round((arcSpan * innerRadius) / 0.85));
      const rCol = innerRadius - 0.12;
      for (let s = 0; s < colSegs; s++) {
        const a = arcStart + arcSpan * ((s + 0.5) / colSegs);
        const px = centerX + Math.cos(a) * rCol;
        const pz = centerZ + Math.sin(a) * rCol;
        collector.boxes.push({
          minX: px - 0.24,
          maxX: px + 0.24,
          minY: y,
          maxY: y + 1.32,
          minZ: pz - 0.24,
          maxZ: pz + 0.24,
          walkableTop: false,
          tag: 'ring_inner_rail',
        });
      }
    }

    if (curbGeos.length > 0) {
      const curbMesh = new THREE.Mesh(mergeSimpleGeometries(curbGeos), mats.structuralSteel);
      curbMesh.name = 'RingInnerCurb';
      hostGroup.add(curbMesh);
    }
    if (railBarGeos.length > 0) {
      const railMesh = new THREE.Mesh(mergeSimpleGeometries(railBarGeos), mats.brushedMetal);
      railMesh.name = 'RingInnerRail';
      hostGroup.add(railMesh);
    }
    const postMesh = buildBatchedBoxesMesh(postSpecs, mats.structuralSteel, {
      name: 'RingInnerPosts',
    });
    if (postMesh) hostGroup.add(postMesh);
  }

  if (outerGuardrail) {
    const outerArcs = subtractArcGaps(loA, hiA, outerRailGaps);
    const outerRailBarGeos: THREE.BufferGeometry[] = [];
    const outerCurbGeos: THREE.BufferGeometry[] = [];
    const outerPostSpecs: BoxSpec[] = [];
    const rOut = outerRadius - 0.08;

    for (const [arcStart, arcEnd] of outerArcs) {
      const arcSpan = arcEnd - arcStart;
      if (arcSpan < 0.04) continue;
      const arcSegs = Math.max(4, Math.round((arcSpan / (Math.PI * 2)) * segments));
      const cap = !isFullRing || outerArcs.length > 1 || arcSpan < Math.PI * 2 - 0.02;

      outerCurbGeos.push(
        buildHelicalAnnularGeometry({
          centerX,
          centerZ,
          rIn: rOut - 0.044,
          rOut: rOut + 0.044,
          aStart: arcStart,
          aEnd: arcEnd,
          yBotStart: y + 0.012,
          yBotEnd: y + 0.012,
          yTopStart: y + 0.12,
          yTopEnd: y + 0.12,
          segments: arcSegs,
          capEnds: cap,
        })
      );

      outerRailBarGeos.push(
        buildHelicalAnnularGeometry({
          centerX,
          centerZ,
          rIn: rOut - 0.036,
          rOut: rOut + 0.036,
          aStart: arcStart,
          aEnd: arcEnd,
          yBotStart: y + 1.03,
          yBotEnd: y + 1.03,
          yTopStart: y + 1.1,
          yTopEnd: y + 1.1,
          segments: arcSegs,
          capEnds: cap,
        }),
        buildHelicalAnnularGeometry({
          centerX,
          centerZ,
          rIn: rOut - 0.025,
          rOut: rOut + 0.025,
          aStart: arcStart,
          aEnd: arcEnd,
          yBotStart: y + 0.55,
          yBotEnd: y + 0.55,
          yTopStart: y + 0.585,
          yTopEnd: y + 0.585,
          segments: arcSegs,
          capEnds: cap,
        })
      );

      const postCount = Math.max(2, Math.round((arcSpan * rOut) / 2.0));
      for (let p = 0; p <= postCount; p++) {
        if (!cap && p === postCount) continue;
        const a = arcStart + arcSpan * (p / postCount);
        outerPostSpecs.push({
          w: 0.044,
          h: 0.895,
          d: 0.044,
          x: centerX + Math.cos(a) * rOut,
          y: y + 0.124 + 0.4475,
          z: centerZ + Math.sin(a) * rOut,
          rotY: -a,
        });
      }

      const colSegs = Math.max(3, Math.round((arcSpan * outerRadius) / 0.9));
      const rCol = outerRadius + 0.06;
      for (let s = 0; s < colSegs; s++) {
        const a = arcStart + arcSpan * ((s + 0.5) / colSegs);
        const px = centerX + Math.cos(a) * rCol;
        const pz = centerZ + Math.sin(a) * rCol;
        collector.boxes.push({
          minX: px - 0.24,
          maxX: px + 0.24,
          minY: y,
          maxY: y + 1.32,
          minZ: pz - 0.24,
          maxZ: pz + 0.24,
          walkableTop: false,
          tag: 'ring_outer_rail',
        });
      }
    }

    if (outerCurbGeos.length > 0) {
      const curbMesh = new THREE.Mesh(mergeSimpleGeometries(outerCurbGeos), mats.structuralSteel);
      curbMesh.name = 'RingOuterCurb';
      hostGroup.add(curbMesh);
    }
    if (outerRailBarGeos.length > 0) {
      const railMesh = new THREE.Mesh(mergeSimpleGeometries(outerRailBarGeos), mats.brushedMetal);
      railMesh.name = 'RingOuterRail';
      hostGroup.add(railMesh);
    }
    const outerPostMesh = buildBatchedBoxesMesh(outerPostSpecs, mats.structuralSteel, {
      name: 'RingOuterPosts',
    });
    if (outerPostMesh) hostGroup.add(outerPostMesh);
  }

  const ring: WalkableRingSlab = {
    centerX,
    centerZ,
    innerRadius,
    outerRadius,
    y,
    thickness,
    ...(isFullRing ? {} : { startAngle: loA, endAngle: hiA }),
  };
  collector.ringSlabs.push(ring);
}
