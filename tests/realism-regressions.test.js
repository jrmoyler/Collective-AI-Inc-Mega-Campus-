import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {InteriorKit,roomKind} from '../viewer/campus/interior-kit.js';
import {createFleets} from '../viewer/campus/fleets.js';
import {materials} from '../viewer/campus/geometry.js';

test('indexed rounded furniture preserves the original curved surface, UVs and normals',()=>{
 const kit=new InteriorKit('rounding');const mesh=kit.box('seat','fabric',0,0,0,.52,.12,.49,.05);
 const original=new RoundedBoxGeometry(.52,.12,.49,1,.024);
 const expanded=mesh.geometry.toNonIndexed();
 for(const name of ['position','normal','uv']){
  assert.equal(expanded.attributes[name].array.length,original.attributes[name].array.length);
  for(let i=0;i<original.attributes[name].array.length;i++)assert.ok(Math.abs(expanded.attributes[name].array[i]-original.attributes[name].array[i])<1e-6,name);
 }
 assert.ok(mesh.geometry.attributes.position.count<original.attributes.position.count/2);
 expanded.dispose();original.dispose();
});

test('all cargo and survey rotor arms meet their motors and only rotor blades spin',()=>{
 const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(100,0,0),new T.Vector3(100,0,100)],true);
 const fleet=createFleets([{curve,width:12}]);
 const cyan=fleet.root.children.flatMap(o=>o.children.filter(c=>c.material===materials.cyan&&!o.rotorBlades?.includes(c)));
 const before=cyan.map(o=>o.quaternion.clone());let drones=0;
 for(const drone of fleet.root.children.filter(o=>o.rotorBlades)){
  drones++;assert.equal(drone.rotorBlades.length,4);
  const arms=drone.children.filter(o=>o.name==='rotor arm'),motors=drone.children.filter(o=>o.name==='rotor motor');
  for(let i=0;i<4;i++){
   const arm=arms[i],motor=motors[i];arm.updateMatrix();
   arm.geometry.computeBoundingBox();const half=arm.geometry.boundingBox.max.y;
   const a=new T.Vector3(0,-half,0).applyMatrix4(arm.matrix),b=new T.Vector3(0,half,0).applyMatrix4(arm.matrix);
   assert.ok(a.length()<.011,'arm meets body');assert.ok(b.distanceTo(motor.position)<.011,'arm meets motor');
  }
 }
 assert.equal(drones,16);fleet.update(.25);
 for(const drone of fleet.root.children.filter(o=>o.rotorBlades))for(const blade of drone.rotorBlades)assert.ok(Math.abs(blade.rotation.y)>1);
 cyan.forEach((o,i)=>assert.ok(o.quaternion.equals(before[i]),'lens or android eyes must not spin'));
 fleet.root.traverse(o=>o.geometry?.dispose());
});

test('specialist schedules receive equipment appropriate to their program',()=>{
 for(const [name,kind] of [['Commercial kitchen','kitchen'],['Clinic pods','clinical'],['Podcast studios','studio'],['Power distribution','electrical'],['Liquid cooling','process'],['Print farm','fabrication'],['Accessible-home demo','accessible-home']])assert.equal(roomKind(name),kind);
});
