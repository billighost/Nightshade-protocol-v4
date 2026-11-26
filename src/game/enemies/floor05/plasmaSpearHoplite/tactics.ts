export type HopliteAction =
  | 'advance'
  | 'combat_strafe'
  | 'phalanx_brace_advance'
  | 'shield_bash_slam'
  | 'triple_flurry_thrust'
  | 'phalanx_sweep_combo'
  | 'spear_lunge_thrust'
  | 'vaulting_plunge_spear'
  | 'plasma_javelin_throw';

export interface HopliteTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  capacitorBroken: boolean;
  hpRatio?: number;
  lungeCooldown: number;
  sweepCooldown: number;
  javelinCooldown: number;
  braceCooldown: number;
  flurryCooldown?: number;
  bashCooldown?: number;
  vaultCooldown?: number;
  strafeCooldown?: number;
  damageBurstAccum: number;
  roll: number;
}

export interface HopliteVaultTrajectory {
  vx: number;
  vz: number;
  peakHeight: number;
  duration: number;
}

/**
 * Pure tactical decision selector for the Floor 05 Plasma-Spear Hoplite (unit-testable, zero Three.js).
 * Provides 7 distinct lethal attacks + reactive shield-wall phalanx pressure + tactical lateral strafing.
 */
export function selectHopliteAction(input: HopliteTacticsInput): HopliteAction {
  const flurryCd = input.flurryCooldown ?? 99;
  const bashCd = input.bashCooldown ?? 99;
  const vaultCd = input.vaultCooldown ?? 99;
  const strafeCd = input.strafeCooldown ?? 99;
  const enraged = (input.hpRatio ?? 1) <= 0.6;

  if (!input.hasLos && input.horizDist > 8.5) {
    return 'advance';
  }

  // 1. Reactive Aegis shield-wall phalanx march when taking sustained frontal gunfire
  if (
    !input.capacitorBroken &&
    input.braceCooldown <= 0 &&
    input.damageBurstAccum >= 26 &&
    input.horizDist >= 3.8 &&
    input.horizDist <= 19.0
  ) {
    return 'phalanx_brace_advance';
  }

  // 2. Close-quarters brutal Spartan pressure (Shield Bash -> Triple Flurry -> Wide Plasma Sweep)
  if (input.hasAttackToken && input.vertDist <= 2.4) {
    if (input.horizDist <= 2.85 && !input.capacitorBroken && bashCd <= 0 && input.roll < 0.56) {
      return 'shield_bash_slam';
    }
    if (input.horizDist <= 4.35 && flurryCd <= 0 && input.roll < (enraged ? 0.68 : 0.52)) {
      return 'triple_flurry_thrust';
    }
    if (input.horizDist <= 3.85 && input.sweepCooldown <= 0) {
      return 'phalanx_sweep_combo';
    }
    if (input.horizDist <= 4.4 && flurryCd <= 0) {
      return 'triple_flurry_thrust';
    }
  }

  // 3. Mid-range gap closers (Achilles Vaulting Plunge Leap & Blinding Spear Lunge Thrust)
  if (input.hasAttackToken) {
    if (
      input.horizDist >= 6.4 &&
      input.horizDist <= 14.8 &&
      vaultCd <= 0 &&
      (input.vertDist > 1.2 || input.roll < (enraged ? 0.52 : 0.38))
    ) {
      return 'vaulting_plunge_spear';
    }
    if (
      input.vertDist <= 2.4 &&
      input.horizDist >= 3.2 &&
      input.horizDist <= 9.8 &&
      input.lungeCooldown <= 0 &&
      input.roll < 0.72
    ) {
      return 'spear_lunge_thrust';
    }
  }

  // 4. Mid-to-long range high-velocity tracking plasma javelin volleys
  if (
    input.hasAttackToken &&
    input.hasLos &&
    input.horizDist >= 6.8 &&
    input.horizDist <= 25.5 &&
    input.javelinCooldown <= 0
  ) {
    return 'plasma_javelin_throw';
  }

  // 5. Dynamic predatory lateral combat strafe instead of robotic straight-line walking
  if (
    input.hasLos &&
    input.horizDist >= 3.6 &&
    input.horizDist <= 11.5 &&
    strafeCd <= 0 &&
    input.roll < 0.58
  ) {
    return 'combat_strafe';
  }

  return 'advance';
}

/**
 * Computes lateral javelin spread fan angles (1 tight sniper bolt, 2-bolt fork, or 3-bolt enraged fan).
 */
export function computeJavelinSpreadAngles(count: 1 | 2 | 3): readonly number[] {
  if (count === 3) return [-0.11, 0, 0.11];
  if (count === 2) return [-0.072, 0.072];
  return [0];
}

/**
 * Pure ballistic solver for the Hoplite's Achilles Vaulting Plunge Spear leap.
 * Clamps horizontal impulse and computes crisp parabolic peak height for animation & landing slam.
 */
export function solveHopliteVaultLeap(
  dx: number,
  dz: number,
  duration = 0.62
): HopliteVaultTrajectory {
  const dist = Math.hypot(dx, dz);
  const clampedDist = Math.max(4.2, Math.min(13.2, dist));
  const dirX = dist > 0.001 ? dx / dist : 0;
  const dirZ = dist > 0.001 ? dz / dist : -1;
  const safeDur = Math.max(0.45, Math.min(0.82, duration));
  const speed = clampedDist / safeDur;
  const peakHeight = Math.min(3.1, 1.85 + clampedDist * 0.095);
  return {
    vx: dirX * speed,
    vz: dirZ * speed,
    peakHeight,
    duration: safeDur,
  };
}
