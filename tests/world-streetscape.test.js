import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLandscape} from '../viewer/campus/landscape.js';
import {STREETSCAPE_LIMITS} from '../viewer/campus/world-streetscape.js';
import {GROUNDCOVER_RANGE,GROUNDCOVER_KINDS,groundcoverMaterial,clumpGeometry} from '../viewer/campus/world-groundcover.js';
import {FACILITIES,LAKES} from '../viewer/campus/data.js';
import {shoreRadius} from '../viewer/campus/landscape.js';

const landscape=createLandscape();
const meshes=[];landscape.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
const byName=name=>meshes.filter(m=>m.name===name);
const compile=material=>{const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);return shader;};

test('roads carry no additive glow halos beyond the embedded guidance strip',()=>{
 assert.equal(meshes.filter(m=>/halo/.test(m.name)).length,0);
 for(const m of meshes){
  if(/kinetic|gold-ring/.test(m.name))continue;
  assert.notEqual(m.material.blending,T.AdditiveBlending,`${m.name} must not add light to the road`);
 }
});

test('every junction approach has instanced crossings, stop bars, tactile paving and drainage',()=>{
 const counts=landscape.streetscape;
 assert.ok(counts.crossingStripe>=300,'zebra stripes across junction approaches');
 assert.ok(counts.stopBar>=30&&counts.tactile>=2*30,'stop bars and paired tactile pads');
 assert.ok(counts.gully>=300&&counts.cover>=40,'kerb gullies and access covers');
 for(const [k,limit] of Object.entries(STREETSCAPE_LIMITS))assert.ok(counts[k]<=limit,`${k} bounded`);
 for(const name of ['zebra-crossings','stop-bars','tactile-paving','gully-grates','access-covers']){
  const [mesh]=byName(name);assert.ok(mesh?.isInstancedMesh,`${name} instanced`);
  assert.ok(!mesh.material.emissive||mesh.material.emissive.getHex()===0,`${name} does not glow`);
  // Markings sit on (not inside, not floating above) the 0.16 m asphalt or 0.28 m footway.
  const m=new T.Matrix4(),p=new T.Vector3();
  for(let i=0;i<mesh.count;i+=7){mesh.getMatrixAt(i,m);p.setFromMatrixPosition(m);assert.ok(p.y>.16&&p.y<.3,`${name} height ${p.y}`);
   for(const f of FACILITIES)assert.ok(!(Math.abs(p.x-f.x)<f.w/2-1&&Math.abs(p.z-f.z)<f.d/2-1),`${name} inside a facility`);}
 }
 assert.ok(meshes.length<80,'streetscape stays within the landscape draw budget');
});

test('groundcover is one wind-swayed, range-faded instanced layer that is empty from the aerial',()=>{
 const gc=landscape.groundcover;
 assert.ok(gc.count>8000&&gc.count<=40000,`clump population ${gc.count}`);
 assert.equal(byName('groundcover').length,1);
 const shader=compile(groundcoverMaterial({value:0}));
 assert.match(shader.vertexShader,/groundTime/);assert.match(shader.vertexShader,/groundRange/);
 assert.ok(clumpGeometry().index.count/3===6,'three crossed cards, not camera-facing billboards');
 assert.equal(gc.update(new T.Vector3(40,680,920)),0,'aerial draws no groundcover');
 const near=gc.update(new T.Vector3(-100,5,-30));
 assert.ok(near>500&&near<gc.count/2,`ground view keeps a bounded neighbourhood (${near})`);
 // Compacted instances lie within range, outside ponds and off the carriageway.
 const m=new T.Matrix4(),p=new T.Vector3(),kinds=new Set();
 const cell=gc.mesh.geometry.attributes.cell;
 for(let i=0;i<near;i++){
  gc.mesh.getMatrixAt(i,m);p.setFromMatrixPosition(m);kinds.add(cell.getX(i));
  assert.ok(Math.hypot(p.x+100,p.z+30)<=GROUNDCOVER_RANGE+1);
  for(const [li,[lx,lz,rx,rz]] of LAKES.entries()){const a=Math.atan2(-(p.z-lz)/rz,(p.x-lx)/rx),r=shoreRadius(li,a);assert.ok(((p.x-lx)/(rx*r+1))**2+((p.z-lz)/(rz*r+1))**2>=1,'clump in pond');}
 }
 assert.ok(kinds.size>=3,'mixed grasses, ferns and flowering perennials');
 assert.ok([...kinds].every(k=>Object.values(GROUNDCOVER_KINDS).includes(k)));
});

test('pond shoreline lapping band is diffuse, not emissive',()=>{
 const [lake]=byName('lake');const shader=compile(lake.material);
 assert.match(shader.fragmentShader,/wShore/);
 assert.ok(!lake.material.emissive||lake.material.emissive.getHex()===0);
});
