import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEnemyCombatState, exposeEnemyWeakpoint, resolveEnemyHit } from '../core/damageRouting';
import { FLOOR08_LIVE_ROSTER, FLOOR08_BOSS_SPAWN } from '../floor08/progression';
import { resolveSectorName } from '../../hud/minimapMath';
import {
  BASTION_SEVEN_BOSS_CONFIG,
  canUseFloor07ControlCenter,
  createInitialFloor07Progression,
  evaluateFloor07Progression,
  EXO_CARBINE_TROOPER_CONFIG,
  FLOOR07_BOSS_SPAWN,
  FLOOR07_LIVE_ROSTER,
  getFloor07RemainingHostilesTotal,
  GRAPPLE_LANCE_DUELIST_CONFIG,
  MORTAR_POD_BOMBARDIER_CONFIG,
  TURBINE_JUGGERNAUT_CONFIG,
  VALKYRIE_HOVER_DRONE_CONFIG,
  VAULT_STALKER_SNIPER_CONFIG,
  computeFlushGrenadeVelocity,
  selectExoTrooperAttack,
  selectDuelistAttack,
  computePlasmaArcDirections,
  computeTetherZipVelocity,
  selectBombardierAttack,
  computeBallisticMortarArc,
  computeCarpetStrikeTargets,
  selectValkyrieAttack,
  computeStrafeRunVector,
  computeMicroRocketOffsets,
  selectJuggernautAttack,
  computeVoltArcFanDirections,
  computeBullRushVelocity,
  selectStalkerAttack,
  computeFlechetteFanDirections,
  computeCloakDashVelocity,
  selectBastionAttack,
  computeSiegeMissileTargets,
  computePlasmaFanDirections,
  computeTitanChargeVelocity,
} from './index';

describe('Floor 07 Encounter Roster & Non-Recycled Variety', () => {
  it('populates Floor 07 with >= 20 initial hostiles + 1 boss across 7 completely unique non-Floor-08 archetypes', () => {
    assert.ok(
      FLOOR07_LIVE_ROSTER.length >= 20,
      `Expected >= 20 initial Floor 07 hostiles, got ${FLOOR07_LIVE_ROSTER.length}`
    );

    const floor08Types = new Set<string>([
      ...FLOOR08_LIVE_ROSTER.map((s) => s.archetypeId),
      FLOOR08_BOSS_SPAWN.archetypeId,
    ]);
    const floor07Types = new Set<string>([
      ...FLOOR07_LIVE_ROSTER.map((s) => s.archetypeId),
      FLOOR07_BOSS_SPAWN.archetypeId,
    ]);

    assert.equal(floor07Types.size, 7, 'Floor 07 must contain 7 unique archetypes (4 normal + 2 mini-boss + 1 boss)');
    for (const t of floor07Types) {
      assert.ok(!floor08Types.has(t), `Floor 07 archetype "${t}" must not be recycled from Floor 08`);
    }

    // Verify all 4 normal types + both mini-bosses exist in the initial roster
    const counts = new Map<string, number>();
    for (const s of FLOOR07_LIVE_ROSTER) {
      counts.set(s.archetypeId, (counts.get(s.archetypeId) ?? 0) + 1);
    }
    assert.ok((counts.get('exo_carbine_trooper') ?? 0) >= 4);
    assert.ok((counts.get('grapple_lance_duelist') ?? 0) >= 3);
    assert.ok((counts.get('mortar_pod_bombardier') ?? 0) >= 3);
    assert.ok((counts.get('valkyrie_hover_drone') ?? 0) >= 3);
    assert.equal(counts.get('turbine_juggernaut'), 1);
    assert.equal(counts.get('vault_stalker_sniper'), 1);
    assert.equal(FLOOR07_BOSS_SPAWN.archetypeId, 'bastion_seven_boss');
  });

  it('gives all 7 Floor 07 enemies challenging COD/Halo durability pools (no paper enemies)', () => {
    assert.ok(EXO_CARBINE_TROOPER_CONFIG.maxHp >= 320);
    assert.ok(GRAPPLE_LANCE_DUELIST_CONFIG.maxHp >= 400);
    assert.ok(MORTAR_POD_BOMBARDIER_CONFIG.maxHp >= 420);
    assert.ok(VALKYRIE_HOVER_DRONE_CONFIG.maxHp >= 300);
    assert.ok(TURBINE_JUGGERNAUT_CONFIG.maxHp >= 1500);
    assert.ok(VAULT_STALKER_SNIPER_CONFIG.maxHp >= 1250);
    assert.ok(BASTION_SEVEN_BOSS_CONFIG.maxHp >= 3200);
  });

  it('spawns no ground Floor 07 enemies inside the Central Spiral Abyss void (r < 5.3m)', () => {
    for (const spec of [...FLOOR07_LIVE_ROSTER, FLOOR07_BOSS_SPAWN]) {
      if (spec.archetypeId === 'valkyrie_hover_drone') continue;
      if (spec.zone !== 'f7_z2_rotunda') continue;
      const r = Math.hypot(spec.x, spec.z);
      assert.ok(
        r >= 5.3,
        `Ground enemy "${spec.id}" in Rotunda at (${spec.x}, ${spec.z}) has r=${r.toFixed(2)} < 5.3m abyss safety radius`
      );
    }
  });
});

