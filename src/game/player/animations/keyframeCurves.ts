/**
 * Research-Backed Biomechanical Motion-Capture Keyframe Curve Engine.
 *
 * Replaces simplistic `Math.sin(phase)` pendulum oscillations with periodic
 * Catmull-Rom cubic Hermite splines sampled from published human gait kinematics:
 * - Novacheck, T. F. (1998). "The biomechanics of running." Gait & Posture, 7(1), 77-95.
 * - Winter, D. A. (2009). "Biomechanics and Motor Control of Human Movement" (4th ed.).
 * - Pontzer, H. et al. (2009). "Control and function of arm swing in human walking and running."
 *
 * Key biomechanical signatures preserved:
 * 1. DOUBLE-PEAK KNEE FLEXION in both Walking and Running:
 *    - Peak #1 (Loading Response ~14% cycle): knee bends on heel/midfoot impact to absorb shock.
 *    - Mid/Late Stance Extension (~35%): knee extends powerfully for push-off propulsion.
 *    - Peak #2 (Swing Recovery ~54-72%): heel whips high behind glute (-64° walk, -112° run, -126° sprint!)
 *      to shorten leg moment of inertia before snapping forward for terminal swing!
 * 2. EXPLOSIVE ANKLE PLANTARFLEXION AT TOE-OFF (-20° walk, -32° run, -36° sprint) + swing dorsiflexion!
 * 3. TRUE 3D OBLIQUE BENT-ELBOW ARM DRIVE during running (NEVER flat straight forward/back pendulums!):
 *    - Elbows stay dynamically flexed at 78°–105° (tightening on forward upswing, opening slightly on rear drive).
 *    - Shoulder adducts ~18°–24° inward on forward drive ("fist to chin/sternum") and abducts slightly outward
 *      on backswing ("elbow past hip pocket").
 * 4. OPPOSITE-PHASE PELVIS VERTICAL COM:
 *    - Walking (inverted pendulum): HIGHEST at midstance (28% / 78%), LOWEST at heel strike (0% / 50%).
 *    - Running (spring-mass): LOWEST at midstance loading (15% / 65%), HIGHEST during double-float flight (42% / 92%).
 */

export interface Keyframe {
  /** Normalized gait phase `0.0 .. 1.0` (periodic wrap at 1.0 == 0.0) */
  t: number;
  /** Value in radians (or meters for pelvis vertical offset) */
  v: number;
}

export interface LegKeyframeTrack {
  /** UpLeg X: +forward flexion, -rear extension (rad) */
  hipX: Keyframe[];
  /** UpLeg Z: lateral abduction/adduction (rad, sign-multiplied per side) */
  hipZ: Keyframe[];
  /** Leg X: ALWAYS <= 0 anatomical rear knee bend (rad) */
  kneeX: Keyframe[];
  /** Foot X: +dorsiflexion (toes up), -plantarflexion (toe-off push) (rad) */
  ankleX: Keyframe[];
  /** ToeBase X: toe bend during push-off (rad) */
  toeX: Keyframe[];
}

export interface ArmKeyframeTrack {
  /** Arm X: +forward swing, -rear extension (rad) */
  shoulderX: Keyframe[];
  /** Arm Z: inward adduction on forward cheek drive / slight outward abduction on backswing (rad, mirrored by side) */
  shoulderAdductZ: Keyframe[];
  /** Arm Y: internal/external humerus rotation during oblique diagonal swing (rad, mirrored by side) */
  shoulderTwistY: Keyframe[];
  /** ForeArm X: ALWAYS >= 0 anatomical forward elbow flexion (rad) */
  elbowX: Keyframe[];
  /** ForeArm Y: semi-pronated neutral "handshake" rotation (rad, ~58° pronated forward -> ~84° neutral-supinated backswing, mirrored via -side) */
  foreArmPronationY: Keyframe[];
  /** Hand X: natural phase-lagged wrist flexion/dorsiflexion follow-through (rad) */
  wristFlexX: Keyframe[];
  /** Hand Z: subtle radial/ulnar wrist sway during oblique figure-8 arm arc (rad, mirrored by side) */
  wristDevZ: Keyframe[];
  /** Clavicle/Shoulder elevation & protraction coupling */
  clavicleY: Keyframe[];
}

export interface GaitCycleProfile {
  /** Horizontal lateral pelvis COM weight-shift over planted stance boot (meters, -X left, +X right) */
  pelvisX: Keyframe[];
  /** Vertical pelvis COM oscillation in meters (periodic over 0..1 with 2 steps per cycle) */
  pelvisY: Keyframe[];
  /** Pelvis axial yaw twist (rad, + rotates right hip forward / left hip back) */
  pelvisYaw: Keyframe[];
  /** Pelvis coronal drop/list (Trendelenburg tilt, rad) */
  pelvisRoll: Keyframe[];
  /** Thorax counter-rotation (opposite phase to pelvis yaw!) */
  spineYaw: Keyframe[];
  /** Forward trunk pitch lean (rad, negative = forward lean) */
  trunkLeanX: number;
  /** Single-leg track evaluated at `t` for Left leg and `(t + 0.5) % 1` for Right leg */
  leg: LegKeyframeTrack;
  /** Contralateral arm track evaluated at `(t + 0.5) % 1` for Left arm and `t` for Right arm
   *  (so when Left leg is at 0% front contact, Right arm is at 0% front cheek drive!) */
  arm: ArmKeyframeTrack;
}

const DEG = Math.PI / 180;
const deg = (d: number): number => d * DEG;

