import * as THREE from 'three';
import { F5_PIT_Y } from '../../../arena/hideout/floors/floor05/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import { computeFacingYaw, hasEnemyLineOfSight, rotateYawTowards, stepEnemyMovement, wrapAngleDelta } from '../../core/enemyNav';
import type { EnemyAttackCallbacks } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import { DUAL_CLEAVER_EXECUTIONER_CONFIG as cfg } from './config';
import { buildDualCleaverExecutionerRig, EXECUTIONER_POSES, type DualCleaverExecutionerRigHandle, type ExecutionerPoseMode } from './mesh';
import { computeExecutionerWaveAngles, EXECUTIONER_ATTACKS, EXECUTIONER_TIMINGS, selectExecutionerAction, solveExecutionerLeap, type ExecutionerAttack } from './tactics';
import { createExecutionerTextures } from './textures';

type Stage = 'stalk' | 'windup' | 'active' | 'recover';
type Side = -1|1;
interface BladeStroke { hand: Side; from: number; to: number; damage: number; tilt: number }
const crossCuts: BladeStroke[] = [
  {hand:-1,from:0.10,to:0.39,damage:18,tilt:0.51},
  {hand:1,from:0.48,to:0.79,damage:20,tilt:-0.52},
  {hand:-1,from:0.82,to:1,damage:13,tilt:0.31},
];
const wheelCuts: BladeStroke[] = [
  {hand:1,from:0.13,to:0.39,damage:16,tilt:-0.13},
  {hand:-1,from:0.40,to:0.75,damage:16,tilt:0.14},
  {hand:1,from:0.76,to:0.94,damage:13,tilt:0.06},
];
const uppercut: BladeStroke[] = [{hand:1,from:0.32,to:0.72,damage:29,tilt:-1.13}];
const backswing: BladeStroke[] = [{hand:-1,from:0.36,to:0.74,damage:22,tilt:0.23}];
const none: BladeStroke[] = [];
const strokes: Record<ExecutionerAttack,BladeStroke[]> = {
  twin_x_cleave:crossCuts, whirlwind_blender:wheelCuts, berserker_leap_slam:none, molten_arc_wave:none,
  overhead_guillotine:none, dragging_uppercut:uppercut, reaping_backstep:backswing,
};
const cues: Record<ExecutionerAttack,Parameters<EnemyAttackCallbacks['onTelegraphAudio']>[0]> = {
  twin_x_cleave:'melee',whirlwind_blender:'shield_charge',berserker_leap_slam:'booster_burst',
  molten_arc_wave:'rail_charge',overhead_guillotine:'boss_slam',dragging_uppercut:'iaijutsu_glint',reaping_backstep:'dash',
};
function edge() { return {heel:new THREE.Vector3(),toe:new THREE.Vector3()}; }
type Edge = ReturnType<typeof edge>;
interface ExecutionerState {
  stage: Stage;
  attack: ExecutionerAttack;
  time: number;
  duration: number;
  readyAt: Record<ExecutionerAttack,number>;
  patrol: number;
  orbitSide: number;
  aim: THREE.Vector3;
  aimYaw: number;
  fxMask: number;
  hitMask: number;
  released: boolean;
  landed: boolean;
  leap: ReturnType<typeof solveExecutionerLeap>;
  edges: Edge[];
}
const ember=0xff763b, red=0xff4f42;
const sides=[-1,1] as const, up=new THREE.Vector3(0,1,0);
const sample=edge(), old=edge(), point=new THREE.Vector3(), closest=new THREE.Vector3();
const origin=new THREE.Vector3(),dir=new THREE.Vector3(), triangle=new THREE.Triangle();
function begin(ai:ExecutionerState, stage:Stage, duration:number) {
  ai.stage=stage; ai.time=0; ai.duration=duration;
}

