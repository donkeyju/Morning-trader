/* =========================================================
   ONE MORE ZERO — 편의점 (커리어 사다리)
   18-0 출근 화면 / 18-1 계산 알바 / 18-2 물류 담당자 / 18-3 점장 발주 / 18-4 퇴근 / 편의점 그림
   단계·승진 조건·일당 범위는 js/data.js 의 CAREER, 승진 처리는 js/day.js finishDay
   (파일 구조와 규칙은 저장소의 CLAUDE.md 참고)
   ========================================================= */
let J=null;
const careerNow=()=>CAREER[S.career.stage];
// 승진 진행 표시: 채운 칸은 초록 체크, 남은 칸은 빈 칸 (도트 아이콘 chk / emp)
const dots=(n,need)=>ic('chk').repeat(Math.min(n,need))+ic('emp').repeat(Math.max(0,need-n));
// 단계 이름: "Lv.2 물류 담당자"
const lvName=(list,i)=>`Lv.${i+1} ${list[i].title}`;
// 일당 계산: 단계별로 성적(0~1)을 일당 범위에 맞춤
const payOf=(stage,score)=>{const [lo,hi]=CAREER[stage].pay; return Math.round((lo+(hi-lo)*clamp(score,0,1))/10000)*10000;};

/* ---------- 18-0. 출근 화면 ---------- */
function screenJob(){
  if(S.store) return screenOwner();
  const st=S.career.stage, c=careerNow();
  const rules=[
    [`손님이 낸 돈에서 <b>합계를 뺀 거스름돈</b>을 지폐·동전으로 맞춰서 건네요 (30초)`,
     `맞힌 손님 1명당 <b>+14만</b>, 틀리면 <b>−7만</b> · 일당 30만~100만`,
     `좋은 근무: <b>맞힘 4명 이상 & 틀림 1명 이하</b>`],
    [`들어온 상품을 <b>알맞은 칸</b>에 진열해요. <b>유통기한이 지난 건 폐기</b>! (30초)`,
     `맞게 처리한 상품 1개당 <b>+7만</b>, 틀리면 <b>−10만</b> · 일당 60만~150만`,
     `좋은 근무: <b>8개 이상 처리, 정확도 80% 이상, 유통기한 실수 1개 이하</b>`],
    [`오늘 뉴스와 <b>동네 소식</b>을 보고 상품군별 <b>발주량</b>(적게·보통·많이)을 정해요 (시간 제한 없음)`,
     `수요를 맞힐수록 매출 보너스 · 월급 포함 일당 70만~160만`,
     `좋은 근무: <b>발주 적중 70% 이상</b>`],
  ][st];
  const max=st>=CAREER.length-1&&S.career.good>=c.need;
  app.innerHTML=`${hud()}
    <h2 class="sh">${ic(c.icon,24)} 편의점 ${lvName(CAREER,st)}</h2>
    <canvas id="shop" class="pix" width="160" height="72"></canvas>
    <div class="box rules"><ul style="margin:0;padding-left:18px">${rules.map(x=>`<li>${x}</li>`).join('')}</ul></div>
    <div class="box" style="font-size:14px">${max?ic('key')+' 사장님이 <b>가게를 넘겨줄까?</b> 하셨어요. 인수는 다음 업데이트에서 열려요!'
      :`승진까지 <b class="stars">${dots(S.career.good,c.need)}</b> (좋은 근무 ${S.career.good}/${c.need})${st<CAREER.length-1?` → ${ic(CAREER[st+1].icon)} ${lvName(CAREER,st+1)}`:' → '+ic('key')+' 가게 인수 제안'}`}</div>
    <button class="btn sec" id="back">← 다른 걸 할래요</button>
    <button class="btn" id="go">출근하기!</button>`;
  startShop(document.getElementById('shop'));
  document.getElementById('back').onclick=()=>{beep(660);screenHub();};
  document.getElementById('go').onclick=()=>{S.action='job';markInProgress('job');beep(990);[runJob,runShelf,runOrder][st]();};
}
// 30초 타이머 (계산·물류 공통)
function startJobTimer(onEnd){
  const t0=performance.now();
  J.timer=setInterval(()=>{ if(!J)return; J.left=Math.max(0,30-(performance.now()-t0)/1000*(window.JOB_SPEED||1));
    document.getElementById('tm').textContent=J.left.toFixed(1); document.getElementById('tb').style.width=(J.left/30*100)+'%';
    if(J.left<=0){clearInterval(J.timer); onEnd();} },100);
}
function jobToast(msg,good){const r=document.getElementById('receipt'); if(!r)return; const d=document.createElement('div');
  d.className='jt '+(good?'g':'b'); d.innerHTML=msg; r.appendChild(d); setTimeout(()=>d.remove(),1200);}

