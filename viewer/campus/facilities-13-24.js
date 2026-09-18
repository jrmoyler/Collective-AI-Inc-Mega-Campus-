import * as T from 'three';
import {Batch,cylinder,ring,line,materials} from './geometry.js';

import {facadeEdge,roofCoping,roofTree,occupiedBays} from './facade-craft.js';

// Neutral low-opacity architectural glass keeps occupied slabs and furnishings
// legible in both Three.js and glTF/Blender instead of stacking dark tinted walls.
const referenceGlazing=materials.glazing.clone();
referenceGlazing.name='reference-clear-architectural-glazing';
referenceGlazing.color.set(0xc9d8dc);referenceGlazing.opacity=.20;
referenceGlazing.metalness=.03;referenceGlazing.roughness=.10;referenceGlazing.envMapIntensity=.8;

// Individual CF infographics govern these twelve different compositions. The
// illustrated cutaways reveal room uses, not a instruction to omit real roofs.
function outline(w,d,r){
 const pts=[];r=Math.min(r,w*.4,d*.4);
 for(const [x,z,a] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])
  for(let i=0;i<=6;i++)pts.push([x+Math.cos(a+i*Math.PI/12)*r,z+Math.sin(a+i*Math.PI/12)*r]);
 return pts;
}
function slab(b,mat,x,y,z,w,d,depth=.35,r=2){
 const pts=outline(w,d,r),shape=new T.Shape();pts.forEach(([px,pz],i)=>i?shape.lineTo(px,pz):shape.moveTo(px,pz));shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);b.add(g,mat,x,y,z);g.dispose();
}
function wing(b,x,z,w,d,h,levels=2,{base=0,r=2,skin='dark',roof=true,fins=false}={}){
 const p=outline(w,d,r),fh=h/levels;
 (b.occupiedWings ||= []).push({x,z,w,d,h,levels,base,r});
 // Occupied central support core and floorplates behind transparent facades.
 b.box(skin,x,base+h*.5,z-d*.16,w*.18,h,d*.35);
 for(let floor=0;floor<levels;floor++){
  const y=base+floor*fh;slab(b,'stone',x,y,z,w,d,.3,r);
  for(let j=0;j<p.length;j++){
   const a=p[j],c=p[(j+1)%p.length],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),rot=-Math.atan2(dz,dx),n=Math.max(1,Math.ceil(len/3));
   b.pane(referenceGlazing,x+(a[0]+c[0])*.5,y+fh*.5,z+(a[1]+c[1])*.5,len,fh-.42,rot);
   facadeEdge(b,[x+a[0],z+a[1]],[x+c[0],z+c[1]],y,fh,{center:[x,z],skin});
   b.box(skin,x+(a[0]+c[0])*.5,y+fh-.25,z+(a[1]+c[1])*.5,len,.5,.24,rot);
   // Recessed bronze sill and head reveal articulate every occupied storey.
   b.box('copper',x+(a[0]+c[0])*.5,y+.40,z+(a[1]+c[1])*.5,len,.08,.28,rot);
   b.box('steel',x+(a[0]+c[0])*.5,y+fh-.54,z+(a[1]+c[1])*.5,len,.08,.18,rot);
   for(let k=0;k<n;k++)b.box(fins?'copper':'steel',x+a[0]+dx*k/n,y+fh*.5,z+a[1]+dz*k/n,.12,fh,fins?.55:.14,rot);
  }
  for(const side of [-1,1]){
   b.box('warm',x,y+fh-.68,z+side*(d*.5-1.1),w*.8,.035,.08);

  }
 }
 if(roof){
  slab(b,skin,x,base+h,z,w+.25,d+.25,.36,r);
  slab(b,'stone',x,base+h+.37,z,w-1,d-1,.08,Math.max(.2,r-.5));
  roofCoping(b,p.map(([px,pz])=>[x+px,z+pz]),base+h+.45,{center:[x,z],skin});
  // Occupied roof terraces are stone with narrow planted edges, never a green slab.
  for(const side of [-1,1]){
   b.box('dark',x,base+h+.63,z+side*(d*.5-.28),w-r*2,.52,.22);
   if(w>14&&d>12)planter(b,x+side*w*.24,base+h+.46,z-d*.32,w*.20,1.25);
  }
 }
 return {x,z,w,d,h,base};
}

