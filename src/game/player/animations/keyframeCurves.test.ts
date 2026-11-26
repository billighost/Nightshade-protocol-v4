import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMixamoSkeleton } from '../skeleton/mixamoBones';
import { solveTwoBoneArmIK } from '../skeleton/ikSolver';
import { sampleGroundRollHipY } from './airAndDodge';
import {
  RUN_GAIT,
  SPRINT_GAIT,
  WALK_GAIT,
  sampleGaitProfile,
  samplePeriodicCurve,
  sampleStrafeLeg,
} from './keyframeCurves';

const RAD_TO_DEG = 180 / Math.PI;

test('samplePeriodicCurve wraps smoothly across t=0 and t=1 with zero discontinuity', () => {
  const vStart = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 0.0);
  const vEnd = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 1.0);
  const vJustBefore = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 0.999);
  const vJustAfter = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 0.001);

  assert.ok(Math.abs(vStart - vEnd) < 1e-6);
  assert.ok(Math.abs(vJustBefore - vStart) < 0.02);
  assert.ok(Math.abs(vJustAfter - vStart) < 0.02);
});

test('RUN_GAIT reproduces Novacheck double-peak knee flexion (loading cushion + high swing heel-kick) and never hyperextends', () => {
  const contact = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 0.0) * RAD_TO_DEG;
  const loadingPeak = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 0.14) * RAD_TO_DEG;
  const toeOffExtend = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 0.34) * RAD_TO_DEG;
  const swingPeak = samplePeriodicCurve(RUN_GAIT.leg.kneeX, 0.56) * RAD_TO_DEG;

  // Loading peak must bend deeper than both initial contact and toe-off extension!
  assert.ok(loadingPeak < contact - 15, `Expected loading knee flexion deeper than contact (${loadingPeak} vs ${contact})`);
  assert.ok(loadingPeak < toeOffExtend - 20, `Expected toe-off extension straighter than loading (${toeOffExtend} vs ${loadingPeak})`);
  // Swing heel-kick peak must fold deeply behind glute (< -100°)
  assert.ok(swingPeak < -100, `Expected high running swing knee bend < -100 deg, got ${swingPeak}`);

  // Verify ZERO anatomical knee hyperextension (> 0) anywhere in full 0..1 cycle
  for (let i = 0; i <= 100; i++) {
    const kRun = samplePeriodicCurve(RUN_GAIT.leg.kneeX, i / 100);
    const kWalk = samplePeriodicCurve(WALK_GAIT.leg.kneeX, i / 100);
    const kSprint = samplePeriodicCurve(SPRINT_GAIT.leg.kneeX, i / 100);
    assert.ok(kRun <= 0.001, `RUN knee hyperextended at ${i}%: ${kRun}`);
    assert.ok(kWalk <= 0.001, `WALK knee hyperextended at ${i}%: ${kWalk}`);
    assert.ok(kSprint <= 0.001, `SPRINT knee hyperextended at ${i}%: ${kSprint}`);
  }
});

