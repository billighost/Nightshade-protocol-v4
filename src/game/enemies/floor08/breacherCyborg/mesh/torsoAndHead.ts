import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createStrapTube,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface BreacherTorsoParts {
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  opticMat: THREE.MeshStandardMaterial;
  opticGlintOrigin: THREE.Object3D;
  boosterNozzleLeft: THREE.Object3D;
  boosterNozzleRight: THREE.Object3D;
  setBoosterPlume: (intensity: number, elapsed: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * AAA Spec-Ops Cyber-Marksman Torso, Ballistic Plate Carrier, Dorsal Tactical Jump-Pack,
 * and 360°-Seamless FAST Helmet with Quad-Tube GPNVG-18 Panoramic Optics for BREACHER-08.
 *
 * Distinct visual language from KAGE-08:
 * - Matte stealth-charcoal ceramic + tactical olive-gunmetal SAPI plate carrier + amber-orange optics
 * - Zero boxy slabs: sculpted lofted muscles, curved chest/back ballistic plates, 3 angled chest mag pouches,
 *   flexible respirator conduit hose, quad-tube panoramic NVGs, and twin volumetric dorsal thruster jets!
 */
export function buildBreacherTorsoAndHead(
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): BreacherTorsoParts {
  const disposables: Array<{ dispose: () => void }> = [];

  // Matte tactical olive-gunmetal ballistic nylon / ceramic carrier accent
  const tacticalOliveMat = new THREE.MeshStandardMaterial({
    color: 0x2c332d,
    roughness: 0.86,
    metalness: 0.14,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.015,
  });
  // Blazing amber-orange Quad-NOD thermal optics
  const opticMat = new THREE.MeshStandardMaterial({
    color: 0xffa020,
    emissive: 0xff6a10,
    emissiveIntensity: 3.4,
    roughness: 0.12,
    metalness: 0.15,
  });
  const amberAccentMat = new THREE.MeshStandardMaterial({
    color: 0xc26d18,
    roughness: 0.58,
    metalness: 0.35,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.01,
  });
  disposables.push(tacticalOliveMat, opticMat, amberAccentMat);

  // ---------------------------------------------------------------------------
  // 1. SCULPTED ANATOMICAL PELVIS & TACTICAL BATTLE-BELT WITH RIG POUCHES
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.94, 0);

  const pelvisGeo = createLoftedAnatomy(
    [
      { y: -0.09, rx: 0.132, rz: 0.102, squareness: 2.2 },
      { y: -0.01, rx: 0.172, rz: 0.126, squareness: 2.35 },
      { y: 0.06, rx: 0.165, rz: 0.12, squareness: 2.35 },
      { y: 0.105, rx: 0.148, rz: 0.108, squareness: 2.2 },
    ],
    18
  );
  disposables.push(pelvisGeo);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, mats.undersuit);
  pelvisMesh.castShadow = true;
  pelvis.add(pelvisMesh);

  // Contoured war-belt wrapping cleanly around waist
  const beltGeo = createLoftedAnatomy(
    [
      { y: 0.015, rx: 0.18, rz: 0.135, squareness: 2.55 },
      { y: 0.055, rx: 0.186, rz: 0.14, squareness: 2.6 },
      { y: 0.095, rx: 0.178, rz: 0.132, squareness: 2.5 },
    ],
    18
  );
  disposables.push(beltGeo);
  pelvis.add(new THREE.Mesh(beltGeo, tacticalOliveMat));

  // Heavy Cobra-style quick-release tactical buckle + pelvic ballistic groin guard
  const buckle = new THREE.Mesh(createBeveledBox(0.092, 0.064, 0.036, 0.008), mats.titaniumJoint);
  buckle.position.set(0, 0.055, -0.142);
  pelvis.add(buckle);

  const groinGuardGeo = createCurvedPanelGeometry(
    [
      { y: -0.145, rx: 0.11, rz: 0.128, thickness: 0.018 },
      { y: -0.03, rx: 0.15, rz: 0.142, thickness: 0.018 },
    ],
    -Math.PI * 0.68,
    -Math.PI * 0.32,
    10
  );
  disposables.push(groinGuardGeo);
  pelvis.add(new THREE.Mesh(groinGuardGeo, flashArmorMat));

  // Side hip utility pouches & rear tactical dump pouch
  for (const side of [-1, 1]) {
    const hipPouch = new THREE.Mesh(
      createBeveledBox(0.058, 0.125, 0.115, 0.012),
      tacticalOliveMat
    );
    hipPouch.position.set(side * 0.188, 0.02, 0.015);
    hipPouch.rotation.z = side * -0.08;
    pelvis.add(hipPouch);

    const clasp = new THREE.Mesh(createBeveledBox(0.064, 0.022, 0.032, 0.004), amberAccentMat);
    clasp.position.set(side * 0.19, 0.045, 0.015);
    pelvis.add(clasp);
  }
  const dumpPouch = new THREE.Mesh(createBeveledBox(0.165, 0.13, 0.065, 0.014), tacticalOliveMat);
  dumpPouch.position.set(0, 0.015, 0.152);
  pelvis.add(dumpPouch);

  // ---------------------------------------------------------------------------
  // 2. MUSCULAR BALLISTIC TORSO + CURVED SAPI PLATE CARRIER + CHEST MAG RIG
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.set(0, 0.085, 0);
  pelvis.add(torso);

  const torsoUndersuitGeo = createLoftedAnatomy(
    [
      { y: -0.02, rx: 0.142, rz: 0.104, squareness: 2.25 },
      { y: 0.1, rx: 0.158, rz: 0.116, squareness: 2.35, frontScale: 1.06 },
      { y: 0.24, rx: 0.198, rz: 0.134, squareness: 2.4, frontScale: 1.1 },
      { y: 0.38, rx: 0.228, rz: 0.144, squareness: 2.45, frontScale: 1.12 },
      { y: 0.48, rx: 0.212, rz: 0.132, squareness: 2.35 },
      { y: 0.54, rx: 0.152, rz: 0.106, squareness: 2.15 },
    ],
    22
  );
  disposables.push(torsoUndersuitGeo);
  const torsoCore = new THREE.Mesh(torsoUndersuitGeo, mats.undersuit);
  torsoCore.castShadow = true;
  torso.add(torsoCore);

  // Contoured curved Front SAPI Ceramic Plate Carrier wrapping around torso!
  const frontCarrierGeo = createCurvedPanelGeometry(
    [
      { y: 0.08, rx: 0.178, rz: 0.135, thickness: 0.026 },
      { y: 0.24, rx: 0.218, rz: 0.156, thickness: 0.03 },
      { y: 0.39, rx: 0.232, rz: 0.16, thickness: 0.028 },
      { y: 0.475, rx: 0.185, rz: 0.134, thickness: 0.022 },
    ],
    -Math.PI * 0.86,
    -Math.PI * 0.14,
    18
  );
  disposables.push(frontCarrierGeo);
  const frontCarrier = new THREE.Mesh(frontCarrierGeo, flashArmorMat);
  frontCarrier.castShadow = true;
  torso.add(frontCarrier);

  // Contoured Rear Plate Carrier
  const backCarrierGeo = createCurvedPanelGeometry(
    [
      { y: 0.1, rx: 0.18, rz: 0.132, thickness: 0.024 },
      { y: 0.28, rx: 0.222, rz: 0.15, thickness: 0.026 },
      { y: 0.45, rx: 0.195, rz: 0.132, thickness: 0.022 },
    ],
    Math.PI * 0.14,
    Math.PI * 0.86,
    16
  );
  disposables.push(backCarrierGeo);
  const backCarrier = new THREE.Mesh(backCarrierGeo, tacticalOliveMat);
  backCarrier.castShadow = true;
  torso.add(backCarrier);

  // 3 Angled Front Rifle Magazine Pouches across lower chest rig (signature spec-ops silhouette!)
  for (let i = -1; i <= 1; i++) {
    const pouch = new THREE.Mesh(createBeveledBox(0.062, 0.125, 0.048, 0.008), tacticalOliveMat);
    pouch.position.set(i * 0.078, 0.225, -0.168 + Math.abs(i) * 0.012);
    pouch.rotation.y = i * -0.22;
    pouch.rotation.x = -0.08;
    torso.add(pouch);

    const magTip = new THREE.Mesh(createBeveledBox(0.048, 0.032, 0.032, 0.004), mats.armorSlate);
    magTip.position.set(i * 0.078, 0.292, -0.164 + Math.abs(i) * 0.012);
    magTip.rotation.y = i * -0.22;
    torso.add(magTip);
  }

  // Upper sternum tactical admin panel + amber IFF sensor strip + dual shoulder straps
  const adminPlate = new THREE.Mesh(createBeveledBox(0.18, 0.095, 0.032, 0.008), mats.armorSlate);
  adminPlate.position.set(0, 0.375, -0.168);
  adminPlate.rotation.x = -0.1;
  torso.add(adminPlate);

  const iffStrip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.012), opticMat);
  iffStrip.position.set(0, 0.395, -0.185);
  torso.add(iffStrip);

  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(createBeveledBox(0.068, 0.095, 0.24, 0.012), tacticalOliveMat);
    strap.position.set(side * 0.135, 0.48, 0);
    strap.rotation.z = side * -0.12;
    torso.add(strap);
  }

  // Heavy ballistic wrap-around neck collar (Gorget)
  const collarGeo = createCurvedPanelGeometry(
    [
      { y: 0.46, rx: 0.15, rz: 0.132, thickness: 0.02 },
      { y: 0.545, rx: 0.134, rz: 0.122, thickness: 0.018 },
    ],
    -Math.PI * 0.82,
    Math.PI * 0.82,
    18
  );
  disposables.push(collarGeo);
  torso.add(new THREE.Mesh(collarGeo, mats.armorSlate));

  // ---------------------------------------------------------------------------
  // 3. DORSAL TACTICAL JUMP-PACK WITH DUAL VOLUMETRIC MICRO-THRUSTER JETS
  // ---------------------------------------------------------------------------
  const packGroup = new THREE.Group();
  packGroup.position.set(0, 0.31, 0.165);
  torso.add(packGroup);

  const packChassis = new THREE.Mesh(createBeveledBox(0.26, 0.32, 0.115, 0.022), mats.armorSlate);
  packChassis.castShadow = true;
  packGroup.add(packChassis);

  const packCoreBand = new THREE.Mesh(createBeveledBox(0.18, 0.055, 0.128, 0.01), amberAccentMat);
  packCoreBand.position.set(0, 0.075, 0.005);
  packGroup.add(packCoreBand);

  const packVentLight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.014), opticMat);
  packVentLight.position.set(0, 0.075, 0.068);
  packGroup.add(packVentLight);

  // Twin angled dorsal tactical thruster nozzles + crisp volumetric cyan plasma jets!
  const nozzleGeo = new THREE.CylinderGeometry(0.036, 0.052, 0.135, 10);
  const throatGeo = new THREE.CircleGeometry(0.04, 10);
  throatGeo.rotateX(Math.PI / 2);
  const plumeCoreGeo = new THREE.ConeGeometry(0.028, 0.34, 10, 1, true);
  plumeCoreGeo.rotateX(Math.PI);
  plumeCoreGeo.translate(0, -0.17, 0);
  const plumeOuterGeo = new THREE.ConeGeometry(0.062, 0.56, 12, 1, true);
  plumeOuterGeo.rotateX(Math.PI);
  plumeOuterGeo.translate(0, -0.28, 0);
  disposables.push(nozzleGeo, throatGeo, plumeCoreGeo, plumeOuterGeo);

  const plumeCoreMat = new THREE.MeshBasicMaterial({
    color: 0xd8f8ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plumeOuterMat = new THREE.MeshBasicMaterial({
    color: 0x0ea5e9,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(plumeCoreMat, plumeOuterMat);

  const buildThruster = (side: -1 | 1) => {
    const nozGrp = new THREE.Group();
    nozGrp.position.set(side * 0.145, -0.065, 0.052);
    // Splayed cleanly backward (-0.88 rad) and outward (±0.36 rad) so jets clear his thighs completely!
    nozGrp.rotation.set(-0.88, 0, side * 0.36);
    packGroup.add(nozGrp);

    nozGrp.add(new THREE.Mesh(nozzleGeo, mats.titaniumJoint));

    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 6, 10), opticMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = -0.066;
    nozGrp.add(lip);

    const throat = new THREE.Mesh(throatGeo, plumeCoreMat);
    throat.position.y = -0.062;
    throat.visible = false;
    nozGrp.add(throat);

    const pCore = new THREE.Mesh(plumeCoreGeo, plumeCoreMat);
    pCore.position.y = -0.065;
    pCore.visible = false;
    nozGrp.add(pCore);

    const pOuter = new THREE.Mesh(plumeOuterGeo, plumeOuterMat);
    pOuter.position.y = -0.062;
    pOuter.visible = false;
    nozGrp.add(pOuter);

    return { nozGrp, throat, pCore, pOuter };
  };

  const thrL = buildThruster(-1);
  const thrR = buildThruster(1);

  const setBoosterPlume = (intensity: number, elapsed: number): void => {
    // Only show tight throat ember during mild idle; full roaring thruster cones fire on active jet-dash!
    const throatOn = intensity > 0.12;
    const conesOn = intensity > 0.28;
    thrL.throat.visible = throatOn;
    thrR.throat.visible = throatOn;
    thrL.pCore.visible = conesOn;
    thrL.pOuter.visible = conesOn;
    thrR.pCore.visible = conesOn;
    thrR.pOuter.visible = conesOn;
    if (!conesOn) return;

    const power = Math.min(1.35, (intensity - 0.25) / 0.95);
    const fL = 0.88 + Math.sin(elapsed * 64) * 0.12;
    const fR = 0.88 + Math.cos(elapsed * 69) * 0.12;
    const len = 0.55 + power * 0.62;
    const wid = 0.72 + power * 0.28;

    thrL.pCore.scale.set(wid * 0.82, len * fL * 0.9, wid * 0.82);
    thrL.pOuter.scale.set(wid, len * fL, wid);
    thrR.pCore.scale.set(wid * 0.82, len * fR * 0.9, wid * 0.82);
    thrR.pOuter.scale.set(wid, len * fR, wid);
    plumeOuterMat.opacity = Math.min(0.76, 0.36 + power * 0.35);
    plumeCoreMat.opacity = Math.min(0.92, 0.55 + power * 0.32);
  };

  // ---------------------------------------------------------------------------
  // 4. 360°-SEAMLESS HIGH-CUT FAST BALLISTIC HELMET + QUAD-TUBE GPNVG-18 OPTICS
  // ---------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 0.54, -0.01);
  torso.add(head);

  const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.074, 0.12, 12), mats.undersuit);
  neckCol.position.y = 0.035;
  head.add(neckCol);

  // Solid sealed inner ballistic balaclava head (guarantees ZERO gaps from every angle!)
  const innerHead = new THREE.Mesh(new THREE.SphereGeometry(0.114, 16, 12), mats.undersuit);
  innerHead.scale.set(0.94, 1.06, 1.08);
  innerHead.position.set(0, 0.155, 0.005);
  head.add(innerHead);

  // Sculpted High-Cut FAST Tactical Helmet Shell (LatheGeometry curved ballistic shell)
  const shellPts = [
    new THREE.Vector2(0.0, 0.278),
    new THREE.Vector2(0.062, 0.272),
    new THREE.Vector2(0.114, 0.242),
    new THREE.Vector2(0.132, 0.188),
    new THREE.Vector2(0.126, 0.135),
    new THREE.Vector2(0.114, 0.115),
  ];
  const shellGeo = new THREE.LatheGeometry(shellPts, 16);
  disposables.push(shellGeo);
  const helmetShell = new THREE.Mesh(shellGeo, flashArmorMat);
  helmetShell.scale.set(0.98, 1.0, 1.12);
  helmetShell.position.set(0, 0.005, 0.012);
  helmetShell.castShadow = true;
  head.add(helmetShell);

  // Rear helmet counterweight battery box + side ARC accessory rails + tactical headset ear-pro cups
  const rearCounterweight = new THREE.Mesh(
    createBeveledBox(0.11, 0.062, 0.052, 0.01),
    tacticalOliveMat
  );
  rearCounterweight.position.set(0, 0.152, 0.145);
  head.add(rearCounterweight);

  for (const side of [-1, 1]) {
    // Active Peltor-style tactical comms ear-pro headset cups
    const earCup = new THREE.Mesh(createBeveledBox(0.044, 0.088, 0.078, 0.014), tacticalOliveMat);
    earCup.position.set(side * 0.122, 0.135, 0.008);
    head.add(earCup);

    // Side ARC accessory rail
    const rail = new THREE.Mesh(createBeveledBox(0.018, 0.026, 0.14, 0.005), mats.titaniumJoint);
    rail.position.set(side * 0.125, 0.185, 0.005);
    head.add(rail);
  }

  // Dual angled tactical whip comms antennas on left rear helmet
  const antMain = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.24, 6), mats.titaniumJoint);
  antMain.position.set(-0.095, 0.295, 0.075);
  antMain.rotation.set(-0.22, 0, 0.18);
  head.add(antMain);

  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), opticMat);
  antTip.position.set(-0.118, 0.405, 0.102);
  head.add(antTip);

  // Iconic QUAD-TUBE GPNVG-18 PANORAMIC NIGHT-VISION / THERMAL OPTIC RIG!
  const nvgMount = new THREE.Mesh(createBeveledBox(0.064, 0.056, 0.058, 0.008), mats.titaniumJoint);
  nvgMount.position.set(0, 0.222, -0.126);
  head.add(nvgMount);

  const nvgBridge = new THREE.Mesh(createBeveledBox(0.215, 0.032, 0.042, 0.006), mats.armorSlate);
  nvgBridge.position.set(0, 0.175, -0.135);
  head.add(nvgBridge);

  // 4 Cylindrical Panoramic Optic Tubes splayed symmetrically across brow with glowing amber lenses!
  const tubeGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.088, 10);
  tubeGeo.rotateX(Math.PI / 2);
  const lensGeo = new THREE.CircleGeometry(0.019, 10);
  disposables.push(tubeGeo, lensGeo);

  const tubeSpecs = [
    { x: -0.078, y: 0.168, z: -0.155, rotY: 0.24 },
    { x: -0.028, y: 0.17, z: -0.168, rotY: 0.06 },
    { x: 0.028, y: 0.17, z: -0.168, rotY: -0.06 },
    { x: 0.078, y: 0.168, z: -0.155, rotY: -0.24 },
  ];
  for (const ts of tubeSpecs) {
    const tubeGrp = new THREE.Group();
    tubeGrp.position.set(ts.x, ts.y, ts.z);
    tubeGrp.rotation.y = ts.rotY;

    const housing = new THREE.Mesh(tubeGeo, mats.armorDark);
    tubeGrp.add(housing);

    const lens = new THREE.Mesh(lensGeo, opticMat);
    lens.position.z = -0.045;
    lens.rotation.y = Math.PI;
    tubeGrp.add(lens);

    head.add(tubeGrp);
  }

  // Sculpted Ballistic Half-Mask Respirator + side filter canisters
  const maskBody = new THREE.Mesh(createBeveledBox(0.142, 0.086, 0.105, 0.02), mats.armorSlate);
  maskBody.position.set(0, 0.095, -0.085);
  maskBody.rotation.x = 0.12;
  head.add(maskBody);

  const ventGrid = new THREE.Mesh(createBeveledBox(0.062, 0.044, 0.032, 0.006), mats.titaniumJoint);
  ventGrid.position.set(0, 0.088, -0.135);
  head.add(ventGrid);

  // Flexible ribbed air-supply hose curving from right mask canister back over shoulder to pack!
  const hoseGeo = createStrapTube(
    [
      new THREE.Vector3(0.072, 0.09, -0.105),
      new THREE.Vector3(0.125, 0.07, -0.02),
      new THREE.Vector3(0.12, 0.02, 0.095),
      new THREE.Vector3(0.085, -0.04, 0.155),
    ],
    0.015,
    1.0,
    16
  );
  disposables.push(hoseGeo);
  head.add(new THREE.Mesh(hoseGeo, mats.undersuit));

  // Optical glint origin cleanly in front of his Quad-NODs
  const opticGlintOrigin = new THREE.Object3D();
  opticGlintOrigin.position.set(0, 0.172, -0.23);
  head.add(opticGlintOrigin);

  return {
    pelvis,
    torso,
    head,
    opticMat,
    opticGlintOrigin,
    boosterNozzleLeft: thrL.nozGrp,
    boosterNozzleRight: thrR.nozGrp,
    setBoosterPlume,
    disposables,
  };
}
