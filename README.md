```
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                                                                          ║
  ║       ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗      ║
  ║      ██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║      ║
  ║      ██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║      ║
  ║      ██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║      ║
  ║      ╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║      ║
  ║       ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝      ║
  ║                                                                          ║
  ║              AI  MEGA  CAMPUS  —  3D  MASTER  PLAN                       ║
  ║       Northeast Columbus Growth Corridor, Ohio, USA                      ║
  ║       180 Acres  •  30 Buildings  •  ~4.9 M GSF  •  6 Districts         ║
  ║                                                                          ║
  ╚══════════════════════════════════════════════════════════════════════════╝
```

# Collective AI Mega Campus — 3D Rendering Pipeline

A complete computational pipeline for the **Collective AI Mega Campus** master plan: a 180-acre, 30-building, ~4.9 million gross-square-foot innovation campus in the Northeast Columbus Growth Corridor, Ohio. This repository generates presentation-quality 3D renders and (optionally) GLTF/GLB assets from a single authoritative data source.

---

## Table of Contents

1. [Project Description](#project-description)
2. [Repository Structure](#repository-structure)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Quick Start](#quick-start)
6. [Pipeline Steps](#pipeline-steps)
7. [Render Views](#render-views)
8. [Architecture Overview — 6 Districts](#architecture-overview--6-districts)
9. [Full 30-Building Program Table](#full-30-building-program-table)
10. [Campus Statistics](#campus-statistics)
11. [Blender Rendering](#blender-rendering)
12. [Design Decisions and Assumptions](#design-decisions-and-assumptions)
13. [Regenerating Data](#regenerating-data)
14. [Contributing](#contributing)

---

## Project Description

The Collective AI Mega Campus is a purpose-built environment for the full stack of artificial intelligence work: compute infrastructure, research, governance, life-science, manufacturing, bio-energy, and community. The campus integrates six functionally distinct districts within a modified hex-grid street network, targeting 150 MW peak electrical capacity, 24 MWdc on-site solar, and 40 MW / 160 MWh battery storage.

This repository provides:

- **`data/facilities.json`** — authoritative master data for all 30 buildings, 6 districts, roads, water features, solar arrays, and wind turbines
- **`scripts/parse_dossier.py`** — re-generates and validates `facilities.json` from embedded source constants
- **`scripts/render_scene.py`** — produces 4 presentation-quality renders using a custom isometric + perspective rasterizer (matplotlib/numpy, no Blender required)
- **`scripts/run_pipeline.sh`** — orchestrates the complete pipeline in a single command

---

## Repository Structure

```
Collective-AI-Inc-Mega-Campus-/
│
├── README.md                          # This file
│
├── data/
│   └── facilities.json                # Authoritative campus data (all 30 buildings,
│                                      # 6 districts, site elements, energy stats)
│
├── scripts/
│   ├── parse_dossier.py               # Data extraction, validation, and stats
│   ├── render_scene.py                # Rendering pipeline (4 views + Blender ref)
│   ├── run_pipeline.sh                # Shell orchestrator — runs everything
│   ├── generate_buildings.py          # [future] Per-building GLB generator (trimesh)
│   ├── build_master_scene.py          # [future] Master scene assembler (trimesh)
│   └── utils/
│       └── __init__.py                # Shared utilities
│
├── assets/
│   ├── glb/
│   │   ├── buildings/                 # [generated] 30 individual building GLBs
│   │   └── site/                      # [generated] Master campus GLB
│   └── textures/                      # [future] PBR material textures
│
├── renders/                           # [generated] Render outputs
│   ├── hero_view.png                  # Aerial isometric — SW-to-NE perspective
│   ├── dusk_render.png                # Dusk/night palette with glow effects
│   ├── district_overview.png          # Near-vertical district plan view
│   └── ground_level.png               # Cinematic street-level perspective
│
└── reference/
    ├── building_mapping.md            # Building-to-district mapping notes
    └── image_analysis.md              # Concept image analysis notes
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10+ | 3.11+ recommended |
| numpy | 1.24+ | Numerical arrays |
| matplotlib | 3.6+ | Rendering engine |
| trimesh | 3.x | Optional — required for GLB generation |
| Blender | 4.x | Optional — for photorealistic renders |

Check your environment:

```bash
python3 --version
python3 -c "import numpy; print('numpy', numpy.__version__)"
python3 -c "import matplotlib; print('matplotlib', matplotlib.__version__)"
```

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url> Collective-AI-Inc-Mega-Campus-
cd Collective-AI-Inc-Mega-Campus-
```

### 2. Install Python dependencies

Minimum (renders only):

```bash
pip install numpy matplotlib
```

Full pipeline (includes GLB generation):

```bash
pip install numpy matplotlib trimesh scipy pygltflib
```

Optional quality-of-life additions:

```bash
pip install pillow tqdm colorama
```

### 3. (Optional) Install Blender

Download Blender 4.x from [blender.org](https://www.blender.org/download/) and ensure
`blender` is on your `PATH` for Blender-based rendering.

---

## Quick Start

### Run the full pipeline (renders only, no Blender required):

```bash
./scripts/run_pipeline.sh --renders
```

### Run specific steps individually:

```bash
# Validate data and print campus statistics
python3 scripts/parse_dossier.py --validate --summary

# Render all 4 views
python3 scripts/render_scene.py --view all

# Render a single view
python3 scripts/render_scene.py --view hero
python3 scripts/render_scene.py --view dusk
python3 scripts/render_scene.py --view overview
python3 scripts/render_scene.py --view ground
```

### Run the complete pipeline (including GLB generation):

```bash
./scripts/run_pipeline.sh
```

---

## Pipeline Steps

The pipeline has 4 stages, all orchestrated by `run_pipeline.sh`:

### Step 1 — Data Validation (`parse_dossier.py`)

Validates `data/facilities.json` against the embedded authoritative source constants
derived from the Master Development Dossier v3. Prints a full 30-building table,
per-district summary, and campus-wide statistics.

```
python3 scripts/parse_dossier.py --validate --summary
```

Flags:
- `--validate` — compare JSON against embedded source data; exit 1 on mismatch
- `--summary`  — print district totals and campus statistics

### Step 2 — Building GLB Generation (`generate_buildings.py`)

Generates one `.glb` (GLTF Binary) file per building using `trimesh`. Each GLB
represents the building massing (box geometry) with correct dimensions and
arch-family materials. Output: `assets/glb/buildings/<id>.glb` (30 files).

*Requires `trimesh`. Skipped automatically if trimesh is not installed.*

### Step 3 — Master Scene Assembly (`build_master_scene.py`)

Merges all 30 building GLBs with the ground plane, road network, water features,
and site elements into a single `collective-ai-mega-campus.glb` ready for import
into a web viewer or game engine. Output: `assets/glb/site/collective-ai-mega-campus.glb`

*Requires `trimesh`. Skipped automatically if trimesh is not installed.*

### Step 4 — Image Rendering (`render_scene.py`)

Produces 4 rendered images using a custom orthographic/perspective rasterizer
built on matplotlib + numpy. No Blender or GPU required.

The renderer implements:
- Custom isometric projection (SW-to-NE, 30° horizontal / 38° elevation)
- Painter's algorithm (back-to-front sort by projected Y)
- 3-face box shading (top 100%, south face 80%, west face 62%)
- Gradient sky backgrounds
- Water features, road network, scattered trees
- Atmospheric fog for ground-level perspective view

---

## Render Views

### `hero_view.png` — Aerial Isometric

**Camera:** SW corner looking NE, 38° elevation angle  
**Size:** 3000 × 1800 px (20" × 12" @ 150 dpi)  
**Content:** Full campus in isometric projection. Buildings coloured by architectural family. Water features, roads, trees, landmark labels, legend, and compass rose.

### `dusk_render.png` — Dusk / Night

**Camera:** Same SW isometric angle  
**Size:** 3000 × 1800 px  
**Content:** Deep indigo-to-orange dusk sky gradient. Buildings at night with amber window-glow overlays. Kinetic cyan road network. Starfield. Landmark glow halos.

### `district_overview.png` — District Plan

**Camera:** Near-vertical, 2D plan view  
**Size:** 2400 × 2100 px  
**Content:** District zone fills with translucent colour overlays. Building footprints numbered 1–30. Roads, water, trees, district labels, scale bar, compass.

### `ground_level.png` — Street Level Cinematic

**Camera:** South entry (548, −120, 5) looking north along the main boulevard  
**Size:** 3600 × 1500 px  
**Content:** One-point perspective. Buildings with depth-fog atmospheric effect. Roadway, sidewalk trees. Sky gradient. All 30 buildings visible in recession.

---

## Architecture Overview — 6 Districts

The campus is organised into six functionally distinct districts arranged across
1,097 m (east-west) × 664 m (north-south):

### District 1 — Utility and Data District *(northwest)*
Highest electrical and cooling loads. Nearest to utility interconnect. Dual-fed
138 kV backbone, N+1 substation, and data-center heat recovery loop. Contains the
dominant Neural Block Data Center (1.04M GSF, 96 MW critical IT capacity).

**Buildings:** 1, 2, 3, 26, 27  
**Total GFA:** ~1.40 M sf

### District 2 — Governance and Knowledge District *(north-central)*
Civic, academic, legal, and administrative hub. Public-facing with secured operational
adjacencies. Contains the Royal Library and Academy (landmark civic building with
barrel-vaulted reading hall).

**Buildings:** 4, 5, 19, 20, 21, 22  
**Total GFA:** ~665 K sf

### District 3 — Public and Wellness District *(centre)*
Campus heart. Civic amenities, wellness centre, observatory, and the Aether Link Tower
communication beacon. Centred on the 60 m reflecting pool and public plaza.

**Buildings:** 10, 11, 12, 13, 14  
**Total GFA:** ~431 K sf

### District 4 — Manufacturing and Logistics District *(south-central)*
Industrial operations, robotics assembly, freight distribution, and security command.
Screened from the public realm by landscape buffers. Contains the Foundry Manufacturing
District (largest industrial building, 450 K sf with sawtooth monitor roof).

**Buildings:** 6, 7, 17, 18, 23, 28  
**Total GFA:** ~1.20 M sf

### District 5 — Bioenergy, Farm, and Life-Science District *(east)*
Vertical farming, bio-research, algae water-polishing, and life-science at the eastern
campus edge. Adjacent to East River Edge water body. Gaia Synthesis Vertical Farm
is a landmark greenhouse structure.

**Buildings:** 8, 9, 24, 25  
**Total GFA:** ~435 K sf

### District 6 — Visitor, Hotel, Mobility, and Residential District *(south entry)*
Southern public gateway with hospitality, transit, and residential. Primary campus
arrival zone. Contains the Grand Conference Hotel and Innovation Center (campus
flagship, rooftop pool and terrace).

**Buildings:** 15, 16, 29, 30  
**Total GFA:** ~770 K sf

---

## Full 30-Building Program Table

| # | Building | District | Footprint (m) | Stories | GFA (sf) |
|---|----------|----------|--------------|---------|----------|
| 1 | Prism Gateway HQ | Utility & Data | 91.4 × 45.7 | 4 | 180,000 |
| 2 | Neural Block Data Center | Utility & Data | 219.5 × 109.7 | 4 | 1,036,800 |
| 3 | The Vault Archive | Utility & Data | 54.9 × 36.6 | 3 | 64,800 |
| 4 | Royal Library and Academy | Governance & Knowledge | 97.5 × 51.8 | 4 | 217,600 |
| 5 | Nexus Labs Media Studio | Governance & Knowledge | 76.2 × 48.8 | 3 | 120,000 |
| 6 | Animus Prime Robotics Factory | Manufacturing & Logistics | 152.4 × 61.0 | 3 | 300,000 |
| 7 | Vector Shift Logistics Hub | Manufacturing & Logistics | 109.7 × 54.9 | 3 | 194,400 |
| 8 | Gaia Synthesis Vertical Farm | Bioenergy, Farm & Life-Sci | 91.4 × 61.0 | 2 | 120,000 |
| 9 | Vital Helix Bio-Research Lab | Bioenergy, Farm & Life-Sci | 85.3 × 54.9 | 3 | 151,200 |
| 10 | Civic Core | Public & Wellness | 67.1 × 42.7 | 3 | 92,400 |
| 11 | Kinetic Edge Wellness Center | Public & Wellness | 97.5 × 67.1 | 2 | 140,800 |
| 12 | Observatory and Sky Deck | Public & Wellness | 48.8 × 30.5 | 2 | 32,000 |
| 13 | Forge Materials Lab | Public & Wellness | 91.4 × 54.9 | 2 | 108,000 |
| 14 | Aether Link Tower | Public & Wellness | 36.6 × 36.6 | 4 | 57,600 |
| 15 | Habitat Eco-Residential Commons | Visitor, Hotel & Residential | 106.7 × 70.1 | 4 | 322,000 |
| 16 | Nexus Transportation Hub | Visitor, Hotel & Residential | 106.7 × 54.9 | 2 | 126,000 |
| 17 | Sentinel Security Command | Manufacturing & Logistics | 76.2 × 45.7 | 2 | 75,000 |
| 18 | Foundry Manufacturing District | Manufacturing & Logistics | 152.4 × 91.4 | 3 | 450,000 |
| 19 | Juris Guard Center | Governance & Knowledge | 67.1 × 33.5 | 3 | 72,600 |
| 20 | Cognara Mind Institute | Governance & Knowledge | 76.2 × 39.6 | 3 | 97,500 |
| 21 | Signal Velocity Center | Governance & Knowledge | 61.0 × 36.6 | 3 | 72,000 |
| 22 | Eon Core Systems House | Governance & Knowledge | 67.1 × 39.6 | 3 | 85,800 |
| 23 | Nomad Nexus Mobility Lab | Manufacturing & Logistics | 67.1 × 36.6 | 3 | 79,200 |
| 24 | Kinetic Energy Operations Center | Bioenergy, Farm & Life-Sci | 61.0 × 45.7 | 2 | 60,000 |
| 25 | Gaia Synthesis Bio-Energy Center | Bioenergy, Farm & Life-Sci | 79.2 × 61.0 | 2 | 104,000 |
| 26 | Central Utility Plant | Utility & Data | 67.1 × 45.7 | 2 | 66,000 |
| 27 | Emergency Operations Center | Utility & Data | 61.0 × 36.6 | 2 | 48,000 |
| 28 | Construction Innovation Yard | Manufacturing & Logistics | 121.9 × 76.2 | 1 | 100,000 |
| 29 | Visitor and Experience Center | Visitor, Hotel & Residential | 67.1 × 36.6 | 2 | 52,800 |
| 30 | Grand Conference Hotel and Innovation Center | Visitor, Hotel & Residential | 128.0 × 48.8 | 4 | 268,800 |

**Campus Total: 4,895,300 sf across 30 buildings**

---

## Campus Statistics

| Metric | Value |
|---|---|
| Site area | 180 acres (72.8 ha) |
| Campus dimensions | 1,097 m × 664 m |
| Total buildings | 30 |
| Total gross floor area | ~4.90 M sf |
| Average floor-area ratio | 2.9 |
| Total building footprint | ~1.68 M sf |
| Avg. building stories | 2.8 |
| Peak electrical load | 150 MW |
| Annual energy | 900 GWh/yr |
| On-site solar | 24 MWdc |
| Battery storage | 40 MW / 160 MWh |
| Largest building | Neural Block Data Center (1,036,800 sf) |
| Smallest building | Observatory and Sky Deck (32,000 sf) |
| Street pattern | Modified hex-grid |
| Districts | 6 |

---

## Blender Rendering

For photorealistic renders with global illumination, `scripts/render_scene.py`
includes a complete Blender `bpy` reference implementation in the
`BLENDER_RENDER_CODE` constant at the bottom of the file.

### To use Blender rendering:

1. Install Blender 4.x and ensure `blender` is on your PATH

2. Run the render script via Blender's background Python mode:

```bash
blender --background --python scripts/render_scene.py -- --blender
```

This will:
- Clear the default scene
- Create a ground plane
- Instantiate all 30 buildings as correctly-scaled, correctly-positioned mesh cubes
  with arch-family PBR materials (Principled BSDF)
- Set up an HDRI sky + Sun lamp
- Set camera to the hero isometric position (SW to NE, 38° elevation)
- Render to `renders/hero_view_blender.png` at 4096 × 2304 px

### Extending the Blender render:

The reference code in `BLENDER_RENDER_CODE` is a starting point. To enhance:

- Add detailed geometry from `assets/glb/buildings/` using `bpy.ops.import_scene.gltf()`
- Apply HDRI environment maps for realistic sky reflections
- Add Cycles path-tracing for shadow quality
- Use geometry nodes to populate trees, roads, and water bodies at scale
- Render animation sequences for fly-through videos

---

## Design Decisions and Assumptions

### Coordinate System

Campus coordinates use a metric (m) right-hand coordinate system:
- **X axis:** West (0) to East (1,097 m)
- **Y axis:** South (0) to North (664 m)
- **Z axis:** Ground level (0) upward

Building `position` values are the **centroid** of each building footprint
(centre of the rectangle in plan).

### Building Heights

Floor heights are assigned per architectural family:
- Data bunkers, industrial: 6–8 m floor-to-floor (tall equipment clearance)
- Corporate towers, civic: 4–4.5 m
- Residential, wellness: 3.5–5 m

`height_m` in the JSON is `stories × floor_height_m` (exact per building).

### Gross Area (GFA)

Gross square footage values are sourced directly from the Master Development
Dossier v3. They represent gross building area including all floors, walls, and
mechanical spaces (not net leasable area).

Note: `stories × footprint_ft[0] × footprint_ft[1]` does not always exactly equal
`gross_area_sf` due to partial floors, setbacks, and atria in some buildings.
The `gross_area_sf` values from the dossier are authoritative.

### Isometric Projection

The hero and dusk views use a modified isometric projection:

```
sx = (x - y) * cos(30°)
sy = (x + y) * sin(30°) * 0.42 + z * sin(38°)
```

The 0.42 vertical compression factor produces a visually balanced isometric
perspective that matches the concept rendering orientation (SW camera, NE view).

### Painter's Algorithm

Buildings are rendered back-to-front, sorted by projected screen Y coordinate.
This approximation works well for non-overlapping isometric views of the campus
but does not handle arbitrary occlusion between nearby buildings of very different
heights. For exact occlusion, use the Blender renderer.

---

## Regenerating Data

If you need to update building parameters:

1. Edit `SOURCE_FACILITIES` in `scripts/parse_dossier.py` (the authoritative Python constants)
2. Update the corresponding record in `data/facilities.json`
3. Run validation: `python3 scripts/parse_dossier.py --validate`
4. Re-render: `python3 scripts/render_scene.py --view all`

The JSON file is the runtime data source for rendering. The Python constants
in `parse_dossier.py` are the edit-time source of truth. Keep them in sync.

---

## Contributing

### Adding new buildings

1. Add an entry to `SOURCE_FACILITIES` in `scripts/parse_dossier.py`
2. Add the corresponding record to `data/facilities.json` (follow the schema of existing entries)
3. Validate: `python3 scripts/parse_dossier.py --validate`
4. Re-render: `python3 scripts/render_scene.py --view all`

### Adding new render views

Add a `render_<viewname>()` function in `scripts/render_scene.py` following the
pattern of existing views, then add the view name to the `argparse` choices and
the `main()` dispatch in that file.

### Code style

- Python 3.11+, typed where practical
- All physical quantities in metres (metric-first); imperial in JSON for cross-reference only
- Use `numpy` for vectorised operations; avoid Python loops over large point arrays

---

*Generated by the Collective AI Mega Campus rendering pipeline.*  
*Source: Master Development Dossier v3 — Northeast Columbus Growth Corridor, Ohio.*
