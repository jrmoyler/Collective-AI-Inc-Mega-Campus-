// Near-camera reference continuation for all 35 approved facilities.
// Primary envelopes stay resident; these small assemblies are rebuilt only when
// the visitor approaches a facility, protecting the already-expensive campus view.
import * as T from 'three';
import {Batch,cylinder,ring,line} from './geometry.js';
import {referenceDetail13to24} from './facilities-13-24.js';

function ribWall(b,x,y,z,w,h,count,mat='steel',depth=.24){
 const n=Math.max(2,count);
 for(let i=0;i<n;i++)b.box(mat,x-w/2+i*w/(n-1),y+h/2,z,.10,h,depth);
}
function equipmentCourt(b,x,y,z,w,d,count=5){
 b.box('dark',x,y+.18,z,w,.34,d);
 for(let i=0;i<count;i++){
  const xx=x-w*.38+i*w*.76/Math.max(1,count-1);
  b.box('steel',xx,y+.78,z,Math.max(.7,w*.11),1.25,d*.54);
  ribWall(b,xx,y+.78,z+d*.28,Math.max(.65,w*.1),1,count>5?4:3,'dark',.07);
 }
}
function plantedEdge(b,x,y,z,w,d){
 b.box('stone',x,y+.15,z,w,.30,d);
 b.box('leaf',x,y+.34,z,w-.25,.10,d-.22);
}
function canopy(b,x,y,z,w,d,mat='steel'){
 b.box(mat,x,y,z,w,.18,d);
 for(const xx of [-w*.42,w*.42])cylinder(b,'steel',x+xx,y*.5,z,.12,Math.max(.5,y),.12,10);
}
function frame(b,x,y,z,w,h,mat='steel'){
 b.box(mat,x-w/2,y+h/2,z,.16,h,.20);b.box(mat,x+w/2,y+h/2,z,.16,h,.20);b.box(mat,x,y+h,z,w,.16,.20);
}
function terrace(b,x,y,z,w,d){
 b.box('stone',x,y,z,w,.28,d);
 ribWall(b,x,y+.55,z+d/2,w,1.1,Math.max(3,Math.floor(w/2.5)),'steel',.08);
}
function displayWall(b,x,y,z,w,h){
 b.box('dark',x,y+h/2,z,w,h,.18);
 b.box('blueGlass',x,y+h/2,z+.10,w-.25,h-.25,.025);
}
function waterWall(b,x,y,z,w,h){
 b.box('dark',x,y+h/2,z,w,h,.12);
 b.box('water',x,y+h/2,z+.075,w-.18,h-.2,.025);
 b.box('water',x,y-.08,z+.35,w,.16,.75);
}
function sawtooth(b,x,y,z,w,d,count=4){
 const bay=w/count;
 for(let i=0;i<count;i++){
  const xx=x-w/2+bay*(i+.5);
  line(b,'steel',[[xx-bay*.5,y,z-d*.5],[xx+bay*.34,y+2.1,z-d*.5],[xx+bay*.5,y,z-d*.5]],.11);
  ribWall(b,xx,y+.95,z-d*.49,bay*.72,1.65,4,'glazing',.035);
 }
}
function portal(b,x,y,z,w,h,lean=1.1){
 line(b,'steel',[[x-w/2,y,z],[x-w*.42,y+h,z-lean]],.22);
 line(b,'steel',[[x+w/2,y,z],[x+w*.42,y+h,z-lean]],.22);
 line(b,'steel',[[x-w*.42,y+h,z-lean],[x+w*.42,y+h,z-lean]],.22);
}
function solarField(b,x,y,z,w,d,rows=3){
 for(let row=0;row<rows;row++){
  const zz=z-d*.35+row*d*.70/Math.max(1,rows-1);
  b.box('solar',x,y+.34,zz,w,.10,d/Math.max(4,rows*2));
  for(const xx of [-w*.42,w*.42])b.box('steel',x+xx,y+.17,zz,.08,.34,.08);
 }
}
function arc(b,x,y,z,rx,rz,start,end,steps=18,mat='steel',r=.12){
 const pts=[];for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;pts.push([x+Math.cos(a)*rx,y,z+Math.sin(a)*rz]);}line(b,mat,pts,r);
}

