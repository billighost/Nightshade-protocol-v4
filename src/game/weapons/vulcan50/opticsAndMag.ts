import * as THREE from 'three';
import type { SharedWeaponMaterials } from '../materials';

export interface VulcanOpticsAndMagParts {
  opticsGroup: THREE.Group;
  magazine: THREE.Group;
  scopeGlowMat: THREE.MeshStandardMaterial;
}

/**
 * VULCAN-50 Heavy .50-Cal Kinetic Battle Rifle — Chunky CoD 34mm LPVO Hybrid Tactical Scope,
 * 45° Canted Backup Micro Red-Dot & Wide .50-Cal Box Magazine Showing Stacked Brass Cartridges.
 */
export function buildVulcanOpticsAndMag(mats: SharedWeaponMaterials): VulcanOpticsAndMagParts {
  const opticsGroup = new THREE.Group();
  opticsGroup.name = 'Vulcan50_HybridScope';

  const scopeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    roughness: 0.08,
    metalness: 0.25,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const addOptic = (
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
    opticsGroup.add(m);
    return m;
  };

  // --- 1. Armored Cantilever Dual-Ring 34mm Scope Mount ---
  addOptic(new THREE.BoxGeometry(0.036, 0.016, 0.138), mats.parkerizedMetal, 0, 0.141, -0.105);
  // Dual heavy clamping rings
  for (const rz of [-0.056, -0.152]) {
    addOptic(new THREE.BoxGeometry(0.044, 0.03, 0.022), mats.cerakoteSteel, 0, 0.162, rz);
    addOptic(new THREE.CylinderGeometry(0.025, 0.025, 0.022, 12), mats.cerakoteSteel, 0, 0.178, rz, Math.PI / 2);
  }

  // --- 2. Chunky CoD 34mm LPVO Tactical Scope Tube ---
  // Main 34mm scope body
  addOptic(new THREE.CylinderGeometry(0.02, 0.02, 0.19, 14), mats.anodizedRail, 0, 0.178, -0.11, Math.PI / 2);
  // Flared 44mm forward objective sunshade bell (-Z)
  addOptic(new THREE.CylinderGeometry(0.027, 0.021, 0.068, 14), mats.cerakoteSteel, 0, 0.178, -0.228, Math.PI / 2);
  addOptic(new THREE.CylinderGeometry(0.0285, 0.0285, 0.014, 14), mats.tacticalFde, 0, 0.178, -0.258, Math.PI / 2);
  // Rear flared ocular eyepiece bell + knurled magnification throw lever (+Z)
  addOptic(new THREE.CylinderGeometry(0.021, 0.0245, 0.052, 14), mats.cerakoteSteel, 0, 0.178, 0.002, Math.PI / 2);
  addOptic(new THREE.BoxGeometry(0.008, 0.026, 0.008), mats.tacticalFde, -0.024, 0.194, -0.016, 0, 0, 0.65);

  // Tactical FDE Elevation (top) & Windage (right) Turrets + Parallax knob (left)
  addOptic(new THREE.CylinderGeometry(0.013, 0.014, 0.022, 12), mats.tacticalFde, 0, 0.205, -0.106);
  addOptic(new THREE.CylinderGeometry(0.011, 0.012, 0.018, 12), mats.tacticalFde, 0.026, 0.178, -0.106, 0, 0, Math.PI / 2);
  addOptic(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 12), mats.parkerizedMetal, -0.025, 0.178, -0.106, 0, 0, Math.PI / 2);

  // Glowing amber-gold anti-reflective objective & ocular glass lenses
  addOptic(new THREE.CircleGeometry(0.023, 14), scopeGlowMat, 0, 0.178, -0.264, 0, Math.PI, 0);
  addOptic(new THREE.CircleGeometry(0.02, 14), scopeGlowMat, 0, 0.178, 0.029);
  // Crisp glowing reticle plane inside ocular housing
  addOptic(new THREE.PlaneGeometry(0.022, 0.022), mats.rmrReticleMat, 0, 0.178, 0.022);

  // --- 3. 45° Canted Side Backup Micro Red-Dot Optic (CoD Hybrid Sight Signature!) ---
  const canted = new THREE.Group();
  canted.position.set(0.032, 0.15, -0.182);
  canted.rotation.z = -Math.PI * 0.25;
  const cMount = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.032), mats.parkerizedMetal);
  canted.add(cMount);
  const cHood = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.02, 0.026), mats.anodizedRail);
  cHood.position.y = 0.014;
  canted.add(cHood);
  const cDot = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.014), mats.rmrReticleMat);
  cDot.position.set(0, 0.015, 0.006);
  canted.add(cDot);
  opticsGroup.add(canted);

  // --- 4. Wide Chunky .50-Cal Box Magazine with Visible Huge Stacked Brass Cartridges ---
  const magazine = new THREE.Group();
  magazine.name = 'Vulcan50_BoxMagazine';
  // Seats cleanly inside the flared .50-cal magwell at (0, -0.048, -0.146)
  magazine.position.set(0, -0.048, -0.146);

  const addMag = (
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0
  ) => {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    magazine.add(m);
    return m;
  };

  // Heavy stamped steel front/rear spine + smoked polycarbonate witness body
  addMag(new THREE.BoxGeometry(0.044, 0.146, 0.096), mats.smokedPolyMag, 0, 0, 0, -0.06);
  // Solid cerakote steel front & rear reinforcement spines
  addMag(new THREE.BoxGeometry(0.046, 0.148, 0.018), mats.cerakoteSteel, 0, 0, -0.042, -0.06);
  addMag(new THREE.BoxGeometry(0.046, 0.148, 0.018), mats.cerakoteSteel, 0, 0, 0.042, -0.06);
  // Horizontal reinforcement ribs across mag sides
  for (let i = 0; i < 3; i++) {
    addMag(new THREE.BoxGeometry(0.048, 0.008, 0.098), mats.anodizedRail, 0, 0.036 - i * 0.036, 0, -0.06);
  }
  // 5 HUGE gleaming .50-cal brass cartridges visibly stacked inside the translucent window!
  for (let i = 0; i < 5; i++) {
    const round = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.0085, 0.072, 8),
      mats.brassCartridge
    );
    round.rotation.x = Math.PI / 2 - 0.06;
    round.position.set(i % 2 === 0 ? -0.006 : 0.006, 0.044 - i * 0.02, 0.002);
    magazine.add(round);
  }
  // Heavy flared FDE tactical bumper basepad
  addMag(new THREE.BoxGeometry(0.052, 0.02, 0.108), mats.tacticalFde, 0, -0.078, 0.005, -0.06);
  addMag(new THREE.BoxGeometry(0.054, 0.008, 0.11), mats.matteRubber, 0, -0.089, 0.006, -0.06);

  return { opticsGroup, magazine, scopeGlowMat };
}
