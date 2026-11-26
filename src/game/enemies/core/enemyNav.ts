import * as THREE from 'three';
import {
  resolveSupportHeight3D,
  resolveWorldHorizontal3D,
  type HorizResolveResult,
} from '../../arena/hideout/hideoutCollision';
import type { CollisionWorld3D } from '../../arena/hideout/types';

export interface EnemySpatialState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  radius: number;
  height: number;
  grounded: boolean;
}

const _horizScratch: HorizResolveResult = { x: 0, z: 0, collided: false };

export function wrapAngleDelta(target: number, current: number): number {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function rotateYawTowards(current: number, target: number, maxRate: number, dt: number): number {
  const delta = wrapAngleDelta(target, current);
  const maxStep = maxRate * dt;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

/**
 * Computes yaw so local `-Z` faces toward `(tx, tz)` — matches operative & weapon convention!
 */
export function computeFacingYaw(fromX: number, fromZ: number, toX: number, toZ: number): number {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  if (dx * dx + dz * dz < 1e-6) return 0;
  return Math.atan2(-dx, -dz);
}

/**
 * Grounded 3D enemy locomotion step using the exact same `CollisionWorld3D` used by the player!
 * Keeps every enemy solidly planted on Floor 08 slabs/ramps and slides smoothly around walls & barricades.
 */
export function stepEnemyMovement(
  spatial: EnemySpatialState,
  desiredVelX: number,
  desiredVelZ: number,
  world: CollisionWorld3D,
  dt: number,
  clampFloorMinY = 97.4
): boolean {
  const blend = 1 - Math.exp(-10 * dt);
  spatial.vx += (desiredVelX - spatial.vx) * blend;
  spatial.vz += (desiredVelZ - spatial.vz) * blend;

  const tryX = spatial.x + spatial.vx * dt;
  const tryZ = spatial.z + spatial.vz * dt;

  resolveWorldHorizontal3D(
    tryX,
    tryZ,
    spatial.y,
    spatial.radius,
    world,
    _horizScratch,
    spatial.height,
    0.42
  );

  // Check support height at resolved position so enemies don't step into voids
  const supportY = resolveSupportHeight3D(_horizScratch.x, _horizScratch.z, spatial.y, world, 0.55);
  if (supportY !== null && supportY >= clampFloorMinY && Math.abs(supportY - spatial.y) <= 1.1) {
    spatial.x = _horizScratch.x;
    spatial.z = _horizScratch.z;
    spatial.y = spatial.y + (supportY - spatial.y) * Math.min(1, dt * 18);
    spatial.grounded = true;
  } else {
    // Reject stepping off an unsafe ledge
    spatial.vx *= 0.2;
    spatial.vz *= 0.2;
  }

  return _horizScratch.collided;
}

export interface WorldRaycastHit {
  hit: boolean;
  t: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

/**
 * Exact 3D swept segment-vs-AABB raycast against all active solid boxes in `CollisionWorld3D`.
 * Guarantees enemy projectiles, katana slashes, and shockwaves NEVER pass through solid walls,
 * cover blocks, pillars, or platforms, and returns exact hit point + surface normal for AAA impact VFX!
 */
export function raycastCollisionWorld3D(
  fromX: number,
  fromY: number,
  fromZ: number,
  toX: number,
  toY: number,
  toZ: number,
  world: CollisionWorld3D,
  outHit: WorldRaycastHit
): boolean {
  outHit.hit = false;
  outHit.t = 1;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dz = toZ - fromZ;
  if (dx * dx + dy * dy + dz * dz < 1e-8) return false;

  const boxes = world.boxes;
  let bestT = 1.0001;
  let bestNx = 0;
  let bestNy = 1;
  let bestNz = 0;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.active === false) continue;

    let tMin = 0.0;
    let tMax = 1.0;
    let nx = 0;
    let ny = 0;
    let nz = 0;

    // X slab
    if (Math.abs(dx) < 1e-7) {
      if (fromX < b.minX || fromX > b.maxX) continue;
    } else {
      const inv = 1 / dx;
      let t1 = (b.minX - fromX) * inv;
      let t2 = (b.maxX - fromX) * inv;
      let sideN = -1;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
        sideN = 1;
      }
      if (t1 > tMin) {
        tMin = t1;
        nx = sideN;
        ny = 0;
        nz = 0;
      }
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Y slab
    if (Math.abs(dy) < 1e-7) {
      if (fromY < b.minY || fromY > b.maxY) continue;
    } else {
      const inv = 1 / dy;
      let t1 = (b.minY - fromY) * inv;
      let t2 = (b.maxY - fromY) * inv;
      let sideN = -1;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
        sideN = 1;
      }
      if (t1 > tMin) {
        tMin = t1;
        nx = 0;
        ny = sideN;
        nz = 0;
      }
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Z slab
    if (Math.abs(dz) < 1e-7) {
      if (fromZ < b.minZ || fromZ > b.maxZ) continue;
    } else {
      const inv = 1 / dz;
      let t1 = (b.minZ - fromZ) * inv;
      let t2 = (b.maxZ - fromZ) * inv;
      let sideN = -1;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
        sideN = 1;
      }
      if (t1 > tMin) {
        tMin = t1;
        nx = 0;
        ny = 0;
        nz = sideN;
      }
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (tMin >= 0 && tMin < bestT) {
      bestT = tMin;
      bestNx = nx;
      bestNy = ny;
      bestNz = nz;
    }
  }

  if (bestT <= 1.0) {
    outHit.hit = true;
    outHit.t = bestT;
    outHit.point.set(fromX + dx * bestT, fromY + dy * bestT, fromZ + dz * bestT);
    outHit.normal.set(bestNx, bestNy, bestNz);
    if (outHit.normal.lengthSq() < 0.5) outHit.normal.set(0, 1, 0);
    return true;
  }

  return false;
}

/**
 * Fast 2D/3D segment-vs-box line-of-sight check against solid wall/pillar volumes on Floor 08.
 */
export function hasEnemyLineOfSight(
  fromX: number,
  fromY: number,
  fromZ: number,
  toX: number,
  toY: number,
  toZ: number,
  world: CollisionWorld3D
): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dz = toZ - fromZ;
  const distSq = dx * dx + dy * dy + dz * dz;
  if (distSq < 0.04) return true;

  const eyeMinY = Math.min(fromY, toY);
  const eyeMaxY = Math.max(fromY, toY);
  const boxes = world.boxes;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.active === false) continue;
    // Skip low waist cover and ceilings that don't intersect the eye-to-eye ray
    if (b.maxY < eyeMinY - 0.08 || b.minY > eyeMaxY + 0.08) continue;

    // Slab intersection for ray P(t) = from + t * d, t in (0.04, 0.96)
    let tMin = 0.04;
    let tMax = 0.96;

    if (Math.abs(dx) < 1e-6) {
      if (fromX < b.minX || fromX > b.maxX) continue;
    } else {
      const inv = 1 / dx;
      let t1 = (b.minX - fromX) * inv;
      let t2 = (b.maxX - fromX) * inv;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (Math.abs(dz) < 1e-6) {
      if (fromZ < b.minZ || fromZ > b.maxZ) continue;
    } else {
      const inv = 1 / dz;
      let t1 = (b.minZ - fromZ) * inv;
      let t2 = (b.maxZ - fromZ) * inv;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (Math.abs(dy) < 1e-6) {
      if (fromY < b.minY || fromY > b.maxY) continue;
    } else {
      const inv = 1 / dy;
      let t1 = (b.minY - fromY) * inv;
      let t2 = (b.maxY - fromY) * inv;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    return false;
  }

  return true;
}

/**
 * Reusable separation impulse between living enemies so squads spread tactically instead of stacking.
 */
export function computeSeparationVector(
  selfId: string,
  selfX: number,
  selfZ: number,
  selfRadius: number,
  others: ReadonlyArray<{ id: string; alive: boolean; x: number; z: number; radius: number }>,
  out: THREE.Vector2
): THREE.Vector2 {
  out.set(0, 0);
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    if (!o.alive || o.id === selfId) continue;
    const dx = selfX - o.x;
    const dz = selfZ - o.z;
    const minDist = selfRadius + o.radius + 0.55;
    const distSq = dx * dx + dz * dz;
    if (distSq > 1e-5 && distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const push = (minDist - dist) / minDist;
      out.x += (dx / dist) * push;
      out.y += (dz / dist) * push;
    }
  }
  return out;
}
