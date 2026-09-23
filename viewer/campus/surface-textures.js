// Shared deterministic surface painter for runtime and offline geometry review.
export function paintSurface(c,name){
 const screen=name==='display',size=screen?1024:512;
 let seed=7291;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 if(screen){
  c.fillStyle='#0b1b2a';c.fillRect(0,0,size,size);c.fillStyle='#123043';c.fillRect(0,0,1024,100);c.fillStyle='#b4d6dd';c.font='32px sans-serif';c.fillText('COLLECTIVE / OPERATIONS',44,65);
  for(let i=0;i<3;i++){c.fillStyle='#18374a';c.fillRect(40+i*328,135,304,132);c.fillStyle='#58b9c4';c.font='48px sans-serif';c.fillText(['35','74','220'][i],64+i*328,211);c.font='18px sans-serif';c.fillText(['FACILITIES','FLOOR PROGRAMS','ACRES'][i],64+i*328,243);}
  c.strokeStyle='#64bfc6';c.lineWidth=3;c.beginPath();for(let i=0;i<50;i++){const x=45+i*19,y=415+Math.sin(i*.4)*38+Math.cos(i*.13)*35;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();
  for(let i=0;i<8;i++){c.fillStyle=i%2?'#132939':'#102431';c.fillRect(40,540+i*51,944,46);c.fillStyle='#779cab';c.fillRect(63,554+i*51,130+(i%3)*42,9);c.fillStyle='#35566a';c.fillRect(355,554+i*51,220,9);c.fillStyle='#72beb6';c.fillRect(849,554+i*51,90,9);}
 }else{
  c.fillStyle='#bbbbbb';c.fillRect(0,0,size,size);
  if(name==='oak'){for(let i=0;i<1700;i++){const v=145+rand()*85;c.strokeStyle=`rgba(${v},${v},${v},.35)`;c.lineWidth=.2+rand()*1.3;c.beginPath();const y=rand()*size;for(let x=0;x<=size;x+=8)c.lineTo(x,y+Math.sin(x*.022+y*.4)*1.6);c.stroke();}}
  else if(name==='fabric'){for(let i=0;i<size;i+=3){c.strokeStyle=i%2?'#a4a4a4':'#d0d0d0';c.beginPath();c.moveTo(i,0);c.lineTo(i,size);c.moveTo(0,i);c.lineTo(size,i);c.stroke();}}
  else {for(let i=0;i<26000;i++){const v=150+rand()*85;c.fillStyle=`rgba(${v},${v},${v},.22)`;c.fillRect(rand()*size,rand()*size,.5+rand()*2,.5+rand()*2);}if(name==='stone'){c.strokeStyle='#a5a6a3';c.lineWidth=.4;for(let i=0;i<16;i++){c.beginPath();const y=rand()*size;c.moveTo(0,y);c.bezierCurveTo(140,y+22,340,y-12,512,y+10);c.stroke();}}}
 }
}

function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
// Tileable value noise: every texture spans exactly one metre and must wrap seamlessly.
function lattice(r,period,py=period){
 const g=new Float32Array(period*py);for(let i=0;i<g.length;i++)g[i]=r();
 return (x,y)=>{
  const fx=((x%period)+period)%period,fy=((y%py)+py)%py,x0=Math.floor(fx),y0=Math.floor(fy),x1=(x0+1)%period,y1=(y0+1)%py;
  let tx=fx-x0,ty=fy-y0;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty);
  const a=g[y0*period+x0],b=g[y0*period+x1],c=g[y1*period+x0],d=g[y1*period+x1];
  return (a+(b-a)*tx)+((c+(d-c)*tx)-(a+(b-a)*tx))*ty;
 };
}
function fbm(r,base,octaves=4){
 const layers=Array.from({length:octaves},(_,o)=>lattice(r,base<<o));
 return (u,v)=>{let sum=0,amp=.5,norm=0;for(let o=0;o<octaves;o++){sum+=layers[o](u*(base<<o),v*(base<<o))*amp;norm+=amp;amp*=.5;}return sum/norm;};
}
const painted=new Map();
// Physically plausible finish albedo per metre tile. Deterministic; cached per finish/size
// so floor rebuilds never repaint. Luminance variation also drives roughness/normal maps.
function paintPixels(name,base,size){
 const r=rng(name.split('').reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,17));
 const R=(base>>16)&255,G=(base>>8)&255,B=base&255,data=new Uint8ClampedArray(size*size*4);
 const put=(i,k,tint=[1,1,1])=>{data[i]=R*k*tint[0];data[i+1]=G*k*tint[1];data[i+2]=B*k*tint[2];data[i+3]=255;};
 const px=(fn)=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++)fn((y*size+x)*4,x/size,y/size);};
 if(name==='plank'||name==='oak'||name==='walnut'){
  // Quarter-sawn boards run along U; floors show staggered end joints and eased edges.
  const boards=name==='plank'?9:7,ring=fbm(r,4,4),pore=lattice(r,8,Math.max(64,size>>1)),tone=Array.from({length:boards*3},()=>.9+r()*.18),offs=Array.from({length:boards},()=>r());
  px((i,u,v)=>{
   const row=Math.floor(v*boards),vv=v*boards-row,seg=0,t=tone[(row*3+seg)%tone.length];
   const warp=ring(u,v*3)*7,grain=.5+.5*Math.sin((vv*9+warp)*Math.PI*2),fine=.5+.5*Math.sin((v*size*.9+warp*14)*1.3);
   let k=t*(.86+grain*.12+fine*.04)*(.94+pore(u*8,v*Math.max(64,size>>1))*.1);
   if(name==='plank'){const edge=Math.min(vv,1-vv)*size/boards,end=Math.abs(((u+offs[row])%1)-.5);if(edge<1.1)k*=.6+.3*edge/1.1;if(.5-end<.0018)k*=.62;}
   put(i,k,[1,.985+grain*.02,.96+grain*.03]);
  });
 }else if(name==='terrazzo'){
  const cloud=fbm(r,4,3);px((i,u,v)=>put(i,.97+cloud(u,v)*.06));
  return {data,chips:Array.from({length:Math.round(size*size*.006)},()=>{const pick=r();return [r()*size,r()*size,(.8+r()*r()*4)*size/512,pick<.5?'#ebe7de':pick<.75?'#a9a49b':pick<.9?'#d2c3a8':pick<.97?'#77716a':'#a57a62',r()*Math.PI];})};
 }else if(name==='floorStone'){
  // Large-format honed limestone, 1.0 x 0.5 m, with 2 mm grout.
  const cloud=fbm(r,3,4),vein=fbm(r,6,3),speck=lattice(r,size>>1);
  px((i,u,v)=>{const tile=Math.floor(v*2)+Math.floor(u),tint=[1,1,1];let k=.93+cloud(u*1.7,v*1.3+tile)*.1+(speck(u*size*.5,v*size*.5)>.93?-.07:0);
   const vn=Math.abs(Math.sin((u*3+v*1.2+vein(u,v)*2.5)*Math.PI));if(vn<.035)k*=.9;
   const gu=Math.min(u,1-u)*size,gv=Math.min((v*2)%1,1-(v*2)%1)*size/2;if(gu<.9||gv<.9)k*=.7;put(i,k,tint);});
 }else if(['stone','porcelain'].includes(name)){
  const cloud=fbm(r,4,4),vein=fbm(r,5,4);
  px((i,u,v)=>{let k=.95+cloud(u,v)*.08;if(name==='stone'){const vn=Math.abs(Math.sin((u*2+v+vein(u,v)*3)*Math.PI));if(vn<.04)k*=.9+vn*2.5;}put(i,k);});
 }else if(name==='plaster'){
  const cloud=fbm(r,4,5);px((i,u,v)=>put(i,.965+cloud(u,v)*.06));
 }else if(name==='slate'){
  const cleft=fbm(r,4,5),streak=lattice(r,4,48);
  px((i,u,v)=>put(i,.86+cleft(u,v)*.2+streak(u*4,v*48)*.035,[1,1.01,1.03]));
 }else if(['fabric','linen','leather','cork'].includes(name)){
  // Woven boucle / linen: two-direction weave with slub noise; leather gets pebbled grain.
  const slub=lattice(r,32),cloud=fbm(r,4,3),pebble=lattice(r,Math.max(32,size>>2));
  px((i,u,v)=>{
   if(name==='leather'){put(i,.9+cloud(u,v)*.12+pebble(u*(size>>2),v*(size>>2))*.07);return;}
   const wx=.5+.5*Math.sin(u*size*Math.PI*.5),wy=.5+.5*Math.sin(v*size*Math.PI*.5),over=(Math.floor(u*size*.25)+Math.floor(v*size*.25))%2;
   put(i,.84+(over?wx:wy)*.14+slub(u*32,v*32)*.08+cloud(u,v)*.05);
  });
 }else if(['graphite','steel','brass','rubber'].includes(name)){
  const brush=lattice(r,4,size),cloud=fbm(r,4,3);
  px((i,u,v)=>put(i,.94+brush(u*4,v*size)*.08+cloud(u,v)*.04));
 }else if(['sage','clay'].includes(name)){
  const cloud=fbm(r,4,4);px((i,u,v)=>put(i,.93+cloud(u,v)*.12));
 }else if(name==='leaf'){
  const cloud=fbm(r,4,3);px((i,u,v)=>{const vein=Math.abs(u-.5)<.012?1.25:1;put(i,(.85+cloud(u*2,v*2)*.2)*vein,[1,1.04,.95]);});
 }else if(name==='soil'){
  const grit=lattice(r,size>>1);px((i,u,v)=>put(i,.75+grit(u*(size>>1),v*(size>>1))*.5));
 }else if(name==='book'){
  const cloud=fbm(r,6,2);px((i,u,v)=>{const band=Math.floor(u*24)%5;put(i,.8+cloud(u,v)*.2,[[1,1,1],[.7,.8,1.1],[1.1,.8,.7],[.8,1,.8],[1,1,.8]][band]);});
 }else return null;
 return {data};
}
export function paintFinish(ctx,name,base,size=name==='display'?1024:384){
 const R=(base>>16)&255,G=(base>>8)&255,B=base&255;ctx.fillStyle=`rgb(${R},${G},${B})`;ctx.fillRect(0,0,size,size);
 const key=name+':'+base+':'+size;
 if(!painted.has(key))painted.set(key,paintPixels(name,base,size));
 const pixels=painted.get(key);
 if(pixels){
  const image=ctx.createImageData(size,size);image.data.set(pixels.data);ctx.putImageData(image,0,0);
  if(pixels.chips)for(const [x,y,rad,color,a] of pixels.chips){ctx.fillStyle=color;for(const dx of [0,-size,size])for(const dy of [0,-size,size]){if(x+dx<-rad*2||x+dx>size+rad*2||y+dy<-rad*2||y+dy>size+rad*2)continue;ctx.beginPath();ctx.ellipse(x+dx,y+dy,rad,rad*.7,a,0,Math.PI*2);ctx.fill();}}
  return;
 }
 const r=rng(name.split('').reduce((a,c)=>a+c.charCodeAt(0),17));
 if(name==='stageScreen'){

  // Neutral LED-volume calibration pattern, never the office analytics dashboard.
  ctx.fillStyle='#555b60';ctx.fillRect(0,0,size,size);ctx.strokeStyle='#778086';ctx.lineWidth=1;
  for(let i=0;i<=16;i++){ctx.beginPath();ctx.moveTo(i*size/16,0);ctx.lineTo(i*size/16,size);ctx.moveTo(0,i*size/16);ctx.lineTo(size,i*size/16);ctx.stroke();}
 }else if(name==='instrumentDisplay'){
  ctx.fillStyle='#0b171c';ctx.fillRect(0,0,size,size);
  ctx.strokeStyle='#254047';ctx.lineWidth=1;
  for(let i=1;i<9;i++){ctx.beginPath();ctx.moveTo(size*.08,i*size*.1);ctx.lineTo(size*.93,i*size*.1);ctx.moveTo(i*size*.1,size*.12);ctx.lineTo(i*size*.1,size*.88);ctx.stroke();}
  for(let trace=0;trace<3;trace++){
   ctx.strokeStyle=['#68baba','#e2be73','#a5b5c4'][trace];ctx.lineWidth=2;ctx.beginPath();
   for(let i=0;i<100;i++){const x=size*(.08+i*.0085),y=size*(.30+trace*.21+Math.sin(i*.18+trace)*.035+Math.cos(i*.057)*.022);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();
  }
  ctx.fillStyle='#a6bdc4';ctx.font=`${Math.round(size*.035)}px sans-serif`;ctx.fillText('ACQUISITION / PREVIEW',size*.08,size*.075);
 }else if(name==='display'){
  paintSurface(ctx,'display');
 }
}
