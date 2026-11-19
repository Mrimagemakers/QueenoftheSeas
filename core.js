/* Queen of the Seas: shared data, saves, sound and the tween clocks. */
(() => {
'use strict';
const mb = window.mindblown;
const Q = window.QOS = {};

Q.N = 8; Q.TYPES = 5;
Q.NAMES = ['amethyst', 'emerald', 'sapphire', 'pearl', 'gold compass'];
Q.PLURAL = ['amethysts', 'emeralds', 'sapphires', 'pearls', 'gold compasses'];
Q.HEX = [0xa45cff, 0x18c97f, 0x2f6dff, 0xf4eee4, 0xe2b04a];
Q.CSS = ['#b980ff', '#38e09a', '#6a9bff', '#f4efe6', '#f0c35a'];
Q.fmt = (n) => Math.round(n).toLocaleString('en-US');
Q.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Q.rnd = (n) => Math.floor(Math.random() * n);
Q.T = {};

Q.REGIONS = [
  { key: 'bg_coral_crown_bay', name: 'Coral Crown Bay', blurb: 'A sunlit reef where the sea turtles rest',
    note: ['Coral is alive', 'A coral reef is built by tiny animals called polyps. Each one builds a stony cup, and together they make reefs big enough to see from space.'] },
  { key: 'bg_seahorse_meadows', name: 'Seahorse Meadows', blurb: 'Golden seahorses in swaying seagrass',
    note: ['Seahorse fathers', 'In seahorses it is the father who carries the eggs, in a pouch on his belly, until hundreds of tiny seahorses swim out.'] },
  { key: 'bg_sunken_observatory', name: 'Sunken Observatory', blurb: 'Old columns, a manta ray and a curious octopus',
    note: ['Clever octopus', 'An octopus has three hearts, blue blood and can change colour and texture in a blink to hide on the sea floor.'] },
  { key: 'bg_jellyfish_cathedral', name: 'Jellyfish Cathedral', blurb: 'A glowing cave of drifting jellyfish',
    note: ['Living light', 'Many jellyfish make their own light. It is called bioluminescence, and most of the deep ocean glows this way.'] },
  { key: 'bg_frozen_blue_frontier', name: 'Frozen Blue Frontier', blurb: 'Under the polar ice with the belugas',
    note: ['The singing whale', 'Belugas are called the canaries of the sea. They chirp, whistle and click to find each other under the ice.'] },
  { key: 'bg_midnight_trench', name: 'Midnight Trench', blurb: 'Lanterns and crystals in the deep dark',
    note: ['A light in the dark', 'The anglerfish carries a glowing lure on its head. In the midnight zone, where sunlight never reaches, light is a meal ticket.'] },
  { key: 'bg_crown_of_the_abyss', name: 'Crown of the Abyss', blurb: 'The sunken palace of the Queen of the Seas',
    note: ['Guardian of the seas', 'More than half of the oxygen we breathe is made by tiny ocean plants. Protecting the sea protects every one of us.'] }
];
Q.PER = 15; Q.LEVELS = Q.REGIONS.length * Q.PER;

Q.RANKS = [[0, 'Reef Explorer'], [12, 'Coral Keeper'], [35, 'Tide Warden'], [70, 'Deep Sea Ranger'], [120, 'Ocean Sage'], [190, 'Abyssal Guardian'], [270, "Queen's Champion"]];
Q.rankIndex = (stars) => { let i = 0; Q.RANKS.forEach((r, k) => { if (stars >= r[0]) i = k; }); return i; };
Q.CHEST_EVERY = 10;

Q.levelInfo = (n) => {
  const T = Q.T;
  n = Q.clamp(Math.round(n) || 1, 1, Q.LEVELS);
  const wi = Math.floor((n - 1) / Q.PER);
  const step = T.goal_step ?? 300, dropEvery = Math.max(1, T.moves_drop_every ?? 5);
  const target = Math.round(((T.target ?? 8000) + step * (n - 1)) / 100) * 100;
  const moves = Math.max(T.min_moves ?? 12, (T.moves ?? 20) - Math.floor((n - 1) / dropEvery));
  const collect = n % 3 === 0;
  const info = { n, wi, region: Q.REGIONS[wi], target, moves, brick: n % 2 === 0, kind: collect ? 'collect' : 'score',
    star2: Math.round(target * 1.35), star3: Math.round(target * 1.7), last: n % Q.PER === 0 };
  if (collect) { info.ctype = (n * 2 + wi) % Q.TYPES; info.count = Math.min(T.collect_max ?? 30, (T.collect_base ?? 12) + Math.floor(n / 5)); }
  return info;
};
Q.goalText = (L) => L.kind === 'collect' ? `Collect ${L.count} ${Q.PLURAL[L.ctype]}` : `Reach ${Q.fmt(L.target)} points`;

// ---------- progress ----------
const KEY = 'progress';
const P = Q.P = { schemaVersion: 1, unlocked: 1, stars: {}, best: {}, pearls: 0, boost: { trident: 3, amulet: 2 }, chests: 0, restored: [], rankSeen: 0, introSeen: false };
Q.progress = { ready: false, scope: 'browser', listeners: [] };
function clean(v) {
  const T = Q.T;
  const out = { schemaVersion: 1, unlocked: 1, stars: {}, best: {}, pearls: T.pearls ?? 100,
    boost: { trident: T.rockets ?? 3, amulet: T.bombs ?? 2 }, chests: 0, restored: [], rankSeen: 0, introSeen: false };
  if (v && typeof v === 'object') {
    if (typeof v.unlocked === 'number') out.unlocked = Q.clamp(Math.round(v.unlocked), 1, Q.LEVELS + 1);
    if (v.stars && typeof v.stars === 'object') for (const k in v.stars) { const n = +k; if (n >= 1 && n <= Q.LEVELS) out.stars[n] = Q.clamp(Math.round(v.stars[k]) || 0, 0, 3); }
    if (v.best && typeof v.best === 'object') for (const k in v.best) { const n = +k; if (n >= 1 && n <= Q.LEVELS) out.best[n] = Math.max(0, Math.round(v.best[k]) || 0); }
    if (typeof v.pearls === 'number') out.pearls = Math.max(0, Math.round(v.pearls));
    if (v.boost && typeof v.boost === 'object') {
      if (typeof v.boost.trident === 'number') out.boost.trident = Q.clamp(Math.round(v.boost.trident), 0, 99);
      if (typeof v.boost.amulet === 'number') out.boost.amulet = Q.clamp(Math.round(v.boost.amulet), 0, 99);
    }
    if (typeof v.chests === 'number') out.chests = Math.max(0, Math.round(v.chests));
    if (Array.isArray(v.restored)) out.restored = [...new Set(v.restored.filter(i => Number.isInteger(i) && i >= 0 && i < Q.REGIONS.length))];
    if (typeof v.rankSeen === 'number') out.rankSeen = Q.clamp(Math.round(v.rankSeen), 0, Q.RANKS.length - 1);
    out.introSeen = !!v.introSeen;
  }
  return out;
}
function apply(v, replace) {
  const c = clean(v);
  if (replace) { Object.assign(P, c); return; }
  P.unlocked = Math.max(P.unlocked, c.unlocked);
  for (const k in c.stars) P.stars[k] = Math.max(P.stars[k] || 0, c.stars[k]);
  for (const k in c.best) P.best[k] = Math.max(P.best[k] || 0, c.best[k]);
  P.pearls = Math.max(P.pearls, c.pearls);
  P.boost.trident = Math.max(P.boost.trident, c.boost.trident); P.boost.amulet = Math.max(P.boost.amulet, c.boost.amulet);
  P.chests = Math.max(P.chests, c.chests); P.restored = [...new Set([...P.restored, ...c.restored])];
  P.rankSeen = Math.max(P.rankSeen, c.rankSeen); P.introSeen = P.introSeen || c.introSeen;
}
Q.totalStars = () => { let t = 0; for (const k in P.stars) t += P.stars[k]; return t; };
const emit = () => Q.progress.listeners.forEach(f => { try { f(P); } catch (e) { console.error(e); } });
Q.onProgress = (f) => Q.progress.listeners.push(f);

let loading = null;
Q.loadProgress = async () => {
  if (loading) return loading;
  loading = (async () => {
    let value = null, scope = 'browser';
    if (mb?.load) {
      try { const res = await mb.load(KEY); if (res) { value = res.value; scope = res.scope || 'browser'; } }
      catch (e) { Q.progress.loadError = e?.reason || 'error'; }
    } else {
      try { const raw = localStorage.getItem('qos_progress'); if (raw) value = JSON.parse(raw); } catch (e) {}
    }
    apply(value, true);
    Q.progress.ready = true; Q.progress.scope = scope;
    if (Q.progress.pending) Q.saveProgress();
    emit();
    return scope;
  })();
  try { return await loading; } finally { loading = null; }
};
let saveTimer = null, saving = false, again = false;
Q.saveProgress = () => {
  if (!Q.progress.ready) { Q.progress.pending = true; return; }
  Q.progress.pending = false;
  emit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 150);
};
async function doSave(retry = 0) {
  if (saving) { again = true; return; }
  saving = true;
  const value = clean(P);
  try {
    if (mb?.save) await mb.save(KEY, value);
    else localStorage.setItem('qos_progress', JSON.stringify(value));
  } catch (e) {
    const r = e?.reason;
    if (r === 'REVISION_CONFLICT' && retry < 2) {
      const cur = e.current && ('value' in e.current ? e.current.value : e.current);
      apply(cur, false); saving = false; return doSave(retry + 1);
    }
    if ((r === 'LOAD_FIRST' || r === 'AUTH_CHANGED') && retry < 2) {
      try { const res = await mb.load(KEY); if (res) apply(res.value, false); } catch (e2) {}
      saving = false; return doSave(retry + 1);
    }
    console.warn('save failed', r || e);
  }
  saving = false;
  if (again) { again = false; doSave(); }
}

// ---------- sound ----------
const SFX = ['pop', 'crunch', 'swap', 'whoosh', 'thump', 'chime', 'tap', 'nope', 'win', 'lose', 'chest'];
const Snd = Q.Snd = {
  ctx: null, buf: {}, raw: {}, master: null, sfx: null, mus: null, musicSrc: null, on: true, voices: {}, listeners: [],
  prefetch() {
    for (const n of SFX) this.raw[n] = fetch('sfx/' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    this.raw.music = fetch('sfx/music.m4a').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    if (mb?.sound) { this.on = !!mb.sound.on; mb.sound.onchange?.((v) => { this.on = !!v; this.apply(); this.listeners.forEach(f => f(this.on)); }); }
  },
  unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running' && !document.hidden) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = Q.T.sfx_volume ?? 0.9; this.sfx.connect(this.master);
    this.mus = this.ctx.createGain(); this.mus.gain.value = Q.T.music_volume ?? 0.3; this.mus.connect(this.master);
    this.apply(); this.ctx.resume();
    for (const n of [...SFX, 'music']) {
      this.raw[n].then(ab => ab && new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
        .then(b => { if (b) { this.buf[n] = b; if (n === 'music') this.startMusic(); } }).catch(() => {});
    }
  },
  apply() { if (this.master) this.master.gain.setTargetAtTime(this.on ? 1 : 0, this.ctx.currentTime, 0.015); },
  set(v) { this.on = v; if (mb?.sound?.set) mb.sound.set(v); this.apply(); this.listeners.forEach(f => f(this.on)); },
  startMusic() {
    if (!this.buf.music || this.musicSrc) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buf.music; s.loop = true;
    s.connect(this.mus); s.start(); this.musicSrc = s;
  },
  duck(t = 0.5) {
    if (!this.mus) return; const g = this.mus.gain, now = this.ctx.currentTime, v = Q.T.music_volume ?? 0.3;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(v * 0.35, now + 0.05); g.linearRampToValueAtTime(v, now + t);
  },
  play(n, { rate = 1, vol = 1, vary = 0.06 } = {}) {
    if (!this.ctx || !this.buf[n] || this.ctx.state !== 'running') return;
    const list = this.voices[n] || (this.voices[n] = []);
    if (list.length >= 4) { const old = list.shift(); try { old.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.004); old.s.stop(this.ctx.currentTime + 0.02); } catch (e) {} }
    const s = this.ctx.createBufferSource(); s.buffer = this.buf[n];
    s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * vary);
    const g = this.ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(this.sfx);
    const v = { s, g }; list.push(v); s.onended = () => { const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); };
    s.start();
  }
};
document.addEventListener('visibilitychange', () => { if (!Snd.ctx) return; if (document.hidden) Snd.ctx.suspend(); else Snd.ctx.resume(); });

