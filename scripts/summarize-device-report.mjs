// Analyze an exported device report without inventing hardware or visual approval.
import fs from 'node:fs';
import {FACILITIES} from '../viewer/campus/data.js';
const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/summarize-device-report.mjs REPORT.json [expected revision]');
const report=JSON.parse(fs.readFileSync(input,'utf8'));
if(report.schema!==2||!Array.isArray(report.coverage)||!Array.isArray(report.events))throw new Error('Expected a schema-2 campus device report');
const expected=process.argv[3],events=report.events;
const floors=FACILITIES.flatMap(f=>Array.from({length:f.levels},(_,i)=>({facility:f.key,floor:i+1})));
const observed=new Map();
for(const item of report.coverage){const [engine,facility,floor]=item.view.split('/');if(engine==='Babylon.js')observed.set(`${facility}/${floor}`,(observed.get(`${facility}/${floor}`)||0)+item.renderedFrames);}
const missing=floors.filter(f=>!observed.has(`${f.facility}/${f.floor}`));
const summary={build:report.build,revisionMatches:expected?report.build?.revision===expected&&!report.build?.dirty:null,required:{facilities:FACILITIES.length,floors:floors.length},observedFloors:floors.length-missing.length,missingFloors:missing,
 startupSubmission:events.some(e=>e.type==='startup-first-frame'),exteriorRestoredSubmission:events.some(e=>e.type==='exterior-context-restored'),interiorRestoredSubmission:events.some(e=>e.type==='interior-context-restored'),
 failures:events.filter(e=>['context-creation-error','graphics-failed','interior-error'].includes(e.type)),measurements:report.segments,droppedSamples:report.droppedSamples,droppedEvents:report.droppedEvents,
 visualAcceptance:'Requires inspection of saved browser views against references; never established by this report.',physicalDeviceAcceptance:'Requires independently recorded device/model and test conditions; never established by user agent.'};
console.log(JSON.stringify(summary,null,2));
