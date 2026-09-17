import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {FACILITIES,floorLayout} from '../viewer/campus/data.js';
import {createInteriorGeometry} from '../viewer/campus/interior-architecture.js';
import {InteriorKit,furnishRoom} from '../viewer/campus/interior-kit.js';

test('all 74 floors have distinct geometry and all 444 guided entries remain open',()=>{
 const hashes=new Set();let floors=0,rooms=0;
 for(const f of FACILITIES)for(let level=0;level<f.levels;level++){
  const {root,layout}=createInteriorGeometry(f,level);root.updateMatrixWorld(true);
  // Hash the rendered vertices alone, excluding names, metadata, materials and IDs.
  const hash=createHash('sha256');let bytes=0;
  root.traverse(o=>{if(!o.geometry)return;const g=o.geometry;hash.update(new Uint8Array(g.attributes.position.array.buffer));for(const a of Object.values(g.attributes))bytes+=a.array.byteLength;bytes+=g.index?.array.byteLength||0;});
  const signature=hash.digest('hex');assert.ok(!hashes.has(signature),`${f.key} floor ${level+1} duplicates rendered geometry`);hashes.add(signature);
  assert.ok(bytes<96*1024*1024,`${f.key} floor memory budget`);
  for(const r of layout.rooms){
   const side=Math.sign(r.z),from=new T.Vector3(r.doorX,1.67,0),to=new T.Vector3(r.doorX,1.67,side*(layout.corridor/2+Math.min(2,r.d*.24))),delta=to.clone().sub(from);
   assert.equal(new T.Raycaster(from,delta.clone().normalize(),0,delta.length()).intersectObject(root,true).length,0,`${f.key}/${level+1} ${r.name} arrival blocked`);rooms++;
  }
  root.traverse(o=>o.geometry?.dispose());floors++;
 }
 assert.equal(floors,74);assert.equal(rooms,444);
});

test('canonical programs retain order and activity controls room allocation',()=>{
 for(const f of FACILITIES)for(let level=0;level<f.levels;level++){
  const a=floorLayout(f,level);assert.deepEqual(a.rooms.map(r=>r.name),f.program[level].split(';'));
  for(const bank of [a.rooms.slice(0,3),a.rooms.slice(3)]){
   assert.ok(Math.abs(bank.reduce((v,r)=>v+r.w,0)-(a.w-2*a.core))<1e-7);
   for(let i=1;i<bank.length;i++)assert.ok(Math.abs(bank[i-1].x+bank[i-1].w/2-(bank[i].x-bank[i].w/2))<1e-7,'continuous non-overlapping envelopes');
  }
 }
 const f=FACILITIES[4],r=floorLayout(f,0).rooms;assert.ok(r[0].w>r[4].w,'LED volume allocates more space than equipment storage');
});

test('specialist programs produce their actual equipment instead of repeated office clusters',()=>{
 for(const [name,part] of [['LED volume 40 x 60','LED volume structural panel'],['Motion capture','motion tracking camera'],['Faraday suite','RF shield roof'],['Aerospace assembly','aerospace fuselage test article'],['Racked inventory','sealed transit carton'],['Algae research','algae culture column'],['Accessible-home demo','roll in shower tray'],['Soft goods studio','sewing machine head'],['Behavior booths','behavior booth acoustic partition']]){
  const kit=new InteriorKit(name);furnishRoom(kit,{name,x:0,z:12,w:18,d:18});assert.ok(kit.parts.some(p=>p.name===part),name);
 }
});
