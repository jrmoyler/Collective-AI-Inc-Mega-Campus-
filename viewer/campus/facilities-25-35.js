// Governing references: individual CF-25–35 facility infographics, inspected 2026-09-17.
// Geometry represents visible architecture; source floor programs remain authoritative.
import * as T from 'three';
import {Batch,cylinder,ring,line} from './geometry.js';

function footprint(w,d,r=1.4){
 const s=new T.Shape(),x=w/2,z=d/2;r=Math.min(r,x*.8,z*.8);
 s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);return s;
}
function plate(b,mat,x,y,z,w,d,th=.32,r=1.4){const g=new T.ExtrudeGeometry(footprint(w,d,r),{depth:th,bevelEnabled:false,curveSegments:5});g.rotateX(-Math.PI/2);b.add(g,mat,x,y,z);g.dispose();}
function tree(b,x,y,z,r=1.3){cylinder(b,'trunk',x,y+1.3,z,.13,2.6,.07,8);const g=new T.SphereGeometry(r,8,6);b.add(g,'leaf',x,y+2.9,z,1,1.3,1);g.dispose();}
function planter(b,x,y,z,w=3,d=2){plate(b,'stone',x,y,z,w,d,.5,.45);plate(b,'leaf',x,y+.5,z,w-.3,d-.3,.1,.3);tree(b,x,y+.5,z,Math.min(w,d)*.55);}
function solar(b,x,y,z,w,d){b.box('dark',x,y,z,w,.22,d);for(let xx=-w/2+.5;xx<w/2;xx+=2.2)for(let zz=-d/2+.5;zz<d/2;zz+=3.2){b.box('solar',x+xx,y+.17,z+zz,2,.10,3);b.box('steel',x+xx,y+.23,z+zz,1.95,.02,.04);}}
function rail(b,x,y,z,w,d){for(const s of [-1,1]){b.box('glazing',x,y+.6,z+s*d/2,w,1.2,.035);b.box('steel',x,y+1.2,z+s*d/2,w,.06,.06);b.box('glazing',x+s*w/2,y+.6,z,.035,1.2,d);b.box('steel',x+s*w/2,y+1.2,z,.06,.06,d);}}
function wing(b,x,z,w,d,h,levels=2,{skin='dark',base=0,r=1.6,roof=true,planted=false}={}){
 const perimeter=footprint(w,d,r).getSpacedPoints(Math.max(20,Math.ceil((w+d)*.65))),fh=h/levels;
 for(let k=0;k<levels;k++){
  const y=base+k*fh;plate(b,'stone',x,y,z,w,d,.3,r);
  for(let j=0;j<perimeter.length-1;j++){
   const a=perimeter[j],c=perimeter[j+1],dx=c.x-a.x,dz=c.y-a.y,len=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx),px=x+(a.x+c.x)/2,pz=z+(a.y+c.y)/2;
   b.box('glazing',px,y+fh/2,pz,len,fh-.45,.04,yaw);b.box(skin,px,y+fh-.48,pz,len,.7,.26,yaw);
   b.box('steel',x+a.x,y+fh/2,z+a.y,.09,fh,.09);
   if(j%3===0)b.box('warm',x+(px-x)*.94,y+fh-.85,z+(pz-z)*.94,len*.8,.035,.06,yaw);
  }
 }
 if(roof){plate(b,skin,x,base+h,z,w+.5,d+.5,.4,r);if(planted){plate(b,'leaf',x,base+h+.45,z,w-2,d-2,.12,r);for(let q=-w*.3;q<=w*.3;q+=6)planter(b,x+q,base+h+.55,z,2,2);}rail(b,x,base+h+.4,z,w-.2,d-.2);}
}
function benches(b,x,y,z,n=3){for(let i=0;i<n;i++){b.box('copper',x+i*3,y+.48,z,2.4,.15,.7);for(const dx of [-.9,.9])b.box('dark',x+i*3+dx,y+.23,z,.07,.46,.6);}}
function desks(b,x,y,z,n=4){for(let i=0;i<n;i++){const xx=x+i*3;b.box('white',xx,y+.8,z,2,.1,.9);b.box('steel',xx,y+.4,z,.08,.8,.7);b.box('dark',xx,y+1.15,z+.25,.7,.5,.045);b.box('cyan',xx,y+1.15,z+.275,.6,.38,.015);b.box('dark',xx,y+.45,z-1,.5,.12,.5);b.box('dark',xx,y+.72,z-1.2,.5,.6,.08);}}
function tanks(b,x,y,z,n=3){for(let i=0;i<n;i++){const xx=x+i*3.2;cylinder(b,'steel',xx,y+2,z,1.05,4,1.05,20);const g=new T.SphereGeometry(1.05,16,8,0,Math.PI*2,0,Math.PI/2);b.add(g,'steel',xx,y+4,z,1,.5,1);g.dispose();ring(b,'dark',xx,y+.4,z,1.08,.07);line(b,'steel',[[xx,y+4.5,z],[xx,y+5,z],[xx+2,y+5,z],[xx+2,y+.3,z]],.12);}}
function entrance(b,x,z,w=9,h=5){plate(b,'stone',x,.08,z+1,w+3,4,.18,.4);b.box('steel',x,h,z+1,w+.6,.16,3);for(const s of [-1,1]){b.box('steel',x+s*w/2,h/2,z,.12,h,.14);b.box('glazing',x+s*.85,h*.42,z,1.65,h*.83,.05);}b.box('warm',x,h-.12,z+1,w-.5,.025,.07);}
function stair(b,x,z,w,height,depth){const n=20;for(let i=0;i<n;i++)b.box('stone',x,height*(i+.5)/n,z-depth/2+depth*(i+.5)/n,w,height/n,depth/n+.02);line(b,'steel',[[x-w/2,height/n,z-depth/2],[x-w/2,height+1,z+depth/2]],.05);}
function drum(b,x,z,r,h,levels=2,atrium=false){cylinder(b,'glazing',x,h/2,z,r,h,r,48);for(let i=0;i<=levels;i++){if(atrium)ring(b,'dark',x,i*h/levels+.1,z,r,.20);else cylinder(b,'dark',x,i*h/levels+.1,z,r+.15,.25,r+.15,48);}for(let i=0;i<40;i++){const a=i*Math.PI/20;b.box('steel',x+Math.sin(a)*r,h/2,z+Math.cos(a)*r,.1,h,.1);}}

