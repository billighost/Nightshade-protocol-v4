import type { EnemyArchetypeConfig } from '../../core/types';

export const APEX_ARENA_MARAUDER_BOSS_CONFIG: EnemyArchetypeConfig = {
  id: 'apex_arena_marauder_boss',
  displayName: 'APEX ARENA MARAUDER',
  roleSubtitle: 'FLOOR 05 COLISEUM SOVEREIGN WARLORD',
  tier: 'boss',
  maxHp: 1850,
  moveSpeed: 5.4,
  sprintSpeed: 8.0,
  collisionRadius: 0.9,
  height: 3.05,
  preferredMinRange: 3.2,
  preferredMaxRange: 15.0,
  detectRange: 44.0,
  scoreValue: 4500,
  startsWithShield: false,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'Evade the Apex Marauder’s War-Axe Cataclysm & Dash Cleave, then strike his glowing VENTING CHEST APEX CORE!',
  phase2Intel:
    'PHASE 2 · APEX OVERDRIVE: Faster flash-dash combos, 5-arc Crimson Axe Waves & Spectral Hound Salvos!',
  weakpoint: {
    id: 'chest_apex_core',
    label: 'VENTING CHEST APEX CORE',
    damageMultiplier: 2.55,
    breakThreshold: 180,
    breakBonusDamage: 195,
    staggerDuration: 3.0,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 8.5,
    breaksShield: true,
  },
};
