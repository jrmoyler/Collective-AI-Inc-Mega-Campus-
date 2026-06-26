#!/usr/bin/env python3
"""
blender_buildings_1_8.py — Highly-detailed 3D GLB models for Buildings 1-8
Collective AI Mega Campus — Futuristic Sci-Fi Campus

This script generates architecturally rich GLB models using trimesh (no Blender
required). Each building matches the visual specs: real-world dimensions,
sci-fi materials with neon/glowing accents, and architectural detail elements.

Can be called from Blender headless or directly via python3.

Output: /home/user/Collective-AI-Inc-Mega-Campus-/assets/glb/buildings/{id}.glb
"""

import sys
import math
import traceback
from pathlib import Path

import numpy as np

try:
    import trimesh
    import trimesh.transformations as tf
except ImportError:
    # Try running under Blender's python — fall back to bpy-based export
    print("trimesh not found — attempting Blender bpy fallback")
    try:
        import bpy
        BPY_MODE = True
    except ImportError:
        raise RuntimeError("Neither trimesh nor bpy is available!")

OUT = Path("/home/user/Collective-AI-Inc-Mega-Campus-/assets/glb/buildings")
OUT.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────────────────────────
#  Low-level geometry helpers
# ──────────────────────────────────────────────────────────────────

def rgba(r, g, b, a=255):
    return [int(r), int(g), int(b), int(a)]


def color_mesh(mesh, color):
    """Apply solid RGBA vertex color to every face of a mesh."""
    c = list(color)
    if len(c) == 3:
        c.append(255)
    n = len(mesh.vertices)
    mesh.visual.vertex_colors = np.tile(
        np.array(c, dtype=np.uint8), (n, 1)
    )
    return mesh


def box(w, d, h, color=None, cx=0.0, cy=0.0, cz=0.0):
    """Axis-aligned box; base at z=cz, centered at (cx,cy) in X-Y."""
    mesh = trimesh.creation.box(extents=[w, d, h])
    mesh.apply_translation([cx, cy, cz + h / 2])
    if color is not None:
        color_mesh(mesh, color)
    return mesh


def cyl(r, h, segs=16, color=None, cx=0.0, cy=0.0, cz=0.0):
    """Cylinder, base at z=cz."""
    mesh = trimesh.creation.cylinder(radius=r, height=h, sections=segs)
    mesh.apply_translation([cx, cy, cz + h / 2])
    if color is not None:
        color_mesh(mesh, color)
    return mesh


def cone(r, h, segs=16, color=None, cx=0.0, cy=0.0, cz=0.0):
    """Cone, base at z=cz, tip pointing up."""
    mesh = trimesh.creation.cone(radius=r, height=h, sections=segs)
    # trimesh cone center is at mid-height; shift so base is at cz
    mesh.apply_translation([cx, cy, cz + h / 2])
    if color is not None:
        color_mesh(mesh, color)
    return mesh


def prism_triangular(base_w, base_d, height, color=None, cx=0.0, cy=0.0, cz=0.0):
    """Triangular prism (sawtooth tooth) along Y axis.

    Cross-section: right-triangle (base_w wide, height tall) in X-Z,
    extruded along Y for base_d.
    Base at z=cz.
    """
    hw = base_w / 2
    hd = base_d / 2
    verts = np.array([
        [cx - hw, cy - hd, cz],
        [cx + hw, cy - hd, cz],
        [cx - hw, cy - hd, cz + height],
        [cx - hw, cy + hd, cz],
        [cx + hw, cy + hd, cz],
        [cx - hw, cy + hd, cz + height],
    ], dtype=float)
    faces = np.array([
        [0, 1, 2],        # front tri
        [3, 5, 4],        # back tri
        [0, 2, 5], [0, 5, 3],   # left
        [1, 4, 5], [1, 5, 2],   # hypotenuse
        [0, 3, 4], [0, 4, 1],   # bottom
    ])
    mesh = trimesh.Trimesh(vertices=verts, faces=faces, process=True)
    if color is not None:
        color_mesh(mesh, color)
    return mesh


def barrel_vault(radius, length, segs=20, color=None, cx=0.0, cy=0.0, cz=0.0):
    """Half-cylinder vault, open at each end, base flat at z=cz, arch in +Z."""
    angles = np.linspace(0, math.pi, segs + 1)
    ring_y = [cy - length / 2, cy + length / 2]

    verts = []
    for y in ring_y:
        for a in angles:
            x = cx + radius * math.cos(a)
            z = cz + radius * math.sin(a)
            verts.append([x, y, z])

    n = segs + 1
    faces = []
    for i in range(segs):
        a, b = i, i + 1
        c, d_ = n + i, n + i + 1
        faces.append([a, d_, b])
        faces.append([a, c, d_])

    # end caps
    # front face
    for i in range(segs):
        if i < segs - 1:
            faces.append([0, i + 1, i + 2])
    # back face
    base_b = n
    for i in range(segs):
        if i < segs - 1:
            faces.append([base_b, base_b + i + 2, base_b + i + 1])

    mesh = trimesh.Trimesh(
        vertices=np.array(verts, dtype=float),
        faces=np.array(faces),
        process=False
    )
    mesh.fix_normals()
    if color is not None:
        color_mesh(mesh, color)
    return mesh


def panel_array(panel_w, panel_h, panel_t, rows, cols,
                gap_x, gap_y, color=None,
                cx=0.0, cy=0.0, cz=0.0, face='x'):
    """Grid of raised panel boxes on a wall face.

    face: 'x' = facing X axis, 'y' = facing Y axis
    """
    meshes = []
    total_w = cols * panel_w + (cols - 1) * gap_x
    total_h = rows * panel_h + (rows - 1) * gap_y
    for r in range(rows):
        for c in range(cols):
            px = cx - total_w / 2 + c * (panel_w + gap_x) + panel_w / 2
            pz = cz + r * (panel_h + gap_y) + panel_h / 2
            if face == 'x':
                m = box(panel_t, panel_w, panel_h, color, px, cy, cz + r * (panel_h + gap_y))
            else:
                m = box(panel_w, panel_t, panel_h, color, cx + c * (panel_w + gap_x) - total_w / 2 + panel_w / 2, cy, cz + r * (panel_h + gap_y))
            meshes.append(m)
    return meshes


def merge(*meshes_or_lists):
    """Merge a sequence of meshes (or lists of meshes) into one trimesh.Scene."""
    scene = trimesh.Scene()
    idx = [0]

    def add(m):
        if m is None:
            return
        if isinstance(m, list):
            for item in m:
                add(item)
            return
        name = f"geo_{idx[0]}"
        idx[0] += 1
        scene.add_geometry(m, node_name=name)

    for item in meshes_or_lists:
        add(item)
    return scene


