import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {seeded} from './geometry.js';

// One reusable botanical crown: individually folded leaves, open branch structure,
// and wind driven in the vertex shader. No solid canopy volumes or image cards.
export function botanicalGeometry(){
 const random=seeded(86721),positions=[],normals=[],colors=[];
 const branches=[],up=new T.Vector3(0,1,0);
 function branch(a,b,r){
  const d=b.clone().sub(a),g=new T.CylinderGeometry(r*.35,r,d.length(),6,1);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,d.normalize()));
  g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());branches.push(g);
 }
 branch(new T.Vector3(0,0,0),new T.Vector3(.03,1.36,0),.058);
 for(let j=0;j<14;j++){
  const a=j*2.39996,level=.65+j/14*.85;
  const base=new T.Vector3(.015,level*.75,0);
  const tip=new T.Vector3(Math.cos(a)*(.46+random()*.3),level+.25,Math.sin(a)*(.46+random()*.3));
  branch(base,tip,.023);
  for(let k=0;k<10;k++){
   const t=.35+random()*.7,center=base.clone().lerp(tip,t);
   center.x+=(random()-.5)*.42;center.z+=(random()-.5)*.42;center.y+=random()*.23;
   const yaw=random()*Math.PI*2,pitch=(random()-.5)*1.3;
   const q=new T.Quaternion().setFromEuler(new T.Euler(pitch,yaw,.2));
   const len=.12+random()*.16,w=len*.48;
   const verts=[new T.Vector3(0,0,-len),new T.Vector3(-w,-.03,0),new T.Vector3(0,.025,0),new T.Vector3(w,-.03,0),new T.Vector3(0,0,len)];
   verts.forEach(v=>v.applyQuaternion(q).add(center));
   for(const ids of [[0,1,2],[0,2,3],[2,1,4],[3,2,4]]){
    const n=new T.Vector3().subVectors(verts[ids[1]],verts[ids[0]]).cross(new T.Vector3().subVectors(verts[ids[2]],verts[ids[0]])).normalize();
    const shade=.68+random()*.32;
    for(const id of ids){positions.push(...verts[id].toArray());normals.push(...n.toArray());colors.push(shade,shade,shade);}
   }
  }
 }
 const leaves=new T.BufferGeometry();leaves.setAttribute('position',new T.Float32BufferAttribute(positions,3));leaves.setAttribute('normal',new T.Float32BufferAttribute(normals,3));leaves.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const wood=mergeGeometries(branches);branches.forEach(g=>g.dispose());
 return {leaves,wood};
}
export function botanicalMaterial(pink,wind){
 const m=new T.MeshStandardMaterial({color:pink?0xd4a0ad:0x63804a,roughness:.94,side:T.DoubleSide,vertexColors:true});
 m.onBeforeCompile=s=>{
  s.uniforms.botanicalTime=wind;
  s.vertexShader='uniform float botanicalTime;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 botanicalOrigin = vec3(0.0);
   #ifdef USE_INSTANCING
    botanicalOrigin = instanceMatrix[3].xyz;
   #endif
   float windWeight = smoothstep(0.6, 1.65, position.y);
   transformed.x += sin(botanicalTime*1.1 + botanicalOrigin.x*.08 + botanicalOrigin.z*.07 + position.y*3.0)*.025*windWeight;
   transformed.z += cos(botanicalTime*.8 + botanicalOrigin.z*.09)*.016*windWeight;`);
 };
 return m;
}