/** Wraps any scalar phase cleanly into `[0, 1)` */
export function wrap01(t: number): number {
  const m = t % 1;
  return m < 0 ? m + 1 : m;
}

/**
 * Evaluates a periodic `C¹`-smooth Catmull-Rom spline over a sorted array of keyframes in `[0, 1)`.
 * Uses centripetal-damped tangent slopes so double-peak knee curves NEVER overshoot into positive
 * hyperextension or ring between steep toe-off and swing recovery!
 */
export function samplePeriodicCurve(keys: Keyframe[], rawT: number): number {
  const n = keys.length;
  if (n === 0) return 0;
  if (n === 1) return keys[0].v;

  const t = wrap01(rawT);

  // Locate segment [i, i+1] wrapping cyclically across 1.0
  let i = n - 1;
  for (let k = 0; k < n; k++) {
    if (t >= keys[k].t) {
      i = k;
    } else {
      break;
    }
  }

  const iPrev = (i - 1 + n) % n;
  const iNext = (i + 1) % n;
  const iNext2 = (i + 2) % n;

  const t0 = keys[iPrev].t - (iPrev > i ? 1 : 0);
  const t1 = keys[i].t;
  const t2 = keys[iNext].t + (iNext <= i ? 1 : 0);
  const t3 = keys[iNext2].t + (iNext2 <= i ? 1 : 0) + (iNext2 <= iNext && iNext <= i ? 1 : 0);

  const p0 = keys[iPrev].v;
  const p1 = keys[i].v;
  const p2 = keys[iNext].v;
  const p3 = keys[iNext2].v;

  const tEval = t < t1 ? t + 1 : t;
  const span = Math.max(1e-5, t2 - t1);
  const u = Math.max(0, Math.min(1, (tEval - t1) / span));

  // Monotone-safe Fritsch-Carlson style finite-difference tangents (prevents knee hyperextension overshoot!)
  const d01 = (p1 - p0) / Math.max(1e-5, t1 - t0);
  const d12 = (p2 - p1) / span;
  const d23 = (p3 - p2) / Math.max(1e-5, t3 - t2);

  const m1 = d01 * d12 <= 0 ? 0 : (2 * d01 * d12) / (d01 + d12);
  const m2 = d12 * d23 <= 0 ? 0 : (2 * d12 * d23) / (d12 + d23);

  const u2 = u * u;
  const u3 = u2 * u;

  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;

  return h00 * p1 + h10 * (m1 * span) + h01 * p2 + h11 * (m2 * span);
}

