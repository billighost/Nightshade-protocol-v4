import * as THREE from 'three';
import { LOCOMOTION_CONFIG } from '../locomotion';
import { BIND_POSE, type MixamoHumanoidRig } from '../skeleton/mixamoBones';
import { solveTwoBoneArmIK } from '../skeleton/ikSolver';
import { alignWeaponHandInSpine2 } from './combatAimIK';
import type { AgentAnimationInput, AnimatorMemory } from './types';

const _airTargetR = new THREE.Vector3();
const _airTargetL = new THREE.Vector3();
const _airPoleR = new THREE.Vector3();
const _airPoleL = new THREE.Vector3();
const _gearFloatAxis = new THREE.Vector3(1, 0, 0);
const _gearFloatQuat = new THREE.Quaternion();
const _airAimFwd = new THREE.Vector3();
const _airAimRight = new THREE.Vector3();
const _airAimUp = new THREE.Vector3();
const _handX = new THREE.Vector3();
const _handY = new THREE.Vector3();
const _handZ = new THREE.Vector3();
const _matHand = new THREE.Matrix4();
const _qDesiredHand = new THREE.Quaternion();
const _qChain = new THREE.Quaternion();
const _qChainInv = new THREE.Quaternion();

const _rollHandTarget = new THREE.Vector3();
const _rollHandPole = new THREE.Vector3();
const _qRollAxis = new THREE.Quaternion();
const _qRollDiag = new THREE.Quaternion();
const _rollAxisVec = new THREE.Vector3();

const _qAirArm = new THREE.Quaternion();
const _qAirFore = new THREE.Quaternion();
const _qAirHand = new THREE.Quaternion();
const _airEuler = new THREE.Euler(0, 0, 0, 'XYZ');

/**
 * Helper to orient left support hand cleanly around VIPER-X4 foregrip during mid-air jumps.
 */
function alignAirSmgLeftHand(
  rig: MixamoHumanoidRig,
  pitch: number,
  yaw: number,
  roll: number,
  weight: number
): void {
  if (weight <= 0.001) return;
  const sinP = Math.sin(pitch);
  const cosP = Math.cos(pitch);
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  _airAimFwd.set(-sinY * cosP, sinP, -cosY * cosP).normalize();
  _airAimRight.set(cosY, 0, -sinY).normalize();
  _airAimUp.crossVectors(_airAimRight, _airAimFwd).normalize();

  if (Math.abs(roll) > 1e-4) {
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    const rx = _airAimRight.x * c + _airAimUp.x * s;
    const ry = _airAimRight.y * c + _airAimUp.y * s;
    const rz = _airAimRight.z * c + _airAimUp.z * s;
    _airAimRight.set(rx, ry, rz).normalize();
    _airAimUp.crossVectors(_airAimRight, _airAimFwd).normalize();
  }

  _handZ.copy(_airAimUp).multiplyScalar(0.62).addScaledVector(_airAimRight, 0.78).normalize();
  _handY.copy(_airAimFwd).negate().multiplyScalar(0.86).addScaledVector(_airAimUp, -0.51).normalize();
  _handX.crossVectors(_handY, _handZ).normalize();
  _handZ.crossVectors(_handX, _handY).normalize();

  _matHand.makeBasis(_handX, _handY, _handZ);
  _qDesiredHand.setFromRotationMatrix(_matHand);
  _qChain
    .copy(rig.leftShoulder.quaternion)
    .multiply(rig.leftArm.quaternion)
    .multiply(rig.leftForeArm.quaternion);
  _qChainInv.copy(_qChain).invert();
  _qDesiredHand.premultiply(_qChainInv);

  rig.leftHand.quaternion.slerp(_qDesiredHand, weight);
}

/**
 * AAA Tactical Soldier 5-Phase Jump & Airborne Kinematics
 * (Call of Duty: MW / Ghost Recon / MGSV / Uncharted Spec-Ops Vault Jump):
 *
 * 1. **Explosive Launch Drive (`airTime < 0.14 && vy > 2.2`)**:
 *    - Trailing leg snaps into full calf toe-off extension (`ankle -34°`, `toe +28°`) while lead
 *      knee punches high forward (`+64° hip, -104° knee`) with natural pelvis-vs-thorax counter-twist!
 * 2. **Tactical Hurdle Ascent (`vy > 1.1`)**:
 *    - Compact athletic forward-leaning hurdle split with momentum scaling (running jump drives
 *      longer stride split than standing vertical vault!).
 * 3. **Weightless Apex Obstacle-Clearing Tuck (`|vy| <= 1.1`)**:
 *    - Both knees pull smoothly up into a tight vault tuck so boots clear `0.98m` cover barricades
 *      cleanly, while the back-slung SMG visibly floats upward with real weightless inertia!
 * 4. **Proactive Ground-Seeking Landing Brace (`vy < -1.1`)**:
 *    - Lead boot reaches down-forward (`knee -32°`, dorsiflexed ankle `+16°`) with staggered rear
 *      shock-absorber leg (`knee -56°`), chest leans forward over the balls of the feet, helmet
 *      glances down `-16°` to spot the landing zone!
 * 5. **Combat Aim Compatibility**: Yields seamlessly to 2-Bone Aim IK during Jump-While-Shooting.
 */
