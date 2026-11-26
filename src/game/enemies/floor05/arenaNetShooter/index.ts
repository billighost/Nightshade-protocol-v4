export { ARENA_NET_SHOOTER_CONFIG } from './config';
export {
  selectNetShooterAction,
  computeSnareNetSpreadAngles,
  computeTeslaBurstOffsets,
  solveShockBolaArc,
  solveArcBlinkVault,
  type NetShooterAction,
  type NetShooterTacticsInput,
} from './tactics';
export { createNetShooterTextures, type NetShooterTextureSuite } from './textures';
export {
  buildArenaNetShooterRig,
  type ArenaNetShooterRigHandle,
  type NetShooterPoseMode,
} from './mesh';
export { createArenaNetShooterBrain } from './ai';
