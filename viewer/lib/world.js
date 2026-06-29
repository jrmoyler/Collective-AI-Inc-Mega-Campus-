/**
 * world.js — Single source of truth for the Collective AI Mega Campus.
 *
 * Coordinate system: Z-UP, units = METERS. Ground plane at z = 0.
 * Campus bounds: X ∈ [0, WORLD.width], Y ∈ [0, WORLD.depth].
 * Each facility.position is the building CENTER [x, y]; the building occupies
 * its footprint (footprint_m = [width_x, depth_y]) and rises in +Z to height_m.
 *
 * Every viewer module (cameras, population, audio, environment, buildings)
 * imports from here so traffic, roads, collision and visuals stay aligned.
 */

export const WORLD = {
  width: 1097,   // X extent (m)
  depth: 664,    // Y extent (m)
  groundZ: 0,
  eyeHeight: 1.7, // first-person camera eye height (m)
};

export const DISTRICT_COLORS = {
  utility_data:                        { hex: 0x4a90d9, css: '#4a90d9' },
  governance_knowledge:                { hex: 0x7b68ee, css: '#7b68ee' },
  public_wellness:                     { hex: 0x3cb371, css: '#3cb371' },
  manufacturing_logistics:             { hex: 0xd4822a, css: '#d4822a' },
  bioenergy_farm_lifescience:          { hex: 0x32cd78, css: '#32cd78' },
  visitor_hotel_mobility_residential:  { hex: 0xb84da0, css: '#b84da0' },
};

export const DISTRICT_LABELS = {
  utility_data:                        'Utility & Data',
  governance_knowledge:                'Governance & Knowledge',
  public_wellness:                     'Public & Wellness',
  manufacturing_logistics:             'Manufacturing & Logistics',
  bioenergy_farm_lifescience:          'Bio-Energy & Life Science',
  visitor_hotel_mobility_residential:  'Visitor, Hotel & Mobility',
};

