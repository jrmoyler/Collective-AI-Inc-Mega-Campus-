import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {FACILITIES} from '../viewer/campus/data.js';
import {createInterior} from '../viewer/campus/interior.js';
globalThis.devicePixelRatio=1;
globalThis.window={addEventListener(){},removeEventListener(){},setTimeout,clearTimeout};
globalThis.document={addEventListener(){},removeEventListener(){},createElement:()=>createCanvas(512,128)};
test('all 74 Babylon floor scenes construct and dispose without missing registrations',()=>{let floors=0;for(const f of FACILITIES){const engine=new NullEngine({renderWidth:800,renderHeight:600});const canvas={addEventListener(){},removeEventListener(){}};const interior=createInterior(canvas,f,{engineOverride:engine,reduced:true,onRoom(){},onFloor(l,rooms){assert.equal(rooms.length,6);floors++;
 let bytes=0;
 for(const mesh of engine.scenes.at(-1).meshes.filter(m=>m.metadata?.components)){
  for(const kind of ['position','normal','uv']){const data=mesh.getVerticesData(kind);assert.ok(ArrayBuffer.isView(data),'typed geometry transfer');bytes+=data.byteLength;}
  const indices=mesh.getIndices();assert.ok(ArrayBuffer.isView(indices),'typed index transfer');bytes+=indices.byteLength;
 }
 assert.ok(bytes<96*1024*1024,f.key+' exceeds 96 MiB floor geometry budget');
}});engine.stopRenderLoop();for(let l=1;l<f.levels;l++)interior.setFloor(l);interior.dispose();assert.equal(engine.scenes.length,0);}assert.equal(floors,74);});
