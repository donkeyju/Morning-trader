/* =========================================================
   모닝 트레이더 — 하루 흐름
   10 타이틀 / 11 아침 뉴스 / 13 오늘 뭐 할까(하루 1행동) / 16 저녁 결산·마감 팝업 / 17 종료 리포트 / 게임 시작
   (파일 구조와 규칙은 저장소의 CLAUDE.md 참고)
   ========================================================= */
/* =========================================================
   10. 타이틀
   ========================================================= */
function screenTitle(){
  const best=loadBest();
  app.innerHTML=`
    <div class="title-logo"><div class="big dh">1억</div><div class="ko dh">30일 안에 1,000만 원을 1억으로</div></div>
    <canvas id="sc" class="pix" width="160" height="80"></canvas>
    <div class="box rules"><ul style="margin:0;padding-left:18px">
      <li>매일 아침 <b>뉴스 5개</b>를 읽고, 오늘 <b>한 가지</b>만 골라요</li>
      <li>📈 <b>주식장</b>: 2종목을 골라 1분 동안 사고팔기</li>
      <li>🏠 <b>임장</b>: 동네와 집 안을 보고 집 사기 (순자산 3,000만 또는 DAY 7부터)</li>
      <li>🏪 <b>편의점</b>: 계산 알바에서 시작해 물류 담당자, 점장으로 승진</li>
      <li>안 쓴 현금은 자동으로 <b>적금</b>, 🎟 복권은 하루 2장까지</li>
      <li><b>30일 안에 순자산 1억</b> 만들기</li>
    </ul></div>
    ${best?`<div class="small">내 최고 기록: DAY ${best.days} 만에 ${won(best.money)}</div>`:''}
    <button class="btn" id="go">게임 시작</button>`;
  startScene(document.getElementById('sc'),'night','normal');
  document.getElementById('go').onclick=()=>{beep(880);newRun();startDay();};
}

/* =========================================================
   11. 아침: 오늘의 분위기 → 뉴스 5개 뽑기
   ========================================================= */
// 뉴스 하나가 무엇을 어느 방향으로 움직이는지 한 줄로 펼치기
function keysOf(n){const o={}; for(const k in (n.e||{}))o['s'+k]=n.e[k]; for(const k in (n.re||{}))o['r'+k]=n.re[k]; for(const k in (n.rent||{}))o['n'+k]=n.rent[k];
  for(const k in (n.reType||{}))o['t'+k]=n.reType[k]; for(const k in (n.rentType||{}))o['u'+k]=n.rentType[k];
  if(n.mkt){o.mkt=n.mkt; STOCKS.forEach(x=>{if(o['s'+x.k]===undefined)o['s'+x.k]=n.mkt;});} if(n.reAll)o.reAll=n.reAll; if(n.rate)o.rate=n.rate; return o;}
