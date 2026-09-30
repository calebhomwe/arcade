const V = new URL('../../vendor/three/', import.meta.url).href;
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: V + 'three.module.min.js', shortCircuit: true };
  if (spec.startsWith('three/addons/')) return { url: V + 'jsm/' + spec.slice(13), shortCircuit: true };
  return next(spec, ctx);
}
