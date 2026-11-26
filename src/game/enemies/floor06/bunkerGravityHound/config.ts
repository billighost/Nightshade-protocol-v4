import type { EnemyArchetypeConfig } from '../../core/types';

export const BUNKER_GRAVITY_HOUND_CONFIG: EnemyArchetypeConfig = {
  id: 'bunker_gravity_hound',
  displayName: 'BUNKER GRAVITY-HOUND',
  roleSubtitle: 'SW ARMORY BUNKER ZONE MINI-BOSS',
  tier: 'miniboss',
  maxHp: 2250,
  moveSpeed: 6.4,
  sprintSpeed: 10.8,
  collisionRadius: 1.08,
  height: 2.38,
  preferredMinRange: 3.2,
  preferredMaxRange: 10.5,
  detectRange: 34.0,
  scoreValue: 1550,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'SHATTER ITS DORSAL GRAV-SINGULARITY REACTOR WHEN THE CLAMSHELL SHUTTER FLARES TO INTERRUPT PULSES & MAW BEAMS!',
  phase2Intel:
    'APEX HOUND OVERDRIVE — DOUBLE-BOUNCE POUNCES, TWIN-RING GRAVITY PULSES & SWEEPING SINGULARITY MAW BEAMS!',
  weakpoint: {
    id: 'dorsal_grav_reactor',
    label: 'DORSAL GRAV-SINGULARITY REACTOR',
    damageMultiplier: 2.45,
    breakThreshold: 260,
    breakBonusDamage: 270,
    staggerDuration: 3.3,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 10.5,
  },
};
