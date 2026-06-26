#!/usr/bin/env python3
"""
Render the Collective AI Mega Campus from multiple camera angles.
Produces 4 presentation-quality images using matplotlib + numpy.

Views:
  hero      — aerial isometric SW-to-NE perspective (hero shot)
  dusk      — same angle with dusk/night palette and building glow
  overview  — near-vertical district overview with labels
  ground    — cinematic ground-level view from south entry

Usage: python3 scripts/render_scene.py [--view hero|dusk|overview|ground|all]

Note: Blender rendering reference code is in the BLENDER_RENDER_CODE constant
at the bottom of this file.
"""

import sys
import json
import math
import argparse
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Rectangle, Ellipse, FancyArrowPatch
from matplotlib.collections import PatchCollection
from matplotlib.colors import LinearSegmentedColormap
import matplotlib.patheffects as pe

REPO = Path(__file__).parent.parent
DATA = REPO / "data" / "facilities.json"
OUT  = REPO / "renders"
OUT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Arch-family colour palette (RGB 0-1)
# ---------------------------------------------------------------------------
FAMILY_COLORS = {
    "DATA_BUNKER":         (0.12, 0.14, 0.16),
    "CORPORATE_TOWER":     (0.78, 0.84, 0.90),
    "CIVIC_CULTURAL":      (0.94, 0.92, 0.86),
    "LIFE_SCIENCE":        (0.31, 0.78, 0.39),
    "INDUSTRIAL":          (0.55, 0.55, 0.53),
    "WELLNESS_RECREATION": (0.98, 0.98, 0.95),
    "MIXED_USE":           (0.78, 0.51, 0.35),
    "TRANSPORT":           (0.82, 0.84, 0.86),
    "SECURITY":            (0.20, 0.20, 0.20),
    "RESEARCH":            (0.74, 0.78, 0.82),
}

DISTRICT_COLORS = {
    "utility_data":                       "#1a2535",
    "governance_knowledge":               "#2a3a5c",
    "public_wellness":                    "#1e3d2a",
    "manufacturing_logistics":            "#3a2a1a",
    "bioenergy_farm_lifescience":         "#1a3c28",
    "visitor_hotel_mobility_residential": "#3c2a3c",
}

DISTRICT_LABELS = {
    "utility_data":                       "Utility &\nData",
    "governance_knowledge":               "Governance &\nKnowledge",
    "public_wellness":                    "Public &\nWellness",
    "manufacturing_logistics":            "Manufacturing\n& Logistics",
    "bioenergy_farm_lifescience":         "Bioenergy,\nFarm & Life-Sci",
    "visitor_hotel_mobility_residential": "Visitor, Hotel\n& Residential",
}


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_data():
    with open(DATA) as fh:
        raw = json.load(fh)
    campus   = raw["campus"]
    districts = {d["id"]: d for d in raw["districts"]}
    buildings = raw["facilities"]
    site      = raw.get("site_elements", {})
    return campus, districts, buildings, site


# ---------------------------------------------------------------------------
# Isometric projection helpers
# ---------------------------------------------------------------------------
# Camera: SW corner looking NE, ~35° elevation
# Campus coordinates: x = west-east (0→1097), y = south-north (0→664)

CAM_ANGLE_H = math.radians(30)   # horizontal rotation (30° from x-axis)
CAM_ANGLE_V = math.radians(38)   # elevation angle

def proj_iso(x, y, z):
    """Project campus (x,y,z) to 2D screen coordinates for hero/dusk views."""
    sx = (x - y) * math.cos(CAM_ANGLE_H)
    sy = (x + y) * math.sin(CAM_ANGLE_H) * 0.42 + z * math.sin(CAM_ANGLE_V)
    return sx, sy


def proj_overview(x, y, z):
    """Nearly top-down projection with slight NW tilt for overview."""
    angle = math.radians(15)
    sx = x + z * math.cos(angle) * 0.2
    sy = y + z * math.sin(angle) * 0.15
    return sx, sy


def shade_color(rgb, factor):
    """Multiply each channel by factor, clamping to [0,1]."""
    return tuple(min(1.0, c * factor) for c in rgb)


def add_color(rgb, delta):
    """Add delta to each channel, clamping."""
    return tuple(min(1.0, max(0.0, c + delta)) for c in rgb)


