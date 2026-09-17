/** Offline GLSL ES compile/link and framebuffer gate. Requires Python 3 plus system libEGL/Mesa. Uses software EGL by default. This does NOT create a WebGL context,
 * render frames, emulate a device, or establish browser/GPU performance.
 * Three's pinned WebGLProgram generates all renderer prefixes/includes;
 * the recording context only captures shaderSource before native validation.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {WebGLProgram} from 'three/src/renderers/webgl/WebGLProgram.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createLandscape} from '../viewer/campus/landscape.js';
import {botanicalMaterial} from '../viewer/campus/botanical.js';
import {kineticRoadMaterial} from '../viewer/campus/geometry.js';

const python=process.env.PYTHON||'python3';
const helper=fileURLToPath(new URL('./compile-shaders-egl.py',import.meta.url));
const version=spawnSync(python,[helper,'--version'],{encoding:'utf8'});
if(version.status!==0)throw new Error(`Native EGL compiler unavailable. Requires Python 3 and libEGL/Mesa. ${version.error||version.stderr}`);
const outputArg=process.argv.indexOf('--output');
const output=outputArg>=0?path.resolve(process.argv[outputArg+1]):fs.mkdtempSync(path.join(os.tmpdir(),'campus-shaders-'));
fs.mkdirSync(output,{recursive:true});
const landscape=createLandscape();
const water=landscape.root.getObjectByName('lake').material;
const sky=new Sky().material;
const bloom=new UnrealBloomPass(new T.Vector2(1920,1080),.08,.55,1.15);
const outputPass=new OutputPass();
// Execute OutputPass's real define-selection branch at the app's runtime settings.
outputPass.render({outputColorSpace:T.SRGBColorSpace,toneMapping:T.ACESFilmicToneMapping,toneMappingExposure:.85,setRenderTarget(){},render(){}},{},{texture:new T.Texture()});
const postParameters={numDirLights:0,numHemiLights:0,outputColorSpace:T.LinearSRGBColorSpace,toneMapping:T.NoToneMapping};
const cases=[
 ['water-daylight',water,{envMap:true,envMapMode:T.CubeUVReflectionMapping,envMapCubeUVHeight:256}],
 ['water-shadowed',water,{envMap:true,envMapMode:T.CubeUVReflectionMapping,envMapCubeUVHeight:256,shadowMapEnabled:true,numDirLightShadows:1}],
 ['foliage-instanced',botanicalMaterial(false,{value:0}),{instancing:true}],
 ['blossom-instanced-shadowed',botanicalMaterial(true,{value:0}),{instancing:true,shadowMapEnabled:true,numDirLightShadows:1}],
 ['foliage-uninstanced',botanicalMaterial(false,{value:0}),{}],
 ['kinetic-road-cyan',kineticRoadMaterial('cyan'),{}],
 ['kinetic-road-gold',kineticRoadMaterial('gold'),{}],
 ['atmospheric-sky',sky,{}],
 ['bloom-luminosity-highpass',bloom.materialHighPassFilter,postParameters],
 ...bloom.separableBlurMaterials.map((material,i)=>[`bloom-blur-mip-${i}`,material,postParameters]),
 ['bloom-composite',bloom.compositeMaterial,postParameters],
 ['bloom-additive-copy',bloom.blendMaterial,postParameters],
 ['output-aces-srgb',outputPass.material,{...postParameters,outputColorSpace:T.SRGBColorSpace}],
];
const results=[];
for(const [name,material,overrides] of cases){
 const shader=material.isShaderMaterial?{vertexShader:material.vertexShader,fragmentShader:material.fragmentShader,uniforms:{...material.uniforms}}:{vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:T.UniformsUtils.clone(T.ShaderLib.standard.uniforms)};
 material.onBeforeCompile(shader,{});
 const captured={};
 const recordingContext={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,createProgram:()=>({}),createShader:type=>({type}),shaderSource:(shader,source)=>{captured[shader.type===35633?'vert':'frag']=source;},compileShader:()=>{},attachShader:()=>{},linkProgram:()=>{},bindAttribLocation:()=>{}};
 const parameters={
  shaderType:material.type,shaderName:name.replaceAll('-','_'),vertexShader:shader.vertexShader,fragmentShader:shader.fragmentShader,
  isRawShaderMaterial:material.isRawShaderMaterial===true,glslVersion:material.glslVersion,defines:material.defines||{},precision:'highp',outputColorSpace:T.SRGBColorSpace,toneMapping:material.toneMapped?T.ACESFilmicToneMapping:T.NoToneMapping,
  numSunLights:0,numDirLights:1,numSpotLights:0,numSpotLightMaps:0,numSpotLightShadowsWithMaps:0,numRectAreaLights:0,numPointLights:0,numHemiLights:1,
  numSunLightShadows:0,numDirLightShadows:0,numSpotLightShadows:0,numPointLightShadows:0,numLightProbes:0,numLightProbeGrids:0,numClippingPlanes:0,numClipIntersection:0,
  envMap:false,envMapCubeUVHeight:null,shadowMapType:T.PCFShadowMap,rendererExtensionParallelShaderCompile:false,
  hasPositionAttribute:true,doubleSided:material.side===T.DoubleSide,flipSided:material.side===T.BackSide,vertexColors:material.vertexColors,
  fog:material.fog,useFog:material.fog,fogExp2:false,opaque:!material.transparent,alphaTest:material.alphaTest>0,
  ...overrides,
 };
 // This is Three's real source-generation path, not a handwritten shader prefix.
 new WebGLProgram({getContext:()=>recordingContext},name,parameters,{});
 const files=['vert','frag'].map(stage=>{const file=path.join(output,`${name}.${stage}`);fs.writeFileSync(file,captured[stage]);return file;});
 const compile=spawnSync(python,[helper,...files],{encoding:'utf8'});
 const result={name,language:captured.vert.startsWith('#version 300 es')?'GLSL ES 3.00':'GLSL ES 1.00 (raw OutputPass)',passed:compile.status===0,vertexSHA256:createHash('sha256').update(captured.vert).digest('hex'),fragmentSHA256:createHash('sha256').update(captured.frag).digest('hex'),native:compile.stdout.trim()?JSON.parse(compile.stdout):null,log:compile.stderr.replaceAll(output+'/', '')};
 results.push(result);
 console.log(`${result.passed?'PASS':'FAIL'} ${name}`);
 if(!result.passed)console.error(result.log,JSON.stringify(result.native));
}
// Negative control proves the native gate actually checks stage interfaces.
// Each stage remains valid in isolation; only the varying type differs.
const mismatchFile=path.join(output,'negative-varying-mismatch.frag');
const waterFragment=fs.readFileSync(path.join(output,'water-daylight.frag'),'utf8');
if(!waterFragment.includes('varying vec3 waterWorld;'))throw new Error('Water varying missing: injection extraction regressed');
fs.writeFileSync(mismatchFile,waterFragment.replace('varying vec3 waterWorld;','varying vec4 waterWorld;'));
const mismatch=spawnSync(python,[helper,path.join(output,'water-daylight.vert'),mismatchFile],{encoding:'utf8'});
const mismatchResult=JSON.parse(mismatch.stdout);
const negativeControlPassed=mismatch.status!==0&&mismatchResult.stages.every(stage=>stage.passed)&&!mismatchResult.link.passed;
console.log(`${negativeControlPassed?'PASS':'FAIL'} negative-control: stage interface mismatch rejected`);
const framebufferRun=spawnSync(python,[helper,'--framebuffers'],{encoding:'utf8'});
const framebuffers=JSON.parse(framebufferRun.stdout);
console.log(`${framebufferRun.status===0?'PASS':'FAIL'} native RGBA16F framebuffer clear/resolve/readback`);
const report={framebuffers,negativeControl:{passed:negativeControlPassed,native:mismatchResult},threeRevision:T.REVISION,compiler:JSON.parse(version.stdout),scope:'Offline native GLSL ES compilation/interface linking and RGBA16F framebuffer clear/resolve/readback. No browser, WebGL context, rendered-frame, device, visual-fidelity or performance validation.',cases:results};
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Evidence: ${output}`);
if(framebufferRun.status!==0||!negativeControlPassed||results.some(result=>!result.passed))process.exitCode=1;