// ============================================================================
// 1. TACTICAL SOLDIER "COMBAT GLIDE" PATROL WALK (Soft-Knee Loaded Gait + Lateral Weight Shift)
//    Grounded military movement: athletic forward posture (-10.5 deg), soft shock-absorbing knees
//    (-13 deg strike -> -30 deg Down weight-shift -> -15 deg passing -> -66 deg booted swing),
//    genuine lateral COM weight transfer over each planted boot (±2.2cm), minimal head-bob!
// ============================================================================
export const WALK_GAIT: GaitCycleProfile = {
  trunkLeanX: deg(-13.5),
  // Lateral Center-of-Mass transfer over the planted weight-bearing boot (eliminates robotic walk!)
  pelvisX: [
    { t: 0.0, v: 0.0 },
    { t: 0.24, v: -0.026 }, // full weight smoothly over left stance boot (-X)
    { t: 0.5, v: 0.0 },
    { t: 0.74, v: 0.026 }, // full weight smoothly over right stance boot (+X)
  ],
  // Richard Williams Tactical Contact -> Down (loaded absorption!) -> Passing -> Controlled Up
  pelvisY: [
    { t: 0.0, v: -0.002 }, // purposeful heel strike
    { t: 0.14, v: -0.024 }, // Down / Weight-Shift shock absorption under body armor (boot flush on floor!)
    { t: 0.3, v: 0.02 }, // smooth Passing glide (minimized vertical head-bob!)
    { t: 0.43, v: 0.025 }, // controlled High-Point push-off
    { t: 0.5, v: -0.002 },
    { t: 0.64, v: -0.024 },
    { t: 0.8, v: 0.02 },
    { t: 0.93, v: 0.025 },
  ],
  pelvisYaw: [
    { t: 0.0, v: deg(-8.5) }, // left hip leads cleanly into left heel strike
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(8.5) }, // right hip leads into right heel strike
    { t: 0.75, v: deg(0) },
  ],
  pelvisRoll: [
    { t: 0.0, v: deg(0) },
    { t: 0.22, v: deg(-1.7) }, // subtle grounded Trendelenburg hip stabilization (no drunken wobble!)
    { t: 0.5, v: deg(0) },
    { t: 0.72, v: deg(1.7) },
  ],
  spineYaw: [
    { t: 0.0, v: deg(8.5) }, // upper chest counter-rotates against hips for stable weapon platform!
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(-8.5) },
    { t: 0.75, v: deg(0) },
  ],
  leg: {
    hipX: [
      { t: 0.0, v: deg(34) }, // grounded heel strike
      { t: 0.14, v: deg(23) }, // Down / Weight-Shift load
      { t: 0.3, v: deg(4) }, // Passing glide
      { t: 0.48, v: deg(-14) }, // rear extension drive
      { t: 0.58, v: deg(-19) }, // peak push-off behind hip
      { t: 0.72, v: deg(11) }, // early swing knee lift
      { t: 0.86, v: deg(35) }, // terminal swing reach
      { t: 0.96, v: deg(35) },
    ],
    hipZ: [
      { t: 0.0, v: deg(4.2) }, // wider shoulder-width combat rail tracking (no tightrope!)
      { t: 0.28, v: deg(3.2) },
      { t: 0.62, v: deg(5.4) },
      { t: 0.85, v: deg(4.4) },
    ],
    // SOFT-KNEE TACTICAL COMBAT GLIDE: never locks stiffly straight!
    // -13° Contact -> -30° Down shock cushion -> -14° soft Passing -> -66° heavy boot swing clearance!
    kneeX: [
      { t: 0.0, v: deg(-13) }, // soft pre-bent heel strike
      { t: 0.14, v: deg(-30) }, // Peak #1: heavy booted Down/Weight-Shift shock absorption!
      { t: 0.34, v: deg(-14) }, // athletic soft-knee passing stance (never locked!)
      { t: 0.5, v: deg(-20) }, // heel off
      { t: 0.61, v: deg(-46) }, // toe off drive
      { t: 0.73, v: deg(-66) }, // Peak #2: booted swing clearance!
      { t: 0.88, v: deg(-28) }, // shin swings forward
      { t: 0.96, v: deg(-13) }, // soft pre-contact prep
    ],
    ankleX: [
      { t: 0.0, v: deg(9) }, // crisp heel-first dorsiflexed strike
      { t: 0.08, v: deg(-7) }, // controlled forefoot roll onto concrete
      { t: 0.3, v: deg(12) }, // tibia glides smoothly over loaded ankle
      { t: 0.47, v: deg(16) }, // deep loaded dorsiflexion before push-off
      { t: 0.61, v: deg(-24) }, // weighty boot toe-off plantarflexion!
      { t: 0.76, v: deg(6) }, // swing toe clearance
      { t: 0.92, v: deg(10) },
    ],
    toeX: [
      { t: 0.0, v: deg(0) },
      { t: 0.44, v: deg(0) },
      { t: 0.58, v: deg(28) }, // strong boot toe-box bend during push-off
      { t: 0.67, v: deg(5) },
      { t: 0.85, v: deg(0) },
    ],
  },
  arm: {
    // Research-backed human walking arm swing (Winter 2009 / Pontzer 2009 / AAA tactical locomotion):
    // - Shoulder pendulum swings naturally (+13° forward at opposite heel strike -> -16° rear extension)
    // - Elbow lags shoulder by ~10% gait phase: gently opens to ~10° at rear reversal, folds softly to ~26° at forward peak!
    // - Forearm stays steadily in neutral palm-inward thumb-forward orientation (76°..84°), NEVER twisting awkwardly!
    // - Wrist exhibits restrained ±4° passive inertial follow-through after reversal (ZERO floppy flipper wrists!)
    shoulderX: [
      { t: 0.0, v: deg(13) }, // relaxed forward peak (opposite to front leg heel strike)
      { t: 0.25, v: deg(-1) },
      { t: 0.5, v: deg(-16) }, // natural rear extension behind hip
      { t: 0.75, v: deg(-2) },
    ],
    shoulderAdductZ: [
      { t: 0.0, v: deg(3.5) }, // stays cleanly alongside thigh/hip (never crosses belly!)
      { t: 0.25, v: deg(0.5) },
      { t: 0.5, v: deg(-1.5) },
      { t: 0.75, v: deg(1.0) },
    ],
    shoulderTwistY: [
      { t: 0.0, v: deg(4) },
      { t: 0.5, v: deg(-3) },
    ],
    // ~10% phase-lagged elbow flexion behind shoulder pendulum (Winter 2009 / Perry gait analysis)
    elbowX: [
      { t: 0.08, v: deg(26) }, // soft relaxed bend peaking slightly after shoulder forward peak
      { t: 0.32, v: deg(16) }, // opens smoothly during downward gravity sweep
      { t: 0.56, v: deg(10) }, // relaxed ~10° extension at rear sweep (never locked 0°, never pumped 48°!)
      { t: 0.82, v: deg(19) }, // begins gentle upward carry
    ],
    // Steady natural palm-inward thumb-forward anatomical neutral (micro ±4° relaxation only)
    foreArmPronationY: [
      { t: 0.0, v: deg(76) },
      { t: 0.25, v: deg(80) },
      { t: 0.5, v: deg(84) },
      { t: 0.75, v: deg(80) },
    ],
    // Restrained passive wrist inertia peaking just after swing reversals (ZERO flapping!)
    wristFlexX: [
      { t: 0.14, v: deg(4) },
      { t: 0.38, v: deg(1) },
      { t: 0.64, v: deg(-4) },
      { t: 0.88, v: deg(-1) },
    ],
    wristDevZ: [
      { t: 0.0, v: deg(2.5) },
      { t: 0.5, v: deg(-2.0) },
    ],
    clavicleY: [
      { t: 0.0, v: deg(3.2) },
      { t: 0.5, v: deg(-2.8) },
    ],
  },
};

