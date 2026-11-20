/* Queen of the Seas: the HUD, Dr. Janice Miller, the expedition map and every pop-up's contents. */
(() => {
'use strict';
const Q = window.QOS, TH = window.THREE, S = Q.S, B = Q.B, P = Q.P, Pop = Q.Pop, Snd = Q.Snd;
const mb = window.mindblown;
const $ = (id) => document.getElementById(id);
const U = Q.U = { screen: 'map', icons: [] };

// ---------- small 2D icons of the 3D pieces, rendered once ----------
U.makeIcons = () => {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const r = new TH.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
    r.outputColorSpace = TH.SRGBColorSpace; r.toneMapping = TH.NeutralToneMapping; r.setClearColor(0, 0);
    const sc = new TH.Scene(); const pm = new TH.PMREMGenerator(r); sc.environment = pm.fromScene(new TH.RoomEnvironment(), 0.03).texture;
    sc.add(new TH.HemisphereLight(0xcff6ff, 0x123a52, 1.1)); const k = new TH.DirectionalLight(0xfff0d0, 2.2); k.position.set(-0.6, 1, 1.4); sc.add(k);
    const cam = new TH.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0, 4.3);
    const face = S.MF.face.map;
    for (let t = 0; t < Q.TYPES; t++) {
      const n = S.makePiece(t, null, false); n.rotation.set(-0.15, 0.25, 0); sc.add(n);
      if (t === 4 && face) n.traverse(o => { if (o.material === S.MF.face) { o.material = o.material.clone(); o.material.map = face; } });
      r.render(sc, cam); U.icons[t] = c.toDataURL('image/png'); sc.remove(n);
    }
    r.dispose(); r.forceContextLoss?.();
  } catch (e) { console.warn('icons', e); }
};

// ---------- HUD ----------
U.init = () => {
  $('badge').onclick = () => { Snd.unlock(); Snd.play('tap'); U.showLog(); };
  $('janBtn').onclick = () => { Snd.unlock(); U.janice('cheer'); U.say(U.tip(), 3200); };
  $('bHelp').onclick = () => { Snd.unlock(); Snd.play('tap'); U.showHowto(); };
  $('bPause').onclick = () => { Snd.unlock(); Snd.play('tap'); U.pauseRequest(); };
  $('bSound').onclick = () => { Snd.unlock(); Snd.set(!Snd.on); U.syncSound(); if (Snd.on) Snd.play('tap'); };
  $('btTrident').onclick = () => { Snd.unlock(); Snd.play('tap'); B.toggleBooster('trident'); };
  $('btAmulet').onclick = () => { Snd.unlock(); Snd.play('tap'); B.toggleBooster('amulet'); };
  $('btVoyage').onclick = () => { Snd.unlock(); U.showVoyage(); };
  $('btShop').onclick = () => { Snd.unlock(); Snd.play('tap'); U.showShop(); };
  Snd.listeners.push(() => U.syncSound()); U.syncSound();
  Q.onProgress(() => { U.syncTop(); U.refreshBoosters(); if (U.screen === 'map') { U.refreshMap(); U.syncGoal(); } });
  U.buildMap();
};
U.syncSound = () => $('bSound').classList.toggle('off', !Snd.on);
U.syncTop = () => {
  const st = Q.totalStars();
  $('sPearls').textContent = Q.fmt(P.pearls); $('sStars').textContent = st;
  $('sRank').textContent = Q.RANKS[Q.rankIndex(st)][1];
  const into = st % Q.CHEST_EVERY; $('cChest').textContent = `${into}/${Q.CHEST_EVERY}`;
};
U.refreshBoosters = () => {
  for (const [k, id, c] of [['trident', 'btTrident', 'cTrident'], ['amulet', 'btAmulet', 'cAmulet']]) {
    const n = P.boost[k] || 0; $(c).textContent = n; $(id).classList.toggle('empty', n <= 0); $(id).classList.toggle('armed', B.armed === k);
  }
};
U.bump = (id) => { const el = $(id); el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 220 }); };
U.syncGoal = () => {
  const ticks = document.querySelectorAll('.gbar .tick');
  if (U.screen === 'map') {
    const st = Q.totalStars(), into = st % Q.CHEST_EVERY;
    $('gMoves').querySelector('small').textContent = 'Level'; $('gMovesN').textContent = Math.min(P.unlocked, Q.LEVELS);
    $('gMoves').classList.remove('low');
    $('gText').innerHTML = `<img src="assets/icon_chest.webp" alt="">Next treasure chest: ${into} of ${Q.CHEST_EVERY} stars`;
    $('gFill').style.width = (into / Q.CHEST_EVERY * 100) + '%';
    ticks.forEach((t, i) => { t.style.display = i === 2 ? '' : 'none'; t.classList.toggle('on', false); });
    $('gScore').querySelector('small').textContent = 'Habitats'; $('gScoreN').textContent = `${P.restored.length}/${Q.REGIONS.length}`;
    return;
  }
  const L = B.level; if (!L) return;
  $('gMoves').querySelector('small').textContent = 'Moves'; $('gMovesN').textContent = B.moves;
  $('gMoves').classList.toggle('low', B.moves <= 3 && !B.over);
  $('gScore').querySelector('small').textContent = 'Score'; $('gScoreN').textContent = Q.fmt(B.score);
  if (L.kind === 'collect') {
    const got = Math.min(B.collected, L.count);
    $('gText').innerHTML = `<img id="gIcon" src="${U.icons[L.ctype] || ''}" alt="">${got} / ${L.count} ${Q.PLURAL[L.ctype]}`;
    $('gFill').style.width = (got / L.count * 100) + '%';
    ticks.forEach((t, i) => { t.style.display = i === 2 ? '' : 'none'; t.classList.toggle('on', got >= L.count); });
  } else {
    $('gText').innerHTML = `<img id="gIcon" src="assets/icon_star.webp" alt="">Goal ${Q.fmt(L.target)} points`;
    $('gFill').style.width = Math.min(100, B.score / L.star3 * 100) + '%';
    const marks = [L.target, L.star2, L.star3];
    ticks.forEach((t, i) => { t.style.display = ''; t.classList.toggle('on', B.score >= marks[i]); });
  }
};
// a collected piece flies from the board to the goal counter, in 3D
U.flyToGoal = (t, x, y) => {
  const el = $('gIcon'); if (!el) return;
  const r = el.getBoundingClientRect(); const z = 160, k = S.zk(z);
  const tx = S.wx(r.left + r.width / 2) * k, ty = S.wy(r.top + r.height / 2) * k;
  const n = S.makePiece(t, null, false); const s0 = B.cs * 0.43; n.scale.setScalar(s0); n.position.set(x, y, z); S.fxRoot.add(n);
  const sx = x, sy = y;
  Q.game.add(560, (e) => { n.position.x = sx + (tx - sx) * e; n.position.y = sy + (ty - sy) * e + Math.sin(e * Math.PI) * B.cs * 1.2; n.scale.setScalar(s0 * (1 - 0.6 * e)); n.rotation.y = e * 6; }, { ease: Q.Ease.inOutSine })
    .then(() => { S.fxRoot.remove(n); U.bump('gText'); });
};

