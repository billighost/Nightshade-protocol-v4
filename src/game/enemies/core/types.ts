import type * as THREE from 'three';

export type Floor08EnemyArchetypeId =
  | 'breacher_cyborg'
  | 'razor_strider'
  | 'aegis_riot_trooper'
  | 'killhouse_warden'
  | 'ordnance_pyro_tech'
  | 'commander_kestrel';

export type Floor07EnemyArchetypeId =
  | 'exo_carbine_trooper'
  | 'grapple_lance_duelist'
  | 'mortar_pod_bombardier'
  | 'valkyrie_hover_drone'
  | 'turbine_juggernaut'
  | 'vault_stalker_sniper'
  | 'bastion_seven_boss';

export type Floor06EnemyArchetypeId =
  | 'astral_shard_levitator'
  | 'monolith_claymore_knight'
  | 'resonant_beam_prism'
  | 'phase_blink_warden'
  | 'archive_reality_weaver'
  | 'bunker_gravity_hound'
  | 'monolith_archon_boss';

export type Floor05EnemyArchetypeId =
  | 'plasma_spear_hoplite'
  | 'leaping_carapace_stalker'
  | 'arena_net_shooter'
  | 'shield_chariot_brute'
  | 'dual_cleaver_executioner'
  | 'acid_wyvern_construct'
  | 'apex_arena_marauder_boss';

export type EnemyArchetypeId =
  | Floor08EnemyArchetypeId
  | Floor07EnemyArchetypeId
  | Floor06EnemyArchetypeId
  | Floor05EnemyArchetypeId;

export type EnemyTier = 'normal' | 'miniboss' | 'boss';

export type EnemyBehaviorState =
  | 'idle'
  | 'patrol'
  | 'chase'
  | 'strafe'
  | 'windup'
  | 'attack'
  | 'recover'
  | 'staggered'
  | 'dead';

export type EnemyHitZone = 'body' | 'head' | 'weakpoint' | 'shield';

export type Floor08ZoneId = 'zone1_ops' | 'zone2_armory' | 'zone3_killhouse' | 'zone4_main_hall' | 'zone5_atrium';

export type Floor07ZoneId =
  | 'f7_z1_arrival'
  | 'f7_z2_rotunda'
  | 'f7_z3_west_barracks'
  | 'f7_z4_east_servers'
  | 'f7_z5_sw_cargo'
  | 'f7_z6_se_turbines'
  | 'f7_z7_south_extraction';

export type Floor06ZoneId =
  | 'f6_z1_arrival'
  | 'f6_z2_cathedral'
  | 'f6_z3_west_labs'
  | 'f6_z4_east_foundry'
  | 'f6_z5_sw_bunker'
  | 'f6_z6_ne_gravcore'
  | 'f6_z7_nw_cryovault'
  | 'f6_z8_north_extraction';

export type Floor05ZoneId =
  | 'f5_z1_arrival'
  | 'f5_z2_coliseum'
  | 'f5_z3_west_simdeck'
  | 'f5_z4_east_mechbay'
  | 'f5_z5_nw_orbital'
  | 'f5_z6_ne_command'
  | 'f5_z7_sw_reactor'
  | 'f5_z8_se_ordnance'
  | 'f5_z9_south_extraction';

export type EnemyZoneId = Floor08ZoneId | Floor07ZoneId | Floor06ZoneId | Floor05ZoneId;

export interface EnemyWeakpointConfig {
  id: string;
  label: string;
  /** Multiplier applied to weapon damage on direct hit */
  damageMultiplier: number;
  /** Cumulative weakpoint HP required to trigger overload/break/shatter */
  breakThreshold: number;
  /** Bonus overload/rupture damage applied upon weakpoint break */
  breakBonusDamage: number;
  /** Stagger duration in seconds when broken */
  staggerDuration: number;
  /** If true, weakpoint only accepts full break/crit during vulnerability windows (e.g. post-lunge/overdrive) */
  requiresExposedWindow: boolean;
  /** If true, weakpoint can be re-triggered after cooldown (e.g. Boss Phase 2 vents or Strider core) */
  repeatable: boolean;
  /** Cooldown before a repeatable weakpoint can break again */
  repeatCooldown: number;
  /** If true, breaking this weakpoint shatters an energy shield */
  breaksShield?: boolean;
}

