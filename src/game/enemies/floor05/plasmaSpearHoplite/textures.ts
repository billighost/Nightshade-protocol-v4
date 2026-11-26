import * as THREE from 'three';

export interface HopliteTextureSuite {
  shieldMap: THREE.CanvasTexture;
  shieldBump: THREE.CanvasTexture;
  cuirassMap: THREE.CanvasTexture;
  cuirassBump: THREE.CanvasTexture;
  cuirassRoughness: THREE.CanvasTexture;
  cloakMap: THREE.CanvasTexture;
  cloakBump: THREE.CanvasTexture;
  auraRingMap: THREE.CanvasTexture;
  aegisHexMap: THREE.CanvasTexture;
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
 * High-resolution procedural PBR texture suite for the Floor 05 Plasma-Spear Hoplite:
 * - Battle-scarred 512x512 Spartan Hoplon Buckler (molten Lambda + war-skull relief, scorch marks, hammered rivets)
 * - 512x512 sculpted darkened bronze/iron muscle-cuirass albedo, bump & roughness maps
 * - 256x256 vivid crimson Spartan war-cloak with gold Greek meander border & charred battle hem
 * - 256x256 menacing molten-crimson/amber ground war-aura halo texture
 * - 256x256 hexagonal holographic Aegis kinetic shield field texture
 */
export function createHopliteTextures(): HopliteTextureSuite {
  const rand = makeSeededRand(50577);

  // ---------------------------------------------------------------------------
  // 1. EMBOSSED BATTLE-SCARRED SPARTAN HOPLON BUCKLER (512x512 Albedo + Bump)
  // ---------------------------------------------------------------------------
  const sSize = 512;
  const sCanvas = document.createElement('canvas');
  sCanvas.width = sSize;
  sCanvas.height = sSize;
  const sctx = sCanvas.getContext('2d')!;

  const sbCanvas = document.createElement('canvas');
  sbCanvas.width = sSize;
  sbCanvas.height = sSize;
  const sbctx = sbCanvas.getContext('2d')!;

  const cx = sSize * 0.5;
  const cy = sSize * 0.5;

  const sGrad = sctx.createRadialGradient(cx, cy, 18, cx, cy, 252);
  sGrad.addColorStop(0.0, '#f4c76b');
  sGrad.addColorStop(0.18, '#b57b2e');
  sGrad.addColorStop(0.26, '#881826');
  sGrad.addColorStop(0.68, '#4e0d17');
  sGrad.addColorStop(0.79, '#2b1514');
  sGrad.addColorStop(0.84, '#dca148');
  sGrad.addColorStop(0.93, '#966526');
  sGrad.addColorStop(1.0, '#3a2512');
  sctx.fillStyle = sGrad;
  sctx.fillRect(0, 0, sSize, sSize);

  sbctx.fillStyle = '#7c7c7c';
  sbctx.fillRect(0, 0, sSize, sSize);

  // Hammered radial spun-metal grain
  for (let i = 0; i < 160; i++) {
    const r = 30 + rand() * 215;
    const a0 = rand() * Math.PI * 2;
    const span = 0.2 + rand() * 0.9;
    sctx.strokeStyle = rand() > 0.5 ? 'rgba(255,228,175,0.08)' : 'rgba(10,5,6,0.16)';
    sctx.lineWidth = 1.2 + rand() * 1.8;
    sctx.beginPath();
    sctx.arc(cx, cy, r, a0, a0 + span);
    sctx.stroke();
  }

  // Embossed concentric bronze border rings
  sctx.strokeStyle = 'rgba(252, 214, 126, 0.78)';
  sctx.lineWidth = 4;
  sctx.beginPath();
  sctx.arc(cx, cy, 206, 0, Math.PI * 2);
  sctx.stroke();

  sctx.strokeStyle = 'rgba(20, 12, 10, 0.85)';
  sctx.lineWidth = 6;
  sctx.beginPath();
  sctx.arc(cx, cy, 198, 0, Math.PI * 2);
  sctx.stroke();

  sbctx.strokeStyle = '#e4e4e4';
  sbctx.lineWidth = 6;
  sbctx.beginPath();
  sbctx.arc(cx, cy, 206, 0, Math.PI * 2);
  sbctx.stroke();

  sbctx.strokeStyle = '#242424';
  sbctx.lineWidth = 5;
  sbctx.beginPath();
  sbctx.arc(cx, cy, 198, 0, Math.PI * 2);
  sbctx.stroke();

  // Radial perimeter bronze rivets & sunburst rays
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rx = cx + Math.cos(a) * 224;
    const ry = cy + Math.sin(a) * 224;

    sctx.fillStyle = '#20130a';
    sctx.beginPath();
    sctx.arc(rx, ry, 7.2, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = '#f1bf62';
    sctx.beginPath();
    sctx.arc(rx - 1.4, ry - 1.4, 4.6, 0, Math.PI * 2);
    sctx.fill();

    sbctx.fillStyle = '#f2f2f2';
    sbctx.beginPath();
    sbctx.arc(rx, ry, 6.2, 0, Math.PI * 2);
    sbctx.fill();

    sctx.strokeStyle = 'rgba(248, 198, 102, 0.36)';
    sctx.lineWidth = 2.5;
    sctx.beginPath();
    sctx.moveTo(cx + Math.cos(a) * 144, cy + Math.sin(a) * 144);
    sctx.lineTo(cx + Math.cos(a) * 194, cy + Math.sin(a) * 194);
    sctx.stroke();
  }

  // Aggressive Blazing Spartan Lambda (Λ) with sharp war-serifs
  const drawLambda = (ctx: CanvasRenderingContext2D, stroke: string, width: number) => {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(cx - 118, cy + 128);
    ctx.lineTo(cx - 76, cy + 114);
    ctx.lineTo(cx, cy - 118);
    ctx.lineTo(cx + 76, cy + 114);
    ctx.lineTo(cx + 118, cy + 128);
    ctx.stroke();
  };
  drawLambda(sctx, 'rgba(18, 6, 8, 0.85)', 30);
  drawLambda(sctx, '#e2a442', 20);
  drawLambda(sctx, '#fef08a', 7);
  drawLambda(sbctx, '#f0f0f0', 22);

  // Sinister Embossed War-Skull Crest inside the Lambda apex
  sctx.fillStyle = 'rgba(18, 6, 8, 0.88)';
  sctx.beginPath();
  sctx.moveTo(cx - 48, cy + 8);
  sctx.lineTo(cx - 36, cy - 40);
  sctx.lineTo(cx, cy - 58);
  sctx.lineTo(cx + 36, cy - 40);
  sctx.lineTo(cx + 48, cy + 8);
  sctx.lineTo(cx + 28, cy + 54);
  sctx.lineTo(cx - 28, cy + 54);
  sctx.closePath();
  sctx.fill();

  sctx.strokeStyle = '#f5c25c';
  sctx.lineWidth = 4;
  sctx.stroke();

  // Glowing molten eye sockets on shield skull
  sctx.fillStyle = '#ff5a14';
  sctx.beginPath();
  sctx.moveTo(cx - 30, cy - 8);
  sctx.lineTo(cx - 8, cy + 4);
  sctx.lineTo(cx - 26, cy + 14);
  sctx.closePath();
  sctx.fill();

  sctx.beginPath();
  sctx.moveTo(cx + 30, cy - 8);
  sctx.lineTo(cx + 8, cy + 4);
  sctx.lineTo(cx + 26, cy + 14);
  sctx.closePath();
  sctx.fill();

  sctx.strokeStyle = '#e4ad4c';
  sctx.lineWidth = 3.5;
  for (let t = -16; t <= 16; t += 8) {
    sctx.beginPath();
    sctx.moveTo(cx + t, cy + 26);
    sctx.lineTo(cx + t, cy + 48);
    sctx.stroke();
  }

  // Deep battle-scratched blade gouges across shield face
  for (let i = 0; i < 22; i++) {
    const sx = 80 + rand() * 352;
    const sy = 80 + rand() * 352;
    const ang = -0.9 + rand() * 1.8;
    const len = 28 + rand() * 88;
    const ex = sx + Math.cos(ang) * len;
    const ey = sy + Math.sin(ang) * len;

    sctx.strokeStyle = 'rgba(14, 10, 12, 0.72)';
    sctx.lineWidth = 3.5;
    sctx.beginPath();
    sctx.moveTo(sx, sy);
    sctx.lineTo(ex, ey);
    sctx.stroke();

    sctx.strokeStyle = 'rgba(245, 224, 180, 0.58)';
    sctx.lineWidth = 1.4;
    sctx.beginPath();
    sctx.moveTo(sx + 1.5, sy + 1.5);
    sctx.lineTo(ex + 1.5, ey + 1.5);
    sctx.stroke();

    sbctx.strokeStyle = '#181818';
    sbctx.lineWidth = 3.2;
    sbctx.beginPath();
    sbctx.moveTo(sx, sy);
    sbctx.lineTo(ex, ey);
    sbctx.stroke();
  }

  const shieldMap = new THREE.CanvasTexture(sCanvas);
  shieldMap.colorSpace = THREE.SRGBColorSpace;
  const shieldBump = new THREE.CanvasTexture(sbCanvas);

  // ---------------------------------------------------------------------------
  // 2. FORGED BATTLE-SCARRED CUIRASS ALBEDO + BUMP + ROUGHNESS (512x512)
  // ---------------------------------------------------------------------------
  const cSize = 512;
  const cAlb = document.createElement('canvas');
  cAlb.width = cSize;
  cAlb.height = cSize;
  const actx = cAlb.getContext('2d')!;

  const cBmp = document.createElement('canvas');
  cBmp.width = cSize;
  cBmp.height = cSize;
  const bctx = cBmp.getContext('2d')!;

  const cRgh = document.createElement('canvas');
  cRgh.width = cSize;
  cRgh.height = cSize;
  const rctx = cRgh.getContext('2d')!;

  const aGrad = actx.createLinearGradient(0, 0, cSize, cSize);
  aGrad.addColorStop(0, '#c4cad4');
  aGrad.addColorStop(0.5, '#9098a8');
  aGrad.addColorStop(1, '#bec4ce');
  actx.fillStyle = aGrad;
  actx.fillRect(0, 0, cSize, cSize);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, cSize, cSize);

