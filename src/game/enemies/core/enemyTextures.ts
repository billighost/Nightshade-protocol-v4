import * as THREE from 'three';

export interface EnemyPbrTextureSuite {
  armorAlbedo: THREE.CanvasTexture;
  armorBump: THREE.CanvasTexture;
  armorRoughness: THREE.CanvasTexture;
  undersuitAlbedo: THREE.CanvasTexture;
  undersuitBump: THREE.CanvasTexture;
  damascusAlbedo: THREE.CanvasTexture;
  damascusBump: THREE.CanvasTexture;
  hiltWrapAlbedo: THREE.CanvasTexture;
  hiltWrapBump: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')];
}

function finalizeTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates high-resolution procedural PBR maps (Albedo + Bump + Roughness) so enemy armor,
 * ribbed synth-muscle undersuits, folded Damascus katanas, and diamond-wrapped samurai hilts
 * read as weathered, matte, battle-worn AAA materials rather than flat shiny plastic!
 */
export function createEnemyPbrTextureSuite(): EnemyPbrTextureSuite {
  // 1. Weathered Matte Ballistic Ceramic-Carbon Armor (512x512 Albedo + Bump + Roughness)
  const [aCanvas, aCtx] = makeCanvas(512);
  const [bCanvas, bCtx] = makeCanvas(512);
  const [rCanvas, rCtx] = makeCanvas(512);

  if (aCtx && bCtx && rCtx) {
    // Base matte ballistic charcoal-slate
    aCtx.fillStyle = '#242b35';
    aCtx.fillRect(0, 0, 512, 512);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);
    // Matte ceramic baseline roughness (~0.74 => RGB 188) — zero glossy plastic sheen!
    rCtx.fillStyle = '#bcbcbc';
    rCtx.fillRect(0, 0, 512, 512);

    // Subtle micro-carbon diagonal twill weave
    for (let y = 0; y < 512; y += 8) {
      for (let x = 0; x < 512; x += 8) {
        const shift = ((x + y) % 16 === 0) ? 1 : 0;
        aCtx.fillStyle = shift ? 'rgba(255,255,255,0.032)' : 'rgba(0,0,0,0.08)';
        aCtx.fillRect(x, y, 6, 4);
        bCtx.fillStyle = shift ? '#8e8e8e' : '#727272';
        bCtx.fillRect(x, y, 6, 4);
      }
    }

    // Subtle tactical weathering mottling (grime & matte ceramic oxidation)
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 420; i++) {
      const gx = rand() * 512;
      const gy = rand() * 512;
      const gr = 6 + rand() * 24;
      const dark = rand() > 0.45;
      aCtx.fillStyle = dark ? 'rgba(8,10,14,0.09)' : 'rgba(130,145,165,0.045)';
      aCtx.beginPath();
      aCtx.arc(gx, gy, gr, 0, Math.PI * 2);
      aCtx.fill();
      rCtx.fillStyle = dark ? 'rgba(225,225,225,0.16)' : 'rgba(155,155,155,0.12)';
      rCtx.beginPath();
      rCtx.arc(gx, gy, gr, 0, Math.PI * 2);
      rCtx.fill();
    }

    // Precision armored panel seam lines, beveled chamfers & recessed hex rivets
    const drawSeam = (x1: number, y1: number, x2: number, y2: number) => {
      aCtx.strokeStyle = 'rgba(5,7,10,0.72)';
      aCtx.lineWidth = 4;
      aCtx.beginPath();
      aCtx.moveTo(x1, y1);
      aCtx.lineTo(x2, y2);
      aCtx.stroke();

      // Subtle chipped metallic bevel edge highlight along panel lip
      aCtx.strokeStyle = 'rgba(180,196,214,0.18)';
      aCtx.lineWidth = 1.5;
      aCtx.beginPath();
      aCtx.moveTo(x1 + 2, y1 + 2);
      aCtx.lineTo(x2 + 2, y2 + 2);
      aCtx.stroke();

      bCtx.strokeStyle = '#303030';
      bCtx.lineWidth = 4;
      bCtx.beginPath();
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x2, y2);
      bCtx.stroke();

      rCtx.strokeStyle = '#686868';
      rCtx.lineWidth = 2;
      rCtx.beginPath();
      rCtx.moveTo(x1 + 2, y1 + 2);
      rCtx.lineTo(x2 + 2, y2 + 2);
      rCtx.stroke();
    };

    drawSeam(18, 18, 494, 18);
    drawSeam(18, 494, 494, 494);
    drawSeam(18, 18, 18, 494);
    drawSeam(494, 18, 494, 494);
    drawSeam(18, 256, 494, 256);
    drawSeam(256, 18, 256, 256);
    drawSeam(18, 384, 340, 384);
    drawSeam(340, 256, 340, 494);

    // Recessed hex armor bolts
    const bolts = [
      [38, 38], [236, 38], [276, 38], [474, 38],
      [38, 236], [236, 236], [276, 236], [474, 236],
      [38, 276], [320, 276], [360, 276], [474, 276],
      [38, 474], [320, 474], [360, 474], [474, 474],
    ];
    for (const [bx, by] of bolts) {
      aCtx.fillStyle = '#0e1218';
      aCtx.beginPath();
      aCtx.arc(bx, by, 5, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.fillStyle = '#526072';
      aCtx.beginPath();
      aCtx.arc(bx, by, 2.5, 0, Math.PI * 2);
      aCtx.fill();
      bCtx.fillStyle = '#202020';
      bCtx.beginPath();
      bCtx.arc(bx, by, 5, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#b8b8b8';
      bCtx.beginPath();
      bCtx.arc(bx, by, 2.5, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Fine battle-wear micro-scratches (lower roughness on bare exposed steel scratches!)
    for (let i = 0; i < 65; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const ang = rand() * Math.PI * 2;
      const len = 8 + rand() * 34;
      aCtx.strokeStyle = 'rgba(175,190,210,0.16)';
      aCtx.lineWidth = 1;
      aCtx.beginPath();
      aCtx.moveTo(sx, sy);
      aCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      aCtx.stroke();

      rCtx.strokeStyle = '#5a5a5a';
      rCtx.lineWidth = 1.4;
      rCtx.beginPath();
      rCtx.moveTo(sx, sy);
      rCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      rCtx.stroke();
    }
  }

  // 2. Ribbed Matte Synth-Muscle Ballistic Undersuit (256x256 Albedo + Bump)
  const [uCanvas, uCtx] = makeCanvas(256);
  const [ubCanvas, ubCtx] = makeCanvas(256);
  if (uCtx && ubCtx) {
    uCtx.fillStyle = '#11151c';
    uCtx.fillRect(0, 0, 256, 256);
    ubCtx.fillStyle = '#505050';
    ubCtx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 10) {
      // Ribbed ballistic muscle bundle strips
      uCtx.fillStyle = '#1b212c';
      uCtx.fillRect(0, y, 256, 5);
      uCtx.fillStyle = '#090c11';
      uCtx.fillRect(0, y + 6, 256, 3);

      ubCtx.fillStyle = '#c8c8c8';
      ubCtx.fillRect(0, y, 256, 5);
      ubCtx.fillStyle = '#222222';
      ubCtx.fillRect(0, y + 6, 256, 3);
    }
    // Cross-stitch micro mesh
    uCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    uCtx.lineWidth = 1;
    for (let x = 0; x < 256; x += 6) {
      uCtx.beginPath();
      uCtx.moveTo(x, 0);
      uCtx.lineTo(x, 256);
      uCtx.stroke();
    }
  }

  // 3. Folded Dark Damascus Cyber-Katana Steel (256x256 Albedo + Bump)
  const [dCanvas, dCtx] = makeCanvas(256);
  const [dbCanvas, dbCtx] = makeCanvas(256);
  if (dCtx && dbCtx) {
    dCtx.fillStyle = '#2a323e';
    dCtx.fillRect(0, 0, 256, 256);
    dbCtx.fillStyle = '#808080';
    dbCtx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 42; i++) {
      const yBase = (i / 42) * 256;
      dCtx.strokeStyle = i % 2 === 0 ? 'rgba(195,212,232,0.16)' : 'rgba(12,16,22,0.28)';
      dCtx.lineWidth = 2.4;
      dCtx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const y = yBase + Math.sin(x * 0.055 + i * 0.7) * 5.5 + Math.cos(x * 0.12 - i) * 2.5;
        if (x === 0) dCtx.moveTo(x, y);
        else dCtx.lineTo(x, y);
      }
      dCtx.stroke();

      dbCtx.strokeStyle = i % 2 === 0 ? '#a4a4a4' : '#5e5e5e';
      dbCtx.lineWidth = 2;
      dbCtx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const y = yBase + Math.sin(x * 0.055 + i * 0.7) * 5.5;
        if (x === 0) dbCtx.moveTo(x, y);
        else dbCtx.lineTo(x, y);
      }
      dbCtx.stroke();
    }
  }

  // 4. Traditional Diamond-Wrap Cyber-Katana Tsuka-Maki Hilt Texture (256x256)
  const [hCanvas, hCtx] = makeCanvas(256);
  const [hbCanvas, hbCtx] = makeCanvas(256);
  if (hCtx && hbCtx) {
    // Deep crimson ray-skin samegawa underlayer
    hCtx.fillStyle = '#5c121e';
    hCtx.fillRect(0, 0, 256, 256);
    hbCtx.fillStyle = '#383838';
    hbCtx.fillRect(0, 0, 256, 256);

    // Matte obsidian braided ito wrap crossing in crisp diamonds
    hCtx.strokeStyle = '#12151b';
    hCtx.lineWidth = 18;
    hbCtx.strokeStyle = '#d4d4d4';
    hbCtx.lineWidth = 18;
    for (let i = -256; i <= 512; i += 44) {
      hCtx.beginPath();
      hCtx.moveTo(i, 0);
      hCtx.lineTo(i + 256, 256);
      hCtx.moveTo(i + 256, 0);
      hCtx.lineTo(i, 256);
      hCtx.stroke();

      hbCtx.beginPath();
      hbCtx.moveTo(i, 0);
      hbCtx.lineTo(i + 256, 256);
      hbCtx.moveTo(i + 256, 0);
      hbCtx.lineTo(i, 256);
      hbCtx.stroke();
    }
  }

  const armorAlbedo = finalizeTex(aCanvas, 2, 2, true);
  const armorBump = finalizeTex(bCanvas, 2, 2, false);
  const armorRoughness = finalizeTex(rCanvas, 2, 2, false);
  const undersuitAlbedo = finalizeTex(uCanvas, 3, 4, true);
  const undersuitBump = finalizeTex(ubCanvas, 3, 4, false);
  const damascusAlbedo = finalizeTex(dCanvas, 2, 3, true);
  const damascusBump = finalizeTex(dbCanvas, 2, 3, false);
  const hiltWrapAlbedo = finalizeTex(hCanvas, 2, 4, true);
  const hiltWrapBump = finalizeTex(hbCanvas, 2, 4, false);

  return {
    armorAlbedo,
    armorBump,
    armorRoughness,
    undersuitAlbedo,
    undersuitBump,
    damascusAlbedo,
    damascusBump,
    hiltWrapAlbedo,
    hiltWrapBump,
    dispose: () => {
      armorAlbedo.dispose();
      armorBump.dispose();
      armorRoughness.dispose();
      undersuitAlbedo.dispose();
      undersuitBump.dispose();
      damascusAlbedo.dispose();
      damascusBump.dispose();
      hiltWrapAlbedo.dispose();
      hiltWrapBump.dispose();
    },
  };
}
