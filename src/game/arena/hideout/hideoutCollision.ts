import type {
  ColliderBox3D,
  CollisionWorld3D,
  WalkableArcRamp,
  WalkableRamp,
  WalkableRingSlab,
  WalkableSlab,
} from './types';

const TWO_PI = Math.PI * 2;
const BODY_HEAD_HEIGHT = 1.75;
const BODY_STEP_CLEARANCE = 0.44;
const FOOT_SAMPLE_RADIUS = 0.28;

// Pre-allocated sample offsets (center + 4 compass points) — ZERO per-frame allocations!
const SAMPLE_OFFSETS_X = [0, FOOT_SAMPLE_RADIUS, -FOOT_SAMPLE_RADIUS, 0, 0];
const SAMPLE_OFFSETS_Z = [0, 0, 0, FOOT_SAMPLE_RADIUS, -FOOT_SAMPLE_RADIUS];

/**
 * Pure 2D circle-vs-AABB resolution returning mutated coordinates via a reusable scratch result
 * so hot physics loops allocate zero objects.
 */
export interface HorizResolveResult {
  x: number;
  z: number;
  collided: boolean;
}

const _horizOut: HorizResolveResult = { x: 0, z: 0, collided: false };

function resolveCircleBoxXZ(
  x: number,
  z: number,
  radius: number,
  box: ColliderBox3D,
  out: HorizResolveResult
): void {
  const closestX = Math.max(box.minX, Math.min(x, box.maxX));
  const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));

  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) {
    out.x = x;
    out.z = z;
    out.collided = false;
    return;
  }

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    out.x = x + (dx / dist) * push;
    out.z = z + (dz / dist) * push;
    out.collided = true;
    return;
  }

  const leftDist = Math.abs(x - box.minX);
  const rightDist = Math.abs(box.maxX - x);
  const topDist = Math.abs(z - box.minZ);
  const bottomDist = Math.abs(box.maxZ - z);
  const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

  if (minDist === leftDist) {
    out.x = box.minX - radius;
    out.z = z;
  } else if (minDist === rightDist) {
    out.x = box.maxX + radius;
    out.z = z;
  } else if (minDist === topDist) {
    out.x = x;
    out.z = box.minZ - radius;
  } else {
    out.x = x;
    out.z = box.maxZ + radius;
  }
  out.collided = true;
}

export const STANCE_HEAD_HEIGHT = {
  standing: BODY_HEAD_HEIGHT, // 1.75m
  crouching: 1.28, // Still taller than 1.16m jammed shutter -> requires tactical dodge roll!
  rolling: 0.84, // Tucked martial shoulder roll -> glides cleanly under 1.16m jammed shutters!
} as const;

const DEFAULT_SLAB_THICKNESS = 0.36;
const RAMP_UNDERSIDE_THICKNESS = 0.42;
const CEIL_ENTRY_EPS = 0.14;

function resolveCircleAABBXZ(
  x: number,
  z: number,
  radius: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  out: HorizResolveResult
): void {
  const closestX = Math.max(minX, Math.min(x, maxX));
  const closestZ = Math.max(minZ, Math.min(z, maxZ));

  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) {
    out.x = x;
    out.z = z;
    out.collided = false;
    return;
  }

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    out.x = x + (dx / dist) * push;
    out.z = z + (dz / dist) * push;
    out.collided = true;
    return;
  }

  const leftDist = Math.abs(x - minX);
  const rightDist = Math.abs(maxX - x);
  const topDist = Math.abs(z - minZ);
  const bottomDist = Math.abs(maxZ - z);
  const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

  if (minDist === leftDist) {
    out.x = minX - radius;
    out.z = z;
  } else if (minDist === rightDist) {
    out.x = maxX + radius;
    out.z = z;
  } else if (minDist === topDist) {
    out.x = x;
    out.z = minZ - radius;
  } else {
    out.x = x;
    out.z = maxZ + radius;
  }
  out.collided = true;
}

