/**
 * Hero "AI Core" + the neural node system it fractures into while scrolling:
 *   stage 0   intact core: faceted PBR icosahedral shell over an emissive energy interior, 3 holographic
 *             rings, neural filaments with light-travel pulses, glyph ribbons, orbiting polyhedra,
 *             inverted-fresnel atmosphere.
 *   stage 0-1 shell explodes into facets, core dissolves into 48 neural nodes.
 *   stage 1-2 nodes link into a lattice.   stage 2-3 lattice re-forms as the perimeters of two plan panels.
 *   stage 3-4 nodes reassemble into the command-center arcs.
 * All transitions are continuous functions of scroll stage, nothing pops.
 * @module 3d/scenes/hero
 */
import * as holoSrc from "../shaders/holographic.glsl.js";
import * as filSrc from "../shaders/neural-filament.glsl.js";
import * as engSrc from "../shaders/energy-pulse.glsl.js";
import { shaderMat } from "../materials.js";
import { GRID, NODES, panelPoint, arcPoint } from "./layout.js";

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, k) => a + (b - a) * k;
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

let H = null;

function facetMesh(B, scene) {
  const h = 0.075, pos = [], nor = [], idx = [];
  const V = [0, 1, 2].map(k => { const a = k * 2 * Math.PI / 3; return [Math.cos(a), Math.sin(a)]; });
  const tri = (pts, n) => { const b = pos.length / 3; pts.forEach(p => { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); }); idx.push(b, b + 1, b + 2); };
  tri(V.map(v => [v[0], h / 2, v[1]]), [0, 1, 0]);
  tri(V.slice().reverse().map(v => [v[0], -h / 2, v[1]]), [0, -1, 0]);
  for (let k = 0; k < 3; k++) {
    const a = V[k], b = V[(k + 1) % 3];
    const mx = a[0] + b[0], mz = a[1] + b[1], l = Math.hypot(mx, mz), n = [mx / l, 0, mz / l];
    const base = pos.length / 3;
    [[a[0], h / 2, a[1]], [b[0], h / 2, b[1]], [b[0], -h / 2, b[1]], [a[0], -h / 2, a[1]]].forEach(p => { pos.push(...p); nor.push(...n); });
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const m = new B.Mesh("nexus-facet", scene);
  const vd = new B.VertexData();
  vd.positions = pos; vd.normals = nor; vd.indices = idx;
  vd.applyToMesh(m);
  return m;
}

function lineSet(gl, name, pairs, color) {
  const { B, scene } = gl;
  const buf = new Float32Array(pairs.length * 6);
  const m = new B.Mesh(name, scene);
  const vd = new B.VertexData();
  vd.positions = buf.slice(); vd.indices = Array.from({ length: pairs.length * 2 }, (_, i) => i);
  vd.applyToMesh(m, true);
  m.isPickable = false; m.alwaysSelectAsActiveMesh = true; m.doNotSyncBoundingInfo = true; m.alphaIndex = 4;
  const mat = new B.StandardMaterial(name + "-mat", scene);
  mat.disableLighting = true; mat.emissiveColor = color; mat.fogEnabled = false; mat.alpha = 0.0;
  mat.alphaMode = B.Engine.ALPHA_ADD; mat.disableDepthWrite = true; mat.backFaceCulling = false;
  mat.fillMode = B.Material.LineListDrawMode;
  m.material = mat;
  return { mesh: m, mat, pairs, buf, vis: 0 };
}

