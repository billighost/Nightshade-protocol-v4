import type { EnemyArchetypeConfig } from '../../core/types';

export const PHASE_BLINK_WARDEN_CONFIG: EnemyArchetypeConfig = {
  id: 'phase_blink_warden',
  displayName: 'PHASE-BLINK WARDEN',
  roleSubtitle: 'DIMENSIONAL RIFT INQUISITOR',
  tier: 'normal',
  maxHp: 510,
  moveSpeed: 5.8,
  sprintSpeed: 9.0,
  collisionRadius: 0.62,
  height: 2.28,
  preferredMinRange: 5.6,
  preferredMaxRange: 15.8,
  detectRange: 34.0,
  scoreValue: 300,
  weakpointIntel:
    'SHATTER ITS CHEST PHASE-ANCHOR GYRO TO DISABLE BLINK TELEPORTS & AMBUSH STRIKES!',
  weakpoint: {
    id: 'phase_anchor_gyro',
    label: 'PHASE-ANCHOR GYRO',
    damageMultiplier: 2.45,
    breakThreshold: 135,
    breakBonusDamage: 140,
    staggerDuration: 2.9,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 10.5,
  },
};
