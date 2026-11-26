import type { EnemyArchetypeConfig } from '../../core/types';

export const ORDNANCE_PYRO_CONFIG: EnemyArchetypeConfig = {
  id: 'ordnance_pyro_tech',
  displayName: 'FORGE-08 "PYRO-TECH"',
  roleSubtitle: 'ARMORY ZONE MINI-BOSS · HEAVY THERMITE ORDNANCE JUGGERNAUT',
  tier: 'miniboss',
  maxHp: 1080,
  moveSpeed: 2.25,
  sprintSpeed: 3.1,
  collisionRadius: 0.54,
  height: 2.12,
  preferredMinRange: 5.8,
  preferredMaxRange: 15.5,
  detectRange: 28,
  scoreValue: 950,
  weakpointIntel:
    'FLANK OR SNIPE THE PRESSURIZED CRIMSON THERMITE FUEL TANK ABOVE HIS SHOULDERS TO RUPTURE IT',
  weakpoint: {
    id: 'pressurized_fuel_tank',
    label: 'Pressurized Thermite Fuel Tank',
    damageMultiplier: 2.15,
    breakThreshold: 125,
    breakBonusDamage: 155,
    staggerDuration: 3.0,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 7.5,
  },
};
