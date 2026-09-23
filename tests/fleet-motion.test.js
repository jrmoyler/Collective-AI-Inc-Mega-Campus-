import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFleets} from '../viewer/campus/fleets.js';

const road=()=>({curve:new T.LineCurve3(new T.Vector3(0,.22,0),new T.Vector3(0,.22,1000)),width:12});
// Road curves sit on the kinetic stripe (y .22); asphalt is .06 lower and the
// flanking sidewalk .10 lower. Agents stand on those surfaces, not the stripe.
const SIDEWALK=.22-.10,ASPHALT=.22-.06;
test('fleet population is real, articulated and independent of automation detection',()=>{
 const fleet=createFleets([road()]);
 assert.deepEqual(fleet.counts,{shuttles:30,freight:8,androids:24,drones:16,people:111});
 const androids=fleet.root.children.filter(o=>o.name==='android');
 const people=fleet.root.children.filter(o=>o.name==='pedestrian');
 assert.equal(androids.length,24);assert.equal(people.length,111);
 for(const figure of [...androids,...people]){
  const {rig}=figure.userData;assert.equal(rig.legs.length,2);assert.equal(rig.arms.length,2);
  for(const {arm,elbow} of rig.arms)assert.equal(elbow.parent,arm);
  for(const {thigh,shin,foot} of rig.legs){assert.equal(shin.parent,thigh);assert.equal(foot.parent,shin);}
 }
 for(const t of [.5,1.37,4.2]){
  fleet.update(t);fleet.root.updateMatrixWorld(true);
  for(const android of androids){
   const ys=android.userData.rig.legs.map(({foot})=>foot.getWorldPosition(new T.Vector3()).y);
   assert.ok(Math.min(...ys)>=SIDEWALK-1e-6,'feet may not pass beneath the sidewalk');
   assert.ok(Math.min(...ys)<SIDEWALK+.12,'the stance foot is planted, the figure does not float');
  }
 }
 // Pedestrians differ in height (1.6-1.9 m) and clothing; limbs swing while walking.
 const heights=people.map(p=>p.scale.y*1.75);
 assert.ok(Math.min(...heights)>=1.6-1e-9&&Math.max(...heights)<=1.9+1e-9);
 assert.ok(new Set(heights.map(h=>h.toFixed(2))).size>8,'varied statures');
 const walker=people[0],{thigh}=walker.userData.rig.legs[0];fleet.update(10);const a=thigh.rotation.x;fleet.update(10.3);
 assert.notEqual(a,thigh.rotation.x,'walk cycle animates');
 // Repeat rigs share immutable geometry and draw through shared instanced batches.
 const first=androids[0].userData.rig.legs[0].thigh.children[0];
 const second=androids[1].userData.rig.legs[0].thigh.children[0];
 assert.ok(first.isMesh);assert.equal(first.geometry,second.geometry,'repeat rigs share immutable geometry');
 const batches=fleet.root.children.filter(o=>o.isInstancedMesh);
 assert.ok(batches.length>20&&batches.length<120,`bounded draw batches (${batches.length})`);
 assert.ok(batches.some(b=>b.geometry===first.geometry&&b.count>=24),'android limbs are instanced');
 const tinted=batches.find(b=>b.instanceColor&&b.count>50);assert.ok(tinted,'pedestrian clothing and skin vary per instance');
});
test('road fleet travels in metres per second and tyres roll',()=>{
 const fleet=createFleets([road()]);const freight=fleet.root.children.find(o=>o.name==='freight');
 fleet.update(1);const start=freight.position.clone();fleet.update(2);
 assert.ok(Math.abs(freight.position.distanceTo(start)-7)<.001);
 assert.ok(Math.abs(freight.position.y-ASPHALT)<1e-6,'tyres sit on the asphalt');
 assert.equal(freight.userData.wheels.length,4);
 for(const wheel of freight.userData.wheels)assert.ok(Math.abs(wheel.rotation.x-2*7/freight.userData.wheelRadius)<1e-9,'rolling without slip');
 const before=freight.position.clone();fleet.update(NaN);assert.ok(freight.position.equals(before));
});
test('open roads loop through U-turns without teleporting or snapping heading',()=>{
 const fleet=createFleets([road()]);
 const movers=fleet.root.children.filter(o=>o.userData.proxy&&!o.userData.rig?.standing&&(o.name==='shuttle'||o.name==='freight'||o.name==='android'));
 const dt=1/30;let prev=null;
 for(let t=0;t<200;t+=dt){
  fleet.update(t);
  const now=movers.map(o=>[o.position.clone(),o.rotation.y]);
  if(prev)now.forEach(([p,yaw],i)=>{
   const [q,y0]=prev[i];assert.ok(p.distanceTo(q)<7*dt*1.05+1e-6,'no teleport');
   assert.ok(Math.abs(Math.atan2(Math.sin(yaw-y0),Math.cos(yaw-y0)))<4*dt,'heading turns at a finite yaw rate (<4 rad/s)');
  });
  prev=now;
 }
});
test('missing road input has honest counts and leaves aerial activity available',()=>{
 const fleet=createFleets([]);assert.deepEqual(fleet.counts,{shuttles:0,freight:0,androids:0,drones:16,people:105});
 fleet.update(100);for(const o of fleet.root.children)assert.ok(o.position.toArray().every(Number.isFinite));
});
test('drones bank into turns and distant pedestrians are culled from the draw',()=>{
 const fleet=createFleets([road()]);const drones=fleet.root.children.filter(o=>o.rotorBlades);
 let banked=0;for(let t=0;t<30;t+=.5){fleet.update(t);for(const d of drones){assert.ok(Math.abs(d.rotation.z)<=.42+1e-9);if(Math.abs(d.rotation.z)>.05)banked++;}}
 assert.ok(banked>0,'coordinated turns roll the airframe');
 const people=fleet.root.children.filter(o=>o.isInstancedMesh&&o.instanceColor);
 fleet.update(5,new T.Vector3(0,5,500));const near=people.reduce((s,m)=>s+m.count,0);
 fleet.update(5,new T.Vector3(0,3000,0));const far=people.reduce((s,m)=>s+m.count,0);
 assert.ok(near>0&&far===0,'humanoids beyond LOD range are not submitted');
});
