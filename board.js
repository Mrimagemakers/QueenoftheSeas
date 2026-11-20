/* Queen of the Seas: the board. Rules, moves, specials, boosters and every move drawn in Three.js. */
(() => {
'use strict';
const Q = window.QOS, TH = window.THREE, S = Q.S;
let N = Q.N;
const mb = window.mindblown;
const Snd = Q.Snd, E = Q.Ease;

const B = Q.B = {
  grid: [], cs: 40, gx: 0, gy: 0, level: null, busy: false, running: false, over: true, paused: false,
  armed: null, sel: null, drag: null, hinting: null, score: 0, moves: 0, collected: 0, visible: false,
  lastInput: Date.now()
};

B.init = () => {
  B.group = new TH.Group(); B.group.visible = false; S.scene.add(B.group);
  B.pieces = new TH.Group(); B.group.add(B.pieces);
  B.panelMat = new TH.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  B.panel = new TH.Mesh(S.G.plane, B.panelMat); B.panel.renderOrder = -1; B.group.add(B.panel);
  B.selGlow = new TH.Sprite(new TH.SpriteMaterial({ map: S.glowTex, color: 0xffe7a0, blending: TH.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }));
  B.selGlow.visible = false; B.group.add(B.selGlow);
  B.frameImg = new Image(); B.frameImg.onload = () => B.drawPanel(true); B.frameImg.src = 'assets/board_frame.webp';
  setInterval(() => B.hintTick(), 500);
};

// ---------- geometry ----------
B.active = (r, c) => !B.level || Q.activeCell(B.level, r, c);
B.rowOff = (c) => (B.level?.brick && (c % 2)) ? B.cs * 0.5 : 0;
B.cx = (c) => B.gx + (c + 0.5) * B.cs;                       // CSS px
B.cy = (r, c) => B.gy + B.rowOff(c) + (r + 0.5) * B.cs;
B.X = (c) => S.wx(B.cx(c));                                    // world
B.Y = (r, c) => S.wy(B.cy(r, c));
B.layout = (rect) => {
  B.rect = rect;
  const rowsTall = N + (B.level?.brick ? 0.5 : 0);
  const cs = B.cs = Math.max(16, Math.min(rect.w / (N + 0.9), rect.h / (rowsTall + 1.0)));
  B.gx = rect.x + (rect.w - N * cs) / 2; B.gy = rect.y + (rect.h - rowsTall * cs) / 2;
  B.border = cs * 0.46;
  const pw = N * cs + B.border * 2, ph = rowsTall * cs + B.border * 2, z = -cs * 0.75, k = S.zk(z);
  B.panel.position.set(S.wx(B.gx + N * cs / 2) * k, S.wy(B.gy + rowsTall * cs / 2) * k, z);
  B.panel.scale.set(pw * k, ph * k, 1);
  S.clipPlane.constant = S.wy(B.gy) + 1;
  B.drawPanel();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const cell = B.grid[r]?.[c]; if (cell?.node) { cell.node.position.set(B.X(c), B.Y(r, c), 0); B.fit(cell); } }
};
B.drawPanel = (force) => {
  const cs = B.cs, rowsTall = N + (B.level?.brick ? 0.5 : 0), b = B.border;
  const sig = [cs, rowsTall, S.dpr, B.frameImg?.complete].join('|');
  if (!force && sig === B.panelSig) return; B.panelSig = sig;
  const W = Math.round((N * cs + b * 2) * S.dpr), H = Math.round((rowsTall * cs + b * 2) * S.dpr);
  const cv = B.panelCanvas || (B.panelCanvas = document.createElement('canvas'));
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), u = S.dpr, ox = b * u, oy = b * u, C = cs * u;
  g.clearRect(0, 0, W, H);
  // deep glass behind the cells
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  rr(ox - C * 0.12, oy - C * 0.12, N * C + C * 0.24, rowsTall * C + C * 0.24, C * 0.3);
  const gr = g.createLinearGradient(0, oy, 0, oy + rowsTall * C); gr.addColorStop(0, 'rgba(6,52,78,.82)'); gr.addColorStop(1, 'rgba(3,22,40,.88)');
  g.fillStyle = gr; if (!B.level || B.level.shape === 'rectangle') g.fill();
  for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
    if (!B.active(r, c)) continue;
    const x = ox + c * C, y = oy + (B.level?.brick && c % 2 ? C * 0.5 : 0) + r * C;
    rr(x + C * 0.05, y + C * 0.05, C * 0.9, C * 0.9, C * 0.2);
    g.fillStyle = (r + c) % 2 ? 'rgba(100,208,240,.30)' : 'rgba(100,208,240,.18)'; g.fill();
    g.lineWidth = 1.5 * u; g.strokeStyle = '#d4b96b'; g.stroke();
  }
  // Shaped boards use the gold cell outlines instead of a rectangular surround.
  if (!B.level || B.level.shape === 'rectangle') {
  // the gold rim
  const lw = b * 0.42 * u;
  rr(ox - C * 0.12 - lw / 2, oy - C * 0.12 - lw / 2, N * C + C * 0.24 + lw, rowsTall * C + C * 0.24 + lw, C * 0.36);
  const gg = g.createLinearGradient(0, 0, W, H); gg.addColorStop(0, '#fff1b8'); gg.addColorStop(0.3, '#c98f2a'); gg.addColorStop(0.5, '#ffe28a'); gg.addColorStop(0.75, '#a8701c'); gg.addColorStop(1, '#f6d27a');
  g.lineWidth = lw + 3 * u; g.strokeStyle = '#3b2306'; g.stroke();
  g.lineWidth = lw; g.strokeStyle = gg; g.stroke();
  g.lineWidth = 1.2 * u; g.strokeStyle = 'rgba(255,250,220,.8)'; rr(ox - C * 0.12 - lw * 0.1, oy - C * 0.12 - lw * 0.1, N * C + C * 0.24 + lw * 0.2, rowsTall * C + C * 0.24 + lw * 0.2, C * 0.33); g.stroke();
  // corner shells and the trident crest, cut from the painted frame
  const img = B.frameImg;
  if (img && img.complete && img.naturalWidth) {
    const s = img.naturalWidth / 1024, cw = 205 * s, cz = b * 2.1 * u;
    const corners = [[0, 0, 0, 0], [1024 * s - cw, 0, W - cz, 0], [0, 1024 * s - cw, 0, H - cz], [1024 * s - cw, 1024 * s - cw, W - cz, H - cz]];
    for (const [sx, sy, dx, dy] of corners) g.drawImage(img, sx, sy, cw, cw, dx, dy, cz, cz);
    const crW = 300 * s, crH = 120 * s, dW = b * 3.6 * u, dH = dW * crH / crW;
    g.drawImage(img, 512 * s - crW / 2, 0, crW, crH, W / 2 - dW / 2, 0, dW, dH);
    const bW = 300 * s, bH = 70 * s, eW = b * 3.2 * u, eH = eW * bH / bW;
    g.drawImage(img, 512 * s - bW / 2, 1024 * s - bH - 6 * s, bW, bH, W / 2 - eW / 2, H - eH, eW, eH);
  }
  }
  if (B.panelTex && B.panelTex.image === cv) { B.panelTex.needsUpdate = true; }
  else { B.panelTex?.dispose(); B.panelTex = new TH.CanvasTexture(cv); B.panelTex.colorSpace = TH.SRGBColorSpace; B.panelMat.map = B.panelTex; B.panelMat.needsUpdate = true; }
  B.panelTex.needsUpdate = true;
};
B.fit = (cell) => { const n = cell.node; n.userData.base = B.cs * 0.43; n.scale.setScalar(n.userData.base); };
B.makeNode = (cell, r, c, yOff = 0) => {
  const n = S.makePiece(cell.t, cell.sp, true); cell.node = n;
  n.position.set(B.X(c), B.Y(r, c) + yOff, 0); B.pieces.add(n); B.fit(cell); return n;
};
B.reskin = (cell) => {
  const p = cell.node.position.clone(); B.pieces.remove(cell.node);
  const n = S.makePiece(cell.t, cell.sp, true); n.position.copy(p); cell.node = n; B.pieces.add(n); B.fit(cell); return n;
};
Q.onTurtle = () => { for (const row of B.grid) for (const c of row || []) if (c?.sp === 'q' && c.node) B.reskin(c); };

