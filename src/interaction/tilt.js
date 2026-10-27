/**
 * 3D card tilt: +/-8deg (per-card data-tilt), perspective 1200, lerped from the central rAF.
 * Writes CSS vars only (--rx --ry --mx --my --tilt --lit) – the stylesheet composes the transform,
 * the bob uses the independent `translate` property. Only cards under the pointer (or easing back) cost anything.
 * Disabled on coarse pointers / reduced motion (cards stay static; CSS 3D depth remains).
 * @module interaction/tilt
 */
let offs = [], active = new Map(), cur = null, ctx = null;
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };

function target(el) { return el.closest && el.closest(".card3d"); }

export function init(context) {
  ctx = context;
  document.querySelectorAll(".card3d").forEach((el, i) => el.style.setProperty("--d", (i * 0.73 % 6).toFixed(2)));
  if (ctx.tier.coarse || ctx.tier.reduced) return;
  on(document, "pointermove", (e) => {
    const el = target(e.target);
    if (el !== cur) { if (cur) release(cur); cur = el; }
    if (!el) return;
    let s = active.get(el);
    if (!s) { s = { rx: 0, ry: 0, tx: 0, ty: 0, mx: 50, my: 50, lit: 0, tl: 0, max: +el.dataset.tilt || 6 }; active.set(el, s); }
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    s.tx = nx * s.max * 2; s.ty = -ny * s.max * 2;       // rotateY follows x, rotateX inverse of y
    s.tx = Math.max(-s.max, Math.min(s.max, s.tx)); s.ty = Math.max(-s.max, Math.min(s.max, s.ty));
    s.mx = (nx + 0.5) * 100; s.my = (ny + 0.5) * 100; s.hover = true;
    el.classList.add("hot");
  }, { passive: true });
  on(document.documentElement, "pointerleave", () => { if (cur) release(cur); cur = null; });
  ctx.unsub.push(ctx.loop.add((dt) => {
    if (!active.size) return;
    const k = 1 - Math.exp(-dt * 9);
    for (const [el, s] of active) {
      const ty = s.hover ? s.ty : 0, tx = s.hover ? s.tx : 0, tl = s.hover ? 1 : 0;
      s.rx += (ty - s.rx) * k; s.ry += (tx - s.ry) * k; s.lit += (tl - s.lit) * k;
      const mag = Math.min(1, Math.hypot(s.rx, s.ry) / s.max);
      const st = el.style;
      st.setProperty("--rx", s.rx.toFixed(2) + "deg"); st.setProperty("--ry", s.ry.toFixed(2) + "deg");
      st.setProperty("--mx", s.mx.toFixed(1) + "%"); st.setProperty("--my", s.my.toFixed(1) + "%");
      st.setProperty("--tilt", mag.toFixed(3)); st.setProperty("--lit", s.lit.toFixed(3));
      if (!s.hover && Math.abs(s.rx) < 0.02 && Math.abs(s.ry) < 0.02 && s.lit < 0.01) {
        st.removeProperty("--rx"); st.removeProperty("--ry"); st.removeProperty("--lit"); st.removeProperty("--tilt"); el.classList.remove("hot"); active.delete(el);
      }
    }
  }, 30));
}
function release(el) { const s = active.get(el); if (s) s.hover = false; }
/** Pointer over card?  (used by cursor to spin its ring) */
export const hovering = () => cur;
export function dispose() { offs.forEach(f => f()); offs = []; active.clear(); cur = null; }
