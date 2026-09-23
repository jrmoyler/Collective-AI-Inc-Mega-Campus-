// @ts-nocheck
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {botanicalMaterial,barkMaterial,speciesTemplates,CROWN_RATIO} from './botanical.js';
import {Batch,materials,cylinder,ring,line,seeded,kineticRoadMaterial} from './geometry.js';
import {FACILITIES,SPIRES,LAKES,SITE} from './data.js';

// Landscape owns its own physically based materials (ground, asphalt, pavers,
// coping, water, spray, foliage) so shared building materials stay untouched.

const haloMat=new T.MeshBasicMaterial({
 color:0x8fcfc4,transparent:true,opacity:.12,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,side:T.DoubleSide,
});
const goldHaloMat=new T.MeshBasicMaterial({
 color:0xe1c18b,transparent:true,opacity:.15,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,side:T.DoubleSide,
});

// Shared GLSL value noise used by the ground, road and stone shaders.
const NOISE=`
float lsHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float lsNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
 return mix(mix(lsHash(i),lsHash(i+vec2(1.0,0.0)),u.x),mix(lsHash(i+vec2(0.0,1.0)),lsHash(i+vec2(1.0,1.0)),u.x),u.y);}
float lsFbm(vec2 p){float a=.5,s=0.0;for(int i=0;i<4;i++){s+=a*lsNoise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
`;

// JS value noise for planting density (groves and clearings, not uniform scatter).
function valueNoise(seed){
 const h=(x,z)=>{let n=(x*374761393+z*668265263+seed*1442695041)|0;n=(n^(n>>>13))*1274126177|0;return((n^(n>>>16))>>>0)/4294967296;};
 return (x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  return (h(xi,zi)*(1-u)+h(xi+1,zi)*u)*(1-v)+(h(xi,zi+1)*(1-u)+h(xi+1,zi+1)*u)*v;};
}

function dataTexture(size,fill,{srgb=false,repeat=true}={}){
 const data=new Uint8Array(size*size*4);fill(data,size);
 const tex=new T.DataTexture(data,size,size);
 if(repeat)tex.wrapS=tex.wrapT=T.RepeatWrapping;
 tex.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.anisotropy=8;tex.needsUpdate=true;
 return tex;
}
// Tileable ripple normal map: integer-frequency wave sum encoded as slope.
function rippleTexture(){
 const random=seeded(5151),waves=[];
 for(let i=0;i<22;i++){const kx=Math.round((random()*2-1)*9),kz=Math.round((random()*2-1)*9);if(!kx&&!kz)continue;waves.push([kx,kz,random()*6.283,1/Math.hypot(kx,kz)]);}
 return dataTexture(128,(data,S)=>{
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   let dx=0,dz=0;
   for(const [kx,kz,ph,a] of waves){const c=Math.cos(6.2832*(kx*x+kz*y)/S+ph)*a;dx+=c*kx;dz+=c*kz;}
   const o=(y*S+x)*4;data[o]=128+Math.max(-127,Math.min(127,dx*9));data[o+1]=128+Math.max(-127,Math.min(127,dz*9));data[o+2]=255;data[o+3]=255;
  }
 });
}
// Close-range grass blades: short vertical strokes, mean value 0.5.
function grassDetailTexture(){
 const random=seeded(9031);
 return dataTexture(256,(data,S)=>{
  const v=new Float32Array(S*S).fill(.5);
  for(let i=0;i<5200;i++){
   const x0=random()*S,y0=random()*S,len=4+random()*9,lean=(random()-.5)*.6,val=random()<.5?.22+random()*.2:.68+random()*.3;
   for(let t=0;t<len;t++){const x=Math.floor(x0+lean*t+S)%S,y=Math.floor(y0+t)%S;v[y*S+x]=val*(.75+.25*t/len);}
  }
  for(let i=0;i<S*S;i++){const n=Math.max(0,Math.min(255,v[i]*255));data[i*4]=n;data[i*4+1]=n;data[i*4+2]=n;data[i*4+3]=255;}
 });
}

// Ground: large-scale meadow variation, canopy shade/mulch, mowing stripes on
// the campus lawn and a grass-blade detail layer that appears at close range.
function groundMaterial(site,{stripes=0}={}){
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.97,metalness:0,envMapIntensity:.55});
 m.name=stripes?'campus-lawn-ground':'meadow-ground';
 m.onBeforeCompile=s=>{
  Object.assign(s.uniforms,{uSite:{value:site.texture},uSiteMin:{value:site.min},uSiteSize:{value:site.size},uGrass:{value:site.grass},uStripes:{value:stripes}});
  s.vertexShader='varying vec3 vGroundWorld;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n vGroundWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  s.fragmentShader='uniform sampler2D uSite;uniform sampler2D uGrass;uniform vec2 uSiteMin;uniform vec2 uSiteSize;uniform float uStripes;\nvarying vec3 vGroundWorld;\n'+NOISE+s.fragmentShader.replace('#include <map_fragment>',`
  vec2 gp=vGroundWorld.xz;
  float gMacro=lsFbm(gp*.0031+vec2(3.7,1.9));
  float gMeso=lsFbm(gp*.021);
  float gMicro=lsNoise(gp*.6);
  vec4 gSite=texture2D(uSite,(gp-uSiteMin)/uSiteSize);
  vec3 gLush=vec3(.064,.112,.028),gDark=vec3(.034,.066,.018),gDry=vec3(.128,.126,.052);
  float gFar=smoothstep(350.0,1400.0,length(vViewPosition));
  vec3 gCol=mix(gDark,gLush,.35+.65*mix(smoothstep(.25,.75,gMeso),.6,gFar*.7));
  gCol=mix(gCol,gDry,smoothstep(.5,.82,gMacro)*(.4-.35*gSite.g)*(1.0-gFar*.5));
  gCol=mix(gCol,gLush*1.1,gSite.g*.5);
  gCol*=.88+.24*gMicro;
  // Leaf litter and shade beneath canopies ground the trees.
  gCol=mix(gCol,vec3(.036,.038,.018),gSite.r*.62);
  float gStripe=smoothstep(-.2,.2,sin((gp.x*.9+gp.y*.44)*.26));
  gCol*=1.0+uStripes*(gStripe-.5)*.09*(1.0-gSite.r);
  float gDist=length(vViewPosition);
  float gDetail=texture2D(uGrass,gp/1.7).r*.6+texture2D(uGrass,gp/.53+.37).r*.4;
  gCol*=mix(1.0,.62+.76*gDetail,1.0-smoothstep(18.0,140.0,gDist));
  diffuseColor.rgb=gCol;`);
 };
 m.customProgramCacheKey=()=>'landscape-ground';
 return m;
}

// Asphalt with aggregate, repairs, tyre polish and worn painted markings.
function asphaltMaterial(halfWidth,index){
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:0,envMapIntensity:.6,polygonOffset:true,polygonOffsetFactor:-index*.5,polygonOffsetUnits:-index*2});
 m.name='asphalt';
 m.onBeforeCompile=s=>{
  s.uniforms.uHalfWidth={value:halfWidth};
  s.vertexShader='attribute float junction;varying float vJunction;varying vec2 vRoadUv;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vJunction=junction;vRoadUv=uv;');
  s.fragmentShader='uniform float uHalfWidth;varying float vJunction;varying vec2 vRoadUv;\n'+NOISE+s.fragmentShader.replace('#include <map_fragment>',`
  float along=vRoadUv.x,across=vRoadUv.y-uHalfWidth,aw=abs(across);
  float rDist=length(vViewPosition);
  float agg=lsNoise(vec2(along,across)*7.0)*.5+lsNoise(vec2(along,across)*1.6)*.5;
  vec3 asp=vec3(.030,.032,.034)*(.8+.4*mix(agg,.5,smoothstep(20.0,200.0,rDist)));
  float patchN=lsFbm(vec2(along*.06,across*.2)+7.3);
  asp*=mix(1.0,.7,smoothstep(.63,.66,patchN));
  float lane=fract(aw/(uHalfWidth*.5));
  float polish=exp(-pow((lane-.3)*7.0,2.0))+exp(-pow((lane-.7)*7.0,2.0));
  asp*=1.0+.16*polish*(.6+.4*lsNoise(vec2(along*.2,across)));
  asp*=1.0-.25*smoothstep(.72,.8,lsNoise(vec2(along*.35,across*.9)+3.1))*(1.0-smoothstep(uHalfWidth-2.0,uHalfWidth-.6,aw));
  float fw=max(fwidth(across),.002);
  float edge=1.0-smoothstep(.08-fw,.08+fw,abs(aw-(uHalfWidth-.55)));
  float dash=step(fract(along/9.0),.38);
  float laneLine=(1.0-smoothstep(.06-fw,.06+fw,abs(aw-uHalfWidth*.5)))*dash;
  float mark=max(edge,laneLine)*(1.0-vJunction);
  float markWear=smoothstep(.2,.65,lsNoise(vec2(along*.8,across*4.0)));
  mark*=mix(.45,1.0,markWear);
  diffuseColor.rgb=mix(asp,vec3(.56,.56,.52),mark);`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  roughnessFactor=mix(.9,.72,mark)-.08*polish;`);
 };
 m.customProgramCacheKey=()=>'landscape-asphalt';
 return m;
}

