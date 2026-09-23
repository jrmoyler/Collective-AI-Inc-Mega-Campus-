import * as T from 'three';
import {Batch,cylinder,ring,line,materials} from './geometry.js';

import {roofTree,occupiedBays} from './facade-craft.js';

// Individual CF infographics govern these twelve compositions. The dusk
// cutaways read as graphite frames, protruding floor bands with lit gold
// edges, recessed clear glass and warmly lit rooms; every part below is real
// geometry (no reference art on meshes) and stays inside its canonical site.

// Neutral low-opacity architectural glass keeps occupied slabs and furnishings
// legible in both Three.js and glTF/Blender instead of stacking dark tinted walls.
const referenceGlazing=materials.glazing.clone();
referenceGlazing.name='reference-clear-architectural-glazing';
referenceGlazing.color.set(0xb7cbd3);referenceGlazing.opacity=.22;
referenceGlazing.metalness=.06;referenceGlazing.roughness=.06;referenceGlazing.envMapIntensity=1.1;
// Room back walls and ceilings washed by interior luminaires. Its emission
// follows the shared dusk switch (see syncInteriorLight) instead of glowing
// at full strength in daylight.
const litInterior=new T.MeshStandardMaterial({name:'reference-lit-interior-wash',color:0xe8cfa6,roughness:.82,metalness:0,emissive:0xffa24c,emissiveIntensity:.55,side:T.DoubleSide});
const floorFinish=new T.MeshStandardMaterial({name:'reference-warm-oak-floor',color:0x9b7852,roughness:.58,metalness:0});
const sprintTrack=new T.MeshStandardMaterial({name:'reference-blue-sprint-track',color:0x2c63ae,roughness:.86});
const turf=new T.MeshStandardMaterial({name:'reference-performance-turf',color:0x3f8b37,roughness:.95});
const serviceDeck=new T.MeshStandardMaterial({name:'reference-teal-battery-deck',color:0x1f6d6e,roughness:.58,metalness:.12});
function syncInteriorLight(){litInterior.emissiveIntensity=materials.warm.emissiveIntensity>.6?.62:.12;}

function outline(w,d,r){
 const pts=[];r=Math.min(r,w*.4,d*.4);
 for(const [x,z,a] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])
  for(let i=0;i<=6;i++)pts.push([x+Math.cos(a+i*Math.PI/12)*r,z+Math.sin(a+i*Math.PI/12)*r]);
 return pts;
}
const cornerRadius=(w,d,r)=>Math.min(r,w*.4,d*.4);
function slab(b,mat,x,y,z,w,d,depth=.35,r=2){
 const pts=outline(w,d,r),shape=new T.Shape();pts.forEach(([px,pz],i)=>i?shape.lineTo(px,pz):shape.moveTo(px,pz));shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);b.add(g,mat,x,y,z);g.dispose();
}
// Visit each perimeter segment of a convex local outline with its outward normal.
function edges(points,x,z,fn){
 for(let j=0;j<points.length;j++){
  const a=points[j],c=points[(j+1)%points.length],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz);
  if(len<.02)continue;
  const mx=x+(a[0]+c[0])/2,mz=z+(a[1]+c[1])/2;let nx=dz/len,nz=-dx/len;
  if(nx*(mx-x)+nz*(mz-z)<0){nx=-nx;nz=-nz;}
  fn({ax:x+a[0],az:z+a[1],mx,mz,nx,nz,len,tx:dx/len,tz:dz/len,rot:-Math.atan2(dz,dx)});
 }
}
// Annular sector (curved fascia, sign or canopy edge) extruded vertically.
function sector(b,mat,cx,cz,r0,r1,a0,a1,y,h,steps=16){
 const shape=new T.Shape();
 for(let i=0;i<=steps;i++){const a=a0+(a1-a0)*i/steps;const p=[Math.cos(a)*r1,-Math.sin(a)*r1];i?shape.lineTo(...p):shape.moveTo(...p);}
 for(let i=steps;i>=0;i--){const a=a0+(a1-a0)*i/steps;shape.lineTo(Math.cos(a)*r0,-Math.sin(a)*r0);}
 shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);b.add(g,mat,cx,y,cz);g.dispose();
}

// Occupied wing: floor plates, recessed clear glass between protruding
// graphite floor bands, graphite mullions (optionally bronze fins), lit gold
// band edges, ceiling light lines and a warm-lit interior room liner.
function wing(b,x,z,w,d,h,levels=2,{base=0,r=2,skin='dark',deck='dark',roof=true,fins=false,facade=true,trim='warm',mullion=1.55,liner:hasLiner=true,core=true,piers=0,band=.8,planters=true}={}){
 const p=outline(w,d,r),fh=h/levels,er=cornerRadius(w,d,r);
 (b.occupiedWings ||= []).push({x,z,w,d,h,levels,base,r});
 // Occupied central support core, embedded into the floor and roof decks.
 if(core)b.box(skin,x,base+.15+h*.5,z-d*.16,w*.18,h-.2,d*.35);
 const inset=Math.min(6.5,Math.max(1.1,Math.min(w,d)*.28));
 const liner=hasLiner&&w-2*inset>1.5&&d-2*inset>1.5?outline(w-2*inset,d-2*inset,Math.max(.3,er-inset)):null;
 for(let floor=0;floor<levels;floor++){
  const y=base+floor*fh,raised=floor===0&&base>0;
  slab(b,floorFinish,x,y+(raised?.12:0),z,w-.2,d-.2,raised?.5:.3,Math.max(.3,er-.1));
  const bandLo=floor===0?y+(raised?.05:0):y-band*.44,bandHi=y+(raised?Math.max(.7,band*.56):band*.56),glassHi=y+fh-.35,glassMid=(bandHi+glassHi)/2,glassH=glassHi-bandHi;
  if(facade)edges(p,x,z,e=>{
   b.box(skin,e.mx+e.nx*.1,(bandLo+bandHi)/2,e.mz+e.nz*.1,e.len+.04,bandHi-bandLo,.5,e.rot);
   if(floor>0)b.box(trim,e.mx+e.nx*.345,bandLo+.09,e.mz+e.nz*.345,e.len+.04,.06,.06,e.rot);
   b.pane(referenceGlazing,e.mx-e.nx*.25,glassMid,e.mz-e.nz*.25,e.len+.02,glassH,e.rot);
   const m=e.len<1.2?1:Math.max(1,Math.round(e.len/mullion));
   for(let k=0;k<m;k++){
    const px=e.ax+e.tx*e.len*k/m,pz=e.az+e.tz*e.len*k/m;
    b.box('dark',px-e.nx*.1,glassMid,pz-e.nz*.1,.09,glassH,.34,e.rot);
    if(fins&&k%2===0)b.box('dark',px+e.nx*.34,glassMid,pz+e.nz*.34,.1,glassH,.5,e.rot);
   }
  });
  // Linear ceiling luminaires parallel to the glass.
  // Open-roofed halls have no ceiling on their top storey, so no luminaires there.
  if(roof||floor<levels-1)edges(p,x,z,e=>{if(e.len>3&&inset>2.4)for(const o of inset>4.5?[1.3,3.5]:[1.3])b.box('warm',e.mx-e.nx*o,y+fh-.1,e.mz-e.nz*o,e.len*.84,.04,.16,e.rot);});
  // Warm room back walls are what the dusk cutaways show behind every pane.
  if(liner)edges(liner,x,z,e=>b.pane(litInterior,e.mx,y+.3+(fh-.34)/2,e.mz,e.len+.02,fh-.34,e.rot));
 }
 if(piers)edges(p,x,z,e=>{
  if(e.len<piers*1.5)return;
  const n=Math.round(e.len/piers);
  for(let k=1;k<n;k++){const px=e.ax+e.tx*e.len*k/n,pz=e.az+e.tz*e.len*k/n;b.box(skin,px+e.nx*.25,base+h/2+.3,pz+e.nz*.25,.8,h+.6,.9,e.rot);}
 });
 if(roof){
  const top=base+h;
  slab(b,deck,x,top,z,w-.1,d-.1,.4,er);
  slab(b,'night',x,top+.42,z,w-1.3,d-1.3,.06,Math.max(.3,er-.65));
  edges(p,x,z,e=>{
   // Roof fascia and parapet with a steel coping and lit soffit edge.
   b.box(skin,e.mx+e.nx*.1,top+.375,e.mz+e.nz*.1,e.len+.04,1.45,.5,e.rot);
   b.box('steel',e.mx+e.nx*.12,top+1.14,e.mz+e.nz*.12,e.len+.06,.08,.62,e.rot);
   b.box(trim,e.mx+e.nx*.345,top-.26,e.mz+e.nz*.345,e.len+.04,.06,.06,e.rot);
  });
  // Occupied roofs carry stone-edged planters, never a green slab.
  if(planters&&w>14&&d>12)for(const side of [-1,1])planter(b,x+side*w*.24,top+.5,z-d*.32,w*.20,1.25);
 }
 return {x,z,w,d,h,base,top:base+h+.48};
}
const roofTop=(base,h)=>base+h+.48;

