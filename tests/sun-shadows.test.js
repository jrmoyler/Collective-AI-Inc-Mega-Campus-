import test from 'node:test';
import assert from 'node:assert/strict';
import {DirectionalLight,Vector3} from 'three';
import {createSunShadowFitter,shadowExtentFor,SHADOW_EXTENT_MAX,SHADOW_EXTENT_MIN} from '../viewer/campus/sun-shadows.js';

test('street shadow detail improves without allocating another map or changing sun direction',()=>{
 const light=new DirectionalLight(),direction=new Vector3(-.4,.7,-.8).normalize(),target=new Vector3(300,20,-200);
 light.shadow.mapSize.set(2048,2048);const fit=createSunShadowFitter(light);
 const aerial=fit(target,1300,direction),street=fit(target,65,direction);
 assert.ok(aerial.extent>=700);assert.ok(street.texel<.07);assert.ok(street.texel<aerial.texel/8);
 assert.ok(light.position.clone().sub(light.target.position).normalize().distanceTo(direction)<1e-12);
 assert.ok(light.target.position.distanceTo(target)<=street.texel);
 assert.equal(light.shadow.mapSize.x,2048);assert.ok(light.shadow.normalBias<.025);
 light.dispose();
});

test('shadow extent follows a stepped ladder so zooming does not re-grid every edge',()=>{
 const light=new DirectionalLight(),direction=new Vector3(-.4,.7,-.8).normalize(),target=new Vector3(0,0,0);
 light.shadow.mapSize.set(2048,2048);const fit=createSunShadowFitter(light);
 const a=fit(target,400,direction).extent,b=fit(target,404,direction).extent;
 assert.equal(a,b,'small zoom steps reuse the same shadow texel grid');
 const extents=new Set();for(let d=60;d<=1400;d+=5)extents.add(shadowExtentFor(d));
 assert.ok(extents.size<=16,`ladder has ${extents.size} rungs`);
 assert.equal(shadowExtentFor(1300),SHADOW_EXTENT_MAX);assert.equal(shadowExtentFor(10),SHADOW_EXTENT_MIN);
 // Grazing dusk light gets a larger normal offset than a high sun.
 const high=(fit(target,300,direction),light.shadow.normalBias);
 const low=(fit(target,300,new Vector3(-.5,.07,-.86).normalize()),light.shadow.normalBias);
 assert.ok(low>high*2);light.dispose();
});
