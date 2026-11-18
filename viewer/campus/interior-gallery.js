// Entrance architecture references the facility's primary program. Dimensions are metres.
// Profiles share joinery and finishes while retaining individual material schedules.
const schedules = [
  ['facet','slate','brass'], ['frame','graphite','steel'], ['coffer','graphite','brass'],
  ['vault','oak','brass'], ['baffle','walnut','graphite'], ['baffle','slate','steel'],
  ['truss','graphite','brass'], ['truss','steel','graphite'], ['frame','steel','blue'],
  ['truss','slate','steel'], ['vault','sage','oak'], ['vault','oak','porcelain'],
  ['facet','sage','brass'], ['baffle','linen','oak'], ['frame','slate','oak'],
  ['coffer','terrazzo','brass'], ['truss','oak','sage'], ['vault','steel','brass'],
  ['coffer','walnut','brass'], ['facet','graphite','blue'], ['frame','graphite','brass'],
  ['coffer','stone','graphite'], ['vault','walnut','linen'], ['frame','slate','brass'],
  ['baffle','sage','steel'], ['truss','steel','brass'], ['facet','clay','steel'],
  ['vault','slate','steel'], ['baffle','oak','sage'], ['coffer','slate','brass'],
  ['frame','walnut','steel'], ['coffer','oak','steel'], ['baffle','walnut','brass'],
  ['truss','slate','brass'], ['vault','clay','oak'],
];
export function gallerySchedule(id) {
  const [form, body, trim] = schedules[id - 1];
  return {form, body, trim};
}

export function galleryBays(kit, passage, schedule) {
  const horizontal = passage.axis === 'H';
  const length = horizontal ? passage.w : passage.d;
  const cross = horizontal ? passage.d : passage.w;
  const half = cross / 2 - .18;
  const {form, body, trim} = schedule;
  const point = (across, y, along) => [
    passage.x + (horizontal ? along : across), y,
    passage.z + (horizontal ? across : along),
  ];
  const block = (name, finish, across, y, along, width, height, depth) =>
    kit.box(name, finish, ...point(across, y, along),
      horizontal ? depth : width, height, horizontal ? width : depth, 0);

  // The two continuous border courses terminate at each corridor intersection.
  for (const side of [-1, 1]) {
    block('gallery border course', body, side * half, .056, 0, .18, .005, length - .06);
    block('inset metal divider', trim, side * (half - .13), .056, 0, .018, .004, length - .06);
  }
  const bays = Math.max(1, Math.ceil(length / 4.8));
  const pitch = length / bays;
  for (let bay = 0; bay < bays; bay++) {
    const t = (bay + .5) * pitch - length / 2;
    if (form === 'truss' || form === 'baffle') {
      for (const side of [-1,1]) block('gallery task light','warm',side*half*.66,3.48,t+pitch*.25,.08,.026,pitch*.32);
    }
    if (form === 'vault' || form === 'facet') {
      // Suspended lanterns have a faceted or barrel section, open below the soffit.
      const divisions = form === 'vault' ? 8 : 4;
      let last = point(-half, 2.98, t);
      for (let n = 1; n <= divisions; n++) {
        const u = n / divisions;
        const y = 2.98 + .48 * (form === 'vault' ? Math.sin(Math.PI * u) : 1 - Math.abs(2 * u - 1));
        const next = point((2 * u - 1) * half, y, t);
        kit.bar('gallery lantern rib', body, last, next, .046);
        last = next;
      }
      // A continuous luminous spine makes the corridor legible on approach.
      block('lantern ridge housing',trim,0,3.43,t,.19,.09,pitch-.14);
      block('lantern ridge diffuser','warm',0,3.373,t,.13,.024,pitch-.22);
      for (const side of [-1, 1]) {
        block('lantern shoe', trim, side * half, 3.25, t, .12, .56, .16);
        block('lantern side diffuser','warm',side * (half - .05),3.06,t,.025,.10,.12);
      }
    } else if (form === 'truss') {
      block('paired truss chord',body,0,3.09,t,half * 2,.075,.10);
      block('upper truss chord',body,0,3.49,t,half * 2,.075,.10);
      for (let n=0; n<6; n++) {
        const x=half*(n/3-1);
        kit.bar('diagonal truss web',trim,point(x,n%2?3.43:3.15,t),
          point(x+half/3,n%2?3.15:3.43,t),.032);
      }
    } else if (form === 'coffer') {
      for (const side of [-1,1]) {
        block('coffer mitred edge',body,side*(half-.13),3.34,t,.17,.23,pitch-.16);
        block('coffer end',body,0,3.34,t+side*(pitch/2-.13),2*half-.4,.23,.14);
        block('reflected coffer light','warm',side*(half-.23),3.39,t,.035,.025,pitch-.48);
      }
    } else if (form === 'baffle') {
      for (let n=-2; n<=2; n++) {
        block('suspended acoustic blade',body,n*half*.36,3.38,t,.076,.30-.035*Math.abs(n),pitch*.74);
      }
      block('blade suspension track',trim,0,3.54,t,2*half-.2,.045,.07);
    } else {
      block('portal cross member',body,0,3.33,t,half*2,.22,.24);
      block('portal underslung light','warm',0,3.21,t,half*1.35,.018,.055);
      for(const side of [-1,1])block('portal end cap',trim,side*(half-.10),3.23,t,.19,.40,.27);
    }
  }
}

