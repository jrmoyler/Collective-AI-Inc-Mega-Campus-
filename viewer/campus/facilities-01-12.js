// Individual atlas reconstructions. Dimensions are schematic envelope fits, not surveys.
import * as T from 'three';
import {Batch,cylinder,ring,line,materials} from './geometry.js';

import {facadeEdge,roofCoping,roofTree,occupiedBays} from './facade-craft.js';

const rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
const centroid=p=>p.reduce((v,q)=>[v[0]+q[0]/p.length,v[1]+q[1]/p.length],[0,0]);

// Local atlas materials. Global campus materials stay untouched; these follow
// the global dusk switch by reading the shared warm-window intensity.
function duskLinked(material,scale){
 Object.defineProperty(material,'emissiveIntensity',{get:()=>materials.warmWin.emissiveIntensity*scale,set:()=>{},configurable:true});
 return material;
}
// Occupied floor finish: warm timber/terrazzo under architectural lighting.
// 1 m jointed stone/terrazzo tiles (shared limestone texture at a coarser repeat).
const floorMap=materials.stone.map?.clone();if(floorMap){floorMap.repeat.set(.25,.25);floorMap.needsUpdate=true;}
const litFloor=duskLinked(new T.MeshStandardMaterial({name:'Atlas lit interior floor',color:0x6e5a45,map:floorMap||null,roughness:.5,metalness:.02,emissive:0xffa24c}),.10);
// Warm lit rear partitions and ceiling coffers seen through the glazing.
// Office floors behind tinted curtain walls read cooler with warm light pools.
const litFloorCool=duskLinked(new T.MeshStandardMaterial({name:'Atlas lit office floor',color:0x6c6e74,map:floorMap||null,roughness:.55,metalness:.05,emissive:0xffae5a}),.09);
const litWall=duskLinked(new T.MeshStandardMaterial({name:'Atlas lit interior wall',color:0xc9a57a,roughness:.7,emissive:0xffb466}),.22);
// Blue tinted curtain wall used by the crystalline HQ tower.
const blueCurtain=new T.MeshStandardMaterial({name:'Atlas blue curtain glass',color:0x3f7fc8,metalness:.3,roughness:.07,transparent:true,opacity:.56,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.5});
// Amber knowledge-core glazing (CF-04): warm tinted glass lit from within.
// Grow-tower glazing tinted by the magenta horticultural lighting behind it.
const growGlass=duskLinked(new T.MeshStandardMaterial({name:'Atlas grow tower glass',color:0xc8a0d8,metalness:.1,roughness:.1,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide,emissive:0xd048c8}),.2);
const amberGlass=duskLinked(new T.MeshStandardMaterial({name:'Atlas amber core glass',color:0xe0a050,metalness:.2,roughness:.12,transparent:true,opacity:.62,depthWrite:false,side:T.DoubleSide,emissive:0xff9a38}),.28);
// Production LED volume: abstract dusk gradient, no pictorial content.
const ledTexture=(()=>{const W=4,H=64,data=new Uint8Array(W*H*4);for(let y=0;y<H;y++){const t=y/(H-1),band=Math.exp(-((t-.38)**2)/.004);const r=40+120*t+120*band,g=30+40*t+140*band,bl=150+90*t+60*band;for(let x=0;x<W;x++)data.set([Math.min(255,r),Math.min(255,g),Math.min(255,bl),255],(y*W+x)*4);}const tex=new T.DataTexture(data,W,H,T.RGBAFormat);tex.colorSpace=T.SRGBColorSpace;tex.needsUpdate=true;return tex;})();
const ledWall=new T.MeshStandardMaterial({name:'Atlas LED volume',color:0x0c0c14,roughness:.35,emissive:0xffffff,emissiveMap:ledTexture,emissiveIntensity:1.25});
// Pull vertices toward the centroid so a stacked slab's edge never shares a
// face plane with the roof plate below it.
function inset(p,t){const [cx,cz]=centroid(p);return p.map(([x,z])=>{const l=Math.hypot(x-cx,z-cz)||1;return [x-(x-cx)/l*t,z-(z-cz)/l*t];});}
function plate(b,points,y,depth,mat='stone',holes=[]){
 const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
 for(const hole of holes){const h=new T.Path();hole.forEach(([x,z],i)=>i?h.lineTo(x,-z):h.moveTo(x,-z));h.closePath();s.holes.push(h);}
 const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:6});g.rotateX(-Math.PI/2);b.add(g,mat,0,y,0);g.dispose();
}
// Curtain wall: glass recessed 22 cm behind protruding graphite mullions,
// so the facade has real shadow depth instead of flush tinted planes.
const winding=p=>Math.sign(p.reduce((s,q,i)=>{const r=p[(i+1)%p.length];return s+q[0]*r[1]-r[0]*q[1];},0))||1;
function perimeter(b,p,y,height,{skin='dark',bay=3.2,opaque=[],glass='glazing',mullion='dark',fin=0,inward=false,band=.42}={}){
 // Outward normals follow polygon winding, so concave horseshoes and court
 // (hole) loops recess their glass on the correct side. inward flips a hole.
 const sense=winding(p)*(inward?-1:1);
 for(let i=0;i<p.length;i++){
  const a=p[i],c=p[(i+1)%p.length],dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz),rot=-Math.atan2(dz,dx),n=Math.max(1,Math.ceil(length/bay));
  if(length<.05)continue;
  const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2;
  const nx=sense*dz/length,nz=-sense*dx/length;
  if(opaque.includes(i))b.box(skin,x,y+height/2,z,length,height-.25,.30,rot);
  else b.pane(glass,x-nx*.22,y+height/2,z-nz*.22,length,height-.25,rot);
  facadeEdge(b,a,c,y,height,{center:[x-nx*4,z-nz*4],skin});
  b.box(skin,x,y+height-band/2-.01,z,length,band,.22,rot);
  if(height<2.5)for(let j=0;j<n;j++)b.box('steel',a[0]+dx*j/n,y+height/2,a[1]+dz*j/n,.10,height,.10);
  else for(let j=0;j<n;j++){
   const mx=a[0]+dx*j/n-nx*.0575,mz=a[1]+dz*j/n-nz*.0575,gold=fin&&j%fin===0;
   b.box(gold?'gold':mullion,mx,y+height/2-.03,mz,gold?.16:.12,height-.06,.405,rot);
  }
 }
}
// Lit interior partitions: a ring of warm-lit room walls set 5.5 m behind the
// curtain wall on every occupied level, read through the glass as lit rooms.
const convex=p=>{let sgn=0;for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],e=p[(i+2)%p.length],cr=(c[0]-a[0])*(e[1]-c[1])-(c[1]-a[1])*(e[0]-c[0]);if(Math.abs(cr)<1e-6)continue;if(sgn&&Math.sign(cr)!==sgn)return false;sgn=Math.sign(cr);}return true;};
function litCore(b,p,y,fh,q=null){
 const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);if(!q&&(fh<3||Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))<17||!convex(p)))return;
 q ||= inset(p,5.5);const sense=winding(q),wh=Math.min(3.1,fh-.9);
 for(let i=0;i<q.length;i++){const a=q[i],c=q[(i+1)%q.length],dx=c[0]-a[0],dz=c[1]-a[1],l=Math.hypot(dx,dz);if(l<.3)continue;b.pane(litWall,(a[0]+c[0])/2,y+wh/2,(a[1]+c[1])/2,l,wh,-Math.atan2(dz,dx)+(sense>0?Math.PI:0));}
}
function shell(b,p,y,h,levels,{skin='dark',bay=3.2,opaque=[],roof=true,glass='glazing',mullion='dark',fin=0,floor=litFloor,band=.42,hole=null,core=true}={}){
 const fh=h/levels,holes=hole?[hole]:[];
 if(!hole)(b.occupiedLevels ||= []).push({points:p,y,height:h,levels});
 // A shell stacked on another roof starts 4 cm higher and finishes 3 cm above that
 // roof's 32 cm plate, so neither soffits nor floor finishes coincide.
 for(let i=0;i<levels;i++){const stacked=i===0&&y>0;plate(b,stacked?inset(p,.07):p,y+i*fh+(stacked?.04:0),stacked?.31:.26,floor,holes);perimeter(b,p,y+i*fh+.26,fh-.26,{skin,bay,opaque,glass,mullion,fin,band});if(hole)perimeter(b,hole,y+i*fh+.26,fh-.26,{skin,bay,glass,mullion,fin,band,inward:true});else if(core)litCore(b,p,y+i*fh+(i===0&&y>0?.35:.26),fh-.26);
  // Ring plans: a lit corridor wall 3.5 m outside the court glazing faces the outer facade.
  if(hole&&core)litCore(b,p,y+i*fh+.26,fh-.26,inset(hole,-3.5));}
 if(!roof)return;
 plate(b,p,y+h,.32,skin,holes);
 roofCoping(b,p,y+h+.32,{center:centroid(p),skin});
 if(hole){const sense=-winding(hole);for(let i=0;i<hole.length;i++){const a=hole[i],c=hole[(i+1)%hole.length],dx=c[0]-a[0],dz=c[1]-a[1],l=Math.hypot(dx,dz);if(l<.05)continue;const nx=sense*dz/l,nz=-sense*dx/l;b.box(skin,(a[0]+c[0])/2-nx*.2,y+h+.52,(a[1]+c[1])/2-nz*.2,l+.02,.4,.42,-Math.atan2(dz,dx));b.box('steel',(a[0]+c[0])/2-nx*.2,y+h+.745,(a[1]+c[1])/2-nz*.2,l+.02,.05,.5,-Math.atan2(dz,dx));}}
}
// Continuous lit edge trim just proud of a slab outline.
function edgeGlow(b,p,y,mat='warm',off=.08){const sense=winding(p);for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],dx=c[0]-a[0],dz=c[1]-a[1],l=Math.hypot(dx,dz);if(l<.05)continue;b.box(mat,(a[0]+c[0])/2+sense*dz/l*off,y,(a[1]+c[1])/2-sense*dx/l*off,l+.04,.06,.06,-Math.atan2(dz,dx));}}
// Subdivide long edges so smooth deformations (pinches, bulges) stay continuous.
function resample(p,step){const out=[];for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],n=Math.max(1,Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/step));for(let j=0;j<n;j++)out.push([a[0]+(c[0]-a[0])*j/n,a[1]+(c[1]-a[1])*j/n]);}return out;}
// Front-most (max z) crossing of a closed outline at plan position x.
function frontZ(p,x){let z=-Infinity;for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length];if((a[0]-x)*(c[0]-x)<=0&&a[0]!==c[0])z=Math.max(z,a[1]+(c[1]-a[1])*(x-a[0])/(c[0]-a[0]));}return z;}
// Budget torus: tube and ring segment counts scale with the ring's visual size.
function hoop(b,mat,x,y,z,r,t=.3){const g=new T.TorusGeometry(r,t,t<.08?4:6,Math.max(24,Math.min(72,Math.round(r*5))));b.add(g,mat,x,y,z,1,1,1,0,Math.PI/2);g.dispose();}
function rail(b,p,y){perimeter(b,p,y,1.05,{skin:'steel',bay:3});}
function rounded(x,z,w,d,r=4){
 const pts=[];for(const [cx,cz,start] of [[x+w/2-r,z+d/2-r,0],[x-w/2+r,z+d/2-r,Math.PI/2],[x-w/2+r,z-d/2+r,Math.PI],[x+w/2-r,z-d/2+r,Math.PI*1.5]])for(let i=0;i<=6;i++){const a=start+i*Math.PI/12;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}return pts;
}
function beam(b,a,c,r=.12,mat='steel'){
 const av=new T.Vector3(...a),cv=new T.Vector3(...c),delta=cv.clone().sub(av);
 const geo=new T.CylinderGeometry(r,r,delta.length(),8);
 geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
 b.add(geo,mat,(a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2);geo.dispose();
}

function solar(b,x,y,z,w,d){b.box('solar',x,y,z,w,.14,d);for(let i=-w/2;i<=w/2;i+=2)b.box('steel',x+i,y+.10,z,.03,.018,d);for(let j=-d/2;j<=d/2;j+=2)b.box('steel',x,y+.10,z+j,w,.018,.025);}
function garden(b,x,y,z,w,d){b.box('stone',x,y+.18,z,w,.36,d);b.box('leaf',x,y+.40,z,w-.35,.18,d-.35);for(let i=0;i<Math.min(7,Math.floor(w/3));i++){const px=x-w*.38+i*w*.76/Math.max(1,Math.min(7,Math.floor(w/3))-1);roofTree(b,px,y+.50,z,1.4);}}
function office(b,x,y,z,cols=3){for(let i=0;i<cols;i++){const px=x+(i-(cols-1)/2)*3.2;b.box('stone',px,y+.85,z,2.2,.09,1);for(const dx of [-.85,.85])b.box('steel',px+dx,y+.42,z,.07,.8,.72);b.box('dark',px,y+1.28,z-.2,.78,.48,.07);b.box('dark',px,y+.52,z+.8,.5,.12,.5);b.box('dark',px,y+.86,z+1,.52,.6,.08);}}
function racks(b,x,y,z,n=5,scale=1,glow=false){for(let i=0;i<n;i++){const px=x+i*2*scale;b.box('dark',px,y+1.45*scale,z,1.2*scale,2.9*scale,1.1*scale);for(let j=0;j<8;j++){b.pane('steel',px,y+(.3+j*.32)*scale,z+.58*scale,scale,.22*scale);b.pane('cyan',px-.35*scale,y+(.3+j*.32)*scale,z+.63*scale,.06*scale,.05*scale);}if(glow)for(const e of [-.56,.56])b.pane('cyan',px+e*scale,y+1.45*scale,z+.62*scale,.05*scale,2.6*scale);}}
function machinery(b,x,y,z){b.box('white',x,y+1.1,z,2.7,2.2,2.1);b.box('glazing',x,y+1.25,z+1.06,1.8,1.4,.04);b.box('dark',x+1.05,y+1.6,z+1.1,.4,.65,.05);b.box('steel',x,y+.65,z+.3,1.4,.2,1);}
function entry(b,x,z,w,y=0){b.box('steel',x,y+3.1,z+.9,w,.12,2);for(const s of [-1,1]){b.box('steel',x+s*w/2,y+1.5,z,.10,3,.13);b.box('glazing',x+s*.7,y+1.45,z,1.35,2.85,.07);b.box('gold',x+s*.1,y+1.2,z+.08,.035,.6,.04);}b.box('path',x,y+.08,z+1.2,w+1,.16,2.8);}
function circle(x,z,r,n=48,a0=0,a1=Math.PI*2){const full=Math.abs(a1-a0-Math.PI*2)<1e-6,m=full?n:n+1;return Array.from({length:m},(_,i)=>[x+Math.cos(a0+(a1-a0)*i/n)*r,z+Math.sin(a0+(a1-a0)*i/n)*r]);}
function cylinderShell(b,x,z,r,h,levels=3,y=0,opts={}){const p=circle(x,z,r);shell(b,p,y,h,levels,{bay:4,...opts});return p;}
// Stylised campus mark: two raked lit legs, crossbar and apex cap, facing yaw rot.
function logoA(b,x,y,z,s,rot=0,mat='cyan'){
 const P=(u,v)=>[x+Math.cos(rot)*u,y+v,z-Math.sin(rot)*u];
 line(b,mat,[P(-.5*s,0),P(0,s)],s*.075);line(b,mat,[P(.5*s,0),P(0,s)],s*.075);line(b,mat,[P(-.22*s,.36*s),P(.22*s,.36*s)],s*.06);
}
// Media play mark: lit triangular outline.
function playMark(b,x,y,z,s,rot=0,mat='cyan'){const P=(u,v)=>[x+Math.cos(rot)*u,y+v,z-Math.sin(rot)*u];line(b,mat,[P(-.35*s,0),P(-.35*s,s)],s*.07);line(b,mat,[P(-.35*s,s),P(.5*s,.5*s)],s*.07);line(b,mat,[P(.5*s,.5*s),P(-.35*s,0)],s*.07);}
// Hexagonal foundry mark: six straight lit bars around a small core.
function hexMark(b,x,y,z,s,rot=0,mat='gold'){const P=(u,v)=>[x+Math.cos(rot)*u,y+v,z-Math.sin(rot)*u];for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6,c=a+Math.PI/3;line(b,mat,[P(Math.cos(a)*s*.5,s*.5+Math.sin(a)*s*.5),P(Math.cos(c)*s*.5,s*.5+Math.sin(c)*s*.5)],s*.05);}for(let i=0;i<3;i++){const a=i*Math.PI*2/3+Math.PI/2;line(b,mat,[P(0,s*.5),P(Math.cos(a)*s*.3,s*.5+Math.sin(a)*s*.3)],s*.04);}}
// Vertical dark brand pier with lit edge trims and the campus mark near its head.
function brandPier(b,x,z,w,hgt,{depth=1.2,rot=0,logo=.45,mark='cyan',y=0,play=false,hex=false,skin='dark'}={}){
 const fx=Math.sin(rot),fz=Math.cos(rot);
 b.box(skin,x,y+hgt/2,z,w,hgt,depth,rot);
 for(const s of [-1,1])b.box('gold',x+Math.cos(rot)*s*(w/2+.05),y+hgt/2,z-Math.sin(rot)*s*(w/2+.05),.1,hgt,depth*.7,rot);
 b.box('gold',x,y+hgt+.06,z,w+.2,.12,depth+.1,rot);
 if(logo){const size=w*logo;if(!hex)b.box('blueGlass',x+fx*(depth/2+.04),y+hgt-size*1.25,z+fz*(depth/2+.04),size*1.35,size*1.35,.05,rot);(play?playMark:hex?hexMark:logoA)(b,x+fx*(depth/2+.2),y+hgt-size*1.75,z+fz*(depth/2+.2),size,rot,mark);}
}
function louver(b,x,y,z,w,h){for(let i=-w/2;i<w/2;i+=1.2)b.box('copper',x+i,y+h/2,z,.12,h,.55);}
function water(b,x,y,z,w,d){b.box('stone',x,y,z,w,.3,d);b.box('water',x,y+.17,z,w-.35,.025,d-.35);}
function plantRoof(b,x,y,z,w,d){garden(b,x,y,z+d*.35,w*.84,d*.14);solar(b,x,y+.6,z-d*.12,w*.63,d*.4);}

