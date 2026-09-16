import * as T from 'three';
import {Batch,cylinder,ring,line,sign,materials} from './geometry.js';
function block(b,x,z,w,d,h,levels=3){
 b.box('dark',x,h/2,z,w,h,d);
 for(let k=0;k<levels;k++){
  const y=(k+.5)*h/levels;
  b.box('glass',x,y,z,w+.15,h/levels-1.25,d+.15);
  for(const side of [-1,1]){
   b.box('gold',x,(k+1)*h/levels,z+side*d/2,w+.8,.38,.45);
   b.box('gold',x+side*w/2,(k+1)*h/levels,z,.45,.38,d+.8);
   for(let q=-w/2+2;q<w/2;q+=3.2){
    b.box('stone',x+q,y,z+side*(d/2+.2),.25,h/levels,.35);
    if((Math.round(q*10)+k)%3!==0)b.box('warm',x+q+1.15,y,z+side*(d/2+.12),1.6,h/levels-2,.12);
   }
   for(let q=-d/2+2;q<d/2;q+=3.4){b.box('stone',x+side*(w/2+.2),y,z+q,.35,h/levels,.25);if(k%2===0)b.box('warm',x+side*(w/2+.12),y,z+q+1,.12,h/levels-2,1.3);}
  }
 }
 b.box('stone',x,h+.4,z,w+1.5,.8,d+1.5);
 b.box('dark',x,h+.9,z,w-3,.3,d-3);
 for(let q=0;q<Math.max(2,w/14);q++){b.box('solar',x-w*.36+q*11,h+1.4,z-d*.16,9,.35,d*.34);for(let j=0;j<5;j++)b.box('stone',x-w*.36+q*11-4+j*2,h+1.6,z-d*.16,.08,.06,d*.34);}
 for(let q=0;q<3;q++){b.box('stone',x-w*.25+q*5,h+2,z+d*.3,3.3,2,3);cylinder(b,'dark',x-w*.25+q*5,h+3.1,z+d*.3,1.1,.25);}
 b.box('gold',x,4,z+d/2+3,w*.38,.55,6);
 for(const s of [-1,1])b.box('stone',x+s*w*.18,2,z+d/2+5,.5,4,.5);
}
function drum(b,x,z,r,h){
 cylinder(b,'glass',x,h/2,z,r,h,r,48);cylinder(b,'stone',x,h,z,r+.8,.7,r+.8,48);
 for(let y=5;y<h;y+=5)ring(b,'gold',x,y,z,r+.2,.26);
 for(let a=0;a<Math.PI*2;a+=Math.PI/24){const xx=x+Math.sin(a)*r,zz=z+Math.cos(a)*r;b.box('stone',xx,h/2,zz,.35,h,.35);if(Math.round(a*24)%3!==0)b.box('warm',x+Math.sin(a)*(r-.1),h*.4,z+Math.cos(a)*(r-.1),1.5,h*.65,.2,-a);}
}
function dome(b,x,z,r,h){
 drum(b,x,z,r,7);
 const geo=new T.SphereGeometry(r,40,18,0,Math.PI*2,0,Math.PI/2);b.add(geo,'glass',x,7,z,1,h/r,1);geo.dispose();
 for(let a=0;a<Math.PI*2;a+=Math.PI/10){const pts=[];for(let t=0;t<=Math.PI/2+.01;t+=Math.PI/24)pts.push([x+r*Math.sin(t)*Math.cos(a),7+h*Math.cos(t),z+r*Math.sin(t)*Math.sin(a)]);line(b,'gold',pts,.28);}
 for(let t=.3;t<1.5;t+=.3)ring(b,'stone',x,7+h*Math.cos(t),z,r*Math.sin(t),.24);
}
export function createFacility(f){
 const b=new Batch();const {w,d,h,form}=f;
 b.box('path',0,.16,0,w+12,.3,d+12);
 if(form==='prism'){
  block(b,0,0,w*1.2,d*1.15,10,2);
  // Faceted tapered shell with independently rising crown fins.
  const pts=[[-w*.42,-d*.35],[w*.3,-d*.45],[w*.48,d*.2],[0,d*.43],[-w*.43,d*.2]];
  const vertices=[];
  for(let i=0;i<5;i++){const a=pts[i],c=pts[(i+1)%5],top=h+(i===0?12:i===2?-7:0);vertices.push(...[a[0],10,a[1],c[0],10,c[1],c[0]*.63,top,c[1]*.63,a[0],10,a[1],c[0]*.63,top,c[1]*.63,a[0]*.63,h,a[1]*.63]);line(b,'stone',[[a[0],10,a[1]],[a[0]*.63,h,a[1]*.63]],.75);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();b.add(g,'glass');g.dispose();
  for(let y=15;y<h-5;y+=6){const s=1-(y-10)/(h-10)*.37;for(let i=0;i<5;i++){const a=pts[i],c=pts[(i+1)%5];line(b,y%12===3?'warm':'gold',[[a[0]*s,y,a[1]*s],[c[0]*s,y,c[1]*s]],.23);}}
  cylinder(b,'gold',0,h+9,0,.45,23,.15);ring(b,'cyan',0,4,0,w*.75,.45);
 }else if(form==='spire'){
  drum(b,0,0,w*.72,12);cylinder(b,'glass',0,h*.48,0,w*.29,h*.82,w*.13,8);
  for(let a=0;a<6.28;a+=Math.PI/3)line(b,'stone',[[Math.sin(a)*w*.55,8,Math.cos(a)*w*.55],[Math.sin(a)*w*.13,h*.82,Math.cos(a)*w*.13],[0,h,0]],.8);
  [12,h*.65,h*.83].forEach(y=>ring(b,'cyan',0,y,0,w*(y===12?.7:.27),.55));cylinder(b,'cyan',0,h,0,.45,14,.1);
 }else if(['dome','bio'].includes(form)){
  if(form==='dome')dome(b,0,0,w*.46,h-7);
  else {block(b,0,-d*.24,w,d*.45,12,2);[-.33,0,.33].forEach(x=>dome(b,x*w,d*.23,w*.16,17));}
 }else if(form==='garden'){
  for(const [x,z,r,hh] of [[-.25,0,.24,h],[.17,-.24,.22,h*.88],[.3,.23,.18,h*.67]]){drum(b,x*w,z*d,r*w,hh);for(let y=4;y<hh;y+=5){ring(b,'leaf',x*w,y,z*d,r*w-.7,1);ring(b,'warm',x*w,y+1,z*d,r*w,.15);}}
  block(b,-w*.32,d*.34,w*.25,d*.27,13,2);
 }else if(form==='ring'){
  const r=w*.45;drum(b,0,0,r,h);cylinder(b,'grass',0,h+.55,0,r*.75,.2);ring(b,'road',0,h+1,0,r*.62,4);ring(b,'stone',0,h+1.1,0,r*.62,.2);cylinder(b,'glass',0,h+2,0,r*.3,3);ring(b,'gold',0,h+4,0,r*.34,.5);
 }else if(form==='stadium'){
  block(b,0,-d*.39,w,d*.2,15,2);b.box('grass',0,1,0,w*.75,.3,d*.65);
  for(const side of [-1,1])for(let i=0;i<4;i++)b.box('stone',0,1+i*.7,side*(d*.35+i*1.2),w,.6,1);
  for(let x=-w*.36;x<=w*.36;x+=w*.12)b.box('white',x,1.2,0,.12,.05,d*.62);
  for(const x of [-w*.4,w*.4]){b.box('white',x,3.8,0,.15,5.5,.15);b.box('white',x,6.5,0,.15,.15,8);}
  ring(b,'white',0,1.3,0,8,.15);
 }else if(form==='transit'){
  block(b,0,0,w*.88,d*.7,13,2);
  for(let j=0;j<5;j++){const pts=[];for(let k=0;k<=20;k++){const x=-w*.52+k*w*1.04/20;pts.push([x,15+Math.sin(k*Math.PI/20)*13+(j%2)*1,z(j)]);}line(b,j%2?'gold':'stone',pts,1.1);}
  function z(j){return (j-2)*d*.19;}
  const geo=new T.SphereGeometry(1,40,16,0,Math.PI*2,0,Math.PI/2);b.add(geo,'glass',0,14,0,w*.51,14,d*.48);geo.dispose();
 }else if(form==='greenhouses'){
  for(let x=-w*.38;x<w*.48;x+=w*.24){block(b,x,0,w*.2,d,8,1);for(let z=-d*.4;z<d*.5;z+=5)b.box('leaf',x,9,z,w*.15,.5,2);}
 }else if(form==='village'){
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z+=2)block(b,x*w*.32,z*d*.28,w*.26,d*.36,10+(x===0?5:0),2);
 }else if(form==='round'||form==='civic'){
  drum(b,0,0,Math.min(w,d)*.47,h);ring(b,'gold',0,h+1,0,w*.32,.4);cylinder(b,'grass',0,h+.5,0,w*.29,.5);if(form==='civic')dome(b,0,0,w*.2,12);
 }else if(form==='academy'||form==='vault'||form==='gardenlow'){
  block(b,-w*.34,0,w*.32,d,h,Math.min(4,f.levels+1));block(b,w*.34,0,w*.32,d,h,Math.min(4,f.levels+1));block(b,0,-d*.32,w*.4,d*.35,h*.88,3);
  b.box('grass',0,.5,d*.12,w*.3,.5,d*.65);for(let x=-w*.42;x<w*.5;x+=6)b.box('stone',x,h*.28,d*.51,.8,h*.56,.8);
  if(form==='vault')drum(b,0,-d*.1,w*.13,h*.8);
 }else {
  block(b,0,0,w,d,h,Math.min(4,f.levels+1));
  if(form==='sawtooth')for(let x=-w/2+w/12;x<w/2;x+=w/6){const pitch=w/6;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-pitch/2,0,-d/2,pitch/2,0,-d/2,0,5,-d/2,-pitch/2,0,d/2,pitch/2,0,d/2,0,5,d/2],3));geo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);geo.computeVertexNormals();b.add(geo,'stone',x,h+1,0);geo.dispose();} 
  if(form==='factory'||form==='warehouse'||form==='sawtooth')for(let x=-w*.35;x<w*.4;x+=w/5){b.box('dark',x,3.4,d/2+.25,7,6,.5);b.box('gold',x,6.8,d/2+2,8,.4,4);}
  if(form==='utility')for(let i=0;i<3;i++){cylinder(b,'stone',-w*.25+i*w*.25,h+9,-d*.15,3,18);ring(b,'cyan',-w*.25+i*w*.25,h+16,-d*.15,3,.18);}
  if(form==='water')for(let x=-1;x<=1;x+=2){cylinder(b,'stone',x*w*.68,2,0,11,4);cylinder(b,'glass',x*w*.68,4.2,0,10,.2);}
 }
 const root=b.finish(f.key);root.position.set(f.x,0,f.z);root.userData.facility=f.id;root.traverse(o=>{o.userData.facility=f.id;});
 const label=sign(f.key+'  '+f.name.toUpperCase(),Math.min(w*.85,48),3);label.position.set(0,Math.min(h*.65,12),d/2+.7);root.add(label);label.userData.facility=f.id;
 root.userData.sculptRuntime={parts:root.children.map(c=>c.name),clickable:true};return root;
}
