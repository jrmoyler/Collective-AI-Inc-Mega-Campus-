// Program-driven equipment in metres. Hidden fittings are inferred from the
// supplied room schedule, not claimed as surveyed/as-built equipment.
export function specialistKind(name){
 const n=name.toLowerCase();
 if(/kitchen|food processing/.test(n))return 'kitchen';
 if(/clinic pods|patient intake|recovery rooms|care support/.test(n))return 'clinical';
 if(/accessible.home/.test(n))return 'accessible-home';
 if(/soundstage|audio booths|podcast|recording class|motion capture|led volume/.test(n))return 'studio';
 if(/theater|theatre|auditorium|lecture hall|all.hands/.test(n))return 'auditorium';
 if(/switchgear|power distribution|battery interface|battery swap|utility interface/.test(n))return 'electrical';
 if(/liquid cooling|cooling plant|thermal equipment|water treatment|water reuse|water polishing|nutrient plant|circular systems/.test(n))return 'process';
 if(/print farm|electronics bench|bioprinting/.test(n))return 'fabrication';
 if(/vehicle maintenance|drone ground support|maintenance lab/.test(n))return 'maintenance';
 if(/lockers|changing|tool crib|equipment store|restricted storage/.test(n))return 'storage';
 if(/retail|marketplace hall|partner showcase/.test(n))return 'retail';
 if(/indoor sprint/.test(n))return 'performance';
 if(/screening|badge intake|security intake|secure intake/.test(n))return 'security';
 if(/support$|staff services|visitor services/.test(n))return 'support';
 return null;
}
export function furnishSpecialist(k,r,kit){
 const kind=specialistKind(r.name);if(!kind)return false;
 const {taskChair,desk,sofa,shelving}=kit,{x,z,w,d}=r,side=Math.sign(z);
 const xs=[x-w*.28,x+w*.28],back=z+side*d*.22;
 const box=(name,mat,xx,y,zz,ww,hh,dd,rad=.01)=>k.box(name,mat,xx,y,zz,ww,hh,dd,rad);
 if(kind==='kitchen'){
  for(const xx of xs){
   box('stainless preparation bench','steel',xx,.88,back,1.65,.08,.72);
   for(const dx of [-.7,.7])for(const dz of [-.28,.28])box('bench leg','steel',xx+dx,.42,back+dz,.04,.84,.04);
   box('undershelf','steel',xx,.2,back,1.5,.03,.64);
   box('extractor canopy','steel',xx,2.48,back,1.8,.24,.88);
   box('extract duct','steel',xx,3.12,back,.35,1.05,.35);
  }
  box('sink rim','steel',xs[0],.95,back,.65,.035,.48);
  box('sink bowl','graphite',xs[0],.965,back,.53,.018,.36);
  k.bar('tap riser','steel',[xs[0],.94,back+.23],[xs[0],1.22,back+.23],.016);
  k.bar('tap spout','steel',[xs[0],1.22,back+.23],[xs[0],1.22,back+.04],.016);
  for(const dx of [-.3,.3])for(const dz of [-.16,.16])k.ring('induction hob','graphite',xs[1]+dx,.94,back+dz,.12,.012);
  box('oven cabinet','steel',xs[1],.48,back,1.35,.78,.65);box('oven glazing','glass',xs[1],.46,back-side*.335,1.13,.43,.016);
 }else if(kind==='clinical'||kind==='accessible-home'){
  for(const xx of xs){
   box('adjustable bed chassis','steel',xx,.4,back,.77,.3,1.9,.035);
   box('clinical mattress','porcelain',xx,.66,back,.88,.2,2,.07);
   box('pillow','fabric',xx,.81,back+side*.64,.63,.12,.36,.05);
   for(const dx of [-.43,.43])k.bar('bed safety rail','steel',[xx+dx,.78,back-.45],[xx+dx,.78,back+.5],.025);
   for(const dx of [-.31,.31])for(const dz of [-.7,.7])k.cylinder('bed caster','rubber',xx+dx,.18,back+dz,.075,.05,.075,Math.PI/2);
   box('bedside drawer cabinet','oak',xx+.72,.39,back+side*.56,.4,.7,.5,.025);
   if(kind==='clinical'){box('patient monitor','graphite',xx+.72,1.18,back+side*.56,.45,.31,.07);box('vital signs display','display',xx+.72,1.18,back+side*.51,.4,.26,.01);}
  }
  if(kind==='accessible-home'){sofa(k,x,back-side*2.1);k.bar('accessible grab rail','steel',[x-w/2+.16,.85,z],[x-w/2+.16,.85,z+side*1.4],.025);}
 }else if(kind==='studio'){
  const zz=back;
  box('recording desk','oak',x,.76,zz,Math.min(w*.5,2.3),.08,.9,.025);
  for(const dx of [-.75,.75]){box('console pedestal','graphite',x+dx,.36,zz,.16,.72,.66);taskChair(k,x+dx,zz-side*.9,side<0?Math.PI:0);}
  box('mixing console','graphite',x,.85,zz,.8,.12,.46,.025);
  for(let i=0;i<10;i++){box('channel fader track','rubber',x-.32+i*.071,.917,zz,.009,.006,.22,.001);box('channel fader cap','steel',x-.32+i*.071,.926,zz+(i%3)*.036,.035,.015,.03,.002);}
  for(const xx of xs){
   box('studio monitor speaker','graphite',xx,1.19,zz+.15,.3,.48,.26,.03);
   k.cylinder('speaker woofer','rubber',xx,1.16,zz,.10,.025,.10,Math.PI/2);
   k.bar('microphone stand','steel',[xx,.03,zz-side*1.5],[xx,1.45,zz-side*1.5],.012);
   k.bar('microphone boom','steel',[xx,1.45,zz-side*1.5],[xx+.35,1.56,zz-side*1.5],.01);
   k.sphere('microphone capsule','graphite',xx+.36,1.56,zz-side*1.5,.06,.04,.04);
  }
  for(let i=0;i<5;i++)box('acoustic absorption panel','fabric',x-w*.35+i*w*.175,2.1,z+side*(d/2-.17),w*.13,1.7,.09,.02);
 }else if(kind==='auditorium'){
  box('presentation dais','oak',x,.14,back,Math.min(w*.7,4.5),.28,1.7,.02);
  box('lectern base','graphite',x,.7,back,.58,1.0,.46,.025);
  box('lectern controls','display',x,1.23,back,.49,.055,.34,.01);
  for(const xx of xs)for(let row=0;row<3;row++)taskChair(k,xx,z+side*(d*.02-row*.105*d),side<0?Math.PI:0);
 }else if(kind==='electrical'){
  for(const xx of xs)for(const dx of [-.44,.44]){
   box('switchgear enclosure','porcelain',xx+dx,1.05,back,.76,2.1,.75,.018);
   const face=back-side*.39;
   box('switchgear door','steel',xx+dx,1.1,face,.67,1.95,.035,.01);
   box('isolator handle','graphite',xx+dx+.22,1.11,face-side*.045,.04,.22,.04);
   box('electrical meter','display',xx+dx,1.55,face-side*.027,.2,.14,.012);
   for(let j=0;j<6;j++)box('enclosure ventilation','graphite',xx+dx,.3+j*.055,face-side*.025,.45,.015,.008,0);
  }
 }else if(kind==='process'){
  for(const xx of xs){
   k.cylinder('process vessel','steel',xx,1.12,back,.46,1.8);
   k.sphere('vessel domed head','steel',xx,2.02,back,.46,.20,.46);
   for(const dx of [-.32,.32])box('vessel support','steel',xx+dx,.15,back,.08,.3,.4);
   k.bar('process supply pipe','steel',[xx,2.18,back],[xx,3.15,back],.05);
   k.bar('pipe header','steel',[xs[0],3.15,back],[xs[1],3.15,back],.05);
   k.ring('valve handwheel','brass',xx,1.1,back-side*.52,.12,.014,0);
   box('process pump','graphite',xx,.22,back-side*.75,.32,.28,.42,.035);
  }
 }else if(kind==='fabrication'){
  for(const xx of xs){desk(k,xx,back,true);box('enclosed printer chassis','graphite',xx,1.13,back,.56,.62,.55,.02);box('printer safety glazing','glass',xx,1.15,back-side*.29,.48,.48,.012,0);box('printer build plate','steel',xx,.99,back,.4,.025,.4);k.bar('printer gantry','steel',[xx-.19,1.25,back],[xx+.19,1.25,back],.018);box('extruder carriage','brass',xx,1.22,back,.09,.11,.1);}
 }else if(kind==='maintenance'){
  for(const xx of xs){box('service lift deck','steel',xx,.35,back,1.35,.14,2.2,.02);for(const dx of [-.58,.58])box('lift support','graphite',xx+dx,.15,back,.11,.3,1.5);box('rolling tool cabinet','graphite',xx, .55,back+side*1.5,.9,1.0,.5,.025);for(let j=0;j<5;j++){box('tool drawer','steel',xx,.2+j*.17,back+side*1.23,.8,.14,.025);box('tool drawer pull','brass',xx,.21+j*.17,back+side*1.20,.56,.02,.035);}}
 }else if(kind==='storage'){
  for(const xx of xs)for(const dx of [-.45,0,.45]){box('individual locker','graphite',xx+dx,.95,back,.42,1.9,.55,.015);box('locker door','steel',xx+dx,.97,back-side*.29,.38,1.8,.025);box('locker pull','brass',xx+dx+.12,1,back-side*.31,.025,.15,.025);}
 }else if(kind==='performance'){
  for(const xx of xs){box('sprint training surface','leaf',xx,.05,z,Math.min(w*.24,1.5),.025,d*.72,0);for(const dx of [-.55,.55])box('sprint lane line','porcelain',xx+dx,.068,z,.035,.005,d*.72,0);}
 }else if(kind==='security'){
  desk(k,xs[0],back);box('screening portal left','graphite',xs[1]-.5,1.12,back,.15,2.24,.3);box('screening portal right','graphite',xs[1]+.5,1.12,back,.15,2.24,.3);box('screening portal header','graphite',xs[1],2.25,back,1.15,.17,.3);box('screening indicator','blue',xs[1],2.26,back-side*.16,.34,.06,.02);
 }else if(kind==='retail'){
  for(const xx of xs){shelving(k,xx,back,false,side);box('merchandise display island','oak',xx,.6,z,.9,1.2,.8,.025);box('display vitrine','glass',xx,1.43,z,.9,.46,.8,.008);for(const dx of [-.2,.2])box('sample product','porcelain',xx+dx,1.27,z,.16,.14,.25,.015);}
 }else{
  for(const xx of xs){shelving(k,xx,back,false,side);box('service counter','oak',xx,.86,z,1.3,.08,.64,.025);box('service cabinet','plaster',xx,.41,z,1.2,.78,.56,.015);box('shared printer','porcelain',xx,1.06,z,.48,.3,.38,.025);box('printer control screen','display',xx,1.16,z-side*.2,.18,.08,.015);}
 }
 return kind;
}
