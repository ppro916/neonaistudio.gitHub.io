// Holographic film. One shader, several "modes" (uniform `mode`):
// 0 = ring / torus film, 1 = plan panel, 2 = glyph data ribbon, 3 = console arc, 4 = radar disc
//#vertex
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec4 wp = world * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(world) * normal);
  vUv = uv;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
//#fragment
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
uniform float time;
uniform vec3 cameraPosition;
uniform float alpha;
uniform float mode;
uniform float scan;
uniform float fogDensity;
uniform vec3 colA;
uniform vec3 colB;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vNormal);
  float fres = pow(1.0 - abs(dot(N, V)), 2.2);
  float d = distance(vWorld, cameraPosition);
  float fog = exp(-pow(fogDensity * d, 2.0));
  vec3 col = mix(colA, colB, fres);
  float a = 0.0;

  if (mode < 0.5) {
    float bands = 0.5 + 0.5 * sin(vUv.x * 90.0 - time * 1.4);
    float flick = 0.9 + 0.1 * hash(vec2(floor(vUv.x * 40.0), floor(time * 6.0)));
    a = (0.18 + 0.82 * fres) * (0.55 + 0.45 * bands) * flick;
  } else if (mode < 1.5) {
    vec2 uv = vUv;
    float edge = 1.0 - smoothstep(0.0, 0.012, min(min(uv.x, 1.0 - uv.x) * 0.72, min(uv.y, 1.0 - uv.y)));
    float grid = max(step(0.965, fract(uv.x * 22.0)), step(0.965, fract(uv.y * 30.0)));
    float glow = 0.06 + 0.10 * (1.0 - length(uv - 0.5) * 1.4);
    float sweep = exp(-pow((uv.y - scan) * 16.0, 2.0));
    a = glow + edge * 0.85 + grid * 0.05 + sweep * 0.32;
    col = mix(colA, colB, clamp(uv.y * 0.8 + fres, 0.0, 1.0));
  } else if (mode < 2.5) {
    float rows = 64.0;
    float yy = vUv.y * rows - time * 3.2;
    vec2 cell = vec2(floor(vUv.x * 14.0), floor(yy));
    vec2 f = fract(vec2(vUv.x * 14.0, yy));
    float on = step(0.7, hash(cell));
    float glyph = smoothstep(0.38, 0.45, f.x) * smoothstep(0.62, 0.55, f.x) * step(0.12, f.y) * step(f.y, 0.82) * step(0.3, hash(cell + 7.0));
    float fade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    a = on * glyph * fade * 0.5;
  } else if (mode < 3.5) {
    float dash = 0.5 + 0.5 * sin(vUv.x * 140.0 - time * 2.0);
    a = (0.22 + 0.78 * fres) * (0.45 + 0.55 * dash);
  } else {
    vec2 q = (vUv - 0.5) * 2.0;
    float r = length(q);
    float ang = atan(q.y, q.x);
    float rings = max(smoothstep(0.012, 0.0, abs(r - 0.34)), max(smoothstep(0.012, 0.0, abs(r - 0.67)), smoothstep(0.02, 0.0, abs(r - 0.985))));
    float spokes = smoothstep(0.012, 0.0, abs(fract(ang / 0.5236 + 0.5) - 0.5) * r) * step(r, 0.985) * 0.5;
    float sw = fract((ang - time * 0.9) / 6.2831853);
    float sweep = pow(1.0 - sw, 5.0) * step(r, 0.985);
    float blip = step(0.992, hash(floor(q * 14.0) + floor(time * 0.5))) * sweep * 2.0;
    a = (rings * 0.7 + spokes * 0.35 + sweep * 0.55 + blip) * step(r, 1.0) + (1.0 - smoothstep(0.0, 1.0, r)) * 0.05;
    col = mix(colA, colB, r * 0.5);
  }
  gl_FragColor = vec4(col, clamp(a * alpha * fog, 0.0, 1.0));
}
