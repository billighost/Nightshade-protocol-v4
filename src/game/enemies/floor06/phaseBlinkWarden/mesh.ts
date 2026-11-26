import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../core/sculptUtils';
import type { EnemyAnimationInput, EnemyHitZone, EnemyRigHandle } from '../../core/types';
import type { Floor06EnemyMaterials } from '../materials';
import {
  createPhaseBlinkWardenTextures,
  type PhaseBlinkWardenTextureSuite,
} from './textures';

export interface WardenVisualState {
  /** 0 = compact glowing gauntlet emitter stub, 1 = full 1.12m blazing Phase Mantis Blades */
  bladeExtend?: number;
  /** 0..1 intensity of spinning hexagonal dimensional rift rings & phase-echo halo */
  riftIntensity?: number;
  /** 0..1 body phase-shift translucency pulse during active spatial blink */
  phaseFade?: number;
  /** 0..1 wrist Phase-Arc rail caster overcharge glow */
  casterCharge?: number;
  /** 0..1 chest Phase-Anchor Gyro alert acceleration */
  gyroAlert?: number;
  /** Which hand fired last (-1 = left, 1 = right) for crisp akimbo wrist recoil */
  recoilSide?: -1 | 0 | 1;
}

export interface PhaseBlinkWardenRigHandle extends EnemyRigHandle {
  getLeftMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getRightMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getBladeTipWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  setWardenVisualState: (patch: WardenVisualState) => void;
  triggerCasterRecoil: (side: -1 | 1) => void;
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
 * Helper to build a sleek curved crescent Mantis Blade ExtrudeGeometry.
 * Local frame: hilt root at y = 0, blade curves forward (-Z) and sweeps to a razor point at z = -1.08m.
 */
function createMantisBladeGeometry(length = 1.06, width = 0.13, thickness = 0.014): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -width * 0.38);
  shape.quadraticCurveTo(length * 0.32, -width * 0.68, length * 0.72, -width * 0.34);
  shape.quadraticCurveTo(length * 0.92, -width * 0.14, length, 0.02);
  shape.quadraticCurveTo(length * 0.78, width * 0.36, length * 0.36, width * 0.28);
  shape.lineTo(0, width * 0.18);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.48,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.translate(0, 0, -thickness * 0.5);
  // Orient so blade runs forward along -Z and height/edge sits in Y-Z plane
  geo.rotateY(Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted sleek swept crescent inquisitor shoulder pauldron (layered slim predatory blade).
 */
function createSweptPauldronGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.04, -0.09);
  s.lineTo(0.1, -0.05);
  s.quadraticCurveTo(0.21, 0.04, 0.23, 0.21);
  s.lineTo(0.15, 0.29);
  s.quadraticCurveTo(0.02, 0.16, -0.05, 0.06);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.translate(0, 0, -0.045);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted split pectoral chest plate framing the exposed central PHASE-ANCHOR GYRO.
 */
function createSplitPectoralGeometry(side: -1 | 1): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const k = side;
  s.moveTo(k * 0.14, 0.02);
  s.lineTo(k * 0.31, 0.06);
  s.lineTo(k * 0.35, 0.26);
  s.lineTo(k * 0.24, 0.34);
  s.lineTo(k * 0.11, 0.29);
  s.quadraticCurveTo(k * 0.17, 0.16, k * 0.14, 0.02);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.095,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.0475);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the AAA sculpted Floor 06 Enemy #4: PHASE-BLINK WARDEN
 * ("Abyssal Dimensional Assassin · Spatial-Rift Inquisitor").
 *
 * Key silhouette & craft pillars:
 * - Zero primitive box limbs: sculpted lofted anatomy, beveled extruded carapace plates,
 *   curved cloth shroud/coattails, TubeGeometry ritual horns, and digitigrade talon legs flush at y=0.
 * - Unmistakable exposed spinning golden chest PHASE-ANCHOR GYRO weakpoint inside split sternum plates.
 * - Floating split brass Chronos Halo + 6 orbiting diamond phase-nodes behind nape/shoulders.
 * - Twin wrist Phase-Arc Rail Casters + retractable 1.12m blazing amethyst-magenta Mantis Blades.
 * - Built-in spinning hexagonal Spatial-Rift Teleport Rings & phase-echo aura.
 */