// 같은 대상에 정반대 큰 뉴스가 겹치면 헷갈리니까 피하기
function conflicts(a,b){const A=keysOf(a),B=keysOf(b); return Object.keys(A).some(k=>B[k]!==undefined&&Math.sign(A[k])!==Math.sign(B[k])&&Math.abs(A[k])>.2&&Math.abs(B[k])>.2);}
function startDay(){
  const r=dayRng(1);
  S.action=null; S.lotto=[]; S.lottoCost=0; S.jobPay=0; S.jobGood=false;
  S.netStart=netWorth();
  // ① 오늘의 분위기 정하기 (첫날은 블랙먼데이 없음)
  let roll=r()*100, mood='mixed';
  for(const [m,w] of MOODS){ if(roll<w){mood=m;break;} roll-=w; }
  if(S.day===1&&mood==='crash') mood='stock';
  // ② 분위기에 맞게 뉴스 고르기
  const picked=[]; let rumors=0;
  const add=(pool,n)=>{ for(const x of shuffle(pool,r)){ if(n<=0||picked.length>=5)break;
      if(picked.includes(x)) continue; if(x.rumor&&rumors>=1) continue; if(picked.some(p=>conflicts(p,x))) continue;
      if(x.rumor) rumors++; picked.push(x); n--; } };
  const strong=STOCK_NEWS.filter(n=>Object.values(n.e||{}).some(v=>Math.abs(v)>=.4));
  const any=STOCK_NEWS.concat(REALTY_NEWS);
  if(mood==='crash'){ add(CRASH_NEWS,1); add(STOCK_NEWS,2); add(any,2); }
  else if(mood==='realty'){ add(REALTY_NEWS,3); add(any,2); }
  else if(mood==='stock'){ add(strong,3); add(any,2); }
  add(any,5); // 모자라면 채우기
  // ③ 영향 합치기
  const eff=Object.fromEntries(STOCKS.map(s=>[s.k,(r()-.5)*.08]));
  const z=()=>({seoul:0,metro:0,local:0}), zt=()=>({villa:0,apt:0,shop:0});
  const reEff=z(), rentEff=z(), reTypeEff=zt(), rentTypeEff=zt();
  let rateD=0;
  const items=shuffle(picked,r).map(n=>{
    const real=n.rumor? r()<.5 : true, m=real?1:-.4;   // 찌라시가 거짓이면 반대로 조금 움직임
    for(const k in (n.e||{})) eff[k]+=n.e[k]*m;
    if(n.mkt) for(const k in eff) eff[k]+=n.mkt*m;
    for(const k in (n.re||{})) reEff[k]+=n.re[k]*m;
    if(n.reAll) for(const k in reEff) reEff[k]+=n.reAll*m;
    for(const k in (n.rent||{})) rentEff[k]+=n.rent[k]*m;
    for(const k in (n.reType||{})) reTypeEff[k]+=n.reType[k]*m;
    for(const k in (n.rentType||{})) rentTypeEff[k]+=n.rentType[k]*m;
    if(n.rate) rateD+=n.rate;
    return {...n, real};
  });
  S.prevBase=S.base;
  S.base=clamp(S.base+rateD/100,0.001,0.01);   // 기준금리가 바뀌면 적금·대출 금리가 같이 바뀜
  S.today={items,eff,reEff,rentEff,reTypeEff,rentTypeEff,mood};
  // 부동산 중개소: 순자산 3,000만 원이 넘으면 열림. 매일 매물 4개, 임장 2번
  if(!S.reUnlocked&&(netWorth()>=UNLOCK_RE||S.day>=UNLOCK_DAY)){S.reUnlocked=true;S.unlockDay=S.day;S.reJust=netWorth()>=UNLOCK_RE?'money':'day';}
  if(S.reUnlocked){ // 후보 12개 중, 지금 현금으로 살 수 있는 매물이 최소 2개는 끼도록 4개 고르기
    const lr=dayRng(5), cand=[...Array(12)].map((_,i)=>genListing(lr,i)), can=c=>c.ask*(.3+RE_TAX)<=S.cash;
    const pick=cand.filter(can).slice(0,2);
    if(pick.length<2) pick.push(genListing(lr,99,{r:'local',t:'villa',sz:'s'})); // 돈이 적어도 하나는 살 수 있게
    for(const c of cand){ if(pick.length>=4)break; if(!pick.includes(c)) pick.push(c); }
    S.listings=shuffle(pick,lr).map((L,i)=>({...L,id:`D${S.day}-${i}`})); S.visits=2;}
  screenNews();
}

function chipsOf(n){
  const m=n.real?1:-.4, out=[];
  const c=(label,v)=>{ if(Math.abs(v)>=.12) out.push(`<span class="chip ${v>0?'u':'d'}">${label} ${v>0?'▲':'▼'}</span>`); };
  for(const k in (n.e||{})) c(SEC_NAME[k], n.e[k]*m);
  if(n.mkt) c('주식시장 전체', n.mkt*m);
  for(const k in (n.re||{})) c(REG[k].name+' 집값', n.re[k]*m);
  if(n.reAll) c('전국 집값', n.reAll*m);
  for(const k in (n.reType||{})) c(TYPES[k].name+' 값', n.reType[k]*m);
  for(const k in (n.rent||{})) c(REG[k].name+' 월세', n.rent[k]*m);
  for(const k in (n.rentType||{})) c(TYPES[k].name+' 월세', n.rentType[k]*m);
  if(n.rate) out.push(`<span class="chip">금리 ${n.rate>0?'▲':'▼'}</span>`);
  if(n.rumor) out.push(`<span class="chip" style="background:${n.real?'#d8f5e4':'#ffe0a0'}">${n.real?'찌라시 → 사실!':'찌라시 → 거짓!'}</span>`);
  return '<div>'+out.join('')+'</div>';
}
function newsHTML(items,reveal){
  return items.map(n=>`<div class="news"><span class="src ${n.rumor?'rumor':''}">${n.src}</span><h3>${n.h}</h3>${reveal?chipsOf(n):`<p>${n.b}</p>`}</div>`).join('');
}
function screenNews(){
  const crash=S.today.mood==='crash';
  app.innerHTML=`${hud()}
    <canvas id="sc" class="pix" width="160" height="80"></canvas>
    <div class="paper">
      <div class="mast"><span class="name">모닝 경제</span><span class="date px">DAY ${S.day}</span></div>
      ${newsHTML(S.today.items,false)}
    </div>
    <button class="btn" id="next">오늘 뭐 할지 정하기 →</button>`;
  startScene(document.getElementById('sc'),crash?'storm':'morning','normal');
  document.getElementById('next').onclick=()=>{beep(880); screenHub();};
}
function showNewsSheet(){
  const d=document.createElement('div'); d.className='sheet';
  d.innerHTML=`<div class="paper"><div class="mast"><span class="name">오늘의 뉴스</span><span class="date">탭해서 닫기</span></div>${newsHTML(S.today.items,false)}</div>`;
  d.onclick=()=>d.remove(); document.body.appendChild(d);
}


