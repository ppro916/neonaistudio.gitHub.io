// Neural filaments: static spline lines, light pulses travel along them.
// uv.x = parameter along the filament (0 core -> 1 tip), uv.y = per-filament seed.
//#vertex
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform float time;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vec3 p = position;
  float k = uv.x * 0.05;
  p += vec3(sin(time * 0.6 + uv.y * 40.0 + uv.x * 6.0),
            cos(time * 0.5 + uv.y * 31.0 + uv.x * 5.0),
            sin(time * 0.7 + uv.y * 23.0 + uv.x * 7.0)) * k;
  vUv = uv;
  vWorld = (world * vec4(p, 1.0)).xyz;
  gl_Position = worldViewProjection * vec4(p, 1.0);
}
//#fragment
precision highp float;
varying vec2 vUv;
varying vec3 vWorld;
uniform float time;
uniform float bright;
uniform float alpha;
uniform float fogDensity;
uniform vec3 cameraPosition;
uniform vec3 colA;
uniform vec3 colB;
void main() {
  float speed = 0.22 + 0.38 * fract(vUv.y * 7.31);
  float head = fract(time * speed + vUv.y);
  float d = fract(vUv.x - head + 1.0);
  float pulse = exp(-d * 9.0) * step(0.0, 1.0 - d);
  float base = 0.16 * (1.0 - vUv.x * 0.7);
  float a = (base + pulse * 1.15) * (1.0 - vUv.x * 0.55) * bright * alpha;
  float fog = exp(-pow(fogDensity * distance(vWorld, cameraPosition), 2.0));
  vec3 col = mix(colA, colB, vUv.x) + vec3(0.5) * pulse * 0.4;
  gl_FragColor = vec4(col, clamp(a * fog, 0.0, 1.0));
}
