import type * as THREE from 'three';
import type { EnemyArchetypeBrain } from '../../core/enemyManager';
import type { Floor08EnemyMaterials } from '../../core/enemyMeshShared';
import type { EnemyRigHandle } from '../../core/types';
import { createStriderAiState, stepStriderAi } from './ai';
import { updateStriderAnimation } from './animations';
import { RAZOR_STRIDER_CONFIG } from './config';
import { buildStriderMeshRig } from './mesh';

export { RAZOR_STRIDER_CONFIG } from './config';

export function createRazorStriderBrain(mats: Floor08EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: RAZOR_STRIDER_CONFIG,
    createRig: (enemyId: string): EnemyRigHandle => {
      const meshRig = buildStriderMeshRig(enemyId, mats);
      const gaitPhase = { value: Math.random() * Math.PI * 2 };
      const handle: EnemyRigHandle & {
        setDashTelegraph: (visible: boolean, length?: number, pulse?: number) => void;
        getEyeGlintWorldPos: (out: THREE.Vector3) => THREE.Vector3;
      } = {
        root: meshRig.root,
        hitboxes: meshRig.hitboxes,
        weakpointMaterials: [meshRig.weakpoint.coreMaterial],
        armorFlashMaterials: [meshRig.flashArmorMat],
        getMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.bladeTipRight.getWorldPosition(out),
        getWeakpointWorldPos: (out: THREE.Vector3) =>
          meshRig.weakpoint.coreGroup.getWorldPosition(out),
        getEyeGlintWorldPos: (out: THREE.Vector3) =>
          meshRig.torso.eyeGlintOrigin.getWorldPosition(out),
        setDashTelegraph: (visible, length, pulse) =>
          meshRig.weakpoint.setDashTelegraph(visible, length, pulse),
        updateAnimation: (input) => updateStriderAnimation(meshRig, input, gaitPhase),
        dispose: () => meshRig.dispose(),
      };
      return handle;
    },
    createAiState: createStriderAiState,
    stepAi: stepStriderAi,
  };
}
