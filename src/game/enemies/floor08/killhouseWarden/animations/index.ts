import type { EnemyAnimationInput } from '../../../core/types';
import type { WardenMeshRig } from '../mesh';

/**
 * AAA Procedural Skeletal Choreography for WARDEN-08 "SABLE" (Killhouse Zone Mini-Boss).
 *
 * Verified Right-Hand-Rule Joint Sign Conventions (local forward = -Z, up = +Y, right = +X):
 * - Thigh forward swing: hip.rotation.x > 0; knee flex backward: knee.rotation.x < 0.
 * - Both VX-9 Vector SMGs are mounted inside leftArm.elbow / rightArm.elbow at rotation.x = -Math.PI/2:
 *     when torsoPitch + shX + elX ≈ +1.57 rad, BOTH SMGs aim DEAD LEVEL FORWARD (-Z)!
 * - Split curved trench-coattails flare backward/outward with positive rotation.x & side roll.
 *
 * Attack Variants:
 * - 0: Flash-Dash into Alternating Akimbo Burst (low banked rocket-dash glide -> crisp L/R SMG recoil!)
 * - 1: Cross-Fire Gun-Kata Suppression Advance (synchronized Equilibrium X-sweep akimbo fire!)
 * - 2: Close-Range 360° Gun-Kata Cyclone Sweep (full 360° spin with wide arms + flaring coattails!)
 * - 3: Thermal Capacitor Vent Recovery (SMGs dipped low, dorsal capacitor pylons popped HIGH & splayed!)
 */
