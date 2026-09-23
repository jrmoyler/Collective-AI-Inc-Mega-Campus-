// Dev-only QA harness (not imported by the app): close-range fleet renders.
// Close-range inspection of fleet assets: ?subject=shuttle|freight|android|pedestrian|survey-drone|cargo-drone&t=12&d=9&h=2
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFleets} from '../campus/fleets.js';
const q=new URLSearchParams(location.search),subject=q.get('subject')||'shuttle',t=Number(q.get('t')||12),dist=Number(q.get('d')||9),h=Number(q.get('h')||2),az=Number(q.get('az')||.8),index=Number(q.get('i')||0);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xa9bfd2);const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.8;
const sun=new T.DirectionalLight(0xfff1dc,3.2);sun.position.set(40,60,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30});scene.add(sun,new T.HemisphereLight(0xcfe3ff,0x5c5a50,.9));
const curve=new T.LineCurve3(new T.Vector3(0,.22,-600),new T.Vector3(0,.22,600));
const asphalt=new T.Mesh(new T.PlaneGeometry(13.4,1200).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x2a3034,roughness:.95}));asphalt.position.y=.16;asphalt.receiveShadow=true;scene.add(asphalt);
const walk=new T.Mesh(new T.PlaneGeometry(17.2,1200).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0xc9c0aa,roughness:.9}));walk.position.y=.12;walk.receiveShadow=true;scene.add(walk);
const grass=new T.Mesh(new T.PlaneGeometry(3000,3000).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x4f7a3c,roughness:1}));grass.position.y=.04;grass.receiveShadow=true;scene.add(grass);
const fleets=createFleets([{curve,width:12}]);scene.add(fleets.root);
const camera=new T.PerspectiveCamera(Number(q.get('fov')||35),innerWidth/innerHeight,.05,5000);
fleets.update(t);
const target=fleets.root.children.filter(o=>o.name===subject)[index];
const p=target.position.clone();if(subject.includes('drone')){camera.position.set(p.x+Math.sin(az)*dist,p.y+h,p.z+Math.cos(az)*dist);}else camera.position.set(p.x+Math.sin(az+target.rotation.y)*dist,h,p.z+Math.cos(az+target.rotation.y)*dist);
const look=p.clone();look.y+=Number(q.get('ly')||(subject==='pedestrian'||subject==='android'?1:1.2));camera.lookAt(look);
sun.target.position.copy(p);scene.add(sun.target);sun.position.copy(p).add(new T.Vector3(40,60,25));
fleets.update(t,camera.position);renderer.render(scene,camera);document.title='ready';
