/* 木箱すべりパズル：ゲーム本体。レベルは levels.js、見た目は style.css */
const COLS=4,ROWS=5,PAGE_SIZE=9;
const LEVELS=LEVEL_DATA.map(d=>({k:d.k,ref:d.ref,exit:{side:d.exit[0],pos:+d.exit[1]},
  pieces:d.p.map((a,i)=>({id:i?'p'+i:'target',x:a[0],y:a[1],w:a[2],h:a[3]}))}));
const PAGES=Math.ceil(LEVELS.length/PAGE_SIZE);
const $=id=>document.getElementById(id), board=$('board');
let CELL=70,page=0,cur=0,pieces=[],moves=0,history=[],els={},drag=null,busy=false,mute=false;
try{mute=localStorage.getItem('wood-mute')==='1'}catch(e){}

/* ---- サイズ ---- */
function sizeBoard(){
  CELL=Math.round(Math.max(58,Math.min(96,(Math.min(440,window.innerWidth)-36)/COLS)));
  board.style.width=(CELL*COLS)+'px';board.style.height=(CELL*ROWS)+'px';
}

/* ---- 効果音 ---- */
let AC=null;
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tock(){
  if(mute)return;const a=ac();if(!a)return;const t=a.currentTime;
  const o=a.createOscillator(),g=a.createGain();o.type='triangle';
  o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(90,t+.09);
  g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);
  o.connect(g).connect(a.destination);o.start(t);o.stop(t+.13);
  const len=Math.floor(a.sampleRate*.03),buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
  const s=a.createBufferSource(),f=a.createBiquadFilter(),g2=a.createGain();
  s.buffer=buf;f.type='bandpass';f.frequency.value=1300;g2.gain.value=.3;
  s.connect(f).connect(g2).connect(a.destination);s.start(t);
}
function chime(){
  if(mute)return;const a=ac();if(!a)return;
  [523,659,784,1047].forEach((fr,i)=>{
    const t=a.currentTime+i*.11,o=a.createOscillator(),g=a.createGain();
    o.type='sine';o.frequency.value=fr;g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.5);
    o.connect(g).connect(a.destination);o.start(t);o.stop(t+.55);
  });
}

/* ---- 保存（ベスト手数）。キーはレベルの k ＝ 元の番号なので、並べ替えても記録は動かない ---- */
const bestKey=i=>'wood-puzzle-best2-'+LEVELS[i].k;
function getBest(i){try{const v=localStorage.getItem(bestKey(i));return v?parseInt(v,10):null}catch(e){return null}}
function setBest(i,v){try{const c=getBest(i);if(c===null||v<c)localStorage.setItem(bestKey(i),String(v))}catch(e){}}

/* ---- レベル選択 ---- */
function starCount(best,ref){return best==null?0:best<=ref?3:best<=ref*1.15?2:1}
function buildLevelGrid(){
  const g=$('lvGrid');g.innerHTML='';
  const start=page*PAGE_SIZE,end=Math.min(LEVELS.length,start+PAGE_SIZE);
  for(let i=start;i<end;i++){
    const n=starCount(getBest(i),LEVELS[i].ref),c=document.createElement('div');c.className='lvCard';
    c.innerHTML=`<div class="lvnum">${String(i+1).padStart(2,'0')}</div><div class="lvstars">${[0,1,2].map(j=>`<span class="${j<n?'on':''}">★</span>`).join('')}</div>`;
    c.addEventListener('click',()=>startLevel(i));g.appendChild(c);
  }
  $('prevPageBtn').classList.toggle('hide',page===0);
  $('nextPageBtn').classList.toggle('hide',page>=PAGES-1);
  $('pageLabel').textContent=(page+1)+' / '+PAGES;
}
$('prevPageBtn').addEventListener('click',()=>{page=Math.max(0,page-1);buildLevelGrid()});
$('nextPageBtn').addEventListener('click',()=>{page=Math.min(PAGES-1,page+1);buildLevelGrid()});
$('backHomeBtn').addEventListener('click',()=>{$('levelSelect').style.display='none';$('titleScreen').style.display='block'});
$('soundBtn').addEventListener('click',()=>{ac();mute=!mute;try{localStorage.setItem('wood-mute',mute?'1':'0')}catch(e){}
  $('soundBtn').style.opacity=mute?'.55':'1';if(!mute)tock()});
