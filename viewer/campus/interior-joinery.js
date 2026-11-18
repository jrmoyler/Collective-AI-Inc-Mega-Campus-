// Architectural joinery shared by every program room, in room-local metres
// (door line at z=0, rear partition at z=d, x across the room). These are
// inferred construction details: sliding door leaves with real hardware, a
// ceiling shadow gap, a concealed cove washing the rear partition and a timber
// slat acoustic wall. Each call adds merged kit parts only, so draw calls do
// not grow with detail.

// A frameless sliding leaf parked beside the opening on the room side, on a
// visible top track with a soft-close guide and a full-height pull.
export function slidingDoor(k,{dl,dr,right,height=2.96,solid=false}){
 const door=dr-dl,room=right-dr;
 const leaf=Math.min(door+.06,room-.18);
 if(leaf<.6)return null;
 const z=.165,x0=dr-.03,cx=x0+leaf/2,top=Math.min(2.87,height-.09),bottom=.075,tall=top-bottom,mid=(top+bottom)/2;
 k.box('sliding door top track','graphite',(dl-.05+x0+leaf+.05)/2,top+.055,z,(x0+leaf+.05)-(dl-.05),.06,.075,.006);
 for(const x of [x0+.16,x0+leaf-.16])k.box('door roller carriage','steel',x,top+.02,z,.09,.035,.05,.004);
 if(solid){
  k.box('solid timber door leaf','oak',cx,mid,z,leaf,tall,.042,.006);
  for(const y of [bottom+.32,top-.32])k.box('leaf inlay reveal','graphite',cx,y,z+.022,leaf-.16,.008,.004,0);
 }else{
  k.box('toughened glass door leaf','glass',cx,mid,z,leaf-.04,tall-.12,.012,0);
  k.box('leaf top rail','graphite',cx,top-.035,z,leaf,.07,.04,.004);
  k.box('leaf bottom rail','graphite',cx,bottom+.05,z,leaf,.1,.04,.004);
  for(const x of [x0+.02,x0+leaf-.02])k.box('leaf slim stile','graphite',x,mid,z,.04,tall,.04,.004);
  // Manifestation band keeps the glass visible at eye level, as building codes require.
  k.box('glass manifestation band','porcelain',cx,1.46,z+.008,leaf-.12,.05,.002,0);
 }
 // A full-height pull on both faces at the leading edge.
 for(const face of [-1,1]){
  const pz=z+face*.06;
  k.bar('door pull bar','brass',[x0+.13,.82,pz],[x0+.13,1.92,pz],.014);
  for(const y of [.9,1.84])k.bar('pull standoff','brass',[x0+.13,y,z+face*.021],[x0+.13,y,pz],.008);
 }
 k.box('floor guide','steel',x0+leaf+.04,.035,z,.05,.05,.06,.006);
 return {leaf,x0,z};
}

// A 25 mm shadow gap where the ceiling meets the walls.
export function ceilingReveal(k,{w,d,h}){
 const y=h-.035;
 k.box('ceiling shadow gap','graphite',0,y,d-.085,w-.2,.03,.03,0);
 for(const s of [-1,1])k.box('ceiling shadow gap','graphite',s*(w/2-.075),y,d/2,.03,.03,d-.2,0);
}

// A concealed linear cove grazing the rear partition from above.
export function rearCove(k,{w,d,h}){
 const span=Math.max(1,w-.6);
 k.box('cove fascia','plaster',0,h-.29,d-.17,span,.09,.02,.004);
 k.box('cove soffit','plaster',0,h-.335,d-.12,span,.012,.11,0);
 k.box('concealed cove LED','warm',0,h-.347,d-.1,span-.1,.008,.022,0);
}

// Vertical timber slats on a dark felt backing: absorbs the rear-wall flutter
// echo of a hard room. Pitch and slat depth follow common acoustic products.
export function slatWall(k,{w,d,h},{timber='oak',backing='fabric',maxWidth=4.2}={}){
 const width=Math.min(maxWidth,w*.56),top=Math.min(h-.42,2.85),bottom=.17,height=top-bottom,y=(top+bottom)/2;
 const pitch=.075,count=Math.max(8,Math.floor(width/pitch));
 k.box('acoustic felt backing',backing,0,y,d-.083,count*pitch+.02,height,.012,0);
 for(let n=0;n<count;n++)k.box('acoustic timber slat',timber,(n-(count-1)/2)*pitch,y,d-.1,.028,height,.024,.003);
 k.box('slat wall head trim','graphite',0,top+.012,d-.096,count*pitch+.04,.024,.04,.002);
 return count;
}
