/**
 * Device capability / viewport tier detection.
 * tiers: "high" (>=1280) | "mid" (768-1279) | "simple" (480-767) | "static" (<=479, reduced-data, save-data)
 * @module perf/deviceTier
 */
const ORDER = ["static", "simple", "mid", "high"];

/**
 * @returns {{tier:string, reduced:boolean, reducedData:boolean, coarse:boolean, particles:number, bloomScale:number, dof:boolean, glow:boolean, aberration:boolean, cursor:boolean, width:number}}
 */
export function detect() {
  const w = window.innerWidth;
  const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
  const reduced = mm("(prefers-reduced-motion: reduce)");
  const reducedData = mm("(prefers-reduced-data: reduce)");
  const coarse = mm("(pointer: coarse)");
  const conn = navigator.connection || {};
  const saveData = !!conn.saveData;
  const q = new URLSearchParams(location.search).get("tier");

  let i = w >= 1280 ? 3 : w >= 768 ? 2 : w >= 480 ? 1 : 0;
  if ((navigator.hardwareConcurrency || 4) < 4 || (navigator.deviceMemory || 4) <= 2) i = Math.min(i, 2);
  if (reducedData || saveData) i = 0;
  if (q && ORDER.includes(q)) i = ORDER.indexOf(q);
  const tier = ORDER[i];
  return {
    tier, reduced, reducedData, coarse, width: w,
    particles: { high: 1200, mid: 450, simple: 250, static: 0 }[tier],
    bloomScale: { high: 1, mid: 0.7, simple: 0.7, static: 0 }[tier],
    dof: tier === "high",
    glow: tier === "high",
    aberration: tier === "high",
    cursor: tier !== "static" && !coarse && !reduced,
  };
}
