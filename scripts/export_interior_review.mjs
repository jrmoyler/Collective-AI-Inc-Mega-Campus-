import {createCanvas} from '@napi-rs/canvas';
import {paintSurface} from '../viewer/campus/surface-textures.js';
import fs from 'node:fs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {FACILITIES} from '../viewer/campus/data.js';
import {createInteriorGeometry} from '../viewer/campus/interior-architecture.js';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const f=FACILITIES.find(f=>f.id===Number(process.argv[2]||30));const {root,layout}=createInteriorGeometry(f,0);
let vertices=0;root.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;for(const n of o.geometry.attributes.position.array)if(!Number.isFinite(n))throw Error(o.name);}});
fs.writeFileSync(`/tmp/interior-${f.id}.json`,JSON.stringify({facility:f.key,layout,vertices}));
const glb=await new GLTFExporter().parseAsync(root,{binary:true});fs.writeFileSync(`/tmp/interior-${f.id}.glb`,Buffer.from(glb));console.log(f.key,vertices);

fs.mkdirSync('/tmp/campus-textures',{recursive:true});for(const name of ['stone','oak','fabric','display']){const size=name==='display'?1024:512;const c=createCanvas(size,size);paintSurface(c.getContext('2d'),name);fs.writeFileSync('/tmp/campus-textures/'+name+'.png',c.toBuffer('image/png'));}
