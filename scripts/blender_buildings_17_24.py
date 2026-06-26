#!/usr/bin/env python3
"""
Blender Python script — Collective AI Mega Campus, Buildings 17-24.
Generates highly-detailed 3D GLB models using Blender's bpy API.

Run headless:
    blender --background --python blender_buildings_17_24.py

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
    """Delete all mesh objects, materials, and lights from the scene."""
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
    """Add a box mesh (w=X, d=Y, h=Z) with base at z=0, centred in X-Y."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, d, h)
    obj.location = (
        location[0],
        location[1],
        location[2] + h / 2,
    )
    if rotation != (0, 0, 0):
        obj.rotation_euler = Euler(
            (math.radians(rotation[0]),
             math.radians(rotation[1]),
             math.radians(rotation[2])), 'XYZ'
        )
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return obj


def add_cylinder(name, radius, height, sections=16, mat=None,
                 location=(0, 0, 0)):
    """Add a cylinder with base at z=0."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sections, radius=radius, depth=height,
        location=(location[0], location[1], location[2] + height / 2)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return obj


def add_cone(name, base_radius, height, sections=16, mat=None,
             location=(0, 0, 0)):
    """Add a cone with base at z=0."""
    bpy.ops.mesh.primitive_cone_add(
        vertices=sections, radius1=base_radius, radius2=0, depth=height,
        location=(location[0], location[1], location[2] + height / 2)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return obj


def add_disk(name, radius, sections=32, mat=None, location=(0, 0, 0)):
    """Add a flat disk (circle fill) at given z."""
    bpy.ops.mesh.primitive_circle_add(
        vertices=sections, radius=radius, fill_type='TRIFAN',
        location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return obj


def add_pyramid(name, w, d, h, mat=None, location=(0, 0, 0)):
    """Add a rectangular pyramid with base at z=0, centred in X-Y."""
    import bmesh
    mesh = bpy.data.meshes.new(name + "_mesh")
    bm = bmesh.new()
    hw, hd = w / 2, d / 2
    # base verts
    v0 = bm.verts.new((-hw, -hd, 0))
    v1 = bm.verts.new(( hw, -hd, 0))
    v2 = bm.verts.new(( hw,  hd, 0))
    v3 = bm.verts.new((-hw,  hd, 0))
    # apex
    v4 = bm.verts.new((0, 0, h))
    bm.faces.new([v0, v1, v2, v3])   # base
    bm.faces.new([v0, v1, v4])
    bm.faces.new([v1, v2, v4])
    bm.faces.new([v2, v3, v4])
    bm.faces.new([v3, v0, v4])
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return obj


def add_wedge(name, w, d, h_front, h_back, mat=None, location=(0, 0, 0)):
    """Wedge: front face at height h_front, back at h_back (sawtooth tooth)."""
    import bmesh
    mesh = bpy.data.meshes.new(name + "_mesh")
    bm = bmesh.new()
    hw = w / 2
    hd = d / 2
    lx, ly, lz = location
    v0 = bm.verts.new((-hw, -hd, 0))
    v1 = bm.verts.new(( hw, -hd, 0))
    v2 = bm.verts.new(( hw,  hd, 0))
    v3 = bm.verts.new((-hw,  hd, 0))
    v4 = bm.verts.new((-hw, -hd, h_front))
    v5 = bm.verts.new(( hw, -hd, h_front))
    v6 = bm.verts.new(( hw,  hd, h_back))
    v7 = bm.verts.new((-hw,  hd, h_back))
    bm.faces.new([v0, v1, v2, v3])   # bottom
    bm.faces.new([v4, v5, v1, v0])   # front
    bm.faces.new([v7, v6, v5, v4])   # top (sloped)
    bm.faces.new([v3, v2, v6, v7])   # back
    bm.faces.new([v0, v3, v7, v4])   # left
    bm.faces.new([v1, v5, v6, v2])   # right
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (lx, ly, lz)
    bpy.context.collection.objects.link(obj)
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return obj


def select_all_and_export(filepath):
    """Select all mesh objects and export to GLB."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_materials='EXPORT',
        export_normals=True,
        export_vertex_color='MATERIAL',
        export_extras=False,
    )
    print(f"  [GLB] Exported → {filepath}  ({os.path.getsize(filepath)//1024} KB)")


# ===========================================================================
# BUILDING 17 — sentinel_security_command
# 76.2m × 45.7m × 8m, 2 floors, SECURITY
# ===========================================================================

