import * as THREE from 'three';
import { createLoftedAnatomy } from '../../../core/sculptUtils';
import type { EnemyAnimationInput, EnemyHitZone, EnemyRigHandle } from '../../core/types';
import type { Floor06EnemyMaterials } from '../materials';
import {
  createBeamPrismTextures,
  type BeamPrismTextureSuite,
} from './textures';

export type BeamPrismApertureMode =
  | 'scan_idle'
  | 'rail_barrel'
  | 'sweep_fan'
  | 'bloom_mortar'
  | 'refraction_shield';

export interface BeamPrismRigHandle extends EnemyRigHandle {
  setApertureMode: (mode: BeamPrismApertureMode) => void;
  setTargetingLaser: (
    active: boolean,
    length: number,
    chargeRatio: number,
    firingBeam?: boolean
  ) => void;
  setRefractionShield: (active: boolean, intensity?: number) => void;
  setNovaTelegraph: (active: boolean, radius: number, progress: number) => void;
  setMortarOrbCharge: (charge: number) => void;
  triggerWingRecoil: () => void;
  getCrownOrbWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getShieldCenterWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

function makeHitbox(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  enemyId: string,
  hitZone: EnemyHitZone,
  pos: [number, number, number]
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.userData = { enemyId, hitZone };
  return m;
}

/**
 * Sculpted biomechanical-brutalist tripod anchor buttress leg (flush at y = 0.0!).
 */
function createAnchorButtressGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  // Spans along +X radially outward (0.28 -> 0.86m), Y from floor (0.0) up to plinth collar (0.56)
  s.moveTo(0.24, 0.44);
  s.lineTo(0.46, 0.56);
  s.lineTo(0.68, 0.34);
  s.lineTo(0.86, 0.08);
  s.lineTo(0.88, 0.0);
  s.lineTo(0.62, 0.0);
  s.lineTo(0.56, 0.14);
  s.lineTo(0.42, 0.28);
  s.lineTo(0.24, 0.22);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.08);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Towering beveled obsidian cathedral refraction wing outer armor shell.
 */
function createMirrorWingBackGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.78);
  s.lineTo(0.18, -0.52);
  s.lineTo(0.26, -0.08);
  s.lineTo(0.22, 0.48);
  s.lineTo(0.08, 0.84);
  s.lineTo(0, 0.94);
  s.lineTo(-0.08, 0.84);
  s.lineTo(-0.22, 0.48);
  s.lineTo(-0.26, -0.08);
  s.lineTo(-0.18, -0.52);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.078,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.039);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Proud inner concave Fresnel mirror-lens reflector inset (strictly proud of wing shell -> zero Z-fighting!).
 */
function createMirrorLensInsetGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.58);
  s.lineTo(0.13, -0.34);
  s.lineTo(0.16, 0.04);
  s.lineTo(0.12, 0.46);
  s.lineTo(0, 0.68);
  s.lineTo(-0.12, 0.46);
  s.lineTo(-0.16, 0.04);
  s.lineTo(-0.13, -0.34);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.012);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Swept brass optical caliper tine flanking each Mirror Wing.
 */
function createOpticalCaliperGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.34);
  s.quadraticCurveTo(0.08, -0.14, 0.1, 0.16);
  s.lineTo(0.03, 0.56);
  s.lineTo(-0.02, 0.36);
  s.quadraticCurveTo(0.02, 0.02, -0.03, -0.24);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.013);
  geo.computeVertexNormals();
  return geo;
}

/**
 * AAA Sculpted Rig for Floor 06 Enemy #3: RESONANT BEAM PRISM.
 * - Grounded brutalist obsidian hexagonal plinth + 3 articulated clawed anchor buttresses flush at y = 0.0
 * - Pulsing magnetic gravity-levitation conduit holding a hovering Solar-Teal Optical Spire
 * - Exposed multi-layered Refractive Prism Core weakpoint + wireframe refraction cage + 3 orbiting focus lenses
 * - 3 blooming sculpted Obsidian-Brass Mirror-Lens Wings with proud concave Fresnel mirror channels (zero Z-fighting)
 * - Counter-rotating dual Astrolabe Observatory Brass Calibration Rings + floating Crown Obelisk Needle
 * - Dual-core volumetric targeting & continuous sweeping cutting laser + deployable Tri-Prism Refraction Shield Wall
 */
