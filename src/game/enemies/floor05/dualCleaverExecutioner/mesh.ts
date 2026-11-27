import * as THREE from 'three';
import { createBeveledBox, createContouredArmorPlate, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { ExecutionerTextureSuite } from './textures';
import type { ExecutionerAttack } from './tactics';
import { createExecutionerPose, executionerSpin, sampleExecutionerPose } from './motion';
import { attach, buildApron, buildCleaver, buildMask } from './regalia';

export type ExecutionerPoseMode = 'stalk'|'x_cleave'|'whirlwind'|'leap_crouch'|'leap_air'|'guillotine'|'wave'|'drag'|'backstep';
export const EXECUTIONER_POSES: Record<ExecutionerAttack,ExecutionerPoseMode> = {
  twin_x_cleave:'x_cleave', whirlwind_blender:'whirlwind', berserker_leap_slam:'leap_air',
  molten_arc_wave:'wave', overhead_guillotine:'guillotine', dragging_uppercut:'drag', reaping_backstep:'backstep',
};
const actions: Record<ExecutionerPoseMode,ExecutionerAttack|null> = {
  stalk:null, x_cleave:'twin_x_cleave', whirlwind:'whirlwind_blender', leap_air:'berserker_leap_slam',
  leap_crouch:'berserker_leap_slam', guillotine:'overhead_guillotine', wave:'molten_arc_wave',drag:'dragging_uppercut',backstep:'reaping_backstep',
};
export interface DualCleaverExecutionerRigHandle extends EnemyRigHandle {
  setPoseMode(mode: ExecutionerPoseMode): void;
  setCleaverHeat(heat: number): void;
  getBladeEdge(side: -1|1, heel: THREE.Vector3, toe: THREE.Vector3): void;
}

const sides = [-1,1] as const;
const clamp=THREE.MathUtils.clamp;
function joint(parent: THREE.Object3D,name: string,x: number,y: number,z: number) {
  const g=new THREE.Group(); g.name=name; g.position.set(x,y,z); parent.add(g); return g;
}
function leg(pelvis: THREE.Group,side: number, iron: THREE.Material, dark: THREE.Material, bronze: THREE.Material) {
  const hip=joint(pelvis,'Hip',side*0.228,0,0);
  attach(hip,createLoftedAnatomy([
    {y:-0.5,rx:0.091,rz:0.098},{y:-0.37,rx:0.132,rz:0.137},{y:-0.18,rx:0.156,rz:0.165,offsetZ:-0.015},
    {y:-0.052,rx:0.17,rz:0.168},{y:0.045,rx:0.104,rz:0.118},
  ],16),dark);
  const knee=joint(hip,'Knee',0,-0.5,0);
  attach(knee,createLoftedAnatomy([
    {y:-0.52,rx:0.084,rz:0.090},{y:-0.358,rx:0.095,rz:0.109},{y:-0.19,rx:0.137,rz:0.148,offsetZ:0.024},
    {y:-0.084,rx:0.132,rz:0.125},{y:0.032,rx:0.10,rz:0.11},
  ],16),dark);
  attach(knee,createContouredArmorPlate([[0,0.104],[0.118,0.033],[0.118,-0.15],[0.047,-0.416],[0,-0.463],
    [-0.078,-0.345],[-0.13,-0.073],[-0.106,0.046]],(x,y,o)=>[x,y,-0.142+2.8*x*x-0.07*y-o],0.027,0.11),iron);
  const hinge=attach(knee,new THREE.CylinderGeometry(0.073,0.078,0.224,14),bronze,0,-0.015,0.009);
  hinge.rotation.z=Math.PI/2;
  const ankle=joint(knee,'Ankle',0,-0.52,0);
  attach(ankle,createLoftedAnatomy([
    {y:-0.108,rx:0.127,rz:0.211,offsetZ:-0.061,squareness:3.2},{y:-0.074,rx:0.137,rz:0.221,offsetZ:-0.058,squareness:2.8},
    {y:-0.014,rx:0.124,rz:0.197,offsetZ:-0.05},{y:0.079,rx:0.091,rz:0.11},
  ],18),iron);
  return {hip,knee,ankle};
}

export function buildDualCleaverExecutionerRig(enemyId:string,mats:Floor05EnemyMaterials,tex:ExecutionerTextureSuite): DualCleaverExecutionerRigHandle {
  const root=new THREE.Group(); root.name='DualCleaverExecutioner_'+enemyId;
  const iron=new THREE.MeshStandardMaterial({map:tex.furnacePlateMap,bumpMap:tex.ironBump,bumpScale:0.013,metalness:0.47,roughness:0.53,
    emissive:0xffa77b,emissiveIntensity:0});
  const black=new THREE.MeshStandardMaterial({color:0x48434b,map:tex.furnacePlateMap,metalness:0.32,roughness:0.67});
  const steel=new THREE.MeshStandardMaterial({map:tex.bladeMap,bumpMap:tex.ironBump,bumpScale:0.004,roughness:0.39,metalness:0.61});
  const ivory=new THREE.MeshStandardMaterial({color:0xc9b59b,bumpMap:tex.ironBump,bumpScale:0.009,roughness:0.6,metalness:0.25});
  const darkCloth=new THREE.MeshStandardMaterial({map:tex.hoodMap,roughness:0.96,side:THREE.DoubleSide});
  const leather=new THREE.MeshStandardMaterial({map:tex.leatherMap,bumpMap:tex.ironBump,bumpScale:0.004,roughness:0.82,side:THREE.DoubleSide});
  const bronze=new THREE.MeshStandardMaterial({color:0x95714f,metalness:0.56,roughness:0.52});
  const edge=mats.createWeakpointMaterial(0xf9a069,0xf14712);
  const eye=mats.createWeakpointMaterial(0xffce7b,0xe1330a);
  const core=mats.createWeakpointMaterial(0xffa24d,0xf94812);
  const owned=[iron,black,steel,ivory,darkCloth,leather,bronze,edge,eye,core];
  const shadow=createEnemyContactShadow(0.91,mats.shadowDisc); root.add(shadow);
  const pelvis=joint(root,'Pelvis',0,1.056,0);
  const legs=sides.map(s=>leg(pelvis,s,iron,black,bronze));
  attach(pelvis,createLoftedAnatomy([
    {y:-0.13,rx:0.265,rz:0.19},{y:0.04,rx:0.328,rz:0.237,squareness:2.7},{y:0.172,rx:0.256,rz:0.201},
  ],22),leather);
  const belt=attach(pelvis,createCurvedPanelGeometry([{y:0.012,rx:0.328,rz:0.242,thickness:0.032},
    {y:0.103,rx:0.316,rz:0.234,thickness:0.035}],0,Math.PI*2,24),black);
  belt.rotation.z=0.049;
  const apron=buildApron(pelvis,leather,bronze);
  for(const s of sides){
    attach(pelvis,createCurvedPanelGeometry([
      {y:-0.247,rx:0.303,rz:0.197,thickness:0.022},{y:-0.084,rx:0.346,rz:0.246,thickness:0.035},
      {y:0.045,rx:0.328,rz:0.242,thickness:0.03},
    ],s===-1?2.43:-0.67,s===-1?3.79:0.71,12),iron);
  }
  const torso=joint(pelvis,'Spine',0,0.132,0);
  attach(torso,createLoftedAnatomy([
    {y:-0.01,rx:0.257,rz:0.213},{y:0.255,rx:0.306,rz:0.241},{y:0.49,rx:0.378,rz:0.288},
    {y:0.7,rx:0.452,rz:0.303,squareness:2.35},{y:0.82,rx:0.394,rz:0.265},{y:0.91,rx:0.203,rz:0.166},
  ],24),darkCloth);
  for(const s of sides) {
    for(let i=0;i<3;i++) {
      const y=0.23+i*0.143,w=0.294+i*0.043;
      attach(torso,createContouredArmorPlate([[s*0.015,y],[s*w,y+0.12],[s*(w+0.025),y+0.208],[s*0.089,y+0.151],[s*0.036,y+0.083]],
        (x,h,d)=>[x,h,-0.263-0.072*h+0.84*x*x-d],0.033,0.11),i===2?iron:black);
    }
    attach(torso,createContouredArmorPlate([[s*0.029,0.655],[s*0.119,0.837],[s*0.307,0.882],[s*0.453,0.737],
      [s*0.35,0.663],[s*0.122,0.596]],(x,y,d)=>[x,y,-0.324+0.76*x*x+0.18*(y-0.71)-d],0.039,0.1),iron);
    // Two burnt leather harness straps run over the cuirass and into the furnace pack.
    attach(torso,createContouredArmorPlate([[s*0.173,0.17],[s*0.226,0.19],[s*0.335,0.848],[s*0.29,0.872]],
      (x,y,d)=>[x,y,-0.284-0.098*y+0.68*x*x-d],0.024,0.07),leather);
    const clasp=attach(torso,new THREE.TorusGeometry(0.036,0.008,6,8),bronze,s*0.251,0.447,-0.316);
    clasp.scale.set(0.9,1.26,0.6);clasp.rotation.z=-s*0.19;
    attach(torso,createCurvedPanelGeometry([
      {y:0.24,rx:0.326,rz:0.249,thickness:0.022},{y:0.54,rx:0.421,rz:0.298,thickness:0.028},
      {y:0.76,rx:0.422,rz:0.311,thickness:0.034},{y:0.825,rx:0.348,rz:0.25,thickness:0.021},
    ],s<0?1.93:0.41,s<0?2.69:1.22,12),iron);
  }
  const furnace=joint(torso,'Spine furnace',0,0.53,0.296);
  attach(furnace,createLoftedAnatomy([
    {y:-0.37,rx:0.099,rz:0.104},{y:-0.251,rx:0.167,rz:0.135},{y:0.16,rx:0.163,rz:0.143},
    {y:0.267,rx:0.129,rz:0.119},{y:0.325,rx:0.074,rz:0.079},
  ],20),black);
  const heart=attach(furnace,new THREE.CapsuleGeometry(0.105,0.31,6,16),core,0,-0.015,0.133);
  const shutters=sides.map(s=>{
    const hinge=joint(furnace,'Shutter',s*0.15,0,0.15);
    for(let i=0;i<4;i++) {
      const scale=1-0.095*Math.abs(i-1.5);
      const petal=attach(hinge,createBeveledBox(0.166*scale,0.115,0.047,0.015),iron,-s*0.072,-0.201+i*0.124,0.083);
      petal.rotation.z=-s*0.14;
    }
    const chimney=attach(furnace,new THREE.CylinderGeometry(0.056,0.071,0.338,12),iron,s*0.153,0.273,0.02);
    chimney.rotation.z=-s*0.18;
    const throat=attach(furnace,new THREE.CylinderGeometry(0.042,0.042,0.012,12),black,s*0.182,0.443,0.02);
    throat.rotation.z=chimney.rotation.z;
    return hinge;
  });
  const head=joint(torso,'Hooded death mask',0,0.911,-0.107);
  buildMask(head,iron,ivory,darkCloth,black,eye);
  function arm(s:-1|1) {
    const shoulder=joint(torso,'Shoulder',s*0.476,0.745,0);
    attach(shoulder,createLoftedAnatomy([
      {y:-0.42,rx:0.086,rz:0.095},{y:-0.283,rx:0.133,rz:0.139},{y:-0.13,rx:0.154,rz:0.16},{y:0.043,rx:0.13,rz:0.141},
    ],18),leather);
    const mantle=attach(shoulder,createLoftedAnatomy([
      {y:-0.128,rx:0.184,rz:0.202},{y:-0.041,rx:0.222,rz:0.236},{y:0.108,rx:0.194,rz:0.196},
      {y:0.176,rx:0.102,rz:0.116},{y:0.191,rx:0.004,rz:0.005},
    ],20),s===-1?iron:darkCloth,s*0.025,0.026,0);
    mantle.rotation.z=-s*0.24;
    for (const h of [-0.125,-0.053]){
      const skirt=attach(shoulder,createCurvedPanelGeometry([
        {y:h-0.041,rx:0.207,rz:0.226,thickness:0.022},{y:h+0.021,rx:0.219,rz:0.238,thickness:0.029},
      ],s===1?-1.43:1.71,s===1?1.32:4.43,16),s===1?leather:iron,s*0.031,0.023,0);
      skirt.rotation.z=-s*0.24;
    }
    for(const h of [-0.23,-0.303]){
      attach(shoulder,createCurvedPanelGeometry([
        {y:h-0.026,rx:h< -0.26?0.136:0.148,rz:h< -0.26?0.138:0.154,thickness:0.012},
        {y:h+0.027,rx:h< -0.26?0.144:0.15,rz:h< -0.26?0.151:0.158,thickness:0.013},
      ],0,Math.PI*2,16),black);
    }
    if(s===-1) {
      for(let i=0;i<3;i++) {
        const fin=attach(shoulder,createContouredArmorPlate([[-0.05,-0.07],[0.042,-0.05],[0.035,0.083],[0.012,0.191],[-0.034,0.096]],
          (u,y,d)=>[u,y,-d],0.026,0.14),steel,-0.132-i*0.018,0.119,-0.117+i*0.109);
        fin.rotation.z=0.38+i*0.12;
      }
    }
    const elbow=joint(shoulder,'Elbow',0,-0.408,0);
    attach(elbow,createLoftedAnatomy([
      {y:-0.334,rx:0.076,rz:0.086},{y:-0.218,rx:0.101,rz:0.12,squareness:2.6},
      {y:-0.089,rx:0.135,rz:0.138},{y:0.013,rx:0.097,rz:0.102},
    ],16),s===1?iron:leather);
    attach(elbow,createContouredArmorPlate([[0,0.029],[0.105,-0.065],[0.081,-0.224],[0.015,-0.313],[-0.082,-0.245],[-0.111,-0.079]],
      (x,y,d)=>[x,y,-0.122+2.1*x*x-0.066*y-d],0.021,0.12),s===1?black:iron);
    const wrist=joint(elbow,'Cleaver grip',0,-0.371,0);
    attach(wrist,createBeveledBox(0.146,0.118,0.151,0.021),leather);
    for(let f=0;f<4;f++) {
      const finger=attach(wrist,new THREE.CapsuleGeometry(0.022,0.062,3,8),black,s*0.049,-0.037,(f-1.5)*0.043);
      finger.rotation.z=-s*0.73;
    }
    const blade=buildCleaver(s,steel,black,leather,bronze,edge);
    wrist.add(blade.rig);
    return {shoulder,elbow,wrist,blade};
  }
  const arms=sides.map(arm);
  // A small point field carries live cinders up from the chimneys without adding a light per particle.
  const cinders=new THREE.BufferGeometry(), positions=new Float32Array(16*3);
  cinders.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const sparkMat=new THREE.PointsMaterial({color:0xff9853,size:0.026,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const sparks=new THREE.Points(cinders,sparkMat); sparks.frustumCulled=false; furnace.add(sparks);
  const hitboxes: THREE.Mesh[]=[];
  function hit(parent:THREE.Group,zone:'body'|'head'|'weakpoint',w:number,h:number,d:number,y:number,z:number) {
    const hb=createEnemyHitboxMesh(enemyId,zone,new THREE.BoxGeometry(w,h,d),zone==='weakpoint'?'spine_furnace':undefined);
    hb.position.set(0,y,z);parent.add(hb);hitboxes.push(hb);
  }
  hit(pelvis,'body',0.67,1.02,0.44,-0.44,0);hit(torso,'body',0.87,0.99,0.6,0.421,0);
  hit(head,'head',0.383,0.46,0.39,0.14,0);hit(furnace,'weakpoint',0.328,0.622,0.252,-0.01,0.114);
  let mode:ExecutionerPoseMode='stalk',heat=0, stride=0,pace=0,vertical=0;
  const pose=createExecutionerPose(), local=new THREE.Quaternion(), shoulderQ=new THREE.Quaternion(), targetQ=new THREE.Quaternion();
  const bladeEuler=new THREE.Euler(0,0,0,'YXZ');
  const tipPosition=new THREE.Vector3(),wristPosition=new THREE.Vector3(),bladeDirection=new THREE.Vector3(),liftAxis=new THREE.Vector3();
  return {
    root,hitboxes,armorFlashMaterials:[iron],weakpointMaterials:[core],
    setPoseMode(m){mode=m;}, setCleaverHeat(h){heat=h;},
    getWeakpointWorldPos(out){return heart.getWorldPosition(out);},
    getMuzzleWorldPos(out){return arms[1].blade.toe.getWorldPosition(out);},
    getBladeEdge(s,heel,toe){const b=arms[s<0?0:1].blade;b.heel.getWorldPosition(heel);b.toe.getWorldPosition(toe);},
    updateAnimation(input:EnemyAnimationInput) {
      const {dt,elapsed,behavior,phase,attackProgress:p}=input;
      const dead=behavior==='dead',stunned=behavior==='staggered',air=input.airborneHeight;
      const attack=dead||stunned?null:actions[mode];
      sampleExecutionerPose(pose,attack,behavior,p,phase===2);
      const blend=1-Math.exp(-dt*(behavior==='attack'?38:16));
      const lerp=(a:number,b:number)=>a+(b-a)*blend;
      pace=THREE.MathUtils.damp(pace,air||stunned||dead?0:Math.min(1.6,input.speedRatio),11,dt);
      stride+=pace>0.01?dt*(3.4+5.4*pace):0;
      const breath=Math.sin(elapsed*2.37);
      let [drop,lean,twist,bank]=pose.body;
      if(stunned){drop=0.35;lean=-0.42;bank=0.19;twist=0.18;}
      const collapse=dead?THREE.MathUtils.smoothstep(input.deadProgress,0,1):0;
      drop+=collapse*0.72;lean-=collapse*1.06;bank+=collapse*0.55;
      vertical=air>0?air:THREE.MathUtils.damp(vertical,0,stunned?17:40,dt);
      const strideWeight=Math.min(1,pace);
      pelvis.position.y=lerp(pelvis.position.y,1.08-drop+vertical+0.014*Math.cos(2*stride)*strideWeight+0.005*breath);
      pelvis.position.x=lerp(pelvis.position.x,0.033*Math.cos(stride)*strideWeight+0.14*collapse);
      const spin=mode==='whirlwind'&&behavior==='attack'?executionerSpin(p,phase):0;
      const delta=Math.atan2(Math.sin(spin-pelvis.rotation.y),Math.cos(spin-pelvis.rotation.y));
      pelvis.rotation.y+=delta*(behavior==='attack'&&mode==='whirlwind'?1:blend);
      torso.rotation.set(lerp(torso.rotation.x,lean+0.018*breath-0.58*input.flinchTimer),
        lerp(torso.rotation.y,twist+0.078*Math.sin(stride)*strideWeight),lerp(torso.rotation.z,bank+0.56*input.flinchTimer*input.flinchDirX));
      head.rotation.set(lerp(head.rotation.x,-lean*0.43-(stunned?0.31:0)),lerp(head.rotation.y,-twist*0.48+0.046*Math.sin(elapsed*1.37)),
        lerp(head.rotation.z,-bank*0.32));
      for(let i=0;i<2;i++){
        const s=sides[i],cycle=stride+i*Math.PI,leg=legs[i], a=arms[i], angles=i?pose.right:pose.left;
        const lift=0.147*Math.max(0,Math.sin(cycle))*strideWeight;
        const x=s*0.065+0.18*Math.cos(cycle)*clamp(input.localMoveX,-1,1);
        const z=s*0.124-0.31*Math.cos(cycle)*clamp(input.localMoveZ,-1,1);
        const h=pelvis.position.y-vertical-0.107-lift-Math.min(0.28,air*(i?0.18:0.29));
        const down=Math.hypot(h,x),len=clamp(Math.hypot(down,z),0.15,1.019);
        const knee=Math.acos(clamp((len*len-0.5**2-0.52**2)/(2*0.5*0.52),-1,1));
        const thigh=Math.atan2(-z,down)+Math.atan2(0.52*Math.sin(knee),0.5+0.52*Math.cos(knee));
        leg.hip.rotation.set(thigh,0,Math.atan2(x,Math.max(0.2,h)),'ZXY');
        leg.knee.rotation.x=-knee;
        leg.ankle.rotation.set(knee-thigh,0,-leg.hip.rotation.z,'XYZ');
        a.shoulder.rotation.set(lerp(a.shoulder.rotation.x,stunned||dead?-0.18:angles[0]+0.13*Math.cos(cycle)*strideWeight),
          0,lerp(a.shoulder.rotation.z,s*(stunned?0.43:angles[1])));
        a.elbow.rotation.x=lerp(a.elbow.rotation.x,stunned||dead?0.42:angles[2]);
        // The wrist counter-rotates the articulated arm to maintain the authored blade plane in torso space.
        shoulderQ.copy(a.shoulder.quaternion).multiply(a.elbow.quaternion).invert();
        bladeEuler.set(stunned||dead?-0.52:angles[4],-s*angles[3],s*angles[5],'YXZ');
        targetQ.setFromEuler(bladeEuler);
        local.copy(shoulderQ).multiply(targetQ); a.wrist.quaternion.slerp(local,blend);
        // Keep the heavy blade on the floor during the drag and the planted finish. Dropping the hips
        // and folding the torso otherwise carries the point beneath the walkable surface.
        if(!dead && (mode==='drag'||mode==='guillotine'||mode==='leap_air'||mode==='stalk'||stunned)){
          const tip=a.blade.toe.getWorldPosition(tipPosition);
          const floorY=root.position.y+0.027;
          if(tip.y<floorY && air<0.12){
            const wrist=a.wrist.getWorldPosition(wristPosition);
            bladeDirection.subVectors(tip,wrist);
            const length=bladeDirection.length(),horiz=Math.hypot(bladeDirection.x,bladeDirection.z);
            const lift=Math.asin(clamp((floorY-wrist.y)/length,-1,1))-Math.atan2(bladeDirection.y,horiz);
            liftAxis.set(-bladeDirection.z,0,bladeDirection.x).normalize();
            a.elbow.getWorldQuaternion(shoulderQ).invert();
            liftAxis.applyQuaternion(shoulderQ);
            targetQ.setFromAxisAngle(liftAxis,lift);a.wrist.quaternion.premultiply(targetQ);
          }
        }
        const opened=input.weakpointExposed||input.weakpointBroken;
        shutters[i].rotation.y=lerp(shutters[i].rotation.y,s*(opened?1.43:0.035));
      }
      apron.rotation.x=lerp(apron.rotation.x,0.064+0.19*Math.sin(stride+0.3)*strideWeight+drop*0.3);
      apron.rotation.z=lerp(apron.rotation.z,-bank*0.46+0.087*input.localMoveX);
      shadow.scale.setScalar(1-Math.min(0.44,vertical*0.145));
      eye.emissiveIntensity=(1-collapse)*(1.0+0.22*breath+(phase===2?0.67:0));
      edge.emissiveIntensity=(1-collapse)*(0.29+0.12*breath+heat*(phase===2?1.3:0.89));
      sparks.visible=!dead&&!input.weakpointBroken;
      sparkMat.opacity=(phase===2?0.60:0.25)+Math.min(0.25,heat*0.15);
      for(let i=0;i<16;i++){
        const t=(elapsed*(0.67+0.027*(i%4))+i*0.618)%1, s=sides[i%2];
        positions[i*3]=s*(0.184+0.078*t)+Math.sin(i+t*7)*0.059*t;
        positions[i*3+1]=0.437+t*(0.37+0.19*heat);
        positions[i*3+2]=0.018+t*0.18+Math.cos(i+t*5)*0.04*t;
      }
      cinders.attributes.position.needsUpdate=true;
    },
    dispose(){
      root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(o instanceof THREE.InstancedMesh)o.dispose();}});
      hitboxes.forEach(hb=>(hb.material as THREE.Material).dispose());
      owned.forEach(m=>m.dispose()); cinders.dispose();sparkMat.dispose();
    },
  };
}
