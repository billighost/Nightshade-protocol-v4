import * as THREE from 'three';
import type { HideoutMaterialRegistry } from '../materials';
import {
  FLOOR_CATALOG,
  type ColliderBox3D,
  type ControlCenterRig,
  type ExpressLiftRig,
  type FloorNumber,
} from '../types';

function createControlScreenTexture(
  floor: FloorNumber,
  mode: 'disabled' | 'ready' | 'activated'
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const meta = FLOOR_CATALOG[floor];
  const primary = mode === 'activated' ? '#22d3ee' : mode === 'disabled' ? '#ef4444' : '#fbbf24';
  const badge = mode === 'activated' ? '#10b981' : mode === 'disabled' ? '#b91c1c' : '#f59e0b';

  ctx.fillStyle = mode === 'disabled' ? '#12080c' : '#081018';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = primary;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 236);

  // Header band
  ctx.fillStyle = primary;
  ctx.fillRect(10, 10, 492, 42);
  ctx.fillStyle = '#081018';
  ctx.font = '800 22px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`FLOOR ${meta.code} CONTROL CENTER`, 26, 32);

  // Status readout
  ctx.fillStyle = badge;
  ctx.fillRect(26, 74, 240, 44);
  ctx.fillStyle = mode === 'disabled' ? '#fef2f2' : '#041016';
  ctx.font = '800 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    mode === 'activated'
      ? 'BULKHEAD UNSEALED'
      : mode === 'disabled'
        ? 'LOCKED · HOSTILES'
        : 'READY · OVERRIDE',
    146,
    97
  );

  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 19px monospace';
  ctx.fillText(meta.name.slice(0, 26), 26, 152);

  ctx.fillStyle = primary;
  ctx.font = '700 16px monospace';
  ctx.fillText(
    mode === 'activated'
      ? floor === 1
        ? 'INNER SANCTUM VAULT OPEN'
        : `DESCENT ROUTE TO FL 0${floor - 1} ACTIVE`
      : mode === 'disabled'
        ? 'VANQUISH ALL ENEMIES FIRST'
        : floor === 1
          ? 'PRESS [E] TO OPEN VAULT 01'
          : `PRESS [E] · DESCEND TO FL 0${floor - 1}`,
    26,
    194
  );

  // Right-hand schematic door diagram
  ctx.strokeStyle = primary;
  ctx.lineWidth = 3;
  ctx.strokeRect(360, 74, 116, 118);
  if (mode === 'activated') {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.fillRect(366, 80, 26, 106);
    ctx.fillRect(444, 80, 26, 106);
  } else if (mode === 'disabled') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.34)';
    ctx.fillRect(366, 80, 104, 106);
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(382, 96);
    ctx.lineTo(454, 170);
    ctx.moveTo(454, 96);
    ctx.lineTo(382, 170);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.38)';
    ctx.fillRect(366, 80, 50, 106);
    ctx.fillRect(420, 80, 50, 106);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface ControlCenterOptions {
  floor: FloorNumber;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  interactRadius?: number;
}

/**
 * Builds an unmistakable, multi-part interactive Floor Control Center:
 * - Weighted armored pedestal base & angled command desk
 * - Glowing holographic status display screen (Disabled Crimson -> Ready Golden Sky-Beacon -> Unsealed Cyan!)
 * - Twin flanking status light pylons + radiant diegetic vertical light pillar & pulsing floor sonar ring
 * - Registers solid console collider + proximity interaction trigger
 */
