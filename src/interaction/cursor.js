/**
 * Custom cursor (desktop fine pointer only): 4px cyan dot (screen blend), 28px ring (1px cyan 40%),
 * 80px glow (10%). The ring snaps to button centres within ~100ms, grows to 40px over links, spins
 * (dashed) over cards and collapses for 80ms on click. Disabled on coarse pointers, reduced motion
 * and while a text field is focused.
 * @module interaction/cursor
 */
import { hovering } from "./tilt.js";
let offs = [], ctx = null, root = null;
let dot, ring, glow;
const s = { x: -100, y: -100, rx: -100, ry: -100, gx: -100, gy: -100, sc: 1, tsc: 1, snapEl: null, down: false, shown: false };
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
const isField = (el) => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

export function init(context) {
  ctx = context;
  if (!ctx.tier.cursor) return;
  root = document.documentElement;
  dot = document.getElementById("curDot"); ring = document.getElementById("curRing"); glow = document.getElementById("curGlow");
  on(document, "pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    s.x = e.clientX; s.y = e.clientY;
    if (!s.shown) { s.shown = true; s.rx = s.gx = s.x; s.ry = s.gy = s.y; root.classList.add("has-cursor"); }
    const t = e.target.closest ? e.target : null;
    s.snapEl = t && t.closest("[data-snap]");
    const link = t && t.closest("a, button, summary, label, select");
    s.tsc = s.snapEl || link ? 40 / 28 : 1;
    ring.classList.toggle("snap", !!s.snapEl);
    ring.classList.toggle("spin", !!(t && t.closest(".card3d") && !link));
    root.classList.toggle("cur-hide", isField(t) || isField(document.activeElement));
  }, { passive: true });
  on(document, "pointerdown", () => { s.down = true; });
  on(document, "pointerup", () => { setTimeout(() => { s.down = false; }, 80); });
  on(document, "focusin", (e) => { if (isField(e.target)) root.classList.add("cur-hide"); });
  on(document, "focusout", () => root.classList.remove("cur-hide"));
  on(document.documentElement, "pointerleave", () => root.classList.add("cur-hide"));
  on(document.documentElement, "pointerenter", () => { if (!isField(document.activeElement)) root.classList.remove("cur-hide"); });
  ctx.unsub.push(ctx.loop.add((dt) => {
    if (!s.shown) return;
    let tx = s.x, ty = s.y;
    if (s.snapEl) { const b = s.snapEl.getBoundingClientRect(); tx = b.left + b.width / 2; ty = b.top + b.height / 2; }
    const kr = 1 - Math.exp(-dt * (s.snapEl ? 38 : 22));      // ~100ms to settle on a button
    const kg = 1 - Math.exp(-dt / 0.12 * 2.0);                // trailing glow, ~0.12s
    s.rx += (tx - s.rx) * kr; s.ry += (ty - s.ry) * kr;
    s.gx += (s.x - s.gx) * kg; s.gy += (s.y - s.gy) * kg;
    s.sc += ((s.down ? 0.6 : s.tsc) - s.sc) * (1 - Math.exp(-dt * 30));
    dot.style.transform = "translate3d(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px,0)";
    ring.style.transform = "translate3d(" + s.rx.toFixed(1) + "px," + s.ry.toFixed(1) + "px,0) scale(" + s.sc.toFixed(3) + ")";
    glow.style.transform = "translate3d(" + s.gx.toFixed(1) + "px," + s.gy.toFixed(1) + "px,0)";
  }, 26));
}
export function dispose() { offs.forEach(f => f()); offs = []; if (root) root.classList.remove("has-cursor", "cur-hide"); }
