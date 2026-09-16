import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Batch,materials,cylinder,ring,line,seeded} from './geometry.js';
import {FACILITIES,SPIRES,LAKES,SITE} from './data.js';
export function createLandscape(){
 const root=new T.Group();root.name='landscape';const b=new Batch();const random=seeded(22035);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#42513b';ctx.fillRect(0,0,256,256);for(let i=0;i<12000;i++){ctx.fillStyle=`rgba(${80+random()*35},${100+random()*35},${50+random()*30},.15)`;ctx.fillRect(random()*256,random()*256,3,3);}const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(25,25);tex.colorSpace=T.SRGBColorSpace;
 const ground=new T.Mesh(new T.PlaneGeometry(2600,2300),new T.MeshStandardMaterial({map:tex,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;root.add(ground);
 const roads=[];
 function road(pts,width=12,closed=false){const curve=new T.CatmullRomCurve3(pts.map(([x,z])=>new T.Vector3(x,.25,z)),closed,'catmullrom',.25);roads.push({curve,width});const p=[],idx=[],n=400;for(let i=0;i<=n;i++){const t=i/n,c=curve.getPoint(t),d=curve.getTangent(t),normal=new T.Vector3(-d.z,0,d.x);for(const s of [-1,1]){const q=c.clone().addScaledVector(normal,width/2*s);p.push(q.x,q.y,q.z);}if(i<n){const j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,materials.road);m.receiveShadow=true;root.add(m);
 for(let i=0;i<n;i+=4){const t=i/n,c=curve.getPoint(t),d=curve.getTangent(t),ang=Math.atan2(d.x,d.z);b.box('gold',c.x,.3,c.z,.18,.03,2.8,ang);for(const s of [-1,1]){const x=c.x-d.z*(width/2+.8)*s,z=c.z+d.x*(width/2+.8)*s;b.box('path',x,.2,z,1,.3,7,ang);}}
 return curve;}
 road([[-462,-345],[-350,-400],[0,-402],[363,-390],[481,-285],[485,130],[464,398],[208,430],[-298,425],[-476,331],[-491,20]],18,true);
 road([[-472,-60],[-312,-65],[-210,-53],[-60,-37],[120,-17],[317,-2],[476,8]],12);
 road([[-464,242],[-328,289],[-124,279],[47,270],[227,272],[441,272]],13);
 road([[-445,-214],[-358,-182],[-293,-171],[-181,-192],[-70,-194],[94,-206],[309,-224],[466,-240]],12);
 road([[-279,-389],[-260,-275],[-177,-246],[-165,-147],[-197,-54],[-207,81],[-272,184],[-289,280],[-310,410]],11);
 road([[42,-390],[55,-276],[42,-221],[49,-106],[10,-22],[-9,60],[-40,120],[-16,254],[49,407]],11);
 road([[332,-392],[358,-268],[330,-211],[347,-105],[273,-25],[250,99],[251,179],[277,276],[279,415]],12);
 road([[-468,111],[-336,117],[-239,111],[-177,136],[-113,121],[13,115],[130,119],[229,139],[432,167]],10);
 const waters=[];
 for(const [x,z,rx,rz] of LAKES){
  const s=new T.Shape();for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,r=1+.065*Math.sin(a*3);const xx=Math.cos(a)*rx*r,zz=Math.sin(a)*rz*r;if(i===0)s.moveTo(xx,zz);else s.lineTo(xx,zz);}
  const g=new T.ShapeGeometry(s,64);g.rotateX(-Math.PI/2);
  const mat=new T.MeshStandardMaterial({color:0x17536b,metalness:.72,roughness:.16,side:T.DoubleSide});
  mat.onBeforeCompile=shader=>{shader.uniforms.uTime={value:0};waters.push(shader);shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y += sin(position.x*.55+uTime)*.09 + cos(position.z*.7+uTime*.8)*.07;');};
  const m=new T.Mesh(g,mat);m.position.set(x,.4,z);root.add(m);
  const pts=[];for(let i=0;i<=80;i++){const a=i/80*6.283,r=1+.065*Math.sin(a*3);pts.push([x+Math.cos(a)*(rx+2)*r,.48,z-Math.sin(a)*(rz+2)*r]);}line(b,'path',pts,1.5);
  for(let k=-1;k<=1;k++){const fx=x+k*rx*.38;ring(b,'gold',fx,.7,z,3,.22);cylinder(b,'cyan',fx,2,z,.14,4);const fountain=new T.SphereGeometry(1,12,8,0,6.283,0,Math.PI/2);b.add(fountain,'cyan',fx,.5,z,2.8,4,2.8);fountain.dispose();}
 }
 // Planted water channels connect the gardens, with road decks crossing above.
 const waterMaterial=new T.MeshStandardMaterial({color:0x17536b,metalness:.7,roughness:.17,side:T.DoubleSide});
 for(const points of [[[-62,-200],[-37,-178],[-75,-160]],[[-90,-93],[-74,-62],[-32,-5],[-30,105],[-65,131]],[[-55,173],[-25,187],[13,205]],[[37,240],[50,264],[57,279]],[[52,322],[66,369],[-14,407]]]){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.12,z)));const positions=[],indices=[];
  for(let i=0;i<=60;i++){const p=curve.getPoint(i/60),v=curve.getTangent(i/60);for(const side of [-1,1])positions.push(p.x-v.z*3.5*side,.16,p.z+v.x*3.5*side);if(i<60){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();root.add(new T.Mesh(g,waterMaterial));
 }
 // Short pedestrian bridges cross the ponds and connect both banks.
 for(const [x,z,rx,rz] of LAKES.slice(0,5)){b.box('path',x+rx*.2,2.1,z,6,.6,rz*2.3);for(const side of [-1,1]){b.box('gold',x+rx*.2+side*2.8,3.3,z,.18,.2,rz*2.3);for(let dz=-rz;dz<rz;dz+=5)b.box('stone',x+rx*.2+side*2.8,2.7,z+dz,.2,1.4,.2);}}
 const nearRoad=[];for(const r of roads)for(let i=0;i<200;i++)nearRoad.push(r.curve.getPoint(i/200));
 function free(x,z){if(FACILITIES.some(f=>Math.abs(x-f.x)<f.w/2+10&&Math.abs(z-f.z)<f.d/2+10))return false;if(LAKES.some(([a,c,rx,rz])=>((x-a)/(rx+5))**2+((z-c)/(rz+5))**2<1))return false;if(nearRoad.some(p=>(x-p.x)**2+(z-p.z)**2<150))return false;return true;}
 const trees=[];for(let i=0;i<12500;i++){const x=(random()-.5)*1300,z=(random()-.5)*1150;if(free(x,z))trees.push({x,z,s:4.1+random()*3.5,pink:random()<.12});if(trees.length===4200)break;}
 const trunkG=new T.CylinderGeometry(.5,.8,1,5),leafG=mergeGeometries([new T.SphereGeometry(1,8,6).translate(0,.15,0),new T.SphereGeometry(.72,7,5).translate(.55,-.15,.15),new T.SphereGeometry(.7,7,5).translate(-.4,-.15,.3)]),dummy=new T.Object3D();
 for(const type of ['trunk','leaf','pink']){const list=type==='trunk'?trees:trees.filter(t=>t.pink===(type==='pink'));const mesh=new T.InstancedMesh(type==='trunk'?trunkG:leafG,materials[type],list.length);mesh.name=type+'-groves';for(let i=0;i<list.length;i++){const t=list[i];dummy.position.set(t.x,type==='trunk'?t.s*.5:t.s*1.5,t.z);dummy.scale.set(type==='trunk'?.5:t.s,type==='trunk'?t.s:t.s*1.2,type==='trunk'?.5:t.s);dummy.rotation.set(0,random()*6.28,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(type!=='trunk')mesh.setColorAt(i,new T.Color().setHSL(type==='pink'?.92:.23+random()*.06,.25+random()*.25,.22+random()*.15));}mesh.castShadow=false;root.add(mesh);}
 // Path lighting, hedges and seating distributed on real route tangents.
 for(const r of roads)for(let i=0;i<70;i++){const p=r.curve.getPoint(i/70),v=r.curve.getTangent(i/70);for(const side of [-1,1]){const x=p.x-v.z*(r.width/2+4)*side,z=p.z+v.x*(r.width/2+4)*side;b.box('dark',x,2.3,z,.22,4.6,.22);b.box('warm',x,4.6,z,1,.3,.8);if(i%4===0){b.box('gold',x+3,.7,z,3,.25,1);b.box('dark',x+3,.3,z,2,.5,.7);}}}
 // Low context skyline; no source artwork appears on any scene surface.
 for(let i=0;i<110;i++){const x=(random()-.5)*2200,z=-650-random()*300,h=8+random()*52;b.box('dark',x,h/2,z,12+random()*30,h,12+random()*25);}
 root.add(b.finish('roads-gardens-street-furniture'));
 return {root,roads,update(t){waters.forEach(s=>s.uniforms.uTime.value=t);},treeCount:trees.length};
}
export function createInfrastructure(){
 const root=new T.Group(),b=new Batch(),net=new Batch(),energy=new Batch();root.name='infrastructure';
 const nodes=[];
 for(const [x,z] of SPIRES){
  cylinder(b,'stone',x,1,z,8,2);ring(b,'cyan',x,2.3,z,7,.35);cylinder(b,'glass',x,20,z,1.4,36,.7,8);
  for(let a=0;a<6.28;a+=Math.PI/2)line(b,'stone',[[x+Math.sin(a)*5,2,z+Math.cos(a)*5],[x+Math.sin(a)*1.2,30,z+Math.cos(a)*1.2],[x,45,z]],.38);
  ring(b,'violet',x,32,z,5,.5);ring(b,'violet',x,33,z,3.5,.3);cylinder(b,'violet',x,39,z,.22,22,.06);
  nodes.push(new T.Vector3(x,32,z));
  for(let a=0;a<6.28;a+=Math.PI/3){const nx=x+Math.sin(a)*10,nz=z+Math.cos(a)*10;cylinder(b,'dark',nx,1.4,nz,.65,2.8);ring(b,'cyan',nx,2.8,nz,.7,.1);}
 }
 const paths=[];for(let i=0;i<nodes.length;i++){const a=nodes[i],others=nodes.map((n,j)=>({j,d:a.distanceTo(n)})).filter(o=>o.j>i).sort((a,b)=>a.d-b.d).slice(0,2);for(const {j} of others){const z=nodes[j],mid=a.clone().lerp(z,.5);mid.y+=5;paths.push(line(net,'cyan',[a.toArray(),mid.toArray(),z.toArray()],.16));}}
 const plant=FACILITIES.find(f=>f.id===21);const energyPaths=[];
 for(const f of FACILITIES){const pts=[[plant.x,1.1,plant.z],[278,1.1,280],[250,1.1,f.z+f.d/2+14],[f.x,1.1,f.z+f.d/2+14],[f.x,1.1,f.z+f.d/2]];energyPaths.push(line(energy,'gold',pts,.27));}
 // Distributed generation: solar field, wind rotors, battery storage, geothermal and thermal connections.
 for(let x=-422;x<-305;x+=14)for(let z=355;z<395;z+=11){b.box('solar',x,3,z,12,.4,8);b.box('stone',x,1.5,z,.4,3,.4);}
 for(let i=0;i<8;i++){b.box('white',360+i%4*8,2.7,373+Math.floor(i/4)*10,6,5,8);b.box('cyan',360+i%4*8,3,377+Math.floor(i/4)*10,4,.4,.1);}
 const turbines=[];for(let i=0;i<5;i++){const x=-453+i*38,z=-374; cylinder(b,'white',x,21,z,.7,42,.4);const rotor=new T.Group();rotor.position.set(x,43,z);for(let j=0;j<3;j++){const blade=new T.Mesh(new T.BoxGeometry(1.2,18,.35),materials.white);blade.position.set(Math.sin(j*2.094)*9,Math.cos(j*2.094)*9,0);blade.rotation.z=-j*2.094;rotor.add(blade);}root.add(rotor);turbines.push(rotor);}
 const thermal=line(energy,'warm',[[108,1,-310],[-111,1,0],[-265,1,33]],.4);
 // Explicit supply connections; kinetic remains local, as specified in the package.
 for(const [mat,pts] of [
 ['gold',[[-360,1,380],[-290,1,406],[278,1,406],[418,1,344]]],
 ['cyan',[[-377,1,-374],[460,1,-390],[478,1,340],[418,1,344]]],
 ['gold',[[495,1,375],[450,1,375],[418,1,344]]],
 ['leaf',[[195,1,365],[285,1,402],[418,1,344]]],
 ['cyan',[[376,1,383],[330,1,383],[330,1,319],[418,1,344]]],
 ['warm',[[330,1,319],[275,1,273],[250,1,28],[-111,1,39]]],
 ['cyan',[[0,1,380],[-40,1,380],[-40,1,390]]]
 ])energyPaths.push(line(energy,mat,pts,.35));
 for(let x=-35;x<30;x+=3)for(let z=381;z<393;z+=3)b.box((x+z)%3?'dark':'cyan',x,.24,z,2.7,.2,2.7);
 for(let i=0;i<6;i++){ring(b,'gold',330+i*3,.5,364,1,.15);}

 root.add(b.finish('mesh-spires-and-energy-sources'));const network=net.finish('wireless-mesh'),flows=energy.finish('energy-distribution');root.add(network,flows);
 const movers=[];for(const [curves,mat,count] of [[paths,materials.cyan,30],[energyPaths,materials.warm,50]]){const geo=new T.SphereGeometry(.9,6,4);const m=new T.InstancedMesh(geo,mat,count);root.add(m);movers.push({m,curves,count,network:mat===materials.cyan});}
 const dummy=new T.Object3D();return {root,network,flows,setNetwork(v){network.visible=v;movers[0].m.visible=v;},setEnergy(v){flows.visible=v;movers[1].m.visible=v;},update(t){for(const a of movers){for(let i=0;i<a.count;i++){const p=a.curves[i%a.curves.length].getPoint((t*.055+i*.071)%1);dummy.position.copy(p);dummy.updateMatrix();a.m.setMatrixAt(i,dummy.matrix);}a.m.instanceMatrix.needsUpdate=true;}turbines.forEach((r,i)=>r.rotation.z=t*(.35+i*.03));}};
}
