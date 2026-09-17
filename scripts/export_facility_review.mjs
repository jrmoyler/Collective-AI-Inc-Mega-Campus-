// Isolated exports of the actual shipped facility factory; no reference imagery as geometry.
import {createCanvas,ImageData,Canvas} from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {FACILITIES} from '../viewer/campus/data.js';
import {createFacility} from '../viewer/campus/buildings.js';
globalThis.ImageData=ImageData;globalThis.HTMLCanvasElement=Canvas;
globalThis.document={createElement:()=>createCanvas(512,96)};
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const output=process.env.CAMPUS_FACILITY_GLB_DIR||'/tmp/campus-facility-review';
fs.mkdirSync(output,{recursive:true});
const ids=process.env.CAMPUS_FACILITY_IDS?.split(',').map(Number);
const manifest=[];
for(const f of FACILITIES.filter(f=>!ids||ids.includes(f.id))){
 const root=createFacility(f);root.position.set(0,0,0);root.updateMatrixWorld(true);
 let vertices=0,meshes=0;
 root.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;for(const v of o.geometry.attributes.position.array)if(!Number.isFinite(v))throw Error(f.key+' nonfinite geometry');}o.userData={facility:f.id};});
 const bounds=new T.Box3().setFromObject(root);
 const glb=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
 fs.writeFileSync(path.join(output,f.key+'.glb'),Buffer.from(glb));
 manifest.push({id:f.id,key:f.key,name:f.name,meshes,vertices,min:bounds.min.toArray(),max:bounds.max.toArray(),source:'viewer/campus/buildings.js createFacility'});
 console.log(f.key,vertices);
 root.traverse(o=>o.geometry?.dispose());
}
const manifestPath=path.join(output,'manifest.json');
const previous=ids&&fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):[];
const merged=[...previous.filter(f=>!manifest.some(n=>n.id===f.id)),...manifest].sort((a,b)=>a.id-b.id);
fs.writeFileSync(manifestPath,JSON.stringify(merged,null,2));
