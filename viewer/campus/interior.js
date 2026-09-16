import {Engine} from '@babylonjs/core/Engines/engine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Color3,Color4} from '@babylonjs/core/Maths/math.color.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight.js';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight.js';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera.js';
import {CreateBox} from '@babylonjs/core/Meshes/Builders/boxBuilder.js';
import {CreatePlane} from '@babylonjs/core/Meshes/Builders/planeBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import '@babylonjs/core/Collisions/collisionCoordinator.js';
const MeshBuilder={CreateBox,CreatePlane};
import {animate} from 'animejs';
import {floorLayout} from './data.js';
export function createInterior(canvas,f,{onRoom,onFloor,reduced=false,engineOverride=null}){
 const engine=engineOverride||new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:false});engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));
 let scene,camera,layout,level=0,flight=null,currentRoom=null,disposed=false;const held=new Set();
 function material(name,hex,emission=0){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(.15,.15,.15);if(emission)m.emissiveColor=m.diffuseColor.scale(emission);return m;}
 function box(name,x,y,z,w,h,d,mat,collision=true){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=mat;m.checkCollisions=collision;return m;}
 function label(text,x,y,z,width=4){const tex=new DynamicTexture('room-sign',{width:1024,height:128},scene,false);const ctx=tex.getContext();ctx.fillStyle='#10222b';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#f4d797';ctx.font='36px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,78,990);tex.update();const m=new StandardMaterial('sign',scene);m.diffuseTexture=tex;m.emissiveColor=Color3.White();m.backFaceCulling=false;const p=MeshBuilder.CreatePlane('Program: '+text,{width,height:width/8},scene);p.position.set(x,y,z);p.material=m;return p;}
 function build(l){
  flight?.pause();held.clear();scene?.dispose();level=l;currentRoom=null;layout=floorLayout(f,l);scene=new Scene(engine);scene.clearColor=new Color4(.055,.08,.11,1);scene.collisionsEnabled=true;scene.gravity=new Vector3(0,-.12,0);
  camera=new FreeCamera('visitor',new Vector3(-layout.w/2+layout.core+1,1.7,0),scene);camera.minZ=.08;camera.speed=.38;camera.angularSensibility=3200;camera.inertia=.55;camera.checkCollisions=true;camera.applyGravity=false;camera.ellipsoid=new Vector3(.3,.8,.3);camera.keysUp=[87,38];camera.keysDown=[83,40];camera.keysLeft=[65,37];camera.keysRight=[68,39];camera.setTarget(new Vector3(layout.w/2,1.7,0));camera.attachControl(canvas,true);
  const hemi=new HemisphericLight('soft daylight',new Vector3(0,1,0),scene);hemi.intensity=.9;const sun=new DirectionalLight('window light',new Vector3(.4,-1,.3),scene);sun.intensity=.65;
  const wall=material('warm stone','#c7c4b6'),floor=material('limestone','#9b9b90'),navy=material('graphite','#18262c'),wood=material('oak','#aa8860'),gold=material('brass','#bc9f6b'),glass=material('blue glass','#568794'),warm=material('light strips','#ffdaa0',1),teal=material('screen','#26c5d0',.8),leaf=material('foliage','#486f45');
  box('floor',0,-.15,0,layout.w,.3,layout.d,floor);box('ceiling',0,3.9,0,layout.w,.2,layout.d,wall);
  box('circulation runner',0,.015,0,layout.w,.025,layout.corridor-.3,navy,false);
  for(const side of [-1,1]){box('outer wall',side*layout.w/2,1.9,0,.2,3.8,layout.d,wall);box('exterior glazing',0,1.95,side*layout.d/2,layout.w,3.7,.2,glass);box('baseboard',0,.2,side*(layout.d/2-.15),layout.w,.2,.15,gold);}
  for(let x=-layout.w/2+2;x<layout.w/2;x+=4){box('corridor lighting',x,3.77,0,2.4,.06,.18,warm,false);}
  for(const r of layout.rooms){const side=Math.sign(r.z),edge=side*layout.corridor/2;const door=Math.min(4,(f.width-2*Math.min(16,f.width*.14))/15)*.3048;const left=r.x-r.w/2,right=r.x+r.w/2;
   for(const x of [left,right])box('room partition',x,1.9,r.z,.12,3.8,r.d,wall);
   const dl=r.doorX-door/2,dr=r.doorX+door/2;
   box('corridor wall', (left+dl)/2,1.9,edge,dl-left,3.8,.12,wall);box('corridor wall',(dr+right)/2,1.9,edge,right-dr,3.8,.12,wall);box('door lintel',r.doorX,3.25,edge,door,.9,.18,navy);for(const x of [dl,dr])box('door frame',x,1.4,edge,.09,2.8,.2,gold);
   const sign=label(r.name,r.doorX,3.22,edge-side*.12,Math.min(r.w*.9,5));if(side<0)sign.rotation.y=Math.PI;
   // Program-specific fixtures, with a clear central route from every doorway.
   const name=r.name.toLowerCase(),rack=/gpu|data hall|cold storage|faraday|network|routing|telemetry|backup/.test(name),lab=/lab|research|treatment|clinical|diagnostic|testing|nutrition/.test(name),grow=/grow|crop|algae|food|plant|seed/.test(name),industrial=/assembl|fabric|manufact|robot|receiv|storage|inventory|loading|packag/.test(name),lounge=/lounge|reception|gallery|event|commons|care|family/.test(name);
   const count=Math.min(5,Math.max(2,Math.floor(r.d/3)));
   for(let k=0;k<count;k++)for(const s of [-1,1]){const x=r.x+s*r.w*.32,z=r.z-r.d*.32+k*(r.d*.64/Math.max(1,count-1));
    if(rack){box('server cabinet',x,1.1,z,1.1,2.2,.8,navy);for(let n=0;n<7;n++)box('rack status',x, .3+n*.24,z+.42,.7,.04,.03,teal,false);}
    else if(grow){box('cultivation rack',x,.9,z,1.3,1.8,1.2,navy);for(let n=0;n<3;n++){box('grow tray',x,.4+n*.55,z,1.2,.1,1.1,wood);box('crops',x,.55+n*.55,z,1,.2,.8,leaf,false);}}
    else if(industrial){box('work cell',x,.6,z,1.6,1.2,1.3,navy);box('machining bed',x,1.25,z,1.8,.15,1.5,gold);box('articulated tool',x+.45,1.9,z,.2,1.2,.2,teal);}
    else if(lounge){box('sofa',x,.4,z,1.5,.65,.8,wood);box('sofa back',x,.8,z+.32,1.5,.6,.18,navy);}
    else {box(lab?'lab bench':'desk',x,.82,z,Math.min(r.w*.25,1.8),.12,.85,lab?wall:wood);for(const dx of [-.55,.55])box('table leg',x+dx,.4,z,.07,.8,.65,navy);box('monitor',x,1.14,z+.25,.55,.4,.055,navy);box('screen',x,1.14,z+.215,.48,.31,.012,teal,false);box('chair',x,.5,z-.65,.5,.12,.5,navy);box('chair back',x,.82,z-.9,.5,.55,.1,navy);}
   }
   // Wall art is abstract physical joinery, never a reference screenshot.
   for(let k=0;k<6;k++)box('window mullion',r.x-r.w*.45+k*r.w*.18,1.9,side*(layout.d/2-.13),.08,3.8,.1,gold);
  }
  label(`${f.key} · ${f.name} · ${f.id===3?'B'+(l+1):'L'+String(l+1).padStart(2,'0')}`,layout.w/2-.15,2.4,0,layout.corridor*.9).rotation.y=-Math.PI/2;
  onFloor(l,layout.rooms);onRoom('Arrival corridor');
 }
 function stop(){flight?.pause();flight=null;}
 function visit(index){stop();const r=layout.rooms[index];if(!r)return;const prior=layout.rooms.find(room=>Math.abs(camera.position.x-room.x)<room.w/2&&Math.abs(camera.position.z-room.z)<room.d/2);
  const points=[];if(prior)points.push([prior.doorX,camera.position.z],[prior.doorX,0]);points.push([r.doorX,0],[r.doorX,Math.sign(r.z)*(layout.corridor/2+1)],[r.doorX,r.z]);let k=0;camera.detachControl();
  function next(){if(disposed)return;if(k>=points.length){currentRoom=index;camera.setTarget(new Vector3(r.x+1,1.7,r.z));camera.attachControl(canvas,true);flight=null;onRoom(r.name);return;}const [x,z]=points[k++];camera.setTarget(new Vector3(x,1.7,z));flight=animate(camera.position,{x,z,duration:reduced?0:Math.max(350,Math.hypot(x-camera.position.x,z-camera.position.z)*100),ease:'inOutSine',onComplete:next});}next();
 }
 function interrupt(){stop();camera?.attachControl(canvas,true);}
 canvas.addEventListener('pointerdown',interrupt);const onKey=e=>{if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))interrupt();};window.addEventListener('keydown',onKey);
 build(0);engine.runRenderLoop(()=>{if(!scene||disposed)return;const dt=Math.min(engine.getDeltaTime()/1000,.05);if(held.size){interrupt();const fwd=camera.getDirection(Vector3.Forward());fwd.y=0;fwd.normalize();const right=camera.getDirection(Vector3.Right());right.y=0;const delta=Vector3.Zero();if(held.has('forward'))delta.addInPlace(fwd);if(held.has('back'))delta.subtractInPlace(fwd);if(held.has('left'))delta.subtractInPlace(right);if(held.has('right'))delta.addInPlace(right);camera.cameraDirection.addInPlace(delta.scale(dt*2.5));}camera.position.y=1.7;scene.render();});
 const resize=()=>engine.resize();window.addEventListener('resize',resize);
 return {setFloor:build,visit,hold(key,value){if(value)held.add(key);else held.delete(key);},dispose(){disposed=true;stop();held.clear();canvas.removeEventListener('pointerdown',interrupt);window.removeEventListener('keydown',onKey);window.removeEventListener('resize',resize);scene.dispose();engine.dispose();}};
}
