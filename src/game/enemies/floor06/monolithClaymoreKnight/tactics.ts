export type ClaymoreKnightAction =
  | 'advance'
  | 'twin_cleave_combo'
  | 'seismic_monolith_slam'
  | 'lunge_pierce_thrust'
  | 'astral_crescent_wave'
  | 'monolith_vault_crash'
  | 'aegis_guard_advance';

export interface ClaymoreKnightTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  obeliskBroken?: boolean;
  slamCooldown: number;
  lungeCooldown: number;
  cleaveCooldown: number;
  waveCooldown?: number;
  vaultCooldown?: number;
  guardCooldown?: number;
  damageBurstAccum?: number;
  roll: number;
}

/**
 * Pure deterministic 6-move tactical planner for the AAA Monolith Claymore Knight:
 * 1. twin_cleave_combo: 2-hit rhythmic horizontal cleave + rising diagonal uppercut (close range <= 4.3m)
 * 2. seismic_monolith_slam: overhead two-handed greatsword smash -> 7.6m shockwave + exposed Dorsal Obelisk (2.4–7.8m)
 * 3. aegis_guard_advance: reactive forearm Paranatural Aegis shield-wall march when taking sustained fire (4.5–15m)
 * 4. monolith_vault_crash: parabolic airborne leap slam -> 8.6m radial quake (7.5–15.5m, locked if Obelisk shattered!)
 * 5. lunge_pierce_thrust: coiled fencing rush + sweeping finisher (4.6–12.4m)
 * 6. astral_crescent_wave: anti-kiting 3-bolt glowing cyan crescent blade wave fan (6.8–20m, locked if Obelisk shattered!)
 */
export function selectClaymoreKnightAction(
  input: ClaymoreKnightTacticsInput
): ClaymoreKnightAction {
  const obeliskBroken = Boolean(input.obeliskBroken);
  const waveCd = input.waveCooldown ?? 99;
  const vaultCd = input.vaultCooldown ?? 99;
  const guardCd = input.guardCooldown ?? 99;
  const dmgBurst = input.damageBurstAccum ?? 0;

  if (!input.hasLos || input.vertDist > 3.8) {
    // Even across elevation gaps up to 5.5m, an intact Knight can hurl an Astral Crescent Wave!
    if (
      input.hasLos &&
      input.hasAttackToken &&
      !obeliskBroken &&
      input.vertDist <= 5.5 &&
      input.horizDist >= 6.0 &&
      input.horizDist <= 20.0 &&
      waveCd <= 0
    ) {
      return 'astral_crescent_wave';
    }
    return 'advance';
  }

  // 1. Reactive Paranatural Aegis Guard March under heavy frontal fire
  if (
    !obeliskBroken &&
    dmgBurst >= 60 &&
    guardCd <= 0 &&
    input.horizDist >= 4.4 &&
    input.horizDist <= 16.0
  ) {
    return 'aegis_guard_advance';
  }

  // 2. Close-range lethal Twin Cleave Combo
  if (input.horizDist <= 4.3 && input.cleaveCooldown <= 0) {
    return 'twin_cleave_combo';
  }

  // 3. Close-Mid Seismic Monolith Slam
  if (
    input.hasAttackToken &&
    input.horizDist >= 2.4 &&
    input.horizDist <= 7.8 &&
    input.slamCooldown <= 0 &&
    input.roll < 0.56
  ) {
    return 'seismic_monolith_slam';
  }

  // 4. Mid-Long Airborne Monolith Vault-Crash Leap Slam (locked when Dorsal Obelisk shattered!)
  if (
    input.hasAttackToken &&
    !obeliskBroken &&
    input.horizDist >= 7.5 &&
    input.horizDist <= 15.5 &&
    vaultCd <= 0 &&
    input.roll < 0.44
  ) {
    return 'monolith_vault_crash';
  }

  // 5. Anti-Kiting 3-Bolt Astral Crescent Wave (locked when Dorsal Obelisk shattered!)
  if (
    input.hasAttackToken &&
    !obeliskBroken &&
    input.horizDist >= 6.8 &&
    input.horizDist <= 20.0 &&
    waveCd <= 0 &&
    input.roll >= 0.44 &&
    input.roll < 0.78
  ) {
    return 'astral_crescent_wave';
  }

  // 6. Aggressive Lunge Pierce Thrust gap-closer
  if (
    input.hasAttackToken &&
    input.horizDist > 4.6 &&
    input.horizDist <= 12.6 &&
    input.lungeCooldown <= 0
  ) {
    return 'lunge_pierce_thrust';
  }

  return 'advance';
}

/**
 * Returns the 3 horizontal yaw spread offsets for the Knight's sweeping Astral Crescent Wave fan.
 */
export function computeCrescentWaveOffsets(): readonly number[] {
  return [-0.19, 0.0, 0.19];
}

/**
 * Pure ballistic solver for the Monolith Vault-Crash parabolic leap velocity & peak arc height.
 */
export function solveVaultCrashLeap(
  dx: number,
  dz: number,
  flightDuration = 0.68
): { vx: number; vz: number; peakHeight: number; distance: number } {
  const dist = Math.hypot(dx, dz);
  const clampedDist = Math.max(3.2, Math.min(13.8, dist - 1.4));
  const nx = dist > 0.01 ? dx / dist : 0;
  const nz = dist > 0.01 ? dz / dist : -1;
  const speed = clampedDist / Math.max(0.35, flightDuration);
  const peakHeight = 2.15 + Math.min(1.65, clampedDist * 0.12);
  return {
    vx: nx * speed,
    vz: nz * speed,
    peakHeight,
    distance: clampedDist,
  };
}