export interface EnemyArchetypeConfig {
  id: EnemyArchetypeId;
  displayName: string;
  roleSubtitle: string;
  tier: EnemyTier;
  maxHp: number;
  moveSpeed: number;
  sprintSpeed: number;
  collisionRadius: number;
  height: number;
  preferredMinRange: number;
  preferredMaxRange: number;
  detectRange: number;
  scoreValue: number;
  /** Initial energy shield active flag (e.g. Aegis Riot Trooper) */
  startsWithShield?: boolean;
  /** Boss phase 2 HP ratio threshold (e.g. 0.55) */
  phase2ThresholdRatio?: number;
  /** One-line crisp tactical weakpoint counterplay hint */
  weakpointIntel: string;
  /** Optional Phase 2 tactical hint */
  phase2Intel?: string;
  weakpoint: EnemyWeakpointConfig;
}

export interface EnemyWeakpointState {
  id: string;
  damageAccum: number;
  broken: boolean;
  exposed: boolean;
  exposedTimer: number;
  repeatCooldownTimer: number;
  breakCount: number;
}

export interface EnemyCombatState {
  id: string;
  archetypeId: EnemyArchetypeId;
  tier: EnemyTier;
  zone: EnemyZoneId;
  hp: number;
  maxHp: number;
  alive: boolean;
  phase: 1 | 2;
  shieldActive: boolean;
  behavior: EnemyBehaviorState;
  staggerTimer: number;
  hitFlashTimer: number;
  flinchTimer: number;
  flinchDirX: number;
  weakpoint: EnemyWeakpointState;
  /** True once player has engaged/seen this enemy */
  engaged: boolean;
}

export interface EnemyDamageResult {
  appliedDamage: number;
  blockedByShield: boolean;
  isCritical: boolean;
  hitWeakpoint: boolean;
  weakpointBroken: boolean;
  shieldShattered: boolean;
  phaseTransitionedTo2: boolean;
  killed: boolean;
  staggerTriggered: boolean;
  scoreDelta: number;
  calloutText: string | null;
}

export interface EnemyProjectileSpec {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  damage: number;
  radius: number;
  color: number;
  kind: 'plasma_bolt' | 'rail_slug' | 'shotgun_pellet' | 'mortar_canister' | 'boss_overdrive';
  gravity?: number;
  splashRadius?: number;
  targetPos?: THREE.Vector3;
  staggerStrength: number;
}

export interface EnemyShockwaveSpec {
  center: THREE.Vector3;
  maxRadius: number;
  expandSpeed: number;
  damage: number;
  color: number;
  staggerStrength: number;
}

export interface EnemyAttackCallbacks {
  spawnProjectile: (spec: EnemyProjectileSpec) => void;
  spawnShockwave: (spec: EnemyShockwaveSpec) => void;
  applyPlayerMeleeHit: (damage: number, fromPos: THREE.Vector3, staggerStrength: number) => void;
  onTelegraphAudio: (
    kind:
      | 'melee'
      | 'mortar'
      | 'boss_slam'
      | 'dash'
      | 'iaijutsu_glint'
      | 'booster_burst'
      | 'rail_charge'
      | 'shield_charge'
      | 'shield_slam'
      | 'warden_vent'
      | 'pyro_flare'
      | 'kestrel_overdrive'
  ) => void;
  onFireAudio: (kind: 'rifle' | 'rail_slug' | 'smg' | 'shotgun' | 'mortar' | 'boss_carbine') => void;
  onKatanaSlashAudio?: (heavy: boolean) => void;
  onKatanaWallCarveAudio?: (heavy: boolean) => void;
  spawnImpactVfx: (pos: THREE.Vector3, isWeakpoint: boolean, isExplosion?: boolean) => void;
  spawnMuzzleFlash: (
    pos: THREE.Vector3,
    dir: THREE.Vector3,
    colorHex?: number,
    heavy?: boolean
  ) => void;
  spawnBladeSlashArc: (
    origin: THREE.Vector3,
    yaw: number,
    tiltRoll: number,
    tiltPitch: number,
    radius: number,
    colorHex: number,
    heavy?: boolean,
    spinSign?: number
  ) => void;
  spawnSurfaceSlashScar: (
    hitPos: THREE.Vector3,
    hitNormal: THREE.Vector3,
    slashDir: THREE.Vector3,
    heavy?: boolean
  ) => void;
  spawnRailImpactCrater: (
    hitPos: THREE.Vector3,
    hitNormal: THREE.Vector3,
    colorHex?: number
  ) => void;
  spawnProjectileImpactSparks: (
    hitPos: THREE.Vector3,
    hitNormal: THREE.Vector3,
    colorHex: number
  ) => void;
  spawnPerilGlint: (worldPos: THREE.Vector3, colorHex?: number) => void;
  spawnBoosterBurst: (
    worldPos: THREE.Vector3,
    exhaustDir: THREE.Vector3,
    colorHex?: number,
    count?: number
  ) => void;
  showIntelCallout: (title: string, hint: string, duration?: number) => void;
}

