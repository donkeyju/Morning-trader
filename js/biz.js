/* =========================================================
   사장(가게) · 펀드매니저 — 정산 식과 화면 (v0.7)
   정산 함수(storeSettle, fundSettle)는 게임(day.js finishDay)과 밸런스 봇이 같이 씀 → 식을 바꾸면 둘 다 바뀜
   ========================================================= */

/* ---------- 가게 ---------- */
// 오늘 손님 수요: 아침 뉴스의 편의점 영향(cvs)을 평균 → 매출 ±20%
function storeDemand(td=S.today){
  const sum={}; CVS_CATS.forEach(c=>sum[c.k]=0);
  (td.items||[]).forEach(n=>{ for(const k in (n.cvs||{})) sum[k]+=n.cvs[k]; });
  const avg=CVS_CATS.reduce((a,c)=>a+sum[c.k],0)/CVS_CATS.length;
  return clamp(1+.2*avg,.8,1.2);
}
// 가게 하루 손익표. q = 출근해서 발주한 적중률(0~1), 출근 안 했으면 null
function storeSettle(st,q,dem){
  const att=q!=null;
  const sales=STORE.sales*dem*(att?1+STORE.attendSales*q:1);
  const cogs=sales*STORE.cogs, gross=sales-cogs;
  const staff=att?0:STORE.staff;                          // 출근 안 하면 점장을 고용
  const waste=att?STORE.waste*2*(1-q):STORE.waste;        // 내 발주가 정확할수록 폐기·품절이 줄어듦
  const interest=st.loan*loanRate(st.ltv);
  return {att,sales,cogs,gross,rent:STORE.rent,staff,waste,interest,net:gross-STORE.rent-staff-waste-interest};
}
const storeEquity=()=>S.store?S.store.value-S.store.loan:0;
// 예상 순이익 (화면 표시용: 수요 보통, 출근하면 적중 90% 가정)
const storeGuess=(st,att)=>storeSettle(st,att?.9:null,1).net;

/* ---------- 펀드 ---------- */
// ret = 오늘 주식 수익률 (주식장 안 갔으면 null)
function fundSettle(f,ret){
  const mgmt=f.size*FUND.mgmt; let perf=0, g=0;
  if(ret!=null){ g=f.size*ret; perf=Math.max(0,g)*FUND.perf; f.size+=g; if(ret>=INV_GOOD) f.size*=1+FUND.inflow; }
  f.size=clamp(f.size,FUND.min,FUND.max);
  return {mgmt,perf,g,ret};
}

/* ---------- 인수 계약서 (서명) ---------- */
function screenContract(){
  const st={value:STORE.price, ltv:S.contractLtv??.5}; st.loan=STORE.price*st.ltv;
  const down=STORE.price*(1-st.ltv), fee=STORE.price*STORE.fee, need=down+fee, ok=S.cash>=need;
  app.innerHTML=`${hud()}
    <h2 class="sh">${ic('key',24)} 가게 인수 계약</h2>
    <div class="paper contract">
      <div class="mast"><span class="name">가게 양도 계약서</span><span class="date">DAY ${S.day}</span></div>
      <div class="ct">
        <div><span>가게</span><b>${STORE.name}</b></div>
        <div><span>양도 가격</span><b>${won(STORE.price)}</b></div>
      </div>
      <div class="lbl">대출 비율 <small>(변동금리 · 기준금리가 바뀌면 이자도 바뀜)</small></div>
      <div class="quick">${[0,.3,.5,.7].map(v=>`<button data-cltv="${v}" class="${st.ltv===v?'on':''}">${Math.round(v*100)}%</button>`).join('')}</div>
      <div class="ct">
        <div><span>계약금 (현금)</span><b>${won(down)}</b></div>
        <div><span>수수료 1%</span><b>${won(fee)}</b></div>
        <div><span>대출</span><b>${won(st.loan)}${st.loan?` · 이자 하루 ${won(st.loan*loanRate(st.ltv))}`:''}</b></div>
        <div class="hr"></div>
        <div><span>예상 하루 순이익 · 출근 안 한 날</span><b>${won(storeGuess(st,false),true)}</b></div>
        <div><span>예상 하루 순이익 · 출근해서 발주 잘한 날</span><b>${won(storeGuess(st,true),true)}</b></div>
      </div>
      <div class="small" style="text-align:left;color:#6b5b3e">특약: 출근하지 않는 날은 고용한 점장이 운영합니다 (인건비 하루 ${won(STORE.staff)}).</div>
      <div class="sigwrap"><div class="siglab">인수인 서명</div><canvas id="sig" width="300" height="100"></canvas><button class="linkbtn" id="clr">지우기</button></div>
    </div>
    <div class="small">${ok?'서명란에 손가락으로 사인해 주세요':`<b class="down">현금이 ${won(need-S.cash)} 부족해요</b> · 대출 비율을 높이거나 돈을 모아 오세요`}</div>
    <div class="btns"><button class="btn sec" id="later" style="font-size:18px">다음에 할게요</button><button class="btn" id="sign" style="font-size:18px" disabled>서명하고 계약</button></div>`;
  app.querySelectorAll('[data-cltv]').forEach(b=>b.onclick=()=>{S.contractLtv=+b.dataset.cltv; beep(520,.04); keepScroll(screenContract);});
  document.getElementById('later').onclick=()=>{beep(660);screenHub();};
  // 서명 패드: 손가락(마우스)으로 그린 길이가 충분하면 [서명하고 계약]이 켜짐
  const cv=document.getElementById('sig'), ctx=cv.getContext('2d'), btn=document.getElementById('sign');
  let len=0, last=null;
  const pos=e=>{const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];};
  const dot=(x,y)=>{ctx.fillStyle='#1d2a6b'; ctx.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,3,3);};   // 2px 격자에 찍어서 도트 느낌
  cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId); last=pos(e); dot(...last);};
  cv.onpointermove=e=>{ if(!last) return; const p=pos(e), d=Math.hypot(p[0]-last[0],p[1]-last[1]);
    for(let k=0;k<=d;k+=1.5) dot(last[0]+(p[0]-last[0])*k/d, last[1]+(p[1]-last[1])*k/d);
    len+=d; last=p; btn.disabled=!(ok&&len>120); };
  cv.onpointerup=cv.onpointercancel=()=>{last=null;};
  document.getElementById('clr').onclick=()=>{ctx.clearRect(0,0,cv.width,cv.height); len=0; btn.disabled=true;};
  btn.onclick=()=>{
    if(S.cash<need) return;
    S.cash-=need; S.store={name:STORE.name, value:STORE.price, loan:st.loan, ltv:st.ltv, paid:need, bought:S.day};
    S.storeOffer=false;   // 수수료는 오늘 결산에서 '집 매매·세금'(나머지)으로 잡힘
    const stamp=document.createElement('div'); stamp.className='limfx show up stampfx'; stamp.innerHTML='<small>모퉁이 편의점</small>계약 완료';
    document.querySelector('.contract').appendChild(stamp); btn.disabled=true;
    beep(220,.08,'square',.1); setTimeout(()=>beep(880,.1),120); buzz([120]);
    setTimeout(()=>showPromos([{art:'P_owner', head:'사장 취임!', title:`${STORE.name} 사장님`, sub:'출근 안 해도 매일 가게가 벌어요. 출근하면 내가 점장 역할을 해서 더 많이!'}],screenHub),900);
  };
}
