import * as THREE from 'three';
import { createBeveledBox, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { WyvernTextureSuite } from './textures';

export type WyvernPoseMode = 'hover' | 'barrage' | 'spit' | 'dive';

export interface AcidWyvernRigHandle extends EnemyRigHandle {
  setPoseMode: (mode: WyvernPoseMode) => void;
  setHoverGroundDelta: (heightAboveFloor: number) => void;
  getTailStingerWorldPos: (index: 0 | 1, out: THREE.Vector3) => THREE.Vector3;
}

function createScallopedWingMembrane(
  side: -1 | 1,
  width: number,
  chordRoot: number,
  chordTip: number
): THREE.BufferGeometry {
  const s = side;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(s * width, -0.06);
  // Scalloped bat-wyvern trailing edge with 2 crisp membrane arches!
  shape.lineTo(s * width, -chordTip);
  shape.quadraticCurveTo(s * width * 0.68, -chordTip * 0.58, s * width * 0.5, -chordRoot * 0.92);
  shape.quadraticCurveTo(s * width * 0.26, -chordRoot * 0.56, 0, -chordRoot);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 10);
  // Rotate so shape X stays along ±X wing span, and shape -Y maps to +Z trailing edge!
  geo.rotateX(Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

export function buildAcidWyvernConstructRig(
  enemyId: string,
  mats: Floor05EnemyMaterials,
  textures: WyvernTextureSuite
): AcidWyvernRigHandle {
  const root = new THREE.Group();
  root.name = `AcidWyvern_${enemyId}`;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const hitboxes: THREE.Mesh[] = [];

  // Bright tint so scaleMap diamond wyvern scales & lime veining read vividly!
  const scaleArmorMat = mats.createFlashArmorMaterial(0xdcf2ee, 0.36, 0.38, 'chitin');
  scaleArmorMat.map = textures.scaleMap;
  const darkFrameMat = mats.createFlashArmorMaterial(0x5a6e7c, 0.58, 0.4, 'gladiator');
  const weakpointMat = mats.createWeakpointMaterial(0x84cc16, 0x22c55e);
  const wingMembraneMat = new THREE.MeshStandardMaterial({
    map: textures.wingMembraneMap,
    color: 0xbef264,
    emissive: 0x16a34a,
    emissiveIntensity: 1.35,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.24,
    metalness: 0.12,
  });
  ownedMats.push(scaleArmorMat, darkFrameMat, weakpointMat, wingMembraneMat);

  // Ground-projected contact shadow (adjusted dynamically by heightAboveFloor!)
  const shadow = createEnemyContactShadow(1.55, mats.shadowDisc);
  root.add(shadow);

  const body = new THREE.Group();
  body.position.set(0, 1.3, 0);
  root.add(body);

  // Sculpted Aerodynamic Wyvern Fuselage / Torso (oriented facing -Z!)
  const fuselage = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.78, rx: 0.18, rz: 0.16, squareness: 2.3 },
        { y: -0.22, rx: 0.36, rz: 0.32, squareness: 2.55 },
        { y: 0.34, rx: 0.46, rz: 0.42, squareness: 2.7, pinchFront: 0.06 },
        { y: 0.78, rx: 0.26, rz: 0.24, squareness: 2.35 },
      ],
      18
    ),
    scaleArmorMat
  );
  fuselage.rotation.x = -Math.PI * 0.46;
  fuselage.castShadow = true;
  body.add(fuselage);

  // Overlapping curved dorsal carapace collar & armored rib flanks
  const dorsalShellGeo = createCurvedPanelGeometry(
    [
      { y: -0.45, rx: 0.36, rz: 0.3, thickness: 0.036 },
      { y: 0.05, rx: 0.48, rz: 0.42, thickness: 0.044 },
      { y: 0.55, rx: 0.38, rz: 0.32, thickness: 0.036 },
    ],
    Math.PI * 0.1,
    Math.PI * 0.9,
    14
  );
  ownedGeos.push(dorsalShellGeo);
  const dorsalShell = new THREE.Mesh(dorsalShellGeo, darkFrameMat);
  dorsalShell.rotation.x = -Math.PI * 0.46;
  dorsalShell.castShadow = true;
  body.add(dorsalShell);

  for (let i = 0; i < 4; i++) {
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.28, 6), mats.arenaBronze);
    ridge.position.set(0, 0.42 - i * 0.04, -0.35 + i * 0.26);
    ridge.rotation.x = 0.45;
    body.add(ridge);
  }

  // Glowing EMERALD CHEST VENOM-CORE framed inside sculpted bronze sternum ribs (Weakpoint!)
  const weakpointAnchor = new THREE.Group();
  weakpointAnchor.position.set(0, -0.06, -0.46);
  body.add(weakpointAnchor);

  const coreCage = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.048, 8, 18), mats.arenaBronze);
  weakpointAnchor.add(coreCage);

  for (const sgn of [-1, 1] as const) {
    const ribClaw = new THREE.Mesh(createBeveledBox(0.08, 0.36, 0.09, 0.014), mats.arenaBronze);
    ribClaw.position.set(sgn * 0.28, 0.02, 0.04);
    ribClaw.rotation.z = sgn * 0.28;
    weakpointAnchor.add(ribClaw);
  }

  const venomCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.23, 1), weakpointMat);
  weakpointAnchor.add(venomCore);

  // S-Curved Armored Draconic Neck with Segmented Vertebrae + Sculpted Predator Dragon Skull!
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.18, -0.62);
  body.add(neckPivot);

  const neckSeg = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.04, rx: 0.21, rz: 0.2, squareness: 2.4 },
        { y: 0.24, rx: 0.175, rz: 0.165, squareness: 2.5 },
        { y: 0.52, rx: 0.15, rz: 0.145, squareness: 2.4 },
      ],
      14
    ),
    darkFrameMat
  );
  neckSeg.rotation.x = -Math.PI * 0.36;
  neckSeg.position.set(0, 0.04, -0.02);
  neckSeg.castShadow = true;
  neckPivot.add(neckSeg);

  // 3 armored bronze neck vertebra plates
  for (let v = 0; v < 3; v++) {
    const plate = new THREE.Mesh(createBeveledBox(0.24 - v * 0.02, 0.09, 0.14, 0.016), scaleArmorMat);
    plate.position.set(0, 0.15 + v * 0.08, -0.14 - v * 0.12);
    plate.rotation.x = 0.55;
    neckPivot.add(plate);
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.34, -0.44);
  neckPivot.add(headGroup);

  // Tapered Sculpted Draconic Predator Skull (ZERO plain rectangular box!)
  const snoutGeo = createLoftedAnatomy(
    [
      { y: -0.08, rx: 0.18, rz: 0.14, squareness: 2.5 },
      { y: 0.12, rx: 0.195, rz: 0.155, squareness: 2.75, pinchFront: 0.035 },
      { y: 0.36, rx: 0.135, rz: 0.105, squareness: 2.6, pinchFront: 0.032 },
      { y: 0.58, rx: 0.075, rz: 0.065, squareness: 2.3 },
    ],
    14
  );
  ownedGeos.push(snoutGeo);
  const upperSkull = new THREE.Mesh(snoutGeo, scaleArmorMat);
  upperSkull.rotation.x = -Math.PI * 0.5; // Tapered dragon snout forward along -Z!
  upperSkull.position.set(0, 0.06, 0.02);
  upperSkull.castShadow = true;
  headGroup.add(upperSkull);

  // Armored bronze brow crest & nasal horn
  const nasalHorn = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.18, 6), mats.arenaBronze);
  nasalHorn.position.set(0, 0.14, -0.46);
  nasalHorn.rotation.x = -0.35;
  headGroup.add(nasalHorn);

  const lowerJaw = new THREE.Group();
  lowerJaw.position.set(0, -0.04, -0.04);
  headGroup.add(lowerJaw);

  const jawGeo = createLoftedAnatomy(
    [
      { y: 0, rx: 0.14, rz: 0.075, squareness: 2.4 },
      { y: 0.26, rx: 0.11, rz: 0.065, squareness: 2.5 },
      { y: 0.46, rx: 0.058, rz: 0.045, squareness: 2.2 },
    ],
    10
  );
  ownedGeos.push(jawGeo);
  const jawMesh = new THREE.Mesh(jawGeo, darkFrameMat);
  jawMesh.rotation.x = -Math.PI * 0.5;
  lowerJaw.add(jawMesh);

  // Steel predator fangs along upper/lower jaw
  for (const sx of [-0.075, 0.075]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.11, 5), mats.crucibleSteel);
    fang.rotation.x = Math.PI;
    fang.position.set(sx, -0.02, -0.44);
    headGroup.add(fang);
  }

  // Sweeping Draconic Horns & Glowing Emerald Predator Eyes
  for (const sgn of [-1, 1] as const) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.62, 8), mats.arenaBronze);
    horn.position.set(sgn * 0.17, 0.18, 0.16);
    horn.rotation.set(1.24, 0, -sgn * 0.26);
    horn.castShadow = true;
    headGroup.add(horn);

    const brow = new THREE.Mesh(createBeveledBox(0.07, 0.042, 0.22, 0.008), mats.arenaBronze);
    brow.position.set(sgn * 0.13, 0.125, -0.26);
    brow.rotation.y = sgn * 0.16;
    headGroup.add(brow);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), mats.acidEmeraldGlow);
    eye.position.set(sgn * 0.135, 0.075, -0.32);
    headGroup.add(eye);
  }

  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.position.set(0, -0.02, -0.56);
  headGroup.add(mouthAnchor);

  // 4.9m ARTICULATED SCALLOPED BAT/WYVERN BIO-MEMBRANE WINGS (ZERO flat rectangles!)
  const buildWing = (side: -1 | 1) => {
    const rootPivot = new THREE.Group();
    rootPivot.position.set(side * 0.38, 0.24, -0.2);
    body.add(rootPivot);

    // Sculpted inner leading-edge wing arm
    const innerSpar = new THREE.Mesh(createBeveledBox(1.18, 0.11, 0.15, 0.02), darkFrameMat);
    innerSpar.position.set(side * 0.56, 0.04, 0);
    innerSpar.castShadow = true;
    rootPivot.add(innerSpar);

    // Scalloped inner bio-energy wing membrane!
    const innerMemGeo = createScallopedWingMembrane(side, 1.15, 1.05, 0.94);
    ownedGeos.push(innerMemGeo);
    const innerMem = new THREE.Mesh(innerMemGeo, wingMembraneMat);
    innerMem.position.set(0, 0.02, 0.04);
    rootPivot.add(innerMem);

    // Wing-joint bronze spur claw
    const jointClaw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.3, 6), mats.crucibleSteel);
    jointClaw.position.set(side * 1.12, 0.06, -0.14);
    jointClaw.rotation.set(-Math.PI * 0.45, 0, -side * 0.25);
    rootPivot.add(jointClaw);

    // Outer wing elbow joint + radiating finger spars + scalloped pinion membrane
    const outerPivot = new THREE.Group();
    outerPivot.position.set(side * 1.12, 0.04, -0.02);
    rootPivot.add(outerPivot);

    const outerSpar = new THREE.Mesh(createBeveledBox(1.24, 0.085, 0.12, 0.016), mats.arenaBronze);
    outerSpar.position.set(side * 0.58, 0, 0.05);
    outerSpar.rotation.y = -side * 0.1;
    outerSpar.castShadow = true;
    outerPivot.add(outerSpar);

    const outerMemGeo = createScallopedWingMembrane(side, 1.28, 0.96, 0.48);
    ownedGeos.push(outerMemGeo);
    const outerMem = new THREE.Mesh(outerMemGeo, wingMembraneMat);
    outerMem.position.set(0, 0, 0.06);
    outerPivot.add(outerMem);

    // 3 radial articulated wing-finger bone ribs fanning across the outer membrane!
    const ribAngles = [0.24, 0.54, 0.86];
    const ribLens = [1.26, 1.08, 0.86];
    for (let f = 0; f < 3; f++) {
      const len = ribLens[f];
      const ang = ribAngles[f];
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, len, 6), mats.arenaBronze);
      rib.rotation.z = -side * Math.PI * 0.5;
      rib.rotation.y = -side * ang;
      rib.position.set(side * Math.cos(ang) * len * 0.5, 0.01, Math.sin(ang) * len * 0.5 + 0.04);
      outerPivot.add(rib);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.36, 5), mats.crucibleSteel);
      tip.rotation.z = -side * Math.PI * 0.5;
      tip.rotation.y = -side * ang;
      tip.position.set(side * Math.cos(ang) * (len + 0.12), 0.01, Math.sin(ang) * (len + 0.12) + 0.04);
      outerPivot.add(tip);
    }

    return { rootPivot, outerPivot };
  };

  const leftWing = buildWing(-1);
  const rightWing = buildWing(1);

  // Retracted Raptorial Talons hanging under belly
  const talons: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.26, -0.24, 0.06);
    body.add(leg);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), darkFrameMat);
    thigh.position.set(0, -0.18, 0.04);
    thigh.rotation.x = 0.35;
    leg.add(thigh);
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.24, 5), mats.crucibleSteel);
      claw.rotation.x = -Math.PI * 0.65;
      claw.position.set(c * 0.045, -0.44, -0.06);
      leg.add(claw);
    }
    talons.push(leg);
  }

  // TWIN BARBED ACID WHIP-TAILS (+Z, flanking left & right!)
  const buildAcidTail = (side: -1 | 1) => {
    const base = new THREE.Group();
    base.position.set(side * 0.24, -0.06, 0.66);
    body.add(base);

    const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.62, 4, 10), darkFrameMat);
    seg1.rotation.x = Math.PI * 0.5;
    seg1.position.z = 0.34;
    base.add(seg1);

    const ridge1 = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.16, 5), mats.arenaBronze);
    ridge1.position.set(0, 0.1, 0.34);
    ridge1.rotation.x = 0.5;
    base.add(ridge1);

    const mid = new THREE.Group();
    mid.position.set(0, 0, 0.68);
    base.add(mid);

    const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.62, 4, 10), scaleArmorMat);
    seg2.rotation.x = Math.PI * 0.5;
    seg2.position.z = 0.34;
    mid.add(seg2);

    const tip = new THREE.Group();
    tip.position.set(0, 0, 0.68);
    mid.add(tip);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), mats.acidEmeraldGlow);
    bulb.position.z = 0.14;
    tip.add(bulb);

    const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.44, 6), mats.acidEmeraldGlow);
    stinger.rotation.x = Math.PI * 0.5;
    stinger.position.z = 0.38;
    tip.add(stinger);

    const stingerTip = new THREE.Object3D();
    stingerTip.position.set(0, 0, 0.58);
    tip.add(stingerTip);

    return { base, mid, tip, stingerTip };
  };

  const leftTail = buildAcidTail(-1);
  const rightTail = buildAcidTail(1);

  // Hitboxes
  const bodyHb = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(1.55, 0.96, 1.8));
  body.add(bodyHb);

  const headHb = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.54, 0.44, 0.68));
  headHb.position.set(0, 0.04, -0.22);
  headGroup.add(headHb);

  const wpHb = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.SphereGeometry(0.38, 10, 10),
    'chest_venom_core'
  );
  weakpointAnchor.add(wpHb);
  hitboxes.push(bodyHb, headHb, wpHb);

  let poseMode: WyvernPoseMode = 'hover';
  let groundDelta = 3.0;

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [scaleArmorMat, darkFrameMat],
    setPoseMode(mode) {
      poseMode = mode;
    },
    setHoverGroundDelta(heightAboveFloor) {
      groundDelta = Math.max(0.1, heightAboveFloor);
    },
    getMuzzleWorldPos(out) {
      return mouthAnchor.getWorldPosition(out);
    },
    getTailStingerWorldPos(index, out) {
      return (index === 0 ? leftTail : rightTail).stingerTip.getWorldPosition(out);
    },
    getWeakpointWorldPos(out) {
      return weakpointAnchor.getWorldPosition(out);
    },
    updateAnimation(input: EnemyAnimationInput) {
      const { elapsed, behavior, attackProgress, flinchTimer, staggerTimer, deadProgress, phase } = input;

      shadow.position.y = -groundDelta + 0.025;
      shadow.scale.setScalar(Math.max(0.45, 1.15 - groundDelta * 0.1));

      if (behavior === 'dead') {
        const d = Math.min(1, deadProgress);
        body.position.y = 1.3 - d * (groundDelta + 0.7);
        body.rotation.x = d * 0.45;
        body.rotation.z = d * 1.1;
        leftWing.rootPivot.rotation.z = -0.5 * d;
        rightWing.rootPivot.rotation.z = 0.5 * d;
        shadow.scale.setScalar(Math.max(0.3, 1 - d * 0.35));
        return;
      }

      const flapRate = phase === 2 ? 7.2 : 5.4;
      const flap = Math.sin(elapsed * flapRate);
      const outerLag = Math.sin(elapsed * flapRate - 0.65);

      body.position.y = 1.3 + Math.sin(elapsed * flapRate - 0.5) * 0.16;
      body.rotation.set(0, 0, Math.sin(elapsed * 1.8) * 0.06);
      neckPivot.rotation.set(0, 0, 0);
      lowerJaw.rotation.x = 0.08 + Math.sin(elapsed * 4.5) * 0.04;

      leftWing.rootPivot.rotation.set(0.12, 0.14, flap * 0.58);
      leftWing.outerPivot.rotation.set(0, 0, outerLag * 0.52);
      rightWing.rootPivot.rotation.set(0.12, -0.14, -flap * 0.58);
      rightWing.outerPivot.rotation.set(0, 0, -outerLag * 0.52);

      leftTail.base.rotation.set(0.45 + Math.sin(elapsed * 4.0) * 0.16, -0.3 + Math.cos(elapsed * 3.2) * 0.18, 0);
      leftTail.mid.rotation.set(0.55, Math.sin(elapsed * 4.0 - 0.8) * 0.25, 0);
      rightTail.base.rotation.set(0.45 + Math.cos(elapsed * 4.0) * 0.16, 0.3 - Math.sin(elapsed * 3.2) * 0.18, 0);
      rightTail.mid.rotation.set(0.55, -Math.cos(elapsed * 4.0 - 0.8) * 0.25, 0);

      if (staggerTimer > 0) {
        body.position.y = 1.3 - Math.min(1.8, groundDelta * 0.55);
        body.rotation.x = -0.38;
        body.rotation.z = Math.sin(elapsed * 18) * 0.22;
        leftWing.rootPivot.rotation.z = 0.65;
        rightWing.rootPivot.rotation.z = -0.65;
      } else if (poseMode === 'barrage') {
        const whip = behavior === 'windup' ? attackProgress : 1 - attackProgress * 0.3;
        leftTail.base.rotation.set(1.35 * whip, -0.22, 0);
        leftTail.mid.rotation.set(1.15 * whip, 0, 0);
        rightTail.base.rotation.set(1.35 * whip, 0.22, 0);
        rightTail.mid.rotation.set(1.15 * whip, 0, 0);
      } else if (poseMode === 'spit') {
        const p = Math.min(1, attackProgress);
        neckPivot.rotation.x = behavior === 'windup' ? -0.45 * p : 0.3;
        lowerJaw.rotation.x = behavior === 'windup' ? 0.55 * p : 0.68;
      } else if (poseMode === 'dive') {
        body.rotation.x = 0.45;
        leftWing.rootPivot.rotation.set(0, 0.55, 0.22);
        rightWing.rootPivot.rotation.set(0, -0.55, -0.22);
        talons[0].rotation.x = -0.65;
        talons[1].rotation.x = -0.65;
      } else {
        talons[0].rotation.x = 0.15;
        talons[1].rotation.x = 0.15;
      }

      if (flinchTimer > 0) {
        body.rotation.x -= flinchTimer * 0.55;
        body.rotation.z += input.flinchDirX * flinchTimer * 0.45;
      }

      venomCore.rotation.y = elapsed * (phase === 2 ? 4.8 : 2.6);
      weakpointMat.emissiveIntensity = input.weakpointBroken
        ? 0.22
        : 2.3 + (phase === 2 ? 1.2 : 0) + Math.sin(elapsed * 9.0) * 0.55;
      wingMembraneMat.emissiveIntensity = phase === 2 ? 1.85 : 1.3;
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}
