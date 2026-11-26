import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../../core/sculptUtils';
import { createEnemyHitboxMesh, type Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface StriderCableChain {
  segments: THREE.Group[];
  baseYaw: number;
  basePitch: number;
}

export interface StriderTorsoParts {
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  chestGroup: THREE.Group;
  headGroup: THREE.Group;
  eyeGlintOrigin: THREE.Object3D;
  tassetPivots: THREE.Group[];
  cableChains: StriderCableChain[];
  hitboxes: THREE.Mesh[];
  disposables: Array<{ dispose: () => void }>;
}

/**
 * AAA Sculpted Cyber-Samurai Upper Chassis & 360°-Seamless Kabuto Oni Helmet for KAGE-08 "ONI-BLADE".
 *
 * Uses `createLoftedAnatomy` for muscular organic V-taper waist/ribcage + `createCurvedPanelGeometry`
 * for contoured Samurai Do breastplate & layered lamellar collar/neck-guards (ZERO boxy slabs!),
 * 5 hinged overlapping kusazuri waist tassets, angular Menpo Oni jaw mask, V-slit tri-optics,
 * and 4 long dynamic 4-segment fiber-optic head cables with glowing crimson tip emitters.
 */
export function buildStriderTorsoAndHead(
  enemyId: string,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): StriderTorsoParts {
  const hitboxes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const tassetPivots: THREE.Group[] = [];
  const cableChains: StriderCableChain[] = [];

  const crimsonLacquerMat = new THREE.MeshStandardMaterial({
    color: 0x761522,
    roughness: 0.58,
    metalness: 0.3,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.012,
  });
  const opticGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xff1133,
    emissiveIntensity: 3.8,
    roughness: 0.14,
    metalness: 0.1,
  });
  disposables.push(crimsonLacquerMat, opticGlowMat);

  // ---------------------------------------------------------------------------
  // 1. SCULPTED ANATOMICAL PELVIS + OBI WAR-BELT + 5 HINGED KUSAZURI TASSETS
  // ---------------------------------------------------------------------------
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = 0.94;

  const pelvisGeo = createLoftedAnatomy(
    [
      { y: -0.09, rx: 0.125, rz: 0.095, squareness: 2.2 },
      { y: -0.02, rx: 0.162, rz: 0.118, squareness: 2.35 },
      { y: 0.055, rx: 0.155, rz: 0.112, squareness: 2.3 },
      { y: 0.105, rx: 0.14, rz: 0.102, squareness: 2.2 },
    ],
    18
  );
  disposables.push(pelvisGeo);
  const pelvisCore = new THREE.Mesh(pelvisGeo, mats.undersuit);
  pelvisCore.castShadow = true;
  pelvisGroup.add(pelvisCore);

  // Contoured armored Obi war-belt wrapping organically around waist
  const obiGeo = createLoftedAnatomy(
    [
      { y: 0.02, rx: 0.172, rz: 0.128, squareness: 2.5 },
      { y: 0.06, rx: 0.178, rz: 0.132, squareness: 2.55 },
      { y: 0.1, rx: 0.17, rz: 0.125, squareness: 2.45 },
    ],
    18
  );
  disposables.push(obiGeo);
  const obiBelt = new THREE.Mesh(obiGeo, mats.armorSlate);
  pelvisGroup.add(obiBelt);

  const beltBuckle = new THREE.Mesh(createBeveledBox(0.108, 0.078, 0.038, 0.01), crimsonLacquerMat);
  beltBuckle.position.set(0, 0.062, -0.132);
  pelvisGroup.add(beltBuckle);

  const buckleGem = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.02, 0.016), opticGlowMat);
  buckleGem.position.set(0, 0.062, -0.152);
  pelvisGroup.add(buckleGem);

  // Tapered Samurai Kusazuri tasset armor flaps (ExtrudeGeometry lamellar profile)
  const tassetShape = new THREE.Shape();
  tassetShape.moveTo(-0.072, 0);
  tassetShape.lineTo(0.072, 0);
  tassetShape.lineTo(0.092, -0.24);
  tassetShape.lineTo(0.052, -0.295);
  tassetShape.lineTo(-0.052, -0.295);
  tassetShape.lineTo(-0.092, -0.24);
  tassetShape.closePath();

  const tassetGeo = new THREE.ExtrudeGeometry(tassetShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  tassetGeo.translate(0, 0, -0.009);
  disposables.push(tassetGeo);

  const tassetSpecs: Array<{
    x: number;
    z: number;
    rotY: number;
    tiltX: number;
    scaleX: number;
  }> = [
    { x: -0.088, z: -0.125, rotY: 0.24, tiltX: -0.16, scaleX: 0.88 },
    { x: 0.088, z: -0.125, rotY: -0.24, tiltX: -0.16, scaleX: 0.88 },
    { x: -0.175, z: 0.0, rotY: Math.PI / 2, tiltX: -0.2, scaleX: 0.96 },
    { x: 0.175, z: 0.0, rotY: -Math.PI / 2, tiltX: -0.2, scaleX: 0.96 },
    { x: 0.0, z: 0.132, rotY: Math.PI, tiltX: -0.18, scaleX: 1.24 },
  ];

  for (const spec of tassetSpecs) {
    const pivot = new THREE.Group();
    pivot.position.set(spec.x, 0.025, spec.z);
    pivot.rotation.y = spec.rotY;
    pivot.rotation.x = spec.tiltX;
    pivot.userData = { baseTiltX: spec.tiltX };

    const plate = new THREE.Mesh(tassetGeo, flashArmorMat);
    plate.scale.set(spec.scaleX, 1, 1);
    plate.castShadow = true;
    pivot.add(plate);

    const trim = new THREE.Mesh(
      createBeveledBox(0.155 * spec.scaleX, 0.04, 0.028, 0.005),
      crimsonLacquerMat
    );
    trim.position.set(0, -0.16, -0.004);
    pivot.add(trim);

    pelvisGroup.add(pivot);
    tassetPivots.push(pivot);
  }

  // ---------------------------------------------------------------------------
  // 2. ATHLETIC LOFTED V-TAPER TORSO + CONTOURED CURVED SAMURAI DO CUIRASS
  // ---------------------------------------------------------------------------
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.095;
  pelvisGroup.add(torsoGroup);

  // Muscular anatomical carbon-weave torso undersuit (lofts smoothly from narrow waist to broad shoulders!)
  const torsoUndersuitGeo = createLoftedAnatomy(
    [
      { y: -0.02, rx: 0.132, rz: 0.096, squareness: 2.2 },
      { y: 0.08, rx: 0.142, rz: 0.104, squareness: 2.3, frontScale: 1.06 },
      { y: 0.19, rx: 0.168, rz: 0.12, squareness: 2.35, frontScale: 1.1 },
      { y: 0.31, rx: 0.215, rz: 0.136, squareness: 2.4, frontScale: 1.14, pinchFront: 0.012 },
      { y: 0.44, rx: 0.228, rz: 0.132, squareness: 2.35, frontScale: 1.1 },
      { y: 0.53, rx: 0.155, rz: 0.105, squareness: 2.1 },
    ],
    22
  );
  disposables.push(torsoUndersuitGeo);
  const torsoUndersuit = new THREE.Mesh(torsoUndersuitGeo, mats.undersuit);
  torsoUndersuit.castShadow = true;
  torsoGroup.add(torsoUndersuit);

  // Layered curved abdominal lamellar plates (3 contoured curved bands hugging waist!)
  for (let i = 0; i < 3; i++) {
    const y0 = 0.02 + i * 0.068;
    const rx = 0.148 + i * 0.014;
    const rz = 0.112 + i * 0.009;
    const abGeo = createCurvedPanelGeometry(
      [
        { y: y0, rx, rz, thickness: 0.014 },
        { y: y0 + 0.056, rx: rx + 0.008, rz: rz + 0.005, thickness: 0.014 },
      ],
      -Math.PI * 0.82,
      -Math.PI * 0.18,
      14
    );
    disposables.push(abGeo);
    const abBand = new THREE.Mesh(abGeo, i === 1 ? crimsonLacquerMat : mats.armorSlate);
    torsoGroup.add(abBand);
  }

  const chestGroup = new THREE.Group();
  chestGroup.position.y = 0.24;
  torsoGroup.add(chestGroup);

  // Contoured curved Samurai Do front breastplate wrapping seamlessly around pecs & ribs!
  const frontCuirassGeo = createCurvedPanelGeometry(
    [
      { y: -0.03, rx: 0.182, rz: 0.132, thickness: 0.022 },
      { y: 0.08, rx: 0.228, rz: 0.156, thickness: 0.026 },
      { y: 0.2, rx: 0.236, rz: 0.152, thickness: 0.024 },
      { y: 0.275, rx: 0.185, rz: 0.125, thickness: 0.02 },
    ],
    -Math.PI * 0.9,
    -Math.PI * 0.1,
    18
  );
  disposables.push(frontCuirassGeo);
  const frontCuirass = new THREE.Mesh(frontCuirassGeo, flashArmorMat);
  frontCuirass.castShadow = true;
  chestGroup.add(frontCuirass);

  // Contoured rear dorsal carapace wrapping upper back cleanly into spine booster mount
  const backCarapaceGeo = createCurvedPanelGeometry(
    [
      { y: -0.02, rx: 0.18, rz: 0.128, thickness: 0.02 },
      { y: 0.12, rx: 0.226, rz: 0.145, thickness: 0.022 },
      { y: 0.26, rx: 0.195, rz: 0.128, thickness: 0.02 },
    ],
    Math.PI * 0.12,
    Math.PI * 0.88,
    16
  );
  disposables.push(backCarapaceGeo);
  const backCarapace = new THREE.Mesh(backCarapaceGeo, flashArmorMat);
  backCarapace.castShadow = true;
  chestGroup.add(backCarapace);

  // Sculpted angled pectoral crest plates + crimson lacquer accents + glowing thermal micro-slits
  for (const side of [-1, 1]) {
    const pecGeo = createCurvedPanelGeometry(
      [
        { y: 0.06, rx: 0.232, rz: 0.162, thickness: 0.016 },
        { y: 0.15, rx: 0.244, rz: 0.168, thickness: 0.018 },
        { y: 0.23, rx: 0.215, rz: 0.148, thickness: 0.015 },
      ],
      side < 0 ? -Math.PI * 0.84 : -Math.PI * 0.44,
      side < 0 ? -Math.PI * 0.56 : -Math.PI * 0.16,
      10
    );
    disposables.push(pecGeo);
    const pec = new THREE.Mesh(pecGeo, mats.armorSlate);
    chestGroup.add(pec);

    const accent = new THREE.Mesh(createBeveledBox(0.12, 0.022, 0.018, 0.004), crimsonLacquerMat);
    accent.position.set(side * 0.105, 0.115, -0.155);
    accent.rotation.y = side * -0.34;
    accent.rotation.z = side * 0.22;
    chestGroup.add(accent);

    const ventSlit = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.014, 0.012), opticGlowMat);
    ventSlit.position.set(side * 0.082, 0.195, -0.158);
    ventSlit.rotation.y = side * -0.28;
    chestGroup.add(ventSlit);
  }

  // Sternum cyber-spine crest
  const sternum = new THREE.Mesh(createBeveledBox(0.062, 0.14, 0.036, 0.008), mats.titaniumJoint);
  sternum.position.set(0, 0.14, -0.155);
  chestGroup.add(sternum);

  // High armored samurai throat gorget (Nodowa) curving cleanly around collar
  const gorgetGeo = createCurvedPanelGeometry(
    [
      { y: 0.255, rx: 0.155, rz: 0.135, thickness: 0.018 },
      { y: 0.34, rx: 0.138, rz: 0.125, thickness: 0.016 },
    ],
    -Math.PI * 0.85,
    Math.PI * 0.85,
    18
  );
  disposables.push(gorgetGeo);
  const gorget = new THREE.Mesh(gorgetGeo, mats.armorSlate);
  chestGroup.add(gorget);

  // Body raycast hitbox
  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    new THREE.BoxGeometry(0.58, 0.86, 0.4)
  );
  bodyHitbox.position.set(0, 0.12, 0);
  chestGroup.add(bodyHitbox);
  hitboxes.push(bodyHitbox);

  // ---------------------------------------------------------------------------
  // 3. 360°-SEAMLESS SCULPTED CYBER-KABUTO ONI HELMET + DUAL HORNS + 4 LONG CABLES
  // ---------------------------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.335, -0.01);
  chestGroup.add(headGroup);

  // Armored cyber-neck column
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.076, 0.13, 12), mats.undersuit);
  neck.position.y = 0.04;
  headGroup.add(neck);

  // Solid sealed inner armored cranium core (eliminates ANY rear gap between dome & shikoro!)
  const innerCranium = new THREE.Mesh(new THREE.SphereGeometry(0.118, 16, 12), mats.undersuit);
  innerCranium.scale.set(0.95, 1.05, 1.14);
  innerCranium.position.set(0, 0.145, 0.008);
  headGroup.add(innerCranium);

  // Sculpted Kabuto helmet dome (LatheGeometry extending cleanly down to cheek/occiput!)
  const domePts = [
    new THREE.Vector2(0.0, 0.268),
    new THREE.Vector2(0.058, 0.262),
    new THREE.Vector2(0.112, 0.23),
    new THREE.Vector2(0.134, 0.174),
    new THREE.Vector2(0.132, 0.105),
    new THREE.Vector2(0.114, 0.068),
  ];
  const domeGeo = new THREE.LatheGeometry(domePts, 16);
  disposables.push(domeGeo);
  const kabutoDome = new THREE.Mesh(domeGeo, flashArmorMat);
  kabutoDome.scale.set(0.97, 1.0, 1.16);
  kabutoDome.position.set(0, 0.01, 0.01);
  kabutoDome.castShadow = true;
  headGroup.add(kabutoDome);

  // Swept Kabuto crimson crown crest ridge running front-to-back seamlessly down rear occiput
  const crestRidge = new THREE.Mesh(createBeveledBox(0.034, 0.044, 0.27, 0.009), crimsonLacquerMat);
  crestRidge.position.set(0, 0.262, 0.02);
  headGroup.add(crestRidge);

  // 3-Tier Layered Sweeping Kabuto Shikoro Neck-Guard wrapping cleanly around the rear (+Z)!
  // Note: CylinderGeometry theta=0 is +Z, so thetaStart = -0.58π, thetaLength = 1.16π wraps the entire back & sides!
  for (let tier = 0; tier < 3; tier++) {
    const rTop = 0.126 + tier * 0.016;
    const rBot = 0.148 + tier * 0.022;
    const shikoroGeo = new THREE.CylinderGeometry(
      rTop,
      rBot,
      0.056,
      14,
      1,
      false,
      -Math.PI * 0.56,
      Math.PI * 1.12
    );
    disposables.push(shikoroGeo);
    const shikoro = new THREE.Mesh(
      shikoroGeo,
      tier === 1 ? crimsonLacquerMat : mats.armorSlate
    );
    shikoro.scale.set(0.98, 1, 1.14);
    shikoro.position.set(0, 0.12 - tier * 0.044, 0.014);
    headGroup.add(shikoro);
  }

  // Twin Swept Blade-Like Samurai Maedate Horns (Oni V-Crest!)
  const hornShape = new THREE.Shape();
  hornShape.moveTo(0, 0);
  hornShape.lineTo(0.036, 0.014);
  hornShape.lineTo(0.155, 0.152);
  hornShape.lineTo(0.192, 0.196);
  hornShape.lineTo(0.122, 0.138);
  hornShape.lineTo(0.008, 0.042);
  hornShape.closePath();

  const hornGeo = new THREE.ExtrudeGeometry(hornShape, {
    depth: 0.013,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
  });
  hornGeo.translate(0, 0, -0.0065);
  disposables.push(hornGeo);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeo, mats.titaniumJoint);
    horn.position.set(side * 0.016, 0.212, -0.128);
    horn.scale.set(side, 1, 1);
    horn.rotation.x = -0.22;
    horn.rotation.y = side * -0.18;
    headGroup.add(horn);
  }

  // Central forehead crimson Oni crest diamond
  const crestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), opticGlowMat);
  crestGem.scale.set(0.85, 1.38, 0.55);
  crestGem.position.set(0, 0.215, -0.136);
  headGroup.add(crestGem);

  // Sculpted Angular Oni Menpo Jaw Mask (matte dark steel cheek guards + crimson respirator chin)
  const jawMask = new THREE.Mesh(createBeveledBox(0.158, 0.09, 0.128, 0.022), mats.armorSlate);
  jawMask.position.set(0, 0.092, -0.068);
  jawMask.rotation.x = 0.12;
  headGroup.add(jawMask);

  const chinGuard = new THREE.Mesh(createBeveledBox(0.084, 0.054, 0.058, 0.012), crimsonLacquerMat);
  chinGuard.position.set(0, 0.064, -0.122);
  chinGuard.rotation.x = 0.24;
  headGroup.add(chinGuard);

  // Blazing Crimson V-Slit Tri-Optic Cyber-Visor
  const visorBacking = new THREE.Mesh(createBeveledBox(0.178, 0.058, 0.078, 0.012), mats.undersuit);
  visorBacking.position.set(0, 0.158, -0.104);
  headGroup.add(visorBacking);

  for (const side of [-1, 1]) {
    const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.019, 0.02), opticGlowMat);
    eyeSlit.position.set(side * 0.045, 0.16, -0.138);
    eyeSlit.rotation.z = side * 0.22;
    eyeSlit.rotation.y = side * -0.24;
    headGroup.add(eyeSlit);
  }
  const centerOptic = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.022), opticGlowMat);
  centerOptic.position.set(0, 0.15, -0.144);
  headGroup.add(centerOptic);

  // Peril Eye-Glint spawn marker cleanly in front of his blazing Oni visor!
  const eyeGlintOrigin = new THREE.Object3D();
  eyeGlintOrigin.position.set(0, 0.162, -0.185);
  headGroup.add(eyeGlintOrigin);

  // 4 Long Dynamic Multi-Segment Fiber-Optic Head Cables streaming past his shoulder blades!
  const cableSpecs = [
    { x: -0.072, y: 0.105, baseYaw: -0.34, basePitch: 0.42, segLen: 0.145 },
    { x: -0.026, y: 0.118, baseYaw: -0.12, basePitch: 0.34, segLen: 0.16 },
    { x: 0.026, y: 0.118, baseYaw: 0.12, basePitch: 0.34, segLen: 0.16 },
    { x: 0.072, y: 0.105, baseYaw: 0.34, basePitch: 0.42, segLen: 0.145 },
  ];

  for (const cs of cableSpecs) {
    const segments: THREE.Group[] = [];
    let parent: THREE.Object3D = headGroup;
    for (let s = 0; s < 4; s++) {
      const segPivot = new THREE.Group();
      if (s === 0) {
        segPivot.position.set(cs.x, cs.y, 0.148);
        segPivot.rotation.set(cs.basePitch, cs.baseYaw, 0);
      } else {
        segPivot.position.set(0, -cs.segLen * 0.9, 0.025);
      }
      const radius = 0.017 - s * 0.0026;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 0.86, cs.segLen, 8),
        s === 3 ? crimsonLacquerMat : mats.undersuit
      );
      tube.position.y = -cs.segLen * 0.48;
      segPivot.add(tube);

      if (s < 3) {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(radius * 1.28, radius * 1.28, 0.018, 8),
          mats.titaniumJoint
        );
        ring.position.y = -cs.segLen * 0.86;
        segPivot.add(ring);
      } else {
        // Glowing crimson optical fiber node at each cable tip!
        const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 7, 6), opticGlowMat);
        tipGlow.position.y = -cs.segLen * 0.94;
        segPivot.add(tipGlow);
      }
      parent.add(segPivot);
      segments.push(segPivot);
      parent = segPivot;
    }
    cableChains.push({
      segments,
      baseYaw: cs.baseYaw,
      basePitch: cs.basePitch,
    });
  }

  // Head raycast hitbox
  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    new THREE.SphereGeometry(0.19, 10, 8)
  );
  headHitbox.position.set(0, 0.15, -0.01);
  headGroup.add(headHitbox);
  hitboxes.push(headHitbox);

  return {
    pelvisGroup,
    torsoGroup,
    chestGroup,
    headGroup,
    eyeGlintOrigin,
    tassetPivots,
    cableChains,
    hitboxes,
    disposables,
  };
}
