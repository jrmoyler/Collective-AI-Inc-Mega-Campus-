"""Build seated CC0 characters using pinned MPFB and MakeHuman asset packs.
Required: CAMPUS_MPFB_SOURCE, CAMPUS_HUMAN_ASSETS, CAMPUS_HUMAN_OUTPUT.
See public/assets/occupants/README.md for exact provenance and build commands.
"""
import os,sys,math,json,bpy,addon_utils
from mathutils import Vector
bpy.context.preferences.extensions.repos.new(name='Campus build tools',module='campus',custom_directory=os.path.join(os.environ['CAMPUS_MPFB_SOURCE'],'src'))
bpy.context.preferences.addons.new().module='bl_ext.campus.mpfb'
import bl_ext.campus.mpfb as mpfb
mpfb.register()
addon_utils.enable('io_anim_bvh')
from bl_ext.campus.mpfb.services import HumanService,TargetService,AnimationService
assets=os.environ['CAMPUS_HUMAN_ASSETS'];out=os.environ['CAMPUS_HUMAN_OUTPUT']
os.makedirs(out,exist_ok=True)
variants=[('staff-01',1,'caucasian','male_casualsuit01','short02','shoes01'),('staff-02',0,'african','male_casualsuit01','ponytail01','shoes02'),('staff-03',1,'asian','male_casualsuit03','short04','shoes01')]
for key,gender,race,clothing,hair,shoes in variants:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for m in list(bpy.data.materials):bpy.data.materials.remove(m)
 macro=TargetService.get_default_macro_info_dict();macro.update(gender=gender,age=.43,weight=.46,muscle=.42,height=.5)
 macro['race']={k:float(k==race) for k in ['asian','african','caucasian']}
 h=HumanService.create_human(macro_detail_dict=macro)
 rig=HumanService.add_builtin_rig(h,'default')
 skin='young_'+race+'_'+('male' if gender else 'female')
 HumanService.set_character_skin(f'{assets}/skins/{skin}/{skin}.mhmat',h,skin_type='MAKESKIN')
 for kind,name,atype in [('clothes',clothing,'Clothes'),('clothes',shoes,'Clothes'),('hair',hair,'Hair'),('eyes','high-poly','Eyes'),('eyebrows','eyebrow001','Eyebrows')]:
  HumanService.add_mhclo_asset(f'{assets}/{kind}/{name}/{name}.mhclo',h,asset_type=atype,subdiv_levels=0,material_type='MAKESKIN')
 AnimationService.import_bvh_file_as_pose(rig,f'{assets}/poses/callharvey3d_sittingdefault/callharvey3d_sittingdefault.bvh')
 bpy.context.view_layer.update()
 # Evaluate masks, fitted clothing, and the seated pose to static production meshes.
 dg=bpy.context.evaluated_depsgraph_get(); baked=[]
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  ev=o.evaluated_get(dg); mesh=bpy.data.meshes.new_from_object(ev,depsgraph=dg)
  mesh.transform(o.matrix_world)
  copy=bpy.data.objects.new(o.name+'.posed',mesh);bpy.context.collection.objects.link(copy);baked.append(copy)
 for o in list(bpy.context.scene.objects):
  if o not in baked:bpy.data.objects.remove(o,do_unlink=True)
 # Set floor contact, centre pelvis in chair. MakeHuman faces -Y, glTF faces +Z;
 # turn through pi so the final character faces the existing seat's -Z axis.
 minz=min(v.co.z for o in baked for v in o.data.vertices)
 # Pelvis joint is the reliable seat anchor, independent of body proportions.
 # The local sitting pose retains hip X/Y near the standing origin.
 from mathutils import Matrix
 mat=Matrix.Rotation(math.pi,4,'Z')
 for o in baked:
  for v in o.data.vertices:v.co.z-=minz
  o.data.transform(mat)
  for p in o.data.polygons:p.use_smooth=True
 # Keep glTF materials simple and portable. Preserve original UV photographs.
 for m in bpy.data.materials:
  if not m.use_nodes:continue
  images=[n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]
  diffuse=next((i for i in images if any(s in i.name.lower() for s in ['diffuse','texture','brown','hair'])),images[0] if images else None)
  normal=next((i for i in images if 'normal' in i.name.lower()),None)
  nodes=m.node_tree.nodes;nodes.clear();bs=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface']);bs.inputs['Roughness'].default_value=.72
  if diffuse:
   if max(diffuse.size)>1024:diffuse.scale(1024,1024)
   diffuse.pack()
   tex=nodes.new('ShaderNodeTexImage');tex.image=diffuse;m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
   if diffuse.channels==4:
    m.node_tree.links.new(tex.outputs['Alpha'],bs.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_transparency_overlap=False
  if normal:
   if max(normal.size)>512:normal.scale(512,512)
   normal.pack()
   tex=nodes.new('ShaderNodeTexImage');tex.image=normal;normal.colorspace_settings.name='Non-Color';n=nodes.new('ShaderNodeNormalMap');m.node_tree.links.new(tex.outputs['Color'],n.inputs['Color']);m.node_tree.links.new(n.outputs['Normal'],bs.inputs['Normal'])
 # Normalize the final image datablocks once, after MPFB material construction.
 normalized={}
 for o in baked:
  for m in o.data.materials:
   for node in m.node_tree.nodes:
    if node.type!='TEX_IMAGE' or not node.image:continue
    im=node.image
    if im.name not in normalized:
     size=1024 if 'skin' in im.name or 'diffuse' in im.name and 'male' in im.name else 512
     if max(im.size)>size:im.scale(size,size)
     filename=f'{out}/{key}-{im.name}.png'
     im.filepath_raw=filename;im.file_format='PNG';im.save()
     fresh=bpy.data.images.load(filename,check_existing=False);fresh.colorspace_settings.name=im.colorspace_settings.name
     normalized[im.name]=fresh
    node.image=normalized[im.name]
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=f'{out}/{key}.glb',export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_morph=False,export_image_format='AUTO')
 print('EXPORTED',key,[(o.name,len(o.data.vertices)) for o in baked],flush=True)
 bpy.ops.wm.save_as_mainfile(filepath=f'{out}/{key}.blend')