const builders={
1(b,{w,d,h}){
 // Blue crystalline curtain tower with gold lit fins every fourth mullion.
 const body=rect(-w*.16,0,w*.61,d*.79);shell(b,body,0,h*.88,12,{bay:2.3,glass:blueCurtain,fin:4,floor:litFloorCool});
 // Sloping crown follows the asymmetric top edge in the atlas.
 const crown=inset([[-w*.465,-d*.395], [w*.145,-d*.395],[w*.145,d*.395],[-w*.465,d*.395]],.7),cb=h*.88+.32;
 const ys=[h*.97,h*.94,h*.88+.9,h*.92];const verts=[];
 for(let i=0;i<4;i++){const j=(i+1)%4;verts.push(crown[i][0],cb,crown[i][1],crown[j][0],cb,crown[j][1],crown[j][0],ys[j],crown[j][1],crown[i][0],cb,crown[i][1],crown[j][0],ys[j],crown[j][1],crown[i][0],ys[i],crown[i][1]);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();b.add(g,blueCurtain);g.dispose();
 for(let i=0;i<4;i++){const j=(i+1)%4;line(b,'gold',[[crown[i][0],ys[i],crown[i][1]],[crown[j][0],ys[j],crown[j][1]]],.14);beam(b,[crown[i][0],cb,crown[i][1]],[crown[i][0],ys[i],crown[i][1]],.16,'dark');}
 // Front-left full-height brand pier carrying the lit campus mark at its head.
 brandPier(b,-w*.36,d*.41,w*.20,h*.86,{depth:1.4,logo:.62});
 // Three cantilevered, round-fronted meeting suites with braced soffits.
 for(const fraction of [.20,.43,.66]){const y=h*fraction,p=rounded(w*.31,d*.12,w*.42,d*.55,w*.09);shell(b,p,y,h*.10,1,{bay:2.4});rail(b,p,y+h*.10+.35);garden(b,w*.31,y+h*.10+.4,d*.25,w*.33,2.6);office(b,w*.31,y,d*.12,4);for(const s of [-1,1])beam(b,[w*.12,y-4,d*.12+s*d*.23],[w*.5,y,d*.12+s*d*.23],.18,'dark');}
 // Oculus observation deck: overhanging round deck, glass balustrade, planted
 // ring and an open circular oculus framed by a lit gold rim.
 const cx=-w*.10,cz=-d*.02,top=h*.97,R=w*.27;
 cylinderShell(b,cx,cz,w*.13,top-h*.88,1,h*.88,{glass:blueCurtain});
 plate(b,circle(cx,cz,R,56),top,.55,'dark',[circle(cx,cz,R*.52,40)]);
 ring(b,'gold',cx,top+.56,cz,R,.09);ring(b,'gold',cx,top+.56,cz,R*.52,.07);ring(b,'warm',cx,top-.05,cz,R*.97,.05);
 perimeter(b,circle(cx,cz,R-.3,56),top+.55,1.15,{skin:'steel',bay:3});
 for(let i=0;i<14;i++){const a=i*Math.PI*2/14,rr=R*.76;b.box('stone',cx+Math.cos(a)*rr,top+.8,cz+Math.sin(a)*rr,2.2,.5,2.2,-a);roofTree(b,cx+Math.cos(a)*rr,top+1.05,cz+Math.sin(a)*rr,1.3);}
 for(let i=0;i<5;i++)cylinder(b,'steel',-w*.38+i*1.6,top+2.6+i%3,-d*.30,.10,4+i%3,.08,10);
 // Warm lit two-level podium and double entrance.
 shell(b,rect(0,d*.2,w*.95,d*.6),0,5,1,{floor:litFloorCool});entry(b,0,d*.505,w*.3);
 // Free-standing plaza monolith (reference far-left signage slab).
 brandPier(b,-w*.47,d*.36,w*.08,h*.30,{depth:1.6,rot:Math.PI/2,logo:.7});
},
2(b,{w,d,h}){
 // The atlas exposes the upper compute hall. The previous complete roof and
 // extra rooftop office concealed that defining program and added a fourth tier.
 const lower=h*.56,upper=h*.34,front=d*.42;
 shell(b,rect(0,0,w*.90,d*.84),0,lower,2,{skin:'dark',opaque:[0]});
 shell(b,rect(w*.22,-d*.025,w*.46,d*.79),lower,upper,1,{skin:'dark',opaque:[0],roof:false,floor:'night'});
 const control=rounded(-w*.225,-d*.065,w*.42,d*.47,2.2);
 shell(b,control,lower,upper,1,{skin:'dark',bay:2.2,roof:false,floor:'night'});
 // Cyan service-aisle floor lights between the open GPU rack rows.
 for(let row=0;row<5;row++)b.box('cyan',w*.22,lower+.40,-d*.24+row*d*.145,w*.40,.03,.12);
 // Rear weather roof, stepped plant enclosure and service access remain built.
 plate(b,rect(0,-d*.305,w*.90,d*.23),h*.90,.42,'dark');
 for(const [x,z,pw,pd,y,ph] of [[-.25,-.32,.30,.17,.90,.065],[.10,-.34,.33,.13,.90,.04],[-.07,-.385,.36,.095,.955,.045]]){
  b.box('dark',x*w,(y+ph/2)*h,z*d,pw*w,ph*h,pd*d);
  for(let xx=x*w-pw*w*.42;xx<x*w+pw*w*.43;xx+=2.4){b.box('steel',xx,(y+ph)*h+.04,z*d,1.6,.075,pd*d*.75);for(let q=0;q<5;q++)b.box('dark',xx-.62+q*.31,(y+ph)*h+.09,z*d,.13,.025,pd*d*.64);}
 }
 // Splayed concrete portal legs have an elevation taper, not a plan-only skew.
 function portalLeg(x,z,width,height,lean){
  const verts=[];for(const xx of [x-width/2,x+width/2])for(const [yy,zz] of [[0,z+1.0],[height,z-lean],[height,z-lean-1.7],[0,z-.7]])verts.push(xx,yy,zz);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);const flat=g.toNonIndexed();flat.computeVertexNormals();b.add(flat,'dark');flat.dispose();g.dispose();
 }
 for(const x of [-w*.43,w*.02])portalLeg(x,front,3.2,h*.64,3.3);
 for(const x of [-w*.44,w*.44])portalLeg(x,-d*.18,3.0,h*.90,2.5);
 b.box('dark',-w*.205,h*.60,front-1.45,w*.47,h*.13,2.1);
 b.box('copper',-w*.205,h*.532,front-.34,w*.43,.065,.09);
 // Curved mission-control display and its tiered operator consoles.
 for(let i=0;i<9;i++){
  const angle=(i-4)*.14,xx=-w*.225+Math.sin(angle)*w*.18,zz=-d*.06-Math.cos(angle)*d*.14;
  b.box('dark',xx,lower+upper*.50,zz,w*.036,upper*.54,.15,-angle);
  b.box('blueGlass',xx,lower+upper*.50,zz+.095,w*.032,upper*.47,.025,-angle);
 }
 for(const dz of [-.04,.11])office(b,-w*.225,lower,d*dz,4);
 // Open upper GPU banks with paired supply/return manifolds and service aisles.
 for(let row=0;row<4;row++){
  const z=-d*.17+row*d*.145,rackScale=upper/4.8;racks(b,w*.065,lower+.35,z,Math.max(4,Math.floor(w*.32/(2*rackScale))),rackScale,true);
  for(const [offset,mat] of [[-.26,'cyan'],[.26,'steel']]){
   const pipeY=lower+3.2*rackScale;
   const pts=[[w*.06,lower+.4,z+offset],[w*.06,pipeY-.3,z+offset],[w*.065+.3,pipeY,z+offset],[w*.37,pipeY,z+offset],[w*.38,pipeY-.3,z+offset],[w*.38,lower+.4,z+offset]];
   const tube=new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),20,.065,6,false);b.add(tube,mat);tube.dispose();
  }
 }
 // Rack glimpses and the secure operations gallery remain within the lower shell.
 for(let row=0;row<2;row++)racks(b,w*.07,.3,-d*.05+row*4,6);
 office(b,w*.22,h*.28,d*.29,5);
 for(let i=0;i<5;i++){const x=w*.07+i*w*.065;b.box('blueGlass',x,h*.28+2.4,d*.08,w*.055,2.2,.07);}
 // Raised entrance landing, direct-cooling cascade and contained pool.
 const landing=lower/2,steps=Math.ceil(landing/.18),run=steps*.30;
 for(let i=0;i<steps;i++){b.box('dark',-w*.20,(i+1)*landing/steps/2,front+run-i*.30,w*.25,(i+1)*landing/steps,.31);b.box('warm',-w*.20,(i+1)*landing/steps+.02,front+run-i*.30+.12,w*.25-.3,.035,.035);}
 logoA(b,-w*.40,h*.548,front-.28,h*.105,0,'gold');
 entry(b,-w*.20,front,w*.28,landing+.04);
 for(const x of [-w*.39,w*.02]){
  b.box('dark',x,landing/2,front+1.5,w*.14,landing,3);
  b.box('water',x,landing/2,front+3.02,w*.13,landing-.25,.035);
  for(let q=0;q<16;q++){const px=x-w*.06+q*w*.12/15;line(b,'blueGlass',[[px,landing-.2,front+3.08],[px,.3,front+3.25]],.024);}
  water(b,x,.13,front+4.1,w*.17,4.4);
 }
 for(const [x,z,gw,gd,y] of [[-.225,-.31,.36,.045,h*.91],[-.20,.35,.39,.05,lower+.34],[.40,.1,.045,.46,lower+.34]])garden(b,x*w,y,z*d,gw*w,gd*d);
},
3(b,{w,d,h}){
 // Only the entrance pavilion sits above ground. The atlas's large central
 // vault cylinder belongs to the two subterranean levels, not the skyline.
 const wingH=h*.38,centerH=h*.51;
 for(const side of [-1,1]){
  const wing=rounded(side*w*.265,-d*.06,w*.37,d*.54,Math.min(w*.13,d*.19));
  shell(b,wing,0,wingH,1,{skin:'dark',bay:1.7});
  // Bronze screen depth is visible independently from the glass mullions.
  for(let i=0;i<7;i++){const x=side*w*.265+(i-3)*w*.039+.4;b.box('gold',x,wingH*.48,d*.214,.09,wingH*.93,.30);}
  garden(b,side*w*.27,wingH+.35,-d*.09,w*.24,2.2);
  rail(b,wing,wingH+.33);
 }
 // Recessed secure core and raised center pavilion interrupt both rooflines.
 cylinderShell(b,0,-d*.17,w*.14,h*.46,1);
 shell(b,rect(0,d*.04,w*.29,d*.37),0,centerH,1,{skin:'dark',opaque:[0]});
 b.box('dark',0,centerH*.65,d*.233,w*.27,centerH*.63,.38);
 b.box(litWall,0,centerH*.72,d*.233+.21,w*.20,centerH*.34,.04);logoA(b,0,centerH*.60,d*.233+.36,centerH*.26,0,'gold');
 for(const y of [centerH*.335,centerH*.965])b.box('gold',0,y,d*.233+.2,w*.27,.12,.06);
 for(const side of [-1,1]){b.box('dark',side*w*.149,centerH*.5,d*.25,.35,centerH,.65);b.box('gold',side*w*.139,centerH*.52,d*.257,.055,centerH*.9,.08);}
 entry(b,0,d*.242,w*.20);entry(b,0,d*.13,w*.16);
 for(let i=0;i<6;i++)b.box('stone',0,.12+i*.13,d*.45-i*.8,w*.31,.24,.9);
 for(const side of [-1,1])cylinder(b,'steel',side*w*.33,.9,d*.34,.13,1.8,.13,12);
},