// Glazed entrance: stone apron, cantilevered canopy with lit soffit, doors.
function entry(b,x,z,w=7){
 slab(b,'stone',x,.03,z,w+2,3,.18,.7);
 b.box('dark',x,3.45,z-.1,w,.32,2.9);b.box('steel',x,3.63,z-.1,w+.1,.06,2.98);
 b.box('warm',x,3.26,z+.2,w*.84,.04,.12);b.box('gold',x,3.45,z+1.37,w,.06,.06);
 for(const side of [-1,1]){b.box(referenceGlazing,x+side*w*.23,1.6,z-1.2,w*.44,3.1,.04);b.box('dark',x+side*w*.46,1.6,z-1.2,.12,3.2,.16);b.box('steel',x+side*.13,1.35,z-1.1,.04,.7,.05);}
}
function solar(b,x,y,z,w,d){
 for(let a=-w*.5;a<w*.5-2.9;a+=3.2)for(let c=-d*.5;c<d*.5-1.9;c+=2.2){b.box('solar',x+a+1.45,y,z+c+.95,2.9,.13,1.9);b.box('steel',x+a+1.45,y+.075,z+c+.95,.035,.03,1.9);}
 // Low steel racking rails carry the modules above the membrane.
 for(let a=-w*.5;a<w*.5-2.9;a+=6.4)b.box('steel',x+a+1.45,y-.2,z,.08,.36,d*.96);
}
function pergola(b,x,y,z,w,d){
 for(const side of [-1,1])for(const end of [-1,1])cylinder(b,'steel',x+side*w*.45,y+1.5,z+end*d*.45,.1,3,.1,8);
 for(let q=-w*.5;q<=w*.5;q+=.9)b.box('copper',x+q,y+3,z,.13,.22,d);
}
function planter(b,x,y,z,w,d){slab(b,'dark',x,y,z,w,d,.65,.6);slab(b,'leaf',x,y+.66,z,w-.3,d-.3,.2,.4);for(let xx=-w*.3;xx<=w*.3;xx+=2.4)roofTree(b,x+xx,y+.86,z,Math.min(.85,d*.5));}
function screen(b,x,y,z,w,h){b.box('dark',x,y,z,w,h,.2);b.box('blueGlass',x,y,z+.115,w-.2,h-.2,.025);for(let q=-w*.4;q<w*.4;q+=w*.12)b.box('cyan',x+q,y-h*.1,z+.16,.07,h*.45,.01);}
function auditorium(b,x,y,z,w,d){
 for(let row=0;row<6;row++){
  // Stepped risers carry the seat rows; seats never float above the floor.
  b.box('dark',x,y+row*.35+.175,z+row*d/7,w*.9,row*.35+.35,d/7);
  for(let seat=0;seat<9;seat++){
   const px=x+(seat-4)*w/10,pz=z+row*d/7;
   b.box('civic',px,y+row*.35+.48,pz,w/12,.18,.7);b.box('copper',px,y+row*.35+.92,pz+.36,w/12,.86,.10);
  }
 }
 screen(b,x,y+3,z-1,w*.8,4);
}
function terrace(b,x,y,z,w,d){
 slab(b,'stone',x,y,z,w,d,.32,2);
 for(const side of [-1,1]){
  b.box(referenceGlazing,x,y+.95,z+side*d*.5,w,1.25,.05);
  b.box('copper',x,y+1.61,z+side*d*.5,w,.07,.075);
  b.box(referenceGlazing,x+side*w*.5,y+.95,z,.05,1.25,d);
  b.box('copper',x+side*w*.5,y+1.61,z,.075,.07,d);
  for(let q=-w*.45;q<w*.46;q+=3)b.box('steel',x+q,y+.97,z+side*d*.5,.055,1.3,.07);
 }
 for(let q=-w*.35;q<=w*.35;q+=6)planter(b,x+q,y+.33,z+d*.28,3,1.4);
}
// Graphite identity panel with steel reveals, a gold emblem ring and an
// anchored nameplate (the lettering is added by buildings.js).
function signPanel(b,root,{x,y,z,w,h,depth=.7,yaw=0,text,emblem=true,mat='dark'}){
 b.box(mat,x,y,z,w,h,depth,yaw);
 const nx=Math.sin(yaw),nz=Math.cos(yaw),tx=Math.cos(yaw),tz=-Math.sin(yaw),f=depth/2;
 for(const s of [-1,1])b.box('steel',x+tx*s*w/2,y,z+tz*s*w/2,.14,h+.12,depth+.12,yaw);
 b.box('gold',x+nx*(f+.04),y-h/2+.3,z+nz*(f+.04),w*.86,.07,.07,yaw);
 if(emblem){const r=Math.min(w,h)*.13,g=new T.TorusGeometry(r,Math.max(.06,r*.08),8,48);b.add(g,'gold',x+nx*(f+.05),y+h*.22,z+nz*(f+.05),1,1,1,yaw);g.dispose();}
 if(text&&root)root.userData.signAnchor={text,width:w*.84,height:Math.min(h*.14,w*.15),position:[x+nx*(f+.07),y-h*.12,z+nz*(f+.07)],yaw};
}
// Curved identity panel on a rounded building corner.
function curvedSign(b,root,{cx,cz,radius,a0,a1,y,h,text}){
 sector(b,'dark',cx,cz,radius,radius+.55,a0,a1,y,h,18);
 sector(b,'gold',cx,cz,radius+.5,radius+.62,a0,a1,y+.25,.07,18);
 sector(b,'steel',cx,cz,radius-.02,radius+.64,a0,a1,y+h,.1,18);
 const a=(a0+a1)/2,px=cx+Math.cos(a)*(radius+.62),pz=cz+Math.sin(a)*(radius+.62),yaw=Math.atan2(Math.cos(a),Math.sin(a));
 const r=Math.min(h*.14,1.6),g=new T.TorusGeometry(r,r*.08,8,48);b.add(g,'gold',px,y+h*.72,pz,1,1,1,yaw);g.dispose();
 if(text)root.userData.signAnchor={text,width:radius*(a1-a0)*.72,height:Math.min(h*.16,2.2),position:[px+Math.cos(a)*.08,y+h*.38,pz+Math.sin(a)*.08],yaw};
}
function tallPole(b,x,z,h){cylinder(b,'steel',x,h/2,z,.12,h,.09,8);b.box('dark',x,h+.1,z,.9,.22,.45);b.box('warm',x,h-.02,z,.7,.03,.3);}

