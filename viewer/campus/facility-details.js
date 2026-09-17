import {Box3} from 'three';

// Facades and primary structure stay present at every distance. Small occupied
// details become visible near a facility without paying campus-wide draw cost.
export function configureFacilityDetails(root,{distance=150,hysteresis=25}={}){
 const details=[];
 root.traverse(object=>{if(object.userData.nearDetail===true)details.push(object);});
 const bounds=new Box3().setFromObject(root);
 let visible=true;
 return cameraPosition=>{
  const separation=bounds.distanceToPoint(cameraPosition);
  const next=separation<=(visible?distance+hysteresis:distance);
  if(next&&details.length===0&&root.userData.createNearDetail){
   const detail=root.userData.createNearDetail();
   detail.traverse(object=>{object.userData.facility=root.userData.facility;});
   root.add(detail);details.push(detail);
  }
  if(next!==visible){visible=next;for(const detail of details)detail.visible=visible;}
  // Deferred groups own their merged geometry, while materials are shared.
  // Release buffers once well outside the approach range; the lightweight
  // factory can reconstruct them on return without retaining campus-wide props.
  if(!next&&separation>distance*2.5&&root.userData.createNearDetail&&details.length){
   const geometries=new Set();
   for(const detail of details){detail.traverse(object=>{if(object.geometry)geometries.add(object.geometry);});root.remove(detail);}
   for(const geometry of geometries)geometry.dispose();
   details.length=0;
  }
  return visible&&details.length>0;
 };
}
