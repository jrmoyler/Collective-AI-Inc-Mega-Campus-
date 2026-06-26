"""
arch_helpers.py — Architectural geometry helpers for trimesh.

Generates building meshes for the Collective AI Mega Campus 3D project.
All meshes use trimesh (v4.12+).  Buildings sit at z=0, centered at (0,0,0)
in X-Y; the master scene script places them at campus coordinates.

Blender-equivalent pseudocode is provided in docstrings as reference.
"""

import math
import numpy as np
import trimesh
import trimesh.transformations as tf

# ---------------------------------------------------------------------------
# Material palette
# ---------------------------------------------------------------------------

MATERIALS = {
    "DATA_BUNKER":        {"base": [30, 35, 40],       "roof": [25, 28, 32],    "accent": [60, 80, 100]},
    "CORPORATE_TOWER":    {"base": [200, 215, 230],     "roof": [180, 195, 210], "glass": [160, 200, 220, 180]},
    "CIVIC_CULTURAL":     {"base": [240, 235, 220],     "roof": [200, 185, 160], "accent": [180, 150, 100]},
    "LIFE_SCIENCE":       {"base": [240, 250, 240],     "roof": [80, 200, 100, 160]},
    "INDUSTRIAL":         {"base": [140, 140, 135],     "roof": [120, 118, 110], "accent": [160, 80, 40]},
    "WELLNESS_RECREATION":{"base": [250, 250, 248],     "roof": [240, 240, 238], "glass": [180, 220, 240, 150]},
    "MIXED_USE":          {"base": [200, 130, 90],      "roof": [80, 160, 80],   "glass": [200, 210, 220, 180]},
    "TRANSPORT":          {"base": [210, 215, 220],     "roof": [190, 195, 200], "glass": [200, 220, 240, 120]},
    "SECURITY":           {"base": [50, 50, 52],        "roof": [40, 40, 42],    "accent": [80, 80, 85]},
    "RESEARCH":           {"base": [190, 200, 210],     "roof": [170, 180, 190], "glass": [160, 180, 200, 140]},
}

# ---------------------------------------------------------------------------
# Low-level geometry helpers
# ---------------------------------------------------------------------------

def _rgba(color):
    """Ensure color is a 4-element RGBA list (adds alpha=255 if missing)."""
    c = list(color)
    if len(c) == 3:
        c.append(255)
    return c


def _color_mesh(mesh, color):
    """Apply a solid RGBA color to every vertex of *mesh* in-place."""
    rgba = _rgba(color)
    n = len(mesh.vertices)
    mesh.visual.vertex_colors = np.tile(np.array(rgba, dtype=np.uint8), (n, 1))
    return mesh


