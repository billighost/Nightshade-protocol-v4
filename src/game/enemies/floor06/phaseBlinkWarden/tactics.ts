export type WardenAction =
  | 'maneuver'
  | 'phase_blink_flank'
  | 'blink_backstab_ambush'
  | 'resonance_burst'
  | 'dimensional_rift_barrage'
  | 'void_anchor_snare'
  | 'phase_slash_repel';

export interface WardenTacticsInput {
  horizDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  gyroBroken: boolean;
  blinkCooldown: number;
  burstCooldown: number;
  slashCooldown: number;
  /** Optional cooldowns for expanded 6-attack AAA kit (default cleanly for backward compatibility) */
  ambushCooldown?: number;
  riftBarrageCooldown?: number;
  snareCooldown?: number;
  timeWithoutLos?: number;
  roll: number;
}

/**
 * Pure deterministic 6-attack tactical brain for Floor 06 Enemy #4: PHASE-BLINK WARDEN.
 *
 * Counterplay contract:
 * - Shattering its chest `PHASE-ANCHOR GYRO` (`gyroBroken === true`) locks out BOTH
 *   spatial teleport moves (`phase_blink_flank` and `blink_backstab_ambush`) until repaired,
 *   turning the elusive dimensional assassin into an exposed, punish-able foot fighter!
 * - Breaking LOS behind cover for >= 1.0s provokes a cover-flushing `void_anchor_snare` mortar.
 */
export function selectWardenAction(input: WardenTacticsInput): WardenAction {
  const ambushCd = input.ambushCooldown ?? 99;
  const riftCd = input.riftBarrageCooldown ?? 99;
  const snareCd = input.snareCooldown ?? 99;
  const noLos = input.timeWithoutLos ?? 0;

  // 1. Cover-flushing Void-Anchor Snare mortar when player hides behind brutalist pillars/walls
  if (
    !input.hasLos &&
    noLos >= 1.0 &&
    input.hasAttackToken &&
    snareCd <= 0 &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 28.0
  ) {
    return 'void_anchor_snare';
  }

  if (!input.hasLos) return 'maneuver';

  // 2. Lethal close-quarters Twin Mantis-Blade Slash Repel
  if (input.horizDist <= 3.9 && input.slashCooldown <= 0) {
    return 'phase_slash_repel';
  }

  // 3. Predatory Blink-Backstab Ambush (only while chest Phase-Anchor Gyro is intact!)
  if (
    !input.gyroBroken &&
    input.hasAttackToken &&
    ambushCd <= 0 &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 17.0 &&
    input.roll >= 0.42 &&
    input.roll < 0.72
  ) {
    return 'blink_backstab_ambush';
  }

  // 4. Lateral Spatial Phase-Blink Flank + Snap Burst (only while chest Phase-Anchor Gyro is intact!)
  if (
    !input.gyroBroken &&
    input.blinkCooldown <= 0 &&
    input.horizDist <= 23.0 &&
    input.roll < 0.38
  ) {
    return 'phase_blink_flank';
  }

  // 5. Charged 5-Bolt Converging Dimensional Rift Crescent Barrage (mid-to-long sightlines)
  if (
    input.hasAttackToken &&
    riftCd <= 0 &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 25.0 &&
    input.roll >= 0.65
  ) {
    return 'dimensional_rift_barrage';
  }

  // 6. High-pressure Void-Anchor Snare at long range if bursts are cooling
  if (
    input.hasAttackToken &&
    snareCd <= 0 &&
    input.horizDist >= 14.0 &&
    input.horizDist <= 28.0 &&
    input.burstCooldown > 0
  ) {
    return 'void_anchor_snare';
  }

  // 7. Signature Alternating Akimbo Wrist-Caster Resonance Burst
  if (input.hasAttackToken && input.burstCooldown <= 0 && input.horizDist <= 27.0) {
    return 'resonance_burst';
  }

  return 'maneuver';
}

export interface BlinkTargetPoint {
  x: number;
  z: number;
}

/**
 * Computes the candidate lateral spatial phase-blink destination that flanks around the player
 * while slightly adjusting range toward the Warden's preferred engagement envelope.
 */
export function computeBlinkFlankTarget(
  wardenX: number,
  wardenZ: number,
  playerX: number,
  playerZ: number,
  strafeSign: number,
  blinkDist = 4.6
): BlinkTargetPoint {
  const dx = playerX - wardenX;
  const dz = playerZ - wardenZ;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const rightX = -dirZ;
  const rightZ = dirX;
  const sign = strafeSign >= 0 ? 1 : -1;
  const advanceBias = dist > 11.5 ? 1.45 : dist < 6.2 ? -1.1 : 0.45;
  return {
    x: wardenX + rightX * sign * blinkDist + dirX * advanceBias,
    z: wardenZ + rightZ * sign * blinkDist + dirZ * advanceBias,
  };
}

/**
 * Computes the predatory Blink-Ambush arrival point offset onto the operative's flank at
 * close-quarters Mantis-Blade strike distance (~3.1m) so the player gets a fair, readable counter window.
 */
export function computeAmbushBlinkTarget(
  wardenX: number,
  wardenZ: number,
  playerX: number,
  playerZ: number,
  flankSign: number,
  standoffDist = 3.15
): BlinkTargetPoint {
  const dx = playerX - wardenX;
  const dz = playerZ - wardenZ;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const rightX = -dirZ;
  const rightZ = dirX;
  const sign = flankSign >= 0 ? 1 : -1;
  // Offset 65 deg onto the operative's flank (just inside peripheral vision for dramatic counterplay)
  const backX = -dirX * 0.42 + rightX * sign * 0.91;
  const backZ = -dirZ * 0.42 + rightZ * sign * 0.91;
  return {
    x: playerX + backX * standoffDist,
    z: playerZ + backZ * standoffDist,
  };
}

/**
 * Computes the symmetric yaw offsets (radians) for the 5-bolt Dimensional Rift Crescent Barrage.
 * Drops to 3 bolts if the chest Phase-Anchor Gyro is currently shattered.
 */
export function computeRiftArcFanAngles(gyroBroken: boolean): readonly number[] {
  return gyroBroken ? [-0.14, 0, 0.14] : [-0.24, -0.12, 0, 0.12, 0.24];
}

export interface VoidSnareArcSolution {
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  flightTime: number;
}

/**
 * Solves a crisp ballistic lob for the cover-flushing Void-Anchor Snare mortar bomb.
 */
export function solveVoidSnareArc(
  originX: number,
  originY: number,
  originZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  gravity = 16.5
): VoidSnareArcSolution {
  const dx = targetX - originX;
  const dz = targetZ - originZ;
  const dy = targetY - originY;
  const horiz = Math.hypot(dx, dz);
  const flightTime = Math.max(0.75, Math.min(1.55, 0.62 + horiz / 21.0));
  const vx = dx / flightTime;
  const vz = dz / flightTime;
  const vy = (dy + 0.5 * gravity * flightTime * flightTime) / flightTime;
  const speed = Math.hypot(vx, vy, vz);
  return { vx, vy, vz, speed, flightTime };
}
