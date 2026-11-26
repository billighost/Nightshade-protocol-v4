import * as THREE from 'three';

export interface BeamPrismTextureSuite {
  obsidianBasaltAlbedo: THREE.CanvasTexture;
  obsidianBasaltBump: THREE.CanvasTexture;
  obsidianBasaltRoughness: THREE.CanvasTexture;
  opticBrassAlbedo: THREE.CanvasTexture;
  opticBrassBump: THREE.CanvasTexture;
  mirrorLensAlbedo: THREE.CanvasTexture;
  mirrorLensEmissive: THREE.CanvasTexture;
  refractionShieldMap: THREE.CanvasTexture;
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
 * Dedicated AAA 512x512 procedural PBR texture suite for Floor 06 Enemy #3:
 * RESONANT BEAM PRISM ("Solar-Teal Optical Refraction Spire").
 * - Fluted architectural obsidian-basalt plating with geometric prism engraving & teal ley conduits.
 * - Brushed antique observatory brass-gold with fine vernier degree markings (zero polka-dots!).
 * - Concave Fresnel optical mirror lens plates with glowing teal-gold refraction channels.
 * - Translucent crystalline triangular refraction lattice for the reactive Refraction Shield Barrier.
 */
export function createBeamPrismTextures(): BeamPrismTextureSuite {
  let seed = 60341;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // =========================================================================
  // 1. ARCHITECTURAL OBSIDIAN-BASALT WITH GEOMETRIC PRISM GROOVES (512x512)
  // Full-value metallic slate-obsidian (bound with material.color = 0xffffff!)
  // =========================================================================
  const [bAlb, baCtx] = makeCanvas(512);
  const [bBmp, bbCtx] = makeCanvas(512);
  const [bRgh, brCtx] = makeCanvas(512);

  if (baCtx && bbCtx && brCtx) {
    const grad = baCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0.0, '#3a4654');
    grad.addColorStop(0.38, '#26303c');
    grad.addColorStop(0.72, '#34414f');
    grad.addColorStop(1.0, '#1f2833');
    baCtx.fillStyle = grad;
    baCtx.fillRect(0, 0, 512, 512);

    bbCtx.fillStyle = '#808080';
    bbCtx.fillRect(0, 0, 512, 512);

    brCtx.fillStyle = '#7e7e7e'; // ~0.49 architectural machined slate
    brCtx.fillRect(0, 0, 512, 512);

    // Architectural stepped geometric monolith panel joints
    for (let i = 0; i < 18; i++) {
      const px = rand() * 512;
      const py = rand() * 512;
      const w = 80 + rand() * 140;
      const h = 55 + rand() * 120;
      const v = Math.floor(40 + rand() * 24);
      baCtx.fillStyle = `rgba(${v}, ${v + 12}, ${v + 18}, 0.42)`;
      baCtx.fillRect(px, py, w, h);

      baCtx.strokeStyle = 'rgba(8, 12, 18, 0.78)';
      baCtx.lineWidth = 2.4;
      baCtx.strokeRect(px, py, w, h);

      bbCtx.strokeStyle = '#202020';
      bbCtx.lineWidth = 3.2;
      bbCtx.strokeRect(px, py, w, h);

      // Polished bevel catchlight along top/left edges
      baCtx.strokeStyle = 'rgba(190, 224, 232, 0.22)';
      baCtx.lineWidth = 1.4;
      baCtx.beginPath();
      baCtx.moveTo(px + 2, py + h - 2);
      baCtx.lineTo(px + 2, py + 2);
      baCtx.lineTo(px + w - 2, py + 2);
      baCtx.stroke();
    }

    // Precision triangular optical alignment engravings & harmonic teal conduits
    baCtx.strokeStyle = 'rgba(45, 212, 191, 0.48)';
    baCtx.lineWidth = 1.8;
    bbCtx.strokeStyle = '#181818';
    bbCtx.lineWidth = 2.6;
    brCtx.strokeStyle = '#363636';
    brCtx.lineWidth = 3.0;
    for (let y = 64; y < 512; y += 128) {
      for (const ctx of [baCtx, bbCtx, brCtx]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(128, y - 36);
        ctx.lineTo(256, y);
        ctx.lineTo(384, y + 36);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    }

    // Fine vertical observatory fluting
    for (let x = 24; x < 512; x += 48) {
      baCtx.fillStyle = 'rgba(200, 232, 235, 0.1)';
      baCtx.fillRect(x, 0, 2, 512);
      baCtx.fillStyle = 'rgba(6, 10, 16, 0.34)';
      baCtx.fillRect(x + 2, 0, 2, 512);
      bbCtx.fillStyle = '#aeaeae';
      bbCtx.fillRect(x, 0, 2, 512);
    }

    // Machined stone-metal micro-grain
    for (let i = 0; i < 3200; i++) {
      const px = Math.floor(rand() * 512);
      const py = Math.floor(rand() * 512);
      const bright = rand() > 0.5;
      const a = 0.04 + rand() * 0.07;
      baCtx.fillStyle = bright
        ? `rgba(210, 235, 238, ${a.toFixed(3)})`
        : `rgba(8, 12, 18, ${(a * 1.4).toFixed(3)})`;
      baCtx.fillRect(px, py, 2, 2);

      const bv = Math.floor(100 + rand() * 56);
      bbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bbCtx.fillRect(px, py, 2, 2);

      const rv = Math.floor(96 + rand() * 72);
      brCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      brCtx.fillRect(px, py, 3, 3);
    }
  }

  // =========================================================================
  // 2. BRUSHED ANTIQUE OBSERVATORY BRASS-GOLD WITH VERNIER TICKS (256x256)
  // =========================================================================
  const [gAlb, gaCtx] = makeCanvas(256);
  const [gBmp, gbCtx] = makeCanvas(256);
  if (gaCtx && gbCtx) {
    const gg = gaCtx.createLinearGradient(0, 0, 256, 256);
    gg.addColorStop(0.0, '#d2ad56');
    gg.addColorStop(0.35, '#997428');
    gg.addColorStop(0.7, '#c29940');
    gg.addColorStop(1.0, '#7c5b1c');
    gaCtx.fillStyle = gg;
    gaCtx.fillRect(0, 0, 256, 256);

    gbCtx.fillStyle = '#808080';
    gbCtx.fillRect(0, 0, 256, 256);

    // Fine directional brushed sheen
    for (let y = 0; y < 256; y += 2) {
      const a = 0.04 + rand() * 0.08;
      gaCtx.fillStyle =
        rand() > 0.5 ? `rgba(255, 240, 185, ${a.toFixed(3)})` : `rgba(42, 26, 6, ${(a * 1.3).toFixed(3)})`;
      gaCtx.fillRect(0, y, 256, 1);
      const bv = Math.floor(114 + rand() * 28);
      gbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      gbCtx.fillRect(0, y, 256, 1);
    }

    // Crisp engraved astrolabe vernier graduation ticks & channels
    gaCtx.strokeStyle = 'rgba(34, 22, 6, 0.72)';
    gaCtx.lineWidth = 2.0;
    gbCtx.strokeStyle = '#242424';
    gbCtx.lineWidth = 2.2;
    for (const y of [32, 128, 224]) {
      gaCtx.beginPath();
      gaCtx.moveTo(0, y);
      gaCtx.lineTo(256, y);
      gaCtx.stroke();
      gbCtx.beginPath();
      gbCtx.moveTo(0, y);
      gbCtx.lineTo(256, y);
      gbCtx.stroke();
    }
    for (let x = 0; x < 256; x += 16) {
      const h = x % 64 === 0 ? 20 : 10;
      gaCtx.fillStyle = 'rgba(36, 22, 6, 0.65)';
      gaCtx.fillRect(x, 34, 2, h);
      gaCtx.fillRect(x, 130, 2, h);
      gbCtx.fillStyle = '#282828';
      gbCtx.fillRect(x, 34, 2, h);
      gbCtx.fillRect(x, 130, 2, h);
    }
  }

  // =========================================================================
  // 3. CONCAVE FRESNEL MIRROR-LENS OPTICAL REFLECTOR (256x512)
  // =========================================================================
  const [mAlb, maCtx] = makeCanvas(256, 512);
  const [mEm, meCtx] = makeCanvas(256, 512);
  if (maCtx && meCtx) {
    const mg = maCtx.createLinearGradient(0, 0, 256, 0);
    mg.addColorStop(0.0, '#1e2c36');
    mg.addColorStop(0.22, '#4e7885');
    mg.addColorStop(0.5, '#b8f2ec');
    mg.addColorStop(0.78, '#4e7885');
    mg.addColorStop(1.0, '#1e2c36');
    maCtx.fillStyle = mg;
    maCtx.fillRect(0, 0, 256, 512);

    meCtx.fillStyle = '#000000';
    meCtx.fillRect(0, 0, 256, 512);

    // Central luminous Fresnel focal channel
    const eg = meCtx.createLinearGradient(76, 0, 180, 0);
    eg.addColorStop(0.0, '#000000');
    eg.addColorStop(0.25, '#0d9488');
    eg.addColorStop(0.5, '#99f6e4');
    eg.addColorStop(0.75, '#0d9488');
    eg.addColorStop(1.0, '#000000');
    meCtx.fillStyle = eg;
    meCtx.fillRect(76, 28, 104, 456);

    // Concentric diamond Fresnel refraction grooves
    meCtx.strokeStyle = '#fef08a';
    meCtx.lineWidth = 3.2;
    maCtx.strokeStyle = '#fde68a';
    maCtx.lineWidth = 2.6;
    for (let y = 56; y < 460; y += 52) {
      for (const ctx of [maCtx, meCtx]) {
        ctx.beginPath();
        ctx.moveTo(64, y);
        ctx.lineTo(128, y - 22);
        ctx.lineTo(192, y);
        ctx.lineTo(128, y + 22);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Outer optical framing rails
    meCtx.fillStyle = '#14b8a6';
    meCtx.fillRect(14, 16, 8, 480);
    meCtx.fillRect(234, 16, 8, 480);
  }

  // =========================================================================
  // 4. TRANSLUCENT TRI-PRISM REFRACTION BARRIER LATTICE (256x256)
  // =========================================================================
  const [sMap, sCtx] = makeCanvas(256, 256);
  if (sCtx) {
    sCtx.clearRect(0, 0, 256, 256);
    const rg = sCtx.createRadialGradient(128, 128, 14, 128, 128, 124);
    rg.addColorStop(0.0, 'rgba(254, 249, 195, 0.78)');
    rg.addColorStop(0.38, 'rgba(45, 212, 191, 0.48)');
    rg.addColorStop(0.82, 'rgba(13, 148, 136, 0.54)');
    rg.addColorStop(1.0, 'rgba(94, 234, 212, 0.94)');
    sCtx.fillStyle = rg;
    sCtx.fillRect(0, 0, 256, 256);

    // Triangular prismatic crystal lattice grid
    sCtx.strokeStyle = 'rgba(204, 251, 241, 0.82)';
    sCtx.lineWidth = 2.0;
    const step = 32;
    for (let i = -256; i <= 512; i += step) {
      sCtx.beginPath();
      sCtx.moveTo(0, i);
      sCtx.lineTo(256, i);
      sCtx.stroke();

      sCtx.beginPath();
      sCtx.moveTo(i, 0);
      sCtx.lineTo(i + 148, 256);
      sCtx.stroke();

      sCtx.beginPath();
      sCtx.moveTo(i, 0);
      sCtx.lineTo(i - 148, 256);
      sCtx.stroke();
    }

    // Concentric golden-teal focusing rings
    sCtx.strokeStyle = 'rgba(254, 240, 138, 0.92)';
    sCtx.lineWidth = 3.0;
    for (const r of [36, 82, 118]) {
      sCtx.beginPath();
      sCtx.arc(128, 128, r, 0, Math.PI * 2);
      sCtx.stroke();
    }
  }

  const obsidianBasaltAlbedo = toTex(bAlb, 1.3, 1.3, true);
  const obsidianBasaltBump = toTex(bBmp, 1.3, 1.3, false);
  const obsidianBasaltRoughness = toTex(bRgh, 1.3, 1.3, false);
  const opticBrassAlbedo = toTex(gAlb, 1.2, 1.2, true);
  const opticBrassBump = toTex(gBmp, 1.2, 1.2, false);
  const mirrorLensAlbedo = toTex(mAlb, 1, 1, true);
  const mirrorLensEmissive = toTex(mEm, 1, 1, true);
  const refractionShieldMap = toTex(sMap, 1, 1, true);
  refractionShieldMap.wrapS = THREE.ClampToEdgeWrapping;
  refractionShieldMap.wrapT = THREE.ClampToEdgeWrapping;

  const all = [
    obsidianBasaltAlbedo,
    obsidianBasaltBump,
    obsidianBasaltRoughness,
    opticBrassAlbedo,
    opticBrassBump,
    mirrorLensAlbedo,
    mirrorLensEmissive,
    refractionShieldMap,
  ];

  return {
    obsidianBasaltAlbedo,
    obsidianBasaltBump,
    obsidianBasaltRoughness,
    opticBrassAlbedo,
    opticBrassBump,
    mirrorLensAlbedo,
    mirrorLensEmissive,
    refractionShieldMap,
    dispose() {
      for (const t of all) t.dispose();
    },
  };
}