// ---------- level ----------
B.show = (on) => { B.visible = on; B.group.visible = on; };
B.begin = (info) => {
  B.level = info;
  N = info.boardSize;
  B.moves = B.movesMax = info.moves; B.score = 0; B.collected = 0;
  B.over = false; B.busy = false; B.running = false; B.paused = false; B.armed = null; B.sel = null; B.selGlow.visible = false;
  B.panelSig = null;
  if (B.rect) B.layout(B.rect);
  B.pieces.clear(); B.fillFresh();
  if (Q.preBoost && Q.P.boost[Q.preBoost] > 0) {
    const cell = B.grid.flat().find(Boolean);
    Q.P.boost[Q.preBoost]--; cell.sp = Q.preBoost === 'trident' ? 'h' : 'b';
    if (cell.sp === 'b') cell.t = -1;
    Q.saveProgress();
  }
  Q.preBoost = null;

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = B.grid[r][c]; if (!cell) continue; const n = B.makeNode(cell, r, c, B.cs * (N + 2));
    const ty = B.Y(r, c); n.position.z = B.cs * 2;
    Q.game.to(n.position, { y: ty, z: 0 }, 520 + r * 30, { delay: c * 30 + (N - r) * 22, ease: E.outBack });
  }
  Snd.play('whoosh', { vol: 0.5, rate: 0.8 });
  B.startRun();
  Q.U.syncGoal(); Q.U.refreshBoosters();
  Q.U.say(info.kind === 'collect' ? `Collect ${info.count} ${Q.PLURAL[info.ctype]} in ${info.moves} moves! Line up three or more.` : `Reach ${Q.fmt(info.target)} points in ${info.moves} moves! Line up three or more.`, 3800, 'point');
};
B.randomType = () => { const palette = B.level?.palette || [0,1,2,3,4]; return palette[Q.rnd(palette.length)]; };
B.fillFresh = () => {
  let tries = 0;
  do {
    B.grid = [];
    for (let r = 0; r < N; r++) { B.grid[r] = []; for (let c = 0; c < N; c++) {
      if (!B.active(r, c)) { B.grid[r][c] = null; continue; }
      let t, k = 0;
      do { t = B.randomType(); k++; }
      while (k < 40 && ((c >= 2 && B.grid[r][c - 1]?.t === t && B.grid[r][c - 2]?.t === t) || (r >= 2 && B.grid[r - 1][c]?.t === t && B.grid[r - 2][c]?.t === t)
        || (r >= 1 && c >= 1 && B.grid[r - 1][c]?.t === t && B.grid[r][c - 1]?.t === t && B.grid[r - 1][c - 1]?.t === t)));
      B.grid[r][c] = { t, sp: null };
    } }
  } while ((B.findGroups().length || !B.findMove()) && ++tries < 80);
};
B.startRun = () => { B.running = true; B.runT0 = Date.now(); B.lastInput = Date.now(); mb?.run?.start(); };
B.abandon = () => {
  if (B.running && !B.over) { Q.P.voyage.streak = 0; Q.saveProgress(); }
  if (B.running && !B.over) mb?.run?.end({ score: B.score, won: false, quit: true, level: B.level?.n, moves_used: B.movesMax - B.moves, seconds: Math.round((Date.now() - B.runT0) / 1000) });
  B.running = false; B.over = true; B.busy = false; B.armed = null; B.deselect(); B.stopHint();
};
B.addScore = (n) => { B.score += n; Q.U.syncGoal(); };
B.goalDone = () => B.level.kind === 'collect' ? B.collected >= B.level.count : B.score >= B.level.target;
B.state = () => ({ running: B.running, busy: B.busy, over: B.over, paused: B.paused, score: B.score, moves: B.moves, collected: B.collected, level: B.level?.n,
  grid: B.grid.map(r => r.map(c => c ? (c.sp ? c.sp + c.t : String(c.t)) : '.').join(' ')) });

