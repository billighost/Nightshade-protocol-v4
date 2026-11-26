import * as THREE from 'three';

export interface AstralLevitatorTextureSuite {
  basaltAlbedo: THREE.CanvasTexture;
  basaltBump: THREE.CanvasTexture;
  basaltRoughness: THREE.CanvasTexture;
  brassAlbedo: THREE.CanvasTexture;
  brassBump: THREE.CanvasTexture;
  crystalCoreAlbedo: THREE.CanvasTexture;
  crystalCoreEmissive: THREE.CanvasTexture;
  shroudAlbedo: THREE.CanvasTexture;
  shroudBump: THREE.CanvasTexture;
  trailGradMap: THREE.CanvasTexture;
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
 * Dedicated AAA 512x512 procedural PBR texture suite for Floor 06 Enemy #1:
 * ASTRAL SHARD LEVITATOR (Seraphim-Class Paranatural Brutalist Sentinel).
 * - Sculpted obsidian-basalt monolithic stone with carved brutalist strata, mineral grain,
 *   hairline luminous astral-violet ley fractures, and dark recessed rune channels.
 * - Ancient hammered relic-gold / bronze with concentric astrolabe engravings and dark patina.
 * - Faceted deep-amethyst & incandescent violet-white Astral Resonance Heart matrix + iris reticle.
 * - Tattered ritual obsidian-indigo liturgical shroud weave with frayed gold hem border.
 * - Silky soft-dissolving alpha-gradient wake texture for live 3D wingtip energy ribbons & lance sheath.
 */
export function createAstralLevitatorTextures(): AstralLevitatorTextureSuite {
  let seed = 60197;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // =========================================================================
  // 1. CARVED VOLCANIC OBSIDIAN-BASALT STONE WITH LEY FRACTURES (512x512)
  // Full-value sculpted stone albedo (bound with material.color = 0xffffff!)
  // =========================================================================
  const [bAlb, baCtx] = makeCanvas(512);
  const [bBmp, bbCtx] = makeCanvas(512);
  const [bRgh, brCtx] = makeCanvas(512);

  if (baCtx && bbCtx && brCtx) {
    const grad = baCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0.0, '#363f56');
    grad.addColorStop(0.35, '#252b3d');
    grad.addColorStop(0.7, '#31384c');
    grad.addColorStop(1.0, '#202636');
    baCtx.fillStyle = grad;
    baCtx.fillRect(0, 0, 512, 512);

    bbCtx.fillStyle = '#808080';
    bbCtx.fillRect(0, 0, 512, 512);

    brCtx.fillStyle = '#a8a8a8';
    brCtx.fillRect(0, 0, 512, 512);

    // Chiseled organic volcanic basalt plates & faceted obsidian planes (no uniform brick grid!)
    for (let p = 0; p < 28; p++) {
      const px = rand() * 512;
      const py = rand() * 512;
      const w = 64 + rand() * 140;
      const h = 42 + rand() * 110;
      const shade = Math.floor(34 + rand() * 26);
      baCtx.fillStyle = `rgba(${shade}, ${shade + 7}, ${shade + 22}, 0.42)`;
      baCtx.beginPath();
      baCtx.moveTo(px, py);
      baCtx.lineTo(px + w * 0.85, py + (rand() - 0.5) * 18);
      baCtx.lineTo(px + w, py + h * 0.72);
      baCtx.lineTo(px + w * 0.22, py + h);
      baCtx.closePath();
      baCtx.fill();

      baCtx.strokeStyle = 'rgba(10, 12, 20, 0.65)';
      baCtx.lineWidth = 2.2;
      baCtx.stroke();

      bbCtx.strokeStyle = '#2a2a2a';
      bbCtx.lineWidth = 2.8;
      bbCtx.beginPath();
      bbCtx.moveTo(px, py);
      bbCtx.lineTo(px + w * 0.85, py);
      bbCtx.lineTo(px + w, py + h * 0.72);
      bbCtx.closePath();
      bbCtx.stroke();
    }

    // Subtle recessed cathedral-monolith chevron striations (wide spacing)
    baCtx.strokeStyle = 'rgba(218, 178, 96, 0.34)';
    baCtx.lineWidth = 2.0;
    bbCtx.strokeStyle = '#c8c8c8';
    bbCtx.lineWidth = 2.0;
    brCtx.strokeStyle = '#4c4c4c';
    brCtx.lineWidth = 2.4;
    for (let row = 0; row < 2; row++) {
      const cy = row * 256 + 128;
      for (let col = 0; col < 2; col++) {
        const cx = col * 256 + 128;
        baCtx.beginPath();
        baCtx.moveTo(cx - 48, cy - 28);
        baCtx.lineTo(cx, cy + 28);
        baCtx.lineTo(cx + 48, cy - 28);
        baCtx.stroke();

        bbCtx.beginPath();
        bbCtx.moveTo(cx - 48, cy - 28);
        bbCtx.lineTo(cx, cy + 28);
        bbCtx.lineTo(cx + 48, cy - 28);
        bbCtx.stroke();

        brCtx.beginPath();
        brCtx.moveTo(cx - 48, cy - 28);
        brCtx.lineTo(cx, cy + 28);
        brCtx.lineTo(cx + 48, cy - 28);
        brCtx.stroke();
      }
    }

    // Jagged paranatural astral-violet ley-line fractures etched deep through basalt
    for (let f = 0; f < 16; f++) {
      let fx = rand() * 512;
      let fy = rand() * 512;
      baCtx.strokeStyle = 'rgba(196, 128, 255, 0.52)';
      baCtx.lineWidth = 1.8;
      bbCtx.strokeStyle = '#141414';
      bbCtx.lineWidth = 2.8;
      baCtx.beginPath();
      bbCtx.beginPath();
      baCtx.moveTo(fx, fy);
      bbCtx.moveTo(fx, fy);
      for (let s = 0; s < 6; s++) {
        fx += (rand() - 0.5) * 48;
        fy += 16 + rand() * 36;
        baCtx.lineTo(fx, fy);
        bbCtx.lineTo(fx, fy);
      }
      baCtx.stroke();
      bbCtx.stroke();
    }

    // Volcanic basalt mineral pitting & specular obsidian flecks
    for (let i = 0; i < 4200; i++) {
      const px = Math.floor(rand() * 512);
      const py = Math.floor(rand() * 512);
      const light = rand() > 0.54;
      const alpha = 0.04 + rand() * 0.09;
      baCtx.fillStyle = light
        ? `rgba(204, 218, 246, ${alpha.toFixed(3)})`
        : `rgba(8, 10, 16, ${(alpha * 1.5).toFixed(3)})`;
      baCtx.fillRect(px, py, 2, 2);

      const bv = Math.floor(88 + rand() * 76);
      bbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bbCtx.fillRect(px, py, 2, 2);

      const rv = Math.floor(126 + rand() * 78);
      brCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      brCtx.fillRect(px, py, 3, 3);
    }
  }

