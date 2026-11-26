import * as THREE from 'three';
import type { WeaponId } from '../../core/types';
import { solveTwoBoneArmIK } from '../skeleton/ikSolver';
import { alignWeaponHandInSpine2 } from './combatAimIK';
import type { AgentAnimationInput, AnimatorMemory, OperativeAnimationTargets } from './types';

// Exact anatomical socket reach targets in Spine2 local space!
const HOLSTER_REACH_TARGET = new THREE.Vector3(0.24, -0.38, -0.02);
const HOLSTER_REACH_POLE = new THREE.Vector3(0.42, -0.14, 0.16);

// Left dorsal back rail reach (VIPER-X4 stowed on left back)
const BACK_SMG_REACH_TARGET = new THREE.Vector3(0.06, 0.28, 0.16);
const BACK_SMG_REACH_POLE = new THREE.Vector3(0.44, 0.22, -0.06);

// Right dorsal heavy sling reach (VULCAN-50 stowed over right shoulder)
const BACK_HEAVY_REACH_TARGET = new THREE.Vector3(0.18, 0.36, 0.14);
const BACK_HEAVY_REACH_POLE = new THREE.Vector3(0.48, 0.28, -0.06);

const CHEST_READY_TARGET = new THREE.Vector3(0.09, 0.08, -0.32);
const CHEST_READY_POLE = new THREE.Vector3(0.36, -0.24, -0.06);

const MAG_POUCH_TARGET = new THREE.Vector3(-0.16, -0.26, -0.12);
const MAG_POUCH_POLE = new THREE.Vector3(-0.4, -0.16, 0.1);

const _tmpTarget = new THREE.Vector3();
const _tmpPole = new THREE.Vector3();
const _tmpLeftTarget = new THREE.Vector3();
const _tmpLeftPole = new THREE.Vector3();
const _reloadLeftFrom = new THREE.Vector3(-0.34, -0.2, -0.14);
const _reloadLeftTo = new THREE.Vector3(0.05, 0.01, -0.34);
const _reloadPoleTo = new THREE.Vector3(-0.34, -0.24, -0.14);
const _heavyMagSeat = new THREE.Vector3(0.04, 0.02, -0.42);

function smooth01(x: number): number {
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
}

function getStowReach(weapon: WeaponId): { target: THREE.Vector3; pole: THREE.Vector3 } {
  if (weapon === 'pistol') {
    return { target: HOLSTER_REACH_TARGET, pole: HOLSTER_REACH_POLE };
  }
  if (weapon === 'smg') {
    return { target: BACK_SMG_REACH_TARGET, pole: BACK_SMG_REACH_POLE };
  }
  return { target: BACK_HEAVY_REACH_TARGET, pole: BACK_HEAVY_REACH_POLE };
}

/**
 * Physical 3-Weapon Swap Choreography + Tactical Reload / Heavy Mag Swap / Cryo-Vent Layer!
 *
 * Supports ALL 6 weapon transitions (`pistol <-> smg`, `pistol <-> heavy`, `smg <-> heavy`):
 * - `t = 0.00..0.34`: Right hand moves to `swapFromWeapon` body mount (thigh holster, left back rail,
 *   or right shoulder heavy sling) and physically stows it at `t = 0.28`!
 * - `t = 0.34..0.68`: Right hand sweeps athletically to `activeWeapon` body mount and physically
 *   draws it into the right hand at `t = 0.56`!
 * - `t = 0.68..1.00`: Brings newly drawn weapon into combat-ready posture while left hand catches grip!
 */
