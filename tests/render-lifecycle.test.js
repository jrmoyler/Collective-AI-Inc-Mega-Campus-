import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import * as T from 'three';
import {createFrameLoop,withRendererState,disposeSceneResources} from '../viewer/campus/render-lifecycle.js';
import {createInterior} from '../viewer/campus/interior.js';
import {FACILITIES} from '../viewer/campus/data.js';

function scheduler(){let id=0;const pending=new Map();return {pending,requestFrame(callback){pending.set(++id,callback);return id;},cancelFrame(key){pending.delete(key);},tick(){const [key,callback]=pending.entries().next().value;pending.delete(key);callback(16);}};}
test('render failure stops scheduling before recovery disposes a renderer',()=>{
 const raf=scheduler(),error=new Error('render target unavailable');let calls=0,recovered=0;
 const loop=createFrameLoop(()=>{calls++;throw error;},{...raf,onError:e=>{assert.equal(e,error);recovered++;}});
 loop.start();loop.start();assert.equal(raf.pending.size,1);raf.tick();
 assert.equal(calls,1);assert.equal(recovered,1);assert.equal(raf.pending.size,0);assert.equal(loop.running,false);
});
test('teardown cancels both queued frames and a frame stopped during its callback',()=>{
 const raf=scheduler();let calls=0;const loop=createFrameLoop(()=>{calls++;loop.stop();},raf);
 loop.start();loop.stop();assert.equal(raf.pending.size,0);assert.equal(calls,0);
 loop.start();raf.tick();assert.equal(calls,1);assert.equal(raf.pending.size,0);
});
test('failed atmosphere compilation restores the screen target and renderer settings',()=>{
 let current=null,face=0,mip=0;
 const renderer={toneMapping:4,autoClear:true,xr:{enabled:true},getRenderTarget:()=>current,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>mip,setRenderTarget(target,cubeFace,mipmap){current=target;face=cubeFace;mip=mipmap;}};
 assert.throws(()=>withRendererState(renderer,()=>{renderer.setRenderTarget({name:'half-created PMREM'},2,3);renderer.toneMapping=0;renderer.autoClear=false;renderer.xr.enabled=false;throw new Error('shader link failed');}),/shader link failed/);
 assert.equal(current,null);assert.equal(face,0);assert.equal(mip,0);assert.equal(renderer.toneMapping,4);assert.equal(renderer.autoClear,true);assert.equal(renderer.xr.enabled,true);
});
test('fallback and discarded asset cleanup release shared geometry, materials and textures once',()=>{
 const root=new T.Scene(),geometry=new T.BoxGeometry(),texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture});
 root.add(new T.Mesh(geometry,material),new T.Mesh(geometry,material));root.environment=texture;
 const counts={geometry:0,material:0,texture:0};for(const [name,resource] of Object.entries({geometry,material,texture}))resource.addEventListener('dispose',()=>counts[name]++);
 const result=disposeSceneResources(root);
 assert.deepEqual(counts,{geometry:1,material:1,texture:1});assert.equal(result.errors.length,0);assert.equal(root.children.length,0);assert.equal(root.environment,null);
});
test('one broken disposal listener cannot block other resources or scene removal',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(),texture=new T.Texture();let materialDisposed=false,textureDisposed=false;
 const material=new T.ShaderMaterial({uniforms:{surface:{value:texture}}});root.add(new T.Mesh(geometry,material));
 geometry.addEventListener('dispose',()=>{throw new Error('consumer cleanup failed');});material.addEventListener('dispose',()=>materialDisposed=true);texture.addEventListener('dispose',()=>textureDisposed=true);
 const result=disposeSceneResources(root);assert.equal(result.errors.length,1);assert.equal(materialDisposed,true);assert.equal(textureDisposed,true);assert.equal(root.children.length,0);
});
function listeners(){const entries=new Map();return {entries,addEventListener(type,callback){if(!entries.has(type))entries.set(type,new Set());entries.get(type).add(callback);},removeEventListener(type,callback){entries.get(type)?.delete(callback);},dispatch(type){for(const callback of entries.get(type)||[])callback({type});},get count(){return [...entries.values()].reduce((n,set)=>n+set.size,0);}};}
function environment(){const windowEvents=listeners(),canvas=listeners();globalThis.window={...windowEvents,setTimeout,clearTimeout};globalThis.document={addEventListener(){},removeEventListener(){},createElement:()=>createCanvas(512,128),hidden:false};globalThis.devicePixelRatio=1;const engine=new NullEngine({renderWidth:800,renderHeight:600});return {windowEvents,canvas,engine};}
test('a floor construction callback failure releases the engine and installed input handlers',()=>{
 const {engine,canvas,windowEvents}=environment();const failure=new Error('floor UI failed');
 assert.throws(()=>createInterior(canvas,FACILITIES[0],{engineOverride:engine,onRoom(){},onFloor(){throw failure;}}),error=>error===failure);
 assert.equal(engine.scenes.length,0);assert.equal(canvas.count,0);assert.equal(windowEvents.count,0);
});
test('a later frame failure disposes the tour once and reports recovery instead of repeating',()=>{
 const {engine,canvas,windowEvents}=environment();let frame,reports=0;engine.runRenderLoop=callback=>{frame=callback;};
 const failure=new Error('frame report failed');
 const interior=createInterior(canvas,FACILITIES[0],{engineOverride:engine,onRoom(){},onFloor(){},onFrame(){throw failure;},onError:error=>{assert.equal(error,failure);reports++;}});
 frame();frame();interior.dispose();assert.equal(reports,1);assert.equal(engine.scenes.length,0);assert.equal(canvas.count,0);assert.equal(windowEvents.count,0);
});
test('losing focus cancels touch movement and residual camera motion',()=>{
 const {engine,canvas,windowEvents}=environment();let frame;engine.runRenderLoop=callback=>{frame=callback;};
 const interior=createInterior(canvas,FACILITIES[0],{engineOverride:engine,onRoom(){},onFloor(){}});
 const camera=engine.scenes[0].activeCamera;interior.hold('forward',true);camera.cameraDirection.set(1,0,1);camera.cameraRotation.set(.1,.2);
 windowEvents.dispatch('blur');assert.equal(camera.cameraDirection.length(),0);assert.equal(camera.cameraRotation.length(),0);
 frame();assert.equal(camera.cameraDirection.length(),0);interior.dispose();
});
test('an invalid floor request leaves the existing valid tour usable',()=>{
 const {engine,canvas}=environment();engine.runRenderLoop=()=>{};
 const interior=createInterior(canvas,FACILITIES[0],{engineOverride:engine,onRoom(){},onFloor(){}});
 const scene=engine.scenes[0];assert.throws(()=>interior.setFloor(999),RangeError);
 assert.equal(engine.scenes[0],scene);assert.equal(scene.isDisposed,false);interior.dispose();
});

test('interior context loss stops frame evidence and movement until a restored frame renders',()=>{
 const {engine,canvas}=environment();let frame;const events=[];let frames=0;
 engine.runRenderLoop=callback=>{frame=callback;};
 const interior=createInterior(canvas,FACILITIES[0],{engineOverride:engine,onRoom(){},onFloor(){},onFrame(){frames++;},onLifecycle:(type,detail)=>events.push({type,...detail})});
 frame();assert.equal(frames,1);assert.ok(events.some(e=>e.type==='floor-first-frame'));
 interior.hold('forward',true);engine.onContextLostObservable.notifyObservers(engine);frame();assert.equal(frames,1);assert.equal(events.at(-1).type,'interior-context-lost');
 engine.onContextRestoredObservable.notifyObservers(engine);assert.equal(events.at(-1).type,'interior-context-lost','restore notification alone is not a rendered frame');
 frame();assert.equal(frames,2);assert.equal(events.at(-1).type,'interior-context-restored');
 assert.equal(engine.scenes[0].activeCamera.cameraDirection.length(),0);interior.dispose();
 assert.equal(engine.onContextLostObservable.hasObservers(),false);assert.equal(engine.onContextRestoredObservable.hasObservers(),false);
});
