import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {FACILITIES,floorLayout} from '../viewer/campus/data.js';
import {createReferenceFidelityDetail} from '../viewer/campus/reference-fidelity.js';
import {InteriorKit} from '../viewer/campus/interior-kit.js';
import {roomIdentity,furnishRoomIdentity} from '../viewer/campus/room-identity.js';

test('PR14 preserves the approved 35 facilities, 74 floor programs and 444 ordered rooms',()=>{
 assert.equal(FACILITIES.length,35);
 assert.equal(FACILITIES.reduce((n,f)=>n+f.levels,0),74);
 assert.equal(FACILITIES.reduce((n,f)=>n+f.program.reduce((m,p)=>m+p.split(';').length,0),0),444);
});

test('all 35 facilities expose non-generic deferred reference-fidelity geometry',()=>{
 const seen=new Set();
 for(const f of FACILITIES){
  const group=createReferenceFidelityDetail(f);
  assert.equal(group.userData.referenceFidelity,true,f.key);
  assert.equal(group.userData.nearDetail,true,f.key);
  assert.ok(group.userData.criticalDetails.length>=3,f.key+' missing explicit reference targets');
  assert.ok(group.children.length>0,f.key+' empty approach detail');
  const box=new T.Box3().setFromObject(group);
  assert.ok(Number.isFinite(box.min.x)&&Number.isFinite(box.max.y),f.key+' non-finite bounds');
  const components=group.children.flatMap(m=>m.userData.components||[]);
  assert.ok(components.length>=3,f.key+' insufficient physical detail');
  const signature=group.userData.criticalDetails.join('|')+'|'+components.length+'|'+box.getSize(new T.Vector3()).toArray().map(v=>v.toFixed(3)).join(',');
  assert.ok(!seen.has(signature),f.key+' duplicated another facility fidelity assembly');
  seen.add(signature);
  group.traverse(o=>o.geometry?.dispose());
 }
 assert.equal(seen.size,35);
});

test('every scheduled hidden room receives a unique physical authorship signature',()=>{
 const keys=new Set(),geometry=new Set();
 for(const f of FACILITIES)for(let level=0;level<f.levels;level++){
  const layout=floorLayout(f,level);
  for(const [index,source] of layout.rooms.entries()){
   const r={...source,x:0,z:source.localDepth/2,w:source.localWidth,d:source.localDepth,doorX:0};
   const identity=roomIdentity(r,index);
   assert.ok(!keys.has(identity.key),identity.key+' repeated');keys.add(identity.key);
   const k=new InteriorKit(identity.key);const authored=furnishRoomIdentity(k,r,index);
   assert.equal(authored.key,identity.key);
   assert.ok(k.parts.length>=8,identity.key+' lacks authored physical detail');
   const physical=k.parts.map(m=>{
    m.geometry.computeBoundingBox();const size=m.geometry.boundingBox.getSize(new T.Vector3());
    return [m.position.x,m.position.y,m.position.z,size.x,size.y,size.z].map(v=>v.toFixed(3)).join(',');
   }).sort().join('|');
   assert.ok(!geometry.has(physical),identity.key+' duplicates another room composition');
   geometry.add(physical);
  }
 }
 assert.equal(keys.size,444);
 assert.equal(geometry.size,444);
});