/* =========================================================
   13. 오늘 뭐 할까? (하루에 행동 1개)
   주식장 / 임장 / 알바 중 하나. 안 쓴 현금은 자동으로 적금.
   복권·내 자산 관리·뉴스 보기는 행동으로 치지 않음
   ========================================================= */
const LOTTO_PRICE=50000, LOTTO_MAX=2;
const LOTTO_TIERS=[[.0001,60000000,'1등'],[.001,5000000,'2등'],[.01,500000,'3등'],[.05,50000,'4등']]; // [확률, 당첨금, 이름]
function screenHub(){
  const watchN=S.watch.length, propN=S.props.length, inv=INV_TIERS[S.inv.tier], car=careerNow();
  // 행동 카드: 할 수 있는 것 먼저, 잠긴 것은 아래로
  // 모든 카드는 "제목 + 두 줄"로 같은 높이 (잠긴 임장은 둘째 줄이 진행 바)
  const reP=clamp(netWorth()/UNLOCK_RE,0,1)*100;
  const acts=[
    {k:'stock', open:true, icon:'📈', prog:inv.need?dots(S.inv.good,inv.need):'',
     title:'주식장 가기', l1:`${inv.icon} ${lvName(INV_TIERS,S.inv.tier)}${inv.need?'':' · 공매도 가능'}`,
     l2:inv.need?`다음: ${lvName(INV_TIERS,S.inv.tier+1)}`:'2종목을 골라 1분 동안 매매'},
    {k:'job', open:true, icon:car.icon, prog:dots(S.career.good,car.need),
     title:`편의점 ${lvName(CAREER,S.career.stage)}`, l1:`일당 ${won(car.pay[0])}~${won(car.pay[1])}`,
     l2:`다음: ${S.career.stage<CAREER.length-1?lvName(CAREER,S.career.stage+1):'가게 인수 제안'}`},
    {k:'realty', open:S.reUnlocked, icon:'🏠', prog:'', title:'임장 가기',
     l1:S.reUnlocked?'오늘 매물 4개 중 2곳 둘러보기':`🔒 3,000만 원 또는 DAY ${UNLOCK_DAY}`,
     l2:S.reUnlocked?'마음에 들면 바로 매입':`<div class="prog mini"><i style="width:${reP}%"></i><span>3,000만까지 ${reP.toFixed(0)}% · ${UNLOCK_DAY-S.day}일 남음</span></div>`},
  ].sort((a,b)=>b.open-a.open);
  app.innerHTML=`${hud()}
    ${S.reJust?`<div class="box" style="background:#4a3f7c;text-align:center;font-family:'Do Hyeon';font-size:18px">🎉 ${S.reJust==='day'?`DAY ${UNLOCK_DAY}!`:'순자산 3,000만 원 돌파!'} 이제 임장을 갈 수 있어요</div>`:''}
    <h2 class="sh">오늘 뭐 할까?</h2>
    <div class="small" style="text-align:left">하루에 하나만 할 수 있어요. 쓰지 않은 현금 <b style="color:var(--ink)">${won(S.cash)}</b>은 자동으로 적금에 들어가요 (하루 ${(saveRate()*100).toFixed(2)}%).</div>
    ${acts.map(a=>`<button class="actc" data-act="${a.k}" ${a.open?'':'disabled'}>
      <span class="al"><span class="ai">${a.icon}</span><span class="ad">${a.prog}</span></span>
      <span class="ar"><b>${a.title}</b><small>${a.l1}</small>${a.l2.startsWith('<')?a.l2:`<small>${a.l2}</small>`}</span></button>`).join('')}
    <h3 class="sub">언제든 할 수 있어요 <span style="font-size:13px;color:var(--dim)">(하루 행동을 쓰지 않아요)</span></h3>
    <div class="side">
      <button class="sidec" id="lotto"><b>복권</b><small>장당 5만 · 오늘 ${S.lotto.length}/${LOTTO_MAX}장</small></button>
      <button class="sidec" id="assets" ${propN||watchN?'':'disabled'}><b>내 자산</b><small>집 ${propN}채 · 관심 매물 ${watchN}</small></button>
      <button class="sidec" id="report" ${S.history.length?'':'disabled'}><b>리포트</b><small>지금까지 기록</small></button>
      <button class="sidec" id="news"><b>뉴스</b><small>다시 보기</small></button>
    </div>`;
  app.querySelectorAll('.actc').forEach(b=>b.onclick=()=>{beep(880); S.reJust=false; const a=b.dataset.act;
    if(a==='stock') screenPick(); else if(a==='realty') screenListings(); else screenJob();});
  document.getElementById('lotto').onclick=()=>{
    if(S.lotto.length>=LOTTO_MAX){beep(200,.08);return;} if(S.cash<LOTTO_PRICE){beep(200,.08);return;}
    S.cash-=LOTTO_PRICE; S.lottoCost+=LOTTO_PRICE; S.lotto.push({}); beep(1046,.05);beep(1318,.07); screenHub();};
  document.getElementById('assets').onclick=()=>{beep(660);screenAssets();};
  document.getElementById('report').onclick=()=>{beep(660);screenReport();};
  document.getElementById('news').onclick=showNewsSheet;
}