// ============================================================================
// 2. TACTICAL SOLDIER COMBAT JOG / BOUNDING RUN (Call of Duty / MGSV / Novacheck 1998)
// ============================================================================
export const RUN_GAIT: GaitCycleProfile = {
  trunkLeanX: deg(-17),
  pelvisX: [
    { t: 0.0, v: 0.0 },
    { t: 0.18, v: -0.024 },
    { t: 0.5, v: 0.0 },
    { t: 0.68, v: 0.024 },
  ],
  // Spring-mass mechanics: LOWEST at midstance absorption (15%, 65%), HIGHEST in flight (42%, 92%)!
  pelvisY: [
    { t: 0.0, v: -0.014 }, // initial midfoot strike
    { t: 0.15, v: -0.06 }, // midstance loaded drive trough
    { t: 0.32, v: 0.01 }, // toe-off launch
    { t: 0.43, v: 0.04 }, // airborne tuck peak!
    { t: 0.5, v: -0.014 },
    { t: 0.65, v: -0.06 },
    { t: 0.82, v: 0.01 },
    { t: 0.93, v: 0.04 },
  ],
  pelvisYaw: [
    { t: 0.0, v: deg(-11) },
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(11) },
    { t: 0.75, v: deg(0) },
  ],
  pelvisRoll: [
    { t: 0.0, v: deg(0.4) },
    { t: 0.17, v: deg(-2.2) }, // strong core-stabilized running hip list
    { t: 0.42, v: deg(0) },
    { t: 0.67, v: deg(2.2) },
    { t: 0.92, v: deg(0) },
  ],
  spineYaw: [
    { t: 0.0, v: deg(15.5) }, // powerful soldier shoulder counter-rotation!
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(-15.5) },
    { t: 0.75, v: deg(0) },
  ],
  leg: {
    hipX: [
      { t: 0.0, v: deg(42) }, // midfoot initial contact (pre-decelerated from terminal swing!)
      { t: 0.15, v: deg(24) }, // midstance driving under COM
      { t: 0.28, v: deg(2) }, // late stance
      { t: 0.39, v: deg(-18) }, // peak toe-off rear hip extension!
      { t: 0.54, v: deg(12) }, // early swing hip snap
      { t: 0.74, v: deg(48) }, // high knee drive!
      { t: 0.88, v: deg(50) }, // terminal swing apex
      { t: 0.96, v: deg(45) }, // slight active paw-back before landing!
    ],
    hipZ: [
      { t: 0.0, v: deg(1.5) },
      { t: 0.2, v: deg(1.0) },
      { t: 0.55, v: deg(4.2) },
      { t: 0.8, v: deg(2.2) },
    ],
    // NOVACHECK DOUBLE-PEAK RUNNING KNEE:
    // -18° Contact -> -42° Loading Absorption -> -13° Toe-Off Push -> -112° High Heel-Kick Recovery!
    kneeX: [
      { t: 0.0, v: deg(-18) }, // pre-flexed shock absorber at contact
      { t: 0.14, v: deg(-43) }, // Peak #1: eccentric loading absorption
      { t: 0.34, v: deg(-13) }, // explosive concentric push-off extension!
      { t: 0.46, v: deg(-76) }, // rapid heel snap upward
      { t: 0.56, v: deg(-112) }, // Peak #2: tucked high-heel swing recovery!
      { t: 0.72, v: deg(-72) }, // shin begins forward whip
      { t: 0.86, v: deg(-26) }, // lower leg uncoils
      { t: 0.95, v: deg(-16) }, // ready for next contact
    ],
    ankleX: [
      { t: 0.0, v: deg(11) }, // midfoot dorsiflexed strike
      { t: 0.16, v: deg(22) }, // peak tibia-over-foot loading dorsiflexion!
      { t: 0.37, v: deg(-32) }, // explosive calf toe-off plantarflexion!
      { t: 0.54, v: deg(-8) }, // relaxed flight recovery
      { t: 0.74, v: deg(10) }, // dorsiflexes for swing clearance
      { t: 0.92, v: deg(12) },
    ],
    toeX: [
      { t: 0.0, v: deg(0) },
      { t: 0.24, v: deg(4) },
      { t: 0.36, v: deg(32) },
      { t: 0.45, v: deg(6) },
      { t: 0.75, v: deg(0) },
    ],
  },
  arm: {
    // 3D OBLIQUE CHEEK-TO-HIP ATHLETIC ARM DRIVE (ZERO straight robot pendulum!)
    shoulderX: [
      { t: 0.0, v: deg(40) }, // forward drive peak (fist rises toward chin/chest!)
      { t: 0.18, v: deg(14) },
      { t: 0.34, v: deg(-18) },
      { t: 0.48, v: deg(-36) }, // elbow drives crisp behind hip pocket!
      { t: 0.68, v: deg(-10) },
      { t: 0.86, v: deg(26) },
    ],
    // Oblique across-chest adduction on forward drive (+21° inward!) -> slight outward flare (-11°) on backswing!
    shoulderAdductZ: [
      { t: 0.0, v: deg(21) },
      { t: 0.25, v: deg(6) },
      { t: 0.48, v: deg(-11) },
      { t: 0.75, v: deg(8) },
    ],
    // Internal rotation brings fist cleanly toward sternum midline without crossing!
    shoulderTwistY: [
      { t: 0.0, v: deg(26) },
      { t: 0.25, v: deg(10) },
      { t: 0.48, v: deg(-14) },
      { t: 0.75, v: deg(12) },
    ],
    // Dynamic 72°–106° bent elbow pump (tightens sharply toward sternum on forward drive, opens fluidly on backswing!)
    elbowX: [
      { t: 0.0, v: deg(106) }, // tight compact 106° angle on forward cheek/chest drive!
      { t: 0.22, v: deg(88) },
      { t: 0.48, v: deg(72) }, // opens smoothly to 72° past hip pocket (biomechanical running sweep!)
      { t: 0.74, v: deg(92) },
    ],
    // True runner "handshake" forearm pronation/supination: thumb-up/inward (~56° forward -> ~84° rear sweep!)
    foreArmPronationY: [
      { t: 0.0, v: deg(56) }, // subtle pronation as fist sweeps diagonally toward sternum
      { t: 0.24, v: deg(72) },
      { t: 0.48, v: deg(84) }, // neutral/slightly supinated thumb-up sweep past hip!
      { t: 0.74, v: deg(70) },
    ],
    // Subtle athletic wrist dorsiflexion & inertia follow-through
    wristFlexX: [
      { t: 0.0, v: deg(6) },
      { t: 0.22, v: deg(12) },
      { t: 0.48, v: deg(-8) },
      { t: 0.74, v: deg(-12) },
    ],
    wristDevZ: [
      { t: 0.0, v: deg(10) },
      { t: 0.48, v: deg(-8) },
    ],
    clavicleY: [
      { t: 0.0, v: deg(10) },
      { t: 0.48, v: deg(-9) },
    ],
  },
};