export function createFacility25to35(f){
 if(f.id<25||f.id>35)return null;
 const b=new Batch(),{w,d,h,id}=f;
 plate(b,'path',0,.05,0,w+9,d+9,.18,3);
 if(id===25){
  // Gaia: curved planted shoulders embracing a projecting living atrium.
  wing(b,-w*.28,0,w*.43,d*.93,h,2,{r:7,planted:true});wing(b,w*.28,-d*.08,w*.43,d*.77,h*.87,2,{r:6,planted:true});
  wing(b,0,-d*.34,w*.23,d*.27,h*.91,2,{r:3,planted:true});
  drum(b,0,d*.16,w*.145,h*1.13,2,true);ring(b,'stone',0,h*1.13+.3,d*.16,w*.15,.65);
  cylinder(b,'trunk',0,h*.44,d*.16,.45,h*.88,.19,12);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.sin(a)*4,z=d*.16+Math.cos(a)*4;line(b,'trunk',[[0,h*.48,d*.16],[x*.6,h*.79,z],[x,h*.98,z]],.20);const crown=new T.SphereGeometry(3.3,12,8);b.add(crown,'leaf',x,h*1.035,z,1,1.1,1);crown.dispose();}
  for(const side of [-1,1]){solar(b,side*w*.29,h*(side<0?1:.87)+.7,-d*.12,w*.24,d*.2);desks(b,side*w*.3-5,.3,d*.25,4);}
  entrance(b,0,d*.34,10,6);benches(b,-7,.3,d*.39,5);
 }else if(id===26){
  // Orbital: deep high-bay shed, clerestory roof and a continuous crane gantry.
  wing(b,0,0,w*.98,d*.95,h,1,{r:.8,roof:false});
  for(const side of [-1,1])plate(b,'dark',side*w*.305,h,0,w*.37,d*.95,.4,.8);
  for(const side of [-1,1])plate(b,'dark',0,h,side*d*.405,w*.25,d*.14,.4,.6);
  rail(b,0,h+.4,0,w*.98,d*.95);
  for(const x of [-w*.36,w*.36]){b.box('gold',x,h*.78,0,.7,.8,d*.81);for(const z of [-d*.36,0,d*.36])b.box('steel',x,h*.4,z,.45,h*.8,.45);}
  b.box('gold',0,h*.77,d*.02,w*.75,.75,1.1);line(b,'dark',[[0,h*.75,d*.02],[0,h*.42,d*.02]],.055);
  const rocket=new T.CylinderGeometry(2.5,2.5,d*.37,24);rocket.rotateX(Math.PI/2);b.add(rocket,'steel',0,5.2,0);rocket.dispose();
  for(const z of [-d*.14,d*.13]){ring(b,'dark',0,5.2,z,2.65,.20,0);b.box('gold',0,1.5,z,6,1.2,1.2);}
  for(const x of [-w*.41,w*.41])for(const z of [-d*.33,d*.33])desks(b,x-3,.3,z,3);
  solar(b,-w*.25,h+.7,0,w*.29,d*.7);solar(b,w*.25,h+.7,0,w*.29,d*.7);
  plate(b,'glazing',0,h+.41,0,w*.24,d*.65,.08,.5);for(let z=-d*.3;z<d*.32;z+=4)b.box('steel',0,h+.55,z,w*.25,.12,.12);
  entrance(b,-w*.15,d*.48,w*.55,7);for(const z of [-d*.3,0,d*.3]){b.box('dark',w*.495,4,z,.12,8,7);b.box('gold',w*.52,8.2,z,3,.3,8);}
 }else if(id===27){
  // Matter Works: successive pilot-process terraces, not sawtooth warehouse bays.
  wing(b,-w*.32,0,w*.30,d*.95,h,2,{r:.9});wing(b,w*.18,-d*.28,w*.65,d*.39,h,2,{r:.9});
  wing(b,w*.18,d*.10,w*.65,d*.32,h*.68,1,{r:.9});wing(b,w*.18,d*.38,w*.65,d*.24,h*.36,1,{r:.9});
  for(const [y,z] of [[.4,d*.37],[h*.36+.45,d*.12],[h*.68+.45,-d*.28]]){tanks(b,0,y,z,4);desks(b,w*.13,y,z+5,3);}
  for(const z of [-d*.27,d*.07])line(b,'steel',[[-w*.1,4,z],[w*.39,4,z],[w*.39,h*.8,z]],.18);
  solar(b,-w*.32,h+.6,0,w*.2,d*.72);entrance(b,-w*.25,d*.48,10,5);
 }else if(id===28){
  // Water Observatory: continuous sloping stone ribbons and a water garden.
  wing(b,-w*.29,-d*.1,w*.38,d*.75,h,2,{skin:'stone',r:4});wing(b,w*.26,-d*.18,w*.42,d*.59,h,2,{skin:'stone',r:3});
  wing(b,w*.14,d*.24,w*.57,d*.28,h*.56,1,{skin:'stone',r:2});
  for(const x of [-w*.46,w*.47])line(b,'stone',[[x,1,d*.48],[x,h*.14,d*.31],[x,h*.75,d*.05],[x,h,-d*.30]],1.1);
  tanks(b,w*.04,.3,d*.21,4);tanks(b,w*.02,h*.57,d*.20,3);solar(b,0,h+.7,-d*.32,w*.71,d*.15);
  for(let i=0;i<4;i++){const z=d*.19+i*2.2,y=(3-i)*.8;plate(b,'stone',-w*.26,y,z,w*.21,2.4,.25,.4);plate(b,'water',-w*.26,y+.27,z,w*.19,2.25,.04,.3);b.box('water',-w*.26,y-.14,z+1.1,w*.19,.8,.04);}
  plate(b,'water',-w*.25,.3,d*.38,w*.29,d*.15,.06,3);entrance(b,w*.1,d*.40,8,5);
 }else if(id===29){
  // Living Provision: cylindrical glazed corner, rooftop growing and dispatch apron.
  wing(b,-w*.25,-d*.13,w*.48,d*.72,h,2,{r:4});wing(b,w*.22,-d*.26,w*.47,d*.47,h*.88,2,{r:2});
  wing(b,w*.23,d*.24,w*.50,d*.42,h*.43,1,{r:1});drum(b,-w*.06,d*.15,w*.095,h,2);
  for(let i=0;i<3;i++){const x=w*.06+i*w*.17;b.box('dark',x,h*.2,d*.455,w*.13,h*.35,.1);b.box('steel',x,h*.38,d*.50,w*.14,.2,4);b.box('path',x,.4,d*.57,w*.13,.7,d*.17);}
  wing(b,w*.22,-d*.26,w*.30,d*.27,3.6,1,{base:h*.88+.4,skin:'steel',roof:false,r:.5});plate(b,'glazing',w*.22,h*.88+4,-d*.26,w*.30,d*.27,.06,.5);
  for(let q=0;q<5;q++)b.box('leaf',w*.11+q*2,h*.88+.65,-d*.26,.9,.3,d*.23);
  tanks(b,w*.03,h*.44,d*.19,3);solar(b,-w*.28,h+.6,-d*.2,w*.30,d*.4);entrance(b,-w*.33,d*.28,9,5);
 }else if(id===30){
  // Trust Vault: octagonal central crown with fluted radial security buttresses.
  wing(b,-w*.29,-d*.06,w*.33,d*.78,h*.76,2,{r:1});wing(b,w*.29,-d*.06,w*.33,d*.78,h*.76,2,{r:1});
  cylinder(b,'dark',0,h*.51,-d*.10,w*.115,h*1.02,w*.115,8);cylinder(b,'stone',0,h*1.025,-d*.1,w*.13,.5,w*.13,8);cylinder(b,'glazing',0,h*1.07,-d*.1,w*.10,h*.08,w*.08,8);
  for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;line(b,'gold',[[Math.sin(a)*w*.115,.4,-d*.1+Math.cos(a)*w*.115],[Math.sin(a)*w*.115,h*1.025,-d*.1+Math.cos(a)*w*.115]],.14);}
  wing(b,0,d*.27,w*.42,d*.39,h*.48,1,{r:2});
  for(const s of [-1,1])for(let i=0;i<4;i++){const x=s*(w*.24+i*w*.075);b.box('dark',x,h*.28,d*.36,1.5,h*.56,3.5);b.box('gold',x+.55,h*.28,d*.395,.13,h*.56,3.55);}
  for(const x of [-w*.30,w*.30]){solar(b,x,h*.76+.6,-d*.10,w*.23,d*.48);desks(b,x-4,h*.38+.3,d*.1,3);}
  ring(b,'gold',0,h*.35,d*.475,1.6,.18,0);line(b,'gold',[[0,h*.30,d*.477],[0,h*.22,d*.477],[1.1,h*.22,d*.477]],.18);entrance(b,0,d*.47,9,6);
 }else if(id===31){
  // Resilience: softened L-shaped client block, roof garden and circular oculus.
  wing(b,-w*.29,0,w*.40,d*.91,h,2,{r:5,planted:true});wing(b,w*.15,-d*.27,w*.69,d*.37,h,2,{r:3,planted:true});
  wing(b,w*.25,d*.24,w*.43,d*.40,h*.58,1,{r:4,planted:true});wing(b,0,d*.35,w*.25,d*.20,5,1,{r:2});
  cylinder(b,'glazing',-w*.28,h+.6,-d*.04,w*.105,.25,w*.105,48);ring(b,'steel',-w*.28,h+.75,-d*.04,w*.11,.22);
  solar(b,w*.14,h+.7,-d*.3,w*.42,d*.19);for(const y of [.3,h/2+.3]){desks(b,-w*.41,y,d*.22,5);desks(b,w*.04,y,-d*.25,5);}
  entrance(b,w*.04,d*.46,9,4.8);planter(b,0,.3,d*.02,6,5);
 }else if(id===32){
  // Exchange: open marketplace atrium under an elliptical lattice roof.
  wing(b,-w*.34,-d*.04,w*.30,d*.88,h*.78,2,{r:2});wing(b,w*.34,-d*.04,w*.30,d*.88,h*.78,2,{r:2});wing(b,0,-d*.36,w*.41,d*.23,h*.78,2,{r:1});
  for(let i=-4;i<=4;i++){const x=i*w*.042,pts=[];for(let j=0;j<=16;j++){const u=j/16,zz=-d*.30+u*d*.62;pts.push([x,h*.78+Math.sin(u*Math.PI)*h*.15*Math.sqrt(1-(i/5)**2),zz]);}line(b,'steel',pts,.13);}
  for(let i=0;i<=12;i++){const a=i/12*Math.PI,pts=[];for(let j=-8;j<=8;j++)pts.push([j*w*.022,h*.78+Math.sin(a)*h*.15*Math.sqrt(1-(j/9)**2),-d*.30+i/12*d*.62]);line(b,'gold',pts,.08);}
  const canopy=[];for(let j=0;j<=20;j++){const x=-w*.51+j*w*1.02/20;canopy.push([x,4.8+Math.sin(j/20*Math.PI)*4.6,d*.47]);}line(b,'steel',canopy,.55);
  for(const s of [-1,1])b.box('steel',s*w*.50,2.4,d*.47,.28,4.8,.28);
  for(const x of [-w*.32,w*.32])for(const z of [-d*.2,d*.18]){b.box('stone',x,.8,z,4,1.6,2);b.box('warm',x,1.65,z,3.8,.035,1.8);}
  cylinder(b,'stone',0,.4,0,4,.5);ring(b,'gold',0,5,0,3,.13,0);ring(b,'steel',0,5,0,3,.13,Math.PI/3);entrance(b,0,d*.36,11,4.5);
 }else if(id===33){
  // Human Systems: stacked teaching terraces, a central social stair and learning rooms.
  wing(b,-w*.33,-d*.05,w*.31,d*.81,h,2,{r:3,planted:true});wing(b,w*.31,-d*.23,w*.34,d*.45,h,2,{r:3,planted:true});
  wing(b,w*.30,d*.20,w*.37,d*.37,h*.56,1,{r:3,planted:true});wing(b,-w*.07,-d*.34,w*.24,d*.22,h,2,{r:2});
  stair(b,0,0,w*.12,h*.50,d*.56);for(const s of [-1,1])rail(b,s*w*.22,h*.51,0,w*.20,d*.32);
  for(let row=0;row<4;row++)for(let col=0;col<6;col++){const x=w*.18+col*2,y=.3+row*.24,z=d*.05+row*2;b.box('dark',x,y+.5,z,.7,.15,.7);b.box('copper',x,y+.8,z+.28,.7,.65,.12);}
  b.box('dark',w*.31,3,-d*.01,w*.20,4,.12);b.box('cyan',w*.31,3,-d*.005,w*.18,3.5,.03);
  desks(b,-w*.44,h*.51,d*.08,7);entrance(b,-w*.1,d*.43,11,5);benches(b,-w*.12,.3,d*.37,4);
 }else if(id===34){
  // Energy Commons: solar/clerestory roof, visible demonstration machinery and control wing.
  wing(b,-w*.32,0,w*.34,d*.94,h,2,{r:.7});wing(b,w*.16,-d*.31,w*.65,d*.32,h,2,{r:.7});wing(b,w*.30,d*.05,w*.37,d*.43,h*.75,2,{r:.7});
  wing(b,-w*.04,d*.25,w*.35,d*.44,h*.42,1,{r:.7});
  solar(b,-w*.32,h+.7,0,w*.25,d*.74);solar(b,w*.16,h+.7,-d*.31,w*.55,d*.21);
  plate(b,'glazing',-w*.01,h*.43,d*.25,w*.26,d*.32,.08,.5);for(let x=-w*.14;x<w*.12;x+=3)b.box('steel',x,h*.43+.1,d*.25,.12,.16,d*.33);
  tanks(b,-w*.16,.3,d*.23,4);for(let i=0;i<5;i++){b.box('steel',w*.16+i*2.6,.3+2,d*.05,1.8,4,1.5);b.box('dark',w*.16+i*2.6,2.8,d*.065,1.3,1.1,1.55);}
  desks(b,w*.08,h*.38,d*.12,6);b.box('dark',w*.39,h*.55,-d*.10,10,5,.14);b.box('cyan',w*.39,h*.55,-d*.09,9.6,4.6,.03);entrance(b,w*.12,d*.48,10,5);
 }else if(id===35){
  // Re-reviewed against CF35: a contiguous occupied perimeter and cross-link,
  // not detached low pods. Open courts remain voids between linked wings.
  const ph=h*.86;
  wing(b,-w*.37,0,w*.25,d*.92,ph,2,{skin:'stone',r:1.2,planted:true});
  wing(b,w*.37,0,w*.25,d*.92,ph*.96,2,{skin:'stone',r:1.2,planted:true});
  wing(b,0,-d*.37,w*.53,d*.21,ph,1,{skin:'stone',r:1,planted:true});
  wing(b,0,d*.36,w*.54,d*.23,ph,1,{skin:'stone',r:1,planted:true});
  wing(b,0,-d*.015,w*.53,d*.18,ph*.98,2,{skin:'stone',r:1,planted:true});
  // Frontage has deep opaque piers and a broad, structurally supported canopy.
  for(const x of [-w*.43,-w*.27,w*.13,w*.29,w*.46]){
   b.box('dark',x,ph*.49,d*.477,1.15,ph*.98,.65);
   b.box('stone',x+.5,ph*.49,d*.481,.16,ph*.98,.7);
  }
  plate(b,'steel',-w*.28,ph*.43,d*.55,w*.27,d*.18,.18,1);
  for(const x of [-w*.40,-w*.16])cylinder(b,'steel',x,ph*.215,d*.625,.13,ph*.43,.13,12);
  entrance(b,-w*.28,d*.466,w*.14,ph*.42);
  // Solar fields and roof garden walks follow the continuous roof geometry.
  solar(b,-w*.37,ph+.65,-d*.19,w*.17,d*.27);
  solar(b,w*.37,ph*.96+.65,-d*.18,w*.17,d*.28);
  solar(b,w*.10,ph+.65,d*.36,w*.24,d*.15);
  solar(b,-w*.05,ph+.65,-d*.37,w*.27,d*.14);
  for(const x of [-w*.37,w*.37])plate(b,'path',x,ph*(x<0?1:.96)+.58,d*.13,w*.15,d*.18,.03,.4);
  // Separate rear family arrival court and front therapeutic court, connected
  // through the occupied central spine rather than outdoor gaps in the shell.
  for(const z of [-d*.20,d*.18]){
   plate(b,'path',0,.28,z,w*.47,d*.20,.10,2);
   for(const x of [-w*.15,w*.15])planter(b,x,.42,z,5,3.2);
   benches(b,-4,.42,z,3);
   cylinder(b,'stone',0,.45,z,2.4,.35,2.4,32);
  }
  // Glazed learning rooms and controlled care frontage contain actual fittings.
  for(const x of [-w*.37,w*.37])for(let i=0;i<4;i++){
   const z=-d*.28+i*d*.18;
   b.box('white',x,.7,z,2.1,.9,3.6);b.box('stone',x,1.25,z-.15,1.8,.18,3.1);
   b.box('copper',x+3.3,1,z,1.1,2,.6);
  }
  desks(b,-w*.18,.35,-d*.015,8);
  // Outdoor garden loop at the visitor frontage.
  for(const s of [-1,1]){
   const pts=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI;pts.push([s*w*.30+Math.cos(a)*w*.14,.31,d*.50+Math.sin(a)*d*.08]);}
   line(b,'path',pts,.8);for(let i=0;i<5;i++)planter(b,s*w*.30+(i-2)*3,.25,d*.55+(i%2)*2,2.2,1.6);
  }

 }
 const root=b.finish(`CF-${id}-reference-architecture`);root.userData.referenceSource=`CF-${id}_Facility_Infographic.png`;root.userData.referenceReconstruction=true;root.userData.floorProgramUnchanged=true;return root;
}
