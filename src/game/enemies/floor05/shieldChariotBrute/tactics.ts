// Order also identifies the seven clips in the Floor 05 pose inspector.
export const BRUTE_ATTACKS = [
  'ram_shield_bash', 'seismic_prow_slam', 'chariot_bull_rush', 'flak_scatter_barrage',
  'incendiary_mortar_salvo', 'juggernaut_spin_cleave', 'fortress_advance_barrage',
] as const;
export type BruteAttack = (typeof BRUTE_ATTACKS)[number];
export type BruteAction = 'advance' | 'strafe_pressure' | BruteAttack;

export interface BruteTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  shieldActive: boolean;
  rushCooldown: number;
  slamCooldown: number;
  flakCooldown: number;
  bashCooldown: number;
  mortarCooldown?: number;
  spinCooldown?: number;
  fortressCooldown?: number;
  strafeCooldown?: number;
  damageBurstAccum?: number;
  enraged?: boolean;
  roll: number;
}

/**
 * Pure Floor 05 combat decision matrix for the Shield-Chariot Brute.
 * 7 distinct lethal attacks + armored lateral combat strafe + reactive Fortress Phalanx.
 */
export function selectBruteAction(input: BruteTacticsInput): BruteAction {
  const mortarCd = input.mortarCooldown ?? 99;
  const spinCd = input.spinCooldown ?? 99;
  const fortressCd = input.fortressCooldown ?? 99;
  const strafeCd = input.strafeCooldown ?? 99;
  const dmgBurst = input.damageBurstAccum ?? 0;

  // 1. Reactive Fortress Advance Barrage when absorbing heavy frontal fire behind his V-Prow Shield
  if (
    input.hasAttackToken && input.shieldActive &&
    input.hasLos &&
    dmgBurst >= 46 &&
    input.horizDist >= 4.2 &&
    input.horizDist <= 18.0 &&
    fortressCd <= 0
  ) {
    return 'fortress_advance_barrage';
  }

  // 2. Same-tier lethal melee & bull-charge pressure
  if (input.hasAttackToken && input.hasLos && input.vertDist <= 2.5) {
    // Point-blank whirlwind punish against aggressive flankers
    if (input.horizDist <= 3.8 && spinCd <= 0 && (input.roll < (input.enraged ? 0.6 : 0.42) || !input.shieldActive)) {
      return 'juggernaut_spin_cleave';
    }
    if (input.shieldActive && input.horizDist <= 3.4 && input.bashCooldown <= 0) {
      return 'ram_shield_bash';
    }
    if (input.horizDist <= 6.8 && input.slamCooldown <= 0 && input.roll < 0.68) {
      return 'seismic_prow_slam';
    }
    if (
      input.hasLos &&
      input.horizDist >= 5.0 &&
      input.horizDist <= 18.0 &&
      input.rushCooldown <= 0
    ) {
      return 'chariot_bull_rush';
    }
  }

  // 3. Anti-cover / cross-tier parabolic Incendiary Mortar Salvo (works WITHOUT LOS!)
  if (
    input.hasAttackToken &&
    input.horizDist >= 7.5 &&
    input.horizDist <= 28.0 &&
    mortarCd <= 0 &&
    (!input.hasLos || input.vertDist > 2.4 || input.roll < 0.36)
  ) {
    return 'incendiary_mortar_salvo';
  }

  // 4. Rotary 6-Barrel Flak Scatter Barrage at mid-to-long range
  if (
    input.hasAttackToken &&
    input.hasLos &&
    input.horizDist >= 5.5 &&
    input.horizDist <= 24.0 &&
    input.flakCooldown <= 0
  ) {
    return 'flak_scatter_barrage';
  }

  // 5. Armored lateral pressure strafe keeping V-Prow angled toward player between cooldowns
  if (
    input.hasLos &&
    input.horizDist >= 4.5 &&
    input.horizDist <= 13.5 &&
    strafeCd <= 0 &&
    input.roll < 0.55
  ) {
    return 'strafe_pressure';
  }

  return 'advance';
}

export function computeFlakScatterOffsets(
  overdriven = false
): ReadonlyArray<{ yaw: number; pitch: number }> {
  if (overdriven) {
    return [
      { yaw: -0.18, pitch: 0.03 },
      { yaw: -0.12, pitch: -0.025 },
      { yaw: -0.06, pitch: 0.015 },
      { yaw: 0, pitch: -0.01 },
      { yaw: 0.06, pitch: 0.015 },
      { yaw: 0.12, pitch: -0.025 },
      { yaw: 0.18, pitch: 0.03 },
    ];
  }
  return [
    { yaw: -0.14, pitch: 0.02 },
    { yaw: -0.07, pitch: -0.03 },
    { yaw: 0, pitch: 0.01 },
    { yaw: 0.07, pitch: -0.03 },
    { yaw: 0.14, pitch: 0.02 },
  ];
}

export interface BruteMortarArcSolution {
  vx: number;
  vy: number;
  vz: number;
  flightTime: number;
}

/** The hips lead the sweeping arm through one revolution, easing into a planted finish. */
export function bruteSpinYaw(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return -0.75 + Math.PI * 2 * p * p * (3 - 2 * p);
}

/**
 * Computes an arcing high-elevation parabolic trajectory for the Brute's Incendiary Mortar Salvo
 * so shells clear arena cover walls and terracing cleanly.
 */
export function solveBruteMortarArc(
  originX: number,
  originY: number,
  originZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  gravity = 17.0,
  flightTime = 1.08
): BruteMortarArcSolution {
  const t = Math.max(0.55, Math.min(1.6, flightTime));
  const dx = targetX - originX;
  const dy = targetY - originY;
  const dz = targetZ - originZ;
  return {
    vx: dx / t,
    vy: (dy + 0.5 * gravity * t * t) / t,
    vz: dz / t,
    flightTime: t,
  };
}
