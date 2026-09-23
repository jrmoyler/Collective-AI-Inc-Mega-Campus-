import {Box3} from 'three';

// Facades and primary structure stay present at every distance. Small occupied
// details become visible near a facility without paying campus-wide draw cost.
// Transparent layers never write depth, so three orders them by mesh centre.
// Interior partitions and the curtain wall share almost the same centre, which
// made their draw order flip (and the tint pop) while orbiting. From the
// exterior camera, fine detail sits behind the shell: draw it first, always.
export const DETAIL_GLASS_ORDER=1,SHELL_GLASS_ORDER=2;
export function orderTransparentDetail(detail){
 detail.traverse(object=>{if(object.isMesh&&[].concat(object.material).some(m=>m?.transparent))object.renderOrder=DETAIL_GLASS_ORDER;});
 return detail;
}
export function configureFacilityDetails(root,{distance=150,hysteresis=25,onCreate=null}={}){
 const details=[];
 root.traverse(object=>{if(object.userData.nearDetail===true)details.push(object);});
 const bounds=new Box3().setFromObject(root);
 let visible=true;
 return cameraPosition=>{
  const separation=bounds.distanceToPoint(cameraPosition);
  const next=separation<=(visible?distance+hysteresis:distance);
  if(next&&details.length===0&&root.userData.createNearDetail){
   const detail=root.userData.createNearDetail();
   detail.traverse(object=>{object.userData.facility=root.userData.facility;});orderTransparentDetail(detail);onCreate?.(detail);
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
