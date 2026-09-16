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
function curvedWing(b,x,z,w,d,h,levels=2){
 rounded(b,'dark',x,0,z,w,d,h,Math.min(w,d)*.20);
 for(let i=0;i<levels;i++){
  const y=i*h/levels;
  rounded(b,'dark',x,y+h/levels-.4,z,w+.55,d+.55,.38,Math.min(w,d)*.20);
  for(let q=-w*.32;q<w*.33;q+=5.6){
   if(((Math.round(q)+i)&1)===0)continue;
   for(const side of [-1,1])b.box('warmWin',x+q,y+h/levels*.52,z+side*d*.5,1.7,h/levels*.4,.08);
  }
 }
 rounded(b,'stone',x,h,z,w+1.2,d+1.2,.5,Math.min(w,d)*.20);rounded(b,'leaf',x,h+.5,z,w-4,d-4,.4,Math.min(w,d)*.18);
}
export function referenceExterior(b,f,{block,drum}){const {w,d,h,id}=f;
 if(id===1){
  // Aerial: crystalline blue HQ. Infographic: oculus crown and occupied cantilevers.
  block(b,0,0,w*1.12,d*1.06,10,2);
  const pts=[[-w*.42,-d*.35],[w*.3,-d*.45],[w*.48,d*.2],[0,d*.43],[-w*.43,d*.2]];
  const vertices=[];
  for(let i=0;i<5;i++){
   const a=pts[i],c=pts[(i+1)%5],top=h+(i===0?14:i===2?-6:2);
   vertices.push(a[0],10,a[1],c[0],10,c[1],c[0]*.55,top,c[1]*.55,a[0],10,a[1],c[0]*.55,top,c[1]*.55,a[0]*.55,h,a[1]*.55);
   line(b,'gold',[[a[0],10,a[1]],[a[0]*.55,h,a[1]*.55]],.6);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  b.add(g,'blueGlass');g.dispose();
  for(let y=16;y<h-4;y+=7){
   const s=1-(y-10)/(h-10)*.42;
   for(let i=0;i<5;i++){
    const a=pts[i],c=pts[(i+1)%5];
    line(b,y%14<7?'warmWin':'gold',[[a[0]*s,y,a[1]*s],[c[0]*s,y,c[1]*s]],.22);
   }
  }
  b.box('warmWin',0,(10+h)*.5,0,w*.16,h-16,d*.16);
  cylinder(b,'gold',0,h+12,0,.4,26,.12);
  ring(b,'cyan',0,h+4,0,w*.16,.4);
  ring(b,'violet',0,4.2,0,w*.78,.5);
  cylinder(b,'glass',-w*.18,h+1,-d*.06,w*.26,5);
  ring(b,'gold',-w*.18,h+3.6,-d*.06,w*.28,.32);
  for(let a=0;a<6.28;a+=Math.PI/8){
   const x=-w*.18+Math.sin(a)*w*.26,z=-d*.06+Math.cos(a)*w*.26;
   b.box('gold',x,h+2,z,.12,4,.12);
  }
  for(const side of [-1,1]){
   b.box('blueGlass',side*w*.36,h*.42,d*.16,w*.26,7,d*.4);
   b.box('gold',side*w*.36,h*.42+3.7,d*.16,w*.28,.22,d*.42);
   b.box('warmWin',side*w*.36,h*.42,d*.16+d*.2,w*.2,5,.12);
  }
  for(let i=0;i<7;i++)cylinder(b,'steel',-w*.32+i*2,h+5+i%3,-d*.15,.16,8+i%3*3);
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
  curvedWing(b,-w*.27,0,w*.46,d,h,2);curvedWing(b,w*.27,0,w*.46,d,h*.94,2);curvedWing(b,0,-d*.33,w*.5,d*.34,h,2);
  b.box('path',0,.2,0,w*.10,.3,d*.6);ring(b,'gold',0,.5,d*.29,w*.13,.22);
  if(id===12||id===13){
   const r=Math.min(w,d)*.28;
   const geo=new T.SphereGeometry(r,40,18,0,Math.PI*2,0,Math.PI/2);
   b.add(geo,'blueGlass',0,h*.55,0,1,(id===12?18:14)/r,1);geo.dispose();
   ring(b,'gold',0,h*.55+2,0,r*.6,.28);
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
