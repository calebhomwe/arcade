# Blender asset pipeline

Every 3D upgrade on the arcade goes through Blender, so the models games load are
clean, sized in metres, inside a triangle budget, and licensed. The standard
(`qa/standard/STANDARD.md`, section 6) points here.

## Headless scripts (any machine, including CI)

Blender 4.2 or later; no add-ons or pip packages.

| Script | What it does |
| ------ | ------------ |
| `optimize_glb.py` | Imports GLB, glTF, FBX or OBJ. Welds and cleans the mesh, sets real-world height and a bottom-centre pivot, decimates to a triangle budget, and shrinks textures. Writes the GLB plus LOD files, each with half the triangles and half the texture size. Prints a JSON report. |
| `render_keyart.py` | Renders a GLB as 960x600 catalogue key art under an HDRI sky, with a shadow catcher and a three-quarter camera. The default engine is Cycles on the CPU (works without a GPU); pass `--engine eevee` on a desktop. |

```sh
blender --background --factory-startup --python tools/blender/optimize_glb.py -- \
    --in downloads/barn.fbx --out KingdomDefense/models/barn.glb --tris 6000 --tex 1024 --lods 2 --height 7
blender --background --factory-startup --python tools/blender/render_keyart.py -- \
    --in KingdomDefense/models/barn.glb --hdri downloads/sky.hdr --out /tmp/barn.png
python3 tools/keyart.py import ...   # finish the tile with the game's title
```

Budgets that keep a web game at 60 fps on desktop and 30 on a mid phone:

| Asset | LOD0 triangles | Texture |
| ----- | -------------- | ------- |
| Hero character or vehicle | 8,000 to 15,000 | 1024 to 2048 |
| Building | 3,000 to 8,000 | 1024 |
| Prop | 300 to 3,000 | 256 to 512 |
| Whole visible scene | 150,000 to 300,000 | |

## Live modelling with Blender MCP (Caleb's PC)

`.mcp.json` in this repo registers the `blender` MCP server
([ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp)). With it, Claude Code
can build and edit a scene in a running Blender while you watch.

1. Install Blender 4.2 or later, and `uv` (`pip install uv`, or see astral.sh/uv).
2. Download `addon.py` from the blender-mcp repository. In Blender, go to
   Edit > Preferences > Add-ons > Install from Disk, and enable "Interface: Blender MCP".
3. In the 3D view press N, open the BlenderMCP tab, and press **Connect to MCP server**.
4. Restart Claude Code in this repo; `/mcp` should list `blender`.
5. Ask for what you want, for example "model a low-poly lighthouse, 12 m tall, for Tidebreak".
   Save the result as a GLB, then run `optimize_glb.py` on it before a game loads it.

The MCP server only works on a machine with Blender open. Cloud sessions use the
headless scripts above.

## Sources, in order of preference

1. Poly Haven (models, textures, HDRIs): CC0.
2. ambientCG (PBR textures): CC0.
3. Kenney and Quaternius (kits and characters): CC0.
4. Meshy (text or image to 3D), when the account has credits. Check the output for
   AI artefacts before use.

Write each asset's source, author and licence into the game's `LICENSES.md`.
