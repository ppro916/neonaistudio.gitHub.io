/**
 * Adaptive quality governor. Measures a rolling 60-frame window; when the average is below 45fps
 * it applies the next downgrade step (bloom samples -> DoF -> halve particles -> fog -> static hero),
 * at most one step per 2 seconds.  Disable with ?governor=off (used for headless / software GL testing).
 * @module perf/fpsMonitor
 */
const WINDOW = 60, THRESHOLD = 45, COOLDOWN = 2.0, WARMUP = 3.0;
let buf = [], idx = 0, sum = 0, since = 0, step = 0, steps = [], enabled = true, fps = 60, started = 0;

/**
 * @param {{steps:Array<()=>void>}} cfg downgrade functions, in order
 */
export function init(cfg) {
  steps = cfg.steps; step = 0; buf = new Array(WINDOW).fill(0); idx = 0; sum = 0; since = 0; started = 0;
  enabled = new URLSearchParams(location.search).get("governor") !== "off";
}
/** Feed one frame. @param {number} dt seconds @returns {number} current rolling fps */
export function tick(dt) {
  if (dt <= 0) return fps;
  started += dt; since += dt;
  sum += dt - buf[idx]; buf[idx] = dt; idx = (idx + 1) % WINDOW;
  fps = 1 / Math.max(sum / WINDOW, 1e-4);
  if (enabled && started > WARMUP && since > COOLDOWN && fps < THRESHOLD && step < steps.length) {
    since = 0; buf.fill(0); sum = 0;
    try { steps[step++](); } catch (e) { /* ignore */ }
  }
  return fps;
}
export const getFps = () => fps;
export const getStep = () => step;
export function dispose() { steps = []; buf = []; }