def add_to(scene, mesh, name=None):
    """Add a mesh or list of meshes to a scene."""
    if mesh is None:
        return
    if isinstance(mesh, list):
        for i, m in enumerate(mesh):
            n = f"{name}_{i}" if name else f"geo_{id(m)}"
            scene.add_geometry(m, node_name=n)
    else:
        n = name or f"geo_{id(mesh)}"
        scene.add_geometry(mesh, node_name=n)


def window_grid(width, height, base_z, rows, cols,
                win_w, win_h, win_depth=0.15,
                frame_color=None, glass_color=None,
                cx=0.0, cy=0.0, face='south'):
    """Generate a grid of window-frame+glass combos on a flat facade."""
    meshes = []
    col_step = width / cols
    row_step = height / rows

    for r in range(rows):
        for c in range(cols):
            ox = cx - width / 2 + c * col_step + col_step / 2
            oz = base_z + r * row_step + row_step / 2

            if face == 'south':
                # frame as thin slab
                if frame_color:
                    frame = box(win_w + 0.4, win_depth + 0.1, win_h + 0.4,
                                frame_color, ox, cy, oz - win_h / 2)
                    meshes.append(frame)
                # glass
                if glass_color:
                    glass = box(win_w, win_depth, win_h,
                                glass_color, ox, cy + win_depth * 0.5, oz - win_h / 2)
                    meshes.append(glass)
            elif face == 'north':
                if frame_color:
                    frame = box(win_w + 0.4, win_depth + 0.1, win_h + 0.4,
                                frame_color, ox, cy, oz - win_h / 2)
                    meshes.append(frame)
                if glass_color:
                    glass = box(win_w, win_depth, win_h,
                                glass_color, ox, cy - win_depth * 0.5, oz - win_h / 2)
                    meshes.append(glass)
    return meshes


# ──────────────────────────────────────────────────────────────────
#  Building 1: prism_gateway_hq
#  91.4m × 45.7m × 18m | 4 floors | CORPORATE_TOWER
#  Silver/blue glass, glowing blue crystalline crown
# ──────────────────────────────────────────────────────────────────

def build_prism_gateway_hq():
    """Prismatic headquarters with crystal crown, stepped upper floors, curtain wall."""
    scene = trimesh.Scene()
    W, D, H = 91.4, 45.7, 18.0
    floor_h = H / 4   # 4.5m per floor

    # ── Facade colors
    c_glass   = rgba(160, 200, 220, 220)  # polished blue-silver glass
    c_frame   = rgba(180, 195, 210, 255)  # aluminum frame
    c_metal   = rgba(60, 70, 80, 255)     # dark metal roof
    c_crown   = rgba(80, 180, 255, 240)   # glowing blue crown
    c_glow    = rgba(120, 210, 255, 200)  # blue glow emission
    c_canopy  = rgba(200, 215, 230, 255)  # entry canopy
    c_base    = rgba(200, 210, 220, 255)  # podium stone
    c_solar   = rgba(30, 40, 60, 255)     # solar panels

    # ── Ground floor podium (slightly wider, step up)
    add_to(scene, box(W + 4, D + 4, 1.2, c_base), "podium")

    # ── Main body (floors 1-3, full width)
    add_to(scene, box(W, D, H * 0.72, c_glass), "body_main")

    # ── Floor 4 setback (-8m each side → stepped upper floor)
    setback_h = floor_h
    setback_z = H * 0.72
    add_to(scene, box(W - 16, D - 8, setback_h, c_glass, 0, 0, setback_z), "body_step")

    # ── Horizontal spandrel bands at each floor level
    for fi in range(1, 5):
        fz = fi * floor_h - 0.3
        add_to(scene, box(W + 0.6, D + 0.6, 0.6, c_frame, 0, 0, fz), f"spandrel_{fi}")

    # ── Curtain-wall vertical mullions (24 bays across width)
    n_mullions = 24
    for i in range(n_mullions + 1):
        mx = -W / 2 + i * (W / n_mullions)
        add_to(scene, box(0.25, D + 0.3, H * 0.72, c_frame, mx, 0, 0), f"mullion_{i}")

    # ── Entry canopy (south face, projecting 8m)
    add_to(scene, box(30, 8, 1.2, c_canopy, 0, -(D / 2 + 4), 4.5), "canopy")
    # Canopy support columns
    for xoff in [-10, 0, 10]:
        add_to(scene, cyl(0.4, 4.5, 12, c_frame, xoff, -(D / 2 + 4), 0), f"col_canopy_{xoff}")

    # ── Lobby atrium glazed box inside
    add_to(scene, box(20, D * 0.9, H * 0.72, c_glow, 0, 0, 0), "atrium_glow")

    # ── Prismatic crystal crown (array of angled prisms & faceted boxes)
    crown_z = H
    # Central crystal spike
    add_to(scene, cone(8, 14, 6, c_crown, 0, 0, crown_z), "crown_main")
    # Flanking facets
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        rx = math.cos(rad) * 10
        ry = math.sin(rad) * 5
        h_f = 4 + 3 * abs(math.cos(rad))
        add_to(scene, cone(3, h_f, 6, c_crown, rx, ry, crown_z), f"crown_facet_{ang}")

    # Crystal crown base ring
    add_to(scene, cyl(18, 1.5, 24, c_glow, 0, 0, crown_z - 1), "crown_base_ring")

    # ── Rooftop solar array panels
    panel_cols = 12
    panel_z = H - 0.1
    for pc in range(panel_cols):
        px = -W / 2 + 6 + pc * (W / panel_cols)
        add_to(scene, box(5.0, D * 0.5, 0.1, c_solar, px, 0, panel_z), f"solar_{pc}")

    # ── Glowing window strips (north + south facade, 4 rows × 20 cols)
    for face_y, face_name in [(-D / 2 - 0.05, 'south'), (D / 2 + 0.05, 'north')]:
        for row in range(4):
            rz = row * floor_h + 0.8
            for col in range(20):
                cx2 = -W / 2 + 2.5 + col * (W / 20)
                ww = W / 20 - 1.0
                add_to(scene,
                       box(ww, 0.1, floor_h - 1.2, c_glow, cx2, face_y, rz),
                       f"win_{face_name}_{row}_{col}")

    # ── Blue neon accent strips along building edges
    for ez in [0, floor_h, 2 * floor_h, 3 * floor_h, H]:
        add_to(scene, box(W + 1, 0.2, 0.15, c_crown, 0, -D / 2, ez), f"neon_s_{ez}")
        add_to(scene, box(W + 1, 0.2, 0.15, c_crown, 0, D / 2, ez), f"neon_n_{ez}")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building 2: neural_block_data_center
#  219.5m × 109.7m × 24m | 4 floors | DATA_BUNKER
#  Very dark steel/gunmetal, blue glow from cooling towers
# ──────────────────────────────────────────────────────────────────