// 📊 리포트: 지금까지의 기록 (게임 중 언제든)
function screenReport(){
  const H=S.history, first=START_MONEY, now=netWorth(), gain=now-first;
  const actIcon={stock:'📈',realty:'🏠',job:'🏪'};
  app.innerHTML=`${hud()}
    <h2 class="sh">📊 지금까지의 기록</h2>
    <div class="summary">
      <div><div class="lab">지난 날</div><div class="val">${H.length}일</div></div>
      <div><div class="lab">번 돈</div><div class="val ${cls(gain)}">${won(gain,true)}</div></div>
      <div><div class="lab">1억까지</div><div class="val">${(clamp(now/GOAL,0,1)*100).toFixed(0)}%</div></div>
    </div>
    <div class="box" style="font-size:14px;line-height:1.8">${CAREER[S.career.stage].icon} 편의점 ${lvName(CAREER,S.career.stage)}<br>${INV_TIERS[S.inv.tier].icon} 주식 ${lvName(INV_TIERS,S.inv.tier)}<br>🏠 집 ${S.props.length}채</div>
    ${reportHTML()}
    <h3 class="sub">하루하루</h3>
    <div class="box timeline">${H.slice().reverse().map(h=>{const d=h.net-(H[H.indexOf(h)-1]?.net??first);
      return `<div class="tl"><span class="px">DAY ${h.day}</span><span>${actIcon[h.act]||'☕'}</span><b class="${cls(d)}">${won(d,true)}</b><span class="tln">${won(h.net)}</span></div>`;}).join('')}</div>
    <button class="btn sec" id="back">← 돌아가기</button>`;
  drawReport();
  document.getElementById('back').onclick=()=>{beep(660);screenHub();};
}


/* =========================================================
   16. 저녁 결산 + 하루 마감 팝업
   ========================================================= */
