import * as THREE from 'three';
import {
  createBeveledBox,
  createContouredArmorPlate,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
  createStrapTube,
} from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor07EnemyMaterials } from '../materials';
import {
  createMortarBombardierTextures,
  type MortarBombardierTextureSuite,
} from './textures';

export interface MortarBombardierRigHandle extends EnemyRigHandle {
  setTargetLaser: (active: boolean, length: number, dangerRatio: number) => void;
  getPodMuzzleWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  getFlakMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  triggerPodRecoil: (side: -1 | 1) => void;
  triggerFlakSpin: () => void;
}

/**
 * Helper mapping (angleRad, yMeters, normalOffset) onto the broad heavy-siege EOD torso shell.
 * Front is angle = -PI/2 (-Z), back is +PI/2 (+Z).
 */
function mapSiegeTorso(u: number, v: number, off: number): [number, number, number] {
  const t = THREE.MathUtils.clamp((v + 0.04) / 0.66, 0, 1);
  // Broad muscular heavy-EOD chest silhouette tapering subtly toward waist
  const rx = 0.255 + Math.sin(t * Math.PI * 0.85) * 0.075 + t * 0.025;
  const rz = 0.175 + Math.sin(t * Math.PI * 0.9) * 0.048;
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);
  const frontBulge = sinU < 0 ? 1.12 : 1.04;
  return [cosU * (rx + off), v, sinU * (rz * frontBulge + off)];
}

/**
 * Helper mapping (angleRad, yMeters, normalOffset) onto a heavy leg segment.
 */
function mapLegShell(
  rxBase: number,
  rzBase: number,
  taper: number
): (u: number, v: number, off: number) => [number, number, number] {
  return (u, v, off) => {
    const f = 1 + v * taper;
    return [Math.cos(u) * (rxBase * f + off), v, Math.sin(u) * (rzBase * f + off)];
  };
}

/**
 * AAA Sculpted Rig for Floor 07 Enemy #3: MORTAR-POD BOMBARDIER
 * - Heavy Military EOD Siege Artillery Trooper in weathered olive-drab & khaki composite blast armor,
 *   scorched industrial amber-black hazard striping, quilted Kevlar flak padding, and machined gunmetal steel.
 * - Twin elevated, independently recoiling shoulder mortar pods with prominent glowing amber
 *   Volatile Ordnance Drums (`weakpoint`) inside protective steel roll-cages.
 * - Dorsal rotary ballistic auto-loader + twin braided ordnance feed chutes arching into both mortar pods.
 * - Articulated rear hydraulic ankle anchor outriggers that physically swing down & stab into the deck
 *   during braced mortar salvos and Carpet Cluster Barrages.
 * - Rounded EOD blast-dome helmet with glowing amber-gold ballistic HUD visor, live laser rangefinder pod,
 *   handheld M44 Rotary Flak-Launcher (right arm), and mortar fire-control holopad (left forearm).
 */
