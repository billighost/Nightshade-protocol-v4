export { createResonantBeamPrismBrain } from './ai';
export { RESONANT_BEAM_PRISM_CONFIG } from './config';
export {
  buildResonantBeamPrismRig,
  type BeamPrismApertureMode,
  type BeamPrismRigHandle,
} from './mesh';
export {
  computeRefractedFanAngles,
  computeSweepBeamYaw,
  selectBeamPrismAction,
  solvePrismMortarCluster,
  type BeamPrismAction,
  type BeamPrismTacticsInput,
} from './tactics';
export {
  createBeamPrismTextures,
  type BeamPrismTextureSuite,
} from './textures';
