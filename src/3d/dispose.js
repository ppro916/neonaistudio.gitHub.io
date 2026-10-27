/**
 * Teardown registry: everything that owns a GPU resource or listener registers a disposer here;
 * dispose() runs them in reverse order so nothing leaks.
 * @module 3d/dispose
 */
let stack = [];
/** @param {{dispose?:Function}|Function} x object with dispose() or a function @returns the same x */
export function track(x) { stack.push(x); return x; }
/** Add an event listener that is removed on dispose. */
export function listen(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  stack.push(() => target.removeEventListener(type, fn, opts));
}
export function init() { stack = []; }
export function dispose() {
  for (let i = stack.length - 1; i >= 0; i--) {
    const x = stack[i];
    try { typeof x === "function" ? x() : x && x.dispose && x.dispose(); } catch (e) { /* keep going */ }
  }
  stack = [];
}
