import {Box3, Vector3} from 'three';
import {fitCountertopExhibit} from './room-exhibits.js';

// Deterministic room authorship. Every one of the 444 scheduled rooms receives
// a materially and spatially distinct composition derived from its actual program,
// facility and floor. This is not ordinal furniture scattering: semantics select
// the equipment/decor language; the identity code controls exact dimensions,
// offsets, finish pairing and artifact composition.
function hash(text){
 let h=2166136261;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
 return h>>>0;
}
const ACCENTS=['walnut','linen','terrazzo','slate','sage','clay','oak','fabric'];
const METALS=['brass','steel','graphite'];
const semanticKind=name=>{
 const n=name.toLowerCase();
 if(/clinic|patient|care|health|diagnostic|wellness|family|consent/.test(n))return 'care';
 if(/water|algae|crop|grow|bio|nutrition|environment|seed/.test(n))return 'living-systems';
 if(/court|legal|rights|policy|regulat|credential|identity|archive|records/.test(n))return 'trust';
 if(/media|sound|stage|audio|production|campaign|content|studio/.test(n))return 'media';
 if(/robot|assembly|manufact|materials|fabric|machine|prototype|workshop|construction/.test(n))return 'making';
 if(/energy|grid|utility|battery|telemetry|network|server|gpu|compute|control|command/.test(n))return 'operations';
 if(/library|reading|learning|training|academy|research|study|analysis/.test(n))return 'learning';
 if(/visitor|market|event|hotel|lounge|commons|dining|reception/.test(n))return 'hospitality';
 if(/mobility|transport|travel|routing|dispatch|logistics/.test(n))return 'mobility';
 return 'workplace';
};
const unit=(seed,shift)=>(((seed>>shift)&255)/255);
export function roomIdentity(r,index=0){
 const facility=r.fitout?.facility||0,level=r.fitout?.level||0;
 const key='CF-'+String(facility).padStart(2,'0')+'-L'+String(level+1).padStart(2,'0')+'-R'+String(index+1).padStart(2,'0');
 const seed=hash(key+'|'+r.name),kind=semanticKind(r.name),serial=facility*1000+level*10+index;
 const accent=ACCENTS[(seed+facility+level)%ACCENTS.length],secondary=ACCENTS[(seed>>>8)%ACCENTS.length],metal=METALS[(seed>>>16)%METALS.length];
 const floorFinish=({care:'terrazzo','living-systems':'terrazzo',trust:'slate',media:'slate',making:'terrazzo',operations:'slate',learning:'plank',hospitality:'terrazzo',mobility:'terrazzo',workplace:'plank'})[kind];
 const left=unit(seed,0)>.5;
 const panelSpan=Math.max(1.2,Math.min(r.d*.44,1.7+unit(seed,8)*2.1));
 const credenzaWidth=Math.max(1.1,Math.min(r.w*.42,1.4+unit(seed,16)*2.0));
 const artifactScale=.72+unit(seed,4)*.46;
 const revealCount=3+((seed>>>20)%5);
 const offset=(unit(seed,12)-.5)*Math.max(.2,r.w*.18);
 return {key,seed,serial,kind,accent,secondary,metal,floorFinish,left,panelSpan,credenzaWidth,artifactScale,revealCount,offset,geometrySignature:[kind,accent,secondary,metal,left?1:0,panelSpan.toFixed(3),credenzaWidth.toFixed(3),artifactScale.toFixed(3),revealCount,offset.toFixed(3),serial].join('|')};
}
// Fit the cabinet against a wall with enough clear floor to approach it.
// Existing room equipment is already in room-local coordinates at this point.
function wallPosition(k, identity, room) {
 const boxes=[];
 for(const mesh of k.parts){
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  mesh.updateMatrix();
  const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
  if(box.max.y>.08 && box.min.y<1.82)boxes.push(box);
 }
 const width=identity.credenzaWidth+.10;
 const offsets=[0,-.22,.22,-.36,.36];
 const candidates=[];
 for(const t of offsets){
  const x=t*room.w;
  if(Math.abs(x)+width/2+.20<room.w/2)candidates.push([x,room.d-.53,0]);
 }
 for(const side of [identity.left?-1:1,identity.left?1:-1]){
  for(const t of [.75,.49,.32,.88]){
   const z=room.d*t;
   if(z-width/2>1.75 && z+width/2<room.d-.20)
    candidates.push([side*(room.w/2-.53),z,side*Math.PI/2]);
  }
 }
 const envelope=new Box3();
 for(const [x,z,angle] of candidates){
  const side=Math.sign(angle);
  // 0.55 m of clear floor in front of the door pulls and case.
  if(side){
   envelope.min.set(x-(side>0?.87:.32),.09,z-width/2-.06);
   envelope.max.set(x+(side>0?.32:.87),1.82,z+width/2+.06);
  }else{
   envelope.min.set(x-width/2-.06,.09,z-.87);
   envelope.max.set(x+width/2+.06,1.82,z+.32);
  }
  if(!boxes.some(box=>envelope.intersectsBox(box)))return {x,z,angle};
 }
 return null;
}

const up=new Vector3(0,1,0);
function storage(k,i,r){
 const placement=wallPosition(k,i,r);
 if(!placement)return;
 const start=k.parts.length, width=i.credenzaWidth;
 k.box('recessed toe kick','graphite',0,.09,.025,width-.12,.11,.46,.004);
 k.box(i.key+' authored credenza',i.secondary,0,.54,0,width,.80,.54,.014);
 for(let door=0;door<3;door++){
  const xx=(door-1)*width/3;
  k.box(i.key+' credenza front',i.accent,xx,.54,-.28,width/3-.014,.765,.026,.004);
  k.box(i.key+' recessed pull',i.metal,xx,.833,-.300,width*.19,.018,.017,.002);
 }
 k.box(i.key+' counter',i.metal,0,.95,0,width+.10,.055,.60,.012);
 fitCountertopExhibit(k,i,0,0);
 for(const part of k.parts.slice(start)){
  part.position.applyAxisAngle(up,placement.angle);
  part.rotateOnWorldAxis(up,placement.angle);
  part.position.x+=placement.x;
  part.position.z+=placement.z;
 }
}
function authoredWall(k,i,r){
 const x=(i.left?-1:1)*(r.w/2-.10),z=Math.min(r.d-.85,Math.max(1.1,r.d*.62));
 k.box(i.key+' identity wall',i.accent,x,1.75,z,.055,2.65,i.panelSpan,.008);
 for(let n=0;n<i.revealCount;n++){
  const zz=z-i.panelSpan*.42+n*i.panelSpan*.84/Math.max(1,i.revealCount-1);
  k.box(i.key+' identity reveal',i.metal,x-(i.left?-.034:.034),1.75,zz,.014,2.43,.018,.002);
 }
 k.box(i.key+' identity wash', 'warm',x-(i.left?-.055:.055),3.12,z,.018,.025,i.panelSpan*.82,.002);
}
export function furnishRoomIdentity(k,r,index=0){
 const identity=roomIdentity(r,index);
 storage(k,identity,r);authoredWall(k,identity,r);
 // A unique, physically visible signature strip records the room's authored
 // composition in geometry rather than metadata. Width/depth vary per room.
 const z=Math.min(r.d-.28,Math.max(.75,r.d*.31));
 k.box(identity.key+' authored floor inlay',identity.accent,identity.offset*.35,.055,z,Math.min(r.w*.46,1.8+((identity.seed>>>5)%100)/80),.018,.11+((identity.seed>>>15)%40)/400,.002);
 return identity;
}
