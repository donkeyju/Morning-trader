/* =========================================================
   ONE MORE ZERO — 공통 도구
   5 랜덤 / 6 숫자 표시 / 7 효과음 / 8 게임 상태·계산 / 9 도트 장면(주인공·사무실)
   (파일 구조와 규칙은 저장소의 CLAUDE.md 참고)
   ========================================================= */
/* ---------- 5. 랜덤 (씨앗이 같으면 결과도 같음) ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function dayRng(salt){return mulberry32(S.seed*9973 + S.day*7919 + salt)}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function shuffle(arr,r){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- 6. 숫자 보기 좋게 ---------- */
function won(n, sign){
  const neg=n<0; n=Math.abs(Math.round(n)); let s;
  if(n>=1e8){const e=Math.floor(n/1e8), m=Math.round((n%1e8)/1e4); s=e+'억'+(m?' '+m.toLocaleString()+'만':'');}
  else if(n>=1e4){s=Math.round(n/1e4).toLocaleString()+'만';}
  else s=n.toLocaleString();
  return (neg?'-':(sign&&n>0?'+':''))+s+'원';
}
const pct=(x,d=1)=>(x>=0?'+':'')+(x*100).toFixed(d)+'%';
const cls=(x)=>x>0.00001?'up':(x<-0.00001?'down':'');

/* ---------- 7. 효과음 ---------- */
let AC=null;
function beep(f=660,d=.07,type='square',vol=.05){
  try{ AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),g=AC.createGain(); o.type=type;o.frequency.value=f;
    g.gain.value=vol; o.connect(g);g.connect(AC.destination); o.start();
    g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d); o.stop(AC.currentTime+d+.02);
  }catch(e){}
}
function buzz(ms){try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}}

/* ---------- 8. 게임 상태 ---------- */
let S=null, T=null;
const lv=()=>({seoul:1,metro:1,local:1});
function newRun(){
  S = { seed:Math.floor(Math.random()*1e6), day:1, cash:START_MONEY, base:0.004, savePct:30,
        prices:Object.fromEntries(STOCKS.map(s=>[s.k,s.base])), picks:[], today:null,
        reUnlocked:false, props:[], listings:[], visits:2, ltvSel:{}, hints:true, history:[], unlockDay:0, investPct:50, watch:[], lotto:[], lottoCost:0, jobPay:0, action:null,
        career:{stage:0, good:0}, inv:{tier:0, good:0}, dir:{}, jobGood:false, newsSeen:{},   // newsSeen: 뉴스 제목별 본 횟수 / 편의점 단계·주식 등급 (CAREER, INV_TIERS)
        rentLv:lv(), rentTypeLv:{villa:1,apt:1,shop:1} };
}
// 금리: 하나의 기준금리에 적금·대출이 같이 묶여 있다
const saveRate=()=>S.base;
// 확률표에서 하나 고르기: [[값, 확률%], ...]
function wpick(list,r){ let x=r()*100; for(const [v,w] of list){ if(x<w) return v; x-=w; } return list[list.length-1][0]; }
// 이번 판 금리 방향 (씨앗으로 정해서 같은 판이면 항상 같음). 봇이 newRun 뒤에 씨앗을 바꾸니까 첫날 아침에 정함
function rateCycleInit(){ if(!S.rateCycle) S.rateCycle=wpick(RATE_CYCLES.map(([k,w])=>[k,w]),mulberry32(S.seed*7+13)); }
const loanRate=(ltv=.3)=>S.base+(LTV_SPREAD[ltv]??LOAN_SPREAD);   // 대출 비율별 금리
const propRate=p=>loanRate(p.ltv??.7);                          // 내 집의 대출 금리
// 부동산 계산
const mktRent=p=>p.value*REG[p.r].yieldT[p.t]*(1+.2*p.loc)*featRent(p.feat)*S.rentLv[p.r]*S.rentTypeLv[p.t];
function findP(p,mult){ // 오늘 저녁 세입자를 구할 확률
  const v=TYPES[p.t].vac+featVac(p.feat)-(p.t==='shop'?p.cat.commerce*.06:0)+(mult-1)*1.5;
  return 1-clamp(v,0,.95); }
function sellP(p,mult){ // 오늘 저녁 팔릴 확률
  const f=mult<1?2.0:(mult>1?.55:1);
  return clamp(REG[p.r].liq[p.t]*(1+.5*p.cat.station)*featLiq(p.feat)*f,.02,.95); }
