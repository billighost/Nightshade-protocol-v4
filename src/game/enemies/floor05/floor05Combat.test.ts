import assert from 'node:assert/strict';
import test from 'node:test';
import {
  F5_BASE_Y,
  F5_PIT_Y,
  F5_SPAWN,
  F5_TIER_Y,
  F5_UPPER_Y,
} from '../../arena/hideout/floors/floor05/layout';
import { resolveSectorName } from '../../hud/minimapMath';
import { createEnemyCombatState, resolveEnemyHit } from '../core/damageRouting';
import { ACID_WYVERN_CONSTRUCT_CONFIG, computeVenomBarrageAngles, selectWyvernAction } from './acidWyvernConstruct';
import {
  APEX_ARENA_MARAUDER_BOSS_CONFIG,
  computeMarauderAxeWaveAngles,
  computeMarauderShotgunSpread,
  selectMarauderAction,
  solveMarauderCataclysmLeap,
} from './apexArenaMarauderBoss';
import {
  ARENA_NET_SHOOTER_CONFIG,
  computeSnareNetSpreadAngles,
  computeTeslaBurstOffsets,
  selectNetShooterAction,
  solveArcBlinkVault,
  solveShockBolaArc,
} from './arenaNetShooter';
import {
  DUAL_CLEAVER_EXECUTIONER_CONFIG,
  computeExecutionerWaveAngles,
  selectExecutionerAction,
  solveExecutionerLeap,
} from './dualCleaverExecutioner';
import {
  LEAPING_CARAPACE_STALKER_CONFIG,
  computeSpineFanAngles,
  selectStalkerAction,
  solveStalkerBackflip,
  solveStalkerPounce,
  solveStalkerVenomLob,
} from './leapingCarapaceStalker';
import {
  PLASMA_SPEAR_HOPLITE_CONFIG,
  computeJavelinSpreadAngles,
  selectHopliteAction,
  solveHopliteVaultLeap,
} from './plasmaSpearHoplite';
import {
  canUseFloor05ControlCenter,
  createInitialFloor05Progression,
  evaluateFloor05Progression,
  FLOOR05_BOSS_SPAWN,
  FLOOR05_INITIAL_SPAWNS,
  getFloor05RemainingHostilesTotal,
} from './progression';
import {
  SHIELD_CHARIOT_BRUTE_CONFIG,
  computeFlakScatterOffsets,
  selectBruteAction,
} from './shieldChariotBrute';

test('Floor 05 roster scales above Floor 06 with 28 total hostiles across 7 unique archetypes and 4 vertical tiers', () => {
  assert.equal(FLOOR05_INITIAL_SPAWNS.length, 27);
  const initialProg = createInitialFloor05Progression();
  assert.equal(initialProg.totalNormal, 25);
  assert.equal(initialProg.totalMiniBosses, 2);
  assert.equal(getFloor05RemainingHostilesTotal(initialProg), 28);

  const uniqueArchetypes = new Set([
    ...FLOOR05_INITIAL_SPAWNS.map((s) => s.archetypeId),
    FLOOR05_BOSS_SPAWN.archetypeId,
  ]);
  assert.equal(uniqueArchetypes.size, 7);
  assert.ok(uniqueArchetypes.has('plasma_spear_hoplite'));
  assert.ok(uniqueArchetypes.has('leaping_carapace_stalker'));
  assert.ok(uniqueArchetypes.has('arena_net_shooter'));
  assert.ok(uniqueArchetypes.has('shield_chariot_brute'));
  assert.ok(uniqueArchetypes.has('dual_cleaver_executioner'));
  assert.ok(uniqueArchetypes.has('acid_wyvern_construct'));
  assert.ok(uniqueArchetypes.has('apex_arena_marauder_boss'));

  // Verify all 4 vertical tiers are populated
  const ys = FLOOR05_INITIAL_SPAWNS.map((s) => s.y);
  assert.ok(ys.some((y) => Math.abs(y - F5_PIT_Y) < 0.05), 'War-Pit tier populated');
  assert.ok(ys.some((y) => Math.abs(y - F5_TIER_Y) < 0.05), 'Mid Amphitheater Terrace populated');
  assert.ok(ys.some((y) => Math.abs(y - F5_BASE_Y) < 0.05), 'Main Promenade & outer wings populated');
  assert.ok(ys.some((y) => Math.abs(y - F5_UPPER_Y) < 0.05), 'Upper VIP balconies & catwalks populated');
});

