import * as THREE from 'three';

export interface StalkerTextureSuite {
  carapaceMap: THREE.CanvasTexture;
  carapaceBump: THREE.CanvasTexture;
  carapaceRoughness: THREE.CanvasTexture;
  sinewMap: THREE.CanvasTexture;
  sinewBump: THREE.CanvasTexture;
  bladeMap: THREE.CanvasTexture;
  auraRingMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeRng(seedStart: number): () => number {
  let s = seedStart;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Iteration 2 High-Resolution Procedural PBR Texture Suite for Leaping Carapace Stalker:
 * - Sculpted dark obsidian-jade armored bio-chitin scales with specular bevel highlights,
 *   organic recessed crevices, battle gouges, and subtle sub-dermal venom cracks (no zebra stripes!)
 * - Striated dark slate-charcoal alien musculature & sinew tendons
 * - Forged Damascus obsidian-steel serrated mantis-scythe blade with razor venomous edge
 * - Sharp toxic-emerald predator hunting-aura sigil
 */
export function createStalkerTextures(): StalkerTextureSuite {
  const rand = makeRng(50289);

  // ── 1. 512x512 Sculpted Abyssal Slate-Jade Bio-Chitin Carapace ──
  const cSize = 512;
  const cAlbedo = document.createElement('canvas');
  cAlbedo.width = cSize;
  cAlbedo.height = cSize;
  const ctx = cAlbedo.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = cSize;
  cBump.height = cSize;
  const bctx = cBump.getContext('2d')!;

  const cRough = document.createElement('canvas');
  cRough.width = cSize;
  cRough.height = cSize;
  const rctx = cRough.getContext('2d')!;

  // Rich readable dark slate-jade obsidian base so 3D form reads clearly under arena lighting
  const baseGrad = ctx.createLinearGradient(0, 0, 0, cSize);
  baseGrad.addColorStop(0, '#32484d');
  baseGrad.addColorStop(0.5, '#24363b');
  baseGrad.addColorStop(1, '#364e54');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, cSize, cSize);

  bctx.fillStyle = '#505050';
  bctx.fillRect(0, 0, cSize, cSize);

  rctx.fillStyle = '#686868';
  rctx.fillRect(0, 0, cSize, cSize);

  // Overlapping sculpted armored chitin plates (diamond-hex predator carapace scales)
  const rowH = 42;
  const colW = 64;
  for (let row = -1; row < cSize / rowH + 2; row++) {
    const y = row * rowH;
    const xOff = (row % 2) * (colW * 0.5);
    for (let col = -1; col < cSize / colW + 2; col++) {
      const x = col * colW + xOff;
      const g = ctx.createLinearGradient(x, y - 8, x, y + rowH + 6);
      g.addColorStop(0, '#4f6d72');
      g.addColorStop(0.32, '#354d52');
      g.addColorStop(0.76, '#1f3035');
      g.addColorStop(1, '#121e22');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x + colW * 0.5, y - 10);
      ctx.lineTo(x + colW, y + 6);
      ctx.lineTo(x + colW * 0.86, y + rowH * 0.74);
      ctx.lineTo(x + colW * 0.5, y + rowH + 6);
      ctx.lineTo(x + colW * 0.14, y + rowH * 0.74);
      ctx.closePath();
      ctx.fill();

      // Raised organic keel ridge along each scale center
      ctx.strokeStyle = 'rgba(148, 192, 190, 0.34)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x + colW * 0.5, y - 6);
      ctx.lineTo(x + colW * 0.5, y + rowH * 0.82);
      ctx.stroke();

      // Deep dark chitin interlock groove
      ctx.strokeStyle = 'rgba(8, 14, 16, 0.9)';
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Subtle bioluminescent acid-emerald glow tucked only inside alternating deep scale notches
      if ((row + col) % 3 === 0) {
        ctx.strokeStyle = 'rgba(118, 245, 92, 0.36)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + colW * 0.24, y + rowH * 0.76);
        ctx.lineTo(x + colW * 0.5, y + rowH + 3);
        ctx.lineTo(x + colW * 0.76, y + rowH * 0.76);
        ctx.stroke();
      }

      // Sculpted bump height: high central ridge, deep dark groove
      const bg = bctx.createRadialGradient(
        x + colW * 0.5,
        y + rowH * 0.38,
        3,
        x + colW * 0.5,
        y + rowH * 0.38,
        colW * 0.54
      );
      bg.addColorStop(0, '#ededed');
      bg.addColorStop(0.65, '#969696');
      bg.addColorStop(1, '#1a1a1a');
      bctx.fillStyle = bg;
      bctx.beginPath();
      bctx.moveTo(x + 2, y + 6);
      bctx.lineTo(x + colW * 0.5, y - 8);
      bctx.lineTo(x + colW - 2, y + 6);
      bctx.lineTo(x + colW * 0.5, y + rowH + 4);
      bctx.closePath();
      bctx.fill();

      // Glossy chitin dome center, matte crevices
      rctx.fillStyle = '#383838';
      rctx.beginPath();
      rctx.arc(x + colW * 0.5, y + rowH * 0.38, colW * 0.3, 0, Math.PI * 2);
      rctx.fill();
    }
  }

