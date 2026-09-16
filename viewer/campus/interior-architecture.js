import * as T from 'three';
import {floorLayout} from './data.js';
import {InteriorKit,furnishRoom,planter} from './interior-kit.js';
// Uses the approved schematic schedule; visible finishes/fixtures follow the CF cutaways.
export function createInteriorGeometry(f,level=0){
 const layout=floorLayout(f,level),root=new T.Group();root.name=`${f.key} floor ${level+1}`;
 const k=new InteriorKit('architecture'),{w,d,corridor,core}=layout;
 k.box('structural floor','stone',0,-.15,0,w,.3,d,0);
 k.box('acoustic ceiling','plaster',0,3.94,0,w,.16,d,0);
 k.box('corridor stone inlay','graphite',0,.006,0,w,.012,corridor-.32,0);
 // Individually jointed flooring, perimeter skirting and a coffered reflected ceiling.
 for(let x=-w/2+1.2;x<w/2;x+=1.2)k.box('stone floor joint','graphite',x,.015,0,.007,.003,d,0);
 for(let z=-d/2+1.2;z<d/2;z+=1.2)k.box('stone floor joint','graphite',0,.015,z,w,.003,.007,0);
 for(const side of [-1,1]){
  k.box('end wall','plaster',side*w/2,1.95,0,.20,3.9,d,0);
  k.box('perimeter sill','stone',0,.32,side*d/2,w,.64,.20,.015);
  k.box('clear exterior glazing','glass',0,2.19,side*d/2,w,3.07,.016,0);
  k.box('window head','graphite',0,3.72,side*d/2,w,.24,.24,.01);
  for(let x=-w/2;x<w/2;x+=2.2){k.box('window mullion','graphite',x,2.12,side*d/2,.065,3.25,.14,.008);k.box('gold window reveal','brass',x+.045,2.12,side*(d/2-.07),.009,3.25,.012,.002);}
  k.box('corridor brass inlay','brass',0,.018,side*(corridor/2-.25),w,.012,.025,.002);
  k.box('continuous cove diffuser','warm',0,3.71,side*(corridor/2-.19),w-.3,.025,.065,.008);
 }
 for(let x=-w/2+1.5;x<w/2-1;x+=3){
  k.box('ceiling coffer','graphite',x,3.80,0,2.4,.09,corridor-.56,.018);
  k.box('suspended linear luminaire','warm',x,3.73,0,1.9,.035,.075,.008);
 }
 const door=Math.min(4,(f.width-2*Math.min(16,f.width*.14))/15)*.3048;
 const partitionKeys=new Set();
 for(const [i,r] of layout.rooms.entries()){
  const side=Math.sign(r.z),edge=side*corridor/2,left=r.x-r.w/2,right=r.x+r.w/2,dl=r.doorX-door/2,dr=r.doorX+door/2;
  // A glazed corridor wall gives the occupied rooms the openness of the cutaways.
  for(const x of [left,right]){const key=x.toFixed(3)+':'+r.z.toFixed(3);if(!partitionKeys.has(key)){k.box('room partition','plaster',x,1.95,r.z,.12,3.9,r.d,0);partitionKeys.add(key);}}
  for(const [a,b] of [[left,dl],[dr,right]]){
   k.box('corridor plinth','graphite',(a+b)/2,.33,edge,b-a,.66,.14,.01);
   k.box('corridor glazing','glass',(a+b)/2,1.94,edge,b-a,2.55,.012,0);
   k.box('corridor head','graphite',(a+b)/2,3.52,edge,b-a,.76,.16,.01);
   for(let x=a+.75;x<b-.1;x+=1.1)k.box('partition mullion','graphite',x,1.95,edge,.04,3.1,.07,.004);
  }
  k.box('door lintel','graphite',r.doorX,3.43,edge,door,.94,.22,.015);
  for(const x of [dl,dr]){k.box('door jamb','graphite',x,1.48,edge,.085,2.96,.20,.007);k.box('door jamb brass reveal','brass',x,1.46,edge-side*.113,.012,2.90,.018,.003);}
  k.box('access reader','graphite',dr+.14,1.28,edge-side*.11,.085,.15,.03,.012);
  k.box('reader light','blue',dr+.14,1.3,edge-side*.131,.046,.055,.007,.002);
  for(const x of [left+.14,right-.14])k.box('partition skirting','graphite',x,.075,r.z,.025,.15,r.d,.003);
  // Finite, physical acoustic slats and light slots; surfaces remain independently shaded.
  for(let q=0;q<Math.min(20,Math.floor(r.d/.35));q++)k.box('acoustic timber slat','oak',left+.085,1.7,r.z-r.d*.43+q*.30,.045,2.75,.08,.005);
  for(const offset of [-.27,.27]){k.box('room ceiling baffle','graphite',r.x+offset*r.w,3.77,r.z,.13,.18,r.d*.74,.015);k.box('room light diffuser','warm',r.x+offset*r.w,3.665,r.z,.08,.025,r.d*.73,.006);}
  const furniture=new InteriorKit(`room-${i+1}: ${r.name}`);const kind=furnishRoom(furniture,r);const room=furniture.finish(true);room.userData.kind=kind;root.add(room);
 }
 for(const side of [-1,1]){const x=side*(w/2-core*.4);planter(k,x,-corridor*.31,.35);k.box('elevator surround','graphite',side*(w/2-.13),1.65,0,.14,3.3,2,.015);k.box('elevator door','steel',side*(w/2-.23),1.5,0,.04,2.8,1.48,.008);k.box('elevator door seam','graphite',side*(w/2-.257),1.5,0,.012,2.8,.012,.001);}
 root.add(k.finish(true));
 // Exterior terraces seen through actual windows: no artwork or background image planes.
 const garden=new InteriorKit('window terraces');for(const side of [-1,1]){
  garden.box('terrace paving','stone',0,-.05,side*(d/2+2.1),w+.3,.15,4,0);
  garden.box('terrace rail','steel',0,1.1,side*(d/2+3.9),w,.045,.045,.01);
  for(let x=-w/2+1;x<w/2;x+=3){garden.box('terrace railing post','steel',x,.54,side*(d/2+3.9),.035,1.08,.035,.005);planter(garden,x,side*(d/2+2.7),.6);}
 }root.add(garden.finish(false));root.userData.layout=layout;
 return {root,layout};
}
