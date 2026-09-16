import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {FINISHES} from './interior-kit.js';

function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function surface(scene,name,base){
 const size=name==='display'?1024:384,tex=new DynamicTexture(name+'-surface',{width:size,height:size},scene,true);const ctx=tex.getContext(),r=rng(name.split('').reduce((a,c)=>a+c.charCodeAt(0),17));
 const R=(base>>16)&255,G=(base>>8)&255,B=base&255;ctx.fillStyle=`rgb(${R},${G},${B})`;ctx.fillRect(0,0,size,size);
 if(name==='stone'||name==='plaster'||name==='porcelain'){
  ctx.globalAlpha=.18;for(let i=0;i<180;i++){const x=r()*size,y=r()*size,l=20+r()*120;ctx.strokeStyle=i%4?'#ffffff':'#908b82';ctx.lineWidth=.4+r()*1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+l*.25,y+(r()-.5)*14,x+l*.65,y+(r()-.5)*12,x+l,y+(r()-.5)*10);ctx.stroke();}
  ctx.globalAlpha=1;
 }else if(name==='oak'||name==='book'){
  for(let y=0;y<size;y+=5){const n=Math.sin(y*.17)*9;ctx.strokeStyle=`rgba(50,24,10,${.08+r()*.08})`;ctx.lineWidth=1+r()*1.4;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<size;x+=20)ctx.lineTo(x,y+n*Math.sin(x*.035+r()));ctx.stroke();}
 }else if(['graphite','steel','brass','rubber'].includes(name)){
  for(let y=0;y<size;y+=2){const a=.025+r()*.05;ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y+(r()-.5)*.8);ctx.stroke();}
 }else if(name==='fabric'||name==='leather'){
  for(let i=0;i<size*6;i++){const x=r()*size,y=r()*size,v=r()>.5?255:20;ctx.fillStyle=`rgba(${v},${v},${v},${.025+r()*.045})`;ctx.fillRect(x,y,1+r()*1.5,1+r()*1.5);}
 }else if(name==='leaf'||name==='soil'){
  for(let i=0;i<size*3;i++){ctx.fillStyle=`rgba(0,0,0,${.02+r()*.05})`;ctx.fillRect(r()*size,r()*size,1+r()*3,1+r()*3);}
 }else if(name==='display'){
  const g=ctx.createLinearGradient(0,0,size,size);g.addColorStop(0,'#e9fbff');g.addColorStop(.45,'#bce8ef');g.addColorStop(1,'#ffffff');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);ctx.strokeStyle='rgba(30,120,150,.35)';ctx.lineWidth=2;for(let y=96;y<size;y+=96){ctx.beginPath();ctx.moveTo(72,y);ctx.lineTo(size-72,y);ctx.stroke();}ctx.fillStyle='rgba(20,65,90,.5)';for(let i=0;i<7;i++)ctx.fillRect(78,72+i*116,260+r()*420,18+r()*10);
 }
 tex.update();tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;tex.anisotropicFilteringLevel=8;return tex;
}
export function finishTexture(scene,name){const p=FINISHES[name]||FINISHES.stone;return surface(scene,name,p.color||0xffffff);}
export function createInteriorMaterials(scene){const result={};for(const [name,p] of Object.entries(FINISHES)){
 const m=new PBRMaterial(name,scene);m.albedoColor=Color3.FromInts((p.color>>16)&255,(p.color>>8)&255,p.color&255);m.metallic=p.metalness||0;m.roughness=Math.max(.08,p.roughness??.5);m.environmentIntensity=name==='glass'?1.65:1.05;m.specularIntensity=name==='fabric'||name==='soil'?0.25:1;
 const tex=surface(scene,name,p.color||0xffffff);m.albedoTexture=tex;m.albedoTexture.uScale=name==='oak'?3:2;m.albedoTexture.vScale=name==='oak'?8:2;
 if(p.emissive){m.emissiveColor=Color3.FromInts((p.emissive>>16)&255,(p.emissive>>8)&255,p.emissive&255).scale(p.emissiveIntensity||1);}
 if(name==='glass'){m.alpha=Math.min(.32,p.opacity||.2);m.backFaceCulling=false;m.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;m.indexOfRefraction=1.5;m.microSurface=.96;}
 if(name==='display'){m.emissiveTexture=tex;m.emissiveColor=new Color3(.5,.58,.62);m.roughness=.23;}
 if(name==='brass'){m.metallic=.9;m.roughness=.2;}if(name==='steel'){m.metallic=.92;m.roughness=.22;}if(name==='graphite'){m.metallic=.58;m.roughness=.3;}
 result[name]=m;
 }return result;}
