import assert from 'node:assert/strict';
import test from 'node:test';
import {Box3} from 'three';
import {InteriorKit} from '../viewer/campus/interior-kit.js';
import {furnishRoomIdentity} from '../viewer/campus/room-identity.js';

const room={name:'Water analysis', w:8, d:7, fitout:{facility:28,level:0}};

test('the seedling tray rests on the installed counter and stays within its edges',()=>{
 const kit=new InteriorKit('water room');
 furnishRoomIdentity(kit,room);
 const bounds=name=>new Box3().setFromObject(kit.parts.find(m=>m.name.endsWith(name)));
 const counter=bounds(' counter'), tray=bounds('seedling tray');
 assert.ok(Math.abs(tray.min.y-counter.max.y)<1e-5);
 assert.ok(tray.min.x>=counter.min.x && tray.max.x<=counter.max.x);
 assert.ok(tray.min.z>=counter.min.z && tray.max.z<=counter.max.z);
});

test('an occupied wall leaves circulation free and receives flush material samples',()=>{
 const kit=new InteriorKit('crowded room');
 kit.box('existing installation','steel',0,1,room.d/2,room.w,2,room.d);
 furnishRoomIdentity(kit,room);
 assert.ok(!kit.parts.some(m=>m.name.endsWith('authored credenza')));
 const samples=kit.parts.filter(m=>m.name==='finish sample');
 assert.equal(samples.length,3);
 for(const m of samples)assert.ok(Math.abs(m.position.x)>room.w/2-.20);
});