def build_sentinel_security_command():
    clear_scene()
    W, D, H = 76.2, 45.7, 8.0

    # Materials
    m_concrete = make_material("dark_concrete", (0.09, 0.09, 0.10),
                               metallic=0.0, roughness=0.85)
    m_roof     = make_material("dark_roof", (0.07, 0.07, 0.08),
                               metallic=0.1, roughness=0.8)
    m_red_glow = make_material("red_security", (1.0, 0.15, 0.0),
                               emission_color=(1.0, 0.15, 0.0),
                               emission_strength=4.0, roughness=0.4)
    m_orange_glow = make_material("orange_security", (1.0, 0.45, 0.0),
                                  emission_color=(1.0, 0.45, 0.0),
                                  emission_strength=3.0, roughness=0.4)
    m_glass    = make_material("dark_glass", (0.05, 0.05, 0.08),
                               metallic=0.1, roughness=0.05, alpha=0.5)
    m_steel    = make_material("dark_steel", (0.15, 0.16, 0.18),
                               metallic=0.85, roughness=0.3)
    m_barrier  = make_material("vehicle_barrier", (0.12, 0.12, 0.13),
                               metallic=0.5, roughness=0.6)

    # --- Main body ---
    add_box("body", W, D, H, m_concrete)

    # --- Horizontal banding (darker recessed strips every floor) ---
    band_color = make_material("band", (0.06, 0.06, 0.07), roughness=0.9)
    floor_h = H / 2
    for fi in range(1, 2):
        bz = fi * floor_h
        add_box(f"floor_band_{fi}", W + 0.2, D + 0.2, 0.3, band_color,
                location=(0, 0, bz - 0.15))

    # --- Minimal windows: narrow horizontal slits ---
    win_mat = make_material("window_slit", (0.4, 0.6, 0.8),
                            emission_color=(0.4, 0.6, 0.8),
                            emission_strength=1.0, roughness=0.05, alpha=0.8)
    # South facade: 6 narrow slits per floor
    for fi in range(2):
        bz = fi * floor_h + floor_h * 0.45
        for wi_i in range(6):
            wx = -W/2 + 8 + wi_i * (W - 16) / 5
            add_box(f"win_s_{fi}_{wi_i}", 3.0, 0.2, 0.6, win_mat,
                    location=(wx, -D/2, bz))

    # --- Control tower on roof (centred) ---
    ct_w, ct_d, ct_h = 12.0, 9.0, 6.5
    add_box("ctrl_tower_base", ct_w, ct_d, ct_h, m_steel,
            location=(0, 4, H))
    # Control room: glass band around top of tower
    add_box("ctrl_tower_glass", ct_w + 0.2, ct_d + 0.2, 1.8, win_mat,
            location=(0, 4, H + ct_h - 1.8))
    # Tower roof slab
    add_box("ctrl_tower_roof", ct_w + 1.0, ct_d + 1.0, 0.4, m_roof,
            location=(0, 4, H + ct_h))

    # --- Surveillance mast on tower ---
    add_cylinder("surv_mast", 0.25, 9.0, sections=8, mat=m_steel,
                 location=(0, 4, H + ct_h + 0.4))
    # Mast crossbar
    add_box("mast_crossbar", 4.0, 0.15, 0.15, m_steel,
            location=(0, 4, H + ct_h + 0.4 + 7.0))
    # Surveillance cluster: 4 cameras on crossbar
    for ci, cx in enumerate([-1.8, -0.6, 0.6, 1.8]):
        add_box(f"camera_{ci}", 0.3, 0.5, 0.3, m_red_glow,
                location=(cx, 4, H + ct_h + 0.4 + 6.8))

    # --- Secure perimeter: low concrete wall ---
    perim_h, perim_t = 2.0, 1.0
    for side, (px, py, pw, pd) in enumerate([
        (0, -(D/2 + 8), W + 16, perim_t),      # south
        (0,  (D/2 + 8), W + 16, perim_t),      # north
        (-(W/2 + 8), 0, perim_t, D + 16),      # west
        ( (W/2 + 8), 0, perim_t, D + 16),      # east
    ]):
        add_box(f"perim_wall_{side}", pw, pd, perim_h, m_barrier,
                location=(px, py, 0))

    # --- Vehicle barriers: bollards ---
    bolt_r, bolt_h = 0.4, 1.2
    bolt_mat = make_material("bollard", (0.3, 0.3, 0.32),
                             metallic=0.7, roughness=0.4)
    # South approach bollard row
    for bi in range(12):
        bx = -W/2 + 4 + bi * (W - 8) / 11
        add_cylinder(f"bollard_s_{bi}", bolt_r, bolt_h, sections=8, mat=bolt_mat,
                     location=(bx, -(D/2 + 3.5), 0))

    # --- Red security light strips at building corners ---
    for ci, (cx, cy) in enumerate([
        (-W/2, -D/2), (W/2, -D/2), (W/2, D/2), (-W/2, D/2)
    ]):
        add_box(f"sec_light_{ci}", 0.4, 0.4, H, m_red_glow,
                location=(cx, cy, 0))

    # --- Orange accent: horizontal glow strip at eave line ---
    add_box("eave_strip_s", W, 0.3, 0.25, m_orange_glow,
            location=(0, -D/2, H - 0.1))
    add_box("eave_strip_n", W, 0.3, 0.25, m_orange_glow,
            location=(0,  D/2, H - 0.1))

    # --- Roof parapet ---
    add_box("parapet", W + 0.5, D + 0.5, 0.8, m_concrete,
            location=(0, 0, H))

    select_all_and_export(os.path.join(OUT_DIR, "sentinel_security_command.glb"))


# ===========================================================================
# BUILDING 18 — foundry_manufacturing_district
# 152.4m × 91.4m × 24m, 3 floors, INDUSTRIAL
# ===========================================================================

