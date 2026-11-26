import * as THREE from 'three';

export interface NetShooterTextureSuite {
  harnessMap: THREE.CanvasTexture;
  harnessBump: THREE.CanvasTexture;
  harnessRoughness: THREE.CanvasTexture;
  bronzeMap: THREE.CanvasTexture;
  bronzeBump: THREE.CanvasTexture;
  weaponMap: THREE.CanvasTexture;
  mantleMap: THREE.CanvasTexture;
  auraRingMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeSeededRand(seedInit: number): () => number {
  let seed = seedInit;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/**
 * Procedural PBR suite for the Floor 05 Arena Net-Shooter (Voltaic Retiarius Executioner):
 * - 512x512 sinister forged obsidian-slate Retiarius hex-snare armor + bump + roughness
 * - 256x256 hammered imperial gladiator bronze with etched geometric trim + bump
 * - 256x256 forged gunmetal-obsidian Trident-Rail weapon chassis
 * - 256x256 tattered battle-worn tactical Retiarius half-mantle weave with cyan circuit trim
 * - 256x256 razor-sharp saturated electric-cyan Retiarius snare-web ground aura ring
 */
export function createNetShooterTextures(): NetShooterTextureSuite {
  const rand = makeSeededRand(5309);

  // 1. 512x512 Sinister Forged Obsidian-Cobalt Hex-Snare Armor (Albedo + Bump + Roughness)
  const size = 512;
  const albedoC = document.createElement('canvas');
  albedoC.width = size;
  albedoC.height = size;
  const ctx = albedoC.getContext('2d')!;

  const bumpC = document.createElement('canvas');
  bumpC.width = size;
  bumpC.height = size;
  const bctx = bumpC.getContext('2d')!;

  const roughC = document.createElement('canvas');
  roughC.width = size;
  roughC.height = size;
  const rctx = roughC.getContext('2d')!;

  // Rich sinister dark slate-obsidian metallic tone (never washes out to mirror-blue, never crushes black)
  const baseGrad = ctx.createLinearGradient(0, 0, size, size);
  baseGrad.addColorStop(0, '#364357');
  baseGrad.addColorStop(0.45, '#273242');
  baseGrad.addColorStop(0.75, '#3b495e');
  baseGrad.addColorStop(1, '#2a3648');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  rctx.fillStyle = '#8e8e8e';
  rctx.fillRect(0, 0, size, size);

  // Brushed gunmetal-titanium micro-grain
  for (let i = 0; i < 950; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const len = 18 + Math.floor(rand() * 72);
    const bright = rand() > 0.5;
    ctx.fillStyle = bright ? 'rgba(170, 200, 232, 0.048)' : 'rgba(8, 12, 20, 0.11)';
    ctx.fillRect(x, y, len, 1);
    bctx.fillStyle = bright ? 'rgba(155,155,155,0.2)' : 'rgba(95,95,95,0.22)';
    bctx.fillRect(x, y, len, 1);
  }

  // Deeply embossed Retiarius diagonal snare-mesh armor scales with crisp cyan inlays
  const step = 32;
  for (let i = -size; i < size * 2; i += step) {
    ctx.strokeStyle = 'rgba(8, 13, 22, 0.78)';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + size, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    if (((i / step) & 1) === 0) {
      ctx.strokeStyle = 'rgba(14, 195, 240, 0.44)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i + size, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      rctx.strokeStyle = '#484848';
      rctx.lineWidth = 2.2;
      rctx.beginPath();
      rctx.moveTo(i, 0);
      rctx.lineTo(i + size, size);
      rctx.stroke();
    }

    bctx.strokeStyle = '#262626';
    bctx.lineWidth = 3.8;
    bctx.beginPath();
    bctx.moveTo(i, 0);
    bctx.lineTo(i + size, size);
    bctx.stroke();

    bctx.beginPath();
    bctx.moveTo(i + size, 0);
    bctx.lineTo(i, size);
    bctx.stroke();
  }

  // Heavy segmented lamellar armor plate seams + bronze-rimmed hex bolts
  for (let y = 0; y < size; y += 128) {
    ctx.fillStyle = 'rgba(7, 11, 18, 0.88)';
    ctx.fillRect(0, y, size, 6);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.36)';
    ctx.fillRect(0, y + 6, size, 2.2);

    bctx.fillStyle = '#161616';
    bctx.fillRect(0, y, size, 6);
    bctx.fillStyle = '#e2e2e2';
    bctx.fillRect(0, y + 6, size, 3);

    rctx.fillStyle = '#d0d0d0';
    rctx.fillRect(0, y, size, 6);

    for (let x = 24; x < size; x += 64) {
      ctx.fillStyle = 'rgba(10, 14, 22, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y + 20, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(195, 162, 105, 0.72)';
      ctx.beginPath();
      ctx.arc(x - 1.0, y + 19.0, 2.6, 0, Math.PI * 2);
      ctx.fill();

      bctx.fillStyle = '#efefef';
      bctx.beginPath();
      bctx.arc(x, y + 20, 4.8, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  // Forged combat claw/blade scars across plates
  for (let i = 0; i < 42; i++) {
    const sx = rand() * size;
    const sy = rand() * size;
    const ang = -0.65 + rand() * 1.3;
    const len = 18 + rand() * 54;
    ctx.strokeStyle = 'rgba(205, 228, 248, 0.32)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();

    bctx.strokeStyle = '#242424';
    bctx.lineWidth = 1.8;
    bctx.beginPath();
    bctx.moveTo(sx, sy);
    bctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    bctx.stroke();

    rctx.strokeStyle = '#3c3c3c';
    rctx.lineWidth = 2.0;
    rctx.beginPath();
    rctx.moveTo(sx, sy);
    rctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    rctx.stroke();
  }

  const harnessMap = new THREE.CanvasTexture(albedoC);
  harnessMap.wrapS = THREE.RepeatWrapping;
  harnessMap.wrapT = THREE.RepeatWrapping;
  harnessMap.colorSpace = THREE.SRGBColorSpace;

  const harnessBump = new THREE.CanvasTexture(bumpC);
  harnessBump.wrapS = THREE.RepeatWrapping;
  harnessBump.wrapT = THREE.RepeatWrapping;

  const harnessRoughness = new THREE.CanvasTexture(roughC);
  harnessRoughness.wrapS = THREE.RepeatWrapping;
  harnessRoughness.wrapT = THREE.RepeatWrapping;

  // 2. 256x256 Hammered Imperial Coliseum Bronze with Etched Gladiator Filigree
  const bSize = 256;
  const brC = document.createElement('canvas');
  brC.width = bSize;
  brC.height = bSize;
  const brCtx = brC.getContext('2d')!;

  const brBC = document.createElement('canvas');
  brBC.width = bSize;
  brBC.height = bSize;
  const brBCtx = brBC.getContext('2d')!;

  const brGrad = brCtx.createLinearGradient(0, 0, bSize, bSize);
  brGrad.addColorStop(0, '#be8940');
  brGrad.addColorStop(0.5, '#966828');
  brGrad.addColorStop(1, '#cc984c');
  brCtx.fillStyle = brGrad;
  brCtx.fillRect(0, 0, bSize, bSize);

  brBCtx.fillStyle = '#808080';
  brBCtx.fillRect(0, 0, bSize, bSize);

  for (let i = 0; i < 240; i++) {
    const x = rand() * bSize;
    const y = rand() * bSize;
    const r = 4 + rand() * 10;
    const hi = rand() > 0.5;
    brCtx.fillStyle = hi ? 'rgba(255, 226, 165, 0.08)' : 'rgba(42, 24, 8, 0.13)';
    brCtx.beginPath();
    brCtx.arc(x, y, r, 0, Math.PI * 2);
    brCtx.fill();

    brBCtx.fillStyle = hi ? 'rgba(165,165,165,0.22)' : 'rgba(90,90,90,0.22)';
    brBCtx.beginPath();
    brBCtx.arc(x, y, r, 0, Math.PI * 2);
    brBCtx.fill();
  }

  for (const bandY of [28, 128, 228]) {
    brCtx.fillStyle = 'rgba(34, 20, 6, 0.72)';
    brCtx.fillRect(0, bandY - 2, bSize, 4);
    brCtx.fillStyle = 'rgba(255, 220, 150, 0.34)';
    brCtx.fillRect(0, bandY + 2, bSize, 2);

    brBCtx.fillStyle = '#262626';
    brBCtx.fillRect(0, bandY - 2, bSize, 4);
    brBCtx.fillStyle = '#dadada';
    brBCtx.fillRect(0, bandY + 2, bSize, 2);

    for (let x = 8; x < bSize; x += 24) {
      brCtx.strokeStyle = 'rgba(32, 18, 6, 0.65)';
      brCtx.lineWidth = 2;
      brCtx.strokeRect(x, bandY - 10, 14, 7);
      brBCtx.strokeStyle = '#323232';
      brBCtx.lineWidth = 2;
      brBCtx.strokeRect(x, bandY - 10, 14, 7);
    }
  }

  const bronzeMap = new THREE.CanvasTexture(brC);
  bronzeMap.wrapS = THREE.RepeatWrapping;
  bronzeMap.wrapT = THREE.RepeatWrapping;
  bronzeMap.colorSpace = THREE.SRGBColorSpace;

  const bronzeBump = new THREE.CanvasTexture(brBC);
  bronzeBump.wrapS = THREE.RepeatWrapping;
  bronzeBump.wrapT = THREE.RepeatWrapping;

  // 3. 256x256 Forged Gunmetal-Obsidian Voltaic Trident-Rail Chassis
  const wC = document.createElement('canvas');
  wC.width = bSize;
  wC.height = bSize;
  const wCtx = wC.getContext('2d')!;

  const wGrad = wCtx.createLinearGradient(0, 0, 0, bSize);
  wGrad.addColorStop(0, '#303b4b');
  wGrad.addColorStop(0.5, '#1e2632');
  wGrad.addColorStop(1, '#344154');
  wCtx.fillStyle = wGrad;
  wCtx.fillRect(0, 0, bSize, bSize);

  for (let y = 16; y < bSize; y += 32) {
    wCtx.fillStyle = 'rgba(8, 11, 16, 0.88)';
    wCtx.fillRect(14, y, bSize - 28, 10);
    wCtx.fillStyle = 'rgba(6, 182, 232, 0.52)';
    wCtx.fillRect(18, y + 3, bSize - 36, 3);
  }
  wCtx.strokeStyle = 'rgba(180, 206, 235, 0.24)';
  wCtx.lineWidth = 2;
  wCtx.strokeRect(6, 6, bSize - 12, bSize - 12);

  const weaponMap = new THREE.CanvasTexture(wC);
  weaponMap.wrapS = THREE.RepeatWrapping;
  weaponMap.wrapT = THREE.RepeatWrapping;
  weaponMap.colorSpace = THREE.SRGBColorSpace;

  // 4. 256x256 Weathered Obsidian-Indigo Retiarius Snare-Cord Half-Cloak with Bronze & Cyan Filigree Hem
  const mC = document.createElement('canvas');
  mC.width = bSize;
  mC.height = bSize;
  const mCtx = mC.getContext('2d')!;

  const mGrad = mCtx.createLinearGradient(0, 0, 0, bSize);
  mGrad.addColorStop(0, '#1e2838');
  mGrad.addColorStop(0.55, '#151e2c');
  mGrad.addColorStop(1, '#0e1520');
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, bSize, bSize);

  // Subtle woven ballistic-cloth herringbone warp/weft
  mCtx.strokeStyle = 'rgba(130, 168, 208, 0.08)';
  mCtx.lineWidth = 1.2;
  for (let y = 0; y < bSize; y += 7) {
    mCtx.beginPath();
    mCtx.moveTo(0, y);
    mCtx.lineTo(bSize, y + 5);
    mCtx.stroke();
  }

  // Diagonal Retiarius snare-net cord lattice woven across the tactical mantle
  const mStep = 28;
  for (let i = -bSize; i < bSize * 2; i += mStep) {
    mCtx.strokeStyle = 'rgba(6, 10, 16, 0.55)';
    mCtx.lineWidth = 2.6;
    mCtx.beginPath();
    mCtx.moveTo(i, 0);
    mCtx.lineTo(i + bSize, bSize);
    mCtx.stroke();
    mCtx.beginPath();
    mCtx.moveTo(i + bSize, 0);
    mCtx.lineTo(i, bSize);
    mCtx.stroke();

    if (((i / mStep) & 1) === 0) {
      mCtx.strokeStyle = 'rgba(14, 198, 245, 0.34)';
      mCtx.lineWidth = 1.1;
      mCtx.beginPath();
      mCtx.moveTo(i, 0);
      mCtx.lineTo(i + bSize, bSize);
      mCtx.stroke();
      mCtx.beginPath();
      mCtx.moveTo(i + bSize, 0);
      mCtx.lineTo(i, bSize);
      mCtx.stroke();
    }
  }

  // Imperial bronze & electric-cyan gladiator filigree border along bottom & outer hem
  mCtx.fillStyle = 'rgba(196, 142, 62, 0.88)';
  mCtx.fillRect(0, bSize - 26, bSize, 11);
  mCtx.fillRect(0, 0, 10, bSize);
  mCtx.fillStyle = 'rgba(14, 206, 248, 0.78)';
  mCtx.fillRect(0, bSize - 12, bSize, 4);
  mCtx.fillRect(11, 0, 3, bSize);

  const mantleMap = new THREE.CanvasTexture(mC);
  mantleMap.wrapS = THREE.RepeatWrapping;
  mantleMap.wrapT = THREE.RepeatWrapping;
  mantleMap.colorSpace = THREE.SRGBColorSpace;

  // 5. 256x256 Crisp Saturated Electric-Cyan Retiarius Snare-Web Hunter Ground Aura Ring
  const aC = document.createElement('canvas');
  aC.width = bSize;
  aC.height = bSize;
  const aCtx = aC.getContext('2d')!;
  const cx = bSize * 0.5;
  const cy = bSize * 0.5;

  aCtx.clearRect(0, 0, bSize, bSize);

  // Controlled saturated electric-cyan halo (never over-bright white!)
  const halo = aCtx.createRadialGradient(cx, cy, 54, cx, cy, 122);
  halo.addColorStop(0, 'rgba(0, 160, 230, 0.0)');
  halo.addColorStop(0.58, 'rgba(0, 150, 220, 0.08)');
  halo.addColorStop(0.78, 'rgba(0, 196, 255, 0.36)');
  halo.addColorStop(0.87, 'rgba(56, 224, 255, 0.56)');
  halo.addColorStop(0.94, 'rgba(0, 155, 230, 0.16)');
  halo.addColorStop(1, 'rgba(0, 110, 210, 0.0)');
  aCtx.fillStyle = halo;
  aCtx.fillRect(0, 0, bSize, bSize);

  // Razor-sharp hexagonal targeting web & jagged radial voltage arcs
  aCtx.strokeStyle = 'rgba(34, 216, 255, 0.88)';
  aCtx.lineWidth = 2.4;
  aCtx.beginPath();
  aCtx.arc(cx, cy, 102, 0, Math.PI * 2);
  aCtx.stroke();

  aCtx.strokeStyle = 'rgba(14, 175, 245, 0.68)';
  aCtx.lineWidth = 1.6;
  aCtx.beginPath();
  aCtx.arc(cx, cy, 80, 0, Math.PI * 2);
  aCtx.stroke();

  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2;
    aCtx.strokeStyle = 'rgba(38, 218, 255, 0.72)';
    aCtx.lineWidth = 1.8;
    aCtx.beginPath();
    aCtx.moveTo(cx + Math.cos(a0) * 102, cy + Math.sin(a0) * 102);
    aCtx.lineTo(cx + Math.cos(a1) * 102, cy + Math.sin(a1) * 102);
    aCtx.stroke();

    const midA = a0 + 0.15;
    aCtx.strokeStyle = 'rgba(92, 232, 255, 0.88)';
    aCtx.lineWidth = 2.0;
    aCtx.beginPath();
    aCtx.moveTo(cx + Math.cos(a0) * 70, cy + Math.sin(a0) * 70);
    aCtx.lineTo(cx + Math.cos(midA) * 87, cy + Math.sin(midA) * 87);
    aCtx.lineTo(cx + Math.cos(a0) * 114, cy + Math.sin(a0) * 114);
    aCtx.stroke();
  }

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const inner = i % 2 === 0 ? 92 : 97;
    aCtx.strokeStyle = 'rgba(108, 236, 255, 0.68)';
    aCtx.lineWidth = i % 2 === 0 ? 2.0 : 1.1;
    aCtx.beginPath();
    aCtx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    aCtx.lineTo(cx + Math.cos(a) * 108, cy + Math.sin(a) * 108);
    aCtx.stroke();
  }

  const auraRingMap = new THREE.CanvasTexture(aC);
  auraRingMap.colorSpace = THREE.SRGBColorSpace;

  return {
    harnessMap,
    harnessBump,
    harnessRoughness,
    bronzeMap,
    bronzeBump,
    weaponMap,
    mantleMap,
    auraRingMap,
    dispose() {
      harnessMap.dispose();
      harnessBump.dispose();
      harnessRoughness.dispose();
      bronzeMap.dispose();
      bronzeBump.dispose();
      weaponMap.dispose();
      mantleMap.dispose();
      auraRingMap.dispose();
    },
  };
}
