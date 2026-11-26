import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import type { CollisionWorld3D } from '../../arena/hideout/types';
import {
  createEnemyCombatState,
  exposeEnemyWeakpoint,
  resolveEnemyHit,
  stepEnemyWeakpointTimers,
} from '../core/damageRouting';
import { raycastCollisionWorld3D } from '../core/enemyNav';
import {
  applyPlayerHitReaction,
  createPlayerHitReactionState,
  getNormalizedFlinchWeight,
  stepPlayerHitReaction,
} from '../../player/hitReaction';
import { AEGIS_RIOT_CONFIG } from './aegisRiotTrooper/config';
import { BREACHER_CYBORG_CONFIG } from './breacherCyborg/config';
import { COMMANDER_KESTREL_CONFIG } from './commanderKestrel/config';
import { KILLHOUSE_WARDEN_CONFIG } from './killhouseWarden/config';
import { ORDNANCE_PYRO_CONFIG } from './ordnancePyroTech/config';
import {
  canUseFloorControlCenter,
  createInitialFloor08Progression,
  evaluateFloor08Progression,
  FLOOR08_LIVE_ROSTER,
  getRemainingHostilesTotal,
} from './progression';
import {
  cameraYawToCompassDegrees,
  classifyElevationDelta,
  resolveSectorName,
  worldToRadarLocal,
} from '../../hud/minimapMath';
import { RAZOR_STRIDER_CONFIG } from './razorStrider/config';

