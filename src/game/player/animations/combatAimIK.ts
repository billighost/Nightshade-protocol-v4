import * as THREE from 'three';
import type { MixamoHumanoidRig } from '../skeleton/mixamoBones';
import { solveTwoBoneArmIK } from '../skeleton/ikSolver';
import type { LowerBodyResult } from './locomotion8Way';
import type { AgentAnimationInput, AnimatorMemory } from './types';

// Scratch objects (zero GC per frame)
const _rTarget = new THREE.Vector3();
const _lTarget = new THREE.Vector3();
const _rPole = new THREE.Vector3();
const _lPole = new THREE.Vector3();
const _aimFwd = new THREE.Vector3();
const _aimUp = new THREE.Vector3();
const _aimRight = new THREE.Vector3();
const _handX = new THREE.Vector3();
const _handY = new THREE.Vector3();
const _handZ = new THREE.Vector3();
const _matHand = new THREE.Matrix4();
const _qDesiredHandSpine2 = new THREE.Quaternion();
const _qChain = new THREE.Quaternion();
const _qChainInv = new THREE.Quaternion();
const _qUpperR = new THREE.Quaternion();
const _qForeR = new THREE.Quaternion();
const _qHandR = new THREE.Quaternion();
const _qUpperL = new THREE.Quaternion();
const _qForeL = new THREE.Quaternion();
const _qHandL = new THREE.Quaternion();
const _eulerTmp = new THREE.Euler(0, 0, 0, 'XYZ');

/**
 * Aligns `rightHand.quaternion` precisely in `Spine2` local space so that `weaponHandSocket`
 * aims dead straight along `aimFwd` (barrel) with `aimUp` (top of slide), regardless of
 * shoulder/elbow IK angles!
 */
export function alignWeaponHandInSpine2(
  rig: MixamoHumanoidRig,
  aimPitchLocal: number,
  aimYawOffset: number,
  rollOffset: number,
  blendWeight: number
): void {
  if (blendWeight <= 0.001) return;

  const sinP = Math.sin(aimPitchLocal);
  const cosP = Math.cos(aimPitchLocal);
  const sinY = Math.sin(aimYawOffset);
  const cosY = Math.cos(aimYawOffset);

  _aimFwd.set(-sinY * cosP, sinP, -cosY * cosP).normalize();
  _aimRight.set(cosY, 0, -sinY).normalize();
  _aimUp.crossVectors(_aimRight, _aimFwd).normalize();

  if (Math.abs(rollOffset) > 1e-4) {
    const c = Math.cos(rollOffset);
    const s = Math.sin(rollOffset);
    const rx = _aimRight.x * c + _aimUp.x * s;
    const ry = _aimRight.y * c + _aimUp.y * s;
    const rz = _aimRight.z * c + _aimUp.z * s;
    _aimRight.set(rx, ry, rz).normalize();
    _aimUp.crossVectors(_aimRight, _aimFwd).normalize();
  }

  // Matches weaponHandSocket anatomical basis: Hand -X = slide up, Hand -Y = barrel fwd, Hand -Z = right
  _handX.copy(_aimUp).negate();
  _handY.copy(_aimFwd).negate();
  _handZ.copy(_aimRight).negate();

  _matHand.makeBasis(_handX, _handY, _handZ);
  _qDesiredHandSpine2.setFromRotationMatrix(_matHand);

  _qChain
    .copy(rig.rightShoulder.quaternion)
    .multiply(rig.rightArm.quaternion)
    .multiply(rig.rightForeArm.quaternion);
  _qChainInv.copy(_qChain).invert();
  _qDesiredHandSpine2.premultiply(_qChainInv);

  if (blendWeight >= 0.999) {
    rig.rightHand.quaternion.copy(_qDesiredHandSpine2);
  } else {
    rig.rightHand.quaternion.slerp(_qDesiredHandSpine2, blendWeight);
  }
}

/**
 * Aligns the left support hand cleanly around either the pistol grip or SMG angled foregrip
 * inside `Spine2` local space.
 */
