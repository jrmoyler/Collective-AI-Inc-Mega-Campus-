// Large program rooms (hundreds of square metres) read as empty halls when
// furnished with a single authored cluster. This fills the free floor with
// repeated units of the room's own activity — print benches in a print farm,
// sewing stations in a soft-goods studio, workstation pods in an office,
// process skids in a pilot plant — on a regular grid that keeps the arrival
// zone, the central aisle and every authored fixture clear. Units are kit
// parts, so they merge into the room's existing per-material meshes and add
// vertices, not draw calls. Hidden-room furnishing is inferred (DESIGN.md).
import * as T from 'three';
import {desk,taskChair,sofa} from './interior-kit.js';

const rotateFrom=(k,start,x,z,angle)=>{if(!angle)return;const c=Math.cos(angle),s=Math.sin(angle);for(const m of k.parts.slice(start)){const dx=m.position.x-x,dz=m.position.z-z;m.position.x=x+dx*c+dz*s;m.position.z=z-dx*s+dz*c;m.rotateOnWorldAxis(new T.Vector3(0,1,0),angle);}};
const chair=(k,x,z,angle=0,finish='fabric')=>{const s=k.parts.length;
 k.cushion('upholstered chair seat',finish,x,.46,z,.5,.1,.48);k.cushion('upholstered chair back',finish,x,.78,z+.22,.48,.44,.09,true);
 for(const dx of [-.21,.21])for(const dz of [-.19,.19])k.box('chair leg','oak',x+dx,.2,z+dz,.035,.4,.035,.008);rotateFrom(k,s,x,z,angle);};

