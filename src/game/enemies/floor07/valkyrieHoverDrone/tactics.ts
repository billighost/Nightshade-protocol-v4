export type ValkyrieAttackChoice =
  | 'emp_shock_pulse'
  | 'rail_laser_sweep'
  | 'dive_strafe_run'
  | 'micro_rocket_salvo'
  | 'twin_autocannon_burst'
  | 'orbit';

export interface ValkyrieTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  gyroCoreBroken: boolean;
  empCooldown: number;
  railCooldown: number;
  strafeRunCooldown: number;
  rocketCooldown: number;
  burstCooldown: number;
  roll: number;
}

/**
 * Pure, deterministic tactical flight-combat AI router for the Floor 07 Valkyrie Hover-Drone.
 * Coordinates 5 scary aerial gunship attacks across altitude and range:
 * 1. `emp_shock_pulse` — Close-range 360° cyan EMP repulsor pulse when player gets underneath/close (<= 5.4m).
 * 2. `rail_laser_sweep` — Laser-locked high-velocity Overcharged Rail-Slug (PERMANENTLY LOCKED OUT when Optic Gyro-Core breaks!).
 * 3. `dive_strafe_run` — Aggressive low-altitude banked high-speed gunship strafing pass spraying twin pulse bolts
 *    (PERMANENTLY LOCKED OUT when Optic Gyro-Core breaks!).
 * 4. `micro_rocket_salvo` — 4-rocket staggered dual-wing micro-rocket barrage (can punish cover edges!).
 * 5. `twin_autocannon_burst` — 4-round alternating twin-barrel pulse autocannon burst while orbiting.
 */
export function selectValkyrieAttack(input: ValkyrieTacticsInput): ValkyrieAttackChoice {
  // 1. Repel players rushing directly underneath or close to the gunship with an EMP shock-pulse!
  if (input.horizDist <= 5.4 && input.vertDist <= 5.2 && input.empCooldown <= 0) {
    return 'emp_shock_pulse';
  }

  // 2. Signature laser-locked Overcharged Rail-Slug (ONLY when Optic Gyro-Core is intact!)
  if (
    !input.gyroCoreBroken &&
    input.hasLos &&
    input.hasAttackToken &&
    input.railCooldown <= 0 &&
    input.horizDist >= 9.0 &&
    input.horizDist <= 31.0 &&
    input.roll < 0.36
  ) {
    return 'rail_laser_sweep';
  }

  // 3. Aggressive high-speed banked Valkyrie Dive-Strafe Run (ONLY when Optic Gyro-Core is intact!)
  if (
    !input.gyroCoreBroken &&
    input.hasLos &&
    input.hasAttackToken &&
    input.strafeRunCooldown <= 0 &&
    input.horizDist >= 10.5 &&
    input.horizDist <= 26.0 &&
    input.roll >= 0.36 &&
    input.roll < 0.68
  ) {
    return 'dive_strafe_run';
  }

  // 4. Staggered 4-rocket dual-wing Micro-Rocket Salvo (works mid-to-long range!)
  if (
    input.hasLos &&
    input.hasAttackToken &&
    input.rocketCooldown <= 0 &&
    input.horizDist >= 6.8 &&
    input.horizDist <= 28.0 &&
    input.roll < 0.72
  ) {
    return 'micro_rocket_salvo';
  }

  // 5. Crisp 4-round alternating Twin Autocannon Burst while orbiting
  if (
    input.hasLos &&
    input.hasAttackToken &&
    input.burstCooldown <= 0 &&
    input.horizDist >= 4.5 &&
    input.horizDist <= 26.0
  ) {
    return 'twin_autocannon_burst';
  }

  return 'orbit';
}

/**
 * Computes a fast sweeping tangent dive-strafe velocity vector that swoops past the player
 * on the `orbitDir` flank without crashing directly into the player's face.
 */
export function computeStrafeRunVector(
  droneX: number,
  droneZ: number,
  playerX: number,
  playerZ: number,
  orbitDir: number,
  runSpeed = 12.8
): { vx: number; vz: number } {
  const dx = playerX - droneX;
  const dz = playerZ - droneZ;
  const dist = Math.hypot(dx, dz) || 1;
  const fwdX = dx / dist;
  const fwdZ = dz / dist;
  const rightX = -fwdZ * (orbitDir >= 0 ? 1 : -1);
  const rightZ = fwdX * (orbitDir >= 0 ? 1 : -1);
  // Swoop diagonally across the player's flank (72% forward + 69% lateral!)
  const vx = (fwdX * 0.72 + rightX * 0.69) * runSpeed;
  const vz = (fwdZ * 0.72 + rightZ * 0.69) * runSpeed;
  return { vx, vz };
}

/**
 * Generates fanned micro-rocket aim offsets for a 4-rocket staggered dual-wing pod barrage.
 */
export function computeMicroRocketOffsets(): Array<{ side: -1 | 1; lateral: number; vertical: number }> {
  return [
    { side: -1, lateral: -0.95, vertical: 0.15 },
    { side: 1, lateral: 0.95, vertical: 0.15 },
    { side: -1, lateral: -0.35, vertical: -0.08 },
    { side: 1, lateral: 0.35, vertical: -0.08 },
  ];
}
