// Explicit QA mode only. Controls exercise the real context and capture the real
// rendered canvas; no mock frames, reference overlays, uploads or device claims.
export function createAcceptancePanel({report,getCanvas}){
 if(new URLSearchParams(location.search).get('qa')!=='1')return null;
 const toggle=document.createElement('button');toggle.id='acceptance-toggle';toggle.textContent='Device check';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','acceptance-panel');document.body.append(toggle);
 const panel=document.createElement('aside');panel.id='acceptance-panel';panel.hidden=true;panel.setAttribute('aria-label','Device acceptance checks');
 panel.innerHTML=`<strong>Campus device check</strong><p>Record actual tours, save views and test recovery. Files stay on this device.</p><label>Device and conditions<input id="qa-device" placeholder="Galaxy A15 · Chrome · battery / temperature"></label><div class="qa-actions"><button data-qa="start">Start recording</button><button data-qa="finish">Download report</button><button data-qa="capture">Save current 3D view</button><button data-qa="recover">Test graphics recovery</button><button data-qa="reload">Reload campus</button></div><p data-qa="status" role="status">No check running.</p><small>Build ${__CAMPUS_BUILD__.revision.slice(0,8)}${__CAMPUS_BUILD__.dirty?' · local changes':''}. Device identity is self-reported. Inspect saved images before approving fidelity.</small>`;
 document.body.append(panel);const status=panel.querySelector('[data-qa="status"]'),button=key=>panel.querySelector(`[data-qa="${key}"]`);let capture=false,recoveryTimer=null;
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 button('start').onclick=()=>{report.start();report.event('device-conditions',{description:panel.querySelector('input').value});status.textContent='Recording. Close this panel and explore floors, rooms and campus views.';};
 button('finish').onclick=()=>{report.event('device-conditions',{description:panel.querySelector('input').value});const r=report.finish();status.textContent=r.coverage.length?`Saved ${r.coverage.length} rendered view segments. Inspect the report and images.`:'Saved failure evidence; no rendered frames were recorded.';};
 button('capture').onclick=()=>{if(!getCanvas()){status.textContent='No active 3D canvas to capture.';return;}capture=true;status.textContent='Waiting for the next rendered frame…';};
 button('recover').onclick=()=>{
  const canvas=getCanvas(),gl=canvas?.getContext('webgl2')||canvas?.getContext('webgl'),extension=gl?.getExtension('WEBGL_lose_context');
  if(!extension||gl.isContextLost()){status.textContent='A working context with recovery-test support is required.';return;}
  button('recover').disabled=true;report.event('recovery-test-request',{engine:canvas.id==='interior-canvas'?'Babylon.js':'Three.js'});status.textContent='Pausing the real graphics context; restoration requested in 1.5 seconds.';
  extension.loseContext();recoveryTimer=setTimeout(()=>{extension.restoreContext();report.event('recovery-restore-request');button('recover').disabled=false;status.textContent='Restoration requested. Verify the scene returns, then save a view and continue walking.';},1500);
 };
 button('reload').onclick=()=>location.reload();
 return {frame(canvas,view){
  if(!capture)return;capture=false;
  const stamp=Date.now(),name=`campus-${view.facility||'aerial'}-${view.floor||'exterior'}-${stamp}.png`;
  // Snapshot synchronously after submission, before the default drawing buffer clears.
  canvas.toBlob(blob=>{if(!blob){status.textContent='The browser could not capture this frame.';return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`Saved ${name}`;},'image/png');
  report.event('frame-capture',{filename:name,...view,width:canvas.width,height:canvas.height});
 },dispose(){clearTimeout(recoveryTimer);panel.remove();toggle.remove();}};
}