function clampAngleToSector(angle: number, startAngle: number, endAngle: number): { clamped: number; inside: boolean } {
  const t = evaluateArcAngleProgress(angle, startAngle, endAngle, 0);
  if (t >= 0) return { clamped: angle, inside: true };

  // Find nearest angular endpoint
  const diffStart = Math.atan2(Math.sin(angle - startAngle), Math.cos(angle - startAngle));
  const diffEnd = Math.atan2(Math.sin(angle - endAngle), Math.cos(angle - endAngle));
  return Math.abs(diffStart) <= Math.abs(diffEnd)
    ? { clamped: startAngle, inside: false }
    : { clamped: endAngle, inside: false };
}

function resolveCircleRingSlabXZ(
  x: number,
  z: number,
  radius: number,
  ring: WalkableRingSlab,
  out: HorizResolveResult
): void {
  const dx = x - ring.centerX;
  const dz = z - ring.centerZ;
  const dist = Math.hypot(dx, dz);

  if (dist >= ring.outerRadius + radius || dist <= ring.innerRadius - radius) {
    out.x = x;
    out.z = z;
    out.collided = false;
    return;
  }

  const isPartial = ring.startAngle !== undefined && ring.endAngle !== undefined;
  const angle = dist > 1e-6 ? Math.atan2(dz, dx) : 0;
  let closestAngle = angle;
  let insideSector = true;
  if (isPartial) {
    const res = clampAngleToSector(angle, ring.startAngle!, ring.endAngle!);
    closestAngle = res.clamped;
    insideSector = res.inside;
  }

  const closestR = Math.max(ring.innerRadius, Math.min(dist, ring.outerRadius));
  const cx = ring.centerX + Math.cos(closestAngle) * closestR;
  const cz = ring.centerZ + Math.sin(closestAngle) * closestR;

  const pdx = x - cx;
  const pdz = z - cz;
  const pDistSq = pdx * pdx + pdz * pdz;

  if (pDistSq >= radius * radius) {
    out.x = x;
    out.z = z;
    out.collided = false;
    return;
  }

  if (pDistSq > 1e-8) {
    const pDist = Math.sqrt(pDistSq);
    const push = radius - pDist;
    out.x = x + (pdx / pDist) * push;
    out.z = z + (pdz / pDist) * push;
    out.collided = true;
    return;
  }

  // Strictly inside annular solid thickness -> push out to nearest radial wall
  if (insideSector && dist > 1e-6) {
    const toInner = dist - ring.innerRadius;
    const toOuter = ring.outerRadius - dist;
    const targetR =
      ring.innerRadius > 0.05 && toInner < toOuter
        ? ring.innerRadius - radius
        : ring.outerRadius + radius;
    out.x = ring.centerX + (dx / dist) * targetR;
    out.z = ring.centerZ + (dz / dist) * targetR;
    out.collided = true;
    return;
  }

  out.x = x;
  out.z = z;
  out.collided = false;
}

/**
 * Resolves 3D horizontal movement against active `ColliderBox3D` volumes.
 * A box only blocks the operative when their vertical body span `[feetY + stepClearance, feetY + headHeight]`
 * overlaps `[box.minY, box.maxY]`. This lets the operative walk freely underneath bridges/balconies,
 * walk cleanly on top of elevated platforms, AND dodge-roll underneath jammed half-open blast shutters!
 */
export function resolveHorizontal3D(
  x: number,
  z: number,
  feetY: number,
  radius: number,
  boxes: ColliderBox3D[],
  out: HorizResolveResult = _horizOut,
  headHeight: number = BODY_HEAD_HEIGHT,
  stepClearance: number = BODY_STEP_CLEARANCE
): HorizResolveResult {
  let nx = x;
  let nz = z;
  let anyCollided = false;

  const bodyBottom = feetY + stepClearance;
  const bodyTop = feetY + headHeight;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.active === false) continue;
      // Vertical overlap check: skip overhead decks/shutters above current stance head height and slabs below step-up
      if (box.maxY <= bodyBottom || box.minY >= bodyTop) continue;

      resolveCircleBoxXZ(nx, nz, radius, box, _horizOut);
      if (_horizOut.collided) {
        nx = _horizOut.x;
        nz = _horizOut.z;
        anyCollided = true;
      }
    }
  }

  out.x = nx;
  out.z = nz;
  out.collided = anyCollided;
  return out;
}