test('Floor 05 spawn table keeps Arrival, Sealed Prototype Vault, and central Holo War-Table 100% clear', () => {
  const allSpawns = [...FLOOR05_INITIAL_SPAWNS, FLOOR05_BOSS_SPAWN];
  const ids = new Set<string>();
  for (const s of allSpawns) {
    assert.ok(!ids.has(s.id), `Duplicate spawn id ${s.id}`);
    ids.add(s.id);

    // Clear of North Arrival spawn at (0, 56, -14)
    const distFromArrival = Math.hypot(s.x - F5_SPAWN.x, s.z - F5_SPAWN.z);
    assert.ok(distFromArrival > 7.5, `${s.id} spawns too close to Arrival (${distFromArrival.toFixed(2)}m)`);

    // Clear of Zone 6 Sealed Black-Ops Prototype Vault (x >= 38.0, z <= -16.6)
    const insideSealedVault = s.x >= 37.5 && s.z <= -16.2;
    assert.equal(insideSealedVault, false, `${s.id} must NOT spawn inside sealed NE Prototype Vault!`);

    // Clear of Sunken War-Pit Central Holo War-Table collider (x,z in [-2.35, +2.35] on pit floor)
    const insideWarTable =
      Math.abs(s.y - F5_PIT_Y) < 0.5 && Math.abs(s.x) <= 2.6 && Math.abs(s.z) <= 2.6;
    assert.equal(insideWarTable, false, `${s.id} must NOT spawn inside War-Pit Holo War-Table!`);
  }
});

test('Floor 05 strict all-enemies-vanquished Control Center gating & boss trigger progression', () => {
  let state = createInitialFloor05Progression();
  assert.equal(canUseFloor05ControlCenter(state).allowed, false);

  state.liveCombatActive = true;
  let res = evaluateFloor05Progression(state, {
    liveCombatActive: true,
    aliveNormal: 25,
    aliveMiniBosses: 2,
    bossSpawned: false,
    bossAlive: false,
  });
  state = res.next;
  assert.equal(res.shouldSpawnBoss, false);
  assert.equal(canUseFloor05ControlCenter(state).allowed, false);
  assert.match(canUseFloor05ControlCenter(state).reason ?? '', /ALL ENEMIES MUST BE VANQUISHED FIRST/);

  // Killing both Zone Mini-Bosses triggers APEX ARENA MARAUDER spawn!
  res = evaluateFloor05Progression(state, {
    liveCombatActive: true,
    aliveNormal: 12,
    aliveMiniBosses: 0,
    bossSpawned: false,
    bossAlive: false,
  });
  state = res.next;
  assert.equal(res.shouldSpawnBoss, true);
  assert.equal(state.bossSpawned, true);
  assert.equal(canUseFloor05ControlCenter(state).allowed, false);

  // Even after Boss dies, Control Center stays LOCKED if 1 normal hostile remains!
  res = evaluateFloor05Progression(state, {
    liveCombatActive: true,
    aliveNormal: 1,
    aliveMiniBosses: 0,
    bossSpawned: true,
    bossAlive: false,
  });
  state = res.next;
  assert.equal(state.bossDefeated, true);
  assert.equal(state.floorCleared, false);
  assert.equal(canUseFloor05ControlCenter(state).allowed, false);

  // Last normal hostile eliminated -> Floor Cleared & Control Center UNLOCKED!
  res = evaluateFloor05Progression(state, {
    liveCombatActive: true,
    aliveNormal: 0,
    aliveMiniBosses: 0,
    bossSpawned: true,
    bossAlive: false,
  });
  state = res.next;
  assert.equal(res.justClearedFloor, true);
  assert.equal(state.floorCleared, true);
  assert.equal(canUseFloor05ControlCenter(state).allowed, true);
});

