import * as THREE from 'three';
import type { ProceduralTextureSet } from '../core/textures';
import type { WeaponId } from '../core/types';
import {
  createSpectrePistol,
  createViperSmg,
  createVulcanHeavy,
  type SpectrePistolRig,
  type ViperSmgRig,
  type VulcanHeavyRig,
} from '../weapons/models';
import { stepOperativeStateMachine } from './animations/stateMachine';
import {
  createAnimatorMemory,
  type AgentAnimationInput,
  type AnimatorMemory,
  type OperativeAnimationTargets,
} from './animations/types';
import { buildSkinnedArmsAndPauldrons } from './mesh/armsArmorSkinned';
import { buildForearmsVambracesAndGloves } from './mesh/forearmsAndGloves';
import { buildLegGearAndBoots } from './mesh/gearAndBoots';
import { buildOperativeHead } from './mesh/head';
import { buildSkinnedStealthLegsAndBelt } from './mesh/legsArmorSkinned';
import { createOperativeMaterials, type OperativeMaterialPalette } from './mesh/materials';
import { buildSkinnedTorsoArmor } from './mesh/torsoArmorSkinned';
import { createMixamoSkeleton, type MixamoHumanoidRig } from './skeleton/mixamoBones';

export type { AgentAnimationInput };

const _smgQuatTmp = new THREE.Quaternion();

/**
 * Modular AAA SkinnedMesh Helmeted Spec-Ops Stealth Operative (`1.82m` true real-world scale).
 * Structured cleanly in Mixamo-standard modular folders:
 * - `player/skeleton/` (`mixamoBones.ts`, `ikSolver.ts`)
 * - `player/mesh/` (`materials.ts`, `head.ts`, `torsoArmorSkinned.ts`, `armsArmorSkinned.ts`, `forearmsAndGloves.ts`, `legsArmorSkinned.ts`, `gearAndBoots.ts`)
 * - `player/animations/` (`types.ts`, `keyframeCurves.ts`, `locomotion8Way.ts`, `airAndDodge.ts`, `combatAimIK.ts`, `weaponSwapAndReload.ts`, `stateMachine.ts`)
 */
export class CyberpunkOperativeRig {
  public readonly root: THREE.Group;
  public readonly rig: MixamoHumanoidRig;
  private readonly mats: OperativeMaterialPalette;
  private readonly targets: OperativeAnimationTargets;
  private readonly animMemory: AnimatorMemory;

  public readonly activePistol: SpectrePistolRig;
  public readonly activeSmg: ViperSmgRig;
  public readonly activeHeavy: VulcanHeavyRig;

  constructor(textures: ProceduralTextureSet) {
    this.root = new THREE.Group();
    this.root.name = 'NIGHTSHADE_OPERATIVE';

    this.mats = createOperativeMaterials(textures);
    this.animMemory = createAnimatorMemory();

    // Soft grounded contact shadow disc beneath operative's boots
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 1.08),
      new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.012;
    this.root.add(contactShadow);

    // 1. Instantiate Mixamo-standard 22-bone Skeleton (bind-pose y = 0.000..1.82m)
    this.rig = createMixamoSkeleton(this.root);

    // 2. Build Continuous SkinnedMesh Stealth Armor & Hex-Carbon Undersuit
    buildSkinnedTorsoArmor(this.root, this.rig, this.mats);
    buildSkinnedArmsAndPauldrons(this.root, this.rig, this.mats);
    buildSkinnedStealthLegsAndBelt(this.root, this.rig, this.mats);

    // 3. Build Bone-Attached Ballistic Helmet, Vambrace Gauntlets, Shin Greaves & Combat Boots
    buildOperativeHead(this.rig, this.mats);
    buildForearmsVambracesAndGloves(this.rig, this.mats);
    buildLegGearAndBoots(this.rig, this.mats);