  // =========================================================================
  // 2. ANCIENT HAMMERED RELIC-GOLD / ASTROLABE BRASS (256x256)
  // =========================================================================
  const [gAlb, gaCtx] = makeCanvas(256);
  const [gBmp, gbCtx] = makeCanvas(256);
  if (gaCtx && gbCtx) {
    const gg = gaCtx.createLinearGradient(0, 0, 256, 256);
    gg.addColorStop(0.0, '#e8c474');
    gg.addColorStop(0.5, '#c49642');
    gg.addColorStop(1.0, '#deb460');
    gaCtx.fillStyle = gg;
    gaCtx.fillRect(0, 0, 256, 256);

    gbCtx.fillStyle = '#808080';
    gbCtx.fillRect(0, 0, 256, 256);

    // Engraved astrolabe degree tick marks & ancient geometric rings
    gaCtx.strokeStyle = 'rgba(54, 34, 12, 0.58)';
    gaCtx.lineWidth = 2;
    gbCtx.strokeStyle = '#383838';
    gbCtx.lineWidth = 2;
    for (let y = 16; y < 256; y += 32) {
      gaCtx.beginPath();
      gaCtx.moveTo(0, y);
      gaCtx.lineTo(256, y);
      gaCtx.stroke();
      gbCtx.beginPath();
      gbCtx.moveTo(0, y);
      gbCtx.lineTo(256, y);
      gbCtx.stroke();

      for (let x = 8; x < 256; x += 16) {
        const tick = x % 32 === 0 ? 9 : 5;
        gaCtx.fillStyle = 'rgba(54, 34, 12, 0.62)';
        gaCtx.fillRect(x, y, 2, tick);
        gbCtx.fillStyle = '#303030';
        gbCtx.fillRect(x, y, 2, tick);
      }
    }

    // Hammered metallic micro-dimples & patina flecks
    for (let i = 0; i < 650; i++) {
      const px = rand() * 256;
      const py = rand() * 256;
      const r = 1.5 + rand() * 3.5;
      gaCtx.fillStyle =
        rand() > 0.5 ? 'rgba(255, 240, 195, 0.14)' : 'rgba(65, 42, 14, 0.16)';
      gaCtx.beginPath();
      gaCtx.arc(px, py, r, 0, Math.PI * 2);
      gaCtx.fill();

      gbCtx.fillStyle = rand() > 0.5 ? 'rgba(180,180,180,0.22)' : 'rgba(85,85,85,0.22)';
      gbCtx.beginPath();
      gbCtx.arc(px, py, r, 0, Math.PI * 2);
      gbCtx.fill();
    }
  }

