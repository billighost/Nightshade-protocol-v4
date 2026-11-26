import * as THREE from 'three';
import type { SharedWeaponMaterials } from '../materials';

export interface VulcanBarrelParts {
  barrelGroup: THREE.Group;
  coilGlowMat: THREE.MeshStandardMaterial;
  muzzlePoint: THREE.Object3D;
}

/**
 * VULCAN-50 Heavy .50-Cal Kinetic Battle Rifle — Handguard, Fluted Heavy Barrel,
 * Colossal Dual-Chamber Tank Muzzle Brake, Angled Foregrip & Ballistic Rangefinder.
 *
 * Foregrip sits cleanly at `(0, 0.002, -0.222)` so operative left-hand IK locks onto it
 * cleanly without clipping! Muzzle tip sits at `(0, 0.088, -0.605)`.
 */
export function buildVulcanBarrelAndBrake(mats: SharedWeaponMaterials): VulcanBarrelParts {
  const barrelGroup = new THREE.Group();
  barrelGroup.name = 'Vulcan50_BarrelAndBrake';

  // Signature warm amber-gold heavy kinetic coil / rangefinder glow material (per-instance)
  const coilGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.35,
    roughness: 0.22,
    metalness: 0.4,
  });

  const add = (
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0
  ) => {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    barrelGroup.add(m);
    return m;
  };

  // --- 1. Long Reinforced Quad-Rail / M-LOK Heavy Handguard (z = -0.21 to -0.445) ---
  // Octagonal chamfered aluminum shroud core
  add(new THREE.BoxGeometry(0.056, 0.06, 0.242), mats.anodizedRail, 0, 0.088, -0.33);
  // Top continuous rail extension with 14 Picatinny slots
  add(new THREE.BoxGeometry(0.028, 0.011, 0.242), mats.anodizedRail, 0, 0.123, -0.33);
  for (let i = 0; i < 14; i++) {
    add(new THREE.BoxGeometry(0.03, 0.0045, 0.0075), mats.parkerizedMetal, 0, 0.129, -0.22 - i * 0.0165);
  }
  // Bottom Picatinny accessory rail
  add(new THREE.BoxGeometry(0.026, 0.01, 0.232), mats.parkerizedMetal, 0, 0.053, -0.326);

  // Recessed cooling cutouts along both flanks revealing glowing amber kinetic accelerator rails!
  for (const sx of [-1, 1]) {
    // Dark recessed cooling trough
    add(new THREE.BoxGeometry(0.008, 0.022, 0.196), mats.boreVoid, sx * 0.027, 0.09, -0.332);
    // Glowing amber kinetic accelerator bar inside slot
    add(new THREE.BoxGeometry(0.005, 0.01, 0.184), coilGlowMat, sx * 0.0255, 0.09, -0.332);
    // 5 vertical structural bridge struts spanning the cooling slot
    for (let i = 0; i < 5; i++) {
      add(new THREE.BoxGeometry(0.009, 0.032, 0.012), mats.cerakoteSteel, sx * 0.0285, 0.09, -0.248 - i * 0.042);
    }
    // High-friction tactical FDE rubber rail panel covers along lower flank
    add(new THREE.BoxGeometry(0.008, 0.016, 0.14), mats.tacticalFde, sx * 0.031, 0.068, -0.305);
  }

  // Heavy machined barrel nut / handguard lockup collar
  add(new THREE.BoxGeometry(0.062, 0.066, 0.026), mats.cerakoteSteel, 0, 0.088, -0.214);

  // --- 2. Heavy Fluted .50-Cal Steel Barrel & Exposed Gas System (extends to z = -0.50) ---
  // Thick inner fluted stainless barrel extending cleanly past handguard
  add(
    new THREE.CylinderGeometry(0.0155, 0.0175, 0.26, 12),
    mats.heatBluedSteel,
    0,
    0.088,
    -0.415,
    Math.PI / 2
  );
  // 6 machined longitudinal stainless steel barrel flutes for iconic heavy-rifle look
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(
      new THREE.BoxGeometry(0.004, 0.004, 0.11),
      mats.machinedSteel,
      Math.cos(a) * 0.0155,
      0.088 + Math.sin(a) * 0.0155,
      -0.465
    );
  }
  // Low-profile heavy steel gas block & stainless gas piston tube above barrel
  add(new THREE.BoxGeometry(0.032, 0.044, 0.038), mats.parkerizedMetal, 0, 0.102, -0.456);
  add(new THREE.CylinderGeometry(0.0055, 0.0055, 0.14, 8), mats.machinedSteel, 0, 0.114, -0.39, Math.PI / 2);

  // --- 3. COLOSSAL DUAL-CHAMBER BARRETT / TANK SLOTTED MUZZLE BRAKE (z = -0.495 to -0.605!) ---
  // Heavy threaded mounting collar
  add(new THREE.CylinderGeometry(0.021, 0.019, 0.024, 12), mats.cerakoteSteel, 0, 0.088, -0.498, Math.PI / 2);

  // Main massive rectangular tank-brake body (split into top/bottom plates + vertical angled blast baffles!)
  // Top and bottom thick armored blast plates (0.068m wide x 0.102m long!)
  add(new THREE.BoxGeometry(0.066, 0.012, 0.098), mats.heatBluedSteel, 0, 0.108, -0.556);
  add(new THREE.BoxGeometry(0.066, 0.012, 0.098), mats.heatBluedSteel, 0, 0.068, -0.556);
  // Chamfered side rails on the tank brake crown
  for (const sx of [-0.032, 0.032]) {
    add(new THREE.BoxGeometry(0.006, 0.044, 0.014), mats.cerakoteSteel, sx, 0.088, -0.514);
    add(new THREE.BoxGeometry(0.006, 0.044, 0.014), mats.cerakoteSteel, sx, 0.088, -0.556);
    add(new THREE.BoxGeometry(0.006, 0.044, 0.016), mats.cerakoteSteel, sx, 0.088, -0.598);
  }
  // Dual internal swept baffle walls (recoil-canceling angled steel ribs!)
  add(new THREE.BoxGeometry(0.062, 0.032, 0.011), mats.machinedSteel, 0, 0.088, -0.516);
  add(new THREE.BoxGeometry(0.062, 0.032, 0.011), mats.machinedSteel, 0, 0.088, -0.556);
  add(new THREE.BoxGeometry(0.062, 0.032, 0.013), mats.cerakoteSteel, 0, 0.088, -0.598);

  // Dark inner lateral blast-chamber voids between baffles (makes the dual ports pop cleanly in silhouette!)
  add(new THREE.BoxGeometry(0.054, 0.028, 0.028), mats.boreVoid, 0, 0.088, -0.536);
  add(new THREE.BoxGeometry(0.054, 0.028, 0.028), mats.boreVoid, 0, 0.088, -0.577);
  // Recessed huge .50-cal muzzle bore hole at front face
  add(new THREE.CylinderGeometry(0.013, 0.013, 0.018, 12), mats.boreVoid, 0, 0.088, -0.602, Math.PI / 2);

  // --- 4. Heavy Ribbed Tactical Foregrip (centered at (0, 0.002, -0.222) for exact left-hand IK!) ---
  // Rail clamp mount
  add(new THREE.BoxGeometry(0.034, 0.018, 0.056), mats.parkerizedMetal, 0, 0.044, -0.222);
  // Rugged canted vertical grip shaft
  add(new THREE.BoxGeometry(0.032, 0.09, 0.038), mats.stippledPolymer, 0, 0.002, -0.222, -0.14);
  // Rubberized grip rings
  for (let i = 0; i < 4; i++) {
    add(new THREE.BoxGeometry(0.035, 0.007, 0.041), mats.matteRubber, 0, 0.026 - i * 0.018, -0.222 + i * 0.0025, -0.14);
  }
  // Knurled metallic bottom cap
  add(new THREE.CylinderGeometry(0.016, 0.015, 0.012, 10), mats.tacticalFde, 0, -0.044, -0.215, -0.14);

  // --- 5. Side-Mounted Ballistic Rangefinder / Heavy Laser Module (Right Rail +X) ---
  add(new THREE.BoxGeometry(0.034, 0.032, 0.088), mats.tacticalFde, 0.044, 0.094, -0.365);
  add(new THREE.BoxGeometry(0.036, 0.012, 0.072), mats.parkerizedMetal, 0.044, 0.106, -0.365);
  // Glowing amber rangefinder OLED status readout on rear face (visible to player from OTS camera!)
  add(new THREE.BoxGeometry(0.022, 0.014, 0.004), coilGlowMat, 0.044, 0.094, -0.32);
  // Dual front laser/illuminator emitter bezels
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 10), mats.lensGlass, 0.042, 0.094, -0.412, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 8), coilGlowMat, 0.054, 0.088, -0.412, Math.PI / 2);

  // --- 6. Muzzle Point (front of colossal dual-chamber tank muzzle brake!) ---
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.name = 'Vulcan50_MuzzlePoint';
  muzzlePoint.position.set(0, 0.088, -0.61);

  return { barrelGroup, coilGlowMat, muzzlePoint };
}
