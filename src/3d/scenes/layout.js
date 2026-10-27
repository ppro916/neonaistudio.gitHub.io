/**
 * Shared world-space layout constants so hero nodes, pricing panels and the command center line up.
 * @module 3d/scenes/layout
 */
export const PANEL = { w: 3.6, h: 5.0, z: 2.0, y: 0.2, xs: [-2.7, 2.7], tilt: 0.105 /* ~6deg on X */ };
export const GRID = { nx: 4, ny: 4, nz: 3, sx: 2.2, sy: 1.9, sz: 2.2, c: [0, 0, 1.5] };
export const CONSOLE = { c: [0, -2.4, -1.0], radii: [3.4, 4.9, 6.4], span: 1.1, radar: [0, -2.36, 3.3] };
export const NODES = GRID.nx * GRID.ny * GRID.nz; // 48

/** Perimeter point of a panel for node k of n -> [x,y,z] relative to the world. */
export function panelPoint(panelIdx, k, n, out) {
  const { w, h } = PANEL, hw = w / 2 - 0.05, hh = h / 2 - 0.05;
  const per = 4 * (hw + hh) * 1.0;
  let d = (k / n) * per;
  let x, y;
  const w2 = 2 * hw, h2 = 2 * hh;
  if (d < w2) { x = -hw + d; y = hh; }
  else if ((d -= w2) < h2) { x = hw; y = hh - d; }
  else if ((d -= h2) < w2) { x = hw - d; y = -hh; }
  else { d -= w2; x = -hw; y = -hh + d; }
  // tilt on X by PANEL.tilt
  const ct = Math.cos(PANEL.tilt), st = Math.sin(PANEL.tilt);
  out[0] = PANEL.xs[panelIdx] + x;
  out[1] = PANEL.y + y * ct;
  out[2] = PANEL.z + y * st;
  return out;
}
/** Arc node: arc index j, position i of m. */
export function arcPoint(j, i, m, out) {
  const th = -CONSOLE.span + (2 * CONSOLE.span * i) / (m - 1);
  const r = CONSOLE.radii[j];
  out[0] = CONSOLE.c[0] + r * Math.sin(th);
  out[1] = CONSOLE.c[1] + 0.12 * j;
  out[2] = CONSOLE.c[2] + r * Math.cos(th);
  return out;
}