/* ---------- 18-1. 계산 알바: 거스름돈 맞히기 ---------- */
const ITEMS=[['삼각김밥',1200,'#f3e8cf'],['컵라면',1500,'#d7263d'],['바나나우유',1700,'#ffd166'],['콜라',2000,'#b5302a'],['과자',1800,'#ff9f43'],
             ['도시락',4800,'#5ad19a'],['커피',2500,'#7a4f2e'],['아이스크림',1000,'#9fdcff'],['껌',800,'#ff6fb5'],['샌드위치',3200,'#e0b25a']];
const MONEY=[10000,5000,1000,500,100];
const jobPay=(ok,bad)=>clamp(300000+ok*140000-bad*70000,300000,1000000);
function newCustomer(){
  const n=clamp(1+Math.floor(J.ok/2)+(Math.random()<.35?1:0),1,4);
  const items=[...Array(n)].map(()=>ITEMS[Math.floor(Math.random()*ITEMS.length)]);
  const total=items.reduce((a,x)=>a+x[1],0);
  const paid= total<=5000&&Math.random()<.45 ? 5000 : (total<=10000?10000:(Math.random()<.5?20000:50000));
  J.cust={items,total,paid,look:Math.floor(Math.random()*4)}; J.given=[];
}
function runJob(){
  J={ok:0,bad:0,left:30,given:[],cust:null}; newCustomer();
  app.innerHTML=`
    <div class="topbar"><span class="tm" id="tm">30.0</span><div class="tbar"><i id="tb"></i></div></div>
    <canvas id="shop" class="pix" width="160" height="72"></canvas>
    <div class="paper" id="receipt" style="padding:8px 12px"></div>
    <div class="box" style="padding:8px 12px">
      <div class="hud"><span>건넬 거스름돈</span><b id="giv" class="px" style="font-size:24px">0</b></div>
      <div class="money">${MONEY.map(m=>`<button data-m="${m}" class="${m>=1000?'bill':'coin'}">${m.toLocaleString()}</button>`).join('')}</div>
    </div>
    <div class="btns"><button class="btn sec" id="undo">하나 빼기</button><button class="btn" id="give">건네기</button></div>
    <div class="hud"><span>맞힘 <b id="okn">0</b> · 틀림 <b id="badn">0</b></span><span>예상 일당 <b id="pay"></b></span></div>`;
  startShop(document.getElementById('shop'),true);
  app.querySelectorAll('.money button').forEach(b=>b.onclick=()=>{if(!J||J.left<=0)return; J.given.push(+b.dataset.m); beep(+b.dataset.m>=1000?700:1100,.03); updJob();});
  document.getElementById('undo').onclick=()=>{if(!J)return; J.given.pop(); beep(400,.03); updJob();};
  document.getElementById('give').onclick=()=>{ if(!J||J.left<=0)return;
    const want=J.cust.paid-J.cust.total, got=J.given.reduce((a,b)=>a+b,0);
    if(got===want){J.ok++; beep(988,.06);setTimeout(()=>beep(1318,.08),70); jobToast('감사합니다~ '+ic('smile'),true);}
    else {J.bad++; beep(200,.15,'sawtooth'); buzz(80); jobToast(`정답은 ${want.toLocaleString()}원이었어요`,false);}
    newCustomer(); updJob(); };
  updJob();
  startJobTimer(()=>{const ok=J.ok,bad=J.bad;
    endShift({pay:jobPay(ok,bad), good:ok>=4&&bad<=1, line:`손님 ${ok}명 맞힘 · ${bad}명 틀림`});});
}
function updJob(){
  const c=J.cust, got=J.given.reduce((a,b)=>a+b,0);
  document.getElementById('receipt').innerHTML=`${c.items.map(([n,p])=>`<div class="rl"><span>${n}</span><span>${p.toLocaleString()}</span></div>`).join('')}
    <div class="rl tot"><span>합계</span><span>${c.total.toLocaleString()}원</span></div>
    <div class="rl paid"><span>손님이 낸 돈</span><span>${c.paid.toLocaleString()}원</span></div>`;
  document.getElementById('giv').textContent=got.toLocaleString();
  document.getElementById('okn').textContent=J.ok; document.getElementById('badn').textContent=J.bad;
  document.getElementById('pay').textContent=won(jobPay(J.ok,J.bad));
}

