// Governing references: individual CF-25–35 facility infographics, inspected 2026-09-17
// and re-traced 2026-09-23 against the dusk cutaway panels (graphite frames, amber
// edge light, warm occupied floors, blue-glass accents and per-facility silhouettes).
// Geometry represents visible architecture; source floor programs remain authoritative.
// CF-25 area/siting remain unrecovered in the source: nothing here asserts a measured size.
import * as T from 'three';
import {Batch,cylinder,ring,line,materials} from './geometry.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

import {facadeEdge,roofCoping,roofTree,occupiedBays} from './facade-craft.js';

function footprint(w,d,r=1.4){
 const s=new T.Shape(),x=w/2,z=d/2;r=Math.min(r,x*.8,z*.8);
 s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);return s;
}
function plate(b,mat,x,y,z,w,d,th=.32,r=1.4){const g=new T.ExtrudeGeometry(footprint(w,d,r),{depth:th,bevelEnabled:false,curveSegments:5});g.rotateX(-Math.PI/2);b.add(g,mat,x,y,z);g.dispose();}
// Single-sided horizontal surface (floor finish facing up, luminous ceiling facing down).
function flat(b,mat,x,y,z,w,d,r=1,down=false){const g=new T.ShapeGeometry(footprint(w,d,r),5);g.rotateX(down?Math.PI/2:-Math.PI/2);b.add(g,mat,x,y,z);g.dispose();}
function tree(b,x,y,z,r=1.3){roofTree(b,x,y,z,r*2);}
function planter(b,x,y,z,w=3,d=2){plate(b,'stone',x,y,z,w,d,.5,.45);plate(b,'leaf',x,y+.5,z,w-.3,d-.3,.1,.3);tree(b,x,y+.5,z,Math.min(w,d)*.55);}
function solar(b,x,y,z,w,d){(b.solarZones ||= []).push({x,y,z,w,d});for(const sx of [-1,1])for(const sz of [-1,1])b.box('steel',x+sx*w*.35,y+.24,z+sz*d*.32,.10,.55,.10);y+=.55;b.box('dark',x,y,z,w,.22,d);for(let xx=-w/2+.5;xx<w/2;xx+=2.2)for(let zz=-d/2+.5;zz<d/2;zz+=3.2){b.box('solar',x+xx,y+.17,z+zz,2,.10,3);b.box('steel',x+xx,y+.24,z+zz,1.95,.06,.04);}}
function rail(b,x,y,z,w,d){for(const s of [-1,1]){b.box('glazing',x,y+.6,z+s*d/2,w,1.2,.035);b.box('steel',x,y+1.2,z+s*d/2,w,.06,.06);b.box('glazing',x+s*w/2,y+.6,z,.035,1.2,d);b.box('steel',x+s*w/2,y+1.2,z,.06,.06,d);}}

// Local luminous finishes. Their emission follows the shared warm luminaire level,
// so dusk shows occupied warm floors and daylight leaves them as plain finishes.
const litFloor=new T.MeshStandardMaterial({name:'CF25-35 lit interior floor',color:0xb99d78,roughness:.58,metalness:0,emissive:0xffb46a,emissiveIntensity:0});
const litCeiling=new T.MeshStandardMaterial({name:'CF25-35 luminous ceiling',color:0xf2e4cc,roughness:.8,metalness:0,emissive:0xffd29a,emissiveIntensity:0});
const amberTrim=new T.MeshStandardMaterial({name:'CF25-35 amber edge light',color:0xd7a552,roughness:.3,metalness:.55,emissive:0xffa13c,emissiveIntensity:0});
// Graphite cladding and roof membrane: the shared 'dark' finish reads as a black void in
// dusk light; the references show a mid-graphite frame with visible shading.
const graphite=new T.MeshStandardMaterial({name:'CF25-35 graphite cladding',color:0x4d555e,roughness:.46,metalness:.38,envMapIntensity:.9});
// Weathered field stone (CF-33/34 frames read grey-beige, not white limestone).
const fieldStone=materials.stone.clone();fieldStone.name='CF25-35 field stone';fieldStone.color.set(0xb0a797);
const roofDeck=new T.MeshStandardMaterial({name:'CF25-35 roof membrane',color:0x5d636a,roughness:.86,metalness:.05});
const LIT=new Set([litFloor,litCeiling,amberTrim]);
function syncLuminaires(){const k=Math.max(0,Math.min(1.4,materials.warm.emissiveIntensity/1.5));litFloor.emissiveIntensity=.26*k;litCeiling.emissiveIntensity=.95*k;amberTrim.emissiveIntensity=1.25*k;}
syncLuminaires();

