// Roof plant compounds for every facility, placed only on roof area the
// authored envelope leaves genuinely free.
//
// The aerial atlas reads mostly as roofs. Occupied buildings of this size
// carry air handlers, exhaust stacks and a louvred screen; most envelopes
// had none, so roofs read as bare extrusions. Rather than guess per facility,
// this module samples the finished envelope into a 1 m height field and keeps
// only cells whose highest surface is an exposed, opaque, upward-facing roof
// with nothing else (copings, rails, solar, planters, signage) rising inside
// the cell. The plant is sized to the largest such rectangle, inset one cell,
// so it can never intersect authored architecture or overhang a roof edge.
// The new geometry is merged into the facility's existing steel / graphite /
// stone meshes, so the campus view gains no draw calls.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Batch,cylinder,materials} from './geometry.js';
import {ROOF_PLAN} from './arch-roof-plan.js';

export const ROOF_CELL=1;
const MIN_ROOF=8, UP=.97, TOLERANCE=.06;
// Exposed finishes that are not a structural roof deck.
const EXCLUDED=new Set(['leaf','grass','solar','water','track','pink','trunk','path','glazing','warm','warmWin','cyan','violet','magenta','kinetic','gold']
 .map(key=>materials[key]));
const glows=material=>material.emissive&&Math.max(material.emissive.r,material.emissive.g,material.emissive.b)>.02;
const roofable=material=>material&&!material.transparent&&!EXCLUDED.has(material)&&!glows(material);

// Height field of the facility in its local frame (call before positioning).
const IDENTITY=new T.Matrix4();
export function roofHeightField(root,cell=ROOF_CELL,minHeight=MIN_ROOF){
 root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(root);
 const x0=Math.floor(box.min.x/cell)*cell,z0=Math.floor(box.min.z/cell)*cell;
 const nx=Math.max(1,Math.ceil((box.max.x-x0)/cell)),nz=Math.max(1,Math.ceil((box.max.z-z0)/cell));
 const top=new Float32Array(nx*nz).fill(-Infinity),ceiling=new Float32Array(nx*nz).fill(-Infinity),ok=new Uint8Array(nx*nz);
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),n=new T.Vector3();
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible||mesh.isInstancedMesh)return;
  const position=mesh.geometry.attributes.position,index=mesh.geometry.index,matrix=mesh.matrixWorld;
  const allowed=roofable(Array.isArray(mesh.material)?null:mesh.material),identity=matrix.equals(IDENTITY);
  const count=index?index.count:position.count;
  for(let t=0;t<count;t+=3){
   const ia=index?index.getX(t):t,ib=index?index.getX(t+1):t+1,ic=index?index.getX(t+2):t+2;
   a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);
   if(!identity){a.applyMatrix4(matrix);b.applyMatrix4(matrix);c.applyMatrix4(matrix);}
   // Nothing wholly below the lowest plant roof can rise above one.
   if(a.y<minHeight&&b.y<minHeight&&c.y<minHeight)continue;
   const minX=Math.min(a.x,b.x,c.x),maxX=Math.max(a.x,b.x,c.x),minZ=Math.min(a.z,b.z,c.z),maxZ=Math.max(a.z,b.z,c.z),maxY=Math.max(a.y,b.y,c.y);
   const i0=Math.max(0,Math.floor((minX-x0)/cell)),i1=Math.min(nx-1,Math.floor((maxX-x0)/cell)),j0=Math.max(0,Math.floor((minZ-z0)/cell)),j1=Math.min(nz-1,Math.floor((maxZ-z0)/cell));
   // Conservative: anything inside a cell may rise to the triangle's top.
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*nx+i;if(maxY>ceiling[k])ceiling[k]=maxY;}
   n.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a));const len=n.length();if(len<1e-9)continue;n.divideScalar(len);
   if(Math.abs(n.y)<.2)continue;
   // Exact surface at cell centres for the surfaces seen from above.
   const det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-9)continue;
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const px=x0+(i+.5)*cell,pz=z0+(j+.5)*cell;
    const l1=((b.z-c.z)*(px-c.x)+(c.x-b.x)*(pz-c.z))/det,l2=((c.z-a.z)*(px-c.x)+(a.x-c.x)*(pz-c.z))/det,l3=1-l1-l2;
    if(l1<-1e-6||l2<-1e-6||l3<-1e-6)continue;
    const y=l1*a.y+l2*b.y+l3*c.y,k=j*nx+i;
    if(y>top[k]+1e-4){top[k]=y;ok[k]=allowed&&n.y>UP?1:0;}
   }
  }
 });
 return {x0,z0,nx,nz,cell,top,ceiling,ok};
}

