"""Aquascape M1 original authored assets, CC0-1.0.
Run: blender --background --python tools/m1/build_assets.py
Blender 4.3+. No downloaded meshes, photos, textures or generative image input.
Geometry is authored from anatomical profiles, erosion fields and branch splines;
these are game art, not scans or a claim of photorealism. See ASSET_LICENSES.md.
"""
import bpy, bmesh, math, json, struct, hashlib, os
from pathlib import Path
import numpy as np
from mathutils import Vector
from math import sin,cos,pi,sqrt,exp
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/m1'; OUT.mkdir(parents=True,exist_ok=True)
ONLY=set(filter(None,os.environ.get('AQUASCAPE_MODEL_ONLY','').split(',')))
REPORT=[]
if ONLY and (OUT/'manifest.json').exists():REPORT=[a for a in json.loads((OUT/'manifest.json').read_text())['assets'] if a['id'] not in ONLY]
def xyz(p): return (p[0],-p[2],p[1])
def clean():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 for block in list(bpy.data.meshes):
  if not block.users: bpy.data.meshes.remove(block)
def mesh(name,points,faces,uvs,mat):
 m=bpy.data.meshes.new(name);m.from_pydata([xyz(p) for p in points],[],faces);m.update()
 bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
 layer=m.uv_layers.new(name='SurfaceUV')
 for poly in m.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices: layer.data[loop].uv=uvs[m.loops[loop].vertex_index]
 o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

def image(name,arr):
 # Arrays are bottom-up UV coordinates, matching exported glTF v inversion.
 h,w=arr.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=False)
 rgba=np.ones((h,w,4),dtype=np.float32);rgba[:,:,:3]=np.clip(arr,0,1)
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();return im

def texture_material(name,base,height,rough,normal_strength=1):
 baseim=image(name+'-base',base)
 dy,dx=np.gradient(height);n=np.dstack((-dx*normal_strength,-dy*normal_strength,np.ones_like(dx)));n/=np.linalg.norm(n,axis=2,keepdims=True)
 normalim=image(name+'-normal',n*.5+.5);normalim.colorspace_settings.name='Non-Color'
 roughim=image(name+'-rough',np.repeat(rough[:,:,None],3,axis=2));roughim.colorspace_settings.name='Non-Color'
 m=bpy.data.materials.new(name);m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.8
 for im,socket in [(baseim,'Base Color'),(roughim,'Roughness')]:
  t=nodes.new('ShaderNodeTexImage');t.image=im;links.new(t.outputs['Color'],bs.inputs[socket])
 t=nodes.new('ShaderNodeTexImage');t.image=normalim;n=nodes.new('ShaderNodeNormalMap');links.new(t.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bs.inputs['Normal'])
 return m

def noise(x,y,z,seed=0):
 return (np.sin(x*3.7+y*2.1+seed)*np.cos(z*4.3-y*1.3)+.45*np.sin(x*9.3-y*6.1+z*7.7+seed*.7)+.20*np.cos(x*21.1+y*18.3-z*14.9+seed)+.07*np.sin(x*61.3-y*57.7+z*43.1)) / 1.72

def stone_field(x,y,z,kind,v):
 seed=v*2.31+1
 broad=noise(x*1.1,y,z,seed)
 if kind=='seiryu':
  strata=y*7.5+x*3.8-z*2.1+noise(x*1.7,y*.8,z*1.5,seed)*.7
  fiss=np.exp(-np.abs(np.sin(strata*pi))/.065)
  fault=np.exp(-np.abs(np.sin(x*5.7-z*2.3+y*.8+seed))/.045)
  return 1+.18*broad-.075*fiss-.13*fault+.07*np.sin(y*10+x*4),fiss,fault
 # Deep elongated Ohko clay erosion cavities, oriented along weathering grain.
 cavities=np.zeros_like(x)
 for j in range(37):
  a=j*2.399+seed;yy=-.85+(j%11)*.17
  center=np.array([cos(a),yy,sin(a)]);center/=np.linalg.norm(center)
  d=((x-center[0])/.12)**2+((y-center[1])/.24)**2+((z-center[2])/.12)**2
  cavities=np.maximum(cavities,np.exp(-d*1.35))
 grain=np.exp(-np.abs(np.sin(y*10+x*5+noise(x,y,z,seed)))/.09)
 return 1+.13*broad-.37*cavities-.055*grain,cavities,grain

