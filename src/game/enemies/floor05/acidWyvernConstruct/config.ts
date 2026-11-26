import type { EnemyArchetypeConfig } from '../../core/types';

export const ACID_WYVERN_CONSTRUCT_CONFIG: EnemyArchetypeConfig = {
  id: 'acid_wyvern_construct',
  displayName: 'TWIN-TAIL ACID WYVERN-CONSTRUCT',
  roleSubtitle: 'NW ORBITAL AERIAL BIO-MECH APEX',
  tier: 'miniboss',
  maxHp: 840,
  moveSpeed: 6.2,
  sprintSpeed: 9.4,
  collisionRadius: 0.95,
  height: 2.35,
  preferredMinRange: 6.5,
  preferredMaxRange: 19.5,
  detectRange: 34.0,
  scoreValue: 1380,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'Shatter the Acid Wyvern’s glowing EMERALD CHEST VENOM-CORE to ground it in a violent crash-stagger!',
  phase2Intel:
    'OVERDRIVE: Twin barbed acid tails overcharged — faster swoop dives & 7-bolt venom barrages!',
  weakpoint: {
    id: 'chest_venom_core',
    label: 'CHEST VENOM-CORE',
    damageMultiplier: 2.45,
    breakThreshold: 140,
    breakBonusDamage: 145,
    staggerDuration: 2.9,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 9.0,
  },
};
