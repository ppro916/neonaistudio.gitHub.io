/**
 * IntersectionObserver registry: section reveal, active-nav tracking, lazy scene init
 * (rootMargin 200px) and render pause when the canvas is off-screen.
 * @module scroll/observer
 */
const obs = [];
/**
 * @param {Element|Element[]|NodeList} els
 * @param {(entry:IntersectionObserverEntry)=>void} cb
 * @param {IntersectionObserverInit} [opts]
 * @returns {() => void} stop
 */
export function observe(els, cb, opts = {}) {
  if (!("IntersectionObserver" in window)) { [].concat(Array.from(els.length !== undefined ? els : [els])).forEach(e => cb({ target: e, isIntersecting: true })); return () => {}; }
  const io = new IntersectionObserver(es => es.forEach(cb), opts);
  (els.length !== undefined ? Array.from(els) : [els]).forEach(e => io.observe(e));
  obs.push(io);
  return () => { io.disconnect(); const i = obs.indexOf(io); if (i >= 0) obs.splice(i, 1); };
}
export function init(ctx) {
  const st = ctx.state;
  // active section for the nav
  const ids = ["about", "services", "plans", "hosting", "quote", "socials", "contact"];
  const secs = ids.map(id => document.getElementById(id)).filter(Boolean);
  observe(secs, (e) => {
    if (e.isIntersecting) { st.active = e.target.id; document.dispatchEvent(new CustomEvent("nexus:active", { detail: e.target.id })); }
  }, { rootMargin: "-45% 0px -50% 0px" });
  const hero = document.getElementById("top");
  observe(hero, (e) => { if (e.isIntersecting) { st.active = ""; document.dispatchEvent(new CustomEvent("nexus:active", { detail: "" })); } }, { rootMargin: "-45% 0px -50% 0px" });
  // reveal-on-scroll for blocks (opacity/translate only; content is visible without JS)
  const rev = document.querySelectorAll(".reveal");
  if (ctx.tier.reduced) rev.forEach(el => el.classList.add("in"));
  else observe(rev, (e) => { if (e.isIntersecting) e.target.classList.add("in"); }, { rootMargin: "0px 0px -8% 0px" });
}
export function dispose() { obs.splice(0).forEach(o => o.disconnect()); }
