#!/usr/bin/env python3
"""
Blender Python script — Collective AI Mega Campus, Buildings 25-30.
Generates detailed 3D GLB models using Blender's bpy API.

Run headless:
    blender --background --python blender_buildings_25_30.py

Each building is exported to:
    /home/user/Collective-AI-Inc-Mega-Campus-/assets/glb/buildings/{id}.glb

Coordinate convention:
    - 1 Blender unit = 1 metre
    - Building footprint centred at world origin (0, 0, 0) in X-Y
    - Base sits at Z = 0
"""

import bpy
import math
import os
from mathutils import Vector, Matrix, Euler

# ---------------------------------------------------------------------------
# Output directory
# ---------------------------------------------------------------------------
OUT_DIR = "/home/user/Collective-AI-Inc-Mega-Campus-/assets/glb/buildings"
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Scene utilities
# ---------------------------------------------------------------------------

def clear_scene():
    """Delete all objects, materials, and data blocks from the scene."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for curve in list(bpy.data.curves):
        bpy.data.curves.remove(curve, do_unlink=True)


def make_material(name, base_color, metallic=0.0, roughness=0.5,
                  emission_color=None, emission_strength=0.0, alpha=1.0):
    """Create a PBR material with optional emission."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    bsdf.inputs['Base Color'].default_value = (*base_color, alpha)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        bsdf.inputs['Alpha'].default_value = alpha

    if emission_color and emission_strength > 0:
        bsdf.inputs['Emission Color'].default_value = (*emission_color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength

    output = nodes.new(type='ShaderNodeOutputMaterial')
    output.location = (300, 0)
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat


def add_box(name, w, d, h, mat, location=(0, 0, 0), rotation=(0, 0, 0)):
    """Add a box mesh centred in X-Y with base at Z=location[2]."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, d, h)
    obj.location = (location[0], location[1], location[2] + h / 2)
    if any(r != 0 for r in rotation):
        obj.rotation_euler = Euler(rotation)
    if mat:
        if len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
        else:
            obj.data.materials[0] = mat
    bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)
    return obj


def add_cylinder(name, radius, depth, mat, location=(0, 0, 0), vertices=24):
    """Add a cylinder with base at Z=location[2]."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth,
                                         vertices=vertices)
    obj = bpy.context.active_object
    obj.name = name
    obj.location = (location[0], location[1], location[2] + depth / 2)
    if mat:
        if len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
        else:
            obj.data.materials[0] = mat
    bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)
    return obj


def add_cone(name, radius1, radius2, depth, mat, location=(0, 0, 0), vertices=24):
    """Add a cone/truncated cone."""
    bpy.ops.mesh.primitive_cone_add(
        radius1=radius1, radius2=radius2, depth=depth, vertices=vertices)
    obj = bpy.context.active_object
    obj.name = name
    obj.location = (location[0], location[1], location[2] + depth / 2)
    if mat:
        if len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
        else:
            obj.data.materials[0] = mat
    bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)
    return obj


def export_glb(filename):
    """Export the entire scene to a GLB file."""
    filepath = os.path.join(OUT_DIR, filename)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_materials='EXPORT',
        export_normals=True,
        export_colors=True,
        export_cameras=False,
        export_lights=False,
    )
    print(f"  Exported: {filepath}")


# ===========================================================================
# BUILDING 25 — Gaia Synthesis Bio-Energy Center
# 79.2m x 61m x 10m, 2 floors, LIFE_SCIENCE
# Green glass/metal, luminescent algae ponds, biogas cylindrical element
# ===========================================================================