def stone_mat(kind,v):
 u,t=np.meshgrid(np.linspace(0,2*pi,1024),np.linspace(.001,pi-.001,512));x=np.sin(t)*np.cos(u);y=np.cos(t);z=np.sin(t)*np.sin(u)
 r,c,f=stone_field(x,y,z,kind,v);grain=noise(x*14,y*14,z*14,v)*.08
 if kind=='seiryu':
  col=np.array([.37,.405,.42]);vein=np.exp(-np.abs(np.sin(y*15+x*8-z*4+noise(x,y,z,v)*.8))/.07)
  albedo=col[None,None,:]*(.83+noise(x*3,y*3,z*3,v)[:,:,None]*.2+grain[:,:,None])
  albedo*=1-f[:,:,None]*.48-c[:,:,None]*.12;albedo+=vein[:,:,None]*np.array([.20,.19,.16])
 else:
  col=np.array([.48,.355,.21]);albedo=col[None,None,:]*(1+noise(x*3,y*3,z*3,v)[:,:,None]*.27+grain[:,:,None]);albedo*=1-c[:,:,None]*.63;albedo+=f[:,:,None]*.055
 return texture_material(f'{kind}-{v}',albedo,r*.25+grain*.07,np.clip(.82+grain*.3+c*.1,.6,1),28)

def rock(kind,v,lod,mat):
 rings,sides=(72,128) if lod=='high' else (18,30)
 pts=[];uv=[];faces=[]
 for i in range(rings+1):
  t=.0001+(pi-.0002)*i/rings
  for j in range(sides+1):
   u=j/sides*2*pi;x=sin(t)*cos(u);y=cos(t);z=sin(t)*sin(u);r=float(stone_field(np.array(x),np.array(y),np.array(z),kind,v)[0])
   # Each variant has a different major axis, fracture plane and summit.
   xx=x*r*(1+.12*sin(y*4+v))+(y+.3)*(.16 if v==1 else -.09 if v==2 else .04)
   yy=y*r*(1.15 if v==0 else .82 if v==1 else 1.05)
   zz=z*r*(.65 if v==0 else .92 if v==1 else .56)
   yy=min(yy,.87+xx*(.35 if v==0 else -.24)+zz*.19)
   yy=max(yy,-.82+xx*.025)
   pts.append([xx,yy,zz]);uv.append((j/sides,i/rings))
 for i in range(rings):
  for j in range(sides):
   n=i*(sides+1)+j;faces.extend([(n,n+sides+1,n+1),(n+1,n+sides+1,n+sides+2)])
 p=np.array(pts);p[:,1]-=p[:,1].min();radius=.65 if kind=='seiryu' else .57;height=1.35 if kind=='seiryu' else 1.05
 p[:,[0,2]]*=radius/np.max(np.linalg.norm(p[:,[0,2]],axis=1));p[:,1]*=height/p[:,1].max()
 o=mesh(kind,p,faces,uv,mat)
 if lod=='high':
  bpy.context.view_layer.objects.active=o;o.select_set(True);mod=o.modifiers.new('Silhouette-preserving decimation','DECIMATE');mod.ratio=.38;bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
 return o

def wood_mat():
 u,v=np.meshgrid(np.linspace(0,1,512),np.linspace(0,1,512));grain=np.sin((u*41+.09*np.sin(v*12)+.045*np.sin(v*34)+.04*np.sin(u*33+v*3))*2*pi);groove=np.exp(-np.abs(grain)/.12);knots=np.sin(u*137+v*7)*np.sin(v*183+u*11);h=.035*grain-.075*groove+.01*knots
 base=np.array([.33,.22,.13])[None,None,:]*(1+grain[:,:,None]*.10+knots[:,:,None]*.035)-groove[:,:,None]*.045
 return texture_material('spider-grain',base,h,np.clip(.86+groove*.09+knots*.02,.7,1),14)