def build_neural_block_data_center():
    """Massive fortress data bunker with cooling towers, security perimeter, HVAC."""
    scene = trimesh.Scene()
    W, D, H = 219.5, 109.7, 24.0

    c_steel   = rgba(28, 32, 36, 255)     # gunmetal
    c_panel   = rgba(35, 40, 46, 255)     # darker panels
    c_frame   = rgba(45, 52, 58, 255)     # frame strips
    c_cool    = rgba(20, 80, 140, 200)    # cooling tower glow
    c_glow    = rgba(40, 120, 200, 180)   # blue accent glow
    c_accent  = rgba(60, 100, 160, 255)   # accent panels
    c_hvac    = rgba(50, 55, 60, 255)     # HVAC units
    c_wall    = rgba(22, 26, 30, 255)     # security wall
    c_dock    = rgba(40, 44, 48, 255)     # loading dock

    # ── Main mega-block body
    add_to(scene, box(W, D, H, c_steel), "body_main")

    # ── Horizontal panel rhythm (raised strips every 6m)
    for fi in range(4):
        fz = fi * 6.0 + 5.8
        add_to(scene, box(W + 1, D + 1, 0.4, c_frame, 0, 0, fz), f"h_band_{fi}")

    # ── Vertical panel articulation (N & S facades — 20 bays)
    n_panels = 20
    for pi in range(n_panels):
        px = -W / 2 + pi * (W / n_panels) + (W / n_panels) / 2
        # South facade raised panel
        add_to(scene, box(W / n_panels - 1.0, 0.6, H * 0.8, c_panel, px, -D / 2, H * 0.1),
               f"vpanel_s_{pi}")
        # North facade
        add_to(scene, box(W / n_panels - 1.0, 0.6, H * 0.8, c_panel, px, D / 2, H * 0.1),
               f"vpanel_n_{pi}")

    # ── Minimal fenestration (small slit windows, security style)
    for fi in range(4):
        fz = fi * 6.0 + 3.0
        for pi in range(8):
            px = -W / 2 + 15 + pi * (W / 8)
            add_to(scene, box(6.0, 0.2, 1.0, c_glow, px, -D / 2 - 0.1, fz), f"slit_s_{fi}_{pi}")

    # ── Cooling towers (8 large cylinders on roof, glowing blue)
    cool_r = 8.0
    cool_h = 14.0
    cool_positions = [
        (-W / 2 + 25, -D / 2 + 22),
        (-W / 2 + 25, D / 2 - 22),
        (-W / 2 + 80, -D / 2 + 22),
        (-W / 2 + 80, D / 2 - 22),
        (W / 2 - 80, -D / 2 + 22),
        (W / 2 - 80, D / 2 - 22),
        (W / 2 - 25, -D / 2 + 22),
        (W / 2 - 25, D / 2 - 22),
    ]
    for i, (tx, ty) in enumerate(cool_positions):
        add_to(scene, cyl(cool_r, cool_h, 20, c_cool, tx, ty, H), f"cool_tower_{i}")
        # glow ring at top
        add_to(scene, cyl(cool_r + 1, 0.5, 20, c_glow, tx, ty, H + cool_h - 1), f"cool_glow_{i}")
        # inner glow
        add_to(scene, cyl(cool_r * 0.6, cool_h * 1.1, 16, rgba(20, 100, 200, 120), tx, ty, H),
               f"cool_inner_{i}")

    # ── HVAC clusters (rooftop — array of boxy units)
    hvac_z = H
    for xi in range(6):
        for yi in range(3):
            hx = -W / 2 + 30 + xi * 30
            hy = -D / 2 + 15 + yi * 28
            add_to(scene, box(12, 8, 4.0, c_hvac, hx, hy, hvac_z), f"hvac_{xi}_{yi}")
            # vent stack
            add_to(scene, cyl(1.2, 6.0, 8, c_frame, hx, hy, hvac_z + 4), f"vent_{xi}_{yi}")

    # ── Security perimeter wall (3m high, 10m offset)
    wall_h = 3.5
    wall_t = 1.5
    offset = 10.0
    # South wall
    add_to(scene, box(W + offset * 2 + wall_t * 2, wall_t, wall_h, c_wall,
                      0, -(D / 2 + offset), 0), "sec_wall_s")
    # North wall
    add_to(scene, box(W + offset * 2 + wall_t * 2, wall_t, wall_h, c_wall,
                      0, D / 2 + offset, 0), "sec_wall_n")
    # East wall
    add_to(scene, box(wall_t, D + offset * 2, wall_h, c_wall,
                      W / 2 + offset, 0, 0), "sec_wall_e")
    # West wall
    add_to(scene, box(wall_t, D + offset * 2, wall_h, c_wall,
                      -(W / 2 + offset), 0, 0), "sec_wall_w")

    # Security wall glow strip
    add_to(scene, box(W + offset * 2 + wall_t * 2, 0.15, 0.15, c_glow,
                      0, -(D / 2 + offset), wall_h), "sec_glow_s")
    add_to(scene, box(W + offset * 2 + wall_t * 2, 0.15, 0.15, c_glow,
                      0, D / 2 + offset, wall_h), "sec_glow_n")

    # ── Loading docks (south face, recessed bays)
    for di in range(6):
        dx = -W / 2 + 20 + di * 32
        add_to(scene, box(8, 3.0, 5.0, c_dock, dx, -(D / 2 - 1.5), 0), f"dock_{di}")
        # dock door glow
        add_to(scene, box(7.5, 0.2, 4.5, c_glow, dx, -(D / 2 - 0.1), 0.3), f"dock_door_{di}")

    # ── Blue accent stripe around building mid-height
    add_to(scene, box(W + 2, 0.3, 0.3, c_glow, 0, -D / 2, H / 2), "mid_glow_s")
    add_to(scene, box(W + 2, 0.3, 0.3, c_glow, 0, D / 2, H / 2), "mid_glow_n")
    add_to(scene, box(0.3, D + 2, 0.3, c_glow, -W / 2, 0, H / 2), "mid_glow_w")
    add_to(scene, box(0.3, D + 2, 0.3, c_glow, W / 2, 0, H / 2), "mid_glow_e")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building 3: vault_archive
#  54.9m × 36.6m × 16.5m | 3 floors | DATA_BUNKER
#  Dark concrete, blast-rated walls, security berm, single entry glow
# ──────────────────────────────────────────────────────────────────

