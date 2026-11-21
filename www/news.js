/* news.js：お知らせ（右上のベルボタン）。news.json をネットから読み込んで表示する。
   お知らせを出したいときは news.json を書き換えて公開するだけ（アプリの更新・審査は不要）。 */
(function(){
const I=window.APP_INFO||{},$=id=>document.getElementById(id);
const URL_=I.newsUrl||'news.json',SEEN='wood-news-seen',CACHE='wood-news-cache';
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let items=[],snap=[];try{items=JSON.parse(ls.get(CACHE)||'[]')}catch(e){}
if(window.__NEWS)items=window.__NEWS; /* プレビュー用のサンプル */
const bell=document.createElement('button');bell.id='bellBtn';bell.className='roundBtn';bell.setAttribute('aria-label','お知らせ');
bell.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/></svg><span class="bellBadge" id="bellBadge"></span>';
document.body.appendChild(bell);
const panel=document.createElement('div');panel.id='news';
panel.innerHTML='<div class="sCard"><div class="sHead"><span>お知らせ</span><button class="roundBtn" id="nClose" aria-label="閉じる">×</button></div><div class="sBody" id="nBody"></div></div>';
document.body.appendChild(panel);
const seen=()=>{try{return JSON.parse(ls.get(SEEN)||'[]')}catch(e){return[]}};
const today=()=>new Date().toISOString().slice(0,10);
const live=()=>items.filter(n=>n&&n.id&&(!n.until||n.until>=today())).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
function badge(){const s=seen(),n=live().filter(x=>s.indexOf(x.id)<0).length,b=$('bellBadge');b.textContent=n>9?'9+':n;b.style.display=n?'block':'none'}
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
function render(){
  const box=$('nBody'),list=live();box.textContent='';
  if(!list.length){box.appendChild(el('div','sText','お知らせはありません。'));return}
  list.forEach(n=>{const d=el('div','nItem'),m=el('div','nMeta',n.date||'');
    if(snap.indexOf(n.id)<0)m.appendChild(el('span','nNew','NEW'));
    d.append(m,el('div','nTitle',n.title||''),el('div','nBody',n.body||''));
    if(/^https?:\/\//.test(n.url||'')){const a=el('a','nLink',n.label||'詳しく見る ›');a.href=n.url;a.target='_blank';a.rel='noopener';d.appendChild(a)}
    box.appendChild(d)});
}
function markSeen(){ls.set(SEEN,JSON.stringify(live().map(n=>n.id)));badge()}
function load(){
  if(window.__NEWS)return Promise.resolve();
  const c=new AbortController(),t=setTimeout(()=>c.abort(),6000);
  return fetch(URL_+(URL_.indexOf('?')<0?'?':'&')+'t='+Date.now(),{cache:'no-store',signal:c.signal})
    .then(r=>r.ok?r.json():null).then(j=>{clearTimeout(t);if(j&&Array.isArray(j.items)){items=j.items;ls.set(CACHE,JSON.stringify(items))}})
    .catch(()=>{}).then(badge);
}
const isOpen=()=>panel.style.display==='flex';
function open(){snap=seen();render();markSeen();panel.style.display='flex';load().then(()=>{if(isOpen()){render();markSeen()}})}
const close=()=>{panel.style.display='none'};
bell.onclick=open;$('nClose').onclick=close;panel.addEventListener('click',e=>{if(e.target===panel)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
/* ゲーム中は邪魔にならないよう、ベルを隠す */
const g=$('gameScreen'),upd=()=>{bell.style.display=g.style.display==='flex'?'none':''};
new MutationObserver(upd).observe(g,{attributes:true,attributeFilter:['style']});upd();
badge();load();
})();