// Largest free axis-aligned rectangle on one roof level (histogram method).
export function freeRoofRectangles(field,{minHeight=MIN_ROOF}={}){
 const {nx,nz,top,ceiling,ok}=field,levels=new Map();
 for(let k=0;k<top.length;k++){
  if(!ok[k]||top[k]<minHeight||ceiling[k]-top[k]>TOLERANCE)continue;
  const level=Math.round(top[k]*10)/10;levels.set(level,(levels.get(level)||0)+1);
 }
 const out=[];
 for(const [level,cells] of levels){
  if(cells<16)continue;
  const heights=new Int32Array(nx);let best=null;
  for(let j=0;j<nz;j++){
   for(let i=0;i<nx;i++){const k=j*nx+i;heights[i]=ok[k]&&Math.abs(top[k]-level)<=TOLERANCE&&ceiling[k]-top[k]<=TOLERANCE?heights[i]+1:0;}
   const stack=[];
   for(let i=0;i<=nx;i++){
    const h=i<nx?heights[i]:0;let start=i;
    while(stack.length&&stack[stack.length-1][1]>=h){const [s,sh]=stack.pop();const area=sh*(i-s);if(sh>0&&(!best||area>best.area))best={area,i0:s,i1:i-1,j0:j-sh+1,j1:j};start=s;}
    stack.push([start,h]);
   }
  }
  if(best){
   let y=-Infinity;for(let j=best.j0;j<=best.j1;j++)for(let i=best.i0;i<=best.i1;i++)y=Math.max(y,top[j*nx+i]);
   out.push({...best,y,width:(best.i1-best.i0+1)*field.cell,depth:(best.j1-best.j0+1)*field.cell,x:field.x0+(best.i0+best.i1+1)/2*field.cell,z:field.z0+(best.j0+best.j1+1)/2*field.cell});
  }
 }
 return out.sort((p,q)=>q.area*(1+q.y/60)-p.area*(1+p.y/60));
}

