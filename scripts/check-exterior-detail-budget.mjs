// Resident geometry and distance visibility only; never a GPU/phone benchmark.
import fs from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {Vector3} from 'three';
import {FACILITIES} from '../viewer/campus/data.js';
import {createFacility} from '../viewer/campus/buildings.js';
import {configureFacilityDetails} from '../viewer/campus/facility-details.js';
globalThis.document={createElement:()=>createCanvas(512,96)};
function measure(root){
 const details=[];root.traverse(object=>{if(object.userData.nearDetail)details.push(object);});
 const geometries=new Set(),stats={facility:root.name,detailGroups:details.length,detailMeshes:0,vertices:0,bytes:0,visibleDetailMeshes:0,visibleVertices:0};
 for(const detail of details)detail.traverse(object=>{
  if(!object.isMesh)return;stats.detailMeshes++;
  if(detail.visible){stats.visibleDetailMeshes++;stats.visibleVertices+=object.geometry.attributes.position.count;}
  if(geometries.has(object.geometry))return;const g=object.geometry;geometries.add(g);stats.vertices+=g.attributes.position.count;
  for(const a of Object.values(g.attributes))stats.bytes+=a.array.byteLength;stats.bytes+=g.index?.array.byteLength||0;
 });
 return stats;
}
function summarize(facilities){
 const total={detailGroups:0,detailMeshes:0,vertices:0,bytes:0,visibleDetailMeshes:0,visibleVertices:0};
 for(const f of facilities)for(const key of Object.keys(total))total[key]+=f[key];
 return {total,facilities};
}
const eager=FACILITIES.map(f=>{const root=createFacility(f),stats=measure(root);root.traverse(object=>object.geometry?.dispose());root.clear();return stats;});
const roots=FACILITIES.map(f=>{const root=createFacility(f,{deferDetails:true});return {root,update:configureFacilityDetails(root)};});
const snapshot=()=>summarize(roots.map(({root})=>measure(root)));
const deferredRuntime={startup:snapshot()};
for(const [name,position] of Object.entries({aerial:[40,720,980],prismStreet:[0,5.2,-253],southStreet:[-160,5.2,273],distantReturn:[40,720,980]})){
 const point=new Vector3(...position);for(const item of roots)item.update(point);deferredRuntime[name]=snapshot();
}
const report={method:'CPU fine-geometry and distance-visibility accounting; not FPS, texture memory or GPU allocation',maximumExportBaseline:summarize(eager),deferredRuntime};
fs.mkdirSync('evidence/realism-next',{recursive:true});fs.writeFileSync('evidence/realism-next/exterior-detail-budget.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({maximumExportBaseline:report.maximumExportBaseline.total,deferredRuntime:Object.fromEntries(Object.entries(deferredRuntime).map(([key,value])=>[key,value.total]))},null,2));