test('Floor 05 weakpoint shatter, shield break, and Phase 2 overdrive damage routing', () => {
  // Shield-Chariot Brute starts shielded; breaking dorsal booster shatters shield & staggers with HP left to punish
  const brute = createEnemyCombatState('b1', SHIELD_CHARIOT_BRUTE_CONFIG, 'f5_z2_coliseum');
  assert.equal(brute.shieldActive, true);
  const blocked = resolveEnemyHit(brute, SHIELD_CHARIOT_BRUTE_CONFIG, 40, 'shield');
  assert.equal(blocked.blockedByShield, true);

  const wpChip = resolveEnemyHit(brute, SHIELD_CHARIOT_BRUTE_CONFIG, 40, 'weakpoint');
  assert.equal(wpChip.hitWeakpoint, true);
  assert.equal(wpChip.weakpointBroken, false);
  const wpBreak = resolveEnemyHit(brute, SHIELD_CHARIOT_BRUTE_CONFIG, 40, 'weakpoint');
  assert.equal(wpBreak.hitWeakpoint, true);
  assert.equal(wpBreak.weakpointBroken, true);
  assert.equal(wpBreak.shieldShattered, true);
  assert.equal(brute.alive, true);
  assert.equal(brute.shieldActive, false);
  assert.ok(brute.staggerTimer > 0);

  // Verify the other 3 normal archetypes also survive weakpoint shatter in a staggered punish window
  for (const cfg of [
    PLASMA_SPEAR_HOPLITE_CONFIG,
    LEAPING_CARAPACE_STALKER_CONFIG,
    ARENA_NET_SHOOTER_CONFIG,
  ]) {
    const st = createEnemyCombatState(`wp_${cfg.id}`, cfg, 'f5_z2_coliseum');
    const res = resolveEnemyHit(st, cfg, cfg.weakpoint.breakThreshold, 'weakpoint');
    assert.equal(res.weakpointBroken, true, `${cfg.id} weakpoint must break`);
    assert.equal(st.alive, true, `${cfg.id} must survive weakpoint shatter to allow stagger punish`);
    assert.ok(st.staggerTimer > 0, `${cfg.id} must stagger on weakpoint shatter`);
  }

  // APEX ARENA MARAUDER transitions to Phase 2 at <= 55% HP
  const boss = createEnemyCombatState('boss1', APEX_ARENA_MARAUDER_BOSS_CONFIG, 'f5_z2_coliseum');
  assert.equal(boss.phase, 1);
  const p2Hit = resolveEnemyHit(boss, APEX_ARENA_MARAUDER_BOSS_CONFIG, 900, 'body');
  assert.equal(p2Hit.phaseTransitionedTo2, true);
  assert.equal(boss.phase, 2);
});

