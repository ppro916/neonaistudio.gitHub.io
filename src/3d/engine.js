/**
 * Babylon.js engine bootstrap. Babylon 7 is loaded dynamically from the official CDN *after* the page is
 * interactive so it never blocks LCP; a failure anywhere results in the CSS fallback (see main.js).
 * Rendering is driven manually from the central loop (no engine.runRenderLoop).
 * @module 3d/engine
 */
import { BABYLON_URL } from "../config.js";
import { cameraAt } from "../scroll/journey.js";
import * as dispose from "./dispose.js";
import * as postfx from "./postfx.js";
import * as particles from "./particles.js";
import * as hero from "./scenes/hero.js";
import * as pricing from "./scenes/pricing.js";
import * as contact from "./scenes/contact.js";
import * as fpsMonitor from "../perf/fpsMonitor.js";
import { feed } from "./materials.js";

let gl = null, ctx = null, visible = true, iov = null, unsubs = [], tgtV = null;

/** Load Babylon from the CDN once. @returns {Promise<any>} */
export function loadBabylon() {
  if (window.BABYLON) return Promise.resolve(window.BABYLON);
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = BABYLON_URL; s.async = true; s.crossOrigin = "anonymous";
    s.onload = () => (window.BABYLON ? res(window.BABYLON) : rej(new Error("babylon missing")));
    s.onerror = () => rej(new Error("babylon load failed"));
    document.head.appendChild(s);
  });
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function envTexture(B, scene) {
  // Procedural blue-violet studio environment as a 6-face raw cube (LDR), mip-mapped for PBR.
  const S = 32, faces = [];
  const sky = [0.10, 0.20, 0.55], mid = [0.03, 0.06, 0.16], gnd = [0.20, 0.10, 0.48], cy = [0.0, 0.9, 1.0];
  for (let f = 0; f < 6; f++) {
    const d = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let c;
      const u = x / (S - 1) * 2 - 1, v = 1 - y / (S - 1) * 2;
      if (f === 2) c = sky; else if (f === 3) c = gnd;
      else { const k = (v + 1) / 2; c = k > 0.5 ? mid.map((m, i) => m + (sky[i] - m) * (k - 0.5) * 1.6) : mid.map((m, i) => m + (gnd[i] - m) * (0.5 - k) * 1.2); }
      // two soft boxes: cyan on +X side, violet-ish on -Z
      if (f === 0 && Math.abs(u) < 0.5 && v > -0.2 && v < 0.7) c = cy.map((x2) => x2 * 0.85);
      if (f === 5 && Math.abs(u) < 0.6 && v > 0.1 && v < 0.6) c = [0.45, 0.25, 1.0];
      const o = (y * S + x) * 4;
      d[o] = Math.min(255, c[0] * 255); d[o + 1] = Math.min(255, c[1] * 255); d[o + 2] = Math.min(255, c[2] * 255); d[o + 3] = 255;
    }
    faces.push(d);
  }
  const tex = new B.RawCubeTexture(scene, faces, S, B.Constants.TEXTUREFORMAT_RGBA, B.Constants.TEXTURETYPE_UNSIGNED_BYTE, true, false);
  return tex;
}

/**
 * @param {object} context nexus context
 * @returns {Promise<object>} the gl context
 */
export async function init(context) {
  ctx = context;
  const B = await loadBabylon();
  if (!B.Engine.isSupported()) throw new Error("webgl unsupported");
  const canvas = document.getElementById("world");
  const engine = new B.Engine(canvas, false, { alpha: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false }, false);
  canvas.removeAttribute("tabindex"); canvas.setAttribute("tabindex", "-1");
  dispose.init();
  dispose.track(engine);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  engine.setHardwareScalingLevel(1 / dpr);
  const scene = new B.Scene(engine);
  dispose.track(scene);
  scene.clearColor = new B.Color4(0.016, 0.024, 0.047, 1);
  scene.skipPointerMovePicking = true;
  scene.autoClearDepthAndStencil = true;
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.028;
  scene.fogColor = new B.Color3(0.016, 0.03, 0.07);
  scene.environmentTexture = envTexture(B, scene);
  scene.environmentIntensity = 0.85;
  const camera = new B.FreeCamera("nexus-cam", new B.Vector3(0, 0.3, -9.5), scene);
  camera.minZ = 0.1; camera.maxZ = 80; camera.fov = 0.75;
  camera.setTarget(B.Vector3.Zero());
  scene.activeCamera = camera;
  const col = { cyan: new B.Color3(0, 0.898, 1), blue: new B.Color3(0.165, 0.42, 1), violet: new B.Color3(0.478, 0.235, 1) };
  gl = { B, engine, scene, camera, canvas, col, mats: [], fogDensity: 0.028, dprScale: dpr, fx: null, particles: null, lite: ctx.tier.tier === "simple" };
  ctx.gl = gl;

  postfx.init(gl, ctx);
  hero.init(gl, ctx);
  if (!gl.lite) { pricing.init(gl, ctx); contact.init(gl, ctx); }
  particles.init(gl, ctx);

  const onResize = () => { engine.resize(); };
  dispose.listen(window, "resize", onResize);
  iov = new IntersectionObserver((es) => { visible = es[0].isIntersecting; });
  iov.observe(canvas);
  dispose.track(() => iov && iov.disconnect());

  fpsMonitor.init({
    steps: [
      () => { postfx.reduceBloom(); },
      () => { postfx.disableDof(); },
      () => { particles.halve(); },
      () => { scene.fogMode = B.Scene.FOGMODE_NONE; gl.fogDensity = 0; },
      () => { if (ctx.fallback) ctx.fallback("governor"); },
    ],
  });
  tgtV = new B.Vector3();
  unsubs.push(ctx.loop.add(step, 50));
  // render a few warm-up frames synchronously so the first paint isn't a clear colour
  step(0.016, 0);
  return gl;
}

