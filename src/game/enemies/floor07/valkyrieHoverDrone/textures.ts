import * as THREE from 'three';

export interface ValkyrieDroneTextureSuite {
  hullAlbedo: THREE.CanvasTexture;
  hullBump: THREE.CanvasTexture;
  hullRoughness: THREE.CanvasTexture;
  carbonAlbedo: THREE.CanvasTexture;
  carbonBump: THREE.CanvasTexture;
  jetMetalAlbedo: THREE.CanvasTexture;
  jetMetalBump: THREE.CanvasTexture;
  opticCoreMap: THREE.CanvasTexture;
  plumeGradMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
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
 * Dedicated AAA procedural PBR texture suite for the Floor 07 Valkyrie Hover-Drone:
 * - Satin pearl-titanium & graphite stealth aerospace hull composite with laser-etched seams,
 *   vermilion air-interceptor striping, orientation-agnostic caution chevrons, latches, and rivets.
 * - 2x2 diagonal twill stealth carbon-fiber weave for inner fuselage ribs & turret gimbal.
 * - Heat-blued & soot-streaked machined turbine steel for VTOL ducted fan shrouds & nozzles.
 * - High-contrast dark-sapphire & electric-cyan Optic Gyro-Core concentric aperture reticle.
 * - Smooth vertical alpha-gradient Mach-diamond ion plume texture (dissolves cleanly to 0 at tip!).
 */
export function createValkyrieDroneTextures(): ValkyrieDroneTextureSuite {
  let seed = 74189;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 1. Satin Pearl-Titanium & Stealth Graphite Aerospace Composite Hull (512x512)
  const [hAlb, aCtx] = makeCanvas(512);
  const [hBmp, bCtx] = makeCanvas(512);
  const [hRgh, rCtx] = makeCanvas(512);

  if (aCtx && bCtx && rCtx) {
    const grad = aCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#d2dae3');
    grad.addColorStop(0.47, '#b4beca');
    grad.addColorStop(0.51, '#5c6776');
    grad.addColorStop(1, '#434d5b');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 512, 512);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    // Satin painted aerospace composite (~0.48 roughness baseline, matte in weathering streaks)
    rCtx.fillStyle = '#7c7c7c';
    rCtx.fillRect(0, 0, 512, 512);

    // High-visibility international aerospace vermilion interceptor accent band + twin graphite pinstripes
    aCtx.fillStyle = '#df4820';
    aCtx.fillRect(0, 224, 512, 24);
    aCtx.fillStyle = '#1f252e';
    aCtx.fillRect(0, 248, 512, 11);
    aCtx.fillStyle = '#edf2f7';
    aCtx.fillRect(0, 219, 512, 5);

    // Subtle micro-pitting, dust weathering & high-altitude aerodynamic streaks
    for (let i = 0; i < 460; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const len = 14 + rand() * 68;
      const dark = rand() > 0.45;
      aCtx.fillStyle = dark ? 'rgba(18, 24, 32, 0.08)' : 'rgba(242, 248, 255, 0.09)';
      aCtx.fillRect(x, y, 2.2, len);
      rCtx.fillStyle = dark ? 'rgba(198,198,198,0.16)' : 'rgba(84,84,84,0.12)';
      rCtx.fillRect(x, y, 2.5, len);
    }

    // Precision laser-etched stealth panel seams
    const drawSeam = (x1: number, y1: number, x2: number, y2: number) => {
      aCtx.strokeStyle = 'rgba(18, 24, 32, 0.75)';
      aCtx.lineWidth = 3.2;
      aCtx.beginPath();
      aCtx.moveTo(x1, y1);
      aCtx.lineTo(x2, y2);
      aCtx.stroke();

      aCtx.strokeStyle = 'rgba(238, 246, 255, 0.36)';
      aCtx.lineWidth = 1.2;
      aCtx.beginPath();
      aCtx.moveTo(x1 + 2, y1 + 2);
      aCtx.lineTo(x2 + 2, y2 + 2);
      aCtx.stroke();

      bCtx.strokeStyle = '#2e2e2e';
      bCtx.lineWidth = 3.8;
      bCtx.beginPath();
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x2, y2);
      bCtx.stroke();

      rCtx.strokeStyle = '#484848';
      rCtx.lineWidth = 2.0;
      rCtx.beginPath();
      rCtx.moveTo(x1, y1);
      rCtx.lineTo(x2, y2);
      rCtx.stroke();
    };