export function buildFloorControlCenter(
  parent: THREE.Group,
  mats: HideoutMaterialRegistry,
  boxes: ColliderBox3D[],
  wallMeshes: THREE.Object3D[],
  opts: ControlCenterOptions
): ControlCenterRig {
  const { floor, x, y, z, rotY = 0, interactRadius = 2.85 } = opts;
  const meta = FLOOR_CATALOG[floor];

  const root = new THREE.Group();
  root.name = `FLOOR_CONTROL_CENTER_0${floor}`;
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  parent.add(root);

  const disabledTex = createControlScreenTexture(floor, 'disabled');
  const readyTex = createControlScreenTexture(floor, 'ready');
  const unlockedTex = createControlScreenTexture(floor, 'activated');

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.5,
    roughness: 0.2,
    metalness: 0.25,
  });

  const screenMat = new THREE.MeshStandardMaterial({
    color: readyTex ? 0xffffff : 0xf59e0b,
    ...(readyTex ? { map: readyTex } : {}),
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.1,
  });

  // 1. Armored stepped pedestal base (4mm floor lift prevents floor Z-fighting)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.156, 1.35), mats.darkConcrete);
  plinth.position.y = 0.082;
  plinth.receiveShadow = true;
  root.add(plinth);

  const deskBody = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.01, 0.86), mats.structuralSteel);
  deskBody.position.y = 0.67;
  deskBody.castShadow = true;
  deskBody.receiveShadow = true;
  root.add(deskBody);
  wallMeshes.push(deskBody);

  // Sloped tactile keyboard/override deck
  const deckTop = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.1, 0.62), mats.brushedMetal);
  deckTop.position.set(0, 1.18, 0.14);
  deckTop.rotation.x = 0.26;
  root.add(deckTop);

  // Glowing override key bar on desk
  const keyStrip = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.18), beaconMat);
  keyStrip.position.set(0, 1.24, 0.22);
  keyStrip.rotation.x = 0.26;
  root.add(keyStrip);

  // 2. Elevated Holographic Floor-Status Screen Monitor Frame (cleanly separated Z planes!)
  const monitorStand = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.64, 0.14), mats.darkConcrete);
  monitorStand.position.set(0, 1.5, -0.32);
  root.add(monitorStand);

  const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.94, 1.06, 0.1), mats.structuralSteel);
  monitorFrame.position.set(0, 1.88, -0.18);
  monitorFrame.rotation.x = -0.1;
  root.add(monitorFrame);

  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.9), screenMat);
  screenMesh.position.set(0, 1.88, -0.106);
  screenMesh.rotation.x = -0.1;
  root.add(screenMesh);

  // 3. Twin Flanking Status Beacon Pylons (visible across the entire chamber!)
  for (const side of [-1, 1] as const) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.45, 0.24), mats.darkConcrete);
    pylon.position.set(side * 1.12, 1.24, -0.22);
    root.add(pylon);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.14), beaconMat);
    lamp.position.set(side * 1.12, 1.72, -0.1);
    root.add(lamp);
  }

  // Overhead status bar linking pylons
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.16, 0.26), mats.structuralSteel);
  archTop.position.set(0, 2.52, -0.22);
  root.add(archTop);

  // Floor tactical interaction ring around pedestal
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.52, 24), beaconMat);
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = 0.025;
  root.add(ring);

  // 4. Diegetic AAA Volumetric Objective Shrine Beacon (Halo / BOTW / Destiny inspired)
  // Smooth vertical alpha gradient prevents any harsh hard-cut cylinder edges!
  let beamAlphaTex: THREE.CanvasTexture | null = null;
  if (typeof document !== 'undefined') {
    const bc = document.createElement('canvas');
    bc.width = 64;
    bc.height = 256;
    const bctx = bc.getContext('2d');
    if (bctx) {
      const g = bctx.createLinearGradient(0, 256, 0, 0);
      g.addColorStop(0.0, 'rgba(255,255,255,0.0)');
      g.addColorStop(0.08, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.38, 'rgba(255,255,255,0.52)');
      g.addColorStop(0.75, 'rgba(255,255,255,0.14)');
      g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, 64, 256);
      beamAlphaTex = new THREE.CanvasTexture(bc);
      beamAlphaTex.needsUpdate = true;
    }
  }

  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 0, -0.15);
  beaconGroup.visible = false;
  root.add(beaconGroup);

  // Inner slender warm-gold volumetric core column
  const skyCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    ...(beamAlphaTex ? { alphaMap: beamAlphaTex } : {}),
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const skyCore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.36, 9.2, 20, 1, true), skyCoreMat);
  skyCore.position.y = 4.65;
  beaconGroup.add(skyCore);

  // Outer softer cyan volumetric halo column
  const skyBeamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    ...(beamAlphaTex ? { alphaMap: beamAlphaTex } : {}),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const skyBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.88, 9.8, 24, 1, true), skyBeamMat);
  skyBeam.position.y = 4.95;
  beaconGroup.add(skyBeam);

  // Twin expanding floor sonar rings
  const sonarRingMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sonarRing = new THREE.Mesh(new THREE.RingGeometry(1.48, 1.66, 36), sonarRingMat);
  sonarRing.rotation.x = -Math.PI * 0.5;
  sonarRing.position.set(0, 0.038, 0.15);
  beaconGroup.add(sonarRing);

  const sonarRing2Mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sonarRing2 = new THREE.Mesh(new THREE.RingGeometry(1.48, 1.6, 36), sonarRing2Mat);
  sonarRing2.rotation.x = -Math.PI * 0.5;
  sonarRing2.position.set(0, 0.042, 0.15);
  beaconGroup.add(sonarRing2);

  // Ascending holographic pulse ring rising smoothly up the sky-beam
  const risingRingMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const risingRing = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.018, 8, 32), risingRingMat);
  risingRing.rotation.x = Math.PI * 0.5;
  risingRing.position.y = 2.4;
  beaconGroup.add(risingRing);

  // Sculpted Holographic Shrine Centerpiece above the arch (faceted gold core + cyan wireframe cage + twin gyro rings!)
  const holoAssembly = new THREE.Group();
  holoAssembly.position.set(0, 3.35, 0);
  beaconGroup.add(holoAssembly);

  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.45,
    roughness: 0.22,
    metalness: 0.65,
  });
  const holoDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), diamondMat);
  holoAssembly.add(holoDiamond);

  const cageMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    wireframe: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const holoCage = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), cageMat);
  holoAssembly.add(holoCage);

  const gyroGoldMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const gyroRingInner = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.016, 8, 36), gyroGoldMat);
  gyroRingInner.rotation.x = Math.PI * 0.34;
  holoAssembly.add(gyroRingInner);

  const gyroCyanMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const gyroRingOuter = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.013, 8, 40), gyroCyanMat);
  gyroRingOuter.rotation.x = -Math.PI * 0.28;
  gyroRingOuter.rotation.y = Math.PI * 0.22;
  holoAssembly.add(gyroRingOuter);

  // Solid rotY-aligned box collider matching the full command desk & twin beacon pylons from all 4 sides
  const cosR = Math.abs(Math.cos(rotY));
  const sinR = Math.abs(Math.sin(rotY));
  const halfX = cosR * 1.18 + sinR * 0.68;
  const halfZ = sinR * 1.18 + cosR * 0.68;
  boxes.push({
    minX: x - halfX,
    maxX: x + halfX,
    minY: y,
    maxY: y + 2.58,
    minZ: z - halfZ,
    maxZ: z + halfZ,
    walkableTop: false,
    tag: 'control_center',
  });

  const applyMode = (mode: 'disabled' | 'ready' | 'activated') => {
    rig.lockoutMode = mode;
    rig.activated = mode === 'activated';

    if (mode === 'activated') {
      beaconMat.color.setHex(0x22d3ee);
      beaconMat.emissive.setHex(0x06b6d4);
      beaconMat.emissiveIntensity = 2.8;
      if (unlockedTex) {
        screenMat.map = unlockedTex;
        screenMat.needsUpdate = true;
      }
      screenMat.emissive.setHex(0x06b6d4);
      beaconGroup.visible = false;
    } else if (mode === 'disabled') {
      beaconMat.color.setHex(0xef4444);
      beaconMat.emissive.setHex(0xdc2626);
      beaconMat.emissiveIntensity = 1.65;
      if (disabledTex) {
        screenMat.map = disabledTex;
        screenMat.needsUpdate = true;
      }
      screenMat.emissive.setHex(0xef4444);
      beaconGroup.visible = false;
    } else {
      beaconMat.color.setHex(0xfbbf24);
      beaconMat.emissive.setHex(0xf59e0b);
      beaconMat.emissiveIntensity = 2.6;
      if (readyTex) {
        screenMat.map = readyTex;
        screenMat.needsUpdate = true;
      }
      screenMat.emissive.setHex(0xf59e0b);
      beaconGroup.visible = true;
    }
  };

  const rig: ControlCenterRig = {
    floor,
    root,
    position: { x, y, z },
    interactRadius,
    promptLocked:
      floor === 1
        ? '[E] UNSEAL FINAL CORE VAULT 01'
        : `[E] ACTIVATE CONTROL CENTER · UNSEAL FLOOR 0${floor - 1}`,
    promptUnlocked:
      floor === 1
        ? 'CORE VAULT 01 UNSEALED · ENTER INNER SANCTUM'
        : `BULKHEAD ${meta.code} OPEN · DESCEND TO FLOOR 0${floor - 1}`,
    beaconMat,
    screenMat,
    activated: false,
    lockoutMode: 'ready',
    setActivated: (active: boolean) => {
      if (active) {
        applyMode('activated');
      } else if (rig.lockoutMode === 'activated') {
        applyMode('ready');
      }
    },
    setLockoutState: (mode) => {
      if (rig.lockoutMode !== mode) {
        applyMode(mode);
      }
    },
    updateVisuals: (elapsed: number) => {
      if (rig.lockoutMode === 'ready') {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3.6);
        skyCoreMat.opacity = 0.24 + pulse * 0.16;
        skyBeamMat.opacity = 0.14 + pulse * 0.12;
        skyBeam.rotation.y = elapsed * 0.45;

        // Hover & counter-rotate the sculpted holographic shrine prism + twin gyro rings
        holoAssembly.position.y = 3.32 + Math.sin(elapsed * 2.6) * 0.16;
        holoDiamond.rotation.y = elapsed * 1.45;
        holoCage.rotation.y = -elapsed * 0.9;
        holoCage.rotation.z = Math.sin(elapsed * 0.8) * 0.22;
        gyroRingInner.rotation.z = elapsed * 1.65;
        gyroRingInner.rotation.y = elapsed * 0.6;
        gyroRingOuter.rotation.z = -elapsed * 1.15;
        gyroRingOuter.rotation.x = -Math.PI * 0.28 + Math.sin(elapsed * 0.9) * 0.24;

        // Ascending light ring rising up the volumetric column
        const rise = (elapsed * 0.52) % 1;
        risingRing.position.y = 2.45 + rise * 4.4;
        const ringScale = 0.85 + rise * 0.55;
        risingRing.scale.set(ringScale, ringScale, 1);
        risingRingMat.opacity = Math.sin(rise * Math.PI) * 0.62;

        // Dual staggered expanding floor sonar rings
        const c1 = (elapsed * 0.68) % 1;
        const s1 = 1 + c1 * 2.15;
        sonarRing.scale.set(s1, s1, 1);
        sonarRingMat.opacity = (1 - c1) * 0.62;

        const c2 = (elapsed * 0.68 + 0.5) % 1;
        const s2 = 1 + c2 * 2.15;
        sonarRing2.scale.set(s2, s2, 1);
        sonarRing2Mat.opacity = (1 - c2) * 0.44;
      } else if (rig.lockoutMode === 'disabled') {
        beaconMat.emissiveIntensity = 1.15 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * 3.2));
      }
    },
  };

  return rig;
}

