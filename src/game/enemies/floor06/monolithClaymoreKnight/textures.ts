import * as THREE from 'three';

export interface ClaymoreKnightTextureSuite {
  obsidianPlateAlbedo: THREE.CanvasTexture;
  obsidianPlateBump: THREE.CanvasTexture;
  obsidianPlateRoughness: THREE.CanvasTexture;
  relicGoldAlbedo: THREE.CanvasTexture;
  relicGoldBump: THREE.CanvasTexture;
  bladeAlbedo: THREE.CanvasTexture;
  bladeEmissive: THREE.CanvasTexture;
  tabardAlbedo: THREE.CanvasTexture;
  tabardBump: THREE.CanvasTexture;
  trailGradMap: THREE.CanvasTexture;
  aegisHexMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  if (typeof document === 'undefined') {
    return [null as unknown as HTMLCanvasElement, null];
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(
  c: HTMLCanvasElement,
  repX: number,
  repY: number,
  isColor: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Dedicated AAA 512x512 procedural PBR texture suite for Floor 06 Enemy #2:
 * MONOLITH CLAYMORE KNIGHT ("Obsidian Crusader · Heavy Paranatural Vanguard").
 * - Forged dark obsidian-steel armor plates with battle-gouged sword scars, brushed metallic
 *   bevel highlights, engraved cathedral fluting, and hairline electric-cyan astral ley veins.
 * - Hammered antique relic-gold trim with riveted gothic relief borders.
 * - Runic obsidian greatsword fuller steel with luminous cyan-white sigil channels.
 * - Heavy woven charcoal-indigo crusader war-tabard cloth with frayed battle edges & gold hem.
 * - Silky soft-dissolving alpha-gradient wake texture for the live 3D Claymore Slash Ribbon Trail.
 */
export function createClaymoreKnightTextures(): ClaymoreKnightTextureSuite {
  let seed = 60283;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // =========================================================================
  // 1. FORGED OBSIDIAN-STEEL KNIGHT PLATE WITH BATTLE SCARS & CYAN VEINS (512x512)
  // Full-value metallic dark slate albedo (bound with material.color = 0xffffff!)
  // =========================================================================
  const [pAlb, paCtx] = makeCanvas(512);
  const [pBmp, pbCtx] = makeCanvas(512);
  const [pRgh, prCtx] = makeCanvas(512);

  if (paCtx && pbCtx && prCtx) {
    const grad = paCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0.0, '#444f66');
    grad.addColorStop(0.35, '#2c3445');
    grad.addColorStop(0.68, '#3a4459');
    grad.addColorStop(1.0, '#252c3b');
    paCtx.fillStyle = grad;
    paCtx.fillRect(0, 0, 512, 512);

    pbCtx.fillStyle = '#808080';
    pbCtx.fillRect(0, 0, 512, 512);

    prCtx.fillStyle = '#828282'; // ~0.51 forged armor roughness
    prCtx.fillRect(0, 0, 512, 512);

    // Forged layered plate seams & bevel catchlights
    for (let p = 0; p < 22; p++) {
      const px = rand() * 512;
      const py = rand() * 512;
      const w = 72 + rand() * 145;
      const h = 48 + rand() * 115;
      const tone = Math.floor(42 + rand() * 28);
      paCtx.fillStyle = `rgba(${tone}, ${tone + 9}, ${tone + 24}, 0.44)`;
      paCtx.beginPath();
      paCtx.moveTo(px, py);
      paCtx.lineTo(px + w * 0.92, py + (rand() - 0.5) * 14);
      paCtx.lineTo(px + w, py + h * 0.8);
      paCtx.lineTo(px + w * 0.14, py + h);
      paCtx.closePath();
      paCtx.fill();

      paCtx.strokeStyle = 'rgba(10, 14, 22, 0.72)';
      paCtx.lineWidth = 2.4;
      paCtx.stroke();

      pbCtx.strokeStyle = '#242424';
      pbCtx.lineWidth = 3.0;
      pbCtx.strokeRect(px, py, w * 0.85, h * 0.75);
    }

    // Subtle gothic armor fluting & specular edge wear
    for (let x = 32; x < 512; x += 64) {
      paCtx.fillStyle = 'rgba(185, 206, 236, 0.14)';
      paCtx.fillRect(x, 0, 2, 512);
      paCtx.fillStyle = 'rgba(12, 16, 26, 0.35)';
      paCtx.fillRect(x + 2, 0, 2, 512);
      pbCtx.fillStyle = '#b8b8b8';
      pbCtx.fillRect(x, 0, 2, 512);
      prCtx.fillStyle = '#484848';
      prCtx.fillRect(x, 0, 3, 512);
    }

    // Battle-worn diagonal sword gouges & metallic edge scratches
    for (let s = 0; s < 34; s++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const len = 24 + rand() * 76;
      const ang = (rand() - 0.5) * 1.4;
      const ex = sx + Math.cos(ang) * len;
      const ey = sy + Math.sin(ang) * len;

      paCtx.strokeStyle = 'rgba(218, 232, 250, 0.36)';
      paCtx.lineWidth = 1.4;
      paCtx.beginPath();
      paCtx.moveTo(sx, sy);
      paCtx.lineTo(ex, ey);
      paCtx.stroke();

      pbCtx.strokeStyle = '#1b1b1b';
      pbCtx.lineWidth = 2.2;
      pbCtx.beginPath();
      pbCtx.moveTo(sx, sy);
      pbCtx.lineTo(ex, ey);
      pbCtx.stroke();

      prCtx.strokeStyle = '#323232'; // polished exposed steel inside scratch!
      prCtx.lineWidth = 2.2;
      prCtx.beginPath();
      prCtx.moveTo(sx, sy);
      prCtx.lineTo(ex, ey);
      prCtx.stroke();
    }

    // Hairline electric-cyan astral ley fractures pulsing beneath the obsidian plate
    for (let f = 0; f < 10; f++) {
      let fx = rand() * 512;
      let fy = rand() * 512;
      paCtx.strokeStyle = 'rgba(56, 189, 248, 0.56)';
      paCtx.lineWidth = 1.6;
      pbCtx.strokeStyle = '#141414';
      pbCtx.lineWidth = 2.6;
      paCtx.beginPath();
      pbCtx.beginPath();
      paCtx.moveTo(fx, fy);
      pbCtx.moveTo(fx, fy);
      for (let k = 0; k < 5; k++) {
        fx += (rand() - 0.5) * 44;
        fy += 18 + rand() * 34;
        paCtx.lineTo(fx, fy);
        pbCtx.lineTo(fx, fy);
      }
      paCtx.stroke();
      pbCtx.stroke();
    }

    // Forged steel micro-grain & hammer marks
    for (let i = 0; i < 3600; i++) {
      const px = Math.floor(rand() * 512);
      const py = Math.floor(rand() * 512);
      const bright = rand() > 0.52;
      const alpha = 0.04 + rand() * 0.08;
      paCtx.fillStyle = bright
        ? `rgba(210, 226, 250, ${alpha.toFixed(3)})`
        : `rgba(8, 10, 18, ${(alpha * 1.4).toFixed(3)})`;
      paCtx.fillRect(px, py, 2, 2);

      const bv = Math.floor(94 + rand() * 68);
      pbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      pbCtx.fillRect(px, py, 2, 2);

      const rv = Math.floor(96 + rand() * 78);
      prCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      prCtx.fillRect(px, py, 3, 3);
    }
  }

  // =========================================================================
  // 2. BRUSHED ANTIQUE CATHEDRAL GOLD-BRONZE TRIM (256x256)
  // Rich dark burnished gold with fine brushed grain & gothic filigree grooves (zero polka-dots!)
  // =========================================================================
  const [gAlb, gaCtx] = makeCanvas(256);
  const [gBmp, gbCtx] = makeCanvas(256);
  if (gaCtx && gbCtx) {
    const gg = gaCtx.createLinearGradient(0, 0, 256, 256);
    gg.addColorStop(0.0, '#c89e48');
    gg.addColorStop(0.32, '#926d24');
    gg.addColorStop(0.68, '#b88b35');
    gg.addColorStop(1.0, '#785618');
    gaCtx.fillStyle = gg;
    gaCtx.fillRect(0, 0, 256, 256);

    gbCtx.fillStyle = '#808080';
    gbCtx.fillRect(0, 0, 256, 256);

    // Fine directional brushed metal streaks
    for (let y = 0; y < 256; y += 2) {
      const bright = rand() > 0.5;
      const a = 0.04 + rand() * 0.09;
      gaCtx.fillStyle = bright
        ? `rgba(255, 234, 170, ${a.toFixed(3)})`
        : `rgba(38, 24, 6, ${(a * 1.3).toFixed(3)})`;
      gaCtx.fillRect(0, y, 256, 1);
      const bv = Math.floor(112 + rand() * 32);
      gbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      gbCtx.fillRect(0, y, 256, 1);
    }

    // Crisp recessed gothic filigree twin border lines & subtle beveled panel seams
    gaCtx.strokeStyle = 'rgba(36, 22, 6, 0.72)';
    gaCtx.lineWidth = 2.0;
    gbCtx.strokeStyle = '#282828';
    gbCtx.lineWidth = 2.4;
    for (const pos of [24, 34, 128, 222, 232]) {
      gaCtx.beginPath();
      gaCtx.moveTo(0, pos);
      gaCtx.lineTo(256, pos);
      gaCtx.stroke();
      gbCtx.beginPath();
      gbCtx.moveTo(0, pos);
      gbCtx.lineTo(256, pos);
      gbCtx.stroke();
    }

    // Specular highlight edge beside filigree seams
    gaCtx.strokeStyle = 'rgba(255, 240, 190, 0.36)';
    gaCtx.lineWidth = 1.2;
    for (const pos of [26, 36, 130, 224]) {
      gaCtx.beginPath();
      gaCtx.moveTo(0, pos);
      gaCtx.lineTo(256, pos);
      gaCtx.stroke();
    }

    // Fine 1px antique patina micro-grain
    for (let i = 0; i < 1400; i++) {
      const px = Math.floor(rand() * 256);
      const py = Math.floor(rand() * 256);
      gaCtx.fillStyle =
        rand() > 0.5 ? 'rgba(255, 244, 198, 0.09)' : 'rgba(28, 16, 4, 0.14)';
      gaCtx.fillRect(px, py, 1, 1);
    }
  }

  // =========================================================================
  // 3. RUNIC OBSIDIAN CLAYMORE BLADE FULLER & SIGIL EMISSIVE (256x512)
  // =========================================================================
  const [bAlb, baCtx] = makeCanvas(256, 512);
  const [bEm, beCtx] = makeCanvas(256, 512);
  if (baCtx && beCtx) {
    const bg = baCtx.createLinearGradient(0, 0, 256, 0);
    bg.addColorStop(0.0, '#7890b0');
    bg.addColorStop(0.18, '#283244');
    bg.addColorStop(0.5, '#192030');
    bg.addColorStop(0.82, '#283244');
    bg.addColorStop(1.0, '#7890b0');
    baCtx.fillStyle = bg;
    baCtx.fillRect(0, 0, 256, 512);

    beCtx.fillStyle = '#000000';
    beCtx.fillRect(0, 0, 256, 512);

    // Central luminous cyan astral fuller channel & geometric rune ticks
    const cg = beCtx.createLinearGradient(96, 0, 160, 0);
    cg.addColorStop(0.0, '#000000');
    cg.addColorStop(0.28, '#0284c7');
    cg.addColorStop(0.5, '#e0f2fe');
    cg.addColorStop(0.72, '#0284c7');
    cg.addColorStop(1.0, '#000000');
    beCtx.fillStyle = cg;
    beCtx.fillRect(96, 24, 64, 464);

    baCtx.fillStyle = 'rgba(125, 211, 252, 0.62)';
    baCtx.fillRect(114, 24, 28, 464);

    // Glowing rune chevrons along the blade fuller
    beCtx.strokeStyle = '#7dd3fc';
    beCtx.lineWidth = 4;
    baCtx.strokeStyle = '#bae6fd';
    baCtx.lineWidth = 3;
    for (let y = 52; y < 460; y += 46) {
      for (const ctx of [baCtx, beCtx]) {
        ctx.beginPath();
        ctx.moveTo(80, y + 16);
        ctx.lineTo(128, y - 14);
        ctx.lineTo(176, y + 16);
        ctx.stroke();
      }
    }

    // Razor luminous plasma edge highlight along both cutting bevels
    beCtx.fillStyle = '#38bdf8';
    beCtx.fillRect(0, 0, 10, 512);
    beCtx.fillRect(246, 0, 10, 512);
  }

  // =========================================================================
  // 4. CRUSADER WAR-TABARD & TATTERED CAPE WEAVE (256x256)
  // =========================================================================
  const [tAlb, taCtx] = makeCanvas(256);
  const [tBmp, tbCtx] = makeCanvas(256);
  if (taCtx && tbCtx) {
    const tg = taCtx.createLinearGradient(0, 0, 0, 256);
    tg.addColorStop(0.0, '#1e2438');
    tg.addColorStop(0.65, '#15192a');
    tg.addColorStop(0.88, '#232c44');
    tg.addColorStop(1.0, '#0f1320');
    taCtx.fillStyle = tg;
    taCtx.fillRect(0, 0, 256, 256);

    tbCtx.fillStyle = '#808080';
    tbCtx.fillRect(0, 0, 256, 256);

    // Coarse heavy wool-canvas weave
    for (let y = 0; y < 256; y += 4) {
      taCtx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.09)';
      taCtx.fillRect(0, y, 256, 2);
      tbCtx.fillStyle = y % 8 === 0 ? '#949494' : '#686868';
      tbCtx.fillRect(0, y, 256, 2);
    }

    // Central crusader gold & cyan monolith stripe emblem
    taCtx.fillStyle = '#cfa248';
    taCtx.fillRect(114, 18, 28, 198);
    taCtx.fillStyle = '#38bdf8';
    taCtx.fillRect(124, 24, 8, 184);

    // Bottom liturgical gold hem bar
    taCtx.fillStyle = '#d4a950';
    taCtx.fillRect(0, 214, 256, 10);
    taCtx.fillStyle = '#38bdf8';
    taCtx.fillRect(0, 228, 256, 4);
    taCtx.fillStyle = '#d4a950';
    taCtx.fillRect(0, 236, 256, 6);
  }

  // =========================================================================
  // 5. SILKY CLAYMORE SLASH RIBBON TRAIL ALPHA GRADIENT (64x256)
  // =========================================================================
  const [trMap, trCtx] = makeCanvas(64, 256);
  if (trCtx) {
    trCtx.clearRect(0, 0, 64, 256);
    const img = trCtx.createImageData(64, 256);
    const d = img.data;
    for (let y = 0; y < 256; y++) {
      // v=0 leading blade edge (hottest white-cyan) -> v=1 trailing wake (fades smoothly to 0)
      const v = y / 255;
      const tailFade = Math.pow(1 - v, 1.55);
      for (let x = 0; x < 64; x++) {
        // u=0 blade hilt, u=1 razor sword tip (brightest toward outer tip!)
        const u = x / 63;
        const tipBias = Math.pow(u, 0.55) * Math.sin(Math.min(1, u * 1.05) * Math.PI * 0.92);
        const streak = 0.78 + 0.22 * Math.sin(v * 20 + u * 12);
        const alpha = Math.max(0, Math.min(1, tailFade * tipBias * streak));
        const idx = (y * 64 + x) * 4;
        d[idx] = Math.round(180 + (1 - v) * 75);
        d[idx + 1] = Math.round(230 + (1 - v) * 25);
        d[idx + 2] = 255;
        d[idx + 3] = Math.round(alpha * 255);
      }
    }
    trCtx.putImageData(img, 0, 0);
  }

  // =========================================================================
  // 6. TRANSLUCENT PARANATURAL AEGIS HEX-GRID HARD-LIGHT SHIELD MAP (256x256)
  // =========================================================================
  const [ahMap, ahCtx] = makeCanvas(256, 256);
  if (ahCtx) {
    ahCtx.clearRect(0, 0, 256, 256);
    const rg = ahCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
    rg.addColorStop(0.0, 'rgba(224, 242, 254, 0.72)');
    rg.addColorStop(0.45, 'rgba(56, 189, 248, 0.42)');
    rg.addColorStop(0.84, 'rgba(14, 165, 233, 0.56)');
    rg.addColorStop(1.0, 'rgba(125, 211, 252, 0.92)');
    ahCtx.fillStyle = rg;
    ahCtx.fillRect(0, 0, 256, 256);

    // Crisp glowing hexagonal honeycomb cells
    ahCtx.strokeStyle = 'rgba(186, 230, 253, 0.82)';
    ahCtx.lineWidth = 2.0;
    const hexR = 22;
    const dx = hexR * 1.5;
    const dy = hexR * Math.sqrt(3);
    for (let col = -1; col < 10; col++) {
      for (let row = -1; row < 10; row++) {
        const cx = col * dx;
        const cy = row * dy + (col % 2 === 0 ? 0 : dy * 0.5);
        ahCtx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const x = cx + Math.cos(a) * hexR;
          const y = cy + Math.sin(a) * hexR;
          if (k === 0) ahCtx.moveTo(x, y);
          else ahCtx.lineTo(x, y);
        }
        ahCtx.closePath();
        ahCtx.stroke();
      }
    }

    // Concentric arcane emitter rings around the center buckler projection
    ahCtx.strokeStyle = 'rgba(240, 249, 255, 0.9)';
    ahCtx.lineWidth = 3.0;
    for (const r of [42, 86, 118]) {
      ahCtx.beginPath();
      ahCtx.arc(128, 128, r, 0, Math.PI * 2);
      ahCtx.stroke();
    }
  }