// ============================================================================
// 3. CALL-OF-DUTY / SPEC-OPS EXPLOSIVE TACTICAL SPRINT (25° Forward Lean, High Knee Drive)
// ============================================================================
export const SPRINT_GAIT: GaitCycleProfile = {
  trunkLeanX: deg(-26.5),
  pelvisX: [
    { t: 0.0, v: 0.0 },
    { t: 0.17, v: -0.028 },
    { t: 0.5, v: 0.0 },
    { t: 0.67, v: 0.028 },
  ],
  pelvisY: [
    { t: 0.0, v: -0.022 },
    { t: 0.14, v: -0.078 },
    { t: 0.3, v: 0.016 },
    { t: 0.43, v: 0.054 }, // explosive athletic airborne tuck!
    { t: 0.5, v: -0.022 },
    { t: 0.64, v: -0.078 },
    { t: 0.8, v: 0.016 },
    { t: 0.93, v: 0.054 },
  ],
  pelvisYaw: [
    { t: 0.0, v: deg(-15) },
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(15) },
    { t: 0.75, v: deg(0) },
  ],
  pelvisRoll: [
    { t: 0.0, v: deg(0.6) },
    { t: 0.16, v: deg(-2.8) },
    { t: 0.42, v: deg(0) },
    { t: 0.66, v: deg(2.8) },
    { t: 0.92, v: deg(0) },
  ],
  spineYaw: [
    { t: 0.0, v: deg(21) }, // commanding sprint shoulder counter-drive!
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(-21) },
    { t: 0.75, v: deg(0) },
  ],
  leg: {
    hipX: [
      { t: 0.0, v: deg(50) },
      { t: 0.14, v: deg(26) },
      { t: 0.27, v: deg(-3) },
      { t: 0.37, v: deg(-25) }, // full explosive hip extension!
      { t: 0.52, v: deg(18) },
      { t: 0.73, v: deg(62) }, // powerful sprinter high-knee drive!
      { t: 0.88, v: deg(64) },
      { t: 0.96, v: deg(54) },
    ],
    hipZ: [
      { t: 0.0, v: deg(1.2) },
      { t: 0.22, v: deg(0.8) },
      { t: 0.56, v: deg(4.8) },
      { t: 0.82, v: deg(2.0) },
    ],
    kneeX: [
      { t: 0.0, v: deg(-22) },
      { t: 0.13, v: deg(-46) }, // Peak #1 loading spring
      { t: 0.33, v: deg(-10) }, // full sprint extension drive
      { t: 0.45, v: deg(-90) },
      { t: 0.56, v: deg(-128) }, // Peak #2 sprinter heel-to-glute fold!
      { t: 0.72, v: deg(-80) },
      { t: 0.87, v: deg(-28) },
      { t: 0.96, v: deg(-20) },
    ],
    ankleX: [
      { t: 0.0, v: deg(14) },
      { t: 0.15, v: deg(24) },
      { t: 0.35, v: deg(-36) }, // explosive forefoot sprint push-off!
      { t: 0.52, v: deg(-10) },
      { t: 0.74, v: deg(14) },
      { t: 0.92, v: deg(15) },
    ],
    toeX: [
      { t: 0.0, v: deg(0) },
      { t: 0.22, v: deg(6) },
      { t: 0.35, v: deg(36) },
      { t: 0.44, v: deg(8) },
      { t: 0.75, v: deg(0) },
    ],
  },
  arm: {
    shoulderX: [
      { t: 0.0, v: deg(52) }, // explosive cheek-level drive
      { t: 0.18, v: deg(18) },
      { t: 0.34, v: deg(-22) },
      { t: 0.48, v: deg(-44) }, // powerful rear elbow punch past hip!
      { t: 0.68, v: deg(-12) },
      { t: 0.86, v: deg(34) },
    ],
    shoulderAdductZ: [
      { t: 0.0, v: deg(24) },
      { t: 0.24, v: deg(6) },
      { t: 0.48, v: deg(-13) },
      { t: 0.74, v: deg(9) },
    ],
    shoulderTwistY: [
      { t: 0.0, v: deg(30) },
      { t: 0.24, v: deg(12) },
      { t: 0.48, v: deg(-16) },
      { t: 0.74, v: deg(14) },
    ],
    elbowX: [
      { t: 0.0, v: deg(114) }, // explosive cheek-level sprint tuck!
      { t: 0.24, v: deg(92) },
      { t: 0.48, v: deg(74) }, // powerful rear drive opening!
      { t: 0.74, v: deg(96) },
    ],
    foreArmPronationY: [
      { t: 0.0, v: deg(52) },
      { t: 0.24, v: deg(72) },
      { t: 0.48, v: deg(86) },
      { t: 0.74, v: deg(68) },
    ],
    wristFlexX: [
      { t: 0.0, v: deg(8) },
      { t: 0.24, v: deg(14) },
      { t: 0.48, v: deg(-10) },
      { t: 0.74, v: deg(-14) },
    ],
    wristDevZ: [
      { t: 0.0, v: deg(12) },
      { t: 0.48, v: deg(-10) },
    ],
    clavicleY: [
      { t: 0.0, v: deg(13) },
      { t: 0.48, v: deg(-12) },
    ],
  },
};

