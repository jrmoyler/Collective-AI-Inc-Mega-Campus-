import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshStandardMaterial,ShaderLib} from 'three';
import {architecturalGlass,occupancyVariance,occupancyFactor,archPatchesOf,OCCUPANCY_STATES} from '../viewer/campus/arch-materials.js';
import {materials} from '../viewer/campus/geometry.js';

const compile=material=>{const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader,null);return shader;};

test('architectural glass is a non-emissive dielectric whose reflection is not attenuated by opacity',()=>{
 const glass=architecturalGlass(new MeshStandardMaterial({transparent:true,opacity:.3,metalness:.5,emissive:0x224466}));
 assert.equal(glass.metalness,0);assert.ok(glass.roughness<=.06);
 assert.deepEqual(glass.emissive.toArray(),[0,0,0],'glass never emits light');
 const shader=compile(glass);
 assert.match(shader.fragmentShader,/indirectSpecular \* archReflectance/);
 assert.match(shader.fragmentShader,/totalDiffuse \* archBody \+ totalSpecular/,'specular is added over the transmitted body');
 assert.ok(shader.uniforms.archReflectance.value>1);
 assert.notEqual(glass.customProgramCacheKey(),new MeshStandardMaterial().customProgramCacheKey());
 // Patching is idempotent and tracked per material identity, so clones are patched on their own.
 assert.equal(architecturalGlass(glass),glass);assert.deepEqual(archPatchesOf(glass),['glass']);
 assert.deepEqual(archPatchesOf(glass.clone()),[]);
 for(const shared of [materials.glazing,materials.blueGlass]){assert.ok(archPatchesOf(shared).includes('glass'));assert.equal(shared.metalness,0);}
});

test('occupancy variance gives interior washes per-room dusk states without touching geometry',()=>{
 const wash=occupancyVariance(new MeshStandardMaterial({emissive:0xffaa55}));
 const shader=compile(wash);
 assert.match(shader.vertexShader,/archWorld = \( modelMatrix \* archP \)\.xyz/);
 assert.match(shader.fragmentShader,/totalEmissiveRadiance \*= archLevel/);
 assert.deepEqual(archPatchesOf(wash),['occupancy']);
 const counts=new Map();
 for(let i=0;i<6000;i++){const level=occupancyFactor(i*3.3,(i%9)*4.2,i*1.7);counts.set(level,(counts.get(level)||0)+1);}
 assert.equal(counts.size,OCCUPANCY_STATES.length,'dark, dimmed, lit and task-bright rooms all occur');
 const dark=counts.get(OCCUPANCY_STATES[0][1])/6000;assert.ok(dark>.08&&dark<.25,'a minority of rooms are unoccupied');
 // Coplanar points inside one 6.4 m x 4.2 m cell share a single room state.
 assert.equal(occupancyFactor(1,1,1),occupancyFactor(5.9,3.9,1.2));
});
