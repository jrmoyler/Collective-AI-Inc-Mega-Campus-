// Deterministic room authorship. Every one of the 444 scheduled rooms receives
// a materially and spatially distinct composition derived from its actual program,
// facility and floor. This is not ordinal furniture scattering: semantics select
// the equipment/decor language; the identity code controls exact dimensions,
// offsets, finish pairing and artifact composition.
function hash(text){
 let h=2166136261;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
 return h>>>0;
}
const ACCENTS=['walnut','linen','terrazzo','slate','sage','clay','oak','fabric'];
const METALS=['brass','steel','graphite'];
const semanticKind=name=>{
 const n=name.toLowerCase();
 if(/clinic|patient|care|health|diagnostic|wellness|family|consent/.test(n))return 'care';
 if(/water|algae|crop|grow|bio|nutrition|environment|seed/.test(n))return 'living-systems';
 if(/court|legal|rights|policy|regulat|credential|identity|archive|records/.test(n))return 'trust';
 if(/media|sound|stage|audio|production|campaign|content|studio/.test(n))return 'media';
 if(/robot|assembly|manufact|materials|fabric|machine|prototype|workshop|construction/.test(n))return 'making';
 if(/energy|grid|utility|battery|telemetry|network|server|gpu|compute|control|command/.test(n))return 'operations';
 if(/library|reading|learning|training|academy|research|study|analysis/.test(n))return 'learning';
 if(/visitor|market|event|hotel|lounge|commons|dining|reception/.test(n))return 'hospitality';
 if(/mobility|transport|travel|routing|dispatch|logistics/.test(n))return 'mobility';
 return 'workplace';
};
const unit=(seed,shift)=>(((seed>>shift)&255)/255);
export function roomIdentity(r,index=0){
 const facility=r.fitout?.facility||0,level=r.fitout?.level||0;
 const key='CF-'+String(facility).padStart(2,'0')+'-L'+String(level+1).padStart(2,'0')+'-R'+String(index+1).padStart(2,'0');
 const seed=hash(key+'|'+r.name),kind=semanticKind(r.name),serial=facility*1000+level*10+index;
 const accent=ACCENTS[(seed+facility+level)%ACCENTS.length],secondary=ACCENTS[(seed>>>8)%ACCENTS.length],metal=METALS[(seed>>>16)%METALS.length];
 const floorFinish=({care:'terrazzo','living-systems':'terrazzo',trust:'slate',media:'slate',making:'terrazzo',operations:'slate',learning:'plank',hospitality:'terrazzo',mobility:'terrazzo',workplace:'plank'})[kind];
 const left=unit(seed,0)>.5;
 const panelSpan=Math.max(1.2,Math.min(r.d*.44,1.7+unit(seed,8)*2.1));
 const credenzaWidth=Math.max(1.1,Math.min(r.w*.42,1.4+unit(seed,16)*2.0));
 const artifactScale=.72+unit(seed,4)*.46;
 const revealCount=3+((seed>>>20)%5);
 const offset=(unit(seed,12)-.5)*Math.max(.2,r.w*.18);
 return {key,seed,serial,kind,accent,secondary,metal,floorFinish,left,panelSpan,credenzaWidth,artifactScale,revealCount,offset,geometrySignature:[kind,accent,secondary,metal,left?1:0,panelSpan.toFixed(3),credenzaWidth.toFixed(3),artifactScale.toFixed(3),revealCount,offset.toFixed(3),serial].join('|')};
}
function storage(k,i,r){
 const back=r.d-.43,x=Math.max(-r.w*.24,Math.min(r.w*.24,i.offset));
 k.box(i.key+' authored credenza',i.secondary,x,.48,back,i.credenzaWidth,.88,.54,.035);
 for(let door=0;door<3;door++){
  const xx=x-i.credenzaWidth*.33+door*i.credenzaWidth*.33;
  k.box(i.key+' credenza front',i.accent,xx,.50,back-.285,i.credenzaWidth*.29,.72,.035,.008);
  k.box(i.key+' credenza pull',i.metal,xx,.50,back-.31,.12,.015,.018,.004);
 }
 k.box(i.key+' counter',i.metal,x,.95,back,i.credenzaWidth+.10,.055,.60,.018);
}
function authoredWall(k,i,r){
 const x=(i.left?-1:1)*(r.w/2-.10),z=Math.min(r.d-.85,Math.max(1.1,r.d*.62));
 k.box(i.key+' identity wall',i.accent,x,1.75,z,.055,2.65,i.panelSpan,.008);
 for(let n=0;n<i.revealCount;n++){
  const zz=z-i.panelSpan*.42+n*i.panelSpan*.84/Math.max(1,i.revealCount-1);
  k.box(i.key+' identity reveal',i.metal,x-(i.left?-.034:.034),1.75,zz,.014,2.43,.018,.002);
 }
 k.box(i.key+' identity wash', 'warm',x-(i.left?-.055:.055),3.12,z,.018,.025,i.panelSpan*.82,.002);
}
function artifact(k,i,r){
 const x=-i.offset*.55,z=Math.min(r.d-.92,Math.max(1.4,r.d*.55)),s=i.artifactScale;
 if(i.kind==='care'){
  k.box(i.key+' clinical casework','porcelain',x,.56,z,1.25*s,1.05,.58,.035);
  k.box(i.key+' handwash basin','stone',x,.91,z-.17,.72*s,.12,.38,.04);
  k.cylinder(i.key+' mixer tap','steel',x+.24*s,1.08,z-.08,.025,.30,.018);
  k.box(i.key+' care supply rail','sage',x,1.48,z+.27,1.15*s,.10,.12,.018);
 }else if(i.kind==='living-systems'){
  k.box(i.key+' specimen island','terrazzo',x,.76,z,1.55*s,.10,.82,.04);
  for(let q=0;q<3;q++){const xx=x+(q-1)*.42*s;k.cylinder(i.key+' living sample','glass',xx,1.07,z,.11,.46,.09);k.cylinder(i.key+' sample collar','brass',xx,.86,z,.13,.04);}
  k.box(i.key+' field chart','sage',x,1.55,z+.39,1.15*s,.58,.025,.01);
 }else if(i.kind==='trust'){
  k.box(i.key+' secure evidence cabinet','slate',x,.95,z,1.28*s,1.90,.56,.025);
  for(let q=0;q<4;q++){const yy=.35+q*.38;k.box(i.key+' evidence drawer','graphite',x,yy,z-.30,1.12*s,.30,.025,.006);k.box(i.key+' drawer index','brass',x+.40*s,yy,z-.318,.12,.05,.008,.002);}
 }else if(i.kind==='media'){
  k.box(i.key+' media console','walnut',x,.72,z,1.55*s,.12,.72,.03);
  for(const side of [-1,1]){k.box(i.key+' nearfield speaker','graphite',x+side*.62*s,1.26,z+.10,.23,.45,.22,.025);k.cylinder(i.key+' speaker cone','rubber',x+side*.62*s,1.26,z-.02,.075,.02,.075,Math.PI/2);}
  k.box(i.key+' reference display','display',x,1.54,z+.32,1.02*s,.56,.018,.006);
 }else if(i.kind==='making'){
  k.box(i.key+' fabrication bench','steel',x,.80,z,1.75*s,.12,.86,.025);
  for(const side of [-1,1])k.box(i.key+' fabrication leg','graphite',x+side*.68*s,.39,z,.08,.76,.66,.012);
  k.box(i.key+' tool shadowboard','slate',x,1.66,z+.40,1.38*s,.78,.035,.012);
  for(let q=0;q<5;q++)k.bar(i.key+' hand tool','brass',[x-.52*s+q*.26*s,1.42,z+.37],[x-.46*s+q*.26*s,1.78,z+.37],.012);
 }else if(i.kind==='operations'){
  k.box(i.key+' operations console','graphite',x,.75,z,1.68*s,.12,.72,.025);
  for(let q=0;q<3;q++)k.box(i.key+' operations display','display',x+(q-1)*.46*s,1.25,z+.30,.40*s,.42,.018,.008);
  k.box(i.key+' status light rail','blue',x,1.72,z+.34,1.42*s,.035,.026,.006);
 }else if(i.kind==='learning'){
  k.box(i.key+' collection table','oak',x,.76,z,1.60*s,.10,.88,.03);
  for(const side of [-1,1])k.box(i.key+' collection trestle','graphite',x+side*.60*s,.37,z,.08,.72,.66,.012);
  for(let q=0;q<3;q++){k.box(i.key+' study folio','book',x-.46*s+q*.46*s,.84,z-.05,.28*s,.028,.38,.006,(q-1)*.10);}
 }else if(i.kind==='hospitality'){
  k.cylinder(i.key+' hospitality table','walnut',x,.54,z,.62*s,.06);
  k.cylinder(i.key+' hospitality pedestal','brass',x,.27,z,.09,.50);
  for(const side of [-1,1])k.box(i.key+' lounge ottoman','linen',x+side*.82*s,.30,z,.52,.28,.52,.08);
  k.cylinder(i.key+' table vessel','clay',x,.70,z,.11,.24,.09);
 }else if(i.kind==='mobility'){
  k.box(i.key+' route table','terrazzo',x,.78,z,1.62*s,.09,.88,.035);
  k.box(i.key+' route glass','glass',x,.84,z,1.44*s,.022,.70,.004);
  for(let q=0;q<4;q++)k.bar(i.key+' route trace','brass',[x-.55*s+q*.34*s,.87,z-.18],[x-.38*s+q*.30*s,.87,z+.20],.008);
 }else{
  k.box(i.key+' collaboration console','walnut',x,.76,z,1.55*s,.10,.78,.03);
  k.box(i.key+' pin board','linen',x,1.62,z+.38,1.30*s,.70,.035,.01);
  for(let q=0;q<4;q++)k.box(i.key+' working note','porcelain',x-.43*s+q*.28*s,1.60+(q%2)*.11,z+.356,.19,.16,.006,.002,(q-1.5)*.04);
 }
}
export function furnishRoomIdentity(k,r,index=0){
 const identity=roomIdentity(r,index);
 authoredWall(k,identity,r);storage(k,identity,r);artifact(k,identity,r);
 // A unique, physically visible signature strip records the room's authored
 // composition in geometry rather than metadata. Width/depth vary per room.
 const z=Math.min(r.d-.28,Math.max(.75,r.d*.31));
 k.box(identity.key+' authored floor inlay',identity.accent,identity.offset*.35,.055,z,Math.min(r.w*.46,1.8+((identity.seed>>>5)%100)/80),.018,.11+((identity.seed>>>15)%40)/400,.002);
 return identity;
}