def build_vault_archive():
    """Compact reinforced archive vault with security berm and blast-rated walls."""
    scene = trimesh.Scene()
    W, D, H = 54.9, 36.6, 16.5

    c_conc   = rgba(38, 42, 46, 255)    # dark concrete
    c_dark   = rgba(28, 30, 34, 255)    # darker recesses
    c_entry  = rgba(80, 160, 255, 200)  # entry glow
    c_berm   = rgba(45, 50, 55, 255)    # earth berm
    c_steel  = rgba(55, 60, 65, 255)    # steel frame
    c_slit   = rgba(60, 130, 200, 150)  # slit window glow

    # ── Main vault body (near-featureless monolith)
    add_to(scene, box(W, D, H, c_conc), "body_main")

    # ── Blast-rated thick walls expressed as chamfered corners
    # Add corner buttress columns
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            bx = sx * (W / 2 - 2)
            by_ = sy * (D / 2 - 2)
            add_to(scene, box(4, 4, H + 0.5, c_dark, bx, by_, 0), f"buttress_{sx}_{sy}")

    # ── Horizontal rustication bands (structural expression)
    for bi in range(3):
        bz = bi * (H / 3) + H / 3 - 0.3
        add_to(scene, box(W + 0.2, D + 0.2, 0.5, c_dark, 0, 0, bz), f"band_{bi}")

    # ── Slit windows (minimal glazing — just 2 per facade)
    for fz in [H * 0.25, H * 0.55, H * 0.8]:
        # South face slits
        for xi in [-15, 0, 15]:
            add_to(scene, box(3, 0.2, 1.2, c_slit, xi, -D / 2 - 0.1, fz), f"slit_s_{xi}_{fz}")
        # North face slits
        for xi in [-15, 0, 15]:
            add_to(scene, box(3, 0.2, 1.2, c_slit, xi, D / 2 + 0.1, fz), f"slit_n_{xi}_{fz}")

    # ── Security berm (earth rampart, 4m high, offset 12m)
    berm_h = 4.0
    berm_t = 8.0
    # South berm
    add_to(scene, box(W + 30, berm_t, berm_h, c_berm, 0, -(D / 2 + 14), 0), "berm_s")
    # North berm
    add_to(scene, box(W + 30, berm_t, berm_h, c_berm, 0, D / 2 + 14, 0), "berm_n")
    # East berm
    add_to(scene, box(berm_t, D + 30, berm_h, c_berm, W / 2 + 14, 0, 0), "berm_e")
    # West berm
    add_to(scene, box(berm_t, D + 30, berm_h, c_berm, -(W / 2 + 14), 0, 0), "berm_w")

    # ── Secure entry (single massive door frame, south face center)
    add_to(scene, box(8, 1.5, 6, c_steel, 0, -(D / 2), 0), "entry_frame")
    # Entry glow
    add_to(scene, box(6.5, 0.3, 5.5, c_entry, 0, -(D / 2 + 0.8), 0.3), "entry_glow")
    # Overhead entry box
    add_to(scene, box(10, 5, 3, c_dark, 0, -(D / 2 + 2.5), 6), "entry_overhang")

    # ── Rooftop (flat, slightly darker panel)
    add_to(scene, box(W + 0.4, D + 0.4, 0.4, c_dark, 0, 0, H), "roof_cap")

    # ── Corner beacon lights (security lighting)
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            lx = sx * (W / 2)
            ly = sy * (D / 2)
            add_to(scene, cyl(0.4, 2.0, 8, c_entry, lx, ly, H + 0.4), f"beacon_{sx}_{sy}")
            add_to(scene, cyl(1.0, 0.4, 8, rgba(80, 160, 255, 180), lx, ly, H + 2.4),
                   f"beacon_light_{sx}_{sy}")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building 4: royal_library_academy
#  97.5m × 51.8m × 18m | 4 floors | CIVIC_CULTURAL
#  Warm stone/cream, golden barrel vault, colonnade, grand stair
# ──────────────────────────────────────────────────────────────────

def build_royal_library_academy():
    """Classical-modern library with barrel-vaulted reading hall, colonnade, grand stair."""
    scene = trimesh.Scene()
    W, D, H = 97.5, 51.8, 18.0
    floor_h = H / 4

    c_stone  = rgba(238, 232, 215, 255)  # warm cream stone
    c_roof   = rgba(198, 182, 155, 255)  # warm roof
    c_vault  = rgba(255, 218, 120, 180)  # golden vault clerestory (glow)
    c_amber  = rgba(255, 190, 80, 200)   # amber light
    c_col    = rgba(225, 215, 195, 255)  # colonnade columns
    c_base   = rgba(215, 205, 185, 255)  # base plinth
    c_door   = rgba(80, 60, 40, 255)     # dark wood door
    c_garden = rgba(80, 120, 70, 200)    # rooftop garden green
    c_glass  = rgba(255, 235, 160, 140)  # clerestory glass (warm amber tint)

    # ── High plinth / base
    add_to(scene, box(W + 6, D + 6, 2.0, c_base), "plinth")

    # ── Main body wings (flanking the central reading hall)
    wing_w = (W - 28) / 2  # side wings
    # Left wing
    add_to(scene, box(wing_w, D, H, c_stone, -(W / 2 - wing_w / 2), 0, 0), "wing_left")
    # Right wing
    add_to(scene, box(wing_w, D, H, c_stone, W / 2 - wing_w / 2, 0, 0), "wing_right")

    # ── Central nave / reading hall (full height + vault)
    nave_w = 28
    nave_h = H * 0.85
    add_to(scene, box(nave_w, D, nave_h, c_stone, 0, 0, 0), "nave_body")

    # ── Barrel vault over reading hall (crowning element, glowing amber)
    vault_radius = nave_w / 2 * 0.9
    vault_len = D
    add_to(scene,
           barrel_vault(vault_radius, vault_len, segs=24,
                        color=c_vault, cx=0, cy=0, cz=nave_h),
           "barrel_vault")

    # ── Clerestory windows in barrel vault (amber glow bands)
    for ci in range(6):
        ang = math.radians(20 + ci * 25)
        vx = vault_radius * math.cos(ang) * 0.7
        vz = nave_h + vault_radius * math.sin(ang) * 0.7
        add_to(scene, box(3.0, D * 0.8, 0.8, c_amber, vx, 0, vz), f"clerestory_l_{ci}")
        add_to(scene, box(3.0, D * 0.8, 0.8, c_amber, -vx, 0, vz), f"clerestory_r_{ci}")

    # ── Colonnade base (south face — 14 columns)
    n_cols = 14
    col_spacing = W / (n_cols - 1)
    col_r = 1.2
    col_h = floor_h * 2
    for ci in range(n_cols):
        cx2 = -W / 2 + ci * col_spacing
        add_to(scene, cyl(col_r, col_h, 16, c_col, cx2, -(D / 2 + 1.5), 1.5), f"col_{ci}")
        # capital (box on top)
        add_to(scene, box(3.5, 3.5, 0.8, c_col, cx2, -(D / 2 + 1.5), col_h + 1.5), f"cap_{ci}")

    # ── Entablature (horizontal beam over colonnade)
    add_to(scene, box(W + 4, 3.0, 1.5, c_stone, 0, -(D / 2 + 1.5), col_h + 2.3), "entablature")

    # ── Grand entry stair (south face — stepping down 4 treads)
    stair_w = 22
    for si in range(5):
        add_to(scene, box(stair_w - si * 2, 2.5, 0.4, c_base,
                          0, -(D / 2 + 3 + si * 2.5), si * 0.4), f"stair_{si}")

    # ── Ornamental entry portal
    add_to(scene, box(10, 1.5, 8, c_stone, 0, -(D / 2 + 0.5), 0), "portal_arch")
    add_to(scene, box(8, 0.3, 6.5, c_glass, 0, -(D / 2 + 1.3), 0.8), "portal_door_glow")

    # ── Window bays in wings (arched window shapes approximated)
    for row in range(4):
        fz = row * floor_h + 1.0
        n_win = 5
        for side in [-1, 1]:
            for wi in range(n_win):
                wx = side * (W / 2 - wing_w / 2) + (-wing_w / 2 + (wi + 0.5) * (wing_w / n_win))
                add_to(scene, box(wing_w / n_win - 1.2, 0.2, floor_h - 1.5, c_glass,
                                  wx, -D / 2 - 0.1, fz), f"win_wing_{side}_{row}_{wi}")

    # ── Horizontal cornice bands at each floor
    for fi in range(5):
        fz = fi * floor_h + floor_h - 0.3
        add_to(scene, box(W + 2, D + 2, 0.5, c_roof, 0, 0, fz), f"cornice_{fi}")

    # ── Rooftop garden (north/back half of roof)
    add_to(scene, box(W * 0.7, D * 0.5, 0.6, c_garden, 0, D * 0.15, H + 0.1), "roof_garden")

    # ── Parapet walls
    add_to(scene, box(W + 4, 1.0, 2.0, c_stone, 0, -(D / 2 + 0.5), H), "parapet_s")
    add_to(scene, box(W + 4, 1.0, 2.0, c_stone, 0, D / 2 + 0.5, H), "parapet_n")
    add_to(scene, box(1.0, D + 4, 2.0, c_stone, -(W / 2 + 0.5), 0, H), "parapet_w")
    add_to(scene, box(1.0, D + 4, 2.0, c_stone, W / 2 + 0.5, 0, H), "parapet_e")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building 5: nexus_labs_media_studio
