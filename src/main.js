/**
 * Entry point. Creates the single `window.nexus` namespace, detects the device tier, starts the
 * central loop and initialises every module. Babylon.js is loaded lazily (after load + idle) and any
 * failure falls back to the CSS hero — users never see an error.
 * @module main
 */
import * as loop from "./loop.js";
import { detect } from "./perf/deviceTier.js";
import * as journey from "./scroll/journey.js";
import * as observer from "./scroll/observer.js";
import * as page from "./page.js";
import * as nav from "./interaction/nav.js";
import * as cursor from "./interaction/cursor.js";
import * as tilt from "./interaction/tilt.js";
import * as magnetic from "./interaction/magnetic.js";
import * as hover from "./interaction/hover.js";
import * as processing from "./pricing/processing.js";
import * as cssHero from "./fallback/cssHero.js";

const root = document.documentElement;
const tier = detect();
const params = new URLSearchParams(location.search);

const state = {
  t: 0, stage: 0, stageTarget: 0, stageVel: 0, scrollY: window.scrollY || 0, _sy: -1,
  pointer: { x: 0, y: 0, inside: false }, ptrSmooth: { x: 0, y: 0 }, orient: { x: 0, y: 0 },
  active: "", overCore: false,
};
/** @type {any} */
const ctx = { tier, loop, state, unsub: [], gl: null, fellBack: false, engine: null, fallback };

root.classList.add("rv", "tier-" + tier.tier);
if (tier.reduced) root.classList.add("reduced");

/** Switch to the CSS hero, releasing all GPU resources. */
function fallback(reason) {
  if (ctx.fellBack) return;
  ctx.fellBack = true; ctx.fallbackReason = reason;
  try { if (ctx.engine) ctx.engine.dispose(); } catch (e) { /* noop */ }
  root.classList.remove("gl-on"); root.classList.add("gl-off");
  cssHero.show();
}

// ---- pointer + device orientation -> damped state (read by 3D, CSS hero, nav) ----
function inputs() {
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); return () => t.removeEventListener(ev, fn, o); };
  const offs = [];
  offs.push(on(window, "pointermove", (e) => {
    if (e.pointerType === "touch") return;
    state.pointer.x = (e.clientX / innerWidth) * 2 - 1; state.pointer.y = -((e.clientY / innerHeight) * 2 - 1); state.pointer.inside = true;
  }, { passive: true }));
  offs.push(on(document.documentElement, "pointerleave", () => { state.pointer.inside = false; }));
  if (!tier.reduced && "DeviceOrientationEvent" in window && tier.coarse) {
    offs.push(on(window, "deviceorientation", (e) => {
      if (e.gamma == null) return;
      state.orient.x = Math.max(-1, Math.min(1, e.gamma / 30));
      state.orient.y = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30));
    }, { passive: true }));
  }
  ctx.unsub.push(loop.add((dt) => {
    const k = 1 - Math.exp(-dt * 4.2), tx = tier.reduced ? 0 : state.pointer.x, ty = tier.reduced ? 0 : state.pointer.y;
    state.ptrSmooth.x += (tx - state.ptrSmooth.x) * k; state.ptrSmooth.y += (ty - state.ptrSmooth.y) * k;
  }, 5));
  return () => offs.forEach(f => f());
}

/** True when the browser is rendering WebGL in software (no GPU): real-time 3D is unusable there. */
function softwareRenderer() {
  try {
    const c = document.createElement("canvas");
    const g = c.getContext("webgl", { failIfMajorPerformanceCaveat: false }) || c.getContext("experimental-webgl");
    if (!g) return false;
    const ext = g.getExtension("WEBGL_debug_renderer_info");
    const r = ext ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(g.getParameter(g.RENDERER));
    const lose = g.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
  } catch (e) { return false; }
}

async function startWorld() {
  // auto-downgrade: no GPU -> beautiful CSS hero instead of a slideshow. `?gl=force` / `?governor=off` overrides (testing).
  if (params.get("gl") !== "force" && params.get("governor") !== "off" && softwareRenderer()) { fallback("software-renderer"); return; }
  const eng = await import("./3d/engine.js");
  ctx.engine = eng;
  try {
    await eng.init(ctx);
    if (ctx.fellBack) { eng.dispose(); return; }
    root.classList.add("gl-on");
  } catch (err) {
    ctx.fallbackStack = err && err.stack; fallback("init: " + (err && err.message));
  }
}

function scheduleWorld() {
  const skip = tier.tier === "static" || tier.reducedData || params.get("gl") === "0";
  if (skip) { if (tier.tier !== "static") cssHero.show(); return; }
  const go = () => startWorld().catch(() => fallback("start"));
  const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200));
  if (document.readyState === "complete") setTimeout(idle, 400);
  else window.addEventListener("load", () => setTimeout(idle, 400), { once: true });
}

const mods = [journey, observer, page, nav, tilt, magnetic, hover, cursor, processing, cssHero];
let stopInputs = null;
function init() {
  loop.init();
  stopInputs = inputs();
  for (const m of mods) { try { m.init(ctx); } catch (e) { /* a single module failing must not break the page */ } }
  scheduleWorld();
}
function dispose() {
  ctx.unsub.splice(0).forEach(u => u());
  [...mods].reverse().forEach(m => { try { m.dispose(); } catch (e) { /* noop */ } });
  if (ctx.engine && ctx.gl) ctx.engine.dispose();
  if (stopInputs) stopInputs();
  loop.dispose();
}

window.nexus = {
  version: "3d-1.0", ctx, init, dispose,
  /** Test / debug snapshot. */
  debug() {
    const info = ctx.engine && ctx.gl ? ctx.engine.info() : null;
    return { tier: tier.tier, fellBack: ctx.fellBack, reason: ctx.fallbackReason || null, stage: +state.stage.toFixed(2), reduced: tier.reduced, gl: info,
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
  },
};
init();
