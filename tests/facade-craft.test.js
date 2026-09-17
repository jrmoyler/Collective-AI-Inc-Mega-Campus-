import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {Batch} from '../viewer/campus/geometry.js';

test('thin facade glazing preserves horizontal and vertical panel extents without doubled tint surfaces',()=>{
 for(const [dimensions,expected] of [[[4,3,.05],[4,3,0]],[[.05,3,4],[0,3,4]],[[4,.05,6],[4,0,6]]]){
  const b=new Batch();b.box('glazing',2,5,8,...dimensions);const root=b.finish(),box=new Box3().setFromObject(root),size=box.getSize(new Vector3());
  size.toArray().forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-5));assert.deepEqual(box.getCenter(new Vector3()).toArray(),[2,5,8]);
  assert.equal(root.children[0].geometry.index.count,6);root.traverse(o=>o.geometry?.dispose());
 }
 const b=new Batch();b.box('glazing',0,0,0,2,3,4);const root=b.finish();assert.equal(root.children[0].geometry.index.count,36,'volumetric cases keep their shape');root.traverse(o=>o.geometry?.dispose());
});