def build_foundry_manufacturing_district():
    clear_scene()
    W, D, H = 152.4, 91.4, 24.0

    m_gunmetal = make_material("gunmetal", (0.14, 0.14, 0.15),
                               metallic=0.4, roughness=0.75)
    m_dark_steel = make_material("dark_steel", (0.12, 0.12, 0.13),
                                 metallic=0.6, roughness=0.5)
    m_exhaust   = make_material("exhaust_stack", (0.10, 0.10, 0.11),
                                metallic=0.7, roughness=0.4)
    m_fire_glow = make_material("fire_glow", (1.0, 0.3, 0.0),
                                emission_color=(1.0, 0.3, 0.0),
                                emission_strength=8.0, roughness=0.3)
    m_red_hot   = make_material("red_hot", (1.0, 0.08, 0.0),
                                emission_color=(1.0, 0.08, 0.0),
                                emission_strength=6.0, roughness=0.2)
    m_glass_high = make_material("sawtooth_glass", (0.5, 0.7, 0.9),
                                 emission_color=(0.4, 0.6, 0.8),
                                 emission_strength=1.5, roughness=0.1, alpha=0.7)
    m_freight   = make_material("freight_door", (0.08, 0.08, 0.09),
                                metallic=0.6, roughness=0.6)
    m_crane     = make_material("crane_steel", (0.9, 0.7, 0.0),
                                metallic=0.8, roughness=0.3)

    # --- Main body ---
    add_box("main_body", W, D, H, m_gunmetal)

    # --- Sawtooth monitor bays (5 teeth along X, running full depth) ---
    n_teeth = 5
    tooth_w = W / n_teeth
    tooth_h = 5.0   # rise above main roof
    for ti in range(n_teeth):
        tx = -W/2 + ti * tooth_w + tooth_w / 2
        # Vertical north glazing face
        add_box(f"sawtooth_glass_{ti}", tooth_w - 0.5, 0.4, tooth_h + 0.5,
                m_glass_high, location=(tx, -D/2 + 1, H))
        # Sloped south opaque face (wedge approximation with narrow box)
        add_wedge(f"sawtooth_slope_{ti}", tooth_w - 0.5, D - 2,
                  tooth_h, 0.0, m_dark_steel,
                  location=(tx - (tooth_w - 0.5)/2, -D/2 + 1, H))

    # --- Sawtooth roof ridge caps ---
    for ti in range(n_teeth):
        tx = -W/2 + ti * tooth_w + tooth_w / 2
        add_box(f"ridge_cap_{ti}", tooth_w - 0.5, 0.6, 0.4, m_dark_steel,
                location=(tx, -D/2 + 1.2, H + tooth_h))

    # --- Exhaust stacks: 5 tall tapered stacks along north facade ---
    stack_positions = [-55, -30, 0, 30, 55]
    stack_heights   = [32, 36, 40, 36, 32]
    for si, (sx, sh) in enumerate(zip(stack_positions, stack_heights)):
        # Main stack cylinder (tapered: wider at base)
        add_cylinder(f"stack_base_{si}", 3.5, sh * 0.4, sections=16,
                     mat=m_exhaust, location=(sx, D/2 - 5, H))
        add_cylinder(f"stack_mid_{si}", 2.8, sh * 0.35, sections=16,
                     mat=m_exhaust, location=(sx, D/2 - 5, H + sh * 0.4))
        add_cylinder(f"stack_top_{si}", 2.2, sh * 0.25, sections=16,
                     mat=m_exhaust, location=(sx, D/2 - 5, H + sh * 0.75))
        # Glow ring at top
        add_cylinder(f"stack_glow_{si}", 2.5, 1.2, sections=16,
                     mat=m_fire_glow, location=(sx, D/2 - 5, H + sh - 1.0))
        # Hot emission disk at top
        add_disk(f"stack_ember_{si}", 2.0, sections=32, mat=m_red_hot,
                 location=(sx, D/2 - 5, H + sh))

    # --- Heavy freight access doors: 6 large doors on south facade ---
    for di in range(6):
        dx = -W/2 + 12 + di * (W - 24) / 5
        add_box(f"freight_door_{di}", 8.0, 0.5, 9.0, m_freight,
                location=(dx, -D/2, 0))
        # Door frame (lighter)
        frame_mat = make_material(f"door_frame_{di}", (0.25, 0.25, 0.27),
                                  metallic=0.6, roughness=0.4)
        add_box(f"freight_frame_{di}", 8.6, 0.3, 9.6, frame_mat,
                location=(dx, -D/2 - 0.1, 0))

    # --- Overhead crane rails: 2 east-west rails on roof ---
    crane_mat = m_crane
    for cr_i, cy in enumerate([D/4, -D/4]):
        add_box(f"crane_rail_{cr_i}", W, 0.8, 0.5, crane_mat,
                location=(0, cy, H + tooth_h * 0.5))
        # Crane gantry bridge
        add_box(f"crane_bridge_{cr_i}", 2.0, D * 0.8, 0.5, crane_mat,
                location=(W/4 * (1 if cr_i == 0 else -1), 0, H + tooth_h * 0.5 + 0.5))

    # --- Forge yard: open concrete apron on south ---
    yard_mat = make_material("forge_yard", (0.18, 0.17, 0.16),
                             metallic=0.0, roughness=0.9)
    add_box("forge_yard", W + 20, 20.0, 0.3, yard_mat,
            location=(0, -(D/2 + 10), 0))
    # Slag pits (dark recessed elements)
    for pi in range(3):
        px = -W/3 + pi * W/3
        add_cylinder(f"slag_pit_{pi}", 4.0, 0.5, sections=16, mat=m_red_hot,
                     location=(px, -(D/2 + 6), 0))

    # --- Loading dock canopy ---
    canopy_mat = make_material("loading_canopy", (0.13, 0.13, 0.14),
                               metallic=0.5, roughness=0.5)
    add_box("loading_canopy", W, 8.0, 0.5, canopy_mat,
            location=(0, -(D/2 + 4), 6.0))
    # Canopy supports
    for sp in range(8):
        spx = -W/2 + 10 + sp * (W - 20) / 7
        add_cylinder(f"canopy_col_{sp}", 0.4, 6.0, sections=8, mat=m_dark_steel,
                     location=(spx, -(D/2 + 8), 0))

    # --- Floor bands ---
    band_mat = make_material("floor_band", (0.10, 0.10, 0.11), roughness=0.8)
    for fi in range(1, 3):
        bz = fi * (H / 3)
        add_box(f"floor_band_{fi}", W + 0.4, D + 0.4, 0.4, band_mat,
                location=(0, 0, bz - 0.2))

    select_all_and_export(os.path.join(OUT_DIR, "foundry_manufacturing_district.glb"))


# ===========================================================================
# BUILDING 19 — juris_guard_center
# 67.1m × 33.5m × 13.5m, 3 floors, CIVIC_CULTURAL
# ===========================================================================