  const obsidianPlateAlbedo = toTex(pAlb, 1.4, 1.4, true);
  const obsidianPlateBump = toTex(pBmp, 1.4, 1.4, false);
  const obsidianPlateRoughness = toTex(pRgh, 1.4, 1.4, false);
  const relicGoldAlbedo = toTex(gAlb, 1.2, 1.2, true);
  const relicGoldBump = toTex(gBmp, 1.2, 1.2, false);
  const bladeAlbedo = toTex(bAlb, 1, 1, true);
  const bladeEmissive = toTex(bEm, 1, 1, true);
  const tabardAlbedo = toTex(tAlb, 1, 1, true);
  const tabardBump = toTex(tBmp, 1, 1, false);
  const trailGradMap = toTex(trMap, 1, 1, true);
  trailGradMap.wrapS = THREE.ClampToEdgeWrapping;
  trailGradMap.wrapT = THREE.ClampToEdgeWrapping;
  const aegisHexMap = toTex(ahMap, 1, 1, true);
  aegisHexMap.wrapS = THREE.ClampToEdgeWrapping;
  aegisHexMap.wrapT = THREE.ClampToEdgeWrapping;

  const all = [
    obsidianPlateAlbedo,
    obsidianPlateBump,
    obsidianPlateRoughness,
    relicGoldAlbedo,
    relicGoldBump,
    bladeAlbedo,
    bladeEmissive,
    tabardAlbedo,
    tabardBump,
    trailGradMap,
    aegisHexMap,
  ];

  return {
    obsidianPlateAlbedo,
    obsidianPlateBump,
    obsidianPlateRoughness,
    relicGoldAlbedo,
    relicGoldBump,
    bladeAlbedo,
    bladeEmissive,
    tabardAlbedo,
    tabardBump,
    trailGradMap,
    aegisHexMap,
    dispose() {
      for (const t of all) t.dispose();
    },
  };
}
