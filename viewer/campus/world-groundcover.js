// @ts-nocheck
import * as T from 'three';
import {seeded} from './geometry.js';

// Herbaceous layer beneath the tree and shrub canopy: grass tussocks, pink and
// white flowering perennials, ferns and pond-margin sedges. One alpha-tested
// atlas, one crossed-card clump and ONE InstancedMesh for the entire campus.
// The CPU keeps only clumps within GROUNDCOVER_RANGE of the camera (bucketed,
// recompacted when the eye moves); the vertex shader shrinks clumps into the
// ground near that range so nothing pops, and sways them with the shared wind
// clock. No particles, no billboards that turn to face the camera.

export const GROUNDCOVER_RANGE=150;
export const GROUNDCOVER_KINDS={grass:0,blossom:1,fern:2,meadow:3};
const ATLAS=512,CELL=256,BUCKET=40;

function paintAtlas(){
 const S=ATLAS,data=new Uint8Array(S*S*4),random=seeded(31871),sums=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
 const put=(cell,x,y,r,g,b)=>{x=Math.round(x);y=Math.round(y);if(x<1||y<1||x>=CELL-1||y>=CELL-1)return;
  const o=((Math.floor(cell/2)*CELL+y)*S+(cell%2)*CELL+x)*4;data[o]=Math.max(0,Math.min(255,r));data[o+1]=Math.max(0,Math.min(255,g));data[o+2]=Math.max(0,Math.min(255,b));data[o+3]=255;};
 // A tapered, arching blade from the clump base; darker at the root.
 const blade=(cell,x0,len,lean,width,[r,g,b])=>{
  const steps=Math.ceil(len*1.4);
  for(let i=0;i<=steps;i++){const t=i/steps,x=x0+lean*t*t*len,y=CELL-3-t*len*(1-.18*t*Math.abs(lean)),w=width*(1-t*.85),k=.55+.6*t;
   for(let o=-w;o<=w;o+=.5)put(cell,x+o,y,r*k,g*k,b*k);}
 };
 const disc=(cell,cx,cy,rad,[r,g,b])=>{for(let y=-rad;y<=rad;y++)for(let x=-rad;x<=rad;x++){const d=Math.hypot(x,y)/rad;if(d<=1)put(cell,cx+x,cy+y,r*(1.05-.25*d),g*(1.05-.25*d),b*(1.05-.25*d));}};
 const flower=(cell,cx,cy,size,petal)=>{for(let p=0;p<5;p++){const a=p*1.2566+random();disc(cell,cx+Math.cos(a)*size*.55,cy+Math.sin(a)*size*.55,size*.5,petal);}disc(cell,cx,cy,size*.28,[232,206,120]);};
 const jitter=(c,a)=>c.map(v=>v+(random()-.5)*a);
 const C=CELL/2;
 // 0 tussock grass.
 for(let i=0;i<120;i++){const tone=random();blade(0,C+(random()-.5)*60,90+random()*140,(random()-.5)*1.3,2.2+random()*1.6,jitter(tone<.25?[120,128,58]:tone<.7?[78,104,44]:[56,80,34],18));}
 // 1 flowering perennial: strappy leaves with pink blossom heads.
 for(let i=0;i<60;i++)blade(1,C+(random()-.5)*80,50+random()*80,(random()-.5)*1.6,2.6,jitter([70,98,44],16));
 for(let i=0;i<46;i++){const x=C+(random()-.5)*200,y=40+random()*120;blade(1,x,CELL-y-6,0,1,[66,90,40]);const tone=random();flower(1,x,y,9+random()*6,jitter(tone<.4?[240,168,192]:tone<.8?[226,128,166]:[250,214,226],14));}
 // 2 fern: arching fronds with paired pinnae.
 for(let f=0;f<9;f++){
  const ang=-Math.PI/2+(f/8-.5)*2.5,len=95+random()*30,col=jitter([66,104,46],14);
  for(let t=0;t<1;t+=.012){const bend=ang+t*t*.9*Math.sign(Math.cos(ang)),x=C+Math.cos(bend)*len*t,y=CELL-6+Math.sin(bend)*len*t;
   put(2,x,y,...col.map(v=>v*.7));const pin=(1-t)*15+3,na=bend+Math.PI/2;
   if(Math.round(t*83)%2===0)for(const s of [-1,1])for(let k=0;k<pin;k+=.7)put(2,x+Math.cos(na)*k*s+Math.cos(bend)*k*.35,y+Math.sin(na)*k*s+Math.sin(bend)*k*.35,...col.map(v=>v*(.85+.3*k/pin)));}
 }
 // 3 meadow mix: fine grasses with white and violet florets.
 for(let i=0;i<90;i++)blade(3,C+(random()-.5)*110,60+random()*120,(random()-.5)*1.1,1.4,jitter([92,118,52],18));
 for(let i=0;i<70;i++){const x=C+(random()-.5)*210,y=30+random()*150,tone=random();flower(3,x,y,4+random()*3,tone<.55?[246,244,236]:tone<.85?[176,150,214]:[244,200,92]);}
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const o=(y*S+x)*4,cell=(y>=CELL?2:0)+(x>=CELL?1:0);if(data[o+3]){sums[cell][0]+=data[o];sums[cell][1]+=data[o+1];sums[cell][2]+=data[o+2];sums[cell][3]++;}}
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const o=(y*S+x)*4;if(!data[o+3]){const s=sums[(y>=CELL?2:0)+(x>=CELL?1:0)],n=Math.max(1,s[3]);data[o]=s[0]/n;data[o+1]=s[1]/n;data[o+2]=s[2]/n;}}
 const tex=new T.DataTexture(data,S,S);tex.colorSpace=T.SRGBColorSpace;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.anisotropy=4;tex.needsUpdate=true;
 return tex;
}
let atlas=null;
export function groundcoverAtlas(){return atlas||(atlas=paintAtlas());}

