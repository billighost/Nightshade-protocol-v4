import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { tryCollectAmmoCrate } from '../arena';
import {
  createEightFloorHideout,
  FLOOR_CATALOG,
  type EightFloorHideout,
  type FloorNumber,
} from '../arena/hideout';
import { createProceduralTextures, type ProceduralTextureSet } from '../core/textures';
import type { GamePhase, HudSnapshot, WeaponId } from '../core/types';
import { TacticalAudioEngine } from '../effects/audio';
import { CombatVfxPool } from '../effects/vfxPool';
import {
  canUseFloor05ControlCenter,
  Floor05EncounterDirector,
  getFloor05RemainingHostilesTotal,
} from '../enemies/floor05';
import {
  canUseFloor06ControlCenter,
  Floor06EncounterDirector,
  getFloor06RemainingHostilesTotal,
} from '../enemies/floor06';
import {
  canUseFloor07ControlCenter,
  Floor07EncounterDirector,
  getFloor07RemainingHostilesTotal,
} from '../enemies/floor07';
import {
  canUseFloorControlCenter,
  Floor08EncounterDirector,
  getRemainingHostilesTotal,
} from '../enemies/floor08';
import {
  createFogOfWarGrid,
  revealFogAt,
  type FogOfWarGrid,
} from '../hud/fogOfWar';
import {
  extractFloorMinimapGeometry,
  resolveSectorName,
  type MinimapEnemyBlip,
  type MinimapRect,
  type MinimapSnapshot,
  type ObjectiveWaypointSnapshot,
} from '../hud/minimapMath';
import { CyberpunkOperativeRig } from '../player';
import {
  applyPlayerHitReaction,
  createPlayerHitReactionState,
  getNormalizedFlinchWeight,
  stepPlayerHitReaction,
} from '../player/hitReaction';
import {
  createInitialLocomotionState,
  LOCOMOTION_CONFIG,
  stepLocomotion,
} from '../player/locomotion';
import { Floor08TutorialMachine, Floor08TutorialProps } from '../tutorial';
import {
  addHeavyAmmo,
  createInitialWeaponState,
  HEAVY_CONFIG,
  stepWeaponSystem,
  switchWeapon,
  SWAP_DURATION,
} from '../weapons/weaponSystem';
import { TacticalCameraRig } from './cameraRig';
import { CombatController } from './combatController';
import { EngineInputController } from './inputController';
import { installNightshadeInspectApi } from './inspectApi';
import type { InspectCameraOverride, InspectPoseOverride } from './types';

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Modular Nightshade Protocol core engine orchestrator.
 * Delegates input (`EngineInputController`), OTS camera (`TacticalCameraRig`),
 * combat ballistics (`CombatController`), and QA hooks (`inspectApi`) cleanly.
 */
export class NightshadeEngine {
  private readonly container: HTMLElement;
  private readonly onHudUpdate: (snapshot: HudSnapshot) => void;
  private readonly isSoftwareGl: boolean;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly textures: ProceduralTextureSet;
  private readonly audio = new TacticalAudioEngine();
  private readonly hideout: EightFloorHideout;
  private readonly playerRig: CyberpunkOperativeRig;
  private readonly vfx: CombatVfxPool;

  private readonly cameraRig = new TacticalCameraRig();
  private readonly floor08Director: Floor08EncounterDirector;
  private readonly floor07Director: Floor07EncounterDirector;
  private readonly floor06Director: Floor06EncounterDirector;
  private readonly floor05Director: Floor05EncounterDirector;
  private readonly tutorial = new Floor08TutorialMachine();
  private readonly tutorialProps = new Floor08TutorialProps();
  private readonly hitReaction = createPlayerHitReactionState();
  private readonly combat: CombatController;
  private readonly input: EngineInputController;

  // Simulation state
  private phase: GamePhase = 'title';
  private weaponState = createInitialWeaponState();
  private locomotion = createInitialLocomotionState(0, 10.5, 98.0);
  private prevLocX = 0;
  private prevLocZ = 45.5;
  private characterYaw = 0;
  private characterTurnRate = 0;
  private floorBannerText: string | null = null;
  private floorBannerTimer = 0;
  private interactPrompt: string | null = null;
  private interactPromptLocked = false;
  private muted = false;
  private readonly minimapGeomCache = new Map<FloorNumber, MinimapRect[]>();
  private readonly fogGrids = new Map<FloorNumber, FogOfWarGrid>();

  // Loop & timing
  private frameId = 0;
  private disposed = false;
  private lastFrameTime = performance.now();
  private elapsed = 0;
  private hudEmitAccum = 0;
  private vaporSpawnAccum = 0;
  private steamAudioAccum = 0;

  // Scratch vectors (zero GC in render loop)
  private readonly tmpPlayerPos = new THREE.Vector3();
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpNormal = new THREE.Vector3();
  private readonly tmpProj = new THREE.Vector3();
  private readonly tmpVentPosL = new THREE.Vector3();
  private readonly tmpVentPosR = new THREE.Vector3();
  private readonly tmpVentDirL = new THREE.Vector3();
  private readonly tmpVentDirR = new THREE.Vector3();
  private readonly tmpVentUp = new THREE.Vector3();

  private inspectCameraOverride: InspectCameraOverride | null = null;
  private inspectPoseOverride: InspectPoseOverride | null = null;

