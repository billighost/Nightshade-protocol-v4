import type { EnemyArchetypeConfig } from '../../core/types';

export const DUAL_CLEAVER_EXECUTIONER_CONFIG: EnemyArchetypeConfig = {
  id: 'dual_cleaver_executioner',
  displayName: 'DUAL-CLEAVER EXECUTIONER',
  roleSubtitle: 'SW REACTOR MOLTEN ARENA BUTCHER',
  tier: 'miniboss',
  maxHp: 880,
  moveSpeed: 4.5,
  sprintSpeed: 6.5,
  collisionRadius: 0.82,
  height: 2.68,
  preferredMinRange: 2.6,
  preferredMaxRange: 13.0,
  detectRange: 32.0,
  scoreValue: 1350,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'Evade the Executioner’s Guillotine Slam & Leap Crash, then puncture his blazing DORSAL SPINE FURNACE!',
  phase2Intel:
    'OVERDRIVE: Furnace vents wide open — faster Whirlwind Cyclones and 5-bolt Molten Crescent Waves!',
  weakpoint: {
    id: 'spine_furnace',
    label: 'DORSAL SPINE FURNACE',
    damageMultiplier: 2.4,
    breakThreshold: 145,
    breakBonusDamage: 140,
    staggerDuration: 2.8,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 9.0,
  },
};
