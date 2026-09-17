import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStreetFurniture} from '../viewer/campus/street-furniture.js';

test('shipped Blender furnishings load with finite transforms and cull during aerial views',async()=>{
 const bytes=fs.readFileSync('public/models/campus-street-furniture.glb');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=createStreetFurniture(gltf.scene);
 assert.equal(group.children.length,13);
 group.userData.update(new T.Vector3(40,720,980));
 assert.ok(group.children.every(m=>!m.visible&&m.count===0));
 group.userData.update(new T.Vector3(0,5,-280));
 assert.ok(group.children.some(m=>m.visible&&m.count>0));
 assert.ok(group.children.every(m=>m.count<35));
 const matrix=new T.Matrix4();
 for(const mesh of group.children)for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));
 }
 gltf.scene.traverse(o=>o.geometry?.dispose());
});
