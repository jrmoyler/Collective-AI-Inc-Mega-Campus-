// CC0 MakeHuman meshes, fitted clothing and baked adult seated poses.
import {occupantParts,OCCUPANT_VARIANTS} from './occupant-assets.js';

export function seatedOccupant(k,seat,index=0,style=null){
 const q=seat.quaternion,baseYaw=Math.atan2(2*(q.x*q.z+q.w*q.y),1-2*(q.x*q.x+q.y*q.y));
 const yaw=baseYaw+(style?.yaw||0),x=seat.position.x+(style?.x||0),z=seat.position.z+(style?.z||0),dy=seat.position.y-.49;
 const parts=occupantParts(index);
 for(const m of parts){m.position.set(x,dy,z);m.rotation.y=yaw;k.parts.push(m);}
 return {seat:[seat.position.x,seat.position.y,seat.position.z],yaw,pose:style?'seated, naturally offset toward task':'seated, hands on lap',asset:OCCUPANT_VARIANTS[((index%3)+3)%3],inferred:true};
}
function personalEffects(k,record,seed,index){
 const a=record.yaw,side=index%2?-1:1,x=record.seat[0]+Math.cos(a)*.34*side,z=record.seat[2]-Math.sin(a)*.34*side,mode=(seed+index)%3;
 if(mode===0){
  k.box('personal satchel','leather',x,.18,z,.38,.34,.16,.055,a*.2);
  k.box('satchel clasp','brass',x,.20,z-.09,.08,.06,.018,.012,a*.2);
 }else if(mode===1){
  k.cylinder('reusable water bottle','steel',x,.15,z,.045,.29,.038);
  k.cylinder('bottle cap','graphite',x,.305,z,.037,.018,.032);
 }else{
  k.box('document folio','walnut',x,.055,z,.31,.045,.42,.018,a*.35);
  k.box('folio band','brass',x,.081,z,.26,.012,.18,.006,a*.35);
 }
}
export function furnishOccupants(k,furniture,r,identity=null){
 // Read actual manufactured seats AFTER workplace clusters have been rotated.
 // No ordinal coordinate scattering and no occupants added to industrial plant.
 const seats=furniture.parts.filter(p=>p.name==='upholstered seat'||p.name==='auditorium upholstered seat');
 const eligible=seats.filter(s=>Math.abs(s.position.x-r.x)<r.w/2-.55&&Math.abs(s.position.z-r.z)<r.d/2-.70);
 let chosen;
 if(identity){
  const stride=2+((identity.seed>>>6)%3),offset=(identity.seed>>>11)%stride;
  chosen=eligible.filter((_,i)=>i%stride===offset).slice(0,3);
  if(!chosen.length&&eligible.length)chosen=[eligible[(identity.seed>>>15)%eligible.length]];
 }else chosen=eligible.filter((_,i)=>i%3===0).slice(0,3);
 const records=chosen.map((seat,i)=>{
  const style=identity?{yaw:((((identity.seed>>>(i*3))&7)-3)*.018),x:((((identity.seed>>>(9+i*2))&3)-1.5)*.012),z:((((identity.seed>>>(15+i*2))&3)-1.5)*.012)}:null;
  const record=seatedOccupant(k,seat,(r.fitout?.facility||0)+(r.fitout?.level||0)+i,style);
  if(identity)personalEffects(k,record,identity.seed,i);
  return record;
 });
 return records;
}
