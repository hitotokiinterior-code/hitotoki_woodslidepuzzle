/* 画像の先読み：木箱・宝石の画像を起動時に読み込んでデコードしておく（レベルに入った瞬間に宝石が一瞬消えるのを防ぐ） */
['gem_coal','gem_ruby','gem_gold','gem_emerald','gem_sapphire','gem_pink','wood_h','wood_v','wood_s','wood_t'].forEach(n=>{
  const im=new Image();im.src='img/'+n+'.jpg';if(im.decode)im.decode().catch(()=>{});window._preload=(window._preload||[]).concat(im);
});
/* 木箱すべりパズル：ゲーム本体。レベルは levels.js、見た目は style.css */
const COLS=4,ROWS=5,PAGE_SIZE=9;
const LEVELS=LEVEL_DATA.map(d=>({k:d.k,ref:d.ref,exit:{side:d.exit[0],pos:+d.exit[1]},
  pieces:d.p.map((a,i)=>({id:i?'p'+i:'target',x:a[0],y:a[1],w:a[2],h:a[3]}))}));
const PAGES=Math.ceil(LEVELS.length/PAGE_SIZE);
const $=id=>document.getElementById(id), board=$('board');
let CELL=70,page=0,cur=0,pieces=[],moves=0,history=[],els={},drag=null,busy=false,mute=false;
try{mute=localStorage.getItem('wood-mute')==='1'}catch(e){}

