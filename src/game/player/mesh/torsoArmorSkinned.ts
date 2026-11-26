import * as THREE from 'three';
import {
  createBeveledBox,
  createContouredArmorPlate,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createStrapTube,
} from '../../core/sculptUtils';
import {
  applySkinWeights,
  createBoundSkinnedMesh,
  makeWeights,
  mergeSkinnedGeometries,
  smoothstep,
} from '../../core/skinning';
import { BONE_IDX, type MixamoHumanoidRig } from '../skeleton/mixamoBones';
import type { OperativeMaterialPalette } from './materials';

/**
 * Exact continuous torso surface profile matching `undersuitTorso` slices so every
 * chamfered polygonal armor plate shrinkwraps flush with ZERO floating gaps!
 */
const TORSO_PROFILE = [
  { y: 0.93, rx: 0.152, rz: 0.114, oz: 0.004 },
  { y: 1.03, rx: 0.156, rz: 0.119, oz: 0.003 },
  { y: 1.15, rx: 0.172, rz: 0.132, oz: 0.001 },
  { y: 1.28, rx: 0.198, rz: 0.146, oz: -0.002 },
  { y: 1.40, rx: 0.214, rz: 0.144, oz: -0.001 },
  { y: 1.485, rx: 0.194, rz: 0.124, oz: 0.004 },
  { y: 1.54, rx: 0.118, rz: 0.098, oz: 0.005 },
];

function mapTorsoSurface(theta: number, y: number, offset: number): [number, number, number] {
  let lo = TORSO_PROFILE[0];
  let hi = TORSO_PROFILE[TORSO_PROFILE.length - 1];
  for (let i = 0; i < TORSO_PROFILE.length - 1; i++) {
    if (y >= TORSO_PROFILE[i].y && y <= TORSO_PROFILE[i + 1].y) {
      lo = TORSO_PROFILE[i];
      hi = TORSO_PROFILE[i + 1];
      break;
    }
  }
  const f = THREE.MathUtils.clamp((y - lo.y) / Math.max(1e-5, hi.y - lo.y), 0, 1);
  const rx = THREE.MathUtils.lerp(lo.rx, hi.rx, f);
  const rz = THREE.MathUtils.lerp(lo.rz, hi.rz, f);
  const oz = THREE.MathUtils.lerp(lo.oz, hi.oz, f);

  // Subtle superquadric chest/back squaring (matches createLoftedAnatomy squareness ~2.3!)
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const exp = 2 / 2.3;
  const sx = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);
  const sz = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp);
  const frontBoost = sinT < 0 ? 1.04 : 1.03;

  const x = sx * (rx + offset);
  const z = oz + sz * (rz * frontBoost + offset);
  return [x, y, z];
}

function resolveTorsoWeights(x: number, y: number, _z: number) {
  const wSpine1 = smoothstep(0.99, 1.18, y) * (1 - smoothstep(1.22, 1.38, y));
  const wSpine2 = smoothstep(1.2, 1.38, y);
  const wSpine = Math.max(0, 1 - wSpine1 - wSpine2);
  const wHips = (1 - smoothstep(0.93, 1.04, y)) * 0.45;

  const absX = Math.abs(x);
  const shoulderZone = smoothstep(0.155, 0.225, absX) * smoothstep(1.36, 1.48, y);
  const sBone = x >= 0 ? BONE_IDX.RightShoulder : BONE_IDX.LeftShoulder;
  const aBone = x >= 0 ? BONE_IDX.RightArm : BONE_IDX.LeftArm;

  return makeWeights([
    [BONE_IDX.Hips, wHips],
    [BONE_IDX.Spine, wSpine * (1 - shoulderZone)],
    [BONE_IDX.Spine1, wSpine1 * (1 - shoulderZone)],
    [BONE_IDX.Spine2, wSpine2 * (1 - shoulderZone * 0.72)],
    [sBone, shoulderZone * 0.58],
    [aBone, shoulderZone * 0.42],
  ]);
}

