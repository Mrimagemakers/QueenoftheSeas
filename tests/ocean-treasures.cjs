const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
  const store = new Map();
  const context = vm.createContext({console, setTimeout, clearTimeout, setInterval, Date, Math,
    document: {addEventListener() {}, getElementById() {return {}}},
    localStorage: {getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},window: {}});
  vm.runInContext(fs.readFileSync('core.js','utf8'), context);
  const Q=context.window.QOS;
  Q.S={wy:y=>y,wx:x=>x}; Q.Snd.play=()=>{};Q.Snd.duck=()=>{};
  context.window.THREE={};
  vm.runInContext(fs.readFileSync('board.js','utf8'), context);
  Q.Pop={show: fn=>{Q.spec=typeof fn==='function'?fn():fn;},close(){}};
  vm.runInContext(fs.readFileSync('ui.js','utf8'), context);
  Q.props={chest:()=>({k:'prop'})};
  return {Q,store};
}
test('all 135 boards generate without matches and offer a move',()=>{
  const {Q}=setup(),B=Q.B;
  for(let n=1;n<=135;n++){
    // begin sets the board dimension; isolate rendering from rules.
    B.pieces={clear(){}}; B.selGlow={};B.layout=()=>{};B.makeNode=()=>({position:{},userData:{}});
    B.startRun=()=>{};Q.game.to=()=>{};Q.U.syncGoal=()=>{};Q.U.refreshBoosters=()=>{};Q.U.say=()=>{};
    B.begin(Q.levelInfo(n));
    assert.equal(B.findGroups().length,0,`level ${n}`);assert.ok(B.findMove(),`level ${n}`);
    B.grid.forEach((row,r)=>row.forEach((cell,c)=>assert.equal(!!cell,B.active(r,c))));
  }
});
test('gravity and shuffle keep gems within each shaped board',async()=>{
  const {Q}=setup(),B=Q.B;
  Q.game.to=async()=>{};B.pieces={clear(){}};B.selGlow={};B.layout=()=>{};
  B.makeNode=cell=>cell.node={position:{},userData:{}};
  B.startRun=()=>{};Q.U.syncGoal=()=>{};Q.U.refreshBoosters=()=>{};Q.U.say=()=>{};
  for(const n of [4,5,6,106,107,108]){
    B.begin(Q.levelInfo(n));
    B.grid.forEach(row=>row.forEach((cell,c)=>{if(cell&&Math.random()<0.4)row[c]=null}));
    await B.gravity(); B.X=()=>0;B.Y=()=>0;B.reskin=()=>{};await B.shuffle();
    B.grid.forEach((row,r)=>row.forEach((cell,c)=>assert.equal(!!cell,B.active(r,c))));
    assert.equal(B.findGroups().length,0);assert.ok(B.findMove());
  }
});
test('legacy progress loads, locked rewards stay locked, claims pay once and persist',async()=>{
  const {Q,store}=setup();store.set('qos_progress',JSON.stringify({unlocked:12,pearls:80,stars:{1:3}}));
  await Q.loadProgress();assert.equal(Q.P.unlocked,12);assert.equal(Q.P.voyage.wins,0);
  Q.U.showVoyage();let row=Q.spec.items.find(i=>i.k==='shoprow');assert.equal(row.btn.disabled,true);
  row.btn.fn();assert.equal(Q.P.pearls,80);
  Q.P.voyage.wins=3;Q.U.showVoyage();row=Q.spec.items.find(i=>i.k==='shoprow');assert.equal(row.btn.disabled,false);
  row.btn.fn();row.btn.fn();assert.equal(Q.P.pearls,155);assert.equal(Q.P.voyage.claimed.length,1);
  await new Promise(r=>setTimeout(r,220));await Q.loadProgress();
  assert.equal(Q.P.voyage.claimed[0],'reef');assert.equal(Q.P.pearls,155);
});
test('starting booster consumes one item and creates a special on an active tile',()=>{
  const {Q}=setup(),B=Q.B;B.pieces={clear(){}};B.selGlow={};B.layout=()=>{};
  B.makeNode=cell=>cell.node={position:{},userData:{}};B.startRun=()=>{};Q.game.to=()=>{};
  Q.U.syncGoal=()=>{};Q.U.refreshBoosters=()=>{};Q.U.say=()=>{};
  Q.preBoost='amulet';const before=Q.P.boost.amulet;B.begin(Q.levelInfo(5));
  assert.equal(Q.P.boost.amulet,before-1);assert.equal(B.grid.flat().find(Boolean).sp,'b');assert.equal(Q.preBoost,null);
});
