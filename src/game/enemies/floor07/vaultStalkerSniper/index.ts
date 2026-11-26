export { VAULT_STALKER_SNIPER_CONFIG } from './config';
export { buildVaultStalkerSniperRig, type VaultStalkerRigHandle } from './mesh';
export { createVaultStalkerSniperBrain } from './ai';
export {
  selectStalkerAttack,
  computeFlechetteFanDirections,
  computeCloakDashVelocity,
  type StalkerAttackChoice,
  type StalkerTacticsInput,
} from './tactics';
