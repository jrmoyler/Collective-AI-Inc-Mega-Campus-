import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {FACILITIES,floorLayout} from '../viewer/campus/data.js';
import {routeToRoom} from '../viewer/campus/floor-topology.js';
import {filletRoute,pathSampler,walkProfile,planFlight,roomFocus,wrapAngle,simplifyRoute} from '../viewer/campus/interior-camera.js';
import {createInterior} from '../viewer/campus/interior.js';

test('fillets round orthogonal corners without leaving the corner neighbourhood',()=>{
 const pts=filletRoute([[0,0],[0,5],[5,5]],.9);
 assert.deepEqual(pts[0],[0,0]);assert.deepEqual(pts.at(-1),[5,5]);
 for(const [x,z] of pts)assert.ok(x>=-1e-9&&x<=5&&z>=0&&z<=5+1e-9);
 // The curve passes inside the corner but never further than the fillet allows.
 const nearest=Math.min(...pts.map(([x,z])=>Math.hypot(x,z-5)));assert.ok(nearest>.2&&nearest<.9);
 assert.equal(simplifyRoute([[0,0],[0,0],[0,1],[0,2]]).length,2,'duplicates and collinear points collapse');
});

test('walking profile accelerates, cruises at a human pace and stops exactly at the end',()=>{
 const p=walkProfile(20,{speed:1.45,accel:1.1});
 assert.equal(p.distance(0),0);assert.ok(Math.abs(p.distance(p.duration)-20)<1e-9);
 let prev=0,maxStep=0;for(let t=0;t<=p.duration;t+=1/60){const d=p.distance(t);assert.ok(d>=prev-1e-9);maxStep=Math.max(maxStep,d-prev);prev=d;}
 assert.ok(maxStep*60<=1.46,'never faster than the walking pace');
 const short=walkProfile(.5);assert.ok(short.duration>0&&Math.abs(short.distance(short.duration)-.5)<1e-9);
 assert.equal(walkProfile(0).duration,0);
});

test('room flights start from the current gaze, move smoothly and settle on the room',()=>{
 for(const f of [FACILITIES[0],FACILITIES[6],FACILITIES[12]]){
  const layout=floorLayout(f,0),start=[layout.entry[0],layout.entry[1]];
  layout.rooms.forEach((room,i)=>{
   const route=routeToRoom(layout,start,i);
   const plan=planFlight({from:start,yaw:1.2,pitch:0,route,focus:roomFocus(room,route.at(-1))});
   const first=plan.sample(0);assert.ok(Math.abs(wrapAngle(first.yaw-1.2))<1e-6,'no gaze snap at departure');
   let last=first,maxTurn=0,maxMove=0;
   for(let t=1/60;t<=plan.duration+1e-9;t+=1/60){const s=plan.sample(t);maxTurn=Math.max(maxTurn,Math.abs(wrapAngle(s.yaw-last.yaw)));maxMove=Math.max(maxMove,Math.hypot(s.x-last.x,s.z-last.z));last=s;}
   assert.ok(maxTurn<.12,`${f.key} room ${i+1}: gaze turns smoothly (${maxTurn.toFixed(3)} rad/frame)`);
   assert.ok(maxMove<.035,`${f.key} room ${i+1}: no positional jumps`);
   const end=plan.sample(plan.duration);assert.ok(end.done);
   const target=route.at(-1);assert.ok(Math.hypot(end.x-target[0],end.z-target[1])<1e-6,'stops at the room stop');
   assert.ok(Math.abs(wrapAngle(end.yaw-plan.final.yaw))<1e-6,'arrival gaze composed on the room');
  });
 }
});

test('path sampler is arc-length parametrised',()=>{
 const s=pathSampler([[0,0],[3,0],[3,4]]);assert.equal(s.total,7);assert.deepEqual(s.at(5),[3,2]);assert.deepEqual(s.at(99),[3,4]);
});

function environment(){
 const listeners=new Map();const win={addEventListener(t,c){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(c);},removeEventListener(t,c){listeners.get(t)?.delete(c);},setTimeout,clearTimeout};
 globalThis.window=win;globalThis.document={addEventListener(){},removeEventListener(){},createElement:()=>createCanvas(512,128),hidden:false};globalThis.devicePixelRatio=1;
 const engine=new NullEngine({renderWidth:800,renderHeight:600});let frame;engine.runRenderLoop=cb=>{frame=cb;};engine.getDeltaTime=()=>16;
 const dispatch=(t,e)=>{for(const c of listeners.get(t)||[])c(e);};
 return {engine,frame:()=>frame(),dispatch,count:()=>[...listeners.values()].reduce((n,s)=>n+s.size,0)};
}

test('reduced motion visits jump straight to the composed room view',()=>{
 const env=environment();const rooms=[];const canvas={addEventListener(){},removeEventListener(){}};
 const interior=createInterior(canvas,FACILITIES[6],{engineOverride:env.engine,reduced:true,onRoom:n=>rooms.push(n),onFloor(){}});
 const layout=floorLayout(FACILITIES[6],0);interior.visit(2);
 assert.equal(rooms.at(-1),layout.rooms[2].name);
 const cam=interior.getCamera(),stop=routeToRoom(layout,[layout.entry[0],layout.entry[1]],2).at(-1);
 assert.ok(Math.hypot(cam.position.x-stop[0],cam.position.z-stop[1])<.01);
 interior.dispose();assert.equal(env.count(),0,'keyboard listeners removed');
});

test('animated visits advance per frame and keyboard turning eases the view left and right',()=>{
 const env=environment();const rooms=[];const canvas={addEventListener(){},removeEventListener(){}};
 const interior=createInterior(canvas,FACILITIES[6],{engineOverride:env.engine,onRoom:n=>rooms.push(n),onFloor(){}});
 const cam=interior.getCamera(),x0=cam.position.x,z0=cam.position.z;
 interior.visit(1);env.frame();env.frame();
 assert.ok(Math.hypot(cam.position.x-x0,cam.position.z-z0)>0,'flight moves the visitor');
 assert.notEqual(rooms.at(-1),FACILITIES[6].rooms?.[1]);
 const before=cam.getDirection(new (cam.position.constructor)(0,0,-1));
 env.dispatch('keydown',{key:'q',target:{}});for(let i=0;i<20;i++)env.frame();env.dispatch('keyup',{key:'q',target:{}});
 const after=cam.getDirection(new (cam.position.constructor)(0,0,-1));
 const cross=before.x*after.z-before.z*after.x;assert.ok(cross<-1e-3,'Q turns the view to the left (counter-clockwise about +Y)');
 env.dispatch('keydown',{key:'q',target:{tagName:'SELECT'}});for(let i=0;i<5;i++)env.frame();
 interior.dispose();assert.equal(env.count(),0);
});
