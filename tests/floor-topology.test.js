import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITIES,floorLayout} from '../viewer/campus/data.js';
import {routeToRoom} from '../viewer/campus/floor-topology.js';

test('all 74 floor envelopes differ before materials or furniture are created',()=>{
 const seen=new Set();
 for(const f of FACILITIES)for(let l=0;l<f.levels;l++){
  const a=floorLayout(f,l),key=JSON.stringify(a.rooms.map(r=>[r.x,r.z,r.w,r.d,r.angle,r.height]));
  assert.ok(!seen.has(key),`${f.key}/${l+1} duplicates another floor enclosure`);seen.add(key);
  for(const r of a.rooms){assert.ok(r.localWidth>=3.4-1e-6&&r.localDepth>=3.4-1e-6);assert.ok(r.doorWidth>=1.18);}
 }
 assert.equal(seen.size,74);
});

test('LED source stage dimensions and production clearances are not clamped to an office bay',()=>{
 const a=floorLayout(FACILITIES[4],0),led=a.rooms[0];
 assert.ok(led.localWidth>=12.192+2);assert.ok(led.localDepth>=18.288+2);assert.equal(led.height,9);
 assert.equal(a.rooms[1].height,9);assert.equal(a.rooms[3].height,6);assert.equal(a.rooms[2].height,3.2);
});

test('free-walking branch routes never travel diagonally through a room envelope',()=>{
 for(const f of FACILITIES)for(let level=0;level<f.levels;level++){
  const a=floorLayout(f,level);
  for(const c of a.circulation)for(let target=0;target<6;target++){
   const start=[c.x,c.z],route=[start,...routeToRoom(a,start,target)];
   for(let i=1;i<route.length;i++){
    const [x,z]=route[i-1],[xx,zz]=route[i];assert.ok(Math.abs(x-xx)<1e-6||Math.abs(z-zz)<1e-6,'rectilinear route');
    // Sample at less than a visitor body radius along every corridor segment.
    const n=Math.ceil(Math.hypot(xx-x,zz-z)/.2);
    for(let j=0;j<=n;j++){
     const px=x+(xx-x)*j/(n||1),pz=z+(zz-z)*j/(n||1);
     for(const [ri,r] of a.rooms.entries())if(ri!==target)assert.ok(!(Math.abs(px-r.x)<r.w/2-.01&&Math.abs(pz-r.z)<r.d/2-.01),`${f.key}/${level+1} route crosses ${r.name}`);
    }
   }
  }
 }
});
