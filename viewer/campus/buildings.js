import {createFacility01to12} from './facilities-01-12.js';
import {createFacility13to24} from './facilities-13-24.js';
import {createFacility25to35} from './facilities-25-35.js';
import {createReferenceFidelityDetail} from './reference-fidelity.js';
import {Box3,Group} from 'three';
import {sign} from './geometry.js';

// Every record has an individually reconstructed envelope. Unknown IDs fail
// explicitly instead of quietly receiving a generic family building.
export function createFacility(f,options={}){
 const root=createFacility01to12(f,options)||createFacility13to24(f,options)||createFacility25to35(f,options);
 if(!root)throw new Error('Missing reference architecture for '+f.key);
 const height=new Box3().setFromObject(root).max.y;
 root.userData.envelopeHeight=height;
 root.name=f.key;root.position.set(f.x,0,f.z);
 root.userData.referenceSource='CF-'+String(f.id).padStart(2,'0')+'_Facility_Infographic.png';
 root.userData.referenceInterpretation='Observed facade reconstruction; hidden elevations and dimensions inferred';
 // Facility names already appear in the directory and selection UI. The old
 // campus-wide billboard floated beyond each different facade and contradicted
 // the atlas. Add signage only where the authored shell supplies a real anchor.
 const anchor=root.userData.signAnchor;
 if(anchor){const label=sign(anchor.text,anchor.width,anchor.height,'#f0efdf',{architectural:true});label.name='anchored architectural nameplate';label.position.fromArray(anchor.position);label.rotation.y=anchor.yaw||0;root.add(label);}

 // PR14 continuation: the full-campus view keeps only primary architecture.
 // Reference-specific micro-architecture is composed with the existing occupied
 // detail factory only at approach distance, so exacting facade work does not
 // make all 35 high-detail assemblies resident simultaneously.
 if(options.deferDetails){
  const prior=root.userData.createNearDetail;
  root.userData.createNearDetail=()=>{
   const group=new Group();group.name=f.key+'-approach-fidelity';group.userData.nearDetail=true;
   if(prior)group.add(prior());
   group.add(createReferenceFidelityDetail(f));
   return group;
  };
 }else root.add(createReferenceFidelityDetail(f));

 root.traverse(o=>{o.userData.facility=f.id;});
 root.userData.sculptRuntime={parts:root.children.map(c=>c.name),clickable:true};
 return root;
}