// Outward-facing segment records for a local footprint polyline.
function edges(points){
 const out=[];
 for(let j=0;j<points.length-1;j++){
  const a=points[j],c=points[j+1],dx=c.x-a.x,dz=c.y-a.y,len=Math.hypot(dx,dz);if(len<.05)continue;
  const mx=(a.x+c.x)/2,mz=(a.y+c.y)/2;let nx=dz/len,nz=-dx/len;if(nx*mx+nz*mz<0){nx=-nx;nz=-nz;}
  out.push({a,c,len,mx,mz,nx,nz,yaw:-Math.atan2(dz,dx),face:Math.atan2(nx,nz),j});
 }
 return out;
}
// Facade assembly per wing: recessed glass between slab edges, protruding mullions or
// fins, graphite spandrels, lit floors/ceilings behind the glass, deep parapet fascia
// with an amber reveal and a metal coping. `solid` gives precast panels + clerestory.
function wing(b,x,z,w,d,h,levels=2,{skin=graphite,base=0,r=1.6,roof=true,planted=false,solid=false,parapet=.85,stories=0,fins=false,pilaster='concrete',piers=0}={}){
 b.occupiedWings??=[];b.occupiedWings.push({x,z,w,d,h,levels,base,r});
 const perimeter=footprint(w,d,r).getSpacedPoints(Math.max(20,Math.ceil((w+d)*.65))),fh=h/levels,E=edges(perimeter);
 const n=solid?1:(stories||Math.max(1,Math.round(fh/5.2))),sh=fh/n,ir=Math.max(.3,r-.9);
 for(let k=0;k<levels;k++){
  const y=base+k*fh;plate(b,'stone',x,y,z,w,d,.36,r);
  if(solid){flat(b,litFloor,x,y+.39,z,w-1.2,d-1.2,ir);for(let q=-w*.36;q<=w*.36;q+=w*.18)b.box('warm',x+q,y+fh*.8,z,.35,.12,d*.8);}
  if(!solid){
   for(let s=0;s<n;s++){
    const ys=y+s*sh;
    // Intermediate storeys are set-back gallery slabs, visible behind the glass.
    if(s>0)plate(b,'stone',x,ys-.16,z,w-.7,d-.7,.3,Math.max(.3,r-.35));
    flat(b,litFloor,x,(s?ys+.14:y+.36)+.03,z,w-1.8,d-1.8,ir);
    flat(b,litCeiling,x,(s<n-1?ys+sh-.16:y+fh)-.05,z,w-1.8,d-1.8,ir,true);
   }
  }
  for(const e of E){
   const px=x+e.mx,pz=z+e.mz;
   if(solid){
    const ph=fh*.74;
    b.box(skin,px,y+.3+ph/2,pz,e.len-.05,ph,.34,e.yaw);
    b.pane('glazing',px-e.nx*.18,y+.3+ph+(fh-ph-.3)/2,pz-e.nz*.18,e.len,fh-ph-.55,e.face);
    b.box(skin,px,y+fh-.2,pz,e.len,.4,.3,e.yaw);
    if(e.j%2===0)b.box(pilaster===null?skin:pilaster,x+e.a.x+e.nx*.3,y+fh/2+.06,z+e.a.y+e.nz*.3,.75,fh+.12,.62,e.yaw);
    continue;
   }
   // Opaque clad piers punctuate the curtain wall where the reference shows solid bays.
   if(piers&&e.len>1.5&&e.j%piers===1)b.box(skin,px,y+.33+(fh-1.13)/2,pz,e.len,fh-1.13,.34,e.yaw);
   else b.pane('glazing',px-e.nx*.18,y+fh/2,pz-e.nz*.18,e.len,fh-.45,e.face);
   facadeEdge(b,[x+e.a.x,z+e.a.y],[x+e.c.x,z+e.c.y],y,fh,{center:[x,z],skin});
   b.box(skin,px,y+fh-.48,pz,e.len,.7,.26,e.yaw);
   if(fins)b.box(skin,x+e.a.x+e.nx*.22,y+fh/2,z+e.a.y+e.nz*.22,.16,fh-.62,.56,e.yaw);
   else b.box('steel',x+e.a.x,y+fh/2+.03,z+e.a.y,.09,fh-.2,.09);
   for(let s=1;s<n;s++){
    const ys=y+s*sh;
    b.box(skin,px+e.nx*.02,ys,pz+e.nz*.02,e.len,.5,.32,e.yaw);
    b.pane(amberTrim,px+e.nx*.21,ys-.19,pz+e.nz*.21,e.len,.06,e.face);
   }
   if(e.j%3===0)b.box('warm',x+e.mx*.94-e.nx*.3,y+fh-.85,z+e.mz*.94-e.nz*.3,e.len*.8,.035,.06,e.yaw);
  }
 }
 if(roof){
  const top=base+h,cap=top+.4+parapet;
  plate(b,skin==='stone'?'stone':roofDeck,x,top,z,w+.2,d+.2,.4,r);
  for(const e of E){
   const px=x+e.mx,pz=z+e.mz;
   b.box(skin,px+e.nx*.09,(top-.25+cap)/2,pz+e.nz*.09,e.len,cap-top+.25,.38,e.yaw);
   b.pane(amberTrim,px+e.nx*.31,top-.1,pz+e.nz*.31,e.len,.07,e.face);
  }
  roofCoping(b,perimeter.slice(0,-1).map(p=>[x+p.x,z+p.y]),cap,{center:[x,z],skin});
  if(planted){
   plate(b,'grass',x,top+.45,z,w-2,d-2,.12,r);plate(b,'path',x,top+.52,z,w*.14,d-4,.1,.3);
   for(const side of [-1,1]){plate(b,'stone',x,top+.58,z+side*d*.36,w*.68,d*.13,.24,1);plate(b,'leaf',x,top+.83,z+side*d*.36,w*.68-.3,d*.13-.3,.09,.8);for(let q=-w*.31;q<=w*.31;q+=2.1)(b.roofPlanting ||= []).push({x:x+q,y:top+.92,z:z+side*d*.36+((q*7)%3-1)*.5,scale:1.7+(Math.abs(q*13)%5)*.22});}
  }
 }
 b.wingRecords??=[];b.wingRecords.push({x,z,w,d,h,base,top:base+h+.4+(roof?parapet:0)});
}
// Monolithic graphite signage pier with amber reveals; the text itself is the
// shared architectural nameplate, anchored 4 cm proud of the pier face.
function signPier(b,x,z,pw,ph,pd,text,{yaw=0,base=0,textY=.72,mat=graphite}={}){
 const c=Math.cos(yaw),s=Math.sin(yaw);
 b.box(mat,x,base+ph/2,z,pw,ph,pd,yaw);
 for(const side of [-1,1])b.box(amberTrim,x+c*side*(pw/2+.05),base+ph/2,z-s*side*(pw/2+.05),.08,ph-.6,pd*.6,yaw);
 b.box('steel',x,base+ph+.06,z,pw+.3,.16,pd+.3,yaw);
 b.signAnchor={text,width:pw*.84,height:pw*.84*.1875,position:[x+s*(pd/2+.04),base+ph*textY,z+c*(pd/2+.04)],yaw};
}
// Swept ribbon band (top, soffit and both edges) following a 3D centreline.
function ribbon(b,mat,pts,width,thick){
 const v=[],idx=[],P=pts.map(p=>new T.Vector3(...p)),m=P.length;
 for(let i=0;i<m;i++){
  const t=P[Math.min(m-1,i+1)].clone().sub(P[Math.max(0,i-1)]);t.y=0;t.normalize();const side=new T.Vector3(-t.z,0,t.x).multiplyScalar(width/2);
  for(const [sx,sy] of [[-1,1],[1,1],[1,-1],[-1,-1]])v.push(P[i].x+side.x*sx,P[i].y+sy*thick/2,P[i].z+side.z*sx);
 }
 for(let i=0;i<m-1;i++)for(let q=0;q<4;q++){const a=i*4+q,c=i*4+(q+1)%4,a2=a+4,c2=c+4;idx.push(a,c,a2,c,c2,a2);}
 const e=(m-1)*4;idx.push(0,2,1,0,3,2,e,e+1,e+2,e,e+2,e+3);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);const flatG=g.toNonIndexed();flatG.computeVertexNormals();b.add(flatG,mat);g.dispose();flatG.dispose();
 const edge=k=>Array.from({length:m},(_,i)=>[v[(i*4+k)*3],v[(i*4+k)*3+1],v[(i*4+k)*3+2]]);
 return [edge(3),edge(2)];
}
// Annular slab/ring solid of revolution: inner radius, outer radius, height.
function annulus(b,mat,x,y,z,ri,ro,hh,seg=48){const g=new T.LatheGeometry([new T.Vector2(ri,0),new T.Vector2(ro,0),new T.Vector2(ro,hh),new T.Vector2(ri,hh),new T.Vector2(ri,0)],seg);b.add(g,mat,x,y,z);g.dispose();}
function benches(b,x,y,z,n=3){for(let i=0;i<n;i++){b.box('copper',x+i*3,y+.48,z,2.4,.15,.7);for(const dx of [-.9,.9])b.box('dark',x+i*3+dx,y+.23,z,.07,.46,.6);}}
function desks(b,x,y,z,n=4){for(let i=0;i<n;i++){const xx=x+i*3;b.box('white',xx,y+.8,z,2,.1,.9);b.box('steel',xx,y+.4,z,.08,.8,.7);b.box('dark',xx,y+1.15,z+.25,.7,.5,.045);b.box('cyan',xx,y+1.15,z+.31,.6,.38,.015);b.box('dark',xx,y+.45,z-1,.5,.12,.5);b.box('dark',xx,y+.72,z-1.2,.5,.6,.08);}}
function tanks(b,x,y,z,n=3){for(let i=0;i<n;i++){const xx=x+i*3.2;cylinder(b,'steel',xx,y+2,z,1.05,4,1.05,20);const g=new T.SphereGeometry(1.05,16,8,0,Math.PI*2,0,Math.PI/2);b.add(g,'steel',xx,y+4,z,1,.5,1);g.dispose();ring(b,'dark',xx,y+.4,z,1.1,.07);line(b,'steel',[[xx,y+4.5,z],[xx,y+5,z],[xx+2,y+5,z],[xx+2,y+.3,z]],.12);}}
function entrance(b,x,z,w=9,h=5){plate(b,'stone',x,.12,z+1,w+3,4,.2,.4);b.box(graphite,x,h,z+1,w+.6,.34,3);b.pane(amberTrim,x,h,z+2.53,w+.6,.07);flat(b,litCeiling,x,h-.2,z+1,w,2.6,.2,true);for(const s of [-1,1]){b.box('steel',x+s*w/2,h/2+.1,z,.14,h-.02,.16);b.box('glazing',x+s*.85,h*.42,z,1.65,h*.83,.05);}b.box('warm',x,h-.4,z+.2,w-.5,.025,.07);}
function stair(b,x,z,w,height,depth){const n=20;for(let i=0;i<n;i++)b.box('stone',x,height*(i+.5)/n,z-depth/2+depth*(i+.5)/n,w,height/n,depth/n+.02);line(b,'steel',[[x-w/2,height/n,z-depth/2],[x-w/2,height+1,z+depth/2]],.05);}
// Glazed drum: recessed glass, external graphite mullions, slab rims and lit floors.
function drum(b,x,z,r,h,levels=2,{atrium=false,fin=graphite,finCount=32,base=0}={}){
 const glass=new T.CylinderGeometry(r-.2,r-.2,h-.3,48,1,true);b.add(glass,'glazing',x,base+h/2,z);glass.dispose();
 for(let i=0;i<=levels;i++){const y=base+i*h/levels;annulus(b,graphite,x,Math.min(i?y-.12:y,base+h-.45),z,atrium?r-2.4:0,r+.18,.45);if(i<levels){b.add(new T.RingGeometry(atrium?r-2.3:0,r-.35,48,1).rotateX(-Math.PI/2),litFloor,x,y+.48,z);}}
 for(let i=0;i<finCount;i++){const a=i*Math.PI*2/finCount;b.box(fin,x+Math.sin(a)*(r+.12),base+h/2,z+Math.cos(a)*(r+.12),.16,h-.1,.42,a);}
}

