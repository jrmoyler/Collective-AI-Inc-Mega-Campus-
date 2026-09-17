// All 74 actual floor layouts; no GPU and no source artwork substituted.
import fs from 'node:fs';
import path from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {FACILITIES,floorLayout} from '../viewer/campus/data.js';
const out=process.argv[2]||'evidence/topology-pass';fs.mkdirSync(out,{recursive:true});
const manifest=[],tiles=[];
for(const f of FACILITIES)for(let level=0;level<f.levels;level++){
 const a=floorLayout(f,level),c=createCanvas(500,410),g=c.getContext('2d');g.fillStyle='#f5f2eb';g.fillRect(0,0,500,410);g.fillStyle='#203038';g.font='bold 17px sans-serif';g.fillText(`${f.key} · L${level+1} · ${f.name.slice(0,30)}`,16,25);
 const scale=Math.min(460/a.w,300/a.d),x=v=>250+v*scale,z=v=>180+v*scale;
 g.fillStyle='#647078';g.fillRect(x(-a.w/2),z(-a.d/2),a.w*scale,a.d*scale);
 for(const corridor of a.circulation){g.fillStyle='#fff';g.fillRect(x(corridor.x-corridor.w/2),z(corridor.z-corridor.d/2),corridor.w*scale,corridor.d*scale);}
 for(const [i,r] of a.rooms.entries()){
  g.fillStyle=r.height>=6?'#829caf':r.fitout.privateRoom?'#d9bd9a':'#b2c7be';g.fillRect(x(r.x-r.w/2),z(r.z-r.d/2),r.w*scale,r.d*scale);g.strokeStyle='#31474f';g.lineWidth=1;g.strokeRect(x(r.x-r.w/2),z(r.z-r.d/2),r.w*scale,r.d*scale);
  g.fillStyle='#142c34';g.font='12px sans-serif';g.textAlign='center';g.fillText(`${i+1} · ${r.height}m`,x(r.x),z(r.z)+3);g.textAlign='left';
  g.strokeStyle='#fff';g.lineWidth=4;const dx=Math.cos(r.angle)*r.doorWidth/2,dz=-Math.sin(r.angle)*r.doorWidth/2;g.beginPath();g.moveTo(x(r.doorX-dx),z(r.doorZ-dz));g.lineTo(x(r.doorX+dx),z(r.doorZ+dz));g.stroke();
 }
 g.font='10px sans-serif';g.fillStyle='#203038';a.rooms.forEach((r,i)=>g.fillText(`${i+1}. ${r.name}`,16+(i%2)*238,350+Math.floor(i/2)*17));
 const file=`${f.key}-L${level+1}-plan.png`;fs.writeFileSync(path.join(out,file),c.toBuffer('image/png'));tiles.push(c);manifest.push({facility:f.key,level:level+1,file,topology:a.topology,rooms:a.rooms.map(r=>({name:r.name,width:r.w,depth:r.d,height:r.height,door:[r.doorX,r.doorZ],route:r.route}))});
}
for(let start=0;start<tiles.length;start+=20){const group=tiles.slice(start,start+20),sheet=createCanvas(2000,Math.ceil(group.length/4)*410),ctx=sheet.getContext('2d');group.forEach((tile,i)=>ctx.drawImage(tile,(i%4)*500,Math.floor(i/4)*410));fs.writeFileSync(path.join(out,`plans-${start+1}-${start+group.length}.jpg`),sheet.toBuffer('image/jpeg'));}
fs.writeFileSync(path.join(out,'floor-manifest.json'),JSON.stringify(manifest,null,2));console.log(`${manifest.length} floors / ${manifest.reduce((s,f)=>s+f.rooms.length,0)} rooms`);
