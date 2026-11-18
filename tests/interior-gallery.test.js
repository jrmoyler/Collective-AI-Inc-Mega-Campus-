import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITIES,floorLayout} from '../viewer/campus/data.js';
import {gallerySchedule,signMount,sideWindow} from '../viewer/campus/interior-gallery.js';
import {FINISHES} from '../viewer/campus/interior-kit.js';

test('every scheduled room has a plaque mounted fully beside the clear opening',()=>{
  let rooms=0, clerestories=0;
  for (const facility of FACILITIES) {
    const design=gallerySchedule(facility.id);
    assert.ok(FINISHES[design.body] && FINISHES[design.trim],facility.key);
    for (let floor=0;floor<facility.levels;floor++) {
      const layout=floorLayout(facility,floor);
      for (const room of layout.rooms) {
        const mount=signMount(room);
        assert.ok(mount.width>=.5 && mount.x-mount.width/2>room.doorWidth/2);
        assert.ok(mount.x+mount.width/2<room.localWidth/2);
        for(const side of [-1,1])if(sideWindow(room,side,layout.d)){
          const start=room.doorZ-Math.sin(room.angle)*side*room.localWidth/2;
          const end=start+Math.cos(room.angle)*room.localDepth;
          assert.ok(Math.abs(Math.abs(start)-layout.d/2)<.01);
          assert.ok(Math.abs(Math.abs(end)-layout.d/2)<.01);
          clerestories++;
        }
        rooms++;
      }
    }
  }
  assert.equal(rooms,444);
  assert.ok(clerestories>0);
});

test('basement plaques read upright from the passage and the light pool follows the visitor',async()=>{
  const {createCanvas}=await import('@napi-rs/canvas');
  const {NullEngine}=await import('@babylonjs/core/Engines/nullEngine.js');
  const {Vector3}=await import('@babylonjs/core/Maths/math.vector.js');
  const {Viewport}=await import('@babylonjs/core/Maths/math.viewport.js');
  const {createInterior}=await import('../viewer/campus/interior.js');
  globalThis.window={addEventListener(){},removeEventListener(){},setTimeout,clearTimeout};
  globalThis.document={addEventListener(){},removeEventListener(){},createElement:()=>createCanvas(512,128)};
  const facility=FACILITIES[2], layout=floorLayout(facility,1);
  const engine=new NullEngine({renderWidth:800,renderHeight:600});
  const canvas={addEventListener(){},removeEventListener(){}};
  const tour=createInterior(canvas,facility,{initialFloor:1,engineOverride:engine,onRoom(){},onFloor(){}});
  engine.stopRenderLoop();
  try{
    const camera=tour.getCamera(),scene=tour.getScene();
    const lamps=scene.lights.filter(l=>l.name.startsWith('corridor downlight'));
    const initial=lamps.map(l=>l.position.clone());
    const viewport=new Viewport(0,0,800,600);
    for(const room of layout.rooms){
      const plaque=scene.getMeshByName('Program: '+room.name);
      const approach=new Vector3(Math.sin(room.angle),0,Math.cos(room.angle)).scale(1.8);
      camera.position.copyFrom(plaque.position.subtract(approach));
      camera.setTarget(plaque.position);
      const view=camera.getViewMatrix(true).multiply(camera.getProjectionMatrix(true));
      const world=plaque.computeWorldMatrix(true),vertices=plaque.getVerticesData('position');
      const uv=plaque.getVerticesData('uv');
      const screen=[0,1,3].map(i=>Vector3.Project(Vector3.FromArray(vertices,i*3),world,view,viewport));
      assert.ok(screen[0].x<screen[1].x && uv[0]<uv[2],'left to right');
      assert.ok(screen[0].y>screen[2].y && uv[1]<uv[7],'upright');
      scene.onBeforeRenderObservable.notifyObservers(scene);
    }
    assert.ok(lamps.length>0&&lamps.length<=6);
    assert.ok(lamps.some((l,i)=>Vector3.Distance(l.position,initial[i])>1));
    assert.ok(lamps.some(l=>l.includedOnlyMeshes.some(m=>m.name.startsWith('architecture room'))));
    assert.ok(!scene.meshes.some(m=>m.metadata?.components?.some(c=>c==='clerestory glazing'||c==='clear exterior glazing'||c==='passage end glazing')));
  }finally{tour.dispose();}
});