// Running-bond concrete pavers with joints that fade out with distance.
function paverMaterial(){
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.86,metalness:0,envMapIntensity:.6});
 m.name='pavers';
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec2 vPaverUv;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vPaverUv=uv;');
  s.fragmentShader='varying vec2 vPaverUv;\n'+NOISE+s.fragmentShader.replace('#include <map_fragment>',`
  vec2 pp=vec2(vPaverUv.x/.6,vPaverUv.y/.3);float prow=floor(pp.y);pp.x+=mod(prow,2.0)*.5;
  vec2 pf=fract(pp),pw=fwidth(pp)+.001;
  float joint=1.0-min(smoothstep(.0,.04+pw.x,min(pf.x,1.0-pf.x)),smoothstep(.0,.08+pw.y,min(pf.y,1.0-pf.y)));
  float pDist=length(vViewPosition);
  joint*=1.0-smoothstep(25.0,120.0,pDist);
  float ph=lsHash(floor(pp));
  vec3 tile=vec3(.30,.285,.25)*(.86+.22*ph)*(.92+.16*lsNoise(vPaverUv*3.0));
  tile*=1.0-.18*smoothstep(.6,.9,lsFbm(vPaverUv*.15));
  diffuseColor.rgb=mix(tile,vec3(.12,.115,.10),joint*.8);`);
 };
 m.customProgramCacheKey=()=>'landscape-pavers';
 return m;
}

// Granite coping, curbs and rocks: world-space mottling, no texture download.
function stoneMaterial(color,name){
 const m=new T.MeshStandardMaterial({color,roughness:.8,metalness:0,envMapIntensity:.7});
 m.name=name;
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 vStoneWorld;\n'+s.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
  vec4 stoneLocal=vec4(transformed,1.0);
  #ifdef USE_INSTANCING
   stoneLocal=instanceMatrix*stoneLocal;
  #endif
  vStoneWorld=(modelMatrix*stoneLocal).xyz;`);
  s.fragmentShader='varying vec3 vStoneWorld;\n'+NOISE+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  float sn=lsNoise(vStoneWorld.xz*3.1+vStoneWorld.y*2.0)*.5+lsNoise(vStoneWorld.xz*.7+vStoneWorld.y)*.5;
  float sj=step(.94,fract((vStoneWorld.x+vStoneWorld.z)*.8));
  diffuseColor.rgb*=(.82+.3*sn)*(1.0-.25*sj*(1.0-smoothstep(20.0,80.0,length(vViewPosition))));`);
 };
 m.customProgramCacheKey=()=>'landscape-stone';
 return m;
}

// Water: fresnel sky reflection (works with or without scene.environment),
// animated tri-scale ripple normals, depth-tinted body colour and sun glints.
function waterMaterial(uniforms){
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.07,metalness:0,envMapIntensity:.3});
 m.name='water';
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='uniform float uTime;\nattribute float waterDepth;\nvarying vec3 waterWorld;\nvarying float vWaterDepth;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n waterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vWaterDepth=waterDepth;');
  shader.fragmentShader='uniform float uTime;\nuniform sampler2D uRipple;\nuniform vec3 uShallow;\nuniform vec3 uDeep;\nuniform vec3 uHorizon;\nuniform vec3 uZenith;\nvarying vec3 waterWorld;\nvarying float vWaterDepth;\n'+shader.fragmentShader
   .replace('#include <color_fragment>',`#include <color_fragment>
  diffuseColor.rgb=mix(uShallow,uDeep,smoothstep(.0,.65,vWaterDepth));`)
   .replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
  vec2 wA=texture2D(uRipple,waterWorld.xz*.09+vec2(uTime*.017,uTime*.010)).xy*2.0-1.0;
  vec2 wB=texture2D(uRipple,waterWorld.xz*.27+vec2(-uTime*.022,uTime*.027)).xy*2.0-1.0;
  vec2 wC=texture2D(uRipple,waterWorld.xz*.023+vec2(uTime*.004,-uTime*.005)).xy*2.0-1.0;
  float wDist=length(cameraPosition-waterWorld);
  vec2 wSlope=(wA*.5+wB*.3+wC*.7)*mix(.24,.08,smoothstep(40.0,900.0,wDist));
  vec3 waterN=normalize(vec3(-wSlope.x,1.0,-wSlope.y));
  normal=normalize((viewMatrix*vec4(waterN,0.0)).xyz);`)
   .replace('#include <opaque_fragment>',`
  vec3 wV=normalize(cameraPosition-waterWorld);
  float wF=.02+.98*pow(1.0-max(dot(waterN,wV),0.0),5.0);
  vec3 wR=reflect(-wV,waterN);
  // Low reflection angles see the surrounding tree line and buildings, not open
  // sky: a darkened horizon band stands in for a planar reflection on mobile.
  vec3 wSurround=vec3(.03,.045,.035)+uHorizon*.1;
  vec3 wSky=mix(wSurround,mix(uHorizon*.85,uZenith,smoothstep(.2,.6,wR.y)),smoothstep(.04,.34,wR.y));
  outgoingLight=mix(outgoingLight,wSky,clamp(wF,0.0,1.0)*.85);
  outgoingLight+=uHorizon*.05*(1.0-smoothstep(.0,.06,vWaterDepth));
  #include <opaque_fragment>`);
 };
 m.customProgramCacheKey=()=>'landscape-water';
 return m;
}