function startLevel(i){
  cur=i;page=Math.floor(i/PAGE_SIZE);$('levelSelect').style.display='none';$('gameScreen').style.display='flex';
  $('lvTitle').textContent='Lv.'+(i+1)+'（最小 '+LEVELS[i].ref+'手）';resetGame();
  if(window.showBannerAd)showBannerAd();
}
function backToList(){$('gameScreen').style.display='none';$('levelSelect').style.display='flex';buildLevelGrid();if(window.showBannerAd)showBannerAd()}

/* ---- 盤面 ---- */
const clone=a=>a.map(p=>({...p}));
const curExit=()=>LEVELS[cur].exit;
function occupied(excl){
  const g=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  pieces.forEach(p=>{if(p.id===excl)return;
    for(let dy=0;dy<p.h;dy++)for(let dx=0;dx<p.w;dx++){const y=p.y+dy,x=p.x+dx;if(y>=0&&y<ROWS&&x>=0&&x<COLS)g[y][x]=p.id}});
  return g;
}
function validStep(p,nx,ny){
  const ex=curExit(),g=occupied(p.id);
  for(let dy=0;dy<p.h;dy++)for(let dx=0;dx<p.w;dx++){
    const y=ny+dy,x=nx+dx,t=p.id==='target';
    if(y>=ROWS){if(t&&ex.side==='D'&&nx===ex.pos)continue;return false}
    if(y<0){if(t&&ex.side==='U'&&nx===ex.pos)continue;return false}
    if(x>=COLS){if(t&&ex.side==='R'&&ny===ex.pos)continue;return false}
    if(x<0){if(t&&ex.side==='L'&&ny===ex.pos)continue;return false}
    if(g[y][x])return false;
  }
  return true;
}
/* 「娘」が出口の位置にぴったり着いたか */
function atExitCell(x,y,p){
  const ex=curExit();
  if(ex.side==='D')return x===ex.pos&&y+p.h===ROWS;
  if(ex.side==='U')return x===ex.pos&&y===0;
  if(ex.side==='R')return y===ex.pos&&x+p.w===COLS;
  return y===ex.pos&&x===0;
}
/* 4方向に何マス動かせるか。「娘」は出口の位置で止める（盤の外へ進み続けて固まるのを防ぐ） */
function limits(p){
  const r={};
  for(const[k,dx,dy]of[['l',-1,0],['r',1,0],['u',0,-1],['d',0,1]]){
    let n=0,x=p.x,y=p.y;
    while(validStep(p,x+dx,y+dy)){x+=dx;y+=dy;n++;if(p.id==='target'&&atExitCell(x,y,p))break}
    r[k]=n;
  }
  return r;
}
function place(el,p,ox=0,oy=0){el.style.left=(p.x*CELL+3+ox)+'px';el.style.top=(p.y*CELL+3+oy)+'px'}
function buildExit(){
  board.querySelectorAll('.exit').forEach(e=>e.remove());
  const ex=curExit(),el=document.createElement('div');el.className='exit side-'+ex.side;
  if(ex.side==='D'||ex.side==='U'){el.style.width=(2*CELL)+'px';el.style.left=(ex.pos*CELL)+'px'}
  else{el.style.height=(2*CELL)+'px';el.style.top=(ex.pos*CELL)+'px'}
  board.appendChild(el);
}
function build(){
  board.querySelectorAll('.piece').forEach(e=>e.remove());els={};buildExit();
  pieces.forEach(p=>{
    const el=document.createElement('div');el.className='piece';
    el.dataset.k=p.id==='target'?'t':p.w*p.h===1?'s':p.w>p.h?'h':'v';
    el.style.width=(p.w*CELL-6)+'px';el.style.height=(p.h*CELL-6)+'px';
    if(p.id==='target')el.textContent='娘';
    el.addEventListener('pointerdown',e=>onDown(e,p.id,el));
    el.addEventListener('pointermove',onMove);el.addEventListener('pointerup',onUp);el.addEventListener('pointercancel',onUp);
    els[p.id]=el;board.appendChild(el);
  });
}
function render(){pieces.forEach(p=>place(els[p.id],p));$('moves').textContent=moves}

