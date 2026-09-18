// @ts-nocheck
import * as T from 'three';
import {botanicalGeometry,botanicalMaterial} from './botanical.js';
import {Batch,materials,cylinder,ring,line,seeded,kineticRoadMaterial,textures} from './geometry.js';
import {FACILITIES,SPIRES,LAKES,SITE} from './data.js';

const haloMat=new T.MeshBasicMaterial({
 color:0x8fcfc4,transparent:true,opacity:.12,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,side:T.DoubleSide,
});
const goldHaloMat=new T.MeshBasicMaterial({
 color:0xe1c18b,transparent:true,opacity:.15,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,side:T.DoubleSide,
});

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

function stem(batch,mat,pts,r=.04){
 const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));
 const g=new T.TubeGeometry(curve,pts.length>4?16:5,r,4,false);batch.add(g,mat);g.dispose();
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

export function createLandscape(){
 const root=new T.Group();root.name='landscape';const b=new Batch();const random=seeded(22035);
 const kineticMats=[];
 const treeInner=1200,treeOuter=650,lampEvery=28;
 const wind={value:0};

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
 // A continuous receiving surface extends beyond the far fog plane. The old
 // 2.8 km rectangle exposed a hard purple horizon in the opening camera.
 const terrainMaterial=materials.grass.clone();terrainMaterial.map=textures.grass.clone();
 terrainMaterial.map.repeat.set(750,750);terrainMaterial.emissiveIntensity=0;
 const ground=new T.Mesh(terrain,terrainMaterial);
ground.receiveShadow=true;ground.name='forest-floor';root.add(ground);

 const oval=new T.Shape();oval.absellipse(0,0,SITE.width*.52,SITE.depth*.52,0,Math.PI*2,false,0);
 const ovalGeo=new T.ShapeGeometry(oval,64);ovalGeo.rotateX(-Math.PI/2);
 const campusMat=materials.grass.clone();campusMat.map=textures.grass.clone();campusMat.map.repeat.set(1,1);campusMat.emissiveIntensity=0;
 const lawnUv=ovalGeo.attributes.uv,lawnPos=ovalGeo.attributes.position;for(let i=0;i<lawnUv.count;i++)lawnUv.setXY(i,lawnPos.getX(i)/24,lawnPos.getZ(i)/24);
 const campusPad=new T.Mesh(ovalGeo,campusMat);campusPad.position.y=.04;campusPad.receiveShadow=true;campusPad.name='campus-lawn';root.add(campusPad);

 const roads=[];
 function road(pts,width=12,closed=false,kind='cyan'){
  const curve=new T.CatmullRomCurve3(pts.map(([x,z])=>new T.Vector3(x,.22,z)),closed,'catmullrom',.25);
  const {g}=ribbon(pts,.32,closed,.24);
  roads.push({curve,width});
  const base=ribbon(pts,width+1.4,closed,.16);
  const asphalt=new T.Mesh(base.g,materials.road);asphalt.receiveShadow=true;root.add(asphalt);
  const stripes=Math.ceil(curve.getLength()/13);
  for(let i=0;i<stripes;i++){
   const p=curve.getPoint(i/stripes),v=curve.getTangent(i/stripes),angle=Math.atan2(v.x,v.z);
   for(const side of [-1,1])b.box('stone',p.x-v.z*width*.38*side,.235,p.z+v.x*width*.38*side,.14,.014,3.4,angle);
  }
  const mat=kineticRoadMaterial(kind);kineticMats.push(mat);
  const m=new T.Mesh(g,mat);m.receiveShadow=true;m.name=kind==='gold'?'gold-ring-road':'kinetic-road';root.add(m);
  const haloR=ribbon(pts,.72,closed,.25);
  const halo=new T.Mesh(haloR.g,kind==='gold'?goldHaloMat:haloMat);halo.name=kind==='gold'?'gold-road-halo':'road-halo';root.add(halo);
  const walk=ribbon(pts,width+5.2,closed,.12);
  const sidewalk=new T.Mesh(walk.g,materials.path);sidewalk.receiveShadow=true;sidewalk.name='walk';root.add(sidewalk);
  return curve;
 }
 road([[-462,-345],[-350,-400],[0,-402],[363,-390],[481,-285],[485,130],[464,398],[208,430],[-298,425],[-476,331],[-491,20]],24,true,'gold');
 road([[-472,-60],[-312,-65],[-210,-53],[-60,-37],[120,-17],[317,-2],[476,8]],13);
 road([[-464,242],[-328,289],[-124,279],[47,270],[227,272],[441,272]],14);
 road([[-445,-214],[-358,-182],[-293,-171],[-181,-192],[-70,-194],[94,-206],[309,-224],[466,-240]],13);
 road([[-279,-389],[-260,-275],[-177,-246],[-165,-147],[-197,-54],[-207,81],[-272,184],[-289,280],[-310,410]],12);
 road([[42,-390],[55,-276],[42,-221],[49,-106],[10,-22],[-9,60],[-40,120],[-16,254],[49,407]],12);
 road([[332,-392],[358,-268],[330,-211],[347,-105],[273,-25],[250,99],[251,179],[277,276],[279,415]],13);
 road([[-468,111],[-336,117],[-239,111],[-177,136],[-113,121],[13,115],[130,119],[229,139],[432,167]],11);

 const waters=[];
 for(const [lakeIndex,[x,z,rx,rz]] of LAKES.entries()){
  const s=new T.Shape();
  for(let i=0;i<=64;i++){
   const a=i/64*Math.PI*2,r=shoreRadius(lakeIndex,a);
   const xx=Math.cos(a)*rx*r,zz=Math.sin(a)*rz*r;
   if(i===0)s.moveTo(xx,zz);else s.lineTo(xx,zz);
  }
  const g=new T.ShapeGeometry(s,48);g.rotateX(-Math.PI/2);
  const mat=new T.MeshStandardMaterial({color:0x406969,metalness:.28,roughness:.16,envMapIntensity:1.4,side:T.DoubleSide});
  mat.onBeforeCompile=shader=>{
   shader.uniforms.uTime={value:0};waters.push(shader);
   shader.vertexShader='uniform float uTime;\nvarying vec3 waterWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n waterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='uniform float uTime;\nvarying vec3 waterWorld;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n float waveDx=.0495*cos(waterWorld.x*.45+uTime*1.1)+.0184*cos(waterWorld.x*2.3+waterWorld.z*.7+uTime*.8); float waveDz=-.048*sin(waterWorld.z*.6+uTime*.9)+.0056*cos(waterWorld.x*2.3+waterWorld.z*.7+uTime*.8); normal=normalize(mat3(viewMatrix)*vec3(-waveDx,1.0,-waveDz))*faceDirection;');
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n vec3 waterPosition=(modelMatrix*vec4(position,1.0)).xyz; transformed.y += sin(waterPosition.x*.45+uTime*1.1)*.11 + cos(waterPosition.z*.6+uTime*.9)*.08;');
  };
  const m=new T.Mesh(g,mat);m.position.set(x,.38,z);m.name='lake';root.add(m);
  const pts=[];for(let i=0;i<=48;i++){const a=i/48*6.283,r=shoreRadius(lakeIndex,a);pts.push([x+Math.cos(a)*(rx+2.4)*r,.5,z-Math.sin(a)*(rz+2.4)*r]);}
  line(b,'path',pts,1.1); // A stone walking bank, not an identical luminous oval.
  ring(b,'stone',x,.42,z,2.4,.18);
  for(let j=0;j<9;j++){
   const a=j/9*Math.PI*2;
   const pts=[];
   for(let k=0;k<=12;k++){const t=k/12;pts.push([x+Math.cos(a)*t*3.8,.6+Math.sin(t*Math.PI)*3.1,z+Math.sin(a)*t*3.8]);}
   stem(b,'blueGlass',pts,.045);
  }
  // Emergent reeds grow beyond the paved bank, leaving the water unobstructed.
  for(let j=0;j<90;j++){
   const a=random()*Math.PI*2,r=shoreRadius(lakeIndex,-a);
   const px=x+Math.cos(a)*(rx+4.8)*r,pz=z+Math.sin(a)*(rz+4.8)*r;
   for(let k=0;k<3;k++){
    const h=.6+random()*.85,dx=(random()-.5)*.8,dz=(random()-.5)*.8;
    stem(b,'leaf',[[px+dx,.2,pz+dz],[px+dx,.2+h*.6,pz+dz],[px+dx+.18,.2+h,pz+dz+.12]],.028);
   }
  }

 }
 const waterRoutes=[];
 const waterMaterial=new T.MeshStandardMaterial({color:0x406969,metalness:.28,roughness:.18,envMapIntensity:1.4,side:T.DoubleSide});
 for(const points of [[[-62,-200],[-37,-178],[-75,-160]],[[-90,-93],[-74,-62],[-32,-5],[-30,105],[-65,131]],[[-55,173],[-25,187],[13,205]],[[37,240],[50,264],[57,279]],[[52,322],[66,369],[-14,407]]]){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.14,z)));waterRoutes.push({curve,width:7.2});const positions=[],indices=[];
  for(let i=0;i<=40;i++){
   const p=curve.getPoint(i/40),v=curve.getTangent(i/40);
   for(const side of [-1,1])positions.push(p.x-v.z*3.6*side,.18,p.z+v.x*3.6*side);
   if(i<40){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  root.add(new T.Mesh(g,waterMaterial));
 }

 // Spatial buckets accelerate exact segment checks; they do not mark whole
 // cells unavailable. Slim buildings and elliptical ponds retain usable gardens.
 const CELL=24,segments=new Map(),occupied=new Map();
 const key=(x,z)=>`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`;
 for(const route of [...roads,...waterRoutes]){
  const count=Math.ceil(route.curve.getLength()/5);
  let a=route.curve.getPoint(0);
  for(let i=1;i<=count;i++){
   const c=route.curve.getPoint(i/count),r=route.width*.5+8;
   const seg={ax:a.x,az:a.z,bx:c.x,bz:c.z,width:route.width};
   for(let x=Math.floor((Math.min(a.x,c.x)-r)/CELL);x<=Math.floor((Math.max(a.x,c.x)+r)/CELL);x++)
    for(let z=Math.floor((Math.min(a.z,c.z)-r)/CELL);z<=Math.floor((Math.max(a.z,c.z)+r)/CELL);z++){
     const k=`${x},${z}`;if(!segments.has(k))segments.set(k,[]);segments.get(k).push(seg);
    }
   a=c;
  }
 }
 const ovalRx=SITE.width*.52,ovalRz=SITE.depth*.52;
 const free=(x,z,s)=>{
  const setback=3+s*.25;
  for(const f of FACILITIES)if(Math.abs(x-f.x)<f.w*.5+setback&&Math.abs(z-f.z)<f.d*.5+setback)return false;
  for(const [lakeIndex,[lx,lz,rx,rz]] of LAKES.entries()){
   const a=Math.atan2((z-lz)/rz,(x-lx)/rx),r=shoreRadius(lakeIndex,-a);
   if(((x-lx)/(rx*r+setback))**2+((z-lz)/(rz*r+setback))**2<1)return false;
  }
  for(const seg of segments.get(key(x,z))||[]){
   const dx=seg.bx-seg.ax,dz=seg.bz-seg.az,t=T.MathUtils.clamp(((x-seg.ax)*dx+(z-seg.az)*dz)/(dx*dx+dz*dz||1),0,1);
   if(Math.hypot(x-seg.ax-t*dx,z-seg.az-t*dz)<seg.width*.5+setback)return false;
  }
  const cx=Math.floor(x/CELL),cz=Math.floor(z/CELL);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const t of occupied.get(`${cx+dx},${cz+dz}`)||[])
   if(Math.hypot(x-t.x,z-t.z)<(s+t.s)*.57)return false;
  return true;
 };
 const trees=[];
 const plant=(x,z,s,pink)=>{if(!free(x,z,s))return;const t={x,z,s,pink};trees.push(t);const k=key(x,z);if(!occupied.has(k))occupied.set(k,[]);occupied.get(k).push(t);};
 for(let i=0;i<30000&&trees.length<treeInner;i++){
  const a=random()*Math.PI*2,rad=Math.sqrt(random())*.96;
  const x=Math.cos(a)*ovalRx*rad,z=Math.sin(a)*ovalRz*rad;
  plant(x,z,6.8+random()*3.6,random()<.20);
 }
 const beltTarget=trees.length+250;
 for(let i=0;i<10000&&trees.length<beltTarget;i++){
  const a=random()*Math.PI*2,u=.92+random()*.20;
  plant(Math.cos(a)*ovalRx*u,Math.sin(a)*ovalRz*u,7.2+random()*3.7,random()<.22);
 }
 for(let i=0;i<10000&&trees.length<beltTarget+treeOuter;i++){
  const a=random()*Math.PI*2,rad=565+random()*310;
  plant(Math.cos(a)*rad*(SITE.width/SITE.depth),Math.sin(a)*rad,8+random()*4,random()<.12);
 }
 const {wood:trunkG,leaves:leafG}=botanicalGeometry();
 const dummy=new T.Object3D();
 for(const type of ['trunk','leaf','pink']){
  const list=type==='trunk'?trees:trees.filter(t=>t.pink===(type==='pink'));
  if(!list.length)continue;
  const mat=type==='trunk'?materials.trunk:botanicalMaterial(type==='pink',wind);
  const mesh=new T.InstancedMesh(type==='trunk'?trunkG:leafG,mat,list.length);
  mesh.name=type+'-groves';mesh.castShadow=true;mesh.receiveShadow=true;
  for(let i=0;i<list.length;i++){
   const t=list[i];
   dummy.position.set(t.x,outerTerrainHeight(t.x,t.z),t.z);dummy.scale.set(t.s,t.s,t.s);
   // Stable rotation shared by the wood and foliage of each tree.
   dummy.rotation.set(0,(t.x*.7+t.z*.9)%6.283,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(type!=='trunk')mesh.setColorAt(i,new T.Color().setScalar(.8+random()*.3));
  }
  mesh.computeBoundingSphere();root.add(mesh);
 }

 const lampPosts=[],lampHeads=[];
 for(const r of roads){
 const n=lampEvery;
  for(let i=0;i<n;i++){
   const p=r.curve.getPoint(i/n),v=r.curve.getTangent(i/n);
   for(const side of [-1,1]){
    lampPosts.push({x:p.x-v.z*(r.width/2+4.2)*side,z:p.z+v.x*(r.width/2+4.2)*side});
   }
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

 for(const f of FACILITIES){
  for(const side of [-1,1]){
   b.box('stone',f.x+side*(f.w/2+3.2),.7,f.z,1.8,1.15,f.d*.5);
   for(let j=0;j<8;j++){
    const px=f.x+side*(f.w/2+3.2),pz=f.z+(j/7-.5)*f.d*.42;
    for(let k=0;k<3;k++){const a=k*2.094+j;stem(b,'leaf',[[px,1.28,pz],[px+Math.cos(a)*.32,1.9,pz+Math.sin(a)*.32],[px+Math.cos(a)*.58,1.8,pz+Math.sin(a)*.58]],.065);}
   }
  }
 }

 // The references specify a forest buffer. Remove the invented 70-building
 // background district: repeating stepped towers confused the campus identity.

 root.add(b.finish('roads-gardens-street-furniture'));
 return {
  root,roads,kineticMats,
  update(t){wind.value=t;waters.forEach(s=>s.uniforms.uTime.value=t);kineticMats.forEach(m=>m.uniforms.uTime.value=t);},
  treeCount:trees.length,
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
