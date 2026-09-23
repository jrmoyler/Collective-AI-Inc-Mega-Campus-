import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {paintFinish} from './surface-textures.js';
import {OCCUPANT_MATERIALS} from './occupant-assets.js';
import {FINISHES} from './interior-kit.js';

// Primary architectural surfaces get denser texels at high quality; small parts stay light.
const HERO=new Set(['plank','floorStone','terrazzo','oak','walnut','plaster','stone','slate','fabric','linen','leather']);
function surface(scene,name,base,quality='balanced'){
 const size=name==='display'?1024:quality==='high'&&HERO.has(name)?1024:512;
 const tex=new DynamicTexture(name+'-surface',{width:size,height:size},scene,true);
 paintFinish(tex.getContext(),name,base,size);
 tex.update();tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;tex.anisotropicFilteringLevel=quality==='high'?16:8;return tex;
}
// Derive restrained tangent-space relief from the same grain as the albedo.
// The shared UV scale prevents pores and timber grain changing size between objects.
const RELIEF={fabric:2.6,linen:2.2,leather:1.6,oak:1.2,plank:1.5,walnut:1.2,slate:1.4,plaster:.55,stone:.45,floorStone:.5,terrazzo:.35,sage:.8,clay:.8,rubber:.8,graphite:.25,steel:.18,brass:.18};
const derived=new Map();
// Derived maps are pure functions of the painted albedo: compute once per finish/size.
function derive(kind,name,albedo,compute){
 const size=albedo.getSize().width,key=kind+':'+name+':'+size;
 if(!derived.has(key))derived.set(key,compute(albedo.getContext().getImageData(0,0,size,size).data,size));
 return derived.get(key);
}
function mapTexture(scene,label,albedo,pixels){
 const size=albedo.getSize().width,tex=new DynamicTexture(label,{width:size,height:size},scene,true),ctx=tex.getContext(),image=ctx.createImageData(size,size);
 image.data.set(pixels);ctx.putImageData(image,0,0);tex.update();tex.gammaSpace=false;
 tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;tex.uScale=albedo.uScale;tex.vScale=albedo.vScale;tex.anisotropicFilteringLevel=albedo.anisotropicFilteringLevel;return tex;
}
function finishNormal(scene,name,albedo){
 const pixels=derive('normal',name,albedo,(source,size)=>{
  const out=new Uint8ClampedArray(size*size*4);
  const height=(x,y)=>{const i=(((y+size)%size)*size+(x+size)%size)*4;return (source[i]+source[i+1]+source[i+2])/765;};
  const strength=(RELIEF[name]||.7)*size/384;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const dx=(height(x-1,y)-height(x+1,y))*strength,dy=(height(x,y-1)-height(x,y+1))*strength;
   const length=Math.hypot(dx,dy,1),i=(y*size+x)*4;
   out[i]=(dx/length*.5+.5)*255;out[i+1]=(dy/length*.5+.5)*255;out[i+2]=(1/length*.5+.5)*255;out[i+3]=255;
  }
  return out;
 });
 return mapTexture(scene,name+'-micro-normal',albedo,pixels);
}
// Roughness breakup: darker grain, grout and pores read slightly rougher, so specular
// highlights break across a floor the way real honed stone and lacquered timber do.
function finishRoughness(scene,name,albedo,spread){
 const pixels=derive('roughness',name,albedo,source=>{
  let mean=0;for(let i=0;i<source.length;i+=4)mean+=source[i]+source[i+1]+source[i+2];mean/=source.length/4*765;
  const out=new Uint8ClampedArray(source.length);
  for(let i=0;i<source.length;i+=4){const l=(source[i]+source[i+1]+source[i+2])/765,g=Math.max(0,Math.min(1,.8+(mean-l)*spread));out[i]=255;out[i+1]=g*255;out[i+2]=255;out[i+3]=255;}
  return out;
 });
 return mapTexture(scene,name+'-roughness',albedo,pixels);
}
const BREAKUP={plank:1.6,floorStone:2.2,terrazzo:1.4,stone:1.4,slate:1.2,oak:1.2,walnut:1.2,porcelain:.8,leather:1,graphite:.8,steel:.8,brass:.8};
function contactTexture(scene){
 const size=128,tex=new DynamicTexture('contact-occlusion',{width:size,height:size},scene,true),ctx=tex.getContext(),img=ctx.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=Math.abs((x+.5)/size-.5)*2,dy=Math.abs((y+.5)/size-.5)*2,d=Math.pow(dx**4+dy**4,.25),t=Math.max(0,Math.min(1,(d-.3)/.7)),a=Math.pow(1-t*t*(3-2*t),1.6),i=(y*size+x)*4;
  img.data[i]=img.data[i+1]=img.data[i+2]=0;img.data[i+3]=Math.round(a*255);
 }
 ctx.putImageData(img,0,0);tex.update();tex.hasAlpha=true;tex.wrapU=tex.wrapV=Texture.CLAMP_ADDRESSMODE;return tex;
}
export function finishTexture(scene,name){const p=FINISHES[name]||FINISHES.stone;return surface(scene,name,p.color||0xffffff);}
export function createInteriorMaterials(scene,usedOccupantNames=null,{quality='balanced'}={}){const result={};for(const [name,p] of Object.entries(FINISHES)){
 const m=new PBRMaterial(name,scene);m.albedoColor=Color3.White();
 // Surface pixels already contain the finish color.
 m.metallic=p.metalness||0;m.roughness=Math.max(.06,p.roughness??.5);m.environmentIntensity=1;m.specularIntensity=1;
 const tex=name==='contact'?contactTexture(scene):surface(scene,name,p.color||0xffffff,quality);m.albedoTexture=tex;const tile=name==='fabric'||name==='leather'?3:name==='plank'||name==='floorStone'||name==='terrazzo'?.5:1;m.albedoTexture.uScale=m.albedoTexture.vScale=tile;
 if(RELIEF[name])m.bumpTexture=finishNormal(scene,name,tex);
 if(BREAKUP[name]){
  // The texture green channel multiplies roughness, averaging 0.8 around the authored value.
  m.metallicTexture=finishRoughness(scene,name,tex,BREAKUP[name]);m.useRoughnessFromMetallicTextureGreen=true;m.useMetallnessFromMetallicTextureBlue=true;m.useRoughnessFromMetallicTextureAlpha=false;m.roughness=Math.min(1,m.roughness/.8);
 }
 // Cloth and felt scatter light at grazing angles instead of mirroring it.
 if(['fabric','linen'].includes(name)){m.sheen.isEnabled=true;m.sheen.intensity=.55;m.sheen.color=Color3.FromInts((p.color>>16)&255,(p.color>>8)&255,p.color&255).scale(1.4);m.sheen.roughness=.6;m.environmentIntensity=.7;}
 if(['plank','floorStone','terrazzo','porcelain','walnut'].includes(name)){m.clearCoat.isEnabled=name!=='floorStone';m.clearCoat.intensity=name==='plank'?.55:.4;m.clearCoat.roughness=name==='plank'?.2:.12;}
 if(p.emissive){m.emissiveColor=Color3.FromInts((p.emissive>>16)&255,(p.emissive>>8)&255,p.emissive&255).scale(p.emissiveIntensity||1);}
 if(name==='warm'){m.emissiveColor=new Color3(1,.78,.52).scale(7);m.albedoColor=new Color3(1,.93,.82);m.disableLighting=true;}
 if(name==='blue'){m.emissiveColor=new Color3(.18,.55,.72).scale(1.6);}
 if(name==='leaf'){m.backFaceCulling=false;m.twoSidedLighting=true;m.subSurface.isTranslucencyEnabled=true;m.subSurface.translucencyIntensity=.6;m.subSurface.tintColor=new Color3(.55,.8,.3);}
 if(name==='glass'){
  // Low-iron architectural glazing: nearly clear body, Fresnel reflections preserved over alpha.
  m.alpha=.1;m.backFaceCulling=false;m.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;m.indexOfRefraction=1.52;m.roughness=.04;m.metallic=0;
  m.albedoTexture=null;m.albedoColor=new Color3(.78,.88,.9);m.useRadianceOverAlpha=true;m.useSpecularOverAlpha=true;m.environmentIntensity=1.25;m.separateCullingPass=true;
 }
 if(name==='display'||name==='stageScreen'||name==='instrumentDisplay'){m.emissiveTexture=tex;m.emissiveColor=name==='display'?new Color3(1.1,1.2,1.25):new Color3(.8,.85,.9);m.roughness=.12;m.albedoColor=new Color3(.02,.02,.02);m.albedoTexture=null;}
 if(name==='brass'){m.metallic=.95;m.roughness=.28;m.albedoColor=new Color3(1,.93,.78);}if(name==='steel'){m.metallic=.95;m.roughness=.26;}if(name==='graphite'){m.metallic=.18;m.roughness=.4;}
 if(name==='contact'){
  // Unlit multiply-style footprint: black albedo, alpha = rounded-rect falloff x vertex strength.
  m.unlit=true;m.albedoColor=Color3.Black();m.useAlphaFromAlbedoTexture=true;m.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;
  m.disableDepthWrite=true;m.zOffset=-2;m.bumpTexture=null;m.metallicTexture=null;m.backFaceCulling=true;
 }
 result[name]=m;
 }
 // glTF UVs and texture pixels are shared verbatim with the offline review.
 const textures=new Map();
 const assetTexture=(url,gamma)=>{const key=url+':'+gamma;if(!textures.has(key)){const t=new Texture(url,scene,false,false);t.gammaSpace=gamma;t.anisotropicFilteringLevel=4;textures.set(key,t);}return textures.get(key);};
 for(const [name,p] of Object.entries(OCCUPANT_MATERIALS)){
  if(usedOccupantNames&&!usedOccupantNames.has(name))continue;
  const m=new PBRMaterial(name,scene);m.albedoColor=new Color3(...p.color.slice(0,3));m.metallic=0;m.roughness=p.roughness;m.backFaceCulling=!p.doubleSided;
  // MakeHuman slots: 0-3 skin, 4 garment, 5 footwear, 6 hair, 7 eyes, 8 brows.
  const slot=Number(name.split('-').pop()),skin=slot<=3,cutout=p.cutout&&!skin&&slot!==7;
  if(p.albedo)m.albedoTexture=assetTexture(p.albedo,true);
  if(p.normal){m.bumpTexture=assetTexture(p.normal,false);m.invertNormalMapX=false;m.invertNormalMapY=true;}
  if(cutout&&m.albedoTexture){m.albedoTexture.hasAlpha=true;m.useAlphaFromAlbedoTexture=true;m.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHATEST;m.alphaCutOff=.45;}
  if(skin){m.roughness=.5;m.specularIntensity=.55;m.backFaceCulling=true;m.subSurface.isTranslucencyEnabled=true;m.subSurface.translucencyIntensity=.25;m.subSurface.tintColor=new Color3(.9,.35,.25);m.subSurface.maximumThickness=.8;}
  else if(slot===4){m.roughness=.86;m.sheen.isEnabled=true;m.sheen.intensity=.35;m.sheen.roughness=.7;m.sheen.color=new Color3(.8,.8,.82);m.environmentIntensity=.75;}
  else if(slot===5){m.roughness=.42;m.clearCoat.isEnabled=true;m.clearCoat.intensity=.3;m.clearCoat.roughness=.3;}
  else if(slot===6||slot===8){m.roughness=.42;m.sheen.isEnabled=true;m.sheen.intensity=.5;m.sheen.roughness=.35;m.sheen.color=new Color3(.9,.8,.65);}
  else if(slot===7){m.roughness=.08;m.clearCoat.isEnabled=true;m.clearCoat.intensity=1;m.clearCoat.roughness=.02;}
  result[name]=m;
 }
 return result;}
