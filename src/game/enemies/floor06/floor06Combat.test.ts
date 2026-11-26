import assert from 'node:assert/strict';
import test from 'node:test';
import { F6_BASE_Y, F6_TRENCH_Y, F6_UPPER_Y } from '../../arena/hideout/floors/floor06/layout';
import { resolveSectorName } from '../../hud/minimapMath';
import { createEnemyCombatState, exposeEnemyWeakpoint, resolveEnemyHit } from '../core/damageRouting';
import { FLOOR07_LIVE_ROSTER } from '../floor07/progression';
import {
  ARCHIVE_REALITY_WEAVER_CONFIG,
  computeGravCoreBlinkDest,
  computeWeaverFanAngles,
  computeWeaverHelixOffsets,
  computeWeaverSweepYaw,
  selectRealityWeaverAction,
  solveWeaverMortarPattern,
} from './archiveRealityWeaver';
import {
  ASTRAL_SHARD_LEVITATOR_CONFIG,
  computeBlinkFlankVelocity,
  computeHexSpiralOffsets,
  computeTriShardOffsets,
  selectLevitatorAttack,
  solveAstralMortarArc,
} from './astralShardLevitator';
import {
  BUNKER_GRAVITY_HOUND_CONFIG,
  computeHoundMawSweepYaw,
  computeHoundTuskSpread,
  selectGravityHoundAction,
  solveHoundMortarCluster,
  solveHoundPounceLeap,
} from './bunkerGravityHound';
import {
  computeArchonFanDirections,
  computeArchonMeteorTargets,
  computeArchonScissorSweepYaw,
  computeArchonSupernovaRing,
  MONOLITH_ARCHON_BOSS_CONFIG,
  pickArchonBlinkDestination,
  selectArchonBossAction,
} from './monolithArchonBoss';
import {
  computeCrescentWaveOffsets,
  MONOLITH_CLAYMORE_KNIGHT_CONFIG,
  selectClaymoreKnightAction,
  solveVaultCrashLeap,
} from './monolithClaymoreKnight';
import {
  computeAmbushBlinkTarget,
  computeBlinkFlankTarget,
  computeRiftArcFanAngles,
  PHASE_BLINK_WARDEN_CONFIG,
  selectWardenAction,
  solveVoidSnareArc,
} from './phaseBlinkWarden';
import {
  canUseFloor06ControlCenter,
  createInitialFloor06Progression,
  evaluateFloor06Progression,
  FLOOR06_BOSS_SPAWN,
  FLOOR06_INITIAL_SPAWNS,
  getFloor06RemainingHostilesTotal,
} from './progression';
import {
  computeRefractedFanAngles,
  computeSweepBeamYaw,
  RESONANT_BEAM_PRISM_CONFIG,
  selectBeamPrismAction,
  solvePrismMortarCluster,
} from './resonantBeamPrism';

test('Floor 06 roster is larger & stronger than Floor 07 with 24 total hostiles and 7 unique non-recycled archetypes', () => {
  assert.ok(
    FLOOR06_INITIAL_SPAWNS.length > FLOOR07_LIVE_ROSTER.length,
    `Expected Floor 06 initial spawns (${FLOOR06_INITIAL_SPAWNS.length}) > Floor 07 (${FLOOR07_LIVE_ROSTER.length})`
  );
  assert.equal(FLOOR06_INITIAL_SPAWNS.length, 23);

  const uniqueArchetypes = new Set([
    ...FLOOR06_INITIAL_SPAWNS.map((s) => s.archetypeId),
    FLOOR06_BOSS_SPAWN.archetypeId,
  ]);
  assert.equal(uniqueArchetypes.size, 7);

  // Zero archetype recycling from Floor 07 or Floor 08
  const forbidden = new Set([
    'breacher_cyborg',
    'razor_strider',
    'aegis_riot_trooper',
    'killhouse_warden',
    'ordnance_pyro_tech',
    'commander_kestrel',
    'exo_carbine_trooper',
    'grapple_lance_duelist',
    'mortar_pod_bombardier',
    'valkyrie_hover_drone',
    'turbine_juggernaut',
    'vault_stalker_sniper',
    'bastion_seven_boss',
  ]);
  for (const id of uniqueArchetypes) {
    assert.ok(!forbidden.has(id), `Floor 06 must never recycle archetype ${id}`);
  }

  // Unique IDs across all 24 spawns
  const ids = [...FLOOR06_INITIAL_SPAWNS.map((s) => s.id), FLOOR06_BOSS_SPAWN.id];
  assert.equal(new Set(ids).size, ids.length);
});

test('Floor 06 spawn coordinates respect South Arrival safety, all 3 vertical tiers, and sealed SW Vault boundary', () => {
  let hasTrench = false;
  let hasBase = false;
  let hasUpper = false;
  let hasAerial = false;

  for (const s of FLOOR06_INITIAL_SPAWNS) {
    // Never spawn-camp South Arrival (x in [-10,10], z > 9.6)
    const inSouthArrival = Math.abs(s.x) <= 10 && s.z >= 9.6;
    assert.ok(!inSouthArrival, `Spawn ${s.id} must not camp South Arrival`);

    // Never spawn inside sealed SW Armored Vault (x < -34.2, z > 13.5)
    const inSealedVault = s.x < -34.2 && s.z > 13.5;
    assert.ok(!inSealedVault, `Spawn ${s.id} must not spawn behind sealed SW Vault gate`);

    if (Math.abs(s.y - F6_TRENCH_Y) < 0.2) hasTrench = true;
    if (Math.abs(s.y - F6_BASE_Y) < 0.2) hasBase = true;
    if (Math.abs(s.y - F6_UPPER_Y) < 0.2) hasUpper = true;
    if (s.y > F6_BASE_Y + 2.0 && s.archetypeId === 'astral_shard_levitator') hasAerial = true;
  }

  assert.ok(hasTrench, 'Floor 06 should populate Cathedral sunken trench');
  assert.ok(hasBase, 'Floor 06 should populate base deck');
  assert.ok(hasUpper, 'Floor 06 should populate upper galleries & catwalks');
  assert.ok(hasAerial, 'Floor 06 should populate aerial levitators');
});

test('Floor 06 durability scaling exceeds Floor 07 across normals, Mini-Bosses, and Floor Boss', () => {
  assert.ok(ASTRAL_SHARD_LEVITATOR_CONFIG.maxHp >= 400);
  assert.ok(MONOLITH_CLAYMORE_KNIGHT_CONFIG.maxHp >= 500);
  assert.ok(RESONANT_BEAM_PRISM_CONFIG.maxHp >= 420);
  assert.ok(PHASE_BLINK_WARDEN_CONFIG.maxHp >= 440);
  assert.ok(ARCHIVE_REALITY_WEAVER_CONFIG.maxHp >= 1800);
  assert.ok(BUNKER_GRAVITY_HOUND_CONFIG.maxHp >= 1900);
  assert.ok(MONOLITH_ARCHON_BOSS_CONFIG.maxHp >= 4500);
});