// Each unit: footprint half-extents [hx,hz], grid pitch [px,pz] and a builder.
export const UNITS={
 pod:{half:[1.95,1.75],pitch:[4.6,4.4],build(k,x,z){
  for(const dx of [-.92,.92]){desk(k,x+dx,z-.45);const s=k.parts.length;desk(k,x+dx,z+.45);rotateFrom(k,s,x+dx,z+.45,Math.PI);}
  k.box('desk screen divider','fabric',x,1.02,z,3.6,.42,.03,.01);k.box('divider rail','graphite',x,1.235,z,3.6,.015,.04,.004);}},
 printers:{half:[1.4,.95],pitch:[3.8,3.4],build(k,x,z){
  k.box('print bench top','porcelain',x,.76,z,2.5,.06,.82,.015);for(const dx of [-1.15,1.15])k.box('print bench frame','steel',x+dx,.37,z,.05,.72,.72,.01);
  k.box('bench lower shelf','graphite',x,.2,z,2.3,.03,.7,.006);
  for(const dx of [-.8,0,.8]){const xx=x+dx;k.box('enclosed printer chassis','graphite',xx,1.1,z,.58,.62,.56,.02);k.box('printer safety glazing','glass',xx,1.1,z-.285,.48,.48,.01,0);
   k.box('printer build plate','steel',xx,.86,z,.42,.012,.42,.004);k.box('printer touch display','display',xx+.19,1.36,z-.29,.12,.08,.006,.002);k.box('printer status light','blue',xx,1.405,z-.282,.4,.008,.006,0);
   k.cylinder('filament spool','clay',xx,1.48,z+.12,.12,.06,.12,Math.PI/2);k.cylinder('spool hub','graphite',xx,1.48,z+.12,.035,.08,.035,Math.PI/2);}
  for(const dx of [-.6,.6])k.box('cooling cart','graphite',x+dx,.18,z+.02,.5,.08,.5,.01);}},
 sewing:{half:[1.1,1.25],pitch:[3,3.2],build(k,x,z){
  k.box('sewing worktable','oak',x,.76,z,1.8,.07,.9,.015);for(const dx of [-.78,.78])k.box('sewing table support','steel',x+dx,.37,z,.06,.72,.74,.01);
  k.box('sewing machine bed','porcelain',x-.15,.84,z+.05,.5,.08,.24,.02);k.box('sewing machine arm','porcelain',x+.05,1.0,z+.12,.12,.26,.16,.03);k.box('sewing machine head','porcelain',x-.18,1.1,z+.12,.48,.11,.15,.03);
  k.cylinder('thread cone','clay',x+.55,.88,z+.25,.04,.13,.015);k.cylinder('thread cone','sage',x+.65,.88,z+.25,.04,.13,.015);k.box('fabric bolt','linen',x+.5,.83,z-.15,.55,.05,.35,.02);
  taskChair(k,x,z-.85,Math.PI);}},
 racks:{half:[1.85,.6],pitch:[4.4,3.2],build(k,x,z){
  // Selective pallet racking: steel frames, orange beams, cartons on timber pallets.
  for(const dx of [-1.8,0,1.8])for(const dz of [-.5,.5])k.box('pallet rack upright','steel',x+dx,1.3,z+dz,.07,2.6,.07,.006);
  for(const dx of [-1.8,0,1.8])for(const y of [.4,1.3,2.2])k.box('rack frame brace','steel',x+dx,y,z,.03,.03,1,.003);
  for(const y of [.16,1.06,1.96])for(const dz of [-.5,.5])k.box('pallet rack beam','clay',x,y,z+dz,3.6,.1,.05,.006);
  for(const y of [.16,1.06,1.96])for(const dx of [-.9,.9]){
   k.box('timber pallet','oak',x+dx,y+.11,z,1.2,.1,.95,.006);
   const n=(Math.round(x*7+z*3+y*11)%3+3)%3;
   for(let c=0;c<2+n%2;c++)k.box('shipping carton','book',x+dx+(c-(n%2?1:.5))*.38,y+.36,z+(c%2?.12:-.1),.36,.4,.55,.01);
   k.box('rack location label','porcelain',x+dx,y-.02,z-.53,.18,.05,.004,0);
  }
  k.box('rack end protector','clay',x-1.8,.2,z-.62,.12,.4,.08,.01);k.box('rack end protector','clay',x+1.8,.2,z-.62,.12,.4,.08,.01);}},
 skid:{half:[1.5,1.15],pitch:[4.6,4.2],build(k,x,z){
  k.box('process skid base','graphite',x,.08,z,2.8,.16,2.1,.01);k.cylinder('process vessel','steel',x-.6,1.15,z,.55,1.9);k.sphere('vessel dished head','steel',x-.6,2.1,z,.55,.16,.55);
  k.cylinder('vessel support leg','graphite',x-.6,.3,z,.6,.3);k.box('process pump','sage',x+.65,.38,z-.45,.6,.42,.38,.03);k.cylinder('pump motor','graphite',x+.95,.38,z-.45,.14,.3,.14,0,Math.PI/2);
  k.bar('process pipe','steel',[x-.05,1.6,z],[x+.65,1.6,z],.045);k.bar('process pipe','steel',[x+.65,1.6,z],[x+.65,.6,z-.45],.045);k.ring('isolation valve wheel','brass',x+.65,1.25,z-.2,.11,.012,0);
  k.box('local control panel','porcelain',x+.85,1.15,z+.65,.6,.75,.22,.02);k.box('control panel display','display',x+.85,1.25,z+.538,.42,.26,.006,.002);
  for(const dx of [-1.3,1.3])k.box('skid guard rail','brass',x+dx,1,z,.04,.04,2,.004);}},
 dining:{half:[1.2,1.2],pitch:[3.1,3.1],build(k,x,z){
  k.cylinder('dining table top','oak',x,.74,z,.6,.05);k.cylinder('dining table column','graphite',x,.37,z,.06,.7);k.cylinder('dining table foot','graphite',x,.02,z,.32,.03);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;chair(k,x+Math.sin(a)*.86,z+Math.cos(a)*.86,a+Math.PI,'leather');}}},
 lounge:{half:[1.6,1.5],pitch:[4.4,4.2],build(k,x,z){
  sofa(k,x,z+.75);k.box('coffee table top','walnut',x,.4,z-.35,1.2,.04,.6,.015);for(const dx of [-.5,.5])k.box('coffee table leg','brass',x+dx,.19,z-.35,.03,.38,.5,.004);
  chair(k,x-1.1,z-.9,Math.PI*.75,'linen');chair(k,x+1.1,z-.9,-Math.PI*.75,'linen');}},
 classroom:{half:[1.35,.8],pitch:[3.4,2.3],build(k,x,z){
  k.box('training table top','oak',x,.74,z,2.4,.04,.7,.012);for(const dx of [-1.1,1.1])k.box('training table leg','steel',x+dx,.36,z,.05,.72,.6,.008);
  for(const dx of [-.6,.6]){chair(k,x+dx,z-.6,0,'fabric');k.box('closed laptop','graphite',x+dx,.775,z+.05,.32,.018,.22,.006);}}},
 seats:{half:[2.6,.5],pitch:[6,1.15],build(k,x,z){
  k.box('seating row beam','graphite',x,.32,z,5.1,.06,.08,.006);
  for(let i=0;i<9;i++){const xx=x+(i-4)*.56;k.cushion('auditorium seat','fabric',xx,.46,z-.05,.5,.1,.46);k.cushion('auditorium seat back','fabric',xx,.78,z+.22,.5,.5,.08,true);k.box('seat arm','oak',xx+.28,.62,z,.05,.05,.44,.006);}}},
 bays:{half:[1.25,1.4],pitch:[3.6,4],build(k,x,z){
  k.box('treatment couch frame','steel',x,.38,z,.75,.08,1.95,.01);k.cushion('treatment couch pad','leather',x,.5,z,.72,.12,1.92);for(const dz of [-.8,.8])k.box('couch pedestal','graphite',x,.18,z+dz,.3,.36,.3,.01);
  k.box('bedside cabinet','plaster',x+.75,.4,z-.6,.45,.8,.45,.015);k.box('vitals monitor','graphite',x+.75,1.15,z-.6,.36,.26,.08,.015);k.box('vitals display','display',x+.75,1.15,z-.645,.3,.2,.005,.002);
  k.box('privacy curtain track','steel',x,2.6,z,2.3,.03,.03,0);k.box('privacy curtain','linen',x-1.15,1.55,z,.02,2.05,2.4,0);}},
 vitrines:{half:[.9,.9],pitch:[3.6,3.6],build(k,x,z){
  k.box('display plinth','plaster',x,.45,z,1.1,.9,1.1,.02);k.box('plinth reveal','brass',x,.905,z,1.12,.012,1.12,0);k.box('display vitrine','glass',x,1.27,z,1.0,.72,1.0,0);
  k.box('vitrine light lid','graphite',x,1.66,z,1.04,.06,1.04,.01);k.box('vitrine light','warm',x,1.625,z,.8,.008,.8,0);k.sphere('displayed prototype','brass',x,1.07,z,.17,.12,.17);k.box('exhibit label','porcelain',x,.8,z-.556,.4,.12,.004,0);}},
 workbench:{half:[1.25,1.0],pitch:[3.6,3.4],build(k,x,z){
  k.box('workbench top','oak',x,.88,z,2.0,.06,.8,.012);k.box('workbench frame','steel',x,.45,z,1.9,.06,.7,.008);for(const dx of [-.92,.92])for(const dz of [-.33,.33])k.box('workbench leg','steel',x+dx,.43,z+dz,.05,.86,.05,.006);
  k.box('tool pegboard','graphite',x,1.5,z+.38,1.9,1.1,.03,.008);for(let i=0;i<9;i++)k.box('hanging hand tool','steel',x-.8+i*.2,1.45+(i%3)*.15,z+.35,.03,.22-(i%2)*.06,.015,.004);
  k.box('bench vise body','sage',x-.75,.98,z-.3,.18,.13,.2,.015);k.box('bench vise jaw','steel',x-.75,1.0,z-.42,.16,.08,.04,.006);
  k.box('rolling tool chest','clay',x+.55,.5,z-.85,.75,.82,.46,.02);for(let i=0;i<4;i++)k.box('tool drawer pull','steel',x+.55,.3+i*.17,z-1.085,.5,.015,.015,.004);
  k.box('bench task light','warm',x,2.02,z+.2,1.6,.015,.06,.003);k.box('task light housing','graphite',x,2.04,z+.2,1.7,.04,.1,.006);
  taskChair(k,x-.3,z-.75,Math.PI);}},
 meeting:{half:[2.3,1.45],pitch:[5.4,4.4],build(k,x,z){
  k.box('meeting table top','walnut',x,.74,z,3.4,.05,1.2,.02);for(const dx of [-1.2,1.2])k.box('meeting table pedestal','graphite',x+dx,.36,z,.18,.7,.7,.01);
  k.box('table power module','brass',x,.77,z,.5,.012,.12,.004);
  for(const dx of [-1.15,0,1.15])for(const dz of [-1,1])taskChair(k,x+dx,z+dz*.95,dz<0?Math.PI:0);}},
};

