import * as THREE from 'three';

export const AMMO_CRATE_COOLDOWN_SEC = 18.0;
export const AMMO_CRATE_PICKUP_RADIUS = 1.68;

export interface HeavyAmmoCrate {
  id: string;
  position: THREE.Vector3;
  root: THREE.Group;
  lidPivot: THREE.Group;
  shellsGroup: THREE.Group;
  holoMarker: THREE.Mesh;
  ledMat: THREE.MeshStandardMaterial;
  holoMat: THREE.MeshBasicMaterial;
  available: boolean;
  cooldownRemaining: number;
  lidOpenRatio: number;
}

export interface AmmoCrateBuildResult {
  crates: HeavyAmmoCrate[];
  dispose: () => void;
}

export interface AmmoCratePlacementSpec {
  id: string;
  x: number;
  y?: number;
  z: number;
  rotY: number;
}

const CRATE_PLACEMENTS: AmmoCratePlacementSpec[] = [
  { id: 'crate_front_left', x: -4.9, y: 0, z: 6.3, rotY: 0.34 },
  { id: 'crate_front_right', x: 4.9, y: 0, z: 6.1, rotY: -0.34 },
  { id: 'crate_mid_left', x: -5.3, y: 0, z: -1.6, rotY: 0.42 },
  { id: 'crate_mid_right', x: 5.3, y: 0, z: -1.6, rotY: -0.42 },
];

function createHoloBadgeTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 256, 128);

  // Subtle dark HUD backdrop plate with amber tactical border
  ctx.fillStyle = 'rgba(15, 20, 28, 0.72)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(14, 16, 228, 72, 6);
  ctx.fill();
  ctx.stroke();

  // Crisp tactical typography: ".50 HV AMMO"
  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 30px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('.50 HV AMMO', 128, 53);

  // Downward chevron pointer
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(114, 96);
  ctx.lineTo(142, 96);
  ctx.lineTo(128, 118);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCrateStencilTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#242b33';
  ctx.fillRect(0, 0, 256, 128);

  // Diagonal amber hazard accent stripes along top & bottom edges
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, 256, 12);
  ctx.fillRect(0, 116, 256, 12);

  // Stencil lettering
  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 32px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VULCAN .50', 128, 54);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 18px monospace';
  ctx.fillText('HV KINETIC RESUPPLY', 128, 88);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildHeavyAmmoCrates(parent: THREE.Group): AmmoCrateBuildResult {
  return buildAmmoCratesFromSpecs(parent, CRATE_PLACEMENTS);
}

