# Hole Grind: third-party assets

| What | Source | Licence |
| --- | --- | --- |
| three.js r180 (`vendor/three/`: build, GLTFLoader, BufferGeometryUtils) | https://threejs.org | MIT (`vendor/three/LICENSE`) |
| City Kit Suburban 2.0 (houses, small and large trees, planter) | Kenney, https://kenney.nl/assets/city-kit-suburban | CC0 1.0 |
| City Kit Commercial 2.1 (buildings, skyscrapers) | Kenney, https://kenney.nl/assets/city-kit-commercial | CC0 1.0 |
| City Kit Roads (construction cone and barrier, street lamp) | Kenney, https://kenney.nl/assets/city-kit-roads | CC0 1.0 |
| Car Kit (sedan, taxi, SUV, hatchback, police, van, delivery, truck, ambulance, fire truck, garbage truck, cone) | Kenney, https://kenney.nl/assets/car-kit | CC0 1.0 |
| Nature Kit (oak, default, detailed and round pine trees) | Kenney, https://kenney.nl/assets/nature-kit | CC0 1.0 |
| Platformer Kit (gold coin) | Kenney, https://kenney.nl/assets/platformer-kit | CC0 1.0 |
| Furniture Kit (bench) | Kenney, https://kenney.nl/assets/furniture-kit | CC0 1.0 |

`models/city.glb` packs those 41 models: each was run through `tools/blender/optimize_glb.py`
(3,000-triangle budget, textures 512 px or less; the models are 30 to 3,000 triangles, so no LODs
were needed), then packed into one file with shared textures and quantized with gltfpack
(KHR_mesh_quantization, read natively by three.js). The ground, road markings and sky are drawn
in code. Kenney asks for no credit; thank you, Kenney.
