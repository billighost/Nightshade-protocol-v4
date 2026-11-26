import * as THREE from 'three';
import { createBeveledBox } from '../../core/sculptUtils';
import type { SharedWeaponMaterials } from '../materials';

export interface SpectreSlideAssembly {
  slide: THREE.Group;
  barrelGroup: THREE.Group;
  hammer: THREE.Mesh;
  ejectionPoint: THREE.Object3D;
  sightMat: THREE.MeshStandardMaterial;
}

/**
 * SPECTRE-9 CNC-Machined Reciprocating Slide, Fluted Match Barrel, Exposed Chamber Hood,
 * Articulated Skeletonized Hammer, Suppressor-Height Tritium Co-Witness Sights, and
 * Chunky Micro RMR Reflex Red-Dot Sight with Tinted Glass & Glowing Reticle.
 */
export function buildSpectreSlideAndBarrel(mats: SharedWeaponMaterials): SpectreSlideAssembly {
  // Per-instance glowing tritium material so overcharge tinting stays isolated per rig
  const sightMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.1,
    roughness: 0.22,
    metalness: 0.2,
  });

  // 1. Stationary Internal Match Barrel, Guide Rod & Chamber Block (stays put while slide reciprocates!)
  const barrelGroup = new THREE.Group();
  barrelGroup.name = 'SPECTRE9_BARREL_GROUP';

  // Fluted stainless match barrel
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0082, 0.0086, 0.165, 14),
    mats.machinedSteel
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.059, -0.072);
  barrelGroup.add(barrel);

  // Exposed stainless locking chamber hood visible through the ejection port
  const chamberHood = new THREE.Mesh(
    createBeveledBox(0.02, 0.017, 0.044, 0.0022),
    mats.machinedSteel
  );
  chamberHood.position.set(0.001, 0.064, -0.052);
  barrelGroup.add(chamberHood);

  // Chambered brass cartridge rim subtly glinting inside ejection port when slide kicks back
  const chamberedBrass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0046, 0.0046, 0.018, 8),
    mats.brassCartridge
  );
  chamberedBrass.rotation.x = Math.PI / 2;
  chamberedBrass.position.set(0.005, 0.063, -0.042);
  barrelGroup.add(chamberedBrass);

  // Lower recoil spring guide rod protruding cleanly beneath muzzle
  const guideRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0042, 0.0042, 0.125, 10),
    mats.heatBluedSteel
  );
  guideRod.rotation.x = Math.PI / 2;
  guideRod.position.set(0, 0.043, -0.09);
  barrelGroup.add(guideRod);

  // Articulated skeletonized external hammer (cocks back cleanly on every shot!)
  const hammerGeo = createBeveledBox(0.007, 0.022, 0.014, 0.0016);
  hammerGeo.translate(0, 0.008, 0.004);
  const hammer = new THREE.Mesh(hammerGeo, mats.machinedSteel);
  hammer.name = 'SPECTRE9_HAMMER';
  hammer.position.set(0, 0.052, 0.036);
  hammer.rotation.x = -0.35;
  barrelGroup.add(hammer);

  // 2. Reciprocating CNC-Beveled Upper Slide (local origin at z = -0.052 to match animation offsets!)
  const slide = new THREE.Group();
  slide.name = 'SPECTRE9_SLIDE';
  slide.position.set(0, 0.061, -0.052);

  // Main slide body (two-tier chamfered silhouette for chunky CoD tactical presence)
  const slideLower = new THREE.Mesh(
    createBeveledBox(0.034, 0.022, 0.178, 0.0032),
    mats.cerakoteSteel
  );
  slideLower.position.set(0, -0.002, 0);
  slideLower.castShadow = true;
  slide.add(slideLower);

  // Chamfered top crown with lightening cuts
  const slideCrown = new THREE.Mesh(
    createBeveledBox(0.027, 0.01, 0.172, 0.0025),
    mats.cerakoteSteel
  );
  slideCrown.position.set(0, 0.011, 0);
  slideCrown.castShadow = true;
  slide.add(slideCrown);

  // Darkened ejection port recess + external steel extractor claw on right face
  const ejectionRecess = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.014, 0.042),
    mats.boreVoid
  );
  ejectionRecess.position.set(0.009, 0.005, -0.004);
  slide.add(ejectionRecess);

  const extractor = new THREE.Mesh(
    createBeveledBox(0.004, 0.0055, 0.034, 0.001),
    mats.parkerizedMetal
  );
  extractor.position.set(0.0165, 0.003, 0.026);
  slide.add(extractor);

  // Forward top slide lightening port (revealing fluted steel barrel underneath!)
  const topWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.013, 0.004, 0.034),
    mats.boreVoid
  );
  topWindow.position.set(0, 0.0155, -0.052);
  slide.add(topWindow);

  // Aggressive angled rear & front CNC cocking serrations
  for (let i = 0; i < 6; i++) {
    const rearSer = new THREE.Mesh(
      new THREE.BoxGeometry(0.0365, 0.017, 0.0034),
      mats.parkerizedMetal
    );
    rearSer.position.set(0, -0.001, 0.042 + i * 0.0072);
    rearSer.rotation.x = 0.22;
    slide.add(rearSer);
  }
  for (let i = 0; i < 4; i++) {
    const frontSer = new THREE.Mesh(
      new THREE.BoxGeometry(0.0358, 0.015, 0.0032),
      mats.parkerizedMetal
    );
    frontSer.position.set(0, -0.001, -0.072 + i * 0.0072);
    frontSer.rotation.x = 0.22;
    slide.add(frontSer);
  }

  // Rear striker backplate
  const backplate = new THREE.Mesh(
    createBeveledBox(0.024, 0.022, 0.006, 0.0014),
    mats.parkerizedMetal
  );
  backplate.position.set(0, 0.001, 0.088);
  slide.add(backplate);

  // 3. Suppressor-Height Co-Witness Tritium Iron Sights
  const rearSight = new THREE.Mesh(
    createBeveledBox(0.023, 0.011, 0.01, 0.0016),
    mats.parkerizedMetal
  );
  rearSight.position.set(0, 0.019, 0.078);
  slide.add(rearSight);

  for (const sx of [-0.007, 0.007]) {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.0034, 0.0034, 0.0028), sightMat);
    dot.position.set(sx, 0.021, 0.083);
    slide.add(dot);
  }

  const frontSight = new THREE.Mesh(
    createBeveledBox(0.0058, 0.012, 0.013, 0.0012),
    mats.parkerizedMetal
  );
  frontSight.position.set(0, 0.02, -0.078);
  slide.add(frontSight);

  const frontDot = new THREE.Mesh(new THREE.BoxGeometry(0.0036, 0.0036, 0.0028), sightMat);
  frontDot.position.set(0, 0.0225, -0.072);
  slide.add(frontDot);

  // 4. Chunky Slide-Mounted Micro RMR Red-Dot Reflex Sight (CoD MW Cronen Mini Pro / GI Mini Reflex!)
  const rmrGroup = new THREE.Group();
  rmrGroup.name = 'SPECTRE9_RMR_OPTIC';
  rmrGroup.position.set(0, 0.018, 0.044);

  const rmrBase = new THREE.Mesh(
    createBeveledBox(0.032, 0.009, 0.044, 0.0018),
    mats.anodizedRail
  );
  rmrGroup.add(rmrBase);

  // Armored arched reflex hood (left wall, right wall, top bridge)
  for (const side of [-1, 1] as const) {
    const wall = new THREE.Mesh(
      createBeveledBox(0.0048, 0.021, 0.03, 0.0012),
      mats.anodizedRail
    );
    wall.position.set(side * 0.0135, 0.014, -0.004);
    rmrGroup.add(wall);
  }
  const hoodTop = new THREE.Mesh(
    createBeveledBox(0.032, 0.0048, 0.028, 0.0012),
    mats.anodizedRail
  );
  hoodTop.position.set(0, 0.024, -0.004);
  rmrGroup.add(hoodTop);

  // Elevation & windage adjustment brass/FDE screws
  const elevScrew = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0032, 0.0032, 0.004, 8),
    mats.tacticalFde
  );
  elevScrew.position.set(0, 0.006, 0.014);
  rmrGroup.add(elevScrew);

  // Tinted anti-reflective optic glass & floating glowing reticle dot
  const rmrLens = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.017), mats.opticGlass);
  rmrLens.position.set(0, 0.014, -0.006);
  rmrGroup.add(rmrLens);

  const rmrReticle = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.014), mats.rmrReticleMat);
  rmrReticle.position.set(0, 0.014, -0.005);
  rmrGroup.add(rmrReticle);

  slide.add(rmrGroup);

  const ejectionPoint = new THREE.Object3D();
  ejectionPoint.name = 'SPECTRE9_EJECTION_POINT';
  ejectionPoint.position.set(0.022, 0.066, -0.048);

  return {
    slide,
    barrelGroup,
    hammer,
    ejectionPoint,
    sightMat,
  };
}
