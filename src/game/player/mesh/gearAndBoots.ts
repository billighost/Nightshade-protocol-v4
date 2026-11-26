import * as THREE from 'three';
import {
  createBeveledBox,
  createContouredArmorPlate,
  createLoftedAnatomy,
} from '../../core/sculptUtils';
import type { MixamoHumanoidRig } from '../skeleton/mixamoBones';
import type { OperativeMaterialPalette } from './materials';

/**
 * Local `leftLeg` / `rightLeg` shin surface mapper (`y = 0` knee joint down to `y = -0.39` ankle).
 * Calibrated cleanly over the fuller Crye-G3 tactical combat trousers so knee pads, greaves,
 * and calf straps seat flush with ZERO fabric clipping!
 */
function shinSurface(y: number, theta: number, offset: number): [number, number, number] {
  const t = THREE.MathUtils.clamp((y + 0.36) / 0.43, 0, 1); // 0 at ankle (-0.36), 1 at upper knee (+0.07)
  const calfBulge = Math.sin(t * Math.PI) * 0.008;
  const rx = THREE.MathUtils.lerp(0.074, 0.088, Math.pow(t, 0.65)) + calfBulge * 0.5;
  const rz = THREE.MathUtils.lerp(0.08, 0.094, Math.pow(t, 0.65)) + calfBulge;
  const oz = THREE.MathUtils.lerp(0.001, 0.004, t) + (t > 0.2 && t < 0.75 ? 0.004 : 0);

  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const exp = 2 / 2.22;
  const sx = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);
  const sz = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp);
  const zScale = sinT > 0 ? 1.09 : 1.02;
  return [sx * (rx + offset), y, oz + sz * (rz * zScale + offset)];
}

/**
 * Builds the rigid raw-matte armored tactical leg hardware & spec-ops footwear fitted
 * cleanly over the fuller Crye-G3 combat trousers:
 * - Articulated Crye-style molded ballistic knee pads with perimeter bolts & retention straps
 * - Tapered front shin armor plate (leaving generous wrinkled ripstop trouser fabric visible!)
 * - Right-thigh dual-strap drop-leg pistol holster & left-thigh armored mag/utility rig
 * - Weathered suede/leather spec-ops combat boots with lace eye-stays, toe scuff bumper,
 *   heel counter, and lugged outsole sitting dead flush at `y = -0.100` (world `y = 0.000`!).
 */
