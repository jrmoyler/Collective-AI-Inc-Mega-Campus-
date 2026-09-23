// @ts-nocheck
import * as T from 'three';
import {SPIRES,FACILITIES} from './data.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Everything that moves outdoors: autonomous shuttles, freight trucks, androids,
// drones and campus pedestrians. Each agent keeps a real articulated scene graph
// (wheels, joints, rotors) that is posed on the CPU, while drawing goes through
// shared InstancedMeshes keyed by geometry + material: ~50 draws for ~290 agents.

// ---------------------------------------------------------------- textures
// DataTextures only, so Node tests and GLB export work without a DOM canvas.
function dataTexture(size,fn,{srgb=true,wrap=false}={}){
 const data=new Uint8Array(size*size*4);let seed=91813;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const [r,g,b,a=255]=fn((x+.5)/size,(y+.5)/size,rand);const o=(y*size+x)*4;data[o]=r;data[o+1]=g;data[o+2]=b;data[o+3]=a;}
 const tex=new T.DataTexture(data,size,size);tex.needsUpdate=true;if(srgb)tex.colorSpace=T.SRGBColorSpace;
 tex.wrapS=tex.wrapT=wrap?T.RepeatWrapping:T.ClampToEdgeWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;return tex;
}
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const TEX={
 // Superellipse contact shadow: dense under the chassis, soft penumbra outside.
 contact:dataTexture(64,(u,v)=>{const x=Math.abs(u*2-1),y=Math.abs(v*2-1),d=Math.pow(x**4+y**4,.25);return [0,0,0,Math.round(255*.78*Math.pow(1-smooth(.35,1,d),1.4))];},{srgb:false}),
 blob:dataTexture(32,(u,v)=>{const d=Math.hypot(u*2-1,v*2-1);return [0,0,0,Math.round(255*.55*Math.pow(1-smooth(.1,1,d),1.6))];},{srgb:false}),
 // Rotor disc as a long exposure: transparent hub, faint banded sweep, dark tips.
 rotorBlur:dataTexture(128,(u,v)=>{const r=Math.hypot(u*2-1,v*2-1);if(r>1||r<.16)return [20,22,24,0];const band=.06+.035*Math.sin(r*46)+.2*smooth(.86,.95,r)*(1-smooth(.97,1,r));return [26,28,31,Math.round(255*band)];}),
 // Moulded shell seams for android panels (capsule UV: u around, v along).
 seams:dataTexture(128,(u,v)=>{const line=(p,c,w)=>Math.abs(p-c)<w;const seam=line(v,.26,.006)||line(v,.74,.006)||line(u,.25,.004)||line(u,.75,.004);const n=244+Math.sin(u*40)*1.2;return seam?[150,154,158]:[n,n+1,n-1];}),
 cloth:dataTexture(64,(u,v,r)=>{const w=128+((Math.floor(u*64)+Math.floor(v*64))%2?14:-14)+(r()-.5)*40;return [w,w,w];},{srgb:false,wrap:true}),
 kraft:dataTexture(64,(u,v,r)=>{const tape=Math.abs(u-.5)<.09;const n=(r()-.5)*18;return tape?[214+n*.3,190+n*.3,150]:[176+n,132+n,86+n*.6];}),
};
TEX.cloth.repeat.set(6,6);

// ---------------------------------------------------------------- materials
// Local, cloned-from-nothing materials: fleets never mutate the shared palette.
const phys=p=>new T.MeshPhysicalMaterial({envMapIntensity:1.15,...p});
const std=p=>new T.MeshStandardMaterial({envMapIntensity:1,...p});
export const FLEET_MATERIALS={
 paint:phys({name:'pearl white clearcoat',color:0xd9dcd8,roughness:.36,clearcoat:1,clearcoatRoughness:.05}),
 cabPaint:phys({name:'graphite clearcoat',color:0x2c3237,roughness:.38,metalness:.08,clearcoat:1,clearcoatRoughness:.08}),
 glass:phys({name:'tinted laminated glass',color:0x0b141a,roughness:.035,metalness:.25,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:2.3}),
 trim:std({name:'satin black trim',color:0x15181b,roughness:.55,metalness:.15}),
 sensor:phys({name:'sensor glass',color:0x07090b,roughness:.1,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:1.8}),
 alu:std({name:'brushed aluminium',color:0xc3c8cc,metalness:1,roughness:.26}),
 tire:std({name:'tyre rubber',color:0x151617,roughness:.9}),
 rim:std({name:'machined alloy',color:0xa9b0b5,metalness:.95,roughness:.28}),
 brake:std({name:'brake disc',color:0x3b3f43,metalness:.8,roughness:.45}),
 head:std({name:'LED headlamp',color:0xffffff,emissive:0xfff3dc,emissiveIntensity:2.4,roughness:.2}),
 tail:std({name:'LED tail lamp',color:0x3a0503,emissive:0xff2414,emissiveIntensity:2.1,roughness:.25}),
 amber:std({name:'LED indicator',color:0x3a2000,emissive:0xff9a1f,emissiveIntensity:1.5,roughness:.25}),
 status:std({name:'autonomy status teal',color:0x0a2a25,emissive:0x00d9b5,emissiveIntensity:1.6,roughness:.3}),
 gold:std({name:'gold accent',color:0xd4a843,metalness:.9,roughness:.3}),
 contact:new T.MeshBasicMaterial({name:'contact shadow',color:0x000000,map:TEX.contact,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),
 blob:new T.MeshBasicMaterial({name:'foot shadow',color:0x000000,map:TEX.blob,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),
 carbon:std({name:'carbon fibre',color:0x1d2024,roughness:.38,metalness:.3}),
 droneShell:phys({name:'drone shell',color:0xe9ebea,roughness:.36,clearcoat:.6,clearcoatRoughness:.1}),
 motor:std({name:'anodised motor bell',color:0x2c3036,metalness:.85,roughness:.33}),
 prop:std({name:'propeller',color:0x131517,roughness:.45,transparent:true,opacity:.55,depthWrite:false}),
 rotorBlur:new T.MeshBasicMaterial({name:'rotor blur',color:0xffffff,map:TEX.rotorBlur,transparent:true,depthWrite:false,side:T.DoubleSide}),
 navRed:std({name:'port nav light',color:0x300000,emissive:0xff2010,emissiveIntensity:3}),
 navGreen:std({name:'starboard nav light',color:0x002a08,emissive:0x19ff5a,emissiveIntensity:3}),
 strobe:std({name:'anti-collision strobe',color:0xffffff,emissive:0xffffff,emissiveIntensity:4}),
 kraft:std({name:'corrugated parcel',color:0xffffff,map:TEX.kraft,roughness:.92}),
 androidShell:phys({name:'android white shell',color:0xe4e6e3,map:TEX.seams,roughness:.3,clearcoat:.55,clearcoatRoughness:.12}),
 androidJoint:std({name:'android graphite joint',color:0x2b3036,metalness:.6,roughness:.36}),
 visor:phys({name:'android visor',color:0x040608,roughness:.05,metalness:.2,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:2.2}),
 rubber:std({name:'elastomer',color:0x1a1c1e,roughness:.75}),
 skin:std({name:'skin',color:0xffffff,roughness:.55}),
 cloth:std({name:'woven cloth',color:0xffffff,roughness:.88,bumpMap:TEX.cloth,bumpScale:.35}),
 hair:std({name:'hair',color:0xffffff,roughness:.52}),
 shoe:std({name:'footwear',color:0xffffff,roughness:.5}),
};
const M=FLEET_MATERIALS;

// ---------------------------------------------------------------- geometry kit
const cache=new Map();
function cached(key,build){if(!cache.has(key))cache.set(key,build());return cache.get(key);}
const tmpM=new T.Matrix4(),tmpQ=new T.Quaternion(),tmpE=new T.Euler(),tmpV=new T.Vector3(),tmpS=new T.Vector3();
function bake(geometry,p=[0,0,0],r=[0,0,0],s=[1,1,1]){
 const g=geometry.index?geometry.toNonIndexed():geometry.clone();
 tmpM.compose(tmpV.set(...p),tmpQ.setFromEuler(tmpE.set(r[0],r[1],r[2])),tmpS.set(...s));g.applyMatrix4(tmpM);
 for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
 if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 g.clearGroups();return g;
}
// Merges baked parts by material. Returned meshes share immutable buffers.
class Kit{
 constructor(){this.parts=new Map();}
 add(material,geometry,p,r,s,dispose=true){if(!this.parts.has(material))this.parts.set(material,[]);this.parts.get(material).push(bake(geometry,p,r,s));if(dispose)geometry.dispose();return this;}
 box(material,w,h,d,p,radius=0,r){return this.add(material,radius>0?new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w/2-.001,h/2-.001,d/2-.001)):new T.BoxGeometry(w,h,d),p,r);}
 cyl(material,rt,rb,h,p,r,n=20,open=false){return this.add(material,new T.CylinderGeometry(rt,rb,h,n,1,open),p,r);}
 sphere(material,rad,p,s,n=16){return this.add(material,new T.SphereGeometry(rad,n,Math.max(8,n*.6|0)),p,[0,0,0],s);}
 capsule(material,rad,len,p,r,s){return this.add(material,new T.CapsuleGeometry(rad,len,4,12),p,r,s);}
 build(){const out=[];for(const [material,gs] of this.parts){const g=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());g.computeBoundingSphere();out.push({geometry:g,material});}this.parts.clear();return out;}
}
function meshesFrom(defs,name){return defs.map(({geometry,material})=>{const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=!material.transparent;m.receiveShadow=true;return m;});}