describe('Floor 07 Weakpoint Counterplay & Bastion-VII Boss Phases', () => {
  it('breaks Exo-Carbine Trooper dorsal exo-pack weakpoint with bonus overload damage & stagger', () => {
    const state = createEnemyCombatState('exo_1', EXO_CARBINE_TROOPER_CONFIG, 'f7_z2_rotunda');
    const r1 = resolveEnemyHit(state, EXO_CARBINE_TROOPER_CONFIG, 50, 'weakpoint');
    assert.equal(r1.isCritical, true);
    assert.equal(r1.weakpointBroken, false);
    const r2 = resolveEnemyHit(state, EXO_CARBINE_TROOPER_CONFIG, 55, 'weakpoint');
    assert.equal(r2.weakpointBroken, true);
    assert.equal(r2.staggerTriggered, true);
    assert.ok(state.staggerTimer >= 1.9);
  });

  it('routes Exo-Carbine Trooper multi-attack tactics (CQC buttstroke, cover-flush grenade, hyper-burst, jet-flank) and locks jet-flank when dorsal exo-pack breaks', () => {
    const base = {
      horizDist: 14,
      hasLos: true,
      hasAttackToken: true,
      exoPackBroken: false,
      burstCooldown: 0,
      jetCooldown: 0,
      hyperCooldown: 0,
      grenadeCooldown: 0,
      cqcCooldown: 0,
      timeWithoutLos: 0,
      roll: 0.65,
    };

    // Close rush triggers CQC plasma buttstroke
    assert.equal(selectExoTrooperAttack({ ...base, horizDist: 2.8 }), 'cqc_buttstroke');

    // Player hiding behind cover triggers arcing flush grenade even without LOS
    assert.equal(
      selectExoTrooperAttack({ ...base, hasLos: false, hasAttackToken: false, timeWithoutLos: 1.1 }),
      'flush_grenade'
    );

    // Medium-long range hyper-burst roll selects laser-locked hyper-burst
    assert.equal(selectExoTrooperAttack({ ...base, roll: 0.35 }), 'overcharged_hyper_burst');

    // Intact dorsal exo-pack enables airborne jet-flank burst
    assert.equal(selectExoTrooperAttack({ ...base, roll: 0.65 }), 'jet_flank_burst');

    // Broken dorsal exo-pack disables jet-flank and falls back to standard pulse burst!
    assert.equal(
      selectExoTrooperAttack({ ...base, exoPackBroken: true, roll: 0.65 }),
      'pulse_burst'
    );

    // Ballistic flush-grenade velocity solver produces upward arc clearing waist-high cover
    const vel = computeFlushGrenadeVelocity(0, 85.3, 0, 12, 84.1, 0, 19.5, 1.0);
    assert.ok(vel.vy > 7.5, `Expected strong upward arc vy > 7.5, got ${vel.vy}`);
    assert.ok(Math.abs(vel.vx - 12) < 0.01);
  });

  it('breaks Grapple-Lance Duelist Chest Tether Winch weakpoint, routes all 5 combat moves, and locks Tether-Zip when winch ruptures', () => {
    const state = createEnemyCombatState('duelist_1', GRAPPLE_LANCE_DUELIST_CONFIG, 'f7_z2_rotunda');
    const r1 = resolveEnemyHit(state, GRAPPLE_LANCE_DUELIST_CONFIG, 50, 'weakpoint');
    assert.equal(r1.isCritical, true);
    assert.equal(r1.weakpointBroken, false);
    const r2 = resolveEnemyHit(state, GRAPPLE_LANCE_DUELIST_CONFIG, 65, 'weakpoint');
    assert.equal(r2.weakpointBroken, true);
    assert.equal(r2.staggerTriggered, true);
    assert.ok(state.staggerTimer >= 2.0);

    const base = {
      horizDist: 10.5,
      vertDist: 0.4,
      hasLos: true,
      hasAttackToken: true,
      winchBroken: false,
      recentlyDamaged: false,
      zipCooldown: 0,
      slamCooldown: 0,
      waveCooldown: 0,
      feintCooldown: 0,
      comboCooldown: 0,
      roll: 0.4,
    };

    // Close range triggers 2-hit Plasma-Lance Flurry Combo
    assert.equal(selectDuelistAttack({ ...base, horizDist: 3.1 }), 'lance_flurry_combo');

    // Taking damage at close-mid range triggers reactive Evasive Sidestep Feint
    assert.equal(
      selectDuelistAttack({ ...base, horizDist: 6.5, recentlyDamaged: true }),
      'evasive_sidestep_feint'
    );

    // Intact Chest Tether Winch triggers signature Tether-Zip Lunge at 6.2-18.5m
    assert.equal(selectDuelistAttack(base), 'tether_zip_lunge');

    // Shattering Chest Tether Winch permanently locks out Tether-Zip Lunge!
    assert.equal(
      selectDuelistAttack({ ...base, horizDist: 7.0, winchBroken: true, roll: 0.35 }),
      'vault_shock_slam'
    );
    assert.equal(
      selectDuelistAttack({ ...base, horizDist: 11.0, winchBroken: true }),
      'plasma_arc_wave'
    );

    // 3-bolt crescent plasma wave fan produces 3 unit directions centered on baseYaw
    const dirs = computePlasmaArcDirections(0, 0.05, 0.165);
    assert.equal(dirs.length, 3);
    assert.ok(dirs[0].x > 0 && dirs[2].x < 0, 'Left/right fan bolts must fan symmetrically');
    assert.ok(Math.abs(Math.hypot(dirs[1].x, dirs[1].y, dirs[1].z) - 1) < 1e-5);

    // Tether-zip velocity solver produces exact normalized zip speed
    const zVel = computeTetherZipVelocity(0, 0, 9, 12, 19.5);
    assert.ok(Math.abs(Math.hypot(zVel.vx, zVel.vz) - 19.5) < 1e-4);
    assert.equal(zVel.dist, 15);
  });

  it('breaks Mortar-Pod Bombardier Shoulder Ordnance Drums weakpoint, routes all 5 attacks, locks Carpet Barrage when drums break, and solves ballistic mortar arcs', () => {
    const state = createEnemyCombatState('bomb_1', MORTAR_POD_BOMBARDIER_CONFIG, 'f7_z2_rotunda');
    const r1 = resolveEnemyHit(state, MORTAR_POD_BOMBARDIER_CONFIG, 50, 'weakpoint');
    assert.equal(r1.isCritical, true);
    assert.equal(r1.weakpointBroken, false);
    const r2 = resolveEnemyHit(state, MORTAR_POD_BOMBARDIER_CONFIG, 70, 'weakpoint');
    assert.equal(r2.weakpointBroken, true);
    assert.equal(r2.staggerTriggered, true);
    assert.ok(state.staggerTimer >= 2.4);

    const base = {
      horizDist: 16.0,
      vertDist: 0.4,
      hasLos: true,
      hasAttackToken: true,
      drumsBroken: false,
      stompCooldown: 0,
      carpetCooldown: 0,
      flakCooldown: 0,
      salvoCooldown: 0,
      shrapnelCooldown: 0,
      roll: 0.35,
    };

    // Close rush triggers 360° Concussion Shock-Stomp
    assert.equal(
      selectBombardierAttack({ ...base, horizDist: 3.8, vertDist: 0.5 }),
      'concussion_shock_stomp'
    );

    // Close-mid flanker with LOS triggers 5-pellet Suppressive Shrapnel Fan
    assert.equal(
      selectBombardierAttack({ ...base, horizDist: 7.5, roll: 0.4 }),
      'suppressive_shrapnel_fan'
    );

    // Intact Shoulder Ordnance Drums enable 3-shell Carpet Cluster Barrage at 8.5-33m
    assert.equal(selectBombardierAttack(base), 'carpet_cluster_barrage');

    // Rupturing Shoulder Ordnance Drums PERMANENTLY locks out Carpet Cluster Barrage!
    assert.equal(
      selectBombardierAttack({ ...base, drumsBroken: true }),
      'direct_flak_burst'
    );

    // Player hiding behind tall cover (no LOS) still gets flushed by Incendium Bracket Salvo!
    assert.equal(
      selectBombardierAttack({ ...base, hasLos: false, drumsBroken: true }),
      'incendium_bracket_salvo'
    );

    // Ballistic mortar arc solver reaches target cleanly with strong upward loft
    const arc = computeBallisticMortarArc(0, 86.2, 0, 14, 84.1, 0, 15.5);
    assert.ok(arc.vy > 4.5, `Expected strong upward mortar arc vy > 4.5, got ${arc.vy}`);
    assert.ok(Math.abs(arc.vx * arc.flightTime - 14) < 0.01);

    // Carpet Cluster target generator creates 3 stepped targets along player velocity
    const targets = computeCarpetStrikeTargets(10, 84, -4, 6, 0, 0, 1);
    assert.equal(targets.length, 3);
    assert.ok(targets[0].x < targets[1].x && targets[1].x < targets[2].x);
  });

  it('breaks Valkyrie Hover-Drone Optic Gyro-Core weakpoint, routes all 5 aerial attacks, permanently locks Rail-Laser & Dive-Strafe when core shatters, and computes strafe/rocket vectors', () => {
    const state = createEnemyCombatState('valk_1', VALKYRIE_HOVER_DRONE_CONFIG, 'f7_z2_rotunda');
    const r1 = resolveEnemyHit(state, VALKYRIE_HOVER_DRONE_CONFIG, 45, 'weakpoint');
    assert.equal(r1.isCritical, true);
    assert.equal(r1.weakpointBroken, false);
    const r2 = resolveEnemyHit(state, VALKYRIE_HOVER_DRONE_CONFIG, 55, 'weakpoint');
    assert.equal(r2.weakpointBroken, true);
    assert.equal(r2.staggerTriggered, true);
    assert.ok(state.staggerTimer >= 2.3);

    const base = {
      horizDist: 16.0,
      vertDist: 2.2,
      hasLos: true,
      hasAttackToken: true,
      gyroCoreBroken: false,
      empCooldown: 0,
      railCooldown: 0,
      strafeRunCooldown: 0,
      rocketCooldown: 0,
      burstCooldown: 0,
      roll: 0.2,
    };

    // Close range triggers 360° EMP Shock-Pulse even without attack token
    assert.equal(
      selectValkyrieAttack({ ...base, horizDist: 4.4, vertDist: 3.0, hasAttackToken: false }),
      'emp_shock_pulse'
    );

    // Intact Optic Gyro-Core selects laser-locked Overcharged Rail-Laser Sweep at low roll
    assert.equal(selectValkyrieAttack({ ...base, roll: 0.2 }), 'rail_laser_sweep');

    // Intact Optic Gyro-Core selects high-speed banked Dive-Strafe Run at mid roll
    assert.equal(selectValkyrieAttack({ ...base, roll: 0.5 }), 'dive_strafe_run');

    // Shattering Optic Gyro-Core PERMANENTLY locks out BOTH Rail-Laser Sweep AND Dive-Strafe Run!
    assert.equal(
      selectValkyrieAttack({ ...base, gyroCoreBroken: true, roll: 0.2 }),
      'micro_rocket_salvo'
    );
    assert.equal(
      selectValkyrieAttack({ ...base, gyroCoreBroken: true, roll: 0.5 }),
      'micro_rocket_salvo'
    );
    assert.equal(
      selectValkyrieAttack({ ...base, gyroCoreBroken: true, roll: 0.85 }),
      'twin_autocannon_burst'
    );

    // Strafe-run vector produces fast diagonal tangent sweep at ~runSpeed
    const sv = computeStrafeRunVector(0, 0, 0, -15, 1, 12.8);
    const speed = Math.hypot(sv.vx, sv.vz);
    assert.ok(speed >= 12.4 && speed <= 13.1, `Expected strafe speed ~12.8, got ${speed}`);
    assert.ok(sv.vz < 0 && sv.vx > 0, 'Strafe run should advance toward target while sweeping laterally');

    // Micro-rocket salvo yields 4 alternating port/starboard wing pod offsets
    const offsets = computeMicroRocketOffsets();
    assert.equal(offsets.length, 4);
    assert.equal(offsets[0].side, -1);
    assert.equal(offsets[1].side, 1);
    assert.equal(offsets[2].side, -1);
    assert.equal(offsets[3].side, 1);
  });

  it('breaks Turbine Juggernaut VOLT-VII Dorsal Cooling Radiator, triggers Phase 2 Overdrive at <= 55% HP, routes all 6 mini-boss attacks, and scales Volt-Arc fan & Bull-Rush in Phase 2', () => {
    const state = createEnemyCombatState('jugg_1', TURBINE_JUGGERNAUT_CONFIG, 'f7_z6_se_turbines');
    const r1 = resolveEnemyHit(state, TURBINE_JUGGERNAUT_CONFIG, 90, 'weakpoint');
    assert.equal(r1.isCritical, true);
    assert.equal(r1.weakpointBroken, false);
    const r2 = resolveEnemyHit(state, TURBINE_JUGGERNAUT_CONFIG, 105, 'weakpoint');
    assert.equal(r2.weakpointBroken, true);
    assert.equal(r2.staggerTriggered, true);
    assert.ok(state.staggerTimer >= 2.9);

    // Pushing HP below 55% triggers Phase 2 Overdrive
    const p2 = resolveEnemyHit(state, TURBINE_JUGGERNAUT_CONFIG, 250, 'body');
    assert.equal(p2.phaseTransitionedTo2, true);
    assert.equal(state.phase, 2);

    const base = {
      horizDist: 13.0,
      vertDist: 0.3,
      hasLos: true,
      phase: 1 as 1 | 2,
      timeWithoutLos: 0,
      slamCooldown: 0,
      rushCooldown: 0,
      arcCooldown: 0,
      railCooldown: 0,
      volleyCooldown: 0,
      mortarCooldown: 0,
      roll: 0.15,
    };

    // Close range triggers Piledriver Seismic Arc-Slam
    assert.equal(
      selectJuggernautAttack({ ...base, horizDist: 4.5 }),
      'seismic_arc_slam'
    );

    // Hiding behind pillars (no LOS) triggers twin Cover-Flush Arc-Mortars
    assert.equal(
      selectJuggernautAttack({ ...base, hasLos: false, timeWithoutLos: 1.2 }),
      'cover_flush_arc_mortar'
    );

    // Mid-range open lane low roll triggers Juggernaut Bull-Rush Charge
    assert.equal(selectJuggernautAttack({ ...base, roll: 0.15 }), 'juggernaut_bull_rush');

    // Long-range mid roll triggers laser-locked Overcharge Rail-Lance
    assert.equal(selectJuggernautAttack({ ...base, roll: 0.38 }), 'overcharge_rail_lance');

    // Higher roll triggers Volt-Arc Plasma Barrage
    assert.equal(selectJuggernautAttack({ ...base, roll: 0.6 }), 'volt_arc_barrage');

    // High roll triggers signature VOLT-VULCAN Rotary Suppression Sweep
    assert.equal(selectJuggernautAttack({ ...base, roll: 0.85 }), 'rotary_suppression_sweep');

    // Volt-Arc fan scales from 5 orbs in Phase 1 to 7 wider orbs in Phase 2 Overdrive
    const fanP1 = computeVoltArcFanDirections(0, 0, 1);
    const fanP2 = computeVoltArcFanDirections(0, 0, 2);
    assert.equal(fanP1.length, 5);
    assert.equal(fanP2.length, 7);

    // Bull-Rush velocity escalates cleanly in Phase 2
    const rP1 = computeBullRushVelocity(0, 0, 10, 0, 1);
    const rP2 = computeBullRushVelocity(0, 0, 10, 0, 2);
    assert.ok(rP2.speed > rP1.speed && rP2.vx > rP1.vx);
  });

  it('breaks Vault Stalker PHANTOM-VII Recon Visor Optic, triggers Phase 2 Phantom Overdrive at <= 55% HP, routes all 6 attacks, disables Cloak-Dash when visor breaks, and scales flechette/dash vectors in Phase 2', () => {
    const state = createEnemyCombatState('stalker_1', VAULT_STALKER_SNIPER_CONFIG, 'f7_z3_west_barracks');
    const r1 = resolveEnemyHit(state, VAULT_STALKER_SNIPER_CONFIG, 70, 'weakpoint');
    assert.equal(r1.isCritical, true);
    assert.equal(r1.weakpointBroken, false);
    const r2 = resolveEnemyHit(state, VAULT_STALKER_SNIPER_CONFIG, 80, 'weakpoint');
    assert.equal(r2.weakpointBroken, true);
    assert.equal(r2.staggerTriggered, true);
    assert.ok(state.staggerTimer >= 2.5);

    // Pushing HP below 55% triggers Phase 2 Phantom Overdrive
    const p2 = resolveEnemyHit(state, VAULT_STALKER_SNIPER_CONFIG, 200, 'body');
    assert.equal(p2.phaseTransitionedTo2, true);
    assert.equal(state.phase, 2);

    const base = {
      horizDist: 16.0,
      vertDist: 0.4,
      hasLos: true,
      phase: 1 as 1 | 2,
      cloakDisabled: false,
      timeWithoutLos: 0,
      recentlyDamaged: false,
      slashCooldown: 0,
      dashCooldown: 0,
      mineCooldown: 0,
      flechetteCooldown: 0,
      sweepCooldown: 0,
      railCooldown: 0,
      roll: 0.8,
    };

    // Close rush (< 4.6m) triggers Phase-Mantis Wrist-Blade Ambush Slash
    assert.equal(
      selectStalkerAttack({ ...base, horizDist: 3.4 }),
      'phantom_ambush_slash'
    );

    // Crowding (< 9.5m) with intact visor triggers Active-Camo Cloak-Flank Dash
    assert.equal(
      selectStalkerAttack({ ...base, horizDist: 7.5 }),
      'cloak_flank_dash'
    );

    // Shattering visor optic disables Active-Camo Cloak-Dash and forces Flechette Scatter defense!
    assert.equal(
      selectStalkerAttack({ ...base, horizDist: 7.5, cloakDisabled: true, roll: 0.4 }),
      'flechette_scatter_burst'
    );

    // Target hiding behind cover without LOS triggers arcing Cryo-Shock Flush Mine
    assert.equal(
      selectStalkerAttack({ ...base, hasLos: false, timeWithoutLos: 1.0 }),
      'cryo_arc_flush_mine'
    );

    // Mid-long LOS mid roll triggers 3-shot Laser-Sweep Barrage
    assert.equal(
      selectStalkerAttack({ ...base, roll: 0.3 }),
      'laser_sweep_barrage'
    );

    // High roll at sniper range selects signature wall-clipped Rail-Sniper Lock
    assert.equal(
      selectStalkerAttack({ ...base, roll: 0.85 }),
      'rail_sniper_lock'
    );

    // Flechette scatter fan scales from 3 darts in Phase 1 to 5 wider darts in Phase 2
    const f1 = computeFlechetteFanDirections(0, 0, 1);
    const f2 = computeFlechetteFanDirections(0, 0, 2);
    assert.equal(f1.length, 3);
    assert.equal(f2.length, 5);
    assert.ok(Math.abs(Math.hypot(f2[0].x, f2[0].y, f2[0].z) - 1) < 1e-5);

    // Cloak-Flank Dash speed scales cleanly in Phase 2 Phantom Overdrive
    const d1 = computeCloakDashVelocity(0, 0, 0, -10, 1, 0.5, 1);
    const d2 = computeCloakDashVelocity(0, 0, 0, -10, 1, 0.5, 2);
    assert.ok(d2.speed > d1.speed);
  });

  it('gates TITAN-RIG BASTION-VII reactor weakpoint behind exposed venting window, triggers Phase 2 overdrive at <= 55% HP, routes all 6 apex attacks, and scales carpet missiles, plasma fan & titan charge in Phase 2', () => {
    const boss = createEnemyCombatState('f7_boss_bastion', BASTION_SEVEN_BOSS_CONFIG, 'f7_z2_rotunda');
    assert.equal(boss.weakpoint.exposed, false);

    // Closed blast doors resist weakpoint overload
    const closedHit = resolveEnemyHit(boss, BASTION_SEVEN_BOSS_CONFIG, 250, 'weakpoint');
    assert.equal(closedHit.weakpointBroken, false);
    assert.equal(closedHit.isCritical, false);

    // Venting opens blast doors and allows full weakpoint rupture!
    exposeEnemyWeakpoint(boss, 3.0);
    const openHit = resolveEnemyHit(boss, BASTION_SEVEN_BOSS_CONFIG, 240, 'weakpoint');
    assert.equal(openHit.isCritical, true);
    assert.equal(openHit.weakpointBroken, true);
    assert.equal(openHit.staggerTriggered, true);

    // Pushing HP below 55% triggers Phase 2 Overdrive
    const p2Hit = resolveEnemyHit(boss, BASTION_SEVEN_BOSS_CONFIG, 1600, 'body');
    assert.equal(p2Hit.phaseTransitionedTo2, true);
    assert.equal(boss.phase, 2);

    const base = {
      horizDist: 12.0,
      hasLos: true,
      phase: 1 as 1 | 2,
      timeWithoutLos: 0,
      stompCooldown: 0,
      railCooldown: 0,
      missileCooldown: 0,
      chargeCooldown: 0,
      plasmaFanCooldown: 0,
      rotaryCooldown: 0,
      roll: 0.9,
    };

    // Close range triggers Seismic Hydraulic Stomp
    assert.equal(selectBastionAttack({ ...base, horizDist: 5.0 }), 'seismic_hydraulic_stomp');

    // Hiding behind Rotunda pillars without LOS triggers Carpet Missile Barrage
    assert.equal(
      selectBastionAttack({ ...base, hasLos: false, timeWithoutLos: 1.1 }),
      'carpet_missile_barrage'
    );

    // Mid-range low roll triggers Overdrive Titan Charge
    assert.equal(selectBastionAttack({ ...base, roll: 0.12 }), 'overdrive_titan_charge');

    // Mid-range mid roll triggers Arc Plasma Fan Barrage
    assert.equal(selectBastionAttack({ ...base, roll: 0.35 }), 'arc_plasma_fan_barrage');

    // Mid-range upper-mid roll triggers Twin Siege Rail-Lance Convergence
    assert.equal(selectBastionAttack({ ...base, roll: 0.62 }), 'twin_siege_rail_lance');

    // High roll triggers Dual Rotary Autocannon Suppression
    assert.equal(selectBastionAttack({ ...base, roll: 0.92 }), 'dual_rotary_suppression');

    // Carpet missile targets scale from 4 (P1) to 6 (P2 Overdrive)
    const mP1 = computeSiegeMissileTargets(10, 0, 10, 0, 0, 1);
    const mP2 = computeSiegeMissileTargets(10, 0, 10, 0, 0, 2);
    assert.equal(mP1.length, 4);
    assert.equal(mP2.length, 6);

    // Plasma fan scales from 5 (P1) to 7 (P2 Overdrive) normalized directions
    const fP1 = computePlasmaFanDirections(0, 0, 1);
    const fP2 = computePlasmaFanDirections(0, 0, 2);
    assert.equal(fP1.length, 5);
    assert.equal(fP2.length, 7);
    assert.ok(Math.abs(Math.hypot(fP2[0].x, fP2[0].y, fP2[0].z) - 1) < 1e-5);

    // Titan Charge speed escalates sharply in Phase 2 Overdrive
    const cP1 = computeTitanChargeVelocity(0, 0, 12, 0, 1);
    const cP2 = computeTitanChargeVelocity(0, 0, 12, 0, 2);
    assert.ok(cP2.speed > cP1.speed && cP2.vx > cP1.vx);
  });
});

