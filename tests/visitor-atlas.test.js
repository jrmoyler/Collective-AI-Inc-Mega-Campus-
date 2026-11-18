import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITIES} from '../viewer/campus/data.js';
import {circuits} from '../viewer/campus/circuits.js';
import {createArrivalCourts} from '../viewer/campus/arrival-courts.js';

test('every featured stop resolves to a distinct campus entrance and a scheduled arrival floor',()=>{
  const stops=circuits.flatMap(route=>route.stops);
  assert.equal(new Set(stops.map(([id])=>id)).size,stops.length);
  for(const [id,floor] of stops){
    const facility=FACILITIES.find(f=>f.id===id);
    assert.ok(facility?.program[floor]?.trim());
  }
});

test('arrival courts batch all ten stops by finish, with finite vertices at each entrance',()=>{
  const courts=createArrivalCourts(FACILITIES);
  assert.equal(courts.children.length,5);
  const covered=new Set();
  const stops=circuits.flatMap(route=>route.stops).map(([id])=>FACILITIES.find(f=>f.id===id));
  for(const mesh of courts.children){
    const positions=mesh.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      assert.ok([x,y,z].every(Number.isFinite));
      const f=stops.find(f=>Math.abs(x-(f.x-f.w*.23))<6 && Math.abs(z-(f.z+f.d/2+4.2))<3);
      assert.ok(f);
      covered.add(f.id);
    }
  }
  assert.equal(covered.size,stops.length);
});
