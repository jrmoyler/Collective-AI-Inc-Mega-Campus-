"""Matched offline geometry review; never evidence of browser shaders or phone FPS.

CAMPUS_REVIEW_GLB=/tmp/campus-baseline.glb CAMPUS_REVIEW_LABEL=baseline \
  blender --background --python scripts/render_realism_review.py
"""
import os
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
output = root / 'evidence' / 'realism-next'
output.mkdir(parents=True, exist_ok=True)
label = os.environ.get('CAMPUS_REVIEW_LABEL', 'current')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.environ['CAMPUS_REVIEW_GLB'])
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.world.use_nodes = True
background = scene.world.node_tree.nodes['Background']
background.inputs[0].default_value = (.36, .46, .59, 1)
background.inputs[1].default_value = .55
bpy.ops.object.light_add(type='SUN')
sun = bpy.context.object
sun.rotation_euler = (.4, -.4, -.4)
sun.data.energy = 2
sun.data.angle = .1
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.clip_end = 6000
scene.camera = camera
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 88
views = [
    ('aerial', (90, -1100, 960), (0, 0, 0), 42),
    ('prism', (115, 165, 110), (0, 315, 52), 30),
]
requested = os.environ.get('CAMPUS_REVIEW_VIEWS', 'aerial,prism').split(',')
for name, position, target, lens in views:
    if name not in requested:
        continue
    camera.data.lens = lens
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(output / f'{label}-{name}.jpg')
    bpy.ops.render.render(write_still=True)