// ============================================================================
// 4. TACTICAL CROUCH-PROWL WALK CYCLE (Low Center of Mass, Rolling Footwork)
// ============================================================================
export const CROUCH_WALK_GAIT: GaitCycleProfile = {
  trunkLeanX: deg(-22),
  pelvisX: [
    { t: 0.0, v: 0.0 },
    { t: 0.25, v: -0.026 },
    { t: 0.5, v: 0.0 },
    { t: 0.75, v: 0.026 },
  ],
  pelvisY: [
    { t: 0.0, v: -0.016 },
    { t: 0.25, v: 0.012 },
    { t: 0.5, v: -0.016 },
    { t: 0.75, v: 0.012 },
  ],
  pelvisYaw: [
    { t: 0.0, v: deg(-9) },
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(9) },
    { t: 0.75, v: deg(0) },
  ],
  pelvisRoll: [
    { t: 0.0, v: deg(0) },
    { t: 0.25, v: deg(-1.4) },
    { t: 0.5, v: deg(0) },
    { t: 0.75, v: deg(1.4) },
  ],
  spineYaw: [
    { t: 0.0, v: deg(8) },
    { t: 0.25, v: deg(0) },
    { t: 0.5, v: deg(-8) },
    { t: 0.75, v: deg(0) },
  ],
  leg: {
    hipX: [
      { t: 0.0, v: deg(56) },
      { t: 0.28, v: deg(34) },
      { t: 0.55, v: deg(12) },
      { t: 0.78, v: deg(62) },
      { t: 0.94, v: deg(58) },
    ],
    hipZ: [
      { t: 0.0, v: deg(7) },
      { t: 0.35, v: deg(5.5) },
      { t: 0.72, v: deg(9) },
    ],
    kneeX: [
      { t: 0.0, v: deg(-58) },
      { t: 0.22, v: deg(-72) },
      { t: 0.52, v: deg(-54) },
      { t: 0.74, v: deg(-98) }, // stealth knee tuck!
      { t: 0.92, v: deg(-62) },
    ],
    ankleX: [
      { t: 0.0, v: deg(12) },
      { t: 0.32, v: deg(24) },
      { t: 0.58, v: deg(-14) },
      { t: 0.8, v: deg(14) },
    ],
    toeX: [
      { t: 0.0, v: deg(0) },
      { t: 0.52, v: deg(22) },
      { t: 0.75, v: deg(0) },
    ],
  },
  arm: {
    shoulderX: [
      { t: 0.0, v: deg(14) },
      { t: 0.5, v: deg(-10) },
    ],
    shoulderAdductZ: [
      { t: 0.0, v: deg(12) },
      { t: 0.5, v: deg(4) },
    ],
    shoulderTwistY: [
      { t: 0.0, v: deg(14) },
      { t: 0.5, v: deg(0) },
    ],
    elbowX: [
      { t: 0.0, v: deg(64) },
      { t: 0.5, v: deg(48) },
    ],
    foreArmPronationY: [
      { t: 0.0, v: deg(62) },
      { t: 0.5, v: deg(74) },
    ],
    wristFlexX: [
      { t: 0.0, v: deg(6) },
      { t: 0.5, v: deg(-5) },
    ],
    wristDevZ: [
      { t: 0.0, v: deg(6) },
      { t: 0.5, v: deg(-4) },
    ],
    clavicleY: [
      { t: 0.0, v: deg(4) },
      { t: 0.5, v: deg(-3) },
    ],
  },
};

// ============================================================================
// 5. TACTICAL BACKPEDAL CYCLE (Defensive Rear-Reaching Stride)
// ============================================================================
export const BACKPEDAL_GAIT: GaitCycleProfile = {
  trunkLeanX: deg(-13), // defensive forward counterbalance while stepping back!
  pelvisX: [
    { t: 0.0, v: 0.0 },
    { t: 0.25, v: -0.02 },
    { t: 0.5, v: 0.0 },
    { t: 0.75, v: 0.02 },
  ],
  pelvisY: [
    { t: 0.0, v: -0.028 },
    { t: 0.25, v: 0.012 },
    { t: 0.5, v: -0.028 },
    { t: 0.75, v: 0.012 },
  ],
  pelvisYaw: [
    { t: 0.0, v: deg(7) },
    { t: 0.5, v: deg(-7) },
  ],
  pelvisRoll: [
    { t: 0.0, v: deg(0) },
    { t: 0.25, v: deg(1.6) },
    { t: 0.5, v: deg(0) },
    { t: 0.75, v: deg(-1.6) },
  ],
  spineYaw: [
    { t: 0.0, v: deg(-7) },
    { t: 0.5, v: deg(7) },
  ],
  leg: {
    // Reaches back toe-first (-18°), pulls under body (+22°), lifts knee slightly to cycle back!
    hipX: [
      { t: 0.0, v: deg(-18) }, // rear toe touchdown!
      { t: 0.25, v: deg(4) }, // rolling back over midfoot
      { t: 0.52, v: deg(24) }, // front push-off
      { t: 0.76, v: deg(12) }, // swing recovery backward
      { t: 0.92, v: deg(-14) },
    ],
    hipZ: [
      { t: 0.0, v: deg(4.5) },
      { t: 0.5, v: deg(3.5) },
    ],
    kneeX: [
      { t: 0.0, v: deg(-26) }, // soft bent knee receives rear toe strike
      { t: 0.22, v: deg(-42) }, // stance load
      { t: 0.48, v: deg(-16) }, // push off front leg
      { t: 0.72, v: deg(-68) }, // swing clearance bend!
      { t: 0.92, v: deg(-28) },
    ],
    ankleX: [
      { t: 0.0, v: deg(-18) }, // toe-first rear contact!
      { t: 0.28, v: deg(12) }, // heel settles
      { t: 0.52, v: deg(16) },
      { t: 0.75, v: deg(-8) },
    ],
    toeX: [
      { t: 0.0, v: deg(20) },
      { t: 0.3, v: deg(0) },
      { t: 0.65, v: deg(6) },
    ],
  },
  arm: {
    shoulderX: [
      { t: 0.0, v: deg(-14) },
      { t: 0.5, v: deg(18) },
    ],
    shoulderAdductZ: [
      { t: 0.0, v: deg(6) },
      { t: 0.5, v: deg(12) },
    ],
    shoulderTwistY: [
      { t: 0.0, v: deg(4) },
      { t: 0.5, v: deg(12) },
    ],
    elbowX: [
      { t: 0.0, v: deg(48) },
      { t: 0.5, v: deg(66) },
    ],
    foreArmPronationY: [
      { t: 0.0, v: deg(74) },
      { t: 0.5, v: deg(60) },
    ],
    wristFlexX: [
      { t: 0.0, v: deg(-6) },
      { t: 0.5, v: deg(8) },
    ],
    wristDevZ: [
      { t: 0.0, v: deg(-5) },
      { t: 0.5, v: deg(7) },
    ],
    clavicleY: [
      { t: 0.0, v: deg(-4) },
      { t: 0.5, v: deg(5) },
    ],
  },
};

