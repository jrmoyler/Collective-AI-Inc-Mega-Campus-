#!/usr/bin/env python3
"""
Assemble the complete Collective AI Mega Campus master scene.
Loads individual building GLBs, places them at campus coordinates,
generates terrain, roads, landscape, water, and infrastructure,
then exports the full campus as a single GLB.

Usage: python3 scripts/build_master_scene.py
       (run from repo root after generate_buildings.py)
"""
import sys
import json
import math
from pathlib import Path

import trimesh
import numpy as np

REPO = Path(__file__).parent.parent
DATA = REPO / "data" / "facilities.json"
BUILDINGS_DIR = REPO / "assets" / "glb" / "buildings"
OUT_DIR = REPO / "assets" / "glb" / "site"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Building positions: id -> (x, y, z, rot_deg)
BUILDING_POSITIONS = {
    "prism_gateway_hq":                 (220,  585, 0,  0),
    "neural_block_data_center":         (390,  555, 0,  0),
    "vault_archive":                    (110,  548, 0,  0),
    "royal_library_academy":            (545,  600, 0,  0),
    "nexus_labs_media_studio":          (462,  530, 0, 15),
    "animus_prime_robotics_factory":    (190,  375, 0,  0),
    "vector_shift_logistics_hub":       (108,  248, 0,  0),
    "gaia_synthesis_vertical_farm":     (858,  572, 0, 10),
    "vital_helix_bio_research_lab":     (898,  433, 0,  0),
    "civic_core":                       (565,  370, 0,  0),
    "kinetic_edge_wellness_center":     (432,  292, 0,  0),
    "observatory_sky_deck":             (718,  448, 0,  0),
    "forge_materials_lab":              (657,  292, 0,  0),
    "aether_link_tower":                (592,  445, 0, 45),
    "habitat_eco_residential_commons":  (798,  212, 0,  0),
    "nexus_transportation_hub":         (932,  155, 0,  0),
    "sentinel_security_command":        (302,  503, 0,  0),
    "foundry_manufacturing_district":   (322,  268, 0,  0),
    "juris_guard_center":               (635,  582, 0,  0),
    "cognara_mind_institute":           (722,  568, 0,  0),
    "signal_velocity_center":           (780,  490, 0,  0),
    "eon_core_systems_house":           (668,  487, 0,  0),
    "nomad_nexus_mobility_lab":         (395,  433, 0,  0),
    "kinetic_energy_operations_center": (978,  358, 0,  0),
    "gaia_synthesis_bio_energy_center": (975,  232, 0,  0),
    "central_utility_plant":            ( 80,  618, 0,  0),
    "emergency_operations_center":      ( 80,  512, 0,  0),
    "construction_innovation_yard":     (195,  132, 0,  0),
    "visitor_experience_center":        (562,   82, 0,  0),
    "grand_conference_hotel":           (798,   98, 0,  0),
}

# Road network: (x1, y1, x2, y2, width)
ROADS = [
    # Perimeter ring road (width=18)
    (0,    80,   1097,  80,   18),
    (0,    584,  1097,  584,  18),
    (80,   0,    80,    664,  18),
    (1017, 0,    1017,  664,  18),
    # Main E-W boulevards
    (80,   332,  1017,  332,  22),
    (80,   166,  550,   166,  16),
    (550,  166,  1017,  166,  16),
    (80,   498,  550,   498,  16),
    (550,  498,  1017,  498,  16),
    # Main N-S spines
    (548,  80,   548,   584,  22),
    (274,  80,   274,   584,  16),
    (822,  80,   822,   584,  16),
    # Secondary hex-diagonal roads (width=12)
    (80,   80,   274,   166,  12),
    (274,  166,  548,   80,   12),
    (548,  80,   822,   166,  12),
    (822,  166,  1017,  80,   12),
    (80,   584,  274,   498,  12),
    (274,  498,  548,   584,  12),
    (548,  584,  822,   498,  12),
    (822,  498,  1017,  584,  12),
    (80,   332,  274,   498,  12),
    (274,  166,  80,    332,  12),
    (822,  166,  1017,  332,  12),
    (1017, 332,  822,   498,  12),
    (274,  332,  548,   498,  12),
    (548,  166,  274,   332,  12),
    (822,  332,  548,   498,  12),
    (548,  166,  822,   332,  12),
]