def add_tube(P,F,U,path,radius,segments=24,sides=10,taper=.95,atlas=None):
 # Cubic Bezier along authored asymmetric branch centerline, with buttress flutes.
 start=len(P);path=np.array(path)
 for i in range(segments+1):
  t=i/segments;p=(1-t)**3*path[0]+3*(1-t)**2*t*path[1]+3*(1-t)*t*t*path[2]+t**3*path[3]
  tangent=-3*(1-t)**2*path[0]+(3*(1-t)**2-6*(1-t)*t)*path[1]+(6*(1-t)*t-3*t*t)*path[2]+3*t*t*path[3];tangent/=max(.00001,np.linalg.norm(tangent));normal=np.cross(tangent,[0,0,1] if abs(tangent[2])<.85 else [0,1,0]);normal/=np.linalg.norm(normal);bitangent=np.cross(tangent,normal)
  for j in range(sides+1):
   a=j/sides*2*pi;r=radius*(1-taper*t)**1.15*(1+.13*sin(a*5+t*17)+.06*sin(a*9-t*31));pt=p+(normal*cos(a)+bitangent*sin(a))*r
   P.append(pt.tolist());uu,vv=j/sides,t*2
   U.append((uu,vv) if atlas is None else (atlas[0]+uu*atlas[2],atlas[1]+t*atlas[3]))
 for i in range(segments):
  for j in range(sides):
   n=start+i*(sides+1)+j;F.extend([(n,n+sides+1,n+1),(n+1,n+sides+1,n+sides+2)])
 for end in [0,segments]:
  ring=start+end*(sides+1)
  for j in range(1,sides-1):F.append((ring,ring+j,ring+j+1))

def wood(v,lod,mat):
 P=[];F=[];U=[];seg=25 if lod=='high' else 12;sides=12 if lod=='high' else 7
 paths=[([[-.42,.02,.08],[-.25,.16,.03],[.11,.38,-.06],[.17,.67,-.09]],.13)]
 for j in range(8):
  a=j*2.399+v*.9;start=[-.20+j*.025,.16+(j%3)*.08,.03]
  end=[cos(a)*(.65+.13*(j%3)),.04 if j<4 else .75+.11*(j%3),sin(a)*(.57+.08*(j%2))]
  mid=[end[0]*.34,.36+((j+v)%3)*.18,end[2]*.4];mid2=[end[0]*.8,end[1]*.8+.12,end[2]*.8]
  paths.append(([start,mid,mid2,end],.065-(j%4)*.009))
  if j>=3:
   tip=[end[0]+.16*cos(a+.7),end[1]+.18,end[2]+.18*sin(a+.7)]
   paths.append(([mid,mid2,[end[0]*.9,end[1]+.12,end[2]*.9],tip],.021))
 for path,r in paths:add_tube(P,F,U,path,r,seg,sides)
 p=np.array(P);p[:,1]-=p[:,1].min();p[:,[0,2]]*=1.2/np.linalg.norm(p[:,[0,2]],axis=1).max();p[:,1]*=1.35/p[:,1].max()
 return mesh('spider',p,F,U,mat)

def leaf_mat(kind):
 u,v=np.meshgrid(np.linspace(0,1,256),np.linspace(0,1,512));midrib=np.exp(-abs(u-.5)*120);veins=np.exp(-np.abs(np.sin((v-abs(u-.5)*.5)*pi*13))/.06)*np.minimum(1,abs(u-.5)*10)
 noisev=np.sin(u*201+v*31)*np.sin(v*211+u*45)*.012
 c={'monte':[.40,.64,.14],'rotala':[.48,.59,.27],'anubias':[.18,.38,.12]}[kind]
 base=np.array(c)[None,None,:]*(.85+.22*v[:,:,None]+noisev[:,:,None])+(midrib*.07+veins*.027)[:,:,None]
 if kind=='rotala':base=base*(1-v[:,:,None]*.25)+np.array([.17,.008,.01])[None,None,:]*v[:,:,None]**3
 return texture_material(kind+'-leaf',base,midrib*.025+veins*.01,np.clip(.66+noisev*2,.5,.8),12)

def leaf(kind,v,lod,mat):
 P=[];F=[];U=[];rows,cols=(14,8) if lod=='high' else (6,4)
 for i in range(rows+1):
  t=i/rows;y=.18+.82*t
  width=(.41*max(.0001,sin(pi*t))**.52 if kind=='monte' else .155*max(.0001,sin(pi*t))**.8 if kind=='rotala' else .32*max(.0001,sin(pi*t))**.62)*(1+v*.055)
  for j in range(cols+1):
   s=j/cols*2-1;x=s*width*(1+.025*sin(t*25+v));z=.10*sin(t*pi)*(1-s*s)+.045*s*s*sin(t*9+v)+.04*t*t
   P.append([x,y,z]);U.append((j/cols,t))
 for i in range(rows):
  for j in range(cols):
   n=i*(cols+1)+j;F.extend([(n,n+cols+1,n+1),(n+1,n+cols+1,n+cols+2)])
 add_tube(P,F,U,[[0,0,0],[0,.06,0],[0,.12,.015],[0,.23,.025]],.014 if kind=='anubias' else .008,5 if lod=='high' else 2,5 if lod=='high' else 3,.35,atlas=(.48,0,.04,.22))
 return mesh('Leaf',P,F,U,mat)

