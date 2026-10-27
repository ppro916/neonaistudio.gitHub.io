# AI Nexus × Neon AI Studio — cinematic 3D site

Static site. **No build step for consumers**: upload the folder to any static host (or `python3 -m http.server`) and open `index.html`.
Babylon.js 7.54.3 is loaded asynchronously from the official CDN (`cdn.babylonjs.com`) after the page has loaded, so it never blocks LCP.

## Structure
```
index.html              prerendered page (all copy, 24 services, 2 plans, SEO, JSON-LD, a11y)
src/main.js             entry; creates the single window.nexus namespace, one central rAF (src/loop.js)
src/config.js           WA_NUMBER, YOUTUBE_URL (TODO), SHOWREEL_ID, BABYLON_URL
src/3d/                 engine, materials (PBR + custom GLSL), post-FX, particles, dispose registry
src/3d/scenes/          hero core, pricing panels, contact command centre, shared layout
src/scroll/             scroll driver + section observer (custom, no GSAP)
src/interaction/        nav (holographic command bar), tilt, magnetic, hover, cursor
src/pricing/            plans.js, processing.js (Get Plan state machine)
src/perf/               device tier + FPS governor
src/fallback/cssHero.js CSS-only hero used when WebGL/Babylon is unavailable
src/styles/             tokens, typography, layout, components
assets/                 self-hosted fonts, pre-rendered hero stills
```
Every module exports `init()` and `dispose()`.

## URL switches (for testing)
- `?tier=static|simple|mid|high` force a device tier
- `?gl=0` skip WebGL (CSS hero)
- `?gl=force` or `?governor=off` render WebGL even on a software renderer / disable the FPS governor
  (software renderers such as SwiftShader are auto-downgraded to the CSS hero)

## Tiers
>=1280 full · 768–1279 reduced · 480–767 simplified, hero-focused · <=479 static pre-rendered hero (no WebGL).
`prefers-reduced-motion`, `prefers-reduced-data` and Save-Data are honoured.

## TODO before launch
- `src/config.js` → `YOUTUBE_URL` is empty; put the channel URL there and in the Socials link.
- `neonfevocon.png` (logo) was not supplied: JSON-LD `logo` still points to `https://neonaistudio.in/neonfevocon.png`. Upload that file or update the URL.

## Developer tools (not needed to serve the site)
`index.src.html` + `node tools/build-static.mjs` regenerate `index.html` (prerenders services/plans/JSON-LD).
`node tools/inline-glsl.mjs` regenerates `src/3d/shaders/*.glsl.js` from the `.glsl` sources.
These two folders are not included in the distributable zip.