4(b,{w,d,h}){
 // Graphite-framed study wings with warm lit floors, gold fins every third bay.
 shell(b,rect(-w*.32,0,w*.30,d*.86),0,h,4,{fin:3});shell(b,rect(w*.32,-d*.04,w*.30,d*.78),0,h,4,{fin:3});shell(b,rect(0,-d*.32,w*.35,d*.22),0,h*.87,4);
 // Amber knowledge core: warm tinted glazed drum with a gold band at every floor.
 cylinderShell(b,0,-d*.08,w*.16,h*.96,4,0,{glass:amberGlass,mullion:'gold'});ring(b,'gold',0,h*.96+.5,-d*.08,w*.16+.5,.2);
 for(let level=1;level<4;level++)ring(b,'gold',0,level*h*.24+.4,-d*.08,w*.16+.4,.1);
 cylinder(b,litWall,0,h*.50,-d*.08,w*.064,h*.70,w*.064,32);
 // Right-hand dark monolith with the lit campus mark (reference front right).
 brandPier(b,w*.44,d*.40,w*.10,h*1.02,{depth:1.6,logo:.75});
 for(let level=0;level<4;level++){const y=level*h/4;office(b,-w*.31,y,0,5);for(let j=0;j<5;j++)b.box('copper',w*.27,y+.5+j*.2,-d*.04+j*2,w*.2,.4,1.2);}
 shell(b,rect(0,d*.32,w*.45,d*.22),0,h*.36,2,{fin:2});b.box('dark',0,h*.36-1.1,d*.43+.3,w*.40,1.6,.5);b.box('gold',0,h*.36-1.95,d*.43+.3,w*.40,.1,.56);plantRoof(b,-w*.32,h+.3,0,w*.28,d*.7);plantRoof(b,w*.32,h+.3,0,w*.28,d*.7);entry(b,0,d*.44,w*.26);
},
5(b,{w,d,h}){
 shell(b,rect(0,0,w*.94,d*.88),0,h*.40,1,{skin:'dark'});
 shell(b,rect(-w*.23,-d*.10,w*.47,d*.66),h*.40,h*.60,1,{skin:'dark',opaque:[0,3],roof:false});
 // Stage hall roof: glazed between dark steel trusses, revealing the LED volume.
 b.box('glazing',-w*.23,h+.06,-d*.10,w*.47,.05,d*.66);for(let i=0;i<=6;i++){const x=-w*.465+i*w*.47/6;b.box('dark',x,h+.15,-d*.10,.35,.7,d*.66+.3);}for(const z of [-d*.43,d*.23])b.box('dark',-w*.23,h+.15,z,w*.47+.3,.7,.35);shell(b,rect(w*.26,-d*.10,w*.40,d*.66),h*.40,h*.49,1,{skin:'dark',opaque:[0]});
 // Two full-height sound stages, an LED volume and physical lighting gantries.
 b.box('dark',-w*.24,h*.66,-d*.37,w*.43,h*.52,.5);b.box(ledWall,-w*.24,h*.66,-d*.37+.29,w*.40,h*.48,.04);
 for(const s of [-1,1])b.box('gold',-w*.24+s*w*.215,h*.66,-d*.37+.3,.12,h*.52,.12);
 for(let i=-2;i<=2;i++){beam(b,[-w*.45,h*.94,i*d*.1],[-w*.02,h*.94,i*d*.1],.09);for(let j=0;j<4;j++)b.box('warm',-w*.39+j*w*.10,h*.90,i*d*.1,.35,.25,.45);}
 shell(b,rect(w*.24,d*.30,w*.46,d*.25),h*.40,h*.22,1);office(b,w*.24,h*.40,d*.30,5);plantRoof(b,w*.26,h*.89+.3,-d*.12,w*.36,d*.5);entry(b,-w*.18,d*.45,w*.23);louver(b,-w*.30,0,d*.45,w*.12,h*.4);
 // Front-left NEXUS LABS media pier carrying the lit play mark.
 brandPier(b,-w*.43,d*.47,w*.11,h*.78,{depth:1.4,logo:.7,play:true});
},
6(b,{w,d,h}){
 shell(b,rect(0,0,w*.93,d*.89),0,h*.34,1);shell(b,rect(0,-d*.1,w*.85,d*.67),h*.34,h*.31,1);shell(b,rect(0,-d*.24,w*.80,d*.39),h*.65,h*.35,1);
 // Terrace rails, planters and review desks sit on the actual roof of the tier below.
 for(const [y,z,td,gz,oz,tw] of [[h*.34,d*.34,d*.19,d*.40,d*.16,w*.91],[h*.65,d*.095,d*.26,d*.17,-d*.20,w*.83]]){rail(b,rect(0,z,tw,td),y+.36);garden(b,0,y+.35,gz,w*.70,2);office(b,0,y,oz,6);}
 b.box('blueGlass',-w*.22,h*.82,-d*.39,w*.31,h*.20,.08);office(b,-w*.21,h*.66,-d*.18,4);plantRoof(b,0,h+.3,-d*.24,w*.78,d*.36);
 // Projecting SIGNAL VELOCITY entrance block: dark angled fascia with gold edges.
 const fy=h*.34;b.box('dark',-w*.08,fy-1.4,d*.47,w*.56,2.6,1.2);for(const y of [fy-2.75,fy-.05])b.box('gold',-w*.08,y,d*.47+.1,w*.56,.12,1.2);
 for(const s of [-1,1])b.box('dark',-w*.08+s*w*.28,(fy-2.85)/2,d*.47,1.1,fy-2.85,1.2);
 entry(b,-w*.08,d*.46,w*.34);
},
7(b,{w,d,h}){
 shell(b,rect(0,0,w*.92,d*.92),0,h*.70,2,{skin:'dark',opaque:[0]});shell(b,rect(-w*.22,-d*.15,w*.47,d*.60),h*.70,h*.3,1,{skin:'dark'});
 for(const side of [-1,1])for(let i=0;i<10;i++)b.box('copper',side*(w*.46+.12), h*.40,-d*.41+i*d*.084,.20,h*.75,.23);
 for(let iz=-2;iz<=2;iz++)for(let ix=-1;ix<=1;ix++)machinery(b,ix*w*.23,h*.35+.28,iz*d*.15);
 shell(b,rect(w*.25,d*.28,w*.38,d*.32),0,h*.34,1);office(b,w*.25,0,d*.28,3);// Shallow roof monitors expose a repeated clerestory silhouette instead
 // of the former single featureless lid. Their heights stay below the taller
 // print-farm block and differ from CF08's large folded high-bay roof.
 for(const [cx,cy,width] of [[-w*.22,h,w*.43],[w*.25,h*.70,w*.36]]){
  for(let i=0;i<3;i++){
   const z=-d*.34+i*d*.17,depth=d*.135,rise=1.5;
   const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute([cx-width/2,cy+.12,z-depth/2,cx+width/2,cy+.12,z-depth/2,cx+width/2,cy+rise,z+depth/2,cx-width/2,cy+.12,z-depth/2,cx+width/2,cy+rise,z+depth/2,cx-width/2,cy+rise,z+depth/2],3));roof.computeVertexNormals();b.add(roof,'steel');roof.dispose();
   b.box('glazing',cx,cy+rise*.5,z+depth/2,width,rise,.06);
   for(let q=-width/2;q<width/2;q+=2.8)b.box('dark',cx+q,cy+rise*.5,z+depth/2,.07,rise,.09);
   const pitch=Math.atan((rise-.12)/depth),panel=new T.BoxGeometry(1,1,1);b.add(panel,'solar',cx,cy+(rise+.12)*.5+.07,z,width*.70,.08,depth*.60/Math.cos(pitch),0,-pitch);panel.dispose();
  }
 }
 for(let i=0;i<3;i++){const x=-w*.17+i*w*.15;b.box('steel',x,h*.71+1.2,d*.10,2.7,2.4,2.1);for(let j=-3;j<=3;j++)b.box('dark',x+j*.30,h*.71+2.42,d*.10,.14,.035,1.9);}