def build_25_gaia_bio_energy():
    print("\n=== Building 25: Gaia Synthesis Bio-Energy Center ===")
    clear_scene()

    W, D, H = 79.2, 61.0, 10.0

    # Materials
    mat_facade    = make_material("bio_facade",    (0.15, 0.42, 0.22), metallic=0.3, roughness=0.45)
    mat_glass     = make_material("bio_glass",     (0.10, 0.55, 0.25), metallic=0.0, roughness=0.05, alpha=0.45)
    mat_algae     = make_material("algae_pond",    (0.05, 0.85, 0.15), metallic=0.0, roughness=0.15,
                                   emission_color=(0.1, 1.0, 0.2), emission_strength=4.0)
    mat_biogas    = make_material("biogas_tank",   (0.35, 0.35, 0.38), metallic=0.6, roughness=0.35)
    mat_concrete  = make_material("bio_concrete",  (0.30, 0.34, 0.30), metallic=0.0, roughness=0.85)
    mat_metal     = make_material("bio_metal",     (0.22, 0.28, 0.22), metallic=0.7, roughness=0.40)
    mat_water     = make_material("water_polish",  (0.05, 0.35, 0.60), metallic=0.0, roughness=0.05, alpha=0.65)
    mat_pipe      = make_material("bio_pipe",      (0.55, 0.55, 0.50), metallic=0.85, roughness=0.25)

    # Main building body (2 floors)
    add_box("bio_body", W, D, H, mat_facade, location=(0, 0, 0))

    # Green-tinted glazed strip across south facade (floor-to-ceiling per floor)
    for floor in range(2):
        z = floor * 5.0
        add_box(f"bio_glaze_s_{floor}", W * 0.85, 0.3, 3.8, mat_glass,
                location=(0, -D/2, z + 0.6))

    # Algae cultivation ponds — roof-level (luminescent green)
    pond_configs = [
        (-20, -12, W*0.3, D*0.3),
        ( 18, -12, W*0.28, D*0.3),
        (-20,  14, W*0.3, D*0.28),
        ( 18,  14, W*0.28, D*0.28),
    ]
    for i, (px, py, pw, pd) in enumerate(pond_configs):
        # Pond base (shallow depression)
        add_box(f"algae_pond_rim_{i}", pw + 1.5, pd + 1.5, 0.4, mat_concrete,
                location=(px, py, H))
        add_box(f"algae_pond_water_{i}", pw, pd, 0.3, mat_algae,
                location=(px, py, H + 0.05))
        # Algae glow emitter disk
        add_cylinder(f"algae_glow_{i}", min(pw, pd) * 0.35, 0.15, mat_algae,
                     location=(px, py, H + 0.38))

    # Biogas plant — cylindrical element (west side)
    biogas_x = -W/2 - 6
    add_cylinder("biogas_tank_main", 5.5, 12.0, mat_biogas,
                 location=(biogas_x, 0, 0))
    add_cylinder("biogas_dome", 5.5, 3.0, mat_biogas,
                 location=(biogas_x, 0, 12.0))  # dome cap
    add_cylinder("biogas_tank_2", 3.5, 9.0, mat_biogas,
                 location=(biogas_x, 12, 0))

    # Biogas flare stack
    add_cylinder("biogas_flare", 0.3, 8.0, mat_pipe, location=(biogas_x - 7, 0, 0))
    mat_flare = make_material("flare_tip", (1.0, 0.6, 0.1), emission_color=(1.0, 0.5, 0.0), emission_strength=8.0)
    add_cylinder("flare_flame", 0.5, 1.0, mat_flare, location=(biogas_x - 7, 0, 8.0))

    # Water polishing ponds — north side (outdoor)
    for i in range(3):
        px2 = -W/4 + i * W/4
        add_box(f"water_polish_rim_{i}", 12, 8, 0.5, mat_concrete,
                location=(px2, D/2 + 7, 0))
        add_box(f"water_polish_water_{i}", 10.5, 6.5, 0.3, mat_water,
                location=(px2, D/2 + 7, 0.11))

    # Circular water infrastructure pipeline ring
    pipe_r = min(W, D) * 0.38
    segments = 16
    for s in range(segments):
        a0 = (s / segments) * 2 * math.pi
        a1 = ((s + 0.8) / segments) * 2 * math.pi
        mx = pipe_r * math.cos((a0 + a1) / 2)
        my = pipe_r * math.sin((a0 + a1) / 2)
        length = pipe_r * 2 * math.pi / segments * 0.85
        rot_z = (a0 + a1) / 2 + math.pi / 2
        bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=length, vertices=8)
        pipe = bpy.context.active_object
        pipe.name = f"water_pipe_{s}"
        pipe.location = (mx, my, 0.4)
        pipe.rotation_euler = (math.pi / 2, 0, rot_z)
        pipe.data.materials.append(mat_pipe)
        bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)

    # Roof parapet / edge beam
    add_box("bio_parapet_n", W, 1.0, 1.0, mat_metal, location=(0,  D/2 - 0.5, H))
    add_box("bio_parapet_s", W, 1.0, 1.0, mat_metal, location=(0, -D/2 + 0.5, H))
    add_box("bio_parapet_e", 1.0, D, 1.0, mat_metal, location=(W/2 - 0.5, 0, H))
    add_box("bio_parapet_w", 1.0, D, 1.0, mat_metal, location=(-W/2 + 0.5, 0, H))

    # Floor slab lines (expressed on facade)
    for floor in range(1, 2):
        z_slab = floor * 5.0
        add_box(f"bio_slab_line_{floor}", W + 0.2, D + 0.2, 0.4, mat_metal,
                location=(0, 0, z_slab))

    export_glb("gaia_synthesis_bio_energy_center.glb")
    print("  Building 25 complete.")


# ===========================================================================
# BUILDING 26 — Central Utility Plant
# 67.1m x 45.7m x 12m, 2 floors, DATA_BUNKER
# Utilitarian grey metal, large cooling towers, substation yard
# ===========================================================================

