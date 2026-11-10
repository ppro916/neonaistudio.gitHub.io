/**
 * Cosmic engine — a hand-written WebGL scene, 100% procedural (no images, no video, no libraries).
 *  1. Nebula: domain-warped fbm simplex noise, time is the 3rd noise axis, so the clouds morph (rendered at
 *     reduced resolution into an FBO, upscaled with dithering - soft clouds need no more pixels).
 *  2. Starfield: 3 depth layers of points with mouse/scroll parallax and twinkle.
 *  3. Galaxy: a spiral disc of GPU particles with differential rotation that repel from the cursor.
 *  4. Tesseract: a 4D hypercube rotated in the XW / YW / ZW planes and projected 4D -> 3D -> 2D as glowing beams.
 * Adaptive quality: DPR <= 2, tier-based counts, FPS governor that steps quality down, pauses when hidden.
 */
const NOISE = `
vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}
vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
`;

const QUAD_VS = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;

const NEB_FS = (oct) => `precision highp float;varying vec2 vUv;
uniform vec2 uRes;uniform float uT;uniform vec2 uM;uniform float uS;uniform vec2 uC;uniform float uK;
${NOISE}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<${oct};i++){s+=a*snoise(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return s;}
void main(){
  vec2 uv=(vUv-.5)*vec2(uRes.x/uRes.y,1.);
  vec2 cam=uM*.05+vec2(0.,uS*.3);
  vec2 p=uv*.9+cam;
  float t=uT*.03;
  // domain-warped fbm; time is the noise z axis so the clouds morph continuously (the "4th dimension")
  vec2 q=vec2(fbm(vec3(p,t)),fbm(vec3(p+vec2(5.2,1.3),t*1.2)));
  vec2 r=vec2(fbm(vec3(p+1.7*q+vec2(1.7,9.2),t*.8)),fbm(vec3(p+1.7*q+vec2(8.3,2.8),t*1.1)));
  float f=fbm(vec3(p+1.5*r,t*.6))*.5+.5;
  float mask=smoothstep(.32,.78,snoise(vec3(p*.42+vec2(3.,7.),t*.4))*.5+.5);
  float dens=pow(smoothstep(.38,.92,f),1.5)*mask;
  vec3 col=vec3(.006,.008,.026);
  vec3 violet=vec3(.32,.11,.9),cyan=vec3(0.,.72,1.),mag=vec3(1.,.16,.62),deep=vec3(.05,.06,.24);
  col+=deep*smoothstep(.25,.85,f)*(.35+.65*mask)*.7;
  col+=violet*dens*1.05;
  col+=cyan*dens*smoothstep(.45,.95,q.x*.5+.5)*1.1;
  col+=mag*dens*smoothstep(.5,.95,r.y*.5+.5)*.9;
  col+=vec3(.7,.8,1.)*pow(dens,3.)*.7;
  col*=1.-.45*smoothstep(.55,.85,snoise(vec3(p*3.1+r*.6,t*.5))*.5+.5)*dens;
  // galaxy core + spiral arms
  vec2 g=uv-uC+cam*.4;float rad=length(g*vec2(1.,1.8));float th=atan(g.y*1.8,g.x);
  float arms=pow(.5+.5*cos(2.*th-log(rad+.02)*4.2+uT*.05+f*1.2),3.)*exp(-rad*2.4);
  float core=exp(-rad*10.)*.9+exp(-rad*3.4)*.28;
  col+=(arms*mix(cyan,violet,.45)*.55+core*vec3(.95,.8,1.))*uK;
  float vig=smoothstep(1.4,.2,length(uv*vec2(.8,1.)));
  col*=(.4+.6*vig)*(.45+.55*uK);
  gl_FragColor=vec4(col,1.);}`;

const COPY_FS = `precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform float uT;uniform float uA;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uT)*43758.5453);}
void main(){vec3 c=texture2D(uTex,vUv).rgb;c=c/(1.+c*.35);c=pow(c,vec3(.92));c+=(h(gl_FragCoord.xy)-.5)/255.*2.;gl_FragColor=vec4(c*uA,1.);}`;

