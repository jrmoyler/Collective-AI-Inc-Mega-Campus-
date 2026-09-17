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
// Derive restrained tangent-space relief from the same grain as the albedo.
// The shared UV scale prevents pores and timber grain changing size between objects.
function finishNormal(scene,name,albedo){
 const size=albedo.getSize().width,source=albedo.getContext().getImageData(0,0,size,size).data;
 const tex=new DynamicTexture(name+'-micro-normal',{width:size,height:size},scene,true);
 const ctx=tex.getContext(),pixels=ctx.createImageData(size,size);
 const height=(x,y)=>{const i=(((y+size)%size)*size+(x+size)%size)*4;return (source[i]+source[i+1]+source[i+2])/765;};
 const strength=name==='fabric'?2.4:name==='oak'?1.3:.7;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(height(x-1,y)-height(x+1,y))*strength,dy=(height(x,y-1)-height(x,y+1))*strength;
  const length=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  pixels.data[i]=(dx/length*.5+.5)*255;pixels.data[i+1]=(dy/length*.5+.5)*255;
  pixels.data[i+2]=(1/length*.5+.5)*255;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);tex.update();tex.gammaSpace=false;
 tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;tex.uScale=albedo.uScale;tex.vScale=albedo.vScale;
 tex.anisotropicFilteringLevel=8;return tex;
}
export function finishTexture(scene,name){const p=FINISHES[name]||FINISHES.stone;return surface(scene,name,p.color||0xffffff);}
export function createInteriorMaterials(scene){const result={};for(const [name,p] of Object.entries(FINISHES)){
 const m=new PBRMaterial(name,scene);m.albedoColor=Color3.White();
 // Surface pixels already contain the finish color.
 m.metallic=p.metalness||0;m.roughness=Math.max(.08,p.roughness??.5);m.environmentIntensity=name==='glass'?1.65:1.05;m.specularIntensity=name==='fabric'||name==='soil'?0.25:1;
 const tex=surface(scene,name,p.color||0xffffff);m.albedoTexture=tex;m.albedoTexture.uScale=name==='fabric'||name==='leather'?3:1;m.albedoTexture.vScale=name==='fabric'||name==='leather'?3:1;
 if(['stone','plaster','oak','fabric','leather'].includes(name))m.bumpTexture=finishNormal(scene,name,tex);
 if(p.emissive){m.emissiveColor=Color3.FromInts((p.emissive>>16)&255,(p.emissive>>8)&255,p.emissive&255).scale(p.emissiveIntensity||1);}
 if(name==='leaf')m.backFaceCulling=false;
 if(name==='glass'){m.alpha=Math.min(.32,p.opacity||.2);m.backFaceCulling=false;m.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;m.indexOfRefraction=1.5;m.microSurface=.96;}
 if(name==='display'||name==='stageScreen'){m.emissiveTexture=tex;m.emissiveColor=new Color3(.5,.58,.62);m.roughness=.23;}
 if(name==='brass'){m.metallic=.9;m.roughness=.2;}if(name==='steel'){m.metallic=.92;m.roughness=.22;}if(name==='graphite'){m.metallic=.58;m.roughness=.3;}
 result[name]=m;
 }return result;}
