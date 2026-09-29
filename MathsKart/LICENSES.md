# Maths Kart GP: third-party assets

| What | Source | Licence |
| --- | --- | --- |
| three.js r180 (`vendor/three/`: build, GLTFLoader, BufferGeometryUtils, meshopt decoder) | https://threejs.org, https://github.com/zeux/meshoptimizer | MIT (`vendor/three/LICENSE`) |
| Car Kit: karts oobi, oodi, ooli, oopi, oozi (body, driver and wheel split so the wheels spin) | Kenney, https://kenney.nl/assets/car-kit | CC0 1.0 |
| Racing Kit 2.0: start gantry, grandstands, banner towers, flags, billboard, tents, light posts | Kenney, https://kenney.nl/assets/racing-kit | CC0 1.0 |
| Nature Kit: palms, oak, cactus, rocks, cliff, bushes, flowers, grass | Kenney, https://kenney.nl/assets/nature-kit | CC0 1.0 |
| Asphalt 026 C (road), Ground 097 (canyon sand) | ambientCG, https://ambientcg.com | CC0 1.0 |
| Grass 001 (speedway grass) | ambientCG, https://ambientcg.com | CC0 1.0 |
| Lilita One, Fredoka (`fonts/`) | Google Fonts | SIL Open Font License 1.1 |

`models/kart.glb` packs the models above: each was run through `tools/blender/optimize_glb.py`
(3,000-triangle budget, textures 512 px or less; all are under budget so no LODs), packed into one
file with shared textures and materials, then meshopt-compressed and quantized with gltfpack.
Textures in `textures/` were downscaled to 512 px. The road markings, kerbs, maths-symbol wall,
boost pads, balloons, item boxes, sky, hills and clouds are drawn in code. Kenney and ambientCG ask
for no credit; thank you both.
