/* =========================================================
   모닝 트레이더 — 편의점 알바
   18 30초 거스름돈 미니게임
   (파일 구조와 규칙은 저장소의 CLAUDE.md 참고)
   ========================================================= */
/* =========================================================
   18. 편의점 계산 알바 (30초)
   합계와 받은 돈을 보고 거스름돈을 지폐·동전으로 맞춰서 건네기
   일당 = 30만 + 14만 × 맞힌 손님 − 7만 × 틀린 손님 (30만~100만)
   ========================================================= */
const ITEMS=[['삼각김밥',1200,'#f3e8cf'],['컵라면',1500,'#d7263d'],['바나나우유',1700,'#ffd166'],['콜라',2000,'#b5302a'],['과자',1800,'#ff9f43'],
             ['도시락',4800,'#5ad19a'],['커피',2500,'#7a4f2e'],['아이스크림',1000,'#9fdcff'],['껌',800,'#ff6fb5'],['샌드위치',3200,'#e0b25a']];
const MONEY=[10000,5000,1000,500,100];
const jobPay=(ok,bad)=>clamp(300000+ok*140000-bad*70000,300000,1000000);
let J=null;
function screenJob(){
  app.innerHTML=`${hud()}
    <h2 class="sh">🧾 편의점 알바</h2>
    <canvas id="shop" class="pix" width="160" height="72"></canvas>
    <div class="box rules"><ul style="margin:0;padding-left:18px">
      <li>손님이 낸 돈에서 <b>합계를 뺀 거스름돈</b>을 지폐·동전으로 맞춰서 건네요</li>
      <li>30초 동안 맞힌 손님 1명당 <b>+14만</b>, 틀리면 <b>−7만</b></li>
      <li>일당은 최소 30만 원, 최대 100만 원 (5명 맞히면 만점!)</li>
    </ul></div>
    <button class="btn sec" id="back">← 다른 걸 할래요</button>
    <button class="btn" id="go">출근하기!</button>`;
  startShop(document.getElementById('shop'));
  document.getElementById('back').onclick=()=>{beep(660);screenHub();};
  document.getElementById('go').onclick=()=>{S.action='job';beep(990);runJob();};
}
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
      <div class="hud"><span>건넬 거스름돈</span><b id="giv" class="px" style="font-size:20px">0</b></div>
      <div class="money">${MONEY.map(m=>`<button data-m="${m}" class="${m>=1000?'bill':'coin'}">${m.toLocaleString()}</button>`).join('')}</div>
    </div>
    <div class="btns"><button class="btn sec" id="undo">하나 빼기</button><button class="btn" id="give">건네기</button></div>
    <div class="hud"><span>맞힘 <b id="okn">0</b> · 틀림 <b id="badn">0</b></span><span>예상 일당 <b id="pay"></b></span></div>`;
  startShop(document.getElementById('shop'),true);
  app.querySelectorAll('.money button').forEach(b=>b.onclick=()=>{if(!J||J.left<=0)return; J.given.push(+b.dataset.m); beep(+b.dataset.m>=1000?700:1100,.03); updJob();});
  document.getElementById('undo').onclick=()=>{if(!J)return; J.given.pop(); beep(400,.03); updJob();};
  document.getElementById('give').onclick=()=>{ if(!J||J.left<=0)return;
    const want=J.cust.paid-J.cust.total, got=J.given.reduce((a,b)=>a+b,0);
    if(got===want){J.ok++; beep(988,.06);setTimeout(()=>beep(1318,.08),70); jobToast('감사합니다~ 😊',true);}
    else {J.bad++; beep(200,.15,'sawtooth'); buzz(80); jobToast(`정답은 ${want.toLocaleString()}원이었어요`,false);}
    newCustomer(); updJob(); };
  updJob();
  const t0=performance.now();
  J.timer=setInterval(()=>{ if(!J)return; J.left=Math.max(0,30-(performance.now()-t0)/1000*(window.JOB_SPEED||1));
    document.getElementById('tm').textContent=J.left.toFixed(1); document.getElementById('tb').style.width=(J.left/30*100)+'%';
    if(J.left<=0){clearInterval(J.timer); endJob();} },100);
}
function jobToast(msg,good){const r=document.getElementById('receipt'); if(!r)return; const d=document.createElement('div');
  d.className='jt '+(good?'g':'b'); d.textContent=msg; r.appendChild(d); setTimeout(()=>d.remove(),1200);}
function updJob(){
  const c=J.cust, got=J.given.reduce((a,b)=>a+b,0);
  document.getElementById('receipt').innerHTML=`${c.items.map(([n,p])=>`<div class="rl"><span>${n}</span><span>${p.toLocaleString()}</span></div>`).join('')}
    <div class="rl tot"><span>합계</span><span>${c.total.toLocaleString()}원</span></div>
    <div class="rl paid"><span>손님이 낸 돈</span><span>${c.paid.toLocaleString()}원</span></div>`;
  document.getElementById('giv').textContent=got.toLocaleString();
  document.getElementById('okn').textContent=J.ok; document.getElementById('badn').textContent=J.bad;
  document.getElementById('pay').textContent=won(jobPay(J.ok,J.bad));
}
function endJob(){
  const pay=jobPay(J.ok,J.bad), ok=J.ok, bad=J.bad; J=null; S.jobPay=pay;
  beep(523,.12);setTimeout(()=>beep(659,.12),130);setTimeout(()=>beep(784,.2),260);
  app.innerHTML=`${hud()}
    <h2 class="sh">🧾 퇴근!</h2>
    <canvas id="shop" class="pix" width="160" height="72"></canvas>
    <div class="box res-big"><div class="small">손님 ${ok}명 맞힘 · ${bad}명 틀림</div><div class="pl up">${won(pay,true)}</div>
      <div class="msg">${pay>=1000000?'에이스 알바생! 사장님이 감동했어요':pay>=600000?'꽤 손이 빠른데요?':'내일은 더 빨리!'}</div></div>
    <button class="btn" id="end">하루 마치기 →</button>`;
  startShop(document.getElementById('shop'));
  document.getElementById('end').onclick=()=>{beep(880);finishDay(null);};
}
// 편의점 계산대 도트 그림
function startShop(canvas,live){
  const HAIR=['#2b1d14','#c46a2b','#7a7a88','#e0b25a'], SHIRT=['#5a8f4a','#b5484b','#2f6fd0','#7a4f9a'];
  animate(canvas,(ctx,t)=>{const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#e9e2cf'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#cfc6ad'; for(let y=6;y<40;y+=11){ctx.fillRect(4,y,60,2);ctx.fillRect(96,y,60,2);}
    const goods=['#d7263d','#ffd166','#5ad19a','#2f6fd0','#ff9f43','#ff6fb5'];
    for(let y=0;y<3;y++)for(let x=0;x<12;x++){ctx.fillStyle=goods[(x+y*5)%6];ctx.fillRect(6+x*5,y*11+1,3,5);ctx.fillRect(98+x*5,y*11+1,3,5);}
    ctx.fillStyle='#9fdcff'; ctx.fillRect(68,4,24,30); ctx.fillStyle='#ffffff'; ctx.fillRect(68,4,24,2); ctx.fillRect(79,4,2,30);
    // 손님
    const c=live&&J&&J.cust; if(c){ const pal={...PAL,H:HAIR[c.look],B:SHIRT[c.look],T:SHIRT[c.look],W:SHIRT[c.look]};
      const bob=Math.round(Math.sin(t*3));
      SPR.normal.forEach((row,r)=>{for(let k=0;k<row.length;k++){const ch=row[k]; if(ch==='.')continue; ctx.fillStyle=pal[ch]; ctx.fillRect(68+k*2,14+r*2+bob,2,2);}}); }
    // 계산대
    ctx.fillStyle='#7a4f2e'; ctx.fillRect(0,46,W,H-46); ctx.fillStyle='#a06d43'; ctx.fillRect(0,44,W,3);
    if(c) c.items.forEach((it,i)=>{ctx.fillStyle=it[2]; ctx.fillRect(40+i*12,36,9,8); ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fillRect(40+i*12,36,9,2);});
    // 포스기
    ctx.fillStyle='#2b2546'; ctx.fillRect(118,30,30,16); ctx.fillStyle='#5ad19a'; ctx.fillRect(121,33,24,7);
    ctx.fillStyle='#0e2a1f'; if(Math.floor(t*2)%2) ctx.fillRect(123,35,8,3);
    if(!live){ drawSprite(ctx,SPR.happy,14,46-30,1,false); }
  });
}