  // Organic branching sub-dermal acid-venom veins (sparingly placed, jagged organic paths!)
  for (let v = 0; v < 7; v++) {
    let vx = rand() * cSize;
    let vy = rand() * cSize;
    ctx.strokeStyle = 'rgba(84, 240, 102, 0.28)';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    const pts: Array<[number, number]> = [[vx, vy]];
    for (let s = 0; s < 7; s++) {
      vx += (rand() - 0.5) * 68;
      vy += 18 + rand() * 36;
      ctx.lineTo(vx, vy);
      pts.push([vx, vy]);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(182, 255, 92, 0.68)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
    ctx.stroke();
  }

  // Battle-scarred slash gouges & pitted acid burns
  for (let i = 0; i < 42; i++) {
    const sx = rand() * cSize;
    const sy = rand() * cSize;
    const ang = -0.8 + rand() * 1.6;
    const len = 18 + rand() * 52;
    ctx.strokeStyle = 'rgba(210, 228, 224, 0.32)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();

    bctx.strokeStyle = '#121212';
    bctx.lineWidth = 2.0;
    bctx.beginPath();
    bctx.moveTo(sx, sy);
    bctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    bctx.stroke();

    rctx.strokeStyle = '#d0d0d0';
    rctx.lineWidth = 2.2;
    rctx.beginPath();
    rctx.moveTo(sx, sy);
    rctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    rctx.stroke();
  }

  const carapaceMap = new THREE.CanvasTexture(cAlbedo);
  carapaceMap.wrapS = THREE.RepeatWrapping;
  carapaceMap.wrapT = THREE.RepeatWrapping;
  carapaceMap.colorSpace = THREE.SRGBColorSpace;

  const carapaceBump = new THREE.CanvasTexture(cBump);
  carapaceBump.wrapS = THREE.RepeatWrapping;
  carapaceBump.wrapT = THREE.RepeatWrapping;

  const carapaceRoughness = new THREE.CanvasTexture(cRough);
  carapaceRoughness.wrapS = THREE.RepeatWrapping;
  carapaceRoughness.wrapT = THREE.RepeatWrapping;

  // ── 2. 256x256 Sculpted Bio-Sinew Musculature (High-Contrast Striated Alien Muscle & Tendons) ──
  const sSize = 256;
  const sAlbedo = document.createElement('canvas');
  sAlbedo.width = sSize;
  sAlbedo.height = sSize;
  const sctx = sAlbedo.getContext('2d')!;

  const sBump = document.createElement('canvas');
  sBump.width = sSize;
  sBump.height = sSize;
  const sbctx = sBump.getContext('2d')!;

  const sBase = sctx.createLinearGradient(0, 0, sSize, 0);
  sBase.addColorStop(0, '#33424a');
  sBase.addColorStop(0.5, '#43555e');
  sBase.addColorStop(1, '#33424a');
  sctx.fillStyle = sBase;
  sctx.fillRect(0, 0, sSize, sSize);
  sbctx.fillStyle = '#4a4a4a';
  sbctx.fillRect(0, 0, sSize, sSize);

  // Taut striated alien muscle bundles with crisp specular tendon fibers & dark bio-fascia grooves
  for (let x = 0; x < sSize; x += 6) {
    const shade = 68 + Math.floor(rand() * 34);
    sctx.strokeStyle = `rgb(${shade}, ${shade + 14}, ${shade + 18})`;
    sctx.lineWidth = 3.4;
    sctx.beginPath();
    sctx.moveTo(x, 0);
    sctx.bezierCurveTo(x + 7, sSize * 0.33, x - 7, sSize * 0.66, x, sSize);
    sctx.stroke();

    // Deep dark groove beside each muscle bundle
    sctx.strokeStyle = 'rgba(12, 18, 22, 0.72)';
    sctx.lineWidth = 1.6;
    sctx.beginPath();
    sctx.moveTo(x + 3, 0);
    sctx.bezierCurveTo(x + 10, sSize * 0.33, x - 4, sSize * 0.66, x + 3, sSize);
    sctx.stroke();

    sbctx.strokeStyle = '#e0e0e0';
    sbctx.lineWidth = 3.0;
    sbctx.beginPath();
    sbctx.moveTo(x, 0);
    sbctx.bezierCurveTo(x + 7, sSize * 0.33, x - 7, sSize * 0.66, x, sSize);
    sbctx.stroke();
  }
  // Ribbed horizontal tendon straps & subtle bio-crimson capillaries
  for (let y = 0; y < sSize; y += 28) {
    sctx.fillStyle = 'rgba(14, 18, 22, 0.48)';
    sctx.fillRect(0, y, sSize, 3);
    sctx.fillStyle = 'rgba(110, 148, 156, 0.28)';
    sctx.fillRect(0, y + 3, sSize, 2);
    sbctx.fillStyle = '#1c1c1c';
    sbctx.fillRect(0, y, sSize, 3);
  }

  const sinewMap = new THREE.CanvasTexture(sAlbedo);
  sinewMap.wrapS = THREE.RepeatWrapping;
  sinewMap.wrapT = THREE.RepeatWrapping;
  sinewMap.colorSpace = THREE.SRGBColorSpace;

  const sinewBump = new THREE.CanvasTexture(sBump);
  sinewBump.wrapS = THREE.RepeatWrapping;
  sinewBump.wrapT = THREE.RepeatWrapping;

  // ── 3. 256x256 Sinister Dark Forged Damascus Obsidian-Steel Mantis Blade ──
  const blCanvas = document.createElement('canvas');
  blCanvas.width = 256;
  blCanvas.height = 256;
  const blctx = blCanvas.getContext('2d')!;

  const blGrad = blctx.createLinearGradient(0, 0, 256, 0);
  blGrad.addColorStop(0, '#10161b');
  blGrad.addColorStop(0.32, '#24313b');
  blGrad.addColorStop(0.62, '#485d6b');
  blGrad.addColorStop(0.84, '#8aa3b0');
  blGrad.addColorStop(0.95, '#c2d8e0');
  blGrad.addColorStop(1, '#39ff14');
  blctx.fillStyle = blGrad;
  blctx.fillRect(0, 0, 256, 256);

  // Forged Damascus steel folded wave pattern
  for (let i = 0; i < 96; i++) {
    const y = rand() * 256;
    blctx.strokeStyle = rand() > 0.45 ? 'rgba(205,230,242,0.18)' : 'rgba(6,10,14,0.42)';
    blctx.lineWidth = 1.6;
    blctx.beginPath();
    blctx.moveTo(0, y);
    blctx.bezierCurveTo(85, y + (rand() - 0.5) * 26, 170, y - (rand() - 0.5) * 26, 256, y);
    blctx.stroke();
  }

  // Acid-etched blood groove fuller line
  blctx.fillStyle = 'rgba(10, 18, 16, 0.72)';
  blctx.fillRect(88, 0, 14, 256);
  blctx.fillStyle = 'rgba(57, 255, 20, 0.32)';
  blctx.fillRect(102, 0, 3, 256);

  const bladeMap = new THREE.CanvasTexture(blCanvas);
  bladeMap.wrapS = THREE.RepeatWrapping;
  bladeMap.wrapT = THREE.RepeatWrapping;
  bladeMap.colorSpace = THREE.SRGBColorSpace;

  // ── 4. 256x256 Toxic-Emerald Predator Hunting-Aura Sigil ──
  const aSize = 256;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = aSize;
  aCanvas.height = aSize;
  const actx = aCanvas.getContext('2d')!;
  const half = aSize * 0.5;

  actx.clearRect(0, 0, aSize, aSize);

  const mist = actx.createRadialGradient(half, half, 18, half, half, half - 4);
  mist.addColorStop(0, 'rgba(16, 185, 129, 0.04)');
  mist.addColorStop(0.58, 'rgba(52, 245, 122, 0.14)');
  mist.addColorStop(0.8, 'rgba(148, 255, 66, 0.58)');
  mist.addColorStop(0.9, 'rgba(34, 197, 94, 0.24)');
  mist.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
  actx.fillStyle = mist;
  actx.fillRect(0, 0, aSize, aSize);

  // Outer venomous ring + 6 curved talon slash arcs
  actx.strokeStyle = 'rgba(176, 255, 82, 0.9)';
  actx.lineWidth = 3.2;
  actx.beginPath();
  actx.arc(half, half, 99, 0, Math.PI * 2);
  actx.stroke();

  for (let i = 0; i < 6; i++) {
    const startA = (i / 6) * Math.PI * 2 + 0.16;
    const endA = ((i + 1) / 6) * Math.PI * 2 - 0.16;
    actx.strokeStyle = 'rgba(52, 245, 122, 0.72)';
    actx.lineWidth = 2.6;
    actx.beginPath();
    actx.arc(half, half, 79, startA, endA);
    actx.stroke();

    const midA = (startA + endA) * 0.5;
    actx.strokeStyle = 'rgba(218, 255, 120, 0.88)';
    actx.lineWidth = 2.8;
    actx.beginPath();
    actx.moveTo(half + Math.cos(midA) * 64, half + Math.sin(midA) * 64);
    actx.quadraticCurveTo(
      half + Math.cos(midA + 0.16) * 94,
      half + Math.sin(midA + 0.16) * 94,
      half + Math.cos(midA + 0.05) * 118,
      half + Math.sin(midA + 0.05) * 118
    );
    actx.stroke();
  }

  const auraRingMap = new THREE.CanvasTexture(aCanvas);
  auraRingMap.colorSpace = THREE.SRGBColorSpace;

  return {
    carapaceMap,
    carapaceBump,
    carapaceRoughness,
    sinewMap,
    sinewBump,
    bladeMap,
    auraRingMap,
    dispose() {
      carapaceMap.dispose();
      carapaceBump.dispose();
      carapaceRoughness.dispose();
      sinewMap.dispose();
      sinewBump.dispose();
      bladeMap.dispose();
      auraRingMap.dispose();
    },
  };
}
