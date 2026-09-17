// CC0 MakeHuman meshes, fitted clothing and baked adult seated poses.
import {occupantParts,OCCUPANT_VARIANTS} from './occupant-assets.js';
export function seatedOccupant(k,seat,index=0){
 const q=seat.quaternion,yaw=Math.atan2(2*(q.x*q.z+q.w*q.y),1-2*(q.x*q.x+q.y*q.y));
 const x=seat.position.x,z=seat.position.z,dy=seat.position.y-.49;
 const parts=occupantParts(index);
 for(const m of parts){m.position.set(x,dy,z);m.rotation.y=yaw;k.parts.push(m);}
 return {seat:[x,seat.position.y,z],yaw,pose:'seated, hands on lap',asset:OCCUPANT_VARIANTS[((index%3)+3)%3],inferred:true};
}
export function furnishOccupants(k,furniture,r){
 // Read actual manufactured seats AFTER workplace clusters have been rotated.
 // No ordinal coordinate scattering and no occupants added to industrial plant.
 const seats=furniture.parts.filter(p=>p.name==='upholstered seat'||p.name==='auditorium upholstered seat');
 const chosen=seats.filter(s=>Math.abs(s.position.x-r.x)<r.w/2-.55&&Math.abs(s.position.z-r.z)<r.d/2-.70).filter((_,i)=>i%3===0).slice(0,3);
 return chosen.map((seat,i)=>seatedOccupant(k,seat,(r.fitout?.facility||0)+(r.fitout?.level||0)+i));
}