/* ---- サイズ ---- */
const pad2=n=>String(n).padStart(2,'0');
function sizeBoard(){
  /* 横幅いっぱい／縦に収まる大きさ（PCなど広い画面では高さに合わせてぐっと大きく） */
  const ad=parseFloat(getComputedStyle(document.body).getPropertyValue('--ad-h'))||0;
  CELL=Math.floor(Math.max(58,Math.min(150,(Math.min(window.innerWidth,900)-44)/COLS,(window.innerHeight-ad-385)/ROWS)));
  $('gameScreen').style.setProperty('--bw',(CELL*COLS)+'px');
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
function starPing(i){
  if(mute)return;const a=ac();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();
  o.type='sine';o.frequency.value=[660,880,1175][i]||880;g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(.22,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.4);
  o.connect(g).connect(a.destination);o.start(t);o.stop(t+.45);
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
/* 星の基準：★3は最小手数＋ちょっとの余裕（最小手数の1割、最低1手）、★2は最小手数の1.5倍まで。ここの数字を変えれば調整できる */
const starLimits=ref=>[ref+Math.max(1,Math.floor(ref*0.1)),Math.ceil(ref*1.5)];
function starCount(best,ref){if(best==null)return 0;const[s3,s2]=starLimits(ref);return best<=s3?3:best<=s2?2:1}
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
  skin=String(LEVELS[i].k)[0]==='e'?'coal':GEMS[Math.floor(Math.random()*GEMS.length)];
  $('lvTitle').textContent='LEVEL '+pad2(i+1);$('stageNo').textContent='STAGE '+pad2(i+1)+' / '+pad2(LEVELS.length);resetGame();
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
/* ゴールのブロックの見た目：入門レベル(e1〜e5)は石炭、そのほかは宝石からランダム（レベルに入るたびに抽選） */
const GEMS=['ruby','gold','emerald','sapphire','pink'];let skin='coal';
function build(){
  board.querySelectorAll('.piece').forEach(e=>e.remove());els={};buildExit();
  pieces.forEach(p=>{
    const el=document.createElement('div');el.className='piece';
    el.dataset.k=p.id==='target'?'t':p.w*p.h===1?'s':p.w>p.h?'h':'v';
    el.style.width=(p.w*CELL-6)+'px';el.style.height=(p.h*CELL-6)+'px';
    if(p.id==='target')el.dataset.skin=skin;
    el.addEventListener('pointerdown',e=>onDown(e,p.id,el));
    el.addEventListener('pointermove',onMove);el.addEventListener('pointerup',onUp);el.addEventListener('pointercancel',onUp);
    els[p.id]=el;board.appendChild(el);
  });
}
function render(){pieces.forEach(p=>place(els[p.id],p));$('moves').textContent=pad2(moves)}

/* ---- ドラッグ ---- */
function onDown(e,id,el){
  if(busy||drag)return;ac();
  const p=pieces.find(x=>x.id===id);
  clearHint();drag={id,el,sx:e.clientX,sy:e.clientY,lim:limits(p),axis:null,off:0};
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
  moves++;place(d.el,p);$('moves').textContent=pad2(moves);tock();checkWin();
}

/* ---- ヒント：いまの盤面から最短で解く手順の「最初の一手」を光らせる ---- */
function clearHint(){document.querySelectorAll('.piece.hint').forEach(e=>{e.classList.remove('hint');e.removeAttribute('data-hint')});$('hintMsg').textContent=''}
function showHint(){
  if(busy||drag)return;clearHint();
  const sol=window.solvePuzzle&&solvePuzzle(pieces,curExit());
  if(!sol||!sol.length){$('hintMsg').textContent='この盤面のヒントは出せませんでした';return}
  const m=sol[0],p=pieces[m.i],n=Math.abs(m.dx||m.dy);
  const arrow=m.dx>0?'→':m.dx<0?'←':m.dy>0?'↓':'↑',name=m.dx>0?'右':m.dx<0?'左':m.dy>0?'下':'上';
  els[p.id].classList.add('hint');els[p.id].dataset.hint=arrow;
  $('hintMsg').textContent='光っている木箱を'+name+'へ'+n+'マス（クリアまで あと'+sol.length+'手）';
}
/* 広告を後から付けるときは、ads.js に showRewardedForHint(callback) を作れば、
   「動画を見たらヒント」になる（広告を見終わったら callback() を呼ぶ）。無ければそのまま表示する */
$('hintBtn').addEventListener('click',()=>{if(window.showRewardedForHint)showRewardedForHint(showHint);else showHint()});

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
      const ref=LEVELS[cur].ref;$('statPar').textContent='最小 '+ref+'手 ／ ★3は '+starLimits(ref)[0]+'手以内';
      $('newBestTag').style.display=(prev===null||moves<prev)?'inline-block':'none';
      $('nextBtn').style.display=cur<LEVELS.length-1?'inline-block':'none';
      spawnConfetti();$('win').style.display='flex';showWinStars(starCount(moves,ref));
    },300)},120);
}
function showWinStars(n){
  const ss=[...$('winStars').children];ss.forEach(s=>s.classList.remove('on'));
  ss.slice(0,n).forEach((s,i)=>setTimeout(()=>{s.classList.add('on');starPing(i)},400+i*380));
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
function resetGame(){sizeBoard();pieces=clone(LEVELS[cur].pieces);moves=0;history=[];busy=false;$('parN').textContent=pad2(LEVELS[cur].ref);build();render();clearHint()}
let resizeT;
window.addEventListener('resize',()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{
  if($('gameScreen').style.display==='flex'&&pieces.length){sizeBoard();build();render()}},150)});

/* ---- ボタン ---- */
$('undoBtn').addEventListener('click',()=>{if(busy||!history.length)return;clearHint();pieces=history.pop();moves=Math.max(0,moves-1);render();
  if(window.maybeShowInterstitialOnUndo)maybeShowInterstitialOnUndo()});
$('resetBtn').addEventListener('click',resetGame);
$('backBtn').addEventListener('click',backToList);
$('homeBtn').addEventListener('click',()=>{clearHint();$('win').style.display='none';backToList()});
const afterClear=fn=>()=>{if(window.showInterstitialOnClear)showInterstitialOnClear();$('win').style.display='none';fn()};
$('retryBtn').addEventListener('click',afterClear(resetGame));
$('nextBtn').addEventListener('click',afterClear(()=>startLevel(Math.min(cur+1,LEVELS.length-1))));
$('toListBtn').addEventListener('click',afterClear(backToList));
$('titleScreen').addEventListener('click',()=>{ac();$('titleScreen').style.display='none';$('levelSelect').style.display='flex';if(window.showBannerAd)showBannerAd()});
$('soundBtn').style.opacity=mute?'.55':'1';
buildLevelGrid();
if(window.initAds)initAds();