// 받침에 따라 '로/으로' 붙이기 (받침 없거나 ㄹ이면 '로')
const withRo=w=>{const c=w.charCodeAt(w.length-1)-0xAC00, jong=c>=0&&c<11172?c%28:0; return w+(jong===0||jong===8?'로':'으로');};
const ACT_NAME={stock:'📈 주식장',realty:'🏠 임장',get job(){return `${careerNow().icon} 편의점 ${careerNow().title}`;}};
function finishDay(result){
  const r=dayRng(3), td=S.today;
  const invest=S.action==='stock'?S.cash*S.investPct/100:0, save=S.cash-invest, interest=save*saveRate();
  const stockEnd=result?result.reduce((a,x)=>a+x.end,0):invest;
  // 안 고른 종목도 오늘 뉴스대로 움직임
  STOCKS.forEach(s=>{ if(!result||!S.picks.includes(s.k)){const v=VOL[s.v]; S.prices[s.k]*=Math.exp(clamp(td.eff[s.k],-1,1)*STOCK_TREND*v.t + v.n*STOCK_NOISE*gauss(r)*.6);} });

  // ── 복권 추첨 ──
  const lr=dayRng(6); let lottoWin=0;
  S.lotto.forEach(tk=>{ let x=lr(), acc=0; tk.prize=0; tk.name='꽝';
    for(const [p,amt,nm] of LOTTO_TIERS){ acc+=p; if(x<acc){tk.prize=amt; tk.name=nm; break;} } lottoWin+=tk.prize; });

  // ── 부동산 결산 ──
  let rentIn=0, loanOut=0, soldCash=0; const logs=[];
  for(const p of S.props.slice()){
    const nm=propName(p);
    loanOut+=p.loan*propRate(p);                         // 공실이어도 이자는 나감 (대출 비율별 금리)
    if(p.tenant){ rentIn+=p.tenant.rent; p.tenant.days--;
      if(p.tenant.days<=0){p.tenant=null; logs.push(`${nm}: 계약 만료 → 내일부터 공실`);} }
    else if(r()<findP(p,p.mult)){ p.tenant={rent:mktRent(p)*p.mult, days:CONTRACT_DAYS-1}; rentIn+=p.tenant.rent;
      logs.push(`${nm}: 세입자 입주! 월세 하루 ${won(p.tenant.rent)}`); }
    else logs.push(`${nm}: 세입자를 못 구했어요 (공실)`);
    if(p.sell){ if(r()<sellP(p,p.sell)){ soldCash+=p.value*p.sell*(1-RE_TAX)-p.loan; S.props.splice(S.props.indexOf(p),1);
        logs.push(`${nm}: 매도 완료! ${won(p.value*p.sell)}에 팔렸어요`); }
      else logs.push(`${nm}: 아직 안 팔렸어요`); }
  }
  const reBefore=reEquity();
  for(const p of S.props){
    p.prevValue=p.value;
    const g=Math.exp(clamp(td.reEff[p.r]+td.reTypeEff[p.t],-1,1)*.03 + REG[p.r].drift + .002*p.loc + featGrowth(p.feat) + REG[p.r].vol*gauss(r));
    p.value*=g; p.fairV=(p.fairV??p.value)*g;          // 적정가도 같이 움직이고
    p.value+=(p.fairV-p.value)*RE_CONVERGE;               // 시세는 적정가 쪽으로 조금씩 다가감 (싸게 샀으면 며칠에 걸쳐 오름)
  }
  for(const k in S.rentLv) S.rentLv[k]=clamp(S.rentLv[k]*(1+td.rentEff[k]*.15)+(1-S.rentLv[k])*.05,.6,1.6);
  for(const k in S.rentTypeLv) S.rentTypeLv[k]=clamp(S.rentTypeLv[k]*(1+td.rentTypeEff[k]*.15)+(1-S.rentTypeLv[k])*.05,.6,1.6);
  const reMove=reEquity()-reBefore;

  S.cash=save+interest+stockEnd+S.jobPay+lottoWin+rentIn-loanOut+soldCash;
  while(S.cash<0&&S.props.length){   // 현금이 마이너스면 대출 많은 집부터 경매 (시세 80%, 즉시)
    const p=S.props.slice().sort((a,b)=>b.loan-a.loan)[0];
    S.cash+=p.value*.8-p.loan; S.props.splice(S.props.indexOf(p),1); logs.push(`⚠ 이자를 못 내서 ${propName(p)} 경매 처분!`);
  }
  S.watch=S.watch.filter(w=>w.until>S.day);   // 관심 매물 기한

  const net=netWorth(), dayPL=net-S.netStart, ch=dayPL/S.netStart;
  const tradePL=result?result.reduce((a,x)=>a+x.pl,0):0, lottoNet=lottoWin-S.lottoCost;
  const H={day:S.day, net, act:S.action, stock:tradePL, job:S.jobPay, save:interest, rent:rentIn, loan:-loanOut, re:reMove, lotto:lottoNet};
  H.deal=dayPL-(tradePL+S.jobPay+interest+rentIn-loanOut+reMove+lottoNet);   // 나머지 = 집 사고판 차익·세금
  S.history.push(H);
  // ── 승진 / 등급 ──  (좋은 근무·좋은 장을 누적으로 세다가 need에 닿으면 다음 단계)
  const promo=[];
  if(S.action==='job'&&S.jobGood){ const c=S.career; c.good++;
    if(c.stage<CAREER.length-1&&c.good>=CAREER[c.stage].need){ c.stage++; c.good=0; promo.push(`🎉 ${CAREER[c.stage].icon} ${withRo(lvName(CAREER,c.stage))} 승진! 일당 ${won(CAREER[c.stage].pay[0])}~${won(CAREER[c.stage].pay[1])}`); }
    else if(c.stage===CAREER.length-1&&c.good===CAREER[c.stage].need) promo.push('🤝 사장님: "자네한테 이 가게를 넘겨줄까 하는데…" (인수는 다음 업데이트!)'); }
  const invested=result?result.reduce((a,x)=>a+(x.end-x.pl),0):0;   // 오늘 주식에 넣은 돈 (끝난 돈 − 손익)
  if(S.action==='stock'&&result&&invested>0&&tradePL/invested>=INV_GOOD){ const v=S.inv, t=INV_TIERS[v.tier];
    if(t.need){ v.good++; if(v.good>=t.need){ v.tier++; v.good=0; promo.push(`🎉 ${INV_TIERS[v.tier].icon} ${lvName(INV_TIERS,v.tier)} 등극! 이제 공매도로 떨어지는 종목에도 돈을 걸 수 있어요`); } } }
  if(promo.length){ setTimeout(()=>{beep(1046,.1);setTimeout(()=>beep(1318,.1),120);setTimeout(()=>beep(1568,.25),240);},400); }
  screenDayEnd({H,dayPL,ch,net,result,logs,promo});
}
function screenDayEnd({H,dayPL,ch,net,result,logs,promo=[]}){
  const mood=ch>=.05?'happy':(ch<=-.03?'sad':'normal');
  const msgs={happy:['오늘은 내가 워런 버핏!','치킨 시켜! 두 마리로!','뉴스 읽는 눈이 생겼다'],sad:['…오늘은 라면이다','손절은 빠를수록 좋았는데','내일은 다르다. 진짜로.'],normal:['무난한 하루','본전이면 선방이지','큰 욕심은 화를 부른다']};
  const msg=msgs[mood][Math.floor(Math.random()*3)];
  const done=net>=GOAL, broke=net<100000, last=S.day>=DAYS, progress=clamp(net/GOAL,0,1);
  const moodName=MOODS.find(m=>m[0]===S.today.mood)[2];
  const line=(label,v,sub)=>Math.abs(v)<1?'':`<div><span>${label}${sub?` <span class="sub">${sub}</span>`:''}</span><b class="${cls(v)}">${won(v,true)}</b></div>`;
  app.innerHTML=`${hud()}<canvas id="sc" class="pix" width="160" height="80"></canvas>`;
  startScene(document.getElementById('sc'),'evening',mood);
  const ov=document.createElement('div'); ov.className='modal'; ov.id='dayend';
  ov.innerHTML=`<div class="pop">
    <div class="pophead"><span class="px">DAY ${S.day} 마감</span><span>${S.action?ACT_NAME[S.action]:'☕ 쉬는 날'}</span></div>
    ${promo.map(m=>`<div class="promo">${m}</div>`).join('')}
    <div class="res-big"><div class="pl ${cls(dayPL)}">${won(dayPL,true)}</div>
      <div class="${cls(dayPL)} px" style="font-size:14px">${pct(ch)}</div><div class="msg">${msg}</div></div>
    <div class="lines">
      ${result?result.map(x=>line(x.name,x.pl,`주가 ${pct(x.chg)}`)).join(''):''}
      ${line('편의점 일당',H.job)}
      ${line('적금 이자',H.save,`하루 ${(saveRate()*100).toFixed(2)}%`)}
      ${line('월세',H.rent)}${line('대출 이자',H.loan)}${line('집값 변동',H.re)}${line('집 사고판 차익·세금',H.deal)}
      ${S.lotto.length?line('복권',H.lotto,`${S.lotto.length}장`):''}
    </div>
    ${S.lotto.length?`<div class="tickets">${S.lotto.map((tk,i)=>`<div class="tk" data-i="${i}"><span>?</span></div>`).join('')}</div>`:''}
    ${logs.length?`<div class="sub logs">${logs.join('<br>')}</div>`:''}
    <div class="prog"><i style="width:${progress*100}%"></i><span>1억까지 ${(progress*100).toFixed(1)}% · 순자산 ${won(net)}</span></div>
    <button class="linkbtn" id="why">오늘 뉴스 해설 보기 (${moodName})</button>
    <div class="paper reveal" id="whybox" style="display:none">${newsHTML(S.today.items,true)}</div>
    <button class="btn" id="next">${done?'🏆 결과 보기':broke?'파산…':last?'30일 종료':'다음 날 →'}</button>
  </div>`;
  document.body.appendChild(ov);
  if(mood==='happy'){beep(784,.1);setTimeout(()=>beep(988,.1),120);setTimeout(()=>beep(1318,.2),240);} else if(mood==='sad'){beep(330,.2,'triangle');setTimeout(()=>beep(247,.3,'triangle'),220);}
  // 복권 긁기 연출: 한 장씩 뒤집힘
  S.lotto.forEach((tk,i)=>setTimeout(()=>{const el=ov.querySelector(`.tk[data-i="${i}"]`); if(!el)return;
    el.classList.add('open',tk.prize?'win':'lose'); el.innerHTML=`<b>${tk.name}</b><small>${tk.prize?won(tk.prize):''}</small>`;
    tk.prize?(beep(1318,.08),setTimeout(()=>beep(1760,.12),90)):beep(300,.06);},700+i*700));
  ov.querySelector('#why').onclick=()=>{const b=ov.querySelector('#whybox'); b.style.display=b.style.display==='none'?'block':'none';};
  ov.querySelector('#next').onclick=()=>{beep(880); ov.remove();
    if(done){saveBest(S.day,net);screenEnd('win');} else if(broke) screenEnd('broke'); else if(last) screenEnd('fail'); else {S.day++;startDay();} };
}

