// Scene assembly: renderer settings, lights, sky, terrain, forest, props.
import * as THREE from 'three';
import { installFog, makeFog, makeSkyDome, loadEnvironment, SUN_DIR, ENV_ROT_Y } from './sky.js';
import { makeSnowMaterial, buildRibbon, buildMassif, buildPanorama } from './terrain.js';
import { Forest } from './trees.js';
import { buildProps } from './props.js';

export class World {
  constructor(renderer, quality) {
    this.renderer = renderer;
    this.q = quality;
    this.scene = new THREE.Scene();
    installFog();
  }

  async build(assets, onStep) {
    const { scene, q } = this;
    scene.fog = makeFog();
    scene.environment = await loadEnvironment(this.renderer, 'assets/hdri/horn-koppe_snow_1k.hdr');
    scene.environmentRotation.y = ENV_ROT_Y;
    scene.environmentIntensity = 0.55;
    scene.add(makeSkyDome(assets.sky));
    onStep && onStep('light');

    // sun
    const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
    sun.position.copy(SUN_DIR).multiplyScalar(200);
    sun.castShadow = q.shadows > 0;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(q.shadows, q.shadows);
      const c = sun.shadow.camera;
      c.left = -38; c.right = 38; c.top = 38; c.bottom = -38; c.near = 10; c.far = 420;
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 3;
    }
    scene.add(sun); scene.add(sun.target);
    this.sun = sun;

    const snowMat = makeSnowMaterial(assets, q, 'ribbon');
    const farMat = makeSnowMaterial(assets, q, 'massif');
    this.snowMat = snowMat; this.farMat = farMat;
    this.ribbon = buildRibbon(q, snowMat); scene.add(this.ribbon);
    onStep && onStep('ribbon');
    this.massif = buildMassif(q, farMat); scene.add(this.massif);
    this.panorama = buildPanorama(farMat); scene.add(this.panorama);
    onStep && onStep('massif');

    this.forest = new Forest(assets, assets.treeMeta, q).populate();
    scene.add(this.forest.group);
    onStep && onStep('forest');

    this.props = buildProps(scene, assets, q);
    onStep && onStep('props');
  }

  // keep the shadow frustum centred on the focus point
  follow(p) {
    const s = this.sun;
    s.target.position.copy(p);
    s.position.copy(p).addScaledVector(SUN_DIR, 200);
    s.target.updateMatrixWorld();
  }
}

