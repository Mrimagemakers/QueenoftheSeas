const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
// Minimal DOM harness: exercises the public buttons without exposing arcade state.
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.attrs={};this.disabled=false;this.classes=new Set();this.classList={toggle:(k,v)=>{if(v===undefined)v=!this.classes.has(k);v?this.classes.add(k):this.classes.delete(k);},contains:k=>this.classes.has(k)};}
 append(...ns){ns.forEach(n=>{n.parent=this;this.children.push(n)})}insertBefore(n,b){n.parent=this;this.children.splice(this.children.indexOf(b),0,n)}
 get lastChild(){return this.children.at(-1)}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)}setAttribute(k,v){this.attrs[k]=v}focus(){doc.activeElement=this}animate(){}
 querySelectorAll(sel){return this.children.flatMap(c=>[(sel==='button'&&c.tag==='button')||(sel==='button:not(:disabled)'&&c.tag==='button'&&!c.disabled)?c:null,...c.querySelectorAll(sel)]).filter(Boolean)}querySelector(sel){return this.querySelectorAll(sel)[0]}
 getContext(){return {save(){},restore(){},translate(){},moveTo(){},lineTo(){},closePath(){},createLinearGradient(){return {addColorStop(){}}},fillRect(){},strokeRect(){},beginPath(){},roundRect(){},fill(){},stroke(){}}}
}
let doc;
function setup(){
 let frame=null,now=0;doc={body:new Element('body'),createElement:t=>new Element(t),addEventListener(){},activeElement:null};
 const Q={B:{running:false,over:true},Pop:{open:null},progress:{ready:true},P:{challenges:{},boost:{},pearls:0},U:{syncTop(){}},TOOL_NAMES:{bomb:'Depth Bomb',torpedo:'Turtle Torpedo',shuffle:'Current Shuffle'},TOOL_UNLOCKS:{bomb:16,torpedo:46,shuffle:91},toolUnlocked:()=>true,rnd:n=>Math.floor(Math.random()*n),saveProgress(){}};
 const window={QOS:Q,OceanBlockRules:require('../challenge-rules.js'),addEventListener(){}};
 const ctx=vm.createContext({window,document:doc,Math,performance:{now:()=>now},requestAnimationFrame:fn=>{frame=fn;return 1},cancelAnimationFrame:()=>{frame=null}});
 vm.runInContext(fs.readFileSync('challenges.js','utf8'),ctx);
 const buttons=()=>doc.body.querySelectorAll('button');const click=text=>{const b=buttons().find(b=>b.textContent===text);assert.ok(b,'button '+text);b.onclick();};
 const step=()=>{now+=100;if(frame)frame(now)};
 return {Q,buttons,click,step};
}
test('arcade hub opens all three games; pause and exit work',()=>{
 const h=setup();h.Q.Challenges.open();assert.equal(h.buttons().filter(b=>b.textContent==='Play tier 1').length,3);
 h.buttons().find(b=>b.textContent==='Play tier 1').onclick();h.click('Pause');h.click('▼ Drop');h.click('Resume');h.click('↻ Rotate');h.click('▼ Drop');h.step();h.click('Back to challenges');
 h.buttons().filter(b=>b.textContent==='Play tier 1')[1].onclick();assert.equal(h.buttons().filter(b=>b.textContent==='?').length,12);h.click('Back to challenges');h.click('×');assert.equal(doc.body.children.length,0);
});
test('pearl sprint awards each tier once and practice cannot repeat rewards',()=>{
 const h=setup();h.Q.Challenges.open();h.buttons().filter(b=>b.textContent==='Play tier 1')[2].onclick();
 h.click('Pause');h.click('●');assert.equal(h.Q.P.pearls,0);h.click('Resume');
 for(let tier=0;tier<4;tier++){
  const goal=20+Math.min(2,tier)*10;for(let i=0;i<goal;i++)h.click('●');
  assert.equal(h.Q.P.challenges.sprint.tier,Math.min(3,tier+1));if(tier<3)h.click('Play again');
 }
 assert.equal(h.Q.P.pearls,450);assert.equal(h.Q.P.boost.shuffle,3);
});
