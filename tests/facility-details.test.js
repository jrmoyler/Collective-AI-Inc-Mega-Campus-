import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial,Vector3} from 'three';
import {configureFacilityDetails} from '../viewer/campus/facility-details.js';

test('fine detail culling measures from the placed facility envelope and preserves its shell',()=>{
 const root=new Group(),shell=new Mesh(new BoxGeometry(100,40,80),new MeshBasicMaterial()),details=new Group();
 details.userData.nearDetail=true;root.add(shell,details);root.position.set(400,20,-200);
 const update=configureFacilityDetails(root,{distance:100,hysteresis:20});
 assert.equal(update(new Vector3(400,700,-200)),false);assert.equal(details.visible,false);assert.equal(shell.visible,true);
 assert.equal(update(new Vector3(550,20,-200)),true);assert.equal(details.visible,true);
 // Camera movement near the threshold must not repeatedly pop fine geometry.
 assert.equal(update(new Vector3(568,20,-200)),true);
 assert.equal(update(new Vector3(572,20,-200)),false);
 assert.equal(update(new Vector3(568,20,-200)),false);
 assert.equal(update(new Vector3(549,20,-200)),true);
 shell.geometry.dispose();shell.material.dispose();
});

test('deferred equipment is constructed only upon approaching a facility',()=>{
 const root=new Group();root.userData.facility=21;
 root.add(new Mesh(new BoxGeometry(40,20,40),new MeshBasicMaterial()));
 let builds=0;root.userData.createNearDetail=()=>{builds++;const g=new Group();g.userData.nearDetail=true;g.add(new Group());return g;};
 const update=configureFacilityDetails(root);
 assert.equal(update(new Vector3(0,700,0)),false);assert.equal(builds,0);
 assert.equal(update(new Vector3(0,15,50)),true);assert.equal(builds,1);
 root.children.at(-1).traverse(object=>assert.equal(object.userData.facility,21));
 update(new Vector3(0,15,51));assert.equal(builds,1);
 update(new Vector3(0,700,0));assert.equal(root.children.length,1);
 update(new Vector3(0,15,50));assert.equal(builds,2);
 root.children[0].geometry.dispose();root.children[0].material.dispose();
});

test('distant eviction disposes private buffers once and preserves shared facade materials',()=>{
 const root=new Group(),material=new MeshBasicMaterial(),shellGeometry=new BoxGeometry(40,20,40);
 root.userData.facility=8;root.add(new Mesh(shellGeometry,material));let geometryDisposals=0,materialDisposals=0,builds=0;
 material.addEventListener('dispose',()=>materialDisposals++);
 root.userData.createNearDetail=()=>{builds++;const detail=new Group(),geometry=new BoxGeometry();geometry.addEventListener('dispose',()=>geometryDisposals++);detail.userData.nearDetail=true;detail.add(new Mesh(geometry,material),new Mesh(geometry,material));return detail;};
 const update=configureFacilityDetails(root);update(new Vector3(0,700,0));assert.equal(builds,0);
 update(new Vector3(0,5,35));const first=root.children[1];assert.equal(first.children[0].userData.facility,8);
 update(new Vector3(0,700,0));assert.equal(geometryDisposals,1);assert.equal(materialDisposals,0);assert.equal(root.children.length,1);
 update(new Vector3(0,5,35));assert.equal(builds,2);assert.notEqual(root.children[1],first);assert.equal(root.children[1].visible,true);
 update(new Vector3(0,700,0));assert.equal(geometryDisposals,2);assert.equal(materialDisposals,0);shellGeometry.dispose();material.dispose();
});
