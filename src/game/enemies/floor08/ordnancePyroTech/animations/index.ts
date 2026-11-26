import * as THREE from 'three';
import type { EnemyAnimationInput } from '../../../core/types';
import type { PyroMeshRig } from '../mesh';

const damp = (cur: number, target: number, lambda: number, dt: number): number =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));

/**
 * AAA Procedural Heavy-Ordnance Choreography for FORGE-08 "PYRO-TECH":
 * Verified Right-Hand-Rule joint signs (local forward = -Z, up = +Y, right = +X):
 * - Thigh forward = hip.rotation.x > 0; knee flex backward = knee.rotation.x < 0.
 * - Vulcan-8 Cannon mounted in rightArm.elbow at -PI/2 X:
 *   when torsoPitch + rShX + rElX ≈ +1.57, cannon points dead-level forward (-Z).
 *   When sum ≈ +2.15, barrel elevates +33° skyward for high-arc 40mm mortar lobs!
 *
 * Variants:
 * - 0: High-Arc Incendiary Mortar Salvo (wide braced stance + skyward barrel elevation + recoil kick)
 * - 1: 5-Bolt Thermite Fan Sweep (aggressive level hip-fire sweep + revolving drum spin)
 * - 2: Close-Range Napalm Shockwave Slam (furnace vent surge -> crouching molten slam)
 * - 3: Post-Slam Thermal Vent Cooldown (hunched forward pitching back fuel tank high!)
 */
