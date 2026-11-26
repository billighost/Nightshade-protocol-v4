import * as THREE from 'three';
import {
  createBeveledBox,
  createContouredArmorPlate,
  createLoftedAnatomy,
  createSculptedHand,
} from '../../core/sculptUtils';
import type { MixamoHumanoidRig } from '../skeleton/mixamoBones';
import type { OperativeMaterialPalette } from './materials';

/**
 * Forearm surface mapper in local `leftForeArm` / `rightForeArm` bone space (`y = 0` elbow down to `y = -0.265` wrist).
 * `theta = -PI/2` is front (`-Z`), `+PI/2` is dorsal/back (`+Z`), `0` is `+X`, `PI` is `-X`.
 */
function forearmSurface(y: number, theta: number, offset: number): [number, number, number] {
  const t = THREE.MathUtils.clamp(-y / 0.265, 0, 1);
  // Natural anatomical forearm taper from muscular brachioradialis near elbow to slender wrist
  const rx = THREE.MathUtils.lerp(0.05, 0.034, Math.pow(t, 0.85));
  const rz = THREE.MathUtils.lerp(0.048, 0.032, Math.pow(t, 0.85));
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const exp = 2 / 2.2;
  const sx = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);
  const sz = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp);
  return [sx * (rx + offset), y, sz * (rz + offset)];
}

/**
 * Builds the Blender-sculpted hard-surface tactical elbow guards, faceted chamfer-beveled
 * ballistic forearm vambrace gauntlets with recessed ruby-crimson wrist-comm LED indicator,
 * and articulated 5-finger armored knuckle gloves on BOTH forearms (`rig.leftForeArm` / `rig.rightForeArm`),
 * matching `helmeted_operative_turnaround` (Front, Side, and Back views!).
 */