// Occupied frontage uses local, low-tint glazing: no global scene material mutation.
const clearFacade=materials.glazing.clone();clearFacade.name='CF25-35 clear occupied facade';clearFacade.color.set(0xdce9e9);clearFacade.opacity=.20;clearFacade.metalness=.025;clearFacade.roughness=.16;clearFacade.envMapIntensity=.6;
function soft(b,mat,x,y,z,w,h,d,r=.08){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.3,h*.3,d*.3));b.add(g,mat,x,y,z);g.dispose();}
function chair(b,x,y,z){soft(b,'dark',x,y+.46,z,.52,.11,.52);soft(b,'dark',x,y+.77,z+.22,.52,.57,.10);for(const s of [-1,1])b.box('steel',x+s*.20,y+.22,z,.045,.44,.40);}
function workbench(b,x,y,z,type){soft(b,'white',x,y+.87,z,3.6,.16,1.25);for(const xx of [-1.5,1.5])b.box('steel',x+xx,y+.44,z,.1,.88,1.1);
 if(type==='lab'){soft(b,'steel',x-.8,y+1.20,z,.8,.5,.6);cylinder(b,'glazing',x+.8,y+1.17,z,.16,.45,.16,10);b.box('dark',x,y+1.27,z+.40,.65,.52,.08);}
 else if(type==='food'){soft(b,'steel',x,y+1.15,z,2,.45,.7);for(const xx of [-.7,0,.7])soft(b,'copper',x+xx,y+1.42,z,.5,.10,.45);}
 else {soft(b,'dark',x,y+1.29,z+.32,.9,.62,.08);b.box('cyan',x,y+1.29,z+.40,.78,.50,.015);chair(b,x,y,z-1);}
}
function meeting(b,x,y,z){soft(b,'copper',x,y+.8,z,3.6,.14,1.6,.16);for(const xx of [-1.2,1.2])b.box('dark',x+xx,y+.4,z,.10,.8,1.1);for(const xx of [-1,1])for(const zz of [-1.2,1.2])chair(b,x+xx,y,z+zz);}
function instrument(b,x,y,z,kind='lab'){
 soft(b,'white',x,y+1.12,z,1.8,2.2,1.1,.12);soft(b,'dark',x,y+1.42,z+.57,1.38,.80,.065,.05);b.box('cyan',x,y+1.42,z+.64,1.16,.58,.016);
 for(let i=0;i<5;i++)b.box('steel',x,y+.35+i*.09,z+.61,1.36,.035,.03);
 if(kind==='energy'){for(const xx of [-.4,.4])cylinder(b,'copper',x+xx,y+2.45,z,.12,.55,.12,8);}else b.box('gold',x+.58,y+.88,z+.64,.10,.10,.03);
}
function partition(b,x,y,z,w){b.box('glazing',x,y+1.65,z,w,3.3,.035);b.box('steel',x,y+3.32,z,w,.07,.10);for(const s of [-1,1])b.box('steel',x+s*w/2,y+1.65,z,.07,3.26,.10);}
function nearOccupancy(f,wings){
 const b=new Batch();
 for(const [index,q] of wings.entries()){
  if(q.w<6||q.d<6||q.base>f.h*.8)continue;
  for(let floor=0;floor<q.levels;floor++){
   const y=q.base+floor*q.h/q.levels+.40,front=q.z+q.d/2-2.4,back=q.z-q.d/2+2.5;
   if(f.id!==26)occupiedBays(b,footprint(q.w,q.d,q.r).getPoints(4).slice(0,-1).map(p=>[q.x+p.x,q.z+p.y]),y,q.h/q.levels-.34);
   const count=Math.min(6,Math.max(1,Math.floor((q.w-4)/5.5)));
   for(let i=0;i<count;i++){
    const x=q.x+(i-(count-1)/2)*5.5;
    if([25,26,27,28].includes(f.id)){workbench(b,x,y,front,'lab');if(i%2===0)instrument(b,x,y,back);}
    else if(f.id===29){workbench(b,x,y,front,'food');if(i%2===0)soft(b,'steel',x,y+1.3,back,2.2,2.6,1.2);}
    else if(f.id===30){instrument(b,x,y,front);if(i%2===0)workbench(b,x,y,back,'office');}
    else if([31,33].includes(f.id)){if(i%2===0)meeting(b,x,y,front);else workbench(b,x,y,front,'office');}
    else if(f.id===32){soft(b,'stone',x,y+.6,front,2.8,1.2,1.1);soft(b,'glazing',x,y+1.6,front,2.5,.8,.9);soft(b,'gold',x,y+1.4,front,.5,.5,.4);}
    else if(f.id===34){instrument(b,x,y,front,'energy');workbench(b,x,y,back,'office');}
    else if(f.id===35){if(index%2===0){soft(b,'white',x,y+.57,front,1.8,.5,2.9);soft(b,'stone',x,y+.92,front,1.75,.22,2.7);soft(b,'white',x,y+1.1,front-.9,1.3,.20,.5);soft(b,'copper',x+1.5,y+.65,front-.8,.65,1.3,.65);}else meeting(b,x,y,front);}
   }
   if(q.d>13){partition(b,q.x,y,q.z,q.w*.72);soft(b,'white',q.x-q.w*.32,y+1.1,q.z,1.8,2.2,.4);}
   // Recessed ceiling coves and workstation pendant rails, attached to each floor.
   for(const z of [front,back])b.box('warm',q.x,y+Math.min(q.h/q.levels-1.2,3.4),z,q.w*.7,.05,.09);
  }
 }
 const result=b.finish(`CF-${f.id}-occupied-floor-details`);result.userData.nearDetail=true;result.userData.detailPurpose='facility-specific equipment, cabinetry and furniture';return result;
}
function identityDetails(b,f){const {id,w,d,h}=f;
 if(id===27){
  // Visible pilot-plant skid, guarded process gantry and external distribution rack.
  for(const [x,sx] of [[-w*.47-.45,-1],[w*.505+.45,1]])for(let z=-d*.40;z<d*.46;z+=6){const ph=sx<0||z<-d*.08?h:z<d*.26?h*.68:h*.36;b.box(graphite,x,ph*.5+.2,z,.42,ph+.4,.7);b.box('steel',x+sx*.1,ph*.5+.2,z+.38,.12,ph+.2,.08);}
  for(const y of [3.5,4.1,4.7])line(b,'steel',[[w*.53,y,-d*.35],[w*.53,y,d*.27],[w*.44,y,d*.32]],.14);
  for(const z of [-d*.3,-d*.1,d*.12]){b.box('steel',w*.55,2.8,z,.18,5.6,.25);b.box('steel',w*.53,5.65,z,1.2,.16,.25);}
  for(const x of [w*.08,w*.28]){cylinder(b,'steel',x,h+1.9,-d*.30,1.7,3.0,1.7,24);ring(b,'dark',x,h+3.4,-d*.30,1.7,.11);b.box('steel',x,h+1.25,-d*.20,2.2,1.7,2.2);}
  for(let i=0;i<5;i++){const z=d*.29+i*2.8;b.box('gold',w*.52,.45,z,.12,.07,1.4);}
 }else if(id===29){
  // Distinct food/logistics frontage: articulated loading doors, seals and bollards.
  b.box('copper',-w*.415,h*.5,d*.236,.20,h-.2,.7);
  for(let i=0;i<3;i++){const x=w*.06+i*w*.17;for(let k=0;k<13;k++)b.box('steel',x,1+k*.62,d*.471,w*.115,.045,.07);for(const s of [-1,1]){soft(b,'dark',x+s*w*.066,h*.19,d*.49,.55,h*.36,.55);cylinder(b,'gold',x+s*w*.073,.65,d*.56,.16,1.3,.16,10);}b.box(amberTrim,x,h*.395,d*.51,w*.10,.06,.06);}
  for(let i=0;i<6;i++)b.box('steel',w*.075+i*w*.058,h*.88+2.2,-d*.26,.055,3.55,d*.28);
  for(const z of [-d*.36,-d*.17])line(b,'steel',[[w*.075,h*.88+3.8,z],[w*.37,h*.88+3.8,z]],.06);
 }else if(id===34){
  // Grid demonstration yard: transformer bank, bushings and the visible cable gantry.
  for(let i=0;i<3;i++){const x=-w*.12+i*4.7,z=d*.54;soft(b,'steel',x,2,z,3.2,3.6,2.5,.2);for(let k=0;k<9;k++)b.box('dark',x-1.6+k*.4,1.8,z+1.38,.13,2.8,.4);for(const xx of [-.8,.8]){cylinder(b,'copper',x+xx,4.2,z,.17,1.15,.17,12);for(let k=0;k<5;k++)cylinder(b,'stone',x+xx,3.9+k*.15,z,.32,.07,.32,12);}}
  line(b,'steel',[[-w*.15,5.2,d*.54],[w*.14,5.2,d*.54],[w*.14,5.2,d*.12],[w*.39,5.2,d*.12]],.16);
 }
}

