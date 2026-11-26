import * as THREE from 'three';
import { createContouredArmorPlate, createLoftedAnatomy } from '../../core/sculptUtils';
import {
  applySkinWeights,
  createBoundSkinnedMesh,
  makeWeights,
  mergeSkinnedGeometries,
  smoothstep,
} from '../../core/skinning';
import { BIND_POSE, BONE_IDX, type MixamoHumanoidRig } from '../skeleton/mixamoBones';
import type { OperativeMaterialPalette } from './materials';

function createArmWeightResolver(side: -1 | 1) {
  const shoulderIdx = side > 0 ? BONE_IDX.RightShoulder : BONE_IDX.LeftShoulder;
  const armIdx = side > 0 ? BONE_IDX.RightArm : BONE_IDX.LeftArm;
  const foreArmIdx = side > 0 ? BONE_IDX.RightForeArm : BONE_IDX.LeftForeArm;

  return (x: number, y: number, _z: number) => {
    const absX = Math.abs(x);
    const upperCap = smoothstep(1.42, 1.54, y);
    const torsoBlend = (1 - smoothstep(0.15, 0.215, absX)) * upperCap;
    const armVsShoulder = smoothstep(0.18, 0.228, absX) * (1 - upperCap * 0.32);

    const foreWeight = 1 - smoothstep(BIND_POSE.elbowY - 0.055, BIND_POSE.elbowY + 0.055, y);
    const armWeight = Math.max(0, 1 - foreWeight);

    return makeWeights([
      [BONE_IDX.Spine2, torsoBlend * 0.55],
      [shoulderIdx, torsoBlend * 0.45 + (1 - torsoBlend) * (1 - armVsShoulder) * 0.34 * armWeight],
      [armIdx, (1 - torsoBlend) * (0.66 + armVsShoulder * 0.34) * armWeight],
      [foreArmIdx, (1 - torsoBlend) * foreWeight],
    ]);
  };
}

/**
 * Exact continuous arm sleeve surface mapper for `side` (-1 Left, +1 Right) so beveled
 * polygonal shoulder pauldrons & bicep guards shrinkwrap flush with ZERO floating seams!
 */
function createArmSurfaceMapper(side: -1 | 1) {
  const armX = side * BIND_POSE.armX;
  const slices = [
    { y: 1.18, r: 0.051, cx: armX },
    { y: 1.28, r: 0.06, cx: armX },
    { y: 1.38, r: 0.067, cx: armX - side * 0.008 },
    { y: 1.46, r: 0.074, cx: armX - side * 0.022 },
    { y: 1.525, r: 0.052, cx: armX - side * 0.052 },
  ];

  return (theta: number, y: number, offset: number): [number, number, number] => {
    let lo = slices[0];
    let hi = slices[slices.length - 1];
    for (let i = 0; i < slices.length - 1; i++) {
      if (y >= slices[i].y && y <= slices[i + 1].y) {
        lo = slices[i];
        hi = slices[i + 1];
        break;
      }
    }
    const f = THREE.MathUtils.clamp((y - lo.y) / Math.max(1e-5, hi.y - lo.y), 0, 1);
    const r = THREE.MathUtils.lerp(lo.r, hi.r, f) + offset;
    const cx = THREE.MathUtils.lerp(lo.cx, hi.cx, f);
    return [cx + Math.cos(theta) * r, y, 0.002 + Math.sin(theta) * r];
  };
}

/**
 * Builds the continuous `SkinnedMesh` matte hex-carbon arm undersuit sleeves and
 * sculpted 45°-chamfer-beveled angular layered shoulder pauldrons & bicep plates
 * matching `helmeted_operative_turnaround` (Front, Side, and Back views!).
 */
