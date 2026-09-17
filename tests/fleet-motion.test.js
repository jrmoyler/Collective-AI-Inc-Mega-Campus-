import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFleets} from '../viewer/campus/fleets.js';

const road=()=>({curve:new T.LineCurve3(new T.Vector3(0,.22,0),new T.Vector3(0,.22,1000)),width:12});
test('fleet population is real, articulated and independent of automation detection',()=>{
 const fleet=createFleets([road()]);
 assert.deepEqual(fleet.counts,{shuttles:30,freight:8,androids:24,drones:16});
 const androids=fleet.root.children.filter(o=>o.name==='android');
 for(const android of androids){
  const {rig}=android.userData;assert.equal(rig.legs.length,2);
  for(const {arm,elbow} of rig.arms)assert.equal(elbow.parent,arm);
  for(const {thigh,shin,foot} of rig.legs){assert.equal(shin.parent,thigh);assert.equal(foot.parent,shin);}
 }
 fleet.update(.5);fleet.root.updateMatrixWorld(true);
 for(const android of androids){
  for(const {foot} of android.userData.rig.legs){
   const p=foot.getWorldPosition(new T.Vector3());assert.ok(p.y>=.22,'feet may not pass beneath the path');
  }
 }
 const first=androids[0].userData.rig.legs[0].thigh.children[0];
 const second=androids[1].userData.rig.legs[0].thigh.children[0];
 assert.equal(first.geometry,second.geometry,'repeat rigs share immutable geometry');
});
test('road fleet travels in metres per second and tyres roll',()=>{
 const fleet=createFleets([road()]);const freight=fleet.root.children.find(o=>o.name==='freight');
 fleet.update(1);const start=freight.position.clone();fleet.update(2);
 assert.ok(Math.abs(freight.position.distanceTo(start)-7)<.001);
 assert.equal(freight.userData.wheels.length,4);
 for(const wheel of freight.userData.wheels)assert.ok(Math.abs(wheel.rotation.x)>1);
 const before=freight.position.clone();fleet.update(NaN);assert.ok(freight.position.equals(before));
});
test('missing road input has honest counts and leaves aerial activity available',()=>{
 const fleet=createFleets([]);assert.deepEqual(fleet.counts,{shuttles:0,freight:0,androids:0,drones:16});
 fleet.update(100);for(const o of fleet.root.children)assert.ok(o.position.toArray().every(Number.isFinite));
});
