import type { EnemyArchetypeConfig } from '../../core/types';

export const KILLHOUSE_WARDEN_CONFIG: EnemyArchetypeConfig = {
  id: 'killhouse_warden',
  displayName: 'WARDEN-08 "SABLE"',
  roleSubtitle: 'KILLHOUSE ZONE MINI-BOSS · AKIMBO GUN-KATA DUELIST',
  tier: 'miniboss',
  maxHp: 940,
  moveSpeed: 4.25,
  sprintSpeed: 6.75,
  collisionRadius: 0.45,
  height: 2.02,
  preferredMinRange: 5.2,
  preferredMaxRange: 14.0,
  detectRange: 28,
  scoreValue: 900,
  weakpointIntel:
    'AFTER HIS FLASH-DASH OR CYCLONE SWEEP, SHOOT THE POP-UP GOLD DORSAL CAPACITOR COILS',
  weakpoint: {
    id: 'twin_capacitor_coils',
    label: 'Dorsal Capacitor Coils',
    damageMultiplier: 2.1,
    breakThreshold: 115,
    breakBonusDamage: 135,
    staggerDuration: 2.8,
    requiresExposedWindow: true,
    repeatable: true,
    repeatCooldown: 5.2,
  },
};