def make_box(width, depth, height, color=None):
    """Create a box mesh centered in X-Y, base at z=0.

    Blender equivalent::
        bpy.ops.mesh.primitive_cube_add(size=1)
        ob = bpy.context.object
        ob.scale = (width/2, depth/2, height/2)
        ob.location.z = height/2
    """
    mesh = trimesh.creation.box(extents=[width, depth, height])
    mesh.apply_translation([0, 0, height / 2])
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_cylinder(radius, height, sections=16, color=None):
    """Create a cylinder centered in X-Y, base at z=0.

    Blender equivalent::
        bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height)
        ob.location.z = height/2
    """
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    mesh.apply_translation([0, 0, height / 2])
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_cone(base_radius, height, sections=16, color=None):
    """Create a cone, base at z=0, tip pointing up.

    Blender equivalent::
        bpy.ops.mesh.primitive_cone_add(radius1=base_radius, depth=height)
        ob.location.z = height/2
    """
    mesh = trimesh.creation.cone(radius=base_radius, height=height, sections=sections)
    # trimesh cone is centered: tip at +height/2, base at -height/2
    mesh.apply_translation([0, 0, height / 2])
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_pyramid(base_width, base_depth, height, color=None):
    """Create a rectangular pyramid with base at z=0, apex pointing up.

    Blender equivalent::
        verts = [(-bw/2,-bd/2,0),(bw/2,-bd/2,0),(bw/2,bd/2,0),(-bw/2,bd/2,0),(0,0,h)]
        faces = [(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,3,2,1)]
    """
    hw, hd = base_width / 2, base_depth / 2
    vertices = np.array([
        [-hw, -hd, 0],
        [ hw, -hd, 0],
        [ hw,  hd, 0],
        [-hw,  hd, 0],
        [  0,   0, height],
    ], dtype=float)
    faces = np.array([
        [0, 1, 4],
        [1, 2, 4],
        [2, 3, 4],
        [3, 0, 4],
        [0, 3, 2],
        [0, 2, 1],
    ])
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=True)
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_hemisphere(radius, sections=24, color=None):
    """Create a hemisphere (dome), flat face at z=0, dome pointing up.

    Blender equivalent::
        bpy.ops.mesh.primitive_uv_sphere_add(radius=radius)
        # then delete lower half vertices
    """
    sphere = trimesh.creation.icosphere(subdivisions=3, radius=radius)
    # Keep only vertices with z >= 0
    mask = sphere.vertices[:, 2] >= -1e-6
    # Use trimesh's section or just rebuild from scratch with parametric approach
    theta = np.linspace(0, np.pi / 2, sections // 2 + 1)
    phi   = np.linspace(0, 2 * np.pi, sections, endpoint=False)

    verts = []
    for t in theta:
        for p in phi:
            x = radius * math.sin(t) * math.cos(p)
            y = radius * math.sin(t) * math.sin(p)
            z = radius * math.cos(t)
            verts.append([x, y, z])
    # apex at top (theta=0 gives z=radius)
    # bottom ring at theta=pi/2 gives z=0

    verts = np.array(verts)
    n_rings = sections // 2 + 1
    n_segs  = sections

    faces = []
    for ri in range(n_rings - 1):
        for si in range(n_segs):
            a = ri * n_segs + si
            b = ri * n_segs + (si + 1) % n_segs
            c = (ri + 1) * n_segs + (si + 1) % n_segs
            d = (ri + 1) * n_segs + si
            faces.append([a, d, c])
            faces.append([a, c, b])

    # Bottom cap (flat disk)
    center_idx = len(verts)
    verts = np.vstack([verts, [[0, 0, 0]]])
    bottom_ring_start = (n_rings - 1) * n_segs
    for si in range(n_segs):
        a = bottom_ring_start + si
        b = bottom_ring_start + (si + 1) % n_segs
        faces.append([center_idx, b, a])

    mesh = trimesh.Trimesh(vertices=verts, faces=np.array(faces), process=True)
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_half_cylinder(radius, length, sections=16, color=None):
    """Create a barrel vault (half-cylinder) along Y axis, base at z=0.

    The flat face runs along the Y axis; the dome extends in +Z.

    Blender equivalent::
        bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, vertices=sections)
        # delete lower half
        # rotate 90° around X so axis runs along Y
    """
    n_segs = max(sections, 4)
    # angles from 0 to pi (upper half)
    angles = np.linspace(0, math.pi, n_segs + 1)

    verts = []
    for y in [-length / 2, length / 2]:
        for a in angles:
            x = radius * math.cos(a)   # goes from +r to -r
            z = radius * math.sin(a)   # 0 -> +r -> 0
            verts.append([x, y, z])

    verts = np.array(verts, dtype=float)
    n_pts = n_segs + 1  # points per ring

    faces = []
    # Side quads
    for i in range(n_segs):
        a = i
        b = i + 1
        c = n_pts + i + 1
        d = n_pts + i
        faces.append([a, b, c])
        faces.append([a, c, d])

    # End caps (triangulate the half-disc)
    for ring_start in [0, n_pts]:
        center_x = 0.0
        center_z = 0.0
        c_idx = len(verts)
        y_val = verts[ring_start, 1]
        verts = np.vstack([verts, [[center_x, y_val, center_z]]])
        for i in range(n_segs):
            a = ring_start + i
            b = ring_start + i + 1
            if ring_start == 0:
                faces.append([c_idx, a, b])
            else:
                faces.append([c_idx, b, a])

    mesh = trimesh.Trimesh(vertices=verts, faces=np.array(faces), process=True)
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_arch_roof(span, length, arch_height, thickness=1.5, sections=16, color=None):
    """Create an open arch roof (thin shell) spanning X axis along Y.

    Args:
        span: full width in X
        length: full length in Y
        arch_height: height of arch above its spring line
        thickness: shell thickness
        sections: number of arch segments

    Blender equivalent::
        # Create path curve (semicircle), extrude along Y
        # Give it a bevel for thickness
    """
    radius = span / 2
    angles = np.linspace(0, math.pi, sections + 1)
    # outer arc
    outer_r = radius
    inner_r = max(radius - thickness, radius * 0.8)

    verts = []
    for y in [-length / 2, length / 2]:
        for a in angles:
            # scale z by arch_height/radius to make non-circular arch
            scale_z = arch_height / radius
            x_o = outer_r * math.cos(a)
            z_o = outer_r * math.sin(a) * scale_z
            x_i = inner_r * math.cos(a)
            z_i = inner_r * math.sin(a) * scale_z
            verts.append([x_o, y, z_o])
            verts.append([x_i, y, z_i])

    verts = np.array(verts, dtype=float)
    n_pts = (sections + 1) * 2  # per ring (outer+inner alternating)

    faces = []
    for side in range(2):
        ring_start = side * n_pts
        next_ring  = (1 - side) * n_pts
        for i in range(sections):
            # outer face
            ao = ring_start + i * 2
            bo = ring_start + (i + 1) * 2
            co = next_ring  + (i + 1) * 2
            do = next_ring  + i * 2
            faces.append([ao, bo, co])
            faces.append([ao, co, do])
            # inner face
            ai = ring_start + i * 2 + 1
            bi = ring_start + (i + 1) * 2 + 1
            ci = next_ring  + (i + 1) * 2 + 1
            di = next_ring  + i * 2 + 1
            faces.append([ai, ci, bi])
            faces.append([ai, di, ci])

    if len(faces) == 0:
        # Fallback: solid half-cylinder
        return make_half_cylinder(radius, length, sections, color)

    mesh = trimesh.Trimesh(vertices=verts, faces=np.array(faces), process=False)
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_sawtooth_roof(foot_x, foot_y, n_teeth, tooth_height, color=None):
    """Create a sawtooth roof profile running along Y (depth) axis.

    Each tooth has a vertical north face and a sloped south face.
    Total width = foot_x, total length = foot_y.
    The roof sits at z=0 (spring line); teeth rise to tooth_height.

    Blender equivalent::
        # Array modifier on a wedge profile, then solidify
    """
    if n_teeth < 1:
        n_teeth = 1
    tooth_w = foot_x / n_teeth

    verts = []
    faces = []

    for t in range(n_teeth):
        x0 = -foot_x / 2 + t * tooth_w
        x1 = x0 + tooth_w
        # Each tooth: 4 bottom corners + 2 ridge points (at x1, full height)
        # Ridge runs along Y at x1 elevation tooth_height
        base_idx = len(verts)
        verts += [
            [x0, -foot_y / 2, 0],          # 0 SW bottom
            [x1, -foot_y / 2, 0],          # 1 SE bottom
            [x1, -foot_y / 2, tooth_height], # 2 SE ridge
            [x0,  foot_y / 2, 0],          # 3 NW bottom
            [x1,  foot_y / 2, 0],          # 4 NE bottom
            [x1,  foot_y / 2, tooth_height], # 5 NE ridge
        ]
        # South sloped face: 0,1,2 (triangle at south end)
        # actually quads: sloped face SW-SE-ridge, north face SE-ridge-NE, bottom
        # Sloped south face (0,1,2 is south triangle — add 3,4,5 for full quad)
        faces += [
            [base_idx+0, base_idx+1, base_idx+2],   # south triangle slope
            [base_idx+3, base_idx+5, base_idx+4],   # north triangle vertical
            [base_idx+0, base_idx+3, base_idx+5],   # left sloped face
            [base_idx+0, base_idx+5, base_idx+2],   # left sloped face (2nd tri)
            [base_idx+1, base_idx+2, base_idx+5],   # right vertical face
            [base_idx+1, base_idx+5, base_idx+4],   # right vertical face (2nd)
            [base_idx+0, base_idx+1, base_idx+4],   # bottom
            [base_idx+0, base_idx+4, base_idx+3],   # bottom
        ]

    mesh = trimesh.Trimesh(
        vertices=np.array(verts, dtype=float),
        faces=np.array(faces),
        process=False,
    )
    # merge_vertices modifies in-place (returns None)
    mesh.merge_vertices()
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


def make_ngon_prism(radius, height, n_sides=8, color=None):
    """Create an N-sided prism (polygon extruded up), base at z=0.

    Blender equivalent::
        bpy.ops.mesh.primitive_cylinder_add(vertices=n_sides, radius=radius, depth=height)
    """
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=n_sides)
    mesh.apply_translation([0, 0, height / 2])
    if color is not None:
        _color_mesh(mesh, color)
    return mesh


