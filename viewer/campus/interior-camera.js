// Visitor camera choreography for the interior tour. Pure functions over plan
// coordinates (x,z in metres, yaw = atan2(dx,dz)) so the motion is testable
// without a GPU. Routes from floor-topology.js are orthogonal polylines through
// door centres; here they become filleted curves walked at a steady human pace
// with gentle acceleration, a look-ahead gaze and a composed arrival framing.

const TAU=Math.PI*2;
export const wrapAngle=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
export const lerpAngle=(a,b,t)=>a+wrapAngle(b-a)*t;
const smoothstep=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);

// Remove duplicate and collinear vertices; they produce zero-length segments.
export function simplifyRoute(points,epsilon=.02){
 const out=[];
 for(const p of points){if(!out.length||dist(out.at(-1),p)>epsilon)out.push([p[0],p[1]]);}
 for(let i=out.length-2;i>0;i--){
  const [a,b,c]=[out[i-1],out[i],out[i+1]];
  const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
  const dot=(b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]);
  if(Math.abs(cross)<1e-6&&dot>0)out.splice(i,1);
 }
 return out;
}

// Replace each corner with a quadratic fillet. The radius is clamped to 40% of
// the adjoining segments so the curve never cuts across a door jamb.
export function filletRoute(points,radius=.9,steps=8){
 const p=simplifyRoute(points);if(p.length<3)return p;
 const out=[p[0]];
 for(let i=1;i<p.length-1;i++){
  const a=p[i-1],b=p[i],c=p[i+1],r=Math.min(radius,dist(a,b)*.4,dist(b,c)*.4);
  if(r<.05){out.push(b);continue;}
  const ta=r/dist(a,b),tc=r/dist(b,c);
  const s=[b[0]+(a[0]-b[0])*ta,b[1]+(a[1]-b[1])*ta],e=[b[0]+(c[0]-b[0])*tc,b[1]+(c[1]-b[1])*tc];
  for(let k=0;k<=steps;k++){const t=k/steps,u=1-t;out.push([u*u*s[0]+2*u*t*b[0]+t*t*e[0],u*u*s[1]+2*u*t*b[1]+t*t*e[1]]);}
 }
 out.push(p.at(-1));return simplifyRoute(out,.005);
}

// Arc-length parametrised polyline.
export function pathSampler(points){
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+dist(points[i-1],points[i]));
 const total=lengths.at(-1)||0;
 function at(s){
  if(points.length===1||total===0)return [points[0][0],points[0][1]];
  s=Math.max(0,Math.min(total,s));let i=1;while(i<lengths.length-1&&lengths[i]<s)i++;
  const seg=lengths[i]-lengths[i-1]||1,t=(s-lengths[i-1])/seg;
  return [points[i-1][0]+(points[i][0]-points[i-1][0])*t,points[i-1][1]+(points[i][1]-points[i-1][1])*t];
 }
 return {total,at};
}

// Trapezoidal walking speed: ease into a steady pace, ease out at the stop.
export function walkProfile(length,{speed=1.45,accel=1.1}={}){
 if(length<=0)return {duration:0,distance:()=>0};
 let ta=speed/accel,cruise=speed;
 if(accel*ta*ta>length){ta=Math.sqrt(length/accel);cruise=accel*ta;}
 const da=.5*accel*ta*ta,tc=(length-2*da)/cruise,duration=2*ta+tc;
 return {duration,distance(t){
  t=Math.max(0,Math.min(duration,t));
  if(t<ta)return .5*accel*t*t;
  if(t<ta+tc)return da+cruise*(t-ta);
  const r=duration-t;return length-.5*accel*r*r;
 }};
}

// A flight from the current pose along the route, ending composed on the room.
// focus = [x,z] the visitor should face on arrival (room centre or feature wall).
export function planFlight({from,yaw=0,pitch=0,route=[],focus=null,eye=1.67,focusHeight=1.45,speed=1.45,turnTime=.7,lookAhead=2.2}){
 const points=filletRoute([from,...route]);
 const path=pathSampler(points),profile=walkProfile(path.total,{speed});
 const end=path.at(path.total);
 const faceTo=focus&&dist(end,focus)>.3?focus:null;
 const finalYaw=faceTo?Math.atan2(faceTo[0]-end[0],faceTo[1]-end[1]):(path.total>.1?heading(path.total-.1):yaw);
 const finalPitch=faceTo?Math.atan2(focusHeight-eye,Math.max(1,dist(end,faceTo))):0;
 // Settling time lets the gaze finish turning once the feet have stopped.
 const settle=faceTo?Math.min(1.1,.35+Math.abs(wrapAngle(finalYaw-(path.total>.1?heading(path.total-.1):yaw)))*.5):0;
 const duration=profile.duration+settle;
 function heading(s){const a=path.at(Math.max(0,s-.05)),b=path.at(Math.min(path.total,s+lookAhead));return Math.hypot(b[0]-a[0],b[1]-a[1])<1e-4?yaw:Math.atan2(b[0]-a[0],b[1]-a[1]);}
 function sample(t){
  t=Math.max(0,Math.min(duration,t));
  const s=profile.distance(t),[x,z]=path.at(s);
  let y=path.total>.1?heading(s):yaw;
  // Ease out of the starting gaze so the view never snaps when a tour begins.
  y=lerpAngle(yaw,y,smoothstep(t/Math.max(.001,turnTime)));
  // Over the last metres, the gaze leaves the path and settles on the room.
  const tail=path.total>0?smoothstep((s-(path.total-Math.min(3.2,path.total*.6)))/Math.min(3.2,path.total*.6||1)):1;
  const settleT=settle?smoothstep((t-profile.duration)/settle):(t>=profile.duration?1:0);
  const blend=faceTo?Math.max(tail*.75,settleT):0;
  y=faceTo?lerpAngle(y,finalYaw,Math.min(1,blend)):y;
  const p=pitch+(finalPitch-pitch)*(faceTo?Math.min(1,blend):smoothstep(t/Math.max(.001,turnTime)));
  return {x,z,yaw:wrapAngle(y),pitch:p,done:t>=duration};
 }
 return {duration,length:path.total,points,sample,final:{x:end[0],z:end[1],yaw:wrapAngle(finalYaw),pitch:finalPitch}};
}

// Where the visitor should look when stopping in a room. A gaze at the room
// centre from 1.4 m inside the door lands on the nearest desk; a three-quarter
// view toward the far wall reads the whole program, as an architectural
// photographer would frame it. The side alternates so neighbouring rooms differ.
export function roomFocus(room,stop,index=0){
 const a=room.angle||0,fx=Math.sin(a),fz=Math.cos(a),lx=Math.cos(a),lz=-Math.sin(a);
 const depth=room.localDepth||room.d||4,width=room.localWidth||room.w||4;
 const ox=room.doorX??room.x,oz=room.doorZ??room.z,lateral=(index%2?-1:1)*width*.16;
 const focus=[ox+fx*depth*.82+lx*lateral,oz+fz*depth*.82+lz*lateral];
 if(stop&&dist(stop,focus)<1.2)return [room.x,room.z];
 return focus;
}

// Keyboard look: yaw rate (rad/s) eased toward a target so held keys feel weighted.
export function approach(current,target,rate,dt){const k=1-Math.exp(-rate*dt);return current+(target-current)*k;}
