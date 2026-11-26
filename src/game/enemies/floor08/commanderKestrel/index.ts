import type * as THREE from 'three';
import type { EnemyArchetypeBrain } from '../../core/enemyManager';
import type { Floor08EnemyMaterials } from '../../core/enemyMeshShared';
import type { EnemyRigHandle } from '../../core/types';
import { createKestrelAiState, stepKestrelAi } from './ai';
import { updateKestrelAnimation } from './animations';
import { COMMANDER_KESTREL_CONFIG } from './config';
import { buildKestrelMeshRig } from './mesh';

export { COMMANDER_KESTREL_CONFIG } from './config';

export interface KestrelRigHandle extends EnemyRigHandle {
  getVisorGlintWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

export function createCommanderKestrelBrain(mats: Floor08EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: COMMANDER_KESTREL_CONFIG,
    createRig: (enemyId: string): KestrelRigHandle => {
      const meshRig = buildKestrelMeshRig(enemyId, mats);
      const gaitPhase = { value: 0 };
      return {
        root: meshRig.root,
        hitboxes: meshRig.hitboxes,
        weakpointMaterials: [meshRig.weakpoint.ventMaterial],
        armorFlashMaterials: [meshRig.flashArmorMat],
        getMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.muzzlePoint.getWorldPosition(out),
        getWeakpointWorldPos: (out: THREE.Vector3) =>
          meshRig.weakpoint.jetpackRoot.getWorldPosition(out),
        getVisorGlintWorldPos: (out: THREE.Vector3) => meshRig.getVisorGlintWorldPos(out),
        updateAnimation: (input) => updateKestrelAnimation(meshRig, input, gaitPhase),
        dispose: () => meshRig.dispose(),
      };
    },
    createAiState: createKestrelAiState,
    stepAi: stepKestrelAi,
  };
}
