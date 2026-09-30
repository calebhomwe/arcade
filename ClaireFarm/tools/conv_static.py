import bpy, sys
argv = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=argv[0])
for m in bpy.data.materials:
    m.diffuse_color[3]=1.0
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':
                n.inputs['Alpha'].default_value=1.0; n.inputs['Metallic'].default_value=0.0
for o in bpy.context.scene.objects:
    print('OBJ',o.type,o.name,tuple(round(v,2) for v in o.dimensions),len(o.data.polygons) if o.type=='MESH' else '')
bpy.ops.export_scene.gltf(filepath=argv[1], export_format='GLB', export_animations=False)
