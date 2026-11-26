import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface StriderLimbParts {
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  handKatanaGroup: THREE.Group;
  sheathedHiltGroup: THREE.Group;
  scabbardGroup: THREE.Group;
  bladeTipRight: THREE.Object3D;
  bladeEdgeMat: THREE.MeshStandardMaterial;
  setKatanaSheathed: (sheathed: boolean) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds the masterpiece curved High-Frequency Thermal Katana ("HF-MURAMASA"):
 * - True curved ExtrudeGeometry sweeping katana profile (1.16m length, authentic sori curve)
 * - Folded Damascus carbon-steel spine + blazing superheated crimson high-frequency razor edge
 *   oriented cleanly along local -Z (cutting edge faces forward/outward during swings!)
 * - Octagonal cyber-tsuba handguard with gold habaki collar + diamond-wrapped tsuka hilt
 */
function buildHighFrequencyKatana(
  mats: Floor08EnemyMaterials,
  bladeEdgeMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose: () => void }>
): { group: THREE.Group; tipMarker: THREE.Object3D } {
  const katana = new THREE.Group();

  // 1. Diamond-wrapped Tsuka hilt (extending from y=-0.27 up to guard y=0)
  const tsuka = new THREE.Mesh(
    createBeveledBox(0.025, 0.26, 0.036, 0.008),
    mats.hiltWrap
  );
  tsuka.position.set(0, -0.14, 0);
  katana.add(tsuka);

  const pommel = new THREE.Mesh(createBeveledBox(0.032, 0.036, 0.044, 0.008), mats.titaniumJoint);
  pommel.position.set(0, -0.275, 0);
  katana.add(pommel);

  const pommelGlow = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.012, 0.02), bladeEdgeMat);
  pommelGlow.position.set(0, -0.25, 0);
  katana.add(pommelGlow);

  // 2. Octagonal Cyber-Tsuba handguard + brass/gold Habaki collar
  const tsubaGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.016, 8);
  disposables.push(tsubaGeo);
  const tsuba = new THREE.Mesh(tsubaGeo, mats.titaniumJoint);
  tsuba.scale.set(0.84, 1, 1.26);
  tsuba.position.set(0, 0.006, 0);
  katana.add(tsuba);

  const habaki = new THREE.Mesh(createBeveledBox(0.026, 0.044, 0.042, 0.005), mats.armorGoldTrim);
  habaki.position.set(0, 0.035, 0);
  katana.add(habaki);

  // 3. True Curved Katana Blade Spine (Folded Damascus Steel)
  // Shape X -> rotated via rotateY(-PI/2) so +X maps to +Z (back spine) and -X maps to -Z (cutting edge)!
  const spineShape = new THREE.Shape();
  spineShape.moveTo(0.015, 0.04);
  spineShape.quadraticCurveTo(0.03, 0.6, 0.072, 1.09);
  spineShape.lineTo(0.06, 1.18); // razor kissaki tip!
  spineShape.lineTo(0.036, 1.08);
  spineShape.quadraticCurveTo(0.002, 0.58, -0.012, 0.04);
  spineShape.closePath();

  const spineGeo = new THREE.ExtrudeGeometry(spineShape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  spineGeo.translate(0, 0, -0.005);
  // rotateY(-PI/2): (x, y, z) -> (-z, y, x) => back spine (+X) curves gently back (+Z), cutting edge (-X) faces forward (-Z)!
  spineGeo.rotateY(-Math.PI / 2);
  disposables.push(spineGeo);

  const spineMesh = new THREE.Mesh(spineGeo, mats.damascusSteel);
  spineMesh.castShadow = true;
  katana.add(spineMesh);

  // 4. Superheated Crimson High-Frequency Razor Cutting Edge (Ha) along the outer -Z edge!
  const edgeShape = new THREE.Shape();
  edgeShape.moveTo(-0.011, 0.045);
  edgeShape.quadraticCurveTo(0.003, 0.58, 0.037, 1.08);
  edgeShape.lineTo(0.06, 1.188);
  edgeShape.lineTo(0.023, 1.075);
  edgeShape.quadraticCurveTo(-0.011, 0.58, -0.026, 0.045);
  edgeShape.closePath();

  const edgeGeo = new THREE.ExtrudeGeometry(edgeShape, {
    depth: 0.0048,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.001,
    bevelSegments: 1,
  });
  edgeGeo.translate(0, 0, -0.0024);
  edgeGeo.rotateY(-Math.PI / 2);
  disposables.push(edgeGeo);

  const edgeMesh = new THREE.Mesh(edgeGeo, bladeEdgeMat);
  katana.add(edgeMesh);

  // Micro thermal-inductor studs glowing along blade fuller
  for (let i = 0; i < 4; i++) {
    const t = 0.18 + i * 0.18;
    const zCurve = 0.006 + t * t * 0.036;
    const stud = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.008), bladeEdgeMat);
    stud.position.set(0, t, zCurve);
    katana.add(stud);
  }

  const tipMarker = new THREE.Object3D();
  tipMarker.position.set(0, 1.17, 0.055);
  katana.add(tipMarker);

  return { group: katana, tipMarker };
}

