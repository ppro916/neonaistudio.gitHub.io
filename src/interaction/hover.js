/**
 * Hover + click micro-interactions: click radial pulse (200ms) on buttons; "hot" state on 3D cards;
 * pointer-over-core flag for the 3D scene is handled in the scene itself.
 * Feedback is visual only (no audio).
 * @module interaction/hover
 */
let offs = [];
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };

export function init(ctx) {
  on(document, "pointerdown", (e) => {
    const b = e.target.closest && e.target.closest(".btn");
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), s = document.createElement("span");
    s.className = "pulse"; s.style.left = (e.clientX - r.left) + "px"; s.style.top = (e.clientY - r.top) + "px";
    b.appendChild(s); setTimeout(() => s.remove(), 220);
  });
}
export function dispose() { offs.forEach(f => f()); offs = []; }