# District colors for fallback building boxes
DISTRICT_COLORS = {
    "utility_data":                      [30,  40,  55,  255],
    "governance_knowledge":              [42,  58,  92,  255],
    "public_wellness":                   [30,  61,  42,  255],
    "manufacturing_logistics":           [58,  42,  26,  255],
    "bioenergy_farm_lifescience":        [26,  60,  40,  255],
    "visitor_hotel_mobility_residential":[60,  42,  60,  255],
}


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def apply_vertex_color(mesh, color):
    """Apply a solid RGBA color to all vertices of a mesh."""
    rgba = np.array(color, dtype=np.uint8)
    mesh.visual.vertex_colors = np.tile(rgba, (len(mesh.vertices), 1))
    return mesh


def make_box(w, d, h, cx, cy, cz, color, name="box"):
    """Create a colored box mesh centered at (cx, cy, cz)."""
    m = trimesh.creation.box(extents=[w, d, h])
    apply_vertex_color(m, color)
    m.apply_translation([cx, cy, cz])
    return m, name


def road_segment(x1, y1, x2, y2, width=14.0, color=None, name="road"):
    """
    Create a flat road box between two points (x1,y1)-(x2,y2).
    The box lies at z=0.05 with 0.2m thickness.
    """
    if color is None:
        color = [55, 55, 60, 255]
    dx = x2 - x1
    dy = y2 - y1
    length = math.sqrt(dx * dx + dy * dy)
    if length < 0.01:
        return None, name

    angle = math.atan2(dy, dx)

    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0

    m = trimesh.creation.box(extents=[length, width, 0.2])
    apply_vertex_color(m, color)
    # Rotate around Z to align with road direction
    rot = trimesh.transformations.rotation_matrix(angle, [0, 0, 1])
    m.apply_transform(rot)
    m.apply_translation([cx, cy, 0.05])
    return m, name


def make_cylinder(radius, height, cx, cy, cz, color, sections=16, name="cyl"):
    """Create a colored cylinder centered at (cx, cy, cz)."""
    m = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    apply_vertex_color(m, color)
    m.apply_translation([cx, cy, cz])
    return m, name


def make_sphere(radius, cx, cy, cz, color, subdivisions=2, name="sphere"):
    """Create a colored icosphere at (cx, cy, cz)."""
    m = trimesh.creation.icosphere(radius=radius, subdivisions=subdivisions)
    apply_vertex_color(m, color)
    m.apply_translation([cx, cy, cz])
    return m, name


def add_mesh(scene, mesh, name):
    """Add mesh to scene with a unique name."""
    if mesh is not None:
        scene.add_geometry(mesh, node_name=name)


# ---------------------------------------------------------------------------
# Terrain
# ---------------------------------------------------------------------------

def generate_terrain(scene):
    """Flat ground plane for the entire campus."""
    m, n = make_box(
        w=1097, d=664, h=0.5,
        cx=548.5, cy=332, cz=-0.25,
        color=[85, 100, 75, 255],
        name="terrain_base"
    )
    add_mesh(scene, m, n)


# ---------------------------------------------------------------------------
# Roads
# ---------------------------------------------------------------------------

def generate_roads(scene):
    """Generate the hex-grid road network."""
    road_color = [55, 55, 60, 255]
    for i, seg in enumerate(ROADS):
        x1, y1, x2, y2, width = seg
        m, _ = road_segment(x1, y1, x2, y2, width=width, color=road_color,
                             name=f"road_{i}")
        if m is not None:
            add_mesh(scene, m, f"road_{i}")