/**
 * Full 3D horizontal solid-body collision against ALL world geometry:
 * - Solid `ColliderBox3D` volumes (walls, pillars, props, staircases, barricades, doors)
 * - Solid `WalkableSlab` deck edges & backs (`[y - thickness, y]`)
 * - Solid `WalkableRingSlab` inner/outer deck rims (`[y - thickness, y]`)
 * - Solid `WalkableRamp` sloped undersides & opposite/high ends (`[y(t) - 0.42, y(t)]`)
 *
 * Guarantees the operative can NEVER clip sideways or from the opposite end into any platform,
 * balcony, bridge, ring walkway, or staircase across any floor while preserving silky stair ascent!
 */
export function resolveWorldHorizontal3D(
  x: number,
  z: number,
  feetY: number,
  radius: number,
  world: CollisionWorld3D,
  out: HorizResolveResult = _horizOut,
  headHeight: number = BODY_HEAD_HEIGHT,
  stepClearance: number = BODY_STEP_CLEARANCE
): HorizResolveResult {
  let nx = x;
  let nz = z;
  let anyCollided = false;

  const bodyBottom = feetY + stepClearance;
  const bodyTop = feetY + headHeight;
  const boxes = world.boxes;
  const slabs = world.slabs;
  const ringSlabs = world.ringSlabs;
  const ramps = world.ramps;

  for (let pass = 0; pass < 2; pass++) {
    // 1. Solid ColliderBox3D volumes
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.active === false) continue;
      if (box.maxY <= bodyBottom || box.minY >= bodyTop) continue;

      resolveCircleBoxXZ(nx, nz, radius, box, _horizOut);
      if (_horizOut.collided) {
        nx = _horizOut.x;
        nz = _horizOut.z;
        anyCollided = true;
      }
    }

    // 2. Solid WalkableSlab deck thicknesses (prevents mid-air/pit/opposite-end edge phasing!)
    for (let i = 0; i < slabs.length; i++) {
      const s = slabs[i];
      if (s.active === false) continue;
      const thick = s.thickness ?? DEFAULT_SLAB_THICKNESS;
      const sTop = s.y;
      const sBot = s.y - thick;
      if (sTop <= bodyBottom || sBot >= bodyTop) continue;

      resolveCircleAABBXZ(nx, nz, radius, s.minX, s.maxX, s.minZ, s.maxZ, _horizOut);
      if (_horizOut.collided) {
        nx = _horizOut.x;
        nz = _horizOut.z;
        anyCollided = true;
      }
    }

    // 3. Solid WalkableRingSlab thicknesses
    for (let i = 0; i < ringSlabs.length; i++) {
      const r = ringSlabs[i];
      const thick = r.thickness ?? DEFAULT_SLAB_THICKNESS;
      const rTop = r.y;
      const rBot = r.y - thick;
      if (rTop <= bodyBottom || rBot >= bodyTop) continue;

      resolveCircleRingSlabXZ(nx, nz, radius, r, _horizOut);
      if (_horizOut.collided) {
        nx = _horizOut.x;
        nz = _horizOut.z;
        anyCollided = true;
      }
    }

    // 4. Solid WalkableRamp sloped wedges (blocks walking under low underside or through high/opposite end!)
    for (let i = 0; i < ramps.length; i++) {
      const rp = ramps[i];
      const dy = rp.yEnd - rp.yStart;
      const span = rp.axis === 'x' ? rp.maxX - rp.minX : rp.maxZ - rp.minZ;
      if (span < 1e-4) continue;

      const slope = Math.abs(dy) / span;
      // Climb-safe threshold: climbing UP the ramp from above NEVER snags regardless of stair pitch!
      const rampBlockMinY = feetY + Math.max(stepClearance, slope * radius + 0.08);
      const rampBlockMaxY = bodyTop + RAMP_UNDERSIDE_THICKNESS;

      const rampLo = Math.min(rp.yStart, rp.yEnd);
      const rampHi = Math.max(rp.yStart, rp.yEnd);
      if (rampHi <= rampBlockMinY || rampLo >= rampBlockMaxY) continue;

      // Exact linear slice t ∈ [tMin, tMax] where rampBlockMinY <= y(t) <= rampBlockMaxY
      let t0: number;
      let t1: number;
      if (Math.abs(dy) < 1e-4) {
        t0 = 0;
        t1 = 1;
      } else {
        const ta = (rampBlockMinY - rp.yStart) / dy;
        const tb = (rampBlockMaxY - rp.yStart) / dy;
        t0 = Math.max(0, Math.min(1, Math.min(ta, tb)));
        t1 = Math.max(0, Math.min(1, Math.max(ta, tb)));
      }
      if (t1 - t0 < 1e-4) continue;

      let sMinX = rp.minX;
      let sMaxX = rp.maxX;
      let sMinZ = rp.minZ;
      let sMaxZ = rp.maxZ;
      if (rp.axis === 'x') {
        sMinX = rp.minX + span * t0;
        sMaxX = rp.minX + span * t1;
      } else {
        sMinZ = rp.minZ + span * t0;
        sMaxZ = rp.minZ + span * t1;
      }

      resolveCircleAABBXZ(nx, nz, radius, sMinX, sMaxX, sMinZ, sMaxZ, _horizOut);
      if (_horizOut.collided) {
        nx = _horizOut.x;
        nz = _horizOut.z;
        anyCollided = true;
      }
    }
  }

  out.x = nx;
  out.z = nz;
  out.collided = anyCollided;
  return out;
}

