// Detects z-fighting candidates in the shipped facility factory: overlapping
// parallel faces of different materials that are closer than a tolerance.
// Usage: node scripts/audit-coplanar.mjs [--tol=0.02] [--ids=1,2] [--json=out.json]
import {createCanvas} from '@napi-rs/canvas';
import fs from 'node:fs';
import * as T from 'three';
globalThis.document={createElement:()=>createCanvas(512,96)};
const {FACILITIES}=await import('../viewer/campus/data.js');
const {createFacility}=await import('../viewer/campus/buildings.js');

const arg=(name,fallback)=>{const hit=process.argv.find(a=>a.startsWith(`--${name}=`));return hit?hit.split('=')[1]:fallback;};
const TOL=Number(arg('tol','0.02')),MIN_AREA=Number(arg('min-area','0.01'));
const ids=arg('ids','')?arg('ids').split(',').map(Number):null;
const NQ=0.02; // normal bucket size (~1 degree)

function triangles(root){
 const out=[];root.updateMatrixWorld(true);
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),e1=new T.Vector3(),e2=new T.Vector3();
 root.traverse(o=>{
  if(!o.isMesh||!o.visible)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  const g=o.geometry,pos=g.attributes.position,idx=g.index,count=idx?idx.count:pos.count;
  const instances=o.isInstancedMesh?o.count:1,im=new T.Matrix4();
  for(let k=0;k<instances;k++){
   const m=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(k,im);m.multiply(im);}
   for(let i=0;i+2<count;i+=3){
    const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i+1,ic=idx?idx.getX(i+2):i+2;
    a.fromBufferAttribute(pos,ia).applyMatrix4(m);b.fromBufferAttribute(pos,ib).applyMatrix4(m);c.fromBufferAttribute(pos,ic).applyMatrix4(m);
    n.crossVectors(e1.subVectors(b,a),e2.subVectors(c,a));const len=n.length();if(len<1e-7)continue;n.divideScalar(len);
    // Undersides resting on the terrain are never visible from the orbit camera.
    if(n.y<-.9&&Math.max(a.y,b.y,c.y)<.05)continue;
    const mat=mats[0];
    out.push({a:a.clone(),b:b.clone(),c:c.clone(),n:n.clone(),d:n.dot(a),area:len/2,mat,mesh:o.name||o.parent?.name||'mesh',double:mat.side===T.DoubleSide,transparent:!!mat.transparent});
   }
  }
 });
 return out;
}
function clip(poly,ax,ay,bx,by){ // keep left of a->b
 const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];
  const sp=(bx-ax)*(p[1]-ay)-(by-ay)*(p[0]-ax),sq=(bx-ax)*(q[1]-ay)-(by-ay)*(q[0]-ax);
  if(sp>=0)out.push(p);if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
 return out;
}
const area2=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
function overlap(P,Q){let poly=P;const ccw=area2(Q)>0?Q:[...Q].reverse();for(let i=0;i<3&&poly.length;i++){const a=ccw[i],b=ccw[(i+1)%3];poly=clip(poly,a[0],a[1],b[0],b[1]);}return poly.length>2?Math.abs(area2(poly)):0;}