test('Floor 05 pure tactics & trajectory math for all 7 archetypes', () => {
  // Plasma-Spear Hoplite: full 7-attack flexible toolkit + lateral combat strafe + vault ballistic solver
  assert.equal(
    selectHopliteAction({
      horizDist: 7.0,
      vertDist: 0.4,
      hasLos: true,
      hasAttackToken: true,
      capacitorBroken: false,
      lungeCooldown: 0,
      sweepCooldown: 2,
      javelinCooldown: 2,
      braceCooldown: 0,
      damageBurstAccum: 40,
      roll: 0.5,
    }),
    'phalanx_brace_advance'
  );
  assert.equal(
    selectHopliteAction({
      horizDist: 2.3,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      capacitorBroken: false,
      lungeCooldown: 2,
      sweepCooldown: 0,
      javelinCooldown: 2,
      braceCooldown: 2,
      bashCooldown: 0,
      flurryCooldown: 0,
      damageBurstAccum: 0,
      roll: 0.2,
    }),
    'shield_bash_slam'
  );
  assert.equal(
    selectHopliteAction({
      horizDist: 3.4,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      capacitorBroken: false,
      lungeCooldown: 2,
      sweepCooldown: 0,
      javelinCooldown: 2,
      braceCooldown: 2,
      bashCooldown: 2,
      flurryCooldown: 0,
      damageBurstAccum: 0,
      roll: 0.25,
    }),
    'triple_flurry_thrust'
  );
  assert.equal(
    selectHopliteAction({
      horizDist: 10.5,
      vertDist: 1.8,
      hasLos: true,
      hasAttackToken: true,
      capacitorBroken: false,
      lungeCooldown: 2,
      sweepCooldown: 2,
      javelinCooldown: 0,
      braceCooldown: 2,
      vaultCooldown: 0,
      damageBurstAccum: 0,
      roll: 0.2,
    }),
    'vaulting_plunge_spear'
  );
  assert.equal(
    selectHopliteAction({
      horizDist: 6.0,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: false,
      capacitorBroken: false,
      lungeCooldown: 2,
      sweepCooldown: 2,
      javelinCooldown: 2,
      braceCooldown: 2,
      strafeCooldown: 0,
      damageBurstAccum: 0,
      roll: 0.3,
    }),
    'combat_strafe'
  );
  assert.equal(computeJavelinSpreadAngles(2).length, 2);
  assert.equal(computeJavelinSpreadAngles(3).length, 3);
  const vault = solveHopliteVaultLeap(10, 0, 0.62);
  assert.ok(vault.vx > 12 && vault.peakHeight > 2.2);
  assert.ok(PLASMA_SPEAR_HOPLITE_CONFIG.maxHp >= 300);

  assert.equal(
    selectStalkerAction({
      horizDist: 8.0,
      vertDist: 0.5,
      hasLos: true,
      hasAttackToken: true,
      pounceCooldown: 0,
      clawCooldown: 1,
      spineCooldown: 2,
      sidestepCooldown: 2,
      roll: 0.5,
    }),
    'tier_pounce_leap'
  );
  assert.equal(
    selectStalkerAction({
      horizDist: 2.3,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      pounceCooldown: 2,
      clawCooldown: 0,
      tailWhipCooldown: 0,
      spineCooldown: 2,
      sidestepCooldown: 2,
      roll: 0.2,
    }),
    'tail_whip_spin'
  );
  assert.equal(
    selectStalkerAction({
      horizDist: 7.5,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      pounceCooldown: 0,
      clawCooldown: 2,
      blitzCooldown: 0,
      spineCooldown: 2,
      sidestepCooldown: 2,
      roll: 0.2,
    }),
    'predator_blitz_rush'
  );
  assert.equal(
    selectStalkerAction({
      horizDist: 14.0,
      vertDist: 2.0,
      hasLos: false,
      hasAttackToken: true,
      pounceCooldown: 2,
      clawCooldown: 2,
      mortarCooldown: 0,
      spineCooldown: 2,
      sidestepCooldown: 2,
      roll: 0.5,
    }),
    'venom_mortar_lob'
  );
  assert.equal(
    selectStalkerAction({
      horizDist: 4.5,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: false,
      pounceCooldown: 2,
      clawCooldown: 2,
      spineCooldown: 2,
      sidestepCooldown: 2,
      backflipCooldown: 0,
      damageBurstAccum: 55,
      roll: 0.4,
    }),
    'backflip_venom_reposition'
  );
  const pounce = solveStalkerPounce(8, 0, 0.56);
  assert.ok(pounce.vx > 10 && pounce.peakHeight > 1.5);
  const venomLob = solveStalkerVenomLob(0, 56, 0, 12, 58, 0, 16, 0.9);
  assert.ok(venomLob.vx > 10 && venomLob.vy > 8);
  const backflip = solveStalkerBackflip(0, 1, 1, 0.48);
  assert.ok(Math.hypot(backflip.vx, backflip.vz) > 10 && backflip.peakHeight > 1.6);
  assert.equal(computeSpineFanAngles().length, 3);
  assert.equal(computeSpineFanAngles(5).length, 5);
  assert.ok(LEAPING_CARAPACE_STALKER_CONFIG.sprintSpeed >= 8.5);

  assert.equal(
    selectNetShooterAction({
      horizDist: 14.0,
      hasLos: true,
      hasAttackToken: true,
      netCooldown: 0,
      mortarCooldown: 3,
      snipeCooldown: 3,
      strafeCooldown: 2,
      roll: 0.3,
    }),
    'electric_snare_net'
  );
  assert.equal(
    selectNetShooterAction({
      horizDist: 3.1,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      netCooldown: 0,
      mortarCooldown: 2,
      snipeCooldown: 2,
      strafeCooldown: 2,
      meleeCooldown: 0,
      novaCooldown: 0,
      roll: 0.2,
    }),
    'trident_arc_cleave'
  );
  assert.equal(
    selectNetShooterAction({
      horizDist: 4.2,
      vertDist: 0.3,
      hasLos: true,
      hasAttackToken: true,
      netCooldown: 0,
      mortarCooldown: 2,
      snipeCooldown: 2,
      strafeCooldown: 2,
      meleeCooldown: 2,
      novaCooldown: 0,
      roll: 0.6,
    }),
    'voltaic_shock_nova'
  );
  assert.equal(
    selectNetShooterAction({
      horizDist: 12.0,
      hasLos: false,
      hasAttackToken: true,
      netCooldown: 0,
      mortarCooldown: 0,
      snipeCooldown: 0,
      strafeCooldown: 2,
      roll: 0.5,
    }),
    'shock_bola_mortar'
  );
  assert.equal(
    selectNetShooterAction({
      horizDist: 13.0,
      hasLos: true,
      hasAttackToken: true,
      netCooldown: 2,
      mortarCooldown: 2,
      snipeCooldown: 2,
      burstCooldown: 0,
      strafeCooldown: 2,
      roll: 0.4,
    }),
    'tesla_burst_sweep'
  );
  assert.equal(
    selectNetShooterAction({
      horizDist: 8.5,
      hasLos: true,
      hasAttackToken: false,
      netCooldown: 0,
      mortarCooldown: 0,
      snipeCooldown: 0,
      strafeCooldown: 2,
      blinkCooldown: 0,
      damageBurstAccum: 50,
      roll: 0.5,
    }),
    'arc_blink_reposition'
  );
  assert.equal(computeSnareNetSpreadAngles(4).length, 4);
  assert.equal(computeSnareNetSpreadAngles(6).length, 6);
  assert.equal(computeTeslaBurstOffsets(1).length, 3);
  const arc = solveShockBolaArc(0, 60, 0, 12, 56, 0, 16, 1.0);
  assert.ok(arc.vx > 10 && arc.vy > 0);
  const blink = solveArcBlinkVault(0, -1, 1, 0.44);
  assert.ok(Math.hypot(blink.vx, blink.vz) > 12 && blink.peakHeight > 1.4);
  assert.ok(ARENA_NET_SHOOTER_CONFIG.detectRange >= 32);

  assert.equal(
    selectBruteAction({
      horizDist: 10.0,
      vertDist: 0.2,
      hasLos: true,
      hasAttackToken: true,
      shieldActive: true,
      rushCooldown: 0,
      slamCooldown: 2,
      flakCooldown: 2,
      bashCooldown: 2,
      roll: 0.5,
    }),
    'chariot_bull_rush'
  );
  assert.equal(computeFlakScatterOffsets().length, 5);

  assert.equal(
    selectExecutionerAction({
      horizDist: 3.5,
      vertDist: 0.5,
      hasLos: true,
      phase: 2,
      cleaveCooldown: 0,
      whirlwindCooldown: 2,
      leapCooldown: 2,
      waveCooldown: 2,
      guillotineCooldown: 2,
      roll: 0.8,
    }),
    'twin_x_cleave'
  );
  assert.equal(computeExecutionerWaveAngles(2).length, 5);
  assert.ok(solveExecutionerLeap(10, 0).peakHeight > 2.0);
  assert.ok(DUAL_CLEAVER_EXECUTIONER_CONFIG.maxHp >= 800);

  assert.equal(
    selectWyvernAction({
      horizDist: 12.0,
      hasLos: true,
      phase: 2,
      barrageCooldown: 0,
      mortarCooldown: 3,
      diveCooldown: 3,
      roll: 0.8,
    }),
    'twin_tail_venom_barrage'
  );
  assert.equal(computeVenomBarrageAngles(2).length, 7);
  assert.ok(ACID_WYVERN_CONSTRUCT_CONFIG.maxHp >= 750);

  assert.equal(
    selectMarauderAction({
      horizDist: 12.0,
      vertDist: 0.5,
      hasLos: true,
      phase: 2,
      dashCleaveCooldown: 2,
      shotgunCooldown: 2,
      axeWaveCooldown: 2,
      leapCooldown: 2,
      parryCooldown: 2,
      salvoCooldown: 0,
      damageBurstAccum: 0,
      roll: 0.2,
    }),
    'spectral_hound_salvo'
  );
  assert.equal(computeMarauderAxeWaveAngles(2).length, 5);
  assert.equal(computeMarauderShotgunSpread().length, 6);
  assert.ok(solveMarauderCataclysmLeap(12, 0).peakHeight > 2.5);
});

test('Floor 05 minimap resolves all 9 distinct sector names cleanly', () => {
  assert.equal(resolveSectorName(5, 0, -14, 'F5'), 'NORTH ARRIVAL');
  assert.equal(resolveSectorName(5, 0, 0, 'F5'), 'WAR-PIT COLISEUM');
  assert.equal(resolveSectorName(5, -30, 0, 'F5'), 'WEST SIM-DECK');
  assert.equal(resolveSectorName(5, 30, 0, 'F5'), 'EAST MECH-BAY');
  assert.equal(resolveSectorName(5, -30, -20, 'F5'), 'NW ORBITAL ARRAY');
  assert.equal(resolveSectorName(5, 30, -20, 'F5'), 'NE WAR-COUNCIL');
  assert.equal(resolveSectorName(5, -30, 20, 'F5'), 'SW REACTOR GALLERY');
  assert.equal(resolveSectorName(5, 30, 20, 'F5'), 'SE ORDNANCE DEPOT');
  assert.equal(resolveSectorName(5, 0, 14, 'F5'), 'SOUTH EXTRACTION');
});