const STAR_VS = `attribute vec4 a;uniform vec2 uM;uniform float uS;uniform float uT;uniform float uD;uniform vec2 uRes;varying float vB;varying float vF;
void main(){float z=a.z;vec2 p=a.xy+uM*(.015+.07*z*z)+vec2(0.,uS*(.08+.5*z));p=mod(p+1.1,2.2)-1.1;
 float tw=.6+.4*sin(uT*(1.+a.w*3.)+a.w*40.);vB=(.25+.75*z)*tw;vF=step(.985,a.w);
 gl_PointSize=(.7+2.6*z*z+vF*3.)*uD;gl_Position=vec4(p,0.,1.);}`;
const STAR_FS = `precision mediump float;varying float vB;varying float vF;void main(){vec2 c=gl_PointCoord-.5;float d=length(c);
 float s=exp(-d*d*28.)+vF*(exp(-abs(c.x)*40.)*exp(-abs(c.y)*6.)+exp(-abs(c.y)*40.)*exp(-abs(c.x)*6.))*.6;
 vec3 col=mix(vec3(.65,.8,1.),vec3(1.,.85,.95),vF);gl_FragColor=vec4(col*s*vB,1.);}`;

const GAL_VS = `attribute vec4 a;attribute vec3 c;
uniform float uT;uniform vec2 uM;uniform vec2 uC;uniform float uAsp;uniform float uD;uniform vec2 uPtr;uniform float uPtrOn;uniform float uSc;uniform float uS;
varying vec3 vC;varying float vA;
mat3 rx(float t){float c=cos(t),s=sin(t);return mat3(1,0,0,0,c,s,0,-s,c);}mat3 ry(float t){float c=cos(t),s=sin(t);return mat3(c,0,-s,0,1,0,s,0,c);}
void main(){float r=a.x;float ang=a.y+uT*(.10/(r+.25));
 vec3 p=vec3(cos(ang)*r,a.z*(.12*exp(-r*1.5)+.02),sin(ang)*r);
 p=ry(uM.x*.35+uT*.01)*rx(1.02+uM.y*.22)*p;
 p.z+=3.2;float persp=1.6/p.z;
 vec2 sp=p.xy*persp*uSc;sp.x/=uAsp;sp+=uC;sp.y+=uS;
 vec2 d=(sp-uPtr)*vec2(uAsp,1.);float L=length(d);float R=.22;
 float push=uPtrOn*smoothstep(R,0.,L)*.09;sp+=normalize(d+1e-5)/vec2(uAsp,1.)*push;
 vC=c*(1.+push*14.);vA=a.w;
 gl_PointSize=max(1.,(1.1+a.w*2.4)*persp*uD*uSc*.9);gl_Position=vec4(sp,0.,1.);}`;
const GAL_FS = `precision mediump float;varying vec3 vC;varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=dot(c,c);gl_FragColor=vec4(vC*exp(-d*18.)*(.45+.55*vA),1.);}`;

const BEAM_VS = `attribute vec2 p;attribute vec3 c;attribute float e;varying vec3 vC;varying float vE;void main(){vC=c;vE=e;gl_Position=vec4(p,0.,1.);}`;
const BEAM_FS = `precision mediump float;varying vec3 vC;varying float vE;void main(){float k=1.-abs(vE);float g=pow(k,2.2)*.65+pow(k,14.)*1.4;gl_FragColor=vec4(vC*g,1.);}`;
const DOT_VS = `attribute vec2 p;attribute vec3 c;attribute float s;varying vec3 vC;void main(){vC=c;gl_PointSize=s;gl_Position=vec4(p,0.,1.);}`;
const DOT_FS = `precision mediump float;varying vec3 vC;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float g=exp(-d*d*30.)+exp(-d*7.)*.35;gl_FragColor=vec4(vC*g,1.);}`;

function sh(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function prog(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const k = gl.getActiveUniform(p, i).name; u[k] = gl.getUniformLocation(p, k); }
  const at = {}, m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < m; i++) { const k = gl.getActiveAttrib(p, i).name; at[k] = gl.getAttribLocation(p, k); }
  return { p, u, a: at }; }
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2831853 * r()); }

// Quality levels: [dprCap, nebulaScale, octaves, starFrac, galaxyFrac]
const LEVELS = [[1, .28, 3, .35, .25], [1.25, .34, 4, .55, .45], [1.6, .42, 5, .8, .7], [2, .5, 5, 1, 1]];