export const FACILITIES = [
  { id:"prism_gateway_hq",                 number:1,  name:"Prism Gateway HQ",                 district:"utility_data",                         position:[220,585], height_m:18,   stories:4, footprint_m:[91.4,45.7],   area_sf:180000,  arch_notes:"Prismatic crystalline crown, full-height curtain wall, stepped upper floors, grand lobby atrium. Signature gateway to the data district." },
  { id:"neural_block_data_center",         number:2,  name:"Neural Block Data Center",         district:"utility_data",                         position:[390,555], height_m:24,   stories:4, footprint_m:[219.5,109.7], area_sf:1036800, arch_notes:"Dominant mega-structure. Dark metal cladding, minimal fenestration, extensive rooftop mechanical. 96MW critical IT capacity. Largest building on campus." },
  { id:"vault_archive",                    number:3,  name:"The Vault Archive",                district:"utility_data",                         position:[110,548], height_m:16.5, stories:3, footprint_m:[54.9,36.6],   area_sf:64800,   arch_notes:"Compact vault form, heavily reinforced. Near-featureless exterior with security berm, blast-rated walls, single controlled entry." },
  { id:"royal_library_academy",            number:4,  name:"Royal Library and Academy",        district:"governance_knowledge",                 position:[545,600], height_m:18,   stories:4, footprint_m:[97.5,51.8],   area_sf:217600,  arch_notes:"Civic landmark. Classical-modern fusion with generous colonnade, barrel-vaulted central reading hall, grand public stair, warm stone cladding." },
  { id:"nexus_labs_media_studio",          number:5,  name:"Nexus Labs Media Studio",          district:"governance_knowledge",                 position:[462,530], height_m:13.5, stories:3, footprint_m:[76.2,48.8],   area_sf:120000,  arch_notes:"Contemporary media studio. Horizontal ribbon windows, dark glass with metal fins, large cantilevered canopy with digital media screen." },
  { id:"animus_prime_robotics_factory",    number:6,  name:"Animus Prime Robotics Factory",    district:"manufacturing_logistics",              position:[190,375], height_m:24,   stories:3, footprint_m:[152.4,61.0],  area_sf:300000,  arch_notes:"Large-span industrial with dramatic sawtooth monitor roof. High-bay volumes for robotic assembly lines. Covered loading bays on north facade." },
  { id:"vector_shift_logistics_hub",       number:7,  name:"Vector Shift Logistics Hub",       district:"manufacturing_logistics",              position:[108,248], height_m:21,   stories:3, footprint_m:[109.7,54.9],  area_sf:194400,  arch_notes:"Logistics distribution center. Extensive truck court, multiple dock doors, overhead bridge connection to robotics factory." },
  { id:"gaia_synthesis_vertical_farm",     number:8,  name:"Gaia Synthesis Vertical Farm",     district:"bioenergy_farm_lifescience",           position:[858,572], height_m:12,   stories:2, footprint_m:[91.4,61.0],   area_sf:120000,  arch_notes:"Landmark greenhouse. Full-height glass enclosure reveals stacked growing levels. Living wall on south facade. Glowing green at night from grow lights." },
  { id:"vital_helix_bio_research_lab",     number:9,  name:"Vital Helix Bio-Research Lab",     district:"bioenergy_farm_lifescience",           position:[898,433], height_m:13.5, stories:3, footprint_m:[85.3,54.9],   area_sf:151200,  arch_notes:"Biomorphic plan with helix-referencing entry canopy. Clean white cladding with horizontal ribbon windows. Visible rooftop mechanical plant." },
  { id:"civic_core",                       number:10, name:"Civic Core",                       district:"public_wellness",                      position:[565,370], height_m:13.5, stories:3, footprint_m:[67.1,42.7],   area_sf:92400,   arch_notes:"Campus civic center. Central glazed dome acts as beacon. Radiating colonnade defines circular public plaza. Primary social hub." },
  { id:"kinetic_edge_wellness_center",     number:11, name:"Kinetic Edge Wellness Center",     district:"public_wellness",                      position:[432,292], height_m:10,   stories:2, footprint_m:[97.5,67.1],   area_sf:140800,  arch_notes:"Large-span wellness facility with sweeping curved shell roof. Generous perimeter glazing. Outdoor fitness terrace. Pool wing with tall clerestory." },
  { id:"observatory_sky_deck",             number:12, name:"Observatory and Sky Deck",         district:"public_wellness",                      position:[718,448], height_m:10,   stories:2, footprint_m:[48.8,30.5],   area_sf:32000,   arch_notes:"Compact observatory with signature silver dome. Surrounding sky-deck terrace on upper level. Dark glazed base contrasts with bright dome." },
  { id:"forge_materials_lab",              number:13, name:"Forge Materials Lab",              district:"public_wellness",                      position:[657,292], height_m:11,   stories:2, footprint_m:[91.4,54.9],   area_sf:108000,  arch_notes:"Materials testing laboratory. Warm corten-toned metal cladding. Exposed testing bays visible through large glazed openings. Adjacent outdoor materials yard." },
  { id:"aether_link_tower",                number:14, name:"Aether Link Tower",                district:"public_wellness",                      position:[592,445], height_m:22,   stories:4, footprint_m:[36.6,36.6],   area_sf:57600,   arch_notes:"Landmark communication tower with square plan rotated 45°. Polished glass curtain wall. Tall communications mast extends 30m above roof. Campus beacon." },
  { id:"habitat_eco_residential_commons",  number:15, name:"Habitat Eco-Residential Commons",  district:"visitor_hotel_mobility_residential",   position:[798,212], height_m:14,   stories:4, footprint_m:[106.7,70.1],  area_sf:322000,  arch_notes:"Residential commons with U-shaped courtyard. Warm terracotta cladding with deep balconies. Green living terraces step down on south face. Solar pergola." },
  { id:"nexus_transportation_hub",         number:16, name:"Nexus Transportation Hub",         district:"visitor_hotel_mobility_residential",   position:[932,155], height_m:14,   stories:2, footprint_m:[106.7,54.9],  area_sf:126000,  arch_notes:"Multi-modal transit hub with dramatic arching steel and glass roof. Platform at grade, mezzanine concourse above. Drop-off loop at south." },
  { id:"sentinel_security_command",        number:17, name:"Sentinel Security Command",        district:"manufacturing_logistics",              position:[302,503], height_m:8,    stories:2, footprint_m:[76.2,45.7],   area_sf:75000,   arch_notes:"Compact security command center. Minimal glazing, dark reinforced concrete. Rooftop surveillance mast. Vehicle barriers at perimeter." },
  { id:"foundry_manufacturing_district",   number:18, name:"Foundry Manufacturing District",   district:"manufacturing_logistics",              position:[322,268], height_m:24,   stories:3, footprint_m:[152.4,91.4],  area_sf:450000,  arch_notes:"Largest industrial building. Multiple sawtooth monitor bays create dramatic skyline. Exhaust stacks rise from roof. Heavy freight access all sides." },
  { id:"juris_guard_center",               number:19, name:"Juris Guard Center",               district:"governance_knowledge",                 position:[635,582], height_m:13.5, stories:3, footprint_m:[67.1,33.5],   area_sf:72600,   arch_notes:"Legal and compliance center. Restrained civic architecture with stone-like cladding. Secure entry sequence. Court wing expressed with taller volume." },
  { id:"cognara_mind_institute",           number:20, name:"Cognara Mind Institute",           district:"governance_knowledge",                 position:[722,568], height_m:13.5, stories:3, footprint_m:[76.2,39.6],   area_sf:97500,   arch_notes:"Advanced AI cognition institute. Calm white palette with floating roof plane. Meditation courtyard at center. Lab wing has specialized shading." },
  { id:"signal_velocity_center",           number:21, name:"Signal Velocity Center",           district:"governance_knowledge",                 position:[780,490], height_m:13.5, stories:3, footprint_m:[61.0,36.6],   area_sf:72000,   arch_notes:"Telecommunications and signal engineering hub. Dark glass with vertical metal fins. Rooftop antenna array for signal research." },
  { id:"eon_core_systems_house",           number:22, name:"Eon Core Systems House",           district:"governance_knowledge",                 position:[668,487], height_m:13.5, stories:3, footprint_m:[67.1,39.6],   area_sf:85800,   arch_notes:"Systems integration and controls hub. Silver metal facade. Expressed control-room wing with smaller punched windows." },
  { id:"nomad_nexus_mobility_lab",         number:23, name:"Nomad Nexus Mobility Lab",         district:"manufacturing_logistics",              position:[395,433], height_m:13.5, stories:3, footprint_m:[67.1,36.6],   area_sf:79200,   arch_notes:"Autonomous mobility lab. Rooftop test track for robot and vehicle testing. Drone landing pad. Large vehicle-door openings." },
  { id:"kinetic_energy_operations_center", number:24, name:"Kinetic Energy Operations Center", district:"bioenergy_farm_lifescience",           position:[978,358], height_m:9,    stories:2, footprint_m:[61.0,45.7],   area_sf:60000,   arch_notes:"Kinetic energy monitoring and operations. Demonstration plaza with kinetic tile pavement. Large solar canopy over entry." },
  { id:"gaia_synthesis_bio_energy_center", number:25, name:"Gaia Synthesis Bio-Energy Center", district:"bioenergy_farm_lifescience",           position:[975,232], height_m:10,   stories:2, footprint_m:[79.2,61.0],   area_sf:104000,  arch_notes:"Bio-energy and water polishing center. Algae cultivation visible in luminescent green ponds. Biogas plant as compact cylindrical element. CHP plant." },
  { id:"central_utility_plant",            number:26, name:"Central Utility Plant",            district:"utility_data",                         position:[80,618],  height_m:12,   stories:2, footprint_m:[67.1,45.7],   area_sf:66000,   arch_notes:"Campus central utility plant. Utilitarian industrial form. Adjacent substation yard with transformers. Large cooling towers at north end." },
  { id:"emergency_operations_center",      number:27, name:"Emergency Operations Center",      district:"utility_data",                         position:[80,512],  height_m:8,    stories:2, footprint_m:[61.0,36.6],   area_sf:48000,   arch_notes:"Hardened emergency operations facility. Blast-resistant construction visible in thick wall reveals. Emergency generator yard at rear." },
  { id:"construction_innovation_yard",     number:28, name:"Construction Innovation Yard",     district:"manufacturing_logistics",              position:[195,132], height_m:9,    stories:1, footprint_m:[121.9,76.2],  area_sf:100000,  arch_notes:"Open innovation construction yard. Large steel canopy over fabrication area. Crane rail running the length. Materials storage and one enclosed fabrication shed." },
  { id:"visitor_experience_center",        number:29, name:"Visitor and Experience Center",     district:"visitor_hotel_mobility_residential",   position:[562,82],  height_m:10,   stories:2, footprint_m:[67.1,36.6],   area_sf:52800,   arch_notes:"Public gateway experience. Dramatic sweeping entry canopy as campus welcome gesture. Full glazed facade reveals interactive exhibits. Welcome plaza." },
  { id:"grand_conference_hotel",           number:30, name:"Grand Conference Hotel",           district:"visitor_hotel_mobility_residential",   position:[798,98],  height_m:16,   stories:4, footprint_m:[128.0,48.8],  area_sf:268800,  arch_notes:"Campus flagship hotel and conference center. Grand porte-cochere entry. Conference wing as separate volume. Hotel floors above. Rooftop pool." },
];