export function createFacility25to35(f,{deferDetails=false}={}){
 if(f.id<25||f.id>35)return null;
 const b=new Batch(),{w,d,h,id}=f;
 plate(b,'path',0,0,0,w+9,d+9,.23,3);
 if(id===25){
  // Gaia: curved planted shoulders embracing a projecting living atrium drum with a
  // heavy graphite crown ring and planted rim; front graphite nameplate pier.
  wing(b,-w*.28,0,w*.43,d*.93,h,2,{r:7,planted:true});wing(b,w*.28,-d*.08,w*.43,d*.77,h*.87,2,{r:6,planted:true});
  wing(b,0,-d*.34,w*.12,d*.27,h*.91,2,{r:2.5,planted:true});
  const R=w*.145,H=h*1.13,dz=d*.16;
  drum(b,0,dz,R,H,4,{atrium:true,finCount:36});
  annulus(b,graphite,0,H-.3,dz,R-1.6,R+1.4,2.6);annulus(b,'leaf',0,H+2.33,dz,R-1.3,R+.9,.14);
  ring(b,amberTrim,0,H+.35,dz,R+1.47,.07);ring(b,amberTrim,0,H+2.05,dz,R+1.47,.05);
  for(let i=0;i<10;i++){const a=i*Math.PI/5+.2;roofTree(b,Math.sin(a)*(R-.2),H+2.45,dz+Math.cos(a)*(R-.2),1.5+(i%3)*.25);}
  cylinder(b,'trunk',0,h*.44,dz,.45,h*.88,.19,12);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.sin(a)*4,z=dz+Math.cos(a)*4;line(b,'trunk',[[0,h*.48,dz],[x*.6,h*.79,z],[x,h*.98,z]],.20);const crown=new T.SphereGeometry(3.3,12,8);b.add(crown,'leaf',x,h*1.035,z,1,1.1,1);crown.dispose();}
  for(const side of [-1,1]){solar(b,side*w*.29,h*(side<0?1:.87)+.62,-d*.12,w*.24,d*.2);desks(b,side*w*.3-5,.40,d*.25,4);}
  entrance(b,0,dz+R+.3,10,6);benches(b,-3,.3,d*.39+3,4);
  signPier(b,-w*.155,d*.505,6.5,h*.62,1.6,'CF-25');
  // Reflecting channel along the front-left walk (reference water edge).
  plate(b,'stone',-w*.33,.23,d*.56,w*.26,3.2,.22,.5);plate(b,'water',-w*.33,.47,d*.56,w*.26-.5,2.7,.04,.4);
 }else if(id===26){
  // Orbital: opaque precast high-bay hall with clerestory, glazed ridge skylight and a
  // continuous crane gantry; tall nameplate block and stepped engineering labs in front.
  const hz=-d*.14,hd=d*.67;
  wing(b,0,hz,w*.98,hd,h,1,{r:.8,roof:false,solid:true,skin:'concrete',pilaster:'civic'});
  for(const side of [-1,1])plate(b,roofDeck,side*w*.305,h,hz,w*.37,hd,.4,.8);
  for(const side of [-1,1])plate(b,roofDeck,0,h,hz+side*hd*.43,w*.25,hd*.14,.4,.6);
  for(const e of edges(footprint(w*.98,hd,.8).getSpacedPoints(60))){b.box(graphite,e.mx+e.nx*.12,h+.6,hz+e.mz+e.nz*.12,e.len,1.7,.32,e.yaw);b.pane(amberTrim,e.mx+e.nx*.31,h+.1,hz+e.mz+e.nz*.31,e.len,.07,e.face);}
  for(const x of [-w*.36,w*.36]){b.box('gold',x,h*.78,hz,.7,.8,hd*.86);for(const z of [-hd*.38,0,hd*.38])b.box('steel',x,h*.39-.02,hz+z,.45,h*.78-.44,.45);}
  b.box('gold',0,h*.77,hz+d*.04,w*.75,.75,1.1);line(b,'dark',[[0,h*.75,hz+d*.04],[0,h*.42,hz+d*.04]],.055);
  const rocket=new T.CylinderGeometry(2.5,2.5,hd*.55,24);rocket.rotateX(Math.PI/2);b.add(rocket,'white',0,5.2,hz);rocket.dispose();
  const nose=new T.ConeGeometry(2.5,4.5,24);nose.rotateX(Math.PI/2);b.add(nose,'white',0,5.2,hz+hd*.275+2.25);nose.dispose();
  for(const z of [-hd*.18,hd*.16]){ring(b,'dark',0,5.2,hz+z,2.62,.20,0);b.box('gold',0,1.5,hz+z,6,1.2,1.2);}
  for(const x of [-w*.41,w*.41])for(const z of [-hd*.33,hd*.33])desks(b,x-3,.40,hz+z,3);
  solar(b,-w*.25,h+.43,hz,w*.29,hd*.7);solar(b,w*.25,h+.43,hz,w*.29,hd*.7);
  plate(b,'glazing',0,h+.41,hz,w*.24,hd*.72,.08,.5);for(let z=-hd*.3;z<hd*.32;z+=4)b.box('steel',0,h+.55,hz+z,w*.25,.12,.12);
  // Front: tall nameplate/visitor block (left) and lower stepped engineering labs (right).
  wing(b,-w*.245,d*.34,w*.47,d*.27,h,2,{r:.8,fins:true,piers:4});
  wing(b,w*.25,d*.34,w*.46,d*.27,h*.55,2,{r:.8});
  b.box(graphite,-w*.245,h*.72,d*.475+.62,w*.44,h*.38,.5);b.pane(amberTrim,-w*.245,h*.53+.05,d*.475+.9,w*.44,.08);
  b.signAnchor={text:'CF-26',width:w*.30,height:w*.30*.1875,position:[-w*.27,h*.76,d*.475+.91],yaw:0};
  entrance(b,-w*.26,d*.49,w*.34,6);
  for(const z of [-d*.36,-d*.18,0]){b.box('dark',w*.49+.75,4,z,.3,8,7.4);for(let k=0;k<11;k++)b.box('steel',w*.49+.92,.6+k*.66,z,.06,.05,6.8);b.box('dark',w*.52+1.3,8.3,z,3,.3,8);b.pane(amberTrim,w*.52+2.83,8.3,z,8,.07,Math.PI/2);}
 }else if(id===27){
  // Matter Works: successive pilot-process terraces inside a heavy graphite frame.
  wing(b,-w*.32,0,w*.30,d*.95,h,2,{r:.9,fins:true,piers:4});wing(b,w*.18,-d*.28,w*.65,d*.39,h,2,{r:.9,fins:true,piers:4});
  wing(b,w*.18,d*.10,w*.65,d*.32,h*.68,1,{r:.9,stories:2});wing(b,w*.18,d*.38,w*.65,d*.24,h*.36,1,{r:.9,stories:1});
  for(const [y,z] of [[.40,d*.37],[.40,d*.12],[h*.5+.40,-d*.28]]){tanks(b,0,y,z,4);desks(b,w*.13,y,z+5,3);}
  for(const z of [-d*.27,d*.07])line(b,'steel',[[-w*.1,4,z],[w*.39,4,z],[w*.39,h*.8,z]],.18);
  solar(b,-w*.32,h+.43,0,w*.2,d*.72);
  // Nameplate panel above a warm glazed lobby with a deep graphite canopy.
  b.box(graphite,-w*.32,h*.70,d*.475+.55,w*.27,h*.36,.5);b.pane(amberTrim,-w*.32,h*.52,d*.475+.83,w*.27,.07);
  b.signAnchor={text:'CF-27',width:w*.22,height:w*.22*.1875,position:[-w*.32,h*.74,d*.475+.84],yaw:0};
  entrance(b,-w*.25,d*.49,10,5);
  b.box(graphite,w*.44,4.2,d*.52,w*.2,.4,6);b.pane(amberTrim,w*.44,4.0,d*.52+3.02,w*.2,.07);
 }else if(id===28){
  // Water Observatory: inclined graphite blade carrying the nameplate, tall pier,
  // planted curved low wing and descending water basins at the frontage.
  wing(b,-w*.20,-d*.16,w*.44,d*.62,h,2,{r:2,fins:true,piers:5});wing(b,w*.25,-d*.20,w*.40,d*.55,h,2,{r:3});
  wing(b,w*.16,d*.30,w*.56,d*.26,h*.56,1,{r:2,stories:3});
  wing(b,-w*.33,d*.30,w*.20,d*.26,h*.36,1,{r:5,planted:true,stories:2});
  const blade=new T.Shape();blade.moveTo(d*.50,0);blade.lineTo(d*.50,2.2);blade.lineTo(-d*.30,h+3.2);blade.lineTo(-d*.46,h+3.2);blade.lineTo(-d*.46,0);blade.lineTo(d*.50,0);
  const bg=new T.ExtrudeGeometry(blade,{depth:1.6,bevelEnabled:false});bg.rotateY(-Math.PI/2);b.add(bg,graphite,-w*.465,0,0);bg.dispose();
  // Amber reveal follows the blade's sloping top edge.
  line(b,amberTrim,[[-w*.465-1.7,2.25,d*.50],[-w*.465-1.7,h+3.25,-d*.30]],.07);
  b.signAnchor={text:'CF-28',width:d*.36,height:d*.36*.1875,position:[-w*.465-1.64,h*.34,d*.08],yaw:-Math.PI/2};
  b.box(graphite,w*.475,(h+4)/2,d*.12,2.4,h+4,3.2);b.box(amberTrim,w*.475,(h+4)/2,d*.12+1.65,.14,h+3,.08);
  tanks(b,w*.04,.40,d*.21,4);solar(b,w*.25,h+.43,-d*.22,w*.3,d*.3);solar(b,-w*.2,h+.43,-d*.25,w*.3,d*.28);
  for(let i=0;i<4;i++){const z=d*.46+i*2.2,y=(3-i)*.45+.25;plate(b,'stone',-w*.12,y,z,w*.3,2.4,.25,.4);plate(b,'water',-w*.12,y+.27,z,w*.28,2.25,.04,.3);b.box('water',-w*.12,y-.1,z+1.14,w*.28,.6,.04);}
  entrance(b,w*.26,d*.44,8,5);
 }else if(id===29){
  // Living Provision: cylindrical glazed corner with warm fins, rooftop growing house,
  // cantilevered arrival canopy and a dispatch apron with three loading bays.
  wing(b,-w*.25,-d*.13,w*.48,d*.72,h,2,{r:4,fins:true,piers:5});wing(b,w*.22,-d*.26,w*.47,d*.47,h*.88,2,{r:2});
  wing(b,w*.23,d*.24,w*.50,d*.42,h*.43,1,{r:1,stories:2});
  drum(b,-w*.06,d*.15,w*.095,h,4,{fin:'copper',finCount:28});annulus(b,roofDeck,-w*.06,h-.3,d*.15,0,w*.095+.6,1.4);ring(b,amberTrim,-w*.06,h-.1,d*.15,w*.095+.64,.06);
  for(let i=0;i<3;i++){const x=w*.06+i*w*.17;b.box('dark',x,h*.2,d*.46,w*.13,h*.35,.1);b.box('steel',x,h*.38,d*.52,w*.14,.2,4);b.box('path',x,.4,d*.59,w*.13,.7,d*.17);}
  wing(b,w*.22,-d*.26,w*.30,d*.27,3.6,1,{base:h*.88+.4,skin:'steel',roof:false,r:.5});plate(b,'glazing',w*.22,h*.88+4.05,-d*.26,w*.30,d*.27,.06,.5);
  for(let q=0;q<5;q++)b.box('leaf',w*.11+q*2,h*.88+.4+.52,-d*.26,.9,.3,d*.23);
  tanks(b,w*.03,h*.43+.4,d*.19,3);solar(b,-w*.28,h+.43,-d*.2,w*.30,d*.4);
  plate(b,graphite,-w*.41,h*.33,d*.33+.05,w*.18,d*.2,.45,.4);b.pane(amberTrim,-w*.41,h*.33+.22,d*.43+.08,w*.18-.8,.08);flat(b,litCeiling,-w*.41,h*.33-.04,d*.33+.05,w*.17,d*.19,.3,true);
  for(const x of [-w*.48,-w*.34])cylinder(b,'steel',x,h*.165,d*.41,.14,h*.33,.14,10);
  entrance(b,-w*.40,d*.235,9,5);
  signPier(b,-w*.27,d*.235+.9,5.2,h*.78,1.4,'CF-29');
 }else if(id===30){
  // Trust Vault: octagonal central crown with faceted lantern, gold arrises, blue-glass
  // slits and fluted radial security buttresses around the monumental key entry.
  wing(b,-w*.29,-d*.06,w*.33,d*.78,h*.76,2,{r:1,fins:true,piers:3});wing(b,w*.29,-d*.06,w*.33,d*.78,h*.76,2,{r:1,fins:true,piers:3});
  const R=w*.115,tz=-d*.10,ap=R*Math.cos(Math.PI/8);
  cylinder(b,graphite,0,h*.51,tz,R,h*1.02,R,8);cylinder(b,'stone',0,h*1.02+.15,tz,R*1.1,.5,R*1.1,8);
  cylinder(b,'blueGlass',0,h*1.02+.4+h*.04,tz,R*.86,h*.08,R*.72,8);cylinder(b,graphite,0,h*1.1+.4+.3,tz,R*.74,.7,R*.5,8);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;b.box(amberTrim,Math.sin(a)*(R+.04),h*.51,tz+Math.cos(a)*(R+.04),.16,h*1.0,.16,a);
   const fa=a+Math.PI/8;b.box('blueGlass',Math.sin(fa)*(ap+.05),h*.62,tz+Math.cos(fa)*(ap+.05),1.1,h*.55,.06,fa);}
  wing(b,0,d*.27,w*.42,d*.39,h*.48,1,{r:2,stories:3});
  for(const s of [-1,1])for(let i=0;i<4;i++){const x=s*(w*.24+i*w*.075);b.box(graphite,x,h*.28,d*.36,1.5,h*.56,3.5);b.box(amberTrim,x+s*.81,h*.28,d*.36+1.1,.1,h*.56-.6,.1);if(i>0)b.box('blueGlass',x-s*2.4,h*.30,d*.36+1.2,1.6,h*.46,.06);}
  for(const x of [-w*.30,w*.30]){solar(b,x,h*.76+.43,-d*.10,w*.23,d*.48);desks(b,x-4,h*.38+.40,d*.1,3);}
  const kz=d*.465+.55;b.box(graphite,0,h*.35,kz-.1,6.4,h*.26,.3);
  ring(b,amberTrim,0,h*.40,kz+.12,1.7,.2,0);line(b,amberTrim,[[0,h*.40-1.7,kz+.12],[0,h*.26,kz+.12]],.2);for(const y of [h*.30,h*.27])b.box(amberTrim,.6,y,kz+.12,1.1,.28,.28);
  b.signAnchor={text:'SOVEREIGN KEY',width:5.6,height:1.05,position:[0,h*.22+.72,kz+.09],yaw:0};
  entrance(b,0,d*.47,9,6);
  for(let i=0;i<5;i++)b.box('stone',0,.18+i*.17,d*.47+4.6+(4-i)*.7,12,.17,.7);
 }else if(id===31){
  // Resilience: softened L-shaped client block, roof garden, blue-glass oculus and a
  // corner nameplate pier at the client arrival.
  wing(b,-w*.29,0,w*.40,d*.91,h,2,{r:5,planted:true});wing(b,w*.21,-d*.27,w*.57,d*.37,h,2,{r:3,planted:true});
  wing(b,w*.25,d*.24,w*.43,d*.40,h*.58,1,{r:4,planted:true,stories:3});wing(b,-w*.03,d*.35,w*.10,d*.20,5,1,{r:1.2});
  annulus(b,graphite,-w*.28,h+.4,-d*.04,w*.105,w*.105+1.1,1.0,40);b.add(new T.CircleGeometry(w*.105,40).rotateX(-Math.PI/2),'blueGlass',-w*.28,h+1.25,-d*.04);ring(b,amberTrim,-w*.28,h+1.2,-d*.04,w*.105+1.13,.06);
  solar(b,w*.26,h+.62,-d*.3,w*.36,d*.19);for(const y of [.40,h/2+.40]){desks(b,-w*.41,y,d*.22,5);desks(b,w*.04,y,-d*.25,5);}
  entrance(b,-w*.03,d*.46,5.5,4.8);planter(b,-1.5,.3,d*.02,4,4);
  signPier(b,-w*.155,d*.455+1.1,7,h*.9,1.6,'RESILIENCE HOUSE',{textY:.62});
 }else if(id===32){
  // Exchange: open marketplace under a glazed elliptical lattice, a graphite ribbon
  // sweeping from the arrival plaza onto the roof, nameplate facade on the west wing.
  wing(b,-w*.34,-d*.04,w*.30,d*.88,h*.78,2,{r:2,fins:true});wing(b,w*.34,-d*.04,w*.30,d*.88,h*.78,2,{r:2});wing(b,0,-d*.36,w*.41,d*.23,h*.78,2,{r:1});
  const top=h*.78+1.25,A=w*.21,Hh=h*.15,z0=-d*.30,L=d*.62;
  for(let i=-4;i<=4;i++){const x=i*w*.042,pts=[];for(let j=0;j<=16;j++){const u=j/16;pts.push([x,top+Math.sin(u*Math.PI)*Hh*Math.sqrt(1-(x/A)**2),z0+u*L]);}line(b,'steel',pts,.13);}
  for(let i=0;i<=12;i++){const u=i/12,pts=[];for(let j=-8;j<=8;j++){const x=j*w*.022;pts.push([x,top+Math.sin(u*Math.PI)*Hh*Math.sqrt(Math.max(0,1-(x/A)**2)),z0+u*L]);}line(b,'gold',pts,.08);}
  {const v=[],idx=[],NX=16,NZ=16;for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){const x=-A*.98+2*A*.98*i/NX,u=j/NZ;v.push(x,top-.06+Math.sin(u*Math.PI)*Hh*Math.sqrt(Math.max(0,1-(x/A)**2)),z0+u*L);}
   for(let i=0;i<NX;i++)for(let j=0;j<NZ;j++){const a=i*(NZ+1)+j,c=a+NZ+1;idx.push(a,a+1,c,c,a+1,c+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();b.add(g,'glazing');g.dispose();}
  // Ribbon canopy: springs from the west nameplate wing and sweeps down across the
  // arrival plaza to the east entry, carried on slender columns.
  const rib=[];for(let i=0;i<=28;i++){const t=i/28;rib.push([-w*.36+t*w*.74,1.2+(h*.35-1.2)*(Math.cos(t*Math.PI)+1)/2,d*.47+Math.sin(t*Math.PI)*d*.10]);}
  const [ribA,ribB]=ribbon(b,graphite,rib,3.6,.55);
  for(const edge of [ribA,ribB])line(b,amberTrim,edge.map(([x,y,z])=>[x,y-.02,z]),.06);
  for(const k of [2,7,12,17,22]){const [x,y,z]=rib[k];cylinder(b,"steel",x,(y-.1)/2,z,.18,y-.3,.18,10);}
  for(const x of [-w*.32,w*.32])for(const z of [-d*.2,d*.18]){b.box('stone',x,1.16,z,4,1.6,2);b.box('warm',x,2.0,z,3.8,.035,1.8);}
  cylinder(b,'stone',0,.4,0,4,.5);ring(b,'gold',0,5,0,3,.13,0);ring(b,'steel',0,5,0,3,.13,Math.PI/3);entrance(b,0,d*.36,11,4.5);
  b.box(graphite,-w*.34,h*.58,d*.40+.75,w*.27,h*.30,.6);b.pane(amberTrim,-w*.34,h*.43-.06,d*.40+1.08,w*.27,.07);
  b.signAnchor={text:'COLLECTIVE AI INC',width:w*.25,height:w*.25*.1875,position:[-w*.34,h*.62,d*.40+1.1],yaw:0};
 }else if(id===33){
  // Human Systems: teaching blocks with wrapped balcony ribbons, a central social stair,
  // terraced seminar seating and a tall graphite nameplate tower at the arrival.
  wing(b,-w*.33,-d*.05,w*.31,d*.81,h,2,{r:3,planted:true,fins:true,piers:4,skin:fieldStone});wing(b,w*.31,-d*.23,w*.34,d*.45,h,2,{r:3,planted:true,piers:4,skin:fieldStone});
  wing(b,w*.30,d*.20,w*.37,d*.37,h*.56,1,{r:3,planted:true,stories:3});wing(b,-w*.06,-d*.34,w*.22,d*.22,h,2,{r:2});
  // Wrapped balconies: rounded ribbons proud of the facade at the mid-level slab.
  for(const [x,z,ww,dd,skip] of [[-w*.33,-d*.05,w*.31,d*.81,e=>e.nx>.5],[w*.31,-d*.23,w*.34,d*.45,e=>e.nz>.5||e.nx<-.5]]){
   const y=h/2,E=edges(footprint(ww+3,dd+3,4).getSpacedPoints(Math.ceil((ww+dd)*.5))).filter(e=>!skip(e));
   for(const e of E){b.box(graphite,x+e.mx-e.nx*.8,y-.05,z+e.mz-e.nz*.8,e.len,.44,1.6,e.yaw);b.pane('glazing',x+e.mx-e.nx*.1,y+.62,z+e.mz-e.nz*.1,e.len,1.05,e.face);b.box('steel',x+e.mx-e.nx*.1,y+1.18,z+e.mz-e.nz*.1,e.len,.06,.06,e.yaw);b.pane(amberTrim,x+e.mx+e.nx*.03,y-.3,z+e.mz+e.nz*.03,e.len,.07,e.face);}
  }
  stair(b,0,0,w*.12,h*.50,d*.56);
  for(let row=0;row<4;row++)for(let col=0;col<6;col++){const x=w*.18+col*2,y=.40+row*.24,z=d*.05+row*2;b.box('dark',x,y+.5,z,.7,.15,.7);b.box('copper',x,y+.9,z+.2,.7,.6,.1);}
  b.box('dark',w*.31,3,-d*.01,w*.20,4,.12);b.box('cyan',w*.31,3,-d*.01+.11,w*.18,3.5,.03);
  desks(b,-w*.44,h*.5+.40,d*.08,7);entrance(b,w*.05,d*.43,11,5);benches(b,w*.2,.3,d*.37+4.5,4);
  signPier(b,-w*.105,d*.37,9,h*1.08,6,'CF-33',{textY:.5});
  {const tz=d*.37+3.06;const tri=new T.Shape();tri.moveTo(-2.4,0);tri.lineTo(2.4,0);tri.lineTo(0,4.1);tri.lineTo(-2.4,0);const hole=new T.Path();hole.moveTo(-1.5,.55);hole.lineTo(0,3.1);hole.lineTo(1.5,.55);hole.lineTo(-1.5,.55);tri.holes.push(hole);const g=new T.ExtrudeGeometry(tri,{depth:.12,bevelEnabled:false});b.add(g,amberTrim,-w*.105,h*.66,tz);g.dispose();}
 }else if(id===34){
  // Energy Commons: solar/clerestory roof, visible demonstration machinery and control
  // wing behind a tall graphite nameplate pier at the west corner.
  wing(b,-w*.32,0,w*.34,d*.94,h,2,{r:.7,fins:true,piers:3,skin:fieldStone});wing(b,w*.16,-d*.31,w*.65,d*.32,h,2,{r:.7,piers:3,skin:fieldStone});wing(b,w*.30,d*.05,w*.37,d*.43,h*.75,2,{r:.7,piers:4});
  wing(b,-w*.04,d*.25,w*.35,d*.44,h*.42,1,{r:.7,stories:2});
  solar(b,-w*.32,h+.43,0,w*.25,d*.74);solar(b,w*.16,h+.43,-d*.31,w*.55,d*.21);
  plate(b,'glazing',-w*.01,h*.42+.45,d*.25,w*.26,d*.32,.08,.5);for(let x=-w*.14;x<w*.12;x+=3)b.box('steel',x,h*.42+.62,d*.25,.12,.16,d*.33);
  tanks(b,-w*.16,.40,d*.23,4);for(let i=0;i<5;i++){b.box('steel',w*.16+i*2.6,.40+2,d*.05,1.8,4,1.5);b.box('dark',w*.16+i*2.6,2.8,d*.05+.8,1.3,1.1,.1);}
  desks(b,w*.08,h*.375+.40,d*.12,6);b.box('dark',w*.39,h*.55,-d*.10,10,5,.14);b.box('cyan',w*.39,h*.55,-d*.10+.11,9.6,4.6,.03);entrance(b,w*.12,d*.48,10,5);
  signPier(b,-w*.42,d*.47+1.3,8,h+3,2.2,'CF-34',{textY:.8});
 }else if(id===35){
  // Re-reviewed against CF35: a contiguous occupied perimeter and cross-link,
  // not detached low pods. Open courts remain voids between linked wings.
  const ph=h*.86,sk=graphite;
  wing(b,-w*.37,0,w*.25,d*.92,ph,2,{skin:sk,r:1.2,planted:true,piers:3});
  wing(b,w*.37,0,w*.25,d*.92,ph*.96,2,{skin:sk,r:1.2,planted:true,piers:3});
  wing(b,0,-d*.37,w*.53,d*.21,ph,1,{skin:sk,r:1,planted:true,stories:2});
  wing(b,0,d*.36,w*.54,d*.23,ph,1,{skin:sk,r:1,planted:true,stories:2,piers:3});
  wing(b,0,-d*.015,w*.53,d*.18,ph*.98,2,{skin:sk,r:1,planted:true});
  // Frontage has deep opaque piers and a broad, structurally supported canopy.
  for(const x of [-w*.43,-w*.27,w*.13,w*.29,w*.46]){
   b.box(graphite,x,ph*.49,d*.48+.1,1.15,ph*.98,.65);
   b.box(amberTrim,x+.63,ph*.49,d*.48+.1,.08,ph*.98-.6,.4);
  }
  plate(b,graphite,-w*.28,ph*.43,d*.55,w*.27,d*.18,.3,1);b.pane(amberTrim,-w*.28,ph*.43+.12,d*.64+.03,w*.27-2,.08);flat(b,litCeiling,-w*.28,ph*.43-.04,d*.55,w*.26,d*.17,.8,true);
  for(const x of [-w*.40,-w*.16])cylinder(b,'steel',x,ph*.215,d*.625,.13,ph*.43,.13,12);
  entrance(b,-w*.28,d*.476,w*.14,ph*.42);
  // Solar fields and roof garden walks follow the continuous roof geometry.
  solar(b,-w*.37,ph+.62,-d*.19,w*.17,d*.27);
  solar(b,w*.37,ph*.96+.62,-d*.18,w*.17,d*.28);
  solar(b,w*.10,ph+.62,d*.36,w*.24,d*.15);
  solar(b,-w*.05,ph+.62,-d*.37,w*.27,d*.14);
  for(const x of [-w*.37,w*.37])plate(b,'path',x,ph*(x<0?1:.96)+.52,d*.13,w*.15,d*.18,.1,.4);
  // Separate rear family arrival court and front therapeutic court, connected
  // through the occupied central spine rather than outdoor gaps in the shell.
  for(const [z,cd] of [[-d*.185,d*.15],[d*.16,d*.16]]){
   plate(b,'path',0,.28,z,w*.46,cd,.10,2);
   for(const x of [-w*.15,w*.15])planter(b,x,.36,z,5,3.2);
   benches(b,-4,.37,z,3);
   cylinder(b,'stone',0,.5,z,2.4,.35,2.4,32);
  }
  // Glazed learning rooms and controlled care frontage contain actual fittings.
  for(const x of [-w*.37,w*.37])for(let i=0;i<4;i++){
   const z=-d*.28+i*d*.18;
   b.box('white',x,.8,z,2.1,.9,3.6);b.box('stone',x,1.35,z-.15,1.8,.18,3.1);
   b.box('copper',x+3.3,1.36,z,1.1,2,.6);
  }
  desks(b,-w*.18,.40,-d*.015,8);
  // Outdoor garden loop at the visitor frontage.
  for(const s of [-1,1]){
   const pts=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI;pts.push([s*w*.30+Math.cos(a)*w*.14,.31,d*.50+Math.sin(a)*d*.08]);}
   line(b,'path',pts,.8);for(let i=0;i<5;i++)planter(b,s*w*.30+(i-2)*3,.25,d*.55+(i%2)*2,2.2,1.6);
  }
  signPier(b,w*.05,d*.48+.9,9,ph*.62,1.2,'CF-35',{textY:.6});
 }
 identityDetails(b,f);
 // Keep taller planting clear of installed panel arrays; sedum may remain below raised modules.
 for(const p of b.roofPlanting||[])if(!(b.solarZones||[]).some(s=>Math.abs(p.y-s.y)<2.5&&Math.abs(p.x-s.x)<s.w/2+1.7&&Math.abs(p.z-s.z)<s.d/2+1.7))roofTree(b,p.x,p.y,p.z,p.scale);
 // Capture only scalar placement records. No Batch or buffer geometry is retained.
 const occupiedRecords=(b.occupiedWings||[]).map(q=>({...q})),signAnchor=b.signAnchor;
 const finishLit=group=>{group.traverse(o=>{if(o.isMesh&&o.name.endsWith('-surface')&&o.material.name)o.name=o.name.replace(/surface$/,o.material.name.replace(/^CF25-35 /,'').replace(/\W+/g,'-'));if(o.material===materials.glazing){o.material=clearFacade;o.castShadow=false;}if(o.isMesh&&LIT.has(o.material)){o.onBeforeRender=syncLuminaires;if(o.material!==litFloor)o.castShadow=false;}});return group;};
 const createNearDetail=()=>finishLit(nearOccupancy(f,occupiedRecords));
 const root=b.finish(`CF-${id}-reference-architecture`);
 if(deferDetails)root.userData.createNearDetail=createNearDetail;else root.add(createNearDetail());
 finishLit(root);
 if(signAnchor)root.userData.signAnchor=signAnchor;
 root.userData.referenceSource=`CF-${id}_Facility_Infographic.png`;root.userData.referenceReconstruction=true;root.userData.floorProgramUnchanged=true;
 if(id===25)root.userData.areaCaveat='CF-25 area and siting are not recovered in the source; massing is reference-proportioned, not measured.';
 return root;
}
