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

test('Babylon receives three.js triangles reversed so boxes show their outer faces',async()=>{
 const {frontFacing}=await import('../viewer/campus/interior.js');
 const src=Uint16Array.from([0,1,2,2,3,0]),out=frontFacing(src);
 assert.ok(out instanceof Uint16Array);assert.deepEqual(Array.from(out),[0,2,1,2,0,3]);
 assert.deepEqual(Array.from(src),[0,1,2,2,3,0],'shared three.js buffers are never mutated');
});

test('interior environment is lit from the ceiling and bounces warm from the floor',async()=>{
 const {interiorRadiance,interiorEnvironmentFaces}=await import('../viewer/campus/interior-lighting.js');
 const lum=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
 assert.ok(lum(interiorRadiance(.05,1,.02))>lum(interiorRadiance(0,-1,0))*1.3,'ceiling hemisphere brighter than floor bounce');
 const floor=interiorRadiance(0,-1,0);assert.ok(floor[0]>floor[2],'warm bounce');
 const faces=interiorEnvironmentFaces(8);assert.equal(faces.length,6);
 for(const f of faces)for(const v of f)assert.ok(Number.isFinite(v)&&v>=0);
});

test('furniture rooms receive non-colliding contact occlusion under floor-standing parts',()=>{
 const kit=new InteriorKit('room-1: Contact review');desk(kit,0,0);sofa(kit,3,0);
 const root=kit.finish(true),contact=root.children.find(m=>m.name.endsWith('/contact'));
 assert.ok(contact,'contact footprint mesh');assert.equal(contact.userData.collision,false);
 const pos=contact.geometry.attributes.position;assert.ok(pos.count>=8&&pos.count%4===0);
 for(let i=0;i<pos.count;i++){assert.ok(pos.getY(i)>.057&&pos.getY(i)<.07,'above every floor finish');}
 const alpha=contact.geometry.attributes.color;for(let i=0;i<alpha.count;i++)assert.ok(alpha.getW(i)>0&&alpha.getW(i)<.7);
 const plain=new InteriorKit('fixture');desk(plain,0,0);assert.ok(!plain.finish(true).children.some(m=>m.name.endsWith('/contact')),'only room kits');
});

test('procedural finishes tile seamlessly at the one-metre repeat',async()=>{
 const {createCanvas}=await import('@napi-rs/canvas');const {paintFinish}=await import('../viewer/campus/surface-textures.js');
 for(const name of ['plaster','stone','slate','fabric','leather','oak','plank','terrazzo']){
  const size=128,c=createCanvas(size,size),ctx=c.getContext('2d');paintFinish(ctx,name,0xa08060,size);
  const d=ctx.getImageData(0,0,size,size).data,px=(x,y)=>(d[(y*size+x)*4]+d[(y*size+x)*4+1]+d[(y*size+x)*4+2])/3;
  let wrap=0,inner=0;for(let y=0;y<size;y++){wrap+=Math.abs(px(0,y)-px(size-1,y));inner+=Math.abs(px(size/2,y)-px(size/2-1,y));}
  assert.ok(wrap<=inner*2.5+size*2,name+' horizontal seam');
  let variance=0;const mean=Array.from({length:size},(_,x)=>px(x,40)).reduce((a,b)=>a+b)/size;for(let x=0;x<size;x++)variance+=(px(x,40)-mean)**2;
  assert.ok(variance/size>.5,name+' is not a flat fill');
 }
});
