"""
blender_assemble_campus.py — Assemble the Collective AI Mega Campus master scene.
Run: blender --background --python scripts/blender_assemble_campus.py
"""
import bpy, math, json, random
from pathlib import Path

random.seed(42)
REPO = Path(__file__).resolve().parents[1]
DATA = json.loads((REPO / 'data/facilities.json').read_text())
BLDGS = REPO / 'assets/glb/buildings'
SITE  = REPO / 'assets/glb/site'
SITE.mkdir(parents=True, exist_ok=True)

CAMPUS_W, CAMPUS_D = 1097, 664

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for item in blk: blk.remove(item)

def mat(name, rgb, metallic=0.15, roughness=0.45, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nodes = m.node_tree.nodes; links = m.node_tree.links; nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*rgb, alpha)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Alpha'].default_value = alpha
    if emit > 0:
        bsdf.inputs['Emission Color'].default_value = (*rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emit
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    if alpha < 1.0: m.blend_method = 'BLEND'; m.shadow_method = 'CLIP'
    return m

def box(name, w, d, h, loc=(0,0,0), ma=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], loc[2]+h/2))
    o = bpy.context.object; o.name = name; o.dimensions = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)
    if ma:
        if o.data.materials: o.data.materials[0] = ma
        else: o.data.materials.append(ma)
    return o

def cyl(name, r, h, loc=(0,0,0), ma=None, verts=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h,
                                         location=(loc[0], loc[1], loc[2]+h/2))
    o = bpy.context.object; o.name = name
    if ma:
        if o.data.materials: o.data.materials[0] = ma
        else: o.data.materials.append(ma)
    return o

