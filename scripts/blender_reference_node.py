"""Build the physical synergy node with Blender; deterministic GLB, meters, Y-up export."""
import bpy, math
from pathlib import Path
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=.4,emission=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.28
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=2
 return m
metal=material('Brushed titanium',(.24,.3,.34),.8);light=material('Cyan optical interface',(.05,.72,.9),.2,True);dark=material('Graphite composite',(.035,.05,.07));gold=material('Gold contact rail',(.64,.44,.17),.8)
def cyl(name,r,d,z,mat,x=0,y=0):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=d,location=(x,y,z));o=bpy.context.object;o.name=name;o.data.materials.append(mat);be=o.modifiers.new('Machined edge','BEVEL');be.width=.06;be.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
cyl('Foundation plinth',3.6,.45,.225,metal);cyl('Floating illuminated ring',3.25,.14,.55,light);cyl('Service enclosure',2.8,.8,1,dark);cyl('Optical core',1.15,4.8,3.6,light);cyl('Crown housing',1.65,.6,6.1,metal);cyl('Top rail',1.7,.13,6.5,gold)
for i in range(8):
 a=i*math.tau/8;x=math.sin(a)*2;y=math.cos(a)*2
 cyl('Dock interface %02d'%i,.35,2,1.8,gold,x,y)
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x*.85,y*.85,3.5));o=bpy.context.object;o.name='Structural petal %02d'%i;o.scale=(.2,.5,4.5);o.rotation_euler.z=-a;o.data.materials.append(metal);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);be=o.modifiers.new('Soft edge','BEVEL');be.width=.12;be.segments=3
for z in [2,3.5,5]:
 bpy.ops.mesh.primitive_torus_add(major_radius=1.7,minor_radius=.09,major_segments=48,minor_segments=8,location=(0,0,z));bpy.context.object.name='Optical ring';bpy.context.object.data.materials.append(light)
path=Path(__file__).resolve().parents[1]/'public/models/synergy-node.glb';path.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_apply=True)
print('EXPORTED',path)