  private readonly resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f16);
    this.scene.fog = new THREE.FogExp2(0x0a0f16, 0.024);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.44;
    pmrem.dispose();

    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.08, 130);
    this.renderer.setSize(w, h, false);

    this.textures = createProceduralTextures(this.renderer);
    this.hideout = createEightFloorHideout(this.textures, this.scene, this.isSoftwareGl);
    this.scene.add(this.hideout.group);

    const startSpawn = this.hideout.getSpawnPoint(8);
    this.locomotion = createInitialLocomotionState(startSpawn.x, startSpawn.z, startSpawn.y);
    this.characterYaw = startSpawn.yaw;
    this.cameraRig.snapToTitleStart(startSpawn.x, startSpawn.y, startSpawn.z, startSpawn.yaw);

    this.playerRig = new CyberpunkOperativeRig(this.textures);
    this.playerRig.root.position.set(this.locomotion.x, this.locomotion.y, this.locomotion.z);
    this.scene.add(this.playerRig.root);

    this.vfx = new CombatVfxPool(() => this.audio.playCasingClink());
    this.scene.add(this.vfx.group);

    this.prevLocX = startSpawn.x;
    this.prevLocZ = startSpawn.z;

    // Phase 3: Floor 08 Interactive Tutorial props & Floor 08 Encounter Director
    this.tutorialProps.setActive(true);
    this.scene.add(this.tutorialProps.group);

    this.floor08Director = new Floor08EncounterDirector({
      onPlayerHit: (dmg, fromPos, stagger) => this.applyPlayerHit(dmg, fromPos, stagger),
      onWeakpointBreak: (_enemy, result, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, result.shieldShattered);
        this.cameraRig.addTrauma(0.38);
      },
      onEnemyKilled: (enemy, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, enemy.state.tier !== 'normal');
        this.audio.playImpact('explosion');
        if (enemy.state.tier === 'miniboss') {
          this.showFloorBanner(`ZONE MINI-BOSS ELIMINATED · ${enemy.config.displayName}`, 3.6);
        }
      },
      onBossPhase2: (enemy) => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.55);
        this.showFloorBanner(`${enemy.config.displayName} · PHASE 2 OVERDRIVE`, 4.0);
      },
      onBossArrived: (boss) => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.65);
        this.showFloorBanner(
          `FLOOR 08 BOSS INCOMING · ${boss.config.displayName} IN MAIN HALL`,
          4.8
        );
      },
      onFloorCleared: () => {
        this.audio.playConsoleActivate();
        this.showFloorBanner(
          'ALL HOSTILES VANQUISHED · ACTIVATE CONTROL CENTER TO DESCEND TO FLOOR 07',
          6.5
        );
      },
      onTelegraphAudio: (kind) => this.audio.playEnemyTelegraph(kind),
      onFireAudio: (kind) => this.audio.playEnemyFire(kind),
      onKatanaSlashAudio: (heavy) => this.audio.playKatanaSlash(heavy),
      onKatanaWallCarveAudio: (heavy, worldPos) => {
        this.audio.playKatanaWallCarve(heavy);
        const d = Math.hypot(worldPos.x - this.locomotion.x, worldPos.z - this.locomotion.z);
        if (d < 9.5) {
          this.cameraRig.addTrauma(heavy ? 0.22 : 0.11);
        }
      },
      onImpactVfx: (pos, isWp, isExp) => {
        if (isExp) {
          this.vfx.spawnExplosionImpact(pos, false);
          this.audio.playBarrelExplosion();
        } else {
          this.vfx.spawnMetalImpact(pos, this.tmpNormal.set(0, 1, 0), isWp, isWp, 1.2);
        }
      },
      onBanner: (text, duration) => this.showFloorBanner(text, duration),
    });
    this.scene.add(this.floor08Director.group);

    this.floor07Director = new Floor07EncounterDirector({
      onPlayerHit: (dmg, fromPos, stagger) => this.applyPlayerHit(dmg, fromPos, stagger),
      onWeakpointBreak: (_enemy, result, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, result.shieldShattered);
        this.cameraRig.addTrauma(0.38);
      },
      onEnemyKilled: (enemy, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, enemy.state.tier !== 'normal');
        this.audio.playImpact('explosion');
        if (enemy.state.tier === 'miniboss') {
          this.showFloorBanner(`ZONE MINI-BOSS ELIMINATED · ${enemy.config.displayName}`, 3.8);
        }
      },
      onBossPhase2: (enemy) => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.58);
        this.showFloorBanner(`${enemy.config.displayName} · PHASE 2 OVERDRIVE`, 4.2);
      },
      onBossSpawned: () => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.68);
      },
      onFloorCleared: () => {
        this.audio.playConsoleActivate();
      },
      onTelegraphAudio: (kind) => this.audio.playEnemyTelegraph(kind),
      onFireAudio: (kind) => this.audio.playEnemyFire(kind),
      onKatanaSlashAudio: (heavy) => this.audio.playKatanaSlash(heavy),
      onKatanaWallCarveAudio: (heavy, worldPos) => {
        this.audio.playKatanaWallCarve(heavy);
        const d = Math.hypot(worldPos.x - this.locomotion.x, worldPos.z - this.locomotion.z);
        if (d < 9.5) {
          this.cameraRig.addTrauma(heavy ? 0.22 : 0.11);
        }
      },
      onImpactVfx: (pos, isWp, isExp) => {
        if (isExp) {
          this.vfx.spawnExplosionImpact(pos, false);
          this.audio.playBarrelExplosion();
        } else {
          this.vfx.spawnMetalImpact(pos, this.tmpNormal.set(0, 1, 0), isWp, isWp, 1.2);
        }
      },
      onBanner: (text, duration) => this.showFloorBanner(text, duration),
    });
    this.floor07Director.manager.setVisible(false);
    this.scene.add(this.floor07Director.group);

    this.floor06Director = new Floor06EncounterDirector({
      onPlayerHit: (dmg, fromPos, stagger) => this.applyPlayerHit(dmg, fromPos, stagger),
      onWeakpointBreak: (_enemy, result, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, result.shieldShattered);
        this.cameraRig.addTrauma(0.38);
      },
      onEnemyKilled: (enemy, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, enemy.state.tier !== 'normal');
        this.audio.playImpact('explosion');
        if (enemy.state.tier === 'miniboss') {
          this.showFloorBanner(`ZONE MINI-BOSS ELIMINATED · ${enemy.config.displayName}`, 3.8);
        }
      },
      onBossPhase2: (enemy) => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.58);
        this.showFloorBanner(`${enemy.config.displayName} · PHASE 2 OVERDRIVE`, 4.2);
      },
      onBossSpawned: () => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.68);
      },
      onFloorCleared: () => {
        this.audio.playConsoleActivate();
      },
      onTelegraphAudio: (kind) => this.audio.playEnemyTelegraph(kind),
      onFireAudio: (kind) => this.audio.playEnemyFire(kind),
      onKatanaSlashAudio: (heavy) => this.audio.playKatanaSlash(heavy),
      onKatanaWallCarveAudio: (heavy, worldPos) => {
        this.audio.playKatanaWallCarve(heavy);
        const d = Math.hypot(worldPos.x - this.locomotion.x, worldPos.z - this.locomotion.z);
        if (d < 9.5) {
          this.cameraRig.addTrauma(heavy ? 0.22 : 0.11);
        }
      },
      onImpactVfx: (pos, isWp, isExp) => {
        if (isExp) {
          this.vfx.spawnExplosionImpact(pos, false);
          this.audio.playBarrelExplosion();
        } else {
          this.vfx.spawnMetalImpact(pos, this.tmpNormal.set(0, 1, 0), isWp, isWp, 1.2);
        }
      },
      onBanner: (text, duration) => this.showFloorBanner(text, duration),
    });
    this.floor06Director.manager.setVisible(false);
    this.scene.add(this.floor06Director.group);

    this.floor05Director = new Floor05EncounterDirector({
      onPlayerHit: (dmg, fromPos, stagger) => this.applyPlayerHit(dmg, fromPos, stagger),
      onWeakpointBreak: (_enemy, result, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, result.shieldShattered);
        this.cameraRig.addTrauma(0.42);
      },
      onEnemyKilled: (enemy, worldPos) => {
        this.vfx.spawnExplosionImpact(worldPos, enemy.state.tier !== 'normal');
        this.audio.playImpact('explosion');
        if (enemy.state.tier === 'miniboss') {
          this.showFloorBanner(`ZONE MINI-BOSS ELIMINATED · ${enemy.config.displayName}`, 3.8);
        }
      },
      onBossPhase2: (enemy) => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.62);
        this.showFloorBanner(`${enemy.config.displayName} · PHASE 2 APEX OVERDRIVE`, 4.2);
      },
      onBossSpawned: () => {
        this.audio.playBossAlert();
        this.cameraRig.addTrauma(0.72);
      },
      onFloorCleared: () => {
        this.audio.playConsoleActivate();
      },
      onTelegraphAudio: (kind) => this.audio.playEnemyTelegraph(kind),
      onFireAudio: (kind) => this.audio.playEnemyFire(kind),
      onKatanaSlashAudio: (heavy) => this.audio.playKatanaSlash(heavy),
      onKatanaWallCarveAudio: (heavy, worldPos) => {
        this.audio.playKatanaWallCarve(heavy);
        const d = Math.hypot(worldPos.x - this.locomotion.x, worldPos.z - this.locomotion.z);
        if (d < 9.5) {
          this.cameraRig.addTrauma(heavy ? 0.24 : 0.12);
        }
      },
      onImpactVfx: (pos, isWp, isExp) => {
        if (isExp) {
          this.vfx.spawnExplosionImpact(pos, false);
          this.audio.playBarrelExplosion();
        } else {
          this.vfx.spawnMetalImpact(pos, this.tmpNormal.set(0, 1, 0), isWp, isWp, 1.25);
        }
      },
      onBanner: (text, duration) => this.showFloorBanner(text, duration),
    });
    this.floor05Director.manager.setVisible(false);
    this.scene.add(this.floor05Director.group);

    this.combat = new CombatController({
      camera: this.camera,
      cameraRig: this.cameraRig,
      hideout: this.hideout,
      playerRig: this.playerRig,
      vfx: this.vfx,
      audio: this.audio,
      floor08Director: this.floor08Director,
      floor07Director: this.floor07Director,
      floor06Director: this.floor06Director,
      floor05Director: this.floor05Director,
      tutorialProps: this.tutorialProps,
      onTutorialRelayShot: () => {
        if (this.tutorial.recordRelayShot()) {
          this.audio.playTutorialStepComplete();
        }
        this.checkTutorialCompletionRespawn();
        this.emitHud();
      },
      showBanner: (text, duration) => this.showFloorBanner(text, duration),
      emitHud: () => this.emitHud(),
    });

    this.input = new EngineInputController(this.renderer.domElement, {
      getPhase: () => this.phase,
      getActiveWeapon: () => this.weaponState.activeWeapon,
      onStart: () => this.start(),
      onPause: () => this.pause(),
      onResume: () => this.resume(),
      onToggleMute: () => this.setMuted(!this.muted),
      onToggleShoulder: () => {
        this.cameraRig.toggleShoulder();
        this.emitHud();
      },
      onInteract: () => {
        this.tryInteract();
      },
      onSelectWeapon: (weapon) => this.selectWeapon(weapon),
      onWarpToFloor: (floor) => this.warpToFloor(floor),
      onLookDelta: (dYaw, dPitch) => this.cameraRig.applyLookDelta(dYaw, dPitch),
      onAudioUnlock: () => this.audio.unlock(),
      onHudDirty: () => this.emitHud(),
      onSkipTutorial: () => this.skipTutorial(),
    });

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.input.bind();

    installNightshadeInspectApi({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      hideout: this.hideout,
      playerRig: this.playerRig,
      vfx: this.vfx,
      audio: this.audio,
      cameraRig: this.cameraRig,
      combat: this.combat,
      input: this.input,
      floor08Director: this.floor08Director,
      floor07Director: this.floor07Director,
      floor06Director: this.floor06Director,
      floor05Director: this.floor05Director,
      tutorial: this.tutorial,
      hitReaction: this.hitReaction,
      getLocomotion: () => this.locomotion,
      getWeaponState: () => this.weaponState,
      getCharacterYaw: () => this.characterYaw,
      setCharacterYaw: (yaw) => {
        this.characterYaw = yaw;
      },
      setCameraOverride: (ov) => {
        this.inspectCameraOverride = ov;
      },
      setPoseOverride: (pose) => {
        this.inspectPoseOverride = pose;
      },
      start: () => this.start(),
      skipTutorial: () => this.skipTutorial(),
      completeTutorialAndDeploy: () => {
        this.tutorial.forceComplete();
        this.checkTutorialCompletionRespawn();
      },
      applyPlayerHit: (dmg, fromPos, stagger) => this.applyPlayerHit(dmg, fromPos, stagger),
      warpToFloor: (floor) => this.warpToFloor(floor),
      tryInteract: () => this.tryInteract(),
      showBanner: (text, duration) => this.showFloorBanner(text, duration),
      stepSimulation: (dt) => this.stepSimulation(dt),
      updateCamera: (dt) => this.updateCamera(dt),
      emitHud: () => this.emitHud(),
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.start();
    } else {
      document.body.dataset.state = 'title';
      this.emitHud();
    }

    this.lastFrameTime = performance.now();
    this.tick();
  }

  private handleResize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // --- Public Control API for React Shell ---

  public start(): void {
    this.audio.unlock();
    this.audio.setAmbientActive(true);
    this.phase = 'playing';
    this.combat.combatReadyTimer = 0;
    this.input.clearInputs();
    this.cameraRig.snapToGameStart(this.locomotion.x, this.locomotion.y, this.locomotion.z);
    (document.activeElement as HTMLElement | null)?.blur?.();
    document.body.dataset.state = 'playing';
    this.emitHud();
  }

  public pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.input.clearInputs();
    this.audio.setAmbientActive(false);
    document.exitPointerLock?.();
    document.body.dataset.state = 'paused';
    this.emitHud();
  }

  public resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.input.clearInputs();
    this.audio.setAmbientActive(true);
    (document.activeElement as HTMLElement | null)?.blur?.();
    document.body.dataset.state = 'playing';
    this.emitHud();
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.combat.combatReadyTimer = 0;
    this.input.clearInputs();
    this.audio.setAmbientActive(false);
    document.exitPointerLock?.();
    document.body.dataset.state = 'title';
    this.emitHud();
  }

  public resetRange(): void {
    this.hideout.resetAll();
    this.weaponState = createInitialWeaponState();
    const startSpawn = this.hideout.getSpawnPoint(8);
    this.locomotion = createInitialLocomotionState(startSpawn.x, startSpawn.z, startSpawn.y);
    this.prevLocX = startSpawn.x;
    this.prevLocZ = startSpawn.z;
    this.characterYaw = startSpawn.yaw;
    this.cameraRig.yaw = startSpawn.yaw;
    this.cameraRig.pitch = -0.04;
    this.combat.reset();
    Object.assign(this.hitReaction, createPlayerHitReactionState());
    this.tutorial.reset();
    this.tutorialProps.setActive(true);
    this.floor08Director.resetToTutorialHold();
    this.floor07Director.reset();
    this.floor06Director.reset();
    this.floor05Director.reset();
    this.fogGrids.clear();
    this.floorBannerText = null;
    this.floorBannerTimer = 0;
    this.interactPrompt = null;
    this.interactPromptLocked = false;
    this.emitHud();
  }

  public skipTutorial(): void {
    if (!this.tutorial.active) return;
    this.tutorial.skip();
    this.checkTutorialCompletionRespawn();
  }

  /**
   * Centralized incoming hit handler (Invulnerable Testing Phase):
   * NEVER reduces player HP or kills the operative, while triggering directional red/amber
   * damage vignette flash, camera roll/trauma kick, body flinch animation, and armor crunch SFX!
   */
  public applyPlayerHit(
    damage: number,
    fromWorldPos: THREE.Vector3,
    staggerStrength = 0.65
  ): void {
    if (this.phase !== 'playing') return;
    const impact = applyPlayerHitReaction(
      this.hitReaction,
      damage,
      fromWorldPos.x,
      fromWorldPos.z,
      this.locomotion.x,
      this.locomotion.z,
      this.cameraRig.yaw,
      staggerStrength
    );
    this.cameraRig.applyDamageImpulse(impact.trauma, impact.cameraRollKick);
    this.audio.playPlayerHitArmor(staggerStrength);
    this.emitHud();
  }

  private checkTutorialCompletionRespawn(): void {
    if (!this.tutorial.consumeRespawnPending()) return;
    // Cleanly respawn operative at Floor 08 Entry Gate, reset doors/barrels/ammo, and deploy Floor 08 Live Combat!
    this.hideout.resetAll();
    Object.assign(this.hitReaction, createPlayerHitReactionState());
    this.tutorialProps.setActive(false);
    this.weaponState = createInitialWeaponState();
    const gateSpawn = this.hideout.getSpawnPoint(8);
    this.locomotion = createInitialLocomotionState(gateSpawn.x, gateSpawn.z, gateSpawn.y);
    this.prevLocX = gateSpawn.x;
    this.prevLocZ = gateSpawn.z;
    this.characterYaw = gateSpawn.yaw;
    this.playerRig.root.position.set(gateSpawn.x, gateSpawn.y, gateSpawn.z);
    this.playerRig.root.rotation.y = gateSpawn.yaw;
    this.cameraRig.snapToFloorSpawn(gateSpawn.x, gateSpawn.y, gateSpawn.z, gateSpawn.yaw);

    this.floor08Director.startLiveCombat();
    this.fogGrids.delete(8);
    this.audio.playBossAlert();
    this.cameraRig.addTrauma(0.32);
    this.showFloorBanner('COMBAT PROTOCOL LIVE · VANQUISH ALL FLOOR 08 HOSTILES', 4.4);
    this.emitHud();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.audio.setMuted(muted);
    this.emitHud();
  }

  public selectWeapon(target: WeaponId): void {
    if (switchWeapon(this.weaponState, target)) {
      this.audio.playReloadEvent('swap');
      if (this.tutorial.active && this.tutorial.recordWeaponSwap()) {
        this.audio.playTutorialStepComplete();
      }
      this.emitHud();
    }
  }

  private showFloorBanner(text: string, duration = 3.2): void {
    this.floorBannerText = text;
    this.floorBannerTimer = duration;
  }

  private warpToFloor(floor: FloorNumber): void {
    const sp = this.hideout.teleportToFloor(floor);
    this.locomotion.x = sp.x;
    this.locomotion.y = sp.y;
    this.locomotion.z = sp.z;
    this.locomotion.supportY = sp.y;
    this.locomotion.vx = 0;
    this.locomotion.vy = 0;
    this.locomotion.vz = 0;
    this.locomotion.grounded = true;
    this.characterYaw = sp.yaw;
    this.playerRig.root.position.set(sp.x, sp.y, sp.z);
    this.playerRig.root.rotation.y = sp.yaw;
    this.cameraRig.snapToFloorSpawn(sp.x, sp.y, sp.z, sp.yaw);
    const meta = FLOOR_CATALOG[floor];
    if (floor === 7) {
      if (this.tutorial.active) {
        this.tutorial.skip();
        this.tutorial.consumeRespawnPending();
        this.tutorialProps.setActive(false);
      }
      this.floor07Director.manager.setVisible(true);
      this.floor08Director.manager.setVisible(false);
      this.floor06Director.manager.setVisible(false);
      this.floor05Director.manager.setVisible(false);
      if (!this.floor07Director.progression.liveCombatActive) {
        this.floor07Director.startLiveCombat();
        this.audio.playBossAlert();
      } else {
        this.showFloorBanner(`FLOOR ${meta.code} · ${meta.name}`, 3.4);
      }
    } else if (floor === 6) {
      if (this.tutorial.active) {
        this.tutorial.skip();
        this.tutorial.consumeRespawnPending();
        this.tutorialProps.setActive(false);
      }
      this.floor06Director.manager.setVisible(true);
      this.floor07Director.manager.setVisible(false);
      this.floor08Director.manager.setVisible(false);
      this.floor05Director.manager.setVisible(false);
      if (!this.floor06Director.progression.liveCombatActive) {
        this.floor06Director.startLiveCombat();
        this.audio.playBossAlert();
      } else {
        this.showFloorBanner(`FLOOR ${meta.code} · ${meta.name}`, 3.4);
      }
    } else if (floor === 5) {
      if (this.tutorial.active) {
        this.tutorial.skip();
        this.tutorial.consumeRespawnPending();
        this.tutorialProps.setActive(false);
      }
      this.floor05Director.manager.setVisible(true);
      this.floor06Director.manager.setVisible(false);
      this.floor07Director.manager.setVisible(false);
      this.floor08Director.manager.setVisible(false);
      if (!this.floor05Director.progression.liveCombatActive) {
        this.floor05Director.startLiveCombat();
        this.audio.playBossAlert();
      } else {
        this.showFloorBanner(`FLOOR ${meta.code} · ${meta.name}`, 3.4);
      }
    } else {
      this.floor05Director.manager.setVisible(false);
      this.showFloorBanner(`FLOOR ${meta.code} · ${meta.name}`, 3.4);
    }
    this.emitHud();
  }

  private checkFloorControlCenterGate(floorNumber: number): { allowed: boolean; reason: string | null } {
    if (floorNumber === 5) {
      return canUseFloor05ControlCenter(this.floor05Director.progression);
    }
    if (floorNumber === 6) {
      return canUseFloor06ControlCenter(this.floor06Director.progression);
    }
    if (floorNumber === 7) {
      return canUseFloor07ControlCenter(this.floor07Director.progression);
    }
    return canUseFloorControlCenter(floorNumber, this.tutorial.active, this.floor08Director.progression);
  }

  private tryInteract(): boolean {
    if (
      this.tutorial.active &&
      this.tutorialProps.isNearArmingPedestal(
        this.locomotion.x,
        this.locomotion.y,
        this.locomotion.z
      )
    ) {
      this.audio.playConsoleActivate();
      this.tutorial.forceComplete();
      this.checkTutorialCompletionRespawn();
      return true;
    }

    const nearBefore = this.hideout.getNearbyInteraction(
      this.locomotion.x,
      this.locomotion.y,
      this.locomotion.z
    );
    if (nearBefore?.kind === 'control_center' && !nearBefore.activated) {
      const gate = this.checkFloorControlCenterGate(nearBefore.floor);
      if (!gate.allowed) {
        this.audio.playLockedBuzzer();
        this.cameraRig.addTrauma(0.14);
        this.showFloorBanner(
          `CONTROL CENTER DISABLED · ${gate.reason ?? 'ALL ENEMIES MUST BE VANQUISHED FIRST'}`,
          3.4
        );
        this.emitHud();
        return true;
      }
    }

    const res = this.hideout.triggerInteraction(
      this.locomotion.x,
      this.locomotion.y,
      this.locomotion.z
    );
    if (!res) {
      if (nearBefore?.isLockedGate) {
        this.audio.playLockedBuzzer();
        this.showFloorBanner(nearBefore.prompt, 2.4);
        this.emitHud();
        return true;
      }
      return false;
    }
    if (res.kind === 'control_center') {
      this.audio.playConsoleActivate();
      this.audio.playBulkheadDoorOpen();
      this.cameraRig.addTrauma(0.34);
      if (this.tutorial.active && this.tutorial.recordInteract()) {
        this.audio.playTutorialStepComplete();
        this.checkTutorialCompletionRespawn();
      }
      this.showFloorBanner(
        res.floor === 1
          ? 'FINAL CORE VAULT 01 UNSEALED · ENTER INNER SANCTUM'
          : `BULKHEAD 0${res.floor} UNSEALED · DESCENT TO FLOOR 0${res.floor - 1}`,
        3.6
      );
      this.emitHud();
      return true;
    }
    if (res.kind === 'world_switch') {
      this.audio.playConsoleActivate();
      if (res.deployedBridge) this.audio.playBridgeDeploy();
      if (res.unlockedGate) this.audio.playTacticalDoorSlide(true);
      this.cameraRig.addTrauma(0.16);
      if (this.tutorial.active && this.tutorial.recordInteract()) {
        this.audio.playTutorialStepComplete();
        this.checkTutorialCompletionRespawn();
      }
      if (res.bannerText) {
        this.showFloorBanner(res.bannerText, 3.2);
      }
      this.emitHud();
      return true;
    }
    return false;
  }

  // --- Core Game Simulation & Render Loop ---

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.stepSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private stepSimulation(dt: number): void {
    this.elapsed += dt;

    this.combat.stepTimers(dt);
    stepPlayerHitReaction(this.hitReaction, dt);
    this.cameraRig.stepDecay(
      dt,
      this.weaponState.activeWeapon,
      this.weaponState.smg.heat,
      this.weaponState.smg.overheated
    );

    if (this.combat.consumeHitstop(dt)) {
      this.updateCamera(dt);
      return;
    }

    if (this.floorBannerTimer > 0) {
      this.floorBannerTimer = Math.max(0, this.floorBannerTimer - dt);
      if (this.floorBannerTimer === 0) this.floorBannerText = null;
    }

    if (this.phase === 'title') {
      this.tmpPlayerPos.set(this.locomotion.x, this.locomotion.y, this.locomotion.z);
      this.hideout.update(dt, this.elapsed, this.tmpPlayerPos, this.camera.position);
      this.playerRig.root.position.set(this.locomotion.x, this.locomotion.y, this.locomotion.z);
      this.playerRig.root.rotation.y = this.inspectCameraOverride ? 0 : 0.24;
      this.playerRig.update({
        dt,
        elapsed: this.elapsed,
        locomotion: this.locomotion,
        aimPitch: 0,
        ads: false,
        combatReady: false,
        activeWeapon: 'pistol',
        swapFromWeapon: 'pistol',
        swapProgress: 0,
        recoilKick: 0,
        pistolReloadPhase: 'idle',
        pistolReloadProgress: 0,
        heavyReloading: false,
        heavyReloadProgress: 0,
        smgHeatRatio: 0,
        smgVenting: false,
        smgOverheated: false,
        heroTitlePose: true,
      });
      this.cameraRig.updateTitleCamera(
        this.camera,
        dt,
        this.elapsed,
        this.locomotion.y,
        this.locomotion.z,
        this.inspectCameraOverride
      );
      return;
    }

    if (this.phase === 'paused') return;

    // --- PLAYING PHASE ---
    const keys = this.input.keysHeld;
    const turnSpeed = 1.85;
    if (keys.has('ArrowLeft')) this.cameraRig.yaw += turnSpeed * dt;
    if (keys.has('ArrowRight')) this.cameraRig.yaw -= turnSpeed * dt;

    const moveForward =
      (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
      (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const moveRight = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);

    const sprintHeld = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const crouchHeld =
      keys.has('KeyC') || keys.has('ControlLeft') || keys.has('ControlRight');

    stepLocomotion(this.locomotion, {
      dt,
      moveForward,
      moveRight,
      cameraYaw: this.cameraRig.yaw,
      sprintHeld,
      crouchHeld,
      adsHeld: this.input.adsHeld,
      jumpJustPressed: this.input.jumpJustPressed,
      jumpHeld: keys.has('Space'),
      rollJustPressed: this.input.rollJustPressed,
      colliders: [],
      bounds: this.hideout.activeCollisionWorld.bounds,
      world3D: this.hideout.activeCollisionWorld,
    });

    if (this.locomotion.stepTrigger) {
      this.audio.playFootstep(this.locomotion.sprinting);
    }
    if (this.locomotion.jumpTrigger) {
      this.audio.playJumpLaunch();
      this.vfx.spawnJumpDustRing(
        this.tmpVecA.set(this.locomotion.x, this.locomotion.y, this.locomotion.z),
        0.72,
        false
      );
    }
    if (this.locomotion.landTrigger) {
      this.audio.playLandingImpact(this.locomotion.landingImpact);
      this.vfx.spawnJumpDustRing(
        this.tmpVecA.set(this.locomotion.x, this.locomotion.y, this.locomotion.z),
        this.locomotion.landingImpact,
        true
      );
      this.cameraRig.addTrauma(this.locomotion.landingImpact * 0.22);
    }
    if (this.locomotion.rollContactTrigger) {
      this.audio.playLandingImpact(0.58);
      this.vfx.spawnJumpDustRing(
        this.tmpVecA.set(this.locomotion.x, this.locomotion.y, this.locomotion.z),
        0.58,
        true
      );
      this.cameraRig.addTrauma(0.12);
    }

    // Track Floor 08 interactive tutorial locomotion, jump, roll, and ADS signals
    if (this.tutorial.active) {
      const moved = Math.hypot(this.locomotion.x - this.prevLocX, this.locomotion.z - this.prevLocZ);
      let advanced = false;
      if (moved > 0.002) {
        advanced = this.tutorial.recordMovement(moved, this.locomotion.sprinting) || advanced;
      }
      if (this.input.adsHeld) {
        advanced = this.tutorial.recordAds() || advanced;
      }
      if (this.locomotion.jumpTrigger) {
        advanced = this.tutorial.recordJump() || advanced;
      }
      if (this.locomotion.rollTimer > 0) {
        advanced = this.tutorial.recordDodgeRoll() || advanced;
      }
      if (advanced) {
        this.audio.playTutorialStepComplete();
      }
    }
    this.prevLocX = this.locomotion.x;
    this.prevLocZ = this.locomotion.z;

    const weaponRes = stepWeaponSystem(this.weaponState, {
      dt,
      fireHeld: this.input.fireHeld,
      fireJustPressed: this.input.fireJustPressed,
      reloadJustPressed: this.input.reloadJustPressed,
      ads: this.input.adsHeld,
      movingSpeedRatio: this.locomotion.speedRatio,
      crouching: this.locomotion.crouching,
    });
    this.input.consumeOneShotFlags();

    for (const ev of weaponRes.events) {
      if (ev === 'pistol_reload_start') this.audio.playReloadEvent('pistol_start');
      if (ev === 'pistol_perfect_reload') this.audio.playReloadEvent('pistol_perfect');
      if (ev === 'pistol_jam') this.audio.playReloadEvent('pistol_jam');
      if (ev === 'pistol_reload_done') this.audio.playReloadEvent('pistol_done');
      if (ev === 'heavy_reload_start') this.audio.playReloadEvent('heavy_start');
      if (ev === 'heavy_reload_done') this.audio.playReloadEvent('heavy_done');
      if (ev === 'smg_vent_start') {
        this.audio.playReloadEvent('smg_vent');
        this.cameraRig.frostPulse = Math.max(this.cameraRig.frostPulse, 0.55);
      }
      if (ev === 'smg_flash_cool') {
        this.audio.playReloadEvent('smg_flash');
        this.cameraRig.frostPulse = 1.0;
      }
      if (ev === 'smg_overheat') {
        this.audio.playReloadEvent('smg_overheat');
        this.cameraRig.addTrauma(0.24);
      }
      if (ev === 'dry_fire') this.audio.playReloadEvent('dry_fire');
      if (
        this.tutorial.active &&
        (ev === 'pistol_reload_start' ||
          ev === 'pistol_perfect_reload' ||
          ev === 'smg_vent_start' ||
          ev === 'smg_flash_cool' ||
          ev === 'heavy_reload_start')
      ) {
        if (this.tutorial.recordReloadOrVent()) {
          this.audio.playTutorialStepComplete();
        }
      }
    }

    const canPickHeavyAmmo =
      this.weaponState.heavy.reserveAmmo < this.weaponState.heavy.maxReserveAmmo;
    const lootedCrate = tryCollectAmmoCrate(
      this.hideout.activeAmmoCrates,
      this.locomotion.x,
      this.locomotion.z,
      canPickHeavyAmmo,
      undefined,
      this.locomotion.y
    );
    if (lootedCrate) {
      const added = addHeavyAmmo(this.weaponState, HEAVY_CONFIG.cratePickupAmount);
      if (added > 0) {
        this.audio.playAmmoPickup();
        this.tmpVecA.set(lootedCrate.position.x, lootedCrate.position.y + 0.45, lootedCrate.position.z);
        this.vfx.spawnSparks(this.tmpVecA, this.tmpNormal.set(0, 1, 0), 14, false, 0.72);
        this.emitHud();
      }
    }

    if (weaponRes.fired) {
      this.combat.combatReadyTimer = 1.6;
    }

    const smgIsSteaming =
      this.weaponState.activeWeapon === 'smg' &&
      (this.weaponState.smg.venting ||
        this.weaponState.smg.overheated ||
        this.weaponState.smg.heat >= 82);
    if (smgIsSteaming) {
      const isCritOverheat = this.weaponState.smg.overheated || this.weaponState.smg.heat >= 90;
      const emitInterval = isCritOverheat ? 0.036 : 0.05;
      this.vaporSpawnAccum += dt;
      if (this.vaporSpawnAccum >= emitInterval) {
        this.vaporSpawnAccum = 0;
        this.playerRig.getSmgVentWorldBasis(
          this.tmpVentPosL,
          this.tmpVentPosR,
          this.tmpVentDirL,
          this.tmpVentDirR,
          this.tmpVentUp
        );
        this.vfx.spawnOverheatSteamAndSparks(
          this.tmpVentPosL,
          this.tmpVentPosR,
          this.tmpVentDirL,
          this.tmpVentDirR,
          this.tmpVentUp,
          isCritOverheat,
          this.weaponState.smg.overheated ? 1.25 : 0.9
        );
      }
      this.steamAudioAccum += dt;
      if (this.steamAudioAccum >= (isCritOverheat ? 0.24 : 0.36)) {
        this.steamAudioAccum = 0;
        this.audio.playOverheatSteam(isCritOverheat);
      }
    } else {
      this.steamAudioAccum = 0.2;
    }

    this.syncPlayerRig(dt, moveForward, moveRight);

    if (weaponRes.fired) {
      if (this.tutorial.active && this.tutorial.recordFire()) {
        this.audio.playTutorialStepComplete();
      }
      this.combat.handleWeaponFired(
        weaponRes.fired.weapon,
        weaponRes.fired.damage,
        weaponRes.fired.overcharged,
        weaponRes.fired.spreadRad,
        weaponRes.fired.recoilPitch,
        weaponRes.fired.recoilYaw,
        weaponRes.fired.heatRatio
      );
    }

    this.checkTutorialCompletionRespawn();
    this.tutorialProps.update(this.elapsed, this.tutorial.stepId, this.tutorial.signals);

    this.tmpPlayerPos.set(this.locomotion.x, this.locomotion.y, this.locomotion.z);
    const curFloorNum = this.hideout.getCurrentFloorMeta().number;
    const onFloor8 = curFloorNum === 8;
    const onFloor7 = curFloorNum === 7;
    const onFloor6 = curFloorNum === 6;
    const onFloor5 = curFloorNum === 5;
    this.floor08Director.update(
      dt,
      this.elapsed,
      this.tmpPlayerPos,
      this.locomotion.grounded,
      this.locomotion.rollTimer > 0,
      this.hideout.activeCollisionWorld,
      onFloor8,
      this.camera.position
    );
    this.floor07Director.update(
      dt,
      this.elapsed,
      this.tmpPlayerPos,
      this.locomotion.grounded,
      this.locomotion.rollTimer > 0,
      this.hideout.activeCollisionWorld,
      onFloor7,
      this.camera.position
    );
    this.floor06Director.update(
      dt,
      this.elapsed,
      this.tmpPlayerPos,
      this.locomotion.grounded,
      this.locomotion.rollTimer > 0,
      this.hideout.activeCollisionWorld,
      onFloor6,
      this.camera.position
    );
    this.floor05Director.update(
      dt,
      this.elapsed,
      this.tmpPlayerPos,
      this.locomotion.grounded,
      this.locomotion.rollTimer > 0,
      this.hideout.activeCollisionWorld,
      onFloor5,
      this.camera.position
    );
    const streamEvents = this.hideout.update(dt, this.elapsed, this.tmpPlayerPos, this.camera.position);
    for (let i = 0; i < streamEvents.length; i++) {
      const ev = streamEvents[i];
      if (ev.kind === 'arrived_floor') {
        const meta = FLOOR_CATALOG[ev.floor];
        if (ev.floor === 7 && !this.floor07Director.progression.liveCombatActive) {
          this.floor07Director.startLiveCombat();
          this.audio.playBossAlert();
        } else if (ev.floor === 6 && !this.floor06Director.progression.liveCombatActive) {
          this.floor06Director.startLiveCombat();
          this.audio.playBossAlert();
        } else if (ev.floor === 5 && !this.floor05Director.progression.liveCombatActive) {
          this.floor05Director.startLiveCombat();
          this.audio.playBossAlert();
        } else {
          this.showFloorBanner(`FLOOR ${meta.code} · ${meta.name}`, 3.5);
        }
      } else if (ev.kind === 'door_closing') {
        this.audio.playBulkheadDoorClose();
        this.cameraRig.addTrauma(0.28);
      } else if (ev.kind === 'tactical_door_open') {
        this.audio.playTacticalDoorSlide(true);
      } else if (ev.kind === 'tactical_door_close') {
        this.audio.playTacticalDoorSlide(false);
      } else if (ev.kind === 'tactical_door_jam') {
        this.audio.playJammedShutterClunk();
        this.cameraRig.addTrauma(0.1);
      } else if (ev.kind === 'jump_pad_launch') {
        this.locomotion.vy = ev.launchVy ?? 13.4;
        this.locomotion.vx = ev.launchVx ?? 0;
        this.locomotion.vz = ev.launchVz ?? 0;
        this.locomotion.launchPadTimer = 1.65;
        this.locomotion.jumpHoldTimer = 0;
        this.locomotion.airTime = 0;
        this.locomotion.grounded = false;
        this.audio.playJumpPadLaunch();
        this.cameraRig.addTrauma(0.18);
        this.tmpVecA.set(this.locomotion.x, this.locomotion.y + 0.08, this.locomotion.z);
        this.vfx.spawnJumpDustRing(this.tmpVecA, 1.45);
      }
    }

    // Sync 3D Floor Control Center disabled / ready-beacon / activated visuals
    const activeFloorNum = this.hideout.getCurrentFloorMeta().number as FloorNumber;
    const activeFloorRig = this.hideout.floors[activeFloorNum];
    if (activeFloorRig) {
      const ccGate = this.checkFloorControlCenterGate(activeFloorNum);
      const ccMode = activeFloorRig.controlCenter.activated
        ? 'activated'
        : ccGate.allowed
          ? 'ready'
          : 'disabled';
      activeFloorRig.controlCenter.setLockoutState(ccMode);
    }

    const near = this.hideout.getNearbyInteraction(
      this.locomotion.x,
      this.locomotion.y,
      this.locomotion.z
    );
    const nearTutorialArming =
      this.tutorial.active &&
      this.tutorialProps.isNearArmingPedestal(
        this.locomotion.x,
        this.locomotion.y,
        this.locomotion.z
      );
    let nextPrompt: string | null = null;
    let nextPromptLocked = false;
    if (nearTutorialArming) {
      nextPrompt = '[E] ARM FLOOR 08 COMBAT PROTOCOL';
    } else if (near) {
      if (near.kind === 'control_center' && !near.activated) {
        const gate = this.checkFloorControlCenterGate(near.floor);
        if (!gate.allowed) {
          nextPrompt = `CONTROL CENTER DISABLED · ${gate.reason ?? 'ALL ENEMIES MUST BE VANQUISHED FIRST'}`;
          nextPromptLocked = true;
        } else {
          nextPrompt =
            near.floor === 1
              ? '[E] ACTIVATE CONTROL CENTER · UNSEAL FINAL CORE VAULT 01'
              : `[E] ACTIVATE CONTROL CENTER · DESCEND TO FLOOR 0${near.floor - 1}`;
        }
      } else {
        nextPrompt = near.prompt;
        nextPromptLocked = Boolean(near.isLockedGate);
      }
    }
    const promptChanged =
      nextPrompt !== this.interactPrompt || nextPromptLocked !== this.interactPromptLocked;
    this.interactPrompt = nextPrompt;
    this.interactPromptLocked = nextPromptLocked;

    this.vfx.update(dt, this.locomotion.supportY);
    this.updateCamera(dt);

    this.hudEmitAccum += dt;
    if (
      this.hudEmitAccum >= 0.05 ||
      weaponRes.fired ||
      weaponRes.events.length > 0 ||
      streamEvents.length > 0 ||
      promptChanged
    ) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private syncPlayerRig(dt: number, moveForward: number, moveRight: number): void {
    if (this.inspectPoseOverride) {
      const ov = this.inspectPoseOverride;
      const loco = {
        ...this.locomotion,
        localMoveX: ov.localMoveX ?? 0,
        localMoveZ: ov.localMoveZ ?? 0,
        gaitPhase: ov.gaitPhase ?? 0,
        speedRatio: ov.speedRatio ?? Math.min(1, Math.hypot(ov.localMoveX ?? 0, ov.localMoveZ ?? 0)),
        grounded: ov.grounded ?? true,
        y: ov.y ?? (ov.grounded === false ? 0.58 : 0),
        vy: ov.vy ?? 0,
        airTime: ov.airTime ?? 0,
        landingTimer: ov.landingTimer ?? 0,
        landingDuration: ov.landingDuration ?? 0.36,
        landingImpact: ov.landingImpact ?? 0.85,
        supportY: ov.supportY ?? 0,
        jumpLocalX: ov.jumpLocalX ?? 0,
        jumpLocalZ: ov.jumpLocalZ ?? 0,
        rollTimer: ov.rollTimer ?? 0,
        rollLocalX: ov.rollLocalX ?? 0,
        rollLocalZ: ov.rollLocalZ ?? 1,
        crouching: ov.crouching ?? false,
        sprinting: ov.sprinting ?? false,
      };
      this.playerRig.root.position.set(
        this.locomotion.x,
        ov.y ?? (ov.grounded === false ? 0.58 : 0),
        this.locomotion.z
      );
      this.playerRig.root.rotation.y = 0;
      const poseInput = {
        dt: 0.05,
        elapsed: this.elapsed,
        locomotion: loco,
        aimPitch: 0,
        ads: ov.ads ?? false,
        combatReady: ov.combatReady ?? false,
        freeFacing: ov.freeFacing ?? false,
        turnRate: 0,
        activeWeapon: ov.weapon ?? this.weaponState.activeWeapon,
        swapFromWeapon: ov.swapFromWeapon ?? this.weaponState.swapFromWeapon,
        swapProgress: ov.swapProgress ?? 0,
        recoilKick: 0,
        pistolReloadPhase: 'idle' as const,
        pistolReloadProgress: 0,
        heavyReloading: false,
        heavyReloadProgress: 0,
        smgHeatRatio: this.weaponState.smg.heat / 100,
        smgVenting: this.weaponState.smg.venting,
        smgOverheated: this.weaponState.smg.overheated,
        heroTitlePose: ov.heroTitlePose ?? false,
      };
      for (let k = 0; k < 14; k++) {
        this.playerRig.update(poseInput);
      }
      return;
    }

    const combatMode = this.input.adsHeld || this.combat.combatReadyTimer > 0;
    const horizSpeed = Math.hypot(this.locomotion.vx, this.locomotion.vz);
    const hasMoveInput = Math.abs(moveForward) > 0.05 || Math.abs(moveRight) > 0.05;
    const inJumpPadArc = (this.locomotion.launchPadTimer ?? 0) > 0;
    let targetYaw = this.characterYaw;
    if (combatMode) {
      targetYaw = this.cameraRig.yaw;
    } else if (this.locomotion.rollTimer > 0 && horizSpeed > 0.28) {
      targetYaw = Math.atan2(-this.locomotion.vx, -this.locomotion.vz);
    } else if (!inJumpPadArc && hasMoveInput) {
      const fwdX = -Math.sin(this.cameraRig.yaw);
      const fwdZ = -Math.cos(this.cameraRig.yaw);
      const rightX = Math.cos(this.cameraRig.yaw);
      const rightZ = -Math.sin(this.cameraRig.yaw);
      const wishX = fwdX * moveForward + rightX * moveRight;
      const wishZ = fwdZ * moveForward + rightZ * moveRight;
      targetYaw = Math.atan2(-wishX, -wishZ);
    }

    const yawDiff = ((targetYaw - this.characterYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const yawLambda = combatMode ? 11.5 : 7.8;
    const stepYaw = yawDiff * (1 - Math.exp(-yawLambda * dt));
    this.characterYaw += stepYaw;
    this.characterTurnRate = dt > 0.0001 ? stepYaw / dt : 0;

    const charFwdX = -Math.sin(this.characterYaw);
    const charFwdZ = -Math.cos(this.characterYaw);
    const charRightX = Math.cos(this.characterYaw);
    const charRightZ = -Math.sin(this.characterYaw);
    const charLocalZ = THREE.MathUtils.clamp(
      (this.locomotion.vx * charFwdX + this.locomotion.vz * charFwdZ) / LOCOMOTION_CONFIG.sprintSpeed,
      -1,
      1
    );
    const charLocalX = THREE.MathUtils.clamp(
      (this.locomotion.vx * charRightX + this.locomotion.vz * charRightZ) / LOCOMOTION_CONFIG.sprintSpeed,
      -1,
      1
    );

    this.playerRig.root.position.set(this.locomotion.x, this.locomotion.y, this.locomotion.z);
    this.playerRig.root.rotation.y = this.characterYaw;
    this.playerRig.update({
      dt,
      elapsed: this.elapsed,
      locomotion: { ...this.locomotion, localMoveX: charLocalX, localMoveZ: charLocalZ },
      aimPitch: this.cameraRig.pitch,
      ads: this.input.adsHeld,
      combatReady: this.combat.combatReadyTimer > 0,
      freeFacing: !combatMode,
      turnRate: this.characterTurnRate,
      activeWeapon: this.weaponState.activeWeapon,
      swapFromWeapon: this.weaponState.swapFromWeapon,
      swapProgress: this.weaponState.swapTimer / SWAP_DURATION,
      recoilKick: this.cameraRig.recoilKick,
      pistolReloadPhase: this.weaponState.pistol.reloadPhase,
      pistolReloadProgress: this.weaponState.pistol.reloadProgress,
      heavyReloading: this.weaponState.heavy.reloading,
      heavyReloadProgress: this.weaponState.heavy.reloadProgress,
      smgHeatRatio: this.weaponState.smg.heat / 100,
      smgVenting: this.weaponState.smg.venting,
      smgOverheated: this.weaponState.smg.overheated,
      hitFlinch: getNormalizedFlinchWeight(this.hitReaction),
      hitDirLocalX: this.hitReaction.flinchDirLocalX,
    });
  }

  private updateCamera(dt: number): void {
    this.cameraRig.updateGameplayCamera(
      this.camera,
      dt,
      this.elapsed,
      this.locomotion,
      this.input.adsHeld,
      this.hideout.activeWallMeshes,
      this.inspectCameraOverride
    );
  }

  private getMinimapGeometry(floor: FloorNumber): readonly MinimapRect[] {
    let cached = this.minimapGeomCache.get(floor);
    if (!cached) {
      const f = this.hideout.floors[floor];
      cached = extractFloorMinimapGeometry(f.meta.baseY, f.boxes, f.slabs, f.ramps);
      this.minimapGeomCache.set(floor, cached);
    }
    return cached;
  }

  private getOrCreateFogGrid(floor: FloorNumber): FogOfWarGrid {
    let grid = this.fogGrids.get(floor);
    if (!grid) {
      grid = createFogOfWarGrid(-64, 64, -64, 64, 2.0);
      this.fogGrids.set(floor, grid);
    }
    return grid;
  }

  private computeObjectiveAndWaypoint(): {
    title: string;
    subtext: string;
    accent: 'cyan' | 'amber' | 'crimson';
    waypoint: ObjectiveWaypointSnapshot | null;
    minimapTarget: MinimapSnapshot['objectiveTarget'];
    controlCenterLocked: boolean;
    floorExitOpen: boolean;
    remainingHostilesTotal: number;
  } {
    const floorMeta = this.hideout.getCurrentFloorMeta();
    const floorNum = floorMeta.number as FloorNumber;
    const floorRig = this.hideout.floors[floorNum];
    const prog8 = this.floor08Director.progression;
    const prog7 = this.floor07Director.progression;
    const prog6 = this.floor06Director.progression;
    const prog5 = this.floor05Director.progression;
    const gate = this.checkFloorControlCenterGate(floorNum);
    const controlCenterLocked = !gate.allowed;
    const floorExitOpen =
      floorRig.controlCenter.activated || this.hideout.streamer.getDoorOpenRatio(floorNum) > 0.12;
    const remainingHostilesTotal =
      floorNum === 8 && prog8.liveCombatActive
        ? getRemainingHostilesTotal(prog8)
        : floorNum === 7 && prog7.liveCombatActive
          ? getFloor07RemainingHostilesTotal(prog7)
          : floorNum === 6 && prog6.liveCombatActive
            ? getFloor06RemainingHostilesTotal(prog6)
            : floorNum === 5 && prog5.liveCombatActive
              ? getFloor05RemainingHostilesTotal(prog5)
              : 0;

    let title = 'TRAINING PROTOCOL';
    let subtext = 'FOLLOW IN-WORLD HOLO-STATIONS';
    let accent: 'cyan' | 'amber' | 'crimson' = 'cyan';
    let targetWorld: { x: number; y: number; z: number } | null = null;
    let wpKind: ObjectiveWaypointSnapshot['kind'] = 'control_center';
    let wpLabel = 'CONTROL CENTER';
    let wpSublabel = '';
    let minimapTarget: MinimapSnapshot['objectiveTarget'] = null;

    const activeCombat =
      (floorNum === 8 && !this.tutorial.active && prog8.liveCombatActive && !prog8.floorCleared) ||
      (floorNum === 7 && prog7.liveCombatActive && !prog7.floorCleared) ||
      (floorNum === 6 && prog6.liveCombatActive && !prog6.floorCleared) ||
      (floorNum === 5 && prog5.liveCombatActive && !prog5.floorCleared);

    if (floorNum === 8 && this.tutorial.active) {
      title = 'PROVING PROTOCOL';
      subtext = 'COMPLETE HOLO-STATIONS OR [TAB] DEPLOY';
      accent = 'cyan';
    } else if (activeCombat) {
      const isF7 = floorNum === 7;
      const isF6 = floorNum === 6;
      const isF5 = floorNum === 5;
      const enemies = isF5
        ? this.floor05Director.manager.allEnemies
        : isF6
          ? this.floor06Director.manager.allEnemies
          : isF7
            ? this.floor07Director.manager.allEnemies
            : this.floor08Director.manager.allEnemies;
      const remainingMiniBosses = isF5
        ? prog5.remainingMiniBosses
        : isF6
          ? prog6.remainingMiniBosses
          : isF7
            ? prog7.remainingMiniBosses
            : prog8.remainingMiniBosses;

      let focusBoss: (typeof enemies)[number] | null = null;
      let nearestMini: (typeof enemies)[number] | null = null;
      let nearestMiniD = Infinity;
      let nearestNorm: (typeof enemies)[number] | null = null;
      let nearestNormD = Infinity;

      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.state.alive) continue;
        const d = Math.hypot(e.spatial.x - this.locomotion.x, e.spatial.z - this.locomotion.z);
        if (e.state.tier === 'boss') {
          focusBoss = e;
        } else if (e.state.tier === 'miniboss' && d < nearestMiniD) {
          nearestMiniD = d;
          nearestMini = e;
        } else if (e.state.tier === 'normal' && d < nearestNormD) {
          nearestNormD = d;
          nearestNorm = e;
        }
      }

      if (focusBoss) {
        title = isF5
          ? 'VANQUISH APEX ARENA MARAUDER'
          : isF6
            ? 'VANQUISH THE MONOLITH ARCHON'
            : isF7
              ? 'VANQUISH TITAN-RIG "BASTION-VII"'
              : 'VANQUISH COMMANDER KESTREL-08';
        subtext =
          remainingHostilesTotal > 1
            ? `BOSS + ${remainingHostilesTotal - 1} HOSTILES LEFT`
            : isF5
              ? 'FLOOR 05 SOVEREIGN CHAMPION · WAR-PIT COLISEUM'
              : isF6
                ? 'FLOOR 06 SOVEREIGN BOSS · MONOLITH CATHEDRAL'
                : isF7
                  ? 'FLOOR 07 SIEGE BOSS · SPIRAL ROTUNDA'
                  : 'FLOOR 08 COMMANDER · MAIN HALL';
        accent = 'amber';
        targetWorld = {
          x: focusBoss.spatial.x,
          y: focusBoss.spatial.y + (isF5 ? 3.95 : isF6 ? 4.1 : isF7 ? 3.85 : 2.55),
          z: focusBoss.spatial.z,
        };
        wpKind = 'boss';
        wpLabel = isF5
          ? 'APEX MARAUDER'
          : isF6
            ? 'MONOLITH ARCHON'
            : isF7
              ? 'BASTION-VII'
              : 'KESTREL-08';
        wpSublabel = 'FLOOR BOSS';
        minimapTarget = { x: focusBoss.spatial.x, z: focusBoss.spatial.z, kind: 'boss' };
      } else if (nearestMini) {
        title = 'VANQUISH ALL HOSTILES';
        subtext = `${remainingHostilesTotal} REMAINING · ${remainingMiniBosses} MINI-BOSS`;
        accent = 'crimson';
        targetWorld = {
          x: nearestMini.spatial.x,
          y: nearestMini.spatial.y + 2.35,
          z: nearestMini.spatial.z,
        };
        wpKind = 'miniboss';
        wpLabel = nearestMini.config.displayName.split(' ')[0];
        wpSublabel = 'ZONE MINI-BOSS';
        minimapTarget = { x: nearestMini.spatial.x, z: nearestMini.spatial.z, kind: 'hostile' };
      } else if (nearestNorm) {
        title = 'VANQUISH REMAINING HOSTILES';
        subtext = `${remainingHostilesTotal} HOSTILE${remainingHostilesTotal === 1 ? '' : 'S'} LEFT · LOCKS CONTROL CENTER`;
        accent = 'crimson';
        targetWorld = {
          x: nearestNorm.spatial.x,
          y: nearestNorm.spatial.y + 2.15,
          z: nearestNorm.spatial.z,
        };
        wpKind = 'hostile';
        wpLabel = 'HOSTILE';
        wpSublabel = `${remainingHostilesTotal} LEFT`;
        minimapTarget = { x: nearestNorm.spatial.x, z: nearestNorm.spatial.z, kind: 'hostile' };
      }
    } else if (!floorExitOpen) {
      const cc = floorRig.controlCenter.position;
      const nextCode = floorNum === 1 ? 'VAULT 01' : `FLOOR 0${floorNum - 1}`;
      title = 'USE CONTROL CENTER';
      subtext = `UNSEAL DESCENT TO ${nextCode}`;
      accent = 'amber';
      targetWorld = { x: cc.x, y: cc.y + 2.7, z: cc.z };
      wpKind = 'control_center';
      wpLabel = 'CONTROL CENTER';
      wpSublabel = `DESCEND TO ${nextCode}`;
      minimapTarget = { x: cc.x, z: cc.z, kind: 'control_center' };
    } else {
      const doorPos = floorRig.exitDoor.root.position;
      const nextCode = floorNum === 1 ? 'INNER SANCTUM' : `FLOOR 0${floorNum - 1}`;
      title = `DESCEND TO ${nextCode}`;
      subtext = 'BULKHEAD UNSEALED · PROCEED THROUGH GATE';
      accent = 'cyan';
      targetWorld = { x: doorPos.x, y: doorPos.y + 2.5, z: doorPos.z };
      wpKind = 'exit';
      wpLabel = nextCode;
      wpSublabel = 'OPEN BULKHEAD';
      minimapTarget = { x: doorPos.x, z: doorPos.z, kind: 'exit' };
    }

    let waypoint: ObjectiveWaypointSnapshot | null = null;
    if (targetWorld && this.phase === 'playing') {
      const dist = Math.hypot(
        targetWorld.x - this.locomotion.x,
        targetWorld.y - (this.locomotion.y + 1.3),
        targetWorld.z - this.locomotion.z
      );
      this.camera.updateMatrixWorld();
      this.tmpProj.set(targetWorld.x, targetWorld.y, targetWorld.z).project(this.camera);
      const behind = this.tmpProj.z > 1;
      let ndcX = behind ? -this.tmpProj.x : this.tmpProj.x;
      let ndcY = behind ? -this.tmpProj.y : this.tmpProj.y;

      const rawSx = (ndcX + 1) * 0.5;
      const rawSy = (1 - ndcY) * 0.5;
      const padX = 0.08;
      const padTop = 0.13;
      const padBottom = 0.85;
      const onScreen =
        !behind && rawSx >= padX && rawSx <= 1 - padX && rawSy >= padTop && rawSy <= padBottom;

      let screenX = rawSx;
      let screenY = rawSy;
      let edgeAngleRad = 0;
      if (!onScreen) {
        const dx = rawSx - 0.5;
        const dy = rawSy - 0.5;
        edgeAngleRad = Math.atan2(dy, dx);
        const maxHalfX = 0.5 - padX;
        const maxHalfY = 0.36;
        const scale = Math.max(Math.abs(dx) / maxHalfX, Math.abs(dy) / maxHalfY, 1e-4);
        screenX = 0.5 + dx / scale;
        screenY = Math.min(padBottom, Math.max(padTop, 0.5 + dy / scale));
      }

      waypoint = {
        screenX,
        screenY,
        onScreen,
        edgeAngleRad,
        distanceMeters: Math.round(dist),
        label: wpLabel,
        sublabel: wpSublabel,
        accent,
        kind: wpKind,
      };
    }

    return {
      title,
      subtext,
      accent,
      waypoint,
      minimapTarget,
      controlCenterLocked,
      floorExitOpen,
      remainingHostilesTotal,
    };
  }

  private buildMinimapSnapshot(
    objectiveTarget: MinimapSnapshot['objectiveTarget'],
    floorExitOpen: boolean
  ): MinimapSnapshot {
    const floorMeta = this.hideout.getCurrentFloorMeta();
    const floorNum = floorMeta.number as FloorNumber;
    const floorRig = this.hideout.floors[floorNum];
    const enemies: MinimapEnemyBlip[] = [];
    const enemyList =
      floorNum === 8 && this.floor08Director.progression.liveCombatActive
        ? this.floor08Director.manager.allEnemies
        : floorNum === 7 && this.floor07Director.progression.liveCombatActive
          ? this.floor07Director.manager.allEnemies
          : floorNum === 6 && this.floor06Director.progression.liveCombatActive
            ? this.floor06Director.manager.allEnemies
            : floorNum === 5 && this.floor05Director.progression.liveCombatActive
              ? this.floor05Director.manager.allEnemies
              : null;

    if (enemyList) {
      for (let i = 0; i < enemyList.length; i++) {
        const e = enemyList[i];
        if (!e.state.alive) continue;
        enemies.push({
          id: e.id,
          x: e.spatial.x,
          y: e.spatial.y,
          z: e.spatial.z,
          yaw: e.spatial.yaw,
          tier: e.state.tier,
          alerted: e.state.behavior !== 'patrol',
          firing: e.state.behavior === 'attack' || e.state.behavior === 'windup',
        });
      }
    }

    const ammoCrates: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < this.hideout.activeAmmoCrates.length; i++) {
      const c = this.hideout.activeAmmoCrates[i];
      if (!c.available) continue;
      if (Math.abs(c.position.y - this.locomotion.y) > 7.5) continue;
      ammoCrates.push({ x: c.position.x, z: c.position.z });
    }

    const cc = floorRig.controlCenter;
    const doorPos = floorRig.exitDoor.root.position;
    const geometry = this.getMinimapGeometry(floorNum);
    const fog = this.getOrCreateFogGrid(floorNum);
    revealFogAt(fog, this.locomotion.x, this.locomotion.z, this.cameraRig.yaw, geometry);

    return {
      floorNumber: floorNum,
      zoneName: resolveSectorName(floorNum, this.locomotion.x, this.locomotion.z, floorMeta.name),
      playerX: this.locomotion.x,
      playerY: this.locomotion.y,
      playerZ: this.locomotion.z,
      cameraYaw: this.cameraRig.yaw,
      characterYaw: this.characterYaw,
      radarRangeMeters: 30,
      geometry,
      fog,
      enemies,
      ammoCrates,
      controlCenter: {
        x: cc.position.x,
        y: cc.position.y,
        z: cc.position.z,
        state: cc.lockoutMode,
      },
      exitDoor: {
        x: doorPos.x,
        z: doorPos.z,
        open: floorExitOpen,
      },
      objectiveTarget,
    };
  }

  private emitHud(): void {
    const activeSpread =
      this.weaponState.activeWeapon === 'pistol'
        ? this.weaponState.pistol.spread
        : this.weaponState.activeWeapon === 'smg'
          ? this.weaponState.smg.spread
          : this.weaponState.heavy.spread;

    const obj = this.computeObjectiveAndWaypoint();
    const minimap = this.buildMinimapSnapshot(obj.minimapTarget, obj.floorExitOpen);

    this.onHudUpdate({
      phase: this.phase,
      activeWeapon: this.weaponState.activeWeapon,
      pistolAmmo: this.weaponState.pistol.ammo,
      pistolMaxAmmo: this.weaponState.pistol.maxAmmo,
      pistolOvercharged: this.weaponState.pistol.overchargedRounds,
      pistolReloadPhase: this.weaponState.pistol.reloadPhase,
      pistolReloadProgress: this.weaponState.pistol.reloadProgress,
      pistolSweetSpotStart: this.weaponState.pistol.sweetSpotStart,
      pistolSweetSpotEnd: this.weaponState.pistol.sweetSpotEnd,
      smgHeat: Math.round(this.weaponState.smg.heat),
      smgOverheated: this.weaponState.smg.overheated,
      smgVenting: this.weaponState.smg.venting,
      smgFlashCoolActive: this.weaponState.smg.flashCoolTimer > 0,
      heavyAmmo: this.weaponState.heavy.ammo,
      heavyMaxAmmo: this.weaponState.heavy.maxAmmo,
      heavyReserveAmmo: this.weaponState.heavy.reserveAmmo,
      heavyMaxReserveAmmo: this.weaponState.heavy.maxReserveAmmo,
      heavyReloading: this.weaponState.heavy.reloading,
      heavyReloadProgress: this.weaponState.heavy.reloadProgress,
      reloadBanner: this.weaponState.bannerKind,
      cameraShotPulse: this.cameraRig.shotPulse,
      cameraHeavyPulse: this.cameraRig.heavyPulse,
      cameraHeatPulse: this.cameraRig.heatPulse,
      cameraFrostPulse: this.cameraRig.frostPulse,
      ads: this.input.adsHeld,
      combatReady: this.combat.combatReadyTimer > 0,
      crouching: this.locomotion.crouching,
      sprinting: this.locomotion.sprinting,
      shoulder: this.cameraRig.shoulder,
      spreadPx: Math.round(Math.min(44, Math.max(8, activeSpread * 620))),
      hitMarkerTimer: this.combat.hitMarkerTimer,
      hitMarkerCritical: this.combat.hitMarkerCritical,
      hitMarkerKill: this.combat.hitMarkerKill,
      pointerLocked: this.input.pointerLocked,
      muted: this.muted,
      hits: this.combat.hits,
      criticalHits: this.combat.criticalHits,
      shotsFired: this.combat.shotsFired,
      streak: this.combat.streak,
      bestStreak: this.combat.bestStreak,
      score: this.combat.score,
      targetsCleared: this.combat.targetsCleared,
      floorNumber: this.hideout.getCurrentFloorMeta().number,
      floorName: this.hideout.getCurrentFloorMeta().name,
      floorBannerText: this.floorBannerText,
      interactPrompt: this.interactPrompt,
      interactPromptLocked: this.interactPromptLocked,
      controlCenterLocked: obj.controlCenterLocked,
      floorExitOpen: obj.floorExitOpen,
      remainingHostilesTotal: obj.remainingHostilesTotal,
      objectiveTitle: obj.title,
      objectiveSubtext: obj.subtext,
      objectiveAccent: obj.accent,
      objectiveWaypoint: obj.waypoint,
      cameraYaw: this.cameraRig.yaw,
      playerHp: this.hitReaction.hp,
      playerMaxHp: this.hitReaction.maxHp,
      playerShieldIntegrity: this.hitReaction.shieldIntegrity,
      playerShieldGhost: this.hitReaction.shieldGhost,
      playerShieldRecharging: this.hitReaction.shieldRecharging,
      playerBarShake: this.hitReaction.barShakeTimer,
      playerHitBearingRad: this.hitReaction.lastHitBearingRad,
      playerHitArcAlpha: Math.min(1, this.hitReaction.hitArcTimer / 0.85),
      playerHitsTaken: this.hitReaction.hitsTaken,
      playerDamagePulse: this.hitReaction.damagePulse,
      playerDamageVignette: { ...this.hitReaction.vignette },
      minimap,
      tutorial: this.tutorial.getHudState(),
      floor08Encounter:
        this.hideout.getCurrentFloorMeta().number === 5
          ? this.floor05Director.getHudState(this.locomotion.x, this.locomotion.z)
          : this.hideout.getCurrentFloorMeta().number === 6
            ? this.floor06Director.getHudState(this.locomotion.x, this.locomotion.z)
            : this.hideout.getCurrentFloorMeta().number === 7
              ? this.floor07Director.getHudState(this.locomotion.x, this.locomotion.z)
              : this.floor08Director.getHudState(this.locomotion.x, this.locomotion.z),
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.input.unbind();
    this.resizeObserver.disconnect();
    this.audio.dispose();
    this.vfx.dispose();
    this.floor08Director.dispose();
    this.floor07Director.dispose();
    this.floor06Director.dispose();
    this.floor05Director.dispose();
    this.tutorialProps.dispose();
    this.hideout.dispose();
    this.playerRig.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
