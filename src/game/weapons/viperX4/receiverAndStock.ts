import * as THREE from 'three';
import { createBeveledBox } from '../../core/sculptUtils';
import type { SharedWeaponMaterials } from '../materials';

export interface ViperReceiverAssembly {
  receiverGroup: THREE.Group;
  bolt: THREE.Mesh;
  ejectionPoint: THREE.Object3D;
}

/**
 * VIPER-X4 Chunky CNC Billet Upper & Lower Receiver, Reciprocating Steel Bolt Carrier,
 * Brass Deflector, Folding Side Charging Handle, Ambidextrous Controls, Stippled Pistol Grip,
 * and Collapsing Dual-Rod Tactical PDW Stock with Cheek Riser & Ribbed Rubber Buttpad.
 * Right-hand palm sits at (0, 0, 0); barrel points along -Z.
 */
export function buildViperReceiverAndStock(mats: SharedWeaponMaterials): ViperReceiverAssembly {
  const receiverGroup = new THREE.Group();
  receiverGroup.name = 'VIPERX4_RECEIVER_AND_STOCK';

  // 1. Chunky Multi-Tiered Billet Upper Receiver (CoD MW MP7 / Striker-45 silhouette)
  const upperReceiver = new THREE.Mesh(
    createBeveledBox(0.052, 0.044, 0.235, 0.0055),
    mats.cerakoteSteel
  );
  upperReceiver.position.set(0, 0.068, -0.072);
  upperReceiver.castShadow = true;
  receiverGroup.add(upperReceiver);

  // Lower polymer-alloy chassis & flared SMG magwell housing
  const lowerReceiver = new THREE.Mesh(
    createBeveledBox(0.044, 0.036, 0.195, 0.0045),
    mats.anodizedRail
  );
  lowerReceiver.position.set(0, 0.034, -0.066);
  lowerReceiver.castShadow = true;
  receiverGroup.add(lowerReceiver);

  // Flared forward magazine well collar with tactical grip grooves
  const magwellHousing = new THREE.Mesh(
    createBeveledBox(0.048, 0.048, 0.062, 0.0045),
    mats.stippledPolymer
  );
  magwellHousing.position.set(0, 0.022, -0.116);
  receiverGroup.add(magwellHousing);

  // Side recessed carbon-fiber receiver relief panels & machined cross-pins
  for (const side of [-1, 1] as const) {
    const sideInlay = new THREE.Mesh(
      createBeveledBox(0.005, 0.022, 0.14, 0.0018),
      mats.carbonFiber
    );
    sideInlay.position.set(side * 0.025, 0.066, -0.068);
    receiverGroup.add(sideInlay);
  }
  for (const pinZ of [-0.015, -0.078, -0.145]) {
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0032, 0.0032, 0.054, 8),
      mats.machinedSteel
    );
    pin.rotation.z = Math.PI / 2;
    pin.position.set(0, 0.044, pinZ);
    receiverGroup.add(pin);
  }

  // Full-length top monolithic Picatinny rail spine + machined cross-lugs
  const topRailSpine = new THREE.Mesh(
    createBeveledBox(0.028, 0.009, 0.24, 0.0018),
    mats.parkerizedMetal
  );
  topRailSpine.position.set(0, 0.092, -0.072);
  receiverGroup.add(topRailSpine);

  for (let i = 0; i < 11; i++) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0045, 0.011), mats.anodizedRail);
    lug.position.set(0, 0.0975, 0.032 - i * 0.021);
    receiverGroup.add(lug);
  }

  // 2. Right-Side Ejection Port, Reciprocating Steel Bolt Carrier, & Angled Brass Deflector
  const ejectionPortVoid = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.02, 0.058),
    mats.boreVoid
  );
  ejectionPortVoid.position.set(0.022, 0.068, -0.096);
  receiverGroup.add(ejectionPortVoid);

  // Reciprocating CNC steel bolt carrier (base z = -0.096; kicks back along +Z every shot!)
  const bolt = new THREE.Mesh(
    createBeveledBox(0.014, 0.016, 0.046, 0.0018),
    mats.machinedSteel
  );
  bolt.name = 'VIPERX4_BOLT';
  bolt.position.set(0.021, 0.068, -0.096);
  receiverGroup.add(bolt);

  // Angled shell brass deflector behind ejection port
  const brassDeflector = new THREE.Mesh(
    createBeveledBox(0.013, 0.022, 0.016, 0.002),
    mats.parkerizedMetal
  );
  brassDeflector.position.set(0.028, 0.068, -0.058);
  brassDeflector.rotation.y = 0.42;
  receiverGroup.add(brassDeflector);

  // Left-side non-reciprocating folding charging handle + knurled knob
  const chargeSlot = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.072), mats.boreVoid);
  chargeSlot.position.set(-0.025, 0.074, -0.145);
  receiverGroup.add(chargeSlot);

  const chargeHandle = new THREE.Mesh(
    createBeveledBox(0.026, 0.009, 0.014, 0.002),
    mats.machinedSteel
  );
  chargeHandle.position.set(-0.036, 0.074, -0.168);
  chargeHandle.rotation.y = -0.22;
  receiverGroup.add(chargeHandle);

  // Ambidextrous tactical fire-selector switch & paddle mag release
  for (const side of [-1, 1] as const) {
    const selector = new THREE.Mesh(
      createBeveledBox(0.006, 0.008, 0.024, 0.0015),
      mats.tacticalFde
    );
    selector.position.set(side * 0.024, 0.036, -0.008);
    selector.rotation.x = -0.35;
    receiverGroup.add(selector);
  }

  // 3. Sculpted Ribbed Pistol Grip (origin stays at (0, -0.008, 0.012) for right palm IK!) + Trigger Guard
  const grip = new THREE.Mesh(
    createBeveledBox(0.031, 0.098, 0.045, 0.0045),
    mats.stippledPolymer
  );
  grip.position.set(0, -0.008, 0.012);
  grip.rotation.x = 0.22;
  grip.castShadow = true;
  receiverGroup.add(grip);

  const gripSpine = new THREE.Mesh(
    createBeveledBox(0.025, 0.086, 0.013, 0.003),
    mats.matteRubber
  );
  gripSpine.position.set(0, -0.012, 0.032);
  gripSpine.rotation.x = 0.22;
  receiverGroup.add(gripSpine);

  const gripCap = new THREE.Mesh(
    createBeveledBox(0.034, 0.01, 0.048, 0.0025),
    mats.parkerizedMetal
  );
  gripCap.position.set(0, -0.056, 0.022);
  gripCap.rotation.x = 0.22;
  receiverGroup.add(gripCap);

  // Winter-gloved enlarged tactical trigger guard + curved trigger shoe
  const guardBottom = new THREE.Mesh(
    createBeveledBox(0.015, 0.0065, 0.058, 0.0018),
    mats.anodizedRail
  );
  guardBottom.position.set(0, -0.005, -0.032);
  receiverGroup.add(guardBottom);

  const guardFront = new THREE.Mesh(
    createBeveledBox(0.015, 0.03, 0.008, 0.0018),
    mats.anodizedRail
  );
  guardFront.position.set(0, 0.008, -0.058);
  receiverGroup.add(guardFront);

  const trigger = new THREE.Mesh(
    createBeveledBox(0.006, 0.02, 0.006, 0.0012),
    mats.machinedSteel
  );
  trigger.position.set(0, 0.014, -0.026);
  trigger.rotation.x = -0.32;
  receiverGroup.add(trigger);

  // 4. Collapsing Dual-Rod Tactical PDW Stock + Cheek Riser + Heavy Ribbed Buttpad
  const stockMountBlock = new THREE.Mesh(
    createBeveledBox(0.048, 0.062, 0.032, 0.004),
    mats.parkerizedMetal
  );
  stockMountBlock.position.set(0, 0.056, 0.052);
  receiverGroup.add(stockMountBlock);

  // Twin telescoping machined steel guide rods (iconic MP7 / PDW look!)
  for (const side of [-1, 1] as const) {
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0052, 0.0052, 0.168, 10),
      mats.machinedSteel
    );
    rod.rotation.x = Math.PI / 2;
    rod.position.set(side * 0.021, 0.062, 0.132);
    receiverGroup.add(rod);

    const lowerStrut = new THREE.Mesh(
      createBeveledBox(0.009, 0.012, 0.158, 0.002),
      mats.anodizedRail
    );
    lowerStrut.position.set(side * 0.016, 0.024, 0.128);
    lowerStrut.rotation.x = 0.24;
    receiverGroup.add(lowerStrut);
  }

  // Ergonomic angled cheek rest bridge
  const cheekRiser = new THREE.Mesh(
    createBeveledBox(0.038, 0.02, 0.115, 0.004),
    mats.stippledPolymer
  );
  cheekRiser.position.set(0, 0.072, 0.126);
  receiverGroup.add(cheekRiser);

  // Heavy recoil-absorbing rubber buttpad with rear traction ribs
  const buttFrame = new THREE.Mesh(
    createBeveledBox(0.036, 0.102, 0.02, 0.004),
    mats.anodizedRail
  );
  buttFrame.position.set(0, 0.034, 0.208);
  buttFrame.castShadow = true;
  receiverGroup.add(buttFrame);

  const buttRubber = new THREE.Mesh(
    createBeveledBox(0.038, 0.106, 0.016, 0.0045),
    mats.matteRubber
  );
  buttRubber.position.set(0, 0.034, 0.221);
  receiverGroup.add(buttRubber);

  // QD rear sling swivel ring
  const slingRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.009, 0.0022, 6, 12),
    mats.machinedSteel
  );
  slingRing.position.set(-0.027, 0.056, 0.056);
  slingRing.rotation.y = Math.PI / 2;
  receiverGroup.add(slingRing);

  const ejectionPoint = new THREE.Object3D();
  ejectionPoint.name = 'VIPERX4_EJECTION_POINT';
  ejectionPoint.position.set(0.034, 0.068, -0.096);

  return {
    receiverGroup,
    bolt,
    ejectionPoint,
  };
}
