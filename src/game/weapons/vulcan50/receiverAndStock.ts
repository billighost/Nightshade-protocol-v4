import * as THREE from 'three';
import type { SharedWeaponMaterials } from '../materials';

export interface VulcanReceiverParts {
  receiverGroup: THREE.Group;
  bolt: THREE.Mesh;
  ejectionPoint: THREE.Object3D;
}

/**
 * VULCAN-50 Heavy .50-Cal Kinetic Battle Rifle — Receiver, Grip & Precision Recoil Stock.
 * Inspired by Call of Duty MW Oden / SCAR-H / Barrett MRAD billet receivers:
 * - Chunky CNC-machined monolithic upper & lower receiver with carbon side plates
 * - Heavy fluted reciprocating stainless steel bolt carrier (`bolt`)
 * - Oversized brass deflector, forward assist, heavy side charging handle & ambidextrous FDE selector
 * - Precision battle-rifle stock with adjustable cheek riser, monopod rail & thick vented buttpad
 *
 * Right palm seats at (0, 0, 0); barrel axis fires along -Z.
 */
export function buildVulcanReceiverAndStock(mats: SharedWeaponMaterials): VulcanReceiverParts {
  const receiverGroup = new THREE.Group();
  receiverGroup.name = 'Vulcan50_ReceiverAndStock';

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
    receiverGroup.add(m);
    return m;
  };

  // --- 1. Heavy Ergonomic Pistol Grip (seated cleanly in right palm at 0, 0, 0) ---
  add(new THREE.BoxGeometry(0.036, 0.118, 0.056), mats.stippledPolymer, 0, -0.01, 0.014, 0.21);
  // Rubberized backstrap & contoured palm swell
  add(new THREE.BoxGeometry(0.038, 0.098, 0.018), mats.matteRubber, 0, -0.014, 0.038, 0.21);
  // Textured front finger-groove ribs
  for (let i = 0; i < 4; i++) {
    add(
      new THREE.BoxGeometry(0.037, 0.008, 0.007),
      mats.matteRubber,
      0,
      0.018 - i * 0.022,
      -0.015 + i * 0.0046,
      0.21
    );
  }
  // Flared polymer grip baseplate & metallic tang
  add(new THREE.BoxGeometry(0.041, 0.014, 0.062), mats.parkerizedMetal, 0, -0.069, 0.028, 0.21);
  add(new THREE.BoxGeometry(0.032, 0.028, 0.036), mats.cerakoteSteel, 0, 0.036, 0.032, -0.35);

  // Oversized winter trigger guard & flat match-grade FDE trigger
  add(new THREE.BoxGeometry(0.017, 0.006, 0.058), mats.anodizedRail, 0, -0.006, -0.044);
  add(new THREE.BoxGeometry(0.017, 0.032, 0.007), mats.anodizedRail, 0, 0.01, -0.072, 0.2);
  add(new THREE.BoxGeometry(0.008, 0.026, 0.009), mats.tacticalFde, 0, 0.014, -0.042, -0.18);

  // --- 2. Heavy .50-Cal Lower Receiver & Flared Box Magwell ---
  add(new THREE.BoxGeometry(0.05, 0.052, 0.228), mats.anodizedRail, 0, 0.046, -0.088);
  // Flared beveled .50-cal magwell housing
  add(new THREE.BoxGeometry(0.058, 0.048, 0.112), mats.anodizedRail, 0, 0.024, -0.146);
  add(new THREE.BoxGeometry(0.064, 0.011, 0.118), mats.cerakoteSteel, 0, 0.001, -0.146);
  // Magwell reinforcement lightening ribs
  for (const sx of [-0.03, 0.03]) {
    add(new THREE.BoxGeometry(0.005, 0.032, 0.088), mats.parkerizedMetal, sx, 0.026, -0.146);
  }
  // FDE oversized mag release paddle & ambidextrous fire selector levers
  add(new THREE.BoxGeometry(0.062, 0.013, 0.022), mats.tacticalFde, 0, 0.034, -0.088);
  for (const sx of [-0.029, 0.029]) {
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.007, 10), mats.tacticalFde, sx, 0.042, -0.012, 0, 0, Math.PI / 2);
    add(new THREE.BoxGeometry(0.006, 0.007, 0.022), mats.tacticalFde, sx, 0.044, -0.004, 0.28);
  }
  // Recessed takedown pins (machined stainless)
  for (const pz of [-0.012, -0.186]) {
    add(new THREE.CylinderGeometry(0.0065, 0.0065, 0.055, 10), mats.machinedSteel, 0, 0.044, pz, 0, 0, Math.PI / 2);
  }

  // --- 3. Monolithic Chunky CNC Upper Receiver ---
  add(new THREE.BoxGeometry(0.056, 0.058, 0.264), mats.cerakoteSteel, 0, 0.092, -0.082);
  // Chamfered upper spine bevels
  for (const sx of [-0.023, 0.023]) {
    add(new THREE.BoxGeometry(0.014, 0.014, 0.258), mats.anodizedRail, sx, 0.122, -0.082, 0, 0, sx > 0 ? -0.62 : 0.62);
  }
  // Woven carbon-fiber receiver inlay panels on both flanks
  for (const sx of [-0.029, 0.029]) {
    add(new THREE.BoxGeometry(0.004, 0.03, 0.145), mats.carbonFiber, sx, 0.092, -0.092);
  }
  // Full-length top Picatinny rail spine with 18 machined cross-slots
  add(new THREE.BoxGeometry(0.028, 0.012, 0.268), mats.anodizedRail, 0, 0.127, -0.082);
  for (let i = 0; i < 18; i++) {
    add(new THREE.BoxGeometry(0.03, 0.0045, 0.0075), mats.parkerizedMetal, 0, 0.133, 0.04 - i * 0.0145);
  }

  // --- 4. Oversized .50-Cal Ejection Port, Reciprocating Fluted Steel Bolt & Brass Deflector ---
  // Dark recessed ejection chamber void on right flank (+X)
  add(new THREE.BoxGeometry(0.012, 0.028, 0.092), mats.boreVoid, 0.026, 0.094, -0.098);
  // Reciprocating fluted stainless steel bolt carrier (`bolt`, base z = -0.095)
  const bolt = add(new THREE.BoxGeometry(0.015, 0.024, 0.078), mats.machinedSteel, 0.024, 0.094, -0.095);
  bolt.name = 'Vulcan50_Bolt';
  // Oversized angled brass deflector behind ejection port
  add(new THREE.BoxGeometry(0.02, 0.03, 0.022), mats.cerakoteSteel, 0.033, 0.094, -0.04, 0, 0.42, 0);
  // Heavy side-mounted knurled charging handle on left flank (-X)
  add(new THREE.BoxGeometry(0.024, 0.014, 0.018), mats.parkerizedMetal, -0.038, 0.098, -0.165);
  add(new THREE.CylinderGeometry(0.0085, 0.0085, 0.022, 10), mats.tacticalFde, -0.052, 0.098, -0.165, 0, 0, Math.PI / 2);

  // Heavy dust-cover hinge rail beneath ejection port
  add(new THREE.BoxGeometry(0.008, 0.006, 0.092), mats.parkerizedMetal, 0.03, 0.078, -0.098);

  // --- 5. Heavy Precision Battle-Rifle Stock (SCAR-H / MRAD Folding Recoil Stock) ---
  // Folding steel hinge knuckle at rear of receiver
  add(new THREE.BoxGeometry(0.054, 0.068, 0.036), mats.parkerizedMetal, 0, 0.082, 0.056);
  add(new THREE.CylinderGeometry(0.009, 0.009, 0.072, 10), mats.machinedSteel, -0.028, 0.082, 0.056);

  // Upper heavy stock spine beam (FDE-accented polymer over aluminum core)
  add(new THREE.BoxGeometry(0.046, 0.038, 0.168), mats.tacticalFde, 0, 0.098, 0.146);
  // Raised matte-rubber adjustable cheek riser saddle
  add(new THREE.BoxGeometry(0.05, 0.02, 0.115), mats.matteRubber, 0, 0.123, 0.142);
  // Lower angled skeleton strut & rear monopod rail
  add(new THREE.BoxGeometry(0.034, 0.024, 0.155), mats.anodizedRail, 0, 0.048, 0.142, 0.24);
  add(new THREE.BoxGeometry(0.026, 0.012, 0.075), mats.parkerizedMetal, 0, 0.026, 0.185);
  // Rear structural brace connecting upper & lower stock beams
  add(new THREE.BoxGeometry(0.042, 0.096, 0.028), mats.stippledPolymer, 0, 0.072, 0.214);
  // Thick vented hydraulic recoil-absorbing rubber buttpad (critical for .50-cal look!)
  add(new THREE.BoxGeometry(0.046, 0.112, 0.024), mats.matteRubber, 0, 0.07, 0.236);
  for (let i = 0; i < 4; i++) {
    add(new THREE.BoxGeometry(0.048, 0.006, 0.008), mats.parkerizedMetal, 0, 0.032 + i * 0.024, 0.248);
  }
  // Quick-detach steel sling swivel sockets on both sides of stock
  for (const sx of [-0.026, 0.026]) {
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 10), mats.machinedSteel, sx, 0.096, 0.185, 0, 0, Math.PI / 2);
  }

  // Ejection port world reference point (right flank +X)
  const ejectionPoint = new THREE.Object3D();
  ejectionPoint.name = 'Vulcan50_EjectionPoint';
  ejectionPoint.position.set(0.038, 0.096, -0.095);

  return { receiverGroup, bolt, ejectionPoint };
}
