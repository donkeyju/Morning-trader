/* =========================================================
   모닝 트레이더 — 주식장
   14 투자 금액 + 2종목 고르기 / 15 1분 주식 미니게임
   (파일 구조와 규칙은 저장소의 CLAUDE.md 참고)
   ========================================================= */
/* =========================================================
   14. 주식장: 투자 금액 + 2종목 고르기
   ========================================================= */
function screenPick(){
  S.picks=S.picks.slice(0,2);
  app.innerHTML=`${hud()}
    <h2 class="sh">📈 오늘 투자할 2종목</h2>
    <div class="small" style="text-align:left">${invBadge()}</div>
    <div class="box alloc">
      <div class="lab">현금 ${won(S.cash)} 중 얼마를 투자할까?</div>
      <div class="quick" id="amt" style="margin-top:6px">${[25,50,75,100].map(p=>`<button data-p="${p}" class="${S.investPct===p?'on':''}">${p}%</button>`).join('')}</div>
      <div class="small" style="text-align:left;margin-top:6px" id="amtTxt"></div>
    </div>
    <div class="small" style="text-align:left">소형주는 많이 출렁이지만 큰돈이 들어가면 체결가가 크게 밀려요.</div>
    <div class="grid">${STOCKS.map(s=>`
      <button class="card" data-k="${s.k}">
        <div class="sec">${s.sec} · ${VOL[s.v].size}</div><div class="nm">${s.name}</div>
        <div class="row"><span class="px">${s.code} ${Math.round(S.prices[s.k]).toLocaleString()}</span><span class="tag ${s.v}">${VOL[s.v].label}</span></div>
      </button>`).join('')}</div>
    <div id="dirbox"></div>
    <div class="btns"><button class="btn sec" id="back">← 다른 걸 할래요</button><button class="btn sec" id="news">뉴스 보기</button></div>
    <button class="btn" id="next" disabled>1분 장 시작!</button>`;
  const amt=()=>{const iv=S.cash*S.investPct/100; document.getElementById('amtTxt').innerHTML=`투자 <b style="color:var(--ink)">${won(iv)}</b> (종목당 ${won(iv/2)}) · 나머지 ${won(S.cash-iv)}은 적금`;
    app.querySelectorAll('#amt button').forEach(b=>b.classList.toggle('on',+b.dataset.p===S.investPct));};
  app.querySelectorAll('#amt button').forEach(b=>b.onclick=()=>{S.investPct=+b.dataset.p;beep(520,.04);amt();});
  amt();
  const refresh=()=>{app.querySelectorAll('.card').forEach(c=>c.classList.toggle('sel',S.picks.includes(c.dataset.k)));
    document.getElementById('next').disabled=S.picks.length!==2||S.cash<10000;
    // 슈퍼개미부터: 종목마다 "오른다(매수) / 내린다(공매도)" 선택
    const box=document.getElementById('dirbox');
    box.innerHTML=S.inv.tier>=1&&S.picks.length?`<div class="box"><div class="lab">🦸 방향 고르기 (공매도: 떨어지면 돈을 벌고, 오르면 손해)</div>${S.picks.map(k=>{const st=STOCKS.find(x=>x.k===k), d=S.dir[k]||1;
      return `<div class="ord"><div class="ordt">${st.name}</div><div class="quick">
        <button data-dir="${k}" data-v="1" class="${d>0?'on':''}">📈 오른다 (매수)</button><button data-dir="${k}" data-v="-1" class="${d<0?'on':''}">📉 내린다 (공매도)</button></div></div>`;}).join('')}</div>`:'';
    box.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{S.dir[b.dataset.dir]=+b.dataset.v; beep(520,.04); refresh();});};
  app.querySelectorAll('.card').forEach(c=>c.onclick=()=>{const k=c.dataset.k;
    if(S.picks.includes(k)) S.picks=S.picks.filter(x=>x!==k); else { if(S.picks.length>=2) S.picks.shift(); S.picks.push(k);} beep(600,.04); refresh();});
  refresh();
  document.getElementById('back').onclick=()=>{beep(660);screenHub();};
  document.getElementById('news').onclick=showNewsSheet;
  document.getElementById('next').onclick=()=>{S.action='stock';beep(990);screenTrade();};
}


