import * as THREE from 'three';
import type { CollisionWorld3D } from '../../arena/hideout/types';
import { EnemyManager, type EnemyManagerCallbacks } from '../core/enemyManager';
import type { EnemyInspectInfo, FloorEncounterHudState } from '../core/types';
import { createAcidWyvernConstructBrain } from './acidWyvernConstruct';
import { createApexArenaMarauderBossBrain } from './apexArenaMarauderBoss';
import { createArenaNetShooterBrain } from './arenaNetShooter';
import { createDualCleaverExecutionerBrain } from './dualCleaverExecutioner';
import { createLeapingCarapaceStalkerBrain } from './leapingCarapaceStalker';
import { createFloor05EnemyMaterials, type Floor05EnemyMaterials } from './materials';
import { createPlasmaSpearHopliteBrain } from './plasmaSpearHoplite';
import {
  createInitialFloor05Progression,
  evaluateFloor05Progression,
  FLOOR05_BOSS_SPAWN,
  FLOOR05_INITIAL_SPAWNS,
  type Floor05ProgressionState,
} from './progression';
import { createShieldChariotBruteBrain } from './shieldChariotBrute';

export interface Floor05DirectorCallbacks extends EnemyManagerCallbacks {
  onBossSpawned: () => void;
  onFloorCleared: () => void;
}

/**
 * Top-level Floor 05 Encounter Director orchestrating all 7 completely unique
 * Gladiator Hunter-Beast & Arena Champion archetypes across Floor 05's 4-tier
 * Sunken War-Pit Coliseum & 9-zone Orbital Command Complex (28 total hostiles),
 * both Zone Mini-Bosses, Floor 05 Boss (APEX ARENA MARAUDER), and strict
 * all-enemies-vanquished Control Center gating!
 */
export class Floor05EncounterDirector {
  public readonly manager: EnemyManager;
  public readonly materials: Floor05EnemyMaterials;
  public progression: Floor05ProgressionState;

  private readonly callbacks: Floor05DirectorCallbacks;

  constructor(callbacks: Floor05DirectorCallbacks) {
    this.callbacks = callbacks;
    this.materials = createFloor05EnemyMaterials();
    this.manager = new EnemyManager(callbacks);
    this.progression = createInitialFloor05Progression();

    // Register all 7 completely unique Floor 05 Gladiator Arena archetypes
    this.manager.registerArchetype(createPlasmaSpearHopliteBrain(this.materials));
    this.manager.registerArchetype(createLeapingCarapaceStalkerBrain(this.materials));
    this.manager.registerArchetype(createArenaNetShooterBrain(this.materials));
    this.manager.registerArchetype(createShieldChariotBruteBrain(this.materials));
    this.manager.registerArchetype(createDualCleaverExecutionerBrain(this.materials));
    this.manager.registerArchetype(createAcidWyvernConstructBrain(this.materials));
    this.manager.registerArchetype(createApexArenaMarauderBossBrain(this.materials));
  }

  public get group(): THREE.Group {
    return this.manager.group;
  }

  public startLiveCombat(): void {
    if (this.progression.liveCombatActive) return;
    this.manager.clearAll();
    this.progression = createInitialFloor05Progression();
    this.progression.liveCombatActive = true;

    for (const spec of FLOOR05_INITIAL_SPAWNS) {
      this.manager.spawnEnemy(spec);
    }

    this.callbacks.onBanner(
      'FLOOR 05 COMBAT ACTIVE · VANQUISH ALL 28 ARENA HOSTILES & BOTH ZONE MINI-BOSSES',
      5.4
    );
  }

  public reset(): void {
    this.manager.clearAll();
    this.progression = createInitialFloor05Progression();
  }

  public spawnFloorBossNow(): boolean {
    if (!this.progression.liveCombatActive) {
      this.startLiveCombat();
    }
    if (this.progression.bossSpawned) return false;
    this.progression.bossSpawned = true;
    this.manager.spawnEnemy(FLOOR05_BOSS_SPAWN);
    this.callbacks.onBossSpawned();
    this.callbacks.onBanner(
      'ALERT · FLOOR 05 BOSS "APEX ARENA MARAUDER" ENTERING THE WAR-PIT COLISEUM!',
      5.5
    );
    return true;
  }

  public update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    playerGrounded: boolean,
    playerRolling: boolean,
    world: CollisionWorld3D,
    isOnFloor5: boolean,
    cameraPos?: THREE.Vector3
  ): void {
    this.manager.setVisible(isOnFloor5);
    if (!isOnFloor5 || !this.progression.liveCombatActive) return;

    this.manager.update(dt, elapsed, playerPos, playerGrounded, playerRolling, world, cameraPos);

    let aliveNormal = 0;
    let aliveMiniBosses = 0;
    let bossAlive = false;
    const all = this.manager.allEnemies;
    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      if (!e.state.alive) continue;
      if (e.state.tier === 'boss') bossAlive = true;
      else if (e.state.tier === 'miniboss') aliveMiniBosses += 1;
      else aliveNormal += 1;
    }

    const evalRes = evaluateFloor05Progression(this.progression, {
      liveCombatActive: this.progression.liveCombatActive,
      aliveNormal,
      aliveMiniBosses,
      bossSpawned: this.progression.bossSpawned,
      bossAlive,
    });
    this.progression = evalRes.next;

    if (evalRes.shouldSpawnBoss) {
      this.manager.spawnEnemy(FLOOR05_BOSS_SPAWN);
      this.callbacks.onBossSpawned();
      this.callbacks.onBanner(
        'ALERT · FLOOR 05 BOSS "APEX ARENA MARAUDER" ENTERING THE WAR-PIT COLISEUM!',
        5.5
      );
    }

    if (evalRes.justClearedFloor) {
      this.callbacks.onFloorCleared();
      this.callbacks.onBanner(
        'ALL HOSTILES VANQUISHED · ACTIVATE CONTROL CENTER TO DESCEND TO FLOOR 04',
        6.5
      );
    }
  }

  public getHudState(playerX: number, playerZ: number): FloorEncounterHudState {
    return {
      liveCombatActive: this.progression.liveCombatActive,
      remainingNormal: this.progression.remainingNormal,
      totalNormal: this.progression.totalNormal,
      remainingMiniBosses: this.progression.remainingMiniBosses,
      totalMiniBosses: this.progression.totalMiniBosses,
      bossSpawned: this.progression.bossSpawned,
      bossDefeated: this.progression.bossDefeated,
      floorCleared: this.progression.floorCleared,
      activeBossHud: this.manager.getActiveBossHud(playerX, playerZ),
      weakpointIntel: this.manager.activeIntelBanner,
    };
  }

  public getInspectSnapshot(): EnemyInspectInfo[] {
    return this.manager.getInspectSnapshot();
  }

  public dispose(): void {
    this.manager.dispose();
    this.materials.dispose();
  }
}
