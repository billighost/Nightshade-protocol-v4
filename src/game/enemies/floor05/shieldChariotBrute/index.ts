export { SHIELD_CHARIOT_BRUTE_CONFIG } from './config';
export {
  selectBruteAction,
  computeFlakScatterOffsets,
  solveBruteMortarArc,
  type BruteAction,
  type BruteTacticsInput,
  type BruteMortarArcSolution,
} from './tactics';
export { createBruteTextures, type BruteTextureSuite } from './textures';
export {
  buildShieldChariotBruteRig,
  type BrutePoseMode,
  type ShieldChariotBruteRigHandle,
} from './mesh';
export { createShieldChariotBruteBrain } from './ai';
