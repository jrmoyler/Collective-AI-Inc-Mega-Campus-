/**
 * Collective AI Mega Campus — Enhanced WebGL Viewer
 * Three.js r185 | ACES Filmic | Bloom | Raycasting | Minimap | Particles
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { GLTFLoader }       from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls }    from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer }   from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }       from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── Campus constants ────────────────────────────────────────────────────────
const CAMPUS_W = 1097, CAMPUS_D = 664;
const SCENE_URL = '../assets/glb/site/collective-ai-mega-campus.glb';
const FACILITIES_URL = '../data/facilities.json';

// ─── Facilities metadata (embedded for fast startup) ─────────────────────────
const FACILITIES = [
  { id:"prism_gateway_hq",                   number:1,  name:"Prism Gateway HQ",                     district:"utility_data",                          position:[220,585], height_m:18,   stories:4, footprint_m:[91.4,45.7],   area_sf:180000,  arch_notes:"Prismatic crystalline crown, full-height curtain wall, stepped upper floors, grand lobby atrium. Signature gateway to the data district." },
  { id:"neural_block_data_center",           number:2,  name:"Neural Block Data Center",             district:"utility_data",                          position:[390,555], height_m:24,   stories:4, footprint_m:[219.5,109.7], area_sf:1036800, arch_notes:"Dominant mega-structure. Dark metal cladding, minimal fenestration, extensive rooftop mechanical. 96MW critical IT capacity. Largest building on campus." },
  { id:"vault_archive",                      number:3,  name:"The Vault Archive",                    district:"utility_data",                          position:[110,548], height_m:16.5, stories:3, footprint_m:[54.9,36.6],   area_sf:64800,   arch_notes:"Compact vault form, heavily reinforced. Near-featureless exterior with security berm, blast-rated walls, single controlled entry." },
  { id:"royal_library_academy",              number:4,  name:"Royal Library and Academy",            district:"governance_knowledge",                  position:[545,600], height_m:18,   stories:4, footprint_m:[97.5,51.8],   area_sf:217600,  arch_notes:"Civic landmark. Classical-modern fusion with generous colonnade, barrel-vaulted central reading hall, grand public stair, warm stone cladding." },
  { id:"nexus_labs_media_studio",            number:5,  name:"Nexus Labs Media Studio",              district:"governance_knowledge",                  position:[462,530], height_m:13.5, stories:3, footprint_m:[76.2,48.8],   area_sf:120000,  arch_notes:"Contemporary media studio. Horizontal ribbon windows, dark glass with metal fins, large cantilevered canopy with digital media screen." },
  { id:"animus_prime_robotics_factory",      number:6,  name:"Animus Prime Robotics Factory",        district:"manufacturing_logistics",               position:[190,375], height_m:24,   stories:3, footprint_m:[152.4,61.0],  area_sf:300000,  arch_notes:"Large-span industrial with dramatic sawtooth monitor roof. High-bay volumes for robotic assembly lines. Covered loading bays on north facade." },
  { id:"vector_shift_logistics_hub",         number:7,  name:"Vector Shift Logistics Hub",           district:"manufacturing_logistics",               position:[108,248], height_m:21,   stories:3, footprint_m:[109.7,54.9],  area_sf:194400,  arch_notes:"Logistics distribution center. Extensive truck court, multiple dock doors, overhead bridge connection to robotics factory." },
  { id:"gaia_synthesis_vertical_farm",       number:8,  name:"Gaia Synthesis Vertical Farm",         district:"bioenergy_farm_lifescience",             position:[858,572], height_m:12,   stories:2, footprint_m:[91.4,61.0],   area_sf:120000,  arch_notes:"Landmark greenhouse. Full-height glass enclosure reveals stacked growing levels. Living wall on south facade. Glowing green at night from grow lights." },
  { id:"vital_helix_bio_research_lab",       number:9,  name:"Vital Helix Bio-Research Lab",         district:"bioenergy_farm_lifescience",             position:[898,433], height_m:13.5, stories:3, footprint_m:[85.3,54.9],   area_sf:151200,  arch_notes:"Biomorphic plan with helix-referencing entry canopy. Clean white cladding with horizontal ribbon windows. Visible rooftop mechanical plant." },
  { id:"civic_core",                         number:10, name:"Civic Core",                           district:"public_wellness",                       position:[565,370], height_m:13.5, stories:3, footprint_m:[67.1,42.7],   area_sf:92400,   arch_notes:"Campus civic center. Central glazed dome acts as beacon. Radiating colonnade defines circular public plaza. Primary social hub." },
  { id:"kinetic_edge_wellness_center",       number:11, name:"Kinetic Edge Wellness Center",         district:"public_wellness",                       position:[432,292], height_m:10,   stories:2, footprint_m:[97.5,67.1],   area_sf:140800,  arch_notes:"Large-span wellness facility with sweeping curved shell roof. Generous perimeter glazing. Outdoor fitness terrace. Pool wing with tall clerestory." },
  { id:"observatory_sky_deck",               number:12, name:"Observatory and Sky Deck",             district:"public_wellness",                       position:[718,448], height_m:10,   stories:2, footprint_m:[48.8,30.5],   area_sf:32000,   arch_notes:"Compact observatory with signature silver dome. Surrounding sky-deck terrace on upper level. Dark glazed base contrasts with bright dome." },
  { id:"forge_materials_lab",                number:13, name:"Forge Materials Lab",                  district:"public_wellness",                       position:[657,292], height_m:11,   stories:2, footprint_m:[91.4,54.9],   area_sf:108000,  arch_notes:"Materials testing laboratory. Warm corten-toned metal cladding. Exposed testing bays visible through large glazed openings. Adjacent outdoor materials yard." },
  { id:"aether_link_tower",                  number:14, name:"Aether Link Tower",                    district:"public_wellness",                       position:[592,445], height_m:22,   stories:4, footprint_m:[36.6,36.6],   area_sf:57600,   arch_notes:"Landmark communication tower with square plan rotated 45°. Polished glass curtain wall. Tall communications mast extends 30m above roof. Campus beacon." },
  { id:"habitat_eco_residential_commons",    number:15, name:"Habitat Eco-Residential Commons",      district:"visitor_hotel_mobility_residential",     position:[798,212], height_m:14,   stories:4, footprint_m:[106.7,70.1],  area_sf:322000,  arch_notes:"Residential commons with U-shaped courtyard. Warm terracotta cladding with deep balconies. Green living terraces step down on south face. Solar pergola." },
  { id:"nexus_transportation_hub",           number:16, name:"Nexus Transportation Hub",             district:"visitor_hotel_mobility_residential",     position:[932,155], height_m:14,   stories:2, footprint_m:[106.7,54.9],  area_sf:126000,  arch_notes:"Multi-modal transit hub with dramatic arching steel and glass roof. Platform at grade, mezzanine concourse above. Drop-off loop at south." },
  { id:"sentinel_security_command",          number:17, name:"Sentinel Security Command",            district:"manufacturing_logistics",               position:[302,503], height_m:8,    stories:2, footprint_m:[76.2,45.7],   area_sf:75000,   arch_notes:"Compact security command center. Minimal glazing, dark reinforced concrete. Rooftop surveillance mast. Vehicle barriers at perimeter." },
  { id:"foundry_manufacturing_district",     number:18, name:"Foundry Manufacturing District",       district:"manufacturing_logistics",               position:[322,268], height_m:24,   stories:3, footprint_m:[152.4,91.4],  area_sf:450000,  arch_notes:"Largest industrial building. Multiple sawtooth monitor bays create dramatic skyline. Exhaust stacks rise from roof. Heavy freight access all sides." },
  { id:"juris_guard_center",                 number:19, name:"Juris Guard Center",                   district:"governance_knowledge",                  position:[635,582], height_m:13.5, stories:3, footprint_m:[67.1,33.5],   area_sf:72600,   arch_notes:"Legal and compliance center. Restrained civic architecture with stone-like cladding. Secure entry sequence. Court wing expressed with taller volume." },
  { id:"cognara_mind_institute",             number:20, name:"Cognara Mind Institute",               district:"governance_knowledge",                  position:[722,568], height_m:13.5, stories:3, footprint_m:[76.2,39.6],   area_sf:97500,   arch_notes:"Advanced AI cognition institute. Calm white palette with floating roof plane. Meditation courtyard at center. Lab wing has specialized shading." },
  { id:"signal_velocity_center",             number:21, name:"Signal Velocity Center",               district:"governance_knowledge",                  position:[780,490], height_m:13.5, stories:3, footprint_m:[61.0,36.6],   area_sf:72000,   arch_notes:"Telecommunications and signal engineering hub. Dark glass with vertical metal fins. Rooftop antenna array for signal research." },
  { id:"eon_core_systems_house",             number:22, name:"Eon Core Systems House",               district:"governance_knowledge",                  position:[668,487], height_m:13.5, stories:3, footprint_m:[67.1,39.6],   area_sf:85800,   arch_notes:"Systems integration and controls hub. Silver metal facade. Expressed control-room wing with smaller punched windows." },
  { id:"nomad_nexus_mobility_lab",           number:23, name:"Nomad Nexus Mobility Lab",             district:"manufacturing_logistics",               position:[395,433], height_m:13.5, stories:3, footprint_m:[67.1,36.6],   area_sf:79200,   arch_notes:"Autonomous mobility lab. Rooftop test track for robot and vehicle testing. Drone landing pad. Large vehicle-door openings." },
  { id:"kinetic_energy_operations_center",   number:24, name:"Kinetic Energy Operations Center",     district:"bioenergy_farm_lifescience",             position:[978,358], height_m:9,    stories:2, footprint_m:[61.0,45.7],   area_sf:60000,   arch_notes:"Kinetic energy monitoring and operations. Demonstration plaza with kinetic tile pavement. Large solar canopy over entry." },
  { id:"gaia_synthesis_bio_energy_center",   number:25, name:"Gaia Synthesis Bio-Energy Center",     district:"bioenergy_farm_lifescience",             position:[975,232], height_m:10,   stories:2, footprint_m:[79.2,61.0],   area_sf:104000,  arch_notes:"Bio-energy and water polishing center. Algae cultivation visible in luminescent green ponds. Biogas plant as compact cylindrical element. CHP plant." },
  { id:"central_utility_plant",              number:26, name:"Central Utility Plant",                district:"utility_data",                          position:[80,618],  height_m:12,   stories:2, footprint_m:[67.1,45.7],   area_sf:66000,   arch_notes:"Campus central utility plant. Utilitarian industrial form. Adjacent substation yard with transformers. Large cooling towers at north end." },
  { id:"emergency_operations_center",        number:27, name:"Emergency Operations Center",          district:"utility_data",                          position:[80,512],  height_m:8,    stories:2, footprint_m:[61.0,36.6],   area_sf:48000,   arch_notes:"Hardened emergency operations facility. Blast-resistant construction visible in thick wall reveals. Emergency generator yard at rear." },
  { id:"construction_innovation_yard",       number:28, name:"Construction Innovation Yard",         district:"manufacturing_logistics",               position:[195,132], height_m:9,    stories:1, footprint_m:[121.9,76.2],  area_sf:100000,  arch_notes:"Open innovation construction yard. Large steel canopy over fabrication area. Crane rail running the length. Materials storage and one enclosed fabrication shed." },
  { id:"visitor_experience_center",          number:29, name:"Visitor and Experience Center",        district:"visitor_hotel_mobility_residential",     position:[562,82],  height_m:10,   stories:2, footprint_m:[67.1,36.6],   area_sf:52800,   arch_notes:"Public gateway experience. Dramatic sweeping entry canopy as campus welcome gesture. Full glazed facade reveals interactive exhibits. Welcome plaza." },
  { id:"grand_conference_hotel",             number:30, name:"Grand Conference Hotel",               district:"visitor_hotel_mobility_residential",     position:[798,98],  height_m:16,   stories:4, footprint_m:[128.0,48.8],  area_sf:268800,  arch_notes:"Campus flagship hotel and conference center. Grand porte-cochere entry. Conference wing as separate volume. Hotel floors above. Rooftop pool." },
];

const DISTRICT_COLORS = {
  utility_data:                        { hex: 0x4a90d9, css: '#4a90d9' },
  governance_knowledge:                { hex: 0x7b68ee, css: '#7b68ee' },
  public_wellness:                     { hex: 0x3cb371, css: '#3cb371' },
  manufacturing_logistics:             { hex: 0xd4822a, css: '#d4822a' },
  bioenergy_farm_lifescience:          { hex: 0x32cd78, css: '#32cd78' },
  visitor_hotel_mobility_residential:  { hex: 0xb84da0, css: '#b84da0' },
};

// ─── DOM refs ────────────────────────────────────────────────────────────────
const elApp         = document.querySelector('#app');
const elLoading     = document.querySelector('#loading-screen');
const elProgressBar = document.querySelector('#progress-bar');
const elProgressLbl = document.querySelector('#progress-label');
const elBldgList    = document.querySelector('#building-list');
const elInfoPanel   = document.querySelector('#info-panel');
const elTooltip     = document.querySelector('#tooltip');
const elHudCoords   = document.querySelector('#hud-coords');
const elMinimap     = document.querySelector('#minimap');
const minimapCtx    = elMinimap ? elMinimap.getContext('2d') : null;

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
elApp.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020810);
scene.fog = new THREE.FogExp2(0x020810, 0.00048);

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1, 6000);
camera.position.set(548, -820, 680);

// ─── Controls ────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(548, 332, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 20;
controls.maxDistance = 3000;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.2;
controls.update();

// ─── Post-processing ─────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6,   // strength
  0.45,  // radius
  0.68   // threshold
);
composer.addPass(bloom);

// ─── Lighting — Night (default) ───────────────────────────────────────────────
const ambient = new THREE.HemisphereLight(0x1a3a6a, 0x040a08, 1.2);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0x8ab4f8, 1.8);
sun.position.set(-400, -600, 900);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 3000;
sun.shadow.camera.left = -700; sun.shadow.camera.right = 700;
sun.shadow.camera.top = 700;  sun.shadow.camera.bottom = -700;
scene.add(sun);

const rim = new THREE.DirectionalLight(0x004488, 0.6);
rim.position.set(800, 800, 200);
scene.add(rim);

// Neon point lights at key buildings
const neonPositions = [
  [220,585,25, 0x00cfff], [390,555,30, 0x0044ff], [858,572,18, 0x00ff88],
  [898,433,18, 0x00ff88], [565,370,18, 0x8844ff], [718,448,15, 0x4488ff],
  [798,98,20,  0xff8800], [562,82,14,  0xffffff],
];
neonPositions.forEach(([x,y,z,col]) => {
  const pt = new THREE.PointLight(col, 1.8, 320);
  pt.position.set(x, y, z);
  scene.add(pt);
});

// ─── Ground plane (visible when GLB absent) ───────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(2600, 1600);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x060c12, roughness: 0.95, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set(548, 332, -0.5);
ground.receiveShadow = true;
scene.add(ground);

// ─── Placeholder geometry (shown until GLB loads) ─────────────────────────────
const placeholderGroup = new THREE.Group();
scene.add(placeholderGroup);
const placeholderMap = new Map(); // id -> Mesh

FACILITIES.forEach(f => {
  const geo = new THREE.BoxGeometry(f.footprint_m[0], f.footprint_m[1], f.height_m);
  const dc = DISTRICT_COLORS[f.district] || { hex: 0x224466 };
  const mat = new THREE.MeshStandardMaterial({
    color: dc.hex, roughness: 0.55, metalness: 0.45,
    emissive: dc.hex, emissiveIntensity: 0.06,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(f.position[0], f.position[1], f.height_m / 2);
  mesh.castShadow = true;
  mesh.name = f.id;
  mesh.userData.facilityId = f.id;
  placeholderGroup.add(mesh);
  placeholderMap.set(f.id, mesh);
});

// ─── Energy particle system ───────────────────────────────────────────────────
const PARTICLE_COUNT = 900;
const pPositions  = new Float32Array(PARTICLE_COUNT * 3);
const pVelocities = [];
const pSpeeds     = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const x = Math.random() * CAMPUS_W;
  const y = Math.random() * CAMPUS_D;
  pPositions[i*3]   = x;
  pPositions[i*3+1] = y;
  pPositions[i*3+2] = Math.random() * 3 + 0.5;
  const angle = (Math.random() < 0.5 ? 0 : Math.PI / 2) + (Math.random() - 0.5) * 0.3;
  pVelocities.push(new THREE.Vector2(Math.cos(angle), Math.sin(angle)));
  pSpeeds.push(Math.random() * 0.6 + 0.15);
}

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0x00cfff, size: 2.8, sizeAttenuation: true,
  transparent: true, opacity: 0.65,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// ─── State ────────────────────────────────────────────────────────────────────
let campus = null;
let selectableMeshes = Array.from(placeholderMap.values());
let selectedMesh = null;
let savedMaterial = null;
let selectedFacilityId = null;
let isNight = true;
let idleRotateTimer = null;

const highlightMat = new THREE.MeshStandardMaterial({
  color: 0x00cfff, emissive: 0x00cfff, emissiveIntensity: 0.55,
  roughness: 0.25, metalness: 0.8, transparent: true, opacity: 0.92,
});

// ─── Loading helpers ─────────────────────────────────────────────────────────
function setProgress(pct, msg) {
  if (elProgressBar) elProgressBar.style.width = pct + '%';
  if (elProgressLbl) elProgressLbl.textContent = msg;
}
function hideLoading() {
  if (!elLoading) return;
  elLoading.style.transition = 'opacity 0.8s ease';
  elLoading.style.opacity = '0';
  setTimeout(() => { elLoading.style.display = 'none'; }, 850);
}

// ─── GLB Loader ──────────────────────────────────────────────────────────────
setProgress(5, 'Initializing renderer...');

const gltfLoader = new GLTFLoader();
setProgress(10, 'Loading 3D campus scene...');

gltfLoader.load(
  SCENE_URL,
  (gltf) => {
    setProgress(92, 'Building scene graph...');
    campus = gltf.scene;
    scene.add(campus);
    placeholderGroup.visible = false;

    const newSelectable = [];
    campus.traverse(obj => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      // Tag with facility id from name
      for (const f of FACILITIES) {
        if (obj.name && obj.name.toLowerCase().includes(f.id.replace(/_/g,''))) {
          obj.userData.facilityId = f.id;
          newSelectable.push(obj);
          break;
        }
      }
    });
    if (newSelectable.length > 0) selectableMeshes = newSelectable;

    setProgress(100, 'Ready');
    setTimeout(hideLoading, 500);
  },
  (xhr) => {
    if (xhr.lengthComputable) {
      const pct = 10 + (xhr.loaded / xhr.total) * 80;
      setProgress(pct, `Loading GLB... ${Math.round(pct)}%`);
    }
  },
  (err) => {
    console.warn('GLB not available — using placeholder geometry:', err.message);
    setProgress(100, 'Using procedural preview');
    setTimeout(hideLoading, 600);
  }
);

// ─── Building List Sidebar ─────────────────────────────────────────────────────
FACILITIES.forEach(f => {
  const dc = DISTRICT_COLORS[f.district];
  const item = document.createElement('div');
  item.className = 'bldg-item';
  item.dataset.id = f.id;
  item.dataset.district = f.district;
  item.innerHTML = `
    <span class="bldg-num">${String(f.number).padStart(2,'0')}</span>
    <span class="bldg-name">${f.name}</span>
    <span class="bldg-district-dot" style="background:${dc ? dc.css : '#4466aa'}"></span>
  `;
  item.addEventListener('click', () => {
    flyToFacility(f);
    selectFacility(f);
  });
  elBldgList.appendChild(item);
});

// District filter buttons
document.querySelectorAll('.dist-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dist-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const d = btn.dataset.district;
    document.querySelectorAll('.bldg-item').forEach(item => {
      const show = d === 'all' || item.dataset.district === d;
      item.classList.toggle('hidden-filter', !show);
    });
  });
});

// ─── Sidebar toggle ───────────────────────────────────────────────────────────
document.querySelector('#sidebar-toggle')?.addEventListener('click', () => {
  document.querySelector('#sidebar').classList.toggle('collapsed');
});

// ─── Camera fly-to ────────────────────────────────────────────────────────────
function flyTo(pos, target, dur = 1500) {
  const s0 = camera.position.clone(), t0 = controls.target.clone();
  const s1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...target);
  const start = performance.now();
  function tick() {
    const raw = Math.min((performance.now() - start) / dur, 1);
    const t = raw < 0.5 ? 2*raw*raw : -1+(4-2*raw)*raw; // ease in-out quad
    camera.position.lerpVectors(s0, s1, t);
    controls.target.lerpVectors(t0, t1, t);
    controls.update();
    if (raw < 1) requestAnimationFrame(tick);
  }
  tick();
}

function flyToFacility(f) {
  const [x, y] = f.position, h = f.height_m || 12;
  const r = Math.max(f.footprint_m[0], f.footprint_m[1]) * 1.7 + 50;
  flyTo([x - r * 0.65, y - r * 0.9, h + r * 0.55], [x, y, h * 0.5]);
}

// ─── Camera preset buttons ─────────────────────────────────────────────────────
document.querySelector('#btn-hero')?.addEventListener('click',   () => flyTo([548,-820,680],  [548,332,0]));
document.querySelector('#btn-ground')?.addEventListener('click', () => flyTo([520,80,45],     [560,400,12]));
document.querySelector('#btn-north')?.addEventListener('click',  () => flyTo([548,1350,500],  [548,332,0]));
document.querySelector('#btn-east')?.addEventListener('click',   () => flyTo([1450,332,350],  [548,332,0]));

// ─── Day / Night toggle ───────────────────────────────────────────────────────
function applyDayNight(night) {
  isNight = night;
  if (night) {
    scene.background.set(0x020810);
    scene.fog = new THREE.FogExp2(0x020810, 0.00048);
    sun.intensity = 1.8; sun.color.set(0x8ab4f8);
    ambient.intensity = 1.2; ambient.color.set(0x1a3a6a);
    bloom.strength = 0.6;
    renderer.toneMappingExposure = 1.15;
  } else {
    scene.background.set(0x87ceeb);
    scene.fog = new THREE.FogExp2(0xa8d0f0, 0.00025);
    sun.intensity = 3.8; sun.color.set(0xfff4cc);
    ambient.intensity = 2.2; ambient.color.set(0x6090b0);
    bloom.strength = 0.08;
    renderer.toneMappingExposure = 0.9;
  }
  document.querySelector('#btn-night')?.classList.toggle('active', night);
  document.querySelector('#btn-day')?.classList.toggle('active', !night);
}

document.querySelector('#btn-night')?.addEventListener('click', () => applyDayNight(true));
document.querySelector('#btn-day')?.addEventListener('click',   () => applyDayNight(false));
applyDayNight(true); // start in night mode

// ─── Auto-rotate ─────────────────────────────────────────────────────────────
document.querySelector('#btn-autorotate')?.addEventListener('click', function() {
  controls.autoRotate = !controls.autoRotate;
  this.classList.toggle('active', controls.autoRotate);
});

// Idle auto-rotate after 14 seconds
controls.addEventListener('start', () => clearTimeout(idleRotateTimer));
controls.addEventListener('end', () => {
  if (!controls.autoRotate) {
    idleRotateTimer = setTimeout(() => {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.18;
    }, 14000);
  }
});

// ─── Facility selection ────────────────────────────────────────────────────────
function selectFacility(f) {
  selectedFacilityId = f.id;

  // Sidebar highlight
  document.querySelectorAll('.bldg-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.id === f.id);
  });

  // Populate info panel
  document.querySelector('#info-number').textContent = `#${String(f.number).padStart(2,'0')}`;
  document.querySelector('#info-name').textContent   = f.name;
  const distName = f.district.replace(/_/g, ' ').toUpperCase();
  document.querySelector('#info-district').textContent  = distName;
  document.querySelector('#info-footprint').textContent = `${f.footprint_m[0]}m × ${f.footprint_m[1]}m`;
  document.querySelector('#info-height').textContent    = `${f.height_m}m`;
  document.querySelector('#info-stories').textContent   = f.stories;
  document.querySelector('#info-area').textContent      = `${(f.area_sf/1000).toFixed(0)}K SF`;
  document.querySelector('#info-arch').textContent      = f.arch_notes || '';
  document.querySelector('#info-fly').onclick = () => flyToFacility(f);
  elInfoPanel.classList.remove('hidden');

  // Mesh highlight
  applyHighlight(f.id);
}

function applyHighlight(id) {
  if (selectedMesh && savedMaterial) {
    selectedMesh.material = savedMaterial;
    selectedMesh = null; savedMaterial = null;
  }
  const source = campus ? [] : Array.from(placeholderMap.values());
  if (campus) campus.traverse(o => { if (o.isMesh && o.userData.facilityId === id) source.push(o); });
  const mesh = source.find(o => o.userData?.facilityId === id) || placeholderMap.get(id);
  if (mesh) {
    savedMaterial = mesh.material;
    mesh.material = highlightMat;
    selectedMesh  = mesh;
  }
}

document.querySelector('#info-close')?.addEventListener('click', () => {
  elInfoPanel.classList.add('hidden');
  if (selectedMesh && savedMaterial) {
    selectedMesh.material = savedMaterial;
    selectedMesh = null; savedMaterial = null;
  }
  document.querySelectorAll('.bldg-item').forEach(i => i.classList.remove('selected'));
  selectedFacilityId = null;
});

// ─── Raycasting ───────────────────────────────────────────────────────────────
const raycaster   = new THREE.Raycaster();
const mouse       = new THREE.Vector2();
let mouseDownPos  = null;

function getMeshTargets() {
  const targets = [];
  if (campus) campus.traverse(o => { if (o.isMesh) targets.push(o); });
  else        placeholderMap.forEach(m => targets.push(m));
  return targets;
}

renderer.domElement.addEventListener('mousedown', e => {
  mouseDownPos = [e.clientX, e.clientY];
});

renderer.domElement.addEventListener('mouseup', e => {
  if (!mouseDownPos) return;
  const dx = e.clientX - mouseDownPos[0], dy = e.clientY - mouseDownPos[1];
  mouseDownPos = null;
  if (Math.hypot(dx, dy) > 6) return; // drag, not click

  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(getMeshTargets(), false);
  if (!hits.length) return;

  const fid = hits[0].object.userData?.facilityId;
  if (!fid) {
    // Nearest-facility fallback
    let best = null, bestD = Infinity;
    FACILITIES.forEach(f => {
      const d = Math.hypot(hits[0].point.x - f.position[0], hits[0].point.y - f.position[1]);
      if (d < bestD) { bestD = d; best = f; }
    });
    if (best && bestD < 200) { flyToFacility(best); selectFacility(best); }
    return;
  }
  const f = FACILITIES.find(f => f.id === fid);
  if (f) { flyToFacility(f); selectFacility(f); }
});

// ─── Hover tooltip ────────────────────────────────────────────────────────────
let hoverThrottle = 0;

renderer.domElement.addEventListener('mousemove', e => {
  elTooltip.style.left = (e.clientX + 14) + 'px';
  elTooltip.style.top  = (e.clientY - 8)  + 'px';
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function checkHover() {
  if (++hoverThrottle % 3 !== 0) return;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(getMeshTargets(), false);
  if (!hits.length) { elTooltip.classList.add('hidden'); renderer.domElement.style.cursor = 'default'; return; }

  const fid = hits[0].object.userData?.facilityId;
  const f   = fid ? FACILITIES.find(f => f.id === fid) : (() => {
    let best = null, bestD = Infinity;
    FACILITIES.forEach(fac => {
      const d = Math.hypot(hits[0].point.x - fac.position[0], hits[0].point.y - fac.position[1]);
      if (d < bestD) { bestD = d; best = fac; }
    });
    return best && bestD < 180 ? best : null;
  })();

  if (f) {
    elTooltip.textContent = `#${String(f.number).padStart(2,'0')} ${f.name}`;
    elTooltip.classList.remove('hidden');
    renderer.domElement.style.cursor = 'pointer';
  } else {
    elTooltip.classList.add('hidden');
    renderer.domElement.style.cursor = 'default';
  }
}

// ─── Minimap ─────────────────────────────────────────────────────────────────
function drawMinimap() {
  if (!minimapCtx) return;
  const W = 200, H = 128;
  const sx = W / CAMPUS_W, sy = H / CAMPUS_D;

  minimapCtx.fillStyle = '#020a14';
  minimapCtx.fillRect(0, 0, W, H);

  // Grid lines
  minimapCtx.strokeStyle = 'rgba(0,207,255,0.08)';
  minimapCtx.lineWidth = 0.5;
  for (let x = 0; x < W; x += W/8)  { minimapCtx.beginPath(); minimapCtx.moveTo(x,0); minimapCtx.lineTo(x,H); minimapCtx.stroke(); }
  for (let y = 0; y < H; y += H/5)  { minimapCtx.beginPath(); minimapCtx.moveTo(0,y); minimapCtx.lineTo(W,y); minimapCtx.stroke(); }

  // Buildings
  FACILITIES.forEach(f => {
    const px = f.position[0] * sx;
    const py = H - f.position[1] * sy;
    const pw = Math.max(f.footprint_m[0] * sx, 2);
    const ph = Math.max(f.footprint_m[1] * sy, 1.5);
    const dc = DISTRICT_COLORS[f.district];
    const col = dc ? dc.hex : 0x224466;
    const r = (col >> 16) & 0xff, g = (col >> 8) & 0xff, b = col & 0xff;
    const alpha = f.id === selectedFacilityId ? 1.0 : 0.72;
    minimapCtx.fillStyle = f.id === selectedFacilityId
      ? 'rgba(0,207,255,1)'
      : `rgba(${r},${g},${b},${alpha})`;
    minimapCtx.fillRect(px - pw/2, py - ph/2, pw, ph);
  });

  // Camera target dot
  const cx = controls.target.x * sx;
  const cy = H - controls.target.y * sy;
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  minimapCtx.fillStyle = 'rgba(0,207,255,0.9)';
  minimapCtx.fill();
  minimapCtx.lineWidth = 7;
  minimapCtx.strokeStyle = 'rgba(0,207,255,0.25)';
  minimapCtx.stroke();

  // Minimap viewport rectangle based on camera frustum estimate
  const vSize = Math.max(20, Math.min(80, 20000 / (camera.position.z + 1)));
  const vx = cx - vSize * 1.6 / 2;
  const vy = cy - vSize / 2;
  minimapCtx.strokeStyle = 'rgba(0,207,255,0.5)';
  minimapCtx.lineWidth = 0.8;
  minimapCtx.strokeRect(
    Math.max(0, Math.min(W - vSize*1.6, vx)),
    Math.max(0, Math.min(H - vSize,     vy)),
    Math.min(vSize*1.6, W), Math.min(vSize, H)
  );
}

// ─── HUD ────────────────────────────────────────────────────────────────────
function updateHUD() {
  if (!elHudCoords) return;
  const p = camera.position;
  elHudCoords.textContent = `CAM ${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)}`;
}

// ─── Particle animation ───────────────────────────────────────────────────────
const pBuf = particleGeo.attributes.position.array;

function animateParticles(dt) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const v = pVelocities[i], spd = pSpeeds[i] * dt * 30;
    pBuf[i*3]   += v.x * spd;
    pBuf[i*3+1] += v.y * spd;
    if (pBuf[i*3]   > CAMPUS_W) pBuf[i*3]   = 0;
    if (pBuf[i*3]   < 0)        pBuf[i*3]   = CAMPUS_W;
    if (pBuf[i*3+1] > CAMPUS_D) pBuf[i*3+1] = 0;
    if (pBuf[i*3+1] < 0)        pBuf[i*3+1] = CAMPUS_D;
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleMat.opacity = isNight ? 0.45 + 0.25 * Math.sin(Date.now() * 0.0009) : 0.15;
}

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.resolution.set(window.innerWidth, window.innerHeight);
});

// ─── Render loop ─────────────────────────────────────────────────────────────
let prevTime = performance.now();
let minimapTick = 0;

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - prevTime) / 1000, 0.05);
  prevTime  = now;

  controls.update();
  animateParticles(dt);
  checkHover();
  updateHUD();

  if (++minimapTick % 8 === 0) drawMinimap();

  composer.render();
}

// ─── Boot ────────────────────────────────────────────────────────────────────
drawMinimap();
loop();