def draw_building_iso(ax, bx, by, w, d, h, color, proj_fn=proj_iso,
                      outline=True, lw=0.3, zorder=5, alpha=1.0):
    """
    Draw a 3D building box using painter's-algorithm-friendly filled polygons.
    Three visible faces: top (brightest), south (medium), west (darkest).
    Returns the approximate screen bounding box for label placement.
    """
    hw, hd = w / 2, d / 2

    # 8 box corners [x, y, z]
    corners_3d = [
        (bx - hw, by - hd, 0),  # 0 SW base
        (bx + hw, by - hd, 0),  # 1 SE base
        (bx + hw, by + hd, 0),  # 2 NE base
        (bx - hw, by + hd, 0),  # 3 NW base
        (bx - hw, by - hd, h),  # 4 SW top
        (bx + hw, by - hd, h),  # 5 SE top
        (bx + hw, by + hd, h),  # 6 NE top
        (bx - hw, by + hd, h),  # 7 NW top
    ]
    p = [proj_fn(*c) for c in corners_3d]

    ec = (0.05, 0.05, 0.05) if outline else color

    # Top face  — full brightness
    top_c = shade_color(color, 1.0)
    top_pts = [p[4], p[5], p[6], p[7]]
    top_poly = plt.Polygon(top_pts, closed=True,
                           facecolor=top_c, edgecolor=ec, linewidth=lw,
                           zorder=zorder + 0.2, alpha=alpha)
    ax.add_patch(top_poly)

    # South face (near face, y = by-hd) — medium brightness
    south_c = shade_color(color, 0.80)
    south_pts = [p[0], p[1], p[5], p[4]]
    south_poly = plt.Polygon(south_pts, closed=True,
                             facecolor=south_c, edgecolor=ec, linewidth=lw,
                             zorder=zorder, alpha=alpha)
    ax.add_patch(south_poly)

    # West face (left face, x = bx-hw) — darkest
    west_c = shade_color(color, 0.62)
    west_pts = [p[0], p[3], p[7], p[4]]
    west_poly = plt.Polygon(west_pts, closed=True,
                            facecolor=west_c, edgecolor=ec, linewidth=lw,
                            zorder=zorder - 0.1, alpha=alpha)
    ax.add_patch(west_poly)

    screen_xs = [pp[0] for pp in p]
    screen_ys = [pp[1] for pp in p]
    return (min(screen_xs), max(screen_xs), min(screen_ys), max(screen_ys))


def buildings_sorted_far_to_near(buildings, proj_fn=proj_iso):
    """Sort buildings back-to-front for painter's algorithm."""
    def key(b):
        bx, by = b["position"]
        sx, sy = proj_fn(bx, by, 0)
        return sy  # render lower sy (further back in view) first
    return sorted(buildings, key=key)


# ---------------------------------------------------------------------------
# Gradient sky helpers
# ---------------------------------------------------------------------------

def add_gradient_sky(fig, ax, colors, extent, zorder=-10):
    """Draw a vertical gradient background rectangle."""
    n = 200
    gradient = np.linspace(0, 1, n).reshape(n, 1)
    xmin, xmax, ymin, ymax = extent
    ax.imshow(
        np.ones((n, 1, 3)) * np.array([colors[0]]) * (1 - gradient)
        + np.ones((n, 1, 3)) * np.array([colors[1]]) * gradient,
        extent=[xmin, xmax, ymin, ymax],
        origin='lower', aspect='auto', zorder=zorder,
        interpolation='bilinear'
    )


def add_ground_plane_iso(ax, campus_w, campus_d, proj_fn, color, zorder=1):
    """Draw a filled ground quad in isometric space."""
    corners = [
        proj_fn(0,        0,        0),
        proj_fn(campus_w, 0,        0),
        proj_fn(campus_w, campus_d, 0),
        proj_fn(0,        campus_d, 0),
    ]
    poly = plt.Polygon(corners, closed=True, facecolor=color,
                       edgecolor='none', zorder=zorder)
    ax.add_patch(poly)


def add_water_features_iso(ax, water_features, proj_fn, color=(0.15, 0.45, 0.70), zorder=2):
    """Render water features as coloured polygons."""
    for wf in water_features:
        loc = wf.get("location", "")
        t   = wf.get("type", "")
        w_col = color

        if "north_perimeter" in loc:
            corners = [proj_fn(0,   664-30, 0), proj_fn(1097, 664-30, 0),
                       proj_fn(1097, 664,   0), proj_fn(0,    664,    0)]
            ax.add_patch(plt.Polygon(corners, closed=True, facecolor=w_col,
                                     edgecolor='none', zorder=zorder, alpha=0.75))
        elif "east_perimeter" in loc:
            corners = [proj_fn(1097-25, 0,   0), proj_fn(1097, 0,   0),
                       proj_fn(1097,   664,  0), proj_fn(1097-25, 664, 0)]
            ax.add_patch(plt.Polygon(corners, closed=True, facecolor=w_col,
                                     edgecolor='none', zorder=zorder, alpha=0.75))
        elif "civic_plaza" in loc or "pool" in t:
            # Central reflecting pool
            cx, cy = proj_fn(548, 332, 0)
            e = Ellipse((cx, cy), 35, 20, facecolor=w_col, edgecolor='none',
                        zorder=zorder + 1, alpha=0.85)
            ax.add_patch(e)
        elif "east_west" in loc or "bioswale" in t:
            # Blue-green corridor - a thin E-W band
            corners = [proj_fn(0,   310, 0), proj_fn(1097, 310, 0),
                       proj_fn(1097, 330, 0), proj_fn(0,   330, 0)]
            ax.add_patch(plt.Polygon(corners, closed=True,
                                     facecolor=(0.22, 0.55, 0.30),
                                     edgecolor='none', zorder=zorder, alpha=0.5))


