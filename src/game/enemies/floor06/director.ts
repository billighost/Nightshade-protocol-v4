import * as THREE from 'three';
import type { CollisionWorld3D } from '../../arena/hideout/types';
import { EnemyManager, type EnemyManagerCallbacks } from '../core/enemyManager';
import type { EnemyInspectInfo, FloorEncounterHudState } from '../core/types';
import { createArchiveRealityWeaverBrain } from './archiveRealityWeaver';
import { createAstralShardLevitatorBrain } from './astralShardLevitator';
import { createBunkerGravityHoundBrain } from './bunkerGravityHound';
import { createFloor06EnemyMaterials, type Floor06EnemyMaterials } from './materials';
import { createMonolithArchonBossBrain } from './monolithArchonBoss';
import { createMonolithClaymoreKnightBrain } from './monolithClaymoreKnight';
import { createPhaseBlinkWardenBrain } from './phaseBlinkWarden';
import {
  createInitialFloor06Progression,
  evaluateFloor06Progression,
  FLOOR06_BOSS_SPAWN,
  FLOOR06_INITIAL_SPAWNS,
  type Floor06ProgressionState,
} from './progression';
import { createResonantBeamPrismBrain } from './resonantBeamPrism';

export interface Floor06DirectorCallbacks extends EnemyManagerCallbacks {
  onBossSpawned: () => void;
  onFloorCleared: () => void;
}

/**
 * Top-level Floor 06 Encounter Director orchestrating all 7 unique non-recycled
 * Paranatural Brutalist Construct archetypes on Floor 06 (Obsidian Monolith Archive
 * & Ballistic Labs), 23 initial hostiles across 3 vertical tiers, Zone Mini-Bosses
 * (Archive Reality-Weaver & Bunker Gravity-Hound), Floor 06 Boss (THE MONOLITH ARCHON),
 * and strict all-enemies-vanquished Control Center gating!
 */
export class Floor06EncounterDirector {
  public readonly manager: EnemyManager;
  public readonly materials: Floor06EnemyMaterials;
  public progression: Floor06ProgressionState;

  private readonly callbacks: Floor06DirectorCallbacks;

  constructor(callbacks: Floor06DirectorCallbacks) {
    this.callbacks = callbacks;
    this.materials = createFloor06EnemyMaterials();
    this.manager = new EnemyManager(callbacks);
    this.progression = createInitialFloor06Progression();

    // Register all 7 completely unique Floor 06 Paranatural Brutalist Construct archetypes
    this.manager.registerArchetype(createAstralShardLevitatorBrain(this.materials));
    this.manager.registerArchetype(createMonolithClaymoreKnightBrain(this.materials));
    this.manager.registerArchetype(createResonantBeamPrismBrain(this.materials));
    this.manager.registerArchetype(createPhaseBlinkWardenBrain(this.materials));
    this.manager.registerArchetype(createArchiveRealityWeaverBrain(this.materials));
    this.manager.registerArchetype(createBunkerGravityHoundBrain(this.materials));
    this.manager.registerArchetype(createMonolithArchonBossBrain(this.materials));
  }

  public get group(): THREE.Group {
    return this.manager.group;
  }

  public startLiveCombat(): void {
    if (this.progression.liveCombatActive) return;
    this.manager.clearAll();
    this.progression = createInitialFloor06Progression();
    this.progression.liveCombatActive = true;

    for (const spec of FLOOR06_INITIAL_SPAWNS) {
      this.manager.spawnEnemy(spec);
    }

    this.callbacks.onBanner(
      'FLOOR 06 COMBAT ACTIVE · PURGE ALL 24 MONOLITH CONSTRUCTS & BOTH ZONE MINI-BOSSES',
      5.2
    );
  }

  public reset(): void {
    this.manager.clearAll();
    this.progression = createInitialFloor06Progression();
  }

  public spawnFloorBossNow(): boolean {
    if (!this.progression.liveCombatActive) {
      this.startLiveCombat();
    }
    if (this.progression.bossSpawned) return false;
    this.progression.bossSpawned = true;
    this.manager.spawnEnemy(FLOOR06_BOSS_SPAWN);
    this.callbacks.onBossSpawned();
    this.callbacks.onBanner(
      'ALERT · FLOOR 06 BOSS "THE MONOLITH ARCHON" MANIFESTING IN THE CATHEDRAL!',
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
    isOnFloor6: boolean,
    cameraPos?: THREE.Vector3
  ): void {
    this.manager.setVisible(isOnFloor6);
    if (!isOnFloor6 || !this.progression.liveCombatActive) return;

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

    const evalRes = evaluateFloor06Progression(this.progression, {
      liveCombatActive: this.progression.liveCombatActive,
      aliveNormal,
      aliveMiniBosses,
      bossSpawned: this.progression.bossSpawned,
      bossAlive,
    });
    this.progression = evalRes.next;

    if (evalRes.shouldSpawnBoss) {
      this.manager.spawnEnemy(FLOOR06_BOSS_SPAWN);
      this.callbacks.onBossSpawned();
      this.callbacks.onBanner(
        'ALERT · FLOOR 06 BOSS "THE MONOLITH ARCHON" MANIFESTING IN THE CATHEDRAL!',
        5.5
      );
    }

    if (evalRes.justClearedFloor) {
      this.callbacks.onFloorCleared();
      this.callbacks.onBanner(
        'ALL HOSTILES VANQUISHED · ACTIVATE CONTROL CENTER TO DESCEND TO FLOOR 05',
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
