import * as T from 'three';
import {floorLayout} from './data.js';
import {InteriorKit,furnishRoom,planter} from './interior-kit.js';

export function createInteriorGeometry(f,level=0){
 const layout=floorLayout(f,level),root=new T.Group();root.name=`${f.key} floor ${level+1}`;
 const k=new InteriorKit('architecture'),{w,d,corridor,core}=layout;
 k.box('structural floor','stone',0,-.15,0,w,.3,d,0);
 k.box('raised finish floor','stone',0,.015,0,w-.18,.035,d-.18,.004);
 k.box('acoustic ceiling','plaster',0,3.94,0,w,.16,d,0);
 k.box('corridor stone inlay','graphite',0,.036,0,w,.026,corridor-.32,.003);
 for(let x=-w/2+1.2;x<w/2;x+=1.2)k.box('stone floor joint','graphite',x,.045,0,.007,.004,d,0);
 for(let z=-d/2+1.2;z<d/2;z+=1.2)k.box('stone floor joint','graphite',0,.045,z,w,.004,.007,0);
 for(const side of [-1,1]){
  k.box('end wall','plaster',side*w/2,1.95,0,.20,3.9,d,0);
  k.box('perimeter sill','stone',0,.32,side*d/2,w,.64,.20,.015);
  k.box('clear exterior glazing','glass',0,2.19,side*d/2,w,3.07,.016,0);
  k.box('window head','graphite',0,3.72,side*d/2,w,.24,.24,.01);
  k.box('window sill brass cap','brass',0,.655,side*(d/2-.08),w-.28,.022,.12,.004);
  for(let x=-w/2;x<w/2;x+=2.2){k.box('window mullion','graphite',x,2.12,side*d/2,.065,3.25,.14,.008);k.box('gold window reveal','brass',x+.045,2.12,side*(d/2-.07),.009,3.25,.012,.002);}
  k.box('corridor brass inlay','brass',0,.052,side*(corridor/2-.25),w,.016,.025,.002);
  k.box('continuous cove diffuser','warm',0,3.71,side*(corridor/2-.19),w-.3,.025,.065,.008);
  k.box('shadow-gap trim','graphite',0,3.56,side*(corridor/2-.21),w-.2,.035,.045,.004);
 }
 for(let x=-w/2+1.5;x<w/2-1;x+=3){k.box('ceiling coffer','graphite',x,3.80,0,2.4,.09,corridor-.56,.018);k.box('suspended linear luminaire','warm',x,3.73,0,1.9,.035,.075,.008);k.box('luminaire brass spine','brass',x,3.77,0,1.96,.025,.025,.004);}
 const door=Math.min(4,(f.width-2*Math.min(16,f.width*.14))/15)*.3048;
 const partitionKeys=new Set();
 for(const [i,r] of layout.rooms.entries()){
  const profile=r.fitout;
  const side=Math.sign(r.z),edge=side*corridor/2,left=r.x-r.w/2,right=r.x+r.w/2,dl=r.doorX-door/2,dr=r.doorX+door/2;
  for(const x of [left,right]){const key=x.toFixed(3)+':'+r.z.toFixed(3);if(!partitionKeys.has(key)){k.box('room partition','plaster',x,1.95,r.z,.12,3.9,r.d,0);k.box('partition brass edge','brass',x+.065,1.95,r.z,.018,3.55,r.d-.25,.002);partitionKeys.add(key);}}
  k.box('program floor finish',profile.floor,r.x,.046,r.z,r.w-.16,.022,r.d-.14,0);
  for(const [a,b] of [[left,dl],[dr,right]]){
   k.box('corridor plinth','graphite',(a+b)/2,.33,edge,b-a,.66,.14,.01);
   k.box(profile.privateRoom?'privacy partition':'corridor glazing',profile.privateRoom?'plaster':'glass',(a+b)/2,1.94,edge,b-a,2.55,profile.privateRoom?.12:.012,0);
   k.box('corridor head','graphite',(a+b)/2,3.52,edge,b-a,.76,.16,.01);
   if(!profile.privateRoom)for(let x=a+.75;x<b-.1;x+=1.1)k.box('partition mullion','graphite',x,1.95,edge,.04,3.1,.07,.004);
  }
  k.box('door lintel','graphite',r.doorX,3.43,edge,door,.94,.22,.015);
  for(const x of [dl,dr]){k.box('door jamb','graphite',x,1.48,edge,.085,2.96,.20,.007);k.box('door jamb brass reveal','brass',x,1.46,edge-side*.113,.012,2.90,.018,.003);}
  k.box('access reader','graphite',dr+.14,1.28,edge-side*.11,.085,.15,.03,.012);k.box('reader light','blue',dr+.14,1.3,edge-side*.131,.046,.055,.007,.002);
  k.box('room skirting','graphite',r.x,.075,r.z+side*(r.d/2-.07),r.w-.2,.15,.03,.004);
  for(const x of [left+.14,right-.14])k.box('partition skirting','graphite',x,.075,r.z,.025,.15,r.d,.003);
  if(!profile.technical)for(let q=0;q<Math.min(20,Math.floor(r.d/.35));q++)k.box('acoustic timber slat','oak',left+.085,1.7,r.z-r.d*.43+q*.30,.045,2.75,.08,.005);
  if(profile.ceiling==='services'){
   // Exposed technical services, with suspended task lighting over working banks.
   for(const offset of [-.28,.28]){
    k.box('technical cable ladder','steel',r.x+offset*r.w,3.63,r.z,.32,.09,r.d*.86,.005);
    for(let zz=r.z-r.d*.4;zz<r.z+r.d*.42;zz+=1.2)k.box('cable ladder rung','graphite',r.x+offset*r.w,3.58,zz,.34,.025,.06,.004);
    k.box('sealed task luminaire','porcelain',r.x+offset*r.w,3.42,r.z,.28,.08,r.d*.65,.01);
    k.box('sealed opal diffuser','warm',r.x+offset*r.w,3.37,r.z,.24,.02,r.d*.64,.004);
   }
   k.box('rectangular supply duct','steel',r.x,3.73,r.z,.55,.25,r.d*.89,.012);
  }else if(profile.ceiling==='acoustic'){
   for(let xx=left+.6;xx<right-.4;xx+=.6)k.box('library acoustic fin','fabric',xx,3.72,r.z,.08,.22,r.d*.68,.009);
   for(const dz of [-.27,.27]){k.box('reading room pendant body','brass',r.x,3.42,r.z+dz*r.d,r.w*.66,.06,.09,.012);k.box('reading room pendant lens','warm',r.x,3.382,r.z+dz*r.d,r.w*.64,.015,.065,.003);}
  }else{
   for(const offset of [-.26,.26]){k.box('acoustic ceiling raft','fabric',r.x+offset*r.w,3.77,r.z,r.w*.35,.10,r.d*.53,.015);k.box('room light diffuser','warm',r.x+offset*r.w,3.665,r.z,.08,.025,r.d*.5,.006);}
  }
  // Timber belongs to the solid room partition, never suspended in exterior glass.
  const panelW=Math.max(.7,Math.min(1.4,r.d/6));
  if(!profile.technical)for(let pz=r.z-r.d/2+panelW*.85;pz<r.z+r.d/2-panelW*.5;pz+=panelW*1.45){
   k.box('feature wall panel','oak',right-.075,1.85,pz,.035,2.05,panelW,.01);
   k.box('panel brass reveal','brass',right-.10,1.85,pz,.018,.012,panelW*.82,.003);
  }
  // Flush building services preserve the programmed room and arrival clearances.
  const wall=r.z+side*(r.d/2-.14);
  for(const dx of [-.25,.25]){
   const xx=r.x+dx*r.w;
   k.box('duplex outlet plate','porcelain',xx,.35,wall,.09,.13,.014,.004);
   for(const dy of [-.025,.025])k.box('socket aperture','graphite',xx,.35+dy,wall-side*.009,.025,.014,.006,.001);
   k.box('supply diffuser frame','porcelain',xx,3.835,r.z,.58,.055,.58,.008);
   for(let q=0;q<5;q++)k.box('supply diffuser louver','graphite',xx-.2+q*.10,3.802,r.z,.015,.012,.42,.002);
  }
  k.cylinder('smoke detector','porcelain',r.x,3.80,r.z,.065,.045);
  k.cylinder('sprinkler escutcheon','steel',r.x+.75,3.815,r.z,.042,.025);
  k.cylinder('sprinkler head','brass',r.x+.75,3.775,r.z,.014,.07);
  k.box('room thermostat','porcelain',dr+.28,1.42,edge+side*.12,.085,.11,.026,.008);
  k.box('thermostat display','display',dr+.28,1.44,edge+side*.139,.057,.035,.004,.001);
  const furniture=new InteriorKit(`room-${i+1}: ${r.name}`);const kind=furnishRoom(furniture,r);if(!profile.technical&&r.w>7&&r.d>6){planter(furniture,r.x-r.w*.34,r.z-side*r.d*.31,.36);planter(furniture,r.x+r.w*.34,r.z-side*r.d*.31,.36);}const room=furniture.finish(true);room.userData.kind=kind;room.userData.fitout=profile;root.add(room);
 }
 for(const side of [-1,1]){const x=side*(w/2-core*.4);planter(k,x,-corridor*.31,.35);k.box('elevator surround','graphite',side*(w/2-.13),1.65,0,.14,3.3,2,.015);k.box('elevator door','steel',side*(w/2-.23),1.5,0,.04,2.8,1.48,.008);k.box('elevator door seam','graphite',side*(w/2-.257),1.5,0,.012,2.8,.012,.001);k.box('elevator brass header','brass',side*(w/2-.24),3.0,0,.05,.08,1.58,.004);}
 root.add(k.finish(true));
 const garden=new InteriorKit('window terraces');for(const side of [-1,1]){garden.box('terrace paving','stone',0,-.05,side*(d/2+2.1),w+.3,.15,4,0);garden.box('terrace rail','steel',0,1.1,side*(d/2+3.9),w,.045,.045,.01);garden.box('terrace edge light','warm',0,.16,side*(d/2+3.83),w-.4,.025,.035,.004);for(let x=-w/2+1;x<w/2;x+=3){garden.box('terrace railing post','steel',x,.54,side*(d/2+3.9),.035,1.08,.035,.005);planter(garden,x,side*(d/2+2.7),.6);}}
 root.add(garden.finish(false));root.userData.layout=layout;return {root,layout};
}