const tmpPos = [0, 0, 0], tmpTgt = [0, 0, 0];
let lastFx = 0;

function step(dt, now) {
  if (!gl) return;
  const st = ctx.state, reduced = ctx.tier.reduced;
  if (!reduced) st.t += dt;
  const t = st.t;
  if (!visible || document.hidden) return;
  const { scene, camera, engine, B } = gl;
  const stage = st.stage;
  // ---- camera: Bezier path + responsive framing + damped pointer / orientation offsets
  const path = cameraAt(gl.lite ? Math.min(stage, 1) : stage);
  const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
  const back = 1 + Math.max(0, 1.2 - aspect) * 0.95;
  const heroW = 1 - smooth(0.15, 1.0, stage);
  const shiftX = (aspect > 1.15 ? 2.4 * Math.min(1, (aspect - 1.15) / 0.6) : 0) * heroW;
  const lift = (aspect < 1.1 ? -1.1 * Math.min(1, (1.1 - aspect) / 0.5) : 0) * heroW;
  for (let c = 0; c < 3; c++) { tmpTgt[c] = path.t[c]; tmpPos[c] = path.t[c] + (path.p[c] - path.t[c]) * back; }
  tmpTgt[0] -= shiftX; tmpPos[0] -= shiftX; tmpTgt[1] += lift; tmpPos[1] += lift;
  const dist = Math.hypot(tmpPos[0] - tmpTgt[0], tmpPos[1] - tmpTgt[1], tmpPos[2] - tmpTgt[2]);
  const viewW = 2 * dist * Math.tan(camera.fov / 2) * aspect;
  const px = st.ptrSmooth.x, py = st.ptrSmooth.y, ox = st.orient.x, oy = st.orient.y;
  const offX = reduced ? 0 : (px * 0.02 + ox * 0.01) * viewW, offY = reduced ? 0 : (py * 0.02 + oy * 0.01) * viewW * 0.6;
  camera.position.set(tmpPos[0] + offX, tmpPos[1] + offY, tmpPos[2]);
  tgtV.copyFromFloats(tmpTgt[0], tmpTgt[1], tmpTgt[2]);
  camera.setTarget(tgtV);
  gl.camDist = dist;
  gl.stage = stage;

  postfx.update(gl, stage, dist);
  hero.update(gl, dt, t, ctx);
  if (!gl.lite) { pricing.update(gl, dt, t, ctx); contact.update(gl, dt, t, ctx); }
  particles.update(gl, dt, t, ctx);
  feed(gl, t);
  // canvas dims after hero on the lite tier so it never fights the text
  if (gl.lite) { const k = 1 - 0.7 * smooth(0.4, 1.2, st.scrollY / h); if (Math.abs(k - lastFx) > 0.01) { gl.canvas.style.opacity = k.toFixed(2); lastFx = k; } }

  engine.beginFrame();
  scene.render();
  engine.endFrame();
  fpsMonitor.tick(dt);
}

/** Debug / test info (exposed under window.nexus.debug()). */
export function info() {
  if (!gl) return null;
  return {
    fps: Math.round(fpsMonitor.getFps()), govStep: fpsMonitor.getStep(), stage: +gl.stage.toFixed(2),
    meshes: gl.scene.meshes.length, materials: gl.scene.materials.length, textures: gl.scene.textures.length,
    particles: particles.stats(), draws: gl.engine._drawCalls ? gl.engine._drawCalls.current : undefined,
    tier: ctx.tier.tier,
  };
}

export function dispose_() {
  if (!gl) return;
  unsubs.forEach(u => { try { u(); } catch (e) { /* noop */ } });
  unsubs = [];
  for (const m of [contact, pricing, hero, particles, postfx, fpsMonitor]) { try { m.dispose(); } catch (e) { /* noop */ } }
  dispose.dispose();
  gl = null; ctx.gl = null;
}
export { dispose_ as dispose };