function analyse(root){
 const tris=triangles(root),buckets=new Map();
 const key=(n)=>{let s=n;if(s.x<-1e-6||(Math.abs(s.x)<1e-6&&(s.y<-1e-6||(Math.abs(s.y)<1e-6&&s.z<0))))s=s.clone().negate();return [Math.round(s.x/NQ),Math.round(s.y/NQ),Math.round(s.z/NQ)].join(',');};
 for(const t of tris){const k=key(t.n);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(t);}
 const pairs=new Map();let total=0;
 const u=new T.Vector3(),v=new T.Vector3();
 for(const list of buckets.values()){
  if(list.length<2)continue;
  const n0=list[0].n.clone();const canon=n0;
  u.set(Math.abs(canon.y)<.9?0:1,Math.abs(canon.y)<.9?1:0,0).cross(canon).normalize();v.crossVectors(canon,u);
  for(const t of list){t.sd=canon.dot(t.a);t.same=t.n.dot(canon)>0;t.p=[t.a,t.b,t.c].map(p=>[p.dot(u),p.dot(v)]);t.minU=Math.min(...t.p.map(p=>p[0]));t.maxU=Math.max(...t.p.map(p=>p[0]));t.minV=Math.min(...t.p.map(p=>p[1]));t.maxV=Math.max(...t.p.map(p=>p[1]));}
  list.sort((x,y)=>x.sd-y.sd);
  for(let i=0;i<list.length;i++){const A=list[i];
   for(let j=i+1;j<list.length&&list[j].sd-A.sd<=TOL;j++){const B=list[j];
    if(A.mat===B.mat)continue;
    // opposite facing faces only fight when one of them renders its back.
    if(A.same!==B.same&&!A.double&&!B.double)continue;
    if(A.maxU<=B.minU||B.maxU<=A.minU||A.maxV<=B.minV||B.maxV<=A.minV)continue;
    const area=overlap(A.p,B.p);if(area<1e-4)continue;
    const names=[A.mesh,B.mesh].sort();const k=names.join(' <> ');
    const rec=pairs.get(k)||{pair:k,area:0,count:0,gap:0,sample:null,facing:A.same===B.same?'same':'opposite',up:0,side:0,down:0,resolved:!!(A.mat.userData?.depthOffsetLayer||B.mat.userData?.depthOffsetLayer)};
    rec.area+=area;rec.count++;if(A.n.y>.5)rec.up+=area;else if(A.n.y<-.5)rec.down+=area;else rec.side+=area;if(!rec.big||area>rec.big.area)rec.big={area:+area.toFixed(2),normal:A.n.toArray().map(x=>+x.toFixed(2)),tris:[A,B].map(t=>[t.a,t.b,t.c].map(p=>p.toArray().map(x=>+x.toFixed(2))))};rec.gap=Math.max(rec.gap,Math.abs(B.sd-A.sd));if(!rec.sample){rec.sample=A.a.toArray().map(x=>+x.toFixed(2));rec.normal=A.n.toArray().map(x=>+x.toFixed(2));rec.tris=[A,B].map(t=>[t.a,t.b,t.c].map(p=>p.toArray().map(x=>+x.toFixed(2))));}pairs.set(k,rec);total+=area;
   }
  }
 }
 const all=[...pairs.values()].filter(p=>!p.resolved);return {triangles:tris.length,total,up:all.reduce((s,p)=>s+p.up,0),side:all.reduce((s,p)=>s+p.side,0),down:all.reduce((s,p)=>s+p.down,0),pairs:[...pairs.values()].filter(p=>p.area>=MIN_AREA).sort((a,b)=>b.area-a.area)};
}

const report=[];
for(const f of FACILITIES.filter(f=>!ids||ids.includes(f.id))){
 const root=createFacility(f);root.position.set(0,0,0);
 const r=analyse(root);r.total=r.up+r.side+r.down;report.push({key:f.key,name:f.name,...r});
 console.log(`${f.key}\ttris=${r.triangles}\toverlap m2=${r.total.toFixed(1)}\tup=${r.up.toFixed(1)}\tside=${r.side.toFixed(1)}\tdown=${r.down.toFixed(1)}\tpairs=${r.pairs.length}`);
 root.traverse(o=>o.geometry?.dispose());
}
const out=arg('json','');if(out)fs.writeFileSync(out,JSON.stringify(report,null,1));

const md=arg('md','');
if(md){
 const fmt=v=>v.toFixed(1);
 let text=`# Facility coplanar / near-coincident face report\n\nGenerated by \`node scripts/audit-coplanar.mjs --md=...\` (tolerance ${TOL} m). Pairs are overlapping parallel faces of different materials closer than the tolerance; these z-fight (flicker) as the camera moves. Areas in m2. up = roof-facing (visible from aerial, highest priority), side = facade, down = soffit/underside (ground views only). Samples are facility-local coordinates (facility origin at f.x,0,f.z). Totals exclude pairs involving receding glass (materials tagged by recedeBehindCoplanar in geometry.js: glazing, blueGlass and their clones), which now resolve deterministically through polygonOffset; those pairs are still listed and marked [resolved]. Since reversed float depth + distance-scaled near plane (viewer/main.js, viewer/campus/depth-precision.js), faces >= 2.5 cm apart no longer fight; the remaining risk is faces < ~2 cm apart, especially exactly coplanar (gap 0) opaque pairs, which only a geometry change can fix (move one face >= 2.5 cm, trim the overlap, or delete the hidden face).\n\n| Facility | up | side | down | total |\n|---|---:|---:|---:|---:|\n`;
 for(const f of report)text+=`| ${f.key} | ${fmt(f.up)} | ${fmt(f.side)} | ${fmt(f.down)} | ${fmt(f.total)} |\n`;
 for(const f of report){
  text+=`\n## ${f.key} ${f.name}\n\n`;
  for(const p of f.pairs.slice(0,10))text+=`- ${p.resolved?'[resolved] ':''}${p.pair} - ${fmt(p.area)} m2 (up ${fmt(p.up)}/side ${fmt(p.side)}/down ${fmt(p.down)}), ${p.count} tri pairs, max gap ${(p.gap*100).toFixed(1)} cm, ${p.facing}-facing, normal ${JSON.stringify(p.big.normal)}, largest overlap near ${JSON.stringify(p.big.tris[0][0])}\n`;
 }
 fs.writeFileSync(md,text);
}