def build_juris_guard_center():
    clear_scene()
    W, D, H = 67.1, 33.5, 13.5

    m_stone   = make_material("warm_stone", (0.82, 0.76, 0.64),
                              metallic=0.0, roughness=0.85)
    m_stone2  = make_material("stone_dark", (0.70, 0.64, 0.52),
                              metallic=0.0, roughness=0.88)
    m_civic   = make_material("civic_accent", (0.72, 0.58, 0.25),
                              metallic=0.3, roughness=0.4)
    m_bronze  = make_material("bronze", (0.6, 0.4, 0.15),
                              metallic=0.7, roughness=0.35)
    m_win     = make_material("civic_window", (0.9, 0.85, 0.5),
                              emission_color=(1.0, 0.95, 0.6),
                              emission_strength=2.0, roughness=0.05, alpha=0.75)
    m_roof    = make_material("civic_roof", (0.62, 0.56, 0.44),
                              metallic=0.0, roughness=0.8)

    # --- Main body (archive wing, 2/3 of width) ---
    main_w = W * 0.62
    add_box("main_body", main_w, D, H, m_stone,
            location=(-W/2 + main_w/2, 0, 0))

    # --- Courtroom wing: taller, expressed as distinct volume (right side) ---
    court_w = W * 0.38
    court_h = H * 1.55
    add_box("court_wing", court_w, D, court_h, m_stone2,
            location=(W/2 - court_w/2, 0, 0))

    # --- Courtroom wing stepped parapet ---
    add_box("court_parapet_outer", court_w + 1.0, D + 1.0, 1.2, m_stone2,
            location=(W/2 - court_w/2, 0, court_h))
    add_box("court_parapet_inner", court_w - 1.5, D - 1.5, 0.6, m_roof,
            location=(W/2 - court_w/2, 0, court_h + 1.2))

    # --- Colonnade on south facade of main wing ---
    col_r, col_h = 0.55, H * 0.85
    col_mat = m_civic
    n_cols = 8
    col_spacing = (main_w - 6) / (n_cols - 1)
    for ci in range(n_cols):
        cx = -W/2 + 3 + ci * col_spacing
        add_cylinder(f"col_{ci}", col_r, col_h, sections=10, mat=col_mat,
                     location=(cx, -D/2 - 0.6, 0))
    # Colonnade entablature beam
    add_box("entablature", main_w, 1.2, 1.0, m_civic,
            location=(-W/2 + main_w/2, -D/2 - 0.6, col_h))

    # --- Windows: main wing south ---
    for fi in range(3):
        fz = fi * (H / 3) + 1.5
        for wi_i in range(5):
            wx = -W/2 + 5 + wi_i * (main_w - 10) / 4
            win_h = (H / 3) - 2.5
            add_box(f"win_main_{fi}_{wi_i}", 2.5, 0.3, win_h, m_win,
                    location=(wx, -D/2, fz))

    # --- Courtroom wing tall arched windows (approximated as tall boxes) ---
    for fi in range(3):
        fz = fi * (court_h / 3) + 2.0
        for wi_i in range(3):
            wx = W/2 - court_w + 3 + wi_i * (court_w - 6) / 2
            win_h = (court_h / 3) - 3.0
            add_box(f"win_court_{fi}_{wi_i}", 2.0, 0.3, win_h, m_win,
                    location=(wx, -D/2, fz))

    # --- Secure entry: recessed deep portico ---
    entry_w, entry_d, entry_h = 8.0, 4.0, 5.0
    add_box("entry_recess", entry_w, entry_d, entry_h, m_stone2,
            location=(-W/2 + main_w/2, -D/2 - entry_d/2, 0))
    # Entry door
    add_box("entry_door", 2.5, 0.3, 3.5, m_bronze,
            location=(-W/2 + main_w/2, -D/2 - entry_d, 0))

    # --- Archive wing steps ---
    step_mat = m_stone
    for si in range(4):
        sw = main_w * (1.0 - si * 0.05)
        add_box(f"step_{si}", sw, 2.5 + si * 1.0, 0.35, step_mat,
                location=(-W/2 + main_w/2, -D/2 - 1.5 - si * 1.0, si * 0.35))

    # --- Golden civic light strips at courtroom cornice ---
    add_box("court_cornice", court_w, D, 0.6, m_civic,
            location=(W/2 - court_w/2, 0, court_h - 0.6))

    # --- Roof: flat with parapet on main body ---
    add_box("main_parapet", main_w + 0.5, D + 0.5, 0.9, m_stone,
            location=(-W/2 + main_w/2, 0, H))

    # --- Flag poles on court wing ---
    for fp_i, fpx in enumerate([-2, 2]):
        add_cylinder(f"flagpole_{fp_i}", 0.12, 8.0, sections=6, mat=m_bronze,
                     location=(W/2 - court_w/2 + fpx, -D/2 + 1, court_h + 1.2))

    select_all_and_export(os.path.join(OUT_DIR, "juris_guard_center.glb"))


# ===========================================================================
# BUILDING 20 — cognara_mind_institute
# 76.2m × 39.6m × 13.5m, 3 floors, RESEARCH
# ===========================================================================

def build_cognara_mind_institute():
    clear_scene()
    W, D, H = 76.2, 39.6, 13.5

    m_white   = make_material("white_body", (0.95, 0.96, 0.97),
                              metallic=0.05, roughness=0.4)
    m_silver  = make_material("silver_canopy", (0.88, 0.90, 0.92),
                              metallic=0.5, roughness=0.2)
    m_glass   = make_material("institute_glass", (0.7, 0.85, 0.9),
                              emission_color=(0.6, 0.8, 0.85),
                              emission_strength=1.2, roughness=0.05, alpha=0.6)
    m_garden  = make_material("garden_glow", (0.25, 0.75, 0.45),
                              emission_color=(0.2, 0.9, 0.5),
                              emission_strength=1.5, roughness=0.8)
    m_path    = make_material("courtyard_path", (0.85, 0.83, 0.80),
                              metallic=0.0, roughness=0.7)
    m_pillar  = make_material("white_pillar", (0.92, 0.93, 0.94),
                              metallic=0.1, roughness=0.35)

    # --- Main building body (U-shape: two side wings + rear bar, open south) ---
    # East wing
    ew = W * 0.28
    add_box("east_wing", ew, D, H, m_white,
            location=(W/2 - ew/2, 0, 0))
    # West wing
    add_box("west_wing", ew, D, H, m_white,
            location=(-W/2 + ew/2, 0, 0))
    # Rear (north) bar
    rear_w = W - 2 * ew
    add_box("rear_bar", rear_w, D * 0.4, H, m_white,
            location=(0, D/2 - D * 0.2, 0))

    # --- Meditation courtyard floor (inner open area) ---
    ct_w = rear_w - 2.0
    ct_d = D * 0.58
    add_box("courtyard_floor", ct_w, ct_d, 0.25, m_path,
            location=(0, -D * 0.08, 0))
    # Garden planters in courtyard
    planter_mat = make_material("planter", (0.55, 0.45, 0.35),
                                metallic=0.0, roughness=0.9)
    for pi, (px, py) in enumerate([
        (-ct_w/4, 0), (ct_w/4, 0), (0, ct_d/4), (0, -ct_d/4)
    ]):
        add_cylinder(f"planter_{pi}", 3.0, 0.8, sections=16, mat=planter_mat,
                     location=(px, py + D * 0.05, 0.25))
        add_cylinder(f"garden_{pi}", 2.5, 0.5, sections=16, mat=m_garden,
                     location=(px, py + D * 0.05, 1.05))

    # --- Central reflecting pool ---
    pool_mat = make_material("reflecting_pool", (0.2, 0.5, 0.65),
                             emission_color=(0.1, 0.4, 0.6),
                             emission_strength=1.0, roughness=0.05, alpha=0.8)
    add_box("pool", ct_w * 0.3, ct_d * 0.3, 0.15, pool_mat,
            location=(0, D * 0.05, 0.25))

    # --- Floating roof plane: wide thin slab cantilevering beyond walls ---
    roof_overhang = 3.5
    roof_t = 0.8
    add_box("floating_roof", W + 2 * roof_overhang, D + 2 * roof_overhang,
            roof_t, m_silver,
            location=(0, 0, H))

    # --- Piloti / slender columns supporting floating roof over courtyard ---
    for pi_x in [-ct_w/2 + 1, 0, ct_w/2 - 1]:
        for pi_y in [-ct_d/2 + 2, ct_d/2 - 2]:
            add_cylinder(f"piloti_{int(pi_x)}_{int(pi_y)}", 0.3, H + roof_t,
                         sections=8, mat=m_pillar,
                         location=(pi_x, pi_y + D * 0.05, 0))

    # --- Glass facade on south face of east and west wings ---
    for side, sx in [("e", W/2 - ew/2), ("w", -W/2 + ew/2)]:
        # Full-height glass curtain wall
        add_box(f"glass_south_{side}", ew, 0.35, H, m_glass,
                location=(sx, -D/2, 0))
        # Horizontal floor lines
        for fi in range(1, 3):
            fz = fi * (H / 3)
            add_box(f"floor_line_{side}_{fi}", ew, 0.35, 0.25, m_silver,
                    location=(sx, -D/2, fz))

    # --- Cognitive lab wing: slight rooftop volume at east ---
    lab_h = 2.8
    add_box("cog_lab", ew * 0.75, D * 0.55, lab_h, m_silver,
            location=(W/2 - ew * 0.55, D * 0.1, H + roof_t))

    # --- Window line on rear bar ---
    for wi_i in range(6):
        wx = -rear_w/2 + 2 + wi_i * (rear_w - 4) / 5
        add_box(f"win_rear_{wi_i}", 3.5, 0.35, H * 0.7, m_glass,
                location=(wx, D/2 - D * 0.04, H * 0.15))

    select_all_and_export(os.path.join(OUT_DIR, "cognara_mind_institute.glb"))


