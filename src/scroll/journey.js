/**
 * Scroll journey: converts page scroll into a continuous "stage" value 0..4 that drives the 3D world
 * (0 hero core, 1 core fractured into neural nodes, 2 node lattice, 3 holographic plan panels,
 * 4 command-center). Everything is bound to scroll *progress* (piecewise-linear between section
 * anchors), never to threshold triggers. The camera follows a cubic Bezier path through key poses.
 * @module scroll/journey
 */
/** Key camera poses, one per stage. */
export const KEYS = [
  { p: [0, 0.3, -9.5], t: [0, 0, 0] },
  { p: [2.0, -0.5, -5.2], t: [0, 0, 0.5] },
  { p: [-1.5, 0.6, -7.5], t: [0, 0, 1.5] },
  { p: [0, 0.9, -8.5], t: [0, 0.2, 2.0] },
  { p: [0, 2.6, -9.0], t: [0, -1.8, 2.5] },
];

const bez = (a, b, c, d, u) => {
  const v = 1 - u;
  return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
};
const ctl = (arr, k) => {
  // Catmull-Rom -> cubic Bezier control points for segment k..k+1
  const P = (i) => arr[Math.max(0, Math.min(arr.length - 1, i))];
  const p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
  return [0, 1, 2].map(c => [p1[c], p1[c] + (p2[c] - p0[c]) / 6, p2[c] - (p3[c] - p1[c]) / 6, p2[c]]);
};
const POS = KEYS.map(k => k.p), TGT = KEYS.map(k => k.t);
const out = { p: [0, 0, 0], t: [0, 0, 0] };

/**
 * Evaluate the camera Bezier path. Returns a shared object (do not retain).
 * @param {number} stage 0..4
 */
export function cameraAt(stage) {
  const s = Math.max(0, Math.min(KEYS.length - 1, stage));
  const k = Math.min(KEYS.length - 2, Math.floor(s));
  const u = s - k;
  const cp = ctl(POS, k), ct = ctl(TGT, k);
  for (let c = 0; c < 3; c++) {
    out.p[c] = bez(cp[c][0], cp[c][1], cp[c][2], cp[c][3], u);
    out.t[c] = bez(ct[c][0], ct[c][1], ct[c][2], ct[c][3], u);
  }
  return out;
}

let anchors = [0, 1, 2, 3, 4];
let ctx = null, off = null, ro = null;

function abs(el) { return el ? el.getBoundingClientRect().top + window.scrollY : 0; }

/** Recompute scroll anchors for each stage from the live layout. */
export function measure() {
  const vh = window.innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
  const about = document.getElementById("about"), svc = document.getElementById("services");
  const plans = document.getElementById("plans"), quote = document.getElementById("quote");
  const a1 = Math.max(80, abs(about) - vh * 0.35);
  const sTop = abs(svc), sH = svc ? svc.offsetHeight : vh;
  const a2 = Math.max(a1 + 60, sTop + sH * 0.35);
  const a3 = Math.max(a2 + 60, abs(plans) - vh * 0.25);
  const a4 = Math.min(max, Math.max(a3 + 60, abs(quote) + vh * 0.2));
  anchors = [0, a1, a2, a3, Math.max(a4, a3 + 60)];
  return anchors;
}

/** @param {number} y scroll position -> stage 0..4 */
export function stageFor(y) {
  if (y <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (y <= anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
  }
  return anchors.length - 1;
}

/** @param {object} context nexus context */
export function init(context) {
  ctx = context;
  const st = ctx.state;
  measure();
  const onScroll = () => { st.scrollY = window.scrollY; st.stageTarget = ctx.tier.reduced ? 0 : stageFor(window.scrollY); };
  off = [];
  window.addEventListener("scroll", onScroll, { passive: true });
  off.push(() => window.removeEventListener("scroll", onScroll));
  const onResize = () => { measure(); onScroll(); };
  window.addEventListener("resize", onResize);
  off.push(() => window.removeEventListener("resize", onResize));
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(() => { measure(); onScroll(); });
    ro.observe(document.body);
  }
  onScroll();
  st.stage = st.stageTarget;
  const root = document.documentElement;
  ctx.unsub.push(ctx.loop.add((dt) => {
    // damped stage (camera-rig feel), no allocation
    const k = 1 - Math.exp(-dt * 5.5);
    const prev = st.stage;
    st.stage += (st.stageTarget - st.stage) * k;
    st.stageVel = Math.abs(st.stage - prev) / Math.max(dt, 1e-3);
    if (Math.abs(st.scrollY - st._sy) > 0.5) { st._sy = st.scrollY; root.style.setProperty("--sy", st.scrollY.toFixed(1)); }
  }, 10));
}
export function dispose() {
  if (off) off.forEach(f => f());
  if (ro) ro.disconnect();
  off = ro = ctx = null;
}
