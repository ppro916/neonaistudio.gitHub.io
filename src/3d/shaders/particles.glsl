// Ambient neural field point sprites (positions are written on the CPU/typed array each frame).
// uv.x = seed, uv.y = base size
//#vertex
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 view;
uniform mat4 worldViewProjection;
uniform float scale;
varying float vSeed;
varying float vDepth;
void main() {
  vec4 vp = view * world * vec4(position, 1.0);
  float z = max(vp.z, 0.6);
  gl_PointSize = clamp(uv.y * scale / z, 1.0, 14.0);
  vSeed = uv.x;
  vDepth = z;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
//#fragment
precision highp float;
varying float vSeed;
varying float vDepth;
uniform float time;
uniform float alpha;
uniform float boost;
uniform float fogDensity;
uniform vec3 colA;
uniform vec3 colB;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.0, r);
  a *= a;
  float tw = 0.65 + 0.35 * sin(time * (0.6 + vSeed * 1.6) + vSeed * 40.0);
  float fog = exp(-pow(fogDensity * vDepth, 2.0));
  vec3 col = mix(colA, colB, step(0.78, vSeed)) ;
  col = mix(col, vec3(1.0), step(0.96, vSeed) * 0.5);
  gl_FragColor = vec4(col, clamp(a * alpha * tw * (0.55 + boost) * fog, 0.0, 1.0));
}
