import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {Box3} from 'three';
globalThis.document={createElement:()=>createCanvas(512,96)};
const {FACILITIES}=await import('../viewer/campus/data.js');
const {createFacility}=await import('../viewer/campus/buildings.js');
const {roofHeightField,plantCompound,ROOF_CELL}=await import('../viewer/campus/arch-roofscape.js');
const {ROOF_PLAN}=await import('../viewer/campus/arch-roof-plan.js');
const {Batch}=await import('../viewer/campus/geometry.js');

test('roof plant compounds stay on free, exposed roof deck inside each canonical footprint',()=>{
 assert.ok(Object.keys(ROOF_PLAN).length>=25,'most occupied roofs carry plant');
 for(const f of FACILITIES){
  const plan=ROOF_PLAN[f.key];if(!plan)continue;
  // Planned against the eager envelope: approach detail must not land in a compound either.
  const root=createFacility(f);root.position.set(0,0,0);root.traverse(o=>{if(o.name.endsWith('-roof-plant'))o.visible=false;});
  for(const roof of plan){
   assert.ok(Math.abs(roof.x)+roof.width/2<=f.w/2+1&&Math.abs(roof.z)+roof.depth/2<=f.d/2+1,`${f.key} plant stays inside its footprint`);
   assert.ok(roof.y>=8,`${f.key} plant sits on an occupied roof, not a canopy`);
   const b=new Batch();assert.ok(plantCompound(b,roof));const plant=b.finish();const box=new Box3().setFromObject(plant);
   assert.ok(box.min.y>=roof.y-.01&&box.max.y<=roof.y+4,`${f.key} plant rests on its deck`);
   assert.ok(box.min.x>=roof.x-roof.width/2+ROOF_CELL-.01&&box.max.x<=roof.x+roof.width/2-ROOF_CELL+.01,`${f.key} plant is inset from free-deck edges`);
   assert.ok(box.min.z>=roof.z-roof.depth/2+ROOF_CELL-.01&&box.max.z<=roof.z+roof.depth/2-ROOF_CELL+.01);
   plant.traverse(o=>o.geometry?.dispose());
  }
  root.traverse(o=>o.geometry?.dispose());
 }
});

test('the roofscape merges into existing finish meshes and adds no campus draw calls',()=>{
 for(const f of FACILITIES.filter(f=>ROOF_PLAN[f.key]).slice(0,6)){
  const root=createFacility(f,{deferDetails:true});let meshes=0;
  root.traverse(o=>{if(o.isMesh){meshes++;assert.equal(o.userData.facility,f.id);}});
  assert.ok(root.userData.roofPlant.placed>=1);
  assert.equal(root.getObjectByName(f.key+'-roof-plant'),undefined,`${f.key} plant was absorbed into finish meshes`);
  assert.ok(meshes<=21,`${f.key} keeps its campus mesh budget`);
  root.traverse(o=>o.geometry?.dispose());
 }
});

test('the height field rejects decks with anything rising inside a cell',()=>{
 const b=new Batch();b.box('dark',0,10,0,20,.3,20);b.box('steel',4,11,4,.1,2,.1);const root=b.finish();
 const field=roofHeightField(root);
 const at=(x,z)=>{const i=Math.floor((x-field.x0)/field.cell),j=Math.floor((z-field.z0)/field.cell),k=j*field.nx+i;return field.ok[k]&&field.ceiling[k]-field.top[k]<.06;};
 assert.ok(at(-5,-5),'open deck is free');assert.ok(!at(4,4),'a post occupies its cell');
});
