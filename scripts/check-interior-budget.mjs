// Node-only structural and memory budget evidence; not physical-device FPS.
import fs from 'node:fs';
import * as T from 'three';
import assert from 'node:assert/strict';
import {FACILITIES} from '../viewer/campus/data.js';
import {createInteriorGeometry} from '../viewer/campus/interior-architecture.js';
const floors=[];
for(const f of FACILITIES)for(let l=0;l<f.levels;l++){
 const start=performance.now();const {root,layout}=createInteriorGeometry(f,l);
 let vertices=0,bytes=0,parts=0;
 root.traverse(o=>{if(o.geometry){assert.ok(o.geometry.index,'indexed geometry required');vertices+=o.geometry.attributes.position.count;for(const a of Object.values(o.geometry.attributes))bytes+=a.array.byteLength;bytes+=o.geometry.index.array.byteLength;}parts+=o.userData.sculptRuntime?.parts.length||0;});
 assert.ok(bytes<96*1024*1024,`${f.key} floor ${l+1}: ${bytes} bytes exceeds budget`);
 root.updateMatrixWorld(true);
 const blocked=[];
 for(const r of layout.rooms){
  for(let i=1;i<r.route.length;i++){
   const from=new T.Vector3(r.route[i-1][0],1.67,r.route[i-1][1]),to=new T.Vector3(r.route[i][0],1.67,r.route[i][1]),v=to.clone().sub(from);
   if(v.length()<.001)continue;
   const hits=new T.Raycaster(from,v.clone().normalize(),0,v.length()).intersectObject(root,true);
   if(hits.length)blocked.push(r.name+' segment '+i);
  }
 }
 floors.push({facility:f.key,floor:l+1,vertices,bytes,parts,constructionAndCheckMs:Math.round(performance.now()-start),blockedArrivals:blocked});
 root.traverse(o=>o.geometry?.dispose());
}
fs.writeFileSync(process.argv[2]||'evidence/interior-budget.json',JSON.stringify({renderer:'Node geometry and ray checks; not browser or phone',floors},null,2));
console.log({floors:floors.length,maxBytes:Math.max(...floors.map(f=>f.bytes)),blocked:floors.filter(f=>f.blockedArrivals.length)});
assert.equal(floors.filter(f=>f.blockedArrivals.length).length,0,'guided arrivals must remain clear');
