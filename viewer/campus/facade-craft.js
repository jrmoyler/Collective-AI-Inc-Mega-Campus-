import * as T from 'three';
import {materials} from './geometry.js';
const leafMaterial=materials.leaf.clone();leafMaterial.side=T.DoubleSide;

// Open extruded sections omit faces buried in the building's existing slabs.
function profile(batch,mat,x,y,z,length,yaw,section){
 const vertices=[];
 for(let i=0;i<section.length-1;i++){
  const [ay,az]=section[i],[by,bz]=section[i+1],l=-length/2,r=length/2;
  vertices.push(l,ay,az,r,ay,az,r,by,bz,l,ay,az,r,by,bz,l,by,bz);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();batch.add(g,mat,x,y,z,1,1,1,yaw);g.dispose();
}

// Construction-scale details follow the actual edge of each individual wing.
// They do not invent storeys, move footprints, or fill reference courtyards.
export function facadeEdge(batch,a,c,y,height,{center=[0,0],skin='dark'}={}){
 if(height<2.5)return; // balustrades are not occupied floor facades
 const dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz);
 if(length<.08)return;
 const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,yaw=-Math.atan2(dz,dx);
 let nx=-dz/length,nz=dx/length;
 if(nx*(x-center[0])+nz*(z-center[1])<0){nx=-nx;nz=-nz;}
 const edge=(mat,elevation,width,depth,offset)=>batch.box(mat,x+nx*offset,elevation,z+nz*offset,length,width,depth,yaw);
 // Full-depth soffit produces the shadow; thin metal finishes use single
 // surfaces, avoiding six hidden box faces for every millimetre-thick strip.
 const panel=(mat,elevation,verticalSize,offset)=>batch.pane(mat,x+nx*offset,elevation,z+nz*offset,length,verticalSize,yaw+(nx*Math.sin(yaw)+nz*Math.cos(yaw)<0?Math.PI:0));
 profile(batch,skin,x,y+.17,z,length,yaw+(nx*Math.sin(yaw)+nz*Math.cos(yaw)<0?Math.PI:0),[[-.11,-.14],[-.11,.20],[.11,.20],[.11,-.14]]);
 panel('steel',y+.295,.03,.208);
 panel('dark',y+height-.38,.08,.18);
 panel('copper',y+height-.27,.055,.19);
 profile(batch,'stone',x,y+height-.46,z,length,yaw+(nx*Math.sin(yaw)+nz*Math.cos(yaw)<0?Math.PI:0),[[-.045,-1.35],[-.045,0],[.045,0],[.045,-1.35]]);
 // Horizontal diffuser faces downward; glazing remains genuinely transparent.
 const light=new T.PlaneGeometry(length,.065);light.rotateX(Math.PI/2);
 batch.add(light,'warm',x-nx*.84,y+height-.515,z-nz*.84,1,1,1,yaw);light.dispose();

}

export function roofCoping(batch,points,y,{center=[0,0],skin='dark'}={}){
 for(let i=0;i<points.length;i++){
  const a=points[i],c=points[(i+1)%points.length],dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz);
  if(length<.08)continue;
  const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,yaw=-Math.atan2(dz,dx);
  let nx=-dz/length,nz=dx/length;
  if(nx*(x-center[0])+nz*(z-center[1])<0){nx=-nx;nz=-nz;}
  profile(batch,skin,x,y,z,length,yaw,[[0,.16],[.42,.16],[.42,-.16],[0,-.16]]);
  profile(batch,'steel',x,y+.435,z,length,yaw,[[-.0225,.21],[.0225,.21],[.0225,-.21],[-.0225,-.21]]);
  // Coping expansion joints at a plausible fabrication interval, not a texture.
  for(let t=4.8;t<length;t+=4.8){const joint=new T.PlaneGeometry(.018,.43);joint.rotateX(-Math.PI/2);batch.add(joint,'dark',a[0]+dx*t/length,y+.461,a[1]+dz*t/length,1,1,1,yaw);joint.dispose();}
  if(length>12){
   batch.pane('dark',x+nx*.177,y+.14,z+nz*.177,.36,.12,yaw+(nx*Math.sin(yaw)+nz*Math.cos(yaw)<0?Math.PI:0));
   batch.box('steel',x+nx*.26,y+.07,z+nz*.26,.42,.03,.20,yaw);
  }
 }
}

