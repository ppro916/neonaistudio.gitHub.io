/**
 * Post-processing: DefaultRenderingPipeline (HDR, ACES tone mapping, bloom thr 0.6 / weight 0.4,
 * hero-only depth of field, restrained chromatic aberration) + GlowLayer on the high tier.
 * @module 3d/postfx
 */
let fx = null;

/** @param {object} gl shared GL context @param {object} ctx nexus context */
export function init(gl, ctx) {
  const { B, scene, camera } = gl;
  const t = ctx.tier;
  const p = new B.DefaultRenderingPipeline("nexus-fx", true, scene, [camera]);
  p.samples = t.tier === "high" ? 4 : t.tier === "mid" ? 2 : 1;
  p.bloomEnabled = true;
  p.bloomThreshold = 0.6;
  p.bloomWeight = 0.4 * Math.max(t.bloomScale, 0.5);
  p.bloomKernel = 48;
  p.bloomScale = 0.5;
  p.imageProcessingEnabled = true;
  const ip = p.imageProcessing;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.15;
  ip.contrast = 1.12;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 2.2;
  ip.vignetteStretch = 0.3;
  ip.vignetteColor = new B.Color4(0.016, 0.024, 0.05, 0);
  p.chromaticAberrationEnabled = t.aberration;
  if (t.aberration) {
    p.chromaticAberration.aberrationAmount = 14; // px at the frame edge, radial; ~0.35 normalised
    p.chromaticAberration.radialIntensity = 1.2;
  }
  p.depthOfFieldEnabled = false;
  if (t.dof) {
    p.depthOfFieldBlurLevel = B.DepthOfFieldEffectBlurLevel.Low;
    p.depthOfField.fStop = 2.4;
    p.depthOfField.focalLength = 50;
    p.depthOfField.lensSize = 50;
    p.depthOfField.focusDistance = 9500;
  }
  let glow = null;
  if (t.glow) {
    glow = new B.GlowLayer("nexus-glow", scene, { mainTextureFixedSize: 384, blurKernelSize: 24 });
    glow.intensity = 0.4;
  }
  fx = { p, glow, dofAllowed: t.dof, dofOn: false, bloomBase: p.bloomWeight };
  gl.fx = fx;
}

/** Per-frame: DoF only while hero is in focus. @param {object} gl @param {number} stage @param {number} dist camera->core distance (units) */
export function update(gl, stage, dist) {
  if (!fx) return;
  if (fx.dofAllowed) {
    if (!fx.dofOn && stage < 0.3) { fx.p.depthOfFieldEnabled = true; fx.dofOn = true; }
    else if (fx.dofOn && stage > 0.6) { fx.p.depthOfFieldEnabled = false; fx.dofOn = false; }
    if (fx.dofOn) fx.p.depthOfField.focusDistance = dist * 1000;
  }
}

/** Governor step 1: cheaper bloom, no glow layer. */
export function reduceBloom() {
  if (!fx) return;
  fx.p.bloomKernel = 24; fx.p.bloomScale = 0.35; fx.p.bloomWeight = fx.bloomBase * 0.8; fx.p.samples = 1;
  if (fx.glow) fx.glow.intensity = 0;
  fx.p.chromaticAberrationEnabled = false;
}
/** Governor step 2: DoF off permanently. */
export function disableDof() {
  if (!fx) return;
  fx.dofAllowed = false; fx.p.depthOfFieldEnabled = false; fx.dofOn = false;
}
export function dispose() {
  if (!fx) return;
  try { if (fx.glow) fx.glow.dispose(); fx.p.dispose(); } catch (e) { /* ignore */ }
  fx = null;
}