// Rounded side-profile silhouettes extruded across the vehicle width give real
// beveled coachwork (wheel arches, raked glass) instead of stacked boxes.
function roundedShape(pts){
 const s=new T.Shape(),n=pts.length,P=i=>pts[(i+n)%n];
 const along=(a,b,d)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [a[0]+dx/l*d,a[1]+dy/l*d];};
 for(let i=0;i<n;i++){
  const c=P(i),a=P(i-1),b=P(i+1);const r=Math.min(c[2]||0,Math.hypot(a[0]-c[0],a[1]-c[1])/2,Math.hypot(b[0]-c[0],b[1]-c[1])/2);
  const p1=along(c,a,r),p2=along(c,b,r);if(i===0)s.moveTo(...p1);else s.lineTo(...p1);if(r>0)s.quadraticCurveTo(c[0],c[1],p2[0],p2[1]);
 }
 s.closePath();return s;
}
function sideExtrude(pts,width,bevel=.06){
 const shape=roundedShape(pts.map(([z,y,r])=>[-z,y,r])),depth=Math.max(.01,width-2*bevel);
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelOffset:-bevel,bevelSegments:3,curveSegments:10});
 g.translate(0,0,-depth/2);g.rotateY(Math.PI/2);return g;
}
function arch(points,cz,cy,r,bottom){points.push([cz+r+.02,bottom,0]);for(let i=0;i<=12;i++){const a=i/12*Math.PI;points.push([cz+r*Math.cos(a),cy+r*Math.sin(a)+.02,0]);}points.push([cz-r-.02,bottom,0]);}

// ---------------------------------------------------------------- wheels
function wheelDefs(r,tw){
 return cached(`wheel-${r}-${tw}`,()=>{
  const k=new Kit(),h=tw/2;
  const profile=[[r*.64,-h],[r*.9,-h],[r*.975,-h+.03],[r,-h+.075],[r,h-.075],[r*.975,h-.03],[r*.9,h],[r*.64,h]].map(([x,y])=>new T.Vector2(x,y));
  k.add(M.tire,new T.LatheGeometry(profile,36),[0,0,0],[0,0,-Math.PI/2]);
  k.cyl(M.brake,r*.56,r*.56,.03,[h*.1,0,0],[0,0,Math.PI/2],28);
  k.cyl(M.rim,r*.645,r*.645,tw*.86,[0,0,0],[0,0,Math.PI/2],32,true);
  k.add(M.rim,new T.TorusGeometry(r*.64,.022,8,36),[h*.82,0,0],[0,Math.PI/2,0]);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;k.box(M.rim,.035,r*.5,.075,[h*.72,Math.cos(a)*r*.37,Math.sin(a)*r*.37],.012,[a,0,0]);}
  k.cyl(M.rim,r*.15,r*.17,.07,[h*.76,0,0],[0,0,Math.PI/2],20);
  k.cyl(M.trim,r*.08,r*.08,.02,[h*.8,0,0],[0,0,Math.PI/2],16);
  return k.build();
 });
}
function wheel(root,x,y,z,r,tw){
 const assembly=new T.Group();assembly.name='rolling wheel';assembly.position.set(x,y,z);root.add(assembly);
 for(const m of meshesFrom(wheelDefs(r,tw),'wheel')){if(x<0)m.rotation.y=Math.PI;assembly.add(m);}
 return assembly;
}