# ---------------------------------------------------------------------------
# Transform helpers
# ---------------------------------------------------------------------------

def translate_mesh(mesh, x, y, z):
    """Translate mesh by (x, y, z)."""
    mesh.apply_translation([x, y, z])
    return mesh


def rotate_mesh_z(mesh, degrees):
    """Rotate mesh around Z axis by *degrees*."""
    angle = math.radians(degrees)
    R = tf.rotation_matrix(angle, [0, 0, 1])
    mesh.apply_transform(R)
    return mesh


def _add(scene, mesh, name, x=0, y=0, z=0):
    """Add a colored mesh to the scene with a translation transform."""
    T = tf.translation_matrix([x, y, z])
    scene.add_geometry(mesh, node_name=name, transform=T)


# ---------------------------------------------------------------------------
# Architectural family builders
# Each returns a trimesh.Scene with the building centered at (0,0,0) in X-Y.
# ---------------------------------------------------------------------------

def build_DATA_BUNKER(f, mats):
    """
    DATA_BUNKER family:
    - Main box at footprint × height
    - Podium: footprint + 5m on each side, h=1.5m
    - HVAC boxes on roof (grid)
    - Cooling towers (3 cylinders) at one end
    - Security berm (thin perimeter box)

    Blender equivalent::
        # Main mass + boolean or shrinkwrap for facade grooves
        # Array of HVAC boxes on roof
        # Cylinder array for cooling towers
    """
    scene = trimesh.Scene()
    m = mats["DATA_BUNKER"]
    w, d = f["footprint_m"]
    h = f["height_m"]

    # Main box
    main = make_box(w, d, h, color=m["base"])
    _add(scene, main, "main")

    # Podium
    pod_w, pod_d, pod_h = w + 10, d + 10, 1.5
    podium = make_box(pod_w, pod_d, pod_h, color=[m["base"][0]-5, m["base"][1]-5, m["base"][2]-5, 255])
    _add(scene, podium, "podium")

    # Roof HVAC units — grid of 2×2×1.5 boxes
    roof_area = w * d
    n_hvac = max(2, int(roof_area / 1000 * 8))
    n_hvac = min(n_hvac, 24)  # cap for large buildings
    cols = max(2, int(math.sqrt(n_hvac * w / d)))
    rows = max(2, math.ceil(n_hvac / cols))
    hvac_w, hvac_d, hvac_h = 2.5, 2.5, 1.5
    x_step = (w - hvac_w * 2) / max(cols - 1, 1)
    y_step = (d - hvac_d * 2) / max(rows - 1, 1)
    for row in range(rows):
        for col in range(cols):
            hx = -w/2 + hvac_w + col * x_step
            hy = -d/2 + hvac_d + row * y_step
            hz = h
            hvac = make_box(hvac_w, hvac_d, hvac_h, color=m["accent"])
            _add(scene, hvac, f"hvac_{row}_{col}", hx, hy, hz)

    # Cooling towers (3 cylinders) at +Y end
    ct_radius, ct_height = 4.0, 8.0
    ct_y = d / 2 + 2  # just outside building
    for i, cx in enumerate([-6, 0, 6]):
        ct = make_cylinder(ct_radius, ct_height, sections=16, color=m["accent"])
        _add(scene, ct, f"cooling_tower_{i}", cx, ct_y, 0)

    # Security berm (thin low box around perimeter)
    berm_thickness = 1.5
    berm_h = 1.2
    berm_color = [m["base"][0]+10, m["base"][1]+10, m["base"][2]+10, 255]
    # North/south berms
    for sign, nm in [(-1, "berm_s"), (1, "berm_n")]:
        berm = make_box(w + 10, berm_thickness, berm_h, color=berm_color)
        _add(scene, berm, nm, 0, sign * (d/2 + 5), 0)
    # East/west berms
    for sign, nm in [(-1, "berm_w"), (1, "berm_e")]:
        berm = make_box(berm_thickness, d + 10, berm_h, color=berm_color)
        _add(scene, berm, nm, sign * (w/2 + 5), 0, 0)

    return scene


