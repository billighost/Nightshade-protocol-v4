import * as THREE from 'three';
import { createBeveledBox, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { MarauderTextureSuite } from './textures';

export type MarauderPoseMode =
  | 'stalk'
  | 'parry_guard'
  | 'dash_cleave1'
  | 'dash_cleave2'
  | 'shotgun'
  | 'axe_wave'
  | 'leap_crouch'
  | 'leap_air'
  | 'cataclysm_slam'
  | 'salvo';

export interface ApexArenaMarauderRigHandle extends EnemyRigHandle {
  setPoseMode: (mode: MarauderPoseMode) => void;
  setAxeCharge: (charge: number) => void;
  getAxeTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getShotgunMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

function buildWarlordLeg(
  side: -1 | 1,
  sovereignMat: THREE.Material,
  bronzeMat: THREE.Material,
  undersuitMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
) {
  const hip = new THREE.Group();

  const thigh = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.155, rz: 0.165, squareness: 2.5 },
        { y: -0.28, rx: 0.145, rz: 0.155, squareness: 2.6 },
        { y: -0.56, rx: 0.11, rz: 0.12, squareness: 2.4 },
      ],
      16
    ),
    undersuitMat
  );
  thigh.castShadow = true;
  hip.add(thigh);

  const thighPlate = new THREE.Mesh(createBeveledBox(0.12, 0.42, 0.24, 0.024), sovereignMat);
  thighPlate.position.set(side * 0.11, -0.26, -0.02);
  thighPlate.castShadow = true;
  hip.add(thighPlate);

  const knee = new THREE.Group();
  knee.position.set(0, -0.56, 0);
  hip.add(knee);

  const kneeGeo = createCurvedPanelGeometry(
    [
      { y: -0.1, rx: 0.13, rz: 0.145, thickness: 0.032 },
      { y: 0.02, rx: 0.148, rz: 0.165, thickness: 0.038 },
      { y: 0.12, rx: 0.125, rz: 0.138, thickness: 0.026 },
    ],
    -Math.PI * 0.85,
    -Math.PI * 0.15,
    12
  );
  ownedGeos.push(kneeGeo);
  const kneeCrest = new THREE.Mesh(kneeGeo, bronzeMat);
  kneeCrest.castShadow = true;
  knee.add(kneeCrest);

  const shin = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.115, rz: 0.125, squareness: 2.5 },
        { y: -0.28, rx: 0.142, rz: 0.16, squareness: 2.75, pinchFront: 0.04 },
        { y: -0.58, rx: 0.118, rz: 0.13, squareness: 2.5 },
      ],
      16
    ),
    sovereignMat
  );
  shin.castShadow = true;
  knee.add(shin);

  const ankle = new THREE.Group();
  ankle.position.set(0, -0.58, 0);
  knee.add(ankle);

  const greaveBoot = new THREE.Mesh(createBeveledBox(0.24, 0.12, 0.42, 0.022), bronzeMat);
  greaveBoot.position.set(0, -0.06, -0.06);
  greaveBoot.castShadow = true;
  ankle.add(greaveBoot);

  return { hip, knee, ankle };
}