// ---------------------------------------------------------------- vehicles
function shuttleDefs(){
 return cached('shuttle',()=>{
  const k=new Kit(),L=5.6,W=2.2,a=1.85,wr=.42,belt=1.2;
  const lower=[[L/2,belt,.12],[L/2,.44,.24],[L/2-.34,.25,.14]];arch(lower,a,wr,.5,.25);arch(lower,-a,wr,.5,.25);lower.push([-L/2+.34,.25,.14],[-L/2,.44,.24],[-L/2,belt,.12]);
  k.add(M.paint,sideExtrude(lower,W,.09));
  k.add(M.glass,sideExtrude([[L/2-.03,belt-.04,0],[L/2-.14,2.3,.36],[-L/2+.14,2.3,.36],[-L/2+.03,belt-.04,0]],W-.07,.05));
  k.add(M.paint,sideExtrude([[L/2-.11,2.2,0],[L/2-.2,2.43,.16],[-L/2+.2,2.43,.16],[-L/2+.11,2.2,0]],W-.02,.07));
  // Corner pillars, black B-pillar door frames and flush panel gaps.
  for(const sx of [-1,1])for(const sz of [-1,1])k.box(M.trim,.1,1.04,.1,[sx*(W/2-.075),1.72,sz*(L/2-.1)],.035,[sz*.05,0,0]);
  for(const sx of [-1,1]){
   for(const z of [-1.28,0,1.28])k.box(M.trim,.03,1.0,z===0?.05:.035,[sx*(W/2-.025),1.72,z]);
   for(const z of [-1.28,0,1.28])k.box(M.trim,.012,.86,.012,[sx*(W/2+.004),.74,z]);
   k.box(M.trim,.012,.012,2.56,[sx*(W/2+.004),.3+.02,0]);
   k.box(M.gold,.012,.028,L*.86,[sx*(W/2+.006),belt-.03,0]);
   k.box(M.trim,.07,.12,.16,[sx*(W/2+.04),1.92,L/2-.32],.03);
   k.box(M.sensor,.02,.07,.07,[sx*(W/2+.075),1.92,L/2-.28],.01);
  }
  for(const sz of [-1,1]){
   const face=sz*(L/2+.012);
   k.box(M.sensor,W*.62,.2,.04,[0,.64,face],.06);
   k.box(sz>0?M.head:M.tail,W*.8,.042,.03,[0,.98,face+sz*.004],.01);
   for(const sx of [-1,1]){k.box(sz>0?M.head:M.tail,.3,.1,.035,[sx*(W/2-.32),.92,face],.03);k.box(M.amber,.12,.05,.03,[sx*(W/2-.12),.82,face],.015);}
   k.box(M.trim,W*.94,.12,.08,[0,.33,sz*(L/2-.02)],.04);
   k.box(M.status,.5,.035,.02,[0,2.28,sz*(L/2-.2)]);
  }
  k.box(M.trim,W-.3,.12,2*a-1.1,[0,.3,0]);
  for(const sx of [-1,1])for(const sz of [-1,1]){k.cyl(M.trim,.1,.11,.05,[sx*(W/2-.25),2.47,sz*(L/2-.4)]);k.cyl(M.sensor,.085,.085,.12,[sx*(W/2-.25),2.55,sz*(L/2-.4)],undefined,24);}
  k.box(M.trim,.95,.1,.46,[0,2.47,0],.04);k.cyl(M.sensor,.13,.13,.14,[0,2.58,0],undefined,24);
  k.add(M.contact,new T.PlaneGeometry(W+1.1,L+1.2),[0,.035,0],[-Math.PI/2,0,0]);
  return {defs:k.build(),wheels:[[W/2-.15,wr,a],[W/2-.15,wr,-a]],wr,tw:.25,L};
 });
}
function freightDefs(){
 return cached('freight',()=>{
  const k=new Kit(),L=8.4,W=2.45,wr=.5,af=L/2-1.35,ar=-L/2+1.7,cabBack=L/2-2.15;
  const cab=[[L/2,1.3,.14],[L/2,.5,.22],[L/2-.35,.36,.12]];arch(cab,af,wr,.6,.36);cab.push([cabBack,.36,0],[cabBack,2.78,0],[L/2-1.05,2.78,.35],[L/2-.14,1.62,.22]);
  k.add(M.cabPaint,sideExtrude(cab,W,.09));
  k.add(M.cabPaint,sideExtrude([[L/2-1.0,2.7,0],[cabBack-.05,2.7,0],[cabBack-.05,3.42,0],[L/2-1.55,3.34,.4]],W-.24,.08));
  const s=Math.atan2(1.16,.91);k.box(M.glass,W-.36,1.36,.05,[0,2.22,L/2-.6],.03,[-(Math.PI/2-s),0,0]);
  for(const sx of [-1,1]){
   k.box(M.glass,.04,.72,.95,[sx*(W/2+.004),2.05,L/2-1.55],.02);
   k.box(M.trim,.05,.78,.035,[sx*(W/2+.006),2.05,L/2-1.05]);
   k.box(M.trim,.012,1.5,.012,[sx*(W/2+.004),1.3,L/2-2.0]);
   k.box(M.trim,.05,.12,.28,[sx*(W/2+.05),2.2,L/2-.95],.03);k.box(M.sensor,.03,.08,.08,[sx*(W/2+.09),2.2,L/2-.84],.01);
   k.box(M.amber,.02,.06,.14,[sx*(W/2+.01),1.1,L/2-.6],.01);
  }
  // Cargo box: panel posts, aluminium corner cappings, roll-up door slats.
  const bz=(-L/2+cabBack-.08)/2,bl=cabBack-.08+L/2,by=2.3,bh=2.4;
  k.box(M.paint,W,bh,bl,[0,by,bz],.05);
  for(const sx of [-1,1]){
   for(let z=-L/2+.6;z<cabBack-.3;z+=.62)k.box(M.alu,.018,bh-.14,.045,[sx*(W/2+.006),by,z]);
   for(const y of [by-bh/2+.04,by+bh/2-.04])k.box(M.alu,.06,.07,bl,[sx*(W/2-.012),y,bz],.02);
   for(const z of [-L/2+.02,cabBack-.1])k.box(M.alu,.07,bh,.07,[sx*(W/2-.02),by,z],.02);
   k.box(M.gold,.012,.05,bl*.92,[sx*(W/2+.012),1.36,bz]);
   k.box(M.trim,.05,.36,af-ar-2.6,[sx*(W/2-.12),.78,(af+ar)/2-.1]);
   k.box(M.trim,.3,.12,1.35,[sx*(W/2-.14),1.06,ar],.05);
   k.box(M.rubber,.28,.34,.02,[sx*(W/2-.15),.5,ar-.78]);
  }
  for(let y=1.25;y<3.45;y+=.19)k.box(M.alu,W-.22,.018,.012,[0,y,-L/2-.006]);
  k.box(M.alu,W-.16,.05,.03,[0,1.16,-L/2-.01]);
  for(const sx of [-1,1]){k.box(M.tail,.1,.34,.03,[sx*(W/2-.12),1.0,-L/2-.02],.02);k.box(M.amber,.1,.1,.03,[sx*(W/2-.12),.76,-L/2-.02],.02);}
  k.box(M.trim,W*.96,.16,.14,[0,.62,-L/2+.02],.04);
  k.box(M.trim,W-.95,.28,L-1.1,[0,.72,-.3]);
  k.box(M.sensor,W*.56,.46,.04,[0,.82,L/2+.01],.04);
  k.box(M.head,W*.82,.04,.03,[0,1.16,L/2+.02],.01);
  for(const sx of [-1,1]){k.box(M.head,.34,.13,.04,[sx*(W/2-.36),.98,L/2+.012],.04);k.box(M.amber,.12,.06,.03,[sx*(W/2-.12),.9,L/2+.012],.02);}
  k.box(M.trim,W*.98,.18,.12,[0,.46,L/2-.02],.05);
  k.box(M.status,.6,.035,.02,[0,2.72,L/2-1.02]);
  for(const sx of [-1,1]){k.cyl(M.trim,.1,.11,.05,[sx*(W/2-.3),2.8,L/2-1.2]);k.cyl(M.sensor,.09,.09,.13,[sx*(W/2-.3),2.88,L/2-1.2],undefined,24);}
  k.add(M.contact,new T.PlaneGeometry(W+1.1,L+1.2),[0,.035,0],[-Math.PI/2,0,0]);
  return {defs:k.build(),wheels:[[W/2-.18,wr,af],[W/2-.18,wr,ar]],wr,tw:.3,L};
 });
}
function vehicle(freight){
 const spec=freight?freightDefs():shuttleDefs();
 const root=new T.Group();root.name=freight?'freight':'shuttle';
 for(const m of meshesFrom(spec.defs,'coachwork'))root.add(m);
 root.userData.wheels=[];
 for(const [x,y,z] of spec.wheels)for(const side of [-1,1])root.userData.wheels.push(wheel(root,side*x,y,z,spec.wr,spec.tw));
 root.userData.wheelRadius=spec.wr;return root;
}