def sph(name, r, loc=(0,0,0), ma=None, segs=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=segs, ring_count=segs//2, location=loc)
    o = bpy.context.object; o.name = name
    if ma:
        if o.data.materials: o.data.materials[0] = ma
        else: o.data.materials.append(ma)
    return o

clear()
print("\n=== Assembling Collective AI Mega Campus Master Scene ===\n")

# ─── Site materials ──────────────────────────────────────────────────────────
m_gnd   = mat('ground',   (0.03,0.09,0.04), roughness=0.92)
m_road  = mat('road',     (0.05,0.06,0.07), roughness=0.88, emit=0.06)
m_water = mat('water',    (0.02,0.38,0.60), metallic=0.0, roughness=0.005, emit=0.35, alpha=0.72)
m_solar = mat('solar',    (0.01,0.03,0.11), metallic=0.82, roughness=0.2)
m_tree  = mat('tree',     (0.07,0.30,0.10), roughness=0.82)
m_trunk = mat('trunk',    (0.22,0.14,0.07), roughness=0.9)
m_fence = mat('fence',    (0.12,0.20,0.30), metallic=0.8, roughness=0.3)
m_blade = mat('blade',    (0.82,0.85,0.88), metallic=0.4, roughness=0.35)
m_neon  = mat('neon',     (0.00,0.75,1.00), emit=2.0)
m_orange= mat('orange',   (1.0,0.42,0.0),   emit=1.2)

# ─── Ground ──────────────────────────────────────────────────────────────────
box('terrain', CAMPUS_W, CAMPUS_D, 0.8, loc=(CAMPUS_W/2, CAMPUS_D/2, -0.8), ma=m_gnd)

# ─── Road network ────────────────────────────────────────────────────────────
for y in [80, 165, 250, 332, 420, 500, 580]:
    box(f'rd_h_{y}', CAMPUS_W*0.96, 18, 0.22, loc=(CAMPUS_W/2, y, 0), ma=m_road)
for x in [80, 220, 390, 548, 700, 870, 1000]:
    box(f'rd_v_{x}', 12, CAMPUS_D*0.94, 0.22, loc=(x, CAMPUS_D/2, 0), ma=m_road)

# Android Energy Streets — glowing blue edge strips
for y in [80, 165, 250, 332, 420, 500, 580]:
    for side in [-8, 8]:
        box(f'neon_h_{y}_{side}', CAMPUS_W*0.96, 0.6, 0.12,
            loc=(CAMPUS_W/2, y+side, 0.22), ma=m_neon)

# ─── Water features ──────────────────────────────────────────────────────────
# Central reflecting pool
cyl('central_pool', 34, 0.9, loc=(CAMPUS_W/2, CAMPUS_D/2, 0), ma=m_water, verts=64)
# North river edge (linear)
box('north_river', CAMPUS_W*0.7, 38, 1.2, loc=(CAMPUS_W/2, CAMPUS_D-20, -0.6), ma=m_water)
# East river edge
box('east_river', 32, CAMPUS_D*0.6, 1.2, loc=(CAMPUS_W-18, CAMPUS_D/2, -0.6), ma=m_water)
# Blue-green corridor
box('bluegreen_corr', CAMPUS_W*0.45, 22, 0.3, loc=(CAMPUS_W/2, 335, -0.1), ma=m_water)
# Algae ponds (bio-energy east area)
for ci,(cx,cy,r) in enumerate([(975,232,18),(975,262,12),(975,205,15),(1005,240,10)]):
    cyl(f'algae_{ci}', r, 1.2, loc=(cx,cy,0),
        ma=mat(f'alg{ci}',(0.05,0.90,0.35), metallic=0.0, roughness=0.01, emit=1.6, alpha=0.8),
        verts=48)

# ─── Solar arrays ────────────────────────────────────────────────────────────
for (ax,ay), rows, cols in [
    ((80,620),   5, 9),
    ((940,620),  4, 7),
    ((940,40),   4, 7),
    ((80,40),    4, 6),
]:
    for row in range(rows):
        for col in range(cols):
            box(f'sol_{ax}_{ay}_{row}_{col}', 18, 9, 0.5,
                loc=(ax+col*20-cols*10, ay+row*22-rows*11, 1.4), ma=m_solar)

# ─── Wind turbines at corners ────────────────────────────────────────────────
m_tower = mat('tower', (0.78,0.80,0.82), metallic=0.55, roughness=0.3)
for ti,(tx,ty) in enumerate([(70,640),(1027,640),(1027,24),(70,24)]):
    cyl(f'wt_pole_{ti}', 1.4, 58, loc=(tx,ty,0), ma=m_tower)
    for bi in range(3):
        ang = bi * 2.094
        bl = box(f'wt_blade_{ti}_{bi}', 1.0, 28, 0.35, loc=(tx,ty,57), ma=m_blade)
        bl.rotation_euler[2] = ang
        bpy.ops.object.transform_apply(rotation=True)
    # nacelle
    cyl(f'wt_nac_{ti}', 2.2, 4.5, loc=(tx,ty,57), ma=m_tower, verts=12)

# ─── Trees ───────────────────────────────────────────────────────────────────
random.seed(42)
tree_positions = []
for _ in range(200):
    tx = random.uniform(40, CAMPUS_W-40)
    ty = random.uniform(40, CAMPUS_D-40)
    # avoid road corridors
    if any(abs(ty-ry)<12 for ry in [80,165,250,332,420,500,580]): continue
    if any(abs(tx-rx)<8  for rx in [80,220,390,548,700,870,1000]): continue
    tree_positions.append((tx,ty))

for ti,(tx,ty) in enumerate(tree_positions[:160]):
    th = random.uniform(5.5, 12.5)
    tr = random.uniform(2.8, 5.8)
    cyl(f'trunk_{ti}', 0.38, th*0.52, loc=(tx,ty,0), ma=m_trunk, verts=6)
    sph(f'canopy_{ti}', tr, loc=(tx,ty,th*0.52+tr*0.6), ma=m_tree, segs=10)

# ─── Perimeter fence ─────────────────────────────────────────────────────────
seg = 80
for sx in range(0, CAMPUS_W, seg):
    box(f'fn_{sx}', min(seg-2,CAMPUS_W-sx-2), 1.0, 3.2, loc=(sx+seg/2,CAMPUS_D-0.5,0), ma=m_fence)
    box(f'fs_{sx}', min(seg-2,CAMPUS_W-sx-2), 1.0, 3.2, loc=(sx+seg/2,0.5,0), ma=m_fence)
for sy in range(0, CAMPUS_D, seg):
    box(f'fe_{sy}', 1.0, min(seg-2,CAMPUS_D-sy-2), 3.2, loc=(CAMPUS_W-0.5,sy+seg/2,0), ma=m_fence)
    box(f'fw_{sy}', 1.0, min(seg-2,CAMPUS_D-sy-2), 3.2, loc=(0.5,sy+seg/2,0), ma=m_fence)

# ─── Mesh Network Spires ─────────────────────────────────────────────────────
m_spire = mat('spire', (0.00,0.85,1.00), metallic=0.9, roughness=0.05, emit=1.8)
for si,(sx,sy) in enumerate([(220,585),(390,555),(545,600),(858,572),(432,292),
                               (718,448),(592,445),(548,332),(190,375),(322,268)]):
    cyl(f'spire_{si}', 0.8, 35, loc=(sx,sy,20+si*0.5), ma=m_spire, verts=8)
    sph(f'spire_node_{si}', 3.5, loc=(sx,sy,55+si*0.5),
        ma=mat(f'sph{si}',(0.0,0.9,1.0),emit=2.5,metallic=0.9,roughness=0.05), segs=10)

# ─── Place all 30 buildings ──────────────────────────────────────────────────
print("  Placing buildings...")
placed = 0
for f in DATA['facilities']:
    glb = BLDGS / f"{f['id']}.glb"
    if not glb.exists():
        print(f"    SKIP: {f['id']}")
        continue
    try:
        before = set(o.name for o in bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(glb))
        new_objs = [o for o in bpy.data.objects if o.name not in before]
        px, py = f['position']
        rot = math.radians(f.get('rotation_deg', 0))
        for o in new_objs:
            o.location.x += px
            o.location.y += py
            o.rotation_euler[2] += rot
        placed += 1
        print(f"    [{f['number']:2d}] {f['name']}")
    except Exception as e:
        print(f"    ERROR {f['id']}: {e}")

print(f"\n  Placed {placed}/30 buildings\n")

# ─── Export ──────────────────────────────────────────────────────────────────
out = SITE / 'collective-ai-mega-campus.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_materials='EXPORT')
sz = out.stat().st_size / 1024 / 1024
print(f"\n  → {out.name}  ({sz:.2f} MB)")
print("  === CAMPUS ASSEMBLED ===\n")
