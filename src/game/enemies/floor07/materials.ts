import * as THREE from 'three';
import { createEnemyPbrTextureSuite } from '../core/enemyTextures';

export interface Floor07EnemyMaterials {
  /** Industrial cobalt-slate exo-ceramic armor */
  cobaltArmor: THREE.MeshStandardMaterial;
  /** Weathered desert-titanium bronze plating */
  titaniumBronze: THREE.MeshStandardMaterial;
  /** Heavy dark gunmetal chassis / walker hull */
  gunmetalHull: THREE.MeshStandardMaterial;
  /** Hazard-amber / safety-orange industrial accent stripes */
  hazardOrange: THREE.MeshStandardMaterial;
  /** Matte olive-charcoal ballistic undersuit */
  exoUndersuit: THREE.MeshStandardMaterial;
  /** Brushed hydraulic chrome / steel joint pistons */
  hydraulicSteel: THREE.MeshStandardMaterial;
  /** Dark machined weapon receiver metal */
  ordnanceMetal: THREE.MeshStandardMaterial;
  /** Bright electric-cyan optical visor & rail-laser accent */
  opticCyan: THREE.MeshStandardMaterial;
  /** Incandescent amber-gold tactical visor */
  opticAmber: THREE.MeshStandardMaterial;
  /** Crimson-orange thermal vent / lance plasma blade */
  plasmaBlade: THREE.MeshStandardMaterial;
  /** Semi-translucent active-camo shimmer cloak material (Stalker-Sniper) */
  camoCloak: THREE.MeshPhysicalMaterial;
  /** Grounded contact shadow material */
  contactShadow: THREE.MeshBasicMaterial;
  /** Create a unique per-instance emissive weakpoint material */
  createWeakpointMaterial: (colorHex: number, emissiveIntensity?: number) => THREE.MeshStandardMaterial;
  /** Create a unique cloneable flash armor material per enemy instance */
  createFlashArmorMaterial: (baseHex: number, metalness?: number, roughness?: number) => THREE.MeshStandardMaterial;
  dispose: () => void;
}

function createF7ContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.64)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.30)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function createF7IndustrialAlbedoTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#dce2e8';
    ctx.fillRect(0, 0, 256, 256);
    // Subtle industrial panel seams & rivet weathering
    ctx.strokeStyle = 'rgba(30, 40, 52, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 248);
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 244, 244);

    let seed = 7071;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 180; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const r = 3 + rand() * 14;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(35,45,58,0.06)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Distinct Floor 07 Apex Exo-Mercenary & Siege-Walker PBR material suite.
 * Visually unmistakable from Floor 08: cobalt-slate & titanium-bronze industrial exo-armor,
 * hazard-amber logistics stripes, electric-cyan optics, and heavy gunmetal siege plating.
 */
export function createFloor07EnemyMaterials(): Floor07EnemyMaterials {
  const pbr = createEnemyPbrTextureSuite();
  const f7PlateAlbedo = createF7IndustrialAlbedoTexture();
  const shadowTex = createF7ContactShadowTexture();
  const owned: THREE.Material[] = [];

  const track = <T extends THREE.Material>(mat: T): T => {
    owned.push(mat);
    return mat;
  };

  const cobaltArmor = track(
    new THREE.MeshStandardMaterial({
      color: 0x45668a,
      map: f7PlateAlbedo,
      bumpMap: pbr.armorBump,
      bumpScale: 0.018,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.64,
      metalness: 0.34,
    })
  );

  const titaniumBronze = track(
    new THREE.MeshStandardMaterial({
      color: 0xa68c64,
      map: f7PlateAlbedo,
      bumpMap: pbr.armorBump,
      bumpScale: 0.016,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.58,
      metalness: 0.38,
    })
  );

  const gunmetalHull = track(
    new THREE.MeshStandardMaterial({
      color: 0x556476,
      map: f7PlateAlbedo,
      bumpMap: pbr.armorBump,
      bumpScale: 0.022,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.6,
      metalness: 0.38,
    })
  );

  const hazardOrange = track(
    new THREE.MeshStandardMaterial({
      color: 0xe67824,
      bumpMap: pbr.armorBump,
      bumpScale: 0.012,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.48,
      metalness: 0.22,
    })
  );

  const exoUndersuit = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b444e,
      bumpMap: pbr.undersuitBump,
      bumpScale: 0.022,
      roughness: 0.84,
      metalness: 0.12,
    })
  );

  const hydraulicSteel = track(
    new THREE.MeshStandardMaterial({
      color: 0xb0bece,
      bumpMap: pbr.armorBump,
      bumpScale: 0.01,
      roughness: 0.34,
      metalness: 0.52,
    })
  );

  const ordnanceMetal = track(
    new THREE.MeshStandardMaterial({
      color: 0x384350,
      bumpMap: pbr.damascusBump,
      bumpScale: 0.014,
      roughness: 0.48,
      metalness: 0.44,
    })
  );

  const opticCyan = track(
    new THREE.MeshStandardMaterial({
      color: 0x38e8ff,
      emissive: 0x10d8ff,
      emissiveIntensity: 2.5,
      roughness: 0.14,
      metalness: 0.18,
    })
  );

  const opticAmber = track(
    new THREE.MeshStandardMaterial({
      color: 0xffb838,
      emissive: 0xff8c12,
      emissiveIntensity: 2.4,
      roughness: 0.15,
      metalness: 0.18,
    })
  );

  const plasmaBlade = track(
    new THREE.MeshStandardMaterial({
      color: 0xff7038,
      emissive: 0xff3c10,
      emissiveIntensity: 3.0,
      roughness: 0.14,
      metalness: 0.2,
    })
  );

  const camoCloak = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x5682a4,
      emissive: 0x185c88,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.88,
      roughness: 0.26,
      metalness: 0.25,
      side: THREE.DoubleSide,
    })
  );

  const contactShadow = track(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );

  const createWeakpointMaterial = (
    colorHex: number,
    emissiveIntensity = 2.4
  ): THREE.MeshStandardMaterial =>
    track(
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity,
        roughness: 0.2,
        metalness: 0.24,
      })
    );

  const createFlashArmorMaterial = (
    baseHex: number,
    metalness = 0.36,
    roughness = 0.58
  ): THREE.MeshStandardMaterial =>
    track(
      new THREE.MeshStandardMaterial({
        color: baseHex,
        emissive: 0xffaa3c,
        emissiveIntensity: 0,
        map: f7PlateAlbedo,
        bumpMap: pbr.armorBump,
        bumpScale: 0.018,
        roughnessMap: pbr.armorRoughness,
        roughness: Math.max(0.45, roughness),
        metalness: Math.min(0.38, metalness),
      })
    );

  return {
    cobaltArmor,
    titaniumBronze,
    gunmetalHull,
    hazardOrange,
    exoUndersuit,
    hydraulicSteel,
    ordnanceMetal,
    opticCyan,
    opticAmber,
    plasmaBlade,
    camoCloak,
    contactShadow,
    createWeakpointMaterial,
    createFlashArmorMaterial,
    dispose: () => {
      pbr.dispose();
      f7PlateAlbedo.dispose();
      shadowTex.dispose();
      for (const m of owned) m.dispose();
    },
  };
}
