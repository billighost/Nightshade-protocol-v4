import * as THREE from 'three';

export interface Floor05EnemyMaterials {
  /** Forged battle-scarred arena bronze-iron plate with riveted gladiator seams */
  gladiatorIron: THREE.MeshStandardMaterial;
  /** Dark anodized arena obsidian-steel chassis & armor trim */
  arenaObsidianSteel: THREE.MeshStandardMaterial;
  /** Rich crimson-enameled war-games coliseum livery plate */
  crimsonEnamel: THREE.MeshStandardMaterial;
  /** Burnished imperial arena bronze / gold crest metal */
  arenaBronze: THREE.MeshStandardMaterial;
  /** Matte segmented dark chitin carapace (Leaping Carapace Stalker & Acid Wyvern) */
  predatorChitin: THREE.MeshStandardMaterial;
  /** Ribbed matte tactical leather/synth-muscle undersuit */
  gladiatorUndersuit: THREE.MeshStandardMaterial;
  /** Heavy machined gunmetal servo joints & weapon barrels */
  gunmetalJoint: THREE.MeshStandardMaterial;
  /** Bright honed crucible steel for blades, spears & cleavers */
  crucibleSteel: THREE.MeshStandardMaterial;
  /** Luminous plasma-gold energy spear & crest glow */
  plasmaGoldGlow: THREE.MeshStandardMaterial;
  /** Molten forge crimson-orange glow (Executioner & Marauder war-axe) */
  moltenCrimsonGlow: THREE.MeshStandardMaterial;
  /** High-voltage electric snare cyan glow (Arena Net-Shooter) */
  snareCyanGlow: THREE.MeshStandardMaterial;
  /** Corrosive bioluminescent acid-emerald glow (Carapace Stalker & Acid Wyvern) */
  acidEmeraldGlow: THREE.MeshStandardMaterial;
  /** Translucent hexagonal gladiator energy shield / aegis buckler */
  gladiatorAegisShield: THREE.MeshPhysicalMaterial;
  /** Invisible hitbox material */
  hitboxInvisible: THREE.MeshBasicMaterial;
  /** Grounded radial contact shadow disc */
  shadowDisc: THREE.MeshBasicMaterial;
  /** Shared procedural PBR maps tracked for clean disposal */
  textures: THREE.Texture[];
  /** Per-instance weakpoint material factory so every hostile pulses independently */
  createWeakpointMaterial: (colorHex: number, emissiveHex?: number) => THREE.MeshStandardMaterial;
  /** Per-instance flashable armor material factory for crisp hit feedback */
  createFlashArmorMaterial: (
    baseColorHex: number,
    metalness?: number,
    roughness?: number,
    pattern?: 'gladiator' | 'chitin' | 'none'
  ) => THREE.MeshStandardMaterial;
  dispose: () => void;
}

function createGladiatorArmorTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext('2d')!;

  // Brushed forged metal base luminance (neutral-bright so tinting preserves specular richness)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#c6ccd6');
  grad.addColorStop(0.5, '#9aa3b2');
  grad.addColorStop(1, '#cfd5de');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  // Brushed metallic grain streaks
  let seed = 5051;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 480; i++) {
    const y = Math.floor(rand() * size);
    const x = Math.floor(rand() * size);
    const len = 18 + Math.floor(rand() * 58);
    const bright = rand() > 0.5;
    ctx.fillStyle = bright ? 'rgba(255,255,255,0.065)' : 'rgba(18,22,28,0.08)';
    ctx.fillRect(x, y, len, 1);
    bctx.fillStyle = bright ? 'rgba(165,165,165,0.22)' : 'rgba(90,90,90,0.22)';
    bctx.fillRect(x, y, len, 1);
  }

  // Gladiator overlapping lamellar armor plate seams & hex rivets
  for (let y = 0; y < size; y += 64) {
    ctx.fillStyle = 'rgba(20, 22, 28, 0.72)';
    ctx.fillRect(0, y, size, 3);
    ctx.fillStyle = 'rgba(248, 240, 220, 0.34)';
    ctx.fillRect(0, y + 3, size, 2);

    bctx.fillStyle = '#282828';
    bctx.fillRect(0, y, size, 3);
    bctx.fillStyle = '#d4d4d4';
    bctx.fillRect(0, y + 3, size, 2);

    for (let x = 16; x < size; x += 32) {
      ctx.fillStyle = 'rgba(30, 32, 38, 0.75)';
      ctx.beginPath();
      ctx.arc(x, y + 12, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240, 232, 214, 0.65)';
      ctx.beginPath();
      ctx.arc(x - 0.8, y + 11.2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      bctx.fillStyle = '#e8e8e8';
      bctx.beginPath();
      bctx.arc(x, y + 12, 3.0, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  // Vertical forged plate dividers & battle-scar blade scratches
  for (let x = 0; x < size; x += 128) {
    ctx.fillStyle = 'rgba(18, 20, 26, 0.65)';
    ctx.fillRect(x, 0, 3, size);
    bctx.fillStyle = '#303030';
    bctx.fillRect(x, 0, 3, size);
  }

  // Battle-scratched diagonal combat scores
  for (let i = 0; i < 24; i++) {
    const sx = rand() * size;
    const sy = rand() * size;
    const ang = -0.5 + rand() * 1.0;
    const len = 14 + rand() * 34;
    ctx.strokeStyle = 'rgba(245, 245, 250, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();

    bctx.strokeStyle = '#3a3a3a';
    bctx.lineWidth = 1.4;
    bctx.beginPath();
    bctx.moveTo(sx, sy);
    bctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    bctx.stroke();
  }

  const map = new THREE.CanvasTexture(albedo);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

function createChitinCarapaceTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext('2d')!;

  ctx.fillStyle = '#7e8a92';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#707070';
  bctx.fillRect(0, 0, size, size);

  // Overlapping organic hex/chevron predator carapace scales
  const rowH = 24;
  const colW = 32;
  for (let row = 0; row < size / rowH + 2; row++) {
    const y = row * rowH;
    const xOff = (row % 2) * (colW * 0.5);
    for (let col = -1; col < size / colW + 2; col++) {
      const x = col * colW + xOff;
      const g = ctx.createLinearGradient(x, y, x, y + rowH);
      g.addColorStop(0, '#9eb0b8');
      g.addColorStop(0.6, '#6e7e88');
      g.addColorStop(1, '#3f4b52');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + colW * 0.5, y + rowH * 0.85);
      ctx.lineTo(x + colW, y);
      ctx.lineTo(x + colW * 0.5, y - rowH * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(18, 28, 30, 0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();

      bctx.fillStyle = '#b8b8b8';
      bctx.beginPath();
      bctx.moveTo(x + 3, y + 2);
      bctx.lineTo(x + colW * 0.5, y + rowH * 0.72);
      bctx.lineTo(x + colW - 3, y + 2);
      bctx.closePath();
      bctx.fill();
      bctx.strokeStyle = '#242424';
      bctx.lineWidth = 2.2;
      bctx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(albedo);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bump);
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
  grad.addColorStop(0, 'rgba(0,0,0,0.66)');
  grad.addColorStop(0.56, 'rgba(0,0,0,0.32)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFloor05EnemyMaterials(): Floor05EnemyMaterials {
  const gladiator = createGladiatorArmorTextures();
  const chitin = createChitinCarapaceTextures();
  const shadowTex = createContactShadowTexture();
  const textures: THREE.Texture[] = [
    gladiator.map,
    gladiator.bumpMap,
    chitin.map,
    chitin.bumpMap,
    shadowTex,
  ];

  const gladiatorIron = new THREE.MeshStandardMaterial({
    color: 0x8692a6,
    map: gladiator.map,
    bumpMap: gladiator.bumpMap,
    bumpScale: 0.036,
    metalness: 0.62,
    roughness: 0.36,
  });

  const arenaObsidianSteel = new THREE.MeshStandardMaterial({
    color: 0x5c687c,
    map: gladiator.map,
    bumpMap: gladiator.bumpMap,
    bumpScale: 0.03,
    metalness: 0.56,
    roughness: 0.44,
  });

  const crimsonEnamel = new THREE.MeshStandardMaterial({
    color: 0xc22738,
    map: gladiator.map,
    bumpMap: gladiator.bumpMap,
    bumpScale: 0.024,
    metalness: 0.38,
    roughness: 0.42,
  });

  const arenaBronze = new THREE.MeshStandardMaterial({
    color: 0xe6ad56,
    map: gladiator.map,
    bumpMap: gladiator.bumpMap,
    bumpScale: 0.02,
    metalness: 0.78,
    roughness: 0.28,
  });

  const predatorChitin = new THREE.MeshStandardMaterial({
    color: 0x567c84,
    map: chitin.map,
    bumpMap: chitin.bumpMap,
    bumpScale: 0.048,
    metalness: 0.28,
    roughness: 0.42,
  });

  const gladiatorUndersuit = new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    bumpMap: gladiator.bumpMap,
    bumpScale: 0.018,
    metalness: 0.14,
    roughness: 0.86,
    envMapIntensity: 0.55,
  });

  const gunmetalJoint = new THREE.MeshStandardMaterial({
    color: 0x6a768a,
    metalness: 0.76,
    roughness: 0.32,
  });

  const crucibleSteel = new THREE.MeshStandardMaterial({
    color: 0xd8e2ee,
    map: gladiator.map,
    bumpMap: gladiator.bumpMap,
    bumpScale: 0.015,
    metalness: 0.88,
    roughness: 0.22,
  });

  const plasmaGoldGlow = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.5,
    metalness: 0.16,
    roughness: 0.18,
  });

  const moltenCrimsonGlow = new THREE.MeshStandardMaterial({
    color: 0xff8a65,
    emissive: 0xea2a1e,
    emissiveIntensity: 2.7,
    metalness: 0.14,
    roughness: 0.18,
  });

  const snareCyanGlow = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.45,
    metalness: 0.14,
    roughness: 0.18,
  });

  const acidEmeraldGlow = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x22c55e,
    emissiveIntensity: 2.6,
    metalness: 0.12,
    roughness: 0.18,
  });

  const gladiatorAegisShield = new THREE.MeshPhysicalMaterial({
    color: 0xfb923c,
    emissive: 0xea580c,
    emissiveIntensity: 1.15,
    transparent: true,
    opacity: 0.36,
    roughness: 0.14,
    metalness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
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
    gladiatorIron,
    arenaObsidianSteel,
    crimsonEnamel,
    arenaBronze,
    predatorChitin,
    gladiatorUndersuit,
    gunmetalJoint,
    crucibleSteel,
    plasmaGoldGlow,
    moltenCrimsonGlow,
    snareCyanGlow,
    acidEmeraldGlow,
    gladiatorAegisShield,
    hitboxInvisible,
    shadowDisc,
  ];

  return {
    gladiatorIron,
    arenaObsidianSteel,
    crimsonEnamel,
    arenaBronze,
    predatorChitin,
    gladiatorUndersuit,
    gunmetalJoint,
    crucibleSteel,
    plasmaGoldGlow,
    moltenCrimsonGlow,
    snareCyanGlow,
    acidEmeraldGlow,
    gladiatorAegisShield,
    hitboxInvisible,
    shadowDisc,
    textures,
    createWeakpointMaterial(colorHex: number, emissiveHex = colorHex) {
      return new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: emissiveHex,
        emissiveIntensity: 2.45,
        metalness: 0.18,
        roughness: 0.2,
      });
    },
    createFlashArmorMaterial(
      baseColorHex: number,
      metalness = 0.48,
      roughness = 0.46,
      pattern: 'gladiator' | 'chitin' | 'none' = 'gladiator'
    ) {
      const texSet = pattern === 'chitin' ? chitin : pattern === 'gladiator' ? gladiator : null;
      return new THREE.MeshStandardMaterial({
        color: baseColorHex,
        map: texSet ? texSet.map : null,
        bumpMap: texSet ? texSet.bumpMap : null,
        bumpScale: pattern === 'chitin' ? 0.044 : 0.032,
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
