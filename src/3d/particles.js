/**
 * One persistent neural particle field (point sprites) with slow analytic drift, faint cyan connection
 * lines between near neighbours, cursor repel within 140px, scroll parallax and transition brightening.
 * CPU cost is a single typed-array loop (well under 6ms at 1500 particles).
 * @module 3d/particles
 */
import * as shaderLib from "./shaders/particles.glsl.js";
import { shaderMat } from "./materials.js";

let P = null;
const REPEL_R = 140;

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** @param {object} gl @param {object} ctx */
export function init(gl, ctx) {
  const { B, scene } = gl;
  const n = ctx.tier.particles;
  const rnd = mulberry32(1337);
  const base = new Float32Array(n * 3), cur = new Float32Array(n * 3), off = new Float32Array(n * 3);
  const ph = new Float32Array(n * 3), am = new Float32Array(n * 3), wv = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2), idx = new Uint32Array(n);
  const NC = Math.min(n, 280); // connection subset (dense, centred volume)
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i < NC) { x = (rnd() - 0.5) * 9; y = (rnd() - 0.5) * 6; z = -1 + rnd() * 7; }
    else { x = (rnd() - 0.5) * 22; y = (rnd() - 0.5) * 16; z = -4 + rnd() * 16; }
    base.set([x, y, z], i * 3);
    for (let c = 0; c < 3; c++) { ph[i * 3 + c] = rnd() * 6.283; am[i * 3 + c] = 0.25 + rnd() * 0.5; wv[i * 3 + c] = 0.045 + rnd() * 0.04; }
    uvs[i * 2] = rnd(); uvs[i * 2 + 1] = 3.0 + rnd() * 5.5;
    idx[i] = i;
  }
  const mesh = new B.Mesh("nexus-field", scene);
  const vd = new B.VertexData();
  vd.positions = cur.slice(); vd.indices = Array.from(idx); vd.uvs = uvs;
  vd.applyToMesh(mesh, true);
  mesh.isPickable = false; mesh.alwaysSelectAsActiveMesh = true; mesh.doNotSyncBoundingInfo = true;
  mesh.alphaIndex = 5;
  const mat = shaderMat(gl, "nexusPts", shaderLib, {
    attributes: ["position", "uv"], uniforms: ["scale", "boost", "alpha", "colA", "colB"], fill: B.Material.PointFillMode,
  });
  mat.setFloat("alpha", 0.9);
  mat.setColor3("colA", gl.col.cyan); mat.setColor3("colB", gl.col.blue);
  mesh.material = mat;

  // connection lines
  const MAXSEG = 260;
  const lpos = new Float32Array(MAXSEG * 6);
  const lines = new B.Mesh("nexus-links", scene);
  const lvd = new B.VertexData();
  lvd.positions = lpos.slice();
  lvd.indices = Array.from({ length: MAXSEG * 2 }, (_, i) => i);
  lvd.applyToMesh(lines, true);
  lines.isPickable = false; lines.alwaysSelectAsActiveMesh = true; lines.doNotSyncBoundingInfo = true;
  lines.material = lineMat(gl);
  lines.alphaIndex = 6;
  P = { mesh, mat, lines, cur, base, off, ph, am, wv, n, live: n, NC, lpos, MAXSEG, boost: 0, linkAlpha: 1, tmp: { prevStage: 0 }, linkScratch: 0 };
  gl.particles = P;
}

function lineMat(gl) {
  const { B, scene } = gl;
  const m = new B.StandardMaterial("nexus-link-mat", scene);
  m.disableLighting = true;
  m.emissiveColor = new B.Color3(0, 0.9, 1);
  m.alpha = 0.15;
  m.fogEnabled = false;
  m.alphaMode = B.Engine.ALPHA_ADD;
  m.backFaceCulling = false;
  m.disableDepthWrite = true;
  m.fillMode = B.Material.LineListDrawMode;
  return m;
}

