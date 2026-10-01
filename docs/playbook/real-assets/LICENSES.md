# Licences for `real-assets/`

Everything here is CC0 1.0 (public domain dedication, https://creativecommons.org/publicdomain/zero/1.0/): no attribution is required, credit is given anyway.
Nothing in this folder is AI-generated, and none of it comes from the project's Meshy models.

## Textures (`tex/*.webp`, from ambientCG, CC0)

Downloaded as the 1K-JPG packs from https://ambientcg.com, colour and NormalGL maps only, resized to 512 px and saved as WebP (quality 78 to 85). Total 0.8 MB.

| File | ambientCG asset | Use in the demo |
|---|---|---|
| `grass_c.webp`, `grass_n.webp` | [Grass001](https://ambientcg.com/a/Grass001) | main grass, terrain normal map |
| `dirt_c.webp` | [Ground037](https://ambientcg.com/a/Ground037) | patchy meadow variation (a mossy ground, not dirt) |
| `soil_c.webp`, `soil_n.webp` | [Ground054](https://ambientcg.com/a/Ground054) | paths, beach sand, furrowed crop soil (tinted brown) |
| `paving_c.webp`, `paving_n.webp` | [PavingStones070](https://ambientcg.com/a/PavingStones070) | village lane |
| `rock_c.webp`, `rock_n.webp` | [Rock030](https://ambientcg.com/a/Rock030) | steep slopes and mountains |
| `snow_c.webp` | [Snow006](https://ambientcg.com/a/Snow006) | mountain caps |
| `wood_c.webp`, `wood_n.webp` | [Planks023A](https://ambientcg.com/a/Planks023A) | UI wood plaque |
| `paper_c.webp` | [Paper001](https://ambientcg.com/a/Paper001) | UI parchment cards |

## Models (`models/*.glb`, CC0 kits)

| Files | Kit | Source |
|---|---|---|
| `tree_*`, `plant_*`, `flower_*`, `grass_*`, `rock_*`, `stone_*`, `log_stack`, `crop*`, `fence_*` | Kenney Nature Kit 2.1 | https://kenney.nl/assets/nature-kit (files copied unchanged; they use unlit materials with a teal-green palette, so the demo re-colours them) |
| `house_*` | Kenney City Kit Suburban 2.0 | https://kenney.nl/assets/city-kit-suburban |
| `sky_*`, `lowrise_*` | Kenney City Kit Commercial 2.1 | https://kenney.nl/assets/city-kit-commercial |
| `fan_*` | Kenney Fantasy Town Kit 2.0 | https://kenney.nl/assets/fantasy-town-kit |
| `tractor`, `truck` | Kenney Car Kit 3.1 | https://kenney.nl/assets/car-kit |
| `q_Barn`, `q_SmallBarn`, `q_ChickenCoop`, `q_Well`, `q_Windmill` | LowPoly Farm Buildings by Quaternius | https://quaternius.com (FBX converted to GLB with Blender 4.2.5) |

Kenney and Quaternius GLBs other than the nature kit were compressed with `gltfpack -cc` (meshopt), which the vendored `GLTFLoader` reads through `meshopt_decoder.module.js`. Total 1.2 MB.

## Fonts and icons

Nunito and Fredoka are SIL OFL 1.1, self-hosted in `assets/fonts/` (see the licence file there). All UI icons in `look-real-demo.html` are hand-written inline SVG.
