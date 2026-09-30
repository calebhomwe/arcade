"""Blender: combine many model files into one GLB with named top-level objects.
usage: blender -b --python cf_pack.py -- spec.json out.glb
spec: [{id, src, parts:{partName:[objectNameSubstr,...]}, tex:512, q:80, keepTex:true}]
Each entry becomes an Empty `id`; its body mesh is `id`_body (materials baked to vertex colour when it has no texture),
and every named part its own mesh `id`_part (origin at the part's bbox centre so code can spin it)."""
import bpy, sys, json, os, mathutils
spec=json.load(open(sys.argv[sys.argv.index('--')+1])); out=sys.argv[sys.argv.index('--')+2]
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(path):
    before=set(bpy.data.objects)
    ext=os.path.splitext(path)[1].lower()
    if ext=='.fbx': bpy.ops.import_scene.fbx(filepath=path)
    else: bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]
def has_tex(o):
    for m in o.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type=='TEX_IMAGE': return True
    return False
def bake_vcol(o):
    me=o.data
    if 'Col' in me.color_attributes: me.color_attributes.remove(me.color_attributes['Col'])
    ca=me.color_attributes.new('Col','BYTE_COLOR','CORNER')
    cols=[]
    for m in me.materials:
        c=(0.8,0.8,0.8,1.0)
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type=='BSDF_PRINCIPLED': c=tuple(n.inputs['Base Color'].default_value)
        elif m: c=tuple(m.diffuse_color)
        cols.append((c[0],c[1],c[2],1.0))
    if not cols: cols=[(0.8,0.8,0.8,1.0)]
    for poly in me.polygons:
        c=cols[min(poly.material_index,len(cols)-1)]
        for li in poly.loop_indices: ca.data[li].color=c
    me.color_attributes.active_color=ca
    me.materials.clear()
def join(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    if len(objs)>1: bpy.ops.object.join()
    return bpy.context.view_layer.objects.active
def apply_all(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
report=[]
for s in spec:
    before_imgs=set(bpy.data.images)
    new=imp(s['src'])
    # kill alpha zero materials from FBX
    for m in bpy.data.materials:
        m.diffuse_color[3]=1.0
        if m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type=='BSDF_PRINCIPLED':
                    n.inputs['Alpha'].default_value=1.0
                    if s.get('nometal',True): n.inputs['Metallic'].default_value=0.0
    meshes=[o for o in new if o.type=='MESH']
    for o in meshes:
        if o.data.users>1: o.data=o.data.copy()
        o.parent=None
    for o in new:
        if o.type!='MESH' and o.name in bpy.data.objects: bpy.data.objects.remove(o,do_unlink=True)
    for o in meshes: apply_all(o)
    parts={}; body=[]
    for o in meshes:
        pn=None
        for name,subs in s.get('parts',{}).items():
            if any(x.lower() in o.name.lower() for x in subs): pn=name
        (parts.setdefault(pn,[]) if pn else body).append(o)
    # body first: joined
    ball=body
    if not ball: raise SystemExit('no body for '+s['id'])
    textured=any(has_tex(o) for o in ball)
    if not textured:
        for o in ball: bake_vcol(o)
    b=join(ball); b.name=s['id']+'_body'; b.data.name=b.name
    # weld
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.00005); bpy.ops.mesh.delete_loose(); bpy.ops.object.mode_set(mode='OBJECT')
    bb=[b.matrix_world@v.co for v in b.data.vertices]
    lo=[min(v[i] for v in bb) for i in range(3)]; hi=[max(v[i] for v in bb) for i in range(3)]
    shift=mathutils.Vector((-(lo[0]+hi[0])/2,-(lo[1]+hi[1])/2,-lo[2]))
    root=bpy.data.objects.new(s['id'],None); bpy.context.scene.collection.objects.link(root)
    def place(o):
        for v in o.data.vertices: v.co+=shift
    place(b); b.parent=root
    if s.get('tris'):
        n=len(b.data.polygons)
        m=b.modifiers.new('d','DECIMATE'); m.ratio=min(1.0,s['tris']/max(1,sum(len(p.vertices)-2 for p in b.data.polygons))); m.use_collapse_triangulate=True; m.delimit={'UV','MATERIAL'}
        bpy.context.view_layer.objects.active=b; bpy.ops.object.modifier_apply(modifier=m.name)
    info={'id':s['id'],'body_tris':sum(len(p.vertices)-2 for p in b.data.polygons),'tex':textured,'parts':{}}
    for pn,objs in parts.items():
        if not textured:
            for o in objs: bake_vcol(o)
        p=join(objs); p.name=s['id']+'_'+pn; p.data.name=p.name
        place(p)
        bpy.ops.object.select_all(action='DESELECT'); p.select_set(True); bpy.context.view_layer.objects.active=p
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY',center='BOUNDS')
        p.parent=root
        info['parts'][pn]=[round(v,3) for v in p.location]
    for img in [i for i in bpy.data.images if i not in before_imgs]:
        if img.size[0] and max(img.size)>s.get('tex',512):
            k=s.get('tex',512)/max(img.size); img.scale(max(1,int(img.size[0]*k)),max(1,int(img.size[1]*k)))
    report.append(info)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_apply=True,export_image_format='WEBP',export_image_quality=78,export_vertex_color='ACTIVE')
print('CFPACK',json.dumps(report))