def build_CORPORATE_TOWER(f, mats):
    """
    CORPORATE_TOWER family:
    - Main box, full footprint × lower 70% of height
    - Setback upper: reduced 10% on each side, upper 30% height
    - Crown: pyramid (prism_gateway) or cylinder+cone (aether_link)
    - aether_link: whole building rotated 45°, mast on top

    Blender equivalent::
        # Separate mesh for lower and upper floors
        # Boolean union or just stacked meshes
        # Curve to represent facade grooves per floor
    """
    scene = trimesh.Scene()
    m = mats["CORPORATE_TOWER"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]

    lower_h = h * 0.70
    upper_h = h * 0.30
    setback = min(w, d) * 0.10
    uw = w - 2 * setback
    ud = d - 2 * setback

    # Floor groove hint: thin slightly-darker horizontal slabs every floor
    floor_h = f.get("floor_height_m", 4.0)
    groove_color = [max(0, m["base"][0]-20), max(0, m["base"][1]-20), max(0, m["base"][2]-20), 255]

    # Main lower mass
    lower = make_box(w, d, lower_h, color=m["base"])
    _add(scene, lower, "lower")

    # Floor grooves (thin dark strips at each floor level on south facade)
    n_floors = max(1, int(lower_h / floor_h))
    for fi in range(1, n_floors):
        gz = fi * floor_h
        groove = make_box(w + 0.2, 0.3, 0.2, color=groove_color)
        _add(scene, groove, f"groove_{fi}", 0, 0, gz)

    # Upper setback mass
    upper = make_box(uw, ud, upper_h, color=m["roof"])
    _add(scene, upper, "upper", 0, 0, lower_h)

    if fid == "aether_link_tower":
        # Crown: cylinder + cone
        crown_cyl_h = h * 0.08
        crown_cyl_r = min(uw, ud) * 0.35
        cyl = make_cylinder(crown_cyl_r, crown_cyl_h, sections=16, color=m["roof"])
        _add(scene, cyl, "crown_cyl", 0, 0, h + upper_h)

        cone_h = h * 0.10
        cone_r = crown_cyl_r * 1.2
        crown_cone = make_cone(cone_r, cone_h, sections=16, color=m["glass"][:3] + [255] if "glass" in m else m["roof"])
        _add(scene, crown_cone, "crown_cone", 0, 0, h + upper_h + crown_cyl_h)

        # Mast: thin cylinder 30m
        mast = make_cylinder(0.6, 30.0, sections=8, color=[200, 200, 200, 255])
        _add(scene, mast, "mast", 0, 0, h + upper_h + crown_cyl_h + cone_h)

        # Rotate entire scene 45° around Z
        all_geoms = list(scene.geometry.keys())
        new_scene = trimesh.Scene()
        for node_name in scene.graph.nodes_geometry:
            geom_name = scene.graph[node_name][1]
            geom = scene.geometry[geom_name]
            T_world = scene.graph.get(node_name)[0]
            geom_copy = geom.copy()
            geom_copy.apply_transform(T_world)
            rotate_mesh_z(geom_copy, 45)
            new_scene.add_geometry(geom_copy, node_name=node_name + "_rot")
        return new_scene

    else:
        # prism_gateway: pyramid crown
        crown_h = h * 0.15
        crown = make_pyramid(uw, ud, crown_h, color=m["glass"][:3] + [255] if "glass" in m else m["roof"])
        _add(scene, crown, "crown", 0, 0, lower_h + upper_h)

    return scene