export function updatePyroAnimation(
  rig: PyroMeshRig,
  input: EnemyAnimationInput,
  gaitPhase: { value: number }
): void {
  const { dt, elapsed, behavior, speedRatio, aimPitch, attackProgress, attackVariant } = input;
  const { pelvis, torso, head, visorMat } = rig.torsoParts;
  const { leftLeg, rightLeg, leftArm, rightArm, drumCyl } = rig.limbs;

  // 1. Dead collapse
  if (behavior === 'dead') {
    const t = Math.min(1, input.deadProgress * 1.45);
    const e = t * t * (3 - 2 * t);
    pelvis.position.y = damp(pelvis.position.y, 1.04 - e * 0.78, 12, dt);
    pelvis.rotation.x = damp(pelvis.rotation.x, e * -1.32, 10, dt);
    pelvis.rotation.z = damp(pelvis.rotation.z, e * 0.24, 10, dt);
    torso.rotation.x = damp(torso.rotation.x, e * -0.18, 10, dt);
    torso.rotation.y = damp(torso.rotation.y, 0, 10, dt);
    rightArm.shoulder.rotation.x = damp(rightArm.shoulder.rotation.x, 0.25, 8, dt);
    leftArm.shoulder.rotation.x = damp(leftArm.shoulder.rotation.x, 0.2, 8, dt);
    visorMat.emissiveIntensity = damp(visorMat.emissiveIntensity, 0.12, 8, dt);
    rig.limbs.setPilotAndBarrelHeat(0, elapsed);
    rig.weakpoint.setTankState(0, true, elapsed);
    return;
  }

  // 2. Fuel-Tank Rupture Staggered Kneel!
  if (behavior === 'staggered') {
    const sway = Math.sin(elapsed * 8.5) * 0.08;
    pelvis.position.y = damp(pelvis.position.y, 0.78, 10, dt);
    pelvis.rotation.x = damp(pelvis.rotation.x, -0.06, 10, dt);
    pelvis.rotation.y = damp(pelvis.rotation.y, sway * 0.5, 10, dt);
    pelvis.rotation.z = damp(pelvis.rotation.z, sway, 10, dt);

    torso.rotation.x = damp(torso.rotation.x, -0.44, 10, dt);
    torso.rotation.y = damp(torso.rotation.y, sway * 1.4, 10, dt);
    torso.rotation.z = damp(torso.rotation.z, 0, 10, dt);
    head.rotation.x = damp(head.rotation.x, -0.26, 10, dt);
    head.rotation.y = damp(head.rotation.y, -sway * 1.8, 10, dt);

    // Wide heavy stagger crouch
    leftLeg.hip.rotation.x = damp(leftLeg.hip.rotation.x, 0.62, 10, dt);
    leftLeg.knee.rotation.x = damp(leftLeg.knee.rotation.x, -1.16, 10, dt);
    rightLeg.hip.rotation.x = damp(rightLeg.hip.rotation.x, 0.44, 10, dt);
    rightLeg.knee.rotation.x = damp(rightLeg.knee.rotation.x, -0.92, 10, dt);

    // Heavy cannon droops down while left hand clutches chest harness
    rightArm.shoulder.rotation.set(
      damp(rightArm.shoulder.rotation.x, 0.35, 10, dt),
      damp(rightArm.shoulder.rotation.y, -0.1, 10, dt),
      damp(rightArm.shoulder.rotation.z, -0.22, 10, dt)
    );
    rightArm.elbow.rotation.x = damp(rightArm.elbow.rotation.x, 0.55, 10, dt);
    leftArm.shoulder.rotation.set(
      damp(leftArm.shoulder.rotation.x, 0.68, 10, dt),
      damp(leftArm.shoulder.rotation.y, 0.48, 10, dt),
      damp(leftArm.shoulder.rotation.z, 0.25, 10, dt)
    );
    leftArm.elbow.rotation.x = damp(leftArm.elbow.rotation.x, 1.05, 10, dt);

    visorMat.emissiveIntensity = 0.75 + Math.abs(Math.sin(elapsed * 22)) * 1.3;
    rig.limbs.setPilotAndBarrelHeat(0.15, elapsed);
    rig.weakpoint.setTankState(0, true, elapsed);
    return;
  }

  // 3. Weighty EOD Stomp Locomotion & Heavy Breathing Baseline
  const moveSpeed = Math.min(1, speedRatio);
  gaitPhase.value += dt * (2.6 + moveSpeed * 4.4);
  const ph = gaitPhase.value;
  const stride = Math.sin(ph) * moveSpeed;
  const bounce = Math.abs(Math.sin(ph)) * 0.036 * moveSpeed;
  const breathe = Math.sin(elapsed * 2.4) * 0.014;

  let pelvisY = 1.04 - bounce * 0.5 + breathe;
  let pelvisPitch = 0;
  let pelvisYaw = 0;
  let pelvisRoll = Math.cos(ph) * 0.042 * moveSpeed;

  let torsoPitch = -0.08 - moveSpeed * 0.05;
  let torsoYaw = -0.14; // Slight natural right-handed heavy cannon combat turn
  let torsoRoll = 0;
  let headPitch = aimPitch * 0.55 + 0.06;
  let headYaw = 0.12;

  // Legs: weighty stomp gait (verified RHR: forward swing = +X, knee flex = -X)
  let lHipX = stride * 0.42;
  let rHipX = -stride * 0.42;
  let lKneeX = -Math.max(0, -Math.cos(ph) * moveSpeed) * 0.58 - 0.14;
  let rKneeX = -Math.max(0, Math.cos(ph) * moveSpeed) * 0.58 - 0.14;

  // Arms: Two-handed heavy Vulcan-8 cannon grip!
  // Right arm carries pistol grip; total pitch torsoPitch + rShX + rElX ≈ +1.57 -> level forward -Z!
  let rShX = 0.56 + aimPitch * 0.42;
  let rShY = 0.28; // Inward angle bringing heavy cannon toward torso centerline
  let rShZ = -0.06;
  let rElX = 1.06;

  // Left arm swings INWARD across chest (+Z adduction, +Y forward-reach!) to lock onto Vulcan-8 side foregrip!
  let lShX = 0.68 + aimPitch * 0.38;
  let lShY = 0.22;
  let lShZ = 0.6;
  let lElX = 0.62;

  let barrelHeat = 0.25 + (input.boosterIntensity ?? 0) * 0.35;
  let tankOverdrive = 0.15 + (input.boosterIntensity ?? 0) * 0.65;
  let visorGlow = 3.2;

  // 4. Expressive 4-Move Zone Mini-Boss Combat Choreography
  if (behavior === 'windup') {
    const w = THREE.MathUtils.clamp(attackProgress, 0, 1);
    if (attackVariant === 0) {
      // Move 0: High-Arc Incendiary Mortar Salvo — brace wide & elevate cannon +33° skyward!
      pelvisY = 0.96;
      torsoPitch = 0.16 * w;
      torsoYaw = -0.18;
      headPitch = 0.2 * w;
      lHipX = 0.28;
      lKneeX = -0.52;
      rHipX = -0.22;
      rKneeX = -0.44;
      rShX = 0.56 + w * 0.48;
      rShY = 0.28;
      rElX = 1.04 - w * 0.1; // total ≈ +2.14 -> +33° upward lob!
      lShX = 0.68 + w * 0.48;
      lShY = 0.24;
      lShZ = 0.62;
      lElX = 0.62 - w * 0.08;
      barrelHeat = 0.55 + w * 0.7;
      tankOverdrive = 0.45 + w * 0.65;
      visorGlow = 4.2 + w * 1.4;
      drumCyl.rotation.z += dt * (2.5 + w * 6.0);
    } else if (attackVariant === 1) {
      // Move 1: 5-Bolt Thermite Fan Sweep — crouch & pre-spin drum!
      pelvisY = 0.97;
      torsoPitch = -0.12;
      torsoYaw = -0.34 * w;
      rShX = 0.58;
      rShY = 0.28;
      rElX = 1.06;
      lShX = 0.7;
      lShY = 0.22;
      lShZ = 0.6;
      lElX = 0.62;
      barrelHeat = 0.7 + w * 0.6;
      tankOverdrive = 0.4 + w * 0.5;
      visorGlow = 4.4;
      drumCyl.rotation.z += dt * (4.0 + w * 8.0);
    } else if (attackVariant === 2) {
      // Move 2: Close-Range Napalm Shockwave Slam — roar upward, dorsal stacks blaze!
      pelvisY = 1.06 + w * 0.06;
      torsoPitch = 0.22 * w;
      torsoYaw = 0;
      headPitch = 0.14 * w;
      rShX = 0.64 + w * 0.88;
      rShY = 0.26;
      rElX = 0.95 - w * 0.25;
      lShX = 0.76 + w * 0.84;
      lShY = 0.22;
      lShZ = 0.58;
      lElX = 0.6 - w * 0.12;
      barrelHeat = 0.85 + w * 0.65;
      tankOverdrive = 0.85 + w * 0.65;
      visorGlow = 5.4;
    }
  } else if (behavior === 'attack') {
    const p = THREE.MathUtils.clamp(attackProgress, 0, 1);
    if (attackVariant === 0) {
      // Mortar firing kickback while held at high artillery elevation!
      const kick = Math.sin(p * Math.PI * 2) * (1 - p * 0.5);
      pelvisY = 0.94 - Math.max(0, kick) * 0.04;
      torsoPitch = 0.18 + Math.max(0, kick) * 0.14;
      torsoYaw = -0.16;
      lHipX = 0.3;
      lKneeX = -0.56;
      rHipX = -0.24;
      rKneeX = -0.46;
      rShX = 1.04 + Math.max(0, kick) * 0.2;
      rShY = 0.28;
      rElX = 0.94 + Math.max(0, kick) * 0.1;
      lShX = 1.16 + Math.max(0, kick) * 0.18;
      lShY = 0.24;
      lShZ = 0.62;
      lElX = 0.54;
      barrelHeat = 1.35 - p * 0.35;
      tankOverdrive = 1.1 - p * 0.4;
      visorGlow = 5.0;
      drumCyl.rotation.z += dt * 11.0;
    } else if (attackVariant === 1) {
      // 5-Bolt Thermite Fan Sweep across Armory aisle!
      const sweep = -0.32 + p * 0.64;
      const recoil = Math.abs(Math.sin(p * Math.PI * 5)) * 0.1;
      pelvisY = 0.97;
      torsoPitch = -0.1 + recoil * 0.5;
      torsoYaw = sweep;
      headYaw = -sweep * 0.45;
      lHipX = 0.24;
      lKneeX = -0.46;
      rHipX = -0.18;
      rKneeX = -0.38;
      rShX = 0.58 + aimPitch * 0.4 + recoil;
      rShY = 0.28;
      rElX = 1.06 + recoil * 0.5;
      lShX = 0.7 + aimPitch * 0.36 + recoil;
      lShY = 0.22;
      lShZ = 0.6;
      lElX = 0.62;
      barrelHeat = 1.35;
      tankOverdrive = 0.85;
      visorGlow = 4.8;
      drumCyl.rotation.z += dt * 14.0;
    } else if (attackVariant === 2) {
      // Molten Napalm Floor Shockwave Slam impact — both hands drive Vulcan-8 downward!
      const slam = Math.min(1, p * 2.2);
      pelvisY = 0.86;
      torsoPitch = -0.34 * slam;
      torsoYaw = 0;
      lHipX = 0.46;
      lKneeX = -0.92;
      rHipX = 0.34;
      rKneeX = -0.78;
      rShX = 1.42 - slam * 1.06;
      rShY = 0.26;
      rElX = 0.66;
      lShX = 1.48 - slam * 1.04;
      lShY = 0.22;
      lShZ = 0.58;
      lElX = 0.52;
      barrelHeat = 1.45 - p * 0.3;
      tankOverdrive = 1.4 - p * 0.3;
      visorGlow = 5.6;
    }
  } else if (behavior === 'recover' || attackVariant === 3) {
    // Post-slam heavy thermal vent cooldown — hunches forward pitching the glowing back fuel tank high!
    pelvisY = 0.95 + Math.sin(elapsed * 5.2) * 0.02;
    torsoPitch = -0.3;
    torsoYaw = Math.sin(elapsed * 2.4) * 0.08;
    headPitch = 0.18;
    lHipX = 0.26;
    lKneeX = -0.52;
    rHipX = -0.14;
    rKneeX = -0.36;
    rShX = 0.42;
    rShY = 0.24;
    rElX = 0.78;
    lShX = 0.52;
    lShY = 0.2;
    lShZ = 0.56;
    lElX = 0.54;
    barrelHeat = 0.9;
    tankOverdrive = 1.15;
    visorGlow = 3.8;
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

  visorMat.emissiveIntensity = damp(visorMat.emissiveIntensity, visorGlow, 10, dt);
  rig.limbs.setPilotAndBarrelHeat(barrelHeat, elapsed);
  rig.weakpoint.setTankState(tankOverdrive, input.weakpointBroken, elapsed);
}
