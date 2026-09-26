export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return {url: new URL('../../SummitLine/vendor/three/build/three.module.min.js', import.meta.url).href, shortCircuit: true};
  return nextResolve(specifier, context);
}
