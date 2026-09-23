// @ts-nocheck
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {seeded} from './geometry.js';

// Procedural botanical kit. Everything is painted/generated at start-up (no
// downloads) and works in Node as well as the browser (DataTexture only).
//  - A 2x2 foliage atlas of alpha-tested leaf clusters: broadleaf, conifer
//    needle spray, cherry blossom, small shrub leaves.
//  - Species templates with real branching wood and clustered leaf cards whose
//    normals are bent toward the crown volume (no flat-card or lollipop look).
//  - One foliage material per species with vertex-shader wind and alpha
//    coverage preserved across mip levels so canopies stay dense from 1.2 km.

export const ATLAS_CELL={broadleaf:0,conifer:1,blossom:2,shrub:3};
const ATLAS=512,CELL=256;

function paintAtlas(){
 const S=ATLAS,data=new Uint8Array(S*S*4),random=seeded(40413);
 const sums=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
 const put=(cell,x,y,r,g,b)=>{
  x=Math.round(x);y=Math.round(y);
  if(x<2||y<2||x>=CELL-2||y>=CELL-2)return;
  const px=(cell%2)*CELL+x,py=Math.floor(cell/2)*CELL+y,o=(py*S+px)*4;
  data[o]=Math.max(0,Math.min(255,r));data[o+1]=Math.max(0,Math.min(255,g));data[o+2]=Math.max(0,Math.min(255,b));data[o+3]=255;
 };
 // Pointed-ellipse leaf with midrib, edge darkening and a lit tip.
 const leaf=(cell,cx,cy,len,wid,ang,[r,g,b])=>{
  const c=Math.cos(ang),s=Math.sin(ang),R=Math.ceil(Math.max(len,wid))+1;
  for(let y=Math.floor(cy-R);y<=cy+R;y++)for(let x=Math.floor(cx-R);x<=cx+R;x++){
   const dx=x-cx,dy=y-cy,u=(dx*c+dy*s)/len,v=(-dx*s+dy*c)/wid;
   if(u<-1||u>1)continue;const half=Math.pow(1-u*u,.7);if(Math.abs(v)>half)continue;
   const k=.8+.22*(1-Math.abs(v)/half)+.1*u-(Math.abs(v)<.09?.12:0);
   put(cell,x,y,r*k,g*k,b*k);
  }
 };
 const twig=(cell,x0,y0,x1,y1,w,[r,g,b])=>{
  const n=Math.ceil(Math.hypot(x1-x0,y1-y0));
  for(let i=0;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,ww=w*(1-t*.6);
   for(let oy=-ww;oy<=ww;oy++)for(let ox=-ww;ox<=ww;ox++)if(ox*ox+oy*oy<=ww*ww)put(cell,x+ox,y+oy,r,g,b);}
 };
 const jitter=(base,amt)=>base.map(v=>v+(random()-.5)*amt);
 const C=CELL/2;
 // 0 broadleaf cluster: twigs radiating from the lower centre, ~140 leaves.
 for(let i=0;i<7;i++){const a=-Math.PI/2+(i/6-.5)*2.4;twig(0,C,CELL-20,C+Math.cos(a)*100,C+Math.sin(a)*90+10,2.2,[72,58,44]);}
 for(let i=0;i<150;i++){
  const a=random()*Math.PI*2,rr=Math.sqrt(random())*104,x=C+Math.cos(a)*rr,y=C+Math.sin(a)*rr*.92;
  const tone=random(),base=tone<.2?[104,132,56]:tone<.75?[74,102,42]:[50,76,32];
  leaf(0,x,y,11+random()*9,5+random()*3,a+(random()-.5)*1.4,jitter(base,18));
 }
 // 1 conifer spray: a central twig with dense paired needles.
 twig(1,C,CELL-8,C,10,2.4,[70,52,40]);
 for(let j=0;j<9;j++){const y=40+j*22,side=j%2?1:-1;twig(1,C,y+16,C+side*(70-j*3),y-8,1.4,[66,50,38]);}
 for(let i=0;i<900;i++){
  const t=random(),y=12+t*(CELL-24),spread=(1-Math.abs(t-.55)*1.1)*92,x=C+(random()*2-1)*spread;
  const ang=(x<C?-1:1)*(.9+random()*.5)-Math.PI/2;
  const tone=random(),base=tone<.3?[52,78,58]:tone<.8?[40,64,44]:[30,50,36];
  leaf(1,x,y,8+random()*4,1.4,ang,jitter(base,10));
 }
 // 2 cherry blossom: five-petal flowers over a few young leaves.
 for(let i=0;i<5;i++){const a=-Math.PI/2+(i/4-.5)*2.2;twig(2,C,CELL-18,C+Math.cos(a)*96,C+Math.sin(a)*80+8,2,[70,46,44]);}
 for(let i=0;i<24;i++){const a=random()*Math.PI*2,rr=Math.sqrt(random())*100;leaf(2,C+Math.cos(a)*rr,C+Math.sin(a)*rr,10,4.5,random()*6.28,jitter([92,118,52],16));}
 for(let i=0;i<340;i++){
  const a=random()*Math.PI*2,rr=Math.sqrt(random())*106,x=C+Math.cos(a)*rr,y=C+Math.sin(a)*rr*.94;
  const tone=random(),petal=tone<.35?[244,196,210]:tone<.8?[232,160,184]:[212,128,160],rot=random()*6.28,size=3.4+random()*1.6;
  for(let p=0;p<5;p++){const pa=rot+p*1.2566;leaf(2,x+Math.cos(pa)*size*.8,y+Math.sin(pa)*size*.8,size,size*.72,pa,jitter(petal,14));}
  put(2,x,y,236,214,150);
 }
 // 3 shrub: small glossy leaves in a dense mound.
 for(let i=0;i<260;i++){
  const a=random()*Math.PI*2,rr=Math.sqrt(random())*110,x=C+Math.cos(a)*rr,y=C+Math.sin(a)*rr;
  const tone=random(),base=tone<.25?[92,120,54]:tone<.8?[62,92,42]:[44,68,32];
  leaf(3,x,y,7+random()*5,3.4+random()*1.6,random()*6.28,jitter(base,16));
 }
 // Dilate colour into transparent texels so filtering never produces black
 // fringes, then store average leaf colour for the rest.
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const o=(y*S+x)*4;if(data[o+3]){const cell=(y>=CELL?2:0)+(x>=CELL?1:0);sums[cell][0]+=data[o];sums[cell][1]+=data[o+1];sums[cell][2]+=data[o+2];sums[cell][3]++;}}
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const o=(y*S+x)*4;if(!data[o+3]){const s=sums[(y>=CELL?2:0)+(x>=CELL?1:0)],n=Math.max(1,s[3]);data[o]=s[0]/n;data[o+1]=s[1]/n;data[o+2]=s[2]/n;}}
 const tex=new T.DataTexture(data,S,S);
 tex.colorSpace=T.SRGBColorSpace;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.anisotropy=4;tex.needsUpdate=true;
 return tex;
}
function paintBark(){
 const S=128,data=new Uint8Array(S*S*4),random=seeded(7311);
 const ridge=new Float32Array(S);for(let x=0;x<S;x++)ridge[x]=Math.sin(x*.55)*.5+Math.sin(x*1.7+1)*.25;
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  const v=78+ridge[(x+Math.floor(Math.sin(y*.09)*3)+S)%S]*26+(random()-.5)*26,o=(y*S+x)*4;
  data[o]=v;data[o+1]=v*.9;data[o+2]=v*.78;data[o+3]=255;
 }
 const tex=new T.DataTexture(data,S,S);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.needsUpdate=true;
 return tex;
}
let atlas=null,bark=null;
export function foliageAtlas(){return atlas||(atlas=paintAtlas());}
export function barkTexture(){return bark||(bark=paintBark());}