def fish_mat(kind):
 # Atlas: body v[0,.5], fins [.52,.77], black eye [.81,.89], gold iris [.92,1].
 u,v=np.meshgrid(np.linspace(0,1,1024),np.linspace(0,1,512));vv=v*2;ny=np.cos(vv*2*pi)
 scales=(np.sin(u*150+np.floor(vv*30)%2*2)*np.sin(vv*95))**6;grain=np.sin(u*591+v*313)*np.sin(u*277-v*733)*.013
 if kind=='neon':
  top=np.array([.19,.24,.25]);base=top[None,None,:]*np.ones((*u.shape,1));base+=((1-ny)*.14)[:,:,None]
  stripe=np.exp(-(ny/.17)**6);base=base*(1-stripe[:,:,None])+stripe[:,:,None]*np.array([.025,.67,.80]);red=((ny<-.20)&(u<.54)).astype(float);base=base*(1-red[:,:,None])+red[:,:,None]*np.array([.67,.045,.055]);fincolor=[.49,.58,.52]
 elif kind=='betta':
  base=np.array([.055,.23,.28])[None,None,:]*np.ones((*u.shape,1));base+=scales[:,:,None]*np.array([.035,.11,.12]);red=np.clip((.30-u)*3,0,.65);base=base*(1-red[:,:,None])+red[:,:,None]*np.array([.46,.055,.12]);fincolor=[.36,.06,.15]
 else:
  base=np.array([.58,.06,.025])[None,None,:]*(.8+scales[:,:,None]*.3);speck=(np.sin(u*127+v*183)*np.sin(v*255-u*93)>.84);base+=speck[:,:,None]*.16;band=np.exp(-abs(np.sin(u*37))/.055);base*=1-band[:,:,None]*.28;fincolor=[.57,.11,.07]
 rays=np.sin(u*145+v*24)**12;fin=np.array(fincolor)[None,None,:]*(.72+rays[:,:,None]*.44+grain[:,:,None]);base=np.where((v>.51)[:,:,None],fin,base)
 base=np.where(((v>.80)&(v<.90))[:,:,None],np.array([.008,.012,.014]),base);base=np.where((v>.91)[:,:,None],np.array([.47,.38,.16]),base)
 h=scales*.007+grain*.1;rough=np.ones_like(u)*(.47 if kind!='shrimp' else .52);rough[v>.8]=.23
 return texture_material(kind+'-skin',base,h,rough,8)

def append_ellipsoid(P,F,U,center,radii,atlas=(0,.81,1,.075),rings=10,sides=16):
 start=len(P)
 for i in range(rings+1):
  t=pi*(.0001+(.9998)*i/rings)
  for j in range(sides+1):
   a=j/sides*2*pi;P.append([center[0]+radii[0]*cos(t),center[1]+radii[1]*sin(t)*cos(a),center[2]+radii[2]*sin(t)*sin(a)]);U.append((atlas[0]+j/sides*atlas[2],atlas[1]+i/rings*atlas[3]))
 for i in range(rings):
  for j in range(sides):
   n=start+i*(sides+1)+j;F.extend([(n,n+sides+1,n+1),(n+1,n+sides+1,n+sides+2)])

def fin(P,F,U,root,edge,rows=6):
 start=len(P);n=len(edge)
 for j,e in enumerate(edge):
  for i in range(rows+1):
   t=i/rows;p=np.array(root)*(1-t)+np.array(e)*t;p[2]+=.006*sin(j*2.3)*t*t
   P.append(p.tolist());U.append((j/(n-1),.53+t*.23))
 for j in range(n-1):
  for i in range(rows):
   k=start+j*(rows+1)+i;F.extend([(k,k+rows+1,k+1),(k+1,k+rows+1,k+rows+2)])

