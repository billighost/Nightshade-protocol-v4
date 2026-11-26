export { BASTION_SEVEN_BOSS_CONFIG } from './config';
export { buildBastionSevenBossRig, type BastionRigHandle } from './mesh';
export { createBastionSevenBossBrain } from './ai';
export {
  selectBastionAttack,
  computeSiegeMissileTargets,
  computePlasmaFanDirections,
  computeTitanChargeVelocity,
  type BastionAttackKind,
  type BastionTacticalInput,
} from './tactics';
