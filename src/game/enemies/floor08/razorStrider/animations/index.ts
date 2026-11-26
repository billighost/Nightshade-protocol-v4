import type { EnemyAnimationInput } from '../../../core/types';
import type { RazorStriderMeshRig } from '../mesh';

/**
 * AAA procedural skeletal choreography for KAGE-08 "ONI-BLADE" (Katana Cyber-Assassin).
 *
 * Verified Right-Hand-Rule Joint Sign Conventions (local forward = -Z, up = +Y, right = +X):
 * - Arm raised FORWARD (-Z): shoulder.rotation.x > 0, elbow flex UP-FORWARD: elbow.rotation.x > 0
 * - Torso lean FORWARD (-Z): torso.rotation.x < 0 (pelvis lean forward: pelvis.rotation.x < 0)
 * - Thigh raised FORWARD (-Z): hip.rotation.x > 0, knee flex BACKWARD (+Z): knee.rotation.x < 0
 * - Katana mounted in rightElbow at rotation.x = -2.06:
 *     in Chudan-no-Kamae guard (rShX=+0.52, rElX=+0.78), blade extends 43° UP-AND-FORWARD (-Z/+Y)
 *     with ZERO body or leg clipping!
 *
 * Attack Variants:
 * - 0: Combo 1 — High-Right Diagonal Katana Cleave
 * - 1: Combo 2 — Low-Left Reverse Rising Slash
 * - 2: Combo 3 — 360° Spinning Backhand Execution Slash
 * - 3: IAIJUTSU QUICK-DRAW DASH (physically sheathes blade in left-hip Saya during deep crouch!)
 * - 4: AERIAL BOOSTER-VAULT HELM-BREAKER SLAM
 * - 5: LATERAL BOOSTER FLASH-STEP EVADE
 */
