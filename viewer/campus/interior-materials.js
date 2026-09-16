import {paintSurface} from './surface-textures.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {FINISHES} from './interior-kit.js';
// Independent material channels, deterministic surface detail; never reference-image scenery.
export function finishTexture(scene,name){
 const size=name==='display'?1024:512;const tex=new DynamicTexture(name+'-surface',{width:size,height:size},scene,true);paintSurface(tex.getContext(),name);
 tex.update();tex.anisotropicFilteringLevel=4;return tex;
}
export function createInteriorMaterials(scene){const result={};for(const [name,p] of Object.entries(FINISHES)){
 const m=new PBRMaterial(name,scene);m.albedoColor=Color3.FromInts((p.color>>16)&255,(p.color>>8)&255,p.color&255);m.metallic=p.metalness||0;m.roughness=p.roughness;m.environmentIntensity=.55;
 if(p.emissive){m.emissiveColor=Color3.FromInts((p.emissive>>16)&255,(p.emissive>>8)&255,p.emissive&255).scale(p.emissiveIntensity||1);}
 if(name==='glass'){m.alpha=p.opacity;m.backFaceCulling=false;m.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;}
 if(['stone','oak','fabric','display'].includes(name)){const tex=finishTexture(scene,name);m.albedoTexture=tex;if(name==='display'){m.emissiveTexture=tex;m.emissiveColor=new Color3(.35,.35,.35);}}
 result[name]=m;
 }return result;}