/* =========================================================
   15. 1분 주식 미니게임
   가격 = 뉴스 추세 + 랜덤 흔들림
   체결가 = 현재가 × (1 ± 주문금액 / 시장크기)   ← 슬리피지
   ========================================================= */
function screenTrade(){
  const r=dayRng(2);
  const invest=S.cash*S.investPct/100;
  T={tick:0,running:false,active:0,ratio:.5,invest,rng:r,bTick:-1,
     stocks:S.picks.map(k=>{const s=STOCKS.find(x=>x.k===k), v=VOL[s.v], p=S.prices[k];
       return {...s, vol:v.n, mcap:v.mcap, drift:clamp(S.today.eff[k],-1,1)*STOCK_TREND*v.t, price:p, open:p, hist:[p], z:0,
               budget:invest/2, cash:invest/2, shares:0, avg:0, marks:[], alertUntil:-1, slipCost:0,
               dir:S.inv.tier>=1?(S.dir[k]||1):1};})};   // dir: 1 매수, -1 공매도
  if(r()<.30){T.bTick=200+Math.floor(r()*200); T.bIdx=Math.floor(r()*2); T.bEvt=BREAKING[Math.floor(r()*BREAKING.length)];}

  app.innerHTML=`
    <div class="topbar"><span class="tm" id="tm">60.0</span><div class="tbar"><i id="tb"></i></div></div>
    <div class="breaking" id="brk"></div>
    <div class="tabs">${T.stocks.map((s,i)=>`<button class="tab" data-i="${i}"><span id="tc${i}">${s.code}</span><small id="tp${i}">+0.0%</small></button>`).join('')}</div>
    <div class="chartwrap"><canvas id="ch" class="pix" width="240" height="140"></canvas><div class="cd" id="cd">3</div><div class="toast" id="toast"></div></div>
    <div class="quote"><div><div class="nm" id="qn"></div><div class="small" style="text-align:left" id="qs"></div></div><div class="pr" id="qp"></div></div>
    <div class="box pos" style="padding:8px 10px">
      <span>보유 <b id="ps"></b></span><span>평균단가 <b id="pa"></b></span>
      <span>평가 <b id="pv"></b></span><span>손익 <b id="pl"></b></span></div>
    <div class="quick" id="ratio">${[[.25,'25%'],[.5,'50%'],[1,'전량']].map(([v,t])=>`<button data-r="${v}">${t}</button>`).join('')}</div>
    <div class="small" id="slip"></div>
    <div class="btns"><button class="btn buy big" id="buy" disabled>매수</button><button class="btn sell big" id="sell" disabled>매도</button></div>
    <div class="hud"><span>오늘 총 손익 <b id="tot">0원</b></span><button class="linkbtn" id="news">뉴스 보기</button></div>`;
  app.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{T.active=+b.dataset.i;beep(440,.03);updTrade();});
  app.querySelectorAll('#ratio button').forEach(b=>b.onclick=()=>{T.ratio=+b.dataset.r;beep(520,.03);updTrade();});
  document.getElementById('buy').onclick=doBuy;
  document.getElementById('sell').onclick=doSell;
  document.getElementById('news').onclick=showNewsSheet;
  updTrade(); drawChart();
  const cd=document.getElementById('cd'); let n=3; beep(440,.1);
  const iv=setInterval(()=>{n--; if(n>0){cd.textContent=n;beep(440,.1);} else {clearInterval(iv); cd.textContent='GO!'; beep(880,.2);
      setTimeout(()=>{if(cd.textContent==='GO!')cd.textContent='';},500); T.running=true; document.getElementById('buy').disabled=false; document.getElementById('sell').disabled=false; runTicks();}},800);
}
function runTicks(){
  const dt=1/TICKS;
  T.timer=setInterval(()=>{
    if(!T||!T.running) return;
    T.tick++;
    if(T.tick===T.bTick){const s=T.stocks[T.bIdx]; const e=T.bEvt.e;
      s.drift=s.drift*.4+e*.8; s.price*=Math.exp(e*.03); s.alertUntil=T.tick+50;
      const el=document.getElementById('brk'); el.textContent='[속보] '+T.bEvt.h.replace('{n}',s.name); el.classList.add('show');
      beep(1200,.15,'sawtooth',.06); setTimeout(()=>beep(900,.15,'sawtooth',.06),180); buzz([80,60,80]);
    }
    T.stocks.forEach(s=>{
      // 공매도는 주가가 2배가 되면 손실이 원금 전부라서 강제 청산
      if(s.dir<0&&s.shares>0&&s.price>=2*s.avg*.98){ sellCore(s,s.shares); s.marks.push({i:s.hist.length-1,t:'s'}); toast(`${s.name} 공매도 강제 청산!`); }
      s.z=.85*s.z+.527*gauss(T.rng);
      s.price*=Math.exp(s.drift*dt + s.vol*Math.sqrt(dt)*s.z*.33*STOCK_NOISE); // .33: 흐름이 이어지는 만큼 크기를 보정
      s.hist.push(s.price);
      const back=s.hist[Math.max(0,s.hist.length-25)];
      if(Math.abs(s.price/back-1)>s.vol*.25) s.alertUntil=Math.max(s.alertUntil,T.tick+10);
    });
    updTrade();
    if(T.tick>=TICKS) endTrade();
  },TICK_MS);
  (function loop(){ if(!T)return; drawChart(); if(T.tick<TICKS) requestAnimationFrame(loop); })();
}
// 이번에 살 금액 / 팔 수량
const buyAmt=s=>T.ratio>=1? s.cash : Math.min(s.cash, s.budget*T.ratio);
const sellSh=s=>T.ratio>=1? s.shares : s.shares*T.ratio;
let toastTimer=null;
function toast(msg){const t=document.getElementById('toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),1400);}
// 매수: 비싸게 사짐 (현재가 × (1+밀림)) / 공매도: 싸게 팔림 (현재가 × (1−밀림))
const enterName=s=>s.dir>0?'매수':'공매도', exitName=s=>s.dir>0?'매도':'갚기';
function doBuy(){ if(!T||!T.running)return; const s=T.stocks[T.active], amt=buyAmt(s);
  if(amt<1000){beep(200,.08);toast('쓸 현금이 없어요');return;}
  const slip=amt/s.mcap, fill=s.price*(1+s.dir*slip), sh=amt*(1-FEE-(s.dir<0?SHORT_FEE:0))/fill;
  s.avg=(s.avg*s.shares+fill*sh)/(s.shares+sh); s.shares+=sh; s.cash-=amt; s.slipCost+=amt*slip;
  s.marks.push({i:s.hist.length-1,t:'b'}); beep(988,.06);beep(1318,.08); buzz(30);
  toast(`${enterName(s)} ${won(amt)} · 체결 ${Math.round(fill).toLocaleString()} (밀림 ${(slip*100).toFixed(1)}%)`); updTrade(); }
// 청산: 매수는 팔아서 현금으로 / 공매도는 "들어간 가격 × 2 − 지금 가격"만큼 돌려받음 (떨어질수록 이득)
function sellCore(s,sh){const amt=sh*s.price, slip=amt/s.mcap;
  let fill;
  if(s.dir>0){ fill=s.price*(1-slip); s.cash+=sh*fill*(1-FEE); }
  else { fill=s.price*(1+slip); s.cash+=sh*Math.max(0,2*s.avg-fill)*(1-FEE); }
  s.shares-=sh; s.slipCost+=amt*slip; if(s.shares<1e-9){s.shares=0;s.avg=0;} return {amt,slip,fill};}
function doSell(){ if(!T||!T.running)return; const s=T.stocks[T.active], sh=sellSh(s);
  if(sh<=0){beep(200,.08);toast(s.dir>0?'팔 주식이 없어요':'갚을 공매도가 없어요');return;}
  const {amt,slip,fill}=sellCore(s,sh);
  s.marks.push({i:s.hist.length-1,t:'s'}); beep(659,.06);beep(523,.08); buzz(30);
  toast(`${exitName(s)} ${won(amt)} · 체결 ${Math.round(fill).toLocaleString()} (밀림 ${(slip*100).toFixed(1)}%)`); updTrade(); }
const posVal=s=>s.dir>0? s.shares*s.price : Math.max(0,s.shares*(2*s.avg-s.price));
const val=s=>s.cash+posVal(s);
function updTrade(){
  if(!T)return;
  const left=Math.max(0,(TICKS-T.tick)*TICK_MS/1000);
  document.getElementById('tm').textContent=left.toFixed(1);
  document.getElementById('tb').style.width=(100*(TICKS-T.tick)/TICKS)+'%';
  T.stocks.forEach((s,i)=>{const ch=s.price/s.open-1; const tp=document.getElementById('tp'+i);
    tp.textContent=pct(ch); tp.className=cls(ch);
    document.getElementById('tc'+i).textContent=(s.shares>0?'● ':'')+(s.dir<0?'▼':'')+s.code;
    const tab=app.querySelector(`.tab[data-i="${i}"]`); tab.classList.toggle('on',i===T.active);
    tab.classList.toggle('alert',i!==T.active&&s.alertUntil>T.tick);});
  const s=T.stocks[T.active], ch=s.price/s.open-1;
  document.getElementById('qn').textContent=s.name;
  document.getElementById('qs').textContent=(s.dir<0?'📉 공매도 · ':'')+s.sec+' · '+VOL[s.v].size+' · '+VOL[s.v].label;
  document.getElementById('buy').textContent=enterName(s); document.getElementById('sell').textContent=exitName(s);
  document.getElementById('qp').innerHTML=`<span class="${cls(ch)}">${Math.round(s.price).toLocaleString()}<small>${pct(ch)}</small></span>`;
  const held=posVal(s)/Math.max(1,val(s));
  document.getElementById('ps').textContent=s.shares>0?`${s.dir>0?'주식':'공매도'} ${Math.round(held*100)}%`:'현금 100%';
  document.getElementById('ps').style.color=s.shares>0?'var(--gold)':'';
  document.getElementById('pa').textContent=s.shares>0?Math.round(s.avg).toLocaleString():'-';
  document.getElementById('pv').textContent=won(val(s));
  const pl=val(s)-s.budget; const plEl=document.getElementById('pl'); plEl.textContent=won(pl,true); plEl.className=cls(pl);
  const tot=T.stocks.reduce((a,x)=>a+val(x)-x.budget,0); const tEl=document.getElementById('tot'); tEl.textContent=won(tot,true); tEl.className=cls(tot);
  app.querySelectorAll('#ratio button').forEach(b=>b.classList.toggle('on',+b.dataset.r===T.ratio));
  const ba=buyAmt(s), sa=sellSh(s)*s.price;
  document.getElementById('slip').textContent=`${enterName(s)} ${won(ba)} (밀림 ${(ba/s.mcap*100).toFixed(1)}%) · ${exitName(s)} ${won(sa)} (밀림 ${(sa/s.mcap*100).toFixed(1)}%)`;
}
function drawChart(){
  const c=document.getElementById('ch'); if(!c||!T)return; const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false;
  const W=c.width,H=c.height, s=T.stocks[T.active], h=s.hist;
  ctx.fillStyle='#120f24'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#2a2550'; for(let y=15;y<H;y+=30)for(let x=0;x<W;x+=3)ctx.fillRect(x,y,1,1); for(let x=40;x<W;x+=40)for(let y=0;y<H;y+=3)ctx.fillRect(x,y,1,1);
  let lo=Math.min(...h,s.open*.97), hi=Math.max(...h,s.open*1.03);
  if(s.shares>0){lo=Math.min(lo,s.avg);hi=Math.max(hi,s.avg);}
  const pad=(hi-lo)*.1; lo-=pad; hi+=pad;
  const X=i=>Math.round(i/TICKS*(W-6))+2, Y=p=>Math.round((1-(p-lo)/(hi-lo))*(H-8))+4;
  ctx.fillStyle='#6d6790'; const oy=Y(s.open); for(let x=0;x<W;x+=4)ctx.fillRect(x,oy,2,1);
  for(let i=1;i<h.length;i++){
    const x0=X(i-1),y0=Y(h[i-1]),x1=X(i),y1=Y(h[i]);
    ctx.fillStyle=h[i]>=s.open?'#ff5a5f':'#4ea8ff';
    const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
    for(let k=0;k<=steps;k++){ctx.fillRect(Math.round(x0+(x1-x0)*k/steps),Math.round(y0+(y1-y0)*k/steps),2,2);}
  }
  s.marks.forEach(m=>{const x=X(m.i),y=Y(h[m.i]); ctx.fillStyle=m.t==='b'?'#ffd166':'#ffffff';
    if(m.t==='b'){ctx.fillRect(x-1,y+5,4,2);ctx.fillRect(x,y+3,2,2);} else {ctx.fillRect(x-1,y-6,4,2);ctx.fillRect(x,y-4,2,2);} });
  // 평균단가 선 (노란 점선)
  if(s.shares>0){const by=Y(s.avg); ctx.fillStyle='#ffd166'; for(let x=0;x<W;x+=6)ctx.fillRect(x,by,3,1); ctx.fillRect(W-14,by-4,12,1);}
  const lx=X(h.length-1), ly=Y(h[h.length-1]); if(Math.floor(performance.now()/250)%2){ctx.fillStyle='#fff';ctx.fillRect(lx-1,ly-1,4,4);}
}
function endTrade(){
  clearInterval(T.timer); T.running=false;
  // 장 마감: 남은 주식은 한꺼번에 팔림 (전량이라 밀림도 큼!)
  T.stocks.forEach(s=>{ if(s.shares>0) sellCore(s,s.shares); S.prices[s.k]=s.price; });
  document.getElementById('buy').disabled=true; document.getElementById('sell').disabled=true;
  const cd=document.getElementById('cd'); cd.textContent='장 마감'; cd.style.fontSize='34px'; cd.style.fontFamily='Do Hyeon';
  beep(523,.12);setTimeout(()=>beep(392,.2),150);
  const result=T.stocks.map(s=>({name:(s.dir<0?'📉 ':'')+s.name,chg:s.price/s.open-1,pl:s.cash-s.budget,end:s.cash,slip:s.slipCost}));
  setTimeout(()=>{T=null;finishDay(result);},1400);
}

// 투자자 등급 표시: "🐜 개미 · 슈퍼개미까지 ●●○○"
function invBadge(){
  const t=INV_TIERS[S.inv.tier], nx=INV_TIERS[S.inv.tier+1];
  return `${t.icon} <b style="color:var(--ink)">${t.title}</b>`+(t.need&&nx?` · ${nx.icon} ${nx.title}까지 <b class="stars">${dots(S.inv.good,t.need)}</b> (투자금의 +${INV_GOOD*100}% 이상 번 장 ${S.inv.good}/${t.need})`
    :(S.inv.tier>=1?' · 공매도 사용 가능':''));
}