def add_trees_iso(ax, proj_fn, n_trees=220, zorder=3, color='#3a7a3a', size=4):
    """Scatter tree dots across the campus."""
    rng = np.random.default_rng(42)
    # Keep trees away from dense building centres
    xs = rng.uniform(20, 1077, n_trees)
    ys = rng.uniform(20, 644,  n_trees)
    sx = []
    sy = []
    for x, y in zip(xs, ys):
        px, py = proj_fn(x, y, 0)
        sx.append(px)
        sy.append(py)
    ax.scatter(sx, sy, s=size, color=color, zorder=zorder, alpha=0.6, linewidths=0)


def add_roads_iso(ax, proj_fn, color='white', lw=0.6, zorder=4):
    """Draw the main campus road network as lines in isometric space."""
    # Main N-S boulevard
    roads = [
        # Main boulevard (x=548)
        [(548, 0, 0), (548, 664, 0)],
        # Perimeter road N
        [(0, 644, 0), (1097, 644, 0)],
        # Perimeter road S
        [(0, 20, 0), (1097, 20, 0)],
        # Perimeter road W
        [(20, 0, 0), (20, 664, 0)],
        # Perimeter road E
        [(1077, 0, 0), (1077, 664, 0)],
        # Cross road E-W at y=332
        [(0, 332, 0), (1097, 332, 0)],
        # Cross road at y=450
        [(0, 450, 0), (1097, 450, 0)],
        # District road x=350
        [(350, 0, 0), (350, 664, 0)],
        # District road x=750
        [(750, 0, 0), (750, 664, 0)],
    ]
    for seg in roads:
        pts = [proj_fn(*p) for p in seg]
        xs_r = [p[0] for p in pts]
        ys_r = [p[1] for p in pts]
        ax.plot(xs_r, ys_r, color=color, linewidth=lw, zorder=zorder, alpha=0.5)


def add_compass_rose(ax, x, y, size=0.04, color='white', zorder=20):
    """Draw a simple compass rose at axis fraction (x, y)."""
    ax.annotate('N', xy=(x, y + size*1.4), xycoords='axes fraction',
                ha='center', va='bottom', color=color, fontsize=8,
                fontweight='bold', zorder=zorder)
    ax.annotate('', xy=(x, y + size), xycoords='axes fraction',
                xytext=(x, y), textcoords='axes fraction',
                arrowprops=dict(arrowstyle='->', color=color, lw=1.5),
                zorder=zorder)


# ---------------------------------------------------------------------------
# View 1 — HERO VIEW
# ---------------------------------------------------------------------------

def render_hero(buildings, campus, site, out_path):
    print("  Rendering hero_view.png ...")
    fig, ax = plt.subplots(figsize=(20, 12), dpi=150)
    ax.set_aspect('equal')
    ax.axis('off')
    fig.patch.set_facecolor('#0a1520')

    campus_w = campus["site"]["width_m"]
    campus_d = campus["site"]["depth_m"]

    # Determine screen extents
    corners_world = [
        (0, 0, 0), (campus_w, 0, 0),
        (campus_w, campus_d, 0), (0, campus_d, 0),
        (0, 0, 35), (campus_w, 0, 35), (campus_w, campus_d, 35), (0, campus_d, 35),
    ]
    pcs = [proj_iso(x, y, z) for x, y, z in corners_world]
    all_sx = [p[0] for p in pcs]
    all_sy = [p[1] for p in pcs]
    pad_x = (max(all_sx) - min(all_sx)) * 0.05
    pad_y = (max(all_sy) - min(all_sy)) * 0.10
    xmin, xmax = min(all_sx) - pad_x, max(all_sx) + pad_x
    ymin, ymax = min(all_sy) - pad_y, max(all_sy) + pad_y

    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)

    # Sky gradient — deep blue (top) to steel blue (bottom horizon)
    sky_top    = np.array([0.06, 0.10, 0.20])
    sky_bottom = np.array([0.30, 0.48, 0.62])
    gradient = np.linspace(0, 1, 300).reshape(300, 1)
    sky_img = sky_top * (1 - gradient) + sky_bottom * gradient
    ax.imshow(sky_img.reshape(300, 1, 3) * np.ones((1, 2, 1)),
              extent=[xmin, xmax, ymin, ymax], origin='lower',
              aspect='auto', zorder=-10, interpolation='bilinear')

    # Ground plane
    add_ground_plane_iso(ax, campus_w, campus_d, proj_iso,
                         color=(0.22, 0.27, 0.22), zorder=1)

    # Water features
    water = site.get("water_features", [])
    add_water_features_iso(ax, water, proj_iso, color=(0.16, 0.46, 0.72), zorder=2)

    # Roads
    add_roads_iso(ax, proj_iso, color='#c8d4c0', lw=0.5, zorder=3)

    # Trees
    add_trees_iso(ax, proj_iso, n_trees=280, zorder=4, color='#2d5e2d', size=3)

    # Buildings — painter's order (back to front)
    sorted_bldgs = buildings_sorted_far_to_near(buildings, proj_iso)
    for b in sorted_bldgs:
        bx, by   = b["position"]
        w,  d    = b["footprint_m"]
        h        = b["height_m"]
        family   = b.get("arch_family", "RESEARCH")
        color    = FAMILY_COLORS.get(family, (0.6, 0.6, 0.6))
        draw_building_iso(ax, bx, by, w, d, h, color, proj_fn=proj_iso,
                          lw=0.25, zorder=5, alpha=1.0)

    # Landmark labels for key buildings
    landmarks = [b for b in buildings if b.get("landmark", False)]
    for b in landmarks:
        bx, by = b["position"]
        sx, sy = proj_iso(bx, by, b["height_m"] + 3)
        ax.text(sx, sy, b["name"], fontsize=4.5, color='white',
                ha='center', va='bottom', zorder=30,
                fontfamily='monospace',
                path_effects=[pe.withStroke(linewidth=1.5, foreground='#0a1520')])

    # Title block
    ax.text(0.02, 0.97, "COLLECTIVE AI MEGA CAMPUS",
            transform=ax.transAxes, fontsize=14, color='white',
            fontweight='bold', va='top', ha='left', zorder=30,
            fontfamily='monospace')
    ax.text(0.02, 0.92, "Master Plan — Aerial Isometric View\nNortheast Columbus Growth Corridor, Ohio",
            transform=ax.transAxes, fontsize=7, color='#9ab8cc',
            va='top', ha='left', zorder=30, linespacing=1.6)

    # Scale bar
    seg_start = proj_iso(100, 40, 0)
    seg_end   = proj_iso(300, 40, 0)
    ax.plot([seg_start[0], seg_end[0]], [seg_start[1], seg_end[1]],
            color='white', lw=2, zorder=25)
    ax.text((seg_start[0] + seg_end[0]) / 2, seg_start[1] - (ymax - ymin) * 0.012,
            '200 m', color='white', fontsize=7, ha='center', va='top', zorder=25)

    # Compass rose
    add_compass_rose(ax, 0.93, 0.06, size=0.035, color='white')

    # Legend
    legend_handles = []
    for family, fc in FAMILY_COLORS.items():
        legend_handles.append(
            mpatches.Patch(facecolor=fc, edgecolor='grey', linewidth=0.5,
                           label=family.replace('_', ' ').title())
        )
    ax.legend(handles=legend_handles, loc='lower left', bbox_to_anchor=(0.01, 0.01),
              fontsize=5, framealpha=0.4, facecolor='#0a1520', edgecolor='#3a5a7a',
              labelcolor='white', ncol=2, handlelength=1.2, handleheight=0.9,
              borderpad=0.6, labelspacing=0.4)

    plt.tight_layout(pad=0)
    fig.savefig(out_path, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"    Saved: {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")