entry(b,w*.25,d*.46,w*.24);
 solar(b,w*.05,h*.70+.55,d*.31,w*.70,d*.20);
 // Full-height BINARY LOOM brand block at the front-left corner with gold hex mark.
 brandPier(b,-w*.30,d*.475,w*.34,h*1.02,{depth:1.8,logo:.42,hex:true,mark:'gold'});
},
8(b,{w,d,h}){
 shell(b,rect(0,0,w*.94,d*.9),0,h*.83,1,{skin:'dark',bay:4.5,fin:3});
 // Four raised northlight bays, real folded roof sections and crane rails.
 for(let i=0;i<4;i++){const z=-d*.34+i*d*.22;const geo=new T.BufferGeometry(),z0=z-d*.105,z1=z+d*.105;geo.setAttribute('position',new T.Float32BufferAttribute([-w*.49,h*.83,z0,w*.49,h*.83,z0,w*.49,h,z1,-w*.49,h*.83,z0,w*.49,h,z1,-w*.49,h,z1],3));geo.computeVertexNormals();b.add(geo,'dark');geo.dispose();b.box('glazing',0,h*.915,z1,w*.96,h*.17,.05);const pitch=Math.atan(h*.17/(d*.21)),pane=new T.BoxGeometry(1,1,1);for(let x=-w*.4;x<w*.45;x+=w*.16)b.add(pane,'blueGlass',x,h*.915+.06,z,w*.10,.08,d*.13/Math.cos(pitch),0,-pitch);pane.dispose();}
 for(const x of [-w*.36,w*.36]){beam(b,[x,h*.69,-d*.42],[x,h*.69,d*.42],.23,'gold');for(let z=-d*.4;z<d*.45;z+=d*.2)b.box('steel',x,h*.345,z,.4,h*.69,.4);}
 for(const z of [-d*.2,d*.2]){b.box('gold',0,h*.70,z,w*.76,.8,1.3);beam(b,[0,h*.70,z],[0,h*.4,z],.06);cylinder(b,'dark',0,h*.38,z,.4,.6,.4,12);}
 for(let z=-d*.3;z<d*.4;z+=d*.2)for(const x of [-w*.2,w*.2]){machinery(b,x,0,z);b.box('gold',x, .10,z, w*.25,.10,d*.14);}
 // ANIMUS PRIME / TITAN WORKS brand block with the lit campus mark.
 brandPier(b,-w*.29,d*.465,w*.32,h*.86,{depth:1.2,logo:.36});entry(b,w*.23,d*.46,w*.24);
},
9(b,{w,d,h}){
 // Near-oval two-level logistics drum.
 const outer=rounded(0,0,w*.94,d*.90,d*.42);shell(b,outer,0,h*.57,2,{skin:'dark',bay:4,fin:4});
 // Continuous horseshoe landing deck open to the front court, carrying the
 // atlas's twenty autonomous-drone ports on its midline.
 const E=(rx,rz,cz,a)=>[Math.cos(a)*rx,cz+Math.sin(a)*rz],a0=Math.PI/2+.62,a1=Math.PI/2+Math.PI*2-.62,N=28;
 const shoe=[];for(let i=0;i<=N;i++)shoe.push(E(w*.44,d*.42,0,a0+(a1-a0)*i/N));for(let i=N;i>=0;i--)shoe.push(E(w*.25,d*.23,-d*.03,a0+(a1-a0)*i/N));
 shell(b,shoe,h*.57,h*.21,1,{bay:3.4,fin:3});
 for(let i=0;i<20;i++){
  const a=a0+.16+(a1-a0-.32)*i/19,[x,z]=E(w*.345,d*.325,-d*.015,a),r=Math.min(w,d)*.04,y=h*.78+.33;
  cylinder(b,'dark',x,y+.2,z,r,.4,r*1.08,28);hoop(b,'warm',x,y+.42,z,r*.95,.1);hoop(b,'gold',x,y+.43,z,r*.55,.07);
  b.box('white',x,y+.43,z,.16,.04,r*.8);b.box('white',x,y+.43,z,r*.5,.04,.16);
 }
 // Air-traffic control tower rising from the service court.
 cylinderShell(b,0,-d*.05,w*.045,h*.97,3,0,{fin:2});
 cylinderShell(b,0,-d*.05,w*.09,h*.19,1,h*.97,{glass:blueCurtain,mullion:'gold'});
 plate(b,circle(0,-d*.05,w*.10,40),h*1.16,.35,'dark');hoop(b,'gold',0,h*1.16+.36,-d*.05,w*.10,.12);hoop(b,'warm',0,h*.97+.3,-d*.05,w*.093,.08);
 cylinder(b,'steel',0,h*1.16+2.0,-d*.05,.12,3.3,.05,8);hoop(b,'cyan',0,h*1.16+1.5,-d*.05,.8,.05);
 // Front cross-docking bays and the VECTOR HUB fascia follow the curved drum face.
 const R=d*.42,cx0=w*.47-R,cz0=d*.45-R;
 const face=x=>{const ax=Math.abs(x);if(ax<=cx0)return [x,d*.45,0];const dx=ax-cx0,dz=Math.sqrt(Math.max(0,R*R-dx*dx));return [x,cz0+dz,Math.sign(x)*Math.atan2(dx,dz)];};
 for(let i=-2;i<=2;i++){const [x,z,yaw]=face(i*w*.13),nx=Math.sin(yaw),nz=Math.cos(yaw);b.box('dark',x+nx*.1,2.4,z+nz*.1,w*.10,4.8,.3,yaw);b.box('steel',x+nx*.75,4.9,z+nz*.75,w*.11,.18,1.4,yaw);b.box('warm',x+nx*.8,4.76,z+nz*.8,w*.085,.04,.9,yaw);}
 {const [x,z,yaw]=face(-w*.25),nx=Math.sin(yaw),nz=Math.cos(yaw),fx=x+nx*.75,fz=z+nz*.75;
  b.box('dark',fx,h*.47,fz,w*.30,h*.16,1.1,yaw);for(const y of [h*.39-.06,h*.55+.06])b.box('gold',fx,y,fz,w*.30,.12,1.12,yaw);
  const P=(u,v)=>[fx+nx*.75+Math.cos(yaw)*u,v,fz+nz*.75-Math.sin(yaw)*u],u0=-w*.115,s=h*.12;
  line(b,'gold',[P(u0-s*.42,h*.41+s),P(u0,h*.41)],s*.08);line(b,'gold',[P(u0+s*.42,h*.41+s),P(u0,h*.41)],s*.08);}
 entry(b,-w*.36,d*.37,w*.15);
},
10(b,{w,d,h}){
 shell(b,rect(0,0,w*.94,d*.9),0,h*.90,1,{skin:'dark',opaque:[0,1,3],bay:4});
 for(let x=-w*.44;x<w*.45;x+=1.1)b.box('steel',x,h*.53,-d*.451-.22,.08,h*.74,.13);
 for(let x=-w*.32;x<w*.4;x+=w*.22){b.box('dark',x,2.7,d*.452,w*.13,5.4,.2);b.box('steel',x,5.6,d*.48,w*.15,.2,2.3);for(let j=0;j<5;j++)b.box('steel',x,j+ .5,d*.455,w*.12,.035,.04);for(const side of [-1,1])cylinder(b,'gold',x+side*w*.075,.7,d*.49,.09,1.4,.09,10);}
 for(let z=-d*.28;z<d*.2;z+=5)racks(b,-w*.32,0,z,Math.floor(w*.65/2));
 // Reception mezzanine inside the main glazed hall (no duplicate facade).
 plate(b,inset(rect(-w*.30,d*.28,w*.32,d*.34),.6),h*.35,.26,litFloor);entry(b,-w*.30,d*.45,w*.20);solar(b,0,h*.90+.5,-d*.10,w*.77,d*.55);b.box('white',w*.32,h*.93,-d*.32,w*.15,1.1,d*.15);
 // Chamfered front-left CF-10 identity block and the side-wall campus mark panel.
 const cy=h*.95,ca=-Math.PI/4;b.box('dark',-w*.40,cy/2,d*.40,w*.20,cy,w*.20,ca);
 for(const y of [cy*.52,cy*.98])b.box('gold',-w*.40+Math.sin(ca)*(w*.10+.02),y,d*.40+Math.cos(ca)*(w*.10+.02),w*.20,.12,.12,ca);
 const band0=6.5,band1=h*.9-.6;b.box('dark',w*.155,(band0+band1)/2,d*.45+.42,w*.57,band1-band0,.3);b.box('gold',w*.155,band0-.06,d*.45+.4,w*.57,.12,.3);
 b.box('blueGlass',w*.28,h*.55,d*.45+.53,h*.34,h*.34,.04);logoA(b,w*.28,h*.43,d*.45+.7,h*.26,0,'cyan');
},
11(b,{w,d,h}){
 shell(b,rounded(0,0,w*.94,d*.89,8),0,h*.25,2,{skin:'dark',fin:3});
 // Glass grow towers: leaf trays, magenta grow-light rings and vertical LED bars.
 for(const [x,z,r,hh] of [[-.22,-.14,.20,1],[.23,-.12,.17,.83]]){
  cylinderShell(b,x*w,z*d,r*w,h*hh,Math.round(h*hh/6),0,{glass:growGlass});
  for(let y=4;y<h*hh-2;y+=4){hoop(b,'leaf',x*w,y,z*d,r*w*.86,.6);hoop(b,'magenta',x*w,y+.7,z*d,r*w*.85,.045);for(let a=0;a<Math.PI*2;a+=Math.PI/3)cylinder(b,'white',x*w+Math.cos(a)*r*w*.6,y+1.2,z*d+Math.sin(a)*r*w*.6,.16,2,.16,8);}
  for(let k=0;k<10;k++){const a=k*Math.PI/5+.3;b.box('magenta',x*w+Math.cos(a)*r*w*.72,h*hh*.5,z*d+Math.sin(a)*r*w*.72,.14,h*hh-3,.14,-a);}
 }
 // Sinuous stepped observation decks with gold lit edges.
 for(const [y,scale] of [[h*.25,1],[h*.48,.85],[h*.70,.65]]){const p=rounded(w*.10,d*.12,w*.8*scale,d*.63,9);plate(b,p,y,.45,'dark');edgeGlow(b,p,y-.08);rail(b,p,y+.45);garden(b,w*.13,y+.5,d*.40,w*.58*scale,2.5);}
 // Tall living-wall spine with a rounded crown: planted face on a dark frame.
 const lx=-w*.32,lz=d*.37,lw=w*.25,lh=h*.94;
 b.box('dark',lx,lh/2,lz,lw,lh,1);
 {const g=new T.CylinderGeometry(lw/2,lw/2,1,24,1,false,-Math.PI/2,Math.PI);g.rotateX(-Math.PI/2);b.add(g,'dark',lx,lh,lz);g.dispose();}
 for(const sx of [-1,1])b.box('gold',lx+sx*(lw/2+.06),lh/2,lz,.12,lh,1.05);
 b.box('leaf',lx,lh*.49,lz+.53,lw-.6,lh*.94,.06);
 for(let x=-w*.43;x<-w*.21;x+=1.6)for(let y=3;y<lh-2;y+=2.1){const g=new T.SphereGeometry(.95,6,4);b.add(g,'leaf',x+((y*7)%1.2)-.6,y,d*.37+.62,1,.9,.45);g.dispose();}
 logoA(b,lx,lh*.62,lz+1.25,lw*.30,0,'gold');
 for(let i=0;i<5;i++)cylinder(b,'steel',-w*.18+i*3,h*.27,d*.11,1.1,3,1.1,16);entry(b,w*.17,d*.45,w*.20);
},
12(b,{w,d,h}){
 // One continuous pale sinuous loop of three occupied levels around a planted
 // court: thick white bands alternate with dark glazing ribbons.
 // Front and rear elevations pinch at mid-length, giving the atlas's lobed plan.
 const pinch=(p,k,cz=0)=>resample(p,3.2).map(([x,z])=>[x,cz+(z-cz)*(1-k*Math.exp(-((x/(w*.17))**2)))]);
 const outer=pinch(rounded(0,0,w*.94,d*.90,d*.30),.13),court=pinch(rounded(0,-d*.01,w*.60,d*.50,d*.19),.24,-d*.01);
 shell(b,outer,0,h,3,{skin:'white',band:4.6,hole:court,bay:3.2});
 for(let k=1;k<=3;k++){edgeGlow(b,outer,k*h/3-4.65,'warm',.18);edgeGlow(b,court,k*h/3-4.65,'warm',-.18);}
 rail(b,outer.map(([x,z])=>[x*.985,z*.98]),h+.32);
 for(const x of [-w*.375,w*.375]){garden(b,x,h+.3,-d*.05,w*.12,d*.40);solar(b,x,h+.9,d*.28,w*.10,d*.10);for(let y=0;y<h-2;y+=h/3)for(let z=-d*.2;z<d*.35;z+=d*.22)machinery(b,x,y+.28,z);}
 for(const z of [-d*.30,d*.30])garden(b,0,h+.3,z,w*.30,d*.06);
 garden(b,0,.2,0,w*.20,d*.30);
 // Tall lit double-helix sculpture in the court.
 cylinder(b,'stone',0,.8,0,w*.035,1.6,w*.04,24);
 for(let i=0;i<44;i++){const a=i*Math.PI/7,y=2+i*.42;for(const s of [0,Math.PI]){const x=Math.sin(a+s)*1.9,z=Math.cos(a+s)*1.9;cylinder(b,s?'white':'cyan',x,y,z,.12,.5,.12,8);}if(i%2===0)beam(b,[Math.sin(a)*1.9,y,Math.cos(a)*1.9],[-Math.sin(a)*1.9,y,-Math.cos(a)*1.9],.05,'steel');}
 // VITALITY CENTER white sign fin with gold mark at the front-left entrance.
 brandPier(b,-w*.20,frontZ(outer,-w*.20)+.8,w*.11,h*.62,{depth:1.2,logo:.55,mark:'gold',skin:'white'});
 entry(b,w*.02,frontZ(outer,w*.02)+.1,w*.18);
}
};