export interface EnemyAnimationInput {
  dt: number;
  elapsed: number;
  behavior: EnemyBehaviorState;
  speedRatio: number;
  localMoveX: number;
  localMoveZ: number;
  aimPitch: number;
  attackProgress: number; // 0..1 during windup/attack
  attackVariant: number; // 0=combo1, 1=combo2, 2=combo3, 3=iaijutsu_quickdraw, 4=aerial_helm_breaker, 5=flash_step
  flinchTimer: number;
  flinchDirX: number;
  staggerTimer: number;
  deadProgress: number; // 0..1 collapse
  weakpointExposed: boolean;
  weakpointBroken: boolean;
  shieldActive: boolean;
  phase: 1 | 2;
  airborneHeight: number;
  boosterIntensity?: number; // 0..1 live dorsal thruster plume intensity
}

export interface EnemyRigHandle {
  root: THREE.Group;
  hitboxes: THREE.Mesh[];
  /** Optional shield mesh toggled off on shield shatter */
  shieldGroup?: THREE.Object3D;
  /** Emissive weakpoint material(s) pulsed based on exposure/stagger */
  weakpointMaterials: THREE.MeshStandardMaterial[];
  /** Armor materials flashed briefly on impact */
  armorFlashMaterials: THREE.MeshStandardMaterial[];
  getMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getWeakpointWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  updateAnimation: (input: EnemyAnimationInput) => void;
  dispose: () => void;
}

export interface EnemySpawnSpec {
  id: string;
  archetypeId: EnemyArchetypeId;
  zone: EnemyZoneId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  patrolPoints?: Array<{ x: number; z: number }>;
}

export interface BossHudState {
  enemyId: string;
  name: string;
  subtitle: string;
  tier: 'miniboss' | 'boss';
  hp: number;
  maxHp: number;
  hpRatio: number;
  phase: 1 | 2;
  staggered: boolean;
  weakpointExposed: boolean;
  weakpointLabel: string;
}

export interface WeakpointIntelBanner {
  title: string;
  hint: string;
  accent: 'amber' | 'crimson' | 'cyan' | 'gold';
}

export interface FloorEncounterHudState {
  liveCombatActive: boolean;
  remainingNormal: number;
  totalNormal: number;
  remainingMiniBosses: number;
  totalMiniBosses: number;
  bossSpawned: boolean;
  bossDefeated: boolean;
  floorCleared: boolean;
  activeBossHud: BossHudState | null;
  weakpointIntel: WeakpointIntelBanner | null;
}

export type Floor08EncounterHudState = FloorEncounterHudState;

export interface EnemyInspectInfo {
  id: string;
  archetypeId: EnemyArchetypeId;
  displayName: string;
  tier: EnemyTier;
  zone: EnemyZoneId;
  hp: number;
  maxHp: number;
  alive: boolean;
  phase: 1 | 2;
  behavior: EnemyBehaviorState;
  shieldActive: boolean;
  weakpointExposed: boolean;
  weakpointBroken: boolean;
  staggerTimer: number;
  pos: [number, number, number];
  yaw: number;
}
