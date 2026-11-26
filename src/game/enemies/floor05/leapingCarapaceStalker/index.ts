export { LEAPING_CARAPACE_STALKER_CONFIG } from './config';
export {
  selectStalkerAction,
  solveStalkerPounce,
  solveStalkerVenomLob,
  solveStalkerBackflip,
  computeSpineFanAngles,
  type StalkerAction,
  type StalkerTacticsInput,
  type StalkerPounceTrajectory,
  type StalkerVenomLobVelocity,
} from './tactics';
export { createStalkerTextures, type StalkerTextureSuite } from './textures';
export {
  buildLeapingCarapaceStalkerRig,
  type StalkerPoseMode,
  type LeapingCarapaceStalkerRigHandle,
} from './mesh';
export { createLeapingCarapaceStalkerBrain } from './ai';
