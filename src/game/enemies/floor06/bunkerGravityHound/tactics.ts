export type GravityHoundAction =
  | 'stalk'
  | 'gravity_pounce_slam'
  | 'gravity_well_pulse'
  | 'tail_whip_cleave'
  | 'plasma_tusk_surge'
  | 'grav_mortar_cluster'
  | 'bull_gore_charge'
  | 'maw_singularity_beam';

export interface GravityHoundTacticsInput {
  horizDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  pounceCooldown: number;
  pulseCooldown: number;
  tuskCooldown: number;
  tailCooldown?: number;
  mortarCooldown?: number;
  chargeCooldown?: number;
  beamCooldown?: number;
  reactorBroken?: boolean;
  playerBehind?: boolean;
  timeWithoutLos?: number;
  roll: number;
}

export interface HoundPounceSolution {
  vx: number;
  vz: number;
  peakHeight: number;
  duration: number;
}

export interface HoundMortarArcSolution {
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  flightTime: number;
  targetX: number;
  targetZ: number;
}

/**
 * Pure tactical decision planner for the AAA 7-move Bunker Gravity-Hound mini-boss.
 * - Backward-compatible optional cooldown defaults keep all existing tests green.
 * - Shattering the Dorsal Grav-Singularity Reactor (`reactorBroken`) temporarily suppresses
 *   gravity_well_pulse and maw_singularity_beam, rewarding skilled weakpoint counterplay!
 */
export function selectGravityHoundAction(input: GravityHoundTacticsInput): GravityHoundAction {
  const tailCd = input.tailCooldown ?? 99;
  const mortarCd = input.mortarCooldown ?? 99;
  const chargeCd = input.chargeCooldown ?? 99;
  const beamCd = input.beamCooldown ?? 99;
  const reactorBroken = input.reactorBroken ?? false;
  const playerBehind = input.playerBehind ?? false;
  const timeNoLos = input.timeWithoutLos ?? 0;
  const isP2 = input.phase === 2;

  // 1. Cover-flushing shoulder-pod Gravity-Mine Cluster Barrage when player breaks LOS
  if (!input.hasLos) {
    if (
      mortarCd <= 0 &&
      timeNoLos >= 1.1 &&
      input.horizDist >= 6.0 &&
      input.horizDist <= 26.0
    ) {
      return 'grav_mortar_cluster';
    }
    return 'stalk';
  }

  // 2. Punish circle-strafing flankers directly behind the Hound with a 360-deg Tail-Whip Razor Cleave!
  if (playerBehind && input.horizDist <= 5.4 && tailCd <= 0) {
    return 'tail_whip_cleave';
  }

  // 3. Close-range cataclysmic Gravity-Well Pulse (only while Dorsal Reactor is intact!)
  if (input.horizDist <= 5.2 && input.pulseCooldown <= 0 && !reactorBroken) {
    return 'gravity_well_pulse';
  }

  // 4. Close-quarters Tail-Whip Cleave fallback when Gravity-Well Pulse is locked or on cooldown
  if (input.horizDist <= 4.6 && tailCd <= 0) {
    return 'tail_whip_cleave';
  }

  // 5. Signature Aerial Gravity Pounce Slam in mid-range hunting sweet spot
  if (
    input.horizDist >= 4.2 &&
    input.horizDist <= 14.5 &&
    input.pounceCooldown <= 0 &&
    input.roll < (isP2 ? 0.65 : 0.52)
  ) {
    return 'gravity_pounce_slam';
  }

  // 6. Sweeping Molten Singularity Maw Beam in mid-long sightline (only while Dorsal Reactor is intact!)
  if (
    !reactorBroken &&
    beamCd <= 0 &&
    input.horizDist >= 7.5 &&
    input.horizDist <= 22.0 &&
    input.roll < (isP2 ? 0.68 : 0.48)
  ) {
    return 'maw_singularity_beam';
  }

  // 7. Armored Bull-Gore Siege Charge across open bunker lanes
  if (
    chargeCd <= 0 &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 17.5 &&
    input.roll < (isP2 ? 0.78 : 0.62)
  ) {
    return 'bull_gore_charge';
  }

  // 8. Shoulder-Pod Gravity-Mine Cluster Barrage to zone mid-long range
  if (
    mortarCd <= 0 &&
    input.horizDist >= 8.5 &&
    input.horizDist <= 25.0 &&
    input.roll > (isP2 ? 0.58 : 0.68)
  ) {
    return 'grav_mortar_cluster';
  }

  // 9. Twin Plasma-Tusk Surge rapid volley
  if (input.tuskCooldown <= 0 && input.horizDist <= 26.0) {
    return 'plasma_tusk_surge';
  }

  return 'stalk';
}

