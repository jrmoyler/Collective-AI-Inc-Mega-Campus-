// @ts-nocheck
import * as T from 'three';
import {referenceExterior} from './reference-exteriors.js';
import {addSignature} from './signatures.js';
import {Batch,cylinder,ring,line,sign} from './geometry.js';

function skinFor(form){
 if(form==='utility')return 'dark';
 if(['factory','warehouse','sawtooth'].includes(form))return 'copper';
 if(['civic','academy','round'].includes(form))return 'civic';
 if(['office','vault','village'].includes(form))return 'white';
 if(form==='water')return 'copper';
 return 'stone';
}
function occ(q,k,salt){
 return ((Math.imul((Math.round(q*4)+k*19+salt*7)|0,2654435761)>>>0)%10)>3;
}
function block(b,x,z,w,d,h,levels=3,skin='stone'){
 const body=['dark','copper','civic','white'].includes(skin)?skin:'stone';
 const floors=Math.max(1,levels);
 const fh=h/floors;
 const cap=floors>=3?.92:1;
 b.box(body,x,h*cap/2,z,w,h*cap,d);
 if(cap<1)b.box(body,x,h*cap+(h*(1-cap))/2,z,w*.86,h*(1-cap),d*.86);
 for(const sx of [-1,1])for(const sz of [-1,1])b.box(body,x+sx*(w/2-.32),h*.48,z+sz*(d/2-.32),.64,h*.96,.64);
 for(let k=0;k<floors;k++){
  if(k===0&&fh<4.5)continue;
  const y=(k+.55)*fh;
  const ww=Math.min(2.3,Math.max(1.35,fh*.36));
  const wh=fh*.4;
  for(const side of [-1,1]){
   for(let q=-w/2+3.2;q<w/2-2.4;q+=6.6){
    if(!occ(q,k,side+2))continue;
    b.box('warmWin',x+q,y,z+side*(d/2+.06),ww,wh,.07);
   }
   for(let q=-d/2+3.5;q<d/2-2.6;q+=7.1){
    if(!occ(q,k,side+8)||k%2)continue;
    b.box('warmWin',x+side*(w/2+.06),y,z+q,.07,wh*.88,ww*.82);
   }
  }
 }
 b.box('stone',x,h+.24,z,w+1,.34,d+1);
 if(w>18)b.box('solar',x-w*.14,h+.5,z-d*.16,w*.36,.12,d*.26);
 b.box('leaf',x+w*.08,h+.44,z+d*.18,w*.32,.2,d*.18);
 if(w>22)b.box('dark',x+w*.28,h+.68,z-d*.2,3.1,1.05,2.4);
 b.box('gold',x,2.7,z+d/2+2,Math.min(w*.28,11),.26,3.2);
 for(const s of [-1,1])b.box(body,x+s*w*.14,1.35,z+d/2+2.9,.3,2.7,.3);
}

function drum(b,x,z,r,h){
 cylinder(b,'glass',x,h/2,z,r,h,r,48);
 cylinder(b,'stone',x,h,z,r+.8,.7,r+.8,48);
 for(let y=5;y<h;y+=5)ring(b,'gold',x,y,z,r+.2,.26);
 for(let a=0;a<Math.PI*2;a+=Math.PI/24){
  const xx=x+Math.sin(a)*r,zz=z+Math.cos(a)*r;
  b.box('stone',xx,h/2,zz,.35,h,.35);
  if(Math.round(a*24)%3!==0)b.box('warmWin',x+Math.sin(a)*(r-.1),h*.4,z+Math.cos(a)*(r-.1),1.5,h*.65,.2,-a);
 }
}

function dome(b,x,z,r,h){
 drum(b,x,z,r,7);
 const geo=new T.SphereGeometry(r,40,18,0,Math.PI*2,0,Math.PI/2);
 b.add(geo,'blueGlass',x,7,z,1,h/r,1);geo.dispose();
 for(let a=0;a<Math.PI*2;a+=Math.PI/10){
  const pts=[];
  for(let t=0;t<=Math.PI/2+.01;t+=Math.PI/24)pts.push([x+r*Math.sin(t)*Math.cos(a),7+h*Math.cos(t),z+r*Math.sin(t)*Math.sin(a)]);
  line(b,'gold',pts,.28);
 }
 for(let t=.3;t<1.5;t+=.3)ring(b,'stone',x,7+h*Math.cos(t),z,r*Math.sin(t),.24);
 ring(b,'cyan',x,8+h*.15,z,r*.35,.28);
}