test('Floor 06 progression enforces strict all-enemies-vanquished Control Center gating', () => {
  let prog = createInitialFloor06Progression();
  assert.equal(prog.totalNormal, 21);
  assert.equal(prog.totalMiniBosses, 2);
  assert.equal(getFloor06RemainingHostilesTotal(prog), 24);
  assert.equal(canUseFloor06ControlCenter(prog).allowed, false);

  // Activate combat
  let res = evaluateFloor06Progression(prog, {
    liveCombatActive: true,
    aliveNormal: 21,
    aliveMiniBosses: 2,
    bossSpawned: false,
    bossAlive: false,
  });
  prog = res.next;
  assert.equal(res.shouldSpawnBoss, false);
  const lockedGate = canUseFloor06ControlCenter(prog);
  assert.equal(lockedGate.allowed, false);
  assert.ok(lockedGate.reason?.includes('ALL ENEMIES MUST BE VANQUISHED FIRST'));

  // Eliminating both Zone Mini-Bosses spawns THE MONOLITH ARCHON
  res = evaluateFloor06Progression(prog, {
    liveCombatActive: true,
    aliveNormal: 12,
    aliveMiniBosses: 0,
    bossSpawned: false,
    bossAlive: false,
  });
  prog = res.next;
  assert.equal(res.shouldSpawnBoss, true);
  assert.equal(prog.bossSpawned, true);
  assert.equal(prog.floorCleared, false);
  assert.equal(canUseFloor06ControlCenter(prog).allowed, false);

  // Even after Boss dies, Control Center stays LOCKED if any normal enemy survives!
  res = evaluateFloor06Progression(prog, {
    liveCombatActive: true,
    aliveNormal: 1,
    aliveMiniBosses: 0,
    bossSpawned: true,
    bossAlive: false,
  });
  prog = res.next;
  assert.equal(prog.bossDefeated, true);
  assert.equal(prog.floorCleared, false);
  assert.equal(canUseFloor06ControlCenter(prog).allowed, false);
  assert.equal(getFloor06RemainingHostilesTotal(prog), 1);

  // Eliminating the final hostile unlocks Floor 06 Cleared & Control Center!
  res = evaluateFloor06Progression(prog, {
    liveCombatActive: true,
    aliveNormal: 0,
    aliveMiniBosses: 0,
    bossSpawned: true,
    bossAlive: false,
  });
  prog = res.next;
  assert.equal(res.justClearedFloor, true);
  assert.equal(prog.floorCleared, true);
  assert.equal(canUseFloor06ControlCenter(prog).allowed, true);
  assert.equal(canUseFloor06ControlCenter(prog).reason, null);
  assert.equal(getFloor06RemainingHostilesTotal(prog), 0);
});

test('THE MONOLITH ARCHON gated Singularity Core weakpoint and Phase 2 Overdrive trigger cleanly', () => {
  const boss = createEnemyCombatState('boss_test', MONOLITH_ARCHON_BOSS_CONFIG, 'f6_z2_cathedral');

  // While chest shutters are closed (not exposed), weakpoint hits do NOT shatter core
  const closedHit = resolveEnemyHit(boss, MONOLITH_ARCHON_BOSS_CONFIG, 120, 'weakpoint');
  assert.equal(closedHit.weakpointBroken, false);

  // Open Resonance Venting window -> massive weakpoint damage & core shatter!
  exposeEnemyWeakpoint(boss, 3.0);
  const openHit1 = resolveEnemyHit(boss, MONOLITH_ARCHON_BOSS_CONFIG, 200, 'weakpoint');
  assert.equal(openHit1.isCritical, true);
  assert.ok(openHit1.appliedDamage > 400);
  const openHit2 = resolveEnemyHit(boss, MONOLITH_ARCHON_BOSS_CONFIG, 200, 'weakpoint');
  assert.equal(openHit1.weakpointBroken || openHit2.weakpointBroken, true);
  assert.equal(openHit1.staggerTriggered || openHit2.staggerTriggered, true);

  // Push Boss below 55% HP to trigger Phase 2 Apex Overdrive
  const phaseHit = resolveEnemyHit(boss, MONOLITH_ARCHON_BOSS_CONFIG, 1800, 'body');
  assert.equal(phaseHit.phaseTransitionedTo2, true);
  assert.equal(boss.phase, 2);
});

test('Pure Floor 06 archetype tactical planners select distinct, context-appropriate attacks', () => {
  assert.equal(
    selectLevitatorAttack({
      horizDist: 4.5,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      pulseCooldown: 0,
      lanceCooldown: 0,
      volleyCooldown: 0,
      roll: 0.2,
    }),
    'astral_pulse_repel'
  );
  assert.equal(computeTriShardOffsets().length, 3);

  assert.equal(
    selectClaymoreKnightAction({
      horizDist: 3.2,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      slamCooldown: 0,
      lungeCooldown: 0,
      cleaveCooldown: 0,
      roll: 0.3,
    }),
    'twin_cleave_combo'
  );

  assert.equal(
    selectBeamPrismAction({
      horizDist: 18.0,
      hasLos: true,
      hasAttackToken: true,
      railCooldown: 0,
      fanCooldown: 0,
      pulseCooldown: 0,
      roll: 0.2,
    }),
    'resonant_rail_beam'
  );

  assert.equal(
    selectWardenAction({
      horizDist: 11.0,
      hasLos: true,
      hasAttackToken: true,
      gyroBroken: false,
      blinkCooldown: 0,
      burstCooldown: 0,
      slashCooldown: 0,
      roll: 0.2,
    }),
    'phase_blink_flank'
  );

  assert.equal(
    selectRealityWeaverAction({
      horizDist: 14.0,
      hasLos: true,
      phase: 2,
      repelCooldown: 2,
      beamCooldown: 0,
      mortarCooldown: 2,
      fanCooldown: 2,
      blinkCooldown: 2,
      roll: 0.4,
    }),
    'reality_beam_lance'
  );

  assert.equal(
    selectGravityHoundAction({
      horizDist: 8.5,
      hasLos: true,
      phase: 2,
      pounceCooldown: 0,
      pulseCooldown: 2,
      tuskCooldown: 2,
      roll: 0.3,
    }),
    'gravity_pounce_slam'
  );

  assert.equal(
    selectArchonBossAction({
      horizDist: 5.5,
      hasLos: true,
      phase: 2,
      timeWithoutLos: 0,
      slamCooldown: 0,
      railCooldown: 0,
      meteorCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 0,
      roll: 0.1,
    }),
    'cataclysm_gravity_slam'
  );
  assert.equal(computeArchonFanDirections(0, 0, 1).length, 5);
  assert.equal(computeArchonFanDirections(0, 0, 2).length, 7);
  assert.equal(computeArchonMeteorTargets(0, 70, 0, 2).length, 7);
});

