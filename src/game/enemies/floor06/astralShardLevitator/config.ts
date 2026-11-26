import type { EnemyArchetypeConfig } from '../../core/types';

export const ASTRAL_SHARD_LEVITATOR_CONFIG: EnemyArchetypeConfig = {
  id: 'astral_shard_levitator',
  displayName: 'ASTRAL SHARD LEVITATOR',
  roleSubtitle: 'SERAPHIM-CLASS PARANATURAL SENTINEL',
  tier: 'normal',
  maxHp: 460,
  moveSpeed: 6.8,
  sprintSpeed: 12.2,
  collisionRadius: 0.78,
  height: 2.25,
  preferredMinRange: 8.5,
  preferredMaxRange: 22.0,
  detectRange: 38.0,
  scoreValue: 310,
  weakpointIntel:
    'SHATTER ITS SUSPENDED ASTRAL HEART INSIDE THE RIBCAGE TO GROUND IT & LOCK LANCE/SCYTHE ATTACKS!',
  weakpoint: {
    id: 'astral_core',
    label: 'ASTRAL RESONANCE HEART',
    damageMultiplier: 2.35,
    breakThreshold: 90,
    breakBonusDamage: 115,
    staggerDuration: 2.9,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 9.0,
  },
};