const reEquity=()=>S.props.reduce((a,p)=>a+p.value-p.loan,0);
const netWorth=()=>S.cash+reEquity()+(S.store?S.store.value-S.store.loan:0);   // 현금 + 집 지분 + 가게 지분 (펀드는 남의 돈이라 빠짐)

// ── 기록·랭킹 (지금은 이 기기에만 저장. 나중에 로그인 + Firebase 온라인 랭킹으로 바꿀 자리)
// 순위: 1억 달성한 판이 위 (빨리 달성할수록 위, 같은 날이면 순자산 많은 순) → 못 한 판은 최종 순자산 순
const recSort=(a,b)=>(b.win-a.win)||(a.win?a.days-b.days:0)||(b.money-a.money);
function loadRecords(){
  try{ let r=JSON.parse(localStorage.getItem('omz_records')||'null');
    if(!r){ const old=JSON.parse(localStorage.getItem('mt_best')||'null');   // 예전 버전 최고 기록 옮겨 오기
      r=old?[{win:true,days:old.days,money:old.money,at:Date.now()}]:[]; }
    return r.sort(recSort);
  }catch(e){ return []; }
}
// ── 무엇으로 벌었나 (v0.8.1, 사용자 요청: 랭킹에서 경쟁자가 뭘로 벌었는지 보이게)
// mixOf: 한 판 동안 항목별로 번 돈 합계 {stock:…, rent:…} (0인 항목은 뺌, 원 단위 정수)
function mixOf(H){ const m={}; (H||[]).forEach(h=>MIX_KEYS.forEach(k=>{ if(h[k]) m[k]=(m[k]||0)+h[k]; }));
  for(const k in m){ m[k]=Math.round(m[k]); if(!m[k]) delete m[k]; } return m; }
const MIX_KEYS=['stock','fund','rent','loan','re','deal','job','store','save','lotto'];
// 막대에 쓰는 3칸: 주식(+펀드) / 부동산(월세−이자+집값+매매) / 편의점(일당+가게). 적금·복권은 기타라 막대엔 안 넣음
const MIX_GROUPS=[['s','주식','#ff5a5f',['stock','fund']],['r','부동산','#4ea8ff',['rent','loan','re','deal']],['c','편의점','#ff9f43',['job','store']]];
function mixShares(m){ if(!m) return null;
  const g=MIX_GROUPS.map(([id,n,col,ks])=>({id,n,col,v:ks.reduce((a,k)=>a+(Number(m[k])||0),0)}));
  const pos=g.reduce((a,x)=>a+Math.max(0,x.v),0); if(pos<=0) return {g,pos:0};
  g.forEach(x=>x.p=Math.max(0,x.v)/pos*100);
  // 반올림해도 합이 100이 되게 (가장 큰 칸에서 맞춤)
  const r=g.map(x=>Math.round(x.p)), d=100-r.reduce((a,b)=>a+b,0); if(d){ const i=r.indexOf(Math.max(...r)); r[i]+=d; }
  g.forEach((x,i)=>x.r=r[i]); return {g,pos}; }
// 랭킹 한 줄 아래에 붙는 막대 + "주식 62 · 부동산 31"
function mixBarHTML(m){ const s=mixShares(m); if(!s) return '';
  if(!s.pos) return '<div class="mix"><small>번 돈 없음</small></div>';
  const on=s.g.filter(x=>x.r>0).sort((a,b)=>b.r-a.r);
  return `<div class="mix"><span class="mbar">${on.map(x=>`<i style="width:${x.p}%;background:${x.col}"></i>`).join('')}</span>
    <small>${on.map(x=>`<em style="color:${x.col}">${x.n}</em> ${x.r}`).join(' · ')}</small></div>`; }
// 줄을 누르면 펼쳐지는 자세한 내역 (CAT_STYLE 이름·색 재사용, 손해는 빨간 숫자)
function mixDetailHTML(m){ if(!m) return '';
  const rows=CAT_STYLE.filter(([k])=>Number(m[k])).sort((a,b)=>Math.abs(m[b[0]])-Math.abs(m[a[0]]))
    .map(([k,n,c])=>`<span><i class="sw" style="background:${c}"></i>${n} <b class="${cls(Number(m[k]))}">${won(Number(m[k]),true)}</b></span>`).join('');
  return `<div class="mixd">${rows||'내역 없음'}</div>`; }
