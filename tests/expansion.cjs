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
test('302 expeditions have playable boards and attainable collection types',()=>{
 const {Q}=setup(),B=Q.B;assert.equal(Q.LEVELS,302);assert.equal(Q.REGIONS.length,21);
 B.pieces={clear(){}};B.selGlow={};B.layout=()=>{};B.makeNode=()=>({position:{},userData:{}});B.startRun=()=>{};Q.game.to=()=>{};Q.U.syncGoal=()=>{};Q.U.refreshBoosters=()=>{};Q.U.say=()=>{};
 const seen=new Set();
 for(let n=1;n<=302;n++){
  const L=Q.levelInfo(n);assert.ok(L.region);assert.equal(new Set(L.palette).size,L.palette.length);if(L.kind==='collect')assert.ok(L.palette.includes(L.ctype));
  B.begin(L);assert.equal(B.findGroups().length,0,'no initial match '+n);assert.ok(B.findMove(),'legal move '+n);
  for(const c of B.grid.flat().filter(Boolean)){assert.ok(L.palette.includes(c.t));seen.add(c.t);}
 }
 assert.equal(seen.size,13);assert.equal(Q.levelInfo(302).last,true);
 assert.ok(Q.levelInfo(301).moves<Q.levelInfo(137).moves);assert.ok(Q.levelInfo(301).palette.length>Q.levelInfo(137).palette.length);
 assert.ok(Q.RELICS[302]);assert.equal(Object.keys(Q.RELICS).length,18);
});
test('legacy completion, new tool stocks and arcade medals survive saves',async()=>{
 const {Q,store}=setup();store.set('qos_progress',JSON.stringify({unlocked:136,stars:{135:3},boost:{amulet:4},challenges:{blocks:{tier:2,best:4000}},pearls:150}));
 await Q.loadProgress();assert.equal(Q.P.unlocked,136);assert.equal(Q.P.challenges.blocks.tier,2);assert.equal(Q.P.boost.bomb,0);
 Q.P.boost.bomb=3;Q.P.challenges.memory={tier:1,best:6};Q.saveProgress();await new Promise(r=>setTimeout(r,220));await Q.loadProgress();
 assert.equal(Q.P.boost.bomb,3);assert.equal(Q.P.challenges.memory.tier,1);assert.equal(Q.P.stars[135],3);
 Q.P.unlocked=15;assert.equal(Q.toolUnlocked('bomb'),false);Q.P.unlocked=16;assert.equal(Q.toolUnlocked('bomb'),true);
});
const R=require('../challenge-rules.js');
test('falling blocks collide, rotate, clear four rows and preserve the board size',()=>{
 let grid=R.empty();assert.equal(R.fits(grid,R.shapes[0],7,0),false);assert.equal(R.fits(grid,R.shapes[1],0,17),false);
 for(let y=14;y<18;y++)grid[y].fill(1);
 let result=R.clear(grid);assert.equal(result.count,4);assert.equal(result.grid.length,18);assert.ok(result.grid.every(r=>r.length===10&&r.every(v=>v===0)));
 let m=R.shapes[2];for(let i=0;i<4;i++)m=R.rotate(m);assert.deepEqual(m,R.shapes[2]);
 grid=R.empty();R.merge(grid,R.shapes[1],4,16,2);assert.equal(R.fits(grid,R.shapes[1],4,16),false);
 assert.equal(R.merge(grid,[[1]],0,-1,1),true);assert.equal(new Set(R.bag()).size,7);
});
