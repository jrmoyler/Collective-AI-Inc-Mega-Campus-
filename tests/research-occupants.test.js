import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {InteriorKit,furnishRoom,taskChair} from '../viewer/campus/interior-kit.js';
import {furnishOccupants} from '../viewer/campus/room-occupants.js';

test('research function selects distinct apparatus and excludes unrelated generic analyzers',()=>{
 const cases=[[13,'Wearable streams','wearable sensor band'],[28,'Water analysis','sample cuvette'],[27,'Characterization','measurement probe'],[20,'Network lab','test patch lead'],[30,'Credential lab','unissued credential']];
 for(const [facility,name,part] of cases){
  const k=new InteriorKit(name);furnishRoom(k,{name,x:0,z:6,w:10,d:12,fitout:{facility,technical:true}});
  assert.ok(k.parts.some(m=>m.name===part),name);
  assert.ok(!k.parts.some(m=>m.name==='fume extraction cabinet'||m.name==='instrument base'),name+' inherited generic lab apparatus');
  const bounds=new T.Box3();for(const m of k.parts){m.updateMatrixWorld();bounds.expandByObject(m);}
  assert.ok(bounds.min.x>=-5&&bounds.max.x<=5&&bounds.min.z>=0&&bounds.max.z<=12,name+' fits room');
 }
});
test('occupants follow actual rotated task seats and remain non-colliding geometry',()=>{
 const furniture=new InteriorKit('seats');taskChair(furniture,2,5,Math.PI/2);
 const k=new InteriorKit('occupants'),seats=furnishOccupants(k,furniture,{x:0,z:6,w:10,d:12});assert.equal(seats.length,1);
 const nose=k.parts.find(m=>m.name==='occupant nose');assert.ok(nose.position.x<2-.1);assert.ok(Math.abs(nose.position.z-5)<1e-6);
 const root=k.finish(false);root.updateMatrixWorld();const b=new T.Box3().setFromObject(root);
 assert.ok(b.min.y>=0&&b.max.y<1.67,'seated adult fits floor and route eye height');
 for(const m of root.children){assert.equal(m.userData.collision,false);for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}
});

test('occupant faces the open side of a half-turned chair, not its backrest',()=>{
 for(const yaw of [Math.PI,-Math.PI/2,Math.PI*1.25]){
  const f=new InteriorKit('chair');taskChair(f,0,6,yaw);const k=new InteriorKit('occupant');furnishOccupants(k,f,{x:0,z:6,w:10,d:12});
  const nose=k.parts.find(m=>m.name==='occupant nose'),back=f.parts.find(m=>m.name==='lumbar shell');
  assert.ok((nose.position.x)*(back.position.x)+(nose.position.z-6)*(back.position.z-6)<0,'face must be opposite backrest');
 }
});

test('rotated occupant limbs stay attached to their modeled joints',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.25]){
  const f=new InteriorKit('chair');taskChair(f,1,6,yaw);const k=new InteriorKit('occupant');furnishOccupants(k,f,{x:0,z:6,w:10,d:12});
  for(const name of ['sleeve','forearm','upper trouser leg','lower trouser leg']){
   const bars=k.parts.filter(m=>m.name==='occupant '+name),starts=k.parts.filter(m=>m.name==='occupant '+name+' joint'),ends=k.parts.filter(m=>m.name==='occupant '+name+' end');
   bars.forEach((bar,i)=>{const axis=new T.Vector3(0,1,0).applyQuaternion(bar.quaternion).multiplyScalar(bar.geometry.parameters.height/2),a=bar.position.clone().sub(axis),b=bar.position.clone().add(axis);assert.ok(a.distanceTo(starts[i].position)<1e-6);assert.ok(b.distanceTo(ends[i].position)<1e-6);});
  }
 }
});