export function buildLegGearAndBoots(
  rig: MixamoHumanoidRig,
  mats: OperativeMaterialPalette
): void {
  // =========================================================================
  // 1. INTEGRATED CRYE-STYLE KNEE PADS + COMPACT FRONT TIBIAL GUARDS
  // =========================================================================
  for (const side of [-1, 1] as const) {
    const legBone = side > 0 ? rig.rightLeg : rig.leftLeg;
    const armorGroup = new THREE.Group();
    legBone.add(armorGroup);

    // 1A. Molded Perimeter Knee Pad Frame + Hard Ballistic Patella Shell
    const kneeRim = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [-Math.PI * 0.5 - 0.64, -0.018],
          [-Math.PI * 0.5 - 0.44, 0.028],
          [-Math.PI * 0.5, 0.044],
          [-Math.PI * 0.5 + 0.44, 0.028],
          [-Math.PI * 0.5 + 0.64, -0.018],
          [-Math.PI * 0.5 + 0.44, -0.06],
          [-Math.PI * 0.5, -0.072],
          [-Math.PI * 0.5 - 0.44, -0.06],
        ],
        (u, v, off) => shinSurface(v, u, off + 0.003),
        0.01,
        0.16,
        0.004,
        3
      ),
      mats.armorSecondary
    );
    kneeRim.castShadow = true;
    armorGroup.add(kneeRim);

    const kneeCap = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [-Math.PI * 0.5 - 0.42, -0.016],
          [-Math.PI * 0.5 - 0.26, 0.02],
          [-Math.PI * 0.5, 0.032],
          [-Math.PI * 0.5 + 0.26, 0.02],
          [-Math.PI * 0.5 + 0.42, -0.016],
          [-Math.PI * 0.5 + 0.28, -0.048],
          [-Math.PI * 0.5, -0.056],
          [-Math.PI * 0.5 - 0.28, -0.048],
        ],
        (u, v, off) => shinSurface(v, u, 0.01 + off),
        0.009,
        0.22,
        0.0045,
        2
      ),
      mats.armorPrimary
    );
    kneeCap.castShadow = true;
    armorGroup.add(kneeCap);

    // 4 Corner Micro-Fastener Bolts on Knee Pad
    for (const [du, dv] of [
      [-0.36, 0.018],
      [0.36, 0.018],
      [-0.34, -0.046],
      [0.34, -0.046],
    ]) {
      const bp = shinSurface(dv, -Math.PI * 0.5 + du, 0.014);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 8), mats.gunmetal);
      bolt.rotation.x = Math.PI * 0.5;
      bolt.position.set(bp[0], bp[1], bp[2]);
      armorGroup.add(bolt);
    }

    // 1B. Compact Tapered Front Shin Plate (`y = -0.32 .. -0.095`)
    // Narrower than before so the fuller wrinkled ripstop combat trousers remain prominently visible!
    const shinGreave = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [-Math.PI * 0.5 - 0.56, -0.315],
          [-Math.PI * 0.5, -0.33],
          [-Math.PI * 0.5 + 0.56, -0.315],
          [-Math.PI * 0.5 + 0.68, -0.205],
          [-Math.PI * 0.5 + 0.6, -0.112],
          [-Math.PI * 0.5 + 0.28, -0.092],
          [-Math.PI * 0.5, -0.104],
          [-Math.PI * 0.5 - 0.28, -0.092],
          [-Math.PI * 0.5 - 0.6, -0.112],
          [-Math.PI * 0.5 - 0.68, -0.205],
        ],
        (u, v, off) => shinSurface(v, u, off + 0.003),
        0.01,
        0.16,
        0.004,
        3
      ),
      mats.armorPrimary
    );
    shinGreave.castShadow = true;
    shinGreave.receiveShadow = true;
    armorGroup.add(shinGreave);

    // Raised matte central tibial ridge
    const shinSpine = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [-Math.PI * 0.5 - 0.18, -0.305],
          [-Math.PI * 0.5 + 0.18, -0.305],
          [-Math.PI * 0.5 + 0.24, -0.168],
          [-Math.PI * 0.5, -0.122],
          [-Math.PI * 0.5 - 0.24, -0.168],
        ],
        (u, v, off) => shinSurface(v, u, 0.011 + off),
        0.006,
        0.24,
        0.003,
        2
      ),
      mats.armorSecondary
    );
    armorGroup.add(shinSpine);

    // Twin Crye-G3 Knee/Calf Cinch Webbing Straps with Quick-Release Buckles (tightly fitted onto shinSurface!)
    for (const sy of [-0.048, -0.158, -0.275]) {
      const t = THREE.MathUtils.clamp((sy + 0.36) / 0.43, 0, 1);
      const calfBulge = Math.sin(t * Math.PI) * 0.008;
      const rx = THREE.MathUtils.lerp(0.076, 0.09, Math.pow(t, 0.65)) + calfBulge * 0.5 + 0.002;
      const rz = THREE.MathUtils.lerp(0.082, 0.096, Math.pow(t, 0.65)) + calfBulge + 0.002;
      const oz = THREE.MathUtils.lerp(0.001, 0.004, t) + (t > 0.2 && t < 0.75 ? 0.004 : 0);
      const strap = new THREE.Mesh(
        createLoftedAnatomy(
          [
            { y: sy - 0.01, rx, rz, offsetZ: oz, backScale: 1.09, frontScale: 1.02, squareness: 2.22 },
            { y: sy + 0.01, rx, rz, offsetZ: oz, backScale: 1.09, frontScale: 1.02, squareness: 2.22 },
          ],
          22,
          false,
          false
        ),
        mats.webbing
      );
      armorGroup.add(strap);

      // Compact flush outer cinch buckle
      const buckle = new THREE.Mesh(createBeveledBox(0.008, 0.02, 0.017, 0.0025), mats.gunmetal);
      buckle.position.set(side * (rx + 0.001), sy, oz + 0.004);
      armorGroup.add(buckle);
    }
  }

  // =========================================================================
  // 2. RIGHT-THIGH DUAL-STRAP CHAMFERED DROP-LEG PISTOL HOLSTER (`rig.rightUpLeg`)
  //    Sized cleanly over the fuller combat trouser thigh (`rx: 0.114`)!
  // =========================================================================
  const holsterRig = new THREE.Group();
  holsterRig.position.set(0, -0.155, 0);
  rig.rightUpLeg.add(holsterRig);

  for (const sy of [-0.046, 0.036]) {
    const legStrap = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: sy - 0.012, rx: 0.123, rz: 0.13, offsetZ: 0.007, backScale: 1.14, squareness: 2.25 },
          { y: sy + 0.012, rx: 0.123, rz: 0.13, offsetZ: 0.007, backScale: 1.14, squareness: 2.25 },
        ],
        24,
        false,
        false
      ),
      mats.webbing
    );
    holsterRig.add(legStrap);
  }

  const dropStrapR = new THREE.Mesh(createBeveledBox(0.015, 0.166, 0.036, 0.003), mats.webbing);
  dropStrapR.position.set(0.122, 0.114, 0);
  holsterRig.add(dropStrapR);

  const holsterShell = new THREE.Mesh(
    createBeveledBox(0.042, 0.164, 0.09, 0.007),
    mats.armorSecondary
  );
  holsterShell.position.set(0.136, -0.005, -0.006);
  holsterShell.castShadow = true;
  holsterRig.add(holsterShell);

  const holsterGuard = new THREE.Mesh(
    createBeveledBox(0.047, 0.028, 0.096, 0.005),
    mats.gunmetal
  );
  holsterGuard.position.set(0.136, 0.054, -0.006);
  holsterRig.add(holsterGuard);

  // =========================================================================
  // 3. LEFT-THIGH DUAL-STRAP ARMORED CARGO RIG (`rig.leftUpLeg`)
  // =========================================================================
  const leftThighRig = new THREE.Group();
  leftThighRig.position.set(0, -0.165, 0);
  rig.leftUpLeg.add(leftThighRig);

  for (const sy of [-0.044, 0.034]) {
    const legStrap = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: sy - 0.012, rx: 0.123, rz: 0.13, offsetZ: 0.007, backScale: 1.14, squareness: 2.25 },
          { y: sy + 0.012, rx: 0.123, rz: 0.13, offsetZ: 0.007, backScale: 1.14, squareness: 2.25 },
        ],
        24,
        false,
        false
      ),
      mats.webbing
    );
    leftThighRig.add(legStrap);
  }

  const dropStrapL = new THREE.Mesh(createBeveledBox(0.015, 0.166, 0.036, 0.003), mats.webbing);
  dropStrapL.position.set(-0.122, 0.118, 0);
  leftThighRig.add(dropStrapL);

  const cargoPouchBody = new THREE.Mesh(
    createBeveledBox(0.044, 0.144, 0.102, 0.008),
    mats.webbing
  );
  cargoPouchBody.position.set(-0.137, -0.012, 0.006);
  cargoPouchBody.castShadow = true;
  leftThighRig.add(cargoPouchBody);

  const cargoPouchFlap = new THREE.Mesh(
    createBeveledBox(0.05, 0.042, 0.106, 0.006),
    mats.armorSecondary
  );
  cargoPouchFlap.position.set(-0.139, 0.042, 0.006);
  leftThighRig.add(cargoPouchFlap);

  const cargoBuckle = new THREE.Mesh(
    createBeveledBox(0.012, 0.024, 0.022, 0.003),
    mats.gunmetal
  );
  cargoBuckle.position.set(-0.163, 0.018, 0.006);
  leftThighRig.add(cargoBuckle);

  // =========================================================================
  // 4. WEATHERED MATTE SPEC-OPS TACTICAL COMBAT BOOTS (`rig.leftFoot` / `rig.rightFoot`)
  //    Every boot outsole sits dead flush at local y = -0.100 (world y = 0.000)!
  // =========================================================================
  for (const side of [-1, 1] as const) {
    const footBone = side > 0 ? rig.rightFoot : rig.leftFoot;
    const boot = new THREE.Group();
    footBone.add(boot);

    // Padded Combat Boot Collar & Leather Ankle Shaft (bloused trousers overhang cleanly right above!)
    const shaft = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: -0.058, rx: 0.055, rz: 0.072, offsetZ: -0.014, squareness: 2.35 },
          { y: 0.004, rx: 0.056, rz: 0.068, offsetZ: -0.005, squareness: 2.3 },
          { y: 0.066, rx: 0.062, rz: 0.072, offsetZ: -0.002, squareness: 2.28 },
        ],
        20
      ),
      mats.bootLeather
    );
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    boot.add(shaft);

    // Padded Cordura Boot Top Collar Rim
    const bootCollar = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: 0.052, rx: 0.064, rz: 0.074, offsetZ: -0.002, squareness: 2.28 },
          { y: 0.074, rx: 0.065, rz: 0.075, offsetZ: -0.002, squareness: 2.28 },
        ],
        18
      ),
      mats.webbing
    );
    boot.add(bootCollar);

    // Sculpted ballistic armored vamp & reinforced beveled toe cap
    const vamp = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: -0.078, rx: 0.059, rz: 0.122, offsetZ: -0.074, frontScale: 1.06, squareness: 2.5 },
          { y: -0.048, rx: 0.056, rz: 0.11, offsetZ: -0.066, frontScale: 1.03, squareness: 2.4 },
          { y: -0.022, rx: 0.048, rz: 0.075, offsetZ: -0.042, squareness: 2.3 },
        ],
        20
      ),
      mats.bootLeather
    );
    vamp.castShadow = true;
    vamp.receiveShadow = true;
    boot.add(vamp);

    // 4 Criss-Cross Boot Lacing Bars + Metal Eyelets along front boot tongue!
    for (let l = 0; l < 4; l++) {
      const ly = -0.02 + l * 0.02;
      const lz = -0.074 + l * 0.004;
      const lace = new THREE.Mesh(createBeveledBox(0.036, 0.006, 0.008, 0.0015), mats.webbing);
      lace.position.set(0, ly, lz);
      boot.add(lace);

      for (const es of [-1, 1] as const) {
        const eyelet = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.005, 6), mats.gunmetal);
        eyelet.rotation.x = Math.PI * 0.5;
        eyelet.position.set(es * 0.02, ly, lz + 0.002);
        boot.add(eyelet);
      }
    }

    // Rubberized Scuff Toe Bumper Guard
    const toeCap = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: -0.08, rx: 0.056, rz: 0.046, offsetZ: -0.156, squareness: 2.6 },
          { y: -0.056, rx: 0.05, rz: 0.038, offsetZ: -0.15, squareness: 2.5 },
        ],
        16
      ),
      mats.bootRubber
    );
    boot.add(toeCap);

    // Faceted armored instep bridge plate across upper boot
    const instepPlate = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [-Math.PI * 0.5 - 0.88, -0.056],
          [-Math.PI * 0.5 + 0.88, -0.056],
          [-Math.PI * 0.5 + 0.72, -0.024],
          [-Math.PI * 0.5, -0.016],
          [-Math.PI * 0.5 - 0.72, -0.024],
        ],
        (u, v, off) => {
          const rx = 0.058 + off;
          const rz = 0.073 + off;
          return [Math.cos(u) * rx, v, -0.058 + Math.sin(u) * rz];
        },
        0.009,
        0.2,
        0.004,
        2
      ),
      mats.armorSecondary
    );
    boot.add(instepPlate);

    // Heavy molded midsole & heel block
    const midsole = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: -0.094, rx: 0.063, rz: 0.13, offsetZ: -0.073, squareness: 2.75 },
          { y: -0.072, rx: 0.061, rz: 0.128, offsetZ: -0.073, squareness: 2.7 },
        ],
        18
      ),
      mats.bootRubber
    );
    midsole.castShadow = true;
    boot.add(midsole);

    // Lugged rubber outsole blocks bottoming cleanly at y = -0.100
    for (let t = 0; t < 5; t++) {
      const lug = new THREE.Mesh(
        new THREE.BoxGeometry(0.118, 0.012, 0.024),
        mats.bootRubber
      );
      lug.position.set(0, -0.094, -0.176 + t * 0.048);
      boot.add(lug);
    }

    // Faceted rear armored heel counter
    const heelCounter = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [Math.PI * 0.5 - 0.78, -0.072],
          [Math.PI * 0.5 + 0.78, -0.072],
          [Math.PI * 0.5 + 0.62, -0.022],
          [Math.PI * 0.5, -0.014],
          [Math.PI * 0.5 - 0.62, -0.022],
        ],
        (u, v, off) => [Math.cos(u) * (0.057 + off), v, 0.012 + Math.sin(u) * (0.062 + off)],
        0.008,
        0.2,
        0.0035,
        2
      ),
      mats.armorPrimary
    );
    boot.add(heelCounter);
  }
}
