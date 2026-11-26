export type BeamPrismAction =
  | 'scan'
  | 'resonant_rail_beam'
  | 'sweeping_prism_laser'
  | 'refracted_fan'
  | 'prismatic_orbit_barrage'
  | 'resonance_shield_surge'
  | 'close_pulse';

export interface BeamPrismTacticsInput {
  horizDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  coreBroken?: boolean;
  railCooldown: number;
  sweepCooldown?: number;
  fanCooldown: number;
  mortarCooldown?: number;
  shieldCooldown?: number;
  pulseCooldown: number;
  damageBurstAccum?: number;
  timeWithoutLos?: number;
  roll: number;
}

/**
 * Pure deterministic 6-move tactical planner for the AAA Resonant Beam Prism:
 * 1. close_pulse: Anti-flank Gravity-Refraction Repulsor Nova when rushed (<= 6.2m)
 * 2. resonance_shield_surge: Reactive tri-faceted Refraction Barrier under heavy fire (locked if Core broken!)
 * 3. prismatic_orbit_barrage: Cover-flushing 3-orb high-arc solar mortar cluster when player hides behind cover (locked if Core broken!)
 * 4. resonant_rail_beam: Precision anti-materiel sniper rail-beam with volumetric lock-on laser
 * 5. sweeping_prism_laser: Continuous horizontal sweeping cutting laser across a 38° arc (locked if Core broken!)
 * 6. refracted_fan: 5-bolt chromatic prism split spread volley
 */
export function selectBeamPrismAction(input: BeamPrismTacticsInput): BeamPrismAction {
  const coreBroken = Boolean(input.coreBroken);
  const sweepCd = input.sweepCooldown ?? 99;
  const mortarCd = input.mortarCooldown ?? 99;
  const shieldCd = input.shieldCooldown ?? 99;
  const dmgBurst = input.damageBurstAccum ?? 0;
  const noLosTime = input.timeWithoutLos ?? 0;

  // 1. Cover-flushing Prismatic Orbit Barrage when player breaks LOS behind pillars/walls!
  if (!input.hasLos) {
    if (
      !coreBroken &&
      input.hasAttackToken &&
      noLosTime >= 0.9 &&
      mortarCd <= 0 &&
      input.horizDist >= 7.0 &&
      input.horizDist <= 38.0
    ) {
      return 'prismatic_orbit_barrage';
    }
    return 'scan';
  }

  // 2. Close-range Anti-Flank Repulsor Nova Blast
  if (input.horizDist <= 6.2 && input.pulseCooldown <= 0) {
    return 'close_pulse';
  }

  // 3. Reactive Refractive Barrier Counter when taking rapid sustained gunfire!
  if (
    !coreBroken &&
    dmgBurst >= 75 &&
    shieldCd <= 0 &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 38.0
  ) {
    return 'resonance_shield_surge';
  }

  if (!input.hasAttackToken) return 'scan';

  // 4. Precision Anti-Materiel Resonant Rail Beam
  if (input.railCooldown <= 0 && input.horizDist >= 7.5 && input.roll < 0.44) {
    return 'resonant_rail_beam';
  }

  // 5. Continuous Horizontal Sweeping Cutting Laser (locked if Core shattered!)
  if (
    !coreBroken &&
    sweepCd <= 0 &&
    input.horizDist >= 8.0 &&
    input.horizDist <= 34.0 &&
    input.roll >= 0.44 &&
    input.roll < 0.76
  ) {
    return 'sweeping_prism_laser';
  }

  // 6. 5-Bolt Chromatic Refracted Fan Volley
  if (input.fanCooldown <= 0 && input.horizDist <= 36.0) {
    return 'refracted_fan';
  }

  // Fallbacks if roll landed on a cooling ability
  if (input.railCooldown <= 0) {
    return 'resonant_rail_beam';
  }
  if (!coreBroken && mortarCd <= 0 && input.horizDist >= 9.0 && input.horizDist <= 36.0) {
    return 'prismatic_orbit_barrage';
  }
  return 'scan';
}

/**
 * Returns the 5 chromatic yaw offsets for the Prism's blooming Refracted Fan volley
 * (tighter 3-bolt core if Refractive Prism Core is shattered).
 */
export function computeRefractedFanAngles(coreBroken = false): readonly number[] {
  return coreBroken ? [-0.11, 0, 0.11] : [-0.2, -0.1, 0, 0.1, 0.2];
}

/**
 * Pure horizontal sweep-angle interpolation for the continuous Sweeping Prism Laser.
 * Sweeps smoothly from -halfArc to +halfArc (or reversed based on sweepDir).
 */
export function computeSweepBeamYaw(
  centerYaw: number,
  progress: number,
  sweepDir: 1 | -1,
  halfArcRad = 0.34
): number {
  const t = Math.max(0, Math.min(1, progress));
  // Smooth ease-in-out S-curve for readable dodge timing
  const eased = t * t * (3 - 2 * t);
  const offset = (-halfArcRad + eased * halfArcRad * 2) * sweepDir;
  return centerYaw + offset;
}

/**
 * Pure ballistic cluster solver for the 3-orb cover-flushing Prismatic Orbit Barrage.
 */
export function solvePrismMortarCluster(
  ox: number,
  oy: number,
  oz: number,
  tx: number,
  ty: number,
  tz: number,
  gravity = 16.5
): Array<{ vx: number; vy: number; vz: number; speed: number; flightTime: number }> {
  const dx = tx - ox;
  const dz = tz - oz;
  const dist = Math.hypot(dx, dz);
  const perpX = dist > 0.01 ? -dz / dist : 1;
  const perpZ = dist > 0.01 ? dx / dist : 0;

  const spreads = [-2.2, 0, 2.2];
  return spreads.map((lat, idx) => {
    const aimX = tx + perpX * lat;
    const aimZ = tz + perpZ * lat;
    const ddx = aimX - ox;
    const ddz = aimZ - oz;
    const ddy = ty - oy;
    const hDist = Math.hypot(ddx, ddz);
    const flightTime = Math.max(0.85, Math.min(1.85, 0.72 + hDist * 0.044 + idx * 0.06));
    const vx = ddx / flightTime;
    const vz = ddz / flightTime;
    const vy = (ddy + 0.5 * gravity * flightTime * flightTime) / flightTime;
    const speed = Math.hypot(vx, vy, vz);
    return { vx, vy, vz, speed, flightTime };
  });
}