export function buildPhaseBlinkWardenRig(
  enemyId: string,
  mats: Floor06EnemyMaterials,
  sharedTextures?: PhaseBlinkWardenTextureSuite
): PhaseBlinkWardenRigHandle {
  const ownTextures = !sharedTextures;
  const tex = sharedTextures ?? createPhaseBlinkWardenTextures();
  const root = new THREE.Group();

  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const trackG = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeos.push(g);
    return g;
  };
  const trackM = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };

  // =========================================================================
  // PBR MATERIAL SUITE (varied roughness >= 0.25 & metalness contrast!)
  // =========================================================================
  const armorMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.obsidianPorcelainAlbedo,
      bumpMap: tex.obsidianPorcelainBump,
      bumpScale: 0.032,
      roughnessMap: tex.obsidianPorcelainRoughness,
      roughness: 0.44,
      metalness: 0.48,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
  );

  const undersuitMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0x161424,
      bumpMap: tex.obsidianPorcelainBump,
      bumpScale: 0.018,
      roughness: 0.84,
      metalness: 0.14,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
  );

  const brassMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.relicBrassAlbedo,
      bumpMap: tex.relicBrassBump,
      bumpScale: 0.022,
      roughness: 0.26,
      metalness: 0.84,
    })
  );

  const tungstenMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0x383e54,
      bumpMap: tex.relicBrassBump,
      bumpScale: 0.015,
      roughness: 0.34,
      metalness: 0.78,
    })
  );

  const shroudClothMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.shroudClothAlbedo,
      bumpMap: tex.shroudClothBump,
      bumpScale: 0.028,
      roughness: 0.86,
      metalness: 0.06,
      side: THREE.DoubleSide,
    })
  );

  // Incandescent solar-amber chest PHASE-ANCHOR GYRO weakpoint material
  const weakpointMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.8,
      roughness: 0.16,
      metalness: 0.18,
    })
  );

  const focalStarMat = trackM(
    new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.92,
    })
  );

  // Luminous amethyst-magenta ocular & phase-conduit energy
  const phaseEnergyMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xa855f7,
      emissiveIntensity: 2.4,
      roughness: 0.16,
      metalness: 0.12,
    })
  );

  // Blazing razor Mantis Blade core & translucent plasma sheath
  const bladeCoreMat = trackM(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.mantisBladeAlbedo,
      emissive: 0xe879f9,
      emissiveMap: tex.mantisBladeEmissive,
      emissiveIntensity: 2.35,
      roughness: 0.12,
      metalness: 0.2,
    })
  );

  const bladeAuraMat = trackM(
    new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const riftRingMat = trackM(
    new THREE.MeshBasicMaterial({
      map: tex.riftPortalMap,
      color: 0xf0abfc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const backPortalMat = trackM(
    new THREE.MeshBasicMaterial({
      map: tex.riftPortalMap,
      color: 0xd946ef,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const phaseArcMat = trackM(
    new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  // =========================================================================
  // GROUNDED CONTACT SHADOW + SPATIAL-RIFT FLOOR & BACK PORTAL RINGS
  // =========================================================================
  const shadow = new THREE.Mesh(trackG(new THREE.PlaneGeometry(1.9, 1.9)), mats.shadowDisc);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.018;
  root.add(shadow);

  const groundRiftRing = new THREE.Mesh(trackG(new THREE.PlaneGeometry(2.55, 2.55)), riftRingMat);
  groundRiftRing.rotation.x = -Math.PI * 0.5;
  groundRiftRing.position.y = 0.045;
  groundRiftRing.visible = false;
  root.add(groundRiftRing);

  // Dimensional slipstream portal doorway behind the Warden's back (zero face occlusion!)
  const torsoRiftRing = new THREE.Mesh(trackG(new THREE.PlaneGeometry(1.85, 1.85)), backPortalMat);
  torsoRiftRing.position.set(0, 1.32, 0.34);
  torsoRiftRing.visible = false;
  root.add(torsoRiftRing);

  // =========================================================================
  // PELVIS, CEREMONIAL FAULD & FLOWING SPLIT COATTAILS (y = 1.06m)
  // =========================================================================
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.06, 0);
  root.add(pelvis);

  const pelvisCore = new THREE.Mesh(
    trackG(
      createLoftedAnatomy(
        [
          { y: -0.1, rx: 0.16, rz: 0.13, squareness: 2.3 },
          { y: 0.0, rx: 0.21, rz: 0.16, squareness: 2.4, pinchFront: 0.018 },
          { y: 0.11, rx: 0.19, rz: 0.15, squareness: 2.3 },
        ],
        18
      )
    ),
    undersuitMat
  );
  pelvisCore.castShadow = true;
  pelvis.add(pelvisCore);

  // Beveled brass ceremonial belt & obsidian hip tassets
  const beltRing = new THREE.Mesh(
    trackG(
      createCurvedPanelGeometry(
        [
          { y: 0.02, rx: 0.22, rz: 0.172, thickness: 0.024 },
          { y: 0.095, rx: 0.215, rz: 0.168, thickness: 0.024 },
        ],
        0,
        Math.PI * 2,
        24
      )
    ),
    brassMat
  );
  pelvis.add(beltRing);

  const beltBuckle = new THREE.Mesh(
    trackG(createBeveledBox(0.11, 0.11, 0.045, 0.012)),
    brassMat
  );
  beltBuckle.position.set(0, 0.05, -0.185);
  beltBuckle.rotation.z = Math.PI * 0.25;
  pelvis.add(beltBuckle);

  const buckleGem = new THREE.Mesh(trackG(new THREE.OctahedronGeometry(0.036, 0)), phaseEnergyMat);
  buckleGem.position.set(0, 0.05, -0.212);
  pelvis.add(buckleGem);

  // Front ceremonial loin-sash (slices ordered bottom-to-top so gold embroidered hem UVs map crisply!)
  const frontSashPivot = new THREE.Group();
  frontSashPivot.position.set(0, 0.02, -0.178);
  pelvis.add(frontSashPivot);
  const frontSashGeo = trackG(
    createCurvedPanelGeometry(
      [
        { y: -0.58, rx: 0.088, rz: 0.042, thickness: 0.01, offsetZ: -0.045, creaseAmp: 0.01 },
        { y: -0.28, rx: 0.112, rz: 0.046, thickness: 0.012, offsetZ: -0.024, creaseAmp: 0.007 },
        { y: 0.0, rx: 0.122, rz: 0.042, thickness: 0.014, offsetZ: 0.0 },
      ],
      -Math.PI * 0.86,
      -Math.PI * 0.14,
      14
    )
  );
  const frontSash = new THREE.Mesh(frontSashGeo, shroudClothMat);
  frontSash.castShadow = true;
  frontSashPivot.add(frontSash);

  // Flowing twin split rear coattails (slices bottom-to-top for crisp gold embroidered border & violet fade!)
  const buildCoatTail = (side: -1 | 1) => {
    const tailPivot = new THREE.Group();
    tailPivot.position.set(side * 0.1, 0.04, 0.14);
    pelvis.add(tailPivot);

    const aStart = side < 0 ? Math.PI * 0.55 : Math.PI * 0.09;
    const aEnd = side < 0 ? Math.PI * 0.91 : Math.PI * 0.45;
    const geo = trackG(
      createCurvedPanelGeometry(
        [
          { y: -0.78, rx: 0.31, rz: 0.21, thickness: 0.011, offsetZ: 0.025, creaseAmp: 0.016 },
          { y: -0.36, rx: 0.255, rz: 0.165, thickness: 0.013, offsetZ: -0.04, creaseAmp: 0.01 },
          { y: 0.0, rx: 0.205, rz: 0.12, thickness: 0.014, offsetZ: -0.088 },
        ],
        aStart,
        aEnd,
        16
      )
    );
    const mesh = new THREE.Mesh(geo, shroudClothMat);
    mesh.castShadow = true;
    tailPivot.add(mesh);

    // Sleek armored obsidian hip tasset guard over outer thigh
    const tasset = new THREE.Mesh(
      trackG(createBeveledBox(0.048, 0.3, 0.2, 0.012)),
      armorMat
    );
    tasset.position.set(side * 0.142, -0.14, -0.105);
    tasset.rotation.z = side * 0.18;
    tasset.castShadow = true;
    tailPivot.add(tasset);

    return tailPivot;
  };
  const coatTailL = buildCoatTail(-1);
  const coatTailR = buildCoatTail(1);

  // =========================================================================
  // DIGITIGRADE REVERSE-JOINTED PREDATOR LEGS (flush talons at root y = 0!)
  // =========================================================================
  const buildDigitigradeLeg = (side: -1 | 1) => {
    // Hip pivot at world y = 1.01m
    const hip = new THREE.Group();
    hip.position.set(side * 0.165, -0.05, 0);
    pelvis.add(hip);

    const hipJoint = new THREE.Mesh(trackG(new THREE.SphereGeometry(0.075, 12, 10)), tungstenMat);
    hip.add(hipJoint);

    // Forward-angled sculpted armored thigh (ends at knee (0, -0.40, -0.10))
    const thigh = new THREE.Mesh(
      trackG(
        createLoftedAnatomy(
          [
            { y: 0.0, rx: 0.088, rz: 0.095, squareness: 2.3 },
            { y: -0.16, rx: 0.098, rz: 0.112, offsetZ: -0.04, squareness: 2.5, pinchFront: 0.022 },
            { y: -0.34, rx: 0.074, rz: 0.085, offsetZ: -0.085, squareness: 2.4 },
            { y: -0.41, rx: 0.062, rz: 0.072, offsetZ: -0.1, squareness: 2.2 },
          ],
          14
        )
      ),
      armorMat
    );
    thigh.castShadow = true;
    hip.add(thigh);

    // Gilded outer thigh speed-vane
    const thighVane = new THREE.Mesh(
      trackG(createBeveledBox(0.028, 0.26, 0.09, 0.008)),
      brassMat
    );
    thighVane.position.set(side * 0.092, -0.18, -0.045);
    thighVane.rotation.x = 0.24;
    hip.add(thighVane);

    // Knee pivot at world y = 0.61m
    const knee = new THREE.Group();
    knee.position.set(0, -0.4, -0.1);
    hip.add(knee);

    const kneeAxle = new THREE.Mesh(
      trackG(new THREE.CylinderGeometry(0.05, 0.05, 0.145, 12)),
      tungstenMat
    );
    kneeAxle.rotation.z = Math.PI * 0.5;
    knee.add(kneeAxle);

    // Razor forward brass knee-blade guard
    const kneeGuard = new THREE.Mesh(
      trackG(createBeveledBox(0.092, 0.16, 0.062, 0.014)),
      brassMat
    );
    kneeGuard.position.set(0, 0.03, -0.078);
    kneeGuard.rotation.x = -0.22;
    knee.add(kneeGuard);

    // Reverse-swept digitigrade shin (runs from (0,0,0) down-and-back to hock (0, -0.38, +0.12))
    const shin = new THREE.Mesh(
      trackG(
        createLoftedAnatomy(
          [
            { y: 0.0, rx: 0.062, rz: 0.072, squareness: 2.3 },
            { y: -0.14, rx: 0.068, rz: 0.088, offsetZ: 0.048, squareness: 2.5, pinchFront: 0.025 },
            { y: -0.3, rx: 0.048, rz: 0.062, offsetZ: 0.098, squareness: 2.3 },
            { y: -0.38, rx: 0.044, rz: 0.054, offsetZ: 0.12, squareness: 2.2 },
          ],
          14
        )
      ),
      armorMat
    );
    shin.castShadow = true;
    knee.add(shin);

    // Exposed rear phase-hydraulic shin piston strut
    const pistonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.04, 0.075),
      new THREE.Vector3(0, -0.2, 0.135),
      new THREE.Vector3(0, -0.37, 0.175),
    ]);
    const pistonMesh = new THREE.Mesh(
      trackG(new THREE.TubeGeometry(pistonCurve, 10, 0.016, 8, false)),
      tungstenMat
    );
    knee.add(pistonMesh);

    // Glowing shin phase-conduit sliver
    const shinConduit = new THREE.Mesh(
      trackG(createBeveledBox(0.022, 0.2, 0.022, 0.005)),
      phaseEnergyMat
    );
    shinConduit.position.set(side * 0.064, -0.17, 0.052);
    shinConduit.rotation.x = -0.3;
    knee.add(shinConduit);

    // Elevated Hock / Ankle pivot at world y = 0.23m
    const ankle = new THREE.Group();
    ankle.position.set(0, -0.38, 0.12);
    knee.add(ankle);

    const hockHub = new THREE.Mesh(
      trackG(new THREE.CylinderGeometry(0.042, 0.042, 0.115, 10)),
      brassMat
    );
    hockHub.rotation.z = Math.PI * 0.5;
    ankle.add(hockHub);

    // Sloping tarsus bridge from hock (0, 0, 0) down-and-forward to talon base (0, -0.19, -0.11)
    const tarsus = new THREE.Mesh(
      trackG(
        createLoftedAnatomy(
          [
            { y: 0.0, rx: 0.044, rz: 0.052, squareness: 2.3 },
            { y: -0.1, rx: 0.05, rz: 0.058, offsetZ: -0.055, squareness: 2.4 },
            { y: -0.19, rx: 0.058, rz: 0.075, offsetZ: -0.105, squareness: 2.5 },
          ],
          12
        )
      ),
      tungstenMat
    );
    ankle.add(tarsus);

    // Split Twin-Toed Predatory Obsidian & Brass Talons sitting flush at ankle y = -0.23m (world y = 0.00!)
    for (const toeSide of [-1, 1] as const) {
      const toe = new THREE.Mesh(
        trackG(createBeveledBox(0.052, 0.055, 0.21, 0.01)),
        armorMat
      );
      toe.position.set(toeSide * 0.046, -0.202, -0.165);
      toe.rotation.y = toeSide * -0.12;
      toe.castShadow = true;
      ankle.add(toe);

      const clawTip = new THREE.Mesh(
        trackG(new THREE.ConeGeometry(0.026, 0.085, 4)),
        brassMat
      );
      clawTip.rotation.x = -Math.PI * 0.5;
      clawTip.position.set(toeSide * 0.052, -0.21, -0.295);
      ankle.add(clawTip);
    }

    // Rear stabilizer heel spur resting flush at ankle y = -0.23m (world y = 0.00!)
    const heelSpur = new THREE.Mesh(
      trackG(createBeveledBox(0.058, 0.055, 0.145, 0.01)),
      brassMat
    );
    heelSpur.position.set(0, -0.202, -0.005);
    ankle.add(heelSpur);

    return { hip, knee, ankle };
  };

  const legL = buildDigitigradeLeg(-1);
  const legR = buildDigitigradeLeg(1);

  // =========================================================================
  // SCULPTED INQUISITOR TORSO, SPLIT CHEST & PHASE-ANCHOR GYRO WEAKPOINT
  // =========================================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0); // World y = 1.18m
  pelvis.add(torso);

  // Sculpted tapered synth-muscle & obsidian inner torso
  const torsoCore = new THREE.Mesh(
    trackG(
      createLoftedAnatomy(
        [
          { y: -0.02, rx: 0.17, rz: 0.135, squareness: 2.3 },
          { y: 0.14, rx: 0.215, rz: 0.155, squareness: 2.4 },
          { y: 0.36, rx: 0.305, rz: 0.185, squareness: 2.55, backScale: 1.08 },
          { y: 0.58, rx: 0.335, rz: 0.18, squareness: 2.6, backScale: 1.04 },
          { y: 0.68, rx: 0.175, rz: 0.135, squareness: 2.2 },
        ],
        20
      )
    ),
    undersuitMat
  );
  torsoCore.castShadow = true;
  torso.add(torsoCore);

  // Split sculpted left/right obsidian pectoral plates framing the chest gyro aperture
  const pecL = new THREE.Mesh(trackG(createSplitPectoralGeometry(-1)), armorMat);
  pecL.position.set(0, 0.22, -0.155);
  pecL.castShadow = true;
  torso.add(pecL);

  const pecR = new THREE.Mesh(trackG(createSplitPectoralGeometry(1)), armorMat);
  pecR.position.set(0, 0.22, -0.155);
  pecR.castShadow = true;
  torso.add(pecR);

  // Sculpted abdominal rib plates below chest cavity
  for (let i = 0; i < 3; i++) {
    const ab = new THREE.Mesh(
      trackG(createBeveledBox(0.24 - i * 0.022, 0.068, 0.065, 0.01)),
      armorMat
    );
    ab.position.set(0, 0.19 - i * 0.072, -0.155 + i * 0.01);
    ab.rotation.x = 0.08;
    torso.add(ab);
  }

  // High ceremonial cathedral gorget collar framing the head
  const gorget = new THREE.Mesh(
    trackG(
      createCurvedPanelGeometry(
        [
          { y: 0.58, rx: 0.21, rz: 0.18, thickness: 0.028 },
          { y: 0.74, rx: 0.245, rz: 0.21, thickness: 0.024 },
        ],
        -Math.PI * 0.18,
        Math.PI * 1.18,
        18
      )
    ),
    armorMat
  );
  torso.add(gorget);

  const gorgetTrim = new THREE.Mesh(
    trackG(
      createCurvedPanelGeometry(
        [
          { y: 0.735, rx: 0.246, rz: 0.212, thickness: 0.016 },
          { y: 0.768, rx: 0.252, rz: 0.218, thickness: 0.016 },
        ],
        -Math.PI * 0.18,
        Math.PI * 1.18,
        18
      )
    ),
    brassMat
  );
  torso.add(gorgetTrim);

  // Dorsal spine keel (5 articulated chevron obsidian vertebrae + glowing violet phase nodes)
  for (let i = 0; i < 5; i++) {
    const vertY = 0.1 + i * 0.115;
    const vertZ = 0.165 + Math.sin((i / 4) * Math.PI) * 0.045;
    const spinePlate = new THREE.Mesh(
      trackG(createBeveledBox(0.14 + (i === 3 ? 0.04 : 0), 0.082, 0.08, 0.014)),
      armorMat
    );
    spinePlate.position.set(0, vertY, vertZ);
    spinePlate.rotation.x = -0.18;
    spinePlate.castShadow = true;
    torso.add(spinePlate);

    const spineNode = new THREE.Mesh(
      trackG(new THREE.OctahedronGeometry(0.028, 0)),
      phaseEnergyMat
    );
    spineNode.position.set(0, vertY + 0.048, vertZ + 0.036);
    torso.add(spineNode);
  }

  // Twin dorsal phase-capacitor shoulder fins (swept back on scapula for menacing rear silhouette)
  for (const side of [-1, 1] as const) {
    const fin = new THREE.Mesh(
      trackG(createBeveledBox(0.048, 0.34, 0.13, 0.01)),
      armorMat
    );
    fin.position.set(side * 0.21, 0.56, 0.19);
    fin.rotation.set(-0.34, side * 0.28, side * -0.24);
    fin.castShadow = true;
    torso.add(fin);

    const finGlow = new THREE.Mesh(
      trackG(createBeveledBox(0.018, 0.22, 0.028, 0.004)),
      phaseEnergyMat
    );
    finGlow.position.set(side * 0.215, 0.56, 0.258);
    finGlow.rotation.set(-0.34, side * 0.28, side * -0.24);
    torso.add(finGlow);
  }

  // =========================================================================
  // EXPOSED CHEST `PHASE-ANCHOR GYRO` WEAKPOINT (Center Chest Cavity!)
  // =========================================================================
  const gyroAssembly = new THREE.Group();
  gyroAssembly.position.set(0, 0.39, -0.185);
  torso.add(gyroAssembly);

  const gyroHousingBezel = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.188, 0.024, 10, 12)),
    tungstenMat
  );
  gyroAssembly.add(gyroHousingBezel);

  const gyroOuterRing = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.165, 0.02, 8, 6)),
    brassMat
  );
  gyroAssembly.add(gyroOuterRing);

  const gyroInnerRing = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.125, 0.016, 8, 8)),
    brassMat
  );
  gyroAssembly.add(gyroInnerRing);

  const gyroCore = new THREE.Mesh(
    trackG(new THREE.OctahedronGeometry(0.105, 0)),
    weakpointMat
  );
  gyroAssembly.add(gyroCore);

  const gyroStar = new THREE.Mesh(
    trackG(new THREE.OctahedronGeometry(0.056, 0)),
    focalStarMat
  );
  gyroAssembly.add(gyroStar);

  // =========================================================================
  // FLOATING SPLIT GEOMETRIC CHRONOS HALO + 6 ORBITING DIAMOND PHASE NODES
  // =========================================================================
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 0.84, 0.2);
  haloGroup.rotation.x = 0.36;
  torso.add(haloGroup);

  const haloArcL = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.5, 0.026, 8, 20, Math.PI * 0.72)),
    brassMat
  );
  haloArcL.rotation.z = Math.PI * 0.64;
  haloGroup.add(haloArcL);

  const haloArcR = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.5, 0.026, 8, 20, Math.PI * 0.72)),
    brassMat
  );
  haloArcR.rotation.z = -Math.PI * 0.36;
  haloGroup.add(haloArcR);

  const haloInnerRing = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.39, 0.012, 8, 24)),
    phaseEnergyMat
  );
  haloGroup.add(haloInnerRing);

  const haloOrbitGroup = new THREE.Group();
  haloGroup.add(haloOrbitGroup);
  const haloNodes: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const node = new THREE.Mesh(
      trackG(new THREE.OctahedronGeometry(0.048, 0)),
      i % 2 === 0 ? armorMat : phaseEnergyMat
    );
    node.scale.set(0.75, 1.5, 0.75);
    node.position.set(Math.cos(ang) * 0.56, Math.sin(ang) * 0.56, 0);
    node.rotation.z = ang + Math.PI * 0.5;
    haloOrbitGroup.add(node);
    haloNodes.push(node);
  }

  // =========================================================================
  // TERRIFYING FACETED INQUISITOR HELM + 3 VERTICAL SLIT EYES + RITUAL HORNS
  // =========================================================================
  const head = new THREE.Group();
  head.position.set(0, 0.73, -0.015); // World y = 1.91m
  torso.add(head);

  const neckCol = new THREE.Mesh(
    trackG(new THREE.CylinderGeometry(0.072, 0.09, 0.12, 12)),
    undersuitMat
  );
  neckCol.position.y = 0.02;
  head.add(neckCol);

  // Elongated angular obsidian executioner faceplate
  const skull = new THREE.Mesh(
    trackG(
      createLoftedAnatomy(
        [
          { y: 0.03, rx: 0.068, rz: 0.085, pinchFront: 0.052, squareness: 2.3 },
          { y: 0.14, rx: 0.128, rz: 0.148, pinchFront: 0.042, squareness: 2.5 },
          { y: 0.25, rx: 0.138, rz: 0.162, pinchFront: 0.028, squareness: 2.4 },
          { y: 0.35, rx: 0.095, rz: 0.128, offsetZ: 0.02, squareness: 2.2 },
          { y: 0.43, rx: 0.03, rz: 0.045, offsetZ: 0.045, squareness: 2.0 },
        ],
        16
      )
    ),
    armorMat
  );
  skull.castShadow = true;
  head.add(skull);

  // Brass vertical crown keel ridge bisecting the forehead
  const crownCrest = new THREE.Mesh(
    trackG(createBeveledBox(0.032, 0.28, 0.16, 0.008)),
    brassMat
  );
  crownCrest.position.set(0, 0.3, -0.02);
  crownCrest.rotation.x = -0.22;
  head.add(crownCrest);

  // Recessed obsidian visor well + 3 uncanny luminous amethyst-magenta vertical slit eyes!
  const visorRecess = new THREE.Mesh(
    trackG(createBeveledBox(0.18, 0.125, 0.045, 0.008)),
    undersuitMat
  );
  visorRecess.position.set(0, 0.185, -0.148);
  head.add(visorRecess);

  const centerSlit = new THREE.Mesh(
    trackG(createBeveledBox(0.02, 0.115, 0.022, 0.004)),
    phaseEnergyMat
  );
  centerSlit.position.set(0, 0.19, -0.172);
  head.add(centerSlit);

  for (const side of [-1, 1] as const) {
    const sideSlit = new THREE.Mesh(
      trackG(createBeveledBox(0.017, 0.072, 0.02, 0.004)),
      phaseEnergyMat
    );
    sideSlit.position.set(side * 0.052, 0.182, -0.166);
    sideSlit.rotation.z = side * 0.18;
    head.add(sideSlit);

    // Sweeping curved obsidian-and-brass ritual crown horns via TubeGeometry!
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.095, 0.24, -0.02),
      new THREE.Vector3(side * 0.185, 0.34, 0.06),
      new THREE.Vector3(side * 0.165, 0.48, 0.16),
      new THREE.Vector3(side * 0.115, 0.56, 0.23),
    ]);
    const horn = new THREE.Mesh(
      trackG(new THREE.TubeGeometry(hornCurve, 14, 0.024, 8, false)),
      brassMat
    );
    horn.castShadow = true;
    head.add(horn);
  }

  // =========================================================================
  // ARTICULATED ARMS + DUAL WRIST PHASE-ARC CASTERS + RETRACTABLE MANTIS BLADES
  // =========================================================================
  const buildInquisitorArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.36, 0.56, -0.01);
    torso.add(shoulder);

    const shoulderSphere = new THREE.Mesh(
      trackG(new THREE.SphereGeometry(0.078, 12, 10)),
      tungstenMat
    );
    shoulder.add(shoulderSphere);

    // Sleek layered crescent shoulder pauldron + secondary laminar guard hugging the deltoid
    const pauldron = new THREE.Mesh(trackG(createSweptPauldronGeometry()), armorMat);
    pauldron.scale.x = side;
    pauldron.position.set(side * 0.025, 0.015, 0);
    pauldron.rotation.set(0.08, side * -0.18, side * -0.16);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    const pauldronTrim = new THREE.Mesh(
      trackG(createBeveledBox(0.026, 0.22, 0.055, 0.006)),
      brassMat
    );
    pauldronTrim.position.set(side * 0.148, 0.125, -0.015);
    pauldronTrim.rotation.set(0.08, side * -0.18, side * -0.24);
    shoulder.add(pauldronTrim);

    const pauldronVent = new THREE.Mesh(
      trackG(createBeveledBox(0.014, 0.15, 0.018, 0.004)),
      phaseEnergyMat
    );
    pauldronVent.position.set(side * 0.12, 0.11, -0.052);
    pauldronVent.rotation.z = side * -0.22;
    shoulder.add(pauldronVent);

    // Sculpted upper bicep
    const bicep = new THREE.Mesh(
      trackG(
        createLoftedAnatomy(
          [
            { y: 0.0, rx: 0.064, rz: 0.07, squareness: 2.3 },
            { y: -0.16, rx: 0.062, rz: 0.066, squareness: 2.4 },
            { y: -0.32, rx: 0.05, rz: 0.054, squareness: 2.2 },
          ],
          12
        )
      ),
      undersuitMat
    );
    bicep.castShadow = true;
    shoulder.add(bicep);

    // Elbow articulation pivot (positive rotation.x bends forearm FORWARD toward -Z!)
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.32, 0);
    shoulder.add(elbow);

    const elbowServo = new THREE.Mesh(
      trackG(new THREE.CylinderGeometry(0.044, 0.044, 0.11, 10)),
      brassMat
    );
    elbowServo.rotation.z = Math.PI * 0.5;
    elbow.add(elbowServo);

    // Armored vambrace forearm extending along -Y (points forward -Z when elbow.rotation.x > 0)
    const forearm = new THREE.Mesh(
      trackG(
        createLoftedAnatomy(
          [
            { y: 0.0, rx: 0.054, rz: 0.06, squareness: 2.4 },
            { y: -0.16, rx: 0.066, rz: 0.074, squareness: 2.55 },
            { y: -0.33, rx: 0.054, rz: 0.062, squareness: 2.4 },
          ],
          14
        )
      ),
      armorMat
    );
    forearm.castShadow = true;
    elbow.add(forearm);

    // Wrist-mounted Twin-Prong Phase-Arc Rail Caster pointing down the forearm (-Y -> forward -Z!)
    const casterGroup = new THREE.Group();
    casterGroup.position.set(side * 0.036, -0.25, -0.045);
    casterGroup.rotation.x = Math.PI * 0.5;
    elbow.add(casterGroup);

    const railHousing = new THREE.Mesh(
      trackG(createBeveledBox(0.105, 0.1, 0.36, 0.014)),
      tungstenMat
    );
    railHousing.position.set(0, 0, -0.11);
    railHousing.castShadow = true;
    casterGroup.add(railHousing);

    for (const prongY of [-0.034, 0.034]) {
      const prong = new THREE.Mesh(
        trackG(createBeveledBox(0.03, 0.024, 0.28, 0.006)),
        brassMat
      );
      prong.position.set(side * 0.026, prongY, -0.32);
      casterGroup.add(prong);
    }

    const coilGlow = new THREE.Mesh(
      trackG(new THREE.CylinderGeometry(0.026, 0.032, 0.34, 10)),
      phaseEnergyMat
    );
    coilGlow.rotation.x = Math.PI * 0.5;
    coilGlow.position.set(0, 0, -0.23);
    casterGroup.add(coilGlow);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, -0.48);
    casterGroup.add(muzzle);

    // Retractable Hard-Light Phase Mantis Blade projecting cleanly from outer gauntlet emitter
    const bladeRoot = new THREE.Group();
    bladeRoot.position.set(side * 0.056, -0.015, -0.18);
    casterGroup.add(bladeRoot);

    const bladeGeo = trackG(createMantisBladeGeometry(1.06, 0.13, 0.013));
    const bladeCore = new THREE.Mesh(bladeGeo, bladeCoreMat);
    bladeRoot.add(bladeCore);

    const bladeAura = new THREE.Mesh(bladeGeo, bladeAuraMat);
    bladeAura.scale.set(1.5, 1.28, 1.05);
    bladeRoot.add(bladeAura);

    const bladeTip = new THREE.Object3D();
    bladeTip.position.set(0, 0, -1.04);
    bladeRoot.add(bladeTip);

    // Sculpted clawed hand grip
    const gauntletHand = new THREE.Mesh(
      trackG(createBeveledBox(0.068, 0.1, 0.078, 0.014)),
      tungstenMat
    );
    gauntletHand.position.set(0, -0.37, 0);
    elbow.add(gauntletHand);

    return { shoulder, elbow, casterGroup, coilGlow, muzzle, bladeRoot, bladeTip };
  };

  const armL = buildInquisitorArm(-1);
  const armR = buildInquisitorArm(1);

  // Two sleek oblique spinning dimensional phase-shift orbit arcs (clean AAA blink VFX, zero face clutter!)
  const phaseOrbitGroup = new THREE.Group();
  phaseOrbitGroup.position.set(0, 1.18, 0);
  phaseOrbitGroup.visible = false;
  root.add(phaseOrbitGroup);

  const phaseArcA = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.86, 0.014, 8, 36, Math.PI * 1.35)),
    phaseArcMat
  );
  phaseArcA.rotation.set(Math.PI * 0.36, 0.25, 0);
  phaseOrbitGroup.add(phaseArcA);

  const phaseArcB = new THREE.Mesh(
    trackG(new THREE.TorusGeometry(0.76, 0.012, 8, 36, Math.PI * 1.25)),
    phaseArcMat
  );
  phaseArcB.rotation.set(-Math.PI * 0.34, -0.3, Math.PI * 0.7);
  phaseOrbitGroup.add(phaseArcB);

  // =========================================================================
  // PRECISE RAYCAST HITBOXES (body, head, chest weakpoint)
  // =========================================================================
  const hitboxes: THREE.Mesh[] = [];
  const bodyHit = makeHitbox(
    trackG(new THREE.BoxGeometry(0.92, 1.42, 0.64)),
    mats.hitboxInvisible,
    enemyId,
    'body',
    [0, 0.34, 0]
  );
  const headHit = makeHitbox(
    trackG(new THREE.SphereGeometry(0.28, 8, 8)),
    mats.hitboxInvisible,
    enemyId,
    'head',
    [0, 0.22, -0.02]
  );
  const wpHit = makeHitbox(
    trackG(new THREE.SphereGeometry(0.27, 8, 8)),
    mats.hitboxInvisible,
    enemyId,
    'weakpoint',
    [0, 0.39, -0.2]
  );
  torso.add(bodyHit, wpHit);
  head.add(headHit);
  hitboxes.push(bodyHit, headHit, wpHit);

  // =========================================================================
  // LIVE ANIMATION & STATE INTERPOLATION
  // =========================================================================
  let walkPhase = 0;
  let currentBladeExtend = 0.18;
  let targetBladeExtend = 0.18;
  let targetRiftIntensity = 0;
  let currentRiftIntensity = 0;
  let targetPhaseFade = 0;
  let currentPhaseFade = 0;
  let targetCasterCharge = 0;
  let targetGyroAlert = 0;
  let recoilL = 0;
  let recoilR = 0;

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [armorMat, undersuitMat],
    getMuzzleWorldPos(out: THREE.Vector3) {
      return armR.muzzle.getWorldPosition(out);
    },
    getLeftMuzzleWorldPos(out: THREE.Vector3) {
      return armL.muzzle.getWorldPosition(out);
    },
    getRightMuzzleWorldPos(out: THREE.Vector3) {
      return armR.muzzle.getWorldPosition(out);
    },
    getBladeTipWorldPos(side: -1 | 1, out: THREE.Vector3) {
      return (side < 0 ? armL.bladeTip : armR.bladeTip).getWorldPosition(out);
    },
    getWeakpointWorldPos(out: THREE.Vector3) {
      return gyroCore.getWorldPosition(out);
    },
    setWardenVisualState(patch: WardenVisualState) {
      if (patch.bladeExtend !== undefined) targetBladeExtend = THREE.MathUtils.clamp(patch.bladeExtend, 0.12, 1.15);
      if (patch.riftIntensity !== undefined) targetRiftIntensity = THREE.MathUtils.clamp(patch.riftIntensity, 0, 1.3);
      if (patch.phaseFade !== undefined) targetPhaseFade = THREE.MathUtils.clamp(patch.phaseFade, 0, 1);
      if (patch.casterCharge !== undefined) targetCasterCharge = THREE.MathUtils.clamp(patch.casterCharge, 0, 1.5);
      if (patch.gyroAlert !== undefined) targetGyroAlert = THREE.MathUtils.clamp(patch.gyroAlert, 0, 1.5);
    },
    triggerCasterRecoil(side: -1 | 1) {
      if (side < 0) recoilL = 1.0;
      else recoilR = 1.0;
    },
    updateAnimation(input: EnemyAnimationInput) {
      const {
        dt,
        elapsed,
        behavior,
        speedRatio,
        localMoveX,
        attackProgress,
        attackVariant,
        flinchTimer,
        flinchDirX,
        staggerTimer,
        deadProgress,
        aimPitch,
        weakpointBroken,
      } = input;

      const damp = 1 - Math.exp(-12 * Math.max(0.001, dt));
      currentBladeExtend = THREE.MathUtils.lerp(currentBladeExtend, targetBladeExtend, damp);
      currentRiftIntensity = THREE.MathUtils.lerp(currentRiftIntensity, targetRiftIntensity, damp);
      currentPhaseFade = THREE.MathUtils.lerp(currentPhaseFade, targetPhaseFade, damp);
      recoilL = Math.max(0, recoilL - dt * 7.5);
      recoilR = Math.max(0, recoilR - dt * 7.5);

      // Update Mantis Blade extension scale cleanly
      armL.bladeRoot.scale.set(1, 1, currentBladeExtend);
      armR.bladeRoot.scale.set(1, 1, currentBladeExtend);
      bladeCoreMat.emissiveIntensity = 1.8 + currentBladeExtend * 1.45;
      bladeAuraMat.opacity = Math.max(0.08, (currentBladeExtend - 0.1) * 0.36);

      // Update Phase-Arc caster coils & ocular energy
      phaseEnergyMat.emissiveIntensity = 2.1 + targetCasterCharge * 1.6 + currentRiftIntensity * 0.8;

      // Update Spatial-Rift Floor & Back Portal Rings + Oblique Phase Orbit Arcs
      const riftVisible = currentRiftIntensity > 0.03;
      groundRiftRing.visible = riftVisible;
      torsoRiftRing.visible = riftVisible;
      if (riftVisible) {
        riftRingMat.opacity = Math.min(0.84, currentRiftIntensity * 0.74);
        backPortalMat.opacity = Math.min(0.42, currentRiftIntensity * 0.36);
        const s = 0.74 + currentRiftIntensity * 0.48;
        groundRiftRing.scale.set(s, s, 1);
        groundRiftRing.rotation.z = elapsed * 3.2;
        torsoRiftRing.scale.set(0.64 + currentRiftIntensity * 0.42, 0.64 + currentRiftIntensity * 0.42, 1);
        torsoRiftRing.rotation.z = -elapsed * 4.2;
      }

      const orbitVis = currentPhaseFade > 0.04 || currentRiftIntensity > 0.35;
      phaseOrbitGroup.visible = orbitVis;
      if (orbitVis) {
        phaseArcMat.opacity = Math.min(
          0.62,
          Math.max(currentPhaseFade * 0.58, (currentRiftIntensity - 0.3) * 0.48)
        );
        phaseOrbitGroup.rotation.y = elapsed * 4.6;
        phaseArcA.rotation.z = elapsed * 5.2;
        phaseArcB.rotation.z = -elapsed * 6.0;
      }

      // Death collapse
      if (deadProgress > 0) {
        groundRiftRing.visible = false;
        torsoRiftRing.visible = false;
        phaseOrbitGroup.visible = false;
        pelvis.position.y = Math.max(0.24, 1.06 - deadProgress * 0.82);
        pelvis.rotation.x = deadProgress * 1.48;
        torso.rotation.set(0.32 * deadProgress, 0, 0.14 * deadProgress);
        armL.shoulder.rotation.set(0.4, 0, 0.45);
        armR.shoulder.rotation.set(0.3, 0, -0.5);
        gyroCore.scale.setScalar(Math.max(0.1, 1 - deadProgress));
        return;
      }

      // Chest PHASE-ANCHOR GYRO animation (broken vs healthy overdrive)
      if (weakpointBroken) {
        gyroOuterRing.rotation.set(0.55 + Math.sin(elapsed * 19) * 0.18, elapsed * 1.4, -0.4);
        gyroInnerRing.rotation.set(-0.48, -elapsed * 1.1, 0.65 + Math.cos(elapsed * 23) * 0.16);
        gyroCore.rotation.set(elapsed * 0.8, elapsed * 1.2, 0);
        gyroCore.scale.setScalar(0.68 + Math.sin(elapsed * 28) * 0.08);
        gyroStar.visible = false;
        weakpointMat.emissiveIntensity = 0.25 + (Math.sin(elapsed * 24) > 0.55 ? 1.1 : 0);
      } else {
        const spinMult = 1 + targetGyroAlert * 3.4 + currentRiftIntensity * 2.5;
        gyroOuterRing.rotation.set(Math.sin(elapsed * 2.1) * 0.3, elapsed * 1.6 * spinMult, -elapsed * 2.6 * spinMult);
        gyroInnerRing.rotation.set(elapsed * 3.1 * spinMult, Math.cos(elapsed * 1.8) * 0.4, elapsed * 1.9 * spinMult);
        gyroCore.rotation.set(elapsed * 1.5 * spinMult, elapsed * 3.8 * spinMult, 0);
        const pulse = 1.0 + Math.sin(elapsed * 7.5) * 0.08 + targetGyroAlert * 0.18;
        gyroCore.scale.setScalar(pulse);
        gyroStar.visible = true;
        gyroStar.rotation.y = -elapsed * 6.0;
        weakpointMat.emissiveIntensity = 2.5 + targetGyroAlert * 1.5 + Math.sin(elapsed * 7.5) * 0.35;
      }

      // Floating Split Chronos Halo + 6 orbiting diamond phase-nodes
      const haloSpin = weakpointBroken ? 0.25 : 1.0 + targetGyroAlert * 3.0 + currentRiftIntensity * 2.4;
      haloGroup.position.y = 0.84 + Math.sin(elapsed * 2.8) * 0.025;
      haloGroup.rotation.z = Math.sin(elapsed * 1.2) * 0.12;
      haloOrbitGroup.rotation.z = elapsed * 1.45 * haloSpin;
      for (let i = 0; i < haloNodes.length; i++) {
        haloNodes[i].rotation.y = elapsed * (2.6 + i * 0.35) * haloSpin;
      }

      // Staggered / Gyro-Shattered punish animation (arms drop limp & forward!)
      if (staggerTimer > 0) {
        pelvis.position.y = 0.88;
        pelvis.rotation.set(0.14, 0, Math.sin(elapsed * 14) * 0.06);
        torso.rotation.set(0.42, Math.sin(elapsed * 15) * 0.18, Math.cos(elapsed * 11) * 0.08);
        head.rotation.set(0.32, Math.sin(elapsed * 12) * 0.22, 0);
        legL.hip.rotation.x = -0.35;
        legR.hip.rotation.x = -0.22;
        legL.knee.rotation.x = 0.52;
        legR.knee.rotation.x = 0.38;
        armL.shoulder.rotation.set(0.28, -0.2, 0.42);
        armR.shoulder.rotation.set(0.28, 0.2, -0.42);
        armL.elbow.rotation.x = 0.42;
        armR.elbow.rotation.x = 0.42;
        coatTailL.rotation.x = 0.25;
        coatTailR.rotation.x = 0.25;
        return;
      }

      // Digitigrade stalker stride & predatory crouch locomotion
      const clampedSpeed = Math.min(1.35, speedRatio);
      walkPhase += dt * (3.2 + clampedSpeed * 7.2);
      const stride = Math.min(1.0, clampedSpeed) * 0.56;
      const bounce = Math.abs(Math.sin(walkPhase)) * 0.055 * Math.min(1, clampedSpeed);

      pelvis.position.y = 1.06 + bounce - (behavior === 'windup' ? 0.09 : 0);
      pelvis.rotation.set(
        behavior === 'windup' ? 0.12 : 0.04 * clampedSpeed,
        0,
        THREE.MathUtils.clamp(-localMoveX * 0.12, -0.16, 0.16)
      );

      legL.hip.rotation.x = Math.sin(walkPhase) * stride;
      legR.hip.rotation.x = -Math.sin(walkPhase) * stride;
      legL.knee.rotation.x = Math.max(0, -Math.sin(walkPhase) * stride * 0.78) + (behavior === 'windup' ? 0.22 : 0);
      legR.knee.rotation.x = Math.max(0, Math.sin(walkPhase) * stride * 0.78) + (behavior === 'windup' ? 0.22 : 0);
      legL.ankle.rotation.x = -legL.hip.rotation.x * 0.35 - legL.knee.rotation.x * 0.45;
      legR.ankle.rotation.x = -legR.hip.rotation.x * 0.35 - legR.knee.rotation.x * 0.45;

      // Flowing cloth coattails react to movement speed & blink wind
      const tailLift = 0.08 + clampedSpeed * 0.28 + currentRiftIntensity * 0.34;
      coatTailL.rotation.x = tailLift + Math.sin(elapsed * 4.5) * 0.06;
      coatTailR.rotation.x = tailLift + Math.cos(elapsed * 4.5) * 0.06;
      frontSashPivot.rotation.x = -0.06 - clampedSpeed * 0.12;

      const pitch = THREE.MathUtils.clamp(aimPitch, -0.5, 0.5);
      const flinchYaw = flinchTimer > 0 ? flinchDirX * flinchTimer * 1.4 : 0;

      // NOTE: Right-handed Three.js rotation around +X for downward (-Y) limbs:
      // POSITIVE rotation.x swings limbs FORWARD toward -Z (toward the player!).
      if (behavior === 'windup' || behavior === 'attack') {
        if (attackVariant === 1) {
          // Coiled predatory Blink Charge: twin Mantis Blades swept low-and-wide ready to teleport-pounce!
          const coil = Math.sin(Math.min(1, attackProgress) * Math.PI * 0.5);
          torso.rotation.set(0.24 * coil, flinchYaw, 0);
          head.rotation.set(-0.18 * coil, 0, 0);
          armL.shoulder.rotation.set(-0.32 * coil, 0.28, -0.55 * coil);
          armR.shoulder.rotation.set(-0.32 * coil, -0.28, 0.55 * coil);
          armL.elbow.rotation.x = 0.92;
          armR.elbow.rotation.x = 0.92;
        } else if (attackVariant === 2) {
          // Ferocious Twin Mantis-Blade X-Cross Slash sweeping FORWARD!
          if (behavior === 'windup') {
            const w = Math.min(1, attackProgress);
            torso.rotation.set(0.18, -0.35 * w + flinchYaw, 0);
            head.rotation.set(-0.1, 0.25 * w, 0);
            // Cross gauntlets in front of chest ready to rip outward!
            armL.shoulder.rotation.set(0.75 * w, -0.55 * w, 0.28);
            armR.shoulder.rotation.set(0.82 * w, 0.55 * w, -0.28);
            armL.elbow.rotation.x = 1.25;
            armR.elbow.rotation.x = 1.25;
          } else {
            const s = Math.sin(Math.min(1, attackProgress) * Math.PI);
            const sweep = (attackProgress - 0.5) * 2.0;
            torso.rotation.set(0.26, sweep * 0.45 + flinchYaw, 0);
            head.rotation.set(-0.14, -sweep * 0.2, 0);
            // Explosive wide predatory scissor-rip forward & outward!
            armL.shoulder.rotation.set(1.15 - s * 0.25, 0.52 * s, -0.78 * s);
            armR.shoulder.rotation.set(1.15 - s * 0.25, -0.52 * s, 0.78 * s);
            armL.elbow.rotation.x = 0.48;
            armR.elbow.rotation.x = 0.48;
          }
        } else if (attackVariant === 3) {
          // Dimensional Rift Barrage: cruciform spread -> converge twin casters straight forward!
          if (behavior === 'windup') {
            const spread = Math.min(1, attackProgress);
            torso.rotation.set(-0.08 * spread, flinchYaw, 0);
            head.rotation.set(0.08 * spread, 0, 0);
            armL.shoulder.rotation.set(0.65 + pitch * 0.5, 0.48 * spread, -0.82 * spread);
            armR.shoulder.rotation.set(0.65 + pitch * 0.5, -0.48 * spread, 0.82 * spread);
            armL.elbow.rotation.x = 0.78;
            armR.elbow.rotation.x = 0.78;
          } else {
            const snap = Math.sin(Math.min(1, attackProgress) * Math.PI);
            torso.rotation.set(0.12 * snap, flinchYaw, 0);
            head.rotation.set(-0.06, 0, 0);
            armL.shoulder.rotation.set(1.05 + pitch + snap * 0.18, -0.26, -0.1);
            armR.shoulder.rotation.set(1.05 + pitch + snap * 0.18, 0.26, 0.1);
            armL.elbow.rotation.x = 0.56;
            armR.elbow.rotation.x = 0.56;
          }
        } else if (attackVariant === 4) {
          // Void-Anchor Snare arcing mortar lob (left arm sweeps high forward-overhead!)
          const lob = behavior === 'windup' ? 0.55 + attackProgress * 1.45 : 2.0 - attackProgress * 1.15;
          torso.rotation.set(-0.1, 0.25 + flinchYaw, 0);
          head.rotation.set(-0.18, -0.18, 0);
          armL.shoulder.rotation.set(lob, 0.15, -0.2);
          armL.elbow.rotation.x = 0.48;
          armR.shoulder.rotation.set(0.45, -0.15, 0.18);
          armR.elbow.rotation.x = 0.92;
        } else {
          // Variant 0: Alternating Akimbo Resonance Burst aiming BOTH wrist rail casters forward!
          torso.rotation.set(0.06, Math.sin(elapsed * 8) * 0.08 + flinchYaw, 0);
          head.rotation.set(pitch * 0.4, 0, 0);
          armL.shoulder.rotation.set(0.88 + pitch + recoilL * 0.24, -0.12, -0.16);
          armR.shoulder.rotation.set(0.88 + pitch + recoilR * 0.24, 0.12, 0.16);
          armL.elbow.rotation.x = 0.72 + recoilL * 0.18;
          armR.elbow.rotation.x = 0.72 + recoilR * 0.18;
        }
      } else {
        // Predatory agile stalking / ready stance (twin wrist casters & blades poised forward!)
        torso.rotation.set(0.08, Math.sin(elapsed * 2.1) * 0.07 + flinchYaw, 0);
        head.rotation.set(pitch * 0.35 - 0.04, Math.sin(elapsed * 1.5) * 0.08, 0);
        armL.shoulder.rotation.set(0.42 + pitch * 0.4, -0.1, -0.18);
        armR.shoulder.rotation.set(0.52 + pitch * 0.4, 0.1, 0.18);
        armL.elbow.rotation.x = 0.98;
        armR.elbow.rotation.x = 0.92;
      }
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      if (ownTextures) tex.dispose();
    },
  };
}
