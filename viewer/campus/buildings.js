import {createFacility01to12} from './facilities-01-12.js';
import {createFacility13to24} from './facilities-13-24.js';
import {createFacility25to35} from './facilities-25-35.js';
import {Box3} from 'three';
import {sign} from './geometry.js';

// Every record has an individually reconstructed envelope. Unknown IDs fail
// explicitly instead of quietly receiving a generic family building.
export function createFacility(f){
 const root=createFacility01to12(f)||createFacility13to24(f)||createFacility25to35(f);
 if(!root)throw new Error(`Missing reference architecture for ${f.key}`);
 const height=new Box3().setFromObject(root).max.y;
 root.userData.envelopeHeight=height;
 root.name=f.key;root.position.set(f.x,0,f.z);
 root.userData.referenceSource=`CF-${String(f.id).padStart(2,'0')}_Facility_Infographic.png`;
 root.userData.referenceInterpretation='Observed facade reconstruction; hidden elevations and dimensions inferred';
 const label=sign(f.key+'  '+f.name.toUpperCase(),Math.min(f.w*.52,25),1.35);
 label.position.set(0,Math.min(height*.65,12),f.d/2+.7);root.add(label);
 root.traverse(o=>{o.userData.facility=f.id;});
 root.userData.sculptRuntime={parts:root.children.map(c=>c.name),clickable:true};
 return root;
}
