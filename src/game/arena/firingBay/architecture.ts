import * as THREE from 'three';
import type { ColliderRect } from '../../core/types';
import type { ArenaMaterialPalette } from './materials';

export const BAY_DIMENSIONS = {
  width: 22, // X: -11 .. +11 (human-scale indoor proving bay)
  depth: 28, // Z: -14 .. +14
  height: 4.6, // realistic industrial bay ceiling (not a 9.5m stadium void!)
  spawnX: 0,
  spawnZ: 9.2,
} as const;

export interface ArchitectureBuildResult {
  colliders: ColliderRect[];
  wallMeshes: THREE.Object3D[];
}

/**
 * Builds Sector 04 Tactical Proving Bay at strict 1:1 real-world human scale (1 unit = 1.00m):
 * - 22m x 28m x 4.6m room with 1.0m concrete slabs & 0.72m center steel grate trench
 * - 4.2m ceiling cross-girders & suspended industrial caged light fixtures at 3.85m
 * - 3.0m x 2.8m human-passage armored blast door on North end
 * - 1.8m x 1.05m eye-level holographic tactical consoles on East/West walls
 * - 0.78m x 0.78m structural pillars & 0.94m waist-high ballistic cover barricades
 * - Armory shelving & grounded equipment crates behind spawn for realistic spy-base scale
 */