// ---------------------------------------------------------------- drones
function bladeGeometry(r){
 return cached(`blade-${r}`,()=>{
  const shape=new T.Shape();shape.moveTo(.03,-.022);shape.quadraticCurveTo(r*.3,-.05,r*.92,-.022);shape.quadraticCurveTo(r,0,r*.92,.018);shape.quadraticCurveTo(r*.35,.034,.03,.02);shape.closePath();
  const one=new T.ExtrudeGeometry(shape,{depth:.01,bevelEnabled:false,curveSegments:6});one.rotateX(-Math.PI/2);
  const two=one.clone().rotateY(Math.PI);const hub=new T.CylinderGeometry(.035,.035,.03,12);
  const g=mergeGeometries([bake(one),bake(two),bake(hub)]);one.dispose();two.dispose();hub.dispose();return g;
 });
}
function rotor(root,x,z,r){
 const hyp=Math.hypot(x,z),ar=.045;
 const arm=new T.Mesh(cached(`arm-${hyp}`,()=>new T.CapsuleGeometry(ar,hyp-ar*2,4,10)),M.carbon);arm.position.set(x*.5,0,z*.5);arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(x,0,z).normalize());arm.name='rotor arm';arm.castShadow=true;root.add(arm);
 const motor=new T.Mesh(cached('motor',()=>{const k=new Kit();k.cyl(M.motor,.1,.12,.13,[0,.07,0],undefined,20);k.cyl(M.motor,.075,.075,.06,[0,-.02,0],undefined,16);return k.build()[0].geometry;}),M.motor);motor.name='rotor motor';motor.position.set(x,0,z);motor.castShadow=true;root.add(motor);
 const blade=new T.Mesh(bladeGeometry(r),M.prop);blade.name='rotor blade';blade.position.set(x,.16,z);root.add(blade);
 const blur=new T.Mesh(cached(`blur-${r}`,()=>new T.CircleGeometry(r,40).rotateX(-Math.PI/2)),M.rotorBlur);blur.name='rotor blur';blur.position.set(x,.165,z);root.add(blur);
 return blade;
}
function droneBodyDefs(cargo){
 return cached(`drone-${cargo}`,()=>{
  const k=new Kit(),s=cargo?1.35:1;
  k.box(M.droneShell,.62*s,.24*s,.92*s,[0,.02,0],.11*s);
  k.box(M.carbon,.44*s,.06*s,.55*s,[0,.15*s,-.05],.03);
  k.cyl(M.droneShell,.09,.1,.05,[0,.2*s,-.25*s],undefined,20);
  k.box(M.carbon,.34*s,.12*s,.52*s,[0,-.15*s,-.05],.04);
  if(!cargo){k.box(M.carbon,.06,.12,.06,[0,-.16,.38]);k.sphere(M.carbon,.11,[0,-.27,.4],[1,1,1],20);k.cyl(M.sensor,.055,.055,.04,[0,-.27,.5],[Math.PI/2,0,0],20);}
  else{k.sphere(M.sensor,.07,[0,-.12,.62],[1,.7,1],16);}
  const legY=cargo?-1.2:-.55,legX=cargo?.62:.3;
  for(const sx of [-1,1]){
   for(const sz of [-1,1])k.capsule(M.carbon,.022,Math.abs(legY)-.12,[sx*legX*.92,(legY-.1)/2,sz*.28*s],[0,0,sx*.08]);
   k.capsule(M.carbon,.028,.95*s,[sx*legX,legY,0],[Math.PI/2,0,0]);
  }
  if(cargo){
   k.box(M.kraft,.95,.62,.75,[0,-.72,0],.03);
   for(const sx of [-1,1]){k.box(M.alu,.04,.5,.05,[sx*.5,-.45,0]);k.box(M.alu,.12,.04,.5,[sx*.46,-.7,0]);}
   k.box(M.alu,.9,.04,.08,[0,-.2,0]);
  }
  return k.build();
 });
}
function drone(cargo=false){
 const root=new T.Group();root.name=cargo?'cargo-drone':'survey-drone';root.rotation.order='YXZ';
 for(const m of meshesFrom(droneBodyDefs(cargo),'airframe'))root.add(m);
 const blades=[],span=cargo?1.25:.9,rr=cargo?.62:.46;
 // Front pair first so nav lights sit on the correct side: +x is port (left).
 for(const [x,z] of [[1,1],[-1,1],[-1,-1],[1,-1]])blades.push(rotor(root,x*span,z*span,rr));
 const lights=[[M.navRed,span,span],[M.navGreen,-span,span],[M.strobe,span,-span],[M.strobe,-span,-span]];
 for(const [mat,x,z] of lights){const l=new T.Mesh(cached('nav',()=>new T.SphereGeometry(.035,10,8)),mat);l.name='nav light';l.position.set(x,-.07,z);root.add(l);}
 const strobe=new T.Mesh(cached('strobe',()=>new T.SphereGeometry(.045,10,8)),M.strobe);strobe.name='strobe';strobe.position.set(0,cargo?.25:.19,cargo?.2:.14);root.add(strobe);
 root.rotorBlades=blades;root.userData.strobe=strobe;return root;
}