export function applyDirectionalJump(
  rig: MixamoHumanoidRig,
  mem: AnimatorMemory,
  input: AgentAnimationInput
): void {
  const w = mem.airBlend;
  if (w <= 0.01) return;

  const { vy, airTime, jumpLocalX, jumpLocalZ, speedRatio } = input.locomotion;
  const airNorm = THREE.MathUtils.clamp(vy / LOCOMOTION_CONFIG.jumpVelocity, -1.3, 1.15);

  // Normalized 4-stage airborne envelopes (sum smoothly across trajectory with zero pops!)
  const launchW = THREE.MathUtils.clamp(1 - airTime / 0.15, 0, 1) * THREE.MathUtils.smoothstep(airNorm, 0.2, 0.85);
  const ascentW = THREE.MathUtils.smoothstep(airNorm, 0.14, 0.85) * (1 - launchW * 0.65);
  const apexW = Math.exp(-airNorm * airNorm * 3.8);
  const descentW = THREE.MathUtils.smoothstep(-airNorm, 0.12, 0.92);

  // Momentum factor: sprint-jumps open into a longer parkour hurdle; standing jumps tuck compactly
  const fwdMomentum = THREE.MathUtils.clamp(Math.max(jumpLocalZ, speedRatio * 0.75), 0, 1);

  const dirX = jumpLocalX;
  const dirZ = jumpLocalZ;
  const isJumpingLeft = dirX < -0.32;
  const isJumpingRight = dirX > 0.32;
  const isJumpingBack = dirZ < -0.32;

  // --- LOWER BODY TACTICAL SOLDIER JUMP KINEMATICS ---
  // Default Forward / Standing Spec-Ops Vault Jump:
  //   Launch:  Left knee punches high (+1.18 hip, -1.78 knee), Right pushes straight back-down (-0.48 hip, -0.18 knee, toe-point!)
  //   Ascent:  Dynamic parkour/tactical hurdle split (Left +1.14/-1.68, Right -0.36/-1.32 tucked trailing heel!)
  //   Apex:    Athletic staggered obstacle-clearing tuck (Left +1.04/-1.72, Right +0.38/-1.58)
  //   Descent: Staggered proactive landing brace (Left +0.44/-0.54/+0.26 ankle, Right -0.08/-0.82/+0.18 ankle)
  let lUpX =
    (1.18 + fwdMomentum * 0.1) * launchW +
    (1.14 + fwdMomentum * 0.14) * ascentW +
    1.04 * apexW +
    0.44 * descentW;
  let lKnee =
    -1.78 * launchW +
    -1.68 * ascentW +
    -1.72 * apexW +
    -0.54 * descentW;
  let lFootX = -0.38 * launchW - 0.32 * ascentW - 0.18 * apexW + 0.26 * descentW;
  let lToeX = 0.24 * launchW - 0.06 * descentW;
  let lUpZ = -0.1 - apexW * 0.05;

  let rUpX =
    (-0.48 - fwdMomentum * 0.12) * launchW +
    (-0.36 - fwdMomentum * 0.12) * ascentW +
    0.34 * apexW +
    -0.08 * descentW;
  let rKnee =
    -0.18 * launchW +
    -1.32 * ascentW +
    -1.58 * apexW +
    -0.82 * descentW;
  let rFootX = -0.62 * launchW - 0.42 * ascentW - 0.22 * apexW + 0.18 * descentW;
  let rToeX = 0.48 * launchW + 0.16 * ascentW;
  let rUpZ = 0.1 + apexW * 0.05;

  if (isJumpingLeft) {
    rUpX = 1.16 * (launchW + ascentW) + 0.94 * apexW + 0.36 * descentW;
    rKnee = -1.78 * (launchW + ascentW + apexW * 0.95) - 0.56 * descentW;
    rUpZ = -0.14 * (1 - descentW * 0.6);

    lUpX = -0.34 * (launchW + ascentW) + 0.32 * apexW + 0.28 * descentW;
    lKnee = -0.32 * launchW - 0.96 * ascentW - 1.24 * apexW - 0.62 * descentW;
    lUpZ = -0.36 * (1 - descentW * 0.5);
  } else if (isJumpingRight) {
    lUpX = 1.16 * (launchW + ascentW) + 0.94 * apexW + 0.36 * descentW;
    lKnee = -1.78 * (launchW + ascentW + apexW * 0.95) - 0.56 * descentW;
    lUpZ = 0.14 * (1 - descentW * 0.6);

    rUpX = -0.34 * (launchW + ascentW) + 0.32 * apexW + 0.28 * descentW;
    rKnee = -0.32 * launchW - 0.96 * ascentW - 1.24 * apexW - 0.62 * descentW;
    rUpZ = 0.36 * (1 - descentW * 0.5);
  } else if (isJumpingBack) {
    lUpX = 0.72 * (launchW + ascentW + apexW) + 0.32 * descentW;
    lKnee = -1.34 * (launchW + ascentW + apexW) - 0.56 * descentW;
    rUpX = 0.54 * (launchW + ascentW + apexW) + 0.22 * descentW;
    rKnee = -1.12 * (launchW + ascentW + apexW) - 0.64 * descentW;
  }

  // Pelvis athletic lift at launch & apex tuck -> proactive pre-landing drop!
  const airHipY = BIND_POSE.hipsY + 0.04 * launchW + 0.075 * apexW - 0.065 * descentW;
  const airHipPitch =
    -0.08 * launchW - (0.14 + fwdMomentum * 0.08) * ascentW - 0.22 * apexW - 0.26 * descentW - dirZ * 0.07;
  // Natural contralateral pelvis twist into the driving lead knee!
  const airPelvisYaw =
    (isJumpingLeft ? -0.18 : 0.18) * (launchW + ascentW * 0.85 + apexW * 0.5) * (1 - descentW * 0.6);

  rig.hips.position.y = THREE.MathUtils.lerp(rig.hips.position.y, airHipY, w);
  rig.hips.rotation.x = THREE.MathUtils.lerp(rig.hips.rotation.x, airHipPitch, w);
  rig.hips.rotation.y = THREE.MathUtils.lerp(rig.hips.rotation.y, airPelvisYaw, w * 0.85);
  rig.hips.rotation.z = THREE.MathUtils.lerp(rig.hips.rotation.z, -dirX * 0.18, w);

  rig.leftUpLeg.rotation.x = THREE.MathUtils.lerp(rig.leftUpLeg.rotation.x, lUpX, w);
  rig.leftUpLeg.rotation.z = THREE.MathUtils.lerp(rig.leftUpLeg.rotation.z, lUpZ, w);
  rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, Math.max(-2.2, lKnee), w);
  rig.leftFoot.rotation.x = THREE.MathUtils.lerp(rig.leftFoot.rotation.x, lFootX, w);
  rig.leftToeBase.rotation.x = THREE.MathUtils.lerp(rig.leftToeBase.rotation.x, lToeX, w);

  rig.rightUpLeg.rotation.x = THREE.MathUtils.lerp(rig.rightUpLeg.rotation.x, rUpX, w);
  rig.rightUpLeg.rotation.z = THREE.MathUtils.lerp(rig.rightUpLeg.rotation.z, rUpZ, w);
  rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, Math.max(-2.2, rKnee), w);
  rig.rightFoot.rotation.x = THREE.MathUtils.lerp(rig.rightFoot.rotation.x, rFootX, w);
  rig.rightToeBase.rotation.x = THREE.MathUtils.lerp(rig.rightToeBase.rotation.x, rToeX, w);

  // Progressive athletic torso curve: proud surge on launch -> compact forward tuck at apex -> brace on descent!
  const spineAirPitch =
    0.04 * launchW - (0.14 + fwdMomentum * 0.1) * ascentW - 0.24 * apexW - 0.28 * descentW;
  const spineCounterYaw = -airPelvisYaw * 0.92;
  rig.spine.rotation.x = THREE.MathUtils.lerp(rig.spine.rotation.x, spineAirPitch * 0.26, w * 0.85);
  rig.spine1.rotation.x = THREE.MathUtils.lerp(rig.spine1.rotation.x, spineAirPitch * 0.34, w * 0.85);
  rig.spine2.rotation.x = THREE.MathUtils.lerp(rig.spine2.rotation.x, spineAirPitch * 0.4, w * 0.85);
  rig.spine.rotation.y = THREE.MathUtils.lerp(rig.spine.rotation.y, spineCounterYaw * 0.34, w * 0.8);
  rig.spine1.rotation.y = THREE.MathUtils.lerp(rig.spine1.rotation.y, spineCounterYaw * 0.34, w * 0.8);
  rig.spine2.rotation.y = THREE.MathUtils.lerp(rig.spine2.rotation.y, spineCounterYaw * 0.32, w * 0.8);
  rig.spine.rotation.z = THREE.MathUtils.lerp(rig.spine.rotation.z, dirX * 0.12, w * 0.7);

  // Horizon-stabilized head on launch/ascent -> proactive downward glance to spot touchdown on descent!
  if (!input.ads) {
    const headSpotPitch =
      -(spineAirPitch + airHipPitch * 0.5) * 0.72 * (1 - descentW * 0.65) - 0.22 * descentW;
    rig.neck.rotation.x = THREE.MathUtils.lerp(rig.neck.rotation.x, headSpotPitch * 0.45, w * 0.8);
    rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, headSpotPitch * 0.55, w * 0.8);
  }

  // Secondary physical inertia: back-slung primaries float slightly UP at apex & lag on launch!
  const gearFloat = THREE.MathUtils.clamp(-airNorm * 0.1 + apexW * 0.08, -0.09, 0.14);
  _gearFloatQuat.setFromAxisAngle(_gearFloatAxis, -gearFloat * w * 0.75);
  rig.backSmgSocket.quaternion.copy(rig.backSmgBaseQuat).multiply(_gearFloatQuat);
  rig.backHeavySocket.quaternion.copy(rig.backHeavyBaseQuat).multiply(_gearFloatQuat);
}

