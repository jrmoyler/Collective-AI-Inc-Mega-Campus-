import * as T from 'three';
import {Batch, materials, textures} from './geometry.js';

// Survey-independent landscape proposals, dimensioned in metres. The preferred
// bearing and shade profile vary with each basin, while siting respects roads,
// buildings, the fountain and channel mouths.
const gardens = [
  {bearing: 3.6, width: 8.4, depth: 4.8, rise: .9},
  {bearing: 2.1, width: 7.2, depth: 4.4, rise: .45},
  {bearing: 5.4, width: 6.4, depth: 3.6, rise: 1.1},
  {bearing: .9, width: 7.8, depth: 4.2, rise: .65},
  {bearing: 2.6, width: 8, depth: 4.5, rise: 1.2},
  {bearing: 5.8, width: 7, depth: 4, rise: .55},
  {bearing: 1.2, width: 6.4, depth: 3.4, rise: .8},
];
const timber = new T.MeshStandardMaterial({
  name: 'Oiled boardwalk timber', color: 0x936b47, roughness: .79,
  bumpMap: textures.brushed, bumpScale: .003,
});
const across = new T.Vector3(0,1,0);
function strut(batch, material, a, b, width, depth) {
  const start = new T.Vector3(...a), end = new T.Vector3(...b);
  const delta = end.clone().sub(start);
  const shape = new T.BoxGeometry(width, delta.length(), depth);
  shape.applyQuaternion(new T.Quaternion().setFromUnitVectors(across, delta.normalize()));
  shape.translate(...start.lerp(end,.5).toArray());
  batch.add(shape,material);
  shape.dispose();
}
function overlookGeometry({width, depth, rise}) {
  const b = new Batch(), deck = .70, near = 4.7, far = near + depth;
  const half = width / 2, rampWidth = 2.1, rampStart = -2.5;
  const rail = (a,c) => strut(b,'steel',a,c,.06,.075);
  // The ramp climbs from the promenade through a break in the stone coping.
  const span = near-rampStart, bottom = .105;
  const incline = new T.BoxGeometry(rampWidth,.09,Math.hypot(span,deck-bottom));
  incline.rotateX(-Math.atan2(deck-bottom,span));
  b.add(incline,timber,0,(bottom+deck)/2-.045,(near+rampStart)/2);
  incline.dispose();
  for(const side of [-1,1]){
    const x=side*(rampWidth/2-.05);
    for(let j=0;j<=3;j++){
      const t=j/3, level=bottom+(deck-bottom)*t, z=rampStart+span*t;
      b.box('dark',x,level+.5,z,.06,1,.08);
    }
    rail([x,bottom+1,rampStart],[x,deck+1,near]);
  }
  const boards=Math.ceil(depth/.21), pitch=depth/boards;
  for(let i=0;i<boards;i++) b.box(timber,0,deck-.06,near+(i+.5)*pitch,width,.12,pitch-.012);
  for(const x of [-half+.28,0,half-.28]){
    b.box('dark',x,deck-.22,near+depth/2,.19,.19,depth);
    for(const z of [near+.28,far-.28]) b.box('steel',x,.15,z,.14,.85,.14);
  }
  function guard(ax,az,bx,bz){
    const length=Math.hypot(ax-bx,az-bz), bays=Math.ceil(length/1.5);
    for(let i=0;i<bays;i++){
      const t=i/bays;
      b.box('dark',ax+(bx-ax)*t,deck+.53,az+(bz-az)*t,.07,1.06,.07);
    }
    for(const h of [.39,.72,1.06]) rail([ax,deck+h,az],[bx,deck+h,bz]);
  }
  guard(-half,near,-half,far);guard(-half,far,half,far);guard(half,far,half,near);
  guard(half,near,rampWidth/2,near);guard(-rampWidth/2,near,-half,near);

  // The roof follows a folded profile with an open third on the lake side.
  // Both end frames spring from their columns; louvers span between the frames.
  const roofW=width-.6, front=near+.18, back=near+depth*.68, top=deck+2.65;
  const crownX=-roofW*.16, crownY=top+rise;
  for(const z of [front,back]){
    for(const x of [-roofW/2,roofW/2]) b.box('dark',x,(deck+top)/2,z,.12,top-deck,.14);
    strut(b,'steel',[-roofW/2,top,z],[crownX,crownY,z],.12,.16);
    strut(b,'steel',[crownX,crownY,z],[roofW/2,top,z],.12,.16);
  }
  for(let i=0;i<=20;i++){
    const x=(i/20-.5)*roofW;
    const y=x<crownX?top+rise*(x+roofW/2)/(crownX+roofW/2):top+rise*(roofW/2-x)/(roofW/2-crownX);
    b.box(timber,x,y+.13,(back+front)/2,.12,.18,back-front+.5);
  }
  // Paired seats keep the central turning and viewing area open.
  for(const side of [-1,1]){
    const x=side*(half-.65), z=near+depth*.50, len=depth*.60;
    for(const dz of [-len*.34,len*.34]) b.box('dark',x,deck+.21,z+dz,.42,.42,.11);
    for(let j=0;j<4;j++) b.box(timber,x+(j-1.5)*.112,deck+.46,z,.1,.072,len);
    b.box('warm',x,deck+.39,z,.29,.032,len*.8);
  }
  return b.finish('Water garden overlook');
}

export function addWaterfrontOverlook(batch,index,shorePoint,canBuild){
  const spec=gardens[index];
  for(let step=0;step<64;step++){
    const angle=spec.bearing+step*Math.PI/32;
    const [x,z]=shorePoint(index,angle);
    const [x0,z0]=shorePoint(index,angle-.005), [x1,z1]=shorePoint(index,angle+.005);
    const edge=new T.Vector2(x1-x0,z1-z0).normalize();
    const inland=new T.Vector2(-edge.y,edge.x);
    // Shore samples run clockwise as seen on an X/Z plot. The left normal
    // points onto land, and local +Z points from the promenade into the lake.
    const yaw=Math.atan2(-inland.x,-inland.y);
    const transform=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    let clear=true;
    for(const u of [-spec.width/2,0,spec.width/2]) for(const v of [-2.5,0,4.7,4.7+spec.depth]){
      if(!canBuild(...transform(u,v))) clear=false;
    }
    if(!clear) continue;
    const parts=overlookGeometry(spec);
    parts.children.forEach(mesh=>{
      const key=Object.keys(materials).find(key=>materials[key]===mesh.material);
      batch.add(mesh.geometry,key||mesh.material,x,0,z,1,1,1,yaw);
      mesh.geometry.dispose();
    });
    return {x,z,yaw,width:spec.width,depth:spec.depth,angle};
  }
  return null;
}