// One mechanical compound: housekeeping pad, louvred screen with posts,
// packaged air handlers with fan discs, a supply duct and exhaust stacks.
export function plantCompound(b,{x,z,y,width,depth},seed=1){
 const w=Math.min(width-2*ROOF_CELL,16),d=Math.min(depth-2*ROOF_CELL,10.5);
 if(w<4.5||d<3.5)return false;
 const long=w>=d,L=long?w:d,S=long?d:w;
 // Local axes: u along the long side.
 const at=(u,v)=>long?[x+u,z+v]:[x+v,z+u];
 const box=(mat,u,yy,v,lu,ly,lv)=>{const [px,pz]=at(u,v);b.box(mat,px,yy,pz,long?lu:lv,ly,long?lv:lu);};
 const pad=.16;box('stone',0,y+pad/2,0,L,pad,S);
 const base=y+pad,screen=Math.min(2.6,1.6+S*.08);
 // Screen: posts at <= 3 m, five open louvre blades per side.
 for(const side of [-1,1]){
  for(let k=0;k<5;k++){const yy=base+.35+k*(screen-.45)/4;box('dark',0,yy,side*(S/2-.1),L,.07,.2);box('dark',side*(L/2-.1),yy,0,.2,.07,S-.24);}
  const posts=Math.max(2,Math.ceil(L/3));for(let k=0;k<=posts;k++)box('dark',-L/2+.08+k*(L-.16)/posts,base+screen/2,side*(S/2-.1),.14,screen,.14);
  const sp=Math.max(1,Math.ceil(S/3));for(let k=1;k<sp;k++)box('dark',side*(L/2-.1),base+screen/2,-S/2+k*S/sp,.14,screen,.14);
 }
 // Air handlers along the long axis with discharge fans on top.
 const units=Math.max(1,Math.min(3,Math.floor((L-1.2)/4.2))),uw=Math.min(3.6,(L-1.2)/units-.7),ud=Math.min(2.4,S-1.6),uh=Math.min(1.9,screen-.25);
 for(let k=0;k<units;k++){
  const u=-L/2+.6+(k+.5)*(L-1.2)/units;
  box('dark',u,base+.09,0,uw+.2,.18,ud+.2);
  box('steel',u,base+.18+uh/2,0,uw,uh,ud);
  // Access-panel seams on the long face.
  for(const s of [-1,1])for(let q=1;q<3;q++)box('dark',u-uw/2+q*uw/3,base+.18+uh/2,s*(ud/2+.012),.035,uh*.86,.025);
  const fans=uw>2.6?2:1;
  for(let q=0;q<fans;q++){const fu=u+(fans===2?(q-.5)*uw*.48:0),[px,pz]=at(fu,0),r=Math.min(.62,ud*.3);
   cylinder(b,'dark',px,base+.18+uh+.11,pz,r,.22,r,14);cylinder(b,'steel',px,base+.18+uh+.24,pz,r*.22,.06,r*.22,8);}
 }
 // Supply duct runs out of the last unit and turns down into the roof.
 const du=L/2-.45,dv=S/2-.55;box('steel',du-.5,base+.18+uh*.55,dv-.55,1,.55,.55);box('steel',du,base+.18+uh*.3,dv-.55,.55,uh*.6+.2,.55);
 // Exhaust stacks at the corner opposite the duct.
 for(let k=0;k<2;k++){const [px,pz]=at(-L/2+.7+k*.95,-S/2+.7);cylinder(b,'steel',px,base+1.45,pz,.2,2.9,.2,10);cylinder(b,'dark',px,base+2.95,pz,.26,.1,.26,10);}
 return true;
}

// Merge a finished batch into existing meshes that already use each material.
function absorb(root,group){
 const homes=new Map();
 root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!homes.has(o.material)&&o.geometry.index&&o.geometry.attributes.uv&&Object.keys(o.geometry.attributes).length===3)homes.set(o.material,o);});
 const inverse=new T.Matrix4();let absorbed=0;
 for(const mesh of [...group.children]){
  const home=homes.get(mesh.material);if(!home)continue;
  inverse.copy(home.matrixWorld).invert();mesh.geometry.applyMatrix4(inverse);
  const merged=mergeGeometries([home.geometry,mesh.geometry],false);if(!merged)continue;
  home.geometry.dispose();mesh.geometry.dispose();home.geometry=merged;group.remove(mesh);absorbed++;
 }
 return absorbed;
}

// Placement is planned offline against the eager envelope, approach detail
// included (see tests/arch-roofscape.test.js), so runtime startup only builds
// boxes: no height-field sampling on the phone, and deferred near detail can
// never land inside a compound. planRoofscape regenerates the table.
// Entrance canopies and pavilion porches sit below 8 m or outside the
// canonical footprint; plant belongs on occupied roofs only.
export function planRoofscape(root,{w=Infinity,d=Infinity,limit=2}={}){
 const plan=[];
 for(const roof of freeRoofRectangles(roofHeightField(root))){
  if(plan.length>=limit)break;
  if(Math.abs(roof.x)+roof.width/2>w/2+1||Math.abs(roof.z)+roof.depth/2>d/2+1)continue;
  if(plan.length&&roof.width*roof.depth<80)continue;
  if(!plantCompound(new Batch(),roof))continue;
  plan.push({x:+roof.x.toFixed(2),z:+roof.z.toFixed(2),y:+roof.y.toFixed(3),width:roof.width,depth:roof.depth});
 }
 return plan;
}

export function addRoofscape(root,f,plan=ROOF_PLAN[f.key]||[]){
 const b=new Batch();let placed=0;
 for(const roof of plan)if(plantCompound(b,roof,f.id))placed++;
 root.userData.roofPlant={placed};
 if(!placed)return root.userData.roofPlant;
 const group=b.finish(f.key+'-roof-plant');
 root.updateMatrixWorld(true);
 absorb(root,group);
 if(group.children.length)root.add(group);
 return root.userData.roofPlant;
}