/* ---------- 18-2. 물류 담당자: 진열 + 유통기한 ----------
   상품 카드를 보고 [음료 / 과자 / 즉석식품] 칸 또는 [폐기]를 누름. 기한 지난 상품은 폐기해야 정답 */
const SHELVES=[['drink','음료','drink'],['snack','과자','cookie'],['meal','즉석식품','onigiri'],['trash','폐기','trash']];   // [키, 이름, 도트 아이콘]
const GOODS=[['바나나우유','drink','#ffd166'],['이온음료','drink','#6fc3ff'],['캔커피','drink','#7a4f2e'],['콜라','drink','#b5302a'],
             ['감자칩','snack','#ff9f43'],['초코바','snack','#5a3a22'],['젤리','snack','#ff6fb5'],['쿠키','snack','#e0b25a'],
             ['삼각김밥','meal','#f3e8cf'],['도시락','meal','#5ad19a'],['컵라면','meal','#d7263d'],['샌드위치','meal','#e9d27a']];
const shelfPay=(ok,bad)=>clamp(600000+ok*70000-bad*100000,600000,1500000);
function newGood(){
  const g=GOODS[Math.floor(Math.random()*GOODS.length)], expired=Math.random()<.28;
  const d=expired?(Math.random()<.5?'기한 지남':'어제까지'):(Math.random()<.3?'오늘까지':`D-${1+Math.floor(Math.random()*6)}`);
  J.good={name:g[0],cat:g[1],color:g[2],expired,d};
}
function runShelf(){
  J={ok:0,bad:0,exp:0,left:30}; newGood();
  app.innerHTML=`
    <div class="topbar"><span class="tm" id="tm">30.0</span><div class="tbar"><i id="tb"></i></div></div>
    <canvas id="shop" class="pix" width="160" height="72"></canvas>
    <div class="paper" id="receipt" style="padding:14px;text-align:center"></div>
    <div class="shelves">${SHELVES.map(([k,t,i])=>`<button data-s="${k}" class="${k==='trash'?'trash':''}">${ic(i,32)}<br>${t}</button>`).join('')}</div>
    <div class="hud"><span>맞음 <b id="okn">0</b> · 틀림 <b id="badn">0</b> · 유통기한 실수 <b id="expn">0</b></span><span>일당 <b id="pay"></b></span></div>`;
  startShop(document.getElementById('shop'),false,true);
  app.querySelectorAll('.shelves button').forEach(b=>b.onclick=()=>{ if(!J||J.left<=0)return;
    const g=J.good, want=g.expired?'trash':g.cat, pick=b.dataset.s;
    if(pick===want){J.ok++; beep(988,.05); jobToast(pick==='trash'?'폐기 완료!':'진열 완료!',true);}
    else {J.bad++; if(g.expired||pick==='trash') J.exp++; beep(200,.15,'sawtooth'); buzz(60);
      jobToast(g.expired?'기한 지난 상품이에요!':(pick==='trash'?'멀쩡한 상품을 버렸어요!':'칸이 틀렸어요'),false);}
    newGood(); updShelf(); });
  updShelf();
  startJobTimer(()=>{const ok=J.ok,bad=J.bad,exp=J.exp,n=ok+bad,acc=n?ok/n:0;
    endShift({pay:shelfPay(ok,bad), good:n>=8&&acc>=.8&&exp<=1, line:`${n}개 처리 · 정확도 ${Math.round(acc*100)}% · 유통기한 실수 ${exp}개`});});
}
function updShelf(){
  const g=J.good;
  document.getElementById('receipt').innerHTML=`<div class="goodbox" style="--c:${g.color}"><span class="gi"></span><b>${g.name}</b>
      <span class="exp ${g.expired?'x':g.d==='오늘까지'?'w':''}">${g.d}</span></div>`;
  document.getElementById('okn').textContent=J.ok; document.getElementById('badn').textContent=J.bad; document.getElementById('expn').textContent=J.exp;
  document.getElementById('pay').textContent=won(shelfPay(J.ok,J.bad));
}

