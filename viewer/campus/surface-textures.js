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
export function paintFinish(ctx,name,base,size=name==='display'?1024:384){
 const r=rng(name.split('').reduce((a,c)=>a+c.charCodeAt(0),17));
 const R=(base>>16)&255,G=(base>>8)&255,B=base&255;ctx.fillStyle=`rgb(${R},${G},${B})`;ctx.fillRect(0,0,size,size);
 if(['stone','plaster','porcelain','terrazzo','slate'].includes(name)){
  ctx.globalAlpha=.18;for(let i=0;i<180;i++){const x=r()*size,y=r()*size,l=20+r()*120;ctx.strokeStyle=i%4?'#ffffff':'#908b82';ctx.lineWidth=.4+r()*1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+l*.25,y+(r()-.5)*14,x+l*.65,y+(r()-.5)*12,x+l,y+(r()-.5)*10);ctx.stroke();}
  ctx.globalAlpha=1;
 }else if(['oak','book','walnut'].includes(name)){
  for(let y=0;y<size;y+=5){const n=Math.sin(y*.17)*9;ctx.strokeStyle=`rgba(50,24,10,${.08+r()*.08})`;ctx.lineWidth=1+r()*1.4;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<size;x+=20)ctx.lineTo(x,y+n*Math.sin(x*.035+r()));ctx.stroke();}
 }else if(['graphite','steel','brass','rubber'].includes(name)){
  for(let y=0;y<size;y+=2){const a=.025+r()*.05;ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y+(r()-.5)*.8);ctx.stroke();}
 }else if(['fabric','leather','linen','cork'].includes(name)){
  for(let i=0;i<size*6;i++){const x=r()*size,y=r()*size,v=r()>.5?255:20;ctx.fillStyle=`rgba(${v},${v},${v},${.025+r()*.045})`;ctx.fillRect(x,y,1+r()*1.5,1+r()*1.5);}
 }else if(['sage','clay'].includes(name)){
  for(let i=0;i<size*2;i++){const a=.018+r()*.04;ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.fillRect(r()*size,r()*size,.7+r()*2,.7+r()*2);}
 }else if(name==='leaf'||name==='soil'){
  for(let i=0;i<size*3;i++){ctx.fillStyle=`rgba(0,0,0,${.02+r()*.05})`;ctx.fillRect(r()*size,r()*size,1+r()*3,1+r()*3);}
 }else if(name==='stageScreen'){
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
