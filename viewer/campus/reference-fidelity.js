// Near-camera reference continuation for all 35 approved facilities.
// Primary envelopes stay resident; these small assemblies are rebuilt only when
// the visitor approaches a facility, protecting the already-expensive campus view.
import {Batch,cylinder,ring,line} from './geometry.js';

function ribWall(b,x,y,z,w,h,count,mat='steel',depth=.24){
 const n=Math.max(2,count);
 for(let i=0;i<n;i++)b.box(mat,x-w/2+i*w/(n-1),y+h/2,z,.10,h,depth);
}
function equipmentCourt(b,x,y,z,w,d,count=5){
 b.box('dark',x,y+.18,z,w,.34,d);
 for(let i=0;i<count;i++){
  const xx=x-w*.38+i*w*.76/Math.max(1,count-1);
  b.box('steel',xx,y+.78,z,Math.max(.7,w*.11),1.25,d*.54);
  ribWall(b,xx,y+.78,z+d*.28,Math.max(.65,w*.1),1,count>5?4:3,'dark',.07);
 }
}
function plantedEdge(b,x,y,z,w,d){
 b.box('stone',x,y+.15,z,w,.30,d);
 b.box('leaf',x,y+.34,z,w-.25,.10,d-.22);
}
function canopy(b,x,y,z,w,d,mat='steel'){
 b.box(mat,x,y,z,w,.18,d);
 for(const xx of [-w*.42,w*.42])cylinder(b,'steel',x+xx,y*.5,z,.12,Math.max(.5,y),.12,10);
}
function frame(b,x,y,z,w,h,mat='steel'){
 b.box(mat,x-w/2,y+h/2,z,.16,h,.20);b.box(mat,x+w/2,y+h/2,z,.16,h,.20);b.box(mat,x,y+h,z,w,.16,.20);
}
function terrace(b,x,y,z,w,d){
 b.box('stone',x,y,z,w,.28,d);
 ribWall(b,x,y+.55,z+d/2,w,1.1,Math.max(3,Math.floor(w/2.5)),'steel',.08);
}
function displayWall(b,x,y,z,w,h){
 b.box('dark',x,y+h/2,z,w,h,.18);
 b.box('blueGlass',x,y+h/2,z+.10,w-.25,h-.25,.025);
}
function waterWall(b,x,y,z,w,h){
 b.box('dark',x,y+h/2,z,w,h,.12);
 b.box('water',x,y+h/2,z+.075,w-.18,h-.2,.025);
 b.box('water',x,y-.08,z+.35,w,.16,.75);
}
function sawtooth(b,x,y,z,w,d,count=4){
 const bay=w/count;
 for(let i=0;i<count;i++){
  const xx=x-w/2+bay*(i+.5);
  line(b,'steel',[[xx-bay*.5,y,z-d*.5],[xx+bay*.34,y+2.1,z-d*.5],[xx+bay*.5,y,z-d*.5]],.11);
  ribWall(b,xx,y+.95,z-d*.49,bay*.72,1.65,4,'glazing',.035);
 }
}
function portal(b,x,y,z,w,h,lean=1.1){
 line(b,'steel',[[x-w/2,y,z],[x-w*.42,y+h,z-lean]],.22);
 line(b,'steel',[[x+w/2,y,z],[x+w*.42,y+h,z-lean]],.22);
 line(b,'steel',[[x-w*.42,y+h,z-lean],[x+w*.42,y+h,z-lean]],.22);
}
function solarField(b,x,y,z,w,d,rows=3){
 for(let row=0;row<rows;row++){
  const zz=z-d*.35+row*d*.70/Math.max(1,rows-1);
  b.box('solar',x,y+.34,zz,w,.10,d/Math.max(4,rows*2));
  for(const xx of [-w*.42,w*.42])b.box('steel',x+xx,y+.17,zz,.08,.34,.08);
 }
}
function arc(b,x,y,z,rx,rz,start,end,steps=18,mat='steel',r=.12){
 const pts=[];for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;pts.push([x+Math.cos(a)*rx,y,z+Math.sin(a)*rz]);}line(b,mat,pts,r);
}

