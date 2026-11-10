/**
 * Page runtime: WhatsApp links, quote form, nav, reveal-on-scroll, 3D card tilt + glow, magnetic buttons,
 * custom cursor, and the lazy-started cosmic WebGL scene. Every module fails soft (the page always works).
 */
import { waLink } from "../src/config.js";
import * as processing from "../src/pricing/processing.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = mqReduce.matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const params = new URLSearchParams(location.search);
const safe = (f) => { try { f(); } catch (e) { console.warn(e); } };
if (reduced) root.classList.add("reduced");
if (fine) root.classList.add("fine");

// ---------- page behaviours ----------
safe(() => {
  $$("[data-wa]").forEach(a => { a.href = waLink(a.dataset.wa); });
  const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();
  const form = $("#quoteForm");
  form && form.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("#qName").value.trim(), s = $("#qService").value, m = $("#qMsg").value.trim(), err = $("#qErr");
    if (!n) { err.textContent = "Please enter your name."; $("#qName").focus(); return; }
    if (!s) { err.textContent = "Please choose a service."; $("#qService").focus(); return; }
    err.textContent = "";
    const text = "Hi AI Nexus × Neon AI Studio!\nName: " + n + "\nService: " + s + (m ? "\nDetails: " + m : "") + "\n\nPlease share a quote.";
    window.open(waLink(text), "_blank", "noopener");
  });
});
safe(() => processing.init({}));

// ---------- nav ----------
safe(() => {
  const burger = $("#burger"), menu = $("#menu"), bar = $("#navWrap");
  const close = () => { burger.setAttribute("aria-expanded", "false"); root.classList.remove("menu-open"); };
  burger.addEventListener("click", () => { const o = burger.getAttribute("aria-expanded") !== "true"; burger.setAttribute("aria-expanded", String(o)); root.classList.toggle("menu-open", o); });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  const links = $$("#menu a[href^='#']"), map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) { links.forEach(l => l.removeAttribute("aria-current")); const a = map.get(en.target.id); a && a.setAttribute("aria-current", "true"); } }), { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
  let lastY = 0;
  addEventListener("scroll", () => { const y = scrollY; bar.classList.toggle("scrolled", y > 24); lastY = y; }, { passive: true });
});

// ---------- reveal ----------
safe(() => {
  const els = $$(".reveal");
  if (reduced || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
  els.forEach(e => io.observe(e));
  $$(".stagger").forEach(g => [...g.children].forEach((c, i) => c.style.setProperty("--d", (i % 8) * 60 + "ms")));
});

// ---------- 3D tilt + pointer glow ----------
safe(() => {
  if (reduced) return;
  $$(".card3d").forEach(card => {
    const max = +(card.dataset.tilt || 7); let raf = 0, tx = 0, ty = 0;
    const apply = () => { raf = 0; card.style.transform = `perspective(900px) rotateX(${ty}deg) rotateY(${tx}deg) translateZ(0)`; };
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      if (e.pointerType === "mouse") { tx = (x - .5) * 2 * max; ty = -(y - .5) * 2 * max; if (!raf) raf = requestAnimationFrame(apply); }
    });
    card.addEventListener("pointerleave", () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(apply); });
  });
  if (!fine) return;
  $$("[data-magnetic]").forEach(el => {
    const s = .28;
    el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * s}px,${(e.clientY - r.top - r.height / 2) * s}px)`; });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
});

// ---------- cursor ----------
safe(() => {
  if (!fine || reduced) return;
  const ring = $("#curRing"), dotEl = $("#curDot"); if (!ring) return;
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, on = false;
  addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; if (!on) { on = true; root.classList.add("cur-on"); } }, { passive: true });
  document.addEventListener("pointerleave", () => { on = false; root.classList.remove("cur-on"); });
  addEventListener("pointerover", (e) => { root.classList.toggle("cur-hot", !!e.target.closest("a,button,select,input,textarea,label,.card3d")); }, { passive: true });
  const tick = () => { rx += (x - rx) * .2; ry += (y - ry) * .2; ring.style.transform = `translate(${rx}px,${ry}px)`; dotEl.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(tick); };
  tick();
});

// ---------- cosmic scene (lazy) ----------
function tierLevel() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4, small = Math.min(innerWidth, innerHeight) < 600, coarse = matchMedia("(pointer: coarse)").matches;
  let lv = 3; if (coarse || small) lv = 2; if (mem <= 2 || cores <= 2) lv = 1;
  const soft = (() => { try { const c = document.createElement("canvas"), g = c.getContext("webgl"); if (!g) return false; const x = g.getExtension("WEBGL_debug_renderer_info"); const r = String(x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)); const l = g.getExtension("WEBGL_lose_context"); l && l.loseContext(); return /swiftshader|llvmpipe|softpipe|software/i.test(r); } catch (e) { return false; } })();
  if (soft) lv = Math.min(lv, 1);
  const q = params.get("q"); if (q !== null && /^[0-3]$/.test(q)) lv = +q;
  return lv;
}
async function startScene() {
  const canvas = $("#cosmos"); if (!canvas || params.get("gl") === "0") return;
  let eng;
  try {
    const mod = await import("./engine.js");
    eng = mod.start(canvas, { level: tierLevel(), reduced, preserve: params.has("shot"), onLevel: (l, f) => { root.dataset.q = l; }, onLost: () => root.classList.remove("gl-on") });
  } catch (e) { console.warn("cosmos off:", e && e.message); return; }
  root.classList.add("gl-on"); root.dataset.q = eng.level;
  window.cosmos = eng;
  addEventListener("resize", () => eng.resize(), { passive: true });
  addEventListener("scroll", () => eng.scroll(scrollY), { passive: true }); eng.scroll(scrollY);
  if (!reduced) {
    addEventListener("pointermove", (e) => eng.pointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1), true), { passive: true });
    document.addEventListener("pointerleave", () => eng.pointer(0, 0, false));
    addEventListener("pointerup", (e) => { if (e.pointerType === "touch") eng.pointer(0, 0, false); }, { passive: true });
    if (matchMedia("(pointer: coarse)").matches && "DeviceOrientationEvent" in window) {
      addEventListener("deviceorientation", (e) => { if (e.gamma == null) return; eng.tilt(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30))); }, { passive: true });
    }
  }
  document.addEventListener("visibilitychange", () => document.hidden ? eng.pause() : eng.resume());
  mqReduce.addEventListener && mqReduce.addEventListener("change", () => location.reload());
}
const go = () => startScene();
const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 300));
if (document.readyState === "complete") idle(); else addEventListener("load", idle, { once: true });
