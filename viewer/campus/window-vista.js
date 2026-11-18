// The window cylinder is a single draw call. Project the site's actual layout
// onto it at the visitor's floor elevation; all dimensions here are in metres.
import {FACILITIES, LAKES} from './data.js';

const TAU = Math.PI * 2;
const roundForms = new Set(['ring','round','dome','stadium','water','transit','garden','gardenlow','greenhouses']);

function pavilion(f) {
 const circular = roundForms.has(f.form);
 const outline = circular
  ? Array.from({length:16}, (_,i) => [Math.cos(TAU*i/16), Math.sin(TAU*i/16)])
  : [[-1,-1],[1,-1],[1,1],[-1,1]];
 // The angular profile is especially visible above the tree canopy.
 const levels = f.form === 'prism' ? [[0,1],[.23,1],[.26,.72],[.76,.58],[1,.13]]
  : f.form === 'spire' ? [[0,1],[.09,.85],[.14,.3],[.88,.12],[1,.02]]
  : f.form === 'dome' || f.form === 'greenhouses' ? [[0,1],[.4,1],[.72,.87],[.92,.55],[1,.18]]
  : f.form === 'garden' ? [[0,1],[.25,1],[.27,.77],[.62,.77],[.64,.6],[1,.6]]
  : [[0,1],[.91,1],[.94,1.02],[1,1.02]];
 return levels.map(([height,scale]) => outline.map(([x,z]) =>
  [f.x+x*f.w*.5*scale, height*f.h, f.z+z*f.d*.5*scale]));
}

