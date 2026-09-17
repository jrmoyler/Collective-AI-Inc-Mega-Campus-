// Inventory the actual shipped room builders, including remaining shared recipes.
import fs from 'node:fs';
import {FACILITIES,floorLayout} from '../viewer/campus/data.js';
import {InteriorKit,furnishRoom} from '../viewer/campus/interior-kit.js';
import {researchInstrument} from '../viewer/campus/room-research.js';
import {furnishOccupants} from '../viewer/campus/room-occupants.js';
const rooms=[];
for(const f of FACILITIES)for(let level=0;level<f.levels;level++)for(const [i,source] of floorLayout(f,level).rooms.entries()){
 const r={...source,x:0,z:source.localDepth/2,w:source.localWidth,d:source.localDepth};
 const k=new InteriorKit(r.name),kind=furnishRoom(k,r),people=new InteriorKit('people'),seats=furnishOccupants(people,k,r);
 const counts={};for(const m of k.parts)counts[m.name]=(counts[m.name]||0)+1;
 rooms.push({facility:f.key,level:level+1,room:i+1,name:r.name,kind,instrument:researchInstrument(r),fittings:counts,occupants:seats.length,inferred:true,individuallyAuthored:false});
}
const report={facilities:FACILITIES.length,floors:FACILITIES.reduce((a,f)=>a+f.levels,0),rooms:rooms.length,researchRooms:rooms.filter(r=>r.instrument).length,occupiedRooms:rooms.filter(r=>r.occupants).length,occupants:rooms.reduce((a,r)=>a+r.occupants,0),bespokeEveryRoomAccepted:false,photorealAccepted:false,inventory:rooms};
const out=process.argv[2]||'evidence/reference-continuation/room-fittings.json';fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,inventory:undefined}));