function computeAimBasis(
  aimPitchLocal: number,
  aimYawOffset: number,
  rollOffset = 0
): void {
  const sinP = Math.sin(aimPitchLocal);
  const cosP = Math.cos(aimPitchLocal);
  const sinY = Math.sin(aimYawOffset);
  const cosY = Math.cos(aimYawOffset);
  _aimFwd.set(-sinY * cosP, sinP, -cosY * cosP).normalize();
  _aimRight.set(cosY, 0, -sinY).normalize();
  _aimUp.crossVectors(_aimRight, _aimFwd).normalize();

  if (Math.abs(rollOffset) > 1e-4) {
    const c = Math.cos(rollOffset);
    const s = Math.sin(rollOffset);
    const rx = _aimRight.x * c + _aimUp.x * s;
    const ry = _aimRight.y * c + _aimUp.y * s;
    const rz = _aimRight.z * c + _aimUp.z * s;
    _aimRight.set(rx, ry, rz).normalize();
    _aimUp.crossVectors(_aimRight, _aimFwd).normalize();
  }
}

function alignSupportLeftHandInSpine2(
  rig: MixamoHumanoidRig,
  aimPitchLocal: number,
  aimYawOffset: number,
  rollOffset: number,
  isPistol: boolean,
  blendWeight: number
): void {
  if (blendWeight <= 0.001) return;

  computeAimBasis(aimPitchLocal, aimYawOffset, rollOffset);

  if (isPistol) {
    // Exact mirrored left-hand thumbs-forward two-handed pistol clasp from createSculptedHand(side=-1):
    //   LeftHand +X = thumb/radial (points UP along +_aimUp, tucked parallel beside slide!)
    //   LeftHand -Y = fingertips (point FORWARD & angled ~18° inward toward +_aimRight to wrap snugly around front of grip & right fingers!)
    //   LeftHand +Z = palm (presses squarely onto the left side of the pistol grip!)
    _handY
      .copy(_aimFwd)
      .multiplyScalar(-0.95)
      .addScaledVector(_aimRight, -0.31)
      .normalize();
    _handX.copy(_aimUp).multiplyScalar(0.96).addScaledVector(_aimRight, -0.18).normalize();
    _handZ.crossVectors(_handX, _handY).normalize();
    _handX.crossVectors(_handY, _handZ).normalize();
  } else {
    // Left support hand wraps cleanly around the VIPER-X4 vertical-angled foregrip:
    //   LeftHand +X = thumb/radial (points UP-FORWARD along upper foregrip / handguard)
    //   LeftHand -Y = fingertips (curl FORWARD & INWARD around the front of the ribbed foregrip!)
    //   LeftHand +Z = palm (presses squarely into the left flank of the foregrip!)
    _handY
      .copy(_aimFwd)
      .multiplyScalar(-0.84)
      .addScaledVector(_aimRight, -0.52)
      .addScaledVector(_aimUp, 0.14)
      .normalize();
    _handX.copy(_aimUp).multiplyScalar(0.92).addScaledVector(_aimFwd, 0.36).normalize();
    _handZ.crossVectors(_handX, _handY).normalize();
    _handX.crossVectors(_handY, _handZ).normalize();
  }

  _matHand.makeBasis(_handX, _handY, _handZ);
  _qDesiredHandSpine2.setFromRotationMatrix(_matHand);
  _qChain
    .copy(rig.leftShoulder.quaternion)
    .multiply(rig.leftArm.quaternion)
    .multiply(rig.leftForeArm.quaternion);
  _qChainInv.copy(_qChain).invert();
  _qDesiredHandSpine2.premultiply(_qChainInv);

  if (blendWeight >= 0.999) {
    rig.leftHand.quaternion.copy(_qDesiredHandSpine2);
  } else {
    rig.leftHand.quaternion.slerp(_qDesiredHandSpine2, blendWeight);
  }
}