    drawSeam(16, 16, 496, 16);
    drawSeam(16, 496, 496, 496);
    drawSeam(16, 16, 16, 496);
    drawSeam(496, 16, 496, 496);
    drawSeam(16, 132, 496, 132);
    drawSeam(16, 219, 496, 219);
    drawSeam(16, 368, 496, 368);
    drawSeam(256, 16, 256, 496);
    // Angled stealth inspection hatch lines
    drawSeam(112, 132, 148, 219);
    drawSeam(400, 132, 364, 219);

    // Flush aerospace titanium countersunk rivets
    const rivets = [
      [34, 34],
      [238, 34],
      [274, 34],
      [478, 34],
      [34, 114],
      [238, 114],
      [274, 114],
      [478, 114],
      [34, 204],
      [478, 204],
      [34, 350],
      [238, 350],
      [274, 350],
      [478, 350],
      [34, 478],
      [478, 478],
    ];
    for (const [rx, ry] of rivets) {
      aCtx.fillStyle = '#2c3440';
      aCtx.beginPath();
      aCtx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.fillStyle = '#dce5f0';
      aCtx.beginPath();
      aCtx.arc(rx - 0.8, ry - 0.8, 2.2, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = '#343434';
      bCtx.beginPath();
      bCtx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Recessed cooling louvre slots on dark lower hull
    for (let s = 0; s < 5; s++) {
      const sy = 392 + s * 16;
      aCtx.fillStyle = '#1b2129';
      aCtx.fillRect(58, sy, 142, 7);
      aCtx.fillRect(312, sy, 142, 7);
      bCtx.fillStyle = '#202020';
      bCtx.fillRect(58, sy, 142, 7);
      bCtx.fillRect(312, sy, 142, 7);
    }

    // Orientation-agnostic aviation tactical detail bands (zero upside-down or mirrored text!)
    // Upper titanium hatch latches & vermilion chevron hashes
    for (let k = 0; k < 4; k++) {
      const lx = 54 + k * 42;
      aCtx.fillStyle = '#2b3340';
      aCtx.fillRect(lx, 56, 22, 10);
      aCtx.fillStyle = '#df4820';
      aCtx.fillRect(lx + 4, 59, 14, 4);
      bCtx.fillStyle = '#3c3c3c';
      bCtx.fillRect(lx, 56, 22, 10);
    }
    // Right upper bay precision telemetry hash ticks & inspection access cap
    for (let h = 0; h < 12; h++) {
      aCtx.fillStyle = h % 3 === 0 ? '#df4820' : '#2a323e';
      aCtx.fillRect(284 + h * 15, 58, 8, h % 3 === 0 ? 18 : 11);
    }
    // Lower graphite nacelle diagonal hazard chevron ticks (crisp from any wrap angle!)
    for (let c = 0; c < 6; c++) {
      const cx = 56 + c * 26;
      aCtx.fillStyle = 'rgba(223, 72, 32, 0.85)';
      aCtx.beginPath();
      aCtx.moveTo(cx, 294);
      aCtx.lineTo(cx + 12, 294);
      aCtx.lineTo(cx + 20, 314);
      aCtx.lineTo(cx + 8, 314);
      aCtx.closePath();
      aCtx.fill();

      const rx = 304 + c * 26;
      aCtx.fillStyle = 'rgba(218, 228, 240, 0.55)';
      aCtx.beginPath();
      aCtx.moveTo(rx, 294);
      aCtx.lineTo(rx + 12, 294);
      aCtx.lineTo(rx + 4, 314);
      aCtx.lineTo(rx - 8, 314);
      aCtx.closePath();
      aCtx.fill();
    }
  }

  // 2. 2x2 Diagonal Twill Stealth Carbon-Fiber Weave (256x256)
  const [cAlb, caCtx] = makeCanvas(256);
  const [cBmp, cbCtx] = makeCanvas(256);
  if (caCtx && cbCtx) {
    caCtx.fillStyle = '#242a33';
    caCtx.fillRect(0, 0, 256, 256);
    cbCtx.fillStyle = '#707070';
    cbCtx.fillRect(0, 0, 256, 256);

    const cell = 8;
    for (let y = 0; y < 256; y += cell) {
      for (let x = 0; x < 256; x += cell) {
        const diag = ((x / cell) + (y / cell)) % 4;
        const bright = diag < 2;
        caCtx.fillStyle = bright ? '#38414e' : '#1d222a';
        caCtx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        cbCtx.fillStyle = bright ? '#a8a8a8' : '#585858';
        cbCtx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      }
    }
  }

  // 3. Heat-Blued & Soot-Streaked Machined Turbine Titanium (256x256)
  const [jAlb, jaCtx] = makeCanvas(256);
  const [jBmp, jbCtx] = makeCanvas(256);
  if (jaCtx && jbCtx) {
    const jGrad = jaCtx.createLinearGradient(0, 0, 0, 256);
    jGrad.addColorStop(0, '#6a7582');
    jGrad.addColorStop(0.55, '#4b5564');
    jGrad.addColorStop(0.8, '#3f4968'); // subtle titanium heat-bluing tint near exhaust!
    jGrad.addColorStop(1, '#262930');   // exhaust carbon soot rim
    jaCtx.fillStyle = jGrad;
    jaCtx.fillRect(0, 0, 256, 256);

    jbCtx.fillStyle = '#808080';
    jbCtx.fillRect(0, 0, 256, 256);

    // Lathe-turned circumferential brushed machining grooves
    for (let i = 0; i < 240; i++) {
      const y = rand() * 256;
      const bright = rand() > 0.5;
      jaCtx.fillStyle = bright ? 'rgba(220, 232, 245, 0.1)' : 'rgba(14, 16, 20, 0.14)';
      jaCtx.fillRect(0, y, 256, 1.4);
      jbCtx.fillStyle = bright ? 'rgba(180,180,180,0.2)' : 'rgba(84,84,84,0.2)';
      jbCtx.fillRect(0, y, 256, 1.4);
    }
  }

  // 4. High-Contrast Sapphire-Obsidian & Electric-Cyan Optic Gyro-Core Aperture Lens (256x256)
  const [oCanvas, oCtx] = makeCanvas(256);
  if (oCtx) {
    // Deep sapphire optical glass base so reticle rings pop razor-sharp instead of washing out!
    const oGrad = oCtx.createRadialGradient(128, 128, 6, 128, 128, 126);
    oGrad.addColorStop(0, '#ffffff');
    oGrad.addColorStop(0.16, '#84f6ff');
    oGrad.addColorStop(0.32, '#10b8f0');
    oGrad.addColorStop(0.54, '#084c78');
    oGrad.addColorStop(0.76, '#04223a');
    oGrad.addColorStop(1, '#02101e');
    oCtx.fillStyle = oGrad;
    oCtx.fillRect(0, 0, 256, 256);

    // Crisp glowing cyan segmented optical rings
    oCtx.strokeStyle = '#38eeff';
    oCtx.lineWidth = 4.5;
    for (const [r, segs] of [
      [50, 4],
      [78, 8],
      [104, 12],
    ] as const) {
      const step = (Math.PI * 2) / segs;
      for (let i = 0; i < segs; i++) {
        oCtx.beginPath();
        oCtx.arc(128, 128, r, i * step + 0.08, (i + 1) * step - 0.14);
        oCtx.stroke();
      }
    }

    // Dark precision shutter baffle lines & fine crosshair ticks
    oCtx.strokeStyle = 'rgba(2, 14, 26, 0.85)';
    oCtx.lineWidth = 3;
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      oCtx.beginPath();
      oCtx.moveTo(128 + Math.cos(ang) * 28, 128 + Math.sin(ang) * 28);
      oCtx.lineTo(128 + Math.cos(ang) * 120, 128 + Math.sin(ang) * 120);
      oCtx.stroke();
    }

    // Inner vermilion laser-rangefinder micro-ticks on horizontal axis
    oCtx.strokeStyle = '#ff5a2a';
    oCtx.lineWidth = 3.5;
    for (const s of [-1, 1]) {
      oCtx.beginPath();
      oCtx.moveTo(128 + s * 34, 128);
      oCtx.lineTo(128 + s * 66, 128);
      oCtx.stroke();
    }
  }