export function buildAmmoCratesFromSpecs(
  parent: THREE.Group,
  placements: AmmoCratePlacementSpec[]
): AmmoCrateBuildResult {
  const crates: HeavyAmmoCrate[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTex: THREE.Texture[] = [];

  const holoTex = createHoloBadgeTexture();
  const stencilTex = createCrateStencilTexture();
  if (holoTex) disposableTex.push(holoTex);
  if (stencilTex) disposableTex.push(stencilTex);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x262f3a,
    roughness: 0.62,
    metalness: 0.56,
  });
  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x13171e,
    roughness: 0.86,
    metalness: 0.16,
  });
  const fdeMat = new THREE.MeshStandardMaterial({
    color: 0x73624d,
    roughness: 0.7,
    metalness: 0.25,
  });
  const stencilMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    ...(stencilTex ? { map: stencilTex } : {}),
    roughness: 0.68,
    metalness: 0.34,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xe6b85c,
    roughness: 0.22,
    metalness: 0.92,
  });
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0x0f1217,
    roughness: 0.96,
    metalness: 0.04,
  });

  disposableMats.push(bodyMat, bumperMat, fdeMat, stencilMat, brassMat, foamMat);

  const crateBoxGeom = new THREE.BoxGeometry(0.8, 0.36, 0.48);
  const bumperGeom = new THREE.BoxGeometry(0.09, 0.38, 0.09);
  const lidGeom = new THREE.BoxGeometry(0.84, 0.09, 0.52);
  const lidRibGeom = new THREE.BoxGeometry(0.7, 0.025, 0.07);
  const latchGeom = new THREE.BoxGeometry(0.06, 0.12, 0.045);
  const handleGeom = new THREE.BoxGeometry(0.04, 0.03, 0.22);
  const stencilGeom = new THREE.PlaneGeometry(0.54, 0.22);
  const ledGeom = new THREE.BoxGeometry(0.46, 0.028, 0.025);
  const foamGeom = new THREE.BoxGeometry(0.7, 0.06, 0.38);
  const shellGeom = new THREE.CylinderGeometry(0.011, 0.012, 0.11, 8);
  const holoGeom = new THREE.PlaneGeometry(0.76, 0.38);

  for (const cfg of placements) {
    const cy = cfg.y ?? 0;
    const root = new THREE.Group();
    root.name = `HeavyAmmoCrate_${cfg.id}`;
    root.position.set(cfg.x, cy, cfg.z);
    root.rotation.y = cfg.rotY;

    // Reinforced main lower chest
    const base = new THREE.Mesh(crateBoxGeom, bodyMat);
    base.position.y = 0.18;
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);

    // 4 heavy polymer corner shock bumpers
    for (const bx of [-0.38, 0.38]) {
      for (const bz of [-0.22, 0.22]) {
        const bumper = new THREE.Mesh(bumperGeom, bumperMat);
        bumper.position.set(bx, 0.19, bz);
        bumper.castShadow = true;
        root.add(bumper);
      }
    }

    // Side steel carry handles
    for (const hx of [-0.415, 0.415]) {
      const handle = new THREE.Mesh(handleGeom, fdeMat);
      handle.position.set(hx, 0.23, 0);
      root.add(handle);
    }

    // Front & rear military stencil plates
    const stencilFront = new THREE.Mesh(stencilGeom, stencilMat);
    stencilFront.position.set(0, 0.18, 0.244);
    root.add(stencilFront);
    const stencilBack = new THREE.Mesh(stencilGeom, stencilMat);
    stencilBack.position.set(0, 0.18, -0.244);
    stencilBack.rotation.y = Math.PI;
    root.add(stencilBack);

    // Front tactical FDE locking clasps
    for (const lx of [-0.24, 0.24]) {
      const latch = new THREE.Mesh(latchGeom, fdeMat);
      latch.position.set(lx, 0.32, 0.246);
      root.add(latch);
    }

    // Per-crate emissive LED bar (amber-gold when stocked, dim slate during restock)
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.2,
    });
    disposableMats.push(ledMat);
    const ledFront = new THREE.Mesh(ledGeom, ledMat);
    ledFront.position.set(0, 0.34, 0.25);
    root.add(ledFront);
    const ledBack = new THREE.Mesh(ledGeom, ledMat);
    ledBack.position.set(0, 0.34, -0.25);
    root.add(ledBack);

    // Interior foam tray + gleaming rows of huge .50-cal brass cartridges (visible when opened!)
    const foam = new THREE.Mesh(foamGeom, foamMat);
    foam.position.y = 0.34;
    root.add(foam);

    const shellsGroup = new THREE.Group();
    shellsGroup.position.y = 0.37;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 7; col++) {
        const shell = new THREE.Mesh(shellGeom, brassMat);
        shell.rotation.x = Math.PI / 2;
        shell.position.set(-0.24 + col * 0.08, 0.01, -0.075 + row * 0.15);
        shellsGroup.add(shell);
      }
    }
    root.add(shellsGroup);

    // Hinged Armored Top Lid (pivots cleanly around rear top edge z = -0.25, y = 0.36)
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.36, -0.25);
    const lid = new THREE.Mesh(lidGeom, bodyMat);
    lid.position.set(0, 0.045, 0.25);
    lid.castShadow = true;
    lid.receiveShadow = true;
    lidPivot.add(lid);
    for (const rz of [0.12, 0.25, 0.38]) {
      const rib = new THREE.Mesh(lidRibGeom, fdeMat);
      rib.position.set(0, 0.095, rz);
      lidPivot.add(rib);
    }
    root.add(lidPivot);

    // Floating holographic ".50 HV AMMO" marker beacon above crate
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      ...(holoTex ? { map: holoTex } : {}),
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    disposableMats.push(holoMat);

    const holoMarker = new THREE.Mesh(holoGeom, holoMat);
    holoMarker.position.set(0, 0.96, 0);
    root.add(holoMarker);

    parent.add(root);

    crates.push({
      id: cfg.id,
      position: new THREE.Vector3(cfg.x, cy, cfg.z),
      root,
      lidPivot,
      shellsGroup,
      holoMarker,
      ledMat,
      holoMat,
      available: true,
      cooldownRemaining: 0,
      lidOpenRatio: 0,
    });
  }

  return {
    crates,
    dispose: () => {
      for (const m of disposableMats) m.dispose();
      for (const t of disposableTex) t.dispose();
    },
  };
}