// ---------------------------------------------------------------------------
// Species templates. Geometry is in "unit tree" space: height 1, trunk base at
// the origin. Instances scale x/z by crown width and y by height in metres.
const UP=new T.Vector3(0,1,0);
class TreeKit{
 constructor(seed,crown){this.random=seeded(seed);this.wood=[];this.pos=[];this.nrm=[];this.uv=[];this.col=[];this.crown=crown;}
 limb(a,b,r0,r1,sides=5){
  const d=b.clone().sub(a),len=d.length();if(len<1e-4)return;
  const g=new T.CylinderGeometry(r1,r0,len,sides,1,true);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(UP,d.normalize()));
  g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
  // Bark UVs repeat with limb length so fine twigs are not smeared.
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*len*6);
  this.wood.push(g);
 }
 // A leaf card: `axis` is the card's up (texture v) direction, `n` its facing.
 card(center,size,n,axis,cell){
  n=n.clone().normalize();axis=axis.clone().sub(n.clone().multiplyScalar(axis.dot(n))).normalize();
  if(!Number.isFinite(axis.x)||axis.lengthSq()<1e-6)axis=new T.Vector3(1,0,0);
  const side=new T.Vector3().crossVectors(axis,n).normalize(),h=size/2;
  const cu=(cell%2)*.5,cv=Math.floor(cell/2)*.5,inset=.006;
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  const {center:cc,radii,normal}=this.crown;
  const verts=corners.map(([sx,sy])=>center.clone().addScaledVector(side,sx*h).addScaledVector(axis,sy*h));
  // Painted rows grow downward from the twig base; the card's -axis end holds the base.
  const uvs=corners.map(([sx,sy])=>[cu+inset+(sx*.5+.5)*(.5-2*inset),cv+inset+(.5-sy*.5)*(.5-2*inset)]);
  for(const id of [0,1,2,0,2,3]){
   const v=verts[id];
   const rel=new T.Vector3((v.x-cc.x)/radii.x,(v.y-cc.y)/radii.y,(v.z-cc.z)/radii.z);
   const radial=normal?normal(v):rel.clone().normalize();
   const bent=radial.clone().multiplyScalar(.78).addScaledVector(n.dot(radial)<0?n.clone().negate():n,.22).normalize();
   // Self-shadowing: inner and lower foliage is darker than the lit shell.
   const depth=Math.min(1,rel.length()),lift=T.MathUtils.clamp((v.y-cc.y)/radii.y*.5+.5,0,1);
   const ao=T.MathUtils.clamp(.38+.42*depth+.28*lift,.3,1.06);
   this.pos.push(v.x,v.y,v.z);this.nrm.push(bent.x,bent.y,bent.z);this.uv.push(...uvs[id]);this.col.push(ao,ao,ao);
  }
 }
 finish(){
  const leaves=new T.BufferGeometry();
  leaves.setAttribute('position',new T.Float32BufferAttribute(this.pos,3));
  leaves.setAttribute('normal',new T.Float32BufferAttribute(this.nrm,3));
  leaves.setAttribute('uv',new T.Float32BufferAttribute(this.uv,2));
  leaves.setAttribute('color',new T.Float32BufferAttribute(this.col,3));
  leaves.computeBoundingSphere();
  const wood=this.wood.length?mergeGeometries(this.wood):null;this.wood.forEach(g=>g.dispose());
  if(wood)wood.computeBoundingSphere();
  return {leaves,wood,crown:this.crown};
 }
 randomDir(biasUp=0){const r=this.random,v=new T.Vector3(r()*2-1,r()*2-1+biasUp,r()*2-1);return v.lengthSq()<1e-4?UP.clone():v.normalize();}
}