/**
 * AAA Tactical Soldier Upper-Body Weapon Carriage, Patrol Walk, Tactical Sprint & Combat Aim IK
 * (Call of Duty: MW / Ghost Recon / MGSV / Splinter Cell Craft):
 *
 * 1. **Hero Title Showcase**: Grounded, dignified relaxed spec-ops idle with symmetrical thumb-forward hold.
 * 2. **Tactical Soldier Low-Ready Patrol Walk (Idle -> Walk, Pistol & SMG)**:
 *    - Operative does NOT dangle arms like a civilian!
 *    - Pistol: Two-handed **Tactical Low-Ready / Compressed-Ready Patrol Carry** (muzzle angled safely
 *      forward-down at `-30°`, elbows tucked near armored ribs) with **10% phase-lagged Lissajous
 *      figure-8 footstep overlap**, start/stop inertia lag, and asymmetric breathing!
 *    - SMG: Two-handed **Tactical Low-Ready Rifle/SMG Patrol Carry** angled safely forward-down-left,
 *      with loaded weight dip and shoulder roll on every heavy booted footstep!
 * 3. **Call-of-Duty / Splinter Cell Tactical Sprint (`Shift` + `WASD`)**:
 *    - Pistol: Breaks smoothly into **Explosive One-Handed Tactical High-Index Sprint** — left free arm
 *      drives powerfully in a 3D oblique sprinter arc (`72°–114°` bent elbow, cheek-to-hip drive), while
 *      right weapon arm pumps compactly at chest/shoulder height with pistol muzzle controlled safely
 *      forward-upward!
 *    - SMG: Aggressive **Two-Handed Call-of-Duty Across-Chest Tactical Sprint** surging rhythmically
 *      with every stride impulse!
 * 4. **Combat Aim / ADS / Firing (`readyBlend -> 1`)**:
 *    - Pistol: Tight two-handed Isosceles/Weaver clasp dead-center downrange.
 *    - SMG: Tightly shouldered cheek-weld with left hand locked onto angled foregrip.
 */