/** @param {object} gl @param {object} ctx */
export function init(gl, ctx) {
  const { B, scene, col } = gl;
  const lite = gl.lite, rnd = rng(42);
  const root = new B.TransformNode("nexus-core-root", scene);
  const aim = new B.TransformNode("nexus-aim", scene); aim.parent = root;
  const spin = new B.TransformNode("nexus-spin", scene); spin.parent = aim;
  H = { root, aim, spin, rings: [], t: 0, prevF: -1, pulse: 0, hover: 0, ctx };

  // ---- lights (blue-violet rim + cyan key)
  const key = new B.DirectionalLight("key", new B.Vector3(-0.45, -0.4, 1), scene);
  key.diffuse = col.cyan; key.specular = col.cyan; key.intensity = 1.3;
  const rim = new B.DirectionalLight("rim", new B.Vector3(0.7, 0.35, 0.7), scene);
  rim.diffuse = col.violet; rim.specular = col.violet; rim.intensity = 1.1;
  const hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, -0.3), scene);
  hemi.diffuse = new B.Color3(0.16, 0.25, 0.6); hemi.groundColor = new B.Color3(0.1, 0.05, 0.25); hemi.intensity = 0.55;

  // ---- atmosphere (inverted fresnel sphere)
  const atm = B.MeshBuilder.CreateSphere("nexus-atmo", { diameter: 56, segments: 24, sideOrientation: B.Mesh.BACKSIDE }, scene);
  atm.isPickable = false; atm.alphaIndex = -10; atm.infiniteDistance = true;
  const atmMat = shaderMat(gl, "nexusEnergy", engSrc, { attributes: ["position", "normal"], uniforms: ["pulse", "energy", "mode", "alpha", "coreWorld", "colA", "colB", "colC"] });
  atmMat.setFloat("mode", 1); atmMat.setFloat("alpha", 1); atmMat.setFloat("pulse", 0); atmMat.setFloat("energy", 1);
  atmMat.setVector3("coreWorld", B.Vector3.Zero());
  atmMat.setColor3("colA", col.cyan); atmMat.setColor3("colB", col.blue); atmMat.setColor3("colC", col.violet);
  atm.material = atmMat; atm.parent = null;
  H.atmMat = atmMat;

  // ---- energy core
  const mkEnergy = (name, d, mode) => {
    const m = B.MeshBuilder.CreateSphere(name, { diameter: d, segments: 40 }, scene);
    m.parent = spin; m.isPickable = false; m.alphaIndex = 2;
    const mt = shaderMat(gl, "nexusEnergy", engSrc, { attributes: ["position", "normal"], uniforms: ["pulse", "energy", "mode", "alpha", "coreWorld", "colA", "colB", "colC"] });
    mt.setFloat("mode", mode); mt.setFloat("alpha", 0.9); mt.setFloat("energy", 1); mt.setFloat("pulse", 0);
    mt.setVector3("coreWorld", B.Vector3.Zero());
    mt.setColor3("colA", col.cyan); mt.setColor3("colB", col.blue); mt.setColor3("colC", col.violet);
    m.material = mt;
    return { m, mt };
  };
  H.energy = mkEnergy("nexus-energy", 2.4, 0);
  H.hot = mkEnergy("nexus-hot", 1.0, 0);

  // ---- faceted icosahedral shell (20 thin-instanced prisms)
  const t = (1 + Math.sqrt(5)) / 2;
  const IV = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const IF = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const R = 1.55, k0 = R / Math.hypot(1, t);
  const facets = IF.map(f => {
    const v = f.map(i => IV[i].map(c => c * k0));
    const c = [0, 1, 2].map(a => (v[0][a] + v[1][a] + v[2][a]) / 3);
    const cl = Math.hypot(...c), n = c.map(x => x / cl);
    const ux = v[0].map((x, i) => x - c[i]), rc = Math.hypot(...ux), u = ux.map(x => x / rc);
    const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    const ax = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]; const al = Math.hypot(...ax) || 1;
    return { c, n, u, w, rc, axis: ax.map(x => x / al), spd: 0.8 + rnd() * 1.4, push: 2.2 + rnd() * 2.8 };
  });
  const fm = facetMesh(B, scene);
  fm.parent = spin; fm.isPickable = false; fm.alphaIndex = 4; fm.alwaysSelectAsActiveMesh = true;
  const fbuf = new Float32Array(20 * 16);
  fm.thinInstanceSetBuffer("matrix", fbuf, 16, false);
  const pbr = new B.PBRMetallicRoughnessMaterial("nexus-shell", scene);
  pbr.baseColor = new B.Color3(0.03, 0.07, 0.2); pbr.metallic = 0.85; pbr.roughness = 0.3;
  pbr.emissiveColor = new B.Color3(0.0, 0.08, 0.16);
  pbr.alpha = 0.74; pbr.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHABLEND;
  pbr.backFaceCulling = false; pbr.twoSidedLighting = true; pbr.disableDepthWrite = true;
  pbr.environmentIntensity = 0.42;
  fm.material = pbr;
  H.fm = fm; H.facets = facets; H.fbuf = fbuf; H.pbr = pbr;

  // ---- holographic rings (3)
  const RD = [[3.3, 0.034, 1.25, 0.1], [3.95, 0.026, 0.45, 0.8], [4.65, 0.02, -0.65, -0.35]];
  const SP = [0.16, -0.24, 0.33];
  RD.forEach((d, i) => {
    const piv = new B.TransformNode("ring-piv" + i, scene); piv.parent = aim;
    const m = B.MeshBuilder.CreateTorus("nexus-ring" + i, { diameter: d[0], thickness: d[1] * 2, tessellation: 144 }, scene);
    m.parent = piv; m.rotation.x = d[2]; m.rotation.z = d[3]; m.isPickable = false; m.alphaIndex = 3;
    const mt = shaderMat(gl, "nexusHolo", holoSrc, { attributes: ["position", "normal", "uv"], uniforms: ["alpha", "mode", "scan", "colA", "colB"] });
    mt.setFloat("mode", 0); mt.setFloat("alpha", 0.95); mt.setFloat("scan", 0);
    mt.setColor3("colA", i === 1 ? col.violet : col.cyan); mt.setColor3("colB", col.blue);
    m.material = mt;
    H.rings.push({ piv, m, mt, sp: SP[i], base: [d[2], d[3]] });
  });

  // ---- neural filaments
  {
    const NF = lite ? 26 : 64, SEG = 26;
    const pos = new Float32Array(NF * SEG * 6), uv = new Float32Array(NF * SEG * 4);
    let o = 0, ou = 0;
    for (let f = 0; f < NF; f++) {
      const y = 1 - 2 * (f + 0.5) / NF, r = Math.sqrt(1 - y * y), th = f * 2.39996;
      const dir = [r * Math.cos(th), y, r * Math.sin(th)], L = 3.0 + rnd() * 3.6;
      const rv = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5];
      let pr = [dir[1] * rv[2] - dir[2] * rv[1], dir[2] * rv[0] - dir[0] * rv[2], dir[0] * rv[1] - dir[1] * rv[0]];
      const pl = Math.hypot(...pr) || 1; pr = pr.map(x => x / pl * (rnd() - 0.5) * 2.4);
      const P0 = dir.map(x => x * 1.3), P2 = dir.map((x, i) => x * L + pr[i] * 0.45), P1 = P0.map((x, i) => (x + P2[i]) / 2 + pr[i]);
      const bz = (u, i) => (1 - u) * (1 - u) * P0[i] + 2 * (1 - u) * u * P1[i] + u * u * P2[i];
      const seed = (f + 0.5) / NF;
      for (let s = 0; s < SEG; s++) {
        for (const u of [s / SEG, (s + 1) / SEG]) {
          pos[o++] = bz(u, 0); pos[o++] = bz(u, 1); pos[o++] = bz(u, 2);
          uv[ou++] = u; uv[ou++] = seed;
        }
      }
    }
    const fl = new B.Mesh("nexus-filaments", scene);
    const vd = new B.VertexData();
    vd.positions = pos; vd.uvs = uv; vd.indices = Array.from({ length: NF * SEG * 2 }, (_, i) => i);
    vd.applyToMesh(fl);
    fl.parent = spin; fl.isPickable = false; fl.alphaIndex = 3; fl.alwaysSelectAsActiveMesh = true;
    const mt = shaderMat(gl, "nexusFil", filSrc, { attributes: ["position", "uv"], uniforms: ["bright", "alpha", "colA", "colB"], fill: B.Material.LineListDrawMode });
    mt.setFloat("bright", 1); mt.setFloat("alpha", 1); mt.setColor3("colA", col.cyan); mt.setColor3("colB", col.violet);
    fl.material = mt; H.fil = { m: fl, mt };
  }

  // ---- glyph / scanline ribbons
  H.ribbons = [];
  const nR = lite ? 3 : 6, ribRoot = new B.TransformNode("ribbons", scene); ribRoot.parent = root;
  for (let i = 0; i < nR; i++) {
    const m = B.MeshBuilder.CreatePlane("nexus-ribbon" + i, { width: 0.55, height: 9 }, scene);
    const a = (i / nR) * Math.PI * 2 + 0.4, rad = 3.9 + (i % 3) * 0.9;
    m.parent = ribRoot; m.position.set(Math.cos(a) * rad, 0.2 * (i % 2), Math.sin(a) * rad); m.rotation.y = -a + Math.PI / 2;
    m.isPickable = false; m.alphaIndex = 3;
    const mt = shaderMat(gl, "nexusHolo", holoSrc, { attributes: ["position", "normal", "uv"], uniforms: ["alpha", "mode", "scan", "colA", "colB"] });
    mt.setFloat("mode", 2); mt.setFloat("alpha", 0.9); mt.setFloat("scan", 0); mt.setColor3("colA", col.cyan); mt.setColor3("colB", col.blue);
    m.material = mt; H.ribbons.push({ m, mt });
  }
  H.ribRoot = ribRoot;

  // ---- orbiting polyhedra (thin-instanced octahedra)
  {
    const NP = lite ? 6 : 10;
    const poly = B.MeshBuilder.CreatePolyhedron("nexus-poly", { type: 1, size: 0.11 }, scene);
    poly.parent = root; poly.isPickable = false; poly.alwaysSelectAsActiveMesh = true; poly.alphaIndex = 3;
    const pm = new B.PBRMetallicRoughnessMaterial("nexus-poly-mat", scene);
    pm.baseColor = new B.Color3(0.06, 0.14, 0.35); pm.metallic = 0.95; pm.roughness = 0.22; pm.emissiveColor = new B.Color3(0, 0.08, 0.14);
    poly.material = pm;
    const buf = new Float32Array(NP * 16);
    poly.thinInstanceSetBuffer("matrix", buf, 16, false);
    const orb = Array.from({ length: NP }, (_, i) => ({ r: 2.6 + rnd() * 3.0, sp: (0.12 + rnd() * 0.22) * (i % 2 ? 1 : -1), ph: rnd() * 6.28, inc: (rnd() - 0.5) * 1.6, yaw: rnd() * 6.28, sz: 0.7 + rnd() * 1.3, tm: [0.3 + rnd(), 0.3 + rnd()] }));
    H.poly = { m: poly, buf, orb, q: new B.Quaternion(), mat: new B.Matrix(), sc: new B.Vector3(), ps: new B.Vector3() };
  }

  // ---- neural nodes + 4 edge sets (skipped on the lite tier)
  if (!lite) {
    const nodes = new Array(NODES);
    const tgt = { lat: [], pan: [], arc: [] };
    const tmp = [0, 0, 0];
    for (let i = 0; i < NODES; i++) {
      const gx = i % GRID.nx, gy = Math.floor(i / GRID.nx) % GRID.ny, gz = Math.floor(i / (GRID.nx * GRID.ny));
      tgt.lat.push([GRID.c[0] + (gx - (GRID.nx - 1) / 2) * GRID.sx, GRID.c[1] + (gy - (GRID.ny - 1) / 2) * GRID.sy, GRID.c[2] + (gz - (GRID.nz - 1) / 2) * GRID.sz]);
      const pi = i < 24 ? 0 : 1; tgt.pan.push(panelPoint(pi, i % 24, 24, [0, 0, 0]).slice());
      const arc = i % 3, ai = Math.floor(i / 3); tgt.arc.push(arcPoint(arc, ai, 16, [0, 0, 0]).slice());
      let d = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]; const dl = Math.hypot(...d) || 1; const rr = 2.6 + rnd() * 4.2;
      d = d.map(x => x / dl * rr); if (d[2] < -4) d[2] = -d[2] * 0.5;
      const dd = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]; const ddl = Math.hypot(...dd) || 1;
      nodes[i] = { core: dd.map(x => x / ddl * 0.9), sc: d, p: [0, 0, 0], ph: rnd() * 6.28, c: rnd() };
    }
    // edges
    const sc = []; for (let i = 0; i < NODES; i++) {
      const ds = nodes.map((n, j) => [j, (n.sc[0] - nodes[i].sc[0]) ** 2 + (n.sc[1] - nodes[i].sc[1]) ** 2 + (n.sc[2] - nodes[i].sc[2]) ** 2]).filter(a => a[0] !== i).sort((a, b) => a[1] - b[1]);
      sc.push([i, ds[0][0]], [i, ds[1][0]]);
    }
    const lat = []; const gi = (x, y, z) => x + GRID.nx * (y + GRID.ny * z);
    for (let z = 0; z < GRID.nz; z++) for (let y = 0; y < GRID.ny; y++) for (let x = 0; x < GRID.nx; x++) {
      if (x + 1 < GRID.nx) lat.push([gi(x, y, z), gi(x + 1, y, z)]);
      if (y + 1 < GRID.ny) lat.push([gi(x, y, z), gi(x, y + 1, z)]);
      if (z + 1 < GRID.nz) lat.push([gi(x, y, z), gi(x, y, z + 1)]);
    }
    const pan = []; for (let p = 0; p < 2; p++) for (let k = 0; k < 24; k++) pan.push([p * 24 + k, p * 24 + (k + 1) % 24]);
    for (let p = 0; p < 2; p++) for (let k = 0; k < 12; k += 3) pan.push([p * 24 + k, p * 24 + k + 12]);
    const arc = []; for (let i = 0; i < NODES; i++) { if (i + 3 < NODES) arc.push([i, i + 3]); }
    H.nodes = nodes; H.tgt = tgt;
    H.sets = { sc: lineSet(gl, "nexus-e-scatter", sc, col.blue), lat: lineSet(gl, "nexus-e-lattice", lat, col.cyan), pan: lineSet(gl, "nexus-e-panel", pan, col.cyan), arc: lineSet(gl, "nexus-e-arc", arc, col.cyan) };
    const nm = B.MeshBuilder.CreateIcoSphere("nexus-node", { radius: 0.07, subdivisions: 1, flat: true }, scene);
    nm.isPickable = false; nm.alwaysSelectAsActiveMesh = true; nm.alphaIndex = 5;
    const nmat = new B.StandardMaterial("nexus-node-mat", scene);
    nmat.disableLighting = true; nmat.emissiveColor = new B.Color3(1, 1, 1); nmat.fogEnabled = false;
    nm.material = nmat;
    const nbuf = new Float32Array(NODES * 16), ncol = new Float32Array(NODES * 4);
    for (let i = 0; i < NODES; i++) { nbuf[i * 16] = nbuf[i * 16 + 5] = nbuf[i * 16 + 10] = nbuf[i * 16 + 15] = 1; const c = nodes[i].c; const cc = c > 0.82 ? [0.5, 0.3, 1] : c > 0.55 ? [0.2, 0.5, 1] : [0, 0.95, 1]; ncol.set([cc[0], cc[1], cc[2], 1], i * 4); }
    nm.thinInstanceSetBuffer("matrix", nbuf, 16, false);
    nm.thinInstanceSetBuffer("color", ncol, 4, true);
    H.nm = nm; H.nbuf = nbuf; H.tmp = tmp;
  }
  H.ptrAim = { x: 0, y: 0 };
}

