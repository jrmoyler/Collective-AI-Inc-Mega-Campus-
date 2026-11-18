import test from 'node:test';
import assert from 'node:assert/strict';
import {DirectionalLight,ShaderChunk,Vector3} from 'three';
import {installAerialPerspective,aerialHaze,horizonFade,AERIAL_MARKER,ATMOSPHERE_PRESETS,atmospherePreset} from '../viewer/campus/render-atmosphere.js';
import {GradeShader,GRADE_PRESETS,createGradePass,gradePreset} from '../viewer/campus/post-grade.js';
import {renderProfile} from '../viewer/campus/quality.js';
import {createSunShadowFitter,setShadowMapSize,shadowRadiusFor} from '../viewer/campus/sun-shadows.js';

test('aerial perspective keeps the campus clear at the default aerial and hazes the horizon',()=>{
 const air=ATMOSPHERE_PRESETS.day;
 // Default aerial camera ~680 m up, campus ground 900-1700 m away.
 for(const d of [900,1300])assert.ok(aerialHaze(d,680,0,{near:air.fogNear,far:air.fogFar})<.06,`campus haze at ${d} m`);
 assert.ok(aerialHaze(1700,680,0,{near:air.fogNear,far:air.fogFar})<.1,'far campus rim');
 // Countryside toward the horizon recedes.
 assert.ok(aerialHaze(6000,680,0,{near:air.fogNear,far:air.fogFar})>.3);
 // At street height the same distance is hazier than from the air, and a tall
 // facade is clearer than the ground beside it.
 assert.ok(aerialHaze(2000,8,0,{near:air.fogNear,far:air.fogFar})>aerialHaze(2000,680,0,{near:air.fogNear,far:air.fogFar}));
 assert.ok(aerialHaze(2000,8,120,{near:air.fogNear,far:air.fogFar})<aerialHaze(2000,8,0,{near:air.fogNear,far:air.fogFar}));
 // Within the clear radius nothing is fogged; horizontal rays are finite.
 assert.equal(aerialHaze(300,8,0,{near:air.fogNear,far:air.fogFar}),0);
 // The terrain apron meets the 9 km far plane in horizon haze, not a hard line;
 // the campus (<2.5 km from any default view) is untouched by that fade.
 assert.equal(horizonFade(2500),0);assert.equal(horizonFade(9000),1);assert.ok(horizonFade(7000)>0&&horizonFade(7000)<1);
 const flat=aerialHaze(3000,40,40,{near:0,far:3000});assert.ok(flat>0&&flat<1&&Number.isFinite(flat));
});

test('aerial chunks install once and keep the fog uniforms three refreshes',()=>{
 const chunks={fog_pars_vertex:ShaderChunk.fog_pars_vertex,fog_vertex:ShaderChunk.fog_vertex,fog_pars_fragment:ShaderChunk.fog_pars_fragment,fog_fragment:ShaderChunk.fog_fragment};
 assert.equal(installAerialPerspective(chunks),true);assert.equal(installAerialPerspective(chunks),false);
 assert.ok(chunks.fog_pars_vertex.startsWith(AERIAL_MARKER));
 for(const name of ['fogColor','fogNear','fogFar','fogDensity'])assert.match(chunks.fog_pars_fragment,new RegExp(name));
 // Sun scattering only where the light uniforms exist (lit materials).
 assert.match(chunks.fog_fragment,/defined\( RE_Direct \) && NUM_DIR_LIGHTS > 0/);
 // World position derives from mvPosition, which every fog-using vertex shader defines.
 assert.match(chunks.fog_vertex,/mvPosition/);assert.doesNotMatch(chunks.fog_vertex,/modelMatrix/);
});

test('atmosphere and grade presets stay restrained (natural daylight, no glow)',()=>{
 assert.equal(atmospherePreset(true),ATMOSPHERE_PRESETS.day);assert.equal(atmospherePreset(false),ATMOSPHERE_PRESETS.dusk);
 for(const preset of Object.values(GRADE_PRESETS)){
  assert.ok(preset.contrast<=.2&&preset.vignette<=.25&&preset.saturation<=1.05);
  // Tints are near-neutral multipliers; the grade never brightens a channel by >4%.
  for(const v of [...preset.shadowTint,...preset.highlightTint])assert.ok(v>.95&&v<=1.04);
 }
 assert.equal(gradePreset(true),GRADE_PRESETS.day);
 // Daylight exposure is below dusk exposure (the sun carries day; dusk lifts).
 assert.ok(ATMOSPHERE_PRESETS.day.exposure<ATMOSPHERE_PRESETS.dusk.exposure);
});

test('grade pass tracks aspect and applies presets without sharing uniform arrays',()=>{
 const pass=createGradePass();pass.setSize(1600,800);assert.equal(pass.uniforms.aspect.value,2);
 pass.setPreset(GRADE_PRESETS.dusk);assert.equal(pass.uniforms.vignette.value,GRADE_PRESETS.dusk.vignette);
 pass.uniforms.shadowTint.value[0]=0;assert.notEqual(GRADE_PRESETS.dusk.shadowTint[0],0);
 assert.notEqual(pass.uniforms.contrast,GradeShader.uniforms.contrast,'pass clones shader uniforms');
 pass.dispose();
});

test('quality profile gates shadow resolution and softness, respecting device limits',()=>{
 const balanced=renderProfile('balanced',false),high=renderProfile('high',false),phone=renderProfile('balanced',true);
 assert.equal(balanced.shadowMapSize,2048);assert.equal(high.shadowMapSize,4096);assert.equal(phone.shadowMapSize,1024);
 assert.equal(renderProfile('high',false,{maxTextureSize:2048}).shadowMapSize,2048);
 assert.ok(phone.shadowRadiusMax<=balanced.shadowRadiusMax&&balanced.shadowRadiusMax<=high.shadowRadiusMax);
 assert.equal(phone.fxaaFallback,false);
});

test('PCF radius holds a world-space penumbra across the extent ladder',()=>{
 const light=new DirectionalLight(),direction=new Vector3(-.4,.7,-.8).normalize(),target=new Vector3();
 light.shadow.mapSize.set(2048,2048);const fit=createSunShadowFitter(light,{penumbra:.26,maxRadius:2});
 const aerial=fit(target,1300,direction),street=fit(target,65,direction);
 assert.equal(aerial.radius,1,'aerial edges stay crisp (one texel)');
 assert.ok(street.radius>aerial.radius&&street.radius<=2);
 assert.equal(shadowRadiusFor(0),1);assert.equal(shadowRadiusFor(.01,.26,2.5),2.5);
 fit.setSoftness({maxRadius:1});assert.equal(fit(target,65,direction).radius,1);
 // Resizing frees the old map; same size is a no-op.
 let disposed=0;light.shadow.map={dispose(){disposed++;}};
 assert.equal(setShadowMapSize(light,2048),false);assert.equal(setShadowMapSize(light,4096),true);
 assert.equal(disposed,1);assert.equal(light.shadow.map,null);assert.equal(light.shadow.mapSize.x,4096);
 light.dispose();
});