test('Minimap sector resolver maps all Floor 06 zones accurately', () => {
  assert.equal(resolveSectorName(6, 0, 14, 'FLOOR 06'), 'SOUTH ARRIVAL');
  assert.equal(resolveSectorName(6, 0, 0, 'FLOOR 06'), 'MONOLITH CATHEDRAL');
  assert.equal(resolveSectorName(6, -28, 2, 'FLOOR 06'), 'BLACK-SITE LABS');
  assert.equal(resolveSectorName(6, 30, 6, 'FLOOR 06'), 'BALLISTIC FOUNDRY');
  assert.equal(resolveSectorName(6, -28, 22, 'FLOOR 06'), 'SW ARMORY BUNKER');
  assert.equal(resolveSectorName(6, 31, -16, 'FLOOR 06'), 'NE GRAV-CORE');
  assert.equal(resolveSectorName(6, -30, -18, 'FLOOR 06'), 'NW CRYO VAULT');
  assert.equal(resolveSectorName(6, 0, -13, 'FLOOR 06'), 'NORTH EXTRACTION');
});

test('AAA Astral Shard Levitator routes all 6 attacks, locks lance/scythe on heart shatter, and solves mortar & blink math', () => {
  // 1. Close range -> astral_pulse_repel
  assert.equal(
    selectLevitatorAttack({
      horizDist: 4.5,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      pulseCooldown: 0,
      lanceCooldown: 0,
      volleyCooldown: 0,
      barrageCooldown: 0,
      slashCooldown: 0,
      mortarCooldown: 0,
      roll: 0.1,
    }),
    'astral_pulse_repel'
  );

  // 2. Cover-flushing Singularity Gravity Mortar when player breaks LOS
  assert.equal(
    selectLevitatorAttack({
      horizDist: 16.0,
      hasLos: false,
      hasAttackToken: true,
      coreBroken: false,
      pulseCooldown: 2,
      lanceCooldown: 0,
      volleyCooldown: 0,
      barrageCooldown: 0,
      slashCooldown: 0,
      mortarCooldown: 0,
      timeWithoutLos: 1.5,
      roll: 0.2,
    }),
    'singularity_mortar'
  );

  // 3. Predatory Telekinetic Cross-Slash in close-mid range
  assert.equal(
    selectLevitatorAttack({
      horizDist: 10.5,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      pulseCooldown: 3,
      lanceCooldown: 0,
      volleyCooldown: 0,
      barrageCooldown: 0,
      slashCooldown: 0,
      mortarCooldown: 0,
      roll: 0.2,
    }),
    'telekinetic_cross_slash'
  );

  // 4. Focused Astral Lance at long sightline
  assert.equal(
    selectLevitatorAttack({
      horizDist: 20.0,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      pulseCooldown: 3,
      lanceCooldown: 0,
      volleyCooldown: 0,
      barrageCooldown: 0,
      slashCooldown: 3,
      mortarCooldown: 3,
      roll: 0.4,
    }),
    'focused_astral_lance'
  );

  // 5. Shattered Astral Heart permanently locks focused_astral_lance & telekinetic_cross_slash -> falls back to barrage/volley
  const brokenChoice = selectLevitatorAttack({
    horizDist: 11.0,
    hasLos: true,
    hasAttackToken: true,
    coreBroken: true,
    pulseCooldown: 4,
    lanceCooldown: 0,
    volleyCooldown: 0,
    barrageCooldown: 0,
    slashCooldown: 0,
    mortarCooldown: 4,
    roll: 0.6,
  });
  assert.equal(brokenChoice, 'hex_shard_barrage');

  // 6. Weakpoint heart shatter deals massive bonus damage + grounds/staggers the Levitator
  const levState = createEnemyCombatState('lev_test', ASTRAL_SHARD_LEVITATOR_CONFIG, 'f6_z2_cathedral');
  const wpHit1 = resolveEnemyHit(levState, ASTRAL_SHARD_LEVITATOR_CONFIG, 45, 'weakpoint');
  assert.equal(wpHit1.isCritical, true);
  const wpHit2 = resolveEnemyHit(levState, ASTRAL_SHARD_LEVITATOR_CONFIG, 45, 'weakpoint');
  assert.equal(wpHit1.weakpointBroken || wpHit2.weakpointBroken, true);
  assert.equal(wpHit1.staggerTriggered || wpHit2.staggerTriggered, true);

  // 7. Pure geometry/ballistic math helpers
  assert.equal(computeTriShardOffsets().length, 3);
  assert.equal(computeHexSpiralOffsets().length, 6);
  const arc = solveAstralMortarArc(0, 74, 0, 14, 70, 0, 15.2);
  assert.ok(arc.speed > 8 && arc.vy > 0 && arc.flightTime >= 0.72);
  const blink = computeBlinkFlankVelocity(0, -10, 1, 15);
  assert.ok(Math.hypot(blink.vx, blink.vz) > 12);
});