export function start(canvas, opts) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.preserve });
  if (!gl) throw new Error("no-webgl");
  let level = opts.level;
  const S = { t: 0, m: [0, 0], ms: [0, 0], ptr: [9, 9], ptrOn: 0, ptrOnS: 0, scroll: 0, running: true, hero: 1 };

  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const nebProgs = {}; const neb = (o) => nebProgs[o] || (nebProgs[o] = prog(gl, QUAD_VS, NEB_FS(o)));
  const copy = prog(gl, QUAD_VS, COPY_FS), star = prog(gl, STAR_VS, STAR_FS), gal = prog(gl, GAL_VS, GAL_FS), beam = prog(gl, BEAM_VS, BEAM_FS), dot = prog(gl, DOT_VS, DOT_FS);

  // --- starfield
  const NS = 7000, sr = rnd(7), sd = new Float32Array(NS * 4);
  for (let i = 0; i < NS; i++) { sd[i * 4] = sr() * 2.2 - 1.1; sd[i * 4 + 1] = sr() * 2.2 - 1.1; sd[i * 4 + 2] = Math.pow(sr(), 2.2); sd[i * 4 + 3] = sr(); }
  const starBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, starBuf); gl.bufferData(gl.ARRAY_BUFFER, sd, gl.STATIC_DRAW);
  // --- galaxy (spiral disc, 3 arms) - shuffled so lowering the draw count thins it evenly
  const NG = 48000, gr = rnd(11), ga = new Float32Array(NG * 4), gc = new Float32Array(NG * 3);
  const cA = [0, .9, 1], cB = [.55, .25, 1], cC = [1, .35, .8], cW = [1, .9, .95];
  for (let i = 0; i < NG; i++) {
    const core = gr() < .18; let r, ang;
    if (core) { r = Math.abs(gauss(gr)) * .18; ang = gr() * 6.2832; }
    else { r = .08 + Math.pow(gr(), .9) * 1.55; const arm = Math.floor(gr() * 3); ang = arm * 2.0944 + Math.log(r + .05) * 2.4 + gauss(gr) * (.22 + .12 * r); }
    ga.set([r, ang, gauss(gr), gr()], i * 4);
    const k = Math.min(1, r / 1.4); let col = core ? cW : (gr() < .5 ? cA : gr() < .6 ? cB : cC);
    const w = core ? 1 : 1 - k * .4; gc.set([col[0] * w * .75, col[1] * w * .75, col[2] * w * .75], i * 3);
  }
  const galA = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, galA); gl.bufferData(gl.ARRAY_BUFFER, ga, gl.STATIC_DRAW);
  const galC = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, galC); gl.bufferData(gl.ARRAY_BUFFER, gc, gl.STATIC_DRAW);

  // --- tesseract topology
  const V4 = []; for (let i = 0; i < 16; i++) V4.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
  const E = []; for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (j > i) E.push([i, j]); }
  const beamData = new Float32Array(E.length * 2 * 6 * 6); // 2 tesseracts (outer + inner echo), 6 verts, (x,y,r,g,b,e)
  const dotData = new Float32Array((32 + 1) * 6);
  const beamBuf = gl.createBuffer(), dotBuf = gl.createBuffer();

  let W = 0, H = 0, dpr = 1, fbo = null, tex = null, fw = 0, fh = 0;
  function resize() {
    const L = LEVELS[level]; dpr = Math.min(window.devicePixelRatio || 1, L[0]);
    W = Math.max(1, Math.round(innerWidth * dpr)); H = Math.max(1, Math.round(innerHeight * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const nw = Math.max(2, Math.round(W * L[1])), nh = Math.max(2, Math.round(H * L[1]));
    if (nw !== fw || nh !== fh) {
      fw = nw; fh = nh; if (tex) gl.deleteTexture(tex); if (fbo) gl.deleteFramebuffer(fbo);
      tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
      fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }
  resize();

  function attr(pr, name, buf, size, stride, off) { const l = pr.a[name]; if (l === undefined || l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride, off); }
  function off(pr) { for (const k in pr.a) gl.disableVertexAttribArray(pr.a[k]); }

  const layout = () => {
    const mob = innerWidth < 768 || (innerHeight > innerWidth * 1.05 && innerWidth <= 1100), asp = innerWidth / innerHeight;
    return mob ? { gc: [0.0, 0.5], gs: 1.15, tc: [0, .5], ts: .26 * Math.min(1, asp * 1.6) } : innerWidth < 1100 ? { gc: [.46, .12], gs: 1.45, tc: [.46, .12], ts: .30 } : { gc: [.5, .12], gs: 1.7, tc: [.5, .12], ts: .34 };
  };

  // 4D rotation helpers
  function rot(v, a, b, t) { const c = Math.cos(t), s = Math.sin(t), x = v[a], y = v[b]; v[a] = x * c - y * s; v[b] = x * s + y * c; }
  function tesseract(Lo, asp, scrollNdc) {
    const t = S.t; let bi = 0, di = 0;
    const wy = S.ms[0] * .6, px = -S.ms[1] * .45;
    const pass = (scale, alpha, phase) => {
      const P = V4.map(v0 => {
        const v = v0.slice();
        rot(v, 0, 3, t * .31 + phase); rot(v, 1, 3, t * .23 + S.ms[1] * .5); rot(v, 2, 3, t * .17 + S.ms[0] * .5); rot(v, 0, 1, t * .07);
        const k = 1 / (2.8 - v[3]); let x = v[0] * k, y = v[1] * k, z = v[2] * k;   // 4D -> 3D (w-perspective)
        let c = Math.cos(wy), s = Math.sin(wy); [x, z] = [x * c + z * s, -x * s + z * c];      // pointer yaw
        c = Math.cos(px); s = Math.sin(px); [y, z] = [y * c - z * s, y * s + z * c];          // pointer pitch
        const pz = 1.9 / (3.2 + z);                                                           // 3D -> 2D
        return [Lo.tc[0] + x * pz * scale * 2.2 / asp, Lo.tc[1] + y * pz * scale * 2.2 + scrollNdc, v[3], pz];
      });
      const wpx = (asp > 1 ? 2.4 : 2.0) * dpr / H * 2 * (1 + scale);
      for (const [i, j] of E) {
        const a = P[i], b = P[j]; let dx = (b[0] - a[0]) * asp, dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l / asp, ny = dx / l; const wa = wpx * a[3] * 3, wb = wpx * b[3] * 3;
        const ca = colW(a[2], alpha), cb = colW(b[2], alpha);
        const q = [[a[0] + nx * wa, a[1] + ny * wa, ca, 1], [a[0] - nx * wa, a[1] - ny * wa, ca, -1], [b[0] + nx * wb, b[1] + ny * wb, cb, 1], [b[0] - nx * wb, b[1] - ny * wb, cb, -1]];
        for (const n of [0, 1, 2, 2, 1, 3]) { const v = q[n]; beamData.set([v[0], v[1], v[2][0], v[2][1], v[2][2], v[3]], bi); bi += 6; }
      }
      if (alpha > .8) for (const p of P) { const c = colW(p[2], 1.2); dotData.set([p[0], p[1], c[0], c[1], c[2], (5 + 9 * p[3]) * dpr * (H > W ? .8 : 1)], di); di += 6; }
    };
    pass(Lo.ts, 1, 0); pass(Lo.ts * .46, .4, 1.3);
    // core glow
    const g = .45 * S.hero; dotData.set([Lo.tc[0], Lo.tc[1] + scrollNdc, .2 * g, .45 * g, 1 * g, Lo.ts * H * .9], di); di += 6;
    return [bi / 6, di / 6];
  }
  function colW(w, a) { const k = (w + 1) / 2, h = S.hero * a; return [(.0 + k * 1.0) * h, (.85 - k * .55) * h, 1 * h]; }

  let raf = 0, last = performance.now(), frames = 0, acc = 0, slow = 0, fade = 0; const t0 = performance.now();
  function frame(now) {
    raf = S.running ? requestAnimationFrame(frame) : 0;
    let dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!opts.reduced) S.t += dt; fade = Math.min(1, (now - t0) / 1100);
    const k = 1 - Math.exp(-dt * 3.5); S.ms[0] += (S.m[0] - S.ms[0]) * k; S.ms[1] += (S.m[1] - S.ms[1]) * k;
    S.ptrOnS += (S.ptrOn - S.ptrOnS) * (1 - Math.exp(-dt * 6));
    // governor
    frames++; acc += dt; if (acc > 1.5) { const fps = frames / acc; frames = 0; acc = 0;
      if (fps < 42 && level > 0) { if (++slow >= 1) { level--; slow = 0; resize(); opts.onLevel && opts.onLevel(level, fps); } } else slow = 0; }
    draw();
  }
  function draw() {
    const L = LEVELS[level], Lo = layout(), asp = W / H;
    const scrollNdc = S.scroll / innerHeight * 2;              // tesseract + galaxy scroll with the hero
    S.hero = Math.max(0, 1 - S.scroll / (innerHeight * .9));
    const scrollBg = S.scroll / innerHeight;                    // drift for nebula / stars
    // 1. nebula -> fbo
    const np = neb(L[2]); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, fw, fh); gl.disable(gl.BLEND); gl.useProgram(np.p);
    gl.uniform2f(np.u.uRes, fw, fh); gl.uniform1f(np.u.uT, S.t + 40); gl.uniform2f(np.u.uM, S.ms[0], S.ms[1]); gl.uniform1f(np.u.uS, scrollBg * .25);
    gl.uniform1f(np.u.uK, .35 + .65 * S.hero); gl.uniform2f(np.u.uC, Lo.gc[0] * asp * .5, Lo.gc[1] * .5 + Math.min(scrollNdc, 2.5) * .5 * .6);
    attr(np, "p", quad, 2, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); off(np);
    // 2. upscale to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(copy.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(copy.u.uTex, 0); gl.uniform1f(copy.u.uT, S.t % 10); gl.uniform1f(copy.u.uA, .25 + .75 * fade);
    attr(copy, "p", quad, 2, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); off(copy);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    // 3. stars
    gl.useProgram(star.p); gl.uniform2f(star.u.uM, S.ms[0], S.ms[1]); gl.uniform1f(star.u.uS, scrollBg * .5); gl.uniform1f(star.u.uT, S.t); gl.uniform1f(star.u.uD, dpr);
    attr(star, "a", starBuf, 4, 0, 0); gl.drawArrays(gl.POINTS, 0, Math.floor(NS * L[3])); off(star);
    // 4. galaxy particles
    gl.useProgram(gal.p); gl.uniform1f(gal.u.uT, S.t + 30); gl.uniform2f(gal.u.uM, S.ms[0], S.ms[1]); gl.uniform2f(gal.u.uC, Lo.gc[0], Lo.gc[1]);
    gl.uniform1f(gal.u.uAsp, asp); gl.uniform1f(gal.u.uD, dpr); gl.uniform2f(gal.u.uPtr, S.ptr[0], S.ptr[1]); gl.uniform1f(gal.u.uPtrOn, S.ptrOnS); gl.uniform1f(gal.u.uSc, Lo.gs); gl.uniform1f(gal.u.uS, Math.min(scrollNdc, 2.5) * .6);
    attr(gal, "a", galA, 4, 0, 0); attr(gal, "c", galC, 3, 0, 0); gl.drawArrays(gl.POINTS, 0, Math.floor(NG * L[4])); off(gal);
    // 5. tesseract
    if (S.hero > .01) {
      const [nb, nd] = tesseract(Lo, asp, scrollNdc);
      gl.useProgram(beam.p); gl.bindBuffer(gl.ARRAY_BUFFER, beamBuf); gl.bufferData(gl.ARRAY_BUFFER, beamData.subarray(0, nb * 6), gl.DYNAMIC_DRAW);
      attr(beam, "p", beamBuf, 2, 24, 0); attr(beam, "c", beamBuf, 3, 24, 8); attr(beam, "e", beamBuf, 1, 24, 20); gl.drawArrays(gl.TRIANGLES, 0, nb); off(beam);
      gl.useProgram(dot.p); gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf); gl.bufferData(gl.ARRAY_BUFFER, dotData.subarray(0, nd * 6), gl.DYNAMIC_DRAW);
      attr(dot, "p", dotBuf, 2, 24, 0); attr(dot, "c", dotBuf, 3, 24, 8); attr(dot, "s", dotBuf, 1, 24, 20); gl.drawArrays(gl.POINTS, 0, nd); off(dot);
    }
  }

  const api = {
    get level() { return level; }, get dpr() { return dpr; }, size: () => [W, H, fw, fh],
    pointer(nx, ny, on) { S.m[0] = nx; S.m[1] = ny; S.ptr[0] = nx; S.ptr[1] = ny; S.ptrOn = on ? 1 : 0; },
    tilt(nx, ny) { S.m[0] = nx; S.m[1] = ny; },
    scroll(y) { S.scroll = y; if (!raf) draw(); },
    resize() { resize(); if (!raf) draw(); },
    pause() { S.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (opts.reduced) { draw(); return; } if (!raf) { S.running = true; last = performance.now(); raf = requestAnimationFrame(frame); } },
    drawOnce() { fade = 1; draw(); },
  };
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); api.pause(); opts.onLost && opts.onLost(); });
  if (opts.reduced) { fade = 1; draw(); } else api.resume();
  return api;
}
