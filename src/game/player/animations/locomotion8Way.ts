import * as THREE from 'three';
import { BIND_POSE, type MixamoHumanoidRig } from '../skeleton/mixamoBones';
import {
  BACKPEDAL_GAIT,
  CROUCH_WALK_GAIT,
  RUN_GAIT,
  SPRINT_GAIT,
  WALK_GAIT,
  lerpGaitPose,
  sampleGaitProfile,
  sampleStrafeLeg,
  wrap01,
  type SampledGaitPose,
} from './keyframeCurves';
import { dampVal, type AgentAnimationInput, type AnimatorMemory } from './types';

const _bounceEuler = new THREE.Euler();
const _bounceQuat = new THREE.Quaternion();

export interface LowerBodyResult {
  hipYaw: number;
  strideSwing: number;
  /** 10% phase-lagged gait phase (0..1) for organic weapon, shoulder & gear overlap! */
  lagPhase01: number;
  moveMag: number;
  isStrafing: boolean;
  /** Full biomechanical 3D gait pose sampled from tactical soldier keyframe curves */
  gaitPose: SampledGaitPose;
  /** Continuous movement speed blend: 0 idle, 0.35 walk, 0.72 jog/run, 1.0 sprint */
  locomotionSpeedBlend: number;
}

/**
 * AAA Tactical Soldier 8-Directional Ground Locomotion Layer
 * (Call of Duty: MW / Ghost Recon / MGSV "Combat Glide" & Tactical Sprint):
 * - Genuine HORIZONTAL LATERAL WEIGHT SHIFT (`hips.position.x`) over each planted stance boot!
 * - Soft-knee shock-absorbing tactical walk base (NEVER stiff locked mannequin stilts!)
 * - Start-acceleration forward controlled-fall lean & stop-deceleration settle cushion!
 * - Anticipatory head turn-lead (head glances smoothly into turns before hips finish rotating!)
 * - Aperiodic organic micro-breathing & micro-asymmetry so consecutive steps never feel robotic!
 * - Physical damped-spring secondary bounce on `backSmgSocket` (back-slung weapon jostles with real mass!)
 */
