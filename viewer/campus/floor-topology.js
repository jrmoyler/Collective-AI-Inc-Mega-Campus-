import {roomDemand,fitoutProfile} from './interior-program.js';
// Each expression is an explicit floor adjacency decision. H splits north/south,
// V splits west/east; digits address the unchanged, ordered source program.
// These fit-outs interpret unseen partitions; they are not surveyed CAD.
const PLANS={
 1:['H(V(0,1),V(2,H(3,V(4,5))))','V(H(0,3),H(V(1,2),V(4,5)))','H(V(0,H(1,2)),V(3,H(4,5)))','V(H(0,3),H(V(1,2),V(4,5)))','H(V(0,3),V(H(1,2),H(4,5)))','V(H(0,1),H(V(2,3),V(4,5)))','H(V(0,1),V(H(2,4),H(3,5)))','V(H(0,2),H(V(1,3),V(4,5)))','H(V(0,H(2,5)),V(1,H(3,4)))','V(H(0,1),H(V(2,3),V(4,5)))','H(V(0,H(1,4)),V(3,H(2,5)))','V(H(0,1),H(V(2,4),V(3,5)))'],
 2:['V(0,H(V(1,2),V(3,H(4,5))))','H(V(0,1),V(H(2,3),H(4,5)))'],
 3:['V(H(0,1),H(V(2,3),V(4,5)))','H(V(0,1),V(2,H(3,V(4,5))))'],
 4:['V(H(0,3),H(1,V(4,H(2,5))))','H(V(0,1),V(2,H(3,V(4,5))))','V(H(0,1),H(2,V(3,H(4,5))))','H(V(0,H(1,4)),V(2,H(3,5)))'],
 5:['V(H(0,1),H(3,V(2,H(4,5))))','H(V(0,2),V(H(1,3),H(4,5)))'],
 6:['H(V(0,1),V(2,H(3,V(4,5))))','V(H(0,1),H(V(2,4),V(3,5)))'],
 7:['H(V(0,2),V(1,H(3,V(4,5))))'],8:['V(H(0,1),H(2,V(3,H(4,5))))'],9:['H(0,V(H(1,5),H(2,V(3,4))))'],10:['V(0,H(1,V(H(2,4),H(3,5))))'],
 11:['V(H(0,1),H(2,V(3,H(4,5))))','H(V(0,1),V(H(2,3),H(4,5)))'],
 12:['H(V(0,1),V(H(2,3),H(4,5)))','V(H(0,1),H(2,V(3,H(4,5))))'],
 13:['V(H(0,3),H(V(1,2),V(4,5)))','H(V(0,1),V(H(2,3),H(4,5)))'],14:['H(V(0,1),V(H(2,3),H(4,5)))'],15:['H(0,V(1,H(V(2,3),V(4,5))))'],
 16:['V(H(0,3),H(V(1,2),V(4,5)))','H(0,V(H(1,2),H(3,V(4,5))))'],17:['V(H(0,2),H(1,V(3,H(4,5))))'],
 18:['H(V(0,1),V(H(2,3),H(4,5)))','V(H(0,1),H(V(2,3),V(4,5)))'],19:['V(H(0,3),H(V(1,2),V(4,5)))','H(V(0,1),V(H(2,3),H(4,5)))'],
 20:['V(H(0,4),H(V(1,2),V(3,5)))','H(V(0,1),V(H(2,5),H(3,4)))'],21:['H(V(0,1),V(2,H(3,V(4,5))))'],
 22:['V(H(0,1),H(V(2,4),V(3,5)))','H(V(0,1),V(H(2,3),H(4,5)))'],23:['H(V(0,1),V(H(2,3),H(4,5)))','V(H(0,1),H(V(2,3),V(4,5)))','H(0,V(H(1,2),H(V(3,4),5)))'],
 24:['V(H(0,1),H(2,V(3,H(4,5))))','H(V(0,1),V(H(2,3),H(4,5)))'],25:['H(V(0,1),V(2,H(3,V(4,5))))','V(H(0,1),H(V(2,3),V(4,5)))'],26:['V(0,H(1,V(H(2,3),H(4,5))))'],
 27:['H(V(0,1),V(2,H(3,V(4,5))))','V(H(0,3),H(V(1,2),V(4,5)))'],28:['V(0,H(V(1,2),V(3,H(4,5))))','H(V(0,1),V(H(2,3),H(4,5)))'],
 29:['H(V(0,1),V(H(2,3),H(4,5)))','V(H(0,1),H(V(2,4),V(3,5)))'],30:['V(H(0,4),H(V(1,2),V(3,5)))','H(V(0,1),V(H(2,3),H(4,5)))'],
 31:['H(V(0,3),V(H(1,2),H(4,5)))','V(H(0,1),H(V(2,3),V(4,5)))'],32:['V(H(0,1),H(V(2,4),V(3,5)))','H(V(0,1),V(H(2,3),H(4,5)))'],
 33:['H(V(0,1),V(H(2,3),H(4,5)))','V(H(0,2),H(V(1,3),V(4,5)))'],34:['V(H(0,1),H(2,V(3,H(4,5))))','H(V(0,3),V(H(1,2),H(4,5)))'],35:['H(V(0,1),V(2,H(3,V(4,5))))','V(H(0,1),H(V(2,3),V(4,5)))']
};
function parse(expression){let i=0;function read(){const c=expression[i++];if(/\d/.test(c))return Number(c);if(!'HV'.includes(c)||expression[i++]!=='(')throw Error('Invalid floor expression');const a=read();if(expression[i++]!==',')throw Error('Missing split');const b=read();if(expression[i++]!==')')throw Error('Unclosed split');return {axis:c,a,b};}const tree=read();if(i!==expression.length)throw Error('Trailing floor expression');return tree;}
export function programHeight(name){
 if(/LED volume|Soundstage|Aerospace assembly|Robotics assembly|Android assembly|Indoor sprint|Cross-dock|Racked inventory/i.test(name))return 9;
 if(/Motion capture|assembly|Machine integration|Housing demo hall|Auditorium|All-hands forum|Food hall|Water treatment pilots|Cooling plant|Materials pilots|Circular systems pilot/i.test(name))return 6;
 if(/GPU data hall|growing|Growing racks|Library entry|Public collection|Lecture hall|theater|Marketplace hall|Energy demonstration/i.test(name))return 4.8;
 if(/lab|research|clinical|clinic|analysis|test|kitchen|processing|plant/i.test(name))return 4.2;
 if(/booth|private|consent|consultation|quiet|family|care|archive|storage/i.test(name))return 3.2;
 return 3.6;
}
export function buildFloorLayout(f,level){
 const w=f.width*.3048,d=f.depth*.3048,core=Math.min(16,f.width*.14)*.3048,corridor=3.6576;
 const names=f.program[level].split(';'),tree=parse(PLANS[f.id][level]),rooms=new Array(names.length),circulation=[];
 const weight=n=>typeof n==='number'?roomDemand(names[n]):weight(n.a)+weight(n.b);
 // Demand and minimum clear room spans control split positions, not random seeds.
 const minimum=(n,axis)=>typeof n==='number'?3.4:n.axis===axis?minimum(n.a,axis)+minimum(n.b,axis)+corridor:Math.max(minimum(n.a,axis),minimum(n.b,axis));
 function divide(n,b,parent=null){
  if(typeof n==='number'){
   const h=programHeight(names[n]),r={name:names[n],x:b.x+b.w/2,z:b.z+b.d/2,w:b.w,d:b.d,height:h,fitout:fitoutProfile(names[n],f.id,level)};
   const vertical=parent.axis==='V';const direction=vertical?(r.x<parent.x?-1:1):(r.z<parent.z?-1:1);
   r.angle=vertical?direction*Math.PI/2:(direction<0?Math.PI:0);
   r.doorX=vertical?(direction<0?b.x+b.w:b.x):r.x;r.doorZ=vertical?r.z:(direction<0?b.z+b.d:b.z);
   r.approach=vertical?[parent.x,r.z]:[r.x,parent.z];
   r.arrival=[r.doorX+Math.sin(r.angle)*Math.min(1.4,(vertical?r.w:r.d)*.22),r.doorZ+Math.cos(r.angle)*Math.min(1.4,(vertical?r.w:r.d)*.22)];
   r.localWidth=vertical?r.d:r.w;r.localDepth=vertical?r.w:r.d;r.doorWidth=Math.min(1.8,r.localWidth*.35);r.parent=parent.id;rooms[n]=r;return;
  }
  const vertical=n.axis==='V',length=vertical?b.w:b.d,available=length-corridor;
  const minA=minimum(n.a,n.axis),minB=minimum(n.b,n.axis);
  if(available<minA+minB-1e-6)throw Error(`${f.key}/${level+1}: floor split cannot fit minimum clear spans`);
  const span=Math.max(minA,Math.min(available-minB,available*weight(n.a)/(weight(n.a)+weight(n.b))));
  const c={id:circulation.length,axis:n.axis,x:vertical?b.x+span+corridor/2:b.x+b.w/2,z:vertical?b.z+b.d/2:b.z+span+corridor/2,w:vertical?corridor:b.w,d:vertical?b.d:corridor,parent:parent?.id??null};circulation.push(c);
  divide(n.a,{...b,w:vertical?span:b.w,d:vertical?b.d:span},c);
  divide(n.b,{x:vertical?b.x+span+corridor:b.x,z:vertical?b.z:b.z+span+corridor,w:vertical?available-span:b.w,d:vertical?b.d:available-span},c);
 }
 divide(tree,{x:-w/2+core,z:-d/2,w:w-2*core,d});
 const root=circulation[0],entry=root.axis==='H'?[-w/2+core/2,root.z]:[root.x,-d/2+.7];
 for(const r of rooms){
  const reverse=[r.approach];let c=circulation[r.parent];
  while(c.parent!==null){const p=circulation[c.parent];const last=reverse.at(-1);const joint=c.axis==='H'?[p.x,c.z]:[c.x,p.z];reverse.push(joint);c=p;}
  // Travel on the root centerline, then branch to each subsequent passage.
  if(root.axis==='H')reverse.push([entry[0],root.z]);else reverse.push([root.x,entry[1]]);
  r.route=[...reverse.reverse(),[r.doorX,r.doorZ],r.arrival];
 }
 return {w,d,core,corridor,rooms,circulation,entry,height:Math.max(...rooms.map(r=>r.height)),topology:PLANS[f.id][level],inferred:true};
}

// Project a free-walking corridor position onto its own passage before returning
// to the root. A direct diagonal to the entrance would cut across room walls.
export function routeToRoom(layout,position,index){
 const target=layout.rooms[index];if(!target)return [];
 const prior=layout.rooms.find(r=>Math.abs(position[0]-r.x)<r.w/2&&Math.abs(position[1]-r.z)<r.d/2);
 if(prior){
  const aligned=Math.abs(Math.sin(prior.angle))>.5?[position[0],prior.doorZ]:[prior.doorX,position[1]];
  return [aligned,...[...prior.route].reverse(),...target.route];
 }
 let passage=layout.circulation.find(c=>Math.abs(position[0]-c.x)<=c.w/2&&Math.abs(position[1]-c.z)<=c.d/2);
 if(!passage)return [layout.entry,...target.route];
 const points=[passage.axis==='H'?[position[0],passage.z]:[passage.x,position[1]]];
 while(passage.parent!==null){const parent=layout.circulation[passage.parent];points.push(passage.axis==='H'?[parent.x,passage.z]:[passage.x,parent.z]);passage=parent;}
 points.push(layout.entry,...target.route);return points;
}
