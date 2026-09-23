// Depth-buffer precision for the exterior camera.
//
// A perspective depth buffer spends its precision near the near plane. With the
// previous fixed 0.5 m near plane a 24-bit buffer resolved only ~0.17 m at the
// 1.2 km aerial, so every facade layer offset by a few centimetres (mullions,
// floor bands, copings, glazing on slab edges) flickered while orbiting.
// Two complementary measures are used:
//  1. reversed float depth (EXT_clip_control + DEPTH_COMPONENT32F) wherever the
//     scene renders through the HDR composer, and
//  2. a near plane that follows the orbit distance, which also protects the
//     default 24-bit framebuffer used on mobile and after an effects fallback.

export const NEAR_MIN=.4,NEAR_MAX=6;

// Nothing can be closer to an orbiting camera than a fraction of its orbit
// distance or its height above the terrain; clamp so street views keep 0.4 m.
export function nearPlaneFor(orbitDistance,cameraHeight){
 const byDistance=Number.isFinite(orbitDistance)?orbitDistance*.004:NEAR_MIN;
 const byHeight=Number.isFinite(cameraHeight)?Math.max(0,cameraHeight)*.1:NEAR_MIN;
 return Math.min(NEAR_MAX,Math.max(NEAR_MIN,Math.min(byDistance,byHeight)));
}

// Depth step (metres) of a fixed-point buffer at a view distance.
export function fixedDepthStep(distance,near,bits=24){return distance*distance/(near*2**bits);}

// Updates the camera only when the near plane changes by more than 3%, so the
// projection is not rebuilt every frame and does not visibly breathe.
export function createDepthRange(){
 let current=null;
 return (camera,orbitDistance)=>{
  const next=nearPlaneFor(orbitDistance,camera.position.y);
  if(current!==null&&Math.abs(next-current)/current<.03)return false;
  current=next;camera.near=next;camera.updateProjectionMatrix();return true;
 };
}

// three's Sky pins the dome to the far plane with z=w. Under a reversed depth
// buffer z=w is the NEAR plane, so place it at z=0 (the reversed far plane).
export function skyDepthVertexShader(source){
 const pinned='gl_Position.z = gl_Position.w;';
 if(!source.includes(pinned)||source.includes('USE_REVERSED_DEPTH_BUFFER'))return source;
 return source.replace(pinned,'\n#ifdef USE_REVERSED_DEPTH_BUFFER\n\tgl_Position.z = 0.0;\n#else\n\tgl_Position.z = gl_Position.w;\n#endif\n');
}