export function applyLocomotion8Way(
  rig: MixamoHumanoidRig,
  mem: AnimatorMemory,
  input: AgentAnimationInput
): LowerBodyResult {
  const { dt, elapsed, locomotion } = input;
  const moveX = locomotion.localMoveX;
  const moveZ = locomotion.localMoveZ;
  const moveMag = Math.min(1, Math.hypot(moveX, moveZ));
  const phase01 = wrap01(locomotion.gaitPhase / (Math.PI * 2));
  const lagPhase01 = wrap01(phase01 - 0.1);

  const crouch = mem.crouchBlend;
  const sprint = mem.sprintBlend;
  const isFreeFacing = Boolean(input.freeFacing);

  const strafeRatio =
    !isFreeFacing && moveMag > 0.06
      ? THREE.MathUtils.clamp((Math.abs(moveX) - Math.abs(moveZ) * 0.45) / (moveMag + 0.001), 0, 1)
      : 0;
  const isStrafing = strafeRatio > 0.25;
  const backRatio =
    !isFreeFacing && moveZ < -0.08
      ? THREE.MathUtils.clamp((-moveZ - Math.abs(moveX) * 0.35) / (moveMag + 0.001), 0, 1)
      : 0;

  // Normal walking (speedRatio ~0.57) stays 100% in Tactical Patrol Walk;
  // Combat Run / Tactical Sprint engages cleanly above 0.62 when Shift is held!
  const rawSpeed = Math.max(locomotion.speedRatio, moveMag * (sprint > 0.5 ? 1 : 0.57));
  const walkAmt = THREE.MathUtils.smoothstep(moveMag, 0.02, 0.22);
  const targetRunBlend =
    THREE.MathUtils.smoothstep(rawSpeed, 0.62, 0.88) * (1 - crouch) * (1 - mem.adsBlend * 0.65);
  mem.runBlend = dampVal(mem.runBlend, targetRunBlend, 6.4, dt);

  // Longitudinal acceleration / deceleration impulse (start forward lean -> stop settle!)
  const safeDt = Math.max(0.008, dt);
  const rawAccel = THREE.MathUtils.clamp((rawSpeed - mem.prevSpeed) / safeDt, -3.5, 3.5);
  mem.prevSpeed = rawSpeed;
  mem.accelSmooth = dampVal(mem.accelSmooth, rawAccel * 0.032, 7.5, dt);

  // Sample biomechanical spline curves & blend continuously across Walk -> Run -> Sprint -> Crouch -> Backpedal
  const walkSample = sampleGaitProfile(WALK_GAIT, phase01);
  const runSample = sampleGaitProfile(RUN_GAIT, phase01);
  const sprintSample = sampleGaitProfile(SPRINT_GAIT, phase01);
  const crouchSample = sampleGaitProfile(CROUCH_WALK_GAIT, phase01);
  const backSample = sampleGaitProfile(BACKPEDAL_GAIT, phase01);

  let gaitPose = lerpGaitPose(walkSample, runSample, mem.runBlend);
  gaitPose = lerpGaitPose(gaitPose, sprintSample, sprint * (1 - crouch));
  if (crouch > 0.01) {
    gaitPose = lerpGaitPose(gaitPose, crouchSample, crouch);
  }
  if (backRatio > 0.01) {
    gaitPose = lerpGaitPose(gaitPose, backSample, backRatio);
  }

  // Pelvis yaw alignment into travel direction
  let targetHipYaw = 0;
  if (input.heroTitlePose) {
    targetHipYaw = -0.14;
  } else if (moveMag > 0.06) {
    if (isFreeFacing) {
      targetHipYaw = gaitPose.pelvisYaw * walkAmt;
    } else if (backRatio > 0.35) {
      targetHipYaw = moveX * 0.42 + gaitPose.pelvisYaw * walkAmt;
    } else if (isStrafing) {
      targetHipYaw =
        -Math.sign(moveX) * Math.min(0.62, Math.abs(moveX) * 0.72) + gaitPose.pelvisYaw * 0.6;
    } else {
      targetHipYaw = -moveX * 0.46 + gaitPose.pelvisYaw * walkAmt;
    }
  } else {
    // Grounded staggered spec-ops ready stance (left foot forward, hips angled ~14° right)
    targetHipYaw = -0.22;
  }
  mem.hipYawSmooth = dampVal(mem.hipYawSmooth, targetHipYaw, 7.2, dt);

  // Subtle athletic banking ONLY when carving high-speed sprints (0° during walking turns!)
  const bankScale = (sprint * 0.78 + mem.runBlend * 0.22) * walkAmt;
  const targetBank = THREE.MathUtils.clamp((input.turnRate ?? 0) * 0.018 * bankScale, -0.055, 0.055);
  mem.turnBankSmooth = dampVal(mem.turnBankSmooth, targetBank, 7.5, dt);

  // Anticipatory head turn-lead (head glances subtly into turning direction before body finishes turning!)
  const targetHeadLead = THREE.MathUtils.clamp((input.turnRate ?? 0) * 0.055, -0.22, 0.22);
  mem.headLeadSmooth = dampVal(mem.headLeadSmooth, targetHeadLead, 8.5, dt);

  // Subtle organic breathing & non-repeating micro-asymmetry so idle & steps feel genuinely alive
  const breath = Math.sin(elapsed * 2.05) + 0.25 * Math.sin(elapsed * 0.87);
  const organicMicro = Math.sin(elapsed * 1.37) * 0.008;
  const idleSwayX = Math.sin(elapsed * 0.92) * 0.008 * (1 - walkAmt);

  // Velocity-scaled Heavy Landing Squat Compression
  const landDur = Math.max(0.05, locomotion.landingDuration || 0.34);
  const landRatio = locomotion.landingTimer > 0 ? locomotion.landingTimer / landDur : 0;
  const landElapsed = 1 - landRatio;
  const landCurve =
    landRatio > 0
      ? landElapsed < 0.28
        ? Math.sin((landElapsed / 0.28) * Math.PI * 0.5)
        : Math.cos(((landElapsed - 0.28) / 0.72) * Math.PI * 0.5)
      : 0;
  const landStrength = Math.max(0.35, locomotion.landingImpact || 0.65);
  const landDip = landCurve * (0.13 + landStrength * 0.14);

  // Lowered tactical athletic COM (soft knees during patrol walk, lower spring-mass crouch during sprint!)
  const crouchDrop = crouch * 0.27;
  const walkAthleticDrop = walkAmt * 0.006 * (1 - crouch);
  const runDrop = mem.runBlend * 0.022 * walkAmt + sprint * 0.03 * walkAmt;
  const stopSettleDip = Math.max(0, -mem.accelSmooth) * 0.14;
  const pelvisOscY = gaitPose.pelvisY * walkAmt;
  const baseHipY =
    BIND_POSE.hipsY -
    crouchDrop -
    walkAthleticDrop -
    runDrop -
    stopSettleDip -
    landDip +
    pelvisOscY +
    breath * 0.0035;

  // Genuine lateral weight shift over each planted stance boot (anti-robotic weight transfer!)
  const weightShiftX = gaitPose.pelvisX * walkAmt + idleSwayX;

  // Pelvis coronal Trendelenburg stabilization (ZERO turnBank hip tipping!)
  const hipRoll = gaitPose.pelvisRoll * walkAmt + (isStrafing ? moveX * 0.022 : 0);
  const hipPitch = -(
    0.05 +
    crouch * 0.2 +
    walkAmt * 0.035 +
    mem.runBlend * 0.065 * walkAmt +
    sprint * 0.08 * walkAmt +
    Math.max(0, mem.accelSmooth) * 0.55 +
    landDip * 1.05
  );

  rig.hips.position.set(weightShiftX, baseHipY, 0);
  rig.hips.rotation.set(hipPitch, mem.hipYawSmooth, hipRoll);

  // =========================================================================
  // LEFT & RIGHT LEG BIOMECHANICAL EVALUATION (SOFT-KNEE COMBAT GLIDE & SPRINT)
  // =========================================================================
  const strafeDir: -1 | 1 = moveX < 0 ? -1 : 1;

  const applyLeg = (
    upLeg: THREE.Bone,
    leg: THREE.Bone,
    foot: THREE.Bone,
    toe: THREE.Bone,
    side: -1 | 1,
    legData: SampledGaitPose['leftLeg']
  ) => {
    // Staggered athletic spec-ops idle stance (soft knees, grounded combat weight)
    const idleUpX = input.heroTitlePose
      ? side === -1
        ? 0.06
        : -0.05
      : side === -1
        ? 0.15
        : -0.14;
    const idleKnee = input.heroTitlePose ? -0.11 : side === -1 ? -0.24 : -0.2;
    const idleHipZ = side * (0.068 + crouch * 0.075);
    const idleFootX = -(idleUpX + idleKnee) * 0.72;

    let targetUpX = legData.hipX;
    let targetHipZ = side * legData.hipZ;
    let targetKnee = legData.kneeX;
    let targetAnkleX = legData.ankleX;
    let targetAnkleZ = -targetHipZ * 0.45;
    const targetToeX = legData.toeX;

    if (strafeRatio > 0.01) {
      const sLeg = sampleStrafeLeg(phase01, side, strafeDir);
      targetUpX = THREE.MathUtils.lerp(targetUpX, sLeg.hipX, strafeRatio);
      targetHipZ = THREE.MathUtils.lerp(targetHipZ, sLeg.hipZ, strafeRatio);
      targetKnee = THREE.MathUtils.lerp(targetKnee, sLeg.kneeX, strafeRatio);
      targetAnkleX = THREE.MathUtils.lerp(targetAnkleX, sLeg.ankleX, strafeRatio);
      targetAnkleZ = THREE.MathUtils.lerp(targetAnkleZ, sLeg.ankleZ, strafeRatio);
    }

    const impactFlex = (landDip + stopSettleDip) * 3.0;
    const motionBlend = Math.min(1, walkAmt + crouch * 0.75 + landCurve * 0.85);

    const finalUpX = THREE.MathUtils.lerp(idleUpX, targetUpX + impactFlex * 0.6, motionBlend);
    const finalHipZ = THREE.MathUtils.lerp(
      idleHipZ,
      targetHipZ + side * landDip * 0.35,
      Math.min(1, walkAmt + landCurve)
    );
    const finalKnee = Math.max(
      -2.28,
      Math.min(-0.08, THREE.MathUtils.lerp(idleKnee, targetKnee - impactFlex * 1.15, motionBlend))
    );
    const finalAnkleX = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(idleFootX, targetAnkleX + impactFlex * 0.48, motionBlend),
      -0.78,
      0.68
    );

    const upY = side * (0.045 + (isStrafing ? -moveX * 0.14 : 0));
    upLeg.rotation.set(finalUpX, upY, finalHipZ);
    leg.rotation.set(finalKnee, 0, 0);
    foot.rotation.set(finalAnkleX, 0, targetAnkleZ);
    toe.rotation.set(targetToeX * walkAmt, 0, 0);
  };

  applyLeg(rig.leftUpLeg, rig.leftLeg, rig.leftFoot, rig.leftToeBase, -1, gaitPose.leftLeg);
  applyLeg(rig.rightUpLeg, rig.rightLeg, rig.rightFoot, rig.rightToeBase, 1, gaitPose.rightLeg);

  // =========================================================================
  // UPPER SPINE COUNTER-ROTATION ("TANK TURRET" ISOLATION + START/STOP MOMENTUM!)
  // =========================================================================
  const combatMode = input.ads || input.combatReady;
  // Subtle natural bladed tactical patrol stance (left shoulder slightly leads, NEVER square robot!)
  const patrolWeaponTwist = !input.heroTitlePose && !combatMode ? -0.1 * walkAmt * (1 - sprint) : 0;
  const counterYaw = combatMode
    ? -mem.hipYawSmooth * 0.96
    : -mem.hipYawSmooth * 0.55 + gaitPose.spineYaw * walkAmt + patrolWeaponTwist;

  const combatTwist = combatMode
    ? input.activeWeapon === 'smg'
      ? -0.22
      : -0.06
    : 0;

  // Start-acceleration drives upper chest forward into first step; stop pulls chest upright!
  const targetLeanX =
    gaitPose.trunkLeanX * walkAmt -
    mem.accelSmooth * 0.75 -
    crouch * 0.18 -
    landDip * 1.15;
  const targetLeanZ =
    (isFreeFacing ? mem.turnBankSmooth : -moveX * (0.028 + sprint * 0.03)) -
    gaitPose.pelvisRoll * 0.85 * walkAmt +
    organicMicro * walkAmt;

  mem.leanX = dampVal(mem.leanX, targetLeanX, 7.6, dt);
  mem.leanZ = dampVal(mem.leanZ, targetLeanZ, 7.8, dt);

  const spineYawTotal = counterYaw + combatTwist;
  const spinePitchTotal =
    mem.leanX + input.aimPitch * (combatMode ? 0.36 : 0.18) + breath * 0.011;

  // Progressive athletic thoracic curve + phase-staggered spine wave
  const stepWavePitch = Math.sin((phase01 - 0.08) * Math.PI * 4) * 0.018 * walkAmt * (1 + sprint * 0.85);
  rig.spine.rotation.set(spinePitchTotal * 0.24, spineYawTotal * 0.32, mem.leanZ * 0.4);
  rig.spine1.rotation.set(spinePitchTotal * 0.34 + stepWavePitch * 0.5, spineYawTotal * 0.34, mem.leanZ * 0.34);
  rig.spine2.rotation.set(spinePitchTotal * 0.42 + stepWavePitch, spineYawTotal * 0.34, mem.leanZ * 0.26);

  // =========================================================================
  // HEAD HORIZON STABILIZATION + ANTICIPATORY TURN LEAD (VESTIBULO-OCULAR REFLEX)
  // =========================================================================
  const aimHeadTiltZ =
    input.ads && input.activeWeapon === 'smg'
      ? -0.14
      : input.ads
        ? -0.05
        : -mem.turnBankSmooth * 0.35;
  const headCounterYaw =
    -(combatTwist + patrolWeaponTwist + gaitPose.spineYaw * walkAmt * 0.78) * 0.86 +
    (combatMode ? 0 : mem.headLeadSmooth);
  // Counter-pitch ~78% of combined hip+spine forward lean so helmeted head stays dead level scanning ahead!
  const headPitch =
    input.aimPitch * (combatMode ? 0.56 : 0.38) -
    (spinePitchTotal + hipPitch * 0.5) * 0.78 +
    (input.heroTitlePose ? 0.03 : 0);
  rig.neck.rotation.set(headPitch * 0.42, headCounterYaw * 0.44, aimHeadTiltZ * 0.4);
  rig.head.rotation.set(headPitch * 0.58, headCounterYaw * 0.56, aimHeadTiltZ * 0.6);

  // =========================================================================
  // PHYSICAL SECONDARY MOTION: SLUNG BACK-SMG DAMPED SPRING WEIGHT BOUNCE!
  //   Directly visible from rear OTS camera — sells loaded soldier gear mass!
  // =========================================================================
  const pelvisDeltaY = baseHipY - (mem.prevPelvisY || baseHipY);
  mem.prevPelvisY = baseHipY;
  const impulse = THREE.MathUtils.clamp(-pelvisDeltaY / safeDt, -2.5, 2.5);
  const springK = 125;
  const springC = 11.5;
  const springAcc = -springK * mem.gearBounce - springC * mem.gearBounceVel + impulse * 2.8;
  mem.gearBounceVel += springAcc * safeDt;
  mem.gearBounce = THREE.MathUtils.clamp(mem.gearBounce + mem.gearBounceVel * safeDt, -0.085, 0.085);

  _bounceEuler.set(
    mem.gearBounce * 0.72,
    gaitPose.spineYaw * 0.16 * walkAmt,
    mem.gearBounce * 0.35
  );
  _bounceQuat.setFromEuler(_bounceEuler);
  rig.backSmgSocket.quaternion.copy(rig.backSmgBaseQuat).multiply(_bounceQuat);
  rig.backHeavySocket.quaternion.copy(rig.backHeavyBaseQuat).multiply(_bounceQuat);

  const strideSwing = Math.sin(locomotion.gaitPhase) * walkAmt;
  const locomotionSpeedBlend = THREE.MathUtils.clamp(
    walkAmt * (0.35 + mem.runBlend * 0.4 + sprint * 0.25),
    0,
    1
  );

  return {
    hipYaw: mem.hipYawSmooth,
    strideSwing,
    lagPhase01,
    moveMag,
    isStrafing,
    gaitPose,
    locomotionSpeedBlend,
  };
}