export function buildMortarPodBombardierRig(
  enemyId: string,
  mats: Floor07EnemyMaterials,
  sharedTextures?: MortarBombardierTextureSuite
): MortarBombardierRigHandle {
  const tex = sharedTextures ?? createMortarBombardierTextures();
  const ownsTextures = !sharedTextures;

  const root = new THREE.Group();
  root.add(createEnemyContactShadow(0.84, mats.contactShadow));
  const rigBody = new THREE.Group();
  root.add(rigBody);
  const disposedGeos: THREE.BufferGeometry[] = [];
  const disposedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposedMats.push(m);
    return m;
  };

  // High-key PBR materials (color: 0xffffff so full-hue procedural canvas albedos never darken!)
  const oliveArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.oliveArmorAlbedo,
      bumpMap: tex.oliveArmorBump,
      bumpScale: 0.022,
      roughnessMap: tex.oliveArmorRoughness,
      roughness: 0.88,
      metalness: 0.24,
    })
  );

  const hazardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.hazardPlateAlbedo,
      bumpMap: tex.hazardPlateBump,
      bumpScale: 0.018,
      roughness: 0.62,
      metalness: 0.28,
    })
  );

  const gunmetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.gunmetalAlbedo,
      bumpMap: tex.gunmetalBump,
      bumpScale: 0.016,
      roughness: 0.44,
      metalness: 0.72,
    })
  );

  const darkSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x343a40,
      bumpMap: tex.gunmetalBump,
      bumpScale: 0.012,
      roughness: 0.5,
      metalness: 0.78,
    })
  );

  const flakSuitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.flakUndersuitAlbedo,
      bumpMap: tex.flakUndersuitBump,
      bumpScale: 0.02,
      roughness: 0.86,
      metalness: 0.08,
    })
  );

  const hydraulicChromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd0d6dc,
      roughness: 0.24,
      metalness: 0.9,
    })
  );

  const visorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.rangefinderLensMap,
      emissive: 0xffa618,
      emissiveMap: tex.rangefinderLensMap,
      emissiveIntensity: 1.8,
      roughness: 0.16,
      metalness: 0.35,
    })
  );

  const holopadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3ae8ff,
      emissive: 0x22d8ff,
      emissiveIntensity: 1.85,
      roughness: 0.15,
      metalness: 0.2,
      side: THREE.DoubleSide,
    })
  );

  // Prominent glowing molten-amber Shoulder Ordnance Drum Weakpoint material
  const weakpointMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffb824,
      emissive: 0xff7b00,
      emissiveIntensity: 2.35,
      roughness: 0.22,
      metalness: 0.35,
    })
  );

  const laserCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffb830,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const laserHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff5a10,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const reg = (mesh: THREE.Mesh, _zone?: string): THREE.Mesh => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // =========================================================================
  // 1. PELVIS & HEAVY ARTILLERY LEGS WITH ARTICULATED HYDRAULIC OUTRIGGERS
  // =========================================================================
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = 0.96;
  rigBody.add(pelvisGroup);

  // Sculpted armored pelvis core (strictly bottom-to-top y!)
  const pelvisCore = reg(
    new THREE.Mesh(
      trackGeo(
        createLoftedAnatomy(
          [
            { y: -0.15, rx: 0.15, rz: 0.135, squareness: 2.3 },
            { y: -0.05, rx: 0.245, rz: 0.185, squareness: 2.55 },
            { y: 0.08, rx: 0.27, rz: 0.195, squareness: 2.65 },
            { y: 0.17, rx: 0.255, rz: 0.182, squareness: 2.5 },
          ],
          22
        )
      ),
      flakSuitMat
    ),
    'body'
  );
  pelvisGroup.add(pelvisCore);

  // Heavy groin blast codpiece & contoured hip armor tassets
  const codpiece = reg(
    new THREE.Mesh(
      trackGeo(
        createContouredArmorPlate(
          [
            [-Math.PI * 0.72, 0.07],
            [-Math.PI * 0.28, 0.07],
            [-Math.PI * 0.36, -0.14],
            [-Math.PI * 0.5, -0.19],
            [-Math.PI * 0.64, -0.14],
          ],
          (u, v, off) => [Math.cos(u) * (0.255 + off), v, Math.sin(u) * (0.192 + off)],
          0.022,
          0.18,
          0.008
        )
      ),
      oliveArmorMat
    ),
    'body'
  );
  pelvisGroup.add(codpiece);

  // Heavy tactical utility belt with ordnance grenade pouches
  const beltRing = reg(
    new THREE.Mesh(
      trackGeo(
        createCurvedPanelGeometry(
          [
            { y: 0.05, rx: 0.268, rz: 0.205, thickness: 0.028 },
            { y: 0.13, rx: 0.266, rz: 0.202, thickness: 0.028 },
          ],
          -Math.PI,
          Math.PI,
          28
        )
      ),
      darkSteelMat
    ),
    'body'
  );
  pelvisGroup.add(beltRing);

  for (const side of [-1, 1] as const) {
    // Hip grenade cylinder canisters
    for (let p = 0; p < 2; p++) {
      const can = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.11, 12)),
        p === 0 ? hazardMat : gunmetalMat
      );
      can.position.set(side * 0.285, 0.04, -0.055 + p * 0.095);
      can.rotation.z = side * 0.12;
      pelvisGroup.add(can);
    }

    // Armored hip tasset flank plate
    const tasset = reg(
      new THREE.Mesh(
        trackGeo(createBeveledBox(0.042, 0.21, 0.22, 0.01)),
        oliveArmorMat
      ),
      'body'
    );
    tasset.position.set(side * 0.3, -0.06, 0.01);
    tasset.rotation.z = -side * 0.14;
    pelvisGroup.add(tasset);
  }

  interface LegRig {
    hip: THREE.Group;
    shin: THREE.Group;
    outrigger: THREE.Group;
    pistonRod: THREE.Mesh;
  }

  const buildSiegeLeg = (side: -1 | 1): LegRig => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.225, -0.06, 0);
    pelvisGroup.add(hip);

    // Thick quilted flak thigh core (strictly bottom-to-top!)
    const thighCore = reg(
      new THREE.Mesh(
        trackGeo(
          createLoftedAnatomy(
            [
              { y: -0.44, rx: 0.095, rz: 0.105, squareness: 2.3 },
              { y: -0.22, rx: 0.128, rz: 0.138, squareness: 2.4 },
              { y: -0.04, rx: 0.142, rz: 0.148, squareness: 2.45 },
              { y: 0.05, rx: 0.125, rz: 0.13, squareness: 2.3 },
            ],
            18
          )
        ),
        flakSuitMat
      ),
      'body'
    );
    hip.add(thighCore);

    // Contoured olive-drab thigh blast cuisse armor wrapping front & outside
    const thighAngleStart = side > 0 ? -Math.PI * 0.72 : -Math.PI * 1.1;
    const thighAngleEnd = side > 0 ? Math.PI * 0.1 : -Math.PI * 0.28;
    const thighArmor = reg(
      new THREE.Mesh(
        trackGeo(
          createCurvedPanelGeometry(
            [
              { y: -0.36, rx: 0.12, rz: 0.128, thickness: 0.022 },
              { y: -0.2, rx: 0.142, rz: 0.15, thickness: 0.026 },
              { y: -0.05, rx: 0.152, rz: 0.158, thickness: 0.024 },
            ],
            thighAngleStart,
            thighAngleEnd,
            16
          )
        ),
        oliveArmorMat
      ),
      'body'
    );
    hip.add(thighArmor);

    // External hydraulic knee actuator strut on outer thigh
    const outerStrut = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.02, 0.024, 0.34, 10)),
      gunmetalMat
    );
    outerStrut.position.set(side * 0.148, -0.23, 0.01);
    hip.add(outerStrut);

    const shin = new THREE.Group();
    shin.position.set(0, -0.42, 0);
    hip.add(shin);

    // Heavy domed knee-cap blast guard (with hazard stripe trim!)
    const kneeCap = reg(
      new THREE.Mesh(
        trackGeo(
          createContouredArmorPlate(
            [
              [-Math.PI * 0.76, 0.075],
              [-Math.PI * 0.24, 0.075],
              [-Math.PI * 0.22, -0.065],
              [-Math.PI * 0.5, -0.1],
              [-Math.PI * 0.78, -0.065],
            ],
            mapLegShell(0.118, 0.125, 0.04),
            0.026,
            0.22,
            0.009
          )
        ),
        hazardMat
      ),
      'body'
    );
    shin.add(kneeCap);

    // Sculpted heavy armored calf/shin greave (bottom-to-top!)
    const shinCore = reg(
      new THREE.Mesh(
        trackGeo(
          createLoftedAnatomy(
            [
              { y: -0.42, rx: 0.095, rz: 0.112, squareness: 2.5 },
              { y: -0.24, rx: 0.118, rz: 0.132, squareness: 2.55 },
              { y: -0.08, rx: 0.125, rz: 0.138, squareness: 2.45 },
              { y: 0.03, rx: 0.105, rz: 0.115, squareness: 2.35 },
            ],
            18
          )
        ),
        oliveArmorMat
      ),
      'body'
    );
    shin.add(shinCore);

    // Front reinforced shin blast ridge plate
    const shinFront = reg(
      new THREE.Mesh(
        trackGeo(
          createCurvedPanelGeometry(
            [
              { y: -0.37, rx: 0.108, rz: 0.125, thickness: 0.022 },
              { y: -0.18, rx: 0.128, rz: 0.145, thickness: 0.026 },
              { y: -0.07, rx: 0.122, rz: 0.138, thickness: 0.022 },
            ],
            -Math.PI * 0.85,
            -Math.PI * 0.15,
            14
          )
        ),
        gunmetalMat
      ),
      'body'
    );
    shin.add(shinFront);

    // Heavy armored siege boot (sole flush at y = -0.48 -> world y = 0.00!)
    const bootUpper = reg(
      new THREE.Mesh(
        trackGeo(
          createLoftedAnatomy(
            [
              { y: -0.48, rx: 0.118, rz: 0.195, offsetZ: -0.032, squareness: 2.8 },
              { y: -0.42, rx: 0.112, rz: 0.182, offsetZ: -0.026, squareness: 2.7 },
              { y: -0.36, rx: 0.1, rz: 0.135, offsetZ: -0.01, squareness: 2.5 },
            ],
            18
          )
        ),
        darkSteelMat
      ),
      'body'
    );
    shin.add(bootUpper);

    // Armored steel toe-cap bumper
    const toeCap = new THREE.Mesh(
      trackGeo(createBeveledBox(0.185, 0.085, 0.105, 0.014)),
      oliveArmorMat
    );
    toeCap.position.set(0, -0.435, -0.175);
    shin.add(toeCap);

    // ARTICULATED REAR HYDRAULIC ANCHOR OUTRIGGER SPIKE
    // Pivots at back of calf (y = -0.16, z = +0.132).
    // Local strut extends along -Y. Negative rotation around +X swings tip BACK (+Z) & DOWN (-Y) into deck!
    const outrigger = new THREE.Group();
    outrigger.position.set(0, -0.16, 0.132);
    shin.add(outrigger);

    const hingeDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.13, 12)),
      darkSteelMat
    );
    hingeDrum.rotation.z = Math.PI * 0.5;
    outrigger.add(hingeDrum);

    const pistonHousing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.034, 0.03, 0.22, 12)),
      hazardMat
    );
    pistonHousing.position.y = -0.11;
    outrigger.add(pistonHousing);

    const pistonRod = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.02, 0.017, 0.2, 10)),
      hydraulicChromeMat
    );
    pistonRod.position.y = -0.255;
    outrigger.add(pistonRod);

    // Heavy wide dual-claw anchor stabilizer spade at tip of hydraulic piston
    const spadeFoot = new THREE.Mesh(
      trackGeo(createBeveledBox(0.155, 0.056, 0.105, 0.01)),
      gunmetalMat
    );
    spadeFoot.position.set(0, -0.345, 0.012);
    outrigger.add(spadeFoot);

    for (const clawSide of [-1, 1] as const) {
      const anchorClaw = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.024, 0.082, 6)),
        hydraulicChromeMat
      );
      anchorClaw.rotation.x = Math.PI;
      anchorClaw.position.set(clawSide * 0.046, -0.392, 0.012);
      outrigger.add(anchorClaw);
    }

    return { hip, shin, outrigger, pistonRod };
  };

  const leftLeg = buildSiegeLeg(-1);
  const rightLeg = buildSiegeLeg(1);

  // =========================================================================
  // 2. BROAD HEAVY-EOD TORSO, SLOPED BLAST CUIRASS, GORGET & DORSAL AUTO-LOADER
  // =========================================================================
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.11, 0);
  pelvisGroup.add(torsoPivot);

  // Broad muscular flak undersuit torso (strictly bottom-to-top, tucked down to y=-0.06 into pelvis!)
  const torsoCore = reg(
    new THREE.Mesh(
      trackGeo(
        createLoftedAnatomy(
          [
            { y: -0.06, rx: 0.25, rz: 0.18, squareness: 2.55 },
            { y: 0.08, rx: 0.265, rz: 0.195, squareness: 2.65 },
            { y: 0.28, rx: 0.315, rz: 0.228, frontScale: 1.12, squareness: 2.7 },
            { y: 0.48, rx: 0.345, rz: 0.222, frontScale: 1.1, squareness: 2.65 },
            { y: 0.61, rx: 0.275, rz: 0.185, squareness: 2.4 },
            { y: 0.67, rx: 0.145, rz: 0.135, squareness: 2.1 },
          ],
          24
        )
      ),
      flakSuitMat
    ),
    'body'
  );
  torsoPivot.add(torsoCore);

  // Heavy 45°-chamfered sloped Olive-Drab Chest Blast Cuirass (UV-U flipped so stencil reads left-to-right!)
  const chestCuirassGeo = trackGeo(
    createContouredArmorPlate(
      [
        [-Math.PI * 0.88, 0.56],
        [-Math.PI * 0.64, 0.6],
        [-Math.PI * 0.36, 0.6],
        [-Math.PI * 0.12, 0.56],
        [-Math.PI * 0.16, 0.23],
        [-Math.PI * 0.38, 0.17],
        [-Math.PI * 0.62, 0.17],
        [-Math.PI * 0.84, 0.23],
      ],
      mapSiegeTorso,
      0.044,
      0.16,
      0.015,
      3
    )
  );
  const chestUv = chestCuirassGeo.attributes.uv;
  if (chestUv) {
    for (let i = 0; i < chestUv.count; i++) {
      chestUv.setX(i, 1 - chestUv.getX(i));
    }
    chestUv.needsUpdate = true;
  }
  const chestCuirass = reg(new THREE.Mesh(chestCuirassGeo, oliveArmorMat), 'body');
  torsoPivot.add(chestCuirass);

  // Sculpted layered armored pectoral plates + central ballistic sternum keel + collarbone latch clamps
  for (const side of [-1, 1] as const) {
    const pecPlate = reg(
      new THREE.Mesh(
        trackGeo(createBeveledBox(0.155, 0.15, 0.052, 0.014)),
        oliveArmorMat
      ),
      'body'
    );
    pecPlate.position.set(side * 0.155, 0.455, -0.258);
    pecPlate.rotation.set(-0.14, side * 0.24, -side * 0.08);
    torsoPivot.add(pecPlate);

    // Collarbone heavy titanium yoke latch securing blast gorget to chest cuirass
    const yokeClamp = new THREE.Mesh(
      trackGeo(createBeveledBox(0.068, 0.088, 0.082, 0.01)),
      gunmetalMat
    );
    yokeClamp.position.set(side * 0.175, 0.585, -0.175);
    yokeClamp.rotation.set(0.32, side * 0.18, -side * 0.14);
    torsoPivot.add(yokeClamp);

    // Glowing amber chest status micro-diode on collarbone clamp
    const diode = new THREE.Mesh(
      trackGeo(createBeveledBox(0.026, 0.014, 0.012, 0.003)),
      visorMat
    );
    diode.position.set(side * 0.175, 0.578, -0.22);
    torsoPivot.add(diode);
  }

  // Central angular sternum armor keel below bandolier
  const sternumKeel = reg(
    new THREE.Mesh(
      trackGeo(createBeveledBox(0.125, 0.12, 0.056, 0.012)),
      gunmetalMat
    ),
    'body'
  );
  sternumKeel.position.set(0, 0.25, -0.275);
  sternumKeel.rotation.x = 0.14;
  torsoPivot.add(sternumKeel);

  // Scorched industrial hazard-stripe abdominal blast apron below chest plate
  const bellyHazardPlate = reg(
    new THREE.Mesh(
      trackGeo(
        createContouredArmorPlate(
          [
            [-Math.PI * 0.78, 0.18],
            [-Math.PI * 0.22, 0.18],
            [-Math.PI * 0.26, -0.01],
            [-Math.PI * 0.5, -0.04],
            [-Math.PI * 0.74, -0.01],
          ],
          mapSiegeTorso,
          0.032,
          0.14,
          0.01,
          3
        )
      ),
      hazardMat
    ),
    'body'
  );
  torsoPivot.add(bellyHazardPlate);

  // Chest-mounted dual bandolier 40mm flak shells + blast-telemetry badge
  for (let i = -2; i <= 2; i++) {
    const shell = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.021, 0.021, 0.095, 10)),
      i % 2 === 0 ? hazardMat : gunmetalMat
    );
    shell.position.set(i * 0.056, 0.35, -0.282 + Math.abs(i) * 0.012);
    shell.rotation.z = -i * 0.04;
    torsoPivot.add(shell);

    const warhead = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.0205, 8, 8)),
      weakpointMat
    );
    warhead.position.set(i * 0.056, 0.4, -0.282 + Math.abs(i) * 0.012);
    torsoPivot.add(warhead);
  }

  // Heavy wrap-around EOD Blast Collar Gorget shielding lower neck/jaw
  const blastGorget = reg(
    new THREE.Mesh(
      trackGeo(
        createCurvedPanelGeometry(
          [
            { y: 0.54, rx: 0.235, rz: 0.215, thickness: 0.038 },
            { y: 0.65, rx: 0.225, rz: 0.21, thickness: 0.034 },
            { y: 0.73, rx: 0.2, rz: 0.195, thickness: 0.028 },
          ],
          -Math.PI * 1.15,
          Math.PI * 0.15,
          20
        )
      ),
      oliveArmorMat
    ),
    'body'
  );
  torsoPivot.add(blastGorget);

  // Heavy Rear Dorsal Ballistic Auto-Loader & Ammo Hopper
  const dorsalFrame = reg(
    new THREE.Mesh(
      trackGeo(createBeveledBox(0.42, 0.48, 0.22, 0.024)),
      oliveArmorMat
    ),
    'body'
  );
  dorsalFrame.position.set(0, 0.36, 0.26);
  torsoPivot.add(dorsalFrame);

  // Central rotary auto-loader drum + hazard shroud on back
  const autoLoaderDrum = reg(
    new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.145, 0.145, 0.22, 18)),
      gunmetalMat
    ),
    'body'
  );
  autoLoaderDrum.rotation.x = Math.PI * 0.5;
  autoLoaderDrum.position.set(0, 0.34, 0.34);
  torsoPivot.add(autoLoaderDrum);

  const autoLoaderStripe = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.152, 0.152, 0.065, 18)),
    hazardMat
  );
  autoLoaderStripe.rotation.x = Math.PI * 0.5;
  autoLoaderStripe.position.set(0, 0.34, 0.37);
  torsoPivot.add(autoLoaderStripe);

  // Glowing dorsal heat-vent fins below auto-loader
  for (let v = 0; v < 3; v++) {
    const vent = new THREE.Mesh(
      trackGeo(createBeveledBox(0.24, 0.024, 0.055, 0.005)),
      v === 1 ? weakpointMat : darkSteelMat
    );
    vent.position.set(0, 0.12 + v * 0.042, 0.365);
    torsoPivot.add(vent);
  }

  // Twin curved braided ordnance ammo feed chutes arcing seamlessly from dorsal auto-loader to both shoulder pods!
  for (const side of [-1, 1] as const) {
    const chuteGeo = trackGeo(
      createStrapTube(
        [
          new THREE.Vector3(side * 0.13, 0.38, 0.36),
          new THREE.Vector3(side * 0.27, 0.48, 0.35),
          new THREE.Vector3(side * 0.38, 0.62, 0.24),
          new THREE.Vector3(side * 0.41, 0.72, 0.1),
        ],
        0.036,
        1.0,
        22
      )
    );
    const chute = reg(new THREE.Mesh(chuteGeo, darkSteelMat), 'body');
    torsoPivot.add(chute);

    // Angled steel stanchion pylon connecting dorsal chassis firmly to each shoulder mortar pod
    const pylon = reg(
      new THREE.Mesh(
        trackGeo(createBeveledBox(0.088, 0.28, 0.12, 0.012)),
        gunmetalMat
      ),
      'body'
    );
    pylon.position.set(side * 0.32, 0.62, 0.14);
    pylon.rotation.z = -side * 0.36;
    torsoPivot.add(pylon);
  }

  // =========================================================================
  // 3. TWIN ELEVATED RECOILING SHOULDER MORTAR PODS + VOLATILE AMBER DRUM WEAKPOINTS
  // =========================================================================
  interface MortarPodRig {
    pivot: THREE.Group;
    recoilSlide: THREE.Group;
    muzzle: THREE.Object3D;
    drumAnchor: THREE.Object3D;
  }

  const buildShoulderMortarPod = (side: -1 | 1): MortarPodRig => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.42, 0.75, 0.07);
    // Default elevated launch pitch: barrel built along +Y; negative X rotation tilts barrel UP (+Y) & FORWARD (-Z)!
    pivot.rotation.x = -0.68;
    pivot.rotation.z = -side * 0.06;
    torsoPivot.add(pivot);

    // Armored breech cradle & elevation trunnion box
    const breech = reg(
      new THREE.Mesh(
        trackGeo(createBeveledBox(0.18, 0.24, 0.22, 0.018)),
        oliveArmorMat
      ),
      'body'
    );
    breech.position.set(0, 0.02, 0);
    pivot.add(breech);

    // Hazard-striped blast deflection cowl wrapping front of mortar breech
    const cowl = reg(
      new THREE.Mesh(
        trackGeo(createBeveledBox(0.195, 0.14, 0.055, 0.01)),
        hazardMat
      ),
      'body'
    );
    cowl.position.set(0, 0.09, -0.11);
    pivot.add(cowl);

    // Recoiling rifled mortar tube assembly (slides along local -Y on firing!)
    const recoilSlide = new THREE.Group();
    pivot.add(recoilSlide);

    const mainBarrel = reg(
      new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.068, 0.076, 0.44, 16)),
        gunmetalMat
      ),
      'body'
    );
    mainBarrel.position.y = 0.26;
    recoilSlide.add(mainBarrel);

    // Cooling heat-sink ribs along barrel
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.084, 0.084, 0.022, 14)),
        darkSteelMat
      );
      rib.position.y = 0.14 + r * 0.075;
      recoilSlide.add(rib);
    }

    // Flared slotted blast-brake muzzle crown
    const muzzleCrown = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.092, 0.076, 0.095, 16)),
      darkSteelMat
    );
    muzzleCrown.position.y = 0.49;
    recoilSlide.add(muzzleCrown);

    // Glowing inner mortar bore glow ring
    const boreGlow = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.054, 0.054, 0.02, 14)),
      weakpointMat
    );
    boreGlow.position.y = 0.532;
    recoilSlide.add(boreGlow);

    // Dual hydraulic recoil damper cylinders flanking the barrel
    for (const rSide of [-1, 1] as const) {
      const damper = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8)),
        hydraulicChromeMat
      );
      damper.position.set(rSide * 0.082, 0.2, 0.04);
      recoilSlide.add(damper);
    }

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.56, 0);
    recoilSlide.add(muzzle);

    // PROMINENT VOLATILE AMBER ORDNANCE DRUM WEAKPOINT (mounted outer-upper side of breech!)
    // Clearly visible & targetable from front, side, and rear 3/4!
    const drumGroup = new THREE.Group();
    drumGroup.position.set(side * 0.145, 0.06, 0.015);
    drumGroup.rotation.z = side * 0.12;
    pivot.add(drumGroup);

    // Glowing molten-amber volatile munition core (hitZone = 'weakpoint')
    const drumCore = reg(
      new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.092, 0.092, 0.24, 18)),
        weakpointMat
      ),
      'weakpoint'
    );
    drumGroup.add(drumCore);

    // Top & bottom armored drum end-caps (also weakpoint-tagged for generous fair crits!)
    for (const capY of [-0.125, 0.125]) {
      const cap = reg(
        new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.102, 0.102, 0.036, 16)),
          darkSteelMat
        ),
        'weakpoint'
      );
      cap.position.y = capY;
      drumGroup.add(cap);
    }

    // 4 protective steel roll-cage bars framing the glowing amber core
    for (let b = 0; b < 4; b++) {
      const ang = (b * Math.PI) / 2 + Math.PI * 0.25;
      const bar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.25, 6)),
        gunmetalMat
      );
      bar.position.set(Math.cos(ang) * 0.098, 0, Math.sin(ang) * 0.098);
      drumGroup.add(bar);
    }

    // Center hazard retaining band leaving bright upper & lower amber windows exposed
    const midBand = reg(
      new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.101, 0.101, 0.032, 16)),
        hazardMat
      ),
      'weakpoint'
    );
    drumGroup.add(midBand);

    const drumAnchor = new THREE.Object3D();
    drumAnchor.position.set(0, 0.04, 0);
    drumGroup.add(drumAnchor);

    return { pivot, recoilSlide, muzzle, drumAnchor };
  };

  const podLeft = buildShoulderMortarPod(-1);
  const podRight = buildShoulderMortarPod(1);

  // =========================================================================
  // 4. SCULPTED ROUNDED EOD BLAST-DOME HELMET + LIVE LASER RANGEFINDER POD
  // =========================================================================
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.68, -0.02);
  torsoPivot.add(headPivot);

  // Heavy rounded EOD blast dome (strictly bottom-to-top slices!)
  const helmetDome = reg(
    new THREE.Mesh(
      trackGeo(
        createLoftedAnatomy(
          [
            { y: 0.0, rx: 0.132, rz: 0.145, squareness: 2.3 },
            { y: 0.08, rx: 0.156, rz: 0.172, frontScale: 1.08, squareness: 2.35 },
            { y: 0.17, rx: 0.16, rz: 0.176, frontScale: 1.06, squareness: 2.2 },
            { y: 0.25, rx: 0.132, rz: 0.145, squareness: 2.05 },
            { y: 0.3, rx: 0.072, rz: 0.08, squareness: 2.0 },
          ],
          22
        )
      ),
      oliveArmorMat
    ),
    'head'
  );
  headPivot.add(helmetDome);

  // Reinforced brow blast visor brim
  const browShield = reg(
    new THREE.Mesh(
      trackGeo(
        createCurvedPanelGeometry(
          [
            { y: 0.172, rx: 0.168, rz: 0.194, thickness: 0.024 },
            { y: 0.222, rx: 0.16, rz: 0.178, thickness: 0.024 },
          ],
          -Math.PI * 0.92,
          -Math.PI * 0.08,
          16
        )
      ),
      gunmetalMat
    ),
    'head'
  );
  headPivot.add(browShield);

  // Cleanly recessed glowing amber-gold ballistic HUD optics visor (zero overlap with jaw!)
  const visorLens = reg(
    new THREE.Mesh(
      trackGeo(
        createCurvedPanelGeometry(
          [
            { y: 0.116, rx: 0.162, rz: 0.186, thickness: 0.014 },
            { y: 0.17, rx: 0.164, rz: 0.188, thickness: 0.014 },
          ],
          -Math.PI * 0.82,
          -Math.PI * 0.18,
          18
        )
      ),
      visorMat
    ),
    'head'
  );
  headPivot.add(visorLens);

  // Dark steel machined lower visor gasket lip cleanly separating visor from jaw shield
  const visorLowerLip = reg(
    new THREE.Mesh(
      trackGeo(
        createCurvedPanelGeometry(
          [
            { y: 0.102, rx: 0.164, rz: 0.19, thickness: 0.018 },
            { y: 0.115, rx: 0.165, rz: 0.191, thickness: 0.018 },
          ],
          -Math.PI * 0.86,
          -Math.PI * 0.14,
          16
        )
      ),
      darkSteelMat
    ),
    'head'
  );
  headPivot.add(visorLowerLip);

  // Heavy bolted jaw blast mandible respirator guard (strictly below y=0.102, zero z-fighting!)
  const jawShield = reg(
    new THREE.Mesh(
      trackGeo(
        createCurvedPanelGeometry(
          [
            { y: 0.008, rx: 0.15, rz: 0.176, thickness: 0.024 },
            { y: 0.1, rx: 0.158, rz: 0.184, thickness: 0.024 },
          ],
          -Math.PI * 0.86,
          -Math.PI * 0.14,
          16
        )
      ),
      darkSteelMat
    ),
    'head'
  );
  headPivot.add(jawShield);

  // Dual cheek respirator filter canisters
  for (const side of [-1, 1] as const) {
    const filter = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.032, 0.036, 0.055, 10)),
      gunmetalMat
    );
    filter.rotation.set(Math.PI * 0.42, 0, side * 0.38);
    filter.position.set(side * 0.105, 0.055, -0.158);
    headPivot.add(filter);
  }

  // Left-side whip ballistic telemetry antenna
  const antennaBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.018, 0.022, 0.08, 8)),
    darkSteelMat
  );
  antennaBase.position.set(-0.158, 0.14, 0.02);
  headPivot.add(antennaBase);

  const antennaWhip = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.004, 0.009, 0.42, 6)),
    gunmetalMat
  );
  antennaWhip.position.set(-0.162, 0.36, 0.04);
  antennaWhip.rotation.x = 0.14;
  headPivot.add(antennaWhip);

  // Right-temple articulated Ballistic Laser Rangefinder Pod + live targeting laser beam!
  const rangefinderPod = new THREE.Group();
  rangefinderPod.position.set(0.17, 0.16, -0.05);
  headPivot.add(rangefinderPod);

  const rfBody = new THREE.Mesh(
    trackGeo(createBeveledBox(0.068, 0.072, 0.16, 0.01)),
    hazardMat
  );
  rangefinderPod.add(rfBody);

  const rfLens = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.022, 12)),
    visorMat
  );
  rfLens.rotation.x = Math.PI * 0.5;
  rfLens.position.set(0, 0, -0.082);
  rangefinderPod.add(rfLens);

  // Live targeting laser beam stretching along local -Z from the rangefinder lens
  const laserGroup = new THREE.Group();
  laserGroup.position.set(0, 0, -0.09);
  laserGroup.visible = false;
  rangefinderPod.add(laserGroup);

  const coreGeo = trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 1, 8));
  coreGeo.rotateX(Math.PI * 0.5);
  coreGeo.translate(0, 0, -0.5);
  const laserCore = new THREE.Mesh(coreGeo, laserCoreMat);
  laserGroup.add(laserCore);

  const haloGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 1, 8));
  haloGeo.rotateX(Math.PI * 0.5);
  haloGeo.translate(0, 0, -0.5);
  const laserHalo = new THREE.Mesh(haloGeo, laserHaloMat);
  laserGroup.add(laserHalo);

  // =========================================================================
  // 5. TORSO-STABILIZED HEAVY PAULDRONS + ARMS + M44 ROTARY FLAK-LAUNCHER & HOLOPAD
  // =========================================================================
  const buildPauldron = (side: -1 | 1): THREE.Group => {
    const mount = new THREE.Group();
    mount.position.set(side * 0.375, 0.51, 0);
    torsoPivot.add(mount);

    // Sculpted layered domed heavy blast pauldron (never twists sideways with arm swings!)
    const shell = reg(
      new THREE.Mesh(
        trackGeo(
          createCurvedPanelGeometry(
            [
              { y: -0.14, rx: 0.145, rz: 0.155, thickness: 0.026 },
              { y: -0.02, rx: 0.165, rz: 0.175, thickness: 0.032 },
              { y: 0.11, rx: 0.125, rz: 0.135, thickness: 0.026 },
            ],
            side > 0 ? -Math.PI * 0.55 : Math.PI * 0.45,
            side > 0 ? Math.PI * 0.55 : Math.PI * 1.55,
            16
          )
        ),
        oliveArmorMat
      ),
      'body'
    );
    shell.rotation.z = -side * 0.22;
    mount.add(shell);

    const trimLip = new THREE.Mesh(
      trackGeo(createBeveledBox(0.04, 0.06, 0.22, 0.008)),
      hazardMat
    );
    trimLip.position.set(side * 0.15, -0.09, 0);
    trimLip.rotation.z = -side * 0.18;
    mount.add(trimLip);

    return mount;
  };

  const pauldronL = buildPauldron(-1);
  const pauldronR = buildPauldron(1);

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.385, 0.48, 0);
    torsoPivot.add(shoulder);

    // Sculpted heavy upper arm (bottom-to-top!)
    const upperArm = reg(
      new THREE.Mesh(
        trackGeo(
          createLoftedAnatomy(
            [
              { y: -0.32, rx: 0.072, rz: 0.078, squareness: 2.3 },
              { y: -0.16, rx: 0.088, rz: 0.094, squareness: 2.4 },
              { y: 0.02, rx: 0.092, rz: 0.096, squareness: 2.3 },
            ],
            16
          )
        ),
        flakSuitMat
      ),
      'body'
    );
    shoulder.add(upperArm);

    const elbowCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.082, 12, 10)),
      gunmetalMat
    );
    elbowCap.position.set(0, -0.31, 0.015);
    shoulder.add(elbowCap);

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.31, 0);
    shoulder.add(forearm);

    // Sculpted heavy forearm blast vambrace (bottom-to-top!)
    const lowerArm = reg(
      new THREE.Mesh(
        trackGeo(
          createLoftedAnatomy(
            [
              { y: -0.31, rx: 0.064, rz: 0.072, squareness: 2.45 },
              { y: -0.16, rx: 0.086, rz: 0.094, squareness: 2.55 },
              { y: 0.02, rx: 0.084, rz: 0.09, squareness: 2.4 },
            ],
            16
          )
        ),
        oliveArmorMat
      ),
      'body'
    );
    forearm.add(lowerArm);

    // 5-finger armored gauntlet hand
    const hand = createSculptedHand(side, darkSteelMat, oliveArmorMat, gunmetalMat);
    hand.position.set(0, -0.3, 0);
    hand.scale.setScalar(1.18);
    forearm.add(hand);

    return { shoulder, forearm, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // LEFT FOREARM: Heavy Blast Gauntlet Shield + Glowing Cyan Mortar Fire-Control Holopad!
  const leftBracer = reg(
    new THREE.Mesh(
      trackGeo(createBeveledBox(0.055, 0.25, 0.145, 0.01)),
      gunmetalMat
    ),
    'body'
  );
  leftBracer.position.set(-0.088, -0.15, -0.005);
  leftArm.forearm.add(leftBracer);

  const holopadBezel = new THREE.Mesh(
    trackGeo(createBeveledBox(0.026, 0.132, 0.102, 0.006)),
    darkSteelMat
  );
  holopadBezel.position.set(-0.095, -0.15, -0.035);
  holopadBezel.rotation.y = 0.42;
  leftArm.forearm.add(holopadBezel);

  const holopadScreen = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.082, 0.108)),
    holopadMat
  );
  // Orient glowing cyan screen cleanly outward-front (-X / -Z) so it is brightly visible!
  holopadScreen.position.set(-0.108, -0.15, -0.044);
  holopadScreen.rotation.y = -Math.PI * 0.5 + 0.42;
  leftArm.forearm.add(holopadScreen);

  // RIGHT ARM: Handheld M44 ROTARY FLAK-LAUNCHER (revolving 6-chamber drum + vented shroud!)
  // Mounted right through the curled 5-finger gauntlet hand so the grip sits locked inside the palm!
  const flakGunRoot = new THREE.Group();
  flakGunRoot.position.set(0.0, -0.355, -0.005);
  flakGunRoot.rotation.x = -0.54;
  rightArm.forearm.add(flakGunRoot);

  // Receiver frame & pistol grip locked inside palm
  const receiver = reg(
    new THREE.Mesh(
      trackGeo(createBeveledBox(0.112, 0.132, 0.34, 0.014)),
      oliveArmorMat
    ),
    'body'
  );
  receiver.position.set(0, 0.068, -0.05);
  flakGunRoot.add(receiver);

  const grip = new THREE.Mesh(
    trackGeo(createBeveledBox(0.048, 0.115, 0.064, 0.008)),
    darkSteelMat
  );
  grip.position.set(0, -0.005, 0.008);
  grip.rotation.x = 0.22;
  flakGunRoot.add(grip);

  // Heavy revolving 6-chamber 40mm rotary flak drum magazine!
  const flakDrumGroup = new THREE.Group();
  flakDrumGroup.position.set(0, 0.048, -0.17);
  flakGunRoot.add(flakDrumGroup);

  const drumHub = reg(
    new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.096, 0.096, 0.17, 16)),
      gunmetalMat
    ),
    'body'
  );
  drumHub.rotation.x = Math.PI * 0.5;
  flakDrumGroup.add(drumHub);

  // 6 individual chamber flutes + hazard accent ring around the drum
  for (let c = 0; c < 6; c++) {
    const ang = (c * Math.PI * 2) / 6;
    const chamber = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.18, 8)),
      c % 2 === 0 ? darkSteelMat : hazardMat
    );
    chamber.rotation.x = Math.PI * 0.5;
    chamber.position.set(Math.cos(ang) * 0.068, Math.sin(ang) * 0.068, 0);
    flakDrumGroup.add(chamber);
  }

  // Heavy vented steel barrel shroud & rifled bore extending forward along -Z
  const barrelShroud = reg(
    new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.052, 0.058, 0.38, 14)),
      gunmetalMat
    ),
    'body'
  );
  barrelShroud.rotation.x = Math.PI * 0.5;
  barrelShroud.position.set(0, 0.083, -0.4);
  flakGunRoot.add(barrelShroud);

  // Hazard caution band & flared muzzle compensator
  const barrelBand = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.052, 14)),
    hazardMat
  );
  barrelBand.rotation.x = Math.PI * 0.5;
  barrelBand.position.set(0, 0.083, -0.48);
  flakGunRoot.add(barrelBand);

  const flakCompensator = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.066, 0.055, 0.08, 12)),
    darkSteelMat
  );
  flakCompensator.rotation.x = Math.PI * 0.5;
  flakCompensator.position.set(0, 0.083, -0.61);
  flakGunRoot.add(flakCompensator);

  // Top tactical carry rail & reflex sight (pointing cleanly UP along +Y!)
  const topRail = new THREE.Mesh(
    trackGeo(createBeveledBox(0.042, 0.032, 0.42, 0.005)),
    darkSteelMat
  );
  topRail.position.set(0, 0.153, -0.2);
  flakGunRoot.add(topRail);

  const reflexSight = new THREE.Mesh(
    trackGeo(createBeveledBox(0.046, 0.044, 0.075, 0.006)),
    visorMat
  );
  reflexSight.position.set(0, 0.183, -0.06);
  flakGunRoot.add(reflexSight);

  const flakMuzzleNode = new THREE.Object3D();
  flakMuzzleNode.position.set(0, 0.083, -0.66);
  flakGunRoot.add(flakMuzzleNode);

  // === DEDICATED RAYCAST HITBOXES (Twin Shoulder Ordnance Drums + Head + Heavy Body) ===
  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    trackGeo(new THREE.BoxGeometry(0.84, 1.56, 0.62))
  );
  bodyHitbox.position.set(0, 0.88, 0.02);
  root.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    trackGeo(new THREE.BoxGeometry(0.36, 0.34, 0.38))
  );
  headHitbox.position.set(0, 0.16, -0.01);
  headPivot.add(headHitbox);

  const wpLeftHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    trackGeo(new THREE.BoxGeometry(0.28, 0.34, 0.28)),
    'ordnance_drums'
  );
  podLeft.drumAnchor.add(wpLeftHitbox);

  const wpRightHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    trackGeo(new THREE.BoxGeometry(0.28, 0.34, 0.28)),
    'ordnance_drums'
  );
  podRight.drumAnchor.add(wpRightHitbox);

  // Animation recoil state for independent shoulder pods & rotary drum spin
  let recoilL = 0;
  let recoilR = 0;
  let flakDrumAngle = 0;
  let flakDrumTarget = 0;
  let outriggerBlend = 0;

  // =========================================================================
  // 6. PROCEDURAL ANIMATION CONTROLLER FOR ALL 5 HEAVY-SIEGE ATTACKS
  // =========================================================================
  const updateAnimation = (ctx: EnemyAnimationInput) => {
    const t = ctx.elapsed;
    const dt = Math.min(0.05, Math.max(0.001, ctx.dt));
    const speed = THREE.MathUtils.clamp(ctx.speedRatio, 0, 1.4);

    // Decay pod recoils & smoothly spin M44 rotary drum
    recoilL = Math.max(0, recoilL - dt * 3.8);
    recoilR = Math.max(0, recoilR - dt * 3.8);
    flakDrumAngle += (flakDrumTarget - flakDrumAngle) * Math.min(1, dt * 14);
    flakDrumGroup.rotation.z = flakDrumAngle;

    // Reset child rigBody death tilt (NEVER touch root.position/rotation — owned by EnemyManager!)
    rigBody.rotation.set(0, 0, 0);
    rigBody.position.set(0, 0, 0);

    // Dying collapse animation
    if (ctx.behavior === 'dead') {
      const p = THREE.MathUtils.clamp(ctx.deadProgress, 0, 1);
      rigBody.rotation.x = -p * 1.48;
      rigBody.position.y = -p * 0.32;
      weakpointMat.emissiveIntensity = Math.max(0, 1.5 * (1 - p));
      visorMat.emissiveIntensity = Math.max(0, 1.4 * (1 - p));
      laserGroup.visible = false;
      return;
    }

    // Weakpoint visual state: bright pulsing molten amber when intact, charred dim embers when broken
    if (ctx.weakpointBroken) {
      weakpointMat.color.setHex(0x3a2b20);
      weakpointMat.emissive.setHex(0x3a1806);
      weakpointMat.emissiveIntensity = 0.28 + Math.sin(t * 7) * 0.1;
    } else {
      const pulse =
        ctx.behavior === 'windup' || ctx.behavior === 'attack'
          ? 2.8 + Math.sin(t * 18) * 0.7
          : 2.1 + Math.sin(t * 4.5) * 0.35;
      weakpointMat.color.setHex(0xffb824);
      weakpointMat.emissive.setHex(0xff7b00);
      weakpointMat.emissiveIntensity = pulse;
    }

    // Staggered overload recoil animation
    if (ctx.behavior === 'staggered' || ctx.staggerTimer > 0) {
      const sway = Math.sin(t * 11) * 0.14;
      pelvisGroup.position.set(0, 0.89, 0.05);
      pelvisGroup.rotation.set(-0.22, sway, sway * 0.5);
      torsoPivot.rotation.set(-0.34, -sway * 0.7, sway * 0.45);
      headPivot.rotation.set(-0.28, sway * 1.2, 0.14);
      leftArm.shoulder.rotation.set(-0.32, 0, 0.42);
      leftArm.forearm.rotation.set(0.58, 0, 0);
      rightArm.shoulder.rotation.set(-0.28, 0, -0.45);
      rightArm.forearm.rotation.set(0.45, 0, 0);
      leftLeg.hip.rotation.set(0.24, 0, 0.08);
      leftLeg.shin.rotation.set(-0.42, 0, 0);
      rightLeg.hip.rotation.set(-0.18, 0, -0.08);
      rightLeg.shin.rotation.set(-0.28, 0, 0);
      podLeft.pivot.rotation.x = -0.35;
      podRight.pivot.rotation.x = -0.35;
      laserGroup.visible = false;
      return;
    }

    // Determine desired outrigger deployment (1 = firmly stabbed into deck, 0 = stowed cleanly behind calf)
    const isMortarBraced =
      (ctx.behavior === 'windup' || ctx.behavior === 'attack') &&
      (ctx.attackVariant === 0 || ctx.attackVariant === 1);
    const targetOutrigger = isMortarBraced ? 1 : 0;
    outriggerBlend += (targetOutrigger - outriggerBlend) * Math.min(1, dt * 10);

    // Base marching locomotion stride
    const stride = t * 5.6;
    const walkSwing = Math.sin(stride) * 0.44 * speed;
    const bob = Math.abs(Math.cos(stride)) * 0.045 * speed;

    let pelvisY = 0.96 - (isMortarBraced ? 0.13 : 0) + bob;
    let pelvisPitch = 0;
    let pelvisYaw = 0;
    let torsoPitch = -0.05 - speed * 0.06;
    let torsoYaw = 0;
    let headPitch = 0;
    let headYaw = 0;

    // Wide, grounded heavy-siege default leg stance
    let lHipX = 0.14 + walkSwing;
    let lShinX = -0.24 - Math.max(0, -walkSwing) * 0.75;
    let rHipX = -0.08 - walkSwing;
    let rShinX = -0.22 - Math.max(0, walkSwing) * 0.75;
    let lHipZ = 0.115;
    let rHipZ = -0.115;

    // Arms default (M44 held at heavy combat ready, left forearm raised ready to brace)
    let lArmX = 0.24 - walkSwing * 0.28;
    let lArmZ = 0.14;
    let lForeX = 0.46;
    let lForeZ = -0.14;

    let rArmX = 0.16 + walkSwing * 0.15;
    let rArmZ = -0.12;
    let rForeX = 0.36;
    let rForeZ = 0.08;

    // Shoulder mortar pod pitch (negative X = tilted UP & FORWARD!)
    let podPitchL = -0.68;
    let podPitchR = -0.68;
    holopadMat.emissiveIntensity = 1.1;

    // === ATTACK VARIANT ANIMATION CHOREOGRAPHY ===
    if (ctx.behavior === 'windup' || ctx.behavior === 'attack') {
      const p = THREE.MathUtils.clamp(ctx.attackProgress, 0, 1);
      const isWindup = ctx.behavior === 'windup';

      if (ctx.attackVariant === 0) {
        // VARIANT 0: INCENDIUM BRACKET SALVO — Deep braced siege stance, outriggers deployed, alternating pod launches!
        pelvisY = 0.84;
        pelvisPitch = -0.08;
        torsoPitch = -0.14;
        lHipX = 0.34;
        lShinX = -0.64;
        rHipX = -0.22;
        rShinX = -0.44;
        lHipZ = 0.15;
        rHipZ = -0.15;
        // Left arm lifts mortar fire-control holopad toward visor!
        lArmX = 0.36;
        lArmZ = -0.1;
        lForeX = 0.82;
        lForeZ = -0.42;
        holopadMat.emissiveIntensity = 2.6;
        // Right arm holds M44 braced low at hip
        rArmX = 0.06;
        rForeX = 0.38;
        podPitchL = isWindup ? -0.56 - p * 0.14 : -0.52;
        podPitchR = isWindup ? -0.56 - p * 0.14 : -0.52;
      } else if (ctx.attackVariant === 1) {
        // VARIANT 1: CARPET CLUSTER BARRAGE — Ultra-low heavy anchor crouch, both pods cranked skyward, laser lock!
        pelvisY = 0.81;
        pelvisPitch = -0.12;
        torsoPitch = -0.18;
        lHipX = 0.38;
        lShinX = -0.74;
        rHipX = -0.26;
        rShinX = -0.52;
        lHipZ = 0.19;
        rHipZ = -0.19;
        lArmX = 0.42;
        lArmZ = -0.12;
        lForeX = 0.88;
        lForeZ = -0.46;
        holopadMat.emissiveIntensity = 3.2;
        rArmX = 0.14;
        rForeX = 0.42;
        headPitch = 0.08;
        // Steep skyward barrage elevation!
        podPitchL = -0.38;
        podPitchR = -0.38;
      } else if (ctx.attackVariant === 2) {
        // VARIANT 2: DIRECT M44 ROTARY FLAK BURST — Right arm leveled dead straight at target!
        pelvisY = 0.92;
        torsoYaw = 0.24;
        headYaw = -0.22;
        torsoPitch = -0.06;
        lHipX = 0.22;
        lShinX = -0.34;
        rHipX = -0.16;
        rShinX = -0.24;
        // Net right arm + forearm pitch = +0.54 -> flakGunRoot (-0.54) aims DEAD LEVEL at target!
        const kick = !isWindup ? Math.sin(p * Math.PI * 2) * 0.12 : 0;
        rArmX = 0.26 + kick;
        rArmZ = -0.06;
        rForeX = 0.3 + kick * 0.5;
        rForeZ = 0.16;
        // Left arm crosses forward to brace heavy rotary launcher handguard
        lArmX = 0.44;
        lArmZ = -0.26;
        lForeX = 0.52;
        lForeZ = -0.38;
        podPitchL = -0.76;
        podPitchR = -0.76;
      } else if (ctx.attackVariant === 3) {
        // VARIANT 3: SUPPRESSIVE SHRAPNEL FAN — Sweeping wide hip-fire shotgun arc!
        pelvisY = 0.91;
        const sweep = isWindup ? -0.42 * p : -0.42 + p * 0.88;
        torsoYaw = sweep;
        headYaw = -sweep * 0.55;
        rArmX = 0.24;
        rArmZ = -0.12;
        rForeX = 0.32;
        rForeZ = 0.08;
        lArmX = 0.38;
        lArmZ = -0.18;
        lForeX = 0.54;
        lForeZ = -0.3;
      } else if (ctx.attackVariant === 4) {
        // VARIANT 4: CONCUSSION SHOCK-STOMP — Raises heavy hydraulic right siege boot high & VIOLENTLY SLAMS DECK!
        if (isWindup) {
          pelvisY = 0.99 + p * 0.08;
          torsoPitch = 0.14 * p; // rears back powerfully
          torsoYaw = -0.2 * p;
          // Right leg raises high forward (+X swings leg forward & up!)
          rHipX = 0.96 * p;
          rShinX = -1.05 * p;
          lHipX = -0.12 * p;
          lShinX = -0.18 * p;
          lArmX = -0.25 * p;
          lArmZ = 0.42 * p;
          rArmX = -0.2 * p;
          rArmZ = -0.38 * p;
          podPitchL = -0.52;
          podPitchR = -0.52;
        } else {
          // Violent downward stomp impact!
          const slam = Math.min(1, p * 2.2);
          pelvisY = 0.98 - slam * 0.19;
          torsoPitch = -0.26 * slam;
          torsoYaw = 0.16 * slam;
          rHipX = 0.96 * (1 - slam) + 0.34 * slam;
          rShinX = -1.05 * (1 - slam) - 0.38 * slam;
          lHipX = -0.28 * slam;
          lShinX = -0.44 * slam;
          lArmX = 0.32 * slam;
          lArmZ = 0.34;
          rArmX = 0.24 * slam;
          rArmZ = -0.28;
          podPitchL = -0.78;
          podPitchR = -0.78;
        }
      }
    }

    // Subtle flinch kick when hit
    if (ctx.flinchTimer > 0) {
      const f = Math.min(1, ctx.flinchTimer / 0.16);
      torsoPitch += 0.18 * f;
      torsoYaw += ctx.flinchDirX * 0.2 * f;
    }

    pelvisGroup.position.set(0, pelvisY, 0);
    pelvisGroup.rotation.set(pelvisPitch, pelvisYaw, 0);
    torsoPivot.rotation.set(torsoPitch, torsoYaw, 0);
    headPivot.rotation.set(headPitch + ctx.aimPitch * 0.35, headYaw, 0);

    // Apply leg poses
    leftLeg.hip.rotation.set(lHipX, 0, lHipZ);
    leftLeg.shin.rotation.set(lShinX, 0, 0);
    rightLeg.hip.rotation.set(rHipX, 0, rHipZ);
    rightLeg.shin.rotation.set(rShinX, 0, 0);

    // Apply articulated Rear Hydraulic Anchor Outriggers:
    // Stowed (`outriggerBlend = 0`): -2.86 rad (tucked tightly upward behind calves)
    // Deployed (`outriggerBlend = 1`): -0.56 rad (swung back & stabbed down into the steel floor!)
    const outriggerAngle = THREE.MathUtils.lerp(-2.86, -0.56, outriggerBlend);
    leftLeg.outrigger.rotation.x = outriggerAngle - lShinX * 0.65;
    rightLeg.outrigger.rotation.x = outriggerAngle - rShinX * 0.65;
    // Extend hydraulic chrome piston rod slightly as anchor stabs into deck
    const rodExtend = -0.205 - outriggerBlend * 0.045;
    leftLeg.pistonRod.position.y = rodExtend;
    rightLeg.pistonRod.position.y = rodExtend;

    // Apply arm poses & keep pauldrons subtly aligned with torso without twisting sideways!
    leftArm.shoulder.rotation.set(lArmX, 0, lArmZ);
    leftArm.forearm.rotation.set(lForeX, 0, lForeZ);
    rightArm.shoulder.rotation.set(rArmX, 0, rArmZ);
    rightArm.forearm.rotation.set(rForeX, 0, rForeZ);
    pauldronL.rotation.x = lArmX * 0.22;
    pauldronR.rotation.x = rArmX * 0.22;

    // Apply independent shoulder mortar pod elevation & crisp recoil slide
    podLeft.pivot.rotation.x = podPitchL + recoilL * 0.18;
    podRight.pivot.rotation.x = podPitchR + recoilR * 0.18;
    podLeft.recoilSlide.position.y = -recoilL * 0.12;
    podRight.recoilSlide.position.y = -recoilR * 0.12;
  };

  let nextPodSide: -1 | 1 = -1;

  return {
    root,
    hitboxes: [wpLeftHitbox, wpRightHitbox, headHitbox, bodyHitbox],
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [oliveArmorMat, hazardMat],
    updateAnimation,
    getMuzzleWorldPos: (out: THREE.Vector3) => {
      const pod = nextPodSide < 0 ? podLeft : podRight;
      nextPodSide = nextPodSide < 0 ? 1 : -1;
      return pod.muzzle.getWorldPosition(out);
    },
    getPodMuzzleWorldPos: (side: -1 | 1, out: THREE.Vector3) => {
      return (side < 0 ? podLeft : podRight).muzzle.getWorldPosition(out);
    },
    getFlakMuzzleWorldPos: (out: THREE.Vector3) => flakMuzzleNode.getWorldPosition(out),
    getWeakpointWorldPos: (out: THREE.Vector3) => podRight.drumAnchor.getWorldPosition(out),
    triggerPodRecoil: (side: -1 | 1) => {
      if (side < 0) recoilL = 1;
      else recoilR = 1;
    },
    triggerFlakSpin: () => {
      flakDrumTarget += Math.PI / 3;
    },
    setTargetLaser: (active: boolean, length: number, dangerRatio: number) => {
      laserGroup.visible = active && length > 0.2;
      if (!laserGroup.visible) return;
      laserGroup.scale.set(1, 1, Math.max(0.2, length));
      const d = THREE.MathUtils.clamp(dangerRatio, 0, 1);
      laserCoreMat.color.setRGB(1.0, 0.78 - d * 0.56, 0.22 - d * 0.18);
      laserCoreMat.opacity = 0.65 + d * 0.35;
      laserHaloMat.opacity = 0.22 + d * 0.32;
    },
    dispose: () => {
      for (const g of disposedGeos) g.dispose();
      for (const m of disposedMats) m.dispose();
      if (ownsTextures) tex.dispose();
    },
  };
}