/**
 * Builds KAGE-08's AAA sculpted anatomical limbs (`createLoftedAnatomy` + `createCurvedPanelGeometry`
 * + `createSculptedHand`), asymmetric 3-tier curved samurai Sode pauldron, motorized left-hip Saya
 * trigger-scabbard, curved HF-Muramasa thermal katana (mathematically aligned forward-up in guard,
 * zero leg clipping!), and athletic sculpted cyber-legs with flush split-toe tabi boots at y=0.
 */
export function buildStriderLimbsAndWeapon(
  pelvisGroup: THREE.Group,
  chestGroup: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): StriderLimbParts {
  const disposables: Array<{ dispose: () => void }> = [];

  const crimsonTrimMat = new THREE.MeshStandardMaterial({
    color: 0x761522,
    roughness: 0.58,
    metalness: 0.3,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.012,
  });
  const bladeEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xff425c,
    emissive: 0xff1e38,
    emissiveIntensity: 3.3,
    roughness: 0.16,
    metalness: 0.4,
  });
  disposables.push(crimsonTrimMat, bladeEdgeMat);

  // Shared sculpted anatomical upper-arm & forearm loft geometries
  const upperArmGeo = createLoftedAnatomy(
    [
      { y: 0.02, rx: 0.062, rz: 0.064, squareness: 2.15 },
      { y: -0.07, rx: 0.066, rz: 0.068, squareness: 2.2 },
      { y: -0.18, rx: 0.056, rz: 0.058, squareness: 2.15 },
      { y: -0.285, rx: 0.048, rz: 0.05, squareness: 2.1 },
    ],
    14
  );
  const forearmGeo = createLoftedAnatomy(
    [
      { y: 0.01, rx: 0.052, rz: 0.054, squareness: 2.15 },
      { y: -0.08, rx: 0.055, rz: 0.056, squareness: 2.25 },
      { y: -0.19, rx: 0.044, rz: 0.046, squareness: 2.2 },
      { y: -0.265, rx: 0.036, rz: 0.034, squareness: 2.1 },
    ],
    14
  );
  disposables.push(upperArmGeo, forearmGeo);

  // Curved Samurai Kote bracer armor wrapping outer forearm cleanly
  const buildArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.258, 0.235, 0);
    chestGroup.add(shoulder);

    // Sculpted deltoid joint sphere
    const deltJoint = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), mats.undersuit);
    shoulder.add(deltJoint);

    if (side === -1) {
      // ASYMMETRIC LEFT ARM: 3-tier curved sweeping Samurai Sode pauldron!
      for (let tier = 0; tier < 3; tier++) {
        const yTop = 0.082 - tier * 0.068;
        const yBot = yTop - 0.076;
        const r = 0.098 + tier * 0.012;
        const sodeGeo = createCurvedPanelGeometry(
          [
            { y: yBot, rx: r + 0.014, rz: 0.115 - tier * 0.008, thickness: 0.016 },
            { y: yTop, rx: r, rz: 0.102 - tier * 0.008, thickness: 0.016 },
          ],
          Math.PI * 0.56,
          Math.PI * 1.44,
          14
        );
        disposables.push(sodeGeo);
        const sodePlate = new THREE.Mesh(sodeGeo, tier === 1 ? crimsonTrimMat : flashArmorMat);
        sodePlate.position.set(-0.01, 0, 0);
        sodePlate.castShadow = true;
        shoulder.add(sodePlate);
      }
    } else {
      // SLEEK RIGHT SWORD-ARM: Contoured curved interceptor samurai shoulder guard
      const rPauldronGeo = createCurvedPanelGeometry(
        [
          { y: -0.055, rx: 0.108, rz: 0.104, thickness: 0.018 },
          { y: 0.045, rx: 0.096, rz: 0.094, thickness: 0.018 },
          { y: 0.092, rx: 0.065, rz: 0.072, thickness: 0.016 },
        ],
        -Math.PI * 0.44,
        Math.PI * 0.44,
        14
      );
      disposables.push(rPauldronGeo);
      const rPauldron = new THREE.Mesh(rPauldronGeo, flashArmorMat);
      rPauldron.castShadow = true;
      shoulder.add(rPauldron);

      const trimGeo = createCurvedPanelGeometry(
        [
          { y: 0.04, rx: 0.102, rz: 0.098, thickness: 0.01 },
          { y: 0.078, rx: 0.082, rz: 0.084, thickness: 0.01 },
        ],
        -Math.PI * 0.36,
        Math.PI * 0.36,
        10
      );
      disposables.push(trimGeo);
      shoulder.add(new THREE.Mesh(trimGeo, crimsonTrimMat));
    }

    const upperArm = new THREE.Mesh(upperArmGeo, mats.undersuit);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    // Curved outer bicep armor shell
    const bicepArcStart = side < 0 ? Math.PI * 0.65 : -Math.PI * 0.35;
    const bicepArcEnd = side < 0 ? Math.PI * 1.35 : Math.PI * 0.35;
    const bicepShellGeo = createCurvedPanelGeometry(
      [
        { y: -0.22, rx: 0.064, rz: 0.066, thickness: 0.013 },
        { y: -0.09, rx: 0.072, rz: 0.074, thickness: 0.014 },
      ],
      bicepArcStart,
      bicepArcEnd,
      10
    );
    disposables.push(bicepShellGeo);
    shoulder.add(new THREE.Mesh(bicepShellGeo, mats.armorSlate));

    const elbow = new THREE.Group();
    elbow.position.y = -0.285;
    shoulder.add(elbow);

    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mats.armorSlate);
    elbow.add(elbowCap);

    const forearm = new THREE.Mesh(forearmGeo, mats.undersuit);
    forearm.castShadow = true;
    elbow.add(forearm);

    // Sculpted curved Samurai Kote armored gauntlet bracer
    const bracerGeo = createCurvedPanelGeometry(
      [
        { y: -0.235, rx: 0.048, rz: 0.05, thickness: 0.014 },
        { y: -0.12, rx: 0.062, rz: 0.062, thickness: 0.015 },
        { y: -0.03, rx: 0.058, rz: 0.06, thickness: 0.014 },
      ],
      side < 0 ? Math.PI * 0.58 : -Math.PI * 0.42,
      side < 0 ? Math.PI * 1.42 : Math.PI * 0.42,
      12
    );
    disposables.push(bracerGeo);
    const bracer = new THREE.Mesh(bracerGeo, flashArmorMat);
    bracer.castShadow = true;
    elbow.add(bracer);

    // Articulated 5-finger cybernetic hand!
    const hand = createSculptedHand(side, mats.undersuit, mats.titaniumJoint, mats.armorSlate);
    hand.position.set(0, -0.258, 0);
    // Rotate hand so palm curls inward toward grip
    hand.rotation.y = side * -Math.PI * 0.5;
    elbow.add(hand);

    return { shoulder, elbow };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Masterpiece HF-MURAMASA Katana mounted in Right Sword Hand!
  // Verified right-hand-rule math:
  // When rightShoulder.rotation.x = +0.52 & rightElbow.rotation.x = +0.78 (sum = +1.30 rad, arm raised forward),
  // mounting katana at rotation.x = -2.06 gives total blade pitch = -0.76 rad (-43.5°):
  //   blade +Y -> (0, +0.72, -0.69) = cleanly UP-AND-FORWARD diagonally across front-right (ZERO leg clipping!)
  //   cutting edge -Z -> (0, -0.69, -0.72) = facing FORWARD-OUTWARD toward the player!
  const handKatana = buildHighFrequencyKatana(mats, bladeEdgeMat, disposables);
  const handKatanaGroup = handKatana.group;
  handKatanaGroup.position.set(-0.012, -0.295, -0.015);
  handKatanaGroup.rotation.set(-2.06, 0.14, -0.1);
  rightArm.elbow.add(handKatanaGroup);

  // ---------------------------------------------------------------------------
  // MOTORIZED LEFT-HIP SAYA CYBER-SCABBARD (Jetstream Sam Trigger-Sheath Style!)
  // ---------------------------------------------------------------------------
  const scabbardGroup = new THREE.Group();
  scabbardGroup.position.set(-0.215, -0.015, 0.03);
  // Sweeps sleekly backward (+Z) and slightly upward (-0.22 X) tucked close behind left thigh (-0.18 Y)!
  scabbardGroup.rotation.set(-0.22, -0.18, 0.12);
  pelvisGroup.add(scabbardGroup);

  const sayaBody = new THREE.Mesh(
    createBeveledBox(0.046, 0.066, 1.06, 0.012),
    mats.armorSlate
  );
  sayaBody.position.set(0, 0, 0.44);
  sayaBody.castShadow = true;
  scabbardGroup.add(sayaBody);

  // Electromagnetic quick-eject trigger housing near scabbard mouth
  const triggerHousing = new THREE.Mesh(
    createBeveledBox(0.064, 0.088, 0.25, 0.012),
    flashArmorMat
  );
  triggerHousing.position.set(0, 0.008, 0.04);
  scabbardGroup.add(triggerHousing);

  // Glowing crimson thermal charging rail running down outer face of scabbard
  const sayaRail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.86), bladeEdgeMat);
  sayaRail.position.set(-0.028, 0.012, 0.46);
  scabbardGroup.add(sayaRail);

  const sayaEndCap = new THREE.Mesh(createBeveledBox(0.05, 0.07, 0.065, 0.01), crimsonTrimMat);
  sayaEndCap.position.set(0, 0, 0.98);
  scabbardGroup.add(sayaEndCap);

  // Sheathed Katana Hilt + Tsuba protruding FORWARD (-Z) out the mouth of the Saya!
  // Rx(+PI/2) maps local -Y (tsuka hilt) cleanly to -Z (out the front of the scabbard!)
  const sheathedHiltGroup = new THREE.Group();
  sheathedHiltGroup.position.set(0, 0.004, -0.095);
  sheathedHiltGroup.rotation.set(Math.PI * 0.5, 0, 0);
  scabbardGroup.add(sheathedHiltGroup);

  const sheathedTsuba = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.058, 0.016, 8),
    mats.titaniumJoint
  );
  sheathedTsuba.scale.set(0.84, 1, 1.26);
  sheathedHiltGroup.add(sheathedTsuba);

  const sheathedTsuka = new THREE.Mesh(
    createBeveledBox(0.025, 0.26, 0.036, 0.008),
    mats.hiltWrap
  );
  sheathedTsuka.position.set(0, -0.14, 0);
  sheathedHiltGroup.add(sheathedTsuka);

  const sheathedPommel = new THREE.Mesh(
    createBeveledBox(0.032, 0.036, 0.044, 0.008),
    mats.titaniumJoint
  );
  sheathedPommel.position.set(0, -0.275, 0);
  sheathedHiltGroup.add(sheathedPommel);
  sheathedHiltGroup.visible = false;

  const setKatanaSheathed = (sheathed: boolean): void => {
    handKatanaGroup.visible = !sheathed;
    sheathedHiltGroup.visible = sheathed;
  };

  // ---------------------------------------------------------------------------
  // SCULPTED ANATOMICAL CYBER-LEGS + CURVED HAIDATE/SUNEATE ARMOR + TABI BOOTS
  // ---------------------------------------------------------------------------
  // Pelvis y = 0.94 -> hip y = -0.04 (world 0.90) -> knee y = -0.45 (world 0.45)
  // -> shin/boot sole exact bottom at y = -0.45 -> world y = 0.00!
  const thighGeo = createLoftedAnatomy(
    [
      { y: 0.02, rx: 0.088, rz: 0.094, squareness: 2.2 },
      { y: -0.12, rx: 0.094, rz: 0.1, squareness: 2.25, frontScale: 1.08 },
      { y: -0.28, rx: 0.078, rz: 0.082, squareness: 2.2 },
      { y: -0.44, rx: 0.064, rz: 0.068, squareness: 2.15 },
    ],
    16
  );
  const calfGeo = createLoftedAnatomy(
    [
      { y: 0.01, rx: 0.062, rz: 0.066, squareness: 2.15 },
      { y: -0.11, rx: 0.07, rz: 0.076, squareness: 2.2, backScale: 1.15 },
      { y: -0.25, rx: 0.052, rz: 0.056, squareness: 2.15 },
      { y: -0.37, rx: 0.044, rz: 0.048, squareness: 2.1 },
    ],
    16
  );
  disposables.push(thighGeo, calfGeo);

  const buildLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.118, -0.04, 0);
    pelvisGroup.add(hip);

    const thigh = new THREE.Mesh(thighGeo, mats.undersuit);
    thigh.castShadow = true;
    hip.add(thigh);

    // Contoured curved Haidate outer/front thigh armor shell hugging muscular quad
    const haidateStart = side < 0 ? -Math.PI * 0.96 : -Math.PI * 0.65;
    const haidateEnd = side < 0 ? -Math.PI * 0.35 : -Math.PI * 0.04;
    const haidateGeo = createCurvedPanelGeometry(
      [
        { y: -0.36, rx: 0.084, rz: 0.09, thickness: 0.016 },
        { y: -0.2, rx: 0.102, rz: 0.108, thickness: 0.018 },
        { y: -0.08, rx: 0.098, rz: 0.105, thickness: 0.016 },
      ],
      haidateStart,
      haidateEnd,
      12
    );
    disposables.push(haidateGeo);
    const thighArmor = new THREE.Mesh(haidateGeo, flashArmorMat);
    thighArmor.castShadow = true;
    hip.add(thighArmor);

    const thighStripe = new THREE.Mesh(createBeveledBox(0.02, 0.21, 0.036, 0.005), crimsonTrimMat);
    thighStripe.position.set(side * 0.098, -0.21, -0.012);
    hip.add(thighStripe);

    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);

    // Sculpted angular samurai knee-cop (Tateage)
    const kneeCopGeo = createCurvedPanelGeometry(
      [
        { y: -0.055, rx: 0.072, rz: 0.08, thickness: 0.018 },
        { y: 0.015, rx: 0.082, rz: 0.092, thickness: 0.02 },
        { y: 0.075, rx: 0.068, rz: 0.076, thickness: 0.016 },
      ],
      -Math.PI * 0.78,
      -Math.PI * 0.22,
      10
    );
    disposables.push(kneeCopGeo);
    knee.add(new THREE.Mesh(kneeCopGeo, mats.armorSlate));

    const calf = new THREE.Mesh(calfGeo, mats.undersuit);
    calf.castShadow = true;
    knee.add(calf);

    // Hydraulic Achilles actuator piston behind calf
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.29, 8),
      mats.titaniumJoint
    );
    piston.position.set(0, -0.19, 0.066);
    piston.rotation.x = 0.12;
    knee.add(piston);

    // Curved contoured Suneate front shin-greave
    const shinGeo = createCurvedPanelGeometry(
      [
        { y: -0.35, rx: 0.056, rz: 0.062, thickness: 0.016 },
        { y: -0.2, rx: 0.072, rz: 0.078, thickness: 0.018 },
        { y: -0.06, rx: 0.076, rz: 0.082, thickness: 0.018 },
      ],
      -Math.PI * 0.85,
      -Math.PI * 0.15,
      12
    );
    disposables.push(shinGeo);
    const shinGreave = new THREE.Mesh(shinGeo, flashArmorMat);
    shinGreave.castShadow = true;
    knee.add(shinGreave);

    // Armored crimson ankle collar
    const ankleCollar = new THREE.Mesh(
      createBeveledBox(0.088, 0.048, 0.105, 0.012),
      crimsonTrimMat
    );
    ankleCollar.position.set(0, -0.365, -0.008);
    knee.add(ankleCollar);

    // Split-Toe Cyber-Tabi Combat Boot (sole bottom mathematically at y = -0.45 -> world y = 0.00!)
    const bootHeel = new THREE.Mesh(createBeveledBox(0.094, 0.076, 0.135, 0.016), mats.armorSlate);
    bootHeel.position.set(0, -0.412, 0.012);
    knee.add(bootHeel);

    const toeInner = new THREE.Mesh(createBeveledBox(0.036, 0.054, 0.125, 0.01), mats.titaniumJoint);
    toeInner.position.set(-side * 0.024, -0.423, -0.1);
    knee.add(toeInner);

    const toeOuter = new THREE.Mesh(createBeveledBox(0.046, 0.054, 0.115, 0.01), mats.titaniumJoint);
    toeOuter.position.set(side * 0.022, -0.423, -0.094);
    knee.add(toeOuter);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    handKatanaGroup,
    sheathedHiltGroup,
    scabbardGroup,
    bladeTipRight: handKatana.tipMarker,
    bladeEdgeMat,
    setKatanaSheathed,
    disposables,
  };
}
