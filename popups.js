/* Queen of the Seas: Three.js pop-up panels. Parchment and gold drawn on a canvas, with real 3D stars, gems,
   chests and tridents in front of it, flown in and out by the ui clock. */
(() => {
'use strict';
const Q = window.QOS, TH = window.THREE, S = Q.S, E = Q.Ease;
const Pop = Q.Pop = { open: null };
const Z = 200;

const imgCache = {};
Q.img = (src) => imgCache[src] || (imgCache[src] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));

function wrap(g, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(' '); let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
function goldGrad(g, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff6cf'); gr.addColorStop(0.4, '#f0c35a'); gr.addColorStop(0.62, '#b27a1e'); gr.addColorStop(0.82, '#ffe7a0'); gr.addColorStop(1, '#a8701c');
  return gr;
}
// Sculpted enamel controls: metal casing, recessed face and a restrained light sweep.
const BTN = {
  gold: { a: '#299e85', b: '#096458', c: '#033e40', ink: '#fff4d5', rim: true },
  aqua: { a: '#29758e', b: '#12495f', c: '#092c43', ink: '#edfaff', rim: true },
  coral: { a: '#bd6c65', b: '#873f4a', c: '#512839', ink: '#fff2de', rim: true },
  dim: { a: '#697b81', b: '#46575e', c: '#303e47', ink: '#d0dade', rim: false }
};
function buttonMesh(label, w, h, style = 'gold', sub) {
  const u = S.dpr * 2, W = Math.round(w * u), H = Math.round(h * u), st = BTN[style] || BTN.gold;
  const tex = S.canvasTex(W, H, (g) => {
    const box = (x, y, bw, bh, r) => { g.beginPath(); g.roundRect(x*u,y*u,bw*u,bh*u,r*u); };
    const grad = (stops, y0=0, y1=H) => { const gr=g.createLinearGradient(0,y0,0,y1); stops.forEach(([at,col])=>gr.addColorStop(at,col)); return gr; };
    const r = Math.min(14, h * .26);
    // Lower edge establishes depth without a plastic bubble highlight.
    box(2,5,w-4,h-7,r); g.fillStyle='#021a25';g.fill();
    box(2,1,w-4,h-7,r);g.fillStyle=st.rim ? grad([[0,'#fff0b9'],[.20,'#c99a4f'],[.48,'#8b602c'],[.72,'#e9c779'],[1,'#855528']]) : '#7c8c90';g.fill();
    box(4,3,w-8,h-11,r-2);g.fillStyle='#142b34';g.fill();
    box(5,4,w-10,h-13,r-3);g.fillStyle=grad([[0,st.a],[.48,st.b],[1,st.c]]);g.fill();
    g.save();g.clip();
    const light=g.createRadialGradient(W*.3,0,0,W*.3,0,W*.65);
    light.addColorStop(0,'rgba(210,255,242,.19)');light.addColorStop(1,'rgba(210,255,242,0)');
    g.fillStyle=light;g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(198,242,231,.15)';g.lineWidth=.6*u;
    // Fine engraved wave lines on the enamel.
    for(let i=0;i<3;i++){g.beginPath();g.moveTo(W*.57,H*(.65+i*.08));g.bezierCurveTo(W*.72,H*(.2+i*.08),W*.8,H*(1+i*.05),W,H*(.45+i*.09));g.stroke();}
    g.restore();
    box(6,5,w-12,h-15,r-4);g.lineWidth=.6*u;g.strokeStyle='rgba(225,255,244,.35)';g.stroke();
    let fs = H*.34;
    g.font=`900 ${fs}px Nunito, sans-serif`;
    while(g.measureText(label).width > W*.79 && fs>8*u){fs-=.5*u;g.font=`900 ${fs}px Nunito, sans-serif`;}
    g.textAlign='center';g.textBaseline='middle';
    g.shadowColor='#011823';g.shadowOffsetY=1.4*u;g.shadowBlur=1.5*u;
    g.fillStyle=st.ink;g.fillText(label,W/2,H/2-2*u);g.shadowBlur=0;g.shadowOffsetY=0;
    // Tiny metal studs keep the silhouette clean and jewel-like.
    if(w>180 && st.rim) for(const x of [13,w-13]){
      g.beginPath();g.arc(x*u,(h/2-2)*u,1.4*u,0,Math.PI*2);g.fillStyle='#eed698';g.fill();
    }
  });
  const m = new TH.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new TH.Mesh(S.G.plane, m); mesh.scale.set(w, h, 1); mesh.userData.w = w; mesh.userData.h = h; mesh.renderOrder = 12;
  return mesh;
}

// spec.items: list of { k, ... }; returns a built pop-up
async function build(spec) {
  const W = S.W, H = S.H;
  const cw = Math.min(W * 0.94, spec.width || 440), s = cw / 440;
  const pad = 26 * s, inner = cw - pad * 2;
  const meas = document.createElement('canvas').getContext('2d');
  const font = (w, px, fam = 'Nunito, sans-serif') => `${w} ${px}px ${fam}`;
  // resolve any images first
  for (const it of spec.items) if (it.src) it.img = await Q.img(it.src);
  const frame = await Q.img('assets/board_frame.webp');
  const parch = await Q.img('assets/parchment.webp');
  const lay = [];
  let y = pad + 40 * s;
  for (const it of spec.items) {
    let h = 0;
    if (it.k === 'eyebrow') { it.px = 12 * s; meas.font = font(800, it.px, 'Cinzel, serif'); it.lines = wrap(meas, it.text.toUpperCase(), inner); h = it.lines.length * it.px * 1.35; }
    else if (it.k === 'title') { it.px = (it.size || 30) * s; meas.font = font(900, it.px, 'Cinzel, serif'); it.lines = wrap(meas, it.text, inner); h = it.lines.length * it.px * 1.12 + 4 * s; }
    else if (it.k === 'text') { it.px = (it.size || 16) * s; meas.font = font(it.weight || 700, it.px); it.lines = wrap(meas, it.text, inner); h = it.lines.length * it.px * 1.3; }
    else if (it.k === 'space') h = (it.h || 10) * s;
    else if (it.k === 'image') { it.w = Math.min(inner, (it.w || 300) * s); it.ih = it.img ? it.w * (it.ratio || it.img.height / it.img.width) : it.w * 0.6; h = it.ih; }
    else if (it.k === 'prop') h = (it.h || 90) * s;
    else if (it.k === 'buttons') { const bh = 52 * s; it.bh = bh; h = it.row ? bh : it.list.length * bh + (it.list.length - 1) * 10 * s; }
    else if (it.k === 'shoprow') { it.rh = 68 * s; h = it.rh; meas.font = font(700, 13 * s); it.lines = wrap(meas, it.sub, inner - it.rh - 130 * s); }
    lay.push({ it, y, h }); y += h;
  }
  const ph = y + pad;
  const u = S.dpr, CW = Math.round(cw * u), CH = Math.round(ph * u);
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d'); g.scale(u, u);
  // parchment and gold
  const R = 22 * s;
  g.save(); g.beginPath(); g.roundRect(4, 4, cw - 8, ph - 8, R); g.clip();
  if (parch) { const k = Math.max(cw / parch.width, ph / parch.height); g.drawImage(parch, (cw - parch.width * k) / 2, (ph - parch.height * k) / 2, parch.width * k, parch.height * k); }
  else { g.fillStyle = '#efe0bd'; g.fillRect(0, 0, cw, ph); }
  const vg = g.createRadialGradient(cw / 2, ph / 2, Math.min(cw, ph) * 0.3, cw / 2, ph / 2, Math.max(cw, ph) * 0.75);
  vg.addColorStop(0, 'rgba(255,252,240,.65)'); vg.addColorStop(1, 'rgba(130,155,150,.12)'); g.fillStyle = vg; g.fillRect(0, 0, cw, ph);
  g.restore();
  g.beginPath(); g.roundRect(4, 4, cw - 8, ph - 8, R); g.lineWidth = 7 * s + 3; g.strokeStyle = '#4a2f0a'; g.stroke();
  g.beginPath(); g.roundRect(4, 4, cw - 8, ph - 8, R); g.lineWidth = 7 * s; g.strokeStyle = goldGrad(g, 0, ph); g.stroke();
  g.beginPath(); g.roundRect(4 + 7 * s, 4 + 7 * s, cw - 8 - 14 * s, ph - 8 - 14 * s, R - 6 * s); g.lineWidth = 1.4; g.strokeStyle = 'rgba(90,58,14,.7)'; g.stroke();
  for (const [px, py] of [[14 * s, 14 * s], [cw - 14 * s, 14 * s], [14 * s, ph - 14 * s], [cw - 14 * s, ph - 14 * s]]) {
    const pg = g.createRadialGradient(px - 2 * s, py - 2 * s, 0, px, py, 7 * s); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.6, '#f1e6dc'); pg.addColorStop(1, '#b9a89a');
    g.beginPath(); g.arc(px, py, 6.5 * s, 0, 7); g.fillStyle = pg; g.fill(); g.lineWidth = 1; g.strokeStyle = '#6b4512'; g.stroke();
  }
  if (frame) { const sc = frame.naturalWidth / 1024, crW = 300 * sc, crH = 120 * sc, dW = 150 * s, dH = dW * crH / crW; g.drawImage(frame, 512 * sc - crW / 2, 0, crW, crH, cw / 2 - dW / 2, -dH * 0.18, dW, dH); }
  // contents
  const props = [], buttons = [], updaters = [];
  for (const { it, y: iy, h } of lay) {
    if (it.k === 'eyebrow') { g.font = font(800, it.px, 'Cinzel, serif'); g.fillStyle = it.color || '#7a4c12'; g.textAlign = 'center'; g.textBaseline = 'top'; it.lines.forEach((l, i) => g.fillText(l.split('').join(String.fromCharCode(8202)), cw / 2, iy + i * it.px * 1.35)); }
    else if (it.k === 'title') {
      g.font = font(900, it.px, 'Cinzel, serif'); g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round';
      it.lines.forEach((l, i) => { const ly = iy + i * it.px * 1.12; g.lineWidth = it.px * 0.14; g.strokeStyle = '#3b2306'; g.strokeText(l, cw / 2, ly); g.fillStyle = it.color || goldGrad(g, ly, ly + it.px); g.fillText(l, cw / 2, ly); });
    }
    else if (it.k === 'text') { g.font = font(it.weight || 700, it.px); g.fillStyle = it.color || '#3b2a14'; g.textAlign = it.align || 'center'; g.textBaseline = 'top'; it.lines.forEach((l, i) => g.fillText(l, it.align === 'left' ? pad : cw / 2, iy + i * it.px * 1.3)); }
    else if (it.k === 'image' && it.img) {
      const x = (cw - it.w) / 2; g.save(); g.beginPath();
      if (it.circle) g.arc(cw / 2, iy + it.ih / 2, it.ih / 2, 0, 7); else g.roundRect(x, iy, it.w, it.ih, 14 * s);
      g.clip();
      const ia = it.img.width / it.img.height, ba = it.w / it.ih; let sw = it.img.width, sh = it.img.height, sx = 0, sy = 0;
      if (ia > ba) { sw = sh * ba; sx = (it.img.width - sw) / 2; } else { sh = sw / ba; sy = (it.img.height - sh) * (it.focusY ?? 0.5); }
      g.drawImage(it.img, sx, sy, sw, sh, x, iy, it.w, it.ih); g.restore();
      g.beginPath(); if (it.circle) g.arc(cw / 2, iy + it.ih / 2, it.ih / 2, 0, 7); else g.roundRect(x, iy, it.w, it.ih, 14 * s);
      g.lineWidth = 5 * s; g.strokeStyle = goldGrad(g, iy, iy + it.ih); g.stroke(); g.lineWidth = 1.2; g.strokeStyle = '#4a2f0a'; g.stroke();
    }
    else if (it.k === 'prop') { it.paint?.(g, cw / 2, iy, inner, h, s); props.push({ it, cy: iy + h / 2, h }); }
    else if (it.k === 'buttons') {
      const bw = it.row ? (inner - 12 * s * (it.list.length - 1)) / it.list.length : Math.min(inner, 300 * s);
      it.list.forEach((b, i) => {
        const m = buttonMesh(b.label, bw, it.bh, b.style);
        const bx = it.row ? -inner / 2 + bw / 2 + i * (bw + 12 * s) : 0;
        const by = it.row ? iy + it.bh / 2 : iy + it.bh / 2 + i * (it.bh + 10 * s);
        m.userData.fn = b.fn; m.userData.ly = by; m.userData.lx = bx; m.userData.disabled = b.disabled;
        buttons.push(m);
      });
    }
    else if (it.k === 'shoprow') {
      const x0 = pad;
      g.beginPath(); g.roundRect(x0, iy + 2 * s, inner, it.rh - 4 * s, 14 * s); g.fillStyle = 'rgba(255,250,235,.55)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(122,82,22,.55)'; g.stroke();
      if (it.img) g.drawImage(it.img, x0 + 6 * s, iy + 6 * s, it.rh - 12 * s, it.rh - 12 * s);
      g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#3b2306'; g.font = font(900, 15 * s, 'Cinzel, serif');
      g.fillText(it.title, x0 + it.rh, iy + 10 * s);
      g.font = font(700, 13 * s); g.fillStyle = '#5a4020'; it.lines.forEach((l, i) => g.fillText(l, x0 + it.rh, iy + 30 * s + i * 15 * s));
      const m = buttonMesh(it.btn.label, 112 * s, 40 * s, it.btn.disabled ? 'dim' : 'aqua');
      m.userData.fn = it.btn.disabled ? null : it.btn.fn; m.userData.lx = cw / 2 - pad - 62 * s; m.userData.ly = iy + it.rh / 2; buttons.push(m);
    }
  }
  const tex = new TH.CanvasTexture(cv); tex.colorSpace = TH.SRGBColorSpace;
  const pm = new TH.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  const panel = new TH.Mesh(S.G.plane, pm); panel.scale.set(cw, ph, 1); panel.renderOrder = 10;
  const group = new TH.Group(); const body = new TH.Group(); group.add(body); body.add(panel);
  const toLocal = (ly) => ph / 2 - ly;
  for (const b of buttons) { b.position.set(b.userData.lx, toLocal(b.userData.ly), 4); b.userData.base = b.scale.clone(); body.add(b); }
  for (const p of props) { const obj = p.it.make?.(s, inner, p.h, updaters); if (obj) { obj.position.y += toLocal(p.cy); obj.position.z += 40; body.add(obj); } }
  const fit = Math.min(1, (H * 0.95) / ph, (W * 0.98) / cw);
  group.scale.setScalar(S.zk(Z) * fit); group.position.z = Z;
  return { group, body, panel, pm, tex, buttons, updaters, cw, ph, spec };
}

let veil = null;
function ensureVeil() {
  if (veil) return veil;
  const m = new TH.MeshBasicMaterial({ color: 0x01121e, transparent: true, opacity: 0, depthWrite: false });
  veil = new TH.Mesh(S.G.plane, m); veil.position.z = 170; veil.renderOrder = 9; veil.visible = false; S.scene.add(veil);
  return veil;
}
function sizeVeil() { if (veil) { const k = S.zk(170) * 1.2; veil.scale.set(S.W * k, S.H * k, 1); } }

let token = 0;
Pop.show = async (specFn) => {
  const my = ++token;
  const old = Pop.open; Pop.open = { building: true };
  document.getElementById('ui').classList.add('veiled');
  if (old && old.group) closeAnim(old, true);
  const v = ensureVeil(); sizeVeil(); v.visible = true;
  Q.ui.to(v.material, { opacity: 0.6 }, 260);
  const spec = typeof specFn === 'function' ? specFn() : specFn;
  const p = await build(spec);
  if (my !== token) { disposePop(p); return; }
  p.specFn = specFn; Pop.open = p;
  S.scene.add(p.group);
  const sc = p.group.scale.x;
  p.body.position.y = -S.H * 0.45; p.body.rotation.x = -0.9; p.group.scale.setScalar(sc * 0.7);
  Q.Snd.play('swap', { rate: 0.7, vol: 0.7 });
  p.sc0 = sc;
  Q.ui.add(560, (e) => {
    if (p.settled) return;
    p.body.position.y = -S.H * 0.45 * (1 - e); p.body.rotation.x = -0.9 * (1 - e);
    p.group.scale.setScalar(sc * (0.7 + 0.3 * e)); p.pm.opacity = Math.min(1, e * 2);
    p.buttons.forEach(b => b.material.opacity = Math.min(1, e * 2));
  }, { ease: E.outBack }).then(() => { if (Pop.open === p) p.ready = true; });
  for (let i = 0; i < 10; i++) S.bubbleBurst((Math.random() - 0.5) * p.cw, -p.ph * 0.5 * Math.random(), Z + 20, 40, 1, Q.ui);
  spec.onShow?.(p);
  return p;
};
function disposePop(p) { p.group.parent?.remove(p.group); p.tex.dispose(); p.pm.dispose(); p.buttons.forEach(b => { b.material.map?.dispose(); b.material.dispose(); }); }
function closeAnim(p, quick) {
  const sc = p.group.scale.x;
  return Q.ui.add(quick ? 160 : 240, (e) => { p.group.scale.setScalar(sc * (1 - 0.25 * e)); p.body.position.y = -e * 60; p.pm.opacity = 1 - e; p.buttons.forEach(b => b.material.opacity = 1 - e); p.group.traverse(o => { if (o.material && o.material.transparent === false && o.isMesh) o.visible = e < 0.6; }); }, { ease: E.inQuad })
    .then(() => disposePop(p));
}
Pop.close = async () => {
  const p = Pop.open; if (!p) return;
  token++; Pop.open = null;
  if (p.building) { Q.ui.to(veil.material, { opacity: 0 }, 220).then(() => { if (!Pop.open) veil.visible = false; }); document.getElementById('ui').classList.remove('veiled'); return; }
  Q.ui.to(veil.material, { opacity: 0 }, 220).then(() => { if (!Pop.open) veil.visible = false; });
  document.getElementById('ui').classList.remove('veiled');
  await closeAnim(p);
};
Pop.relayout = () => {
  sizeVeil();
  const p = Pop.open; if (!p || !p.specFn) return;
  const keep = p.specFn; token++; disposePop(p); Pop.open = null;
  build(typeof keep === 'function' ? keep() : keep).then(np => {
    if (Pop.open) { disposePop(np); return; }
    np.specFn = keep; np.ready = true; np.pm.opacity = 1; np.buttons.forEach(b => b.material.opacity = 1); Pop.open = np; S.scene.add(np.group); np.spec.onShow?.(np, true);
  });
};
const ray = new TH.Raycaster(), ndc = new TH.Vector2();
function hit(x, y) {
  const p = Pop.open; if (!p || !p.buttons) return null;
  ndc.set((x / S.W) * 2 - 1, -(y / S.H) * 2 + 1); ray.setFromCamera(ndc, S.camera);
  const h = ray.intersectObjects(p.buttons, false)[0];
  return h ? h.object : null;
}
Pop.pointerDown = (x, y) => {
  if (Pop.open?.buttons && !Pop.open.ready) settle(Pop.open);
  const b = hit(x, y);
  if (!b && Pop.open?.ready && Pop.open.spec.outside) {
    ndc.set((x / S.W) * 2 - 1, -(y / S.H) * 2 + 1); ray.setFromCamera(ndc, S.camera);
    if (!ray.intersectObject(Pop.open.panel, false).length) { Q.Snd.play('tap'); const f = Pop.open.spec.outside; f === true ? Pop.close() : f(); return; }
  } if (!b) return;
  press(b);
};
// a press counts as soon as the panel is built, even while it is still flying in
function press(b) {
  const p = Pop.open; if (!p || !p.buttons || !b || !b.userData.fn || p.pressing) return;
  if (!p.ready) settle(p);
  p.pressing = true; Q.Snd.play('tap');
  const base = b.userData.base;
  Q.ui.add(150, (e) => { const k = 1 - 0.045 * Math.sin(e * Math.PI); b.scale.set(base.x * k, base.y * k, 1); }).then(() => { if (Pop.open) Pop.open.pressing = false; b.userData.fn(); });
}
function settle(p) {
  p.settled = true; p.ready = true;
  p.body.position.y = 0; p.body.rotation.x = 0; if (p.sc0) p.group.scale.setScalar(p.sc0); p.group.updateMatrixWorld(true);
  p.pm.opacity = 1; p.buttons.forEach(b => b.material.opacity = 1);
}
function focusBtn(p, i) {
  const live = p.buttons.filter(b => b.userData.fn); if (!live.length) return;
  p.focus = (i + live.length) % live.length;
  for (const m of p.buttons) { const base = m.userData.base, k = m === live[p.focus] ? 1.025 : 1; m.scale.set(base.x * k, base.y * k, 1); }
}
// keyboard: Enter or Space presses the highlighted button (the first one unless moved), Tab and arrows move it
Pop.key = (e) => {
  const p = Pop.open; if (!p || !p.buttons) return false;
  const live = p.buttons.filter(b => b.userData.fn); if (!live.length) return false;
  const k = e.key;
  if (k === 'Enter' || k === ' ' || k === 'Spacebar') { press(live[p.focus || 0]); return true; }
  if (k === 'Tab' || k === 'ArrowDown' || k === 'ArrowRight') { focusBtn(p, (p.focus || 0) + 1); return true; }
  if (k === 'ArrowUp' || k === 'ArrowLeft') { focusBtn(p, (p.focus || 0) - 1); return true; }
  return false;
};
Pop.pointerMove = (x, y, canvas) => {
  const p = Pop.open; if (!p || !p.buttons) return;
  const b = hit(x, y);
  for (const m of p.buttons) { const on = m === b && m.userData.fn; const base = m.userData.base; const k = on ? 1.025 : 1; m.scale.set(base.x * k, base.y * k, 1); }
  canvas.style.cursor = b && b.userData.fn ? 'pointer' : '';
};
Pop.tick = (dt, now) => {
  const p = Pop.open; if (!p || !p.updaters) return;
  for (const f of p.updaters) f(dt, now);
};

// ---------- props ----------
Q.props = {
  stars(n, delay = 300) {
    return { k: 'prop', h: 100, make(s, w, h, up) {
      const g = new TH.Group();
      for (let i = 0; i < 3; i++) {
        const lit = i < n;
        const m = new TH.Mesh(S.G.star, lit ? S.MF.gold : new TH.MeshStandardMaterial({ color: 0x6b5a48, metalness: 0.6, roughness: 0.6, transparent: true, opacity: 0.55 }));
        const sz = (i === 1 ? 40 : 32) * s; m.position.set((i - 1) * 78 * s, i === 1 ? 10 * s : -4 * s, 0); m.scale.setScalar(0.001); g.add(m);
        const t0 = delay + i * 260;
        Q.ui.add(lit ? 520 : 300, (e) => { m.scale.setScalar(sz * Math.max(0.001, e)); m.rotation.y = (1 - e) * Math.PI * 2; }, { delay: t0, ease: E.outBackBig, start: () => { if (lit) { Q.Snd.play('chime', { rate: 1 + i * 0.12 }); const wp = m.getWorldPosition(new TH.Vector3()); S.glow(wp.x, wp.y, Z + 60, 110 * s, 0xffe28a, 520, { clock: Q.ui }); S.spark(wp.x, wp.y, Z + 70, 60 * s, 600, Q.ui); } } });
        up.push((dt, t) => { if (m.scale.x > sz * 0.9) m.rotation.y = Math.sin(t * 0.0015 + i) * 0.35; });
      }
      return g;
    } };
  },
  pieces(list, { h = 92, size = 30, captions, gap } = {}) {
    return { k: 'prop', h: h + (captions ? 34 : 0),
      paint(g, cx, y, w, hh, s) {
        if (!captions) return;
        const step = gap ? gap * s : w / list.length;
        g.textAlign = 'center'; g.textBaseline = 'top';
        captions.forEach((c, i) => { const x = cx - (list.length - 1) * step / 2 + i * step; const [a, b] = c.split('|');
          g.font = `900 ${11.5 * s}px Cinzel, serif`; g.fillStyle = '#3b2306'; g.fillText(a, x, y + h * s);
          g.font = `700 ${11 * s}px Nunito, sans-serif`; g.fillStyle = '#6b4a22'; g.fillText(b || '', x, y + h * s + 15 * s); });
      },
      make(s, w, hh, up) {
        const g = new TH.Group(); const step = gap ? gap * s : w / list.length;
        list.forEach(([t, sp], i) => {
          const n = S.makePiece(t, sp, false); const sz = size * s;
          n.position.set(-(list.length - 1) * step / 2 + i * step, captions ? 17 * s : 0, 0); n.scale.setScalar(0.001); g.add(n);
          Q.ui.add(420, (e) => n.scale.setScalar(sz * Math.max(0.001, e)), { delay: 250 + i * 90, ease: E.outBackBig });
          up.push((dt, t2) => S.animatePiece(n, t2 * 1.4, false));
        });
        return g;
      } };
  },
  chest(onOpen) {
    return { k: 'prop', h: 150, make(s, w, h, up) {
      const g = new TH.Group(); const k = 46 * s;
      const wood = new TH.MeshStandardMaterial({ color: 0x124c64, roughness: 0.28, metalness: 0.55 });
      const woodIn = new TH.MeshStandardMaterial({ color: 0x071d31, roughness: 0.8 });
      const gold = S.MF.gold;
      const base = new TH.Group(); g.add(base);
      const box = new TH.Mesh(new TH.BoxGeometry(2.2, 1.2, 1.4), wood); box.position.y = -0.2; base.add(box);
      const inside = new TH.Mesh(new TH.BoxGeometry(2.0, 0.1, 1.2), woodIn); inside.position.y = 0.38; base.add(inside);
      for (const x of [-0.85, 0.85]) { const band = new TH.Mesh(new TH.BoxGeometry(0.16, 1.26, 1.46), gold); band.position.set(x, -0.2, 0); base.add(band); }
      const trim = new TH.Mesh(new TH.BoxGeometry(2.26, 0.12, 1.46), gold); trim.position.y = 0.38; base.add(trim);
      const lock = new TH.Mesh(new TH.BoxGeometry(0.34, 0.42, 0.1), gold); lock.position.set(0, 0.12, 0.74); base.add(lock);
      // Raised panels, gold feet and individually set rivets.
      const inset = new TH.MeshStandardMaterial({color: 0x082d47, metalness: 0.45, roughness: 0.3});
      for (const x of [-0.46, 0.46]) {
        const panel = new TH.Mesh(new TH.BoxGeometry(0.62, 0.72, 0.06), inset); panel.position.set(x,-0.18,0.73); base.add(panel);
      }
      for (const x of [-0.92,0.92]) for (const z of [-0.54,0.54]) {
        const foot = new TH.Mesh(new TH.BoxGeometry(0.3,0.22,0.3),gold); foot.position.set(x,-0.87,z);base.add(foot);
      }
      const rivetGeo = new TH.SphereGeometry(0.055,10,8);
      for (const x of [-0.85,0.85]) for (const y of [-0.65,-0.28,0.1,0.33]) {
        const rivet = new TH.Mesh(rivetGeo,gold); rivet.position.set(x,y,0.76);base.add(rivet);
      }
      const jewel = new TH.Mesh(new TH.OctahedronGeometry(0.21),S.MF.aqua);jewel.position.set(0,0.08,0.84);base.add(jewel);
      const clasp = new TH.Mesh(new TH.TorusGeometry(0.25,0.045,8,24),gold);clasp.position.set(0,0.08,0.82);base.add(clasp);
      const coins = new TH.Group(); coins.position.set(0,0.43,0);g.add(coins);
      const coinGeo = new TH.CylinderGeometry(0.14,0.14,0.045,16);
      for(let i=0;i<24;i++) {
        const coin = new TH.Mesh(coinGeo,gold); coin.position.set(((i*7)%11-5)*0.16,Math.floor(i/8)*0.045,((i*3)%7-3)*0.14);coins.add(coin);
      }
      const hinge = new TH.Group(); hinge.position.set(0, 0.42, -0.7); g.add(hinge);
      const lidGeo = new TH.BoxGeometry(2.2, 0.5, 1.4); lidGeo.translate(0, 0.25, 0.7);
      hinge.add(new TH.Mesh(lidGeo, wood));
      const dome = new TH.CylinderGeometry(0.7, 0.7, 2.2, 20, 1, false, 0, Math.PI); dome.rotateZ(Math.PI / 2); dome.scale(1, 0.5, 1); dome.translate(0, 0.5, 0.7);
      const domeM = new TH.Mesh(dome, wood); hinge.add(domeM);
      for (const x of [-0.85, 0.85]) { const b = new TH.Mesh(new TH.BoxGeometry(0.16, 0.56, 1.46), gold); b.geometry.translate(x, 0.25, 0.7); hinge.add(b); }
      for(const x of [-0.85,0.85]) for(const y of [0.07,0.43]) {
        const rivet = new TH.Mesh(rivetGeo,gold);rivet.position.set(x,y,1.44);hinge.add(rivet);
      }
      const crest = new TH.Mesh(new TH.OctahedronGeometry(0.17),S.MF.aqua);crest.position.set(0,0.55,1.08);hinge.add(crest);
      const lidLock = new TH.Mesh(new TH.BoxGeometry(0.3, 0.3, 0.1), gold); lidLock.position.set(0, 0.15, 1.42); hinge.add(lidLock);
      const light = new TH.PointLight(0xffe7a0, 0, 0, 0); light.position.set(0, 0.6 * k, 0.6 * k); g.add(light);
      g.scale.setScalar(k); g.rotation.x = 0.35; g.rotation.y = -0.35; g.position.y = -14 * s;
      let opened = false, t0 = null;
      up.push((dt, t) => {
        if (t0 === null) t0 = t; const el = t - t0;
        if (!opened && el < 900) { g.rotation.z = Math.sin(el * 0.05) * 0.05 * (el / 900); }
        if (!opened && el >= 900) {
          opened = true; g.rotation.z = 0; Q.Snd.play('chest');
          Q.ui.add(520, (e) => { hinge.rotation.x = -1.9 * e; light.intensity = 4 * e; }, { ease: E.outBack });
          const wp = new TH.Vector3();
          for (let i = 0; i < 14; i++) {
            const tt = i % 5, n = S.makePiece(tt, null, false); n.scale.setScalar(0.22); n.position.set(0, 0.4, 0); g.add(n);
            const vx = (Math.random() - 0.5) * 3.2, vy = 2.2 + Math.random() * 1.6, vz = 0.5 + Math.random();
            Q.ui.add(1100 + Math.random() * 400, (e) => { n.position.set(vx * e, 0.4 + vy * e - 3.4 * e * e, vz * e); n.rotation.set(e * 6, e * 5, 0); }, { delay: 120 + i * 30, ease: E.linear })
              .then(() => g.remove(n));
          }
          g.getWorldPosition(wp);
          for (let i = 0; i < 6; i++) S.spark(wp.x + (Math.random() - 0.5) * 120 * s, wp.y + Math.random() * 80 * s, Z + 80, 40 * s, 700, Q.ui);
          onOpen?.();
        }
        if (opened) g.rotation.y = -0.35 + Math.sin(t * 0.001) * 0.12;
      });
      return g;
    } };
  },
  trident() {
    return { k: 'prop', h: 120, make(s, w, h, up) { const t = S.trident(); t.scale.setScalar(42 * s); t.position.y = -10 * s; up.push((dt, tm) => { t.rotation.y = tm * 0.0015; t.rotation.z = Math.sin(tm * 0.001) * 0.2; }); return t; } };
  }
};
})();
