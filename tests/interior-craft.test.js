import test from 'node:test';
import assert from 'node:assert/strict';
import {InteriorKit,sofa,desk,furnishRoom} from '../viewer/campus/interior-kit.js';

test('finish grain keeps a physical scale across differently sized interior boxes',()=>{
 const kit=new InteriorKit('finish scale');
 const small=kit.box('socket','oak',0,0,0,.1,.1,.1,0);
 const large=kit.box('panel','oak',0,0,0,2,2,2,0);
 const span=mesh=>{const a=mesh.geometry.attributes.uv.array;return Math.max(...a)-Math.min(...a);};
 assert.ok(Math.abs(span(large)/span(small)-20)<.001);
 const display=kit.box('screen','display',0,0,0,2,1,.01,0);
 assert.equal(span(display),1,'screen layouts must not tile with physical dimensions');
});

test('soft furnishings have sculpted depression, finite normals and bounded indexed topology',()=>{
 const kit=new InteriorKit('cushion review');sofa(kit,0,0);
 const seat=kit.parts.find(p=>p.name==='seat cushion').geometry;
 assert.ok(seat.index,'upholstery remains indexed');
 assert.ok(seat.attributes.position.count<1000,'softness must not reintroduce geometry explosion');
 const pos=seat.attributes.position;
 let centerTop=-Infinity,edgeTop=-Infinity;
 for(let i=0;i<pos.count;i++){
  if(Math.abs(pos.getX(i))<.05&&Math.abs(pos.getZ(i))<.07)centerTop=Math.max(centerTop,pos.getY(i));
  if(Math.abs(pos.getX(i))>.19)edgeTop=Math.max(edgeTop,pos.getY(i));
 }
 assert.ok(centerTop<edgeTop-.005,'seat surface needs actual sculpting');
 for(const n of seat.attributes.normal.array)assert.ok(Number.isFinite(n));
});

test('workstation includes readable small scale tools and open cup finish',()=>{
 const kit=new InteriorKit('workstation');desk(kit,0,0);
 const parts=kit.parts.map(p=>p.name);
 for(const name of ['task lamp diffuser','coffee surface','cup rolled lip','writing pen','notebook page block'])assert.ok(parts.includes(name),name);
 const root=kit.finish(true);
 for(const m of root.children)assert.ok(m.geometry.index&&m.userData.collision);
});

test('lecture hall uses fixed seats with a clear central aisle inside its room',()=>{
 const kit=new InteriorKit('lecture hall'),room={name:'Lecture hall',x:0,z:10,w:12,d:12};
 assert.equal(furnishRoom(kit,room),'auditorium');
 const seats=kit.parts.filter(p=>p.name==='auditorium upholstered seat');
 assert.ok(seats.length>=12,'reference lecture hall requires audience rows');
 assert.ok(!kit.parts.some(p=>p.name==='caster'),'fixed audience seating has no office casters');
 for(const seat of seats){
  assert.ok(Math.abs(seat.position.x)>.85,'central circulation aisle');
  assert.ok(Math.abs(seat.position.x)<room.w/2-.3);
  assert.ok(Math.abs(seat.position.z-room.z)<room.d/2-.3);
 }
});
