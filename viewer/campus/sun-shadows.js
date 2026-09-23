import {MathUtils,Vector3} from 'three';

// Shadow extents come from a fixed quarter-octave ladder. A continuously
// varying extent changes the texel size (and therefore every shadow edge)
// on each zoom step; a ladder keeps edges still between steps.
export const SHADOW_EXTENT_MIN=64,SHADOW_EXTENT_MAX=704;
export function shadowExtentFor(viewDistance){
 const wanted=MathUtils.clamp((Number.isFinite(viewDistance)?viewDistance:SHADOW_EXTENT_MAX)*.8,SHADOW_EXTENT_MIN,SHADOW_EXTENT_MAX);
 const step=Math.ceil(Math.log2(wanted/SHADOW_EXTENT_MIN)*4-1e-9)/4;
 return Math.min(SHADOW_EXTENT_MAX,Math.round(SHADOW_EXTENT_MIN*2**step));
}

// One shadow map covers the campus at aerial distance and concentrates its
// existing texels around the viewed facility at street distance.
export function createSunShadowFitter(light){
 const right=new Vector3(),up=new Vector3(),center=new Vector3(),worldUp=new Vector3(0,1,0);
 return (target,viewDistance,direction)=>{
  const extent=shadowExtentFor(viewDistance);
  const texel=2*extent/light.shadow.mapSize.x;
  right.crossVectors(worldUp,direction).normalize();up.crossVectors(direction,right).normalize();
  // Snap the center in light space to reduce shadow swimming while orbiting.
  center.copy(target)
   .addScaledVector(right,Math.round(target.dot(right)/texel)*texel-target.dot(right))
   .addScaledVector(up,Math.round(target.dot(up)/texel)*texel-target.dot(up));
  light.target.position.copy(center);light.position.copy(center).addScaledVector(direction,1400);
  const camera=light.shadow.camera;
  if(camera.right!==extent){camera.left=camera.bottom=-extent;camera.right=camera.top=extent;camera.updateProjectionMatrix();}
  // A low dusk sun strikes the ground and facades at grazing angles, where a
  // fixed offset leaves acne stripes; raise the normal offset only then.
  const grazing=MathUtils.clamp(1-direction.y/.5,0,1);
  light.shadow.normalBias=MathUtils.clamp(texel*(.3+.6*grazing),.018,.5);
  return {extent,texel};
 };
}
