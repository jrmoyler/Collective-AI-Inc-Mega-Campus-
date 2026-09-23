import * as T from 'three';
import {furnishOccupants} from './room-occupants.js';
import {floorLayout} from './data.js';
import {InteriorKit,furnishRoom,planter,server,robot} from './interior-kit.js';
import {roomIdentity,furnishRoomIdentity} from './room-identity.js';
// Bake oriented room vertices: Babylon and offline glTF consume the same buffers.
function place(group,r){
 const matrix=new T.Matrix4().makeRotationY(r.angle);matrix.setPosition(r.doorX,0,r.doorZ);
 group.traverse(o=>{if(o.geometry){o.geometry.applyMatrix4(matrix);o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();}});
}
// Very large technical halls read as empty warehouses with a handful of props.
// Tile production cells (or rack rows for compute) over the free floor, leaving the
// arrival zone, the centre aisle and every authored fixture's footprint clear.
function populateHall(k,r,kind){
 if(!r.fitout?.technical||r.w*r.d<500)return;
 const taken=[],box=new T.Box3();
 for(const m of k.parts){if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();m.updateMatrix();box.copy(m.geometry.boundingBox).applyMatrix4(m.matrix);if(box.min.y<2.2)taken.push([box.min.x-.9,box.max.x+.9,box.min.z-.9,box.max.z+.9]);}
 const free=(x0,x1,z0,z1)=>!taken.some(([a,b,c,d])=>x1>a&&x0<b&&z1>c&&z0<d);
 const servers=kind==='servers',px=servers?3.2:6.5,pz=servers?1.13:6.5;
 for(let z=7+pz/2;z<r.d-2;z+=pz)for(let x=-r.w/2+2+px/2;x<r.w/2-2;x+=px){
  if(Math.abs(x)<2.6)continue;
  const hx=servers?.5:1.9,hz=servers?.5:1.9;if(!free(x-hx,x+hx,z-hz,z+hz))continue;
  if(servers){server(k,x,z);}
  else{k.box('production cell base','graphite',x,.43,z,1.3,.85,.95,.025);k.box('production cell top','steel',x,.9,z,1.45,.09,1.1,.015);robot(k,x,z);
   for(const s of [-1,1]){for(const dz of [-1.25,0,1.25])k.box('cell guard post','brass',x+s*1.6,.55,z+dz,.05,1.1,.05,.01);for(const y of [.55,1.05])k.box('cell guard rail','brass',x+s*1.6,y,z,.04,.04,2.6,.01);}k.box('cell floor marking','brass',x,.062,z+1.55,3.2,.004,.08,0);}
  taken.push([x-hx,x+hx,z-hz,z+hz]);
 }
}
export function createInteriorGeometry(f,level=0){
 const layout=floorLayout(f,level),root=new T.Group();root.name=`${f.key} floor ${level+1}`;
 const {w,d,core}=layout;
 for(const [i,source] of layout.rooms.entries()){
  const k=new InteriorKit('architecture room '+(i+1));
  const r={...source,x:0,z:source.localDepth/2,w:source.localWidth,d:source.localDepth,doorX:0};
  const identity=roomIdentity(r,i);
  const corridor=0,door=source.doorWidth,partitionKeys=new Set();
  k.box('room acoustic ceiling','plaster',0,r.height+.04,r.z,r.w,.12,r.d,0);
  // A perimeter room receives daylight; an internal room has a solid back wall.
  const bx=source.doorX+Math.sin(source.angle)*source.localDepth,bz=source.doorZ+Math.cos(source.angle)*source.localDepth;
  const exterior=Math.abs(Math.abs(bz)-d/2)<.01;
  const glazed=exterior&&!r.fitout.privateRoom&&!/LED volume|Soundstage|Audio booths|Motion capture|Podcast/i.test(r.name);
  if(glazed){
   k.box('perimeter sill','stone',0,.32,r.d,r.w,.64,.16,.01);
   k.box('clear exterior glazing','glass',0,(r.height+.64)/2,r.d,r.w,r.height-.64,.016,0);
   for(let x=-r.w/2+.1;x<r.w/2;x+=1.8)k.box('window mullion','graphite',x,r.height/2,r.d,.065,r.height,.14,.005);
   k.box('window head','graphite',0,r.height-.08,r.d,r.w,.16,.20,.01);
  }else k.box('enclosed rear partition',/LED volume|Soundstage|Audio booths|Motion capture|Podcast/i.test(r.name)?'rubber':'plaster',0,r.height/2,r.d,r.w,r.height,.14,0);
  const profile=r.fitout,h=r.height;
  const side=Math.sign(r.z),edge=side*corridor/2,left=r.x-r.w/2,right=r.x+r.w/2,dl=r.doorX-door/2,dr=r.doorX+door/2;
  for(const x of [left,right]){const key=x.toFixed(3)+':'+r.z.toFixed(3);if(!partitionKeys.has(key)){k.box('room partition','plaster',x,h/2,r.z,.12,h,r.d,0);for(const zz of [r.z-r.d/2+.10,r.z+r.d/2-.10])k.box('partition brass edge','brass',x+.065,h/2,zz,.018,h-.35,.025,.002);partitionKeys.add(key);}}
  k.box('program floor finish',identity.floorFinish,r.x,.046,r.z,r.w-.16,.022,r.d-.14,0);
  for(const [a,b] of [[left,dl],[dr,right]]){
   k.box('corridor plinth','graphite',(a+b)/2,.33,edge,b-a,.66,.14,.01);
   k.box(profile.privateRoom?'privacy partition':'corridor glazing',profile.privateRoom?'plaster':'glass',(a+b)/2,1.94,edge,b-a,2.55,profile.privateRoom?.12:.012,0);
   k.box('corridor head','graphite',(a+b)/2,(h+3.14)/2,edge,b-a,h-3.14,.16,.01);
   if(!profile.privateRoom)for(let x=a+.75;x<b-.1;x+=1.1)k.box('partition mullion','graphite',x,1.95,edge,.04,3.1,.07,.004);
  }
  k.box('door lintel','graphite',r.doorX,(h+2.96)/2,edge,door,h-2.96,.22,.015);
  for(const x of [dl,dr]){k.box('door jamb','graphite',x,1.48,edge,.085,2.96,.20,.007);k.box('door jamb brass reveal','brass',x,1.46,edge-side*.113,.012,2.90,.018,.003);}
  k.box('access reader','graphite',dr+.14,1.28,edge-side*.11,.085,.15,.03,.012);k.box('reader light','blue',dr+.14,1.3,edge-side*.131,.046,.055,.007,.002);
  k.box('room skirting','graphite',r.x,.075,r.z+side*(r.d/2-.07),r.w-.2,.15,.03,.004);
  for(const x of [left+.14,right-.14])k.box('partition skirting','graphite',x,.075,r.z,.025,.15,r.d,.003);
  if(!profile.technical)for(let q=0;q<Math.min(20,Math.floor(r.d/.35));q++)k.box('acoustic timber slat','oak',left+.085,1.7,r.z-r.d*.43+q*.30,.045,2.75,.08,.005);
  if(profile.ceiling==='services'){
   // Exposed technical services, with suspended task lighting over working banks.
   for(const offset of [-.28,.28]){
    k.box('technical cable ladder','steel',r.x+offset*r.w,h-0.27,r.z,.32,.09,r.d*.86,.005);
    for(let zz=r.z-r.d*.4;zz<r.z+r.d*.42;zz+=1.2)k.box('cable ladder rung','graphite',r.x+offset*r.w,h-0.32,zz,.34,.025,.06,.004);
    k.box('sealed task luminaire','porcelain',r.x+offset*r.w,h-0.48,r.z,.28,.08,r.d*.65,.01);
    k.box('sealed opal diffuser','warm',r.x+offset*r.w,h-0.53,r.z,.24,.02,r.d*.64,.004);
   }
   k.box('rectangular supply duct','steel',r.x,h-0.17,r.z,.55,.25,r.d*.89,.012);
   if(r.w*r.d>250){
    // Large technical halls expose their long-span structure: steel girders, deck ribs
    // and warm high-bay pendants on a 6 m grid instead of a flat plaster lid.
    for(let zz=r.z-r.d/2+3.75;zz<r.z+r.d/2-1;zz+=7.5){
     k.box('steel girder web','graphite',r.x,h-.34,zz,r.w-.14,.52,.018,0);
     for(const dy of [-.25,.25])k.box('steel girder flange','graphite',r.x,h-.34+dy,zz,r.w-.14,.022,.2,0);
    }
    for(let xx=left+.75;xx<right-.4;xx+=1.5)k.box('deck rib','plaster',xx,h-.07,r.z,.09,.1,r.d-.1,0);
    const nx=Math.max(1,Math.round(r.w/6)),nz=Math.max(1,Math.round(r.d/6));
    for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){
     const px=left+(a+.5)*r.w/nx,pz=r.z-r.d/2+(b+.5)*r.d/nz,y=Math.max(3.2,h-1.6);
     k.bar('high-bay suspension','steel',[px,h-.6,pz],[px,y+.3,pz],.008);
     k.cylinder('high-bay reflector','graphite',px,y+.14,pz,.29,.28,.1);
     k.cylinder('high-bay lens','warm',px,y-.005,pz,.25,.012);
    }
   }
  }else if(profile.ceiling==='acoustic'){
   for(let xx=left+.6;xx<right-.4;xx+=.6)k.box('library acoustic fin','oak',xx,h-0.18,r.z,.08,.22,r.d*.68,.009);
   for(const dz of [-.27,.27]){k.box('reading room pendant body','brass',r.x,h-0.48,r.z+dz*r.d,r.w*.66,.06,.09,.012);k.box('reading room pendant lens','warm',r.x,h-0.518,r.z+dz*r.d,r.w*.64,.015,.065,.003);}
  }else{
   for(const offset of [-.26,.26]){k.box('acoustic ceiling raft','linen',r.x+offset*r.w,h-0.13,r.z,r.w*.35,.10,r.d*.53,.015);k.box('room light diffuser','warm',r.x+offset*r.w,h-0.235,r.z,.08,.025,r.d*.5,.006);}
  }
  // Timber belongs to the solid room partition, never suspended in exterior glass.
  const panelW=Math.max(.7,Math.min(1.4,r.d/6));
  if(!profile.technical)for(let pz=r.z-r.d/2+panelW*.85;pz<r.z+r.d/2-panelW*.5;pz+=panelW*1.45){
   k.box('feature wall panel',identity.accent,right-.075,1.85,pz,.035,2.05,panelW,.01);
   k.box('panel material reveal',identity.metal,right-.10,1.85,pz,.018,.012,panelW*.82,.003);
  }
  // Flush building services preserve the programmed room and arrival clearances.
  const wall=r.z+side*(r.d/2-.14);
  for(const dx of [-.25,.25]){
   const xx=r.x+dx*r.w;
   k.box('duplex outlet plate','porcelain',xx,.35,wall,.09,.13,.014,.004);
   for(const dy of [-.025,.025])k.box('socket aperture','graphite',xx,.35+dy,wall-side*.009,.025,.014,.006,.001);
   k.box('supply diffuser frame','porcelain',xx,h-0.065,r.z,.58,.055,.58,.008);
   for(let q=0;q<5;q++)k.box('supply diffuser louver','graphite',xx-.2+q*.10,h-0.098,r.z,.015,.012,.42,.002);
  }
  k.cylinder('smoke detector','porcelain',r.x,h-0.1,r.z,.065,.045);
  k.cylinder('sprinkler escutcheon','steel',r.x+.75,h-0.085,r.z,.042,.025);
  k.cylinder('sprinkler head','brass',r.x+.75,h-0.125,r.z,.014,.07);
  k.box('room thermostat','porcelain',dr+.28,1.42,edge+side*.12,.085,.11,.026,.008);
  k.box('thermostat display','display',dr+.28,1.44,edge+side*.139,.057,.035,.004,.001);
  const furniture=new InteriorKit(`room-${i+1}: ${r.name}`);const kind=furnishRoom(furniture,r);const authored=furnishRoomIdentity(furniture,r,i);populateHall(furniture,r,kind);if(!profile.technical&&r.w>7&&r.d>6){if(authored.seed&1)planter(furniture,r.x-r.w*.34,r.z-side*r.d*.31,.36);if(authored.seed&2)planter(furniture,r.x+r.w*.34,r.z-side*r.d*.31,.36);}const occupants=new InteriorKit(`occupants room ${i+1}`),occupiedSeats=furnishOccupants(occupants,furniture,r,authored);const people=occupants.finish(false);people.userData.occupiedSeats=occupiedSeats;people.userData.identityKey=authored.key;place(people,source);root.add(people);const room=furniture.finish(true);room.userData.kind=kind;room.userData.fitout=profile;room.userData.identityKey=authored.key;room.userData.geometrySignature=authored.geometrySignature;place(room,source);root.add(room);
  const shell=k.finish(true);shell.userData.identityKey=identity.key;shell.userData.daylight=glazed;place(shell,source);root.add(shell);
 }
 const k=new InteriorKit('architecture circulation');
 k.box('structural floor','stone',0,-.15,0,w,.3,d,0);
 k.box('raised finish floor','floorStone',0,.015,0,w,.03,d,0);
 for(const c of layout.circulation){
  k.box('circulation stone inlay','floorStone',c.x,.04,c.z,c.w,.025,c.d,0);
  k.box('circulation acoustic ceiling','plaster',c.x,3.64,c.z,c.w,.12,c.d,0);
  const length=c.axis==='H'?c.w:c.d;
  for(let t=-length/2+1;t<length/2-.3;t+=2.4){
   const x=c.x+(c.axis==='H'?t:0),z=c.z+(c.axis==='V'?t:0);
   k.box('suspended linear luminaire','warm',x,3.48,z,c.axis==='H'?1.6:.08,.035,c.axis==='H'?.08:1.6,.008);
   k.box('luminaire brass spine','brass',x,3.52,z,c.axis==='H'?1.65:.025,.025,c.axis==='H'?.025:1.65,.004);
  }
 }
 // Close the envelope at passage ends and around the two service strips.
 // Keep these out of room glazing to avoid doubling tinted surfaces.
 for(const side of [-1,1]){
  k.box('service perimeter wall','plaster',side*w/2,1.8,0,.18,3.6,d,0);
  for(const end of [-1,1])k.box('service end wall','plaster',side*(w/2-core/2),1.8,end*d/2,core,3.6,.18,0);
 }
 for(const c of layout.circulation)if(c.axis==='V')for(const side of [-1,1]){
  const z=c.z+side*c.d/2;if(Math.abs(Math.abs(z)-d/2)>.01)continue;
  k.box('passage end sill','stone',c.x,.30,z,c.w,.60,.14,.008);
  k.box('passage end glazing','glass',c.x,2.1,z,c.w,3,.016,0);
  for(const dx of [-c.w/2,0,c.w/2])k.box('passage end mullion','graphite',c.x+dx,1.8,z,.06,3.6,.12,.005);
 }
 // End support strips remain available; openings align with the new arrival spine.
 for(const side of [-1,1]){
  const x=side*(w/2-.18),z=layout.circulation[0].axis==='H'?layout.circulation[0].z:0;
  k.box('elevator surround','graphite',x,1.65,z,.14,3.3,2,.015);
  k.box('elevator door','steel',x-side*.1,1.5,z,.04,2.8,1.48,.008);
  k.box('elevator door seam','graphite',x-side*.13,1.5,z,.012,2.8,.012,.001);
 }
 root.add(k.finish(true));root.userData.layout=layout;return {root,layout};
}