function buildArgentWarAxe(
  bronzeMat: THREE.Material,
  darkMat: THREE.Material,
  energyMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): { axeGroup: THREE.Group; tipAnchor: THREE.Object3D } {
  const axeGroup = new THREE.Group();

  // 2.55m War-Axe Haft pointing cleanly forward along -Z
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 2.45, 12), darkMat);
  haft.rotation.x = Math.PI * 0.5;
  haft.position.z = -0.58;
  haft.castShadow = true;
  axeGroup.add(haft);

  // Bronze pommel spike & ornate horned axe-head collar
  const pommel = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.26, 8), bronzeMat);
  pommel.rotation.x = Math.PI * 0.5;
  pommel.position.z = 0.76;
  axeGroup.add(pommel);

  const headCollar = new THREE.Mesh(createBeveledBox(0.18, 0.26, 0.4, 0.024), bronzeMat);
  headCollar.position.set(0, 0, -1.58);
  axeGroup.add(headCollar);

  // Twin sweeping crescent Crimson Argent Energy Axe-Blades (iconic double-bitted Marauder War-Axe!)
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0.1);
  bladeShape.quadraticCurveTo(0.36, 0.68, 0.78, 0.58);
  bladeShape.quadraticCurveTo(0.54, 0.28, 0.48, 0.05);
  bladeShape.lineTo(0.48, -0.05);
  bladeShape.quadraticCurveTo(0.54, -0.28, 0.78, -0.58);
  bladeShape.quadraticCurveTo(0.36, -0.68, 0, -0.1);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.021);
  bladeGeo.rotateY(Math.PI * 0.5);
  ownedGeos.push(bladeGeo);

  const bladeMesh = new THREE.Mesh(bladeGeo, energyMat);
  bladeMesh.position.set(0, 0, -1.28);
  axeGroup.add(bladeMesh);

  // Central spear-point finial crowning the War-Axe
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.48, 6), energyMat);
  finial.rotation.x = -Math.PI * 0.5;
  finial.position.z = -2.02;
  axeGroup.add(finial);

  const tipAnchor = new THREE.Object3D();
  tipAnchor.position.set(0, 0, -2.24);
  axeGroup.add(tipAnchor);

  return { axeGroup, tipAnchor };
}