/**
 * Builds an Express Vertical Lift Pad (on Floor 1 Inner Sanctum & Floor 8 Firing Bay)
 * allowing fast warp back up to Floor 8 or down to Floor 1 with `[E]`.
 */
export function buildExpressLiftPad(
  parent: THREE.Group,
  mats: HideoutMaterialRegistry,
  opts: {
    id: string;
    floor: FloorNumber;
    targetFloor: FloorNumber;
    x: number;
    y: number;
    z: number;
    prompt: string;
  }
): ExpressLiftRig {
  const root = new THREE.Group();
  root.name = `EXPRESS_LIFT_${opts.id}`;
  root.position.set(opts.x, opts.y, opts.z);
  parent.add(root);

  const padBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.75, 0.16, 20),
    mats.structuralSteel
  );
  padBase.position.y = 0.08;
  padBase.receiveShadow = true;
  root.add(padBase);

  const ringMesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.06, 8, 28),
    mats.floorAccent[opts.targetFloor]
  );
  ringMesh.rotation.x = Math.PI * 0.5;
  ringMesh.position.y = 0.2;
  root.add(ringMesh);

  // 4 slender vertical guide fins framing the lift pad
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.24), mats.brushedMetal);
    fin.position.set(Math.cos(a) * 1.56, 1.6, Math.sin(a) * 1.56);
    fin.rotation.y = -a;
    root.add(fin);
  }

  const plaqueMat = mats.createStencilMaterial(
    `0${opts.targetFloor}`,
    'EXPRESS LIFT',
    FLOOR_CATALOG[opts.targetFloor].accentHex,
    `WARP TO FLOOR 0${opts.targetFloor}`
  );
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.05), plaqueMat);
  sign.position.set(0, 3.25, 0);
  root.add(sign);

  return {
    id: opts.id,
    floor: opts.floor,
    targetFloor: opts.targetFloor,
    root,
    position: { x: opts.x, y: opts.y, z: opts.z },
    interactRadius: 2.3,
    prompt: opts.prompt,
    ringMesh,
  };
}