test('AAA Monolith Claymore Knight routes all 6 attacks, blocks frontal fire in Aegis Guard, locks vault/wave on Obelisk shatter, and solves leap & wave math', () => {
  // 1. Reactive Paranatural Aegis Guard Advance under heavy frontal damage burst
  assert.equal(
    selectClaymoreKnightAction({
      horizDist: 9.0,
      vertDist: 0.1,
      hasLos: true,
      hasAttackToken: true,
      obeliskBroken: false,
      slamCooldown: 0,
      lungeCooldown: 0,
      cleaveCooldown: 0,
      waveCooldown: 0,
      vaultCooldown: 0,
      guardCooldown: 0,
      damageBurstAccum: 75,
      roll: 0.2,
    }),
    'aegis_guard_advance'
  );

  // 2. Close-range lethal Twin Cleave Combo
  assert.equal(
    selectClaymoreKnightAction({
      horizDist: 3.4,
      vertDist: 0.0,
      hasLos: true,
      hasAttackToken: true,
      obeliskBroken: false,
      slamCooldown: 0,
      lungeCooldown: 0,
      cleaveCooldown: 0,
      waveCooldown: 0,
      vaultCooldown: 0,
      guardCooldown: 4,
      damageBurstAccum: 0,
      roll: 0.1,
    }),
    'twin_cleave_combo'
  );

  // 3. Close-Mid Seismic Monolith Slam
  assert.equal(
    selectClaymoreKnightAction({
      horizDist: 5.5,
      vertDist: 0.1,
      hasLos: true,
      hasAttackToken: true,
      obeliskBroken: false,
      slamCooldown: 0,
      lungeCooldown: 0,
      cleaveCooldown: 2,
      waveCooldown: 0,
      vaultCooldown: 0,
      guardCooldown: 4,
      damageBurstAccum: 0,
      roll: 0.3,
    }),
    'seismic_monolith_slam'
  );

  // 4. Mid-Long Airborne Monolith Vault-Crash Leap Slam
  assert.equal(
    selectClaymoreKnightAction({
      horizDist: 11.2,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      obeliskBroken: false,
      slamCooldown: 4,
      lungeCooldown: 0,
      cleaveCooldown: 2,
      waveCooldown: 0,
      vaultCooldown: 0,
      guardCooldown: 4,
      damageBurstAccum: 0,
      roll: 0.25,
    }),
    'monolith_vault_crash'
  );

  // 5. Anti-Kiting 3-Bolt Astral Crescent Wave
  assert.equal(
    selectClaymoreKnightAction({
      horizDist: 14.5,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      obeliskBroken: false,
      slamCooldown: 4,
      lungeCooldown: 0,
      cleaveCooldown: 2,
      waveCooldown: 0,
      vaultCooldown: 4,
      guardCooldown: 4,
      damageBurstAccum: 0,
      roll: 0.6,
    }),
    'astral_crescent_wave'
  );

  // 6. Shattered Dorsal Obelisk permanently locks vault_crash, crescent_wave, & aegis_guard -> falls back to lunge_pierce_thrust
  assert.equal(
    selectClaymoreKnightAction({
      horizDist: 10.5,
      vertDist: 0.1,
      hasLos: true,
      hasAttackToken: true,
      obeliskBroken: true,
      slamCooldown: 4,
      lungeCooldown: 0,
      cleaveCooldown: 2,
      waveCooldown: 0,
      vaultCooldown: 0,
      guardCooldown: 0,
      damageBurstAccum: 100,
      roll: 0.2,
    }),
    'lunge_pierce_thrust'
  );

  // 7. Paranatural Aegis Shield blocks frontal shield-zone hits when active; Dorsal Obelisk shatter deals massive bonus + 3.0s stagger
  const knightState = createEnemyCombatState('knight_test', MONOLITH_CLAYMORE_KNIGHT_CONFIG, 'f6_z2_cathedral');
  knightState.shieldActive = true;
  const blocked = resolveEnemyHit(knightState, MONOLITH_CLAYMORE_KNIGHT_CONFIG, 40, 'shield');
  assert.equal(blocked.blockedByShield, true);
  assert.equal(blocked.appliedDamage, 0);

  knightState.shieldActive = false;
  const wp1 = resolveEnemyHit(knightState, MONOLITH_CLAYMORE_KNIGHT_CONFIG, 60, 'weakpoint');
  assert.equal(wp1.isCritical, true);
  assert.equal(wp1.weakpointBroken, false);
  const wp2 = resolveEnemyHit(knightState, MONOLITH_CLAYMORE_KNIGHT_CONFIG, 60, 'weakpoint');
  assert.equal(wp2.weakpointBroken, true);
  assert.equal(wp2.staggerTriggered, true);
  assert.equal(knightState.alive, true); // Survives shatter into 3.0s punish window!

  // 8. Pure Crescent Wave fan & Vault-Crash leap math
  const offsets = computeCrescentWaveOffsets();
  assert.equal(offsets.length, 3);
  assert.equal(offsets[1], 0);
  const leap = solveVaultCrashLeap(0, -11, 0.68);
  assert.ok(leap.peakHeight >= 2.5 && leap.peakHeight <= 3.85);
  assert.ok(Math.hypot(leap.vx, leap.vz) > 10);
});

test('AAA Resonant Beam Prism routes all 6 attacks, blocks frontal fire in Refraction Shield, locks sweep/mortar on Core shatter, and solves sweep & mortar math', () => {
  // 1. Close-range Anti-Flank Repulsor Nova
  assert.equal(
    selectBeamPrismAction({
      horizDist: 5.0,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      railCooldown: 0,
      sweepCooldown: 0,
      fanCooldown: 0,
      mortarCooldown: 0,
      shieldCooldown: 0,
      pulseCooldown: 0,
      roll: 0.1,
    }),
    'close_pulse'
  );

  // 2. Reactive Tri-Prism Refraction Shield under heavy sustained gunfire
  assert.equal(
    selectBeamPrismAction({
      horizDist: 16.0,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      railCooldown: 0,
      sweepCooldown: 0,
      fanCooldown: 0,
      mortarCooldown: 0,
      shieldCooldown: 0,
      pulseCooldown: 3,
      damageBurstAccum: 90,
      roll: 0.2,
    }),
    'resonance_shield_surge'
  );

  // 3. Cover-flushing 3-Orb Prismatic Orbit Barrage when player breaks LOS
  assert.equal(
    selectBeamPrismAction({
      horizDist: 18.0,
      hasLos: false,
      hasAttackToken: true,
      coreBroken: false,
      railCooldown: 0,
      sweepCooldown: 0,
      fanCooldown: 0,
      mortarCooldown: 0,
      shieldCooldown: 4,
      pulseCooldown: 3,
      timeWithoutLos: 1.4,
      roll: 0.3,
    }),
    'prismatic_orbit_barrage'
  );

  // 4. Precision Anti-Materiel Resonant Rail Beam
  assert.equal(
    selectBeamPrismAction({
      horizDist: 22.0,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      railCooldown: 0,
      sweepCooldown: 0,
      fanCooldown: 0,
      mortarCooldown: 0,
      shieldCooldown: 4,
      pulseCooldown: 3,
      roll: 0.2,
    }),
    'resonant_rail_beam'
  );

  // 5. Continuous Horizontal Sweeping Cutting Laser
  assert.equal(
    selectBeamPrismAction({
      horizDist: 18.0,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: false,
      railCooldown: 3,
      sweepCooldown: 0,
      fanCooldown: 0,
      mortarCooldown: 0,
      shieldCooldown: 4,
      pulseCooldown: 3,
      roll: 0.58,
    }),
    'sweeping_prism_laser'
  );

  // 6. Shattered Refractive Prism Core permanently locks sweep, mortar, & shield -> falls back to refracted_fan
  assert.equal(
    selectBeamPrismAction({
      horizDist: 18.0,
      hasLos: true,
      hasAttackToken: true,
      coreBroken: true,
      railCooldown: 3,
      sweepCooldown: 0,
      fanCooldown: 0,
      mortarCooldown: 0,
      shieldCooldown: 0,
      pulseCooldown: 3,
      damageBurstAccum: 100,
      roll: 0.58,
    }),
    'refracted_fan'
  );

  // 7. Refraction Shield blocks frontal hits when active; Prism Core shatter deals bonus + 3.2s stagger
  const prismState = createEnemyCombatState('prism_test', RESONANT_BEAM_PRISM_CONFIG, 'f6_z2_cathedral');
  prismState.shieldActive = true;
  const blocked = resolveEnemyHit(prismState, RESONANT_BEAM_PRISM_CONFIG, 45, 'shield');
  assert.equal(blocked.blockedByShield, true);
  assert.equal(blocked.appliedDamage, 0);

  prismState.shieldActive = false;
  const wp1 = resolveEnemyHit(prismState, RESONANT_BEAM_PRISM_CONFIG, 56, 'weakpoint');
  assert.equal(wp1.isCritical, true);
  assert.equal(wp1.weakpointBroken, false);
  const wp2 = resolveEnemyHit(prismState, RESONANT_BEAM_PRISM_CONFIG, 56, 'weakpoint');
  assert.equal(wp2.weakpointBroken, true);
  assert.equal(wp2.staggerTriggered, true);
  assert.equal(prismState.alive, true); // Survives shatter into 3.2s punish window!

  // 8. Pure fan, sweep yaw, and mortar cluster math
  assert.equal(computeRefractedFanAngles(false).length, 5);
  assert.equal(computeRefractedFanAngles(true).length, 3);
  const yStart = computeSweepBeamYaw(0, 0, 1, 0.34);
  const yEnd = computeSweepBeamYaw(0, 1, 1, 0.34);
  assert.ok(yStart < -0.3 && yEnd > 0.3);
  const mortars = solvePrismMortarCluster(0, 76, -12, 0, 70, 4, 16.5);
  assert.equal(mortars.length, 3);
  assert.ok(mortars.every((m) => m.speed > 8 && m.flightTime >= 0.85));
});