#  76.2m × 48.8m × 13.5m | 3 floors | RESEARCH
#  Dark glass fins, ribbon windows, broadcast mast, purple/teal screen
# ──────────────────────────────────────────────────────────────────

def build_nexus_labs_media_studio():
    """Contemporary media studio with ribbon windows, fins, broadcast mast, LED screen."""
    scene = trimesh.Scene()
    W, D, H = 76.2, 48.8, 13.5
    floor_h = H / 3  # 4.5m per floor

    c_dglass = rgba(30, 40, 50, 230)     # dark glass body
    c_fin    = rgba(50, 60, 70, 255)     # dark metal fins
    c_ribbon = rgba(120, 200, 220, 180)  # ribbon window teal glow
    c_screen = rgba(140, 60, 200, 220)   # LED screen purple glow
    c_screen2= rgba(40, 200, 200, 200)   # LED screen teal glow
    c_mast   = rgba(160, 165, 170, 255)  # broadcast mast
    c_frame  = rgba(60, 70, 80, 255)     # frames
    c_plaza  = rgba(80, 85, 90, 255)     # media plaza paving
    c_cantil = rgba(40, 50, 60, 230)     # cantilevered screen frame

    # ── Main body
    add_to(scene, box(W, D, H, c_dglass), "body_main")

    # ── Ribbon window bands (horizontal strips all around, every floor)
    ribbon_h = floor_h * 0.55
    for row in range(3):
        rz = row * floor_h + floor_h * 0.2
        # South & north ribbon
        add_to(scene, box(W + 0.2, 0.25, ribbon_h, c_ribbon, 0, -D / 2 - 0.12, rz), f"rib_s_{row}")
        add_to(scene, box(W + 0.2, 0.25, ribbon_h, c_ribbon, 0, D / 2 + 0.12, rz), f"rib_n_{row}")
        # East & west ribbon
        add_to(scene, box(0.25, D + 0.2, ribbon_h, c_ribbon, -W / 2 - 0.12, 0, rz), f"rib_w_{row}")
        add_to(scene, box(0.25, D + 0.2, ribbon_h, c_ribbon, W / 2 + 0.12, 0, rz), f"rib_e_{row}")

    # ── Dark glass fins (vertical elements on south facade, 20 fins)
    n_fins = 20
    fin_d = 2.5
    fin_h = H + 2
    fin_t = 0.5
    for fi in range(n_fins):
        fx = -W / 2 + (fi + 0.5) * (W / n_fins)
        add_to(scene, box(fin_t, fin_d, fin_h, c_fin, fx, -D / 2 - fin_d / 2, 0), f"fin_s_{fi}")

    # ── East facade fins (10 fins)
    for fi in range(10):
        fy = -D / 2 + (fi + 0.5) * (D / 10)
        add_to(scene, box(fin_d, fin_t, fin_h, c_fin, W / 2 + fin_d / 2, fy, 0), f"fin_e_{fi}")

    # ── Cantilevered LED screen (south facade, upper floors)
    screen_w = 25
    screen_h = 9
    screen_z = floor_h
    # Screen frame
    add_to(scene, box(screen_w + 1, 1.5, screen_h + 1, c_cantil,
                      0, -(D / 2 + 1.5), screen_z), "screen_frame")
    # LED screen surface (purple)
    add_to(scene, box(screen_w, 0.3, screen_h, c_screen,
                      0, -(D / 2 + 2.3), screen_z + 0.5), "screen_main")
    # Teal secondary screen
    add_to(scene, box(screen_w * 0.4, 0.25, screen_h * 0.3, c_screen2,
                      screen_w * 0.25, -(D / 2 + 2.5), screen_z + screen_h * 0.3),
           "screen_accent")
    # Screen support arm
    add_to(scene, box(2, 3, 1.5, c_fin, 0, -(D / 2 + 0.8), screen_z + screen_h),
           "screen_bracket")

    # ── Media plaza (paving in front of south facade)
    add_to(scene, box(W + 20, 18, 0.3, c_plaza, 0, -(D / 2 + 9), -0.2), "plaza")

    # ── Broadcast mast (north-east corner, top mounted)
    mast_h = 22
    add_to(scene, cyl(0.5, mast_h, 8, c_mast, W / 2 - 6, D / 2 - 6, H), "mast_main")
    # mast dishes
    add_to(scene, box(3, 3, 0.4, c_mast, W / 2 - 6, D / 2 - 6, H + mast_h - 2), "mast_dish")
    add_to(scene, cyl(2, 0.3, 8, c_mast, W / 2 - 6, D / 2 - 6, H + mast_h), "mast_cap")
    # mast guy wires (thin cylinders)
    add_to(scene, box(0.1, 0.1, mast_h * 0.8, c_mast,
                      W / 2 - 6, D / 2 - 6 + 8, H + mast_h * 0.1), "guy_n")

    # ── Roof equipment
    # Satellite dishes
    add_to(scene, cyl(2.5, 0.3, 16, c_fin, -W / 2 + 10, D / 2 - 8, H), "dish_1")
    add_to(scene, cyl(1.8, 0.3, 16, c_fin, -W / 2 + 20, D / 2 - 8, H), "dish_2")

    # ── Rooftop cooling units
    for xi in range(4):
        add_to(scene, box(8, 5, 2.5, c_fin, -W / 2 + 12 + xi * 18, -D / 2 + 6, H),
               f"roof_cool_{xi}")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building 6: animus_prime_robotics_factory
