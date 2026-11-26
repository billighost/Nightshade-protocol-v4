import type { EnemyArchetypeConfig } from '../../core/types';

export const MORTAR_POD_BOMBARDIER_CONFIG: EnemyArchetypeConfig = {
  id: 'mortar_pod_bombardier',
  displayName: 'MORTAR-POD BOMBARDIER',
  roleSubtitle: 'HEAVY SIEGE ARTILLERY · TWIN ORDNANCE DRUMS',
  tier: 'normal',
  maxHp: 490,
  moveSpeed: 3.15,
  sprintSpeed: 4.35,
  collisionRadius: 0.56,
  height: 2.08,
  preferredMinRange: 10.5,
  preferredMaxRange: 25.5,
  detectRange: 38,
  scoreValue: 440,
  weakpointIntel:
    'RUPTURE GLOWING AMBER SHOULDER ORDNANCE DRUMS TO DETONATE SALVO & DISABLE CARPET BARRAGE',
  weakpoint: {
    id: 'ordnance_drums',
    label: 'Shoulder Ordnance Drums',
    damageMultiplier: 2.45,
    breakThreshold: 115,
    breakBonusDamage: 165,
    staggerDuration: 2.5,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