# ---------------------------------------------------------------------------
# Water features
# ---------------------------------------------------------------------------

def generate_water(scene):
    """Rivers, reflecting pool, algae ponds, blue-green corridor."""
    # North River
    m, n = make_box(1097, 40, 0.3, 548.5, 644, 0.15,
                    color=[40, 100, 180, 220], name="water_north_river")
    add_mesh(scene, m, n)

    # East River
    m, n = make_box(40, 664, 0.3, 1077, 332, 0.15,
                    color=[40, 100, 180, 220], name="water_east_river")
    add_mesh(scene, m, n)

    # South River
    m, n = make_box(1097, 30, 0.3, 548.5, 15, 0.15,
                    color=[40, 100, 180, 220], name="water_south_river")
    add_mesh(scene, m, n)

    # Central Reflecting Pool
    m, n = make_cylinder(30, 0.3, 548, 332, 0.15,
                          color=[50, 120, 200, 200], sections=32,
                          name="water_reflecting_pool")
    add_mesh(scene, m, n)

    # Algae Ponds — 4 cylinders near (940, 200), spaced 35m apart
    algae_color = [40, 200, 80, 200]
    algae_base_x = 940
    algae_base_y = 200
    for i in range(4):
        px = algae_base_x + (i % 2) * 35
        py = algae_base_y + (i // 2) * 35
        m, _ = make_cylinder(15, 0.4, px, py, 0.2,
                              color=algae_color, sections=24,
                              name=f"water_algae_pond_{i}")
        add_mesh(scene, m, f"water_algae_pond_{i}")

    # Blue-Green Corridor (bioswale running E-W through center)
    m, n = make_box(1097, 12, 0.3, 548.5, 332, 0.1,
                    color=[60, 140, 100, 180], name="water_bioswale")
    add_mesh(scene, m, n)


# ---------------------------------------------------------------------------
# Solar arrays
# ---------------------------------------------------------------------------

def generate_solar(scene):
    """Solar field arrays at four corners + canopy parking areas."""
    panel_color = [30, 40, 80, 255]

    # Panel dimensions: 2m × 1m × 0.05m, tilted 20° around X axis
    tilt_angle = math.radians(20)
    tilt_matrix = trimesh.transformations.rotation_matrix(tilt_angle, [1, 0, 0])

    # Each solar field: 40 columns × 20 rows, 3m spacing
    fields = [
        ("solar_nw", 40,  650),
        ("solar_ne", 1060, 650),
        ("solar_se", 1060, 35),
        ("solar_sw", 40,  35),
    ]

    cols, rows = 40, 20
    spacing_x = 3.0
    spacing_y = 2.5
    field_width  = cols * spacing_x
    field_height = rows * spacing_y

    all_panels = []
    for field_name, fcx, fcy in fields:
        ox = fcx - field_width  / 2.0
        oy = fcy - field_height / 2.0
        for r in range(rows):
            for c in range(cols):
                px = ox + c * spacing_x + spacing_x / 2.0
                py = oy + r * spacing_y + spacing_y / 2.0
                panel = trimesh.creation.box(extents=[2.0, 1.0, 0.05])
                panel.apply_transform(tilt_matrix)
                panel.apply_translation([px, py, 0.5])
                all_panels.append(panel)

    if all_panels:
        combined = trimesh.util.concatenate(all_panels)
        apply_vertex_color(combined, panel_color)
        add_mesh(scene, combined, "solar_panels_all")

    # Solar canopy areas over parking near buildings 2, 6, 16
    canopy_color  = [50, 55, 70, 255]
    pole_color    = [80, 80, 85, 255]
    canopy_locs = [
        ("canopy_bldg2", 390, 510),
        ("canopy_bldg6", 190, 340),
        ("canopy_bldg16", 932, 110),
    ]
    for cname, cx, cy in canopy_locs:
        # Flat canopy roof
        m, _ = make_box(80, 30, 0.5, cx, cy, 8.0,
                         color=canopy_color, name=cname + "_roof")
        add_mesh(scene, m, cname + "_roof")
        # Support poles at corners
        for dx, dy in [(-35, -12), (35, -12), (-35, 12), (35, 12)]:
            pm, _ = make_cylinder(0.3, 8.0,
                                   cx + dx, cy + dy, 4.0,
                                   color=pole_color, sections=8,
                                   name=cname + f"_pole_{dx}_{dy}")
            add_mesh(scene, pm, cname + f"_pole_{dx}_{dy}")


# ---------------------------------------------------------------------------
# Wind turbines
# ---------------------------------------------------------------------------

def _build_turbine(scene, name, tx, ty):
    """Assemble a single wind turbine at (tx, ty)."""
    turbine_color = [220, 220, 225, 255]
    blade_color   = [230, 230, 235, 255]

    # Pole
    m, _ = make_cylinder(1.5, 50, tx, ty, 25.0,
                          color=turbine_color, sections=16,
                          name=name + "_pole")
    add_mesh(scene, m, name + "_pole")

    # Nacelle (box at top of pole)
    m, n = make_box(4, 2, 2, tx, ty, 51.0,
                    color=turbine_color, name=name + "_nacelle")
    add_mesh(scene, m, n)

    # 3 blades, 120° apart, extending from nacelle center
    blade_length = 20.0
    for i in range(3):
        angle = math.radians(i * 120)
        # Blade as a thin box along Y, rotated in XY plane
        blade = trimesh.creation.box(extents=[1.0, blade_length, 0.3])
        apply_vertex_color(blade, blade_color)
        # Offset so blade extends outward from center
        blade.apply_translation([0, blade_length / 2.0, 0])
        rot = trimesh.transformations.rotation_matrix(angle, [0, 0, 1])
        blade.apply_transform(rot)
        blade.apply_translation([tx, ty, 51.0])
        add_mesh(scene, blade, name + f"_blade_{i}")


def generate_wind_turbines(scene):
    """Place 4 wind turbines at campus corners."""
    positions = [
        ("turbine_nw",   80, 648),
        ("turbine_ne", 1017, 648),
        ("turbine_se", 1017,  16),
        ("turbine_sw",   80,  16),
    ]
    for name, tx, ty in positions:
        _build_turbine(scene, name, tx, ty)


# ---------------------------------------------------------------------------
# Hex grid boundary markers
# ---------------------------------------------------------------------------

def generate_hex_grid_markers(scene):
    """
    Draw approximate hex cell boundary lines as thin teal boxes.
    Hex cell centers on a grid every ~220m in X, ~190m in Y (offset rows).
    """
    marker_color = [80, 200, 160, 200]
    hex_r = 110.0   # hex 'radius' (center to vertex)
    hex_w = 0.3     # marker width
    hex_h = 0.3     # marker height

    # Hex centers: staggered grid
    centers = []
    col_spacing = 220
    row_spacing = 190
    for row in range(5):
        y = row * row_spacing + 95
        x_offset = 110 if (row % 2 == 1) else 0
        for col in range(6):
            x = col * col_spacing + 110 + x_offset
            if 0 <= x <= 1097 and 0 <= y <= 664:
                centers.append((x, y))

    # For each hex, generate 6 edge segments
    marker_meshes = []
    for hx, hy in centers:
        verts = []
        for i in range(6):
            a = math.radians(60 * i)
            verts.append((hx + hex_r * math.cos(a),
                           hy + hex_r * math.sin(a)))

        for i in range(6):
            ax, ay = verts[i]
            bx, by = verts[(i + 1) % 6]
            dx = bx - ax
            dy = by - ay
            seg_len = math.sqrt(dx * dx + dy * dy)
            if seg_len < 0.01:
                continue
            angle = math.atan2(dy, dx)
            cx = (ax + bx) / 2.0
            cy = (ay + by) / 2.0
            seg = trimesh.creation.box(extents=[seg_len, hex_w, hex_h])
            rot = trimesh.transformations.rotation_matrix(angle, [0, 0, 1])
            seg.apply_transform(rot)
            seg.apply_translation([cx, cy, hex_h / 2.0])
            marker_meshes.append(seg)

    if marker_meshes:
        combined = trimesh.util.concatenate(marker_meshes)
        apply_vertex_color(combined, marker_color)
        add_mesh(scene, combined, "hex_grid_markers")


# ---------------------------------------------------------------------------
# Landscape / trees
# ---------------------------------------------------------------------------

def _is_near_building(x, y, exclusion_radius=25.0):
    """Check if point (x,y) is within exclusion_radius of any building center."""
    r2 = exclusion_radius * exclusion_radius
    for bx, by, _, _ in BUILDING_POSITIONS.values():
        if (x - bx) ** 2 + (y - by) ** 2 < r2:
            return True
    return False


def _is_near_road(x, y, road_buffer=8.0):
    """Check if point (x,y) is within road_buffer of any road centerline."""
    for seg in ROADS:
        x1, y1, x2, y2, _ = seg
        dx = x2 - x1
        dy = y2 - y1
        seg_len2 = dx * dx + dy * dy
        if seg_len2 < 0.01:
            continue
        t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / seg_len2))
        px = x1 + t * dx
        py = y1 + t * dy
        dist2 = (x - px) ** 2 + (y - py) ** 2
        if dist2 < road_buffer * road_buffer:
            return True
    return False