// ---------- input ----------
B.cellAt = (x, y) => {
  const c = Math.floor((x - B.gx) / B.cs); if (c < 0 || c >= N) return null;
  const r = Math.floor((y - B.gy - B.rowOff(c)) / B.cs);
  return (r >= 0 && r < N && B.active(r, c)) ? { r, c } : null;
};
B.canPlay = () => B.visible && B.running && !B.busy && !B.over && !B.paused && !Q.Pop.open;
B.down = (x, y) => {
  B.lastInput = Date.now(); B.stopHint();
  if (!B.canPlay()) return;
  const at = B.cellAt(x, y); if (!at) { B.deselect(); return; }
  if (B.armed) { B.useBooster(B.armed, at); return; }
  if (B.sel && B.sel.r === at.r && B.sel.c === at.c) { B.drag = { x, y, at }; return; }
  if (B.sel && Math.abs(B.sel.r - at.r) + Math.abs(B.sel.c - at.c) === 1) { const a = B.sel; B.deselect(); B.trySwap(a, at); return; }
  B.select(at); B.drag = { x, y, at, fresh: true };
};
B.move = (x, y) => {
  if (!B.drag || !B.sel) return;
  const dx = x - B.drag.x, dy = y - B.drag.y;
  if (Math.hypot(dx, dy) > B.cs * 0.42) {
    const a = B.drag.at; let b;
    if (Math.abs(dx) > Math.abs(dy)) b = { r: a.r, c: a.c + Math.sign(dx) }; else b = { r: a.r + Math.sign(dy), c: a.c };
    B.drag = null; B.deselect();
    if (b.r >= 0 && b.r < N && b.c >= 0 && b.c < N && B.canPlay()) B.trySwap(a, b);
  }
};
B.up = (x, y) => {
  const d = B.drag; B.drag = null;
  if (d && B.sel && Math.hypot(x - d.x, y - d.y) < B.cs * 0.3) {
    if (B.canPlay() && B.grid[d.at.r]?.[d.at.c]?.sp) { B.deselect(); B.activate(d.at); }
    else if (!d.fresh) B.deselect();
  }
};
B.select = (at) => {
  B.deselect();
  const cell = B.grid[at.r][at.c]; B.sel = at; Snd.play('crunch', { vol: 0.7 });
  cell.selected = true;
  Q.game.to(cell.node.position, { z: B.cs * 0.6 }, 140, { ease: E.outBack });
  B.selGlow.visible = true; B.selGlow.position.set(B.X(at.c), B.Y(at.r, at.c), -B.cs * 0.3); B.selGlow.scale.setScalar(B.cs * 1.9);
};
B.deselect = () => {
  if (!B.sel) return;
  const cell = B.grid[B.sel.r]?.[B.sel.c];
  if (cell?.node) { cell.selected = false; Q.game.to(cell.node.position, { z: 0 }, 120); }
  B.sel = null; B.selGlow.visible = false;
};

// ---------- hints ----------
B.hintTick = () => {
  if (!B.canPlay() || B.sel || B.armed || B.hinting) return;
  if (Date.now() - B.lastInput < (Q.T.hint_seconds ?? 6) * 1000) return;
  const m = B.findMove(); if (!m) return;
  B.hinting = [m.a, m.b].map(p => B.grid[p.r][p.c].node); B.hintT0 = S.time;
  setTimeout(() => { B.stopHint(); B.lastInput = Date.now() - (Q.T.hint_seconds ?? 6) * 500; }, 1400);
};
B.stopHint = () => { if (!B.hinting) return; for (const n of B.hinting) n.userData.body.rotation.z = 0; B.hinting = null; };

const wait = (ms) => Q.game.wait(ms);

// ---------- rules: a line of three or more, a 2x2 square, or an L, T or cross ----------
B.findGroups = () => {
  const G = B.grid, sets = [];
  const same = (a, b) => a && b && a.sp !== 'b' && b.sp !== 'b' && a.t === b.t && a.t >= 0;
  for (let r = 0; r < N; r++) { let c = 0; while (c < N) { let e = c + 1; while (e < N && same(G[r][c], G[r][e])) e++; if (e - c >= 3) sets.push({ dir: 'h', cells: Array.from({ length: e - c }, (_, i) => ({ r, c: c + i })) }); c = e; } }
  for (let c = 0; c < N; c++) { let r = 0; while (r < N) { let e = r + 1; while (e < N && same(G[r][c], G[e][c])) e++; if (e - r >= 3) sets.push({ dir: 'v', cells: Array.from({ length: e - r }, (_, i) => ({ r: r + i, c })) }); r = e; } }
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) {
    const a = G[r][c]; if (same(a, G[r][c + 1]) && same(a, G[r + 1][c]) && same(a, G[r + 1][c + 1])) sets.push({ dir: 's', cells: [{ r, c }, { r, c: c + 1 }, { r: r + 1, c }, { r: r + 1, c: c + 1 }] });
  }
  const parent = sets.map((_, i) => i); const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const owner = {};
  sets.forEach((s, i) => s.cells.forEach(p => { const k = p.r * N + p.c; if (owner[k] !== undefined) parent[find(i)] = find(owner[k]); else owner[k] = i; }));
  const groups = {};
  sets.forEach((s, i) => { const g = groups[find(i)] || (groups[find(i)] = { runs: [], squares: [], cells: new Map() }); (s.dir === 's' ? g.squares : g.runs).push(s); s.cells.forEach(p => g.cells.set(p.r * N + p.c, p)); });
  for (const g of Object.values(groups)) {
    g.max = Math.max(0, ...g.runs.map(r => r.cells.length));
    g.hasH = g.runs.some(r => r.dir === 'h'); g.hasV = g.runs.some(r => r.dir === 'v');
  }
  return Object.values(groups);
};
B.findMove = () => {
  const G = B.grid, moves = [];
  const test = (a, b) => {
    const A = G[a.r][a.c], Bc = G[b.r][b.c];
    if (!A || !Bc) return false;
    if (A.sp || Bc.sp) return true;
    G[a.r][a.c] = Bc; G[b.r][b.c] = A;
    const ka = a.r * N + a.c, kb = b.r * N + b.c;
    const ok = B.findGroups().some(g => g.cells.has(ka) || g.cells.has(kb));
    G[a.r][a.c] = A; G[b.r][b.c] = Bc; return ok;
  };
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c < N - 1 && test({ r, c }, { r, c: c + 1 })) moves.push({ a: { r, c }, b: { r, c: c + 1 } });
    if (r < N - 1 && test({ r, c }, { r: r + 1, c })) moves.push({ a: { r, c }, b: { r: r + 1, c } });
  }
  return moves.length ? moves[Q.rnd(moves.length)] : null;
};
B.formsAt = (a, b) => { const ka = a.r * N + a.c, kb = b.r * N + b.c; return B.findGroups().some(g => g.cells.has(ka) || g.cells.has(kb)); };

