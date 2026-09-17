// @ts-nocheck
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Batch,materials,cylinder,ring,line,seeded,kineticRoadMaterial,textures} from './geometry.js';
import {FACILITIES,SPIRES,LAKES,SITE} from './data.js';

const haloMat=new T.MeshBasicMaterial({
 color:0x3dfff4,transparent:true,opacity:.62,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,side:T.DoubleSide,
});
const goldHaloMat=new T.MeshBasicMaterial({
 color:0xffc45a,transparent:true,opacity:.84,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,side:T.DoubleSide,
});

function ribbon(pts,width,closed,y=0.22){
 const curve=new T.CatmullRomCurve3(pts.map(([x,z])=>new T.Vector3(x,y,z)),closed,'catmullrom',.25);
 const p=[],uv=[],idx=[],n=240;
 for(let i=0;i<=n;i++){
  const t=i/n,c=curve.getPoint(t),d=curve.getTangent(t);
  const nx=-d.z,nz=d.x,len=Math.hypot(nx,nz)||1;
  for(const s of [0,1]){
   p.push(c.x+(nx/len)*(width/2)*(s?1:-1),c.y,c.z+(nz/len)*(width/2)*(s?1:-1));
   uv.push(t*curve.getLength()/18,s);
  }
  if(i<n){const j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.setIndex(idx);g.computeVertexNormals();
 return {curve,width,g};
}

export function createLandscape(){
 const root=new T.Group();root.name='landscape';const b=new Batch();const random=seeded(22035);
 const kineticMats=[];
 const automated=typeof navigator!=='undefined'&&(navigator.webdriver||/Headless/i.test(navigator.userAgent||''));
 const treeInner=automated?400:1600;
 const treeOuter=automated?280:1800;
 const skylineCount=automated?36:170;
 const lampEvery=automated?12:36;

 const ground=new T.Mesh(new T.PlaneGeometry(2800,2500,8,8),materials.grass);
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.name='forest-floor';root.add(ground);

 const oval=new T.Shape();oval.absellipse(0,0,SITE.width*.52,SITE.depth*.52,0,Math.PI*2,false,0);
 const ovalGeo=new T.ShapeGeometry(oval,64);ovalGeo.rotateX(-Math.PI/2);
 const campusMat=materials.grass.clone();campusMat.map=textures.grass.clone();campusMat.map.repeat.set(1,1);campusMat.emissiveIntensity=0;
 const lawnUv=ovalGeo.attributes.uv,lawnPos=ovalGeo.attributes.position;for(let i=0;i<lawnUv.count;i++)lawnUv.setXY(i,lawnPos.getX(i)/24,lawnPos.getZ(i)/24);
 const campusPad=new T.Mesh(ovalGeo,campusMat);campusPad.position.y=.04;campusPad.receiveShadow=true;campusPad.name='campus-lawn';root.add(campusPad);

 const roads=[];
 function road(pts,width=12,closed=false,kind='cyan'){
  const {curve,g}=ribbon(pts,width,closed,.22);
  roads.push({curve,width});
  const base=ribbon(pts,width+1.4,closed,.16);
  root.add(new T.Mesh(base.g,materials.road));
  const mat=kineticRoadMaterial(kind);kineticMats.push(mat);
  const m=new T.Mesh(g,mat);m.receiveShadow=true;m.name=kind==='gold'?'gold-ring-road':'kinetic-road';root.add(m);
  const haloR=ribbon(pts,width+(kind==='gold'?7.4:5.0),closed,.3);
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
 for(const [x,z,rx,rz] of LAKES){
  const s=new T.Shape();
  for(let i=0;i<=64;i++){
   const a=i/64*Math.PI*2,r=1+.07*Math.sin(a*3)+.03*Math.cos(a*5);
   const xx=Math.cos(a)*rx*r,zz=Math.sin(a)*rz*r;
   if(i===0)s.moveTo(xx,zz);else s.lineTo(xx,zz);
  }
  const g=new T.ShapeGeometry(s,48);g.rotateX(-Math.PI/2);
  const mat=new T.MeshStandardMaterial({color:0x1ec8dc,metalness:.84,roughness:.07,envMapIntensity:2.3,emissive:0x0a6080,emissiveIntensity:.72,side:T.DoubleSide});
  mat.onBeforeCompile=shader=>{
   shader.uniforms.uTime={value:0};waters.push(shader);
   shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n transformed.y += sin(position.x*.45+uTime*1.1)*.11 + cos(position.z*.6+uTime*.9)*.08;');
  };
  const m=new T.Mesh(g,mat);m.position.set(x,.38,z);m.name='lake';root.add(m);
  const pts=[];for(let i=0;i<=48;i++){const a=i/48*6.283,r=1+.07*Math.sin(a*3);pts.push([x+Math.cos(a)*(rx+2.4)*r,.5,z-Math.sin(a)*(rz+2.4)*r]);}
  line(b,'path',pts,1.6);line(b,'kinetic',pts.map(([px,py,pz])=>[px,py+.04,pz]),.14);
  ring(b,'gold',x,.72,z,3.2,.2);
  cylinder(b,'cyan',x,2.4,z,.12,4.6);
  const fountain=new T.SphereGeometry(1,12,8,0,6.283,0,Math.PI/2);
  b.add(fountain,'cyan',x,.55,z,3.1,5.2,3.1);fountain.dispose();
 }
 const waterMaterial=new T.MeshStandardMaterial({color:0x1ec8dc,metalness:.8,roughness:.1,emissive:0x0a6080,emissiveIntensity:.5,side:T.DoubleSide});
 for(const points of [[[-62,-200],[-37,-178],[-75,-160]],[[-90,-93],[-74,-62],[-32,-5],[-30,105],[-65,131]],[[-55,173],[-25,187],[13,205]],[[37,240],[50,264],[57,279]],[[52,322],[66,369],[-14,407]]]){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.14,z)));const positions=[],indices=[];
  for(let i=0;i<=40;i++){
   const p=curve.getPoint(i/40),v=curve.getTangent(i/40);
   for(const side of [-1,1])positions.push(p.x-v.z*3.6*side,.18,p.z+v.x*3.6*side);
   if(i<40){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  root.add(new T.Mesh(g,waterMaterial));
 }

 const CELL=16,COLS=200,ROWS=180,OX=1600,OZ=1440;
 const blocked=new Uint8Array(COLS*ROWS);
 const mark=(x,z,r)=>{
  const i0=Math.max(0,Math.floor((x-r+OX)/CELL)),i1=Math.min(COLS-1,Math.floor((x+r+OX)/CELL));
  const j0=Math.max(0,Math.floor((z-r+OZ)/CELL)),j1=Math.min(ROWS-1,Math.floor((z+r+OZ)/CELL));
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)blocked[i*ROWS+j]=1;
 };
 for(const f of FACILITIES)mark(f.x,f.z,Math.max(f.w,f.d)*.5+8);
 for(const [a,c,rx,rz] of LAKES)mark(a,c,Math.max(rx,rz)+6);
 for(const r of roads){
  const n=Math.max(48,Math.round(r.curve.getLength()/8));
  for(let i=0;i<=n;i++){const p=r.curve.getPoint(i/n);mark(p.x,p.z,r.width*.6+14);}
 }
 const ovalRx=SITE.width*.52,ovalRz=SITE.depth*.52;
 const free=(x,z)=>{
  const i=Math.floor((x+OX)/CELL),j=Math.floor((z+OZ)/CELL);
  return i>=0&&j>=0&&i<COLS&&j<ROWS&&!blocked[i*ROWS+j];
 };
 const trees=[];
 for(let i=0;i<9000&&trees.length<treeInner;i++){
  const a=random()*Math.PI*2;
  const rad=random()*380;
  const x=Math.cos(a)*rad*(SITE.width/SITE.depth)*.85;
  const z=Math.sin(a)*rad;
  if((x/ovalRx)**2+(z/ovalRz)**2>0.88)continue;
  if(free(x,z))trees.push({x,z,s:3.8+random()*3.6,pink:random()<.52});
 }
 const beltTarget=trees.length+(automated?70:460);
 for(let i=0;i<9000&&trees.length<beltTarget;i++){
  const a=random()*Math.PI*2;
  const u=.74+random()*.14;
  const x=Math.cos(a)*ovalRx*u;
  const z=Math.sin(a)*ovalRz*u;
  if(free(x,z))trees.push({x,z,s:4.6+random()*4.2,pink:true});
 }
 for(let i=0;i<10000&&trees.length<beltTarget+treeOuter;i++){
  const a=random()*Math.PI*2;
  const rad=548+random()*360;
  const x=Math.cos(a)*rad*(SITE.width/SITE.depth);
  const z=Math.sin(a)*rad;
  if(free(x,z))trees.push({x,z,s:5.6+random()*5.8,pink:random()<.12});
 }
 const trunkG=new T.CylinderGeometry(.28,.58,1,7);
 // A branched, open crown assembled from small overlapping foliage clusters.
 // No solid central ellipsoid: the gaps and branch tips define the silhouette.
 const crownParts=[];
 for(let i=0;i<14;i++){
  const a=i*2.39996,y=-.45+i/13*.95,rr=Math.sqrt(Math.max(.1,1-y*y))*.67;
  const g=new T.SphereGeometry(.29+(i%3)*.025,6,4);
  g.scale(1,.85,1);g.translate(Math.cos(a)*rr,y,Math.sin(a)*rr);crownParts.push(g);
 }
 const leafG=mergeGeometries(crownParts);crownParts.forEach(g=>g.dispose());
 const dummy=new T.Object3D();
 for(const type of ['trunk','leaf','pink']){
  const list=type==='trunk'?trees:trees.filter(t=>t.pink===(type==='pink'));
  if(!list.length)continue;
  const mesh=new T.InstancedMesh(type==='trunk'?trunkG:leafG,materials[type],list.length);
  mesh.name=type+'-groves';mesh.castShadow=true;mesh.receiveShadow=true;
  for(let i=0;i<list.length;i++){
   const t=list[i];
   dummy.position.set(t.x,type==='trunk'?t.s*.5:t.s*1.48,t.z);
   dummy.scale.set(type==='trunk'?.5:t.s,type==='trunk'?t.s:t.s*1.18,type==='trunk'?.5:t.s);
   dummy.rotation.set(0,random()*6.28,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(type!=='trunk')mesh.setColorAt(i,new T.Color().setScalar(.72+random()*.38));
  }
  root.add(mesh);
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
   cylinder(b,'leaf',f.x+side*(f.w/2+3.2),1.6,f.z-f.d*.18,1.2,1.4,.9,7);
   cylinder(b,'pink',f.x+side*(f.w/2+3.2),1.9,f.z+f.d*.18,.7,.35,.5,6);
  }
 }

 const skyRand=seeded(614);
 for(let i=0;i<skylineCount;i++){
  const x=(skyRand()-.5)*2400;
  const z=-820-skyRand()*280;
  const downtown=Math.abs(x)<320;
  const h=24+skyRand()*80+(downtown?120:0)+(Math.abs(x)<90?80:0);
  const bw=10+skyRand()*28,bd=10+skyRand()*22;
  const skin=skyRand()>.72?'copper':skyRand()>.45?'night':'dark';
  b.box(skin,x,h/2,z,bw,h,bd);
  const floors=Math.max(3,Math.round(h/7));
  for(let k=1;k<floors;k++){
   if(skyRand()<.38)continue;
   const y=k*(h/floors);
   const ww=bw*(.16+skyRand()*.32);
   b.box('warmWin',x+(skyRand()-.5)*bw*.28,y,z+bd/2+.1,ww,h/floors*.42,.1);
   if(skyRand()>.58)b.box('warmWin',x+bw/2+.08,y,z+(skyRand()-.5)*bd*.3,.1,h/floors*.38,bd*(.12+skyRand()*.22));
  }
  if(downtown&&skyRand()>.45){b.box('gold',x,h+5,z,bw*.2,8,bd*.2);b.box('cyan',x,h+12,z,.14,8,.14);}
 }

 root.add(b.finish('roads-gardens-street-furniture'));
 return {
  root,roads,kineticMats,
  update(t){waters.forEach(s=>s.uniforms.uTime.value=t);kineticMats.forEach(m=>m.uniforms.uTime.value=t);},
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
  for(let j=0;j<3;j++){
   const blade=new T.Mesh(new T.BoxGeometry(1.2,24,.32),materials.white);
   blade.position.set(Math.sin(j*2.094)*12,Math.cos(j*2.094)*12,0);blade.rotation.z=-j*2.094;rotor.add(blade);
  }
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
