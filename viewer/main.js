import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/controls/OrbitControls.js';
import { animate } from 'https://cdn.jsdelivr.net/npm/animejs@4.4.1/+esm';
const app=document.querySelector('#app'); const scene=new THREE.Scene(); scene.background=new THREE.Color(0x02070b); scene.fog=new THREE.Fog(0x02070b,650,1800);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,4000); camera.position.set(560,-720,520);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace; app.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(548,332,0); controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0x7fdfff,0x061b11,1.4)); const sun=new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(-300,-500,900); scene.add(sun);
const loader=new GLTFLoader(); let campus; loader.load('../assets/glb/site/collective-ai-mega-campus.glb',g=>{campus=g.scene; scene.add(campus); populate(campus);});
function fly(pos,target){animate(camera.position,{x:pos[0],y:pos[1],z:pos[2],duration:1400,ease:'inOutCubic'}); animate(controls.target,{x:target[0],y:target[1],z:target[2],duration:1400,ease:'inOutCubic'});}
document.querySelector('#hero').onclick=()=>fly([560,-720,520],[548,332,0]); document.querySelector('#ground').onclick=()=>fly([520,30,42],[560,360,28]); let night=false; document.querySelector('#day').onclick=()=>{night=!night; animate(scene.fog.color,{r:night ? 0.0 : 0.02,g:night ? 0.03 : 0.07,b:night ? 0.08 : 0.11,duration:900}); animate(sun,{intensity:night ? 0.25 : 2.2,duration:900});};
const districts=['utility/data NW','governance north','public/wellness','manufacturing','bioenergy east','visitor south']; document.querySelector('#districts').innerHTML=districts.map(d=>`<span class=chip>${d}</span>`).join('');
function populate(root){const sel=document.querySelector('#building'); root.traverse(o=>{if(o.name&&o.name.includes('_')){const opt=document.createElement('option'); opt.value=o.name; opt.textContent=o.name.replaceAll('_',' '); sel.appendChild(opt);}}); sel.onchange=()=>{const o=root.getObjectByName(sel.value); if(o){const p=new THREE.Vector3(); o.getWorldPosition(p); fly([p.x-120,p.y-180,95],[p.x,p.y,25]);}}}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);});
function loop(){requestAnimationFrame(loop); controls.update(); renderer.render(scene,camera)} loop();
