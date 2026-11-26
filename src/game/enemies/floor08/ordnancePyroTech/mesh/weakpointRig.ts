import * as THREE from 'three';
import { createBeveledBox } from '../../../../core/sculptUtils';
import {
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { ORDNANCE_PYRO_CONFIG } from '../config';

export interface PyroWeakpointAssembly {
  tankGroup: THREE.Group;
  tankMaterial: THREE.MeshStandardMaterial;
  weakpointHitbox: THREE.Mesh;
  setTankState: (
    overdrive: number,
    broken: boolean,
    elapsed: number
  ) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * AAA Signature Weakpoint Rig for FORGE-08 "PYRO-TECH":
 * Massive Dorsal Pressurized Crimson-Orange Thermite Fuel Tank rising prominently ABOVE
 * his broad shoulders so players can flank OR snipe the glowing tank dome!
 * Features:
 * - Sculpted crimson pressurized pressure vessel + glowing molten glass sight-gauge column
 * - Bolted charcoal steel retention bands + industrial side roll-cage bars + top brass valve wheel
 * - Twin Overpressure Exhaust Stacks with live additive furnace-flare jet cones during heavy attacks!
 * - Braided curved fuel feed hose sweeping cleanly from tank base toward his right cannon flank!
 */
export function buildPyroWeakpointRig(
  enemyId: string,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials
): PyroWeakpointAssembly {
  const disposables: Array<{ dispose: () => void }> = [];

  const charcoalSteelMat = new THREE.MeshStandardMaterial({
    color: 0x20242c,
    roughness: 0.62,
    metalness: 0.44,
  });
  const hazardYellowMat = new THREE.MeshStandardMaterial({
    color: 0xe6a622,
    roughness: 0.42,
    metalness: 0.34,
  });
  const brassValveMat = new THREE.MeshStandardMaterial({
    color: 0xc28a32,
    roughness: 0.34,
    metalness: 0.78,
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c22,
    roughness: 0.85,
    metalness: 0.2,
  });

  // High-visibility Pressurized Crimson-Red Steel Fuel Tank (rich crimson under ACES Filmic, never cream!)
  const tankMaterial = new THREE.MeshStandardMaterial({
    color: 0xc81c14,
    emissive: 0xc8180c,
    emissiveIntensity: 0.65,
    roughness: 0.34,
    metalness: 0.24,
  });
  const sightGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    emissive: 0xff6210,
    emissiveIntensity: 2.8,
    roughness: 0.14,
    metalness: 0.1,
  });
  const ventFlameCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8dc,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ventFlameOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff5a12,
    transparent: true,
    opacity: 0.76,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(
    charcoalSteelMat,
    hazardYellowMat,
    brassValveMat,
    hoseMat,
    tankMaterial,
    sightGlassMat,
    ventFlameCoreMat,
    ventFlameOuterMat
  );

  const tankGroup = new THREE.Group();
  tankGroup.position.set(0, 0.43, 0.255);
  torso.add(tankGroup);

  // Heavy welded mounting cradle bolted to backplate
  const cradle = new THREE.Mesh(
    createBeveledBox(0.38, 0.44, 0.14, 0.02),
    charcoalSteelMat
  );
  cradle.position.set(0, -0.02, -0.055);
  cradle.castShadow = true;
  tankGroup.add(cradle);

  // Massive Main Cylindrical Pressurized Crimson Thermite Fuel Tank (rises high above shoulders!)
  const tankBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.152, 0.158, 0.5, 18),
    tankMaterial
  );
  tankBody.position.set(0, 0.04, 0.045);
  tankBody.castShadow = true;
  tankGroup.add(tankBody);

  // Domed top & bottom pressure caps (rises to torso y = 0.43 + 0.36 = 0.79m -> peeks above shoulders!)
  const topDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    tankMaterial
  );
  topDome.position.set(0, 0.29, 0.045);
  tankGroup.add(topDome);

  const bottomDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.158, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    charcoalSteelMat
  );
  bottomDome.position.set(0, -0.21, 0.045);
  tankGroup.add(bottomDome);

  // 2 Heavy Bolted Steel Retention Straps + Hazard Caution Band encircling the tank
  for (const sy of [-0.1, 0.16]) {
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.016, 8, 20),
      charcoalSteelMat
    );
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, sy, 0.045);
    tankGroup.add(strap);
  }

  const hazCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.159, 0.159, 0.045, 18),
    hazardYellowMat
  );
  hazCollar.position.set(0, 0.24, 0.045);
  tankGroup.add(hazCollar);

  // Vertical Glowing Molten Sight-Glass Fuel Level Gauge down the rear face!
  const gaugeFrame = new THREE.Mesh(
    createBeveledBox(0.068, 0.36, 0.036, 0.008),
    charcoalSteelMat
  );
  gaugeFrame.position.set(0, 0.04, 0.194);
  tankGroup.add(gaugeFrame);

  const gaugeCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.034, 0.31, 0.022),
    sightGlassMat
  );
  gaugeCore.position.set(0, 0.04, 0.206);
  tankGroup.add(gaugeCore);

  // Top Brass Pressure-Relief Valve Neck + Handwheel!
  const valveStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.032, 0.08, 10),
    brassValveMat
  );
  valveStem.position.set(0, 0.455, 0.045);
  tankGroup.add(valveStem);

  const valveWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.064, 0.011, 6, 14),
    hazardYellowMat
  );
  valveWheel.rotation.x = Math.PI / 2;
  valveWheel.position.set(0, 0.495, 0.045);
  tankGroup.add(valveWheel);

  // Twin Side Industrial Overpressure Exhaust Stacks + Compact Pressurized Furnace Flame Plumes!
  const ventCoreGeo = new THREE.ConeGeometry(0.022, 0.16, 8, 1, true);
  ventCoreGeo.translate(0, 0.08, 0);
  const ventOuterGeo = new THREE.ConeGeometry(0.044, 0.28, 10, 1, true);
  ventOuterGeo.translate(0, 0.14, 0);
  disposables.push(ventCoreGeo, ventOuterGeo);

  const vents: Array<{ core: THREE.Mesh; outer: THREE.Mesh }> = [];
  for (const side of [-1, 1]) {
    const stackGrp = new THREE.Group();
    stackGrp.position.set(side * 0.215, 0.24, 0.01);
    stackGrp.rotation.z = -side * 0.24;
    stackGrp.rotation.x = 0.14;
    tankGroup.add(stackGrp);

    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.042, 0.28, 10),
      charcoalSteelMat
    );
    stackGrp.add(pipe);

    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(0.036, 0.008, 6, 12),
      brassValveMat
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.14;
    stackGrp.add(lip);

    const core = new THREE.Mesh(ventCoreGeo, ventFlameCoreMat);
    core.position.y = 0.142;
    core.visible = false;
    stackGrp.add(core);

    const outer = new THREE.Mesh(ventOuterGeo, ventFlameOuterMat);
    outer.position.y = 0.14;
    outer.visible = false;
    stackGrp.add(outer);

    vents.push({ core, outer });

    // Protective steel side bumper bar framing the tank
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.46, 8),
      charcoalSteelMat
    );
    bar.position.set(side * 0.185, 0.02, 0.075);
    tankGroup.add(bar);
  }

  // Curved Braided Fuel Supply Hose sweeping cleanly from tank bottom around right waist!
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.11, -0.18, 0.05),
    new THREE.Vector3(0.26, -0.26, 0.02),
    new THREE.Vector3(0.32, -0.28, -0.14),
    new THREE.Vector3(0.28, -0.22, -0.24),
  ]);
  const hoseGeo = new THREE.TubeGeometry(hoseCurve, 14, 0.024, 8, false);
  disposables.push(hoseGeo);
  tankGroup.add(new THREE.Mesh(hoseGeo, hoseMat));

  // Generous weakpoint hitbox enveloping the pressurized tank + upper dome so flanking & shoulder-peeking shots register crisply!
  const weakpointHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.SphereGeometry(0.34, 12, 10),
    ORDNANCE_PYRO_CONFIG.weakpoint.id
  );
  weakpointHitbox.position.set(0, 0.1, 0.06);
  tankGroup.add(weakpointHitbox);

  const setTankState = (overdrive: number, broken: boolean, elapsed: number): void => {
    const showFlames = !broken && overdrive > 0.25;
    for (let i = 0; i < vents.length; i++) {
      const v = vents[i];
      v.core.visible = showFlames;
      v.outer.visible = showFlames;
      if (showFlames) {
        const flick = 0.86 + Math.sin(elapsed * 52 + i * 2.1) * 0.14;
        const h = (0.55 + overdrive * 0.55) * flick;
        const w = 0.78 + overdrive * 0.25;
        v.core.scale.set(w * 0.85, h * 0.88, w * 0.85);
        v.outer.scale.set(w, h, w);
      }
    }

    if (broken) {
      tankMaterial.emissive.setHex(0x4a1008);
      tankMaterial.emissiveIntensity = 0.22;
      sightGlassMat.emissiveIntensity = 0.45;
    } else {
      const pulse = 0.18 * Math.sin(elapsed * (6 + overdrive * 12));
      tankMaterial.emissive.setHex(overdrive > 0.75 ? 0xe02810 : 0xb8160c);
      tankMaterial.emissiveIntensity = 0.45 + overdrive * 0.65 + pulse;
      sightGlassMat.emissiveIntensity = 2.6 + overdrive * 1.4 + pulse;
      ventFlameOuterMat.opacity = Math.min(0.84, 0.42 + overdrive * 0.38);
    }
  };

  return {
    tankGroup,
    tankMaterial,
    weakpointHitbox,
    setTankState,
    disposables,
  };
}
