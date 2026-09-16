// Engine hardware scaling is the reciprocal of rendered pixels per CSS pixel.
export function interiorPixelRatio(dpr,quality='balanced'){
 const density=Number.isFinite(dpr)&&dpr>0?dpr:1;
 return Math.max(1,Math.min(density,quality==='high'?2:1.5));
}
export function exteriorPixelRatio(dpr,quality='balanced',mobile=false){return Math.max(1,Math.min(dpr||1,quality==='high'?2:mobile?1.5:1.75));}