# ---------------------------------------------------------------------------
# View 2 — DUSK / NIGHT VIEW
# ---------------------------------------------------------------------------

def render_dusk(buildings, campus, site, out_path):
    print("  Rendering dusk_render.png ...")
    fig, ax = plt.subplots(figsize=(20, 12), dpi=150)
    ax.set_aspect('equal')
    ax.axis('off')
    fig.patch.set_facecolor('#020508')

    campus_w = campus["site"]["width_m"]
    campus_d = campus["site"]["depth_m"]

    corners_world = [
        (0, 0, 0), (campus_w, 0, 0), (campus_w, campus_d, 0), (0, campus_d, 0),
        (0, 0, 35), (campus_w, 0, 35), (campus_w, campus_d, 35), (0, campus_d, 35),
    ]
    pcs = [proj_iso(x, y, z) for x, y, z in corners_world]
    all_sx = [p[0] for p in pcs]
    all_sy = [p[1] for p in pcs]
    pad_x = (max(all_sx) - min(all_sx)) * 0.05
    pad_y = (max(all_sy) - min(all_sy)) * 0.10
    xmin, xmax = min(all_sx) - pad_x, max(all_sx) + pad_x
    ymin, ymax = min(all_sy) - pad_y, max(all_sy) + pad_y

    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)

    # Dusk sky — deep indigo (top) to burnt orange horizon (bottom)
    sky_top    = np.array([0.02, 0.03, 0.10])
    sky_mid    = np.array([0.25, 0.12, 0.06])
    sky_bottom = np.array([0.70, 0.30, 0.04])
    n = 300
    gradient = np.linspace(0, 1, n).reshape(n, 1)
    # Three-stop gradient
    sky_img = np.zeros((n, 1, 3))
    for i in range(n):
        t = i / (n - 1)
        if t < 0.5:
            t2 = t * 2
            sky_img[i, 0] = sky_top * (1 - t2) + sky_mid * t2
        else:
            t2 = (t - 0.5) * 2
            sky_img[i, 0] = sky_mid * (1 - t2) + sky_bottom * t2
    ax.imshow(sky_img * np.ones((1, 2, 1)),
              extent=[xmin, xmax, ymin, ymax], origin='lower',
              aspect='auto', zorder=-10, interpolation='bilinear')

    # Ground plane — dark asphalt
    add_ground_plane_iso(ax, campus_w, campus_d, proj_iso,
                         color=(0.06, 0.07, 0.09), zorder=1)

    # Water — dusk reflection (orange-tinted)
    water = site.get("water_features", [])
    add_water_features_iso(ax, water, proj_iso,
                           color=(0.22, 0.18, 0.35), zorder=2)

    # Roads — cyan kinetic glow
    add_roads_iso(ax, proj_iso, color='#00e5ff', lw=0.8, zorder=3)

    # Buildings at night — lit windows = brighter colours
    sorted_bldgs = buildings_sorted_far_to_near(buildings, proj_iso)
    for b in sorted_bldgs:
        bx, by = b["position"]
        w,  d  = b["footprint_m"]
        h      = b["height_m"]
        family = b.get("arch_family", "RESEARCH")
        base_c = FAMILY_COLORS.get(family, (0.5, 0.5, 0.5))
        # Night: darken base but add warm amber window-glow on top face
        night_c = shade_color(base_c, 0.55)
        # Window glow: warm orange overlay on south face for lit buildings
        draw_building_iso(ax, bx, by, w, d, h, night_c, proj_fn=proj_iso,
                          lw=0.15, zorder=5, alpha=0.95)
        # Lit-window highlight layer on south face
        if family not in ("DATA_BUNKER", "SECURITY", "INDUSTRIAL"):
            hw, hd = w / 2, d / 2
            win_c = (0.95, 0.75, 0.25)
            p4 = proj_iso(bx - hw, by - hd, h * 0.2)
            p5 = proj_iso(bx + hw, by - hd, h * 0.2)
            p5t = proj_iso(bx + hw, by - hd, h * 0.85)
            p4t = proj_iso(bx - hw, by - hd, h * 0.85)
            win_poly = plt.Polygon([p4, p5, p5t, p4t], closed=True,
                                   facecolor=win_c, edgecolor='none',
                                   zorder=5.5, alpha=0.18)
            ax.add_patch(win_poly)

    # Glow halos around landmark towers
    for b in buildings:
        if b.get("landmark", False):
            bx, by = b["position"]
            sx, sy = proj_iso(bx, by, b["height_m"] / 2)
            e = Ellipse((sx, sy), width=30, height=20, facecolor=(0.95, 0.65, 0.20),
                        edgecolor='none', zorder=4, alpha=0.08)
            ax.add_patch(e)

    # Starfield
    rng = np.random.default_rng(7)
    star_x = rng.uniform(xmin, xmax, 600)
    star_y = rng.uniform(ymin + (ymax - ymin) * 0.55, ymax, 600)
    ax.scatter(star_x, star_y, s=0.3, color='white', alpha=0.5, zorder=-5)

    # Title
    ax.text(0.02, 0.97, "COLLECTIVE AI MEGA CAMPUS",
            transform=ax.transAxes, fontsize=14, color='#f0c060',
            fontweight='bold', va='top', ha='left', zorder=30, fontfamily='monospace')
    ax.text(0.02, 0.92, "Dusk Render — Kinetic Road Network Active\nNortheast Columbus, Ohio",
            transform=ax.transAxes, fontsize=7, color='#9aaccc',
            va='top', ha='left', zorder=30, linespacing=1.6)

    add_compass_rose(ax, 0.93, 0.06, size=0.035, color='#f0c060')

    plt.tight_layout(pad=0)
    fig.savefig(out_path, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"    Saved: {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")


