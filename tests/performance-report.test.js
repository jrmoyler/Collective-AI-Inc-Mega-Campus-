import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceReport} from '../viewer/campus/performance-report.js';
function fixture(){let time=0;const report=createPerformanceReport({now:()=>time,wallTime:()=>100000+time,metadata:()=>({build:'fixture'}),download:()=>{}});return {report,tick:ms=>time+=ms};}
const exterior={engine:'Three.js',quality:'balanced',width:800,height:600,drawCalls:20};
test('device report keeps foreground stalls over two seconds and reports tail latency',()=>{
 const {report,tick}=fixture();report.start();report.record(exterior);tick(16);report.record(exterior);tick(2500);report.record({...exterior,drawCalls:50});
 const result=report.finish(),segment=result.segments[0];assert.equal(segment.samples,2);assert.equal(segment.maxFrameMs,2500);assert.equal(segment.stallsOver2000Ms,1);assert.equal(segment.p99FrameMs,2500);assert.equal(segment.drawCalls.max,50);assert.equal(result.coverage[0].renderedFrames,3);
});
test('hidden time, tour loads and quality changes cannot pollute another view timing',()=>{
 const {report,tick}=fixture();report.start();report.record(exterior);tick(16);report.record(exterior);report.pause('hidden');tick(30000);report.record(exterior);tick(16);report.record(exterior);
 tick(4000);const inside={engine:'Babylon.js',facility:'CF-01',floor:1,quality:'balanced'};report.record(inside);tick(20);report.record(inside);
 const result=report.finish();assert.equal(result.segments[0].maxFrameMs,16);assert.equal(result.segments[1].maxFrameMs,20);assert.ok(result.events.some(e=>e.reason==='hidden'));assert.equal(result.build,'fixture');
});
test('startup events survive opt-in recording, while new recordings reset coverage',()=>{
 const {report}=fixture();report.event('startup-error',{message:'no graphics'});report.start();report.record(exterior);let result=report.finish();assert.equal(result.segments.length,0);assert.equal(result.coverage[0].renderedFrames,1);assert.equal(result.events[0].type,'startup-error');report.start();result=report.finish();assert.equal(result.coverage.length,0);
});
