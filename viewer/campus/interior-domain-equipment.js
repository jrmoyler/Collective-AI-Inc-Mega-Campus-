// Domain-specific equipment inferred from room function. These are actual 3D
// assemblies, not imagery; hidden source detail remains explicitly inferred.
export function domainKind(name){
 const n=name.toLowerCase();
 if(/led volume|soundstage|motion capture/.test(n))return 'stage';
 if(/faraday/.test(n))return 'shielded';
 if(/cold storage vault|credential|identity operations|trust systems/.test(n))return 'identity';
 if(/evidence|contract operations|policy ledger/.test(n))return 'evidence';
 if(/behavior booths|cognitive load|interview rooms/.test(n))return 'behavior';
 if(/aerospace assembly|integration test/.test(n))return 'aerospace';
 if(/cross.dock|racked inventory|pick.pack|receiving|distribution staging|freight/.test(n))return 'logistics';
 if(/algae/.test(n))return 'algae';
 if(/accessible.home/.test(n))return 'accessible-home';
 if(/soft goods/.test(n))return 'textiles';
 if(/safety test lanes|kinetic systems test|paving sensor/.test(n))return 'test-track';
 return null;
}
export function furnishDomain(k,r,{desk,taskChair,sofa,shelving}){
 const kind=domainKind(r.name);if(!kind)return false;
 const {x,z,w,d}=r,side=Math.sign(z),back=z+side*d*.24;
 const box=(n,m,xx,y,zz,ww,hh,dd,rad=.01)=>k.box(n,m,xx,y,zz,ww,hh,dd,rad);
 if(kind==='stage'){
  const led=/led volume/i.test(r.name),stageW=led?Math.min(w-2,12.192):Math.min(w*.7,13),stageD=led?Math.min(d-2,18.288):Math.min(d*.6,12),zz=led?z:z+side*d*.12;
  box('sprung studio stage','graphite',x,.08,zz,stageW,.16,stageD,.008);
  for(const bank of [-1,1]){const xx=x+bank*stageW*.49;k.bar('lighting truss column','steel',[xx,.16,zz+side*stageD*.4],[xx,3.45,zz+side*stageD*.4],.055);}
  k.bar('stage lighting truss','steel',[x-stageW*.49,3.45,zz+side*stageD*.4],[x+stageW*.49,3.45,zz+side*stageD*.4],.055);
  for(let i=0;i<5;i++){const xx=x+(i-2)*stageW*.18;box('studio light yoke','steel',xx,3.18,zz+side*stageD*.4,.4,.36,.12);k.cylinder('stage fresnel housing','graphite',xx,3.06,zz+side*stageD*.4,.16,.3,.16,Math.PI/2);}
  if(/led volume/i.test(r.name))for(let i=0;i<9;i++){const angle=(i-4)*.12,xx=x+Math.sin(angle)*stageW*.82,wall=zz+side*(stageD*.4-Math.abs(Math.sin(angle))*stageD*.12);box('LED volume structural panel','graphite',xx,1.72,wall,stageW*.1,3.04,.12);box('LED volume emissive tile','display',xx,1.72,wall-side*.075,stageW*.095,2.95,.016);}
  else if(/motion capture/i.test(r.name)){for(const dx of [-stageW*.44,stageW*.44])for(const dz of [-stageD*.43,stageD*.43]){k.bar('optical camera mast','steel',[x+dx,.2,zz+dz],[x+dx,2.8,zz+dz],.025);box('motion tracking camera','graphite',x+dx,2.85,zz+dz,.25,.16,.17);box('tracking lens','glass',x+dx,2.85,zz+dz-side*.10,.08,.08,.024);}}
  else box('studio cyclorama back','plaster',x,1.65,zz+side*stageD*.48,stageW,3.3,.09,0);
  for(const bank of [-1,1]){const xx=x+bank*(stageW*.4);for(const dx of [-.3,.3])k.bar('camera tripod leg','steel',[xx,1.35,z-side*d*.28],[xx+dx,.04,z-side*d*.28+.3],.018);box('production camera body','graphite',xx,1.5,z-side*d*.28,.32,.3,.5,.025);k.cylinder('camera lens','graphite',xx,1.5,z-side*d*.28+side*.34,.11,.3,.11,Math.PI/2);}
 }else if(kind==='shielded'){
  const ww=Math.min(w*.68,6),dd=Math.min(d*.48,6),zz=back;
  for(const bank of [-1,1]){box('RF shield sidewall','steel',x+bank*ww/2,1.6,zz,.06,3.2,dd);for(let j=0;j<8;j++)box('RF copper seam','brass',x+bank*(ww/2-.045),1.6,zz-dd*.45+j*dd*.12,.02,3.15,.012,0);}
  box('RF shield roof','steel',x,3.2,zz,ww,.06,dd);box('RF rear panel','steel',x,1.6,zz+side*dd/2,ww,3.2,.06);
  for(const bank of [-1,1])box('RF doorway front','steel',x+bank*(ww/4+.4),1.6,zz-side*dd/2,ww/2-.8,3.2,.06);
  desk(k,x,zz,true);box('spectrum analyzer','graphite',x,.98,zz,.6,.35,.38,.02);box('analyzer screen','display',x,1,zz-side*.2,.48,.23,.016);
 }else if(kind==='identity'||kind==='evidence'){
  const cols=Math.min(6,Math.max(2,Math.floor((w-2)/1.5)));
  for(let i=0;i<cols;i++){const xx=x+(i-(cols-1)/2)*1.1;box(kind==='identity'?'secure credential cabinet':'sealed evidence cabinet','graphite',xx,1.15,back,.95,2.3,.62,.018);for(let row=0;row<5;row++){box('individual secure compartment','steel',xx,.28+row*.43,back-side*.33,.87,.37,.025);box('compartment lock','brass',xx+.32,.29+row*.43,back-side*.352,.036,.045,.018);}}
  desk(k,x-w*.25,z-side*d*.12);box('chain of custody transfer counter','porcelain',x+w*.23,.9,z,1.8,.07,.9,.012);for(const dx of [-.7,.7])box('transfer counter leg','steel',x+w*.23+dx,.44,z,.05,.88,.7);box('credential scanner','graphite',x+w*.23,1.07,z,.35,.28,.28,.025);box('scanner optical platen','glass',x+w*.23,1.22,z,.28,.02,.2);
 }else if(kind==='behavior'){
  const cols=Math.min(3,Math.max(1,Math.floor((w-2)/3.2)));
  for(let i=0;i<cols;i++){const xx=x+(i-(cols-1)/2)*3.2;desk(k,xx,back);for(const dx of [-1.15,1.15])box('behavior booth acoustic partition','fabric',xx+dx,1.25,back,.09,2.5,2.6,.014);box('booth rear acoustic panel','fabric',xx,1.25,back+side*1.3,2.3,2.5,.08,.014);box('behavioral camera','graphite',xx,1.6,back+side*.1,.12,.07,.07);}
  box('observation console','oak',x,.76,z-side*d*.25,Math.min(3,w*.6),.08,.75,.02);taskChair(k,x,z-side*d*.25-.8,Math.PI);
 }else if(kind==='aerospace'){
  const length=Math.min(d*.58,11),zz=z+side*d*.1,rad=Math.min(w*.15,1.05);
  k.cylinder('aerospace fuselage test article','porcelain',x,1.6,zz,rad,length,rad*.7,Math.PI/2);
  k.sphere('rounded payload nose','porcelain',x,1.6,zz-length/2,rad*.7,rad*.7,rad*1.3);
  for(const dz of [-length*.3,length*.3]){box('airframe support cradle','graphite',x,.5,zz+dz,rad*2.4,1,.32,.025);box('cradle padded saddle','rubber',x,1,zz+dz,rad*2.2,.16,.35,.02);}
  for(const dx of [-rad*2.1,rad*2.1]){box('assembly access platform','steel',x+dx,.45,zz,.75,.09,length*.9);for(const dz of [-length*.36,length*.36])box('platform support','steel',x+dx,.2,zz+dz,.05,.4,.6);}
  desk(k,x+w*.32,back,true);
 }else if(kind==='logistics'){
  const banks=Math.min(4,Math.max(2,Math.floor((w-3)/3.5))),rows=Math.min(4,Math.max(1,Math.floor((d-4)/4)));
  for(let a=0;a<banks;a++)for(let b=0;b<rows;b++){const xx=x+(a-(banks-1)/2)*3.2,zz=z+side*(b-(rows-1)/2)*3.6;for(const dx of [-1,1])for(const dz of [-.48,.48])box('warehouse rack column','steel',xx+dx,1.65,zz+dz,.08,3.3,.08);for(let level=0;level<3;level++){const yy=.16+level*1.03;box('warehouse rack beam','graphite',xx,yy,zz,2.1,.1,1.05);for(const dx of [-.48,.48]){box('timber shipping pallet','oak',xx+dx,yy+.11,zz,.84,.12,.8,.004);box('sealed transit carton','book',xx+dx,yy+.49,zz,.77,.66,.72,.008);box('carton label','porcelain',xx+dx,yy+.55,zz-side*.365,.22,.12,.006,0);}}}
 }else if(kind==='algae'){
  const cols=Math.min(6,Math.max(2,Math.floor((w-2)/2)));
  for(let i=0;i<cols;i++){const xx=x+(i-(cols-1)/2)*1.5;k.cylinder('photobioreactor tube','glass',xx,1.45,back,.25,2.5);k.cylinder('algae culture column','leaf',xx,1.4,back,.22,2.35);for(const yy of [.2,2.7])k.cylinder('bioreactor end cap','steel',xx,yy,back,.28,.09);k.bar('bioreactor return pipe','steel',[xx,2.76,back],[xx,3.2,back],.028);}
  k.bar('algae supply header','steel',[x-(cols-1)*.75,3.2,back],[x+(cols-1)*.75,3.2,back],.04);desk(k,x,z-side*d*.23,true);
 }else if(kind==='accessible-home'){
  // Domestic mock-up has separate sleeping, lounge, food-prep, accessible bathing zones.
  const left=x-w*.23,right=x+w*.23;
  box('domestic bed frame','oak',left,.3,back,1.55,.36,2.05,.04);k.cushion('domestic mattress','fabric',left,.58,back,1.52,.22,2);for(const dx of [-.38,.38])k.cushion('domestic pillow','porcelain',left+dx,.74,back+side*.65,.6,.14,.38);
  sofa(k,right,back);k.cylinder('home coffee table','oak',right,.4,back-side*1.2,.55,.08);k.cylinder('home table support','oak',right,.19,back-side*1.2,.16,.34);
  box('domestic partition','plaster',x,1.35,back,.12,2.7,d*.35,0);
  box('accessible kitchen counter','porcelain',left,.79,z-side*d*.23,2.2,.07,.65,.02);for(const dx of [-.8,.8])box('accessible cabinet','oak',left+dx,.37,z-side*d*.23,.45,.72,.6,.015);
  box('roll in shower tray','porcelain',right,.04,z-side*d*.25,1.6,.06,1.6,.01);k.bar('accessible shower grab bar','steel',[right-.65,.85,z-side*d*.25],[right+.65,.85,z-side*d*.25],.025);k.bar('shower riser','steel',[right,.9,z-side*d*.25],[right,2.1,z-side*d*.25],.016);k.cylinder('shower rose','steel',right,2.1,z-side*d*.25,.11,.03);
 }else if(kind==='textiles'){
  const cols=Math.min(4,Math.max(2,Math.floor((w-2)/3)));
  for(let i=0;i<cols;i++){const xx=x+(i-(cols-1)/2)*2.6;box('sewing worktable','oak',xx,.77,back,1.8,.08,.9);for(const dx of [-.7,.7])box('sewing table support','steel',xx+dx,.37,back,.06,.74,.7);box('sewing machine base','porcelain',xx,.87,back,.48,.1,.3,.025);box('sewing machine head','porcelain',xx+.12,1.1,back,.16,.42,.23,.025);box('sewing machine arm','porcelain',xx-.04,1.25,back,.4,.12,.23,.025);k.bar('sewing needle','steel',[xx-.21,.92,back],[xx-.21,1.2,back],.005);taskChair(k,xx,back-.8,Math.PI);}
  box('cutting table','porcelain',x,.91,z-side*d*.15,Math.min(w*.7,5),.12,2);for(const dx of [-1.7,1.7])box('cutting table leg','steel',x+dx,.43,z-side*d*.15,.08,.86,1.8);
 }else if(kind==='test-track'){
  for(const bank of [-1,1]){const xx=x+bank*w*.23;box('instrumented testing lane','rubber',xx,.035,z,w*.25,.04,d*.76,0);for(const dx of [-w*.12,w*.12])box('testing lane boundary','porcelain',xx+dx,.059,z,.05,.006,d*.76,0);for(let j=0;j<5;j++){box('embedded sensor tile','steel',xx,.065,z+(j-2)*d*.12,w*.21,.02,d*.08,.004);box('measurement bollard','graphite',xx+w*.14,.58,z+(j-2)*d*.12,.10,1.16,.10,.015);}}
 }
 return kind;
}
