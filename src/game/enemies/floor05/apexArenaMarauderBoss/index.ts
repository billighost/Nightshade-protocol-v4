export { APEX_ARENA_MARAUDER_BOSS_CONFIG } from './config';
export {
  selectMarauderAction,
  computeMarauderAxeWaveAngles,
  computeMarauderShotgunSpread,
  solveMarauderCataclysmLeap,
  type MarauderAction,
  type MarauderTacticsInput,
} from './tactics';
export { createMarauderTextures, type MarauderTextureSuite } from './textures';
export {
  buildApexArenaMarauderBossRig,
  type MarauderPoseMode,
  type ApexArenaMarauderRigHandle,
} from './mesh';
export { createApexArenaMarauderBossBrain } from './ai';