/* ---------- 18-3. 점장: 뉴스·동네 소식 보고 발주 ----------
   상품군별 실제 수요 = 오늘 뉴스 cvs + 동네 소식 cvs + 작은 랜덤 → 적게(0)/보통(1)/많이(2)
   정확히 맞히면 1점, 한 칸 차이 0.4점, 두 칸 차이 0점 → 적중률 = 평균 */
const LV=['적게','보통','많이'];
function orderDemand(){
  const r=dayRng(7), local=shuffle(LOCAL_NEWS,r).slice(0,2), d={};
  CVS_CATS.forEach(c=>{let v=(r()-.5)*.3;
    S.today.items.forEach(n=>{ if(n.cvs&&n.cvs[c.k]) v+=n.cvs[c.k]*(n.real?1:-.4); });
    local.forEach(n=>{ if(n.cvs[c.k]) v+=n.cvs[c.k]; });
    d[c.k]=v>.25?2:(v<-.25?0:1); });
  return {local,d};
}
function runOrder(){
  const {local,d}=orderDemand(); J={pick:Object.fromEntries(CVS_CATS.map(c=>[c.k,1])),d,local};
  const render=()=>{
    app.innerHTML=`${hud()}
      <h2 class="sh">${ic('tie',24)} 오늘의 발주</h2>
      <div class="paper"><div class="mast"><span class="name" style="font-size:18px">동네 소식</span><span class="date">점장 전용</span></div>
        ${local.map(n=>`<div class="news"><h3>${ic('pin')} ${n.h}</h3></div>`).join('')}</div>
      <div class="small" style="text-align:left">아침 뉴스도 같이 생각해 보세요. 날씨, 유행, 경기가 손님을 바꿔요.</div>
      ${CVS_CATS.map(c=>`<div class="box ord"><div class="ordt">${ic(c.icon,32)} ${c.name}</div>
        <div class="quick">${LV.map((t,i)=>`<button data-c="${c.k}" data-v="${i}" class="${J.pick[c.k]===i?'on':''}">${t}</button>`).join('')}</div></div>`).join('')}
      <div class="btns"><button class="btn sec" id="news">뉴스 보기</button><button class="btn" id="go">발주 확정</button></div>`;
    app.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{J.pick[b.dataset.c]=+b.dataset.v; beep(520,.04); render();});
    document.getElementById('news').onclick=showNewsSheet;
    document.getElementById('go').onclick=()=>{
      const pts=CVS_CATS.map(c=>[1,.4,0][Math.abs(J.pick[c.k]-J.d[c.k])]), hit=pts.reduce((a,b)=>a+b,0)/CVS_CATS.length;
      const rows=CVS_CATS.map((c,i)=>`<div class="rl"><span>${ic(c.icon)} ${c.name}</span><span>내 발주 <b>${LV[J.pick[c.k]]}</b> · 실제 <b>${LV[J.d[c.k]]}</b> ${ic(pts[i]===1?'chk':pts[i]>0?'half':'xmark')}</span></div>`).join('');
      const extra=`<div class="paper" style="padding:8px 12px">${rows}</div>`;
      if(S.store){ S.storeQ=hit; endShift({pay:0, good:false, owner:true, line:`발주 적중 ${Math.round(hit*100)}%`, extra}); }   // 사장: 일당 없음, 적중률이 저녁 가게 손익표에 들어감
      else endShift({pay:payOf(2,hit), good:hit>=.7, line:`발주 적중 ${Math.round(hit*100)}%`, extra});
    };
  };
  render();
}

