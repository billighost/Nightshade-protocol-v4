import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { F5_BASE_Y as y } from '../../../arena/hideout/floors/floor05/layout';
import { createEnemyCombatState, exposeEnemyWeakpoint, resolveEnemyHit } from '../../core/damageRouting';
import type { EnemyAiStepContext } from '../../core/enemyManager';
import type { EnemyAnimationInput, EnemyProjectileSpec } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import { createDualCleaverExecutionerBrain } from './ai';
import type { DualCleaverExecutionerRigHandle } from './mesh';
import { EXECUTIONER_ATTACKS, selectExecutionerAction, type ExecutionerAttack } from './tactics';

function encounter(move: ExecutionerAttack, distance: number, phase: 1|2 = 1) {
  const brain = createDualCleaverExecutionerBrain({} as Floor05EnemyMaterials);
  const state = createEnemyCombatState('executioner', brain.config, 'f5_z7_sw_reactor');
  state.engaged = true;
  state.phase = phase;
  const ai = brain.createAiState();
  Object.assign(ai, { readyAt: Object.fromEntries(EXECUTIONER_ATTACKS.map(key => [key, key===move ? 0 : 999])) });
  const bounds = { minX:-50, maxX:50, minZ:-50, maxZ:50 };
  const animation: EnemyAnimationInput[] = [];
  const shots: EnemyProjectileSpec[] = [], hits: number[] = [], waves: number[] = [];
  let sparks = 0;
  const target = new THREE.Vector3(0,y,-distance);
  const rig: DualCleaverExecutionerRigHandle = {
    root:new THREE.Group(), hitboxes:[],weakpointMaterials:[],armorFlashMaterials:[],
    setPoseMode(){},setCleaverHeat(){},dispose(){},
    updateAnimation(frame){animation.push(frame);},
    getWeakpointWorldPos(out){return out.set(0,y+1.75,0.45);},
    getMuzzleWorldPos(out){return out.set(0.4,y+1.1,-1.4);},
    getBladeEdge(side,heel,toe){
      // Both edges pass through the stationary target. The animation timeline controls when contact counts.
      heel.set(-0.16,y+1.04,-distance+0.22);
      toe.set(0.16,y+1.04,-distance-0.22);
      if(side===1) toe.x+=0.03;
    },
  };
  const ctx: EnemyAiStepContext = {
    rig,aiState:ai,state,dt:1/60,elapsed:12,hasAttackToken:true,playerRolling:false,playerPos:target,
    patrolPoints:[],separation:new THREE.Vector2(),
    spatial:{x:0,y,z:0,vx:0,vz:0,yaw:0,radius:0.82,height:2.68,grounded:true},
    world:{bounds,slabs:[{...bounds,y}],boxes:[],ramps:[],ringSlabs:[],arcRamps:[],minSafeY:y-2,fallbackSpawn:{x:0,y,z:0}},
    exposeWeakpoint:duration=>exposeEnemyWeakpoint(state,duration),
    callbacks:{
      spawnProjectile:spec=>shots.push(spec),applyPlayerMeleeHit:damage=>hits.push(damage),spawnShockwave:spec=>waves.push(spec.damage),
      spawnProjectileImpactSparks(){sparks++;},onTelegraphAudio(){},onFireAudio(){},spawnImpactVfx(){},spawnMuzzleFlash(){},
      spawnBladeSlashArc(){},spawnSurfaceSlashScar(){},spawnRailImpactCrater(){},spawnPerilGlint(){},spawnBoosterBurst(){},showIntelCallout(){},
    },
  };
  const tick=()=>{ctx.elapsed+=ctx.dt;brain.stepAi(ctx);};
  function until(behavior:typeof state.behavior) {
    for(let i=0;i<420;i++){tick();if(state.behavior===behavior)return;}
    assert.fail(move+' never entered '+behavior);
  }
  return {ctx,ai,brain,state,rig,shots,hits,waves,animation,tick,until,sparks:()=>sparks};
}

test('Reversal needs a token and sight, and a close flanker can trigger it with other moves ready',()=>{
  const base={horizDist:2.5,vertDist:0,hasLos:true,hasAttackToken:true,phase:1 as const,roll:0.95,flanked:true,
    cleaveCooldown:0,guillotineCooldown:0,whirlwindCooldown:0,waveCooldown:0,leapCooldown:0,backstepCooldown:0};
  assert.equal(selectExecutionerAction(base),'reaping_backstep');
  assert.equal(selectExecutionerAction({...base,hasLos:false}),'stalk_advance');
  assert.equal(selectExecutionerAction({...base,hasAttackToken:false}),'stalk_advance');
});

