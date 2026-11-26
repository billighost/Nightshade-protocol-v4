export { GRAPPLE_LANCE_DUELIST_CONFIG } from './config';
export { buildGrappleLanceDuelistRig, type GrappleDuelistRigHandle } from './mesh';
export { createGrappleLanceDuelistBrain } from './ai';
export {
  selectDuelistAttack,
  computePlasmaArcDirections,
  computeTetherZipVelocity,
  type DuelistAttackChoice,
  type DuelistTacticsInput,
} from './tactics';