test('RUN_GAIT & SPRINT_GAIT drive elbows, forearm pronation/supination, and wrist follow-through in a 3D oblique arc', () => {
  let minElbow = Infinity;
  let maxElbow = -Infinity;
  let minPron = Infinity;
  let maxPron = -Infinity;

  for (let i = 0; i < 40; i++) {
    const pose = sampleGaitProfile(RUN_GAIT, i / 40);
    const lElbowDeg = pose.leftArm.elbowX * RAD_TO_DEG;
    const rElbowDeg = pose.rightArm.elbowX * RAD_TO_DEG;
    const lPronDeg = pose.leftArm.foreArmPronationY * RAD_TO_DEG;
    assert.ok(lElbowDeg >= 70 && lElbowDeg <= 112, `Run left elbow out of athletic range: ${lElbowDeg}`);
    assert.ok(rElbowDeg >= 70 && rElbowDeg <= 112, `Run right elbow out of athletic range: ${rElbowDeg}`);
    assert.ok(lPronDeg >= 50 && lPronDeg <= 90, `Forearm handshake pronation out of range: ${lPronDeg}`);
    if (lElbowDeg < minElbow) minElbow = lElbowDeg;
    if (lElbowDeg > maxElbow) maxElbow = lElbowDeg;
    if (lPronDeg < minPron) minPron = lPronDeg;
    if (lPronDeg > maxPron) maxPron = lPronDeg;
  }

  assert.ok(maxElbow - minElbow >= 28, `Elbow must flex/open dynamically across swing (${minElbow.toFixed(1)}..${maxElbow.toFixed(1)})`);
  assert.ok(maxPron - minPron >= 22, `Forearm must pronate/supinate naturally across swing (${minPron.toFixed(1)}..${maxPron.toFixed(1)})`);

  // At t=0 (left leg front contact), right arm drives forward & INWARD across chest (+adduction > 15°)
  const t0 = sampleGaitProfile(RUN_GAIT, 0.0);
  assert.ok(t0.rightArm.shoulderX * RAD_TO_DEG > 32, 'Right arm must drive forward contralateral to left leg');
  assert.ok(t0.rightArm.shoulderAdductZ * RAD_TO_DEG > 15, 'Forward running arm must adduct obliquely inward');
  assert.ok(t0.leftArm.shoulderX * RAD_TO_DEG < -28, 'Left arm must drive backward opposite to right arm');
  assert.ok(t0.leftArm.shoulderAdductZ * RAD_TO_DEG < -5, 'Rear running arm must clear slightly outward past hip');
  // Wrist follow-through must oscillate smoothly (non-zero inertia lag!)
  const tMid = sampleGaitProfile(RUN_GAIT, 0.22);
  const tBack = sampleGaitProfile(RUN_GAIT, 0.74);
  assert.ok(tMid.rightArm.wristFlexX > 0.1 && tBack.rightArm.wristFlexX < -0.1, 'Wrist must show elastic follow-through across swing');
});

test('Walking vs Running pelvis COM vertical phase is biomechanically inverted (pendulum vs spring-mass)', () => {
  // Tactical soldier combat-glide drops into Down shock absorption at t=0.14
  // and rises cleanly through Passing (t=0.30) to High-Point (t=0.43)
  const walkDown = samplePeriodicCurve(WALK_GAIT.pelvisY, 0.14);
  const walkPassing = samplePeriodicCurve(WALK_GAIT.pelvisY, 0.30);
  const walkHighPoint = samplePeriodicCurve(WALK_GAIT.pelvisY, 0.43);
  assert.ok(walkPassing > walkDown + 0.04, 'Walk pelvis should rise smoothly from Down trough to Passing midstance');
  assert.ok(walkHighPoint > walkDown + 0.045, 'Walk pelvis should reach High-Point crest cleanly above Down trough');

  const runLoading = samplePeriodicCurve(RUN_GAIT.pelvisY, 0.15);
  const runFlight = samplePeriodicCurve(RUN_GAIT.pelvisY, 0.43);
  assert.ok(runFlight > runLoading + 0.07, 'Run pelvis should trough at loading and peak in flight');
});

test('sampleStrafeLeg produces asymmetric lateral abduction and cross-step knee lift', () => {
  const leadPlant = sampleStrafeLeg(0.0, -1, -1); // Left leg planting during left strafe
  const trailCross = sampleStrafeLeg(0.24, 1, -1); // Right leg mid-crossing during left strafe
  assert.ok(leadPlant.hipZ < -0.3, 'Lead leg must abduct strongly in left-strafe direction');
  assert.ok(trailCross.kneeX < -0.7, 'Trailing leg must lift knee cleanly during cross-step');
});