# ===========================================================================
# BUILDING 21 — signal_velocity_center
# 61m × 36.6m × 13.5m, 3 floors, RESEARCH
# ===========================================================================

def build_signal_velocity_center():
    clear_scene()
    W, D, H = 61.0, 36.6, 13.5

    m_dark_glass = make_material("dark_glass_facade", (0.04, 0.04, 0.06),
                                 metallic=0.1, roughness=0.04, alpha=0.85)
    m_fin        = make_material("silver_fin", (0.75, 0.77, 0.80),
                                 metallic=0.90, roughness=0.15)
    m_body       = make_material("body_dark", (0.06, 0.06, 0.08),
                                 metallic=0.15, roughness=0.5)
    m_antenna    = make_material("antenna_steel", (0.65, 0.68, 0.72),
                                 metallic=0.95, roughness=0.1)
    m_signal_glow = make_material("signal_glow", (0.0, 0.5, 1.0),
                                  emission_color=(0.0, 0.5, 1.0),
                                  emission_strength=5.0, roughness=0.2)
    m_data_screen = make_material("data_screen", (0.1, 0.3, 0.8),
                                  emission_color=(0.05, 0.2, 1.0),
                                  emission_strength=3.0, roughness=0.1)

    # --- Main body ---
    add_box("body", W, D, H, m_body)

    # --- Dark glass curtain wall all four facades ---
    facade_t = 0.4
    add_box("glass_south", W, facade_t, H, m_dark_glass,
            location=(0, -D/2, 0))
    add_box("glass_north", W, facade_t, H, m_dark_glass,
            location=(0,  D/2, 0))
    add_box("glass_east", facade_t, D, H, m_dark_glass,
            location=( W/2, 0, 0))
    add_box("glass_west", facade_t, D, H, m_dark_glass,
            location=(-W/2, 0, 0))

    # --- Vertical metal fins on south and north facades ---
    fin_w, fin_d, fin_h = 0.35, 0.6, H + 1.5
    fin_spacing = 2.8
    n_fins = int(W / fin_spacing)
    for fi in range(n_fins):
        fx = -W/2 + 1.0 + fi * fin_spacing
        add_box(f"fin_s_{fi}", fin_w, fin_d, fin_h, m_fin,
                location=(fx, -D/2 - fin_d/2 + 0.05, 0))
        add_box(f"fin_n_{fi}", fin_w, fin_d, fin_h, m_fin,
                location=(fx,  D/2 + fin_d/2 - 0.05, 0))

    # --- Roof: flat dark slab + parapet ---
    add_box("roof_slab", W + 0.6, D + 0.6, 0.6, m_body,
            location=(0, 0, H))

    # --- Rooftop antenna array ---
    # Central dish mast
    add_cylinder("main_mast", 0.5, 12.0, sections=8, mat=m_antenna,
                 location=(0, 0, H + 0.6))
    # Dish (flat disk)
    add_disk("main_dish", 4.5, sections=32, mat=m_antenna,
             location=(0, 0, H + 10.0))
    # Secondary antennas in array pattern
    for ai in range(6):
        angle_deg = ai * 60
        angle_rad = math.radians(angle_deg)
        ar = 14.0
        ax = ar * math.cos(angle_rad)
        ay = ar * math.sin(angle_rad)
        # Diagonal thin antenna
        add_cylinder(f"antenna_{ai}", 0.12, 7.0, sections=6, mat=m_antenna,
                     location=(ax, ay, H + 0.6))
        # Signal glow ball at top
        add_cylinder(f"ant_glow_{ai}", 0.3, 0.5, sections=12, mat=m_signal_glow,
                     location=(ax, ay, H + 7.2))
    # Radial cross-bracing
    for ri in range(4):
        ra = math.radians(ri * 45)
        add_box(f"brace_{ri}", 18.0, 0.12, 0.12, m_antenna,
                location=(0, 0, H + 4.0), rotation=(0, 0, ri * 45))

    # --- Data visualization lobby: large screen on south face at ground ---
    screen_h = H * 0.55
    add_box("data_lobby_screen", W * 0.35, 0.3, screen_h, m_data_screen,
            location=(0, -D/2, H * 0.22))

    # --- Signal lab indicator lights: blue row at each floor ---
    for fi in range(3):
        fz = fi * (H / 3) + H/6
        add_box(f"signal_strip_{fi}", W, 0.3, 0.2, m_signal_glow,
                location=(0, D/2, fz))

    # --- Corner signal pylons ---
    for ci, (cx, cy) in enumerate([
        (-W/2, -D/2), (W/2, -D/2), (W/2, D/2), (-W/2, D/2)
    ]):
        add_cylinder(f"pylon_{ci}", 0.5, H + 4, sections=8, mat=m_antenna,
                     location=(cx, cy, 0))
        add_cylinder(f"pylon_glow_{ci}", 0.3, 0.8, sections=8, mat=m_signal_glow,
                     location=(cx, cy, H + 3.5))

    select_all_and_export(os.path.join(OUT_DIR, "signal_velocity_center.glb"))


# ===========================================================================
# BUILDING 22 — eon_core_systems_house
# 67.1m × 39.6m × 13.5m, 3 floors, RESEARCH
# ===========================================================================

