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
  const y=i*h/levels;rounded(b,'glass',x,y+.8,z,w+.1,d+.1,h/levels-1.3,Math.min(w,d)*.20);
  rounded(b,'dark',x,y+h/levels-.65,z,w+1,d+1,.65,Math.min(w,d)*.20);
  for(let q=-w*.34;q<w*.35;q+=2.4)for(const side of [-1,1]){b.box('gold',x+q,y+h/levels*.5,z+side*d*.5,.15,h/levels-.8,.18);if(Math.round(q*10)%3!==0)b.box('warm',x+q+.65,y+h/levels*.48,z+side*(d*.5+.03),.85,h/levels*.56,.03);}
 }
 rounded(b,'stone',x,h,z,w+1.2,d+1.2,.5,Math.min(w,d)*.20);rounded(b,'leaf',x,h+.5,z,w-4,d-4,.4,Math.min(w,d)*.18);
}
export function referenceExterior(b,f,{block,drum}){const {w,d,h,id}=f;
 if(id===1){
  // CF-01 is a slender rectangular tower with a round Oculus and three broad occupied cantilevers.
  block(b,0,0,w*1.12,d*1.06,10,2);block(b,-w*.20,-d*.08,w*.55,d*.65,h,12);
  for(const side of [-1,1])for(let x=-w*.46;x<w*.10;x+=2.4)b.box('gold',x,h*.5,side*d*.34-d*.08,.14,h,.18);
  cylinder(b,'glass',-w*.19,h+1,-d*.08,w*.285,5);ring(b,'gold',-w*.19,h+3.7,-d*.08,w*.30,.34);
  for(let a=0;a<6.28;a+=Math.PI/8){const x=-w*.19+Math.sin(a)*w*.28,z=-d*.08+Math.cos(a)*w*.28;b.box('gold',x,h+2,z,.12,4,.12);}
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
  if(id===28){for(let i=0;i<4;i++){cylinder(b,'white',-w*.32+i*w*.21,h+1,-d*.25,w*.065,2);cylinder(b,'glass',-w*.32+i*w*.21,h+2.1,-d*.25,w*.06,.15);}}
  return true;
 }
 if(id===9){
  block(b,0,0,w,d,h,3);for(let x=-w*.31;x<w*.4;x+=w*.31)for(let z=-d*.28;z<d*.4;z+=d*.56){cylinder(b,'dark',x,h+1,z,w*.14,.5);ring(b,'gold',x,h+1.3,z,w*.13,.15);b.box('white',x,h+1.32,z,2,.08,5);}
  drum(b,0,0,w*.09,h+14);for(let x=-w*.35;x<w*.4;x+=w*.14)b.box('dark',x,3.3,d*.51,w*.10,6.6,.3);return true;
 }
 if(id===15){
  block(b,0,0,w,d,h,2);b.box('grass',0,h+1,0,w*.78,.3,d*.65);
  const pts=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;pts.push([Math.cos(a)*w*.44,h+1.2,Math.sin(a)*d*.41]);}line(b,'track',pts,2.8);line(b,'white',pts.map(([x,y,z])=>[x,y+.03,z]),.1);
  for(let x=-w*.35;x<w*.4;x+=w*.116)b.box('white',x,h+1.19,0,.12,.035,d*.6);return true;
 }
 if(id===16){block(b,0,-d*.08,w,d*.82,h,2);curvedWing(b,0,d*.29,w*1.08,d*.28,7,1);return true;}
 if(id===17){block(b,-w*.31,0,w*.33,d,h,2);block(b,w*.26,-d*.3,w*.52,d*.38,h*.8,1);for(let i=0;i<4;i++){const x=-w*.02+i*w*.16;b.box('glass',x,4,d*.19,w*.13,8,d*.39);b.box('solar',x,8.2,d*.19,w*.15,.25,d*.42);}return true;}
 if(id===25){block(b,-w*.32,0,w*.35,d,h,2);block(b,w*.32,0,w*.35,d,h,2);drum(b,0,0,w*.20,h*1.15);for(let y=4;y<h;y+=5)ring(b,'leaf',0,y,0,w*.19,1);return true;}
 if(id===30){
  block(b,-w*.32,0,w*.35,d,h,3);block(b,w*.32,0,w*.35,d,h,3);block(b,0,-d*.26,w*.30,d*.46,h*.96,3);
  drum(b,0,d*.05,w*.12,h*1.16);block(b,0,d*.38,w*.36,d*.25,h*.57,2);
  for(let x=-w*.44;x<w*.48;x+=w*.11){b.box('dark',x,h*.39,d*.505,1.45,h*.78,1);b.box('gold',x+.57,h*.39,d*.522,.14,h*.78,1.05);}
  // Physical key insignia, prominent on the entry tower in CF-30.
  ring(b,'warm',0,h*.44,d*.512,w*.035,.24,0);b.box('warm',0,h*.34,d*.512,.45,h*.15,.3);b.box('warm',w*.024,h*.29,d*.512,w*.05,.4,.3);
  return true;
 }
 return false;
}