export function createFacility(f){
 const b=new Batch();const {w,d,h,form}=f;
 b.box('path',0,.16,0,w+12,.3,d+12);
 b.box('leaf',0,.2,0,w+20,.1,d+20);
 if(referenceExterior(b,f,{block,drum})){
  // Infographic silhouette takes precedence over aerial family.
 }else if(form==='prism'){
  block(b,0,0,w*1.2,d*1.15,10,2);
  const pts=[[-w*.42,-d*.35],[w*.3,-d*.45],[w*.48,d*.2],[0,d*.43],[-w*.43,d*.2]];
  const vertices=[];
  for(let i=0;i<5;i++){
   const a=pts[i],c=pts[(i+1)%5],top=h+(i===0?12:i===2?-7:0);
   vertices.push(a[0],10,a[1],c[0],10,c[1],c[0]*.63,top,c[1]*.63,a[0],10,a[1],c[0]*.63,top,c[1]*.63,a[0]*.63,h,a[1]*.63);
   line(b,'gold',[[a[0],10,a[1]],[a[0]*.63,h,a[1]*.63]],.75);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  b.add(g,'blueGlass');g.dispose();
  for(let y=15;y<h-5;y+=6){
   const s=1-(y-10)/(h-10)*.37;
   for(let i=0;i<5;i++){
    const a=pts[i],c=pts[(i+1)%5];
    line(b,y%12===3?'warmWin':'gold',[[a[0]*s,y,a[1]*s],[c[0]*s,y,c[1]*s]],.23);
   }
  }
  cylinder(b,'gold',0,h+9,0,.45,23,.15);ring(b,'cyan',0,4,0,w*.75,.45);
 }else if(form==='spire'){
  drum(b,0,0,w*.72,12);cylinder(b,'blueGlass',0,h*.48,0,w*.29,h*.82,w*.13,8);
  for(let a=0;a<6.28;a+=Math.PI/3)line(b,'stone',[[Math.sin(a)*w*.55,8,Math.cos(a)*w*.55],[Math.sin(a)*w*.13,h*.82,Math.cos(a)*w*.13],[0,h,0]],.8);
  [12,h*.65,h*.83,h*.94].forEach(y=>ring(b,'cyan',0,y,0,w*(y===12?.7:.24),.55));
  cylinder(b,'violet',0,h+6,0,.28,18,.08);ring(b,'violet',0,h+2,0,w*.2,.5);
 }else if(['dome','bio'].includes(form)){
  if(form==='dome')dome(b,0,0,w*.46,h-7);
  else {block(b,0,-d*.24,w,d*.45,12,2);[-.33,0,.33].forEach(x=>dome(b,x*w,d*.23,w*.16,17));}
 }else if(form==='garden'){
  for(const [x,z,r,hh] of [[-.25,0,.24,h],[.17,-.24,.22,h*.88],[.3,.23,.18,h*.67]]){
   drum(b,x*w,z*d,r*w,hh);
   for(let y=4;y<hh;y+=5){ring(b,'leaf',x*w,y,z*d,r*w-.7,1);ring(b,'magenta',x*w,y+1,z*d,r*w,.15);}
  }
  block(b,-w*.32,d*.34,w*.25,d*.27,13,2);
 }else if(form==='ring'){
  const r=w*.45;drum(b,0,0,r,h);cylinder(b,'grass',0,h+.55,0,r*.75,.2);
  ring(b,'road',0,h+1,0,r*.62,4);ring(b,'kinetic',0,h+1.12,0,r*.62,.22);
  cylinder(b,'glass',0,h+2,0,r*.3,3);ring(b,'gold',0,h+4,0,r*.34,.5);
 }else if(form==='stadium'){
  block(b,0,-d*.39,w,d*.2,15,2);b.box('grass',0,1,0,w*.75,.3,d*.65);
  for(const side of [-1,1])for(let i=0;i<4;i++)b.box('stone',0,1+i*.7,side*(d*.35+i*1.2),w,.6,1);
  for(let x=-w*.36;x<=w*.36;x+=w*.12)b.box('white',x,1.2,0,.12,.05,d*.62);
  const pts=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;pts.push([Math.cos(a)*w*.44,1.35,Math.sin(a)*d*.4]);}
  line(b,'track',pts,2.6);line(b,'white',pts.map(([x,y,z])=>[x,y+.04,z]),.1);
  for(const x of [-w*.4,w*.4]){b.box('white',x,8,0,.2,16,.2);b.box('warm',x,16.2,0,6,.5,.4);}
  ring(b,'white',0,1.3,0,8,.15);
 }else if(form==='transit'){
  block(b,0,0,w*.88,d*.7,13,2);
  for(let j=0;j<5;j++){
   const pts=[];
   for(let k=0;k<=20;k++){const x=-w*.52+k*w*1.04/20;pts.push([x,15+Math.sin(k*Math.PI/20)*13+(j%2)*1,(j-2)*d*.19]);}
   line(b,j%2?'gold':'steel',pts,1.1);
  }
  const geo=new T.SphereGeometry(1,40,16,0,Math.PI*2,0,Math.PI/2);
  b.add(geo,'blueGlass',0,14,0,w*.51,14,d*.48);geo.dispose();
  ring(b,'cyan',0,16,0,w*.4,.4);
 }else if(form==='greenhouses'){
  for(let x=-w*.38;x<w*.48;x+=w*.24){
   block(b,x,0,w*.2,d,8,1);
   const geo=new T.CylinderGeometry(w*.09,w*.09,d,16,1,false,0,Math.PI);geo.rotateX(Math.PI/2);
   b.add(geo,'blueGlass',x,8.2,0);geo.dispose();
   for(let z=-d*.4;z<d*.5;z+=5)b.box('leaf',x,9,z,w*.15,.5,2);
  }
 }else if(form==='village'){
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z+=2)block(b,x*w*.32,z*d*.28,w*.26,d*.36,10+(x===0?5:0),2,'white');
 }else if(form==='round'||form==='civic'){
  drum(b,0,0,Math.min(w,d)*.47,h);ring(b,'gold',0,h+1,0,w*.32,.4);
  cylinder(b,'grass',0,h+.5,0,w*.29,.5);if(form==='civic')dome(b,0,0,w*.2,12);
 }else if(form==='academy'||form==='vault'||form==='gardenlow'){
  const skin=form==='vault'?'white':'civic';
  block(b,-w*.34,0,w*.32,d,h,Math.min(4,f.levels+1),skin);
  block(b,w*.34,0,w*.32,d,h,Math.min(4,f.levels+1),skin);
  block(b,0,-d*.32,w*.4,d*.35,h*.88,3,skin);
  b.box('grass',0,.5,d*.12,w*.3,.5,d*.65);
  for(let x=-w*.42;x<w*.5;x+=6)b.box('stone',x,h*.28,d*.51,.8,h*.56,.8);
  if(form==='vault')drum(b,0,-d*.1,w*.13,h*.8);
 }else{
  block(b,0,0,w,d,h,Math.min(4,f.levels+1),skinFor(form));
  if(form==='sawtooth'||form==='factory')for(let x=-w/2+w/12;x<w/2;x+=w/6){
   const pitch=w/6;
   const geo=new T.BufferGeometry();
   geo.setAttribute('position',new T.Float32BufferAttribute([-pitch/2,0,-d/2,pitch/2,0,-d/2,0,7,-d/2,-pitch/2,0,d/2,pitch/2,0,d/2,0,7,d/2],3));
   geo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);geo.computeVertexNormals();
   b.add(geo,'steel',x,h+1.2,0);geo.dispose();
  }
  if(form==='factory'||form==='warehouse'||form==='sawtooth')for(let x=-w*.35;x<w*.4;x+=w/5){
   b.box('dark',x,3.4,d/2+.25,7,6,.5);b.box('gold',x,6.8,d/2+2,8,.4,4);
  }
  if(form==='utility')for(let i=0;i<3;i++){
   cylinder(b,'white',-w*.25+i*w*.25,h+10,-d*.15,3.2,20);
   ring(b,'cyan',-w*.25+i*w*.25,h+18,-d*.15,3.2,.2);
   cylinder(b,'kinetic',-w*.25+i*w*.25,h+21,-d*.15,.3,4);
  }
  if(form==='water')for(let x=-1;x<=1;x+=2){
   cylinder(b,'stone',x*w*.68,2,0,11,4);cylinder(b,'glazing',x*w*.68,4.2,0,10,.2);ring(b,'cyan',x*w*.68,4.4,0,8,.2);
  }
 }
 addSignature(b,f);
 const root=b.finish(f.key);root.position.set(f.x,0,f.z);root.userData.facility=f.id;
 root.traverse(o=>{o.userData.facility=f.id;});
 const label=sign(f.key+'  '+f.name.toUpperCase(),Math.min(w*.85,48),3);
 label.position.set(0,Math.min(h*.65,12),d/2+.7);root.add(label);label.userData.facility=f.id;
 root.userData.sculptRuntime={parts:root.children.map(c=>c.name),clickable:true};return root;
}
