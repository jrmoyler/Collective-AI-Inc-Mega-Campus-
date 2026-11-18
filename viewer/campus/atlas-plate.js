import {FACILITIES, LAKES} from './data.js';
import {roadDefs} from './road-layout.js';

// Oblique architectural plate. Use the exterior's metre coordinates and
// envelope heights so a circuit preview has the same orientation throughout.
const project = (x,z,h=0) => [530 + .78*x - .29*z, 324 + .20*x + .52*z - .88*h];
export function drawPlate(canvas, circuit) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = 1060*ratio;
  canvas.height = 655*ratio;
  ctx.scale(ratio,ratio);
  const path = (points, fill, stroke, width=1) => {
    ctx.beginPath();
    points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  };
  path([[-510,-445],[510,-445],[510,445],[-510,445]].map(([x,z])=>project(x,z)), '#182e35','#466068');
  for(let x=-500;x<=500;x+=50)path([project(x,-445),project(x,445)],null,'#213b40');
  for(let z=-400;z<=400;z+=50)path([project(-510,z),project(510,z)],null,'#213b40');
  // Reproducible stipple for planting beds. Leave building lots and water clear.
  let seed=9813;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<1250;i++){
    const x=(random()-.5)*944,z=(random()-.5)*790;
    if(Math.sin(x*.033)+Math.cos(z*.046)<-.25)continue;
    if(FACILITIES.some(f=>Math.abs(f.x-x)<f.w/2+7 && Math.abs(f.z-z)<f.d/2+7))continue;
    const [u,v]=project(x,z);
    ctx.fillStyle=i%6===0?'#53675c':'#38584d';
    ctx.beginPath();ctx.ellipse(u,v,3+random()*2,2.4,0,0,Math.PI*2);ctx.fill();
  }
  for(const [x,z,w,d] of LAKES){
    const shore=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24;return project(x+w*Math.cos(a),z+d*Math.sin(a));});
    path(shore,'#154655','#427382');
  }
  for(const [nodes,width,closed] of roadDefs){
    const points=nodes.map(([x,z])=>project(x,z));
    if(closed)points.push(points[0]);
    path(points,null,closed?'#716448':'#344c51',width*.43);
  }
  const featured = new Set(circuit.stops.map(([id])=>id));
  const sorted = [...FACILITIES].sort((a,b)=>project(a.x,a.z)[1]-project(b.x,b.z)[1]);
  for(const f of sorted){
    const round=['round','ring','dome','stadium','spire'].includes(f.form);
    const corners=round?Array.from({length:24},(_,i)=>[Math.cos(i*Math.PI/12),Math.sin(i*Math.PI/12)]):[[-1,-1],[1,-1],[1,1],[-1,1]];
    const level=(h,scale)=>corners.map(([a,b])=>project(f.x+a*f.w*.5*scale,f.z+b*f.d*.5*scale,h));
    const bottom=level(0,1),top=level(f.h,f.form==='prism'?.23:f.form==='dome'?.55:1);
    for(let i=0;i<top.length;i++){
      const j=(i+1)%top.length;
      if (bottom[j][0]>bottom[i][0])continue;
      path([bottom[i],bottom[j],top[j],top[i]],featured.has(f.id)?'#826d48':'#31464d','#172d35');
    }
    const bands=Math.min(6,Math.max(1,Math.floor(f.h/9)));
    for(let band=1;band<=bands;band++){
      const t=band/(bands+1);
      const edge=bottom.map(([x,y],i)=>[x+(top[i][0]-x)*t,y+(top[i][1]-y)*t]);
      for(let i=0;i<edge.length;i++){
        const j=(i+1)%edge.length;
        if(bottom[j][0]<bottom[i][0])path([edge[i],edge[j]],null,'#55717a',.85);
      }
    }
    path(top, featured.has(f.id)?circuit.color:'#749294','#21353b');
    if(f.form==='ring'||f.form==='stadium'){
      path(level(f.h,.58),'#263e43','#a5b1a3');
    }else if(!round && f.form!=='prism'){
      for(let i=-1;i<=1;i++){
        const x=f.x+i*f.w*.20;
        path([project(x-2,f.z-f.d*.29,f.h+.3),project(x-2,f.z+f.d*.29,f.h+.3)],null,'#47646b',2);
      }
    }
  }
  const stops=circuit.stops.map(([id])=>FACILITIES.find(f=>f.id===id));
  const pins=stops.map(f=>project(f.x,f.z,f.h+25));
  ctx.setLineDash([5,6]);path(pins,null,circuit.color,2.2);ctx.setLineDash([]);
  pins.forEach(([x,y],i)=>{
    path([[x,y+12],project(stops[i].x,stops[i].z,stops[i].h)],null,circuit.color,2);
    ctx.beginPath();ctx.arc(x,y,14,0,2*Math.PI);ctx.fillStyle='#081520';ctx.fill();
    ctx.strokeStyle=circuit.color;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText(String(i+1),x,y+5);
  });
  return pins;
}