// ============================================================================
// 6. TACTICAL LATERAL CROSS-STEP STRAFE CYCLE (Combat Aim Strafe!)
// ============================================================================
export interface StrafeLegSample {
  hipX: number;
  hipZ: number;
  kneeX: number;
  ankleX: number;
  ankleZ: number;
}

/**
 * Evaluates asymmetric tactical lateral strafe biomechanics (`dir = -1` Left, `+1` Right):
 * Lead leg abducts outward & plants firmly while trailing leg lifts knee and executes a smooth
 * athletic cross-step (exact match to `locomotion_dodge_poses` panel 1!).
 */
const STRAFE_LEAD_HIP_Z: Keyframe[] = [
  { t: 0.0, v: deg(24) }, // lead foot plants wide in travel direction!
  { t: 0.24, v: deg(14) },
  { t: 0.5, v: deg(-4) }, // trails inward under hips as weight shifts
  { t: 0.76, v: deg(12) }, // swings wide outward again!
];
const STRAFE_LEAD_KNEE: Keyframe[] = [
  { t: 0.0, v: deg(-24) }, // cushioned lateral plant
  { t: 0.18, v: deg(-40) }, // lateral shock load
  { t: 0.48, v: deg(-18) }, // push-off
  { t: 0.74, v: deg(-62) }, // knee lift during lateral reach!
];
const STRAFE_LEAD_HIP_X: Keyframe[] = [
  { t: 0.0, v: deg(20) },
  { t: 0.25, v: deg(10) },
  { t: 0.5, v: deg(-8) }, // slight rear cross-over clearance
  { t: 0.76, v: deg(26) },
];

export function sampleStrafeLeg(
  phase01: number,
  side: -1 | 1, // -1 left leg, +1 right leg
  strafeDir: -1 | 1 // -1 strafing left, +1 strafing right
): StrafeLegSample {
  const isLead = side === strafeDir;
  const t = wrap01(isLead ? phase01 : phase01 + 0.5);

  const hipZMag = samplePeriodicCurve(STRAFE_LEAD_HIP_Z, t);
  const hipX = samplePeriodicCurve(STRAFE_LEAD_HIP_X, t);
  const kneeX = samplePeriodicCurve(STRAFE_LEAD_KNEE, t);

  // Lead leg abducts outward (`side * hipZMag`), trailing leg mirrors with subtle cross-over!
  const hipZ = isLead ? side * hipZMag : -side * (hipZMag * 0.75 - deg(5));
  const ankleX = -(hipX + kneeX) * 0.42;
  const ankleZ = -hipZ * 0.55; // keeps boot sole level with concrete floor!

  return { hipX, hipZ, kneeX, ankleX, ankleZ };
}

/**
 * Sample a full GaitCycleProfile at normalized cycle `phase01` (`0..1`) for both legs & arms.
 */
export interface SampledGaitPose {
  pelvisX: number;
  pelvisY: number;
  pelvisYaw: number;
  pelvisRoll: number;
  spineYaw: number;
  trunkLeanX: number;
  leftLeg: { hipX: number; hipZ: number; kneeX: number; ankleX: number; toeX: number };
  rightLeg: { hipX: number; hipZ: number; kneeX: number; ankleX: number; toeX: number };
  leftArm: {
    shoulderX: number;
    shoulderAdductZ: number;
    shoulderTwistY: number;
    elbowX: number;
    foreArmPronationY: number;
    wristFlexX: number;
    wristDevZ: number;
    clavicleY: number;
  };
  rightArm: {
    shoulderX: number;
    shoulderAdductZ: number;
    shoulderTwistY: number;
    elbowX: number;
    foreArmPronationY: number;
    wristFlexX: number;
    wristDevZ: number;
    clavicleY: number;
  };
}