export function paintWindowVista(ctx,width,height,{facility,ground,top,bottom,radius}) {
 const eye = 1.67, eyeElevation = eye-ground, px = height/(top-bottom);
 const project = ([x,y,z]) => {
  const dx=x-facility.x, dz=z-facility.z;
  return [(Math.atan2(-dz,dx)/TAU+1)%1*width,
   (top-eye-(y-eyeElevation)*radius/Math.max(1,Math.hypot(dx,dz)))*px];
 };
 const skyline = (top-eye)*px;
 const sky = ctx.createLinearGradient(0,0,0,skyline);
 sky.addColorStop(0,'#7197b9'); sky.addColorStop(.74,'#bad1df'); sky.addColorStop(1,'#e0e6df');
 ctx.fillStyle=sky; ctx.fillRect(0,0,width,skyline+1);
 const lawn=ctx.createLinearGradient(0,skyline,0,height);
 lawn.addColorStop(0,'#a5ae8d'); lawn.addColorStop(.20,'#788960'); lawn.addColorStop(1,'#546b48');
 ctx.fillStyle=lawn; ctx.fillRect(0,skyline,width,height-skyline);

 // Unwrap azimuth locally so geometry on the cylinder seam has two clipped copies.
 function face(vertices,color) {
  const pts=vertices.map(project), origin=pts[0][0];
  for(const p of pts) p[0]-=width*Math.round((p[0]-origin)/width);
  const min=Math.min(...pts.map(p=>p[0])), max=Math.max(...pts.map(p=>p[0]));
  for(const offset of [0,...(min<0?[width]:[]),...(max>width?[-width]:[])]) {
   ctx.fillStyle=color; ctx.beginPath();
   pts.forEach(([x,y],i)=>i?ctx.lineTo(x+offset,y):ctx.moveTo(x+offset,y));
   ctx.closePath(); ctx.fill();
  }
 }
 for(const [x,z,rx,rz] of LAKES) {
  // A triangle fan keeps each projected shore segment on the correct azimuth.
  if(((facility.x-x)/rx)**2+((facility.z-z)/rz)**2<1) continue;
  const shore=Array.from({length:40},(_,i)=>[x+rx*Math.cos(TAU*i/40),0,z+rz*Math.sin(TAU*i/40)]);
  for(let i=0;i<shore.length;i++) face([[x,0,z],shore[i],shore[(i+1)%shore.length]],'#68989b');
 }

 const distance=(x,z)=>Math.hypot(x-facility.x,z-facility.z);
 const objects=[];
 for(const f of FACILITIES) {
  if(f.id!==facility.id) objects.push({x:f.x,z:f.z,facility:f});
  // Small planted groups frame approaches without obscuring every window at eye level.
  for(let i=0;i<7;i++) {
   const a=TAU*i/7+f.id*.81;
   const x=f.x+Math.cos(a)*(f.w*.6+9), z=f.z+Math.sin(a)*(f.d*.6+9);
   objects.push({x,z,tree:f.id*7+i});
  }
 }
 objects.sort((a,b)=>distance(b.x,b.z)-distance(a.x,a.z));
 for(const item of objects) {
  const {x,z}=item, dist=distance(x,z);
  const haze=Math.min(.62,dist/1450), tint=(rgb,k=1)=>'rgb('+rgb.map((c,i)=>Math.round(c*k*(1-haze)+[197,210,214][i]*haze)).join(',')+')';
  if(!item.facility) {
   const seed=item.tree, treeHeight=5.5+seed%6, crown=treeHeight*.34;
   const [cx,cy]=project([x,treeHeight-crown,z]), base=project([x,0,z])[1];
   const rx=Math.max(.7,Math.atan2(crown,dist)*width/TAU), ry=crown*radius/dist*px;
   for(const xx of [cx,...(cx<rx?[cx+width]:[]),...(cx+rx>width?[cx-width]:[])]) {
    ctx.fillStyle=tint([80,72,59]);ctx.fillRect(xx-rx*.08,cy,rx*.16,base-cy);
    for(let i=0;i<4;i++) {
     ctx.fillStyle=tint(seed%9===0?[165,116,130]:[65,92,68],.81+i*.07);
     ctx.beginPath();ctx.ellipse(xx+Math.cos(seed+i*1.7)*rx*.26,cy-i*.09*ry,rx*(1-i*.12),ry*(1-i*.12),0,0,TAU);ctx.fill();
    }
   }
   continue;
  }
  const f=item.facility,rings=pavilion(f), sides=[];
  for(let j=1;j<rings.length;j++) for(let i=0;i<rings[j].length;i++) {
   const n=(i+1)%rings[j].length,a=rings[j-1][i],b=rings[j-1][n],c=rings[j][n],d=rings[j][i];
   const dx=b[0]-a[0], dz=b[2]-a[2], len=Math.hypot(dx,dz)||1;
   if((facility.x-a[0])*dz-(facility.z-a[2])*dx<0) continue;
   sides.push({a,b,c,d,j,light:.89+.18*(dz-dx)/len,dist:distance((a[0]+b[0])/2,(a[2]+b[2])/2)});
  }
  sides.sort((a,b)=>b.dist-a.dist);
  for(const {a,b,c,d,j,light} of sides) {
   const glazing=f.form==='prism'||['office','academy','round','civic','transit','garden'].includes(f.form);
   face([a,b,c,d],tint(glazing?[82,116,134]:[151,149,133],light));
   const mix=(v,w,t)=>v.map((n,i)=>n+(w[i]-n)*t);
   const span=d[1]-a[1];
   if(span>4) for(let y=3.4;y<span-.2;y+=3.8) {
    face([mix(a,d,y/span),mix(b,c,y/span),mix(b,c,(y+.18)/span),mix(a,d,(y+.18)/span)],tint([204,195,166],light));
   }
   if(glazing && dist<460 && j===1) {
    const bays=Math.min(18,Math.floor(Math.hypot(b[0]-a[0],b[2]-a[2])/4));
    for(let n=1;n<bays;n++) face([mix(a,b,n/bays),mix(a,b,(n+.055)/bays),mix(d,c,(n+.055)/bays),mix(d,c,n/bays)],tint([156,169,168]));
   }
  }
  if(eyeElevation>f.h) face(rings.at(-1),tint([165,165,151],1.05));
 }
}
