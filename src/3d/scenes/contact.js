/**
 * Command-center finale for Quote / Contact: three console arcs, a radar sweep disc and an equaliser of
 * status bars. Lazily initialised; fades in at stage 3.4-4.
 * @module 3d/scenes/contact
 */
import * as holoSrc from "../shaders/holographic.glsl.js";
import { shaderMat } from "../materials.js";
import { CONSOLE, arcPoint } from "./layout.js";

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let S = null;

/** @param {object} gl @param {object} ctx */
export function init(gl, ctx) {
  const { B, scene, col } = gl;
  S = { arcs: [], bars: null };
  const holo = (mode, colA, colB) => {
    const mt = shaderMat(gl, "nexusHolo", holoSrc, { attributes: ["position", "normal", "uv"], uniforms: ["alpha", "mode", "scan", "colA", "colB"] });
    mt.setFloat("mode", mode); mt.setFloat("alpha", 0); mt.setFloat("scan", 0); mt.setColor3("colA", colA); mt.setColor3("colB", colB);
    return mt;
  };
  for (let j = 0; j < 3; j++) {
    const path = []; const tmp = [0, 0, 0];
    for (let i = 0; i < 48; i++) { arcPoint(j, i, 48, tmp); path.push(new B.Vector3(tmp[0], tmp[1] - 0.03, tmp[2])); }
    const m = B.MeshBuilder.CreateTube("nexus-arc" + j, { path, radius: 0.025 + 0.012 * j, tessellation: 8 }, scene);
    m.isPickable = false; m.alphaIndex = 2; m.isVisible = false;
    const mt = holo(3, j === 1 ? col.violet : col.cyan, col.blue);
    m.material = mt; S.arcs.push({ m, mt });
  }
  const radar = B.MeshBuilder.CreateDisc("nexus-radar", { radius: 2.0, tessellation: 72 }, scene);
  radar.position.set(...CONSOLE.radar); radar.rotation.x = Math.PI / 2; radar.isPickable = false; radar.alphaIndex = 2; radar.isVisible = false;
  const rm = holo(4, col.cyan, col.blue); radar.material = rm; S.radar = { m: radar, mt: rm };
  const NB = 40;
  const bars = B.MeshBuilder.CreateBox("nexus-bar", { size: 1 }, scene);
  bars.isPickable = false; bars.alwaysSelectAsActiveMesh = true; bars.alphaIndex = 3; bars.isVisible = false;
  const bm = new B.StandardMaterial("nexus-bar-mat", scene);
  bm.disableLighting = true; bm.emissiveColor = col.cyan; bm.alpha = 0; bm.alphaMode = B.Engine.ALPHA_ADD; bm.disableDepthWrite = true; bm.fogEnabled = false;
  bars.material = bm;
  const buf = new Float32Array(NB * 16);
  bars.thinInstanceSetBuffer("matrix", buf, 16, false);
  const pos = []; const tmp = [0, 0, 0];
  for (let i = 0; i < NB; i++) { arcPoint(2, i, NB, tmp); const r = 1.12; pos.push([CONSOLE.c[0] + (tmp[0] - CONSOLE.c[0]) * r, tmp[2] * 0 + CONSOLE.c[1], CONSOLE.c[2] + (tmp[2] - CONSOLE.c[2]) * r]); }
  S.bars = { m: bars, mat: bm, buf, pos, NB };
}

/** @param {object} gl @param {number} dt @param {number} t @param {object} ctx */
export function update(gl, dt, t, ctx) {
  if (!S) return;
  const a = smooth(3.4, 4.0, ctx.state.stage);
  const vis = a > 0.01;
  S.arcs.forEach(r => { r.m.isVisible = vis; r.mt.setFloat("alpha", a * 0.9); });
  S.radar.m.isVisible = vis; S.radar.mt.setFloat("alpha", a);
  const B_ = S.bars; B_.m.isVisible = vis; B_.mat.alpha = a * 0.5;
  if (vis) {
    for (let i = 0; i < B_.NB; i++) {
      const h = 0.12 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.7) * Math.sin(t * 0.37 + i * 0.21)) * a;
      const o = i * 16; B_.buf[o] = 0.055; B_.buf[o + 5] = h; B_.buf[o + 10] = 0.055; B_.buf[o + 15] = 1;
      B_.buf[o + 12] = B_.pos[i][0]; B_.buf[o + 13] = B_.pos[i][1] + h / 2; B_.buf[o + 14] = B_.pos[i][2];
    }
    B_.m.thinInstanceBufferUpdated("matrix");
  }
}
export function dispose() { S = null; }
