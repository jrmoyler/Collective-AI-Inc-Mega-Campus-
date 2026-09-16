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
