"""Render a GLB as catalogue key art (960x600 by default) under a real HDRI sky.

    blender --background --factory-startup --python tools/blender/render_keyart.py -- \
        --in hero.glb --hdri sky.hdr --out assets/thumbs/2x/game.png [--size 960x600] [--angle 35]

The camera frames the model's bounding box from a three-quarter angle, the HDRI
lights it (Poly Haven skies are CC0), and a shadow catcher grounds it. The default
engine is Cycles on the CPU with the built-in denoiser, which runs anywhere (servers
and CI have no GPU or EGL); pass --engine eevee on a desktop for a faster preview.
Feed the PNG to tools/keyart.py import to finish the tile with the game's title.
"""
import argparse
import math
import os
import sys

import bpy  # type: ignore
from mathutils import Vector  # type: ignore


def args():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--hdri', default='')
    ap.add_argument('--size', default='960x600')
    ap.add_argument('--angle', type=float, default=35, help='camera elevation in degrees')
    ap.add_argument('--turn', type=float, default=35, help='camera heading in degrees')
    ap.add_argument('--strength', type=float, default=1.2)
    ap.add_argument('--engine', choices=['cycles', 'eevee'], default='cycles')
    ap.add_argument('--samples', type=int, default=48)
    return ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])


def main():
    a = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    w, h = (int(x) for x in a.size.split('x'))
    sc.render.resolution_x, sc.render.resolution_y = w, h
    if a.engine == 'cycles':
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = a.samples
        sc.cycles.use_denoising = True
    else:
        engines = bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys()
        sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
    sc.view_settings.look = 'None'
    bpy.ops.import_scene.gltf(filepath=a.src)
    objs = [o for o in sc.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre, radius = (lo + hi) / 2, max((hi - lo).length / 2, 0.01)
    # world: HDRI or a soft gradient sky
    world = bpy.data.worlds.new('sky'); sc.world = world; world.use_nodes = True
    nt = world.node_tree; bg = nt.nodes['Background']; bg.inputs['Strength'].default_value = a.strength
    if a.hdri and os.path.exists(a.hdri):
        env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(a.hdri)
        nt.links.new(env.outputs['Color'], bg.inputs['Color'])
    else:   # no HDRI: a soft light-blue studio backdrop (a physical sky is black below the horizon)
        bg.inputs['Color'].default_value = (0.78, 0.83, 0.9, 1.0)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 3; sun.rotation_euler = (math.radians(50), 0, math.radians(a.turn + 60))
    # ground that only catches shadows
    bpy.ops.mesh.primitive_plane_add(size=radius * 40, location=(centre.x, centre.y, lo.z))
    ground = sc.objects[-1] if sc.objects[-1].type == 'MESH' else bpy.context.active_object
    ground.is_shadow_catcher = True
    # camera on a three-quarter view, backed off until every corner of the bounding box fits with a 10% margin
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50
    cam.data.sensor_fit = 'HORIZONTAL'
    tan_x = math.tan(cam.data.angle_x / 2) * 0.9
    tan_y = tan_x * h / w
    el, hd = math.radians(a.angle), math.radians(a.turn)
    toward = Vector((math.sin(hd) * math.cos(el), -math.cos(hd) * math.cos(el), math.sin(el)))   # centre -> camera
    right = Vector((0, 0, 1)).cross(toward).normalized()
    up = toward.cross(right).normalized()
    dist = 0.0
    for p in pts:
        v = p - centre
        x, y, z = v.dot(right), v.dot(up), v.dot(toward)
        dist = max(dist, z + abs(x) / tan_x, z + abs(y) / tan_y)
    dist = max(dist, radius * 0.5)
    cam.location = centre + toward * dist
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.clip_start = max(0.01, dist * 0.01)
    cam.data.clip_end = dist * 20 + radius * 40
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    sc.render.filepath = a.out
    bpy.ops.render.render(write_still=True)
    print('RENDER_KEYART', a.out)


main()