def generate_landscape(scene):
    """
    Place tree sphere masses across the campus where there are no buildings
    or roads. Uses a 20m grid with random jitter, target 500-800 trees.
    """
    tree_color = [45, 110, 50, 255]
    tree_radius = 3.5
    tree_z = 3.5   # center height

    grid_spacing = 20.0
    jitter = 6.0   # ±jitter in placement

    rng = np.random.default_rng(42)

    xs = np.arange(grid_spacing, 1097 - grid_spacing, grid_spacing)
    ys = np.arange(grid_spacing, 664  - grid_spacing, grid_spacing)

    positions = []
    for gx in xs:
        for gy in ys:
            # Add jitter
            x = gx + rng.uniform(-jitter, jitter)
            y = gy + rng.uniform(-jitter, jitter)
            # Clamp to site
            x = float(np.clip(x, 5, 1092))
            y = float(np.clip(y, 5, 659))

            if _is_near_building(x, y, exclusion_radius=30.0):
                continue
            if _is_near_road(x, y, road_buffer=9.0):
                continue

            positions.append((x, y))

    # Cap at 800 trees for performance
    if len(positions) > 800:
        indices = rng.choice(len(positions), 800, replace=False)
        positions = [positions[i] for i in indices]

    print(f"    Placing {len(positions)} trees...")

    if not positions:
        return

    tree_meshes = []
    for tx, ty in positions:
        t = trimesh.creation.icosphere(radius=tree_radius, subdivisions=1)
        t.apply_translation([tx, ty, tree_z])
        tree_meshes.append(t)

    combined = trimesh.util.concatenate(tree_meshes)
    apply_vertex_color(combined, tree_color)
    add_mesh(scene, combined, "landscape_trees")


