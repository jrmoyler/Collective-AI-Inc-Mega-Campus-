import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITIES} from '../viewer/campus/data.js';
import {createFacility01to12} from '../viewer/campus/facilities-01-12.js';

test('individual atlas shells 01–12 are bounded local assemblies with complete picking IDs',()=>{
 let total=0;const signatures=new Set();
 for(const f of FACILITIES.slice(0,12)){
  const root=createFacility01to12(f);let triangles=0;
  assert.deepEqual(root.position.toArray(),[0,0,0],`${f.key} should be positioned by the campus assembler`);
  assert.equal(root.userData.facility,f.id);
  root.traverse(o=>{assert.equal(o.userData.facility,f.id);if(!o.isMesh)return;
   for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value),`${f.key} nonfinite vertex`);
   o.geometry.computeBoundingBox();const box=o.geometry.boundingBox;
   assert.ok(box.min.y>=-.05,`${f.key} geometry unexpectedly below campus surface`);
   assert.ok(box.max.y<f.h*1.15+5,`${f.key} exceeds reference envelope`);
   triangles+=o.geometry.index.count/3;
  });
  assert.ok(triangles>1000&&triangles<160000,`${f.key} geometry budget: ${triangles}`);
  signatures.add(triangles+':'+root.children.length);total+=triangles;
  root.traverse(o=>o.geometry?.dispose());
 }
 assert.equal(signatures.size,12,'all twelve architectures must remain independently distinguishable');
 assert.ok(total<400000,`Combined shell budget: ${total}`);
 assert.equal(createFacility01to12(FACILITIES[12]),null);
});
