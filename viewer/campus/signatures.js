// Reference-specific architectural detail layered onto the traced massing.
// Sources: CF-01–35 infographics and the room programs in the supplied archive.
import * as T from 'three';
import {cylinder,ring,line,seeded} from './geometry.js';
function terrace(b,x,y,z,w,d){b.box('stone',x,y,z,w,.5,d);for(const side of [-1,1]){b.box('gold',x,y+1.2,z+side*d/2,w,.12,.12);for(let i=-w/2+1;i<w/2;i+=4)b.box('stone',x+i,y+.65,z+side*d/2,.12,1.3,.12);b.box('leaf',x,y+.45,z+side*(d/2-1.2),w-2,.7,1.4);}for(let i=-w/2+3;i<w/2;i+=8){cylinder(b,'stone',x+i,y+.55,z,.8,1);cylinder(b,'leaf',x+i,y+1.6,z,1.2,1.7,.8,7);}}
function glazing(b,x,y,z,w,h,d){b.box('dark',x,y-.2,z,w,.5,d);b.box('glazing',x,y+h/2,z,w,h,d);for(const side of [-1,1]){b.box('stone',x,y+h,z+side*d/2,w+.4,.3,.4);for(let q=-w/2;q<w/2+.1;q+=w/5)b.box('stone',x+q,y+h/2,z+side*d/2,.18,h,.18);}b.box('stone',x,y+h,z,w,.3,d);}
function workroom(b,x,y,z,w,d){glazing(b,x,y,z,w,5,d);for(let i=-1;i<=1;i++){b.box('gold',x+i*w*.25,y+1.2,z,w*.16,.18,d*.2);b.box('dark',x+i*w*.25,y+.6,z,.25,1.2,.25);b.box('cyan',x+i*w*.25,y+1.8,z+.6,w*.11,.65,.08);}}
function tanks(b,x,y,z,count,r){for(let i=0;i<count;i++){const px=x+i*r*2.5;cylinder(b,'white',px,y+2,z,r,4);cylinder(b,'glass',px,y+4.1,z,r*.9,.2);ring(b,'gold',px,y+4.2,z,r,.12);}}
function robotArm(b,x,y,z,s=1){cylinder(b,'dark',x,y+.3*s,z,.7*s,.6*s);line(b,'gold',[[x,y+.4*s,z],[x,y+2*s,z],[x+1.2*s,y+2.8*s,z],[x+1.8*s,y+1.8*s,z]],.2*s);for(const [xx,yy] of [[x,y+2*s],[x+1.2*s,y+2.8*s]])cylinder(b,'dark',xx,yy,z,.3*s,.4*s);}
export function addSignature(b,f){const {w,d,h}=f;const random=seeded(f.id*837);
 // All artwork shares occupied roof gardens, perimeter planters, entry steps and bollards.
 if(!['dome','garden','spire','stadium','transit','greenhouses','bio'].includes(f.form)){
  for(const side of [-1,1]){b.box('stone',side*w*.46,h+1.4,0,1.1,1,d*.82);b.box('leaf',side*w*.46,h+2,0,1.6,1,d*.8);}
 }
 for(let i=0;i<4;i++)b.box('stone',0,.18+i*.17,d/2+7-i*1.2,w*.38,.24,1.2);
 for(const side of [-1,1])for(let i=0;i<4;i++){const x=side*(w*.3+i*2.5),z=d/2+5;cylinder(b,'dark',x,.65,z,.16,1.3);cylinder(b,'warm',x,1.25,z,.17,.1);}
 switch(f.id){
 case 1:{
  // Oculus and three occupied cantilever suites distinguish the facility atlas view.
  const r=w*.28;cylinder(b,'stone',0,h-2,0,r+1,.7);ring(b,'cyan',0,h+2,0,r+1,.35);ring(b,'stone',0,h+2,0,r+1,.16);
  for(let a=0;a<6.28;a+=Math.PI/12){const x=Math.sin(a)*(r+1),z=Math.cos(a)*(r+1);b.box('stone',x,h,z,.18,4,.18);}
  for(const y of [h*.24,h*.48,h*.73]){workroom(b,w*.36,y,d*.24,w*.38,d*.49);terrace(b,w*.36,y+5.4,d*.24,w*.42,d*.52);line(b,'stone',[[w*.17,y-5,d*.25],[w*.52,y,d*.25]],.45);}
  for(let i=-3;i<=3;i++){const x=i*w*.105;line(b,'dark',[[x,10,d*.405],[x*.64,h-4,d*.405*.64]],.16);}
  b.box('dark',-w*.31,h*.43,d*.31,w*.22,h*.49,.35);terrace(b,0,10.6,0,w*1.18,d*1.11);break;
 }
 case 2:workroom(b,0,h+1,0,w*.62,d*.4);for(let i=0;i<7;i++)b.box('cyan',-w*.28+i*w*.09,h+3.1,d*.22,w*.06,1.6,.15);break;
 case 3:case 30:{tanks(b,-w*.18,0,-d*.08,3,w*.065);for(let i=0;i<8;i++){b.box('gold',-w*.42+i*w*.12,4,d*.51,.5,8,1);}ring(b,'cyan',0,h*.62,0,w*.16,.2);break;}
 case 4:for(let x=-w*.4;x<w*.45;x+=w/12){b.box('stone',x,5,d*.43,.7,10,.7);}terrace(b,0,11,d*.39,w*.9,d*.22);break;
 case 5:glazing(b,0,2,d*.52,w*.65,9,8);b.box('violet',0,6,d*.515,w*.4,5,.1);for(let i=-2;i<=2;i++)b.box('dark',i*w*.12,9,d*.57,.5,3,.5);break;
 case 6:case 23:case 31:terrace(b,0,h*.55,0,w*1.05,d*.94);break;
 case 7:case 8:case 10:case 26:case 27:{
  const z=d*.62;for(let i=-2;i<=2;i++){const x=i*w*.16;b.box('stone',x,.6,z,w*.12,1.2,7);if(f.id===7||f.id===8)robotArm(b,x,1.2,z,1.5);else for(let j=0;j<3;j++)b.box('gold',x+(j-1)*1.5,1.8,z,1.3,1.3,1.6);}
  for(const side of [-1,1])b.box('gold',side*w*.38,h*.5,0,.7,h,1);b.box('gold',0,h-1,0,w*.78,.8,1.2);
  if(f.id===26){cylinder(b,'white',w*.25,h+3,-d*.1,2,8,1.5);cylinder(b,'gold',w*.25,h+8,-d*.1,1.5,2,0);}
  break;
 }
 case 9:for(let a=0;a<6.28;a+=Math.PI/12){b.box('warm',Math.sin(a)*w*.38,h+.7,Math.cos(a)*w*.38,.6,.15,.6);}break;
 case 11:{
  // Planted climbing screens and ribbon terraces wrap the visible grow cylinders.
  for(const [x,z,r,hh] of [[-.25,0,.24,h],[.17,-.24,.22,h*.88],[.3,.23,.18,h*.67]])for(let y=8;y<hh;y+=7){ring(b,'magenta',x*w,y,z*d,r*w-.5,.18);for(let a=0;a<6.28;a+=Math.PI/5){const px=x*w+Math.sin(a)*r*w*.84,pz=z*d+Math.cos(a)*r*w*.84;cylinder(b,'leaf',px,y+.5,pz,.8,1,.5,6);}}
  for(const y of [12,27,42])terrace(b,-w*.18,y,d*.29,w*.67,d*.31);
  for(let x=-w*.43;x<-w*.12;x+=2.3)for(let y=5;y<h*.74;y+=2){b.box('leaf',x,y,d*.39,2.4,2.3,.75);if(random()>.78)b.box('pink',x+.5,y+.5,d*.85/2,.6,.6,.5);}
  break;
 }
 case 12:case 13:case 14:terrace(b,0,1,d*.43,w*.8,d*.17);for(let i=-2;i<=2;i++)cylinder(b,'white',i*w*.16,3,d*.53,.65,6);break;
 case 15:{const pts=[];for(let i=0;i<=100;i++){const a=i/100*6.283;pts.push([Math.cos(a)*w*.46,.9,Math.sin(a)*d*.42]);}line(b,'track',pts,3.5);for(let j=0;j<3;j++)line(b,'white',pts.map(([x,y,z])=>[x*(1+j*.015),y+.03,z*(1+j*.015)]),.07);for(const x of [-w*.45,w*.45])for(const z of [-d*.35,d*.35]){b.box('dark',x,10,z,.4,20,.4);b.box('warm',x,20,z,4,.8,.4);}break;}
 case 16:for(let a=0;a<6.28;a+=Math.PI/10){cylinder(b,'stone',Math.sin(a)*w*.56,3,Math.cos(a)*w*.56,.45,6);}break;
 case 17:case 29:for(let i=-2;i<=2;i++)glazing(b,i*w*.17,h+1,0,w*.13,4,d*.63);break;
 case 18:for(let i=-2;i<=2;i++){b.box('stone',i*w*.16,.6,d*.56,w*.1,.7,10);b.box('cyan',i*w*.16,3.4,d*.6,w*.08,.4,.2);}break;
 case 19:terrace(b,0,h*.6,d*.3,w*.8,d*.25);for(let x=-w*.42;x<w*.45;x+=5)b.box('stone',x,h*.26,d*.5,.8,h*.52,.8);break;
 case 20:for(let y=22;y<h*.8;y+=12)ring(b,'stone',0,y,0,w*.27,.35);break;
 case 21:case 34:tanks(b,-w*.35,h+1,-d*.15,4,3);for(let i=0;i<5;i++){b.box('white',-w*.3+i*w*.15,2,d*.58,4,4,5);b.box('cyan',-w*.3+i*w*.15,2.5,d*.58+2.55,3,.12,.1);}break;
 case 22:for(let i=-2;i<=2;i++){b.box('dark',i*5,1,d*.62,.35,2,.35);b.box('white',i*5+1.5,1.7,d*.62,3,.15,.15);}break;
 case 24:for(let x=-w*.38;x<w*.4;x+=3)for(let z=d*.51;z<d*.7;z+=3)b.box((Math.round(x+z)%4)?'dark':'cyan',x,.25,z,2.7,.2,2.7);break;
 case 25:tanks(b,-w*.27,1,-d*.5,4,4);for(let i=-2;i<=2;i++)cylinder(b,'glazing',i*5,8,d*.03,1.5,12);break;
 case 28:tanks(b,-w*.35,0,d*.63,4,4);break;
 case 32:terrace(b,0,h*.48,d*.3,w*.94,d*.27);break;
 case 33:workroom(b,0,h+1,0,w*.45,d*.5);break;
 case 35:for(let i=-2;i<=2;i++){b.box('path',i*w*.17,.2,0,2,.3,d);cylinder(b,'leaf',i*w*.17,2,0,2,3,1,8);}break;
 }
}
