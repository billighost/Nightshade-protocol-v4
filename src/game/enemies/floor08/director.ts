import * as THREE from 'three';
import type { CollisionWorld3D } from '../../arena/hideout/types';
import {
  createFloor08EnemyMaterials,
  EnemyManager,
  type EnemyManagerCallbacks,
  type Floor08EnemyMaterials,
  type ManagedEnemy,
} from '../core';
import type { Floor08EncounterHudState } from '../core/types';
import { createAegisRiotBrain } from './aegisRiotTrooper';
import { createBreacherCyborgBrain } from './breacherCyborg';
import { createCommanderKestrelBrain } from './commanderKestrel';
import { createKillhouseWardenBrain } from './killhouseWarden';
import { createOrdnancePyroBrain } from './ordnancePyroTech';
import {
  buildFloor08EncounterHudState,
  createInitialFloor08Progression,
  evaluateFloor08Progression,
  FLOOR08_BOSS_SPAWN,
  FLOOR08_LIVE_ROSTER,
  type Floor08ProgressionState,
} from './progression';
import { createRazorStriderBrain } from './razorStrider';

export interface Floor08DirectorCallbacks extends EnemyManagerCallbacks {
  onBossArrived: (boss: ManagedEnemy) => void;
  onFloorCleared: () => void;
}

/**
 * Floor 08 Encounter Director:
 * Registers all 6 unique Floor 08 Cyber Vanguard archetypes, holds Floor 08 clear during the
 * Interactive Tutorial, deploys the full zone + mini-boss roster when Live Combat activates,
 * and choreographs Commander Kestrel-08's dramatic Main-Hall Boss arrival!
 */
export class Floor08EncounterDirector {
  public readonly materials: Floor08EnemyMaterials;
  public readonly manager: EnemyManager;
  public readonly progression: Floor08ProgressionState = createInitialFloor08Progression();
  private readonly callbacks: Floor08DirectorCallbacks;

  constructor(callbacks: Floor08DirectorCallbacks) {
    this.callbacks = callbacks;
    this.materials = createFloor08EnemyMaterials();
    this.manager = new EnemyManager(callbacks);

    // Register Floor 08's 6 100%-unique Black-Ops Cyber Vanguard archetypes
    this.manager.registerArchetype(createBreacherCyborgBrain(this.materials));
    this.manager.registerArchetype(createRazorStriderBrain(this.materials));
    this.manager.registerArchetype(createAegisRiotBrain(this.materials));
    this.manager.registerArchetype(createKillhouseWardenBrain(this.materials));
    this.manager.registerArchetype(createOrdnancePyroBrain(this.materials));
    this.manager.registerArchetype(createCommanderKestrelBrain(this.materials));
  }

  public get group(): THREE.Group {
    return this.manager.group;
  }

  public resetToTutorialHold(): void {
    this.manager.clearAll();
    Object.assign(this.progression, createInitialFloor08Progression());
  }

  /**
   * Transitions Floor 08 into full live combat right after tutorial completion & Entry Gate respawn!
   */
  public startLiveCombat(): void {
    this.manager.clearAll();
    Object.assign(this.progression, createInitialFloor08Progression());
    this.progression.liveCombatActive = true;
    this.manager.setVisible(true);

    for (let i = 0; i < FLOOR08_LIVE_ROSTER.length; i++) {
      this.manager.spawnEnemy(FLOOR08_LIVE_ROSTER[i]);
    }
    this.syncProgression();
  }

  /**
   * Spawns Floor 08's Main-Hall Floor Boss Commander Kestrel-08 in Zone 4 Main Firing Hall.
   */
  public spawnFloorBossNow(): ManagedEnemy | null {
    if (!this.progression.liveCombatActive) {
      this.progression.liveCombatActive = true;
    }
    this.manager.setVisible(true);
    const existing = this.manager.getEnemyById(FLOOR08_BOSS_SPAWN.id);
    if (existing) return existing;

    this.progression.bossSpawned = true;
    const boss = this.manager.spawnEnemy(FLOOR08_BOSS_SPAWN);
    if (boss) {
      this.callbacks.onBossArrived(boss);
    }
    this.syncProgression();
    return boss;
  }

  public update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    playerGrounded: boolean,
    playerRolling: boolean,
    world: CollisionWorld3D,
    onFloor8: boolean,
    cameraPos?: THREE.Vector3
  ): void {
    this.manager.setVisible(onFloor8 && this.progression.liveCombatActive);
    if (!onFloor8 || !this.progression.liveCombatActive) return;

    this.manager.update(dt, elapsed, playerPos, playerGrounded, playerRolling, world, cameraPos);
    this.syncProgression();
  }

  public getHudState(playerX: number, playerZ: number): Floor08EncounterHudState {
    const activeBossHud = this.progression.liveCombatActive
      ? this.manager.getActiveBossHud(playerX, playerZ)
      : null;
    const intel = this.progression.liveCombatActive ? this.manager.activeIntelBanner : null;
    return buildFloor08EncounterHudState(this.progression, activeBossHud, intel);
  }

  public dispose(): void {
    this.manager.dispose();
    this.materials.dispose();
  }

  private syncProgression(): void {
    const evalRes = evaluateFloor08Progression(
      this.progression,
      this.manager.allEnemies.map((e) => ({
        tier: e.state.tier,
        alive: e.state.alive,
      }))
    );

    if (evalRes.shouldSpawnBoss) {
      this.spawnFloorBossNow();
    }
    if (evalRes.justClearedFloor) {
      this.callbacks.onFloorCleared();
    }
  }
}
