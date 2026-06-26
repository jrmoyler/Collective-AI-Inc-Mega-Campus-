#!/usr/bin/env python3
"""Blender-first procedural generator for the Collective AI Mega Campus.
Run with: blender --background --python scripts/blender_generate_campus.py
If Blender is unavailable, scripts/generate_buildings.py uses a pure-Python GLB fallback.
"""
import json, math
from pathlib import Path
try:
    import bpy
except ImportError:
    raise SystemExit('This script must be run by Blender Python')
REPO=Path(__file__).resolve().parents[1]
DATA=json.loads((REPO/'data/facilities.json').read_text())
OUT=REPO/'assets/glb/buildings'; SITE=REPO/'assets/glb/site'; OUT.mkdir(parents=True,exist_ok=True); SITE.mkdir(parents=True,exist_ok=True)
PAL={'DATA_BUNKER':(.03,.06,.10,1),'CORPORATE_TOWER':(.55,.85,1,1),'CIVIC_CULTURAL':(.86,.70,.42,1),'LIFE_SCIENCE':(.25,1,.55,1),'INDUSTRIAL':(.9,.38,.12,1),'WELLNESS_RECREATION':(.4,.9,1,1),'MIXED_USE':(.75,.45,1,1),'TRANSPORT':(.15,.75,1,1),'SECURITY':(.08,.09,.11,1),'RESEARCH':(.45,.70,1,1)}
def mat(n,c,emit=0):
    m=bpy.data.materials.new(n); m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value=c; bsdf.inputs['Roughness'].default_value=.34; bsdf.inputs['Metallic'].default_value=.25
    if emit: bsdf.inputs['Emission Color'].default_value=c; bsdf.inputs['Emission Strength'].default_value=emit
    return m
def cube(n,scale,loc,ma):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=n; o.dimensions=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(ma); bevel=o.modifiers.new('soft bevel','BEVEL'); bevel.width=.7; bevel.segments=2; o.modifiers.new('weighted facade normals','WEIGHTED_NORMAL'); return o
def cyl(n,r,h,loc,ma,verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc); o=bpy.context.object; o.name=n; o.data.materials.append(ma); o.modifiers.new('weighted normals','WEIGHTED_NORMAL'); return o
def building(f):
    w,d=f['footprint_m']; h=f['height_m']; fam=f.get('arch_family','RESEARCH'); base=mat(fam, PAL.get(fam,(.5,.6,.7,1))); glass=mat('cyan emissive glass',(.05,.75,1,1),.4); green=mat('biophilic terraces',(.1,.75,.25,1)); objs=[]
    objs.append(cube(f['id']+'_podium',(w,d,h*.62),(0,0,h*.31),base))
    # setbacks / roof articulation
    objs.append(cube(f['id']+'_setback',(w*.72,d*.68,h*.28),(0,0,h*.76),base))
    if f.get('landmark') or 'Tower' in f['name'] or 'Observatory' in f['name']:
        objs.append(cyl(f['id']+'_spire',min(w,d)*.16,h*.95,(0,0,h*1.15),glass,64))
        objs.append(cyl(f['id']+'_halo',min(w,d)*.42,.8,(0,0,h*1.05),glass,96))
    # fins/facade rhythm
    for side in [-1,1]:
        for i in range(9): objs.append(cube(f['id']+f'_fin_{side}_{i}',(.35,d*.04,h*.7),(side*w*.51,-d*.4+i*d*.1,h*.42),glass))
    for i in range(7): objs.append(cube(f['id']+f'_roof_solar_{i}',(w*.09,d*.72,.25),(-w*.36+i*w*.12,0,h+.2),mat('solar',(.01,.03,.09,1))))
    if 'Farm' in f['name'] or 'Bio' in f['name'] or 'Habitat' in f['name']:
        for z in [h*.32,h*.58,h*.84]: objs.append(cube(f['id']+f'_green_{z}',(w*.82,2,.8),(0,d*.53,z),green))
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]; bpy.ops.object.join(); bpy.context.object.name=f['id']; return bpy.context.object
# individual
for f in DATA['facilities']:
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); building(f); bpy.ops.export_scene.gltf(filepath=str(OUT/(f['id']+'.glb')), export_format='GLB')
# campus
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); ground=mat('campus landscape',(.05,.16,.08,1)); road=mat('android energy streets',(.02,.025,.03,1),.05); water=mat('blue green corridor',(.02,.35,.55,.75),.2)
cube('180 acre terrain',(1097,664,.5),(548,332,-.25),ground)
for y in [80,166,332,498,584]: cube('luminous boulevard',(1097,10,.15),(548,y,.05),road)
for x in [80,274,548,822,1017]: cube('luminous spine',(10,664,.15),(x,332,.06),road)
for f in DATA['facilities']:
    o=building(f); x,y=f['position']; o.location.x=x; o.location.y=y; o.rotation_euler[2]=math.radians(f.get('rotation_deg',0))
for x,y in [(160,120),(910,560),(980,230),(430,420),(660,250)]: cyl('algae pond',35,.25,(x,y,.12),water,72)
for x,y in [(120,610),(915,610),(1030,120),(70,120)]:
    for i in range(6): cube('solar field',(24,12,.25),(x+i*28,y,.25),mat('solar panel',(.01,.03,.12,1)))
bpy.ops.export_scene.gltf(filepath=str(SITE/'collective-ai-mega-campus.glb'), export_format='GLB')
