// @ts-nocheck
import * as T from 'three';
import {seeded} from './geometry.js';

// Street-level civil detail laid onto the swept carriageways built by
// landscape.js: continental zebra crossings and stop bars on every junction
// approach, tactile paving where the crossings meet the footway, kerb-side
// gully grates and cast-iron access covers. Every class is one InstancedMesh,
// so the whole campus streetscape costs five draw calls. Nothing here emits
// light: DESIGN.md keeps roadway emission inside the embedded guidance strip.

const ASPHALT_TOP=.16,WALK_TOP=.28;
export const STREETSCAPE_LIMITS={crossingStripe:1400,stopBar:160,tactile:320,gully:900,cover:260};

const WEAR=`
float ssHash(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+19.19);return fract(p.x*p.y);}
float ssNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
 return mix(mix(ssHash(i),ssHash(i+vec2(1,0)),u.x),mix(ssHash(i+vec2(0,1)),ssHash(i+vec2(1,1)),u.x),u.y);}
`;
function dataTexture(size,fn){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const v=fn((x+.5)/size,(y+.5)/size),o=(y*size+x)*4;data[o]=v;data[o+1]=v;data[o+2]=v;data[o+3]=255;}
 const tex=new T.DataTexture(data,size,size);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.generateMipmaps=true;
 tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.anisotropy=4;tex.needsUpdate=true;return tex;
}
// Instanced world position is reconstructed in the vertex stage so wear and
// aggregate stay fixed to the ground instead of stretching with each instance.
function worldVarying(shader){
 shader.vertexShader='varying vec3 vSsWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 ssLocal=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
  ssLocal=instanceMatrix*ssLocal;
 #endif
 vSsWorld=(modelMatrix*ssLocal).xyz;`);
 shader.fragmentShader='varying vec3 vSsWorld;\n'+WEAR+shader.fragmentShader;
}
// Thermoplastic road paint: tyre-worn patches let the asphalt show through.
function paintMaterial(color,name){
 // The swept asphalt uses a negative polygon offset; paint must win against it.
 const m=new T.MeshStandardMaterial({color,roughness:.62,metalness:0,envMapIntensity:.5,name,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-24});
 m.onBeforeCompile=s=>{worldVarying(s);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  float ssWear=ssNoise(vSsWorld.xz*1.7)*.6+ssNoise(vSsWorld.xz*7.3)*.4;
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.045,.047,.05),smoothstep(.62,.86,ssWear)*.85);
  diffuseColor.rgb*=.9+.14*ssNoise(vSsWorld.xz*23.0);`);};
 m.customProgramCacheKey=()=>'world-streetscape-paint';
 return m;
}
// Ductile iron: slotted grates and studded covers share one tiled pattern map.
function ironMaterial(pattern,name){
 const m=new T.MeshStandardMaterial({color:0x4a4846,map:pattern,bumpMap:pattern,bumpScale:1.2,roughness:.58,metalness:.55,envMapIntensity:.7,name,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-24});
 m.onBeforeCompile=s=>{worldVarying(s);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  diffuseColor.rgb*=mix(vec3(1.0),vec3(1.12,.92,.78),smoothstep(.55,.9,ssNoise(vSsWorld.xz*5.0)));`);};
 m.customProgramCacheKey=()=>'world-streetscape-iron';
 return m;
}
const slots=()=>dataTexture(64,(u,v)=>{const bar=Math.abs((u*7)%1-.5)<.3,frame=u<.06||u>.94||v<.06||v>.94;return frame?150:bar?132:18;});
const studs=()=>dataTexture(64,(u,v)=>{const r=Math.hypot(u-.5,v-.5);if(r>.47)return 70;const g=Math.abs((u*9)%1-.5)<.18&&Math.abs((v*9)%1-.5)<.18;return r>.42?150:g?168:104;});

// Placement only: returns plain records so tests can check clearances in Node.
// `blocked(x,z)` excludes footprints where a carriageway runs beneath a facility.
export function planStreetscape(roads,clearance,blocked=()=>false){
 const plan={crossingStripe:[],stopBar:[],tactile:[],gully:[],cover:[]};
 const random=seeded(6087);
 roads.forEach((road,ri)=>{
  const {samples,hw}=road,n=samples.length;
  const c=samples.map(p=>clearance(p.x,p.z,ri));
  const inJunction=c.map(v=>v<.8);
  const crossingAt=[];
  // Walk outward from each junction run until the other road's footway is
  // passed; centre the crossing there and set a stop bar further back.
  for(let i=1;i<n;i++){
   for(const [enter,dir] of [[!inJunction[i-1]&&inJunction[i],-1],[inJunction[i-1]&&!inJunction[i],1]]){
    if(!enter)continue;
    let j=dir<0?i-1:i;
    while(j>0&&j<n-1&&c[j]<4.6)j+=dir;
    if(c[j]<4.6||c[j]>7)continue;
    let k=j;while(k>0&&k<n-1&&c[k]<7.8)k+=dir;
    if(c[k]<7.8)continue;
    crossingAt.push(j);
    const p=samples[j],ang=Math.atan2(p.nz,p.nx);
    for(let o=-hw+.75;o<=hw-.7;o+=1.05)plan.crossingStripe.push({x:p.x+p.nx*o,z:p.z+p.nz*o,yaw:ang,len:3,wide:.5});
    for(const side of [-1,1])plan.tactile.push({x:p.x+p.nx*(hw+.75)*side,z:p.z+p.nz*(hw+.75)*side,yaw:ang,len:3,wide:.8});
    // Right-hand traffic: the stop bar spans the lane approaching the junction.
    // Approach heading is -dir along the tangent; its right side is -dir along the normal.
    const q=samples[k],o=-dir*hw*.5;
    plan.stopBar.push({x:q.x+q.nx*o,z:q.z+q.nz*o,yaw:Math.atan2(q.nz,q.nx),len:.4,wide:hw-.6});
   }
  }
  const nearCrossing=i=>crossingAt.some(j=>Math.abs(j-i)<4);
  // Gullies sit in the channel against each kerb, on a 22.5 m drainage pitch.
  for(let i=4;i<n-4;i+=9){
   if(c[i]<8||nearCrossing(i))continue;
   const p=samples[i],ang=Math.atan2(p.nz,p.nx);
   for(const side of [-1,1]){
    if(clearance(p.x+p.nx*(hw+1.5)*side,p.z+p.nz*(hw+1.5)*side,ri)<3.2)continue;
    plan.gully.push({x:p.x+p.nx*(hw-.38)*side,z:p.z+p.nz*(hw-.38)*side,yaw:ang,len:.9,wide:.42});
   }
  }
  // Utility access covers along the lane centres, deliberately irregular.
  for(let i=14;i<n-6;i+=26+Math.floor(random()*10)){
   if(c[i]<6||nearCrossing(i))continue;
   const p=samples[i],o=hw*.5*(random()<.5?-1:1);
   plan.cover.push({x:p.x+p.nx*o,z:p.z+p.nz*o,yaw:random()*Math.PI});
  }
 });
 for(const [k,limit] of Object.entries(STREETSCAPE_LIMITS)){plan[k]=plan[k].filter(p=>!blocked(p.x,p.z));if(plan[k].length>limit)plan[k].length=limit;}
 return plan;
}

export function createStreetscape(roads,clearance,blocked){
 const root=new T.Group();root.name='world-streetscape';
 const plan=planStreetscape(roads,clearance,blocked);
 const paint=paintMaterial(0xd8d5cb,'zebra-thermoplastic');
 const tactileMat=new T.MeshStandardMaterial({color:0xb08a3e,map:studs(),roughness:.78,name:'tactile-paving'});
 tactileMat.map.repeat.set(4,10);tactileMat.map.colorSpace=T.NoColorSpace;
 const grate=ironMaterial(slots(),'gully-grate'),cover=ironMaterial(studs(),'access-cover');
 const box=new T.BoxGeometry(1,1,1),disc=new T.CylinderGeometry(.36,.36,1,20);
 const dummy=new T.Object3D(),meshes={};
 const build=(name,geometry,material,list,y,h,scale)=>{
  const mesh=new T.InstancedMesh(geometry,material,Math.max(1,list.length));mesh.name=name;mesh.receiveShadow=true;
  list.forEach((p,i)=>{dummy.position.set(p.x,y,p.z);dummy.rotation.set(0,-p.yaw,0);dummy.scale.set(...scale(p,h));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.count=list.length;mesh.visible=list.length>0;mesh.computeBoundingSphere();root.add(mesh);meshes[name]=mesh;
 };
 // Box local X runs across the road (sample normal), Z along the road.
 build('zebra-crossings',box,paint,plan.crossingStripe,ASPHALT_TOP+.014,.012,(p,h)=>[p.wide,h,p.len]);
 build('stop-bars',box,paint,plan.stopBar,ASPHALT_TOP+.014,.012,(p,h)=>[p.wide,h,p.len]);
 build('tactile-paving',box,tactileMat,plan.tactile,WALK_TOP+.008,.016,(p,h)=>[p.wide,h,p.len]);
 build('gully-grates',box,grate,plan.gully,ASPHALT_TOP+.012,.012,(p,h)=>[p.wide,h,p.len]);
 build('access-covers',disc,cover,plan.cover,ASPHALT_TOP+.012,.012,(p,h)=>[1,h,1]);
 root.userData.counts=Object.fromEntries(Object.entries(plan).map(([k,v])=>[k,v.length]));
 return {root,plan,meshes};
}