function saveRecord(win,days,money){
  if(S&&S.dev) return;   // 개발자 모드로 건드린 판은 랭킹에 안 넣음
  try{ const r=loadRecords(); r.push({win,days,money,at:Date.now(),mix:mixOf(S&&S.history)}); r.sort(recSort);
    localStorage.setItem('omz_records',JSON.stringify(r.slice(0,20))); }catch(e){}
}
const loadBest=()=>loadRecords()[0]||null;
const recText=r=>r.win?`DAY ${r.days} 달성 · ${won(r.money)}`:`${r.days}일 · ${won(r.money)}`;

const app=document.getElementById('app');
function hud(){return `<div class="hud"><span class="px">DAY <b>${S.day}</b>/${DAYS}</span><span>순자산 <b>${won(netWorth())}</b></span></div>`}
function pickW(r,arr){let t=arr.reduce((a,x)=>a+x[1],0)*r(); for(const [k,w] of arr){if(t<w)return k; t-=w;} return arr[0][0];}
// 그림이 계속 움직이게: 캔버스가 화면에서 사라지면 자동으로 멈춤
function animate(canvas,draw){const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false; const t0=performance.now();
  (function f(now){ if(!canvas.isConnected) return; draw(ctx,(now-t0)/1000); requestAnimationFrame(f); })(t0);}

/* =========================================================
   9. 도트 장면 (사무실 + 주인공)
   ========================================================= */