// Fine equipment is generated from each actual wing footprint/floor elevation,
// never scattered on a campus-wide grid or beyond a building's own room envelope.
function taskChair(b,x,y,z){
 slab(b,'dark',x,y+.44,z,.60,.58,.13,.16);
 b.box('dark',x,y+.82,z+.24,.61,.63,.09);
 cylinder(b,'steel',x,y+.23,z,.045,.44,.045,8);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,dx=Math.cos(a)*.28,dz=Math.sin(a)*.28;line(b,'steel',[[x,y+.10,z],[x+dx,y+.06,z+dz]],.025);cylinder(b,'dark',x+dx,y+.04,z+dz,.055,.055,.055,6);}
 for(const dx of [-.33,.33])b.box('steel',x+dx,y+.67,z,.035,.035,.34);
}
function desk(b,x,y,z,width=2){
 slab(b,'stone',x,y+.76,z,width,.94,.075,.10);
 for(const dx of [-width*.4,width*.4]){b.box('steel',x+dx,y+.38,z,.06,.75,.65);}
 taskChair(b,x,y,z+.95);
}
function monitor(b,x,y,z,width=.75){
 b.box('dark',x,y+.12,z,.34,.035,.22);b.box('steel',x,y+.29,z,.035,.30,.035);
 screen(b,x,y+.52,z,width,.45);
 b.box('dark',x,y+.05,z+.40,width*.85,.025,.20);
}
function cabinet(b,x,y,z,w=1.2,h=1.6){
 b.box('steel',x,y+h*.5,z,w,h,.6);
 for(let j=0;j<4;j++){b.box('white',x,y+.17+j*(h-.2)/4,z+.315,w-.07,(h-.2)/4-.04,.045);b.box('dark',x,y+.17+j*(h-.2)/4,z+.35,w*.32,.025,.025);}
 for(const dx of [-w*.35,w*.35])cylinder(b,'dark',x+dx,y+.07,z,.065,.13,.065,6);
}
function clinicalBed(b,x,y,z){
 slab(b,'white',x,y+.65,z,1.0,2.2,.18,.20);slab(b,'civic',x,y+.84,z,1.0,2.0,.12,.17);
 slab(b,'white',x,y+.97,z-.65,.75,.46,.10,.13);
 for(const dx of [-.4,.4])for(const dz of [-.78,.78]){b.box('steel',x+dx,y+.33,z+dz,.06,.65,.06);cylinder(b,'dark',x+dx,y+.07,z+dz,.085,.12,.085,8);}
}
function occupiedDetails(b,wing,id,floor,index){
 const {x,z,w,d,base,h,levels}=wing,y=base+floor*h/levels+(floor===0&&base>0?.62:.32);
 occupiedBays(b,outline(w,d,wing.r).map(([px,pz])=>[x+px,z+pz]),y,h/levels-.32);
 // Small rooftop booths deliberately receive one compact work setting only.
 if(w<8||d<10){if(w>3.5&&d>3.5){const zz=z+d*.26;desk(b,x,y,zz,.95);monitor(b,x,y+.8,zz-.2,.50);}return;}
 if(id===13&&w>20&&d>18&&base>0){ // dense analysis benches in the upper research pavilion
  for(let xx=x-w*.34;xx<=x+w*.35;xx+=5.2)for(let zz=z-d*.27;zz<=z+d*.16;zz+=5.4){
   desk(b,xx,y,zz,2.6);monitor(b,xx+.65,y+.8,zz-.2);
   b.box('white',xx-.65,y+1.1,zz,.64,.54,.60);screen(b,xx-.65,y+1.13,zz+.31,.42,.30);
   for(let vial=0;vial<4;vial++)cylinder(b,'blueGlass',xx-.25+vial*.15,y+.91,zz+.32,.04,.22,.04,8);
  }
 }
 const n=Math.min(4,Math.max(1,Math.floor((w-8)/8)));
 for(let k=0;k<n;k++){
  const px=x+(k-(n-1)/2)*Math.min(7.4,(w-8)/n),pz=z+d*.5-4.0;
  // Front glazing is the clearest source cutaway correspondence. These items
  // stay a full four metres behind it, inside rounded facade corner transitions.
  const mode=(floor+k+index)%3;
  if(id===13){
   if(mode===0){clinicalBed(b,px,y,pz);cabinet(b,px+1.6,y,pz,1.1,1.1);monitor(b,px+1.6,y+1.12,pz-.15);}
   else {desk(b,px,y,pz,2.5);b.box('white',px-.6,y+1.12,pz-.10,.75,.55,.65);screen(b,px-.6,y+1.16,pz+.24,.44,.28);for(let i=0;i<4;i++)cylinder(b,'blueGlass',px+.2+i*.18,y+.94,pz,.045,.26,.045,8);monitor(b,px+.65,y+.8,pz-.18);}
  }else if(id===14){
   slab(b,'copper',px,y+.7,pz,1.6,.85,.09,.28);taskChair(b,px-.95,y,pz);taskChair(b,px+.95,y,pz);
   b.box('dark',px,y+.92,pz,.13,.18,.12);cylinder(b,'steel',px,y+.82,pz,.025,.2,.025,8);
   b.box('civic',px-1.65,y+1.10,pz-.5,.10,2.1,2.2);b.box('civic',px,y+1.1,pz-1.6,3.4,2.1,.10);
   screen(b,px,y+1.4,pz-1.43,1.0,.6);
  }else if(id===15){
   if(mode===1)clinicalBed(b,px,y,pz);
   else {b.box('dark',px,y+.24,pz,1.05,.20,2.0);for(const dx of [-.45,.45])line(b,'steel',[[px+dx,y+.3,pz-.7],[px+dx,y+1.25,pz-.7],[px+dx,y+1.15,pz+.15]],.04);screen(b,px,y+1.25,pz-.67,.68,.4);}
   cabinet(b,px+1.45,y,pz-.65,.8,1.3);
  }else if(id===16||id===17){
   desk(b,px,y,pz,2.6);
   b.box('dark',px-.65,y+1.13,pz,.8,.66,.65);b.box(referenceGlazing,px-.65,y+1.14,pz+.355,.65,.50,.035);
   b.box('steel',px-.65,y+1.49,pz,.62,.07,.52);cylinder(b,'copper',px-.65,y+1.12,pz,.13,.25,.13,10);
   monitor(b,px+.66,y+.8,pz-.2);cabinet(b,px+1.85,y,pz,1,1.1);
   if(id===17)for(let i=0;i<3;i++)b.box(i%2?'copper':'stone',px+.35+i*.23,y+.86,pz+.25,.18,.09,.20);
  }else if(id===18){
   desk(b,px,y,pz,2.2);monitor(b,px,y+.8,pz-.2);
   for(let row=0;row<2;row++)for(let col=0;col<2;col++){const xx=px+1.45+col*.65,yy=y+.26+row*.53;b.box('dark',xx,yy,pz,.60,.49,.74);b.box('steel',xx,yy,pz+.39,.23,.04,.025);for(const dx of [-.25,.25])b.box('steel',xx+dx,yy,pz+.39,.04,.42,.035);}
  }else if(id===19){
   desk(b,px,y,pz,2.4);monitor(b,px-.55,y+.8,pz-.2);cabinet(b,px+1.8,y,pz,1.1,2.1);
   for(let i=0;i<5;i++)b.box(i%2?'copper':'dark',px+.12+i*.15,y+1.0,pz-.15,.11,.40,.27);
   b.box('stone',px+.55,y+.87,pz+.25,.57,.025,.38);
  }else if(id===20||id===24){
   desk(b,px,y,pz,2.65);for(const dx of [-.8,0,.8])monitor(b,px+dx,y+.8,pz-.2,.68);
   cabinet(b,px+1.9,y,pz-1,.72,2.0);for(let j=0;j<5;j++)b.box('cyan',px+1.9,y+.35+j*.31,pz-.66,.04,.04,.01);
  }else if(id===21){
   cabinet(b,px,y,pz,1.1,2.0);screen(b,px,y+1.45,pz+.35,.72,.5);
   for(let i=0;i<3;i++)cylinder(b,'steel',px+1.2+i*.42,y+.65,pz,.13,1.3,.13,12);
   line(b,'copper',[[px+1.2,y+1.3,pz],[px+1.2,y+1.7,pz],[px+2.05,y+1.7,pz],[px+2.05,y+1.3,pz]],.065);
   ring(b,'gold',px+1.65,y+1.72,pz,.16,.025,0);
  }else if(id===22){
   desk(b,px,y,pz,2.6);monitor(b,px-.6,y+.8,pz-.2);monitor(b,px+.3,y+.8,pz-.2);
   b.box('dark',px+1,y+.94,pz,.18,.22,.20);b.box('white',px+.65,y+.87,pz+.25,.28,.025,.42);
   taskChair(b,px,y,pz-1.3);
  }else if(id===23){
   if(mode===0){slab(b,'copper',px,y+.73,pz,2.1,1.1,.08,.22);for(const dx of [-.65,.65])for(const dz of [-.85,.85])taskChair(b,px+dx,y,pz+dz);}
   else {slab(b,'civic',px,y+.38,pz,2.0,.90,.24,.20);b.box('civic',px,y+.79,pz-.4,2, .75,.20);for(const dx of [-1,1])b.box('civic',px+dx,y+.62,pz,.17,.49,.90);slab(b,'copper',px,y+.45,pz+1.3,1.2,.7,.09,.20);}
  }
  // Suspended task lighting is connected to the ceiling by two real stems.
  const cy=base+(floor+1)*h/levels-.78;
  b.box('warm',px,cy,pz,2.2,.04,.14);
  for(const dx of [-.8,.8])cylinder(b,'steel',px+dx,cy+.34,pz,.012,.64,.012,6);
 }
}

function nearDetailFactory(id,wingRecords){
 return function createNearDetail(){
  const near=new Batch();
  for(const [i,room] of wingRecords.entries())for(let floor=0;floor<room.levels;floor++)occupiedDetails(near,room,id,floor,i);
  const detail=near.finish(`CF-${id}-program-equipment`);
  detail.userData.nearDetail=true;
  return detail;
 };
}

// Shared massing constants so the approach-distance fidelity pass
// (reference-fidelity.js) lands on the same roofs and forecourts.
function massing(f){
 const {id,w,d,h}=f;
 switch(id){
  case 14:return {lowH:h*.64};
  case 15:return {podiumH:17,upperH:8.5};
  case 16:return {mainH:h*.78};
  case 17:return {researchH:Math.max(h,26)};
  case 20:return {podH:h*.13};
  case 22:return {mainH:h*.74};
  default:return {};
 }
}

