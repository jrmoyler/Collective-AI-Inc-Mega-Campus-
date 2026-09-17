// @ts-nocheck
import * as T from 'three';
import {Batch,materials} from './geometry.js';
import {SPIRES} from './data.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Shared, bounded detail: repeated fleet members reuse vertex buffers.
const sharedGeometry=new Map();
function cached(key,build){if(!sharedGeometry.has(key))sharedGeometry.set(key,build());return sharedGeometry.get(key);}
function rounded(w,h,d,r=.12){return cached(`round-${w}-${h}-${d}-${r}`,()=>new RoundedBoxGeometry(w,h,d,2,r));}
function panel(root,mat,x,y,z,w,h,d,r=.1){const mesh=new T.Mesh(rounded(w,h,d,r),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}

// Collapse stationary vehicle details by material; wheel groups remain articulated.
function batchVehicle(root){
 const groups=new Map();root.updateMatrixWorld(true);
 for(const child of [...root.children]){
  if(child.name==='rolling wheel')continue;
  child.traverse(mesh=>{if(!mesh.isMesh)return;const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);if(!groups.has(mesh.material))groups.set(mesh.material,[]);groups.get(mesh.material).push(geometry);});root.remove(child);
 }
 for(const [material,parts] of groups){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,material);mesh.name='coachwork';mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
}
function wheel(root,x,z,r=.58){
 const tyre=new T.Mesh(cached(`tyre-${r}`,()=>new T.TorusGeometry(r,.16,10,24)),materials.dark);tyre.rotation.y=Math.PI/2;tyre.position.set(x,.62,z);tyre.castShadow=true;root.add(tyre);
 const hub=new T.Mesh(new T.CylinderGeometry(r*.48,r*.48,.24,20),materials.steel);hub.rotation.z=Math.PI/2;hub.position.set(x,.62,z);hub.castShadow=true;root.add(hub);
 const cap=new T.Mesh(new T.CylinderGeometry(r*.17,r*.17,.26,16),materials.cyan);cap.rotation.z=Math.PI/2;cap.position.set(x,.62,z);root.add(cap);
 const assembly=new T.Group();assembly.position.set(x,r+.16,z);assembly.name='rolling wheel';root.add(assembly);for(const part of [tyre,hub,cap]){part.position.set(0,0,0);assembly.add(part);}root.userData.wheels??=[];root.userData.wheels.push(assembly);
}
function vehicle(freight=false){
 const root=new T.Group();root.name=freight?'freight':'shuttle';const b=new Batch();const L=freight?8.8:5.8,W=2.55;
 panel(root,materials.white,0,1.38,0,W,1.55,L,.3);panel(root,materials.dark,0,.48,0,W*.98,.28,L*.98,.12);panel(root,materials.glass,0,2.0,.25,W*1.005,.72,freight?2.2:4.65,.22);
 panel(root,materials.white,0,2.52,-.15,W*.9,.18,freight?5.8:4.3,.08);b.box('cyan',0,1.0,L/2+.04,W*.68,.1,.08);b.box('cyan',0,1.0,-L/2-.04,W*.68,.1,.08);
 b.box('gold',0,.92,L/2+.08,W*.34,.06,.08);b.box('gold',0,.92,-L/2-.08,W*.34,.06,.08);
 if(freight){panel(root,materials.white,0,2.15,-1.55,W*.92,2.85,4.65,.18);for(const x of [-1.19,1.19])for(let z=-3.5;z<.6;z+=.38)b.box('steel',x,2.15,z,.035,2.5,.025);b.box('dark',0,2.16,-3.91,W*.74,1.15,.12);for(let i=-2;i<=2;i++)b.box('gold',i*.44,2.18,-3.98,.15,.75,.05);}
 else {for(const x of [-.82,.82]){b.box('dark',x,1.78,.12,.055,.82,4.58);b.box('gold',x,2.5,.1,.05,.08,4.2);}b.box('dark',0,2.7,-1.75,1.35,.18,.55);}
 root.add(b.finish(root.name+'-shell'));
 for(const x of [-W/2-.02,W/2+.02])for(const z of [-L*.31,L*.31])wheel(root,x,z,freight?.62:.56);
 const sensor=new T.Mesh(new T.CylinderGeometry(.24,.29,.24,20),materials.graphite||materials.dark);sensor.position.set(0,2.86,freight?2.65:1.86);root.add(sensor);const lens=new T.Mesh(new T.SphereGeometry(.10,16,10),materials.cyan);lens.position.set(0,2.88,freight?2.84:2.05);root.add(lens);
 // Windscreen framing, split passenger doors, mirrors and physically sized lamps.
 for(const side of [-1,1]){for(const z of [-1.6,-.55,.55,1.6])b.box('steel',side*1.28,2.02,z,.04,.76,.055);panel(root,materials.dark,side*1.43,1.97,L*.30,.22,.16,.35,.05);panel(root,materials.warm,side*.88,1.21,L/2+.06,.36,.12,.055,.04);panel(root,materials.copper,side*.88,1.21,-L/2-.06,.28,.1,.055,.035);}
 root.add(b.finish('body-trim'));root.userData.wheelRadius=(freight?.62:.56)+.16;batchVehicle(root);return root;
}
function joint(material,r=.11){const m=new T.Mesh(cached(`joint-${r}`,()=>new T.SphereGeometry(r,16,10)),material);m.castShadow=true;return m;}
function limb(material,length=.52,r=.085){const g=new T.Group();const m=new T.Mesh(cached(`limb-${length}-${r}`,()=>new T.CapsuleGeometry(r,length,4,10)),material);m.position.y=-length*.5;m.castShadow=true;g.add(m);const j=joint(material,r*1.14);j.position.y=-length-.02;g.add(j);return g;}
function android(){
 const root=new T.Group();root.name='android';const body=new T.Group();body.name='pelvis and articulated torso';root.add(body);
 panel(body,materials.dark,0,.93,0,.36,.2,.25,.08);
 const chest=new T.Mesh(cached('android-chest',()=>new T.CapsuleGeometry(.23,.29,5,12)),materials.white);chest.scale.set(1.1,1,.62);chest.position.y=1.27;chest.castShadow=true;body.add(chest);
 panel(body,materials.dark,0,1.31,.15,.2,.25,.065,.04);
 const core=new T.Mesh(cached('core',()=>new T.RingGeometry(.03,.048,16)),materials.cyan);core.position.set(0,1.32,.19);body.add(core);
 const headPivot=new T.Group();headPivot.position.y=1.62;body.add(headPivot);
 const neck=joint(materials.steel,.075);headPivot.add(neck);
 const head=new T.Mesh(cached('android-head',()=>new T.SphereGeometry(.18,16,12)),materials.white);head.scale.set(1,1.16,.89);head.position.y=.20;head.castShadow=true;headPivot.add(head);
 panel(headPivot,materials.glass,0,.22,.135,.27,.10,.045,.04);
 panel(headPivot,materials.cyan,0,.225,.164,.14,.018,.012,.006);
 const rig={body,headPivot,legs:[],arms:[]};
 for(const side of [-1,1]){
  const arm=limb(materials.white,.29,.064);arm.position.set(side*.31,1.47,0);arm.rotation.z=side*.08;body.add(arm);
  const elbow=limb(materials.steel,.27,.052);elbow.position.y=-.30;arm.add(elbow);
  panel(elbow,materials.white,0,-.33,.01,.10,.14,.075,.035);rig.arms.push({arm,elbow,side});
  const thigh=limb(materials.white,.37,.082);thigh.position.set(side*.135,.92,0);body.add(thigh);
  const shin=limb(materials.steel,.36,.061);shin.position.y=-.39;thigh.add(shin);
  const foot=panel(shin,materials.dark,0,-.42,.075,.18,.12,.32,.055);rig.legs.push({thigh,shin,foot,side});
 }
 root.userData.rig=rig;return {root,rig};
}
function animateAndroid(rig,t,walking=true){
 const cycle=t*5.1,amplitude=walking?1:0;
 rig.body.position.y=walking?.018*(1-Math.cos(cycle*2)):Math.sin(t*1.4)*.006;
 rig.body.rotation.y=Math.sin(cycle)*.035*amplitude;rig.headPivot.rotation.y=Math.sin(t*.43)*.16;
 for(const {thigh,shin,foot,side} of rig.legs){const phase=cycle+(side===1?Math.PI:0);thigh.rotation.x=Math.sin(phase)*.35*amplitude;shin.rotation.x=Math.max(0,-Math.sin(phase))*.63*amplitude;foot.rotation.x=-thigh.rotation.x-shin.rotation.x;}
 for(const {arm,elbow,side} of rig.arms){arm.rotation.x=-Math.sin(cycle+(side===1?Math.PI:0))*.29*amplitude;elbow.rotation.x=-.14-Math.max(0,Math.sin(cycle))*.12*amplitude;}
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
 if(cargo){const pod=new T.Mesh(rounded(1.5,.85,1.2,.12),materials.white);pod.position.y=-.75;pod.castShadow=true;root.add(pod);for(const x of [-.56,.56]){const rail=new T.Mesh(new T.CapsuleGeometry(.04,.92,4,8),materials.gold);rail.rotation.z=Math.PI/2;rail.position.set(x,-1.18,0);root.add(rail);}}
 return root;
}
export function createFleets(roads){
 const root=new T.Group();root.name='autonomous-fleets';const agents=[];
 const validRoads=roads.filter(r=>r.curve&&r.curve.getLength()>1);
 const counts={shuttles:0,freight:0,androids:0,drones:0};
 const vehicleTemplates=new Map();
 function spawnVehicle(freight){
  if(!vehicleTemplates.has(freight)){const model=vehicle(freight);delete model.userData.wheels;vehicleTemplates.set(freight,model);}
  const model=vehicleTemplates.get(freight).clone(true);model.userData.wheels=model.children.filter(o=>o.name==='rolling wheel');return model;
 }
 // Same scene in verification and user browsers; no webdriver-dependent omissions.
 for(let i=0;i<38&&validRoads.length;i++){
  const road=validRoads[i%validRoads.length],freight=i%5===0,object=spawnVehicle(freight),direction=i%2?1:-1;
  root.add(object);counts[freight?'freight':'shuttles']++;
  agents.push({object,curve:road.curve,offset:i/38,speed:(freight?7:11)/road.curve.getLength(),metersPerSecond:freight?7:11,lane:Math.min(road.width*.25,3),direction});
 }
 for(let i=0;i<24&&validRoads.length;i++){
  const a=android(),road=validRoads[i%validRoads.length];root.add(a.root);counts.androids++;
  agents.push({object:a.root,rig:a.rig,curve:road.curve,offset:i/24,speed:1.35/road.curve.getLength(),lane:road.width/2+1.65,direction:i%2?1:-1});
 }
 for(let i=0;i<16;i++){
  const points=SPIRES.filter((_,j)=>j%2===i%2).map(([x,z])=>new T.Vector3(x,52+(i%3)*7,z));
  const curve=new T.CatmullRomCurve3(points,true),object=drone(i%4===0);root.add(object);counts.drones++;
  agents.push({object,curve,offset:i/16,speed:14/curve.getLength(),lane:0,direction:1,flight:i});
 }
 return {root,counts,update(t){
  if(!Number.isFinite(t))return;
  for(const a of agents){
   const span=a.curve.closed?1:2;let phase=((a.offset+t*a.speed*a.direction)%span+span)%span;
   const reverse=phase>1,u=T.MathUtils.clamp(reverse?2-phase:phase,.00001,.99999);
   const p=a.curve.getPointAt(u),d=a.curve.getTangentAt(u);if(reverse)d.negate();d.multiplyScalar(a.direction);
   a.object.position.copy(p);a.object.position.x-=d.z*a.lane;a.object.position.z+=d.x*a.lane;
   a.object.rotation.y=Math.atan2(d.x,d.z);
   if(a.rig)animateAndroid(a.rig,t+a.offset*10);
   a.object.userData.wheels?.forEach(w=>{w.rotation.x=t*a.metersPerSecond/a.object.userData.wheelRadius;});
   if(a.flight!==undefined){a.object.position.y+=Math.sin(t*.9+a.flight)*.35;a.object.rotation.z=Math.sin(t*.6+a.flight)*.025;a.object.rotation.x=.045;}
   a.object.rotorBlades?.forEach((blade,i)=>{blade.rotation.y=t*90*(i%3===0?1:-1);});
  }
 }};
}
