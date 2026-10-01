"""Blender: import a GLB, weld, optionally decimate (UV aware), shrink textures, pivot bottom-centre, export GLB (webp textures)."""
import bpy, sys, os, json, argparse
ap=argparse.ArgumentParser(); ap.add_argument('--in',dest='src'); ap.add_argument('--out'); ap.add_argument('--tris',type=int,default=0); ap.add_argument('--tex',type=int,default=512)
ap.add_argument('--delimit',default='UV'); ap.add_argument('--q',type=int,default=80)
a=ap.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a.src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
    if o.data.users>1: o.data=o.data.copy()
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
if len(meshes)>1: bpy.ops.object.join()
obj=bpy.context.view_layer.objects.active
for o in [o for o in bpy.context.scene.objects if o.type!='MESH']: bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.00005); bpy.ops.mesh.delete_loose(); bpy.ops.object.mode_set(mode='OBJECT')
bb=[obj.matrix_world@v.co for v in obj.data.vertices]
lo=[min(v[i] for v in bb) for i in range(3)]; hi=[max(v[i] for v in bb) for i in range(3)]
shift=(-(lo[0]+hi[0])/2,-(lo[1]+hi[1])/2,-lo[2])
for v in obj.data.vertices: v.co.x+=shift[0]; v.co.y+=shift[1]; v.co.z+=shift[2]
def ntris():
    dg=bpy.context.evaluated_depsgraph_get(); e=obj.evaluated_get(dg); me=e.to_mesh(); me.calc_loop_triangles(); n=len(me.loop_triangles); e.to_mesh_clear(); return n
before=ntris()
if a.tris and before>a.tris:
    m=obj.modifiers.new('d','DECIMATE'); m.decimate_type='COLLAPSE'; m.ratio=a.tris/before
    m.use_collapse_triangulate=True
    m.delimit=set(x for x in a.delimit.split(',') if x)
    bpy.ops.object.modifier_apply(modifier=m.name)
for img in bpy.data.images:
    if img.size[0] and max(img.size)>a.tex:
        k=a.tex/max(img.size); img.scale(max(1,int(img.size[0]*k)),max(1,int(img.size[1]*k))); img.pack()
os.makedirs(os.path.dirname(os.path.abspath(a.out)),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=a.out,export_format='GLB',use_selection=False,export_apply=True,export_image_format='WEBP',export_image_quality=a.q)
print('CFPREP',json.dumps({'in':before,'out':ntris(),'bytes':os.path.getsize(a.out)}))