# ---------------------------------------------------------------------------
# Building loading and placement
# ---------------------------------------------------------------------------

def load_building(building_id):
    """
    Load a GLB from buildings dir.
    Returns a trimesh.Scene or trimesh.Trimesh, or None if not found.
    """
    path = BUILDINGS_DIR / f"{building_id}.glb"
    if path.exists():
        try:
            result = trimesh.load(str(path), force="scene")
            return result
        except Exception as e:
            print(f"    Warning: could not load {path.name}: {e}")
    return None


def place_building(scene, building_id, bx, by, bz, rotation_deg, fallback_data=None):
    """
    Place a building scene into the master scene.
    If the GLB exists, load and transform it.
    Otherwise create a colored box fallback.
    """
    loaded = load_building(building_id)
    if loaded is not None:
        # Loaded as a Scene; iterate geometry
        rot_rad = math.radians(rotation_deg)
        rot_matrix = trimesh.transformations.rotation_matrix(rot_rad, [0, 0, 1])
        translation = np.array([bx, by, bz])

        geom_list = []
        if isinstance(loaded, trimesh.Scene):
            for geom in loaded.geometry.values():
                g = geom.copy()
                g.apply_transform(rot_matrix)
                g.apply_translation(translation)
                geom_list.append(g)
        elif isinstance(loaded, trimesh.Trimesh):
            g = loaded.copy()
            g.apply_transform(rot_matrix)
            g.apply_translation(translation)
            geom_list.append(g)

        for i, g in enumerate(geom_list):
            add_mesh(scene, g, f"{building_id}_part_{i}")
        return True
    else:
        # Fallback: colored box
        if fallback_data:
            fp_m = fallback_data.get("footprint_m", [20, 20])
            h = fallback_data.get("height_m", 10.0)
            district = fallback_data.get("district_id", "")
            color = DISTRICT_COLORS.get(district, [80, 80, 80, 255])
            w, d = float(fp_m[0]), float(fp_m[1])
        else:
            w, d, h = 40.0, 30.0, 12.0
            color = [80, 80, 90, 255]

        rot_rad = math.radians(rotation_deg)
        m = trimesh.creation.box(extents=[w, d, h])
        apply_vertex_color(m, color)
        rot_matrix = trimesh.transformations.rotation_matrix(rot_rad, [0, 0, 1])
        m.apply_transform(rot_matrix)
        m.apply_translation([bx, by, bz + h / 2.0])
        add_mesh(scene, m, f"{building_id}_fallback")
        return False