test('AAA Phase-Blink Warden routes all 6 attacks, locks blink/ambush on Gyro shatter, and solves blink/rift/snare math', () => {
  // 1. Close-quarters Twin Mantis-Blade Slash Repel
  assert.equal(
    selectWardenAction({
      horizDist: 3.4,
      hasLos: true,
      hasAttackToken: true,
      gyroBroken: false,
      blinkCooldown: 0,
      ambushCooldown: 0,
      burstCooldown: 0,
      riftBarrageCooldown: 0,
      snareCooldown: 0,
      slashCooldown: 0,
      roll: 0.1,
    }),
    'phase_slash_repel'
  );

  // 2. Cover-flushing Void-Anchor Snare mortar when player hides behind cover
  assert.equal(
    selectWardenAction({
      horizDist: 14.5,
      hasLos: false,
      hasAttackToken: true,
      gyroBroken: false,
      blinkCooldown: 0,
      ambushCooldown: 0,
      burstCooldown: 0,
      riftBarrageCooldown: 0,
      snareCooldown: 0,
      slashCooldown: 2,
      timeWithoutLos: 1.4,
      roll: 0.2,
    }),
    'void_anchor_snare'
  );

  // 3. Predatory Blink-Backstab Ambush while chest Phase-Anchor Gyro is intact
  assert.equal(
    selectWardenAction({
      horizDist: 11.5,
      hasLos: true,
      hasAttackToken: true,
      gyroBroken: false,
      blinkCooldown: 0,
      ambushCooldown: 0,
      burstCooldown: 0,
      riftBarrageCooldown: 0,
      snareCooldown: 3,
      slashCooldown: 2,
      roll: 0.55,
    }),
    'blink_backstab_ambush'
  );

  // 4. Lateral Phase-Blink Flank while chest Phase-Anchor Gyro is intact
  assert.equal(
    selectWardenAction({
      horizDist: 12.0,
      hasLos: true,
      hasAttackToken: true,
      gyroBroken: false,
      blinkCooldown: 0,
      ambushCooldown: 5,
      burstCooldown: 0,
      riftBarrageCooldown: 0,
      snareCooldown: 3,
      slashCooldown: 2,
      roll: 0.22,
    }),
    'phase_blink_flank'
  );

  // 5. Charged 5-Bolt Dimensional Rift Crescent Barrage
  assert.equal(
    selectWardenAction({
      horizDist: 14.0,
      hasLos: true,
      hasAttackToken: true,
      gyroBroken: false,
      blinkCooldown: 4,
      ambushCooldown: 5,
      burstCooldown: 0,
      riftBarrageCooldown: 0,
      snareCooldown: 3,
      slashCooldown: 2,
      roll: 0.78,
    }),
    'dimensional_rift_barrage'
  );

  // 6. Shattered chest PHASE-ANCHOR GYRO disables BOTH blink_backstab_ambush and phase_blink_flank!
  assert.equal(
    selectWardenAction({
      horizDist: 11.5,
      hasLos: true,
      hasAttackToken: true,
      gyroBroken: true,
      blinkCooldown: 0,
      ambushCooldown: 0,
      burstCooldown: 0,
      riftBarrageCooldown: 4,
      snareCooldown: 4,
      slashCooldown: 2,
      roll: 0.2,
    }),
    'resonance_burst'
  );

  // 7. Weakpoint PHASE-ANCHOR GYRO shatter deals massive crit bonus + 2.9s stagger without instant one-shotting
  const wardenState = createEnemyCombatState(
    'warden_test',
    PHASE_BLINK_WARDEN_CONFIG,
    'f6_z2_cathedral'
  );
  const wp1 = resolveEnemyHit(wardenState, PHASE_BLINK_WARDEN_CONFIG, 70, 'weakpoint');
  assert.equal(wp1.isCritical, true);
  assert.equal(wp1.weakpointBroken, false);
  const wp2 = resolveEnemyHit(wardenState, PHASE_BLINK_WARDEN_CONFIG, 70, 'weakpoint');
  assert.equal(wp2.weakpointBroken, true);
  assert.equal(wp2.staggerTriggered, true);
  assert.equal(wardenState.alive, true);

  // 8. Pure spatial blink, ambush standoff, rift crescent fan, and mortar lob math
  const flank = computeBlinkFlankTarget(0, 0, 0, -12, 1, 4.8);
  assert.ok(Math.hypot(flank.x, flank.z) > 4.2);
  const ambush = computeAmbushBlinkTarget(0, 0, 0, -12, -1, 3.2);
  const ambushDistToPlayer = Math.hypot(ambush.x - 0, ambush.z - -12);
  assert.ok(Math.abs(ambushDistToPlayer - 3.2) < 0.05);
  assert.equal(computeRiftArcFanAngles(false).length, 5);
  assert.equal(computeRiftArcFanAngles(true).length, 3);
  const snare = solveVoidSnareArc(0, 71.4, 0, 12, 70.1, -6, 16.5);
  assert.ok(snare.speed > 9 && snare.vy > 0 && snare.flightTime >= 0.75);
});