// ---------------------------------------------------------------- humanoids
// Shared rig for androids and people. Proportions are for a 1.75 m adult and
// scaled per individual; limbs hinge at hip/knee/ankle and shoulder/elbow.
const BODY={thigh:.44,shin:.43,ankle:.085,hipHalf:.1,torsoBase:.07,shoulderY:.44,shoulderHalf:.19,upper:.29,fore:.26,neck:.5};
function personParts(style){
 return cached(`person-${style.hair}`,()=>{
  const pk=(fn)=>{const k=new Kit();fn(k);return k.build()[0].geometry;};
  const torsoProfile=[[0,-.03],[.15,-.03],[.158,.08],[.168,.22],[.18,.33],[.178,.4],[.15,.455],[.09,.492],[.05,.505],[0,.51]].map(([x,y])=>new T.Vector2(x,y));
  const hairShort=k=>{k.add(M.hair,new T.SphereGeometry(.108,22,12,0,Math.PI*2,0,Math.PI*.6),[0,.004,-.012],[-.2,0,0],[.97,1.12,1.08]);};
  const hair=style.hair==='none'?null:pk(k=>{hairShort(k);if(style.hair==='long')k.capsule(M.hair,.085,.16,[0,-.1,-.06],[.12,0,0],[1.1,1,.62]);if(style.hair==='bun')k.sphere(M.hair,.052,[0,.09,-.1],[1,1,1],14);});
  return {
   pelvis:cached('p-pelvis',()=>pk(k=>k.box(M.cloth,.33,.2,.21,[0,.02,0],.08))),
   torso:cached('p-torso',()=>pk(k=>k.add(M.cloth,new T.LatheGeometry(torsoProfile,22),[0,0,0],[0,0,0],[1,1,.64]))),
   neck:cached('p-neck',()=>pk(k=>k.cyl(M.skin,.05,.056,.13,[0,.05,0],undefined,14))),
   head:cached('p-head',()=>pk(k=>{k.sphere(M.skin,.1,[0,0,0],[.93,1.13,1.04],24);k.add(M.skin,new T.ConeGeometry(.017,.05,8),[0,-.01,.108],[Math.PI/2,0,0]);for(const sx of [-1,1])k.sphere(M.skin,.02,[sx*.09,0,-.008],[.35,.9,.7],8);})),
   hair,
   upper:cached('p-upper',()=>pk(k=>k.capsule(M.cloth,.047,.22,[0,-.14,0]))),
   fore:cached('p-fore',()=>pk(k=>k.capsule(M.cloth,.039,.19,[0,-.13,0]))),
   hand:cached('p-hand',()=>pk(k=>k.sphere(M.skin,.046,[0,-.07,.006],[.78,1.6,.62],12))),
   thigh:cached('p-thigh',()=>pk(k=>k.capsule(M.cloth,.076,.33,[0,-.22,0]))),
   shin:cached('p-shin',()=>pk(k=>k.capsule(M.cloth,.055,.34,[0,-.215,0]))),
   shoe:cached('p-shoe',()=>pk(k=>k.box(M.shoe,.105,.085,.27,[0,-.043,.055],.035))),
   backpack:cached('p-pack',()=>pk(k=>{k.box(M.cloth,.28,.38,.13,[0,.27,-.165],.05);k.box(M.cloth,.2,.14,.05,[0,.18,-.235],.02);})),
   blob:cached('p-blob',()=>new T.PlaneGeometry(.9,.9).rotateX(-Math.PI/2)),
  };
 });
}
function androidParts(){
 return cached('android-parts',()=>{
  const part=fn=>{const k=new Kit();fn(k);return k.build();};
  const chestProfile=[[0,.12],[.13,.12],[.16,.2],[.175,.32],[.17,.41],[.14,.46],[.07,.49],[0,.495]].map(([x,y])=>new T.Vector2(x,y));
  return {
   pelvis:part(k=>{k.box(M.androidJoint,.3,.16,.19,[0,.02,0],.06);k.box(M.androidShell,.34,.1,.21,[0,.06,0],.045);}),
   torso:part(k=>{k.cyl(M.androidJoint,.11,.12,.16,[0,.06,0],undefined,20);for(const y of [.02,.07,.12])k.add(M.androidJoint,new T.TorusGeometry(.117,.01,6,24),[0,y,0],[Math.PI/2,0,0]);
    k.add(M.androidShell,new T.LatheGeometry(chestProfile,24),[0,0,0],[0,0,0],[1,1,.66]);k.box(M.androidJoint,.24,.28,.08,[0,.31,-.12],.03);k.box(M.status,.06,.018,.01,[0,.36,.118]);
    for(const sx of [-1,1])k.sphere(M.androidShell,.07,[sx*.19,.44,0],[1,.8,1],16);}),
   neck:part(k=>{k.cyl(M.androidJoint,.042,.05,.12,[0,.05,0],undefined,14);}),
   head:part(k=>{k.sphere(M.androidShell,.112,[0,0,0],[.9,1.08,1],24);k.add(M.visor,new T.SphereGeometry(.114,24,12,Math.PI/2-.95,1.9,Math.PI*.36,Math.PI*.27),[0,0,.002],[0,0,0],[.9,1.08,1]);
    for(const sx of [-1,1])k.cyl(M.androidJoint,.035,.035,.03,[sx*.1,0,-.01],[0,0,Math.PI/2],14);}),
   upper:part(k=>{k.sphere(M.androidJoint,.055,[0,0,0],[1,1,1],14);k.capsule(M.androidShell,.05,.17,[0,-.15,0]);}),
   fore:part(k=>{k.sphere(M.androidJoint,.045,[0,0,0],[1,1,1],12);k.capsule(M.androidShell,.043,.15,[0,-.13,0]);k.cyl(M.androidJoint,.034,.034,.03,[0,-.245,0],undefined,12);}),
   hand:part(k=>{k.box(M.androidJoint,.07,.09,.03,[0,-.05,0],.012);for(let i=0;i<4;i++)k.capsule(M.androidJoint,.009,.06,[-.027+i*.018,-.12,.004]);k.capsule(M.androidJoint,.01,.04,[.042,-.05,.015],[0,0,.5]);}),
   thigh:part(k=>{k.sphere(M.androidJoint,.068,[0,0,0],[1,1,1],14);k.capsule(M.androidShell,.07,.27,[0,-.22,0]);}),
   shin:part(k=>{k.sphere(M.androidJoint,.058,[0,0,0],[1,1,1],14);k.capsule(M.androidShell,.056,.27,[0,-.215,.01]);k.capsule(M.androidJoint,.028,.22,[0,-.2,-.05]);}),
   foot:part(k=>{k.box(M.androidShell,.1,.07,.24,[0,-.045,.05],.03);k.box(M.rubber,.104,.016,.25,[0,-.078,.05],.006);}),
  };
 });
}
function attach(parent,defs,name,tint){const list=Array.isArray(defs)?defs:[{geometry:defs,material:null}];for(const d of list){if(!d.geometry)continue;const m=new T.Mesh(d.geometry,d.material||tint.material);m.name=name;m.castShadow=true;m.receiveShadow=true;if(tint)m.userData.tint=tint.color;parent.add(m);}}
function humanoid(kind,style={}){
 const root=new T.Group();root.name=kind;
 const android=kind==='android',P=android?androidParts():personParts(style);
 const tint=(material,color)=>android?null:{material,color:new T.Color(color)};
 const skin=tint(M.skin,style.skin),shirt=tint(M.cloth,style.shirt),pants=tint(M.cloth,style.pants),shoes=tint(M.shoe,style.shoes),hair=tint(M.hair,style.hairColor);
 const body=new T.Group();body.name='pelvis and articulated torso';root.add(body);attach(body,P.pelvis,'pelvis',pants);
 const torso=new T.Group();torso.position.y=BODY.torsoBase;body.add(torso);attach(torso,P.torso,'torso',shirt);
 if(!android&&style.bag)attach(torso,P.backpack,'backpack',tint(M.cloth,style.bag));
 const headPivot=new T.Group();headPivot.position.y=BODY.neck;torso.add(headPivot);attach(headPivot,P.neck,'neck',skin);
 const head=new T.Group();head.position.y=.14;headPivot.add(head);attach(head,P.head,'head',skin);if(P.hair)attach(head,P.hair,'hair',hair);
 if(!android){const blob=new T.Mesh(P.blob,M.blob);blob.name='foot shadow';blob.position.y=.012;root.add(blob);}
 const rig={body,torso,headPivot,head,legs:[],arms:[]};
 for(const side of [-1,1]){
  const arm=new T.Group();arm.position.set(side*BODY.shoulderHalf,BODY.shoulderY,0);torso.add(arm);attach(arm,P.upper,'upper arm',shirt);
  const elbow=new T.Group();elbow.position.y=-BODY.upper;arm.add(elbow);attach(elbow,P.fore,'forearm',style.shortSleeve?skin:shirt);
  const wrist=new T.Group();wrist.position.y=-BODY.fore;elbow.add(wrist);attach(wrist,P.hand,'hand',skin);
  rig.arms.push({arm,elbow,wrist,side});
  const thigh=new T.Group();thigh.position.set(side*BODY.hipHalf,0,0);body.add(thigh);attach(thigh,P.thigh,'thigh',pants);
  const shin=new T.Group();shin.position.y=-BODY.thigh;thigh.add(shin);attach(shin,P.shin,'shin',pants);
  const foot=new T.Group();foot.position.y=-BODY.shin;shin.add(foot);attach(foot,android?P.foot:P.shoe,'foot',shoes);
  rig.legs.push({thigh,shin,foot,side});
 }
 root.userData.rig=rig;return {root,rig};
}
// Gait from distance walked, so feet do not skate. Joint curves follow
// clinical gait data over one cycle c (heel strike at 0, toe-off near 0.6):
// hip flexion is sinusoidal, the knee shows loading response and a ~60 degree
// swing peak, the ankle rolls heel-flat-toe, and pelvis height is solved each
// frame so the lowest ankle rests on the path (natural bob, no floating).
const bump=(c,mu,sigma)=>{const d=Math.min(Math.abs(c-mu),Math.abs(c-mu+1),Math.abs(c-mu-1))/sigma;return Math.exp(-d*d);};
function poseHumanoid(rig,{phase=0,walk=1,t=0,seed=0,gesture=0,android=false}){
 const idleShift=Math.sin(t*.31+seed*5.1),cycle=phase/(Math.PI*2);
 let low=0;
 for(const leg of rig.legs){
  const c=((cycle+(leg.side===1?0:.5))%1+1)%1;
  const θw=.08+.34*Math.cos(c*Math.PI*2);
  const κw=.04+.26*bump(c,.14,.1)+(android?.86:1.0)*bump(c,.72,.155);
  const αw=-.12*bump(c,0,.06)+.36*bump(c,.6,.065)-.06*bump(c,.83,.08);
  const bent=(leg.side===1?1:-1)*idleShift>0?Math.abs(idleShift):0;
  const θs=.02+.03*bent,κs=.03+.2*bent,αs=.04*bent;
  const θ=θw*walk+θs*(1-walk),κ=κw*walk+κs*(1-walk),α=αw*walk+αs*(1-walk);
  leg.thigh.rotation.x=-θ;leg.shin.rotation.x=κ;leg.foot.rotation.x=α+θ-κ;
  leg.drop=BODY.thigh*Math.cos(θ)+BODY.shin*Math.cos(θ-κ);low=Math.max(low,leg.drop);
 }
 rig.body.position.y=low+BODY.ankle;
 const cL=Math.cos(cycle*Math.PI*2);
 rig.body.rotation.y=-.07*cL*walk;rig.torso.rotation.y=.11*cL*walk;rig.body.rotation.z=.022*Math.sin(cycle*Math.PI*2)*walk+.02*idleShift*(1-walk);
 rig.torso.rotation.x=.045*walk+.012*Math.sin(t*1.7+seed)*(1-walk);
 rig.headPivot.rotation.y=-.04*cL*walk+Math.sin(t*.23+seed*3.3)*(walk?.12:.32);rig.head.rotation.x=-.04*walk;
 for(const {arm,elbow,wrist,side} of rig.arms){
  const c=cycle+(side===1?0:.5),swing=(android?.22:.3)*Math.cos(c*Math.PI*2);
  const g=side===1?gesture:0;
  arm.rotation.x=swing*walk+(.03+.02*Math.sin(t*.5+seed))*(1-walk)-.35*g;arm.rotation.z=side*(.07+.03*(1-walk));
  elbow.rotation.x=-(.2+.3*Math.max(0,-Math.cos(c*Math.PI*2)))*walk-(.16+1.05*g)*(1-walk);wrist.rotation.x=-.1*g;
 }
}

