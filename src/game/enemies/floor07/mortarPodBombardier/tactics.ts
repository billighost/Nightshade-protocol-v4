export type BombardierAttackChoice =
  | 'concussion_shock_stomp'
  | 'suppressive_shrapnel_fan'
  | 'carpet_cluster_barrage'
  | 'direct_flak_burst'
  | 'incendium_bracket_salvo'
  | 'reposition';

export interface BombardierTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  drumsBroken: boolean;
  stompCooldown: number;
  carpetCooldown: number;
  flakCooldown: number;
  salvoCooldown: number;
  shrapnelCooldown: number;
  roll: number;
}

/**
 * Pure, deterministic tactical decision brain for the Floor 07 Mortar-Pod Bombardier.
 * Coordinates 5 terrifying heavy-siege attacks across every engagement range:
 * 1. `concussion_shock_stomp` — Close-quarters 360° hydraulic repulsor shock-stomp if rushed (<= 4.6m).
 * 2. `suppressive_shrapnel_fan` — Close-mid 5-pellet wide tungsten flak shotgun blast against flankers.
 * 3. `carpet_cluster_barrage` — 3-shell cascading diagonal carpet mortar strike
 *    (PERMANENTLY LOCKED OUT once player ruptures the Shoulder Ordnance Drums weakpoint!).
 * 4. `direct_flak_burst` — Direct-fire 2-round explosive flak burst from the handheld M44 Rotary Launcher.
 * 5. `incendium_bracket_salvo` — Twin bracketing mortar shells arcing over cover to flush hidden players.
 */
export function selectBombardierAttack(input: BombardierTacticsInput): BombardierAttackChoice {
  // 1. Punish close-quarters rushing with a violent 360° hydraulic repulsor stomp!
  if (input.horizDist <= 4.6 && input.vertDist < 2.3 && input.stompCooldown <= 0) {
    return 'concussion_shock_stomp';
  }

  // 2. Shred close-mid flankers with a wide tungsten shrapnel shotgun blast!
  if (
    input.hasLos &&
    input.horizDist <= 10.2 &&
    input.shrapnelCooldown <= 0 &&
    input.roll < 0.62
  ) {
    return 'suppressive_shrapnel_fan';
  }

  // 3. Signature 3-shell Cascading Carpet Cluster Barrage (ONLY when Shoulder Ordnance Drums are intact!)
  if (
    !input.drumsBroken &&
    input.hasAttackToken &&
    input.carpetCooldown <= 0 &&
    input.horizDist >= 8.5 &&
    input.horizDist <= 33.0 &&
    input.roll < 0.58
  ) {
    return 'carpet_cluster_barrage';
  }

  // 4. Direct-fire M44 Rotary Flak-Launcher burst when player is exposed in mid-range LOS
  if (
    input.hasLos &&
    input.hasAttackToken &&
    input.flakCooldown <= 0 &&
    input.horizDist >= 4.4 &&
    input.horizDist <= 18.5
  ) {
    return 'direct_flak_burst';
  }

  // 5. Bracketing indirect mortar salvo (works even over tall cover when player hides!)
  if (
    input.hasAttackToken &&
    input.salvoCooldown <= 0 &&
    input.horizDist >= 5.5 &&
    input.horizDist <= 34.0
  ) {
    return 'incendium_bracket_salvo';
  }

  return 'reposition';
}

/**
 * Computes exact ballistic launch velocity (vx, vy, vz) & speed for a mortar shell
 * arcing from `(ox, oy, oz)` to `(tx, ty, tz)` under `gravity`.
 */
export function computeBallisticMortarArc(
  ox: number,
  oy: number,
  oz: number,
  tx: number,
  ty: number,
  tz: number,
  gravity = 15.5
): { vx: number; vy: number; vz: number; speed: number; flightTime: number } {
  const horiz = Math.hypot(tx - ox, tz - oz);
  const flightTime = Math.max(0.72, Math.min(1.62, horiz / 14.2));
  const vx = (tx - ox) / flightTime;
  const vz = (tz - oz) / flightTime;
  const vy = (ty - oy + 0.5 * gravity * flightTime * flightTime) / flightTime;
  const speed = Math.hypot(vx, vy, vz);
  return { vx, vy, vz, speed, flightTime };
}

/**
 * Generates 3 cascading impact points for the Carpet Cluster Barrage walking
 * along the player's lateral velocity / strafe vector so they must actively sprint or roll out.
 */
export function computeCarpetStrikeTargets(
  playerX: number,
  playerY: number,
  playerZ: number,
  playerVx: number,
  playerVz: number,
  perpX: number,
  perpZ: number
): Array<{ x: number; y: number; z: number }> {
  const speed = Math.hypot(playerVx, playerVz);
  const walkX = speed > 1.0 ? playerVx / speed : perpX;
  const walkZ = speed > 1.0 ? playerVz / speed : perpZ;
  const offsets = [-1.6, 0.8, 3.2];
  return offsets.map((step) => ({
    x: playerX + walkX * step,
    y: playerY + 0.12,
    z: playerZ + walkZ * step,
  }));
}
