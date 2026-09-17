// @ts-nocheck
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function paint(size, fn){
 const data=new Uint8Array(size*size*4);let seed=22035;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 fn(data,size,rand);
 const tex=new T.DataTexture(data,size,size);tex.needsUpdate=true;tex.wrapS=tex.wrapT=T.RepeatWrapping;
 tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;
 tex.generateMipmaps=true;return tex;
}
function setRGB(data,i,r,g,b,a=255){const o=i*4;data[o]=Math.max(0,Math.min(255,r));data[o+1]=Math.max(0,Math.min(255,g));data[o+2]=Math.max(0,Math.min(255,b));data[o+3]=a;}

export const textures={
 grass:paint(256,(data,size,rand)=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=(rand()-.5)*.8;setRGB(data,y*size+x,48+n*22+rand()*10,102+n*32+rand()*16,36+n*12);}}),
 bark:paint(128,(data,size,rand)=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){const v=58+Math.sin(x*.9)*10+rand()*28;setRGB(data,y*size+x,v,v*.78,v*.52);}}),
 canopy:paint(128,(data,size,rand)=>{for(let i=0;i<size*size;i++){const v=rand();setRGB(data,i,28+v*50,78+v*100,22+v*30);}}),
 blossom:paint(128,(data,size,rand)=>{for(let i=0;i<size*size;i++){const v=rand();setRGB(data,i,190+v*60,90+v*50,128+v*50);}}),
 asphalt:paint(256,(data,size,rand)=>{for(let i=0;i<size*size;i++){const v=38+rand()*18;setRGB(data,i,v,v+2,v+4);}}),
 limestone:paint(256,(data,size,rand)=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){const seam=(x%64<2||y%48<2)?-16:0;const n=(rand()-.5)*12+Math.sin((x+y)*.08)*3;setRGB(data,y*size+x,216+seam+n,209+seam+n,194+seam+n);}}),
 porcelain:paint(256,(data,size,rand)=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=(rand()-.5)*7+Math.sin(x*.04)*2;setRGB(data,y*size+x,235+n,238+n,233+n);}}),
 brushed:paint(256,(data,size,rand)=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){const streak=Math.sin(y*.7)*8+(rand()-.5)*10;setRGB(data,y*size+x,132+streak,145+streak,150+streak);}}),
 copper:paint(256,(data,size,rand)=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){const patina=Math.sin((x+y)*.03)*9+(rand()-.5)*12;setRGB(data,y*size+x,185+patina,112+patina*.45,66+patina*.25);}}),
 charcoal:paint(256,(data,size,rand)=>{for(let i=0;i<size*size;i++){const n=(rand()-.5)*16;setRGB(data,i,38+n,47+n,55+n);}}),
};

textures.grass.repeat.set(48,42);textures.asphalt.repeat.set(8,1);textures.limestone.repeat.set(3,3);textures.porcelain.repeat.set(4,4);textures.brushed.repeat.set(6,12);textures.copper.repeat.set(4,4);textures.charcoal.repeat.set(6,6);