// ---------- swapping ----------
B.trySwap = async (a, b) => {
  if (!B.active(a.r, a.c) || !B.active(b.r, b.c)) return;
  B.busy = true; B.lastInput = Date.now(); Q.U.hideBubble();
  const G = B.grid, A = G[a.r][a.c], Bc = G[b.r][b.c];
  const d = Q.T.swap_ms ?? 170;
  Snd.play('swap', { vol: 0.8 });
  G[a.r][a.c] = Bc; G[b.r][b.c] = A;
  const arc = (n, to) => { const z0 = n.position.z; return Promise.all([Q.game.to(n.position, { x: B.X(to.c), y: B.Y(to.r, to.c) }, d, { ease: E.outBack }), Q.game.add(d, (e) => { n.position.z = z0 * (1 - e) + Math.sin(e * Math.PI) * B.cs * 0.5; })]); };
  await Promise.all([arc(A.node, b), arc(Bc.node, a)]);
  if (A.sp === 'b' || Bc.sp === 'b') { B.useMove(); await B.bombCombo(A.sp === 'b' ? b : a, A.sp === 'b' ? a : b); }
  else if (A.sp && Bc.sp) { B.useMove(); await B.specialCombo(b, a); }
  else if (A.sp || Bc.sp) {
    B.useMove(); const at = A.sp ? b : a;
    await B.clearCells(new Map([[at.r * N + at.c, at]]));
    await B.gravity(); await B.resolve(null);
  }
  else if (B.formsAt(a, b)) { B.useMove(); await B.resolve([a, b]); }
  else {
    Snd.play('nope', { vol: 0.8 });
    G[a.r][a.c] = A; G[b.r][b.c] = Bc;
    await Promise.all([arc(A.node, a), arc(Bc.node, b)]);
    A.node.position.z = 0; Bc.node.position.z = 0;
    B.busy = false;
    if (B.pendingPause) { B.pendingPause = false; Q.U.pause(); }
    return;
  }
  await B.endTurn();
};
B.activate = async (at) => {
  if (!B.canPlay() || !B.grid[at.r]?.[at.c]?.sp) return;
  B.busy = true; B.lastInput = Date.now(); B.stopHint(); Q.U.hideBubble();
  B.useMove();
  await B.clearCells(new Map([[at.r * N + at.c, at]]));
  await B.gravity(); await B.resolve(null); await B.endTurn();
};
B.specialFor = (g) => {
  if (g.max >= 5) return 'b';
  if (g.hasH && g.hasV) return 'w';
  if (g.max === 4) return g.runs.find(r => r.cells.length === 4).dir;
  return g.squares.length ? 'q' : null;
};
B.useMove = () => { B.moves--; Q.U.syncGoal(); Q.U.bump('gMoves'); };

B.resolve = async (swapCells) => {
  let cascade = 0;
  for (;;) {
    const groups = B.findGroups(); if (!groups.length) break;
    cascade++;
    const clear = new Map(), spawns = []; let gained = 0;
    for (const g of groups) {
      g.cells.forEach((p, k) => clear.set(k, p));
      const sp = B.specialFor(g);
      const cells = [...g.cells.values()];
      gained += cells.length * 60 * cascade;
      if (sp) {
        let at = swapCells?.find(p => g.cells.has(p.r * N + p.c));
        if (!at) {
          if (sp === 'q') at = g.squares[0].cells[3];
          else { const run = g.runs.reduce((x, y) => y.cells.length > x.cells.length ? y : x); at = run.cells[Math.floor(run.cells.length / 2)]; if (sp === 'w') at = B.corner(g) || at; }
        }
        spawns.push({ at, sp, t: sp === 'b' ? -1 : B.grid[at.r][at.c].t });
        gained += sp === 'b' ? 600 : sp === 'w' ? 300 : sp === 'q' ? 250 : 200;
      }
      const mid = cells[Math.floor(cells.length / 2)];
      S.floatText(B.X(mid.c), B.Y(mid.r, mid.c), '+' + (cells.length * 60 * cascade), Math.round(B.cs * 0.5), Q.CSS[B.grid[mid.r][mid.c].t] || '#fff1c4');
    }
    Snd.play('chime', { rate: Math.pow(2, Math.min(cascade - 1, 8) * 2 / 12), vol: 0.55 + Math.min(cascade, 5) * 0.06, vary: 0 });
    if (cascade >= 2) { Q.U.janice('cheer'); if (cascade >= 3) Q.U.say(['Brilliant!', 'Splendid current!', 'What a tide!', 'Queen of the Seas!'][Math.min(cascade - 3, 3)], 1100); }
    B.addScore(gained);
    await B.clearCells(clear, cascade, spawns);
    await B.gravity(cascade);
    swapCells = null;
  }
};
B.corner = (g) => {
  for (const rh of g.runs.filter(r => r.dir === 'h')) for (const rv of g.runs.filter(r => r.dir === 'v'))
    for (const p of rh.cells) if (rv.cells.some(q => q.r === p.r && q.c === p.c)) return p;
  return null;
};
B.turtleTargets = (from, exclude, n = 3) => {
  const G = B.grid, L = B.level, pool = [], pref = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const k = r * N + c; if (exclude.has(k) || !G[r][c] || (r === from.r && c === from.c)) continue;
    (L.kind === 'collect' && G[r][c].t === L.ctype ? pref : pool).push({ r, c });
  }
  const pick = []; const take = (arr) => { while (arr.length && pick.length < n) pick.push(arr.splice(Q.rnd(arr.length), 1)[0]); };
  take(pref); take(pool); return pick;
};

