/* Ocean Arcade: local, earned rewards; three playable challenges, three difficulty tiers each. */
(()=>{
'use strict';
const Q=window.QOS,R=window.OceanBlockRules;
const definitions={blocks:['Reef Blocks','Fit falling coral blocks together. Fill horizontal rows to clear them.'],memory:['Memory Dive','Find matching sea creatures before your air runs out.'],sprint:['Pearl Sprint','Tap the pearl. Avoid the dark urchins. Each mistake costs time.']};
const artwork={blocks:'reef-blocks',memory:'memory-dive',sprint:'pearl-sprint'};
function picture(key,cls='arc-art'){const img=el('img',cls);img.setAttribute('src','assets/arcade/'+artwork[key]+'.webp');img.setAttribute('alt','');return img;}
let overlay=null,mode=null,state=null,raf=0,last=0,previousFocus=null;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function button(label,fn,cls='arc-btn'){const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;}
function shell(title){
 cancelAnimationFrame(raf);mode=null;state=null;overlay?.remove();
 overlay=el('div','arc-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);
 const panel=el('section','arc-panel');overlay.append(panel);
 const head=el('header','arc-head');head.append(el('h2','',title),button('×',close,'arc-close'));panel.append(head);
 document.body.append(overlay);head.querySelector('button').setAttribute('aria-label','Close Ocean Arcade');head.querySelector('button').focus();
 return panel;
}
function close(){cancelAnimationFrame(raf);mode=null;state=null;overlay?.remove();overlay=null;previousFocus?.focus();}
function hub(){
 const panel=shell('Ocean Arcade');panel.className+=' arc-hub';
 const welcome=el('div','arc-welcome');const portrait=el('img','arc-guide');portrait.setAttribute('src','assets/janice_portrait.webp');portrait.setAttribute('alt','Dr. Janice Miller');
 const greeting=el('div');greeting.append(el('span','arc-eyebrow','DR. JANICE’S CHALLENGE COLLECTION'),el('p','arc-intro','Explore. Play. Discover your next treasure.'));welcome.append(portrait,greeting);panel.append(welcome);
 const grid=el('div','arc-gallery');
 for(const [key,[name,desc]] of Object.entries(definitions)){
  const record=Q.P.challenges[key]||{tier:0,best:0};const card=el('article','arc-card');
  const artButton=button('',()=>start(key),'arc-art-button');artButton.setAttribute('aria-label','Open '+name);artButton.append(picture(key));
  const body=el('div','arc-card-body');body.append(el('span','arc-eyebrow',key==='blocks'?'CORAL PUZZLE':key==='memory'?'OCEAN DISCOVERY':'TREASURE RUSH'),el('h3','',name),el('p','',desc));
  const medals=el('div','arc-medals');medals.setAttribute('aria-label',record.tier+' of 3 medals earned');for(let i=0;i<3;i++)medals.append(el('span',i<record.tier?'earned':'','✦'));
  body.append(medals,el('p','arc-meta',`${record.tier}/3 medals · Best ${record.best}`),button(record.tier>=3?'Practice':'Play tier '+(record.tier+1),()=>start(key)));
  card.append(artButton,body);grid.append(card);
 }
 panel.append(grid,el('p','arc-note','Win each new medal tier to earn 75, 150, then 225 pearls + an expedition tool. Progress saves automatically.'));
}
Q.Challenges={open(){if(Q.B.running&&!Q.B.over)return;if(!Q.progress.ready||Q.Pop.open)return;previousFocus=document.activeElement;hub();},close};
function reefScenery(panel){
 overlay.className+=' arc-reef';panel.className+=' arc-reef-panel';
 const ocean=el('div','reef-atmosphere');ocean.setAttribute('aria-hidden','true');
 ocean.append(el('div','reef-light'));
 for(let i=0;i<22;i++){const bubble=el('i','reef-bubble');bubble.setAttribute('style',`--x:${(i*47)%100}%;--size:${5+(i*7)%19}px;--duration:${12+i%9}s;--delay:-${i*1.7}s;--drift:${i%2?35:-30}px`);ocean.append(bubble);}
 for(let i=0;i<7;i++){const fish=el('i','reef-fish');fish.setAttribute('style',`--y:${14+i*11}%;--duration:${24+i*4}s;--delay:-${i*8}s;--size:${18+i%3*9}px;--tint:${i%2?'#ffd47c':'#76e4ee'}`);ocean.append(fish);}
 for(let i=0;i<2;i++){const jelly=el('div','reef-jelly');jelly.setAttribute('style',`left:${i?88:6}%;top:${i?61:28}%;--delay:-${i*3}s`);for(let j=0;j<4;j++)jelly.append(el('i'));ocean.append(jelly);}
 overlay.insertBefore(ocean,panel);
}
function start(key){
 const panel=shell(definitions[key][0]);mode=key;reefScenery(panel);overlay.className+=' arc-theme-'+key;
 const banner=el('div','arc-game-banner');banner.append(picture(key),el('p','',definitions[key][1]));panel.append(banner);
 const record=Q.P.challenges[key]||{tier:0,best:0};const tier=Math.min(2,record.tier);
 state={tier,practice:record.tier>=3,finished:false,paused:false,elapsed:0,score:0};
 const toolbar=el('div','arc-toolbar');state.status=el('div','arc-status');state.status.setAttribute('aria-live','polite');state.pauseBtn=button('Pause',pause);toolbar.append(state.status,state.pauseBtn);panel.append(toolbar);
 state.surface=el('div','arc-surface');panel.append(state.surface);
 const bottom=el('div','arc-footer');bottom.append(button('Back to challenges',hub));panel.append(bottom);
 if(key==='blocks')initBlocks(panel);if(key==='memory')initMemory();if(key==='sprint')initSprint();
 updateStatus();last=performance.now();raf=requestAnimationFrame(tick);
}
function pause(){if(!state||state.finished)return;state.paused=!state.paused;state.pauseBtn.textContent=state.paused?'Resume':'Pause';state.surface.classList.toggle('arc-paused',state.paused);overlay.classList.toggle('reef-still',state.paused);last=performance.now();updateStatus();}
function updateStatus(){
 if(!state)return;
 const s=state;let text=mode==='blocks'?`Rows ${s.lines}/${s.goal} · Score ${s.score}`:mode==='memory'?`Pairs ${s.pairs}/${s.goal} · ${Math.ceil(Math.max(0,s.seconds-s.elapsed))}s`:`Pearls ${s.score}/${s.goal} · ${Math.ceil(Math.max(0,s.seconds-s.elapsed))}s`;
 if(s.paused)text='Paused · '+text;
 if(s.status.textContent!==text)s.status.textContent=text;
}
function finish(won){
 if(!state||state.finished)return;state.finished=true;cancelAnimationFrame(raf);
 const s=state,key=mode,record=Q.P.challenges[key]||(Q.P.challenges[key]={tier:0,best:0});
 const score=mode==='memory'?s.pairs: s.score;record.best=Math.max(record.best,score);
 let reward='Keep practicing—you can retry any time.';
 if(won && !s.practice && record.tier===s.tier){record.tier++;const pearls=75+75*s.tier;Q.P.pearls+=pearls;
  const tool=key==='blocks'?'bomb':key==='memory'?'torpedo':'shuffle';Q.P.boost[tool]=Math.min(99,(Q.P.boost[tool]||0)+1);
  reward=`Medal ${record.tier}/3 earned! +${pearls} pearls and +1 ${Q.TOOL_NAMES[tool]}.`;
  if(!Q.toolUnlocked(tool))reward+=` Stored until expedition ${Q.TOOL_UNLOCKS[tool]}.`;
 }else if(won)reward='Challenge complete! All three medals are already collected.';
 Q.saveProgress();Q.U.syncTop();
 const panel=shell(won?'Dive complete!':'Try another dive');
 panel.append(el('div','arc-medal',won?'✦':'◇'),el('h3','',definitions[key][0]),el('p','',reward),el('p','arc-meta',`Your score: ${score} · Best: ${record.best}`),button('Play again',()=>start(key)),button('Challenge menu',hub));
}
function tick(now){
 if(!state||state.finished)return;const dt=Math.min(.1,(now-last)/1000);last=now;
 if(!state.paused){state.elapsed+=dt;
  if(mode==='blocks'){state.dropClock+=dt;if(state.dropClock>=Math.max(.16,.85-state.tier*.15-state.lines*.018)){state.dropClock=0;step();}if(state&&mode==='blocks')drawBlocks();}
  else if(mode==='memory'){if(state.hideAt&&state.elapsed>=state.hideAt){for(const i of state.flips){state.buttons[i].textContent='?';state.buttons[i].classList.toggle('is-revealed',false);state.buttons[i].setAttribute('aria-label','Hidden sea creature '+(i+1));}state.flips=[];state.hideAt=0;}}
  else if(mode==='sprint'&&state.elapsed>=state.shiftAt)placePearl();
  if(state&&mode!=='blocks'&&state.elapsed>=state.seconds){finish(false);return;}updateStatus();
 }
 if(state)raf=requestAnimationFrame(tick);
}
// ---------- falling blocks ----------
function take(){if(!state.bag.length)state.bag=R.bag();return state.bag.pop();}
function spawn(){
 const s=state;s.piece={m:R.shapes[s.next].map(r=>r.slice()),x:3,y:0,color:s.next+1};s.next=take();
 if(!R.fits(s.grid,s.piece.m,s.piece.x,s.piece.y)){finish(false);return false;}return true;
}
function initBlocks(panel){
 Object.assign(state,{grid:R.empty(),bag:[],lines:0,goal:8+state.tier*4,dropClock:0});state.next=take();spawn();
 const canvas=el('canvas','arc-blocks');canvas.width=300;canvas.height=540;canvas.setAttribute('aria-label','Falling coral blocks: use arrow keys to move and rotate, space to drop.');state.canvas=canvas;state.surface.append(canvas);
 state.nextLabel=el('p','arc-next');state.surface.append(state.nextLabel);
 const controls=el('div','arc-controls');for(const [label,action]of [['◀','left'],['↻ Rotate','rotate'],['▶','right'],['▼ Drop','drop']])controls.append(button(label,()=>blockInput(action)));panel.insertBefore(controls,panel.lastChild);
 const note=el('p','arc-note','← → Move · ↑ Rotate · ↓ Soft drop · Space Drop · P Pause. Complete rows; keep blocks below the top.');panel.insertBefore(note,panel.lastChild);drawBlocks();
}
function lock(){
 const s=state,p=s.piece;if(R.merge(s.grid,p.m,p.x,p.y,p.color)){finish(false);return;}
 const result=R.clear(s.grid);s.grid=result.grid;s.lines+=result.count;s.score+=[0,100,300,500,800][result.count]*(s.tier+1);
 if(s.lines>=s.goal){finish(true);return;}spawn();
}
function step(){if(!state||mode!=='blocks')return;const p=state.piece;if(R.fits(state.grid,p.m,p.x,p.y+1))p.y++;else lock();}
function blockInput(action){
 if(!state||mode!=='blocks'||state.paused)return;const s=state,p=s.piece;
 if(action==='left'||action==='right'){const dx=action==='left'?-1:1;if(R.fits(s.grid,p.m,p.x+dx,p.y))p.x+=dx;}
 if(action==='rotate'){const m=R.rotate(p.m);for(const dx of [0,-1,1,-2,2])if(R.fits(s.grid,m,p.x+dx,p.y)){p.m=m;p.x+=dx;break;}}
 if(action==='down')step();
 if(action==='drop'){while(R.fits(s.grid,p.m,p.x,p.y+1)){p.y++;s.score+=2;}lock();}
 if(state&&mode==='blocks')drawBlocks();updateStatus();
}
function drawBlocks(){
 const s=state,g=s.canvas?.getContext('2d');if(!g)return;
 const colors=['','#b25bff','#ffbd24','#20e5c1','#fa63b5','#35bfff','#ff7242','#8ceafa'];
 g.clearRect(0,0,300,540);g.fillStyle='rgba(2,24,43,.63)';g.fillRect(0,0,300,540);
 // Transparent jewel faces let the ocean grid show through; beveled facets give each cube depth.
 const cell=(x,y,v,ghost=false)=>{
  if(y<0)return;const X=x*30+2,Y=y*30+2,c=colors[v];
  g.save();g.translate(X,Y);
  if(ghost){g.fillStyle=c+'16';g.fillRect(1,1,24,24);g.strokeStyle=c+'99';g.lineWidth=1;g.strokeRect(1,1,24,24);g.restore();return;}
  const face=g.createLinearGradient(0,0,26,26);face.addColorStop(0,'#f0ffffba');face.addColorStop(.18,c+'c4');face.addColorStop(.5,c+'55');face.addColorStop(.76,c+'ac');face.addColorStop(1,'#03162b99');
  g.shadowColor=c;g.shadowBlur=6;g.fillStyle=face;g.beginPath();g.roundRect(.5,.5,25,25,2);g.fill();g.shadowBlur=0;
  const facet=(points,fill)=>{g.beginPath();points.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));g.closePath();g.fillStyle=fill;g.fill();};
  facet([[1,1],[25,1],[20,6],[6,6]],'#eaffff85');
  facet([[1,1],[6,6],[6,20],[1,25]],c+'aa');
  facet([[25,1],[20,6],[20,20],[25,25]],'#001b406e');
  facet([[1,25],[6,20],[20,20],[25,25]],c+'c0');
  facet([[6,6],[20,6],[6,20]],'#e4ffff26');
  facet([[6,20],[20,6],[20,20]],c+'33');
  g.strokeStyle='#e0ffffb8';g.lineWidth=.85;g.strokeRect(.8,.8,24.4,24.4);
  g.strokeStyle=c+'cf';g.lineWidth=.6;g.strokeRect(6,6,14,14);
  g.beginPath();g.moveTo(2,9);g.lineTo(2,2);g.lineTo(13,2);g.strokeStyle='#ffffffed';g.lineWidth=1.2;g.stroke();
  g.fillStyle='#fff';g.fillRect(3,3,2,2);g.restore();
 };
 for(let y=0;y<18;y++)for(let x=0;x<10;x++){g.strokeStyle='#28506855';g.strokeRect(x*30,y*30,30,30);if(s.grid[y][x])cell(x,y,s.grid[y][x]);}
 const p=s.piece;let landing=p.y;while(R.fits(s.grid,p.m,p.x,landing+1))landing++;
 p.m.forEach((row,y)=>row.forEach((v,x)=>{if(v)cell(p.x+x,landing+y,p.color,true)}));
 p.m.forEach((row,y)=>row.forEach((v,x)=>{if(v)cell(p.x+x,p.y+y,p.color)}));
 s.nextLabel.textContent='Next: '+['Long coral','Pearl square','Trident','Sea current','Reef current','Left hook','Right hook'][s.next];
}
// ---------- memory dive ----------
function initMemory(){
 const s=state;s.goal=6+s.tier*2;s.seconds=70-s.tier*10;s.pairs=0;s.flips=[];s.hideAt=0;s.matched=new Set();
 const symbols=['⭐','🐚','🐙','🦑','🐠','🪸','🐬','🦀','💎','🪼'];const deck=[...symbols.slice(0,s.goal),...symbols.slice(0,s.goal)];
 for(let i=deck.length-1;i>0;i--){const j=Q.rnd(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}s.deck=deck;
 const grid=el('div','arc-memory');s.buttons=deck.map((v,i)=>{const b=button('?',()=>flip(i),'arc-card-back');b.setAttribute('aria-label','Hidden sea creature '+(i+1));grid.append(b);return b;});s.surface.append(grid);
}
function flip(i){
 const s=state;if(!s||s.paused||s.hideAt||s.matched.has(i)||s.flips.includes(i))return;
 s.flips.push(i);s.buttons[i].textContent=s.deck[i];s.buttons[i].classList.toggle('is-revealed',true);s.buttons[i].setAttribute('aria-label',s.deck[i]);
 if(s.flips.length===2){const [a,b]=s.flips;if(s.deck[a]===s.deck[b]){s.matched.add(a);s.matched.add(b);s.buttons[a].disabled=s.buttons[b].disabled=true;s.pairs++;s.flips=[];if(s.pairs===s.goal){finish(true);return;}}else s.hideAt=s.elapsed+.8;}updateStatus();
}
// ---------- pearl sprint ----------
function initSprint(){
 const s=state;s.goal=20+s.tier*10;s.seconds=45;s.score=0;
 const grid=el('div','arc-sprint');s.buttons=Array.from({length:9},(_,i)=>{const b=button('',()=>hitPearl(i),'arc-target');grid.append(b);return b;});s.surface.append(grid);placePearl();
 s.surface.append(el('p','arc-note','Pearl = +1 · Urchin = −3 seconds'));
}
function placePearl(){const s=state;s.target=Q.rnd(9);s.shiftAt=s.elapsed+Math.max(.6,1.6-s.tier*.3);s.buttons.forEach((b,i)=>{b.textContent=i===s.target?'●':'✹';b.classList.toggle('is-pearl',i===s.target);b.setAttribute('aria-label',i===s.target?'Collect pearl':'Urchin: avoid');});}
function hitPearl(i){const s=state;if(!s||s.paused)return;if(i===s.target){s.score++;if(s.score>=s.goal){finish(true);return;}placePearl();}else{s.elapsed+=3;s.buttons[i].animate([{transform:'scale(.8)'},{transform:'scale(1)'}],{duration:150});}updateStatus();}
window.addEventListener('keydown',e=>{
 if(!overlay)return;
 if(e.key==='Tab'){const items=[...overlay.querySelectorAll('button:not(:disabled)')];const first=items[0],end=items.at(-1);if(e.shiftKey&&document.activeElement===first){end.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===end){first.focus();e.preventDefault();}e.stopImmediatePropagation();return;}
 if(e.key==='Escape'){close();e.preventDefault();e.stopImmediatePropagation();return;}
 if(e.key==='p'||e.key==='P'){pause();e.preventDefault();}
 const actions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'down',' ':'drop'};
 if(mode==='blocks'&&actions[e.key]){blockInput(actions[e.key]);e.preventDefault();}
 e.stopImmediatePropagation();
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state&&!state.paused)pause();});
})();
