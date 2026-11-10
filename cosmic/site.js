/**
 * Runtime for the inner pages (about, FAQ, service pages, privacy, thank-you, 404 …): mobile menu, footer year,
 * and the same procedural WebGL cosmos as the homepage (nebula + stars + galaxy; the 4D tesseract stays a homepage
 * hero feature). Fails soft: without WebGL / JS the CSS gradient sky still shows and every link works.
 */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
const safe = (f) => { try { f(); } catch (e) { console.warn(e); } };
if (reduced) root.classList.add("reduced");

safe(() => { $$(".yr").forEach(el => { el.textContent = new Date().getFullYear(); }); });
safe(() => {
  const burger = $("#burger"), menu = $("#menu"), bar = $("#navWrap"); if (!burger) return;
  const close = () => { burger.setAttribute("aria-expanded", "false"); root.classList.remove("menu-open"); };
  burger.addEventListener("click", () => { const o = burger.getAttribute("aria-expanded") !== "true"; burger.setAttribute("aria-expanded", String(o)); root.classList.toggle("menu-open", o); });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  addEventListener("scroll", () => bar.classList.toggle("scrolled", scrollY > 24), { passive: true });
});

function level() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4, small = Math.min(innerWidth, innerHeight) < 600;
  let lv = (small || matchMedia("(pointer: coarse)").matches) ? 1 : 2; if (mem <= 2 || cores <= 2) lv = 0;
  const q = params.get("q"); if (q !== null && /^[0-3]$/.test(q)) lv = +q;
  return lv;
}
async function sky() {
  const canvas = $("#cosmos"); if (!canvas || params.get("gl") === "0") return;
  let eng;
  try { const mod = await import("./engine.js"); eng = mod.start(canvas, { level: level(), reduced, preserve: params.has("shot"), onLost: () => root.classList.remove("gl-on") }); }
  catch (e) { console.warn("cosmos off:", e && e.message); return; }
  root.classList.add("gl-on");
  const off = () => innerHeight * 0.95 + scrollY * 0.25;   // park the hero tesseract off-screen, keep the galaxy drifting
  eng.scroll(off());
  addEventListener("resize", () => { eng.resize(); eng.scroll(off()); }, { passive: true });
  addEventListener("scroll", () => eng.scroll(off()), { passive: true });
  if (!reduced) {
    addEventListener("pointermove", (e) => eng.pointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1), true), { passive: true });
    document.addEventListener("pointerleave", () => eng.pointer(0, 0, false));
  }
  document.addEventListener("visibilitychange", () => document.hidden ? eng.pause() : eng.resume());
}
const go = () => sky();
const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 300));
if (document.readyState === "complete") idle(); else addEventListener("load", idle, { once: true });