# ---------------------------------------------------------------------------
# View 3 — DISTRICT OVERVIEW (near top-down)
# ---------------------------------------------------------------------------

def render_overview(buildings, campus, districts, out_path):
    print("  Rendering district_overview.png ...")
    fig, ax = plt.subplots(figsize=(16, 14), dpi=150)
    ax.set_aspect('equal')
    ax.axis('off')
    fig.patch.set_facecolor('#0c1420')

    campus_w = campus["site"]["width_m"]
    campus_d = campus["site"]["depth_m"]

    pad = 80
    ax.set_xlim(-pad, campus_w + pad)
    ax.set_ylim(-pad, campus_d + pad * 1.5)

    # Background
    ax.set_facecolor('#0c1420')

    # District zones
    for d_id, dist in districts.items():
        b = dist["bounds"]
        color_hex = dist["color_hex"]
        r = mpatches.FancyBboxPatch(
            (b["x_min"], b["y_min"]),
            b["x_max"] - b["x_min"],
            b["y_max"] - b["y_min"],
            boxstyle="round,pad=5",
            facecolor=color_hex, edgecolor='none',
            zorder=1, alpha=0.55
        )
        ax.add_patch(r)
        # District label
        cx = (b["x_min"] + b["x_max"]) / 2
        cy = (b["y_min"] + b["y_max"]) / 2
        ax.text(cx, cy, DISTRICT_LABELS.get(d_id, d_id),
                color='white', fontsize=6.5, ha='center', va='center',
                zorder=15, alpha=0.6, fontstyle='italic',
                path_effects=[pe.withStroke(linewidth=2, foreground='#0c1420')])

    # Ground fill
    ax.fill([0, campus_w, campus_w, 0], [0, 0, campus_d, campus_d],
            color='#111e14', zorder=0, alpha=0.7)

    # Water features (2D footprints)
    # North river
    ax.fill([0, campus_w, campus_w, 0], [634, 634, campus_d, campus_d],
            color='#204060', zorder=2, alpha=0.7)
    # East river
    ax.fill([1072, campus_w, campus_w, 1072], [0, 0, campus_d, campus_d],
            color='#204060', zorder=2, alpha=0.7)
    # Central pool
    pool = Ellipse((548, 332), 60, 40, facecolor='#2a6090', edgecolor='none',
                   zorder=3, alpha=0.85)
    ax.add_patch(pool)

    # Roads (2D plan)
    road_lines = [
        [(548, 0), (548, campus_d)],
        [(0, 332), (campus_w, 332)],
        [(0, 450), (campus_w, 450)],
        [(350, 0), (350, campus_d)],
        [(750, 0), (750, campus_d)],
    ]
    for seg in road_lines:
        xs_r = [s[0] for s in seg]
        ys_r = [s[1] for s in seg]
        ax.plot(xs_r, ys_r, color='#404852', lw=12, zorder=2, alpha=0.5,
                solid_capstyle='butt')
        ax.plot(xs_r, ys_r, color='#c8d0d8', lw=0.6, zorder=2.1, alpha=0.6,
                solid_capstyle='butt')

    # Trees (scattered dots, 2D plan)
    rng = np.random.default_rng(42)
    tx = rng.uniform(20, campus_w - 20, 320)
    ty = rng.uniform(20, campus_d - 20, 320)
    ax.scatter(tx, ty, s=3, color='#3a7a3a', zorder=3, alpha=0.55, linewidths=0)

    # Buildings as filled footprints
    for b in buildings:
        bx, by = b["position"]
        w,  d  = b["footprint_m"]
        family = b.get("arch_family", "RESEARCH")
        color  = FAMILY_COLORS.get(family, (0.6, 0.6, 0.6))
        rect = Rectangle((bx - w/2, by - d/2), w, d,
                          facecolor=color, edgecolor=(0.1, 0.1, 0.1),
                          linewidth=0.4, zorder=5)
        ax.add_patch(rect)
        # Number label on building
        ax.text(bx, by, str(b["number"]),
                fontsize=4.2, ha='center', va='center', zorder=6,
                color='white' if sum(color) < 1.5 else '#111',
                fontweight='bold')

    # Building legend (numbered list)
    legend_text = "\n".join(
        f"{b['number']:2d}. {b['name']}" for b in buildings
    )
    ax.text(campus_w + pad * 0.2, campus_d * 0.98, legend_text,
            fontsize=4.0, va='top', ha='left', color='#c0c8d0',
            zorder=20, fontfamily='monospace',
            transform=ax.transData)

    # Title
    ax.text(campus_w / 2, campus_d + pad * 1.1,
            "COLLECTIVE AI MEGA CAMPUS — DISTRICT OVERVIEW",
            fontsize=13, ha='center', va='top', color='white',
            fontweight='bold', fontfamily='monospace', zorder=30)
    ax.text(campus_w / 2, campus_d + pad * 0.55,
            "6 Districts  •  30 Buildings  •  180 Acres  •  ~4.9M GSF",
            fontsize=8, ha='center', va='top', color='#8aa0b8', zorder=30)

    # Compass
    ax.annotate('N', xy=(50, campus_d - 10), fontsize=10, color='white',
                fontweight='bold', ha='center', va='bottom', zorder=30)
    ax.annotate('', xy=(50, campus_d - 10), xytext=(50, campus_d - 60),
                arrowprops=dict(arrowstyle='->', color='white', lw=2), zorder=30)

    # Scale bar
    ax.plot([80, 280], [-40, -40], color='white', lw=2.5, zorder=20)
    ax.text(180, -52, '200 m', color='white', fontsize=8, ha='center', va='top', zorder=20)

    plt.tight_layout(pad=0)
    fig.savefig(out_path, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"    Saved: {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")


