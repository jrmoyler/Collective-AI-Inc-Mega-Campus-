import test from 'node:test';
import assert from 'node:assert/strict';
import {interiorPixelRatio,exteriorPixelRatio} from '../viewer/campus/quality.js';
import {InteriorKit,taskChair,desk,server,roomKind} from '../viewer/campus/interior-kit.js';
test('high-DPR interiors never fall below CSS resolution and obey the selected pixel budget',()=>{
 for(const dpr of [.75,1,1.5,2,3,4]){assert.ok(interiorPixelRatio(dpr)>=1);assert.ok(interiorPixelRatio(dpr)<=1.5);assert.ok(interiorPixelRatio(dpr,'high')<=2);assert.ok(exteriorPixelRatio(dpr,'balanced',true)>=1);}
 assert.equal(interiorPixelRatio(3),1.5);assert.equal(interiorPixelRatio(3,'high'),2);
});
test('furniture contains structural supports, five casters, input devices and server units',()=>{
 const k=new InteriorKit('fixture-test');taskChair(k,0,0);assert.equal(k.parts.filter(p=>p.name==='caster').length,5);
 desk(k,3,0);server(k,6,0);const root=k.finish(true);assert.ok(root.children.length<20);
 const parts=root.userData.sculptRuntime.parts;for(const name of ['keyboard','mouse','monitor stand','rack unit','desk leg'])assert.ok(parts.includes(name),name);
 for(const m of root.children){assert.equal(m.userData.collision,true);for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));m.geometry.dispose();}
});
test('reference room fixtures stay differentiated by program',()=>{
 assert.equal(roomKind('Visitor demonstration'),'demo');assert.equal(roomKind('Identity operations'),'identity');assert.equal(roomKind('Credential lab'),'identity');assert.equal(roomKind('Consent review'),'meeting');assert.equal(roomKind('Segmented data networks'),'servers');assert.equal(roomKind('Knowledge keeper records'),'library');
});

import * as T from 'three';
import {FACILITIES} from '../viewer/campus/data.js';
import {createInteriorGeometry} from '../viewer/campus/interior-architecture.js';
test('Trust Vault guided room arrival paths remain open at visitor eye height',()=>{
 const {root,layout}=createInteriorGeometry(FACILITIES.find(f=>f.id===30),0);root.updateMatrixWorld(true);
 for(const r of layout.rooms){const side=Math.sign(r.z),from=new T.Vector3(r.doorX,1.67,0),to=new T.Vector3(r.doorX,1.67,side*(layout.corridor/2+Math.min(2,r.d*.24))),delta=to.clone().sub(from);const ray=new T.Raycaster(from,delta.clone().normalize(),0,delta.length());assert.equal(ray.intersectObject(root,true).length,0,r.name+' arrival blocked');}
 root.traverse(o=>o.geometry?.dispose());
});
