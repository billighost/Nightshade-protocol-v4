import * as THREE from 'three';
import {
  applyAirborneBalanceArms,
  applyDirectionalJump,
  applyMartialShoulderRoll,
} from './airAndDodge';
import { applyCombatArmsAndIK } from './combatAimIK';
import { applyLocomotion8Way } from './locomotion8Way';
import {
  dampVal,
  type AgentAnimationInput,
  type AnimatorMemory,
  type OperativeAnimationTargets,
} from './types';
import { applyWeaponSwapAndReload } from './weaponSwapAndReload';

/**
 * Master Mixamo-Bone Animation State Machine.
 * Weighted, non-snappy AAA transition damping across all posture & combat layers:
 * 1. Smooth posture state blends (`crouch`, `ads`, `combatReady`, `sprint`, `air`, `recoil`)
 * 2. Martial 4-Direction Shoulder Combat Roll (full-body override during active roll)
 * 3. 8-Directional Ground Locomotion + Velocity-Scaled Heavy Landing Squat Compression
 * 4. 5-Phase AAA Directional Jump Overlay (Launch -> Ascent -> Apex -> Descent Brace)
 * 5. 3D Biomechanical Arm/Forearm Pronation/Wrist Drive + Airborne Arm Balance + 2-Bone Aim IK
 * 6. Physical Weapon Swap Choreography (Thigh Holster <-> Back Sling) + Active Reload / Cryo-Vent
 */
export function stepOperativeStateMachine(
  targets: OperativeAnimationTargets,
  mem: AnimatorMemory,
  input: AgentAnimationInput
): void {
  const { dt, locomotion } = input;
  const { rig, contactShadow } = targets;

  // 1. Update smooth, weighted, non-snappy continuous blend channels
  const wantReady = !input.heroTitlePose && (input.ads || input.combatReady);
  mem.crouchBlend = dampVal(mem.crouchBlend, locomotion.crouching ? 1 : 0, 7.5, dt);
  mem.adsBlend = dampVal(mem.adsBlend, input.ads ? 1 : 0, 11, dt);
  mem.readyBlend = dampVal(mem.readyBlend, wantReady ? 1 : 0, wantReady ? 11 : 5.5, dt);
  mem.sprintBlend = dampVal(mem.sprintBlend, locomotion.sprinting ? 1 : 0, 6.2, dt);
  mem.airBlend = dampVal(mem.airBlend, locomotion.grounded ? 0 : 1, locomotion.grounded ? 14 : 11, dt);
  mem.recoilSmooth = dampVal(mem.recoilSmooth, input.recoilKick, 20, dt);

  // Scale soft contact shadow smoothly relative to current supporting ground or platform height!
  const heightAboveSupport = Math.max(0, locomotion.y - (locomotion.supportY || 0));
  const shadowScale = THREE.MathUtils.clamp(1 - heightAboveSupport * 0.22, 0.42, 1.05);
  contactShadow.scale.set(shadowScale, shadowScale, 1);
  contactShadow.position.y = 0.014 - heightAboveSupport;

  // 2. Check Full-Body Martial Shoulder Combat Roll
  const isRolling = applyMartialShoulderRoll(rig, input);

  if (!isRolling) {
    // 3. 8-Way Tactical Ground Locomotion & Heavy Landing Squat Compression
    const lower = applyLocomotion8Way(rig, mem, input);

    // 4. 5-Phase AAA Jump Lower-Body & Torso/Head Overlay
    applyDirectionalJump(rig, mem, input);

    // 5. 3D Biomechanical Arm/Forearm/Wrist Drive + 2-Bone Combat Aim IK
    applyCombatArmsAndIK(rig, mem, input, lower);

    // 6. Airborne Arm Balance (blends smoothly ONLY when not aiming!)
    applyAirborneBalanceArms(rig, mem, input);
  }

  // 7. Physical Weapon Swap Choreography & Active Reload / Cryo-Vent Overlay
  applyWeaponSwapAndReload(targets, mem, input);

  // 8. Visceral Additive Hit-Flinch Overlay (snaps upper torso & head back briefly without locking controls!)
  const flinch = input.hitFlinch ?? 0;
  if (flinch > 0.005 && !isRolling) {
    const dirX = input.hitDirLocalX ?? 0;
    rig.spine1.rotation.x -= flinch * 0.16;
    rig.spine2.rotation.x -= flinch * 0.18;
    rig.spine2.rotation.y += dirX * flinch * 0.24;
    rig.spine2.rotation.z -= dirX * flinch * 0.12;
    rig.neck.rotation.x -= flinch * 0.14;
    rig.head.rotation.x -= flinch * 0.16;
    rig.head.rotation.y += dirX * flinch * 0.18;
  }
}
