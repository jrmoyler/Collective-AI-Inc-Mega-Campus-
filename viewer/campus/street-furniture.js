import * as T from 'three';
import {FACILITIES} from './data.js';

// Blender-authored meter-scale assets. Each material is instanced campus-wide;
// this keeps 175 placed furnishings to 13 draws instead of hundreds of clones.
export function createStreetFurniture(asset){
 const root=new T.Group();root.name='Blender architectural street furniture';
 asset.updateMatrixWorld(true);
 const transform=new T.Object3D(),matrix=new T.Matrix4(),batches=[];
 const placements={Bench:[],Bollard:[],Planter:[]};
 for(const f of FACILITIES){
  const front=f.z+f.d/2+4.2;
  placements.Bench.push([f.x-f.w*.23,.2,front,Math.PI]);
  for(const side of [-1,1]){
   placements.Planter.push([f.x+side*(f.w*.23+2.1),.2,front,0]);
   placements.Bollard.push([f.x+side*4,.2,front+1.2,0]);
  }
 }
 for(const [name,points] of Object.entries(placements)){
  const source=asset.getObjectByName(name);
  if(!source)throw new Error(`Street furniture asset missing ${name}`);
  source.traverse(part=>{
   if(!part.isMesh)return;
   const instances=new T.InstancedMesh(part.geometry,part.material,points.length);
   instances.name=part.name;instances.castShadow=true;instances.receiveShadow=true;
   points.forEach(([x,y,z,angle],i)=>{
    transform.position.set(x,y,z);transform.rotation.set(0,angle,0);transform.updateMatrix();
    matrix.multiplyMatrices(transform.matrix,part.matrixWorld);instances.setMatrixAt(i,matrix);
   });
   instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();root.add(instances);
   batches.push({instances,points,localMatrix:part.matrixWorld.clone()});
  });
 }
 // Fine joinery is only visible on approach. Compact visible instances instead
 // of submitting every furnishing and its shadow while touring one building.
 const last=new T.Vector3(Infinity,Infinity,Infinity);
 root.userData.update=cameraPosition=>{
  if(last.distanceToSquared(cameraPosition)<36)return;
  last.copy(cameraPosition);
  for(const {instances,points,localMatrix} of batches){
   let count=0;
   for(const [x,y,z,angle] of points){
    if((x-last.x)**2+(y-last.y)**2+(z-last.z)**2>180**2)continue;
    transform.position.set(x,y,z);transform.rotation.set(0,angle,0);transform.updateMatrix();
    matrix.multiplyMatrices(transform.matrix,localMatrix);instances.setMatrixAt(count++,matrix);
   }
   instances.count=count;instances.visible=count>0;instances.instanceMatrix.needsUpdate=true;
   if(count)instances.computeBoundingSphere();
  }
 };
 return root;
}