test('AAA Archive Reality-Weaver routes all 7 attacks, scales Phase 1 vs Phase 2, locks beams/blinks on Crown Halo shatter, and solves sweep/helix/mortar/blink math', () => {
  // 1. Close-range Gravitational Collapse Nova
  assert.equal(
    selectRealityWeaverAction({
      horizDist: 5.2,
      hasLos: true,
      phase: 1,
      repelCooldown: 0,
      beamCooldown: 0,
      mortarCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 0,
      helixCooldown: 0,
      scytheCooldown: 0,
      haloBroken: false,
      roll: 0.2,
    }),
    'singularity_repel'
  );

  // 2. Cover-flushing Gravity Mortar Salvo when player hides out of LOS
  assert.equal(
    selectRealityWeaverAction({
      horizDist: 16.0,
      hasLos: false,
      phase: 1,
      repelCooldown: 3,
      beamCooldown: 0,
      mortarCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 0,
      helixCooldown: 0,
      scytheCooldown: 0,
      haloBroken: false,
      timeWithoutLos: 1.4,
      roll: 0.2,
    }),
    'gravity_mortar_salvo'
  );

  // 3. Signature Volumetric Sweeping Reality-Tear Beam when Crown Halo is intact
  assert.equal(
    selectRealityWeaverAction({
      horizDist: 15.0,
      hasLos: true,
      phase: 2,
      repelCooldown: 3,
      beamCooldown: 0,
      mortarCooldown: 3,
      fanCooldown: 3,
      blinkCooldown: 3,
      helixCooldown: 0,
      scytheCooldown: 0,
      haloBroken: false,
      roll: 0.35,
    }),
    'reality_beam_lance'
  );

  // 4. Mid-range Twin Telekinetic Dimensional Rift Scythes
  assert.equal(
    selectRealityWeaverAction({
      horizDist: 11.5,
      hasLos: true,
      phase: 2,
      repelCooldown: 3,
      beamCooldown: 4,
      mortarCooldown: 3,
      fanCooldown: 3,
      blinkCooldown: 3,
      helixCooldown: 0,
      scytheCooldown: 0,
      haloBroken: false,
      roll: 0.35,
    }),
    'dimensional_rift_scythe'
  );

  // 5. Detached 6-Stave Cathedral Wheel Helix Barrage
  assert.equal(
    selectRealityWeaverAction({
      horizDist: 18.0,
      hasLos: true,
      phase: 2,
      repelCooldown: 3,
      beamCooldown: 4,
      mortarCooldown: 3,
      fanCooldown: 3,
      blinkCooldown: 3,
      helixCooldown: 0,
      scytheCooldown: 3,
      haloBroken: false,
      roll: 0.4,
    }),
    'stave_barrage_helix'
  );

  // 6. Shattered CROWN RESONANCE HALO locks both reality_beam_lance and phase_reposition -> falls back cleanly
  assert.equal(
    selectRealityWeaverAction({
      horizDist: 14.0,
      hasLos: true,
      phase: 2,
      repelCooldown: 4,
      beamCooldown: 0,
      mortarCooldown: 4,
      fanCooldown: 0,
      blinkCooldown: 0,
      helixCooldown: 4,
      scytheCooldown: 4,
      haloBroken: true,
      roll: 0.1,
    }),
    'astral_fan_volley'
  );

  // 7. Weakpoint CROWN RESONANCE HALO shatter deals massive crit bonus + 3.3s stagger + transitions cleanly to Phase 2 at <= 55% HP
  const weaverState = createEnemyCombatState(
    'weaver_test',
    ARCHIVE_REALITY_WEAVER_CONFIG,
    'f6_z6_ne_gravcore'
  );
  const wp1 = resolveEnemyHit(weaverState, ARCHIVE_REALITY_WEAVER_CONFIG, 130, 'weakpoint');
  assert.equal(wp1.isCritical, true);
  assert.equal(wp1.weakpointBroken, false);
  const wp2 = resolveEnemyHit(weaverState, ARCHIVE_REALITY_WEAVER_CONFIG, 130, 'weakpoint');
  assert.equal(wp2.weakpointBroken, true);
  assert.equal(wp2.staggerTriggered, true);
  assert.equal(weaverState.alive, true);
  // Push below 55% HP to verify Phase 2 Overdrive transition
  const bodyHit = resolveEnemyHit(weaverState, ARCHIVE_REALITY_WEAVER_CONFIG, 450, 'body');
  assert.equal(bodyHit.phaseTransitionedTo2, true);
  assert.equal(weaverState.phase, 2);

  // 8. Pure fan, helix, pentagram mortar, sweep yaw, and NE Grav-Core pedestal-safe blink math
  assert.equal(computeWeaverFanAngles(1, false).length, 5);
  assert.equal(computeWeaverFanAngles(2, false).length, 7);
  assert.equal(computeWeaverFanAngles(2, true).length, 3);

  assert.equal(computeWeaverHelixOffsets(1, false).length, 6);
  assert.equal(computeWeaverHelixOffsets(2, false).length, 10);
  assert.equal(computeWeaverHelixOffsets(2, true).length, 4);

  assert.equal(solveWeaverMortarPattern(31, 70, -14, 1, false).length, 3);
  assert.equal(solveWeaverMortarPattern(31, 70, -14, 2, false).length, 5);
  assert.equal(solveWeaverMortarPattern(31, 70, -14, 2, true).length, 2);

  const sweepStart = computeWeaverSweepYaw(0, 0, 1, 0.44);
  const sweepEnd = computeWeaverSweepYaw(0, 1, 1, 0.44);
  assert.ok(sweepStart < -0.4 && sweepEnd > 0.4);

  // Blink destination strictly stays inside NE Grav-Core chamber and outside central pedestal (31, -16.8, r>=3.6)
  const blinkDest = computeGravCoreBlinkDest(31.0, -14.0, 31.0, -11.0, 1, 6.4);
  assert.ok(blinkDest.x >= 19.8 && blinkDest.x <= 42.2);
  assert.ok(blinkDest.z >= -26.2 && blinkDest.z <= -9.8);
  assert.ok(Math.hypot(blinkDest.x - 31.0, blinkDest.z - -16.8) >= 3.6);
});

