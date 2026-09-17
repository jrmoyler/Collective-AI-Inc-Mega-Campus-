import test from 'node:test';
import assert from 'node:assert/strict';
import {getPostprocessingSamples,validatePostprocessingTargets,disablePostprocessingMSAA} from '../viewer/campus/postprocessing-capabilities.js';

function renderer({hdr=true,color=[4,2],depth=[4,2],status=()=>36053}={}){
 let target=null,face=2,mip=1;
 const gl={RENDERBUFFER:36161,RGBA16F:34842,DEPTH_COMPONENT24:33190,SAMPLES:32937,FRAMEBUFFER:36160,FRAMEBUFFER_COMPLETE:36053,isContextLost:()=>false,getInternalformatParameter:(_target,format)=>new Int32Array(format===34842?color:depth),checkFramebufferStatus:()=>status(target)};
 return {gl,extensions:{has:()=>hdr},capabilities:{maxSamples:8},getContext:()=>gl,toneMapping:4,autoClear:true,xr:{enabled:false},getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>mip,setRenderTarget(value,f=0,m=0){target=value;face=f;mip=m;}};
}
const target=(name,samples=0)=>({texture:{name},samples,disposed:0,dispose(){this.disposed++;}});
test('HDR samples use color/depth format intersection rather than global maximum',()=>{
 assert.equal(getPostprocessingSamples(renderer({color:[4,2],depth:[2]})),2);
 assert.equal(getPostprocessingSamples(renderer({color:[4],depth:[2]})),0);
 assert.equal(getPostprocessingSamples(renderer({hdr:false})),null);
});
test('silent incomplete bloom framebuffer becomes an error and restores renderer binding',()=>{
 const bad=target('bloom vertical'),r=renderer({status:t=>t===bad?36054:36053}),original=target('original');r.setRenderTarget(original,2,1);
 const composer={renderTarget1:target('read',2),renderTarget2:target('write',2),passes:[{renderTargetBright:target('bright'),renderTargetsHorizontal:[target('horizontal')],renderTargetsVertical:[bad]}]};
 assert.throws(()=>validatePostprocessingTargets(r,composer),/bloom vertical.*0x8cd6/);
 assert.equal(r.getRenderTarget(),original);assert.equal(r.getActiveCubeFace(),2);assert.equal(r.getActiveMipmapLevel(),1);assert.equal(composer.renderTarget1.samples,2);
});
test('MSAA validation checks both draw and resolve framebuffer attachments',()=>{
 const read=target('resolve-failure',4),r=renderer({status:t=>t===read&&t.samples===0?36054:36053});
 assert.throws(()=>validatePostprocessingTargets(r,{renderTarget1:read,renderTarget2:target('write'),passes:[]}),/resolve-failure/);
 assert.equal(read.samples,4);assert.equal(r.getRenderTarget(),null);
});
test('unsupported real MSAA allocation can downgrade once to complete HDR buffers',()=>{
 const r=renderer({status:t=>t.samples>0?36182:36053}),composer={renderTarget1:target('read',4),renderTarget2:target('write',4),passes:[]};
 assert.throws(()=>validatePostprocessingTargets(r,composer),/Incomplete/);
 assert.equal(disablePostprocessingMSAA(composer),true);assert.equal(validatePostprocessingTargets(r,composer),2);
 assert.equal(composer.renderTarget1.disposed,1);assert.equal(disablePostprocessingMSAA(composer),false);
});