def build_26_central_utility():
    print("\n=== Building 26: Central Utility Plant ===")
    clear_scene()

    W, D, H = 67.1, 45.7, 12.0

    # Materials
    mat_grey      = make_material("util_metal",    (0.30, 0.31, 0.32), metallic=0.55, roughness=0.60)
    mat_dark      = make_material("util_dark",     (0.15, 0.16, 0.17), metallic=0.3,  roughness=0.80)
    mat_tower     = make_material("util_tower",    (0.85, 0.87, 0.88), metallic=0.1,  roughness=0.75)
    mat_steam     = make_material("util_steam",    (0.92, 0.94, 0.96), metallic=0.0,  roughness=0.95, alpha=0.35)
    mat_sub       = make_material("util_sub",      (0.20, 0.22, 0.24), metallic=0.7,  roughness=0.40)
    mat_batt      = make_material("util_battery",  (0.08, 0.10, 0.14), metallic=0.5,  roughness=0.55)
    mat_pipe      = make_material("util_pipe",     (0.50, 0.50, 0.50), metallic=0.8,  roughness=0.30)
    mat_orange    = make_material("util_warning",  (0.85, 0.40, 0.02), metallic=0.0,  roughness=0.9)

    # Main building body
    add_box("util_body", W, D, H, mat_grey, location=(0, 0, 0))

    # Horizontal panel rhythm (facade stripes)
    for i in range(3):
        z = i * 4.0 + 0.1
        add_box(f"util_panel_e_{i}", 0.3, D + 0.1, 0.25, mat_dark, location=(W/2, 0, z))
        add_box(f"util_panel_w_{i}", 0.3, D + 0.1, 0.25, mat_dark, location=(-W/2, 0, z))

    # Minimal punched windows (small, gridded)
    window_mat = make_material("util_window", (0.1, 0.15, 0.2), metallic=0, roughness=0.05)
    for row in range(2):
        for col in range(8):
            wx = -W/2 + 6 + col * 8
            wz = 2.0 + row * 5.0
            add_box(f"util_win_s_{row}_{col}", 3.5, 0.15, 2.0, window_mat,
                    location=(wx, -D/2, wz))

    # === COOLING TOWERS — north end (4 large towers) ===
    tower_x_positions = [-W/2 + 8, -W/2 + 24, W/2 - 24, W/2 - 8]
    for i, tx in enumerate(tower_x_positions):
        ty = D/2 + 8
        tr, td = 5.5, 18.0
        # Tower body (hyperboloid approximation via truncated cone)
        add_cone(f"ct_base_{i}", tr, tr * 0.72, td * 0.6, mat_tower,
                 location=(tx, ty, 0))
        add_cone(f"ct_throat_{i}", tr * 0.72, tr * 0.82, td * 0.25, mat_tower,
                 location=(tx, ty, td * 0.6))
        add_cone(f"ct_top_{i}", tr * 0.82, tr * 0.60, td * 0.15, mat_tower,
                 location=(tx, ty, td * 0.85))
        # Steam plume (semi-transparent disk above)
        add_cylinder(f"ct_steam_{i}", tr * 1.1, 2.5, mat_steam,
                     location=(tx, ty, td + 1))

    # === Substation yard — east ===
    sub_x = W/2 + 15
    # Transformer bays
    for i in range(3):
        ty2 = -8 + i * 8
        add_box(f"transformer_{i}", 4.5, 4.5, 4.0, mat_sub, location=(sub_x, ty2, 0))
        add_box(f"trans_top_{i}", 4.0, 4.0, 0.6, mat_dark, location=(sub_x, ty2, 4.0))
        # Transformer fins
        for fin in range(5):
            add_box(f"trans_fin_{i}_{fin}", 0.1, 4.0, 2.5, mat_pipe,
                    location=(sub_x - 2 + fin, ty2, 0.5))
    # HV bus lines
    for h_line in range(3):
        add_box(f"hv_bus_{h_line}", 0.08, 20, 0.08, mat_pipe,
                location=(sub_x, 0, 6 + h_line * 0.5))
    # Substation fence
    add_box("sub_fence_s", 30, 0.2, 3.0, mat_dark, location=(sub_x, -12, 0))
    add_box("sub_fence_n", 30, 0.2, 3.0, mat_dark, location=(sub_x, +12, 0))

    # === Battery storage yard — west ===
    batt_x = -W/2 - 18
    for row in range(3):
        for col in range(4):
            bx = batt_x + col * 5 - 7.5
            by = -8 + row * 7
            add_box(f"batt_{row}_{col}", 4.0, 2.0, 2.5, mat_batt, location=(bx, by, 0))

    # Rooftop HVAC clusters
    hvac_positions = [(-15, -10), (0, 10), (15, -8), (-5, 5)]
    for i, (hx, hy) in enumerate(hvac_positions):
        add_box(f"hvac_{i}", 6, 4, 3, mat_dark, location=(hx, hy, H))
        # Fan disk on top
        add_cylinder(f"hvac_fan_{i}", 1.8, 0.4, mat_grey, location=(hx, hy, H + 3.0))

    # Perimeter warning stripe
    add_box("warn_stripe_s", W + 2, 1.0, 0.1, mat_orange, location=(0, -D/2 - 0.5, 0.05))

    export_glb("central_utility_plant.glb")
    print("  Building 26 complete.")


# ===========================================================================
# BUILDING 27 — Emergency Operations Center
# 61m x 36.6m x 8m, 2 floors, SECURITY
# Dark hardened concrete, thick walls, emergency generator yard, red roof lights
# ===========================================================================

