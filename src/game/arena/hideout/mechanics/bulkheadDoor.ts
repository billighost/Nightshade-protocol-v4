import * as THREE from 'three';
import type { HideoutMaterialRegistry } from '../materials';
import {
  FLOOR_CATALOG,
  type BulkheadDoorRig,
  type ColliderBox3D,
  type FloorNumber,
} from '../types';

export interface BulkheadDoorOptions {
  floor: FloorNumber;
  x: number;
  y: number;
  z: number;
  /** Facing yaw in radians (0 = faces +Z into room; Math.PI = faces -Z into room) */
  rotY?: number;
  /** Clear opening width in meters (default 5.6m; 6.8m for Floor 1 Final Core Vault!) */
  width?: number;
  /** Clear opening height in meters (default 5.4m; 6.5m for Floor 1 Final Core Vault!) */
  height?: number;
  /** Custom overhead plaque title */
  plaqueTitle?: string;
  /** Custom overhead plaque subtitle */
  plaqueSubtitle?: string;
  /** True for secondary arrival airlock shutters on entry portals */
  isArrivalShutter?: boolean;
}

/**
 * Builds a HUGE, MASSIVE, MULTI-PART MECHANICALLY DETAILED FLOOR BULKHEAD DOOR:
 * - Thick armored perimeter jamb frame + heavy beveled lintel header + diagonal corner gussets
 * - Twin interlocking multi-layer armored blast leaves (stepped recessed panels, diagonal cross-ribs,
 *   machined bolt bosses, hazard chevron edge bands, glowing center seam light strip)
 * - 4 sliding hydraulic steel locking bolts that retract FIRST (`openRatio 0 -> 0.25`) before leaves slide apart!
 * - Dual top-mounted articulating hydraulic piston cylinders & chrome rods that telescope cleanly with the leaves
 * - Overhead status beacon lightbar (Locked Crimson/Amber -> Unsealed Cyan/Emerald) + bold floor stencil plaque
 * - Dynamic `ColliderBox3D` (`active: true` when closed, `active: false` once openRatio >= 0.72)
 */