// expand a clear set through any specials it touches, then animate it
B.clearCells = async (clear, cascade = 1, spawns = []) => {
  const G = B.grid, cs = B.cs, L = B.level;
  const spawnKeys = new Set(spawns.map(o => o.at.r * N + o.at.c));
  const final = new Map(), queue = [...clear.values()], acts = [], delayOf = new Map();
  while (queue.length) {
    const p = queue.shift(); const k = p.r * N + p.c;
    if (final.has(k) || !G[p.r][p.c]) continue;
    final.set(k, p);
    const cell = G[p.r][p.c];
    if (cell.sp && !cell.fresh) {
      const area = B.area(cell, p, final);
      acts.push({ cell, p, area });
      if (cell.sp === 'q') area.forEach((q, i) => { if (i) delayOf.set(q.r * N + q.c, 160 + (i - 1) * 190); });
      for (const q of area) queue.push(q);
    }
  }
  let extra = 0;
  for (const a of acts) {
    extra += a.area.length * 40;
    const x = B.X(a.p.c), y = B.Y(a.p.r, a.p.c);
    if (a.cell.sp === 'h' || a.cell.sp === 'v') {
      Snd.play('whoosh', { vol: 0.9 }); B.tideFly(a.p, a.cell.sp);
    } else if (a.cell.sp === 'w') {
      Snd.play('thump', { rate: 1.25, vol: 0.9 }); Snd.duck(0.4);
      S.ring(x, y, 100, cs * 3.4, 0x7ff6ff, 480); S.ring(x, y, 100, cs * 2.4, 0xffffff, 380); S.glow(x, y, 90, cs * 4, 0x5ff0ff, 500);
      B.shake(120, cs * 0.06);
    } else if (a.cell.sp === 'b') {
      Snd.play('thump', { vol: 1 }); Snd.duck(0.7);
      S.ring(x, y, 100, cs * 6, 0x9ff8ff, 600); S.glow(x, y, 90, cs * 6, 0x5ff0ff, 650);
      for (const q of a.area) S.jet(x, y, B.X(q.c), B.Y(q.r, q.c), cs * 0.25, 360);
      B.shake(180, cs * 0.09);
    } else if (a.cell.sp === 'q') {
      Snd.play('whoosh', { vol: 0.7, rate: 0.8 }); B.turtleSwim(a.p, a.area.slice(1));
    }
  }
  if (extra) B.addScore(extra);
  const speed = Math.max(0.6, 1 - 0.1 * (cascade - 1));
  const popMs = (Q.T.pop_ms ?? 220) * speed;
  const pops = []; let n = 0;
  for (const [k, p] of final) {
    const cell = G[p.r][p.c]; if (!cell) continue;
    let delay = delayOf.get(k) ?? 0;
    if (!delayOf.has(k) && acts.length) { let dmin = 99; for (const a of acts) dmin = Math.min(dmin, Math.abs(a.p.r - p.r) + Math.abs(a.p.c - p.c)); delay = dmin * 30; }
    const node = cell.node, base = node.userData.base;
    const keep = spawnKeys.has(k);
    if (!keep) G[p.r][p.c] = null;
    if (!keep && L.kind === 'collect' && cell.t === L.ctype) { B.collected++; }
    pops.push(wait(delay).then(() => {
      if (n++ % 3 === 0) Snd.play('pop', { rate: 1 + cascade * 0.06, vol: 0.75 });
      const x = node.position.x, y = node.position.y;
      S.glow(x, y, 60, cs * 1.7, Q.HEX[cell.t] ?? 0x5ff0ff, 380, { opacity: 0.8 });
      S.shards(x, y, 40, cell.t < 0 ? 4 : cell.t, cs, 6);
      S.bubbleBurst(x, y, 50, cs, 2);
      if (cascade >= 2 && Math.random() < 0.3 + cascade * 0.1) S.spark(x + (Math.random() - 0.5) * cs * 0.6, y + (Math.random() - 0.5) * cs * 0.6, 140, cs * 0.9);
      if (!keep && L.kind === 'collect' && cell.t === L.ctype) Q.U.flyToGoal(cell.t, x, y);
      if (L.kind === 'collect') Q.U.syncGoal();
      return Q.game.add(popMs, (e) => {
        const s = e < 0.35 ? 1 + 0.3 * (e / 0.35) : 1.3 * (1 - (e - 0.35) / 0.65);
        node.scale.setScalar(base * Math.max(0.001, s)); node.userData.body.rotation.z = e * 2.4;
      }, { ease: E.linear }).then(() => { if (!keep) B.pieces.remove(node); });
    }));
  }
  await Promise.all(pops);
  for (const o of spawns) {
    const cell = G[o.at.r][o.at.c]; if (!cell) continue;
    cell.sp = o.sp; cell.t = o.t; cell.fresh = true;
    const nd = B.reskin(cell); const base = nd.userData.base; nd.scale.setScalar(0.001);
    S.ring(nd.position.x, nd.position.y, 100, B.cs * 1.8, 0xfff1b8, 380); S.glow(nd.position.x, nd.position.y, 80, B.cs * 2.4, 0xfff1b8, 420);
    const name = {w: 'Depth Bomb', q: 'Turtle Torpedo', b: 'Queen’s Amulet', h: 'Tidal Rocket', v: 'Tidal Rocket'}[o.sp];
    S.floatText(nd.position.x, nd.position.y + B.cs * 0.6, name + '!', Math.round(B.cs * 0.42), '#fff0ad');
    Q.U.say(name + ' ready! Tap to fire, or swap with another weapon for a combo.', 2800, 'cheer');
    Snd.play('crunch', { rate: 1.3 });
    Q.game.add(320, (e) => nd.scale.setScalar(base * Math.max(0.001, e)), { ease: E.outBackBig });
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (G[r][c]) G[r][c].fresh = false;
  if (spawns.length) await wait(160);
};
B.area = (cell, p, taken) => {
  const out = [];
  if (cell.sp === 'h') for (let c = 0; c < N; c++) out.push({ r: p.r, c });
  else if (cell.sp === 'v') for (let r = 0; r < N; r++) out.push({ r, c: p.c });
  else if (cell.sp === 'w') { for (let r = p.r - 1; r <= p.r + 1; r++) for (let c = p.c - 1; c <= p.c + 1; c++) if (r >= 0 && r < N && c >= 0 && c < N) out.push({ r, c }); }
  else if (cell.sp === 'b') { const t = B.commonType(); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (B.grid[r][c] && B.grid[r][c].t === t) out.push({ r, c }); }
  else if (cell.sp === 'q') { out.push(p, ...B.turtleTargets(p, taken || new Map())); }
  return out;
};
B.commonType = () => {
  const L = B.level, n = new Array(Q.TYPES).fill(0);
  for (const row of B.grid) for (const c of row) if (c && c.t >= 0) n[c.t]++;
  if (L.kind === 'collect' && n[L.ctype] > 0) return L.ctype;
  return n.indexOf(Math.max(...n));
};
B.shake = (ms, amp) => {
  const cam = S.camera;
  Q.game.add(ms, (e) => { const a = amp * (1 - e); cam.position.x = (Math.random() - 0.5) * a; cam.position.y = (Math.random() - 0.5) * a; }).then(() => { cam.position.x = 0; cam.position.y = 0; });
};
B.tideFly = (p, dir) => {
  const cs = B.cs, x = B.X(p.c), y = B.Y(p.r, p.c);
  const left = B.X(0) - cs, right = B.X(N - 1) + cs, top = B.Y(0, p.c) + cs, bot = B.Y(N - 1, p.c) - cs;
  if (dir === 'h') { S.jet(x, y, left, y, cs * 0.9, 340); S.jet(x, y, right, y, cs * 0.9, 340); }
  else { S.jet(x, y, x, top, cs * 0.9, 340); S.jet(x, y, x, bot, cs * 0.9, 340); }
  for (const sgn of [-1, 1]) {
    const tr = S.trident(); tr.scale.setScalar(cs * 0.45); tr.position.set(x, y, 130);
    tr.rotation.z = dir === 'h' ? (sgn > 0 ? -Math.PI / 2 : Math.PI / 2) : (sgn > 0 ? 0 : Math.PI);
    S.fxRoot.add(tr);
    const tx = dir === 'h' ? (sgn > 0 ? right + cs : left - cs) : x, ty = dir === 'h' ? y : (sgn > 0 ? top + cs : bot - cs);
    Q.game.to(tr.position, { x: tx, y: ty }, 300, { ease: E.inQuad }).then(() => S.fxRoot.remove(tr));
  }
};
B.turtleSwim = (from, targets) => {
  const cs = B.cs; const t = S.makePiece(0, 'q', false); t.userData.body.children[0].visible = false; t.userData.body.children[2].visible = false;
  t.scale.setScalar(cs * 0.6); t.position.set(B.X(from.c), B.Y(from.r, from.c), 140); S.fxRoot.add(t);
  let chain = Promise.resolve(); let px = t.position.x, py = t.position.y;
  targets.forEach((q, i) => {
    const tx = B.X(q.c), ty = B.Y(q.r, q.c), sx = px, sy = py;
    chain = chain.then(() => Q.game.add(i ? 190 : 160, (e) => {
      t.position.x = sx + (tx - sx) * e; t.position.y = sy + (ty - sy) * e + Math.sin(e * Math.PI) * cs * 0.6;
      t.rotation.z = Math.atan2(ty - sy, tx - sx) - Math.PI / 2;
    }, { ease: E.inOutSine }).then(() => { S.bubbleBurst(tx, ty, 150, cs, 3); }));
    px = tx; py = ty;
  });
  chain.then(() => Q.game.add(260, (e) => { t.scale.setScalar(cs * 0.6 * (1 - e)); t.position.y += cs * 0.04; })).then(() => S.fxRoot.remove(t));
};

B.announceCombo = (name, at) => {
  Q.U.say(name + '!', 2600, 'cheer');
  S.floatText(B.X(at.c), B.Y(at.r, at.c) + B.cs, name, Math.round(B.cs * 0.48), '#fff0ad');
  S.ring(B.X(at.c), B.Y(at.r, at.c), 120, B.cs * 3, 0xffd67a, 650);
};
B.bombCombo = async (bombAt, otherAt) => {
  const G = B.grid, bomb = G[bombAt.r][bombAt.c], other = G[otherAt.r][otherAt.c];
  const clear = new Map(); const add = (r, c) => clear.set(r * N + c, { r, c });
  bomb.sp = null; bomb.t = -1;
  add(bombAt.r, bombAt.c);
  const bx = B.X(bombAt.c), by = B.Y(bombAt.r, bombAt.c);
  Snd.play('thump', { vol: 1 }); Snd.duck(0.8); B.shake(220, B.cs * 0.1);
  S.ring(bx, by, 100, B.cs * 7, 0x9ff8ff, 650); S.glow(bx, by, 90, B.cs * 7, 0x5ff0ff, 700);
  Q.U.janice('cheer');
  if (other.sp === 'b') {
    other.sp = null;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) add(r, c);
    B.announceCombo('Royal Tidal Wave', bombAt); B.addScore(5000);
  } else {
    const t = other.t, targets = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (G[r][c] && G[r][c].t === t) targets.push({ r, c });
    if (other.sp) {
      B.announceCombo('Royal Arsenal', bombAt);
      for (const p of targets) { const cell = G[p.r][p.c]; if (!cell.sp) { cell.sp = other.sp === 'w' ? 'w' : other.sp === 'q' ? 'q' : (Math.random() < 0.5 ? 'h' : 'v'); B.reskin(cell); S.ring(cell.node.position.x, cell.node.position.y, 100, B.cs * 1.4, 0xfff1b8, 300); } }
      Snd.play('chime', { rate: 1.5 });
      await wait(420);
    } else {
      for (const p of targets) S.jet(bx, by, B.X(p.c), B.Y(p.r, p.c), B.cs * 0.28, 420);
      await wait(220);
    }
    for (const p of targets) add(p.r, p.c);
    B.addScore(targets.length * 80);
  }
  await B.clearCells(clear, 1);
  await B.gravity(1);
  await B.resolve(null);
};
B.specialCombo = async (at, otherAt) => {
  const G = B.grid, a = G[at.r][at.c], b = G[otherAt.r][otherAt.c];
  const clear = new Map(); const add = (r, c) => { if (r >= 0 && r < N && c >= 0 && c < N) clear.set(r * N + c, { r, c }); };
  const kinds = [a.sp, b.sp].map(k => k === 'v' ? 'h' : k).sort().join('');
  Q.U.janice('cheer');
  a.sp = null; b.sp = null;
  add(at.r, at.c); add(otherAt.r, otherAt.c);
  const x = B.X(at.c), y = B.Y(at.r, at.c);
  B.announceCombo({ww: 'Mega Depth Charge', qq: 'Torpedo Swarm', hq: 'Guided Tidal Strike', qw: 'Homing Depth Charges', hw: 'Tidal Bombstorm', hh: 'Crossfire Rockets'}[kinds] || 'Ocean Combo', at);
  if (kinds.includes('q')) {
    const other = kinds.replace('q', '') || 'q';
    const tg = B.turtleTargets(at, clear, other === 'q' ? 9 : 3);
    B.turtleSwim(at, tg); await wait(200);
    for (const p of tg) {
      if (other === 'q') add(p.r, p.c);
      else if (other === 'h') { for (let i = 0; i < N; i++) add(p.r, i); B.tideFly(p, 'h'); }
      else if (other === 'w') { for (let r = p.r - 1; r <= p.r + 1; r++) for (let c = p.c - 1; c <= p.c + 1; c++) add(r, c); S.ring(B.X(p.c), B.Y(p.r, p.c), 100, B.cs * 3.4, 0x7ff6ff, 480); }
    }
    Snd.play('thump', { rate: 1.2 });
  } else if (kinds === 'ww') {
    for (let r = at.r - 3; r <= at.r + 3; r++) for (let c = at.c - 3; c <= at.c + 3; c++) add(r, c);
    Snd.play('thump', { vol: 1 }); Snd.duck(0.6); B.shake(200, B.cs * 0.1);
    S.ring(x, y, 100, B.cs * 7.5, 0x7ff6ff, 650); S.glow(x, y, 90, B.cs * 8, 0x5ff0ff, 600);
  } else if (kinds.includes('w')) {
    for (let d = -1; d <= 1; d++) { for (let i = 0; i < N; i++) { add(at.r + d, i); add(i, at.c + d); } }
    Snd.play('whoosh', { vol: 1 }); Snd.play('thump', { rate: 1.2 });
    for (let d = -1; d <= 1; d++) { if (at.r + d >= 0 && at.r + d < N) B.tideFly({ r: at.r + d, c: at.c }, 'h'); if (at.c + d >= 0 && at.c + d < N) B.tideFly({ r: at.r, c: at.c + d }, 'v'); }
  } else {
    for (let i = 0; i < N; i++) { add(at.r, i); add(i, at.c); }
    Snd.play('whoosh', { vol: 1 }); B.tideFly(at, 'h'); B.tideFly(at, 'v');
  }
  B.addScore(clear.size * 60);
  await B.clearCells(clear, 1);
  await B.gravity(1);
  await B.resolve(null);
};

