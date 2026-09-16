// @ts-nocheck
import {exteriorPixelRatio} from './campus/quality.js';
import {createPerformanceReport} from './campus/performance-report.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {animate} from 'animejs';
import {FACILITIES,DISTRICTS,SPIRES} from './campus/data.js';
import {createFacility} from './campus/buildings.js';
import {createLandscape,createInfrastructure} from './campus/landscape.js';
import {createFleets} from './campus/fleets.js';
import {setDuskMaterials} from './campus/geometry.js';
import {createCampusMap,createPlanViewer} from './campus/plans.js';
const $=s=>document.querySelector(s);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let renderer,scene,camera,controls,composer,landscape,infrastructure,fleets,interior=null,selected=null,flight=null,flyover=false,showLabels=true,entering=false,clock=0;
let quality='balanced';const performanceReport=createPerformanceReport();
const buildings=[],markers=[];const mobile=matchMedia('(max-width:760px)').matches;const automated=typeof navigator!=='undefined'&&(navigator.webdriver||/Headless/i.test(navigator.userAgent));let sun,hemi,rim,sky,bloom,ambient;let graphicsReady=false;const planViewer=createPlanViewer();
let booted=false,looping=false;
function message(text){const el=$('#status');if(el)el.textContent=text;}
function sheet(){document.body.classList.toggle('sheet-open',!$('#detail')?.hidden||!$('#directory')?.hidden);}
function closeDirectory(){if($('#directory'))$('#directory').hidden=true;$('#directory-toggle')?.setAttribute('aria-expanded','false');sheet();}
function updateDirectory(){if(!$('#facility-list'))return;const q=($('#search')?.value||'').toLowerCase().trim(),district=Number($('#district')?.value||0);const fs=FACILITIES.filter(f=>(!district||f.district===district)&&(!q||`${f.key} ${f.id} ${f.name}`.toLowerCase().includes(q)));$('#facility-list').replaceChildren();for(const f of fs){const button=document.createElement('button');button.innerHTML=`<span>${String(f.id).padStart(2,'0')}</span>${f.name}`;button.onclick=()=>select(f.id);$('#facility-list').append(button);}if(!fs.length){const p=document.createElement('p');p.textContent='No matching facilities.';$('#facility-list').append(p);}}
function select(id){document.body.classList.add('exploring');selected=FACILITIES.find(f=>f.id===id);if(!selected)return;const f=selected;if($('#detail'))$('#detail').hidden=false;if(innerWidth<761)closeDirectory();sheet();if($('#facility-key'))$('#facility-key').textContent=f.key;if($('#facility-name'))$('#facility-name').textContent=f.name;if($('#facility-district'))$('#facility-district').textContent=DISTRICTS[f.district];if($('#facility-area'))$('#facility-area').textContent=f.design_area.toLocaleString();if($('#facility-floors'))$('#facility-floors').textContent=f.levels;if($('#facility-program'))$('#facility-program').textContent=f.program[0].split(';').slice(0,4).join(' · ');if($('#area-note'))$('#area-note').textContent=f.assumedArea?'Area is a design-package assumption; original allowance remains unresolved.':'Program and floor count from the supplied schematic design package.';markers.forEach(({el,f})=>el.classList.toggle('selected',f.id===id));message(graphicsReady?`${f.key} selected · exterior or interior tour available`:`${f.key} selected · schematic floor plans available`);}
function moveCamera(position,target){if(!graphicsReady)return;document.body.classList.add('exploring');flight?.pause();flyover=false;$('#tour')?.classList.remove('active');const state={x:camera.position.x,y:camera.position.y,z:camera.position.z,tx:controls.target.x,ty:controls.target.y,tz:controls.target.z};flight=animate(state,{x:position[0],y:position[1],z:position[2],tx:target[0],ty:target[1],tz:target[2],duration:reduced?0:1200,ease:'inOutCubic',onUpdate:()=>{camera.position.set(state.x,state.y,state.z);controls.target.set(state.tx,state.ty,state.tz);controls.update();},onComplete:()=>flight=null});}
function focus(){if(!selected)return;const f=selected;moveCamera([f.x+f.w*1.2,f.h+f.w*.8,f.z+f.d*1.9],[f.x,f.h*.35,f.z]);}
function createDuskSky(){
 const group=new T.Group();group.name='dusk-sky';
 const mat=new T.ShaderMaterial({
  side:T.BackSide,fog:false,toneMapped:false,depthWrite:false,
  uniforms:{
   uTop:{value:new T.Color(0x1c0818)},
   uMid:{value:new T.Color(0xb44876)},
   uHorizon:{value:new T.Color(0xff9a58)},
   uDay:{value:0},
  },
  vertexShader:`varying vec3 vN;void main(){vN=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`
   varying vec3 vN;uniform vec3 uTop,uMid,uHorizon;uniform float uDay;
   void main(){
    float h=vN.y;
    vec3 dusk=mix(uHorizon,uMid,smoothstep(-0.08,0.24,h));
    dusk=mix(dusk,uTop,smoothstep(0.24,0.82,h));
    vec3 day=mix(vec3(0.86,0.92,0.97),vec3(0.38,0.64,0.84),smoothstep(0.0,0.85,h));
    vec3 col=mix(dusk,day,uDay);
    float cloud=smoothstep(0.4,0.85,sin(vN.x*3.4+vN.z*2.0)*sin(vN.z*1.7-vN.x)*0.5+0.5);
    col+=vec3(0.16,0.09,0.11)*cloud*(1.0-uDay);
    gl_FragColor=vec4(col,1.0);
   }
  `,
 });
 const dome=new T.Mesh(new T.SphereGeometry(4800,32,20),mat);dome.name='dusk-dome';group.add(dome);
 const sunDisc=new T.Mesh(new T.SphereGeometry(90,16,12),new T.MeshBasicMaterial({color:0xffc078,fog:false,toneMapped:false}));
 sunDisc.name='sun-disc';group.add(sunDisc);
 group.userData.skyMat=mat;group.userData.sunDisc=sunDisc;
 return group;
}
function setDay(day){
 if(!sky||!sun||!hemi||!rim)return;
 const polar=day?48:86, azi=208;
 const direction=new T.Vector3().setFromSphericalCoords(1,T.MathUtils.degToRad(polar),T.MathUtils.degToRad(azi));
 sun.position.copy(direction).multiplyScalar(1400);
 if(sky.userData?.skyMat){
  sky.userData.skyMat.uniforms.uDay.value=day?1:0;
  sky.userData.sunDisc.position.copy(direction).multiplyScalar(2400);
  sky.userData.sunDisc.visible=!day;
 }else if(sky.material?.uniforms?.sunPosition){
  sky.material.uniforms.sunPosition.value.copy(direction);
 }
 $('#day')?.setAttribute('aria-pressed',String(day));
 hemi.intensity=day?1.2:.95;
 hemi.color.set(day?0xd4e8f4:0xffc4a8);
 hemi.groundColor.set(day?0x3a4a32:0x3a2018);
 sun.intensity=day?3.1:2.7;
 sun.color.set(day?0xfff3dc:0xff8a42);
 rim.intensity=day?.55:1.3;
 rim.color.set(day?0x7eb4c8:0xc090ff);
 scene.background.set(day?0x8eb6c8:0x6a2848);
 scene.fog.color.set(day?0x8eb6c8:0xe88870);
 scene.fog.near=day?2200:1700;
 scene.fog.far=day?5200:4000;
 setDuskMaterials(!day);
 if(bloom){bloom.strength=day?0.12:0.48;bloom.threshold=day?1.1:0.58;}
 renderer.toneMappingExposure=day?1.08:0.9;
 if(ambient)ambient.intensity=day?.45:.32;
 if(scene.environment)scene.environmentIntensity=day?.7:.42;
}
async function enter(){if(!graphicsReady)return;if(!selected||entering||interior)return;entering=true;if($('#enter')){$('#enter').disabled=true;$('#enter').textContent='Opening interior…';}const f=selected;try{const {createInterior}=await import('./campus/interior.js');flight?.pause();flyover=false;$('#interior').hidden=false;$('#inside-key').textContent=f.key;$('#inside-name').textContent=f.name;$('#floor-select').replaceChildren();for(let i=0;i<f.levels;i++){const option=document.createElement('option');option.value=i;option.textContent=f.id===3?`B${i+1}`:`L${String(i+1).padStart(2,'0')}`;$('#floor-select').append(option);}interior=createInterior($('#interior-canvas'),f,{reduced,quality,onFrame:sample=>performanceReport.record({...sample,quality}),onRoom:name=>{$('#room-status').textContent=name;},onFloor:(l,rooms)=>{$('#floor-select').value=l;$('#room-list').hidden=false;$('#rooms-toggle').setAttribute('aria-expanded','true');$('#room-list').replaceChildren();rooms.forEach((r,i)=>{const button=document.createElement('button');button.textContent=`${i+1}. ${r.name}`;button.onclick=()=>{interior?.visit(i);if(innerWidth<761){$('#room-list').hidden=true;$('#rooms-toggle').setAttribute('aria-expanded','false');}};$('#room-list').append(button);});}});$('#interior-canvas').focus();message('');}catch(e){console.error(e);$('#interior').hidden=true;interior?.dispose();interior=null;message('Interior could not open. Please try again.');}finally{entering=false;if($('#enter')){$('#enter').disabled=false;$('#enter').innerHTML='Explore inside <span>↗</span>';}}}
function exit(){interior?.dispose();interior=null;if($('#interior'))$('#interior').hidden=true;renderer?.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight);$('#enter')?.focus();}
function bind(){
 const setQuality=value=>{quality=value;document.querySelectorAll('[data-quality]').forEach(s=>s.value=value);renderer?.setPixelRatio(exteriorPixelRatio(devicePixelRatio,value,mobile));renderer?.setSize(innerWidth,innerHeight);composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(innerWidth,innerHeight);interior?.setQuality(value);};
 document.querySelectorAll('[data-quality]').forEach(s=>s.onchange=e=>setQuality(e.target.value));
 if($('#rooms-toggle'))$('#rooms-toggle').onclick=()=>{const open=$('#room-list').hidden;$('#room-list').hidden=!open;$('#rooms-toggle').setAttribute('aria-expanded',String(open));};
 if($('#performance-report'))$('#performance-report').onclick=()=>{if(performanceReport.active){const report=performanceReport.finish();$('#performance-report').textContent='Record device performance';message(report.segments.length?'Device report downloaded.':'No rendered frames recorded.');}else{performanceReport.start();$('#performance-report').textContent='Finish & download report';message('Recording locally · explore the campus and interiors, then finish in Systems.');}};
 const dist=$('#district');if(dist){dist.replaceChildren();DISTRICTS.forEach((name,i)=>{const option=document.createElement('option');option.value=i;option.textContent=name;dist.append(option);});}
 updateDirectory();if($('#search'))$('#search').oninput=updateDirectory;if(dist)dist.onchange=updateDirectory;
 if($('#directory-toggle'))$('#directory-toggle').onclick=()=>{const open=$('#directory').hidden;$('#directory').hidden=!open;$('#directory-toggle').setAttribute('aria-expanded',String(open));if(open&&innerWidth<761&&$('#detail'))$('#detail').hidden=true;sheet();if(open)$('#search')?.focus();};
 if($('#directory-close'))$('#directory-close').onclick=closeDirectory;if($('#detail-close'))$('#detail-close').onclick=()=>{$('#detail').hidden=true;sheet();};
 if($('#focus'))$('#focus').onclick=focus;if($('#view-plan'))$('#view-plan').onclick=()=>{if(selected)planViewer.open(selected);};if($('#enter'))$('#enter').onclick=enter;if($('#exit-interior'))$('#exit-interior').onclick=exit;if($('#floor-select'))$('#floor-select').onchange=e=>interior?.setFloor(Number(e.target.value));
 if($('#aerial'))$('#aerial').onclick=()=>moveCamera([40,mobile?720:680,mobile?980:920],[0,10,-40]);if($('#north'))$('#north').onclick=()=>moveCamera([-80,620,-980],[20,20,-40]);if($('#ground'))$('#ground').onclick=()=>{if(selected){const f=selected;moveCamera([f.x,5.2,f.z+f.d/2+38],[f.x,f.h*.42,f.z]);}else moveCamera([-280,8,285],[-130,25,110]);};
 if($('#tour'))$('#tour').onclick=()=>{flight?.pause();flyover=!flyover;$('#tour').classList.toggle('active',flyover);};
 if($('#day'))$('#day').onclick=()=>setDay($('#day').getAttribute('aria-pressed')!=='true');
 if($('#layers-toggle'))$('#layers-toggle').onclick=()=>{$('#layers').hidden=!$('#layers').hidden;$('#layers-toggle').setAttribute('aria-expanded',String(!$('#layers').hidden));};
 if($('#labels'))$('#labels').onclick=()=>{showLabels=!showLabels;$('#labels').setAttribute('aria-pressed',String(showLabels));if($('#markers'))$('#markers').hidden=!showLabels;};
 if($('#mesh-layer'))$('#mesh-layer').onchange=e=>infrastructure?.setNetwork(e.target.checked);
 if($('#energy-layer'))$('#energy-layer').onchange=e=>infrastructure?.setEnergy(e.target.checked);
 if($('#fleet-layer'))$('#fleet-layer').onchange=e=>{if(fleets)fleets.root.visible=e.target.checked;};
 document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);interior?.hold(b.dataset.move,true);};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>interior?.hold(b.dataset.move,false));});
 window.addEventListener('blur',()=>{document.querySelectorAll('[data-move]').forEach(b=>interior?.hold(b.dataset.move,false));});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(interior)exit();else{closeDirectory();if($('#detail'))$('#detail').hidden=true;if($('#layers'))$('#layers').hidden=true;sheet();}}});
}
function attachCanvas(){
 const app=document.getElementById('app');
 if(app&&renderer&&renderer.domElement.parentNode!==app)app.append(renderer.domElement);
}
function reveal(){
 document.body.classList.add('campus-ready');
 const loading=document.getElementById('loading');
 if(loading)loading.hidden=true;
}
const yieldFrame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
async function boot(){
 const app=document.getElementById('app');
 if(!app)return;
 if(renderer){
  attachCanvas();
  bind();
  reveal();
  return;
 }
 if(booted)return;booted=true;
 try{
 bind();
 renderer=new T.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance',preserveDrawingBuffer:true,alpha:false});renderer.setPixelRatio(exteriorPixelRatio(devicePixelRatio,quality,mobile));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.shadowMap.enabled=!mobile;if(!mobile)renderer.shadowMap.type=T.PCFSoftShadowMap;attachCanvas();
 scene=new T.Scene();scene.background=new T.Color(0x6a2848);scene.fog=new T.Fog(0xe88870,1700,4000);sky=createDuskSky();scene.add(sky);camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.5,9000);camera.position.set(40,mobile?720:680,mobile?980:920);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,10,-40);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.02;controls.minDistance=8;controls.maxDistance=2300;controls.update();controls.addEventListener('start',()=>{document.body.classList.add('exploring');flight?.pause();flight=null;flyover=false;$('#tour')?.classList.remove('active');});
 try{
  const pmrem=new T.PMREMGenerator(renderer);const env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.04).texture;scene.environmentIntensity=.55;env.dispose();pmrem.dispose();
 }catch{scene.environment=null;}
 ambient=new T.AmbientLight(0xffead4,.28);scene.add(ambient);
 hemi=new T.HemisphereLight(0xffc090,0x3a2818,.85);scene.add(hemi);sun=new T.DirectionalLight(0xff9a48,2.4);sun.position.set(-400,180,-1200);if(!mobile){sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-700;sun.shadow.camera.right=700;sun.shadow.camera.top=700;sun.shadow.camera.bottom=-700;sun.shadow.camera.far=2400;sun.shadow.normalBias=.6;}scene.add(sun);rim=new T.DirectionalLight(0xb08cff,1.15);rim.position.set(420,180,380);scene.add(rim);
 const prismFill=new T.PointLight(0xffc070,1800,220,2);prismFill.position.set(0,70,-315);scene.add(prismFill);
 const aetherFill=new T.PointLight(0x66f0ff,1400,180,2);aetherFill.position.set(437,90,212);scene.add(aetherFill);

 if($('#load-message'))$('#load-message').textContent='Sculpting the living campus…';
 landscape=createLandscape();scene.add(landscape.root);
 try{
  if(!mobile&&!automated){
   composer=new EffectComposer(renderer);
   composer.setPixelRatio(renderer.getPixelRatio());
   composer.setSize(innerWidth,innerHeight);
   composer.addPass(new RenderPass(scene,camera));
   bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.42,.55,.62);
   composer.addPass(bloom);
   composer.addPass(new OutputPass());
  }
 }catch{composer=null;bloom=null;}
 setDay(false);
 let last=performance.now(),frames=0;const projected=new T.Vector3();
 function render(now){
  requestAnimationFrame(render);
  const dt=Math.min((now-last)/1000,.05);last=now;if(interior||document.hidden)return;if(!reduced)clock+=dt;
  try{landscape?.update(clock);infrastructure?.update(clock);fleets?.update(clock);}catch{}
  if(flyover&&!reduced){camera.position.set(Math.sin(clock*.032)*1100,720,Math.cos(clock*.032)*1100);controls.target.set(0,12,-40);}
  controls.update();sky.position.copy(camera.position);
  if(composer)composer.render();else renderer.render(scene,camera);
  performanceReport.record({engine:'Three.js',quality,width:renderer.domElement.width,height:renderer.domElement.height,drawCalls:renderer.info.render.calls,meshes:scene.children.length});
  if(++frames%3===0&&showLabels){const far=camera.position.length()>800;const occupied=[];const host=document.getElementById('markers');for(const {el,f} of markers){if(!el.isConnected&&host)host.append(el);projected.set(f.x,f.h+8,f.z).project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;let visible=projected.z<1&&projected.z>-1&&x>10&&x<innerWidth-10&&y>90&&y<innerHeight-135;if(mobile&&far&&f.id%2===0)visible=false;if(visible&&occupied.some(p=>Math.hypot(p[0]-x,p[1]-y)<28))visible=false;if(visible)occupied.push([x,y]);el.hidden=!visible;el.style.left=x+'px';el.style.top=y+'px';}}
 }
 if(!looping){looping=true;window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight);composer?.setPixelRatio(renderer.getPixelRatio());});render(performance.now());}
 if(automated)await new Promise(r=>setTimeout(r,2200));
 reveal();
 if($('#load-message'))$('#load-message').textContent='Raising 35 facilities…';
 await yieldFrame();
 const markerHost=document.getElementById('markers');
 for(let i=0;i<FACILITIES.length;i++){
  const f=FACILITIES[i];
  const group=createFacility(f);buildings.push(group);scene.add(group);
  const el=document.createElement('button');el.className='marker';el.textContent=String(f.id).padStart(2,'0');el.setAttribute('aria-label',`${f.key} ${f.name}`);el.onclick=()=>select(f.id);
  if(markerHost)markerHost.append(el);markers.push({el,f});
  if(i%5===4)await yieldFrame();
 }
 infrastructure=createInfrastructure();scene.add(infrastructure.root);
 fleets=createFleets(landscape.roads);scene.add(fleets.root);
 new GLTFLoader().load(`${import.meta.env.BASE_URL}models/synergy-node.glb`,g=>{for(const [x,z] of SPIRES){const node=g.scene.clone(true);node.position.set(x+13,0,z);node.name='Blender physical synergy node';scene.add(node);}},undefined,e=>{console.warn('Synergy node detail unavailable',e);message('Some node detail failed to load; mesh towers remain available.');});
 const ray=new T.Raycaster(),pointer=new T.Vector2();let start=null;renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(buildings,true)[0];if(hit)select(hit.object.userData.facility);start=null;});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();message('3D graphics paused. Reload the page to restore the campus.');});
 graphicsReady=true;reveal();
 }catch(e){console.error(e);graphicsReady=false;renderer?.dispose();createCampusMap($('#app'),select);reveal();if($('#toolbar'))$('#toolbar').hidden=true;if($('#scene-caption'))$('#scene-caption').hidden=true;if($('#hint'))$('#hint').hidden=true;if($('#focus'))$('#focus').hidden=true;if($('#enter')){$('#enter').disabled=true;$('#enter').textContent='3D tour unavailable';$('#enter').title='This browser could not initialize 3D graphics. Floor plans remain available.';}message('Schematic view · 3D graphics unavailable');}
}
export {boot};
if(typeof document!=='undefined' && document.getElementById('app') && !document.getElementById('app').dataset.react){
 boot().catch(e=>{console.error(e);graphicsReady=false;renderer?.dispose();createCampusMap($('#app'),select);reveal();if($('#toolbar'))$('#toolbar').hidden=true;if($('#scene-caption'))$('#scene-caption').hidden=true;if($('#hint'))$('#hint').hidden=true;if($('#focus'))$('#focus').hidden=true;if($('#enter')){$('#enter').disabled=true;$('#enter').textContent='3D tour unavailable';$('#enter').title='This browser could not initialize 3D graphics. Floor plans remain available.';}message('Schematic view · 3D graphics unavailable');});
}