// Swept rectangular metal fascia with finite vertical construction depth.
function ribbonFascia(b,points,height,depth){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
 const p=[],idx=[],steps=40;
 for(let i=0;i<=steps;i++){
  const c=curve.getPoint(i/steps),t=curve.getTangent(i/steps),n=new T.Vector3(-t.z,0,t.x).normalize();
  for(const [vertical,lateral] of [[-1,-1],[-1,1],[1,1],[1,-1]])p.push(c.x+n.x*lateral*depth/2,c.y+vertical*height/2,c.z+n.z*lateral*depth/2);
  if(i<steps)for(let face=0;face<4;face++){const a=i*4+face,d=i*4+(face+1)%4;idx.push(a,d,a+4,d,d+4,a+4);}
 }
 idx.push(0,2,1,0,3,2);const end=steps*4;idx.push(end,end+1,end+2,end,end+2,end+3);
 for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();b.add(g,'steel');g.dispose();
}

function entry(b,x,z,w=7){
 slab(b,'stone',x,.03,z,w+2,3,.18,.7);b.box('steel',x,3.35,z-.1,w,.15,2.7);
 for(const side of [-1,1]){b.box(referenceGlazing,x+side*w*.23,1.6,z-1.2,w*.44,3.1,.04);b.box('steel',x+side*w*.46,1.6,z-1.2,.1,3.2,.16);b.box('steel',x+side*.13,1.35,z-1.1,.04,.7,.05);}
 b.box('warm',x,3.25,z-.1,w*.84,.04,.15);
}
function solar(b,x,y,z,w,d){
 for(let a=-w*.5;a<w*.5;a+=3.2)for(let c=-d*.5;c<d*.5;c+=2.2){b.box('solar',x+a+1.45,y,z+c+.95,2.9,.13,1.9);b.box('steel',x+a+1.45,y+.075,z+c+.95,.035,.02,1.9);}
}
function pergola(b,x,y,z,w,d){
 for(const side of [-1,1])for(const end of [-1,1])cylinder(b,'steel',x+side*w*.45,y+1.5,z+end*d*.45,.1,3,.1,8);
 for(let q=-w*.5;q<=w*.5;q+=.9)b.box('copper',x+q,y+3,z,.13,.22,d);
}
function planter(b,x,y,z,w,d){slab(b,'stone',x,y,z,w,d,.65,.6);slab(b,'leaf',x,y+.66,z,w-.3,d-.3,.2,.4);for(let xx=-w*.3;xx<=w*.3;xx+=2.4)roofTree(b,x+xx,y+.86,z,Math.min(.85,d*.5));}
function screen(b,x,y,z,w,h){b.box('dark',x,y,z,w,h,.2);b.box('blueGlass',x,y,z+.115,w-.2,h-.2,.025);for(let q=-w*.4;q<w*.4;q+=w*.12)b.box('cyan',x+q,y-h*.1,z+.135,.07,h*.45,.01);}
function auditorium(b,x,y,z,w,d){
 for(let row=0;row<6;row++)for(let seat=0;seat<9;seat++){
  const px=x+(seat-4)*w/10,pz=z+row*d/7;
  b.box('dark',px,y+row*.35+.48,pz,w/12,.18,.7);b.box('copper',px,y+row*.35+.92,pz+.36,w/12,.86,.10);
 }
 screen(b,x,y+3,z-1,w*.8,4);
}
function verticalFins(b,x,z,w,h,depth=.7){for(let q=-w*.5;q<=w*.5;q+=1.1)b.box('copper',x+q,h*.5,z,.12,h,depth);}
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
 const {x,z,w,d,base,h,levels}=wing,y=base+floor*h/levels+.32;
 occupiedBays(b,outline(w,d,wing.r).map(([px,pz])=>[x+px,z+pz]),y,h/levels-.32);
 // Small rooftop booths deliberately receive one compact work setting only.
 if(w<8||d<10){if(w>3.5&&d>3.5){const zz=z+d*.26;desk(b,x,y,zz,.95);monitor(b,x,y+.8,zz-.2,.50);}return;}
 if(id===13&&w>20&&d>18){
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
   screen(b,px,y+1.4,pz-1.53,1.0,.6);
  }else if(id===15){
   if(mode===1)clinicalBed(b,px,y,pz);
   else {b.box('dark',px,y+.24,pz,1.05,.20,2.0);for(const dx of [-.45,.45])line(b,'steel',[[px+dx,y+.3,pz-.7],[px+dx,y+1.25,pz-.7],[px+dx,y+1.15,pz+.15]],.04);screen(b,px,y+1.25,pz-.67,.68,.4);}
   cabinet(b,px+1.45,y,pz-.65,.8,1.3);
  }else if(id===16||id===17){
   desk(b,px,y,pz,2.6);
   b.box('dark',px-.65,y+1.13,pz,.8,.66,.65);b.box(referenceGlazing,px-.65,y+1.14,pz+.335,.65,.50,.035);
   b.box('steel',px-.65,y+1.43,pz,.62,.07,.52);cylinder(b,'copper',px-.65,y+1.12,pz,.13,.25,.13,10);
   monitor(b,px+.66,y+.8,pz-.2);cabinet(b,px+1.85,y,pz,1,1.1);
   if(id===17)for(let i=0;i<3;i++)b.box(i%2?'copper':'stone',px+.35+i*.23,y+.86,pz+.25,.18,.09,.20);
  }else if(id===18){
   desk(b,px,y,pz,2.2);monitor(b,px,y+.8,pz-.2);
   for(let row=0;row<2;row++)for(let col=0;col<2;col++){const xx=px+1.45+col*.65,yy=y+.26+row*.53;b.box('dark',xx,yy,pz,.60,.49,.74);b.box('steel',xx,yy,pz+.38,.23,.04,.025);for(const dx of [-.25,.25])b.box('steel',xx+dx,yy,pz+.38,.04,.42,.035);}
  }else if(id===19){
   desk(b,px,y,pz,2.4);monitor(b,px-.55,y+.8,pz-.2);cabinet(b,px+1.8,y,pz,1.1,2.1);
   for(let i=0;i<5;i++)b.box(i%2?'copper':'dark',px+.12+i*.15,y+.99,pz-.15,.11,.40,.27);
   b.box('stone',px+.55,y+.87,pz+.25,.57,.025,.38);
  }else if(id===20||id===24){
   desk(b,px,y,pz,2.65);for(const dx of [-.8,0,.8])monitor(b,px+dx,y+.8,pz-.2,.68);
   cabinet(b,px+1.9,y,pz-1,.72,2.0);for(let j=0;j<5;j++)b.box('cyan',px+1.9,y+.35+j*.31,pz-.675,.04,.04,.01);
  }else if(id===21){
   cabinet(b,px,y,pz,1.1,2.0);screen(b,px,y+1.45,pz+.35,.72,.5);
   for(let i=0;i<3;i++)cylinder(b,'steel',px+1.2+i*.42,y+.65,pz,.13,1.3,.13,12);
   line(b,'copper',[[px+1.2,y+1.3,pz],[px+1.2,y+1.7,pz],[px+2.05,y+1.7,pz],[px+2.05,y+1.3,pz]],.065);
   ring(b,'gold',px+1.65,y+1.72,pz,.16,.025,0);
  }else if(id===22){
   desk(b,px,y,pz,2.6);monitor(b,px-.6,y+.8,pz-.2);monitor(b,px+.3,y+.8,pz-.2);
   b.box('dark',px+1,y+.94,pz,.18,.22,.20);b.box('white',px+.65,y+.84,pz+.25,.28,.025,.42);
   taskChair(b,px,y,pz-1.3);
  }else if(id===23){
   if(mode===0){slab(b,'copper',px,y+.73,pz,2.1,1.1,.08,.22);for(const dx of [-.65,.65])for(const dz of [-.85,.85])taskChair(b,px+dx,y,pz+dz);}
   else {slab(b,'civic',px,y+.38,pz,2.0,.90,.24,.20);b.box('civic',px,y+.79,pz-.4,2, .75,.20);for(const dx of [-1,1])b.box('civic',px+dx,y+.62,pz,.17,.49,.90);slab(b,'copper',px,y+.45,pz+1.3,1.2,.7,.09,.20);}
  }
  // Suspended task lighting is connected to the ceiling by two real stems.
  const cy=base+(floor+1)*h/levels-.78;
  b.box('warm',px,cy,pz,2.2,.04,.14);
  for(const dx of [-.8,.8])cylinder(b,'steel',px+dx,cy+.39,pz,.012,.78,.012,6);
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