def animal(kind,lod,mat):
 P=[];F=[];U=[];rings,sides=(40,24) if lod=='high' else (16,10)
 if kind!='shrimp':
  # Normalized total length: caudal edge -.50; closed upper snout +.50.
  for i in range(rings+1):
   u=i/rings;x=-.28+u*.78
   h=(.121 if kind=='betta' else .077)*(sin(pi*u)**.65)*min(1,.23+u*7)
   w=(.061 if kind=='betta' else .045)*(sin(pi*u)**.62)*min(1,.35+u*6)
   for j in range(sides+1):
    a=j/sides*2*pi;ny=cos(a);P.append([x,h*ny+.015*(u-.4),w*sin(a)]);U.append((u,j/sides*.495))
  for i in range(rings):
   for j in range(sides):
    n=i*(sides+1)+j;F.extend([(n,n+sides+1,n+1),(n+1,n+sides+1,n+sides+2)])
  for side in [-1,1]:
   append_ellipsoid(P,F,U,[.365,.032,side*.034],[.028,.029,.014],(0,.92,1,.075),8 if lod=='high' else 5,12 if lod=='high' else 8)
   append_ellipsoid(P,F,U,[.368,.033,side*.045],[.020,.021,.007],rings=8 if lod=='high' else 5,sides=12 if lod=='high' else 8)
   # Operculum seam and mouth are geometry, not a painted eye on a capsule.
   add_tube(P,F,U,[[.28,.078,side*.035],[.245,.04,side*.058],[.25,-.04,side*.052],[.30,-.07,side*.028]],.0028,12,4,.2,(0,.81,1,.06))
  add_tube(P,F,U,[[.491,.003,-.012],[.498,.001,-.004],[.498,.001,.004],[.491,.003,.012]],.0024,8,4,.1,(0,.81,1,.06))
  betta=kind=='betta';steps=30 if lod=='high' else 16
  tail=[]
  for j in range(steps+1):
   t=j/steps;s=t*2-1
   if betta:
    a=-pi*.48+t*pi*.96;tail.append([-.275-.225*cos(a),sin(a)*.24,.013*sin(t*25)])
   else:tail.append([-.44-.06*abs(s),s*.127,.002*sin(t*20)])
  fin(P,F,U,[-.275,0,0],tail,8 if lod=='high' else 4)
  for underside in [False,True]:
   sign=-1 if underside else 1;edge=[]
   for j in range(steps+1):
    t=j/steps
    if betta:x=-.24+t*.49;y=sign*(.13 if not underside else .17)*sin(t*pi)**.45
    else:x=(-.10 if not underside else -.23)+t*(.22 if not underside else .26);y=sign*((.065 if not underside else .04)+(.07 if not underside else .05)*sin(t*pi)**.8)
    if betta:y*=1+.09*sin(t*38)
    edge.append([x,y+sign*.04,.002])
   fin(P,F,U,[.04 if betta else -.015 if not underside else -.10,sign*.045,0],edge,5 if lod=='high' else 3)
  for side in [-1,1]:
   fin(P,F,U,[.23,-.025,side*.036],[[.11,-.045,side*.11],[.04,-.08,side*.13],[.08,-.095,side*.08]],4)
   if betta:fin(P,F,U,[.20,-.06,side*.018],[[.18,-.16,side*.025],[.10,-.29,side*.04],[.13,-.15,side*.03]],5)
 else:
  # Continuous arched carapace/abdomen; overlapping pleura replace spherical beads.
  for i in range(rings+1):
   t=i/rings;x=-.32+t*.63;profile=sin(pi*t)**.45
   y=.048+.053*sin(t*pi);r=.062*profile*(.55+.45*t)
   for j in range(sides+1):
    a=j/sides*2*pi;rib=1+.045*cos(t*pi*14);P.append([x,y+cos(a)*r*rib,sin(a)*r*.74*rib]);U.append((t,j/sides*.495))
  for i in range(rings):
   for j in range(sides):
    n=i*(sides+1)+j;F.extend([(n,n+sides+1,n+1),(n+1,n+sides+1,n+sides+2)])
  add_tube(P,F,U,[[.22,.13,0],[.29,.14,0],[.34,.15,0],[.40,.155,0]],.013,10,5,.99,(0,.53,1,.22))
  for side in [-1,1]:
   append_ellipsoid(P,F,U,[.265,.122,side*.043],[.016,.018,.012],rings=7,sides=10)
   for j in range(5):
    x=.18-j*.072;add_tube(P,F,U,[[x,.05,side*.025],[x+.03,.021,side*.10],[x-.02,.006,side*.12],[x-.055,.002,side*.14]],.006,9 if lod=='high' else 5,5,.7,(0,.53,1,.22))
   for j in range(2):add_tube(P,F,U,[[.29,.10,side*.03],[.39,.16,side*.08],[.48,.11,side*(.15+j*.04)],[.50-j*.06,.07,side*(.20+j*.05)]],.0025,16 if lod=='high' else 9,4,.9,(0,.53,1,.22))
   fin(P,F,U,[-.28,.055,0],[[-.45,.03,side*.09],[-.50,.025,side*.045],[-.43,.05,0]],4)
 o=mesh('Animal',P,F,U,mat)
 # Shape-key animation supports GPU instancing through Three.setMorphAt.
 o.shape_key_add(name='Basis')
 for name,sign in [('SwimLeft',1),('SwimRight',-1)]:
  key=o.shape_key_add(name=name)
  for i,p in enumerate(P):
   x,y,z=p;t=max(0,min(1,(.12-x)/.62));z+=sign*(.045 if kind=='betta' else .032 if kind=='neon' else .012)*t*t;y+=sign*.006*sin(x*20)*t
   if kind=='betta' and abs(y)>.10:z+=sign*.015*sin(x*31+y*17)
   if kind=='shrimp' and y<.03:y+=.006*(1+sin(x*62))*sign
   key.data[i].co=xyz((x,y,z))
  for frame,value in [(1,0),(7,1 if sign==1 else 0),(13,0),(19,1 if sign==-1 else 0),(25,0)]:key.value=value;key.keyframe_insert(data_path='value',frame=frame)
 if o.data.shape_keys.animation_data and o.data.shape_keys.animation_data.action:o.data.shape_keys.animation_data.action.name='Swim'
 bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=25;bpy.context.scene.render.fps=24;bpy.context.scene.frame_set(1)
 return o