def build_eon_core_systems_house():
    clear_scene()
    W, D, H = 67.1, 39.6, 13.5

    m_chrome  = make_material("chrome_panels", (0.88, 0.90, 0.92),
                              metallic=0.95, roughness=0.12)
    m_silver  = make_material("silver_body", (0.72, 0.75, 0.78),
                              metallic=0.80, roughness=0.22)
    m_ctrl    = make_material("ctrl_room_glass", (0.15, 0.5, 1.0),
                              emission_color=(0.1, 0.4, 1.0),
                              emission_strength=3.0, roughness=0.05, alpha=0.7)
    m_blue    = make_material("blue_accent", (0.0, 0.3, 0.9),
                              emission_color=(0.0, 0.3, 0.9),
                              emission_strength=2.5, roughness=0.2)
    m_server  = make_material("server_rack", (0.25, 0.28, 0.32),
                              metallic=0.7, roughness=0.4)
    m_panel   = make_material("panel_seam", (0.60, 0.62, 0.65),
                              metallic=0.7, roughness=0.3)

    # --- Main body ---
    main_w = W * 0.65
    add_box("main_body", main_w, D, H, m_silver,
            location=(-W/2 + main_w/2, 0, 0))

    # --- Control room wing: narrower, with punched windows ---
    ctrl_w = W * 0.35
    ctrl_h = H
    add_box("ctrl_wing", ctrl_w, D, ctrl_h, m_chrome,
            location=(W/2 - ctrl_w/2, 0, 0))

    # --- Horizontal metal panel seams (every ~1.5m) ---
    for pi in range(9):
        pz = 1.0 + pi * 1.4
        add_box(f"seam_{pi}", W, D + 0.3, 0.08, m_panel,
                location=(0, 0, pz))

    # --- Vertical fin dividers on main facade ---
    n_fins = 10
    for fi in range(n_fins):
        fx = -W/2 + 2 + fi * (main_w - 4) / (n_fins - 1)
        add_box(f"vert_fin_{fi}", 0.12, D + 0.2, H, m_chrome,
                location=(fx, 0, 0))

    # --- Control room wing: punched small windows ---
    punch_mat = make_material("punch_win", (0.55, 0.7, 0.9),
                              emission_color=(0.4, 0.6, 0.9),
                              emission_strength=1.5, roughness=0.05, alpha=0.8)
    win_w, win_h = 1.4, 1.2
    for fi in range(3):
        for wj in range(4):
            wx = W/2 - ctrl_w + 2 + wj * (ctrl_w - 4) / 3
            wz = fi * (H / 3) + 1.8
            add_box(f"punch_win_{fi}_{wj}", win_w, 0.25, win_h, punch_mat,
                    location=(wx, -D/2, wz))

    # --- Control room glass band (top of control wing) ---
    add_box("ctrl_glass_band", ctrl_w, D + 0.3, 2.5, m_ctrl,
            location=(W/2 - ctrl_w/2, 0, H - 2.5))

    # --- Server cluster rooftop boxes ---
    serv_mat = m_server
    for si in range(5):
        sx = -main_w/2 + 3 + si * (main_w - 6) / 4
        add_box(f"server_box_{si}", 4.0, 2.5, 2.2, serv_mat,
                location=(sx - W/2 + main_w/2, -D/4, H))
        # Vent slots on server boxes
        add_box(f"server_vent_{si}", 3.8, 0.1, 1.8, m_blue,
                location=(sx - W/2 + main_w/2, -D/4 - 1.3, H + 0.2))

    # --- Systems integration hub: raised box on ctrl wing roof ---
    hub_h = 3.0
    add_box("sys_hub", ctrl_w * 0.7, D * 0.5, hub_h, m_chrome,
            location=(W/2 - ctrl_w/2, 0, H))
    add_box("sys_hub_glass", ctrl_w * 0.7, D * 0.5 + 0.2, 1.2, m_ctrl,
            location=(W/2 - ctrl_w/2, 0, H + hub_h - 1.2))

    # --- Blue accent strips at building base and eave ---
    add_box("base_strip", W, D + 0.2, 0.35, m_blue,
            location=(0, 0, 0.35))
    add_box("eave_strip", W, D + 0.2, 0.35, m_blue,
            location=(0, 0, H - 0.1))

    # --- HVAC units on main wing roof ---
    for hi_i in range(4):
        hx = -main_w/2 + 4 + hi_i * (main_w - 8) / 3
        add_box(f"hvac_{hi_i}", 3.5, 2.0, 1.8, m_server,
                location=(hx - W/2 + main_w/2, D/4, H))

    select_all_and_export(os.path.join(OUT_DIR, "eon_core_systems_house.glb"))


# ===========================================================================
# BUILDING 23 — nomad_nexus_mobility_lab
# 67.1m × 36.6m × 13.5m, 3 floors, TRANSPORT
# ===========================================================================

