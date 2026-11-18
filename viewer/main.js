import {bindVisitorAtlas} from './campus/visitor-atlas.js';
import {xp,bindExperience,shotFor,showSelection,syncUrl,GROUND_SHOT} from './campus/experience-controller.js';
import {planFlight,flightDuration,obstaclesFrom} from './campus/experience-camera.js';
import {createArrivalCourts} from './campus/arrival-courts.js';
// @ts-nocheck
import {createFrameLoop,withRendererState,disposeSceneResources} from './campus/render-lifecycle.js';
import {exteriorPixelRatio} from './campus/quality.js';
import {createAcceptancePanel} from './campus/acceptance-panel.js';
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
import {renderDirectory,levelCode} from './campus/wayfinding.js';
import {FACILITIES,DISTRICTS,SPIRES} from './campus/data.js';
import {createFacility} from './campus/buildings.js';
import {configureFacilityDetails} from './campus/facility-details.js';
import {createSunShadowFitter} from './campus/sun-shadows.js';
import {getPostprocessingSamples,validatePostprocessingTargets,disablePostprocessingMSAA,validateRenderTargets} from './campus/postprocessing-capabilities.js';
import {createLandscape,createInfrastructure} from './campus/landscape.js';
import {createFleets} from './campus/fleets.js';
import {createStreetFurniture} from './campus/street-furniture.js';
import {setDuskMaterials,applyDepthConvention} from './campus/geometry.js';
import {createDepthRange,skyDepthVertexShader} from './campus/depth-precision.js';
import {createCampusMap,createPlanViewer} from './campus/plans.js';
import {installAerialPerspective,atmospherePreset} from './campus/render-atmosphere.js';
import {createGradePass,gradePreset} from './campus/post-grade.js';
import {renderProfile} from './campus/quality.js';
import {setShadowMapSize} from './campus/sun-shadows.js';
import {FXAAPass} from 'three/addons/postprocessing/FXAAPass.js';
const $=s=>document.querySelector(s);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let renderer,scene,camera,controls,composer,landscape,infrastructure,fleets,streetFurniture,interior=null,selected=null,flight=null,flyover=false,showLabels=true,entering=false,clock=0;
let exteriorDirty=true;
function invalidateExterior(){exteriorDirty=true;}
let quality='balanced';const performanceReport=createPerformanceReport({metadata:()=>({build:__CAMPUS_BUILD__,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio})});let acceptancePanel=null,pendingReadyEvent=null;
const buildings=[],markers=[];const mobile=matchMedia('(max-width:760px)').matches;let sun,hemi,rim,sky,bloom,ambient;let graphicsReady=false;const planViewer=createPlanViewer();
// ?legacyDepth reproduces the previous fixed 0.5 m / 24-bit depth setup for A/B review on devices.
const legacyDepth=typeof location!=='undefined'&&new URLSearchParams(location.search).has('legacyDepth');
let reversedDepth=false;const depthRange=createDepthRange();
let booted=false,frameLoop=null,tourRequest=0,resizeHandler=null,graphicsGeneration=0;
function message(text){const el=$('#status');if(el)el.textContent=text;}
function sheet(){document.body.classList.toggle('sheet-open',!$('#detail')?.hidden||!$('#directory')?.hidden);}
function closeDirectory(){if($('#directory'))$('#directory').hidden=true;$('#directory-toggle')?.setAttribute('aria-expanded','false');sheet();}
let arrivalFloor=0, updateTrip=()=>{};
function updateDirectory(){
 const list=$('#facility-list');
 if(!list)return;
 renderDirectory({list,count:$('#directory-count'),reset:$('#reset-search'),facilities:FACILITIES,
  districts:DISTRICTS,query:$('#search').value,district:Number($('#district').value),select});
}
function chooseFloor(level){
 arrivalFloor=level;
 if($('#destination-floor'))$('#destination-floor').value=String(level);
 if($('#facility-program'))$('#facility-program').textContent=selected.program[level].split(';').join(' · ');
 syncUrl();
}
function setView(id){
 xp.view=id;
 const touring=!!xp.tour?.state.active;
 document.body.classList.toggle('touring',touring);
 for(const control of ['aerial','north','ground','tour']){
  const button=$('#'+control),on=control==='tour'?touring:control===id;
  button?.classList.toggle('active',on);
  button?.setAttribute('aria-pressed',String(on));
 }
 syncUrl();
}
function setLayers(open){
 if($('#layers'))$('#layers').hidden=!open;
 $('#layers-toggle')?.setAttribute('aria-expanded',String(open));
}
function select(id,level=0,{fromTour=false,sheet:openSheet=true}={}){
 if(entering&&selected?.id!==id)exit();
 const f=FACILITIES.find(facility=>facility.id===id);
 if(!f)return;
 if(!fromTour)xp.tour?.pause();
 xp.dismissWelcome?.();
 selected=f;
 updateTrip(id);
 setLayers(false);
 document.body.classList.add('exploring');
 if($('#detail')&&(openSheet||innerWidth>760))$('#detail').hidden=false;
 if(innerWidth<761)closeDirectory();
 sheet();
 if($('#facility-key'))$('#facility-key').textContent=f.key;
 if($('#facility-name'))$('#facility-name').textContent=f.name;
 if($('#facility-district'))$('#facility-district').textContent=DISTRICTS[f.district];
 if($('#facility-area'))$('#facility-area').textContent=f.design_area.toLocaleString();
 if($('#facility-floors'))$('#facility-floors').textContent=f.levels;
 const floors=$('#destination-floor');
 if(floors)floors.replaceChildren(...f.program.map((_,i)=>{
  const option=document.createElement('option');
  option.textContent=levelCode(f,i);
  option.value=String(i);
  return option;
 }));
 chooseFloor(level);
 if($('#area-note'))$('#area-note').textContent=f.assumedArea?'Area is a design-package assumption; original allowance remains unresolved.':'Program and floor count from the supplied schematic design package.';
 markers.forEach(({el,f})=>el.classList.toggle('selected',f.id===id));
 if(!fromTour)$('#facility-name')?.focus({preventScroll:true});
 showSelection(xp.api,f);xp.sound?.cue();syncUrl();
 message(graphicsReady?`${f.key} ${f.name} selected · exterior or interior tour available`:`${f.key} ${f.name} selected · schematic floor plans available`);
}
function moveCamera(position,target,view=null,{onComplete=null}={}){
 if(!graphicsReady)return;if(entering)exit();
 if(view!=='tour')xp.tour?.stop();
 document.body.classList.add('exploring');flight?.pause();flight=null;flyover=false;setView(view);
 // Arc over intervening roofs; the look-at point leads so the destination resolves early.
 const from=camera.position.toArray(),fromTarget=controls.target.toArray();
 const path=planFlight({from,to:position,fromTarget,toTarget:target,obstacles:obstaclesFrom(FACILITIES,facilityHeight)});
 const apply=t=>{const p=path.sample(t);camera.position.fromArray(p.position);controls.target.fromArray(p.target);controls.update();invalidateExterior();};
 const duration=flightDuration(from,position,fromTarget,target,{reduced});
 if(!duration){apply(1);onComplete?.();return;}
 const state={t:0};
 flight=animate(state,{t:1,duration,ease:'inOutCubic',onUpdate:()=>apply(state.t),onComplete:()=>{flight=null;onComplete?.();}});
}
function facilityHeight(f){return buildings.find(group=>group.userData.facility===f.id)?.userData.envelopeHeight??f.h;}
function focus({view=null,shot:overrides={},onComplete=null}={}){if(!selected||!graphicsReady)return;const shot=shotFor(xp.api,selected,overrides);if(shot)moveCamera(shot.position,shot.target,view,{onComplete});}
function disposePostprocessing(){
 if(!composer)return;
 const disposing=composer;composer=null;bloom=null;
 try{renderer?.setRenderTarget(null);}catch(error){console.warn('Render target cleanup failed',error);}
 for(const pass of disposing.passes)try{pass.dispose?.();}catch(error){console.warn('Render pass cleanup failed',error);}
 try{disposing.dispose();}catch(error){console.warn('Composer cleanup failed',error);}
}
function checkPostprocessing(){
 if(!composer||!renderer||renderer.getContext().isContextLost())return;
 try{
  const samples=getPostprocessingSamples(renderer,4,{floatDepth:reversedDepth});
  if(samples===null)throw new Error('HDR effects targets are unavailable');
  for(const target of [composer.renderTarget1,composer.renderTarget2])if(target.samples!==samples){target.samples=samples;target.dispose();}
  try{validatePostprocessingTargets(renderer,composer);}
  catch(error){if(!disablePostprocessingMSAA(composer))throw error;validatePostprocessingTargets(renderer,composer);}
 }catch(error){console.warn('Effects framebuffer unavailable; using base rendering',error);disposePostprocessing();message('Effects unavailable · base 3D rendering active');}
}
function failGraphics(error){
 performanceReport.event('graphics-failed',{message:String(error?.message||error)});performanceReport.pause('graphics-failed');
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
 // Draw first and stay on the far plane under either depth convention.
 dome.material.vertexShader=skyDepthVertexShader(dome.material.vertexShader);dome.renderOrder=-1;dome.frustumCulled=false;
 const u=dome.material.uniforms;
 u.turbidity.value=1.6;u.rayleigh.value=1.8;u.mieCoefficient.value=.0025;u.mieDirectionalG.value=.78;
 u.cloudCoverage.value=.25;u.cloudDensity.value=.22;u.cloudElevation.value=.42;
 return dome;
}
let environmentTarget=null;
function setDay(day){
 invalidateExterior();
 if(!sky||!sun||!hemi||!rim)return;
 // Dusk: sun low behind the default aerial camera, so facades facing the viewer
 // take a warm rake while the northern sky ahead stays deep navy.
 const direction=new T.Vector3().setFromSphericalCoords(1,T.MathUtils.degToRad(day?48:85),T.MathUtils.degToRad(day?208:35));
 sun.userData.direction=direction;
 sun.position.copy(direction).multiplyScalar(1400);
 sky.material.uniforms.sunPosition.value.copy(direction);
 sky.material.uniforms.turbidity.value=day?1.6:2.2;
 $('#day')?.setAttribute('aria-pressed',String(day));
 // The sky PMREM already carries most skylight; a strong hemisphere on top of it
 // flattened every facade to a milky white. Keep fill low and let the sun model.
 hemi.intensity=day?.7:1;hemi.color.set(day?0xd6e6f2:0x4f64a0);hemi.groundColor.set(day?0x5a5644:0x2e2619);
 sun.intensity=day?2.9:1.9;sun.color.set(day?0xfff1dc:0xffae6a);
 rim.intensity=day?.18:.22;rim.color.set(day?0xc4dbed:0x6f82c8);
 const air=atmospherePreset(day);
 scene.background.set(day?0xa9c3d8:0x111a33);scene.fog.color.set(air.fogColor);
 // Height-dependent aerial perspective (render-atmosphere.js): near is the clear
 // radius, far the ground-level visibility. The campus stays in clear air at the
 // default ~1.2 km aerial; the low countryside and horizon recede into haze.
 scene.fog.near=air.fogNear;scene.fog.far=air.fogFar;
 setDuskMaterials(!day);streetFurniture?.userData.setDusk?.(!day);
 // Daylight needs no glow: HDR sky, animated guidance strips and sunlit white
 // shuttles spread the low bloom mips into a milky veil. Dusk keeps a tight glow
 // for luminaires and lit glazing only.
 if(bloom){bloom.enabled=!day;bloom.strength=.26;bloom.radius=.3;bloom.threshold=1.1;}
 composer?.grade?.setPreset(gradePreset(day));
 renderer.toneMappingExposure=air.exposure;
 if(ambient)ambient.intensity=day?.04:.03;
 // Reflections come from the same outdoor sky, not an indoor showroom.
 if(getPostprocessingSamples(renderer)===null){scene.environment=null;environmentTarget?.dispose();environmentTarget=null;return;}
 let pmrem,envSky,envGround,next;
 try{
  pmrem=new T.PMREMGenerator(renderer);const envScene=new T.Scene();envSky=sky.clone();
  envSky.material=sky.material.clone();envSky.material.uniforms.showSunDisc.value=false;
  envSky.position.set(0,0,0);envScene.add(envSky);
  // Lower hemisphere: lit ground rather than a mirrored second sky, so glazing
  // and wet paving reflect the campus floor below the horizon.
  envGround=new T.Mesh(new T.CircleGeometry(7000,48),new T.MeshBasicMaterial({color:air.envGround,side:T.DoubleSide,fog:false,toneMapped:false}));
  envGround.rotation.x=-Math.PI/2;envGround.position.y=-2;envScene.add(envGround);
  next=withRendererState(renderer,()=>pmrem.fromScene(envScene,.04,.1,10000));validateRenderTargets(renderer,[next]);scene.environment=next.texture;
  environmentTarget?.dispose();environmentTarget=next;
  // Sky radiance is unscaled physical output; at 0.85 it veiled the scene.
  scene.environmentIntensity=air.environmentIntensity;
 }catch(e){if(next!==environmentTarget)next?.dispose();console.warn('Atmosphere reflections unavailable',e);}
 finally{pmrem?.dispose();if(envSky?.material!==sky.material)envSky?.material.dispose();envGround?.geometry.dispose();envGround?.material.dispose();}
}
async function enter(){if(!graphicsReady)return;if(!selected||entering||interior)return;entering=true;if($('#enter')){$('#enter').disabled=true;$('#enter').textContent='Opening interior…';}const f=selected,request=++tourRequest;performanceReport.pause('tour-load');performanceReport.event('tour-request',{facility:f.key});try{const {createInterior}=await import('./campus/interior.js');if(request!==tourRequest||!graphicsReady)return;flight?.pause();flyover=false;setView(null);$('#interior').hidden=false;setCampusInert(true);$('#inside-key').textContent=f.key;$('#inside-name').textContent=f.name;$('#floor-select').replaceChildren();for(let i=0;i<f.levels;i++){const option=document.createElement('option');option.value=i;option.textContent=f.id===3?`B${i+1}`:`L${String(i+1).padStart(2,'0')}`;$('#floor-select').append(option);}interior=createInterior($('#interior-canvas'),f,{initialFloor:arrivalFloor,reduced,quality,onError:error=>{performanceReport.event('interior-error',{message:String(error.message)});exit();message('Interior graphics stopped. You can reopen the tour.');console.error(error);},onLifecycle:(type,detail)=>{performanceReport.event(type,detail);if(type==='floor-request'||type==='interior-context-lost')performanceReport.pause(type);},onFrame:sample=>{performanceReport.record({...sample,quality});acceptancePanel?.frame($('#interior-canvas'),sample);},onRoom:name=>{$('#room-status').textContent=name;},onFloor:(l,rooms)=>{chooseFloor(l);$('#floor-select').value=l;$('#room-list').hidden=innerWidth<761;$('#rooms-toggle').setAttribute('aria-expanded',String(!$('#room-list').hidden));$('#room-list').replaceChildren();rooms.forEach((r,i)=>{const button=document.createElement('button');button.textContent=`${i+1}. ${r.name}`;button.onclick=()=>{interior?.visit(i);if(innerWidth<761){$('#room-list').hidden=true;$('#rooms-toggle').setAttribute('aria-expanded','false');}};$('#room-list').append(button);});}});$('#interior-canvas').focus();message('');}catch(e){if(request!==tourRequest)return;console.error(e);$('#interior').hidden=true;setCampusInert(false);interior?.dispose();interior=null;message('Interior could not open. Please try again.');}finally{if(request===tourRequest){entering=false;if($('#enter')){$('#enter').disabled=false;$('#enter').innerHTML='Explore inside <span>↗</span>';}}}}
function setCampusInert(active){
 for(const panel of document.querySelectorAll('body > header, #app, #directory, #detail, #layers, #toolbar, #markers')){
  panel.inert=active;
 }
}
function exit(){invalidateExterior();setCampusInert(false);if(interior||entering){performanceReport.event('tour-exit',{facility:selected?.key});performanceReport.pause('tour-exit');}tourRequest++;entering=false;if($('#enter')){$('#enter').disabled=!graphicsReady;$('#enter').innerHTML='Explore inside <span>↗</span>';}interior?.dispose();interior=null;if($('#interior'))$('#interior').hidden=true;if(graphicsReady){renderer?.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight);checkPostprocessing();}$('#enter')?.focus();}
function bind(){
 bindExperience({select,chooseFloor,setView,moveCamera,focus:options=>focus(options),reduced,mobile,facilityHeight,invalidate:invalidateExterior,
  get selected(){return selected;},get arrivalFloor(){return arrivalFloor;},get graphicsReady(){return graphicsReady;},get busy(){return !!(interior||entering);},
  get camera(){return camera;},get scene(){return scene;},get buildings(){return buildings;},get reversedDepth(){return reversedDepth;},get trees(){return landscape?.trees;}});
 updateTrip=bindVisitorAtlas((id,floor)=>{
  if(entering)exit();
  closeDirectory();select(id,floor);
  const f=selected, x=f.x-f.w*.23, z=f.z+f.d/2+4.2;
  moveCamera([x-9,11,z+10],[x+1,3.2,z-1]);
 });
 document.addEventListener('click',invalidateExterior);
 document.addEventListener('change',invalidateExterior);
 acceptancePanel=createAcceptancePanel({report:performanceReport,getCanvas:()=>interior?.getCanvas()||renderer?.domElement,});
 document.addEventListener('visibilitychange',()=>performanceReport.pause(document.hidden?'hidden':'visible'));
 performanceReport.event('startup-begin');
 const setQuality=value=>{performanceReport.pause('quality-change');performanceReport.event('quality-change',{quality:value});quality=value;document.querySelectorAll('[data-quality]').forEach(s=>s.value=value);renderer?.setPixelRatio(exteriorPixelRatio(devicePixelRatio,value,mobile));renderer?.setSize(innerWidth,innerHeight);composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(innerWidth,innerHeight);checkPostprocessing();interior?.setQuality(value);};
 document.querySelectorAll('[data-quality]').forEach(s=>s.onchange=e=>setQuality(e.target.value));
 if($('#rooms-toggle'))$('#rooms-toggle').onclick=()=>{const open=$('#room-list').hidden;$('#room-list').hidden=!open;$('#rooms-toggle').setAttribute('aria-expanded',String(open));};
 if($('#performance-report'))$('#performance-report').onclick=()=>{if(performanceReport.active){const report=performanceReport.finish();$('#performance-report').textContent='Record device performance';message(report.segments.length?'Device report downloaded.':'No rendered frames recorded.');}else{performanceReport.start();$('#performance-report').textContent='Finish & download report';message('Recording locally · explore the campus and interiors, then finish in Systems.');}};
 const dist=$('#district');if(dist){dist.replaceChildren();DISTRICTS.forEach((name,i)=>{const option=document.createElement('option');option.value=i;option.textContent=name;dist.append(option);});}
 updateDirectory();if($('#search'))$('#search').oninput=updateDirectory;if(dist)dist.onchange=updateDirectory;
 if($('#reset-search'))$('#reset-search').onclick=()=>{
  $('#search').value='';dist.value='0';updateDirectory();$('#search').focus();
 };
 if($('#destination-floor'))$('#destination-floor').onchange=e=>chooseFloor(Number(e.target.value));
 if($('#directory-toggle'))$('#directory-toggle').onclick=()=>{setLayers(false);const open=$('#directory').hidden;if(open&&entering)exit();$('#directory').hidden=!open;$('#directory-toggle').setAttribute('aria-expanded',String(open));if(open&&innerWidth<761&&$('#detail'))$('#detail').hidden=true;sheet();if(open)$('#search')?.focus();};
 if($('#directory-close'))$('#directory-close').onclick=()=>{closeDirectory();$('#directory-toggle').focus();};if($('#detail-close'))$('#detail-close').onclick=()=>{if(entering)exit();$('#detail').hidden=true;sheet();$('#directory-toggle')?.focus();};
 if($('#focus'))$('#focus').onclick=()=>focus();if($('#view-plan'))$('#view-plan').onclick=()=>{if(entering)exit();if(selected)planViewer.open(selected,arrivalFloor);};if($('#enter'))$('#enter').onclick=enter;if($('#exit-interior'))$('#exit-interior').onclick=exit;if($('#floor-select'))$('#floor-select').onchange=e=>interior?.setFloor(Number(e.target.value));
 if($('#aerial'))$('#aerial').onclick=()=>moveCamera([40,mobile?720:680,mobile?980:920],[0,10,-40],'aerial');if($('#north'))$('#north').onclick=()=>moveCamera([-80,620,-980],[20,20,-40],'north');if($('#ground'))$('#ground').onclick=()=>{if(selected&&!$('#detail')?.hidden)focus({view:'ground',shot:GROUND_SHOT});else moveCamera([-280,8,285],[-130,25,110],'ground');};
 // #tour starts the curated guided tour (experience-controller); the old orbit flyover is retired.
 if($('#day'))$('#day').onclick=()=>setDay($('#day').getAttribute('aria-pressed')!=='true');
 if($('#layers-toggle'))$('#layers-toggle').onclick=()=>{const open=$('#layers').hidden;if(open){closeDirectory();if($('#detail'))$('#detail').hidden=true;sheet();}setLayers(open);};
 if($('#labels'))$('#labels').onclick=()=>{showLabels=!showLabels;$('#labels').setAttribute('aria-pressed',String(showLabels));if($('#markers'))$('#markers').hidden=!showLabels;};
 if($('#mesh-layer'))$('#mesh-layer').onchange=e=>infrastructure?.setNetwork(e.target.checked);
 if($('#energy-layer'))$('#energy-layer').onchange=e=>infrastructure?.setEnergy(e.target.checked);
 if($('#fleet-layer'))$('#fleet-layer').onchange=e=>{if(fleets)fleets.root.visible=e.target.checked;};
 document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);interior?.hold(b.dataset.move,true);};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>interior?.hold(b.dataset.move,false));});
 window.addEventListener('blur',()=>{document.querySelectorAll('[data-move]').forEach(b=>interior?.hold(b.dataset.move,false));});
 window.addEventListener('keydown',e=>{if(e.key!=='Escape'||$('#plan-dialog')?.open||$('#visitor-atlas')?.open||$('#shortcut-help')?.open)return;
  if(interior||entering){exit();return;}
  if(xp.tour?.state.active){xp.tour.stop();$('#tour')?.focus();return;}
  if($('#welcome')&&!$('#welcome').hidden){xp.dismissWelcome?.();$('#directory-toggle')?.focus();return;}
  if($('#layers')&&!$('#layers').hidden){setLayers(false);$('#layers-toggle')?.focus();return;}
  if($('#detail')&&!$('#detail').hidden){$('#detail').hidden=true;sheet();($('#directory')?.hidden?$('#directory-toggle'):$('#search'))?.focus();return;}
  if($('#directory')&&!$('#directory').hidden){closeDirectory();$('#directory-toggle')?.focus();}});
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
 const canvas=document.createElement('canvas');canvas.addEventListener('webglcontextcreationerror',event=>performanceReport.event('context-creation-error',{message:event.statusMessage}));
 // Reversed float depth removes the metre-scale depth steps that made layered
 // facades, copings and bands z-fight at the ~1.2 km aerial distance.
 renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false,alpha:false,reversedDepthBuffer:!legacyDepth});reversedDepth=renderer.capabilities.reversedDepthBuffer===true;renderer.debug.onShaderError=(gl,program)=>{throw new Error('WebGL shader compilation failed: '+gl.getProgramInfoLog(program));};renderer.setPixelRatio(exteriorPixelRatio(devicePixelRatio,quality,mobile));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;attachCanvas();
 // Khronos PBR Neutral: ACES desaturated the bright daylight sky to grey-white
 // and shifted sunlit masonry hues; Neutral keeps base colours and a blue sky.
 // Height-dependent aerial perspective replaces three's depth-only fog chunks
 // before any exterior material compiles (render-atmosphere.js).
 installAerialPerspective(T.ShaderChunk);
 {const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');performanceReport.event('graphics-capabilities',{api:gl.getParameter(gl.VERSION),vendor:gl.getParameter(debug?debug.UNMASKED_VENDOR_WEBGL:gl.VENDOR),renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE)});}
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();performanceReport.event('exterior-context-lost');performanceReport.pause('exterior-context-lost');flight?.pause();flyover=false;graphicsGeneration++;graphicsReady=false;frameLoop?.stop();environmentTarget?.dispose();environmentTarget=null;if(scene)scene.environment=null;exit();message('Graphics paused · waiting for the browser to restore them');});
 scene=new T.Scene();scene.background=new T.Color(0x6a2848);scene.fog=new T.Fog(0xe88870,1700,4000);sky=createAtmosphere();scene.add(sky);camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.5,9000);camera.position.set(40,mobile?720:680,mobile?980:920);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,10,-40);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.02;controls.minDistance=8;controls.maxDistance=2300;controls.update();controls.addEventListener('start',()=>{document.body.classList.add('exploring');flight?.pause();flight=null;flyover=false;setView(null);});
 ambient=new T.AmbientLight(0xffead4,.28);scene.add(ambient);
 hemi=new T.HemisphereLight(0xffc090,0x3a2818,.85);scene.add(hemi);sun=new T.DirectionalLight(0xff9a48,2.4);sun.position.set(-400,180,-1200);{sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sun.shadow.camera.left=-700;sun.shadow.camera.right=700;sun.shadow.camera.top=700;sun.shadow.camera.bottom=-700;sun.shadow.camera.far=2400;sun.shadow.normalBias=.6;}scene.add(sun);rim=new T.DirectionalLight(0xb08cff,1.15);rim.position.set(420,180,380);scene.add(rim);
 const prismFill=new T.PointLight(0xffc070,1800,220,2);prismFill.position.set(0,70,-315);scene.add(prismFill);
 const aetherFill=new T.PointLight(0x66f0ff,1400,180,2);aetherFill.position.set(437,90,212);scene.add(aetherFill);

 if($('#load-message'))$('#load-message').textContent='Sculpting the living campus…';
 landscape=createLandscape();scene.add(landscape.root);
 try{
  const samples=mobile?null:getPostprocessingSamples(renderer,4,{floatDepth:reversedDepth});
  if(samples!==null){
   // A 32-bit float depth attachment is what gives reversed depth its precision.
   const target=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples,depthTexture:reversedDepth?new T.DepthTexture(innerWidth,innerHeight,T.FloatType):null});target.resolveDepthBuffer=false;
   composer=new EffectComposer(renderer,target);
   composer.setPixelRatio(renderer.getPixelRatio());
   composer.setSize(innerWidth,innerHeight);
   composer.addPass(new RenderPass(scene,camera));
   bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.42,.55,.62);
   composer.addPass(bloom);
   composer.addPass(new OutputPass());
   // Display-referred finishing: FXAA only stands in when the HDR target has
   // no MSAA samples; the grade (S-curve, split tone, vignette, dither) is a
   // single cheap full-screen pass and never adds light.
   composer.fxaa=new FXAAPass();composer.fxaa.enabled=samples===0;composer.addPass(composer.fxaa);
   composer.grade=createGradePass();composer.addPass(composer.grade);
   checkPostprocessing();
  }
 }catch(error){console.warn('Postprocessing initialization failed',error);disposePostprocessing();}
 setDay(true);
 scene.add(sun.target);const fitSunShadow=createSunShadowFitter(sun);renderer.info.autoReset=false;
 // Quality gates the shadow budget (map size and PCF softness). Applied from the
 // render loop so any quality change, from any control, takes effect next frame.
 let renderQuality=null;
 const applyRenderProfile=()=>{
  renderQuality=quality;const profile=renderProfile(quality,mobile,{maxTextureSize:renderer.capabilities.maxTextureSize});
  if(setShadowMapSize(sun,profile.shadowMapSize))invalidateExterior();
  fitSunShadow.setSoftness({penumbra:profile.shadowPenumbra,maxRadius:profile.shadowRadiusMax});
 };
 let last=performance.now(),frames=0;const projected=new T.Vector3(),viewPoint=new T.Vector3();
 controls.addEventListener('change',invalidateExterior);
 function render(now){
  const dt=Math.min((now-last)/1000,.05);last=now;if(interior||entering||document.hidden||!graphicsReady)return;if(!reduced)clock+=dt;

  if(flyover&&!reduced){camera.position.set(Math.sin(clock*.032)*1100,720,Math.cos(clock*.032)*1100);controls.target.set(0,12,-40);}
  controls.update();
  // With motion reduced, the fleet and landscape have a fixed clock. A stationary
  // view can retain its last GPU frame until camera, layers or loaded assets change.
  if(reduced&&!exteriorDirty&&!performanceReport.active&&!acceptancePanel&&!pendingReadyEvent)return;
  exteriorDirty=false;
  landscape?.update(clock);infrastructure?.update(clock);fleets?.update(clock,camera.position);
  streetFurniture?.userData.update(camera.position);for(const building of buildings)building.userData.updateDetails?.(camera.position);sky.position.copy(camera.position);sky.material.uniforms.time.value=clock;
  const orbitDistance=camera.position.distanceTo(controls.target);if(!legacyDepth)depthRange(camera,orbitDistance);
  if(renderQuality!==quality)applyRenderProfile();
  // checkPostprocessing may drop MSAA after a resize or context restore.
  if(composer?.fxaa)composer.fxaa.enabled=composer.renderTarget1.samples===0&&!mobile;
  fitSunShadow(controls.target,orbitDistance,sun.userData.direction);
  renderer.info.autoReset=false;renderer.info.reset();
  if(composer)composer.render();else renderer.render(scene,camera);
  if(pendingReadyEvent){performanceReport.event(pendingReadyEvent,{effects:!!composer,width:renderer.domElement.width,height:renderer.domElement.height});if(pendingReadyEvent==='exterior-context-restored')message('Graphics restored');pendingReadyEvent=null;reveal();}
  acceptancePanel?.frame(renderer.domElement,{engine:'Three.js',facility:selected?.key||'campus',quality,camera:camera.position.toArray(),target:controls.target.toArray()});
  if(performanceReport.active){let meshes=0;scene.traverseVisible(object=>{if(object.isMesh)meshes++;});performanceReport.record({engine:'Three.js',quality,width:renderer.domElement.width,height:renderer.domElement.height,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,meshes});}
  if((++frames%3===0||reduced)&&showLabels){const far=camera.position.length()>800;const occupied=[];const host=document.getElementById('markers');for(const {el,f} of markers){if(!el.isConnected&&host)host.append(el);projected.set(f.x,facilityHeight(f)+8,f.z);const ahead=viewPoint.copy(projected).applyMatrix4(camera.matrixWorldInverse).z<-camera.near;projected.project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;let visible=ahead&&viewPoint.z>-camera.far&&x>10&&x<innerWidth-10&&y>90&&y<innerHeight-135;if(mobile&&far&&f.id%2===0)visible=false;if(visible&&occupied.some(p=>Math.hypot(p[0]-x,p[1]-y)<28))visible=false;if(visible)occupied.push([x,y]);el.hidden=!visible;el.style.left=x+'px';el.style.top=y+'px';}}
 }
 frameLoop=createFrameLoop(render,{onError:renderFailure});
 // Inspection hook for automated visual review only (?debug); not used by the UI.
 if(new URLSearchParams(location.search).has('debug'))window.__campus={get renderer(){return renderer;},get scene(){return scene;},get camera(){return camera;},get controls(){return controls;},get composer(){return composer;},get bloom(){return bloom;},get sun(){return sun;},get hemi(){return hemi;},get ambient(){return ambient;},get sky(){return sky;},reversedDepth:()=>reversedDepth,setDay};
 resizeHandler=()=>{invalidateExterior();if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer?.setSize(innerWidth,innerHeight);composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(innerWidth,innerHeight);checkPostprocessing();};
 window.addEventListener('resize',resizeHandler);

 if($('#load-message'))$('#load-message').textContent='Raising 35 facilities…';
 await yieldFrame();
 const markerHost=document.getElementById('markers');
 for(let i=0;i<FACILITIES.length;i++){
  const f=FACILITIES[i];
  const group=createFacility(f,{deferDetails:true});applyDepthConvention(group,reversedDepth);group.userData.updateDetails=configureFacilityDetails(group,{onCreate:detail=>applyDepthConvention(detail,reversedDepth)});buildings.push(group);scene.add(group);
  const el=document.createElement('button');el.className='marker';el.textContent=String(f.id).padStart(2,'0');el.setAttribute('aria-label',`${f.key} ${f.name}`);el.onclick=()=>select(f.id);
  if(markerHost)markerHost.append(el);markers.push({el,f});
  if(i%5===4)await yieldFrame();
 }
 scene.add(createArrivalCourts(FACILITIES));
 infrastructure=createInfrastructure();scene.add(infrastructure.root);
 fleets=createFleets(landscape.roads);scene.add(fleets.root);
 new GLTFLoader().load(`${import.meta.env.BASE_URL}models/synergy-node.glb`,g=>{if(!renderer){disposeSceneResources(g.scene);return;}invalidateExterior();for(const [x,z] of SPIRES){const node=g.scene.clone(true);node.position.set(x+13,0,z);node.name='Blender physical synergy node';scene.add(node);}},undefined,e=>{console.warn('Synergy node detail unavailable',e);message('Some node detail failed to load; mesh towers remain available.');});
 new GLTFLoader().load(`${import.meta.env.BASE_URL}models/campus-street-furniture.glb`,g=>{if(!renderer){disposeSceneResources(g.scene);return;}invalidateExterior();streetFurniture=createStreetFurniture(g.scene);streetFurniture.userData.update(camera.position);streetFurniture.userData.setDusk?.($('#day')?.getAttribute('aria-pressed')!=='true');scene.add(streetFurniture);},undefined,e=>console.warn('Street furniture detail unavailable',e));
 const ray=new T.Raycaster(),pointer=new T.Vector2();let start=null;renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(buildings,true)[0];if(hit)select(hit.object.userData.facility);start=null;});
 renderer.domElement.addEventListener('webglcontextrestored',async event=>{
  if(!renderer||renderer.domElement!==event.currentTarget)return;
  const restoringRenderer=renderer,generation=++graphicsGeneration;
  try{checkPostprocessing();setDay($('#day')?.getAttribute('aria-pressed')==='true');await restoringRenderer.compileAsync(scene,camera);if(renderer!==restoringRenderer||generation!==graphicsGeneration||restoringRenderer.getContext().isContextLost())return;graphicsReady=true;last=performance.now();pendingReadyEvent='exterior-context-restored';if($('#enter'))$('#enter').disabled=false;try{render(performance.now());}catch(error){if(!composer)throw error;disposePostprocessing();render(performance.now());}frameLoop.start();}
  catch(error){if(generation===graphicsGeneration&&renderer===restoringRenderer)failGraphics(error);}
 });
 if($('#load-message'))$('#load-message').textContent='Preparing materials and lighting…';
 applyDepthConvention(scene,reversedDepth);
 const startupRenderer=renderer,startupGeneration=graphicsGeneration;
 if(startupRenderer.getContext().isContextLost()){reveal();return;}
 await startupRenderer.compileAsync(scene,camera);
 if(renderer!==startupRenderer||startupGeneration!==graphicsGeneration||startupRenderer.getContext().isContextLost())return;
 // Render once under the loading overlay so link/shader errors cannot expose a broken first frame.
 pendingReadyEvent='startup-first-frame';graphicsReady=true;if($('#enter'))$('#enter').disabled=false;
 try{render(performance.now());}catch(error){if(!composer)throw error;console.warn('Initial postprocessing failed; using base rendering',error);disposePostprocessing();render(performance.now());}
 frameLoop.start();
 }catch(e){failGraphics(e);}
}
export {boot};
if(typeof document!=='undefined' && document.getElementById('app') && !document.getElementById('app').dataset.react){
 boot().catch(failGraphics);
}
