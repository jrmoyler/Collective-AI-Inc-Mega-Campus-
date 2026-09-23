import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {FACILITIES} from './data.js';

// Blender-authored meter-scale bench, bollard and planter prefabs plus
// procedural plaza luminaires, wayfinding totems, litter bins and planting.
// Every part is one InstancedMesh campus-wide; fine detail only within 180 m.
export const FURNITURE_RANGE=180;

// ---------------------------------------------------------------- surfaces
// DataTextures (no DOM) so the same code runs in Node tests and the browser.
function dataTexture(size,fn,{srgb=true}={}){
 const data=new Uint8Array(size*size*4);let seed=40427;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const v=fn(x/size,y/size,rand);const o=(y*size+x)*4;data[o]=v[0];data[o+1]=v[1];data[o+2]=v[2];data[o+3]=255;}
 const tex=new T.DataTexture(data,size,size);tex.needsUpdate=true;if(srgb)tex.colorSpace=T.SRGBColorSpace;
 tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=4;return tex;
}
const TEX={
 // Ash: straight open grain along U with growth-ring drift and pores.
 grain:dataTexture(128,(u,v,r)=>{const ring=Math.sin((v*38+Math.sin(u*6.3)*1.6+Math.sin(u*17)*.25)*Math.PI);const g=200+ring*22+(r()-.5)*18-(r()<.02?40:0);return [g,g,g];}),
 powder:dataTexture(64,(u,v,r)=>{const g=128+(r()-.5)*70;return [g,g,g];},{srgb:false}),
 concrete:dataTexture(128,(u,v,r)=>{let g=208+(r()-.5)*26;if(r()<.05)g-=34;if(r()<.02)g+=26;return [g,g*.985,g*.95];}),
 soil:dataTexture(64,(u,v,r)=>{const g=90+(r()-.5)*90;return [g,g*.8,g*.6];}),
 leaf:dataTexture(64,(u,v,r)=>{const n=r();return [52+n*50,98+n*70,40+n*28];}),
};
TEX.grain.repeat.set(1,1);
const std=p=>new T.MeshStandardMaterial({envMapIntensity:1,...p});
const MAT={
 powder:std({name:'Powder coated warm graphite',color:0x3d4247,metalness:.35,roughness:.52,bumpMap:TEX.powder,bumpScale:.4}),
 stainless:std({name:'Brushed stainless',color:0xb9bec2,metalness:1,roughness:.24}),
 ivory:std({name:'Enamel ivory sign face',color:0xefece4,roughness:.38}),
 ink:std({name:'Screen-printed graphite ink',color:0x2b3136,roughness:.6}),
 gold:std({name:'Anodised gold band',color:0xd4a843,metalness:.9,roughness:.3}),
 teal:std({name:'Status teal',color:0x06302a,emissive:0x00d9b5,emissiveIntensity:.9,roughness:.3}),
 diffuser:std({name:'Luminaire opal diffuser',color:0xfff3df,emissive:0xffcf8a,emissiveIntensity:.45,roughness:.35}),
 concrete:std({name:'Warm sand precast concrete',color:0xd6cfbf,map:TEX.concrete,bumpMap:TEX.concrete,bumpScale:.6,roughness:.9}),
 dark:std({name:'Bin aperture',color:0x0d0f10,roughness:.9}),
 leaf:std({name:'Planting foliage',color:0xffffff,map:TEX.leaf,roughness:.85,side:T.DoubleSide}),
 grass:std({name:'Ornamental grass',color:0x8a9a5a,roughness:.8,side:T.DoubleSide}),
};
// Upgrade the plain Blender colours to physically textured surfaces in place.
function upgrade(material){
 const name=material.name||'';
 if(name.startsWith('Oiled ash slat')){
  const m=new T.MeshPhysicalMaterial({name,color:material.color.clone().multiplyScalar(1.12),map:TEX.grain,bumpMap:TEX.grain,bumpScale:.8,roughness:.58,clearcoat:.18,clearcoatRoughness:.45,envMapIntensity:.9});return m;
 }
 if(name==='Powder coated warm graphite')return MAT.powder;
 if(name==='Stainless fixing')return MAT.stainless;
 if(name==='Warm sand precast concrete')return MAT.concrete;
 if(name==='Fine dark planting soil')return std({name,color:0xffffff,map:TEX.soil,roughness:1});
 if(name==='Frosted path optic'){const m=material.clone();m.emissiveIntensity=Math.min(m.emissiveIntensity||1,.8);return m;}
 return material;
}
// Metre-scale box-projected UVs so grain and aggregate never stretch.
function metricUV(geometry,scale=1){
 const g=geometry.clone(),p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));let u,v;
  if(ay>=ax&&ay>=az){u=p.getX(i);v=p.getZ(i);}else if(ax>=az){u=p.getZ(i);v=p.getY(i);}else{u=p.getX(i);v=p.getY(i);}
  uv[i*2]=u*scale;uv[i*2+1]=v*scale;}
 g.setAttribute('uv',new T.BufferAttribute(uv,2));return g;
}

