"""Turn a downloaded or generated model into a web-ready GLB with LODs.

    blender --background --factory-startup --python tools/blender/optimize_glb.py -- \
        --in model.glb --out Game/models/prop.glb --tris 6000 --tex 1024 --lods 2

What it does, in order:
  1. Imports GLB, glTF, FBX or OBJ into an empty scene.
  2. Applies transforms, joins the parts, welds duplicate vertices and deletes loose
     geometry, so a model from Meshy, Tripo, Sketchfab or a kit comes out clean.
  3. Optionally scales it to a real-world height (--height, in metres) and sits it on the
     ground with its pivot at the bottom centre, which is what game code expects.
  4. Decimates to the triangle budget (--tris) if it is over it.
  5. Shrinks every texture to at most --tex pixels on the long side.
  6. Exports <out>, plus <out>_lod1.glb, <out>_lod2.glb... each with half the triangles and
     half the texture size of the one before.
  7. Prints a one-line JSON report (triangles, textures, bytes) for the asset's LICENSES row.

Rigged models (anything with an armature, such as Quaternius characters) keep their skeleton,
skin weights and animations: steps 2-4 and LODs are skipped for them (joining, welding and
decimating would break the skinning), so only the textures are shrunk before export. Use
gltfpack afterwards if the mesh itself is too heavy.

No add-ons or pip packages: only what ships with Blender 4.2 and later.
"""
import argparse
import json
import os
import sys

import bpy  # type: ignore


def args():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--tris', type=int, default=8000, help='triangle budget for LOD0')
    ap.add_argument('--tex', type=int, default=1024, help='max texture size in pixels')
    ap.add_argument('--lods', type=int, default=0, help='extra LOD files, each with half the triangles')
    ap.add_argument('--height', type=float, default=0, help='scale so the model is this tall (metres)')
    ap.add_argument('--draco', action='store_true', help='Draco-compress meshes (the game then needs DRACOLoader)')
    ap.add_argument('--webp', action='store_true', help='WebP textures (three.js reads them; check your engine first)')
    return ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])


def import_any(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit('unsupported format: ' + ext)


def tris(objs):
    n = 0
    for o in objs:
        me = o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
        me.calc_loop_triangles()
        n += len(me.loop_triangles)
        o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
    return n


def shrink_textures(limit):
    shrunk = []
    for img in bpy.data.images:
        if img.size[0] and max(img.size) > limit:
            k = limit / max(img.size)
            img.scale(max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k)))
            img.pack()
            shrunk.append(img.name)
    return shrunk


def main():
    a = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    import_any(a.src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise SystemExit('no mesh in ' + a.src)
    rigged = any(o.type == 'ARMATURE' for o in bpy.context.scene.objects)
    if rigged:   # keep skeleton, skin and animations: textures only
        shrunk = shrink_textures(a.tex)
        os.makedirs(os.path.dirname(os.path.abspath(a.out)) or '.', exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=False, export_animations=True,
                                  export_skins=True, export_draco_mesh_compression_enable=a.draco,
                                  export_image_format='WEBP' if a.webp else 'AUTO')
        n = tris(meshes)
        print('OPTIMIZE_GLB ' + json.dumps({'src': a.src, 'rigged': True, 'actions': len(bpy.data.actions), 'tris_in': n,
                                            'textures_shrunk': shrunk, 'outputs': [{'file': a.out, 'tris': n, 'bytes': os.path.getsize(a.out)}],
                                            'note': 'rigged: not joined, welded or decimated; LODs skipped'}))
        return
    # Kit models often reuse one mesh on several objects (a bed's two pillows): give each its own copy,
    # or applying transforms refuses to run on multi-user data.
    for o in meshes:
        if o.data.users > 1:
            o.data = o.data.copy()
    # 2. clean and join
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    for o in [o for o in bpy.context.scene.objects if o.type != 'MESH']:
        bpy.data.objects.remove(o, do_unlink=True)   # empties and cameras left by importers
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode='OBJECT')
    # 3. real-world size, pivot at the bottom centre
    bb = [obj.matrix_world @ v.co for v in obj.data.vertices]
    lo = [min(v[i] for v in bb) for i in range(3)]
    hi = [max(v[i] for v in bb) for i in range(3)]
    if a.height > 0 and hi[2] - lo[2] > 0:
        s = a.height / (hi[2] - lo[2])
        obj.scale = (s, s, s)
        bpy.ops.object.transform_apply(scale=True)
        bb = [obj.matrix_world @ v.co for v in obj.data.vertices]
        lo = [min(v[i] for v in bb) for i in range(3)]
        hi = [max(v[i] for v in bb) for i in range(3)]
    shift = (-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])
    for v in obj.data.vertices:
        v.co.x += shift[0]; v.co.y += shift[1]; v.co.z += shift[2]
    obj.location = (0, 0, 0)
    # 4. triangle budget
    before = tris([obj])
    if before > a.tris:
        m = obj.modifiers.new('budget', 'DECIMATE')
        m.ratio = a.tris / before
        bpy.ops.object.modifier_apply(modifier=m.name)
    # 5. textures
    shrunk = shrink_textures(a.tex)
    # 6. export LOD0..n
    outs = []
    base, _ = os.path.splitext(a.out)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    for lod in range(a.lods + 1):
        if lod:
            m = obj.modifiers.new('lod', 'DECIMATE')
            m.ratio = 0.5
            bpy.ops.object.modifier_apply(modifier=m.name)
            for img in bpy.data.images:   # far away, half the texels are plenty
                if img.size[0] > 64:
                    img.scale(max(1, img.size[0] // 2), max(1, img.size[1] // 2)); img.pack()
        path = a.out if lod == 0 else '%s_lod%d.glb' % (base, lod)
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=False, export_apply=True,
                                  export_draco_mesh_compression_enable=a.draco, export_image_format='WEBP' if a.webp else 'AUTO')
        outs.append({'file': path, 'tris': tris([obj]), 'bytes': os.path.getsize(path)})
    print('OPTIMIZE_GLB ' + json.dumps({'src': a.src, 'tris_in': before, 'textures_shrunk': shrunk, 'outputs': outs}))


main()
