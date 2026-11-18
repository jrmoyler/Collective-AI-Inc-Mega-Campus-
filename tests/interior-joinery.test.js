import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {FACILITIES} from '../viewer/campus/data.js';
import {InteriorKit} from '../viewer/campus/interior-kit.js';
import {slidingDoor,ceilingReveal,rearCove,slatWall} from '../viewer/campus/interior-joinery.js';
import {createInteriorGeometry} from '../viewer/campus/interior-architecture.js';
import {interiorPostEffects} from '../viewer/campus/interior-lighting.js';

const bounds=k=>k.parts.map(m=>{m.updateMatrix();if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();return new T.Box3().copy(m.geometry.boundingBox).applyMatrix4(m.matrix);});

test('sliding leaves park beside the opening on the room side and never cross the doorway',()=>{
 const k=new InteriorKit('architecture room 1');const dl=-.9,dr=.9,right=3;
 const door=slidingDoor(k,{dl,dr,right});assert.ok(door);
 for(const [i,b] of bounds(k).entries()){
  const name=k.parts[i].name;
  if(name==='sliding door top track')continue;
  assert.ok(b.min.z>.05,`${name} stays on the room side of the partition`);
  assert.ok(b.min.x>=dr-.05,`${name} leaves the opening clear`);
  assert.ok(b.max.x<=right,`${name} stays within the wall bay`);
 }
 assert.equal(slidingDoor(new InteriorKit('x'),{dl,dr,right:dr+.5}),null,'no leaf where the bay cannot hold one');
 const solid=new InteriorKit('x');slidingDoor(solid,{dl,dr,right,solid:true});assert.ok(solid.parts.some(p=>p.material.name==='oak'));
});

test('slat walls, coves and reveals stay inside the room envelope',()=>{
 const r={w:6,d:7,h:3.6},k=new InteriorKit('architecture room 2');
 const count=slatWall(k,r);rearCove(k,r);ceilingReveal(k,r);
 assert.ok(count>=8&&count<=60);
 for(const b of bounds(k)){assert.ok(b.max.z<=r.d-.06&&b.min.x>=-r.w/2&&b.max.x<=r.w/2&&b.max.y<=r.h&&b.min.y>=.15);}
});

test('every floor gains joinery while technical and studio rooms keep their acoustic envelopes',()=>{
 let doors=0,slats=0;
 for(const f of [FACILITIES[0],FACILITIES[6],FACILITIES[12],FACILITIES[4]]){
  const {root}=createInteriorGeometry(f,0);
  for(const shell of root.children.filter(g=>g.name.startsWith('architecture room '))){
   const parts=shell.children.flatMap(m=>m.userData.components||[]);
   if(parts.includes('sliding door top track'))doors++;
   if(parts.includes('acoustic timber slat'))slats++;
  }
  root.traverse(o=>o.geometry?.dispose());
 }
 assert.ok(doors>=18,'most rooms show a parked sliding leaf');assert.ok(slats>=4,'enclosed rooms gain slat walls');
});

test('screen-space occlusion and reflections are reserved for high quality on desktop WebGL2',()=>{
 assert.deepEqual([interiorPostEffects('balanced').ssao,interiorPostEffects('balanced').ssr],[false,false]);
 assert.deepEqual([interiorPostEffects('high').ssao,interiorPostEffects('high').ssr],[true,true]);
 assert.equal(interiorPostEffects('high',{mobile:true}).ssao,false);
 assert.equal(interiorPostEffects('high',{webgl2:false}).ssr,false);
 assert.equal(interiorPostEffects('high',{webgl2:false}).samples,1);
});
