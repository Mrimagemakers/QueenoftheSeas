/* Queen of the Seas: the Three.js stage. Camera, ocean backdrop, bubbles, the 3D sea pieces and effects. */
(() => {
'use strict';
const Q = window.QOS, TH = window.THREE;
const S = Q.S = {};

S.dpr = Math.min(window.devicePixelRatio || 1, 2);
S.time = 0;
S.FOV = 30;

S.init = (canvas) => {
  const r = S.renderer = new TH.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  r.setPixelRatio(S.dpr);
  r.outputColorSpace = TH.SRGBColorSpace;
  r.toneMapping = TH.NeutralToneMapping; r.toneMappingExposure = 1.0;
  r.localClippingEnabled = true;
  S.scene = new TH.Scene();
  S.camera = new TH.PerspectiveCamera(S.FOV, 1, 10, 20000);
  const pm = new TH.PMREMGenerator(r);
  S.scene.environment = pm.fromScene(new TH.RoomEnvironment(), 0.03).texture;
  S.scene.environmentIntensity = 0.8;
  const hemi = new TH.HemisphereLight(0xcff6ff, 0x123a52, 1.1); S.scene.add(hemi);
  const key = new TH.DirectionalLight(0xfff0d0, 2.2); key.position.set(-0.6, 1, 1.4); S.scene.add(key);
  const rim = new TH.DirectionalLight(0x6fe8ff, 1.2); rim.position.set(0.8, -0.4, 0.8); S.scene.add(rim);
  S.clipPlane = new TH.Plane(new TH.Vector3(0, -1, 0), 0);
  S.loader = new TH.TextureLoader();
  buildBackdrop(); buildBubbles();
  S.fxRoot = new TH.Group(); S.scene.add(S.fxRoot);
  S.composer = null;
  if (Q.T.bloom !== false && TH.EffectComposer) {
    try {
      const c = S.composer = new TH.EffectComposer(r);
      c.addPass(new TH.RenderPass(S.scene, S.camera));
      S.bloom = new TH.UnrealBloomPass(new TH.Vector2(256, 256), Q.T.bloom_strength ?? 0.35, 0.4, 0.96);
      c.addPass(S.bloom);
      c.addPass(new TH.OutputPass());
    } catch (e) { console.warn('bloom off', e); S.composer = null; }
  }
  makeMaterials();
};

S.resize = (W, H) => {
  S.W = W; S.H = H;
  S.renderer.setSize(W, H, false);
  S.composer?.setPixelRatio(S.dpr); S.composer?.setSize(W, H);
  const cam = S.camera; cam.aspect = W / H;
  S.D = (H / 2) / Math.tan(TH.MathUtils.degToRad(S.FOV / 2));
  cam.position.set(0, 0, S.D); cam.near = 10; cam.far = S.D + 4000; cam.updateProjectionMatrix();
  layBackdrop();
};
// CSS px (top-left origin) to world on the z=0 plane
S.wx = (x) => x - S.W / 2;
S.wy = (y) => S.H / 2 - y;
// compensate perspective so an object at depth z draws at its CSS size
S.zk = (z) => (S.D - z) / S.D;

S.render = () => { if (S.composer) S.composer.render(); else S.renderer.render(S.scene, S.camera); };

// ---------- textures drawn in code ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new TH.CanvasTexture(c); t.colorSpace = TH.SRGBColorSpace; return t;
}
S.canvasTex = canvasTex;
S.glowTex = canvasTex(128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
S.bubbleTex = canvasTex(64, 64, (g, w) => {
  const c = w / 2;
  const gr = g.createRadialGradient(c, c, c * 0.55, c, c, c * 0.95);
  gr.addColorStop(0, 'rgba(200,250,255,0.05)'); gr.addColorStop(0.8, 'rgba(220,252,255,0.55)'); gr.addColorStop(1, 'rgba(220,252,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * 0.95, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(c * 0.7, c * 0.62, c * 0.18, c * 0.11, -0.6, 0, 7); g.fill();
});
S.sparkTex = canvasTex(64, 64, (g, w) => {
  const c = w / 2; g.translate(c, c);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  for (let i = 0; i < 2; i++) { g.rotate(Math.PI / 4 * i); g.beginPath(); g.moveTo(0, -c); g.quadraticCurveTo(3, -3, c, 0); g.quadraticCurveTo(3, 3, 0, c); g.quadraticCurveTo(-3, 3, -c, 0); g.quadraticCurveTo(-3, -3, 0, -c); g.fill(); }
});
S.jetTex = canvasTex(256, 64, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(120,240,255,0)'); gr.addColorStop(0.35, 'rgba(160,250,255,.65)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.65, 'rgba(160,250,255,.65)'); gr.addColorStop(1, 'rgba(120,240,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

// ---------- the ocean behind everything ----------
const bgVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const bgFrag = `
uniform sampler2D map1; uniform sampler2D map2; uniform float mixv; uniform float time; uniform float dim; uniform vec2 s1; uniform vec2 s2; uniform float aspect;
varying vec2 vUv;
float caustic(vec2 p, float t){ float v = 0.0; for(int i=0;i<3;i++){ p += vec2(sin(p.y*1.3 + t*0.7), cos(p.x*1.1 - t*0.6)); v += pow(abs(sin(p.x + p.y)), 10.0); } return v / 3.0; }
void main(){
  vec2 uv = vUv;
  uv.x += sin(uv.y * 11.0 + time * 0.55) * 0.0022; uv.y += cos(uv.x * 9.0 + time * 0.45) * 0.0022;
  vec3 a = texture2D(map1, (uv - 0.5) * s1 + 0.5).rgb;
  vec3 b = texture2D(map2, (uv - 0.5) * s2 + 0.5).rgb;
  vec3 c = mix(a, b, mixv);
  float cs = caustic(vec2(vUv.x * aspect, vUv.y) * 5.0, time * 0.6);
  c += vec3(0.20, 0.42, 0.50) * cs * 0.16 * smoothstep(0.1, 1.0, vUv.y);
  vec2 q = vUv - 0.5; q.x *= aspect;
  float vig = smoothstep(1.05, 0.25, length(q));
  c *= mix(0.45, 1.0, vig) * dim;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
function buildBackdrop() {
  const blank = new TH.DataTexture(new Uint8Array([6, 46, 67, 255]), 1, 1); blank.needsUpdate = true; blank.colorSpace = TH.SRGBColorSpace;
  S.bgU = { map1: { value: blank }, map2: { value: blank }, mixv: { value: 0 }, time: { value: 0 }, dim: { value: 0.78 },
    s1: { value: new TH.Vector2(1, 1) }, s2: { value: new TH.Vector2(1, 1) }, aspect: { value: 1 } };
  const m = new TH.ShaderMaterial({ uniforms: S.bgU, vertexShader: bgVert, fragmentShader: bgFrag, depthWrite: false });
  S.bg = new TH.Mesh(new TH.PlaneGeometry(1, 1), m); S.bg.renderOrder = -10; S.bg.position.z = -900;
  S.scene.add(S.bg);
  S.bgKey = null; S.texCache = {};
}
function coverScale(tex) {
  const img = tex.image; if (!img || !img.width) return new TH.Vector2(1, 1);
  const va = S.W / S.H, ia = img.width / img.height;
  return va > ia ? new TH.Vector2(1, ia / va) : new TH.Vector2(va / ia, 1);
}
function layBackdrop() {
  if (!S.bg) return;
  const z = S.bg.position.z, k = (S.D - z) / S.D;
  S.bg.scale.set(S.W * k * 1.04, S.H * k * 1.04, 1);
  S.bgU.aspect.value = S.W / S.H;
  S.bgU.s1.value.copy(coverScale(S.bgU.map1.value)); S.bgU.s2.value.copy(coverScale(S.bgU.map2.value));
}
S.tex = (url) => {
  if (S.texCache[url]) return S.texCache[url];
  return (S.texCache[url] = new Promise((res) => S.loader.load(url, (t) => { t.colorSpace = TH.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, () => res(null))));
};
S.setBackdrop = async (key) => {
  if (S.bgKey === key) return; S.bgKey = key;
  const t = await S.tex('assets/' + key + '.webp'); if (!t || S.bgKey !== key) return;
  const U = S.bgU;
  if (U.map1.value.image?.width > 1) {
    U.map2.value = t; U.s2.value.copy(coverScale(t)); U.mixv.value = 0;
    await Q.ui.to(U.mixv, { value: 1 }, 900, { ease: Q.Ease.inOutSine });
    if (S.bgKey !== key) return;
    U.map1.value = t; U.s1.value.copy(coverScale(t)); U.mixv.value = 0;
  } else { U.map1.value = t; U.s1.value.copy(coverScale(t)); }
};

// ---------- drifting bubbles ----------
function buildBubbles() {
  S.bubbleSets = [];
  for (const [count, size] of [[34, 7], [16, 13]]) {
    const g = new TH.BufferGeometry(); const pos = new Float32Array(count * 3);
    g.setAttribute('position', new TH.BufferAttribute(pos, 3));
    const m = new TH.PointsMaterial({ map: S.bubbleTex, size: size * S.dpr, sizeAttenuation: false, transparent: true, depthWrite: false, opacity: 0.75 });
    const p = new TH.Points(g, m); p.frustumCulled = false; p.renderOrder = -5; S.scene.add(p);
    const seeds = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), z: -200 - Math.random() * 500, sp: 0.02 + Math.random() * 0.05, ph: Math.random() * 6.28 }));
    S.bubbleSets.push({ p, pos, seeds, g });
  }
}
function tickBubbles(dt) {
  for (const s of S.bubbleSets) {
    s.seeds.forEach((b, i) => {
      b.y += b.sp * dt / 1000; if (b.y > 1.1) { b.y = -0.1; b.x = Math.random(); }
      const k = (S.D - b.z) / S.D;
      s.pos[i * 3] = (b.x - 0.5 + Math.sin(S.time * 0.0012 + b.ph) * 0.01) * S.W * k;
      s.pos[i * 3 + 1] = (b.y - 0.5) * S.H * k; s.pos[i * 3 + 2] = b.z;
    });
    s.g.attributes.position.needsUpdate = true;
  }
}

// ---------- geometry for the pieces ----------
function flat(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; }
function fitUnit(g, r = 1) { g.computeBoundingSphere(); g.center(); g.computeBoundingSphere(); const k = r / g.boundingSphere.radius; g.scale(k, k, k); return g; }
function lathe(profile, seg, phi = 0) { const g = new TH.LatheGeometry(profile.map(([x, y]) => new TH.Vector2(x, y)), seg, phi); g.rotateX(Math.PI / 2); return g; }
const G = S.G = {};
function buildGeometry() {
  // amethyst: a round brilliant, table to the viewer
  G.amethyst = flat(fitUnit(lathe([[0, -0.95], [1.0, -0.05], [1.0, 0.05], [0.78, 0.32], [0.5, 0.42], [0, 0.42]], 10, Math.PI / 10), 1.0));
  G.amethyst.scale(1, 1, 0.75);
  // emerald: an octagonal step cut
  const e = new TH.Shape(), hw = 0.6, hh = 0.8, cut = 0.24;
  e.moveTo(-hw + cut, -hh); e.lineTo(hw - cut, -hh); e.lineTo(hw, -hh + cut); e.lineTo(hw, hh - cut); e.lineTo(hw - cut, hh); e.lineTo(-hw + cut, hh); e.lineTo(-hw, hh - cut); e.lineTo(-hw, -hh + cut); e.closePath();
  G.emerald = flat(fitUnit(new TH.ExtrudeGeometry(e, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.26, bevelSize: 0.24, bevelSegments: 2 }), 1.02));
  // sapphire: a trillion cut
  const s = new TH.Shape(); const R = 0.95;
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + i * Math.PI * 2 / 3, a1 = a - 0.22, a2 = a + 0.22;
    const p1 = [Math.cos(a1) * R, Math.sin(a1) * R], p2 = [Math.cos(a2) * R, Math.sin(a2) * R];
    if (i === 0) s.moveTo(p1[0], p1[1]); else s.lineTo(p1[0], p1[1]);
    s.quadraticCurveTo(Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.12, p2[0], p2[1]);
  }
  s.closePath();
  G.sapphire = flat(fitUnit(new TH.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.26, bevelSegments: 2, curveSegments: 3 }), 1.08));
  G.pearl = new TH.SphereGeometry(0.84, 40, 28);
  G.compassBase = new TH.CylinderGeometry(0.92, 0.86, 0.34, 48); G.compassBase.rotateX(Math.PI / 2);
  G.compassRim = new TH.TorusGeometry(0.86, 0.1, 12, 56);
  G.compassFace = new TH.CircleGeometry(0.8, 48);
  const nd = new TH.Shape(); nd.moveTo(0, 0.68); nd.lineTo(0.1, 0); nd.lineTo(0, -0.68); nd.lineTo(-0.1, 0); nd.closePath();
  G.needle = new TH.ExtrudeGeometry(nd, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  G.loop = new TH.TorusGeometry(0.16, 0.05, 8, 20);
  // the Queen's amulet: an aqua teardrop in gold
  G.tear = flat(fitUnit(lathe([[0, -1], [0.35, -0.75], [0.62, -0.25], [0.66, 0.1], [0.5, 0.5], [0.0, 0.75]].map(([x, y]) => [x, y]), 12), 0.82));
  G.tear.rotateX(-Math.PI / 2); G.tear.scale(1, 1, 0.55);
  G.bezel = new TH.TorusGeometry(0.62, 0.09, 10, 48); G.bezel.scale(0.92, 1.25, 1);
  G.shard = new TH.OctahedronGeometry(0.2, 0);
  const chev = new TH.Shape(); chev.moveTo(0, 0.32); chev.lineTo(0.26, 0); chev.lineTo(0, -0.32); chev.lineTo(0.1, 0); chev.closePath();
  G.chevron = new TH.ShapeGeometry(chev);
  G.stripe = new TH.PlaneGeometry(2.4, 0.28);
  G.sphere = new TH.SphereGeometry(1.12, 32, 20);
  const spiral = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 4, r = 0.25 + i / 80 * 0.9; spiral.push(new TH.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.62)); }
  G.spiral = new TH.TubeGeometry(new TH.CatmullRomCurve3(spiral), 120, 0.045, 6, false);
  G.halo = new TH.TorusGeometry(0.95, 0.07, 8, 48);
  G.ring = new TH.RingGeometry(0.75, 1, 48);
  G.plane = new TH.PlaneGeometry(1, 1);
  // gold star for pop-ups
  const st = new TH.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) st.lineTo(x, y); else st.moveTo(x, y); }
  st.closePath();
  G.star = new TH.ExtrudeGeometry(st, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 3 }); G.star.center();
  // trident
  G.tridentParts = (() => {
    const parts = [];
    const shaft = new TH.CylinderGeometry(0.05, 0.05, 2.2, 10); shaft.translate(0, -0.5, 0); parts.push(shaft);
    const bar = new TH.TorusGeometry(0.34, 0.05, 8, 24, Math.PI); bar.rotateZ(Math.PI); bar.translate(0, 0.72, 0); parts.push(bar);
    for (const x of [-0.34, 0, 0.34]) {
      const p = new TH.CylinderGeometry(0.045, 0.045, x ? 0.55 : 0.75, 8); p.translate(x, x ? 0.98 : 1.05, 0); parts.push(p);
      const tip = new TH.ConeGeometry(0.11, 0.3, 8); tip.translate(x, x ? 1.38 : 1.55, 0); parts.push(tip);
    }
    const knob = new TH.SphereGeometry(0.11, 12, 8); knob.translate(0, 0.62, 0); parts.push(knob);
    return TH.mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
  })();
}

// ---------- materials ----------
function makeSet(clip) {
  const planes = clip ? [S.clipPlane] : null;
  const M = (o, phys = true) => { const m = phys ? new TH.MeshPhysicalMaterial(o) : new TH.MeshStandardMaterial(o); if (planes) m.clippingPlanes = planes; return m; };
  const gem = (hex, extra = {}) => M({ color: hex, metalness: 0.23, roughness: 0.31, clearcoat: 0.24, clearcoatRoughness: 0.28, flatShading: true,
    emissive: hex, emissiveIntensity: 0.035, envMapIntensity: 0.7, specularIntensity: 0.32, ior: 1.6, ...extra });
  const set = {
    gem: [gem(0x7926ba, { iridescence: 0.15, iridescenceIOR: 1.5 }), gem(0x007c4e), gem(0x0755bf)],
    pearl: M({ color: 0xb8ada3, roughness: 0.3, metalness: 0, iridescence: 1, iridescenceIOR: 1.65, iridescenceThicknessRange: [180, 620],
      sheen: 0.6, sheenColor: new TH.Color(0xffd2ec), sheenRoughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 0.9 }),
    gold: M({ color: 0xe0a83c, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 }, false),
    goldDark: M({ color: 0x9c6a22, metalness: 1, roughness: 0.45 }, false),
    face: M({ color: 0xffffff, metalness: 0.55, roughness: 0.42, map: null }, false),
    needle: M({ color: 0xd8452f, metalness: 0.6, roughness: 0.3, emissive: 0x501008, emissiveIntensity: 0.4 }, false),
    aqua: gem(0x0fb8d0, { emissiveIntensity: 0.45, iridescence: 0.4 }),
    tide: new TH.MeshBasicMaterial({ color: 0x9ff6ff, transparent: true, opacity: 0.95, blending: TH.AdditiveBlending, depthWrite: false, side: TH.DoubleSide, clippingPlanes: planes }),
    stripe: new TH.MeshBasicMaterial({ map: S.jetTex, color: 0xffffff, transparent: true, opacity: 0.9, blending: TH.AdditiveBlending, depthWrite: false, clippingPlanes: planes }),
    shell: new TH.MeshPhysicalMaterial({ color: 0x8ff3ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false, envMapIntensity: 2, clippingPlanes: planes }),
    spiral: new TH.MeshBasicMaterial({ color: 0xbffcff, transparent: true, opacity: 0.85, blending: TH.AdditiveBlending, depthWrite: false, clippingPlanes: planes }),
    halo: Q.HEX.map(h => new TH.MeshBasicMaterial({ color: h, transparent: true, opacity: 0.58, blending: TH.AdditiveBlending, depthWrite: false, clippingPlanes: planes }))
  };
  return set;
}
function makeMaterials() {
  buildGeometry();
  S.MB = makeSet(true);   // on the board, clipped at the top of the grid
  S.MF = makeSet(false);  // in effects and pop-ups
  S.tex('assets/compass_face.webp').then(t => { if (!t) return; for (const s of [S.MB, S.MF]) { s.face.map = t; s.face.needsUpdate = true; } });
  S.shardMat = [0x9a4dff, 0x0fc277, 0x2d63ff, 0xf6efe6, 0xe8b64c].map((h, i) => new TH.MeshStandardMaterial({ color: h, metalness: i === 4 ? 1 : 0.1, roughness: 0.15, flatShading: true, emissive: h, emissiveIntensity: 0.12, transparent: true }));
  // the sea turtle model
  S.turtle = null;
  if (TH.GLTFLoader) new TH.GLTFLoader().load('assets/sea_turtle.glb', (g) => {
    const root = g.scene; const box = new TH.Box3().setFromObject(root); const size = box.getSize(new TH.Vector3()); const c = box.getCenter(new TH.Vector3());
    const k = 2.1 / Math.max(size.x, size.z);
    root.position.sub(c);
    const holder = new TH.Group(); holder.add(root); holder.scale.setScalar(k);
    // seen from above, head toward +y
    holder.rotation.x = Math.PI / 2;
    const wrap = new TH.Group(); wrap.add(holder);
    const mk = (clip) => { const w = wrap.clone(true); w.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.envMapIntensity = 0.8; if (clip) o.material.clippingPlanes = [S.clipPlane]; } }); return w; };
    S.turtle = { board: mk(true), free: mk(false) };
    Q.onTurtle?.();
  }, undefined, () => {});
}

// ---------- the pieces ----------
function gemMesh(t, M) {
  if (t === 0) return new TH.Mesh(G.amethyst, M.gem[0]);
  if (t === 1) return new TH.Mesh(G.emerald, M.gem[1]);
  if (t === 2) return new TH.Mesh(G.sapphire, M.gem[2]);
  if (t === 3) return new TH.Mesh(G.pearl, M.pearl);
  const g = new TH.Group();
  g.add(new TH.Mesh(G.compassBase, M.goldDark));
  const rim = new TH.Mesh(G.compassRim, M.gold); rim.position.z = 0.17; g.add(rim);
  const face = new TH.Mesh(G.compassFace, M.face); face.position.z = 0.175; g.add(face);
  const nd = new TH.Mesh(G.needle, M.needle); nd.position.z = 0.22; g.add(nd); g.userData.needle = nd;
  const loop = new TH.Mesh(G.loop, M.gold); loop.position.set(0, 0.98, 0); g.add(loop);
  g.scale.setScalar(0.98);
  return g;
}
function amuletMesh(M) {
  const g = new TH.Group();
  const tear = new TH.Mesh(G.tear, M.aqua); g.add(tear);
  const bz = new TH.Mesh(G.bezel, M.gold); bz.position.z = 0.05; g.add(bz);
  const loop = new TH.Mesh(G.loop, M.gold); loop.position.set(0, 0.92, 0); loop.scale.setScalar(1.3); g.add(loop);
  const sp = new TH.Sprite(new TH.SpriteMaterial({ map: S.glowTex, color: 0x5ff0ff, blending: TH.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }));
  sp.scale.setScalar(2.6); sp.position.z = -0.4; g.add(sp); g.userData.glow = sp;
  return g;
}
function turtleMesh(M, set) {
  const src = S.turtle?.[set];
  if (src) { const t = src.clone(true); return t; }
  const g = new TH.Group(); // a simple shell while the model loads
  const shell = new TH.Mesh(new TH.SphereGeometry(0.75, 20, 12), M.goldDark); shell.scale.set(0.9, 1.1, 0.45); g.add(shell);
  return g;
}
// one piece: node (position) > body (spin, squash) > parts
S.makePiece = (t, sp, onBoard = true) => {
  const M = onBoard ? S.MB : S.MF;
  const node = new TH.Group(), body = new TH.Group(); node.add(body);
  const ud = node.userData = { body, t, sp, phase: Math.random() * 6.28 };
  if (sp === 'b') { body.add(amuletMesh(M)); }
  else if (sp === 'q') {
    const halo = new TH.Mesh(G.halo, M.halo[t]); halo.position.z = -0.3; body.add(halo);
    const tt = turtleMesh(M, onBoard ? 'board' : 'free'); tt.scale.setScalar(0.95); body.add(tt); ud.turtle = tt;
    const mini = gemMesh(t, M); mini.scale.setScalar(0.32); mini.position.set(0.62, -0.62, 0.45); body.add(mini);
  } else {
    const g = gemMesh(t, M); body.add(g); ud.gem = g;
    if (sp === 'h' || sp === 'v') {
      const fx = new TH.Group(); if (sp === 'v') fx.rotation.z = Math.PI / 2;
      const stripe = new TH.Mesh(G.stripe, M.stripe); stripe.position.z = 0.75; fx.add(stripe);
      for (const s of [-1, 1]) { const c = new TH.Mesh(G.chevron, M.tide); c.position.set(s * 1.08, 0, 0.5); c.scale.x = s; fx.add(c); }
      node.add(fx); ud.fx = fx;
    } else if (sp === 'w') {
      const fx = new TH.Group();
      fx.add(new TH.Mesh(G.sphere, M.shell));
      const sp1 = new TH.Mesh(G.spiral, M.spiral); fx.add(sp1); ud.spiral = sp1;
      node.add(fx); ud.fx = fx;
    }
  }
  return node;
};
S.animatePiece = (node, t, sel) => {
  const u = node.userData, b = u.body;
  const k = sel ? 3 : 1;
  b.rotation.y = Math.sin(t * 0.0009 * k + u.phase) * (sel ? 0.8 : 0.32);
  b.rotation.x = Math.cos(t * 0.0007 + u.phase) * 0.14;
  if (u.gem?.userData?.needle) u.gem.userData.needle.rotation.z = Math.sin(t * 0.0013 + u.phase) * 0.5 + (sel ? t * 0.006 : 0);
  if (u.fx && (u.sp === 'h' || u.sp === 'v')) { const p = 0.5 + 0.5 * Math.sin(t * 0.006 + u.phase); u.fx.children.forEach((c, i) => { if (i) c.position.x = (i === 1 ? -1 : 1) * (1.02 + p * 0.16); }); }
  if (u.spiral) u.spiral.rotation.z = -t * 0.004;
  if (u.sp === 'b') { const g = b.children[0]?.userData.glow; if (g) g.material.opacity = 0.5 + 0.3 * Math.sin(t * 0.004 + u.phase); b.rotation.z = Math.sin(t * 0.0011 + u.phase) * 0.12; }
  if (u.turtle) { u.turtle.rotation.z = Math.sin(t * 0.0016 + u.phase) * 0.22; u.turtle.position.y = Math.sin(t * 0.003 + u.phase) * 0.05; }
};
S.disposeTree = (o) => { o.traverse(c => { if (c.isSprite) c.material.dispose(); }); o.parent?.remove(o); };

// ---------- effects ----------
S.glow = (x, y, z, size, color, dur = 420, { from = 0.3, to = 1.2, opacity = 0.9, clock = Q.game } = {}) => {
  const m = new TH.SpriteMaterial({ map: S.glowTex, color, blending: TH.AdditiveBlending, transparent: true, depthWrite: false, opacity });
  const s = new TH.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(size * from); S.fxRoot.add(s);
  clock.add(dur, (e) => { s.scale.setScalar(size * (from + (to - from) * e)); m.opacity = opacity * (1 - e); }).then(() => { S.fxRoot.remove(s); m.dispose(); });
  return s;
};
S.spark = (x, y, z, size, dur = 500, clock = Q.game) => {
  const m = new TH.SpriteMaterial({ map: S.sparkTex, color: 0xfff3c0, blending: TH.AdditiveBlending, transparent: true, depthWrite: false });
  const s = new TH.Sprite(m); s.position.set(x, y, z); S.fxRoot.add(s);
  const rot = Math.random() * 3;
  clock.add(dur, (e) => { const k = Math.sin(e * Math.PI); s.scale.setScalar(size * (0.3 + k)); m.rotation = rot + e * 2; m.opacity = k; }).then(() => { S.fxRoot.remove(s); m.dispose(); });
};
S.ring = (x, y, z, size, color, dur = 450, clock = Q.game) => {
  const m = new TH.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: TH.AdditiveBlending, depthWrite: false, side: TH.DoubleSide });
  const r = new TH.Mesh(G.ring, m); r.position.set(x, y, z); S.fxRoot.add(r);
  clock.add(dur, (e) => { r.scale.setScalar(size * (0.15 + e)); m.opacity = 0.85 * (1 - e); }, { ease: Q.Ease.outCubic }).then(() => { S.fxRoot.remove(r); m.dispose(); });
};
S.shards = (x, y, z, t, cs, n = 7, clock = Q.game) => {
  const mat = S.shardMat[t] || S.shardMat[4];
  for (let i = 0; i < n; i++) {
    const m = new TH.Mesh(G.shard, mat); const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const sp = cs * (0.9 + Math.random() * 0.9), vz = cs * (0.4 + Math.random());
    m.position.set(x, y, z); const s0 = cs * (0.22 + Math.random() * 0.2); m.scale.setScalar(s0);
    const rx = (Math.random() - 0.5) * 12, ry = (Math.random() - 0.5) * 12;
    S.fxRoot.add(m);
    clock.add(480 + Math.random() * 200, (e) => {
      m.position.set(x + Math.cos(a) * sp * e, y + Math.sin(a) * sp * e - cs * 0.6 * e * e, z + vz * e);
      m.rotation.set(rx * e, ry * e, 0); m.scale.setScalar(s0 * (1 - e * 0.85));
    }, { ease: Q.Ease.outQuad }).then(() => S.fxRoot.remove(m));
  }
};
S.bubbleBurst = (x, y, z, cs, n = 3, clock = Q.game) => {
  for (let i = 0; i < n; i++) {
    const m = new TH.SpriteMaterial({ map: S.bubbleTex, transparent: true, depthWrite: false, opacity: 0.9 });
    const s = new TH.Sprite(m); const sz = cs * (0.15 + Math.random() * 0.22); s.scale.setScalar(sz);
    const dx = (Math.random() - 0.5) * cs * 0.9, rise = cs * (0.9 + Math.random() * 1.2), ph = Math.random() * 6;
    s.position.set(x, y, z); S.fxRoot.add(s);
    clock.add(700 + Math.random() * 400, (e) => { s.position.set(x + dx * e + Math.sin(e * 8 + ph) * cs * 0.08, y + rise * e, z + 10); m.opacity = 0.9 * (1 - e * e); }, { ease: Q.Ease.outQuad, delay: Math.random() * 120 })
      .then(() => { S.fxRoot.remove(s); m.dispose(); });
  }
};
S.textSprite = (text, px, color = '#fff1c4', stroke = '#2b1606') => {
  const pad = px * 0.3, font = `900 ${px * S.dpr}px Cinzel, Georgia, serif`;
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = font;
  const w = Math.ceil(g.measureText(text).width + pad * 2 * S.dpr), h = Math.ceil(px * 1.5 * S.dpr);
  c.width = w; c.height = h; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = px * 0.22 * S.dpr; g.strokeStyle = stroke; g.strokeText(text, w / 2, h / 2);
  const gr = g.createLinearGradient(0, h * 0.2, 0, h * 0.8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, color); gr.addColorStop(1, color);
  g.fillStyle = gr; g.fillText(text, w / 2, h / 2);
  const t = new TH.CanvasTexture(c); t.colorSpace = TH.SRGBColorSpace;
  const m = new TH.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
  const s = new TH.Sprite(m); s.scale.set(w / S.dpr, h / S.dpr, 1); s.userData.w = w / S.dpr; s.userData.h = h / S.dpr;
  s.userData.dispose = () => { t.dispose(); m.dispose(); };
  return s;
};
S.floatText = (x, y, text, px, color, clock = Q.game) => {
  const s = S.textSprite(text, px, color); s.position.set(x, y, 160); S.fxRoot.add(s);
  const w = s.userData.w, h = s.userData.h;
  clock.add(900, (e) => {
    const pop = e < 0.15 ? Q.Ease.outBack(e / 0.15) : 1;
    s.scale.set(w * (0.6 + 0.4 * pop), h * (0.6 + 0.4 * pop), 1);
    s.position.y = y + px * 1.4 * Q.Ease.outQuad(e); s.material.opacity = e < 0.6 ? 1 : 1 - (e - 0.6) / 0.4;
  }, { ease: Q.Ease.linear }).then(() => { S.fxRoot.remove(s); s.userData.dispose(); });
};
S.trident = (M = S.MF) => { const m = new TH.Mesh(G.tridentParts, M.gold); return m; };
S.jet = (x0, y0, x1, y1, thick, dur = 300, clock = Q.game) => {
  const m = new TH.MeshBasicMaterial({ map: S.jetTex, transparent: true, blending: TH.AdditiveBlending, depthWrite: false, opacity: 1 });
  const p = new TH.Mesh(G.plane, m); const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
  p.rotation.z = ang; p.position.z = 120; S.fxRoot.add(p);
  clock.add(dur, (e) => {
    const l = len * Math.min(1, e * 1.6);
    p.scale.set(Math.max(1, l), thick * (1 - 0.5 * e), 1);
    p.position.x = x0 + Math.cos(ang) * l / 2; p.position.y = y0 + Math.sin(ang) * l / 2;
    m.opacity = e < 0.6 ? 1 : 1 - (e - 0.6) / 0.4;
  }, { ease: Q.Ease.outQuad }).then(() => { S.fxRoot.remove(p); m.dispose(); });
};

S.tick = (dt) => {
  S.time += dt;
  if (S.bgU) S.bgU.time.value = S.time / 1000;
  tickBubbles(dt);
};
})();