export function buildForearmsVambracesAndGloves(
  rig: MixamoHumanoidRig,
  mats: OperativeMaterialPalette
): void {
  for (const side of [-1, 1] as const) {
    const foreBone = side > 0 ? rig.rightForeArm : rig.leftForeArm;
    const handBone = side > 0 ? rig.rightHand : rig.leftHand;
    const outerTheta = side > 0 ? 0.14 : Math.PI - 0.14; // slightly dorsal-outer face

    // 1. Compact Flush Hexagonal Ballistic Elbow Armor Shell (stays 100% below y=0 hinge even at 120° flexion!)
    const elbowBaseContour: Array<[number, number]> = [
      [Math.PI * 0.5 - 0.5, -0.032],
      [Math.PI * 0.5 - 0.32, -0.008],
      [Math.PI * 0.5, -0.002],
      [Math.PI * 0.5 + 0.32, -0.008],
      [Math.PI * 0.5 + 0.5, -0.032],
      [Math.PI * 0.5 + 0.34, -0.06],
      [Math.PI * 0.5, -0.068],
      [Math.PI * 0.5 - 0.34, -0.06],
    ];
    const elbowRim = new THREE.Mesh(
      createContouredArmorPlate(
        elbowBaseContour,
        (u, v, off) => forearmSurface(v, u, off),
        0.007,
        0.2,
        0.003,
        2
      ),
      mats.armorSecondary
    );
    elbowRim.castShadow = true;
    foreBone.add(elbowRim);

    const elbowCapContour: Array<[number, number]> = [
      [Math.PI * 0.5 - 0.32, -0.03],
      [Math.PI * 0.5 - 0.18, -0.012],
      [Math.PI * 0.5, -0.008],
      [Math.PI * 0.5 + 0.18, -0.012],
      [Math.PI * 0.5 + 0.32, -0.03],
      [Math.PI * 0.5 + 0.2, -0.05],
      [Math.PI * 0.5, -0.056],
      [Math.PI * 0.5 - 0.2, -0.05],
    ];
    const elbowCap = new THREE.Mesh(
      createContouredArmorPlate(
        elbowCapContour,
        (u, v, off) => forearmSurface(v, u, 0.004 + off),
        0.006,
        0.24,
        0.0028,
        2
      ),
      mats.armorPrimary
    );
    elbowCap.castShadow = true;
    foreBone.add(elbowCap);

    // 2. Faceted Chamfer-Beveled Polygonal Forearm Vambrace Gauntlet (`y = -0.048 .. -0.232`)
    // Sleek angular stealth plate wrapping outer & dorsal forearm cleanly into wrist cuff
    const vambraceContour: Array<[number, number]> = [
      [outerTheta - 0.88, -0.228],
      [outerTheta + 0.96, -0.228],
      [outerTheta + 1.18, -0.145],
      [outerTheta + 1.05, -0.062],
      [outerTheta + 0.22, -0.044],
      [outerTheta - 0.78, -0.058],
      [outerTheta - 1.02, -0.145],
    ];
    const vambraceMain = new THREE.Mesh(
      createContouredArmorPlate(
        vambraceContour,
        (u, v, off) => forearmSurface(v, u, off),
        0.012,
        0.16,
        0.005,
        3
      ),
      mats.armorPrimary
    );
    vambraceMain.castShadow = true;
    vambraceMain.receiveShadow = true;
    foreBone.add(vambraceMain);

    // Secondary raised dorsal spine ridge on vambrace for crisp specular highlights
    const dorsalRidgeContour: Array<[number, number]> = [
      [outerTheta - 0.24, -0.214],
      [outerTheta + 0.24, -0.214],
      [outerTheta + 0.34, -0.095],
      [outerTheta, -0.068],
      [outerTheta - 0.34, -0.095],
    ];
    const dorsalRidge = new THREE.Mesh(
      createContouredArmorPlate(
        dorsalRidgeContour,
        (u, v, off) => forearmSurface(v, u, 0.009 + off),
        0.006,
        0.24,
        0.003,
        2
      ),
      mats.armorSecondary
    );
    foreBone.add(dorsalRidge);

    // Inner forearm reinforcement panel (sleek flush under-plate)
    const innerTheta = outerTheta + Math.PI;
    const innerPlate = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [innerTheta - 0.62, -0.22],
          [innerTheta + 0.62, -0.22],
          [innerTheta + 0.72, -0.095],
          [innerTheta - 0.72, -0.095],
        ],
        (u, v, off) => forearmSurface(v, u, off),
        0.007,
        0.18,
        0.003,
        2
      ),
      mats.armorSecondary
    );
    foreBone.add(innerPlate);

    // Twin flush matte tactical retention straps + metal cinch buckles around forearm
    for (const sy of [-0.088, -0.184]) {
      const t = THREE.MathUtils.clamp(-sy / 0.265, 0, 1);
      const r = THREE.MathUtils.lerp(0.053, 0.039, Math.pow(t, 0.85)) + 0.004;
      const strap = new THREE.Mesh(
        createLoftedAnatomy(
          [
            { y: sy - 0.009, rx: r, rz: r - 0.001, squareness: 2.25 },
            { y: sy + 0.009, rx: r, rz: r - 0.001, squareness: 2.25 },
          ],
          16,
          false,
          false
        ),
        mats.webbing
      );
      foreBone.add(strap);

      const strapBuckle = new THREE.Mesh(createBeveledBox(0.01, 0.02, 0.014, 0.002), mats.gunmetal);
      strapBuckle.position.set(-side * (r + 0.002), sy, 0.004);
      foreBone.add(strapBuckle);
    }

    // 3. Recessed Chamfered Wrist-Comm Housing + Subtle Ruby-Crimson LED Indicator
    const commPos = forearmSurface(-0.178, outerTheta, 0.011);
    const ledHousing = new THREE.Mesh(
      createBeveledBox(0.014, 0.03, 0.018, 0.003),
      mats.gunmetal
    );
    ledHousing.position.set(commPos[0], commPos[1], commPos[2]);
    foreBone.add(ledHousing);

    const crimsonLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.018, 0.009),
      mats.crimsonOpticGlow
    );
    crimsonLed.position.set(commPos[0] + side * 0.006, commPos[1], commPos[2]);
    foreBone.add(crimsonLed);

    // 4. Ribbed Ballistic Wrist Cuff Seal (overlaps wrist hinge seamlessly with zero seam gap!)
    const wristCuff = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: -0.278, rx: 0.036, rz: 0.032, squareness: 2.3 },
          { y: -0.252, rx: 0.038, rz: 0.034, squareness: 2.3 },
          { y: -0.22, rx: 0.04, rz: 0.037, squareness: 2.3 },
        ],
        16
      ),
      mats.ribbedFlex
    );
    foreBone.add(wristCuff);

    // 5. Articulated 5-Finger Armored Tactical Knuckle Glove
    const glove = createSculptedHand(
      side,
      mats.ribbedFlex,
      mats.armorPrimary,
      mats.armorSecondary
    );
    handBone.add(glove);
  }
}
