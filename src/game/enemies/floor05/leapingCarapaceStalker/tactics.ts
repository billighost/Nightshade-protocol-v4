export type StalkerAction =
  | 'prowl_chase'
  | 'evasive_sidestep'
  | 'rend_claw_flurry'
  | 'tail_whip_spin'
  | 'tier_pounce_leap'
  | 'predator_blitz_rush'
  | 'acid_spine_volley'
  | 'venom_mortar_lob'
  | 'backflip_venom_reposition';

export interface StalkerTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  pounceCooldown: number;
  clawCooldown: number;
  spineCooldown: number;
  sidestepCooldown: number;
  tailWhipCooldown?: number;
  blitzCooldown?: number;
  mortarCooldown?: number;
  backflipCooldown?: number;
  damageBurstAccum?: number;
  enraged?: boolean;
  roll: number;
}

export function selectStalkerAction(input: StalkerTacticsInput): StalkerAction {
  const tailWhipCd = input.tailWhipCooldown ?? 99;
  const blitzCd = input.blitzCooldown ?? 99;
  const mortarCd = input.mortarCooldown ?? 99;
  const backflipCd = input.backflipCooldown ?? 99;
  const burstDmg = input.damageBurstAccum ?? 0;

  // 1. Reactive acrobatic backflip-evade + mid-air parting venom spines when burst-pressured at close range
  if (
    burstDmg >= 46 &&
    input.horizDist <= 6.2 &&
    backflipCd <= 0 &&
    input.roll < 0.72
  ) {
    return 'backflip_venom_reposition';
  }

  // 2. Close-quarters lethal repertoire: 360° Barbed Tail-Whip Sweep or 3-Hit Savage Scythe Flurry
  if (input.hasAttackToken && input.horizDist <= 3.7 && input.vertDist <= 2.4) {
    if (tailWhipCd <= 0 && (input.horizDist <= 2.5 || input.roll < 0.34)) {
      return 'tail_whip_spin';
    }
    if (input.horizDist <= 3.3 && input.clawCooldown <= 0) {
      return 'rend_claw_flurry';
    }
  }

  // 3. Mid-range predatory ambush: Low-profile Zig-Zag Blitz Rush OR Signature Tier Pounce Leap
  if (input.hasAttackToken && input.hasLos && input.horizDist >= 4.4 && input.horizDist <= 13.8) {
    if (
      blitzCd <= 0 &&
      input.horizDist <= 10.2 &&
      input.vertDist <= 1.2 &&
      input.roll < 0.36
    ) {
      return 'predator_blitz_rush';
    }
    if (input.pounceCooldown <= 0) {
      return 'tier_pounce_leap';
    }
  }

  // 4. Anti-cover / elevation flush: High-arc Corrosive Venom Mortar Globule
  if (
    input.hasAttackToken &&
    input.horizDist >= 7.2 &&
    input.horizDist <= 24.0 &&
    mortarCd <= 0 &&
    (!input.hasLos || input.vertDist >= 1.35 || input.roll < 0.38)
  ) {
    return 'venom_mortar_lob';
  }

  // 5. Long/mid-range fanning Acid Spine Volley
  if (
    input.hasAttackToken &&
    input.hasLos &&
    input.horizDist >= 6.0 &&
    input.horizDist <= 23.0 &&
    input.spineCooldown <= 0 &&
    input.roll < (input.enraged ? 0.78 : 0.65)
  ) {
    return 'acid_spine_volley';
  }

  // 6. Agile predatory lateral stalk-weave between attack tokens
  if (
    input.hasLos &&
    input.horizDist >= 3.8 &&
    input.horizDist <= 11.5 &&
    input.sidestepCooldown <= 0 &&
    input.roll < 0.45
  ) {
    return 'evasive_sidestep';
  }

  return 'prowl_chase';
}

export interface StalkerPounceTrajectory {
  vx: number;
  vz: number;
  peakHeight: number;
}

export function solveStalkerPounce(
  dx: number,
  dz: number,
  airTimeSec = 0.56
): StalkerPounceTrajectory {
  const dist = Math.hypot(dx, dz);
  const clamped = Math.min(13.2, Math.max(4.0, dist * 0.97));
  const dirX = dist > 1e-4 ? dx / dist : 0;
  const dirZ = dist > 1e-4 ? dz / dist : -1;
  const spd = clamped / Math.max(0.25, airTimeSec);
  return {
    vx: dirX * spd,
    vz: dirZ * spd,
    peakHeight: Math.min(3.35, 1.5 + clamped * 0.15),
  };
}

export interface StalkerVenomLobVelocity {
  vx: number;
  vy: number;
  vz: number;
}

/**
 * Pure ballistic solver for the Stalker's high-arc Corrosive Venom Mortar Globule.
 */
export function solveStalkerVenomLob(
  ox: number,
  oy: number,
  oz: number,
  tx: number,
  ty: number,
  tz: number,
  gravity = 16.0,
  flightTimeSec = 0.92
): StalkerVenomLobVelocity {
  const t = Math.max(0.35, flightTimeSec);
  return {
    vx: (tx - ox) / t,
    vy: (ty - oy + 0.5 * gravity * t * t) / t,
    vz: (tz - oz) / t,
  };
}

/**
 * Pure ballistic solver for the Stalker's reactive acrobatic backflip disengage.
 */
export function solveStalkerBackflip(
  awayDirX: number,
  awayDirZ: number,
  strafeSign: number,
  airTimeSec = 0.48
): StalkerPounceTrajectory {
  const sideX = -awayDirZ * strafeSign;
  const sideZ = awayDirX * strafeSign;
  const mixX = awayDirX * 0.84 + sideX * 0.54;
  const mixZ = awayDirZ * 0.84 + sideZ * 0.54;
  const len = Math.hypot(mixX, mixZ) || 1;
  const leapDist = 6.2;
  const spd = leapDist / Math.max(0.24, airTimeSec);
  return {
    vx: (mixX / len) * spd,
    vz: (mixZ / len) * spd,
    peakHeight: 1.95,
  };
}

export function computeSpineFanAngles(count: 2 | 3 | 5 = 3): readonly number[] {
  if (count === 2) return [-0.11, 0.11];
  if (count === 5) return [-0.3, -0.15, 0, 0.15, 0.3];
  return [-0.17, 0, 0.17];
}