def build_nomad_nexus_mobility_lab():
    clear_scene()
    W, D, H = 67.1, 36.6, 13.5

    m_white  = make_material("white_metal", (0.92, 0.93, 0.94),
                             metallic=0.35, roughness=0.3)
    m_light  = make_material("light_panel", (0.85, 0.87, 0.90),
                             metallic=0.5, roughness=0.25)
    m_orange = make_material("drone_orange", (1.0, 0.42, 0.0),
                             emission_color=(1.0, 0.42, 0.0),
                             emission_strength=3.5, roughness=0.3)
    m_track  = make_material("test_track", (0.30, 0.32, 0.35),
                             metallic=0.2, roughness=0.7)
    m_barrier_orange = make_material("track_barrier", (1.0, 0.55, 0.0),
                                     metallic=0.3, roughness=0.5)
    m_glass  = make_material("mobility_glass", (0.6, 0.75, 0.85),
                             emission_color=(0.5, 0.7, 0.85),
                             emission_strength=1.0, roughness=0.05, alpha=0.65)
    m_av_bay = make_material("av_door", (0.2, 0.22, 0.25),
                             metallic=0.6, roughness=0.5)
    m_drone_pad = make_material("drone_pad_mark", (0.92, 0.92, 0.92),
                                metallic=0.1, roughness=0.6)

    # --- Main body ---
    add_box("body", W, D, H, m_white)

    # --- Glass curtain wall south facade ---
    add_box("glass_south", W, 0.5, H * 0.75, m_glass,
            location=(0, -D/2, H * 0.12))

    # --- Floor stripes (metal banding) ---
    band_mat = m_light
    for fi in range(1, 3):
        fz = fi * (H / 3)
        add_box(f"floor_band_{fi}", W + 0.3, D + 0.3, 0.35, band_mat,
                location=(0, 0, fz))

    # --- Rooftop test track (oval loop) ---
    track_mat = m_track
    track_z = H
    # Track is approximated as 4 straight sections and 4 curved ends
    # Straights along X
    for side, ty in [(-1, -(D/2 - 5)), (1, (D/2 - 5))]:
        add_box(f"track_straight_{side}", W - 20, 6.0, 0.3, track_mat,
                location=(0, side * (D/2 - 5), track_z))
    # Curved ends (approximated as short boxes)
    for side, ex in [(-1, -(W/2 - 10)), (1, (W/2 - 10))]:
        add_box(f"track_curve_{side}", 12.0, D - 10, 0.3, track_mat,
                location=(side * (W/2 - 8), 0, track_z))
    # Track markings (white stripes)
    for mi in range(5):
        mx = -W/2 + 14 + mi * (W - 30) / 4
        add_box(f"track_mark_{mi}", 0.6, 0.1, 0.35, m_drone_pad,
                location=(mx, -(D/2 - 5), track_z + 0.01))

    # --- Track safety barriers ---
    for side, ty in [(-1, -(D/2 - 2)), (1, (D/2 - 2))]:
        add_box(f"track_barrier_{side}", W - 14, 0.4, 1.2, m_barrier_orange,
                location=(0, side * (D/2 - 2), track_z))

    # --- Drone landing pads: 4 circular pads on roof ---
    drone_positions = [
        (-W/3, -D/3), (W/3, -D/3), (-W/3, D/3), (W/3, D/3)
    ]
    for dpi, (dpx, dpy) in enumerate(drone_positions):
        # Raised pad base
        add_cylinder(f"drone_pad_base_{dpi}", 4.5, 0.35, sections=32,
                     mat=m_orange, location=(dpx, dpy, track_z))
        # White pad surface
        add_disk(f"drone_pad_surface_{dpi}", 4.0, sections=32, mat=m_drone_pad,
                 location=(dpx, dpy, track_z + 0.36))
        # H marking (simplified)
        add_box(f"pad_h_v_{dpi}", 0.4, 2.8, 0.05, m_track,
                location=(dpx, dpy, track_z + 0.37))
        add_box(f"pad_h_h_{dpi}", 2.2, 0.4, 0.05, m_track,
                location=(dpx, dpy, track_z + 0.37))
        # Corner lights
        for cl, (clx, cly) in enumerate([
            (-3.0, -3.0), (3.0, -3.0), (3.0, 3.0), (-3.0, 3.0)
        ]):
            add_cylinder(f"drone_light_{dpi}_{cl}", 0.2, 0.6, sections=6,
                         mat=m_orange, location=(dpx + clx, dpy + cly, track_z + 0.35))

    # --- Autonomous vehicle bay: large doors on ground floor ---
    for bi in range(4):
        bx = -W/2 + 8 + bi * (W - 16) / 3
        add_box(f"av_door_{bi}", 7.5, 0.6, 4.5, m_av_bay,
                location=(bx, -D/2, 0))
        # Door frame highlight
        add_box(f"av_frame_{bi}", 8.0, 0.4, 5.0, m_white,
                location=(bx, -D/2 - 0.1, 0))

    # --- Outdoor mobility court: paved area south ---
    court_mat = make_material("mobility_court", (0.45, 0.48, 0.52),
                              metallic=0.1, roughness=0.75)
    add_box("mob_court", W + 10, 15.0, 0.2, court_mat,
            location=(0, -(D/2 + 7.5), 0))
    # Court markings
    for mi in range(5):
        mx = -W/2 + 8 + mi * (W - 16) / 4
        add_box(f"court_line_{mi}", 0.3, 14.5, 0.22, m_white,
                location=(mx, -(D/2 + 7.5), 0))

    # --- Drone flight ops tower: small box on roof ---
    ops_mat = make_material("ops_tower", (0.80, 0.82, 0.85),
                            metallic=0.6, roughness=0.25)
    add_box("ops_tower", 6.0, 4.0, 4.5, ops_mat,
            location=(0, -D/4, H))
    add_box("ops_tower_glass", 6.0, 4.0 + 0.2, 2.0, m_glass,
            location=(0, -D/4, H + 2.5))

    # --- Roof parapet ---
    add_box("parapet", W + 0.6, D + 0.6, 0.7, m_white,
            location=(0, 0, H))

    select_all_and_export(os.path.join(OUT_DIR, "nomad_nexus_mobility_lab.glb"))


# ===========================================================================
# BUILDING 24 — kinetic_energy_operations_center
# 61m × 45.7m × 9m, 2 floors, RESEARCH
# ===========================================================================