def build_27_emergency_ops():
    print("\n=== Building 27: Emergency Operations Center ===")
    clear_scene()

    W, D, H = 61.0, 36.6, 8.0

    # Materials
    mat_concrete  = make_material("eoc_concrete",  (0.22, 0.22, 0.22), metallic=0.0, roughness=0.92)
    mat_dark_con  = make_material("eoc_dark",      (0.12, 0.12, 0.14), metallic=0.0, roughness=0.95)
    mat_metal     = make_material("eoc_metal",     (0.28, 0.30, 0.30), metallic=0.65, roughness=0.50)
    mat_red_light = make_material("eoc_red_emis",  (0.8, 0.05, 0.05),  metallic=0.0, roughness=0.2,
                                   emission_color=(1.0, 0.0, 0.0), emission_strength=8.0)
    mat_amber     = make_material("eoc_amber",     (0.9, 0.5, 0.0),    metallic=0.0, roughness=0.2,
                                   emission_color=(1.0, 0.6, 0.0), emission_strength=5.0)
    mat_generator = make_material("eoc_generator", (0.25, 0.28, 0.25), metallic=0.6, roughness=0.45)
    mat_antenna   = make_material("eoc_antenna",   (0.55, 0.55, 0.55), metallic=0.9, roughness=0.20)
    mat_berm      = make_material("eoc_berm",      (0.18, 0.22, 0.18), metallic=0.0, roughness=1.0)

    # Main building — thick-walled (blast-resistant reveal expressed as wider base)
    # Outer wall step (blast shell 1.5m thick at base)
    add_box("eoc_blast_shell", W + 3.0, D + 3.0, H * 0.4, mat_dark_con, location=(0, 0, 0))
    # Inner body (setback from blast shell)
    add_box("eoc_body",        W,       D,       H,       mat_concrete,  location=(0, 0, 0))

    # Thick wall reveals on each face (deep punched openings, minimal)
    # Minimal windows — only 4 per long facade, very small
    window_mat = make_material("eoc_win", (0.08, 0.12, 0.15), metallic=0, roughness=0.05)
    for col in range(4):
        wx = -W/2 + 10 + col * 13
        add_box(f"eoc_win_s_{col}", 1.8, 0.15, 1.2, window_mat, location=(wx, -D/2, 3.5))
        add_box(f"eoc_win_n_{col}", 1.8, 0.15, 1.2, window_mat, location=(wx,  D/2, 3.5))
        # Deep reveal sill
        add_box(f"eoc_sill_s_{col}", 2.4, 0.6, 1.8, mat_dark_con, location=(wx, -D/2 + 0.1, 3.4))

    # Single controlled entry — south centre (hardened vestibule)
    add_box("eoc_vestibule", 6.0, 4.5, H, mat_dark_con, location=(0, -D/2 - 2.0, 0))
    add_box("eoc_blast_door", 3.0, 0.4, 3.0, mat_metal, location=(0, -D/2 - 4.0, 0))

    # Security berm — earth berm around perimeter
    for bx, by, bw, bd, bh in [
        (0,  D/2 + 5, W + 20, 6, 3.0),   # north
        (0, -D/2 - 5, W + 20, 6, 3.0),   # south
        ( W/2 + 5, 0, 6, D,   3.0),       # east
        (-W/2 - 5, 0, 6, D,   3.0),       # west
    ]:
        add_box(f"berm_{bx}_{by}", bw, bd, bh, mat_berm, location=(bx, by, 0))

    # === Emergency generator yard — rear (north) ===
    gen_y = D/2 + 15
    for i in range(3):
        gx = -16 + i * 16
        add_box(f"generator_{i}", 5.0, 4.0, 3.5, mat_generator, location=(gx, gen_y, 0))
        # Generator exhaust stack
        add_cylinder(f"gen_stack_{i}", 0.35, 5.0, mat_antenna, location=(gx + 2, gen_y, 3.5))
    # Generator yard fence
    add_box("gen_fence_s", 50, 0.2, 2.5, mat_metal, location=(0, gen_y - 8, 0))
    add_box("gen_fence_n", 50, 0.2, 2.5, mat_metal, location=(0, gen_y + 8, 0))

    # === Secure communications antennae on roof ===
    # Main comms mast (lattice approx — thin cylinder)
    add_cylinder("eoc_mast_main", 0.25, 10.0, mat_antenna, location=(0, 0, H))
    # Cross arms
    for arm_h in [3.0, 6.0, 9.0]:
        add_box(f"mast_arm_h_{arm_h}", 4.0, 0.1, 0.1, mat_antenna, location=(0, 0, H + arm_h))
        add_box(f"mast_arm_v_{arm_h}", 0.1, 4.0, 0.1, mat_antenna, location=(0, 0, H + arm_h))

    # Satellite dish
    add_cylinder("eoc_dish_back", 2.2, 0.3, mat_metal, location=(W/4, 0, H + 0.2))
    add_cone("eoc_dish_face", 2.0, 0.1, 1.2, mat_antenna,
             location=(W/4, 0, H + 0.5))

    # === Red emergency lights on roof ===
    red_positions = [
        (-W/4, -D/4), (W/4, -D/4), (-W/4, D/4), (W/4, D/4),
        (-W/2 + 2, 0), (W/2 - 2, 0), (0, -D/2 + 2), (0, D/2 - 2),
    ]
    for i, (rx, ry) in enumerate(red_positions):
        add_cylinder(f"red_light_{i}", 0.35, 0.5, mat_red_light, location=(rx, ry, H + 0.3))
        add_cylinder(f"red_lens_{i}", 0.5, 0.12, mat_red_light, location=(rx, ry, H + 0.55))

    # Amber perimeter lights (lower)
    for i, (ax, ay) in enumerate([(-W/2, D/4), (-W/2, -D/4), (W/2, D/4), (W/2, -D/4)]):
        add_cylinder(f"amber_light_{i}", 0.25, 0.4, mat_amber, location=(ax, ay, H * 0.7))

    # Roof equipment box
    add_box("eoc_roof_equip", 12, 6, 2.0, mat_dark_con, location=(0, 0, H))

    export_glb("emergency_operations_center.glb")
    print("  Building 27 complete.")