def build_CIVIC_CULTURAL(f, mats):
    """
    CIVIC_CULTURAL family:
    - royal_library: box + barrel vault roof
    - civic_core: octagonal prism + hemisphere dome
    - juris_guard: rectangle + taller court wing (2nd box)
    - visitor_experience: box + sweeping canopy slab

    Blender equivalent::
        # Curve-based vault via loft or simple half-cylinder mesh
        # Dome: Sphere with lower half deleted
    """
    scene = trimesh.Scene()
    m = mats["CIVIC_CULTURAL"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]

    # Base colonnade: thin cylinders along south facade
    col_r, col_h = 0.5, f.get("floor_height_m", 4.0)
    col_spacing = 6.0
    n_cols = max(2, int(w / col_spacing))
    col_color = [m["accent"][0], m["accent"][1], m["accent"][2], 255]
    for ci in range(n_cols):
        cx = -w/2 + col_r + ci * (w - 2*col_r) / max(n_cols - 1, 1)
        col = make_cylinder(col_r, col_h, sections=8, color=col_color)
        _add(scene, col, f"col_{ci}", cx, -d/2 - 0.5, 0)

    if fid == "royal_library_academy":
        main = make_box(w, d, h, color=m["base"])
        _add(scene, main, "main")
        # Barrel vault along long axis (X)
        vault_r = d / 2
        vault = make_half_cylinder(vault_r, w, sections=20, color=m["roof"])
        # Half-cylinder along Y, but we want it along X — rotate 90° around Z
        rotate_mesh_z(vault, 90)
        _add(scene, vault, "vault", 0, 0, h)

    elif fid == "civic_core":
        # Octagonal plan: 8-sided prism
        radius = min(w, d) / 2
        main = make_ngon_prism(radius, h, n_sides=8, color=m["base"])
        _add(scene, main, "main")
        # Dome
        dome_r = min(w, d) * 0.25
        dome = make_hemisphere(dome_r, sections=24, color=m["roof"])
        _add(scene, dome, "dome", 0, 0, h)

    elif fid == "juris_guard_center":
        main = make_box(w, d, h, color=m["base"])
        _add(scene, main, "main")
        # Taller court wing at one end (1/3 footprint, 1.5× height)
        wing_w = w / 3
        wing_h = h * 1.5
        wing = make_box(wing_w, d, wing_h, color=m["roof"])
        _add(scene, wing, "court_wing", w/2 - wing_w/2, 0, 0)

    elif fid == "visitor_experience_center":
        main = make_box(w, d, h, color=m["base"])
        _add(scene, main, "main")
        # Sweeping roof canopy: thin angled slab extending beyond south face
        canopy_w = w + 10
        canopy_d = d / 3
        canopy_h = 3.0
        canopy = make_box(canopy_w, canopy_d, canopy_h, color=m["roof"])
        _add(scene, canopy, "canopy", 0, -(d/2 + canopy_d/2 - 5), h)

    else:
        # Fallback generic civic
        main = make_box(w, d, h, color=m["base"])
        _add(scene, main, "main")

    return scene