// Near-camera furnishings use actual visible room positions and program-specific
// equipment. Each group is independent of the structural shell for distance LOD.
function chair(b,x,y,z,ry=0){
 b.box('dark',x,y+.47,z,.55,.12,.52,ry);b.box('dark',x-Math.sin(ry)*.23,y+.80,z-Math.cos(ry)*.23,.55,.58,.085,ry);
 cylinder(b,'steel',x,y+.23,z,.035,.4,.035,8);
 for(let j=0;j<4;j++){const a=j*Math.PI/2;beam(b,[x,y+.13,z],[x+Math.cos(a)*.32,y+.07,z+Math.sin(a)*.32],.022);}
}
function meeting(b,x,y,z,w=5){
 const p=rounded(x,z,w,1.7,.5);plate(b,p,y+.8,.10,'copper');
 for(const side of [-1,1]){b.box('dark',x+side*w*.28,y+.4,z,.12,.8,1.05);for(let j=-1;j<=1;j++)chair(b,x+j*w*.28,y,z+side*1.25,side<0?Math.PI:0);}
}
function display(b,x,y,z,w,h){b.box('dark',x,y,z,w+.12,h+.12,.14);b.box('blueGlass',x,y,z+.085,w,h,.025);for(let i=0;i<3;i++)b.box('cyan',x-w*.35+i*w*.24,y-h*.2+i*h*.12,z+.105,w*.18,.025,.009);}
function pipe(b,points,r=.05){for(let i=0;i<points.length-1;i++)beam(b,points[i],points[i+1],r,'steel');}
function printedMachine(b,x,y,z){
 b.box('dark',x,y+.2,z,1.1,.4,1);for(const side of [-1,1])for(const back of [-1,1])b.box('steel',x+side*.49,y+1,z+back*.44,.055,1.6,.055);
 b.box('glazing',x,y+1,z+.47,.95,1.45,.035);b.box('white',x,y+1.83,z,1.12,.12,1.02);b.box('steel',x,y+.75,z,.85,.05,.82);
 beam(b,[x-.44,y+1.4,z],[x+.44,y+1.4,z],.035);b.box('dark',x+.12,y+1.32,z,.18,.20,.18);cylinder(b,'white',x,y+.95,z,.16,.35,.12,10);display(b,x+.35,y+.3,z+.515,.20,.13);
}
function robotCell(b,x,y,z){
 cylinder(b,'steel',x,y+.20,z,.6,.4,.6,12);
 const joints=[[x,y+.5,z],[x,y+1.6,z],[x+.9,y+2.5,z],[x+1.7,y+1.65,z]];
 for(let i=0;i<joints.length-1;i++)beam(b,joints[i],joints[i+1],i===0?.18:.13,'white');
 for(const [xx,yy,zz] of joints)cylinder(b,'dark',xx,yy,zz,.20,.22,.20,10);
 for(const side of [-1,1])beam(b,[x+1.7,y+1.65,z],[x+1.8,y+1.40,z+side*.13],.045,'steel');
 for(const side of [-1,1]){b.box('gold',x+side*2.3,y+.85,z,.045,1.7,3.5);for(let q=-1.5;q<1.7;q+=.4)b.box('steel',x+side*2.34,y+.85,z+q,.025,1.7,.025);}
}
function occupiedDetails(b,f){const {id,w,d,h}=f;const tags=[];
 switch(id){
 case 1:
  for(const frac of [.20,.43,.66]){const y=h*frac+.28;meeting(b,w*.31,y,d*.14,7);display(b,w*.30,y+2.7,-d*.12+1,6.5,2.6);tags.push('cantilever meeting suite');}
  for(let level=1;level<11;level+=2)office(b,-w*.20,level*h*.88/12+.28,d*.28,5);
  break;
 case 2:
  // The upper hall is authored in the shell's exposed section. Detail remains
  // on its real slabs; the obsolete rooftop meeting suite has been removed.
  for(const z of [-d*.04,d*.11])for(let i=-1;i<=1;i++)chair(b,-w*.225+i*3.2,h*.56+.28,z+.8,Math.PI);
  for(let row=0;row<2;row++){const z=d*.17-row*5;racks(b,-w*.20,.28,z,5);pipe(b,[[-w*.23,3.5,z],[w*.02,3.5,z],[w*.02,.5,z]]);}
  tags.push('liquid-cooled rack manifolds','mission-control consoles');break;
 case 3:
  for(const side of [-1,1]){office(b,side*w*.265,.28,0,2);display(b,side*w*.265,2.7,-d*.17,3.5,1.4);}
  for(const side of [-1,1]){b.box('steel',side*1.45,.65,d*.13,.22,1.3,.7);display(b,side*1.45,1.28,d*.13+.38,.15,.20);b.box('glazing',side*.9,.65,d*.13,1,1.05,.035);}tags.push('biometric entry lanes','secure reception');break;
 case 4:
  for(let level=0;level<4;level++){
   const y=level*h/4+.28;for(const x of [-w*.40,-w*.24]){for(const z of [-d*.19,d*.08]){b.box('copper',x,y+1.2,z,1.7,2.4,.48);for(let row=0;row<5;row++){b.box('stone',x,y+.25+row*.44,z+.26,1.6,.05,.5);for(let j=-2;j<=2;j++)b.box(j%2?'dark':'white',x+j*.27,y+.43+row*.44,z+.24,.19,.31,.25);}}}
   for(let j=-2;j<=2;j++)chair(b,w*.3+j*1.6,y+.20,d*.10,Math.PI);
  }tags.push('library stacks','lecture seating');break;
 case 5:
  for(let i=-1;i<=1;i++){const x=-w*.25+i*3,y=h*.40+.28,z=d*.02;for(let j=0;j<3;j++){const a=j*Math.PI*2/3;beam(b,[x,y+1.35,z],[x+Math.cos(a)*.6,y+.05,z+Math.sin(a)*.6],.025);}b.box('dark',x,y+1.48,z,.5,.35,.65);cylinder(b,'dark',x,y+1.48,z+.37,.16,.22,.13,10);}
  meeting(b,w*.24,.28,d*.18,4);for(let j=-1;j<=1;j++)pipe(b,[[w*.24+j*1.15,1.15,d*.18],[w*.24+j*1.15,1.55,d*.18+.25]],.025);
  for(let j=0;j<8;j++)b.box('dark',w*.42,h*.59,-d*.32+j*1.5,.25,h*.25,.8);tags.push('production cameras and tripods','podcast microphones','acoustic wall baffles');break;
 case 6:
  for(const [y,z] of [[.28,d*.2],[h*.34+.28,0],[h*.65+.28,-d*.20]]){meeting(b,0,y,z,6);for(let j=-1;j<=1;j++)display(b,j*2.4,y+2.4,z-3,2.1,1.25);}
  tags.push('campaign review tables','analytics display walls');break;
 case 7:
  for(let row=0;row<2;row++)for(let col=0;col<4;col++)printedMachine(b,-w*.33+col*3.2,h*.70+.28,-d*.28+row*5);
  for(let i=-1;i<=1;i++){const x=w*.24+i*2.8;office(b,x,.28,d*.32,1);cylinder(b,'steel',x,1.5,d*.32,.18,.35,.12,10);}
  tags.push('enclosed print farm','prototype gallery benches');break;
 case 8:
  for(const x of [-w*.30,w*.30])for(const z of [-d*.29,0,d*.33])robotCell(b,x,.28,z);
  tags.push('articulated assembly robots','machine safety cages');break;
 case 9:
  for(let i=-2;i<=2;i++){const x=i*w*.16;for(let j=0;j<3;j++){b.box('dark',x+(j-1)*.8,.85,d*.30,.65,1.5,.7);display(b,x+(j-1)*.8,1.4,d*.30+.37,.35,.25);b.box('gold',x+(j-1)*.8,.3,d*.30+.4,.50,.055,.04);}}
  office(b,0,h*.84+.28,-d*.13,2);tags.push('battery-swap cabinets','air traffic console');break;
 case 10:
  for(let i=-1;i<=1;i++){const x=i*w*.22,z=d*.32;b.box('steel',x,.7,z,3,.12,4);for(let j=0;j<10;j++){const geo=new T.CylinderGeometry(.07,.07,2.9,8);geo.rotateZ(Math.PI/2);b.add(geo,'steel',x,.80,z-1.8+j*.4);geo.dispose();}for(const side of [-1,1])b.box('steel',x+side*1.3,.35,z,.07,.7,3.4);b.box('copper',x,.98,z,1.3,.25,1.1);}
  tags.push('receiving roller conveyors','staging pallets');break;
 case 11:
  for(let i=0;i<4;i++){const x=-w*.15+i*3.3,y=h*.25+.5,z=d*.14;pipe(b,[[x,y,z],[x,y+2.7,z],[x+1.6,y+2.7,z],[x+1.6,y+.8,z]]);for(let j=0;j<3;j++)cylinder(b,'white',x+.8,y+.6+j*.7,z,.35,.45,.30,10);}
  office(b,w*.20,.28,d*.28,3);tags.push('irrigation manifolds','crop analytics station');break;
 case 12:
  for(const side of [-1,1])for(let level=0;level<3;level++){
   const x=side*w*.30,y=level*h/3+.28,z=d*.21;
   b.box('white',x,y+.72,z,1.8,.22,3);b.box('white',x,y+.38,z,1.05,.65,1.9);b.box('white',x,y+.98,z-1.1,1.65,.32,.7);
   pipe(b,[[x+1.5,y+.2,z-.3],[x+1.5,y+2.5,z-.3],[x+.5,y+2.5,z-.3]]);display(b,x-1.5,y+1.5,z,.75,.55);office(b,x,y,-d*.15,2);
  }tags.push('clinical examination pods','overhead service rails','research workstations');break;
 }
 return tags;
}
function facadeIdentity(b,f){const {id,w,d,h}=f;
 if(id===1){for(let i=0;i<6;i++){const x=-w*.43+i*w*.105;b.box('steel',x,h*.44,d*.398,.09,h*.88,.30);if(i%2===0)b.box('warm',x+.06,h*.44,d*.40,.025,h*.84,.035);}}
 if(id===4){for(let i=0;i<16;i++){const a=i*Math.PI/8;beam(b,[Math.cos(a)*w*.064,1,-d*.08+Math.sin(a)*w*.064],[Math.cos(a)*w*.064,h*.87,-d*.08+Math.sin(a)*w*.064],.055,'gold');}}
 if(id===5){for(let i=-2;i<=2;i++){const x=-w*.22+i*w*.09;beam(b,[x,h*.40,-d*.10],[x,h*.97,-d*.10],.085);}}
 if(id===7){for(let i=0;i<20;i++){const x=-w*.44+i*w*.043;b.box('copper',x,h*.38,d*.466,.09,h*.69,.5);}}
 if(id===8){for(let x=-w*.40;x<w*.42;x+=w*.20)beam(b,[x,h*.84,-d*.43],[x,h*.84,d*.43],.10);}
 if(id===11){for(let y=5;y<h*.7;y+=8)b.box('stone',-w*.32,y,d*.401,w*.25,.14,.12);}
}
const atlasGlazing=materials.glazing.clone();
atlasGlazing.name='Atlas neutral clear architectural glazing';atlasGlazing.color.set(0xc1d0d0);atlasGlazing.opacity=.20;atlasGlazing.metalness=.02;atlasGlazing.roughness=.11;atlasGlazing.envMapIntensity=.6;atlasGlazing.depthWrite=false;