export function updateWardenAnimation(
  rig: WardenMeshRig,
  input: EnemyAnimationInput,
  gaitPhase: { value: number }
): void {
  const { pelvis, torso, head, leftCoatTail, rightCoatTail, visorMat, setDashPlume } =
    rig.torsoParts;
  const { leftLeg, rightLeg, leftArm, rightArm, coilMatLeft, coilMatRight } = rig.limbs;
  const { setVentVisualState } = rig.weakpoint;

  const dt = input.dt;
  const t = input.elapsed;
  const smooth = 1 - Math.exp(-15 * dt);

  const variant = input.attackVariant;
  const ap = input.attackProgress;
  const isAttacking =
    input.behavior === 'windup' ||
    input.behavior === 'attack' ||
    input.behavior === 'recover';

  // Drive telescoping twin dorsal capacitor pylons + spinning overload halo rings!
  setVentVisualState(input.weakpointExposed, input.weakpointBroken, t, dt);

  const boosterPower = input.boosterIntensity ?? 0;
  setDashPlume(boosterPower, t);

  visorMat.emissiveIntensity =
    3.4 + (input.behavior === 'windup' ? 2.6 : input.weakpointExposed ? 1.4 : 0);
  const fireGlow = input.behavior === 'attack' ? 3.2 : 1.8;
  coilMatLeft.emissiveIntensity = fireGlow + (input.behavior === 'attack' ? Math.max(0, Math.sin(t * 42)) * 2.2 : 0);
  coilMatRight.emissiveIntensity = fireGlow + (input.behavior === 'attack' ? Math.max(0, Math.cos(t * 42)) * 2.2 : 0);

  // ---------------------------------------------------------------------------
  // 1. MINI-BOSS COLLAPSE (DEATH)
  // ---------------------------------------------------------------------------
  if (input.behavior === 'dead') {
    const ease = 1 - Math.pow(1 - input.deadProgress, 3);
    setDashPlume(0, t);
    pelvis.position.set(0, 1.02 - ease * 0.85, ease * 0.25);
    pelvis.rotation.set(-ease * 1.44, 0, ease * 0.2);
    torso.rotation.set(-0.22 * ease, 0, 0);
    leftArm.shoulder.rotation.set(0.35 * ease, 0, -0.78 * ease);
    rightArm.shoulder.rotation.set(0.35 * ease, 0, 0.78 * ease);
    leftLeg.hip.rotation.x = 0.26 * ease;
    rightLeg.hip.rotation.x = -0.22 * ease;
    leftCoatTail.rotation.set(0.42 * ease, 0, -0.18 * ease);
    rightCoatTail.rotation.set(0.42 * ease, 0, 0.18 * ease);
    return;
  }

  // ---------------------------------------------------------------------------
  // 2. CAPACITOR OVERLOAD EMP STAGGER (Heavy Kneel + Spasm!)
  // ---------------------------------------------------------------------------
  if (input.behavior === 'staggered' || input.staggerTimer > 0) {
    setDashPlume(0, t);
    const jolt = Math.sin(t * 28) * 0.09;
    pelvis.position.set(0, 0.72, 0.04);
    pelvis.rotation.set(-0.14, jolt * 0.6, jolt * 0.4);
    torso.rotation.set(-0.34, jolt, 0);
    head.rotation.set(-0.22, -jolt * 1.5, 0.08);
    // Athletic kneeling stagger (positive hip forward, negative knee flex!)
    leftLeg.hip.rotation.x = 0.92;
    leftLeg.knee.rotation.x = -1.35;
    rightLeg.hip.rotation.x = 0.42;
    rightLeg.knee.rotation.x = -1.25;
    // Arms flung wide open dropping guard
    leftArm.shoulder.rotation.set(0.28, -0.35, -0.72);
    leftArm.elbow.rotation.x = 0.55;
    rightArm.shoulder.rotation.set(0.28, 0.35, 0.72);
    rightArm.elbow.rotation.x = 0.55;
    leftCoatTail.rotation.set(0.25, 0, -0.2);
    rightCoatTail.rotation.set(0.25, 0, 0.2);
    visorMat.emissiveIntensity = 1.0 + Math.abs(Math.sin(t * 36)) * 2.8;
    return;
  }

  // ---------------------------------------------------------------------------
  // 3. ATHLETIC GUN-KATA LOCOMOTION & AKIMBO READY BASELINE
  // ---------------------------------------------------------------------------
  const stride = Math.min(1, input.speedRatio);
  gaitPhase.value += dt * (2.8 + stride * 7.8);
  const g = gaitPhase.value;

  const bob = Math.abs(Math.sin(g)) * 0.045 * stride + Math.sin(t * 2.4) * 0.008;
  let hipY = 1.02 - stride * 0.045 + bob;
  let pelvPitch = -0.06 * stride;
  let pelvYaw = -input.localMoveX * 0.2;
  let pelvRoll = -input.localMoveX * 0.12;

  const swing = Math.sin(g) * 0.64 * stride;
  let lHipX = swing + (1 - stride) * 0.14;
  let lKneeX = -Math.max(0.12, -Math.cos(g) * 0.74 * stride + 0.14);
  let rHipX = -swing - (1 - stride) * 0.1;
  let rKneeX = -Math.max(0.12, Math.cos(g) * 0.74 * stride + 0.14);

  let torsoPitch = -0.1;
  let torsoYaw = 0;
  let torsoRoll = -input.localMoveX * 0.08;
  let headPitch = 0.08 + input.aimPitch * 0.4;
  let headYaw = 0;

  // Dual Akimbo VX-9 Vector Ready Aim (torsoPitch -0.1 + shX 0.54 + elX 1.13 = +1.57 -> dead level -Z!)
  let lShX = 0.54 + input.aimPitch * 0.48;
  let lShY = -0.14;
  let lShZ = -0.1;
  let lElX = 1.13;

  let rShX = 0.54 + input.aimPitch * 0.48;
  let rShY = 0.14;
  let rShZ = 0.1;
  let rElX = 1.13;

  // Dynamic flaring curved coattails!
  let coatPitchL = 0.1 + stride * 0.34 + Math.sin(g * 2) * 0.06 * stride;
  let coatPitchR = 0.1 + stride * 0.34 - Math.sin(g * 2) * 0.06 * stride;
  let coatRollL = -0.06 - stride * 0.1;
  let coatRollR = 0.06 + stride * 0.1;

  // ---------------------------------------------------------------------------
  // 4. 4-MOVE AKIMBO GUN-KATA CHOREOGRAPHY
  // ---------------------------------------------------------------------------
  if (isAttacking) {
    if (variant === 0) {
      // MOVE 1: LATERAL FLASH-DASH INTO ALTERNATING AKIMBO BURST!
      if (input.behavior === 'windup') {
        // Low kinetic banked flash-dash glide with flaring coattails & tucked leading SMGs!
        const dashSign = input.localMoveX >= 0 ? 1 : -1;
        hipY = 0.85;
        pelvPitch = -0.18;
        pelvYaw = -dashSign * 0.42;
        pelvRoll = -dashSign * 0.3;
        torsoPitch = -0.2;
        torsoYaw = dashSign * 0.34;
        torsoRoll = -dashSign * 0.16;
        headPitch = 0.28;
        headYaw = dashSign * 0.08;
        lHipX = dashSign > 0 ? 0.56 : -0.35;
        lKneeX = -0.78;
        rHipX = dashSign > 0 ? -0.35 : 0.56;
        rKneeX = -0.72;
        // Trailing arm swept stylishly back, leading arm braced forward!
        lShX = dashSign > 0 ? 0.15 : 0.72;
        lShY = -0.24;
        lShZ = -0.32;
        lElX = dashSign > 0 ? 0.72 : 1.08;
        rShX = dashSign > 0 ? 0.72 : 0.15;
        rShY = 0.24;
        rShZ = 0.32;
        rElX = dashSign > 0 ? 1.08 : 0.72;
        coatPitchL = 0.68;
        coatPitchR = 0.68;
        coatRollL = -0.24 - dashSign * 0.22;
        coatRollR = 0.24 - dashSign * 0.22;
      } else if (input.behavior === 'attack') {
        // High-tempo alternating L/R akimbo VX-9 Vector recoil kicks!
        const altL = Math.max(0, Math.sin(t * 42));
        const altR = Math.max(0, -Math.sin(t * 42));
        hipY = 0.94;
        torsoPitch = -0.12;
        torsoYaw = (altR - altL) * 0.14;
        headYaw = -torsoYaw * 0.7;
        lShX = 0.62 + altL * 0.24 + input.aimPitch * 0.48;
        lShY = -0.12;
        lShZ = -0.14;
        lElX = 1.07 - altL * 0.14;
        rShX = 0.62 + altR * 0.24 + input.aimPitch * 0.48;
        rShY = 0.12;
        rShZ = 0.14;
        rElX = 1.07 - altR * 0.14;
      }
    } else if (variant === 1) {
      // MOVE 2: CROSS-FIRE GUN-KATA ADVANCING SUPPRESSION!
      if (input.behavior === 'attack') {
        const sweep = Math.sin(ap * Math.PI * 3);
        const kick = Math.max(0, Math.cos(ap * Math.PI * 6)) * 0.2;
        hipY = 0.95 + Math.abs(Math.sin(g)) * 0.04;
        torsoPitch = -0.14 + kick * 0.25;
        torsoYaw = sweep * 0.2;
        headYaw = -torsoYaw * 0.8;
        // Equilibrium-style rhythmic akimbo cross-sweep!
        lShX = 0.64 + kick * 0.6 + input.aimPitch * 0.45;
        lShY = -0.28 + sweep * 0.34;
        lShZ = -0.22;
        lElX = 1.05;
        rShX = 0.64 + kick * 0.6 + input.aimPitch * 0.45;
        rShY = 0.28 + sweep * 0.34;
        rShZ = 0.22;
        rElX = 1.05;
        coatPitchL = 0.46;
        coatPitchR = 0.46;
      }
    } else if (variant === 2) {
      // MOVE 3: CLOSE-RANGE 360° GUN-KATA CYCLONE SWEEP!
      if (input.behavior === 'windup') {
        const c = Math.min(1, ap * 1.6);
        hipY = 1.02 - c * 0.22;
        pelvPitch = -0.16 * c;
        torsoPitch = -0.18 * c;
        torsoYaw = -0.55 * c;
        lHipX = 0.62 * c;
        lKneeX = -0.95 * c;
        rHipX = -0.28 * c;
        rKneeX = -0.82 * c;
        // Cross arms tight across chest before explosive 360° outward spin!
        lShX = 0.68;
        lShY = -0.58 * c;
        lElX = 1.24;
        rShX = 0.68;
        rShY = 0.58 * c;
        rElX = 1.24;
      } else if (input.behavior === 'attack') {
        // Blazing 360° spinning Equilibrium bullet-cyclone with wide outstretched arms!
        const spinYaw = ap * Math.PI * 2;
        hipY = 0.88;
        pelvPitch = -0.1;
        pelvYaw = spinYaw;
        pelvRoll = 0.06;
        torsoPitch = -0.12;
        torsoYaw = 0;
        lHipX = 0.45;
        lKneeX = -0.72;
        rHipX = -0.35;
        rKneeX = -0.64;
        // Wide flared gun-kata arms spraying golden bolts horizontally around the circle!
        lShX = 0.48;
        lShY = 0.12;
        lShZ = -1.12;
        lElX = 1.18;
        rShX = 0.48;
        rShY = -0.12;
        rShZ = 1.12;
        rElX = 1.18;
        // Centrifugal flaring coattails!
        coatPitchL = 0.72;
        coatPitchR = 0.72;
        coatRollL = -0.45;
        coatRollR = 0.45;
      }
    } else if (variant === 3 || input.behavior === 'recover') {
      // MOVE 4: OVERHEATED THERMAL CAPACITOR VENT RECOVERY (Clear Weakpoint Window!)
      hipY = 0.94;
      torsoPitch = -0.22;
      headPitch = 0.22;
      // Dip both SMGs outward & downward while dorsal capacitor pylons pop HIGH above his shoulders!
      lShX = 0.24;
      lShY = -0.18;
      lShZ = -0.34;
      lElX = 0.88;
      rShX = 0.24;
      rShY = 0.18;
      rShZ = 0.34;
      rElX = 0.88;
      coatPitchL = 0.24;
      coatPitchR = 0.24;
    }
  } else if (input.behavior === 'recover') {
    hipY = 0.94;
    torsoPitch = -0.22;
    headPitch = 0.22;
    lShX = 0.24;
    lShZ = -0.34;
    lElX = 0.88;
    rShX = 0.24;
    rShZ = 0.34;
    rElX = 0.88;
  }

  // Crisp hit-flinch overlay
  if (input.flinchTimer > 0) {
    const f = Math.sin(Math.min(1, input.flinchTimer / 0.18) * Math.PI);
    torsoPitch += 0.22 * f;
    torsoYaw += input.flinchDirX * 0.24 * f;
    headPitch += 0.14 * f;
  }

  // Apply transforms (direct pelvis yaw during 360° cyclone spin so it never unwraps backwards!)
  pelvis.position.y += (hipY - pelvis.position.y) * smooth;
  pelvis.rotation.x += (pelvPitch - pelvis.rotation.x) * smooth;
  if (variant === 2 && input.behavior === 'attack') {
    pelvis.rotation.y = pelvYaw;
  } else {
    pelvis.rotation.y += (pelvYaw - pelvis.rotation.y) * smooth;
  }
  pelvis.rotation.z += (pelvRoll - pelvis.rotation.z) * smooth;

  torso.rotation.x += (torsoPitch - torso.rotation.x) * smooth;
  torso.rotation.y += (torsoYaw - torso.rotation.y) * smooth;
  torso.rotation.z += (torsoRoll - torso.rotation.z) * smooth;

  head.rotation.x += (headPitch - head.rotation.x) * smooth;
  head.rotation.y += (headYaw - head.rotation.y) * smooth;

  leftLeg.hip.rotation.x += (lHipX - leftLeg.hip.rotation.x) * smooth;
  leftLeg.knee.rotation.x += (lKneeX - leftLeg.knee.rotation.x) * smooth;
  rightLeg.hip.rotation.x += (rHipX - rightLeg.hip.rotation.x) * smooth;
  rightLeg.knee.rotation.x += (rKneeX - rightLeg.knee.rotation.x) * smooth;

  leftArm.shoulder.rotation.x += (lShX - leftArm.shoulder.rotation.x) * smooth;
  leftArm.shoulder.rotation.y += (lShY - leftArm.shoulder.rotation.y) * smooth;
  leftArm.shoulder.rotation.z += (lShZ - leftArm.shoulder.rotation.z) * smooth;
  leftArm.elbow.rotation.x += (lElX - leftArm.elbow.rotation.x) * smooth;

  rightArm.shoulder.rotation.x += (rShX - rightArm.shoulder.rotation.x) * smooth;
  rightArm.shoulder.rotation.y += (rShY - rightArm.shoulder.rotation.y) * smooth;
  rightArm.shoulder.rotation.z += (rShZ - rightArm.shoulder.rotation.z) * smooth;
  rightArm.elbow.rotation.x += (rElX - rightArm.elbow.rotation.x) * smooth;

  leftCoatTail.rotation.x += (coatPitchL - leftCoatTail.rotation.x) * smooth;
  leftCoatTail.rotation.z += (coatRollL - leftCoatTail.rotation.z) * smooth;
  rightCoatTail.rotation.x += (coatPitchR - rightCoatTail.rotation.x) * smooth;
  rightCoatTail.rotation.z += (coatRollR - rightCoatTail.rotation.z) * smooth;
}