def build_LIFE_SCIENCE(f, mats):
    """
    LIFE_SCIENCE family:
    - vertical_farm: box + greenhouse pyramid roof (green)
    - vital_helix: box + curved entry canopy (half-cylinder over front)
    - bio_energy_center: box + adjacent algae pond (flat green slab)

    Blender equivalent::
        # Greenhouse: separate glass material on pyramid mesh
        # Living wall: plane with green shader
    """
    scene = trimesh.Scene()
    m = mats["LIFE_SCIENCE"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]

    roof_color = _rgba(m["roof"])
    base_color = _rgba(m["base"])
    green = [60, 200, 80, 220]
    living_wall_color = [70, 210, 90, 220]

    if fid == "gaia_synthesis_vertical_farm":
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")
        # Greenhouse pyramid roof (green glass)
        gh_roof = make_pyramid(w, d, h * 0.5, color=roof_color)
        _add(scene, gh_roof, "greenhouse_roof", 0, 0, h)
        # Living wall on south face (thin slab)
        lw = make_box(w, 0.4, h, color=living_wall_color)
        _add(scene, lw, "living_wall", 0, -(d/2 + 0.2), 0)

    elif fid == "vital_helix_bio_research_lab":
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")
        # Curved entry canopy over front 1/4 of building (lateral half-cylinder)
        canopy_r = d / 4
        canopy_len = w
        canopy = make_half_cylinder(canopy_r, canopy_len, sections=16, color=roof_color)
        # Rotate so it spans along X axis (already does by default)
        rotate_mesh_z(canopy, 90)
        _add(scene, canopy, "entry_canopy", 0, -(d/2 - d/8), h)
        # Living wall south
        lw = make_box(w, 0.4, h * 0.6, color=living_wall_color)
        _add(scene, lw, "living_wall", 0, -(d/2 + 0.2), 0)

    elif fid == "gaia_synthesis_bio_energy_center":
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")
        # Adjacent algae pond (flat bright-green slab)
        pond_w, pond_d, pond_h = w * 0.8, d * 0.6, 0.3
        pond = make_box(pond_w, pond_d, pond_h, color=green)
        _add(scene, pond, "algae_pond", 0, -(d/2 + pond_d/2 + 2), 0)
        # Living wall south
        lw = make_box(w, 0.4, h, color=living_wall_color)
        _add(scene, lw, "living_wall", 0, -(d/2 + 0.2), 0)

    else:
        # Generic life-science building
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")
        lw = make_box(w, 0.4, h, color=living_wall_color)
        _add(scene, lw, "living_wall", 0, -(d/2 + 0.2), 0)

    return scene


def build_INDUSTRIAL(f, mats):
    """
    INDUSTRIAL family:
    - Sawtooth roof on main box
    - Dock doors (dark boxes) on north/east face
    - construction_innovation_yard: flat shed + enclosed east box

    Blender equivalent::
        # Sawtooth: profile curve → mesh → extrude along Y
        # Boolean cut for dock doors (or just additive dark boxes)
    """
    scene = trimesh.Scene()
    m = mats["INDUSTRIAL"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]
    floor_h = f.get("floor_height_m", 5.0)

    base_color = _rgba(m["base"])
    roof_color = _rgba(m["roof"])
    accent_color = _rgba(m["accent"])
    dock_color = [30, 28, 26, 255]

    if fid == "construction_innovation_yard":
        # Mostly flat shed: single story over 80% of footprint
        shed_w, shed_d, shed_h = w * 0.75, d, h
        shed = make_box(shed_w, shed_d, shed_h, color=base_color)
        _add(scene, shed, "shed", -w * 0.125, 0, 0)

        # Enclosed box at east end
        enc_w, enc_d, enc_h = w * 0.25, d, h
        enc = make_box(enc_w, enc_d, enc_h, color=roof_color)
        _add(scene, enc, "enclosure", w/2 - enc_w/2, 0, 0)

        # Crane rail (thin long box on top)
        rail = make_box(w, 0.5, 0.5, color=accent_color)
        _add(scene, rail, "crane_rail", 0, 0, h)

    else:
        # Main box (walls up to base height)
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")

        # Sawtooth roof
        tooth_h = 6.0
        n_teeth = max(1, int(w / 25))
        saw = make_sawtooth_roof(w, d, n_teeth, tooth_h, color=roof_color)
        _add(scene, saw, "sawtooth", 0, 0, h)

        # Dock doors on north face (dark boxes suggesting openings)
        n_docks = max(2, int(w / 15))
        dock_w, dock_d, dock_h = 4.0, 0.4, min(floor_h * 0.8, 5.0)
        dock_spacing = w / (n_docks + 1)
        for di in range(n_docks):
            dx = -w/2 + dock_spacing * (di + 1)
            dock = make_box(dock_w, dock_d, dock_h, color=dock_color)
            _add(scene, dock, f"dock_{di}", dx, d/2, dock_h/2)

    return scene


def build_WELLNESS_RECREATION(f, mats):
    """
    WELLNESS_RECREATION family:
    - kinetic_edge: low box + curved shell roof (half-cylinder spanning short axis)
    - observatory: 16-sided prism + hemisphere dome

    Blender equivalent::
        # Shell roof: half-cylinder mesh with smooth normals
        # Dome: UV sphere upper half
    """
    scene = trimesh.Scene()
    m = mats["WELLNESS_RECREATION"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]

    base_color = _rgba(m["base"])
    roof_color = _rgba(m["roof"])

    if fid == "kinetic_edge_wellness_center":
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")
        # Curved shell roof: half-cylinder spanning short axis (Y)
        shell_r = d / 2
        shell = make_half_cylinder(shell_r, w, sections=20, color=roof_color)
        # Rotate 90° so the barrel spans along X (long axis)
        rotate_mesh_z(shell, 90)
        _add(scene, shell, "shell_roof", 0, 0, h)

    elif fid == "observatory_sky_deck":
        # 16-sided prism base using full footprint radius
        radius = min(w, d) / 2
        base = make_ngon_prism(radius, h, n_sides=16, color=base_color)
        _add(scene, base, "base")
        # Hemisphere dome on top
        dome_r = 15.0
        dome = make_hemisphere(dome_r, sections=24, color=roof_color)
        _add(scene, dome, "dome", 0, 0, h)

    else:
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")

    return scene


