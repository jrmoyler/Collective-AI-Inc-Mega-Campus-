// Hidden research fittings are inferred from the named program, not copied from
// an unrelated wet laboratory. The register remains the room-name authority.
export const RESEARCH_INSTRUMENTS={
 2:'network',5:'media',6:'media',7:'electronics',8:'robotics',9:'electronics',10:'materials',
 11:'botany',12:'biomedical',13:'wearable',14:'behavior',15:'biometric',16:'electronics',
 17:'materials',18:'mobility',19:'records',20:'network',21:'energy',24:'kinetic',25:'bioenergy',
 26:'aerospace',27:'materials',28:'water',29:'nutrition',30:'identity',31:'risk',32:'commerce',
 33:'workforce',34:'energy',35:'care',1:'strategy',3:'risk',4:'learning',22:'security',23:'care',
};
const dryRooms=/^(Research desks|Platform R&D|Routing lab|Telemetry studio|Infrastructure lab|Conversion lab|Offer testing|Campaign analytics|Crop analytics|Environmental lab|Healthtech work|Bio-digital lab|Wearable intake|Wearable streams|Data work|Longevity research|Analysis lab|Research offices|Prototype testing|Cognitive load lab|Anonymized data|Biometric analysis|Coach review|Inspection hardware|Travel devices|Visa intelligence|Housing intelligence|Contract automation|Network lab|Translation QA|Spectrum monitoring|Antenna systems|Paving sensor lab|Telemetry work|Data analysis|Device validation|Bioenergy research|Analysis labs|Materials research|Characterization|Testing lab|Water analysis|Water science|Environmental data|Process analysis|Nutrition research|Quality lab|Analysis|Credential lab|Integration lab|Resilience modeling|Insurance research|Analytics teams|Risk research|Model validation|Commerce lab|Marketplace research|Organization lab|Organizational research|Workforce analytics|Team systems|Energy modeling|Analysis teams|Research rooms|Control visualization|Equipment lab|Integration testing)$/;
export function researchInstrument(r){
 if(!dryRooms.test(r.name))return null;
 const facility=r.fitout?.facility;
 return RESEARCH_INSTRUMENTS[facility]||null;
}
// An instrument assembly occupies a declared 1.1 x .65 m bench envelope.
// It includes working interfaces and connections, not a label on a generic box.
export function researchInstrumentGeometry(k,type,x,z,y=.83){
 const box=(n,m,xx,yy,zz,w,h,d,r=.01)=>k.box(n,m,x+xx,y+yy,z+zz,w,h,d,r);
 const screen=(xx=0,yy=.36,zz=.15,w=.5,h=.30)=>{box('instrument monitor bezel','graphite',xx,yy,zz,w+.04,h+.04,.07);box('instrument monitor screen','instrumentDisplay',xx,yy,zz-.042,w,h,.012,.002);};
 const tube=(n,a,b,r=.018)=>k.bar(n,'steel',[x+a[0],y+a[1],z+a[2]],[x+b[0],y+b[1],z+b[2]],r);
 if(['wearable','biometric','care','biomedical','behavior'].includes(type)){
  box('physiology acquisition base','porcelain',0,.04,0,.92,.08,.56,.025);
  box('acquisition interface','graphite',.3,.18,.08,.28,.22,.24);screen(.3,.22,-.052,.21,.13);
  for(const xx of [-.30,-.06]){k.ring('wearable sensor band','rubber',x+xx,y+.14,z-.03,.095,.018,Math.PI/2);box('wearable optical sensor','glass',xx,.16,-.12,.075,.035,.045,.009);tube('sensor lead',[xx,.10,.04],[.2,.10,.08],.006);}
  if(type==='behavior'){box('gaze tracker mast','steel',-.34,.32,.19,.035,.57,.035);box('binocular gaze tracker','graphite',-.34,.61,.18,.30,.10,.07);for(const dx of [-.42,-.26])box('gaze camera lens','glass',dx,.61,.137,.035,.035,.006,.001);}
 }else if(['materials','aerospace','electronics','robotics','kinetic'].includes(type)){
  box('metrology granite base','graphite',0,.04,0,.98,.08,.58);
  for(const xx of [-.4,.4])box('metrology gantry column','steel',xx,.34,.16,.07,.64,.08);
  box('metrology cross slide','steel',0,.66,.16,.88,.08,.10);
  box('measurement carriage','porcelain',.12,.59,.14,.18,.17,.16);
  tube('measurement probe',[.12,.52,.14],[.12,.20,.14],.009);
  box('specimen platen','steel',.06,.13,.02,.42,.04,.34);
  if(type==='electronics'||type==='robotics'){
   box('circuit specimen','leaf',.06,.16,.02,.34,.018,.25,.002);
   for(const xx of [-.03,.10])for(const zz of [-.04,.06])box('board component','graphite',xx,.18,zz,.07,.025,.045,.002);
  }else for(const xx of [-.1,.1])box('material coupon','porcelain',xx,.18,.02,.13,.065,.20,.006);
  screen(-.32,.27,-.20,.22,.15);
 }else if(['water','bioenergy','nutrition','botany'].includes(type)){
  box('sample carousel base','porcelain',0,.05,0,.96,.10,.60,.025);
  k.cylinder('sample carousel','steel',x-.15,y+.14,z,.22,.09);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,xx=x-.15+Math.cos(a)*.16,zz=z+Math.sin(a)*.16;k.cylinder('sample cuvette','glass',xx,y+.28,zz,.034,.23);k.cylinder('cuvette cap','blue',xx,y+.40,zz,.038,.025);}
  box('spectrometry optical head','porcelain',.29,.30,.10,.24,.50,.31,.02);screen(.29,.37,-.062,.18,.13);
  tube('sampling arm',[.29,.56,.10],[-.12,.56,.10]);tube('sampling needle',[-.12,.56,.10],[-.12,.40,.10],.005);
  if(type==='botany')for(const dx of [-.25,-.12,0])k.leaf('botanical sample',x+dx,y+.19,z-.18,.12,dx*4);
 }else if(['network','energy','security'].includes(type)){
  box('test rack frame','graphite',0,.34,.05,.92,.68,.45);
  for(let row=0;row<3;row++){box('bench instrument module','steel',0,.13+row*.20,-.184,.82,.17,.035);screen(-.19,.13+row*.2,-.207,.22,.10);for(const xx of [.08,.20,.32])k.cylinder('test terminal','brass',x+xx,y+.13+row*.2,z-.213,.018,.018,.018,Math.PI/2);}
  tube('test patch lead',[.08,.13,-.24],[.20,.53,-.24],.006);
 }else if(['identity','records'].includes(type)){
  box('document capture platen','graphite',-.12,.035,0,.63,.07,.50);box('capture glass','glass',-.12,.077,0,.52,.012,.40,.002);
  tube('document camera riser',[.31,.05,.2],[.31,.66,.2]);tube('camera overarm',[.31,.66,.2],[-.12,.66,.2]);
  box('document camera','porcelain',-.12,.62,.12,.16,.13,.22);box('document camera lens','glass',-.12,.547,.04,.07,.018,.07);
  if(type==='identity'){box('credential card cradle','porcelain',-.12,.094,0,.18,.025,.13);box('unissued credential','blue',-.12,.11,0,.086,.005,.054,.001);}
  else box('document folio','book',-.12,.093,0,.30,.02,.38,.002);
 }else{
  // Analytical/social-science programs use collaboration tools, not fume hoods.
  box('pen display stand','steel',0,.12,.12,.38,.24,.12);
  const tablet=box('analysis pen display','graphite',0,.29,.04,.75,.45,.045,.016);tablet.rotation.x=-.20;
  const face=box('analysis pen display surface','instrumentDisplay',0,.294,.014,.69,.39,.009,.002);face.rotation.x=-.20;
  box('drawing stylus','brass',.43,.025,-.15,.009,.009,.18,.002);
  if(type==='mobility'){box('field terminal charging dock','porcelain',-.45,.12,.12,.16,.24,.19);box('portable field terminal','graphite',-.45,.25,.12,.11,.22,.05);}
  else if(type==='media'){for(const xx of [-.45,.45]){box('reference monitor speaker','graphite',xx,.20,.20,.16,.4,.17);k.cylinder('speaker driver','rubber',x+xx,y+.18,z+.104,.06,.014,.06,Math.PI/2);}}
 }
}
export function furnishResearch(k,r,{taskChair}){
 const type=researchInstrument(r);if(!type)return false;
 const {x,z,w,d}=r,cols=Math.max(1,Math.min(3,Math.floor((w-2)/3.4))),rows=Math.max(1,Math.min(2,Math.floor((d-4)/3.8)));
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const xx=x+(col-(cols-1)/2)*3.2,zz=z+(row-(rows-1)/2)*3.8+.4;
  // Lab desk has open worktop, real frame and task seat, without an office PC.
  k.box('research worktop','porcelain',xx,.77,zz,1.8,.07,.82,.027);
  for(const dx of [-.74,.74]){k.box('research bench frame','steel',xx+dx,.38,zz,.06,.71,.60,.012);k.box('bench leveling foot','rubber',xx+dx,.04,zz,.10,.045,.64,.009);}
  k.box('research cable tray','graphite',xx,.64,zz+.28,1.4,.09,.12,.008);
  taskChair(k,xx,zz-.84,Math.PI);researchInstrumentGeometry(k,type,xx,zz);
 }
 // Program-specific specimen/field kit storage, with doors and individual pulls.
 const zz=z+d/2-.47;
 for(const bank of [-1,1]){
  const xx=x+bank*w*.27;k.box(type+' storage carcass','porcelain',xx,.90,zz,1.3,1.8,.65,.015);
  for(const dx of [-.31,.31]){k.box(type+' storage door','porcelain',xx+dx,.92,zz-.34,.60,1.68,.035,.007);k.bar('storage door pull','steel',[xx+dx-bank*.2,.83,zz-.377],[xx+dx-bank*.2,1.02,zz-.377],.009);}
 }
 return type;
}