# ---------------------------------------------------------------------------
# View 4 — GROUND LEVEL (cinematic south entry perspective)
# ---------------------------------------------------------------------------

def render_ground_level(buildings, campus, out_path):
    print("  Rendering ground_level.png ...")
    fig, ax = plt.subplots(figsize=(24, 10), dpi=150)
    ax.set_aspect('equal')
    ax.axis('off')
    fig.patch.set_facecolor('#060c14')

    # Ground-level perspective: camera at (548, -80, 4), looking north
    # We project buildings onto a near-vertical plane
    # Simple one-point perspective projection centered on (548, 0)

    CAM_X = 548.0
    CAM_Y = -120.0
    CAM_Z = 5.0
    FOCAL = 600.0    # focal length in "pixels"
    VIEW_W = 2400
    VIEW_H = 1000

    def proj_ground(wx, wy, wz):
        """One-point perspective from south looking north."""
        dx = wx - CAM_X
        dy = wy - CAM_Y   # depth (positive = north/into scene)
        dz = wz - CAM_Z
        if dy <= 0.1:
            dy = 0.1
        scale = FOCAL / dy
        sx = VIEW_W / 2 + dx * scale
        sy = VIEW_H * 0.45 + dz * scale
        return sx, sy

    def draw_building_persp(bx, by, w, d, h, color, num):
        """Draw building front face + top in one-point perspective."""
        hw, hd = w / 2, d / 2
        # Front face (south face of building)
        corners_front = [
            (bx - hw, by - hd, 0), (bx + hw, by - hd, 0),
            (bx + hw, by - hd, h), (bx - hw, by - hd, h),
        ]
        # Top face
        corners_top = [
            (bx - hw, by - hd, h), (bx + hw, by - hd, h),
            (bx + hw, by + hd, h), (bx - hw, by + hd, h),
        ]
        # Right face (east)
        corners_right = [
            (bx + hw, by - hd, 0), (bx + hw, by + hd, 0),
            (bx + hw, by + hd, h), (bx + hw, by - hd, h),
        ]

        # Check all points are in front of camera
        def all_visible(corners):
            return all(c[1] - CAM_Y > 0.1 for c in corners)

        if not all_visible(corners_front):
            return

        ec = (0.05, 0.05, 0.07)
        lw = 0.2

        # Draw faces
        for corners, shade in [(corners_right, 0.55), (corners_front, 0.82), (corners_top, 1.0)]:
            if not all_visible(corners):
                continue
            pts = [proj_ground(*c) for c in corners]
            fc = shade_color(color, shade)
            poly = plt.Polygon(pts, closed=True, facecolor=fc, edgecolor=ec,
                               linewidth=lw, zorder=10 - (by / 664))
            ax.add_patch(poly)

        # Building number
        front_base = proj_ground(bx, by - hd, 0)
        front_top  = proj_ground(bx, by - hd, h)
        if front_top[1] - front_base[1] > 6:
            mid_y = (front_base[1] + front_top[1]) / 2
            ax.text(front_base[0], mid_y, str(num),
                    fontsize=max(4, min(10, (VIEW_H * 0.45 - front_base[1]) * 0.3)),
                    color='white', ha='center', va='center', zorder=15, alpha=0.6,
                    path_effects=[pe.withStroke(linewidth=1, foreground=(0, 0, 0))])

    ax.set_xlim(0, VIEW_W)
    ax.set_ylim(0, VIEW_H)

    # Sky gradient
    sky_top    = np.array([0.04, 0.08, 0.18])
    sky_bottom = np.array([0.25, 0.42, 0.55])
    n = 200
    sky_grad = (sky_top * np.linspace(1, 0, n)[:, None] +
                sky_bottom * np.linspace(0, 1, n)[:, None])
    ax.imshow(sky_grad.reshape(n, 1, 3) * np.ones((1, 2, 1)),
              extent=[0, VIEW_W, VIEW_H * 0.40, VIEW_H],
              origin='lower', aspect='auto', zorder=-5, interpolation='bilinear')

    # Ground plane
    gp = proj_ground(CAM_X, 1000, 0)
    ax.fill([0, VIEW_W, VIEW_W, 0],
            [0, 0, VIEW_H * 0.44, VIEW_H * 0.44],
            color='#1a2218', zorder=-4)
    # Road surface
    rl_pts = [
        proj_ground(490, 1097, 0), proj_ground(606, 1097, 0),
        proj_ground(606, 0, 0),    proj_ground(490, 0, 0),
    ]
    ax.fill([p[0] for p in rl_pts], [p[1] for p in rl_pts],
            color='#2a3028', zorder=-3, alpha=0.9)

    # Sort buildings south-to-north (nearest first) for correct occlusion
    sorted_bldgs = sorted(buildings, key=lambda b: b["position"][1])

    for b in sorted_bldgs:
        bx, by = b["position"]
        w,  d  = b["footprint_m"]
        h      = b["height_m"]
        family = b.get("arch_family", "RESEARCH")
        color  = FAMILY_COLORS.get(family, (0.6, 0.6, 0.6))

        # Only draw buildings in front of camera
        if by - d / 2 < CAM_Y + 5:
            continue

        # Distance fade — far buildings get slightly darker/blue-shifted
        dist = by - CAM_Y
        fog  = min(0.85, dist / 900.0)
        fog_c = (
            color[0] * (1 - fog) + 0.28 * fog,
            color[1] * (1 - fog) + 0.38 * fog,
            color[2] * (1 - fog) + 0.50 * fog,
        )
        draw_building_persp(bx, by, w, d, h, fog_c, b["number"])

    # Trees as vertical green shapes along road
    rng = np.random.default_rng(5)
    for dist_y in np.arange(50, 650, 18):
        for side_x in [490 - rng.uniform(12, 40), 606 + rng.uniform(12, 40)]:
            sx, sy = proj_ground(side_x, dist_y, 0)
            tree_h = rng.uniform(4, 9) * FOCAL / max(1, dist_y - CAM_Y)
            tree_w = tree_h * 0.55
            if 0 < sx < VIEW_W and 0 < sy < VIEW_H:
                e = Ellipse((sx, sy + tree_h * 0.55), tree_w, tree_h,
                            facecolor='#285028', edgecolor='none',
                            zorder=8, alpha=0.8)
                ax.add_patch(e)

    # Horizon haze line
    horiz_y = proj_ground(548, 1200, 0)[1]
    ax.axhline(horiz_y, color='#6080a0', lw=0.5, alpha=0.4, zorder=6)

    # Title
    ax.text(VIEW_W * 0.5, VIEW_H * 0.97,
            "COLLECTIVE AI MEGA CAMPUS — GROUND LEVEL VIEW",
            ha='center', va='top', fontsize=13, color='white',
            fontweight='bold', fontfamily='monospace', zorder=30)
    ax.text(VIEW_W * 0.5, VIEW_H * 0.91,
            "South Entry Looking North  •  Main Campus Boulevard",
            ha='center', va='top', fontsize=7.5, color='#8aa0b8', zorder=30)

    plt.tight_layout(pad=0)
    fig.savefig(out_path, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"    Saved: {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Render Collective AI Mega Campus views.")
    parser.add_argument("--view", choices=["hero", "dusk", "overview", "ground", "all"],
                        default="all", help="Which view to render (default: all)")
    args = parser.parse_args()

    campus, districts, buildings, site = load_data()

    views = [args.view] if args.view != "all" else ["hero", "dusk", "overview", "ground"]

    for view in views:
        if view == "hero":
            render_hero(buildings, campus, site, OUT / "hero_view.png")
        elif view == "dusk":
            render_dusk(buildings, campus, site, OUT / "dusk_render.png")
        elif view == "overview":
            render_overview(buildings, campus, districts, OUT / "district_overview.png")
        elif view == "ground":
            render_ground_level(buildings, campus, OUT / "ground_level.png")

    print("\nAll requested renders complete.")
    print(f"Output directory: {OUT}")