/**
 * Resolves 3D vertical ceiling / platform-underside collision during upward motion.
 * Checks EVERY active `WalkableSlab`, `WalkableRingSlab`, `WalkableRamp`, `WalkableArcRamp`,
 * and overhanging `ColliderBox3D`. Returns the highest permissible clamped `feetY` if the
 * operative's head struck an underside between `prevFeetY` and `nextFeetY`, or `null` if clear.
 *
 * Prevents jumping or pneumatic jump-pad launches from EVER phasing upward through the underside
 * of platforms, balconies, bridges, ring decks, or staircases on any floor!
 */
export function resolveCeilingHeight3D(
  x: number,
  z: number,
  prevFeetY: number,
  nextFeetY: number,
  headHeight: number,
  radius: number,
  world: CollisionWorld3D
): number | null {
  if (nextFeetY <= prevFeetY) return null;

  const prevHeadY = prevFeetY + headHeight;
  const nextHeadY = nextFeetY + headHeight;
  const headR = Math.max(0.24, radius * 0.64);
  const headRSq = headR * headR;

  let lowestUnderside = Infinity;

  // 1. Flat walkable slabs (decks, balconies, catwalks, retractable bridges)
  const slabs = world.slabs;
  for (let i = 0; i < slabs.length; i++) {
    const s = slabs[i];
    if (s.active === false) continue;
    const underside = s.y - (s.thickness ?? DEFAULT_SLAB_THICKNESS);
    if (underside >= lowestUnderside) continue;
    if (prevHeadY > underside + CEIL_ENTRY_EPS || nextHeadY <= underside) continue;

    const cx = Math.max(s.minX, Math.min(x, s.maxX));
    const cz = Math.max(s.minZ, Math.min(z, s.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < headRSq) {
      lowestUnderside = underside;
    }
  }

  // 2. Annular walkable ring slabs (cathedral rings, rotunda decks)
  const ringSlabs = world.ringSlabs;
  for (let i = 0; i < ringSlabs.length; i++) {
    const r = ringSlabs[i];
    const underside = r.y - (r.thickness ?? DEFAULT_SLAB_THICKNESS);
    if (underside >= lowestUnderside) continue;
    if (prevHeadY > underside + CEIL_ENTRY_EPS || nextHeadY <= underside) continue;

    const dx = x - r.centerX;
    const dz = z - r.centerZ;
    const dist = Math.hypot(dx, dz);
    if (dist >= r.outerRadius + headR || dist <= r.innerRadius - headR) continue;

    let closestAngle = dist > 1e-6 ? Math.atan2(dz, dx) : 0;
    if (r.startAngle !== undefined && r.endAngle !== undefined) {
      closestAngle = clampAngleToSector(closestAngle, r.startAngle, r.endAngle).clamped;
    }
    const closestR = Math.max(r.innerRadius, Math.min(dist, r.outerRadius));
    const cx = r.centerX + Math.cos(closestAngle) * closestR;
    const cz = r.centerZ + Math.sin(closestAngle) * closestR;
    const pdx = x - cx;
    const pdz = z - cz;
    if (pdx * pdx + pdz * pdz < headRSq) {
      lowestUnderside = underside;
    }
  }

  // 3. Straight inclined stair ramps (blocks jumping up through stair undersides!)
  const ramps = world.ramps;
  for (let i = 0; i < ramps.length; i++) {
    const rp = ramps[i];
    const rampTop = Math.max(rp.yStart, rp.yEnd);
    if (prevHeadY > rampTop + CEIL_ENTRY_EPS) continue;
    if (x + headR < rp.minX || x - headR > rp.maxX || z + headR < rp.minZ || z - headR > rp.maxZ) {
      continue;
    }

    const cx = Math.max(rp.minX, Math.min(x, rp.maxX));
    const cz = Math.max(rp.minZ, Math.min(z, rp.maxZ));
    const surfaceY = sampleRampY(cx, cz, rp);
    if (surfaceY === null) continue;
    const underside = surfaceY - RAMP_UNDERSIDE_THICKNESS;
    if (underside < lowestUnderside && prevHeadY <= underside + CEIL_ENTRY_EPS && nextHeadY > underside) {
      lowestUnderside = underside;
    }
  }

  // 4. Curved / helical spiral stair arc ramps
  const arcRamps = world.arcRamps;
  for (let i = 0; i < arcRamps.length; i++) {
    const arc = arcRamps[i];
    const arcTop = Math.max(arc.yStart, arc.yEnd);
    if (prevHeadY > arcTop + CEIL_ENTRY_EPS) continue;

    for (let k = 0; k < 5; k++) {
      const sx = x + SAMPLE_OFFSETS_X[k] * (headR / FOOT_SAMPLE_RADIUS);
      const sz = z + SAMPLE_OFFSETS_Z[k] * (headR / FOOT_SAMPLE_RADIUS);
      const surfaceY = sampleArcRampY(sx, sz, arc);
      if (surfaceY === null) continue;
      const underside = surfaceY - RAMP_UNDERSIDE_THICKNESS;
      if (underside < lowestUnderside && prevHeadY <= underside + CEIL_ENTRY_EPS && nextHeadY > underside) {
        lowestUnderside = underside;
      }
    }
  }

  // 5. Overhanging solid ColliderBox3D volumes (beams, lintels, ceilings, stair_body wedges, jammed shutters)
  const boxes = world.boxes;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.active === false) continue;
    const underside = b.minY;
    if (underside >= lowestUnderside) continue;
    if (prevHeadY > underside + CEIL_ENTRY_EPS || nextHeadY <= underside) continue;

    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < headRSq) {
      lowestUnderside = underside;
    }
  }

  if (lowestUnderside === Infinity) return null;
  return lowestUnderside - headHeight;
}

