// Countertop teaching objects, in metres. The local origin is the top centre of
// the plinth; negative Z faces the visitor. Every part fits the 0.60 m counter.
function care(k) {
  k.box('hand therapy pegboard', 'oak', 0,.022,0, .64,.044,.35);
  for (let column=0; column<5; column++) {
    for (let row=0; row<2; row++) {
      const x=(column-2)*.112, z=(row-.5)*.14;
      k.cylinder('peg socket', 'graphite', x,.045,z,.033,.006);
      if ((column+row)%3===0) continue;
      const height=.075+.025*column;
      k.cylinder('graduated therapy peg', row?'sage':'clay', x,.045+height/2,z,.024,height);
      k.sphere('rounded therapy grip', row?'sage':'clay', x,.045+height,z,.032);
    }
  }
}

function propagation(k) {
  k.box('seedling tray', 'sage', 0,.037,0,.68,.074,.32);
  for (let n=0;n<3;n++) {
    const x=(n-1)*.21;
    k.cylinder('root plug', 'soil',x,.08,0,.063,.06,.080);
    const top=.16+n*.066;
    k.bar('seedling stem','leaf',[x,.105,0],[x+.013,top,0],.005);
    for(const angle of [.9,3.8]) k.leaf('cotyledon',x+.013,top,0,.09+n*.023,angle+n*.3);
  }
}

function records(k) {
  k.box('archival tray','walnut',0,.022,0,.74,.044,.37);
  for (const x of [-.347,.347]) k.box('tray edge','walnut',x,.055,0,.045,.065,.37);
  for(let i=0;i<4;i++) {
    const x=-.24+i*.078, angle=-.09;
    const board=k.box('archival binder','slate',x,.202,.02,.055,.32,.25,.006);
    board.rotation.z=angle;
    const tab=k.box('binder index','linen',x+.005,.255,-.109,.038,.058,.005,.001);
    tab.rotation.z=angle;
  }
  k.box('document pad','leather',.18,.059,0,.21,.025,.26);
  k.box('intake sheet','porcelain',.18,.075,0,.194,.004,.24,0);
}

function media(k) {
  k.box('grading console','graphite',0,.041,0,.76,.082,.34);
  for (let channel=0; channel<3; channel++) {
    const x=(channel-1)*.23;
    k.cylinder('grading wheel bezel','steel',x,.09,.025,.068,.018);
    k.sphere('colour grading trackball', ['sage','clay','slate'][channel],x,.100,.025,.046,.027,.046);
    for(let j=0;j<3;j++) k.box('console transport key','linen',x+(j-1)*.04,.087,-.092,.029,.012,.023,.002);
  }
}

function making(k) {
  k.box('surface plate','slate',0,.041,0,.70,.082,.34);
  k.cylinder('indicator stand','graphite',-.20,.096,.05,.075,.033);
  k.bar('gauge column','steel',[-.20,.11,.05],[-.20,.43,.05],.018);
  k.bar('gauge cross-arm','steel',[-.20,.33,.05],[.06,.33,.05],.013);
  k.cylinder('dial gauge case','graphite',.06,.298,.04,.072,.056,.072,Math.PI/2);
  k.cylinder('dial gauge face','porcelain',.06,.298,.009,.061,.007,.061,Math.PI/2);
  k.bar('gauge needle','graphite',[.06,.298,.003],[.087,.324,.003],.0025);
  k.bar('spring probe','steel',[.06,.231,.044],[.06,.147,.044],.006);
  k.box('gauge block','steel',.06,.114,.044,.12,.064,.09,.002);
}

function operations(k) {
  k.box('field terminal housing','graphite',0,.135,.04,.65,.27,.26,.021);
  k.box('instrument readout','instrumentDisplay',-.09,.158,-.095,.35,.164,.011,.002);
  for (const y of [.085,.191]) {
    k.cylinder('encoder bezel','steel',.196,y,-.098,.036,.024,.036,Math.PI/2);
    k.cylinder('encoder knob','rubber',.196,y,-.117,.027,.026,.027,Math.PI/2);
  }
  for (let i=0;i<6;i++) k.box('housing vent','rubber',-.14+i*.055,.272,.066,.023,.006,.12,0);
}

function learning(k) {
  // Two sloped halves support the pages at the spine.
  for(const side of [-1,1]) {
    const angle=side*.16, x=side*.127;
    for(const [name,finish,y,width,height] of [
      ['reading wedge','walnut',.055,.258,.046],
      ['folio cover','leather',.086,.255,.014],
      ['folio leaves','linen',.109,.247,.031],
    ]) k.box(name,finish,x,y,0,width,height,.32,.004).rotation.z=angle;
    for(let line=0;line<5;line++)
      k.box('folio line','slate',x,.126,-.094+line*.043,.151,.002,.004,0).rotation.z=angle;
    k.box('cradle foot','rubber',side*.205,.019,0,.055,.038,.26,.004);
  }
}

function hospitality(k) {
  k.box('service tray','walnut',0,.02,0,.72,.04,.35);
  k.cylinder('stoneware carafe','clay',-.17,.155,.025,.082,.23,.062);
  k.cylinder('carafe neck','clay',-.17,.294,.025,.056,.05,.047);
  k.cylinder('carafe mouth','slate',-.17,.321,.025,.035,.005);
  for(const z of [-.079,.085]) {
    k.cylinder('tasting cup','porcelain',.14,.089,z,.041,.098,.056);
    k.cylinder('cup well','clay',.14,.139,z,.047,.002);
  }
}

function mobility(k) {
  k.box('tactile transit board','slate',0,.026,0,.76,.052,.38);
  const points=[[-.31,-.10],[-.15,.057],[.02,.057],[.19,-.086],[.31,.02]];
  for(let i=0;i<points.length;i++){
    const [x,z]=points[i];
    if(i) k.bar('raised route','brass',[points[i-1][0],.062,points[i-1][1]],[x,.062,z],.009);
    k.cylinder('station marker','porcelain',x,.067,z,.023,.025);
  }
}

function workplace(k) {
  k.box('study model plinth','walnut',0,.022,0,.71,.044,.37);
  const blocks=[[-.20,.04,.16,.12,.13],[-.035,.015,.14,.26,.10],[.15,-.037,.17,.09,.15],[.17,.097,.13,.065,.065]];
  for(const [x,z,w,h,d] of blocks) {
    k.box('massing study','porcelain',x,.044+h/2,z,w,h,d,.002);
    k.box('model parapet','slate',x,.049+h,z,w+.006,.010,d+.006,0);
  }
}

const exhibits={care,'living-systems':propagation,trust:records,media,making,operations,learning,hospitality,mobility,workplace};

export function fitCountertopExhibit(k, identity, x, z) {
  const start=k.parts.length;
  exhibits[identity.kind](k);
  const scale=Math.min(identity.artifactScale,identity.credenzaWidth/.90);
  for(const part of k.parts.slice(start)) {
    part.position.multiplyScalar(scale);
    part.position.x+=x;
    part.position.y+=.9775;
    part.position.z+=z;
    part.scale.multiplyScalar(scale);
  }
}
