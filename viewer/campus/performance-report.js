// Device-local, opt-in evidence. No telemetry is sent to any service.
const viewKey=s=>[s.engine,s.facility||'campus',s.floor??'',s.quality||''].join('/');
export function createPerformanceReport({now=()=>performance.now(),wallTime=()=>Date.now(),metadata=()=>({userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio}),download=downloadReport}={}){
 let active=false,started=0,last=null,lastView=null,samples=[],coverage=new Map(),droppedSamples=0,droppedEvents=0;
 const origin=now(),events=[];
 function event(type,detail={}){
  if(events.length===500){events.shift();droppedEvents++;}
  events.push({type,elapsedMs:Math.round(now()-origin),...detail});
 }
 function pause(reason){last=null;lastView=null;event('measurement-boundary',{reason});}
 function record(sample){
  if(!active)return;
  const time=now(),key=viewKey(sample),entry=coverage.get(key)||{view:key,renderedFrames:0};
  entry.renderedFrames++;coverage.set(key,entry);
  // Keep long foreground stalls. The previous recorder silently dropped >=2s.
  // Explicit lifecycle boundaries exclude hidden time and different view loads.
  if(last!==null&&lastView===key){
   if(samples.length<18000)samples.push({...sample,frameMs:time-last});else droppedSamples++;
  }
  last=time;lastView=key;
 }
 function start(){samples=[];coverage=new Map();droppedSamples=0;started=wallTime();last=null;lastView=null;active=true;event('recording-start');}
 function finish(){
  active=false;event('recording-finish');const groups={};
  for(const s of samples)(groups[viewKey(s)]??=[]).push(s);
  const segments=Object.entries(groups).map(([view,rows])=>{
   const values=rows.map(r=>r.frameMs).sort((a,b)=>a-b),mean=values.reduce((a,b)=>a+b,0)/values.length;
   const percentile=p=>+values[Math.min(values.length-1,Math.ceil(values.length*p)-1)].toFixed(2);
   const last=rows.at(-1),counts=key=>{const a=rows.map(r=>r[key]).filter(Number.isFinite);return a.length?{mean:+(a.reduce((s,v)=>s+v,0)/a.length).toFixed(1),max:Math.max(...a)}:null;};
   return {view,samples:values.length,meanFrameMs:+mean.toFixed(2),p95FrameMs:percentile(.95),p99FrameMs:percentile(.99),maxFrameMs:values.at(-1),stallsOver100Ms:values.filter(v=>v>100).length,stallsOver2000Ms:values.filter(v=>v>=2000).length,meanFPS:mean>0?+(1000/mean).toFixed(1):null,renderSize:[last.width,last.height],meshes:counts('meshes'),drawCalls:counts('drawCalls'),triangles:counts('triangles')};
  });
  const result={schema:2,capturedAt:new Date(wallTime()).toISOString(),durationSeconds:started?(wallTime()-started)/1000:0,...metadata(),segments,coverage:[...coverage.values()],events:[...events],droppedSamples,droppedEvents,notes:['Real foreground frame intervals from this browser, not a GPU timer. Long stalls are retained.','View changes, hidden tabs and context loss create explicit measurement boundaries.','Coverage records rendered frames, not floor construction or visual acceptance.','Exterior draw calls and triangles include shadow and postprocessing passes.','User agent does not certify a physical device; record model and conditions separately.','Context restoration is recorded after a successful render submission; screenshots still require visual inspection.']};
  download(result);return result;
 }
 return {record,event,pause,start,finish,get active(){return active;}};
}
function downloadReport(result){
 const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='campus-device-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
