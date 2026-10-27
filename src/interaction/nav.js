/**
 * Holographic Command Bar: shrink/fade after 80px scroll, mobile holographic sheet (staggered),
 * active-section tracking and a spring-driven cyan underglow that slides under hovered/focused/active items.
 * @module interaction/nav
 */
let offs = [], ctx = null;
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };

export function init(context) {
  ctx = context;
  const bar = document.getElementById("cmdbar"), menu = document.getElementById("menu"), burger = document.getElementById("burger"), glow = document.getElementById("underglow");
  const links = [...menu.querySelectorAll("a")];
  links.forEach((a, i) => a.parentElement.style.setProperty("--i", i));

  // shrink after 80px
  const onScroll = () => bar.classList.toggle("shrunk", window.scrollY > 80);
  on(window, "scroll", onScroll, { passive: true }); onScroll();

  // mobile sheet
  const set = (open) => { menu.classList.toggle("open", open); bar.classList.toggle("open", open); burger.setAttribute("aria-expanded", String(open)); burger.setAttribute("aria-label", open ? "Close menu" : "Open menu"); };
  on(burger, "click", () => set(!menu.classList.contains("open")));
  on(menu, "click", (e) => { if (e.target.closest("a")) set(false); });
  on(document, "keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("open")) { set(false); burger.focus(); } });

  // active section
  let activeEl = null, hoverEl = null;
  on(document, "nexus:active", (e) => {
    activeEl = links.find(a => a.dataset.nav === e.detail) || null;
    links.forEach(a => { a.classList.toggle("on", a === activeEl); if (a === activeEl) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
    retarget();
  });
  links.forEach(a => {
    on(a, "pointerenter", () => { hoverEl = a; retarget(); });
    on(a, "pointerleave", () => { hoverEl = null; retarget(); });
    on(a, "focus", () => { hoverEl = a; retarget(); });
    on(a, "blur", () => { hoverEl = null; retarget(); });
  });

  // spring underglow
  const sp = { x: 0, w: 60, tx: 0, tw: 60, vx: 0, vw: 0, on: false };
  function retarget() {
    const el = hoverEl || activeEl;
    if (!el || getComputedStyle(glow).display === "none") { glow.classList.remove("live"); sp.on = false; return; }
    const b = el.getBoundingClientRect(), p = bar.getBoundingClientRect();
    sp.tx = b.left - p.left + b.width * 0.15; sp.tw = b.width * 0.7;
    if (!sp.on) { sp.x = sp.tx; sp.w = sp.tw; sp.on = true; }
    glow.classList.add("live");
    if (ctx.tier.reduced) { sp.x = sp.tx; sp.w = sp.tw; apply(); }
  }
  const apply = () => { glow.style.transform = "translate3d(" + sp.x.toFixed(1) + "px,0,0) scaleX(" + (sp.w / 100).toFixed(3) + ")"; };
  on(window, "resize", retarget);
  ctx.unsub.push(ctx.loop.add((dt) => {
    if (!sp.on) return;
    const k = 280, c = 2 * Math.sqrt(k) * 0.7;
    sp.vx += ((sp.tx - sp.x) * k - sp.vx * c) * dt; sp.x += sp.vx * dt;
    sp.vw += ((sp.tw - sp.w) * k - sp.vw * c) * dt; sp.w += sp.vw * dt;
    apply();
  }, 27));
}
export function dispose() { offs.forEach(f => f()); offs = []; }
