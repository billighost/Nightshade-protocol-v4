export type LevitatorAttackChoice =
  | 'orbit'
  | 'tri_shard_volley'
  | 'hex_shard_barrage'
  | 'focused_astral_lance'
  | 'telekinetic_cross_slash'
  | 'singularity_mortar'
  | 'astral_pulse_repel';

export interface LevitatorTacticsInput {
  horizDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  coreBroken: boolean;
  pulseCooldown: number;
  lanceCooldown: number;
  volleyCooldown: number;
  barrageCooldown?: number;
  slashCooldown?: number;
  mortarCooldown?: number;
  timeWithoutLos?: number;
  roll: number;
}

/**
 * Pure 6-attack tactical combat planner for the AAA Astral Shard Levitator:
 * 1. `astral_pulse_repel` — Close-range implosion-to-supernova 360° shockwave pushback
 * 2. `singularity_mortar` — Arcing cover-flushing Astral Collapse Orb when player breaks LOS or camps mid/far range
 * 3. `telekinetic_cross_slash` — Predatory Blink-Surge + twin glowing scythe crescent slash waves (locked when core broken!)
 * 4. `focused_astral_lance` — Multi-ring laser telegraph -> high-velocity rail lance (locked when core broken!)
 * 5. `hex_shard_barrage` — All 6 wing-shards fire a sweeping spiral fan
 * 6. `tri_shard_volley` — Rapid sequential 3-shard aimed burst from individual recoiling wing-blades
 */
export function selectLevitatorAttack(input: LevitatorTacticsInput): LevitatorAttackChoice {
  const barrageCd = input.barrageCooldown ?? 99;
  const slashCd = input.slashCooldown ?? 99;
  const mortarCd = input.mortarCooldown ?? 99;
  const timeNoLos = input.timeWithoutLos ?? 0;

  // Flush cover with an arcing Singularity Gravity Mortar even without direct LOS!
  if (!input.hasLos) {
    if (
      input.hasAttackToken &&
      timeNoLos >= 1.15 &&
      mortarCd <= 0 &&
      input.horizDist >= 6.5 &&
      input.horizDist <= 30.0
    ) {
      return 'singularity_mortar';
    }
    return 'orbit';
  }

  // Immediate close-quarters repulsion nova if player rushes underneath
  if (input.horizDist <= 6.2 && input.pulseCooldown <= 0) {
    return 'astral_pulse_repel';
  }

  if (!input.hasAttackToken) return 'orbit';

  // Predatory close-mid Telekinetic Cross-Slash dive (requires intact Astral Heart!)
  if (
    !input.coreBroken &&
    input.horizDist >= 5.2 &&
    input.horizDist <= 14.5 &&
    slashCd <= 0 &&
    input.roll < 0.34
  ) {
    return 'telekinetic_cross_slash';
  }

  // Long-sightline Focused Astral Lance rail-beam (requires intact Astral Heart!)
  if (
    !input.coreBroken &&
    input.horizDist >= 9.0 &&
    input.horizDist <= 32.0 &&
    input.lanceCooldown <= 0 &&
    input.roll < 0.56
  ) {
    return 'focused_astral_lance';
  }

  // Cover-flushing / area-denial Singularity Gravity Mortar at mid-to-long range
  if (
    input.horizDist >= 10.0 &&
    input.horizDist <= 30.0 &&
    mortarCd <= 0 &&
    input.roll >= 0.56 &&
    input.roll < 0.78
  ) {
    return 'singularity_mortar';
  }

  // Sweeping 6-blade Hex-Shard Spiral Barrage
  if (input.horizDist <= 28.0 && barrageCd <= 0 && input.roll >= 0.45) {
    return 'hex_shard_barrage';
  }

  // Bread-and-butter sequential Tri-Shard Volley
  if (input.volleyCooldown <= 0 && input.horizDist <= 34.0) {
    return 'tri_shard_volley';
  }

  return 'orbit';
}

export function computeTriShardOffsets(): ReadonlyArray<{
  shardIndex: number;
  yawOffset: number;
  pitchOffset: number;
}> {
  return [
    { shardIndex: 0, yawOffset: -0.068, pitchOffset: 0.012 },
    { shardIndex: 2, yawOffset: 0.0, pitchOffset: 0.0 },
    { shardIndex: 3, yawOffset: 0.068, pitchOffset: -0.012 },
  ];
}

export function computeHexSpiralOffsets(): ReadonlyArray<{
  shardIndex: number;
  yawOffset: number;
  pitchOffset: number;
}> {
  return [
    { shardIndex: 0, yawOffset: -0.14, pitchOffset: 0.032 },
    { shardIndex: 3, yawOffset: 0.14, pitchOffset: 0.032 },
    { shardIndex: 1, yawOffset: -0.085, pitchOffset: 0.008 },
    { shardIndex: 4, yawOffset: 0.085, pitchOffset: 0.008 },
    { shardIndex: 2, yawOffset: -0.032, pitchOffset: -0.018 },
    { shardIndex: 5, yawOffset: 0.032, pitchOffset: -0.018 },
  ];
}

export interface AstralMortarArcSolution {
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  flightTime: number;
}

/**
 * Pure ballistic arc solver for the Levitator's arcing Singularity Gravity Mortar.
 */
export function solveAstralMortarArc(
  originX: number,
  originY: number,
  originZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  gravity = 15.2
): AstralMortarArcSolution {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const dz = targetZ - originZ;
  const horizDist = Math.hypot(dx, dz);
  const flightTime = Math.max(0.72, Math.min(1.55, horizDist / 13.8));
  const vx = dx / flightTime;
  const vz = dz / flightTime;
  const vy = (dy + 0.5 * gravity * flightTime * flightTime) / flightTime;
  const speed = Math.hypot(vx, vy, vz);
  return { vx, vy, vz, speed, flightTime };
}

/**
 * Computes an aggressive lateral Phase-Blink flank velocity vector perpendicular to the player sightline.
 */
export function computeBlinkFlankVelocity(
  toPlayerX: number,
  toPlayerZ: number,
  sideSign: number,
  burstSpeed = 14.5
): { vx: number; vz: number } {
  const len = Math.hypot(toPlayerX, toPlayerZ);
  const dx = len > 1e-4 ? toPlayerX / len : 0;
  const dz = len > 1e-4 ? toPlayerZ / len : -1;
  const rightX = -dz;
  const rightZ = dx;
  return {
    vx: rightX * sideSign * burstSpeed - dx * 2.2,
    vz: rightZ * sideSign * burstSpeed - dz * 2.2,
  };
}
