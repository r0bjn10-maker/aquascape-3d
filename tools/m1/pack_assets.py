"""Run with python3 after Blender. Optimize distribution textures losslessly for
normals/roughness, WebP base color. Requires numpy/Pillow only in art toolchain.
GLB uses EXT_texture_webp (supported by the game's modern browser baseline).
"""
import json,struct,hashlib
import numpy as np
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/models/m1'
for path in list(OUT.glob('*.png')):
 im=Image.open(path).convert('RGB')
 if '-base' in path.stem:
  im.save(path.with_suffix('.webp'),quality=91,method=6);path.unlink()
 else:
  limit=256
  if max(im.size)>limit:im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
  im.save(path,optimize=True)
for path in OUT.glob('*.glb'):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);offset=20+n;size=struct.unpack_from('<I',b,offset)[0];binary=bytearray(b[offset+8:offset+8+size])
 # Degenerate UV corners (pole/end-cap triangles) may produce zero tangents.
 # Supply a normal-orthogonal unit tangent instead of shipping invalid glTF.
 for mesh in d.get('meshes',[]):
  for primitive in mesh['primitives']:
   attrs=primitive['attributes']
   if 'TANGENT' not in attrs:continue
   def view(index,components):
    a=d['accessors'][index];v=d['bufferViews'][a['bufferView']];return np.ndarray((a['count'],components),dtype='<f4',buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',components*4),4))
   t=view(attrs['TANGENT'],4);n=view(attrs['NORMAL'],3);length=np.linalg.norm(t[:,:3],axis=1);bad=length<.001
   for i in np.flatnonzero(bad):
    axis=[0.,1.,0.] if abs(n[i,1])<.9 else [1.,0.,0.];t[i,:3]=np.cross(n[i],axis);t[i,3]=1
   t[:,:3]/=np.maximum(np.linalg.norm(t[:,:3],axis=1,keepdims=True),.00001)
 # Reassert the exact placement envelope after Blender's decimator.
 id=path.stem.split('-')[0]
 if id in ['seiryu','dragon','spider']:
  radius,height={'seiryu':(.65,1.35),'dragon':(.57,1.05),'spider':(1.2,1.35)}[id]
  for mesh in d['meshes']:
   for primitive in mesh['primitives']:
    index=primitive['attributes']['POSITION'];pos=view(index,3);pos[:,1]-=pos[:,1].min();pos[:,1]*=height/pos[:,1].max();pos[:,[0,2]]*=radius/np.linalg.norm(pos[:,[0,2]],axis=1).max();d['accessors'][index]['min']=pos.min(axis=0).tolist();d['accessors'][index]['max']=pos.max(axis=0).tolist()
 for animation in d.get('animations',[]):animation['name']='Swim'
 webp=[]
 for i,im in enumerate(d.get('images',[])):
  if '-base' in im['uri']:
   im['uri']=Path(im['uri']).with_suffix('.webp').name;im['mimeType']='image/webp';webp.append(i)
 for texture in d.get('textures',[]):
  if texture.get('source') in webp:texture.setdefault('extensions',{})['EXT_texture_webp']={'source':texture.pop('source')}
 if webp:d['extensionsUsed']=sorted(set(d.get('extensionsUsed',[])+['EXT_texture_webp']));d['extensionsRequired']=sorted(set(d.get('extensionsRequired',[])+['EXT_texture_webp']))
 js=json.dumps(d,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
 data=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary;path.write_bytes(data)
manifest=json.loads((OUT/'manifest.json').read_text());textures=[]
for p in sorted(OUT.iterdir()):
 if p.suffix in ['.png','.webp']:textures.append({'file':'models/m1/'+p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dimensions':list(Image.open(p).size)})
for item in manifest['assets']:
 p=ROOT/'public'/item['file'];item['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();item['bytes']=p.stat().st_size
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);a=d['accessors'][d['meshes'][0]['primitives'][0]['attributes']['POSITION']];item['boundsMin']=a['min'];item['boundsMax']=a['max'];item['animations']=[a['name'] for a in d.get('animations',[])]
for item in manifest['assets']:
 id=item['id']
 item['scale']={'units':'1 game unit = 10 cm','up':'+Y','forward':'+X','origin':'ground-center' if id not in ['neon','betta','shrimp'] else 'animal-center'}
 if id in ['seiryu','dragon','spider']:
  r,h={'seiryu':(.65,1.35),'dragon':(.57,1.05),'spider':(1.2,1.35)}[id];item['collision']={'shape':'conservative-cylinder','radius':r,'height':h,'scaledBy':'placedObject.scale'}
 elif id in ['neon','betta','shrimp']:item['collision']={'shape':'conservative-sphere','radiusFormula':'max(0.045, life.lengthCm * 0.065 + 0.025)','visualLength':'life.lengthCm / 10'}
 else:item['placement']={'role':'instanced-leaf-module','drivenBy':['bio.stage','bio.height','bio.spread','bio.branches','bio.runners'],'surface':'hardscape-or-substrate' if id=='anubias' else 'substrate'}
manifest['sources']={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['tools/m1/build_assets.py','tools/m1/pack_assets.py']}
manifest['textures']=textures;manifest['compression']='WebP base color, lossless PNG normal/roughness; no GPU block compression claim'
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
budgets={id:{lod:max(a['triangles'] for a in manifest['assets'] if a['id']==id and a['lod']==lod) for lod in ['high','low']} for id in sorted({a['id'] for a in manifest['assets']})}
(ROOT/'src/data/m1-budgets.json').write_text(json.dumps(budgets,indent=2)+'\n')
print('M1 distribution:',len(manifest['assets']),'GLBs,',len(textures),'shared texture files,',round(sum(p.stat().st_size for p in OUT.iterdir())/1e6,2),'MB')