function std(params){return new T.MeshStandardMaterial({envMapIntensity:1.05,...params});}
export const materials={
 steel:std({color:0xa8b2b6,metalness:.9,roughness:.24,map:textures.brushed}),
 glazing:std({color:0x93b5c0,metalness:.16,roughness:.08,transparent:true,opacity:.36,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.7}),
 magenta:std({color:0xe9a9ea,emissive:0xd769d6,emissiveIntensity:1.4,roughness:.4}),
 track:std({color:0x8a5d66,roughness:.92}),
 stone:std({color:0xe1dbcc,roughness:.68,map:textures.limestone}),
 dark:std({color:0x29323a,metalness:.52,roughness:.31,map:textures.charcoal}),
 glass:std({color:0x587a89,metalness:.32,roughness:.17,envMapIntensity:1.25}),
 gold:std({color:0xd8b76d,metalness:.83,roughness:.22,emissive:0x5e4319,emissiveIntensity:.32}),
 warm:std({color:0xffd89a,emissive:0xffb24a,emissiveIntensity:1.8,roughness:.36}),
 warmWin:std({color:0xffe2b0,emissive:0xffc066,emissiveIntensity:3.4,roughness:.28,metalness:.02}),
 cyan:std({color:0x6ef0f6,emissive:0x14d4e6,emissiveIntensity:2.6,roughness:.18}),
 violet:std({color:0xc8a6ff,emissive:0x8a4dff,emissiveIntensity:3.2,roughness:.2}),
 grass:std({color:0x4f8a3c,roughness:1,map:textures.grass,emissive:0x1a3a12,emissiveIntensity:.08}),
 road:std({color:0x2a3338,roughness:.96,map:textures.asphalt}),
 path:std({color:0xc9c0aa,roughness:.9,map:textures.limestone}),
 solar:std({color:0x123251,metalness:.82,roughness:.14,envMapIntensity:1.45}),
 white:std({color:0xf0f2ed,metalness:.18,roughness:.29,map:textures.porcelain}),
 leaf:std({color:0x3f7a34,roughness:1,map:textures.canopy,emissive:0x143010,emissiveIntensity:.1}),
 pink:std({color:0xe8a0be,roughness:1,map:textures.blossom,emissive:0x7a2848,emissiveIntensity:.42}),
 trunk:std({color:0x5a4a3a,roughness:1,map:textures.bark}),
 blueGlass:std({color:0x3a88b8,metalness:.55,roughness:.075,emissive:0x123a58,emissiveIntensity:.55,transparent:true,opacity:.78,envMapIntensity:1.85}),
 civic:std({color:0xddd5c7,roughness:.62,map:textures.limestone}),
 copper:std({color:0xc47a48,metalness:.66,roughness:.34,emissive:0x4a2410,emissiveIntensity:.18,map:textures.copper}),
 concrete:std({color:0x969b98,roughness:.82,map:textures.charcoal}),
 night:std({color:0x101820,roughness:.46,metalness:.26,map:textures.charcoal}),
 water:std({color:0x406969,metalness:.3,roughness:.16,envMapIntensity:1.4}),
 kinetic:std({color:0x00e8d4,emissive:0x00fff0,emissiveIntensity:5.2,roughness:.14}),
};

// Albedo maps contain the material color; do not multiply it a second time.
for(const name of ['steel','stone','dark','grass','road','path','white','leaf','pink','trunk','civic','copper','night']){
 materials[name].color.set(0xffffff);
}
materials.concrete.map=textures.porcelain;
for(const [name,scale] of [['stone',.012],['path',.012],['road',.006],['civic',.012],['copper',.002]]){
 materials[name].bumpMap=materials[name].map;materials[name].bumpScale=scale;
}

const paneGeo=new T.PlaneGeometry(1,1),horizontalPaneGeo=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const boxGeo=new T.BoxGeometry(1,1,1,1,1,1);const temp=new T.Object3D();
export class Batch{
 constructor(){this.items=new Map();}
 add(g,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0,rx=0){temp.position.set(x,y,z);temp.rotation.set(rx,ry,0);temp.scale.set(sx,sy,sz);temp.updateMatrix();const c=g.clone().applyMatrix4(temp.matrix);if(!c.index)c.setIndex(Array.from({length:c.attributes.position.count},(_,i)=>i));if(!c.attributes.uv)c.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(c.attributes.position.count*2),2));if(!this.items.has(mat))this.items.set(mat,[]);this.items.get(mat).push(c);}
 pane(mat,x,y,z,w,h,ry=0){this.add(paneGeo,mat,x,y,z,w,h,1,ry);}
 box(mat,x,y,z,w,h,d,ry=0){
  // Thin clear panes need one two-sided surface, not two superimposed tinted
  // faces plus invisible edges. Solid display cases and equipment stay volumetric.
  if(mat==='glazing'||(mat?.isMaterial&&mat.transparent&&mat.opacity<.5)){
   if(d<=.10){this.pane(mat,x,y,z,w,h,ry);return;}
   if(w<=.10){this.pane(mat,x,y,z,d,h,ry+Math.PI/2);return;}
   if(h<=.10){this.add(horizontalPaneGeo,mat,x,y,z,w,1,d,ry);return;}
  }
  this.add(boxGeo,mat,x,y,z,w,h,d,ry);
 }
 finish(name='assembly'){const group=new T.Group();group.name=name;for(const [mat,gs] of this.items){const g=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());const m=new T.Mesh(g,materials[mat]||mat);m.name=name+'-'+(typeof mat==='string'?mat:'surface');m.castShadow=!(m.material.transparent&&m.material.alphaTest===0);m.receiveShadow=true;group.add(m);}this.items.clear();return group;}
}
export function cylinder(batch,mat,x,y,z,r,h,rt=r,n=32){const g=new T.CylinderGeometry(rt,r,h,n,1,false);batch.add(g,mat,x,y,z);g.dispose();}
export function ring(batch,mat,x,y,z,r,t=.3,rx=Math.PI/2){const g=new T.TorusGeometry(r,t,8,72);batch.add(g,mat,x,y,z,1,1,1,0,rx);g.dispose();}
export function line(batch,mat,pts,r=.2){
 const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));
 let g;
 if(pts.length===2){
  // Straight rods need one axial segment, not twenty identical tube rings.
  const a=new T.Vector3(...pts[0]),c=new T.Vector3(...pts[1]),delta=c.clone().sub(a);
  g=new T.CylinderGeometry(r,r,delta.length(),8,1,false);
  if(delta.lengthSq()>0)g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
  g.translate(...a.add(c).multiplyScalar(.5).toArray());
 }else g=new T.TubeGeometry(curve,Math.max(12,pts.length*10),r,7,false);
 batch.add(g,mat);g.dispose();return curve;
}

