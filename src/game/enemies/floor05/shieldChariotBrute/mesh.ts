import * as THREE from 'three';
import { createBeveledBox, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { BruteTextureSuite } from './textures';

export type BrutePoseMode = 'march' | 'rush_windup' | 'rush_charge' | 'slam' | 'flak' | 'bash';

export interface ShieldChariotBruteRigHandle extends EnemyRigHandle {
  setPoseMode: (mode: BrutePoseMode) => void;
  setBoosterFlame: (intensity: number) => void;
}

function buildJuggernautLeg(
  side: -1 | 1,
  armorMat: THREE.Material,
  bronzeMat: THREE.Material,
  jointMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
) {
  const hip = new THREE.Group();

  const thigh = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.145, rz: 0.155, squareness: 2.5 },
        { y: -0.24, rx: 0.14, rz: 0.15, squareness: 2.6 },
        { y: -0.46, rx: 0.11, rz: 0.118, squareness: 2.4 },
      ],
      14
    ),
    armorMat
  );
  thigh.castShadow = true;
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.set(0, -0.46, 0);
  hip.add(knee);

  // Sculpted curved bronze knee greave cap instead of raw cube
  const kneeGeo = createCurvedPanelGeometry(
    [
      { y: -0.09, rx: 0.125, rz: 0.138, thickness: 0.028 },
      { y: 0.01, rx: 0.14, rz: 0.155, thickness: 0.032 },
      { y: 0.1, rx: 0.12, rz: 0.132, thickness: 0.024 },
    ],
    -Math.PI * 0.85,
    -Math.PI * 0.15,
    10
  );
  ownedGeos.push(kneeGeo);
  const kneeCap = new THREE.Mesh(kneeGeo, bronzeMat);
  kneeCap.castShadow = true;
  knee.add(kneeCap);

  const shin = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.115, rz: 0.125, squareness: 2.5 },
        { y: -0.22, rx: 0.138, rz: 0.148, squareness: 2.7, pinchFront: 0.034 },
        { y: -0.48, rx: 0.122, rz: 0.132, squareness: 2.6 },
      ],
      14
    ),
    armorMat
  );
  shin.castShadow = true;
  knee.add(shin);

  const ankle = new THREE.Group();
  ankle.position.set(0, -0.48, 0);
  knee.add(ankle);

  const stompBoot = new THREE.Mesh(createBeveledBox(0.22, 0.11, 0.36, 0.02), jointMat);
  stompBoot.position.set(side * 0.01, -0.055, -0.05);
  stompBoot.castShadow = true;
  ankle.add(stompBoot);

  return { hip, knee, ankle };
}

