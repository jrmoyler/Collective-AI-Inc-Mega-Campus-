// Device-local, opt-in evidence. No telemetry is sent to any service.
export function createPerformanceReport(){
 let active=false,started=0,samples=[],last=0;
 function record(sample){const now=performance.now();if(active){if(last&&now-last<2000&&samples.length<18000)samples.push({...sample,frameMs:now-last});last=now;}}
 function start(){samples=[];started=Date.now();last=0;active=true;}
 function finish(){active=false;const groups={};for(const s of samples){const key=[s.engine,s.facility||'campus',s.floor||'',s.quality||''].join('/');(groups[key]??=[]).push(s);}
 const segments=Object.entries(groups).map(([view,rows])=>{const a=rows.map(r=>r.frameMs).sort((a,b)=>a-b),mean=a.reduce((a,b)=>a+b,0)/a.length;return {view,samples:a.length,meanFrameMs:+mean.toFixed(2),p95FrameMs:+a[Math.min(a.length-1,Math.floor(a.length*.95))].toFixed(2),meanFPS:+(1000/mean).toFixed(1),renderSize:[rows.at(-1).width,rows.at(-1).height],meshes:rows.at(-1).meshes,drawCalls:rows.at(-1).drawCalls};});
 const result={schema:1,capturedAt:new Date().toISOString(),durationSeconds:(Date.now()-started)/1000,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio,segments,notes:['Real frame intervals from this browser, not a GPU timer.','User agent does not certify a physical device; record model and conditions separately.','A device performance report is not reference-image acceptance.']};
 const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='campus-device-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return result;
 }
 return {record,start,finish,get active(){return active;}};
}
