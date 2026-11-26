import * as THREE from 'three';
import { createBeveledBox } from '../../../../core/sculptUtils';
import { createEnemyHitboxMesh, type Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface StriderWeakpointParts {
  coreGroup: THREE.Group;
  coreMaterial: THREE.MeshStandardMaterial;
  leftFlapPivot: THREE.Group;
  rightFlapPivot: THREE.Group;
  boosterNozzleLeft: THREE.Object3D;
  boosterNozzleRight: THREE.Object3D;
  plumeCoreLeft: THREE.Mesh;
  plumeOuterLeft: THREE.Mesh;
  plumeCoreRight: THREE.Mesh;
  plumeOuterRight: THREE.Mesh;
  plumeOuterMat: THREE.MeshBasicMaterial;
  plumeCoreMat: THREE.MeshBasicMaterial;
  dashTelegraphMesh: THREE.Mesh;
  dashTelegraphMat: THREE.MeshBasicMaterial;
  setBoosterPlume: (intensity: number, elapsed: number, crimsonMode?: boolean) => void;
  setDashTelegraph: (visible: boolean, length?: number, pulse?: number) => void;
  hitbox: THREE.Mesh;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Dorsal Overclock Spine Booster Pack & Hinged Vent Flaps for KAGE-08 "ONI-BLADE".
 *
 * - Sculpted exo-spine reactor housing + twin hinged winged armor flaps that blow wide open (±58°)
 *   after Iaijutsu Draw Dash or Aerial Helm-Breaker Slam, exposing the incandescent gold-amber core!
 * - Oversized canted twin thruster nozzles firing bold 3-layer volumetric plasma booster plumes:
 *   blazing throat disc + supersonic white-gold inner jet cone + Mach shock-diamond ring +
 *   roaring additive crimson-orange outer plasma sheath!
 */
export function buildStriderWeakpointRig(
  enemyId: string,
  rootGroup: THREE.Group,
  chestGroup: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): StriderWeakpointParts {
  const disposables: Array<{ dispose: () => void }> = [];

  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 0.145, 0.165);
  chestGroup.add(coreGroup);

  // Sculpted armored exo-spine housing
  const housing = new THREE.Mesh(
    createBeveledBox(0.24, 0.34, 0.11, 0.022),
    mats.armorSlate
  );
  housing.castShadow = true;
  coreGroup.add(housing);

  // Recessed glowing Overclock Spine Reactor Core (pulsing gold-amber weakpoint!)
  const coreMaterial = mats.createWeakpointMaterial(0xffb824, 2.1);
  disposables.push(coreMaterial);

  const coreCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.25, 14),
    coreMaterial
  );
  coreCyl.position.set(0, 0.01, 0.048);
  coreGroup.add(coreCyl);

  // Cooling fin rings wrapped around spine reactor core
  for (const yOff of [-0.078, 0, 0.078]) {
    const fin = new THREE.Mesh(
      new THREE.TorusGeometry(0.078, 0.0085, 6, 16),
      mats.titaniumJoint
    );
    fin.rotation.x = Math.PI / 2;
    fin.position.set(0, yOff + 0.01, 0.048);
    coreGroup.add(fin);
  }

  // Twin Hinged Dorsal Armor Vent Flaps (slam open when core overheats/exposes!)
  const flapGeo = createBeveledBox(0.118, 0.3, 0.026, 0.008);
  disposables.push(flapGeo);

  const leftFlapPivot = new THREE.Group();
  leftFlapPivot.position.set(-0.118, 0.01, 0.054);
  const leftFlap = new THREE.Mesh(flapGeo, flashArmorMat);
  leftFlap.position.set(0.058, 0, 0.022);
  leftFlapPivot.add(leftFlap);
  coreGroup.add(leftFlapPivot);

  const rightFlapPivot = new THREE.Group();
  rightFlapPivot.position.set(0.118, 0.01, 0.054);
  const rightFlap = new THREE.Mesh(flapGeo, flashArmorMat);
  rightFlap.position.set(-0.058, 0, 0.022);
  rightFlapPivot.add(rightFlap);
  coreGroup.add(rightFlapPivot);

  // Dual Angled Afterburner Thruster Nozzles + Bold 3-Layer Volumetric Plasma Plumes!
  const nozzleGeo = new THREE.CylinderGeometry(0.042, 0.062, 0.16, 12);
  const throatGeo = new THREE.CircleGeometry(0.05, 12);
  throatGeo.rotateX(Math.PI / 2);

  // Notice: ConeGeometry apex is at +Y, base at -Y -> rotateX(Math.PI) so BASE sits at thruster mouth (y=0)
  // and SHARP FLAME TIP tapers outward down along -Y!! (Previously it tapered backward!)
  const plumeCoreGeo = new THREE.ConeGeometry(0.044, 0.52, 10, 1, true);
  plumeCoreGeo.rotateX(Math.PI);
  plumeCoreGeo.translate(0, -0.26, 0);

  const plumeOuterGeo = new THREE.ConeGeometry(0.095, 0.86, 12, 1, true);
  plumeOuterGeo.rotateX(Math.PI);
  plumeOuterGeo.translate(0, -0.43, 0);

  const shockRingGeo = new THREE.TorusGeometry(0.042, 0.012, 6, 12);
  shockRingGeo.rotateX(Math.PI / 2);

  disposables.push(nozzleGeo, throatGeo, plumeCoreGeo, plumeOuterGeo, shockRingGeo);

  const plumeCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8e2,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plumeOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff441f,
    transparent: true,
    opacity: 0.84,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(plumeCoreMat, plumeOuterMat);

  const buildNozzle = (side: -1 | 1) => {
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.set(side * 0.145, -0.05, 0.065);
    // Point nozzles cleanly backward-and-down (+Z, -Y) like jet fighter afterburners!
    // Rx(-0.78) maps local -Y -> (0, -cos(0.78), +sin(0.78)) = (0, -0.71, +0.70) = DOWN AND BACK!
    nozzleGroup.rotation.set(-0.78, 0, side * 0.22);
    coreGroup.add(nozzleGroup);

    const nozzleMesh = new THREE.Mesh(nozzleGeo, mats.titaniumJoint);
    nozzleGroup.add(nozzleMesh);

    const glowLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.056, 0.008, 6, 12),
      coreMaterial
    );
    glowLip.rotation.x = Math.PI / 2;
    glowLip.position.y = -0.078;
    nozzleGroup.add(glowLip);

    const throat = new THREE.Mesh(throatGeo, plumeCoreMat);
    throat.position.y = -0.072;
    throat.visible = false;
    nozzleGroup.add(throat);

    const plumeCore = new THREE.Mesh(plumeCoreGeo, plumeCoreMat);
    plumeCore.position.y = -0.075;
    plumeCore.visible = false;
    nozzleGroup.add(plumeCore);

    const shockDiamond = new THREE.Mesh(shockRingGeo, plumeCoreMat);
    shockDiamond.position.y = -0.28;
    plumeCore.add(shockDiamond);

    const plumeOuter = new THREE.Mesh(plumeOuterGeo, plumeOuterMat);
    plumeOuter.position.y = -0.072;
    plumeOuter.visible = false;
    nozzleGroup.add(plumeOuter);

    return { nozzleGroup, throat, plumeCore, plumeOuter };
  };

  const leftNoz = buildNozzle(-1);
  const rightNoz = buildNozzle(1);

  const setBoosterPlume = (intensity: number, elapsed: number, crimsonMode = true): void => {
    const active = intensity > 0.04;
    leftNoz.throat.visible = active;
    leftNoz.plumeCore.visible = active;
    leftNoz.plumeOuter.visible = active;
    rightNoz.throat.visible = active;
    rightNoz.plumeCore.visible = active;
    rightNoz.plumeOuter.visible = active;
    if (!active) return;

    const flickerL = 0.88 + Math.sin(elapsed * 58) * 0.12 + Math.cos(elapsed * 91) * 0.07;
    const flickerR = 0.88 + Math.cos(elapsed * 63) * 0.12 + Math.sin(elapsed * 87) * 0.07;
    const len = 0.45 + intensity * 0.95;
    const wid = 0.72 + intensity * 0.48;

    leftNoz.plumeCore.scale.set(wid * 0.88, len * flickerL * 0.94, wid * 0.88);
    leftNoz.plumeOuter.scale.set(wid, len * flickerL, wid);
    rightNoz.plumeCore.scale.set(wid * 0.88, len * flickerR * 0.94, wid * 0.88);
    rightNoz.plumeOuter.scale.set(wid, len * flickerR, wid);

    plumeOuterMat.color.setHex(crimsonMode ? 0xff421f : 0x38bdf8);
    plumeOuterMat.opacity = Math.min(0.92, 0.42 + intensity * 0.46);
    plumeCoreMat.opacity = Math.min(1.0, 0.55 + intensity * 0.45);
  };

  // Floor-projected Iaijutsu Dash Corridor Telegraph Ribbon (root local -Z forward)
  const dashGeo = new THREE.PlaneGeometry(1.02, 1.0);
  dashGeo.rotateX(-Math.PI / 2);
  dashGeo.translate(0, 0.045, -0.5);
  disposables.push(dashGeo);

  const dashTelegraphMat = new THREE.MeshBasicMaterial({
    color: 0xff2244,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(dashTelegraphMat);

  const dashTelegraphMesh = new THREE.Mesh(dashGeo, dashTelegraphMat);
  dashTelegraphMesh.visible = false;
  rootGroup.add(dashTelegraphMesh);

  const setDashTelegraph = (visible: boolean, length = 7.5, pulse = 0.7): void => {
    dashTelegraphMesh.visible = visible;
    if (!visible) return;
    dashTelegraphMesh.scale.set(1, 1, Math.max(1.5, length));
    dashTelegraphMat.opacity = 0.28 + pulse * 0.46;
  };

  // Generous dorsal weakpoint raycast hitbox (tagged 'weakpoint')
  const hitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.SphereGeometry(0.28, 10, 8),
    'spine_thruster_core'
  );
  hitbox.position.set(0, 0.01, 0.09);
  coreGroup.add(hitbox);

  return {
    coreGroup,
    coreMaterial,
    leftFlapPivot,
    rightFlapPivot,
    boosterNozzleLeft: leftNoz.nozzleGroup,
    boosterNozzleRight: rightNoz.nozzleGroup,
    plumeCoreLeft: leftNoz.plumeCore,
    plumeOuterLeft: leftNoz.plumeOuter,
    plumeCoreRight: rightNoz.plumeCore,
    plumeOuterRight: rightNoz.plumeOuter,
    plumeOuterMat,
    plumeCoreMat,
    dashTelegraphMesh,
    dashTelegraphMat,
    setBoosterPlume,
    setDashTelegraph,
    hitbox,
    disposables,
  };
}
