"""
blender_campus_enhanced.py — Enhanced Blender generation for Collective AI Mega Campus.
Run: blender --background --python scripts/blender_campus_enhanced.py

Generates 30 architecturally detailed buildings + master campus scene.
Each building has unique geometry matching its arch_family and special_features.
"""
import bpy, bmesh, math, json, random
from pathlib import Path
from mathutils import Vector, Euler

random.seed(42)
REPO = Path(__file__).resolve().parents[1]
DATA = json.loads((REPO / 'data/facilities.json').read_text())
OUT  = REPO / 'assets/glb/buildings'
SITE = REPO / 'assets/glb/site'
OUT.mkdir(parents=True, exist_ok=True)
SITE.mkdir(parents=True, exist_ok=True)

# ─── Colour palette per arch_family ─────────────────────────────────────────
PAL = {
    'DATA_BUNKER':         {'base':(0.03,0.06,0.10), 'glass':(0.05,0.55,0.90), 'accent':(0.10,0.45,0.80), 'emit':0.6},
    'CORPORATE_TOWER':     {'base':(0.55,0.80,1.00), 'glass':(0.30,0.75,1.00), 'accent':(0.00,0.80,1.00), 'emit':0.8},
    'CIVIC_CULTURAL':      {'base':(0.86,0.70,0.42), 'glass':(1.00,0.85,0.55), 'accent':(0.95,0.75,0.30), 'emit':0.5},
    'LIFE_SCIENCE':        {'base':(0.25,0.90,0.55), 'glass':(0.10,1.00,0.55), 'accent':(0.00,1.00,0.45), 'emit':1.2},
    'INDUSTRIAL':          {'base':(0.35,0.33,0.30), 'glass':(1.00,0.55,0.15), 'accent':(0.90,0.38,0.08), 'emit':1.0},
    'WELLNESS_RECREATION': {'base':(0.88,0.95,1.00), 'glass':(0.40,0.88,1.00), 'accent':(0.00,0.88,1.00), 'emit':0.7},
    'MIXED_USE':           {'base':(0.75,0.40,0.85), 'glass':(0.60,0.35,0.85), 'accent':(0.80,0.30,1.00), 'emit':0.6},
    'TRANSPORT':           {'base':(0.78,0.88,0.95), 'glass':(0.50,0.90,1.00), 'accent':(0.15,0.75,1.00), 'emit':0.7},
    'SECURITY':            {'base':(0.08,0.09,0.11), 'glass':(0.80,0.10,0.05), 'accent':(1.00,0.08,0.05), 'emit':1.5},
    'RESEARCH':            {'base':(0.45,0.68,0.92), 'glass':(0.30,0.75,1.00), 'accent':(0.00,0.80,1.00), 'emit':0.6},
}

# ─── Helpers ─────────────────────────────────────────────────────────────────
def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for item in blk:
            blk.remove(item)

def mat(name, rgb, metallic=0.15, roughness=0.45, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
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
    if alpha < 1.0:
        m.blend_method = 'BLEND'
        m.shadow_method = 'CLIP'
    return m

def box(name, w, d, h, loc=(0,0,0), rot=0.0, ma=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], loc[2]+h/2))
    o = bpy.context.object
    o.name = name
    o.dimensions = (w, d, h)
    if rot:
        o.rotation_euler[2] = rot
    bpy.ops.object.transform_apply(scale=True, rotation=rot!=0)
    if ma:
        if o.data.materials:
            o.data.materials[0] = ma
        else:
            o.data.materials.append(ma)
    return o

def cylinder(name, r, h, loc=(0,0,0), ma=None, verts=32, cap=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h,
                                         location=(loc[0], loc[1], loc[2]+h/2),
                                         end_fill_type='TRIFAN' if cap else 'NOTHING')
    o = bpy.context.object
    o.name = name
    if ma:
        if o.data.materials:
            o.data.materials[0] = ma
        else:
            o.data.materials.append(ma)
    return o

def cone(name, r1, r2, h, loc=(0,0,0), ma=None, verts=24):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h,
                                     location=(loc[0], loc[1], loc[2]+h/2))
    o = bpy.context.object
    o.name = name
    if ma:
        if o.data.materials:
            o.data.materials[0] = ma
        else:
            o.data.materials.append(ma)
    return o

def sphere(name, r, loc=(0,0,0), ma=None, segs=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=segs, ring_count=segs//2,
                                          location=(loc[0], loc[1], loc[2]))
    o = bpy.context.object
    o.name = name
    if ma:
        if o.data.materials:
            o.data.materials[0] = ma
        else:
            o.data.materials.append(ma)
    return o

def join_all(objs, final_name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    bpy.context.object.name = final_name
    return bpy.context.object

def export_glb(filepath):
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format='GLB',
        export_materials='EXPORT',
    )