// Activity -> repeated unit. Open-floor programs (stages, sprint lanes, the
// accessible-home mock-up) stay open by design.
export function populationUnit(kind,name=''){
 const n=name.toLowerCase();
 if(/\bprint|bioprint|electronics bench/.test(n)||kind==='fabrication')return 'printers';
 if(/machine|tool room|integration|maintenance|drone|vehicle|inspection|hardware|rework|workshop/.test(n)||['industrial','maintenance'].includes(kind))return 'workbench';
 if(kind==='textiles')return 'sewing';
 if(/forum|auditorium|theat/.test(n)||kind==='auditorium')return 'seats';
 if(/storage|inventory|crib|equipment|returns|feedstock/.test(n)||['storage','logistics'].includes(kind))return 'racks';
 if(/pilot|thermal|water|process/.test(n)||kind==='process')return 'skid';
 if(/food hall|dining|cafe/.test(n)||kind==='dining')return 'dining';
 if(/marketplace|gallery|demo hall|exhibit/.test(n)||['retail','demo'].includes(kind))return 'vitrines';
 if(/recovery|clinical|treatment/.test(n)||kind==='clinical')return 'bays';
 if(/training|learning|teaching|classroom/.test(n)||kind==='teaching')return 'classroom';
 if(/review|meeting|collaboration/.test(n)||kind==='meeting')return 'meeting';
 if(/lounge|family|wellness|arrival|quiet|changing/.test(n)||kind==='lounge')return 'lounge';
 if(['stage','performance','accessible-home','studio','servers'].includes(kind))return null;
 return 'pod';
}