function screenEnd(kind){
  const net=netWorth();
  const t={win:['1억 달성!',`DAY ${S.day} 만에 순자산 ${won(net)}을 만들었어요`],broke:['파산…','자산을 거의 다 잃었어요. 처음부터 다시!'],fail:['시간 종료','30일 동안 '+won(net)+'까지 불렸어요']}[kind];
  const best=loadBest();
  app.innerHTML=`<div class="title-logo"><div class="en px">${kind==='win'?'CLEAR!':'GAME OVER'}</div><div class="ko dh">${t[0]}</div></div>
    <canvas id="sc" class="pix" width="160" height="80"></canvas>
    <div class="box" style="text-align:center;line-height:1.7">${t[1]}<br><span class="small">시작 1,000만 원 → 최종 ${won(net)} (${pct(net/START_MONEY-1)})</span></div>
    ${best?`<div class="small">내 최고 기록: DAY ${best.days} 만에 ${won(best.money)}</div>`:''}
    ${reportHTML()}
    <button class="btn" id="again">다시 도전</button><button class="btn sec" id="home">처음 화면</button>`;
  drawReport();
  startScene(document.getElementById('sc'),kind==='win'?'evening':'night',kind==='win'?'happy':'sad');
  document.getElementById('again').onclick=()=>{beep(880);newRun();startDay();};
  document.getElementById('home').onclick=()=>{beep(660);screenTitle();};
}


