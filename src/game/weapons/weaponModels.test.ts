import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpectrePistol, createViperSmg, createVulcanHeavy } from './models';
import {
  computeMuzzleBasis,
  computeRecoilCameraImpulse,
  computeTravelingBulletSegment,
} from '../effects/ballistics';
import {
  AMMO_CRATE_COOLDOWN_SEC,
  buildHeavyAmmoCrates,
  stepHeavyAmmoCrates,
  tryCollectAmmoCrate,
} from '../arena/props/ammoCrates';

function countMeshes(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) count += 1;
  });
  return count;
}

test('SPECTRE-9 modular gunsmith sidearm has rich subassemblies & exact socket alignment', () => {
  const pistol = createSpectrePistol();
  const meshCount = countMeshes(pistol.root);
  assert.ok(meshCount >= 40, `Expected chunky detailed SPECTRE-9 (>=40 meshes), got ${meshCount}`);

  // Verify exact articulated part references & anchor coordinates
  assert.equal(pistol.slide.name, 'SPECTRE9_SLIDE');
  assert.equal(pistol.magazine.name, 'SPECTRE9_MAGAZINE');
  assert.equal(pistol.trigger.name, 'SPECTRE9_TRIGGER');
  assert.equal(pistol.hammer.name, 'SPECTRE9_HAMMER');
  assert.ok(pistol.muzzlePoint.position.z < -0.3, 'Suppressor muzzle must project forward along -Z');
  assert.ok(pistol.ejectionPoint.position.x > 0.015, 'Ejection port must sit on right side (+X)');

  // Verify RMR optic and LAM module subassemblies exist
  assert.ok(pistol.root.getObjectByName('SPECTRE9_RMR_OPTIC'), 'Micro RMR reflex sight must exist');
  assert.ok(pistol.root.getObjectByName('SPECTRE9_LAM_MODULE'), 'Underbarrel LAM module must exist');
  assert.ok(pistol.root.getObjectByName('SPECTRE9_SUPPRESSOR'), 'Suppressor subassembly must exist');
});

test('VIPER-X4 modular gunsmith SMG has rich subassemblies & exact left-hand foregrip alignment', () => {
  const smg = createViperSmg();
  const meshCount = countMeshes(smg.root);
  assert.ok(meshCount >= 65, `Expected chunky detailed VIPER-X4 (>=65 meshes), got ${meshCount}`);

  assert.equal(smg.bolt.name, 'VIPERX4_BOLT');
  assert.equal(smg.magazine.name, 'VIPERX4_MAGAZINE');
  assert.ok(smg.muzzlePoint.position.z < -0.4, 'Compensated muzzle must project forward along -Z');
  assert.ok(smg.ejectionPoint.position.x > 0.025, 'SMG ejection port must sit on right side (+X)');

  // Left-hand IK locks onto foregrip around z = -0.212
  const foregrip = smg.root.getObjectByName('VIPERX4_FOREGRIP');
  assert.ok(foregrip, 'Tactical foregrip must exist');
  assert.ok(
    Math.abs(foregrip.position.z - -0.212) < 0.015,
    `Foregrip z (${foregrip.position.z}) must stay aligned with left-hand IK (~ -0.212)`
  );

  // Verify Gunsmith attachment subassemblies
  assert.ok(smg.root.getObjectByName('VIPERX4_HOLO_SIGHT'), 'EOTech holographic sight must exist');
  assert.ok(smg.root.getObjectByName('VIPERX4_PEQ15_LASER'), 'Side PEQ-15 laser module must exist');
  assert.ok(
    smg.root.getObjectByName('VIPERX4_COMPENSATOR_BRAKE'),
    '3-port slotted compensator brake must exist'
  );
});

test('VULCAN-50 modular .50-cal heavy battle rifle has rich gunsmith detail & socket anchors', () => {
  const heavy = createVulcanHeavy();
  const meshCount = countMeshes(heavy.root);
  assert.ok(meshCount >= 60, `Expected chunky detailed VULCAN-50 (>=60 meshes), got ${meshCount}`);

  assert.ok(heavy.bolt instanceof THREE.Mesh, 'Reciprocating .50 bolt must exist');
  assert.ok(heavy.magazine instanceof THREE.Group, 'Detachable .50 box magazine must exist');
  assert.ok(heavy.coilGlowMat instanceof THREE.MeshStandardMaterial, 'Amber kinetic coil glow mat must exist');
  assert.ok(heavy.scopeGlowMat instanceof THREE.MeshStandardMaterial, 'LPVO scope lens glow mat must exist');
  assert.ok(heavy.muzzlePoint.position.z < -0.5, 'Heavy tank-brake muzzle must project forward along -Z');
  assert.ok(heavy.ejectionPoint.position.x > 0.028, 'Heavy ejection port must sit on right side (+X)');
});

