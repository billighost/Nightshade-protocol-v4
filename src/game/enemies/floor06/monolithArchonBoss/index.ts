export { createMonolithArchonBossBrain } from './ai';
export { MONOLITH_ARCHON_BOSS_CONFIG } from './config';
export {
  buildMonolithArchonBossRig,
  type ArchonBossStance,
  type ArchonBossVisualState,
  type MonolithArchonRigHandle,
} from './mesh';
export {
  computeArchonFanDirections,
  computeArchonMeteorTargets,
  computeArchonScissorSweepYaw,
  computeArchonSupernovaRing,
  pickArchonBlinkDestination,
  selectArchonBossAction,
  type ArchonBossAction,
  type ArchonBossTacticsInput,
  type ArchonMeteorTarget,
} from './tactics';
export {
  createMonolithArchonTextures,
  type MonolithArchonTextureSuite,
} from './textures';