/**
 * Pure proximity check for looting a stocked Heavy-Ammo Supply Crate.
 * Returns the collected crate (and puts it on cooldown) or `null` if none in range or player is full.
 */
export function tryCollectAmmoCrate(
  crates: HeavyAmmoCrate[],
  playerX: number,
  playerZ: number,
  canCollect: boolean,
  pickupRadius = AMMO_CRATE_PICKUP_RADIUS,
  playerY?: number
): HeavyAmmoCrate | null {
  if (!canCollect) return null;
  const rSq = pickupRadius * pickupRadius;
  for (const crate of crates) {
    if (!crate.available) continue;
    if (playerY !== undefined && Math.abs(playerY - crate.position.y) > 1.85) continue;
    const dx = playerX - crate.position.x;
    const dz = playerZ - crate.position.z;
    if (dx * dx + dz * dz <= rSq) {
      crate.available = false;
      crate.cooldownRemaining = AMMO_CRATE_COOLDOWN_SEC;
      crate.shellsGroup.visible = false;
      return crate;
    }
  }
  return null;
}

export function stepHeavyAmmoCrates(
  crates: HeavyAmmoCrate[],
  dt: number,
  elapsed: number,
  cameraPosition?: THREE.Vector3
): void {
  for (let i = 0; i < crates.length; i++) {
    const crate = crates[i];
    if (!crate.available) {
      crate.cooldownRemaining = Math.max(0, crate.cooldownRemaining - dt);
      if (crate.cooldownRemaining <= 0) {
        crate.available = true;
        crate.shellsGroup.visible = true;
      }
    }

    // Smoothly hinge lid open when looted and shut when restocked
    const targetOpen = crate.available ? 0 : 1;
    crate.lidOpenRatio = THREE.MathUtils.lerp(
      crate.lidOpenRatio,
      targetOpen,
      1 - Math.exp(-8.5 * dt)
    );
    crate.lidPivot.rotation.x = -crate.lidOpenRatio * 1.18;

    // Pulse LED status strip & floating holo badge
    if (crate.available) {
      const pulse = 0.78 + Math.sin(elapsed * 3.4 + i * 1.4) * 0.22;
      crate.ledMat.color.setHex(0xfbbf24);
      crate.ledMat.emissive.setHex(0xf59e0b);
      crate.ledMat.emissiveIntensity = 1.65 + pulse * 0.9;

      crate.holoMarker.visible = true;
      crate.holoMarker.position.y = 0.94 + Math.sin(elapsed * 2.6 + i) * 0.065;
      crate.holoMat.opacity = 0.78 + pulse * 0.2;
      if (cameraPosition) {
        // Detail distance culling for floating crate holo badge beyond 26m
        const cdx = cameraPosition.x - crate.position.x;
        const cdz = cameraPosition.z - crate.position.z;
        const withinDetailDist = cdx * cdx + cdz * cdz <= 26 * 26;
        crate.holoMarker.visible = withinDetailDist;
        if (withinDetailDist) {
          crate.holoMarker.lookAt(
            cameraPosition.x,
            crate.holoMarker.position.y + crate.position.y,
            cameraPosition.z
          );
        }
      }
    } else {
      crate.ledMat.color.setHex(0x475569);
      crate.ledMat.emissive.setHex(0x1e293b);
      crate.ledMat.emissiveIntensity = 0.35;
      crate.holoMarker.visible = false;
    }
  }
}

export function resetHeavyAmmoCrates(crates: HeavyAmmoCrate[]): void {
  for (const crate of crates) {
    crate.available = true;
    crate.cooldownRemaining = 0;
    crate.lidOpenRatio = 0;
    crate.lidPivot.rotation.x = 0;
    crate.shellsGroup.visible = true;
    crate.holoMarker.visible = true;
  }
}
