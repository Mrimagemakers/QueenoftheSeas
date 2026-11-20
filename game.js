/* Queen of the Seas: boot, layout, input and the frame loop. */
(() => {
'use strict';
const Q = window.QOS, S = Q.S, B = Q.B, U = Q.U, Pop = Q.Pop, Snd = Q.Snd;
const mb = window.mindblown;
const $ = (id) => document.getElementById(id);

Q.layout = () => {
  const W = window.innerWidth, H = window.innerHeight;
  const short = H < 560;
  document.body.classList.toggle('short', short);
  const land = short && W > H * 1.3;
  document.body.classList.toggle('land', land);
  const colw = land ? W : Math.min(W, Math.max(Math.min(H * 0.66, 620), 320));
  const side = (W - colw) / 2;
  const wide = !land && side > 190;
  document.body.classList.toggle('wide', wide);
  document.documentElement.style.setProperty('--colw', colw + 'px');
  document.documentElement.style.setProperty('--sidew', Math.min(300, side - 10) + 'px');
  S.resize(W, H);
  const r = $('stage').getBoundingClientRect();
  B.layout({ x: r.left, y: r.top, w: r.width, h: r.height });
  Pop.relayout();
};

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(50, now - last); last = now;
  Q.game.tick(dt); Q.ui.tick(dt);
  S.tick(dt); B.tick(now); Pop.tick(dt, now);
  S.render();
}

function bindInput(cv) {
  const pt = (e) => [e.clientX, e.clientY];
  cv.addEventListener('pointerdown', (e) => {
    Snd.unlock();
    const [x, y] = pt(e);
    if (Pop.open) { Pop.pointerDown(x, y); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    B.down(x, y);
  });
  cv.addEventListener('pointermove', (e) => { const [x, y] = pt(e); if (Pop.open) Pop.pointerMove(x, y, cv); else { cv.style.cursor = ''; B.move(x, y); } });
  cv.addEventListener('pointerup', (e) => { const [x, y] = pt(e); B.up(x, y); });
  cv.addEventListener('pointercancel', () => { B.drag = null; });
  window.addEventListener('keydown', (e) => {
    Snd.unlock();
    if (Pop.open && Pop.key(e)) { e.preventDefault(); return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (Pop.open && B.paused) U.resume(); else if (!Pop.open) U.pauseRequest();
    }
  });
}

async function boot() {
  mb?.measure?.([
    { name: 'level_won', kind: 'count', label: 'Expeditions cleared' },
    { name: 'level_lost', kind: 'count', label: 'Ran out of moves' },
    { name: 'score', kind: 'value', label: 'Expedition score' },
    { name: 'habitat_restored', kind: 'step', label: 'Restored a habitat' }
  ]);
  const tuneP = mb?.tune ? mb.tune() : Q.tuneFromFile();
  const fontsP = Promise.race([
    Promise.all([document.fonts?.load('900 30px Cinzel'), document.fonts?.load('800 16px Nunito'), document.fonts?.load('700 16px Nunito')]),
    new Promise(r => setTimeout(r, 2500))
  ]).catch(() => {});
  Q.T = Object.assign(Q.T, await tuneP); await fontsP;
  mb?.tune?.on?.((next) => { Object.assign(Q.T, next); });
  Snd.prefetch();
  const cv = $('gl');
  S.init(cv);
  B.init();
  U.makeIcons();
  U.init();
  bindInput(cv);
  Object.defineProperty(window, '__state', { get: () => ({ screen: U.screen, popup: !!Pop.open, unlocked: Q.P.unlocked, stars: Q.P.stars, pearls: Q.P.pearls, boost: Q.P.boost, board: B.state() }) });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(Q.layout, 80); });
  Q.layout();
  U.showMap();
  requestAnimationFrame(frame);
  setTimeout(() => $('boot')?.classList.add('gone'), 150);
  setTimeout(() => $('boot')?.remove(), 900);
  // compass icons need the face texture; redraw them once it is in
  S.tex('assets/compass_face.webp').then(() => { U.makeIcons(); U.refreshMap(); U.syncGoal(); });
  let firstId = null;
  mb?.viewer?.onchange?.((v) => {
    if (firstId === null) { firstId = v.id || ''; return; }
    if (v.id && v.id !== firstId) { firstId = v.id; Q.loadProgress().then(() => { U.refreshMap(); U.syncGoal(); }); }
    else U.refreshMap();
  });
  await Q.loadProgress();
  U.syncTop(); U.refreshBoosters(); U.refreshMap(); U.syncGoal(); U.scrollToCurrent();
  if (!Q.P.introSeen && !Pop.open && U.screen === 'map') U.showIntro();
  else setTimeout(() => { if (U.screen === 'map' && !Pop.open) U.say('Pick the glowing expedition and let\'s dive!', 3000, 'cheer'); }, 900);
}
boot().catch(async e => {
  console.error(e);
  await Q.loadProgress();
  const b = $('boot');
  if (b) {
    b.classList.remove('gone');
    b.querySelector('.sub').textContent = 'The 3D ocean could not start on this device.';
    b.querySelector('.sub').style.cssText = 'letter-spacing:normal;text-align:center;max-width:85%;margin:18px 0';
    const arcade = document.createElement('button'); arcade.className = 'arc-btn'; arcade.textContent = 'Play Ocean Arcade';
    arcade.onclick = () => Q.Challenges.open(); b.append(arcade);
    const retry = document.createElement('button'); retry.className = 'arc-btn'; retry.textContent = 'Retry the 3D ocean';
    retry.onclick = () => location.reload(); b.append(retry);
  }
});
})();