/** @param {object} gl @param {number} dt @param {number} t @param {object} ctx */
export function update(gl, dt, t, ctx) {
  if (!H) return;
  const st = ctx.state, s = st.stage, reduced = ctx.tier.reduced;
  const f = smooth(0.15, 1.0, s), coreVis = 1 - smooth(0.6, 1.9, s);
  const L = smooth(1.2, 2.0, s), Pn = smooth(2.5, 3.1, s), C = smooth(3.4, 4.0, s);
  // ---- hover over core (screen-space distance of the origin)
  let over = false;
  if (st.pointer.inside && !ctx.tier.coarse && s < 0.45 && !reduced) {
    const vp = gl.scene.getTransformMatrix().m;
    const w = vp[15];
    if (w > 0.1) {
      const sx = (vp[12] / w * 0.5 + 0.5) * innerWidth, sy = (0.5 - vp[13] / w * 0.5) * innerHeight;
      const ppu = innerHeight / (2 * gl.camDist * Math.tan(gl.camera.fov / 2));
      over = Math.hypot(st.pointer.x - sx, st.pointer.y - sy) < 1.75 * ppu;
    }
  }
  st.overCore = over;
  H.hover += ((over ? 1 : 0) - H.hover) * (1 - Math.exp(-dt * 5));
  const hov = H.hover;
  if (!reduced) H.pulse += dt * (1 + hov * 2.4);
  // ---- core orientation
  const k = 1 - Math.exp(-dt * 4);
  H.ptrAim.x += ((reduced ? 0 : st.ptrSmooth.x) - H.ptrAim.x) * k;
  H.ptrAim.y += ((reduced ? 0 : st.ptrSmooth.y) - H.ptrAim.y) * k;
  H.aim.rotation.y = H.ptrAim.x * 0.7 + st.orient.x * 0.25;
  H.aim.rotation.x = -H.ptrAim.y * 0.45 - st.orient.y * 0.2;
  H.spin.rotation.y = t * 0.09 + s * 0.8;
  H.spin.rotation.x = Math.sin(t * 0.13) * 0.08;
  H.ribRoot.rotation.y = t * 0.03;
  // ---- energy
  const eFade = coreVis * (1 - f * 0.55);
  for (const e of [H.energy, H.hot]) {
    e.mt.setFloat("pulse", H.pulse);
    e.mt.setFloat("energy", (1.0 + hov * 0.35) * (0.45 + 0.55 * (1 - f)) * (e === H.hot ? 1.5 : 1.15));
    e.mt.setFloat("alpha", 0.92 * eFade);
    e.m.isVisible = eFade > 0.01;
    const sc = (e === H.hot ? 1 : 1) * (1 - f * 0.45) * (1 + Math.sin(H.pulse * 2) * 0.012);
    e.m.scaling.setAll(Math.max(sc, 0.01));
  }
  H.atmMat.setFloat("alpha", 0.55 + 0.45 * coreVis + hov * 0.1);
  // ---- shell facets
  if (Math.abs(f - H.prevF) > 1e-4) {
    H.prevF = f;
    const ax = H.fbuf, kk = 0.94 * (1 - f * 0.5);
    for (let i = 0; i < 20; i++) {
      const F = H.facets[i], th = f * F.spd * 2.4, c = Math.cos(th), sn = Math.sin(th), q = 1 - c;
      const [x, y, z] = F.axis;
      // rotation matrix (row-vector convention): v' = v * R
      const r00 = c + x * x * q, r01 = x * y * q + z * sn, r02 = x * z * q - y * sn;
      const r10 = x * y * q - z * sn, r11 = c + y * y * q, r12 = y * z * q + x * sn;
      const r20 = x * z * q + y * sn, r21 = y * z * q - x * sn, r22 = c + z * z * q;
      const rows = [F.u.map(v => v * F.rc * kk), F.n.map(v => v), F.w.map(v => v * F.rc * kk)];
      const o = i * 16;
      for (let r = 0; r < 3; r++) {
        const a = rows[r];
        ax[o + r * 4] = a[0] * r00 + a[1] * r10 + a[2] * r20;
        ax[o + r * 4 + 1] = a[0] * r01 + a[1] * r11 + a[2] * r21;
        ax[o + r * 4 + 2] = a[0] * r02 + a[1] * r12 + a[2] * r22;
        ax[o + r * 4 + 3] = 0;
      }
      const d = f * F.push;
      ax[o + 12] = F.c[0] + F.n[0] * d; ax[o + 13] = F.c[1] + F.n[1] * d; ax[o + 14] = F.c[2] + F.n[2] * d; ax[o + 15] = 1;
    }
    H.fm.thinInstanceBufferUpdated("matrix");
  }
  const shellA = 0.3 * (1 - smooth(0.55, 1.0, f));
  H.pbr.alpha = shellA; H.fm.isVisible = shellA > 0.01;
  H.pbr.emissiveColor.set(0.0, 0.08 + hov * 0.06, 0.16 + hov * 0.08);
  // ---- rings / filaments / ribbons
  const rA = 0.95 * coreVis * (1 - f * 0.4);
  H.rings.forEach((r, i) => {
    r.piv.rotation.y = t * r.sp;
    r.m.rotation.x = r.base[0] + H.ptrAim.y * 0.3 * (i + 1) * 0.5;
    r.m.rotation.z = r.base[1] + H.ptrAim.x * 0.3 * (i + 1) * 0.5;
    r.mt.setFloat("alpha", rA * (1 + hov * 0.2)); r.m.isVisible = rA > 0.01;
    r.m.scaling.setAll(1 + f * 0.5);
  });
  H.fil.mt.setFloat("bright", 1 + hov * 0.9); H.fil.mt.setFloat("alpha", coreVis * (1 - f * 0.6));
  H.fil.m.isVisible = coreVis > 0.01;
  H.ribbons.forEach(r => { r.mt.setFloat("alpha", 0.85 * coreVis); r.m.isVisible = coreVis > 0.01; });
  // ---- orbiting polyhedra
  {
    const P = H.poly, b = P.buf;
    for (let i = 0; i < P.orb.length; i++) {
      const o = P.orb[i], a = o.ph + t * o.sp;
      const x0 = o.r * Math.cos(a), z0 = o.r * Math.sin(a);
      const y1 = z0 * Math.sin(o.inc), z1 = z0 * Math.cos(o.inc);
      const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
      P.ps.set(x0 * cy + z1 * sy, y1, -x0 * sy + z1 * cy);
      P.sc.setAll(o.sz * coreVis * (1 + f * 0.0001) + 1e-4);
      B_euler(gl.B, P.q, t * o.tm[0], t * o.tm[1]);
      gl.B.Matrix.ComposeToRef(P.sc, P.q, P.ps, P.mat);
      P.mat.copyToArray(b, i * 16);
    }
    P.m.thinInstanceBufferUpdated("matrix");
    P.m.isVisible = coreVis > 0.01;
  }
  // ---- nodes + edges
  if (H.nodes) {
    const nodes = H.nodes, tg = H.tgt, nb = H.nbuf;
    const nv = f * (1 - 0 * C);
    for (let i = 0; i < NODES; i++) {
      const n = nodes[i], p = n.p;
      for (let a = 0; a < 3; a++) {
        let v = mix(n.core[a], n.sc[a], f);
        v = mix(v, tg.lat[i][a], L);
        v = mix(v, tg.pan[i][a], Pn);
        v = mix(v, tg.arc[i][a], C);
        p[a] = v;
      }
      const jig = 0.06 * (1 - Pn * 0.8);
      p[0] += Math.sin(t * 0.5 + n.ph) * jig; p[1] += Math.cos(t * 0.45 + n.ph * 1.7) * jig; p[2] += Math.sin(t * 0.4 + n.ph * 2.3) * jig;
      const sz = nv * (0.75 + 0.25 * Math.sin(t * 1.3 + n.ph)) * (1 + st.stageVel * 0.15);
      const o = i * 16;
      nb[o] = nb[o + 5] = nb[o + 10] = Math.max(sz, 1e-4);
      nb[o + 12] = p[0]; nb[o + 13] = p[1]; nb[o + 14] = p[2];
    }
    H.nm.thinInstanceBufferUpdated("matrix");
    H.nm.isVisible = nv > 0.01;
    const vis = { sc: f * (1 - L) * 0.7, lat: L * (1 - Pn) * 0.6, pan: Pn * (1 - C) * 0.8, arc: C * 0.8 };
    for (const key of ["sc", "lat", "pan", "arc"]) {
      const S = H.sets[key], a = vis[key];
      S.mat.alpha = Math.min(1, a); S.mesh.isVisible = a > 0.01;
      if (a > 0.01) {
        const pr = S.pairs, bf = S.buf;
        for (let e = 0; e < pr.length; e++) {
          const A = nodes[pr[e][0]].p, Bn = nodes[pr[e][1]].p, o = e * 6;
          bf[o] = A[0]; bf[o + 1] = A[1]; bf[o + 2] = A[2]; bf[o + 3] = Bn[0]; bf[o + 4] = Bn[1]; bf[o + 5] = Bn[2];
        }
        S.mesh.updateVerticesData("position", bf, false, false);
      }
    }
  }
}
function B_euler(B, q, a, b) { B.Quaternion.RotationYawPitchRollToRef(a, b, 0, q); }

export function dispose() { H = null; }
