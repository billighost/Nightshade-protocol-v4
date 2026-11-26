import type { EnemyArchetypeConfig } from '../../core/types';

export const GRAPPLE_LANCE_DUELIST_CONFIG: EnemyArchetypeConfig = {
  id: 'grapple_lance_duelist',
  displayName: 'GRAPPLE-LANCE DUELIST',
  roleSubtitle: 'TETHER-ZIP VANGUARD · THERMITE SHOCK-LANCE',
  tier: 'normal',
  maxHp: 460,
  moveSpeed: 5.5,
  sprintSpeed: 7.8,
  collisionRadius: 0.48,
  height: 1.98,
  preferredMinRange: 2.3,
  preferredMaxRange: 4.8,
  detectRange: 32,
  scoreValue: 400,
  weakpointIntel: 'RUPTURE CHEST TETHER WINCH TO SHATTER GRAPPLE-ZIP & STAGGER',
  weakpoint: {
    id: 'tether_winch',
    label: 'Chest Tether Winch',
    damageMultiplier: 2.5,
    breakThreshold: 110,
    breakBonusDamage: 145,
    staggerDuration: 2.3,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
