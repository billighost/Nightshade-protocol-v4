import type { EnemyArchetypeConfig } from '../../core/types';

export const ARENA_NET_SHOOTER_CONFIG: EnemyArchetypeConfig = {
  id: 'arena_net_shooter',
  displayName: 'ARENA NET-SHOOTER',
  roleSubtitle: 'VOLTAIC RETIARIUS EXECUTIONER',
  tier: 'normal',
  maxHp: 285,
  moveSpeed: 4.6,
  sprintSpeed: 6.6,
  collisionRadius: 0.54,
  height: 2.12,
  preferredMinRange: 8.5,
  preferredMaxRange: 28.0,
  detectRange: 38.0,
  scoreValue: 295,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'Target the Arena Net-Shooter’s twin blazing CYAN TESLA SNARE-COILS above its shoulders to short-circuit its Voltaic Trident-Rail!',
  phase2Intel:
    'VOLTAIC OVERDRIVE: Its shoulder Tesla pylons surge — dodge 6-bolt X-Snare volleys, double-tap Arc-Rail snipes, and close-range Shock Novas!',
  weakpoint: {
    id: 'snare_coils',
    label: 'TESLA SNARE-COILS',
    damageMultiplier: 2.15,
    breakThreshold: 64,
    breakBonusDamage: 62,
    staggerDuration: 2.4,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
