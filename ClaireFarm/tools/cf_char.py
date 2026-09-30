"""Blender: rigged model -> one skinned mesh (vertex colours baked from materials unless textured), only the listed clips, small textures."""
import bpy, sys, os, json
argv=sys.argv[sys.argv.index('--')+1:]
src,out,keep=argv[0],argv[1],argv[2].split(',')
tex=int(argv[3]) if len(argv)>3 else 512
ratio=float(argv[4]) if len(argv)>4 else 1.0
bpy.ops.wm.read_factory_settings(use_empty=True)
if src.endswith('.fbx'): bpy.ops.import_scene.fbx(filepath=src)
else: bpy.ops.import_scene.gltf(filepath=src)
for m in bpy.data.materials:
    m.diffuse_color[3]=1.0
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':
                n.inputs['Alpha'].default_value=1.0; n.inputs['Metallic'].default_value=0.0
arm=[o for o in bpy.context.scene.objects if o.type=='ARMATURE'][0]
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
def has_tex(o):
    for m in o.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type=='TEX_IMAGE': return True
    return False
textured=any(has_tex(o) for o in meshes)
def bake(o):
    me=o.data
    ca=me.color_attributes.new('Col','BYTE_COLOR','CORNER')
    cols=[]
    for m in me.materials:
        c=(0.8,0.8,0.8,1.0)
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type=='BSDF_PRINCIPLED': c=tuple(n.inputs['Base Color'].default_value)
        cols.append((c[0],c[1],c[2],1.0))
    if not cols: cols=[(0.8,0.8,0.8,1.0)]
    for poly in me.polygons:
        c=cols[min(poly.material_index,len(cols)-1)]
        for li in poly.loop_indices: ca.data[li].color=c
    me.color_attributes.active_color=ca
if not textured:
    for o in meshes: bake(o)
    for o in meshes: o.data.materials.clear()
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
if len(meshes)>1: bpy.ops.object.join()
body=bpy.context.view_layer.objects.active
if ratio<1.0:
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.mode!='OBJECT' else None
    mod=body.modifiers.new('cfdec','DECIMATE'); mod.decimate_type='COLLAPSE'; mod.ratio=ratio; mod.use_collapse_triangulate=True
    try: mod.delimit={'UV','MATERIAL'}
    except Exception: pass
    bpy.ops.object.modifier_move_to_index(modifier='cfdec', index=0)
    bpy.ops.object.modifier_apply(modifier='cfdec')
    print('CFDEC', len(body.data.polygons))
# clips
arm.animation_data_create()
acts=list(bpy.data.actions)
def short(n):
    n=n.split('|')[-1]
    for suf in ('_CharacterArmature','_Armature'):
        if n.endswith(suf): n=n[:-len(suf)]
    return n
for a in acts:
    if short(a.name) not in keep: bpy.data.actions.remove(a)
for tr in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(tr)
arm.animation_data.action=None
for a in bpy.data.actions:
    nm=short(a.name); a.name=nm
    tr=arm.animation_data.nla_tracks.new(); tr.name=nm
    st=tr.strips.new(nm,int(a.frame_range[0]),a); st.name=nm
for img in bpy.data.images:
    if img.size[0] and max(img.size)>tex:
        k=tex/max(img.size); img.scale(max(1,int(img.size[0]*k)),max(1,int(img.size[1]*k))); img.pack()
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_image_format='WEBP',export_image_quality=80,export_vertex_color='ACTIVE',export_skins=True)
print('CFCHAR',json.dumps({'clips':[a.name for a in bpy.data.actions],'tex':textured}))