test('Tactical soldier WALK_GAIT exhibits soft-knee combat-glide shock absorption, lateral weight shift, and stabilized pelvisRoll', () => {
  let maxRollDeg = 0;
  let minElbowDeg = Infinity;
  let maxElbowDeg = -Infinity;
  let maxWristDeg = 0;
  let minPelvisX = Infinity;
  let maxPelvisX = -Infinity;

  for (let i = 0; i < 40; i++) {
    const pose = sampleGaitProfile(WALK_GAIT, i / 40);
    maxRollDeg = Math.max(maxRollDeg, Math.abs(pose.pelvisRoll * RAD_TO_DEG));
    minPelvisX = Math.min(minPelvisX, pose.pelvisX);
    maxPelvisX = Math.max(maxPelvisX, pose.pelvisX);
    const elbowDeg = pose.leftArm.elbowX * RAD_TO_DEG;
    const pronDeg = pose.leftArm.foreArmPronationY * RAD_TO_DEG;
    const wristDeg = Math.abs(pose.leftArm.wristFlexX * RAD_TO_DEG);
    minElbowDeg = Math.min(minElbowDeg, elbowDeg);
    maxElbowDeg = Math.max(maxElbowDeg, elbowDeg);
    maxWristDeg = Math.max(maxWristDeg, wristDeg);

    assert.ok(
      pronDeg >= 72 && pronDeg <= 88,
      `Walking forearm must remain steady palm-inward (72..88 deg), got ${pronDeg.toFixed(1)}`
    );
  }

  // Tactical soldier combat-glide checks:
  const downKneeDeg = samplePeriodicCurve(WALK_GAIT.leg.kneeX, 0.14) * RAD_TO_DEG;
  const contactKneeDeg = samplePeriodicCurve(WALK_GAIT.leg.kneeX, 0.0) * RAD_TO_DEG;
  assert.ok(contactKneeDeg <= -10, `Soldier walk must strike with soft athletic knee (<= -10 deg), got ${contactKneeDeg.toFixed(1)}`);
  assert.ok(downKneeDeg <= -26, `Soldier walk must absorb armor weight deeply at Down phase (<= -26 deg), got ${downKneeDeg.toFixed(1)}`);
  assert.ok(maxPelvisX - minPelvisX >= 0.036, `Soldier walk must transfer COM laterally over stance boot (>= 3.6cm), got ${(maxPelvisX - minPelvisX).toFixed(3)}m`);
  assert.ok(maxRollDeg <= 2.2, `Walking pelvisRoll must stay stabilized (<=2.2 deg), got ${maxRollDeg.toFixed(2)}`);
  assert.ok(minElbowDeg >= 8 && maxElbowDeg <= 29, `Walking elbow must stay natural (8..29 deg), got ${minElbowDeg.toFixed(1)}..${maxElbowDeg.toFixed(1)}`);
  assert.ok(maxWristDeg <= 5.5, `Walking wrist follow-through must stay restrained (<=5.5 deg), got ${maxWristDeg.toFixed(1)}`);
  assert.ok(SPRINT_GAIT.trunkLeanX * RAD_TO_DEG <= -22, 'Tactical sprint must have aggressive forward soldier lean (<= -22 deg)');
});

test('Low forward dive-leap into ground-contact dodge roll executes all 4 acts smoothly with monotonic spin', () => {
  const start = sampleGroundRollHipY(0.0);
  const leap = sampleGroundRollHipY(0.14);
  const contact = sampleGroundRollHipY(0.28);
  const backRoll = sampleGroundRollHipY(0.45);
  const hipRoll = sampleGroundRollHipY(0.7);
  const end = sampleGroundRollHipY(1.0);

  assert.ok(start.hipY >= 0.94, `Roll must start from standing height, got ${start.hipY.toFixed(2)}m`);
  // Act 1: Low forward leap (pelvis stays LOW <= 0.78m, pitched ~58..76 deg horizontally, leapWeight active!)
  assert.ok(
    leap.hipY >= 0.65 && leap.hipY <= 0.79,
    `Low forward leap pelvis must skim low (0.65..0.79m), got ${leap.hipY.toFixed(2)}m`
  );
  assert.ok(
    leap.spinAngle >= 0.95 && leap.spinAngle <= 1.38,
    `Low forward leap pitch must lean horizontally (55..79 deg), got ${(leap.spinAngle * RAD_TO_DEG).toFixed(1)} deg`
  );
  assert.ok(leap.leapWeight >= 0.75, `Leap envelope must peak during Act 1, got ${leap.leapWeight.toFixed(2)}`);

  // Act 2: Ground contact drop onto concrete floor (0.505m keeps helmet clear while forearm/shoulder contact concrete)
  assert.ok(contact.hipY <= 0.54, `Ground contact must drop onto concrete (<= 0.54m), got ${contact.hipY.toFixed(2)}m`);

  // Act 3: Flush upper-back roll + concrete-hugging opposite-hip roll
  assert.ok(
    backRoll.hipY <= 0.5 && backRoll.hipY >= 0.43,
    `Back-roll pelvis must place armored back flush on floor without clipping helmet (0.43..0.50m), got ${backRoll.hipY.toFixed(2)}m`
  );
  assert.ok(
    hipRoll.hipY <= 0.34 && hipRoll.hipY >= 0.25,
    `Hip-roll pelvis must hug concrete floor (0.25..0.34m), got ${hipRoll.hipY.toFixed(2)}m`
  );

  // Act 4: Full recovery back to standing height & 360 deg
  assert.ok(end.hipY >= 0.94, `Roll must recover cleanly to standing height, got ${end.hipY.toFixed(2)}m`);
  assert.ok(Math.abs(end.spinAngle - Math.PI * 2) < 1e-4, 'Spin angle must complete exact 360 deg');

  // Monotonic spinAngle check (zero backward stutter across entire 0..1 curve)
  let prevSpin = -1;
  for (let i = 0; i <= 100; i++) {
    const s = sampleGroundRollHipY(i / 100).spinAngle;
    assert.ok(s >= prevSpin - 1e-6, `spinAngle regressed at t=${(i / 100).toFixed(2)}: ${s} < ${prevSpin}`);
    prevSpin = s;
  }
});