if __name__ == "__main__":
    main()


# ===========================================================================
# BLENDER_RENDER_CODE
# ===========================================================================
# The following is reference code for rendering with Blender (bpy).
# Run via: blender --background --python scripts/render_scene.py -- --blender
#
# Requirements: Blender 4.x with Python enabled.
#
BLENDER_RENDER_CODE = r'''
# ---- Blender Rendering Reference ----
# Activate with: blender --background --python scripts/render_scene.py -- --blender

import bpy, json, sys, math
from pathlib import Path

REPO   = Path(__file__).parent.parent
DATA   = REPO / "data" / "facilities.json"
OUT    = REPO / "renders"

FAMILY_COLORS_BL = {
    "DATA_BUNKER":         (0.12, 0.14, 0.16, 1),
    "CORPORATE_TOWER":     (0.78, 0.84, 0.90, 1),
    "CIVIC_CULTURAL":      (0.94, 0.92, 0.86, 1),
    "LIFE_SCIENCE":        (0.31, 0.78, 0.39, 1),
    "INDUSTRIAL":          (0.55, 0.55, 0.53, 1),
    "WELLNESS_RECREATION": (0.98, 0.98, 0.95, 1),
    "MIXED_USE":           (0.78, 0.51, 0.35, 1),
    "TRANSPORT":           (0.82, 0.84, 0.86, 1),
    "SECURITY":            (0.20, 0.20, 0.20, 1),
    "RESEARCH":            (0.74, 0.78, 0.82, 1),
}

def bl_create_material(name, rgba):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value  = 0.35
    bsdf.inputs["Metallic"].default_value   = 0.1
    return mat

def bl_add_building(b):
    bx, by = b["position"]
    w, d   = b["footprint_m"]
    h      = b["height_m"]
    family = b.get("arch_family", "RESEARCH")
    rgba   = FAMILY_COLORS_BL.get(family, (0.6, 0.6, 0.6, 1))

    # Blender Y = north, Z = up
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(bx, by, h / 2)
    )
    obj = bpy.context.active_object
    obj.name = b["name"]
    obj.scale = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)

    mat = bl_create_material(f"mat_{b['id']}", rgba)
    obj.data.materials.append(mat)
    return obj

def bl_setup_camera_hero():
    """Hero isometric camera — SW to NE, ~35° elevation."""
    cam_data = bpy.data.cameras.new("HeroCam")
    cam_data.type = "PERSP"
    cam_data.lens = 50
    cam_obj = bpy.data.objects.new("HeroCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    # Position SW of campus
    cam_obj.location  = (-300, -400, 600)
    cam_obj.rotation_euler = (math.radians(55), 0, math.radians(-35))
    return cam_obj

def bl_setup_world():
    world = bpy.context.scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value  = (0.08, 0.12, 0.22, 1)
    bg.inputs["Strength"].default_value = 1.0
    # Sun lamp
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 200))
    sun = bpy.context.active_object
    sun.rotation_euler = (math.radians(50), 0, math.radians(135))
    sun.data.energy = 3.0

def bl_render_hero(out_path):
    scene = bpy.context.scene
    scene.render.resolution_x  = 4096
    scene.render.resolution_y  = 2304
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(out_path)
    scene.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)

def blender_main():
    with open(DATA) as fh:
        raw = json.load(fh)
    buildings = raw["facilities"]

    # Clear default scene
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    bl_setup_world()

    # Ground plane
    bpy.ops.mesh.primitive_plane_add(size=1, location=(548, 332, -0.1))
    ground = bpy.context.active_object
    ground.scale = (1200, 700, 1)
    bpy.ops.object.transform_apply(scale=True)
    ground_mat = bl_create_material("ground", (0.22, 0.27, 0.22, 1))
    ground.data.materials.append(ground_mat)

    for b in buildings:
        bl_add_building(b)

    bl_setup_camera_hero()
    bl_render_hero(OUT / "hero_view_blender.png")
    print("Blender render complete.")

if "--blender" in sys.argv:
    blender_main()
'''
