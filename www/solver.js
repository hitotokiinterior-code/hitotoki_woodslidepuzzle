/* solver.js：最短手数ソルバー（ヒント用）。画面には触れない純粋関数。
   1手＝1つの木箱を同じ方向にまっすぐ何マスでも動かすこと（game.js のドラッグと同じ数え方）。
   使い方: solvePuzzle(pieces, exit) → [{i, dx, dy}, ...]（i は pieces の添字）。解けなければ null */
(function(root){
const COLS=4,ROWS=5;
function solvePuzzle(pieces,exit,limit){
  limit=limit||500000;
  const n=pieces.length,W=pieces.map(p=>p.w),H=pieces.map(p=>p.h),T=pieces.findIndex(p=>p.id==='target');
  const atExit=(x,y)=>exit.side==='D'?x===exit.pos&&y+H[T]===ROWS:exit.side==='U'?x===exit.pos&&y===0:
    exit.side==='R'?y===exit.pos&&x+W[T]===COLS:y===exit.pos&&x===0;
  /* 同じ大きさの木箱は区別しない盤面キー（無駄な探索を減らす） */
  const key=s=>{const g=new Array(COLS*ROWS).fill('.');
    for(let i=0;i<n;i++){const c=i===T?'T':String.fromCharCode(65+W[i]*3+H[i]);
      for(let dy=0;dy<H[i];dy++)for(let dx=0;dx<W[i];dx++)g[(s[2*i+1]+dy)*COLS+s[2*i]+dx]=(dx||dy)?c.toLowerCase():c}
    return g.join('')};
  const start=Uint8Array.from(pieces.flatMap(p=>[p.x,p.y]));
  if(atExit(start[2*T],start[2*T+1]))return [];
  const states=[start],parent=[-1],mv=[null],seen=new Set([key(start)]);
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let h=0;h<states.length;h++){
    const s=states[h],occ=new Int8Array(COLS*ROWS).fill(-1);
    for(let i=0;i<n;i++)for(let dy=0;dy<H[i];dy++)for(let dx=0;dx<W[i];dx++)occ[(s[2*i+1]+dy)*COLS+s[2*i]+dx]=i;
    for(let i=0;i<n;i++)for(const[ddx,ddy]of DIRS){
      let x=s[2*i],y=s[2*i+1];
      for(;;){
        const nx=x+ddx,ny=y+ddy;
        if(nx<0||ny<0||nx+W[i]>COLS||ny+H[i]>ROWS)break;
        let ok=true;
        for(let dy=0;dy<H[i]&&ok;dy++)for(let dx=0;dx<W[i];dx++){const o=occ[(ny+dy)*COLS+nx+dx];if(o!==-1&&o!==i){ok=false;break}}
        if(!ok)break;
        x=nx;y=ny;
        const t=s.slice();t[2*i]=x;t[2*i+1]=y;const k=key(t);
        if(!seen.has(k)){
          seen.add(k);states.push(t);parent.push(h);mv.push({i,dx:x-s[2*i],dy:y-s[2*i+1]});
          if(i===T&&atExit(x,y)){const path=[];for(let c=states.length-1;parent[c]>=0;c=parent[c])path.push(mv[c]);return path.reverse()}
          if(states.length>limit)return null;
        }
        if(i===T&&atExit(x,y))break; /* 「娘」は出口に着いたらそこで止まる */
      }
    }
  }
  return null;
}
root.solvePuzzle=solvePuzzle;
})(typeof window!=='undefined'?window:globalThis);