/* ---------- 18-5. 사장 출근: 내가 점장 역할 (발주 게임) ---------- */
function screenOwner(){
  const dem=storeDemand(), a=storeSettle(S.store,null,dem).net, b=storeSettle(S.store,.9,dem).net;
  app.innerHTML=`${hud()}
    <h2 class="sh">${ic('job',24)} ${S.store.name} · Lv.4 사장</h2>
    <canvas id="shop" class="pix" width="160" height="72"></canvas>
    <div class="box rules"><ul style="margin:0;padding-left:18px">
      <li>출근하면 <b>내가 점장 역할</b>을 해요 → 인건비 ${won(STORE.staff)}이 안 나가요</li>
      <li>뉴스와 동네 소식을 보고 <b>발주</b>를 맞힐수록 매출이 늘고(최대 +10%) 폐기가 줄어요</li>
      <li>발주를 많이 틀리면 폐기·품절 손실이 커져서 출근 안 한 날보다 못할 수도 있어요</li></ul></div>
    <div class="box" style="font-size:14px">오늘 예상: 출근 안 하면 <b>${won(a)}</b> · 출근해서 잘하면 <b>${won(b)}</b></div>
    <button class="btn sec" id="back">← 다른 걸 할래요</button>
    <button class="btn" id="go">출근하기!</button>`;
  startShop(document.getElementById('shop'));
  document.getElementById('back').onclick=()=>{beep(660);screenHub();};
  document.getElementById('go').onclick=()=>{S.action='job';markInProgress('job');beep(990);runOrder();};
}

/* ---------- 18-4. 퇴근 (공통) ---------- */
function endShift({pay,good,line,extra='',owner=false}){
  if(J&&J.timer) clearInterval(J.timer);
  J=null; S.jobPay=pay; S.jobGood=good;
  beep(523,.12);setTimeout(()=>beep(659,.12),130);setTimeout(()=>beep(784,.2),260);
  const c=careerNow(), max=S.career.stage>=CAREER.length-1&&S.career.good>=c.need;
  if(owner){ const g=storeSettle(S.store,S.storeQ,storeDemand());
    app.innerHTML=`${hud()}<h2 class="sh">${ic('job',24)} 가게 문 닫을 시간!</h2><canvas id="shop" class="pix" width="160" height="72"></canvas>
      <div class="box res-big"><div class="small">${line}</div><div class="pl ${cls(g.net)}">${won(g.net,true)}</div>
        <div class="msg">오늘 가게 예상 순이익 (저녁 결산 때 들어와요)</div>
        <div class="small">직원을 안 써서 인건비 ${won(STORE.staff)} 절약 · 폐기·품절 ${won(-g.waste,true)}</div></div>
      ${extra}<button class="btn" id="end">하루 마치기 →</button>`;
    startShop(document.getElementById('shop'));
    document.getElementById('end').onclick=()=>{beep(880);finishDay(null);};
    return; }
  app.innerHTML=`${hud()}
    <h2 class="sh">${ic(c.icon,24)} 퇴근!</h2>
    <canvas id="shop" class="pix" width="160" height="72"></canvas>
    <div class="box res-big"><div class="small">${line}</div><div class="pl up">${won(pay,true)}</div>
      <div class="msg">${good?ic('chk')+' 좋은 근무! 승진에 한 걸음':'오늘은 승진 점수를 못 받았어요'}</div>
      ${max?'':`<div class="small">승진까지 ${dots(S.career.good+(good?1:0),c.need)}</div>`}</div>
    ${extra}
    <button class="btn" id="end">하루 마치기 →</button>`;
  startShop(document.getElementById('shop'));
  document.getElementById('end').onclick=()=>{beep(880);finishDay(null);};
}

