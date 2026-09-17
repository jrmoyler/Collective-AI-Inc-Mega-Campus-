import {MathUtils,Vector3} from 'three';

// One shadow map covers the campus at aerial distance and concentrates its
// existing texels around the viewed facility at street distance.
export function createSunShadowFitter(light){
 const right=new Vector3(),up=new Vector3(),center=new Vector3(),worldUp=new Vector3(0,1,0);
 return (target,viewDistance,direction)=>{
  const extent=MathUtils.clamp(Math.ceil(viewDistance*.8/8)*8,64,704);
  const texel=2*extent/light.shadow.mapSize.x;
  right.crossVectors(worldUp,direction).normalize();up.crossVectors(direction,right).normalize();
  // Snap the center in light space to reduce shadow swimming while orbiting.
  center.copy(target)
   .addScaledVector(right,Math.round(target.dot(right)/texel)*texel-target.dot(right))
   .addScaledVector(up,Math.round(target.dot(up)/texel)*texel-target.dot(up));
  light.target.position.copy(center);light.position.copy(center).addScaledVector(direction,1400);
  const camera=light.shadow.camera;
  if(camera.right!==extent){camera.left=camera.bottom=-extent;camera.right=camera.top=extent;camera.updateProjectionMatrix();}
  light.shadow.normalBias=MathUtils.clamp(texel*.3,.018,.3);
  return {extent,texel};
 };
}