// ---------------------------------------------------------------- procedural prefabs
function bake(geometry,p=[0,0,0],r=[0,0,0],s=[1,1,1]){
 const g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
 g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...r)),new T.Vector3(...s)));
 for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
 if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 g.clearGroups();return g;
}
function prefab(name,build){
 const parts=new Map(),add=(mat,geometry,p,r,s)=>{if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(bake(geometry,p,r,s));};
 const box=(mat,w,h,d,p,rad=0,r)=>add(mat,rad>0?new RoundedBoxGeometry(w,h,d,2,Math.min(rad,w/2-.001,h/2-.001,d/2-.001)):new T.BoxGeometry(w,h,d),p,r);
 const cyl=(mat,rt,rb,h,p,n=20,r)=>add(mat,new T.CylinderGeometry(rt,rb,h,n),p,r);
 build({add,box,cyl});
 const root=new T.Group();root.name=name;
 for(const [mat,gs] of parts){const g=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());const m=new T.Mesh(mat===MAT.concrete?metricUV(g,1.4):g,mat);m.name=`${name} — ${mat.name}`;root.add(m);}
 return root;
}
function proceduralPrefabs(){
 const totem=prefab('Wayfinding',({box})=>{
  box(MAT.concrete,.78,.12,.34,[0,.06,0],.02);
  box(MAT.powder,.56,2.15,.16,[0,1.195,0],.03);
  box(MAT.ivory,.46,1.5,.012,[0,1.33,.083],.004);
  box(MAT.gold,.56,.05,.165,[0,2.25,0],.01);
  box(MAT.ink,.3,.06,.004,[-.05,1.93,.09]);
  for(let i=0;i<7;i++)box(MAT.ink,.34-(i%3)*.07,.022,.004,[-.04-(i%3)*.035,1.74-i*.13,.09]);
  for(let i=0;i<7;i++)box(MAT.ink,.035,.035,.004,[.17,1.74-i*.13,.09]);
  box(MAT.teal,.4,.012,.006,[0,.62,.083]);
 });
 const luminaire=prefab('Plaza luminaire',({box,cyl})=>{
  cyl(MAT.powder,.16,.18,.05,[0,.025,0],24);
  cyl(MAT.stainless,.045,.05,.08,[0,.09,0],6);
  cyl(MAT.powder,.042,.058,4.3,[0,2.2,0],20);
  box(MAT.powder,.12,.09,.78,[0,4.33,.3],.03);
  box(MAT.diffuser,.09,.012,.62,[0,4.284,.34],.004);
 });
 const bin=prefab('Litter bin',({cyl,add})=>{
  cyl(MAT.powder,.26,.24,.86,[0,.43,0],28);
  cyl(MAT.stainless,.275,.275,.07,[0,.89,0],28);
  cyl(MAT.dark,.19,.19,.012,[0,.93,0],24);
  add(MAT.stainless,new T.TorusGeometry(.265,.012,6,28),[0,.2,0],[Math.PI/2,0,0]);
 });
 // Clipped evergreen mounds with a tuft of grass in each planter.
 const planting=prefab('Planting',({add})=>{
  const mound=(x,z,s)=>{const g=new T.IcosahedronGeometry(.2,2),p=g.attributes.position;
   for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),n=1+.16*Math.sin(px*31+pz*17)+.1*Math.sin(py*43);p.setXYZ(i,px*n,Math.max(-.05,py*n*.8),pz*n);}
   g.computeVertexNormals();add(MAT.leaf,g,[x,.78,z],[0,x*3,0],[s,s,s]);};
  mound(-.18,-.12,1.15);mound(.2,-.05,1);mound(.02,.2,.9);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;add(MAT.grass,new T.ConeGeometry(.02,.45+(i%3)*.1,3,1,true),[Math.cos(a)*.3,.88,Math.sin(a)*.3],[Math.cos(a)*.35,0,-Math.sin(a)*.35]);}
 });
 return {Wayfinding:totem,Luminaire:luminaire,Bin:bin,Planting:planting};
}

