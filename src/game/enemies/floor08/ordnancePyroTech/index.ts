import type * as THREE from 'three';
import type { EnemyArchetypeBrain } from '../../core/enemyManager';
import type { Floor08EnemyMaterials } from '../../core/enemyMeshShared';
import type { EnemyRigHandle } from '../../core/types';
import { createPyroAiState, stepPyroAi } from './ai';
import { updatePyroAnimation } from './animations';
import { ORDNANCE_PYRO_CONFIG } from './config';
import { buildPyroMeshRig } from './mesh';

export { ORDNANCE_PYRO_CONFIG } from './config';

export interface PyroRigHandle extends EnemyRigHandle {
  getVisorGlintWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

export function createOrdnancePyroBrain(mats: Floor08EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: ORDNANCE_PYRO_CONFIG,
    createRig: (enemyId: string): PyroRigHandle => {
      const meshRig = buildPyroMeshRig(enemyId, mats);
      const gaitPhase = { value: 0 };
      return {
        root: meshRig.root,
        hitboxes: meshRig.hitboxes,
        weakpointMaterials: [meshRig.weakpoint.tankMaterial],
        armorFlashMaterials: [meshRig.flashArmorMat],
        getMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.muzzlePoint.getWorldPosition(out),
        getVisorGlintWorldPos: (out: THREE.Vector3) =>
          meshRig.torsoParts.visorGlintOrigin.getWorldPosition(out),
        getWeakpointWorldPos: (out: THREE.Vector3) =>
          meshRig.weakpoint.tankGroup.getWorldPosition(out),
        updateAnimation: (input) => updatePyroAnimation(meshRig, input, gaitPhase),
        dispose: () => meshRig.dispose(),
      };
    },
    createAiState: createPyroAiState,
    stepAi: stepPyroAi,
  };
}
