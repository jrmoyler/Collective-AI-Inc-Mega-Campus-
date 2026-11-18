// Engine hardware scaling is the reciprocal of rendered pixels per CSS pixel.
export function interiorPixelRatio(dpr,quality='balanced'){
 const density=Number.isFinite(dpr)&&dpr>0?dpr:1;
 return Math.max(1,Math.min(density,quality==='high'?2:1.5));
}
export function exteriorPixelRatio(dpr,quality='balanced',mobile=false){return Math.max(1,Math.min(dpr||1,quality==='high'?2:mobile?1.5:1.75));}

// Exterior lighting/post budget per quality level. Shadow resolution and the
// optional anti-aliasing fallback are the only per-frame costs that scale with
// quality; the aerial-perspective fog and grade are a few ALU per pixel.
// Mobile keeps the canvas MSAA path without a composer (see main.js), so only
// the shadow map size applies there.
export function renderProfile(quality='balanced',mobile=false,{maxTextureSize=4096}={}){
 const high=quality==='high';
 const wanted=mobile?(high?2048:1024):(high?4096:2048);
 return {
  shadowMapSize:Math.max(512,Math.min(wanted,maxTextureSize||wanted)),
  // World-space penumbra (m) for the contact-hardening-like PCF radius.
  shadowPenumbra:high?.32:.26,
  shadowRadiusMax:high?2.5:mobile?1.5:2,
  grade:true,
  // FXAA only runs when the HDR target could not get MSAA samples.
  fxaaFallback:!mobile,
 };
}
