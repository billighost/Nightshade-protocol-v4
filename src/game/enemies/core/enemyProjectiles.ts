import * as THREE from 'three';
import type { CollisionWorld3D } from '../../arena/hideout/types';
import { raycastCollisionWorld3D, type WorldRaycastHit } from './enemyNav';
import type { EnemyProjectileSpec, EnemyShockwaveSpec } from './types';

interface PooledProjectile {
  active: boolean;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  auraMesh: THREE.Mesh;
  auraMat: THREE.MeshBasicMaterial;
  trailMesh: THREE.Mesh;
  trailMat: THREE.MeshBasicMaterial;
  telegraphRing: THREE.Mesh;
  telegraphMat: THREE.MeshBasicMaterial;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  vel: THREE.Vector3;
  origin: THREE.Vector3;
  colorHex: number;
  damage: number;
  radius: number;
  gravity: number;
  splashRadius: number;
  staggerStrength: number;
  kind: EnemyProjectileSpec['kind'];
  targetFloorY: number;
  life: number;
  maxLife: number;
}

interface PooledShockwave {
  active: boolean;
  group: THREE.Group;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  innerMesh: THREE.Mesh;
  innerMat: THREE.MeshBasicMaterial;
  center: THREE.Vector3;
  currentRadius: number;
  maxRadius: number;
  expandSpeed: number;
  damage: number;
  staggerStrength: number;
  hitPlayer: boolean;
}

export interface EnemyProjectileCallbacks {
  onPlayerHit: (damage: number, fromWorldPos: THREE.Vector3, staggerStrength: number) => void;
  onSplashExplosion: (worldPos: THREE.Vector3) => void;
  onSurfaceImpact?: (worldPos: THREE.Vector3, normal: THREE.Vector3, colorHex: number) => void;
  onRailSurfaceImpact?: (worldPos: THREE.Vector3, normal: THREE.Vector3, colorHex: number) => void;
}

const MAX_PROJECTILES = 56;
const MAX_SHOCKWAVES = 8;

function createProjectileTrailTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.58)');
  g.addColorStop(0.68, 'rgba(255,255,255,0.16)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Pooled 3D enemy gunfire, glowing flight trails, lobbed ordnance mortars (with ground warning rings),
 * and expanding floor plasma shockwave rings.
 * Uses swept raycastCollisionWorld3D so projectiles & shockwaves NEVER pass through solid walls/platforms.
 */
export class EnemyProjectileSystem {
  public readonly group = new THREE.Group();
  private readonly projectiles: PooledProjectile[] = [];
  private readonly shockwaves: PooledShockwave[] = [];
  private readonly callbacks: EnemyProjectileCallbacks;

  private readonly boltGeo: THREE.CylinderGeometry;
  private readonly auraGeo: THREE.CylinderGeometry;
  private readonly trailGeo: THREE.ConeGeometry;
  private readonly trailTex: THREE.CanvasTexture | null;
  private readonly ringGeo: THREE.RingGeometry;
  private readonly shockGeo: THREE.RingGeometry;
  private readonly shockInnerGeo: THREE.RingGeometry;
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpShockStart = new THREE.Vector3();
  private readonly tmpShockEnd = new THREE.Vector3();
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private readonly rayHit: WorldRaycastHit = {
    hit: false,
    t: 1,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
  };

  constructor(callbacks: EnemyProjectileCallbacks) {
    this.callbacks = callbacks;
    this.boltGeo = new THREE.CylinderGeometry(0.026, 0.016, 0.52, 6);
    this.auraGeo = new THREE.CylinderGeometry(0.052, 0.032, 0.62, 8, 1, true);
    this.trailGeo = new THREE.ConeGeometry(0.048, 1.15, 6, 1, true);
    // Tip points backward along -Y behind the bolt so velocity alignment trails behind!
    this.trailGeo.rotateX(Math.PI);
    this.trailGeo.translate(0, -0.68, 0);
    this.trailTex = createProjectileTrailTexture();

    this.ringGeo = new THREE.RingGeometry(0.76, 1.0, 28);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.shockGeo = new THREE.RingGeometry(0.84, 1.0, 44);
    this.shockGeo.rotateX(-Math.PI / 2);
    this.shockInnerGeo = new THREE.RingGeometry(0.7, 0.86, 44);
    this.shockInnerGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const pGroup = new THREE.Group();
      pGroup.visible = false;

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreMesh = new THREE.Mesh(this.boltGeo, coreMat);
      pGroup.add(coreMesh);

      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xff3b52,
        transparent: true,
        opacity: 0.44,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const auraMesh = new THREE.Mesh(this.auraGeo, auraMat);
      pGroup.add(auraMesh);

      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xff3b52,
        map: this.trailTex ?? undefined,
        transparent: true,
        opacity: 0.46,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const trailMesh = new THREE.Mesh(this.trailGeo, trailMat);
      pGroup.add(trailMesh);

      this.group.add(pGroup);

      const telegraphMat = new THREE.MeshBasicMaterial({
        color: 0xff5a1f,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const telegraphRing = new THREE.Mesh(this.ringGeo, telegraphMat);
      telegraphRing.visible = false;
      this.group.add(telegraphRing);

      this.projectiles.push({
        active: false,
        group: pGroup,
        coreMesh,
        coreMat,
        auraMesh,
        auraMat,
        trailMesh,
        trailMat,
        telegraphRing,
        telegraphMat,
        pos: new THREE.Vector3(),
        prevPos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        origin: new THREE.Vector3(),
        colorHex: 0xff3b52,
        damage: 10,
        radius: 0.14,
        gravity: 0,
        splashRadius: 0,
        staggerStrength: 0.45,
        kind: 'plasma_bolt',
        targetFloorY: -999,
        life: 0,
        maxLife: 2.4,
      });
    }

    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sGroup = new THREE.Group();
      sGroup.visible = false;

      const mat = new THREE.MeshBasicMaterial({
        color: 0xffb830,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.shockGeo, mat);
      sGroup.add(mesh);

      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const innerMesh = new THREE.Mesh(this.shockInnerGeo, innerMat);
      innerMesh.position.y = 0.02;
      sGroup.add(innerMesh);

      this.group.add(sGroup);

      this.shockwaves.push({
        active: false,
        group: sGroup,
        mesh,
        mat,
        innerMesh,
        innerMat,
        center: new THREE.Vector3(),
        currentRadius: 0.6,
        maxRadius: 11,
        expandSpeed: 10,
        damage: 28,
        staggerStrength: 0.95,
        hitPlayer: false,
      });
    }
  }

  public spawnProjectile(spec: EnemyProjectileSpec): void {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;

    slot.active = true;
    slot.kind = spec.kind;
    slot.pos.copy(spec.origin);
    slot.prevPos.copy(spec.origin);
    slot.origin.copy(spec.origin);
    slot.colorHex = spec.color;
    slot.vel.copy(spec.direction).normalize().multiplyScalar(spec.speed);
    slot.damage = spec.damage;
    slot.radius = spec.radius;
    slot.gravity = spec.gravity ?? 0;
    slot.splashRadius = spec.splashRadius ?? 0;
    slot.staggerStrength = spec.staggerStrength;
    slot.targetFloorY = spec.targetPos ? spec.targetPos.y + 0.08 : spec.origin.y - 4.0;
    slot.life = 0;
    slot.maxLife = spec.kind === 'mortar_canister' ? 3.2 : 2.2;

    slot.coreMat.color.setHex(spec.color).lerp(new THREE.Color(0xffffff), 0.62);
    slot.auraMat.color.setHex(spec.color);
    slot.trailMat.color.setHex(spec.color);
    slot.group.position.copy(slot.pos);

    if (spec.kind === 'mortar_canister') {
      slot.group.scale.set(2.5, 0.72, 2.5);
      slot.trailMesh.scale.set(1.1, 1.35, 1.1);
    } else if (spec.kind === 'rail_slug') {
      slot.group.scale.set(1.5, 3.2, 1.5);
      slot.trailMesh.scale.set(1.25, 2.4, 1.25);
    } else if (spec.kind === 'boss_overdrive') {
      slot.group.scale.set(1.65, 1.45, 1.65);
      slot.trailMesh.scale.set(1.15, 1.55, 1.15);
    } else if (spec.kind === 'shotgun_pellet') {
      slot.group.scale.set(0.85, 0.75, 0.85);
      slot.trailMesh.scale.set(0.85, 0.9, 0.85);
    } else {
      slot.group.scale.set(1.08, 1.15, 1.08);
      slot.trailMesh.scale.set(1.0, 1.45, 1.0);
    }

    this.tmpDir.copy(slot.vel).normalize();
    slot.group.quaternion.setFromUnitVectors(this.upAxis, this.tmpDir);
    slot.group.visible = true;

    if (spec.kind === 'mortar_canister' && spec.targetPos && spec.splashRadius) {
      slot.telegraphMat.color.setHex(spec.color);
      slot.telegraphRing.position.set(spec.targetPos.x, spec.targetPos.y + 0.05, spec.targetPos.z);
      slot.telegraphRing.scale.set(spec.splashRadius, 1, spec.splashRadius);
      slot.telegraphMat.opacity = 0.72;
      slot.telegraphRing.visible = true;
    } else {
      slot.telegraphRing.visible = false;
    }
  }

  public spawnShockwave(spec: EnemyShockwaveSpec): void {
    const slot = this.shockwaves.find((s) => !s.active);
    if (!slot) return;

    slot.active = true;
    slot.center.copy(spec.center);
    slot.currentRadius = 0.8;
    slot.maxRadius = spec.maxRadius;
    slot.expandSpeed = spec.expandSpeed;
    slot.damage = spec.damage;
    slot.staggerStrength = spec.staggerStrength;
    slot.hitPlayer = false;
    slot.mat.color.setHex(spec.color);
    slot.mat.opacity = 0.92;
    slot.innerMat.opacity = 0.62;
    slot.group.position.set(spec.center.x, spec.center.y + 0.08, spec.center.z);
    slot.group.scale.set(0.8, 1, 0.8);
    slot.group.visible = true;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerGrounded: boolean,
    playerRolling: boolean,
    world: CollisionWorld3D
  ): void {
    const playerCenterY = playerPos.y + (playerRolling ? 0.52 : 1.02);

    // 1. Step projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        this.deactivateProjectile(p);
        continue;
      }

      if (p.gravity !== 0) {
        p.vel.y -= p.gravity * dt;
      }

      p.prevPos.copy(p.pos);
      p.pos.addScaledVector(p.vel, dt);

      // 1a. Swept solid-world collision FIRST so projectiles NEVER pass through cover, walls, or platforms!
      const hitWorld = raycastCollisionWorld3D(
        p.prevPos.x,
        p.prevPos.y,
        p.prevPos.z,
        p.pos.x,
        p.pos.y,
        p.pos.z,
        world,
        this.rayHit
      );
      if (hitWorld) {
        if (p.splashRadius > 0) {
          this.callbacks.onSplashExplosion(this.rayHit.point);
          const splashDx = playerPos.x - this.rayHit.point.x;
          const splashDz = playerPos.z - this.rayHit.point.z;
          const splashDistSq = splashDx * splashDx + splashDz * splashDz;
          const effSplash = p.splashRadius * (playerRolling ? 0.65 : 1.0);
          if (splashDistSq <= effSplash * effSplash && Math.abs(playerPos.y - this.rayHit.point.y) < 1.8) {
            this.callbacks.onPlayerHit(p.damage, this.rayHit.point, p.staggerStrength);
          }
        } else if (p.kind === 'rail_slug') {
          this.callbacks.onRailSurfaceImpact?.(this.rayHit.point, this.rayHit.normal, p.colorHex);
        } else {
          this.callbacks.onSurfaceImpact?.(this.rayHit.point, this.rayHit.normal, p.colorHex);
        }
        this.deactivateProjectile(p);
        continue;
      }

      p.group.position.copy(p.pos);
      if (p.vel.lengthSq() > 1e-4) {
        this.tmpDir.copy(p.vel).normalize();
        p.group.quaternion.setFromUnitVectors(this.upAxis, this.tmpDir);
      }

      // Pulse mortar ground ring telegraph
      if (p.telegraphRing.visible) {
        p.telegraphMat.opacity = 0.45 + 0.35 * Math.abs(Math.sin(p.life * 16));
      }

      // Check player hit (tight fair cylinder capsule around player torso; rolling shrinks hitbox!)
      const hitRadius = (playerRolling ? 0.34 : 0.48) + p.radius;
      const dxP = p.pos.x - playerPos.x;
      const dzP = p.pos.z - playerPos.z;
      const dyP = Math.abs(p.pos.y - playerCenterY);
      if (dxP * dxP + dzP * dzP <= hitRadius * hitRadius && dyP <= (playerRolling ? 0.5 : 0.88)) {
        this.callbacks.onPlayerHit(p.damage, p.origin, p.staggerStrength);
        if (p.splashRadius > 0) {
          this.callbacks.onSplashExplosion(p.pos);
        }
        this.deactivateProjectile(p);
        continue;
      }

      // Floor impact fallback for lobbed mortar canisters (uses per-floor target height, descending only)
      if (p.kind === 'mortar_canister' && p.vel.y < 0 && p.pos.y <= p.targetFloorY) {
        p.pos.y = p.targetFloorY;
        this.callbacks.onSplashExplosion(p.pos);
        const splashDx = playerPos.x - p.pos.x;
        const splashDz = playerPos.z - p.pos.z;
        const splashDistSq = splashDx * splashDx + splashDz * splashDz;
        const effSplash = p.splashRadius * (playerRolling ? 0.65 : 1.0);
        if (splashDistSq <= effSplash * effSplash && Math.abs(playerPos.y - p.targetFloorY) < 1.85) {
          this.callbacks.onPlayerHit(p.damage, p.pos, p.staggerStrength);
        }
        this.deactivateProjectile(p);
        continue;
      }
    }

    // 2. Step expanding floor shockwave rings
    for (let i = 0; i < this.shockwaves.length; i++) {
      const s = this.shockwaves[i];
      if (!s.active) continue;

      s.currentRadius += s.expandSpeed * dt;
      if (s.currentRadius >= s.maxRadius) {
        s.active = false;
        s.group.visible = false;
        continue;
      }

      const ratio = s.currentRadius / s.maxRadius;
      s.group.scale.set(s.currentRadius, 1, s.currentRadius);
      s.mat.opacity = Math.max(0.05, (1 - ratio) * 0.92);
      s.innerMat.opacity = Math.max(0.03, (1 - ratio) * 0.62);

      // Jump or dodge-roll cleanly evades the low plasma ring; solid cover walls also block it!
      if (!s.hitPlayer && playerGrounded && !playerRolling) {
        const dx = playerPos.x - s.center.x;
        const dz = playerPos.z - s.center.z;
        const dist = Math.hypot(dx, dz);
        const heightDelta = Math.abs(playerPos.y - s.center.y);
        if (Math.abs(dist - s.currentRadius) <= 0.72 && heightDelta <= 0.65) {
          this.tmpShockStart.set(s.center.x, s.center.y + 0.45, s.center.z);
          this.tmpShockEnd.set(playerPos.x, playerPos.y + 0.45, playerPos.z);
          const blockedByWall = raycastCollisionWorld3D(
            this.tmpShockStart.x,
            this.tmpShockStart.y,
            this.tmpShockStart.z,
            this.tmpShockEnd.x,
            this.tmpShockEnd.y,
            this.tmpShockEnd.z,
            world,
            this.rayHit
          );
          if (!blockedByWall) {
            s.hitPlayer = true;
            this.callbacks.onPlayerHit(s.damage, s.center, s.staggerStrength);
          }
        }
      }
    }
  }

  public clear(): void {
    for (const p of this.projectiles) this.deactivateProjectile(p);
    for (const s of this.shockwaves) {
      s.active = false;
      s.group.visible = false;
    }
  }

  public dispose(): void {
    this.boltGeo.dispose();
    this.auraGeo.dispose();
    this.trailGeo.dispose();
    this.trailTex?.dispose();
    this.ringGeo.dispose();
    this.shockGeo.dispose();
    this.shockInnerGeo.dispose();
    for (const p of this.projectiles) {
      p.coreMat.dispose();
      p.auraMat.dispose();
      p.trailMat.dispose();
      p.telegraphMat.dispose();
    }
    for (const s of this.shockwaves) {
      s.mat.dispose();
      s.innerMat.dispose();
    }
  }

  private deactivateProjectile(p: PooledProjectile): void {
    p.active = false;
    p.group.visible = false;
    p.telegraphRing.visible = false;
  }
}