test('Two-handed Pistol Walk 2-Bone Arm IK keeps BOTH elbows bent outside ribs and BOTH hands clasped cleanly on the grip', () => {
  const root = new THREE.Group();
  const rig = createMixamoSkeleton(root);

  // Two-handed tactical compressed-ready pistol walk targets & outward poles in Spine2 space
  const rTarget = new THREE.Vector3(0.016, -0.042, -0.382);
  const lTarget = new THREE.Vector3(0.016 - 0.044, -0.042 - 0.008, -0.382 - 0.016);
  const rPole = new THREE.Vector3(0.95, -0.02, 0.08);
  const lPole = new THREE.Vector3(-0.95, -0.02, 0.08);

  solveTwoBoneArmIK(
    rig.rightShoulder,
    rig.rightArm,
    rig.rightForeArm,
    rig.upperArmLen,
    rig.foreArmLen,
    rTarget,
    rPole,
    1.0
  );
  solveTwoBoneArmIK(
    rig.leftShoulder,
    rig.leftArm,
    rig.leftForeArm,
    rig.upperArmLen,
    rig.foreArmLen,
    lTarget,
    lPole,
    1.0
  );

  root.updateMatrixWorld(true);
  const rElbowWorld = new THREE.Vector3();
  const lElbowWorld = new THREE.Vector3();
  const rWristWorld = new THREE.Vector3();
  const lWristWorld = new THREE.Vector3();
  rig.rightForeArm.getWorldPosition(rElbowWorld);
  rig.leftForeArm.getWorldPosition(lElbowWorld);
  rig.rightHand.getWorldPosition(rWristWorld);
  rig.leftHand.getWorldPosition(lWristWorld);

  const rElbowDeg = 2 * Math.acos(Math.min(1, Math.abs(rig.rightForeArm.quaternion.w))) * RAD_TO_DEG;
  const lElbowDeg = 2 * Math.acos(Math.min(1, Math.abs(rig.leftForeArm.quaternion.w))) * RAD_TO_DEG;
  const wristDist = rWristWorld.distanceTo(lWristWorld);

  assert.ok(rElbowDeg >= 50 && rElbowDeg <= 105, `Right pistol walk elbow must bend naturally (50..105 deg), got ${rElbowDeg.toFixed(1)} deg`);
  assert.ok(lElbowDeg >= 50 && lElbowDeg <= 105, `Left pistol walk elbow must bend naturally (50..105 deg), got ${lElbowDeg.toFixed(1)} deg`);
  assert.ok(rElbowWorld.x >= 0.23, `Right elbow must stay clearly outside right ribcage (x >= 0.23m), got ${rElbowWorld.x.toFixed(3)}m`);
  assert.ok(lElbowWorld.x <= -0.23, `Left elbow must stay clearly outside left ribcage (x <= -0.23m), got ${lElbowWorld.x.toFixed(3)}m`);
  assert.ok(rWristWorld.z <= -0.34 && lWristWorld.z <= -0.34, `Both wrists must stay well in front of torso (z <= -0.34m), got R=${rWristWorld.z.toFixed(3)}m L=${lWristWorld.z.toFixed(3)}m`);
  assert.ok(wristDist >= 0.035 && wristDist <= 0.075, `Left & right wrists must clasp pistol grip cleanly without collapsing or detaching (0.035..0.075m), got ${wristDist.toFixed(3)}m`);
});

