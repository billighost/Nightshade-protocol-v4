import type {
  EnemyArchetypeConfig,
  EnemyCombatState,
  EnemyDamageResult,
  EnemyHitZone,
  EnemyZoneId,
} from './types';

export function createEnemyCombatState(
  id: string,
  config: EnemyArchetypeConfig,
  zone: EnemyZoneId
): EnemyCombatState {
  return {
    id,
    archetypeId: config.id,
    tier: config.tier,
    zone,
    hp: config.maxHp,
    maxHp: config.maxHp,
    alive: true,
    phase: 1,
    shieldActive: Boolean(config.startsWithShield),
    behavior: 'patrol',
    staggerTimer: 0,
    hitFlashTimer: 0,
    flinchTimer: 0,
    flinchDirX: 0,
    weakpoint: {
      id: config.weakpoint.id,
      damageAccum: 0,
      broken: false,
      exposed: !config.weakpoint.requiresExposedWindow,
      exposedTimer: 0,
      repeatCooldownTimer: 0,
      breakCount: 0,
    },
    engaged: false,
  };
}

export function stepEnemyWeakpointTimers(
  state: EnemyCombatState,
  config: EnemyArchetypeConfig,
  dt: number
): void {
  if (!state.alive) return;

  if (state.hitFlashTimer > 0) {
    state.hitFlashTimer = Math.max(0, state.hitFlashTimer - dt);
  }
  if (state.flinchTimer > 0) {
    state.flinchTimer = Math.max(0, state.flinchTimer - dt);
  }
  if (state.staggerTimer > 0) {
    state.staggerTimer = Math.max(0, state.staggerTimer - dt);
    if (state.staggerTimer === 0 && state.behavior === 'staggered') {
      state.behavior = 'chase';
    }
  }

  const wp = state.weakpoint;
  if (wp.exposedTimer > 0) {
    wp.exposedTimer = Math.max(0, wp.exposedTimer - dt);
    if (wp.exposedTimer === 0 && config.weakpoint.requiresExposedWindow) {
      wp.exposed = false;
    }
  }
  if (wp.repeatCooldownTimer > 0) {
    wp.repeatCooldownTimer = Math.max(0, wp.repeatCooldownTimer - dt);
    if (wp.repeatCooldownTimer === 0 && config.weakpoint.repeatable) {
      wp.broken = false;
      wp.damageAccum = 0;
    }
  }
}

export function exposeEnemyWeakpoint(state: EnemyCombatState, duration: number): void {
  if (!state.alive) return;
  state.weakpoint.exposed = true;
  state.weakpoint.exposedTimer = Math.max(state.weakpoint.exposedTimer, duration);
}

/**
 * Pure deterministic hit-resolution & weakpoint routing engine.
 * Handles riot-shield blocks, weakpoint critical scaling, weakpoint overload/shatter stuns,
 * boss phase 1 -> 2 transitions, and kill scoring cleanly without Three.js dependencies.
 */
export function resolveEnemyHit(
  state: EnemyCombatState,
  config: EnemyArchetypeConfig,
  rawDamage: number,
  hitZone: EnemyHitZone,
  flinchDirX = 0
): EnemyDamageResult {
  const result: EnemyDamageResult = {
    appliedDamage: 0,
    blockedByShield: false,
    isCritical: false,
    hitWeakpoint: false,
    weakpointBroken: false,
    shieldShattered: false,
    phaseTransitionedTo2: false,
    killed: false,
    staggerTriggered: false,
    scoreDelta: 0,
    calloutText: null,
  };

  if (!state.alive || rawDamage <= 0) return result;
  state.engaged = true;

  // Riot shield blocks frontal body shots until the projector weakpoint lens is shattered!
  if (hitZone === 'shield' && state.shieldActive) {
    result.blockedByShield = true;
    state.hitFlashTimer = 0.08;
    return result;
  }

  const wpCfg = config.weakpoint;
  const wpState = state.weakpoint;
  let mult = 1.0;

  if (hitZone === 'weakpoint') {
    result.hitWeakpoint = true;
    const canFullBreak = !wpCfg.requiresExposedWindow || wpState.exposed;
    if (canFullBreak && !wpState.broken) {
      mult = wpCfg.damageMultiplier;
      result.isCritical = true;
    } else if (wpState.broken) {
      // Shooting an already-exposed ruptured weakpoint still deals strong crit damage!
      mult = Math.max(1.5, wpCfg.damageMultiplier * 0.72);
      result.isCritical = true;
    } else {
      // Armored/closed weakpoint shell takes modest bonus damage until exposed
      mult = 1.15;
    }
  } else if (hitZone === 'head') {
    mult = 1.45;
    result.isCritical = true;
  }

  // Staggered enemies take +25% punish damage
  if (state.staggerTimer > 0) {
    mult *= 1.25;
  }

  const directDamage = Math.round(rawDamage * mult);
  let totalDamage = directDamage;

  // Accumulate weakpoint break gauge if hittable & not already broken
  if (hitZone === 'weakpoint' && !wpState.broken) {
    const canAccum = !wpCfg.requiresExposedWindow || wpState.exposed;
    if (canAccum) {
      wpState.damageAccum += rawDamage;
      if (wpState.damageAccum >= wpCfg.breakThreshold) {
        wpState.broken = true;
        wpState.breakCount += 1;
        wpState.damageAccum = 0;
        if (wpCfg.repeatable) {
          wpState.repeatCooldownTimer = wpCfg.repeatCooldown;
        }
        result.weakpointBroken = true;
        result.staggerTriggered = true;
        totalDamage += wpCfg.breakBonusDamage;
        state.staggerTimer = Math.max(state.staggerTimer, wpCfg.staggerDuration);
        state.behavior = 'staggered';
        result.scoreDelta += 180;

        if (wpCfg.breaksShield && state.shieldActive) {
          state.shieldActive = false;
          result.shieldShattered = true;
          result.calloutText = `SHIELD SHATTERED · ${config.displayName} EXPOSED`;
        } else {
          result.calloutText = `WEAKPOINT OVERLOAD · ${wpCfg.label.toUpperCase()} RUPTURED`;
        }
      }
    }
  }

  state.hp = Math.max(0, state.hp - totalDamage);
  state.hitFlashTimer = 0.11;
  state.flinchTimer = state.staggerTimer > 0 ? 0 : 0.18;
  state.flinchDirX = flinchDirX;
  result.appliedDamage = totalDamage;
  result.scoreDelta += result.isCritical ? 45 : 20;

  // Check Boss Phase 2 transition before death
  if (
    state.hp > 0 &&
    state.phase === 1 &&
    config.phase2ThresholdRatio !== undefined &&
    state.hp / state.maxHp <= config.phase2ThresholdRatio
  ) {
    state.phase = 2;
    result.phaseTransitionedTo2 = true;
    state.staggerTimer = Math.max(state.staggerTimer, 0.9);
    state.behavior = 'staggered';
    result.calloutText = `${config.displayName} · PHASE 2 OVERDRIVE`;
  }

  if (state.hp <= 0) {
    state.alive = false;
    state.behavior = 'dead';
    state.staggerTimer = 0;
    result.killed = true;
    result.scoreDelta += config.scoreValue;
  }

  return result;
}
