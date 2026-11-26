export type RealityWeaverAction =
  | 'glide'
  | 'astral_fan_volley'
  | 'stave_barrage_helix'
  | 'reality_beam_lance'
  | 'dimensional_rift_scythe'
  | 'gravity_mortar_salvo'
  | 'phase_reposition'
  | 'singularity_repel';

export interface RealityWeaverTacticsInput {
  horizDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  repelCooldown: number;
  beamCooldown: number;
  mortarCooldown: number;
  fanCooldown: number;
  blinkCooldown: number;
  /** Optional AAA attack cooldowns (default 99 for legacy callers). */
  helixCooldown?: number;
  scytheCooldown?: number;
  haloBroken?: boolean;
  timeWithoutLos?: number;
  roll: number;
}

/**
 * Pure tactical decision selector for the Floor 06 Zone Mini-Boss:
 * ARCHIVE REALITY-WEAVER (7-move Sovereign Phase 1 & Phase 2 combat kit).
 */
export function selectRealityWeaverAction(input: RealityWeaverTacticsInput): RealityWeaverAction {
  const helixCooldown = input.helixCooldown ?? 99;
  const scytheCooldown = input.scytheCooldown ?? 99;
  const haloBroken = input.haloBroken ?? false;
  const timeWithoutLos = input.timeWithoutLos ?? 0;

  // 1. Close-range Gravitational Collapse Nova punishes rushing players
  if (input.horizDist < 6.4 && input.repelCooldown <= 0) {
    return 'singularity_repel';
  }

  // 2. Cover-flushing Gravity Mortar Salvo when player hides behind NE Grav-Core pillars
  if (!input.hasLos && timeWithoutLos >= 1.0 && input.mortarCooldown <= 0 && input.horizDist <= 28.0) {
    return 'gravity_mortar_salvo';
  }

  // 3. Spatial Warp Blink reposition when pressured inside preferred standoff or cycling in Phase 2
  if (
    !haloBroken &&
    input.blinkCooldown <= 0 &&
    ((input.horizDist < 8.8 && input.roll < 0.62) || (input.phase === 2 && input.roll < 0.24))
  ) {
    return 'phase_reposition';
  }

  // 4. Signature Volumetric Sweeping Reality-Tear Beam (P1 precision lance / P2 sweeping ray!)
  if (
    input.hasLos &&
    !haloBroken &&
    input.beamCooldown <= 0 &&
    input.horizDist >= 8.5 &&
    input.horizDist <= 30.0 &&
    input.roll < (input.phase === 2 ? 0.56 : 0.44)
  ) {
    return 'reality_beam_lance';
  }

  // 5. Mid-range Twin Telekinetic Dimensional Rift Scythes
  if (
    input.hasLos &&
    scytheCooldown <= 0 &&
    input.horizDist >= 6.0 &&
    input.horizDist <= 16.5 &&
    input.roll < (input.phase === 2 ? 0.62 : 0.46)
  ) {
    return 'dimensional_rift_scythe';
  }

  // 6. Detached 6-Stave Cathedral Wheel Helix Barrage
  if (
    input.hasLos &&
    helixCooldown <= 0 &&
    input.horizDist >= 7.5 &&
    input.horizDist <= 26.0 &&
    input.roll < (input.phase === 2 ? 0.72 : 0.55)
  ) {
    return 'stave_barrage_helix';
  }

  // 7. Arcing Gravity Mortar Salvo to deny static cover
  if (
    input.mortarCooldown <= 0 &&
    input.horizDist >= 8.0 &&
    input.horizDist <= 28.0 &&
    (!input.hasLos || input.roll < (input.phase === 2 ? 0.68 : 0.52))
  ) {
    return 'gravity_mortar_salvo';
  }

  // 8. Twin-Tier Astral Fan Volley (reliable pressure even while Crown Halo is fractured)
  if (input.hasLos && input.fanCooldown <= 0 && input.horizDist <= 27.0) {
    return 'astral_fan_volley';
  }

  return 'glide';
}

/**
 * Horizontal yaw spread angles for Astral Fan Volley.
 * P1: 5-bolt spread, P2: 7-bolt Sovereign spread, Crown Halo broken: weakened 3-bolt spread.
 */
