import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {shoreRadius,outerTerrainHeight,createLandscape,TREE_SPECIES} from '../viewer/campus/landscape.js';
import {speciesTemplates,foliageAtlas,botanicalMaterial} from '../viewer/campus/botanical.js';
import {LAKES,SITE,FACILITIES} from '../viewer/campus/data.js';

test('individual shorelines close and stay inside canonical planting clearance envelopes',()=>{
 const profiles=LAKES.map((_,index)=>Array.from({length:128},(_,i)=>shoreRadius(index,i*Math.PI/64)));
 assert.equal(new Set(profiles.map(p=>p.map(n=>n.toFixed(6)).join(','))).size,LAKES.length);
 for(const [i,profile] of profiles.entries()){
  assert.ok(Math.abs(shoreRadius(i,0)-shoreRadius(i,Math.PI*2))<1e-12);
  assert.ok(profile.every(r=>Number.isFinite(r)&&r>=.81-1e-12&&r<=1.01+1e-12));
 }
});
test('expanded terrain preserves level campus foundations',()=>{
 for(let x=-SITE.width/2;x<=SITE.width/2;x+=50)for(let z=-SITE.depth/2;z<=SITE.depth/2;z+=50){
  if(Math.hypot(x/(SITE.width*.52),z/(SITE.depth*.52))<=1.4)assert.equal(outerTerrainHeight(x,z),0);
 }
});

const landscape=createLandscape();
const meshes=[];landscape.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
const byName=name=>meshes.filter(m=>m.name===name);

test('trees are instanced species with real branching wood, not per-tree meshes',()=>{
 const canopies=meshes.filter(m=>m.isInstancedMesh&&/-canopy$/.test(m.name));
 const species=new Set(canopies.map(m=>m.name.replace(/(Lite)?-canopy$/,'')));
 for(const s of ['oak','lime','cherry','column','conifer'])assert.ok(species.has(s),`missing ${s}`);
 assert.equal(canopies.reduce((n,m)=>n+m.count,0),landscape.treeCount);
 assert.ok(landscape.treeCount>=3000,'dense layered canopy');
 assert.ok(meshes.length<80,'landscape stays a small number of draw calls');
 const tpl=speciesTemplates();
 for(const name of ['oak','lime','cherry','column','conifer']){
  assert.ok(tpl[name].wood.index.count/3>100,`${name} has branching limbs`);
  assert.ok(tpl[name].leaves.attributes.position.count/6>=40,`${name} has leaf clusters`);
  const box=new T.Box3().setFromBufferAttribute(tpl[name].leaves.attributes.position);
  assert.ok(box.max.y<=1.1&&box.min.y>-.05,`${name} canopy normalised to unit height`);
 }
 // Leaf cards are alpha-tested atlas cutouts with wind in the vertex stage.
 const material=botanicalMaterial('oak',{value:0});
 assert.ok(material.alphaTest>0&&material.map===foliageAtlas());
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 material.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/botanicalTime/);
 const atlas=foliageAtlas().image.data;let opaque=0;for(let i=3;i<atlas.length;i+=4)if(atlas[i])opaque++;
 const coverage=opaque/(atlas.length/4);assert.ok(coverage>.2&&coverage<.85,`atlas coverage ${coverage}`);
});

test('tree heights are physically scaled and plantings respect water, roads and facades',()=>{
 for(const t of landscape.trees){
  const [lo,hi]=TREE_SPECIES[t.species].height;
  assert.ok(t.height>=lo&&t.height<=hi&&lo>=8&&hi<=20,`${t.species} ${t.height}`);
  for(const f of FACILITIES)assert.ok(!(Math.abs(t.x-f.x)<f.w/2+1&&Math.abs(t.z-f.z)<f.d/2+1),'tree inside facility');
  for(const [i,[lx,lz,rx,rz]] of LAKES.entries()){
   const a=Math.atan2(-(t.z-lz)/rz,(t.x-lx)/rx),r=shoreRadius(i,a);
   assert.ok(((t.x-lx)/(rx*r+1))**2+((t.z-lz)/(rz*r+1))**2>=1,'tree in pond');
  }
 }
 for(const road of landscape.roads)for(let i=0;i<=200;i++){
  const p=road.curve.getPoint(i/200);
  for(const t of landscape.trees)if(Math.abs(t.x-p.x)<road.width&&Math.abs(t.z-p.z)<road.width)assert.ok(Math.hypot(t.x-p.x,t.z-p.z)>road.width/2+3,'trunk on carriageway');
 }
});

test('water is flat, depth-tinted and shaded with ripples and fresnel sky reflection',()=>{
 const [lake]=byName('lake');
 const pos=lake.geometry.attributes.position,depth=lake.geometry.attributes.waterDepth;
 let minY=Infinity,maxY=-Infinity,minD=Infinity,maxD=-Infinity;
 for(let i=0;i<pos.count;i++){minY=Math.min(minY,pos.getY(i));maxY=Math.max(maxY,pos.getY(i));minD=Math.min(minD,depth.getX(i));maxD=Math.max(maxD,depth.getX(i));}
 assert.ok(maxY-minY<1e-6,'no vertex displacement lifting water into the coping');
 assert.ok(minD<.05&&maxD>.95,'depth ramps from shoreline to centre');
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 lake.material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/varying vec3 waterWorld;/);
 assert.match(shader.fragmentShader,/uRipple/);
 assert.match(shader.fragmentShader,/wF=\.02\+\.98\*pow/);
 assert.ok(shader.uniforms.uRipple.value.isTexture);
 for(const name of ['pond-coping','pond-rocks','pond-reeds','fountain-spray','fountain-foam','water-channels'])assert.equal(byName(name).length,1,name);
});

test('ground and streets carry material variation, markings, kerbs and pavers',()=>{
 for(const name of ['forest-floor','campus-lawn']){
  const [m]=byName(name);const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
  m.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/lsFbm/);assert.ok(shader.uniforms.uSite.value.isTexture);
 }
 const asphalt=byName('asphalt');assert.equal(asphalt.length,landscape.roads.length);
 for(const m of asphalt)assert.ok(m.geometry.attributes.junction,'junction flags suppress markings at crossings');
 assert.equal(byName('curbs').length,1);assert.equal(byName('walk').length,1);
 assert.deepEqual(landscape.roads[0].curve.points[0].toArray(),[-462,.22,-345]);
 assert.ok(byName('shrubs')[0].count>1000);
});
