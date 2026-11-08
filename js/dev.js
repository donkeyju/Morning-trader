/* =========================================================
   개발자 모드 (v0.7.1) — 테스트용으로 상태를 바로 바꾸기
   켜는 법: 첫 화면 로고를 5번 연속 탭 (또는 주소 뒤에 ?dev=1). 끄는 법: 패널의 [개발자 모드 끄기]
   켜지면 화면 오른쪽 아래에 DEV 버튼이 생기고, 누르면 패널이 열림
   개발자 모드로 건드린 판은 S.dev=true → 랭킹 기록에 안 들어감
   ========================================================= */
const devOn=()=>{ try{ return localStorage.getItem('omz_dev')==='1'||/[?&]dev=1/.test(location.search); }catch(e){ return false; } };
function devSet(v){ try{ v?localStorage.setItem('omz_dev','1'):localStorage.removeItem('omz_dev'); }catch(e){} devButton(); }

// 첫 화면 로고 5번 탭 → 켜기/끄기
let devTaps=[];
document.addEventListener('click',e=>{
  if(!e.target.closest||!e.target.closest('#logo')) return;
  const now=Date.now(); devTaps=devTaps.filter(t=>now-t<2000); devTaps.push(now);
  if(devTaps.length>=5){ devTaps=[]; const on=!devOn(); devSet(on); beep(on?1318:330,.15); alertBox(on?'개발자 모드 켜짐 (오른쪽 아래 DEV)':'개발자 모드 꺼짐'); }
});
function alertBox(msg){ const d=document.createElement('div'); d.className='devtoast'; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),1600); }

// 오른쪽 아래 DEV 버튼
function devButton(){
  let b=document.getElementById('devbtn');
  if(!devOn()){ if(b) b.remove(); return; }
  if(!b){ b=document.createElement('button'); b.id='devbtn'; b.textContent='DEV'; b.onclick=devPanel; document.body.appendChild(b); }
}

// 패널: 버튼 하나 = 상태 하나 바꾸기. 바꾼 뒤엔 "오늘 뭐 할까"로 (날짜를 바꾸면 그날 아침 뉴스부터)
const DEV_ACTIONS=[
  ['돈',[
    ['현금 +1,000만',()=>{S.cash+=1e7;}],
    ['현금 +5,000만',()=>{S.cash+=5e7;}],
    ['1억 직전 (순자산 9,900만)',()=>{S.cash+=9.9e7-netWorth();}],
  ]],
  ['날짜',[
    ['DAY +1 (쉬고 다음 날)',()=>{S.day=Math.min(DAYS,S.day+1); return 'day';}],
    ['DAY +5',()=>{S.day=Math.min(DAYS,S.day+5); return 'day';}],
    ['다음 금리 결정일로',()=>{const n=RATE_DAYS.find(d=>d>S.day); if(n) S.day=n; return 'day';}],
    ['결정일 사흘 전으로 (힌트 기사)',()=>{const n=RATE_DAYS.find(d=>d-3>S.day); if(n) S.day=n-3; return 'day';}],
    ['DAY 30 (마지막 날)',()=>{S.day=DAYS; return 'day';}],
  ]],
  ['편의점',[
    ['Lv.1 계산 알바',()=>{S.career={stage:0,good:0};}],
    ['Lv.2 물류 담당자',()=>{S.career={stage:1,good:0};}],
    ['Lv.3 점장',()=>{S.career={stage:2,good:0};}],
    ['점장 · 승진 직전 (3/4)',()=>{S.career={stage:2,good:3};}],
    ['인수 제안 받기',()=>{S.career={stage:2,good:4}; S.storeOffer=true;}],
    ['바로 사장 (대출 50%)',()=>{S.career={stage:2,good:4}; S.storeOffer=false; S.store={name:STORE.name,value:STORE.price,loan:STORE.price*.5,ltv:.5,paid:0,bought:S.day};}],
  ]],
  ['주식 등급',[
    ['Lv.1 개미',()=>{S.inv={tier:0,good:0}; S.fund=null;}],
    ['Lv.2 슈퍼개미',()=>{S.inv={tier:1,good:0}; S.fund=null;}],
    ['펀드 직전 (5/6)',()=>{S.inv={tier:1,good:5}; S.fund=null;}],
    ['Lv.3 펀드매니저',()=>{S.inv={tier:2,good:0}; S.fund={size:FUND.start};}],
  ]],
  ['부동산·금리',[
    ['임장 열기',()=>{S.reUnlocked=true; return 'day';}],
    ['금리 인상기로',()=>{S.rateCycle='up';}],
    ['금리 동결기로',()=>{S.rateCycle='flat';}],
    ['금리 인하기로',()=>{S.rateCycle='down';}],
    ['기준금리 +0.25%p',()=>{S.base=Math.min(RATE_MAX,S.base+.0025);}],
    ['기준금리 −0.25%p',()=>{S.base=Math.max(.001,S.base-.0025);}],
  ]],
];
function devPanel(){
  if(!S){ newRun(); S.dev=true; startDay(); }
  const old=document.getElementById('devpanel'); if(old){ old.remove(); return; }
  const cyc={up:'인상기',flat:'동결기',down:'인하기'}[S.rateCycle]||'-';
  const d=document.createElement('div'); d.id='devpanel'; d.className='sheet';
  d.innerHTML=`<div class="paper devp" onclick="event.stopPropagation()">
    <div class="mast"><span class="name">개발자 모드</span><span class="date">바깥을 탭하면 닫기</span></div>
    <div class="devstat">DAY ${S.day} · 현금 ${won(S.cash)} · 순자산 ${won(netWorth())}<br>
      금리 ${(S.base*100).toFixed(2)}% (${cyc}) · 편의점 ${S.store?'사장':lvName(CAREER,S.career.stage)} ${S.career.good}번 · 주식 ${lvName(INV_TIERS,S.inv.tier)} ${S.inv.good}번${S.fund?` · 펀드 ${won(S.fund.size)}`:''}</div>
    ${DEV_ACTIONS.map(([g,list],gi)=>`<div class="devg">${g}</div><div class="devrow">${list.map(([t],i)=>`<button data-g="${gi}" data-i="${i}">${t}</button>`).join('')}</div>`).join('')}
    <div class="devrow" style="margin-top:10px"><button id="devclear">저장 지우고 첫 화면</button><button id="devoff">개발자 모드 끄기</button></div>
  </div>`;
  d.onclick=()=>d.remove(); document.body.appendChild(d);
  d.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{
    const r=DEV_ACTIONS[+b.dataset.g][1][+b.dataset.i][1](); S.dev=true; beep(880,.05); d.remove();
    document.querySelectorAll('.modal,.promo-ov').forEach(x=>x.remove());
    if(T&&T.timer) clearInterval(T.timer); T=null;
    if(r==='day') startDay(); else { saveGame(); screenHub(); }
  });
  d.querySelector('#devclear').onclick=()=>{ clearSave(); d.remove(); document.querySelectorAll('.modal,.promo-ov').forEach(x=>x.remove()); screenTitle(); };
  d.querySelector('#devoff').onclick=()=>{ devSet(false); d.remove(); };
}
document.addEventListener('DOMContentLoaded',devButton); setTimeout(devButton,0);
