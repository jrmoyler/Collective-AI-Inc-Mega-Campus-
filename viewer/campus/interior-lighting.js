// Photographic interior lighting: a procedurally authored HDR studio environment
// (warm linear ceiling strips, daylight glazing bands, warm floor bounce), GGX
// prefiltered on the GPU, plus a quality-gated post stack. Nothing is fetched.
import {Engine} from '@babylonjs/core/Engines/engine.js';
import {RawCubeTexture} from '@babylonjs/core/Materials/Textures/rawCubeTexture.js';
import {HDRFiltering} from '@babylonjs/core/Materials/Textures/Filtering/hdrFiltering.js';
import {CubeMapToSphericalPolynomialTools} from '@babylonjs/core/Misc/HighDynamicRange/cubemapToSphericalPolynomial.js';
import {ImageProcessingConfiguration} from '@babylonjs/core/Materials/imageProcessingConfiguration.js';
import {DefaultRenderingPipeline} from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent.js';
import {Color4} from '@babylonjs/core/Maths/math.color.js';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Linear-light radiance of an idealised premium workplace seen from eye height.
export function interiorRadiance(x,y,z){
 const l=Math.hypot(x,y,z)||1;x/=l;y/=l;z/=l;
 // Warm plaster ceiling with suspended amber linear luminaires every 2.4 m.
 const ceilingBase=[.42,.37,.30];
 let ceiling=ceilingBase;
 if(y>.05){
  const px=x/y*1.9,pz=z/y*1.9;
  const strip=Math.abs(((pz%2.4)+3.6)%2.4-1.2)<.07&&Math.abs(px)<6?1:0;
  const cross=Math.abs(((px%3.6)+5.4)%3.6-1.8)<.05&&Math.abs(pz)<9?1:0;
  const glow=Math.max(strip,cross*.7)*smooth(.05,.3,y);
  ceiling=[ceilingBase[0]+glow*9.5,ceilingBase[1]+glow*7.6,ceilingBase[2]+glow*5.2];
 }
 // Walls: warm oak and plaster, with daylight glazing on the long facades.
 const az=Math.atan2(x,z),mull=Math.abs(Math.sin(az*9))<.12;
 const glazing=smooth(.25,.45,Math.abs(z))*(1-smooth(.34,.5,y))*smooth(-.12,-.02,y)*(mull?.12:1);
 const sky=[1.55+.7*y,1.85+.9*y,2.35+1.1*y];
 const wall=[.30,.26,.21];
 const horizon=wall.map((c,i)=>c*(1-glazing)+sky[i]*glazing);
 const floor=[.3,.25,.19];
 const up=smooth(.2,.42,y),down=smooth(-.05,-.3,y);
 return horizon.map((c,i)=>c*(1-up-down)+ceiling[i]*up+floor[i]*down);
}
function f16(value){
 const f=new Float32Array(1),u=new Uint32Array(f.buffer);f[0]=value;const x=u[0];
 const sign=(x>>>16)&0x8000;let e=((x>>>23)&0xff)-112,m=x&0x7fffff;
 if(e<=0)return sign;if(e>30)return sign|0x7c00;return sign|(e<<10)|(m>>>13);
}
// Cube faces in +X,-X,+Y,-Y,+Z,-Z order using the GL cube-map convention.
export function interiorEnvironmentFaces(size=48){
 const dirs=[(u,v)=>[1,-v,-u],(u,v)=>[-1,-v,u],(u,v)=>[u,1,v],(u,v)=>[u,-1,-v],(u,v)=>[u,-v,1],(u,v)=>[-u,-v,-1]];
 return dirs.map(dir=>{const out=new Float32Array(size*size*4);for(let j=0;j<size;j++)for(let i=0;i<size;i++){const u=(i+.5)/size*2-1,v=(j+.5)/size*2-1,c=interiorRadiance(...dir(u,v)),o=(j*size+i)*4;out[o]=c[0];out[o+1]=c[1];out[o+2]=c[2];out[o+3]=1;}return out;});
}
export function createInteriorEnvironment(scene,engine,{size=48}={}){
 const faces=interiorEnvironmentFaces(size);
 const caps=engine.getCaps(),half=!!caps.textureHalfFloat&&engine.webGLVersion>=2;
 let texture;
 if(half){
  const data=faces.map(face=>{const out=new Uint16Array(face.length);for(let i=0;i<face.length;i++)out[i]=f16(face[i]);return out;});
  texture=new RawCubeTexture(scene,data,size,Engine.TEXTUREFORMAT_RGBA,Engine.TEXTURETYPE_HALF_FLOAT,true);
 }else{
  // 8-bit fallback compresses the luminaire peaks into the displayable range.
  const data=faces.map(face=>{const out=new Uint8Array(face.length);for(let i=0;i<face.length;i++)out[i]=i%4===3?255:Math.round(255*Math.min(1,face[i]/(1+face[i])*1.35));return out;});
  texture=new RawCubeTexture(scene,data,size,Engine.TEXTUREFORMAT_RGBA,Engine.TEXTURETYPE_UNSIGNED_BYTE,true);
 }
 texture.gammaSpace=false;
 texture.sphericalPolynomial=CubeMapToSphericalPolynomialTools.ConvertCubeMapToSphericalPolynomial({size,right:faces[0],left:faces[1],up:faces[2],down:faces[3],front:faces[4],back:faces[5],format:Engine.TEXTUREFORMAT_RGBA,type:Engine.TEXTURETYPE_FLOAT,gammaSpace:false});
 scene.environmentTexture=texture;
 // Convolve for GGX roughness so polished stone shows soft luminaire streaks.
 if(half&&caps.textureLOD&&(caps.textureHalfFloatRender||caps.textureFloatRender)){
  try{const filter=new HDRFiltering(engine,{quality:4096,hdrScale:1});filter.prefilter(texture).catch(()=>{});}catch{/* unfiltered mips remain valid */}
 }
 return texture;
}
const mobileClient=()=>{const n=globalThis.navigator;return !!n&&((n.maxTouchPoints||0)>1&&Math.min(globalThis.screen?.width||1e4,globalThis.screen?.height||1e4)<900);};
// Post stack: one MSAA HDR pass with ACES, restrained bloom from luminaires, lens
// vignette and film grain. Screen-space AO was rejected (haloing at depth edges);
// contact occlusion is modelled geometrically in the kit instead.
export function createInteriorPipeline(scene,camera,quality='balanced'){
 const engine=scene.getEngine(),high=quality==='high',mobile=mobileClient(),webgl2=engine.webGLVersion>=2;
 const ip=scene.imageProcessingConfiguration;
 ip.toneMappingEnabled=true;ip.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;ip.exposure=1.0;ip.contrast=1.12;
 scene.clearColor=new Color4(.05,.045,.04,1);
 const result={pipeline:null,dispose(){this.pipeline?.dispose();}};
 try{
  const p=new DefaultRenderingPipeline('interior photographic',true,scene,[camera]);
  p.samples=webgl2?(high?4:mobile?2:4):1;p.fxaaEnabled=!webgl2||mobile;
  p.bloomEnabled=true;p.bloomThreshold=.82;p.bloomWeight=high?.32:.24;p.bloomKernel=high?64:32;p.bloomScale=.5;
  p.imageProcessingEnabled=true;const pp=p.imageProcessing;
  pp.toneMappingEnabled=true;pp.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;pp.exposure=1.06;pp.contrast=1.1;
  pp.vignetteEnabled=true;pp.vignetteWeight=1.6;pp.vignetteStretch=.2;pp.vignetteCameraFov=camera.fov;pp.vignetteColor=new Color4(.08,.05,.03,0);
  if(high){p.sharpenEnabled=true;p.sharpen.edgeAmount=.18;}
  p.grainEnabled=!mobile;p.grain.intensity=high?4:3;p.grain.animated=false;
  result.pipeline=p;
 }catch{/* image processing on the default framebuffer remains active */}
 return result;
}
// Daylit view beyond the glazing: sky, hazy campus tree line and distant pavilions,
// set below the visitor by the storey height so upper floors look out over the canopy.
export function paintExteriorView(ctx,width,height,{top,bottom,ground}){
 const yToPx=y=>(top-y)/(top-bottom)*height,g=yToPx(ground);
 const sky=ctx.createLinearGradient(0,0,0,g);sky.addColorStop(0,'#86a9c8');sky.addColorStop(.6,'#bcd0de');sky.addColorStop(1,'#e8ece8');
 ctx.fillStyle=sky;ctx.fillRect(0,0,width,g+2);
 let seed=913;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 ctx.globalAlpha=.35;for(let i=0;i<40;i++){const x=r()*width,y=g*(.15+r()*.55),w=60+r()*220;ctx.fillStyle='#f4f6f6';ctx.beginPath();ctx.ellipse(x,y,w,w*.12,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x-width,y,w,w*.12,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 const px=height/(top-bottom);
 // Distant pavilions (haze-blended), then two canopy bands, then lawn and paths.
 for(let i=0;i<9;i++){const x=r()*width,w=(30+r()*80)*px/2,h=(6+r()*12)*px;ctx.fillStyle=`rgb(${168+r()*20|0},${178+r()*16|0},${184+r()*14|0})`;ctx.fillRect(x,g-h,w,h);ctx.fillStyle='rgba(120,150,170,.35)';for(let y=g-h+px*1.5;y<g-px;y+=px*3.8)ctx.fillRect(x+2,y,w-4,px*1.3);}
 // Tree crowns: clustered, self-shaded spheres in three receding rows with aerial haze.
 const rows=[[16,8,[122,142,118],.5,1.1],[12,7,[84,112,74],.22,1.5],[8,5,[62,92,52],0,2]];
 for(const [height,crown,[cr,cg,cb],haze,scale] of rows){
  const count=Math.round(width/(crown*px*.9*scale));
  for(let i=0;i<count;i++){
   const x=(i+r()*.8)/count*width,h=(height*(.7+r()*.5))*px*scale,rad=crown*px*scale*(.45+r()*.35),y=g-h+rad*.9;
   ctx.fillStyle=`rgb(${cr*.55|0},${cg*.5|0},${cb*.45|0})`;ctx.fillRect(x-rad*.06,y,rad*.12,g-y);
   for(let k=0;k<7;k++){const ox=(r()-.5)*rad*1.1,oy=(r()-.6)*rad*.9,rr=rad*(.45+r()*.4),shade=.78+(-(oy/rad)+(-ox/rad)*.4)*.25+r()*.1;
    const mix=c=>Math.round(c*shade*(1-haze)+226*haze);
    for(const dx of [0,-width,width]){ctx.fillStyle=`rgb(${mix(cr)},${mix(cg)},${mix(cb)})`;ctx.beginPath();ctx.arc(x+ox+dx,y+oy,rr,0,Math.PI*2);ctx.fill();}}
  }
 }
 const lawn=ctx.createLinearGradient(0,g,0,height);lawn.addColorStop(0,'#6d8458');lawn.addColorStop(1,'#56703f');ctx.fillStyle=lawn;ctx.fillRect(0,g,width,height-g);
 ctx.globalAlpha=.12;for(let i=0;i<500;i++){ctx.fillStyle=r()>.5?'#8aa070':'#4d6537';ctx.beginPath();ctx.ellipse(r()*width,g+(height-g)*r(),20+r()*60,3+r()*8,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
export function createExteriorBackdrop(scene,layout,level,{CreateCylinder,StandardMaterial,DynamicTexture,Color3,Mesh}){
 const storey=4.2,ground=-level*storey,top=60,bottom=ground-40,radius=Math.max(layout.w,layout.d)*.5+55;
 const tex=new DynamicTexture('exterior view',{width:2048,height:512},scene,true);
 paintExteriorView(tex.getContext(),2048,512,{top,bottom,ground});tex.update();tex.uScale=3;tex.wrapU=1;
 const m=new StandardMaterial('exterior view',scene);// StandardMaterial adds (not multiplies) emissive texture and diffuse under disableLighting.
 m.disableLighting=true;m.diffuseColor=Color3.Black();m.specularColor=Color3.Black();m.emissiveColor=Color3.Black();m.emissiveTexture=tex;tex.level=1;m.backFaceCulling=false;m.fogEnabled=false;
 const view=CreateCylinder('exterior view',{height:top-bottom,diameter:radius*2,tessellation:64,cap:0,sideOrientation:Mesh.BACKSIDE},scene);
 view.position.y=(top+bottom)/2;view.material=m;view.isPickable=false;view.checkCollisions=false;view.applyFog=false;
 return view;
}
