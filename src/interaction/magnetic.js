/**
 * Magnetic elements: [data-magnetic="<px>"] is pulled toward the pointer when it comes within <px>
 * (nav items 60px, primary CTAs 80px) using a damped spring on the independent `translate` property.
 * @module interaction/magnetic
 */
let items = [], offs = [], px = -9999, py = -9999, ctx = null;
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };

export function init(context) {
  ctx = context;
  if (ctx.tier.coarse || ctx.tier.reduced) return;
  items = [...document.querySelectorAll("[data-magnetic]")].map(el => ({ el, r: +el.dataset.magnetic || 60, x: 0, y: 0, vx: 0, vy: 0, rect: null, dirty: true }));
  const dirty = () => items.forEach(i => { i.dirty = true; });
  on(window, "scroll", dirty, { passive: true }); on(window, "resize", dirty);
  on(document, "pointermove", (e) => { px = e.clientX; py = e.clientY; }, { passive: true });
  on(document.documentElement, "pointerleave", () => { px = py = -9999; });
  ctx.unsub.push(ctx.loop.add((dt) => {
    const kS = 220, c = 2 * Math.sqrt(kS) * 0.62;          // slightly under-damped spring
    for (const it of items) {
      if (it.dirty) { const b = it.el.getBoundingClientRect(); it.rect = { cx: b.left + b.width / 2 - it.x, cy: b.top + b.height / 2 - it.y, w: b.width, h: b.height }; it.dirty = false; }
      const R = it.rect;
      const dx = px - R.cx, dy = py - R.cy;
      const ex = Math.max(0, Math.abs(dx) - R.w / 2), ey = Math.max(0, Math.abs(dy) - R.h / 2);   // distance to the box
      let tx = 0, ty = 0;
      if (Math.hypot(ex, ey) < it.r) { tx = dx * 0.28; ty = dy * 0.28; }
      if (Math.abs(tx - it.x) < 0.01 && Math.abs(ty - it.y) < 0.01 && Math.abs(it.vx) < 0.01 && Math.abs(it.vy) < 0.01) continue;
      it.vx += ((tx - it.x) * kS - it.vx * c) * dt; it.vy += ((ty - it.y) * kS - it.vy * c) * dt;
      it.x += it.vx * dt; it.y += it.vy * dt;
      it.el.style.translate = it.x.toFixed(2) + "px " + it.y.toFixed(2) + "px";
      it.dirty = false;
    }
  }, 25));
}
export function dispose() { offs.forEach(f => f()); offs = []; items.forEach(i => i.el.style.removeProperty("translate")); items = []; }
