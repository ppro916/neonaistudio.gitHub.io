/**
 * Shared ShaderMaterial factory (additive, depth-write off) + per-frame uniform feeding.
 * @module 3d/materials
 */
const BASE_UNIFORMS = ["world", "view", "worldViewProjection", "time", "cameraPosition", "fogDensity"];

/**
 * Create an additive custom-GLSL material that is registered for automatic time/camera/fog updates.
 * @param {object} gl shared GL context
 * @param {string} name unique shader name
 * @param {{vertex:string,fragment:string}} src
 * @param {{attributes:string[],uniforms?:string[],fill?:number}} opt
 */
export function shaderMat(gl, name, src, opt) {
  const { B, scene } = gl;
  B.Effect.ShadersStore[name + "VertexShader"] = src.vertex;
  B.Effect.ShadersStore[name + "FragmentShader"] = src.fragment;
  const m = new B.ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    attributes: opt.attributes,
    uniforms: BASE_UNIFORMS.concat(opt.uniforms || []),
    needAlphaBlending: true,
  });
  m.backFaceCulling = false;
  m.alphaMode = B.Engine.ALPHA_ADD;
  m.disableDepthWrite = true;
  if (opt.fill !== undefined) m.fillMode = opt.fill;
  m.setFloat("fogDensity", gl.fogDensity);
  gl.mats.push(m);
  return m;
}

/** Feed global uniforms to all shader materials. */
export function feed(gl, t) {
  const cp = gl.camera.position, fd = gl.fogDensity;
  for (let i = 0; i < gl.mats.length; i++) {
    const m = gl.mats[i];
    m.setFloat("time", t);
    m.setVector3("cameraPosition", cp);
    m.setFloat("fogDensity", fd);
  }
}