test('AAA Bunker Gravity-Hound routes all 7 attacks, scales Phase 1 vs Phase 2, suppresses pulse/beam on Dorsal Reactor shatter, and solves pounce/tusk/beam/mortar math', () => {
  // 1. Anti-flank 360-deg Tail-Whip Cleave when player circles behind the Hound
  assert.equal(
    selectGravityHoundAction({
      horizDist: 4.1,
      hasLos: true,
      phase: 1,
      pounceCooldown: 0,
      pulseCooldown: 0,
      tuskCooldown: 0,
      tailCooldown: 0,
      mortarCooldown: 0,
      chargeCooldown: 0,
      beamCooldown: 0,
      reactorBroken: false,
      playerBehind: true,
      roll: 0.2,
    }),
    'tail_whip_cleave'
  );

  // 2. Cover-flushing shoulder-pod Gravity-Mine Cluster Barrage when player breaks LOS
  assert.equal(
    selectGravityHoundAction({
      horizDist: 14.0,
      hasLos: false,
      phase: 1,
      pounceCooldown: 0,
      pulseCooldown: 0,
      tuskCooldown: 0,
      tailCooldown: 0,
      mortarCooldown: 0,
      chargeCooldown: 0,
      beamCooldown: 0,
      reactorBroken: false,
      timeWithoutLos: 1.4,
      roll: 0.2,
    }),
    'grav_mortar_cluster'
  );

  // 3. Close-range cataclysmic Gravity-Well Pulse while Dorsal Reactor is intact
  assert.equal(
    selectGravityHoundAction({
      horizDist: 4.5,
      hasLos: true,
      phase: 1,
      pounceCooldown: 0,
      pulseCooldown: 0,
      tuskCooldown: 0,
      tailCooldown: 0,
      mortarCooldown: 0,
      chargeCooldown: 0,
      beamCooldown: 0,
      reactorBroken: false,
      playerBehind: false,
      roll: 0.2,
    }),
    'gravity_well_pulse'
  );

  // 4. Mid-long Sweeping Molten Singularity Maw Beam while Dorsal Reactor is intact
  assert.equal(
    selectGravityHoundAction({
      horizDist: 15.5,
      hasLos: true,
      phase: 2,
      pounceCooldown: 3,
      pulseCooldown: 3,
      tuskCooldown: 0,
      tailCooldown: 3,
      mortarCooldown: 3,
      chargeCooldown: 0,
      beamCooldown: 0,
      reactorBroken: false,
      roll: 0.4,
    }),
    'maw_singularity_beam'
  );

  // 5. Armored Bull-Gore Siege Charge across open bunker lanes
  assert.equal(
    selectGravityHoundAction({
      horizDist: 12.0,
      hasLos: true,
      phase: 2,
      pounceCooldown: 3,
      pulseCooldown: 3,
      tuskCooldown: 0,
      tailCooldown: 3,
      mortarCooldown: 3,
      chargeCooldown: 0,
      beamCooldown: 4,
      reactorBroken: false,
      roll: 0.4,
    }),
    'bull_gore_charge'
  );

  // 6. Shattered Dorsal Grav-Singularity Reactor suppresses BOTH gravity_well_pulse AND maw_singularity_beam!
  assert.equal(
    selectGravityHoundAction({
      horizDist: 4.2,
      hasLos: true,
      phase: 2,
      pounceCooldown: 3,
      pulseCooldown: 0,
      tuskCooldown: 0,
      tailCooldown: 0,
      mortarCooldown: 3,
      chargeCooldown: 3,
      beamCooldown: 0,
      reactorBroken: true,
      roll: 0.2,
    }),
    'tail_whip_cleave'
  );
  assert.equal(
    selectGravityHoundAction({
      horizDist: 15.0,
      hasLos: true,
      phase: 2,
      pounceCooldown: 3,
      pulseCooldown: 0,
      tuskCooldown: 0,
      tailCooldown: 3,
      mortarCooldown: 3,
      chargeCooldown: 3,
      beamCooldown: 0,
      reactorBroken: true,
      roll: 0.2,
    }),
    'plasma_tusk_surge'
  );

  // 7. Dorsal Grav-Singularity Reactor weakpoint break triggers bonus damage + 3.3s stagger & transitions to Phase 2 at <= 55% HP
  const houndState = createEnemyCombatState(
    'hound_test',
    BUNKER_GRAVITY_HOUND_CONFIG,
    'f6_z5_sw_bunker'
  );
  const wp1 = resolveEnemyHit(houndState, BUNKER_GRAVITY_HOUND_CONFIG, 140, 'weakpoint');
  assert.equal(wp1.isCritical, true);
  assert.equal(wp1.weakpointBroken, false);
  const wp2 = resolveEnemyHit(houndState, BUNKER_GRAVITY_HOUND_CONFIG, 140, 'weakpoint');
  assert.equal(wp2.weakpointBroken, true);
  assert.equal(wp2.staggerTriggered, true);
  assert.equal(houndState.alive, true);

  const p2Hit = resolveEnemyHit(houndState, BUNKER_GRAVITY_HOUND_CONFIG, 520, 'body');
  assert.equal(p2Hit.phaseTransitionedTo2, true);
  assert.equal(houndState.phase, 2);

  // 8. Pure ballistic pounce, tusk spread, maw sweep, and shoulder mortar cluster math
  const pounce1 = solveHoundPounceLeap(8.0, -6.0, 1, false);
  const pounce2 = solveHoundPounceLeap(8.0, -6.0, 2, true);
  assert.ok(pounce1.peakHeight >= 1.25 && pounce1.peakHeight <= 2.35);
  assert.ok(Math.hypot(pounce2.vx, pounce2.vz) > Math.hypot(pounce1.vx, pounce1.vz));

  assert.equal(computeHoundTuskSpread(1, false).length, 4);
  assert.equal(computeHoundTuskSpread(2, false).length, 6);
  assert.equal(computeHoundTuskSpread(2, true).length, 3);

  const beamStart = computeHoundMawSweepYaw(0, 0, 1, 0.42);
  const beamEnd = computeHoundMawSweepYaw(0, 1, 1, 0.42);
  assert.ok(beamStart < -0.4 && beamEnd > 0.4);

  const mortarsP1 = solveHoundMortarCluster(-31, 71.5, 22.8, -22, 70, 17, 1, 16.5);
  const mortarsP2 = solveHoundMortarCluster(-31, 71.5, 22.8, -22, 70, 17, 2, 16.5);
  assert.equal(mortarsP1.length, 3);
  assert.equal(mortarsP2.length, 5);
  assert.ok(mortarsP2.every((m) => m.speed > 7 && m.vy > 0 && m.flightTime >= 0.76));
});

