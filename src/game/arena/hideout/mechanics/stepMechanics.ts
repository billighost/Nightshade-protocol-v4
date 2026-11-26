import type * as THREE from 'three';
import type {
  ExplosiveBarrelRig,
  JumpPadRig,
  RetractableBridgeRig,
  SecurityGateRig,
  ShootableLockRig,
  WorldSwitchRig,
} from '../types';

export interface WorldMechanicEvent {
  kind: 'bridge_deployed' | 'gate_opened' | 'jump_pad_launch';
  id: string;
  launchVy?: number;
  launchVx?: number;
  launchVz?: number;
}

const BRIDGE_DEPLOY_DURATION = 1.35;
const GATE_OPEN_DURATION = 1.05;
const BARREL_RESPAWN_SEC = 14.0;

/**
 * Pure per-frame simulation step for all active retractable bridges, security gates,
 * shootable relay animations, pneumatic jump-boost pads, explosive plasma barrels, and animated spinners.
 */
export function stepWorldMechanics(
  bridges: RetractableBridgeRig[] | undefined,
  gates: SecurityGateRig[] | undefined,
  locks: ShootableLockRig[] | undefined,
  jumpPads: JumpPadRig[] | undefined,
  dt: number,
  elapsed: number,
  px: number,
  py: number,
  pz: number,
  barrels?: ExplosiveBarrelRig[],
  spinners?: Array<{ obj: THREE.Object3D; speed: number; axis?: 'x' | 'y' | 'z' }>
): WorldMechanicEvent[] {
  const events: WorldMechanicEvent[] = [];

  if (bridges) {
    for (let i = 0; i < bridges.length; i++) {
      const b = bridges[i];
      const prev = b.deployRatio;
      if (b.targetRatio > b.deployRatio) {
        b.deployRatio = Math.min(b.targetRatio, b.deployRatio + dt / BRIDGE_DEPLOY_DURATION);
        b.applyVisuals();
        if (prev < 0.78 && b.deployRatio >= 0.78) {
          events.push({ kind: 'bridge_deployed', id: b.id });
        }
      }
    }
  }

  if (gates) {
    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      const prev = g.openRatio;
      if (g.targetRatio > g.openRatio) {
        g.openRatio = Math.min(g.targetRatio, g.openRatio + dt / GATE_OPEN_DURATION);
        g.applyVisuals();
        if (prev < 0.72 && g.openRatio >= 0.72) {
          events.push({ kind: 'gate_opened', id: g.id });
        }
      }
    }
  }

  if (locks) {
    for (let i = 0; i < locks.length; i++) {
      locks[i].applyVisuals(elapsed);
    }
  }

  if (barrels) {
    for (let i = 0; i < barrels.length; i++) {
      const br = barrels[i];
      if (br.detonated && br.respawnTimer > 0) {
        br.respawnTimer -= dt;
        if (br.respawnTimer <= 0) {
          br.detonated = false;
          br.respawnTimer = 0;
        }
      }
      br.applyVisuals(elapsed);
    }
  }

  if (spinners) {
    for (let i = 0; i < spinners.length; i++) {
      const s = spinners[i];
      if (s.axis === 'x') s.obj.rotation.x += s.speed * dt;
      else if (s.axis === 'z') s.obj.rotation.z += s.speed * dt;
      else s.obj.rotation.y += s.speed * dt;
    }
  }

  if (jumpPads) {
    for (let i = 0; i < jumpPads.length; i++) {
      const p = jumpPads[i];
      if (p.cooldown > 0) p.cooldown = Math.max(0, p.cooldown - dt);
      p.applyVisuals(elapsed);

      if (p.cooldown <= 0 && Math.abs(py - p.y) < 0.52) {
        const dx = px - p.x;
        const dz = pz - p.z;
        if (dx * dx + dz * dz <= p.radius * p.radius) {
          p.cooldown = 0.68;
          let launchVx = p.launchVx;
          let launchVz = p.launchVz;
          const tFlight = Math.max(0.65, (p.launchVy / 22.0) * 1.42);
          if (Math.abs(p.launchVx) > 0.05) {
            const sgn = Math.sign(p.launchVx);
            const adj = p.launchVx - dx / tFlight;
            launchVx = sgn * Math.max(Math.abs(p.launchVx) * 0.45, adj * sgn);
          }
          if (Math.abs(p.launchVz) > 0.05) {
            const sgn = Math.sign(p.launchVz);
            const adj = p.launchVz - dz / tFlight;
            launchVz = sgn * Math.max(Math.abs(p.launchVz) * 0.45, adj * sgn);
          }
          events.push({
            kind: 'jump_pad_launch',
            id: p.id,
            launchVy: p.launchVy,
            launchVx,
            launchVz,
          });
        }
      }
    }
  }

  return events;
}

export function triggerExplosiveBarrelInList(
  barrels: ExplosiveBarrelRig[] | undefined,
  barrelId: string
): ExplosiveBarrelRig[] {
  if (!barrels) return [];
  const origin = barrels.find((b) => b.id === barrelId);
  if (!origin || origin.detonated) return [];

  const detonatedNow: ExplosiveBarrelRig[] = [];
  const queue: ExplosiveBarrelRig[] = [origin];
  origin.detonated = true;
  origin.respawnTimer = BARREL_RESPAWN_SEC;
  origin.applyVisuals(0);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    detonatedNow.push(cur);
    const rSq = cur.blastRadius * cur.blastRadius;
    for (let i = 0; i < barrels.length; i++) {
      const other = barrels[i];
      if (other.detonated) continue;
      const dx = other.x - cur.x;
      const dy = other.y - cur.y;
      const dz = other.z - cur.z;
      if (dx * dx + dy * dy + dz * dz <= rSq) {
        other.detonated = true;
        other.respawnTimer = BARREL_RESPAWN_SEC;
        other.applyVisuals(0);
        queue.push(other);
      }
    }
  }
  return detonatedNow;
}

export function resetWorldMechanics(
  bridges: RetractableBridgeRig[] | undefined,
  gates: SecurityGateRig[] | undefined,
  locks: ShootableLockRig[] | undefined,
  jumpPads: JumpPadRig[] | undefined,
  switches: WorldSwitchRig[] | undefined,
  barrels?: ExplosiveBarrelRig[]
): void {
  if (bridges) {
    for (let i = 0; i < bridges.length; i++) {
      const b = bridges[i];
      b.deployRatio = 0;
      b.targetRatio = 0;
      b.deployed = false;
      b.applyVisuals();
    }
  }
  if (gates) {
    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      g.openRatio = 0;
      g.targetRatio = 0;
      g.unlocked = false;
      g.applyVisuals();
    }
  }
  if (locks) {
    for (let i = 0; i < locks.length; i++) {
      locks[i].destroyed = false;
      locks[i].applyVisuals(0);
    }
  }
  if (jumpPads) {
    for (let i = 0; i < jumpPads.length; i++) {
      jumpPads[i].cooldown = 0;
      jumpPads[i].applyVisuals(0);
    }
  }
  if (switches) {
    for (let i = 0; i < switches.length; i++) {
      switches[i].activated = false;
      switches[i].applyVisuals();
    }
  }
  if (barrels) {
    for (let i = 0; i < barrels.length; i++) {
      barrels[i].detonated = false;
      barrels[i].respawnTimer = 0;
      barrels[i].applyVisuals(0);
    }
  }
}