export function createStreetFurniture(asset){
 const root=new T.Group();root.name='Blender architectural street furniture';
 asset.updateMatrixWorld(true);
 const extras=proceduralPrefabs();
 const transform=new T.Object3D(),matrix=new T.Matrix4(),batches=[];
 const placements={Bench:[],Bollard:[],Planter:[],Planting:[],Wayfinding:[],Luminaire:[],Bin:[]};
 for(const f of FACILITIES){
  const front=f.z+f.d/2+4.2;
  placements.Bench.push([f.x-f.w*.23,.2,front,Math.PI]);
  placements.Bin.push([f.x-f.w*.23+1.75,.2,front,0]);
  placements.Wayfinding.push([f.x+6.5,.2,front+.2,0]);
  for(const side of [-1,1]){
   placements.Planter.push([f.x+side*(f.w*.23+2.1),.2,front,0]);
   placements.Planting.push([f.x+side*(f.w*.23+2.1),.2,front,side*.9+f.id]);
   placements.Bollard.push([f.x+side*4,.2,front+1.2,0]);
   placements.Luminaire.push([f.x+side*(f.w*.38+1.5),.2,front+4.1,side>0?Math.PI:0]);
  }
 }
 for(const [name,points] of Object.entries(placements)){
  const source=extras[name]||asset.getObjectByName(name);
  if(!source)throw new Error(`Street furniture asset missing ${name}`);
  source.updateMatrixWorld(true);
  source.traverse(part=>{
   if(!part.isMesh)return;
   const material=upgrade(part.material);
   const geometry=material.map&&!extras[name]?metricUV(part.geometry,material.name.startsWith('Oiled ash')?1.1:1.4):part.geometry;
   const instances=new T.InstancedMesh(geometry,material,points.length);
   instances.name=part.name;instances.castShadow=!material.emissive||material.emissiveIntensity<.5||name!=='Luminaire';instances.receiveShadow=true;
   points.forEach(([x,y,z,angle],i)=>{
    transform.position.set(x,y,z);transform.rotation.set(0,angle,0);transform.updateMatrix();
    matrix.multiplyMatrices(transform.matrix,part.matrixWorld);instances.setMatrixAt(i,matrix);
   });
   instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();root.add(instances);
   batches.push({instances,points,localMatrix:part.matrixWorld.clone(),prefab:name});
  });
 }
 root.userData.placements=Object.fromEntries(Object.entries(placements).map(([k,v])=>[k,v.length]));
 // Fine joinery is only visible on approach. Compact visible instances instead
 // of submitting every furnishing and its shadow while touring one building.
 const last=new T.Vector3(Infinity,Infinity,Infinity);
 root.userData.update=cameraPosition=>{
  if(last.distanceToSquared(cameraPosition)<36)return;
  last.copy(cameraPosition);
  for(const {instances,points,localMatrix} of batches){
   let count=0;
   for(const [x,y,z,angle] of points){
    if((x-last.x)**2+(y-last.y)**2+(z-last.z)**2>FURNITURE_RANGE**2)continue;
    transform.position.set(x,y,z);transform.rotation.set(0,angle,0);transform.updateMatrix();
    matrix.multiplyMatrices(transform.matrix,localMatrix);instances.setMatrixAt(count++,matrix);
   }
   instances.count=count;instances.visible=count>0;instances.instanceMatrix.needsUpdate=true;
   if(count)instances.computeBoundingSphere();
  }
 };
 // Luminaires are dimmed diffusers by day and brighten at dusk (see DESIGN.md).
 root.userData.setDusk=dusk=>{MAT.diffuser.emissiveIntensity=dusk?2.2:.45;MAT.teal.emissiveIntensity=dusk?1.4:.9;};
 return root;
}
