import type { EnemyAnimationInput } from '../../../core/types';
import type { AegisMeshRig } from '../mesh';

/**
 * AAA procedural skeletal choreography for AEGIS-RIOT (Heavy Exosuit Shield Juggernaut).
 *
 * Verified Right-Hand-Rule Joint Sign Conventions (local forward = -Z, up = +Y, right = +X):
 * - Shield mounted in leftArm.elbow at rotation.x = -Math.PI/2:
 *     when lShX + lElX ≈ +1.65 (with torsoPitch = -0.08), curved tower shield stands DEAD VERTICAL facing -Z!
 * - M90-H Sledgehammer mounted in rightArm.elbow at rotation.x = -Math.PI/2:
 *     when rShX + rElX ≈ +1.65 (with torsoPitch = -0.08), barrel points DEAD LEVEL FORWARD (-Z)!
 *
 * Attack Variants:
 * - 0: Phalanx Flak Volley (plants curved tower shield, pokes Sledgehammer around right shield edge + heavy recoil)
 * - 1: Boosted Bull-Rush Shield Charge (low juggernaut brace + roaring electric-cyan dorsal ram-jets!)
 * - 2: Seismic Shield-Slam Shockwave (heaves tower shield overhead, slams serrated bottom edge into floor deck!)
 * - 3: Berserk Unshielded Drum-Dump (aggressive rapid 2-shot auto-shotgun push after shield is shattered!)
 */