/**
 * AAA Tactical Soldier Mid-Air Weapon Carriage & Counterbalance Arms:
 * - Replaces goofy wide-armed skydiver flailing with authentic spec-ops weapon discipline!
 * - **Pistol**: Right weapon arm keeps the suppressed pistol tucked cleanly outside/in front of
 *   the right chest via 2-Bone IK (bent elbow ~88°-102° clear of ribs, muzzle safely forward-down,
 *   floating subtly with airborne inertia lag!), while the left free arm drives athletically
 *   forward-up on takeoff and opens compactly (~24°) for landing balance!
 * - **SMG**: Keeps BOTH hands firmly locked on the VIPER-X4 across the chest/low-ready throughout
 *   the entire jump (left glove mathematically pinned to the foregrip!) with inertia float!
 */
export function applyAirborneBalanceArms(
  rig: MixamoHumanoidRig,
  mem: AnimatorMemory,
  input: AgentAnimationInput
): void {
  const airArmWeight = mem.airBlend * (1 - mem.readyBlend) * (input.heroTitlePose ? 0 : 1);
  if (airArmWeight <= 0.01) return;

  const { vy, airTime } = input.locomotion;
  const airNorm = THREE.MathUtils.clamp(vy / LOCOMOTION_CONFIG.jumpVelocity, -1.3, 1.15);
  const launchW = THREE.MathUtils.clamp(1 - airTime / 0.18, 0, 1) * Math.max(0, airNorm);
  const apexW = Math.exp(-airNorm * airNorm * 3.4);
  const descentW = THREE.MathUtils.smoothstep(-airNorm, 0.12, 0.92);

  // Airborne vertical inertia lag: arms & weapon lag slightly DOWN on launch, FLOAT slightly UP on descent!
  const inertiaY = -0.032 * launchW + 0.025 * apexW + 0.048 * descentW;

  if (input.activeWeapon === 'pistol') {
    // 1. Right Weapon Arm (2-Bone IK): disciplined tactical tuck clear OUTSIDE right ribs, ZERO chest clipping!
    _airTargetR.set(
      0.165 + 0.03 * descentW,
      -0.065 + inertiaY + 0.025 * launchW,
      -0.335 - 0.02 * launchW
    );
    _airPoleR.set(0.66, -0.22, 0.18);

    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _airTargetR,
      _airPoleR,
      airArmWeight
    );

    const airPistolPitch = -0.18 + 0.24 * launchW + 0.12 * apexW - 0.16 * descentW;
    const airPistolYaw = 0.22 - 0.06 * descentW;
    alignWeaponHandInSpine2(rig, airPistolPitch, airPistolYaw, -0.18, airArmWeight);

    // 2. Left Free Arm: athletic sprinter-vault lift on takeoff -> compact combat balance on descent (NOT starfish!)
    const lX = 0.88 * launchW + 0.42 * apexW + 0.28 * descentW;
    const lZ = -0.2 * launchW - 0.34 * apexW - 0.42 * descentW;
    const lY = 0.18 * launchW - 0.06 * descentW;
    const lElbow = 1.44 * launchW + 1.12 * apexW + 0.82 * descentW;
    const lPron = 1.04 * launchW + 1.18 * apexW + 1.06 * descentW;

    _airEuler.set(lX, lY, lZ, 'YXZ');
    _qAirArm.setFromEuler(_airEuler);
    _airEuler.set(lElbow, lPron, 0, 'XYZ');
    _qAirFore.setFromEuler(_airEuler);
    _airEuler.set(-0.12 * descentW + 0.08 * launchW, 0, -0.06, 'XYZ');
    _qAirHand.setFromEuler(_airEuler);

    rig.leftArm.quaternion.slerp(_qAirArm, airArmWeight);
    rig.leftForeArm.quaternion.slerp(_qAirFore, airArmWeight);
    rig.leftHand.quaternion.slerp(_qAirHand, airArmWeight);
  } else {
    // Two-Handed Disciplined Tactical SMG Jump Carriage (both hands stay locked on weapon!)
    const smgPitch = -0.12 + 0.2 * launchW + 0.08 * apexW - 0.18 * descentW;
    const smgYaw = 0.56 - 0.08 * descentW;
    const smgRoll = -0.24;

    const sinP = Math.sin(smgPitch);
    const cosP = Math.cos(smgPitch);
    const sinY = Math.sin(smgYaw);
    const cosY = Math.cos(smgYaw);
    _airAimFwd.set(-sinY * cosP, sinP, -cosY * cosP).normalize();
    _airAimRight.set(cosY, 0, -sinY).normalize();
    _airAimUp.crossVectors(_airAimRight, _airAimFwd).normalize();

    _airTargetR.set(0.13, -0.055 + inertiaY, -0.295);
    _airPoleR.set(0.54, -0.28, 0.12);

    _airTargetL
      .copy(_airTargetR)
      .addScaledVector(_airAimFwd, 0.208)
      .addScaledVector(_airAimUp, -0.014)
      .addScaledVector(_airAimRight, -0.012);
    _airPoleL.set(-0.52, -0.26, -0.04);

    solveTwoBoneArmIK(
      rig.rightShoulder,
      rig.rightArm,
      rig.rightForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _airTargetR,
      _airPoleR,
      airArmWeight
    );
    solveTwoBoneArmIK(
      rig.leftShoulder,
      rig.leftArm,
      rig.leftForeArm,
      rig.upperArmLen,
      rig.foreArmLen,
      _airTargetL,
      _airPoleL,
      airArmWeight
    );

    alignWeaponHandInSpine2(rig, smgPitch, smgYaw, smgRoll, airArmWeight);
    alignAirSmgLeftHand(rig, smgPitch, smgYaw, smgRoll, airArmWeight);
  }
}