/**
 * Road network — centerlines in world meters. Both the environment (paints the
 * asphalt) and the population (drives vehicles, routes pedestrians) consume the
 * SAME list so traffic stays on the roads. Each road is a polyline of [x,y].
 */
export const ROAD_WIDTH = 13;          // m, full carriageway
export const SIDEWALK_WIDTH = 4;       // m, each side

export const ROADS = [
  // Perimeter ring
  { name:'ring', lanes:2, pts:[[55,55],[1042,55],[1042,609],[55,609],[55,55]] },
  // East–west avenues
  { name:'ave_s',  lanes:2, pts:[[55,180],[1042,180]] },
  { name:'ave_mid',lanes:2, pts:[[55,330],[1042,330]] },
  { name:'ave_n',  lanes:2, pts:[[55,470],[1042,470]] },
  // North–south streets
  { name:'st_w',   lanes:2, pts:[[150,55],[150,609]] },
  { name:'st_cw',  lanes:2, pts:[[470,55],[470,609]] },
  { name:'st_ce',  lanes:2, pts:[[720,55],[720,609]] },
  { name:'st_e',   lanes:2, pts:[[975,55],[975,609]] },
];

/** Axis-aligned building footprint rectangles for collision / placement exclusion. */
export function buildingFootprints(pad = 0) {
  return FACILITIES.map(f => {
    const hw = f.footprint_m[0] / 2 + pad;
    const hd = f.footprint_m[1] / 2 + pad;
    return {
      id: f.id,
      minX: f.position[0] - hw, maxX: f.position[0] + hw,
      minY: f.position[1] - hd, maxY: f.position[1] + hd,
      height: f.height_m,
    };
  });
}

/** True if world-point (x,y) lies inside any building footprint (optionally padded). */
export function isInsideBuilding(x, y, pad = 0, rects = null) {
  rects = rects || buildingFootprints(pad);
  for (const r of rects) {
    if (x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY) return r;
  }
  return null;
}

export const CAMPUS_STATS = {
  facilities: FACILITIES.length,
  totalAreaSf: FACILITIES.reduce((s, f) => s + f.area_sf, 0),
  districts: Object.keys(DISTRICT_COLORS).length,
};
