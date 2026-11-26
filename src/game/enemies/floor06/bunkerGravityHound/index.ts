export { createBunkerGravityHoundBrain } from './ai';
export { BUNKER_GRAVITY_HOUND_CONFIG } from './config';
export {
  buildBunkerGravityHoundRig,
  type BunkerGravityHoundRigHandle,
  type GravityHoundStance,
  type GravityHoundVisualState,
} from './mesh';
export {
  computeHoundMawSweepYaw,
  computeHoundTuskSpread,
  selectGravityHoundAction,
  solveHoundMortarCluster,
  solveHoundPounceLeap,
  type GravityHoundAction,
  type GravityHoundTacticsInput,
  type HoundMortarArcSolution,
  type HoundPounceSolution,
} from './tactics';
export {
  createBunkerGravityHoundTextures,
  type BunkerGravityHoundTextureSuite,
} from './textures';
