import type * as THREE from 'three';
import type { EnemyArchetypeBrain } from '../../core/enemyManager';
import type { Floor08EnemyMaterials } from '../../core/enemyMeshShared';
import type { EnemyRigHandle } from '../../core/types';
import { createBreacherAiState, stepBreacherAi } from './ai';
import { updateBreacherAnimation } from './animations';
import { BREACHER_CYBORG_CONFIG } from './config';
import { buildBreacherMeshRig } from './mesh';

export { BREACHER_CYBORG_CONFIG } from './config';

export interface BreacherRigHandle extends EnemyRigHandle {
  setLaserSight: (visible: boolean, lengthMeters: number, lockCharge?: number) => void;
  getLaserOriginWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getOpticGlintWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

export function createBreacherCyborgBrain(mats: Floor08EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: BREACHER_CYBORG_CONFIG,
    createRig: (enemyId: string): BreacherRigHandle => {
      const meshRig = buildBreacherMeshRig(enemyId, mats);
      const gaitPhase = { value: Math.random() * Math.PI * 2 };
      return {
        root: meshRig.root,
        hitboxes: meshRig.hitboxes,
        weakpointMaterials: [meshRig.weakpoint.cellMaterial],
        armorFlashMaterials: [meshRig.flashArmorMat],
        getMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.muzzlePoint.getWorldPosition(out),
        getWeakpointWorldPos: (out: THREE.Vector3) =>
          meshRig.weakpoint.cellGroup.getWorldPosition(out),
        setLaserSight: (visible, len, lockCharge) =>
          meshRig.limbs.setLaserSight(visible, len, lockCharge),
        getLaserOriginWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.laserOrigin.getWorldPosition(out),
        getOpticGlintWorldPos: (out: THREE.Vector3) =>
          meshRig.torsoParts.opticGlintOrigin.getWorldPosition(out),
        updateAnimation: (input) => updateBreacherAnimation(meshRig, input, gaitPhase),
        dispose: () => meshRig.dispose(),
      };
    },
    createAiState: createBreacherAiState,
    stepAi: stepBreacherAi,
  };
}
