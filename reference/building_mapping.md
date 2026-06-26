# Building Mapping: PDF Facility Program → Concept Image Visual Identity

## Mapping Methodology

Each building is assigned:
1. A visual position in the hex-grid from image analysis
2. An architectural family that matches its image appearance
3. Specific visual features inferred from the concept art
4. PDF-authoritative dimensions as hard constraints

## Site Coordinate System

- **Origin**: SW corner of site (bottom-left on plan)
- **X axis**: East (positive = East), range 0–1097m
- **Y axis**: North (positive = North), range 0–664m
- **Z axis**: Up (heights above grade)
- **Site center**: (548.5, 332.0)

## District Assignments and Hex Cell Positions

### District 1: Utility and Data (NW) — x: 0–460, y: 430–664
| # | Building | Position (m) | Hex Cell | Visual Notes |
|---|----------|-------------|---------|-------------|
| 1 | Prism Gateway HQ | (220, 585) | NW-2 | Prismatic crystalline tower, gateway to data district |
| 2 | Neural Block Data Center | (390, 555) | NW-Center | DOMINANT massive dark structure, largest on campus |
| 3 | The Vault Archive | (110, 548) | NW-1 | Compact dark fortress, minimal windows |
| 26 | Central Utility Plant | (80, 618) | NW-0 | Utilitarian, cooling towers, substation yard |
| 27 | Emergency Operations Center | (80, 512) | NW-SW | Hardened bunker adjacent to utility plant |

### District 2: Governance and Knowledge (N-Central) — x: 350–800, y: 450–664
| # | Building | Position (m) | Hex Cell | Visual Notes |
|---|----------|-------------|---------|-------------|
| 4 | Royal Library and Academy | (545, 600) | NC-Center | Dominant civic, barrel vault, warm stone |
| 5 | Nexus Labs Media Studio | (462, 530) | NC-W | Dark glass, cantilevered screen, media plaza |
| 19 | Juris Guard Center | (635, 582) | NC-E | Restrained civic, court wing expressed |
| 20 | Cognara Mind Institute | (722, 568) | NC-NE | White floating roof, meditation courtyard |
| 21 | Signal Velocity Center | (780, 490) | NC-SE | Dark fins, antenna array |
| 22 | Eon Core Systems House | (668, 487) | NC-S | Silver metal, control room wing |

### District 3: Public and Wellness (Center) — x: 350–800, y: 220–480
| # | Building | Position (m) | Hex Cell | Visual Notes |
|---|----------|-------------|---------|-------------|
| 10 | Civic Core | (565, 370) | CENTER | Domed atrium, ring plaza, campus heart |
| 11 | Kinetic Edge Wellness Center | (432, 292) | C-W | Curved shell roof, pool wing |
| 12 | Observatory and Sky Deck | (718, 448) | C-E | Distinctive dome, dark base |
| 13 | Forge Materials Lab | (657, 292) | C-SE | Warm corten metal, test yard |
| 14 | Aether Link Tower | (592, 445) | C-N | TALL LANDMARK, rotated square, communications mast |
| 23 | Nomad Nexus Mobility Lab | (395, 433) | C-NW | Rooftop test track, vehicle doors |

### District 4: Manufacturing and Logistics (S-Central) — x: 0–550, y: 0–440
| # | Building | Position (m) | Hex Cell | Visual Notes |
|---|----------|-------------|---------|-------------|
| 6 | Animus Prime Robotics Factory | (190, 375) | SW-N | Large sawtooth roof, robotics demo court |
| 7 | Vector Shift Logistics Hub | (108, 248) | SW-Center | Industrial, loading docks, truck court |
| 17 | Sentinel Security Command | (302, 503) | SW-NE | Dark concrete, surveillance mast |
| 18 | Foundry Manufacturing District | (322, 268) | SW-Center | LARGE, multiple sawtooth bays, stacks |
| 28 | Construction Innovation Yard | (195, 132) | SW-S | Open yard, canopy shed, crane rail |

### District 5: Bioenergy, Farm, Life-Science (East) — x: 720–1097, y: 180–664
| # | Building | Position (m) | Hex Cell | Visual Notes |
|---|----------|-------------|---------|-------------|
| 8 | Gaia Synthesis Vertical Farm | (858, 572) | E-N | BRIGHT GREEN landmark greenhouse |
| 9 | Vital Helix Bio-Research Lab | (898, 433) | E-Center | White biomorphic, helix canopy |
| 24 | Kinetic Energy Operations Center | (978, 358) | E-SE | Solar canopy roof, demo plaza |
| 25 | Gaia Synthesis Bio-Energy Center | (975, 232) | E-S | Algae ponds, luminescent green |

### District 6: Visitor, Hotel, Mobility, Residential (Southern Entry) — x: 380–1097, y: 0–260
| # | Building | Position (m) | Hex Cell | Visual Notes |
|---|----------|-------------|---------|-------------|
| 15 | Habitat Eco-Residential Commons | (798, 212) | SE-N | Terracotta U-plan, balconies, courtyard |
| 16 | Nexus Transportation Hub | (932, 155) | SE-E | Arched steel+glass canopy, platforms |
| 29 | Visitor and Experience Center | (562, 82) | S-Center | Sweeping entry canopy, full glazing |
| 30 | Grand Conference Hotel | (798, 98) | SE-Center | Long building, porte-cochere, rooftop pool |

---

## Architectural Family Definitions

