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
function setRGB(data,i,r,g,b,a=255){const o=i*4;data[o]=r;data[o+1]=g;data[o+2]=b;data[o+3]=a;}

export const textures={
 grass:paint(256,(data,size,rand)=>{
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const n=Math.sin(x*.17)*Math.cos(y*.13)+rand()*.55;
   const r=48+n*22+rand()*10,g=102+n*32+rand()*16,b=36+n*12;
   setRGB(data,y*size+x,r,g,b);
  }
 }),
 bark:paint(128,(data,size,rand)=>{
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const v=58+Math.sin(x*.9)*10+rand()*28;setRGB(data,y*size+x,v,v*.78,v*.52);
  }
 }),
 canopy:paint(128,(data,size,rand)=>{
  for(let i=0;i<size*size;i++){const v=rand();setRGB(data,i,28+v*50,78+v*100,22+v*30);}
 }),
 blossom:paint(128,(data,size,rand)=>{
  for(let i=0;i<size*size;i++){const v=rand();setRGB(data,i,190+v*60,90+v*50,128+v*50);}
 }),
 asphalt:paint(256,(data,size,rand)=>{
  for(let i=0;i<size*size;i++){const v=38+rand()*18;setRGB(data,i,v,v+2,v+4);}
 }),
};

textures.grass.repeat.set(48,42);
textures.asphalt.repeat.set(8,1);

function std(params){return new T.MeshStandardMaterial({envMapIntensity:.85,...params});}

export const materials={
 steel:std({color:0x9aa7ab,metalness:.88,roughness:.28}),
 glazing:std({color:0x6aa0ae,metalness:.22,roughness:.12,transparent:true,opacity:.38,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.4}),
 magenta:std({color:0xe9a9ea,emissive:0xd769d6,emissiveIntensity:1.4,roughness:.45}),
 track:std({color:0x8a5d66,roughness:.92}),
 stone:std({color:0xb7b4a6,roughness:.74}),
 dark:std({color:0x1b242c,metalness:.42,roughness:.38}),
 glass:std({color:0x1c3a48,metalness:.55,roughness:.16,envMapIntensity:1.35}),
 gold:std({color:0xd4b36a,metalness:.72,roughness:.32,emissive:0x6a4a18,emissiveIntensity:.35}),
 warm:std({color:0xffd89a,emissive:0xffb24a,emissiveIntensity:1.8,roughness:.42}),
 warmWin:std({color:0xffe2b0,emissive:0xffc066,emissiveIntensity:3.4,roughness:.38,metalness:.05}),
 cyan:std({color:0x6ef0f6,emissive:0x14d4e6,emissiveIntensity:2.6,roughness:.22}),
 violet:std({color:0xc8a6ff,emissive:0x8a4dff,emissiveIntensity:3.2,roughness:.25}),
 grass:std({color:0x4f8a3c,roughness:1,map:textures.grass,emissive:0x1a3a12,emissiveIntensity:.08}),
 road:std({color:0x2a3338,roughness:.96,map:textures.asphalt}),
 path:std({color:0xc4bba4,roughness:1}),
 solar:std({color:0x153656,metalness:.78,roughness:.18,envMapIntensity:1.2}),
 white:std({color:0xe8ebe4,metalness:.28,roughness:.34}),
 leaf:std({color:0x3f7a34,roughness:1,map:textures.canopy,emissive:0x143010,emissiveIntensity:.1}),
 pink:std({color:0xe8a0be,roughness:1,map:textures.blossom,emissive:0x7a2848,emissiveIntensity:.42}),
 trunk:std({color:0x5a4a3a,roughness:1,map:textures.bark}),
 blueGlass:std({color:0x3a88b8,metalness:.62,roughness:.1,emissive:0x123a58,emissiveIntensity:.55,transparent:true,opacity:.82,envMapIntensity:1.6}),
 civic:std({color:0xd8d0c2,roughness:.7}),
 copper:std({color:0xb06a3a,metalness:.65,roughness:.4,emissive:0x4a2010,emissiveIntensity:.15}),
 concrete:std({color:0x8a8f8c,roughness:.86}),
 night:std({color:0x101820,roughness:.5,metalness:.2}),
 water:std({color:0x1ec4d8,metalness:.84,roughness:.07,envMapIntensity:2.4,emissive:0x0a5870,emissiveIntensity:.62}),
 kinetic:std({color:0x00e8d4,emissive:0x00fff0,emissiveIntensity:5.2,roughness:.18}),
};

