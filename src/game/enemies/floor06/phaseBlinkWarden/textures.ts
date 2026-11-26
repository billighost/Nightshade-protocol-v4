import * as THREE from 'three';

export interface PhaseBlinkWardenTextureSuite {
  obsidianPorcelainAlbedo: THREE.CanvasTexture;
  obsidianPorcelainBump: THREE.CanvasTexture;
  obsidianPorcelainRoughness: THREE.CanvasTexture;
  relicBrassAlbedo: THREE.CanvasTexture;
  relicBrassBump: THREE.CanvasTexture;
  shroudClothAlbedo: THREE.CanvasTexture;
  shroudClothBump: THREE.CanvasTexture;
  mantisBladeAlbedo: THREE.CanvasTexture;
  mantisBladeEmissive: THREE.CanvasTexture;
  riftPortalMap: THREE.CanvasTexture;
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
 * Dedicated AAA 512x512 procedural PBR texture suite for Floor 06 Enemy #4:
 * PHASE-BLINK WARDEN ("Abyssal Dimensional Assassin · Spatial-Rift Inquisitor").
 *
 * Distinct visual identity from prior Floor 06 archetypes:
 * - Midnight obsidian-violet fluted porcelain-basalt plating with geometric phase-lattice etchings
 * - Burnished champagne-brass ceremonial filigree with micro-engraved astrolabe vernier ticks
 * - Tattered abyssal-indigo woven ceremonial shroud cloth with phase-singed violet-gold hem
 * - Luminous amethyst-magenta hard-light Mantis Blade plasma striations
 * - Concentric hexagonal spatial-rift distortion sigil texture for blink rings & afterimages
 */
export function createPhaseBlinkWardenTextures(): PhaseBlinkWardenTextureSuite {
  let seed = 60491;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // =========================================================================
  // 1. OBSIDIAN-VIOLET FLUTED PORCELAIN-BASALT ARMOR (512x512)
  // Neutral-rich luminance so material.color = 0xffffff preserves dark violet contrast!
  // =========================================================================
  const [aAlb, aaCtx] = makeCanvas(512);
  const [aBmp, abCtx] = makeCanvas(512);
  const [aRgh, arCtx] = makeCanvas(512);

  if (aaCtx && abCtx && arCtx) {
    const grad = aaCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0.0, '#3a3454');
    grad.addColorStop(0.38, '#252138');
    grad.addColorStop(0.72, '#342d4c');
    grad.addColorStop(1.0, '#1e1b2f');
    aaCtx.fillStyle = grad;
    aaCtx.fillRect(0, 0, 512, 512);

    abCtx.fillStyle = '#808080';
    abCtx.fillRect(0, 0, 512, 512);

    arCtx.fillStyle = '#707070'; // ~0.44 satin obsidian-porcelain finish
    arCtx.fillRect(0, 0, 512, 512);

    // Interlocking diamond/hex stealth carapace facets
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cx = col * 64 + (row % 2 === 0 ? 0 : 32);
        const cy = row * 64;
        const tone = Math.floor(38 + rand() * 24);
        aaCtx.fillStyle = `rgba(${tone + 10}, ${tone + 4}, ${tone + 30}, 0.42)`;
        aaCtx.beginPath();
        aaCtx.moveTo(cx, cy - 30);
        aaCtx.lineTo(cx + 30, cy);
        aaCtx.lineTo(cx, cy + 30);
        aaCtx.lineTo(cx - 30, cy);
        aaCtx.closePath();
        aaCtx.fill();

        aaCtx.strokeStyle = 'rgba(12, 10, 22, 0.78)';
        aaCtx.lineWidth = 2.0;
        aaCtx.stroke();

        abCtx.strokeStyle = '#282828';
        abCtx.lineWidth = 2.6;
        abCtx.beginPath();
        abCtx.moveTo(cx, cy - 30);
        abCtx.lineTo(cx + 30, cy);
        abCtx.lineTo(cx, cy + 30);
        abCtx.lineTo(cx - 30, cy);
        abCtx.closePath();
        abCtx.stroke();
      }
    }

    // Precision milled vertical armor fluting with pale lavender specular edge wear
    for (let x = 24; x < 512; x += 64) {
      aaCtx.fillStyle = 'rgba(196, 178, 240, 0.16)';
      aaCtx.fillRect(x, 0, 2, 512);
      aaCtx.fillStyle = 'rgba(10, 8, 20, 0.46)';
      aaCtx.fillRect(x + 2, 0, 2, 512);
      abCtx.fillStyle = '#bcbcbc';
      abCtx.fillRect(x, 0, 2, 512);
      arCtx.fillStyle = '#3c3c3c';
      arCtx.fillRect(x, 0, 3, 512);
    }

    // Hairline luminous phase-violet circuit chevrons inlaid in the basalt plates
    aaCtx.strokeStyle = 'rgba(192, 132, 252, 0.42)';
    aaCtx.lineWidth = 1.6;
    abCtx.strokeStyle = '#363636';
    abCtx.lineWidth = 2.0;
    for (let i = 0; i < 6; i++) {
      const y = 42 + i * 84;
      aaCtx.beginPath();
      aaCtx.moveTo(0, y);
      aaCtx.lineTo(112, y);
      aaCtx.lineTo(148, y + 26);
      aaCtx.lineTo(364, y + 26);
      aaCtx.lineTo(400, y);
      aaCtx.lineTo(512, y);
      aaCtx.stroke();

      abCtx.beginPath();
      abCtx.moveTo(0, y);
      abCtx.lineTo(112, y);
      abCtx.lineTo(148, y + 26);
      abCtx.lineTo(364, y + 26);
      abCtx.lineTo(400, y);
      abCtx.lineTo(512, y);
      abCtx.stroke();
    }

    // Subtle micro-scratches & basalt grain
    for (let i = 0; i < 1400; i++) {
      const px = rand() * 512;
      const py = rand() * 512;
      const bright = rand() > 0.5;
      aaCtx.fillStyle = bright
        ? `rgba(214, 198, 255, ${(0.03 + rand() * 0.05).toFixed(3)})`
        : `rgba(8, 6, 16, ${(0.05 + rand() * 0.08).toFixed(3)})`;
      aaCtx.fillRect(px, py, 2, 2);

      const bv = Math.floor(110 + rand() * 38);
      abCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      abCtx.fillRect(px, py, 2, 2);
    }
  }

  // =========================================================================
  // 2. BURNISHED CHAMPAGNE-BRASS CHRONOS FILIGREE (512x512)
  // =========================================================================
  const [bAlb, baCtx] = makeCanvas(512);
  const [bBmp, bbCtx] = makeCanvas(512);

  if (baCtx && bbCtx) {
    const grad = baCtx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0.0, '#e3c47a');
    grad.addColorStop(0.45, '#be9548');
    grad.addColorStop(0.75, '#e8ce8a');
    grad.addColorStop(1.0, '#a87d38');
    baCtx.fillStyle = grad;
    baCtx.fillRect(0, 0, 512, 512);

    bbCtx.fillStyle = '#808080';
    bbCtx.fillRect(0, 0, 512, 512);

    // Anisotropic horizontal brushed sheen
    for (let y = 0; y < 512; y += 2) {
      const a = 0.04 + rand() * 0.08;
      baCtx.fillStyle = rand() > 0.5 ? `rgba(255,244,210,${a.toFixed(3)})` : `rgba(60,38,10,${a.toFixed(3)})`;
      baCtx.fillRect(0, y, 512, 1);
    }

    // Engraved astrolabe vernier graduation ticks & ornamental bands
    for (let band = 0; band < 4; band++) {
      const y = 32 + band * 128;
      baCtx.fillStyle = 'rgba(48, 30, 10, 0.72)';
      baCtx.fillRect(0, y, 512, 4);
      baCtx.fillRect(0, y + 36, 512, 4);
      bbCtx.fillStyle = '#262626';
      bbCtx.fillRect(0, y, 512, 4);
      bbCtx.fillRect(0, y + 36, 512, 4);

      for (let x = 0; x < 512; x += 16) {
        const tall = x % 64 === 0;
        const h = tall ? 26 : 14;
        baCtx.fillStyle = 'rgba(54, 34, 12, 0.65)';
        baCtx.fillRect(x, y + 6, 2, h);
        bbCtx.fillStyle = '#323232';
        bbCtx.fillRect(x, y + 6, 2, h);
      }
    }
  }

  // =========================================================================
  // 3. TATTERED ABYSSAL-INDIGO CEREMONIAL SHROUD CLOTH (512x512)
  // =========================================================================
  const [cAlb, caCtx] = makeCanvas(512);
  const [cBmp, cbCtx] = makeCanvas(512);

  if (caCtx && cbCtx) {
    const grad = caCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#1c1830');
    grad.addColorStop(0.68, '#261e42');
    grad.addColorStop(0.88, '#3b2460');
    grad.addColorStop(1.0, '#5a2d8c'); // Faint phase-singed violet hem
    caCtx.fillStyle = grad;
    caCtx.fillRect(0, 0, 512, 512);

    cbCtx.fillStyle = '#808080';
    cbCtx.fillRect(0, 0, 512, 512);

    // Fine diagonal twill fabric weave
    for (let y = 0; y < 512; y += 4) {
      caCtx.fillStyle = y % 8 === 0 ? 'rgba(180, 160, 230, 0.06)' : 'rgba(8, 6, 16, 0.16)';
      caCtx.fillRect(0, y, 512, 2);
      cbCtx.fillStyle = y % 8 === 0 ? '#969696' : '#6c6c6c';
      cbCtx.fillRect(0, y, 512, 2);
    }
    for (let x = 0; x < 512; x += 6) {
      caCtx.fillStyle = 'rgba(150, 128, 210, 0.05)';
      caCtx.fillRect(x, 0, 1, 512);
    }

    // Gold ceremonial embroidered geometric hem border near bottom
    caCtx.strokeStyle = 'rgba(222, 184, 102, 0.85)';
    caCtx.lineWidth = 4;
    caCtx.strokeRect(0, 424, 512, 24);
    cbCtx.strokeStyle = '#d4d4d4';
    cbCtx.lineWidth = 4;
    cbCtx.strokeRect(0, 424, 512, 24);

    // Geometric diamond runes along the embroidered band
    caCtx.lineWidth = 2.5;
    for (let x = 16; x < 512; x += 32) {
      caCtx.beginPath();
      caCtx.moveTo(x, 428);
      caCtx.lineTo(x + 10, 436);
      caCtx.lineTo(x, 444);
      caCtx.lineTo(x - 10, 436);
      caCtx.closePath();
      caCtx.stroke();
    }

    // Vertical dimensional wear streaks
    for (let i = 0; i < 42; i++) {
      const sx = rand() * 512;
      const sh = 90 + rand() * 240;
      caCtx.fillStyle = 'rgba(168, 85, 247, 0.12)';
      caCtx.fillRect(sx, 512 - sh, 2 + rand() * 3, sh);
    }
  }

  // =========================================================================
  // 4. HARD-LIGHT PHASE MANTIS BLADE PLASMA TEXTURE (256x512)
  // =========================================================================
  const [mAlb, maCtx] = makeCanvas(256, 512);
  const [mEmi, meCtx] = makeCanvas(256, 512);

  if (maCtx && meCtx) {
    const grad = maCtx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0.0, '#581c87');
    grad.addColorStop(0.32, '#a855f7');
    grad.addColorStop(0.68, '#f0abfc');
    grad.addColorStop(0.9, '#ffffff');
    grad.addColorStop(1.0, '#fdf4ff');
    maCtx.fillStyle = grad;
    maCtx.fillRect(0, 0, 256, 512);

    const eGrad = meCtx.createLinearGradient(0, 0, 256, 0);
    eGrad.addColorStop(0.0, '#3b0764');
    eGrad.addColorStop(0.38, '#9333ea');
    eGrad.addColorStop(0.76, '#e879f9');
    eGrad.addColorStop(0.95, '#ffffff');
    eGrad.addColorStop(1.0, '#ffffff');
    meCtx.fillStyle = eGrad;
    meCtx.fillRect(0, 0, 256, 512);

    // Swept plasma striations along blade edge
    for (let i = 0; i < 36; i++) {
      const y = rand() * 512;
      const h = 4 + rand() * 14;
      meCtx.fillStyle = 'rgba(255, 245, 255, 0.34)';
      meCtx.beginPath();
      meCtx.moveTo(40, y);
      meCtx.lineTo(256, y - 34);
      meCtx.lineTo(256, y - 34 + h);
      meCtx.lineTo(40, y + h);
      meCtx.closePath();
      meCtx.fill();
    }
  }

  // =========================================================================
  // 5. SPATIAL-RIFT HEXAGONAL TELEPORT RING TEXTURE (512x512, alpha)
  // =========================================================================
  const [rMap, rCtx] = makeCanvas(512);
  if (rCtx) {
    rCtx.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;

    // Soft amethyst radial glow ring
    const rad = rCtx.createRadialGradient(cx, cy, 118, cx, cy, 246);
    rad.addColorStop(0.0, 'rgba(192, 132, 252, 0.0)');
    rad.addColorStop(0.42, 'rgba(168, 85, 247, 0.22)');
    rad.addColorStop(0.68, 'rgba(232, 121, 249, 0.82)');
    rad.addColorStop(0.76, 'rgba(255, 244, 255, 0.95)');
    rad.addColorStop(0.84, 'rgba(168, 85, 247, 0.45)');
    rad.addColorStop(1.0, 'rgba(126, 34, 206, 0.0)');
    rCtx.fillStyle = rad;
    rCtx.fillRect(0, 0, 512, 512);

    // Inscribed twin rotated hexagons + golden phase-anchor ticks
    const drawHex = (radius: number, rot: number, stroke: string, width: number) => {
      rCtx.strokeStyle = stroke;
      rCtx.lineWidth = width;
      rCtx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const ang = rot + (i * Math.PI) / 3;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        if (i === 0) rCtx.moveTo(x, y);
        else rCtx.lineTo(x, y);
      }
      rCtx.closePath();
      rCtx.stroke();
    };

    drawHex(212, 0, 'rgba(251, 191, 36, 0.85)', 3.5);
    drawHex(184, Math.PI / 6, 'rgba(240, 171, 252, 0.92)', 4.0);

    // 12 radial vernier phase notches
    rCtx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
    rCtx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI * 2) / 12;
      rCtx.beginPath();
      rCtx.moveTo(cx + Math.cos(ang) * 148, cy + Math.sin(ang) * 148);
      rCtx.lineTo(cx + Math.cos(ang) * 234, cy + Math.sin(ang) * 234);
      rCtx.stroke();
    }
  }

  const obsidianPorcelainAlbedo = toTex(aAlb, 1.5, 1.5, true);
  const obsidianPorcelainBump = toTex(aBmp, 1.5, 1.5, false);
  const obsidianPorcelainRoughness = toTex(aRgh, 1.5, 1.5, false);
  const relicBrassAlbedo = toTex(bAlb, 1.5, 1.5, true);
  const relicBrassBump = toTex(bBmp, 1.5, 1.5, false);
  const shroudClothAlbedo = toTex(cAlb, 1, 1, true);
  const shroudClothBump = toTex(cBmp, 1, 1, false);
  const mantisBladeAlbedo = toTex(mAlb, 1, 1, true);
  const mantisBladeEmissive = toTex(mEmi, 1, 1, true);
  const riftPortalMap = toTex(rMap, 1, 1, true);
  riftPortalMap.wrapS = THREE.ClampToEdgeWrapping;
  riftPortalMap.wrapT = THREE.ClampToEdgeWrapping;

  const all: THREE.Texture[] = [
    obsidianPorcelainAlbedo,
    obsidianPorcelainBump,
    obsidianPorcelainRoughness,
    relicBrassAlbedo,
    relicBrassBump,
    shroudClothAlbedo,
    shroudClothBump,
    mantisBladeAlbedo,
    mantisBladeEmissive,
    riftPortalMap,
  ];

  return {
    obsidianPorcelainAlbedo,
    obsidianPorcelainBump,
    obsidianPorcelainRoughness,
    relicBrassAlbedo,
    relicBrassBump,
    shroudClothAlbedo,
    shroudClothBump,
    mantisBladeAlbedo,
    mantisBladeEmissive,
    riftPortalMap,
    dispose() {
      for (const t of all) t.dispose();
    },
  };
}