### DATA_BUNKER
**Buildings**: 2, 3, 26, 27
- Massing: Box with slight inward taper, raised on security podium
- Roof: Flat with HVAC cluster grid, cooling tower fins, roof perimeter parapet
- Facade: Horizontal metal panel courses, small punched windows, ribbed texture
- Base: Security berm or raised curb, bollards, no-step perimeter
- Color: Near-black (#1a1a1a) metal with dark grey (#2a2a2a) base concrete
- Height exaggeration: Extra height per floor for infrastructure clearance

### CORPORATE_TOWER
**Buildings**: 1, 14
- Massing: Prismatic with setbacks at ~⅓ and ⅔ height, narrow crown
- Roof: Crystalline geometric crown, spire, or communications mast
- Facade: Full-height curtain wall with floor-plate shadow reveals
- Base: Wide lobby canopy, transparent ground floor
- Color: High-reflectance (#e0e8f0) aluminum + clear glass, slight blue tint
- Special: Plan rotated 45° for Aether Link Tower for diamond/star silhouette

### CIVIC_CULTURAL
**Buildings**: 4, 10, 19, 29
- Massing: Longitudinal with central feature volume (dome, vault, tower)
- Roof: Barrel vault, dome, or dramatic canopy as identity element
- Facade: Stone-like base with vertical colonnade rhythm, generous glazing
- Base: Public plaza, public stair, identity element at entry
- Color: Off-white (#f0ece0) stone-like + warm (#c8a870) accent
- Special: Entry always facing south or primary campus road

### LIFE_SCIENCE
**Buildings**: 8, 9, 25
- Massing: Curved plan or rectangular with greenhouse wing
- Roof: Glass greenhouse, curved white membrane, or algae pond roof
- Facade: Structural glass system (for farm) or white metal + glass (for lab)
- Base: Landscape integration, planting around perimeter, water feature adjacency
- Color: Bright (#40d060) green glass for farm, white (#f8f8f8) for labs
- Special: Vegetation visible through/on building, dramatic at night

### INDUSTRIAL
**Buildings**: 6, 7, 18, 28
- Massing: Long rectangular with functional profile (sawtooth, flat, open)
- Roof: Sequential sawtooth monitor bays (multiple triangular north-facing skylights)
- Facade: Corrugated metal, horizontal panel, dock doors, clerestory glazing
- Base: Truck court, loading docks, vehicle access, material laydown
- Color: Galvanized grey (#8a8a8a) + rust accent (#8a4020) on trim
- Special: Scale expressed through dock count, crane infrastructure visible

### WELLNESS_RECREATION
**Buildings**: 11, 12
- Massing: Organic/rounded, single to two stories, generous floor area
- Roof: Sweeping curved shell (wellness) or dome (observatory)
- Facade: Panoramic glazing, minimal solid walls, light steel framing expressed
- Base: Outdoor activity zones, landscape integration
- Color: White (#f0f0f0) structure + clear glass
- Special: Roof form is primary identity element

### MIXED_USE
**Buildings**: 15, 30
- Massing: Hotel — longitudinal bar 4 floors; Residential — U-plan courtyard
- Roof: Green roof amenity, rooftop pool or terrace
- Facade: Balcony plates on hotel, deep balconies on residential
- Base: Active ground floor (lobby, retail, amenity), porte-cochere
- Color: Warm terracotta (#c87850) + cream (#f0e8d8) + glass
- Special: Human-scaled rhythm, welcoming character

### TRANSPORT
**Buildings**: 16, 23
- Massing: Large-span linear or compact with significant roof feature
- Roof: Arching steel+glass canopy (hub) or flat test-track surface (mobility lab)
- Facade: Open structure (hub), or white metal with large vehicle doors (mobility)
- Base: Platform at grade, drop-off loop, pedestrian flow management
- Color: Silver (#d0d8e0) steel + clear glass
- Special: Structural expression is primary architectural feature

### SECURITY
**Buildings**: 17, 27
- Massing: Compact rectangle, 1–2 stories, unassuming footprint
- Roof: Flat hardened roof with surveillance mast and antenna cluster
- Facade: Minimal glazing (20% max), heavy concrete or corten finish
- Base: Vehicle barriers, controlled access, no-go zone markers
- Color: Dark charcoal (#303030) concrete
- Special: Defensive aesthetic is intentional character

### RESEARCH
**Buildings**: 5, 9, 13, 20, 21, 22, 23
- Massing: Rectangular with slight L-wing for courtyard, 3 stories
- Roof: Flat with rooftop plant, green roof, or antenna array
- Facade: Horizontal ribbon windows, metal panel spandrels, fins at south
- Base: Entry sequence, wayfinding, campus address
- Color: Silver (#c0c8d0) metal + horizontal dark glass bands
- Special: Each facility has a distinct identity element (antenna, floating plane, etc.)

---

## Inferred Geometry for Occluded Sides

Since the concept image shows primarily the south and west faces, east and north faces are inferred as:
- **Data/Industrial**: Same facade treatment continued; no significant variation; dock doors on unexposed sides
- **Civic/Cultural**: North face has service entries and back-of-house; east/west have secondary glazing
- **Residential/Hotel**: All four sides have balconies; courtyard interior is primary amenity face
- **Research**: East and north faces continue ribbon window pattern with slight shading variation

All roof forms visible in the isometric view are consistent 360° — no "false front" treatment.

---

## Conflict Resolution: Image vs PDF

Where the concept image and PDF dimensions create apparent conflict:
1. **PDF dimensions are authoritative for building area** — footprints use PDF numbers
2. **Image visual character is authoritative for architectural form** — shapes, roof profiles, materials
3. **Image proportions used for setback and landscape zone width** — typically 10–20% of building width
4. **Story heights interpolated** from architectural family norms, not from image pixel measurements