export function buildResonantBeamPrismRig(
  enemyId: string,
  mats: Floor06EnemyMaterials,
  sharedTextures?: BeamPrismTextureSuite
): BeamPrismRigHandle {
  const root = new THREE.Group();
  const ownsTextures = !sharedTextures;
  const tex = sharedTextures ?? createBeamPrismTextures();

  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };
  const reg = <T extends THREE.Mesh>(m: T): T => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // =========================================================================
  // PBR MATERIALS (Full-value albedo bound with color: 0xffffff!)
  // =========================================================================
  const basaltArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.obsidianBasaltAlbedo,
      bumpMap: tex.obsidianBasaltBump,
      bumpScale: 0.034,
      roughnessMap: tex.obsidianBasaltRoughness,
      roughness: 0.72,
      metalness: 0.58,
    })
  );

  const darkCoreFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161e28,
      roughness: 0.44,
      metalness: 0.74,
    })
  );

  const opticBrassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.opticBrassAlbedo,
      bumpMap: tex.opticBrassBump,
      bumpScale: 0.024,
      roughness: 0.28,
      metalness: 0.84,
    })
  );

  const mirrorLensMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.mirrorLensAlbedo,
      emissive: 0x14b8a6,
      emissiveMap: tex.mirrorLensEmissive,
      emissiveIntensity: 1.35,
      roughness: 0.16,
      metalness: 0.72,
    })
  );

  const weakpointPrismMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x0d9488,
      emissiveIntensity: 1.85,
      roughness: 0.14,
      metalness: 0.28,
      flatShading: true,
    })
  );

  const solarGoldGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfacc15,
      emissiveIntensity: 2.8,
      roughness: 0.12,
      metalness: 0.15,
    })
  );

  const innerStarMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const conduitMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const shieldWallMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: tex.refractionShieldMap,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const shieldRimMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  // =========================================================================
  // 1. GROUND CONTACT SHADOW, TELEGRAPH RING & SCULPTED ANCHOR PLINTH (y = 0)
  // =========================================================================
  const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.35, 2.35)), mats.shadowDisc);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.022;
  root.add(shadow);

  const novaTelegraphMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const novaTelegraphRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.84, 1.0, 32)),
    novaTelegraphMat
  );
  novaTelegraphRing.rotation.x = -Math.PI * 0.5;
  novaTelegraphRing.position.y = 0.052;
  novaTelegraphRing.visible = false;
  root.add(novaTelegraphRing);

  // Stepped architectural hexagonal obsidian anchor pedestal (flush at y = 0.0!)
  const plinthGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: 0.0, rx: 0.62, rz: 0.62, squareness: 2.8 },
        { y: 0.14, rx: 0.58, rz: 0.58, squareness: 2.8 },
        { y: 0.24, rx: 0.44, rz: 0.44, squareness: 2.6 },
        { y: 0.44, rx: 0.4, rz: 0.4, squareness: 2.6 },
        { y: 0.52, rx: 0.3, rz: 0.3, squareness: 2.4 },
      ],
      6
    )
  );
  root.add(reg(new THREE.Mesh(plinthGeo, basaltArmorMat)));

  // Observatory brass magnetic levitation collar on top of plinth
  const plinthBrassRing = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.36, 0.032, 8, 6)), opticBrassMat)
  );
  plinthBrassRing.rotation.x = Math.PI * 0.5;
  plinthBrassRing.position.y = 0.49;
  root.add(plinthBrassRing);

  const emitterWell = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.27, 6)),
    conduitMat
  );
  emitterWell.rotation.x = -Math.PI * 0.5;
  emitterWell.position.y = 0.53;
  root.add(emitterWell);

  // 3 Sculpted Articulated Hydraulic Anchor Buttresses gripping floor cleanly at y = 0.0
  const buttressGeo = trackGeo(createAnchorButtressGeo());
  const clawCapGeo = trackGeo(new THREE.OctahedronGeometry(0.068, 0));
  for (let i = 0; i < 3; i++) {
    // Oriented radially at 60°, 180°, 300° so twin front claws brace forward-left & forward-right!
    const a = (i * Math.PI * 2) / 3 + Math.PI / 6;
    const legGroup = new THREE.Group();
    legGroup.rotation.y = a;

    const strut = reg(new THREE.Mesh(buttressGeo, basaltArmorMat));
    legGroup.add(strut);

    const brassCuff = reg(
      new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.075, 0.18, 6)), opticBrassMat)
    );
    brassCuff.position.set(0.56, 0.36, 0);
    brassCuff.rotation.z = 0.65;
    legGroup.add(brassCuff);

    const anchorNode = new THREE.Mesh(clawCapGeo, solarGoldGlowMat);
    anchorNode.scale.set(1.2, 0.65, 1.1);
    anchorNode.position.set(0.75, 0.13, 0);
    legGroup.add(anchorNode);

    root.add(legGroup);
  }

  // Upward pulsing magnetic levitation conduit connecting plinth to floating spire
  const levConduit = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.075, 0.17, 1.05, 8, 1, true)),
    conduitMat
  );
  levConduit.position.y = 0.96;
  root.add(levConduit);

  const levHaloRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.24, 0.34, 18)),
    conduitMat
  );
  levHaloRing.rotation.x = -Math.PI * 0.5;
  levHaloRing.position.y = 0.78;
  root.add(levHaloRing);

  // =========================================================================
  // 2. FLOATING ARTICULATED RESONANT PRISM SPIRE HEAD (y = 1.66m)
  // =========================================================================
  const spireHead = new THREE.Group();
  spireHead.position.set(0, 1.66, 0);
  root.add(spireHead);

  // Lower floating counterweight pendulum & upper floating crown obelisk needle
  const lowerPendulum = reg(
    new THREE.Mesh(
      trackGeo(
        createLoftedAnatomy(
          [
            { y: -0.92, rx: 0.02, rz: 0.02, squareness: 2.0 },
            { y: -0.74, rx: 0.17, rz: 0.17, squareness: 2.7 },
            { y: -0.58, rx: 0.24, rz: 0.24, squareness: 2.7 },
            { y: -0.52, rx: 0.14, rz: 0.14, squareness: 2.5 },
          ],
          6
        )
      ),
      basaltArmorMat
    )
  );
  spireHead.add(lowerPendulum);

  const crownNeedleGroup = new THREE.Group();
  crownNeedleGroup.position.set(0, 0.94, 0);
  spireHead.add(crownNeedleGroup);

  const crownNeedle = reg(
    new THREE.Mesh(
      trackGeo(
        createLoftedAnatomy(
          [
            { y: -0.14, rx: 0.14, rz: 0.14, squareness: 2.5 },
            { y: 0.02, rx: 0.23, rz: 0.23, squareness: 2.7 },
            { y: 0.28, rx: 0.12, rz: 0.12, squareness: 2.6 },
            { y: 0.54, rx: 0.015, rz: 0.015, squareness: 2.0 },
          ],
          6
        )
      ),
      basaltArmorMat
    )
  );
  const crownBrassCollar = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.22, 0.024, 6, 6)), opticBrassMat)
  );
  crownBrassCollar.rotation.x = Math.PI * 0.5;
  crownBrassCollar.position.y = 0.02;
  crownNeedleGroup.add(crownNeedle, crownBrassCollar);

  // Cover-flush mortar charge orb hovering above the crown needle during bloom_mortar!
  const mortarOrbMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const mortarOrb = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.24, 1)), mortarOrbMat);
  mortarOrb.position.set(0, 0.72, 0);
  mortarOrb.visible = false;
  crownNeedleGroup.add(mortarOrb);

  // =========================================================================
  // 3. EXPOSED WEAKPOINT: MULTI-LAYERED REFRACTIVE PRISM CORE + 3 ORBITING LENSES
  // =========================================================================
  const prismCoreGroup = new THREE.Group();
  spireHead.add(prismCoreGroup);

  const prismCore = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.31, 0)),
    weakpointPrismMat
  );
  prismCore.scale.set(0.88, 1.56, 0.88);
  prismCoreGroup.add(prismCore);

  const prismCageMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.44,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const prismCage = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.38, 0)),
    prismCageMat
  );
  prismCage.scale.set(0.92, 1.62, 0.92);
  prismCoreGroup.add(prismCage);

  const prismStar = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.14, 0)),
    innerStarMat
  );
  prismStar.scale.set(0.75, 1.55, 0.75);
  prismCoreGroup.add(prismStar);

  // 3 Miniature Orbiting Crystal Focus Lenses swirling around the core
  const orbitRing = new THREE.Group();
  spireHead.add(orbitRing);
  const orbitLensGeo = trackGeo(new THREE.OctahedronGeometry(0.072, 0));
  const orbitLenses: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const lens = new THREE.Mesh(orbitLensGeo, solarGoldGlowMat);
    lens.scale.set(0.7, 1.6, 0.7);
    lens.position.set(Math.cos(a) * 0.42, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.42);
    orbitRing.add(lens);
    orbitLenses.push(lens);
  }

  // =========================================================================
  // 4. COUNTER-ROTATING TWIN ASTROLABE OBSERVATORY CALIBRATION GYRO-RINGS
  // =========================================================================
  const innerGyro = new THREE.Group();
  spireHead.add(innerGyro);
  const innerGyroRing = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.56, 0.028, 8, 24)), opticBrassMat)
  );
  innerGyro.add(innerGyroRing);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    const stud = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.042, 0)),
      i % 2 === 0 ? solarGoldGlowMat : weakpointPrismMat
    );
    stud.position.set(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0);
    innerGyro.add(stud);
  }

  const outerGyro = new THREE.Group();
  spireHead.add(outerGyro);
  const outerGyroRing = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.74, 0.032, 6, 18)), darkCoreFrameMat)
  );
  const outerGyroBrass = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.74, 0.016, 6, 18)), opticBrassMat)
  );
  outerGyroBrass.position.z = 0.026;
  outerGyro.add(outerGyroRing, outerGyroBrass);

  // =========================================================================
  // 5. 3 SCULPTED BLOOMING MIRROR-LENS WING PETALS (wide-open front window toward -Z!)
  // Radial angles: 0 (rear backing), +120° (front-right), -120° (front-left)
  // =========================================================================
  const wingBackGeo = trackGeo(createMirrorWingBackGeo());
  const wingLensGeo = trackGeo(createMirrorLensInsetGeo());
  const caliperGeo = trackGeo(createOpticalCaliperGeo());

  interface WingRig {
    azimuthPivot: THREE.Group;
    wingBody: THREE.Group;
    baseAzimuth: number;
  }
  const wings: WingRig[] = [];
  const wingAngles = [0, (Math.PI * 2) / 3, -(Math.PI * 2) / 3];

  for (let i = 0; i < 3; i++) {
    const azimuthPivot = new THREE.Group();
    azimuthPivot.rotation.y = wingAngles[i];
    spireHead.add(azimuthPivot);

    const wingBody = new THREE.Group();
    wingBody.position.set(0, 0.04, 0.56);
    azimuthPivot.add(wingBody);

    // Sculpted obsidian cathedral wing backplate
    const backPlate = reg(new THREE.Mesh(wingBackGeo, basaltArmorMat));
    wingBody.add(backPlate);

    // Proud inner concave Fresnel optical mirror facing the core (-Z local, offset -0.056m -> zero Z-fighting!)
    const mirrorInset = reg(new THREE.Mesh(wingLensGeo, mirrorLensMat));
    mirrorInset.position.set(0, 0, -0.056);
    wingBody.add(mirrorInset);

    // Outer dorsal brass spine crest on rear of wing (+Z local)
    const rearSpine = reg(
      new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.085, 0)), opticBrassMat)
    );
    rearSpine.scale.set(0.55, 4.6, 0.65);
    rearSpine.position.set(0, 0.08, 0.068);
    wingBody.add(rearSpine);

    // Twin flanking swept observatory brass caliper tines
    const calL = reg(new THREE.Mesh(caliperGeo, opticBrassMat));
    calL.position.set(-0.23, 0.08, -0.01);
    calL.rotation.set(0, 0.25, 0.1);
    calL.scale.set(-1, 1, 1);

    const calR = reg(new THREE.Mesh(caliperGeo, opticBrassMat));
    calR.position.set(0.23, 0.08, -0.01);
    calR.rotation.set(0, -0.25, -0.1);

    wingBody.add(calL, calR);
    wings.push({ azimuthPivot, wingBody, baseAzimuth: wingAngles[i] });
  }

  // =========================================================================
  // 6. DUAL-CORE VOLUMETRIC TARGETING & CONTINUOUS CUTTING LASER + MUZZLE APERTURE
  // =========================================================================
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -0.52);
  spireHead.add(muzzle);

  const laserCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const laserHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const laserCoreGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.022, 1, 8, 1, true));
  laserCoreGeo.rotateX(Math.PI * 0.5);
  laserCoreGeo.translate(0, 0, -0.5);
  const laserCoreMesh = new THREE.Mesh(laserCoreGeo, laserCoreMat);
  laserCoreMesh.visible = false;

  const laserHaloGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.062, 1, 8, 1, true));
  laserHaloGeo.rotateX(Math.PI * 0.5);
  laserHaloGeo.translate(0, 0, -0.5);
  const laserHaloMesh = new THREE.Mesh(laserHaloGeo, laserHaloMat);
  laserHaloMesh.visible = false;

  // Spinning optical focusing aperture ring at muzzle during rail/sweep charges
  const muzzleFocusRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.24, 0.31, 6)),
    laserHaloMat
  );
  muzzleFocusRing.position.z = -0.14;
  muzzleFocusRing.visible = false;

  muzzle.add(laserCoreMesh, laserHaloMesh, muzzleFocusRing);

  // =========================================================================
  // 7. DEPLOYABLE HEXAGONAL TRI-PRISM REFRACTION SHIELD BARRIER + NOVA AURA SPHERE
  // Single clean translucent hexagonal hard-light pane (zero additive whiteout!)
  // =========================================================================
  const refractionShieldGroup = new THREE.Group();
  refractionShieldGroup.position.set(0, 0.0, -0.92);
  refractionShieldGroup.visible = false;
  spireHead.add(refractionShieldGroup);

  const shieldFrontHex = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.96, 6)),
    shieldWallMat
  );
  const shieldOuterRim = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.89, 0.98, 6)),
    shieldRimMat
  );
  shieldOuterRim.position.z = -0.014;
  const shieldInnerRim = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.46, 0.52, 3)),
    shieldRimMat
  );
  shieldInnerRim.position.z = -0.018;
  refractionShieldGroup.add(shieldFrontHex, shieldOuterRim, shieldInnerRim);

  // Anti-flank close-pulse expanding Nova Sphere
  const novaSphereMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const novaSphere = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.6, 1)), novaSphereMat);
  novaSphere.visible = false;
  spireHead.add(novaSphere);

  // =========================================================================
  // 8. PRECISION MULTI-ZONE HITBOXES (body, Refractive Prism Core weakpoint, Refraction Shield)
  // =========================================================================
  const hitboxes: THREE.Mesh[] = [];
  const bodyHit = makeHitbox(
    trackGeo(new THREE.CylinderGeometry(0.7, 0.74, 2.45, 8)),
    mats.hitboxInvisible,
    enemyId,
    'body',
    [0, 1.25, 0]
  );
  const wpHit = makeHitbox(
    trackGeo(new THREE.SphereGeometry(0.46, 10, 10)),
    mats.hitboxInvisible,
    enemyId,
    'weakpoint',
    [0, 0, 0]
  );
  const shieldHit = makeHitbox(
    trackGeo(new THREE.CylinderGeometry(0.96, 0.96, 0.18, 6)),
    mats.hitboxInvisible,
    enemyId,
    'shield',
    [0, 0, -0.02]
  );
  shieldHit.rotation.x = Math.PI * 0.5;

  root.add(bodyHit);
  spireHead.add(wpHit);
  refractionShieldGroup.add(shieldHit);
  hitboxes.push(bodyHit, wpHit, shieldHit);

  // Live animation state (zero GC!)
  let apertureMode: BeamPrismApertureMode = 'scan_idle';
  let laserActive = false;
  let laserFiring = false;
  let laserChargeVal = 0;
  let shieldActive = false;
  let shieldIntensity = 0;
  let curShieldScale = 0.01;
  let mortarOrbCharge = 0;
  let wingRecoil = 0;
  let curWingRadial = 0.56;
  let curWingTilt = 0.08;
  let curFrontSplay = 0;
  let curPitch = 0;

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointPrismMat],
    armorFlashMaterials: [basaltArmorMat],

    getMuzzleWorldPos(out: THREE.Vector3) {
      return muzzle.getWorldPosition(out);
    },

    getWeakpointWorldPos(out: THREE.Vector3) {
      return prismCore.getWorldPosition(out);
    },

    getCrownOrbWorldPos(out: THREE.Vector3) {
      return mortarOrb.getWorldPosition(out);
    },

    getShieldCenterWorldPos(out: THREE.Vector3) {
      return refractionShieldGroup.getWorldPosition(out);
    },

    setApertureMode(mode: BeamPrismApertureMode) {
      apertureMode = mode;
    },

    setTargetingLaser(active: boolean, length: number, chargeRatio: number, firingBeam = false) {
      laserActive = active && length > 0.2;
      laserFiring = firingBeam;
      laserChargeVal = Math.max(0, Math.min(1.5, chargeRatio));

      laserCoreMesh.visible = laserActive;
      laserHaloMesh.visible = laserActive;
      muzzleFocusRing.visible = laserActive;

      if (laserActive) {
        const coreThick = firingBeam ? 2.15 : 0.72 + chargeRatio * 1.15;
        const haloThick = firingBeam ? 2.85 : 1.05 + chargeRatio * 1.45;
        laserCoreMesh.scale.set(coreThick, coreThick, length);
        laserHaloMesh.scale.set(haloThick, haloThick, length);
        laserCoreMat.opacity = firingBeam ? 0.96 : 0.35 + chargeRatio * 0.55;
        laserHaloMat.opacity = firingBeam ? 0.46 : 0.18 + chargeRatio * 0.34;

        // Iconic solar-teal outer energy sheath + razor white-gold hot inner core!
        if (firingBeam) {
          laserCoreMat.color.setHex(0xfef9c3);
          laserHaloMat.color.setHex(0x14b8a6);
        } else if (chargeRatio > 0.74) {
          laserCoreMat.color.setHex(0xffffff);
          laserHaloMat.color.setHex(0xfacc15);
        } else {
          laserCoreMat.color.setHex(0xccfbf1);
          laserHaloMat.color.setHex(0x14b8a6);
        }

        const ringScale = firingBeam ? 1.28 : 0.65 + chargeRatio * 0.72;
        muzzleFocusRing.scale.setScalar(ringScale);
      }
    },

    setRefractionShield(active: boolean, intensity = 1) {
      shieldActive = active;
      shieldIntensity = active ? Math.max(0.25, intensity) : 0;
    },

    setNovaTelegraph(active: boolean, radius: number, progress: number) {
      if (!active) {
        novaTelegraphRing.visible = false;
        novaTelegraphMat.opacity = 0;
        novaSphere.visible = false;
        novaSphereMat.opacity = 0;
        return;
      }
      novaTelegraphRing.visible = true;
      const sc = Math.max(0.5, radius * (0.32 + progress * 0.68));
      novaTelegraphRing.scale.set(sc, sc, 1);
      novaTelegraphMat.opacity = 0.24 + progress * 0.62;

      novaSphere.visible = true;
      const sSc = 0.65 + progress * 1.45;
      novaSphere.scale.setScalar(sSc);
      novaSphereMat.opacity = 0.16 + progress * 0.38;
    },

    setMortarOrbCharge(charge: number) {
      mortarOrbCharge = Math.max(0, Math.min(1.5, charge));
    },

    triggerWingRecoil() {
      wingRecoil = 1.0;
    },

    updateAnimation(input: EnemyAnimationInput) {
      const {
        dt,
        elapsed,
        behavior,
        aimPitch,
        attackProgress,
        flinchTimer,
        staggerTimer,
        deadProgress,
        weakpointExposed,
        weakpointBroken,
      } = input;

      if (deadProgress > 0) {
        spireHead.position.y = Math.max(0.58, 1.66 - deadProgress * 1.12);
        spireHead.rotation.z = deadProgress * 1.25;
        spireHead.rotation.x = deadProgress * 0.45;
        laserCoreMesh.visible = false;
        laserHaloMesh.visible = false;
        muzzleFocusRing.visible = false;
        refractionShieldGroup.visible = false;
        novaTelegraphRing.visible = false;
        novaSphere.visible = false;
        mortarOrb.visible = false;
        levConduit.visible = false;
        return;
      }

      const dampFast = 1 - Math.exp(-12.5 * dt);
      const dampMed = 1 - Math.exp(-7.5 * dt);
      const isStaggered = staggerTimer > 0;
      const isCharging = behavior === 'windup' || behavior === 'attack';

      wingRecoil = Math.max(0, wingRecoil - dt * 4.5);

      // Spire hover & aim pitch
      const targetHoverY = isStaggered ? 1.18 : 1.66 + Math.sin(elapsed * 2.3) * 0.085;
      spireHead.position.y += (targetHoverY - spireHead.position.y) * dampMed;

      let tgtPitch = THREE.MathUtils.clamp(aimPitch, -0.72, 0.58);
      if (isStaggered) {
        tgtPitch = 0.38 + Math.sin(elapsed * 15) * 0.14;
      } else if (apertureMode === 'bloom_mortar') {
        tgtPitch = -0.46;
      }
      curPitch += (tgtPitch - curPitch) * dampFast;
      spireHead.rotation.x = curPitch;
      spireHead.rotation.z = isStaggered
        ? Math.cos(elapsed * 13) * 0.24
        : flinchTimer > 0
          ? Math.sin(flinchTimer * 28) * 0.12
          : 0;

      // Levitation gravity conduit pulse
      levConduit.visible = !isStaggered;
      conduitMat.opacity = isStaggered
        ? 0.08
        : 0.32 + Math.sin(elapsed * 6.5) * 0.1 + (isCharging ? 0.18 : 0);
      levHaloRing.position.y = 0.62 + ((elapsed * 0.75) % 0.68);
      levHaloRing.rotation.z = elapsed * 2.2;
      const haloSc = 1.0 - ((elapsed * 0.75) % 0.68) * 0.45;
      levHaloRing.scale.setScalar(haloSc);

      // Mechanical Mirror-Lens Wing Aperture Choreography across all 5 formations!
      let tgtRadial = 0.58;
      let tgtTilt = 0.08;
      let tgtFrontSplay = 0.0;

      if (isStaggered) {
        tgtRadial = 0.88;
        tgtTilt = -0.52;
        tgtFrontSplay = 0.35;
      } else if (apertureMode === 'rail_barrel') {
        // Front twin wings swing forward into a focused optical accelerator rail-barrel!
        tgtRadial = 0.54 + attackProgress * 0.16;
        tgtTilt = -0.14 - attackProgress * 0.2;
        tgtFrontSplay = -0.26; // pinches front wings toward -Z rail channel
      } else if (apertureMode === 'sweep_fan') {
        // Wide dramatic horizontal solar-cutter wings flaring wide open!
        tgtRadial = 0.82 + (laserFiring ? 0.08 : 0);
        tgtTilt = -0.34;
        tgtFrontSplay = 0.46;
      } else if (apertureMode === 'bloom_mortar') {
        // Upward solar chalice bloom exposing the core & crown mortar orb!
        tgtRadial = 0.86;
        tgtTilt = -0.62;
        tgtFrontSplay = 0.15;
      } else if (apertureMode === 'refraction_shield') {
        // Wings clamp forward framing the deployed Tri-Prism Refraction Shield Wall!
        tgtRadial = 0.72;
        tgtTilt = 0.16;
        tgtFrontSplay = -0.36;
      } else {
        tgtRadial = 0.58 + Math.sin(elapsed * 2.1) * 0.025;
        tgtTilt = 0.06 + Math.sin(elapsed * 2.1) * 0.03;
      }

      curWingRadial += (tgtRadial - curWingRadial) * dampFast;
      curWingTilt += (tgtTilt - curWingTilt) * dampFast;
      curFrontSplay += (tgtFrontSplay - curFrontSplay) * dampFast;

      for (let i = 0; i < wings.length; i++) {
        const w = wings[i];
        const recoilPush = wingRecoil * 0.14;
        w.wingBody.position.z = curWingRadial + recoilPush;
        w.wingBody.rotation.x = curWingTilt - recoilPush * 0.9;
        // Front-right (i=1) & Front-left (i=2) splay symmetrically around the front optical aperture!
        const splaySign = i === 1 ? -1 : i === 2 ? 1 : 0;
        w.azimuthPivot.rotation.y = w.baseAzimuth + splaySign * curFrontSplay;
      }

      // Mirror Fresnel reflector & Refractive Prism Core emissive surge!
      const coreSpin = isStaggered ? 0.7 : laserFiring ? 13.5 : isCharging ? 8.2 : 2.3;
      prismCore.rotation.y += dt * coreSpin;
      prismCage.rotation.y -= dt * (coreSpin * 0.72);
      prismCage.rotation.x = Math.sin(elapsed * 1.8) * 0.25;
      prismStar.rotation.y = -elapsed * 5.2;

      const corePulse = weakpointBroken
        ? 0.76
        : 1.0 + Math.sin(elapsed * (weakpointExposed || isCharging ? 14 : 4.2)) * 0.08 + laserChargeVal * 0.16;
      prismCore.scale.set(0.88 * corePulse, 1.56 * corePulse, 0.88 * corePulse);

      prismCage.visible = !weakpointBroken;
      prismStar.visible = !weakpointBroken;
      orbitRing.visible = !weakpointBroken;
      orbitRing.rotation.y += dt * (isCharging ? 6.8 : 2.4);
      orbitRing.rotation.x = 0.36 + Math.sin(elapsed * 1.6) * 0.16;
      for (let i = 0; i < orbitLenses.length; i++) {
        orbitLenses[i].rotation.y = elapsed * 4.2 + i;
      }

      mirrorLensMat.emissiveIntensity = isStaggered
        ? 0.25
        : laserFiring
          ? 3.8
          : 1.15 + laserChargeVal * 2.2 + (shieldActive ? 1.1 : 0);

      // Counter-rotating dual Observatory Brass Astrolabe Gyro-Rings
      const gyroMul = isStaggered ? 0.2 : laserFiring ? 4.8 : isCharging ? 2.8 : 1.0;
      innerGyro.rotation.x = Math.PI * 0.5 + Math.sin(elapsed * 1.3) * 0.35;
      innerGyro.rotation.z += dt * 1.65 * gyroMul;
      outerGyro.rotation.y += dt * 1.1 * gyroMul;
      outerGyro.rotation.x = 0.55 + Math.cos(elapsed * 1.1) * 0.22;

      crownNeedleGroup.position.y = 0.94 + Math.sin(elapsed * 3.1) * 0.06 + (isCharging ? 0.08 : 0);
      crownNeedleGroup.rotation.y = -elapsed * (isCharging ? 3.5 : 1.1);

      // Muzzle focus aperture ring rotation
      if (muzzleFocusRing.visible) {
        muzzleFocusRing.rotation.z = elapsed * (laserFiring ? 10.5 : 4.5);
      }

      // Cover-flush mortar charge orb
      if (mortarOrbCharge > 0.05 && !isStaggered) {
        mortarOrb.visible = true;
        const sc = 0.5 + mortarOrbCharge * 0.95;
        mortarOrb.scale.setScalar(sc);
        mortarOrb.rotation.y = elapsed * 6.0;
        mortarOrbMat.opacity = Math.min(0.95, mortarOrbCharge * 0.9);
      } else {
        mortarOrb.visible = false;
      }

      // Expandable Forward-Facing Hexagonal Tri-Prism Refraction Shield Wall
      const tgtShield = shieldActive && !isStaggered ? 1.0 : 0.01;
      curShieldScale += (tgtShield - curShieldScale) * dampFast;
      if (curShieldScale > 0.05) {
        refractionShieldGroup.visible = true;
        refractionShieldGroup.scale.setScalar(curShieldScale);
        shieldInnerRim.rotation.z = -elapsed * 1.8;
        shieldOuterRim.rotation.z = elapsed * 0.55;
        shieldWallMat.opacity =
          (0.42 + Math.sin(elapsed * 11) * 0.06) * curShieldScale * shieldIntensity;
        shieldRimMat.opacity = 0.88 * curShieldScale * shieldIntensity;
      } else {
        refractionShieldGroup.visible = false;
      }

      if (!laserActive) {
        laserCoreMesh.visible = false;
        laserHaloMesh.visible = false;
        muzzleFocusRing.visible = false;
      }
    },

    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      if (ownsTextures) tex.dispose();
    },
  };
}