// Recursive broadleaf branching; leaf clusters sit on terminal twigs.
// `lite` builds the distant-forest variant: one branching level fewer and
// fewer, larger clusters (roughly a third of the triangles).
function broadleaf(seed,{limbs,trunkTop,crownY,crownR,crownH,cell=ATLAS_CELL.broadleaf,cardSize=.2,spread=1,lite=false}){
 const k=new TreeKit(seed,{center:new T.Vector3(0,crownY,0),radii:new T.Vector3(crownR,crownH,crownR)});const r=k.random;
 const top=new T.Vector3((r()-.5)*.03,trunkTop,(r()-.5)*.03);
 k.limb(new T.Vector3(0,-.02,0),new T.Vector3(0,trunkTop*.45,0),.05,.04);
 k.limb(new T.Vector3(0,trunkTop*.45,0),top,.04,.032);
 const tips=[];
 const grow=(from,dir,len,rad,depth)=>{
  const bend=dir.clone().add(new T.Vector3((r()-.5)*.5,.25+r()*.2,(r()-.5)*.5)).normalize();
  const mid=from.clone().addScaledVector(dir,len*.5),end=mid.clone().addScaledVector(bend,len*.5);
  // Keep terminal twigs inside the crown envelope.
  const rel=new T.Vector3(end.x/crownR,(end.y-crownY)/crownH,end.z/crownR);if(rel.length()>1.02)end.sub(k.crown.center).multiplyScalar(1.0/rel.length()).add(k.crown.center);
  // Terminal twigs are carried by the leaf-card texture itself.
  if(depth===0){tips.push(end);tips.push(mid.clone().lerp(end,.4));return;}
  const sides=depth===2?5:4;k.limb(from,mid,rad,rad*.8,sides);k.limb(mid,end,rad*.8,rad*.6,sides);
  const n=depth===2?2:3;
  for(let i=0;i<n;i++){
   const az=r()*Math.PI*2,d=bend.clone().add(new T.Vector3(Math.cos(az)*.7*spread,.35+r()*.3,Math.sin(az)*.7*spread)).normalize();
   grow(end,d,len*(.55+r()*.15),rad*.55,depth-1);
  }
 };
 for(let i=0;i<limbs;i++){
  const az=i/limbs*Math.PI*2+r()*.6,el=.55+r()*.35;
  const dir=new T.Vector3(Math.cos(az)*Math.sin(el)*spread,Math.cos(el),Math.sin(az)*Math.sin(el)*spread).normalize();
  grow(top.clone().add(new T.Vector3(0,-r()*.06,0)),dir,crownR*.62,.03,lite?1:2);
 }
 grow(top,new T.Vector3(0,1,0),crownH*.55,.026,lite?0:1);
 for(const tip of tips){
  const n=lite?2:2+Math.floor(r()*2);
  for(let j=0;j<n;j++){
   const c=tip.clone().add(new T.Vector3((r()-.5)*.13,(r()-.4)*.1,(r()-.5)*.13));
   const out=c.clone().sub(k.crown.center).normalize();
   k.card(c,cardSize*(lite?1.7:1)*(1+r()*.5),out.add(k.randomDir(.4).multiplyScalar(.9)),k.randomDir(1),cell);
  }
 }
 // Shell fill so the crown reads as foliage mass from every side.
 for(let j=0;j<(lite?9:18);j++){
  const d=k.randomDir(.3),s=.62+r()*.38,c=new T.Vector3(d.x*crownR*s,crownY+d.y*crownH*s,d.z*crownR*s);
  k.card(c,cardSize*(lite?1.6:1.05)*(1+r()*.4),d.clone().add(k.randomDir().multiplyScalar(.5)),k.randomDir(1),cell);
 }
 return k.finish();
}
function conifer(seed,lite=false){
 const crownY=.5,k=new TreeKit(seed,{center:new T.Vector3(0,crownY,0),radii:new T.Vector3(.27,.5,.27),
  normal:v=>new T.Vector3(v.x,.34*Math.max(.2,1-v.y)+.18,v.z).normalize()});const r=k.random;
 k.limb(new T.Vector3(0,-.02,0),new T.Vector3(0,.55,0),.032,.02);k.limb(new T.Vector3(0,.55,0),new T.Vector3(0,1,0),.02,.004);
 const whorls=lite?8:13;
 for(let w=0;w<whorls;w++){
  const y=.14+w/(whorls-1)*.8,len=.04+.25*Math.pow(1-(y-.12)/.9,1.05),count=5+(w%2);
  for(let i=0;i<count;i++){
   const az=i/count*Math.PI*2+w*.7+r()*.3,dir=new T.Vector3(Math.cos(az),-.18-r()*.12,Math.sin(az)).normalize();
   const base=new T.Vector3(0,y,0),end=base.clone().addScaledVector(dir,len);
   // Upper branches are hidden inside the needle mass; only lower limbs get wood.
   if(!lite&&len>.15)k.limb(base,end,.009,.003,3);
   const cards=lite?1:len>.2?3:len>.1?2:1;
   for(let c=0;c<cards;c++){
    const t=.35+c/cards*.7,p=base.clone().lerp(end,t);p.y+=.012;
    const n=new T.Vector3(dir.x*.35,1,dir.z*.35).add(k.randomDir().multiplyScalar(.25));
    k.card(p,Math.max(.08,len*(lite?1.15:cards===1?.9:.75)),n,dir,ATLAS_CELL.conifer);
    if(lite)k.card(p.clone().add(new T.Vector3(0,-.02,0)),Math.max(.07,len*.8),new T.Vector3(dir.x,.25,dir.z),new T.Vector3(0,-1,0).add(dir),ATLAS_CELL.conifer);
    // A drooping side spray fills the silhouette seen at ground level.
    if(!lite&&c===cards-1&&len>.14)k.card(p.clone().add(new T.Vector3(0,-.03,0)),Math.max(.06,len*.55),new T.Vector3(dir.x,.2,dir.z),new T.Vector3(0,-1,0).add(dir),ATLAS_CELL.conifer);
   }
  }
 }
 for(let j=0;j<3;j++)k.card(new T.Vector3(0,.93+j*.025,0),.09,new T.Vector3(Math.cos(j*2.1),0,Math.sin(j*2.1)),UP,ATLAS_CELL.conifer);
 return k.finish();
}
function shrub(seed){
 const k=new TreeKit(seed,{center:new T.Vector3(0,.3,0),radii:new T.Vector3(.55,.42,.55)});const r=k.random;
 for(let j=0;j<30;j++){
  const d=k.randomDir(.8);if(d.y<-.1)d.y=-d.y*.3;
  const s=.55+r()*.45,c=new T.Vector3(d.x*.55*s,.3+d.y*.42*s,d.z*.55*s);
  k.card(c,.36+r()*.14,d.clone().add(k.randomDir().multiplyScalar(.4)),k.randomDir(1),ATLAS_CELL.shrub);
 }
 return k.finish();
}

