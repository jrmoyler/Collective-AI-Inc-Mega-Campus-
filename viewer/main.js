// @ts-nocheck
import {createFrameLoop,withRendererState,disposeSceneResources} from './campus/render-lifecycle.js';
import {exteriorPixelRatio} from './campus/quality.js';
import {createPerformanceReport} from './campus/performance-report.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {animate} from 'animejs';
import {FACILITIES,DISTRICTS,SPIRES} from './campus/data.js';
import {createFacility} from './campus/buildings.js';
import {createLandscape,createInfrastructure} from './campus/landscape.js';
import {createFleets} from './campus/fleets.js';
import {createStreetFurniture} from './campus/street-furniture.js';
import {setDuskMaterials} from './campus/geometry.js';
import {createCampusMap,createPlanViewer} from './campus/plans.js';
const $=s=>document.querySelector(s);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let renderer,scene,camera,controls,composer,landscape,infrastructure,fleets,streetFurniture,interior=null,selected=null,flight=null,flyover=false,showLabels=true,entering=false,clock=0;
let quality='balanced';const performanceReport=createPerformanceReport();
const buildings=[],markers=[];const mobile=matchMedia('(max-width:760px)').matches;let sun,hemi,rim,sky,bloom,ambient;let graphicsReady=false;const planViewer=createPlanViewer();
let booted=false,frameLoop=null,tourRequest=0,resizeHandler=null,graphicsGeneration=0;
function message(text){const el=$('#status');if(el)el.textContent=text;}
function sheet(){document.body.classList.toggle('sheet-open',!$('#detail')?.hidden||!$('#directory')?.hidden);}
function closeDirectory(){if($('#directory'))$('#directory').hidden=true;$('#directory-toggle')?.setAttribute('aria-expanded','false');sheet();}
function updateDirectory(){if(!$('#facility-list'))return;const q=($('#search')?.value||'').toLowerCase().trim(),district=Number($('#district')?.value||0);const fs=FACILITIES.filter(f=>(!district||f.district===district)&&(!q||`${f.key} ${f.id} ${f.name}`.toLowerCase().includes(q)));$('#facility-list').replaceChildren();for(const f of fs){const button=document.createElement('button');button.innerHTML=`<span>${String(f.id).padStart(2,'0')}</span>${f.name}`;button.onclick=()=>select(f.id);$('#facility-list').append(button);}if(!fs.length){const p=document.createElement('p');p.textContent='No matching facilities.';$('#facility-list').append(p);}}
function select(id){document.body.classList.add('exploring');selected=FACILITIES.find(f=>f.id===id);if(!selected)return;const f=selected;if($('#detail'))$('#detail').hidden=false;if(innerWidth<761)closeDirectory();sheet();if($('#facility-key'))$('#facility-key').textContent=f.key;if($('#facility-name'))$('#facility-name').textContent=f.name;if($('#facility-district'))$('#facility-district').textContent=DISTRICTS[f.district];if($('#facility-area'))$('#facility-area').textContent=f.design_area.toLocaleString();if($('#facility-floors'))$('#facility-floors').textContent=f.levels;if($('#facility-program'))$('#facility-program').textContent=f.program[0].split(';').slice(0,4).join(' · ');if($('#area-note'))$('#area-note').textContent=f.assumedArea?'Area is a design-package assumption; original allowance remains unresolved.':'Program and floor count from the supplied schematic design package.';markers.forEach(({el,f})=>el.classList.toggle('selected',f.id===id));message(graphicsReady?`${f.key} selected · exterior or interior tour available`:`${f.key} selected · schematic floor plans available`);}
function moveCamera(position,target){if(!graphicsReady)return;document.body.classList.add('exploring');flight?.pause();flyover=false;$('#tour')?.classList.remove('active');const state={x:camera.position.x,y:camera.position.y,z:camera.position.z,tx:controls.target.x,ty:controls.target.y,tz:controls.target.z};flight=animate(state,{x:position[0],y:position[1],z:position[2],tx:target[0],ty:target[1],tz:target[2],duration:reduced?0:1200,ease:'inOutCubic',onUpdate:()=>{camera.position.set(state.x,state.y,state.z);controls.target.set(state.tx,state.ty,state.tz);controls.update();},onComplete:()=>flight=null});}
function facilityHeight(f){return buildings.find(group=>group.userData.facility===f.id)?.userData.envelopeHeight??f.h;}
function focus(){if(!selected)return;const f=selected,h=facilityHeight(f);moveCamera([f.x+f.w*1.2,h+f.w*.8,f.z+f.d*1.9],[f.x,h*.35,f.z]);}
function disposePostprocessing(){
 if(!composer)return;
 const disposing=composer;composer=null;bloom=null;
 try{renderer?.setRenderTarget(null);}catch(error){console.warn('Render target cleanup failed',error);}
 for(const pass of disposing.passes)try{pass.dispose?.();}catch(error){console.warn('Render pass cleanup failed',error);}
 try{disposing.dispose();}catch(error){console.warn('Composer cleanup failed',error);}
}
function failGraphics(error){
 console.error(error);graphicsGeneration++;graphicsReady=false;frameLoop?.stop();flight?.pause();flyover=false;
 try{exit();}catch(cleanupError){console.warn('Interior cleanup failed',cleanupError);interior=null;if($('#interior'))$('#interior').hidden=true;}
 disposePostprocessing();
 for(const resource of [controls,environmentTarget])try{resource?.dispose();}catch(cleanupError){console.warn('Graphics cleanup failed',cleanupError);}
 environmentTarget=null;controls=null;
 const cleanup=disposeSceneResources(scene);if(cleanup.errors.length)console.warn('Some scene resources failed to dispose',cleanup.errors);
 scene=null;landscape=null;infrastructure=null;fleets=null;streetFurniture=null;sky=null;sun=null;hemi=null;rim=null;ambient=null;camera=null;flight=null;buildings.length=0;
 for(const {el} of markers)el.remove();markers.length=0;
 if(resizeHandler)window.removeEventListener('resize',resizeHandler);
 try{renderer?.dispose();}catch(cleanupError){console.warn('Renderer cleanup failed',cleanupError);}renderer=null;
 createCampusMap($('#app'),select);reveal();
 for(const id of ['toolbar','scene-caption','hint','focus','markers'])if($('#'+id))$('#'+id).hidden=true;
 if($('#enter')){$('#enter').disabled=true;$('#enter').textContent='3D tour unavailable';}
 message('Schematic view · 3D graphics unavailable');
}
function renderFailure(error){
 // A postprocessing failure must not take a functioning base renderer down.
 if(composer){console.error(error);disposePostprocessing();message('Effects unavailable · base 3D rendering active');frameLoop?.start();}
 else failGraphics(error);
}
function createAtmosphere(){
 const dome=new Sky();dome.name='physical-daylight-atmosphere';dome.scale.setScalar(8000);
 const u=dome.material.uniforms;
 u.turbidity.value=2.4;u.rayleigh.value=1.4;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.78;
 u.cloudCoverage.value=.36;u.cloudDensity.value=.26;u.cloudElevation.value=.42;
 return dome;
}
let environmentTarget=null;
function setDay(day){
 if(!sky||!sun||!hemi||!rim)return;
 const direction=new T.Vector3().setFromSphericalCoords(1,T.MathUtils.degToRad(day?48:83),T.MathUtils.degToRad(208));
 sun.position.copy(direction).multiplyScalar(1400);
 sky.material.uniforms.sunPosition.value.copy(direction);
 sky.material.uniforms.turbidity.value=day?2.4:3.2;
 $('#day')?.setAttribute('aria-pressed',String(day));
 hemi.intensity=day?1.25:.8;hemi.color.set(day?0xdcebf4:0xb5bdd6);hemi.groundColor.set(0x64604e);
 sun.intensity=day?2.6:1.45;sun.color.set(day?0xfff3df:0xffd1a2);
 rim.intensity=day?.22:.3;rim.color.set(0xc4dbed);
 scene.background.set(day?0xb2ccdf:0x9496b0);scene.fog.color.set(day?0xb2ccdf:0x9496b0);
 scene.fog.near=900;scene.fog.far=day?4200:3400;
 setDuskMaterials(!day);
 if(bloom){bloom.strength=day?.08:.22;bloom.threshold=1.15;}
 renderer.toneMappingExposure=day?.85:.78;
 if(ambient)ambient.intensity=day?.1:.15;
 // Reflections come from the same outdoor sky, not an indoor showroom.
 let pmrem,envSky;
 try{
  pmrem=new T.PMREMGenerator(renderer);const envScene=new T.Scene();envSky=sky.clone();
  envSky.material=sky.material.clone();envSky.material.uniforms.showSunDisc.value=false;
  envSky.position.set(0,0,0);envScene.add(envSky);
  const next=withRendererState(renderer,()=>pmrem.fromScene(envScene,.04,.1,10000));scene.environment=next.texture;
  environmentTarget?.dispose();environmentTarget=next;
  scene.environmentIntensity=day?.85:.6;
 }catch(e){console.warn('Atmosphere reflections unavailable',e);}
 finally{pmrem?.dispose();if(envSky?.material!==sky.material)envSky?.material.dispose();}
}
async function enter(){if(!graphicsReady)return;if(!selected||entering||interior)return;entering=true;if($('#enter')){$('#enter').disabled=true;$('#enter').textContent='Opening interior…';}const f=selected,request=++tourRequest;try{const {createInterior}=await import('./campus/interior.js');if(request!==tourRequest||!graphicsReady)return;flight?.pause();flyover=false;$('#interior').hidden=false;$('#inside-key').textContent=f.key;$('#inside-name').textContent=f.name;$('#floor-select').replaceChildren();for(let i=0;i<f.levels;i++){const option=document.createElement('option');option.value=i;option.textContent=f.id===3?`B${i+1}`:`L${String(i+1).padStart(2,'0')}`;$('#floor-select').append(option);}interior=createInterior($('#interior-canvas'),f,{reduced,quality,onError:error=>{exit();message('Interior graphics stopped. You can reopen the tour.');console.error(error);},onFrame:sample=>performanceReport.record({...sample,quality}),onRoom:name=>{$('#room-status').textContent=name;},onFloor:(l,rooms)=>{$('#floor-select').value=l;$('#room-list').hidden=false;$('#rooms-toggle').setAttribute('aria-expanded','true');$('#room-list').replaceChildren();rooms.forEach((r,i)=>{const button=document.createElement('button');button.textContent=`${i+1}. ${r.name}`;button.onclick=()=>{interior?.visit(i);if(innerWidth<761){$('#room-list').hidden=true;$('#rooms-toggle').setAttribute('aria-expanded','false');}};$('#room-list').append(button);});}});$('#interior-canvas').focus();message('');}catch(e){if(request!==tourRequest)return;console.error(e);$('#interior').hidden=true;interior?.dispose();interior=null;message('Interior could not open. Please try again.');}finally{if(request===tourRequest){entering=false;if($('#enter')){$('#enter').disabled=false;$('#enter').innerHTML='Explore inside <span>↗</span>';}}}}
function exit(){tourRequest++;entering=false;if($('#enter')){$('#enter').disabled=!graphicsReady;$('#enter').innerHTML='Explore inside <span>↗</span>';}interior?.dispose();interior=null;if($('#interior'))$('#interior').hidden=true;if(graphicsReady){renderer?.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight);}$('#enter')?.focus();}
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
 if($('#aerial'))$('#aerial').onclick=()=>moveCamera([40,mobile?720:680,mobile?980:920],[0,10,-40]);if($('#north'))$('#north').onclick=()=>moveCamera([-80,620,-980],[20,20,-40]);if($('#ground'))$('#ground').onclick=()=>{if(selected){const f=selected;moveCamera([f.x,5.2,f.z+f.d/2+38],[f.x,facilityHeight(f)*.42,f.z]);}else moveCamera([-280,8,285],[-130,25,110]);};
 if($('#tour'))$('#tour').onclick=()=>{flight?.pause();flyover=!flyover;$('#tour').classList.toggle('active',flyover);};
 if($('#day'))$('#day').onclick=()=>setDay($('#day').getAttribute('aria-pressed')!=='true');
 if($('#layers-toggle'))$('#layers-toggle').onclick=()=>{$('#layers').hidden=!$('#layers').hidden;$('#layers-toggle').setAttribute('aria-expanded',String(!$('#layers').hidden));};
 if($('#labels'))$('#labels').onclick=()=>{showLabels=!showLabels;$('#labels').setAttribute('aria-pressed',String(showLabels));if($('#markers'))$('#markers').hidden=!showLabels;};
 if($('#mesh-layer'))$('#mesh-layer').onchange=e=>infrastructure?.setNetwork(e.target.checked);
 if($('#energy-layer'))$('#energy-layer').onchange=e=>infrastructure?.setEnergy(e.target.checked);
 if($('#fleet-layer'))$('#fleet-layer').onchange=e=>{if(fleets)fleets.root.visible=e.target.checked;};
 document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);interior?.hold(b.dataset.move,true);};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>interior?.hold(b.dataset.move,false));});
 window.addEventListener('blur',()=>{document.querySelectorAll('[data-move]').forEach(b=>interior?.hold(b.dataset.move,false));});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(interior||entering)exit();else{closeDirectory();if($('#detail'))$('#detail').hidden=true;if($('#layers'))$('#layers').hidden=true;sheet();}}});
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
 if(booted){
  attachCanvas();
  if(graphicsReady)reveal();
  return;
 }
 booted=true;
 try{
 bind();
 renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false,alpha:false});renderer.debug.onShaderError=(gl,program)=>{throw new Error('WebGL shader compilation failed: '+gl.getProgramInfoLog(program));};renderer.setPixelRatio(exteriorPixelRatio(devicePixelRatio,quality,mobile));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;attachCanvas();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsGeneration++;graphicsReady=false;frameLoop?.stop();exit();message('Graphics paused · waiting for the browser to restore them');});
 scene=new T.Scene();scene.background=new T.Color(0x6a2848);scene.fog=new T.Fog(0xe88870,1700,4000);sky=createAtmosphere();scene.add(sky);camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.5,9000);camera.position.set(40,mobile?720:680,mobile?980:920);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,10,-40);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.02;controls.minDistance=8;controls.maxDistance=2300;controls.update();controls.addEventListener('start',()=>{document.body.classList.add('exploring');flight?.pause();flight=null;flyover=false;$('#tour')?.classList.remove('active');});
 ambient=new T.AmbientLight(0xffead4,.28);scene.add(ambient);
 hemi=new T.HemisphereLight(0xffc090,0x3a2818,.85);scene.add(hemi);sun=new T.DirectionalLight(0xff9a48,2.4);sun.position.set(-400,180,-1200);{sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sun.shadow.camera.left=-700;sun.shadow.camera.right=700;sun.shadow.camera.top=700;sun.shadow.camera.bottom=-700;sun.shadow.camera.far=2400;sun.shadow.normalBias=.6;}scene.add(sun);rim=new T.DirectionalLight(0xb08cff,1.15);rim.position.set(420,180,380);scene.add(rim);
 const prismFill=new T.PointLight(0xffc070,1800,220,2);prismFill.position.set(0,70,-315);scene.add(prismFill);
 const aetherFill=new T.PointLight(0x66f0ff,1400,180,2);aetherFill.position.set(437,90,212);scene.add(aetherFill);

 if($('#load-message'))$('#load-message').textContent='Sculpting the living campus…';
 landscape=createLandscape();scene.add(landscape.root);
 try{
  if(!mobile){
   const target=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples)});
   composer=new EffectComposer(renderer,target);
   composer.setPixelRatio(renderer.getPixelRatio());
   composer.setSize(innerWidth,innerHeight);
   composer.addPass(new RenderPass(scene,camera));
   bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.42,.55,.62);
   composer.addPass(bloom);
   composer.addPass(new OutputPass());
  }
 }catch(error){console.warn('Postprocessing initialization failed',error);disposePostprocessing();}
 setDay(true);
 let last=performance.now(),frames=0;const projected=new T.Vector3();
 function render(now){
  const dt=Math.min((now-last)/1000,.05);last=now;if(interior||entering||document.hidden||!graphicsReady)return;if(!reduced)clock+=dt;
  landscape?.update(clock);infrastructure?.update(clock);fleets?.update(clock);
  if(flyover&&!reduced){camera.position.set(Math.sin(clock*.032)*1100,720,Math.cos(clock*.032)*1100);controls.target.set(0,12,-40);}
  controls.update();streetFurniture?.userData.update(camera.position);sky.position.copy(camera.position);sky.material.uniforms.time.value=clock;
  if(composer)composer.render();else renderer.render(scene,camera);
  performanceReport.record({engine:'Three.js',quality,width:renderer.domElement.width,height:renderer.domElement.height,drawCalls:renderer.info.render.calls,meshes:scene.children.length});
  if(++frames%3===0&&showLabels){const far=camera.position.length()>800;const occupied=[];const host=document.getElementById('markers');for(const {el,f} of markers){if(!el.isConnected&&host)host.append(el);projected.set(f.x,facilityHeight(f)+8,f.z).project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;let visible=projected.z<1&&projected.z>-1&&x>10&&x<innerWidth-10&&y>90&&y<innerHeight-135;if(mobile&&far&&f.id%2===0)visible=false;if(visible&&occupied.some(p=>Math.hypot(p[0]-x,p[1]-y)<28))visible=false;if(visible)occupied.push([x,y]);el.hidden=!visible;el.style.left=x+'px';el.style.top=y+'px';}}
 }
 frameLoop=createFrameLoop(render,{onError:renderFailure});
 resizeHandler=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer?.setSize(innerWidth,innerHeight);composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(innerWidth,innerHeight);};
 window.addEventListener('resize',resizeHandler);

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
 new GLTFLoader().load(`${import.meta.env.BASE_URL}models/synergy-node.glb`,g=>{if(!renderer){disposeSceneResources(g.scene);return;}for(const [x,z] of SPIRES){const node=g.scene.clone(true);node.position.set(x+13,0,z);node.name='Blender physical synergy node';scene.add(node);}},undefined,e=>{console.warn('Synergy node detail unavailable',e);message('Some node detail failed to load; mesh towers remain available.');});
 new GLTFLoader().load(`${import.meta.env.BASE_URL}models/campus-street-furniture.glb`,g=>{if(!renderer){disposeSceneResources(g.scene);return;}streetFurniture=createStreetFurniture(g.scene);streetFurniture.userData.update(camera.position);scene.add(streetFurniture);},undefined,e=>console.warn('Street furniture detail unavailable',e));
 const ray=new T.Raycaster(),pointer=new T.Vector2();let start=null;renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(buildings,true)[0];if(hit)select(hit.object.userData.facility);start=null;});
 renderer.domElement.addEventListener('webglcontextrestored',async event=>{
  if(!renderer||renderer.domElement!==event.currentTarget)return;
  const restoringRenderer=renderer,generation=++graphicsGeneration;
  try{setDay($('#day')?.getAttribute('aria-pressed')==='true');await restoringRenderer.compileAsync(scene,camera);if(renderer!==restoringRenderer||generation!==graphicsGeneration||restoringRenderer.getContext().isContextLost())return;graphicsReady=true;last=performance.now();if($('#enter'))$('#enter').disabled=false;frameLoop.start();reveal();message('Graphics restored');}
  catch(error){if(generation===graphicsGeneration&&renderer===restoringRenderer)failGraphics(error);}
 });
 if($('#load-message'))$('#load-message').textContent='Preparing materials and lighting…';
 const startupRenderer=renderer,startupGeneration=graphicsGeneration;
 if(startupRenderer.getContext().isContextLost()){reveal();return;}
 await startupRenderer.compileAsync(scene,camera);
 if(renderer!==startupRenderer||startupGeneration!==graphicsGeneration||startupRenderer.getContext().isContextLost())return;
 // Render once under the loading overlay so link/shader errors cannot expose a broken first frame.
 graphicsReady=true;if($('#enter'))$('#enter').disabled=false;
 try{render(performance.now());}catch(error){if(!composer)throw error;console.warn('Initial postprocessing failed; using base rendering',error);disposePostprocessing();render(performance.now());}
 frameLoop.start();reveal();
 }catch(e){failGraphics(e);}
}
export {boot};
if(typeof document!=='undefined' && document.getElementById('app') && !document.getElementById('app').dataset.react){
 boot().catch(failGraphics);
}
