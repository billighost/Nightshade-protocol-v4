export { PLASMA_SPEAR_HOPLITE_CONFIG } from './config';
export {
  selectHopliteAction,
  computeJavelinSpreadAngles,
  solveHopliteVaultLeap,
  type HopliteAction,
  type HopliteTacticsInput,
  type HopliteVaultTrajectory,
} from './tactics';
export { createHopliteTextures, type HopliteTextureSuite } from './textures';
export {
  buildPlasmaSpearHopliteRig,
  type HoplitePoseMode,
  type PlasmaSpearHopliteRigHandle,
} from './mesh';
export { createPlasmaSpearHopliteBrain } from './ai';
