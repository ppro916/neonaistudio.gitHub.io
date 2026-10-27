/**
 * The single central requestAnimationFrame loop. Every animated module (cursor, tilt, magnetic,
 * nav spring, scroll journey, Babylon render) subscribes here — nothing else calls rAF.
 * @module loop
 */
/** @type {Array<{fn:(dt:number,t:number)=>void, order:number}>} */
let subs = [];
let raf = 0, last = 0, running = false;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
  last = now;
  for (let i = 0; i < subs.length; i++) subs[i].fn(dt, now / 1000);
}

/**
 * @param {(dt:number,t:number)=>void} fn
 * @param {number} [order] lower runs first
 * @returns {() => void} unsubscribe
 */
export function add(fn, order = 0) {
  const s = { fn, order };
  subs = subs.concat(s).sort((a, b) => a.order - b.order);
  return () => { subs = subs.filter(x => x !== s); };
}

export function init() {
  if (running) return;
  running = true; last = 0;
  raf = requestAnimationFrame(frame);
}
export function dispose() {
  running = false; cancelAnimationFrame(raf); subs = [];
}