/** Per-frame update. @param {object} gl @param {number} dt @param {number} t @param {object} ctx */
export function update(gl, dt, t, ctx) {
  if (!P) return;
  const st = ctx.state, { cur, base, off, ph, am, wv, live, NC } = P;
  const reduced = ctx.tier.reduced;
  const oy = st.scrollY * 0.00045 * (ctx.tier.reduced ? 0 : 1);
  const tt = reduced ? 0 : t;
  const vm = gl.camera.getViewMatrix(), tm = gl.scene.getTransformMatrix();
  const view = vm.m, vp = (tm ? tm : vm).m;
  const iw = window.innerWidth, ih = window.innerHeight;
  const rx = view[0], ry = view[4], rz = view[8], ux = view[1], uy = view[5], uz = view[9];
  const ptr = st.pointer, active = ptr.inside && !ctx.tier.coarse && !reduced;
  const cx = ptr.x, cy = ptr.y;
  const decay = Math.pow(0.93, dt * 60);
  const R2 = REPEL_R * REPEL_R;
  for (let i = 0; i < live; i++) {
    const j = i * 3;
    const ox = (off[j] *= decay), oyy = (off[j + 1] *= decay), oz = (off[j + 2] *= decay);
    const x = base[j] + Math.sin(tt * wv[j] + ph[j]) * am[j] + ox;
    const y = base[j + 1] + Math.sin(tt * wv[j + 1] + ph[j + 1]) * am[j + 1] + oyy - oy * (0.5 + (i % 5) * 0.25);
    const z = base[j + 2] + Math.sin(tt * wv[j + 2] + ph[j + 2]) * am[j + 2] + oz;
    cur[j] = x; cur[j + 1] = y; cur[j + 2] = z;
    if (active) {
      const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (w > 0.2) {
        const sx = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w * 0.5 + 0.5) * iw;
        const sy = (0.5 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w * 0.5) * ih;
        const dx = sx - cx, dy = sy - cy, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 0.5, f = (1 - d / REPEL_R) * 0.09;
          const px = dx / d * f, py = -dy / d * f;
          off[j] += rx * px + ux * py; off[j + 1] += ry * px + uy * py; off[j + 2] += rz * px + uz * py;
        }
      }
    }
  }
  gl.particles.mesh.updateVerticesData("position", cur, false, false);
  // connections among the dense subset (O(NC^2/2) distance tests, capped segments)
  const L = P.lpos, maxS = P.MAXSEG, nc = Math.min(NC, live), TH = 1.35 * 1.35;
  let seg = 0;
  for (let a = 0; a < nc && seg < maxS; a++) {
    const ja = a * 3;
    for (let b = a + 1; b < nc && seg < maxS; b += 1) {
      const jb = b * 3, dx = cur[ja] - cur[jb];
      if (dx > 1.35 || dx < -1.35) continue;
      const dy = cur[ja + 1] - cur[jb + 1], dz = cur[ja + 2] - cur[jb + 2];
      if (dx * dx + dy * dy + dz * dz < TH) {
        const o = seg * 6;
        L[o] = cur[ja]; L[o + 1] = cur[ja + 1]; L[o + 2] = cur[ja + 2]; L[o + 3] = cur[jb]; L[o + 4] = cur[jb + 1]; L[o + 5] = cur[jb + 2];
        seg++;
      }
    }
  }
  for (let o = seg * 6; o < maxS * 6; o++) L[o] = 0;
  P.lines.updateVerticesData("position", L, false, false);
  P.lines.subMeshes[0].indexCount = seg * 2;
  // brighten on transitions
  const target = Math.min(0.7, st.stageVel * 0.9);
  P.boost += (target - P.boost) * (1 - Math.exp(-dt * 4));
  P.mat.setFloat("boost", P.boost);
  P.mat.setFloat("scale", 7 * gl.dprScale);
  P.lines.material.alpha = 0.15 + P.boost * 0.15;
  P.linkSegs = seg;
}

/** Governor: halve the live particle count. */
export function halve() {
  if (!P) return;
  P.live = Math.max(60, Math.floor(P.live / 2));
  P.mesh.subMeshes[0].indexCount = P.live;
  P.NC = Math.min(P.NC, P.live);
}
export const stats = () => P ? { live: P.live, links: P.linkSegs || 0 } : null;
export function dispose() { P = null; }