describe('Floor 07 Progression & Strict All-Enemies-Vanquished Control Center Gating', () => {
  it('locks Control Center until EVERY normal enemy, BOTH Zone Mini-Bosses, AND Bastion-VII are vanquished', () => {
    let prog = createInitialFloor07Progression();
    assert.equal(canUseFloor07ControlCenter(prog).allowed, false);

    prog.liveCombatActive = true;
    const enemies = FLOOR07_LIVE_ROSTER.map((s) => ({
      id: s.id,
      tier:
        s.archetypeId === 'turbine_juggernaut' || s.archetypeId === 'vault_stalker_sniper'
          ? ('miniboss' as const)
          : ('normal' as const),
      alive: true,
    }));

    // Initial state: 20 alive + 1 pending boss = 21 total hostiles remaining, Control Center LOCKED
    let step = evaluateFloor07Progression(prog, enemies);
    prog = step.next;
    assert.equal(step.shouldSpawnBoss, false);
    assert.equal(getFloor07RemainingHostilesTotal(prog), 21);
    const gateStart = canUseFloor07ControlCenter(prog);
    assert.equal(gateStart.allowed, false);
    assert.match(gateStart.reason ?? '', /ALL ENEMIES MUST BE VANQUISHED FIRST/);

    // Defeat both Zone Mini-Bosses -> Bastion-VII deploys!
    for (const e of enemies) {
      if (e.tier === 'miniboss') e.alive = false;
    }
    step = evaluateFloor07Progression(prog, enemies);
    prog = step.next;
    assert.equal(step.shouldSpawnBoss, true);
    assert.equal(prog.bossSpawned, true);

    // Add Bastion-VII and defeat it while 1 normal enemy is still alive -> STILL LOCKED!
    const withBoss = [
      ...enemies,
      { id: FLOOR07_BOSS_SPAWN.id, tier: 'boss' as const, alive: false },
    ];
    for (let i = 0; i < withBoss.length - 1; i++) {
      if (withBoss[i].tier === 'normal') withBoss[i].alive = false;
    }
    // Leave 1 normal alive
    withBoss[0].alive = true;

    step = evaluateFloor07Progression(prog, withBoss);
    prog = step.next;
    assert.equal(prog.bossDefeated, true);
    assert.equal(prog.floorCleared, false);
    assert.equal(canUseFloor07ControlCenter(prog).allowed, false);

    // Vanquish the very last hostile -> Floor 07 CLEARED & Control Center UNLOCKED!
    withBoss[0].alive = false;
    step = evaluateFloor07Progression(prog, withBoss);
    prog = step.next;
    assert.equal(step.justClearedFloor, true);
    assert.equal(prog.floorCleared, true);
    assert.equal(getFloor07RemainingHostilesTotal(prog), 0);
    assert.equal(canUseFloor07ControlCenter(prog).allowed, true);
  });

  it('resolves all Floor 07 architectural sector names cleanly for the tactical minimap', () => {
    assert.equal(resolveSectorName(7, 0, -14, 'SPIRAL WELL'), 'NORTH CHECKPOINT');
    assert.equal(resolveSectorName(7, 0, 0, 'SPIRAL WELL'), 'SPIRAL ROTUNDA');
    assert.equal(resolveSectorName(7, -28, -5, 'SPIRAL WELL'), 'WEST BARRACKS');
    assert.equal(resolveSectorName(7, -28, 20, 'SPIRAL WELL'), 'SW CARGO BAY');
    assert.equal(resolveSectorName(7, 28, -4, 'SPIRAL WELL'), 'EAST SERVERS');
    assert.equal(resolveSectorName(7, 28, 20, 'SPIRAL WELL'), 'SE TURBINE HALL');
    assert.equal(resolveSectorName(7, 0, 14, 'SPIRAL WELL'), 'SOUTH EXTRACTION');
  });
});