B.gravity = async (cascade = 1) => {
  const G = B.grid, cs = B.cs;
  const speed = Math.max(0.6, 1 - 0.1 * (cascade - 1));
  const per = (Q.T.fall_ms ?? 95) * speed;
  const falls = [];
  for (let c = 0; c < N; c++) {
    const rows = Array.from({length: N}, (_, r) => r).filter(r => B.active(r, c));
    const cells = rows.map(r => ({cell: G[r][c], from: r})).filter(v => v.cell);
    rows.forEach(r => { G[r][c] = null; });
    const missing = rows.length - cells.length;
    rows.forEach((r, i) => {
      const entry = cells[i - missing];
      const cell = entry ? entry.cell : {t: B.randomType(), sp: null};
      G[r][c] = cell;
      const node = entry ? cell.node : B.makeNode(cell, r, c, cs * N);
      if (!entry || entry.from !== r) falls.push(Q.game.to(node.position, {y: B.Y(r, c), z: 0}, 130 + per * Math.sqrt(N), {ease: E.outBack}));
    });
  }
  if (falls.length) Snd.play('crunch', { rate: 1.4 + cascade * 0.05, vol: 0.3 });
  await Promise.all(falls);
};

// ---------- boosters ----------
B.toggleBooster = (key) => {
  if (!B.visible || B.over) { Q.U.say('Boosters are used inside an expedition. Pick a level on the map!', 2400); return; }
  B.lastInput = Date.now();
  if (!B.canPlay() && B.armed !== key) return;
  if (Q.TOOL_UNLOCKS[key] && !Q.toolUnlocked(key)) return;
  if ((Q.P.boost[key] || 0) <= 0) { Q.U.say(`No ${key === 'trident' ? 'tridents' : 'amulets'} left. Trade pearls for more in the treasure shop!`, 2400); return; }
  B.deselect();
  if (B.armed === key) { B.armed = null; Q.U.say('Booster put away.', 900); }
  else { B.armed = key; Q.U.say(key === 'trident' ? 'Tap any row and the trident clears it!' : 'Tap a piece to turn it into the Queen\'s Amulet!', 2600, 'point'); }
  if (B.armed && Q.TOOL_UNLOCKS[key]) Q.U.say(key === 'shuffle' ? 'Tap the board to shuffle the current without spending a move.' : 'Tap a gem to place your ' + Q.TOOL_NAMES[key] + '.', 2600);
  Q.U.refreshBoosters();
};
B.useBooster = async (key, at) => {
  if (!B.canPlay() || !B.grid[at.r]?.[at.c] || !(Q.P.boost[key]>0) || (Q.TOOL_UNLOCKS[key] && !Q.toolUnlocked(key))) return;
  B.armed = null; Q.P.boost[key] = Math.max(0, (Q.P.boost[key] || 0) - 1); Q.saveProgress(); Q.U.refreshBoosters();
  B.busy = true; B.lastInput = Date.now();
  const G = B.grid, cs = B.cs;
  mb?.event?.('booster_used', { kind: key, level: B.level.n });
  if (key === 'shuffle') {
    await B.shuffle();
  } else if (key === 'trident') {
    Snd.play('whoosh', { vol: 1, rate: 0.9 });
    const tr = S.trident(); tr.scale.setScalar(cs * 0.7); tr.rotation.z = -Math.PI / 2;
    const y = B.Y(at.r, 0); tr.position.set(B.X(0) - cs * 2, y, 150); S.fxRoot.add(tr);
    S.jet(B.X(0) - cs, y, B.X(N - 1) + cs, y, cs * 1.1, 460);
    await Q.game.to(tr.position, { x: B.X(N - 1) + cs * 2 }, 440, { ease: E.inQuad });
    S.fxRoot.remove(tr);
    const clear = new Map(); for (let c = 0; c < N; c++) clear.set(at.r * N + c, { r: at.r, c });
    B.addScore(N * 60);
    await B.clearCells(clear, 1);
  } else {
    const cell = G[at.r][at.c];
    Snd.play('chime', { rate: 1.2, vol: 0.9 });
    cell.sp = key === 'bomb' ? 'w' : key === 'torpedo' ? 'q' : 'b'; if (cell.sp === 'b') cell.t = -1;
    const nd = B.reskin(cell), base = nd.userData.base; nd.scale.setScalar(0.001);
    S.ring(nd.position.x, nd.position.y, 100, cs * 2.4, 0x9ff8ff, 420); S.glow(nd.position.x, nd.position.y, 90, cs * 3, 0x5ff0ff, 500);
    await Q.game.add(320, (e) => nd.scale.setScalar(base * Math.max(0.001, e)), { ease: E.outBackBig });
    Q.U.say('Tap your weapon to fire, or combine it with another weapon!', 1800);
  }
  await B.gravity(1);
  await B.resolve(null);
  await B.endTurn();
};

