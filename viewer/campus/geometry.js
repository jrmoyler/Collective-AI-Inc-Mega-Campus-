import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const materials={
 stone:new T.MeshStandardMaterial({color:0xc8c1a8,roughness:.78}),dark:new T.MeshStandardMaterial({color:0x18252b,metalness:.55,roughness:.4}),
 glass:new T.MeshStandardMaterial({color:0x34697d,metalness:.7,roughness:.2}),gold:new T.MeshStandardMaterial({color:0xbda572,metalness:.65,roughness:.36}),
 warm:new T.MeshStandardMaterial({color:0xf6d69a,emissive:0xf6ba62,emissiveIntensity:.75,roughness:.5}),cyan:new T.MeshStandardMaterial({color:0x74e2ee,emissive:0x20bdd9,emissiveIntensity:1.8}),
 violet:new T.MeshStandardMaterial({color:0xbe9df6,emissive:0x964aff,emissiveIntensity:2}),grass:new T.MeshStandardMaterial({color:0x446347,roughness:1}),
 road:new T.MeshStandardMaterial({color:0x3c4549,roughness:.96}),path:new T.MeshStandardMaterial({color:0xb4af98,roughness:1}),solar:new T.MeshStandardMaterial({color:0x203d62,metalness:.65,roughness:.25}),
 white:new T.MeshStandardMaterial({color:0xe3e5df,metalness:.3,roughness:.36}),leaf:new T.MeshStandardMaterial({color:0x476738,roughness:1}),pink:new T.MeshStandardMaterial({color:0xc4849c,roughness:1}),trunk:new T.MeshStandardMaterial({color:0x514738,roughness:1})};
const boxGeo=new T.BoxGeometry(1,1,1);const temp=new T.Object3D();
export class Batch{
 constructor(){this.items=new Map();}
 add(g,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0,rx=0){temp.position.set(x,y,z);temp.rotation.set(rx,ry,0);temp.scale.set(sx,sy,sz);temp.updateMatrix();const c=g.clone().applyMatrix4(temp.matrix);if(!this.items.has(mat))this.items.set(mat,[]);this.items.get(mat).push(c);}
 box(mat,x,y,z,w,h,d,ry=0){this.add(boxGeo,mat,x,y,z,w,h,d,ry);}
 finish(name='assembly'){const group=new T.Group();group.name=name;for(const [mat,gs] of this.items){const g=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());const m=new T.Mesh(g,materials[mat]||mat);m.name=name+'-'+(typeof mat==='string'?mat:'surface');m.castShadow=true;m.receiveShadow=true;group.add(m);}this.items.clear();return group;}
}
export function cylinder(batch,mat,x,y,z,r,h,rt=r,n=24){const g=new T.CylinderGeometry(rt,r,h,n);batch.add(g,mat,x,y,z);g.dispose();}
export function ring(batch,mat,x,y,z,r,t=.3,rx=Math.PI/2){const g=new T.TorusGeometry(r,t,6,64);batch.add(g,mat,x,y,z,1,1,1,0,rx);g.dispose();}
export function line(batch,mat,pts,r=.2){const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));const g=new T.TubeGeometry(curve,Math.max(8,pts.length*8),r,5,false);batch.add(g,mat);g.dispose();return curve;}
export function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function sign(text,w=14,h=3,color='#f3dba5'){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#10222b';ctx.fillRect(0,0,512,96);ctx.fillStyle=color;ctx.font='600 26px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,57,490);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));return m;}