// Small roof trees have open branching and folded leaves instead of solid balls.
const leaves=new T.BufferGeometry(),positions=[];
for(let i=0;i<36;i++){
 const a=i*2.399963,ring=.23+(.5*(i%5)/4),y=.72+(i%9)/9*.8;
 const center=new T.Vector3(Math.cos(a)*ring,y,Math.sin(a)*ring);
 const q=new T.Quaternion().setFromEuler(new T.Euler(.25+(i%3)*.18,a,.12));
 const p=[[-.16,0,0],[0,.045,-.25],[.16,0,0],[0,-.025,.25]].map(v=>new T.Vector3(...v).applyQuaternion(q).add(center));
 for(const j of [0,1,2,0,2,3])positions.push(...p[j].toArray());
}
leaves.setAttribute('position',new T.Float32BufferAttribute(positions,3));leaves.computeVertexNormals();
const wood=new T.CylinderGeometry(.025,.05,1,5);
export function roofTree(batch,x,y,z,scale=1){
 batch.add(wood,'trunk',x,y+.6*scale,z,scale,1.2*scale,scale);
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5,base=new T.Vector3(x,y+scale*.7,z),tip=new T.Vector3(x+Math.cos(a)*scale*.55,y+scale*1.23,z+Math.sin(a)*scale*.55);
  const g=wood.clone(),delta=tip.clone().sub(base);
  g.scale(.48,delta.length(),.48);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...base.add(tip).multiplyScalar(.5).toArray());batch.add(g,'trunk');g.dispose();
 }
 batch.add(leaves,leafMaterial,x,y,z,scale,scale,scale,(x+z)*.31);
}


// Visible occupied bays are inferred construction, kept inside each actual
// convex wing. High-bay manufacturing halls are excluded by their callers.
export function occupiedBays(batch,points,y,height){
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
 if(Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))<14)return;
 const center=[xs.reduce((a,b)=>a+b,0)/xs.length,zs.reduce((a,b)=>a+b,0)/zs.length];
 function inside(x,z){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
 const partitionH=Math.min(3.5,height-.9);
 if(partitionH<2.5)return;
 for(let i=0;i<points.length;i++){
  const a=points[i],c=points[(i+1)%points.length],dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz);
  if(length<10)continue;
  let nx=-dz/length,nz=dx/length;const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;
  if(nx*(center[0]-mx)+nz*(center[1]-mz)<0){nx=-nx;nz=-nz;}
  if(nz>-.7)continue; // furnish the observed front cutaway; avoid duplicate perimeter bays
  const bays=Math.floor(length/10),width=length/bays,tx=dx/length,tz=dz/length,yaw=-Math.atan2(dz,dx);
  for(let j=1;j<bays;j++){
   const x=a[0]+tx*width*j,z=a[1]+tz*width*j;
   if(!inside(x+nx*5.4,z+nz*5.4))continue;
   // Perpendicular room division, bottom plinth and a structural column.
   batch.pane('glazing',x+nx*2.9,y+partitionH/2,z+nz*2.9,4.8,partitionH,yaw+Math.PI/2);
   batch.pane('dark',x+nx*2.9,y+.12,z+nz*2.9,4.8,.24,yaw+Math.PI/2);
   batch.box('steel',x+nx*.65,y+height/2,z+nz*.65,.20,height-.25,.20);
   batch.box('steel',x+nx*5.25,y+partitionH/2,z+nz*5.25,.065,partitionH,.065);
   batch.pane('steel',x+nx*2.9,y+partitionH,z+nz*2.9,4.8,.065,yaw+Math.PI/2);
   // Ceiling services belong to the bay, with a clear floor-level entrance.
   profile(batch,'stone',x+nx*3+tx*width*.45,y+partitionH+.22,z+nz*3+tz*width*.45,width*.68,yaw,[[-.05,-1.9],[-.05,1.9],[.05,1.9]]);
   const lamp=new T.PlaneGeometry(width*.54,.09);lamp.rotateX(Math.PI/2);batch.add(lamp,'warm',x+nx*3+tx*width*.45,y+partitionH+.155,z+nz*3+tz*width*.45,1,1,1,yaw);lamp.dispose();
  }
 }
}
