"""Offline shipped-geometry review, NOT Babylon/browser validation.
Albedo and UV scale match runtime; Babylon tangent micro-normal maps are not exported.
Cycles lighting and AgX also differ from the interactive Babylon renderer.
"""
import bpy,math,json,sys,os
from pathlib import Path
from mathutils import Vector
facility=int(sys.argv[-1]) if sys.argv[-1].isdigit() else 30
meta=json.loads(Path(f'/tmp/interior-{facility}.json').read_text()); layout=meta['layout']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=f'/tmp/interior-{facility}.glb')
# Identical albedo pixels used by the Babylon material painter.
for mat in bpy.data.materials:
 name=mat.name.split('.')[0]
 p=Path('/tmp/campus-textures')/(name+'.png')
 if p.exists() and mat.use_nodes:
  nodes=mat.node_tree.nodes; shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(p))
  uv=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value[0]=3 if name in ('fabric','leather') else 1;mapping.inputs['Scale'].default_value[1]=-3 if name in ('fabric','leather') else -1;mapping.inputs['Location'].default_value[1]=1;mat.node_tree.links.new(uv.outputs['UV'],mapping.inputs['Vector']);mat.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector']);mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
  if name=='display':mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Emission Color'])
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=20;s.cycles.use_denoising=True;s.render.resolution_x=1440;s.render.resolution_y=960;s.render.resolution_percentage=100
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.38,.49,.60,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.45
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
for r in layout['rooms']:
 bpy.ops.object.light_add(type='AREA',location=(r['x'],-r['z'],3.60));o=bpy.context.object;o.data.energy=240;o.data.shape='RECTANGLE';o.data.size=r['w']*.6;o.data.size_y=r['d']*.65;o.data.color=(1,.87,.66)
for x in range(int(-layout['w']/2)+2,int(layout['w']/2),5):
 bpy.ops.object.light_add(type='AREA',location=(x,0,3.65));o=bpy.context.object;o.data.energy=90;o.data.size=2;o.data.color=(1,.88,.7)
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.6,-.5,.5);bpy.context.object.data.energy=1.3;bpy.context.object.data.angle=.15
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.lens=22;s.camera=cam
views=[('corridor',(-layout['w']/2+layout['core']+1,0,1.67),(layout['w']/2,0,1.55))]
for index in range(len(layout['rooms'])):
 r=layout['rooms'][index];side=1 if r['z']>0 else -1
 views.append((f'room-{index+1}',(r['x']-r['w']*.32,-(r['z']-side*r['d']*.32),1.67),(r['x']+.4,-(r['z']+side*r['d']*.18),1.3)))
output=Path(os.environ.get('CAMPUS_REVIEW_OUTPUT',str(Path(__file__).resolve().parents[1]/'evidence')))
output.mkdir(parents=True,exist_ok=True)
for name,pos,target in views:
 if os.environ.get('CAMPUS_REVIEW_VIEWS') and name not in os.environ['CAMPUS_REVIEW_VIEWS'].split(','):continue
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.image_settings.file_format='JPEG';s.render.image_settings.quality=90;s.render.filepath=str(output/f'interior-{facility}-{name}.jpg');bpy.ops.render.render(write_still=True)
