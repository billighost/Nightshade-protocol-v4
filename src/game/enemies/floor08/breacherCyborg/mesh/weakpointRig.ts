import * as THREE from 'three';
import { createBeveledBox, createStrapTube } from '../../../../core/sculptUtils';
import {
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { BREACHER_CYBORG_CONFIG } from '../config';

export interface BreacherWeakpointAssembly {
  cellGroup: THREE.Group;
  cellMaterial: THREE.MeshStandardMaterial;
  arcHaloMesh: THREE.Mesh;
  weakpointHitbox: THREE.Mesh;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Unmistakable high-detail Left-Shoulder "EMP CAPACITOR CORE & COOLING RACK" for BREACHER-08:
 * - Articulated hydraulic shoulder pylon + ribbed heat-sink base + glowing amber-gold plasma core
 * - 3-tier titanium roll-cage + armored power conduit hose arcing smoothly into dorsal jump-pack
 * - Shooting it shatters the capacitor and triggers an explosive EMP arc overload stun!
 */
export function buildBreacherWeakpointRig(
  enemyId: string,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials
): BreacherWeakpointAssembly {
  const disposables: Array<{ dispose: () => void }> = [];

  const cellGroup = new THREE.Group();
  cellGroup.position.set(-0.205, 0.53, 0.068);
  cellGroup.rotation.set(0.16, 0, 0.22);
  torso.add(cellGroup);

  // Articulated titanium shoulder pylon & heat-sink cradle
  const pylon = new THREE.Mesh(createBeveledBox(0.076, 0.095, 0.095, 0.01), mats.armorSlate);
  pylon.position.set(0.028, -0.072, 0.018);
  cellGroup.add(pylon);

  const cradle = new THREE.Mesh(createBeveledBox(0.118, 0.062, 0.118, 0.012), mats.titaniumJoint);
  cradle.position.y = -0.036;
  cellGroup.add(cradle);

  // Incandescent amber-gold EMP plasma capacitor core
  const cellMaterial = mats.createWeakpointMaterial(0xffb422, 2.8);
  disposables.push(cellMaterial);

  const coreCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.165, 16),
    cellMaterial
  );
  coreCyl.position.y = 0.044;
  cellGroup.add(coreCyl);

  // Top armored discharge cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.054, 0.028, 12), mats.armorSlate);
  cap.position.y = 0.136;
  cellGroup.add(cap);

  // Protective 3-ring titanium roll-cage + 4 vertical guard bars
  for (const ry of [-0.008, 0.044, 0.096]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.057, 0.007, 6, 16),
      mats.armorDark
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    cellGroup.add(ring);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 6), mats.titaniumJoint);
    bar.position.set(Math.cos(a) * 0.057, 0.044, Math.sin(a) * 0.057);
    cellGroup.add(bar);
  }

  // Glowing electric arc halo ring orbiting the capacitor (flares wildly during Rail-Lock!)
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffd264,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(haloMat);
  const arcHaloMesh = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.0075, 6, 20), haloMat);
  arcHaloMesh.rotation.x = Math.PI / 2;
  arcHaloMesh.position.y = 0.044;
  cellGroup.add(arcHaloMesh);

  // Armored high-voltage power conduit curving smoothly from cell base into dorsal pack
  const conduitGeo = createStrapTube(
    [
      new THREE.Vector3(0.04, -0.04, 0.04),
      new THREE.Vector3(0.11, -0.1, 0.11),
      new THREE.Vector3(0.14, -0.22, 0.12),
    ],
    0.016,
    1.0,
    14
  );
  disposables.push(conduitGeo);
  cellGroup.add(new THREE.Mesh(conduitGeo, mats.undersuit));

  // Generous fair weakpoint hitbox around the glowing shoulder EMP battery
  const weakpointHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.SphereGeometry(0.21, 10, 8),
    BREACHER_CYBORG_CONFIG.weakpoint.id
  );
  weakpointHitbox.position.set(0, 0.055, 0);
  cellGroup.add(weakpointHitbox);

  return { cellGroup, cellMaterial, arcHaloMesh, weakpointHitbox, disposables };
}