// ---------- end of a turn ----------
B.endTurn = async () => {
  if (B.goalDone()) { await B.win(); return; }
  if (B.moves <= 0) { await B.lose(); return; }
  if (!B.findMove()) {
    Q.U.janice('worried'); Q.U.say('The current has tangled the pieces. Shuffling...', 1600);
    await wait(700); await B.shuffle();
  }
  B.busy = false; B.lastInput = Date.now();
  if (B.pendingPause) { B.pendingPause = false; Q.U.pause(); }
};
B.shuffle = async () => {
  const G = B.grid, cells = [], positions = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (B.active(r, c)) { cells.push(G[r][c]); positions.push({r, c}); }
  let tries = 0;
  do {
    for (let i = cells.length - 1; i > 0; i--) { const j = Q.rnd(i + 1); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    for (let i = 0; i < cells.length; i++) G[positions[i].r][positions[i].c] = cells[i];
  } while ((B.findGroups().length || !B.findMove()) && ++tries < 200);
  if (tries >= 200) {
    for (const c of cells) if (!c.sp) { c.t = B.randomType(); B.reskin(c); }
    if (B.findGroups().length || !B.findMove()) return B.shuffle();
  }
  Snd.play('swap', { rate: 0.8 });
  const ps = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (G[r][c]) ps.push(Q.game.to(G[r][c].node.position, { x: B.X(c), y: B.Y(r, c) }, 460, { ease: E.outBack }));
  await Promise.all(ps);
};
B.win = async () => {
  B.over = true;
  const L = B.level, left = B.moves, bonus = left * 150;
  Q.U.janice('cheer'); Q.U.say('You did it! The sea is brighter already.', 2000);
  if (bonus) { await wait(300); B.addScore(bonus); S.floatText(0, S.wy(B.gy + B.cs * 4), `+${Q.fmt(bonus)} for ${left} moves left`, Math.round(B.cs * 0.5), '#ffe28a'); }
  Snd.play('win', { vary: 0 }); Snd.duck(2.5);
  let stars;
  if (L.kind === 'collect') { const f = left / B.movesMax; stars = f >= 0.3 ? 3 : f >= 0.12 ? 2 : 1; }
  else stars = B.score >= L.star3 ? 3 : B.score >= L.star2 ? 2 : 1;
  const seconds = Math.round((Date.now() - B.runT0) / 1000);
  mb?.run?.end({ score: B.score, won: true, level: L.n, stars, moves_used: B.movesMax - left, seconds });
  mb?.event?.('level_won', { level: L.n, stars, score: B.score });
  mb?.event?.('score', { value: B.score });
  B.running = false;
  const P = Q.P, oldStars = P.stars[L.n] || 0, starsBefore = Q.totalStars(), firstClear = !oldStars;
  if (firstClear) {
    P.voyage.wins++; P.voyage.streak++;
    P.voyage.bestStreak = Math.max(P.voyage.bestStreak, P.voyage.streak);
  }
  P.stars[L.n] = Math.max(oldStars, stars);
  P.best[L.n] = Math.max(P.best[L.n] || 0, B.score);
  P.unlocked = Math.max(P.unlocked, Math.min(Q.LEVELS + 1, L.n + 1));
  const gainedStars = Math.max(0, stars - oldStars);
  const pearls = (firstClear ? 20 : 5) + gainedStars * 10;
  P.pearls += pearls;
  const prizes = [];
  if (firstClear) for (const [key, level] of Object.entries(Q.TOOL_UNLOCKS)) if (L.n === level - 1) {
    P.boost[key] = Math.min(99, (P.boost[key] || 0) + 3);
    prizes.push({k:'tool',key});
  }
  const relic = Q.RELICS[L.n];
  if (firstClear && relic) {
    P.pearls += relic.pearls;
    P.boost.trident = Math.min(99, P.boost.trident + relic.trident);
    P.boost.amulet = Math.min(99, P.boost.amulet + relic.amulet);
    prizes.push({ k: 'relic', relic });
  }
  if (L.last && firstClear && !P.restored.includes(L.wi)) { P.restored.push(L.wi); P.pearls += 250; prizes.push({ k: 'region', wi: L.wi }); }
  const starsNow = Q.totalStars();
  const chests = Math.floor(starsNow / Q.CHEST_EVERY) - P.chests;
  for (let i = 0; i < chests; i++) prizes.push({ k: 'chest', n: P.chests + i + 1 });
  const rk = Q.rankIndex(starsNow);
  if (rk > P.rankSeen) prizes.push({ k: 'rank', idx: rk });
  Q.saveProgress();
  B.submit(starsNow);
  await wait(900);
  Q.U.showWin({ score: B.score, stars, bonus, left, level: L, pearls, prizes, starsBefore, next: L.n < Q.LEVELS ? Q.levelInfo(L.n + 1) : null });
};
B.lose = async () => {
  Q.P.voyage.streak = 0; Q.saveProgress();
  B.over = true;
  Q.U.janice('worried');
  Snd.play('lose', { vary: 0 }); Snd.duck(1.5);
  const L = B.level, seconds = Math.round((Date.now() - B.runT0) / 1000);
  mb?.run?.end({ score: B.score, won: false, level: L.n, moves_used: B.movesMax, seconds });
  mb?.event?.('level_lost', { level: L.n, score: B.score });
  mb?.event?.('score', { value: B.score });
  B.running = false;
  B.submit();
  await wait(700);
  Q.U.showLose({ score: B.score, level: L, collected: B.collected });
};
B.submit = (stars) => {
  try { mb?.leaderboard?.submit?.('best_score', B.score, { label: 'Best expedition score' })?.catch?.(() => {}); } catch (e) {}
  if (stars !== undefined) try { mb?.leaderboard?.submit?.('stars', stars, { label: 'Expedition stars' })?.catch?.(() => {}); } catch (e) {}
};

B.tick = (now) => {
  if (!B.visible) return;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = B.grid[r]?.[c]; if (!cell?.node) continue;
    S.animatePiece(cell.node, now, !!cell.selected);
  }
  if (B.hinting) { const e = (S.time - B.hintT0) * 0.018; for (const n of B.hinting) n.userData.body.rotation.z = Math.sin(e) * 0.35; }
  if (B.selGlow.visible) B.selGlow.material.opacity = 0.55 + 0.25 * Math.sin(now * 0.008);
};
})();
