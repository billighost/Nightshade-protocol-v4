import type { EnemyAnimationInput } from '../../../core/types';
import type { BreacherMeshRig } from '../mesh';

/**
 * AAA procedural skeletal choreography for BREACHER-08 (Quad-NOD Rail Marksman).
 *
 * Verified Right-Hand-Rule Joint Sign Conventions (local forward = -Z, up = +Y, right = +X):
 * - Arm raised FORWARD (-Z): shoulder.rotation.x > 0, elbow flex UP-FORWARD: elbow.rotation.x > 0
 * - Rifle mounted in rightArm.elbow at rotation.x = -Math.PI/2:
 *     when rShX + rElX = +1.57 rad (+90°), VX-8 Vulcan Carbine sits DEAD LEVEL FORWARD (-Z)!
 * - Torso lean FORWARD (-Z): torso.rotation.x < 0
 * - Thigh raised FORWARD (-Z): hip.rotation.x > 0, knee flex BACKWARD (+Z): knee.rotation.x < 0
 *
 * Attack Variants:
 * - 0: Suppressive 3-Round Plasma Burst (bladed Weaver stance + sharp recoil kick)
 * - 1: Kneeling Laser-Locked Overcharged Rail-Slug (one-knee marksman brace + blinding optic/rail charge)
 * - 2: Boosted Lateral Tactical Jet-Dash Evade (steep banking lean + twin dorsal thruster flames!)
 * - 3: Close-Quarters Rifle Stock-Bash (heavy horizontal buttstock strike + thruster hop-back)
 */