export function createFacility13to24(f,{deferDetails=false}={}){
 if(f.id<13||f.id>24)return null;
 const {w,d,h,id}=f,b=new Batch(),root=new T.Group(),M=massing(f);root.name=`CF-${id}-individual-reference-architecture`;
 if(id===13){ // Eon: connected perimeter sections, not independent roof ribbons.
  const deck=h*.56,low=h*.32;
  // The front garden shoulder drops at the right; the occupied upper pavilion
  // sits behind it. Closed soffit/roof strips share the facade's exact section.
  const p=outline(w*.97,d*.78,d*.12).map(([x,z])=>[x,z-d*.015]);
  const shoulder=x=>deck-(deck-low)*T.MathUtils.smoothstep(x,-w*.02,w*.32);
  const top=(x,z)=>T.MathUtils.lerp(shoulder(x),deck,T.MathUtils.smoothstep(-z,-d*.04,d*.24));
  slab(b,'dark',0,0,-d*.015,w*.97,d*.78,.1,d*.12);
  // A continuous weather roof and glass envelope with a real changing section.
  // Each strip is attached to its perimeter, never lofted across occupied rooms.
  for(let j=0;j<p.length;j++){
   const a=p[j],c=p[(j+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.max(1,Math.ceil(len/1.9));
   for(let q=0;q<n;q++){
    const ax=T.MathUtils.lerp(a[0],c[0],q/n),az=T.MathUtils.lerp(a[1],c[1],q/n),cx=T.MathUtils.lerp(a[0],c[0],(q+1)/n),cz=T.MathUtils.lerp(a[1],c[1],(q+1)/n);
    const ay=top(ax,az),cy=top(cx,cz),dx=cx-ax,dz=cz-az,L=Math.hypot(dx,dz),nx=-dz/L,nz=dx/L;
    const vertices=[ax,.32,az,cx,.32,cz,cx,cy-.35,cz,ax,ay-.35,az];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();b.add(g,referenceGlazing);g.dispose();
    line(b,'dark',[[ax-nx*.12,.32,az-nz*.12],[ax-nx*.12,ay-.3,az-nz*.12]],.07);
    // Closed quadrilateral annulus section: exterior fascia, soffit and coping.
    const strip=new T.BufferGeometry(),v=[];
    for(const [x,y,z] of [[ax,ay-.55,az],[cx,cy-.55,cz],[cx+nx*1.15,cy-.55,cz+nz*1.15],[ax+nx*1.15,ay-.55,az+nz*1.15],[ax,ay+.55,az],[cx,cy+.55,cz],[cx+nx*1.15,cy+.55,cz+nz*1.15],[ax+nx*1.15,ay+.55,az+nz*1.15]])v.push(x,y,z);
    strip.setAttribute('position',new T.Float32BufferAttribute(v,3));strip.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);const flat=strip.toNonIndexed();flat.computeVertexNormals();b.add(flat,'dark');flat.dispose();strip.dispose();
    // Lit gold soffit edge under the sweeping graphite fascia.
    line(b,'gold',[[ax-nx*.05,ay-.6,az-nz*.05],[cx-nx*.05,cy-.6,cz-nz*.05]],.05);
   }
  }
  // Front shoulder roof is a shallow continuous surface closing the lower
  // occupied lobby, following the same section as the outer facade.
  const roof=new T.BufferGeometry(),v=[0,top(0,-d*.015)-.10,-d*.015],ix=[];
  // Concentric rings close the entire convex footprint; no open rear strip.
  const roofRings=12;
  for(let ring=1;ring<=roofRings;ring++)for(const [px,pz] of p){
   const t=ring/roofRings,x=px*t,z=-d*.015+(pz+d*.015)*t;v.push(x,top(x,z)-.10,z);
  }
  for(let j=0;j<p.length;j++)ix.push(0,1+(j+1)%p.length,1+j);
  for(let ring=1;ring<roofRings;ring++)for(let j=0;j<p.length;j++){
   const a=1+(ring-1)*p.length+j,c=1+(ring-1)*p.length+(j+1)%p.length,b=a+p.length,e=c+p.length;ix.push(a,c,b,c,e,b);
  }
  roof.setAttribute('position',new T.Float32BufferAttribute(v,3));roof.setIndex(ix);roof.computeVertexNormals();b.add(roof,'dark');roof.dispose();
  // Planted shoulder follows the descending fascia as individual level beds.
  for(let x=-w*.39;x<=w*.40;x+=3.0){
   const z=d*.295,y=top(x,z)+.04;
   planter(b,x,y,z,2.9,3.3);roofTree(b,x,y+.86,z,1.85);
  }
  // Upper laboratories and clinical review occupy one inset pavilion, with
  // a full roof and a lower right room, not three colliding glazed boxes.
  wing(b,-w*.15,-d*.14,w*.63,d*.45,h-deck,1,{base:deck,r:d*.04,skin:'dark',fins:false,planters:false});
  wing(b,w*.315,-d*.12,w*.28,d*.42,deck-low,1,{base:low,r:d*.025,skin:'dark'});
  wing(b,-w*.2375,-d*.03,w*.435,d*.62,deck-.35,2,{r:1,roof:false,facade:false});
  wing(b,w*.28,-d*.03,w*.32,d*.60,low-.35,1,{r:1,roof:false,facade:false});
  // Two usable front laboratory terraces; their horizontal slabs terminate
  // before the sloping shoulder and never slice through the perimeter fascia.
  terrace(b,-w*.2225,deck,d*.16,w*.405,d*.12);
  terrace(b,w*.315,low,d*.16,w*.27,d*.12);
  solar(b,-w*.15,roofTop(deck,h-deck)+.35,-d*.16,w*.48,d*.30);
  for(const [gx,gz,gw,gd,gy] of [[-w*.15,-d*.34,w*.48,2.3,roofTop(deck,h-deck)+.02],[-w*.2225,d*.205,w*.38,2.0,deck+.33],[w*.32,d*.20,w*.23,2.0,low+.33]]){
   planter(b,gx,gy,gz,gw,gd);for(let tx=-gw*.4;tx<=gw*.4;tx+=3.4)roofTree(b,gx+tx,gy+.86,gz,1.45);
  }
  // Front-left graphite sign pier and dense bronze louvres are source identity.
  signPanel(b,root,{x:-w*.27,y:deck*.48,z:d*.379,w:w*.18,h:deck*.96,depth:.65,text:'EON CORE'});
  for(let x=-w*.15;x<w*.08;x+=.72){const y=shoulder(x);b.box('copper',x,y*.55,d*.382,.12,y*.76,.55);}
  // Water flows along the right elevation into a contained reflecting basin.
  const wx=w*.486,wz=-d*.055,waterLength=d*.53;
  b.box('dark',wx,low*.48,wz,.75,low*.96,waterLength);
  b.box('water',wx+.42,low*.46,wz,.05,low*.84,waterLength-.8);
  for(let z=wz-waterLength*.47;z<wz+waterLength*.48;z+=.28)line(b,'blueGlass',[[wx+.47,low*.89,z],[wx+.62,.64,z]],.028);
  b.box('stone',wx+1.45,.15,wz,2.8,.30,waterLength+1.4);
  b.box('water',wx+1.45,.33,wz,2.2,.055,waterLength+.6);
  for(const z of [wz-waterLength/2-.5,wz+waterLength/2+.5])b.box('stone',wx+1.45,.44,z,2.8,.6,.35);
  b.box('stone',wx+2.68,.44,wz,.35,.6,waterLength+1.4);
  entry(b,w*.18,d*.38,w*.17);
 }else if(id===14){ // Cognara: capsule-plan research institute, inset top floor, curved corner sign.
  const lowH=M.lowH,capR=d*.36,cz=d*.03,er=cornerRadius(w*.98,d*.80,capR);
  wing(b,0,cz,w*.98,d*.80,lowH,2,{r:capR});
  const upper=wing(b,-w*.03,-d*.15,w*.86,d*.40,h-lowH,1,{base:lowH,r:d*.19,planters:false});
  // Planted roof garden ring in front of the inset research floor.
  for(let x=-w*.30;x<=w*.14;x+=w*.11)planter(b,x,roofTop(0,lowH)+.02,d*.30,w*.08,2.2);
  terrace(b,w*.24,roofTop(0,lowH)+.02,d*.20,w*.26,d*.16);
  solar(b,w*.12,upper.top+.35,-d*.15,w*.40,d*.26);
  for(let x=-w*.36;x<=-w*.1;x+=w*.065)planter(b,x,upper.top+.02,-d*.15,w*.05,2.4);
  // Curved graphite identity panel wraps the front-right capsule corner.
  const ccx=w*.49-er,ccz=cz+d*.40-er;
  curvedSign(b,root,{cx:ccx,cz:ccz,radius:er+.45,a0:.18,a1:1.12,y:lowH*.18,h:lowH*.62,text:'COGNARA MIND'});
  entry(b,-w*.12,cz+d*.40+1.3,w*.18);
 }else if(id===15){ // Kinetic Edge: occupied podium around an open sprint/turf court, angled sign cheeks.
  const {podiumH,upperH}=M;
  root.userData.envelopeHeight=podiumH+upperH+2.3;
  wing(b,0,0,w*.98,d*.96,podiumH,2,{r:3});
  // Occupied rim: rear coaching bar and a taller glazed motion-capture cage.
  wing(b,-w*.03,-d*.37,w*.90,d*.20,upperH,1,{base:podiumH,r:1});
  wing(b,w*.33,d*.04,w*.28,d*.50,upperH+1,1,{base:podiumH,r:1,fins:true});
  const y=roofTop(0,podiumH)+.02,cx=-w*.15;
  // Blue sprint lanes wrap the front and left edge of the open court (an
  // L-shaped indoor track in the source); green turf fills the centre.
  slab(b,sprintTrack,cx,y,d*.34,w*.60,d*.17,.08,.4);
  slab(b,sprintTrack,-w*.405,y,0,w*.09,d*.5,.08,.4);
  for(let i=1;i<6;i++)b.box('white',cx,y+.09,d*.34-d*.085+i*d*.17/6,w*.58,.04,.07);
  for(let i=1;i<4;i++)b.box('white',-w*.45+i*w*.09/4,y+.09,0,.07,.04,d*.48);
  for(const x of [cx-w*.2,cx+w*.27])b.box('white',x,y+.09,d*.34,.10,.04,d*.16);
  const tx=-w*.10,tw=w*.50;
  slab(b,turf,tx,y,-d*.02,tw,d*.40,.10,1);
  for(const [x,z,ww,dd] of [[tx,-d*.02,tw*.93,.12],[tx,-d*.02+d*.19,tw*.93,.12],[tx,-d*.02-d*.19,tw*.93,.12],[tx-tw*.465,-d*.02,.12,d*.38],[tx+tw*.465,-d*.02,.12,d*.38],[tx,-d*.02,.12,d*.38]])b.box('white',x,y+.11,z,ww,.04,dd);
  // Timing gantry and floodlight masts at the court corners.
  for(const side of [-1,1])cylinder(b,'steel',w*.1,y+2.4,d*.34+side*d*.09,.12,4.8,.12,10);
  b.box('dark',w*.1,y+4.9,d*.34,.5,.5,d*.2);b.box('warm',w*.1,y+4.62,d*.34,.3,.04,d*.18);
  for(const [x,z] of [[-w*.46,-d*.24],[-w*.46,d*.44],[w*.16,d*.44]])tallPole(b,x,z,y+9);
  // Angled graphite cheeks frame the front-left corner and carry the sign.
  const zf=d*.48+.45,cheekTop=podiumH+4.2;
  {const s=new T.Shape([new T.Vector2(-w*.49,.8),new T.Vector2(-w*.22,.8),new T.Vector2(-w*.25,cheekTop),new T.Vector2(-w*.50,cheekTop)]);
   const g=new T.ExtrudeGeometry(s,{depth:.9,bevelEnabled:false});g.translate(0,0,zf);b.add(g,'dark');g.dispose();
   b.box('gold',-w*.36,cheekTop-.05,zf+.95,w*.27,.07,.07);}
  {const s=new T.Shape([new T.Vector2(d*.49,.8),new T.Vector2(d*.10,.8),new T.Vector2(d*.14,cheekTop),new T.Vector2(d*.495,cheekTop)]);
   const g=new T.ExtrudeGeometry(s,{depth:.9,bevelEnabled:false});g.rotateY(-Math.PI/2);g.translate(-w*.49-.45,0,0);b.add(g,'dark');g.dispose();}
  {const r=2.1,g=new T.TorusGeometry(r,.16,8,48);b.add(g,'gold',-w*.365,podiumH*.78,zf+.97);g.dispose();}
  root.userData.signAnchor={text:'KINETIC EDGE',width:w*.2,height:2.4,position:[-w*.365,podiumH*.5,zf+.97],yaw:0};
  // Actual treadmills in the glazed recovery gym, visible from the approach.
  for(let i=0;i<6;i++){
   const x=-w*.12+i*w*.07,z=d*.385;
   b.box('dark',x,.52,z,1.35,.22,2.4);b.box('steel',x,.36,z,.18,.12,1.8);
   for(const side of [-1,1])line(b,'steel',[[x+side*.55,.63,z-.8],[x+side*.55,1.5,z-.85],[x+side*.55,1.5,z+.3]],.055);
   screen(b,x,1.55,z-.9,1,.62);
  }
  entry(b,w*.05,d*.48+1.4,w*.18);
 }else if(id===16){ // Civic: public block, curved bronze lobby, sweeping blue-glass canopy.
  const mainH=M.mainH;
  wing(b,0,-d*.14,w*.96,d*.62,mainH,2,{r:1.5});
  auditorium(b,0,mainH/2+.32,-d*.30,w*.30,d*.22);
  // Raised auditorium clerestory above the rear hall.
  const hall=wing(b,w*.02,-d*.22,w*.36,d*.34,h-mainH-1.6,1,{base:mainH,r:1,planters:false});
  solar(b,w*.02,hall.top+.35,-d*.22,w*.30,d*.26);
  for(const side of [-1,1])planter(b,side*w*.33,roofTop(0,mainH)+.02,-d*.05,w*.22,2.4);
  // Curved glazed lobby with bronze floor bands carries the public name.
  const lobby=wing(b,-w*.18,d*.28,w*.52,d*.25,mainH*.62,1,{r:d*.12,skin:'copper',trim:'warm'});
  signPanel(b,root,{x:-w*.22,y:lobby.top-1.2,z:d*.28+d*.125+.95,w:w*.32,h:2.4,depth:.5,text:'CIVIC CORE PUBLIC HUB',emblem:false});
  // Sweeping solar-glass canopy: blue glass bays between steel ribs on
  // branching columns, following a real circular sweep in plan.
  const C=[w*.22,-d*.16],R=d*.54,half=6.4,a0=Math.PI*.32,a1=Math.PI*.74,steps=18,canopyY=a=>lobby.top+.9-(a1-a)/(a1-a0)*1.6+Math.sin((a-a0)/(a1-a0)*Math.PI)*1.4;
  const inner=[],outer=[];
  for(let i=0;i<=steps;i++){const a=a0+(a1-a0)*i/steps,y=canopyY(a);inner.push([C[0]+Math.cos(a)*(R-half),y,C[1]+Math.sin(a)*(R-half)]);outer.push([C[0]+Math.cos(a)*(R+half),y+.4,C[1]+Math.sin(a)*(R+half)]);}
  line(b,'steel',inner,.16);line(b,'steel',outer,.2);
  for(let i=0;i<steps;i++){
   const a=a0+(a1-a0)*(i+.5)/steps,y=canopyY(a)+.2,mx=C[0]+Math.cos(a)*R,mz=C[1]+Math.sin(a)*R,len=R*(a1-a0)/steps;
   b.box('blueGlass',mx,y,mz,len-.08,.06,half*2-.3,-Math.atan2(Math.cos(a),-Math.sin(a)));
   line(b,'steel',[inner[i],outer[i]],.08);
  }
  line(b,'steel',[inner[steps],outer[steps]],.08);
  for(const t of [.2,.5,.8]){
   const a=a0+(a1-a0)*t,x=C[0]+Math.cos(a)*R,z=C[1]+Math.sin(a)*R,y=canopyY(a);
   cylinder(b,'steel',x,y*.35,z,.24,y*.7,.2,12);
   for(const s of [-1,1])line(b,'steel',[[x,y*.68,z],[x+Math.cos(a)*s*3.2,y+.05,z+Math.sin(a)*s*3.2]],.1);
   line(b,'steel',[[x,y*.68,z],[x,y+.05,z]],.1);
  }
  // Freestanding identity totem at the plaza edge.
  signPanel(b,null,{x:w*.43,y:3.6,z:d*.46,w:2.4,h:7.2,depth:.7,emblem:true});
  entry(b,-w*.12,d*.405+1.5,w*.2);
 }else if(id===17){ // Terra Axis: research block, raised solar canopy yard, inspection pad, prototype homes.
  const researchH=M.researchH;root.userData.envelopeHeight=researchH+2;
  wing(b,-w*.06,-d*.12,w*.44,d*.64,researchH,3,{r:1,fins:true});
  for(let x=-w*.2;x<=w*.08;x+=w*.07)planter(b,x,roofTop(0,researchH)+.02,d*.1,w*.05,2);
  const pad=wing(b,w*.31,-d*.12,w*.26,d*.56,researchH*.66,2,{r:1});
  // Solar canopy yard: low materials hall under a raised photovoltaic roof.
  const yard=wing(b,-w*.39,-d*.20,w*.19,d*.52,4.6,1,{r:.8});
  for(const sx of [-1,1])for(const sz of [-1,0,1])cylinder(b,'steel',-w*.39+sx*w*.1,(yard.top+10.2)/2,-d*.20+sz*d*.27,.16,10.2-yard.top+.1,.16,10);
  b.box('dark',-w*.39,10.25,-d*.20,w*.21,.28,d*.58);
  solar(b,-w*.39,10.62,-d*.20,w*.21,d*.57);
  // Round drone inspection pad on the lower lab wing.
  cylinder(b,'concrete',w*.31,pad.top+.1,-d*.12,d*.17,.2,d*.17,48);ring(b,'white',w*.31,pad.top+.24,-d*.12,d*.13,.08);
  b.box('white',w*.31,pad.top+.23,-d*.12,d*.11,.06,.5);for(const a of [-1,1])b.box('white',w*.31+a*d*.052,pad.top+.23,-d*.12,.5,.06,d*.1);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;b.box('cyan',w*.31+Math.cos(a)*d*.155,pad.top+.23,-d*.12+Math.sin(a)*d*.155,.4,.06,.4);}
  // Prototype home village: five small dwellings with roof solar.
  for(let i=0;i<5;i++){const x=-w*.44+i*w*.105;const home=wing(b,x,d*.34,w*.075,d*.19,4.2,1,{r:.6,skin:'dark'});solar(b,x,home.top+.35,d*.34,w*.06,d*.13);}
  // Maintenance demonstration lane with marked service bays.
  for(let i=0;i<4;i++){const x=w*.17+i*w*.07;b.box('gold',x,.04,d*.34,.12,.04,d*.22);}
  b.box('gold',w*.275,.04,d*.23,w*.22,.04,.12);
  signPanel(b,root,{x:-w*.235,y:researchH*.47,z:-d*.12+d*.32+.9,w:w*.07,h:researchH*.8,depth:.8,text:'TERRA AXIS'});
  entry(b,w*.06,-d*.12+d*.32+1.5,w*.1);
 }else if(id===18){ // Nomad Nexus: long deployment bar, field-kit bay, projecting sign volume.
  wing(b,0,-d*.16,w*.97,d*.62,h,2,{r:1.2,fins:true,planters:false});
  const bay=wing(b,-w*.30,d*.30,w*.34,d*.28,h*.5,1,{r:1});
  const front=-d*.16+d*.31;
  // Projecting graphite identity volume over the recessed arrival.
  const sx=w*.12,sw=w*.3,sy=h*.66,sh=h*.3,sd=6.2,sz=front+sd/2-.1;
  b.box('dark',sx,sy,sz,sw,sh,sd);
  b.box('warm',sx,sy-sh/2-.03,sz+.4,sw*.9,.04,sd*.7);
  b.box('gold',sx,sy-sh/2+.05,front+sd-.05,sw,.08,.08);b.box('steel',sx,sy+sh/2+.05,sz,sw+.1,.1,sd+.1);
  for(const s of [-1,1])cylinder(b,'steel',sx+s*sw*.45,(sy-sh/2)/2,front+sd-.7,.2,sy-sh/2,.2,12);
  {const g=new T.TorusGeometry(sh*.22,.14,8,48);b.add(g,'gold',sx-sw*.36,sy,front+sd);g.dispose();}
  root.userData.signAnchor={text:'NOMAD NEXUS',width:sw*.62,height:sh*.3,position:[sx+sw*.06,sy,front+sd],yaw:0};
  // Global mobility map wall inside the upper floor, then stacked kit cases.
  screen(b,-w*.26,h*.74,front-1.4,w*.24,h*.28);
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){b.box('dark',-w*.40+i*2.2,.9+j*1.15,d*.30,1.9,.95,1.3);b.box('steel',-w*.40+i*2.2,.9+j*1.15,d*.30+.67,1.4,.05,.06);}
  solar(b,w*.25,roofTop(0,h)+.35,-d*.24,w*.36,d*.30);
  for(let x=-w*.40;x<=-w*.20;x+=w*.1)planter(b,x,bay.top+.02,d*.30,w*.07,2);
  entry(b,sx,front+1.5,w*.14);
 }else if(id===19){ // Juris Guard: framed regulatory block, set-back crown and a projecting judicial spine.
  const mainH=h*.72,body=wing(b,w*.03,-d*.02,w*.90,d*.90,mainH,3,{r:.6,piers:6.5});
  const crown=wing(b,w*.08,-d*.12,w*.66,d*.58,h*.18,1,{base:mainH,r:.5,piers:6,planters:false});
  // Heavy graphite portal columns at the block corners.
  for(const sx of [-1,1])for(const sz of [-1,1])b.box('dark',body.x+sx*(body.w/2+.3),mainH/2+.35,body.z+sz*(body.d/2+.3),1.3,mainH+.7,1.3);
  const spineZ=d*.06,spineD=d*.80,spineX=-w*.40,spineW=w*.2;
  b.box('dark',spineX,h*.47,spineZ,spineW,h*.94,spineD);
  const face=spineZ+spineD/2;
  b.box('steel',spineX,h*.94+.06,spineZ,spineW+.1,.12,spineD+.1);
  for(const s of [-1,1])b.box('gold',spineX+s*spineW*.46,h*.47,face+.03,.07,h*.9,.07);
  // Architectural scales: balanced pans and an actual central column.
  const sxs=spineX,sy=h*.64;
  cylinder(b,'gold',sxs,sy,face+.25,.14,h*.2,.14,10);b.box('gold',sxs,sy+h*.1,face+.25,w*.15,.14,.14);cylinder(b,'gold',sxs,sy-h*.1,face+.25,1.1,.25,1.3,16);
  for(const side of [-1,1]){for(const k of [-1,1])line(b,'gold',[[sxs+side*w*.07,sy+h*.1,face+.25],[sxs+side*w*.07+k*.9,sy+h*.02,face+.25]],.04);const g=new T.CylinderGeometry(1.0,.55,.35,20,1,true);b.add(g,'gold',sxs+side*w*.07,sy+h*.02,face+.25);g.dispose();}
  root.userData.signAnchor={text:'JURIS GUARD',width:spineW*.84,height:1.7,position:[spineX,h*.40,face+.07],yaw:0};
  // Policy ledger wall inside the ground-floor frontage.
  screen(b,w*.22,mainH/6+.4,body.z+body.d/2-1.3,w*.30,mainH/3-2.2);
  for(let x=-w*.2;x<=w*.3;x+=w*.25)planter(b,x,roofTop(0,mainH)+.02,d*.36,w*.16,2);
  solar(b,crown.x,crown.top+.35,crown.z,crown.w*.8,crown.d*.7);
  entry(b,w*.12,body.z+body.d/2+1.5,w*.18);
 }else if(id===20){ // Aether Link: tapered communications spire in an A-frame, glazed pods, halo crown.
  const podH=M.podH,tx=0,tz=-d*.08,t0=podH,t1=h*.86,aB=w*.13,aT=w*.05;
  wing(b,0,0,w*.96,d*.92,podH,2,{r:3});
  const halfAt=y=>aB+(aT-aB)*(y-t0)/(t1-t0);
  // Square tapered graphite spire, rotated so its faces align with the site.
  const g=new T.CylinderGeometry(aT*Math.SQRT2,aB*Math.SQRT2,t1-t0,4,1);g.rotateY(Math.PI/4);b.add(g,'dark',tx,(t0+t1)/2,tz);g.dispose();
  // Glazed signal command gallery and translation booth hung on the spire.
  const pods=[wing(b,tx+w*.06,tz+d*.14,w*.46,d*.36,h*.085,1,{base:h*.30,r:2}),wing(b,tx+w*.05,tz+d*.12,w*.38,d*.30,h*.075,1,{base:h*.46,r:1.6})];
  for(const pod of pods)for(const s of [-1,1])line(b,'steel',[[pod.x+s*pod.w*.42,pod.base-.2,pod.z+pod.d*.4],[tx+s*halfAt(pod.base-6)*.9,pod.base-6,tz+halfAt(pod.base-6)*.9]],.16);
  // Blue emblem light line on the front face and cyan corner light edges.
  line(b,'blueGlass',[[tx,h*.56,tz+halfAt(h*.56)+.25],[tx,h*.78,tz+halfAt(h*.78)+.25]],.34);
  line(b,'blueGlass',[[tx,t0+2,tz+halfAt(t0+2)+.25],[tx,h*.28,tz+halfAt(h*.28)+.25]],.34);
  for(const s of [-1,1])line(b,'cyan',[[tx+s*(aB+.05),t0+.5,tz+aB+.05],[tx+s*(aT+.05),t1-.5,tz+aT+.05]],.1);
  // A-frame structural legs rise from the podium corners to the crown deck.
  const cy=h*.80,R=Math.min(w,d)*.30;
  for(const s of [-1,1]){
   line(b,'dark',[[s*w*.40,podH+.4,d*.30],[tx+s*R*.82,cy-.6,tz+R*.25]],.75);
   line(b,'steel',[[s*w*.40,podH+.4,-d*.36],[tx+s*R*.82,cy-.6,tz-R*.25]],.45);
   line(b,'cyan',[[s*w*.40,podH+1.2,d*.30+.7],[tx+s*R*.82,cy-.2,tz+R*.25+.7]],.06);
   for(const t of [.33,.66])line(b,'steel',[[s*T.MathUtils.lerp(w*.40,R*.82,t),T.MathUtils.lerp(podH,cy,t),T.MathUtils.lerp(d*.30,tz+R*.25,t)],[s*halfAt(T.MathUtils.lerp(podH,cy,t)),T.MathUtils.lerp(podH,cy,t),tz]],.2);
  }
  // Crown deck, luminous halo and antenna array.
  cylinder(b,'steel',tx,cy,tz,R,.6,R*.92,48);cylinder(b,'dark',tx,cy-.55,tz,R*.9,.5,R*.7,48);
  ring(b,'cyan',tx,cy+.12,tz,R*1.04,.16);ring(b,'steel',tx,cy+2.4,tz,R*.72,.1);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=tx+Math.cos(a)*R*.78,z=tz+Math.sin(a)*R*.78;cylinder(b,'steel',x,cy+2.6,z,.14,4.6,.09,8);b.box('white',x,cy+3.4,z,.9,2.2,.35,a);line(b,'steel',[[x,cy+2.4,z],[tx+Math.cos(a)*R*.72,cy+2.4,tz+Math.sin(a)*R*.72]],.05);}
  cylinder(b,'steel',tx,(t1+h)/2+2,tz,.38,h-t1+4,.07,12);
  ring(b,'cyan',tx,h*.95,tz,1.1,.08);
  root.userData.signAnchor={text:'AETHER LINK',width:halfAt(h*.52)*1.6,height:1.1,position:[tx,h*.52,tz+halfAt(h*.52)+.45],yaw:0};
  entry(b,w*.1,d*.46+1.2,w*.24);
 }else if(id===21){ // Central utility: battery deck, turbine hall, stacks, vessels, fans and command room.
  const batt=wing(b,-w*.24,-d*.16,w*.45,d*.52,h*.36,1,{r:.7,mullion:3});
  const ctrl=wing(b,w*.30,d*.24,w*.35,d*.39,h*.36,1,{r:.7});
  wing(b,-w*.17,d*.31,w*.56,d*.27,h*.36,1,{r:.7,roof:false,liner:false,core:false,mullion:3});
  // Open steel portal frames over the turbine bay.
  for(let k=0;k<4;k++){const z=-d*.37+k*d*.11;for(const x of [w*.0,w*.35])cylinder(b,'steel',x,h*.2,z,.18,h*.4,.18,8);line(b,'steel',[[w*.0,h*.4,z],[w*.175,h*.46,z],[w*.35,h*.4,z]],.16);}
  // Teal battery deck with rows of containerised storage racks.
  slab(b,serviceDeck,-w*.24,batt.top+.02,-d*.16,w*.40,d*.44,.06,.4);
  for(let row=0;row<4;row++)for(let j=0;j<6;j++){const x=-w*.42+j*w*.065,z=-d*.34+row*d*.10;b.box('white',x,batt.top+.08+1.7,z,2,3.4,2);b.box('dark',x,batt.top+.08+1.7,z+1.02,1.45,2.7,.035);b.box('cyan',x,batt.top+3.2,z+1.05,1.3,.05,.03);}
  // Horizontal cogeneration turbines on plinths, banded casings.
  for(let k=0;k<3;k++){const x=w*.05+k*w*.135;b.box('concrete',x,.45,-d*.18,3.8,.9,d*.36);const g=new T.CylinderGeometry(2.1,2.1,d*.38,24);g.rotateX(Math.PI/2);b.add(g,'steel',x,3.1,-d*.18);g.dispose();for(let j=0;j<4;j++)ring(b,'dark',x,3.1,-d*.34+j*d*.09,2.17,.12,0);}
  for(let i=0;i<2;i++){cylinder(b,'steel',w*.39+i*w*.07,h*.49,-d*.38,1,h*.98,.65,16);ring(b,'dark',w*.39+i*w*.07,h*.9,-d*.38,.72,.1);}
  for(let j=0;j<5;j++){cylinder(b,'steel',-w*.38+j*w*.10,2.1,d*.31,1.5,4.2,1.5,20);cylinder(b,'dark',-w*.38+j*w*.10,4.3,d*.31,1.2,.2,1.5,20);}
  for(let j=0;j<3;j++){cylinder(b,'dark',w*.23+j*w*.095,ctrl.top+.4,d*.24,2,.8,2,24);ring(b,'steel',w*.23+j*w*.095,ctrl.top+.85,d*.24,1.9,.12);cylinder(b,'steel',w*.23+j*w*.095,ctrl.top+.7,d*.24,.3,.3,.3,12);}
  screen(b,w*.3,h*.22,d*.24+d*.195-1.3,w*.25,h*.19);
  signPanel(b,root,{x:-w*.455,y:h*.25,z:d*.455,w:w*.07,h:h*.5,depth:.8,text:'CF-21 UTILITY'});
  entry(b,w*.3,d*.24+d*.195+1.4,w*.17);
 }else if(id===22){ // Visitor center: long command block, bulging glazed arrival hall, corner sign.
  const mainH=M.mainH;
  wing(b,0,-d*.14,w*.96,d*.60,mainH,2,{r:1.5,fins:true});
  const front=-d*.14+d*.30;
  const hall=wing(b,-w*.085,d*.26,w*.73,d*.26,mainH*.55,1,{r:d*.12,planters:false});
  const theatre=wing(b,w*.22,-d*.20,w*.34,d*.40,h-mainH-1.2,1,{base:mainH,r:1});
  const command=wing(b,-w*.26,-d*.22,w*.30,d*.36,h-mainH-1.2,1,{base:mainH,r:1,planters:false});
  auditorium(b,w*.22,mainH+.62,-d*.30,w*.22,d*.22);
  screen(b,-w*.26,mainH+3.4,-d*.22+d*.18-1.4,w*.22,2.6);
  solar(b,command.x,command.top+.35,command.z,command.w*.8,command.d*.7);
  terrace(b,-w*.2,hall.top+.02,d*.26,w*.30,d*.12);
  for(let x=w*.0;x<=w*.2;x+=w*.1)planter(b,x,hall.top+.02,d*.30,w*.07,2);
  // Tall graphite identity panel at the right arrival corner.
  signPanel(b,root,{x:w*.43,y:(mainH+4)/2,z:front+1.0,w:w*.11,h:mainH+4,depth:.9,text:'VISITOR CENTER'});
  // Drop-off canopy with lit soffit on slender columns.
  b.box('dark',w*.39,4.7,d*.38,w*.18,.36,d*.18);b.box('warm',w*.39,4.5,d*.38,w*.15,.04,d*.12);b.box('gold',w*.39,4.7,d*.38+d*.09+.03,w*.18,.07,.07);
  for(const sx of [-1,1])cylinder(b,'steel',w*.39+sx*w*.075,2.26,d*.44,.14,4.52,.14,10);
  entry(b,-w*.085,d*.39+1.4,w*.26);
  for(const side of [-1,1]){cylinder(b,'steel',side*w*.16,1.05,d*.47,.13,2.1,.13,8);b.box(referenceGlazing,side*w*.12,1.05,d*.47,w*.075,1.35,.04);}
 }else if(id===23){ // Commons: three inhabited wings around a genuine central forum/courtyard.
  wing(b,-w*.34,0,w*.30,d*.93,h,3,{r:1,fins:true});
  wing(b,w*.34,0,w*.30,d*.93,h,3,{r:1,fins:true,planters:false});
  wing(b,0,-d*.33,w*.40,d*.27,h,3,{r:1});
  auditorium(b,0,.35,-d*.10,w*.30,d*.25);
  b.box('stone',0,.17,-d*.02,w*.38,.34,d*.40);
  const kitchen=wing(b,w*.04,d*.33,w*.20,d*.26,h*.33,1,{r:.8});
  planter(b,kitchen.x,kitchen.top+.02,kitchen.z,kitchen.w*.7,2);
  pergola(b,-w*.34,roofTop(0,h)+.02,-d*.12,w*.20,d*.42);solar(b,w*.34,roofTop(0,h)+.35,-d*.13,w*.20,d*.41);
  signPanel(b,root,{x:-w*.34,y:h*.45,z:d*.465+.95,w:w*.14,h:h*.72,depth:.8,text:'EMPLOYEE COMMONS'});
  entry(b,-w*.34+w*.1,d*.465+1.5,w*.06);
  entry(b,-w*.06,d*.3,w*.12);
 }else if(id===24){ // KEOC: rounded silver-banded control pavilion with curved corner sign.
  const baseR=d*.27,cz=-d*.02,er=cornerRadius(w,d*.86,baseR);
  wing(b,0,cz,w,d*.86,h*.67,2,{r:baseR,skin:'steel',trim:'warm',band:1.5,mullion:2.6});
  const upper=wing(b,-w*.08,-d*.08,w*.80,d*.64,h*.33,1,{base:h*.67,r:d*.26,skin:'steel',trim:'warm',band:1.5,mullion:2.6,planters:false});
  terrace(b,w*.36,roofTop(0,h*.67)+.02,d*.24,w*.18,d*.26);
  // Solid brushed-metal cladding wraps the rounded left end of the pavilion.
  sector(b,'steel',-w/2+er,cz,er+.62,er+1.0,Math.PI*.62,Math.PI*1.38,1.2,h*.67-1.6,20);
  for(const y of [h*.335+.55,h*.67-.6])sector(b,'warm',-w/2+er,cz,er+.98,er+1.06,Math.PI*.62,Math.PI*1.38,y,.06,20);
  solar(b,upper.x,upper.top+.35,upper.z,upper.w*.72,upper.d*.6);
  for(let k=0;k<3;k++)screen(b,-w*.1+k*w*.12,h*.49,cz+d*.43-1.3,w*.10,h*.14);
  curvedSign(b,root,{cx:w/2-er,cz:cz+d*.43-er,radius:er+.45,a0:.12,a1:1.02,y:h*.12,h:h*.5,text:'KEOC'});
  // Curved entrance canopy at the front-left arrival.
  sector(b,'dark',-w*.14,cz+d*.43-9,9.4,13.4,Math.PI*.3,Math.PI*.7,4.1,.34,14);
  sector(b,'warm',-w*.14,cz+d*.43-9,11.2,11.4,Math.PI*.32,Math.PI*.68,4.03,.04,14);
  for(const a of [Math.PI*.36,Math.PI*.64])cylinder(b,'steel',-w*.14+Math.cos(a)*12.8,2.05,cz+d*.43-9+Math.sin(a)*12.8,.14,4.1,.14,10);
  entry(b,-w*.14,cz+d*.43+1.3,w*.14);
 }
 // Copy only numeric wing records into the deferred factory. The factory is
 // created outside this scope so it cannot retain the envelope Batch or root.
 const createNearDetail=nearDetailFactory(id,(b.occupiedWings||[]).map(room=>({...room})));
 const envelope=b.finish(`CF-${id}-reference-envelope`);
 envelope.traverse(o=>{if(o.isMesh&&o.material===litInterior)o.onBeforeRender=syncInteriorLight;});
 root.add(envelope);
 if(deferDetails)root.userData.createNearDetail=createNearDetail;
 else root.add(createNearDetail());
 root.userData.referenceFacility=id;
 return root;
}