for(const [phase,expected] of [[1,[18,20]],[2,[18,20,13]]] as const){
  test('Crossing cuts hit once per contacting hand window in phase '+phase,()=>{
    const e=encounter('twin_x_cleave',2.5,phase);
    e.until('windup');assert.deepEqual(e.hits,[]);
    e.until('recover');assert.deepEqual(e.hits,expected);
  });
}

test('A nearby target can miss every blade, or duck the high sweep in a roll',()=>{
  const miss=encounter('twin_x_cleave',2.5);
  miss.until('attack');miss.ctx.playerPos.x=1.1;miss.until('recover');
  assert.deepEqual(miss.hits,[]);
  const duck=encounter('twin_x_cleave',2.5);
  duck.ctx.playerRolling=true;
  duck.until('recover');assert.deepEqual(duck.hits,[]);
});

test('Cover between the combatants interrupts contact, and stagger cancels the pending cut',()=>{
  const cover=encounter('twin_x_cleave',2.5);
  cover.until('attack');
  cover.ctx.world.boxes.push({minX:-3,maxX:3,minY:y,maxY:y+4,minZ:-1.6,maxZ:-1.4});
  cover.until('recover');assert.deepEqual(cover.hits,[]);
  const stagger=encounter('twin_x_cleave',2.5);
  stagger.until('windup');stagger.state.staggerTimer=1;stagger.tick();
  assert.equal(stagger.state.behavior,'staggered');
  stagger.state.staggerTimer=0;stagger.ctx.hasAttackToken=false;
  for(let i=0;i<120;i++)stagger.tick();
  assert.deepEqual(stagger.hits,[]);
});

test('Uppercut scrapes once. The backstep gives ground before its counter',()=>{
  const drag=encounter('dragging_uppercut',4.3);drag.until('recover');
  assert.deepEqual(drag.hits,[29]);assert.equal(drag.sparks(),1);
  const counter=encounter('reaping_backstep',2.2);
  counter.until('attack');for(let i=0;i<12;i++)counter.tick();
  assert.ok(counter.ctx.spatial.z>0.12);
  counter.until('recover');assert.deepEqual(counter.hits,[22]);
});

test('The guillotine misses a sidestep and the heavy recovery opens a breakable furnace',()=>{
  const e=encounter('overhead_guillotine',2.2);
  const cold=resolveEnemyHit(e.state,e.brain.config,20,'weakpoint');
  assert.equal(cold.isCritical,false);assert.equal(e.state.weakpoint.damageAccum,0);
  e.until('attack');e.ctx.playerPos.x=2;e.until('recover');
  assert.equal(e.hits.length,0);assert.equal(e.waves.length,0);
  assert.ok(e.state.weakpoint.exposedTimer>=2);
  const crack=resolveEnemyHit(e.state,e.brain.config,145,'weakpoint');
  assert.equal(crack.weakpointBroken,true);assert.equal(e.state.staggerTimer,2.8);assert.ok(e.state.alive);
});

test('Leap commits to the original lane, lands once, and exposes the furnace',()=>{
  const e=encounter('berserker_leap_slam',9);e.until('attack');
  e.ctx.playerPos.x=6;e.until('recover');
  assert.equal(e.waves.length,1);assert.ok(e.state.weakpoint.exposed);
  assert.ok(Math.abs(e.ctx.spatial.x)<0.02);assert.ok(e.ctx.spatial.z < -6);
  assert.ok(Math.max(...e.animation.map(frame=>frame.airborneHeight))>2);
});

test('Overdrive fan releases five shots from the live blade toward the tell, even if the player moves',()=>{
  const e=encounter('molten_arc_wave',17,2);
  e.ctx.playerPos.y+=3;e.until('attack');e.ctx.playerPos.x=8;e.until('recover');
  assert.equal(e.shots.length,5);
  const center=e.shots[2], expected=new THREE.Vector3(0,y+4.02,-17).sub(center.origin).normalize();
  assert.ok(center.direction.dot(expected)>0.9999);
});
