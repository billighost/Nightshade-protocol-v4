export interface DirectionalDamageVignette {
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface PlayerHitReactionState {
  /** Invulnerable testing flag — when true, core HP stays 100 while kinetic shield bar visibly absorbs & recharges hits. */
  invulnerableTestingMode: boolean;
  hp: number;
  maxHp: number;
  /** Halo/COD kinetic shield bar (0..100) that visibly drops on impact, flashes, and recharges after avoiding fire */
  shieldIntegrity: number;
  /** Delayed trailing white/amber ghost level (0..100) that drains down smoothly after hits */
  shieldGhost: number;
  /** Delay seconds before kinetic shield begins recharging */
  shieldRechargeDelay: number;
  /** True while kinetic shield is actively sweeping back up */
  shieldRecharging: boolean;
  /** Short HUD bar impact tremor timer (0..0.32s) */
  barShakeTimer: number;
  /** Relative bearing angle in radians (0 = ahead, +PI/2 = right, PI = behind, -PI/2 = left) for 360° reticle threat arc */
  lastHitBearingRad: number;
  /** Remaining visibility timer for 360° directional threat arc */
  hitArcTimer: number;
  hitsTaken: number;
  damagePulse: number; // 0..1 overall screen edge flash intensity
  flinchTimer: number; // seconds remaining (0..0.24)
  flinchDuration: number;
  flinchDirLocalX: number; // -1 left .. +1 right
  vignette: DirectionalDamageVignette;
}

export interface PlayerHitImpactOutput {
  appliedDamageToHp: number;
  trauma: number;
  cameraRollKick: number;
  localDirX: number;
  localDirZ: number;
}

export function createPlayerHitReactionState(): PlayerHitReactionState {
  return {
    invulnerableTestingMode: true,
    hp: 100,
    maxHp: 100,
    shieldIntegrity: 100,
    shieldGhost: 100,
    shieldRechargeDelay: 0,
    shieldRecharging: false,
    barShakeTimer: 0,
    lastHitBearingRad: 0,
    hitArcTimer: 0,
    hitsTaken: 0,
    damagePulse: 0,
    flinchTimer: 0,
    flinchDuration: 0.24,
    flinchDirLocalX: 0,
    vignette: { front: 0, back: 0, left: 0, right: 0 },
  };
}

/**
 * Single centralized entry point for all incoming enemy damage!
 * Keeps `hp` untouched in `invulnerableTestingMode` while visibly dropping the kinetic shield bar,
 * trailing ghost drain, HUD shake tremor, 360° reticle threat arc, directional vignette, and armor SFX!
 */
export function applyPlayerHitReaction(
  state: PlayerHitReactionState,
  rawDamage: number,
  fromX: number,
  fromZ: number,
  playerX: number,
  playerZ: number,
  cameraYaw: number,
  staggerStrength = 0.6
): PlayerHitImpactOutput {
  const s = Math.max(0.25, Math.min(1.2, staggerStrength));
  state.hitsTaken += 1;

  const appliedDamageToHp = state.invulnerableTestingMode ? 0 : Math.max(0, rawDamage);
  if (!state.invulnerableTestingMode) {
    state.hp = Math.max(0, state.hp - appliedDamageToHp);
  }

  // Visible kinetic shield impact drop (clamped to >= 8% in invulnerable mode so player sees visceral danger & recovery!)
  const shieldDrop = Math.max(12, Math.min(48, rawDamage * 0.95));
  state.shieldGhost = Math.max(state.shieldGhost, state.shieldIntegrity);
  const minShield = state.invulnerableTestingMode ? 8 : 0;
  state.shieldIntegrity = Math.max(minShield, state.shieldIntegrity - shieldDrop);
  state.shieldRechargeDelay = 2.6;
  state.shieldRecharging = false;
  state.barShakeTimer = 0.3;

  // Transform incoming hit vector into camera-relative local XZ (forward = -Z in world at yaw=0)
  const dx = fromX - playerX;
  const dz = fromZ - playerZ;
  const len = Math.hypot(dx, dz);
  const nx = len > 1e-4 ? dx / len : 0;
  const nz = len > 1e-4 ? dz / len : -1;

  const fwdX = -Math.sin(cameraYaw);
  const fwdZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  const localFront = nx * fwdX + nz * fwdZ; // +1 ahead, -1 behind
  const localRight = nx * rightX + nz * rightZ; // +1 right, -1 left

  // Bearing angle: 0 = top (ahead), +PI/2 = right, PI = bottom (behind), -PI/2 = left
  state.lastHitBearingRad = Math.atan2(localRight, localFront);
  state.hitArcTimer = 1.05;

  const intensity = Math.min(1, 0.55 + s * 0.45);
  state.damagePulse = Math.min(1, Math.max(state.damagePulse, intensity));
  state.flinchDuration = 0.22 + s * 0.04;
  state.flinchTimer = state.flinchDuration;
  state.flinchDirLocalX = Math.max(-1, Math.min(1, localRight));

  state.vignette.front = Math.min(1, Math.max(state.vignette.front, Math.max(0, localFront) * intensity));
  state.vignette.back = Math.min(1, Math.max(state.vignette.back, Math.max(0, -localFront) * intensity));
  state.vignette.right = Math.min(1, Math.max(state.vignette.right, Math.max(0, localRight) * intensity));
  state.vignette.left = Math.min(1, Math.max(state.vignette.left, Math.max(0, -localRight) * intensity));

  // Always give subtle baseline perimeter flash even on glancing angle
  if (
    state.vignette.front < 0.25 &&
    state.vignette.back < 0.25 &&
    state.vignette.left < 0.25 &&
    state.vignette.right < 0.25
  ) {
    state.vignette.front = Math.max(state.vignette.front, intensity * 0.65);
  }

  return {
    appliedDamageToHp,
    trauma: Math.min(0.85, 0.26 + s * 0.36),
    cameraRollKick: -Math.sign(localRight || 1) * (0.018 + s * 0.022),
    localDirX: localRight,
    localDirZ: localFront,
  };
}

export function stepPlayerHitReaction(state: PlayerHitReactionState, dt: number): void {
  if (state.flinchTimer > 0) {
    state.flinchTimer = Math.max(0, state.flinchTimer - dt);
  }
  if (state.barShakeTimer > 0) {
    state.barShakeTimer = Math.max(0, state.barShakeTimer - dt);
  }
  if (state.hitArcTimer > 0) {
    state.hitArcTimer = Math.max(0, state.hitArcTimer - dt);
  }

  // Smooth trailing ghost drain (COD / Halo / BOTW damage ghost)
  if (state.shieldGhost > state.shieldIntegrity) {
    // Pause briefly during bar impact tremor so the lost chunk is unmistakably readable, then drain smoothly
    if (state.barShakeTimer <= 0.14) {
      state.shieldGhost = Math.max(state.shieldIntegrity, state.shieldGhost - dt * 52);
    }
  } else {
    state.shieldGhost = state.shieldIntegrity;
  }

  // Halo-style kinetic shield recharge cycle
  if (state.shieldIntegrity < 100) {
    if (state.shieldRechargeDelay > 0) {
      state.shieldRechargeDelay = Math.max(0, state.shieldRechargeDelay - dt);
      state.shieldRecharging = false;
    } else {
      state.shieldRecharging = true;
      state.shieldIntegrity = Math.min(100, state.shieldIntegrity + dt * 34);
      state.shieldGhost = Math.max(state.shieldGhost, state.shieldIntegrity);
      if (state.shieldIntegrity >= 100) {
        state.shieldRecharging = false;
      }
    }
  } else {
    state.shieldRecharging = false;
  }

  const decay = dt * 2.4;
  state.damagePulse = Math.max(0, state.damagePulse - decay);
  state.vignette.front = Math.max(0, state.vignette.front - decay);
  state.vignette.back = Math.max(0, state.vignette.back - decay);
  state.vignette.left = Math.max(0, state.vignette.left - decay);
  state.vignette.right = Math.max(0, state.vignette.right - decay);
}

export function getNormalizedFlinchWeight(state: PlayerHitReactionState): number {
  if (state.flinchTimer <= 0 || state.flinchDuration <= 0) return 0;
  const t = state.flinchTimer / state.flinchDuration;
  return Math.sin(t * Math.PI);
}