// Approach-distance reference details for CF-13..24, placed on the same
// roofs and forecourts as the envelopes above (called by reference-fidelity.js).
function plantUnit(b,x,y,z,w=2.6,d=1.8){
 b.box('steel',x,y+.8,z,w,1.5,d);b.box('dark',x,y+.05,z,w+.2,.1,d+.2);
 cylinder(b,'dark',x,y+1.58,z,Math.min(w,d)*.36,.16,Math.min(w,d)*.36,20);ring(b,'steel',x,y+1.68,z,Math.min(w,d)*.3,.04);
 for(let i=-2;i<=2;i++)b.box('dark',x+i*w*.18,y+.75,z+d/2+.03,.05,1.2,.05);
}
function bollards(b,x,z,span,n=5){for(let i=0;i<n;i++){const xx=x-span/2+i*span/(n-1);cylinder(b,'dark',xx,.5,z,.13,1,.13,10);b.box('warm',xx,.86,z,.2,.05,.2);}}
function bench(b,x,z,len=3){b.box('stone',x,.46,z,len,.08,.5);for(const s of [-1,1])b.box('dark',x+s*len*.4,.23,z,.1,.46,.45);}
export function referenceDetail13to24(b,f,tags){
 const {id,w,d,h}=f,M=massing(f);
 switch(id){
  case 13:{
   const deck=h*.56,top=roofTop(deck,h-deck);
   for(const x of [-w*.36,-w*.30])plantUnit(b,x,top,-d*.28);
   bollards(b,w*.18,d*.40+3.2,w*.17);bench(b,-w*.06,d*.47);bench(b,w*.04,d*.47);
   tags.push('pavilion roof plant','lobby forecourt bollards','waterfall basin seating');break;}
  case 14:{
   const top=roofTop(M.lowH,h-M.lowH);
   plantUnit(b,w*.14,top,-d*.10);plantUnit(b,w*.2,top,-d*.10,2.2,1.6);
   bollards(b,-w*.12,d*.43+4,w*.2,6);bench(b,w*.1,d*.47,4);
   tags.push('research roof plant','capsule forecourt','curved corner identity');break;}
  case 15:{
   const top=roofTop(M.podiumH,M.upperH);
   for(let i=0;i<4;i++)plantUnit(b,-w*.36+i*w*.1,top,-d*.37,3,2.2);
   bollards(b,w*.05,d*.48+4.2,w*.2,7);
   tags.push('sprint court rim plant','angled identity cheeks','recovery gym frontage');break;}
  case 16:{
   const top=roofTop(0,M.mainH);
   plantUnit(b,-w*.36,top,-d*.30);plantUnit(b,w*.36,top,-d*.30);
   for(let i=0;i<4;i++)bench(b,w*.08+i*w*.1,d*.47,3.2);
   tags.push('sweeping canopy plaza seating','civic roof plant','bronze lobby frontage');break;}
  case 17:{
   const top=roofTop(0,M.researchH);
   plantUnit(b,w*.05,top,-d*.36,3,2);plantUnit(b,w*.1,top,-d*.36,3,2);
   for(let i=0;i<5;i++)bench(b,-w*.44+i*w*.105,d*.47,2.4);
   tags.push('prototype village porches','inspection pad lighting','solar yard canopy');break;}
  case 18:{
   const top=roofTop(0,h);
   for(let i=0;i<3;i++)plantUnit(b,-w*.1+i*w*.07,top,-d*.40);
   bollards(b,w*.12,-d*.16+d*.31+7,w*.26,8);
   tags.push('deployment roof plant','sign volume arrival','field kit bay frontage');break;}
  case 19:{
   const top=roofTop(h*.87,h*.13);
   plantUnit(b,-w*.30,top,-d*.26,2.2,1.6);
   bollards(b,w*.12,d*.40+4,w*.3,6);bench(b,-w*.2,d*.48,3);
   tags.push('regulatory spine forecourt','crown roof plant','secure bollard line');break;}
  case 20:{
   for(let i=0;i<3;i++)plantUnit(b,-w*.34+i*w*.12,roofTop(0,M.podH),d*.32,2.4,1.8);
   bollards(b,w*.1,d*.46+4,w*.26,6);
   tags.push('podium roof plant','spire arrival bollards','antenna crown hardware');break;}
  case 21:{
   for(let i=0;i<3;i++)plantUnit(b,w*.2+i*w*.08,roofTop(0,h*.36),d*.38,2.4,1.6);
   bollards(b,w*.3,d*.44+4,w*.2,5);
   tags.push('command room roof plant','process yard bollards','battery deck services');break;}
  case 22:{
   const top=roofTop(M.mainH,h-M.mainH-1.2);
   plantUnit(b,w*.14,top,-d*.34);plantUnit(b,w*.3,top,-d*.34);
   bollards(b,-w*.06,d*.39+4.4,w*.3,8);
   tags.push('theatre roof plant','screened arrival bollards','drop-off canopy');break;}
  case 23:{
   const top=roofTop(0,h);
   plantUnit(b,0,top,-d*.36,3.2,2.2);plantUnit(b,w*.1,top,-d*.36,3.2,2.2);
   for(let i=0;i<3;i++)bench(b,-w*.1+i*w*.08,d*.08,2.6);
   tags.push('forum courtyard benches','wing roof plant','commons identity pier');break;}
  case 24:{
   const top=roofTop(h*.67,h*.33);
   plantUnit(b,-w*.36,top,-d*.30,2.4,1.8);plantUnit(b,-w*.3,top,-d*.30,2.4,1.8);
   bollards(b,-w*.14,d*.41+4.2,w*.2,6);
   tags.push('control pavilion roof plant','curved canopy arrival','silver floor bands');break;}
  default:throw new Error('referenceDetail13to24 only handles CF-13..24');
 }
}
