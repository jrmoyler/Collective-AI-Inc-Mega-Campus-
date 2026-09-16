import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {FACILITIES} from '../viewer/campus/data.js';
import {createFacility} from '../viewer/campus/buildings.js';
globalThis.document={createElement:()=>createCanvas(512,96)};
test('all 35 exterior assemblies merge successfully, have finite geometry and retain picking IDs',()=>{for(const f of FACILITIES){const root=createFacility(f);assert.equal(root.userData.facility,f.id);assert.ok(root.children.length>1);root.traverse(o=>{if(o.isMesh){assert.ok(o.geometry);assert.equal(o.userData.facility,f.id);for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value),f.key);o.geometry.dispose();}});}});
