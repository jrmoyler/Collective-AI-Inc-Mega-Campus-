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
  if name in ('display','stageScreen','instrumentDisplay'):mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Emission Color'])
# Imported character UVs retain glTF's orientation; no procedural finish mapping.
repo=Path(__file__).resolve().parents[1]
character_materials=json.loads((repo/'viewer/campus/occupant-meshes.json').read_text())['materials']
for mat in bpy.data.materials:
 p=character_materials.get(mat.name.split('.')[0])
 if not p or not mat.use_nodes:continue
 shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 for key in ['albedo','normal']:
  if not p.get(key):continue
  tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(repo/'public'/p[key].lstrip('/')),check_existing=True)
  if key=='albedo':
   mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
   if p['cutout']:mat.node_tree.links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
  else:
   tex.image.colorspace_settings.name='Non-Color';normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=int(os.environ.get('CAMPUS_REVIEW_SAMPLES','20'));s.cycles.use_denoising=True;s.render.resolution_x=1440;s.render.resolution_y=960;s.render.resolution_percentage=100
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.38,.49,.60,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.45
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
for r in layout['rooms']:
 bpy.ops.object.light_add(type='AREA',location=(r['x'],-r['z'],r.get('height',3.9)-.30));o=bpy.context.object;o.data.energy=240*(r.get('height',3.9)/3.9)**2;o.data.shape='RECTANGLE';o.data.size=r['w']*.6;o.data.size_y=r['d']*.65;o.data.color=(1,.87,.66)
for x in range(int(-layout['w']/2)+2,int(layout['w']/2),5):
 bpy.ops.object.light_add(type='AREA',location=(x,0,3.65));o=bpy.context.object;o.data.energy=90;o.data.size=2;o.data.color=(1,.88,.7)
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.6,-.5,.5);bpy.context.object.data.energy=1.3;bpy.context.object.data.angle=.15
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.lens=22;s.camera=cam
views=[('corridor',(layout['entry'][0],-layout['entry'][1],1.67),(layout['circulation'][0]['x'],-layout['circulation'][0]['z'],1.55))]
for index in range(len(layout['rooms'])):
 r=layout['rooms'][index]
 def world(local_x,local_z,height):
  a=r['angle'];return (r['doorX']+math.cos(a)*local_x+math.sin(a)*local_z,-(r['doorZ']-math.sin(a)*local_x+math.cos(a)*local_z),height)
 views.append((f'room-{index+1}',world(-r['localWidth']*.28,r['localDepth']*.18,1.67),world(r['localWidth']*.10,r['localDepth']*.62,1.15)))
 # A closer, oblique occupied view uses the actual seat anchor and chair yaw.
 occupied=meta.get('occupants',[])
 if index<len(occupied) and occupied[index]['seats']:
  seat=occupied[index]['seats'][0];sx,_,sz=seat['seat'];yaw=seat['yaw']
  cx=max(-r['localWidth']*.40,min(r['localWidth']*.40,sx-math.sin(yaw)*3.1+math.cos(yaw)*1.2))
  cz=max(.8,min(r['localDepth']-.8,sz-math.cos(yaw)*3.1-math.sin(yaw)*1.2))
  views.append((f'room-{index+1}-occupied',world(cx,cz,1.67),world(sx,sz,1.05)))
output=Path(os.environ.get('CAMPUS_REVIEW_OUTPUT',str(Path(__file__).resolve().parents[1]/'evidence')))
output.mkdir(parents=True,exist_ok=True)
camera_records=[]
for name,pos,target in views:
 if os.environ.get('CAMPUS_REVIEW_VIEWS') and name not in os.environ['CAMPUS_REVIEW_VIEWS'].split(','):continue
 camera_records.append({'name':name,'position':pos,'target':target,'lens':cam.data.lens,'level':meta.get('level',1),'renderer':bpy.app.version_string,'samples':s.cycles.samples});cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.image_settings.file_format='JPEG';s.render.image_settings.quality=90;s.render.filepath=str(output/f'interior-{facility}-L{meta.get("level",1)}-{name}.jpg');bpy.ops.render.render(write_still=True)

camera_path=output/f'interior-{facility}-L{meta.get("level",1)}-cameras.json'
old=json.loads(camera_path.read_text()) if camera_path.exists() else []
new_names={r['name'] for r in camera_records}
camera_path.write_text(json.dumps([r for r in old if r['name'] not in new_names]+camera_records,indent=2))