// Three vertical cards crossed at 60 degrees, unit height and width. UVs address
// cell 0; the per-instance `cell` attribute shifts them to the chosen plant.
export function clumpGeometry(){
 const pos=[],uv=[],nrm=[],col=[],idx=[];
 for(let c=0;c<3;c++){
  const a=c*Math.PI/3,dx=Math.cos(a)*.5,dz=Math.sin(a)*.5,base=pos.length/3;
  for(const [s,v] of [[-1,0],[1,0],[1,1],[-1,1]]){
   // Painted plants grow upward from the bottom row of each cell (v=.496).
   pos.push(dx*s,v,dz*s);uv.push(s<0?.004:.496,v?.004:.496);
   // Normals lean skyward so clumps take the light like the lawn around them.
   nrm.push(Math.sin(a)*.25*s,.95,-Math.cos(a)*.25*s);
   const ao=.55+.45*v;col.push(ao,ao,ao);
  }
  idx.push(base,base+1,base+2,base,base+2,base+3);
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.setAttribute('normal',new T.Float32BufferAttribute(nrm,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));
 g.setIndex(idx);g.computeBoundingSphere();return g;
}

export function groundcoverMaterial(wind,range=GROUNDCOVER_RANGE){
 const m=new T.MeshStandardMaterial({color:0xffffff,map:groundcoverAtlas(),alphaTest:.5,side:T.DoubleSide,vertexColors:true,roughness:.92,metalness:0,envMapIntensity:.3,name:'groundcover'});
 const windUniform=wind||{value:0};
 m.onBeforeCompile=s=>{
  s.uniforms.groundTime=windUniform;s.uniforms.groundRange={value:range};
  s.vertexShader='uniform float groundTime;uniform float groundRange;attribute float cell;\n'+s.vertexShader
   .replace('#include <uv_vertex>',`#include <uv_vertex>
   #ifdef USE_MAP
    vMapUv+=vec2(mod(cell,2.0)*.5,floor(cell/2.0)*.5);
   #endif`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 gcOrigin=vec3(0.0);
   #ifdef USE_INSTANCING
    gcOrigin=(modelMatrix*vec4(instanceMatrix[3].xyz,1.0)).xyz;
   #endif
   // Sink into the ground approaching the culling range instead of popping.
   float gcFade=1.0-smoothstep(groundRange*.62,groundRange*.95,distance(cameraPosition,gcOrigin));
   float gcPhase=groundTime*1.3+gcOrigin.x*.09+gcOrigin.z*.07;
   float gcBend=position.y*position.y;
   transformed.x+=(sin(gcPhase)*.06+sin(gcPhase*2.3+gcOrigin.z)*.025)*gcBend;
   transformed.z+=cos(gcPhase*.8)*.045*gcBend;
   transformed*=vec3(1.0,gcFade,1.0)*mix(.4,1.0,gcFade);`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
   #ifdef DOUBLE_SIDED
    normal*=faceDirection;
   #endif`);
 };
 m.customProgramCacheKey=()=>'world-groundcover';
 return m;
}

// Scatter the herbaceous layer. `clear(x,z,r)` is the landscape planting test
// (facades, water, carriageways); `shore(i,a,extra)` the basin outline.
export function planGroundcover({trees,clear,lakes,shore,inside,limit=40000,seed=5307}){
 const random=seeded(seed),out=[];
 const add=(x,z,kind,height,width)=>{if(out.length<limit)out.push({x,z,kind,height,width,yaw:random()*Math.PI*2,tone:.82+random()*.3});};
 const K=GROUNDCOVER_KINDS;
 // Woodland floor ring under campus trees; cherries carry pink drifts.
 for(const t of trees){
  if(!inside(t.x,t.z))continue;
  const n=t.species==='column'?3:9;
  for(let j=0;j<n;j++){
   const a=random()*Math.PI*2,d=t.r*(.25+random()*.8),x=t.x+Math.cos(a)*d,z=t.z+Math.sin(a)*d;
   if(!clear(x,z,.3))continue;
   const kind=t.species==='cherry'&&random()<.6?K.blossom:t.species==='conifer'||random()<.45?K.fern:K.grass;
   add(x,z,kind,kind===K.fern?.6+random()*.4:.55+random()*.45,kind===K.fern?1.2+random()*.6:1+random()*.6);
  }
 }
 // Meadow drifts in open lawn: low-frequency patches, not uniform noise.
 const h=(x,z)=>{let n=(Math.floor(x)*374761393+Math.floor(z)*668265263)|0;n=(n^(n>>>13))*1274126177|0;return((n^(n>>>16))>>>0)/4294967296;};
 const vn=(x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return (h(xi,zi)*(1-u)+h(xi+1,zi)*u)*(1-v)+(h(xi,zi+1)*(1-u)+h(xi+1,zi+1)*u)*v;};
 for(let i=0;i<90000&&out.length<limit*.86;i++){
  const a=random()*Math.PI*2,r=Math.sqrt(random()),x=Math.cos(a)*r*560,z=Math.sin(a)*r*480;
  if(!inside(x,z))continue;
  const drift=vn(x/38,z/38)*.7+vn(x/11+5,z/11)*.3;if(drift<.5)continue;
  if(!clear(x,z,.4))continue;
  const flowers=vn(x/23+19,z/23)>.5;
  const kind=flowers?(vn(x/9,z/9+7)>.55?K.blossom:K.meadow):K.grass;
  add(x,z,kind,.45+random()*.4,.9+random()*.6);
 }
 // Sedges and flowering margins beyond each pond promenade.
 for(const [i] of lakes.entries()){
  for(let a=0;a<Math.PI*2;a+=.012){
   const [x,z]=shore(i,a,4.8+random()*3.2);
   if(!clear(x,z,.3))continue;
   const kind=random()<.75?K.grass:K.meadow;
   add(x,z,kind,.7+random()*.5,.9+random()*.4);
  }
 }
 return out;
}

export function createGroundcover(plan,{wind,range=GROUNDCOVER_RANGE}={}){
 const geometry=clumpGeometry(),count=plan.length;
 const cellAttr=new T.InstancedBufferAttribute(new Float32Array(Math.max(1,count)),1);cellAttr.setUsage(T.DynamicDrawUsage);
 geometry.setAttribute('cell',cellAttr);
 const mesh=new T.InstancedMesh(geometry,groundcoverMaterial(wind,range),Math.max(1,count));
 mesh.name='groundcover';mesh.receiveShadow=true;mesh.castShadow=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
 // Bake every clump's matrix/colour once; buckets index them by 40 m cell.
 const matrices=new Float32Array(count*16),colors=new Float32Array(count*3),cells=new Float32Array(count),buckets=new Map();
 const dummy=new T.Object3D(),tint=[[1,1,1],[1.06,1.02,.84],[.86,.94,.86],[1.02,.98,1.02]];
 plan.forEach((p,i)=>{
  dummy.position.set(p.x,.03,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.width,p.height,p.width);dummy.updateMatrix();
  dummy.matrix.toArray(matrices,i*16);const c=tint[(i*7)%tint.length];colors.set([c[0]*p.tone,c[1]*p.tone,c[2]*p.tone],i*3);cells[i]=p.kind;
  const k=`${Math.floor(p.x/BUCKET)},${Math.floor(p.z/BUCKET)}`;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(i);
 });
 mesh.setColorAt(0,new T.Color(1,1,1));mesh.instanceColor.setUsage(T.DynamicDrawUsage);
 mesh.count=0;mesh.visible=false;
 const last=new T.Vector3(Infinity,0,0),R=Math.ceil(range/BUCKET);
 const eye=new T.Vector3();let eyeKnown=false;
 const refresh=position=>{
  if(last.distanceToSquared(position)<16)return mesh.count;
  last.copy(position);
  let n=0;
  // Out of range vertically (aerial views) nothing near the ground is drawn.
  if(Math.abs(position.y)<range){
   const cx=Math.floor(position.x/BUCKET),cz=Math.floor(position.z/BUCKET),r2=range*range;
   const M=mesh.instanceMatrix.array,C=mesh.instanceColor.array,L=cellAttr.array;
   for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++)for(const i of buckets.get(`${cx+dx},${cz+dz}`)||[]){
    const x=matrices[i*16+12],z=matrices[i*16+14];
    if((x-position.x)**2+(z-position.z)**2+position.y**2>r2)continue;
    M.set(matrices.subarray(i*16,i*16+16),n*16);C.set(colors.subarray(i*3,i*3+3),n*3);L[n]=cells[i];n++;
   }
  }
  mesh.count=n;mesh.visible=n>0;
  mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,n*16);mesh.instanceMatrix.needsUpdate=true;
  mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,n*3);mesh.instanceColor.needsUpdate=true;
  cellAttr.clearUpdateRanges();cellAttr.addUpdateRange(0,n);cellAttr.needsUpdate=true;
  if(n){mesh.boundingSphere=mesh.boundingSphere||new T.Sphere();mesh.boundingSphere.center.set(position.x,0,position.z);mesh.boundingSphere.radius=range+2;}
  return n;
 };
 // The eye is supplied by the caller, or captured from the last perspective
 // render of `probe` (a mesh that is always drawn, e.g. the ground).
 const attach=probe=>{const prior=probe.onBeforeRender;probe.onBeforeRender=function(r,s,camera,...rest){if(camera.isPerspectiveCamera){eye.setFromMatrixPosition(camera.matrixWorld);eyeKnown=true;}return prior.call(this,r,s,camera,...rest);};};
 return {mesh,count,refresh,attach,update(position){if(position)return refresh(position);if(eyeKnown)return refresh(eye);return 0;}};
}