/* ---------- 편의점 도트 그림 ---------- */
function startShop(canvas,live,stock){
  const HAIR=['#2b1d14','#c46a2b','#7a7a88','#e0b25a'], SHIRT=['#5a8f4a','#b5484b','#2f6fd0','#7a4f9a'];
  animate(canvas,(ctx,t)=>{const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#e9e2cf'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#cfc6ad'; for(let y=6;y<40;y+=11){ctx.fillRect(4,y,60,2);ctx.fillRect(96,y,60,2);}
    const goods=['#d7263d','#ffd166','#5ad19a','#2f6fd0','#ff9f43','#ff6fb5'];
    for(let y=0;y<3;y++)for(let x=0;x<12;x++){ if(stock&&(x+y*3)%4===0) continue; ctx.fillStyle=goods[(x+y*5)%6];ctx.fillRect(6+x*5,y*11+1,3,5);ctx.fillRect(98+x*5,y*11+1,3,5);}
    ctx.fillStyle='#9fdcff'; ctx.fillRect(68,4,24,30); ctx.fillStyle='#ffffff'; ctx.fillRect(68,4,24,2); ctx.fillRect(79,4,2,30);
    const c=live&&J&&J.cust; if(c){ const pal={...PAL,H:HAIR[c.look],B:SHIRT[c.look],T:SHIRT[c.look],W:SHIRT[c.look]};
      const bob=Math.round(Math.sin(t*3));
      SPR.normal.forEach((row,r)=>{for(let k=0;k<row.length;k++){const ch=row[k]; if(ch==='.')continue; ctx.fillStyle=pal[ch]; ctx.fillRect(68+k*2,14+r*2+bob,2,2);}}); }
    ctx.fillStyle='#7a4f2e'; ctx.fillRect(0,46,W,H-46); ctx.fillStyle='#a06d43'; ctx.fillRect(0,44,W,3);
    if(c) c.items.forEach((it,i)=>{ctx.fillStyle=it[2]; ctx.fillRect(40+i*12,36,9,8); ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fillRect(40+i*12,36,9,2);});
    if(stock){ // 물류: 박스 더미 + 주인공
      for(let i=0;i<4;i++){ctx.fillStyle='#c9a46a';ctx.fillRect(20+i*13,34-(i%2)*8,12,10);ctx.fillStyle='#a8844a';ctx.fillRect(20+i*13,38-(i%2)*8,12,1);}
      drawSprite(ctx,SPR.normal,78,14+Math.round(Math.abs(Math.sin(t*4))*2),2,false);
    }
    ctx.fillStyle='#2b2546'; ctx.fillRect(118,30,30,16); ctx.fillStyle='#5ad19a'; ctx.fillRect(121,33,24,7);
    ctx.fillStyle='#0e2a1f'; if(Math.floor(t*2)%2) ctx.fillRect(123,35,8,3);
    if(!live&&!stock){ drawSprite(ctx,SPR.happy,14,16,1,false); }
  });
}