// ---------------------------------------------------------------- routes
// Arc-length routes. Open roads become a continuous loop: out on the right-hand
// lane, a U-turn, back on the other lane and a U-turn home, so an agent never
// flips sides, reverses heading instantly or teleports at a path end.
const _a=new T.Vector3(),_b=new T.Vector3(),_r=new T.Vector3();
const rightOf=(d,out)=>out.set(-d.z,0,d.x).normalize();
class Route{
 constructor(curve,{center=0,half=0,dy=0,reverse=false}={}){
  this.curve=curve;this.L=curve.getLength();this.center=center;this.half=Math.max(half,curve.closed?0:.3);this.dy=dy;this.reverse=reverse;this.closed=!!curve.closed;
  this.total=this.closed?this.L:2*this.L+2*Math.PI*this.half;
 }
 sample(s,pos,dir){
  const {L,center:c,half:h,curve}=this;s=((s%this.total)+this.total)%this.total;
  if(this.closed){const u=this.reverse?1-s/L:s/L;curve.getPointAt(u,pos);curve.getTangentAt(u,dir);pos.addScaledVector(rightOf(dir,_r),this.reverse?c-h:c+h);if(this.reverse)dir.negate();}
  else if(s<L){const u=s/L;curve.getPointAt(u,pos);curve.getTangentAt(u,dir);pos.addScaledVector(rightOf(dir,_r),c+h);}
  else if(s<L+Math.PI*h){const θ=(s-L)/h;curve.getPointAt(1,_a);curve.getTangentAt(1,_b);rightOf(_b,_r);pos.copy(_a).addScaledVector(_r,c+h*Math.cos(θ)).addScaledVector(_b,h*Math.sin(θ));dir.copy(_b).multiplyScalar(Math.cos(θ)).addScaledVector(_r,-Math.sin(θ));}
  else if(s<2*L+Math.PI*h){const u=1-(s-L-Math.PI*h)/L;curve.getPointAt(u,pos);curve.getTangentAt(u,dir);pos.addScaledVector(rightOf(dir,_r),c-h);dir.negate();}
  else{const θ=(s-2*L-Math.PI*h)/h;curve.getPointAt(0,_a);curve.getTangentAt(0,_b);rightOf(_b,_r);pos.copy(_a).addScaledVector(_r,c-h*Math.cos(θ)).addScaledVector(_b,-h*Math.sin(θ));dir.copy(_b).multiplyScalar(-Math.cos(θ)).addScaledVector(_r,Math.sin(θ));}
  pos.y+=this.dy;dir.y=0;return dir.normalize();
 }
 yaw(s){this.sample(s,_a,_b);return Math.atan2(_b.x,_b.z);}
}
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