export function updateStriderAnimation(
  rig: RazorStriderMeshRig,
  input: EnemyAnimationInput,
  gaitPhaseRef: { value: number }
): void {
  const { torso, limbs, weakpoint } = rig;
  const dt = input.dt;
  const t = input.elapsed;
  const smooth = 1 - Math.exp(-16 * dt);

  torso.pelvisGroup.rotation.z += (0 - torso.pelvisGroup.rotation.z) * smooth;

  // ---------------------------------------------------------------------------
  // 1. DEATH COLLAPSE
  // ---------------------------------------------------------------------------
  if (input.behavior === 'dead') {
    const p = input.deadProgress;
    limbs.setKatanaSheathed(false);
    weakpoint.setBoosterPlume(0, t);
    weakpoint.setDashTelegraph(false);

    torso.pelvisGroup.position.y = 0.94 * (1 - p * 0.8);
    torso.pelvisGroup.rotation.x = -p * 1.48;
    torso.pelvisGroup.rotation.z = p * 0.32;
    torso.torsoGroup.rotation.set(-0.2 * p, 0, 0);
    limbs.rightShoulder.rotation.set(0.35, 0, -0.75 * p);
    limbs.leftShoulder.rotation.set(-0.3, 0, 0.72 * p);
    limbs.leftHip.rotation.x = 0.35 * p;
    limbs.rightHip.rotation.x = -0.28 * p;
    weakpoint.leftFlapPivot.rotation.y = -0.82;
    weakpoint.rightFlapPivot.rotation.y = 0.82;
    return;
  }

  // ---------------------------------------------------------------------------
  // 2. WEAKPOINT OVERLOAD STAGGER (Kneeling exposed spine!)
  // ---------------------------------------------------------------------------
  if (input.behavior === 'staggered') {
    limbs.setKatanaSheathed(false);
    weakpoint.setBoosterPlume(0.22, t, false);
    weakpoint.setDashTelegraph(false);

    const wobble = Math.sin(t * 20) * 0.08;
    torso.pelvisGroup.position.y = 0.66;
    torso.pelvisGroup.rotation.set(-0.22, wobble, 0);
    torso.torsoGroup.rotation.set(-0.38, wobble * 0.8, 0);
    torso.headGroup.rotation.set(-0.32, -wobble * 1.2, 0);

    limbs.leftShoulder.rotation.set(0.25, 0, 0.42);
    limbs.leftElbow.rotation.set(0.45, 0, 0);
    limbs.rightShoulder.rotation.set(0.18, 0, -0.45);
    limbs.rightElbow.rotation.set(0.32, 0, 0);

    // One-knee drop pose (hip forward > 0, knee flex back < 0)
    limbs.leftHip.rotation.x = 1.02;
    limbs.leftKnee.rotation.x = -1.38;
    limbs.rightHip.rotation.x = -0.35;
    limbs.rightKnee.rotation.x = -1.15;

    weakpoint.leftFlapPivot.rotation.y = -1.04;
    weakpoint.rightFlapPivot.rotation.y = 1.04;
    limbs.bladeEdgeMat.emissiveIntensity = 1.4;
    animateDynamicCablesAndTassets(rig, t, 0.25, 0.3);
    return;
  }

  // ---------------------------------------------------------------------------
  // 3. LOCOMOTION GAIT & CHUDAN-NO-KAMAE PREDATOR STANCE BASELINE
  // ---------------------------------------------------------------------------
  const spd = input.speedRatio;
  gaitPhaseRef.value += dt * (4.6 + spd * 8.4);
  const g = gaitPhaseRef.value;

  const isAttacking =
    input.behavior === 'windup' ||
    input.behavior === 'attack' ||
    input.behavior === 'recover';
  const variant = input.attackVariant;
  const ap = input.attackProgress;

  // Physically sheathe katana in left-hip Saya during Iaijutsu quick-draw crouch!
  const isIaijutsuSheathed =
    isAttacking && variant === 3 && (input.behavior === 'windup' || (input.behavior === 'attack' && ap < 0.08));
  limbs.setKatanaSheathed(isIaijutsuSheathed);

  // Dorsal vent flaps: sleek closed, cracked on boost, blown wide open when weakpoint exposed!
  const targetFlap = input.weakpointExposed
    ? 1.02
    : (input.boosterIntensity ?? 0) > 0.35
      ? 0.45
      : 0.14;
  weakpoint.leftFlapPivot.rotation.y += (-targetFlap - weakpoint.leftFlapPivot.rotation.y) * smooth;
  weakpoint.rightFlapPivot.rotation.y += (targetFlap - weakpoint.rightFlapPivot.rotation.y) * smooth;

  // Volumetric booster plasma plumes
  const boosterPower =
    input.boosterIntensity !== undefined
      ? input.boosterIntensity
      : spd > 0.65
        ? (spd - 0.5) * 1.25
        : 0;
  weakpoint.setBoosterPlume(boosterPower, t, variant !== 5);

  const bladeGlowTarget = isAttacking ? 4.6 : 2.9 + Math.sin(t * 5) * 0.4;
  limbs.bladeEdgeMat.emissiveIntensity +=
    (bladeGlowTarget - limbs.bladeEdgeMat.emissiveIntensity) * smooth;

  // Baseline athletic predator samurai stance (slight forward crouch, bladed torso profile!)
  let hipY = 0.91 + input.airborneHeight - (spd > 0.2 ? Math.abs(Math.cos(g)) * 0.055 : 0);
  let pelvPitch = -(spd > 0.35 ? 0.2 * spd : 0.06);
  let pelvYaw = -0.32 * (1 - spd * 0.65);
  let torsoPitch = -(0.12 + spd * 0.24);
  let torsoYaw = 0.26 * (1 - spd * 0.5);
  let headPitch = 0.14 + spd * 0.16; // counter-pitch head up so Oni optics lock dead ahead!
  let headYaw = -torsoYaw * 0.68;

  // Anatomically correct leg gait (hip > 0 forward, knee < 0 flex back)
  let lHipX = Math.sin(g) * 0.82 * spd + (1 - spd) * 0.24;
  let rHipX = -Math.sin(g) * 0.82 * spd - (1 - spd) * 0.2;
  let lKneeX = -Math.max(0.18, -Math.cos(g) * 0.8 * spd + 0.26);
  let rKneeX = -Math.max(0.18, Math.cos(g) * 0.8 * spd + 0.26);

  // Classic Heroic Samurai Chudan-no-Kamae Guard:
  // Right arm raised forward-right (rShX=+0.52, rElX=+0.78 -> katana gleams 43° UP-AND-FORWARD!).
  // When sprinting fast, sweeps sword sleekly back-right (cyber-ninja run) with boosters lit!
  let rShX = 0.52 + Math.sin(t * 2.6) * 0.04 - spd * 0.92;
  let rShY = 0.16;
  let rShZ = 0.14 + spd * 0.22;
  let rElX = 0.78 - spd * 0.48;
  let rElY = -0.18;

  // Left guard arm poised forward-left balancing stance
  let lShX = 0.62 - Math.sin(g) * 0.55 * spd;
  let lShY = -0.26;
  let lShZ = -0.18;
  let lElX = 0.95 - spd * 0.3;

  // ---------------------------------------------------------------------------
  // 4. EXPRESSIVE 4-MOVE AAA KATANA ATTACK CHOREOGRAPHY
  // ---------------------------------------------------------------------------
  if (isAttacking) {
    if (variant === 0) {
      // COMBO 1: High-Right Diagonal Katana Cleave
      if (input.behavior === 'windup') {
        hipY = 0.84;
        torsoYaw = -0.78 * ap;
        torsoPitch = 0.08;
        rShX = 0.55 + 1.85 * ap; // raise sword high overhead-right!
        rShZ = 0.55 * ap;
        rElX = 0.52;
        lShX = 0.88;
        lElX = 0.85;
      } else if (input.behavior === 'attack') {
        const s = Math.min(1, ap * 1.45);
        hipY = 0.82;
        torsoYaw = -0.78 + s * 1.65;
        torsoPitch = -0.32 * s;
        rShX = 2.4 - s * 2.55; // violent diagonal downward-left cleave!
        rShY = 0.2 - s * 0.78;
        rShZ = 0.55 - s * 0.75;
        rElX = 0.25;
        lShX = -0.35 * s;
        lShZ = -0.48;
      } else {
        hipY = 0.86;
        torsoYaw = 0.68 * (1 - ap);
        rShX = 0.15 + 0.35 * ap;
        rElX = 0.45;
      }
    } else if (variant === 1) {
      // COMBO 2: Low-Left Reverse Rising Slash
      if (input.behavior === 'windup') {
        hipY = 0.78;
        torsoYaw = 0.76 * ap;
        torsoPitch = -0.3;
        rShX = -0.15;
        rShY = -0.78 * ap;
        rShZ = -0.25;
        rElX = 0.55;
      } else if (input.behavior === 'attack') {
        const s = Math.min(1, ap * 1.5);
        hipY = 0.8 + s * 0.16;
        torsoYaw = 0.76 - s * 1.58;
        torsoPitch = -0.3 + s * 0.44;
        rShX = -0.15 + s * 2.25;
        rShY = -0.78 + s * 1.05;
        rShZ = -0.25 + s * 0.85;
        rElX = 0.24;
      } else {
        hipY = 0.9;
        torsoYaw = -0.62 * (1 - ap);
        rShX = 1.65 * (1 - ap) + 0.48;
      }
    } else if (variant === 2) {
      // COMBO 3: 360° Spinning Backhand Execution Slash
      if (input.behavior === 'windup') {
        hipY = 0.8;
        pelvYaw = -0.65 * ap;
        torsoYaw = -0.52 * ap;
        rShX = 1.1;
        rShZ = 0.95;
        rElX = 0.35;
      } else if (input.behavior === 'attack') {
        const spin = Math.min(1, ap * 1.35) * Math.PI * 2;
        hipY = 0.84;
        pelvYaw = -0.65 + spin;
        torsoPitch = -0.26;
        rShX = 1.32;
        rShY = -0.3;
        rShZ = 1.18;
        rElX = 0.18;
        lShX = 0.35;
        lShZ = -0.88;
      } else {
        hipY = 0.86;
        torsoYaw = 0.45 * (1 - ap);
        rShX = 0.75;
        rShZ = 0.45;
      }
    } else if (variant === 3) {
      // VARIANT 3: IAIJUTSU QUICK-DRAW DASH (Iconic Coiled Cyber-Samurai Signature!)
      if (input.behavior === 'windup') {
        // Deep coiled crouch: katana physically sheathed in left-hip Saya,
        // left hand clamps scabbard collar, right hand reaches across chest to grip Tsuka hilt!
        hipY = 0.66;
        pelvPitch = -0.28;
        pelvYaw = -0.44;
        torsoPitch = -0.42;
        torsoYaw = 0.56;
        headPitch = 0.56; // head leveled cleanly so glowing Oni optics & Peril Glint stare straight at player!
        headYaw = -0.22;
        lHipX = 0.96;
        lKneeX = -1.28;
        rHipX = -0.42;
        rKneeX = -0.92;

        // Right arm crosses body forward-left to grip protruding sheathed hilt at left hip!
        rShX = 0.72;
        rShY = -0.88;
        rShZ = -0.42;
        rElX = 1.18;
        // Left arm grips Saya scabbard trigger collar at left hip!
        lShX = 0.32;
        lShY = 0.24;
        lShZ = -0.16;
        lElX = 0.98;
      } else if (input.behavior === 'attack') {
        // Explosive Booster Draw-Slash whipping katana wide across right front!
        const s = Math.min(1, ap * 1.75);
        hipY = 0.76;
        pelvPitch = -0.26;
        pelvYaw = 0.28;
        torsoPitch = -0.32;
        torsoYaw = 0.72 - s * 1.78;
        headPitch = 0.34;
        lHipX = 0.76;
        lKneeX = -0.96;
        rHipX = -0.58;
        rKneeX = -0.55;

        rShX = 1.12;
        rShY = -0.85 + s * 1.78;
        rShZ = 0.18 + s * 0.96;
        rElX = 0.24;
        lShX = -0.48 * s;
        lShZ = -0.72;
        lElX = 0.42;
      } else {
        // Zanshin low follow-through recovery (dorsal spine core wide open for punish!)
        const rec = 1 - ap;
        hipY = 0.74 + ap * 0.16;
        torsoPitch = -0.38 * rec - 0.12;
        torsoYaw = -0.88 * rec;
        rShX = 0.85 * rec + 0.48;
        rShZ = 1.05 * rec + 0.14;
        rElX = 0.28 + 0.5 * ap;
        lHipX = 0.64 * rec + 0.2;
        lKneeX = -(0.84 * rec + 0.24);
      }
    } else if (variant === 4) {
      // VARIANT 4: AERIAL BOOSTER-VAULT HELM-BREAKER SLAM
      if (input.behavior === 'windup') {
        hipY = 0.68 + input.airborneHeight;
        torsoPitch = -0.34;
        lHipX = 0.88;
        lKneeX = -1.32;
        rHipX = 0.78;
        rKneeX = -1.24;
        rShX = 1.55 * ap;
        rShZ = 0.32;
        lShX = 1.25 * ap;
      } else if (input.behavior === 'attack') {
        hipY = 0.92 + input.airborneHeight;
        if (ap < 0.62) {
          const rise = ap / 0.62;
          torsoPitch = 0.22 - rise * 0.14;
          rShX = 2.75;
          rShY = -0.18;
          rShZ = 0.14;
          rElX = 0.42;
          lShX = 2.48;
          lShY = 0.25;
          lElX = 0.62;
          lHipX = 0.92;
          lKneeX = -1.35;
          rHipX = 0.45;
          rKneeX = -0.95;
        } else {
          const slam = (ap - 0.62) / 0.38;
          torsoPitch = 0.08 - slam * 0.74;
          rShX = 2.75 - slam * 3.15;
          rShZ = 0.14;
          rElX = 0.2;
          lShX = 2.48 - slam * 2.85;
          lElX = 0.35;
          lHipX = 0.78;
          lKneeX = -1.12;
          rHipX = -0.42;
          rKneeX = -0.85;
        }
      } else {
        const rec = 1 - ap;
        hipY = 0.66 + ap * 0.24;
        torsoPitch = -0.52 * rec - 0.12;
        rShX = -0.35 * rec + 0.5;
        rElX = 0.28 + 0.5 * ap;
        lHipX = 0.9 * rec + 0.2;
        lKneeX = -(1.25 * rec + 0.24);
      }
    } else if (variant === 5) {
      // VARIANT 5: LATERAL BOOSTER FLASH-STEP EVADE
      const leanDir = input.localMoveX >= 0 ? -1 : 1;
      hipY = 0.84;
      torso.pelvisGroup.rotation.z = leanDir * 0.34;
      torsoPitch = -0.3;
      rShX = -0.45;
      rShZ = 0.52;
      lShX = 0.68;
      lShZ = -0.42;
    }
  }

  // Hit-flinch overlay
  if (input.flinchTimer > 0) {
    const f = Math.min(1, input.flinchTimer * 5.2);
    torsoPitch += 0.22 * f;
    torsoYaw += input.flinchDirX * 0.32 * f;
    headPitch += 0.16 * f;
  }

  // Apply smoothed skeletal transforms
  torso.pelvisGroup.position.y += (hipY - torso.pelvisGroup.position.y) * smooth;
  torso.pelvisGroup.rotation.x += (pelvPitch - torso.pelvisGroup.rotation.x) * smooth;
  torso.pelvisGroup.rotation.y += (pelvYaw - torso.pelvisGroup.rotation.y) * smooth;

  torso.torsoGroup.rotation.x += (torsoPitch - torso.torsoGroup.rotation.x) * smooth;
  torso.torsoGroup.rotation.y += (torsoYaw - torso.torsoGroup.rotation.y) * smooth;

  torso.headGroup.rotation.x += (headPitch - torso.headGroup.rotation.x) * smooth;
  torso.headGroup.rotation.y += (headYaw - torso.headGroup.rotation.y) * smooth;

  limbs.leftHip.rotation.x += (lHipX - limbs.leftHip.rotation.x) * smooth;
  limbs.leftKnee.rotation.x += (lKneeX - limbs.leftKnee.rotation.x) * smooth;
  limbs.rightHip.rotation.x += (rHipX - limbs.rightHip.rotation.x) * smooth;
  limbs.rightKnee.rotation.x += (rKneeX - limbs.rightKnee.rotation.x) * smooth;

  limbs.rightShoulder.rotation.x += (rShX - limbs.rightShoulder.rotation.x) * smooth;
  limbs.rightShoulder.rotation.y += (rShY - limbs.rightShoulder.rotation.y) * smooth;
  limbs.rightShoulder.rotation.z += (rShZ - limbs.rightShoulder.rotation.z) * smooth;
  limbs.rightElbow.rotation.x += (rElX - limbs.rightElbow.rotation.x) * smooth;
  limbs.rightElbow.rotation.y += (rElY - limbs.rightElbow.rotation.y) * smooth;

  limbs.leftShoulder.rotation.x += (lShX - limbs.leftShoulder.rotation.x) * smooth;
  limbs.leftShoulder.rotation.y += (lShY - limbs.leftShoulder.rotation.y) * smooth;
  limbs.leftShoulder.rotation.z += (lShZ - limbs.leftShoulder.rotation.z) * smooth;
  limbs.leftElbow.rotation.x += (lElX - limbs.leftElbow.rotation.x) * smooth;

  animateDynamicCablesAndTassets(rig, t, spd, boosterPower);
}