export function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function sign(text,w=14,h=3,color='#f3dba5',{architectural=false}={}){
 const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d');
 if(!architectural){ctx.fillStyle='#09131d';ctx.fillRect(0,0,1024,192);ctx.strokeStyle='#00d9b5';ctx.lineWidth=6;ctx.strokeRect(6,6,1012,180);}
 ctx.fillStyle=color;ctx.font=`${architectural?'400 140':'600 48'}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,98,960);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
 return new T.Mesh(new T.PlaneGeometry(w,h,2,1),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false,transparent:architectural,depthWrite:!architectural}));
}

export function setDuskMaterials(dusk){
 // Light sources glow; masonry, foliage and curtain walls never emit light.
 materials.warm.emissiveIntensity=dusk?1.5:.12;
 materials.warmWin.emissiveIntensity=dusk?2:.12;
 materials.cyan.emissiveIntensity=dusk?1.3:.25;
 materials.violet.emissiveIntensity=dusk?1.4:.3;
 materials.gold.emissiveIntensity=dusk?.12:0;
 materials.kinetic.emissiveIntensity=dusk?1.3:.28;
 materials.magenta.emissiveIntensity=dusk?1:.18;
 for(const name of ['blueGlass','pink','leaf','grass','copper'])materials[name].emissiveIntensity=0;
}


export function kineticRoadMaterial(kind='cyan'){
 const glow=kind==='gold'?0xffc45a:0x3dfff4;
 const trim=kind==='gold'?0xfff3c4:0xffd078;
 return new T.ShaderMaterial({
  fog:false,toneMapped:false,
  uniforms:{uTime:{value:0},uAsphalt:{value:new T.Color(0x0c1418)},uGlow:{value:new T.Color(glow)},uGold:{value:new T.Color(trim)}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float uTime;uniform vec3 uAsphalt;uniform vec3 uGlow;uniform vec3 uGold;varying vec2 vUv;void main(){float edge=(1.-smoothstep(0.,.18,min(vUv.y,1.-vUv.y)));float inner=(1.-smoothstep(.12,.32,min(vUv.y,1.-vUv.y)));float center=(1.-smoothstep(0.,.05,abs(vUv.y-.5)));float dash=step(.42,fract(vUv.x*70.));float pulse=.7+.3*sin(uTime*2.1+vUv.x*22.);float flow=(1.-smoothstep(0.,.15,abs(fract(vUv.x*6.-uTime*.35)-.5)));vec3 col=uAsphalt;col+=uGlow*edge*4.2*pulse;col+=uGlow*inner*.85;col+=uGlow*flow*edge*2.2;col+=uGold*center*dash*1.8;float spec=pow(1.-abs(vUv.y-.5)*2.,5.)*.22;col+=vec3(spec);gl_FragColor=vec4(col,1.0);}`,
 });
}