let templates=null;
export function speciesTemplates(){
 if(templates)return templates;
 templates={
  // Oak/maple type: open four-limb structure, broad rounded crown.
  oak:broadleaf(1201,{limbs:4,trunkTop:.34,crownY:.62,crownR:.4,crownH:.33}),
  // Lime/plane type: taller trunk, three limbs, slightly narrower crown.
  lime:broadleaf(3307,{limbs:3,trunkTop:.4,crownY:.66,crownR:.33,crownH:.32,cardSize:.19}),
  // Flowering cherry: short trunk, wide vase of spreading limbs, pink clusters.
  cherry:broadleaf(5519,{limbs:5,trunkTop:.26,crownY:.6,crownR:.54,crownH:.28,cell:ATLAS_CELL.blossom,cardSize:.24,spread:1.35}),
  // Columnar hornbeam/poplar used along streets.
  column:broadleaf(7741,{limbs:4,trunkTop:.18,crownY:.58,crownR:.17,crownH:.42,cardSize:.13,spread:.35}),
  conifer:conifer(9907),
  // Distant forest-buffer variants.
  oakLite:broadleaf(1201,{limbs:4,trunkTop:.34,crownY:.62,crownR:.4,crownH:.33,lite:true}),
  limeLite:broadleaf(3307,{limbs:3,trunkTop:.4,crownY:.66,crownR:.33,crownH:.32,cardSize:.19,lite:true}),
  cherryLite:broadleaf(5519,{limbs:5,trunkTop:.26,crownY:.6,crownR:.54,crownH:.28,cell:ATLAS_CELL.blossom,cardSize:.24,spread:1.35,lite:true}),
  coniferLite:conifer(9907,true),
  shrub:shrub(1133),
 };
 return templates;
}
// Crown radius as a fraction of tree height, used for planting clearance.
export const CROWN_RATIO={oak:.4,lime:.33,cherry:.54,column:.17,conifer:.27,shrub:.55,oakLite:.4,limeLite:.33,cherryLite:.54,coniferLite:.27};