export function buildShieldChariotBruteRig(
  enemyId: string,
  mats: Floor05EnemyMaterials,
  textures: BruteTextureSuite
): ShieldChariotBruteRigHandle {
  const root = new THREE.Group();
  root.name = `ShieldChariotBrute_${enemyId}`;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const hitboxes: THREE.Mesh[] = [];

  const heavyIronMat = mats.createFlashArmorMaterial(0x808ca0, 0.62, 0.38, 'gladiator');
  const crimsonMat = mats.createFlashArmorMaterial(0xc42636, 0.38, 0.42, 'gladiator');
  const prowPlateMat = new THREE.MeshStandardMaterial({
    map: textures.prowMap,
    color: 0xdce4f0,
    metalness: 0.56,
    roughness: 0.38,
  });
  const weakpointMat = mats.createWeakpointMaterial(0xfb923c, 0xf97316);
  const boosterGlowMat = mats.createWeakpointMaterial(0xfef08a, 0xf97316);
  ownedMats.push(heavyIronMat, crimsonMat, prowPlateMat, weakpointMat, boosterGlowMat);

  const shadow = createEnemyContactShadow(1.06, mats.shadowDisc);
  root.add(shadow);

  // Heavy pelvis at y = 1.05m (0.46 + 0.48 + 0.11 = 1.05m -> boots flush!)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.05, 0);
  root.add(pelvis);

  const hipBlock = new THREE.Mesh(createBeveledBox(0.62, 0.24, 0.46, 0.036), heavyIronMat);
  hipBlock.castShadow = true;
  pelvis.add(hipBlock);

  const beltTrim = new THREE.Mesh(createBeveledBox(0.65, 0.09, 0.49, 0.016), mats.arenaBronze);
  beltTrim.position.set(0, 0.04, 0);
  pelvis.add(beltTrim);

  const leftLeg = buildJuggernautLeg(-1, heavyIronMat, mats.arenaBronze, mats.gunmetalJoint, ownedGeos);
  leftLeg.hip.position.set(-0.22, 0, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildJuggernautLeg(1, heavyIronMat, mats.arenaBronze, mats.gunmetalJoint, ownedGeos);
  rightLeg.hip.position.set(0.22, 0, 0);
  pelvis.add(rightLeg.hip);

  // Massive Hulking Barrel Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.16, 0);
  pelvis.add(torso);

  const chest = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.28, rz: 0.23, squareness: 2.5 },
        { y: 0.28, rx: 0.38, rz: 0.3, squareness: 2.7, pinchFront: 0.04 },
        { y: 0.62, rx: 0.44, rz: 0.32, squareness: 2.8, pinchFront: 0.05 },
        { y: 0.82, rx: 0.36, rz: 0.25, squareness: 2.5 },
      ],
      18
    ),
    heavyIronMat
  );
  chest.castShadow = true;
  torso.add(chest);

  // Curved Crimson Minotaur Breastplate Collar
  const collarGeo = createCurvedPanelGeometry(
    [
      { y: 0.44, rx: 0.42, rz: 0.33, thickness: 0.042 },
      { y: 0.62, rx: 0.46, rz: 0.35, thickness: 0.048 },
      { y: 0.78, rx: 0.4, rz: 0.29, thickness: 0.036 },
    ],
    -Math.PI * 0.84,
    -Math.PI * 0.16,
    14
  );
  ownedGeos.push(collarGeo);
  const collar = new THREE.Mesh(collarGeo, crimsonMat);
  collar.castShadow = true;
  torso.add(collar);

  // Glowing DORSAL CHARIOT BOOSTER REACTOR (Weakpoint on Back +Z)
  const weakpointAnchor = new THREE.Group();
  weakpointAnchor.position.set(0, 0.56, 0.38);
  torso.add(weakpointAnchor);

  const reactorHousing = new THREE.Mesh(createBeveledBox(0.46, 0.44, 0.26, 0.032), mats.arenaObsidianSteel);
  reactorHousing.castShadow = true;
  weakpointAnchor.add(reactorHousing);

  const reactorCore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.34, 14), weakpointMat);
  reactorCore.position.set(0, 0, 0.12);
  weakpointAnchor.add(reactorCore);

  const flames: THREE.Mesh[] = [];
  for (const bx of [-0.22, 0.22]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.22, 10), mats.gunmetalJoint);
    nozzle.rotation.x = Math.PI * 0.42;
    nozzle.position.set(bx, -0.06, 0.18);
    weakpointAnchor.add(nozzle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 8), boosterGlowMat);
    flame.rotation.x = Math.PI * 0.42;
    flame.position.set(bx, -0.14, 0.44);
    flame.visible = false;
    weakpointAnchor.add(flame);
    flames.push(flame);
  }

  // Sculpted Horned Minotaur Gladiator Siege Helm
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.84, -0.08);
  torso.add(headGroup);

  const helm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.02, rx: 0.15, rz: 0.16, squareness: 2.5 },
        { y: 0.16, rx: 0.175, rz: 0.195, squareness: 2.75, pinchFront: 0.032 },
        { y: 0.32, rx: 0.15, rz: 0.165, squareness: 2.4 },
      ],
      16
    ),
    mats.arenaObsidianSteel
  );
  helm.castShadow = true;
  headGroup.add(helm);

  const helmCrest = new THREE.Mesh(createBeveledBox(0.08, 0.12, 0.32, 0.014), mats.arenaBronze);
  helmCrest.position.set(0, 0.32, 0);
  headGroup.add(helmCrest);

  const visor = new THREE.Mesh(createBeveledBox(0.24, 0.055, 0.05, 0.008), mats.moltenCrimsonGlow);
  visor.position.set(0, 0.17, -0.19);
  headGroup.add(visor);

  for (const sgn of [-1, 1] as const) {
    const hornBase = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.34, 8), mats.arenaBronze);
    hornBase.position.set(sgn * 0.22, 0.26, -0.04);
    hornBase.rotation.set(0.38, 0, -sgn * 0.92);
    hornBase.castShadow = true;
    headGroup.add(hornBase);

    const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.28, 8), mats.crucibleSteel);
    hornTip.position.set(sgn * 0.35, 0.39, -0.18);
    hornTip.rotation.set(-0.62, 0, -sgn * 0.28);
    hornTip.castShadow = true;
    headGroup.add(hornTip);
  }

  // Left Arm + SCULPTED V-PROW CHARIOT RAM SHIELD (Steel+Bronze Siege Ram + Angled Plasma Wing-Flanges!)
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.52, 0.68, 0);
  torso.add(leftShoulder);

  const lPauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.15, rx: 0.16, rz: 0.19, thickness: 0.042 },
      { y: 0.0, rx: 0.2, rz: 0.23, thickness: 0.048 },
      { y: 0.15, rx: 0.15, rz: 0.18, thickness: 0.036 },
    ],
    Math.PI * 0.52,
    Math.PI * 1.48,
    12
  );
  ownedGeos.push(lPauldronGeo);
  const lPauldron = new THREE.Mesh(lPauldronGeo, crimsonMat);
  lPauldron.position.set(0.02, 0.04, 0);
  lPauldron.castShadow = true;
  leftShoulder.add(lPauldron);

  const lArm = new THREE.Mesh(createBeveledBox(0.18, 0.56, 0.2, 0.025), heavyIronMat);
  lArm.position.set(0, -0.32, -0.06);
  leftShoulder.add(lArm);

  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(0.06, -0.36, -0.34);
  leftShoulder.add(shieldGroup);

  // Sculpted V-shaped Armored Chariot Prow Ram plates with bronze top/bottom armored rims!
  for (const sgn of [-1, 1] as const) {
    const wing = new THREE.Group();
    wing.position.set(sgn * 0.25, 0, -0.08);
    wing.rotation.y = -sgn * 0.38;
    shieldGroup.add(wing);

    const prowPlate = new THREE.Mesh(createBeveledBox(0.54, 1.38, 0.11, 0.02), prowPlateMat);
    prowPlate.castShadow = true;
    wing.add(prowPlate);

    const upperTrim = new THREE.Mesh(createBeveledBox(0.58, 0.1, 0.15, 0.016), mats.arenaBronze);
    upperTrim.position.set(0, 0.66, -0.01);
    wing.add(upperTrim);

    const lowerTrim = new THREE.Mesh(createBeveledBox(0.58, 0.12, 0.15, 0.016), mats.arenaBronze);
    lowerTrim.position.set(0, -0.65, -0.01);
    wing.add(lowerTrim);

    // Sleek chamfered translucent energy flange projecting ONLY along outer prow wing edge (not hiding the steel prow!)
    const plasmaWing = new THREE.Mesh(
      createBeveledBox(0.24, 1.24, 0.035, 0.008),
      mats.gladiatorAegisShield
    );
    plasmaWing.position.set(sgn * 0.37, 0, -0.02);
    wing.add(plasmaWing);

    // Steel bull-ram horns flanking the upper prow corners
    const prowHorn = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.34, 6), mats.arenaBronze);
    prowHorn.position.set(sgn * 0.24, 0.72, -0.08);
    prowHorn.rotation.set(-0.55, 0, -sgn * 0.45);
    wing.add(prowHorn);
  }

  // Central bronze armored keel spine + glowing molten core strip + twin lower ram tusks
  const keelSpine = new THREE.Mesh(createBeveledBox(0.14, 1.48, 0.18, 0.02), mats.arenaBronze);
  keelSpine.position.set(0, 0, -0.2);
  keelSpine.castShadow = true;
  shieldGroup.add(keelSpine);

  const prowKeelGlow = new THREE.Mesh(createBeveledBox(0.055, 1.38, 0.06, 0.01), mats.plasmaGoldGlow);
  prowKeelGlow.position.set(0, 0, -0.28);
  shieldGroup.add(prowKeelGlow);

  for (const tx of [-0.26, 0.26]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.42, 6), mats.crucibleSteel);
    tusk.rotation.x = -Math.PI * 0.5;
    tusk.position.set(tx, -0.44, -0.28);
    shieldGroup.add(tusk);
  }

  // Right Arm + HEAVY ROTARY SHRAPNEL FLAK-CANNON
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.52, 0.68, 0);
  torso.add(rightShoulder);

  const rPauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.15, rx: 0.16, rz: 0.19, thickness: 0.042 },
      { y: 0.0, rx: 0.2, rz: 0.23, thickness: 0.048 },
      { y: 0.15, rx: 0.15, rz: 0.18, thickness: 0.036 },
    ],
    -Math.PI * 0.48,
    Math.PI * 0.48,
    12
  );
  ownedGeos.push(rPauldronGeo);
  const rPauldron = new THREE.Mesh(rPauldronGeo, mats.arenaBronze);
  rPauldron.position.set(-0.02, 0.04, 0);
  rPauldron.castShadow = true;
  rightShoulder.add(rPauldron);

  const rArm = new THREE.Mesh(createBeveledBox(0.18, 0.44, 0.2, 0.024), heavyIronMat);
  rArm.position.set(0, -0.26, 0);
  rightShoulder.add(rArm);

  const cannonGroup = new THREE.Group();
  cannonGroup.position.set(0.04, -0.46, -0.18);
  rightShoulder.add(cannonGroup);

  const cannonBody = new THREE.Mesh(createBeveledBox(0.26, 0.26, 0.72, 0.028), mats.gladiatorIron);
  cannonBody.position.set(0, 0, -0.22);
  cannonBody.castShadow = true;
  cannonGroup.add(cannonBody);

  const cannonShroud = new THREE.Mesh(createBeveledBox(0.28, 0.08, 0.44, 0.014), mats.arenaBronze);
  cannonShroud.position.set(0, 0.13, -0.28);
  cannonGroup.add(cannonShroud);

  const barrelCluster = new THREE.Group();
  barrelCluster.position.set(0, 0, -0.66);
  cannonGroup.add(barrelCluster);
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI * 2;
    const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.48, 8), mats.crucibleSteel);
    brl.rotation.x = Math.PI * 0.5;
    brl.position.set(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0);
    barrelCluster.add(brl);
  }
  const barrelClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 12), mats.arenaBronze);
  barrelClamp.rotation.x = Math.PI * 0.5;
  barrelClamp.position.set(0, 0, -0.14);
  barrelCluster.add(barrelClamp);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, 0, -0.92);
  cannonGroup.add(muzzleAnchor);

  // Hitboxes
  const bodyHb = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(0.95, 1.72, 0.78));
  bodyHb.position.set(0, 0.35, 0);
  pelvis.add(bodyHb);

  const headHb = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.46, 0.44, 0.44));
  headHb.position.set(0, 0.16, 0);
  headGroup.add(headHb);

  const wpHb = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.58, 0.56, 0.44),
    'dorsal_booster'
  );
  wpHb.position.set(0, 0, 0.14);
  weakpointAnchor.add(wpHb);

  const shieldHb = createEnemyHitboxMesh(enemyId, 'shield', new THREE.BoxGeometry(1.18, 1.66, 0.32));
  shieldHb.position.set(0, 0, -0.14);
  shieldGroup.add(shieldHb);
  hitboxes.push(bodyHb, headHb, wpHb, shieldHb);

  let poseMode: BrutePoseMode = 'march';
  let boosterFlame = 0;

  return {
    root,
    hitboxes,
    shieldGroup,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [heavyIronMat, crimsonMat],
    setPoseMode(mode) {
      poseMode = mode;
    },
    setBoosterFlame(intensity) {
      boosterFlame = intensity;
    },
    getMuzzleWorldPos(out) {
      return muzzleAnchor.getWorldPosition(out);
    },
    getWeakpointWorldPos(out) {
      return weakpointAnchor.getWorldPosition(out);
    },
    updateAnimation(input: EnemyAnimationInput) {
      const { elapsed, behavior, speedRatio, attackProgress, flinchTimer, staggerTimer, deadProgress, shieldActive } =
        input;

      shieldGroup.visible = shieldActive && behavior !== 'dead';

      for (const f of flames) {
        f.visible = boosterFlame > 0.1 && behavior !== 'dead';
        if (f.visible) {
          const pulse = 0.8 + Math.sin(elapsed * 32) * 0.25;
          f.scale.set(1, boosterFlame * pulse, 1);
        }
      }

      if (behavior === 'dead') {
        const d = Math.min(1, deadProgress);
        pelvis.position.y = 1.05 - d * 0.84;
        pelvis.rotation.x = d * 1.48;
        shadow.scale.setScalar(Math.max(0.25, 1 - d * 0.35));
        return;
      }

      pelvis.rotation.set(0, 0, 0);
      torso.rotation.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);

      const spd = Math.min(1.8, speedRatio);
      const stride = elapsed * (4.6 + spd * 3.4);
      const swing = Math.sin(stride) * 0.48 * Math.min(1.2, spd);
      pelvis.position.y = 1.05 + Math.abs(Math.cos(stride)) * 0.06 * Math.min(1.2, spd);
      leftLeg.hip.rotation.x = swing;
      leftLeg.knee.rotation.x = Math.max(0, -Math.cos(stride) * 0.55 * Math.min(1.2, spd));
      rightLeg.hip.rotation.x = -swing;
      rightLeg.knee.rotation.x = Math.max(0, Math.cos(stride) * 0.55 * Math.min(1.2, spd));

      // Default Siege Guard stance
      leftShoulder.rotation.set(0.32, 0.45, 0.08);
      rightShoulder.rotation.set(0.45, -0.08, -0.08);
      barrelCluster.rotation.z = elapsed * (poseMode === 'flak' ? 18 : 2.5);

      if (staggerTimer > 0) {
        torso.rotation.x = 0.46;
        torso.rotation.z = Math.sin(elapsed * 16) * 0.1;
        leftShoulder.rotation.set(-0.35, -0.45, 0.55);
        rightShoulder.rotation.set(-0.2, 0, -0.45);
      } else if (poseMode === 'rush_windup') {
        const p = Math.min(1, attackProgress);
        pelvis.position.y = 1.05 - p * 0.14;
        torso.rotation.x = 0.32 * p;
        leftShoulder.rotation.set(0.55, 0.65, -0.1);
        headGroup.rotation.x = 0.25 * p;
      } else if (poseMode === 'rush_charge') {
        torso.rotation.x = 0.44;
        leftShoulder.rotation.set(0.65, 0.72, -0.14);
        rightShoulder.rotation.set(-0.35, 0, -0.15);
      } else if (poseMode === 'slam') {
        const p = Math.min(1, attackProgress);
        if (behavior === 'windup') {
          torso.rotation.x = -0.28 * p;
          leftShoulder.rotation.set(1.65 * p, 0.3, 0.12);
        } else {
          torso.rotation.x = 0.42;
          leftShoulder.rotation.set(0.15 - p * 0.3, 0.4, 0.05);
        }
      } else if (poseMode === 'bash') {
        const p = Math.min(1, attackProgress);
        torso.rotation.y = behavior === 'windup' ? -0.45 * p : 0.55;
        leftShoulder.rotation.set(0.75, behavior === 'windup' ? 0.1 : 0.85, 0);
      } else if (poseMode === 'flak') {
        torso.rotation.y = -0.22;
        rightShoulder.rotation.set(1.18, 0.12, -0.05);
      }

      if (flinchTimer > 0) {
        torso.rotation.x -= flinchTimer * 0.7;
        torso.rotation.z += input.flinchDirX * flinchTimer * 0.5;
      }

      weakpointMat.emissiveIntensity = input.weakpointBroken
        ? 0.2
        : 2.1 + boosterFlame * 1.6 + Math.sin(elapsed * 8.0) * 0.5;
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}