def build_kinetic_energy_operations_center():
    clear_scene()
    W, D, H = 61.0, 45.7, 9.0

    m_white     = make_material("light_metal", (0.90, 0.92, 0.93),
                                metallic=0.35, roughness=0.3)
    m_solar     = make_material("solar_panel", (0.04, 0.06, 0.12),
                                metallic=0.3, roughness=0.15)
    m_teal      = make_material("teal_energy", (0.0, 0.75, 0.65),
                                emission_color=(0.0, 0.85, 0.7),
                                emission_strength=3.5, roughness=0.3)
    m_green_glow = make_material("green_energy", (0.1, 0.9, 0.4),
                                 emission_color=(0.05, 0.95, 0.4),
                                 emission_strength=4.0, roughness=0.2)
    m_kinetic   = make_material("kinetic_tile", (0.75, 0.78, 0.82),
                                metallic=0.55, roughness=0.3)
    m_kinetic_glow = make_material("tile_glow", (0.0, 0.85, 0.65),
                                   emission_color=(0.0, 0.85, 0.65),
                                   emission_strength=5.0, roughness=0.2)
    m_frame     = make_material("canopy_frame", (0.70, 0.72, 0.75),
                                metallic=0.80, roughness=0.2)
    m_glass     = make_material("edu_glass", (0.6, 0.8, 0.75),
                                emission_color=(0.4, 0.7, 0.65),
                                emission_strength=1.2, roughness=0.05, alpha=0.7)
    m_screen    = make_material("energy_screen", (0.0, 0.6, 0.5),
                                emission_color=(0.0, 0.7, 0.55),
                                emission_strength=4.5, roughness=0.1)

    # --- Main body ---
    add_box("body", W, D, H, m_white)

    # --- Horizontal bands ---
    band_mat = make_material("band", (0.78, 0.80, 0.82),
                             metallic=0.4, roughness=0.3)
    add_box("floor_band", W + 0.3, D + 0.3, 0.35, band_mat,
            location=(0, 0, H / 2))

    # --- Solar canopy: large panel array over entry (south face) ---
    # Canopy support frame columns
    canopy_z = H + 0.5
    canopy_ext = 12.0   # how far it projects south beyond facade
    canopy_w   = W * 0.75
    for sci in range(5):
        scx = -canopy_w/2 + sci * canopy_w / 4
        add_cylinder(f"solar_col_{sci}", 0.35, canopy_z, sections=8, mat=m_frame,
                     location=(scx, -D/2, 0))
    # Primary canopy frame (thin box)
    add_box("solar_frame", canopy_w, canopy_ext + D * 0.2, 0.5, m_frame,
            location=(0, -(D/2 - D * 0.1) + (canopy_ext)/2 - canopy_ext/2,
                      canopy_z))

    # Solar panels (dark subdivided grid on canopy)
    panel_row_d = (canopy_ext + D * 0.2) / 4
    panel_cols  = int(canopy_w / 6)
    for pr in range(4):
        for pc in range(panel_cols):
            px = -canopy_w/2 + 0.2 + pc * 6.0 + 3.0
            py = -(D/2 - D * 0.1) - canopy_ext/2 + 0.2 + pr * panel_row_d + panel_row_d/2
            add_box(f"solar_panel_{pr}_{pc}", 5.5, panel_row_d - 0.3, 0.12,
                    m_solar, location=(px, py, canopy_z + 0.5))

    # Solar panel teal edge glow
    add_box("solar_glow_edge", canopy_w + 0.5, 0.3, 0.3, m_teal,
            location=(0, -(D/2 - D * 0.1) - canopy_ext + 0.6, canopy_z + 0.5))

    # --- Kinetic tile demo plaza (west side of building) ---
    plaza_w = 25.0
    plaza_d = 30.0
    plaza_x = -(W/2 + plaza_w/2 + 1)
    plaza_mat = make_material("plaza_base", (0.55, 0.58, 0.62),
                              metallic=0.1, roughness=0.7)
    add_box("plaza_floor", plaza_w, plaza_d, 0.25, plaza_mat,
            location=(plaza_x, 0, 0))

    # Kinetic tiles: 5×6 grid of glowing tiles
    tile_s = 4.0
    for tr in range(5):
        for tc in range(6):
            tx = plaza_x - plaza_w/2 + 2 + tc * tile_s
            ty = -plaza_d/2 + 2 + tr * (plaza_d - 4) / 4
            # Alternate between dim and glowing
            t_mat = m_kinetic_glow if (tr + tc) % 2 == 0 else m_kinetic
            add_box(f"ktile_{tr}_{tc}", tile_s - 0.25, tile_s - 0.25, 0.2,
                    t_mat, location=(tx + tile_s/2, ty, 0.25))

    # --- Energy monitoring displays: 3 large vertical screens on south facade ---
    for di in range(3):
        dx = -W/3 + di * W/3
        add_box(f"monitor_{di}", 5.5, 0.4, H * 0.55, m_screen,
                location=(dx, -D/2, H * 0.22))
        # Display frame
        add_box(f"monitor_frame_{di}", 5.9, 0.25, H * 0.59, m_frame,
                location=(dx, -D/2 - 0.1, H * 0.20))

    # --- Education zone wing (east side): glass-fronted lower volume ---
    edu_w = W * 0.28
    edu_h = H * 0.62
    add_box("edu_wing", edu_w, D, edu_h, m_white,
            location=(W/2 - edu_w/2, 0, 0))
    # Glass south face of edu wing
    add_box("edu_glass", edu_w, 0.5, edu_h, m_glass,
            location=(W/2 - edu_w/2, -D/2, 0))
    # Edu zone roof terrace
    add_box("edu_roof", edu_w + 0.5, D + 0.5, 0.4, m_frame,
            location=(W/2 - edu_w/2, 0, edu_h))

    # --- Teal accent strips ---
    add_box("teal_base", W, 0.5, 0.4, m_teal,
            location=(0, -D/2, 0.2))
    add_box("teal_eave", W, 0.5, 0.35, m_teal,
            location=(0, -D/2, H - 0.1))

    # --- HVAC / energy plant on roof ---
    plant_mat = make_material("energy_plant", (0.60, 0.62, 0.65),
                              metallic=0.6, roughness=0.4)
    add_box("energy_plant", W * 0.4, D * 0.3, 2.5, plant_mat,
            location=(W * 0.1, D * 0.2, H))
    # Plant exhaust vents
    for vi in range(3):
        vx = W * 0.1 - 6 + vi * 6
        add_cylinder(f"plant_vent_{vi}", 0.8, 3.0, sections=8, mat=m_teal,
                     location=(vx, D * 0.2 + 2, H + 2.5))

    # --- Roof parapet ---
    add_box("parapet", W + 0.6, D + 0.6, 0.7, m_white,
            location=(0, 0, H))

    select_all_and_export(os.path.join(OUT_DIR, "kinetic_energy_operations_center.glb"))


# ===========================================================================
# MAIN
# ===========================================================================

BUILDINGS = [
    ("sentinel_security_command",        build_sentinel_security_command),
    ("foundry_manufacturing_district",   build_foundry_manufacturing_district),
    ("juris_guard_center",               build_juris_guard_center),
    ("cognara_mind_institute",           build_cognara_mind_institute),
    ("signal_velocity_center",           build_signal_velocity_center),
    ("eon_core_systems_house",           build_eon_core_systems_house),
    ("nomad_nexus_mobility_lab",         build_nomad_nexus_mobility_lab),
    ("kinetic_energy_operations_center", build_kinetic_energy_operations_center),
]

print("\n" + "="*60)
print("  Collective AI Mega Campus — Buildings 17-24")
print("  Blender headless GLB generation")
print("="*60 + "\n")

success, failed = [], []
for bld_id, bld_fn in BUILDINGS:
    print(f"\n[BUILD] {bld_id}")
    try:
        bld_fn()
        success.append(bld_id)
        print(f"  [OK]  {bld_id}")
    except Exception as exc:
        import traceback
        print(f"  [ERR] {bld_id}: {exc}")
        traceback.print_exc()
        failed.append((bld_id, str(exc)))

print("\n" + "="*60)
print(f"  Completed: {len(success)}/{len(BUILDINGS)}")
if failed:
    print(f"  Failed: {len(failed)}")
    for fid, err in failed:
        print(f"    - {fid}: {err}")
print("="*60 + "\n")
