import * as THREE from 'three';

export interface Floor06EnemyMaterials {
  /** Matte brutalist basalt / obsidian monolith stone with carved geometric strata */
  obsidianStone: THREE.MeshStandardMaterial;
  /** Darker monolithic slate-basalt underframe & skeletal struts */
  basaltUnderframe: THREE.MeshStandardMaterial;
  /** Carved pale ferro-concrete brutalist accent armor */
  brutalistConcrete: THREE.MeshStandardMaterial;
  /** Weathered relic brass / gilded geometric trim inlays */
  relicBrass: THREE.MeshStandardMaterial;
  /** Dark anodized tungsten-gunmetal mechanical joints & weapon rails */
  tungstenJoint: THREE.MeshStandardMaterial;
  /** Translucent faceted dark-quartz crystal prisms */
  quartzCrystal: THREE.MeshStandardMaterial;
  /** Sovereign gilded obsidian armor (Archive Reality-Weaver & Monolith Archon) */
  sovereignObsidian: THREE.MeshStandardMaterial;
  /** Crimson-veined gravity bunker plating (Bunker Gravity-Hound) */
  bunkerPlating: THREE.MeshStandardMaterial;
  /** Luminous astral-violet resonance energy */
  astralVioletGlow: THREE.MeshStandardMaterial;
  /** Luminous cerulean-cyan resonance beam & prism core */
  resonantCyanGlow: THREE.MeshStandardMaterial;
  /** High-alert crimson-gold paranatural danger glow */
  crimsonResonanceGlow: THREE.MeshStandardMaterial;
  /** Molten relic-amber sovereign core glow */
  sovereignGoldGlow: THREE.MeshStandardMaterial;
  /** Invisible hitbox material */
  hitboxInvisible: THREE.MeshBasicMaterial;
  /** Soft circular contact shadow under each construct */
  shadowDisc: THREE.MeshBasicMaterial;
  /** Procedural carved stone & brass textures tracked for disposal */
  textures: THREE.Texture[];
  /** Per-instance weakpoint material factory so each enemy pulses independently */
  createWeakpointMaterial: (colorHex: number, emissiveHex?: number) => THREE.MeshStandardMaterial;
  /** Per-instance armor material factory for hit-flash feedback */
  createFlashArmorMaterial: (
    baseColorHex: number,
    metalness?: number,
    roughness?: number,
    useMonolithMap?: boolean
  ) => THREE.MeshStandardMaterial;
  dispose: () => void;
}

function createMonolithStoneTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const ctx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;

  // Sculpted stone luminance map (neutral-light so multiplying with armor color preserves detail & silhouette contrast)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#9aa6bc');
  grad.addColorStop(0.5, '#7c889e');
  grad.addColorStop(1, '#a4b0c6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  // Brutalist architectural strata seams & geometric bevels
  for (let y = 0; y < size; y += 32) {
    ctx.fillStyle = 'rgba(22, 27, 38, 0.72)';
    ctx.fillRect(0, y, size, 3);
    ctx.fillStyle = 'rgba(215, 228, 250, 0.34)';
    ctx.fillRect(0, y + 3, size, 2);

    bctx.fillStyle = '#303030';
    bctx.fillRect(0, y, size, 3);
    bctx.fillStyle = '#c8c8c8';
    bctx.fillRect(0, y + 3, size, 2);
  }

  // Vertical monolithic slab divisions + subtle carved geometric glyph channels
  for (let x = 0; x < size; x += 64) {
    ctx.fillStyle = 'rgba(20, 24, 34, 0.76)';
    ctx.fillRect(x, 0, 3, size);
    ctx.fillStyle = 'rgba(205, 218, 240, 0.25)';
    ctx.fillRect(x + 3, 0, 1, size);
    bctx.fillStyle = '#2a2a2a';
    bctx.fillRect(x, 0, 3, size);
  }

  // Etched relic-brass geometric chevrons
  ctx.strokeStyle = 'rgba(242, 212, 138, 0.52)';
  ctx.lineWidth = 2.5;
  bctx.strokeStyle = '#dcdcdc';
  bctx.lineWidth = 2.5;
  for (let row = 0; row < 4; row++) {
    const cy = row * 64 + 32;
    ctx.beginPath();
    ctx.moveTo(16, cy - 10);
    ctx.lineTo(32, cy + 8);
    ctx.lineTo(48, cy - 10);
    ctx.moveTo(144, cy + 10);
    ctx.lineTo(160, cy - 8);
    ctx.lineTo(176, cy + 10);
    ctx.stroke();

    bctx.beginPath();
    bctx.moveTo(16, cy - 10);
    bctx.lineTo(32, cy + 8);
    bctx.lineTo(48, cy - 10);
    bctx.moveTo(144, cy + 10);
    bctx.lineTo(160, cy - 8);
    bctx.lineTo(176, cy + 10);
    bctx.stroke();
  }

  // Mineral grain speckle (basalt micro-pitting)
  let seed = 6061;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 1600; i++) {
    const px = Math.floor(rand() * size);
    const py = Math.floor(rand() * size);
    const v = rand() > 0.5 ? 255 : 0;
    const alpha = 0.04 + rand() * 0.06;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha.toFixed(3)})`;
    ctx.fillRect(px, py, 2, 2);

    const bv = Math.floor(104 + rand() * 50);
    bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bctx.fillRect(px, py, 2, 2);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.62)');
  grad.addColorStop(0.58, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFloor06EnemyMaterials(): Floor06EnemyMaterials {
  const { map: monolithMap, bumpMap: monolithBump } = createMonolithStoneTextures();
  const shadowTex = createContactShadowTexture();
  const textures: THREE.Texture[] = [monolithMap, monolithBump, shadowTex];

  const obsidianStone = new THREE.MeshStandardMaterial({
    color: 0x384258,
    map: monolithMap,
    bumpMap: monolithBump,
    bumpScale: 0.045,
    metalness: 0.28,
    roughness: 0.64,
  });

  const basaltUnderframe = new THREE.MeshStandardMaterial({
    color: 0x262d3c,
    bumpMap: monolithBump,
    bumpScale: 0.035,
    metalness: 0.44,
    roughness: 0.56,
  });

  const brutalistConcrete = new THREE.MeshStandardMaterial({
    color: 0x6b7485,
    bumpMap: monolithBump,
    bumpScale: 0.035,
    metalness: 0.16,
    roughness: 0.78,
  });

  const relicBrass = new THREE.MeshStandardMaterial({
    color: 0xd4ad5e,
    metalness: 0.66,
    roughness: 0.28,
  });

  const tungstenJoint = new THREE.MeshStandardMaterial({
    color: 0x353e4e,
    metalness: 0.64,
    roughness: 0.38,
  });

  const quartzCrystal = new THREE.MeshStandardMaterial({
    color: 0x66509e,
    emissive: 0x3b1f7d,
    emissiveIntensity: 0.62,
    metalness: 0.32,
    roughness: 0.22,
  });

  const sovereignObsidian = new THREE.MeshStandardMaterial({
    color: 0x30364a,
    map: monolithMap,
    bumpMap: monolithBump,
    bumpScale: 0.05,
    metalness: 0.4,
    roughness: 0.48,
  });

  const bunkerPlating = new THREE.MeshStandardMaterial({
    color: 0x454c5a,
    map: monolithMap,
    bumpMap: monolithBump,
    bumpScale: 0.045,
    metalness: 0.44,
    roughness: 0.54,
  });

  const astralVioletGlow = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 2.3,
    metalness: 0.12,
    roughness: 0.2,
  });

  const resonantCyanGlow = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.4,
    metalness: 0.12,
    roughness: 0.18,
  });

  const crimsonResonanceGlow = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xdc2626,
    emissiveIntensity: 2.4,
    metalness: 0.15,
    roughness: 0.2,
  });

  const sovereignGoldGlow = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.5,
    metalness: 0.18,
    roughness: 0.18,
  });

  const hitboxInvisible = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const shadowDisc = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });

  const allStatic: THREE.Material[] = [
    obsidianStone,
    basaltUnderframe,
    brutalistConcrete,
    relicBrass,
    tungstenJoint,
    quartzCrystal,
    sovereignObsidian,
    bunkerPlating,
    astralVioletGlow,
    resonantCyanGlow,
    crimsonResonanceGlow,
    sovereignGoldGlow,
    hitboxInvisible,
    shadowDisc,
  ];

  return {
    obsidianStone,
    basaltUnderframe,
    brutalistConcrete,
    relicBrass,
    tungstenJoint,
    quartzCrystal,
    sovereignObsidian,
    bunkerPlating,
    astralVioletGlow,
    resonantCyanGlow,
    crimsonResonanceGlow,
    sovereignGoldGlow,
    hitboxInvisible,
    shadowDisc,
    textures,
    createWeakpointMaterial(colorHex: number, emissiveHex = colorHex) {
      return new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: emissiveHex,
        emissiveIntensity: 2.25,
        metalness: 0.2,
        roughness: 0.22,
      });
    },
    createFlashArmorMaterial(
      baseColorHex: number,
      metalness = 0.34,
      roughness = 0.62,
      useMonolithMap = true
    ) {
      return new THREE.MeshStandardMaterial({
        color: baseColorHex,
        map: useMonolithMap ? monolithMap : null,
        bumpMap: monolithBump,
        bumpScale: 0.04,
        metalness,
        roughness,
        emissive: 0x000000,
        emissiveIntensity: 0,
      });
    },
    dispose() {
      for (const m of allStatic) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