  // 5. Smooth Alpha-Gradient Mach-Diamond Ion Thruster Plume Texture (128x256)
  // ConeGeometry maps v=1 (canvas top y=0) to apex tip and v=0 (canvas bottom y=256) to nozzle base!
  const [pCanvas, pCtx] = makeCanvas(128, 256);
  if (pCtx) {
    pCtx.clearRect(0, 0, 128, 256);
    const pGrad = pCtx.createLinearGradient(0, 0, 0, 256);
    pGrad.addColorStop(0.0, 'rgba(10, 190, 255, 0.0)');
    pGrad.addColorStop(0.22, 'rgba(18, 210, 255, 0.12)');
    pGrad.addColorStop(0.55, 'rgba(42, 228, 255, 0.44)');
    pGrad.addColorStop(0.84, 'rgba(155, 248, 255, 0.82)');
    pGrad.addColorStop(1.0, 'rgba(235, 254, 255, 0.96)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 128, 256);

    // Subtle Mach shock diamond bright rings near the nozzle exit
    for (const [my, alpha, h] of [
      [196, 0.45, 16],
      [154, 0.28, 12],
      [118, 0.15, 10],
    ] as const) {
      const mGrad = pCtx.createLinearGradient(0, my - h, 0, my + h);
      mGrad.addColorStop(0, 'rgba(190, 252, 255, 0)');
      mGrad.addColorStop(0.5, `rgba(215, 254, 255, ${alpha})`);
      mGrad.addColorStop(1, 'rgba(190, 252, 255, 0)');
      pCtx.fillStyle = mGrad;
      pCtx.fillRect(0, my - h, 128, h * 2);
    }
  }

  const hullAlbedo = toTex(hAlb, 1, 1, true);
  const hullBump = toTex(hBmp, 1, 1, false);
  const hullRoughness = toTex(hRgh, 1, 1, false);
  const carbonAlbedo = toTex(cAlb, 3, 3, true);
  const carbonBump = toTex(cBmp, 3, 3, false);
  const jetMetalAlbedo = toTex(jAlb, 1, 1, true);
  const jetMetalBump = toTex(jBmp, 1, 1, false);
  const opticCoreMap = toTex(oCanvas, 1, 1, true);
  const plumeGradMap = new THREE.CanvasTexture(pCanvas);
  plumeGradMap.wrapS = THREE.RepeatWrapping;
  plumeGradMap.wrapT = THREE.ClampToEdgeWrapping;
  plumeGradMap.colorSpace = THREE.SRGBColorSpace;

  return {
    hullAlbedo,
    hullBump,
    hullRoughness,
    carbonAlbedo,
    carbonBump,
    jetMetalAlbedo,
    jetMetalBump,
    opticCoreMap,
    plumeGradMap,
    dispose: () => {
      hullAlbedo.dispose();
      hullBump.dispose();
      hullRoughness.dispose();
      carbonAlbedo.dispose();
      carbonBump.dispose();
      jetMetalAlbedo.dispose();
      jetMetalBump.dispose();
      opticCoreMap.dispose();
      plumeGradMap.dispose();
    },
  };
}
