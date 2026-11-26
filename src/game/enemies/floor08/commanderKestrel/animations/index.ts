import * as THREE from 'three';
import type { EnemyAnimationInput } from '../../../core/types';
import type { KestrelMeshRig } from '../mesh';

const damp = (cur: number, target: number, lambda: number, dt: number): number =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));

const _p1CoreColor = new THREE.Color(0xff4658);
const _p1CoreEmissive = new THREE.Color(0xe61c34);
const _p2CoreColor = new THREE.Color(0xffd248);
const _p2CoreEmissive = new THREE.Color(0xff9212);

/**
 * AAA Dual-Phase Procedural Boss Choreography for COMMANDER KESTREL-08:
 * Verified Right-Hand-Rule joint signs (local forward = -Z, up = +Y, right = +X):
 * - Thigh forward = hip.rotation.x > 0; knee bends backward = knee.rotation.x < 0.
 * - Torso lean forward = torso.rotation.x < 0; heroic flight arch = torso.rotation.x > 0.
 * - Arm pitch forward = shoulder.rotation.x > 0; elbow flex = elbow.rotation.x > 0.
 * - Sovereign-8 Carbine & Seraph-Edge Greatsword mounted at -PI/2 X inside elbows:
 *   torsoPitch + shX + elX ≈ +1.57 points straight forward (-Z)!
 *
 * Variants:
 * - 0: Overdrive Carbine Burst (agile jet-strafing fire stance)
 * - 1: Aero-Jet Thermal Blade Dash (coiled windup -> ferocious sweeping Seraph-Edge slash!)
 * - 2: Valkyrie Meteor Hover & Ground Slam (wings flared high aloft -> superhero-landing crater slam!)
 * - 3: Phase 2 Aero-Hover Wing-Fan Plasma Barrage (levitating archangel stance with flared wings!)
 */
