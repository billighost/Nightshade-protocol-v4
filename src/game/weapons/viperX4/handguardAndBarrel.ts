import * as THREE from 'three';
import { createBeveledBox } from '../../core/sculptUtils';
import type { SharedWeaponMaterials } from '../materials';

export interface ViperHandguardAssembly {
  handguardGroup: THREE.Group;
  ventFlapL: THREE.Group;
  ventFlapR: THREE.Group;
  thermalCoreMat: THREE.MeshStandardMaterial;
  muzzlePoint: THREE.Object3D;
  ventPoint: THREE.Object3D;
}

/**
 * VIPER-X4 Ventilated M-LOK / Quad-Rail Handguard, Glowing Cryo-Thermal Rail Core,
 * Articulating Twin Cryo-Vent Flaps, Heavy Fluted Barrel, Chunky Multi-Port Slotted
 * Compensator Brake (matches lateral muzzle gas-jet VFX!), Ribbed Tactical Foregrip
 * (aligned at z = -0.212 for exact left-hand IK!), and Side-Mounted PEQ-15 Laser Module.
 */
export function buildViperHandguardAndBarrel(mats: SharedWeaponMaterials): ViperHandguardAssembly {
  const handguardGroup = new THREE.Group();
  handguardGroup.name = 'VIPERX4_HANDGUARD_AND_BARREL';

  // Per-instance emissive cryo-thermal core material (isolated per SMG rig)
  const thermalCoreMat = new THREE.MeshStandardMaterial({
    color: 0x0f1a28,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.72,
    roughness: 0.3,
    metalness: 0.62,
  });

  // 1. Chunky Ventilated M-LOK / Quad-Rail Handguard Shroud
  const shroudTop = new THREE.Mesh(
    createBeveledBox(0.044, 0.02, 0.165, 0.0035),
    mats.anodizedRail
  );
  shroudTop.position.set(0, 0.084, -0.264);
  shroudTop.castShadow = true;
  handguardGroup.add(shroudTop);

  // Forward top Picatinny rail teeth along handguard
  for (let i = 0; i < 7; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.0045, 0.01), mats.parkerizedMetal);
    tooth.position.set(0, 0.096, -0.2 - i * 0.021);
    handguardGroup.add(tooth);
  }

  const shroudBottom = new THREE.Mesh(
    createBeveledBox(0.042, 0.02, 0.162, 0.0035),
    mats.anodizedRail
  );
  shroudBottom.position.set(0, 0.036, -0.26);
  shroudBottom.castShadow = true;
  handguardGroup.add(shroudBottom);

  // Side ventilated handguard rails with dark M-LOK cooling slots
  for (const side of [-1, 1] as const) {
    const sideRail = new THREE.Mesh(
      createBeveledBox(0.0085, 0.044, 0.155, 0.002),
      mats.cerakoteSteel
    );
    sideRail.position.set(side * 0.024, 0.06, -0.262);
    handguardGroup.add(sideRail);

    // 3 Recessed M-LOK cooling vent slots per side
    for (let s = 0; s < 3; s++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.011, 0.028), mats.boreVoid);
      slot.position.set(side * 0.0275, 0.06, -0.218 - s * 0.042);
      handguardGroup.add(slot);
    }
  }

  // Glowing inner cryo-thermal rail accelerator core recessed cleanly inside M-LOK vents!
  const thermalCore = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.016, 0.148), thermalCoreMat);
  thermalCore.position.set(0, 0.06, -0.258);
  handguardGroup.add(thermalCore);

  // Articulating Twin Cryo-Vent Exhaust Flaps (flare open during cryo-vent / overheat!)
  const makeVentFlap = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'VIPERX4_VENT_FLAP_L' : 'VIPERX4_VENT_FLAP_R';
    pivot.position.set(side * 0.029, 0.078, -0.175);

    const blade = new THREE.Mesh(
      createBeveledBox(0.011, 0.024, 0.118, 0.0022),
      mats.cerakoteSteel
    );
    blade.castShadow = true;
    pivot.add(blade);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.094), thermalCoreMat);
    trim.position.set(side * 0.0045, -0.003, 0);
    pivot.add(trim);

    return pivot;
  };
  const ventFlapL = makeVentFlap(-1);
  const ventFlapR = makeVentFlap(1);
  handguardGroup.add(ventFlapL);
  handguardGroup.add(ventFlapR);

  // 2. Heavy Fluted Steel Barrel + Chunky 3-Chamber Slotted Tactical Compensator / Muzzle Brake
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0115, 0.013, 0.145, 14),
    mats.heatBluedSteel
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.06, -0.305);
  handguardGroup.add(barrel);

  // Heavy crush washer & threaded collar
  const barrelCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0155, 0.0155, 0.014, 12),
    mats.machinedSteel
  );
  barrelCollar.rotation.x = Math.PI / 2;
  barrelCollar.position.set(0, 0.06, -0.352);
  handguardGroup.add(barrelCollar);

  // Chunky rectangular-beveled 3-port CoD Tactical Compensator Brake!
  const brakeGroup = new THREE.Group();
  brakeGroup.name = 'VIPERX4_COMPENSATOR_BRAKE';
  brakeGroup.position.set(0, 0.06, -0.39);

  const brakeBody = new THREE.Mesh(
    createBeveledBox(0.028, 0.027, 0.068, 0.0042),
    mats.heatBluedSteel
  );
  brakeBody.castShadow = true;
  brakeGroup.add(brakeBody);

  // 3 Machined lateral baffle chambers & dark gas-redirect ports (blast side jets on fire!)
  for (let i = 0; i < 3; i++) {
    const zOff = 0.018 - i * 0.018;
    const sidePort = new THREE.Mesh(new THREE.BoxGeometry(0.0305, 0.013, 0.01), mats.boreVoid);
    sidePort.position.set(0, 0, zOff);
    brakeGroup.add(sidePort);

    const topPort = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.008, 0.008), mats.boreVoid);
    topPort.position.set(0, 0.012, zOff);
    brakeGroup.add(topPort);
  }

  // Front muzzle crown & recessed black bore
  const brakeCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0125, 0.0135, 0.008, 12),
    mats.machinedSteel
  );
  brakeCrown.rotation.x = Math.PI / 2;
  brakeCrown.position.set(0, 0, -0.036);
  brakeGroup.add(brakeCrown);

  const brakeBore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0072, 0.0072, 0.008, 10),
    mats.boreVoid
  );
  brakeBore.rotation.x = Math.PI / 2;
  brakeBore.position.set(0, 0, -0.038);
  brakeGroup.add(brakeBore);

  handguardGroup.add(brakeGroup);

  // 3. Ribbed Vertical-Angled Tactical Foregrip (EXACT z = -0.212 for left-hand IK grip!)
  const foregripGroup = new THREE.Group();
  foregripGroup.name = 'VIPERX4_FOREGRIP';
  foregripGroup.position.set(0, 0.002, -0.212);
  foregripGroup.rotation.x = -0.16;

  const fgClamp = new THREE.Mesh(
    createBeveledBox(0.032, 0.014, 0.044, 0.0025),
    mats.parkerizedMetal
  );
  fgClamp.position.set(0, 0.032, 0);
  foregripGroup.add(fgClamp);

  const fgCore = new THREE.Mesh(
    createBeveledBox(0.027, 0.078, 0.035, 0.004),
    mats.stippledPolymer
  );
  fgCore.castShadow = true;
  foregripGroup.add(fgCore);

  // Tactile finger-index ribs & handstop lip at bottom
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(
      createBeveledBox(0.029, 0.0055, 0.037, 0.0014),
      mats.matteRubber
    );
    rib.position.set(0, 0.018 - i * 0.014, 0);
    foregripGroup.add(rib);
  }
  const handstop = new THREE.Mesh(
    createBeveledBox(0.031, 0.01, 0.042, 0.0025),
    mats.tacticalFde
  );
  handstop.position.set(0, -0.038, -0.003);
  foregripGroup.add(handstop);

  handguardGroup.add(foregripGroup);

  // 4. Side-Mounted CoD PEQ-15 Tactical Laser / IR Box (FDE & dark polymer contrast!)
  const peqGroup = new THREE.Group();
  peqGroup.name = 'VIPERX4_PEQ15_LASER';
  peqGroup.position.set(0.036, 0.068, -0.268);

  const peqBody = new THREE.Mesh(
    createBeveledBox(0.026, 0.024, 0.088, 0.0032),
    mats.tacticalFde
  );
  peqBody.castShadow = true;
  peqGroup.add(peqBody);

  const peqCap = new THREE.Mesh(
    createBeveledBox(0.028, 0.01, 0.045, 0.002),
    mats.parkerizedMetal
  );
  peqCap.position.set(0, 0.011, 0.01);
  peqGroup.add(peqCap);

  // Twin front laser/illuminator emitter barrels & glowing glass lenses
  for (const [lx, ly] of [
    [-0.005, 0.002],
    [0.006, -0.003],
  ] as const) {
    const emitter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0046, 0.0048, 0.012, 10),
      mats.parkerizedMetal
    );
    emitter.rotation.x = Math.PI / 2;
    emitter.position.set(lx, ly, -0.046);
    peqGroup.add(emitter);

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0034, 0.0034, 0.003, 10),
      mats.lensGlass
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(lx, ly, -0.052);
    peqGroup.add(lens);
  }

  // Rotary mode selector dial on top of PEQ-15
  const peqDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.007, 8),
    mats.matteRubber
  );
  peqDial.position.set(0.003, 0.014, -0.015);
  peqGroup.add(peqDial);

  handguardGroup.add(peqGroup);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.name = 'VIPERX4_MUZZLE_POINT';
  muzzlePoint.position.set(0, 0.06, -0.432);

  const ventPoint = new THREE.Object3D();
  ventPoint.name = 'VIPERX4_VENT_POINT';
  ventPoint.position.set(0, 0.098, -0.175);

  return {
    handguardGroup,
    ventFlapL,
    ventFlapR,
    thermalCoreMat,
    muzzlePoint,
    ventPoint,
  };
}