function nearDetailFactory(f,levels){
 // This closure retains only the facility description and numeric floor outlines, never a built Batch or
 // merged geometry. Fine equipment is allocated on the first close approach.
 return function createNearDetail(){
  const batch=new Batch(),tags=occupiedDetails(batch,f);
  if(![8,10,11].includes(f.id))for(const q of levels)for(let k=0;k<q.levels;k++)occupiedBays(batch,q.points,q.y+k*q.height/q.levels+.28,q.height/q.levels-.28);
  const detail=batch.finish(`${f.key}-occupied-detail`);
  detail.userData.nearDetail=true;detail.userData.programDetails=tags;
  detail.traverse(o=>{o.userData.facility=f.id;if(o.isMesh&&o.material===materials.glazing)o.material=atlasGlazing;});
  return detail;
 };
}

// Architectural nameplates mounted 5 cm proud of the authored fascia faces.
const signAnchors={
 2:({w,d,h})=>({text:'COLLECTIVE AI',width:w*.34,height:h*.034,position:[-w*.205,h*.628,d*.42-.35]}),
 5:({w,d,h})=>({text:'NEXUS LABS',width:w*.10,height:w*.022,position:[-w*.43,h*.78*.16,d*.47+.75]}),
 6:({w,d,h})=>({text:'SIGNAL VELOCITY',width:w*.46,height:1.5,position:[-w*.08,h*.34-1.4,d*.47+.65]}),
 7:({w,d,h})=>({text:'BINARY LOOM',width:w*.26,height:2,position:[-w*.30,5,d*.475+.95]}),
 8:({w,d,h})=>({text:'ANIMUS PRIME',width:w*.25,height:2.6,position:[-w*.29,6,d*.465+.65]}),
 9:({w,d,h})=>{const R=d*.42,cx0=w*.47-R,cz0=d*.45-R,x=-w*.25,dx=Math.abs(x)-cx0,dz=Math.sqrt(R*R-dx*dx),yaw=-Math.atan2(dx,dz),nx=Math.sin(yaw),nz=Math.cos(yaw),u=w*.035;
  return {text:'VECTOR HUB',width:w*.19,height:h*.075,yaw,position:[x+nx*1.45+Math.cos(yaw)*u,h*.47,cz0+dz+nz*1.45-Math.sin(yaw)*u]};},
 10:({w,d,h})=>({text:'CF-10',width:w*.15,height:h*.12,yaw:-Math.PI/4,position:[-w*.40-Math.SQRT1_2*(w*.10+.06),h*.95*.75,d*.40+Math.SQRT1_2*(w*.10+.06)]}),
 12:({w,d,h})=>({text:'VITALITY CENTER',width:w*.10,height:.95,position:[-w*.20,3.2,d*.45*(1-.13*Math.exp(-((.20/.17)**2)))+1.45]}),
};
export function createFacility01to12(f,{deferDetails=false}={}){
 const build=builders[f.id];if(!build)return null;
 const b=new Batch();b.box('path',0,.10,0,f.w+8,.2,f.d+8);build(b,f);facadeIdentity(b,f);
 const root=b.finish(`${f.key}-atlas-shell`);
 const anchor=signAnchors[f.id]?.(f);if(anchor)root.userData.signAnchor=anchor;
 const createNearDetail=nearDetailFactory(f,b.occupiedLevels||[]);
 if(deferDetails)root.userData.createNearDetail=createNearDetail;else root.add(createNearDetail());
 root.userData.facility=f.id;root.userData.referenceSource=`CF-${String(f.id).padStart(2,'0')}_Facility_Infographic.png`;
 root.userData.referenceInterpretation='Observed facade reconstruction; hidden elevations and dimensions inferred';
 root.traverse(o=>{o.userData.facility=f.id;if(o.isMesh&&o.material===materials.glazing)o.material=atlasGlazing;});

 root.userData.sculptRuntime={parts:root.children.map(c=>c.name),clickable:true};return root;
}