export function roomThreshold(kit, room, schedule) {
  const half = room.doorWidth / 2;
  // At the smallest door the plate still stays beyond the jamb.
  const returnWidth = Math.min(.42, (room.localWidth / 2 - half) * .64);
  for (const side of [-1, 1]) {
    const x = side * (half + returnWidth / 2 + .045);
    kit.box('entrance pilaster',schedule.body,x,1.50,-.106,returnWidth,2.87,.052,0);
    kit.box('pilaster edge trim',schedule.trim,x+side*returnWidth*.38,1.5,-.137,.018,2.80,.012,0);
  }
  kit.box('door head fascia',schedule.body,0,3.045,-.125,room.doorWidth+.16,.16,.07,0);
  kit.box('door head grazing light','warm',0,2.96,-.14,room.doorWidth*.86,.015,.032,0);
  kit.box('threshold saddle',schedule.trim,0,.059,0,room.doorWidth-.1,.005,.12,0);
}

// The side of a rotated room can reach the north/south glazing even when its
// rear wall is internal. The east/west sides of the plan adjoin service strips.
export function sideWindow(room, side, depth) {
  const localX = side * room.localWidth / 2;
  const z = room.doorZ - Math.sin(room.angle)*localX + Math.cos(room.angle)*room.localDepth/2;
  return Math.abs(Math.abs(z)-depth/2)<.01 && Math.abs(Math.sin(room.angle))>.99;
}

export function signMount(room) {
  const bay = (room.localWidth - room.doorWidth) / 2;
  const width = Math.min(1.54, bay - .27);
  return {x:room.doorWidth/2 + bay/2, y:1.84, width};
}

// Wall fittings stay within a 13 cm service zone; the room's work surface and
// equipment layouts own the space beyond it. Keep the feature near the entry,
// ahead of the identity panel at the far end of the wall.
export function programWall(kit, room, identity, schedule) {
  const wall = -room.w/2;
  const span = Math.min(4.0,room.d*.36);
  const center = room.d*.24;
  const box = (name,finish,inset,y,offset,thickness,height,length) =>
    kit.box(name,finish,wall+inset,y,center+offset,thickness,height,length,0);
  const {kind} = identity;
  if (kind === 'care' || kind === 'living-systems') {
    const panels = Math.max(2, Math.ceil(span/.52));
    for (let n=0;n<panels;n++) {
      box('jointed hygienic lining',kind==='care'?'porcelain':'sage',.077,1.28,
        ((n+.5)/panels-.5)*span,.028,1.76,span/panels-.012);
    }
    for(const side of [-1,1])box('wall rail standoff','steel',.105,1.03,side*span*.41,.07,.08,.08);
    box('continuous wall rail',kind==='care'?'oak':'steel',.15,1.03,0,.055,.07,span*.91);
  } else if (kind === 'making' || kind === 'operations') {
    box('recessed service cassette','slate',.077,1.73,0,.036,1.07,span);
    const columns=Math.max(2,Math.floor(span/.58));
    for(let n=0;n<columns;n++) {
      const z=((n+.5)/columns-.5)*span;
      box('instrument access door','graphite',.105,1.71,z,.026,.84,span/columns-.042);
      box('quarter-turn latch','steel',.123,1.58,z+.12,.012,.065,.025);
      box('service indicator',n===0?'blue':'sage',.123,2.01,z-.11,.012,.03,.067);
    }
    box('service trunking','steel',.095,1.12,0,.055,.09,span);
  } else if (kind === 'media' || kind === 'learning') {
    const blades=Math.max(4,Math.floor(span/.15));
    box('acoustic backing','fabric',.074,1.60,0,.027,2.08,span);
    for(let n=0;n<blades;n++) {
      const projection=.034+.045*(1+Math.sin(n*1.13))*.5;
      box('variable depth acoustic blade',kind==='media'?'walnut':'oak',.089+projection/2,1.60,
        ((n+.5)/blades-.5)*span,projection,2.02,span/blades*.5);
    }
  } else {
    const fabric=kind==='workplace'?'linen':kind==='hospitality'?'oak':identity.secondary;
    const bays=Math.max(2,Math.ceil(span/.95));
    for(let n=0;n<bays;n++){
      const z=((n+.5)/bays-.5)*span;
      box('framed wall field',schedule.body,.078,1.37,z,.032,1.92,span/bays-.018);
      box('recessed wall textile',fabric,.099,1.37,z,.014,1.75,span/bays-.11);
    }
    box('continuous picture rail',schedule.trim,.102,2.37,0,.07,.035,span);
  }
}

