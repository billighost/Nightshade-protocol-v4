import type * as THREE from 'three';
import type { EnemyArchetypeBrain } from '../../core/enemyManager';
import type { Floor08EnemyMaterials } from '../../core/enemyMeshShared';
import type { EnemyRigHandle } from '../../core/types';
import { createWardenAiState, stepWardenAi } from './ai';
import { updateWardenAnimation } from './animations';
import { KILLHOUSE_WARDEN_CONFIG } from './config';
import { buildWardenMeshRig } from './mesh';

export { KILLHOUSE_WARDEN_CONFIG } from './config';

export interface WardenRigHandle extends EnemyRigHandle {
  getLeftMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getRightMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getOpticGlintWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

export function createKillhouseWardenBrain(mats: Floor08EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: KILLHOUSE_WARDEN_CONFIG,
    createRig: (enemyId: string): WardenRigHandle => {
      const meshRig = buildWardenMeshRig(enemyId, mats);
      const gaitPhase = { value: Math.random() * Math.PI * 2 };
      return {
        root: meshRig.root,
        hitboxes: meshRig.hitboxes,
        weakpointMaterials: [meshRig.weakpoint.coilMaterial],
        armorFlashMaterials: [meshRig.flashArmorMat],
        getMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.muzzleRight.getWorldPosition(out),
        getLeftMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.muzzleLeft.getWorldPosition(out),
        getRightMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.muzzleRight.getWorldPosition(out),
        getOpticGlintWorldPos: (out: THREE.Vector3) =>
          meshRig.torsoParts.opticGlintOrigin.getWorldPosition(out),
        getWeakpointWorldPos: (out: THREE.Vector3) =>
          meshRig.weakpoint.coilRack.getWorldPosition(out),
        updateAnimation: (input) => updateWardenAnimation(meshRig, input, gaitPhase),
        dispose: () => meshRig.dispose(),
      };
    },
    createAiState: createWardenAiState,
    stepAi: stepWardenAi,
  };
}
