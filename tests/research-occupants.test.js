import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {InteriorKit,furnishRoom,taskChair} from '../viewer/campus/interior-kit.js';
import {furnishOccupants} from '../viewer/campus/room-occupants.js';

test('research function selects distinct apparatus and excludes unrelated generic analyzers',()=>{
 const cases=[[13,'Wearable streams','wearable sensor band'],[28,'Water analysis','sample tube'],[27,'Characterization','measurement probe'],[20,'Network lab','test patch lead'],[30,'Credential lab','unissued credential']];
 for(const [facility,name,part] of cases){
  const k=new InteriorKit(name);furnishRoom(k,{name,x:0,z:6,w:10,d:12,fitout:{facility,technical:true}});
  assert.ok(k.parts.some(m=>m.name===part),name);
  assert.ok(!k.parts.some(m=>m.name==='fume extraction cabinet'||m.name==='instrument base'),name+' inherited generic lab apparatus');
  const bounds=new T.Box3();for(const m of k.parts){m.updateMatrixWorld();bounds.expandByObject(m);}
  assert.ok(bounds.min.x>=-5&&bounds.max.x<=5&&bounds.min.z>=0&&bounds.max.z<=12,name+' fits room');
 }
});
test('textured occupants follow actual seats at every chair yaw',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.25]){
  const f=new InteriorKit('chair');taskChair(f,1,6,yaw);const k=new InteriorKit('occupant');
  const seats=furnishOccupants(k,f,{x:0,z:6,w:10,d:12});assert.equal(seats.length,1);assert.match(seats[0].asset,/^staff-0[123]$/);
  assert.ok(k.parts.length>=6,'body, clothing, footwear, hair and eyes');
  const matrix=new T.Matrix4().makeRotationY(yaw);matrix.setPosition(1,0,6);
  for(const mesh of k.parts){
   mesh.updateMatrix();const p=new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,0);
   assert.ok(p.clone().applyMatrix4(mesh.matrix).distanceTo(p.clone().applyMatrix4(matrix))<1e-6);
  }
  const root=k.finish(false);root.updateMatrixWorld();const b=new T.Box3().setFromObject(root);
  assert.ok(b.min.y>=-.001&&b.max.y<1.67,'seated adult fits floor and route eye height');
  for(const m of root.children){assert.equal(m.userData.collision,false);assert.ok(m.geometry.attributes.uv);for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}
 }
});
test('separate floor assemblies do not mutate shared character buffers',()=>{
 const build=()=>{const f=new InteriorKit('chair');taskChair(f,0,6,Math.PI/2);const k=new InteriorKit('occupant');furnishOccupants(k,f,{x:0,z:6,w:10,d:12});return k.finish(false);};
 const a=build(),before=Array.from(a.children[0].geometry.attributes.position.array);a.traverse(o=>o.geometry?.dispose());
 const b=build();assert.deepEqual(Array.from(b.children[0].geometry.attributes.position.array),before);
});