export function createFacility13to24(f,{deferDetails=false}={}){
 if(f.id<13||f.id>24)return null;
 const {w,d,h,id}=f,b=new Batch(),root=new T.Group();root.name=`CF-${id}-individual-reference-architecture`;
 if(id===13){ // Eon: connected perimeter sections, not independent roof ribbons.
  const deck=h*.56,low=h*.32;
  // The front garden shoulder drops at the right; the occupied upper pavilion
  // sits behind it. Closed soffit/roof strips share the facade's exact section.
  const p=outline(w*.97,d*.78,d*.12).map(([x,z])=>[x,z-d*.015]);
  const shoulder=x=>deck-(deck-low)*T.MathUtils.smoothstep(x,-w*.02,w*.32);
  const top=(x,z)=>T.MathUtils.lerp(shoulder(x),deck,T.MathUtils.smoothstep(-z,-d*.04,d*.24));
  slab(b,'stone',0,0,-d*.015,w*.97,d*.78,.32,d*.12);
  // A continuous weather roof and glass envelope with a real changing section.
  // Each strip is attached to its perimeter, never lofted across occupied rooms.
  for(let j=0;j<p.length;j++){
   const a=p[j],c=p[(j+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.max(1,Math.ceil(len/1.9));
   for(let q=0;q<n;q++){
    const ax=T.MathUtils.lerp(a[0],c[0],q/n),az=T.MathUtils.lerp(a[1],c[1],q/n),cx=T.MathUtils.lerp(a[0],c[0],(q+1)/n),cz=T.MathUtils.lerp(a[1],c[1],(q+1)/n);
    const ay=top(ax,az),cy=top(cx,cz),dx=cx-ax,dz=cz-az,L=Math.hypot(dx,dz),nx=-dz/L,nz=dx/L;
    const vertices=[ax,.32,az,cx,.32,cz,cx,cy-.35,cz,ax,ay-.35,az];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();b.add(g,referenceGlazing);g.dispose();
    line(b,'copper',[[ax,.32,az],[ax,ay-.3,az]],.065);
    // Closed quadrilateral annulus section: exterior fascia, soffit and coping.
    const strip=new T.BufferGeometry(),v=[];
    for(const [x,y,z] of [[ax,ay-.55,az],[cx,cy-.55,cz],[cx+nx*1.15,cy-.55,cz+nz*1.15],[ax+nx*1.15,ay-.55,az+nz*1.15],[ax,ay+.55,az],[cx,cy+.55,cz],[cx+nx*1.15,cy+.55,cz+nz*1.15],[ax+nx*1.15,ay+.55,az+nz*1.15]])v.push(x,y,z);
    strip.setAttribute('position',new T.Float32BufferAttribute(v,3));strip.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);const flat=strip.toNonIndexed();flat.computeVertexNormals();b.add(flat,'steel');flat.dispose();strip.dispose();
    line(b,'dark',[[ax,ay-.6,az],[cx,cy-.6,cz]],.075);
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
  wing(b,-w*.15,-d*.14,w*.63,d*.45,h-deck,1,{base:deck,r:d*.04,skin:'dark',fins:false});
  wing(b,w*.315,-d*.12,w*.28,d*.42,deck-low,1,{base:low,r:d*.025,skin:'dark'});
  wing(b,-w*.17,-d*.135,w*.57,d*.43,deck,2,{r:1,roof:false});
  // Two usable front laboratory terraces; their horizontal slabs terminate
  // before the sloping shoulder and never slice through the perimeter fascia.
  terrace(b,-w*.19,deck,d*.16,w*.47,d*.12);
  terrace(b,w*.315,low,d*.16,w*.27,d*.12);
  solar(b,-w*.15,h+.53,-d*.16,w*.48,d*.30);
  for(const [gx,gz,gw,gd,gy] of [[-w*.15,-d*.34,w*.48,2.3,h+.46],[-w*.18,d*.205,w*.45,2.0,deck+.33],[w*.32,d*.205,w*.23,2.0,low+.33]]){
   planter(b,gx,gy,gz,gw,gd);for(let tx=-gw*.4;tx<=gw*.4;tx+=3.4)roofTree(b,gx+tx,gy+.86,gz,1.45);
  }
  // Front-left graphite sign pier and dense bronze louvres are source identity.
  b.box('dark',-w*.27,deck*.48,d*.379,w*.18,deck*.96,.65);
  for(const edge of [-1,1])b.box('steel',-w*.27+edge*w*.09,deck*.48,d*.385,.12,deck*.96,.72);
  ring(b,'gold',-w*.27,deck*.72,d*.392,1.3,.14,0);
  root.userData.signAnchor={text:'EON CORE',width:w*.155,height:1.5,position:[-w*.27,deck*.43,d*.379+.335]};
  for(let x=-w*.15;x<w*.08;x+=.72){const y=shoulder(x);b.box('copper',x,y*.55,d*.377,.12,y*.76,.55);}
  // Water flows along the right elevation into a contained reflecting basin.
  const wx=w*.486,wz=-d*.055,waterLength=d*.53;
  b.box('dark',wx,low*.48,wz,.75,low*.96,waterLength);
  b.box('water',wx+.42,low*.46,wz,.05,low*.84,waterLength-.8);
  for(let z=wz-waterLength*.47;z<wz+waterLength*.48;z+=.28)line(b,'blueGlass',[[wx+.47,low*.89,z],[wx+.62,.64,z]],.028);
  b.box('stone',wx+1.45,.15,wz,2.8,.30,waterLength+1.4);
  b.box('water',wx+1.45,.32,wz,2.2,.055,waterLength+.6);
  for(const z of [wz-waterLength/2-.5,wz+waterLength/2+.5])b.box('stone',wx+1.45,.44,z,2.8,.6,.35);
  b.box('stone',wx+2.68,.44,wz,.35,.6,waterLength+1.4);
  entry(b,w*.18,d*.38,w*.17); }else if(id===14){ // Cognara: asymmetric rounded interview wing and research-booth roof court.
  wing(b,0,0,w,d*.89,h*.34,1,{r:d*.28,fins:true});
  wing(b,w*.23,d*.065,w*.52,d*.75,h*.33,1,{base:h*.34,r:d*.20,fins:true});
  wing(b,-w*.26,-d*.20,w*.47,d*.40,h*.66,2,{base:h*.34,r:1.4});
  wing(b,w*.14,-d*.26,w*.40,d*.27,h*.33,1,{base:h*.67,r:d*.10});
  terrace(b,-w*.24,h*.34,d*.17,w*.46,d*.32);
  terrace(b,w*.22,h*.67,d*.07,w*.50,d*.49);
  for(let k=0;k<4;k++)wing(b,-w*.42+k*w*.105,-d*.20,w*.09,d*.19,2.5,1,{base:h,r:.35});
  solar(b,w*.12,h+.55,-d*.26,w*.26,d*.16);entry(b,-w*.1,d*.46,w*.18);
 }else if(id===15){ // Kinetic Edge: multi-storey sports science building, not a stadium slab.
  // The old stadium placeholder height (14m) contradicts the source's three
  // occupied levels plus tall motion-capture pavilion. Retain the footprint,
  // explicitly recover the visible envelope rather than compressing floors.
  const podiumH=Math.max(25.5,h*1.8),captureH=8.5;
  root.userData.envelopeHeight=podiumH+captureH;
  wing(b,0,-d*.035,w,d*.93,podiumH,3,{r:d*.12,fins:true});
  const y=podiumH+.6,rx=w*.36,rz=d*.30,trackZ=-d*.055;
  slab(b,'track',-w*.045,y,trackZ,rx*2,rz*2,.10,rz);
  slab(b,'leaf',-w*.045,y+.12,trackZ,rx*1.42,rz*1.12,.04,rz*.45);
  for(let lane=0;lane<4;lane++){const pts=outline(rx*2-lane*1.25,rz*2-lane*1.25,rz-lane*.65).map(([x,z])=>[x-w*.045,y+.17,z+trackZ]);pts.push(pts[0]);line(b,'white',pts,.04);}
  for(const side of [-1,1])b.box('white',side*rx*.63-w*.045,y+.18,trackZ,.09,.035,rz*.94);
  // Tall glazed motion cage and lower projecting recovery suite articulate
  // the prominent front-right corner shown in the infographic.
  wing(b,w*.30,d*.14,w*.31,d*.36,captureH,1,{base:podiumH,r:1,roof:true});
  wing(b,w*.32,d*.335,w*.31,d*.28,podiumH*.33,1,{base:podiumH*.33,r:1});
  terrace(b,w*.32,podiumH*.67,d*.35,w*.31,d*.26);
  for(const side of [-1,1])for(let z=-d*.33;z<d*.26;z+=4)b.box('steel',side*w*.47,y+2,z,.08,4,.08);
  // Diagonal architectural cheeks mark the training hall's long elevations.
  for(const side of [-1,1])line(b,'civic',[[side*w*.48,1,-d*.35],[side*w*.49,podiumH*.42,-d*.15],[side*w*.48,podiumH+.6,d*.20]],.55);
  // Actual treadmills in the glazed recovery gym, visible from the approach.
  for(let i=0;i<6;i++){
   const x=-w*.31+i*w*.09,z=d*.385;
   b.box('dark',x,1,z,1.35,.22,2.4);b.box('steel',x,.55,z,.18,.9,1.8);
   for(const side of [-1,1])line(b,'steel',[[x+side*.55,1.1,z-.8],[x+side*.55,2,z-.85],[x+side*.55,2,z+.3]],.055);
   screen(b,x,2.05,z-.9,1,.62);
  }
  entry(b,-w*.06,d*.47,w*.20);
 }else if(id===16){ // Civic: public auditorium flanked by labs, sweeping solar-glass plaza canopy.
  wing(b,0,-d*.14,w*.92,d*.65,h*.70,2,{r:2,fins:true});
  auditorium(b,0,h*.36,-d*.10,w*.31,d*.25);
  wing(b,-w*.32,-d*.08,w*.25,d*.5,h*.30,1,{base:h*.70,r:1});
  wing(b,w*.31,-d*.08,w*.26,d*.5,h*.30,1,{base:h*.70,r:1});
  const pts=[];for(let i=0;i<=18;i++){const x=-w*.49+i*w*.98/18;pts.push([x,5.6+Math.sin(i/18*Math.PI)*2,d*.35]);}
  for(const side of [-1,1])line(b,'steel',pts.map(([x,y,z])=>[x,y,z+side*d*.10]),.15);
  for(let i=0;i<18;i++){const [x,y,z]=pts[i],nx=pts[i+1][0],ny=pts[i+1][1];b.box('blueGlass',(x+nx)/2,(y+ny)/2,z,nx-x+.05,.12,d*.21);line(b,'steel',[[x,y,z-d*.1],[x,y,z+d*.1]],.07);}
  for(const x of [-w*.42,0,w*.42])cylinder(b,'steel',x,3.3,d*.35,.16,6.6,.16,10);
  entry(b,0,d*.21,w*.23);
 }else if(id===17){ // Terra Axis: tall stepped testing block, inspection roof and prototype court.
  const researchH=Math.max(h,26);root.userData.envelopeHeight=researchH+3.6;
  wing(b,-w*.10,-d*.13,w*.60,d*.67,researchH,3,{r:1,fins:true});
  wing(b,w*.28,-d*.18,w*.28,d*.51,researchH*.66,2,{r:1});
  wing(b,-w*.32,d*.10,w*.23,d*.28,researchH*.66,2,{r:1});
  pergola(b,-w*.12,researchH+.5,-d*.16,w*.35,d*.38);solar(b,-w*.12,researchH+3.6,-d*.16,w*.36,d*.39);
  cylinder(b,'concrete',w*.28,researchH*.66+.65,-d*.18,d*.17,.18,d*.17,48);ring(b,'white',w*.28,researchH*.66+.77,-d*.18,d*.13,.10);
  b.box('white',w*.28,researchH*.66+.78,-d*.18,d*.11,.03,.16);for(const a of [-1,1])b.box('white',w*.28+a*d*.052,researchH*.66+.78,-d*.18,.16,.03,d*.1);
  for(let i=0;i<3;i++){const x=-w*.31+i*w*.20;wing(b,x,d*.36,w*.14,d*.20,4.2,1,{r:.6});solar(b,x,4.8,d*.36,w*.12,d*.16);}
  terrace(b,-w*.32,researchH*.66,d*.10,w*.23,d*.28);
  for(let i=0;i<5;i++){const x=-w*.34+i*w*.15;b.box('gold',x,.12,d*.22,w*.11,.03,.12);b.box('gold',x+w*.055,.12,d*.26,.1,.03,d*.08);}
  entry(b,w*.10,d*.22,w*.10);
 }else if(id===18){ // Nomad Nexus: two-storey deployment courtyard and prominent map room.
  wing(b,-w*.30,0,w*.32,d*.88,h,2,{r:1,fins:true});
  wing(b,w*.27,0,w*.42,d*.88,h,2,{r:1,fins:true});
  wing(b,0,-d*.31,w*.29,d*.26,h,2,{r:1});
  terrace(b,0,.12,d*.1,w*.29,d*.58);screen(b,-w*.28,h*.7,d*.10,w*.24,h*.22);
  for(let j=0;j<4;j++)for(let i=0;i<3;i++){b.box('dark',-w*.37+i*2.2,1.0+j*1.15,d*.28,1.9,.95,1.3);b.box('steel',-w*.37+i*2.2,1+j*1.15,d*.28+.67,1.4,.05,.06);}
  solar(b,w*.25,h+.55,-d*.17,w*.23,d*.26);entry(b,0,d*.42,w*.19);
 }else if(id===19){ // Juris Guard: four stepped regulatory levels, solid judicial spine and policy gallery.
  for(let i=0;i<3;i++)wing(b,-w*.04+i*w*.015,-d*.04-i*d*.035,w*(.98-i*.16),d*(.89-i*.14),h*.29,1,{base:i*h*.29,r:1,fins:true});
  wing(b,-w*.18,-d*.15,w*.50,d*.38,h*.13,1,{base:h*.87,r:.5});
  b.box('dark',-w*.42,h*.47,d*.10,w*.14,h*.94,d*.43);
  // Architectural scales: balanced pans and an actual central column.
  cylinder(b,'gold',-w*.423,h*.61,d*.321,.10,h*.20,.10,10);b.box('gold',-w*.423,h*.69,d*.322,w*.11,.09,.09);
  for(const side of [-1,1]){line(b,'gold',[[-w*.423+side*w*.045,h*.69,d*.325],[-w*.423+side*w*.045,h*.61,d*.325]],.04);ring(b,'gold',-w*.423+side*w*.045,h*.61,d*.33,w*.018,.035,0);}
  screen(b,w*.23,h*.43,d*.405,w*.29,h*.22);entry(b,w*.12,d*.43,w*.18);
 }else if(id===20){ // Aether Link: asymmetric glazed communications spire, open antenna crown.
  wing(b,0,0,w*.96,d*.91,h*.21,2,{r:2});
  for(let level=0;level<3;level++)wing(b,w*.05,-d*.03,w*(.69-level*.12),d*(.65-level*.1),h*.17,1,{base:h*(.21+level*.17),r:2});
  b.box('dark',-w*.25,h*.40,-d*.10,w*.22,h*.79,d*.37);
  for(const side of [-1,1])line(b,'steel',[[side*w*.44,0,-d*.27],[side*w*.30,h*.52,-d*.18],[side*w*.17,h*.79,-d*.12]],.55);
  const radius=Math.min(w,d)*.32;cylinder(b,'steel',0,h*.75,0,radius,.7,radius,48);ring(b,'cyan',0,h*.765,0,radius,.13);
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){const x=Math.cos(a)*radius*.80,z=Math.sin(a)*radius*.80;cylinder(b,'steel',x,h*.82,z,.15,h*.13,.1,10);b.box('white',x,h*.84,z,1.3,h*.07,.5);}
  cylinder(b,'steel',0,h*.87,0,.3,h*.25,.10,12);entry(b,0,d*.46,w*.23);
 }else if(id===21){ // Central utility: separately legible battery, turbine, cooling and water districts.
  wing(b,-w*.24,-d*.16,w*.45,d*.52,h*.55,1,{r:.7});
  wing(b,w*.30,d*.24,w*.35,d*.39,h*.40,1,{r:.7});
  wing(b,-w*.17,d*.31,w*.56,d*.27,h*.38,1,{r:.7,roof:false});
  for(let row=0;row<4;row++)for(let j=0;j<6;j++){const x=-w*.42+j*w*.065,z=-d*.34+row*d*.10;b.box('white',x,h*.55+2,z,2,3.4,2);b.box('dark',x,h*.55+2,z+1.02,1.45,2.7,.035);}
  for(let k=0;k<3;k++){const x=w*.05+k*w*.135;const g=new T.CylinderGeometry(2.1,2.1,d*.38,24);g.rotateX(Math.PI/2);b.add(g,'steel',x,3.1,-d*.18);g.dispose();for(let j=0;j<4;j++)ring(b,'dark',x,3.1,-d*.34+j*d*.09,2.17,.12,0);}
  for(let i=0;i<2;i++)cylinder(b,'steel',w*.39+i*w*.07,h*.49,-d*.38,1,h*.98,.65,16);
  for(let j=0;j<5;j++)cylinder(b,'steel',-w*.38+j*w*.10,2.1,d*.31,1.5,4.2,1.5,20);
  for(let j=0;j<3;j++){cylinder(b,'dark',w*.23+j*w*.095,h*.40+.55,d*.24,2,.45,2,24);ring(b,'steel',w*.23+j*w*.095,h*.40+.8,d*.24,1.9,.12);}
  screen(b,w*.3,h*.22,d*.439,w*.25,h*.19);entry(b,w*.3,d*.43,w*.17);
 }else if(id===22){ // Visitor center: bent glazed arrival frontage and upper command/theatre suites.
  wing(b,0,-d*.10,w*.97,d*.77,h*.60,2,{r:d*.11,fins:true});
  wing(b,-w*.29,-d*.14,w*.32,d*.55,h*.40,1,{base:h*.60,r:1});
  wing(b,w*.29,-d*.14,w*.32,d*.55,h*.40,1,{base:h*.60,r:1});
  auditorium(b,w*.26,h*.60,-d*.18,w*.23,d*.28);screen(b,-w*.27,h*.80,d*.10,w*.26,h*.16);
  terrace(b,0,h*.60,d*.1,w*.27,d*.36);entry(b,0,d*.30,w*.32);
  for(const side of [-1,1]){cylinder(b,'steel',side*w*.16,1.05,d*.42,.13,2.1,.13,8);b.box(referenceGlazing,side*w*.12,1.05,d*.42,w*.075,1.35,.04);}
  solar(b,-w*.28,h+.54,-d*.17,w*.21,d*.35);
 }else if(id===23){ // Commons: three inhabited wings around a genuine central forum/courtyard.
  wing(b,-w*.34,0,w*.30,d*.93,h,3,{r:1,fins:true});
  wing(b,w*.34,0,w*.30,d*.93,h,3,{r:1,fins:true});
  wing(b,0,-d*.33,w*.42,d*.27,h,3,{r:1});
  auditorium(b,0,.35,-d*.06,w*.30,d*.25);
  wing(b,w*.16,d*.29,w*.23,d*.34,h*.33,1,{r:.8});
  pergola(b,-w*.31,h+.5,-d*.12,w*.20,d*.42);solar(b,w*.33,h+.6,-d*.13,w*.20,d*.41);
  for(let i=0;i<4;i++){const x=-w*.14+i*w*.09;cylinder(b,'stone',x,.72,d*.29,.65,.12,.65,12);cylinder(b,'steel',x,.36,d*.29,.07,.7,.07,8);}
  entry(b,-w*.07,d*.4,w*.17);
 }else if(id===24){ // KEOC: continuous bronze curving control facade, crescent entry recess.
  wing(b,0,-d*.02,w,d*.86,h*.67,2,{r:d*.27,skin:'copper',fins:false});
  wing(b,-w*.16,-d*.17,w*.67,d*.46,h*.33,1,{base:h*.67,r:d*.20,skin:'copper'});
  terrace(b,w*.24,h*.67,d*.07,w*.46,d*.46);
  // Front operations bays sit behind projecting rounded bronze floor ribbons.
  for(const y of [h*.34,h*.67]){
   const pts=outline(w*.99,d*.86,d*.27).filter(([x,z])=>z>0).map(([x,z])=>[x,y,z-d*.02]);
   line(b,'copper',pts,.22);
  }
  solar(b,-w*.15,h+.55,-d*.17,w*.43,d*.26);
  for(let k=0;k<3;k++)screen(b,w*.02+k*w*.12,h*.49,d*.414,w*.10,h*.14);
  pergola(b,w*.27,h*.67+.5,d*.03,w*.25,d*.22);
  entry(b,-w*.14,d*.43,w*.22);

 }
 // Copy only numeric wing records into the deferred factory. The factory is
 // created outside this scope so it cannot retain the envelope Batch or root.
 const createNearDetail=nearDetailFactory(id,(b.occupiedWings||[]).map(room=>({...room})));
 root.add(b.finish(`CF-${id}-reference-envelope`));
 if(deferDetails)root.userData.createNearDetail=createNearDetail;
 else root.add(createNearDetail());
 root.userData.referenceFacility=id;
 return root;
}