export function buildSkinnedArmsAndPauldrons(
  parent: THREE.Group,
  rig: MixamoHumanoidRig,
  mats: OperativeMaterialPalette
): void {
  const hexParts: THREE.BufferGeometry[] = [];
  const armorPrimaryParts: THREE.BufferGeometry[] = [];
  const armorSecondaryParts: THREE.BufferGeometry[] = [];
  const webbingParts: THREE.BufferGeometry[] = [];
  const metalParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    const resolver = createArmWeightResolver(side);
    const mapArm = createArmSurfaceMapper(side);
    const armX = side * BIND_POSE.armX;

    // 1. Continuous Raw-Matte Tactical Combat Shirt Sleeve (slightly fuller with real 3D elbow/bicep cloth folds!)
    const sleeveGeo = createLoftedAnatomy(
      [
        { y: 0.905, rx: 0.032, rz: 0.03, offsetX: armX + side * 0.002, squareness: 2.2 },
        { y: 0.935, rx: 0.038, rz: 0.037, offsetX: armX + side * 0.003, squareness: 2.2 },
        {
          y: 1.02,
          rx: 0.048,
          rz: 0.047,
          offsetX: armX + side * 0.004,
          squareness: 2.2,
          foldAmp: 0.032,
          foldFreq: 4,
          wrinkleAmp: 0.048,
          wrinkleTilt: side * 0.4,
        },
        {
          y: 1.135,
          rx: 0.053,
          rz: 0.053,
          offsetX: armX + side * 0.002,
          foldAmp: 0.05,
          foldFreq: 5,
          wrinkleAmp: 0.082,
          wrinkleTilt: side * -0.55,
        },
        {
          y: 1.205,
          rx: 0.057,
          rz: 0.057,
          offsetX: armX,
          foldAmp: 0.048,
          foldFreq: 5,
          wrinkleAmp: 0.078,
          wrinkleTilt: side * 0.5,
        },
        {
          y: 1.29,
          rx: 0.065,
          rz: 0.066,
          offsetX: armX,
          squareness: 2.18,
          foldAmp: 0.034,
          foldFreq: 4,
          wrinkleAmp: 0.05,
        },
        { y: 1.38, rx: 0.071, rz: 0.071, offsetX: armX - side * 0.008, squareness: 2.15 },
        { y: 1.46, rx: 0.076, rz: 0.076, offsetX: armX - side * 0.022 },
        { y: 1.515, rx: 0.062, rz: 0.064, offsetX: armX - side * 0.046 },
        { y: 1.535, rx: 0.038, rz: 0.042, offsetX: armX - side * 0.072 },
      ],
      26,
      true,
      true
    );
    hexParts.push(applySkinWeights(sleeveGeo, resolver));

    // Outer shoulder center angle: 0 for Right (+X), PI for Left (-X)
    const outerA = side > 0 ? 0 : Math.PI;

    // 2. Heroic Broad Angled Hexagonal Shoulder Pauldron Cap (`y = 1.40..1.535`)
    const upperCap = createContouredArmorPlate(
      [
        [outerA - 1.22, 1.408],
        [outerA, 1.392],
        [outerA + 1.22, 1.408],
        [outerA + 0.98, 1.512],
        [outerA, 1.536],
        [outerA - 0.98, 1.512],
      ],
      (u, v, off) => mapArm(u, v, off + 0.009),
      0.018,
      0.16,
      0.0065,
      3
    );
    armorPrimaryParts.push(applySkinWeights(upperCap, resolver));

    // 3. Overlapping Mid-Deltoid Chevron Armor Plate (`y = 1.318..1.406`)
    const midDeltoid = createContouredArmorPlate(
      [
        [outerA - 1.05, 1.334],
        [outerA, 1.316],
        [outerA + 1.05, 1.334],
        [outerA + 1.08, 1.404],
        [outerA, 1.392],
        [outerA - 1.08, 1.404],
      ],
      (u, v, off) => mapArm(u, v, off + 0.004),
      0.013,
      0.16,
      0.0055,
      3
    );
    armorPrimaryParts.push(applySkinWeights(midDeltoid, resolver));

    // 4. Tactical Upper-Sleeve Velcro Patch & Zipped Sleeve Pocket (`y = 1.22..1.325`)
    const bicepGuard = createContouredArmorPlate(
      [
        [outerA - 0.78, 1.236],
        [outerA, 1.22],
        [outerA + 0.78, 1.236],
        [outerA + 0.95, 1.32],
        [outerA, 1.308],
        [outerA - 0.95, 1.32],
      ],
      (u, v, off) => mapArm(u, v, off + 0.004),
      0.011,
      0.16,
      0.0045,
      2
    );
    armorSecondaryParts.push(applySkinWeights(bicepGuard, resolver));

    // Stitched Velcro IFF Patch Panel mounted cleanly on mid-deltoid outer face
    const velcroPatch = createContouredArmorPlate(
      [
        [outerA - 0.42, 1.344],
        [outerA + 0.42, 1.344],
        [outerA + 0.42, 1.388],
        [outerA - 0.42, 1.388],
      ],
      (u, v, off) => mapArm(u, v, off + 0.016),
      0.005,
      0.18,
      0.002,
      2
    );
    webbingParts.push(applySkinWeights(velcroPatch, resolver));

    // Twin Pauldron Anchor Rivets
    for (const rOff of [-0.62, 0.62]) {
      const rp = mapArm(outerA + rOff, 1.462, 0.025);
      const rivet = new THREE.CylinderGeometry(0.0042, 0.0042, 0.006, 8);
      rivet.rotateZ(Math.PI * 0.5);
      rivet.translate(rp[0], rp[1], rp[2]);
      metalParts.push(applySkinWeights(rivet, resolver));
    }
  }

  parent.add(
    createBoundSkinnedMesh(
      mergeSkinnedGeometries(hexParts),
      mats.hexUndersuit,
      rig.skeleton,
      'Skinned_HexArmSleeves'
    )
  );
  parent.add(
    createBoundSkinnedMesh(
      mergeSkinnedGeometries(armorPrimaryParts),
      mats.armorPrimary,
      rig.skeleton,
      'Skinned_BeveledPauldrons'
    )
  );
  parent.add(
    createBoundSkinnedMesh(
      mergeSkinnedGeometries(armorSecondaryParts),
      mats.armorSecondary,
      rig.skeleton,
      'Skinned_BeveledBicepGuards'
    )
  );
  parent.add(
    createBoundSkinnedMesh(
      mergeSkinnedGeometries(webbingParts),
      mats.webbing,
      rig.skeleton,
      'Skinned_ArmVelcroPatches'
    )
  );
  parent.add(
    createBoundSkinnedMesh(
      mergeSkinnedGeometries(metalParts),
      mats.gunmetal,
      rig.skeleton,
      'Skinned_PauldronRivets'
    )
  );
}
