"""Isolated shipped geometry contact review. Cycles is NOT WebGL equivalence evidence.
Four samples at 400x300: intended for silhouette/assembly checks, not material scoring.
"""
import json,os,math
from pathlib import Path
import bpy
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
source=Path(os.environ.get('CAMPUS_FACILITY_GLB_DIR','/tmp/campus-facility-review'))
output=Path(os.environ.get('CAMPUS_FACILITY_REVIEW_OUTPUT',str(root/'evidence/facility-review')))
output.mkdir(parents=True,exist_ok=True)
manifest=json.loads((source/'manifest.json').read_text())
selected=os.environ.get('CAMPUS_FACILITY_IDS')
if selected:manifest=[f for f in manifest if f['id'] in [int(x) for x in selected.split(',')]]
camera_file=os.environ.get('CAMPUS_FACILITY_MATCH_CAMERAS')
matched_cameras=json.loads(Path(camera_file).read_text()) if camera_file else {}
camera_records={}
for f in manifest:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.outliner.orphans_purge(do_recursive=True)
 bpy.ops.import_scene.gltf(filepath=str(source/(f['key']+'.glb')))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
 lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
 hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
 center=(lo+hi)*.5;size=hi-lo;span=max(size)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=int(os.environ.get('CAMPUS_FACILITY_SAMPLES','4'));scene.cycles.use_denoising=True
 scene.render.resolution_x=int(os.environ.get('CAMPUS_FACILITY_WIDTH','400'));scene.render.resolution_y=int(os.environ.get('CAMPUS_FACILITY_HEIGHT',str(int(scene.render.resolution_x*.75))));scene.render.resolution_percentage=100
 scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs[0].default_value=(.44,.53,.62,1);bg.inputs[1].default_value=.65
 scene.view_settings.view_transform='AgX'
 bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(.35,-.5,-.6);sun.data.energy=2;sun.data.angle=.12
 bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.clip_end=max(1000,span*20)
 camera.location=center+Vector((1,-1.45,float(os.environ.get('CAMPUS_FACILITY_ELEVATION','.95')))).normalized()*span*3
 camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
 # Project all bounding corners to camera coordinates, fitting both image axes.
 inverse=camera.rotation_euler.to_matrix().transposed()
 projected=[inverse@(v-center) for v in corners]
 width=max(v.x for v in projected)-min(v.x for v in projected)
 height=max(v.y for v in projected)-min(v.y for v in projected)
 camera.data.ortho_scale=max(width,height*scene.render.resolution_x/scene.render.resolution_y)*float(os.environ.get('CAMPUS_FACILITY_MARGIN','1.12'))
 if f['key'] in matched_cameras:
  record=matched_cameras[f['key']];camera.location=record['location'];camera.rotation_euler=record['rotation'];camera.data.ortho_scale=record['orthoScale']
 camera_records[f['key']]={'location':list(camera.location),'rotation':list(camera.rotation_euler),'orthoScale':camera.data.ortho_scale,'width':scene.render.resolution_x,'height':scene.render.resolution_y}
 scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=92
 scene.render.filepath=str(output/(f['key']+os.environ.get('CAMPUS_FACILITY_SUFFIX','')+'.jpg'));
 if not os.environ.get('CAMPUS_FACILITY_CAPTURE_CAMERAS_ONLY'):bpy.ops.render.render(write_still=True)
camera_output=output/('cameras'+os.environ.get('CAMPUS_FACILITY_SUFFIX','')+'.json')
previous_cameras=json.loads(camera_output.read_text()) if selected and camera_output.exists() else {}
previous_cameras.update(camera_records);camera_output.write_text(json.dumps(previous_cameras,indent=2))
manifest_path=output/'geometry-manifest.json'
previous=json.loads(manifest_path.read_text()) if selected and manifest_path.exists() else []
merged=sorted([f for f in previous if f['id'] not in [n['id'] for n in manifest]]+manifest,key=lambda f:f['id'])
manifest_path.write_text(json.dumps(merged,indent=2))
print('FACILITY_REVIEW_COMPLETE',len(manifest))