// ---------------------------------------------------------------- instancing
class Instancer{
 constructor(root){this.root=root;this.groups=new Map();this.meshes=[];}
 adopt(agent){
  agent.object.traverse(mesh=>{
   if(!mesh.isMesh)return;const key=mesh.geometry.uuid+'|'+mesh.material.uuid;
   if(!this.groups.has(key))this.groups.set(key,{geometry:mesh.geometry,material:mesh.material,name:mesh.name,sources:[],tinted:false});
   const g=this.groups.get(key);g.sources.push({mesh,agent});if(mesh.userData.tint)g.tinted=true;
   mesh.visible=false;// articulation source; drawn by the shared batch below
  });
 }
 build(){
  for(const g of this.groups.values()){
   const mesh=new T.InstancedMesh(g.geometry,g.material,g.sources.length);mesh.name=`fleet batch · ${g.name} · ${g.material.name}`;
   mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=!g.material.transparent;mesh.receiveShadow=!g.material.transparent;
   if(g.tinted){for(let i=0;i<g.sources.length;i++)mesh.setColorAt(i,g.sources[i].mesh.userData.tint||new T.Color(1,1,1));mesh.instanceColor.setUsage(T.DynamicDrawUsage);}
   mesh.count=0;g.mesh=mesh;this.meshes.push(mesh);this.root.add(mesh);
  }
 }
 sync(){
  for(const g of this.groups.values()){
   const {mesh}=g;let n=0;
   for(const s of g.sources){if(!s.agent.shown||s.mesh.userData.hidden)continue;mesh.setMatrixAt(n,s.mesh.matrixWorld);if(g.tinted)mesh.setColorAt(n,s.mesh.userData.tint);n++;}
   mesh.count=n;mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,n*16);mesh.instanceMatrix.needsUpdate=true;
   if(g.tinted){mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,n*3);mesh.instanceColor.needsUpdate=true;}
  }
 }
}

// ---------------------------------------------------------------- population
const SKIN=[0xf2cfae,0xe3b48f,0xcd9670,0xb27552,0x8e5a3c,0x6b4029,0x4e2d1d,0xd9a47c];
const HAIR=[0x17110d,0x2b1d14,0x4a3222,0x6d4c2e,0xa47f4f,0xc8a36a,0x8d8c88,0x5e2518];
const SHIRT=[0x223047,0xe9e7e1,0x8fb3d4,0x5d6b3f,0x6e2635,0x3a3d42,0xc9b89a,0xc1932d,0x1f6d6a,0x16171a,0xa84a3a,0x7b8794];
const PANTS=[0x27344d,0x37425a,0xa99470,0x1b1c1f,0x55595f,0x2c3a2c,0x6b5a45,0xd5d0c4];
const SHOES=[0xeeeeea,0x1a1a1c,0x5a3a25,0x7c8288,0x2d3b52];
function styleFor(i){
 const pick=(a,k)=>a[(i*k+(i>>2))%a.length];
 const hairStyles=['short','short','long','bun','none','short','long'];
 return {height:1.6+((i*37)%31)/100,build:.93+((i*13)%15)/100,skin:pick(SKIN,5),hairColor:pick(HAIR,3),hair:hairStyles[(i*5+1)%hairStyles.length],shirt:pick(SHIRT,7),pants:pick(PANTS,5),shoes:pick(SHOES,3),shortSleeve:i%3===0,bag:i%4===1?[0x1c1f24,0x3b4a3a,0x7a3b2a,0x2e4a6b][(i>>2)%4]:null};
}

