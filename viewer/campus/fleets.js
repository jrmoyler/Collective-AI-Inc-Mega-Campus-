// @ts-nocheck
import * as T from 'three';
import {Batch,materials,cylinder,ring,line} from './geometry.js';
import {SPIRES} from './data.js';

function wheel(root,x,z,r=.58){
 const tyre=new T.Mesh(new T.TorusGeometry(r,.16,10,24),materials.dark);tyre.rotation.y=Math.PI/2;tyre.position.set(x,.62,z);tyre.castShadow=true;root.add(tyre);
 const hub=new T.Mesh(new T.CylinderGeometry(r*.48,r*.48,.24,20),materials.steel);hub.rotation.z=Math.PI/2;hub.position.set(x,.62,z);hub.castShadow=true;root.add(hub);
 const cap=new T.Mesh(new T.CylinderGeometry(r*.17,r*.17,.26,16),materials.cyan);cap.rotation.z=Math.PI/2;cap.position.set(x,.62,z);root.add(cap);
}
function vehicle(freight=false){
 const root=new T.Group();root.name=freight?'freight':'shuttle';const b=new Batch();const L=freight?8.8:5.8,W=2.55;
 b.box('white',0,1.38,0,W,1.55,L);b.box('dark',0,.48,0,W*.98,.28,L*.98);b.box('glass',0,2.0,.25,W*1.01,.72,freight?2.2:4.65);
 b.box('stone',0,2.52,-.15,W*.9,.18,freight?5.8:4.3);b.box('cyan',0,1.0,L/2+.04,W*.68,.1,.08);b.box('cyan',0,1.0,-L/2-.04,W*.68,.1,.08);
 b.box('gold',0,.92,L/2+.08,W*.34,.06,.08);b.box('gold',0,.92,-L/2-.08,W*.34,.06,.08);
 if(freight){b.box('copper',0,2.15,-1.55,W*.92,2.85,4.65);b.box('dark',0,2.16,-3.91,W*.74,1.15,.12);for(let i=-2;i<=2;i++)b.box('gold',i*.44,2.18,-3.98,.15,.75,.05);}
 else {for(const x of [-.82,.82]){b.box('dark',x,1.78,.12,.055,.82,4.58);b.box('gold',x,2.5,.1,.05,.08,4.2);}b.box('dark',0,2.7,-1.75,1.35,.18,.55);}
 root.add(b.finish(root.name+'-shell'));
 for(const x of [-W/2-.02,W/2+.02])for(const z of [-L*.31,L*.31])wheel(root,x,z,freight?.62:.56);
 const sensor=new T.Mesh(new T.CylinderGeometry(.24,.29,.24,20),materials.graphite||materials.dark);sensor.position.set(0,2.86,freight?2.65:1.86);root.add(sensor);const lens=new T.Mesh(new T.SphereGeometry(.10,16,10),materials.cyan);lens.position.set(0,2.88,freight?2.84:2.05);root.add(lens);
 root.scale.setScalar(1.35);return root;
}
function joint(material,r=.11){const m=new T.Mesh(new T.SphereGeometry(r,18,12),material);m.castShadow=true;return m;}
function limb(material,length=.52,r=.085){const g=new T.Group();const m=new T.Mesh(new T.CapsuleGeometry(r,length,6,10),material);m.position.y=-length*.5;m.castShadow=true;g.add(m);const j=joint(material,r*1.14);j.position.y=-length-.02;g.add(j);return g;}
function android(){
 const root=new T.Group();root.name='android';const torso=new T.Group();root.add(torso);
 const chest=new T.Mesh(new T.CapsuleGeometry(.24,.46,8,14),materials.white);chest.scale.set(1.05,1,.68);chest.position.y=1.25;chest.castShadow=true;torso.add(chest);
 const sternum=new T.Mesh(new T.BoxGeometry(.24,.31,.065),materials.dark);sternum.position.set(0,1.27,.22);sternum.castShadow=true;torso.add(sternum);
 const core=new T.Mesh(new T.RingGeometry(.055,.09,24),materials.cyan);core.position.set(0,1.31,.258);torso.add(core);
 const neck=new T.Mesh(new T.CylinderGeometry(.09,.11,.14,16),materials.steel);neck.position.y=1.67;root.add(neck);
 const head=new T.Mesh(new T.SphereGeometry(.22,24,16),materials.white);head.scale.set(1,.92,.9);head.position.y=1.89;head.castShadow=true;root.add(head);
 const visor=new T.Mesh(new T.SphereGeometry(.205,24,12,0,Math.PI,0,Math.PI*.58),materials.glass);visor.rotation.x=Math.PI/2;visor.position.set(0,1.92,.055);root.add(visor);
 const eye=new T.Mesh(new T.BoxGeometry(.18,.028,.018),materials.cyan);eye.position.set(0,1.94,.205);root.add(eye);
 const limbs=[];
 for(const side of [-1,1]){
  const shoulder=joint(materials.steel,.13);shoulder.position.set(side*.34,1.5,0);root.add(shoulder);
  const arm=limb(materials.white,.40,.07);arm.position.set(side*.34,1.46,0);arm.rotation.z=side*.08;root.add(arm);limbs.push(arm);
  const fore=limb(materials.steel,.38,.062);fore.position.set(side*.34,1.02,0);root.add(fore);limbs.push(fore);
  const hip=joint(materials.dark,.13);hip.position.set(side*.17,.82,0);root.add(hip);
  const thigh=limb(materials.white,.48,.09);thigh.position.set(side*.17,.78,0);root.add(thigh);limbs.push(thigh);
  const shin=limb(materials.steel,.46,.075);shin.position.set(side*.17,.27,0);root.add(shin);limbs.push(shin);
  const foot=new T.Mesh(new T.BoxGeometry(.24,.11,.38),materials.dark);foot.position.set(side*.17,.03,.08);foot.castShadow=true;root.add(foot);
 }
 root.scale.setScalar(1.65);return {root,limbs};
}
function rotor(root,x,z,r){
 const arm=new T.Mesh(new T.CapsuleGeometry(.055,Math.hypot(x,z)-.12,4,8),materials.dark);arm.position.set(x*.5,0,z*.5);arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(x,0,z).normalize());arm.name="rotor arm";root.add(arm);
 const motor=new T.Mesh(new T.CylinderGeometry(.18,.22,.18,18),materials.steel);motor.name="rotor motor";motor.position.set(x,0,z);root.add(motor);
 const guard=new T.Mesh(new T.TorusGeometry(r,.035,6,36),materials.dark);guard.rotation.x=Math.PI/2;guard.position.set(x,.08,z);root.add(guard);
 const blade=new T.Mesh(new T.BoxGeometry(r*1.65,.025,.08),materials.cyan);blade.name="rotor blade";blade.position.set(x,.1,z);root.add(blade);return blade;
}
function drone(cargo=false){
 const root=new T.Group();root.name=cargo?'cargo-drone':'survey-drone';
 const shell=new T.Mesh(new T.SphereGeometry(1,24,14),materials.white);shell.scale.set(cargo?1.2:.68,.22,cargo?.9:.52);shell.castShadow=true;root.add(shell);
 const belly=new T.Mesh(new T.SphereGeometry(.55,18,10),materials.dark);belly.scale.set(1,.38,.8);belly.position.y=-.18;root.add(belly);
 const lens=new T.Mesh(new T.SphereGeometry(.18,18,12),materials.glass);lens.position.set(0,-.26,.46);root.add(lens);const aperture=new T.Mesh(new T.SphereGeometry(.07,14,10),materials.cyan);aperture.position.set(0,-.26,.61);root.add(aperture);
 const blades=[];const span=cargo?1.7:1.25,rr=cargo?.48:.38;for(const x of [-1,1])for(const z of [-1,1])blades.push(rotor(root,x*span,z*span,rr));root.rotorBlades=blades;
 if(cargo){const pod=new T.Mesh(new T.BoxGeometry(1.5,.85,1.2),materials.copper);pod.position.y=-.75;pod.castShadow=true;root.add(pod);for(const x of [-.56,.56]){const rail=new T.Mesh(new T.CapsuleGeometry(.04,.92,4,8),materials.gold);rail.rotation.z=Math.PI/2;rail.position.set(x,-1.18,0);root.add(rail);}}
 return root;
}
export function createFleets(roads){const root=new T.Group();root.name='autonomous-fleets';const agents=[];const automated=typeof navigator!=='undefined'&&(navigator.webdriver||/Headless/i.test(navigator.userAgent||''));const shuttleN=automated?8:38,androidN=automated?4:24,droneN=automated?4:16;
 for(let i=0;i<shuttleN;i++){const road=roads[i%roads.length];const object=vehicle(i%5===0);root.add(object);agents.push({object,curve:road.curve,offset:i/shuttleN,speed:(i%5===0?7:11)/road.curve.getLength(),lane:i%2===0?3:-3});}
 for(let i=0;i<androidN;i++){const a=android(),road=roads[i%roads.length];root.add(a.root);agents.push({object:a.root,limbs:a.limbs,curve:road.curve,offset:i/androidN,speed:2.2/road.curve.getLength(),lane:road.width/2+3});}
 for(let i=0;i<droneN;i++){const points=SPIRES.filter((_,j)=>j%2===i%2).map(([x,z])=>new T.Vector3(x,52+(i%3)*7,z));const curve=new T.CatmullRomCurve3(points,true);const object=drone(i%4===0);object.scale.setScalar(1.45);root.add(object);agents.push({object,curve,offset:i/droneN,speed:14/curve.getLength(),lane:0});}
 return {root,counts:{shuttles:30,freight:8,androids:24,drones:16},update(t){for(const a of agents){try{if(!a.curve||!a.object)continue;const span=a.curve.closed?1:2;let phase=(a.offset+t*a.speed)%span;if(!Number.isFinite(phase))continue;if(phase<0)phase+=span;const reverse=phase>1;const u=Math.min(.999,Math.max(.001,reverse?2-phase:phase));const p=a.curve.getPoint(u);const d=a.curve.getTangent(u);if(!p||!d||!Number.isFinite(p.x)||!Number.isFinite(d.x))continue;if(reverse)d.negate();a.object.position.copy(p);a.object.position.x-=d.z*a.lane;a.object.position.z+=d.x*a.lane;a.object.rotation.y=Math.atan2(d.x,d.z);if(a.limbs)a.limbs.forEach((l,j)=>l.rotation.x=Math.sin(t*4+j%2*Math.PI)*(j<4?.32:.5));a.object.rotorBlades?.forEach((blade,i)=>{blade.rotation.y=t*18*(i%3===0?1:-1);});}catch{}}}};}
