/**
 * "Holographic Plan Matrix" backdrop: two floating glass panels tilted ~6deg on X, a scanline sweep
 * roughly every 8s and a 4% neural grid. Lazily initialised (the panels only fade in at stage 2.5-3.2).
 * @module 3d/scenes/pricing
 */
import * as holoSrc from "../shaders/holographic.glsl.js";
import { shaderMat } from "../materials.js";
import { PANEL } from "./layout.js";

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let S = null;

/** @param {object} gl @param {object} ctx */
export function init(gl, ctx) {
  const { B, scene, col } = gl;
  const root = new B.TransformNode("nexus-panels", scene);
  S = { root, items: [] };
  PANEL.xs.forEach((x, i) => {
    const m = B.MeshBuilder.CreatePlane("nexus-panel" + i, { width: PANEL.w, height: PANEL.h }, scene);
    m.parent = root; m.position.set(x, PANEL.y, PANEL.z); m.rotation.x = PANEL.tilt; m.isPickable = false; m.alphaIndex = 2;
    const mt = shaderMat(gl, "nexusHolo", holoSrc, { attributes: ["position", "normal", "uv"], uniforms: ["alpha", "mode", "scan", "colA", "colB"] });
    mt.setFloat("mode", 1); mt.setFloat("alpha", 0); mt.setFloat("scan", 0);
    mt.setColor3("colA", i === 1 ? col.violet : col.cyan); mt.setColor3("colB", col.blue);
    m.material = mt; m.isVisible = false;
    S.items.push({ m, mt, i });
  });
}

/** @param {object} gl @param {number} dt @param {number} t @param {object} ctx */
export function update(gl, dt, t, ctx) {
  if (!S) return;
  const s = ctx.state.stage;
  const a = smooth(2.65, 3.25, s) * (1 - smooth(3.5, 4.0, s));
  S.root.position.y = Math.sin(t * 0.5) * 0.06;
  for (const it of S.items) {
    it.m.isVisible = a > 0.01;
    if (a <= 0.01) continue;
    it.mt.setFloat("alpha", a);
    it.mt.setFloat("scan", (((t + it.i * 1.6) / 8) % 1) * 1.5 - 0.25); // one sweep / ~8s
  }
}
export function dispose() { S = null; }