export function buildMassiveBulkheadDoor(
  parent: THREE.Group,
  mats: HideoutMaterialRegistry,
  opts: BulkheadDoorOptions
): BulkheadDoorRig {
  const {
    floor,
    x,
    y,
    z,
    rotY = 0,
    width = 5.6,
    height = 5.4,
    isArrivalShutter = false,
  } = opts;

  const meta = FLOOR_CATALOG[floor];
  const root = new THREE.Group();
  root.name = isArrivalShutter ? `ARRIVAL_BULKHEAD_0${floor}` : `MASSIVE_BULKHEAD_0${floor}`;
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  parent.add(root);

  const raycastMeshes: THREE.Object3D[] = [];
  const pistonRods: THREE.Mesh[] = [];
  const lockBolts: THREE.Mesh[] = [];

  // Per-door animated status beacon & center seam materials (flip Amber/Crimson -> Cyan/Emerald!)
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xef4444,
    emissiveIntensity: 2.6,
    roughness: 0.22,
    metalness: 0.2,
  });
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.2,
  });

  const frameThickness = 0.72;
  const frameDepth = 1.25;
  const halfW = width * 0.5;

  // 1. Monumental Armored Perimeter Jamb Frame & Heavy Overhead Lintel (wraps 5cm cleanly over concrete wall portal edges — ZERO Z-fighting at any distance!)
  const jambH = height - 0.05;
  const jambGeo = new THREE.BoxGeometry(frameThickness, jambH, frameDepth);
  const buttressH = height - 0.05;
  const buttressGeo = new THREE.BoxGeometry(0.44, buttressH, frameDepth + 0.34);
  for (const side of [-1, 1] as const) {
    const jamb = new THREE.Mesh(jambGeo, mats.structuralSteel);
    jamb.position.set(side * (halfW - 0.05 + frameThickness * 0.5), 0.012 + jambH * 0.5, 0);
    jamb.castShadow = true;
    jamb.receiveShadow = true;
    root.add(jamb);
    raycastMeshes.push(jamb);

    // Outer armored buttress flange cleanly separated 2cm outside jamb
    const buttress = new THREE.Mesh(buttressGeo, mats.darkConcrete);
    buttress.position.set(side * (halfW - 0.05 + frameThickness + 0.24), 0.012 + buttressH * 0.5, 0);
    root.add(buttress);
    raycastMeshes.push(buttress);

    // Side status beacon housings mounted cleanly proud of jamb front face
    const sideLamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.14), beaconMat);
    sideLamp.position.set(side * (halfW - 0.05 + frameThickness * 0.5), height * 0.58, frameDepth * 0.5 + 0.08);
    root.add(sideLamp);
  }

  // Heavy overhead lintel bulkhead housing cleanly wrapping 5cm below wall header edge & above jambs (houses hydraulic actuators!)
  const lintelW = width + frameThickness * 2 + 0.94;
  const lintelH = 1.45;
  const lintelDepth = frameDepth + 0.24;
  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(lintelW, lintelH, lintelDepth),
    mats.structuralSteel
  );
  lintel.position.set(0, height - 0.05 + lintelH * 0.5, 0);
  lintel.castShadow = true;
  lintel.receiveShadow = true;
  root.add(lintel);
  raycastMeshes.push(lintel);

  // Diagonal corner armor gussets tucked cleanly inside the portal frame depth (zero coplanar Z faces!)
  const gussetGeo = new THREE.BoxGeometry(0.68, 0.68, frameDepth - 0.12);
  for (const side of [-1, 1] as const) {
    const gusset = new THREE.Mesh(gussetGeo, mats.brushedMetal);
    gusset.position.set(side * (halfW - 0.14), height - 0.14, 0);
    gusset.rotation.z = Math.PI * 0.25;
    root.add(gusset);
  }

  // Overhead Status Lightbar mounted cleanly proud of lintel front face
  const topLightBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.2, 0.14), beaconMat);
  topLightBar.position.set(0, height + 0.38, lintelDepth * 0.5 + 0.076);
  root.add(topLightBar);

  // Overhead Floor Bulkhead Stencil Plaque (bold architectural readability!)
  const plaqueCode = isArrivalShutter ? `0${floor}` : `0${floor}`;
  const plaqueTitle =
    opts.plaqueTitle ??
    (isArrivalShutter
      ? `AIRLOCK ENTRY 0${floor}`
      : floor === 1
        ? 'CORE INNER SANCTUM'
        : `BULKHEAD 0${floor} EXIT`);
  const plaqueSub =
    opts.plaqueSubtitle ??
    (isArrivalShutter
      ? 'AUTOMATED CONTAINMENT SEAL'
      : floor === 1
        ? 'MASTER REACTOR VAULT'
        : `DESCENT TO FLOOR 0${floor - 1}`);
  const plaqueMat = mats.createStencilMaterial(plaqueCode, plaqueTitle, meta.accentHex, plaqueSub);
  const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.4), plaqueMat);
  plaqueMesh.position.set(0, height + lintelH + 0.85, frameDepth * 0.5 + 0.12);
  root.add(plaqueMesh);

  // Dual Top Hydraulic Piston Cylinders (mounted cleanly proud of lintel front face!)
  const cylGeo = new THREE.CylinderGeometry(0.15, 0.15, width * 0.4, 12);
  cylGeo.rotateZ(Math.PI * 0.5);
  const rodGeo = new THREE.CylinderGeometry(0.08, 0.08, width * 0.25, 10);
  rodGeo.rotateZ(Math.PI * 0.5);

  for (const side of [-1, 1] as const) {
    const cyl = new THREE.Mesh(cylGeo, mats.darkConcrete);
    cyl.position.set(side * (halfW * 0.68), height + 0.94, lintelDepth * 0.5 + 0.16);
    root.add(cyl);

    const rod = new THREE.Mesh(rodGeo, mats.brushedMetal);
    rod.position.set(side * (halfW * 0.28), height + 0.94, lintelDepth * 0.5 + 0.16);
    rod.userData.side = side;
    rod.userData.baseX = side * (halfW * 0.28);
    root.add(rod);
    pistonRods.push(rod);
  }

  // 2. Twin Colossal Interlocking Multi-Part Armored Blast Leaves (zero center-seam, jamb, or wall overlap!)
  const leafW = halfW - 0.03; // Crisp 2.4cm center seam + 6mm jamb pocket clearance (zero Z-fighting!)
  const leafH = height - 0.036;
  const leafDepth = 0.52;
  const buildLeaf = (side: -1 | 1): THREE.Group => {
    const leaf = new THREE.Group();
    leaf.name = side === -1 ? 'BulkheadLeafLeft' : 'BulkheadLeafRight';
    root.add(leaf);

    const cx = side * (0.012 + leafW * 0.5);

    // Primary thick blast armor slab (20mm clear of floor/jamb base and 16mm clear of lintel)
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(leafW, leafH, leafDepth),
      mats.structuralSteel
    );
    core.position.set(cx, 0.02 + leafH * 0.5, 0);
    core.castShadow = true;
    core.receiveShadow = true;
    leaf.add(core);
    raycastMeshes.push(core);

    // Strictly layered, non-overlapping face armor details on BOTH sides of each blast leaf:
    // Seam strip sits strictly in |x| ∈ [0.035, 0.125]; armor plates sit strictly in |x| >= 0.19!
    const plateW = leafW - 0.36;
    const plateCx = side * (0.19 + plateW * 0.5);
    const upperH = height * 0.34;
    const upperY = height * 0.73;
    const lowerH = Math.max(0.6, height * 0.44 - 0.46);
    const lowerY = 0.44 + lowerH * 0.5;
    const midY = height * 0.5;

    for (const faceZ of [-1, 1] as const) {
      const plateZ = faceZ * (leafDepth * 0.5 + 0.044); // inner face 4mm proud of core -> zero coplanar face!
      const upperPlate = new THREE.Mesh(
        new THREE.BoxGeometry(plateW, upperH, 0.08),
        mats.brushedMetal
      );
      upperPlate.position.set(plateCx, upperY, plateZ);
      leaf.add(upperPlate);

      const lowerPlate = new THREE.Mesh(
        new THREE.BoxGeometry(plateW, lowerH, 0.08),
        mats.brushedMetal
      );
      lowerPlate.position.set(plateCx, lowerY, plateZ);
      leaf.add(lowerPlate);

      // Heavy horizontal center structural girder bar strictly between lowerPlate & upperPlate
      const midBeam = new THREE.Mesh(
        new THREE.BoxGeometry(plateW + 0.1, 0.38, 0.11),
        mats.darkConcrete
      );
      midBeam.position.set(plateCx, midY, faceZ * (leafDepth * 0.5 + 0.06));
      leaf.add(midBeam);

      // Diagonal armored cross-rib mounted strictly IN FRONT of upperPlate (zero interpenetration!)
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(plateW * 0.8, 0.14, 0.06),
        mats.trimBand
      );
      rib.position.set(plateCx, upperY, faceZ * (leafDepth * 0.5 + 0.118));
      rib.rotation.z = side * 0.28;
      leaf.add(rib);

      // Bottom hazard chevron kickplate cleanly below lowerPlate
      const hazard = new THREE.Mesh(
        new THREE.BoxGeometry(plateW + 0.1, 0.34, 0.07),
        mats.hazardStripe
      );
      hazard.position.set(plateCx, 0.23, faceZ * (leafDepth * 0.5 + 0.04));
      leaf.add(hazard);

      // Glowing vertical interlocking seam strip strictly inside inner meeting edge (clear of all plates!)
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, height - 0.52, 0.08),
        seamMat
      );
      seam.position.set(side * 0.085, height * 0.5, plateZ);
      leaf.add(seam);
    }

    // Staggered interlocking center steel tooth (Left at 34% height, Right at 66% height — zero overlap!)
    const toothY = side === -1 ? height * 0.34 : height * 0.66;
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.42, leafDepth * 0.64),
      mats.brushedMetal
    );
    tooth.position.set(side * 0.045, toothY, 0);
    leaf.add(tooth);

    // 2 heavy sliding steel locking bolts per leaf (withdraw FIRST when unsealing!)
    for (const by of [height * 0.28, height * 0.72]) {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.68, 10),
        mats.trimBand
      );
      bolt.rotation.z = Math.PI * 0.5;
      bolt.position.set(side * 0.36, by, leafDepth * 0.5 + 0.22);
      bolt.userData.side = side;
      bolt.userData.baseX = side * 0.36;
      leaf.add(bolt);
      lockBolts.push(bolt);
    }

    return leaf;
  };

  const leftLeaf = buildLeaf(-1);
  const rightLeaf = buildLeaf(1);

  const leafSlideDistance = halfW * 0.94;
  const slideAxis: 'x' | 'z' = Math.abs(Math.sin(rotY)) > 0.7 ? 'z' : 'x';

  // Build world-space dynamic ColliderBox3D spanning the door opening
  const halfSpanX = slideAxis === 'x' ? halfW + 0.2 : frameDepth * 0.55;
  const halfSpanZ = slideAxis === 'z' ? halfW + 0.2 : frameDepth * 0.55;
  const collider: ColliderBox3D = {
    id: isArrivalShutter ? `arrival_door_0${floor}` : `bulkhead_door_0${floor}`,
    minX: x - halfSpanX,
    maxX: x + halfSpanX,
    minY: y,
    maxY: y + height + 0.8,
    minZ: z - halfSpanZ,
    maxZ: z + halfSpanZ,
    active: true,
    walkableTop: false,
    tag: 'bulkhead_door',
  };

  const rig: BulkheadDoorRig = {
    floor,
    root,
    leftLeaf,
    rightLeaf,
    pistonRods,
    lockBolts,
    beaconMat,
    seamMat,
    collider,
    raycastMeshes,
    leafSlideDistance,
    slideAxis,
    openRatio: 0,
    setOpenRatio: (ratio: number, unlocked: boolean) => {
      const clamped = Math.max(0, Math.min(1, ratio));
      rig.openRatio = clamped;

      // Stage 1 (0.0 -> 0.25): Locking bolts retract sharply into leaf housing
      const boltT = Math.min(1, clamped / 0.25);
      for (let i = 0; i < lockBolts.length; i++) {
        const b = lockBolts[i];
        const side = b.userData.side as number;
        const baseX = b.userData.baseX as number;
        b.position.x = baseX + side * boltT * 0.42;
      }

      // Stage 2 (0.18 -> 1.0): Massive twin blast leaves glide smoothly into the armored jamb/buttress pocket
      // without ever protruding past the outer buttress or poking through adjacent 0.60m concrete/basalt walls!
      const rawSlide = Math.max(0, (clamped - 0.18) / 0.82);
      const slideT = rawSlide * rawSlide * (3 - 2 * rawSlide);
      const innerEdge = 0.012 + slideT * leafSlideDistance;
      const pocketLimitX = halfW + frameThickness + 0.36; // strictly inside jamb + buttress housing!
      const outerEdge = Math.min(innerEdge + leafW, pocketLimitX);
      const scaleX = Math.max(0.18, (outerEdge - innerEdge) / leafW);
      const leafShift = innerEdge - 0.012 * scaleX;
      leftLeaf.scale.x = scaleX;
      rightLeaf.scale.x = scaleX;
      leftLeaf.position.x = -leafShift;
      rightLeaf.position.x = leafShift;

      // Hydraulic piston rods retract outward with the leaves
      for (let i = 0; i < pistonRods.length; i++) {
        const rod = pistonRods[i];
        const side = rod.userData.side as number;
        const baseX = rod.userData.baseX as number;
        rod.position.x = baseX + side * slideT * (halfW * 0.46);
      }

      // Flip beacon & seam colors cleanly: Locked Amber/Red -> Unlocked Cyan/Emerald!
      if (unlocked || clamped > 0.02) {
        beaconMat.color.setHex(0x22d3ee);
        beaconMat.emissive.setHex(0x06b6d4);
        beaconMat.emissiveIntensity = 2.8;
        seamMat.color.setHex(0x34d399);
        seamMat.emissive.setHex(0x10b981);
        seamMat.emissiveIntensity = 2.6;
      } else {
        beaconMat.color.setHex(0xf59e0b);
        beaconMat.emissive.setHex(0xef4444);
        beaconMat.emissiveIntensity = 2.6;
        seamMat.color.setHex(0xf59e0b);
        seamMat.emissive.setHex(0xf59e0b);
        seamMat.emissiveIntensity = 2.2;
      }

      // Disable solid door collider once wide enough for the operative to stride cleanly through!
      collider.active = clamped < 0.72;
    },
  };

  return rig;
}