export interface GroundRollSample {
  hipY: number;
  hipZShift: number;
  spinAngle: number;
  /** 0..1 envelope peaking during Act 1 low horizontal forward leap */
  leapWeight: number;
  /** 0..1 envelope peaking during Act 2 concrete ground-contact absorption */
  contactWeight: number;
  /** 0..1 envelope active during Act 3 tight martial shoulder/back/hip ground roll */
  tuckWeight: number;
}

/**
 * Computes exact pelvis height, monotonic roll rotation, and phase envelopes for our
 * 4-Act AAA Tactical Dive-Leap -> Ground Contact -> Flush Martial Shoulder Roll (`t` in `[0, 1]`):
 *
 * - **Act 1 (`0.00 -> 0.24`) — Explosive Low Forward Leap**:
 *   Quick spring push-off (`0.96 -> 0.80m`) launching into a sleek, low-altitude horizontal dive
 *   (`hipY ~ 0.72..0.76m`, body pitched forward `~68°`, trailing boots cleanly airborne behind,
 *   never jumping high!).
 * - **Act 2 (`0.24 -> 0.34`) — Concrete Ground Contact & Shoulder Absorption**:
 *   Body drops onto `y = 0.00m` (`hipY -> 0.45m`, `spinAngle ~ 95°..118°`) as the lead forearm
 *   and armored shoulder catch the concrete floor and convert horizontal dive speed into roll!
 * - **Act 3 (`0.34 -> 0.74`) — Flush 360° Ground-Contact Martial Shoulder Roll**:
 *   Armored upper back rolls dead flush on top of concrete at `180°` (`hipY = 0.485m` so backplate
 *   kisses `y = +0.02m` with helmet safely tucked above floor!), then rolls seamlessly onto lower
 *   back & opposite hip hugging concrete (`hipY = 0.28m` at `~275°`)!
 * - **Act 4 (`0.74 -> 1.00`) — Grounded Combat Kneel Push-Off & Stand-Up**:
 *   Lead boot plants firmly on concrete (`hipY: 0.28 -> 0.62 -> 0.96m`) rising back to combat ready!
 */