def build_MIXED_USE(f, mats):
    """
    MIXED_USE family:
    - habitat: U-shaped plan (main bar + two wings)
    - hotel: long bar + taller west tower + balcony plates

    Blender equivalent::
        # U-shape: three separate box meshes joined (no boolean needed)
        # Balconies: array of thin slabs with offset
    """
    scene = trimesh.Scene()
    m = mats["MIXED_USE"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]

    base_color = _rgba(m["base"])
    roof_color = _rgba(m["roof"])
    floor_h = f.get("floor_height_m", 4.0)

    if fid == "habitat_eco_residential_commons":
        bar_d = d / 3

        # Main bar (north side, full width)
        bar = make_box(w, bar_d, h, color=base_color)
        _add(scene, bar, "main_bar", 0, d/2 - bar_d/2, 0)

        # East wing
        wing_w = bar_d
        east_wing = make_box(wing_w, d, h, color=base_color)
        _add(scene, east_wing, "east_wing", w/2 - wing_w/2, 0, 0)

        # West wing
        west_wing = make_box(wing_w, d, h, color=base_color)
        _add(scene, west_wing, "west_wing", -(w/2 - wing_w/2), 0, 0)

        # Balcony plates per floor (on south face of main bar)
        n_floors = max(1, int(h / floor_h))
        balcony_color = [m["base"][0]-20, m["base"][1]-20, m["base"][2]-20, 220]
        for fi in range(1, n_floors + 1):
            bz = fi * floor_h
            balcony = make_box(w, 1.5, 0.3, color=balcony_color)
            _add(scene, balcony, f"balcony_{fi}", 0, d/2 - bar_d + 0.75, bz)

    elif fid == "grand_conference_hotel":
        # Long bar full footprint
        bar = make_box(w, d, h, color=base_color)
        _add(scene, bar, "main_bar")

        # Taller tower at west end (raise by 1 floor = +floor_h)
        tower_w = w * 0.25
        tower_extra_h = floor_h
        tower = make_box(tower_w, d, tower_extra_h, color=roof_color)
        _add(scene, tower, "tower", -(w/2 - tower_w/2), 0, h)

        # Balcony plates per floor
        n_floors = max(1, int(h / floor_h))
        balcony_color = [min(255, m["base"][0]+30), m["base"][1], m["base"][2], 220]
        for fi in range(1, n_floors + 1):
            bz = fi * floor_h
            balcony = make_box(w, 1.5, 0.3, color=balcony_color)
            _add(scene, balcony, f"balcony_{fi}", 0, d/2 + 0.75, bz)

    else:
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")

    return scene


def build_TRANSPORT(f, mats):
    """
    TRANSPORT family:
    - transport_hub: box base + dramatic arching roof (half-cylinder along long axis)
    - mobility_lab: box + thick flat roof overhang plate (3m wider on all sides)

    Blender equivalent::
        # Arch roof: loft over semicircular profiles
        # Overhang: solidify modifier on extended plane
    """
    scene = trimesh.Scene()
    m = mats["TRANSPORT"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]

    base_color = _rgba(m["base"])
    roof_color = _rgba(m["roof"])
    glass_color = _rgba(m["glass"])

    if fid == "nexus_transportation_hub":
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")
        # Arching roof: half-cylinder along long axis, arch_height=15m
        arch_r = d / 2
        arch_h = 15.0
        # Use make_half_cylinder but scale Z to achieve arch_height
        # Create a scaled half-cylinder
        arch = make_half_cylinder(arch_r, w, sections=20, color=glass_color)
        # Scale Z to achieve the desired arch height (arch_r -> arch_h)
        scale_mat = np.eye(4)
        scale_mat[2, 2] = arch_h / arch_r
        arch.apply_transform(scale_mat)
        rotate_mesh_z(arch, 90)
        _add(scene, arch, "arch_roof", 0, 0, h)

    elif fid == "nomad_nexus_mobility_lab":
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")
        # Thick flat roof plate extending 3m on all sides
        plate = make_box(w + 6, d + 6, 1.5, color=roof_color)
        _add(scene, plate, "roof_plate", 0, 0, h)

    else:
        main = make_box(w, d, h, color=base_color)
        _add(scene, main, "main")

    return scene


