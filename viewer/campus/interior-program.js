// Inferred fit-out, explicitly separate from the source six-room schedules.
// Capacity and adjacency follow the activity, not a random seed or room ordinal.
export function roomDemand(name){
 const n=name.toLowerCase();
 if(/support|intake|lockers|tool crib|equipment store|archive/.test(n))return .72;
 if(/assembly|soundstage|volume|data hall|terminal|growing|auditorium|food hall|forum|marketplace|sprint/.test(n))return 1.65;
 if(/lab|research|workshop|studio|collection|learning|training|processing/.test(n))return 1.2;
 if(/private|consent|interview|consultation|offices|review/.test(n))return .9;
 return 1;
}
export function fitoutProfile(name,facility=0,level=0){
 const n=name.toLowerCase();
 let arrangement='team';
 if(/command|control|monitoring|dispatch|telemetry|routing|watchtower|grid intelligence/.test(n))arrangement='control';
 else if(/executive|chief|leadership|treasury|finance/.test(n))arrangement='executive';
 else if(/consult|private|interview|consent|patient|family|care/.test(n))arrangement='consultation';
 else if(/workshop|strategy|project|design|prototype|planning|scenario|collaboration/.test(n))arrangement='project';
 else if(/quiet|reading|study|archive|library|collection/.test(n))arrangement='study';
 else if(/lab|analysis|research|test|validation|characterization|sample|science/.test(n))arrangement='laboratory';
 else if(/assembly|manufact|receiving|processing|inventory|pack|freight|materials|foundry/.test(n))arrangement='production';
 const technical=['control','laboratory','production'].includes(arrangement)||/cooling|utility|switchgear|battery|network|gpu|server|water treatment|grow|crop/.test(n);
 const privateRoom=arrangement==='consultation'||/secure|vault|faraday|privacy/.test(n);
 // Floor-specific spatial emphasis belongs to the floor program, not recoloring.
 const perimeter=/operations|admin|rights|support|liaison/.test(n);
 return {arrangement,technical,privateRoom,perimeter,facility,level,ceiling:technical?'services':arrangement==='study'?'acoustic':'rafts',floor:technical?'porcelain':arrangement==='consultation'?'oak':'stone'};
}
export function furnishWorkplace(k,r,{desk,taskChair,sofa,shelving}){
 const p=r.fitout||fitoutProfile(r.name),{x,z,w,d}=r,side=Math.sign(z),back=z+side*d*.28;
 const rotateCluster=(start,xx,zz,angle)=>{for(const m of k.parts.slice(start)){const dx=m.position.x-xx,dz=m.position.z-zz;m.position.x=xx+dx*Math.cos(angle)+dz*Math.sin(angle);m.position.z=zz-dx*Math.sin(angle)+dz*Math.cos(angle);m.rotateY(angle);}};
 const workstation=(xx,zz,angle=0,lab=false)=>{const start=k.parts.length;desk(k,xx,zz,lab);rotateCluster(start,xx,zz,angle);};
 if(p.arrangement==='control'){
  const cols=Math.min(4,Math.max(1,Math.floor((w-2)/2.5))),rows=Math.min(3,Math.max(1,Math.floor((d-4)/2.6)));
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)workstation(x+(col-(cols-1)/2)*2.25,z+side*(row*2.6-d*.1),side>0?Math.PI:0);
  for(let col=0;col<Math.min(5,cols+1);col++){const xx=x+(col-cols/2)*1.2;k.box('operations video wall frame','graphite',xx,2.1,z+side*(d/2-.4),1.16,1.8,.1,.015);k.box('operations status panel','display',xx,2.1,z+side*(d/2-.46),1.10,1.72,.015,.003);}
 }else if(p.arrangement==='executive'){
  workstation(x-w*.2,back,side>0?Math.PI:0);sofa(k,x+w*.22,z);k.cylinder('executive meeting top','oak',x-w*.15,.76,z-side*d*.12,.7,.075);k.cylinder('executive meeting base','graphite',x-w*.15,.37,z-side*d*.12,.2,.7);
  for(const dx of [-.9,.9])taskChair(k,x-w*.15+dx,z-side*d*.12,dx<0?-Math.PI/2:Math.PI/2);
  shelving(k,x+w*.24,back,true,side);
 }else if(p.arrangement==='consultation'){
  const xx=x-w*.19;workstation(xx,back,side>0?Math.PI:0);taskChair(k,xx,back+side*1.1,side>0?0:Math.PI);sofa(k,x+w*.23,z+side*d*.04);
  k.box('consultation privacy screen','fabric',x,1.22,back, .055,2.1,Math.min(d*.29,2.5),.015);
  k.cylinder('visitor side table','oak',x+w*.23,.48,z-side*d*.12,.4,.055);k.cylinder('side table leg','steel',x+w*.23,.24,z-side*d*.12,.055,.46);
 }else if(p.arrangement==='project'){
  const length=Math.min(w*.6,4.8);k.box('shared project worktable','oak',x,.76,back,length,.09,1.3,.025);
  for(const dx of [-length*.38,length*.38])k.box('project trestle','graphite',x+dx,.36,back,.08,.72,1.05,.012);
  for(const dx of [-length*.28,length*.28])for(const dz of [-1,1])taskChair(k,x+dx,back+dz,dz<0?Math.PI:0);
  for(let i=0;i<3;i++)k.box('physical study model','porcelain',x-.6+i*.6,.92,back,.38,.15+i*.06,.4,.01);
  k.box('pinup wall','fabric',x-w/2+.17,1.9,z,.08,2.4,Math.min(d*.5,4),.015);
  for(let i=0;i<6;i++)k.box('pinned project drawing','porcelain',x-w/2+.221,1.35+(i%2)*.65,z+(Math.floor(i/2)-1)*.8,.008,.52,.65,0);
  workstation(x+w*.25,z-side*d*.18,Math.PI/2);
 }else if(p.arrangement==='study'){
  for(const dx of [-w*.27,w*.27]){workstation(x+dx,z+side*d*.14,side>0?Math.PI:0);shelving(k,x+dx,back,true,side);k.box('study carrel screen','fabric',x+dx,1.12,z+side*d*.14,1.85,.58,.055,.01);}
 }else if(p.arrangement==='laboratory'){
  const cols=Math.max(1,Math.min(4,Math.floor((w-2)/3))),rows=Math.max(1,Math.min(3,Math.floor((d-3)/3.1)));
  for(let a=0;a<cols;a++)for(let b=0;b<rows;b++)workstation(x+(a-(cols-1)/2)*2.8,z+side*(b*3.1-(rows-1)*1.55+.5),side>0?Math.PI:0,true);
  k.box('fume extraction cabinet','porcelain',x,1.25,z+side*(d/2-.7),1.7,2.5,.95,.025);k.box('fume hood sash','glass',x,1.6,z+side*(d/2-1.19),1.48,.86,.02,0);k.box('fume hood worktop','graphite',x,.94,z+side*(d/2-.8),1.6,.06,.9,.015);
 }else if(p.perimeter){
  const rows=Math.max(1,Math.min(4,Math.floor((d-3)/2.4)));
  for(const bank of [-1,1])for(let row=0;row<rows;row++)workstation(x+bank*(w/2-1.3),z+(row-(rows-1)/2)*2.4,bank>0?-Math.PI/2:Math.PI/2);
  k.box('shared credenza','oak',x,.42,back,Math.min(2.3,w*.4),.84,.55,.025);
 }else{
  const cols=Math.max(1,Math.min(3,Math.floor((w-2)/3.4))),rows=Math.max(1,Math.min(3,Math.floor((d-3)/3.1)));
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)workstation(x+(col-(cols-1)/2)*3.2,z+(row-(rows-1)/2)*3.1,side>0?Math.PI:0);
  shelving(k,x,back,true,side);
 }
 return p.arrangement;
}