export function sampleGroundRollHipY(tRaw: number): GroundRollSample {
  const t = THREE.MathUtils.clamp(tRaw, 0, 1);

  // Continuous, strictly monotonic forward rotation (0 -> 2*PI) across all 4 acts (ZERO pops/reversals!):
  //   0.00 -> 0.16 : 0.00 -> 1.18 rad (0° -> 68° crisp launch into streamlined low horizontal leap)
  //   0.16 -> 0.28 : 1.18 -> 1.72 rad (68° -> 99° low horizontal glide descending onto ground contact)
  //   0.28 -> 0.72 : 1.72 -> 5.30 rad (99° -> 304° full flush shoulder -> upper-back -> hip roll on concrete)
  //   0.72 -> 1.00 : 5.30 -> 6.283 rad (304° -> 360° grounded boot plant rising back upright)
  let spinAngle: number;
  if (t < 0.16) {
    const u = t / 0.16;
    spinAngle = 1.18 * Math.sin(u * Math.PI * 0.5);
  } else if (t < 0.28) {
    const u = (t - 0.16) / 0.12;
    spinAngle = 1.18 + 0.54 * u;
  } else if (t < 0.72) {
    const u = (t - 0.28) / 0.44;
    // Slight smooth S-emphasis so shoulder-to-hip momentum feels weighty & accelerating on impact
    const s = u * 0.55 + (u * u * (3 - 2 * u)) * 0.45;
    spinAngle = 1.72 + (5.3 - 1.72) * s;
  } else {
    const u = (t - 0.72) / 0.28;
    spinAngle = 5.3 + (Math.PI * 2 - 5.3) * Math.sin(u * Math.PI * 0.5);
  }

  let hipY: number;
  if (t < 0.06) {
    // Explosive low crouch push-off loading into horizontal leap
    const u = THREE.MathUtils.smoothstep(t, 0, 0.06);
    hipY = THREE.MathUtils.lerp(BIND_POSE.hipsY, 0.78, u);
  } else if (t < 0.18) {
    // Act 1: Streamlined LOW horizontal leap skimming tightly over the concrete (peaks ~0.75m, NEVER high!)
    const u = (t - 0.06) / 0.12;
    hipY = THREE.MathUtils.lerp(0.78, 0.68, u) + Math.sin(u * Math.PI) * 0.03;
  } else if (t < 0.29) {
    // Act 2: Descending smoothly onto planted left forearm & lead shoulder (0.52m keeps helmet cleanly clear above floor!)
    const u = THREE.MathUtils.smoothstep(t, 0.18, 0.29);
    hipY = THREE.MathUtils.lerp(0.68, 0.505, u);
  } else if (t < 0.56) {
    // Act 3a: Flush armored upper-back roll ON TOP OF concrete (0.485..0.505m -> backplate y = +0.02m, ZERO clipping!)
    const u = (t - 0.29) / 0.27;
    hipY = THREE.MathUtils.lerp(0.505, 0.45, u) + Math.sin(u * Math.PI) * 0.025;
  } else if (t < 0.72) {
    // Act 3b: Rolling across lower back onto opposite hip & tucked thigh directly on concrete!
    const u = THREE.MathUtils.smoothstep(t, 0.56, 0.72);
    hipY = THREE.MathUtils.lerp(0.45, 0.28, u);
  } else if (t < 0.88) {
    // Act 4a: Grounded combat kneel / planted lead boot push-off
    const u = THREE.MathUtils.smoothstep(t, 0.72, 0.88);
    hipY = THREE.MathUtils.lerp(0.28, 0.62, u);
  } else {
    // Act 4b: Rising smoothly back to standing combat stance
    const u = THREE.MathUtils.smoothstep(t, 0.88, 1.0);
    hipY = THREE.MathUtils.lerp(0.62, BIND_POSE.hipsY, u);
  }

  const leapWeight =
    THREE.MathUtils.smoothstep(t, 0.02, 0.08) * (1 - THREE.MathUtils.smoothstep(t, 0.17, 0.26));
  const contactWeight = Math.sin(THREE.MathUtils.clamp((t - 0.16) / 0.18, 0, 1) * Math.PI);
  const tuckWeight =
    THREE.MathUtils.smoothstep(t, 0.18, 0.28) * (1 - THREE.MathUtils.smoothstep(t, 0.72, 0.94));

  // Rolling wheel pivot compensation so shoulder/back contact rolls smoothly across concrete
  const hipZShift = Math.sin(spinAngle) * 0.11;
  return { hipY, hipZShift, spinAngle, leapWeight, contactWeight, tuckWeight };
}