// Cover the quadrilateral swept by the actual cutting edge this frame. Three points approximate
// the player's vertical capsule; a high swing can clear the shortened rolling capsule.
function touchesPlayer(previous:Edge, current:Edge, ctx:EnemyAiStepContext) {
  const radius=ctx.playerRolling?0.29:0.46;
  const heights=ctx.playerRolling?rollingHeights:standingHeights;
  for(const height of heights) {
    point.copy(ctx.playerPos);point.y+=height;
    triangle.set(previous.heel,previous.toe,current.toe).closestPointToPoint(point,closest);
    if(closest.distanceToSquared(point)<=radius*radius) return true;
    triangle.set(previous.heel,current.toe,current.heel).closestPointToPoint(point,closest);
    if(closest.distanceToSquared(point)<=radius*radius) return true;
  }
  return false;
}
const rollingHeights=[0.27,0.50], standingHeights=[0.38,0.95,1.49];

function stepCut(ctx:EnemyAiStepContext, ai:ExecutionerState, stroke:BladeStroke, i:number,
  prev:Edge,now:Edge,phaseFrom:number,phaseTo:number,los:boolean) {
  if(phaseFrom>=stroke.to || phaseTo<stroke.from) return;
  const mask=1<<i;
  if(!(ai.fxMask&mask)) {
    ai.fxMask|=mask;
    ctx.callbacks.onKatanaSlashAudio?.(true);
    ctx.callbacks.spawnBladeSlashArc(now.heel,ctx.spatial.yaw,stroke.tilt,-0.09,1.46,stroke.hand===1?ember:red,true,stroke.hand);
  }
  if(!los || (ai.hitMask&mask)) return;
  const span=Math.max(1e-6,phaseTo-phaseFrom);
  const first=Math.max(0,(stroke.from-phaseFrom)/span),last=Math.min(1,(stroke.to-phaseFrom)/span);
  old.heel.lerpVectors(prev.heel,now.heel,first);old.toe.lerpVectors(prev.toe,now.toe,first);
  sample.heel.lerpVectors(prev.heel,now.heel,last);sample.toe.lerpVectors(prev.toe,now.toe,last);
  if(touchesPlayer(old,sample,ctx)) {
    ai.hitMask|=mask;
    ctx.callbacks.applyPlayerMeleeHit(stroke.damage,now.heel,0.72);
  }
}
const currentEdges=[edge(),edge()];

function groundImpact(ctx:EnemyAiStepContext, ai:ExecutionerState, leap:boolean) {
  const {spatial,callbacks}=ctx;
  origin.addVectors(currentEdges[0].toe,currentEdges[1].toe).multiplyScalar(0.5);
  origin.y=spatial.y+0.085;
  callbacks.spawnRailImpactCrater(origin,up,leap?ember:red);
  callbacks.onTelegraphAudio('boss_slam');
  ctx.exposeWeakpoint(leap?2.45:2.2);
  if(leap) {
    callbacks.spawnShockwave({center:origin.clone(),maxRadius:ctx.state.phase===2?8.5:7.5,expandSpeed:12.2,
      damage:31,color:ember,staggerStrength:0.88});
  } else {
    // A narrow strip down the committed heading, with two scorched grooves marking its edges.
    const sin=Math.sin(ai.aimYaw),cos=Math.cos(ai.aimYaw);
    dir.set(-sin,0,-cos);
    for(const s of sides){
      point.copy(origin).addScaledVector(dir,0.44);point.x+=cos*s*0.39;point.z-=sin*s*0.39;
      callbacks.spawnSurfaceSlashScar(point,up,dir,true);
    }
    const x=ctx.playerPos.x-spatial.x,z=ctx.playerPos.z-spatial.z;
    const along=-sin*x-cos*z,across=cos*x-sin*z;
    if(along>=0.05 && along<=3.12 && Math.abs(across)<=0.86 &&
        Math.abs(ctx.playerPos.y-spatial.y)<1.15 && !ctx.playerRolling &&
        hasEnemyLineOfSight(spatial.x,spatial.y+0.68,spatial.z,ctx.playerPos.x,ctx.playerPos.y+0.68,ctx.playerPos.z,ctx.world)) {
      callbacks.applyPlayerMeleeHit(35,origin,0.95);
    }
  }
}

