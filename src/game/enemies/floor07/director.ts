import * as THREE from 'three';
import type { CollisionWorld3D } from '../../arena/hideout/types';
import { EnemyManager, type EnemyManagerCallbacks } from '../core/enemyManager';
import type { EnemyInspectInfo, FloorEncounterHudState } from '../core/types';
import { createBastionSevenBossBrain } from './bastionSevenBoss';
import { createExoCarbineTrooperBrain } from './exoCarbineTrooper';
import { createGrappleLanceDuelistBrain } from './grappleLanceDuelist';
import { createFloor07EnemyMaterials, type Floor07EnemyMaterials } from './materials';
import { createMortarPodBombardierBrain } from './mortarPodBombardier';
import {
  createInitialFloor07Progression,
  evaluateFloor07Progression,
  FLOOR07_BOSS_SPAWN,
  FLOOR07_LIVE_ROSTER,
  type Floor07ProgressionState,
} from './progression';
import { createTurbineJuggernautBrain } from './turbineJuggernaut';
import { createValkyrieHoverDroneBrain } from './valkyrieHoverDrone';
import { createVaultStalkerSniperBrain } from './vaultStalkerSniper';

export interface Floor07DirectorCallbacks extends EnemyManagerCallbacks {
  onBossSpawned: () => void;
  onFloorCleared: () => void;
}

/**
 * Top-level Floor 07 Encounter Director managing all 7 bespoke Floor 07 enemy archetypes,
 * 20-enemy initial deployment across all 6 combat zones, TITAN-RIG "BASTION-VII" boss arrival,
 * and strict all-hostiles-vanquished Control Center unlock!
 */
export class Floor07EncounterDirector {
  public readonly manager: EnemyManager;
  public readonly materials: Floor07EnemyMaterials;
  public progression: Floor07ProgressionState;

  private readonly callbacks: Floor07DirectorCallbacks;

  constructor(callbacks: Floor07DirectorCallbacks) {
    this.callbacks = callbacks;
    this.materials = createFloor07EnemyMaterials();
    this.manager = new EnemyManager(callbacks);
    this.progression = createInitialFloor07Progression();

    // Register all 7 completely unique Floor 07 enemy archetypes
    this.manager.registerArchetype(createExoCarbineTrooperBrain(this.materials));
    this.manager.registerArchetype(createGrappleLanceDuelistBrain(this.materials));
    this.manager.registerArchetype(createMortarPodBombardierBrain(this.materials));
    this.manager.registerArchetype(createValkyrieHoverDroneBrain(this.materials));
    this.manager.registerArchetype(createTurbineJuggernautBrain(this.materials));
    this.manager.registerArchetype(createVaultStalkerSniperBrain(this.materials));
    this.manager.registerArchetype(createBastionSevenBossBrain(this.materials));
  }

  public get group(): THREE.Group {
    return this.manager.group;
  }

  public startLiveCombat(): void {
    if (this.progression.liveCombatActive) return;
    this.manager.clearAll();
    this.progression = createInitialFloor07Progression();
    this.progression.liveCombatActive = true;

    for (const spec of FLOOR07_LIVE_ROSTER) {
      this.manager.spawnEnemy(spec);
    }

    this.callbacks.onBanner(
      'FLOOR 07 COMBAT ACTIVE · VANQUISH ALL 20 HOSTILES & BOTH ZONE MINI-BOSSES',
      5.0
    );
  }

  public reset(): void {
    this.manager.clearAll();
    this.progression = createInitialFloor07Progression();
  }

  public spawnFloorBossNow(): boolean {
    if (!this.progression.liveCombatActive) {
      this.startLiveCombat();
    }
    if (this.progression.bossSpawned) return false;
    this.progression.bossSpawned = true;
    this.manager.spawnEnemy(FLOOR07_BOSS_SPAWN);
    this.callbacks.onBossSpawned();
    this.callbacks.onBanner(
      'ALERT · TITAN-RIG "BASTION-VII" DEPLOYED IN THE SPIRAL WELL ROTUNDA!',
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
    isOnFloor7: boolean,
    cameraPos?: THREE.Vector3
  ): void {
    this.manager.setVisible(isOnFloor7);
    if (!isOnFloor7 || !this.progression.liveCombatActive) return;

    this.manager.update(dt, elapsed, playerPos, playerGrounded, playerRolling, world, cameraPos);

    const evalRes = evaluateFloor07Progression(
      this.progression,
      this.manager.allEnemies.map((e) => e.state)
    );
    this.progression = evalRes.next;

    if (evalRes.shouldSpawnBoss) {
      this.manager.spawnEnemy(FLOOR07_BOSS_SPAWN);
      this.callbacks.onBossSpawned();
      this.callbacks.onBanner(
        'ALERT · TITAN-RIG "BASTION-VII" DEPLOYED IN THE SPIRAL WELL ROTUNDA!',
        5.5
      );
    }

    if (evalRes.justClearedFloor) {
      this.callbacks.onFloorCleared();
      this.callbacks.onBanner(
        'ALL HOSTILES VANQUISHED · ACTIVATE CONTROL CENTER TO DESCEND TO FLOOR 06',
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
