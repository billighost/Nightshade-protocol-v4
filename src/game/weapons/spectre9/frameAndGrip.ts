import * as THREE from 'three';
import { createBeveledBox } from '../../core/sculptUtils';
import type { SharedWeaponMaterials } from '../materials';

export interface SpectreFrameAssembly {
  frameGroup: THREE.Group;
  magazine: THREE.Group;
  trigger: THREE.Mesh;
  laserBeam: THREE.Mesh;
}

/**
 * SPECTRE-9 Lower Receiver, Ergonomic Stippled Grip, Flared Magwell, Articulated Trigger,
 * Extended Steel Magazine, and Chunky Under-Barrel Tactical LAM Laser/Light Module.
 * Grip origin (0, 0, 0) seats precisely inside the operative's right palm; barrel points along -Z.
 */
export function buildSpectreFrameAndGrip(mats: SharedWeaponMaterials): SpectreFrameAssembly {
  const frameGroup = new THREE.Group();
  frameGroup.name = 'SPECTRE9_FRAME_AND_GRIP';

  // 1. Sculpted Polymer/Alloy Dust Cover & Rail Chassis with Extended Beavertail Tang
  const mainFrame = new THREE.Mesh(
    createBeveledBox(0.032, 0.031, 0.184, 0.0038),
    mats.anodizedRail
  );
  mainFrame.position.set(0, 0.036, -0.056);
  mainFrame.castShadow = true;
  frameGroup.add(mainFrame);

  // Rear protective beavertail tang over the web of the shooting hand
  const beavertail = new THREE.Mesh(
    createBeveledBox(0.028, 0.015, 0.032, 0.003),
    mats.anodizedRail
  );
  beavertail.position.set(0, 0.044, 0.042);
  beavertail.rotation.x = 0.22;
  frameGroup.add(beavertail);

  // Machined side frame index scallops (thumb rest / gas pedal cuts)
  for (const side of [-1, 1] as const) {
    const railStep = new THREE.Mesh(
      createBeveledBox(0.0055, 0.013, 0.125, 0.0018),
      mats.parkerizedMetal
    );
    railStep.position.set(side * 0.016, 0.033, -0.072);
    frameGroup.add(railStep);
  }

  // Under-frame Picatinny accessory rail slots
  for (let i = 0; i < 5; i++) {
    const lug = new THREE.Mesh(
      createBeveledBox(0.025, 0.006, 0.0085, 0.0014),
      mats.parkerizedMetal
    );
    lug.position.set(0, 0.0195, -0.068 - i * 0.0165);
    frameGroup.add(lug);
  }

  // Mechanical controls: Slide stop lever, Takedown lever, Ambi Mag Release, Cross-pins
  const slideStop = new THREE.Mesh(
    createBeveledBox(0.0055, 0.0085, 0.038, 0.0014),
    mats.machinedSteel
  );
  slideStop.position.set(-0.0175, 0.046, -0.022);
  frameGroup.add(slideStop);

  const takedownLever = new THREE.Mesh(
    createBeveledBox(0.006, 0.01, 0.018, 0.0015),
    mats.machinedSteel
  );
  takedownLever.position.set(-0.0175, 0.038, -0.068);
  frameGroup.add(takedownLever);

  const magRelease = new THREE.Mesh(
    createBeveledBox(0.035, 0.0095, 0.011, 0.0018),
    mats.machinedSteel
  );
  magRelease.position.set(0, 0.016, -0.004);
  frameGroup.add(magRelease);

  for (const pinZ of [-0.018, -0.056, 0.024]) {
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0024, 0.0024, 0.0345, 8),
      mats.machinedSteel
    );
    pin.rotation.z = Math.PI / 2;
    pin.position.set(0, 0.036, pinZ);
    frameGroup.add(pin);
  }

  // 2. Contoured Ergonomic Pistol Grip + Micro-Stippled Wrap Panels + Finger-Groove Frontstrap
  const gripCore = new THREE.Mesh(
    createBeveledBox(0.03, 0.098, 0.045, 0.0045),
    mats.stippledPolymer
  );
  gripCore.position.set(0, -0.008, 0.016);
  gripCore.rotation.x = 0.22;
  gripCore.castShadow = true;
  frameGroup.add(gripCore);

  // Raised tactile side grip inlays & ribbed backstrap swell
  for (const side of [-1, 1] as const) {
    const panel = new THREE.Mesh(
      createBeveledBox(0.005, 0.07, 0.033, 0.0018),
      mats.carbonFiber
    );
    panel.position.set(side * 0.0145, -0.01, 0.017);
    panel.rotation.x = 0.22;
    frameGroup.add(panel);
  }
  const backstrap = new THREE.Mesh(
    createBeveledBox(0.025, 0.082, 0.012, 0.003),
    mats.matteRubber
  );
  backstrap.position.set(0, -0.012, 0.036);
  backstrap.rotation.x = 0.22;
  frameGroup.add(backstrap);

  // Flared competition tactical magwell funnel
  const magwell = new THREE.Mesh(
    createBeveledBox(0.036, 0.014, 0.052, 0.0028),
    mats.parkerizedMetal
  );
  magwell.position.set(0, -0.052, 0.026);
  magwell.rotation.x = 0.22;
  frameGroup.add(magwell);

  // 3. Removable Extended Steel Magazine (base y = -0.015 for reload drop animation)
  const magazine = new THREE.Group();
  magazine.name = 'SPECTRE9_MAGAZINE';
  magazine.position.set(0, -0.015, 0.018);
  magazine.rotation.x = 0.22;

  const magBody = new THREE.Mesh(
    createBeveledBox(0.022, 0.098, 0.033, 0.0022),
    mats.cerakoteSteel
  );
  magazine.add(magBody);

  // Chunky extended +3 tactical bumper basepad
  const basepad = new THREE.Mesh(
    createBeveledBox(0.029, 0.02, 0.044, 0.0028),
    mats.tacticalFde
  );
  basepad.position.set(0, -0.054, 0.002);
  magazine.add(basepad);

  // Brass witness-window rounds visible on the back/side of the mag
  for (let i = 0; i < 4; i++) {
    const witness = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.0022, 0.024, 6),
      mats.brassCartridge
    );
    witness.rotation.z = Math.PI / 2;
    witness.position.set(0, -0.032 + i * 0.012, 0.003);
    magazine.add(witness);
  }
  frameGroup.add(magazine);

  // 4. Undercut Squared Tactical Trigger Guard + Articulated Flat-Face Match Trigger
  const guardBottom = new THREE.Mesh(
    createBeveledBox(0.013, 0.006, 0.048, 0.0018),
    mats.anodizedRail
  );
  guardBottom.position.set(0, -0.004, -0.024);
  frameGroup.add(guardBottom);

  const guardFront = new THREE.Mesh(
    createBeveledBox(0.013, 0.028, 0.007, 0.0018),
    mats.anodizedRail
  );
  guardFront.position.set(0, 0.009, -0.046);
  guardFront.rotation.x = -0.1;
  frameGroup.add(guardFront);

  // Pivotable flat-face tactical trigger shoe (pulled back smoothly on recoil/fire!)
  const triggerGeo = createBeveledBox(0.006, 0.019, 0.0065, 0.0012);
  triggerGeo.translate(0, -0.008, 0);
  const trigger = new THREE.Mesh(triggerGeo, mats.machinedSteel);
  trigger.name = 'SPECTRE9_TRIGGER';
  trigger.position.set(0, 0.022, -0.021);
  trigger.rotation.x = -0.26;
  frameGroup.add(trigger);

  // 5. Chunky Under-Barrel SOCOM LAM Tactical Laser & Illuminator Box (CoD MW X16 / Mk23 style)
  const lamGroup = new THREE.Group();
  lamGroup.name = 'SPECTRE9_LAM_MODULE';
  lamGroup.position.set(0, 0.012, -0.104);

  const lamClamp = new THREE.Mesh(
    createBeveledBox(0.031, 0.012, 0.056, 0.002),
    mats.parkerizedMetal
  );
  lamClamp.position.set(0, 0.01, 0.003);
  lamGroup.add(lamClamp);

  const lamBody = new THREE.Mesh(
    createBeveledBox(0.029, 0.024, 0.072, 0.0032),
    mats.anodizedRail
  );
  lamBody.position.set(0, -0.004, -0.002);
  lamBody.castShadow = true;
  lamGroup.add(lamBody);

  // Front illuminator bezel + glass lens + twin laser emitter aperture
  const torchBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0105, 0.0115, 0.016, 12),
    mats.heatBluedSteel
  );
  torchBezel.rotation.x = Math.PI / 2;
  torchBezel.position.set(0, -0.005, -0.04);
  lamGroup.add(torchBezel);

  const torchLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0085, 0.0085, 0.004, 12),
    mats.lensGlass
  );
  torchLens.rotation.x = Math.PI / 2;
  torchLens.position.set(0, -0.005, -0.047);
  lamGroup.add(torchLens);

  // Side windage/elevation FDE knurled dial & rear ambidextrous paddle switches
  const lamDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.008, 10),
    mats.tacticalFde
  );
  lamDial.rotation.z = Math.PI / 2;
  lamDial.position.set(0.016, -0.003, -0.012);
  lamGroup.add(lamDial);

  for (const side of [-1, 1] as const) {
    const paddle = new THREE.Mesh(
      createBeveledBox(0.0045, 0.011, 0.018, 0.0012),
      mats.matteRubber
    );
    paddle.position.set(side * 0.0155, -0.002, 0.036);
    lamGroup.add(paddle);
  }
  frameGroup.add(lamGroup);

  // Thin volumetric laser beam (toggled when aiming/combat ready)
  const laserGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 12, 6);
  laserGeo.translate(0, -6, 0);
  laserGeo.rotateX(Math.PI / 2);
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const laserBeam = new THREE.Mesh(laserGeo, laserMat);
  laserBeam.position.set(0, 0.007, -0.15);
  laserBeam.visible = false;
  frameGroup.add(laserBeam);

  return {
    frameGroup,
    magazine,
    trigger,
    laserBeam,
  };
}
