import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {paintFinish} from './surface-textures.js';
import {FINISHES} from './interior-kit.js';

function surface(scene,name,base){
 const size=name==='display'?1024:384;
 const tex=new DynamicTexture(name+'-surface',{width:size,height:size},scene,true);
 paintFinish(tex.getContext(),name,base,size);
 tex.update();tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;tex.anisotropicFilteringLevel=8;return tex;
}
export function finishTexture(scene,name){const p=FINISHES[name]||FINISHES.stone;return surface(scene,name,p.color||0xffffff);}
export function createInteriorMaterials(scene){const result={};for(const [name,p] of Object.entries(FINISHES)){
 const m=new PBRMaterial(name,scene);m.albedoColor=Color3.White();
 // Surface pixels already contain the finish color.
 m.metallic=p.metalness||0;m.roughness=Math.max(.08,p.roughness??.5);m.environmentIntensity=name==='glass'?1.65:1.05;m.specularIntensity=name==='fabric'||name==='soil'?0.25:1;
 const tex=surface(scene,name,p.color||0xffffff);m.albedoTexture=tex;m.albedoTexture.uScale=name==='display'?1:name==='oak'?3:2;m.albedoTexture.vScale=name==='display'?1:name==='oak'?8:2;
 if(p.emissive){m.emissiveColor=Color3.FromInts((p.emissive>>16)&255,(p.emissive>>8)&255,p.emissive&255).scale(p.emissiveIntensity||1);}
 if(name==='leaf')m.backFaceCulling=false;
 if(name==='glass'){m.alpha=Math.min(.32,p.opacity||.2);m.backFaceCulling=false;m.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;m.indexOfRefraction=1.5;m.microSurface=.96;}
 if(name==='display'){m.emissiveTexture=tex;m.emissiveColor=new Color3(.5,.58,.62);m.roughness=.23;}
 if(name==='brass'){m.metallic=.9;m.roughness=.2;}if(name==='steel'){m.metallic=.92;m.roughness=.22;}if(name==='graphite'){m.metallic=.58;m.roughness=.3;}
 result[name]=m;
 }return result;}
