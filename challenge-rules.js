/* Pure falling-block rules shared by Ocean Arcade and automated checks. */
(function(root){
'use strict';
const shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]]];
const R={width:10,height:18,shapes,
 empty:()=>Array.from({length:18},()=>Array(10).fill(0)),
 rotate:m=>m[0].map((_,x)=>m.map(row=>row[x]).reverse()),
 fits:(grid,m,x,y)=>m.every((row,dy)=>row.every((v,dx)=>!v||(x+dx>=0&&x+dx<10&&y+dy<18&&(y+dy<0||!grid[y+dy][x+dx])))),
 merge:(grid,m,x,y,color)=>{let topped=false;m.forEach((row,dy)=>row.forEach((v,dx)=>{if(v){if(y+dy<0)topped=true;else grid[y+dy][x+dx]=color;}}));return topped;},
 clear:grid=>{const kept=grid.filter(row=>row.some(v=>!v)),count=18-kept.length;while(kept.length<18)kept.unshift(Array(10).fill(0));return {grid:kept,count};},
 bag:(random=Math.random)=>{const bag=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}return bag;}
};
root.OceanBlockRules=R;if(typeof module!=='undefined')module.exports=R;
})(typeof window==='undefined'?globalThis:window);