export function sampleGaitProfile(profile: GaitCycleProfile, phase01: number): SampledGaitPose {
  const tL = wrap01(phase01);
  const tR = wrap01(phase01 + 0.5);

  const sampleLegTrack = (t: number) => ({
    hipX: samplePeriodicCurve(profile.leg.hipX, t),
    hipZ: samplePeriodicCurve(profile.leg.hipZ, t),
    kneeX: samplePeriodicCurve(profile.leg.kneeX, t),
    ankleX: samplePeriodicCurve(profile.leg.ankleX, t),
    toeX: samplePeriodicCurve(profile.leg.toeX, t),
  });

  // Contralateral coordination: Right arm swings forward (`tL`) with Left leg (`tL`),
  // Left arm swings forward (`tR`) with Right leg (`tR`)!
  const sampleArmTrack = (t: number) => ({
    shoulderX: samplePeriodicCurve(profile.arm.shoulderX, t),
    shoulderAdductZ: samplePeriodicCurve(profile.arm.shoulderAdductZ, t),
    shoulderTwistY: samplePeriodicCurve(profile.arm.shoulderTwistY, t),
    elbowX: samplePeriodicCurve(profile.arm.elbowX, t),
    foreArmPronationY: samplePeriodicCurve(profile.arm.foreArmPronationY, t),
    wristFlexX: samplePeriodicCurve(profile.arm.wristFlexX, t),
    wristDevZ: samplePeriodicCurve(profile.arm.wristDevZ, t),
    clavicleY: samplePeriodicCurve(profile.arm.clavicleY, t),
  });

  return {
    pelvisX: samplePeriodicCurve(profile.pelvisX, tL),
    pelvisY: samplePeriodicCurve(profile.pelvisY, tL),
    pelvisYaw: samplePeriodicCurve(profile.pelvisYaw, tL),
    pelvisRoll: samplePeriodicCurve(profile.pelvisRoll, tL),
    spineYaw: samplePeriodicCurve(profile.spineYaw, tL),
    trunkLeanX: profile.trunkLeanX,
    leftLeg: sampleLegTrack(tL),
    rightLeg: sampleLegTrack(tR),
    rightArm: sampleArmTrack(tL),
    leftArm: sampleArmTrack(tR),
  };
}

export function lerpGaitPose(a: SampledGaitPose, b: SampledGaitPose, alpha: number): SampledGaitPose {
  const k = Math.max(0, Math.min(1, alpha));
  const mix = (x: number, y: number) => x + (y - x) * k;

  return {
    pelvisX: mix(a.pelvisX, b.pelvisX),
    pelvisY: mix(a.pelvisY, b.pelvisY),
    pelvisYaw: mix(a.pelvisYaw, b.pelvisYaw),
    pelvisRoll: mix(a.pelvisRoll, b.pelvisRoll),
    spineYaw: mix(a.spineYaw, b.spineYaw),
    trunkLeanX: mix(a.trunkLeanX, b.trunkLeanX),
    leftLeg: {
      hipX: mix(a.leftLeg.hipX, b.leftLeg.hipX),
      hipZ: mix(a.leftLeg.hipZ, b.leftLeg.hipZ),
      kneeX: mix(a.leftLeg.kneeX, b.leftLeg.kneeX),
      ankleX: mix(a.leftLeg.ankleX, b.leftLeg.ankleX),
      toeX: mix(a.leftLeg.toeX, b.leftLeg.toeX),
    },
    rightLeg: {
      hipX: mix(a.rightLeg.hipX, b.rightLeg.hipX),
      hipZ: mix(a.rightLeg.hipZ, b.rightLeg.hipZ),
      kneeX: mix(a.rightLeg.kneeX, b.rightLeg.kneeX),
      ankleX: mix(a.rightLeg.ankleX, b.rightLeg.ankleX),
      toeX: mix(a.rightLeg.toeX, b.rightLeg.toeX),
    },
    leftArm: {
      shoulderX: mix(a.leftArm.shoulderX, b.leftArm.shoulderX),
      shoulderAdductZ: mix(a.leftArm.shoulderAdductZ, b.leftArm.shoulderAdductZ),
      shoulderTwistY: mix(a.leftArm.shoulderTwistY, b.leftArm.shoulderTwistY),
      elbowX: mix(a.leftArm.elbowX, b.leftArm.elbowX),
      foreArmPronationY: mix(a.leftArm.foreArmPronationY, b.leftArm.foreArmPronationY),
      wristFlexX: mix(a.leftArm.wristFlexX, b.leftArm.wristFlexX),
      wristDevZ: mix(a.leftArm.wristDevZ, b.leftArm.wristDevZ),
      clavicleY: mix(a.leftArm.clavicleY, b.leftArm.clavicleY),
    },
    rightArm: {
      shoulderX: mix(a.rightArm.shoulderX, b.rightArm.shoulderX),
      shoulderAdductZ: mix(a.rightArm.shoulderAdductZ, b.rightArm.shoulderAdductZ),
      shoulderTwistY: mix(a.rightArm.shoulderTwistY, b.rightArm.shoulderTwistY),
      elbowX: mix(a.rightArm.elbowX, b.rightArm.elbowX),
      foreArmPronationY: mix(a.rightArm.foreArmPronationY, b.rightArm.foreArmPronationY),
      wristFlexX: mix(a.rightArm.wristFlexX, b.rightArm.wristFlexX),
      wristDevZ: mix(a.rightArm.wristDevZ, b.rightArm.wristDevZ),
      clavicleY: mix(a.rightArm.clavicleY, b.rightArm.clavicleY),
    },
  };
}
