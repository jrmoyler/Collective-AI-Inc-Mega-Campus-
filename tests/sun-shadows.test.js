import test from 'node:test';
import assert from 'node:assert/strict';
import {DirectionalLight,Vector3} from 'three';
import {createSunShadowFitter} from '../viewer/campus/sun-shadows.js';

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
