import * as THREE from 'three';
import {
  createContouredArmorPlate,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../core/sculptUtils';
import type { MixamoHumanoidRig } from '../skeleton/mixamoBones';
import type { OperativeMaterialPalette } from './materials';

/**
 * Maps cylindrical-ellipsoidal head surface `(theta, y, offset)` where `theta = -PI/2` is straight front (-Z).
 */
function mapHeadSurface(theta: number, y: number, offset: number): [number, number, number] {
  // Interpolate anatomical cranium/jaw radii smoothly across y = -0.01 .. 0.14
  const t = THREE.MathUtils.clamp((y + 0.015) / 0.135, 0, 1);
  const rx = THREE.MathUtils.lerp(0.06, 0.093, Math.pow(t, 0.55));
  const rz = THREE.MathUtils.lerp(0.076, 0.11, Math.pow(t, 0.55));
  const zShift = THREE.MathUtils.lerp(-0.014, -0.004, t);
  const x = Math.cos(theta) * (rx + offset);
  const z = zShift + Math.sin(theta) * (rz + offset);
  return [x, y, z];
}

/**
 * Builds the sleek menacing matte-charcoal Spec-Ops Ballistic Combat Helmet & Faceted
 * Full-Face Respirator Mask with Twin Deeply Recessed Ruby-Crimson Tactical Optics —
 * crafted with chamfer-beveled polygonal hard-surface armor plates matching
 * `helmeted_operative_turnaround` (Front, Side, and Back views!) 1:1.
 */
export function buildOperativeHead(
  rig: MixamoHumanoidRig,
  mats: OperativeMaterialPalette
): void {
  // =========================================================================
  // 1. SLEEK RIBBED BALLISTIC NECK GAITER (`rig.neck`)
  // =========================================================================
  const neckGaiter = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.048, rx: 0.078, rz: 0.076, squareness: 2.15 },
        { y: -0.005, rx: 0.068, rz: 0.068, offsetZ: 0.004 },
        { y: 0.04, rx: 0.064, rz: 0.065, offsetZ: 0.003 },
        { y: 0.082, rx: 0.064, rz: 0.066, offsetZ: 0.002 },
        { y: 0.115, rx: 0.066, rz: 0.07, offsetZ: 0.001 },
      ],
      22,
      true,
      true
    ),
    mats.ribbedFlex
  );
  neckGaiter.castShadow = true;
  neckGaiter.receiveShadow = true;
  rig.neck.add(neckGaiter);

  // Subtle horizontal flex ribs along rear & throat gaiter
  for (const ry of [0.02, 0.048, 0.074]) {
    const rib = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: ry - 0.006, rx: 0.066, rz: 0.068, offsetZ: 0.003 },
          { y: ry, rx: 0.069, rz: 0.071, offsetZ: 0.003 },
          { y: ry + 0.006, rx: 0.066, rz: 0.068, offsetZ: 0.003 },
        ],
        20,
        false,
        false
      ),
      mats.armorSecondary
    );
    rig.neck.add(rib);
  }

  // =========================================================================
  // 2. SEALED INNER BALACLAVA CRANIUM CORE (`rig.head` — ZERO gaps anywhere!)
  // =========================================================================
  const innerCore = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.02, rx: 0.056, rz: 0.064, offsetZ: 0.002 },
        { y: 0.02, rx: 0.072, rz: 0.088, offsetZ: -0.008, squareness: 2.2 },
        { y: 0.072, rx: 0.082, rz: 0.1, offsetZ: -0.004, squareness: 2.15 },
        { y: 0.125, rx: 0.084, rz: 0.104, offsetZ: 0.004 },
        { y: 0.178, rx: 0.072, rz: 0.09, offsetZ: 0.006 },
        { y: 0.205, rx: 0.02, rz: 0.024, offsetZ: 0.004 },
      ],
      26
    ),
    mats.ribbedFlex
  );
  innerCore.castShadow = true;
  rig.head.add(innerCore);

  // =========================================================================
  // 3. SLEEK BALLISTIC SPEC-OPS HELMET DOME SHELL (`mats.armorPrimary`)
  //    Clean rounded composite crown, angled brow rim, swept side ear-cut, occipital nape!
  // =========================================================================
  const helmetDome = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0.106, rx: 0.097, rz: 0.116, offsetZ: 0.002, frontScale: 1.02, backScale: 1.05, squareness: 2.14 },
        { y: 0.142, rx: 0.099, rz: 0.119, offsetZ: 0.005, frontScale: 1.01, backScale: 1.06, squareness: 2.08 },
        { y: 0.175, rx: 0.091, rz: 0.112, offsetZ: 0.006, backScale: 1.04, squareness: 2.04 },
        { y: 0.201, rx: 0.073, rz: 0.092, offsetZ: 0.006, squareness: 2.02 },
        { y: 0.218, rx: 0.044, rz: 0.056, offsetZ: 0.005 },
        { y: 0.226, rx: 0.005, rz: 0.007, offsetZ: 0.004 },
      ],
      34,
      false,
      true
    ),
    mats.armorPrimary
  );
  helmetDome.castShadow = true;
  helmetDome.receiveShadow = true;
  rig.head.add(helmetDome);

  // Rear Occipital & Side-Ear Ballistic Shell extending smoothly down to nape (`y = 0.036..0.116`)
  const rearSkirt = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.034, rx: 0.08, rz: 0.1, thickness: 0.013, offsetZ: 0.012 },
        { y: 0.072, rx: 0.089, rz: 0.11, thickness: 0.014, offsetZ: 0.009 },
        { y: 0.114, rx: 0.092, rz: 0.113, thickness: 0.013, offsetZ: 0.005 },
      ],
      -0.2,
      Math.PI + 0.2,
      26
    ),
    mats.armorPrimary
  );
  rearSkirt.castShadow = true;
  rig.head.add(rearSkirt);

  // Dark beveled occipital nape rim (exact Back turnaround view!)
  const napeTrim = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.026, rx: 0.079, rz: 0.099, thickness: 0.01, offsetZ: 0.013 },
        { y: 0.04, rx: 0.082, rz: 0.102, thickness: 0.01, offsetZ: 0.012 },
      ],
      0.06,
      Math.PI - 0.06,
      20
    ),
    mats.armorSecondary
  );
  rig.head.add(napeTrim);

  // Menacing Angled V-Brow Visor Shield (dips slightly at center nose bridge for fierce tactical look!)
  const browShield = new THREE.Mesh(
    createContouredArmorPlate(
      [
        [-Math.PI * 0.86, 0.11],
        [-Math.PI * 0.64, 0.112],
        [-Math.PI * 0.5, 0.103], // sharp angry V-brow dip between optics!
        [-Math.PI * 0.36, 0.112],
        [-Math.PI * 0.14, 0.11],
        [-Math.PI * 0.18, 0.132],
        [-Math.PI * 0.5, 0.135],
        [-Math.PI * 0.82, 0.132],
      ],
      mapHeadSurface,
      0.014,
      0.16,
      0.005,
      3
    ),
    mats.armorPrimary
  );
  browShield.castShadow = true;
  rig.head.add(browShield);

  // =========================================================================
  // 4. SLEEK INTEGRATED SIDE EAR-CUP COMM HOUSINGS (Flush & sculpted — NO floating cubes!)
  // =========================================================================
  for (const side of [-1, 1] as const) {
    const earStart = side > 0 ? -0.26 : Math.PI - 0.18;
    const earEnd = side > 0 ? 0.18 : Math.PI + 0.26;
    const earCup = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [earStart, 0.044],
          [earEnd, 0.044],
          [earEnd, 0.1],
          [earStart, 0.104],
        ],
        mapHeadSurface,
        0.015,
        0.2,
        0.006,
        2
      ),
      mats.armorSecondary
    );
    earCup.castShadow = true;
    rig.head.add(earCup);

    // Low-profile flush side comm pivot disc
    const pivot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.014, 0.008, 14),
      mats.gunmetal
    );
    pivot.rotation.z = Math.PI * 0.5;
    pivot.position.set(side * 0.095, 0.072, 0.004);
    rig.head.add(pivot);

    // Ops-Core Style Side ARC Tactical Accessory Rail along temple rim
    const arcRail = new THREE.Mesh(
      createContouredArmorPlate(
        [
          [side > 0 ? -0.44 : Math.PI - 0.34, 0.112],
          [side > 0 ? 0.34 : Math.PI + 0.44, 0.112],
          [side > 0 ? 0.32 : Math.PI + 0.42, 0.14],
          [side > 0 ? -0.42 : Math.PI - 0.32, 0.14],
        ],
        mapHeadSurface,
        0.015,
        0.18,
        0.004,
        2
      ),
      mats.armorSecondary
    );
    arcRail.castShadow = true;
    rig.head.add(arcRail);

    // 3 Machined Rail Slots / Fastener Screws along side ARC rail
    for (const rOff of [-0.26, 0.0, 0.24]) {
      const ang = (side > 0 ? -0.05 : Math.PI + 0.05) + rOff;
      const rp = mapHeadSurface(ang, 0.126, 0.017);
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.006, 8), mats.gunmetal);
      screw.rotation.z = Math.PI * 0.5;
      screw.position.set(rp[0], rp[1], rp[2]);
      rig.head.add(screw);
    }
  }

  // Front Forehead Ballistic NVG Shroud Mount (3-hole Wilcox-style bracket — breaks up smooth dome!)
  const nvgShroud = new THREE.Mesh(
    createContouredArmorPlate(
      [
        [-Math.PI * 0.5 - 0.24, 0.132],
        [-Math.PI * 0.5 + 0.24, 0.132],
        [-Math.PI * 0.5 + 0.2, 0.184],
        [-Math.PI * 0.5 - 0.2, 0.184],
      ],
      (u, v, off) => {
        const f = THREE.MathUtils.clamp((v - 0.12) / 0.09, 0, 1);
        const rx = THREE.MathUtils.lerp(0.098, 0.086, f) + off;
        const rz = THREE.MathUtils.lerp(0.118, 0.106, f) + off;
        return [Math.cos(u) * rx, v, 0.004 + Math.sin(u) * rz];
      },
      0.012,
      0.2,
      0.004,
      2
    ),
    mats.armorSecondary
  );
  nvgShroud.castShadow = true;
  rig.head.add(nvgShroud);

  const nvgMountBracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.036, 0.014),
    mats.gunmetal
  );
  nvgMountBracket.position.set(0, 0.156, -0.122);
  nvgMountBracket.rotation.x = -0.24;
  rig.head.add(nvgMountBracket);

  // Rear Helmet Counterweight Battery Pouch & Retention Bungee Straps (Back View Micro-Detail!)
  const rearBatteryPack = new THREE.Mesh(
    new THREE.BoxGeometry(0.086, 0.056, 0.032),
    mats.webbing
  );
  rearBatteryPack.position.set(0, 0.108, 0.122);
  rearBatteryPack.rotation.x = 0.12;
  rearBatteryPack.castShadow = true;
  rig.head.add(rearBatteryPack);

  const batteryLid = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.016, 0.036),
    mats.armorSecondary
  );
  batteryLid.position.set(0, 0.132, 0.125);
  batteryLid.rotation.x = 0.12;
  rig.head.add(batteryLid);

  const batteryLatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.022, 0.008),
    mats.gunmetal
  );
  batteryLatch.position.set(0, 0.116, 0.14);
  rig.head.add(batteryLatch);

  // =========================================================================
  // 5. RECESSED DARK GOGGLE CHANNEL + TWIN DEEP RUBY-CRIMSON OPTICS!
  // =========================================================================
  const orbitalRecess = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.072, rx: 0.083, rz: 0.101, thickness: 0.008, offsetZ: -0.006 },
        { y: 0.094, rx: 0.085, rz: 0.103, thickness: 0.008, offsetZ: -0.007 },
        { y: 0.11, rx: 0.085, rz: 0.103, thickness: 0.008, offsetZ: -0.006 },
      ],
      -Math.PI * 0.78,
      -Math.PI * 0.22,
      18
    ),
    mats.opticDarkGlass
  );
  rig.head.add(orbitalRecess);

  // Twin Deeply Recessed Tactical Ruby-Crimson Optics (menacing, focused, NOT startled bug eyes!)
  for (const side of [-1, 1] as const) {
    const opticGroup = new THREE.Group();
    opticGroup.position.set(side * 0.031, 0.091, -0.102);
    // Subtle fierce inward/downward predator cant!
    opticGroup.rotation.set(0.08, side * -0.24, side * 0.1);
    rig.head.add(opticGroup);

    // Sculpted dark gunmetal recessed ring bezel (flush with orbital socket!)
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.0155, 0.0044, 12, 22),
      mats.gunmetal
    );
    bezel.position.z = -0.004;
    opticGroup.add(bezel);

    // Outer deep glossy obsidian lens housing rim
    const darkBacking = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.016, 0.01, 18),
      mats.opticDarkGlass
    );
    darkBacking.rotation.x = Math.PI * 0.5;
    darkBacking.position.z = 0.001;
    opticGroup.add(darkBacking);

    // Focused deep ruby-crimson domed optic iris (rich saturated crimson!)
    const rubyLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.0122, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
      mats.crimsonOpticGlow
    );
    rubyLens.rotation.x = -Math.PI * 0.5;
    rubyLens.position.z = -0.001;
    opticGroup.add(rubyLens);

    // Dark recessed center micro-aperture ring for authentic military NVG optic depth!
    const aperture = new THREE.Mesh(
      new THREE.TorusGeometry(0.0072, 0.0016, 8, 16),
      mats.opticDarkGlass
    );
    aperture.position.z = -0.0105;
    opticGroup.add(aperture);
  }

  // =========================================================================
  // 6. SHARP FACETED ANGULAR RESPIRATOR FACEPLATE & CHEEK ARMOR (`createContouredArmorPlate`!)
  //    Clean V-tapered tactical stealth mask — ZERO bulbous snout or poking cylinders!
  // =========================================================================
  // Central Sculpted V-Chevron Nose Bridge & Tapered Mandible Guard
  const centralMaskPlate = new THREE.Mesh(
    createContouredArmorPlate(
      [
        [-Math.PI * 0.5 - 0.18, 0.002], // sharp narrow armored chin tip left
        [-Math.PI * 0.5 + 0.18, 0.002], // sharp narrow armored chin tip right
        [-Math.PI * 0.5 + 0.34, 0.052], // widens sharply under right optic
        [-Math.PI * 0.5 + 0.13, 0.078], // narrows up nasal bridge right
        [-Math.PI * 0.5 + 0.11, 0.108], // meets V-brow peak
        [-Math.PI * 0.5 - 0.11, 0.108],
        [-Math.PI * 0.5 - 0.13, 0.078],
        [-Math.PI * 0.5 - 0.34, 0.052],
      ],
      mapHeadSurface,
      0.016,
      0.18,
      0.006,
      2
    ),
    mats.armorPrimary
  );
  centralMaskPlate.castShadow = true;
  centralMaskPlate.receiveShadow = true;
  rig.head.add(centralMaskPlate);

  // Recessed darker vertical respirator breather grille centered on mandible
  const breatherCore = new THREE.Mesh(
    createContouredArmorPlate(
      [
        [-Math.PI * 0.5 - 0.11, 0.006],
        [-Math.PI * 0.5 + 0.11, 0.006],
        [-Math.PI * 0.5 + 0.15, 0.054],
        [-Math.PI * 0.5 - 0.15, 0.054],
      ],
      mapHeadSurface,
      0.019,
      0.18,
      0.004,
      2
    ),
    mats.armorSecondary
  );
  rig.head.add(breatherCore);

  // Swept Angular Cheek & Jawline Armor Plates bridging central mask cleanly into ear housings!
  for (const side of [-1, 1] as const) {
    const uInnerLow = -Math.PI * 0.5 + side * 0.22;
    const uInnerHigh = -Math.PI * 0.5 + side * 0.36;
    const uOuterLow = -Math.PI * 0.5 + side * 0.86;
    const uOuterHigh = -Math.PI * 0.5 + side * 0.96;

    const poly: Array<[number, number]> =
      side > 0
        ? [
            [uInnerLow, 0.008],
            [uOuterLow, 0.024],
            [uOuterHigh, 0.076],
            [uInnerHigh, 0.074],
          ]
        : [
            [uOuterLow, 0.024],
            [uInnerLow, 0.008],
            [uInnerHigh, 0.074],
            [uOuterHigh, 0.076],
          ];

    const cheekShield = new THREE.Mesh(
      createContouredArmorPlate(poly, mapHeadSurface, 0.015, 0.16, 0.0055, 2),
      mats.armorPrimary
    );
    cheekShield.castShadow = true;
    cheekShield.receiveShadow = true;
    rig.head.add(cheekShield);

    // Subtle dark angular intake louver tucked neatly along cheek-to-chin seam
    const ventSlit = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, 0.032, 0.008),
      mats.opticDarkGlass
    );
    ventSlit.position.set(side * 0.022, 0.03, -0.104);
    ventSlit.rotation.set(0.22, side * -0.32, side * 0.18);
    rig.head.add(ventSlit);
  }
}