// ---------- tween clocks ----------
const Ease = Q.Ease = {
  linear: t => t, outQuad: t => 1 - (1 - t) * (1 - t), inQuad: t => t * t, outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2, inCubic: t => t * t * t,
  outBack: t => { const s = 1.70158; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  outBackBig: t => { const s = 2.6; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  inBack: t => { const s = 1.70158; return (s + 1) * t * t * t - s * t * t; },
  outElastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1
};
class Clock {
  constructor() { this.items = []; this.paused = false; this.now = 0; }
  add(dur, fn, { delay = 0, ease = Ease.outQuad, start } = {}) {
    return new Promise(res => this.items.push({ t: -delay, dur: Math.max(1, dur), fn, ease, res, start, started: false }));
  }
  wait(ms) { return this.add(ms, () => {}, { ease: Ease.linear }); }
  to(obj, props, dur, opts = {}) {
    let from = null;
    return this.add(dur, (e) => { for (const k in props) obj[k] = from[k] + (props[k] - from[k]) * e; },
      { ...opts, start: () => { from = {}; for (const k in props) from[k] = obj[k]; opts.start?.(); } });
  }
  tick(dt) {
    if (this.paused) return;
    this.now += dt;
    const list = this.items;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      it.t += dt; if (it.t < 0) continue;
      if (!it.started) { it.started = true; it.start?.(); }
      const k = Math.min(1, it.t / it.dur);
      try { it.fn(it.ease(k), k); } catch (e) { console.error(e); }
      if (k >= 1) { it.done = true; it.res(); }
    }
    if (list.some(i => i.done)) this.items = list.filter(i => !i.done);
  }
}
Q.game = new Clock();   // pauses with the level
Q.ui = new Clock();     // pop-ups keep moving while the level is paused

Q.tuneFromFile = () => fetch('tune.json').then(r => r.json())
  .then(f => Object.fromEntries(Object.entries(f).map(([k, e]) => [k, e.value]))).catch(() => ({}));
})();
