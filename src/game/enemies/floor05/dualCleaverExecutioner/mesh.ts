import * as THREE from 'three';
import { createBeveledBox, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { ExecutionerTextureSuite } from './textures';

export type ExecutionerPoseMode =
  | 'stalk'
  | 'x_cleave'
  | 'whirlwind'
  | 'leap_crouch'
  | 'leap_air'
  | 'guillotine'
  | 'wave';

export interface DualCleaverExecutionerRigHandle extends EnemyRigHandle {
  setPoseMode: (mode: ExecutionerPoseMode) => void;
  setCleaverHeat: (heat: number) => void;
}

function buildExecutionerCleaver(
  steelMat: THREE.Material,
  darkMat: THREE.Material,
  bronzeMat: THREE.Material,
  moltenEdgeMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): THREE.Group {
  const cleaver = new THREE.Group();

  // Heavy wrap grip + bronze pommel ring
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.46, 10), darkMat);
  grip.rotation.x = Math.PI * 0.5;
  grip.position.z = 0.06;
  cleaver.add(grip);

  const pommelRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 14), bronzeMat);
  pommelRing.position.set(0, 0, 0.34);
  cleaver.add(pommelRing);

  const guard = new THREE.Mesh(createBeveledBox(0.18, 0.28, 0.085, 0.016), bronzeMat);
  guard.position.set(0, 0.03, -0.18);
  cleaver.add(guard);

  // Sculpted notched brutalist butcher-cleaver blade profile extending forward along -Z
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -0.06);
  bladeShape.lineTo(1.24, -0.18);
  bladeShape.lineTo(1.42, 0.04);
  bladeShape.lineTo(1.26, 0.28);
  bladeShape.lineTo(0.92, 0.24);
  bladeShape.lineTo(0.84, 0.16);
  bladeShape.lineTo(0.42, 0.18);
  bladeShape.lineTo(0, 0.12);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.044,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.022);
  bladeGeo.rotateY(Math.PI * 0.5);
  ownedGeos.push(bladeGeo);

  const bladeMesh = new THREE.Mesh(bladeGeo, steelMat);
  bladeMesh.position.set(0, 0.02, -0.2);
  bladeMesh.castShadow = true;
  cleaver.add(bladeMesh);

  // Heavy spine ridge + Molten thermal plasma cutting edge along lower bevel
  const spineRidge = new THREE.Mesh(createBeveledBox(0.06, 0.055, 1.05, 0.01), darkMat);
  spineRidge.position.set(0, 0.16, -0.78);
  cleaver.add(spineRidge);

  const moltenEdge = new THREE.Mesh(createBeveledBox(0.028, 0.062, 1.34, 0.006), moltenEdgeMat);
  moltenEdge.position.set(0, -0.12, -0.84);
  moltenEdge.rotation.x = -0.08;
  cleaver.add(moltenEdge);

  return cleaver;
}

function buildHeavyLeg(
  armorMat: THREE.Material,
  darkMat: THREE.Material,
  bronzeMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
) {
  const hip = new THREE.Group();
  const thigh = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.15, rz: 0.16, squareness: 2.5 },
        { y: -0.26, rx: 0.14, rz: 0.15, squareness: 2.6 },
        { y: -0.5, rx: 0.108, rz: 0.118, squareness: 2.3 },
      ],
      14
    ),
    darkMat
  );
  thigh.castShadow = true;
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.set(0, -0.5, 0);
  hip.add(knee);

  const kneeGeo = createCurvedPanelGeometry(
    [
      { y: -0.09, rx: 0.125, rz: 0.135, thickness: 0.028 },
      { y: 0.01, rx: 0.14, rz: 0.152, thickness: 0.032 },
      { y: 0.1, rx: 0.12, rz: 0.13, thickness: 0.024 },
    ],
    -Math.PI * 0.85,
    -Math.PI * 0.15,
    10
  );
  ownedGeos.push(kneeGeo);
  const kneeGuard = new THREE.Mesh(kneeGeo, bronzeMat);
  knee.add(kneeGuard);

  const kneeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.22, 6), bronzeMat);
  kneeSpike.rotation.x = -Math.PI * 0.5;
  kneeSpike.position.set(0, 0.02, -0.18);
  knee.add(kneeSpike);

  const shin = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.112, rz: 0.122, squareness: 2.5 },
        { y: -0.25, rx: 0.135, rz: 0.145, squareness: 2.7, pinchFront: 0.03 },
        { y: -0.52, rx: 0.118, rz: 0.128, squareness: 2.5 },
      ],
      14
    ),
    armorMat
  );
  shin.castShadow = true;
  knee.add(shin);

  const ankle = new THREE.Group();
  ankle.position.set(0, -0.52, 0);
  knee.add(ankle);

  const boot = new THREE.Mesh(createBeveledBox(0.22, 0.11, 0.36, 0.018), darkMat);
  boot.position.set(0, -0.055, -0.05);
  boot.castShadow = true;
  ankle.add(boot);

  return { hip, knee, ankle };
}