/**
 * 4-Direction AAA Low Forward Dive-Leap -> Ground Contact -> Flush Martial Shoulder Combat Roll:
 * - Act 1 (`0.00..0.24`): Operative explodes into a sleek, low-altitude horizontal forward leap
 *   (body stretched ~68° forward, trailing legs airborne behind, head spotting the landing zone,
 *   support arm reaching forward-down toward the concrete!).
 * - Act 2 (`0.24..0.34`): Support forearm & lead armored shoulder catch the concrete floor,
 *   snapping knees & chin into a tight protective martial curl!
 * - Act 3 (`0.34..0.74`): Flush 360° diagonal shoulder -> armored upper-back (`y = +0.02m`) ->
 *   opposite-hip roll right ON TOP of the concrete (zero floating, zero underground clipping!).
 * - Act 4 (`0.74..1.00`): Lead boot plants on concrete and drives smoothly back to combat ready!
 */
export function applyMartialShoulderRoll(
  rig: MixamoHumanoidRig,
  input: AgentAnimationInput
): boolean {
  const { rollTimer, rollLocalX, rollLocalZ } = input.locomotion;
  if (rollTimer <= 0) return false;

  const t = THREE.MathUtils.clamp(1 - rollTimer / LOCOMOTION_CONFIG.rollDuration, 0, 1);
  const recoverT = THREE.MathUtils.smoothstep(t, 0.72, 1.0);
  const { hipY, hipZShift, spinAngle, leapWeight, contactWeight, tuckWeight } =
    sampleGroundRollHipY(t);

  // Constant diagonal shoulder-to-hip roll axis (20° martial offset across left shoulder -> right hip)
  const travelAngle = Math.atan2(rollLocalX, rollLocalZ);
  const diagSign = rollLocalX >= 0 ? 1 : -1;
  const diagonalYaw = travelAngle + diagSign * 0.34;

  _rollAxisVec.set(-Math.cos(diagonalYaw), 0, -Math.sin(diagonalYaw)).normalize();
  _qRollAxis.setFromAxisAngle(_rollAxisVec, spinAngle);

  // During Act 1 low leap, counter-yaw subtly so the dive body aligns laser-straight into travel direction;
  // right at Act 2 ground contact, release cleanly into the 20° diagonal shoulder tuck!
  const exitCrouchEnv = Math.sin(THREE.MathUtils.clamp((t - 0.7) / 0.3, 0, 1) * Math.PI);
  const bodyDiagYaw = diagSign * (-0.24 * leapWeight + 0.32 * tuckWeight) * (1 - recoverT);
  _qRollDiag.setFromEuler(
    new THREE.Euler(-rollLocalZ * exitCrouchEnv * 0.22, bodyDiagYaw, 0)
  );

  // Travel-aligned wheel pivot compensation on concrete
  const shiftX = -rollLocalX * hipZShift;
  const shiftZ = rollLocalZ * hipZShift;
  rig.hips.position.set(shiftX, hipY, shiftZ);
  rig.hips.quaternion.copy(_qRollAxis).multiply(_qRollDiag);

  // Spine:
  //   Act 1 (Low Leap): Taut, streamlined athletic dive line (-0.16 rad subtle forward curve)
  //   Act 2/3 (Contact & Ground Roll): Tight rounded martial wheel (-1.36 rad total curl!)
  //   Act 4 (Stand-Up): Controlled combat-crouch forward lean (-0.24 rad) settling upright!
  const spineCurl = -0.16 * leapWeight - 1.36 * tuckWeight - 0.24 * exitCrouchEnv;
  const shoulderTuckYaw = -diagSign * 0.38 * tuckWeight;
  rig.spine.rotation.set(spineCurl * 0.32, shoulderTuckYaw * 0.4, 0);
  rig.spine1.rotation.set(spineCurl * 0.36, shoulderTuckYaw * 0.35, 0);
  rig.spine2.rotation.set(spineCurl * 0.32, shoulderTuckYaw * 0.25, 0);

  // Head & Neck:
  //   Act 1 (Low Leap): Head lifts upward in Spine2 space (+0.62 total) to SPOT THE LANDING FLOOR AHEAD!
  //   Act 2/3 (Contact & Roll): Chin snaps deeply into opposite collarbone (-1.34 total) well before shoulder impact so helmet clears floor cleanly!
  const spotWeight = leapWeight * (1 - THREE.MathUtils.smoothstep(t, 0.15, 0.21));
  const headTuck = Math.max(tuckWeight, contactWeight * 0.85);
  rig.neck.rotation.set(
    0.32 * spotWeight - 0.74 * headTuck,
    -shoulderTuckYaw * 1.05,
    diagSign * 0.36 * headTuck
  );
  rig.head.rotation.set(
    0.3 * spotWeight - 0.6 * headTuck,
    0,
    diagSign * 0.28 * headTuck
  );

  // Legs across all 4 Acts:
  //   0.00..0.06 : Explosive push-off crouch (drivePush)
  //   0.06..0.22 : Streamlined airborne low-leap trailing legs (staggered athletic trail, clear off floor!)
  //   0.22..0.72 : Tight compact cannonball knee tuck (hip +1.84, knee -2.28!)
  //   0.72..1.00 : Grounded combat one-knee lunge push-off -> smooth rise to feet!
  const drivePush = Math.sin(THREE.MathUtils.clamp(t / 0.08, 0, 1) * Math.PI);
  const midTuck =
    THREE.MathUtils.smoothstep(t, 0.18, 0.31) * (1 - THREE.MathUtils.smoothstep(t, 0.68, 0.82));
  const exitKneel = Math.sin(THREE.MathUtils.clamp((t - 0.7) / 0.3, 0, 1) * Math.PI);

  // Right leg: drives powerfully off floor -> trails long & streamlined behind during low leap -> snaps to tight tuck -> plants front boot on recovery!
  rig.rightUpLeg.rotation.set(
    -0.28 * drivePush - 0.22 * leapWeight + 1.84 * midTuck + 1.28 * exitKneel,
    0.16 * midTuck,
    0.08 * leapWeight + 0.22 * midTuck + 0.08 * exitKneel
  );
  rig.rightLeg.rotation.set(
    -0.55 * drivePush - 0.26 * leapWeight - 2.28 * midTuck - 1.54 * exitKneel,
    0,
    0
  );
  rig.rightFoot.rotation.set(
    -0.48 * drivePush - 0.42 * leapWeight - 0.38 * midTuck + 0.28 * exitKneel,
    0,
    0
  );
  rig.rightToeBase.rotation.set(0.38 * drivePush + 0.32 * exitKneel, 0, 0);

  // Left leg: kicks dynamically behind with natural staggered bend during leap -> tight cannonball tuck -> low trailing knee push-off!
  rig.leftUpLeg.rotation.set(
    0.65 * drivePush + 0.06 * leapWeight + 1.72 * midTuck - 0.22 * exitKneel,
    -0.16 * midTuck,
    -0.08 * leapWeight - 0.2 * midTuck - 0.08 * exitKneel
  );
  rig.leftLeg.rotation.set(
    -1.08 * drivePush - 0.58 * leapWeight - 2.22 * midTuck - 1.72 * exitKneel,
    0,
    0
  );
  rig.leftFoot.rotation.set(
    -0.25 * drivePush - 0.38 * leapWeight - 0.42 * midTuck - 0.35 * exitKneel,
    0,
    0
  );
  rig.leftToeBase.rotation.set(0.4 * exitKneel, 0, 0);

  // Right weapon arm: keeps weapon tucked cleanly in front of right chest throughout leap & roll
  // (outward pole guarantees elbow clears right ribs & weapon never clips floor or torso!)
  rig.rightShoulder.rotation.set(0.12 * tuckWeight + 0.08 * leapWeight, 0, -0.1 * tuckWeight);
  _rollHandTarget.set(
    THREE.MathUtils.lerp(0.15, 0.18, leapWeight),
    THREE.MathUtils.lerp(-0.02, 0.04, leapWeight),
    THREE.MathUtils.lerp(-0.27, -0.32, leapWeight)
  );
  _rollHandPole.set(0.78, -0.16, 0.14);
  solveTwoBoneArmIK(
    rig.rightShoulder,
    rig.rightArm,
    rig.rightForeArm,
    rig.upperArmLen,
    rig.foreArmLen,
    _rollHandTarget,
    _rollHandPole,
    1.0
  );
  alignWeaponHandInSpine2(rig, 0.14, 0.52, -0.32, 1.0);

  // Left support arm:
  //   Act 1 (Low Leap): Reaches FORWARD & DOWN toward the concrete landing zone (`(-0.18, +0.26, -0.36)`)!
  //   Act 2 (Ground Contact): Plants palm/forearm firmly on concrete absorbing impact & guiding left shoulder!
  //   Act 3 (Back/Hip Roll): Tucks cleanly across chest/ribs!
  //   Act 4 (Stand-Up): Braces lightly off floor/knee as operative rises!
  const exitPush = Math.sin(THREE.MathUtils.clamp((t - 0.68) / 0.22, 0, 1) * Math.PI);
  const reachFwd = Math.max(leapWeight, contactWeight * 0.72);

  rig.leftShoulder.rotation.set(
    0.22 * reachFwd + 0.12 * exitPush,
    0,
    0.16 * reachFwd + 0.1 * exitPush
  );
  _rollHandTarget.set(
    THREE.MathUtils.lerp(-0.14, -0.22, Math.max(reachFwd, exitPush * 0.7)),
    THREE.MathUtils.lerp(-0.04, 0.25, leapWeight) - 0.24 * exitPush + 0.06 * contactWeight,
    THREE.MathUtils.lerp(-0.25, -0.38, Math.max(reachFwd, exitPush * 0.7))
  );
  _rollHandPole.set(-0.78, -0.08, 0.14);
  solveTwoBoneArmIK(
    rig.leftShoulder,
    rig.leftArm,
    rig.leftForeArm,
    rig.upperArmLen,
    rig.foreArmLen,
    _rollHandTarget,
    _rollHandPole,
    1.0
  );
  rig.leftHand.rotation.set(-0.72 * Math.max(contactWeight, leapWeight * 0.65, exitPush * 0.7), 0, 0);

  return true;
}