export function buildApexArenaMarauderBossRig(
  enemyId: string,
  mats: Floor05EnemyMaterials,
  textures: MarauderTextureSuite
): ApexArenaMarauderRigHandle {
  const root = new THREE.Group();
  root.name = `ApexArenaMarauder_${enemyId}`;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const hitboxes: THREE.Mesh[] = [];

  // Bright base tint so sovereignArmorMap obsidian-steel & imperial gold runes gleam crisply!
  const sovereignMat = mats.createFlashArmorMaterial(0xdde4f0, 0.66, 0.34, 'gladiator');
  sovereignMat.map = textures.sovereignArmorMap;
  const bronzeMat = mats.createFlashArmorMaterial(0xebb65a, 0.8, 0.28, 'gladiator');
  const crimsonArmorMat = mats.createFlashArmorMaterial(0xc62636, 0.4, 0.4, 'gladiator');
  const mantleMat = new THREE.MeshStandardMaterial({
    map: textures.mantleMap,
    roughness: 0.82,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const weakpointMat = mats.createWeakpointMaterial(0xfef08a, 0xff4518);
  const axeEnergyMat = mats.createWeakpointMaterial(0xff5240, 0xdc2626);
  const aegisMat = new THREE.MeshPhysicalMaterial({
    color: 0xff3b2f,
    emissive: 0xdc2626,
    emissiveIntensity: 1.35,
    transparent: true,
    opacity: 0.48,
    roughness: 0.14,
    metalness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  ownedMats.push(sovereignMat, bronzeMat, crimsonArmorMat, mantleMat, weakpointMat, axeEnergyMat, aegisMat);

  const shadow = createEnemyContactShadow(1.38, mats.shadowDisc);
  root.add(shadow);

  // Pelvis at y = 1.26m (0.56 + 0.58 + 0.12 = 1.26m -> greave boots flush on pit floor!)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.26, 0);
  root.add(pelvis);

  const waist = new THREE.Mesh(createBeveledBox(0.64, 0.28, 0.48, 0.036), sovereignMat);
  waist.castShadow = true;
  pelvis.add(waist);

  const warBelt = new THREE.Mesh(createBeveledBox(0.7, 0.12, 0.52, 0.02), bronzeMat);
  warBelt.position.set(0, 0.05, 0);
  pelvis.add(warBelt);

  const beltBuckle = new THREE.Mesh(createBeveledBox(0.24, 0.18, 0.08, 0.018), bronzeMat);
  beltBuckle.position.set(0, 0.03, -0.26);
  pelvis.add(beltBuckle);

  // Hanging Segmented Crimson-and-Obsidian Imperial Gladiator Tassets (never stiff forward ramp!)
  for (let i = -2; i <= 2; i++) {
    const tasset = new THREE.Mesh(
      createBeveledBox(0.115, 0.44, 0.042, 0.01),
      i === 0 ? crimsonArmorMat : sovereignMat
    );
    tasset.position.set(i * 0.13, -0.22, -0.24);
    tasset.rotation.x = -0.06;
    tasset.castShadow = true;
    pelvis.add(tasset);
  }

  const leftLeg = buildWarlordLeg(-1, sovereignMat, bronzeMat, mats.gladiatorUndersuit, ownedGeos);
  leftLeg.hip.position.set(-0.24, 0, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildWarlordLeg(1, sovereignMat, bronzeMat, mats.gladiatorUndersuit, ownedGeos);
  rightLeg.hip.position.set(0.24, 0, 0);
  pelvis.add(rightLeg.hip);

  // Monumental Imperial Gladiator Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.2, 0);
  pelvis.add(torso);

  const chest = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.29, rz: 0.24, squareness: 2.5 },
        { y: 0.34, rx: 0.43, rz: 0.33, squareness: 2.75, pinchFront: 0.055 },
        { y: 0.78, rx: 0.52, rz: 0.37, squareness: 2.88, pinchFront: 0.065 },
        { y: 1.02, rx: 0.42, rz: 0.29, squareness: 2.55 },
      ],
      18
    ),
    sovereignMat
  );
  chest.castShadow = true;
  torso.add(chest);

  // Sculpted Contoured Imperial Breastplate Mantle & Bronze Gorget Framing the Apex Core!
  const cuirassGeo = createCurvedPanelGeometry(
    [
      { y: 0.36, rx: 0.45, rz: 0.35, thickness: 0.044 },
      { y: 0.68, rx: 0.54, rz: 0.39, thickness: 0.052 },
      { y: 0.94, rx: 0.46, rz: 0.33, thickness: 0.04 },
    ],
    -Math.PI * 0.86,
    -Math.PI * 0.14,
    16
  );
  ownedGeos.push(cuirassGeo);
  const cuirass = new THREE.Mesh(cuirassGeo, crimsonArmorMat);
  cuirass.castShadow = true;
  torso.add(cuirass);

  const collarGorget = new THREE.Mesh(createBeveledBox(0.62, 0.12, 0.26, 0.022), bronzeMat);
  collarGorget.position.set(0, 0.96, -0.22);
  torso.add(collarGorget);

  // Sweeping Matte Crimson & Gold War-Mantle Cape hanging CLEANLY BACKWARD (+Z) off shoulders!
  // Note: negative rotation.x swings the -Y bottom toward +Z (behind the boss, ZERO leg clipping!)
  const mantlePivot = new THREE.Group();
  mantlePivot.position.set(0, 0.94, 0.34);
  torso.add(mantlePivot);
  const mantleGeo = new THREE.PlaneGeometry(1.18, 1.82, 6, 8);
  mantleGeo.translate(0, -0.91, 0.04);
  ownedGeos.push(mantleGeo);
  const mantleMesh = new THREE.Mesh(mantleGeo, mantleMat);
  mantleMesh.rotation.x = -0.14;
  mantlePivot.add(mantleMesh);

  // Venting CHEST APEX CORE Weakpoint with Hinged Bronze Ribs!
  const weakpointAnchor = new THREE.Group();
  weakpointAnchor.position.set(0, 0.64, -0.4);
  torso.add(weakpointAnchor);

  const coreBezel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.048, 8, 20), bronzeMat);
  weakpointAnchor.add(coreBezel);

  const coreOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 1), weakpointMat);
  weakpointAnchor.add(coreOrb);

  const shutterL = new THREE.Mesh(createBeveledBox(0.16, 0.28, 0.05, 0.012), bronzeMat);
  shutterL.position.set(-0.15, 0, -0.05);
  weakpointAnchor.add(shutterL);
  const shutterR = new THREE.Mesh(createBeveledBox(0.16, 0.28, 0.05, 0.012), bronzeMat);
  shutterR.position.set(0.15, 0, -0.05);
  weakpointAnchor.add(shutterR);

  // Iconic Crested Horned Sovereign Demon-Gladiator Helm Crown
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.04, -0.04);
  torso.add(headGroup);

  const helm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.04, rx: 0.145, rz: 0.165, squareness: 2.35 },
        { y: 0.16, rx: 0.18, rz: 0.205, squareness: 2.65, pinchFront: 0.04 },
        { y: 0.36, rx: 0.155, rz: 0.17, squareness: 2.35 },
      ],
      16
    ),
    sovereignMat
  );
  helm.castShadow = true;
  headGroup.add(helm);

  // Sculpted bronze brow crown + jaw faceplate
  const browCrown = new THREE.Mesh(createBeveledBox(0.32, 0.068, 0.24, 0.014), bronzeMat);
  browCrown.position.set(0, 0.26, -0.08);
  browCrown.rotation.x = 0.16;
  headGroup.add(browCrown);

  const jawGrille = new THREE.Mesh(createBeveledBox(0.18, 0.11, 0.09, 0.014), bronzeMat);
  jawGrille.position.set(0, 0.06, -0.175);
  headGroup.add(jawGrille);

  // Glowing Emerald-Gold Marauder Visor Eyes (DOOM Eternal counter-glint homage!)
  for (const ex of [-0.072, 0.072]) {
    const eye = new THREE.Mesh(createBeveledBox(0.072, 0.034, 0.045, 0.005), mats.acidEmeraldGlow);
    eye.position.set(ex, 0.185, -0.205);
    eye.rotation.z = ex < 0 ? -0.18 : 0.18;
    headGroup.add(eye);
  }

  // Sweeping 2-Stage Crown Horns + Blazing Crimson Imperial Crest
  for (const sgn of [-1, 1] as const) {
    const crownHorn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.56, 8), bronzeMat);
    crownHorn.position.set(sgn * 0.24, 0.36, -0.02);
    crownHorn.rotation.set(-0.28, 0, -sgn * 0.58);
    crownHorn.castShadow = true;
    headGroup.add(crownHorn);

    const hornSpike = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.34, 8), mats.crucibleSteel);
    hornSpike.position.set(sgn * 0.42, 0.58, -0.1);
    hornSpike.rotation.set(-0.46, 0, -sgn * 0.18);
    headGroup.add(hornSpike);
  }
  const crestFin = new THREE.Mesh(createBeveledBox(0.055, 0.36, 0.36, 0.012), axeEnergyMat);
  crestFin.position.set(0, 0.44, 0.04);
  headGroup.add(crestFin);

  // Left Arm + CURVED TIERED SOVEREIGN PAULDRON + HEXAGONAL AEGIS PARRY-BUCKLER + WAR-SHOTGUN
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.62, 0.84, 0);
  torso.add(leftShoulder);

  const lPauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.18, rx: 0.2, rz: 0.23, thickness: 0.048 },
      { y: 0.02, rx: 0.25, rz: 0.29, thickness: 0.056 },
      { y: 0.2, rx: 0.18, rz: 0.21, thickness: 0.044 },
    ],
    Math.PI * 0.5,
    Math.PI * 1.5,
    14
  );
  ownedGeos.push(lPauldronGeo);
  const lPauldron = new THREE.Mesh(lPauldronGeo, bronzeMat);
  lPauldron.position.set(0.02, 0.05, 0);
  lPauldron.castShadow = true;
  leftShoulder.add(lPauldron);

  const lPauldronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.32, 6), mats.crucibleSteel);
  lPauldronSpike.position.set(-0.22, 0.22, 0);
  lPauldronSpike.rotation.z = 0.62;
  leftShoulder.add(lPauldronSpike);

  const lBicep = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.36, 4, 10), mats.gladiatorUndersuit);
  lBicep.position.set(0, -0.24, 0);
  leftShoulder.add(lBicep);

  const leftElbow = new THREE.Group();
  leftElbow.position.set(0, -0.48, 0);
  leftShoulder.add(leftElbow);

  const lGauntlet = new THREE.Mesh(createBeveledBox(0.175, 0.42, 0.195, 0.024), sovereignMat);
  lGauntlet.position.set(0, -0.2, 0);
  lGauntlet.castShadow = true;
  leftElbow.add(lGauntlet);

  // Hexagonal Crimson Argent Aegis Parry Shield
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.14, -0.2, -0.18);
  shieldGroup.visible = false;
  leftElbow.add(shieldGroup);

  const hexShield = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.045, 6), aegisMat);
  hexShield.rotation.x = Math.PI * 0.5;
  shieldGroup.add(hexShield);

  const hexRim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.042, 8, 6), axeEnergyMat);
  shieldGroup.add(hexRim);

  // Twin-Barrel War-Shotgun Sidearm mounted beneath left forearm
  const shotgun = new THREE.Mesh(createBeveledBox(0.14, 0.16, 0.66, 0.018), mats.gunmetalJoint);
  shotgun.position.set(0.04, -0.34, -0.28);
  leftElbow.add(shotgun);
  const shotgunMuzzle = new THREE.Object3D();
  shotgunMuzzle.position.set(0.04, -0.34, -0.64);
  leftElbow.add(shotgunMuzzle);

  // Right Arm + CURVED TIERED SOVEREIGN PAULDRON + COLOSSAL DOUBLE-BITTED ARGENT WAR-AXE
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.62, 0.84, 0);
  torso.add(rightShoulder);

  const rPauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.18, rx: 0.2, rz: 0.23, thickness: 0.048 },
      { y: 0.02, rx: 0.25, rz: 0.29, thickness: 0.056 },
      { y: 0.2, rx: 0.18, rz: 0.21, thickness: 0.044 },
    ],
    -Math.PI * 0.5,
    Math.PI * 0.5,
    14
  );
  ownedGeos.push(rPauldronGeo);
  const rPauldron = new THREE.Mesh(rPauldronGeo, bronzeMat);
  rPauldron.position.set(-0.02, 0.05, 0);
  rPauldron.castShadow = true;
  rightShoulder.add(rPauldron);

  const rPauldronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.32, 6), mats.crucibleSteel);
  rPauldronSpike.position.set(0.22, 0.22, 0);
  rPauldronSpike.rotation.z = -0.62;
  rightShoulder.add(rPauldronSpike);

  const rBicep = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.36, 4, 10), mats.gladiatorUndersuit);
  rBicep.position.set(0, -0.24, 0);
  rightShoulder.add(rBicep);

  const rightElbow = new THREE.Group();
  rightElbow.position.set(0, -0.48, 0);
  rightShoulder.add(rightElbow);

  const rGauntlet = new THREE.Mesh(createBeveledBox(0.175, 0.42, 0.195, 0.024), sovereignMat);
  rGauntlet.position.set(0, -0.2, 0);
  rGauntlet.castShadow = true;
  rightElbow.add(rGauntlet);

  const { axeGroup, tipAnchor: axeTip } = buildArgentWarAxe(
    bronzeMat,
    mats.arenaObsidianSteel,
    axeEnergyMat,
    ownedGeos
  );
  axeGroup.position.set(0, -0.42, -0.06);
  rightElbow.add(axeGroup);

  // Hitboxes
  const bodyHb = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(1.16, 2.2, 0.92));
  bodyHb.position.set(0, 0.48, 0);
  pelvis.add(bodyHb);

  const headHb = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.5, 0.5, 0.5));
  headHb.position.set(0, 0.2, 0);
  headGroup.add(headHb);

  const wpHb = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.SphereGeometry(0.36, 10, 10),
    'chest_apex_core'
  );
  weakpointAnchor.add(wpHb);

  const shieldHb = createEnemyHitboxMesh(enemyId, 'shield', new THREE.CylinderGeometry(0.92, 0.92, 0.28, 6));
  shieldHb.rotation.x = Math.PI * 0.5;
  shieldGroup.add(shieldHb);
  hitboxes.push(bodyHb, headHb, wpHb, shieldHb);

  let poseMode: MarauderPoseMode = 'stalk';
  let axeCharge = 0;

  return {
    root,
    hitboxes,
    shieldGroup,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [sovereignMat, bronzeMat, crimsonArmorMat],
    setPoseMode(mode) {
      poseMode = mode;
    },
    setAxeCharge(charge) {
      axeCharge = charge;
    },
    getMuzzleWorldPos(out) {
      return axeTip.getWorldPosition(out);
    },
    getAxeTipWorldPos(out) {
      return axeTip.getWorldPosition(out);
    },
    getShotgunMuzzleWorldPos(out) {
      return shotgunMuzzle.getWorldPosition(out);
    },
    getWeakpointWorldPos(out) {
      return weakpointAnchor.getWorldPosition(out);
    },
    updateAnimation(input: EnemyAnimationInput) {
      const {
        elapsed,
        behavior,
        speedRatio,
        attackProgress,
        flinchTimer,
        staggerTimer,
        deadProgress,
        shieldActive,
        phase,
        airborneHeight,
        weakpointExposed,
      } = input;

      shieldGroup.visible = shieldActive && behavior !== 'dead';
      shadow.scale.setScalar(Math.max(0.45, 1 - airborneHeight * 0.1));

      if (behavior === 'dead') {
        const d = Math.min(1, deadProgress);
        pelvis.position.y = 1.26 - d * 1.02;
        pelvis.rotation.x = d * 1.48;
        rightShoulder.rotation.set(-0.3 * d, 0, -0.6 * d);
        leftShoulder.rotation.set(-0.3 * d, 0, 0.6 * d);
        shadow.scale.setScalar(Math.max(0.25, 1 - d * 0.4));
        return;
      }

      pelvis.rotation.set(0, 0, 0);
      torso.rotation.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);

      const spd = Math.min(1.6, speedRatio);
      const stride = elapsed * (5.2 + spd * 3.8);
      const swing = Math.sin(stride) * 0.52 * spd;
      pelvis.position.y = 1.26 + airborneHeight + Math.abs(Math.cos(stride)) * 0.065 * spd;
      leftLeg.hip.rotation.x = swing;
      leftLeg.knee.rotation.x = Math.max(0, -Math.cos(stride) * 0.58 * spd);
      rightLeg.hip.rotation.x = -swing;
      rightLeg.knee.rotation.x = Math.max(0, Math.cos(stride) * 0.58 * spd);

      // Dynamic cape billow BACKWARD (+Z, negative X rotation so it NEVER clips forward through legs!)
      mantlePivot.rotation.x = -0.16 - Math.min(0.45, spd * 0.22) - Math.sin(elapsed * 4.2) * 0.05;

      // Commanding Warlord stance: right arm angled out & elevated so double-bitted crimson Argent War-Axe frames clearly!
      leftShoulder.rotation.set(0.38, 0.28, 0.16);
      leftElbow.rotation.set(0.62, 0, 0);
      rightShoulder.rotation.set(0.65, -0.35, -0.38);
      rightElbow.rotation.set(0.55, 0, -0.22);

      // Venting chest core shutters open dramatically when exposed, staggered, or Phase 2!
      const ventOpen = staggerTimer > 0 || weakpointExposed || phase === 2 ? 0.62 : 0.18;
      shutterL.rotation.y = -ventOpen;
      shutterL.position.x = -0.16 - ventOpen * 0.12;
      shutterR.rotation.y = ventOpen;
      shutterR.position.x = 0.16 + ventOpen * 0.12;
      coreOrb.rotation.y = elapsed * (phase === 2 ? 5.2 : 2.6);

      if (staggerTimer > 0) {
        torso.rotation.x = -0.26;
        torso.rotation.z = Math.sin(elapsed * 18) * 0.12;
        leftShoulder.rotation.set(-0.35, -0.5, 0.65);
        rightShoulder.rotation.set(-0.35, 0.5, -0.65);
      } else if (poseMode === 'parry_guard' || shieldActive) {
        torso.rotation.y = 0.42;
        leftShoulder.rotation.set(1.08, 0.68, -0.16);
        leftElbow.rotation.set(0.45, 0.45, 0);
        rightShoulder.rotation.set(0.25, -0.45, -0.32);
      } else if (poseMode === 'dash_cleave1' || poseMode === 'dash_cleave2') {
        const p = Math.min(1, attackProgress);
        const rev = poseMode === 'dash_cleave2' ? -1 : 1;
        if (behavior === 'windup') {
          torso.rotation.y = -0.75 * rev * p;
          rightShoulder.rotation.set(1.15, -0.9 * rev * p, -0.55 * p);
          rightElbow.rotation.set(0.35, 0, 0);
        } else {
          const arc = (-0.85 + p * 2.05) * rev;
          torso.rotation.y = arc * 0.72;
          rightShoulder.rotation.set(1.15, arc, -0.32);
          rightElbow.rotation.set(0.2, 0, 0);
        }
      } else if (poseMode === 'shotgun') {
        torso.rotation.y = 0.45;
        leftShoulder.rotation.set(1.38, 0.18, 0.05);
        leftElbow.rotation.set(0.12, 0, 0);
      } else if (poseMode === 'axe_wave' || poseMode === 'salvo') {
        const p = Math.min(1, attackProgress);
        const arc = behavior === 'windup' ? -0.9 * p : -0.9 + p * 2.15;
        torso.rotation.y = arc * 0.6;
        rightShoulder.rotation.set(1.2, arc, -0.35);
        rightElbow.rotation.set(0.18, 0, 0);
      } else if (poseMode === 'leap_crouch') {
        const p = Math.min(1, attackProgress);
        pelvis.position.y = 1.26 - p * 0.28;
        torso.rotation.x = 0.28 * p;
        rightShoulder.rotation.set(1.9 * p, -0.2, -0.2);
      } else if (poseMode === 'leap_air') {
        torso.rotation.x = -0.28 + attackProgress * 0.65;
        rightShoulder.rotation.set(2.55 - attackProgress * 1.6, 0, -0.1);
        rightElbow.rotation.set(0.2, 0, 0);
      } else if (poseMode === 'cataclysm_slam') {
        torso.rotation.x = 0.48;
        rightShoulder.rotation.set(0.25, 0.15, -0.12);
        rightElbow.rotation.set(0.25, 0, 0);
      }

      if (flinchTimer > 0) {
        torso.rotation.x -= flinchTimer * 0.5;
        torso.rotation.z += input.flinchDirX * flinchTimer * 0.35;
      }

      const pBoost = phase === 2 ? 1.5 : 0;
      weakpointMat.emissiveIntensity =
        2.1 + pBoost + (weakpointExposed ? 1.4 : 0) + Math.sin(elapsed * 9.5) * 0.55;
      axeEnergyMat.emissiveIntensity = 2.0 + pBoost + axeCharge * 2.2;
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}