export function buildBayArchitecture(
  group: THREE.Group,
  mats: ArenaMaterialPalette
): ArchitectureBuildResult {
  const colliders: ColliderRect[] = [];
  const wallMeshes: THREE.Object3D[] = [];

  const { width: W, depth: D, height: H } = BAY_DIMENSIONS;
  const halfW = W / 2;
  const halfD = D / 2;

  const addStaticBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    addCollider = false,
    receiveWallHit = true,
    maxY?: number
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (receiveWallHit) wallMeshes.push(mesh);
    if (addCollider) {
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        maxY,
      });
    }
    return mesh;
  };

  // 1. Floor (1.0m x 1.0m wet concrete slabs) + Center Steel Drainage Grate (0.72m wide)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  wallMeshes.push(floor);

  const grate = new THREE.Mesh(new THREE.PlaneGeometry(0.72, D - 2.4), mats.grate);
  grate.rotation.x = -Math.PI / 2;
  grate.position.set(0, 0.008, 0);
  grate.receiveShadow = true;
  group.add(grate);

  // Thin glowing cyan range lane rails flanking the drainage grate
  for (const gx of [-0.42, 0.42]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, D - 2.6), mats.cyanStrip);
    rail.position.set(gx, 0.006, 0);
    group.add(rail);
  }

  // Painted range distance markers on floor (5m, 10m, 15m from firing line z = 7.5)
  for (const rz of [2.5, -2.5, -7.5]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 0.008, 0.06), mats.amberStrip);
    line.position.set(0, 0.004, rz);
    group.add(line);
  }

  // 2. Perimeter Reinforced Bulkhead Walls (4.6m tall) & Ceiling Deck
  addStaticBox(W, H, 0.4, 0, H / 2, -halfD, mats.bulkhead, false, true); // North downrange wall
  addStaticBox(W, H, 0.4, 0, H / 2, halfD, mats.bulkhead, false, true); // South rear wall
  addStaticBox(0.4, H, D, -halfW, H / 2, 0, mats.bulkhead, false, true); // West wall
  addStaticBox(0.4, H, D, halfW, H / 2, 0, mats.bulkhead, false, true); // East wall

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.darkSteel);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  group.add(ceiling);

  // Wall base plinths + amber safety chevron trim (at realistic 0.24m kick-plate height)
  addStaticBox(W - 0.5, 0.26, 0.14, 0, 0.13, -halfD + 0.26, mats.hazard, false, false);
  addStaticBox(W - 0.5, 0.26, 0.14, 0, 0.13, halfD - 0.26, mats.hazard, false, false);
  addStaticBox(0.14, 0.26, D - 0.5, -halfW + 0.26, 0.13, 0, mats.hazard, false, false);
  addStaticBox(0.14, 0.26, D - 0.5, halfW - 0.26, 0.13, 0, mats.hazard, false, false);

  // Subtle horizontal cyan architectural wall guide strips at chest height (1.28m)
  for (const sx of [-halfW + 0.24, halfW - 0.24]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, D - 1.2), mats.cyanStrip);
    strip.position.set(sx, 1.28, 0);
    group.add(strip);
  }

  // 3. Ceiling Structural Steel I-Beams (y = 4.28m) & Caged Industrial Lamps (y = 3.92m)
  for (let z = -11; z <= 11; z += 5.5) {
    addStaticBox(W - 0.4, 0.28, 0.34, 0, H - 0.22, z, mats.darkSteel, false, false);

    // Twin suspended industrial light bars at human-readable 3.92m ceiling drop
    for (const lx of [-4.6, 4.6]) {
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.22), mats.darkSteel);
      fixture.position.set(lx, H - 0.56, z);
      group.add(fixture);

      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.04, 0.12),
        Math.abs(z) % 11 === 0 ? mats.cyanStrip : mats.amberStrip
      );
      tube.position.set(lx, H - 0.61, z);
      group.add(tube);

      // Suspension rods connecting fixture cleanly to ceiling beam
      for (const rx of [-0.75, 0.75]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6), mats.darkSteel);
        rod.position.set(lx + rx, H - 0.38, z);
        group.add(rod);
      }
    }
  }

  // 4. North Wall Landmark: Human-Scale Armored Blast Door (3.0m wide x 2.8m tall)
  const doorFrameTop = addStaticBox(3.5, 0.32, 0.46, 0, 2.96, -halfD + 0.28, mats.darkSteel, false, true);
  doorFrameTop.castShadow = false;
  addStaticBox(0.32, 2.8, 0.46, -1.66, 1.4, -halfD + 0.28, mats.darkSteel, false, true);
  addStaticBox(0.32, 2.8, 0.46, 1.66, 1.4, -halfD + 0.28, mats.darkSteel, false, true);
  // Twin recessed blast door leaves
  addStaticBox(1.46, 2.74, 0.24, -0.75, 1.37, -halfD + 0.22, mats.bulkhead, false, true);
  addStaticBox(1.46, 2.74, 0.24, 0.75, 1.37, -halfD + 0.22, mats.bulkhead, false, true);
  // Subtle amber lockdown header beacon above door
  const doorBeacon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), mats.amberStrip);
  doorBeacon.position.set(0, 3.16, -halfD + 0.52);
  group.add(doorBeacon);

  // 5. Eye-Level Holographic Tactical Wall Screens (1.8m wide x 1.05m tall at y = 1.65m)
  const makeWallConsole = (x: number, z: number, rotY: number) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 0.1), mats.darkSteel);
    housing.position.set(x, 1.65, z);
    housing.rotation.y = rotY;
    group.add(housing);
    wallMeshes.push(housing);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.0), mats.holoScreen);
    screen.position.set(
      x + Math.sin(rotY) * 0.06,
      1.65,
      z + Math.cos(rotY) * 0.06
    );
    screen.rotation.y = rotY;
    group.add(screen);
  };
  makeWallConsole(-halfW + 0.26, 3.2, Math.PI / 2);
  makeWallConsole(halfW - 0.26, 3.2, -Math.PI / 2);
  makeWallConsole(-halfW + 0.26, -5.8, Math.PI / 2);
  makeWallConsole(halfW - 0.26, -5.8, -Math.PI / 2);

  // 6. Structural Floor-to-Ceiling Columns (0.78m x 0.78m x 4.6m — true architectural scale!)
  const pillarCoords: Array<[number, number]> = [
    [-6.8, 4.4],
    [6.8, 4.4],
    [-6.8, -3.6],
    [6.8, -3.6],
  ];
  for (const [px, pz] of pillarCoords) {
    addStaticBox(0.78, H, 0.78, px, H / 2, pz, mats.darkSteel, true, true);
    // Base collar & thin vertical cyan accent inlay
    addStaticBox(0.92, 0.34, 0.92, px, 0.17, pz, mats.concreteBarrier, false, true);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.81), mats.cyanStrip);
    strip.position.set(px, 1.75, pz);
    group.add(strip);
  }

  // 7. Waist-High Ballistic Cover Barricades (1.75m wide x 0.94m tall x 0.36m deep — exact crouch cover!)
  const coverCoords: Array<{ x: number; z: number; w: number }> = [
    { x: -3.1, z: 4.8, w: 1.85 },
    { x: 3.1, z: 4.8, w: 1.85 },
    { x: -2.9, z: -0.6, w: 1.75 },
    { x: 2.9, z: -0.6, w: 1.75 },
  ];
  for (const cov of coverCoords) {
    addStaticBox(cov.w, 0.94, 0.36, cov.x, 0.47, cov.z, mats.concreteBarrier, true, true, 0.98);
    // Steel top lip & amber safety strip
    addStaticBox(cov.w + 0.06, 0.07, 0.4, cov.x, 0.955, cov.z, mats.darkSteel, false, true);
    const haz = new THREE.Mesh(new THREE.BoxGeometry(cov.w - 0.12, 0.1, 0.38), mats.hazard);
    haz.position.set(cov.x, 0.16, cov.z);
    group.add(haz);
  }

  // 8. Grounded Armory Equipment Crates & Tactical Storage Racks (gives human-scale visual anchor!)
  // Placed near the rear/side flanks (including behind the operative on the Title Screen!)
  const addCrate = (x: number, z: number, w = 0.82, h = 0.54, d = 0.56, rotY = 0) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.crateMat);
    crate.position.set(x, h / 2, z);
    crate.rotation.y = rotY;
    crate.castShadow = true;
    crate.receiveShadow = true;
    group.add(crate);
    wallMeshes.push(crate);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.06, d + 0.03), mats.darkSteel);
    lid.position.set(x, h - 0.03, z);
    lid.rotation.y = rotY;
    group.add(lid);

    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      maxY: h,
    });
  };
  addCrate(-8.8, 9.8, 0.92, 0.58, 0.62, 0.14);
  addCrate(-8.6, 10.6, 0.72, 0.44, 0.52, -0.08);
  addCrate(8.6, 9.6, 0.95, 0.58, 0.62, -0.18);
  addCrate(8.8, 10.5, 0.74, 0.44, 0.5, 0.1);
  addCrate(-8.8, -9.2, 0.96, 0.62, 0.66, 0.12);
  addCrate(8.8, -9.2, 0.96, 0.62, 0.66, -0.15);

  // Rear Armory Shelving Unit (2.1m tall x 2.4m wide — matches concept art armory rack behind operative!)
  const buildArmoryRack = (x: number, z: number) => {
    const rack = new THREE.Group();
    rack.position.set(x, 0, z);
    // 4 vertical steel posts (2.15m tall)
    for (const px of [-1.15, 1.15]) {
      for (const pz of [-0.28, 0.28]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.15, 0.055), mats.darkSteel);
        post.position.set(px, 1.075, pz);
        rack.add(post);
      }
    }
    // 3 shelves + top LED strip + tactical cases sitting cleanly on shelves
    for (const sy of [0.18, 0.88, 1.56, 2.12]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.04, 0.6), mats.darkSteel);
      shelf.position.y = sy;
      rack.add(shelf);
    }
    const rackLight = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.025, 0.04), mats.cyanStrip);
    rackLight.position.set(0, 2.08, -0.22);
    rack.add(rackLight);

    // Pelican equipment cases resting on shelves
    for (const [cx, cy, cw, ch] of [
      [-0.55, 0.42, 0.72, 0.42],
      [0.45, 0.38, 0.64, 0.34],
      [-0.35, 1.08, 0.86, 0.34],
      [0.58, 1.05, 0.52, 0.28],
      [0.0, 2.32, 0.95, 0.34],
    ]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, 0.44), mats.crateMat);
      box.position.set(cx, cy, 0);
      box.castShadow = true;
      rack.add(box);
    }
    group.add(rack);
    colliders.push({
      minX: x - 1.25,
      maxX: x + 1.25,
      minZ: z - 0.38,
      maxZ: z + 0.38,
      maxY: 2.5,
    });
  };
  buildArmoryRack(-4.4, 12.6);
  buildArmoryRack(4.4, 12.6);

  return { colliders, wallMeshes };
}