# ===========================================================================
# BUILDING 28 — Construction Innovation Yard
# 121.9m x 76.2m x 9m, 1 floor, INDUSTRIAL
# Open steel canopy, crane rail, enclosed shed at east, concrete pad
# ===========================================================================

def build_28_construction_yard():
    print("\n=== Building 28: Construction Innovation Yard ===")
    clear_scene()

    W, D, H = 121.9, 76.2, 9.0

    # Materials
    mat_steel     = make_material("cy_steel",      (0.42, 0.43, 0.44), metallic=0.85, roughness=0.35)
    mat_concrete  = make_material("cy_concrete",   (0.38, 0.36, 0.34), metallic=0.0,  roughness=0.95)
    mat_orange    = make_material("cy_orange",     (0.85, 0.35, 0.02), metallic=0.6,  roughness=0.45)
    mat_shed      = make_material("cy_shed",       (0.35, 0.36, 0.37), metallic=0.5,  roughness=0.60)
    mat_stockpile = make_material("cy_stockpile",  (0.40, 0.38, 0.30), metallic=0.0,  roughness=1.00)
    mat_yellow    = make_material("cy_yellow",     (0.9, 0.75, 0.02),  metallic=0.3,  roughness=0.60)
    mat_rail      = make_material("cy_rail",       (0.55, 0.55, 0.52), metallic=0.90, roughness=0.25)

    # === Concrete pad (entire footprint) ===
    add_box("cy_pad", W, D, 0.3, mat_concrete, location=(0, 0, -0.3))

    # === Steel canopy structure ===
    # Roof deck (open steel frame approximated as thin slab with cutouts via shell)
    # Use thin shell approach: roof perimeter beams + internal purlins
    roof_z = H

    # Main portal frames (11 bents across the width)
    n_bents = 11
    for i in range(n_bents):
        bx = -W/2 + i * (W / (n_bents - 1))
        # Left column
        add_cylinder(f"col_l_{i}", 0.25, H, mat_steel, location=(bx, -D/2 + 1, 0))
        # Right column
        add_cylinder(f"col_r_{i}", 0.25, H, mat_steel, location=(bx,  D/2 - 1, 0))
        # Roof beam (horizontal)
        add_box(f"rafter_{i}", 0.2, D, 0.35, mat_steel, location=(bx, 0, roof_z))

    # Longitudinal purlins
    for j in range(7):
        py = -D/2 + 1 + j * D / 6
        add_box(f"purlin_{j}", W, 0.2, 0.25, mat_steel, location=(0, py, roof_z - 0.1))

    # Perimeter eave beam
    add_box("eave_n", W, 0.4, 0.6, mat_steel, location=(0,  D/2 - 0.5, roof_z))
    add_box("eave_s", W, 0.4, 0.6, mat_steel, location=(0, -D/2 + 0.5, roof_z))
    add_box("eave_e", 0.4, D, 0.6, mat_steel, location=( W/2 - 0.5, 0, roof_z))
    add_box("eave_w", 0.4, D, 0.6, mat_steel, location=(-W/2 + 0.5, 0, roof_z))

    # === Enclosed fabrication shed — east end ===
    shed_x = W/2 - 25
    add_box("fab_shed", 50, D, H, mat_shed, location=(shed_x, 0, 0))
    # Shed roll-up doors (expressed as darker rectangles)
    door_mat = make_material("cy_door", (0.20, 0.21, 0.22), metallic=0.5, roughness=0.7)
    for di in range(3):
        dy = -D/4 + di * D/4
        add_box(f"shed_door_{di}", 8.0, 0.25, 6.0, door_mat,
                location=(shed_x - 25, dy, 0))
    # Shed clerestory
    mat_glass = make_material("cy_glass", (0.5, 0.6, 0.7), metallic=0, roughness=0.05, alpha=0.4)
    add_box("shed_clerestory", 50, 0.15, 2.0, mat_glass, location=(shed_x, D/2, H - 1.0))

    # === Overhead crane rail ===
    # Rail runs full length (X direction) at mid-span, at ~H-0.5m
    crane_y = 0
    add_box("crane_rail_beam", W, 1.0, 0.6, mat_rail, location=(0, crane_y, H - 0.4))
    add_box("crane_rail_top",  W, 0.3, 0.15, mat_rail, location=(0, crane_y, H + 0.05))

    # Crane trolley
    add_box("crane_trolley", 4.0, 1.2, 1.8, mat_orange, location=(-W/4, crane_y, H - 0.3))
    add_box("crane_hoist",   1.2, 1.2, 3.0, mat_orange, location=(-W/4, crane_y, H - 4.0))
    # Hook cable (thin box)
    add_box("crane_cable", 0.08, 0.08, 3.0, mat_steel, location=(-W/4, crane_y, H - 2.5))

    # === Material stockpiles — open yard area (west) ===
    pile_configs = [
        (-W/4, -D/4, 8, 6, 2.5),
        (-W/4 - 12, D/5, 10, 7, 3.0),
        (-W/3,  D/4, 6,  5, 2.0),
    ]
    for i, (px, py, pw, pd, ph) in enumerate(pile_configs):
        # Mounded pile (truncated cone approximation)
        add_cone(f"stockpile_{i}", min(pw, pd) / 2, 0.5, ph, mat_stockpile,
                 location=(px, py, 0))

    # Construction equipment silhouettes
    # Forklift
    add_box("forklift_body", 2.5, 4.0, 2.5, mat_yellow, location=(-W/3, 0, 0))
    add_box("forklift_forks", 0.15, 3.5, 0.2, mat_steel, location=(-W/3 + 1.0, 1.5, 1.5))
    add_box("forklift_mast", 0.3, 0.3, 4.0, mat_steel, location=(-W/3 + 0.8, 0, 0))

    # Safety stripes on pad
    for i in range(6):
        sx = -W/2 + 10 + i * 18
        add_box(f"stripe_{i}", 0.3, D, 0.05, mat_yellow, location=(sx, 0, 0.31))

    export_glb("construction_innovation_yard.glb")
    print("  Building 28 complete.")


