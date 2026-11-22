/* timeattack.js：タイムアタック（5分／10分）。時間内にいくつ解けるか。
   かんたんなパズルから始まり、最短手数の少ない順（＝やさしい順）に出題される。 */
(function(){
const $=id=>document.getElementById(id),ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const SKIP_SEC=10; /* スキップのペナルティ（秒） */
const TA=window.TA={active:false};
let mode=5,count=0,idx=0,order=[],deadline=0,timer=null,running=false,hiddenAt=0;
const bestKey=m=>'wood-ta-best-'+m,getBest=m=>+ls.get(bestKey(m))||0;
const fmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const mk=(tag,id,html,cls)=>{const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;e.innerHTML=html;document.body.appendChild(e);return e};
const watch='<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/></svg>';
/* ---- 画面部品 ---- */
const menu=mk('div','taMenu','<div class="sCard"><div class="sHead"><span>TIME ATTACK</span><button class="roundBtn" id="taMClose" aria-label="閉じる">×</button></div><div class="sBody"><div class="sText"><p>時間内に、いくつパズルを解けるか挑戦！かんたんなパズルから始まり、少しずつ難しくなります。</p><p>詰まったら「スキップ」（−'+SKIP_SEC+'秒）。ヒントは使えません。</p></div><button class="sRow" data-m="5"><span>5分コース</span><span class="sR">ベスト <b id="taB5">0</b>問</span></button><button class="sRow" data-m="10"><span>10分コース</span><span class="sR">ベスト <b id="taB10">0</b>問</span></button></div></div>','ovl');
const cd=mk('div','taCount','<div class="taNum" id="taNum"></div>','ovl');
const end=mk('div','taEnd','<div class="sCard"><div class="sHead"><span id="taEndT">TIME UP</span></div><div class="sBody taRes"><div class="taBig"><b id="taEndN">0</b><span>問クリア</span></div><div class="taSub" id="taEndSub"></div><button class="sRow" id="taAgain"><span>もう一度</span><span class="sR">›</span></button><button class="sRow" id="taExit"><span>レベル選択へ</span><span class="sR">›</span></button></div></div>','ovl');
const flash=mk('div','taFlash','');
/* HUD（残り時間・クリア数）とスキップボタンを、ゲーム画面に差し込む */
const hud=document.querySelector('#gameScreen .hud');
hud.insertAdjacentHTML('beforeend','<div class="hudStats taStats"><div><small>残り時間</small><b id="taTime">5:00</b></div><i></i><div><small>クリア数</small><b id="taCnt">00</b></div></div>');
document.querySelector('#gameScreen .hintRow').insertAdjacentHTML('beforeend','<button class="wbtn" id="taSkip">スキップ −'+SKIP_SEC+'秒</button>');
/* レベル選択画面の入口 */
document.querySelector('#levelSelect .pageNav').insertAdjacentHTML('afterend','<button class="wbtn taEntry" id="taBtn">'+watch+'タイムアタック</button>');
/* ---- 流れ ---- */
const show=(e,on)=>{e.style.display=on?'flex':'none'};
function openMenu(){$('taB5').textContent=getBest(5);$('taB10').textContent=getBest(10);show(menu,true)}
function begin(m){
  mode=m;count=0;idx=0;TA.active=true;running=false;clearInterval(timer);
  order=LEVELS.map((l,i)=>i).sort((a,b)=>LEVELS[a].ref-LEVELS[b].ref||a-b);
  show(menu,false);show(end,false);$('gameScreen').classList.add('ta');
  $('taCnt').textContent='00';$('taTime').textContent=fmt(m*60000);$('taTime').classList.remove('low');
  next();countdown(()=>{deadline=Date.now()+m*60000;running=true;timer=setInterval(tick,100)});
}
function countdown(done){
  const n=$('taNum');show(cd,true);let i=3;
  (function step(){
    if(i>0){n.textContent=i;n.classList.remove('go');if(window.tock)tock();i--;setTimeout(step,700)}
    else{n.textContent='GO!';n.classList.add('go');if(window.chime)chime();setTimeout(()=>{show(cd,false);done()},500)}
  })();
}
function next(){if(idx>=order.length){finish(true);return}startLevel(order[idx++])}
function tick(){const left=deadline-Date.now();$('taTime').textContent=fmt(left);$('taTime').classList.toggle('low',left<=10000);if(left<=0)finish(false)}
function say(t){flash.textContent=t;flash.classList.add('show');setTimeout(()=>flash.classList.remove('show'),550)}
TA.decorate=()=>{$('lvTitle').textContent='TIME ATTACK';$('stageNo').textContent=mode+'分'};
TA.cleared=()=>{count++;$('taCnt').textContent=pad2(count);say('CLEAR!');setTimeout(()=>{if(TA.active&&running)next()},520)};
function skip(){if(!running||busy)return;deadline-=SKIP_SEC*1000;say('−'+SKIP_SEC+'秒');tick();if(running)next()}
function finish(all){
  clearInterval(timer);running=false;TA.active=false;busy=true;drag=null;
  const prev=getBest(mode),nb=count>prev;if(nb)ls.set(bestKey(mode),count);
  $('taEndT').textContent=all?'ALL CLEAR!':'TIME UP';$('taEndN').textContent=count;
  $('taEndSub').textContent=(nb&&count>0?'NEW BEST！ ':'')+mode+'分コース　ベスト '+Math.max(prev,count)+'問';show(end,true);
  if(window.chime)chime();
}
function leave(){show(end,false);$('gameScreen').classList.remove('ta');backToList()}
TA.quit=()=>{if(!confirm('タイムアタックを中断しますか？\n（今回の記録は残りません）'))return;clearInterval(timer);running=false;TA.active=false;busy=false;leave()};
TA._setRemaining=ms=>{deadline=Date.now()+ms}; /* 動作確認用 */
$('taBtn').onclick=openMenu;$('taMClose').onclick=()=>show(menu,false);
menu.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>begin(+b.dataset.m));
$('taAgain').onclick=()=>begin(mode);$('taExit').onclick=leave;$('taSkip').onclick=skip;
document.addEventListener('visibilitychange',()=>{if(!running)return;if(document.hidden)hiddenAt=Date.now();else deadline+=Date.now()-hiddenAt});
})();
