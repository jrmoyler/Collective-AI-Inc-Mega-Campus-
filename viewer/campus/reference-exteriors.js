// @ts-nocheck
// Facility infographic silhouettes take precedence over aerial illustration shapes.
// Site positions remain untouched. Floor-program counts are never inferred from artwork.
import * as T from 'three';
import {cylinder,ring,line} from './geometry.js';
function rounded(b,mat,x,y,z,w,d,h,r=4){
 const s=new T.Shape(),a=w/2,c=d/2;r=Math.min(r,a,c);
 s.moveTo(-a+r,-c);s.lineTo(a-r,-c);s.quadraticCurveTo(a,-c,a,-c+r);s.lineTo(a,c-r);s.quadraticCurveTo(a,c,a-r,c);s.lineTo(-a+r,c);s.quadraticCurveTo(-a,c,-a,c-r);s.lineTo(-a,-c+r);s.quadraticCurveTo(-a,-c,-a+r,-c);
 const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:8});g.rotateX(-Math.PI/2);b.add(g,mat,x,y,z);g.dispose();
}
// A perimeter sampled at architectural bay spacing: straight elevations stay
// straight, rounded corners carry continuous glazing and real frame depth.
function wingPerimeter(w,d,r){
 const points=[];
 for(const [cx,cz,start] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]]){
  for(let i=0;i<=8;i++){const a=start+i*Math.PI/16;points.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}
 }
 const bays=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],c=points[(i+1)%points.length],n=Math.max(1,Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/3.2));
  for(let j=0;j<n;j++)bays.push([a[0]+(c[0]-a[0])*j/n,a[1]+(c[1]-a[1])*j/n]);
 }
 return bays;
}
function curvedWing(b,x,z,w,d,h,levels=2,cladding='stone'){
 const r=Math.min(w,d)*.20,bays=wingPerimeter(w,d,r),fh=h/levels;
 // Opaque service core is recessed, allowing depth and occupied floor plates
 // to show through the facade instead of a black monolithic extrusion.
 rounded(b,'civic',x,0,z,w*.38,d*.45,h,1);
 for(let floor=0;floor<levels;floor++){
  const y=floor*fh;
  rounded(b,cladding,x,y,z,w+.35,d+.35,.32,r);
  for(let i=0;i<bays.length;i++){
   const a=bays[i],c=bays[(i+1)%bays.length],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),rot=-Math.atan2(dz,dx);
   const px=x+(a[0]+c[0])/2,pz=z+(a[1]+c[1])/2;
   b.box('glazing',px,y+fh*.5,pz,len,fh-.65,.055,rot);
   b.box(cladding,px,y+fh-.48,pz,len,.66,.16,rot);
   b.box('steel',x+a[0],y+fh*.5,z+a[1],.10,fh,.10);
   b.box('stone',px,y+.51,pz,len,.36,.18,rot);
   // Interior ceiling ribbon is recessed behind the glass, not random lights.
   if(i%3===0)b.box('warm',x+(px-x)*.94,y+fh-.9,z+(pz-z)*.94,Math.max(.2,len-.3),.045,.075,rot);
  }
  // Restrained communal seating at the two long glazed elevations.
  for(const side of [-1,1])for(let q=-w*.25;q<=w*.25;q+=6){
   b.box('copper',x+q,y+.5,z+side*(d/2-2.3),2.4,.18,.65);
   for(const dx of [-.9,.9])b.box('dark',x+q+dx,y+.24,z+side*(d/2-2.3),.08,.45,.48);
  }
 }
 rounded(b,cladding,x,h,z,w+.8,d+.8,.38,r);
 rounded(b,'dark',x,h+.38,z,w-.25,d-.25,.38,r);
 rounded(b,'leaf',x,h+.76,z,w-3,d-3,.12,Math.max(.4,r-1.5));
 // Narrow perimeter parapet made of actual frames and glass panels.
 for(let i=0;i<bays.length;i++){
  const a=bays[i],c=bays[(i+1)%bays.length],dx=c[0]-a[0],dz=c[1]-a[1],rot=-Math.atan2(dz,dx),len=Math.hypot(dx,dz);
  const px=x+(a[0]+c[0])/2,pz=z+(a[1]+c[1])/2;
  b.box('glazing',px,h+1.05,pz,len,1.05,.035,rot);
  b.box('steel',px,h+1.6,pz,len,.065,.065,rot);
 }
}
export function referenceExterior(b,f,{block,drum}){const {w,d,h,id}=f;
 if(id===1){
  // CF-01 infographic: vertical curtain wall, occupied cantilevers and a roof
  // oculus. The former cone-like taper contradicted this governing reference.
  block(b,-w*.17,0,w*.67,d*.83,h,12,'dark');
  b.box('dark',-w*.5,h*.4,d*.24,w*.12,h*.79,d*.34);
  for(const y of [h*.23,h*.47,h*.71]){
   block(b,w*.34,d*.13,w*.54,d*.53,8,1,'dark',y);
   b.box('leaf',w*.34,y+8.5,d*.13,w*.45,.3,d*.44);
   for(const side of [-1,1])b.box('glazing',w*.34,y+9.2,d*.13+side*d*.25,w*.53,1.2,.025);
  }
  cylinder(b,'stone',-w*.13,h+.35,0,w*.25,.5);
  cylinder(b,'glazing',-w*.13,h+2.3,0,w*.25,3.8);
  ring(b,'gold',-w*.13,h+4.3,0,w*.265,.16);
  ring(b,'cyan',-w*.13,h+4.5,0,w*.263,.075);
  for(let a=0;a<Math.PI*2;a+=Math.PI/16){
   const xx=-w*.13+Math.sin(a)*w*.25,zz=Math.cos(a)*w*.25;
   b.box('steel',xx,h+2.3,zz,.09,3.8,.09);
  }
  for(let i=0;i<7;i++)cylinder(b,'steel',-w*.37+i*1.9,h+3+i%3,-d*.28,.16,6+i%3*3);
  return true;
 }
 if([6,18,19,23,29,31,32,33,34,35].includes(id)){
  const wing=w*.30,gap=w*.40;
  block(b,-w*.35,0,wing,d,h,2);block(b,w*.35,0,wing,d,h*.96,2);block(b,0,-d*.32,gap,d*.36,h*.94,2);
  b.box('path',0,.22,d*.06,gap,.4,d*.69);for(let x=-gap*.34;x<gap*.4;x+=5){cylinder(b,'stone',x,.7,d*.1,1.3,1.2);cylinder(b,'leaf',x,2,d*.1,1.8,2,1.1,9);}
  if([6,23,31,32,33].includes(id))block(b,0,d*.34,gap,d*.22,h*.58,1);
  if(id===18){b.box('dark',0,8,d*.35,w*.8,.5,8);for(let x=-w*.35;x<w*.4;x+=w*.17)b.box('gold',x,4,d*.39,.4,8,.4);}
  if(id===19){for(let x=-w*.43;x<w*.45;x+=3)b.box('gold',x,h*.48,d*.51,.3,h*.93,.35);}
  if(id===35){for(let x=-w*.35;x<w*.4;x+=6)b.box('leaf',x,h+1,-d*.32,4,.5,5);}
  return true;
 }
 if([12,13,14,24,28].includes(id)){
  // CF-12/13 governing cutaways show open planted terraces, not domes.
  // CF-14/24 use satin graphite ribbons; CF-12 has pale clinical cladding.
  const skin=id===12?'white':id===13?'steel':id===28?'stone':'dark';
  curvedWing(b,-w*.27,0,w*.46,d,h,2,skin);
  curvedWing(b,w*.27,0,w*.46,d,h*.94,2,skin);
  curvedWing(b,0,-d*.33,w*.5,d*.34,h,2,skin);
  b.box('path',0,.2,0,w*.10,.3,d*.6);
  // The sunken central landscape remains visible from the entrance.
  rounded(b,'stone',0,.15,d*.18,w*.12,d*.24,.5,2);
  rounded(b,'leaf',0,.65,d*.18,w*.10,d*.21,.15,1.6);
  for(const side of [-1,1]){
   const roof=side<0?h:h*.94;
   b.box('solar',side*w*.27,roof+1,-d*.15,w*.28,.16,d*.27);
   for(let i=-3;i<=3;i++)b.box('steel',side*w*.27+i*w*.04,roof+1.1,-d*.15,.028,.018,d*.27);
  }
  if(id===12||id===13){
   // A recessed glazed link at the first occupied terrace joins both wings.
   block(b,0,d*.24,w*.22,d*.18,4.2,1,skin,h*.47);
   if(id===13){
    b.box('stone',w*.5,1.2,d*.10,1.4,2.4,d*.48);
    b.box('water',w*.5+.73,1.28,d*.10,.06,2.1,d*.40);
    b.box('stone',w*.5+1.5,.2,d*.10,2,.3,d*.49);
    b.box('water',w*.5+1.5,.37,d*.10,1.65,.025,d*.45);
   }
  }
  if(id===28){for(let i=0;i<4;i++){cylinder(b,'white',-w*.32+i*w*.21,h+1,-d*.25,w*.065,2);cylinder(b,'glass',-w*.32+i*w*.21,h+2.1,-d*.25,w*.06,.15);}}
  return true;
 }
 if(id===9){
  block(b,0,0,w,d,h,3);for(let x=-w*.31;x<w*.4;x+=w*.31)for(let z=-d*.28;z<d*.4;z+=d*.56){cylinder(b,'dark',x,h+1,z,w*.14,.5);ring(b,'gold',x,h+1.3,z,w*.13,.15);b.box('white',x,h+1.32,z,2,.08,5);}
  drum(b,0,0,w*.42,h);cylinder(b,'grass',0,h+.6,0,w*.32,.25);ring(b,'road',0,h+1.05,0,w*.28,5.5);ring(b,'kinetic',0,h+1.12,0,w*.28,.22);
  cylinder(b,'glass',0,h+2.2,0,w*.12,4);ring(b,'gold',0,h+4.4,0,w*.14,.45);
  for(let x=-w*.35;x<w*.4;x+=w*.14)b.box('dark',x,3.3,d*.51,w*.10,6.6,.3);return true;
 }
 if(id===11){
  for(const [fx,fz,fr,fh] of [[-.22,0,.26,h],[.2,-.22,.22,h*.86],[.28,.24,.18,h*.64]]){
   drum(b,fx*w,fz*d,fr*w,fh);
   for(let y=6;y<fh;y+=6){
    ring(b,'leaf',fx*w,y,fz*d,fr*w-.5,1.1);
    ring(b,'magenta',fx*w,y+1.1,fz*d,fr*w-.2,.16);
   }
  }
  block(b,-w*.34,d*.36,w*.28,d*.28,14,2);
  return true;
 }
 if(id===15){
  block(b,0,-d*.4,w,d*.18,h,2);b.box('grass',0,1.05,0,w*.78,.35,d*.62);
  for(const side of [-1,1])for(let i=0;i<5;i++)b.box('stone',0,1.1+i*.85,side*(d*.32+i*1.35),w*.92,.7,1.15);
  const pts=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;pts.push([Math.cos(a)*w*.44,1.35,Math.sin(a)*d*.4]);}
  line(b,'track',pts,2.8);line(b,'white',pts.map(([x,y,z])=>[x,y+.04,z]),.1);
  for(let x=-w*.35;x<w*.4;x+=w*.116)b.box('white',x,1.22,0,.12,.035,d*.6);
  for(const x of [-w*.42,w*.42]){b.box('white',x,8,0,.2,16,.2);b.box('warm',x,16.2,0,6,.5,.4);}
  ring(b,'white',0,1.4,0,9,.16);return true;
 }
 if(id===16){block(b,0,-d*.08,w,d*.82,h,2);curvedWing(b,0,d*.29,w*1.08,d*.28,7,1);drum(b,0,0,Math.min(w,d)*.42,h);return true;}
 if(id===17){block(b,-w*.31,0,w*.33,d,h,2);block(b,w*.26,-d*.3,w*.52,d*.38,h*.8,1);for(let i=0;i<4;i++){const x=-w*.02+i*w*.16;b.box('glass',x,4,d*.19,w*.13,8,d*.39);b.box('solar',x,8.2,d*.19,w*.15,.25,d*.42);}return true;}
 if(id===20){
  drum(b,0,0,w*.7,14);
  cylinder(b,'blueGlass',0,h*.5,0,w*.28,h*.86,w*.1,8);
  for(let a=0;a<Math.PI*2;a+=Math.PI/3)line(b,'stone',[[Math.sin(a)*w*.52,10,Math.cos(a)*w*.52],[Math.sin(a)*w*.12,h*.82,Math.cos(a)*w*.12],[0,h,0]],.7);
  [14,h*.55,h*.78,h*.92].forEach(y=>ring(b,'cyan',0,y,0,w*(y<20?.68:.24),.5));
  cylinder(b,'violet',0,h+8,0,.28,18,.08);ring(b,'violet',0,h+2,0,w*.2,.55);
  return true;
 }
 if(id===25){block(b,-w*.32,0,w*.35,d,h,2);block(b,w*.32,0,w*.35,d,h,2);drum(b,0,0,w*.20,h*1.15);for(let y=4;y<h;y+=5)ring(b,'leaf',0,y,0,w*.19,1);return true;}
 if(id===30){
  block(b,-w*.32,0,w*.35,d,h,3);block(b,w*.32,0,w*.35,d,h,3);block(b,0,-d*.26,w*.30,d*.46,h*.96,3);
  drum(b,0,d*.05,w*.12,h*1.16);block(b,0,d*.38,w*.36,d*.25,h*.57,2);
  for(let x=-w*.44;x<w*.48;x+=w*.11){b.box('dark',x,h*.39,d*.505,1.45,h*.78,1);b.box('gold',x+.57,h*.39,d*.522,.14,h*.78,1.05);}
  ring(b,'warm',0,h*.44,d*.512,w*.035,.24,0);b.box('warm',0,h*.34,d*.512,.45,h*.15,.3);b.box('warm',w*.024,h*.29,d*.512,w*.05,.4,.3);
  return true;
 }
 return false;
}
