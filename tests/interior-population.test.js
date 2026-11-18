import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {InteriorKit} from '../viewer/campus/interior-kit.js';
import {populateLargeRoom,populationUnit,UNITS} from '../viewer/campus/interior-population.js';

const room=(name,w,d,extra={})=>({name,x:0,z:d/2,w,d,height:4.2,angle:0,fitout:{technical:false},...extra});
const boxes=k=>k.parts.map(m=>{m.updateMatrix();if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();return new T.Box3().copy(m.geometry.boundingBox).applyMatrix4(m.matrix);});

test('large rooms receive repeated units of their own activity',()=>{
 assert.equal(populationUnit('fabrication','Print farm'),'printers');
 assert.equal(populationUnit('performance','Indoor sprint / turf'),null,'sprint lanes stay open, not a print farm');
 assert.equal(populationUnit('industrial','Machine/tool room'),'workbench');
 assert.equal(populationUnit('dining','Food hall'),'dining');
 assert.equal(populationUnit('teaching','All-hands forum'),'seats');
 assert.equal(populationUnit('stage','LED volume'),null);
 for(const id of Object.keys(UNITS)){const k=new InteriorKit('room-1: probe');UNITS[id].build(k,0,10);assert.ok(k.parts.length>4,id+' builds a real assembly');
  const [hx,hz]=UNITS[id].half;for(const b of boxes(k)){assert.ok(b.min.x>=-hx-.35&&b.max.x<=hx+.35&&b.min.z>=10-hz-.35&&b.max.z<=10+hz+.35,`${id} stays near its declared footprint`);}}
});

test('population keeps the arrival zone, central aisle, walls and authored fixtures clear',()=>{
 const r=room('Print farm',18,39),k=new InteriorKit('room-1: Print farm');
 k.box('authored fixture','graphite',5,.5,20,2,1,2,0);const before=boxes(k)[0];
 const placed=populateLargeRoom(k,r,'fabrication');assert.ok(placed>=6,'a 700 m² print farm is filled');
 for(const b of boxes(k).slice(1)){
  if(b.min.y>2.2)continue;
  assert.ok(b.min.z>3.4,'door arrival zone is clear');
  assert.ok(b.min.x>-r.w/2+.4&&b.max.x<r.w/2-.4&&b.max.z<r.d-.4,'units stay off the walls');
  assert.ok(b.max.x<-.5||b.min.x>.5,'a walking aisle runs from the door');
  assert.ok(!(b.max.x>before.min.x&&b.min.x<before.max.x&&b.max.z>before.min.z&&b.min.z<before.max.z),'authored fixtures are not overlapped');
 }
});

test('small, technical and open-program rooms are left as authored',()=>{
 assert.equal(populateLargeRoom(new InteriorKit('a'),room('Offices',8,9),'office'),0);
 assert.equal(populateLargeRoom(new InteriorKit('b'),room('Data hall',30,30,{fitout:{technical:true}}),'servers'),0);
 assert.equal(populateLargeRoom(new InteriorKit('c'),room('Soundstage',23,21),'stage'),0);
});

test('a per-room vertex budget bounds the added geometry',()=>{
 const k=new InteriorKit('room-1: Helios operations');populateLargeRoom(k,room('Helios operations',40,40),'office',{vertexBudget:60000});
 const vertices=k.parts.reduce((n,m)=>n+m.geometry.attributes.position.count,0);
 assert.ok(vertices<60000+40000,'stops within one unit of the budget');
});
