import bpy, sys, math, mathutils
a=sys.argv[sys.argv.index('--')+1:]; src,out=a[0],a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
mn=mathutils.Vector((1e9,)*3); mx=mathutils.Vector((-1e9,)*3)
for o in objs:
    for c in o.bound_box:
        w=o.matrix_world@mathutils.Vector(c); mn=mathutils.Vector((min(mn[i],w[i]) for i in range(3))); mx=mathutils.Vector((max(mx[i],w[i]) for i in range(3)))
ctr=(mn+mx)/2; h=mx.z-mn.z
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=h*1.15
co=bpy.data.objects.new('c',cam); bpy.context.scene.collection.objects.link(co); bpy.context.scene.camera=co
co.location=(ctr.x, ctr.y-10, ctr.z); co.rotation_euler=(math.radians(90),0,0)
# front is -Y or +Y depending on export; render both sides is overkill
sc=bpy.context.scene; sc.render.engine='BLENDER_WORKBENCH'; sc.display.shading.light='STUDIO'; sc.display.shading.color_type='TEXTURE'
sc.render.resolution_x=360; sc.render.resolution_y=480; sc.render.filepath=out; sc.render.film_transparent=False
bpy.data.worlds.new('w'); sc.world=bpy.data.worlds['w']; sc.world.color=(0.6,0.7,0.85)
bpy.ops.render.render(write_still=True)
