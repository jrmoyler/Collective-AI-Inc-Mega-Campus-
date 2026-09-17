import {createCanvas} from '@napi-rs/canvas';
import {paintFinish} from '../viewer/campus/surface-textures.js';
import fs from 'node:fs';
import {FINISHES} from '../viewer/campus/interior-kit.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {FACILITIES} from '../viewer/campus/data.js';
import {createInteriorGeometry} from '../viewer/campus/interior-architecture.js';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const f=FACILITIES.find(f=>f.id===Number(process.argv[2]||30));const level=Number(process.env.CAMPUS_REVIEW_LEVEL||1)-1;if(!Number.isInteger(level)||level<0||level>=f.levels)throw Error('Invalid floor');const {root,layout}=createInteriorGeometry(f,level);
let vertices=0;root.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;for(const n of o.geometry.attributes.position.array)if(!Number.isFinite(n))throw Error(o.name);}});
fs.writeFileSync(`/tmp/interior-${f.id}.json`,JSON.stringify({facility:f.key,level:level+1,layout,vertices,occupants:root.children.filter(g=>g.userData.occupiedSeats).map(g=>({room:g.name,seats:g.userData.occupiedSeats}))}));
const glb=await new GLTFExporter().parseAsync(root,{binary:true});fs.writeFileSync(`/tmp/interior-${f.id}.glb`,Buffer.from(glb));console.log(f.key,vertices);

fs.mkdirSync('/tmp/campus-textures',{recursive:true});for(const [name,p] of Object.entries(FINISHES)){const size=name==='display'?1024:384;const c=createCanvas(size,size);paintFinish(c.getContext('2d'),name,p.color,size);fs.writeFileSync('/tmp/campus-textures/'+name+'.png',c.toBuffer('image/png'));}
