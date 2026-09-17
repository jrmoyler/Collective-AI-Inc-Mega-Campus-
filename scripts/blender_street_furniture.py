"""Build campus street furniture in Blender. Units: meters; exported Y-up.
Run: blender --background --python scripts/blender_street_furniture.py
Each named root is a separate prefab at ground origin, not a display arrangement.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
ROOT = Path(__file__).resolve().parents[1]

def material(name, color, roughness, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return mat

wood = [material(f'Oiled ash slat {i}', (0.28+i*.014, .125+i*.008, .052+i*.004), .48) for i in range(6)]
metal = material('Powder coated warm graphite', (.057, .066, .072), .44, .65)
fastener = material('Stainless fixing', (.31, .33, .34), .26, .92)
stone = material('Warm sand precast concrete', (.43, .405, .35), .91)
soil = material('Fine dark planting soil', (.055, .038, .021), 1)
light = material('Frosted path optic', (.79, .70, .50), .48)
shader = light.node_tree.nodes.get('Principled BSDF')
shader.inputs['Emission Color'].default_value = (.9, .71, .4, 1)
shader.inputs['Emission Strength'].default_value = .7

def root(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj

def finish(obj, name, mat, parent, bevel=0):
    obj.name = name
    obj.parent = parent
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Manufactured edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.modifiers.new('Area weighted normals', 'WEIGHTED_NORMAL')
    return obj

def box(name, dims, loc, mat, parent, bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent, bevel)

def cylinder(name, radius, depth, loc, mat, parent, vertices=32, bevel=.008):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    return finish(bpy.context.object, name, mat, parent, bevel)

def tube(name, points, radius, mat, parent):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 12
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = 'AUTO'
        point.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj

bench = root('Bench')
# Individually separated ash boards with rounded ends, actual seat/back joinery.
for i in range(6):
    box(f'Seat ash board {i}', (2.4, .09, .045), (0, -.27+i*.106, .465), wood[i], bench, .013)
for i in range(4):
    slat = box(f'Back ash board {i}', (2.4, .045, .087), (0, .31+i*.018, .59+i*.101), wood[i+1], bench, .013)
    slat.rotation_euler.x = math.radians(-10)
for x in [-.86, .86]:
    tube('Continuous bent steel support', [(x,-.30,.06),(x,-.25,.40),(x,.18,.40),(x,.32,.49),(x,.405,.94)], .027, metal, bench)
    box('Ground anchor foot', (.14,.18,.016), (x,-.3,.016), metal, bench, .009)
    box('Rear anchor foot', (.14,.18,.016), (x,.23,.016), metal, bench, .009)
    tube('Rear leg', [(x,.23,.025),(x,.23,.20),(x,.19,.40)], .027, metal, bench)
    tube('Curved arm rest', [(x,-.26,.49),(x,-.23,.69),(x,.20,.70),(x,.34,.64)], .024, metal, bench)
    for y in [-.30,.23]:
        for dx in [-.043,.043]:
            cylinder('Exposed anchor head', .010,.005,(x+dx,y,.027),fastener,bench,12,.001)
    for i in range(6):
        cylinder('Recessed slat screw', .005,.001,(x,-.27+i*.106,.488),fastener,bench,12,.0004)

bollard = root('Bollard')
cylinder('Flanged base', .12,.022,(0,0,.011),metal,bollard)
cylinder('Bollard body', .075,.73,(0,0,.39),metal,bollard)
cylinder('Warm downward optic', .076,.037,(0,0,.764),light,bollard)
cylinder('Light shielding crown', .092,.053,(0,0,.81),metal,bollard)
for a in [0, math.pi/2, math.pi, 3*math.pi/2]:
    cylinder('Base mounting screw', .008,.007,(math.cos(a)*.099,math.sin(a)*.099,.026),fastener,bollard,12,.001)

planter = root('Planter')
# Lathed hollow concrete shell: real inner wall and rounded rim, not solid cylinders.
profile = [(.41,0),(.47,.035),(.53,.58),(.55,.66),(.544,.688),(.524,.70),(.498,.694),(.48,.668),(.458,.60),(.404,.13),(.39,.10)]
verts = []
faces = []
segments = 64
for r,z in profile:
    verts.extend([(r*math.cos(i*math.tau/segments),r*math.sin(i*math.tau/segments),z) for i in range(segments)])
for j in range(len(profile)-1):
    for i in range(segments):
        ni = (i+1)%segments
        faces.append((j*segments+i,j*segments+ni,(j+1)*segments+ni,(j+1)*segments+i))
mesh = bpy.data.meshes.new('Hollow precast shell')
mesh.from_pydata(verts, [], faces)
mesh.update()
obj = bpy.data.objects.new('Hollow precast planter', mesh)
bpy.context.collection.objects.link(obj)
finish(obj, obj.name, stone, planter)
cylinder('Recessed planting bed', .462,.03,(0,0,.60),soil,planter,64,.006)

# Apply remaining weighted normals and merge by material under each prefab.
# Three.js uses one shared geometry/material per merged part when instancing.
for prefab in [bench,bollard,planter]:
    children = list(prefab.children)
    for obj in children:
        bpy.context.view_layer.objects.active=obj
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    for mat in sorted(set(obj.data.materials[0] for obj in children), key=lambda material: material.name):
        parts = [obj for obj in list(prefab.children) if obj.data.materials[0] == mat]
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts: obj.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        if len(parts) > 1:
            bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = prefab.name + ' — ' + mat.name

out = ROOT/'public/models/campus-street-furniture.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_apply=True, export_yup=True)
report = {}
for prefab in [bench,bollard,planter]:
    coords = [obj.matrix_world@Vector(corner) for obj in prefab.children for corner in obj.bound_box]
    lower = [min(v[a] for v in coords) for a in range(3)]
    upper = [max(v[a] for v in coords) for a in range(3)]
    report[prefab.name] = {'meshParts':len(prefab.children),'triangles':sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in prefab.children),'boundsBlenderZUp':[lower,upper]}
(ROOT/'public/models/campus-street-furniture.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
print('EXPORTED',out)