/* ---- ドラッグ ---- */
function onDown(e,id,el){
  if(busy||drag)return;ac();
  const p=pieces.find(x=>x.id===id);
  drag={id,el,sx:e.clientX,sy:e.clientY,lim:limits(p),axis:null,off:0};
  el.setPointerCapture(e.pointerId);el.classList.add('drag');
}
function onMove(e){
  if(!drag)return;const d=drag,dx=e.clientX-d.sx,dy=e.clientY-d.sy,p=pieces.find(x=>x.id===d.id);
  if(!d.axis){
    if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
    let ax=Math.abs(dx)>=Math.abs(dy)?'x':'y';
    const can=a=>a==='x'?d.lim.l+d.lim.r>0:d.lim.u+d.lim.d>0;
    if(!can(ax))ax=ax==='x'?'y':'x';
    if(!can(ax))return;d.axis=ax;
  }
  const x=d.axis==='x',v=x?dx:dy;
  d.off=Math.max(-(x?d.lim.l:d.lim.u)*CELL,Math.min((x?d.lim.r:d.lim.d)*CELL,v));
  place(d.el,p,x?d.off:0,x?0:d.off);
}
function onUp(){
  if(!drag)return;const d=drag;drag=null;d.el.classList.remove('drag');
  const p=pieces.find(x=>x.id===d.id),n=d.axis?Math.round(d.off/CELL):0;
  if(!n){place(d.el,p);return}
  history.push(clone(pieces));
  if(d.axis==='x')p.x+=n;else p.y+=n;
  moves++;place(d.el,p);$('moves').textContent=moves;tock();checkWin();
}

/* ---- クリア ---- */
function checkWin(){
  const t=pieces.find(x=>x.id==='target'),ex=curExit();
  if(!atExitCell(t.x,t.y,t))return;
  busy=true;
  setTimeout(()=>{
    if(ex.side==='D')t.y=ROWS;else if(ex.side==='U')t.y=-t.h;else if(ex.side==='R')t.x=COLS;else t.x=-t.w;
    render();chime();
    setTimeout(()=>{
      const prev=getBest(cur);setBest(cur,moves);
      $('statMoves').textContent=moves;$('statBest').textContent=getBest(cur);
      $('statPar').textContent='最小手数: '+LEVELS[cur].ref+'手';
      $('newBestTag').style.display=(prev===null||moves<prev)?'inline-block':'none';
      $('nextBtn').style.display=cur<LEVELS.length-1?'inline-block':'none';
      spawnConfetti();$('win').style.display='flex';
    },300)},120);
}
function spawnConfetti(){
  const card=$('winCard'),cols=['#e0ab55','#b0503a','#6f8b5e','#fff8ea','#8a6238'];
  for(let i=0;i<22;i++){
    const s=document.createElement('div');s.className='confetti';
    s.style.left=(Math.random()*100)+'%';s.style.width=s.style.height=(4+Math.random()*4)+'px';
    s.style.background=cols[i%cols.length];s.style.animationDelay=(Math.random()*.3)+'s';s.style.animationDuration=(1+Math.random()*.8)+'s';
    card.appendChild(s);setTimeout(()=>s.remove(),2200);
  }
}
function resetGame(){sizeBoard();pieces=clone(LEVELS[cur].pieces);moves=0;history=[];busy=false;build();render()}
let resizeT;
window.addEventListener('resize',()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{
  if($('gameScreen').style.display==='flex'&&pieces.length){sizeBoard();build();render()}},150)});

/* ---- ボタン ---- */
$('undoBtn').addEventListener('click',()=>{if(busy||!history.length)return;pieces=history.pop();moves=Math.max(0,moves-1);render();
  if(window.maybeShowInterstitialOnUndo)maybeShowInterstitialOnUndo()});
$('resetBtn').addEventListener('click',resetGame);
$('backBtn').addEventListener('click',backToList);
const afterClear=fn=>()=>{if(window.showInterstitialOnClear)showInterstitialOnClear();$('win').style.display='none';fn()};
$('retryBtn').addEventListener('click',afterClear(resetGame));
$('nextBtn').addEventListener('click',afterClear(()=>startLevel(Math.min(cur+1,LEVELS.length-1))));
$('toListBtn').addEventListener('click',afterClear(backToList));
$('titleScreen').addEventListener('click',()=>{ac();$('titleScreen').style.display='none';$('levelSelect').style.display='flex';if(window.showBannerAd)showBannerAd()});
$('soundBtn').style.opacity=mute?'.55':'1';
buildLevelGrid();
if(window.initAds)initAds();
