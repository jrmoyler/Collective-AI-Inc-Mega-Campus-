// Geometry review export. Blender renders are not substitutes for WebGL browser tests.
import {createCanvas,ImageData,Canvas} from '@napi-rs/canvas';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {FACILITIES} from '../viewer/campus/data.js';
import {createFacility} from '../viewer/campus/buildings.js';
import {createLandscape,createInfrastructure} from '../viewer/campus/landscape.js';
import {createFleets} from '../viewer/campus/fleets.js';
globalThis.ImageData=ImageData;globalThis.HTMLCanvasElement=Canvas;
globalThis.document={createElement:()=>createCanvas(512,96)};
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const scene=new T.Scene();const landscape=createLandscape();scene.add(landscape.root);const infrastructure=createInfrastructure();infrastructure.setEnergy(false);scene.add(infrastructure.root);const fleets=createFleets(landscape.roads);fleets.update(20);scene.add(fleets.root);
for(const f of FACILITIES)scene.add(createFacility(f));
let vertices=0,meshes=0;scene.traverse(o=>{if(o.isMesh){meshes++;const a=o.geometry.attributes.position;vertices+=a.count*(o.count||1);for(const n of a.array)if(!Number.isFinite(n))throw new Error('Non-finite geometry '+o.name); }});fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/geometry-check.json',JSON.stringify({meshes,vertices,facilities:FACILITIES.length,treeCount:landscape.treeCount,finitePositions:true,renderer:'Three.js scene graph export, not WebGL'},null,2));
new GLTFExporter().parse(scene,b=>{fs.writeFileSync(process.env.CAMPUS_REVIEW_GLB||'/tmp/campus-review.glb',Buffer.from(b));console.log({meshes,vertices});},e=>{throw e;},{binary:true,onlyVisible:true});