export function updateAegisAnimation(
  rig: AegisMeshRig,
  input: EnemyAnimationInput,
  gaitPhase: { value: number }
): void {
  const { pelvis, torso, head, visorMat, setBoosterPlume } = rig.torsoParts;
  const { leftLeg, rightLeg, leftArm, rightArm, flakCoilMat } = rig.limbs;
  const { shieldGroup, setShieldVisualState } = rig.shieldRig;
  const dt = input.dt;
  const t = input.elapsed;
  const smooth = 1 - Math.exp(-13 * dt);

  const variant = input.attackVariant;
  const ap = input.attackProgress;
  const isAttacking =
    input.behavior === 'windup' ||
    input.behavior === 'attack' ||
    input.behavior === 'recover';

  // Shield charge intensity spikes dramatically during Bull-Rush & Seismic Slam!
  const chargePulse =
    variant === 1 && (input.behavior === 'windup' || input.behavior === 'attack')
      ? 0.55 + (input.behavior === 'attack' ? 0.45 : ap * 0.45)
      : variant === 2 && input.behavior === 'windup'
        ? ap * 0.85
        : 0;

  shieldGroup.visible = input.shieldActive;
  setShieldVisualState(input.shieldActive, chargePulse, t);

  const boosterPower = input.boosterIntensity ?? 0;
  setBoosterPlume(boosterPower, t);

  visorMat.emissiveIntensity = 3.2 + chargePulse * 3.0;
  flakCoilMat.emissiveIntensity =
    2.4 + (variant === 0 || variant === 3 ? (input.behavior === 'attack' ? 3.2 : 1.0) : 0);

  // ---------------------------------------------------------------------------
  // 1. HEAVY JUGGERNAUT COLLAPSE (DEATH)
  // ---------------------------------------------------------------------------
  if (input.behavior === 'dead') {
    const p = input.deadProgress;
    const ease = 1 - Math.pow(1 - p, 3);
    setBoosterPlume(0, t);
    pelvis.position.set(0, 0.98 - ease * 0.8, ease * 0.24);
    pelvis.rotation.set(-ease * 1.44, 0, -ease * 0.24);
    torso.rotation.set(-0.2 * ease, 0, 0);
    leftArm.shoulder.rotation.set(0.3 * ease, 0, -0.75 * ease);
    rightArm.shoulder.rotation.set(0.4 * ease, 0, 0.72 * ease);
    leftLeg.hip.rotation.x = 0.22 * ease;
    rightLeg.hip.rotation.x = -0.24 * ease;
    return;
  }

  // ---------------------------------------------------------------------------
  // 2. SHIELD-SHATTER OVERLOAD STAGGER (Flung wide open after projector lens pops!)
  // ---------------------------------------------------------------------------
  if (input.behavior === 'staggered' || input.staggerTimer > 0) {
    setBoosterPlume(0, t);
    const sway = Math.sin(t * 14) * 0.1;
    pelvis.position.set(0, 0.84, 0.06);
    pelvis.rotation.set(0.14, sway * 0.5, sway * 0.4);
    torso.rotation.set(0.28, -0.22 + sway, 0.12);
    head.rotation.set(0.26, sway * 1.4, -0.1);
    leftLeg.hip.rotation.x = 0.36;
    leftLeg.knee.rotation.x = -0.66;
    rightLeg.hip.rotation.x = -0.22;
    rightLeg.knee.rotation.x = -0.58;
    // Left arm thrown wide open, right arm sagging back
    leftArm.shoulder.rotation.set(0.32, -0.45, -0.58);
    leftArm.elbow.rotation.x = 0.52;
    rightArm.shoulder.rotation.set(0.18, 0.12, 0.34);
    rightArm.elbow.rotation.x = 0.58;
    visorMat.emissiveIntensity = 1.0 + Math.abs(Math.sin(t * 32)) * 2.6;
    return;
  }

  // ---------------------------------------------------------------------------
  // 3. HEAVY STOMPING JUGGERNAUT GAIT & PHALANX GUARD BASELINE
  // ---------------------------------------------------------------------------
  const stride = Math.min(1, input.speedRatio);
  gaitPhase.value += dt * (2.2 + stride * 5.6);
  const g = gaitPhase.value;

  const stomp = Math.abs(Math.sin(g)) * 0.045 * stride + Math.sin(t * 2.0) * 0.008;
  let hipY = 0.97 - stride * 0.035 + stomp;
  let pelvPitch = -0.05 * stride;
  let pelvYaw = 0;
  let pelvRoll = Math.sin(g) * 0.045 * stride;

  // Heavy deliberate juggernaut stride (thigh forward > 0, knee flex backward < 0)
  const swing = Math.sin(g) * 0.56 * stride;
  let lHipX = swing + (1 - stride) * 0.14;
  let lKneeX = -Math.max(0.14, -Math.cos(g) * 0.62 * stride + 0.16);
  let rHipX = -swing - (1 - stride) * 0.12;
  let rKneeX = -Math.max(0.14, Math.cos(g) * 0.62 * stride + 0.16);

  // Bladed Phalanx Guard: left shoulder angled slightly forward (-0.26 Y) so curved tower shield leads!
  let torsoPitch = -0.08;
  let torsoYaw = input.shieldActive ? -0.26 : -0.14;
  let headPitch = 0.06 + input.aimPitch * 0.35;
  let headYaw = -torsoYaw * 0.85;

  // Left Shield Arm (verified dead-vertical forward -Z when lShX + lElX = 1.65 with torsoPitch = -0.08!)
  let lShX = input.shieldActive ? 0.32 : 0.18;
  let lShY = input.shieldActive ? 0.26 : 0.12;
  let lShZ = input.shieldActive ? 0.0 : -0.14;
  let lElX = input.shieldActive ? 1.33 : 0.68;

  // Right Sledgehammer Shotgun Arm (verified dead-level forward -Z right beside shield edge!)
  let rShX = 0.42 + input.aimPitch * 0.42;
  let rShY = input.shieldActive ? 0.26 : 0.18;
  let rShZ = 0.02;
  let rElX = 1.23;

  // ---------------------------------------------------------------------------
  // 4. 4-MOVE HEAVY JUGGERNAUT COMBAT CHOREOGRAPHY
  // ---------------------------------------------------------------------------
  if (isAttacking) {
    if (variant === 0) {
      // MOVE 1: PHALANX FLAK VOLLEY (braces shield rock-solid, punches Sledgehammer forward + recoil!)
      if (input.behavior === 'windup') {
        hipY = 0.93;
        torsoPitch = -0.1;
        torsoYaw = -0.32;
        headYaw = 0.28;
        lShX = 0.36;
        lShY = 0.32;
        lElX = 1.31;
        rShX = 0.56 + input.aimPitch * 0.45;
        rShY = 0.32;
        rElX = 1.11;
      } else if (input.behavior === 'attack') {
        const kick = Math.max(0, 1 - ap * 2.1);
        hipY = 0.94;
        torsoPitch = -0.08 + kick * 0.2;
        torsoYaw = -0.32 + kick * 0.14;
        headYaw = 0.26;
        lShX = 0.36;
        lShY = 0.32;
        lElX = 1.31;
        rShX = 0.56 + kick * 0.46;
        rShY = 0.32;
        rElX = 1.11 - kick * 0.18;
      }
    } else if (variant === 1) {
      // MOVE 2: BOOSTED BULL-RUSH SHIELD CHARGE!
      if (input.behavior === 'windup') {
        // Drops into terrifying armored bull-crouch as dorsal ram-jets spool up!
        const c = Math.min(1, ap * 1.8);
        hipY = 0.96 - c * 0.18;
        pelvPitch = -0.2 * c;
        torsoPitch = -0.22 * c - 0.06;
        torsoYaw = -0.34;
        headPitch = 0.26 * c;
        headYaw = 0.3;
        lHipX = 0.65 * c;
        lKneeX = -0.82 * c - 0.14;
        rHipX = -0.42 * c;
        rKneeX = -0.68 * c - 0.14;
        // Tuck curved tower shield tight like a battering ram!
        lShX = 0.52;
        lShY = 0.34;
        lElX = 1.28;
        rShX = -0.08;
        rShY = 0.18;
        rShZ = 0.18;
        rElX = 1.15;
      } else if (input.behavior === 'attack') {
        // FULL-SPEED ROCKET-BOOSTED SHIELD BATTERING RAM!
        const strideFast = Math.sin(t * 22) * 0.72;
        hipY = 0.8 + Math.abs(Math.cos(t * 22)) * 0.04;
        pelvPitch = -0.28;
        torsoPitch = -0.24;
        torsoYaw = -0.36;
        headPitch = 0.34;
        headYaw = 0.32;
        lHipX = strideFast + 0.18;
        lKneeX = -Math.max(0.25, -Math.cos(t * 22) * 0.85 + 0.35);
        rHipX = -strideFast + 0.12;
        rKneeX = -Math.max(0.25, Math.cos(t * 22) * 0.85 + 0.35);
        lShX = 0.62;
        lShY = 0.36;
        lElX = 1.32;
        rShX = -0.18;
        rShY = 0.16;
        rShZ = 0.24;
        rElX = 1.05;
      } else {
        // Heavy skid-halt braking recovery
        const rec = 1 - ap;
        hipY = 0.97 - rec * 0.14;
        pelvPitch = 0.14 * rec;
        torsoPitch = 0.12 * rec - 0.08;
      }
    } else if (variant === 2) {
      // MOVE 3: SEISMIC SHIELD-SLAM SHOCKWAVE!
      if (input.behavior === 'windup') {
        // Heaves massive tower shield HIGH overhead, exposing torso briefly before slamming!
        const lift = Math.min(1, ap * 1.4);
        hipY = 0.98 + lift * 0.05;
        pelvPitch = 0.12 * lift;
        torsoPitch = 0.2 * lift;
        torsoYaw = -0.18;
        headPitch = -0.18 * lift;
        headYaw = 0.15;
        lShX = 0.32 + lift * 1.48; // Raises left arm & tower shield high overhead!
        lShY = 0.18;
        lElX = 1.33 - lift * 0.38;
        rShX = -0.12;
        rShZ = 0.22;
        rElX = 0.92;
      } else if (input.behavior === 'attack') {
        // SMASHES serrated bottom shield rim straight into floor deck!
        const slam = Math.min(1, ap * 3.2);
        hipY = 0.98 - slam * 0.34;
        pelvPitch = -0.26 * slam;
        torsoPitch = -0.34 * slam;
        torsoYaw = -0.22;
        headPitch = 0.28 * slam;
        headYaw = 0.2;
        lHipX = 0.85 * slam;
        lKneeX = -1.05 * slam - 0.14;
        rHipX = -0.32 * slam;
        rKneeX = -1.12 * slam - 0.14;
        lShX = 0.65;
        lShY = 0.22;
        lElX = 1.24;
        // Sweep right shotgun arm cleanly back & outward so Sledgehammer stays well clear of floor deck!
        rShX = -0.46;
        rShY = -0.22;
        rShZ = 0.52;
        rElX = 0.78;
      } else {
        // Heavy hydraulic rise back to guard
        const rec = 1 - ap;
        hipY = 0.97 - rec * 0.3;
        torsoPitch = -0.08 - rec * 0.24;
        lHipX = 0.14 + rec * 0.65;
        lKneeX = -(0.16 + rec * 0.85);
        rHipX = -0.12 - rec * 0.18;
        rKneeX = -(0.16 + rec * 0.88);
        rShX = 0.42 - rec * 0.75;
        rShZ = 0.02 + rec * 0.4;
      }
    } else if (variant === 3) {
      // MOVE 4: BERSERK UNSHIELDED AUTO-SHOTGUN SALVO!
      if (input.behavior === 'attack') {
        const kick = Math.max(0, Math.sin(ap * Math.PI * 4)) * 0.24;
        torsoPitch = -0.14 + kick * 0.55;
        torsoYaw = -0.14 + kick * 0.2;
        rShX = 0.56 + kick * 0.82;
        rShY = 0.14;
        rElX = 1.12 - kick * 0.22;
        lShX = 0.58;
        lShY = -0.18;
        lShZ = -0.16;
        lElX = 1.04;
      }
    }
  }

  // Hit-flinch overlay (heavier, armored micro-flinch unless shield is shattered!)
  if (input.flinchTimer > 0) {
    const f = Math.sin(Math.min(1, input.flinchTimer / 0.18) * Math.PI);
    const scale = input.shieldActive ? 0.55 : 1.0;
    torsoPitch += 0.2 * f * scale;
    torsoYaw += input.flinchDirX * 0.22 * f * scale;
    headPitch += 0.14 * f * scale;
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

  leftArm.shoulder.rotation.x += (lShX - leftArm.shoulder.rotation.x) * smooth;
  leftArm.shoulder.rotation.y += (lShY - leftArm.shoulder.rotation.y) * smooth;
  leftArm.shoulder.rotation.z += (lShZ - leftArm.shoulder.rotation.z) * smooth;
  leftArm.elbow.rotation.x += (lElX - leftArm.elbow.rotation.x) * smooth;

  rightArm.shoulder.rotation.x += (rShX - rightArm.shoulder.rotation.x) * smooth;
  rightArm.shoulder.rotation.y += (rShY - rightArm.shoulder.rotation.y) * smooth;
  rightArm.shoulder.rotation.z += (rShZ - rightArm.shoulder.rotation.z) * smooth;
  rightArm.elbow.rotation.x += (rElX - rightArm.elbow.rotation.x) * smooth;
}
