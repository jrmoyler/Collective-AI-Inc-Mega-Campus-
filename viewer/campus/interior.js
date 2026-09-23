import {Engine} from '@babylonjs/core/Engines/engine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Color3,Color4} from '@babylonjs/core/Maths/math.color.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight.js';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight.js';
import {SpotLight} from '@babylonjs/core/Lights/spotLight.js';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {CreatePlane} from '@babylonjs/core/Meshes/Builders/planeBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import '@babylonjs/core/Collisions/collisionCoordinator.js';
import {animate} from 'animejs';
import {routeToRoom} from './floor-topology.js';
import {createInteriorGeometry} from './interior-architecture.js';
import {createInteriorMaterials} from './interior-materials.js';
import {createInteriorEnvironment,createInteriorPipeline,createExteriorBackdrop} from './interior-lighting.js';
import {CreateCylinder} from '@babylonjs/core/Meshes/Builders/cylinderBuilder.js';
import {interiorPixelRatio} from './quality.js';
// three.js authors counter-clockwise front faces; Babylon's right-handed mode culls the
// opposite winding. Without reversal every box renders its far (inside) faces, so floors
// shade with downward normals and lights/IBL appear to come from below.
export function frontFacing(indices){const out=new indices.constructor(indices.length);for(let i=0;i<indices.length;i+=3){out[i]=indices[i];out[i+1]=indices[i+2];out[i+2]=indices[i+1];}return out;}
export function createInterior(canvas,f,{onRoom,onFloor,reduced=false,engineOverride=null,quality='balanced',onFrame=()=>{},onLifecycle=()=>{},onError=error=>console.error(error)}){
 const engine=engineOverride||new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true});
 const scale=()=>engine.setHardwareScalingLevel(1/interiorPixelRatio(globalThis.devicePixelRatio||1,quality));
 let scene,camera,layout,level=0,flight=null,currentRoom=null,disposed=false,shadow=null,shadowLight=null,lights=[],post=null;const held=new Set();let contextLost=false,awaitingFrame='floor-first-frame';
 function label(text,x,y,z,width=4){const tex=new DynamicTexture('room-sign',{width:1024,height:128},scene,false);const ctx=tex.getContext();ctx.fillStyle='#17252f';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#eeddbb';ctx.font='36px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,78,990);tex.update();const m=new StandardMaterial('sign',scene);m.diffuseTexture=tex;m.emissiveColor=new Color3(.45,.45,.45);m.backFaceCulling=false;const p=CreatePlane('Program: '+text,{width,height:width/8},scene);p.position.set(x,y,z);p.material=m;return p;}
 function build(l){
  onLifecycle('floor-request',{facility:f.key,floor:l+1});
  const assembly=createInteriorGeometry(f,l); // Validate floor before disposing the active scene.
  try{
  flight?.pause();flight=null;held.clear();post?.dispose();post=null;shadow?.dispose();shadow=null;scene?.dispose();level=l;currentRoom=null;layout=assembly.layout;scene=new Scene(engine);scene.useRightHandedSystem=true;scene.clearColor=new Color4(.27,.35,.40,1);scene.collisionsEnabled=true;
  scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=1;scene.imageProcessingConfiguration.exposure=1.1;scene.imageProcessingConfiguration.contrast=1.1;
  if(!engineOverride)createInteriorEnvironment(scene,engine);
  const finishes=createInteriorMaterials(scene,new Set(assembly.root.children.flatMap(g=>g.children.map(m=>m.material.name))),{quality,textureScale:engineOverride?.25:1});for(const m of Object.values(finishes))m.maxSimultaneousLights=8;
  for(const source of assembly.root.children.flatMap(g=>g.children)){
   const mesh=new Mesh(source.name,scene),data=new VertexData(),g=source.geometry;
   data.positions=g.attributes.position.array;data.normals=g.attributes.normal.array;data.uvs=g.attributes.uv.array;if(g.attributes.color)data.colors=g.attributes.color.array;data.indices=frontFacing(g.index?.array||Uint32Array.from({length:g.attributes.position.count},(_,i)=>i));data.applyToMesh(mesh);
   mesh.material=finishes[source.material.name];if(g.attributes.color){mesh.hasVertexAlpha=true;mesh.isPickable=false;}mesh.checkCollisions=!!source.userData.collision;mesh.receiveShadows=true;mesh.metadata={components:source.userData.components};
  }
  camera=new FreeCamera('visitor',new Vector3(layout.entry[0],1.67,layout.entry[1]),scene);camera.minZ=.06;camera.maxZ=160;camera.fov=.9;camera.speed=.26;camera.angularSensibility=3200;camera.inertia=.5;camera.checkCollisions=true;camera.applyGravity=false;camera.ellipsoid=new Vector3(.26,.76,.26);camera.keysUp=[87,38];camera.keysDown=[83,40];camera.keysLeft=[65,37];camera.keysRight=[68,39];camera.setTarget(new Vector3(layout.circulation[0].x,1.67,layout.circulation[0].z));camera.attachControl(canvas,true);
  // Image-based light carries the ambient; the hemisphere is only a faint bounce floor.
  const hemi=new HemisphericLight('daylight fill',new Vector3(0,1,0),scene);hemi.intensity=engineOverride?.38:.42;hemi.diffuse=new Color3(.55,.52,.48);hemi.groundColor=new Color3(.62,.52,.4);hemi.specular=Color3.Black();scene.environmentIntensity=.8;
  const roomMeshes=layout.rooms.map((_,i)=>scene.meshes.filter(m=>m.name.startsWith('room-'+(i+1)+':')||m.name.startsWith('occupants room '+(i+1)+'/')||m.name.startsWith('architecture room '+(i+1)+'/')));
  const daylit=layout.rooms.map((_,i)=>!!assembly.root.children.find(g=>g.name==='architecture room '+(i+1))?.userData.daylight);
  const circulationMeshes=scene.meshes.filter(m=>m.name.startsWith('architecture circulation'));
  // Physically attenuated luminaires follow the ceiling diffuser grid of each room.
  lights=[];
  layout.rooms.forEach((r,i)=>{
   const kind=assembly.root.children.find(g=>g.name.startsWith('room-'+(i+1)+':')).userData.kind;const technical=r.fitout?.technical||['lab','clinical','servers','industrial','electrical','process','fabrication','maintenance','stage','shielded','aerospace','logistics','algae','test-track'].includes(kind);
   const fx=Math.sin(r.angle),fz=Math.cos(r.angle),lx=Math.cos(r.angle),lz=-Math.sin(r.angle);
   const perRoom=quality==='high'||r.localWidth*r.localDepth>300?6:4,nx=r.localWidth>6.5?2:1,nz=Math.max(1,Math.min(Math.floor(perRoom/nx),Math.round(r.localDepth/4.6)));
   for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){
    const lat=nx===1?0:(a?1:-1)*r.localWidth*.26,dep=(b+.5)/nz*r.localDepth;
    const lamp=new SpotLight('room luminaire '+i+'.'+(a*nz+b),new Vector3(r.doorX+fx*dep+lx*lat,r.height-.3,r.doorZ+fz*dep+lz*lat),new Vector3(0,-1,0),2.4,1.6,scene);lamp.innerAngle=1.3;
    const area=r.localWidth*r.localDepth/(nx*nz);lamp.intensity=(technical?38:30)*Math.min(1.5,.75+area/40)*((r.height-.3)/3.6)**2;lamp.range=r.height*3.2;
    lamp.diffuse=technical?new Color3(.95,.97,1):new Color3(1,.84,.66);lamp.specular=lamp.diffuse.scale(.85);lamp.includedOnlyMeshes=roomMeshes[i];lights.push(lamp);
   }
  });
  // Corridor downlights: warm pools under the suspended linear luminaires.
  const corridorSpots=[];for(const c of layout.circulation){const length=c.axis==='H'?c.w:c.d;for(let t=-length/2+2.2;t<length/2-1;t+=7.2)corridorSpots.push([c.x+(c.axis==='H'?t:0),c.z+(c.axis==='V'?t:0)]);}
  corridorSpots.sort((a,b)=>Math.hypot(a[0]-layout.entry[0],a[1]-layout.entry[1])-Math.hypot(b[0]-layout.entry[0],b[1]-layout.entry[1]));
  for(const [x,z] of corridorSpots.slice(0,6)){const lamp=new SpotLight('corridor downlight',new Vector3(x,3.4,z),new Vector3(0,-1,0),2.2,1.8,scene);lamp.intensity=20;lamp.range=11;lamp.diffuse=new Color3(1,.83,.64);lamp.includedOnlyMeshes=circulationMeshes;lights.push(lamp);}
  // The visited room receives a shadowed key: sunlight through glazing, or a soft overhead key in internal rooms.
  const key=new DirectionalLight('room key light',new Vector3(0,-1,0),scene);key.intensity=0;key.includedOnlyMeshes=[];shadowLight=key;
  function assignShadow(index){
   const r=layout.rooms[index],meshes=roomMeshes[index];if(!r)return;
   const daylight=daylit[index];
   const fx=Math.sin(r.angle),fz=Math.cos(r.angle),lx=Math.cos(r.angle),lz=-Math.sin(r.angle);
   const dir=daylight?new Vector3(-fx*.62+lx*.32,-.72,-fz*.62+lz*.32):new Vector3(lx*.22+fx*.3,-1,lz*.22+fz*.3);dir.normalize();
   key.direction=dir;key.position=new Vector3(r.x,r.height,r.z).subtract(dir.scale(30));
   key.intensity=daylight?4.5:.9;key.diffuse=daylight?new Color3(1,.9,.76):new Color3(1,.88,.74);key.specular=key.diffuse.clone();
   key.includedOnlyMeshes=meshes;key.shadowMinZ=1;key.shadowMaxZ=70;
   if(engineOverride)return;
   if(!shadow){
    shadow=new ShadowGenerator(quality==='high'?2048:1024,key);shadow.bias=.0012;shadow.normalBias=.02;
    if(quality==='high'){shadow.useContactHardeningShadow=true;shadow.contactHardeningLightSizeUVRatio=.035;shadow.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;}
    else{shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;}
    shadow.darkness=0;shadow.transparencyShadow=false;
   }
   const map=shadow.getShadowMap();map.renderList.length=0;
   for(const mesh of meshes)if(mesh.material&&mesh.material.alpha===1&&!['warm','blue','display','stageScreen','instrumentDisplay','contact'].includes(mesh.material.name))map.renderList.push(mesh);
  }
  assignShadow(0);
  scene.onBeforeRenderObservable.add(()=>{const r=layout.rooms.findIndex(room=>Math.abs(camera.position.x-room.x)<room.w/2&&Math.abs(camera.position.z-room.z)<room.d/2);if(r>=0){if(currentRoom!==r){currentRoom=r;onRoom(layout.rooms[r].name);assignShadow(r);}}else if(currentRoom!==null){currentRoom=null;onRoom('Arrival corridor');}});
  if(!engineOverride){createExteriorBackdrop(scene,layout,l,{CreateCylinder,StandardMaterial,DynamicTexture,Color3,Mesh});post=createInteriorPipeline(scene,camera,quality);}
  for(const r of layout.rooms){const sign=label(r.name,r.doorX-Math.sin(r.angle)*.14,2.8,r.doorZ-Math.cos(r.angle)*.14,Math.min(r.localWidth*.78,3.8));sign.rotation.y=r.angle+Math.PI;}

  onFloor(l,layout.rooms);onRoom('Arrival corridor');awaitingFrame='floor-first-frame';
  }finally{assembly.root.traverse(object=>object.geometry?.dispose());}
 }
 function stop(){flight?.pause();flight=null;}
 function visit(index){stop();const r=layout.rooms[index];if(!r)return;
  const points=routeToRoom(layout,[camera.position.x,camera.position.z],index);let k=0;camera.detachControl();
  function next(){if(disposed)return;if(k>=points.length){currentRoom=index;camera.setTarget(new Vector3(r.x,1.45,r.z));camera.attachControl(canvas,true);flight=null;onRoom(r.name);return;}const [x,z]=points[k++];camera.setTarget(new Vector3(x,1.7,z));flight=animate(camera.position,{x,z,duration:reduced?0:Math.max(350,Math.hypot(x-camera.position.x,z-camera.position.z)*100),ease:'inOutSine',onComplete:next});}next();
 }
 function interrupt(){stop();camera?.attachControl(canvas,true);}
 const onKey=e=>{if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))interrupt();};
 const resize=()=>{scale();engine.resize();};
 const blur=()=>{stop();held.clear();camera?.detachControl();if(camera){camera.cameraDirection.set(0,0,0);camera.cameraRotation.set(0,0);camera.attachControl(canvas,true);}};
 const lostObserver=engine.onContextLostObservable.add(()=>{contextLost=true;blur();onLifecycle('interior-context-lost',{facility:f.key,floor:level+1});});
 const restoredObserver=engine.onContextRestoredObservable.add(()=>{if(disposed)return;contextLost=false;awaitingFrame='interior-context-restored';});
 function dispose(){if(disposed)return;disposed=true;stop();held.clear();engine.stopRenderLoop();engine.onContextLostObservable.remove(lostObserver);engine.onContextRestoredObservable.remove(restoredObserver);canvas.removeEventListener('pointerdown',interrupt);window.removeEventListener('keydown',onKey);window.removeEventListener('resize',resize);window.removeEventListener('blur',blur);post?.dispose();shadow?.dispose();scene?.dispose();engine.dispose();}
 try{
  scale();canvas.addEventListener('pointerdown',interrupt);window.addEventListener('keydown',onKey);window.addEventListener('resize',resize);window.addEventListener('blur',blur);
  build(0);engine.runRenderLoop(()=>{if(!scene||disposed||contextLost||document.hidden)return;try{const dt=Math.min(engine.getDeltaTime()/1000,.05);if(held.size){interrupt();const fwd=camera.getDirection(new Vector3(0,0,-1));fwd.y=0;fwd.normalize();const right=camera.getDirection(Vector3.Right());right.y=0;const delta=Vector3.Zero();if(held.has('forward'))delta.addInPlace(fwd);if(held.has('back'))delta.subtractInPlace(fwd);if(held.has('left'))delta.subtractInPlace(right);if(held.has('right'))delta.addInPlace(right);camera.cameraDirection.addInPlace(delta.scale(dt*2.5));}camera.position.y=1.67;scene.render();if(!engineOverride&&!scene.isReady())return;if(awaitingFrame){onLifecycle(awaitingFrame,{facility:f.key,floor:level+1});awaitingFrame=null;}onFrame({engine:'Babylon.js',facility:f.key,floor:level+1,frameMs:engine.getDeltaTime(),width:engine.getRenderWidth(),height:engine.getRenderHeight(),meshes:scene.meshes.length});}catch(error){dispose();onError(error);}});
 }catch(error){dispose();throw error;}
 return {getCanvas:()=>canvas,getScene:()=>scene,getCamera:()=>camera,setFloor(l){if(disposed)return;const previous=scene;try{build(l);}catch(error){if(scene===previous&&!previous.isDisposed)throw error;dispose();onError(error);}},visit,setQuality(value){if(disposed)return;quality=value;scale();if(scene&&camera&&!engineOverride){post?.dispose();post=createInteriorPipeline(scene,camera,quality);}engine.resize();},hold(key,value){if(disposed)return;if(value)held.add(key);else held.delete(key);},dispose};
}