export function createFleets(roads){
 const root=new T.Group();root.name='autonomous-fleets';const agents=[];const instancer=new Instancer(root);
 const validRoads=(roads||[]).filter(r=>r.curve&&r.curve.getLength()>1);
 const counts={shuttles:0,freight:0,androids:0,drones:0,people:0};
 const add=(object,agent)=>{object.userData.proxy=true;object.matrixAutoUpdate=true;root.add(object);const a={object,shown:true,cull:Infinity,...agent};agents.push(a);return a;};

 // Road vehicles: campus speed 7 m/s (25 km/h) for every class, so nothing overtakes through another.
 for(let i=0;i<38&&validRoads.length;i++){
  const road=validRoads[i%validRoads.length],freight=i%5===0,object=vehicle(freight),lane=Math.min(road.width*.25,3);
  const route=road.curve.closed?new Route(road.curve,{half:lane,reverse:i%2===1,dy:-.06}):new Route(road.curve,{half:lane,dy:-.06});
  counts[freight?'freight':'shuttles']++;
  add(object,{kind:'vehicle',route,s0:(i/38)*route.total,speed:7,metersPerSecond:7,cull:1600});
 }
 // Androids walk the left-hand sidewalk, pedestrians the right-hand one.
 for(let i=0;i<24&&validRoads.length;i++){
  const road=validRoads[i%validRoads.length],a=humanoid('android');counts.androids++;
  const route=new Route(road.curve,{center:-(road.width/2+1.55),half:.42,dy:-.1,reverse:i%2===1});
  add(a.root,{kind:'humanoid',android:true,rig:a.rig,route,s0:((i*.37)%1)*route.total,speed:1.25,stride:1.3,seed:i*.13,cull:260});
 }
 let person=0;
 const personAgent=(route,s0,speed,extra={})=>{const style=styleFor(person++);const p=humanoid('pedestrian',style);const h=style.height/1.75;p.root.scale.set(h*style.build,h,h*(style.build*.5+.5));counts.people++;
  return add(p.root,{kind:'humanoid',rig:p.rig,route,s0,speed,stride:1.33*h,seed:person*.71,cull:240,...extra});};
 validRoads.forEach((road,r)=>{
  const route=new Route(road.curve,{center:road.width/2+1.65,half:.4,dy:-.1});
  for(let j=0;j<6;j++)personAgent(route,((j+r*.37)/6)*route.total,1.15+((r*6+j)*7%9)*.05);
 });
 for(const f of FACILITIES){
  const front=f.z+f.d/2+4.2,y=.2;
  const facade=new T.LineCurve3(new T.Vector3(f.x-f.w*.38,y,front+2.8),new T.Vector3(f.x+f.w*.38,y,front+2.8));
  personAgent(new Route(facade,{half:.4}),(f.id*.29%1)*2*f.w*.76,1.1+(f.id%5)*.06);
  const group=[2,1,3][f.id%3],cx=f.x-f.w*.23,cz=front+1.8;
  for(let j=0;j<group;j++){
   const a=group===1?0:j/group*Math.PI*2+f.id,rad=group===1?0:.55;
   const px=cx+Math.sin(a)*rad,pz=cz+Math.cos(a)*rad,yaw=group===1?Math.PI+(f.id%4-1.5)*.4:a+Math.PI;
   personAgent(null,0,0,{standing:{x:px,y,z:pz,yaw},gesture:j===0&&group>1});
  }
 }
 // Drones: closed survey and delivery loops between the synergy spires.
 for(let i=0;i<16;i++){
  const points=SPIRES.filter((_,j)=>j%2===i%2).map(([x,z])=>new T.Vector3(x,52+(i%3)*7,z));
  const curve=new T.CatmullRomCurve3(points,true),object=drone(i%4===0);counts.drones++;
  const route=new Route(curve,{});
  add(object,{kind:'drone',route,s0:(i/16)*route.total,speed:14,flight:i});
 }
 for(const a of agents)instancer.adopt(a);instancer.build();

 // Proxies are posed explicitly in update(); skip them in the scene-wide
 // matrix pass so articulation is computed once per frame, not twice.
 root.updateMatrixWorld=function(force){
  if(this.matrixAutoUpdate)this.updateMatrix();
  if(this.matrixWorldNeedsUpdate||force){if(this.parent)this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);else this.matrixWorld.copy(this.matrix);this.matrixWorldNeedsUpdate=false;force=true;}
  for(const c of this.children)if(!c.userData.proxy)c.updateMatrixWorld(force);else if(force&&!this.userData.posed)c.updateMatrixWorld(true);
 };
 // Camera for distance LOD: explicit argument, else captured from the last
 // perspective render (shadow passes use orthographic cameras and are ignored).
 const eye=new T.Vector3(0,720,1100);let eyeKnown=false;
 if(instancer.meshes[0])instancer.meshes[0].onBeforeRender=(r,s,camera)=>{if(camera.isPerspectiveCamera){eye.setFromMatrixPosition(camera.matrixWorld);eyeKnown=true;}};

 const pos=new T.Vector3(),dir=new T.Vector3(),lastEye=new T.Vector3(Infinity,0,0);let lastT=NaN,lastKnown=false;
 function pose(a,t){
  const o=a.object;
  if(a.standing){const st=a.standing;o.position.set(st.x,st.y,st.z);o.rotation.set(0,st.yaw,0);
   const g=a.gesture?smooth(.55,.8,Math.sin(t*.37+a.seed*4)):0;poseHumanoid(a.rig,{walk:0,t,seed:a.seed,gesture:g});return;}
  const travelled=a.speed*t,s=a.s0+travelled;
  a.route.sample(s,pos,dir);o.position.copy(pos);
  const yaw=Math.atan2(dir.x,dir.z);
  if(a.kind==='vehicle'){o.rotation.set(0,yaw,0);const roll=travelled/o.userData.wheelRadius;for(const w of o.userData.wheels)w.rotation.x=roll;}
  else if(a.kind==='humanoid'){o.rotation.set(0,yaw,0);poseHumanoid(a.rig,{phase:s/a.stride*Math.PI*2,walk:1,t,seed:a.seed,android:a.android});}
  else{
   // Coordinated turn: bank from yaw rate (tan φ = v·ω/g), nose-down cruise pitch.
   const δ=6,ω=wrapAngle(a.route.yaw(s+δ)-a.route.yaw(s-δ))/(2*δ)*a.speed;
   const bank=T.MathUtils.clamp(Math.atan(a.speed*ω/9.81),-.42,.42);
   o.position.y+=Math.sin(t*.9+a.flight)*.35;o.rotation.set(.07+Math.sin(t*.6+a.flight)*.012,yaw,-bank);
   o.rotorBlades.forEach((blade,i)=>{blade.rotation.y=t*(58+i*3.7)*(i%2?1:-1);});
   o.userData.strobe.userData.hidden=((t+a.flight*.137)%1.2)>.08;
  }
 }
 return {root,counts,instanced:instancer.meshes,update(t,cameraPosition){
  if(!Number.isFinite(t))return;
  if(cameraPosition){eye.copy(cameraPosition);eyeKnown=true;}
  // Reduced motion freezes the clock: re-pose only when the view moves enough to change LOD.
  if(t===lastT&&eyeKnown===lastKnown&&eye.distanceToSquared(lastEye)<16)return;
  lastT=t;lastKnown=eyeKnown;lastEye.copy(eye);
  root.userData.posed=true;
  for(const a of agents){
   const o=a.object;
   if(a.cull<Infinity&&eyeKnown){const p=a.standing||o.position;if(!a.standing&&a.route){a.route.sample(a.s0+a.speed*t,pos,dir);}const q=a.standing?p:pos;a.shown=(q.x-eye.x)**2+(q.y-eye.y)**2+(q.z-eye.z)**2<a.cull*a.cull;}
   if(!a.shown&&eyeKnown)continue;
   pose(a,t);o.updateMatrix();o.matrixWorld.copy(o.matrix);for(const c of o.children)c.updateMatrixWorld(true);
  }
  instancer.sync();
 }};
}