export function updateBreacherAnimation(
  rig: BreacherMeshRig,
  input: EnemyAnimationInput,
  gaitPhase: { value: number }
): void {
  const { pelvis, torso, head, opticMat, setBoosterPlume } = rig.torsoParts;
  const { leftLeg, rightLeg, leftArm, rightArm, railGlowMat } = rig.limbs;
  const { arcHaloMesh } = rig.weakpoint;
  const dt = input.dt;
  const t = input.elapsed;
  const smooth = 1 - Math.exp(-15 * dt);

  // Spin & shimmer shoulder EMP capacitor halo ring
  arcHaloMesh.visible = !input.weakpointBroken;
  if (!input.weakpointBroken) {
    arcHaloMesh.rotation.z = t * 4.5;
    arcHaloMesh.rotation.y = Math.sin(t * 3.2) * 0.45;
    const haloScale =
      input.attackVariant === 1 && input.behavior === 'windup'
        ? 1.1 + input.attackProgress * 0.45
        : 0.96 + Math.sin(t * 7) * 0.08;
    arcHaloMesh.scale.setScalar(haloScale);
  }

  // ---------------------------------------------------------------------------
  // 1. DEATH COLLAPSE
  // ---------------------------------------------------------------------------
  if (input.behavior === 'dead') {
    const p = input.deadProgress;
    const ease = 1 - Math.pow(1 - p, 3);
    setBoosterPlume(0, t);
    rig.limbs.setLaserSight(false, 0);
    pelvis.position.set(0, 0.94 - ease * 0.78, ease * 0.22);
    pelvis.rotation.set(-ease * 1.44, 0, ease * 0.28);
    torso.rotation.set(-0.18 * ease, 0, 0);
    leftArm.shoulder.rotation.set(0.42 * ease, 0, -0.68 * ease);
    rightArm.shoulder.rotation.set(0.32 * ease, 0, 0.72 * ease);
    leftLeg.hip.rotation.x = 0.28 * ease;
    rightLeg.hip.rotation.x = -0.22 * ease;
    return;
  }

  // ---------------------------------------------------------------------------
  // 2. EMP OVERLOAD STUN STAGGER (Kneeling electric spasm!)
  // ---------------------------------------------------------------------------
  if (input.behavior === 'staggered' || input.staggerTimer > 0) {
    setBoosterPlume(0, t);
    rig.limbs.setLaserSight(false, 0);
    const spasm = Math.sin(t * 34) * 0.09;
    pelvis.position.set(0, 0.68, 0.04);
    pelvis.rotation.set(-0.22, spasm, spasm * 0.5);
    torso.rotation.set(-0.38, -0.18 + spasm, 0.14);
    head.rotation.set(-0.28, spasm * 1.4, 0.12);
    leftLeg.hip.rotation.x = 0.88;
    leftLeg.knee.rotation.x = -1.32;
    rightLeg.hip.rotation.x = -0.32;
    rightLeg.knee.rotation.x = -1.18;
    rightArm.shoulder.rotation.set(0.35, -0.1, 0.42);
    rightArm.elbow.rotation.x = 0.55;
    leftArm.shoulder.rotation.set(0.65, 0.35, -0.22);
    leftArm.elbow.rotation.x = 1.05;
    opticMat.emissiveIntensity = 1.0 + Math.abs(Math.sin(t * 40)) * 2.5;
    return;
  }

  // ---------------------------------------------------------------------------
  // 3. LOCOMOTION GAIT & TACTICAL WEAVER RIFLE STANCE BASELINE
  // ---------------------------------------------------------------------------
  const stride = Math.min(1, input.speedRatio);
  gaitPhase.value += dt * (2.8 + stride * 7.2);
  const g = gaitPhase.value;

  const boosterPower = input.boosterIntensity ?? 0;
  setBoosterPlume(boosterPower, t);

  const isAttacking =
    input.behavior === 'windup' ||
    input.behavior === 'attack' ||
    input.behavior === 'recover';
  const variant = input.attackVariant;
  const ap = input.attackProgress;

  // Pulse Quad-NOD optics & VX-8 rail accelerator coils dramatically during Rail-Lock charge!
  const railCharge = variant === 1 && input.behavior === 'windup' ? ap : 0;
  opticMat.emissiveIntensity = 3.2 + railCharge * 3.5;
  railGlowMat.emissiveIntensity = 2.4 + railCharge * 4.2 + (input.behavior === 'attack' ? 1.8 : 0);

  const bob = Math.abs(Math.sin(g)) * 0.042 * stride + Math.sin(t * 2.4) * 0.01;
  let hipY = 0.93 - stride * 0.04 + bob;
  let pelvPitch = -0.05 * stride;
  let pelvYaw = -input.localMoveX * 0.18;
  let pelvRoll = -input.localMoveX * 0.07;

  // Anatomically correct stride (thigh forward > 0, knee flex backward < 0)
  const swing = Math.sin(g) * 0.65 * stride;
  let lHipX = swing + (1 - stride) * 0.16;
  let lKneeX = -Math.max(0.14, -Math.cos(g) * 0.72 * stride + 0.16);
  let rHipX = -swing - (1 - stride) * 0.14;
  let rKneeX = -Math.max(0.14, Math.cos(g) * 0.72 * stride + 0.16);

  // Tactical bladed Weaver shooting torso (left shoulder forward -Z, right shoulder back +Z: torsoYaw < 0!)
  const aiming =
    input.behavior === 'attack' ||
    input.behavior === 'windup' ||
    input.behavior === 'strafe' ||
    input.behavior === 'recover';

  let torsoPitch = aiming ? -0.08 : -0.06;
  let torsoYaw = aiming ? -0.5 : -0.4;
  let headPitch = input.aimPitch * 0.45 + 0.06;
  let headYaw = -torsoYaw * 0.88;

  // Verified Two-Handed VX-8 Carbine Kinematics (<1cm grip + foregrip accuracy, barrel dead straight -Z!):
  let rShX = aiming ? 0.2 + input.aimPitch * 0.45 : 0.04;
  let rShY = aiming ? 0.5 : 0.42;
  let rShZ = aiming ? -0.16 : -0.14;
  let rElX = aiming ? 1.45 : 1.24;

  let lShX = aiming ? 1.08 + input.aimPitch * 0.4 : 0.86;
  let lShY = aiming ? -0.98 : -0.88;
  let lShZ = aiming ? 0.1 : 0.12;
  let lElX = aiming ? 0.56 : 0.58;

  // ---------------------------------------------------------------------------
  // 4. 4-MOVE SPEC-OPS TACTICAL COMBAT CHOREOGRAPHY
  // ---------------------------------------------------------------------------
  if (isAttacking) {
    if (variant === 0) {
      // MOVE 1: 3-ROUND SUPPRESSIVE PLASMA BURST (crisp muzzle-rise recoil!)
      if (input.behavior === 'attack') {
        const kick = Math.max(0, Math.sin(ap * Math.PI * 6)) * 0.11;
        torsoPitch += kick * 0.4;
        rShX += kick * 0.95;
        lShX += kick * 0.82;
      }
    } else if (variant === 1) {
      // MOVE 2: KNEELING LASER-LOCKED OVERCHARGED RAIL-SLUG!
      if (input.behavior === 'windup') {
        // Drops smoothly onto right knee, plants left boot forward, shoulders carbine rock-steady!
        const drop = Math.min(1, ap * 2.4);
        hipY = 0.93 - drop * 0.27;
        pelvPitch = -0.12 * drop;
        pelvYaw = 0.18 * drop;
        torsoPitch = -0.08;
        torsoYaw = -0.52;
        headPitch = 0.08 + input.aimPitch * 0.35;
        headYaw = 0.46;

        lHipX = 0.98 * drop + 0.16 * (1 - drop);
        lKneeX = -(1.12 * drop + 0.16 * (1 - drop));
        rHipX = -0.26 * drop;
        rKneeX = -(1.38 * drop + 0.16 * (1 - drop));

        // Rock-steady braced two-hand railgun hold (laser dead straight on target!)
        rShX = 0.2 + input.aimPitch * 0.42;
        rShY = 0.52;
        rShZ = -0.16;
        rElX = 1.45;
        lShX = 1.09 + input.aimPitch * 0.38;
        lShY = -0.99;
        lShZ = 0.1;
        lElX = 0.55;
      } else if (input.behavior === 'attack') {
        // Heavy thunderous electromagnetic railgun recoil kick!
        const kick = Math.max(0, 1 - ap * 2.1);
        hipY = 0.67;
        pelvPitch = -0.1 + kick * 0.16;
        pelvYaw = 0.18;
        torsoPitch = -0.06 + kick * 0.3;
        torsoYaw = -0.52 + kick * 0.14;
        headYaw = 0.46 - kick * 0.1;
        lHipX = 0.96;
        lKneeX = -1.1;
        rHipX = -0.26;
        rKneeX = -1.36;
        rShX = 0.2 + kick * 0.36;
        rShY = 0.52;
        rShZ = -0.16;
        rElX = 1.45 - kick * 0.14;
        lShX = 1.09 + kick * 0.32;
        lShY = -0.99;
        lShZ = 0.1;
        lElX = 0.55;
      } else {
        // Smooth rise back into standing ready stance
        const rec = 1 - ap;
        hipY = 0.93 - rec * 0.24;
        lHipX = 0.16 + rec * 0.78;
        lKneeX = -(0.16 + rec * 0.94);
        rHipX = -0.14 - rec * 0.12;
        rKneeX = -(0.16 + rec * 1.15);
      }
    } else if (variant === 2) {
      // MOVE 3: BOOSTED LATERAL TACTICAL JET-DASH EVADE!
      const bank = input.localMoveX >= 0 ? -1 : 1;
      hipY = 0.84;
      pelvPitch = -0.22;
      pelvRoll = bank * 0.3;
      torsoPitch = -0.18;
      torsoYaw = -0.44 + bank * 0.14;
      headYaw = -torsoYaw * 0.82;
      lHipX = 0.52;
      lKneeX = -0.78;
      rHipX = -0.38;
      rKneeX = -0.72;
      // Keep carbine tucked firmly in both hands across chest while dorsal thrusters fire!
      rShX = 0.16;
      rShY = 0.48;
      rShZ = -0.16;
      rElX = 1.44;
      lShX = 1.02;
      lShY = -0.94;
      lShZ = 0.1;
      lElX = 0.58;
    } else if (variant === 3) {
      // MOVE 4: CLOSE-QUARTERS RIFLE STOCK-BASH!
      if (input.behavior === 'windup') {
        hipY = 0.86;
        torsoYaw = -0.72 * ap;
        torsoPitch = -0.08;
        rShX = 0.36;
        rShY = 0.62;
        rShZ = -0.14;
        rElX = 1.32;
        lShX = 1.14;
        lShY = -1.04;
        lShZ = 0.12;
        lElX = 0.54;
      } else if (input.behavior === 'attack') {
        const s = Math.min(1, ap * 1.7);
        hipY = 0.84;
        torsoYaw = -0.72 + s * 1.35;
        torsoPitch = -0.24 * s;
        rShX = 0.36 + s * 0.42;
        rShY = 0.62 - s * 0.45;
        rShZ = -0.14;
        rElX = 1.1;
        lShX = 1.14 + s * 0.24;
        lShY = -1.04 + s * 0.42;
        lShZ = 0.12;
        lElX = 0.48;
      } else {
        hipY = 0.89;
        torsoYaw = 0.48 * (1 - ap) - 0.46;
      }
    }
  }

  // Hit-flinch overlay
  if (input.flinchTimer > 0) {
    const f = Math.sin(Math.min(1, input.flinchTimer / 0.18) * Math.PI);
    torsoPitch += 0.22 * f;
    torsoYaw += input.flinchDirX * 0.24 * f;
    headPitch += 0.16 * f;
  }

  // Apply smoothed skeletal transforms
  pelvis.position.y += (hipY - pelvis.position.y) * smooth;
  pelvis.rotation.x += (pelvPitch - pelvis.rotation.x) * smooth;
  pelvis.rotation.y += (pelvYaw - pelvis.rotation.y) * smooth;
  pelvis.rotation.z += (pelvRoll - pelvis.rotation.z) * smooth;

  torso.rotation.x += (torsoPitch - torso.rotation.x) * smooth;
  torso.rotation.y += (torsoYaw - torso.rotation.y) * smooth;
  torso.rotation.z += (0 - torso.rotation.z) * smooth;

  head.rotation.x += (headPitch - head.rotation.x) * smooth;
  head.rotation.y += (headYaw - head.rotation.y) * smooth;

  leftLeg.hip.rotation.x += (lHipX - leftLeg.hip.rotation.x) * smooth;
  leftLeg.knee.rotation.x += (lKneeX - leftLeg.knee.rotation.x) * smooth;
  rightLeg.hip.rotation.x += (rHipX - rightLeg.hip.rotation.x) * smooth;
  rightLeg.knee.rotation.x += (rKneeX - rightLeg.knee.rotation.x) * smooth;

  rightArm.shoulder.rotation.x += (rShX - rightArm.shoulder.rotation.x) * smooth;
  rightArm.shoulder.rotation.y += (rShY - rightArm.shoulder.rotation.y) * smooth;
  rightArm.shoulder.rotation.z += (rShZ - rightArm.shoulder.rotation.z) * smooth;
  rightArm.elbow.rotation.x += (rElX - rightArm.elbow.rotation.x) * smooth;

  leftArm.shoulder.rotation.x += (lShX - leftArm.shoulder.rotation.x) * smooth;
  leftArm.shoulder.rotation.y += (lShY - leftArm.shoulder.rotation.y) * smooth;
  leftArm.shoulder.rotation.z += (lShZ - leftArm.shoulder.rotation.z) * smooth;
  leftArm.elbow.rotation.x += (lElX - leftArm.elbow.rotation.x) * smooth;
}