def build_SECURITY(f, mats):
    """
    SECURITY family:
    - Compact rectangle, 2 stories
    - Mast: thin cylinder 20m from roof center
    - Perimeter wall: 3m tall, 2m thick, offset 5m from building

    Blender equivalent::
        # Perimeter wall: array around building or 4 separate boxes
    """
    scene = trimesh.Scene()
    m = mats["SECURITY"]
    w, d = f["footprint_m"]
    h = f["height_m"]

    base_color = _rgba(m["base"])
    accent_color = _rgba(m["accent"])
    wall_color = _rgba(m["accent"])
    mast_color = [160, 160, 165, 255]

    # Main building
    main = make_box(w, d, h, color=base_color)
    _add(scene, main, "main")

    # Mast
    mast = make_cylinder(0.4, 20.0, sections=8, color=mast_color)
    _add(scene, mast, "mast", 0, 0, h)

    # Sensor cluster at top of mast
    sensor = make_box(2, 2, 1, color=accent_color)
    _add(scene, sensor, "sensor", 0, 0, h + 20)

    # Perimeter wall (4 sides, 3m tall, 2m thick, offset 5m)
    offset = 5.0
    wall_h = 3.0
    wall_t = 1.0
    # North/south
    for sign, nm in [(-1, "wall_s"), (1, "wall_n")]:
        wall = make_box(w + 2*offset + 2*wall_t, wall_t, wall_h, color=wall_color)
        _add(scene, wall, nm, 0, sign * (d/2 + offset), 0)
    # East/west
    for sign, nm in [(-1, "wall_w"), (1, "wall_e")]:
        wall = make_box(wall_t, d + 2*offset, wall_h, color=wall_color)
        _add(scene, wall, nm, sign * (w/2 + offset), 0, 0)

    return scene


def build_RESEARCH(f, mats):
    """
    RESEARCH family:
    - Main box
    - Floating roof plane (box 0.5m thick, 2m beyond footprint, raised 1m above roof)
    - One wing at 60% footprint depth, full height, attached at center
    - Antenna mast for signal_velocity_center

    Blender equivalent::
        # Floating roof: subdivided plane, offset by 1m with solidify modifier
        # Wing: separate mesh offset in X or Y
    """
    scene = trimesh.Scene()
    m = mats["RESEARCH"]
    w, d = f["footprint_m"]
    h = f["height_m"]
    fid = f["id"]

    base_color = _rgba(m["base"])
    roof_color = _rgba(m["roof"])
    glass_color = _rgba(m["glass"])

    # Main box
    main = make_box(w, d, h, color=base_color)
    _add(scene, main, "main")

    # Floating roof plane (2m beyond footprint on all sides, 1m above roof, 0.5m thick)
    roof_plane = make_box(w + 4, d + 4, 0.5, color=roof_color)
    _add(scene, roof_plane, "roof_plane", 0, 0, h + 1.0)

    # Wing: 60% of footprint depth, full height, same width as building
    wing_d = d * 0.60
    wing_w = w * 0.40
    wing = make_box(wing_w, wing_d, h, color=glass_color[:3] + [255])
    _add(scene, wing, "wing", w/2 + wing_w/2, 0, 0)

    # Antenna mast for signal_velocity_center
    if fid == "signal_velocity_center":
        mast = make_cylinder(0.4, 15.0, sections=8, color=[180, 180, 185, 255])
        _add(scene, mast, "antenna_mast", 0, 0, h + 1.5)

    return scene


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_BUILDERS = {
    "DATA_BUNKER":         build_DATA_BUNKER,
    "CORPORATE_TOWER":     build_CORPORATE_TOWER,
    "CIVIC_CULTURAL":      build_CIVIC_CULTURAL,
    "LIFE_SCIENCE":        build_LIFE_SCIENCE,
    "INDUSTRIAL":          build_INDUSTRIAL,
    "WELLNESS_RECREATION": build_WELLNESS_RECREATION,
    "MIXED_USE":           build_MIXED_USE,
    "TRANSPORT":           build_TRANSPORT,
    "SECURITY":            build_SECURITY,
    "RESEARCH":            build_RESEARCH,
}


def create_building(facility, materials):
    """Dispatch to the correct family builder and return a trimesh.Scene.

    Args:
        facility: dict from facilities.json
        materials: MATERIALS dict

    Returns:
        trimesh.Scene with all building meshes, centered at (0,0,0) in X-Y, base at z=0.
    """
    family = facility.get("arch_family", "RESEARCH")
    builder = _BUILDERS.get(family)
    if builder is None:
        # Fallback: plain box
        scene = trimesh.Scene()
        w, d = facility["footprint_m"]
        h = facility["height_m"]
        m = materials.get(family, materials["RESEARCH"])
        color = _rgba(m.get("base", [150, 150, 150]))
        box = make_box(w, d, h, color=color)
        scene.add_geometry(box, node_name="main")
        return scene
    return builder(facility, materials)