export function applyWeaponSwapAndReload(
  targets: OperativeAnimationTargets,
  mem: AnimatorMemory,
  input: AgentAnimationInput
): void {
  const {
    rig,
    activePistol,
    activeSmg,
    activeHeavy,
    holsteredPistol,
    backSmg,
    backHeavy,
  } = targets;
  const {
    activeWeapon,
    swapFromWeapon,
    swapProgress,
    pistolReloadPhase,
    pistolReloadProgress,
    heavyReloading,
    heavyReloadProgress,
    smgVenting,
    smgOverheated,
    smgHeatRatio,
  } = input;

  // --- 1. REAL PHYSICAL 3-WEAPON SWAP CHOREOGRAPHY ---
  if (swapProgress > 0.001) {
    const t = THREE.MathUtils.clamp(1 - swapProgress, 0, 1); // 0 -> 1 through swap
    const fromStowed = t >= 0.28;
    const toDrawn = t >= 0.56;

    const setWeaponState = (id: WeaponId, inHand: boolean) => {
      if (id === 'pistol') {
        activePistol.root.visible = inHand;
        holsteredPistol.root.visible = !inHand;
      } else if (id === 'smg') {
        activeSmg.root.visible = inHand;
        backSmg.root.visible = !inHand;
      } else {
        activeHeavy.root.visible = inHand;
        backHeavy.root.visible = !inHand;
      }
    };

    // Third uninvolved weapon remains cleanly stowed on body throughout swap!
    const allWeapons: WeaponId[] = ['pistol', 'smg', 'heavy'];
    for (const id of allWeapons) {
      if (id === swapFromWeapon) {
        setWeaponState(id, !fromStowed);
      } else if (id === activeWeapon) {
        setWeaponState(id, toDrawn);
      } else {
        setWeaponState(id, false);
      }
    }

    const fromReach = getStowReach(swapFromWeapon);
    const toReach = getStowReach(activeWeapon);

    if (t < 0.34) {
      const k = smooth01(t / 0.28);
      _tmpTarget.lerpVectors(CHEST_READY_TARGET, fromReach.target, k);
      _tmpPole.lerpVectors(CHEST_READY_POLE, fromReach.pole, k);
      const yawDir = swapFromWeapon === 'pistol' ? -0.22 : 0.24;
      rig.spine2.rotation.y += k * yawDir;
      rig.spine2.rotation.z -= swapFromWeapon === 'pistol' ? k * 0.08 : 0;
    } else if (t < 0.68) {
      const k = smooth01((t - 0.34) / 0.24);
      _tmpTarget.lerpVectors(fromReach.target, toReach.target, k);
      _tmpPole.lerpVectors(fromReach.pole, toReach.pole, k);
      const yawDir = activeWeapon === 'pistol' ? -0.22 : 0.26;
      rig.spine2.rotation.y += (k - 0.3) * yawDir;
      rig.head.rotation.y -= k * (activeWeapon === 'pistol' ? 0.06 : 0.16);
    } else {
      const k = smooth01((t - 0.68) / 0.32);
      _tmpTarget.lerpVectors(toReach.target, CHEST_READY_TARGET, k);
      _tmpPole.lerpVectors(toReach.pole, CHEST_READY_POLE, k);
    }

    const swapWeight = Math.min(1, t * 5) * Math.min(1, (1 - t) * 4.5);
    rig.rightShoulder.rotation.set(0.1 * swapWeight, -0.12 * swapWeight, 0.14 * swapWeight);
    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpTarget,
      _tmpPole,
      swapWeight
    );

    // Left support hand clears torso then meets newly drawn weapon grip/foregrip!
    const catchK = smooth01((t - 0.64) / 0.34);
    const targetZ = activeWeapon === 'pistol' ? -0.42 : -0.46;
    _tmpLeftTarget.set(
      THREE.MathUtils.lerp(-0.16, 0.01, catchK),
      THREE.MathUtils.lerp(-0.04, 0.09, catchK),
      THREE.MathUtils.lerp(-0.22, targetZ, catchK)
    );
    _tmpLeftPole.set(-0.36, -0.24, -0.12);
    solveTwoBoneArmIK(
      rig.leftShoulder,
      rig.leftArm,
      rig.leftForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpLeftTarget,
      _tmpLeftPole,
      swapWeight * 0.86
    );

    rig.rightHand.rotation.set(0.18, 0, 0);
    return;
  }

  // --- NORMAL STEADY-STATE 3-WEAPON VISIBILITY (zero overlap!) ---
  activePistol.root.visible = activeWeapon === 'pistol';
  activeSmg.root.visible = activeWeapon === 'smg';
  activeHeavy.root.visible = activeWeapon === 'heavy';
  holsteredPistol.root.visible = activeWeapon !== 'pistol';
  backSmg.root.visible = activeWeapon !== 'smg';
  backHeavy.root.visible = activeWeapon !== 'heavy';

  // --- 2. PISTOL ACTIVE-TIMING RELOAD IK CHOREOGRAPHY ---
  if (activeWeapon === 'pistol' && pistolReloadPhase !== 'idle') {
    const p = pistolReloadProgress;
    const isJammed = pistolReloadPhase === 'jammed';

    const reloadWeight =
      Math.sin(Math.min(1, p * 4) * Math.PI * 0.5) * Math.min(1, (1 - p) * 5 + 0.15);
    _tmpTarget.set(0.06, 0.08 + (isJammed ? Math.sin(p * 34) * 0.025 : 0), -0.34);
    _tmpPole.set(0.36, -0.22, -0.06);
    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpTarget,
      _tmpPole,
      reloadWeight
    );
    alignWeaponHandInSpine2(rig, 0.22, -0.26, 0.65, reloadWeight);

    if (p < 0.44) {
      const k = smooth01(p / 0.35);
      _tmpLeftTarget.lerpVectors(_tmpTarget, MAG_POUCH_TARGET, k);
      _tmpLeftPole.lerpVectors(_reloadLeftFrom, MAG_POUCH_POLE, k);
      mem.reloadMagDrop = k * 0.14;
    } else if (p < 0.78) {
      const k = smooth01((p - 0.44) / 0.3);
      _tmpLeftTarget.lerpVectors(MAG_POUCH_TARGET, _reloadLeftTo, k);
      _tmpLeftPole.lerpVectors(MAG_POUCH_POLE, _reloadPoleTo, k);
      mem.reloadMagDrop = (1 - k) * 0.14;
    } else {
      const k = smooth01((p - 0.78) / 0.22);
      _tmpLeftTarget.set(0.05, 0.12, -0.34 + Math.sin(k * Math.PI) * 0.055);
      _tmpLeftPole.set(-0.36, -0.16, -0.14);
      mem.reloadMagDrop = 0;
    }
    solveTwoBoneArmIK(
      rig.leftShoulder,
      rig.leftArm,
      rig.leftForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpLeftTarget,
      _tmpLeftPole,
      reloadWeight
    );
    activePistol.magazine.position.y = -0.015 - mem.reloadMagDrop;
  } else {
    activePistol.magazine.position.y = -0.015;
  }

  // --- 2B. VULCAN-50 HEAVY .50-CAL BOX-MAGAZINE RELOAD IK CHOREOGRAPHY ---
  if (activeWeapon === 'heavy' && heavyReloading) {
    const p = heavyReloadProgress;
    const reloadWeight =
      Math.sin(Math.min(1, p * 4.5) * Math.PI * 0.5) * Math.min(1, (1 - p) * 5 + 0.12);

    // Cant heavy rifle slightly inward & elevated for chunky box-mag swap
    _tmpTarget.set(0.11, 0.09, -0.28);
    _tmpPole.set(0.38, -0.28, -0.04);
    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpTarget,
      _tmpPole,
      reloadWeight
    );
    alignWeaponHandInSpine2(rig, 0.18, -0.2, 0.44, reloadWeight);

    let heavyMagDrop = 0;
    let heavyBoltRack = 0;
    if (p < 0.36) {
      // Pull empty .50 box mag out & drop toward waist pouch
      const k = smooth01(p / 0.34);
      _tmpLeftTarget.lerpVectors(_heavyMagSeat, MAG_POUCH_TARGET, k);
      _tmpLeftPole.lerpVectors(_reloadLeftFrom, MAG_POUCH_POLE, k);
      heavyMagDrop = k * 0.19;
    } else if (p < 0.72) {
      // Slap heavy fresh .50-cal box mag firmly upward into magwell
      const k = smooth01((p - 0.36) / 0.32);
      _tmpLeftTarget.lerpVectors(MAG_POUCH_TARGET, _heavyMagSeat, k);
      _tmpLeftPole.lerpVectors(MAG_POUCH_POLE, _reloadPoleTo, k);
      heavyMagDrop = (1 - k) * 0.19;
    } else {
      // Authoritative side-charging handle bolt rack!
      const k = smooth01((p - 0.72) / 0.28);
      heavyBoltRack = Math.sin(k * Math.PI);
      _tmpLeftTarget.set(0.03, 0.13, -0.44 + heavyBoltRack * 0.08);
      _tmpLeftPole.set(-0.38, -0.18, -0.14);
    }

    solveTwoBoneArmIK(
      rig.leftShoulder,
      rig.leftArm,
      rig.leftForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpLeftTarget,
      _tmpLeftPole,
      reloadWeight
    );
    activeHeavy.magazine.position.y = -0.048 - heavyMagDrop;
    activeHeavy.bolt.position.z = -0.095 + heavyBoltRack * 0.068;
  } else {
    activeHeavy.magazine.position.y = -0.048;
    activeHeavy.bolt.position.z = -0.095 + mem.recoilSmooth * 0.06;
  }

  // --- 3. SMG THERMAL CRYO-VENT ANIMATION & THERMAL GLOW ---
  if (activeWeapon === 'smg' && (smgVenting || smgOverheated)) {
    // Tilt SMG sideways to purge pressurized cryo-steam & sparks from side vent flaps!
    _tmpTarget.set(0.09, 0.1, -0.29);
    _tmpPole.set(0.36, -0.3, -0.04);
    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpTarget,
      _tmpPole,
      0.85
    );
    alignWeaponHandInSpine2(rig, 0.16, -0.16, -0.62, 0.85);
    _tmpLeftTarget.set(0.04, 0.12, -0.49);
    _tmpLeftPole.set(-0.3, -0.28, -0.2);
    solveTwoBoneArmIK(
      rig.leftShoulder,
      rig.leftArm,
      rig.leftForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _tmpLeftTarget,
      _tmpLeftPole,
      0.85
    );
  }

  // Animate Pistol Reciprocating Slide, Articulated Trigger, Hammer & Laser Sight
  activePistol.slide.position.z = -0.052 + mem.recoilSmooth * 0.042;
  activePistol.trigger.rotation.x = -0.26 + mem.recoilSmooth * 0.44;
  activePistol.hammer.rotation.x = -0.35 - mem.recoilSmooth * 0.65;
  activePistol.laserBeam.visible =
    activeWeapon === 'pistol' &&
    !input.heroTitlePose &&
    (input.ads || input.combatReady) &&
    pistolReloadPhase === 'idle';

  // Animate VULCAN-50 amber kinetic accelerator rail glow on recoil
  activeHeavy.coilGlowMat.emissiveIntensity = 1.2 + mem.recoilSmooth * 2.4;

  // Animate VIPER-X4 Reciprocating Steel Bolt Carrier, Cryo-Vent Flaps & Emissive Thermal Core
  activeSmg.bolt.position.z = -0.096 + mem.recoilSmooth * 0.044;
  const ventFlare = smgVenting || smgOverheated ? 0.62 : smgHeatRatio > 0.78 ? 0.18 : 0;
  activeSmg.ventFlapL.rotation.z = THREE.MathUtils.lerp(
    activeSmg.ventFlapL.rotation.z,
    ventFlare,
    0.25
  );
  activeSmg.ventFlapR.rotation.z = THREE.MathUtils.lerp(
    activeSmg.ventFlapR.rotation.z,
    -ventFlare,
    0.25
  );
  if (smgOverheated) {
    const pulse = 0.78 + Math.sin(input.elapsed * 22) * 0.22;
    activeSmg.thermalCoreMat.emissive.setHex(0xff3b1f);
    activeSmg.thermalCoreMat.emissiveIntensity = 3.2 * pulse;
  } else if (smgVenting) {
    activeSmg.thermalCoreMat.emissive.setHex(0x38bdf8);
    activeSmg.thermalCoreMat.emissiveIntensity = 2.6;
  } else if (smgHeatRatio > 0.65) {
    activeSmg.thermalCoreMat.emissive.setHex(0xf97316);
    activeSmg.thermalCoreMat.emissiveIntensity = 1.3 + smgHeatRatio * 1.6;
  } else {
    activeSmg.thermalCoreMat.emissive.setHex(0x06b6d4);
    activeSmg.thermalCoreMat.emissiveIntensity = 0.65 + smgHeatRatio * 0.7;
  }
}