  // =========================================================================
  // 3. FACETED AMETHYST SINGULARITY CORE & RUNE IRIS (256x256)
  // =========================================================================
  const [cAlb, caCtx] = makeCanvas(256);
  const [cEm, ceCtx] = makeCanvas(256);
  if (caCtx && ceCtx) {
    const cg = caCtx.createRadialGradient(128, 128, 8, 128, 128, 128);
    cg.addColorStop(0.0, '#ffffff');
    cg.addColorStop(0.24, '#f0abfc');
    cg.addColorStop(0.55, '#9333ea');
    cg.addColorStop(0.84, '#4c1d95');
    cg.addColorStop(1.0, '#1e0b3a');
    caCtx.fillStyle = cg;
    caCtx.fillRect(0, 0, 256, 256);

    ceCtx.fillStyle = cg;
    ceCtx.fillRect(0, 0, 256, 256);

    // Crystalline internal facets & astral geometric sigil lines
    for (const ctx of [caCtx, ceCtx]) {
      ctx.strokeStyle = 'rgba(255, 240, 255, 0.72)';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(128 + Math.cos(a) * 18, 128 + Math.sin(a) * 18);
        ctx.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(128, 128, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(128, 128, 88, 0, Math.PI * 2);
      ctx.stroke();

      // Dark abyssal singularity pupil slits
      ctx.fillStyle = 'rgba(18, 4, 38, 0.82)';
      ctx.beginPath();
      ctx.ellipse(128, 128, 11, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // 4. RITUAL OBSIDIAN-INDIGO LITURGICAL SHROUD WEAVE (256x256)
  // =========================================================================
  const [sAlb, saCtx] = makeCanvas(256);
  const [sBmp, sbCtx] = makeCanvas(256);
  if (saCtx && sbCtx) {
    const sg = saCtx.createLinearGradient(0, 0, 0, 256);
    sg.addColorStop(0.0, '#26233a');
    sg.addColorStop(0.65, '#1b182c');
    sg.addColorStop(0.88, '#2d2148');
    sg.addColorStop(1.0, '#131020');
    saCtx.fillStyle = sg;
    saCtx.fillRect(0, 0, 256, 256);

    sbCtx.fillStyle = '#808080';
    sbCtx.fillRect(0, 0, 256, 256);

    // Fine woven cloth grain
    for (let y = 0; y < 256; y += 4) {
      saCtx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
      saCtx.fillRect(0, y, 256, 2);
      sbCtx.fillStyle = y % 8 === 0 ? '#929292' : '#6c6c6c';
      sbCtx.fillRect(0, y, 256, 2);
    }
    for (let x = 0; x < 256; x += 6) {
      saCtx.fillStyle = 'rgba(140, 120, 200, 0.05)';
      saCtx.fillRect(x, 0, 2, 256);
      sbCtx.fillStyle = '#8a8a8a';
      sbCtx.fillRect(x, 0, 2, 256);
    }

    // Ornate relic-gold border hem along bottom edge
    saCtx.fillStyle = '#d4a950';
    saCtx.fillRect(0, 214, 256, 10);
    saCtx.fillStyle = '#a855f7';
    saCtx.fillRect(0, 228, 256, 5);
    saCtx.fillStyle = '#d4a950';
    saCtx.fillRect(0, 236, 256, 6);
  }

  // =========================================================================
  // 5. SILKY ENERGY RIBBON / TRAIL ALPHA GRADIENT (64x256)
  // =========================================================================
  const [tMap, tCtx] = makeCanvas(64, 256);
  if (tCtx) {
    tCtx.clearRect(0, 0, 64, 256);
    const img = tCtx.createImageData(64, 256);
    const d = img.data;
    for (let y = 0; y < 256; y++) {
      // v = 0 head (brightest) -> v = 1 tail (dissolves cleanly to 0!)
      const v = y / 255;
      const tailFade = Math.pow(1 - v, 1.65);
      for (let x = 0; x < 64; x++) {
        const u = x / 63;
        const edgeFade = Math.sin(u * Math.PI);
        const streak = 0.72 + 0.28 * Math.sin(v * 24 + u * 8);
        const alpha = Math.max(0, Math.min(1, tailFade * Math.pow(edgeFade, 0.85) * streak));
        const idx = (y * 64 + x) * 4;
        d[idx] = 255;
        d[idx + 1] = Math.round(210 + (1 - v) * 45);
        d[idx + 2] = 255;
        d[idx + 3] = Math.round(alpha * 255);
      }
    }
    tCtx.putImageData(img, 0, 0);
  }

  const basaltAlbedo = toTex(bAlb, 1.5, 1.5, true);
  const basaltBump = toTex(bBmp, 1.5, 1.5, false);
  const basaltRoughness = toTex(bRgh, 1.5, 1.5, false);
  const brassAlbedo = toTex(gAlb, 1.5, 1.5, true);
  const brassBump = toTex(gBmp, 1.5, 1.5, false);
  const crystalCoreAlbedo = toTex(cAlb, 1, 1, true);
  const crystalCoreEmissive = toTex(cEm, 1, 1, true);
  const shroudAlbedo = toTex(sAlb, 1, 1, true);
  const shroudBump = toTex(sBmp, 1, 1, false);
  const trailGradMap = toTex(tMap, 1, 1, true);
  trailGradMap.wrapS = THREE.ClampToEdgeWrapping;
  trailGradMap.wrapT = THREE.ClampToEdgeWrapping;

  const all = [
    basaltAlbedo,
    basaltBump,
    basaltRoughness,
    brassAlbedo,
    brassBump,
    crystalCoreAlbedo,
    crystalCoreEmissive,
    shroudAlbedo,
    shroudBump,
    trailGradMap,
  ];

  return {
    basaltAlbedo,
    basaltBump,
    basaltRoughness,
    brassAlbedo,
    brassBump,
    crystalCoreAlbedo,
    crystalCoreEmissive,
    shroudAlbedo,
    shroudBump,
    trailGradMap,
    dispose() {
      for (const t of all) t.dispose();
    },
  };
}
