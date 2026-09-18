"""Pack baked glTF buffers without changing geometry, UVs or texture pixels.
Usage: python3 scripts/pack-occupants.py PATH_TO_BAKED_GLBS
"""
import sys,json,struct,base64,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
textures=root/'public/assets/occupants';textures.mkdir(parents=True,exist_ok=True)
pack={'materials':{},'variants':[]}
for path in sorted(Path(sys.argv[1]).glob('staff-*.glb')):
 raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=raw[28+length:]
 def view(index):
  v=doc['bufferViews'][index];start=v.get('byteOffset',0);return binary[start:start+v['byteLength']]
 def accessor(index):
  a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];assert not v.get('byteStride'),'interleaved buffers require explicit unpacking'
  size={5123:2,5125:4,5126:4}[a['componentType']]*{'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];start=a.get('byteOffset',0)
  return {'data':base64.b64encode(view(a['bufferView'])[start:start+size*a['count']]).decode(),'type':a['componentType']}
 image_paths=[]
 for im in doc.get('images',[]):
  content=view(im['bufferView']);name=hashlib.sha256(content).hexdigest()[:20]+'.png';(textures/name).write_bytes(content);image_paths.append('/assets/occupants/'+name)
 def texture(info):return image_paths[doc['textures'][info['index']]['source']] if info else None
 names=[]
 for index,m in enumerate(doc['materials']):
  name=f'{path.stem}-material-{index}';names.append(name);p=m.get('pbrMetallicRoughness',{})
  pack['materials'][name]={'color':p.get('baseColorFactor',[1,1,1,1]),'roughness':p.get('roughnessFactor',.72),'albedo':texture(p.get('baseColorTexture')),'normal':texture(m.get('normalTexture')),'cutout':m.get('alphaMode','OPAQUE')!='OPAQUE','doubleSided':m.get('doubleSided',False)}
 parts=[]
 for node in doc['nodes']:
  if 'mesh' not in node:continue
  assert not any(k in node for k in ['matrix','translation','rotation','scale']),'bake transforms before packing'
  for p in doc['meshes'][node['mesh']]['primitives']:
   parts.append({'name':node['name'],'material':names[p['material']],'position':accessor(p['attributes']['POSITION']),'normal':accessor(p['attributes']['NORMAL']),'uv':accessor(p['attributes']['TEXCOORD_0']),'index':accessor(p['indices'])})
 pack['variants'].append({'name':path.stem,'parts':parts,'sourceSha256':hashlib.sha256(raw).hexdigest()})
(root/'viewer/campus/occupant-meshes.json').write_text(json.dumps(pack,separators=(',',':'))+'\n')
print('Packed',len(pack['variants']),'characters;',len(pack['materials']),'material slots')
