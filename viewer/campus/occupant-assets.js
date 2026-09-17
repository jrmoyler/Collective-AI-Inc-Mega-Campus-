import * as T from 'three';
import pack from './occupant-meshes.json' with {type:'json'};
export const OCCUPANT_MATERIALS=pack.materials;
export const OCCUPANT_VARIANTS=pack.variants.map(v=>v.name);
const cache=new Map(),materials=new Map();
function array(spec){
 const bytes=Uint8Array.from(atob(spec.data),c=>c.charCodeAt(0));
 const Type=spec.type===5126?Float32Array:spec.type===5123?Uint16Array:Uint32Array;
 return new Type(bytes.buffer);
}
// Base buffers are immutable. InteriorKit.finish clones and bakes each placement.
export function occupantParts(index){
 const variant=((index%pack.variants.length)+pack.variants.length)%pack.variants.length;
 if(!cache.has(variant))cache.set(variant,pack.variants[variant].parts.map(part=>{
  const geometry=new T.BufferGeometry();
  for(const [key,size] of [['position',3],['normal',3],['uv',2]])geometry.setAttribute(key,new T.BufferAttribute(array(part[key]),size));
  geometry.setIndex(new T.BufferAttribute(array(part.index),1));
  if(!materials.has(part.material)){
   const p=pack.materials[part.material];
   materials.set(part.material,new T.MeshStandardMaterial({name:part.material,color:new T.Color(...p.color.slice(0,3)),roughness:p.roughness,side:p.doubleSided?T.DoubleSide:T.FrontSide,alphaTest:p.cutout?.45:0}));
  }
  return {geometry,material:materials.get(part.material),name:'occupant '+part.name};
 }));
 return cache.get(variant).map(part=>{const mesh=new T.Mesh(part.geometry,part.material);mesh.name=part.name;return mesh;});
}