  rctx.fillStyle = '#6c6c6c';
  rctx.fillRect(0, 0, cSize, cSize);

  for (let i = 0; i < 850; i++) {
    const x = rand() * cSize;
    const y = rand() * cSize;
    const w = 14 + rand() * 54;
    const bright = rand() > 0.48;
    actx.fillStyle = bright ? 'rgba(255,250,240,0.06)' : 'rgba(18,16,22,0.095)';
    actx.fillRect(x, y, w, 1.5);
    bctx.fillStyle = bright ? 'rgba(175,175,175,0.18)' : 'rgba(72,72,72,0.18)';
    bctx.fillRect(x, y, w, 1.5);
    rctx.fillStyle = bright ? 'rgba(84,84,84,0.22)' : 'rgba(165,165,165,0.22)';
    rctx.fillRect(x, y, w, 2);
  }

  // Chiseled Spartan lamellar chevrons & forged plate seams
  for (let y = 32; y < cSize; y += 84) {
    actx.strokeStyle = 'rgba(20, 18, 24, 0.78)';
    actx.lineWidth = 5;
    actx.beginPath();
    actx.moveTo(0, y);
    actx.lineTo(cSize * 0.5, y + 26);
    actx.lineTo(cSize, y);
    actx.stroke();

    actx.strokeStyle = 'rgba(250, 232, 194, 0.36)';
    actx.lineWidth = 2.5;
    actx.beginPath();
    actx.moveTo(0, y + 5);
    actx.lineTo(cSize * 0.5, y + 31);
    actx.lineTo(cSize, y + 5);
    actx.stroke();

    bctx.strokeStyle = '#1e1e1e';
    bctx.lineWidth = 5;
    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.lineTo(cSize * 0.5, y + 26);
    bctx.lineTo(cSize, y);
    bctx.stroke();

    bctx.strokeStyle = '#e0e0e0';
    bctx.lineWidth = 3;
    bctx.beginPath();
    bctx.moveTo(0, y + 5);
    bctx.lineTo(cSize * 0.5, y + 31);
    bctx.lineTo(cSize, y + 5);
    bctx.stroke();

    for (let x = 24; x < cSize; x += 64) {
      const distMid = Math.abs(x - cSize * 0.5) / (cSize * 0.5);
      const ry = y + (1 - distMid) * 26 - 12;
      actx.fillStyle = 'rgba(16, 16, 20, 0.8)';
      actx.beginPath();
      actx.arc(x, ry, 4.5, 0, Math.PI * 2);
      actx.fill();
      actx.fillStyle = 'rgba(250, 230, 185, 0.72)';
      actx.beginPath();
      actx.arc(x - 1, ry - 1, 2.2, 0, Math.PI * 2);
      actx.fill();

      bctx.fillStyle = '#ececec';
      bctx.beginPath();
      bctx.arc(x, ry, 4.2, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  for (let i = 0; i < 42; i++) {
    const sx = rand() * cSize;
    const sy = rand() * cSize;
    const ang = -0.8 + rand() * 1.6;
    const len = 20 + rand() * 76;
    const ex = sx + Math.cos(ang) * len;
    const ey = sy + Math.sin(ang) * len;

    actx.strokeStyle = 'rgba(16, 14, 18, 0.62)';
    actx.lineWidth = 2.6;
    actx.beginPath();
    actx.moveTo(sx, sy);
    actx.lineTo(ex, ey);
    actx.stroke();

    actx.strokeStyle = 'rgba(255, 248, 230, 0.44)';
    actx.lineWidth = 1.1;
    actx.beginPath();
    actx.moveTo(sx + 1.2, sy + 1.2);
    actx.lineTo(ex + 1.2, ey + 1.2);
    actx.stroke();

    bctx.strokeStyle = '#262626';
    bctx.lineWidth = 2.6;
    bctx.beginPath();
    bctx.moveTo(sx, sy);
    bctx.lineTo(ex, ey);
    bctx.stroke();

    rctx.strokeStyle = '#282828';
    rctx.lineWidth = 2.2;
    rctx.beginPath();
    rctx.moveTo(sx, sy);
    rctx.lineTo(ex, ey);
    rctx.stroke();
  }

  const cuirassMap = new THREE.CanvasTexture(cAlb);
  cuirassMap.wrapS = THREE.RepeatWrapping;
  cuirassMap.wrapT = THREE.RepeatWrapping;
  cuirassMap.colorSpace = THREE.SRGBColorSpace;

  const cuirassBump = new THREE.CanvasTexture(cBmp);
  cuirassBump.wrapS = THREE.RepeatWrapping;
  cuirassBump.wrapT = THREE.RepeatWrapping;

  const cuirassRoughness = new THREE.CanvasTexture(cRgh);
  cuirassRoughness.wrapS = THREE.RepeatWrapping;
  cuirassRoughness.wrapT = THREE.RepeatWrapping;

  // ---------------------------------------------------------------------------
  // 3. VIVID BLOODSTAINED SPARTAN WAR-CLOAK FABRIC (256x256 Albedo + Bump)
  //    Note: v=0 is bottom hem on createCurvedPanelGeometry, v=1 is top shoulder!
  // ---------------------------------------------------------------------------
  const kSize = 256;
  const kAlb = document.createElement('canvas');
  kAlb.width = kSize;
  kAlb.height = kSize;
  const kctx = kAlb.getContext('2d')!;

  const kBmp = document.createElement('canvas');
  kBmp.width = kSize;
  kBmp.height = kSize;
  const kbctx = kBmp.getContext('2d')!;

  // Rich crimson at top (y=0 in canvas => v=1 in Three.js), scorched charcoal-crimson near hem (y=256 => v=0)
  const kGrad = kctx.createLinearGradient(0, 0, 0, kSize);
  kGrad.addColorStop(0.0, '#b91c2e');
  kGrad.addColorStop(0.45, '#991525');
  kGrad.addColorStop(0.76, '#640e1a');
  kGrad.addColorStop(0.92, '#350a11');
  kGrad.addColorStop(1.0, '#1c080b');
  kctx.fillStyle = kGrad;
  kctx.fillRect(0, 0, kSize, kSize);

  kbctx.fillStyle = '#808080';
  kbctx.fillRect(0, 0, kSize, kSize);

  // Vertical drapery shadow pleats baked subtly to reinforce 3D folds
  for (let x = 0; x < kSize; x += 2) {
    const pleat = Math.sin((x / kSize) * Math.PI * 10);
    kctx.fillStyle = pleat > 0 ? `rgba(255,140,130,${(pleat * 0.09).toFixed(3)})` : `rgba(12,0,4,${(-pleat * 0.16).toFixed(3)})`;
    kctx.fillRect(x, 0, 2, kSize);
  }

  // Heavy woven cloth texture
  for (let y = 0; y < kSize; y += 3) {
    kctx.fillStyle = y % 6 === 0 ? 'rgba(255,215,205,0.055)' : 'rgba(10,0,2,0.11)';
    kctx.fillRect(0, y, kSize, 1.5);
    kbctx.fillStyle = y % 6 === 0 ? '#a0a0a0' : '#626262';
    kbctx.fillRect(0, y, kSize, 1.5);
  }

  // Crisp Tarnished-Gold Greek Meander Key Border along the lower war-cloak hem!
  kctx.strokeStyle = '#eab354';
  kctx.lineWidth = 4;
  kctx.beginPath();
  kctx.moveTo(0, 192);
  kctx.lineTo(kSize, 192);
  kctx.moveTo(0, 224);
  kctx.lineTo(kSize, 224);
  kctx.stroke();

  kctx.strokeStyle = '#f5ca72';
  kctx.lineWidth = 3;
  for (let x = 6; x < kSize; x += 26) {
    kctx.strokeRect(x, 199, 16, 18);
    kctx.fillStyle = '#eab354';
    kctx.fillRect(x + 5, 205, 6, 6);
  }

  // Subtle gold Spartan chevron insignia on center back of cloak
  kctx.strokeStyle = 'rgba(238, 178, 76, 0.55)';
  kctx.lineWidth = 5;
  kctx.beginPath();
  kctx.moveTo(86, 162);
  kctx.lineTo(128, 78);
  kctx.lineTo(170, 162);
  kctx.stroke();

  // Battle-scorch soot blotches near frayed hem
  for (let i = 0; i < 16; i++) {
    const bx = rand() * kSize;
    const by = 212 + rand() * 44;
    const br = 8 + rand() * 20;
    const bGrad = kctx.createRadialGradient(bx, by, 2, bx, by, br);
    bGrad.addColorStop(0, 'rgba(10, 5, 6, 0.72)');
    bGrad.addColorStop(1, 'rgba(10, 5, 6, 0)');
    kctx.fillStyle = bGrad;
    kctx.beginPath();
    kctx.arc(bx, by, br, 0, Math.PI * 2);
    kctx.fill();
  }

  const cloakMap = new THREE.CanvasTexture(kAlb);
  cloakMap.colorSpace = THREE.SRGBColorSpace;
  const cloakBump = new THREE.CanvasTexture(kBmp);

  // ---------------------------------------------------------------------------
  // 4. SCARY GROUND WAR-AURA HALO TEXTURE (256x256, Additive)
  // ---------------------------------------------------------------------------
  const aSize = 256;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = aSize;
  aCanvas.height = aSize;
  const octx = aCanvas.getContext('2d')!;
  const ac = aSize * 0.5;

  octx.clearRect(0, 0, aSize, aSize);

  const oGrad = octx.createRadialGradient(ac, ac, 34, ac, ac, 124);
  oGrad.addColorStop(0.0, 'rgba(255, 60, 16, 0.0)');
  oGrad.addColorStop(0.42, 'rgba(195, 22, 16, 0.28)');
  oGrad.addColorStop(0.66, 'rgba(255, 108, 18, 0.68)');
  oGrad.addColorStop(0.76, 'rgba(255, 222, 112, 0.9)');
  oGrad.addColorStop(0.85, 'rgba(210, 28, 16, 0.38)');
  oGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  octx.fillStyle = oGrad;
  octx.fillRect(0, 0, aSize, aSize);

  octx.strokeStyle = 'rgba(255, 232, 150, 0.92)';
  octx.lineWidth = 2.8;
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const innerR = i % 2 === 0 ? 72 : 84;
    const outerR = i % 2 === 0 ? 114 : 102;
    octx.beginPath();
    octx.moveTo(ac + Math.cos(ang) * innerR, ac + Math.sin(ang) * innerR);
    octx.lineTo(
      ac + Math.cos(ang + 0.055) * ((innerR + outerR) * 0.5),
      ac + Math.sin(ang + 0.055) * ((innerR + outerR) * 0.5)
    );
    octx.lineTo(ac + Math.cos(ang) * outerR, ac + Math.sin(ang) * outerR);
    octx.stroke();
  }

  const auraRingMap = new THREE.CanvasTexture(aCanvas);
  auraRingMap.colorSpace = THREE.SRGBColorSpace;

  // ---------------------------------------------------------------------------
  // 5. HEXAGONAL HOLOGRAPHIC AEGIS KINETIC SHIELD TEXTURE (256x256, Additive/Alpha)
  // ---------------------------------------------------------------------------
  const hSize = 256;
  const hCanvas = document.createElement('canvas');
  hCanvas.width = hSize;
  hCanvas.height = hSize;
  const hctx = hCanvas.getContext('2d')!;

  const hGrad = hctx.createRadialGradient(128, 128, 16, 128, 128, 126);
  hGrad.addColorStop(0.0, 'rgba(255, 160, 48, 0.16)');
  hGrad.addColorStop(0.68, 'rgba(255, 118, 24, 0.34)');
  hGrad.addColorStop(0.9, 'rgba(255, 210, 96, 0.82)');
  hGrad.addColorStop(1.0, 'rgba(255, 240, 170, 0.96)');
  hctx.fillStyle = hGrad;
  hctx.fillRect(0, 0, hSize, hSize);

  // Crisp glowing honeycomb hex mesh
  const rHex = 18;
  const dxHex = rHex * 1.5;
  const dyHex = rHex * Math.sqrt(3);
  hctx.strokeStyle = 'rgba(255, 224, 130, 0.85)';
  hctx.lineWidth = 2.0;
  for (let row = -1; row < hSize / dyHex + 2; row++) {
    for (let col = -1; col < hSize / dxHex + 2; col++) {
      const hx = col * dxHex;
      const hy = row * dyHex + (col % 2 === 0 ? 0 : dyHex * 0.5);
      hctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const px = hx + Math.cos(a) * rHex;
        const py = hy + Math.sin(a) * rHex;
        if (k === 0) hctx.moveTo(px, py);
        else hctx.lineTo(px, py);
      }
      hctx.closePath();
      hctx.stroke();
    }
  }

  const aegisHexMap = new THREE.CanvasTexture(hCanvas);
  aegisHexMap.colorSpace = THREE.SRGBColorSpace;

  return {
    shieldMap,
    shieldBump,
    cuirassMap,
    cuirassBump,
    cuirassRoughness,
    cloakMap,
    cloakBump,
    auraRingMap,
    aegisHexMap,
    dispose() {
      shieldMap.dispose();
      shieldBump.dispose();
      cuirassMap.dispose();
      cuirassBump.dispose();
      cuirassRoughness.dispose();
      cloakMap.dispose();
      cloakBump.dispose();
      auraRingMap.dispose();
      aegisHexMap.dispose();
    },
  };
}
