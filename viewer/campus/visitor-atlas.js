import {FACILITIES} from './data.js';
import {circuits} from './circuits.js';
import {drawPlate} from './atlas-plate.js';
import {levelCode} from './wayfinding.js';

export function bindVisitorAtlas(visit) {
  const dialog = document.querySelector('#visitor-atlas');
  if (!dialog) return () => {};
  const get = id => document.getElementById(id);
  let pins = [];
  let preview = 0, active = null, currentFacility = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem('campus-circuit'));
    if (Number.isInteger(saved?.route) && Number.isInteger(saved?.stop) && circuits[saved.route]?.stops[saved.stop]) {
      active = saved;
      preview = saved.route;
    }
  } catch { /* Storage is optional for private sessions. */ }
  const save = () => {
    try { sessionStorage.setItem('campus-circuit',JSON.stringify(active)); } catch {}
  };
  function updateTrip() {
    const route = circuits[active?.route];
    const here = route?.stops[active.stop][0] === currentFacility && !!route;
    get('trip-controls').hidden = !here;
    get('atlas-open').textContent = active ? 'My circuit' : 'Visitor atlas';
    if (!here) return;
    get('trip-position').textContent = route.title + ' · ' + (active.stop+1) + ' of ' + route.stops.length;
    get('trip-next').textContent = active.stop+1 < route.stops.length ? 'Next stop →' : 'Finish circuit';
  }
  function arrive(route, stop) {
    active = {route,stop}; preview = route; save();
    if(dialog.open) dialog.close();
    const [id,floor] = circuits[route].stops[stop];
    visit(id,floor);
    updateTrip();
  }
  function renderPreview() {
    const circuit = circuits[preview];
    dialog.style.setProperty('--circuit',circuit.color);
    get('circuit-description').textContent = circuit.description;
    get('atlas-plate').setAttribute('aria-label',circuit.title + ' on the campus site plan. Numbered stops are listed below.');
    get('atlas-start').textContent = active?.route===preview ? 'Resume at stop '+(active.stop+1)+' →' : 'Start circuit →';
    pins = drawPlate(get('atlas-plate'), circuit) || [];
    get('atlas-stops').replaceChildren(...circuit.stops.map(([id,floor],i)=>{
      const f = FACILITIES.find(item=>item.id===id);
      const row=document.createElement('li'), button=document.createElement('button');
      const title=document.createElement('strong'), detail=document.createElement('small');
      title.textContent=f.name;
      detail.textContent=levelCode(f,floor)+' · '+f.program[floor].split(';')[0];
      button.append(title,detail);button.onclick=()=>arrive(preview,i);row.append(button);return row;
    }));
  }
  get('atlas-plate').onclick = event => {
    const rect=event.currentTarget.getBoundingClientRect();
    const scale=Math.min(rect.width/1060,rect.height/655);
    const x=event.clientX-rect.left-(rect.width-1060*scale)/2;
    const y=event.clientY-rect.top-(rect.height-655*scale)/2;
    const distances=pins.map(([u,v])=>Math.hypot(u*scale-x,v*scale-y));
    const nearest=Math.min(...distances);
    if(nearest<=Math.max(18,16*scale))arrive(preview,distances.indexOf(nearest));
  };
  for(const [i,circuit] of circuits.entries())get('circuit-choice').add(new Option(circuit.title,i));
  get('atlas-open').onclick=()=>{
    preview=active?.route??preview;
    get('circuit-choice').value=String(preview);
    get('atlas-end').hidden=!active;
    renderPreview();dialog.showModal();
  };
  get('atlas-end').onclick=()=>{
    active=null;save();updateTrip();
    get('atlas-end').hidden=true;renderPreview();get('atlas-start').focus();
  };
  get('atlas-close').onclick=()=>dialog.close();
  get('circuit-choice').onchange=e=>{preview=Number(e.target.value);renderPreview();};
  get('atlas-start').onclick=()=>arrive(preview,active?.route===preview?active.stop:0);
  get('trip-next').onclick=()=>{
    const {route,stop}=active;
    if(stop+1<circuits[route].stops.length){arrive(route,stop+1);return;}
    active=null;save();updateTrip();
    get('status').textContent=circuits[route].title+' complete.';
    get('atlas-open').focus();
  };
  updateTrip();
  return id=>{currentFacility=id;updateTrip();};
}