# ===========================================================================
# BUILDING 29 — Visitor Experience Center
# 67.1m x 36.6m x 10m, 2 floors, CIVIC_CULTURAL
# Dramatic sweeping entry canopy, full glazed facade, welcome plaza
# ===========================================================================

def build_29_visitor_experience():
    print("\n=== Building 29: Visitor and Experience Center ===")
    clear_scene()

    W, D, H = 67.1, 36.6, 10.0

    # Materials
    mat_glass     = make_material("vec_glass",     (0.55, 0.68, 0.80), metallic=0.05, roughness=0.04, alpha=0.5,
                                   emission_color=(0.9, 0.95, 1.0), emission_strength=1.5)
    mat_steel     = make_material("vec_steel",     (0.55, 0.57, 0.60), metallic=0.85, roughness=0.25)
    mat_white     = make_material("vec_white",     (0.90, 0.92, 0.94), metallic=0.05, roughness=0.30)
    mat_canopy    = make_material("vec_canopy",    (0.85, 0.88, 0.90), metallic=0.6,  roughness=0.20)
    mat_plaza     = make_material("vec_plaza",     (0.62, 0.60, 0.58), metallic=0.0,  roughness=0.90)
    mat_accent    = make_material("vec_accent",    (0.02, 0.75, 0.95), metallic=0.1,  roughness=0.3,
                                   emission_color=(0.0, 0.8, 1.0), emission_strength=3.0)
    mat_frame     = make_material("vec_frame",     (0.25, 0.27, 0.30), metallic=0.9,  roughness=0.15)

    # Main glazed box (full-height curtain wall effect)
    add_box("vec_body", W, D, H, mat_glass, location=(0, 0, 0))

    # Structural grid on facade (mullions — thin steel strips)
    # South facade mullions
    n_mullions = 16
    for i in range(n_mullions + 1):
        mx = -W/2 + i * W / n_mullions
        add_box(f"mullion_s_{i}", 0.25, 0.3, H + 0.5, mat_frame,
                location=(mx, -D/2, 0))
    # Horizontal spandrel bands
    for floor in range(3):
        zf = floor * (H / 2)
        add_box(f"spandrel_s_{floor}", W, 0.2, 0.4, mat_frame,
                location=(0, -D/2, zf))

    # === Dramatic sweeping entry canopy — extends 15m south ===
    canopy_depth = 15.0
    canopy_w     = W * 0.7  # 70% of building width

    # Main canopy slab (curved top-surface suggested by segmented planar panels)
    canopy_segments = 8
    for i in range(canopy_segments):
        t = i / (canopy_segments - 1)
        # Arc: canopy rises from y=-D/2-canopy_depth to y=-D/2
        cy_base = -D/2 - canopy_depth + t * canopy_depth
        cy_next = -D/2 - canopy_depth + (t + 1/canopy_segments) * canopy_depth
        # Height varies: start at 3.5m at outer tip, rise to 8.5m at building
        cz = 3.5 + t * 5.0
        seg_depth = canopy_depth / canopy_segments + 0.1
        add_box(f"canopy_seg_{i}", canopy_w, seg_depth, 0.35, mat_canopy,
                location=(0, cy_base + seg_depth / 2, cz))

    # Canopy support columns (slender, angled outward slightly)
    col_positions_x = [-canopy_w/2 + 3, -canopy_w/4, 0, canopy_w/4, canopy_w/2 - 3]
    for i, cx in enumerate(col_positions_x):
        col_z = 3.5 + (i % 3) * 0.3  # vary tip height
        col_h = col_z
        add_cylinder(f"canopy_col_{i}", 0.3, col_h, mat_steel,
                     location=(cx, -D/2 - canopy_depth + 2, 0))

    # Canopy edge beam (angled leading edge)
    add_box("canopy_edge", canopy_w, 0.5, 0.5, mat_steel,
            location=(0, -D/2 - canopy_depth, 3.5))

    # Canopy LED soffit strip
    add_box("canopy_led", canopy_w - 1, canopy_depth - 1, 0.08, mat_accent,
            location=(0, -D/2 - canopy_depth/2, 3.42))

    # === Welcome plaza ===
    plaza_depth = 20.0
    add_box("plaza_slab", W + 10, plaza_depth, 0.25, mat_plaza,
            location=(0, -D/2 - canopy_depth - plaza_depth/2, -0.2))

    # Plaza paving pattern (lighter strips)
    plaza_mat2 = make_material("plaza_strip", (0.75, 0.73, 0.70), metallic=0.0, roughness=0.85)
    for i in range(8):
        px = -W/2 + i * W/7 + W/14
        add_box(f"plaza_stripe_{i}", 0.6, plaza_depth - 1, 0.26, plaza_mat2,
                location=(px, -D/2 - canopy_depth - plaza_depth/2, -0.12))

    # Wayfinding totems
    totem_mat = make_material("totem", (0.15, 0.17, 0.20), metallic=0.7, roughness=0.3,
                               emission_color=(0.0, 0.8, 1.0), emission_strength=2.0)
    for i in range(4):
        tx = -W/3 + i * W/4.5
        add_cylinder(f"totem_{i}", 0.35, 4.5, totem_mat,
                     location=(tx, -D/2 - canopy_depth - plaza_depth + 3, 0))
        add_box(f"totem_screen_{i}", 0.9, 0.15, 2.5, mat_accent,
                location=(tx, -D/2 - canopy_depth - plaza_depth + 3, 1.0))

    # === North facade — solid back ===
    add_box("vec_back", W, 0.6, H, mat_white, location=(0, D/2, 0))

    # Floor slab expression
    for fl in range(2):
        z_fl = fl * 5.0
        add_box(f"vec_floor_{fl}", W + 0.2, D, 0.35, mat_frame,
                location=(0, 0, z_fl))

    # Roof parapet and glass fin crown
    add_box("vec_parapet", W + 0.5, D + 0.5, 0.8, mat_white, location=(0, 0, H))
    # Glass fins at top (vertical feature)
    for i in range(12):
        fx = -W/2 + 3 + i * (W / 11)
        add_box(f"vec_fin_{i}", 0.2, 0.5, 2.5, mat_glass, location=(fx, -D/2, H))

    export_glb("visitor_experience_center.glb")
    print("  Building 29 complete.")