// ---------- Dr. Janice Miller ----------
let bubbleTimer = null;
U.say = (text, ms = 1800, pose) => {
  if (pose) U.janice(pose);
  const b = $('bubble'); b.textContent = text; b.hidden = false;
  const f = $('janBtn').getBoundingClientRect();
  const bw = Math.min(300, window.innerWidth * 0.7);
  b.style.maxWidth = bw + 'px';
  requestAnimationFrame(() => {
    const w = b.offsetWidth, h = b.offsetHeight;
    let left = f.left + f.width * 0.15, top = f.top - h - 14;
    if (document.body.classList.contains('wide')) { left = f.left + f.width / 2 - w / 2; }
    left = Q.clamp(left, 6, window.innerWidth - w - 6); top = Math.max(6, top);
    b.style.left = left + 'px'; b.style.top = top + 'px';
    b.style.setProperty('--tail', Q.clamp(f.left + f.width / 2 - left - 8, 12, w - 28) + 'px');
    b.classList.add('show');
  });
  clearTimeout(bubbleTimer);
  if (ms > 0) bubbleTimer = setTimeout(() => U.hideBubble(), ms);
};
U.hideBubble = () => { clearTimeout(bubbleTimer); $('bubble').classList.remove('show'); };
U.janice = (pose) => {
  const f = $('janBtn'); f.classList.remove('cheer', 'worried'); void f.offsetWidth;
  if (pose === 'cheer' || pose === 'worried') f.classList.add(pose);
};
const TIPS = ['Line up three or more of a kind in a row or column.', 'A 2x2 square calls a sea turtle to help you.',
  'Five in a row makes the Queen\'s Amulet. Swap it with any piece!', 'Swap two powers together for a much bigger splash.',
  'Every 10 stars opens a treasure chest.', 'Clear a region\'s last expedition to restore its habitat.'];
let tipI = 0;
U.tip = () => TIPS[tipI++ % TIPS.length];