function sprayMaterial(uniforms,kind){
 return new T.ShaderMaterial({
  name:kind==='jet'?'fountain-spray':'fountain-foam',transparent:true,depthWrite:false,side:T.DoubleSide,
  uniforms:{uTime:uniforms.uTime},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:kind==='jet'?`uniform float uTime;varying vec2 vUv;
   void main(){float streak=smoothstep(.15,.85,fract(vUv.x*16.0-uTime*2.4+sin(vUv.y*18.85)*.18));
    float fade=smoothstep(.0,.06,vUv.x)*(1.0-smoothstep(.8,1.0,vUv.x));
    gl_FragColor=vec4(vec3(.82,.88,.9),(.22+.5*streak)*fade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`:`uniform float uTime;varying vec2 vUv;
   void main(){vec2 c=vUv-.5;float r=length(c)*2.0;float a=atan(c.y,c.x);
    float churn=.5+.5*sin(r*26.0-uTime*3.0+sin(a*7.0)*1.5);
    float alpha=(1.0-smoothstep(.55,1.0,r))*(.18+.32*churn)*smoothstep(.0,.15,r+.1);
    gl_FragColor=vec4(vec3(.86,.9,.92),alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
 });
}

// Sweep a cross-section along sampled centreline points. Each profile edge is
// {o0,y0,o1,y1,face} with o measured along the sample's side normal; faces are
// oriented 'up', 'out' (along +normal*side) or 'in'. `skip(i)` omits a span.
function sweep(samples,edges,{side=1,skip=null,junction=null}={}){
 const pos=[],uv=[],idx=[],jn=[];
 for(const e of edges){
  const across=Math.hypot(e.o1-e.o0,e.y1-e.y0);
  for(let i=0;i<samples.length-1;i++){
   if(skip&&(skip(i)||skip(i+1)))continue;
   const a=samples[i],b=samples[i+1],base=pos.length/3;
   for(const [p,o,y,v] of [[a,e.o0,e.y0,0],[a,e.o1,e.y1,across],[b,e.o0,e.y0,0],[b,e.o1,e.y1,across]]){
    pos.push(p.x+p.nx*o*side,y,p.z+p.nz*o*side);uv.push(p.along,v+(e.v0||0));if(junction)jn.push(junction[p===a?i:i+1]);
   }
   // Orient the quad toward its intended face.
   const ax=pos[base*3],ay=pos[base*3+1],az=pos[base*3+2];
   const ux=pos[base*3+3]-ax,uy=pos[base*3+4]-ay,uz=pos[base*3+5]-az,vx=pos[base*3+6]-ax,vy=pos[base*3+7]-ay,vz=pos[base*3+8]-az;
   const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
   const want=e.face==='up'?[0,1,0]:[(a.nx*side)*(e.face==='out'?1:-1),0,(a.nz*side)*(e.face==='out'?1:-1)];
   if(nx*want[0]+ny*want[1]+nz*want[2]>=0)idx.push(base,base+1,base+2,base+1,base+3,base+2);
   else idx.push(base,base+2,base+1,base+1,base+2,base+3);
  }
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 if(junction)g.setAttribute('junction',new T.Float32BufferAttribute(jn,1));
 g.setIndex(idx);g.computeVertexNormals();return g;
}
function sampleCurve(curve,step){
 const length=curve.getLength(),n=Math.max(8,Math.ceil(length/step)),out=[];
 for(let i=0;i<=n;i++){const t=i/n,p=curve.getPointAt(t),d=curve.getTangentAt(t),l=Math.hypot(d.x,d.z)||1;out.push({x:p.x,z:p.z,nx:-d.z/l,nz:d.x/l,along:t*length});}
 return out;
}
function mergeOrEmpty(list){const g=list.length?mergeGeometries(list):new T.BufferGeometry();list.forEach(x=>x.dispose());return g;}

function ribbon(pts,width,closed,y=0.22){
 const curve=new T.CatmullRomCurve3(pts.map(([x,z])=>new T.Vector3(x,y,z)),closed,'catmullrom',.25);
 const p=[],uv=[],idx=[],n=240,length=curve.getLength();
 for(let i=0;i<=n;i++){
  const t=i/n,c=curve.getPoint(t),d=curve.getTangent(t);
  const nx=-d.z,nz=d.x,len=Math.hypot(nx,nz)||1;
  for(const s of [0,1]){
   p.push(c.x+(nx/len)*(width/2)*(s?1:-1),c.y,c.z+(nz/len)*(width/2)*(s?1:-1));
   uv.push(t*length/18,s);
  }
  if(i<n){const j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.setIndex(idx);g.computeVertexNormals();
 return {curve,width,g};
}

// Foundations, ring road and turbine belt remain level. Rolling relief begins
// outside the developed campus, with a smooth zero-slope transition.
export function outerTerrainHeight(x,z){
 const radius=Math.hypot(x/(SITE.width*.52),z/(SITE.depth*.52));
 const u=T.MathUtils.clamp((radius-1.4)/.65,0,1),fade=u*u*(3-2*u);
 return fade*(8+5*Math.sin(x*.006+z*.002)+3*Math.cos(z*.009-x*.002));
}

// Individual landscape basins retain canonical siting and their clearance envelope.
// Different coves and shoulders replace scaled copies of one elliptical shoreline.
export function shoreRadius(index,angle){
 const phase=index*1.618,frequency=2+index%3;
 return .91+.065*Math.sin(angle*frequency+phase)+.035*Math.cos(angle*(5+index%2)-phase);
}
// World-space shoreline point for lake `index` at polar angle `a`.
export function shorePoint(index,a,extra=0){
 const [x,z,rx,rz]=LAKES[index],r=shoreRadius(index,a);
 return [x+Math.cos(a)*(rx*r+extra),z-Math.sin(a)*(rz*r+extra)];
}

// Species mix per planting zone; heights in metres (8–20 m trees, cherries lower).
export const TREE_SPECIES={
 oak:{height:[11,17]},lime:{height:[12,18]},cherry:{height:[8,10.5]},column:{height:[13,19]},conifer:{height:[12,20]},
};
const ZONE_MIX={
 campus:[['oak',.32],['lime',.2],['cherry',.24],['column',.1],['conifer',.14]],
 belt:[['oak',.28],['lime',.18],['cherry',.1],['conifer',.44]],
 forest:[['oak',.3],['lime',.16],['cherry',.04],['conifer',.5]],
};
const SPECIES_TINT={
 oak:[[1,1,1],[1.12,1.1,.82],[.84,.9,.82],[1.05,1,.9]],
 lime:[[1.08,1.12,.86],[1,1.04,.92],[.9,.96,.86]],
 cherry:[[1,1,1],[1.08,1.06,1.08],[.96,.9,.96],[1.04,.98,1]],
 column:[[.94,1,.9],[1.04,1.06,.9]],
 conifer:[[1,1,1],[.86,.92,.94],[1.04,1.02,.96]],
 shrub:[[1,1,1],[1.14,1.08,.8],[.8,.9,.84],[1.1,.8,.8],[.9,1,1.05]],
};
const BARK={oak:0x5e5248,lime:0x6c665e,cherry:0x5c4038,column:0x6e685f,conifer:0x5a4534};

export function createLandscape(){
 const root=new T.Group();root.name='landscape';const b=new Batch();const random=seeded(22035);
 const kineticMats=[];
 const treeInner=3000,treeBelt=500,treeOuter=3200,lampEvery=28;
 const wind={value:0};
 const waterUniforms={
  uTime:{value:0},uRipple:{value:rippleTexture()},
  uShallow:{value:new T.Color(0x2c4a3e)},uDeep:{value:new T.Color(0x0b2129)},
  uHorizon:{value:new T.Color(0xb2ccdf)},uZenith:{value:new T.Color(0x5f8fc0)},
 };

 // ---- Roads (topology from the reference plan) ----
 const roadDefs=[
  [[[-462,-345],[-350,-400],[0,-402],[363,-390],[481,-285],[485,130],[464,398],[208,430],[-298,425],[-476,331],[-491,20]],24,true,'gold'],
  [[[-472,-60],[-312,-65],[-210,-53],[-60,-37],[120,-17],[317,-2],[476,8]],13],
  [[[-464,242],[-328,289],[-124,279],[47,270],[227,272],[441,272]],14],
  [[[-445,-214],[-358,-182],[-293,-171],[-181,-192],[-70,-194],[94,-206],[309,-224],[466,-240]],13],
  [[[-279,-389],[-260,-275],[-177,-246],[-165,-147],[-197,-54],[-207,81],[-272,184],[-289,280],[-310,410]],12],
  [[[42,-390],[55,-276],[42,-221],[49,-106],[10,-22],[-9,60],[-40,120],[-16,254],[49,407]],12],
  [[[332,-392],[358,-268],[330,-211],[347,-105],[273,-25],[250,99],[251,179],[277,276],[279,415]],13],
  [[[-468,111],[-336,117],[-239,111],[-177,136],[-113,121],[13,115],[130,119],[229,139],[432,167]],11],
 ];
 const roads=[],roadInfo=[];
 for(const [pts,width,closed=false,kind='cyan'] of roadDefs){
  const curve=new T.CatmullRomCurve3(pts.map(([x,z])=>new T.Vector3(x,.22,z)),closed,'catmullrom',.25);
  roads.push({curve,width});roadInfo.push({pts,width,closed,kind,curve,hw:(width+1.4)/2,samples:sampleCurve(curve,2.5)});
 }
 // Spatial index of road centrelines for junction and clearance tests.
 const RC=20,roadGrid=new Map();
 roadInfo.forEach((r,ri)=>r.samples.forEach(p=>{const k=`${Math.floor(p.x/RC)},${Math.floor(p.z/RC)}`;if(!roadGrid.has(k))roadGrid.set(k,[]);roadGrid.get(k).push([p.x,p.z,ri]);}));
 // Distance beyond the asphalt edge of the nearest road other than `except`.
 const roadClearance=(x,z,except=-1)=>{
  let best=Infinity;const cx=Math.floor(x/RC),cz=Math.floor(z/RC);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(const [px,pz,ri] of roadGrid.get(`${cx+dx},${cz+dz}`)||[]){
   if(ri===except)continue;const d=Math.hypot(x-px,z-pz)-roadInfo[ri].hw;if(d<best)best=d;
  }
  return best;
 };
 const curbMat=stoneMaterial(0xb4b0a6,'granite-curb'),paverMat=paverMaterial();
 const curbGeos=[],walkGeos=[];
 roadInfo.forEach((r,ri)=>{
  const {samples,hw}=r;
  const junction=samples.map(p=>roadClearance(p.x,p.z,ri)<.8?1:0);
  const asphalt=new T.Mesh(sweep(samples,[{o0:-hw,y0:.16,o1:hw,y1:.16,face:'up'}],{junction}),asphaltMaterial(hw,ri));
  asphalt.name='asphalt';asphalt.receiveShadow=true;root.add(asphalt);
  for(const side of [-1,1]){
   // Kerbs and footways stop where they would cross another carriageway.
   const blocked=samples.map(p=>roadClearance(p.x+p.nx*(hw+1.5)*side,p.z+p.nz*(hw+1.5)*side,ri)<3.2);
   const skip=i=>blocked[i];
   curbGeos.push(sweep(samples,[{o0:hw,y0:.12,o1:hw,y1:.3,face:'in'},{o0:hw,y0:.3,o1:hw+.3,y1:.3,face:'up'}],{side,skip}));
   walkGeos.push(sweep(samples,[{o0:hw+.3,y0:.28,o1:hw+2.6,y1:.28,face:'up'},{o0:hw+2.6,y0:.28,o1:hw+2.6,y1:.02,face:'out'}],{side,skip}));
  }
  const {g}=ribbon(r.pts,.32,r.closed,.24);
  const mat=kineticRoadMaterial(r.kind);kineticMats.push(mat);
  const m=new T.Mesh(g,mat);m.receiveShadow=true;m.name=r.kind==='gold'?'gold-ring-road':'kinetic-road';root.add(m);
  const haloR=ribbon(r.pts,.72,r.closed,.25);
  const halo=new T.Mesh(haloR.g,r.kind==='gold'?goldHaloMat:haloMat);halo.name=r.kind==='gold'?'gold-road-halo':'road-halo';root.add(halo);
 });
 const curbs=new T.Mesh(mergeOrEmpty(curbGeos),curbMat);curbs.name='curbs';curbs.receiveShadow=true;curbs.castShadow=true;root.add(curbs);
 const sidewalk=new T.Mesh(mergeOrEmpty(walkGeos),paverMat);sidewalk.name='walk';sidewalk.receiveShadow=true;root.add(sidewalk);

 // ---- Water: connected ponds, channels and fountains ----
 const waterMat=waterMaterial(waterUniforms);
 const copingMat=stoneMaterial(0xc2bcae,'pond-coping');
 const channelDefs=[[[-62,-200],[-37,-178],[-75,-160]],[[-90,-93],[-74,-62],[-32,-5],[-30,105],[-65,131]],[[-55,173],[-25,187],[13,205]],[[37,240],[50,264],[57,279]],[[52,322],[66,369],[-14,407]]];
 const waterRoutes=[],channelSamples=[];
 for(const points of channelDefs){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.14,z)));waterRoutes.push({curve,width:7.2});
  channelSamples.push(sampleCurve(curve,2));
 }
 const insideLake=(x,z,margin=0)=>LAKES.some(([lx,lz,rx,rz],i)=>{const a=Math.atan2(-(z-lz)/rz,(x-lx)/rx),r=shoreRadius(i,a);return ((x-lx)/(rx*r+margin))**2+((z-lz)/(rz*r+margin))**2<1;});
 const channelClearance=(x,z)=>{let best=Infinity;for(const s of channelSamples)for(const p of s){const d=Math.hypot(x-p.x,z-p.z);if(d<best)best=d;}return best-3.6;};
 const lakeGeos=[],copingGeos=[],promenadeGeos=[];
 const K=9,SEG=128;
 for(const [lakeIndex] of LAKES.entries()){
  // Polar grid so depth can be shaded from shore to centre.
  const pos=[],depth=[],idx=[];
  for(let k=0;k<=K;k++)for(let s=0;s<=SEG;s++){
   const a=s/SEG*Math.PI*2,f=k/K;
   const [ex,ez]=shorePoint(lakeIndex,a,.12),[cx,cz]=[LAKES[lakeIndex][0],LAKES[lakeIndex][1]];
   pos.push(cx+(ex-cx)*f,.38,cz+(ez-cz)*f);depth.push(1-Math.pow(f,1.6));
  }
  for(let k=0;k<K;k++)for(let s=0;s<SEG;s++){const a=k*(SEG+1)+s,c=a+SEG+1;idx.push(a,c,a+1,a+1,c,c+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('waterDepth',new T.Float32BufferAttribute(depth,1));
  g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));g.setIndex(idx);g.computeVertexNormals();
  if(g.attributes.normal.getY(g.attributes.normal.count-1)<0){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}g.computeVertexNormals();}
  lakeGeos.push(g);
  // Shoreline samples with outward normals for coping and promenade sweeps.
  const shore=[];let along=0;
  for(let s=0;s<=192;s++){
   const a=s/192*Math.PI*2,[x,z]=shorePoint(lakeIndex,a),[x2,z2]=shorePoint(lakeIndex,a+.001),[x0,z0]=shorePoint(lakeIndex,a-.001);
   let tx=x2-x0,tz=z2-z0;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
   let nx=-tz,nz=tx;if(nx*(x-LAKES[lakeIndex][0])+nz*(z-LAKES[lakeIndex][1])<0){nx=-nx;nz=-nz;}
   if(s)along+=Math.hypot(x-shore[s-1].x,z-shore[s-1].z);
   shore.push({x,z,nx,nz,along});
  }
  const inlet=shore.map(p=>channelClearance(p.x,p.z)<1.2);
  copingGeos.push(sweep(shore,[{o0:0,y0:.26,o1:0,y1:.56,face:'in'},{o0:0,y0:.56,o1:.9,y1:.56,face:'up'},{o0:.9,y0:.56,o1:.9,y1:.02,face:'out'}],{skip:i=>inlet[i]}));
  const promenadeBlocked=shore.map(p=>roadClearance(p.x+p.nx*2,p.z+p.nz*2)<4||FACILITIES.some(f=>Math.abs(p.x+p.nx*2-f.x)<f.w/2+1&&Math.abs(p.z+p.nz*2-f.z)<f.d/2+1));
  promenadeGeos.push(sweep(shore,[{o0:.9,y0:.1,o1:3.4,y1:.1,face:'up'},{o0:3.4,y0:.1,o1:3.4,y1:.02,face:'out'}],{skip:i=>promenadeBlocked[i]||inlet[i]}));
 }
 const channelGeos=[];
 for(const samples of channelSamples){
  const depth=[];const g=sweep(samples,[{o0:-3.6,y0:.1,o1:3.6,y1:.1,face:'up'}]);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)depth.push(.35*(1-Math.abs(uv.getY(i)/3.6-1)));
  g.setAttribute('waterDepth',new T.Float32BufferAttribute(depth,1));channelGeos.push(g);
  for(const side of [-1,1]){
   const blocked=samples.map(p=>insideLake(p.x+p.nx*3.9*side,p.z+p.nz*3.9*side,1)||roadClearance(p.x+p.nx*3.9*side,p.z+p.nz*3.9*side)<3.4);
   copingGeos.push(sweep(samples,[{o0:3.6,y0:.02,o1:3.6,y1:.22,face:'in'},{o0:3.6,y0:.22,o1:4.2,y1:.22,face:'up'},{o0:4.2,y0:.22,o1:4.2,y1:.02,face:'out'}],{side,skip:i=>blocked[i]}));
  }
 }
 const lakes=new T.Mesh(mergeOrEmpty(lakeGeos),waterMat);lakes.name='lake';lakes.receiveShadow=true;
 const channels=new T.Mesh(mergeOrEmpty(channelGeos),waterMat);channels.name='water-channels';channels.receiveShadow=true;
 // Sky reflection follows the live fog/horizon colour (day and dusk).
 const zenithTint=new T.Color(.55,.7,.95);
 lakes.onBeforeRender=(renderer,scene)=>{
  const h=scene?.fog?.color||scene?.background;if(h?.isColor){waterUniforms.uHorizon.value.copy(h);waterUniforms.uZenith.value.copy(h).multiply(zenithTint);}
 };
 root.add(lakes,channels);
 const coping=new T.Mesh(mergeOrEmpty(copingGeos),copingMat);coping.name='pond-coping';coping.castShadow=true;coping.receiveShadow=true;root.add(coping);
 const promenade=new T.Mesh(mergeOrEmpty(promenadeGeos),paverMat);promenade.name='pond-promenade';promenade.receiveShadow=true;root.add(promenade);

 // Fountains: basin ring, central jet, arcing jets and churned foam.
 const jetGeos=[],foamGeos=[];
 for(const [x,z] of LAKES){
  ring(b,copingMat,x,.44,z,2.5,.2);
  jetGeos.push(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(x,.4,z),new T.Vector3(x,2.6,z),new T.Vector3(x,4.8,z)]),8,.12,6,false));
  for(let j=0;j<12;j++){
   const a=j/12*Math.PI*2,pts=[];
   for(let k=0;k<=10;k++){const t=k/10;pts.push(new T.Vector3(x+Math.cos(a)*2.3*(1-t*.92),.45+Math.sin(t*Math.PI)*2.2*(1-t*.25),z+Math.sin(a)*2.3*(1-t*.92)));}
   jetGeos.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,.05,4,false));
  }
  const foam=new T.PlaneGeometry(5.4,5.4);foam.rotateX(-Math.PI/2);foam.translate(x,.41,z);foamGeos.push(foam);
 }
 const spray=new T.Mesh(mergeOrEmpty(jetGeos),sprayMaterial(waterUniforms,'jet'));spray.name='fountain-spray';spray.renderOrder=2;
 const foam=new T.Mesh(mergeOrEmpty(foamGeos),sprayMaterial(waterUniforms,'foam'));foam.name='fountain-foam';foam.renderOrder=1;
 root.add(spray,foam);

 // ---- Planting ----
 // Spatial buckets accelerate exact segment checks; they do not mark whole
 // cells unavailable. Slim buildings and elliptical ponds retain usable gardens.
 const CELL=24,segments=new Map(),occupied=new Map();
 const key=(x,z)=>`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`;
 for(const route of [...roads,...waterRoutes]){
  const count=Math.ceil(route.curve.getLength()/5);
  let a=route.curve.getPoint(0);
  for(let i=1;i<=count;i++){
   const c=route.curve.getPoint(i/count),r=route.width*.5+12;
   const seg={ax:a.x,az:a.z,bx:c.x,bz:c.z,width:route.width};
   for(let x=Math.floor((Math.min(a.x,c.x)-r)/CELL);x<=Math.floor((Math.max(a.x,c.x)+r)/CELL);x++)
    for(let z=Math.floor((Math.min(a.z,c.z)-r)/CELL);z<=Math.floor((Math.max(a.z,c.z)+r)/CELL);z++){
     const k=`${x},${z}`;if(!segments.has(k))segments.set(k,[]);segments.get(k).push(seg);
    }
   a=c;
  }
 }
 const ovalRx=SITE.width*.52,ovalRz=SITE.depth*.52;
 // Clearance for a crown of radius r: facades, pond promenades, kerbs/footways.
 const clear=(x,z,r)=>{
  for(const f of FACILITIES)if(Math.abs(x-f.x)<f.w*.5+2+r*.7&&Math.abs(z-f.z)<f.d*.5+2+r*.7)return false;
  for(const [lakeIndex,[lx,lz,rx,rz]] of LAKES.entries()){
   const a=Math.atan2((z-lz)/rz,(x-lx)/rx),s=shoreRadius(lakeIndex,-a),m=4.4+r*.45;
   if(((x-lx)/(rx*s+m))**2+((z-lz)/(rz*s+m))**2<1)return false;
  }
  for(const seg of segments.get(key(x,z))||[]){
   const dx=seg.bx-seg.ax,dz=seg.bz-seg.az,t=T.MathUtils.clamp(((x-seg.ax)*dx+(z-seg.az)*dz)/(dx*dx+dz*dz||1),0,1);
   if(Math.hypot(x-seg.ax-t*dx,z-seg.az-t*dz)<seg.width*.5+4.2+r*.3)return false;
  }
  return true;
 };
 const free=(x,z,r)=>{
  if(!clear(x,z,r))return false;
  const cx=Math.floor(x/CELL),cz=Math.floor(z/CELL);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const t of occupied.get(`${cx+dx},${cz+dz}`)||[])
   if(Math.hypot(x-t.x,z-t.z)<(r+t.r)*.72)return false;
  return true;
 };
 const pick=(mix)=>{let u=random();for(const [name,p] of mix){if((u-=p)<=0)return name;}return mix[0][0];};
 const trees=[];
 const plant=(x,z,zone)=>{
  const species=pick(ZONE_MIX[zone]),[h0,h1]=TREE_SPECIES[species].height,height=h0+random()*(h1-h0),width=.85+random()*.35;
  const r=height*CROWN_RATIO[species]*width;
  if(!free(x,z,r))return false;
  // The distant forest buffer uses the lighter templates of the same species.
  const template=zone==='forest'&&species!=='column'?species+'Lite':species;
  const t={x,z,r,species,template,height,width,pink:species==='cherry'};trees.push(t);
  const k=key(x,z);if(!occupied.has(k))occupied.set(k,[]);occupied.get(k).push(t);return true;
 };
 // Groves and open lawns: density follows low-frequency noise.
 const grove=valueNoise(71),groveAt=(x,z)=>grove(x/140,z/140)*.65+grove(x/47+11,z/47)*.35;
 for(let i=0;i<60000&&trees.length<treeInner;i++){
  const a=random()*Math.PI*2,rad=Math.sqrt(random())*.96;
  const x=Math.cos(a)*ovalRx*rad,z=Math.sin(a)*ovalRz*rad;
  if(random()>T.MathUtils.smoothstep(groveAt(x,z),.3,.62)*.95+.05)continue;
  plant(x,z,'campus');
 }
 const beltTarget=trees.length+treeBelt;
 for(let i=0;i<20000&&trees.length<beltTarget;i++){
  const a=random()*Math.PI*2,u=.92+random()*.20;
  plant(Math.cos(a)*ovalRx*u,Math.sin(a)*ovalRz*u,'belt');
 }
 for(let i=0;i<30000&&trees.length<beltTarget+treeOuter;i++){
  const a=random()*Math.PI*2,rad=565+random()*310,x=Math.cos(a)*rad*(SITE.width/SITE.depth),z=Math.sin(a)*rad;
  if(random()>T.MathUtils.smoothstep(groveAt(x,z),.25,.6))continue;
  plant(x,z,'forest');
 }

 // Understorey shrubs at crown edges, and planter shrubs beside facilities.
 const shrubs=[];
 for(let i=0;i<trees.length*2&&shrubs.length<1900;i++){
  const t=trees[Math.floor(random()*trees.length)];if(t.species==='column')continue;
  const a=random()*Math.PI*2,d=t.r*(.75+random()*.6),x=t.x+Math.cos(a)*d,z=t.z+Math.sin(a)*d;
  if(Math.hypot(x,z)>900||!clear(x,z,.2))continue;
  shrubs.push({x,z,y:outerTerrainHeight(x,z),s:.9+random()*1.1});
 }
 const soilMat=new T.MeshStandardMaterial({color:0x3a2e24,roughness:1,name:'planter-soil'});
 for(const f of FACILITIES){
  for(const side of [-1,1]){
   const px=f.x+side*(f.w/2+3.2);
   b.box('stone',px,.7,f.z,1.8,1.15,f.d*.5);
   b.box(soilMat,px,1.24,f.z,1.5,.1,f.d*.5-.3);
   const n=Math.max(3,Math.round(f.d*.5/2.2));
   for(let j=0;j<n;j++)shrubs.push({x:px+(random()-.5)*.3,z:f.z+((j+.5)/n-.5)*(f.d*.5-1.2),y:1.2,s:.7+random()*.45});
  }
 }

 // Site map: R = canopy shade/litter, G = moist margins near water.
 const siteSize=512,siteMin=new T.Vector2(-1024,-1024),siteExtent=new T.Vector2(2048,2048);
 const shadeField=new Float32Array(siteSize*siteSize),toPx=(x,z)=>[(x-siteMin.x)/siteExtent.x*siteSize,(z-siteMin.y)/siteExtent.y*siteSize];
 for(const t of trees){
  const [px,pz]=toPx(t.x,t.z),rp=t.r*1.15/siteExtent.x*siteSize,R=Math.ceil(rp*1.4);
  for(let y=Math.max(0,Math.floor(pz-R));y<=Math.min(siteSize-1,pz+R);y++)for(let x=Math.max(0,Math.floor(px-R));x<=Math.min(siteSize-1,px+R);x++){
   const d=Math.hypot(x-px,y-pz)/rp;if(d<1.4)shadeField[y*siteSize+x]+=Math.exp(-d*d*1.6);
  }
 }
 const siteTexture=dataTexture(siteSize,(data,S)=>{
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   const o=(y*S+x)*4,wx=siteMin.x+(x+.5)/S*siteExtent.x,wz=siteMin.y+(y+.5)/S*siteExtent.y;
   let moist=0;for(const [i,[lx,lz,rx,rz]] of LAKES.entries()){const q=Math.hypot((wx-lx)/(rx+30),(wz-lz)/(rz+30));moist=Math.max(moist,1-T.MathUtils.smoothstep(q,.75,1));}
   const edge=(x<2||y<2||x>S-3||y>S-3)?0:1;
   data[o]=Math.min(255,shadeField[y*S+x]*200)*edge;data[o+1]=moist*255*edge;data[o+2]=0;data[o+3]=255;
  }
 },{repeat:false});
 siteTexture.wrapS=siteTexture.wrapT=T.ClampToEdgeWrapping;
 const site={texture:siteTexture,min:siteMin,size:siteExtent,grass:grassDetailTexture()};

 // ---- Ground ----
 const terrain=new T.PlaneGeometry(18000,18000,160,160);terrain.rotateX(-Math.PI/2);
 const terrainPositions=terrain.attributes.position;
 // Preserve ~20m sampling around the forest; use only the outer 20% of grid
 // intervals for the distant apron. Uniform 112m cells made trees float above
 // the analytic hills used for root placement.
 const terrainAxis=(value,central)=>{const u=Math.abs(value)/9000;return Math.sign(value)*(u<=.8?u/.8*central:central+(u-.8)/.2*(9000-central));};
 for(let i=0;i<terrainPositions.count;i++){
  const x=terrainAxis(terrainPositions.getX(i),1400),z=terrainAxis(terrainPositions.getZ(i),1250);
  terrainPositions.setXYZ(i,x,outerTerrainHeight(x,z),z);
 }
 terrain.computeVertexNormals();
 // A continuous receiving surface extends beyond the far fog plane.
 const ground=new T.Mesh(terrain,groundMaterial(site));
 ground.receiveShadow=true;ground.name='forest-floor';root.add(ground);
 const oval=new T.Shape();oval.absellipse(0,0,SITE.width*.52,SITE.depth*.52,0,Math.PI*2,false,0);
 const ovalGeo=new T.ShapeGeometry(oval,64);ovalGeo.rotateX(-Math.PI/2);
 const campusPad=new T.Mesh(ovalGeo,groundMaterial(site,{stripes:1}));campusPad.position.y=.04;campusPad.receiveShadow=true;campusPad.name='campus-lawn';root.add(campusPad);

 // ---- Instanced trees and shrubs ----
 const templates=speciesTemplates(),dummy=new T.Object3D(),tint=new T.Color();
 const speciesMeshes={};
 for(const template of [...Object.keys(TREE_SPECIES),...Object.keys(TREE_SPECIES).map(s=>s+'Lite')]){
  const list=trees.filter(t=>t.template===template);if(!list.length)continue;
  const tpl=templates[template],species=list[0].species;
  const wood=new T.InstancedMesh(tpl.wood,barkMaterial(BARK[species]),list.length);
  const leaves=new T.InstancedMesh(tpl.leaves,botanicalMaterial(species,wind),list.length);
  wood.name=`${template}-trunks`;leaves.name=`${template}-canopy`;
  for(const m of [wood,leaves]){m.castShadow=true;m.receiveShadow=true;}
  list.forEach((t,i)=>{
   dummy.position.set(t.x,outerTerrainHeight(t.x,t.z)-.05,t.z);
   dummy.rotation.set(0,((t.x*.7+t.z*.9)%6.283+6.283)%6.283,0);
   dummy.scale.set(t.height*t.width,t.height,t.height*t.width*(.9+random()*.2));dummy.updateMatrix();
   wood.setMatrixAt(i,dummy.matrix);leaves.setMatrixAt(i,dummy.matrix);
   const tints=SPECIES_TINT[species],c=tints[Math.floor(random()*tints.length)],v=(species==='cherry'?.92:.76)+random()*.2;
   leaves.setColorAt(i,tint.setRGB(c[0]*v,c[1]*v,c[2]*v));
  });
  wood.computeBoundingSphere();leaves.computeBoundingSphere();
  root.add(wood,leaves);speciesMeshes[template]={wood,leaves,count:list.length};
 }
 {
  const shrubMesh=new T.InstancedMesh(templates.shrub.leaves,botanicalMaterial('shrub',wind),shrubs.length);
  shrubMesh.name='shrubs';shrubMesh.castShadow=true;shrubMesh.receiveShadow=true;
  shrubs.forEach((s,i)=>{
   dummy.position.set(s.x,s.y,s.z);dummy.rotation.set(0,random()*6.283,0);dummy.scale.set(s.s*(1+random()*.5),s.s*(.8+random()*.4),s.s*(1+random()*.5));dummy.updateMatrix();
   shrubMesh.setMatrixAt(i,dummy.matrix);const tints=SPECIES_TINT.shrub,c=tints[Math.floor(random()*tints.length)];shrubMesh.setColorAt(i,tint.setRGB(...c));
  });
  shrubMesh.computeBoundingSphere();root.add(shrubMesh);
 }

 // ---- Pond margins: rock clusters and emergent reeds in selected coves ----
 const rockGeo=new T.IcosahedronGeometry(1,1);{const p=rockGeo.attributes.position,rr=seeded(404);for(let i=0;i<p.count;i++){const k=.78+rr()*.4;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.62,p.getZ(i)*k);}rockGeo.computeVertexNormals();}
 const reedGeo=(()=>{const rr=seeded(808),pos=[],col=[];
  for(let j=0;j<11;j++){const a=rr()*6.283,d=rr()*.35,h=.9+rr()*.9,lean=(rr()-.5)*.35,w=.035,bx=Math.cos(a)*d,bz=Math.sin(a)*d,dx=Math.cos(a+1.57)*w,dz=Math.sin(a+1.57)*w,tx=bx+Math.cos(a)*lean,tz=bz+Math.sin(a)*lean;
   pos.push(bx-dx,0,bz-dz,bx+dx,0,bz+dz,tx,h,tz);const g=.75+rr()*.35,dry=rr()<.25;col.push(.12*g,.16*g,.06*g,.12*g,.16*g,.06*g,(dry?.34:.22)*g,(dry?.31:.28)*g,(dry?.16:.1)*g);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;})();
 const rocks=[],reeds=[];
 for(const [lakeIndex] of LAKES.entries()){
  const arcs=2+Math.floor(random()*2);
  for(let k=0;k<arcs;k++){
   const start=random()*Math.PI*2,span=.25+random()*.45,isReed=k%2===0;
   for(let a=start;a<start+span;a+=isReed?.018:.03){
    const inset=isReed?1.2+random()*2.2:.3+random()*.7,[x,z]=shorePoint(lakeIndex,a,-inset);
    if(channelClearance(x,z)<3)continue;
    (isReed?reeds:rocks).push({x,z,s:isReed?.8+random()*.5:.35+random()*.55,rot:random()*6.283});
   }
  }
 }
 const rockMesh=new T.InstancedMesh(rockGeo,stoneMaterial(0x8e8a80,'pond-rock'),rocks.length);rockMesh.name='pond-rocks';rockMesh.castShadow=true;rockMesh.receiveShadow=true;
 rocks.forEach((r,i)=>{dummy.position.set(r.x,.34,r.z);dummy.rotation.set(0,r.rot,0);dummy.scale.set(r.s*1.3,r.s,r.s);dummy.updateMatrix();rockMesh.setMatrixAt(i,dummy.matrix);});
 const reedMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.85,side:T.DoubleSide,name:'reeds'});
 const reedMesh=new T.InstancedMesh(reedGeo,reedMat,reeds.length);reedMesh.name='pond-reeds';reedMesh.castShadow=true;
 reeds.forEach((r,i)=>{dummy.position.set(r.x,.36,r.z);dummy.rotation.set(0,r.rot,0);dummy.scale.set(r.s,r.s,r.s);dummy.updateMatrix();reedMesh.setMatrixAt(i,dummy.matrix);});
 rockMesh.computeBoundingSphere();reedMesh.computeBoundingSphere();root.add(rockMesh,reedMesh);

 // ---- Street lamps ----
 const lampPosts=[];
 for(const r of roads){
  const n=lampEvery;
  for(let i=0;i<n;i++){
   const p=r.curve.getPoint(i/n),v=r.curve.getTangent(i/n);
   for(const side of [-1,1]){const x=p.x-v.z*(r.width/2+4.2)*side,z=p.z+v.x*(r.width/2+4.2)*side;if(!insideLake(x,z,4.5)&&channelClearance(x,z)>1)lampPosts.push({x,z});}
  }
 }
 const postMesh=new T.InstancedMesh(new T.BoxGeometry(.2,5,.2),materials.dark,lampPosts.length);
 const headMesh=new T.InstancedMesh(new T.BoxGeometry(1.15,.28,.9),materials.warm,lampPosts.length);
 for(let i=0;i<lampPosts.length;i++){
  const l=lampPosts[i];
  dummy.position.set(l.x,2.5,l.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();postMesh.setMatrixAt(i,dummy.matrix);
  dummy.position.set(l.x,5.05,l.z);dummy.updateMatrix();headMesh.setMatrixAt(i,dummy.matrix);
 }
 postMesh.name='lamps';headMesh.name='lamp-heads';root.add(postMesh,headMesh);

 // The references specify a forest buffer. Remove the invented 70-building
 // background district: repeating stepped towers confused the campus identity.

 root.add(b.finish('roads-gardens-street-furniture'));
 return {
  root,roads,kineticMats,
  // Existing per-frame hook (main.js calls landscape.update(clock)).
  update(t){wind.value=t;waterUniforms.uTime.value=t;kineticMats.forEach(m=>m.uniforms.uTime.value=t);},
  treeCount:trees.length,shrubCount:shrubs.length,
  species:Object.fromEntries(Object.entries(speciesMeshes).map(([k,v])=>[k,v.count])),
  trees,
 };
}

export function createInfrastructure(){
 const root=new T.Group(),b=new Batch(),net=new Batch(),energy=new Batch();root.name='infrastructure';
 const nodes=[];
 for(const [x,z] of SPIRES){
  cylinder(b,'stone',x,1.1,z,8.5,2.2);
  ring(b,'cyan',x,2.4,z,7.4,.4);
  cylinder(b,'blueGlass',x,28,z,1.6,52,.7,8);
  for(let a=0;a<6.28;a+=Math.PI/2)line(b,'stone',[[x+Math.sin(a)*5.2,2.2,z+Math.cos(a)*5.2],[x+Math.sin(a)*1.15,42,z+Math.cos(a)*1.15],[x,68,z]],.42);
  ring(b,'violet',x,48,z,7.2,.7);
  ring(b,'violet',x,50,z,5.2,.42);
  cylinder(b,'violet',x,64,z,.26,36,.08);
  ring(b,'kinetic',x,42,z,6.2,.28);
  nodes.push(new T.Vector3(x,48,z));
  for(let a=0;a<6.28;a+=Math.PI/3){
   const nx=x+Math.sin(a)*11,nz=z+Math.cos(a)*11;
   cylinder(b,'dark',nx,1.5,nz,.7,3);
   ring(b,'cyan',nx,3.1,nz,.78,.12);
  }
 }
 const paths=[];
 for(let i=0;i<nodes.length;i++){
  const a=nodes[i],others=nodes.map((n,j)=>({j,d:a.distanceTo(n)})).filter(o=>o.j>i).sort((a,b)=>a.d-b.d).slice(0,2);
  for(const {j} of others){
   const z=nodes[j],mid=a.clone().lerp(z,.5);mid.y+=8;
   paths.push(line(net,'cyan',[a.toArray(),mid.toArray(),z.toArray()],.2));
  }
 }
 const plant=FACILITIES.find(f=>f.id===21);const energyPaths=[];
 for(const f of FACILITIES){
  const pts=[[plant.x,1.15,plant.z],[278,1.15,280],[250,1.15,f.z+f.d/2+14],[f.x,1.15,f.z+f.d/2+14],[f.x,1.15,f.z+f.d/2]];
  energyPaths.push(line(energy,'gold',pts,.3));
 }
 for(let x=-422;x<-305;x+=14)for(let z=355;z<395;z+=11){b.box('solar',x,3.1,z,12,.42,8);b.box('stone',x,1.55,z,.42,3.1,.42);}
 for(let i=0;i<8;i++){b.box('white',360+i%4*8,2.8,373+Math.floor(i/4)*10,6,5.2,8);b.box('cyan',360+i%4*8,3.1,377+Math.floor(i/4)*10,4,.42,.12);}
 const turbines=[];
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2;
  const x=Math.cos(a)*580*(SITE.width/SITE.depth);
  const z=Math.sin(a)*580;
  cylinder(b,'white',x,26,z,.8,52,.45);
  const rotor=new T.Group();rotor.position.set(x,52,z);
  const airfoil=new T.Shape();airfoil.moveTo(-.42,.65);
  airfoil.bezierCurveTo(-1.3,3.2,-1.65,7.5,-.75,13);
  airfoil.bezierCurveTo(-.24,18.4,.04,22,.13,24);
  airfoil.bezierCurveTo(.62,22.4,.84,13.4,1.05,7.2);
  airfoil.bezierCurveTo(1.15,3.4,.5,1.1,.42,.65);airfoil.closePath();
  const bladeGeometry=new T.ExtrudeGeometry(airfoil,{depth:.14,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.055,bevelThickness:.055,curveSegments:10});
  for(let j=0;j<3;j++){
   const blade=new T.Mesh(bladeGeometry,materials.white);
   blade.rotation.z=-j*Math.PI*2/3;blade.castShadow=true;rotor.add(blade);
  }
  const hub=new T.Mesh(new T.CapsuleGeometry(.9,1.3,4,10),materials.white);hub.rotation.x=Math.PI/2;rotor.add(hub);
  root.add(rotor);turbines.push(rotor);
 }
 line(energy,'warm',[[108,1.1,-310],[-111,1.1,0],[-265,1.1,33]],.42);
 for(const [mat,pts] of [
  ['gold',[[-360,1.1,380],[-290,1.1,406],[278,1.1,406],[418,1.1,344]]],
  ['cyan',[[-377,1.1,-374],[460,1.1,-390],[478,1.1,340],[418,1.1,344]]],
  ['gold',[[495,1.1,375],[450,1.1,375],[418,1.1,344]]],
  ['leaf',[[195,1.1,365],[285,1.1,402],[418,1.1,344]]],
  ['cyan',[[376,1.1,383],[330,1.1,383],[330,1.1,319],[418,1.1,344]]],
  ['warm',[[330,1.1,319],[275,1.1,273],[250,1.1,28],[-111,1.1,39]]],
  ['kinetic',[[0,1.1,380],[-40,1.1,380],[-40,1.1,390]]],
 ])energyPaths.push(line(energy,mat,pts,.38));
 for(let x=-35;x<30;x+=3)for(let z=381;z<393;z+=3)b.box((x+z)%3?'dark':'cyan',x,.26,z,2.7,.22,2.7);
 for(let i=0;i<6;i++)ring(b,'gold',330+i*3,.55,364,1.05,.16);

 root.add(b.finish('mesh-spires-and-energy-sources'));
 const network=net.finish('wireless-mesh'),flows=energy.finish('energy-distribution');root.add(network,flows);
 const movers=[];
 for(const [curves,mat,count] of [[paths,materials.cyan,36],[energyPaths,materials.warm,56]]){
  const geo=new T.SphereGeometry(.95,8,6);const m=new T.InstancedMesh(geo,mat,count);root.add(m);
  movers.push({m,curves,count,network:mat===materials.cyan});
 }
 const dummy=new T.Object3D();
 return {
  root,network,flows,
  setNetwork(v){network.visible=v;movers[0].m.visible=v;},
  setEnergy(v){flows.visible=v;movers[1].m.visible=v;},
  update(t){
   for(const a of movers){
    for(let i=0;i<a.count;i++){
     const curve=a.curves[i%a.curves.length];
     if(!curve)continue;
     const p=curve.getPoint((t*.06+i*.071)%1);
     if(!p||!Number.isFinite(p.x))continue;
     dummy.position.copy(p);dummy.updateMatrix();a.m.setMatrixAt(i,dummy.matrix);
    }
    a.m.instanceMatrix.needsUpdate=true;
   }
   turbines.forEach((r,i)=>r.rotation.z=t*(.4+i*.03));
  },
 };
}