/**
 * Builds the Blender-style Shrinkwrapped + 45° Chamfer-Beveled Spec-Ops Stealth Torso Carapace
 * matching `helmeted_operative_turnaround` (Front, Side, and Back views!) 1:1:
 * - Matte charcoal hex-carbon undersuit with heroic broad trapezius shoulder taper
 * - Sculpted collar yoke + twin collar plates + left-rear tactical whip antenna
 * - Front: Split angular hexagonal pectoral plates with sharp upward `^` center V-chevron seam,
 *   nested matching `^` chevron mid-abdomen armor plate, tapered lower-ab plate,
 *   and razor-thin recessed crimson under-seam piping!
 * - Back: Split angular scapula wing plates angling into a sharp Y-spine notch + angular
 *   lumbar chevron armor plate + recessed subtle crimson seam!
 */
export function buildSkinnedTorsoArmor(
  parent: THREE.Group,
  rig: MixamoHumanoidRig,
  mats: OperativeMaterialPalette
): void {
  const hexParts: THREE.BufferGeometry[] = [];
  const armorPrimaryParts: THREE.BufferGeometry[] = [];
  const armorSecondaryParts: THREE.BufferGeometry[] = [];
  const webbingParts: THREE.BufferGeometry[] = [];
  const crimsonParts: THREE.BufferGeometry[] = [];
  const metalParts: THREE.BufferGeometry[] = [];

  // =========================================================================
  // 1. CONTINUOUS MATTE CHARCOAL HEX-CARBON UNDERSUIT TORSO (Broad Athletic Taper!)
  // =========================================================================
  const undersuitTorso = createLoftedAnatomy(
    [
      { y: 0.93, rx: 0.152, rz: 0.114, offsetZ: 0.004, squareness: 2.25 },
      { y: 1.03, rx: 0.156, rz: 0.119, offsetZ: 0.003, squareness: 2.28 },
      { y: 1.15, rx: 0.172, rz: 0.132, offsetZ: 0.001, frontScale: 1.04, backScale: 1.03, squareness: 2.3 },
      { y: 1.28, rx: 0.198, rz: 0.146, offsetZ: -0.002, frontScale: 1.04, backScale: 1.03, squareness: 2.3 },
      { y: 1.40, rx: 0.214, rz: 0.144, offsetZ: -0.001, frontScale: 1.04, backScale: 1.03, squareness: 2.3 },
      { y: 1.485, rx: 0.194, rz: 0.124, offsetZ: 0.004, squareness: 2.2 },
      { y: 1.54, rx: 0.118, rz: 0.098, offsetZ: 0.005, squareness: 2.15 },
    ],
    28,
    true,
    true
  );
  hexParts.push(applySkinWeights(undersuitTorso, resolveTorsoWeights));

  // =========================================================================
  // 2. HEROIC ARMORED TRAPEZIUS YOKE, COLLAR & COMMS WHIP ANTENNA
  //    collarYoke ends cleanly at y=1.556 and collarRim wraps outside (+6mm) with ZERO overlap z-fighting!
  // =========================================================================
  const collarYoke = createLoftedAnatomy(
    [
      { y: 1.462, rx: 0.178, rz: 0.132, offsetZ: 0.004, squareness: 2.28 },
      { y: 1.515, rx: 0.132, rz: 0.112, offsetZ: 0.004, squareness: 2.2 },
      { y: 1.556, rx: 0.102, rz: 0.097, offsetZ: 0.004, squareness: 2.15 },
    ],
    28,
    true,
    true
  );
  armorSecondaryParts.push(applySkinWeights(collarYoke, resolveTorsoWeights));

  const collarRim = createCurvedPanelGeometry(
    [
      { y: 1.552, rx: 0.107, rz: 0.102, thickness: 0.011, offsetZ: 0.004 },
      { y: 1.59, rx: 0.102, rz: 0.098, thickness: 0.01, offsetZ: 0.004 },
    ],
    -Math.PI * 0.96,
    Math.PI * 1.04,
    28
  );
  armorPrimaryParts.push(applySkinWeights(collarRim, resolveTorsoWeights));

  // Subtle left-rear tactical comms pod & whip antenna (exact Front/Back match!)
  const antennaPod = new THREE.BoxGeometry(0.028, 0.052, 0.024);
  antennaPod.rotateZ(0.2);
  antennaPod.translate(-0.106, 1.488, 0.104);
  armorSecondaryParts.push(applySkinWeights(antennaPod, resolveTorsoWeights));

  const whipAntenna = new THREE.CylinderGeometry(0.0022, 0.0038, 0.19, 8);
  whipAntenna.rotateZ(0.24);
  whipAntenna.rotateX(0.08);
  whipAntenna.translate(-0.134, 1.605, 0.104);
  metalParts.push(applySkinWeights(whipAntenna, resolveTorsoWeights));

  // =========================================================================
  // 3. FRONT BEVELED POLYGONAL V-CHEVRON CHEST CARAPACE (EXACT Front Turnaround!)
  // =========================================================================
  for (const side of [-1, 1] as const) {
    // 3A. Broad Split Hexagonal Pectoral Armor Plate (spans full chest width to deltoid crease!)
    const pecContourRaw: Array<[number, number]> = [
      [-Math.PI * 0.5 + side * 0.036, 1.298], // sharp center V-peak (`^`)!
      [-Math.PI * 0.5 + side * 0.68, 1.23], // lower outer rib point
      [-Math.PI * 0.5 + side * 0.92, 1.352], // broad outer deltoid wing edge
      [-Math.PI * 0.5 + side * 0.68, 1.476], // upper shoulder strap corner
      [-Math.PI * 0.5 + side * 0.24, 1.498], // upper clavicle corner meeting collar gorget!
      [-Math.PI * 0.5 + side * 0.036, 1.452], // upper sternum split
    ];
    const pecContour = side > 0 ? pecContourRaw : [...pecContourRaw].reverse();
    const pecPlate = createContouredArmorPlate(pecContour, mapTorsoSurface, 0.017, 0.14, 0.006, 3);
    armorPrimaryParts.push(applySkinWeights(pecPlate, resolveTorsoWeights));

    // Upper trapezius shoulder-bridge strap connecting pec plate seamlessly over shoulder to backplate!
    const trapStrap = createStrapTube(
      [
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.48, 1.474, 0.008)),
        new THREE.Vector3(side * 0.138, 1.522, -0.01),
        new THREE.Vector3(side * 0.132, 1.51, 0.068),
        new THREE.Vector3(...mapTorsoSurface(Math.PI * 0.5 - side * 0.48, 1.47, 0.008)),
      ],
      0.019,
      0.45,
      14
    );
    armorSecondaryParts.push(applySkinWeights(trapStrap, resolveTorsoWeights));

    // RAZOR-THIN recessed crimson under-seam piping tucked TIGHT along the broad V-chevron pec edge!
    const pecCrimson = createStrapTube(
      [
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.02, 1.288, 0.004)),
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.4, 1.248, 0.004)),
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.72, 1.22, 0.004)),
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.9, 1.305, 0.004)),
      ],
      0.0023,
      0.6,
      12
    );
    crimsonParts.push(applySkinWeights(pecCrimson, resolveTorsoWeights));

    // Thin vertical-angled crimson flank seam framing the mid/lower abdomen armor!
    const abCrimson = createStrapTube(
      [
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.62, 1.21, 0.003)),
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.54, 1.12, 0.003)),
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + side * 0.45, 1.005, 0.003)),
      ],
      0.0022,
      0.6,
      10
    );
    crimsonParts.push(applySkinWeights(abCrimson, resolveTorsoWeights));
  }

  // 3B. Broad Nested Mid-Abdomen `^` Chevron Armor Plate (mirrors the exact V-chevron peak of pec plates!)
  const midAbChevron = createContouredArmorPlate(
    [
      [-Math.PI * 0.5 - 0.6, 1.148], // left lower wing
      [-Math.PI * 0.5, 1.198], // bottom center V-arch!
      [-Math.PI * 0.5 + 0.6, 1.148], // right lower wing
      [-Math.PI * 0.5 + 0.64, 1.218], // right upper wing
      [-Math.PI * 0.5, 1.28], // sharp top center `^` chevron peak!
      [-Math.PI * 0.5 - 0.64, 1.218], // left upper wing
    ],
    mapTorsoSurface,
    0.015,
    0.15,
    0.0055,
    3
  );
  armorPrimaryParts.push(applySkinWeights(midAbChevron, resolveTorsoWeights));

  // 3C. Lower-Abdomen Tapered Shield Plate (`y = 0.992..1.182` nesting neatly under mid-ab arch!)
  const lowerAbShield = createContouredArmorPlate(
    [
      [-Math.PI * 0.5 - 0.42, 0.992],
      [-Math.PI * 0.5 + 0.42, 0.992],
      [-Math.PI * 0.5 + 0.5, 1.132],
      [-Math.PI * 0.5, 1.18], // top center chevron peak fitting snugly into mid-ab arch!
      [-Math.PI * 0.5 - 0.5, 1.132],
    ],
    mapTorsoSurface,
    0.014,
    0.15,
    0.005,
    3
  );
  armorPrimaryParts.push(applySkinWeights(lowerAbShield, resolveTorsoWeights));

  // 3D. Spec-Ops Chest Micro-Details: Shoulder Harness Buckles, Plate Fastener Rivets & MOLLE Strips!
  for (const side of [-1, 1] as const) {
    // Quick-release shoulder harness clip buckle resting on upper clavicle strap
    const bucklePos = mapTorsoSurface(-Math.PI * 0.5 + side * 0.48, 1.445, 0.02);
    const buckle = createBeveledBox(0.032, 0.038, 0.015, 0.003);
    buckle.rotateY(side * -0.35);
    buckle.translate(bucklePos[0], bucklePos[1], bucklePos[2]);
    metalParts.push(applySkinWeights(buckle, resolveTorsoWeights));

    // Recessed chest plate corner hex-rivets (breaks up broad armor faces!)
    for (const [uOff, yRiv] of [
      [0.14, 1.428],
      [0.64, 1.438],
      [0.64, 1.265],
    ]) {
      const rp = mapTorsoSurface(-Math.PI * 0.5 + side * uOff, yRiv, 0.018);
      const rivet = new THREE.CylinderGeometry(0.0042, 0.0042, 0.007, 8);
      rivet.rotateX(Math.PI * 0.5);
      rivet.translate(rp[0], rp[1], rp[2]);
      metalParts.push(applySkinWeights(rivet, resolveTorsoWeights));
    }

    // 2 Horizontal MOLLE Webbing Loops on Mid-Lower Rib Cummerbund
    for (const yMolle of [1.148, 1.078]) {
      const uMid = side > 0 ? -0.18 : Math.PI + 0.18;
      const mp = mapTorsoSurface(uMid, yMolle, 0.012);
      const mollePouch = createBeveledBox(0.032, 0.052, 0.068, 0.005);
      mollePouch.translate(mp[0], mp[1], mp[2]);
      webbingParts.push(applySkinWeights(mollePouch, resolveTorsoWeights));
    }
  }

  // Twin horizontal MOLLE PALS webbing bars across lower abdomen plate
  for (const yBar of [1.055, 1.095]) {
    const bar = createStrapTube(
      [
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 - 0.36, yBar, 0.016)),
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5, yBar, 0.018)),
        new THREE.Vector3(...mapTorsoSurface(-Math.PI * 0.5 + 0.36, yBar, 0.016)),
      ],
      0.0055,
      0.42,
      12
    );
    webbingParts.push(applySkinWeights(bar, resolveTorsoWeights));
  }

  // =========================================================================
  // 4. SIDE OBLIQUE RIB ARMOR STRAPS (Flush tactical rib cummerbund — Side view!)
  // =========================================================================
  for (const side of [-1, 1] as const) {
    for (const [yF, yB] of [
      [1.19, 1.25],
      [1.09, 1.14],
    ]) {
      const uMid = side > 0 ? 0.0 : Math.PI;
      const uF = -Math.PI * 0.5 + side * 0.62;
      const uB = Math.PI * 0.5 - side * 0.62;
      const strap = createStrapTube(
        [
          new THREE.Vector3(...mapTorsoSurface(uF, yF, 0.004)),
          new THREE.Vector3(...mapTorsoSurface(uMid, (yF + yB) * 0.5, 0.004)),
          new THREE.Vector3(...mapTorsoSurface(uB, yB, 0.004)),
        ],
        0.011,
        0.45,
        12
      );
      armorSecondaryParts.push(applySkinWeights(strap, resolveTorsoWeights));
    }
  }

  // =========================================================================
  // 5. REAR BEVELED SPLIT WING BACKPLATE & LUMBAR SHIELD (EXACT Back Turnaround!)
  //    NO giant oval turtle shell or thick red loop! Crisp split angular stealth wings!
  // =========================================================================
  for (const side of [-1, 1] as const) {
    // Upper Left/Right Sculpted Scapula Wing Armor Plate (angling into sharp Y-spine center!)
    const wingRaw: Array<[number, number]> = [
      [Math.PI * 0.5 - side * 0.04, 1.248], // bottom inner spine point
      [Math.PI * 0.5 - side * 0.04, 1.482], // upper inner trapezius corner
      [Math.PI * 0.5 - side * 0.48, 1.485], // upper shoulder strap corner
      [Math.PI * 0.5 - side * 0.74, 1.382], // outer shoulder blade wing tip
      [Math.PI * 0.5 - side * 0.52, 1.275], // lower outer angle
    ];
    const wingContour = side > 0 ? wingRaw : [...wingRaw].reverse();
    const wingPlate = createContouredArmorPlate(wingContour, mapTorsoSurface, 0.016, 0.15, 0.006, 3);
    armorPrimaryParts.push(applySkinWeights(wingPlate, resolveTorsoWeights));

    // Razor-thin recessed crimson diagonal seam tucked cleanly under rear scapula wing & lumbar edge!
    const rearCrimson = createStrapTube(
      [
        new THREE.Vector3(...mapTorsoSurface(Math.PI * 0.5 - side * 0.03, 1.236, 0.003)),
        new THREE.Vector3(...mapTorsoSurface(Math.PI * 0.5 - side * 0.48, 1.26, 0.003)),
        new THREE.Vector3(...mapTorsoSurface(Math.PI * 0.5 - side * 0.44, 1.13, 0.003)),
        new THREE.Vector3(...mapTorsoSurface(Math.PI * 0.5 - side * 0.36, 1.005, 0.003)),
      ],
      0.0022,
      0.6,
      12
    );
    crimsonParts.push(applySkinWeights(rearCrimson, resolveTorsoWeights));
  }

  // Lower-Back Angular Lumbar V-Plate (EXACT Back Turnaround!)
  const lumbarPlate = createContouredArmorPlate(
    [
      [Math.PI * 0.5 - 0.34, 1.002],
      [Math.PI * 0.5 + 0.34, 1.002],
      [Math.PI * 0.5 + 0.46, 1.225],
      [Math.PI * 0.5, 1.258], // fits cleanly up into scapula V-notch!
      [Math.PI * 0.5 - 0.46, 1.225],
    ],
    mapTorsoSurface,
    0.014,
    0.16,
    0.0055,
    3
  );
  armorPrimaryParts.push(applySkinWeights(lumbarPlate, resolveTorsoWeights));

  // =========================================================================
  // 6. MERGE & BIND SKINNED MESHES TO `rig.skeleton`
  // =========================================================================
  const addSkinned = (geos: THREE.BufferGeometry[], mat: THREE.Material, name: string) => {
    if (geos.length === 0) return;
    parent.add(createBoundSkinnedMesh(mergeSkinnedGeometries(geos), mat, rig.skeleton, name));
  };

  addSkinned(hexParts, mats.hexUndersuit, 'Skinned_HexUndersuitTorso');
  addSkinned(armorPrimaryParts, mats.armorPrimary, 'Skinned_BeveledTorsoCarapace');
  addSkinned(armorSecondaryParts, mats.armorSecondary, 'Skinned_TorsoTrimAndStraps');
  addSkinned(webbingParts, mats.webbing, 'Skinned_TorsoMolleAndPouches');
  addSkinned(crimsonParts, mats.crimsonPiping, 'Skinned_TorsoCrimsonSeams');
  addSkinned(metalParts, mats.gunmetal, 'Skinned_TorsoHardware');
}