    // 4. Mount Active Weapons inside right hand socket + Stowed 3-Weapon Loadout on body
    //    - SPECTRE-9: Right drop-leg thigh holster
    //    - VIPER-X4:  Left dorsal magnetic back rail
    //    - VULCAN-50: Right dorsal heavy sling (tank brake rising past right shoulder)
    this.activePistol = createSpectrePistol();
    this.activeSmg = createViperSmg();
    this.activeSmg.root.visible = false;
    this.activeHeavy = createVulcanHeavy();
    this.activeHeavy.root.visible = false;
    this.rig.weaponHandSocket.add(this.activePistol.root);
    this.rig.weaponHandSocket.add(this.activeSmg.root);
    this.rig.weaponHandSocket.add(this.activeHeavy.root);

    const holsteredPistol = createSpectrePistol();
    holsteredPistol.laserBeam.visible = false;
    holsteredPistol.root.visible = false;
    this.rig.holsterSocket.add(holsteredPistol.root);

    const backSmg = createViperSmg();
    backSmg.root.visible = true;
    this.rig.backSmgSocket.add(backSmg.root);

    const backHeavy = createVulcanHeavy();
    backHeavy.root.visible = true;
    this.rig.backHeavySocket.add(backHeavy.root);

    this.targets = {
      rig: this.rig,
      contactShadow,
      activePistol: this.activePistol,
      activeSmg: this.activeSmg,
      activeHeavy: this.activeHeavy,
      holsteredPistol,
      backSmg,
      backHeavy,
    };
  }

  public update(input: AgentAnimationInput): void {
    stepOperativeStateMachine(this.targets, this.animMemory, input);
  }

  public getActiveMuzzleWorldPosition(weapon: WeaponId, out: THREE.Vector3): THREE.Vector3 {
    const obj =
      weapon === 'pistol'
        ? this.activePistol.muzzlePoint
        : weapon === 'smg'
          ? this.activeSmg.muzzlePoint
          : this.activeHeavy.muzzlePoint;
    return obj.getWorldPosition(out);
  }

  public getActiveMuzzleWorldQuaternion(
    weapon: WeaponId,
    out: THREE.Quaternion
  ): THREE.Quaternion {
    const obj =
      weapon === 'pistol'
        ? this.activePistol.muzzlePoint
        : weapon === 'smg'
          ? this.activeSmg.muzzlePoint
          : this.activeHeavy.muzzlePoint;
    return obj.getWorldQuaternion(out);
  }

  public getActiveEjectionWorldPosition(weapon: WeaponId, out: THREE.Vector3): THREE.Vector3 {
    const obj =
      weapon === 'pistol'
        ? this.activePistol.ejectionPoint
        : weapon === 'smg'
          ? this.activeSmg.ejectionPoint
          : this.activeHeavy.ejectionPoint;
    return obj.getWorldPosition(out);
  }

  public getSmgVentWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    return this.activeSmg.ventPoint.getWorldPosition(out);
  }

  /**
   * Computes exact world-space positions and outward jet directions for BOTH left & right
   * VIPER-X4 cryo-vent flaps so pressurized steam jets & overheat sparks blast cleanly
   * sideways out of the open handguard ports!
   */
  public getSmgVentWorldBasis(
    outPosL: THREE.Vector3,
    outPosR: THREE.Vector3,
    outDirL: THREE.Vector3,
    outDirR: THREE.Vector3,
    outUp: THREE.Vector3
  ): void {
    this.activeSmg.ventFlapL.getWorldPosition(outPosL);
    this.activeSmg.ventFlapR.getWorldPosition(outPosR);
    this.activeSmg.root.getWorldQuaternion(_smgQuatTmp);
    outDirL.set(-1, 0.22, -0.08).applyQuaternion(_smgQuatTmp).normalize();
    outDirR.set(1, 0.22, -0.08).applyQuaternion(_smgQuatTmp).normalize();
    outUp.set(0, 1, 0).applyQuaternion(_smgQuatTmp).normalize();
  }

  public dispose(): void {
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    this.mats.dispose();
  }
}