// ---------- screens ----------
U.showMap = () => {
  if (B.running && !B.over) B.abandon();
  if (B.paused) U.unpauseClock();
  U.screen = 'map'; B.show(false); $('map').hidden = false; $('bPause').style.visibility = 'hidden';
  document.body.classList.add('onmap');
  U.refreshMap(); U.syncGoal(); U.syncTop(); U.refreshBoosters(); U.scrollToCurrent();
  U.mapBackdrop();
};
U.startLevel = (n) => {
  const info = Q.levelInfo(n);
  if (B.paused) U.unpauseClock();
  U.screen = 'board'; $('map').hidden = true; $('bPause').style.visibility = ''; document.body.classList.remove('onmap');
  S.setBackdrop(info.region.key);
  B.show(true); Q.layout(); B.begin(info);
};

// ---------- the map ----------
U.buildMap = () => {
  const m = $('map'); m.innerHTML = '';
  const note = document.createElement('div'); note.className = 'mapnote'; note.id = 'mapnote'; m.appendChild(note);
  U.nodes = [];
  Q.REGIONS.forEach((reg, wi) => {
    const sec = document.createElement('section'); sec.className = 'region'; sec.dataset.wi = wi;
    const head = document.createElement('div'); head.className = 'rhead'; head.dataset.bg = `assets/${reg.key}.webp`;
    head.innerHTML = `<span class="rs"></span><div class="rt"><div class="rn">${String(wi + 1).padStart(2, '0')} · ${reg.name}</div><div class="rb">${reg.blurb} · Expeditions ${wi * Q.PER + 1} to ${(wi + 1) * Q.PER}</div></div>`;
    sec.appendChild(head);
    const path = document.createElement('div'); path.className = 'path'; const stepY = 66, top = 40;
    path.style.height = (top * 2 + (Q.PER - 1) * stepY) + 'px';
    const pts = [];
    for (let i = 0; i < Q.PER; i++) {
      const n = wi * Q.PER + i + 1; const xp = 50 + 30 * Math.sin(i * 0.9 + wi), yp = top + i * stepY; pts.push([xp, yp]);
      const b = document.createElement('button'); b.className = 'node'; b.style.left = xp + '%'; b.style.top = yp + 'px';
      b.innerHTML = `${n}<span class="st"><i></i><i></i><i></i></span>`; b.setAttribute('aria-label', `Expedition ${n}`);
      const info = Q.levelInfo(n);
      const relic = Q.RELICS[n];
      if (relic) {
        b.title = `First-clear prize: ${relic.name}`;
        b.setAttribute('aria-label', `Expedition ${n} · ${relic.name} prize`);
      }
      if (info.kind === 'collect') { const k = document.createElement('span'); k.className = 'kind'; k.dataset.t = info.ctype; b.appendChild(k); }
      b.onclick = () => { Snd.unlock(); if (n > P.unlocked) { Snd.play('nope'); U.say(`Expedition ${n} is still uncharted. Finish expedition ${P.unlocked} first!`, 2200, 'worried'); return; } Snd.play('tap'); U.showLevelStart(n); };
      path.appendChild(b); U.nodes[n] = b;
    }
    const svg = `<svg viewBox="0 0 100 ${parseInt(path.style.height)}" preserveAspectRatio="none"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="rgba(255,226,140,.75)" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
    path.insertAdjacentHTML('afterbegin', svg);
    sec.appendChild(path); m.appendChild(sec);
  });
  const io = new IntersectionObserver((ents) => { for (const e of ents) if (e.isIntersecting && !e.target.style.backgroundImage) e.target.style.backgroundImage = `url(${e.target.dataset.bg})`; }, { root: m, rootMargin: '300px' });
  m.querySelectorAll('.rhead').forEach(h => io.observe(h));
  let st = null; m.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(U.mapBackdrop, 120); }, { passive: true });
};
U.refreshMap = () => {
  if (!U.nodes) return;
  const scope = Q.progress.scope, signed = mb?.viewer?.signedIn;
  $('mapnote').textContent = !mb ? 'Progress saves in this browser.' : signed || scope === 'account' ? 'Progress saves to your mindblown account.' : 'Progress saves in this browser. Sign in with mindblown to keep it on every device.';
  for (let n = 1; n <= Q.LEVELS; n++) {
    const b = U.nodes[n], s = P.stars[n] || 0;
    b.classList.toggle('locked', n > P.unlocked); b.classList.toggle('current', n === P.unlocked);
    b.querySelectorAll('.st i').forEach((i, k) => i.classList.toggle('off', k >= s));
    b.querySelector('.st').style.display = s ? '' : 'none';
    const k = b.querySelector('.kind'); if (k && U.icons[k.dataset.t]) k.style.backgroundImage = `url(${U.icons[k.dataset.t]})`;
  }
  document.querySelectorAll('.region').forEach(sec => {
    const wi = +sec.dataset.wi, h = sec.querySelector('.rhead'), tag = sec.querySelector('.rs');
    const open = P.unlocked > wi * Q.PER;
    h.classList.toggle('locked', !open);
    tag.textContent = P.restored.includes(wi) ? 'Habitat restored' : open ? 'Exploring' : 'Uncharted';
  });
};
U.scrollToCurrent = () => {
  const n = U.nodes[Math.min(P.unlocked, Q.LEVELS)]; const m = $('map'); if (!n) return;
  requestAnimationFrame(() => { const r = n.getBoundingClientRect(), mr = m.getBoundingClientRect(); m.scrollTop += r.top - mr.top - mr.height * 0.55; U.mapBackdrop(); });
};
U.mapBackdrop = () => {
  if (U.screen !== 'map') return;
  const m = $('map'), mr = m.getBoundingClientRect(); let best = 0, bd = 1e9;
  document.querySelectorAll('.region').forEach(sec => { const r = sec.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - (mr.top + mr.height / 2)); if (d < bd) { bd = d; best = +sec.dataset.wi; } });
  S.setBackdrop(Q.REGIONS[best].key);
};

// ---------- pause ----------
U.pauseRequest = () => {
  if (U.screen !== 'board' || B.over) { U.showHowto(); return; }
  if (Pop.open) return;
  if (B.busy) { B.pendingPause = true; return; }
  U.pause();
};
U.pause = () => { B.paused = true; Q.game.paused = true; mb?.run?.pause?.(); U.showPause(); };
U.unpauseClock = () => { B.paused = false; Q.game.paused = false; mb?.run?.resume?.(); };
U.resume = () => { Pop.close(); U.unpauseClock(); };

// ---------- pop-ups ----------
const T = (text, o = {}) => ({ k: 'text', text, ...o });
const sp = (h) => ({ k: 'space', h });
const btns = (list, row) => ({ k: 'buttons', list, row });
const RULES = 'Swipe a piece onto its neighbour, or tap two neighbours, to swap them. Line up three or more of a kind in a row or column. A 2x2 square creates a Turtle Torpedo. An L or T creates a Depth Bomb. Five in a line creates the Queen’s Amulet. Tap a weapon to fire, or swap weapons to combine them.';

const introDone = () => { P.introSeen = true; Q.saveProgress(); Pop.close(); U.say('Welcome aboard! Pick the glowing expedition on the map.', 3200, 'cheer'); };
U.showIntro = () => Pop.show(() => ({ width: 460, outside: introDone, items: [
  { k: 'image', src: 'assets/cover.webp', w: 300, ratio: 0.84, focusY: 0 },
  sp(12),
  { k: 'eyebrow', text: 'Pengame Publishing · Puzzle Quest' },
  { k: 'title', text: 'Queen of the Seas', size: 32 },
  T('Dive with marine biologist Dr. Janice Miller, the Queen of the Seas, on a deep sea odyssey through nine ocean habitats.', { size: 15 }),
  sp(4), T(RULES, { size: 13.5, weight: 700, color: '#5a4020' }),
  sp(14),
  btns([{ label: 'Begin the expedition', fn: introDone },
    { label: 'Read the game concept', style: 'aqua', fn: () => U.showConcept(0) }])
] }));

U.showLevelStart = (n) => {
  if (U.preLevel !== n) { Q.preBoost = null; U.preLevel = n; }
  return Pop.show(() => {
  const L = Q.levelInfo(n), best = P.stars[n] || 0;
  const prop = L.kind === 'collect' ? Q.props.pieces([[L.ctype, null]], { h: 96, size: 40 }) : Q.props.pieces([[0, null], [3, null], [2, null]], { h: 80, size: 28, gap: 78 });
  return { outside: true, items: [
    { k: 'eyebrow', text: `${L.region.name} · ${L.kind === 'collect' ? 'Collection dive' : 'Treasure dive'}` },
    { k: 'title', text: `Expedition ${n}` },
    sp(4), prop,
    T(Q.goalText(L), { size: 20, weight: 900 }),
    T(`in ${L.moves} moves · ${L.boardSize}×${L.boardSize} ${L.shape}${L.brick ? ' staggered' : ''} board`, { size: 14, color: '#6b4a22' }),
    best ? T(`Your best: ${'★'.repeat(best)}${'☆'.repeat(3 - best)}  ${Q.fmt(P.best[n] || 0)} points`, { size: 13, color: '#7a4c12' }) : sp(2),
    sp(8), T('Starting booster · optional', { size: 14, weight: 900 }),
    btns(['trident', 'amulet'].map(k => ({
      label: `${Q.preBoost === k ? '✓ ' : ''}${k === 'trident' ? 'Tide' : 'Amulet'} (${P.boost[k]})`, style: Q.preBoost === k ? 'gold' : 'aqua',
      fn: () => { if (P.boost[k] > 0) { Q.preBoost = Q.preBoost === k ? null : k; U.showLevelStart(n); } }
    })), true),
    T('One from your inventory; placed on the board when you dive.', {size: 12}), sp(12),
    btns([{ label: 'Dive in!', fn: () => { Pop.close(); U.startLevel(n); } }, { label: 'Back to the map', style: 'aqua', fn: () => Pop.close() }])
  ] };
});
};

const VOYAGE_REWARDS = [
  {id: 'reef', title: 'Reef Scout', need: 3, pearls: 75, boost: 'trident', card: 'Coral Guardian'},
  {id: 'wreck', title: 'Wreck Seeker', need: 10, pearls: 150, boost: 'amulet', card: 'Sunken Compass'},
  {id: 'abyss', title: 'Abyss Explorer', need: 20, pearls: 300, boost: 'trident', card: 'Queen’s Crown'},
  {id: 'streak', title: 'Seven Seas Escape', need: 7, pearls: 200, boost: 'amulet', card: 'Moonlit Turtle'}
];
U.showVoyage = () => {
  if (B.running && !B.over) { U.say('Return to the map to open Ocean Treasures.', 2200); return; }
  const v = P.voyage;
  return Pop.show(() => ({ width: 470, outside: true, items: [
    {k: 'eyebrow', text: 'Your expedition rewards'},
    {k: 'title', text: 'Ocean Treasures'},
    {k: 'image', src: 'assets/icon_chest.webp', w: 90},
    T(`${v.wins} new levels cleared · Streak ${v.streak}/7`, {size: 16, weight: 900}),
    T('Clear new levels to unlock chests and discovery cards. Losing or leaving a dive resets your streak.', {size: 13}),
    ...VOYAGE_REWARDS.map(r => {
      const progress = r.id === 'streak' ? v.bestStreak : v.wins;
      const claimed = v.claimed.includes(r.id), ready = progress >= r.need;
      return {k: 'shoprow', src: 'assets/icon_chest.webp', title: r.title,
        sub: `${Math.min(progress, r.need)}/${r.need} · ${r.pearls} pearls + 1 ${r.boost}`,
        btn: {label: claimed ? 'Collected' : ready ? 'Open chest' : 'Locked', disabled: claimed || !ready,
          fn: () => {
            if (v.claimed.includes(r.id) || (r.id === 'streak' ? v.bestStreak : v.wins) < r.need) return;
            v.claimed.push(r.id); P.pearls += r.pearls; P.boost[r.boost] = Math.min(99, P.boost[r.boost] + 1); Q.saveProgress();
            Pop.show({items: [{k: 'eyebrow', text: 'Discovery card unlocked'}, {k: 'title', text: r.card},
              Q.props.chest(), T(`${r.pearls} pearls + 1 ${r.boost}`, {size: 20, weight: 900}),
              T('Added to your collection.'), sp(14), btns([{label: 'View treasures', fn: U.showVoyage}])]});
          }} };
    }), sp(10),
    T(`Discovery cards: ${v.claimed.length}/4`, {size: 15, weight: 900}),
    T(VOYAGE_REWARDS.filter(r => v.claimed.includes(r.id)).map(r => r.card).join(' · ') || 'Your first card awaits inside the Reef Scout chest.', {size: 12}),
    sp(10), btns([{label: 'Back to the ocean', fn: () => Pop.close()}])
  ]}));
};

U.showPause = () => Pop.show(() => ({ items: [
  { k: 'eyebrow', text: `${B.level.region.name} · Expedition ${B.level.n}` },
  { k: 'title', text: 'Paused' },
  T(B.level.kind === 'collect' ? `${Math.min(B.collected, B.level.count)} of ${B.level.count} ${Q.PLURAL[B.level.ctype]}, ${B.moves} moves left` : `Score ${Q.fmt(B.score)} of ${Q.fmt(B.level.target)}, ${B.moves} moves left`, { size: 16, weight: 800 }),
  sp(6), T(RULES, { size: 13.5, color: '#5a4020' }),
  sp(14),
  btns([{ label: 'Resume', fn: () => U.resume() },
    { label: 'Restart expedition', style: 'aqua', fn: () => { Pop.close(); U.unpauseClock(); B.abandon(); U.startLevel(B.level.n); } },
    { label: 'Back to the map', style: 'coral', fn: () => { Pop.close(); U.unpauseClock(); U.showMap(); } }])
] }));

U.showHowto = () => Pop.show(() => ({ width: 470, outside: true, items: [
  { k: 'eyebrow', text: 'Dr. Miller\'s field guide' },
  { k: 'title', text: 'How to play', size: 28 },
  T(RULES, { size: 14 }),
  sp(6),
  Q.props.pieces([[2, 'h'], [1, 'w'], [3, 'q'], [0, 'b']], { h: 66, size: 25, captions: ['Tide|4 in a row', 'Depth Bomb|L or T', 'Turtle Torpedo|2x2 square', 'Amulet|5 in a row'] }),
  T('A Tide sweeps its row or column. A Depth Bomb blasts a 3x3 area. Tap a weapon to fire it using one move, or swap it with a neighbour. A Turtle Torpedo targets three pieces. The Queen\'s Amulet clears every piece of one kind. Swap two powers together for a bigger splash.', { size: 13, color: '#5a4020' }),
  sp(4),
  T('Tap the Trident or the Amulet on the shelf to use a booster. Win expeditions for stars and pearls; every 10 stars opens a treasure chest.', { size: 13, color: '#5a4020' }),
  sp(12),
  btns([{ label: 'Got it', fn: () => Pop.close() }])
] }));

U.showWin = (d) => {
  const go = (fn) => () => { Pop.close().then(() => U.runPrizes(d.prizes.slice(), fn)); };
  Pop.show(() => ({ items: [
    { k: 'eyebrow', text: `${d.level.region.name} · Expedition ${d.level.n}` },
    { k: 'title', text: 'Expedition Complete!' },
    Q.props.stars(d.stars),
    T(`Score ${Q.fmt(d.score)}`, { size: 22, weight: 900 }),
    d.bonus ? T(`includes ${Q.fmt(d.bonus)} for ${d.left} moves left`, { size: 13, color: '#6b4a22' }) : sp(1),
    T(`+${d.pearls} pearls`, { size: 16, weight: 900, color: '#0a6d86' }),
    d.next ? T(`Next: ${Q.goalText(d.next)} in ${d.next.moves} moves`, { size: 13, color: '#5a4020' }) : T('You have finished every expedition!', { size: 14 }),
    sp(14),
    btns(d.next ? [{ label: 'Next expedition', fn: go(() => U.showLevelStart(d.next.n)) }, { label: 'Back to the map', style: 'aqua', fn: go(() => U.showMap()) }]
      : [{ label: 'Play again', fn: go(() => U.startLevel(d.level.n)) }, { label: 'Back to the map', style: 'aqua', fn: go(() => U.showMap()) }])
  ] }));
};
U.showLose = (d) => Pop.show(() => ({ items: [
  { k: 'eyebrow', text: `${d.level.region.name} · Expedition ${d.level.n}` },
  { k: 'title', text: 'Out of moves' },
  Q.props.pieces([[3, null]], { h: 70, size: 30 }),
  T(d.level.kind === 'collect' ? `${Math.min(d.collected, d.level.count)} of ${d.level.count} ${Q.PLURAL[d.level.ctype]} collected` : `Score ${Q.fmt(d.score)} of ${Q.fmt(d.level.target)}`, { size: 18, weight: 900 }),
  T('So close! Squares call a sea turtle, and five in a row makes the Amulet. Save your boosters for a tight spot.', { size: 13.5, color: '#5a4020' }),
  sp(14),
  btns([{ label: 'Try again', fn: () => { Pop.close(); U.startLevel(d.level.n); } }, { label: 'Back to the map', style: 'aqua', fn: () => { Pop.close(); U.showMap(); } }])
] }));

U.runPrizes = (list, then) => {
  const p = list.shift();
  if (!p) { then?.(); return; }
  const next = () => { Pop.close().then(() => U.runPrizes(list, then)); };
  if (p.k === 'chest') {
    const n = p.n, extra = n % 3 === 0;
    P.chests = Math.max(P.chests, n); P.boost.trident += 1 + (extra ? 1 : 0); P.boost.amulet += 1; P.pearls += 100; Q.saveProgress();
    mb?.event?.('chest_opened', { chest: n });
    Pop.show(() => ({ items: [
      { k: 'eyebrow', text: `${n * Q.CHEST_EVERY} stars collected` },
      { k: 'title', text: 'Treasure Chest!' },
      Q.props.chest(),
      T(`+${1 + (extra ? 1 : 0)} Trident   +1 Amulet   +100 pearls`, { size: 16, weight: 900, color: '#0a6d86' }),
      T('Dr. Miller found it wedged between two coral heads.', { size: 13, color: '#5a4020' }),
      sp(14), btns([{ label: 'Collect', fn: next }])
    ] }));
  } else if (p.k === 'relic') {
    const relic = p.relic;
    Pop.show(() => ({ items: [
      { k: 'eyebrow', text: 'First-clear relic' },
      { k: 'title', text: relic.name },
      Q.props.chest(),
      T(`+${relic.trident} Tridents · +${relic.amulet} Amulets · +${relic.pearls} pearls`, { size: 15, weight: 900, color: '#0a6d86' }),
      sp(12), btns([{ label: 'Continue', fn: next }])
    ] }));
  } else if (p.k === 'region') {
    const reg = Q.REGIONS[p.wi];
    mb?.event?.('habitat_restored', { region: p.wi + 1 });
    Pop.show(() => ({ width: 460, items: [
      { k: 'image', src: `assets/${reg.key}.webp`, w: 360, ratio: 0.5, focusY: 0.45 },
      sp(10), { k: 'eyebrow', text: 'Habitat restored' },
      { k: 'title', text: reg.name, size: 28 },
      T(`Field note: ${reg.note[0]}`, { size: 15, weight: 900, color: '#0a6d86' }),
      T(reg.note[1], { size: 13.5, color: '#3b2a14' }),
      T('+250 pearls', { size: 16, weight: 900, color: '#0a6d86' }),
      sp(12), btns([{ label: 'Continue', fn: next }])
    ] }));
  } else if (p.k === 'rank') {
    P.rankSeen = Math.max(P.rankSeen, p.idx); Q.saveProgress();
    Pop.show(() => ({ items: [
      { k: 'image', src: 'assets/janice_portrait.webp', w: 150, ratio: 1, circle: true, focusY: 0.2 },
      sp(8), { k: 'eyebrow', text: 'New rank' },
      { k: 'title', text: Q.RANKS[p.idx][1] },
      T(`"Look at you! With ${Q.totalStars()} stars you are a true ${Q.RANKS[p.idx][1]}. The whole reef is talking about it."`, { size: 14, color: '#3b2a14' }),
      T('Dr. Janice Miller', { size: 12, weight: 900, color: '#7a4c12' }),
      sp(12), btns([{ label: 'Thank you, Dr. Miller', fn: next }])
    ] }));
  } else U.runPrizes(list, then);
};

U.showShop = () => Pop.show(() => {
  const st = Q.totalStars(), into = st % Q.CHEST_EVERY;
  const buy = (k, cost) => () => { if (P.pearls < cost) return; P.pearls -= cost; P.boost[k] = (P.boost[k] || 0) + 1; Q.saveProgress(); Q.Snd.play('chime', { rate: 1.3 }); mb?.event?.('booster_bought', { kind: k }); U.refreshBoosters(); Pop.relayout(); };
  return { outside: true, items: [
    { k: 'eyebrow', text: `You have ${Q.fmt(P.pearls)} pearls` },
    { k: 'title', text: 'Treasure Shop' },
    T(`Next treasure chest: ${into} of ${Q.CHEST_EVERY} stars`, { size: 14, weight: 800, color: '#0a6d86' }),
    sp(8),
    { k: 'shoprow', src: 'assets/icon_trident.webp', title: `Trident  (you have ${P.boost.trident})`, sub: 'Flies through one row and clears it.', btn: { label: '60 pearls', fn: buy('trident', 60), disabled: P.pearls < 60 } },
    sp(8),
    { k: 'shoprow', src: 'assets/icon_amulet.webp', title: `Amulet  (you have ${P.boost.amulet})`, sub: 'Turns any piece into the Queen\'s Amulet.', btn: { label: '90 pearls', fn: buy('amulet', 90), disabled: P.pearls < 90 } },
    sp(10), T('Win expeditions to earn pearls. Boosters never cost a move.', { size: 12.5, color: '#5a4020' }),
    sp(12), btns([{ label: 'Close', fn: () => Pop.close() }])
  ] };
});

U.showLog = () => Pop.show(() => {
  const st = Q.totalStars(), rk = Q.rankIndex(st), nextR = Q.RANKS[rk + 1];
  const relics = Object.entries(Q.RELICS).filter(([n]) => P.stars[n]).map(([, relic]) => relic.name);
  return { outside: true, items: [
    { k: 'image', src: 'assets/janice_portrait.webp', w: 140, ratio: 1, circle: true, focusY: 0.2 },
    sp(8), { k: 'eyebrow', text: 'Marine biologist · The Queen of the Seas' },
    { k: 'title', text: 'Dr. Janice Miller', size: 26 },
    T(`Your rank: ${Q.RANKS[rk][1]}${nextR ? ` (${nextR[0] - st} stars to ${nextR[1]})` : ''}`, { size: 14.5, weight: 900, color: '#0a6d86' }),
    T(`${st} stars · ${Q.fmt(P.pearls)} pearls · ${P.restored.length} of ${Q.REGIONS.length} habitats restored · expedition ${Math.min(P.unlocked, Q.LEVELS)} of ${Q.LEVELS}`, { size: 13, color: '#3b2a14' }),
    T(`Relics recovered: ${relics.length}/${Object.keys(Q.RELICS).length}${relics.length ? ' · ' + relics.join(', ') : ''}`, { size: 13, color: '#3b2a14' }),
    sp(4), T('"Every gem we bring home lets a little more light back into the sea. Shall we dive?"', { size: 13, color: '#5a4020' }),
    sp(12),
    btns([{ label: 'Game concept', fn: () => U.showConcept(0) }, { label: 'How to play', style: 'aqua', fn: () => U.showHowto() }], true),
    sp(10), btns([{ label: 'Close', style: 'coral', fn: () => Pop.close() }])
  ] };
});

const CONCEPT = [
  ['The story', 'Queen of the Seas is a puzzle quest adventure based on the book Underwater Adventure: Deep Sea Odyssey. Marine biologist Dr. Janice Miller, the Queen of the Seas, follows a trail of glowing gems through nine ocean habitats that strange currents have dimmed. Every puzzle gathers the gems, pearls and compasses she needs to bring a habitat back to life.'],
  ['How a level plays', 'Swap two neighbouring pieces to line up three or more of a kind in a row or column. A square of four, an L, a T or a cross also counts. Each expedition sets a goal and a number of moves: reach a score, or collect a number of one kind of piece. Moves left at the end turn into bonus points and more stars.'],
  ['Pieces and powers', 'Five pieces: amethyst, emerald, sapphire, pearl and the gold compass. Four in a row makes a Tide gem that sweeps its row or column. An L or a T makes a Depth Bomb. A square creates a Turtle Torpedo that targets three pieces. Five in a row makes the Queen\'s Amulet, which clears every piece of one kind. Two powers swapped together make a bigger blast.'],
  ['The expedition map', '135 expeditions across nine regions. The Shipwreck Vault and the Sapphire Passage add compact 7×7, wide 9×9 and staggered 8×8 boards. Every third expedition is a collection dive.'],
  ['Prizes and advancement', 'Each win earns up to three stars and pearls. Every 10 stars opens a treasure chest of Tridents, Amulets and pearls. The last expedition of a region restores its habitat and reveals a field note. Stars raise your rank from Reef Explorer to Coral Keeper, Tide Warden, Deep Sea Ranger, Ocean Sage, Abyssal Guardian and Queen\'s Champion. Expeditions 110 through 135 award six collectible relics at five-level milestones. Pearls buy boosters in the treasure shop.'],
  ['Look and future chapters', 'Painted reefs, ruins and glowing caves behind gold and parchment frames; 3D gems that glint, burst into shards and bubbles, and pop-ups that rise from the deep. Ideas for later chapters: sand and fishing nets to clear, rescue missions for sea creatures, story scenes with Dr. Miller, a home reef to decorate and weekly ocean challenges.']
];
U.showConcept = (i) => Pop.show(() => {
  const [title, body] = CONCEPT[i];
  const nav = [];
  if (i > 0) nav.push({ label: 'Back', style: 'aqua', fn: () => U.showConcept(i - 1) });
  nav.push(i < CONCEPT.length - 1 ? { label: 'Next', fn: () => U.showConcept(i + 1) } : { label: 'Close', fn: () => Pop.close() });
  const prop = [Q.props.pieces([[0, null], [1, null], [2, null], [3, null], [4, null]], { h: 64, size: 22 }),
    Q.props.pieces([[1, null], [1, null], [1, null], [1, null]], { h: 64, size: 22, gap: 56 }),
    Q.props.pieces([[2, 'h'], [1, 'w'], [3, 'q'], [0, 'b']], { h: 66, size: 24 }),
    Q.props.trident(), Q.props.stars(3, 150), Q.props.pieces([[4, null], [0, null], [3, null]], { h: 70, size: 26, gap: 80 })][i];
  return { width: 470, outside: true, items: [
    { k: 'eyebrow', text: `Game concept · ${i + 1} of ${CONCEPT.length}` },
    { k: 'title', text: title, size: 26 },
    prop,
    T(body, { size: 14, color: '#3b2a14' }),
    sp(12), btns(nav, true),
    ...(i < CONCEPT.length - 1 ? [sp(8), btns([{ label: 'Close', style: 'coral', fn: () => Pop.close() }])] : [])
  ] };
});
})();
