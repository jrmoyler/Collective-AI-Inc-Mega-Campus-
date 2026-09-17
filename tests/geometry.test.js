import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {FACILITIES} from '../viewer/campus/data.js';
import {createFacility} from '../viewer/campus/buildings.js';
globalThis.document={createElement:()=>createCanvas(512,96)};
test('all 35 exterior assemblies merge successfully, have finite geometry and retain picking IDs',()=>{const shapes=new Set();for(const f of FACILITIES){const root=createFacility(f);assert.equal(root.userData.facility,f.id);assert.ok(root.children.length>1);assert.deepEqual(root.position.toArray(),[f.x,0,f.z]);const hash=createHash('sha256');let triangles=0;root.traverse(o=>{if(o.isMesh){assert.ok(o.geometry);assert.equal(o.userData.facility,f.id);for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value),f.key);if(!o.material.isMeshBasicMaterial){hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}o.geometry.dispose();}});assert.ok(triangles<180000,f.key+' exterior triangle budget');const shape=hash.digest('hex');assert.ok(!shapes.has(shape),f.key+' duplicate architecture');shapes.add(shape);}assert.equal(shapes.size,35);});