describe('Floor 08 Enemy Weakpoints, Counterplay, Control Center Gating & Minimap Math', () => {
  it('Breacher-08 shoulder EMP cell triggers critical bonus damage, overload stagger, and Halo/COD durability', () => {
    const st = createEnemyCombatState('b1', BREACHER_CYBORG_CONFIG, 'zone4_main_hall');
    assert.ok(st.maxHp >= 300, 'COD/Halo standard troop should survive sustained gunfire');

    const hit1 = resolveEnemyHit(st, BREACHER_CYBORG_CONFIG, 38, 'weakpoint');
    assert.equal(hit1.isCritical, true);
    assert.equal(hit1.weakpointBroken, false);
    assert.equal(st.alive, true);

    const hit2 = resolveEnemyHit(st, BREACHER_CYBORG_CONFIG, 38, 'weakpoint');
    assert.equal(hit2.weakpointBroken, true);
    assert.equal(hit2.staggerTriggered, true);
    assert.equal(st.behavior, 'staggered'); // Survives 1st weakpoint break in staggered window for satisfying COD/Halo finish
    assert.equal(st.alive, true);

    // Follow-up critical shots finish the staggered Breacher cleanly
    resolveEnemyHit(st, BREACHER_CYBORG_CONFIG, 85, 'weakpoint');
    assert.equal(st.behavior, 'dead');
  });

  it('Aegis-Riot shield blocks frontal hits until glowing projector lens is shattered', () => {
    const st = createEnemyCombatState('a1', AEGIS_RIOT_CONFIG, 'zone4_main_hall');
    assert.equal(st.shieldActive, true);

    const blocked = resolveEnemyHit(st, AEGIS_RIOT_CONFIG, 40, 'shield');
    assert.equal(blocked.blockedByShield, true);
    assert.equal(blocked.appliedDamage, 0);
    assert.equal(st.hp, AEGIS_RIOT_CONFIG.maxHp);

    // Shooting the glowing cyan projector lens across a focused burst shatters the hard-light shield + staggers!
    resolveEnemyHit(st, AEGIS_RIOT_CONFIG, 44, 'weakpoint');
    const shatter = resolveEnemyHit(st, AEGIS_RIOT_CONFIG, 44, 'weakpoint');
    assert.equal(shatter.weakpointBroken, true);
    assert.equal(shatter.shieldShattered, true);
    assert.equal(st.shieldActive, false);
    assert.equal(st.behavior, 'staggered');
    assert.ok(st.staggerTimer >= 2.5);
  });

  it('Razor-Strider spine thruster core requires post-lunge exposure window for overload stun', () => {
    const st = createEnemyCombatState('s1', RAZOR_STRIDER_CONFIG, 'zone4_main_hall');
    assert.equal(st.weakpoint.exposed, false);

    const closedHit = resolveEnemyHit(st, RAZOR_STRIDER_CONFIG, 72, 'weakpoint');
    assert.equal(closedHit.weakpointBroken, false);

    exposeEnemyWeakpoint(st, 2.2);
    assert.equal(st.weakpoint.exposed, true);
    const openHit = resolveEnemyHit(st, RAZOR_STRIDER_CONFIG, 72, 'weakpoint');
    assert.equal(openHit.weakpointBroken, true);
    assert.equal(openHit.staggerTriggered, true);
  });

  it('Zone Mini-Bosses (Warden & Pyro-Tech) and Commander Kestrel Phase 2 overdrive + thermal vent stagger', () => {
    // Killhouse Warden capacitor coil overload gated by post-combo thermal vent window
    const warden = createEnemyCombatState('w1', KILLHOUSE_WARDEN_CONFIG, 'zone3_killhouse');
    assert.equal(warden.weakpoint.exposed, false);
    const wClosed = resolveEnemyHit(warden, KILLHOUSE_WARDEN_CONFIG, 120, 'weakpoint');
    assert.equal(wClosed.weakpointBroken, false);
    assert.notEqual(warden.behavior, 'staggered');

    exposeEnemyWeakpoint(warden, 2.5);
    const wBreak = resolveEnemyHit(warden, KILLHOUSE_WARDEN_CONFIG, 120, 'weakpoint');
    assert.equal(wBreak.weakpointBroken, true);
    assert.equal(warden.behavior, 'staggered');
    assert.ok(warden.staggerTimer >= 2.5);

    // Ordnance Pyro-Tech pressurized back fuel tank rupture
    const pyro = createEnemyCombatState('p1', ORDNANCE_PYRO_CONFIG, 'zone2_armory');
    const pBreak = resolveEnemyHit(pyro, ORDNANCE_PYRO_CONFIG, 130, 'weakpoint');
    assert.equal(pBreak.weakpointBroken, true);
    assert.ok(pBreak.appliedDamage > 350);

    // Commander Kestrel-08 transitions Phase 1 -> Phase 2 at <= 55% HP and overloads on exposed gold vents
    const boss = createEnemyCombatState('boss', COMMANDER_KESTREL_CONFIG, 'zone4_main_hall');
    assert.equal(boss.phase, 1);
    const p2Hit = resolveEnemyHit(boss, COMMANDER_KESTREL_CONFIG, 1080, 'body');
    assert.equal(p2Hit.phaseTransitionedTo2, true);
    assert.equal(boss.phase, 2);

    // Clear brief transition stagger then trigger Phase 2 gold vent overload
    stepEnemyWeakpointTimers(boss, COMMANDER_KESTREL_CONFIG, 1.2);
    exposeEnemyWeakpoint(boss, 3.2);
    const ventBreak = resolveEnemyHit(boss, COMMANDER_KESTREL_CONFIG, 155, 'weakpoint');
    assert.equal(ventBreak.weakpointBroken, true);
    assert.equal(boss.behavior, 'staggered');
    assert.ok(boss.staggerTimer >= 3.0);
  });

  it('Control Center stays strictly disabled until EVERY SINGLE Floor 08 enemy (normal + mini-boss + boss) is vanquished', () => {
    const prog = createInitialFloor08Progression();
    prog.liveCombatActive = true;

    const roster = FLOOR08_LIVE_ROSTER.map((s) => ({
      id: s.id,
      tier:
        s.archetypeId === 'killhouse_warden' || s.archetypeId === 'ordnance_pyro_tech'
          ? ('miniboss' as const)
          : ('normal' as const),
      alive: true,
    }));

    const before = evaluateFloor08Progression(prog, roster);
    assert.equal(before.shouldSpawnBoss, false);
    assert.equal(prog.remainingMiniBosses, 2);

    const gateWhileAlive = canUseFloorControlCenter(8, false, prog);
    assert.equal(gateWhileAlive.allowed, false);
    assert.match(gateWhileAlive.reason ?? '', /ALL ENEMIES MUST BE VANQUISHED FIRST/i);
    assert.equal(getRemainingHostilesTotal(prog), FLOOR08_LIVE_ROSTER.length + 1);

    // Eliminate both Zone Mini-Bosses -> Main-Hall Floor Boss Commander Kestrel-08 triggers!
    for (const r of roster) {
      if (r.tier === 'miniboss') r.alive = false;
    }
    const triggerBoss = evaluateFloor08Progression(prog, roster);
    assert.equal(triggerBoss.shouldSpawnBoss, true);

    prog.bossSpawned = true;
    const withBoss = [...roster, { id: 'f8_boss_kestrel', tier: 'boss' as const, alive: true }];
    assert.equal(evaluateFloor08Progression(prog, withBoss).justClearedFloor, false);

    // Defeat Commander Kestrel-08 WHILE normal guards remain -> Control Center MUST STILL BE DISABLED!
    withBoss[withBoss.length - 1].alive = false;
    const bossDeadOnly = evaluateFloor08Progression(prog, withBoss);
    assert.equal(bossDeadOnly.justClearedFloor, false);
    assert.equal(prog.floorCleared, false);
    assert.equal(canUseFloorControlCenter(8, false, prog).allowed, false);

    // Now vanquish every remaining normal hostile -> Floor 08 Cleared & Control Center UNLOCKED!
    for (const r of withBoss) {
      r.alive = false;
    }
    const cleared = evaluateFloor08Progression(prog, withBoss);
    assert.equal(cleared.justClearedFloor, true);
    assert.equal(prog.floorCleared, true);
    assert.equal(getRemainingHostilesTotal(prog), 0);
    assert.equal(canUseFloorControlCenter(8, false, prog).allowed, true);
  });

  it('Reactive player shield & vitality bar drops on hit, holds trailing ghost, trembles, and Halo-recharges while keeping HP intact', () => {
    const hr = createPlayerHitReactionState();
    assert.equal(hr.invulnerableTestingMode, true);
    assert.equal(hr.hp, 100);
    assert.equal(hr.shieldIntegrity, 100);

    // Hit from directly ahead (-Z when cameraYaw = 0)
    const impactFront = applyPlayerHitReaction(hr, 35, 0, 10, 0, 15, 0, 0.9);
    assert.equal(impactFront.appliedDamageToHp, 0);
    assert.equal(hr.hp, 100);
    assert.equal(hr.hitsTaken, 1);
    assert.ok(hr.shieldIntegrity < 100, 'Kinetic shield visually drops on impact');
    assert.ok(hr.shieldGhost > hr.shieldIntegrity, 'Trailing damage ghost lingers above dropped shield');
    assert.ok(hr.barShakeTimer > 0.15, 'HUD vitality bar trembles on impact');
    assert.ok(hr.hitArcTimer > 0.5, 'Directional 360 threat arc lights up');
    assert.ok(hr.damagePulse > 0.8);
    assert.ok(hr.vignette.front > 0.7);
    assert.ok(hr.flinchTimer > 0.2);

    // Hit from the right (+X when cameraYaw = 0)
    const impactRight = applyPlayerHitReaction(hr, 50, 8, 15, 0, 15, 0, 0.8);
    assert.equal(impactRight.appliedDamageToHp, 0);
    assert.equal(hr.hp, 100);
    assert.equal(hr.hitsTaken, 2);
    assert.ok(hr.vignette.right > 0.7);
    assert.ok(hr.flinchDirLocalX > 0.8);

    // Decay over time smoothly returns vignette and flinch to 0, then Halo shield recharges back to 100
    stepPlayerHitReaction(hr, 0.1);
    assert.ok(getNormalizedFlinchWeight(hr) > 0.5);
    stepPlayerHitReaction(hr, 0.6);
    assert.equal(hr.damagePulse, 0);
    assert.equal(hr.flinchTimer, 0);

    // After recharge delay (~2.6s), shield enters Halo recharging state and returns to 100
    stepPlayerHitReaction(hr, 2.2);
    stepPlayerHitReaction(hr, 0.2);
    assert.equal(hr.shieldRecharging, true);
    stepPlayerHitReaction(hr, 4.0);
    assert.equal(hr.shieldIntegrity, 100);
    assert.equal(hr.shieldRecharging, false);
  });

  it('Minimap math projects player-heading-up coordinates, clamps distant targets, classifies elevation, and resolves Floor 08 sectors', () => {
    // Facing North (yaw=0): point straight ahead (-Z) maps to rx=0, ry=-0.5
    const north = worldToRadarLocal(0, 0, 0, 12, 0, 24);
    assert.ok(Math.abs(north.rx) < 1e-6);
    assert.ok(Math.abs(north.ry + 0.5) < 1e-6);
    assert.equal(north.clamped, false);

    // Facing East (yaw=-PI/2): point to East (+X) maps straight UP on radar (rx=0, ry=-0.5)
    const east = worldToRadarLocal(12, 0, 0, 0, -Math.PI / 2, 24);
    assert.ok(Math.abs(east.rx) < 1e-6);
    assert.ok(Math.abs(east.ry + 0.5) < 1e-6);

    // Distant target clamps cleanly to outer radar rim
    const far = worldToRadarLocal(0, -100, 0, 0, 0, 24, 0.86);
    assert.equal(far.clamped, true);
    assert.ok(Math.abs(Math.hypot(far.rx, far.ry) - 0.86) < 1e-5);

    assert.equal(classifyElevationDelta(101.2, 98.0), 'above');
    assert.equal(classifyElevationDelta(98.4, 98.0), 'level');
    assert.equal(classifyElevationDelta(95.0, 98.0), 'below');

    assert.equal(Math.round(cameraYawToCompassDegrees(0)), 0);
    assert.equal(Math.round(cameraYawToCompassDegrees(-Math.PI / 2)), 90);
    assert.equal(Math.round(cameraYawToCompassDegrees(Math.PI)), 180);

    assert.equal(resolveSectorName(8, 0, 44, 'APEX'), 'OPS BRIEFING');
    assert.equal(resolveSectorName(8, 0, 15, 'APEX'), 'MAIN FIRING HALL');
    assert.equal(resolveSectorName(8, -22, 18, 'APEX'), 'CQB KILLHOUSE');
    assert.equal(resolveSectorName(8, 22, 18, 'APEX'), 'TACTICAL ARMORY');
    assert.equal(resolveSectorName(8, 6, -11, 'APEX'), 'NORTH ATRIUM');
  });

  it('Swept raycastCollisionWorld3D blocks enemy projectiles and katana slashes through solid cover/platforms', () => {
    const world: CollisionWorld3D = {
      bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 },
      boxes: [
        {
          id: 'cover_wall_1',
          minX: -2,
          maxX: 2,
          minY: 98.0,
          maxY: 100.5,
          minZ: 9.5,
          maxZ: 10.5,
          active: true,
        },
        {
          id: 'inactive_door',
          minX: -2,
          maxX: 2,
          minY: 98.0,
          maxY: 100.5,
          minZ: 4.5,
          maxZ: 5.5,
          active: false,
        },
      ],
      ramps: [],
      slabs: [],
      arcRamps: [],
      ringSlabs: [],
      minSafeY: 95,
      fallbackSpawn: { x: 0, y: 98, z: 45 },
    };

    const outHit = {
      hit: false,
      t: 1,
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(),
    };

    // Slash/shot from z=12 toward player behind cover at z=8 MUST hit cover_wall_1 at z=10.5 with normal +Z!
    const blocked = raycastCollisionWorld3D(0, 99.1, 12, 0, 99.1, 8, world, outHit);
    assert.equal(blocked, true);
    assert.equal(outHit.hit, true);
    assert.ok(Math.abs(outHit.point.z - 10.5) < 0.01);
    assert.equal(outHit.normal.z, 1);

    // Clear shot over or around cover (and through inactive open door) returns false
    const clear = raycastCollisionWorld3D(0, 99.1, 7, 0, 99.1, 2, world, outHit);
    assert.equal(clear, false);
    assert.equal(RAZOR_STRIDER_CONFIG.displayName, 'KAGE-08 "ONI-BLADE"');
    assert.equal(BREACHER_CYBORG_CONFIG.displayName, 'BREACHER-08');
    assert.equal(BREACHER_CYBORG_CONFIG.roleSubtitle, 'QUAD-NOD RAIL MARKSMAN');
    assert.equal(AEGIS_RIOT_CONFIG.displayName, 'AEGIS-RIOT');
    assert.equal(AEGIS_RIOT_CONFIG.roleSubtitle, 'HEAVY EXOSUIT SHIELD JUGGERNAUT');
    assert.equal(KILLHOUSE_WARDEN_CONFIG.displayName, 'WARDEN-08 "SABLE"');
    assert.equal(
      KILLHOUSE_WARDEN_CONFIG.roleSubtitle,
      'KILLHOUSE ZONE MINI-BOSS · AKIMBO GUN-KATA DUELIST'
    );
    assert.equal(ORDNANCE_PYRO_CONFIG.displayName, 'FORGE-08 "PYRO-TECH"');
    assert.equal(
      ORDNANCE_PYRO_CONFIG.roleSubtitle,
      'ARMORY ZONE MINI-BOSS · HEAVY THERMITE ORDNANCE JUGGERNAUT'
    );
    assert.equal(COMMANDER_KESTREL_CONFIG.displayName, 'COMMANDER KESTREL-08');
    assert.equal(
      COMMANDER_KESTREL_CONFIG.roleSubtitle,
      'FLOOR 08 MAIN-HALL BOSS · VALKYRIE AERO-STRIKE COMMANDER'
    );
  });
});