#  152.4m × 61m × 24m | 3 floors | INDUSTRIAL
#  Corrugated metal, dramatic sawtooth monitor roof, crane infrastructure
# ──────────────────────────────────────────────────────────────────

def build_animus_prime_robotics_factory():
    """Large-span industrial facility with dramatic sawtooth monitor roof and crane."""
    scene = trimesh.Scene()
    W, D, H = 152.4, 61.0, 24.0
    bay_h = H / 3   # 8m floor heights

    c_metal  = rgba(130, 132, 128, 255)  # corrugated grey metal
    c_dark   = rgba(90, 90, 88, 255)     # dark metal recesses
    c_saw    = rgba(140, 135, 130, 255)  # sawtooth roof metal
    c_glass  = rgba(255, 165, 60, 160)   # orange glow through skylights
    c_accent = rgba(255, 130, 40, 200)   # warm orange accent
    c_crane  = rgba(200, 160, 30, 255)   # crane — industrial yellow
    c_dock   = rgba(80, 80, 78, 255)     # loading dock dark
    c_door   = rgba(200, 140, 30, 200)   # door/dock opening glow

    # ── Main body
    add_to(scene, box(W, D, H, c_metal), "body_main")

    # ── Corrugated wall texture (horizontal ribs on facades)
    n_ribs = int(H / 1.2)
    for ri in range(n_ribs):
        rz = ri * 1.2 + 0.6
        add_to(scene, box(W + 0.4, 0.2, 0.3, c_dark, 0, -D / 2, rz), f"rib_s_{ri}")
        add_to(scene, box(W + 0.4, 0.2, 0.3, c_dark, 0, D / 2, rz), f"rib_n_{ri}")

    # ── Sawtooth monitor roof (9 teeth, each a triangular prism + glazed north face)
    n_teeth = 9
    tooth_w = W / n_teeth
    tooth_h = 7.0   # height of sawtooth above main roof
    for ti in range(n_teeth):
        tx = -W / 2 + ti * tooth_w + tooth_w / 2
        # Triangular prism (steep south slope + vertical north glazed face)
        t_mesh = prism_triangular(tooth_w - 0.5, D * 0.9, tooth_h,
                                  c_saw, tx, 0, H)
        add_to(scene, t_mesh, f"tooth_{ti}")
        # Glazed north (vertical) face of each tooth = glowing orange
        add_to(scene, box(tooth_w - 1.0, 0.4, tooth_h * 0.85, c_glass,
                          tx, 0, H + 0.8), f"tooth_glow_{ti}")

    # ── Sawtooth roof overhanging the main body slightly
    add_to(scene, box(W + 2, D + 2, 0.6, c_dark, 0, 0, H - 0.3), "roof_base")

    # ── Crane infrastructure (gantry crane spanning building width)
    crane_z = H + tooth_h + 1
    crane_beam_w = W * 0.85
    # Bridge girder
    add_to(scene, box(crane_beam_w, 2.5, 3.0, c_crane, 0, 0, crane_z), "crane_bridge")
    # End trucks
    for ex in [-crane_beam_w / 2, crane_beam_w / 2]:
        add_to(scene, box(4, 6, 3, c_crane, ex, 0, crane_z), f"crane_truck_{ex}")
    # Hoist trolley
    add_to(scene, box(6, 4, 4, c_crane, -20, 0, crane_z + 1), "crane_hoist")
    # Hook chain
    add_to(scene, cyl(0.3, 8, 6, c_dark, -20, 0, crane_z - 4), "crane_hook_chain")

    # ── Floor bays articulation (structural columns at 19m intervals)
    n_bays = 8
    for bi in range(n_bays + 1):
        cx2 = -W / 2 + bi * (W / n_bays)
        add_to(scene, box(1.5, D + 2, H + tooth_h, c_dark, cx2, 0, 0), f"struct_col_{bi}")

    # ── Loading docks (north face, 6 bays)
    for di in range(6):
        dx = -W / 2 + 12 + di * 22
        add_to(scene, box(8, 4.5, 5.5, c_dock, dx, D / 2 - 2.5, 0), f"dock_{di}")
        add_to(scene, box(7, 0.3, 5.0, c_door, dx, D / 2 + 0.15, 0.3), f"dock_door_{di}")

    # ── High-bay windows on gabled ends (east/west — orange glow)
    for ew in [-1, 1]:
        xpos = ew * (W / 2 + 0.1)
        add_to(scene, box(0.3, D * 0.6, H * 0.6, c_glass, xpos, 0, H * 0.2),
               f"end_win_{ew}")

    # ── Orange accent glow at sawtooth base
    add_to(scene, box(W + 2, 0.3, 0.3, c_accent, 0, 0, H), "saw_base_glow")

    # ── Ventilation louvers on south face
    for vi in range(5):
        vx = -W / 2 + 15 + vi * 25
        add_to(scene, box(10, 0.4, 3.5, c_dark, vx, -D / 2 - 0.2, H * 0.1), f"louver_{vi}")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building 7: vector_shift_logistics_hub
#  109.7m × 54.9m × 21m | 3 floors | INDUSTRIAL
#  Grey corrugated metal, yellow logistics accents, truck court, skylights
# ──────────────────────────────────────────────────────────────────

