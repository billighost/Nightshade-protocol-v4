import * as THREE from 'three';
import { createBeveledBox, createCurvedPanelGeometry } from '../../../../core/sculptUtils';
import {
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { AEGIS_RIOT_CONFIG } from '../config';

export interface AegisShieldAndWeakpoint {
  shieldGroup: THREE.Group;
  projectorGroup: THREE.Group;
  projectorMaterial: THREE.MeshStandardMaterial;
  shieldHitbox: THREE.Mesh;
  weakpointHitbox: THREE.Mesh;
  setShieldVisualState: (active: boolean, chargeIntensity: number, elapsed: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Generates a crisp procedural Hex-Grid Hard-Light Energy Barrier texture (safe in headless Node tests!).
 */
function createHexBarrierTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Translucent cyan base gradient (brighter along emitter rim edges)
  const bg = ctx.createLinearGradient(0, 0, 256, 0);
  bg.addColorStop(0, 'rgba(60, 240, 255, 0.62)');
  bg.addColorStop(0.18, 'rgba(18, 185, 225, 0.24)');
  bg.addColorStop(0.5, 'rgba(34, 211, 238, 0.34)');
  bg.addColorStop(0.82, 'rgba(18, 185, 225, 0.24)');
  bg.addColorStop(1, 'rgba(60, 240, 255, 0.62)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 512);

  // Crisp glowing hexagonal force-field lattice
  ctx.strokeStyle = 'rgba(148, 250, 255, 0.78)';
  ctx.lineWidth = 2.0;
  const r = 18;
  const dx = r * 1.5;
  const dy = r * Math.sqrt(3);
  for (let row = -1; row < 22; row++) {
    for (let col = -1; col < 12; col++) {
      const cx = col * dx;
      const cy = row * dy + (col % 2 === 0 ? 0 : dy * 0.5);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k * Math.PI) / 3;
        const px = cx + r * 0.92 * Math.cos(ang);
        const py = cy + r * 0.92 * Math.sin(ang);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Subtle horizontal tactical scanlines + bright top/bottom hard-light emitter bands
  ctx.fillStyle = 'rgba(200, 252, 255, 0.16)';
  for (let y = 0; y < 512; y += 8) {
    ctx.fillRect(0, y, 256, 2);
  }
  ctx.fillStyle = 'rgba(185, 254, 255, 0.85)';
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillRect(0, 502, 256, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * AAA Curved Armored Hex-Mesh Ballistic Tower Riot Shield & Central Projector Lens Weakpoint:
 * - Mounted in leftArm.elbow with exact -PI/2 X rotation so when left arm holds guard (lShX+lElX = 1.57),
 *   the curved tower shield stands DEAD UPRIGHT & VERTICAL squarely in front of his torso (-Z)!
 * - Features top armored brow visor, serrated floor-ram spikes, industrial hazard yellow trim,
 *   procedural Hex-Grid Hard-Light Energy Barrier, and glowing central Shield Projector Lens weakpoint!
 */
export function buildAegisShieldAndWeakpoint(
  enemyId: string,
  leftElbow: THREE.Group,
  mats: Floor08EnemyMaterials
): AegisShieldAndWeakpoint {
  const disposables: Array<{ dispose: () => void }> = [];

  const shieldGroup = new THREE.Group();
  // Positioned across center-left torso (+0.15 X inward, -0.27 Y forward along forearm, +0.09 Z downward in guard)
  // Rotated -PI/2 around X so shield local +Y is world UP and -Z is world FORWARD (-Z), letting the glowing T-visor peer cleanly over the brow!
  shieldGroup.position.set(0.15, -0.27, 0.09);
  shieldGroup.rotation.set(-Math.PI * 0.5, 0, 0);
  leftElbow.add(shieldGroup);

  const navyCeramicMat = new THREE.MeshStandardMaterial({
    color: 0x1b2634,
    roughness: 0.76,
    metalness: 0.32,
    bumpMap: mats.armorHeavy.bumpMap,
    bumpScale: 0.015,
  });
  const hazardYellowMat = new THREE.MeshStandardMaterial({
    color: 0xd4961a,
    roughness: 0.52,
    metalness: 0.25,
  });
  const hexTex = createHexBarrierTexture();
  if (hexTex) disposables.push(hexTex);

  const hexEnergyMat = new THREE.MeshBasicMaterial({
    color: 0x4ef2ff,
    map: hexTex ?? undefined,
    transparent: true,
    opacity: 0.74,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const haloRingMat = new THREE.MeshBasicMaterial({
    color: 0x9ef9ff,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(navyCeramicMat, hazardYellowMat, hexEnergyMat, haloRingMat);

  // 1. Curved Armored Ballistic Top Brow & Bottom Ram Skirt (arched smoothly around -Z!)
  const topBrowGeo = createCurvedPanelGeometry(
    [
      { y: 0.44, rx: 0.42, rz: 0.14, thickness: 0.045 },
      { y: 0.66, rx: 0.37, rz: 0.125, thickness: 0.042 },
    ],
    -Math.PI * 0.94,
    -Math.PI * 0.06,
    14
  );
  const botSkirtGeo = createCurvedPanelGeometry(
    [
      { y: -0.68, rx: 0.36, rz: 0.12, thickness: 0.046 },
      { y: -0.44, rx: 0.42, rz: 0.14, thickness: 0.048 },
    ],
    -Math.PI * 0.94,
    -Math.PI * 0.06,
    14
  );
  disposables.push(topBrowGeo, botSkirtGeo);

  const topBrow = new THREE.Mesh(topBrowGeo, navyCeramicMat);
  topBrow.castShadow = true;
  shieldGroup.add(topBrow);

  const botSkirt = new THREE.Mesh(botSkirtGeo, navyCeramicMat);
  botSkirt.castShadow = true;
  shieldGroup.add(botSkirt);

  // Bold industrial hazard yellow caution stripes on top & bottom steel bumpers
  const topHazard = new THREE.Mesh(createBeveledBox(0.52, 0.045, 0.032, 0.006), hazardYellowMat);
  topHazard.position.set(0, 0.56, -0.155);
  shieldGroup.add(topHazard);

  const botHazard = new THREE.Mesh(createBeveledBox(0.5, 0.048, 0.034, 0.006), hazardYellowMat);
  botHazard.position.set(0, -0.54, -0.155);
  shieldGroup.add(botHazard);

  // 4 Heavy Serrated Tungsten Floor-Ram Teeth along bottom rim (for Seismic Shield-Slam!)
  for (let i = 0; i < 4; i++) {
    const tx = -0.24 + i * 0.16;
    const tooth = new THREE.Mesh(createBeveledBox(0.065, 0.088, 0.046, 0.008), mats.titaniumJoint);
    tooth.position.set(tx, -0.71, -0.115 + Math.abs(tx) * 0.18);
    shieldGroup.add(tooth);
  }

  // Left & Right Heavy Wing Frame Pillars (right upper wing slightly notched for shotgun clearance!)
  const leftPillar = new THREE.Mesh(createBeveledBox(0.072, 1.18, 0.072, 0.012), mats.titaniumJoint);
  leftPillar.position.set(-0.39, -0.02, -0.04);
  leftPillar.rotation.y = 0.24;
  shieldGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(createBeveledBox(0.072, 1.04, 0.072, 0.012), mats.titaniumJoint);
  rightPillar.position.set(0.39, -0.08, -0.04);
  rightPillar.rotation.y = -0.24;
  shieldGroup.add(rightPillar);

  // Rear armored gauntlet handle & forearm brace mount connecting cleanly to left forearm
  const rearBrace = new THREE.Mesh(createBeveledBox(0.18, 0.24, 0.085, 0.014), mats.armorSlate);
  rearBrace.position.set(-0.08, 0.02, 0.04);
  shieldGroup.add(rearBrace);

  // 2. Curved Procedural Hex-Grid Hard-Light Energy Barrier Pane (arched smoothly across frame!)
  const energyPaneGeo = createCurvedPanelGeometry(
    [
      { y: -0.46, rx: 0.385, rz: 0.132, thickness: 0.016 },
      { y: 0.0, rx: 0.405, rz: 0.142, thickness: 0.016 },
      { y: 0.46, rx: 0.385, rz: 0.132, thickness: 0.016 },
    ],
    -Math.PI * 0.9,
    -Math.PI * 0.1,
    18
  );
  disposables.push(energyPaneGeo);
  const barrierPane = new THREE.Mesh(energyPaneGeo, hexEnergyMat);
  barrierPane.renderOrder = 3;
  shieldGroup.add(barrierPane);

  // 3. Central Sculpted Glowing Cyan SHIELD PROJECTOR LENS (SIGNATURE WEAKPOINT!)
  const projectorGroup = new THREE.Group();
  projectorGroup.position.set(0, 0.04, -0.158);
  shieldGroup.add(projectorGroup);

  // Armored turbine iris housing + 4 diagonal emitter conduits radiating into shield frame
  const housingRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.125, 0.026, 8, 20),
    mats.titaniumJoint
  );
  projectorGroup.add(housingRing);

  const housingBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.118, 0.13, 0.055, 16),
    navyCeramicMat
  );
  housingBack.rotation.x = Math.PI / 2;
  housingBack.position.z = 0.022;
  projectorGroup.add(housingBack);

  for (let c = 0; c < 4; c++) {
    const a = (c * Math.PI) / 2 + Math.PI / 4;
    const arm = new THREE.Mesh(createBeveledBox(0.024, 0.22, 0.024, 0.004), mats.titaniumJoint);
    arm.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.02);
    arm.rotation.z = a - Math.PI / 2;
    projectorGroup.add(arm);
  }

  // Incandescent cyan projector lens sphere
  const projectorMaterial = mats.createWeakpointMaterial(0x52f6ff, 3.0);
  disposables.push(projectorMaterial);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.096, 16, 12), projectorMaterial);
  lens.scale.set(1, 1, 0.52);
  lens.position.z = -0.012;
  projectorGroup.add(lens);

  // Spinning holographic stabilizer reticle orbiting the projector lens!
  const stabilizerRing = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.011, 6, 24), haloRingMat);
  stabilizerRing.position.z = -0.025;
  projectorGroup.add(stabilizerRing);

  // Hitboxes: weakpoint lens FIRST & forward so aimed shots ALWAYS shatter the projector cleanly!
  const weakpointHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.SphereGeometry(0.21, 10, 8),
    AEGIS_RIOT_CONFIG.weakpoint.id
  );
  weakpointHitbox.position.set(0, 0, -0.05);
  projectorGroup.add(weakpointHitbox);

  const shieldHitbox = createEnemyHitboxMesh(
    enemyId,
    'shield',
    new THREE.BoxGeometry(0.88, 1.42, 0.16)
  );
  shieldHitbox.position.set(0, -0.02, -0.09);
  shieldGroup.add(shieldHitbox);

  const setShieldVisualState = (active: boolean, chargeIntensity: number, elapsed: number): void => {
    barrierPane.visible = active;
    stabilizerRing.visible = active;
    if (!active) return;

    const pulse = 0.72 + Math.sin(elapsed * (6 + chargeIntensity * 14)) * 0.16;
    hexEnergyMat.opacity = Math.min(0.95, 0.58 + pulse * 0.2 + chargeIntensity * 0.24);
    if (chargeIntensity > 0.35) {
      hexEnergyMat.color.setHex(0xb8fcff);
    } else {
      hexEnergyMat.color.setHex(0x4ef2ff);
    }
    if (hexTex) {
      hexTex.offset.y = (elapsed * (0.14 + chargeIntensity * 0.65)) % 1;
    }
    stabilizerRing.rotation.z = elapsed * (2.6 + chargeIntensity * 7.5);
    stabilizerRing.scale.setScalar(0.96 + chargeIntensity * 0.22 + Math.sin(elapsed * 9) * 0.05);
  };

  return {
    shieldGroup,
    projectorGroup,
    projectorMaterial,
    shieldHitbox,
    weakpointHitbox,
    setShieldVisualState,
    disposables,
  };
}