export function updateKestrelAnimation(
  rig: KestrelMeshRig,
  input: EnemyAnimationInput,
  gaitPhase: { value: number }
): void {
  const { dt, elapsed, behavior, speedRatio, aimPitch, attackProgress, attackVariant, phase } =
    input;
  const {
    pelvis,
    torso,
    head,
    leftFrontTasset,
    rightFrontTasset,
    leftRearTasset,
    rightRearTasset,
    visorMat,
    chestCoreMat,
  } = rig.torsoParts;
  const { leftLeg, rightLeg, leftArm, rightArm } = rig.limbs;
  const { leftWing, rightWing } = rig.weakpoint;

  const isP2 = phase === 2;
  const airborne = input.airborneHeight ?? 0;

  // Phase 1 Crimson -> Phase 2 Solar-Gold Sternum Overdrive Reactor shift
  chestCoreMat.color.copy(isP2 ? _p2CoreColor : _p1CoreColor);
  chestCoreMat.emissive.copy(isP2 ? _p2CoreEmissive : _p1CoreEmissive);
  chestCoreMat.emissiveIntensity =
    (isP2 ? 3.4 : 2.3) + Math.sin(elapsed * (isP2 ? 18 : 8)) * 0.35;

  // 1. Boss Defeat Collapse
  if (behavior === 'dead') {
    const t = Math.min(1, input.deadProgress * 1.45);
    const e = t * t * (3 - 2 * t);
    pelvis.position.y = damp(pelvis.position.y, 1.12 - e * 0.88, 12, dt);
    pelvis.rotation.x = damp(pelvis.rotation.x, e * -1.38, 10, dt);
    pelvis.rotation.z = damp(pelvis.rotation.z, e * 0.24, 10, dt);
    torso.rotation.x = damp(torso.rotation.x, e * -0.18, 10, dt);
    torso.rotation.y = damp(torso.rotation.y, 0, 10, dt);
    leftWing.rotation.y = damp(leftWing.rotation.y, -0.25, 8, dt);
    rightWing.rotation.y = damp(rightWing.rotation.y, 0.25, 8, dt);
    visorMat.emissiveIntensity = damp(visorMat.emissiveIntensity, 0.1, 8, dt);
    rig.limbs.setWeaponPhaseAndBlade(phase, 0.08, elapsed);
    rig.weakpoint.setAeroState(phase, 0, 0, true, elapsed);
    return;
  }

  // 2. Thermal Vent Overload Stagger Kneel!
  if (behavior === 'staggered' || input.staggerTimer > 0) {
    const sway = Math.sin(elapsed * 9.5) * 0.07;
    pelvis.position.y = damp(pelvis.position.y, 0.78, 12, dt);
    pelvis.rotation.x = damp(pelvis.rotation.x, -0.12, 10, dt);
    pelvis.rotation.y = damp(pelvis.rotation.y, sway * 0.5, 10, dt);
    pelvis.rotation.z = damp(pelvis.rotation.z, sway, 10, dt);

    torso.rotation.x = damp(torso.rotation.x, -0.48, 10, dt);
    torso.rotation.y = damp(torso.rotation.y, sway * 1.4, 10, dt);
    torso.rotation.z = damp(torso.rotation.z, 0, 10, dt);
    head.rotation.x = damp(head.rotation.x, -0.32, 10, dt);
    head.rotation.y = damp(head.rotation.y, -sway * 1.6, 10, dt);

    // Verified RHR kneeling stance (+hip forward, -knee backward!)
    leftLeg.hip.rotation.x = damp(leftLeg.hip.rotation.x, 0.88, 12, dt);
    leftLeg.knee.rotation.x = damp(leftLeg.knee.rotation.x, -1.48, 12, dt);
    rightLeg.hip.rotation.x = damp(rightLeg.hip.rotation.x, 0.42, 12, dt);
    rightLeg.knee.rotation.x = damp(rightLeg.knee.rotation.x, -1.04, 12, dt);

    rightArm.shoulder.rotation.set(
      damp(rightArm.shoulder.rotation.x, 0.34, 10, dt),
      damp(rightArm.shoulder.rotation.y, -0.15, 10, dt),
      damp(rightArm.shoulder.rotation.z, -0.22, 10, dt)
    );
    rightArm.elbow.rotation.x = damp(rightArm.elbow.rotation.x, 0.55, 10, dt);

    leftArm.shoulder.rotation.set(
      damp(leftArm.shoulder.rotation.x, 0.46, 10, dt),
      damp(leftArm.shoulder.rotation.y, 0.25, 10, dt),
      damp(leftArm.shoulder.rotation.z, -0.25, 10, dt)
    );
    leftArm.elbow.rotation.x = damp(leftArm.elbow.rotation.x, 0.65, 10, dt);

    // Wings flared wide and shuddering, dorsal gold vents wide open & overloaded!
    leftWing.rotation.y = damp(leftWing.rotation.y, 0.65 + sway * 1.2, 10, dt);
    rightWing.rotation.y = damp(rightWing.rotation.y, -0.65 + sway * 1.2, 10, dt);
    leftWing.rotation.z = damp(leftWing.rotation.z, -0.18, 10, dt);
    rightWing.rotation.z = damp(rightWing.rotation.z, 0.18, 10, dt);

    visorMat.emissiveIntensity = 0.8 + Math.abs(Math.sin(elapsed * 24)) * 1.6;
    rig.limbs.setWeaponPhaseAndBlade(phase, 0.14, elapsed);
    rig.weakpoint.setAeroState(phase, 1.0, 0.08, input.weakpointBroken, elapsed);
    return;
  }

  // 3. Agile Aero-Vanguard Strafe & Glide Baseline
  const moveSpeed = Math.min(1, speedRatio);
  gaitPhase.value += dt * (2.8 + moveSpeed * 6.4);
  const ph = gaitPhase.value;
  const stride = Math.sin(ph) * moveSpeed;
  const bob = Math.abs(Math.sin(ph)) * 0.042 * moveSpeed;
  const breathe = Math.sin(elapsed * 2.8) * 0.014;

  let pelvisY = 1.12 + airborne - moveSpeed * 0.03 + bob + breathe;
  let pelvisPitch = -0.04 * moveSpeed;
  let pelvisYaw = -input.localMoveX * 0.18;
  let pelvisRoll = -input.localMoveX * 0.11;

  let torsoPitch = -0.06 - moveSpeed * 0.04;
  let torsoYaw = -0.18; // Slight combat-bladed stance leading with right Sovereign-8 carbine
  let torsoRoll = 0;
  let headPitch = aimPitch * 0.5 + 0.04;
  let headYaw = 0.16;

  // Legs: athletic commander stride (verified RHR: +hip forward, -knee backward!)
  let lHipX = stride * 0.56;
  let rHipX = -stride * 0.56;
  let lKneeX = -Math.max(0.06, -Math.cos(ph) * 0.68 * moveSpeed + 0.1);
  let rKneeX = -Math.max(0.06, Math.cos(ph) * 0.68 * moveSpeed + 0.1);

  // Right arm: aiming Sovereign-8 Carbine cleanly forward (-Z when torsoPitch + rShX + rElX ≈ +1.57)
  let rShX = 1.02 + aimPitch * 0.45;
  let rShY = 0.08;
  let rShZ = -0.06;
  let rElX = 0.62;

  // Left arm: poised combat guard with Seraph-Edge forearm blade ready at flank
  let lShX = 0.58;
  let lShY = -0.18;
  let lShZ = -0.22;
  let lElX = 0.72;

  let wingYaw = isP2 ? 0.46 : 0.18;
  let wingLift = isP2 ? 0.14 : 0.02;
  let bladeDeploy = isP2 ? 0.92 : 0.24;
  let ventOpen = input.weakpointExposed ? 1.0 : isP2 ? 0.24 : 0.0;
  let thrusterPower =
    airborne > 0.08
      ? 1.05
      : Math.max(input.boosterIntensity ?? 0, isP2 ? 0.48 : 0.18 + moveSpeed * 0.28);
  let visorGlow = isP2 ? 4.4 : 3.4;

  // 4. Expressive 4-Move Dual-Phase Boss Choreography
  if (attackVariant === 2 && (behavior === 'windup' || behavior === 'attack')) {
    // Move 2: Valkyrie Meteor Hover & Ground Slam!
    const p = THREE.MathUtils.clamp(attackProgress, 0, 1);
    if (behavior === 'windup') {
      // Hovering regally aloft with wings flared wide, both weapons raised for meteor drop!
      pelvisY = 1.12 + airborne + Math.sin(elapsed * 12) * 0.03;
      pelvisPitch = 0.12;
      torsoPitch = 0.18;
      torsoYaw = 0;
      headPitch = -0.28; // Glaring down at operative below!
      headYaw = 0;
      lHipX = 0.28;
      lKneeX = -0.58;
      rHipX = -0.22;
      rKneeX = -0.44;
      rShX = 2.08;
      rShY = 0.2;
      rShZ = 0.86;
      rElX = 0.22;
      lShX = 2.12;
      lShY = -0.2;
      lShZ = -0.86;
      lElX = 0.18;
      wingYaw = 0.78;
      wingLift = 0.36;
      bladeDeploy = 1.08;
      thrusterPower = 1.25;
      visorGlow = 5.6;
    } else {
      // Heroic superhero-landing crater slam!
      const slam = Math.min(1, p * 2.0);
      pelvisY = 0.78 + airborne;
      pelvisPitch = -0.18 * slam;
      torsoPitch = -0.46 * slam;
      torsoYaw = 0.18;
      headPitch = 0.26;
      lHipX = 0.94;
      lKneeX = -1.52;
      rHipX = 0.42;
      rKneeX = -0.96;
      // Left Seraph-Edge fist/blade slams into floor while right carbine braces wide!
      lShX = 1.12;
      lShY = 0.32;
      lShZ = 0.24;
      lElX = 0.24;
      rShX = 0.22;
      rShY = -0.34;
      rShZ = -0.46;
      rElX = 0.62;
      wingYaw = 0.82;
      wingLift = 0.22;
      bladeDeploy = 1.06;
      ventOpen = slam * 0.85;
      thrusterPower = Math.max(0.2, 1.1 - slam * 0.8);
      visorGlow = 5.8;
    }
  } else if (attackVariant === 3 && (behavior === 'windup' || behavior === 'attack')) {
    // Move 3 (Phase 2): Aero-Hover Wing-Fan Plasma Barrage!
    const p = THREE.MathUtils.clamp(attackProgress, 0, 1);
    const sweep = behavior === 'attack' ? -0.48 + p * 0.96 : -0.48 * p;
    pelvisY = 1.12 + airborne + Math.sin(elapsed * 10) * 0.04;
    pelvisPitch = 0.08;
    torsoPitch = 0.1;
    torsoYaw = sweep;
    headYaw = -sweep * 0.5;
    headPitch = -0.18;
    lHipX = 0.18;
    lKneeX = -0.48;
    rHipX = -0.16;
    rKneeX = -0.36;
    rShX = 1.12 + aimPitch * 0.35;
    rShY = 0.06;
    rShZ = -0.12;
    rElX = 0.44;
    lShX = 0.95;
    lShY = -0.36;
    lShZ = -0.48;
    lElX = 0.28;
    wingYaw = 0.78;
    wingLift = 0.32;
    bladeDeploy = 1.02;
    thrusterPower = 1.18;
    visorGlow = 5.2;
  } else if (attackVariant === 1 && (behavior === 'windup' || behavior === 'attack')) {
    // Move 1: Aero-Jet Thermal Blade Dash!
    const p = THREE.MathUtils.clamp(attackProgress, 0, 1);
    if (behavior === 'windup') {
      // Low aerodynamic coil drawing left Seraph-Edge blade far back across left flank!
      pelvisY = 0.98;
      pelvisPitch = -0.16;
      torsoPitch = -0.24;
      torsoYaw = 0.72 * p;
      headYaw = -0.62 * p;
      lHipX = 0.46;
      lKneeX = -0.82;
      rHipX = -0.34;
      rKneeX = -0.58;
      lShX = 0.65;
      lShY = -0.85 * p;
      lShZ = -0.78 * p;
      lElX = 0.22;
      rShX = 0.45;
      rShY = -0.22;
      rShZ = -0.32;
      rElX = 0.85;
      wingYaw = 0.58;
      wingLift = 0.18;
      bladeDeploy = 0.45 + p * 0.65;
      thrusterPower = 0.7 + p * 0.6;
      visorGlow = 5.4;
    } else {
      // Explosive forward cleaving slash sweeping Seraph-Edge wide from left to right!
      const slash = Math.sin(p * Math.PI);
      pelvisY = 0.96;
      pelvisPitch = -0.2;
      torsoPitch = -0.26;
      torsoYaw = 0.72 - p * 1.56;
      headYaw = -(0.72 - p * 1.56) * 0.55;
      lHipX = 0.54;
      lKneeX = -0.86;
      rHipX = -0.42;
      rKneeX = -0.52;
      lShX = 1.38 + slash * 0.24;
      lShY = -0.55 + p * 1.38;
      lShZ = -0.45 + p * 0.88;
      lElX = 0.16;
      rShX = 0.35;
      rShY = -0.3;
      rShZ = -0.38;
      rElX = 0.75;
      wingYaw = 0.68;
      wingLift = 0.12;
      bladeDeploy = 1.08;
      thrusterPower = 1.3;
      visorGlow = 5.6;
    }
  } else if (behavior === 'attack' && attackVariant === 0) {
    // Move 0: Sovereign-8 Overdrive Carbine Burst!
    const recoil = Math.abs(Math.sin(elapsed * 32)) * 0.08;
    torsoPitch = -0.06 + recoil * 0.6;
    torsoYaw = -0.22;
    headYaw = 0.2;
    rShX = 1.06 + aimPitch * 0.45 + recoil * 1.25;
    rShY = 0.08;
    rShZ = -0.06;
    rElX = 0.58 + recoil * 0.45;
    lShX = 0.62;
    lShY = -0.24;
    lShZ = -0.28;
    lElX = 0.68;
    wingYaw = isP2 ? 0.54 : 0.28;
    thrusterPower = isP2 ? 0.68 : 0.38;
    visorGlow = isP2 ? 4.8 : 4.0;
  } else if (behavior === 'recover') {
    // Post-dash / Post-slam Thermal Vent Cooling Window — hunches forward pitching blazing gold dorsal vents high!
    const ventPulse = Math.sin(elapsed * 7.5) * 0.03;
    pelvisY = 0.96 + ventPulse * 0.4;
    pelvisPitch = -0.1;
    torsoPitch = -0.34 + ventPulse;
    torsoYaw = Math.sin(elapsed * 2.2) * 0.06;
    headPitch = 0.22;
    headYaw = 0;
    lHipX = 0.32;
    lKneeX = -0.62;
    rHipX = -0.18;
    rKneeX = -0.44;
    rShX = 0.48;
    rShY = -0.12;
    rShZ = -0.22;
    rElX = 0.66;
    lShX = 0.48;
    lShY = 0.12;
    lShZ = 0.22;
    lElX = 0.64;
    wingYaw = 0.72;
    wingLift = 0.24;
    bladeDeploy = 0.28;
    ventOpen = 1.0;
    thrusterPower = 0.16;
    visorGlow = 3.2;
  }

  // 5. Additive ballistic hit flinch
  if (input.flinchTimer > 0) {
    const f = Math.min(1, input.flinchTimer / 0.16);
    torsoPitch += f * 0.12;
    torsoRoll += f * input.flinchDirX * 0.16;
  }

  // Smooth exponential damping
  const spd = behavior === 'attack' ? 18 : 11;
  pelvis.position.y = damp(pelvis.position.y, pelvisY, spd, dt);
  pelvis.rotation.x = damp(pelvis.rotation.x, pelvisPitch, spd, dt);
  pelvis.rotation.y = damp(pelvis.rotation.y, pelvisYaw, spd, dt);
  pelvis.rotation.z = damp(pelvis.rotation.z, pelvisRoll, spd, dt);

  torso.rotation.x = damp(torso.rotation.x, torsoPitch, spd, dt);
  torso.rotation.y = damp(torso.rotation.y, torsoYaw, spd, dt);
  torso.rotation.z = damp(torso.rotation.z, torsoRoll, spd, dt);

  head.rotation.x = damp(head.rotation.x, headPitch, spd, dt);
  head.rotation.y = damp(head.rotation.y, headYaw, spd, dt);

  leftLeg.hip.rotation.x = damp(leftLeg.hip.rotation.x, lHipX, spd, dt);
  leftLeg.knee.rotation.x = damp(leftLeg.knee.rotation.x, lKneeX, spd, dt);
  rightLeg.hip.rotation.x = damp(rightLeg.hip.rotation.x, rHipX, spd, dt);
  rightLeg.knee.rotation.x = damp(rightLeg.knee.rotation.x, rKneeX, spd, dt);

  rightArm.shoulder.rotation.set(
    damp(rightArm.shoulder.rotation.x, rShX, spd, dt),
    damp(rightArm.shoulder.rotation.y, rShY, spd, dt),
    damp(rightArm.shoulder.rotation.z, rShZ, spd, dt)
  );
  rightArm.elbow.rotation.x = damp(rightArm.elbow.rotation.x, rElX, spd, dt);

  leftArm.shoulder.rotation.set(
    damp(leftArm.shoulder.rotation.x, lShX, spd, dt),
    damp(leftArm.shoulder.rotation.y, lShY, spd, dt),
    damp(leftArm.shoulder.rotation.z, lShZ, spd, dt)
  );
  leftArm.elbow.rotation.x = damp(leftArm.elbow.rotation.x, lElX, spd, dt);

  // Articulated 3-feather aero-wings flare & lift dynamically!
  leftWing.rotation.y = damp(leftWing.rotation.y, wingYaw, 10, dt);
  rightWing.rotation.y = damp(rightWing.rotation.y, -wingYaw, 10, dt);
  leftWing.rotation.z = damp(leftWing.rotation.z, -wingLift, 10, dt);
  rightWing.rotation.z = damp(rightWing.rotation.z, wingLift, 10, dt);

  // Dynamic 4-panel command coat-tail billowing with leg swing & flight airflow!
  const airBillow = Math.min(0.45, airborne * 0.2 + moveSpeed * 0.16);
  leftFrontTasset.rotation.z = damp(leftFrontTasset.rotation.z, 0.15 + airBillow * 0.5, 10, dt);
  rightFrontTasset.rotation.z = damp(rightFrontTasset.rotation.z, -0.15 - airBillow * 0.5, 10, dt);
  leftFrontTasset.rotation.x = damp(
    leftFrontTasset.rotation.x,
    -0.04 + Math.max(0, lHipX) * 0.45,
    12,
    dt
  );
  rightFrontTasset.rotation.x = damp(
    rightFrontTasset.rotation.x,
    -0.04 + Math.max(0, rHipX) * 0.45,
    12,
    dt
  );
  leftRearTasset.rotation.x = damp(leftRearTasset.rotation.x, 0.14 + airBillow * 0.75, 10, dt);
  rightRearTasset.rotation.x = damp(rightRearTasset.rotation.x, 0.14 + airBillow * 0.75, 10, dt);

  visorMat.emissiveIntensity = damp(visorMat.emissiveIntensity, visorGlow, 10, dt);
  rig.limbs.setWeaponPhaseAndBlade(phase, bladeDeploy, elapsed);
  rig.weakpoint.setAeroState(phase, ventOpen, thrusterPower, input.weakpointBroken, elapsed);
}