// Backwards-compatible single-crown accessor.
export function botanicalGeometry(){const t=speciesTemplates().oak;return {leaves:t.leaves,wood:t.wood};}

export function barkMaterial(color=0x6b5a4a){
 return new T.MeshStandardMaterial({color,map:barkTexture(),roughness:.95,envMapIntensity:.6});
}

// Foliage: alpha-tested atlas, wind sway, leaf flutter, mip-stable coverage.
// `kind` may be a species name or the legacy boolean pink flag.
export function botanicalMaterial(kind,wind){
 const pink=kind===true||kind==='cherry';
 const m=new T.MeshStandardMaterial({
  color:0xffffff,map:foliageAtlas(),alphaTest:.5,side:T.DoubleSide,vertexColors:true,
  roughness:.94,metalness:0,envMapIntensity:.28,
 });
 m.name=`foliage-${kind===true?'cherry':kind===false?'broadleaf':kind}`;
 const windUniform=wind||{value:0};
 m.onBeforeCompile=s=>{
  s.uniforms.botanicalTime=windUniform;
  s.vertexShader='uniform float botanicalTime;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 botanicalOrigin = vec3(0.0);
   #ifdef USE_INSTANCING
    botanicalOrigin = instanceMatrix[3].xyz;
   #endif
   float windWeight = smoothstep(0.2, 1.0, position.y);
   float windPhase = botanicalTime*.9 + botanicalOrigin.x*.035 + botanicalOrigin.z*.041;
   float gust = .6 + .4*sin(botanicalTime*.23 + botanicalOrigin.x*.004);
   transformed.x += (sin(windPhase) * .012 + sin(windPhase*2.7 + position.y*9.0) * .004) * windWeight * gust;
   transformed.z += cos(windPhase*.8 + 1.3) * .008 * windWeight * gust;
   transformed += normal * sin(botanicalTime*6.0 + position.x*41.0 + position.z*37.0) * .0035 * windWeight;`);
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   #ifdef USE_MAP
    // Preserve alpha-tested coverage in lower mips (distant canopies stay full).
    vec2 foliageTexel = vMapUv * 512.0;
    vec2 foliageDx = dFdx(foliageTexel), foliageDy = dFdy(foliageTexel);
    float foliageMip = max(0.0, 0.5 * log2(max(dot(foliageDx, foliageDx), dot(foliageDy, foliageDy))));
    diffuseColor.a *= 1.0 + foliageMip * 0.28;
   #endif`);
  // Normals are authored toward the crown volume; undo the double-sided flip
  // so back faces are lit like the canopy rather than as dark card backs.
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
   #ifdef DOUBLE_SIDED
    normal *= faceDirection;
   #endif`);
  // Thin leaves transmit light: lift the unlit side slightly with the sky tint.
  s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
   reflectedLight.indirectDiffuse += diffuseColor.rgb * ${pink?'0.04':'0.015'};`);
 };
 m.customProgramCacheKey=()=>'botanical-v2-'+(pink?'blossom':'leaf');
 return m;
}