const SPR = {
 normal:['....HHHH....','...HHHHHH...','...HSSSSH...','...SESSES...','...SSSSSS...','....SMMS....','.....SS.....',
  '..BBBWTBBB..','.BBBBWTBBBB.','.BBBBWTBBBB.','.SBBBBBBBBS.','.SBBBBBBBBS.','...BBBBBB...','...BB..BB...','...BB..BB...','...KK..KK...'],
 happy:['....HHHH....','...HHHHHH...','.S.HSSSSH.S.','.S.SESSES.S.','.B.SSSSSS.B.','.B..MMMM..B.','.BB..SS..BB.',
  '..BBBWTBBB..','...BBWTBB...','...BBWTBB...','...BBBBBB...','...BBBBBB...','...BBBBBB...','...BB..BB...','...BB..BB...','...KK..KK...'],
 sad:['............','....HHHH....','...HHHHHH...','...HHSSHH...','...SSSSSS...','..DSESSESD..','....SMMS....','.....SS.....',
  '..BBBWTBBB..','.BBBBWTBBBB.','.SBBBBBBBBS.','.SBBBBBBBBS.','...BBBBBB...','...BB..BB...','...BB..BB...','...KK..KK...'],
};
const PAL={H:'#2b1d14',S:'#f2c29b',E:'#1a1a1a',M:'#b5484b',W:'#f4f4f4',T:'#d7263d',B:'#2f3e74',K:'#141414',D:'#6fc3ff'};
function drawSprite(ctx,rows,x,y,s,blink){
  rows.forEach((row,r)=>{for(let c=0;c<row.length;c++){let ch=row[c]; if(ch==='.')continue; if(blink&&ch==='E')ch='S';
    ctx.fillStyle=PAL[ch]; ctx.fillRect(x+c*s,y+r*s,s,s);}});
}
let sceneToken=0;
function startScene(canvas, time, mood){
  const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false;
  const W=canvas.width,H=canvas.height, my=++sceneToken, t0=performance.now();
  const br=mulberry32(42); const blds=[]; let bx=9; while(bx<71){const w=5+Math.floor(br()*6),h=8+Math.floor(br()*20); blds.push({x:bx,w,h,lit:[...Array(12)].map(()=>br()<.45)}); bx+=w+1;}
  const skies={morning:['#8fd0ff','#a9dcff','#c7e9ff','#ffe9b0'], evening:['#3b2a63','#7a3b78','#c4527a','#ff8c5a','#ffc36b'], night:['#0f0d2e','#17154a','#221e5e','#2e2873'], storm:['#2b2d3a','#3a3d4d','#4a4e60','#5a5f72']};
  function frame(now){
    if(my!==sceneToken||!canvas.isConnected) return;
    const t=(now-t0)/1000;
    ctx.fillStyle=time==='morning'?'#5a4a6e':'#3a3150'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,.15)'; for(let x=0;x<W;x+=8) ctx.fillRect(x,0,1,58);
    const sk=skies[time]; const wy=6,wh=42; sk.forEach((c,i)=>{ctx.fillStyle=c; ctx.fillRect(8,wy+Math.floor(i*wh/sk.length),64,Math.ceil(wh/sk.length)+1);});
    if(time==='night'){ctx.fillStyle='#fff'; for(let i=0;i<14;i++){ if(((i*7+Math.floor(t*2))%9)<7) ctx.fillRect(10+(i*29)%60, 8+(i*13)%22,1,1);} }
    if(time==='morning'){ctx.fillStyle='#fff3a0'; ctx.fillRect(54,10,10,10); ctx.fillStyle='#ffe066'; ctx.fillRect(55,11,8,8);}
    if(time==='evening'){ctx.fillStyle='#ffb347'; ctx.fillRect(18,34,14,7); ctx.fillStyle='#ffd27a'; ctx.fillRect(20,32,10,2);}
    blds.forEach(b=>{ctx.fillStyle=time==='morning'?'#6f88a8':'#221c3a'; ctx.fillRect(b.x,wy+wh-b.h,b.w,b.h);
      if(time!=='morning'){ctx.fillStyle='#ffd166'; let k=0; for(let yy=wy+wh-b.h+2;yy<wy+wh-2;yy+=3)for(let xx=b.x+1;xx<b.x+b.w-1;xx+=2){if(b.lit[k++%12])ctx.fillRect(xx,yy,1,1);} }});
    if(time==='storm'){ctx.fillStyle='#9fb3d1'; for(let i=0;i<20;i++){const x=9+(i*17)%62,y=wy+((t*60+i*11)%wh); ctx.fillRect(x,y,1,3);} if((t%4)<.12){ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(8,wy,64,wh);} }
    ctx.fillStyle='#20192e'; ctx.fillRect(6,4,68,2);ctx.fillRect(6,48,68,3);ctx.fillRect(6,4,2,46);ctx.fillRect(72,4,2,46);ctx.fillRect(39,4,2,46);
    ctx.fillStyle='#20192e'; ctx.fillRect(126,10,28,22); ctx.fillStyle='#f3e8cf'; ctx.fillRect(128,12,24,18);
    ctx.fillStyle='#d7263d'; [[130,26],[133,25],[136,23],[139,24],[142,20],[145,18],[148,15]].forEach(([x,y])=>ctx.fillRect(x,y,3,2));
    ctx.fillStyle='#7a4f2e'; ctx.fillRect(140,48,10,10); ctx.fillStyle='#3f9a5c'; ctx.fillRect(138,38,4,10);ctx.fillRect(144,34,3,14);ctx.fillRect(148,40,4,8);
    let rows=SPR[mood]||SPR.normal, oy=0;
    if(mood==='happy') oy=-Math.round(Math.abs(Math.sin(t*6))*4); else if(mood==='normal') oy=Math.round(Math.sin(t*2)*1);
    drawSprite(ctx,rows,64,24+oy,2,(t%3.2)<.15);
    ctx.fillStyle='#a06d43'; ctx.fillRect(0,56,W,3); ctx.fillStyle='#7a4f2e'; ctx.fillRect(0,59,W,H-59);
    ctx.fillStyle='#5e3b22'; for(let x=4;x<W;x+=26) ctx.fillRect(x,63,18,1);
    ctx.fillStyle='#1b1b25'; ctx.fillRect(98,34,34,22); ctx.fillRect(112,56,6,2);
    ctx.fillStyle='#0e2a1f'; ctx.fillRect(100,36,30,17);
    for(let i=0;i<28;i++){const y=44+Math.round(Math.sin((i+t*8)/3)*3+Math.sin((i+t*5)/7)*2); ctx.fillStyle=i%2?'#ff5a5f':'#5ad19a'; ctx.fillRect(101+i,y,1,1);}
    ctx.fillStyle='#f4f4f4'; ctx.fillRect(86,50,6,6); ctx.fillRect(92,52,2,2);
    if(time==='morning'||time==='storm'){ctx.fillStyle='#f3e8cf'; ctx.fillRect(28,52,26,6); ctx.fillStyle='#2a2230'; ctx.fillRect(30,53,10,1);ctx.fillRect(30,55,20,1);}
    if(mood==='happy'){for(let i=0;i<12;i++){const x=(i*41+20)%W, y=((t*40+i*23)%80)-10; ctx.fillStyle='#ffd166'; ctx.fillRect(x,y,3,3); ctx.fillStyle='#fff3a0'; ctx.fillRect(x,y,1,1);}}
    if(mood==='sad'){ctx.fillStyle='#5b5770'; ctx.fillRect(60,2,32,6);ctx.fillRect(64,0,22,3); ctx.fillStyle='#6fc3ff';
      for(let i=0;i<8;i++){const x=62+i*4, y=9+((t*30+i*7)%16); ctx.fillRect(x,y,1,3);} }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