export function computeWeaverFanAngles(phase: 1 | 2, haloBroken: boolean): number[] {
  if (haloBroken) {
    return [-0.14, 0, 0.14];
  }
  if (phase === 2) {
    return [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
  }
  return [-0.22, -0.11, 0, 0.11, 0.22];
}

export interface WeaverHelixShot {
  yawOffset: number;
  pitchOffset: number;
  staveIdx: number;
  gold: boolean;
}

/**
 * Generates spiraling twin-helix shot offsets originating directly from the 6 floating
 * cathedral monolith staves around the Weaver's Mandorla Wheel.
 */
export function computeWeaverHelixOffsets(phase: 1 | 2, haloBroken: boolean): WeaverHelixShot[] {
  const count = haloBroken ? 4 : phase === 2 ? 10 : 6;
  const shots: WeaverHelixShot[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const angle = t * Math.PI * (phase === 2 ? 3.2 : 2.0);
    const amp = phase === 2 ? 0.14 : 0.1;
    shots.push({
      yawOffset: Math.cos(angle) * amp,
      pitchOffset: Math.sin(angle) * 0.045,
      staveIdx: i % 6,
      gold: i % 2 === 0,
    });
  }
  return shots;
}

/**
 * Computes geometric mortar impact coordinates around the player's position.
 * P1: 3-orb flanking triangle; P2: 5-orb converging pentagram ring; Halo broken: 2-orb spread.
 */
export function solveWeaverMortarPattern(
  targetX: number,
  targetY: number,
  targetZ: number,
  phase: 1 | 2,
  haloBroken: boolean
): Array<{ x: number; y: number; z: number }> {
  const count = haloBroken ? 2 : phase === 2 ? 5 : 3;
  const ringRadius = phase === 2 ? 3.15 : 2.65;
  const out: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < count; i++) {
    if (i === 0 && count >= 3) {
      // Center lock directly on player to force immediate movement
      out.push({ x: targetX, y: targetY + 0.08, z: targetZ });
    } else {
      const ang = ((i - 1) / Math.max(1, count - 1)) * Math.PI * 2 + (phase === 2 ? 0.42 : 0.2);
      out.push({
        x: targetX + Math.cos(ang) * ringRadius,
        y: targetY + 0.08,
        z: targetZ + Math.sin(ang) * ringRadius,
      });
    }
  }
  return out;
}

/**
 * Smooth S-curve horizontal yaw sweep for the Phase 2 Sweeping Reality-Tear Beam.
 */
export function computeWeaverSweepYaw(
  centerYaw: number,
  progress: number,
  sweepDir: -1 | 1,
  halfArcRad = 0.44
): number {
  const t = Math.max(0, Math.min(1, progress));
  const smooth = t * t * (3 - 2 * t);
  const offset = (-1 + smooth * 2) * halfArcRad * sweepDir;
  return centerYaw + offset;
}

/**
 * Computes a collision-safe spatial warp blink destination inside the Floor 06
 * NE Grav-Core Chamber (`x ∈ [19.8, 42.2]`, `z ∈ [-26.2, -9.8]`), strictly avoiding
 * the central Grav-Core pedestal at `(31.0, -16.8)` (clearance radius `3.65m`).
 */
export function computeGravCoreBlinkDest(
  curX: number,
  curZ: number,
  playerX: number,
  playerZ: number,
  strafeSign: number,
  stepDist = 6.4
): { x: number; z: number } {
  const dx = playerX - curX;
  const dz = playerZ - curZ;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const rightX = -dirZ;
  const rightZ = dirX;

  // Lateral flank + slight standoff adjustment toward ~12.5m ideal range
  const radialShift = dist < 9.5 ? -2.8 : dist > 18.0 ? 2.4 : 0;
  let nx = curX + rightX * strafeSign * stepDist + dirX * radialShift;
  let nz = curZ + rightZ * strafeSign * stepDist + dirZ * radialShift;

  // Clamp inside NE Grav-Core Chamber bounds
  nx = Math.max(19.8, Math.min(42.2, nx));
  nz = Math.max(-26.2, Math.min(-9.8, nz));

  // Push cleanly outside central Grav-Core pedestal (31.0, -16.8, r = 2.45 + margin)
  const pedX = 31.0;
  const pedZ = -16.8;
  const minPedClear = 3.65;
  const pdx = nx - pedX;
  const pdz = nz - pedZ;
  const pDist = Math.hypot(pdx, pdz);
  if (pDist < minPedClear) {
    const inv = pDist > 0.01 ? 1 / pDist : 1;
    const ux = pDist > 0.01 ? pdx * inv : strafeSign;
    const uz = pDist > 0.01 ? pdz * inv : 0;
    nx = Math.max(19.8, Math.min(42.2, pedX + ux * minPedClear));
    nz = Math.max(-26.2, Math.min(-9.8, pedZ + uz * minPedClear));
  }

  return { x: nx, z: nz };
}
