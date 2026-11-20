const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function setup(){
 const c=vm.createContext({window:{},document:{addEventListener(){}},console,Math,Date,setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync('core.js','utf8'),c);const Q=c.window.QOS;
 Q.S={wx:x=>x,wy:y=>y,floatText(){}};c.window.THREE={};Q.Snd.play=()=>{};
 vm.runInContext(fs.readFileSync('board.js','utf8'),c);
 Q.U={syncGoal(){},bump(){},hideBubble(){},janice(){},say(){}};Q.Pop={open:null};
 Q.B.grid=Array.from({length:8},()=>Array(8).fill(null));return Q;
}
test('L shapes in four orientations create bombs; square creates torpedo; five lines create amulet',async()=>{
 const shapes=[
  [[[1,1],[2,1],[3,1],[3,2],[3,3]],'w'],
  [[[1,3],[2,3],[3,3],[3,2],[3,1]],'w'],
  [[[1,1],[1,2],[1,3],[2,1],[3,1]],'w'],
  [[[1,1],[1,2],[1,3],[2,3],[3,3]],'w'],
  [[[1,1],[1,2],[2,1],[2,2]],'q'],
  [[[1,1],[1,2],[1,3],[1,4],[1,5]],'b'],
  [[[1,1],[2,1],[3,1],[4,1],[5,1]],'b'],
  [[[1,1],[1,2],[1,3]],null]
 ];
 for(const [positions,expected] of shapes){
  const Q=setup(),B=Q.B;positions.forEach(([r,c])=>B.grid[r][c]={t:1,sp:null});
  const groups=B.findGroups();assert.equal(groups.length,1);assert.equal(B.specialFor(groups[0]),expected);
  let spawned=[];B.clearCells=async(clear,cascade,spawns)=>{spawned=spawns;B.grid.forEach(row=>row.fill(null));};B.gravity=async()=>{};
  await B.resolve(null);assert.equal(spawned.length,expected?1:0);if(expected)assert.equal(spawned[0].sp,expected);
 }
});
test('tap activation spends exactly one move and resolves before ending turn',async()=>{
 const Q=setup(),B=Q.B;B.visible=true;B.running=true;B.over=false;B.moves=5;B.grid[2][2]={t:1,sp:'w'};
 let calls=[];B.clearCells=async x=>{calls.push('blast');assert.ok(x.has(18));};B.gravity=async()=>calls.push('fall');B.resolve=async()=>calls.push('resolve');B.endTurn=async()=>calls.push('end');
 await B.activate({r:2,c:2});assert.equal(B.moves,4);assert.deepEqual(calls,['blast','fall','resolve','end']);
 await B.activate({r:2,c:2});assert.equal(B.moves,4,'busy board rejects second activation');
});
test('bomb blast covers 3x3 and clips at board edges',()=>{
 const Q=setup(),B=Q.B;assert.equal(B.area({sp:'w'},{r:3,c:3}).length,9);assert.equal(B.area({sp:'w'},{r:0,c:0}).length,4);
});
test('weapon combinations deliver larger blasts and nine-target swarms',async()=>{
 for(const [a,b,expected] of [['w','w',49],['h','w',39],['h','v',15],['q','q',11]]){
  const Q=setup(),B=Q.B;B.level={kind:'score'};Q.game.wait=async()=>{};
  Q.S.ring=Q.S.glow=()=>{};Q.Snd.duck=()=>{};B.shake=B.tideFly=B.turtleSwim=()=>{};
  B.grid=Array.from({length:8},()=>Array.from({length:8},()=>({t:1,sp:null})));
  B.grid[3][3].sp=a;B.grid[3][4].sp=b;
  let affected;B.clearCells=async c=>affected=c;B.gravity=async()=>{};B.resolve=async()=>{};
  await B.specialCombo({r:3,c:3},{r:3,c:4});
  assert.equal(affected.size,expected,`${a}+${b}`);assert.equal(B.grid[3][3].sp,null);assert.equal(B.grid[3][4].sp,null);
 }
});
test('two amulets clear the full board',async()=>{
 const Q=setup(),B=Q.B;Q.S.ring=Q.S.glow=()=>{};Q.Snd.duck=()=>{};B.shake=()=>{};
 B.grid=Array.from({length:8},()=>Array.from({length:8},()=>({t:1,sp:null})));
 B.grid[3][3].sp='b';B.grid[3][4].sp='b';let count;
 B.clearCells=async c=>count=c.size;B.gravity=async()=>{};B.resolve=async()=>{};
 await B.bombCombo({r:3,c:3},{r:3,c:4});assert.equal(count,64);
});
