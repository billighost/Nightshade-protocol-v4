import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface AegisTorsoParts {
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  visorGlintOrigin: THREE.Object3D;
  setBoosterPlume: (intensity: number, elapsed: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * AAA Heavy Exosuit Juggernaut Torso, Layered EOD Ballistic Breastplate, Dorsal Ram-Jet
 * Shield-Charge Booster Pack, and 360°-Seamless Heavy EOD Riot Helmet for AEGIS-RIOT.
 *
 * Distinct visual language from KAGE-08 (crimson samurai) & BREACHER-08 (olive quad-NOD):
 * - Matte navy-titanium ceramic armor + tungsten gunmetal exo-frame + industrial hazard yellow trim
 * - Incandescent ice-cyan recessed T-visor & twin dorsal ram-jet shield-charge booster plumes!
 */
export function buildAegisTorsoAndHead(
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): AegisTorsoParts {
  const disposables: Array<{ dispose: () => void }> = [];

  // Matte navy-titanium heavy ballistic ceramic
  const navyCeramicMat = new THREE.MeshStandardMaterial({
    color: 0x1d2938,
    roughness: 0.78,
    metalness: 0.28,
    bumpMap: mats.armorHeavy.bumpMap,
    bumpScale: 0.016,
  });
  // Industrial hazard yellow-amber riot enforcement accent
  const hazardYellowMat = new THREE.MeshStandardMaterial({
    color: 0xd4961a,
    roughness: 0.54,
    metalness: 0.25,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.01,
  });
  // Electric ice-cyan juggernaut T-visor & reactor strip
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x7ef6ff,
    emissive: 0x22d3ee,
    emissiveIntensity: 3.4,
    roughness: 0.12,
    metalness: 0.18,
  });
  disposables.push(navyCeramicMat, hazardYellowMat, visorMat);

  // ---------------------------------------------------------------------------
  // 1. HEAVY ARMORED JUGGERNAUT PELVIS, RIOT-GRENADE BELT & HIP TASSETS
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.98, 0);

  const pelvisGeo = createLoftedAnatomy(
    [
      { y: -0.1, rx: 0.16, rz: 0.126, squareness: 2.35 },
      { y: -0.01, rx: 0.21, rz: 0.156, squareness: 2.5 },
      { y: 0.07, rx: 0.205, rz: 0.15, squareness: 2.5 },
      { y: 0.12, rx: 0.186, rz: 0.138, squareness: 2.35 },
    ],
    18
  );
  disposables.push(pelvisGeo);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, mats.undersuit);
  pelvisMesh.castShadow = true;
  pelvis.add(pelvisMesh);

  // Heavy ballistic waist girdle
  const beltGeo = createLoftedAnatomy(
    [
      { y: 0.015, rx: 0.222, rz: 0.166, squareness: 2.6 },
      { y: 0.06, rx: 0.228, rz: 0.172, squareness: 2.65 },
      { y: 0.105, rx: 0.218, rz: 0.162, squareness: 2.55 },
    ],
    18
  );
  disposables.push(beltGeo);
  pelvis.add(new THREE.Mesh(beltGeo, navyCeramicMat));

  // Reinforced curved ballistic codpiece / groin blast apron
  const groinGeo = createCurvedPanelGeometry(
    [
      { y: -0.185, rx: 0.132, rz: 0.168, thickness: 0.024 },
      { y: -0.04, rx: 0.182, rz: 0.184, thickness: 0.026 },
    ],
    -Math.PI * 0.72,
    -Math.PI * 0.28,
    12
  );
  disposables.push(groinGeo);
  pelvis.add(new THREE.Mesh(groinGeo, flashArmorMat));

  const beltBuckle = new THREE.Mesh(createBeveledBox(0.115, 0.072, 0.042, 0.009), mats.titaniumJoint);
  beltBuckle.position.set(0, 0.062, -0.174);
  pelvis.add(beltBuckle);

  // Side armored hip tassets + riot flashbang canisters!
  for (const side of [-1, 1]) {
    const tasset = new THREE.Mesh(createBeveledBox(0.042, 0.175, 0.155, 0.012), navyCeramicMat);
    tasset.position.set(side * 0.232, -0.035, 0.008);
    tasset.rotation.z = side * -0.12;
    pelvis.add(tasset);

    const stripe = new THREE.Mesh(createBeveledBox(0.048, 0.026, 0.115, 0.004), hazardYellowMat);
    stripe.position.set(side * 0.235, -0.075, 0.008);
    pelvis.add(stripe);

    // 2 cylindrical riot flashbang canisters on front hip
    for (let g = 0; g < 2; g++) {
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.092, 8),
        mats.titaniumJoint
      );
      can.position.set(side * (0.14 + g * 0.055), 0.035, -0.162 + g * 0.022);
      pelvis.add(can);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. HULKING BARREL-CHESTED EOD JUGGERNAUT TORSO + HIGH BLAST COLLAR
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.set(0, 0.09, 0);
  pelvis.add(torso);

  const torsoCoreGeo = createLoftedAnatomy(
    [
      { y: -0.02, rx: 0.18, rz: 0.136, squareness: 2.35 },
      { y: 0.12, rx: 0.206, rz: 0.154, squareness: 2.45, frontScale: 1.08 },
      { y: 0.27, rx: 0.256, rz: 0.174, squareness: 2.55, frontScale: 1.12 },
      { y: 0.42, rx: 0.285, rz: 0.184, squareness: 2.6, frontScale: 1.14 },
      { y: 0.52, rx: 0.255, rz: 0.168, squareness: 2.45 },
      { y: 0.58, rx: 0.185, rz: 0.138, squareness: 2.25 },
    ],
    22
  );
  disposables.push(torsoCoreGeo);
  const torsoCore = new THREE.Mesh(torsoCoreGeo, mats.undersuit);
  torsoCore.castShadow = true;
  torso.add(torsoCore);

  // Heavy multi-layered curved EOD Ballistic Breastplate wrapping torso!
  const chestPlateGeo = createCurvedPanelGeometry(
    [
      { y: 0.08, rx: 0.222, rz: 0.172, thickness: 0.034 },
      { y: 0.26, rx: 0.274, rz: 0.198, thickness: 0.038 },
      { y: 0.42, rx: 0.288, rz: 0.204, thickness: 0.036 },
      { y: 0.51, rx: 0.232, rz: 0.176, thickness: 0.03 },
    ],
    -Math.PI * 0.88,
    -Math.PI * 0.12,
    20
  );
  disposables.push(chestPlateGeo);
  const chestPlate = new THREE.Mesh(chestPlateGeo, flashArmorMat);
  chestPlate.castShadow = true;
  torso.add(chestPlate);

  // Upper sternum heavy armored deflector bib + hazard yellow riot chevron + cyan power gauge
  const bibPlate = new THREE.Mesh(createBeveledBox(0.28, 0.16, 0.052, 0.014), navyCeramicMat);
  bibPlate.position.set(0, 0.365, -0.212);
  bibPlate.rotation.x = -0.14;
  torso.add(bibPlate);

  const hazardChestBar = new THREE.Mesh(createBeveledBox(0.22, 0.028, 0.018, 0.004), hazardYellowMat);
  hazardChestBar.position.set(0, 0.315, -0.236);
  torso.add(hazardChestBar);

  const chestReactor = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.026, 0.016), visorMat);
  chestReactor.position.set(0, 0.405, -0.236);
  torso.add(chestReactor);

  // Sculpted titanium chest harness ribs & abdominal armor louver plates for crisp silhouette readability
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(createBeveledBox(0.042, 0.36, 0.028, 0.006), mats.titaniumJoint);
    strap.position.set(side * 0.135, 0.3, -0.205);
    strap.rotation.z = side * 0.08;
    torso.add(strap);
  }
  const abPlate = new THREE.Mesh(createBeveledBox(0.24, 0.095, 0.036, 0.01), mats.armorSlate);
  abPlate.position.set(0, 0.17, -0.196);
  torso.add(abPlate);

  // Rear heavy ceramic backplate
  const backPlateGeo = createCurvedPanelGeometry(
    [
      { y: 0.1, rx: 0.225, rz: 0.17, thickness: 0.03 },
      { y: 0.3, rx: 0.272, rz: 0.192, thickness: 0.034 },
      { y: 0.49, rx: 0.238, rz: 0.172, thickness: 0.028 },
    ],
    Math.PI * 0.12,
    Math.PI * 0.88,
    18
  );
  disposables.push(backPlateGeo);
  torso.add(new THREE.Mesh(backPlateGeo, navyCeramicMat));

  // Iconic High Armored EOD Blast Collar framing the lower helmet & jaw!
  const blastCollarGeo = createCurvedPanelGeometry(
    [
      { y: 0.49, rx: 0.205, rz: 0.185, thickness: 0.03 },
      { y: 0.625, rx: 0.188, rz: 0.172, thickness: 0.026 },
    ],
    -Math.PI * 0.92,
    Math.PI * 0.92,
    20
  );
  disposables.push(blastCollarGeo);
  torso.add(new THREE.Mesh(blastCollarGeo, navyCeramicMat));

  // Heavy exo-frame hydraulic shoulder yoke struts over trapezius
  for (const side of [-1, 1]) {
    const yoke = new THREE.Mesh(createBeveledBox(0.088, 0.115, 0.29, 0.016), mats.titaniumJoint);
    yoke.position.set(side * 0.175, 0.535, 0.01);
    yoke.rotation.z = side * -0.14;
    torso.add(yoke);
  }

  // ---------------------------------------------------------------------------
  // 3. DORSAL EXO-HYDRAULICS POWER PLANT & DUAL RAM-JET SHIELD-CHARGE THRUSTERS
  // ---------------------------------------------------------------------------
  const packGroup = new THREE.Group();
  packGroup.position.set(0, 0.33, 0.215);
  torso.add(packGroup);

  const packChassis = new THREE.Mesh(createBeveledBox(0.35, 0.4, 0.155, 0.026), navyCeramicMat);
  packChassis.castShadow = true;
  packGroup.add(packChassis);

  const packSpine = new THREE.Mesh(createBeveledBox(0.14, 0.34, 0.175, 0.018), mats.armorSlate);
  packGroup.add(packSpine);

  const packCoreBar = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.22, 0.018), visorMat);
  packCoreBar.position.set(0, 0.01, 0.092);
  packGroup.add(packCoreBar);

  const packHazard = new THREE.Mesh(createBeveledBox(0.27, 0.04, 0.165, 0.008), hazardYellowMat);
  packHazard.position.set(0, 0.145, 0.005);
  packGroup.add(packHazard);

  // Twin armored top cooling exhaust stacks
  for (const side of [-1, 1]) {
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.036, 0.17, 10),
      mats.titaniumJoint
    );
    stack.position.set(side * 0.12, 0.24, -0.01);
    stack.rotation.x = 0.14;
    packGroup.add(stack);
  }

  // Twin Wide-Bore Ram-Jet Shield-Charge Thruster Nozzles + Electric-Cyan Volumetric Plumes!
  const nozzleGeo = new THREE.CylinderGeometry(0.046, 0.068, 0.16, 12);
  const throatGeo = new THREE.CircleGeometry(0.052, 10);
  throatGeo.rotateX(Math.PI / 2);
  const plumeCoreGeo = new THREE.ConeGeometry(0.032, 0.38, 10, 1, true);
  plumeCoreGeo.rotateX(Math.PI);
  plumeCoreGeo.translate(0, -0.19, 0);
  const plumeOuterGeo = new THREE.ConeGeometry(0.068, 0.62, 12, 1, true);
  plumeOuterGeo.rotateX(Math.PI);
  plumeOuterGeo.translate(0, -0.31, 0);
  disposables.push(nozzleGeo, throatGeo, plumeCoreGeo, plumeOuterGeo);

  const plumeCoreMat = new THREE.MeshBasicMaterial({
    color: 0xe8fdff,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plumeOuterMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(plumeCoreMat, plumeOuterMat);

  const buildThruster = (side: -1 | 1) => {
    const nozGrp = new THREE.Group();
    nozGrp.position.set(side * 0.168, -0.065, 0.068);
    // Splayed symmetrically aft (-1.12 rad) and slightly outward (±0.22 rad) for clean rocket-charge exhaust!
    nozGrp.rotation.set(-1.12, 0, side * 0.22);
    packGroup.add(nozGrp);

    nozGrp.add(new THREE.Mesh(nozzleGeo, mats.titaniumJoint));

    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 6, 12), visorMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = -0.078;
    nozGrp.add(lip);

    const throat = new THREE.Mesh(throatGeo, plumeCoreMat);
    throat.position.y = -0.074;
    throat.visible = false;
    nozGrp.add(throat);

    const pCore = new THREE.Mesh(plumeCoreGeo, plumeCoreMat);
    pCore.position.y = -0.076;
    pCore.visible = false;
    nozGrp.add(pCore);

    const pOuter = new THREE.Mesh(plumeOuterGeo, plumeOuterMat);
    pOuter.position.y = -0.074;
    pOuter.visible = false;
    nozGrp.add(pOuter);

    return { nozGrp, throat, pCore, pOuter };
  };

  const thrL = buildThruster(-1);
  const thrR = buildThruster(1);

  const setBoosterPlume = (intensity: number, elapsed: number): void => {
    const throatOn = intensity > 0.15;
    const conesOn = intensity > 0.3;
    thrL.throat.visible = throatOn;
    thrR.throat.visible = throatOn;
    thrL.pCore.visible = conesOn;
    thrL.pOuter.visible = conesOn;
    thrR.pCore.visible = conesOn;
    thrR.pOuter.visible = conesOn;
    if (!conesOn) return;

    const power = Math.min(1.45, (intensity - 0.25) / 0.9);
    const fL = 0.88 + Math.sin(elapsed * 58) * 0.12;
    const fR = 0.88 + Math.cos(elapsed * 63) * 0.12;
    const len = 0.56 + power * 0.68;
    const wid = 0.76 + power * 0.3;

    thrL.pCore.scale.set(wid * 0.82, len * fL * 0.9, wid * 0.82);
    thrL.pOuter.scale.set(wid, len * fL, wid);
    thrR.pCore.scale.set(wid * 0.82, len * fR * 0.9, wid * 0.82);
    thrR.pOuter.scale.set(wid, len * fR, wid);
    plumeOuterMat.opacity = Math.min(0.8, 0.38 + power * 0.36);
    plumeCoreMat.opacity = Math.min(0.96, 0.58 + power * 0.34);
  };

  // ---------------------------------------------------------------------------
  // 4. 360°-SEAMLESS HEAVY EOD RIOT-JUGGERNAUT HELMET + GLOWING CYAN T-VISOR
  // ---------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 0.59, -0.01);
  torso.add(head);

  const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.095, 0.13, 12), mats.undersuit);
  neckCol.position.y = 0.035;
  head.add(neckCol);

  // Solid sealed inner head core (zero gaps from any angle!)
  const innerHead = new THREE.Mesh(new THREE.SphereGeometry(0.128, 16, 12), mats.undersuit);
  innerHead.scale.set(0.98, 1.04, 1.08);
  innerHead.position.set(0, 0.16, 0.005);
  head.add(innerHead);

  // Heavy Welded EOD Ballistic Dome Shell (LatheGeometry)
  const domePts = [
    new THREE.Vector2(0.0, 0.295),
    new THREE.Vector2(0.075, 0.288),
    new THREE.Vector2(0.132, 0.252),
    new THREE.Vector2(0.152, 0.19),
    new THREE.Vector2(0.148, 0.125),
    new THREE.Vector2(0.132, 0.088),
  ];
  const domeGeo = new THREE.LatheGeometry(domePts, 18);
  disposables.push(domeGeo);
  const helmetDome = new THREE.Mesh(domeGeo, flashArmorMat);
  helmetDome.scale.set(1.0, 1.0, 1.12);
  helmetDome.position.set(0, 0.005, 0.01);
  helmetDome.castShadow = true;
  head.add(helmetDome);

  // Heavy flip-down titanium brow-shield + central crest ridge + hazard forehead stripe
  const browShield = new THREE.Mesh(createBeveledBox(0.24, 0.068, 0.095, 0.014), navyCeramicMat);
  browShield.position.set(0, 0.215, -0.118);
  browShield.rotation.x = 0.18;
  head.add(browShield);

  const crestRidge = new THREE.Mesh(createBeveledBox(0.056, 0.042, 0.24, 0.01), mats.titaniumJoint);
  crestRidge.position.set(0, 0.288, 0.01);
  head.add(crestRidge);

  const browHazard = new THREE.Mesh(createBeveledBox(0.16, 0.018, 0.018, 0.004), hazardYellowMat);
  browHazard.position.set(0, 0.236, -0.164);
  head.add(browHazard);

  // Iconic Glowing Electric-Cyan Armored T-Visor recessed under the heavy brow!
  const visorHoriz = new THREE.Mesh(createBeveledBox(0.185, 0.036, 0.042, 0.006), visorMat);
  visorHoriz.position.set(0, 0.165, -0.142);
  head.add(visorHoriz);

  const visorVert = new THREE.Mesh(createBeveledBox(0.038, 0.075, 0.04, 0.005), visorMat);
  visorVert.position.set(0, 0.132, -0.144);
  head.add(visorVert);

  // Heavy riveted EOD blast mandible jaw guard + twin filter grilles
  const jawGuard = new THREE.Mesh(createBeveledBox(0.205, 0.095, 0.118, 0.018), navyCeramicMat);
  jawGuard.position.set(0, 0.095, -0.095);
  jawGuard.rotation.x = 0.1;
  head.add(jawGuard);

  for (const side of [-1, 1]) {
    const earBaffle = new THREE.Mesh(createBeveledBox(0.052, 0.112, 0.105, 0.016), mats.titaniumJoint);
    earBaffle.position.set(side * 0.146, 0.145, 0.01);
    head.add(earBaffle);

    const ventFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.038, 8),
      mats.titaniumJoint
    );
    ventFilter.rotation.x = Math.PI / 2;
    ventFilter.position.set(side * 0.064, 0.09, -0.148);
    head.add(ventFilter);
  }

  // Rear armored occipital stabilizer pack
  const rearHelmPack = new THREE.Mesh(createBeveledBox(0.145, 0.09, 0.075, 0.014), navyCeramicMat);
  rearHelmPack.position.set(0, 0.15, 0.158);
  head.add(rearHelmPack);

  const visorGlintOrigin = new THREE.Object3D();
  visorGlintOrigin.position.set(0, 0.168, -0.2);
  head.add(visorGlintOrigin);

  return {
    pelvis,
    torso,
    head,
    visorMat,
    visorGlintOrigin,
    setBoosterPlume,
    disposables,
  };
}