const boxGeo=new T.BoxGeometry(1,1,1);const temp=new T.Object3D();
export class Batch{
 constructor(){this.items=new Map();}
 add(g,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0,rx=0){
  temp.position.set(x,y,z);temp.rotation.set(rx,ry,0);temp.scale.set(sx,sy,sz);temp.updateMatrix();
  const c=g.clone().applyMatrix4(temp.matrix);
  if(!c.index)c.setIndex(Array.from({length:c.attributes.position.count},(_,i)=>i));
  if(!c.attributes.uv)c.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(c.attributes.position.count*2),2));
  if(!this.items.has(mat))this.items.set(mat,[]);this.items.get(mat).push(c);
 }
 box(mat,x,y,z,w,h,d,ry=0){this.add(boxGeo,mat,x,y,z,w,h,d,ry);}
 finish(name='assembly'){
  const group=new T.Group();group.name=name;
  for(const [mat,gs] of this.items){
   const g=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());
   const m=new T.Mesh(g,materials[mat]||mat);m.name=name+'-'+(typeof mat==='string'?mat:'surface');
   m.castShadow=true;m.receiveShadow=true;group.add(m);
  }
  this.items.clear();return group;
 }
}
export function cylinder(batch,mat,x,y,z,r,h,rt=r,n=24){const g=new T.CylinderGeometry(rt,r,h,n);batch.add(g,mat,x,y,z);g.dispose();}
export function ring(batch,mat,x,y,z,r,t=.3,rx=Math.PI/2){const g=new T.TorusGeometry(r,t,6,64);batch.add(g,mat,x,y,z,1,1,1,0,rx);g.dispose();}
export function line(batch,mat,pts,r=.2){const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));const g=new T.TubeGeometry(curve,Math.max(8,pts.length*8),r,5,false);batch.add(g,mat);g.dispose();return curve;}
export function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function sign(text,w=14,h=3,color='#f3dba5'){
 const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');
 ctx.fillStyle='#0a1822';ctx.fillRect(0,0,512,96);
 ctx.strokeStyle='#00d9b5';ctx.lineWidth=4;ctx.strokeRect(3,3,506,90);
 ctx.fillStyle=color;ctx.font='600 26px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,57,490);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false}));
}

export function setDuskMaterials(dusk){
 materials.warm.emissiveIntensity=dusk?3.4:.22;
 materials.warmWin.emissiveIntensity=dusk?5.6:.28;
 materials.cyan.emissiveIntensity=dusk?4.4:.7;
 materials.violet.emissiveIntensity=dusk?5.2:.85;
 materials.gold.emissiveIntensity=dusk?1.35:.12;
 materials.kinetic.emissiveIntensity=dusk?7.2:1.1;
 materials.blueGlass.emissiveIntensity=dusk?1.45:.28;
 materials.magenta.emissiveIntensity=dusk?2.6:.45;
 materials.pink.emissiveIntensity=dusk?.62:.18;
 materials.leaf.emissiveIntensity=dusk?.16:0;
 materials.grass.emissiveIntensity=dusk?.1:0;
}

export function kineticRoadMaterial(kind='cyan'){
 const glow=kind==='gold'?0xffc45a:0x3dfff4;
 const trim=kind==='gold'?0xfff3c4:0xffd078;
 return new T.ShaderMaterial({
  fog:false,toneMapped:false,
  uniforms:{
   uTime:{value:0},
   uAsphalt:{value:new T.Color(0x0c1418)},
   uGlow:{value:new T.Color(glow)},
   uGold:{value:new T.Color(trim)},
  },
  vertexShader:`
   varying vec2 vUv;
   void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,
  fragmentShader:`
   uniform float uTime;uniform vec3 uAsphalt;uniform vec3 uGlow;uniform vec3 uGold;
   varying vec2 vUv;
   void main(){
     float edge=smoothstep(.18,0.,min(vUv.y,1.-vUv.y));
     float inner=smoothstep(.32,.12,min(vUv.y,1.-vUv.y));
     float center=smoothstep(.05,0.,abs(vUv.y-.5));
     float dash=step(.42,fract(vUv.x*70.));
     float pulse=.7+.3*sin(uTime*2.1+vUv.x*22.);
     float flow=smoothstep(.15,0.,abs(fract(vUv.x*6.-uTime*.35)-.5));
     vec3 col=uAsphalt;
     col+=uGlow*edge*4.2*pulse;
     col+=uGlow*inner*.85;
     col+=uGlow*flow*edge*2.2;
     col+=uGold*center*dash*1.8;
     float spec=pow(1.-abs(vUv.y-.5)*2.,5.)*.22;
     col+=vec3(spec);
     gl_FragColor=vec4(col,1.0);
   }
  `,
  toneMapped:false,
 });
}