test('Traveling ballistic bullet segment moves cleanly from muzzle to impact without overshooting', () => {
  const start = new THREE.Vector3(0, 1.4, 0);
  const end = new THREE.Vector3(0, 1.4, -20);
  const head = new THREE.Vector3();
  const tail = new THREE.Vector3();

  // Mid-flight at t = 0.08s, speed = 100 m/s -> head at -8m, tail at -6m (2m streak)
  const mid = computeTravelingBulletSegment(start, end, 0.08, 100, 2.0, head, tail);
  assert.equal(mid.finished, false);
  assert.ok(Math.abs(mid.head.z - -8) < 1e-4);
  assert.ok(Math.abs(mid.tail.z - -6) < 1e-4);
  assert.ok(Math.abs(mid.length - 2.0) < 1e-4);

  // Post-impact arrival (t = 0.3s -> 30m > 20m + 2m)
  const done = computeTravelingBulletSegment(start, end, 0.3, 100, 2.0, head, tail);
  assert.equal(done.finished, true);
  assert.ok(Math.abs(done.head.z - -20) < 1e-4, 'Head must clamp strictly at impact point');
});

test('Muzzle basis extraction & CoD camera recoil impulses scale cleanly across pistol, SMG, and VULCAN-50', () => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  computeMuzzleBasis(q, fwd, right, up);

  // Rotating +90deg around Y maps local -Z -> -X, +X -> -Z, +Y -> +Y
  assert.ok(Math.abs(fwd.x - -1) < 1e-5 && Math.abs(fwd.z) < 1e-5);
  assert.ok(Math.abs(right.z - -1) < 1e-5 && Math.abs(right.x) < 1e-5);
  assert.ok(Math.abs(up.y - 1) < 1e-5);

  const pistolImp = computeRecoilCameraImpulse('pistol', false, 1);
  const pistolOver = computeRecoilCameraImpulse('pistol', true, -1);
  const smgImp = computeRecoilCameraImpulse('smg', false, 1);
  const heavyImp = computeRecoilCameraImpulse('heavy', false, 1);

  assert.ok(pistolOver.fovKickDeg > pistolImp.fovKickDeg, 'Overcharge should amplify FOV punch');
  assert.ok(pistolImp.recoilKick > smgImp.recoilKick, 'Single pistol shot should have heavier per-shot kick than SMG');
  assert.ok(pistolImp.rollRad > 0 && pistolOver.rollRad < 0, 'Roll sign alternates camera recoil tilt');

  // VULCAN-50 heavy cannon must dominate FOV punch, backward Z-punch, and optical pulse
  assert.ok(heavyImp.fovKickDeg > pistolOver.fovKickDeg, 'Heavy .50 must deliver the strongest FOV kick');
  assert.ok(heavyImp.zPunchMeters > pistolImp.zPunchMeters, 'Heavy .50 must deliver stronger backward camera Z-punch');
  assert.ok(heavyImp.opticalShotPulse > smgImp.opticalShotPulse, 'Heavy .50 must produce stronger optical rim pulse');
});

test('Interactive 3D Heavy-Ammo Supply Crates handle proximity looting, full-reserve skip, and cooldown respawn', () => {
  const parent = new THREE.Group();
  const { crates, dispose } = buildHeavyAmmoCrates(parent);
  assert.equal(crates.length, 4);

  const target = crates[0];
  // Full reserve (canCollect = false) must NOT consume crate
  const skipped = tryCollectAmmoCrate(crates, target.position.x, target.position.z, false);
  assert.equal(skipped, null);
  assert.equal(target.available, true);

  // Player walks next to crate with ammo room -> loots crate
  const looted = tryCollectAmmoCrate(crates, target.position.x + 0.4, target.position.z - 0.3, true);
  assert.equal(looted?.id, target.id);
  assert.equal(target.available, false);
  assert.equal(target.cooldownRemaining, AMMO_CRATE_COOLDOWN_SEC);

  // Immediate re-collection must fail while on cooldown
  const secondTry = tryCollectAmmoCrate(crates, target.position.x, target.position.z, true);
  assert.equal(secondTry, null);

  // Stepping past cooldown restocks the crate
  stepHeavyAmmoCrates(crates, AMMO_CRATE_COOLDOWN_SEC + 0.5, 20);
  assert.equal(target.available, true);
  dispose();
});