test('AAA THE MONOLITH ARCHON routes all 8 sovereign boss maneuvers, gates Phase 2 Supernova Cascade, and solves scissor-rail/blink/fan/meteor/supernova math', () => {
  // 1. Close-range routing alternates Cataclysm Gravity Slam and Seraphic Scythe Cleave
  assert.equal(
    selectArchonBossAction({
      horizDist: 5.4,
      hasLos: true,
      phase: 1,
      timeWithoutLos: 0,
      slamCooldown: 0,
      railCooldown: 0,
      meteorCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 0,
      scytheCooldown: 0,
      supernovaCooldown: 0,
      roll: 0.2,
    }),
    'cataclysm_gravity_slam'
  );
  assert.equal(
    selectArchonBossAction({
      horizDist: 5.4,
      hasLos: true,
      phase: 1,
      timeWithoutLos: 0,
      slamCooldown: 3.0,
      railCooldown: 0,
      meteorCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 0,
      scytheCooldown: 0,
      supernovaCooldown: 0,
      roll: 0.7,
    }),
    'seraphic_scythe_cleave'
  );

  // 2. Phase 2 unlocks Cathedral Solar-Astral Supernova Cascade (strictly gated out of Phase 1!)
  assert.equal(
    selectArchonBossAction({
      horizDist: 14.0,
      hasLos: true,
      phase: 2,
      timeWithoutLos: 0,
      slamCooldown: 4,
      railCooldown: 0,
      meteorCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 4,
      scytheCooldown: 4,
      supernovaCooldown: 0,
      roll: 0.15,
    }),
    'orbital_judgment_barrage'
  );
  assert.notEqual(
    selectArchonBossAction({
      horizDist: 14.0,
      hasLos: true,
      phase: 1,
      timeWithoutLos: 0,
      slamCooldown: 4,
      railCooldown: 0,
      meteorCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 4,
      scytheCooldown: 4,
      supernovaCooldown: 0,
      roll: 0.15,
    }),
    'orbital_judgment_barrage'
  );

  // 3. Cover flush prioritizes Meteor Shard Barrage, then Phase-Blink Reposition
  assert.equal(
    selectArchonBossAction({
      horizDist: 16.0,
      hasLos: false,
      phase: 1,
      timeWithoutLos: 2.4,
      slamCooldown: 4,
      railCooldown: 0,
      meteorCooldown: 0,
      fanCooldown: 0,
      blinkCooldown: 0,
      scytheCooldown: 4,
      supernovaCooldown: 4,
      roll: 0.5,
    }),
    'meteor_shard_barrage'
  );
  assert.equal(
    selectArchonBossAction({
      horizDist: 16.0,
      hasLos: false,
      phase: 1,
      timeWithoutLos: 2.4,
      slamCooldown: 4,
      railCooldown: 0,
      meteorCooldown: 4,
      fanCooldown: 0,
      blinkCooldown: 0,
      scytheCooldown: 4,
      supernovaCooldown: 4,
      roll: 0.5,
    }),
    'phase_blink_reposition'
  );

  // 4. Mid/long-range routing hits Dual Scissor Rail-Sweep, Astral Fan Judgment, and Sovereign Lance Barrage
  assert.equal(
    selectArchonBossAction({
      horizDist: 15.0,
      hasLos: true,
      phase: 1,
      timeWithoutLos: 0,
      slamCooldown: 4,
      railCooldown: 0,
      meteorCooldown: 4,
      fanCooldown: 4,
      blinkCooldown: 4,
      scytheCooldown: 4,
      supernovaCooldown: 4,
      roll: 0.35,
    }),
    'dual_archon_rail_sweep'
  );
  assert.equal(
    selectArchonBossAction({
      horizDist: 15.0,
      hasLos: true,
      phase: 1,
      timeWithoutLos: 0,
      slamCooldown: 4,
      railCooldown: 4,
      meteorCooldown: 4,
      fanCooldown: 0,
      blinkCooldown: 4,
      scytheCooldown: 4,
      supernovaCooldown: 4,
      roll: 0.78,
    }),
    'astral_fan_judgment'
  );
  assert.equal(
    selectArchonBossAction({
      horizDist: 15.0,
      hasLos: true,
      phase: 1,
      timeWithoutLos: 0,
      slamCooldown: 4,
      railCooldown: 4,
      meteorCooldown: 4,
      fanCooldown: 4,
      blinkCooldown: 4,
      scytheCooldown: 4,
      supernovaCooldown: 4,
      roll: 0.92,
    }),
    'sovereign_lance_barrage'
  );

  // 5. Pure math solvers: Scissor Rail Sweep crosses from wide apart -> crossed center
  const leftStart = computeArchonScissorSweepYaw(0, -1, 2);
  const leftEnd = computeArchonScissorSweepYaw(1, -1, 2);
  const rightStart = computeArchonScissorSweepYaw(0, 1, 2);
  const rightEnd = computeArchonScissorSweepYaw(1, 1, 2);
  assert.ok(leftStart < -0.35 && leftEnd > 0.12);
  assert.ok(rightStart > 0.35 && rightEnd < -0.12);

  // 6. Fan directions, meteor rings, supernova spiral ring & tactical blink anchor solver
  assert.equal(computeArchonFanDirections(0, 0, 1, 0).length, 5);
  assert.equal(computeArchonFanDirections(0, 0, 2, 0).length, 7);
  assert.equal(computeArchonFanDirections(0, 0, 2, 1).length, 6);
  assert.equal(computeArchonMeteorTargets(0, 70, 5, 1).length, 4);
  assert.equal(computeArchonMeteorTargets(0, 70, 5, 2).length, 7);
  const ring = computeArchonSupernovaRing(10, 0.2, -0.18);
  assert.equal(ring.length, 10);
  assert.ok(ring.every((d) => d.y < 0 && Math.abs(Math.hypot(d.x, d.y, d.z) - 1) < 1e-4));

  const blinkDest = pickArchonBlinkDestination(0, 0, 0, 11, 0.25);
  assert.ok(Math.hypot(blinkDest.x, blinkDest.z) >= 4.5);
  assert.ok(Math.abs(blinkDest.x) <= 11.5 && Math.abs(blinkDest.z) <= 7.5);
});