/* =========================================================
   17. 종료 화면 리포트: 어디서 벌고 잃었나
   ========================================================= */
const CAT_STYLE=[['stock','주식','#ff5a5f'],['job','편의점','#ff9f43'],['rent','월세','#ffd166'],['re','집값 변동','#4ea8ff'],['save','적금 이자','#5ad19a'],
                 ['loan','대출 이자','#a07cf0'],['deal','집 매매·세금','#c9c2a8'],['lotto','복권','#ff6fb5']];
function reportHTML(){
  const tot=Object.fromEntries(CAT_STYLE.map(([k])=>[k,S.history.reduce((a,h)=>a+h[k],0)]));
  const mx=Math.max(1,...Object.values(tot).map(Math.abs));
  const used=CAT_STYLE.filter(([k])=>Math.abs(tot[k])>=1);   // 한 번도 안 생긴 항목은 숨김
  const rows=used.slice().sort((a,b)=>Math.abs(tot[b[0]])-Math.abs(tot[a[0]])).map(([k,n,c])=>
    `<div class="rrow"><span class="sw" style="background:${c}"></span><span class="rn">${n}</span>
      <span class="rbar"><i style="width:${Math.abs(tot[k])/mx*100}%;background:${c};opacity:${tot[k]<0?.45:1}"></i></span>
      <b class="${cls(tot[k])}">${won(tot[k],true)}</b></div>`).join('');
  return `<h3 class="sub">어디서 벌고 잃었나</h3><div class="box">${rows}</div>
    <h3 class="sub">순자산 흐름</h3><canvas id="nc" class="pix" width="240" height="110"></canvas>
    <div class="legend"><span><i class="sw" style="background:#fff"></i>순자산</span><span><i class="sw" style="background:#ffd166"></i>목표 1억</span>${S.unlockDay?'<span><i class="sw" style="background:#a07cf0"></i>부동산 오픈</span>':''}</div>
    <h3 class="sub">하루하루 손익 (항목별)</h3><canvas id="dc" class="pix" width="240" height="110"></canvas>
    <div class="legend">${used.map(([k,n,c])=>`<span><i class="sw" style="background:${c}"></i>${n}</span>`).join('')}</div>`;
}
function drawReport(){
  const H=S.history; if(!H.length) return;
  // ① 순자산 꺾은선
  let c=document.getElementById('nc'), ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false;
  let W=c.width,Hh=c.height; ctx.fillStyle='#120f24'; ctx.fillRect(0,0,W,Hh);
  const pts=[START_MONEY,...H.map(h=>h.net)], n=pts.length-1, top=Math.max(GOAL*1.1,...pts)*1.02;
  const X=i=>Math.round(4+i/Math.max(1,n)*(W-8)), Y=v=>Math.round(Hh-4-(v/top)*(Hh-8));
  ctx.fillStyle='#2a2550'; for(let v=0;v<top;v+=2e7){const y=Y(v);for(let x=0;x<W;x+=3)ctx.fillRect(x,y,1,1);}
  ctx.fillStyle='#ffd166'; const gy=Y(GOAL); for(let x=0;x<W;x+=5)ctx.fillRect(x,gy,3,1);
  if(S.unlockDay){ctx.fillStyle='#a07cf0';const ux=X(S.unlockDay-1);for(let y=0;y<Hh;y+=3)ctx.fillRect(ux,y,1,2);}
  for(let i=1;i<pts.length;i++){const x0=X(i-1),y0=Y(pts[i-1]),x1=X(i),y1=Y(pts[i]),st=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
    for(let k=0;k<=st;k++){ctx.fillStyle='#ffffff';ctx.fillRect(Math.round(x0+(x1-x0)*k/st),Math.round(y0+(y1-y0)*k/st),2,2);}}
  pts.forEach((v,i)=>{ctx.fillStyle=i&&v>=GOAL?'#ffd166':'#5ad19a';ctx.fillRect(X(i)-1,Y(v)-1,4,4);});
  // ② 하루 손익 막대 (위 = 번 돈, 아래 = 잃은 돈, 색 = 항목)
  c=document.getElementById('dc'); ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false; W=c.width; Hh=c.height;
  ctx.fillStyle='#120f24'; ctx.fillRect(0,0,W,Hh);
  const pos=H.map(h=>CAT_STYLE.reduce((a,[k])=>a+Math.max(0,h[k]),0)), neg=H.map(h=>CAT_STYLE.reduce((a,[k])=>a+Math.min(0,h[k]),0));
  const mp=Math.max(1,...pos), mn=Math.max(1,...neg.map(Math.abs)), z=Math.round(4+(Hh-8)*mp/(mp+mn)), sc=(Hh-8)/(mp+mn);
  const bw=Math.max(2,Math.floor((W-8)/H.length)-1);
  ctx.fillStyle='#6d6790'; ctx.fillRect(0,z,W,1);
  H.forEach((h,i)=>{const x=4+i*(bw+1); let up=z, dn=z+1;
    CAT_STYLE.forEach(([k,,col])=>{const v=h[k]; if(!v)return; const hh=Math.max(1,Math.round(Math.abs(v)*sc)); ctx.fillStyle=col;
      if(v>0){up-=hh;ctx.fillRect(x,up,bw,hh);} else {ctx.fillRect(x,dn,bw,hh);dn+=hh;}});});
}


// ── 게임 시작 ──
screenTitle();