function animateDynamicCablesAndTassets(
  rig: RazorStriderMeshRig,
  t: number,
  speedRatio: number,
  boosterPower: number
): void {
  const { torso, limbs } = rig;
  const flowBoost = speedRatio * 0.65 + boosterPower * 0.75;

  // Cables hang along local -Y behind head (+Z). Gentle negative X sweeps them sleekly back over shoulders!
  for (let c = 0; c < torso.cableChains.length; c++) {
    const chain = torso.cableChains[c];
    for (let s = 0; s < chain.segments.length; s++) {
      const seg = chain.segments[s];
      const wave = Math.sin(t * (5.5 + flowBoost * 6) - s * 1.1 + c * 0.9);
      const lift = s === 0 ? -Math.min(0.68, 0.24 + flowBoost * 0.28) : -Math.min(0.18, 0.04 + flowBoost * 0.08);
      seg.rotation.x = lift + wave * (0.05 + flowBoost * 0.06);
      seg.rotation.z = wave * (0.05 + flowBoost * 0.06) * (c < 2 ? -1 : 1);
    }
  }

  // Sway hinged kusazuri tassets smoothly with forward hip swing & thruster airwash
  const lLeg = limbs.leftHip.rotation.x;
  const rLeg = limbs.rightHip.rotation.x;
  for (let i = 0; i < torso.tassetPivots.length; i++) {
    const p = torso.tassetPivots[i];
    const baseTilt = (p.userData.baseTiltX as number) ?? -0.16;
    let legLift = 0;
    if (i === 0) legLift = Math.max(0, lLeg * 0.55);
    else if (i === 1) legLift = Math.max(0, rLeg * 0.55);
    else if (i === 4) legLift = Math.max(0, Math.max(-lLeg, -rLeg) * 0.42) + boosterPower * 0.35;
    else legLift = speedRatio * 0.14;
    p.rotation.x = baseTilt - legLift - Math.sin(t * 4.2 + i) * 0.025;
  }
}
