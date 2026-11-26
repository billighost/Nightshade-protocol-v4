import * as THREE from 'three';
import { createBeveledBox } from '../../../../core/sculptUtils';
import {
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { COMMANDER_KESTREL_CONFIG } from '../config';

export interface KestrelWeakpointAssembly {
  jetpackRoot: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  ventMaterial: THREE.MeshStandardMaterial;
  thrusterGlowMat: THREE.MeshStandardMaterial;
  weakpointHitboxes: THREE.Mesh[];
  setAeroState: (
    phase: 1 | 2,
    ventOpenRatio: number,
    thrusterPower: number,
    broken: boolean,
    elapsed: number
  ) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Iconic Winged Aero-Strike Jump-Pack for COMMANDER KESTREL-08:
 * - Sculpted central obsidian-and-gold turbine pack with glowing spine phase ring
 * - Articulated 3-Feather Swept Aero-Wings on each side (ExtrudeGeometry tapered blades + gold spine ribs + plasma leading vanes!)
 * - Twin High-Perched Blazing-Gold Thermal Vent Cores (WEAKPOINT!) rising above his shoulders
 *   with articulated hinged armored heat-shutter cowls that snap OPEN during thermal venting!
 * - Twin live shimmering additive thruster exhaust cones (cyan-white P1 -> solar-gold P2 Overdrive!)
 */
export function buildKestrelWeakpointRig(
  enemyId: string,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial,
  goldMat: THREE.MeshStandardMaterial
): KestrelWeakpointAssembly {
  const disposables: Array<{ dispose: () => void }> = [];

  const jetpackRoot = new THREE.Group();
  jetpackRoot.position.set(0, 0.43, 0.215);
  torso.add(jetpackRoot);

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x1e232e,
    roughness: 0.48,
    metalness: 0.62,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.012,
  });
  const wingFeatherMat = new THREE.MeshStandardMaterial({
    color: 0x202736,
    roughness: 0.36,
    metalness: 0.68,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.008,
  });
  // Rich molten-gold thermal vent material (tuned for ACES Filmic so it glows rich amber-gold!)
  const ventMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb824,
    emissive: 0xe6840a,
    emissiveIntensity: 1.0,
    roughness: 0.22,
    metalness: 0.35,
  });
  const thrusterGlowMat = new THREE.MeshStandardMaterial({
    color: 0x6ef0ff,
    emissive: 0x28d6ff,
    emissiveIntensity: 2.2,
    roughness: 0.18,
    metalness: 0.2,
  });
  const flameOuterMat = new THREE.MeshBasicMaterial({
    color: 0x38e8ff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flameCoreMat = new THREE.MeshBasicMaterial({
    color: 0xf4fcff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(
    housingMat,
    wingFeatherMat,
    ventMaterial,
    thrusterGlowMat,
    flameOuterMat,
    flameCoreMat
  );

  // Central Aero-Strike Turbine Spine Housing
  const centralCore = new THREE.Mesh(createBeveledBox(0.34, 0.46, 0.17, 0.026), housingMat);
  centralCore.castShadow = true;
  jetpackRoot.add(centralCore);

  const spineGoldPlate = new THREE.Mesh(createBeveledBox(0.14, 0.38, 0.04, 0.008), goldMat);
  spineGoldPlate.position.set(0, 0.01, 0.082);
  jetpackRoot.add(spineGoldPlate);

  const reactorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.068, 0.014, 8, 16),
    thrusterGlowMat
  );
  reactorRing.position.set(0, 0.03, 0.104);
  jetpackRoot.add(reactorRing);

  // Helper to build tapered swept aero-feather blade geometry
  const makeFeatherGeo = (len: number, rootW: number, tipW: number): THREE.ExtrudeGeometry => {
    const s = new THREE.Shape();
    s.moveTo(0, -rootW * 0.5);
    s.lineTo(len * 0.72, -tipW * 0.65);
    s.lineTo(len, 0.015);
    s.lineTo(len * 0.86, tipW * 0.75);
    s.lineTo(0, rootW * 0.55);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    g.translate(0, 0, -0.011);
    disposables.push(g);
    return g;
  };

  const primaryFeatherGeo = makeFeatherGeo(0.92, 0.15, 0.065);
  const midFeatherGeo = makeFeatherGeo(0.76, 0.125, 0.055);
  const lowerFeatherGeo = makeFeatherGeo(0.58, 0.1, 0.048);

  const flameOuterGeo = new THREE.ConeGeometry(0.066, 0.38, 10, 1, true);
  flameOuterGeo.rotateX(Math.PI);
  flameOuterGeo.translate(0, -0.19, 0);
  const flameCoreGeo = new THREE.ConeGeometry(0.034, 0.25, 10, 1, true);
  flameCoreGeo.rotateX(Math.PI);
  flameCoreGeo.translate(0, -0.125, 0);
  disposables.push(flameOuterGeo, flameCoreGeo);

  const shutters: Array<{ pivot: THREE.Group; side: -1 | 1 }> = [];
  const flames: THREE.Group[] = [];
  const ventGlowMeshes: THREE.Mesh[] = [];

  const buildWingAndVent = (side: -1 | 1): { wing: THREE.Group; hitbox: THREE.Mesh } => {
    const wing = new THREE.Group();
    wing.position.set(side * 0.165, 0.11, 0.045);
    jetpackRoot.add(wing);

    // Heavy armored wing-root hinge knuckle
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.056, 0.14, 12),
      goldMat
    );
    hinge.position.set(side * 0.03, 0.02, 0.02);
    wing.add(hinge);

    // 3 Layered Sweeping Valkyrie Aero-Feathers!
    const f1 = new THREE.Mesh(primaryFeatherGeo, wingFeatherMat);
    f1.scale.set(side, 1, 1);
    f1.position.set(side * 0.04, 0.1, 0.03);
    f1.rotation.set(0, -side * 0.18, side * 0.42);
    f1.castShadow = true;
    wing.add(f1);

    // Gold leading-edge blade spine + glowing solar plasma vane along primary feather
    const leadGold = new THREE.Mesh(createBeveledBox(0.82, 0.034, 0.03, 0.005), goldMat);
    leadGold.position.set(side * 0.42, 0.31, 0.095);
    leadGold.rotation.set(0, -side * 0.18, side * 0.43);
    wing.add(leadGold);

    const leadPlasma = new THREE.Mesh(createBeveledBox(0.76, 0.02, 0.022, 0.004), ventMaterial);
    leadPlasma.position.set(side * 0.43, 0.338, 0.098);
    leadPlasma.rotation.set(0, -side * 0.18, side * 0.43);
    wing.add(leadPlasma);

    const f2 = new THREE.Mesh(midFeatherGeo, wingFeatherMat);
    f2.scale.set(side, 1, 1);
    f2.position.set(side * 0.06, -0.02, 0.022);
    f2.rotation.set(0, -side * 0.22, side * 0.18);
    f2.castShadow = true;
    wing.add(f2);

    const f2Trim = new THREE.Mesh(createBeveledBox(0.64, 0.024, 0.026, 0.004), goldMat);
    f2Trim.position.set(side * 0.38, 0.09, 0.082);
    f2Trim.rotation.set(0, -side * 0.22, side * 0.19);
    wing.add(f2Trim);

    const f2Plasma = new THREE.Mesh(createBeveledBox(0.58, 0.016, 0.02, 0.003), ventMaterial);
    f2Plasma.position.set(side * 0.39, 0.112, 0.085);
    f2Plasma.rotation.set(0, -side * 0.22, side * 0.19);
    wing.add(f2Plasma);

    const f3 = new THREE.Mesh(lowerFeatherGeo, flashArmorMat);
    f3.scale.set(side, 1, 1);
    f3.position.set(side * 0.06, -0.14, 0.015);
    f3.rotation.set(0, -side * 0.24, -side * 0.08);
    wing.add(f3);

    // Lower Vectored Aero-Thruster Nozzle + Live Additive Plasma Exhaust Flame Cone
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.set(side * 0.085, -0.26, 0.055);
    nozzleGroup.rotation.set(0.24, 0, -side * 0.14);
    wing.add(nozzleGroup);

    const nozzleBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.078, 0.165, 12),
      housingMat
    );
    nozzleGroup.add(nozzleBell);

    const nozzleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.011, 6, 14),
      goldMat
    );
    nozzleRing.rotation.x = Math.PI / 2;
    nozzleRing.position.y = -0.078;
    nozzleGroup.add(nozzleRing);

    const nozzleCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.054, 0.024, 12),
      thrusterGlowMat
    );
    nozzleCore.position.y = -0.072;
    nozzleGroup.add(nozzleCore);

    const flameGroup = new THREE.Group();
    flameGroup.position.y = -0.084;
    flameGroup.add(
      new THREE.Mesh(flameOuterGeo, flameOuterMat),
      new THREE.Mesh(flameCoreGeo, flameCoreMat)
    );
    nozzleGroup.add(flameGroup);
    flames.push(flameGroup);

    // -------------------------------------------------------------------------
    // TWIN HIGH-PERCHED BLAZING-GOLD THERMAL VENT CORE (SHOOTABLE WEAKPOINT!)
    // Rising prominently above Kestrel-08's shoulders so players can snipe them!
    // -------------------------------------------------------------------------
    const ventGroup = new THREE.Group();
    ventGroup.position.set(side * 0.095, 0.29, -0.01);
    ventGroup.rotation.z = -side * 0.18;
    wing.add(ventGroup);

    // Base brass/gold vent collar + glowing ribbed radiator core cylinder
    const ventBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.102, 0.065, 14),
      housingMat
    );
    ventBase.position.y = -0.11;
    ventGroup.add(ventBase);

    const ventCore = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.078, 0.2, 8, 16),
      ventMaterial
    );
    ventCore.position.y = 0.04;
    ventGroup.add(ventCore);
    ventGlowMeshes.push(ventCore);

    // Glowing radiator cooling rings wrapped around the gold core
    for (const ry of [-0.02, 0.055, 0.13]) {
      const fin = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.009, 6, 16), goldMat);
      fin.rotation.x = Math.PI / 2;
      fin.position.y = ry;
      ventGroup.add(fin);
    }

    // Articulated Hinged Armored Heat-Shutter Cowl (snaps OPEN during thermal venting!)
    const shutterPivot = new THREE.Group();
    shutterPivot.position.set(side * 0.075, -0.075, 0);
    ventGroup.add(shutterPivot);

    const shutterCap = new THREE.Mesh(
      createBeveledBox(0.046, 0.25, 0.145, 0.012),
      flashArmorMat
    );
    shutterCap.position.set(0, 0.125, 0);
    shutterPivot.add(shutterCap);

    const shutterGold = new THREE.Mesh(createBeveledBox(0.052, 0.04, 0.15, 0.006), goldMat);
    shutterGold.position.set(0, 0.23, 0);
    shutterPivot.add(shutterGold);

    shutters.push({ pivot: shutterPivot, side });

    // Generous weakpoint hitbox centered on each blazing gold dorsal thermal vent
    const hitbox = createEnemyHitboxMesh(
      enemyId,
      'weakpoint',
      new THREE.SphereGeometry(0.24, 10, 8),
      COMMANDER_KESTREL_CONFIG.weakpoint.id
    );
    hitbox.position.set(0, 0.05, 0);
    ventGroup.add(hitbox);

    return { wing, hitbox };
  };

  const left = buildWingAndVent(-1);
  const right = buildWingAndVent(1);

  const cyanFlame = new THREE.Color(0x38e8ff);
  const goldFlame = new THREE.Color(0xffaa24);
  const cyanEmissive = new THREE.Color(0x28d6ff);
  const goldEmissive = new THREE.Color(0xff9214);
  const ventClosedColor = new THREE.Color(0x6b4b14);
  const ventHotColor = new THREE.Color(0xff9c14);
  const ventBrokenColor = new THREE.Color(0x2b241d);

  const setAeroState = (
    phase: 1 | 2,
    ventOpenRatio: number,
    thrusterPower: number,
    broken: boolean,
    elapsed: number
  ): void => {
    const isP2 = phase === 2;
    const open = THREE.MathUtils.clamp(ventOpenRatio, 0, 1);
    const flicker = 0.86 + Math.sin(elapsed * 48) * 0.14 + Math.cos(elapsed * 71) * 0.08;

    // Snap armored heat-shutter cowls wide open when venting!
    for (const s of shutters) {
      s.pivot.rotation.z = -s.side * (0.06 + open * 0.88);
    }

    // Rich molten-amber thermal vent glow when exposed; muted bronze when shuttered; charred dark when overloaded
    if (broken) {
      ventMaterial.color.copy(ventBrokenColor);
      ventMaterial.emissive.setHex(0x4a2208);
      ventMaterial.emissiveIntensity = 0.22 + Math.abs(Math.sin(elapsed * 20)) * 0.35;
    } else {
      ventMaterial.color.copy(ventClosedColor).lerp(ventHotColor, 0.35 + open * 0.65);
      ventMaterial.emissive.setHex(open > 0.25 ? 0xff6208 : 0xb85e08);
      ventMaterial.emissiveIntensity =
        0.55 + open * 1.95 + (isP2 ? 0.35 : 0) + Math.sin(elapsed * (open > 0.25 ? 18 : 6)) * 0.22;
    }

    // Thruster flames shift from cyan-white (Phase 1) to roaring solar-gold (Phase 2 Overdrive!)
    thrusterGlowMat.color.copy(isP2 ? goldFlame : cyanFlame);
    thrusterGlowMat.emissive.copy(isP2 ? goldEmissive : cyanEmissive);
    thrusterGlowMat.emissiveIntensity = 1.6 + thrusterPower * 2.4 + (isP2 ? 0.65 : 0);

    flameOuterMat.color.copy(isP2 ? goldFlame : cyanFlame);
    flameOuterMat.opacity = Math.min(0.92, 0.22 + thrusterPower * 0.68);
    flameCoreMat.opacity = Math.min(0.96, 0.28 + thrusterPower * 0.68);

    const sy = (0.32 + thrusterPower * 1.15) * flicker;
    const sxz = (0.68 + thrusterPower * 0.48) * (0.94 + Math.sin(elapsed * 38) * 0.06);
    for (const fl of flames) {
      fl.visible = thrusterPower > 0.04;
      fl.scale.set(sxz, sy, sxz);
    }

    for (const vm of ventGlowMeshes) {
      const s = 1 + open * 0.08 * Math.sin(elapsed * 16);
      vm.scale.set(s, 1 + open * 0.05, s);
    }
  };

  return {
    jetpackRoot,
    leftWing: left.wing,
    rightWing: right.wing,
    ventMaterial,
    thrusterGlowMat,
    weakpointHitboxes: [left.hitbox, right.hitbox],
    setAeroState,
    disposables,
  };
}