export function createReferenceFidelityDetail(f){
 const b=new Batch(),{id,w,d,h}=f,tags=[];
 switch(id){
  case 1:
      for(const q of [-.19,-.05,.09])ribWall(b,q*w,h*.10,d*.402,w*.085,h*.73,3,'gold',.17);
   terrace(b,w*.31,h*.69,d*.19,w*.38,d*.16);tags.push('oculus crown','asymmetric deep facade','cantilever terrace');
   break;
  case 2:
   equipmentCourt(b,w*.16,h*.92,-d*.30,w*.42,d*.19,7);equipmentCourt(b,-w*.23,h*.925,-d*.32,w*.25,d*.14,4);
   for(let i=0;i<4;i++){const y=h*(.22+i*.12);b.box('dark',w*.405,y,d*.405,w*.11,h*.075,.62);b.box('cyan',w*.405,y,d*.42,w*.085,.035,.64);}
   tags.push('roof equipment courts','stepped communications frontage','compute-hall service depth');
   break;
  case 3:
   for(const side of [-1,1]){frame(b,side*w*.28,0,d*.225,w*.26,h*.40,'dark');for(let i=0;i<4;i++)b.box('gold',side*w*.28+(i-1.5)*w*.045,h*.19,d*.237,.12,h*.32,.24);}
   for(const side of [-1,1])cylinder(b,'dark',side*w*.19,h*.18,-d*.23,w*.085,h*.36,w*.105,28);
   tags.push('fortified approach','vault drums','deep security reveals');
   break;
  case 4:
      terrace(b,-w*.32,h*.77,d*.18,w*.27,d*.23);terrace(b,w*.32,h*.69,d*.14,w*.27,d*.20);
   canopy(b,0,h*.28,d*.46,w*.44,d*.10,'dark');tags.push('knowledge crown','linked terraces','library connector');
   break;
  case 5:
   portal(b,-w*.24,h*.40,-d*.31,w*.43,h*.46,2.2);portal(b,w*.24,h*.40,-d*.31,w*.35,h*.36,1.4);
   sawtooth(b,-w*.22,h*.97,-d*.03,w*.43,d*.25,5);
   tags.push('production cutaway','stage roof truss','media facade composition');
   break;
  case 6:
   // Launch-frontage louvres stay on the ground tier; upper tiers step back.
   for(let i=0;i<3;i++){const y=h*(.08+i*.09);b.box('steel',-w*.40,y,d*.455+.3,w*.18,.16,.42,-.16);}
   tags.push('angled launch frontage','stacked setbacks','occupied launch facade');
   break;
  case 7:
   sawtooth(b,0,h*.72,-d*.10,w*.82,d*.52,7);equipmentCourt(b,w*.24,h*.74,d*.17,w*.32,d*.22,5);
   for(let i=0;i<5;i++)portal(b,-w*.36+i*w*.18,0,d*.47,w*.13,h*.49,.8);
   tags.push('factory roof courts','northlight sawtooth','production bays');
   break;
  case 8:
   portal(b,0,0,d*.48,w*.86,h*.72,2.6);for(const x of [-w*.32,w*.32])line(b,'gold',[[x,h*.20,-d*.42],[x,h*.84,d*.38]],.26);
   for(const z of [-d*.26,0,d*.26])frame(b,0,h*.10,z,w*.64,h*.55,'steel');tags.push('manufacturing portal','overhead crane structure','dense occupied hall');
   break;
  case 9:
   for(let a=0;a<Math.PI*2;a+=Math.PI/6){const x=Math.cos(a)*w*.38,z=Math.sin(a)*d*.35;cylinder(b,'dark',x,h*.81,z,Math.min(w,d)*.035,.18,Math.min(w,d)*.035,20);ring(b,'gold',x,h*.92,z,Math.min(w,d)*.028,.05);}
   arc(b,0,h*.60,0,w*.43,d*.40,0,Math.PI*2,36,'steel',.17);portal(b,-w*.35,0,d*.37,w*.21,h*.42,1.3);
   tags.push('circular terminal organization','roof pads','terminal envelope');
   break;
  case 10:
   for(let i=0;i<7;i++){const x=-w*.39+i*w*.13;frame(b,x,0,d*.47,w*.105,h*.42,'dark');b.box('steel',x,h*.44,d*.485,w*.10,.20,2.2);}
   equipmentCourt(b,w*.25,h*.92,-d*.27,w*.28,d*.22,6);ribWall(b,0,h*.12,d*.455,w*.90,h*.55,22,'steel',.14);
   tags.push('warehouse fascia','loading frontage','roof equipment density');
   break;
  case 11:
   for(const [x,z,r] of [[-.22,-.14,.20],[.23,-.12,.17]]){for(let y=h*.23;y<h*.84;y+=h*.12){ring(b,'leaf',x*w,y,z*d,r*w*.82,.22);ring(b,'magenta',x*w,y+.28,z*d,r*w*.77,.035);}}
   tags.push('growing tower layers','planted roof curves','farm facade depth');
   break;
  case 12:
   for(const side of [-1,1]){arc(b,side*w*.30,h*.48,0,w*.19,d*.43,-Math.PI/2,Math.PI/2,20,'white',.22);for(let i=0;i<4;i++){const z=-d*.28+i*d*.18;b.box('white',side*w*.30,1.1,z,2.3,1.5,3.3);b.box('blueGlass',side*w*.30,1.3,z+d*.04,2.0,1.1,.035);}}
   plantedEdge(b,0,.28,0,w*.24,d*.40);tags.push('curved clinic perimeter','care courtyards','visible pod rhythm');
   break;
  case 13:case 14:case 15:case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 23:case 24:
   // CF-13..24 details live beside their envelopes so they land on the
   // same roofs and forecourts instead of floating over replaced massing.
   referenceDetail13to24(b,f,tags);
   break;
  case 25:{
   const dz=d*.16,R=w*.145,lv=h*1.13/4;
   for(let i=1;i<4;i++){ring(b,'leaf',0,i*lv+.8,dz,R-2.25,.28);for(let k=0;k<12;k++){const a=k*Math.PI/6+i*.3;b.box('leaf',Math.sin(a)*(R-2.3),i*lv-.45,dz+Math.cos(a)*(R-2.3),1.1,1.3,.35,a);}}
   for(let i=0;i<4;i++){const x=-w*.27+i*5;cylinder(b,'white',x,.23+2.5,-d*.5-2.8,2,5,2,24);ring(b,'gold',x,5.1,-d*.5-2.8,2.02,.08);cylinder(b,'steel',x,5.5,-d*.5-2.8,.5,.8,.35,12);}
   tags.push('bio-energy core','atrium hanging gardens','digester tank row');
   break;
  }
  case 26:{
   const hz=-d*.14,tx=w*.49+7.5,tz=-d*.18;
   b.box('white',tx,2.35,tz,10,3.2,2.5);b.box('dark',tx+6,1.75,tz,2.2,2.6,2.45);b.box('glass',tx+6.9,2.3,tz,.5,1.1,2.1);
   for(const x of [tx-3.5,tx-2.3,tx+5.8])for(const s of [-1,1])ring(b,'dark',x,.5,tz+s*1.1,.45,.2,0);
   b.box('gold',w*.12,h*.77-.7,hz+d*.04,1.6,.8,1.5);line(b,'dark',[[w*.12,h*.77-1.2,hz+d*.04],[w*.12,h*.52,hz+d*.04]],.05);ring(b,'steel',w*.12,h*.52-.25,hz+d*.04,.3,.07,0);
   equipmentCourt(b,-w*.245,h+.35,d*.34,w*.3,d*.12,4);
   tags.push('assembly hall roof plant','service dock truck','crane hoist');
   break;
  }
  case 27:{
   equipmentCourt(b,w*.18,h+.35,-d*.42,w*.44,d*.06,6);
   const tz=d*.5+9;b.box('white',w*.42,2.35,tz,2.5,3.2,10);b.box('dark',w*.42,1.75,tz+6,2.45,2.6,2.2);
   const wheel=new T.TorusGeometry(.45,.2,8,24);for(const z of [tz-3.5,tz-2.3,tz+5.8])for(const s of [-1,1])b.add(wheel,'dark',w*.42+s*1.1,.5,z,1,1,1,Math.PI/2);wheel.dispose();
   tags.push('pilot courts','roof services','industrial dock');
   break;
  }
  case 28:{
   const fz=d*.075+.45;
   b.box('dark',w*.25,.23+h*.21,fz,w*.26,h*.42,.14);b.box('water',w*.25,.23+h*.21,fz+.12,w*.24,h*.42-.4,.04);
   b.box('stone',w*.25,.27,fz+1.6,w*.3,.3,2.7);b.box('water',w*.25,.47,fz+1.6,w*.28,.04,2.4);
   ribWall(b,-w*.36,.3,d*.43+.6,w*.12,h*.30,6,'stone',.3);
   tags.push('water wall court','shaped piers','cascade basins');
   break;
  }
  case 29:{
   for(const i of [0,2]){const x=w*.06+i*w*.17,tz=d*.5+6.5;b.box('white',x,.75+.6+1.6,tz,2.5,3.2,9);b.box('dark',x,.75+1.25,tz+5.6,2.45,2.5,2.2);}
   for(let r=0;r<4;r++)for(let c=0;c<6;c++)b.box('leaf',w*.455+.75,3+r*(h*.8-3)/3.6,-d*.46+c*d*.075,.3,2.3,2.4);
   b.box('dark',w*.455+.45,h*.4+1.5,-d*.26,.1,h*.8+.4,d*.47);
   tags.push('dispatch fleet','living green wall','food processing volumes');
   break;
  }
  case 30:{
   for(const s of [-1,1]){b.box('blueGlass',s*w*.34,.22,d*.5+3.9,w*.36,.14,.9);b.box('blueGlass',s*(w*.5+2.4),.22,0,.9,.14,d*.9);
    const kx=s*w*.40,kz=d*.5+1.8;b.box('dark',kx,3.1,kz,4.4,.3,3.6);b.box('glazing',kx,1.5,kz,3.6,2.8,2.8);for(const sx of [-1,1])for(const sz of [-1,1])b.box('steel',kx+sx*1.9,1.5,kz+sz*1.5,.12,2.95,.12);
    for(let i=0;i<5;i++)cylinder(b,'dark',s*(8+i*2),.23+.5,d*.5+2.4,.22,1,.22,10);}
   tags.push('credential core','secure perimeter channel','guard pavilions');
   break;
  }
  case 31:{
   const top=h*.58;b.box('stone',w*.25,top+.65,d*.24,w*.2,.2,d*.1);for(let i=0;i<4;i++){const x=w*.17+i*3;b.box('dark',x,top+.92,d*.24,.7,.35,1.8);}
   frame(b,0,h+.55,-d*.30,w*.12,2.6,'steel');frame(b,0,h+.55,-d*.22,w*.12,2.6,'steel');
   for(const x of [w*.36,w*.44]){b.box('stone',x,.5,d*.52,3.4,.55,1.8);b.box('leaf',x,.85,d*.52,3.1,.2,1.5);}
   tags.push('resilience courtyard','inset decks','office wing pergola');
   break;
  }
  case 32:{
   for(const s of [-1,1])for(let k=0;k<3;k++){const x=s*6,z=-6+k*7;b.box('stone',x,.7,z,2.4,1,1.2);b.box('copper',x,2.6,z,2.8,.1,1.8);for(const sx of [-1,1])b.box('steel',x+sx*1.3,1.4,z-.8,.08,2.45,.08);}
   for(const x of [18,22,26]){cylinder(b,'steel',x,3.2,d*.5+2.5,.1,6,.08,8);b.box('gold',x+.5,5.2,d*.5+2.5,.9,1.6,.04);}
   b.box('dark',w*.34,h*.33,d*.40+.45,w*.2,h*.22,.18);b.box('blueGlass',w*.34,h*.33,d*.40+.59,w*.2-.4,h*.22-.4,.03);
   tags.push('marketplace stalls','plaza light masts','experience gallery screen');
   break;
  }
  case 33:{
   for(let i=0;i<4;i++)b.box('stone',w*.38,.15+(.5+i*.45)/2,d*.43+i*1.2,10,.5+i*.45,1.25);
   for(const x of [-w*.39,-w*.32,-w*.25]){b.box('dark',x,3.7,d*.5+1,.6,7,.6);b.box('cyan',x,5,d*.5+1.35,.4,3,.03);}
   const px=-w*.06,pz=-d*.34;for(const sx of [-1,1])for(const sz of [-1,1])b.box('steel',px+sx*w*.08,h+.4+1.28,pz+sz*d*.07,.14,2.6,.14);for(let i=0;i<7;i++)b.box('copper',px-w*.0686+i*w*.0229,h+.4+2.62,pz,.16,.12,d*.16);
   tags.push('learning plaza seating','banner pylons','roof learning pergola');
   break;
  }
  case 34:{
   const lx=w*.30,ly=h*.75+.35,lz=d*.05,lw=w*.18,ll=d*.28;const tri=new T.Shape();tri.moveTo(-lw/2,0);tri.lineTo(lw/2,0);tri.lineTo(0,3.2);tri.lineTo(-lw/2,0);
   const lg=new T.ExtrudeGeometry(tri,{depth:ll,bevelEnabled:false});b.add(lg,'glazing',lx,ly,lz-ll/2);lg.dispose();
   for(let i=0;i<=6;i++){const z=lz-ll/2+i*ll/6;line(b,'steel',[[lx-lw/2,ly+.02,z],[lx,ly+3.25,z]],.07);line(b,'steel',[[lx,ly+3.25,z],[lx+lw/2,ly+.02,z]],.07);}line(b,'steel',[[lx,ly+3.25,lz-ll/2],[lx,ly+3.25,lz+ll/2]],.09);
   for(const x of [w*.25,w*.35]){b.box('white',x,1.5,d*.55,2.4,2.6,6);b.box('cyan',x,1.9,d*.55+3.04,1.8,.12,.04);}
   tags.push('glazed roof lantern','battery demonstration','energy control volume');
   break;
  }
  case 35:{
   for(const z of [-d*.185,d*.16]){for(const x of [-6.5,4.5])for(const s of [-1,1])b.box('steel',x,.42+1.4,z+s*1.8,.12,2.8,.12);for(let i=0;i<9;i++)b.box('copper',-5.89+i*1.22,2.86,z,.14,.12,4);}
   for(let x=-w*.375;x<=w*.38;x+=w*.125){cylinder(b,'dark',x,1.7,d*.5+2,.08,3,.08,8);b.box('warm',x,3.3,d*.5+2,.3,.18,.3);}
   const sy=h*.86*.98+.4+.57;for(const sx of [-1,1])b.box('steel',sx*w*.1,sy+1.18,-d*.015,.12,2.4,.12);line(b,'steel',[[-w*.1,sy+2.4,-d*.015],[w*.1,sy+2.4,-d*.015]],.06);
   tags.push('care courtyard pergolas','domestic frontage lamps','roof garden trellis');
   break;
  }
  default: throw new Error('Missing reference fidelity detail for '+f.key);
 }
 const group=b.finish(f.key+'-reference-fidelity-detail');
 group.userData.nearDetail=true;
 group.userData.referenceFidelity=true;
 group.userData.referenceSource='CF-'+String(id).padStart(2,'0')+'_Facility_Infographic.png';
 group.userData.criticalDetails=tags;
 return group;
}
