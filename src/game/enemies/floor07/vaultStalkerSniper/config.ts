import type { EnemyArchetypeConfig } from '../../core/types';

export const VAULT_STALKER_SNIPER_CONFIG: EnemyArchetypeConfig = {
  id: 'vault_stalker_sniper',
  displayName: 'VAULT STALKER "PHANTOM-VII"',
  roleSubtitle: 'WEST BARRACKS MINI-BOSS · ACTIVE-CAMO RAIL SNIPER',
  tier: 'miniboss',
  maxHp: 1480,
  moveSpeed: 5.5,
  sprintSpeed: 9.2,
  collisionRadius: 0.48,
  height: 2.04,
  preferredMinRange: 10.5,
  preferredMaxRange: 25.5,
  detectRange: 36,
  scoreValue: 1450,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'SHOOT GLOWING CYAN RECON VISOR OPTIC TO SHATTER ACTIVE CAMO, DISABLE CLOAK-DASH & STUN',
  weakpoint: {
    id: 'visor_optic',
    label: 'Recon Visor Optic',
    damageMultiplier: 2.75,
    breakThreshold: 145,
    breakBonusDamage: 250,
    staggerDuration: 2.6,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 5.2,
  },
};