def build_vector_shift_logistics_hub():
    """Distribution logistics center with massive truck court, mezzanine, yellow accents."""
    scene = trimesh.Scene()
    W, D, H = 109.7, 54.9, 21.0
    floor_h = H / 3  # 7m per floor

    c_grey   = rgba(135, 138, 135, 255)  # corrugated grey
    c_dark   = rgba(90, 92, 90, 255)     # dark recesses
    c_yellow = rgba(240, 200, 0, 255)    # logistics yellow
    c_yell_g = rgba(255, 220, 20, 200)   # yellow glow
    c_dock   = rgba(70, 72, 70, 255)     # dock recesses
    c_sky    = rgba(200, 230, 255, 120)  # skylight glass
    c_truck  = rgba(80, 85, 80, 255)     # truck court paving

    # ── Main body
    add_to(scene, box(W, D, H, c_grey), "body_main")

    # ── Corrugated rib pattern
    n_ribs = int(H / 1.0)
    for ri in range(n_ribs):
        rz = ri * 1.0 + 0.5
        for face_y, face_nm in [(-D / 2, 's'), (D / 2, 'n')]:
            add_to(scene, box(W + 0.2, 0.15, 0.2, c_dark, 0, face_y, rz), f"rib_{face_nm}_{ri}")

    # ── Yellow accent stripe (logistics branding) - full horizontal band
    band_z = H * 0.15
    add_to(scene, box(W + 0.4, D + 0.4, 1.5, c_yellow, 0, 0, band_z), "yellow_band")
    add_to(scene, box(W + 0.6, D + 0.6, 0.2, c_yell_g, 0, 0, band_z + 1.5), "yellow_glow_top")
    add_to(scene, box(W + 0.6, D + 0.6, 0.2, c_yell_g, 0, 0, band_z - 0.2), "yellow_glow_bot")

    # ── Loading docks (south face — 10 dock bays)
    n_docks = 10
    dock_w = 7.0
    dock_h = 5.5
    dock_z = 0
    for di in range(n_docks):
        dx = -W / 2 + 6 + di * (W / n_docks) + dock_w / 2 - 1
        add_to(scene, box(dock_w, 3.5, dock_h, c_dock, dx, -(D / 2 - 1.5), dock_z),
               f"dock_{di}")
        # Dock door yellow surround
        add_to(scene, box(dock_w + 0.5, 0.3, dock_h + 0.5, c_yellow,
                          dx, -(D / 2 + 0.15), dock_z), f"dock_surround_{di}")

    # ── Truck court (south of building, concrete apron)
    add_to(scene, box(W + 30, 40, 0.3, c_truck, 0, -(D / 2 + 20), -0.15), "truck_court")
    # Truck court yellow lane markings
    for li in range(6):
        lx = -W / 2 + 10 + li * (W / 6)
        add_to(scene, box(1.0, 40, 0.05, c_yell_g, lx, -(D / 2 + 20), 0.15), f"lane_{li}")

    # ── Distribution mezzanine (interior level visible through glazing — upper level)
    mezz_z = floor_h * 2
    add_to(scene, box(W * 0.9, D * 0.85, 0.6, c_dark, 0, 0, mezz_z), "mezzanine")
    # Mezzanine perimeter glow strip
    add_to(scene, box(W * 0.92, D * 0.87, 0.15, c_yell_g, 0, 0, mezz_z + 0.6),
           "mezz_glow")

    # ── Rooftop skylights (flat roof with raised light monitors)
    n_sky_x = 5
    n_sky_y = 3
    for xi in range(n_sky_x):
        for yi in range(n_sky_y):
            sx = -W / 2 + 12 + xi * (W / n_sky_x) + 5
            sy = -D / 2 + 8 + yi * (D / n_sky_y) + 6
            # Skylight curb
            add_to(scene, box(14, 8, 1.2, c_dark, sx, sy, H), f"sky_curb_{xi}_{yi}")
            # Skylight glass
            add_to(scene, box(12, 6, 0.3, c_sky, sx, sy, H + 1.2), f"sky_glass_{xi}_{yi}")

    # ── Corner columns (structural expression)
    for sx2 in [-1, 1]:
        for sy2 in [-1, 1]:
            cxx = sx2 * (W / 2 - 1.5)
            cyy = sy2 * (D / 2 - 1.5)
            add_to(scene, box(3, 3, H + 2, c_dark, cxx, cyy, 0), f"corner_{sx2}_{sy2}")

    # ── Vertical yellow accent columns on corners
    for sx2 in [-1, 1]:
        for sy2 in [-1, 1]:
            cxx = sx2 * (W / 2 + 0.5)
            cyy = sy2 * (D / 2 + 0.5)
            add_to(scene, box(1.5, 1.5, H + 0.5, c_yellow, cxx, cyy, 0), f"ycol_{sx2}_{sy2}")

    # ── North face: distribution office windows (upper 2 floors)
    for row in range(2):
        fz = (row + 1) * floor_h + 1.0
        n_win = 8
        for wi in range(n_win):
            wx = -W / 2 + 8 + wi * (W / n_win)
            add_to(scene, box(W / n_win - 2, 0.2, floor_h - 2, c_sky,
                              wx + W / (n_win * 2), D / 2 + 0.1, fz), f"win_n_{row}_{wi}")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building 8: gaia_synthesis_vertical_farm
#  91.4m × 61m × 12m | 2 floors | LIFE_SCIENCE
#  Full-height greenhouse glass, grow lights (luminescent green), stepped terraces
# ──────────────────────────────────────────────────────────────────