# ===========================================================================
# BUILDING 30 — Grand Conference Hotel
# 128m x 48.8m x 16m, 4 floors, MIXED_USE
# Grand porte-cochere, conference wing, hotel tower above, rooftop pool
# ===========================================================================

def build_30_grand_hotel():
    print("\n=== Building 30: Grand Conference Hotel ===")
    clear_scene()

    W, D, H = 128.0, 48.8, 16.0

    # Materials
    mat_facade    = make_material("hotel_facade",  (0.60, 0.62, 0.65), metallic=0.3, roughness=0.30)
    mat_glass     = make_material("hotel_glass",   (0.45, 0.55, 0.65), metallic=0.1, roughness=0.04, alpha=0.55,
                                   emission_color=(0.8, 0.75, 0.55), emission_strength=1.5)
    mat_lobby     = make_material("hotel_lobby",   (0.92, 0.82, 0.60), metallic=0.1, roughness=0.15,
                                   emission_color=(1.0, 0.9, 0.6),  emission_strength=2.5)
    mat_pool      = make_material("hotel_pool",    (0.0,  0.45, 0.85), metallic=0.0, roughness=0.05, alpha=0.75,
                                   emission_color=(0.0, 0.6, 1.0),  emission_strength=1.8)
    mat_porte     = make_material("hotel_porte",   (0.65, 0.65, 0.65), metallic=0.7, roughness=0.20)
    mat_metal     = make_material("hotel_metal",   (0.50, 0.52, 0.55), metallic=0.8, roughness=0.30)
    mat_conf_sep  = make_material("hotel_conf",    (0.40, 0.42, 0.45), metallic=0.25, roughness=0.45)
    mat_balcony   = make_material("hotel_balcony", (0.70, 0.72, 0.75), metallic=0.4, roughness=0.35)

    # === Conference centre wing — west end (separate volume) ===
    conf_w = 40.0
    conf_x = -W/2 + conf_w/2
    add_box("hotel_conf_wing", conf_w, D, H * 0.75, mat_conf_sep, location=(conf_x, 0, 0))
    # Conference hall clerestory (taller glazed strip)
    add_box("conf_clerestory", conf_w, 0.3, H * 0.6, mat_glass,
            location=(conf_x, -D/2, 0))
    # Conference hall roof (flat with skylights)
    add_box("conf_roof", conf_w + 0.5, D + 0.5, 0.4, mat_metal,
            location=(conf_x, 0, H * 0.75))
    # Skylights on conference roof
    skylight_mat = make_material("conf_sky", (0.7, 0.8, 0.9), metallic=0, roughness=0.04, alpha=0.4)
    for i in range(4):
        sl_x = conf_x - conf_w/2 + 5 + i * (conf_w - 10) / 3
        add_box(f"conf_skylight_{i}", 6.0, 4.0, 0.25, skylight_mat,
                location=(sl_x, 0, H * 0.75 + 0.15))

    # === Hotel tower body — east portion (4 floors) ===
    hotel_w = W - conf_w
    hotel_x = conf_x + conf_w/2 + hotel_w/2
    add_box("hotel_tower", hotel_w, D, H, mat_facade, location=(hotel_x, 0, 0))

    # Full-height glazed south facade of hotel
    add_box("hotel_glass_s", hotel_w * 0.88, 0.4, H, mat_glass,
            location=(hotel_x, -D/2, 0))

    # === Hotel balconies (floors 2-4) ===
    for floor in range(1, 4):
        z_fl = floor * (H / 4)
        # Balcony slab projecting south
        add_box(f"balcony_slab_{floor}", hotel_w * 0.80, 2.5, 0.2, mat_balcony,
                location=(hotel_x, -D/2 - 1.0, z_fl))
        # Balcony glass rail
        add_box(f"balcony_rail_{floor}", hotel_w * 0.80, 0.1, 1.0, mat_glass,
                location=(hotel_x, -D/2 - 2.2, z_fl + 0.2))

    # Floor slab lines
    for fl in range(1, 4):
        z = fl * (H / 4)
        add_box(f"hotel_slab_{fl}", hotel_w + 0.3, D + 0.3, 0.35, mat_metal,
                location=(hotel_x, 0, z))

    # === Grand lobby — expressed as bright glowing volume ===
    lobby_w = 24.0
    lobby_x = hotel_x - hotel_w/2 + lobby_w/2
    add_box("hotel_lobby_vol", lobby_w, D * 0.8, H / 2, mat_lobby,
            location=(lobby_x, 0, 0))
    # Lobby glazing (full south face of lobby)
    add_box("hotel_lobby_glass", lobby_w - 1, 0.3, H / 2, mat_lobby,
            location=(lobby_x, -D/2, 0))

    # === Porte-cochere — south facade projecting entrance ===
    pc_w   = 30.0
    pc_dep = 16.0
    pc_h   = 5.5
    pc_x   = lobby_x
    pc_y   = -D/2 - pc_dep/2

    # Porte-cochere roof slab
    add_box("porte_roof", pc_w, pc_dep, 0.4, mat_porte,
            location=(pc_x, pc_y, pc_h))
    # Porte-cochere columns (6 total)
    for i in range(3):
        cx = pc_x - pc_w/2 + 5 + i * (pc_w - 10) / 2
        for side in [-1, 1]:
            cy = pc_y + side * (pc_dep/2 - 1)
            add_cylinder(f"pc_col_{i}_{side}", 0.55, pc_h, mat_porte,
                         location=(cx, cy, 0))
    # Porte-cochere soffit lighting
    add_box("pc_led_strip", pc_w - 2, pc_dep - 2, 0.06, mat_lobby,
            location=(pc_x, pc_y, pc_h - 0.05))
    # Drive-through road strip under porte-cochere
    road_mat = make_material("pc_road", (0.12, 0.12, 0.12), metallic=0.0, roughness=1.0)
    add_box("pc_road", pc_w - 4, pc_dep, 0.15, road_mat,
            location=(pc_x, pc_y, -0.1))

    # === Rooftop pool terrace — east half of roof ===
    pool_x = hotel_x + hotel_w / 4
    pool_w = hotel_w * 0.45
    pool_d = D * 0.55

    # Pool surround (light stone deck)
    deck_mat = make_material("pool_deck", (0.78, 0.76, 0.72), metallic=0.0, roughness=0.80)
    add_box("pool_deck_slab", pool_w + 6, pool_d + 6, 0.3, deck_mat,
            location=(pool_x, D/4, H))
    # Pool water (glowing blue)
    add_box("rooftop_pool", pool_w, pool_d, 0.5, mat_pool,
            location=(pool_x, D/4, H + 0.1))
    # Pool rim
    add_box("pool_rim_n", pool_w + 1, 0.5, 0.4, mat_porte, location=(pool_x,  D/4 + pool_d/2 + 0.2, H + 0.2))
    add_box("pool_rim_s", pool_w + 1, 0.5, 0.4, mat_porte, location=(pool_x, D/4 - pool_d/2 - 0.2, H + 0.2))
    add_box("pool_rim_e", 0.5, pool_d + 1, 0.4, mat_porte, location=(pool_x + pool_w/2 + 0.2, D/4, H + 0.2))
    add_box("pool_rim_w", 0.5, pool_d + 1, 0.4, mat_porte, location=(pool_x - pool_w/2 - 0.2, D/4, H + 0.2))

    # Pool cabanas
    for i in range(3):
        cab_x = pool_x - pool_w/2 + i * pool_w/2
        add_box(f"cabana_top_{i}", 3.5, 2.5, 0.15, mat_porte, location=(cab_x, D/4 + pool_d/2 + 1.5, H + 2.8))
        add_cylinder(f"cabana_col1_{i}", 0.1, 2.8, mat_metal, location=(cab_x - 1.5, D/4 + pool_d/2 + 0.5, H))
        add_cylinder(f"cabana_col2_{i}", 0.1, 2.8, mat_metal, location=(cab_x + 1.5, D/4 + pool_d/2 + 0.5, H))

    # === Rooftop parapet ===
    add_box("hotel_parapet", W + 0.5, D + 0.5, 1.2, mat_metal, location=(0, 0, H))

    # === Rooftop mechanical / HVAC ===
    for i, (hx, hy) in enumerate([(-W/4, 0), (conf_x, -D/4)]):
        add_box(f"rooftop_hvac_{i}", 8, 5, 2.5, mat_conf_sep, location=(hx, hy, H + 0.1))

    export_glb("grand_conference_hotel.glb")
    print("  Building 30 complete.")


# ===========================================================================
# MAIN — run all buildings
# ===========================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Collective AI Mega Campus — Buildings 25-30")
    print("=" * 60)

    build_25_gaia_bio_energy()
    build_26_central_utility()
    build_27_emergency_ops()
    build_28_construction_yard()
    build_29_visitor_experience()
    build_30_grand_hotel()

    print("\n" + "=" * 60)
    print("All 6 buildings exported successfully.")
    print(f"Output: {OUT_DIR}")
    print("=" * 60)
