import type * as THREE from 'three';
import type { EnemyArchetypeBrain } from '../../core/enemyManager';
import type { Floor08EnemyMaterials } from '../../core/enemyMeshShared';
import type { EnemyRigHandle } from '../../core/types';
import { createAegisAiState, stepAegisAi } from './ai';
import { updateAegisAnimation } from './animations';
import { AEGIS_RIOT_CONFIG } from './config';
import { buildAegisMeshRig } from './mesh';

export { AEGIS_RIOT_CONFIG } from './config';

export interface AegisRigHandle extends EnemyRigHandle {
  getVisorGlintWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

export function createAegisRiotBrain(mats: Floor08EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: AEGIS_RIOT_CONFIG,
    createRig: (enemyId: string): AegisRigHandle => {
      const meshRig = buildAegisMeshRig(enemyId, mats);
      const gaitPhase = { value: Math.random() * Math.PI * 2 };
      return {
        root: meshRig.root,
        hitboxes: meshRig.hitboxes,
        shieldGroup: meshRig.shieldRig.shieldGroup,
        weakpointMaterials: [meshRig.shieldRig.projectorMaterial],
        armorFlashMaterials: [meshRig.flashArmorMat],
        getMuzzleWorldPos: (out: THREE.Vector3) =>
          meshRig.limbs.muzzlePoint.getWorldPosition(out),
        getWeakpointWorldPos: (out: THREE.Vector3) =>
          meshRig.shieldRig.projectorGroup.getWorldPosition(out),
        getVisorGlintWorldPos: (out: THREE.Vector3) =>
          meshRig.torsoParts.visorGlintOrigin.getWorldPosition(out),
        updateAnimation: (input) => updateAegisAnimation(meshRig, input, gaitPhase),
        dispose: () => meshRig.dispose(),
      };
    },
    createAiState: createAegisAiState,
    stepAi: stepAegisAi,
  };
}
