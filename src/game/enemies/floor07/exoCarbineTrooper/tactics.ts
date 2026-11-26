/**
 * Pure, deterministic tactical decision logic for the AAA Exo-Carbine Trooper.
 * Decoupled from Three.js so every attack priority, weakpoint counterplay lock,
 * cover-flush grenade trigger, CQC buttstroke counter, and lead-prediction vector
 * can be rigorously unit-tested with `node:test`.
 */

export type ExoTrooperAttackKind =
  | 'none'
  | 'pulse_burst'
  | 'jet_flank_burst'
  | 'overcharged_hyper_burst'
  | 'flush_grenade'
  | 'cqc_buttstroke';

export interface ExoTacticalInput {
  horizDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  exoPackBroken: boolean;
  burstCooldown: number;
  jetCooldown: number;
  hyperCooldown: number;
  grenadeCooldown: number;
  cqcCooldown: number;
  timeWithoutLos: number;
  /** Deterministic roll in [0, 1) for tie-breaking variety */
  roll: number;
}

export function selectExoTrooperAttack(input: ExoTacticalInput): ExoTrooperAttackKind {
  // 1. Reactive CQC plasma-shock buttstroke whenever player rushes inside 3.25m!
  if (input.horizDist <= 3.25 && input.cqcCooldown <= 0) {
    return 'cqc_buttstroke';
  }

  // 2. Flush-out arcing plasma grenade if player hides behind cover while engaged (>= 0.9s no LOS)
  //    or occasionally at medium range to force aggressive repositioning!
  if (
    input.grenadeCooldown <= 0 &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 24.0 &&
    (!input.hasLos && input.timeWithoutLos >= 0.85
      ? true
      : input.hasLos && input.hasAttackToken && input.horizDist >= 11.5 && input.roll < 0.22)
  ) {
    return 'flush_grenade';
  }

  if (!input.hasLos || !input.hasAttackToken) {
    return 'none';
  }

  // 3. Telegraphed Overcharged Hyper-Burst (laser-locked piercing 3-round salvo) at medium-long range
  if (
    input.hyperCooldown <= 0 &&
    input.horizDist >= 9.0 &&
    input.horizDist <= 27.0 &&
    input.roll >= 0.22 &&
    input.roll < 0.52
  ) {
    return 'overcharged_hyper_burst';
  }

  // 4. Jet-Boost Lateral Flank + Mid-Air Strafe Shot (ONLY when dorsal exo-pack weakpoint is intact!)
  if (
    !input.exoPackBroken &&
    input.jetCooldown <= 0 &&
    input.horizDist >= 5.5 &&
    input.horizDist <= 22.0 &&
    input.roll >= 0.52 &&
    input.roll < 0.8
  ) {
    return 'jet_flank_burst';
  }

  // 5. Standard aggressive 4-round Pulse Carbine Burst
  if (input.burstCooldown <= 0) {
    return 'pulse_burst';
  }

  return 'none';
}

/**
 * Computes a clean ballistic arc velocity vector from `origin` to `target` with apex lift
 * so flush grenades reliably clear Floor 07 waist-high cover and land right on target!
 */
export function computeFlushGrenadeVelocity(
  originX: number,
  originY: number,
  originZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  gravity: number,
  flightTime: number
): { vx: number; vy: number; vz: number; speed: number } {
  const t = Math.max(0.45, flightTime);
  const vx = (targetX - originX) / t;
  const vz = (targetZ - originZ) / t;
  const vy = (targetY - originY + 0.5 * gravity * t * t) / t;
  const speed = Math.hypot(vx, vy, vz);
  return { vx, vy, vz, speed };
}
