import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {createCanvas} from '@napi-rs/canvas';
import {nearPlaneFor,fixedDepthStep,createDepthRange,skyDepthVertexShader,NEAR_MIN} from '../viewer/campus/depth-precision.js';
import {Batch,materials,applyDepthConvention,DEPTH_OFFSET_UNITS} from '../viewer/campus/geometry.js';
import {facadeEdge,roofCoping,occupiedBays} from '../viewer/campus/facade-craft.js';
import {configureFacilityDetails,DETAIL_GLASS_ORDER,SHELL_GLASS_ORDER} from '../viewer/campus/facility-details.js';
import {getPostprocessingSamples} from '../viewer/campus/postprocessing-capabilities.js';
globalThis.document={createElement:()=>createCanvas(512,96)};

test('aerial near plane gives centimetre depth steps even on a 24-bit framebuffer',()=>{
 // Default aerial: ~1.2 km orbit at 680 m height.
 const near=nearPlaneFor(1200,680);
 assert.ok(fixedDepthStep(1200,.5)>.15,'the old fixed 0.5 m near plane resolved only ~17 cm');
 assert.ok(fixedDepthStep(1200,near)<.025,`aerial depth step ${fixedDepthStep(1200,near)} m`);
 // Street views keep a small near plane so nearby trees and facades do not clip.
 assert.equal(nearPlaneFor(40,5.2),NEAR_MIN);
 assert.ok(nearPlaneFor(231,8)<=.8);
 assert.equal(nearPlaneFor(NaN,NaN),NEAR_MIN);
});

test('near plane updates are damped so the projection does not breathe every frame',()=>{
 const camera=new T.PerspectiveCamera(42,1.5,.5,9000);camera.position.set(0,680,900);
 const update=createDepthRange();
 assert.equal(update(camera,1200),true);const first=camera.near;
 assert.equal(update(camera,1210),false);assert.equal(camera.near,first);
 assert.equal(update(camera,600),true);assert.ok(camera.near<first);
});

test('sky dome stays on the far plane under a reversed depth buffer',()=>{
 const sky=new Sky(),patched=skyDepthVertexShader(sky.material.vertexShader);
 assert.match(patched,/#ifdef USE_REVERSED_DEPTH_BUFFER\s+gl_Position\.z = 0\.0;/);
 assert.match(patched,/#else\s+gl_Position\.z = gl_Position\.w;/);
 assert.equal(skyDepthVertexShader(patched),patched,'patching is idempotent');
 sky.material.dispose();sky.geometry.dispose();
});

test('glazing recedes behind coincident opaque faces under both depth conventions, including clones',()=>{
 const clone=materials.glazing.clone(),box=new T.Mesh(new T.BoxGeometry(),[materials.glazing,clone,materials.stone]);
 assert.equal(materials.glazing.polygonOffset,true);assert.ok(materials.glazing.polygonOffsetFactor>0);assert.ok(materials.glazing.polygonOffsetUnits>0);
 assert.equal(materials.stone.polygonOffset,false,'opaque masonry is never offset');
 assert.equal(applyDepthConvention(box,true),2);
 // three negates the factor for reversed depth itself; units must be negated here.
 for(const m of [materials.glazing,clone]){assert.ok(m.polygonOffsetFactor>0);assert.ok(m.polygonOffsetUnits<0);}
 applyDepthConvention(box,false);
 for(const m of [materials.glazing,clone])assert.equal(m.polygonOffsetUnits,DEPTH_OFFSET_UNITS);
 box.geometry.dispose();clone.dispose();
});

// Faces of different materials closer than this flicker at aerial range.
function coincidentLayers(root,tolerance=.02){
 const faces=[];root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index;
  for(let i=0;i<idx.count;i+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx.getX(i+k)).applyMatrix4(o.matrixWorld));
   const n=new T.Vector3().crossVectors(v[1].clone().sub(v[0]),v[2].clone().sub(v[0]));if(n.length()<1e-8)continue;n.normalize();
   if(Math.abs(n.y)>.99)faces.push({mat:o.material,y:v[0].y,up:n.y>0,min:[Math.min(...v.map(a=>a.x)),Math.min(...v.map(a=>a.z))],max:[Math.max(...v.map(a=>a.x)),Math.max(...v.map(a=>a.z))]});}});
 let hits=0;
 for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){const a=faces[i],b=faces[j];
  if(a.mat===b.mat||a.up!==b.up||Math.abs(a.y-b.y)>=tolerance)continue;
  if(a.max[0]-1e-6<=b.min[0]||b.max[0]-1e-6<=a.min[0]||a.max[1]-1e-6<=b.min[1]||b.max[1]-1e-6<=a.min[1])continue;hits++;}
 return hits;
}

test('facade craft layers keep at least 2 cm between differently finished horizontal faces',()=>{
 const b=new Batch(),square=[[-12,-8],[12,-8],[12,8],[-12,8]];
 for(let i=0;i<4;i++)facadeEdge(b,square[i],square[(i+1)%4],0,4.2,{center:[0,0]});
 roofCoping(b,square,8.4,{center:[0,0]});occupiedBays(b,[[-30,-20],[30,-20],[30,20],[-30,20]],0,4.2);
 const root=b.finish();
 assert.equal(coincidentLayers(root),0);root.traverse(o=>o.geometry?.dispose());
});

test('interior glass always draws before the curtain wall so transparent order cannot flip',()=>{
 const root=new T.Group(),glass=new T.Mesh(new T.PlaneGeometry(),materials.glazing);glass.renderOrder=SHELL_GLASS_ORDER;root.add(glass);
 root.userData.createNearDetail=()=>{const g=new T.Group();g.userData.nearDetail=true;g.add(new T.Mesh(new T.PlaneGeometry(),materials.glazing),new T.Mesh(new T.PlaneGeometry(),materials.stone));return g;};
 let created=null;const update=configureFacilityDetails(root,{onCreate:d=>{created=d;}});
 update(new T.Vector3(0,2,10));assert.ok(created);
 assert.equal(created.children[0].renderOrder,DETAIL_GLASS_ORDER);assert.equal(created.children[1].renderOrder,0);
 assert.ok(DETAIL_GLASS_ORDER<SHELL_GLASS_ORDER);
 root.traverse(o=>o.geometry?.dispose());
});

test('MSAA sample negotiation checks the float depth attachment used with reversed depth',()=>{
 const gl={RENDERBUFFER:1,RGBA16F:2,DEPTH_COMPONENT24:3,DEPTH_COMPONENT32F:4,SAMPLES:5,getInternalformatParameter:(_t,format)=>new Int32Array(format===2?[4,2]:format===4?[2]:[4,2])};
 const renderer={extensions:{has:()=>true},capabilities:{maxSamples:8},getContext:()=>gl};
 assert.equal(getPostprocessingSamples(renderer),4);
 assert.equal(getPostprocessingSamples(renderer,4,{floatDepth:true}),2);
});