// Public faces of room partitions along a passage. Intersections have no
// adjacent room edge and remain open; doorway frontages already have glazing.
export function galleryFrontages(kit, passage, rooms, schedule) {
  const horizontal=passage.axis==='H';
  const length=horizontal?passage.w:passage.d;
  const width=horizontal?passage.d:passage.w;
  const center=horizontal?passage.x:passage.z;
  const cross=horizontal?passage.z:passage.x;
  for(const room of rooms){
    if(room.parent===passage.id)continue;
    const mid=horizontal?room.x:room.z;
    const extent=(horizontal?room.w:room.d)/2;
    const transverse=horizontal?room.z:room.x;
    const half=(horizontal?room.d:room.w)/2;
    const side=Math.sign(transverse-cross);
    if(Math.abs(Math.abs(transverse-cross)-half-width/2)>.02)continue;
    const start=Math.max(center-length/2,mid-extent)+.14;
    const end=Math.min(center+length/2,mid+extent)-.14;
    if(end-start<.75)continue;
    const edge=cross+side*width/2;
    const block=(name,finish,along,y,setback,span,height,depth)=>{
      const lateral=edge-side*setback;
      kit.box(name,finish,horizontal?along:lateral,y,horizontal?lateral:along,
        horizontal?span:depth,height,horizontal?depth:span,0);
    };
    const count=Math.ceil((end-start)/1.45),bay=(end-start)/count;
    for(let n=0;n<count;n++){
      const along=start+(n+.5)*bay;
      block('gallery dado panel',schedule.body,along,.50,.076,bay-.014,.83,.027);
      block('gallery upper wall lining',n%3===0?'linen':'plaster',along,1.94,.076,bay-.014,1.96,.027);
      block('gallery joint cover',schedule.trim,along-bay/2+.012,1.94,.093,.014,1.96,.012);
    }
    block('gallery dado cap',schedule.trim,(start+end)/2,.94,.095,end-start,.033,.040);
    block('gallery cornice',schedule.body,(start+end)/2,2.96,.099,end-start,.085,.11);
    block('gallery concealed wall wash','warm',(start+end)/2,2.91,.13,end-start-.22,.014,.026);
  }
}

export function arrivalBoards(layout) {
  const root=layout.circulation[0],east=root.axis==='H';
  const angle=east?Math.PI/2:0;
  const width=Math.min(3.24,(east?root.d:root.w)-.28);
  const format=(x,y,z)=>({x,y,z,width,height:width/5,angle});
  const end=east?format(layout.w/2-.37,3.20,root.z):format(root.x,3.16,layout.d/2-.12);
  const length=east?root.w:root.d;
  const along=-length/2+Math.min(6,length*.46);
  const near=format(root.x+(east?along:0),2.98,root.z+(east?0:along));
  return [end,near];
}

export function mountArrivalBoards(kit,layout,schedule) {
  for (const [index,board] of arrivalBoards(layout).entries()) {
    const horizontal=board.angle!==0;
    const block=(name,finish,x,y,z,width,height,depth)=>{
      kit.box(name,finish,x,y,z,horizontal?depth:width,height,horizontal?width:depth,0);
    };
    block('facility identity fascia','graphite',board.x,board.y,board.z,board.width+.08,board.height+.08,.075);
    block('fascia lower reveal',schedule.trim,board.x,board.y-board.height/2-.033,board.z,board.width+.10,.023,.085);
    if(index===1)for(const side of [-1,1]){
      const top=board.y+board.height/2+.04;
      block('suspended fascia hanger',schedule.trim,board.x+(horizontal?0:side*board.width*.40),
        (top+3.59)/2,board.z+(horizontal?side*board.width*.40:0),.036,3.59-top,.036);
    }
  }
}
