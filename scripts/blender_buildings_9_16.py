#!/usr/bin/env python3
"""
Blender Python script for generating highly-detailed 3D GLB models for buildings 9-16
of the Collective AI Mega Campus.

Buildings:
 9. vital_helix_bio_research_lab
10. civic_core
11. kinetic_edge_wellness_center
12. observatory_sky_deck
13. forge_materials_lab
14. aether_link_tower
15. habitat_eco_residential_commons
16. nexus_transportation_hub

Run with: blender --background --python blender_buildings_9_16.py
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

OUTPUT_DIR = "/home/user/Collective-AI-Inc-Mega-Campus-/assets/glb/buildings"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────
# UTILITY: clear scene
# ─────────────────────────────────────────────────────
def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for curve in list(bpy.data.curves):
        bpy.data.curves.remove(curve)


# ─────────────────────────────────────────────────────
# UTILITY: material creation
# ─────────────────────────────────────────────────────
def make_material(name, base_color=(0.5, 0.5, 0.5, 1.0),
                  roughness=0.4, metallic=0.1,
                  emit_color=None, emit_strength=0.0,
                  alpha=1.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic

    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        mat.blend_method = 'BLEND'

    if transmission > 0.0:
        bsdf.inputs['Transmission Weight'].default_value = transmission

    if emit_color and emit_strength > 0:
        bsdf.inputs['Emission Color'].default_value = emit_color
        bsdf.inputs['Emission Strength'].default_value = emit_strength

    return mat


# ─────────────────────────────────────────────────────
# UTILITY: primitive helpers
# ─────────────────────────────────────────────────────
def add_box(name, size=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc,
                                    rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return obj


def add_cylinder(name, radius=1.0, depth=2.0, verts=32,
                 loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth,
        location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    return obj


def add_cone(name, r1=1.0, r2=0.0, depth=2.0, verts=32,
             loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=r1, radius2=r2, depth=depth,
        location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    return obj


def add_sphere(name, radius=1.0, subdivisions=4, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    return obj


def add_uv_sphere(name, radius=1.0, segments=32, rings=16, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    return obj


def assign_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    return obj


def join_objects(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        if o and o.name in bpy.data.objects:
            o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = name
    return bpy.context.object


def export_glb(filepath):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True,
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
    )
    print(f"  Exported: {filepath}")


def add_bevel(obj, width=0.3, segments=2):
    mod = obj.modifiers.new("Bevel", 'BEVEL')
    mod.width = width
    mod.segments = segments
    return obj


def add_subdivision(obj, levels=1):
    mod = obj.modifiers.new("Subdiv", 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    return obj


# ─────────────────────────────────────────────────────
# BUILD DOME HALF-SPHERE MESH
# ─────────────────────────────────────────────────────
def add_dome(name, radius=10.0, rings=16, segments=32, loc=(0, 0, 0)):
    """Creates a hemisphere (top half of UV sphere)."""
    me = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    # Build UV sphere verts for top hemisphere only
    for ring in range(rings + 1):
        lat = math.pi / 2 * (ring / rings)  # 0 to pi/2
        for seg in range(segments):
            lon = 2 * math.pi * seg / segments
            x = radius * math.cos(lat) * math.cos(lon)
            y = radius * math.cos(lat) * math.sin(lon)
            z = radius * math.sin(lat)
            bm.verts.new((x, y, z))
    bm.verts.ensure_lookup_table()
    n = segments
    for ring in range(rings):
        for seg in range(n):
            v0 = ring * n + seg
            v1 = ring * n + (seg + 1) % n
            v2 = (ring + 1) * n + (seg + 1) % n
            v3 = (ring + 1) * n + seg
            bm.faces.new([bm.verts[v0], bm.verts[v1], bm.verts[v2], bm.verts[v3]])
    # Close bottom ring with disk cap
    cap_z = radius * math.sin(0)  # z at equator = 0 but lat starts at 0 here = equator
    # Actually at ring=0 we have the equator at lat=0 → z=0
    center = bm.verts.new((0, 0, 0))
    bm.verts.ensure_lookup_table()
    for seg in range(n):
        v0 = seg
        v1 = (seg + 1) % n
        bm.faces.new([center, bm.verts[v1], bm.verts[v0]])
    bm.to_mesh(me)
    bm.free()
    obj.location = loc
    return obj


# ─────────────────────────────────────────────────────
# BUILD ARCH CROSS-SECTION SWEEP
# ─────────────────────────────────────────────────────
def add_arch_sweep(name, span=20.0, rise=10.0, depth=5.0,
                   thickness=0.8, n_arch=16, loc=(0, 0, 0)):
    """Creates a single arch segment (half-circle extrusion)."""
    me = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    r_out = span / 2
    r_in = r_out - thickness
    segs = n_arch
    verts_out = []
    verts_in = []
    for i in range(segs + 1):
        angle = math.pi * i / segs  # 0 to pi (semicircle)
        x_o = r_out * math.cos(angle)
        z_o = r_out * math.sin(angle)
        x_i = r_in * math.cos(angle)
        z_i = r_in * math.sin(angle)
        verts_out.append(bm.verts.new((x_o, 0, z_o)))
        verts_in.append(bm.verts.new((x_i, 0, z_i)))
    # Extrude along Y
    geom_verts = verts_out + verts_in
    ret = bmesh.ops.extrude_vert_indiv(bm, verts=geom_verts)
    # Simple box approach instead - just use a shaped mesh
    bm.free()
    me2 = bpy.data.meshes.new(name + "_mesh")
    obj.data = me2
    bm2 = bmesh.new()
    half = depth / 2
    # Outer arch ring face front
    prev_o = None
    prev_i = None
    front_verts = []
    back_verts = []
    for i in range(segs + 1):
        angle = math.pi * i / segs
        x_o = r_out * math.cos(angle)
        z_o = r_out * math.sin(angle)
        x_i = r_in * math.cos(angle)
        z_i = max(0, r_in * math.sin(angle))
        front_verts.append((bm2.verts.new((x_o, -half, z_o)),
                            bm2.verts.new((x_i, -half, z_i))))
        back_verts.append((bm2.verts.new((x_o, half, z_o)),
                           bm2.verts.new((x_i, half, z_i))))
    bm2.verts.ensure_lookup_table()
    # Build faces
    for i in range(segs):
        fo, fi = front_verts[i]
        fo1, fi1 = front_verts[i + 1]
        bo, bi = back_verts[i]
        bo1, bi1 = back_verts[i + 1]
        # outer face
        bm2.faces.new([fo, fo1, bo1, bo])
        # inner face
        bm2.faces.new([fi1, fi, bi, bi1])
        # front face ring
        bm2.faces.new([fo, fi, fi1, fo1])
        # back face ring
        bm2.faces.new([bo1, bi1, bi, bo])
        # side bottom left
        if i == 0:
            bm2.faces.new([fo, bo, bi, fi])
        if i == segs - 1:
            bm2.faces.new([fo1, fi1, bi1, bo1])
    bm2.to_mesh(me2)
    bm2.free()
    obj.location = loc
    return obj


# ─────────────────────────────────────────────────────
# BUILDING 9: vital_helix_bio_research_lab
# ─────────────────────────────────────────────────────
def build_vital_helix_bio_research_lab():
    """
    85.3m x 54.9m x 13.5m, 3 floors, LIFE_SCIENCE
    White biomorphic plan, helix-referencing entry canopy
    Features: helix_entry_canopy, lab_wing_separation, biohazard_containment_visual, rooftop_plant
    Color: clean white cladding, ribbon windows, subtle green glow
    """
    print("Building: vital_helix_bio_research_lab")
    name = "vital_helix_bio_research_lab"
    objs = []

    # Materials
    white_cladding = make_material("bio_white_cladding",
                                   base_color=(0.92, 0.92, 0.90, 1.0),
                                   roughness=0.3, metallic=0.1)
    glass_ribbon = make_material("bio_glass_ribbon",
                                 base_color=(0.7, 0.95, 0.8, 1.0),
                                 roughness=0.1, metallic=0.05,
                                 emit_color=(0.2, 1.0, 0.4, 1.0),
                                 emit_strength=0.8,
                                 alpha=0.6, transmission=0.5)
    green_glow = make_material("bio_green_glow",
                                base_color=(0.1, 0.8, 0.3, 1.0),
                                roughness=0.2,
                                emit_color=(0.1, 1.0, 0.3, 1.0),
                                emit_strength=2.0)
    bio_containment = make_material("bio_containment",
                                     base_color=(0.15, 0.15, 0.12, 1.0),
                                     roughness=0.5, metallic=0.3,
                                     emit_color=(0.2, 1.0, 0.1, 1.0),
                                     emit_strength=1.2)
    roof_equip = make_material("bio_roof_equip",
                                base_color=(0.6, 0.6, 0.6, 1.0),
                                roughness=0.6, metallic=0.4)

    # Main body - biomorphic 3-floor lab (slightly tapered upper floors)
    w, d, h = 85.3, 54.9, 13.5
    floor_h = h / 3

    # Ground floor - widest
    gf = add_box("bio_ground_floor", (w, d, floor_h),
                 (0, 0, floor_h / 2))
    assign_mat(gf, white_cladding)
    objs.append(gf)

    # 1st floor setback
    f1 = add_box("bio_floor1", (w * 0.95, d * 0.95, floor_h),
                  (0, 0, floor_h + floor_h / 2))
    assign_mat(f1, white_cladding)
    objs.append(f1)

    # 2nd floor setback
    f2 = add_box("bio_floor2", (w * 0.88, d * 0.88, floor_h),
                  (0, 0, floor_h * 2 + floor_h / 2))
    assign_mat(f2, white_cladding)
    objs.append(f2)

    # Lab wing separation - a recessed connector between two wings
    wing_gap = add_box("bio_wing_gap", (12.0, d * 0.88, h + 0.2),
                        (0, 0, h / 2))
    assign_mat(wing_gap, glass_ribbon)
    objs.append(wing_gap)

    # West wing
    west_wing = add_box("bio_west_wing", (35.0, d, h * 0.85),
                         (-25.0, 0, h * 0.425))
    assign_mat(west_wing, white_cladding)
    objs.append(west_wing)

    # East wing
    east_wing = add_box("bio_east_wing", (35.0, d, h * 0.85),
                         (25.0, 0, h * 0.425))
    assign_mat(east_wing, white_cladding)
    objs.append(east_wing)

    # Ribbon windows - horizontal strips on each floor
    for floor_idx in range(3):
        z_win = floor_h * floor_idx + floor_h * 0.55
        for side_y in [-1, 1]:
            win = add_box(f"bio_ribbon_win_{floor_idx}_{side_y}",
                          (w * 0.9, 0.5, floor_h * 0.35),
                          (0, side_y * (d / 2 + 0.1), z_win))
            assign_mat(win, glass_ribbon)
            objs.append(win)

    # Helix entry canopy - DNA double-helix inspired spiraling canopy
    canopy_base_x = 0
    canopy_base_y = -(d / 2 + 8)
    canopy_base_z = 0

    # Two helical arms
    helix_mat = make_material("helix_canopy_mat",
                               base_color=(0.85, 0.92, 0.82, 1.0),
                               roughness=0.2, metallic=0.15,
                               emit_color=(0.3, 1.0, 0.5, 1.0),
                               emit_strength=0.6)

    n_helix = 12
    helix_r = 7.0
    helix_height = 10.0
    for i in range(n_helix):
        t = i / (n_helix - 1)
        angle_a = 2 * math.pi * t * 1.5  # 1.5 rotations
        angle_b = angle_a + math.pi      # Offset for second helix strand

        # Strand A
        x_a = canopy_base_x + helix_r * math.sin(angle_a)
        y_a = canopy_base_y + i * 1.2
        z_a = canopy_base_z + t * helix_height
        seg_a = add_cylinder(f"helix_seg_a_{i}", 0.4, 1.5,
                             loc=(x_a, y_a, z_a + 0.75))
        assign_mat(seg_a, helix_mat)
        objs.append(seg_a)

        # Strand B
        x_b = canopy_base_x + helix_r * math.sin(angle_b)
        y_b = canopy_base_y + i * 1.2
        z_b = canopy_base_z + t * helix_height
        seg_b = add_cylinder(f"helix_seg_b_{i}", 0.4, 1.5,
                             loc=(x_b, y_b, z_b + 0.75))
        assign_mat(seg_b, helix_mat)
        objs.append(seg_b)

        # Cross-links between strands every 2 steps
        if i % 2 == 0:
            mid_x = (x_a + x_b) / 2
            mid_y = (y_a + y_b) / 2
            mid_z = (z_a + z_b) / 2
            dist = math.sqrt((x_b - x_a) ** 2 + (z_b - z_a) ** 2 + 0.01)
            xlink = add_box(f"helix_xlink_{i}", (dist, 0.3, 0.3),
                            (mid_x, mid_y, mid_z))
            ang = math.atan2(z_b - z_a, x_b - x_a)
            xlink.rotation_euler[1] = -ang
            bpy.ops.object.transform_apply(rotation=True)
            assign_mat(xlink, green_glow)
            objs.append(xlink)

    # Biohazard containment visual - dark cylindrical tower
    contain = add_cylinder("bio_containment_tower", 8.0, 16.0, 32,
                           loc=(30.0, 18.0, 8.0))
    assign_mat(contain, bio_containment)
    objs.append(contain)

    contain_ring = add_cylinder("bio_contain_ring_glow", 8.5, 0.8, 32,
                                loc=(30.0, 18.0, 14.5))
    assign_mat(contain_ring, green_glow)
    objs.append(contain_ring)

    # Biohazard symbol - three arcs (simplified as three curved boxes)
    for idx, ang in enumerate([0, 2.094, 4.189]):
        arc_x = 30.0 + 4.0 * math.cos(ang)
        arc_y = 18.0 + 4.0 * math.sin(ang)
        bio_arc = add_cylinder(f"bio_symbol_{idx}", 1.5, 0.4, 16,
                               loc=(arc_x, arc_y, 16.2))
        assign_mat(bio_arc, green_glow)
        objs.append(bio_arc)

    # Rooftop plant equipment - HVAC units, cooling towers
    for i in range(4):
        x_hvac = -30.0 + i * 20.0
        hvac = add_box(f"bio_hvac_{i}", (6.0, 4.0, 3.0),
                       (x_hvac, -d / 2 + 8.0, h + 1.5))
        assign_mat(hvac, roof_equip)
        objs.append(hvac)

    # Cooling tower cylinders
    for i in range(3):
        ct = add_cylinder(f"bio_cool_tower_{i}", 2.5, 5.0, 16,
                          loc=(-20.0 + i * 20.0, d / 2 - 8.0, h + 2.5))
        assign_mat(ct, roof_equip)
        objs.append(ct)

    # Green wall panels on south face
    green_panel_mat = make_material("bio_green_panels",
                                     base_color=(0.12, 0.55, 0.18, 1.0),
                                     roughness=0.8)
    for i in range(8):
        gp = add_box(f"bio_green_panel_{i}", (9.0, 0.6, h * 0.8),
                     (-31.5 + i * 9.0, d / 2 + 0.4, h * 0.4))
        assign_mat(gp, green_panel_mat)
        objs.append(gp)

    return objs, name


# ─────────────────────────────────────────────────────
# BUILDING 10: civic_core
# ─────────────────────────────────────────────────────
def build_civic_core():
    """
    67.1m x 42.7m x 13.5m, 3 floors, CIVIC_CULTURAL
    Central glazed dome over main atrium, radiating colonnade
    Features: central_dome_atrium, public_plaza_ring, clock_tower_element, event_court
    Color: light stone/cream, glass dome glowing warm amber/gold
    """
    print("Building: civic_core")
    name = "civic_core"
    objs = []

    # Materials
    stone_cream = make_material("civic_stone",
                                 base_color=(0.88, 0.83, 0.72, 1.0),
                                 roughness=0.55, metallic=0.05)
    amber_glass = make_material("civic_amber_glass",
                                 base_color=(0.95, 0.75, 0.25, 1.0),
                                 roughness=0.05, metallic=0.02,
                                 emit_color=(1.0, 0.78, 0.2, 1.0),
                                 emit_strength=2.5,
                                 alpha=0.5, transmission=0.6)
    gold_accent = make_material("civic_gold",
                                 base_color=(0.9, 0.72, 0.15, 1.0),
                                 roughness=0.2, metallic=0.85,
                                 emit_color=(1.0, 0.8, 0.2, 1.0),
                                 emit_strength=0.8)
    white_col = make_material("civic_column",
                               base_color=(0.94, 0.93, 0.90, 1.0),
                               roughness=0.4, metallic=0.05)
    plaza_mat = make_material("civic_plaza",
                               base_color=(0.78, 0.75, 0.68, 1.0),
                               roughness=0.65)
    dark_metal = make_material("civic_dark_metal",
                                base_color=(0.15, 0.13, 0.12, 1.0),
                                roughness=0.3, metallic=0.7)
    clock_face = make_material("clock_face",
                                base_color=(0.95, 0.90, 0.78, 1.0),
                                roughness=0.3,
                                emit_color=(1.0, 0.9, 0.6, 1.0),
                                emit_strength=1.5)

    w, d, h = 67.1, 42.7, 13.5
    floor_h = h / 3

    # Main civic body
    main_body = add_box("civic_main_body", (w, d, h), (0, 0, h / 2))
    assign_mat(main_body, stone_cream)
    objs.append(main_body)

    # Horizontal banding / cornices at each floor
    for fl in range(3):
        z_band = (fl + 1) * floor_h
        band = add_box(f"civic_cornice_{fl}", (w + 0.8, d + 0.8, 0.5),
                       (0, 0, z_band))
        assign_mat(band, gold_accent)
        objs.append(band)

    # Central dome atrium - large glazed dome on top center
    dome_r = min(w, d) * 0.32  # ~13.7m radius
    dome = add_dome("civic_dome", radius=dome_r, rings=18, segments=36,
                    loc=(0, 0, h))
    assign_mat(dome, amber_glass)
    objs.append(dome)

    # Dome base ring
    dome_ring = add_cylinder("civic_dome_ring", dome_r + 1.0, 1.8, 48,
                              loc=(0, 0, h + 0.9))
    assign_mat(dome_ring, gold_accent)
    objs.append(dome_ring)

    # Dome lantern on top
    lantern = add_cylinder("civic_lantern", 2.5, 4.0, 16,
                           loc=(0, 0, h + dome_r + 2.0))
    assign_mat(lantern, amber_glass)
    objs.append(lantern)

    lantern_top = add_cone("civic_lantern_top", 3.0, 0.3, 2.5, 16,
                           loc=(0, 0, h + dome_r + 4.5))
    assign_mat(lantern_top, gold_accent)
    objs.append(lantern_top)

    # Radiating colonnade - columns around the dome on roof level
    n_cols = 16
    col_ring_r = dome_r + 5.5
    for i in range(n_cols):
        ang = 2 * math.pi * i / n_cols
        cx = col_ring_r * math.cos(ang)
        cy = col_ring_r * math.sin(ang)
        col = add_cylinder(f"civic_col_{i}", 0.7, h + 0.5, 16,
                           loc=(cx, cy, (h + 0.5) / 2))
        assign_mat(col, white_col)
        objs.append(col)
        # Capital on top
        cap = add_box(f"civic_cap_{i}", (1.8, 1.8, 0.5),
                      (cx, cy, h + 0.5))
        assign_mat(cap, white_col)
        objs.append(cap)

    # Front colonnade facade - columns on south face
    n_front = 10
    front_y = -(d / 2)
    for i in range(n_front):
        fx = -w / 2 + 5.0 + i * (w - 10.0) / (n_front - 1)
        fc = add_cylinder(f"civic_front_col_{i}", 1.0, h + 2.0, 16,
                          loc=(fx, front_y - 4.5, (h + 2.0) / 2))
        assign_mat(fc, white_col)
        objs.append(fc)

    # Front entablature beam across top of columns
    entab = add_box("civic_entablature", (w + 0.5, 2.5, 1.5),
                    (0, front_y - 4.5, h + 1.5))
    assign_mat(entab, white_col)
    objs.append(entab)

    # Public plaza ring - ground level paved area around building
    plaza = add_box("civic_plaza_ring", (w + 22.0, d + 22.0, 0.3),
                    (0, 0, -0.15))
    assign_mat(plaza, plaza_mat)
    objs.append(plaza)

    # Plaza paving pattern - radiating lines
    for i in range(8):
        ang = 2 * math.pi * i / 8
        pl_x = (w / 2 + 6) * math.cos(ang)
        pl_y = (d / 2 + 6) * math.sin(ang)
        pl_line = add_box(f"civic_plaza_line_{i}",
                          (math.sqrt(pl_x ** 2 + pl_y ** 2) * 1.5, 0.4, 0.05),
                          (pl_x / 2, pl_y / 2, 0.2))
        pl_line.rotation_euler[2] = ang
        bpy.ops.object.transform_apply(rotation=True)
        assign_mat(pl_line, gold_accent)
        objs.append(pl_line)

    # Clock tower element - on northwest corner
    ct_x = -(w / 2 - 5.0)
    ct_y = (d / 2 - 5.0)
    ct_base = add_box("civic_clock_base", (10.0, 10.0, h + 8.0),
                      (ct_x, ct_y, (h + 8.0) / 2))
    assign_mat(ct_base, stone_cream)
    objs.append(ct_base)

    # Clock faces on all 4 sides of tower
    for idx, (cang, off_x, off_y) in enumerate([
        (0, 0, 5.2), (1.571, 5.2, 0), (3.142, 0, -5.2), (4.712, -5.2, 0)
    ]):
        cf = add_cylinder(f"civic_clock_face_{idx}", 3.5, 0.3, 24,
                          loc=(ct_x + off_x, ct_y + off_y, h + 4.0),
                          rot=(1.5708, 0, cang))
        assign_mat(cf, clock_face)
        objs.append(cf)

    # Tower top
    ct_top = add_cone("civic_clock_top", 6.5, 0.5, 5.0, 16,
                      loc=(ct_x, ct_y, h + 8.0 + 2.5))
    assign_mat(ct_top, dark_metal)
    objs.append(ct_top)

    # Event court - outdoor amphitheater steps on east side
    for step in range(5):
        step_obj = add_box(f"civic_step_{step}",
                           (20.0 - step * 2, d / 3 + step * 2.0, 0.4),
                           (w / 2 + 8 + step * 1.2, 0, step * 0.4 + 0.2))
        assign_mat(step_obj, stone_cream)
        objs.append(step_obj)

    # Decorative arched windows
    for floor_idx in range(3):
        z_win = floor_idx * floor_h + floor_h * 0.5
        for side in [-1, 1]:
            for win_i in range(5):
                x_win = -w * 0.38 + win_i * (w * 0.76 / 4)
                arch_win = add_cylinder(f"civic_arch_win_{floor_idx}_{side}_{win_i}",
                                        1.5, floor_h * 0.65, 8,
                                        loc=(x_win, side * (d / 2 + 0.15),
                                             z_win))
                assign_mat(arch_win, amber_glass)
                objs.append(arch_win)

    return objs, name


# ─────────────────────────────────────────────────────
# BUILDING 11: kinetic_edge_wellness_center
# ─────────────────────────────────────────────────────
def build_kinetic_edge_wellness_center():
    """
    97.5m x 67.1m x 10m, 2 floors, WELLNESS_RECREATION
    Large-span curved shell roof, pool wing with tall clerestory
    Features: curved_shell_roof, pool_glazing, fitness_court, outdoor_terrace
    Color: white metal curved roof, full perimeter glazing glowing aqua/blue
    """
    print("Building: kinetic_edge_wellness_center")
    name = "kinetic_edge_wellness_center"
    objs = []

    # Materials
    white_metal = make_material("wellness_white_metal",
                                 base_color=(0.90, 0.92, 0.92, 1.0),
                                 roughness=0.2, metallic=0.6)
    aqua_glass = make_material("wellness_aqua_glass",
                                base_color=(0.1, 0.8, 0.9, 1.0),
                                roughness=0.05, metallic=0.0,
                                emit_color=(0.05, 0.9, 1.0, 1.0),
                                emit_strength=2.0,
                                alpha=0.5, transmission=0.6)
    pool_water = make_material("pool_water",
                                base_color=(0.02, 0.6, 0.8, 1.0),
                                roughness=0.05, metallic=0.0,
                                emit_color=(0.0, 0.7, 0.9, 1.0),
                                emit_strength=1.5,
                                alpha=0.7, transmission=0.5)
    dark_frame = make_material("wellness_frame",
                                base_color=(0.08, 0.08, 0.09, 1.0),
                                roughness=0.3, metallic=0.8)
    terrace_mat = make_material("wellness_terrace",
                                 base_color=(0.72, 0.70, 0.68, 1.0),
                                 roughness=0.7)
    fitness_mat = make_material("wellness_fitness_floor",
                                 base_color=(0.85, 0.30, 0.10, 1.0),
                                 roughness=0.8)

    w, d, h = 97.5, 67.1, 10.0
    floor_h = h / 2

    # Structural base slab
    base = add_box("wellness_base", (w, d, 0.5), (0, 0, 0.25))
    assign_mat(base, white_metal)
    objs.append(base)

    # Lower floor / plinth
    ground_floor = add_box("wellness_ground_floor", (w, d, floor_h),
                           (0, 0, floor_h / 2))
    assign_mat(ground_floor, white_metal)
    objs.append(ground_floor)

    # Upper floor (partial - setback)
    upper_floor = add_box("wellness_upper", (w * 0.7, d * 0.6, floor_h),
                          (0, 0, floor_h + floor_h / 2))
    assign_mat(upper_floor, white_metal)
    objs.append(upper_floor)

    # Curved shell roof - main spanning roof over atrium
    # Approximated as a series of curved ribs + skin panels
    n_ribs = 20
    roof_span = w
    roof_depth = d * 0.8
    roof_rise = h * 0.9  # how high the arch rises above h
    rib_thickness = 0.6

    for i in range(n_ribs + 1):
        t = i / n_ribs
        x = -roof_span / 2 + t * roof_span
        # Parabolic rise: z = rise * 4 * t*(1-t)
        z_top = h + roof_rise * 4 * t * (1 - t)
        z_base = h

        # Rib arch
        rib_h = z_top - z_base + 0.4
        rib = add_box(f"wellness_rib_{i}",
                      (rib_thickness, roof_depth, rib_h),
                      (x, 0, z_base + rib_h / 2 - 0.2))
        assign_mat(rib, white_metal)
        objs.append(rib)

    # Roof skin panels between ribs
    for i in range(n_ribs):
        t = (i + 0.5) / n_ribs
        x = -roof_span / 2 + t * roof_span
        z_top = h + roof_rise * 4 * t * (1 - t)
        panel_w = roof_span / n_ribs
        panel = add_box(f"wellness_roof_panel_{i}",
                        (panel_w, roof_depth + 0.5, 0.25),
                        (x, 0, z_top + 0.1))
        assign_mat(panel, white_metal)
        objs.append(panel)

    # Pool wing - east side, with tall clerestory
    pool_w = w * 0.38
    pool_d = d * 0.72
    pool_h = h * 1.35  # taller than main building

    pool_wing = add_box("wellness_pool_wing", (pool_w, pool_d, pool_h),
                        (w / 2 - pool_w / 2 + 2, 0, pool_h / 2))
    assign_mat(pool_wing, dark_frame)
    objs.append(pool_wing)

    # Pool glazing walls (clerestory)
    for side in [-1, 1]:
        pg = add_box(f"wellness_pool_glass_{side}",
                     (pool_w, 0.5, pool_h * 0.7),
                     (w / 2 - pool_w / 2 + 2,
                      side * (pool_d / 2 + 0.2),
                      pool_h * 0.5 + pool_h * 0.15))
        assign_mat(pg, aqua_glass)
        objs.append(pg)

    # Pool itself
    pool_surface = add_box("wellness_pool_water", (pool_w - 4.0, pool_d - 6.0, 0.2),
                           (w / 2 - pool_w / 2 + 2, 0, 0.4))
    assign_mat(pool_surface, pool_water)
    objs.append(pool_surface)

    # Full perimeter glazing strip (blue glow)
    for side_y in [-1, 1]:
        perim = add_box(f"wellness_perim_{side_y}",
                        (w * 0.65, 0.5, floor_h * 0.6),
                        (0, side_y * (d / 2 + 0.2), floor_h * 0.7))
        assign_mat(perim, aqua_glass)
        objs.append(perim)

    for side_x in [-1, 1]:
        perim_x = add_box(f"wellness_perim_x_{side_x}",
                          (0.5, d, floor_h * 0.6),
                          (side_x * (w * 0.32 + 0.2), 0, floor_h * 0.7))
        assign_mat(perim_x, aqua_glass)
        objs.append(perim_x)

    # Fitness court - south wing, open-air with rubber flooring
    fc_w = w * 0.3
    fc_d = d * 0.4
    fitness_court = add_box("wellness_fitness_court", (fc_w, fc_d, 0.15),
                            (-w / 2 + fc_w / 2 + 2.0,
                             -d / 2 - fc_d / 2 - 3.0, 0.1))
    assign_mat(fitness_court, fitness_mat)
    objs.append(fitness_court)

    # Court perimeter wall
    for idx, (fw, fd, fx, fy) in enumerate([
        (fc_w, 0.5, -w / 2 + fc_w / 2 + 2.0, -d / 2 - fc_d - 3.0),
        (fc_w, 0.5, -w / 2 + fc_w / 2 + 2.0, -d / 2 - 3.5),
        (0.5, fc_d, -w / 2 + 2.5, -d / 2 - fc_d / 2 - 3.0),
        (0.5, fc_d, -w / 2 + fc_w + 1.5, -d / 2 - fc_d / 2 - 3.0),
    ]):
        cw = add_box(f"court_wall_{idx}", (fw, fd, 2.5), (fx, fy, 1.25))
        assign_mat(cw, dark_frame)
        objs.append(cw)

    # Outdoor terrace - west side elevated deck
    terrace = add_box("wellness_terrace", (w * 0.28, d, 0.4),
                      (-w / 2 - w * 0.14, 0, h + 0.2))
    assign_mat(terrace, terrace_mat)
    objs.append(terrace)

    # Terrace railing
    for rail_y in [-d / 2, d / 2]:
        rail = add_box(f"wellness_rail_{rail_y:.0f}",
                       (w * 0.28, 0.15, 1.1),
                       (-w / 2 - w * 0.14, rail_y, h + 0.95))
        assign_mat(rail, white_metal)
        objs.append(rail)

    # Terrace columns
    for tc_i in range(5):
        tc_x = -w / 2 - w * 0.28 + tc_i * (w * 0.28 / 4)
        tc = add_cylinder(f"wellness_terrace_col_{tc_i}", 0.5, h + 0.4, 12,
                          loc=(tc_x, 0, (h + 0.4) / 2))
        assign_mat(tc, white_metal)
        objs.append(tc)

    return objs, name


# ─────────────────────────────────────────────────────
# BUILDING 12: observatory_sky_deck
# ─────────────────────────────────────────────────────
def build_observatory_sky_deck():
    """
    48.8m x 30.5m x 10m, 2 floors, WELLNESS_RECREATION
    Compact observatory with signature silver dome, surrounding sky-deck terrace
    Features: observatory_dome, sky_deck_terrace, telescope_housing, public_viewpoint
    Color: dark glass base, bright silver dome, blue observation deck lights
    """
    print("Building: observatory_sky_deck")
    name = "observatory_sky_deck"
    objs = []

    # Materials
    dark_glass = make_material("obs_dark_glass",
                                base_color=(0.05, 0.08, 0.12, 1.0),
                                roughness=0.1, metallic=0.05,
                                emit_color=(0.05, 0.2, 0.5, 1.0),
                                emit_strength=0.5,
                                alpha=0.4, transmission=0.5)
    silver_dome_mat = make_material("obs_silver_dome",
                                     base_color=(0.82, 0.84, 0.86, 1.0),
                                     roughness=0.1, metallic=0.9)
    blue_deck = make_material("obs_blue_deck",
                               base_color=(0.05, 0.25, 0.7, 1.0),
                               roughness=0.4,
                               emit_color=(0.1, 0.4, 1.0, 1.0),
                               emit_strength=1.8)
    blue_light_strip = make_material("obs_blue_strip",
                                      base_color=(0.1, 0.5, 1.0, 1.0),
                                      roughness=0.2,
                                      emit_color=(0.05, 0.45, 1.0, 1.0),
                                      emit_strength=4.0)
    white_struct = make_material("obs_structure",
                                  base_color=(0.88, 0.88, 0.90, 1.0),
                                  roughness=0.3, metallic=0.4)
    telescope_mat = make_material("obs_telescope",
                                   base_color=(0.18, 0.18, 0.22, 1.0),
                                   roughness=0.3, metallic=0.7)
    rail_mat = make_material("obs_railing",
                              base_color=(0.6, 0.65, 0.7, 1.0),
                              roughness=0.3, metallic=0.8)

    w, d, h = 48.8, 30.5, 10.0
    floor_h = h / 2

    # Ground floor - dark glass base
    ground = add_box("obs_ground", (w, d, floor_h), (0, 0, floor_h / 2))
    assign_mat(ground, dark_glass)
    objs.append(ground)

    # Upper floor - narrower, structural
    upper = add_box("obs_upper", (w * 0.85, d * 0.85, floor_h),
                    (0, 0, floor_h + floor_h / 2))
    assign_mat(upper, white_struct)
    objs.append(upper)

    # Sky-deck terrace - roof level flat deck wrapping entire building
    deck_w = w + 12.0
    deck_d = d + 12.0
    terrace = add_box("obs_sky_deck", (deck_w, deck_d, 0.35),
                      (0, 0, h + 0.175))
    assign_mat(terrace, blue_deck)
    objs.append(terrace)

    # Deck light strips around perimeter
    for side_y in [-1, 1]:
        ls = add_box(f"obs_light_strip_y_{side_y}",
                     (deck_w, 0.3, 0.15),
                     (0, side_y * deck_d / 2, h + 0.42))
        assign_mat(ls, blue_light_strip)
        objs.append(ls)
    for side_x in [-1, 1]:
        ls = add_box(f"obs_light_strip_x_{side_x}",
                     (0.3, deck_d, 0.15),
                     (side_x * deck_w / 2, 0, h + 0.42))
        assign_mat(ls, blue_light_strip)
        objs.append(ls)

    # Terrace railing
    railing_h = 1.2
    for idx, (rw, rd, rx, ry) in enumerate([
        (deck_w, 0.12, 0, deck_d / 2),
        (deck_w, 0.12, 0, -deck_d / 2),
        (0.12, deck_d, deck_w / 2, 0),
        (0.12, deck_d, -deck_w / 2, 0),
    ]):
        rail = add_box(f"obs_rail_{idx}", (rw, rd, railing_h),
                       (rx, ry, h + 0.35 + railing_h / 2))
        assign_mat(rail, rail_mat)
        objs.append(rail)

    # Observatory dome - large silver hemisphere
    dome_r = min(w, d) * 0.42  # ~12.8m
    dome = add_dome("obs_dome", radius=dome_r, rings=20, segments=40,
                    loc=(0, 0, h + 0.35))
    assign_mat(dome, silver_dome_mat)
    objs.append(dome)

    # Dome base collar
    collar = add_cylinder("obs_dome_collar", dome_r + 0.8, 1.5, 48,
                          loc=(0, 0, h + 1.1))
    assign_mat(collar, white_struct)
    objs.append(collar)

    # Dome shutter opening (slit along one face)
    slit = add_box("obs_dome_slit", (2.5, dome_r * 1.0, dome_r * 0.6),
                   (0, dome_r * 0.4, h + 0.35 + dome_r * 0.5))
    assign_mat(slit, dark_glass)
    objs.append(slit)

    # Telescope housing inside dome (visible stub)
    tel_housing = add_cylinder("obs_telescope_housing", 3.0, dome_r * 0.8, 24,
                               loc=(0, 0, h + 0.35 + dome_r * 0.4))
    tel_housing.rotation_euler[1] = 0.52  # ~30 deg tilt
    bpy.ops.object.transform_apply(rotation=True)
    assign_mat(tel_housing, telescope_mat)
    objs.append(tel_housing)

    # Telescope tube (longer barrel)
    tel_tube = add_cylinder("obs_telescope_tube", 1.2, dome_r * 1.2, 16,
                            loc=(0, 3.0, h + 0.35 + dome_r * 0.6))
    tel_tube.rotation_euler[1] = 0.52
    bpy.ops.object.transform_apply(rotation=True)
    assign_mat(tel_tube, telescope_mat)
    objs.append(tel_tube)

    # Telescope eyepiece end
    ep = add_cylinder("obs_eyepiece", 1.8, 1.5, 12,
                      loc=(0, 6.0, h + 0.35 + dome_r * 0.8))
    assign_mat(ep, telescope_mat)
    objs.append(ep)

    # Public viewpoint platform - raised area on terrace
    view_plat = add_box("obs_viewpoint_platform", (12.0, 8.0, 0.6),
                        (-deck_w / 2 + 8.0, 0, h + 0.7))
    assign_mat(view_plat, white_struct)
    objs.append(view_plat)

    # Viewpoint indicator lights
    for vp_i in range(4):
        vp_l = add_cylinder(f"obs_viewpt_light_{vp_i}", 0.3, 1.0, 8,
                            loc=(-deck_w / 2 + 4.0 + vp_i * 3.5, 0,
                                 h + 1.3))
        assign_mat(vp_l, blue_light_strip)
        objs.append(vp_l)

    # Window strips on ground floor
    for side_y in [-1, 1]:
        wstrip = add_box(f"obs_win_strip_{side_y}",
                         (w * 0.85, 0.4, floor_h * 0.5),
                         (0, side_y * (d / 2 + 0.15), floor_h * 0.65))
        assign_mat(wstrip, dark_glass)
        objs.append(wstrip)

    return objs, name


# ─────────────────────────────────────────────────────
# BUILDING 13: forge_materials_lab
# ─────────────────────────────────────────────────────
def build_forge_materials_lab():
    """
    91.4m x 54.9m x 11m, 2 floors, RESEARCH
    Warm corten-toned metal cladding, exposed testing bays
    Features: testing_bays, material_test_yard, forge_equipment_visible, specimen_storage
    Color: warm orange/brown corten metal, orange glow from forge
    """
    print("Building: forge_materials_lab")
    name = "forge_materials_lab"
    objs = []

    # Materials
    corten = make_material("forge_corten",
                            base_color=(0.55, 0.28, 0.08, 1.0),
                            roughness=0.75, metallic=0.4)
    corten_dark = make_material("forge_corten_dark",
                                 base_color=(0.35, 0.16, 0.04, 1.0),
                                 roughness=0.80, metallic=0.35)
    forge_glow = make_material("forge_glow",
                                base_color=(1.0, 0.45, 0.05, 1.0),
                                roughness=0.3,
                                emit_color=(1.0, 0.4, 0.0, 1.0),
                                emit_strength=4.0)
    forge_orange = make_material("forge_orange",
                                  base_color=(0.9, 0.38, 0.04, 1.0),
                                  roughness=0.5,
                                  emit_color=(1.0, 0.5, 0.1, 1.0),
                                  emit_strength=1.5)
    dark_steel = make_material("forge_dark_steel",
                                base_color=(0.12, 0.12, 0.14, 1.0),
                                roughness=0.4, metallic=0.85)
    test_yard_mat = make_material("forge_test_yard",
                                   base_color=(0.3, 0.22, 0.14, 1.0),
                                   roughness=0.9)
    storage_mat = make_material("forge_specimen_storage",
                                 base_color=(0.22, 0.22, 0.24, 1.0),
                                 roughness=0.5, metallic=0.5)
    exhaust_mat = make_material("forge_exhaust",
                                 base_color=(0.18, 0.18, 0.18, 1.0),
                                 roughness=0.5, metallic=0.7)

    w, d, h = 91.4, 54.9, 11.0
    floor_h = h / 2

    # Main forge body - two floors
    main = add_box("forge_main", (w, d, h), (0, 0, h / 2))
    assign_mat(main, corten)
    objs.append(main)

    # Horizontal corten cladding panels (horizontal ribbing)
    for i in range(8):
        z_rib = i * (h / 7)
        for side_y in [-1, 1]:
            rib = add_box(f"forge_rib_{i}_{side_y}",
                          (w, d * 0.01, 0.15),
                          (0, side_y * (d / 2 + 0.05), z_rib))
            assign_mat(rib, corten_dark)
            objs.append(rib)

    # Testing bays - 4 large industrial bays on north face
    n_bays = 4
    bay_w = (w * 0.85) / n_bays
    bay_h = h * 0.75
    bay_d = 12.0

    for i in range(n_bays):
        bx = -w * 0.425 + bay_w * 0.5 + i * bay_w
        # Bay opening (dark recessed)
        bay = add_box(f"forge_bay_{i}", (bay_w - 1.0, bay_d, bay_h),
                      (bx, d / 2 + bay_d / 2, bay_h / 2))
        assign_mat(bay, dark_steel)
        objs.append(bay)

        # Bay door frame (orange glow around opening)
        door_frame_top = add_box(f"forge_bay_frame_top_{i}",
                                  (bay_w - 0.8, 0.4, 0.5),
                                  (bx, d / 2 + 0.3, bay_h))
        assign_mat(door_frame_top, forge_glow)
        objs.append(door_frame_top)

        for side_x in [-1, 1]:
            door_frame_side = add_box(f"forge_bay_frame_side_{i}_{side_x}",
                                       (0.4, 0.4, bay_h),
                                       (bx + side_x * (bay_w / 2 - 0.2),
                                        d / 2 + 0.3, bay_h / 2))
            assign_mat(door_frame_side, forge_glow)
            objs.append(door_frame_side)

        # Forge equipment inside bay - visible furnace/press shapes
        furnace = add_box(f"forge_furnace_{i}", (bay_w * 0.5, bay_d * 0.4, bay_h * 0.6),
                          (bx, d / 2 + bay_d * 0.6, bay_h * 0.3))
        assign_mat(furnace, corten_dark)
        objs.append(furnace)

        # Furnace door glow
        fdoor = add_box(f"forge_fdoor_{i}", (bay_w * 0.2, 0.3, bay_h * 0.15),
                        (bx, d / 2 + bay_d * 0.4 + 0.3, bay_h * 0.2))
        assign_mat(fdoor, forge_glow)
        objs.append(fdoor)

    # Material test yard - south side, open test area
    yard = add_box("forge_test_yard_slab", (w * 0.6, 25.0, 0.3),
                   (0, -(d / 2 + 12.5), 0.15))
    assign_mat(yard, test_yard_mat)
    objs.append(yard)

    # Specimen storage blocks
    for si in range(6):
        sx = -w * 0.25 + si * (w * 0.5 / 5)
        storage = add_box(f"forge_specimen_{si}", (6.0, 5.0, 4.0),
                          (sx, -(d / 2 + 8.0), 2.0))
        assign_mat(storage, storage_mat)
        objs.append(storage)

    # Exhaust stacks on roof
    for es_i in range(3):
        ex = -w * 0.2 + es_i * (w * 0.2)
        stack = add_cylinder(f"forge_exhaust_stack_{es_i}", 2.5, 8.0, 16,
                             loc=(ex, d / 2 - 8.0, h + 4.0))
        assign_mat(stack, exhaust_mat)
        objs.append(stack)

        # Stack cap
        cap = add_cone(f"forge_stack_cap_{es_i}", 3.5, 2.0, 0.8, 12,
                       loc=(ex, d / 2 - 8.0, h + 8.5))
        assign_mat(cap, corten_dark)
        objs.append(cap)

        # Glow ring at stack base
        gring = add_cylinder(f"forge_glow_ring_{es_i}", 2.8, 0.4, 20,
                             loc=(ex, d / 2 - 8.0, h + 0.5))
        assign_mat(gring, forge_orange)
        objs.append(gring)

    # Crane rail overhead (two I-beams)
    for cr_i in range(2):
        crane_rail = add_box(f"forge_crane_rail_{cr_i}",
                             (w * 0.9, 0.4, 0.6),
                             (0, -d * 0.15 + cr_i * d * 0.3, h + 0.3))
        assign_mat(crane_rail, dark_steel)
        objs.append(crane_rail)

    # Crane trolley
    trolley = add_box("forge_crane_trolley", (3.0, d * 0.3, 1.2),
                      (-w * 0.15, 0, h + 1.2))
    assign_mat(trolley, dark_steel)
    objs.append(trolley)

    return objs, name


# ─────────────────────────────────────────────────────
# BUILDING 14: aether_link_tower
# ─────────────────────────────────────────────────────
def build_aether_link_tower():
    """
    36.6m x 36.6m x 22m (+ 30m mast), 4 floors, CORPORATE_TOWER
    Square plan rotated 45°, polished glass, communications mast extends 30m above roof
    Features: communications_mast, observation_floor, beacon_lighting, rotated_plan
    Color: polished glass (mirror), blue beacon at mast top, landmark building
    """
    print("Building: aether_link_tower")
    name = "aether_link_tower"
    objs = []

    # Materials
    mirror_glass = make_material("aether_mirror_glass",
                                  base_color=(0.75, 0.85, 0.95, 1.0),
                                  roughness=0.05, metallic=0.9,
                                  emit_color=(0.3, 0.65, 1.0, 1.0),
                                  emit_strength=0.4,
                                  alpha=0.7, transmission=0.3)
    blue_beacon = make_material("aether_blue_beacon",
                                 base_color=(0.1, 0.4, 1.0, 1.0),
                                 roughness=0.1,
                                 emit_color=(0.05, 0.3, 1.0, 1.0),
                                 emit_strength=8.0)
    steel_mast = make_material("aether_steel_mast",
                                base_color=(0.75, 0.78, 0.82, 1.0),
                                roughness=0.2, metallic=0.95)
    obs_floor = make_material("aether_obs_floor",
                               base_color=(0.12, 0.16, 0.22, 1.0),
                               roughness=0.2, metallic=0.6,
                               emit_color=(0.1, 0.4, 0.9, 1.0),
                               emit_strength=1.2)
    base_mat = make_material("aether_base",
                              base_color=(0.08, 0.08, 0.1, 1.0),
                              roughness=0.2, metallic=0.5)
    dish_mat = make_material("aether_dish",
                              base_color=(0.7, 0.72, 0.75, 1.0),
                              roughness=0.2, metallic=0.85)
    accent_ring = make_material("aether_accent_ring",
                                 base_color=(0.3, 0.6, 1.0, 1.0),
                                 roughness=0.15,
                                 emit_color=(0.2, 0.5, 1.0, 1.0),
                                 emit_strength=2.5)

    w, d, h = 36.6, 36.6, 22.0
    mast_h = 30.0
    floor_h = h / 4

    # Main tower body - rotated 45 degrees
    main_tower = add_box("aether_main_tower", (w, d, h),
                         (0, 0, h / 2))
    main_tower.rotation_euler[2] = math.radians(45)
    bpy.ops.object.transform_apply(rotation=True)
    assign_mat(main_tower, mirror_glass)
    objs.append(main_tower)

    # Floor setbacks - each floor slightly narrower
    for fl in range(1, 4):
        scale = 1.0 - fl * 0.04
        fl_body = add_box(f"aether_fl_{fl}",
                          (w * scale, d * scale, h * 0.02),
                          (0, 0, fl * floor_h))
        fl_body.rotation_euler[2] = math.radians(45)
        bpy.ops.object.transform_apply(rotation=True)
        assign_mat(fl_body, accent_ring)
        objs.append(fl_body)

    # Observation floor - wider slab at h * 0.75
    obs_z = h * 0.78
    obs_slab = add_box("aether_obs_slab", (w * 1.2, d * 1.2, floor_h * 0.5),
                       (0, 0, obs_z))
    obs_slab.rotation_euler[2] = math.radians(45)
    bpy.ops.object.transform_apply(rotation=True)
    assign_mat(obs_slab, obs_floor)
    objs.append(obs_slab)

    # Observation deck cantilevered glass
    obs_glass = add_box("aether_obs_glass", (w * 1.15, d * 1.15, floor_h * 0.8),
                        (0, 0, obs_z + floor_h * 0.5))
    obs_glass.rotation_euler[2] = math.radians(45)
    bpy.ops.object.transform_apply(rotation=True)
    assign_mat(obs_glass, mirror_glass)
    objs.append(obs_glass)

    # Roof cap
    roof_cap = add_box("aether_roof_cap", (w * 0.8, d * 0.8, floor_h * 0.4),
                       (0, 0, h + 0.2))
    roof_cap.rotation_euler[2] = math.radians(45)
    bpy.ops.object.transform_apply(rotation=True)
    assign_mat(roof_cap, base_mat)
    objs.append(roof_cap)

    # Base plinth
    plinth = add_box("aether_plinth", (w * 1.25, d * 1.25, 2.0), (0, 0, 1.0))
    plinth.rotation_euler[2] = math.radians(45)
    bpy.ops.object.transform_apply(rotation=True)
    assign_mat(plinth, base_mat)
    objs.append(plinth)

    # Communications mast - tapered sections
    mast_base_r = 1.5
    mast_top_r = 0.25
    n_sections = 6
    mast_z = h + 0.4
    for ms in range(n_sections):
        t0 = ms / n_sections
        t1 = (ms + 1) / n_sections
        r0 = mast_base_r + (mast_top_r - mast_base_r) * t0
        r1 = mast_base_r + (mast_top_r - mast_base_r) * t1
        sec_h = mast_h / n_sections
        sec = add_cone(f"aether_mast_sec_{ms}", r0, r1, sec_h, 12,
                       loc=(0, 0, mast_z + ms * sec_h + sec_h / 2))
        assign_mat(sec, steel_mast)
        objs.append(sec)

    # Cross-arms on mast
    for arm_z_frac in [0.3, 0.6, 0.85]:
        arm_z = h + mast_h * arm_z_frac
        arm_l = 8.0 * (1 - arm_z_frac * 0.6)
        for arm_ang in [0, 0.785, 1.571, 2.356]:  # 4 arms
            arm_x = arm_l * math.cos(arm_ang)
            arm_y = arm_l * math.sin(arm_ang)
            arm = add_cylinder(f"aether_arm_{arm_z_frac:.0f}_{arm_ang:.0f}",
                               0.15, arm_l * 2, 8,
                               loc=(0, 0, arm_z),
                               rot=(0, 0, arm_ang + 0.785))
            arm.rotation_euler[1] = 1.5708
            bpy.ops.object.transform_apply(rotation=True)
            assign_mat(arm, steel_mast)
            objs.append(arm)

    # Satellite dishes on mast
    for di, dang in enumerate([0, 1.571, 3.142]):
        dish_z = h + mast_h * 0.4
        dish_x = 5.0 * math.cos(dang)
        dish_y = 5.0 * math.sin(dang)
        dish = add_dome(f"aether_dish_{di}", 3.5, 8, 16,
                        loc=(dish_x, dish_y, dish_z))
        dish.rotation_euler[0] = 0.78  # tilt toward sky
        bpy.ops.object.transform_apply(rotation=True)
        assign_mat(dish, dish_mat)
        objs.append(dish)

    # Blue beacon at mast top
    beacon_z = h + mast_h + 1.0
    beacon = add_cylinder("aether_beacon", 1.2, 3.0, 16,
                          loc=(0, 0, beacon_z - 1.5))
    assign_mat(beacon, blue_beacon)
    objs.append(beacon)

    beacon_top = add_sphere("aether_beacon_sphere", 1.5, 3,
                            loc=(0, 0, beacon_z + 1.0))
    assign_mat(beacon_top, blue_beacon)
    objs.append(beacon_top)

    # Beacon ring halos
    for hr in range(3):
        halo = add_cylinder(f"aether_halo_{hr}", 2.0 + hr * 0.8, 0.2, 24,
                            loc=(0, 0, beacon_z - hr * 2.5))
        assign_mat(halo, accent_ring)
        objs.append(halo)

    # Blue accent rings on tower at each floor
    for fl in range(4):
        fl_ring = add_cylinder(f"aether_fl_ring_{fl}", w * 0.72, 0.25, 32,
                               loc=(0, 0, fl * floor_h + floor_h))
        assign_mat(fl_ring, accent_ring)
        objs.append(fl_ring)

    return objs, name


# ─────────────────────────────────────────────────────
# BUILDING 15: habitat_eco_residential_commons
# ─────────────────────────────────────────────────────
def build_habitat_eco_residential_commons():
    """
    106.7m x 70.1m x 14m, 4 floors, MIXED_USE
    U-shaped courtyard plan, warm terracotta, deep balconies, green terraces
    Features: balconies, courtyard, green_terraces, community_amenities, solar_pergola
    Color: warm terracotta/orange cladding, green vegetation layers
    """
    print("Building: habitat_eco_residential_commons")
    name = "habitat_eco_residential_commons"
    objs = []

    # Materials
    terracotta = make_material("habitat_terracotta",
                                base_color=(0.72, 0.35, 0.15, 1.0),
                                roughness=0.75, metallic=0.0)
    terra_dark = make_material("habitat_terra_dark",
                                base_color=(0.52, 0.24, 0.08, 1.0),
                                roughness=0.80, metallic=0.0)
    green_veg = make_material("habitat_vegetation",
                               base_color=(0.15, 0.5, 0.12, 1.0),
                               roughness=0.85)
    warm_window = make_material("habitat_window",
                                 base_color=(0.9, 0.75, 0.35, 1.0),
                                 roughness=0.1,
                                 emit_color=(1.0, 0.85, 0.4, 1.0),
                                 emit_strength=1.2,
                                 alpha=0.6, transmission=0.4)
    solar_panel = make_material("habitat_solar",
                                 base_color=(0.04, 0.06, 0.16, 1.0),
                                 roughness=0.1, metallic=0.3)
    solar_frame = make_material("habitat_solar_frame",
                                 base_color=(0.6, 0.6, 0.62, 1.0),
                                 roughness=0.3, metallic=0.7)
    concrete = make_material("habitat_concrete",
                              base_color=(0.62, 0.60, 0.58, 1.0),
                              roughness=0.7)
    balcony_railing = make_material("habitat_balcony_rail",
                                     base_color=(0.7, 0.35, 0.12, 1.0),
                                     roughness=0.5, metallic=0.1)

    w, d, h = 106.7, 70.1, 14.0
    floor_h = h / 4

    # U-shaped plan: left wing, right wing, back wing
    # Left wing (west)
    lw_w = w * 0.28
    lw_d = d
    left_wing = add_box("habitat_left_wing", (lw_w, lw_d, h),
                        (-w / 2 + lw_w / 2, 0, h / 2))
    assign_mat(left_wing, terracotta)
    objs.append(left_wing)

    # Right wing (east)
    right_wing = add_box("habitat_right_wing", (lw_w, lw_d, h),
                         (w / 2 - lw_w / 2, 0, h / 2))
    assign_mat(right_wing, terracotta)
    objs.append(right_wing)

    # Back wing (north)
    bk_w = w - 2 * lw_w
    bk_d = d * 0.32
    back_wing = add_box("habitat_back_wing", (bk_w + lw_w * 2, bk_d, h),
                        (0, d / 2 - bk_d / 2, h / 2))
    assign_mat(back_wing, terracotta)
    objs.append(back_wing)

    # Courtyard (open space between wings - just ground slab)
    courtyard = add_box("habitat_courtyard", (bk_w - 2.0, d - bk_d - 2.0, 0.3),
                        (0, -(d - bk_d) / 2 + (d - bk_d) / 2 - bk_d / 2 + 2,
                         0.15))
    assign_mat(courtyard, concrete)
    objs.append(courtyard)

    # Courtyard landscaping
    for cgi in range(3):
        cg_x = -bk_w / 2 + cgi * (bk_w / 2)
        cg_tree = add_cylinder(f"habitat_courtyard_tree_{cgi}", 1.2, 8.0, 8,
                               loc=(cg_x, 0, 4.0))
        assign_mat(cg_tree, green_veg)
        objs.append(cg_tree)
        cg_canopy = add_sphere(f"habitat_courtyard_canopy_{cgi}", 3.5, 2,
                               loc=(cg_x, 0, 8.5))
        assign_mat(cg_canopy, green_veg)
        objs.append(cg_canopy)

    # Balconies on each floor for both wings (south face)
    for fl in range(4):
        z_bal = (fl + 1) * floor_h
        for wing_x, wing_sign in [(-w / 2 + lw_w / 2, -1),
                                    (w / 2 - lw_w / 2, 1)]:
            # Balcony slab
            bal_slab = add_box(f"habitat_balcony_slab_{fl}_{wing_sign}",
                                (lw_w - 1.5, 2.0, 0.25),
                                (wing_x,
                                 -(lw_d / 2 + 1.0),
                                 z_bal + 0.125))
            assign_mat(bal_slab, concrete)
            objs.append(bal_slab)

            # Balcony railing
            for rb_y_off, rb_dim in [
                (-lw_d / 2 - 2.0, (lw_w - 1.5, 0.1, 1.0)),
                (-lw_d / 2, (0.1, 2.0, 1.0)),
                (-lw_d / 2 - 2.0 + (lw_w - 1.5) / 2 * wing_sign,
                 (0.1, 2.0, 1.0)),
            ]:
                rail = add_box(f"habitat_rail_{fl}_{wing_sign}_{rb_y_off:.0f}",
                                rb_dim,
                                (wing_x,
                                 -lw_d / 2 - 1.0,
                                 z_bal + 0.75))
                assign_mat(rail, balcony_railing)
                objs.append(rail)

    # Green terraces - vegetation on each floor ledge
    for fl in range(4):
        z_terr = fl * floor_h + 0.3
        terr_row = add_box(f"habitat_green_terrace_{fl}",
                            (lw_w * 0.7, 1.0, 0.5),
                            (-w / 2 + lw_w / 2, -lw_d / 2 - 0.3,
                             z_terr + 0.25))
        assign_mat(terr_row, green_veg)
        objs.append(terr_row)

        terr_row_r = add_box(f"habitat_green_terrace_r_{fl}",
                              (lw_w * 0.7, 1.0, 0.5),
                              (w / 2 - lw_w / 2, -lw_d / 2 - 0.3,
                               z_terr + 0.25))
        assign_mat(terr_row_r, green_veg)
        objs.append(terr_row_r)

    # Windows on south face - warm glow
    for fl in range(4):
        z_win = fl * floor_h + floor_h * 0.5
        for wx_off, wx_w in [(-w / 2 + lw_w * 0.5, lw_w * 0.7),
                               (w / 2 - lw_w * 0.5, lw_w * 0.7),
                               (0, bk_w * 0.7)]:
            win = add_box(f"habitat_win_{fl}_{wx_off:.0f}",
                          (wx_w, 0.35, floor_h * 0.5),
                          (wx_off, -d / 2 - 0.05, z_win))
            assign_mat(win, warm_window)
            objs.append(win)

    # Solar pergola on roof
    pergola_z = h + 0.6
    # Main pergola frame spans across the building
    for sp_i in range(6):
        sp_x = -bk_w / 2 + sp_i * (bk_w / 5)
        sp_beam = add_box(f"habitat_pergola_beam_{sp_i}",
                          (0.4, d * 0.6, 0.3),
                          (sp_x, -d / 2 + d * 0.3, pergola_z))
        assign_mat(sp_beam, solar_frame)
        objs.append(sp_beam)

    # Longitudinal purlins
    for sp_j in range(8):
        sp_y = -d / 2 + 5 + sp_j * (d * 0.6 / 7)
        sp_purl = add_box(f"habitat_pergola_purl_{sp_j}",
                          (bk_w, 0.3, 0.2),
                          (0, sp_y, pergola_z + 0.15))
        assign_mat(sp_purl, solar_frame)
        objs.append(sp_purl)

    # Solar panels on pergola
    for sp_pi in range(5):
        sp_px = -bk_w * 0.4 + sp_pi * (bk_w * 0.2)
        sol_panel = add_box(f"habitat_solar_panel_{sp_pi}",
                            (bk_w * 0.18, d * 0.55, 0.1),
                            (sp_px, -d / 2 + d * 0.3, pergola_z + 0.1))
        assign_mat(sol_panel, solar_panel)
        objs.append(sol_panel)

    # Community amenity block - ground floor extension south
    comm = add_box("habitat_community_block", (w * 0.4, 15.0, h * 0.5),
                   (0, -d / 2 - 7.5, h * 0.25))
    assign_mat(comm, terra_dark)
    objs.append(comm)

    # Vertical corten fins on wings
    for fi in range(6):
        fin_x = -w / 2 + 4 + fi * (lw_w / 5)
        fin = add_box(f"habitat_fin_l_{fi}", (0.2, 0.5, h),
                      (fin_x, -lw_d / 2 - 0.3, h / 2))
        assign_mat(fin, terra_dark)
        objs.append(fin)

    return objs, name


# ─────────────────────────────────────────────────────
# BUILDING 16: nexus_transportation_hub
# ─────────────────────────────────────────────────────
def build_nexus_transportation_hub():
    """
    106.7m x 54.9m x 14m, 2 floors, TRANSPORT
    Dramatic arching steel and glass roof, multi-modal platforms
    Features: arched_roof_span, multi_modal_platforms, pick_up_drop_off, public_concourse
    Color: steel and glass arch roof glowing bright white, platform lights
    """
    print("Building: nexus_transportation_hub")
    name = "nexus_transportation_hub"
    objs = []

    # Materials
    steel_glass_roof = make_material("nexus_steel_glass_roof",
                                      base_color=(0.92, 0.95, 1.0, 1.0),
                                      roughness=0.05, metallic=0.7,
                                      emit_color=(0.9, 0.95, 1.0, 1.0),
                                      emit_strength=2.5,
                                      alpha=0.55, transmission=0.5)
    steel_struct = make_material("nexus_steel",
                                  base_color=(0.75, 0.78, 0.82, 1.0),
                                  roughness=0.25, metallic=0.85)
    platform_mat = make_material("nexus_platform",
                                  base_color=(0.22, 0.22, 0.24, 1.0),
                                  roughness=0.65)
    platform_light = make_material("nexus_platform_light",
                                    base_color=(0.9, 0.95, 1.0, 1.0),
                                    roughness=0.2,
                                    emit_color=(0.8, 0.9, 1.0, 1.0),
                                    emit_strength=3.5)
    road_mat = make_material("nexus_road",
                              base_color=(0.12, 0.12, 0.14, 1.0),
                              roughness=0.8)
    signage_mat = make_material("nexus_signage",
                                 base_color=(0.05, 0.45, 1.0, 1.0),
                                 roughness=0.3,
                                 emit_color=(0.05, 0.4, 1.0, 1.0),
                                 emit_strength=3.0)
    glass_facade = make_material("nexus_glass_facade",
                                  base_color=(0.7, 0.85, 0.95, 1.0),
                                  roughness=0.08,
                                  emit_color=(0.6, 0.8, 1.0, 1.0),
                                  emit_strength=0.8,
                                  alpha=0.4, transmission=0.55)
    white_bright = make_material("nexus_white_bright",
                                  base_color=(0.97, 0.97, 0.97, 1.0),
                                  roughness=0.2, metallic=0.5,
                                  emit_color=(1.0, 1.0, 1.0, 1.0),
                                  emit_strength=1.5)
    dark_base = make_material("nexus_dark_base",
                               base_color=(0.1, 0.1, 0.12, 1.0),
                               roughness=0.4, metallic=0.3)

    w, d, h = 106.7, 54.9, 14.0
    arch_rise = h * 0.9  # How much arch rises above wall height
    floor_h = h / 2

    # Ground-level concourse slab
    concourse = add_box("nexus_concourse", (w, d, 0.5), (0, 0, 0.25))
    assign_mat(concourse, platform_mat)
    objs.append(concourse)

    # Side walls (lower structure)
    for side_y in [-1, 1]:
        wall = add_box(f"nexus_wall_{side_y}",
                       (w, 4.0, h),
                       (0, side_y * (d / 2 - 2.0), h / 2))
        assign_mat(wall, dark_base)
        objs.append(wall)

    # Glass facade panels
    for side_y in [-1, 1]:
        gf = add_box(f"nexus_glass_facade_{side_y}",
                     (w * 0.85, 0.4, h * 0.75),
                     (0, side_y * (d / 2), h * 0.55))
        assign_mat(gf, glass_facade)
        objs.append(gf)

    # End walls
    for side_x in [-1, 1]:
        ew = add_box(f"nexus_end_wall_{side_x}",
                     (6.0, d, h),
                     (side_x * (w / 2 - 3.0), 0, h / 2))
        assign_mat(ew, dark_base)
        objs.append(ew)

    # ARCHED ROOF - series of arch ribs spanning w
    n_arches = 16
    arch_depth = d * 1.0  # arch spans full depth
    rib_thickness = 0.8

    for ai in range(n_arches + 1):
        t = ai / n_arches
        x = -w / 2 + t * w
        # Generate arch rib as a series of box segments
        n_segs = 14
        for seg in range(n_segs):
            t0 = seg / n_segs
            t1 = (seg + 1) / n_segs
            ang0 = math.pi * t0  # 0 to pi (full semicircle, top half)
            ang1 = math.pi * t1

            # Arch geometry: spans from -d/2 to d/2 in Y, rises to h + arch_rise
            r = d / 2  # arch radius
            y0 = -r * math.cos(ang0)    # -d/2 to d/2
            z0 = h + arch_rise * math.sin(ang0)  # rises parabolically
            y1 = -r * math.cos(ang1)
            z1 = h + arch_rise * math.sin(ang1)

            mid_y = (y0 + y1) / 2
            mid_z = (z0 + z1) / 2
            seg_len = math.sqrt((y1 - y0) ** 2 + (z1 - z0) ** 2)
            ang_seg = math.atan2(z1 - z0, y1 - y0)

            rib_seg = add_box(f"nexus_arch_rib_{ai}_{seg}",
                              (rib_thickness, seg_len, rib_thickness),
                              (x, mid_y, mid_z))
            rib_seg.rotation_euler[0] = -ang_seg + math.pi / 2
            bpy.ops.object.transform_apply(rotation=True)
            assign_mat(rib_seg, steel_struct)
            objs.append(rib_seg)

    # Arch roof glazing panels (fill between ribs)
    for ai in range(n_arches):
        t = (ai + 0.5) / n_arches
        x = -w / 2 + t * w
        n_segs = 8
        for seg in range(n_segs):
            t0 = seg / n_segs
            t1 = (seg + 1) / n_segs
            ang0 = math.pi * t0
            ang1 = math.pi * t1

            r = d / 2
            y0 = -r * math.cos(ang0)
            z0 = h + arch_rise * math.sin(ang0)
            y1 = -r * math.cos(ang1)
            z1 = h + arch_rise * math.sin(ang1)

            mid_y = (y0 + y1) / 2
            mid_z = (z0 + z1) / 2
            seg_len = math.sqrt((y1 - y0) ** 2 + (z1 - z0) ** 2)
            panel_w = w / n_arches
            ang_seg = math.atan2(z1 - z0, y1 - y0)

            panel = add_box(f"nexus_roof_panel_{ai}_{seg}",
                            (panel_w, seg_len, 0.2),
                            (x, mid_y, mid_z))
            panel.rotation_euler[0] = -ang_seg + math.pi / 2
            bpy.ops.object.transform_apply(rotation=True)
            assign_mat(panel, steel_glass_roof)
            objs.append(panel)

    # Multi-modal platforms (elevated boarding platforms)
    n_platforms = 4
    platform_w = w * 0.8 / n_platforms
    for pi in range(n_platforms):
        px = -w * 0.4 + pi * (w * 0.8 / (n_platforms - 1))
        # Platform slab
        plat = add_box(f"nexus_platform_{pi}",
                       (platform_w - 1.5, d * 0.6, 0.6),
                       (px, 0, 0.9))
        assign_mat(plat, platform_mat)
        objs.append(plat)

        # Platform lights along edges
        for pli in range(6):
            ply = -d * 0.3 + pli * (d * 0.6 / 5)
            pl_light = add_cylinder(f"nexus_plat_light_{pi}_{pli}",
                                     0.2, 4.0, 8,
                                     loc=(px - platform_w / 2 + 0.3,
                                          ply, 2.5))
            assign_mat(pl_light, platform_light)
            objs.append(pl_light)

        # Platform edge strip
        pe_strip = add_box(f"nexus_plat_edge_{pi}",
                           (platform_w - 1.5, 0.25, 0.15),
                           (px, -d * 0.3, 1.1))
        assign_mat(pe_strip, platform_light)
        objs.append(pe_strip)

        # Overhead signage
        sign = add_box(f"nexus_sign_{pi}",
                       (platform_w - 2.0, 0.2, 2.0),
                       (px, 0, h * 0.65))
        assign_mat(sign, signage_mat)
        objs.append(sign)

    # Pick-up/drop-off zone - southern road canopy
    pudo_canopy = add_box("nexus_pudo_canopy", (w * 0.5, 12.0, 0.3),
                          (-w * 0.1, -(d / 2 + 6.0), h * 0.6))
    assign_mat(pudo_canopy, white_bright)
    objs.append(pudo_canopy)

    # PUDO canopy supports
    for cs_i in range(4):
        cs_x = -w * 0.25 + cs_i * (w * 0.5 / 3)
        cs = add_cylinder(f"nexus_pudo_col_{cs_i}", 0.4, h * 0.6, 8,
                          loc=(cs_x, -(d / 2 + 6.0), h * 0.3))
        assign_mat(cs, steel_struct)
        objs.append(cs)

    # PUDO road surface
    pudo_road = add_box("nexus_pudo_road", (w * 0.5, 12.0, 0.2),
                        (-w * 0.1, -(d / 2 + 6.0), 0.1))
    assign_mat(pudo_road, road_mat)
    objs.append(pudo_road)

    # Lane markings
    for lm_i in range(3):
        lm = add_box(f"nexus_lane_{lm_i}", (w * 0.5, 0.3, 0.05),
                     (-w * 0.1, -(d / 2 + 2.0 + lm_i * 4.0), 0.22))
        assign_mat(lm, white_bright)
        objs.append(lm)

    # Overhead arch lighting strips
    arch_light = add_cylinder("nexus_arch_light_ring", d / 2 + 1.0, 0.15, 32,
                              loc=(0, 0, h + arch_rise + 0.5),
                              rot=(1.5708, 0, 0))
    assign_mat(arch_light, platform_light)
    objs.append(arch_light)

    return objs, name


# ─────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────
BUILDINGS = [
    ("vital_helix_bio_research_lab", build_vital_helix_bio_research_lab),
    ("civic_core", build_civic_core),
    ("kinetic_edge_wellness_center", build_kinetic_edge_wellness_center),
    ("observatory_sky_deck", build_observatory_sky_deck),
    ("forge_materials_lab", build_forge_materials_lab),
    ("aether_link_tower", build_aether_link_tower),
    ("habitat_eco_residential_commons", build_habitat_eco_residential_commons),
    ("nexus_transportation_hub", build_nexus_transportation_hub),
]

results = {}

for building_id, build_fn in BUILDINGS:
    print(f"\n{'='*60}")
    print(f"Processing: {building_id}")
    print(f"{'='*60}")

    try:
        clear_scene()

        # Build the geometry
        objs, name = build_fn()

        output_path = os.path.join(OUTPUT_DIR, f"{building_id}.glb")

        # Export GLB
        export_glb(output_path)

        if os.path.exists(output_path):
            size_kb = os.path.getsize(output_path) / 1024
            results[building_id] = {
                "status": "SUCCESS",
                "size_kb": round(size_kb, 1),
                "path": output_path
            }
            print(f"  SUCCESS: {building_id}.glb ({size_kb:.1f} KB)")
        else:
            results[building_id] = {"status": "FAILED - no file", "path": output_path}

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        results[building_id] = {"status": f"ERROR: {e}", "traceback": tb}
        print(f"  ERROR: {building_id}: {e}")
        print(tb)

# Final summary
print(f"\n{'='*60}")
print("FINAL RESULTS SUMMARY")
print(f"{'='*60}")
for bid, r in results.items():
    status = r.get("status", "UNKNOWN")
    size = r.get("size_kb", 0)
    if "SUCCESS" in status:
        print(f"  OK  {bid}: {size} KB")
    else:
        print(f"  ERR {bid}: {status}")

print("\nDone!")
