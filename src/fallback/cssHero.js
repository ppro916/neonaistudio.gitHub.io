/**
 * CSS/SVG hero used when WebGL is unavailable, fails, or the FPS governor gives up (class `css-hero`), and as the
 * parallax overlay on the static (<=479px / reduced-data) tier. Built from radial/conic gradients, an SVG neural graph
 * and 3D-transformed rings. Four parallax planes: glow, dot field, neural graph, core. Never shows an error message.
 * @module fallback/cssHero
 */
let host = null, unsub = null;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function graph() {
  const R = rng(7), W = 640, H = 420, N = 26, pts = [];
  for (let i = 0; i < N; i++) pts.push([40 + R() * (W - 80), 30 + R() * (H - 60)]);
  let edges = "", pulses = "", nodes = "", n = 0;
  for (let i = 0; i < N; i++) {
    const near = pts.map((p, j) => [j, Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])]).filter(a => a[0] > i && a[1] < 150).sort((a, b) => a[1] - b[1]).slice(0, 2);
    for (const [j] of near) {
      const d = `M${pts[i][0].toFixed(0)} ${pts[i][1].toFixed(0)}L${pts[j][0].toFixed(0)} ${pts[j][1].toFixed(0)}`;
      edges += `<path class="edge" d="${d}"/>`;
      if (n++ % 4 === 0) pulses += `<path class="edge pulse" style="animation-delay:-${(R() * 3).toFixed(2)}s" d="${d}"/>`;
    }
    nodes += `<circle class="node" cx="${pts[i][0].toFixed(0)}" cy="${pts[i][1].toFixed(0)}" r="${(1.6 + R() * 2).toFixed(1)}" opacity="${(0.5 + R() * 0.5).toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${edges}${pulses}${nodes}</svg>`;
}

/** @param {object} ctx */
export function init(ctx) {
  host = document.getElementById("heroCss");
  if (!host) return;
  host.innerHTML = `<div class="chero">
    <div class="layer l-glow"></div><div class="layer l-dots"></div>
    <div class="layer l-graph">${graph()}</div>
    <div class="layer l-core"><span class="ring b"></span><span class="ring a"></span><span class="orb"></span></div>
  </div>`;
  const root = document.documentElement;
  let lx = 9, ly = 9;
  unsub = ctx.loop.add(() => {
    if (!root.classList.contains("css-hero") && !root.classList.contains("tier-static")) return;
    const x = ctx.state.ptrSmooth.x + ctx.state.orient.x, y = ctx.state.ptrSmooth.y + ctx.state.orient.y;
    if (Math.abs(x - lx) + Math.abs(y - ly) < 0.002) return;
    lx = x; ly = y;
    host.style.setProperty("--px", x.toFixed(3)); host.style.setProperty("--py", y.toFixed(3));
  }, 28);
}
/** Switch the page into the CSS hero. */
export function show() { document.documentElement.classList.add("css-hero"); }
export function dispose() { if (unsub) unsub(); unsub = null; if (host) host.innerHTML = ""; host = null; }
