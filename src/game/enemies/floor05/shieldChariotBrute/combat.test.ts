import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { F5_BASE_Y } from '../../../arena/hideout/floors/floor05/layout';
import { createEnemyCombatState } from '../../core/damageRouting';
import type { EnemyAiStepContext } from '../../core/enemyManager';
import type { EnemyProjectileSpec } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import { createShieldChariotBruteBrain } from './ai';
import type { ShieldChariotBruteRigHandle } from './mesh';
import { BRUTE_ATTACKS, selectBruteAction, type BruteAttack, type BruteTacticsInput } from './tactics';

// Run the production brain and collision step on a flat arena. Only presentation and the player are stubbed.
function encounter(attack: BruteAttack, distance: number, phase: 1 | 2 = 1) {
  const brain = createShieldChariotBruteBrain({} as Floor05EnemyMaterials);
  const cfg = brain.config;
  const state = createEnemyCombatState('test-brute', cfg, 'f5_z2_coliseum');
  state.phase = phase;
  state.engaged = true;
  const ai = brain.createAiState();
  const initialTime = 10;
  Object.assign(ai, { readyAt: Object.fromEntries(BRUTE_ATTACKS.map(move => [move, move === attack ? 0 : 1000])), nextStrafe: 1000 });
  const position = (out: THREE.Vector3) => out.set(0, F5_BASE_Y + 1.6, -0.4);
  const rig: ShieldChariotBruteRigHandle = {
    root: new THREE.Group(), hitboxes: [], armorFlashMaterials: [], weakpointMaterials: [],
    setPoseMode() {}, setBoosterFlame() {}, updateAnimation() {}, dispose() {},
    getMuzzleWorldPos: position, getWeakpointWorldPos: position, getMortarWorldPos: position, getProwWorldPos: position,
  };
  const pellets: EnemyProjectileSpec[] = [];
  const melee: number[] = [], exposure: number[] = [], waves: number[] = [];
  const bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
  const context: EnemyAiStepContext = {
    state, rig, aiState: ai, dt: 1/60, elapsed: initialTime, hasAttackToken: true,
    world: { boxes: [], slabs: [{ ...bounds, y: F5_BASE_Y }], ringSlabs: [], ramps: [], arcRamps: [],
      bounds, minSafeY: F5_BASE_Y-2, fallbackSpawn: { x: 0, y: F5_BASE_Y, z: 0 } },
    spatial: { x: 0, y: F5_BASE_Y, z: 0, vx: 0, vz: 0, yaw: 0, grounded: true, height: cfg.height, radius: cfg.collisionRadius },
    patrolPoints: [], playerPos: new THREE.Vector3(0,F5_BASE_Y,-distance), separation: new THREE.Vector2(), playerRolling: false,
    exposeWeakpoint: seconds => exposure.push(seconds),
    callbacks: {
      spawnProjectile: shot => pellets.push(shot), spawnShockwave: wave => waves.push(wave.damage),
      applyPlayerMeleeHit: damage => melee.push(damage),
      onTelegraphAudio() {}, onFireAudio() {}, spawnMuzzleFlash() {}, spawnBladeSlashArc() {}, spawnSurfaceSlashScar() {},
      spawnRailImpactCrater() {}, spawnProjectileImpactSparks() {}, spawnPerilGlint() {}, spawnBoosterBurst() {},
      spawnImpactVfx() {}, showIntelCallout() {},
    },
  };
  const tick = () => { context.elapsed += context.dt; brain.stepAi(context); };
  function until(behavior: typeof state.behavior) {
    for (let i = 0; i < 360; i++) {
      tick();
      if (state.behavior === behavior) return;
    }
    assert.fail('Never entered ' + behavior + ' during ' + attack);
  }
  return { brain, context, state, ai, tick, until, pellets, melee, waves, exposure };
}

test('Only token holders can attack, blocked sight prevents contact attacks, and a shattered prow cannot bash or counter', () => {
  const opportunity: BruteTacticsInput = {
    horizDist: 7, vertDist: 0, hasLos: true, hasAttackToken: false, shieldActive: true,
    rushCooldown: 0, slamCooldown: 0, flakCooldown: 0, bashCooldown: 0, mortarCooldown: 0,
    spinCooldown: 0, fortressCooldown: 0, damageBurstAccum: 100, roll: 0.1,
  };
  assert.equal(selectBruteAction(opportunity), 'advance');
  assert.equal(selectBruteAction({ ...opportunity, hasAttackToken: true }), 'fortress_advance_barrage');
  assert.equal(selectBruteAction({ ...opportunity, hasAttackToken: true, horizDist: 2, hasLos: false }), 'advance');
  assert.equal(selectBruteAction({ ...opportunity, hasAttackToken: true, horizDist: 2, shieldActive: false }), 'juggernaut_spin_cleave');
});

