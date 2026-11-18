// Shader-level physical corrections shared by every facility envelope.
// Both patches are pure material work: no geometry, no extra draw calls.
//
// 1. Architectural glass. three's transparent standard material multiplies its
//    whole radiance, specular included, by opacity, so a 30 %-opaque pane also
//    loses 70 % of its sky reflection and curtain walls read as flat tinted
//    film. Real glazing transmits the background and adds its Fresnel
//    reflection on top. The patch keeps the tinted body at its authored
//    opacity, adds the specular term un-attenuated and raises coverage by the
//    reflected energy (reflected light is not also transmitted). Glass never
//    emits light.
// 2. Occupancy variance. Lit interior washes behind the glazing were a single
//    uniform luminance, so at dusk every bay of every floor glowed identically.
//    A world-space cell hash (two structural bays wide, one storey tall) gives
//    each room its own state: dark, dimmed, lit or task-bright, with a small
//    share of cooler 4000 K office light. Daylight emission is already near
//    zero, so the variance only appears where interiors are actually lit.
import * as T from 'three';

export const GLASS_REFLECTANCE_GAIN=2;
export const OCCUPANCY_CELL=[6.4,4.2];
// Cumulative share and relative luminaire output per room state.
export const OCCUPANCY_STATES=[[.16,.06],[.42,.42],[.86,1],[1,1.32]];

// Material.clone() copies userData but not onBeforeCompile, so patch state is
// tracked by identity: a cloned glass must be patched again on its own.
const patched=new WeakMap();
export const archPatchesOf=material=>patched.get(material)||[];
function chain(material,key,patch){
 const prior=material.onBeforeCompile;
 const priorKey=material.customProgramCacheKey;
 const own=Object.prototype.hasOwnProperty.call(material,'onBeforeCompile');
 material.onBeforeCompile=(shader,renderer)=>{if(own)prior.call(material,shader,renderer);patch(shader);};
 material.customProgramCacheKey=()=>(own?priorKey.call(material):'')+'|'+key;
 patched.set(material,[...archPatchesOf(material),key.replace(/[\d.x]+$/,'')]);
 material.needsUpdate=true;
 return material;
}

export function architecturalGlass(material,{reflectance=GLASS_REFLECTANCE_GAIN,roughness=Math.min(material.roughness??.06,.06)}={}){
 if(archPatchesOf(material).includes('glass'))return material;
 // Float-glass is a dielectric: F0 = 0.04 comes from the BRDF, never metalness.
 material.metalness=0;material.roughness=roughness;
 if(material.emissive)material.emissive.setRGB(0,0,0);
 return chain(material,'glass'+reflectance,shader=>{
  shader.uniforms.archReflectance={value:reflectance};
  shader.fragmentShader='uniform float archReflectance;\n'+shader.fragmentShader
   .replace('vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;',
    'vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular * archReflectance;')
   .replace('#include <opaque_fragment>',`#include <opaque_fragment>
	{
		float archBody = diffuseColor.a;
		float archReflected = clamp( dot( totalSpecular, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.0, 1.0 );
		float archCover = clamp( archBody + ( 1.0 - archBody ) * archReflected * 0.7, archBody, 1.0 );
		gl_FragColor = vec4( ( totalDiffuse * archBody + totalSpecular + totalEmissiveRadiance * archBody ) / max( archCover, 1e-3 ), archCover );
	}`);
 });
}

// Deterministic room state for a world position; mirrors the GLSL below so
// tests and offline review can predict which cells are lit.
export function occupancyFactor(x,y,z,cell=OCCUPANCY_CELL){
 const cx=Math.floor(x/cell[0]),cy=Math.floor(y/cell[1]),cz=Math.floor(z/cell[0]);
 const h=fract(Math.sin(cx*127.1+cy*311.7+cz*74.7)*43758.5453);
 for(const [share,level] of OCCUPANCY_STATES)if(h<share)return level;
 return 1;
}
function fract(v){return v-Math.floor(v);}

export function occupancyVariance(material,{cell=OCCUPANCY_CELL}={}){
 if(archPatchesOf(material).includes('occupancy'))return material;
 const s=OCCUPANCY_STATES;
 return chain(material,'occupancy'+cell.join('x'),shader=>{
  shader.uniforms.archCell={value:new T.Vector2(...cell)};
  shader.vertexShader='varying vec3 archWorld;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
	{
		vec4 archP = vec4( transformed, 1.0 );
		#ifdef USE_INSTANCING
			archP = instanceMatrix * archP;
		#endif
		archWorld = ( modelMatrix * archP ).xyz;
	}`);
  shader.fragmentShader='uniform vec2 archCell;\nvarying vec3 archWorld;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
	{
		vec3 archC = floor( archWorld / vec3( archCell.x, archCell.y, archCell.x ) );
		float archH = fract( sin( archC.x * 127.1 + archC.y * 311.7 + archC.z * 74.7 ) * 43758.5453 );
		float archLevel = archH < ${s[0][0].toFixed(3)} ? ${s[0][1].toFixed(3)} : archH < ${s[1][0].toFixed(3)} ? ${s[1][1].toFixed(3)} : archH < ${s[2][0].toFixed(3)} ? ${s[2][1].toFixed(3)} : ${s[3][1].toFixed(3)};
		float archCool = step( 0.74, fract( archH * 7.13 ) );
		totalEmissiveRadiance *= archLevel * mix( vec3( 1.0 ), vec3( 0.80, 0.93, 1.18 ), archCool );
	}`);
 });
}
