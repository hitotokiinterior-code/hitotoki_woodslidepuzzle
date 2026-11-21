/* settings.js：歯車メニュー（音・遊び方・規約・お問い合わせ・データ消去・バージョン） */
(function(){
const I=window.APP_INFO||{},$=id=>document.getElementById(id);
const root=document.createElement('div');root.id='settings';
root.innerHTML='<div class="sCard"><div class="sHead"><span id="sTitle">SETTINGS</span><button class="roundBtn" id="sClose" aria-label="閉じる">×</button></div><div class="sBody" id="sBody"></div></div>';
document.body.appendChild(root);
const body=$('sBody'),title=$('sTitle');
const row=(id,label,right)=>'<button class="sRow" id="'+id+'"><span>'+label+'</span><span class="sR">'+(right||'›')+'</span></button>';
function main(){
  title.textContent='SETTINGS';
  body.innerHTML=row('sSound','効果音','<i class="sw'+(mute?'':' on')+'"></i>')+row('sHow','遊び方')+row('sPrivacy','プライバシーポリシー')+row('sTerms','利用規約')
   +(I.email&&I.email.indexOf('【')<0?'<a class="sRow" href="mailto:'+I.email+'?subject='+encodeURIComponent(I.name+' お問い合わせ')+'"><span>お問い合わせ</span><span class="sR">›</span></a>':'')
   +(window.showAdPrivacyOptions?row('sAds','広告の設定'):'')+row('sReset','データを消去')
   +'<div class="sFoot">'+I.name+'　v'+I.version+'<br>© '+I.year+' '+I.operator+'</div>';
  $('sSound').onclick=()=>{ac();mute=!mute;try{localStorage.setItem('wood-mute',mute?'1':'0')}catch(e){}if(!mute)tock();main()};
  $('sHow').onclick=how;$('sPrivacy').onclick=()=>doc('プライバシーポリシー','privacy.html');$('sTerms').onclick=()=>doc('利用規約','terms.html');
  if($('sAds'))$('sAds').onclick=()=>window.showAdPrivacyOptions();$('sReset').onclick=reset;
}
const back=()=>'<button class="sBack" id="sBack">← 戻る</button>';
function sub(t,html){title.textContent=t;body.innerHTML=back()+html;$('sBack').onclick=main}
function how(){sub('遊び方','<div class="sText"><p>木箱をドラッグして動かし、大切な石を出口（盤の切れ目）まで導こう。</p><p>1つの木箱を、同じ方向にまっすぐ何マス動かしても「1手」です。</p><p>少ない手数でクリアするほど★が増えます（★3は、最小手数に近い手数）。行き詰まったら「ヒント」で次の一手がわかります。</p></div>')}
function doc(t,url){
  title.textContent=t;body.innerHTML=back()+'<iframe class="sDoc" title="'+t+'"></iframe>';$('sBack').onclick=main;
  const f=body.querySelector('iframe'),d=window.__DOCS;if(d&&d[url])f.srcdoc=d[url];else f.src=url;
}
function reset(){sub('データを消去','<div class="sText"><p>ベスト手数と★の記録がすべて消えます。この操作は元に戻せません。</p></div><button class="sRow danger" id="sDo"><span>消去する</span></button><button class="sRow" id="sNo"><span>やめる</span></button>');
  $('sNo').onclick=main;
  $('sDo').onclick=()=>{try{Object.keys(localStorage).filter(k=>k.indexOf('wood-puzzle-best')===0).forEach(k=>localStorage.removeItem(k))}catch(e){}
    if(typeof buildLevelGrid==='function')buildLevelGrid();sub('データを消去','<div class="sText"><p>記録を消去しました。</p></div>')};}
const open=()=>{main();root.style.display='flex'},close=()=>{root.style.display='none'};
$('soundBtn').addEventListener('click',open);$('sClose').onclick=close;
root.addEventListener('click',e=>{if(e.target===root)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();