/**
 * Returns true if the operative's XZ capsule currently overlaps an overhead low-clearance obstacle
 * (such as a jammed 1.16m blast shutter) that fits a rolling body (`0.84m`) but not a standing body (`1.75m`).
 * Used to keep a dodge-roll gliding smoothly clear of the shutter thickness before standing up!
 */
export function hasLowCeilingAbove(
  x: number,
  z: number,
  feetY: number,
  radius: number,
  boxes: ColliderBox3D[]
): boolean {
  const rollTop = feetY + STANCE_HEAD_HEIGHT.rolling;
  const standTop = feetY + STANCE_HEAD_HEIGHT.standing;
  const rSq = (radius + 0.04) * (radius + 0.04);

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.active === false || b.tag !== 'jammed_door') continue;
    // Low overhead lip sits above rolling height yet below standing height
    if (b.minY < rollTop || b.minY >= standTop) continue;
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < rSq) return true;
  }
  return false;
}

/**
 * Evaluates normalized angular progress `t ∈ [0, 1]` along an arc `[startAngle, endAngle]`
 * (supporting both CCW `endAngle > startAngle` and CW `endAngle < startAngle` spirals!).
 * Returns `-1` if `angle` does not lie within the arc sector.
 */
export function evaluateArcAngleProgress(
  angle: number,
  startAngle: number,
  endAngle: number,
  anglePad = 0.025
): number {
  const span = endAngle - startAngle;
  const absSpan = Math.abs(span);
  if (absSpan < 1e-6) return -1;

  // Compute signed delta wrapped to [0, 2π) in the direction of `span`
  let delta: number;
  if (span > 0) {
    delta = (angle - startAngle) % TWO_PI;
    if (delta < 0) delta += TWO_PI;
    if (delta > TWO_PI - anglePad) delta -= TWO_PI;
  } else {
    delta = (startAngle - angle) % TWO_PI;
    if (delta < 0) delta += TWO_PI;
    if (delta > TWO_PI - anglePad) delta -= TWO_PI;
  }

  if (delta < -anglePad || delta > absSpan + anglePad) return -1;
  const t = delta / absSpan;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function sampleSlabY(px: number, pz: number, slab: WalkableSlab): number | null {
  if (px < slab.minX || px > slab.maxX || pz < slab.minZ || pz > slab.maxZ) return null;
  return slab.y;
}

function sampleRingSlabY(px: number, pz: number, ring: WalkableRingSlab): number | null {
  const dx = px - ring.centerX;
  const dz = pz - ring.centerZ;
  const rSq = dx * dx + dz * dz;
  if (rSq < ring.innerRadius * ring.innerRadius || rSq > ring.outerRadius * ring.outerRadius) {
    return null;
  }
  if (ring.startAngle !== undefined && ring.endAngle !== undefined) {
    const angle = Math.atan2(dz, dx);
    const t = evaluateArcAngleProgress(angle, ring.startAngle, ring.endAngle, 0.02);
    if (t < 0) return null;
  }
  return ring.y;
}

function sampleRampY(px: number, pz: number, ramp: WalkableRamp): number | null {
  if (px < ramp.minX || px > ramp.maxX || pz < ramp.minZ || pz > ramp.maxZ) return null;
  let t: number;
  if (ramp.axis === 'x') {
    const span = ramp.maxX - ramp.minX;
    t = span > 1e-5 ? (px - ramp.minX) / span : 0;
  } else {
    const span = ramp.maxZ - ramp.minZ;
    t = span > 1e-5 ? (pz - ramp.minZ) / span : 0;
  }
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return ramp.yStart + (ramp.yEnd - ramp.yStart) * t;
}

export function sampleArcRampY(px: number, pz: number, arc: WalkableArcRamp): number | null {
  const dx = px - arc.centerX;
  const dz = pz - arc.centerZ;
  const rSq = dx * dx + dz * dz;
  if (rSq < arc.innerRadius * arc.innerRadius || rSq > arc.outerRadius * arc.outerRadius) {
    return null;
  }
  const angle = Math.atan2(dz, dx);
  const t = evaluateArcAngleProgress(angle, arc.startAngle, arc.endAngle, 0.03);
  if (t < 0) return null;
  return arc.yStart + (arc.yEnd - arc.yStart) * t;
}

/**
 * Computes the highest walkable 3D surface directly beneath the operative's boot footprint
 * that is at or below `feetY + stepUpHeight`.
 * Returns `null` when standing over a genuine open abyss/hole (e.g., center of Floor 7 / Floor 1 spiral well)!
 */
export function resolveSupportHeight3D(
  x: number,
  z: number,
  feetY: number,
  world: CollisionWorld3D,
  stepUpHeight = 0.48
): number | null {
  const maxReachY = feetY + stepUpHeight;
  let bestY = -Infinity;

  // 1. Flat slabs (skip retracted dynamic bridge slabs!)
  const slabs = world.slabs;
  for (let i = 0; i < slabs.length; i++) {
    const s = slabs[i];
    if (s.active === false || s.y > maxReachY || s.y <= bestY) continue;
    for (let k = 0; k < 5; k++) {
      const y = sampleSlabY(x + SAMPLE_OFFSETS_X[k], z + SAMPLE_OFFSETS_Z[k], s);
      if (y !== null && y <= maxReachY && y > bestY) {
        bestY = y;
        break;
      }
    }
  }

  // 2. Ring slabs (with open central holes!)
  const ringSlabs = world.ringSlabs;
  for (let i = 0; i < ringSlabs.length; i++) {
    const r = ringSlabs[i];
    if (r.y > maxReachY || r.y <= bestY) continue;
    for (let k = 0; k < 5; k++) {
      const y = sampleRingSlabY(x + SAMPLE_OFFSETS_X[k], z + SAMPLE_OFFSETS_Z[k], r);
      if (y !== null && y <= maxReachY && y > bestY) {
        bestY = y;
        break;
      }
    }
  }

  // 3. Straight inclined stair ramps
  const ramps = world.ramps;
  for (let i = 0; i < ramps.length; i++) {
    const r = ramps[i];
    const rampTop = Math.max(r.yStart, r.yEnd);
    const rampBot = Math.min(r.yStart, r.yEnd);
    if (rampBot > maxReachY || rampTop <= bestY) continue;
    // Prefer center sample first for silky monotonic stair elevation; fallback to boot rim only if center is off-ramp
    const centerY = sampleRampY(x, z, r);
    if (centerY !== null) {
      if (centerY <= maxReachY && centerY > bestY) {
        bestY = centerY;
      }
    } else {
      for (let k = 1; k < 5; k++) {
        const y = sampleRampY(x + SAMPLE_OFFSETS_X[k], z + SAMPLE_OFFSETS_Z[k], r);
        if (y !== null && y <= maxReachY && y > bestY) {
          bestY = y;
        }
      }
    }
  }

  // 4. Curved / spiral stair arc ramps (with open central void!)
  const arcRamps = world.arcRamps;
  for (let i = 0; i < arcRamps.length; i++) {
    const arc = arcRamps[i];
    const arcTop = Math.max(arc.yStart, arc.yEnd);
    const arcBot = Math.min(arc.yStart, arc.yEnd);
    if (arcBot > maxReachY || arcTop <= bestY) continue;
    // Center sample first for smooth angular tracking around the central hole!
    const centerY = sampleArcRampY(x, z, arc);
    if (centerY !== null) {
      if (centerY <= maxReachY && centerY > bestY) {
        bestY = centerY;
      }
    } else {
      // Slightly tighter radial footprint (0.20m) so open central holes feel crisp & honest
      for (let k = 1; k < 5; k++) {
        const y = sampleArcRampY(
          x + SAMPLE_OFFSETS_X[k] * 0.72,
          z + SAMPLE_OFFSETS_Z[k] * 0.72,
          arc
        );
        if (y !== null && y <= maxReachY && y > bestY) {
          bestY = y;
        }
      }
    }
  }

  // 5. Walkable top faces of cover boxes / platforms (e.g., 0.98m cover barricades & crates)
  const boxes = world.boxes;
  const footR = 0.31;
  const boxStepMargin = Math.min(stepUpHeight, 0.22);
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.active === false || b.walkableTop === false) continue;
    if (b.maxY > feetY + boxStepMargin || b.maxY <= bestY) continue;
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz <= footR * footR) {
      bestY = b.maxY;
    }
  }

  return bestY === -Infinity ? null : bestY;
}