# ---------------------------------------------------------------------------
# Main assembly
# ---------------------------------------------------------------------------

def main():
    scene = trimesh.Scene()
    print("Building master Collective AI campus scene...")

    print("  Generating terrain...")
    generate_terrain(scene)
    print("  ✓ Terrain")

    print("  Generating roads...")
    generate_roads(scene)
    print("  ✓ Roads")

    print("  Generating water features...")
    generate_water(scene)
    print("  ✓ Water features")

    print("  Generating solar arrays...")
    generate_solar(scene)
    print("  ✓ Solar arrays")

    print("  Generating wind turbines...")
    generate_wind_turbines(scene)
    print("  ✓ Wind turbines")

    print("  Generating hex grid markers...")
    generate_hex_grid_markers(scene)
    print("  ✓ Hex grid markers")

    print("  Generating landscape/trees...")
    generate_landscape(scene)
    print("  ✓ Landscape / trees")

    # Load and place buildings
    print("  Loading and placing buildings...")
    with open(DATA) as f:
        raw = json.load(f)
    facilities = raw["facilities"]

    # Build a lookup by ID
    facility_map = {fac["id"]: fac for fac in facilities}

    placed_real = 0
    placed_fallback = 0

    for bld_id, (bx, by, bz, rot_deg) in BUILDING_POSITIONS.items():
        fac_data = facility_map.get(bld_id)
        success = place_building(
            scene, bld_id, bx, by, bz, rot_deg,
            fallback_data=fac_data
        )
        if success:
            placed_real += 1
        else:
            placed_fallback += 1

    total = placed_real + placed_fallback
    print(f"  ✓ {total}/30 buildings placed "
          f"({placed_real} from GLB, {placed_fallback} as fallback boxes)")

    # Export
    out_path = OUT_DIR / "collective-ai-mega-campus.glb"
    print(f"\nExporting campus GLB to {out_path} ...")
    scene.export(str(out_path))
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"  ✓ Master campus exported → {out_path}")
    print(f"  File size: {size_mb:.1f} MB")
    print("\nDone. Load collective-ai-mega-campus.glb in any GLB viewer.")


if __name__ == "__main__":
    main()
