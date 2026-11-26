import * as THREE from 'three';
import type { WeaponId } from '../core/types';

export interface BulletSegmentResult {
  head: THREE.Vector3;
  tail: THREE.Vector3;
  length: number;
  finished: boolean;
}

export interface RecoilCameraImpulse {
  recoilKick: number;
  trauma: number;
  fovKickDeg: number;
  rollRad: number;
  /** Backwards camera Z-punch impulse in meters (subtle CoD concussion feel) */
  zPunchMeters: number;
  /** Brief peripheral optical flash intensity (0..1) */
  opticalShotPulse: number;
}

/**
 * Computes the visible head & tail segment of a high-speed incandescent tracer bullet
 * streaking from `start` to `end` at `speedMps` (e.g. 120 m/s).
 * Clamps cleanly inside [0, totalDist] so the bullet never overshoots past the impact wall.
 */
export function computeTravelingBulletSegment(
  start: THREE.Vector3,
  end: THREE.Vector3,
  elapsedSec: number,
  speedMps: number,
  streakLength: number,
  outHead: THREE.Vector3,
  outTail: THREE.Vector3
): BulletSegmentResult {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const totalDist = Math.hypot(dx, dy, dz);

  if (totalDist < 0.001) {
    outHead.copy(end);
    outTail.copy(start);
    return { head: outHead, tail: outTail, length: 0, finished: true };
  }

  const rawHeadDist = Math.max(0, elapsedSec * speedMps);
  const headDist = Math.min(totalDist, rawHeadDist);
  const tailDist = Math.min(totalDist, Math.max(0, rawHeadDist - streakLength));
  const finished = tailDist >= totalDist - 0.01;

  const invDist = 1 / totalDist;
  const nx = dx * invDist;
  const ny = dy * invDist;
  const nz = dz * invDist;

  outHead.set(start.x + nx * headDist, start.y + ny * headDist, start.z + nz * headDist);
  outTail.set(start.x + nx * tailDist, start.y + ny * tailDist, start.z + nz * tailDist);

  return {
    head: outHead,
    tail: outTail,
    length: Math.max(0, headDist - tailDist),
    finished,
  };
}

/**
 * Extracts orthonormal (forward, right, up) basis vectors from a weapon muzzle's world quaternion.
 * Our weapon local convention has barrel pointing along -Z, right along +X, top along +Y.
 */
export function computeMuzzleBasis(
  worldQuat: THREE.Quaternion,
  outForward: THREE.Vector3,
  outRight: THREE.Vector3,
  outUp: THREE.Vector3
): void {
  outForward.set(0, 0, -1).applyQuaternion(worldQuat).normalize();
  outRight.set(1, 0, 0).applyQuaternion(worldQuat).normalize();
  outUp.set(0, 1, 0).applyQuaternion(worldQuat).normalize();
}

/**
 * CoD MW-inspired per-shot camera recoil punch:
 * - SPECTRE-9: crisp suppressed kick with tight optical response.
 * - VIPER-X4: rapid micro-vibration with alternating dutch-roll chatter.
 * - VULCAN-50 (.50-Cal Heavy Battle Rifle): THUNDERING concussive FOV kick, heavy Z-punch,
 *   deliberate shoulder roll, and visceral optical pressure flash!
 */
export function computeRecoilCameraImpulse(
  weapon: WeaponId,
  overcharged: boolean,
  rollSign: number
): RecoilCameraImpulse {
  const dir = rollSign >= 0 ? 1 : -1;
  if (weapon === 'heavy') {
    return {
      recoilKick: 1.0,
      trauma: 0.44,
      fovKickDeg: 3.9,
      rollRad: dir * 0.024,
      zPunchMeters: 0.095,
      opticalShotPulse: 0.85,
    };
  }
  if (weapon === 'pistol') {
    return {
      recoilKick: overcharged ? 0.96 : 0.82,
      trauma: overcharged ? 0.28 : 0.2,
      fovKickDeg: overcharged ? 2.2 : 1.55,
      rollRad: dir * (overcharged ? 0.015 : 0.011),
      zPunchMeters: overcharged ? 0.045 : 0.032,
      opticalShotPulse: overcharged ? 0.48 : 0.28,
    };
  }
  return {
    recoilKick: overcharged ? 0.56 : 0.46,
    trauma: overcharged ? 0.17 : 0.13,
    fovKickDeg: overcharged ? 1.25 : 0.92,
    rollRad: dir * (overcharged ? 0.011 : 0.0085),
    zPunchMeters: 0.024,
    opticalShotPulse: 0.22,
  };
}
