import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStreetFurniture,FURNITURE_RANGE} from '../viewer/campus/street-furniture.js';
import {FACILITIES} from '../viewer/campus/data.js';

test('shipped Blender furnishings load with finite transforms and cull during aerial views',async()=>{
 const bytes=fs.readFileSync('public/models/campus-street-furniture.glb');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=createStreetFurniture(gltf.scene);
 // 13 Blender part batches plus procedural luminaires, wayfinding, bins and planting.
 assert.ok(group.children.length>=13+4&&group.children.length<=40,`bounded batches (${group.children.length})`);
 assert.ok(group.children.every(m=>m.isInstancedMesh));
 const n=FACILITIES.length;
 assert.deepEqual(group.userData.placements,{Bench:n,Bollard:2*n,Planter:2*n,Planting:2*n,Wayfinding:n,Luminaire:2*n,Bin:n});
 group.userData.update(new T.Vector3(40,720,980));
 assert.ok(group.children.every(m=>!m.visible&&m.count===0));
 const eye=new T.Vector3(0,5,-280);group.userData.update(eye);
 assert.ok(group.children.some(m=>m.visible&&m.count>0));
 const near=FACILITIES.filter(f=>Math.hypot(f.x-eye.x,f.z+f.d/2+4.2-eye.z)<FURNITURE_RANGE+30).length;
 assert.ok(group.children.every(m=>m.count<=near*2),'only nearby furnishings are submitted');
 const matrix=new T.Matrix4(),p=new T.Vector3();
 for(const mesh of group.children)for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));
  p.setFromMatrixPosition(matrix);assert.ok(p.distanceTo(eye)<FURNITURE_RANGE+6);
 }
 // Blender flat colours are upgraded to textured physical surfaces.
 const slat=group.children.find(m=>m.material.name.startsWith('Oiled ash'));
 assert.ok(slat.material.map&&slat.geometry.attributes.uv,'wood carries grain on metric UVs');
 const concrete=group.children.find(m=>m.material.name==='Warm sand precast concrete');
 assert.ok(concrete.material.map&&concrete.geometry.attributes.uv,'precast concrete has aggregate texture');
 const lamp=group.children.find(m=>m.material.name==='Luminaire opal diffuser');
 const day=lamp.material.emissiveIntensity;group.userData.setDusk(true);assert.ok(lamp.material.emissiveIntensity>day);group.userData.setDusk(false);
 gltf.scene.traverse(o=>o.geometry?.dispose());
});