export function buildDualCleaverExecutionerRig(
  enemyId: string,
  mats: Floor05EnemyMaterials,
  textures: ExecutionerTextureSuite
): DualCleaverExecutionerRigHandle {
  const root = new THREE.Group();
  root.name = `DualCleaverExecutioner_${enemyId}`;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const hitboxes: THREE.Mesh[] = [];

  // Bright neutral tint so furnacePlateMap iron bands, rivets, and glowing ember cracks render vividly!
  const furnaceArmorMat = mats.createFlashArmorMaterial(0xdce4ee, 0.66, 0.38, 'gladiator');
  furnaceArmorMat.map = textures.furnacePlateMap;
  const crimsonMat = mats.createFlashArmorMaterial(0xc62636, 0.38, 0.42, 'gladiator');
  const weakpointMat = mats.createWeakpointMaterial(0xff6b2b, 0xef4444);
  const cleaverEdgeMat = mats.createWeakpointMaterial(0xff8a4c, 0xea2a1e);
  ownedMats.push(furnaceArmorMat, crimsonMat, weakpointMat, cleaverEdgeMat);

  const shadow = createEnemyContactShadow(1.16, mats.shadowDisc);
  root.add(shadow);

  // Pelvis at y = 1.13m (0.50 + 0.52 + 0.11 = 1.13m -> boots flush!)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.13, 0);
  root.add(pelvis);

  const waist = new THREE.Mesh(createBeveledBox(0.58, 0.24, 0.44, 0.032), furnaceArmorMat);
  pelvis.add(waist);

  const warBelt = new THREE.Mesh(createBeveledBox(0.64, 0.11, 0.48, 0.018), mats.arenaBronze);
  warBelt.position.set(0, 0.05, 0);
  pelvis.add(warBelt);

  // Crimson Executioner Battle Tabard + Flanking Armored Tassets
  const tabard = new THREE.Mesh(createBeveledBox(0.3, 0.56, 0.045, 0.012), crimsonMat);
  tabard.position.set(0, -0.28, -0.23);
  tabard.rotation.x = -0.06;
  tabard.castShadow = true;
  pelvis.add(tabard);

  for (const sx of [-1, 1] as const) {
    const sideTasset = new THREE.Mesh(createBeveledBox(0.18, 0.38, 0.26, 0.02), furnaceArmorMat);
    sideTasset.position.set(sx * 0.32, -0.18, -0.04);
    sideTasset.rotation.z = sx * 0.14;
    sideTasset.castShadow = true;
    pelvis.add(sideTasset);
  }

  const leftLeg = buildHeavyLeg(furnaceArmorMat, mats.arenaObsidianSteel, mats.arenaBronze, ownedGeos);
  leftLeg.hip.position.set(-0.22, 0, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildHeavyLeg(furnaceArmorMat, mats.arenaObsidianSteel, mats.arenaBronze, ownedGeos);
  rightLeg.hip.position.set(0.22, 0, 0);
  pelvis.add(rightLeg.hip);

  // Broad Towering Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.18, 0);
  pelvis.add(torso);

  const chest = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.27, rz: 0.22, squareness: 2.5 },
        { y: 0.3, rx: 0.39, rz: 0.3, squareness: 2.7, pinchFront: 0.045 },
        { y: 0.68, rx: 0.46, rz: 0.33, squareness: 2.8, pinchFront: 0.055 },
        { y: 0.88, rx: 0.38, rz: 0.26, squareness: 2.5 },
      ],
      18
    ),
    furnaceArmorMat
  );
  chest.castShadow = true;
  torso.add(chest);

  // Layered Curved Heavy Furnace Breastplate Collar + Forged Rib Bars
  const upperBreastGeo = createCurvedPanelGeometry(
    [
      { y: 0.46, rx: 0.44, rz: 0.34, thickness: 0.045 },
      { y: 0.66, rx: 0.48, rz: 0.37, thickness: 0.052 },
      { y: 0.84, rx: 0.41, rz: 0.3, thickness: 0.04 },
    ],
    -Math.PI * 0.84,
    -Math.PI * 0.16,
    14
  );
  ownedGeos.push(upperBreastGeo);
  const upperBreast = new THREE.Mesh(upperBreastGeo, mats.gladiatorIron);
  upperBreast.castShadow = true;
  torso.add(upperBreast);

  const gorgetRim = new THREE.Mesh(createBeveledBox(0.56, 0.1, 0.24, 0.018), mats.arenaBronze);
  gorgetRim.position.set(0, 0.84, -0.22);
  torso.add(gorgetRim);

  // Glowing Chest Forge Grate Ribs with dark iron dividers
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(createBeveledBox(0.38 - i * 0.06, 0.052, 0.055, 0.008), cleaverEdgeMat);
    rib.position.set(0, 0.66 - i * 0.14, -0.37);
    torso.add(rib);
  }

  // Blazing DORSAL SPINE FURNACE (Weakpoint on Back +Z)
  const weakpointAnchor = new THREE.Group();
  weakpointAnchor.position.set(0, 0.56, 0.38);
  torso.add(weakpointAnchor);

  const furnaceCage = new THREE.Mesh(createBeveledBox(0.42, 0.64, 0.26, 0.032), mats.arenaObsidianSteel);
  furnaceCage.castShadow = true;
  weakpointAnchor.add(furnaceCage);

  const furnaceCore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.52, 12), weakpointMat);
  furnaceCore.position.set(0, 0.02, 0.12);
  weakpointAnchor.add(furnaceCore);

  for (const sx of [-0.18, 0.18]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.072, 0.44, 10), mats.gunmetalJoint);
    stack.position.set(sx, 0.42, 0.02);
    stack.rotation.z = -Math.sign(sx) * 0.22;
    weakpointAnchor.add(stack);

    const ventGlow = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), weakpointMat);
    ventGlow.position.set(sx * 1.24, 0.64, 0.02);
    weakpointAnchor.add(ventGlow);
  }

  // Sculpted Horned Iron Cage-Helm Head with Slatted Furnace Grille (ZERO plain brick!)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.9, -0.05);
  torso.add(headGroup);

  const maskHelm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.02, rx: 0.15, rz: 0.16, squareness: 2.55 },
        { y: 0.16, rx: 0.175, rz: 0.195, squareness: 2.75, pinchFront: 0.036 },
        { y: 0.32, rx: 0.155, rz: 0.17, squareness: 2.45 },
        { y: 0.4, rx: 0.1, rz: 0.11, squareness: 2.1 },
      ],
      16
    ),
    furnaceArmorMat
  );
  maskHelm.castShadow = true;
  headGroup.add(maskHelm);

  const crownBar = new THREE.Mesh(createBeveledBox(0.36, 0.075, 0.36, 0.018), mats.arenaBronze);
  crownBar.position.set(0, 0.32, -0.01);
  headGroup.add(crownBar);

  // Glowing Crimson Grated Eye Slit with Vertical Executioner Cage Bars!
  const eyeGlow = new THREE.Mesh(createBeveledBox(0.24, 0.065, 0.045, 0.008), mats.moltenCrimsonGlow);
  eyeGlow.position.set(0, 0.19, -0.185);
  headGroup.add(eyeGlow);

  for (const bx of [-0.085, -0.028, 0.028, 0.085]) {
    const bar = new THREE.Mesh(createBeveledBox(0.018, 0.19, 0.028, 0.004), mats.arenaBronze);
    bar.position.set(bx, 0.16, -0.21);
    headGroup.add(bar);
  }

  // Twin Forged Iron Executioner Horns
  for (const sgn of [-1, 1] as const) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.38, 8), mats.arenaBronze);
    horn.position.set(sgn * 0.2, 0.34, -0.04);
    horn.rotation.set(-0.22, 0, -sgn * 0.65);
    horn.castShadow = true;
    headGroup.add(horn);
  }

  // Sculpted Curved Heavy Domed Pauldrons & Twin Massive Cleaver Arms
  const buildArmWithCleaver = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.56, 0.72, 0);
    torso.add(shoulder);

    const pauldronGeo = createCurvedPanelGeometry(
      [
        { y: -0.16, rx: 0.18, rz: 0.21, thickness: 0.045 },
        { y: 0.02, rx: 0.23, rz: 0.26, thickness: 0.052 },
        { y: 0.18, rx: 0.17, rz: 0.2, thickness: 0.04 },
      ],
      side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
      side < 0 ? Math.PI * 1.5 : Math.PI * 0.5,
      14
    );
    ownedGeos.push(pauldronGeo);
    const pauldron = new THREE.Mesh(pauldronGeo, side === -1 ? crimsonMat : mats.arenaBronze);
    pauldron.position.set(-side * 0.01, 0.04, 0);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    const rimBand = new THREE.Mesh(createBeveledBox(0.28, 0.055, 0.34, 0.012), mats.arenaBronze);
    rimBand.position.set(side * 0.08, -0.1, 0);
    rimBand.rotation.z = -side * 0.28;
    shoulder.add(rimBand);

    for (let s = 0; s < 3; s++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.28, 6), mats.crucibleSteel);
      spike.position.set(side * 0.18, 0.22, -0.12 + s * 0.12);
      spike.rotation.z = -side * 0.48;
      shoulder.add(spike);
    }

    const bicep = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.32, 4, 10), mats.gladiatorUndersuit);
    bicep.position.set(0, -0.22, 0);
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.44, 0);
    shoulder.add(elbow);

    const gauntlet = new THREE.Mesh(createBeveledBox(0.165, 0.38, 0.175, 0.024), furnaceArmorMat);
    gauntlet.position.set(0, -0.18, 0);
    gauntlet.castShadow = true;
    elbow.add(gauntlet);

    const cleaver = buildExecutionerCleaver(
      mats.crucibleSteel,
      mats.arenaObsidianSteel,
      mats.arenaBronze,
      cleaverEdgeMat,
      ownedGeos
    );
    cleaver.position.set(0, -0.38, -0.06);
    elbow.add(cleaver);

    return { shoulder, elbow, cleaver };
  };

  const leftArm = buildArmWithCleaver(-1);
  const rightArm = buildArmWithCleaver(1);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, 0.56, -0.95);
  torso.add(muzzleAnchor);

  // Hitboxes
  const bodyHb = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(1.06, 1.9, 0.84));
  bodyHb.position.set(0, 0.38, 0);
  pelvis.add(bodyHb);

  const headHb = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.46, 0.46, 0.46));
  headHb.position.set(0, 0.18, 0);
  headGroup.add(headHb);

  const wpHb = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.58, 0.78, 0.46),
    'spine_furnace'
  );
  wpHb.position.set(0, 0.1, 0.12);
  weakpointAnchor.add(wpHb);
  hitboxes.push(bodyHb, headHb, wpHb);

  let poseMode: ExecutionerPoseMode = 'stalk';
  let cleaverHeat = 0;

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [furnaceArmorMat, crimsonMat],
    setPoseMode(mode) {
      poseMode = mode;
    },
    setCleaverHeat(heat) {
      cleaverHeat = heat;
    },
    getMuzzleWorldPos(out) {
      return muzzleAnchor.getWorldPosition(out);
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
        airborneHeight,
        phase,
      } = input;

      shadow.scale.setScalar(Math.max(0.45, 1 - airborneHeight * 0.12));

      if (behavior === 'dead') {
        const d = Math.min(1, deadProgress);
        pelvis.position.y = 1.13 - d * 0.9;
        pelvis.rotation.x = d * 1.48;
        leftArm.shoulder.rotation.set(0, 0, 0.6 * d);
        rightArm.shoulder.rotation.set(0, 0, -0.6 * d);
        shadow.scale.setScalar(Math.max(0.25, 1 - d * 0.4));
        return;
      }

      pelvis.rotation.set(0, 0, 0);
      torso.rotation.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);

      const spd = Math.min(1.5, speedRatio);
      const stride = elapsed * (5.0 + spd * 3.5);
      const swing = Math.sin(stride) * 0.5 * spd;
      pelvis.position.y = 1.13 + airborneHeight + Math.abs(Math.cos(stride)) * 0.06 * spd;
      leftLeg.hip.rotation.x = swing;
      leftLeg.knee.rotation.x = Math.max(0, -Math.cos(stride) * 0.55 * spd);
      rightLeg.hip.rotation.x = -swing;
      rightLeg.knee.rotation.x = Math.max(0, Math.cos(stride) * 0.55 * spd);

      // Menacing dual-cleaver stalking guard (cleavers angled clearly outward & forward along -Z)
      leftArm.shoulder.rotation.set(0.48, 0.22, 0.24);
      leftArm.elbow.rotation.set(0.72, 0, 0);
      rightArm.shoulder.rotation.set(0.48, -0.22, -0.24);
      rightArm.elbow.rotation.set(0.72, 0, 0);

      if (staggerTimer > 0) {
        torso.rotation.x = 0.52;
        torso.rotation.z = Math.sin(elapsed * 18) * 0.12;
        leftArm.shoulder.rotation.set(-0.35, 0.4, 0.72);
        rightArm.shoulder.rotation.set(-0.35, -0.4, -0.72);
      } else if (poseMode === 'whirlwind') {
        torso.rotation.y = elapsed * (phase === 2 ? 19.5 : 15.5);
        leftArm.shoulder.rotation.set(1.25, 0.45, 0.95);
        rightArm.shoulder.rotation.set(1.25, -0.45, -0.95);
        leftArm.elbow.rotation.set(0.15, 0, 0);
        rightArm.elbow.rotation.set(0.15, 0, 0);
      } else if (poseMode === 'x_cleave') {
        const p = Math.min(1, attackProgress);
        if (behavior === 'windup') {
          torso.rotation.x = -0.22 * p;
          leftArm.shoulder.rotation.set(1.45 * p, -0.65 * p, 0.85 * p);
          rightArm.shoulder.rotation.set(1.45 * p, 0.65 * p, -0.85 * p);
        } else {
          const slash = -0.9 + p * 2.1;
          torso.rotation.x = 0.32;
          leftArm.shoulder.rotation.set(1.05, slash, 0.35);
          rightArm.shoulder.rotation.set(1.05, -slash, -0.35);
          leftArm.elbow.rotation.set(0.2, 0, 0);
          rightArm.elbow.rotation.set(0.2, 0, 0);
        }
      } else if (poseMode === 'guillotine') {
        const p = Math.min(1, attackProgress);
        if (behavior === 'windup') {
          torso.rotation.x = -0.35 * p;
          leftArm.shoulder.rotation.set(2.55 * p, 0.18, 0.12);
          rightArm.shoulder.rotation.set(2.55 * p, -0.18, -0.12);
        } else {
          torso.rotation.x = 0.48;
          leftArm.shoulder.rotation.set(0.15 - p * 0.2, 0.1, 0.1);
          rightArm.shoulder.rotation.set(0.15 - p * 0.2, -0.1, -0.1);
        }
      } else if (poseMode === 'leap_crouch') {
        const p = Math.min(1, attackProgress);
        pelvis.position.y = 1.13 - p * 0.26;
        torso.rotation.x = 0.25 * p;
        leftArm.shoulder.rotation.set(-0.35, 0.3, 0.45);
        rightArm.shoulder.rotation.set(-0.35, -0.3, -0.45);
      } else if (poseMode === 'leap_air') {
        torso.rotation.x = -0.25 + attackProgress * 0.72;
        leftArm.shoulder.rotation.set(2.35 - attackProgress * 1.9, 0.2, 0.22);
        rightArm.shoulder.rotation.set(2.35 - attackProgress * 1.9, -0.2, -0.22);
      } else if (poseMode === 'wave') {
        const p = Math.min(1, attackProgress);
        const a = behavior === 'windup' ? -0.75 * p : -0.75 + p * 1.9;
        torso.rotation.y = a * 0.55;
        leftArm.shoulder.rotation.set(1.1, a, 0.45);
        rightArm.shoulder.rotation.set(1.1, -a, -0.45);
      }

      if (flinchTimer > 0) {
        torso.rotation.x -= flinchTimer * 0.65;
        torso.rotation.z += input.flinchDirX * flinchTimer * 0.45;
      }

      const phaseBoost = phase === 2 ? 1.45 : 0;
      weakpointMat.emissiveIntensity = input.weakpointBroken
        ? 0.25
        : 2.2 + phaseBoost + Math.sin(elapsed * 9.5) * 0.6;
      cleaverEdgeMat.emissiveIntensity = 1.8 + phaseBoost + cleaverHeat * 2.2;
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}
