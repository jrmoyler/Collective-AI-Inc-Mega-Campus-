// Headless browser screenshots of the running viewer for visual review.
// Usage: node scripts/shoot.mjs <baseUrl> <outDir> [view ...]
// Views: aerial north ground day facility:<id> interior:<id>
import {createRequire} from 'node:module';import {execSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),execSync('npm root -g').toString().trim()]}));
import {mkdirSync} from 'node:fs';
const [base='http://127.0.0.1:5199/',out='shots',...views]=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:Number(process.env.SHOT_W||1100),height:Number(process.env.SHOT_H||700)}});page.setDefaultTimeout(240000);
const logs=[];page.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push(m.type()+': '+m.text());});page.on('pageerror',e=>logs.push('pageerror: '+e.message));
await page.goto(base,{waitUntil:'load'});
await page.waitForFunction(()=>document.getElementById('loading')?.hidden||getComputedStyle(document.getElementById('loading')).display==='none'||document.getElementById('loading')?.classList.contains('done'),null,{timeout:180000}).catch(()=>logs.push('loading overlay did not clear'));
await page.waitForTimeout(4000);
const settle=Number(process.env.SHOT_SETTLE||6000);
const click=async sel=>{const ok=await page.evaluate(s=>{const el=document.querySelector(s);if(!el)return false;el.click();return true;},sel);if(!ok)logs.push('missing '+sel);await page.waitForTimeout(settle);};
for(const view of (views.length?views:['aerial'])){
 const [kind,arg]=view.split(':');
 if(kind==='day')await click('#day');
 else if(kind==='aerial')await click('#aerial');
 else if(kind==='north')await click('#north');
 else if(kind==='ground')await click('#ground');
 else if(kind==='facility'||kind==='interior'){
  await page.evaluate(()=>{const d=document.getElementById('directory');d.hidden=false;});await page.evaluate(v=>{const i=document.getElementById('search');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));},String(arg));await page.waitForTimeout(500);
  await click('#facility-list button');await click('#focus');
  if(kind==='interior'){await click('#enter');await page.waitForTimeout(12000);}
 }
 if(process.env.SHOT_UI!=='1')await page.addStyleTag({content:'header,#directory,#detail,#toolbar,#markers,#scene-caption,#hint,#status,#layers,#rooms,.interior-top,#walk-help,#touch-controls{visibility:hidden!important}'});
 await page.waitForTimeout(Number(process.env.SHOT_EXTRA||4000));
 await page.screenshot({path:`${out}/${view.replace(':','-')}.png`});
 if(process.env.SHOT_UI!=='1')await page.addStyleTag({content:'header,#directory,#detail,#toolbar,#markers,#scene-caption,#hint,#status,#layers,#rooms,.interior-top,#walk-help,#touch-controls{visibility:visible!important}'});
 if(kind==='interior')await click('#exit-interior');
}
console.log(logs.slice(0,40).join('\n'));
await browser.close();