// Fill the free floor of a large room (room-local frame: door at z=0, x across).
export function populateLargeRoom(k,r,kind,{minArea=250,maxUnits=16,vertexBudget=180000}={}){
 if(r.fitout?.technical||r.w*r.d<minArea)return 0;
 const id=populationUnit(kind,r.name);if(!id)return 0;
 const unit=UNITS[id],[hx,hz]=unit.half,[px,pz]=unit.pitch;
 const taken=[],box=new T.Box3();
 for(const m of k.parts){if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();m.updateMatrix();box.copy(m.geometry.boundingBox).applyMatrix4(m.matrix);if(box.min.y<2.2)taken.push([box.min.x-.8,box.max.x+.8,box.min.z-.8,box.max.z+.8]);}
 const free=(x0,x1,z0,z1)=>!taken.some(([a,b,c,d])=>x1>a&&x0<b&&z1>c&&z0<d);
 const left=r.x-r.w/2+1.2+hx,right=r.x+r.w/2-1.2-hx,near=r.z-r.d/2+4.2+hz,far=r.z+r.d/2-1.3-hz;
 if(right<left||far<near)return 0;
 const cols=Math.floor((right-left)/px)+1,rows=Math.floor((far-near)/pz)+1;
 const ox=(right-left-(cols-1)*px)/2,oz=(far-near-(rows-1)*pz)/2;
 // Visit cells from the room's centre line outward so a capped count stays balanced.
 const cells=[];for(let a=0;a<cols;a++)for(let b=0;b<rows;b++)cells.push([left+ox+a*px,near+oz+b*pz]);
 cells.sort((p,q)=>Math.abs(p[0]-r.x)+p[1]*.01-(Math.abs(q[0]-r.x)+q[1]*.01));
 let placed=0,vertices=0;
 for(const [x,z] of cells){
  if(placed>=maxUnits)break;
  if(Math.abs(x-r.x)<hx+.9)continue; // central walking aisle from the door
  if(!free(x-hx,x+hx,z-hz,z+hz))continue;
  const start=k.parts.length;unit.build(k,x,z);taken.push([x-hx-.6,x+hx+.6,z-hz-.6,z+hz+.6]);placed++;
  // Mobile memory: stop once the room's added geometry reaches its vertex budget.
  for(const m of k.parts.slice(start))vertices+=m.geometry.attributes.position.count;
  if(vertices>=vertexBudget)break;
 }
 return placed;
}
