import type { EnemyArchetypeConfig } from '../../core/types';

export const RAZOR_STRIDER_CONFIG: EnemyArchetypeConfig = {
  id: 'razor_strider',
  displayName: 'KAGE-08 "ONI-BLADE"',
  roleSubtitle: 'CYBER-KATANA ASSASSIN',
  tier: 'normal',
  maxHp: 325,
  moveSpeed: 5.0,
  sprintSpeed: 7.6,
  collisionRadius: 0.42,
  height: 1.82,
  preferredMinRange: 1.5,
  preferredMaxRange: 2.6,
  detectRange: 28,
  scoreValue: 320,
  weakpointIntel:
    'DODGE HIS IAIJUTSU DRAW OR HELM-BREAKER SLAM TO EXPOSE HIS OPEN DORSAL BOOSTER CORE',
  weakpoint: {
    id: 'spine_thruster_core',
    label: 'Dorsal Overclock Spine Core',
    damageMultiplier: 2.25,
    breakThreshold: 68,
    breakBonusDamage: 80,
    staggerDuration: 2.6,
    requiresExposedWindow: true,
    repeatable: true,
    repeatCooldown: 4.8,
  },
};