def export(o,id,v,lod,animation=False):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 tmp=OUT/'export.gltf'
 bpy.ops.export_scene.gltf(filepath=str(tmp),export_format='GLTF_SEPARATE',use_selection=True,export_yup=True,export_animations=animation,export_tangents=True,export_morph=True,export_morph_normal=True,export_skins=False,export_materials='EXPORT',export_image_format='AUTO',export_keep_originals=True,export_extras=True)
 d=json.loads(tmp.read_text());binary=(OUT/d['buffers'][0]['uri']).read_bytes();d['buffers'][0].pop('uri',None)
 d['asset']['copyright']='Original Aquascape M1 authored mathematical game art; CC0-1.0'
 d['extras']={'assetId':id,'variant':v,'lod':lod,'up':'+Y','forward':'+X','origin':'center' if animation else 'ground-center','units':'game unit = 10 cm','notPhotogrammetry':True}
 for image_def in d.get('images',[]):image_def['uri']=Path(image_def['uri']).name
 js=json.dumps(d,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary+=b'\0'*((-len(binary))%4)
 name=f'{id}-{v}-{lod}.glb';data=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary;(OUT/name).write_bytes(data)
 triangles=sum(len(p.vertices)-2 for p in o.data.polygons)
 bounds=np.array([xyz(tuple(p.co)) for p in o.data.vertices]);REPORT.append({'id':id,'variant':v,'lod':lod,'file':'models/m1/'+name,'bytes':len(data),'triangles':triangles,'boundsMin':bounds.min(axis=0).tolist(),'boundsMax':bounds.max(axis=0).tolist(),'animations':[a['name'] for a in d.get('animations',[])],'sha256':hashlib.sha256(data).hexdigest()})
 print('M1_EXPORT',name,triangles,flush=True)
 tmp.unlink(missing_ok=True);(OUT/'export.bin').unlink(missing_ok=True)

clean()
for kind in ['seiryu','dragon']:
 if ONLY and kind not in ONLY:continue
 for v in range(3):
  mat=stone_mat(kind,v)
  for lod in ['high','low']:clean();export(rock(kind,v,lod,mat),kind,v,lod)
mat=wood_mat()
for v in ([] if ONLY and 'spider' not in ONLY else range(3)):
 for lod in ['high','low']:clean();export(wood(v,lod,mat),'spider',v,lod)
for kind in ['monte','rotala','anubias']:
 if ONLY and kind not in ONLY:continue
 mat=leaf_mat(kind)
 for v in range(3):
  for lod in ['high','low']:clean();export(leaf(kind,v,lod,mat),kind,v,lod)
for kind in ['neon','betta','shrimp']:
 if ONLY and kind not in ONLY:continue
 mat=fish_mat(kind)
 for lod in ['high','low']:clean();export(animal(kind,lod,mat),kind,0,lod,True)
(OUT/'manifest.json').write_text(json.dumps({'version':'M1','license':'CC0-1.0','author':'Aquascape project; original assets authored with Blender/Python','source':'tools/m1/build_assets.py','assets':REPORT},indent=2)+'\n')
print('M1 COMPLETE',len(REPORT),flush=True)
