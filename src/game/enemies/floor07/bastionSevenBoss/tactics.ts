/**
 * Pure, decoupled Final Boss tactical decision engine & ballistic math for
 * Floor 07 Final Boss: TITAN-RIG "BASTION-VII"
 *
 * Zero Three.js dependencies so every attack routing branch, Phase 2 Overdrive
 * escalation, missile carpet target spread, plasma fan wave, and hydraulic charge
 * vector can be deterministically verified via `node:test`.
 */

export type BastionAttackKind =
  | 'seismic_hydraulic_stomp'
  | 'twin_siege_rail_lance'
  | 'carpet_missile_barrage'
  | 'dual_rotary_suppression'
  | 'overdrive_titan_charge'
  | 'arc_plasma_fan_barrage';

export interface BastionTacticalInput {
  horizDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  timeWithoutLos: number;
  stompCooldown: number;
  railCooldown: number;
  missileCooldown: number;
  chargeCooldown: number;
  plasmaFanCooldown: number;
  rotaryCooldown: number;
  /** Deterministic roll in [0, 1) */
  roll: number;
}

/**
 * Selects the optimal next flagship boss attack for TITAN-RIG "BASTION-VII":
 * 1. Close-quarters crowd-control (`horizDist <= 6.4m`) -> `seismic_hydraulic_stomp`
 *    (double seismic shockwave in Phase 2 Overdrive!).
 * 2. Player hiding behind Rotunda pillars (`!hasLos` & `timeWithoutLos >= 0.8s`) ->
 *    `carpet_missile_barrage` arcing over cover!
 * 3. Mid-range open lane (`7.5m..19.5m`) -> prioritizes `overdrive_titan_charge`
 *    (higher weight in Phase 2), `twin_siege_rail_lance`, `arc_plasma_fan_barrage`,
 *    `carpet_missile_barrage`, and `dual_rotary_suppression`.
 * 4. Long range (`> 19.5m`) -> emphasizes `twin_siege_rail_lance`, `carpet_missile_barrage`,
 *    and `dual_rotary_suppression`.
 */
export function selectBastionAttack(input: BastionTacticalInput): BastionAttackKind {
  const isP2 = input.phase === 2;

  // 1. CQC punisher: crushing hydraulic seismic stomp
  if (input.horizDist <= 6.4 && input.stompCooldown <= 0) {
    return 'seismic_hydraulic_stomp';
  }

  // 2. Anti-cover flush: elevated 6-cell shoulder pods carpet-bomb behind pillars
  if (!input.hasLos && input.timeWithoutLos >= 0.8 && input.missileCooldown <= 0) {
    return 'carpet_missile_barrage';
  }

  // 3. Close-mid range (6.4m - 14.5m): aggressive fan plasma, hydraulic charge, rotary, rail
  if (input.horizDist <= 14.5) {
    const chargeCap = isP2 ? 0.30 : 0.18;
    if (input.hasLos && input.horizDist >= 7.2 && input.chargeCooldown <= 0 && input.roll < chargeCap) {
      return 'overdrive_titan_charge';
    }
    if (input.hasLos && input.plasmaFanCooldown <= 0 && input.roll < 0.50) {
      return 'arc_plasma_fan_barrage';
    }
    if (input.hasLos && input.railCooldown <= 0 && input.roll < 0.72) {
      return 'twin_siege_rail_lance';
    }
    if (input.missileCooldown <= 0 && input.roll < 0.86) {
      return 'carpet_missile_barrage';
    }
    if (input.rotaryCooldown <= 0) {
      return 'dual_rotary_suppression';
    }
    return input.missileCooldown <= 0 ? 'carpet_missile_barrage' : 'arc_plasma_fan_barrage';
  }

  // 4. Long range (> 14.5m): Twin Siege Rail-Lance convergence, Carpet Missiles, Overdrive Charge, Rotary
  if (input.hasLos && input.railCooldown <= 0 && input.roll < (isP2 ? 0.38 : 0.32)) {
    return 'twin_siege_rail_lance';
  }
  if (input.missileCooldown <= 0 && input.roll < 0.64) {
    return 'carpet_missile_barrage';
  }
  if (input.hasLos && input.horizDist <= 22.0 && input.chargeCooldown <= 0 && input.roll < (isP2 ? 0.84 : 0.76)) {
    return 'overdrive_titan_charge';
  }
  if (input.rotaryCooldown <= 0) {
    return 'dual_rotary_suppression';
  }
  return 'carpet_missile_barrage';
}

export interface CarpetTargetPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Generates an arcing carpet-strike cluster around the player's position.
 * Phase 1 deploys 4 staggered warheads in a tight tactical diamond;
 * Phase 2 Overdrive unleashes 6 sweeping warheads covering both flank escape lanes!
 */
export function computeSiegeMissileTargets(
  playerX: number,
  playerY: number,
  playerZ: number,
  bossX: number,
  bossZ: number,
  phase: 1 | 2
): CarpetTargetPoint[] {
  const count = phase === 2 ? 6 : 4;
  const dx = playerX - bossX;
  const dz = playerZ - bossZ;
  const dist = Math.hypot(dx, dz) || 1;
  const fwdX = dx / dist;
  const fwdZ = dz / dist;
  const rightX = -fwdZ;
  const rightZ = fwdX;

  const patterns: Array<[number, number]> =
    count === 6
      ? [
          [0.0, 0.0],
          [-2.9, 0.8],
          [2.9, 0.8],
          [-1.8, -2.5],
          [1.8, -2.5],
          [0.0, 3.1],
        ]
      : [
          [0.0, 0.0],
          [-2.6, 0.6],
          [2.6, 0.6],
          [0.0, -2.4],
        ];

  return patterns.map(([lat, depth]) => ({
    x: playerX + rightX * lat + fwdX * depth,
    y: playerY + 0.12,
    z: playerZ + rightZ * lat + fwdZ * depth,
  }));
}

export interface UnitDir3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes synchronized wide horizontal plasma wave directions for both arm cannons.
 * Phase 1 fires a 5-bolt sweeping fan; Phase 2 Overdrive escalates to a 7-bolt wall!
 */
export function computePlasmaFanDirections(
  yaw: number,
  pitch: number,
  phase: 1 | 2
): UnitDir3[] {
  const count = phase === 2 ? 7 : 5;
  const halfSpread = phase === 2 ? 0.48 : 0.36;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const dirs: UnitDir3[] = [];

  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * 2 - 1;
    const angle = yaw + t * halfSpread;
    const x = -Math.sin(angle) * cosP;
    const y = sinP;
    const z = -Math.cos(angle) * cosP;
    const len = Math.hypot(x, y, z) || 1;
    dirs.push({ x: x / len, y: y / len, z: z / len });
  }
  return dirs;
}

export interface ChargeVelocity2D {
  vx: number;
  vz: number;
  speed: number;
}

/**
 * Computes the hydraulic rocket-assisted Titan Bull-Charge vector toward the player.
 * Escalates sharply in Phase 2 Overdrive!
 */
export function computeTitanChargeVelocity(
  bossX: number,
  bossZ: number,
  targetX: number,
  targetZ: number,
  phase: 1 | 2
): ChargeVelocity2D {
  const speed = phase === 2 ? 12.6 : 10.2;
  const dx = targetX - bossX;
  const dz = targetZ - bossZ;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) {
    return { vx: 0, vz: -speed, speed };
  }
  return {
    vx: (dx / len) * speed,
    vz: (dz / len) * speed,
    speed,
  };
}
