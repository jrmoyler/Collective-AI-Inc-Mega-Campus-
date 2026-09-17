import test from 'node:test';
import assert from 'node:assert/strict';
import {shoreRadius,outerTerrainHeight} from '../viewer/campus/landscape.js';
import {LAKES,SITE} from '../viewer/campus/data.js';

test('individual shorelines close and stay inside canonical planting clearance envelopes',()=>{
 const profiles=LAKES.map((_,index)=>Array.from({length:128},(_,i)=>shoreRadius(index,i*Math.PI/64)));
 assert.equal(new Set(profiles.map(p=>p.map(n=>n.toFixed(6)).join(','))).size,LAKES.length);
 for(const [i,profile] of profiles.entries()){
  assert.ok(Math.abs(shoreRadius(i,0)-shoreRadius(i,Math.PI*2))<1e-12);
  assert.ok(profile.every(r=>Number.isFinite(r)&&r>=.81-1e-12&&r<=1.01+1e-12));
 }
});
test('expanded terrain preserves level campus foundations',()=>{
 for(let x=-SITE.width/2;x<=SITE.width/2;x+=50)for(let z=-SITE.depth/2;z<=SITE.depth/2;z+=50){
  if(Math.hypot(x/(SITE.width*.52),z/(SITE.depth*.52))<=1.4)assert.equal(outerTerrainHeight(x,z),0);
 }
});