def sawtooth_roof(prefix, w, d, h_base, tooth_h, n_teeth, ma_base, ma_glass):
    """Create sawtooth monitor roof — n_teeth triangular bays along the length."""
    objs = []
    tooth_w = w / n_teeth
    for i in range(n_teeth):
        x0 = -w/2 + i * tooth_w
        cx = x0 + tooth_w / 2
        # sloped face (south) — solid metal
        b = box(f'{prefix}_saw_back_{i}', tooth_w, d, tooth_h,
                 loc=(cx, 0, h_base), ma=ma_base)
        # rotate slightly to angle it
        b.rotation_euler[1] = math.radians(15)
        bpy.ops.object.transform_apply(rotation=True)
        # north glass clerestory strip
        g = box(f'{prefix}_saw_glass_{i}', tooth_w*0.38, d*0.9, tooth_h*0.6,
                 loc=(cx + tooth_w*0.28, 0, h_base + tooth_h*0.2), ma=ma_glass)
        objs += [b, g]
    return objs

def dome(prefix, r, loc, ma, segs=32):
    """Hemisphere dome."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=segs, ring_count=segs//2,
                                          location=loc)
    o = bpy.context.object
    o.name = f'{prefix}_dome'
    # keep only top half
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(o.data)
    verts_del = [v for v in bm.verts if v.co.z < 0]
    bmesh.ops.delete(bm, geom=verts_del, context='VERTS')
    bmesh.update_edit_mesh(o.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    if o.data.materials:
        o.data.materials[0] = ma
    else:
        o.data.materials.append(ma)
    return o

def barrel_vault(prefix, w, d, h, n_arches, loc, ma):
    """Barrel vault shape built from arch cross-sections."""
    objs = []
    seg_d = d / n_arches
    for i in range(n_arches):
        y = loc[1] - d/2 + (i+0.5)*seg_d
        # arch cross section — 8-sided polygon extruded thin
        cx, cy, cz = loc[0], y, loc[2] + h*0.5
        bpy.ops.mesh.primitive_circle_add(vertices=16, radius=w*0.52, location=(cx, cy, cz))
        o = bpy.context.object
        o.name = f'{prefix}_arch_{i}'
        bpy.ops.object.mode_set(mode='EDIT')
        bm2 = bmesh.from_edit_mesh(o.data)
        for v in bm2.verts:
            if v.co.z < 0:
                v.co.z = abs(v.co.z) * 0.3
        bmesh.update_edit_mesh(o.data)
        bpy.ops.object.mode_set(mode='OBJECT')
        # extrude thin
        mod = o.modifiers.new('solid','SOLIDIFY')
        mod.thickness = seg_d * 0.9
        bpy.ops.object.modifier_apply(modifier='solid')
        o.rotation_euler[0] = math.radians(90)
        bpy.ops.object.transform_apply(rotation=True)
        if o.data.materials: o.data.materials[0] = ma
        else: o.data.materials.append(ma)
        objs.append(o)
    return objs

def arch_span(prefix, w, h, d_span, loc, ma, n_arches=1):
    """Single or multi-span arched canopy (for transport hub)."""
    objs = []
    arch_w = w / n_arches
    for i in range(n_arches):
        x = loc[0] - w/2 + (i+0.5)*arch_w
        bpy.ops.mesh.primitive_torus_add(
            major_radius=arch_w*0.5, minor_radius=arch_w*0.04,
            major_segments=32, minor_segments=8,
            location=(x, loc[1], loc[2]+h))
        o = bpy.context.object
        o.name = f'{prefix}_arch_{i}'
        o.rotation_euler[0] = math.radians(90)
        bpy.ops.object.transform_apply(rotation=True)
        o.dimensions.y = d_span
        bpy.ops.object.transform_apply(scale=True)
        # keep only top half
        bpy.ops.object.mode_set(mode='EDIT')
        bm2 = bmesh.from_edit_mesh(o.data)
        vdel = [v for v in bm2.verts if v.co.z < loc[2]+h-0.1]
        bmesh.ops.delete(bm2, geom=vdel, context='VERTS')
        bmesh.update_edit_mesh(o.data)
        bpy.ops.object.mode_set(mode='OBJECT')
        if o.data.materials: o.data.materials[0] = ma
        else: o.data.materials.append(ma)
        objs.append(o)
    return objs

# ─── Per-building generators ─────────────────────────────────────────────────

def build_default(f, p):
    """Generic stepped massing for any building."""
    w, d = f['footprint_m']; h = f['height_m']
    fam = f.get('arch_family','RESEARCH')
    m_base = mat('base', p['base'], metallic=0.2, roughness=0.5)
    m_glass = mat('glass', p['glass'], metallic=0.7, roughness=0.1, emit=p['emit']*0.4)
    objs = []
    objs.append(box(f['id']+'_body', w, d, h*0.65, ma=m_base))
    objs.append(box(f['id']+'_upper', w*0.72, d*0.65, h*0.35, loc=(0,0,h*0.65), ma=m_base))
    # ribbon windows
    for lvl in range(f.get('stories',3)):
        z = (lvl+0.6) / f.get('stories',3) * h * 0.9
        objs.append(box(f['id']+f'_win_{lvl}', w*1.01, d*0.06, h*0.12/f.get('stories',3), loc=(0,0,z), ma=m_glass))
    return objs

def build_data_bunker(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_base = mat('bunker_body', p['base'], metallic=0.35, roughness=0.65)
    m_glass = mat('bunker_glass', p['glass'], metallic=0.8, roughness=0.05, emit=p['emit'])
    m_cool = mat('cool_tower', (0.85,0.90,0.95), metallic=0.1, roughness=0.4, emit=0.3)
    objs = []
    objs.append(box(f['id']+'_body', w, d, h, ma=m_base))
    # horizontal panel seams
    n_panels = f.get('stories',4)
    for i in range(1, n_panels):
        z = i * h / n_panels
        objs.append(box(f['id']+f'_seam_{i}', w*1.002, d*1.002, h*0.015, loc=(0,0,z), ma=m_glass))
    # cooling towers on roof
    feats = f.get('special_features',[])
    if any('cooling' in ft for ft in feats):
        n_ct = 4 if w > 100 else 2
        for i in range(n_ct):
            cx = -w*0.35 + i*(w*0.7/(n_ct-1)) if n_ct>1 else 0
            objs.append(cylinder(f['id']+f'_ct_{i}', d*0.07, h*0.35, loc=(cx,d*0.3,h), ma=m_cool))
    # substation yard box
    if any('substation' in ft or 'transformer' in ft for ft in feats):
        objs.append(box(f['id']+'_substation', w*0.4, d*0.35, h*0.3, loc=(w*0.55,0,0), ma=m_base))
    return objs

def build_corporate_tower(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_glass = mat('corp_glass', p['glass'], metallic=0.9, roughness=0.05, emit=p['emit']*0.5)
    m_crown = mat('corp_crown', p['accent'], metallic=0.95, roughness=0.02, emit=p['emit'])
    m_base = mat('corp_base', p['base'], metallic=0.85, roughness=0.08)
    objs = []
    # main tower body — taper upward
    steps = f.get('stories',4)
    step_h = h / steps
    for i in range(steps):
        taper = 1.0 - i * 0.08
        objs.append(box(f['id']+f'_fl{i}', w*taper, d*taper, step_h*0.9, loc=(0,0,i*step_h), ma=m_glass))
    # entry canopy
    objs.append(box(f['id']+'_canopy', w*0.6, d*0.12, h*0.04, loc=(0,-d*0.55,h*0.12), ma=m_base))
    # prismatic crown
    objs.append(cone(f['id']+'_crown', min(w,d)*0.35, min(w,d)*0.05, h*0.28,
                     loc=(0,0,h), ma=m_crown))
    # crown ring
    objs.append(cylinder(f['id']+'_halo', min(w,d)*0.42, h*0.02, loc=(0,0,h*0.98), ma=m_crown))
    return objs

def build_civic_cultural(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_stone = mat('stone', p['base'], metallic=0.05, roughness=0.75)
    m_glass = mat('civic_glass', p['glass'], metallic=0.7, roughness=0.08, emit=p['emit'])
    m_roof  = mat('civic_roof', (0.70,0.60,0.35), metallic=0.4, roughness=0.3)
    objs = []
    objs.append(box(f['id']+'_body', w, d, h*0.7, ma=m_stone))
    objs.append(box(f['id']+'_upper', w*0.8, d*0.75, h*0.3, loc=(0,0,h*0.7), ma=m_stone))
    # colonnade pillars
    n_col = max(4, int(w/12))
    for i in range(n_col):
        cx = -w*0.4 + i*(w*0.8/(n_col-1))
        objs.append(cylinder(f['id']+f'_col_{i}', w*0.022, h*0.62,
                              loc=(cx, -d*0.52, 0), ma=m_stone, verts=16))
    # barrel vault or dome
    feats = f.get('special_features',[])
    if any('dome' in ft for ft in feats):
        dr = min(w,d)*0.3
        objs.append(dome(f['id'], dr, (0,0,h*0.72), m_glass, segs=32))
    else:
        # barrel vault top
        vault_h = h*0.22
        vault_objs = barrel_vault(f['id']+'_vault', w*0.7, d*0.6, vault_h, 6,
                                   (0,0,h*0.7), m_glass)
        objs += vault_objs
    # grand stair approach
    for step in range(3):
        objs.append(box(f['id']+f'_stair_{step}', w*0.5, d*0.06,
                         h*0.025, loc=(0,-d*(0.55+step*0.07), h*step*0.025), ma=m_stone))
    return objs

def build_life_science(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_glass = mat('ls_glass', p['glass'], metallic=0.6, roughness=0.04, emit=p['emit'], alpha=0.7)
    m_frame = mat('ls_frame', p['base'], metallic=0.4, roughness=0.4)
    m_green = mat('ls_green', (0.12,0.70,0.25), roughness=0.6, emit=0.4)
    objs = []
    feats = f.get('special_features',[])
    if any('greenhouse' in ft or 'farm' in ft for ft in feats):
        # full-height greenhouse — glass box with structural grid
        objs.append(box(f['id']+'_greenhouse', w, d, h, ma=m_glass))
        # structural grid verticals
        n_v = max(4, int(w/12))
        for i in range(n_v):
            cx = -w/2 + i*(w/(n_v-1)) if n_v>1 else 0
            objs.append(box(f['id']+f'_vgrid_{i}', w*0.012, d*1.01, h,
                             loc=(cx,0,0), ma=m_frame))
        # stepped green terraces
        for lv in range(f.get('stories',2)):
            z = lv * h / f.get('stories',2)
            objs.append(box(f['id']+f'_terrace_{lv}', w*0.5, d*0.08, h*0.05,
                             loc=(w*0.25, d*0.52, z+h*0.04/(f.get('stories',2))), ma=m_green))
    else:
        # research lab — white clean massing
        objs.append(box(f['id']+'_body', w, d, h*0.72, ma=m_frame))
        objs.append(box(f['id']+'_upper', w*0.75, d*0.7, h*0.28, loc=(0,0,h*0.72), ma=m_frame))
        # helix entry canopy
        if any('helix' in ft for ft in feats):
            objs.append(cone(f['id']+'_helix', d*0.18, d*0.05, h*0.15,
                              loc=(0,-d*0.6,h*0.1), ma=m_glass))
        # ribbon windows
        for lv in range(f.get('stories',3)):
            z = (lv+0.6)/f.get('stories',3)*h*0.68
            objs.append(box(f['id']+f'_win_{lv}', w*1.005, d*0.07, h*0.1/f.get('stories',3),
                             loc=(0,0,z), ma=m_glass))
    # algae pond on roof/adjacent
    if any('algae' in ft for ft in feats):
        objs.append(cylinder(f['id']+'_pond1', d*0.32, h*0.06, loc=(-w*0.28,d*0.55,0),
                              ma=mat('algae',p['glass'], metallic=0.0, roughness=0.05, emit=1.8), verts=48))
        objs.append(cylinder(f['id']+'_pond2', d*0.22, h*0.06, loc=(w*0.25,d*0.45,0),
                              ma=mat('algae2',(0.05,0.85,0.35), emit=1.5), verts=48))
        objs.append(cylinder(f['id']+'_biogas', d*0.14, h*0.55, loc=(w*0.52,-d*0.1,0),
                              ma=mat('biogas',(0.55,0.55,0.60), metallic=0.6, roughness=0.3)))
    return objs

def build_industrial(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_metal = mat('ind_metal', p['base'], metallic=0.6, roughness=0.55)
    m_glass = mat('ind_glass', p['glass'], metallic=0.4, roughness=0.2, emit=p['emit'])
    m_accent= mat('ind_accent', p['accent'], metallic=0.3, roughness=0.6, emit=p['emit']*0.8)
    objs = []
    feats = f.get('special_features',[])
    n_bays = 5 if 'multiple_sawtooth' in ' '.join(feats) else 3
    # main shed body
    objs.append(box(f['id']+'_shed', w, d, h*0.6, ma=m_metal))
    # sawtooth monitor roof
    saw_objs = sawtooth_roof(f['id'], w, d, h*0.6, h*0.4, n_bays, m_metal, m_glass)
    objs += saw_objs
    # loading docks on north face
    n_docks = max(3, int(w/25))
    for i in range(n_docks):
        dx = -w*0.35 + i*(w*0.7/(n_docks-1)) if n_docks>1 else 0
        objs.append(box(f['id']+f'_dock_{i}', w*0.08, d*0.06, h*0.35,
                         loc=(dx, d*0.53, 0), ma=m_accent))
    # exhaust stacks
    if any('stack' in ft or 'exhaust' in ft for ft in feats):
        n_stacks = 4 if 'multiple' in ' '.join(feats) else 2
        for i in range(n_stacks):
            sx = -w*0.3 + i*(w*0.6/(n_stacks-1)) if n_stacks>1 else 0
            objs.append(cylinder(f['id']+f'_stack_{i}', h*0.06, h*0.9,
                                  loc=(sx, d*0.1, h*0.6),
                                  ma=mat('stack',(0.25,0.22,0.20),metallic=0.7,roughness=0.4)))
            # emission ring at top
            objs.append(cylinder(f['id']+f'_stackglow_{i}', h*0.08, h*0.04,
                                  loc=(sx,d*0.1,h*1.48), ma=m_accent))
    # truck court slab
    if any('truck' in ft or 'logistics' in ft for ft in feats):
        objs.append(box(f['id']+'_court', w*0.6, d*0.5, h*0.02,
                         loc=(0,-d*0.72,0), ma=mat('court',(0.18,0.18,0.16),roughness=0.85)))
    return objs

def build_wellness(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_white = mat('well_white', p['base'], metallic=0.2, roughness=0.35)
    m_glass = mat('well_glass', p['glass'], metallic=0.7, roughness=0.05, emit=p['emit'], alpha=0.65)
    m_dome  = mat('well_dome', (0.75,0.80,0.88), metallic=0.85, roughness=0.08)
    objs = []
    feats = f.get('special_features',[])
    if any('dome' in ft for ft in feats):
        # Observatory — dark base + silver dome
        m_dark = mat('obs_dark', (0.06,0.08,0.12), metallic=0.3, roughness=0.5)
        objs.append(cylinder(f['id']+'_base', min(w,d)*0.48, h*0.7, ma=m_dark, verts=32))
        objs.append(dome(f['id'], min(w,d)*0.46, (0,0,h*0.7), m_dome, segs=32))
        # skydeck ring
        objs.append(cylinder(f['id']+'_deck', min(w,d)*0.56, h*0.07, loc=(0,0,h*0.7), ma=m_white))
        # telescope mast
        objs.append(cylinder(f['id']+'_mast', min(w,d)*0.04, h*0.5, loc=(0,0,h*1.12),
                              ma=mat('mast',(0.6,0.65,0.7),metallic=0.9,roughness=0.2)))
    else:
        # Kinetic Edge — curved shell roof
        objs.append(box(f['id']+'_body', w, d, h*0.65, ma=m_white))
        # pool wing clerestory
        objs.append(box(f['id']+'_pool', w*0.42, d*0.52, h*0.9, loc=(-w*0.26,0,0), ma=m_glass))
        # curved roof shell (approximate with tall box + taper)
        objs.append(box(f['id']+'_roof', w, d, h*0.18, loc=(0,0,h*0.65), ma=m_white))
        objs.append(box(f['id']+'_rooftaper', w*1.06, d*0.22, h*0.06, loc=(0,-d*0.5,h*0.82), ma=m_white))
        objs.append(box(f['id']+'_outdoor', w*0.55, d*0.32, h*0.06, loc=(w*0.2,d*0.6,0), ma=m_white))
    return objs

def build_mixed_use(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_base = mat('mix_base', p['base'], metallic=0.15, roughness=0.5)
    m_glass = mat('mix_glass', p['glass'], metallic=0.7, roughness=0.08, emit=p['emit'])
    m_green = mat('mix_green', (0.12,0.65,0.22), roughness=0.7)
    objs = []
    feats = f.get('special_features',[])
    if any('hotel' in ft or 'conference' in ft for ft in feats):
        # Grand Conference Hotel
        # base podium
        objs.append(box(f['id']+'_podium', w, d, h*0.35, ma=m_base))
        # conference wing
        objs.append(box(f['id']+'_conf', w*0.45, d*0.9, h*0.65, loc=(-w*0.25,0,h*0.35), ma=m_base))
        # hotel tower
        objs.append(box(f['id']+'_tower', w*0.5, d*0.7, h, loc=(w*0.23,0,0), ma=m_glass))
        # rooftop pool
        objs.append(box(f['id']+'_pool', w*0.32, d*0.45, h*0.04, loc=(w*0.23,0,h),
                         ma=mat('pool',(0.10,0.50,0.85), metallic=0.0, roughness=0.01, emit=0.8, alpha=0.7)))
        # porte-cochere
        objs.append(box(f['id']+'_porte', w*0.55, d*0.15, h*0.15, loc=(0,-d*0.58,h*0.22), ma=m_base))
        # balconies
        for lv in range(f.get('stories',4)):
            z = (lv+0.8) / f.get('stories',4) * h
            objs.append(box(f['id']+f'_bal_{lv}', w*0.52*1.05, d*0.04, h*0.02, loc=(w*0.23,d*0.38,z), ma=m_base))
    else:
        # Habitat Residential — U-shaped courtyard
        objs.append(box(f['id']+'_wing_w', w*0.28, d, h, loc=(-w*0.36,0,0), ma=m_base))
        objs.append(box(f['id']+'_wing_e', w*0.28, d, h, loc=(w*0.36,0,0), ma=m_base))
        objs.append(box(f['id']+'_wing_n', w, d*0.28, h, loc=(0,d*0.36,0), ma=m_base))
        # solar pergola over courtyard
        objs.append(box(f['id']+'_pergola', w*0.5, d*0.5, h*0.04, loc=(0,0,h*1.02),
                         ma=mat('solar2',(0.02,0.04,0.12), metallic=0.8, roughness=0.3)))
        # green terraces
        for lv in range(f.get('stories',4)):
            z = (lv+1)/f.get('stories',4) * h
            objs.append(box(f['id']+f'_terr_{lv}', w*0.52, d*0.08, h*0.04, loc=(0,d*0.38,z), ma=m_green))
    return objs

def build_transport(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_steel = mat('trans_steel', p['base'], metallic=0.85, roughness=0.18)
    m_glass = mat('trans_glass', p['glass'], metallic=0.7, roughness=0.04, emit=p['emit'], alpha=0.6)
    objs = []
    feats = f.get('special_features',[])
    if any('arched' in ft for ft in feats):
        # Nexus Transportation Hub — dramatic arch
        objs.append(box(f['id']+'_base', w, d, h*0.45, ma=m_steel))
        objs.append(box(f['id']+'_mez', w, d, h*0.12, loc=(0,0,h*0.45), ma=m_glass))
        # arched glass roof
        try:
            arch_objs = arch_span(f['id'], w, h*0.45, d, (0,0,h*0.45), m_glass, n_arches=3)
            objs += arch_objs
        except:
            objs.append(box(f['id']+'_arched', w, d, h*0.35, loc=(0,0,h*0.55), ma=m_glass))
        # drop off loop
        objs.append(box(f['id']+'_dropoff', w*0.55, d*0.22, h*0.06, loc=(0,-d*0.65,0), ma=m_steel))
    else:
        # Nomad Nexus Mobility Lab — rooftop test track
        objs.append(box(f['id']+'_body', w, d, h*0.75, ma=m_steel))
        # large vehicle bay doors
        for i in range(3):
            dx = -w*0.28 + i*w*0.28
            objs.append(box(f['id']+f'_bay_{i}', w*0.22, d*0.04, h*0.4,
                             loc=(dx,-d*0.52,h*0.18), ma=m_glass))
        # rooftop test track loop
        objs.append(cylinder(f['id']+'_track_o', min(w,d)*0.44, h*0.04, loc=(0,0,h*0.75), verts=48,
                              ma=mat('track',(0.25,0.25,0.22),roughness=0.8)))
        objs.append(cylinder(f['id']+'_track_i', min(w,d)*0.28, h*0.04, loc=(0,0,h*0.76), verts=48,
                              ma=mat('track_i',(0.12,0.12,0.10),roughness=0.85)))
        # drone landing pads
        for px,py in [(w*0.25,d*0.2),(- w*0.25,-d*0.2)]:
            objs.append(cylinder(f['id']+f'_pad_{int(px)}', w*0.08, h*0.02, loc=(px,py,h*0.76),
                                  ma=mat('pad',(1.0,0.45,0.0), emit=1.2), verts=16))
    return objs

def build_security(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_conc = mat('sec_conc', p['base'], metallic=0.08, roughness=0.85)
    m_alert= mat('sec_alert', p['accent'], metallic=0.2, roughness=0.5, emit=p['emit'])
    objs = []
    objs.append(box(f['id']+'_body', w, d, h, ma=m_conc))
    # control tower / watchtower
    tw = min(w,d)*0.25
    objs.append(box(f['id']+'_tower', tw, tw, h*0.7, loc=(w*0.35,d*0.35,0), ma=m_conc))
    # surveillance mast
    objs.append(cylinder(f['id']+'_mast', tw*0.08, h*0.9, loc=(w*0.35,d*0.35,h*0.7),
                          ma=mat('mast_sec',(0.45,0.48,0.50),metallic=0.9,roughness=0.2)))
    # sensor cluster
    objs.append(sphere(f['id']+'_sensor', tw*0.14, loc=(w*0.35,d*0.35,h*1.59), ma=m_alert, segs=12))
    # vehicle barriers
    n_bar = max(3, int(w/18))
    for i in range(n_bar):
        bx = -w*0.4 + i*(w*0.8/(n_bar-1)) if n_bar>1 else 0
        objs.append(box(f['id']+f'_bar_{i}', w*0.025, d*0.04, h*0.14,
                         loc=(bx,-d*0.54,0), ma=m_conc))
    return objs

def build_research(f, p):
    w, d = f['footprint_m']; h = f['height_m']
    m_base  = mat('res_base', p['base'], metallic=0.3, roughness=0.4)
    m_glass = mat('res_glass', p['glass'], metallic=0.75, roughness=0.06, emit=p['emit']*0.5)
    m_dark  = mat('res_dark', (0.05,0.07,0.10), metallic=0.6, roughness=0.15)
    m_fin   = mat('res_fin', p['accent'], metallic=0.85, roughness=0.1)
    objs = []
    feats = f.get('special_features',[])
    objs.append(box(f['id']+'_body', w, d, h*0.7, ma=m_base))
    objs.append(box(f['id']+'_upper', w*0.78, d*0.72, h*0.3, loc=(0,0,h*0.7), ma=m_base))
    # vertical metal fins
    if any('fin' in ft or 'dark_glass' in str(f.get('facade_material','')) for ft in feats):
        n_fins = max(6, int(w/8))
        for i in range(n_fins):
            fx = -w*0.48 + i*(w*0.96/(n_fins-1)) if n_fins>1 else 0
            objs.append(box(f['id']+f'_fin_{i}', w*0.012, d*1.01, h*0.75,
                             loc=(fx,0,0), ma=m_fin))
    # rooftop antenna array
    if any('antenna' in ft for ft in feats):
        n_ant = 8
        for i in range(n_ant):
            ax = -w*0.35 + i*(w*0.7/(n_ant-1)) if n_ant>1 else 0
            ang = i * 18.0
            objs.append(cylinder(f['id']+f'_ant_{i}', h*0.02, h*0.35,
                                  loc=(ax, d*0.1+i*d*0.04, h*0.98),
                                  ma=mat(f'ant_m_{i}',p['accent'],metallic=0.9,roughness=0.1,emit=p['emit']*0.6)))
    # floating roof plane
    if any('floating' in ft for ft in feats):
        objs.append(box(f['id']+'_floatroof', w*1.12, d*1.08, h*0.04, loc=(0,0,h*0.82),
                         ma=mat('froof',p['base'],metallic=0.5,roughness=0.25)))
        # open gap supports
        for sx in [-w*0.38, w*0.38]:
            objs.append(cylinder(f['id']+f'_fsup_{int(sx)}', h*0.03, h*0.12,
                                  loc=(sx,0,h*0.7), ma=m_base))
    # solar canopy
    if any('solar' in ft for ft in feats):
        objs.append(box(f['id']+'_solarc', w*1.05, d*0.45, h*0.035, loc=(0,d*0.32,h*0.92),
                         ma=mat('solar_res',(0.02,0.05,0.14),metallic=0.75,roughness=0.25)))
    # ribbon windows
    for lv in range(f.get('stories',3)):
        z = (lv+0.55)/f.get('stories',3)*h*0.65
        objs.append(box(f['id']+f'_rwin_{lv}', w*1.002, d*0.065, h*0.09/f.get('stories',3),
                         loc=(0,0,z), ma=m_glass))
    return objs

# ─── Dispatch by arch_family ─────────────────────────────────────────────────
BUILDERS = {
    'DATA_BUNKER':         build_data_bunker,
    'CORPORATE_TOWER':     build_corporate_tower,
    'CIVIC_CULTURAL':      build_civic_cultural,
    'LIFE_SCIENCE':        build_life_science,
    'INDUSTRIAL':          build_industrial,
    'WELLNESS_RECREATION': build_wellness,
    'MIXED_USE':           build_mixed_use,
    'TRANSPORT':           build_transport,
    'SECURITY':            build_security,
    'RESEARCH':            build_research,
}

# ─── Generate individual buildings ──────────────────────────────────────────
print(f"\n{'='*60}")
print(f"  Collective AI Mega Campus — Blender Enhanced Build")
print(f"{'='*60}\n")

ok, fail = [], []
for f in DATA['facilities']:
    clear()
    fam = f.get('arch_family','RESEARCH')
    p   = PAL.get(fam, PAL['RESEARCH'])
    fn  = BUILDERS.get(fam, build_default)
    try:
        objs = fn(f, p)
        if not objs:
            raise ValueError("builder returned empty list")
        final = join_all(objs, f['id'])
        out   = OUT / f"{f['id']}.glb"
        export_glb(out)
        sz = out.stat().st_size / 1024
        print(f"  [{f['number']:2d}] {f['name']:<42s} → {sz:6.1f} KB")
        ok.append(f['id'])
    except Exception as exc:
        import traceback as tb
        print(f"  [{f['number']:2d}] ERROR {f['name']}: {exc}")
        tb.print_exc()
        fail.append(f['id'])

print(f"\n  Buildings: {len(ok)}/{len(DATA['facilities'])} OK  |  {len(fail)} failed\n")

# ─── Master Campus Scene ─────────────────────────────────────────────────────
print("  Assembling master campus scene...")
clear()

# Materials for site elements
m_ground  = mat('ground',  (0.04,0.10,0.05), roughness=0.85)
m_road    = mat('road',    (0.05,0.06,0.07), roughness=0.90, emit=0.08)
m_water   = mat('water',   (0.02,0.35,0.58), metallic=0.0, roughness=0.01, emit=0.3, alpha=0.75)
m_solar   = mat('solar',   (0.01,0.03,0.10), metallic=0.85, roughness=0.18)
m_tree    = mat('tree',    (0.06,0.28,0.09), roughness=0.8)
m_tree_tr = mat('trunk',   (0.22,0.14,0.08), roughness=0.9)
m_fence   = mat('fence',   (0.12,0.20,0.28), metallic=0.8, roughness=0.35)

# Ground plane
box('terrain', CAMPUS_W, CAMPUS_D, 1.0, loc=(CAMPUS_W/2, CAMPUS_D/2, -0.5), ma=m_ground)

# Road network
for y in [100, 200, 332, 464, 564]:
    box(f'rd_h_{y}', CAMPUS_W*0.95, 20, 0.2, loc=(CAMPUS_W/2, y, 0.1), ma=m_road)
for x in [100, 274, 548, 822, 997]:
    box(f'rd_v_{x}', 14, CAMPUS_D*0.92, 0.2, loc=(x, CAMPUS_D/2, 0.1), ma=m_road)

# Water features
for cx,cy,r in [(548,332,32),(160,120,42),(910,580,36),(980,240,30),(440,430,28)]:
    cylinder('pond_'+str(cx), r, 0.6, loc=(cx,cy,0.3), ma=m_water, verts=64)

# Wind turbines at corners
for tx,ty in [(80,640),(1020,640),(1020,30),(80,30)]:
    pole = cylinder(f'wt_pole_{tx}', 1.5, 55, loc=(tx,ty,0), ma=m_fence)
    for blade in range(3):
        ang = blade * 2.094  # 120°
        bx2 = box(f'wt_blade_{tx}_{blade}', 1.2, 26, 0.4, loc=(tx,ty,54),
                   ma=mat('blade',(0.85,0.87,0.88),metallic=0.4,roughness=0.3))
        bx2.rotation_euler[2] = ang
        bpy.ops.object.transform_apply(rotation=True)

# Solar arrays
for ax,ay,aw,ad in [(80,620,200,80),(950,620,160,80),(950,40,160,60),(80,40,160,60)]:
    for row in range(4):
        for col in range(int(aw/24)):
            box(f'sol_{ax}_{row}_{col}', 20, 10, 0.5,
                loc=(ax+col*24-aw/2, ay+row*20-ad/2, 1.5), ma=m_solar)

# Trees scattered along roads
random.seed(42)
for _ in range(180):
    tx2 = random.uniform(30, CAMPUS_W-30)
    ty2 = random.uniform(30, CAMPUS_D-30)
    th = random.uniform(5, 11)
    tr = random.uniform(2.5, 5.0)
    cylinder(f'trunk_{int(tx2)}_{int(ty2)}', 0.4, th*0.55, loc=(tx2,ty2,0), ma=m_tree_tr, verts=8)
    sphere(f'canopy_{int(tx2)}_{int(ty2)}', tr, loc=(tx2,ty2,th*0.5), ma=m_tree, segs=12)

# Place all 30 buildings
print("  Placing buildings in campus scene...")
loader_ok = 0
for f in DATA['facilities']:
    glb_path = OUT / f"{f['id']}.glb"
    if not glb_path.exists():
        print(f"    SKIP {f['id']} — GLB not found")
        continue
    try:
        before = set(o.name for o in bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(glb_path))
        new_objs = [o for o in bpy.data.objects if o.name not in before]
        px, py = f['position']
        rot_z = math.radians(f.get('rotation_deg', 0))
        for o in new_objs:
            o.location.x += px
            o.location.y += py
            o.rotation_euler[2] += rot_z
        loader_ok += 1
    except Exception as e:
        print(f"    WARN: could not place {f['id']}: {e}")

print(f"  Placed {loader_ok}/30 buildings")

# Perimeter fence/wall segments
for seg in range(0, CAMPUS_W, 80):
    box(f'wall_n_{seg}', 78, 1.2, 3.5, loc=(seg+40, CAMPUS_D-1, 0), ma=m_fence)
    box(f'wall_s_{seg}', 78, 1.2, 3.5, loc=(seg+40, 1, 0), ma=m_fence)
for seg in range(0, CAMPUS_D, 80):
    box(f'wall_e_{seg}', 1.2, 78, 3.5, loc=(CAMPUS_W-1, seg+40, 0), ma=m_fence)
    box(f'wall_w_{seg}', 1.2, 78, 3.5, loc=(1, seg+40, 0), ma=m_fence)

# Export master scene
site_path = SITE / 'collective-ai-mega-campus.glb'
export_glb(site_path)
sz = site_path.stat().st_size / 1024 / 1024
print(f"\n  Master scene → {site_path.name}  ({sz:.2f} MB)")
print(f"\n{'='*60}")
print(f"  DONE — Enhanced Blender build complete.")
print(f"{'='*60}\n")
