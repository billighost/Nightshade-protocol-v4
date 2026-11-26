import * as THREE from 'three';
import { createBeveledBox } from '../../core/sculptUtils';
import type { SharedWeaponMaterials } from '../materials';

export interface ViperOpticsAndMagAssembly {
  opticsGroup: THREE.Group;
  magazine: THREE.Group;
}

/**
 * VIPER-X4 Chunky EOTech EXPS Holographic Weapon Sight (armored aluminum hood,
 * side NVG buttons, elevation dials, tinted HUD glass, glowing ring-dot reticle),
 * Folding Backup Iron Sights (BUIS), and Curved Smoked-Translucent Extended SMG Magazine
 * showing stacked gleaming brass cartridges inside + FDE Ranger Pull-Loop!
 */
export function buildViperOpticsAndMagazine(
  mats: SharedWeaponMaterials
): ViperOpticsAndMagAssembly {
  const opticsGroup = new THREE.Group();
  opticsGroup.name = 'VIPERX4_OPTICS_AND_BUIS';

  // 1. Chunky EOTech EXPS-3 Style Holographic Weapon Sight (iconic CoD MW Corp Combat Holo!)
  const holoGroup = new THREE.Group();
  holoGroup.name = 'VIPERX4_HOLO_SIGHT';
  holoGroup.position.set(0, 0.1, -0.062);

  // Quick-detach rail riser base + transverse battery housing pod at front
  const holoBase = new THREE.Mesh(
    createBeveledBox(0.038, 0.015, 0.082, 0.0025),
    mats.anodizedRail
  );
  holoBase.position.set(0, 0.006, 0);
  holoBase.castShadow = true;
  holoGroup.add(holoBase);

  const batteryPod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0115, 0.0115, 0.044, 12),
    mats.parkerizedMetal
  );
  batteryPod.rotation.z = Math.PI / 2;
  batteryPod.position.set(0, 0.015, -0.032);
  holoGroup.add(batteryPod);

  // Heavy armored wrap-around protective aluminum hood (left, right, top arch)
  for (const side of [-1, 1] as const) {
    const hoodWall = new THREE.Mesh(
      createBeveledBox(0.0065, 0.036, 0.056, 0.0018),
      mats.cerakoteSteel
    );
    hoodWall.position.set(side * 0.0185, 0.028, 0.005);
    hoodWall.castShadow = true;
    holoGroup.add(hoodWall);
  }
  const hoodRoof = new THREE.Mesh(
    createBeveledBox(0.043, 0.007, 0.058, 0.002),
    mats.cerakoteSteel
  );
  hoodRoof.position.set(0, 0.045, 0.005);
  hoodRoof.castShadow = true;
  holoGroup.add(hoodRoof);

  // Side QD throw-lever, brightness buttons, and FDE windage/elevation turrets
  const qdLever = new THREE.Mesh(
    createBeveledBox(0.006, 0.01, 0.032, 0.0015),
    mats.machinedSteel
  );
  qdLever.position.set(-0.022, 0.007, 0.004);
  holoGroup.add(qdLever);

  for (const tz of [-0.006, 0.012]) {
    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0045, 0.0045, 0.006, 10),
      mats.tacticalFde
    );
    turret.rotation.z = Math.PI / 2;
    turret.position.set(0.0225, 0.026, tz);
    holoGroup.add(turret);
  }

  // Tinted optical sight window + glowing cyan EOTech 65-MOA ring-dot reticle!
  const holoGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.031, 0.026), mats.opticGlass);
  holoGlass.position.set(0, 0.028, 0.004);
  holoGroup.add(holoGlass);

  const holoReticle = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.024), mats.holoReticleMat);
  holoReticle.position.set(0, 0.028, 0.005);
  holoGroup.add(holoReticle);

  opticsGroup.add(holoGroup);

  // 2. Low-Profile Folding Backup Iron Sights (Rear & Front BUIS)
  const rearBuis = new THREE.Mesh(
    createBeveledBox(0.026, 0.014, 0.022, 0.002),
    mats.parkerizedMetal
  );
  rearBuis.position.set(0, 0.105, 0.025);
  opticsGroup.add(rearBuis);

  const frontBuis = new THREE.Mesh(
    createBeveledBox(0.024, 0.016, 0.022, 0.002),
    mats.parkerizedMetal
  );
  frontBuis.position.set(0, 0.106, -0.326);
  opticsGroup.add(frontBuis);

  // 3. Chunky Curved Smoked-Translucent Extended SMG Magazine with Visible Stacked Brass Rounds!
  const magazine = new THREE.Group();
  magazine.name = 'VIPERX4_MAGAZINE';
  magazine.position.set(0, -0.056, -0.122);
  magazine.rotation.x = -0.22;

  // Upper straight segment + lower curved sweep (2-segment curved SMG stick silhouette!)
  const magUpper = new THREE.Mesh(
    createBeveledBox(0.031, 0.095, 0.043, 0.0032),
    mats.smokedPolyMag
  );
  magUpper.position.set(0, 0.032, 0);
  magUpper.castShadow = true;
  magazine.add(magUpper);

  const magLower = new THREE.Mesh(
    createBeveledBox(0.031, 0.084, 0.043, 0.0032),
    mats.smokedPolyMag
  );
  magLower.position.set(0, -0.044, -0.009);
  magLower.rotation.x = -0.16;
  magLower.castShadow = true;
  magazine.add(magLower);

  // Steel top feed-lip collar locking magazine cleanly into the magwell
  const feedCollar = new THREE.Mesh(
    createBeveledBox(0.033, 0.012, 0.045, 0.002),
    mats.parkerizedMetal
  );
  feedCollar.position.set(0, 0.076, 0);
  magazine.add(feedCollar);

  // Structural polymer reinforcement ribs around translucent magazine shell
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(
      createBeveledBox(0.0335, 0.005, 0.0455, 0.0014),
      mats.stippledPolymer
    );
    rib.position.set(0, 0.056 - i * 0.028, i > 2 ? -0.004 * (i - 2) : 0);
    magazine.add(rib);
  }

  // Visible staggered stack of gleaming brass cartridges tucked cleanly INSIDE smoked shell!
  for (let r = 0; r < 9; r++) {
    const round = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0038, 0.0038, 0.022, 8),
      mats.brassCartridge
    );
    round.rotation.x = Math.PI / 2;
    const xStagger = r % 2 === 0 ? -0.0038 : 0.0038;
    const zCurve = r > 4 ? -(r - 4) * 0.0018 : 0;
    round.position.set(xStagger, 0.06 - r * 0.014, zCurve);
    magazine.add(round);
  }

  // Chunky FDE tactical baseplate + rubberized Ranger speed-pull loop at bottom of mag!
  const magBase = new THREE.Mesh(
    createBeveledBox(0.032, 0.018, 0.046, 0.003),
    mats.tacticalFde
  );
  magBase.position.set(0, -0.088, -0.016);
  magBase.rotation.x = -0.16;
  magazine.add(magBase);

  const rangerLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.013, 0.0035, 6, 12, Math.PI),
    mats.matteRubber
  );
  rangerLoop.position.set(0, -0.097, -0.017);
  rangerLoop.rotation.z = Math.PI;
  rangerLoop.rotation.y = Math.PI / 2;
  magazine.add(rangerLoop);

  return {
    opticsGroup,
    magazine,
  };
}
