// Keep a single cancellable frame outstanding. A rendering exception must not
// leave a callback repeatedly touching a disposed WebGL renderer.
export function createFrameLoop(render,{onError=error=>console.error(error),requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id)}={}){
 let running=false,pending=null;
 function frame(now){
  pending=null;
  if(!running)return;
  try{render(now);}catch(error){running=false;onError(error);return;}
  if(running&&pending===null)pending=requestFrame(frame);
 }
 return {
  start(){if(running)return;running=true;pending=requestFrame(frame);},
  stop(){running=false;if(pending!==null)cancelFrame(pending);pending=null;},
  get running(){return running;}
 };
}

// PMREM changes renderer state before compiling its shaders. Three restores it
// on success, but a shader exception exits that path before its cleanup runs.
export function withRendererState(renderer,operation){
 const target=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
 const toneMapping=renderer.toneMapping,autoClear=renderer.autoClear,xr=renderer.xr.enabled;
 try{return operation();}finally{
  renderer.toneMapping=toneMapping;renderer.autoClear=autoClear;renderer.xr.enabled=xr;
  renderer.setRenderTarget(target,face,mip);
 }
}

// Scene assets share geometry/materials across clones and instances. Dispose each
// GPU resource once, and continue cleanup even when one dispose listener fails.
export function disposeSceneResources(root){
 const resources=new Set(),materials=new Set(),textures=new Set(),errors=[];
 const collectTexture=value=>{if(value?.isTexture)textures.add(value);else if(Array.isArray(value))value.forEach(collectTexture);};
 try{root?.traverse(object=>{
  if(object.geometry)resources.add(object.geometry);
  if(object.skeleton)resources.add(object.skeleton);
  if(object.shadow)resources.add(object.shadow);
  if(object.isInstancedMesh)resources.add(object);
  for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)materials.add(material);
 });}catch(error){errors.push(error);}
 for(const material of materials){
  try{Object.values(material).forEach(collectTexture);for(const uniform of Object.values(material.uniforms||{}))collectTexture(uniform?.value);}catch(error){errors.push(error);}
 }
 collectTexture(root?.environment);collectTexture(root?.background);
 for(const resource of [...resources,...materials,...textures]){
  try{resource.dispose?.();}catch(error){errors.push(error);}
 }
 try{if(root){root.environment=null;if(root.background?.isTexture)root.background=null;root.clear?.();}}catch(error){errors.push(error);}
 return {resources:resources.size,materials:materials.size,textures:textures.size,errors};
}