def build_gaia_synthesis_vertical_farm():
    """Luminous vertical farm with full-height greenhouse, living wall, stepped terraces."""
    scene = trimesh.Scene()
    W, D, H = 91.4, 61.0, 12.0
    floor_h = H / 2  # 6m per floor

    c_jade   = rgba(80, 210, 120, 180)   # luminescent green glass
    c_green  = rgba(60, 180, 90, 200)    # grow light green glow
    c_frame  = rgba(80, 100, 85, 255)    # green-tinted steel frame
    c_terr   = rgba(90, 140, 80, 200)    # terrace greenery
    c_plinth = rgba(70, 90, 75, 255)     # dark base
    c_wall   = rgba(60, 200, 100, 170)   # living wall green
    c_struct = rgba(100, 120, 105, 255)  # structural frame
    c_sky    = rgba(100, 220, 130, 150)  # skylight panels
    c_glow   = rgba(40, 255, 100, 150)   # intense grow light glow

    # ── Base plinth
    add_to(scene, box(W + 3, D + 3, 1.0, c_plinth), "plinth")

    # ── Main greenhouse body (full-height glass)
    add_to(scene, box(W, D, H, c_jade), "body_main")

    # ── Structural steel frame (mullion grid)
    # Vertical mullions (every 7.6m across width = 12 bays)
    n_mull = 12
    for mi in range(n_mull + 1):
        mx = -W / 2 + mi * (W / n_mull)
        add_to(scene, box(0.3, D + 0.3, H + 1, c_frame, mx, 0, 0), f"mullion_v_{mi}")

    # Horizontal transom rails at floor levels + mid-height
    for tz in [0, floor_h * 0.33, floor_h, floor_h * 1.33, H]:
        add_to(scene, box(W + 0.3, D + 0.3, 0.25, c_frame, 0, 0, tz), f"transom_{tz:.1f}")

    # ── Grow light panels (interior visible glow rows)
    n_rows = 4
    for fi in range(2):  # 2 floors
        for row in range(n_rows):
            gz = fi * floor_h + row * (floor_h / n_rows) + 0.6
            # Row of grow lights (interior glowing bars)
            add_to(scene, box(W * 0.85, D * 0.8, 0.3, c_glow, 0, 0, gz), f"grow_light_{fi}_{row}")

    # ── Stepped terraces (south face, 2 levels)
    for level in range(3):
        terrace_w = W - level * 15
        terrace_d = 8.0
        tz = level * (H / 3) - 0.1
        ty = -(D / 2 + terrace_d / 2 - 1.0)
        # Terrace slab
        add_to(scene, box(terrace_w, terrace_d, 0.5, c_plinth, 0, ty, tz), f"terrace_{level}")
        # Terrace planting
        add_to(scene, box(terrace_w - 2, terrace_d - 2, 0.8, c_terr, 0, ty, tz + 0.5),
               f"terrace_green_{level}")
        # Terrace glass railing
        add_to(scene, box(terrace_w - 1, 0.15, 1.2, c_jade, 0, ty + terrace_d / 2, tz + 0.5),
               f"terrace_rail_{level}")

    # ── Living wall (south face of building — vertical garden panel)
    living_w = W * 0.5
    living_h = H * 0.8
    add_to(scene, box(living_w, 0.6, living_h, c_wall, W * 0.2, -D / 2 - 0.3, H * 0.1),
           "living_wall")
    # Living wall glow grid
    for wi in range(5):
        for hi2 in range(4):
            lx = W * 0.2 - living_w / 2 + wi * (living_w / 5) + living_w / 10
            lz = H * 0.1 + hi2 * (living_h / 4) + living_h / 8
            add_to(scene, box(living_w / 5 - 0.5, 0.15, living_h / 4 - 0.5, c_green,
                              lx, -D / 2 - 0.6, lz), f"living_panel_{wi}_{hi2}")

    # ── Rooftop greenhouse ridge (sloped glass roof ridge)
    ridge_h = 3.0
    n_bays_x = 8
    bay_w = W / n_bays_x
    for bx_i in range(n_bays_x):
        bx = -W / 2 + bx_i * bay_w + bay_w / 2
        # Ridge pitch (approximated as box)
        add_to(scene, box(bay_w - 0.3, D * 0.9, ridge_h * 0.5, c_jade, bx, 0, H), f"ridge_{bx_i}")

    # ── Roof skylights / solar collectors
    for xi in range(6):
        for yi in range(4):
            sx = -W / 2 + 8 + xi * (W / 6) + 6
            sy = -D / 2 + 7 + yi * (D / 4) + 6
            add_to(scene, box(10, 6, 0.2, c_sky, sx, sy, H + 0.3), f"skylight_{xi}_{yi}")

    # ── Corner structural buttresses (green-glass wrapped)
    for sx2 in [-1, 1]:
        for sy2 in [-1, 1]:
            cx2 = sx2 * (W / 2 - 2.5)
            cy2 = sy2 * (D / 2 - 2.5)
            add_to(scene, box(5, 5, H + 1.5, c_struct, cx2, cy2, 0), f"buttress_{sx2}_{sy2}")
            add_to(scene, box(4.5, 4.5, H + 1.5, c_jade, cx2, cy2, 0),
                   f"buttress_glass_{sx2}_{sy2}")

    # ── Green accent glowing edges
    for edge_z in [0, floor_h, H]:
        add_to(scene, box(W + 1, 0.2, 0.2, c_glow, 0, -D / 2, edge_z), f"edge_s_{edge_z}")
        add_to(scene, box(W + 1, 0.2, 0.2, c_glow, 0, D / 2, edge_z), f"edge_n_{edge_z}")
        add_to(scene, box(0.2, D + 1, 0.2, c_glow, -W / 2, 0, edge_z), f"edge_w_{edge_z}")
        add_to(scene, box(0.2, D + 1, 0.2, c_glow, W / 2, 0, edge_z), f"edge_e_{edge_z}")

    return scene


# ──────────────────────────────────────────────────────────────────
#  Building dispatch table
# ──────────────────────────────────────────────────────────────────

BUILDINGS = {
    "prism_gateway_hq":               build_prism_gateway_hq,
    "neural_block_data_center":       build_neural_block_data_center,
    "vault_archive":                  build_vault_archive,
    "royal_library_academy":          build_royal_library_academy,
    "nexus_labs_media_studio":        build_nexus_labs_media_studio,
    "animus_prime_robotics_factory":  build_animus_prime_robotics_factory,
    "vector_shift_logistics_hub":     build_vector_shift_logistics_hub,
    "gaia_synthesis_vertical_farm":   build_gaia_synthesis_vertical_farm,
}


# ──────────────────────────────────────────────────────────────────
#  Export
# ──────────────────────────────────────────────────────────────────

def export_building(building_id, builder_fn):
    out_path = OUT / f"{building_id}.glb"
    print(f"  Building: {building_id}")
    try:
        scene = builder_fn()

        if len(scene.geometry) == 0:
            raise ValueError("Scene has no geometry!")

        scene.export(str(out_path))
        size_kb = out_path.stat().st_size / 1024
        print(f"    ✓ Exported → {out_path.name}  ({size_kb:.1f} KB)  [{len(scene.geometry)} meshes]")
        return True, size_kb

    except Exception as exc:
        print(f"    ✗ ERROR: {exc}")
        traceback.print_exc()
        return False, 0.0


def main():
    print(f"\n{'='*65}")
    print(f"  Collective AI Mega Campus — Buildings 1-8 GLB Generator")
    print(f"{'='*65}\n")
    print(f"  Output directory: {OUT}\n")

    succeeded = []
    failed = []

    for bld_id, builder in BUILDINGS.items():
        ok, size_kb = export_building(bld_id, builder)
        if ok:
            succeeded.append((bld_id, size_kb))
        else:
            failed.append(bld_id)

    print(f"\n{'='*65}")
    print(f"  SUMMARY: {len(succeeded)}/{len(BUILDINGS)} buildings generated successfully\n")

    if succeeded:
        print("  Succeeded:")
        for bld_id, size_kb in succeeded:
            print(f"    ✓ {bld_id:<45} {size_kb:>8.1f} KB")

    if failed:
        print(f"\n  Failed ({len(failed)}):")
        for bld_id in failed:
            print(f"    ✗ {bld_id}")

    print(f"\n{'='*65}\n")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