export function createReferenceFidelityDetail(f){
 const b=new Batch(),{id,w,d,h}=f,tags=[];
 switch(id){
  case 1:
   ring(b,'steel',-w*.11,h*1.02,-d*.02,w*.105,.24,0);ring(b,'gold',-w*.11,h*1.02,-d*.015,w*.082,.055,0);
   for(const q of [-.36,-.24,-.12,.02,.16])ribWall(b,q*w,h*.10,d*.402,w*.085,h*.73,3,q<-.2?'steel':'gold',.17);
   terrace(b,w*.31,h*.69,d*.19,w*.38,d*.16);tags.push('oculus crown','asymmetric deep facade','cantilever terrace');
   break;
  case 2:
   equipmentCourt(b,w*.16,h*.92,-d*.30,w*.42,d*.19,7);equipmentCourt(b,-w*.23,h*.925,-d*.32,w*.25,d*.14,4);
   for(let i=0;i<4;i++){const y=h*(.22+i*.12);b.box('dark',w*.405,y,d*.405,w*.11,h*.075,.62);b.box('cyan',w*.405,y,d*.42,w*.085,.035,.64);}
   tags.push('roof equipment courts','stepped communications frontage');
   break;
  case 3:
   for(const side of [-1,1]){frame(b,side*w*.28,0,d*.29,w*.26,h*.40,'dark');for(let i=0;i<4;i++)b.box('gold',side*w*.28+(i-1.5)*w*.045,h*.19,d*.302,.12,h*.32,.24);}
   for(const side of [-1,1])cylinder(b,'dark',side*w*.19,h*.18,-d*.23,w*.085,h*.36,w*.105,28);
   portal(b,0,0,d*.41,w*.32,h*.33,1.8);tags.push('fortified approach','vault drums','deep security reveals');
   break;
  case 4:
   ring(b,'gold',0,h*1.04,-d*.08,w*.19,.22,0);ring(b,'steel',0,h*1.04,-d*.08,w*.155,.07,0);
   terrace(b,-w*.32,h*.77,d*.18,w*.27,d*.23);terrace(b,w*.32,h*.69,d*.14,w*.27,d*.20);
   canopy(b,0,h*.28,d*.44,w*.44,d*.15,'copper');tags.push('knowledge crown','linked terraces','library connector');
   break;
  case 5:
   portal(b,-w*.24,h*.40,-d*.31,w*.43,h*.46,2.2);portal(b,w*.24,h*.40,-d*.31,w*.35,h*.36,1.4);
   sawtooth(b,-w*.22,h*.97,-d*.03,w*.43,d*.25,5);displayWall(b,-w*.24,h*.48,d*.385,w*.36,h*.32);
   tags.push('production cutaway','stage roof truss','media facade composition');
   break;
  case 6:
   for(let i=0;i<4;i++){const y=h*(.20+i*.17);b.box('steel',-w*.42+i*w*.025,y,d*.45,w*.18,.16,.42,-.16);}
   canopy(b,-w*.18,h*.22,d*.52,w*.43,d*.18,'dark');terrace(b,w*.10,h*.63,d*.29,w*.58,d*.20);
   tags.push('angled launch frontage','stacked setbacks','occupied launch facade');
   break;
  case 7:
   sawtooth(b,0,h*.72,-d*.10,w*.82,d*.52,7);equipmentCourt(b,w*.24,h*.74,d*.17,w*.32,d*.22,5);
   for(let i=0;i<5;i++)portal(b,-w*.36+i*w*.18,0,d*.47,w*.13,h*.49,.8);
   tags.push('factory roof courts','northlight sawtooth','production bays');
   break;
  case 8:
   portal(b,0,0,d*.48,w*.86,h*.72,2.6);for(const x of [-w*.32,w*.32])line(b,'gold',[[x,h*.20,-d*.42],[x,h*.84,d*.38]],.26);
   for(const z of [-d*.26,0,d*.26])frame(b,0,h*.10,z,w*.64,h*.55,'steel');tags.push('manufacturing portal','overhead crane structure','dense occupied hall');
   break;
  case 9:
   for(let a=0;a<Math.PI*2;a+=Math.PI/6){const x=Math.cos(a)*w*.38,z=Math.sin(a)*d*.35;cylinder(b,'dark',x,h*.81,z,Math.min(w,d)*.035,.18,Math.min(w,d)*.035,20);ring(b,'gold',x,h*.92,z,Math.min(w,d)*.028,.05);}
   arc(b,0,h*.60,0,w*.43,d*.40,0,Math.PI*2,36,'steel',.17);portal(b,-w*.35,0,d*.37,w*.21,h*.42,1.3);
   tags.push('circular terminal organization','roof pads','terminal envelope');
   break;
  case 10:
   for(let i=0;i<7;i++){const x=-w*.39+i*w*.13;frame(b,x,0,d*.47,w*.105,h*.42,'dark');b.box('steel',x,h*.44,d*.485,w*.10,.20,2.2);}
   equipmentCourt(b,w*.25,h*.92,-d*.27,w*.28,d*.22,6);ribWall(b,0,h*.12,d*.455,w*.90,h*.55,22,'steel',.14);
   tags.push('warehouse fascia','loading frontage','roof equipment density');
   break;
  case 11:
   for(const [x,z,r] of [[-.22,-.14,.20],[.23,-.12,.17]]){for(let y=h*.23;y<h*.84;y+=h*.12){ring(b,'leaf',x*w,y,z*d,r*w*.82,.22);ring(b,'magenta',x*w,y+.28,z*d,r*w*.77,.035);}}
   arc(b,w*.06,h*.73,d*.14,w*.44,d*.30,.10,Math.PI-.10,20,'steel',.19);plantedEdge(b,0,h*.72,d*.36,w*.68,d*.10);
   tags.push('growing tower layers','planted roof curves','farm facade depth');
   break;
  case 12:
   for(const side of [-1,1]){arc(b,side*w*.30,h*.48,0,w*.19,d*.43,-Math.PI/2,Math.PI/2,20,'white',.22);for(let i=0;i<4;i++){const z=-d*.28+i*d*.18;b.box('white',side*w*.30,1.1,z,2.3,1.5,3.3);b.box('blueGlass',side*w*.30,1.3,z+d*.04,2.0,1.1,.035);}}
   plantedEdge(b,0,.28,0,w*.24,d*.40);tags.push('curved clinic perimeter','care courtyards','visible pod rhythm');
   break;
  case 13:
   arc(b,0,h*.91,-d*.08,w*.42,d*.37,Math.PI*.08,Math.PI*.92,24,'steel',.26);plantedEdge(b,-w*.19,h*.72,d*.23,w*.38,d*.13);
   waterWall(b,w*.40,.28,d*.22,w*.10,h*.54);frame(b,-w*.10,h*.58,-d*.19,w*.45,h*.27,'steel');
   tags.push('curved pavilion fascia','planted shoulder','waterfall wall');
   break;
  case 14:
   arc(b,0,h*.38,d*.42,w*.45,d*.11,Math.PI*.08,Math.PI*.92,24,'steel',.18);for(const x of [-w*.25,0,w*.25]){b.box('dark',x,h*.82,-d*.18,w*.15,h*.12,d*.22);ribWall(b,x,h*.82,-d*.06,w*.13,h*.10,5,'steel',.07);}
   terrace(b,w*.24,h*.60,d*.18,w*.37,d*.20);tags.push('curved research frontage','roof booths','stepped terrace');
   break;
  case 15:
   arc(b,0,h*.68,0,w*.46,d*.39,0,Math.PI*2,36,'track',.55);arc(b,0,h*.72,0,w*.37,d*.31,0,Math.PI*2,36,'steel',.11);
   canopy(b,w*.23,h*.34,d*.31,w*.35,d*.22,'white');portal(b,-w*.22,0,d*.35,w*.28,h*.42,1.4);
   tags.push('enclosed test track','motion pavilion','mobility portals');
   break;
  case 16:
   arc(b,0,h*.34,d*.44,w*.52,d*.20,Math.PI*.06,Math.PI*.94,28,'steel',.42);arc(b,0,h*.36,d*.435,w*.45,d*.17,Math.PI*.06,Math.PI*.94,28,'glazing',.20);
   terrace(b,-w*.23,h*.55,d*.11,w*.31,d*.26);displayWall(b,w*.28,h*.20,d*.395,w*.23,h*.24);
   tags.push('sweeping public canopy','arrival hall','public room massing');
   break;
  case 17:
   for(let i=0;i<4;i++){const x=-w*.35+i*w*.23;canopy(b,x,4.8,d*.40,w*.16,d*.19,'steel');b.box('white',x,2.2,d*.40,w*.13,4.2,d*.15);}
   solarField(b,-w*.10,h+1,-d*.16,w*.38,d*.35,4);frame(b,w*.28,h*.50,-d*.18,w*.26,h*.22,'white');
   tags.push('prototype home court','testing yard','inspection roof');
   break;
  case 18:
   for(const side of [-1,1]){canopy(b,side*w*.30,h*.52,d*.46,w*.30,d*.15,'steel');ribWall(b,side*w*.30,.2,d*.44,w*.27,h*.36,8,'dark',.18);}
   displayWall(b,-w*.28,h*.47,d*.115,w*.24,h*.24);terrace(b,0,h*.52,d*.12,w*.27,d*.50);
   tags.push('deployment frontage','mobility suites','map-room composition');
   break;
  case 19:
   for(let i=0;i<4;i++){const y=h*(.22+i*.20);b.box('stone',0,y,d*.42,w*(.87-i*.11),.32,d*.10);ribWall(b,0,y+.18,d*.47,w*(.84-i*.11),h*.13,12,'gold',.09);}
   b.box('dark',-w*.41,h*.48,d*.08,w*.13,h*.96,d*.46);terrace(b,w*.25,h*.58,d*.19,w*.30,d*.26);
   tags.push('regulatory spine','stepped suites','deep civic facade');
   break;
  case 20:
   for(let i=0;i<4;i++){const y=h*(.20+i*.16),scale=1-i*.14;frame(b,0,y,-d*.02,w*.61*scale,h*.13,'steel');}
   for(let a=0;a<Math.PI*2;a+=Math.PI/6)line(b,'steel',[[0,h*.83,0],[Math.cos(a)*w*.28,h*1.06,Math.sin(a)*d*.28]],.09);
   cylinder(b,'steel',0,h*1.08,0,.18,h*.18,.06,10);tags.push('tapered communications spire','antenna crown','communications terraces');
   break;
  case 21:
   for(let i=0;i<4;i++){const x=-w*.36+i*w*.15;cylinder(b,'steel',x,3.0,d*.31,1.35,5.5,1.15,20);line(b,'steel',[[x,5.7,d*.31],[x,7.3,d*.08],[w*.20,7.3,d*.08]],.11);}
   equipmentCourt(b,w*.25,h*.43,-d*.16,w*.34,d*.28,7);waterWall(b,-w*.18,.2,d*.40,w*.43,h*.28);
   tags.push('process equipment density','turbine connections','plant enclosure');
   break;
  case 22:
   arc(b,0,h*.36,d*.36,w*.48,d*.15,.04,Math.PI-.04,22,'steel',.20);canopy(b,0,h*.23,d*.48,w*.58,d*.18,'white');
   displayWall(b,-w*.27,h*.68,d*.105,w*.26,h*.17);terrace(b,w*.25,h*.61,d*.10,w*.30,d*.31);
   tags.push('bent arrival facade','theatre volume','command suite');
   break;
  case 23:
   for(const side of [-1,1])terrace(b,side*w*.34,h*.67,d*.14,w*.27,d*.34);
   arc(b,0,h*.40,d*.05,w*.31,d*.24,0,Math.PI,20,'steel',.21);canopy(b,0,h*.24,d*.39,w*.36,d*.20,'copper');
   plantedEdge(b,0,.25,d*.18,w*.30,d*.24);tags.push('forum courtyard','occupied commons wings','social canopy');
   break;
  case 24:
   arc(b,0,h*.44,d*.39,w*.49,d*.14,.02,Math.PI-.02,28,'copper',.31);arc(b,-w*.15,h*.72,d*.23,w*.31,d*.10,.05,Math.PI-.05,20,'gold',.13);
   terrace(b,w*.25,h*.68,d*.08,w*.44,d*.42);solarField(b,-w*.14,h+.8,-d*.17,w*.43,d*.23,3);
   tags.push('rounded control facade','inset decks','solar command roof');
   break;
  case 25:
   cylinder(b,'glazing',0,h*.62,d*.16,w*.16,h*1.25,w*.13,36);ring(b,'stone',0,h*1.25,d*.16,w*.17,.20);
   for(const side of [-1,1]){plantedEdge(b,side*w*.28,h*(side<0?1:.88)+.4,-d*.08,w*.39,d*.14);solarField(b,side*w*.28,h*(side<0?1:.88)+.8,-d*.12,w*.24,d*.20,2);}
   tags.push('bio-energy core','roof gardens','research shoulders');
   break;
  case 26:
   sawtooth(b,0,h+.2,-d*.08,w*.72,d*.42,6);portal(b,0,0,d*.48,w*.78,h*.74,2.0);for(const x of [-w*.35,w*.35])line(b,'gold',[[x,h*.20,-d*.39],[x,h*.80,d*.38]],.23);
   tags.push('assembly hall roof','high-bay portal','crane gantry');
   break;
  case 27:
   for(const [z,y,s] of [[d*.34,.3,1], [d*.08,h*.32,.84],[-d*.25,h*.54,.72]]){terrace(b,w*.15,y,z,w*.61*s,d*.18);for(let i=0;i<4;i++)cylinder(b,'steel',-w*.04+i*w*.12,y+1.1,z,1,2.2,.85,16);}
   equipmentCourt(b,-w*.30,h+.2,-d*.02,w*.20,d*.64,5);tags.push('pilot courts','roof services','stepped process frontage');
   break;
  case 28:
   for(const side of [-1,1])line(b,'stone',[[side*w*.46,.4,d*.45],[side*w*.46,h*.35,d*.15],[side*w*.46,h*.92,-d*.33]],.44);
   for(let i=0;i<4;i++)waterWall(b,-w*.26,.25+i*.45,d*.16+i*2.0,w*.22,1.3);
   terrace(b,w*.22,h*.55,d*.23,w*.51,d*.24);tags.push('water terraces','shaped piers','research frontage');
   break;
  case 29:
   canopy(b,w*.23,h*.45,d*.45,w*.48,d*.18,'steel');for(let i=0;i<5;i++){const x=w*.05+i*w*.10;b.box('dark',x,h*.19,d*.455,w*.08,h*.33,.15);b.box('warm',x,h*.38,d*.47,w*.07,.04,.16);}
   plantedEdge(b,w*.20,h*.92,-d*.25,w*.31,d*.26);tags.push('food processing volumes','dispatch frontage','rooftop growing');
   break;
  case 30:
   for(let i=0;i<10;i++){const a=i*Math.PI*2/10,x=Math.sin(a)*w*.125,z=-d*.10+Math.cos(a)*w*.125;line(b,'gold',[[x,.4,z],[x,h*1.06,z]],.11);}
   ribWall(b,0,h*.13,d*.405,w*.68,h*.46,16,'gold',.15);terrace(b,-w*.29,h*.58,d*.18,w*.30,d*.24);terrace(b,w*.29,h*.58,d*.18,w*.30,d*.24);
   tags.push('credential core','frontage fins','stepped research wings');
   break;
  case 31:
   plantedEdge(b,-w*.29,h+.35,d*.05,w*.35,d*.68);terrace(b,w*.25,h*.58,d*.24,w*.40,d*.32);ring(b,'steel',-w*.28,h+.75,-d*.04,w*.11,.18,0);
   canopy(b,w*.05,h*.28,d*.47,w*.44,d*.15,'white');tags.push('resilience courtyard','inset decks','office wing');
   break;
  case 32:
   for(let i=-4;i<=4;i++){const x=i*w*.055,pts=[];for(let j=0;j<=12;j++){const u=j/12;pts.push([x,h*.80+Math.sin(u*Math.PI)*h*.17*(1-Math.abs(i)/6),-d*.31+u*d*.62]);}line(b,i%2?'steel':'gold',pts,.10);}
   arc(b,0,h*.32,d*.47,w*.52,d*.16,.05,Math.PI-.05,24,'steel',.30);ribWall(b,0,.1,d*.39,w*.75,h*.38,18,'copper',.16);
   tags.push('marketplace lattice hall','entry canopy','retail frontage');
   break;
  case 33:
   terrace(b,-w*.33,h*.56,d*.20,w*.28,d*.29);terrace(b,w*.30,h*.48,d*.12,w*.31,d*.26);
   for(let i=0;i<5;i++){const x=-w*.22+i*w*.11;b.box('copper',x,.75,d*.36,w*.08,1.5,.5);b.box('dark',x,1.7,d*.36,w*.08,.45,.52);}
   canopy(b,-w*.08,h*.23,d*.46,w*.43,d*.16,'white');tags.push('learning courtyards','research terraces','social stair frontage');
   break;
  case 34:
   sawtooth(b,-w*.11,h+.15,-d*.12,w*.70,d*.44,5);solarField(b,-w*.24,h+.70,-d*.06,w*.25,d*.66,5);
   for(let i=0;i<5;i++){const x=w*.08+i*w*.06;b.box('steel',x,2.3,d*.28,1.4,4.6,1.1);b.box('dark',x,3.0,d*.295,1.0,1.2,1.15);}
   displayWall(b,w*.34,h*.40,d*.41,w*.18,h*.26);tags.push('energy demonstration frontage','utility hall','control volume');
   break;
  case 35:
   for(const side of [-1,1]){canopy(b,side*w*.36,h*.32,d*.50,w*.22,d*.16,'steel');for(let i=0;i<4;i++){const z=-d*.26+i*d*.18;frame(b,side*w*.37,.2,z,w*.16,h*.42,'stone');}}
   plantedEdge(b,0,.30,d*.17,w*.44,d*.18);plantedEdge(b,0,.30,-d*.20,w*.44,d*.18);
   for(const x of [-w*.18,w*.18])ribWall(b,x,.4,d*.43,w*.20,h*.30,7,'copper',.10);
   tags.push('care courtyards','domestic frontage','low linked roofs');
   break;
  default: throw new Error('Missing reference fidelity detail for '+f.key);
 }
 const group=b.finish(f.key+'-reference-fidelity-detail');
 group.userData.nearDetail=true;
 group.userData.referenceFidelity=true;
 group.userData.referenceSource='CF-'+String(id).padStart(2,'0')+'_Facility_Infographic.png';
 group.userData.criticalDetails=tags;
 return group;
}