export function applyCombatArmsAndIK(
  rig: MixamoHumanoidRig,
  mem: AnimatorMemory,
  input: AgentAnimationInput,
  lower: LowerBodyResult
): void {
  const { elapsed, activeWeapon, aimPitch, ads } = input;
  const breath = Math.sin(elapsed * 2.05) + 0.25 * Math.sin(elapsed * 0.87);
  const { gaitPose, moveMag, strideSwing, lagPhase01 } = lower;
  const walkAmt = THREE.MathUtils.smoothstep(moveMag, 0.02, 0.22);
  const runAmt = Math.max(mem.runBlend, mem.sprintBlend) * walkAmt;
  const sprint = mem.sprintBlend * walkAmt;
  const heroTitle = Boolean(input.heroTitlePose);

  // Landing squat arm counterbalance envelope
  const landRatio =
    input.locomotion.landingTimer > 0 && input.locomotion.landingDuration > 0
      ? input.locomotion.landingTimer / input.locomotion.landingDuration
      : 0;
  const landSpread = Math.sin(landRatio * Math.PI) * input.locomotion.landingImpact;

  // =========================================================================
  // 1. BASE FK LAYER: HERO TITLE POSE & EXPLOSIVE TACTICAL PISTOL SPRINT DRIVE
  // =========================================================================
  if (heroTitle) {
    rig.rightShoulder.rotation.set(0.02, 0, -0.05);
    rig.leftShoulder.rotation.set(0.02, 0, 0.05);

    _eulerTmp.set(0.07, -0.06, 0.14, 'YXZ');
    _qUpperR.setFromEuler(_eulerTmp);
    _eulerTmp.set(0.28, -1.32, 0, 'XYZ');
    _qForeR.setFromEuler(_eulerTmp);
    _eulerTmp.set(0.02, 0, 0.04, 'XYZ');
    _qHandR.setFromEuler(_eulerTmp);

    _eulerTmp.set(0.04, 0.06, -0.14, 'YXZ');
    _qUpperL.setFromEuler(_eulerTmp);
    _eulerTmp.set(0.24, 1.36, 0, 'XYZ');
    _qForeL.setFromEuler(_eulerTmp);
    _eulerTmp.set(0.02, 0, -0.04, 'XYZ');
    _qHandL.setFromEuler(_eulerTmp);
  } else {
    // Organic clavicle roll & protraction coupled to lagged stride phase (visible from OTS rear camera!)
    const rClavY = gaitPose.rightArm.clavicleY * walkAmt;
    const lClavY = gaitPose.leftArm.clavicleY * walkAmt;
    const stepClavRoll = Math.sin(lagPhase01 * Math.PI * 2) * 0.042 * walkAmt;
    rig.rightShoulder.rotation.set(
      0.04 + runAmt * 0.1,
      -rClavY - (1 - runAmt) * 0.05,
      -0.05 + stepClavRoll + runAmt * 0.06 - landSpread * 0.08
    );
    rig.leftShoulder.rotation.set(
      0.04 + runAmt * 0.1,
      lClavY + (1 - runAmt) * 0.05,
      0.05 + stepClavRoll - runAmt * 0.06 + landSpread * 0.08
    );

    // --- LEFT FREE ARM (Drives explosive athletic sprinter pump when sprinting with pistol!) ---
    // Keep upper arm abducted clear of armored ribs (lDriveZ <= -0.14) while bent forearm drives obliquely forward!
    const lIdleX = 0.05 + breath * 0.012;
    const lIdleZ = -0.18;
    const lIdleElbow = 0.34 + breath * 0.015;
    const lIdlePronation = 1.38;

    const lDriveX = THREE.MathUtils.lerp(lIdleX, gaitPose.leftArm.shoulderX, walkAmt) + landSpread * 0.24;
    const lDriveZ = Math.min(
      -0.14,
      THREE.MathUtils.lerp(lIdleZ, -0.22 + gaitPose.leftArm.shoulderAdductZ * 0.32, walkAmt) -
        landSpread * 0.28
    );
    const lDriveY = gaitPose.leftArm.shoulderTwistY * 0.72 * walkAmt;
    const lElbowX =
      THREE.MathUtils.lerp(lIdleElbow, gaitPose.leftArm.elbowX, walkAmt) + landSpread * 0.24;
    const lPronY = THREE.MathUtils.lerp(lIdlePronation, gaitPose.leftArm.foreArmPronationY, walkAmt);
    const lWristX = gaitPose.leftArm.wristFlexX * walkAmt - landSpread * 0.14;
    const lWristZ = gaitPose.leftArm.wristDevZ * walkAmt - 0.04;

    _eulerTmp.set(lDriveX, lDriveY, lDriveZ, 'YXZ');
    _qUpperL.setFromEuler(_eulerTmp);
    _eulerTmp.set(lElbowX, lPronY, 0, 'XYZ');
    _qForeL.setFromEuler(_eulerTmp);
    _eulerTmp.set(lWristX, 0.06 * runAmt, lWristZ, 'XYZ');
    _qHandL.setFromEuler(_eulerTmp);

    // --- RIGHT WEAPON ARM BASE FK (Clean outward rib clearance; Pistol Sprint solved cleanly with 2-Bone IK below!) ---
    const rIdleX = activeWeapon !== 'pistol' ? 0.18 : 0.14 + breath * 0.012;
    const rIdleZ = 0.2;
    const rIdleElbow = activeWeapon !== 'pistol' ? 0.56 : 0.52;
    const rIdlePronation = -1.34;

    _eulerTmp.set(rIdleX, 0, rIdleZ, 'YXZ');
    _qUpperR.setFromEuler(_eulerTmp);
    _eulerTmp.set(rIdleElbow, rIdlePronation, 0, 'XYZ');
    _qForeR.setFromEuler(_eulerTmp);
    _eulerTmp.set(0.04, 0, 0.04, 'XYZ');
    _qHandR.setFromEuler(_eulerTmp);
  }

  rig.rightArm.quaternion.copy(_qUpperR);
  rig.rightForeArm.quaternion.copy(_qForeR);
  rig.rightHand.quaternion.copy(_qHandR);
  rig.leftArm.quaternion.copy(_qUpperL);
  rig.leftForeArm.quaternion.copy(_qForeL);
  rig.leftHand.quaternion.copy(_qHandL);

  if (heroTitle) return;

  // =========================================================================
  // 1B. CALL-OF-DUTY HIGH-INDEX TACTICAL PISTOL SPRINT (2-BONE ARM IK!)
  //     Engages STRICTLY during active Shift Sprint (`sprint > 0`), NEVER during
  //     normal walking, crouch-walking, or post-roll/post-jump walk momentum!
  // =========================================================================
  const pistolSprintWeight =
    activeWeapon === 'pistol' ? sprint * (1 - mem.readyBlend) * (1 - mem.airBlend * 0.85) : 0;
  if (pistolSprintWeight > 0.01) {
    const lagAngle = lagPhase01 * Math.PI * 2;
    const pumpFwd = gaitPose.rightArm.shoulderX * 0.085; // pumps cleanly forward/back with stride
    const pumpUp = Math.max(0, gaitPose.rightArm.shoulderX) * 0.045 - Math.abs(Math.sin(lagAngle)) * 0.018;

    // Right hand stays OUTSIDE right ribcage (x ~ 0.19m) and clearly IN FRONT (z ~ -0.32m), elbow bent ~96°!
    _rTarget.set(0.185 - Math.max(0, gaitPose.rightArm.shoulderX) * 0.03, -0.045 + pumpUp, -0.315 - pumpFwd);
    _rPole.set(0.92, -0.1, 0.14);

    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _rTarget,
      _rPole,
      pistolSprintWeight
    );

    const sprintPistolPitch = 0.22 + Math.sin(lagAngle * 2) * 0.09 * sprint;
    const sprintPistolYaw = 0.26 + strideSwing * 0.12;
    const sprintPistolRoll = -0.24;
    alignWeaponHandInSpine2(
      rig,
      sprintPistolPitch,
      sprintPistolYaw,
      sprintPistolRoll,
      pistolSprintWeight
    );
  }

  // =========================================================================
  // 2. TACTICAL SOLDIER TWO-HANDED LOW-READY PATROL CARRY (IDLE & WALK!)
  //    Matches `soldier_walk_ref` & Call of Duty / Ghost Recon / MGSV:
  //    - Both hands carry the pistol or SMG in a grounded low-ready combat posture
  //    - 10% phase-lagged Lissajous figure-8 overlap + start/stop weapon inertia
  //      + organic asymmetric breathing so it NEVER looks stiff or robotic!
  //    - Smoothly hands off to Tactical Sprint (`runAmt -> 1`) or ADS (`readyBlend -> 1`)!
  // =========================================================================
  const patrolWeight = (1 - sprint) * (1 - mem.readyBlend) * (1 - mem.airBlend * 0.85);
  if (patrolWeight > 0.01) {
    // 10% phase-lagged Lissajous figure-8 step overlap (weapon dips AFTER each boot plant!)
    const lagAngle = lagPhase01 * Math.PI * 2;
    const fig8X = Math.sin(lagAngle) * 0.02 * walkAmt; // lateral sway with weight shift
    const fig8Y = -Math.abs(Math.sin(lagAngle)) * 0.022 * walkAmt; // double-frequency down-dip on every step!
    const fig8Z = Math.cos(lagAngle * 2) * 0.012 * walkAmt + mem.accelSmooth * 0.16; // inertia lag on start/stop!
    const breathY = breath * 0.005;
    const microAsymX = Math.sin(elapsed * 1.13) * 0.004 * walkAmt;
    const landDropY = -landSpread * 0.055;

    const spineYawUndo = THREE.MathUtils.clamp(
      -(rig.spine.rotation.y + rig.spine1.rotation.y + rig.spine2.rotation.y) * 0.55,
      -0.32,
      0.32
    );

    if (activeWeapon === 'pistol') {
      // Two-Handed Tactical Compressed-Ready Pistol Patrol Walk (Unmistakable Dual-Handed Grip!):
      // - Held cleanly at lower-chest / sternum height (`y ~ -0.05..-0.038`) well in front of torso
      //   (`z ~ -0.365..-0.382`) with muzzle angled safely forward-down at `-14°..-12°` (`-0.25..-0.20 rad`).
      // - Target sits ~0.46m from shoulders -> GUARANTEES natural ~58°-68° bent elbows cleanly OUTSIDE
      //   the armored ribcage (`|elbow.x| >= 0.23m`), while BOTH forearms fold inward symmetrically to
      //   clasp the pistol grip with a true thumbs-forward two-handed tactical hold!
      const baseY = THREE.MathUtils.lerp(-0.058, -0.042, walkAmt) + fig8Y + breathY + landDropY;
      const baseZ = -THREE.MathUtils.lerp(0.365, 0.382, walkAmt) + fig8Z;
      const baseX = THREE.MathUtils.lerp(0.022, 0.016, walkAmt) + fig8X + microAsymX;

      const patrolPitch =
        THREE.MathUtils.lerp(-0.26, -0.2, walkAmt) +
        Math.sin(lagAngle * 2) * 0.045 * walkAmt +
        input.aimPitch * 0.28;
      const patrolYaw = 0.04 + spineYawUndo + Math.sin(lagAngle) * 0.045 * walkAmt;
      const patrolRoll = -0.05 + Math.cos(lagAngle) * 0.045 * walkAmt;

      computeAimBasis(patrolPitch, patrolYaw, patrolRoll);
      _rTarget.set(baseX, baseY, baseZ);
      // Exact left-wrist offset so left palm presses squarely onto the left side of the pistol grip
      // (-0.026 * _aimRight) and left fingers wrap cleanly around the front of the right fingers!
      _lTarget
        .copy(_rTarget)
        .addScaledVector(_aimRight, -0.044)
        .addScaledVector(_aimFwd, 0.016)
        .addScaledVector(_aimUp, -0.008);

      // Strongly outward elbow poles: upper arms turn cleanly outward past the ribs,
      // BOTH elbows visibly bend OUTSIDE the torso, and BOTH forearms fold inward onto the pistol!
      _rPole.set(0.95, -0.02, 0.08);
      _lPole.set(-0.95, -0.02, 0.08);

      solveTwoBoneArmIK(
        rig.rightShoulder,
        rig.rightArm,
        rig.rightForeArm,
        rig.upperArmLen,
        rig.foreArmLen,
        _rTarget,
        _rPole,
        patrolWeight
      );
      solveTwoBoneArmIK(
        rig.leftShoulder,
        rig.leftArm,
        rig.leftForeArm,
        rig.upperArmLen,
        rig.foreArmLen,
        _lTarget,
        _lPole,
        patrolWeight
      );

      alignWeaponHandInSpine2(rig, patrolPitch, patrolYaw, patrolRoll, patrolWeight);
      alignSupportLeftHandInSpine2(rig, patrolPitch, patrolYaw, patrolRoll, true, patrolWeight);
    } else {
      // Two-Handed Tactical Low-Ready SMG Patrol Carry (angled down-left cleanly clear of forearms!)
      const baseY = THREE.MathUtils.lerp(-0.162, -0.138, walkAmt) + fig8Y + breathY + landDropY;
      const baseZ = -THREE.MathUtils.lerp(0.275, 0.295, walkAmt) + fig8Z;
      const baseX = 0.132 + fig8X + microAsymX;

      const smgPitch = -0.44 + Math.sin(lagAngle * 2) * 0.055 * walkAmt + input.aimPitch * 0.22;
      const smgYaw = 0.44 + spineYawUndo + Math.sin(lagAngle) * 0.065 * walkAmt;
      const smgRoll = -0.18 + Math.cos(lagAngle) * 0.06 * walkAmt;

      computeAimBasis(smgPitch, smgYaw, smgRoll);
      _rTarget.set(baseX, baseY, baseZ);
      // Mathematically lock left support hand directly onto the VIPER-X4 ribbed foregrip!
      _lTarget
        .copy(_rTarget)
        .addScaledVector(_aimFwd, 0.268)
        .addScaledVector(_aimUp, -0.022)
        .addScaledVector(_aimRight, -0.026);

      _rPole.set(0.38, -0.36, 0.1);
      _lPole.set(-0.36, -0.34, -0.06);

      solveTwoBoneArmIK(
        rig.rightShoulder,
        rig.rightArm,
        rig.rightForeArm,
        rig.upperArmLen,
        rig.foreArmLen,
        _rTarget,
        _rPole,
        patrolWeight
      );
      solveTwoBoneArmIK(
        rig.leftShoulder,
        rig.leftArm,
        rig.leftForeArm,
        rig.upperArmLen,
        rig.foreArmLen,
        _lTarget,
        _lPole,
        patrolWeight
      );

      alignWeaponHandInSpine2(rig, smgPitch, smgYaw, smgRoll, patrolWeight);
      alignSupportLeftHandInSpine2(rig, smgPitch, smgYaw, smgRoll, false, patrolWeight);
    }
  }

  // =========================================================================
  // 3. CALL-OF-DUTY TWO-HANDED ACROSS-CHEST TACTICAL SMG SPRINT!
  //    Matches `soldier_run_ref`: compact high-port weapon surge pumping hard
  //    with every driving sprint stride, left hand mathematically locked to foregrip!
  // =========================================================================
  const smgSprintWeight = activeWeapon !== 'pistol' ? sprint * (1 - mem.readyBlend) : 0;

  if (smgSprintWeight > 0.02) {
    const lagAngle = lagPhase01 * Math.PI * 2;
    const bounceY = gaitPose.pelvisY * 0.55 - Math.abs(Math.sin(lagAngle)) * 0.02;
    const pumpX = strideSwing * 0.044;
    const pumpZ = Math.abs(strideSwing) * 0.03;

    const sprintSmgPitch = 0.22 + Math.sin(lagAngle * 2) * 0.08 * sprint;
    const sprintSmgYaw = 0.78 + strideSwing * 0.14;
    const sprintSmgRoll = -0.32;

    computeAimBasis(sprintSmgPitch, sprintSmgYaw, sprintSmgRoll);
    _rTarget.set(0.125 + pumpX, -0.018 + bounceY, -0.305 - pumpZ);
    _rPole.set(0.4, -0.32, 0.08);

    _lTarget
      .copy(_rTarget)
      .addScaledVector(_aimFwd, 0.268)
      .addScaledVector(_aimUp, -0.022)
      .addScaledVector(_aimRight, -0.026);
    _lPole.set(-0.4, -0.28, -0.06);

    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _rTarget,
      _rPole,
      smgSprintWeight
    );
    solveTwoBoneArmIK(
      rig.leftShoulder,
      rig.leftArm,
      rig.leftForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _lTarget,
      _lPole,
      smgSprintWeight
    );

    alignWeaponHandInSpine2(rig, sprintSmgPitch, sprintSmgYaw, sprintSmgRoll, smgSprintWeight);
    alignSupportLeftHandInSpine2(
      rig,
      sprintSmgPitch,
      sprintSmgYaw,
      sprintSmgRoll,
      false,
      smgSprintWeight
    );
  }

  // =========================================================================
  // 4. COMBAT AIM / TWO-HANDED SHOOTING STANCE IK (`readyBlend`: 0 -> 1)
  // =========================================================================
  const ikWeight = mem.readyBlend;
  if (ikWeight <= 0.01) return;

  const localPitch = THREE.MathUtils.clamp(aimPitch * 0.68, -0.45, 0.45);
  const recoil = mem.recoilSmooth;
  const moveBobY = gaitPose.pelvisY * 0.25 * moveMag * (1 - mem.adsBlend * 0.72);
  const moveBobX = strideSwing * 0.011 * moveMag * (1 - mem.adsBlend * 0.72);

  const shoulderRaise = ikWeight * (ads ? 0.16 : 0.11);
  rig.rightShoulder.rotation.set(0.08 * ikWeight, -0.1 * ikWeight, -0.04 + shoulderRaise);
  rig.leftShoulder.rotation.set(0.08 * ikWeight, 0.12 * ikWeight, 0.04 - shoulderRaise * 0.85);

  if (activeWeapon === 'pistol') {
    // Athletic Isosceles / Modified Weaver pistol aim with natural micro-bent outward elbows (~46°-54°)!
    const aimHeight = THREE.MathUtils.lerp(0.115, 0.185, mem.adsBlend) + Math.sin(localPitch) * 0.38;
    const reachZ = -THREE.MathUtils.lerp(0.415, 0.455, mem.adsBlend) + recoil * 0.032;
    const centerX = THREE.MathUtils.lerp(0.032, 0.014, mem.adsBlend) + moveBobX;

    _rTarget.set(centerX, aimHeight + moveBobY + recoil * 0.025, reachZ);
    _lTarget.set(centerX - 0.044, aimHeight - 0.008 + moveBobY + recoil * 0.025, reachZ - 0.014);

    _rPole.set(0.92, -0.04, 0.06);
    _lPole.set(-0.92, -0.04, 0.06);
  } else {
    const aimHeight = THREE.MathUtils.lerp(0.085, 0.142, mem.adsBlend) + Math.sin(localPitch) * 0.28;
    const gripX = THREE.MathUtils.lerp(0.118, 0.095, mem.adsBlend) + moveBobX;
    const gripZ = -THREE.MathUtils.lerp(0.245, 0.265, mem.adsBlend) + recoil * 0.028;

    _rTarget.set(gripX, aimHeight + moveBobY + recoil * 0.016, gripZ);

    const spineTwistPre = THREE.MathUtils.clamp(
      -(rig.spine.rotation.y + rig.spine1.rotation.y + rig.spine2.rotation.y) - rig.hips.rotation.y,
      -0.45,
      0.45
    );
    computeAimBasis(localPitch + recoil * 0.095, spineTwistPre, 0);
    _lTarget
      .copy(_rTarget)
      .addScaledVector(_aimFwd, 0.268)
      .addScaledVector(_aimUp, -0.022)
      .addScaledVector(_aimRight, -0.026);

    _rPole.set(0.38, -0.34, -0.04);
    _lPole.set(-0.42, -0.34, -0.14);
  }

  solveTwoBoneArmIK(
    rig.rightShoulder,
    rig.rightArm,
    rig.rightForeArm,
    rig.upperArmLen,
    rig.foreArmLen,
    _rTarget,
    _rPole,
    ikWeight
  );
  solveTwoBoneArmIK(
    rig.leftShoulder,
    rig.leftArm,
    rig.leftForeArm,
    rig.upperArmLen,
    rig.foreArmLen,
    _lTarget,
    _lPole,
    ikWeight
  );

  const recoilPitch =
    recoil * (activeWeapon === 'pistol' ? 0.22 : activeWeapon === 'heavy' ? 0.2 : 0.095);
  const spineTwistComp =
    -(rig.spine.rotation.y + rig.spine1.rotation.y + rig.spine2.rotation.y) - rig.hips.rotation.y;
  const handYawComp = THREE.MathUtils.clamp(spineTwistComp, -0.45, 0.45);
  alignWeaponHandInSpine2(rig, localPitch + recoilPitch, handYawComp, 0, ikWeight);
  alignSupportLeftHandInSpine2(
    rig,
    localPitch + recoilPitch,
    handYawComp,
    0,
    activeWeapon === 'pistol',
    ikWeight
  );
}