/**
 * Pure ballistic solver for the Gravity-Hound's parabolic aerial pounce leap.
 */
export function solveHoundPounceLeap(
  dx: number,
  dz: number,
  phase: 1 | 2,
  isSecondBounce = false
): HoundPounceSolution {
  const dist = Math.hypot(dx, dz);
  const clampedDist = Math.max(4.5, Math.min(phase === 2 ? 14.2 : 12.2, dist));
  const duration = isSecondBounce ? 0.44 : phase === 2 ? 0.52 : 0.58;
  const speed = clampedDist / duration;
  const nx = dist > 0.001 ? dx / dist : 0;
  const nz = dist > 0.001 ? dz / dist : -1;
  const peakHeight = Math.min(2.35, Math.max(1.25, clampedDist * 0.175));
  return {
    vx: nx * speed,
    vz: nz * speed,
    peakHeight,
    duration,
  };
}

/**
 * Pure yaw offsets for Twin Plasma-Tusk Surge alternating rapid shots.
 * Phase 1: 4 alternating tusk bolts; Phase 2: 6 rapid bolts; Reactor broken: 3 wider shots.
 */
export function computeHoundTuskSpread(phase: 1 | 2, reactorBroken = false): number[] {
  if (reactorBroken) {
    return [-0.09, 0.0, 0.09];
  }
  if (phase === 2) {
    return [-0.075, 0.075, -0.04, 0.04, -0.015, 0.015];
  }
  return [-0.055, 0.055, -0.02, 0.02];
}

/**
 * Pure yaw sweep trajectory for the Molten Singularity Maw Beam.
 */
export function computeHoundMawSweepYaw(
  baseYaw: number,
  progress01: number,
  sweepDir: -1 | 1,
  halfArcRad = 0.42
): number {
  const t = Math.max(0, Math.min(1, progress01));
  const smooth = t * t * (3 - 2 * t);
  const offset = (-halfArcRad + smooth * halfArcRad * 2) * sweepDir;
  return baseYaw + offset;
}

/**
 * Pure ballistic arc solver for shoulder-pod Gravity-Mine Cluster Bombs.
 * Phase 1 launches a 3-mine triangular containment spread; Phase 2 launches a 5-mine carpet spread.
 */
export function solveHoundMortarCluster(
  originX: number,
  originY: number,
  originZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  phase: 1 | 2,
  gravity = 16.5
): HoundMortarArcSolution[] {
  const count = phase === 2 ? 5 : 3;
  const ringRadius = phase === 2 ? 3.2 : 2.5;
  const results: HoundMortarArcSolution[] = [];

  for (let i = 0; i < count; i++) {
    let tx = targetX;
    let tz = targetZ;
    if (i > 0) {
      const ang = ((i - 1) / (count - 1)) * Math.PI * 2 + (phase === 2 ? 0.35 : 0.15);
      tx += Math.cos(ang) * ringRadius;
      tz += Math.sin(ang) * ringRadius;
    }

    const dx = tx - originX;
    const dz = tz - originZ;
    const dy = targetY - originY;
    const horiz = Math.hypot(dx, dz);
    const flightTime = Math.max(0.76, Math.min(1.42, 0.65 + horiz * 0.036 + i * 0.04));
    const vx = dx / flightTime;
    const vz = dz / flightTime;
    const vy = (dy + 0.5 * gravity * flightTime * flightTime) / flightTime;
    const speed = Math.hypot(vx, vy, vz);

    results.push({
      vx,
      vy,
      vz,
      speed,
      flightTime,
      targetX: tx,
      targetZ: tz,
    });
  }

  return results;
}
