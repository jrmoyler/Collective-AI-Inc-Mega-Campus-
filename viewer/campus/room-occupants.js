// Furniture-anchored, adult-scale posed occupants. These are modeled people,
// not photographs or a claim of photoreal character acceptance.
export function seatedOccupant(k,seat,index=0){
 const start=k.parts.length,skin=['skinLight','skinMedium','skinDark'][index%3],shirt=index%2?'shirtBlue':'shirtIvory';
 const s=(n,m,x,y,z,a,b,c)=>k.sphere('occupant '+n,m,x,y,z,a,b,c);
 const limb=(n,m,a,b,r)=>{k.bar('occupant '+n,m,a,b,r);s(n+' joint',m,...a,r,r,r);s(n+' end',m,...b,r,r,r);};
 // Local chair origin is its seat centre; the sitter faces negative local Z.
 s('trousers seat','clothNavy',0,.60,0,.18,.13,.17);
 s('shirt torso',shirt,0,.96,.015,.205,.30,.12);
 s('shirt waist',shirt,0,.74,-.01,.17,.12,.12);
 k.cylinder('occupant shirt collar',shirt,0,1.24,.0,.074,.038,.078);
 k.cylinder('occupant neck',skin,0,1.285,0,.059,.12,.055);
 s('head',skin,0,1.435,-.018,.091,.123,.090);
 s('jaw',skin,0,1.375,-.044,.073,.070,.064);
 s('nose',skin,0,1.438,-.111,.018,.025,.028);
 for(const side of [-1,1]){
  s('ear',skin,side*.092,1.436,-.005,.017,.029,.017);
  s('eye socket',skin,side*.033,1.455,-.094,.027,.014,.009);
  s('eye','porcelain',side*.033,1.456,-.101,.012,.005,.0035);
  s('iris','hair',side*.033,1.456,-.104,.004,.004,.002);
  limb('eyebrow','hair',[side*.018,1.473,-.101],[side*.050,1.473,-.093],.003);
  const hip=[side*.105,.61,-.045],knee=[side*.135,.48,-.39],ankle=[side*.14,.12,-.40];
  limb('upper trouser leg','clothNavy',hip,knee,.089);limb('lower trouser leg','clothNavy',knee,ankle,.067);
  s('shoe','rubber',side*.14,.075,-.48,.085,.062,.16);
  const shoulder=[side*.185,1.13,.0],elbow=[side*.25,.84,-.045],wrist=[side*.14,.72,-.32];
  limb('sleeve',shirt,shoulder,elbow,.069);limb('forearm',shirt,elbow,wrist,.047);
  s('hand',skin,side*.13,.70,-.36,.043,.027,.070);
  for(let finger=0;finger<4;finger++)limb('finger',skin,[side*.13+(finger-1.5)*.016,.696,-.38],[side*.13+(finger-1.5)*.016,.688,-.424],.006);
 }
 // Hair cap wraps the crown, with an open face and a shaped hairline.
 s('hair crown','hair',0,1.51,.002,.094,.066,.089);
 s('hair back','hair',0,1.458,.048,.088,.087,.046);
 k.bar('occupant mouth','skinLip',[-.023,1.390,-.105],[.023,1.390,-.105],.0025);
 // Euler Y alone folds pi rotations into X/Z. Recover the actual forward axis.
 const q=seat.quaternion,yaw=Math.atan2(2*(q.x*q.z+q.w*q.y),1-2*(q.x*q.x+q.y*q.y)),x=seat.position.x,z=seat.position.z,dy=seat.position.y-.49;
 for(const m of k.parts.slice(start)){
  const px=m.position.x,pz=m.position.z;
  m.position.set(x+px*Math.cos(yaw)+pz*Math.sin(yaw),m.position.y+dy,z-px*Math.sin(yaw)+pz*Math.cos(yaw));m.rotateOnWorldAxis({x:0,y:1,z:0},yaw);
 }
 return {seat:[x,seat.position.y,z],yaw,pose:'seated, hands on lap',inferred:true};
}
export function furnishOccupants(k,furniture,r){
 // Read actual manufactured seats AFTER workplace clusters have been rotated.
 // No ordinal coordinate scattering and no occupants added to industrial plant.
 const seats=furniture.parts.filter(p=>p.name==='upholstered seat'||p.name==='auditorium upholstered seat');
 const chosen=seats.filter(s=>Math.abs(s.position.x-r.x)<r.w/2-.55&&Math.abs(s.position.z-r.z)<r.d/2-.70).filter((_,i)=>i%3===0).slice(0,3);
 return chosen.map((seat,i)=>seatedOccupant(k,seat,(r.fitout?.facility||0)+(r.fitout?.level||0)+i));
}
