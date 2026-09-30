import bpy, sys, os
argv = sys.argv[sys.argv.index('--')+1:]
src, out = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
arm = [o for o in bpy.context.scene.objects if o.type=='ARMATURE'][0]
arm.animation_data_create()
acts = list(bpy.data.actions)
arm.animation_data.action = None
for a in acts:
    name = a.name.split('|')[-1]
    a.name = name
    tr = arm.animation_data.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, int(a.frame_range[0]), a)
    st.name = name
    print('ACTION', name, a.frame_range[:])
for m in bpy.data.materials:
    m.diffuse_color[3]=1.0
    try: m.blend_method='OPAQUE'
    except Exception: pass
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':
                n.inputs['Alpha'].default_value=1.0
                n.inputs['Metallic'].default_value=0.0
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_apply=False)