function releaseFan(ctx:EnemyAiStepContext,ai:ExecutionerState) {
  const {callbacks}=ctx;
  origin.copy(currentEdges[1].toe);
  const yaw=computeFacingYaw(origin.x,origin.z,ai.aim.x,ai.aim.z);
  const pitch=Math.atan2(ai.aim.y+1.02-origin.y,Math.hypot(ai.aim.x-origin.x,ai.aim.z-origin.z));
  for(const offset of computeExecutionerWaveAngles(ctx.state.phase)){
    const a=yaw+offset;
    dir.set(-Math.sin(a)*Math.cos(pitch),Math.sin(pitch),-Math.cos(a)*Math.cos(pitch));
    callbacks.spawnProjectile({origin:origin.clone(),direction:dir.clone(),speed:ctx.state.phase===2?23.5:21.5,damage:16,
      kind:'boss_overdrive',color:ember,radius:0.18,staggerStrength:0.46});
  }
  callbacks.spawnBladeSlashArc(currentEdges[1].heel,yaw,0.23,pitch,1.57,ember,true,1);
  callbacks.onKatanaSlashAudio?.(true);
}

export function createDualCleaverExecutionerBrain(mats:Floor05EnemyMaterials):EnemyArchetypeBrain {
  return {
    config:cfg,
    createRig(id) {
      const textures=createExecutionerTextures();
      const rig=buildDualCleaverExecutionerRig(id,mats,textures);
      const dispose=rig.dispose;
      rig.dispose=()=>{dispose();textures.dispose();};
      return rig;
    },
    createAiState:()=>({
      stage:'stalk',attack:'twin_x_cleave',time:0,duration:1,patrol:0,orbitSide:1,aim:new THREE.Vector3(),aimYaw:0,
      readyAt:{twin_x_cleave:0.5,whirlwind_blender:3,berserker_leap_slam:2.2,molten_arc_wave:2.4,
        overhead_guillotine:3.4,dragging_uppercut:1.35,reaping_backstep:2},
      fxMask:0,hitMask:0,released:false,landed:false,leap:{vx:0,vz:0,peakHeight:0},edges:[edge(),edge()],
    } satisfies ExecutionerState),
    stepAi(ctx){
      const {state,spatial,playerPos,dt,elapsed,world,callbacks}=ctx;
      const rig=ctx.rig as DualCleaverExecutionerRigHandle,ai=ctx.aiState as unknown as ExecutionerState;
      const dx=playerPos.x-spatial.x,dz=playerPos.z-spatial.z,dist=Math.hypot(dx,dz);
      const yaw=computeFacingYaw(spatial.x,spatial.z,playerPos.x,playerPos.z);
      const los=dist<=cfg.detectRange && hasEnemyLineOfSight(spatial.x,spatial.y+1.75,spatial.z,
        playerPos.x,playerPos.y+1.1,playerPos.z,world);
      const p2=state.phase===2;
      state.engaged ||= los || state.hp<state.maxHp;
      let vx=0,vz=0,heat=p2?0.42:0.12,air=0,progress=0,prior=0,pose:ExecutionerPoseMode='stalk';
      if(state.staggerTimer>0) {
        ai.stage='stalk';state.behavior='staggered';heat=0;
      } else if(!state.engaged) {
        state.behavior='patrol';
        const wp=ctx.patrolPoints.length?ctx.patrolPoints[ai.patrol%ctx.patrolPoints.length]:null;
        if(wp){
          const x=wp.x-spatial.x,z=wp.z-spatial.z,d=Math.hypot(x,z);
          if(d<0.7) ai.patrol++;
          else {
            vx=x/d*2;vz=z/d*2;
            spatial.yaw=rotateYawTowards(spatial.yaw,computeFacingYaw(spatial.x,spatial.z,wp.x,wp.z),2.4,dt);
          }
        }
      } else {
        if(ai.stage==='stalk'){
          const cd=ai.readyAt;
          const action=selectExecutionerAction({
            horizDist:dist,vertDist:Math.abs(playerPos.y-spatial.y),hasLos:los,phase:state.phase,
            hasAttackToken:ctx.hasAttackToken,flanked:Math.abs(wrapAngleDelta(yaw,spatial.yaw))>1.24,
            cleaveCooldown:cd.twin_x_cleave-elapsed,whirlwindCooldown:cd.whirlwind_blender-elapsed,
            leapCooldown:cd.berserker_leap_slam-elapsed,waveCooldown:cd.molten_arc_wave-elapsed,
            guillotineCooldown:cd.overhead_guillotine-elapsed,dragCooldown:cd.dragging_uppercut-elapsed,
            backstepCooldown:cd.reaping_backstep-elapsed,roll:Math.random(),
          });
          if(action==='stalk_advance') {
            const circle=dist<3.8 && los, speed=circle?1.63:dist>8?cfg.sprintSpeed:cfg.moveSpeed;
            const x=dx/Math.max(0.02,dist),z=dz/Math.max(0.02,dist);
            state.behavior=circle?'strafe':'chase';
            vx=(circle?-z*ai.orbitSide+x*0.14:x)*speed+ctx.separation.x;
            vz=(circle?x*ai.orbitSide+z*0.14:z)*speed+ctx.separation.y;
            spatial.yaw=rotateYawTowards(spatial.yaw,yaw,3.65,dt);
          } else {
            ai.attack=action;ai.orbitSide*=-1;ai.aim.copy(playerPos);ai.aimYaw=spatial.yaw;
            ai.fxMask=0;ai.hitMask=0;ai.released=false;ai.landed=false;
            const timing=EXECUTIONER_TIMINGS[action];
            begin(ai,'windup',timing.windup*(p2?0.9:1));
            ai.readyAt[action]=elapsed+timing.cooldown*(p2?0.88:1);
            callbacks.onTelegraphAudio(cues[action]);
            rig.getBladeEdge(action==='twin_x_cleave'||action==='reaping_backstep'?-1:1,origin,point);
            callbacks.spawnPerilGlint(point,action==='molten_arc_wave'?0xffb75e:red);
          }
        }
        if(ai.stage!=='stalk'){
          prior=Math.min(1,ai.time/ai.duration);
          ai.time+=dt; progress=Math.min(1,ai.time/ai.duration);
          pose=EXECUTIONER_POSES[ai.attack];
          if(ai.stage==='windup'){
            state.behavior='windup';heat=0.37+progress*0.99;
            if(progress<=0.65){
              ai.aim.copy(playerPos);
              spatial.yaw=rotateYawTowards(spatial.yaw,yaw,ai.attack==='reaping_backstep'?7.4:4.7,dt);
              ai.aimYaw=spatial.yaw;
            }
            if(ai.attack==='berserker_leap_slam')pose='leap_crouch';
          } else if(ai.stage==='active'){
            state.behavior='attack';heat=1.42;
            let speed=0;
            switch(ai.attack){
              case 'twin_x_cleave': speed=progress<0.32?5.5:progress>0.46&&progress<0.70?2.8:0;break;
              case 'dragging_uppercut':speed=progress<0.53?8.05:0;break;
              case 'whirlwind_blender':speed=progress<0.76?2.15:0;break;
              case 'reaping_backstep':speed=progress<0.255?-3.3:progress<0.64?6.45:0;break;
              case 'overhead_guillotine':speed=progress>0.18&&progress<0.46?3.5:0;break;
              case 'berserker_leap_slam': {
                const t=Math.min(1,progress/0.76);
                air=4*t*(1-t)*ai.leap.peakHeight;
                if(t<1){vx=ai.leap.vx;vz=ai.leap.vz;}
                break;
              }
            }
            vx-=Math.sin(ai.aimYaw)*speed;vz-=Math.cos(ai.aimYaw)*speed;
          } else {state.behavior='recover';heat=(p2?0.55:0.21)+(1-progress)*0.58;}
        }
      }
      const collided=stepEnemyMovement(spatial,vx,vz,world,dt,F5_PIT_Y-0.6);
      if(collided && state.behavior==='strafe') ai.orbitSide=-ai.orbitSide;
      // Sample the two world-space edges after the rig has assumed this exact simulation frame.
      rig.root.position.set(spatial.x,spatial.y,spatial.z);rig.root.rotation.y=spatial.yaw;
      rig.setPoseMode(pose);rig.setCleaverHeat(heat);
      const sin=Math.sin(spatial.yaw),cos=Math.cos(spatial.yaw);
      rig.updateAnimation({
        dt,elapsed,behavior:state.behavior,speedRatio:Math.hypot(spatial.vx,spatial.vz)/cfg.moveSpeed,
        localMoveX:(cos*spatial.vx-sin*spatial.vz)/cfg.moveSpeed,localMoveZ:(-sin*spatial.vx-cos*spatial.vz)/cfg.moveSpeed,
        aimPitch:0,attackProgress:progress,attackVariant:EXECUTIONER_ATTACKS.indexOf(ai.attack),
        flinchTimer:state.flinchTimer,flinchDirX:state.flinchDirX,staggerTimer:state.staggerTimer,deadProgress:0,
        weakpointExposed:state.weakpoint.exposed,weakpointBroken:state.weakpoint.broken,shieldActive:false,phase:state.phase,airborneHeight:air,
      });
      for(let i=0;i<2;i++)rig.getBladeEdge(sides[i],currentEdges[i].heel,currentEdges[i].toe);
      if(ai.stage==='windup' && ai.attack==='dragging_uppercut' && prior<0.75 && progress>=0.75) {
        origin.copy(currentEdges[1].toe); origin.y=spatial.y+0.025;
        callbacks.spawnProjectileImpactSparks(origin,up,ember);
        callbacks.onKatanaWallCarveAudio?.(false);
      }
      if(ai.stage==='active'){
        const beats=strokes[ai.attack];
        const count=p2?beats.length:Math.min(2,beats.length);
        for(let i=0;i<count;i++){
          const stroke=beats[i], hand=stroke.hand===-1?0:1;
          stepCut(ctx,ai,stroke,i,ai.edges[hand],currentEdges[hand],prior,progress,los);
        }
        if(!ai.released && ai.attack==='molten_arc_wave' && progress>=0.42){
          releaseFan(ctx,ai);ai.released=true;
        }
        const leap=ai.attack==='berserker_leap_slam';
        if(!ai.landed && ((leap&&progress>=0.76)||(ai.attack==='overhead_guillotine'&&progress>=0.51))){
          groundImpact(ctx,ai,leap);ai.landed=true;
        }
      }
      for(let i=0;i<2;i++){ai.edges[i].heel.copy(currentEdges[i].heel);ai.edges[i].toe.copy(currentEdges[i].toe);}
      if(progress>=1 && state.staggerTimer<=0) {
        const timing=EXECUTIONER_TIMINGS[ai.attack];
        if(ai.stage==='windup'){
          if(ai.attack==='berserker_leap_slam') {
            ai.leap=solveExecutionerLeap(ai.aim.x-spatial.x,ai.aim.z-spatial.z,timing.active*0.76);
            rig.getWeakpointWorldPos(origin);callbacks.spawnBoosterBurst(origin,dir.set(0,-1,0.1),ember,8);
          }
          begin(ai,'active',timing.active);
        } else if(ai.stage==='active'){
          if(ai.attack==='whirlwind_blender')ctx.exposeWeakpoint(2.15);
          begin(ai,'recover',timing.recovery);
        } else if(ai.stage==='recover')ai.stage='stalk';
      }
    },
  };
}