for (const [attack, distance] of [
  ['ram_shield_bash', 2], ['seismic_prow_slam', 4.7], ['chariot_bull_rush', 7], ['flak_scatter_barrage', 15],
  ['incendiary_mortar_salvo', 16], ['juggernaut_spin_cleave', 2.35], ['fortress_advance_barrage', 9],
] as const) {
  test(attack + ' reaches windup, executes its gameplay effect and recovers', () => {
    const e = encounter(attack, distance);
    if (attack === 'incendiary_mortar_salvo') e.context.world.boxes.push({
      minX:-4,maxX:4,minY:F5_BASE_Y,maxY:F5_BASE_Y+2.1,minZ:-6,maxZ:-5,
    });
    if (attack === 'fortress_advance_barrage') e.brain.onShieldBlock!(e.ai, 58);
    if (attack === 'juggernaut_spin_cleave') e.state.shieldActive = false;
    e.until('windup');
    assert.equal(e.ai.attack, attack);
    assert.equal(e.melee.length + e.waves.length + e.pellets.length, 0);
    e.until('recover');
    switch (attack) {
      case 'seismic_prow_slam':
        assert.equal(e.waves.length, 1); assert.ok(e.exposure[0] >= 1); break;
      case 'incendiary_mortar_salvo':
        assert.equal(e.pellets.length, 2);
        assert.ok(e.pellets.every(s => s.kind === 'mortar_canister' && s.targetPos && s.gravity && s.splashRadius));
        assert.notDeepEqual(e.pellets[0].targetPos, e.pellets[1].targetPos); break;
      case 'fortress_advance_barrage':
        assert.equal(e.pellets.length, 9); assert.ok(e.context.spatial.z < -1); break;
      case 'flak_scatter_barrage':
        assert.equal(e.pellets.length, 5); break;
      default:
        assert.equal(e.melee.length, 1);
    }
  });
}

test('Overdrive widens flak and adds a third mortar aimed at the original, dodgeable footprint', () => {
  const flak = encounter('flak_scatter_barrage', 16, 2);
  flak.until('recover');
  assert.equal(flak.pellets.length, 7);
  const mortar = encounter('incendiary_mortar_salvo', 22, 2);
  mortar.context.playerPos.y += 3;
  mortar.until('attack');
  mortar.context.playerPos.x = 13;
  mortar.until('recover');
  assert.equal(mortar.pellets.length, 3);
  for (const shot of mortar.pellets) {
    assert.ok(Math.abs(shot.targetPos!.x) <= 3);
    const t = 1.28;
    const end = shot.origin.clone().addScaledVector(shot.direction, shot.speed*t);
    end.y -= 0.5*shot.gravity!*t*t;
    assert.ok(end.distanceTo(shot.targetPos!) < 0.001);
  }
});

test('A committed rush misses a sidestep and exposes the furnace on a wall crash', () => {
  const e = encounter('chariot_bull_rush', 11);
  e.until('attack');
  e.context.playerPos.x = 7;
  e.context.world.boxes.push({ minX:-2,maxX:2,minY:F5_BASE_Y,maxY:F5_BASE_Y+4,minZ:-4,maxZ:-3.7 });
  e.until('recover');
  assert.equal(e.melee.length, 0);
  assert.ok(e.exposure[0] >= 2.4);
  assert.ok(Math.abs(e.context.spatial.x) < 0.01);
});

test('Stagger cancels a fortress burst and its remaining volleys', () => {
  const e = encounter('fortress_advance_barrage', 10);
  e.brain.onShieldBlock!(e.ai, 60);
  e.until('attack');
  e.state.staggerTimer = 1;
  e.state.shieldActive = false;
  e.context.hasAttackToken = false;
  e.tick();
  assert.equal(e.state.behavior, 'staggered');
  e.state.staggerTimer = 0;
  for (let i=0; i<125; i++) e.tick();
  assert.equal(e.pellets.length, 0);
});
