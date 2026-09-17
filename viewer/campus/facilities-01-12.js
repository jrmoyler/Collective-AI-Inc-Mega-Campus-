// Individual atlas reconstructions. Dimensions are schematic envelope fits, not surveys.
import * as T from 'three';
import {Batch,cylinder,ring} from './geometry.js';

const rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
function plate(b,points,y,depth,mat='stone'){
 const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:6});g.rotateX(-Math.PI/2);b.add(g,mat,0,y,0);g.dispose();
}
function perimeter(b,p,y,height,{skin='dark',bay=3.2,opaque=[]}={}){
 for(let i=0;i<p.length;i++){
  const a=p[i],c=p[(i+1)%p.length],dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz),rot=-Math.atan2(dz,dx),n=Math.max(1,Math.ceil(length/bay));
  const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2;
  b.box(opaque.includes(i)?skin:'glazing',x,y+height/2,z,length,height-.25,.10,rot);
  b.box(skin,x,y+height-.22,z,length,.42,.22,rot);
  for(let j=0;j<n;j++)b.box('steel',a[0]+dx*j/n,y+height/2,a[1]+dz*j/n,.10,height,.10);
 }
}
function shell(b,p,y,h,levels,{skin='dark',bay=3.2,opaque=[]}={}){
 const fh=h/levels;
 for(let i=0;i<levels;i++){plate(b,p,y+i*fh,.26);perimeter(b,p,y+i*fh+.26,fh-.26,{skin,bay,opaque});}
 plate(b,p,y+h,.32,skin);
}
function rail(b,p,y){perimeter(b,p,y,1.05,{skin:'steel',bay:3});}
function rounded(x,z,w,d,r=4){
 const pts=[];for(const [cx,cz,start] of [[x+w/2-r,z+d/2-r,0],[x-w/2+r,z+d/2-r,Math.PI/2],[x-w/2+r,z-d/2+r,Math.PI],[x+w/2-r,z-d/2+r,Math.PI*1.5]])for(let i=0;i<=6;i++){const a=start+i*Math.PI/12;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}return pts;
}
function beam(b,a,c,r=.12,mat='steel'){
 const av=new T.Vector3(...a),cv=new T.Vector3(...c),delta=cv.clone().sub(av);
 const geo=new T.CylinderGeometry(r,r,delta.length(),8);
 geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
 b.add(geo,mat,(a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2);geo.dispose();
}

function solar(b,x,y,z,w,d){b.box('solar',x,y,z,w,.14,d);for(let i=-w/2;i<=w/2;i+=2)b.box('steel',x+i,y+.08,z,.03,.018,d);for(let j=-d/2;j<=d/2;j+=2)b.box('steel',x,y+.08,z+j,w,.018,.025);}
function garden(b,x,y,z,w,d){b.box('stone',x,y+.18,z,w,.36,d);b.box('leaf',x,y+.40,z,w-.35,.18,d-.35);for(let i=0;i<Math.min(7,Math.floor(w/3));i++){const px=x-w*.38+i*w*.76/Math.max(1,Math.min(7,Math.floor(w/3))-1);cylinder(b,'trunk',px,y+1,z,.065,1.2,.04,7);const g=new T.SphereGeometry(.68,7,5);b.add(g,'leaf',px,y+1.8,z,1,1.3,1);g.dispose();}}
function office(b,x,y,z,cols=3){for(let i=0;i<cols;i++){const px=x+(i-(cols-1)/2)*3.2;b.box('stone',px,y+.85,z,2.2,.09,1);for(const dx of [-.85,.85])b.box('steel',px+dx,y+.42,z,.07,.8,.72);b.box('dark',px,y+1.28,z-.2,.78,.48,.07);b.box('dark',px,y+.52,z+.8,.5,.12,.5);b.box('dark',px,y+.86,z+1,.52,.6,.08);}}
function racks(b,x,y,z,n=5){for(let i=0;i<n;i++){const px=x+i*2;b.box('dark',px,y+1.45,z,1.2,2.9,1.1);for(let j=0;j<8;j++){b.box('steel',px,y+.3+j*.32,z+.565,1,.22,.025);b.box('cyan',px-.35,y+.3+j*.32,z+.59,.06,.05,.018);}}}
function machinery(b,x,y,z){b.box('white',x,y+1.1,z,2.7,2.2,2.1);b.box('glazing',x,y+1.25,z+1.06,1.8,1.4,.04);b.box('dark',x+1.05,y+1.6,z+1.1,.4,.65,.05);b.box('steel',x,y+.65,z+.3,1.4,.2,1);}
function entry(b,x,z,w,y=0){b.box('steel',x,y+3.1,z+.9,w,.12,2);for(const s of [-1,1]){b.box('steel',x+s*w/2,y+1.5,z,.10,3,.13);b.box('glazing',x+s*.7,y+1.45,z,1.35,2.85,.07);b.box('gold',x+s*.1,y+1.2,z+.08,.035,.6,.04);}b.box('path',x,y+.08,z+1.2,w+1,.16,2.8);}
function cylinderShell(b,x,z,r,h,levels=3,y=0){const n=48,p=Array.from({length:n},(_,i)=>[x+Math.cos(i*Math.PI*2/n)*r,z+Math.sin(i*Math.PI*2/n)*r]);shell(b,p,y,h,levels,{bay:4});return p;}
function louver(b,x,y,z,w,h){for(let i=-w/2;i<w/2;i+=1.2)b.box('copper',x+i,y+h/2,z,.12,h,.55);}
function water(b,x,y,z,w,d){b.box('stone',x,y,z,w,.3,d);b.box('water',x,y+.17,z,w-.35,.025,d-.35);}
function plantRoof(b,x,y,z,w,d){garden(b,x,y,z+d*.35,w*.84,d*.14);solar(b,x,y+.6,z-d*.12,w*.63,d*.4);}

const builders={
1(b,{w,d,h}){
 const body=rect(-w*.16,0,w*.61,d*.79);shell(b,body,0,h*.88,12,{bay:2.3});
 // Sloping crown follows the asymmetric top edge in the atlas.
 const crown=[[-w*.465,-d*.395], [w*.145,-d*.395],[w*.145,d*.395],[-w*.465,d*.395]];
 const ys=[h,h*.96,h*.88,h*.93];const verts=[];
 for(let i=0;i<4;i++){const j=(i+1)%4;verts.push(crown[i][0],h*.88,crown[i][1],crown[j][0],h*.88,crown[j][1],crown[j][0],ys[j],crown[j][1],crown[i][0],h*.88,crown[i][1],crown[j][0],ys[j],crown[j][1],crown[i][0],ys[i],crown[i][1]);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();b.add(g,'glazing');g.dispose();
 b.box('dark',-w*.36,h*.33,d*.41,w*.20,h*.65,.6);
 for(const fraction of [.20,.43,.66]){const y=h*fraction,p=rect(w*.31,d*.12,w*.42,d*.55);shell(b,p,y,h*.10,1);rail(b,p,y+h*.10+.35);garden(b,w*.31,y+h*.10+.4,d*.25,w*.33,2.6);office(b,w*.31,y,d*.12,4);for(const s of [-1,1])beam(b,[w*.12,y-4,d*.12+s*d*.23],[w*.5,y,d*.12+s*d*.23],.18);}
 const roof=h*.96;cylinderShell(b,-w*.10,-d*.02,w*.22,3,1,roof);ring(b,'steel',-w*.10,roof+3.3,-d*.02,w*.24,.14);ring(b,'cyan',-w*.10,roof+3.35,-d*.02,w*.23,.035);
 for(let i=0;i<7;i++)cylinder(b,'steel',-w*.35+i*1.5,h+2+i%3,-d*.28,.10,4+i%3, .08,10);
 shell(b,rect(0,d*.2,w*.95,d*.6),0,5,1);entry(b,0,d*.505,w*.3);
},
2(b,{w,d,h}){
 shell(b,rect(0,0,w*.90,d*.84),0,h*.83,3,{skin:'dark',opaque:[0]});
 shell(b,rect(-w*.15,-d*.04,w*.4,d*.45),h*.83,h*.17,1);office(b,-w*.15,h*.83,-d*.03,5);
 for(const x of [-w*.45,w*.34]){const p=[[x-2,-d*.4],[x+3,-d*.4],[x+7,d*.4],[x-1,d*.4]];plate(b,p,0,h*.87,'dark');}
 for(let j=0;j<3;j++)racks(b,0,h*.55,-d*.22+j*4,Math.floor(w*.34/2));
 for(let i=-2;i<=2;i++){cylinder(b,'steel',w*.30+i*2,2,-d*.36,.5,4,.5,12);beam(b,[w*.30+i*2,4,-d*.36],[w*.30+i*2,h*.75,-d*.36],.15,'cyan');}
 for(const x of [-w*.36,w*.36]){water(b,x,.3,d*.45,w*.16,5);b.box('water',x,2.1,d*.41,w*.12,3.3,.06);}
 plantRoof(b,0,h*.84,-d*.05,w*.78,d*.7);entry(b,-w*.10,d*.43,w*.27);office(b,-w*.20,h*.29,d*.18,4);
},
3(b,{w,d,h}){
 // Only the entrance pavilion sits above ground. The atlas's large central
 // vault cylinder belongs to the two subterranean levels, not the skyline.
 const wingH=h*.38,centerH=h*.51;
 for(const side of [-1,1]){
  const wing=rounded(side*w*.265,-d*.06,w*.37,d*.54,Math.min(w*.13,d*.19));
  shell(b,wing,0,wingH,1,{skin:'dark',bay:1.7});
  // Bronze screen depth is visible independently from the glass mullions.
  for(let i=0;i<7;i++){const x=side*w*.265+(i-3)*w*.039;b.box('gold',x,wingH*.48,d*.214,.09,wingH*.93,.30);}
  garden(b,side*w*.27,wingH+.35,-d*.09,w*.24,2.2);
  rail(b,wing,wingH+.33);
 }
 // Recessed secure core and raised center pavilion interrupt both rooflines.
 cylinderShell(b,0,-d*.17,w*.14,h*.46,1);
 shell(b,rect(0,d*.04,w*.29,d*.37),0,centerH,1,{skin:'stone',opaque:[0]});
 b.box('dark',0,centerH*.65,d*.233,w*.27,centerH*.63,.38);
 for(const side of [-1,1]){b.box('stone',side*w*.149,centerH*.5,d*.25,.35,centerH,.65);b.box('gold',side*w*.139,centerH*.52,d*.257,.055,centerH*.9,.08);}
 entry(b,0,d*.242,w*.20);entry(b,0,d*.13,w*.16);
 for(let i=0;i<6;i++)b.box('stone',0,.12+i*.13,d*.45-i*.8,w*.31,.24,.9);
 for(const side of [-1,1])cylinder(b,'steel',side*w*.33,.9,d*.34,.13,1.8,.13,12);
},

4(b,{w,d,h}){
 shell(b,rect(-w*.32,0,w*.30,d*.86),0,h,4,{skin:'stone'});shell(b,rect(w*.32,-d*.04,w*.30,d*.78),0,h,4,{skin:'stone'});shell(b,rect(0,-d*.32,w*.35,d*.22),0,h*.87,4);
 cylinderShell(b,0,-d*.08,w*.16,h*.96,4);ring(b,'gold',0,h*.97,-d*.08,w*.16,.12);cylinder(b,'gold',0,h*.52,-d*.08,w*.064,h*.70,w*.064,32);
 for(let level=0;level<4;level++){const y=level*h/4;office(b,-w*.31,y,0,5);for(let j=0;j<5;j++)b.box('copper',w*.27,y+.5+j*.2,-d*.04+j*2,w*.2,.4,1.2);}
 shell(b,rect(0,d*.32,w*.45,d*.22),0,h*.36,2,{skin:'stone'});plantRoof(b,-w*.32,h+.3,0,w*.28,d*.7);plantRoof(b,w*.32,h+.3,0,w*.28,d*.7);entry(b,0,d*.44,w*.26);
},
5(b,{w,d,h}){
 shell(b,rect(0,0,w*.94,d*.88),0,h*.40,1,{skin:'dark'});
 shell(b,rect(-w*.23,-d*.10,w*.47,d*.66),h*.40,h*.60,1,{skin:'dark',opaque:[0,3]});shell(b,rect(w*.26,-d*.10,w*.40,d*.66),h*.40,h*.49,1,{skin:'dark',opaque:[0]});
 // Two full-height sound stages, an LED volume and physical lighting gantries.
 b.box('dark',-w*.24,h*.68,-d*.37,w*.40,h*.47,.5);b.box('blueGlass',-w*.24,h*.68,-d*.36+.3,w*.37,h*.43,.04);
 for(let i=-2;i<=2;i++){beam(b,[-w*.45,h*.94,i*d*.1],[-w*.02,h*.94,i*d*.1],.09);for(let j=0;j<4;j++)b.box('warm',-w*.39+j*w*.10,h*.90,i*d*.1,.35,.25,.45);}
 shell(b,rect(w*.24,d*.30,w*.46,d*.25),h*.40,h*.22,1);office(b,w*.24,h*.40,d*.30,5);plantRoof(b,-w*.22,h+.3,-d*.05,w*.42,d*.5);entry(b,-w*.18,d*.45,w*.23);louver(b,-w*.38,0,d*.45,w*.17,h*.4);
},
6(b,{w,d,h}){
 shell(b,rect(0,0,w*.93,d*.89),0,h*.34,1);shell(b,rect(0,-d*.1,w*.85,d*.67),h*.34,h*.31,1);shell(b,rect(0,-d*.24,w*.80,d*.39),h*.65,h*.35,1);
 for(const y of [h*.34,h*.65]){rail(b,rect(0,d*.30,w*.9,d*.24),y+.3);garden(b,0,y+.35,d*.38,w*.70,2);office(b,0,y,d*.16,6);}
 b.box('blueGlass',-w*.22,h*.82,-d*.39,w*.31,h*.20,.08);office(b,-w*.21,h*.66,-d*.18,4);plantRoof(b,0,h+.3,-d*.24,w*.78,d*.36);entry(b,0,d*.46,w*.34);
},
7(b,{w,d,h}){
 shell(b,rect(0,0,w*.92,d*.92),0,h*.70,2,{skin:'dark',opaque:[0]});shell(b,rect(-w*.22,-d*.15,w*.47,d*.60),h*.70,h*.3,1,{skin:'dark'});
 for(const side of [-1,1])for(let i=0;i<10;i++)b.box('copper',side*w*.46, h*.40,-d*.41+i*d*.084,.20,h*.75,.23);
 for(let iz=-2;iz<=2;iz++)for(let ix=-1;ix<=1;ix++)machinery(b,ix*w*.23,h*.35,iz*d*.15);
 shell(b,rect(w*.25,d*.28,w*.38,d*.32),0,h*.34,1);office(b,w*.25,0,d*.28,3);// Shallow roof monitors expose a repeated clerestory silhouette instead
 // of the former single featureless lid. Their heights stay below the taller
 // print-farm block and differ from CF08's large folded high-bay roof.
 for(const [cx,cy,width] of [[-w*.22,h,w*.43],[w*.25,h*.70,w*.36]]){
  for(let i=0;i<3;i++){
   const z=-d*.34+i*d*.17,depth=d*.135,rise=1.5;
   const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute([cx-width/2,cy+.12,z-depth/2,cx+width/2,cy+.12,z-depth/2,cx+width/2,cy+rise,z+depth/2,cx-width/2,cy+.12,z-depth/2,cx+width/2,cy+rise,z+depth/2,cx-width/2,cy+rise,z+depth/2],3));roof.computeVertexNormals();b.add(roof,'steel');roof.dispose();
   b.box('glazing',cx,cy+rise*.5,z+depth/2,width,rise,.06);
   for(let q=-width/2;q<width/2;q+=2.8)b.box('dark',cx+q,cy+rise*.5,z+depth/2,.07,rise,.09);
   const pitch=Math.atan((rise-.12)/depth),panel=new T.BoxGeometry(1,1,1);b.add(panel,'solar',cx,cy+(rise+.12)*.5+.07,z,width*.70,.08,depth*.60/Math.cos(pitch),0,-pitch);panel.dispose();
  }
 }
 for(let i=0;i<3;i++){const x=-w*.17+i*w*.15;b.box('steel',x,h*.71+1.2,d*.10,2.7,2.4,2.1);for(let j=-3;j<=3;j++)b.box('dark',x+j*.30,h*.71+2.42,d*.10,.14,.035,1.9);}
entry(b,w*.25,d*.46,w*.24);
},
8(b,{w,d,h}){
 shell(b,rect(0,0,w*.94,d*.9),0,h*.83,1,{skin:'steel',bay:4.5});
 // Four raised northlight bays, real folded roof sections and crane rails.
 for(let i=0;i<4;i++){const z=-d*.34+i*d*.22;const geo=new T.BufferGeometry(),z0=z-d*.105,z1=z+d*.105;geo.setAttribute('position',new T.Float32BufferAttribute([-w*.49,h*.83,z0,w*.49,h*.83,z0,w*.49,h,z1,-w*.49,h*.83,z0,w*.49,h,z1,-w*.49,h,z1],3));geo.computeVertexNormals();b.add(geo,'steel');geo.dispose();b.box('glazing',0,h*.915,z1,w*.96,h*.17,.05);const pitch=Math.atan(h*.17/(d*.21)),pane=new T.BoxGeometry(1,1,1);for(let x=-w*.4;x<w*.45;x+=w*.16)b.add(pane,'blueGlass',x,h*.915+.06,z,w*.10,.08,d*.13/Math.cos(pitch),0,-pitch);pane.dispose();}
 for(const x of [-w*.36,w*.36]){beam(b,[x,h*.69,-d*.42],[x,h*.69,d*.42],.23,'gold');for(let z=-d*.4;z<d*.45;z+=d*.2)b.box('steel',x,h*.345,z,.4,h*.69,.4);}
 for(const z of [-d*.2,d*.2]){b.box('gold',0,h*.70,z,w*.76,.8,1.3);beam(b,[0,h*.70,z],[0,h*.4,z],.06);cylinder(b,'dark',0,h*.38,z,.4,.6,.4,12);}
 for(let z=-d*.3;z<d*.4;z+=d*.2)for(const x of [-w*.2,w*.2]){machinery(b,x,0,z);b.box('gold',x, .10,z, w*.25,.10,d*.14);}
 b.box('dark',-w*.29,h*.43,d*.46,w*.32,h*.82,.7);entry(b,w*.23,d*.46,w*.24);
},
9(b,{w,d,h}){
 const outer=rounded(0,0,w*.94,d*.90,Math.min(w,d)*.24);shell(b,outer,0,h*.57,2,{skin:'dark',bay:4});
 // Horseshoe upper deck: no opaque fill in the central service court.
 shell(b,rounded(-w*.34,-d*.02,w*.26,d*.79,5),h*.57,h*.21,1);shell(b,rounded(w*.34,-d*.02,w*.26,d*.79,5),h*.57,h*.21,1);shell(b,rect(0,-d*.31,w*.45,d*.25),h*.57,h*.21,1);
 // Atlas explicitly schedules twenty ports: seven per side wing and six
 // on the rear connector. These are compact autonomous-drone landing pads.
 const ports=[];for(const side of [-1,1])for(let i=0;i<7;i++)ports.push([side*w*.34,(-.30+i*.10)*d,Math.min(w*.095,d*.043)]);
 for(let i=0;i<6;i++)ports.push([(-.18+i*.072)*w,-d*.31,Math.min(w*.030,d*.085)]);
 for(const [x,z,r] of ports){cylinder(b,'dark',x,h*.79,z,r,.14,r,24);ring(b,'gold',x,h*.8,z,r*.87,.045);b.box('white',x,h*.81,z,.12,.04,r);b.box('white',x,h*.81,z,r*.6,.04,.12);}

 cylinderShell(b,0,-d*.13,w*.05,h*.95,3);cylinderShell(b,0,-d*.13,w*.085,h*.16,1,h*.84);ring(b,'steel',0,h*1.005,-d*.13,w*.09,.09);
 for(let i=-2;i<=2;i++){b.box('dark',i*w*.16,2.4,d*.454,w*.12,4.8,.2);b.box('steel',i*w*.16,4.9,d*.46,w*.13,.18,1.4);}entry(b,-w*.36,d*.37,w*.15);
},
10(b,{w,d,h}){
 shell(b,rect(0,0,w*.94,d*.9),0,h*.90,1,{skin:'dark',opaque:[0,1,3],bay:4});
 for(let x=-w*.44;x<w*.45;x+=1.1)b.box('steel',x,h*.53,-d*.451,.08,h*.74,.13);
 for(let x=-w*.32;x<w*.4;x+=w*.22){b.box('dark',x,2.7,d*.452,w*.13,5.4,.2);b.box('steel',x,5.6,d*.48,w*.15,.2,2.3);for(let j=0;j<5;j++)b.box('steel',x,j+ .5,d*.455,w*.12,.035,.04);for(const side of [-1,1])cylinder(b,'gold',x+side*w*.075,.7,d*.49,.09,1.4,.09,10);}
 for(let z=-d*.28;z<d*.2;z+=5)racks(b,-w*.32,0,z,Math.floor(w*.65/2));
 shell(b,rect(-w*.30,d*.28,w*.32,d*.34),0,h*.35,1);entry(b,-w*.30,d*.45,w*.20);solar(b,0,h*.90+.5,-d*.10,w*.77,d*.55);b.box('white',w*.32,h*.93,-d*.32,w*.15,1.1,d*.15);
},
11(b,{w,d,h}){
 shell(b,rounded(0,0,w*.94,d*.89,8),0,h*.25,2,{skin:'stone'});
 for(const [x,z,r,hh] of [[-.22,-.14,.20,1],[.23,-.12,.17,.83]]){
  cylinderShell(b,x*w,z*d,r*w,h*hh,Math.round(h*hh/6));
  for(let y=4;y<h*hh-2;y+=4){ring(b,'leaf',x*w,y,z*d,r*w*.86,.6);ring(b,'magenta',x*w,y+.7,z*d,r*w*.85,.045);for(let a=0;a<Math.PI*2;a+=Math.PI/3)cylinder(b,'white',x*w+Math.cos(a)*r*w*.6,y+1.2,z*d+Math.sin(a)*r*w*.6,.16,2,.16,8);}
 }
 for(const [y,scale] of [[h*.25,1],[h*.48,.85],[h*.70,.65]]){const p=rounded(w*.10,d*.12,w*.8*scale,d*.63,6);plate(b,p,y,.45);rail(b,p,y+.45);garden(b,w*.13,y+.5,d*.40,w*.58*scale,2.5);}
 b.box('dark',-w*.32,h*.4,d*.37,w*.25,h*.75,1);for(let x=-w*.43;x<-w*.21;x+=1.4)for(let y=3;y<h*.76;y+=1.6){const g=new T.SphereGeometry(.9,6,4);b.add(g,'leaf',x,y,d*.39,1,.95,.5);g.dispose();}
 for(let i=0;i<5;i++)cylinder(b,'steel',-w*.18+i*3,h*.27,d*.11,1.1,3,1.1,16);entry(b,w*.17,d*.45,w*.20);
},
12(b,{w,d,h}){
 const west=rounded(-w*.30,0,w*.37,d*.90,Math.min(w,d)*.12),east=rounded(w*.30,0,w*.37,d*.90,Math.min(w,d)*.12);
 shell(b,west,0,h,3,{skin:'white'});shell(b,east,0,h*.96,3,{skin:'white'});shell(b,rounded(0,-d*.32,w*.6,d*.27,6),0,h,3,{skin:'white'});
 for(const [p,y] of [[west,h],[east,h*.96]]){rail(b,p,y+.32);}
 for(const x of [-w*.30,w*.30]){plantRoof(b,x,h+(x>0?-h*.04:0)+.3,0,w*.30,d*.74);for(let y=0;y<h-2;y+=h/3)for(let z=-d*.2;z<d*.35;z+=d*.22)machinery(b,x,y,z);}
 const link=rounded(0,d*.28,w*.4,d*.18,4);shell(b,link,h*.33,3.3,1,{skin:'white'});rail(b,link,h*.33+3.6);garden(b,0,.2,0,w*.20,d*.33);
 cylinder(b,'stone',0,1,0,w*.04,1.6,w*.04,24);for(let i=0;i<24;i++){const a=i*Math.PI/6,y=2+i*.30;for(const s of [-1,1]){const x=Math.sin(a+s*Math.PI)*1.15,z=Math.cos(a+s*Math.PI)*1.15;cylinder(b,'cyan',x,y,z,.055,.4,.055,6);}if(i%2===0)beam(b,[Math.sin(a)*1.15,y,Math.cos(a)*1.15],[-Math.sin(a)*1.15,y,-Math.cos(a)*1.15],.035,'steel');}
 entry(b,-w*.28,d*.45,w*.22);
}
};

export function createFacility01to12(f){
 const build=builders[f.id];if(!build)return null;
 const b=new Batch();b.box('path',0,.10,0,f.w+8,.2,f.d+8);build(b,f);
 const root=b.finish(`${f.key}-atlas-shell`);
 root.userData.facility=f.id;root.userData.referenceSource=`CF-${String(f.id).padStart(2,'0')}_Facility_Infographic.png`;
 root.userData.referenceInterpretation='Observed facade reconstruction; hidden elevations and dimensions inferred';
 root.traverse(o=>{o.userData.facility=f.id;});

 root.userData.sculptRuntime={parts:root.children.map(c=>c.name),clickable:true};return root;
}
