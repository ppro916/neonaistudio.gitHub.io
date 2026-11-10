/**
 * Motion polish layer (homepage). Inspired by the motion vocabulary of modern showcase sites; all code is our own.
 *  - masked word-rise for section headings (split at word level; gradient ".hl" words stay intact)
 *  - scroll progress beam (CSS scroll-timeline where supported, rAF fallback)
 *  - section "enter" state that draws the kicker rule and lifts the heading
 *  - card hover lift is handled in app.js tilt (translateY) and CSS
 * Everything is transform/opacity/clip only (compositor-friendly) and is skipped under prefers-reduced-motion.
 */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function init() {
  if (reduced) return;
  const root = document.documentElement;
  root.classList.add("motion");

  // 1. word-rise headings
  $$(".sec .sh h2, .about-copy h2, .ww-copy h2, .qinfo h2, .strip h2").forEach(h => {
    if (h.dataset.split) return; h.dataset.split = "1";
    let i = 0;
    const wrap = (node) => {
      const out = document.createDocumentFragment();
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(" ")); return; }
          const o = document.createElement("span"); o.className = "wd"; const n = document.createElement("span"); n.className = "wi"; n.style.setProperty("--i", i++);
          n.textContent = part; o.appendChild(n); out.appendChild(o);
        });
      } else {
        const o = document.createElement("span"); o.className = "wd"; const n = document.createElement("span"); n.className = "wi"; n.style.setProperty("--i", i++);
        n.appendChild(node.cloneNode(true)); o.appendChild(n); out.appendChild(o);
      }
      return out;
    };
    const kids = [...h.childNodes]; h.textContent = "";
    kids.forEach(k => h.appendChild(wrap(k)));
  });

  // 2. section enter state (draws kicker rule, triggers word-rise) - once per section
  const io = new IntersectionObserver((ents) => ents.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("on"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -18% 0px", threshold: 0.05 });
  $$("main > section").forEach(s => io.observe(s));

  // 3. scroll progress beam
  const bar = document.createElement("div"); bar.className = "sprog"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  if (!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"))) {
    let raf = 0;
    const upd = () => { raf = 0; const max = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`; };
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true }); upd();
  }
}
