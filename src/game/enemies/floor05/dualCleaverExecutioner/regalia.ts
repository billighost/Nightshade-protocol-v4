import * as THREE from 'three';
import { createBeveledBox, createContouredArmorPlate, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';

export function attach(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x=0,y=0,z=0) {
  const mesh = new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

type Polygon = [number,number][];
function relief(parent: THREE.Group, outline: Polygon, material: THREE.Material,
  surface: (x: number,y: number)=>number, thickness=0.018) {
  return attach(parent,createContouredArmorPlate(outline,(x,y,d)=>[x,y,surface(x,y)-d],thickness,0.09,thickness*0.44,2),material);
}

export function buildMask(head: THREE.Group, iron: THREE.Material, bone: THREE.Material,
  hood: THREE.Material, dark: THREE.Material, eye: THREE.Material) {
  attach(head,createLoftedAnatomy([
    {y:-0.08,rx:0.126,rz:0.135},{y:0.073,rx:0.182,rz:0.164},{y:0.233,rx:0.194,rz:0.174},
    {y:0.36,rx:0.158,rz:0.142,offsetZ:0.025},{y:0.407,rx:0.006,rz:0.008,offsetZ:0.044},
  ],24),dark);
  // The cowl wraps the temples. A folded peak and long nape separate the mask from the collar.
  attach(head,createCurvedPanelGeometry([
    {y:-0.19,rx:0.256,rz:0.224,thickness:0.026,offsetZ:0.06,creaseAmp:0.015},
    {y:-0.04,rx:0.211,rz:0.198,thickness:0.03,offsetZ:0.035,creaseAmp:0.012},
    {y:0.21,rx:0.212,rz:0.190,thickness:0.028},{y:0.326,rx:0.184,rz:0.17,thickness:0.035},
    {y:0.40,rx:0.115,rz:0.121,thickness:0.026,offsetZ:0.027},{y:0.448,rx:0.014,rz:0.025,thickness:0.012,offsetZ:0.087},
  ],-0.77,Math.PI+0.77,28),hood);
  const shell = (x:number,y:number) => -0.218+1.89*x*x+0.31*Math.max(y-0.18,0)+0.30*Math.max(0,0.09-y);
  for (const s of [-1,1]) {
    const mirror = (pts:Polygon):Polygon => pts.map(([x,y])=>[s*x,y]);
    relief(head,mirror([[0.005,0.278],[0.102,0.325],[0.184,0.254],[0.179,0.196],[0.097,0.183],[0.031,0.151]]),bone,shell,0.023);
    relief(head,mirror([[0.048,0.141],[0.158,0.172],[0.133,0.133],[0.071,0.12]]),eye,(x,y)=>shell(x,y)+0.009,0.012);
    relief(head,mirror([[0.185,0.153],[0.149,0.109],[0.062,0.084],[0.072,0.02],[0.104,-0.044],[0.079,-0.096],[0.159,-0.043],[0.194,0.055]]),bone,shell);
    relief(head,mirror([[0.010,0.137],[0.04,0.152],[0.049,0.063],[0.075,0.017],[0.033,0.032],[0.012,0.009]]),iron,(x,y)=>shell(x,y)-0.014);
    for (let i=0; i<3; i++) {
      const x=0.025+i*0.035;
      relief(head,mirror([[x-0.012,0.002+i*0.004],[x+0.012,0.011+i*0.007],[x+0.012,-0.042],[x-0.002,-0.071+(i%2)*0.019]]),
        bone,shell,0.013);
    }
    // Small iron staples and an old repair cut give the ceramic face an asymmetrical history.
    for (let i=0;i<2;i++){
      const x=s*(0.135+i*0.018),y=0.253-i*0.033;
      const pin=attach(head,new THREE.CylinderGeometry(0.008,0.010,0.012,8),iron,x,y,shell(x,y)-0.028);
      pin.rotation.x=Math.PI/2;
    }
  }
  relief(head,[[0.104,0.299],[0.082,0.254],[0.091,0.235],[0.065,0.195],[0.083,0.238],[0.074,0.254]],
    dark,(x,y)=>shell(x,y)-0.025,0.0025);
}

export function buildApron(pelvis: THREE.Group, mat: THREE.Material, bronze: THREE.Material) {
  const apron = new THREE.Group();
  apron.position.set(0,0.065,-0.244);
  pelvis.add(apron);
  for (const side of [-1,1]) {
    const geo = new THREE.PlaneGeometry(0.278,0.665,10,12);
    const p=geo.attributes.position;
    for (let i=0;i<p.count;i++) {
      const u=p.getX(i),v=0.5-p.getY(i)/0.665;
      const scallop = (0.031+0.020*Math.cos(48*u+side))*v**5;
      p.setXYZ(i,side*(0.141+0.019*v)+u*(1-0.28*v),-v*0.665+scallop+side*0.032*v,
        0.030*Math.cos(21*u+side*0.3)-0.08*v*v-0.01*Math.sin(9*v+side));
    }
    geo.computeVertexNormals();
    attach(apron,geo,mat);
  }
  // A short swag, alternating the plane of consecutive forged links.
  const chain = new THREE.InstancedMesh(new THREE.TorusGeometry(0.028,0.0065,6,12),bronze,17);
  const link=new THREE.Object3D();
  for (let i=0;i<17;i++) {
    const t=i/16;
    link.position.set(-0.294+t*0.588,-0.015-0.163*Math.sin(t*Math.PI),-0.037-0.039*Math.sin(t*Math.PI));
    link.rotation.set(0,(i%2)*1.04,0.5-t*0.95);
    link.scale.set(1.12,0.77,1); link.updateMatrix(); chain.setMatrixAt(i,link.matrix);
  }
  chain.castShadow=true; apron.add(chain);
  return apron;
}

export function buildCleaver(side: -1|1, steel: THREE.Material, iron: THREE.Material,
  wrap: THREE.Material, bronze: THREE.Material, glow: THREE.Material) {
  const rig = new THREE.Group();
  const grip = attach(rig,new THREE.CylinderGeometry(0.036,0.041,0.42,14),wrap,0,0,0.03);
  grip.rotation.x=Math.PI/2;
  for(const z of [-0.156,0.19]) {
    const collar=attach(rig,new THREE.CylinderGeometry(0.052,0.052,0.049,12),bronze,0,0,z);
    collar.rotation.x=Math.PI/2;
  }
  attach(rig,new THREE.TorusGeometry(0.054,0.013,7,16),bronze,0,-0.014,0.248);
  attach(rig,createBeveledBox(0.138,0.218,0.092,0.024),iron,0,0,-0.186);
  const long=side===1;
  const length=long?1.39:1.22, heel=long?-0.126:-0.178, belly=long?-0.216:-0.294;
  const outline=new THREE.Shape();
  outline.moveTo(0,heel); outline.lineTo(length*0.7,belly);
  outline.quadraticCurveTo(length*0.91,belly-0.034,length,belly+0.044);
  if (long) {
    outline.lineTo(length+0.107,0.202); outline.lineTo(length-0.102,0.119);
    outline.quadraticCurveTo(length-0.19,0.086,length-0.214,0.225);
  } else {
    outline.lineTo(length+0.016,0.224); outline.quadraticCurveTo(length,0.328,length-0.095,0.324);
  }
  outline.lineTo(length*0.5,0.193); outline.lineTo(length*0.46,0.151); outline.lineTo(0.157,0.157);
  outline.lineTo(0.093,0.099); outline.lineTo(0,0.095); outline.closePath();
  const socket=new THREE.Path();
  socket.absellipse(long?length*0.68:length*0.81,0.12,long?0.042:0.067,long?0.032:0.065,0,Math.PI*2,true,0);
  outline.holes.push(socket);
  function extrude(shape:THREE.Shape, depth:number, bevel:number) {
    const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:bevel,bevelThickness:bevel,curveSegments:12});
    geo.translate(0,0,-depth/2).rotateY(Math.PI/2);
    return geo;
  }
  attach(rig,extrude(outline,0.043,0.012),steel,0,0,-0.222);
  const edge=new THREE.Shape();
  edge.moveTo(0.082,heel-0.006); edge.lineTo(length*0.7,belly-0.009);
  edge.quadraticCurveTo(length*0.91,belly-0.042,length+0.004,belly+0.04);
  edge.lineTo(length-0.011,belly+0.075); edge.quadraticCurveTo(length*0.89,belly+0.001,length*0.69,belly+0.024);
  edge.lineTo(0.082,heel+0.021); edge.closePath();
  attach(rig,extrude(edge,0.067,0.003),glow,0,0,-0.222);
  // A blackened tang and three pins sit on both broad faces of the blade.
  for (const face of [-1,1]) {
    const strap=attach(rig,createBeveledBox(0.018,0.07,length*0.48,0.006),iron,face*0.032,0.073,-0.30-length*0.22);
    strap.rotation.x=0.046;
    for(let i=0;i<3;i++) {
      const rivet=attach(rig,new THREE.CylinderGeometry(0.015,0.017,0.012,8),bronze,face*0.045,0.075+i*0.006,-0.31-i*0.19);
      rivet.rotation.z=Math.PI/2;
    }
  }
  const heelAnchor = new THREE.Object3D(), toeAnchor=new THREE.Object3D();
  heelAnchor.position.set(0,heel,-0.303);
  toeAnchor.position.set(0,belly+0.028,-0.222-length);
  rig.add(heelAnchor,toeAnchor);
  return { rig,heel:heelAnchor,toe:toeAnchor };
}
