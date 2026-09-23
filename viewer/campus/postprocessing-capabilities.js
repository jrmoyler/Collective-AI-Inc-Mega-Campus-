import {withRendererState} from './render-lifecycle.js';

// MAX_SAMPLES is global. RGBA16F and the depth format may support fewer counts,
// and a mismatched pair produces an incomplete framebuffer without a JS throw.
// floatDepth selects the DEPTH_COMPONENT32F attachment used with reversed depth.
export function getPostprocessingSamples(renderer,requested=4,{floatDepth=false}={}){
 if(!renderer.extensions.has('EXT_color_buffer_float')&&!renderer.extensions.has('EXT_color_buffer_half_float'))return null;
 const gl=renderer.getContext(),limit=Math.min(requested,renderer.capabilities.maxSamples);
 try{
  const color=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES)||[]);
  const depthFormat=floatDepth?(gl.DEPTH_COMPONENT32F??36012):gl.DEPTH_COMPONENT24;
  const depth=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,depthFormat,gl.SAMPLES)||[]);
  return Math.max(0,...color.filter(n=>n>0&&n<=limit&&depth.includes(n)));
 }catch{return 0;}
}

function targets(composer){
 return [...new Set([composer.renderTarget1,composer.renderTarget2,...composer.passes.flatMap(pass=>[
  pass.renderTargetBright,...(pass.renderTargetsHorizontal||[]),...(pass.renderTargetsVertical||[])
 ])].filter(Boolean))];
}

// Call after construction, resizing/quality changes and context restoration.
// This checks allocations directly; compileAsync only checks shader programs.
export function validatePostprocessingTargets(renderer,composer){
 return validateRenderTargets(renderer,targets(composer));
}

// Also applies to a newly generated PMREM environment target before assigning
// its texture to the scene. Unsupported allocations need not throw in WebGL.
export function validateRenderTargets(renderer,allocated){
 const gl=renderer.getContext();
 return withRendererState(renderer,()=>{
  if(gl.isContextLost())throw new Error('WebGL context lost while validating effects');
  for(const target of allocated){
   renderer.setRenderTarget(target);
   const check=()=>{const status=gl.checkFramebufferStatus(gl.FRAMEBUFFER);if(status!==gl.FRAMEBUFFER_COMPLETE)throw new Error(`Incomplete effects framebuffer ${target.texture?.name||'target'}: 0x${status.toString(16)}`);};
   check();
   // MSAA draws and resolved texture attachments are separate framebuffers.
   // Three creates both together. Bind the resolve framebuffer through Three
   // so its GL state cache remains coherent, then restore the target setting.
   if(target.samples>0){const samples=target.samples;try{target.samples=0;renderer.setRenderTarget(target);check();}finally{target.samples=samples;}}
  }
  return allocated.length;
 });
}

// A driver may advertise a sample count but reject the real sized allocation.
// Rebuild the ping-pong buffers without MSAA, then validate every target again.
export function disablePostprocessingMSAA(composer){
 let changed=false;
 for(const target of [composer.renderTarget1,composer.renderTarget2])if(target?.samples>0){target.samples=0;target.dispose();changed=true;}
 return changed;
}
