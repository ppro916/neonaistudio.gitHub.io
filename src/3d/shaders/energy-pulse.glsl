// Energy core + volumetric atmosphere (mode 1: inverted fresnel sphere).
//#vertex
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vPos = position;
  vWorld = (world * vec4(position, 1.0)).xyz;
  vNormal = normalize(mat3(world) * normal);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
//#fragment
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vPos;
uniform float time;
uniform float pulse;      // accumulated pulse phase (speeds up on hover)
uniform float energy;     // 0..1.5 overall intensity
uniform float mode;
uniform float alpha;
uniform vec3 cameraPosition;
uniform vec3 coreWorld;
uniform vec3 colA;
uniform vec3 colB;
uniform vec3 colC;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  if (mode < 0.5) {
    vec3 N = normalize(vNormal);
    float fres = pow(1.0 - abs(dot(N, V)), 2.0);
    float n = noise(vPos * 2.4 + vec3(0.0, pulse * 0.35, pulse * 0.2));
    n = 0.6 * n + 0.4 * noise(vPos * 5.1 - vec3(pulse * 0.5));
    float beat = 0.82 + 0.18 * sin(pulse * 2.0);
    vec3 col = mix(colB, colA, smoothstep(0.25, 0.85, n)) * (0.28 + 0.8 * n);
    col += colC * fres * 0.18 + colA * pow(fres, 2.0) * 0.45;
    col *= vec3(0.55, 0.95, 1.1);
    gl_FragColor = vec4(col * beat * energy, alpha);
  } else {
    vec3 L = normalize(coreWorld - cameraPosition);
    vec3 R = normalize(vWorld - cameraPosition);
    float g = max(dot(R, L), 0.0);
    float a = pow(g, 34.0) * 0.20 + pow(g, 6.0) * 0.012 + 0.003;
    vec3 col = mix(colC, colB, clamp(g * 1.3, 0.0, 1.0));
    col = mix(col, colA, pow(g, 12.0) * 0.5);
    gl_FragColor = vec4(col, a * alpha);
  }
}
