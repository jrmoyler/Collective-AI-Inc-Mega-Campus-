"""Offline geometry review only; not evidence of browser rendering or performance."""
import bpy,math,os
from mathutils import Vector
from pathlib import Path
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.environ.get('CAMPUS_REVIEW_GLB','/tmp/campus-review.glb'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=True;s.render.resolution_x=1400;s.render.resolution_y=1000;s.render.resolution_percentage=100
s.world.color=(.25,.33,.42)
bpy.ops.object.light_add(type='SUN',location=(-500,500,700));light=bpy.context.object;light.rotation_euler=(.4,-.4,-.4);light.data.energy=2;light.data.angle=.1
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.lens=42;cam.data.clip_end=6000
# glTF Y-up becomes Blender Z-up; glTF forward positive Z becomes negative Y.
cam.location=(90,-1100,960);target=Vector((0,0,0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
s.view_settings.view_transform='AgX';s.render.image_settings.file_format='JPEG';s.render.image_settings.quality=85
for name,position,look in [('aerial',(90,-1100,960),(0,0,0)),('north',(-100,1000,800),(0,0,0)),('prism',(115,165,110),(0,315,52)),('eden',(-125,-173,105),(-265,-33,28))]:
 cam.data.lens=30 if name in ('prism','eden') else 42
 target=Vector(look);cam.location=position;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(Path(__file__).resolve().parents[1]/('evidence/offline-'+name+'.jpg'));bpy.ops.render.render(write_still=True)
