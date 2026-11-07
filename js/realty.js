/* =========================================================
   모닝 트레이더 — 부동산
   12-1 매물 생성 / 12-2 도트 지도 / 12-3 집 안 / 12-5 임장 힌트 / 12-4 임장·내 자산·매입 화면
   (파일 구조와 규칙은 저장소의 CLAUDE.md 참고)
   ========================================================= */
/* =========================================================
   12. 부동산
   12-1. 매물 만들기
   ========================================================= */
function genListing(rng,n,force){
  let r=pickW(rng,[['seoul',30],['metro',40],['local',30]]);
  let t=pickW(rng,[['villa',35],['apt',45],['shop',20]]);
  let sz=pickW(rng,[['s',40],['m',40],['l',20]]);
  if(force){r=force.r;t=force.t;sz=force.sz;}
  const R=REG[r];
  // 지도 위 시설 배치 (절반은 생활권 안쪽에 오도록)
  const fac=[];
  CATS.forEach((c,ci)=>{const [a,b]=R.cnt[ci], k=a+Math.floor(rng()*(b-a+1));
    for(let i=0;i<k;i++){ let x,y,tries=0;
      do{ if(rng()<.55){const ang=rng()*Math.PI*2, d=10+rng()*(MAP_R-4); x=80+Math.cos(ang)*d; y=55+Math.sin(ang)*d;}
          else {x=10+rng()*140; y=10+rng()*90;}
          tries++; } while(tries<20 && (Math.hypot(x-80,y-55)<10 || fac.some(f=>Math.hypot(f.x-x,f.y-y)<14)));
      fac.push({c,x:Math.round(x),y:Math.round(y)}); }});
  // 입지 점수: 생활권 안에 있는 시설만, 가까울수록 큰 점수
  const cat=Object.fromEntries(CATS.map(c=>[c,0]));
  fac.forEach(f=>{const d=Math.hypot(f.x-80,f.y-55); if(d<MAP_R) cat[f.c]=Math.min(1.5,cat[f.c]+(1-d/MAP_R));});
  const loc=clamp(CATS.reduce((a,c)=>a+LOC_W[t][c]*cat[c],0),-.8,1.2);
  // 집 안 (보여주기만 하고 글자로는 안 알려줌)
  const feat={sun:rng()<.45, view:rng()<.22, remodel:rng()<.35};
  feat.leak =rng()<(feat.remodel?.08:.25);
  feat.mold =rng()<(feat.remodel?.08:(feat.sun?.15:.35));
  feat.crack=rng()<.2;
  feat.pipe =rng()<(feat.remodel?.05:.25);
  const base=R.base*TYPES[t].k*SIZES[sz].k;          // 이 지역·유형·크기의 보통 가격
  const fair=base*(1+.3*loc);                         // 입지를 반영한 적정가
  const ask=Math.round(fair*(1+(rng()-.5)*.3)/1e5)*1e5; // 집주인이 부르는 값 (적정가 ±15%, 하자는 모름)
  return {id:`D${S.day}-${n}`, r, t, sz, fac, cat, loc, feat, base, fair, ask, seed:Math.floor(rng()*1e9), visited:false};
}

/* ---------- 12-2. 도트 지도 ---------- */
function drawIcon(ctx,c,x,y,t){
  const X=x-4,Y=y-4;
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(X-1,Y+9,11,1);
  if(c==='station'){ // 파란 전철
    ctx.fillStyle='#173f8a';ctx.fillRect(X-1,Y,11,9);ctx.fillStyle='#2f6fd0';ctx.fillRect(X,Y+1,9,6);
    ctx.fillStyle='#e9f3ff';ctx.fillRect(X+1,Y+2,3,2);ctx.fillRect(X+5,Y+2,3,2);
    ctx.fillStyle='#ffd166';ctx.fillRect(X+1,Y+5,7,1);ctx.fillStyle='#111';ctx.fillRect(X,Y+9,2,1);ctx.fillRect(X+7,Y+9,2,1);}
  else if(c==='academy'){ // 지붕에 책이 펼쳐진 건물
    ctx.fillStyle='#a8551a';ctx.fillRect(X,Y+2,9,8);ctx.fillStyle='#f7e7c6';
    for(let i=0;i<3;i++)for(let j=0;j<2;j++)ctx.fillRect(X+1+i*3,Y+3+j*3,2,2);
    ctx.fillStyle='#ffffff';ctx.fillRect(X,Y-2,4,3);ctx.fillRect(X+5,Y-2,4,3);ctx.fillStyle='#d7263d';ctx.fillRect(X+4,Y-2,1,4);
    ctx.fillStyle='#555';ctx.fillRect(X+1,Y-1,2,1);ctx.fillRect(X+6,Y-1,2,1);}
  else if(c==='commerce'){ // 줄무늬 차양 가게들
    const cols=['#e63946','#ffb703','#2a9d8f'];ctx.fillStyle='#e3d3ad';ctx.fillRect(X-2,Y+3,13,7);
    cols.forEach((cc,i)=>{for(let k=0;k<4;k++){ctx.fillStyle=k%2?'#fff':cc;ctx.fillRect(X-2+i*4+k,Y+1,1,3);}
      ctx.fillStyle='#5a4632';ctx.fillRect(X-1+i*4,Y+6,2,4);ctx.fillStyle='#9fdcff';ctx.fillRect(X+1+i*4,Y+5,1,2);});}
  else if(c==='culture'){ // 나무와 연못이 있는 공원
    ctx.fillStyle='#4caf6a';ctx.fillRect(X-1,Y,11,10);ctx.fillRect(X,Y-1,9,12);ctx.fillStyle='#2d7a45';
    [[0,1],[6,0],[1,6],[7,7]].forEach(([a,b])=>{ctx.fillRect(X+a,Y+b,3,3);});ctx.fillStyle='#6fc3ff';ctx.fillRect(X+3,Y+4,4,2);}
  else if(c==='nuisance'){ // 굴뚝에서 연기 나는 공장
    ctx.fillStyle='#55555f';ctx.fillRect(X-1,Y+4,10,6);ctx.fillStyle='#43434b';
    for(let i=0;i<3;i++){ctx.fillRect(X-1+i*3,Y+3,2,1);ctx.fillRect(X-1+i*3,Y+2,1,1);}
    ctx.fillStyle='#7a3b2e';ctx.fillRect(X+8,Y-3,2,13);
    for(let i=0;i<3;i++){const s=(t*.5+i/3)%1;ctx.fillStyle=`rgba(150,150,150,${.85-s*.6})`;ctx.fillRect(X+8+Math.round(s*5),Y-5-Math.round(s*9),2+Math.round(s*3),2+Math.round(s*2));}}
}
function startMap(canvas,L){
  const W=canvas.width,H=canvas.height,R=REG[L.r],rng=mulberry32(L.seed);
  const ry=[16+Math.floor(rng()*12),72+Math.floor(rng()*14)], rx=[26+Math.floor(rng()*14),112+Math.floor(rng()*18)];
  const near=(x,y,d)=>Math.hypot(x-80,y-55)<d||L.fac.some(f=>Math.hypot(f.x-x,f.y-y)<d);
  const blds=[];
  for(let y=1;y<H-4;y+=7)for(let x=1;x<W-4;x+=7){
    if(ry.some(v=>y+6>v-3&&y<v+4)||rx.some(v=>x+6>v-3&&x<v+4))continue;
    if(near(x+3,y+3,9))continue;
    const q=rng();
    if(q<R.density) blds.push({x,y,w:4+Math.floor(rng()*3),h:4+Math.floor(rng()*3),c:R.bld[Math.floor(rng()*3)]});
    else if(q<R.density+.35) blds.push({x,y,tree:true});
  }
  const st=L.fac.filter(f=>f.c==='station');
  animate(canvas,(ctx,t)=>{
    ctx.fillStyle=R.ground; ctx.fillRect(0,0,W,H);
    if(L.r==='local'){ctx.fillStyle='#6f9550'; for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,1);}
    blds.forEach(b=>{ if(b.tree){ctx.fillStyle='#3f8a4c';ctx.fillRect(b.x+1,b.y+1,4,4);ctx.fillStyle='#2f6e3a';ctx.fillRect(b.x+3,b.y+3,2,2);}
      else {ctx.fillStyle=b.c;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(b.x,b.y,b.w,1);} });
    // 도로
    ctx.fillStyle='#3b3b45'; ry.forEach(v=>ctx.fillRect(0,v-3,W,6)); rx.forEach(v=>ctx.fillRect(v-3,0,6,H));
    ctx.fillStyle='#d8d49a'; ry.forEach(v=>{for(let x=0;x<W;x+=6)ctx.fillRect(x,v,3,1);}); rx.forEach(v=>{for(let y=0;y<H;y+=6)ctx.fillRect(v,y,1,3);});
    // 철길 (역이 있으면 역을 지나감)
    st.forEach(s=>{ctx.fillStyle='#6a5440';for(let x=0;x<W;x+=3)ctx.fillRect(x,s.y+6,1,3);ctx.fillStyle='#b9b9c4';ctx.fillRect(0,s.y+6,W,1);ctx.fillRect(0,s.y+8,W,1);});
    // 생활권 점선 원
    ctx.fillStyle='rgba(255,255,255,.75)';
    for(let a=0;a<360;a+=5){const rad=a*Math.PI/180;ctx.fillRect(Math.round(80+Math.cos(rad)*MAP_R),Math.round(55+Math.sin(rad)*MAP_R),1,1);}
    // 시설
    if(S.hints) L.fac.forEach(f=>{const d=Math.hypot(f.x-80,f.y-55); if(d>=MAP_R) return; const v=LOC_W[L.t][f.c]*(1-d/MAP_R);
      ctx.fillStyle=v>.06?'#5ad19a':(v<0?'#ff5a5f':'#d0d0d0'); const n=Math.ceil(d/2);   // 초록=좋음, 빨강=나쁨, 회색=이 집엔 별로
      for(let k=1;k<n;k+=2) ctx.fillRect(Math.round(80+(f.x-80)*k/n),Math.round(55+(f.y-55)*k/n),2,2); });
    L.fac.forEach(f=>{ctx.globalAlpha=(S.hints&&Math.hypot(f.x-80,f.y-55)>=MAP_R)?.35:1;   // 생활권 밖은 흐리게
      ctx.fillStyle=R.ground;ctx.fillRect(f.x-6,f.y-6,13,15);drawIcon(ctx,f.c,f.x,f.y,t);ctx.globalAlpha=1;});
    // 우리 집 + 핀
    ctx.fillStyle='#f3e8cf';ctx.fillRect(76,54,9,6);ctx.fillStyle='#d7263d';ctx.fillRect(75,53,11,1);ctx.fillRect(76,52,9,1);ctx.fillRect(78,51,5,1);ctx.fillRect(79,50,3,1);
    ctx.fillStyle='#5a3a22';ctx.fillRect(79,57,2,3);ctx.fillStyle='#9fdcff';ctx.fillRect(82,55,2,2);
    const by=Math.round(Math.abs(Math.sin(t*3))*3);
    ctx.fillStyle='#ffd166';ctx.fillRect(78,40-by,5,5);ctx.fillRect(79,45-by,3,2);ctx.fillRect(80,47-by,1,1);ctx.fillStyle='#2a1d05';ctx.fillRect(80,42-by,1,1);
  });
}
function legendHTML(){
  return `<div class="legend">${CATS.map(c=>`<span><canvas class="ico" width="16" height="16" data-ico="${c}"></canvas>${CAT_NAME[c]}</span>`).join('')}</div>`;
}
function drawLegend(){document.querySelectorAll('canvas[data-ico]').forEach(cv=>{const c=cv.dataset.ico; animate(cv,(ctx,t)=>{ctx.clearRect(0,0,16,16);drawIcon(ctx,c,8,8,t);});});}

/* ---------- 12-3. 집 안 (글자 없이 그림만) ---------- */
function startInterior(canvas,L){
  const W=canvas.width,H=canvas.height,f=L.feat,rng=mulberry32(L.seed+7);
  const inset={s:24,m:12,l:2}[L.sz], shop=L.t==='shop', FL=70;
  const wall=f.remodel?'#efe9de':'#cbb878', wall2=f.remodel?'#d9d2c4':'#ab9a5e';
  const moldPts=[...Array(26)].map(()=>[Math.floor(rng()*12),Math.floor(rng()*12)]);
  const crack=[]; {let x=inset+18+Math.floor(rng()*10),y=14; while(y<50){crack.push([x,y]); y++; if(rng()<.5)x+=rng()<.5?-1:1;}}
  const win= shop? {x:inset+8,y:14,w:W-2*inset-16,h:40}
                 : f.sun? {x:58,y:13,w:54,h:40} : {x:70,y:18,w:30,h:24};
  animate(canvas,(ctx,t)=>{
    // 천장·벽·바닥
    ctx.fillStyle=f.remodel?'#f7f4ee':'#b9ab83'; ctx.fillRect(0,0,W,9);
    ctx.fillStyle=wall; ctx.fillRect(0,9,W,FL-9);
    if(!f.remodel){ctx.fillStyle='#b8a565'; for(let x=0;x<W;x+=6)ctx.fillRect(x,9,1,FL-9); ctx.fillStyle='#9a8a50'; for(let x=3;x<W;x+=12)for(let y=14;y<FL;y+=10)ctx.fillRect(x,y,1,1);}
    if(shop){ ctx.fillStyle=f.remodel?'#e8e8ec':'#9a9a90'; ctx.fillRect(0,FL,W,H-FL);
      ctx.fillStyle=f.remodel?'#d0d0d8':'#85857a'; for(let x=0;x<W;x+=10)for(let y=FL;y<H;y+=10)ctx.fillRect(x+((y/10)%2?5:0),y,5,5); }
    else { ctx.fillStyle=f.remodel?'#c99a63':'#7d5e40'; ctx.fillRect(0,FL,W,H-FL);
      ctx.fillStyle=f.remodel?'#b5874f':'#6a4e34'; for(let y=FL+5;y<H;y+=6)ctx.fillRect(0,y,W,1);
      if(f.remodel){for(let y=FL;y<H;y+=6)for(let x=(y%12?8:20);x<W;x+=24)ctx.fillRect(x,y,1,6);} else {ctx.fillStyle='#5c442d';for(let i=0;i<6;i++)ctx.fillRect((i*37)%W,FL+8+(i*11)%22,4,2);} }
    ctx.fillStyle=f.remodel?'#ffffff':'#8a7a4e'; ctx.fillRect(0,FL-2,W,2); // 걸레받이
    // 창문 (남향이면 크고 밝음, 전망이 좋으면 강·공원이 보임)
    const w=win;
    ctx.fillStyle=f.sun?'#9fdcff':'#8d98aa'; ctx.fillRect(w.x,w.y,w.w,w.h);
    if(f.sun){ctx.fillStyle='#fff3a0';ctx.fillRect(w.x+w.w-12,w.y+3,8,8);ctx.fillStyle='#ffe066';ctx.fillRect(w.x+w.w-11,w.y+4,6,6);}
    else {ctx.fillStyle='#a9b2c0';ctx.fillRect(w.x+4,w.y+5,12,3);ctx.fillRect(w.x+8,w.y+3,8,2);}
    if(f.view){ctx.fillStyle='#3f8a4c';ctx.fillRect(w.x,w.y+w.h-11,w.w,4);ctx.fillStyle='#4a90d0';ctx.fillRect(w.x,w.y+w.h-7,w.w,7);
      ctx.fillStyle='#9fd0f0';for(let x=w.x+2;x<w.x+w.w;x+=7)ctx.fillRect(x+Math.round(Math.sin(t*2+x)*1),w.y+w.h-4,3,1);}
    else {ctx.fillStyle=f.sun?'#7f8fa6':'#5e6675'; for(let x=w.x;x<w.x+w.w;x+=9){const hh=10+((x*7)%9);ctx.fillRect(x,w.y+w.h-hh,7,hh);}
      ctx.fillStyle=f.sun?'#c8d6e6':'#7b8494'; for(let x=w.x+1;x<w.x+w.w;x+=9)for(let y=w.y+w.h-8;y<w.y+w.h;y+=3)ctx.fillRect(x+1,y,1,1);}
    ctx.fillStyle=f.remodel?'#ffffff':'#c9c2a8'; ctx.fillRect(w.x-2,w.y-2,w.w+4,2);ctx.fillRect(w.x-2,w.y+w.h,w.w+4,2);ctx.fillRect(w.x-2,w.y,2,w.h);ctx.fillRect(w.x+w.w,w.y,2,w.h);
    ctx.fillRect(w.x+Math.floor(w.w/2)-1,w.y,2,w.h); if(!shop&&f.sun)ctx.fillRect(w.x,w.y+Math.floor(w.h/2),w.w,1);
    // 햇살
    if(f.sun){ctx.fillStyle=`rgba(255,236,150,${.22+Math.sin(t*1.5)*.04})`;
      for(let i=0;i<H-w.y-w.h;i++){const yy=w.y+w.h+i; if(yy<FL)continue; ctx.fillRect(w.x-8+Math.round(i*.9),yy,w.w-6,1);} }
    // 조명
    if(f.remodel){ctx.fillStyle='#333';ctx.fillRect(W/2-1,0,1,8);ctx.fillStyle='#e0b25a';ctx.fillRect(W/2-5,8,10,3);ctx.fillStyle='rgba(255,220,140,.25)';ctx.fillRect(W/2-8,11,16,2);}
    else {const fl=(Math.floor(t*7)%23===0)?'#9aa':'#eef';ctx.fillStyle='#777';ctx.fillRect(W/2-14,7,28,1);ctx.fillStyle=fl;ctx.fillRect(W/2-13,8,26,2);}
    // 가구
    if(shop){ // 진열대 + 계산대
      ctx.fillStyle=f.remodel?'#ffffff':'#7d5e40'; ctx.fillRect(inset+4,FL-24,22,24); ctx.fillStyle=f.remodel?'#cfcfd6':'#5c442d'; for(let y=FL-22;y<FL;y+=7)ctx.fillRect(inset+4,y,22,1);
      const items=['#e63946','#ffb703','#2a9d8f','#6fc3ff']; for(let y=FL-21;y<FL-2;y+=7)for(let x=inset+6;x<inset+24;x+=4){ctx.fillStyle=items[(x+y)%4];ctx.fillRect(x,y,2,4);}
      ctx.fillStyle=f.remodel?'#3a3260':'#6a4e34'; ctx.fillRect(W-inset-34,FL+4,30,14); ctx.fillStyle=f.remodel?'#5a4f90':'#86664a'; ctx.fillRect(W-inset-34,FL+4,30,3);
    } else {
      ctx.fillStyle=f.remodel?'#5b6fa8':'#7a5040'; ctx.fillRect(inset+6,FL-4,34,14); ctx.fillRect(inset+6,FL-12,34,8);
      ctx.fillStyle=f.remodel?'#7186c2':'#8f6250'; ctx.fillRect(inset+8,FL-10,14,6);ctx.fillRect(inset+24,FL-10,14,6);
      if(!f.remodel){ctx.fillStyle='#a6806a';ctx.fillRect(inset+12,FL-8,4,3);}
      ctx.fillStyle=f.remodel?'#d9c2a0':'#5c442d'; ctx.fillRect(inset+48,FL+12,24,3); ctx.fillRect(inset+50,FL+15,2,6);ctx.fillRect(inset+68,FL+15,2,6);
      if(f.remodel){ctx.fillStyle='#8a5a3a';ctx.fillRect(W-inset-16,FL+6,7,8);ctx.fillStyle='#3f9a5c';ctx.fillRect(W-inset-18,FL-6,4,12);ctx.fillRect(W-inset-13,FL-10,3,16);ctx.fillRect(W-inset-9,FL-4,4,10);}
      if(L.sz==='l'){ctx.fillStyle='#4a3a2a';ctx.fillRect(W-inset-44,FL-30,20,30);ctx.fillStyle='#6a5440';for(let y=FL-26;y<FL;y+=8)ctx.fillRect(W-inset-44,y,20,1);
        const bk=['#d7263d','#2f6fd0','#ffd166','#3f9a5c'];for(let y=FL-25;y<FL-2;y+=8)for(let x=W-inset-42;x<W-inset-26;x+=3){ctx.fillStyle=bk[(x+y)%4];ctx.fillRect(x,y,2,6);}}
    }
    // ── 하자 ──
    if(f.leak){ const sx=W-inset-46;
      ctx.fillStyle='rgba(120,85,40,.55)'; ctx.fillRect(sx,9,16,5);ctx.fillRect(sx+3,14,10,3);ctx.fillRect(sx+6,17,4,2);
      ctx.fillStyle='#6c8a3a'; ctx.fillRect(sx+2,FL+14,10,8); ctx.fillStyle='#8aa84a'; ctx.fillRect(sx+2,FL+14,10,2);  // 양동이
      const dy=(t*40)%(FL+12-18); ctx.fillStyle='#6fc3ff'; ctx.fillRect(sx+7,19+Math.round(dy),1,2);
      ctx.fillStyle='rgba(111,195,255,.35)'; ctx.fillRect(sx-2,FL+21,18,2); }
    if(f.mold){ const mx=inset+2, my=10; ctx.fillStyle='#2f3a26';
      moldPts.forEach(([a,b],i)=>{ctx.fillStyle=i%3?'#3a4a2c':'#1f2a1a';ctx.fillRect(mx+a,my+b,1+(i%2),1);});
      moldPts.slice(0,14).forEach(([a,b],i)=>{ctx.fillStyle=i%2?'#3a4a2c':'#1f2a1a';ctx.fillRect(mx+a,FL-3-Math.floor(b/2),1,1);}); }
    if(f.crack){ ctx.fillStyle='#4a3d2a'; crack.forEach(([x,y],i)=>{ctx.fillRect(x,y,1,1); if(i%9===4)ctx.fillRect(x+1,y+1,2,1);}); }
    if(f.pipe){ const px=W-inset-8; ctx.fillStyle='#9a4f2a'; ctx.fillRect(px,9,3,FL-9); ctx.fillStyle='#6e3519'; for(let y=20;y<FL;y+=18)ctx.fillRect(px-1,y,5,3);
      ctx.fillStyle='rgba(122,74,42,.6)'; ctx.fillRect(px-2,26,2,14); ctx.fillRect(px+3,44,2,10);
      const dy=(t*25)%20; ctx.fillStyle='#a86a3a'; ctx.fillRect(px+1,FL-1+Math.round(dy/4),1,1); }
    // 측면 벽 (작은 집일수록 좁게)
    for(let x=0;x<inset;x++){const k=x/inset, top=Math.round(9*k), bot=Math.round(FL+(H-FL)*(1-k));
      ctx.fillStyle=wall2; ctx.fillRect(x,top,1,bot-top); ctx.fillStyle=wall2; ctx.fillRect(W-1-x,top,1,bot-top);}
    if(inset>0){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(inset,9,1,FL-9);ctx.fillRect(W-1-inset,9,1,FL-9);}
    // 남향이 아니면 전체가 어둡게
    if(!f.sun){ctx.fillStyle='rgba(20,28,60,.22)';ctx.fillRect(0,0,W,H);} else {ctx.fillStyle='rgba(255,220,150,.06)';ctx.fillRect(0,0,W,H);}
  });
}

/* ---------- 12-5. 임장 힌트 (알아보기 쉽게) ---------- */
// 입지 별점: 지도 점수를 별 5개로
const locStars=loc=>loc<-.2?1:loc<.1?2:loc<.35?3:loc<.65?4:5;
const starStr=n=>'★'.repeat(n)+'☆'.repeat(5-n);
// 생활권 안 시설이 "이 유형의 집"에 얼마나 좋은지 (같은 학원가도 아파트엔 ▲▲, 상가엔 ·)
function locHTML(L){
  const rows=CATS.filter(c=>L.cat[c]>0).map(c=>{const v=LOC_W[L.t][c]*L.cat[c];
    const mark=v>.3?'▲▲':v>.08?'▲':v<-.2?'▼▼':v<0?'▼':'·';
    return `<span class="lb ${v>.08?'g':v<0?'b':''}"><canvas class="ico" width="16" height="16" data-ico="${c}"></canvas>${CAT_NAME[c]} ${mark}</span>`;}).join('');
  return `<div class="locsum"><span class="lb">입지 <b class="stars">${starStr(locStars(L.loc))}</b></span>${rows||'<span class="small">생활권 안에 시설이 없어요</span>'}</div>`;
}
// 집 안 요소: [키, 이름, 영향, 좋음(1)/나쁨(-1)]
const FEATS=[['sun','남향 햇빛','월세↑ 공실↓',1],['remodel','리모델링','월세↑ 집값↑',1],['view','강·공원 전망','집값↑ 잘 팔림',1],
             ['leak','누수','공실↑',-1],['mold','곰팡이','월세↓',-1],['crack','벽 균열','집값↓',-1],['pipe','낡은 배관','잘 안 팔림',-1]];
function drawFeatIcon(ctx,k){
  ctx.clearRect(0,0,16,16); const P=(c,x,y,w=1,h=1)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  if(k==='sun'){P('#ffd166',5,5,6,6);P('#fff3a0',6,6,3,3);[[7,1,2,2],[7,13,2,2],[1,7,2,2],[13,7,2,2],[3,3],[12,3],[3,12],[12,12]].forEach(a=>P('#ffd166',a[0],a[1],a[2]||1,a[3]||1));}
  else if(k==='remodel'){P('#ffffff',7,2,2,12);P('#ffffff',2,7,12,2);P('#ffd166',7,7,2,2);P('#fff3a0',3,3);P('#fff3a0',12,3);P('#fff3a0',3,12);P('#fff3a0',12,12);}
  else if(k==='view'){P('#3f8a4c',1,5,14,3);P('#4a90d0',1,8,14,6);P('#9fd0f0',2,10,4,1);P('#9fd0f0',9,12,4,1);P('#9fdcff',1,1,14,4);}
  else if(k==='leak'){P('#6fc3ff',7,2,2,2);P('#6fc3ff',6,4,4,3);P('#6fc3ff',5,7,6,5);P('#3f8fd0',6,12,4,1);P('#e9f6ff',6,8,1,2);}
  else if(k==='mold'){[[3,3,2,2],[6,2],[9,4,2,2],[4,7],[7,6,2,2],[11,8],[3,10,2,2],[8,10],[12,12,2,2],[6,12]].forEach((a,i)=>P(i%2?'#2f3a26':'#4a5a32',a[0],a[1],a[2]||1,a[3]||1));}
  else if(k==='crack'){P('#e5d6aa',1,1,14,14);[[8,1],[7,2],[7,3],[8,4],[9,5],[8,6],[7,7],[6,8],[7,9],[8,10],[8,11],[7,12],[6,13],[6,14],[10,6],[11,7]].forEach(a=>P('#4a3d2a',a[0],a[1]));}
  else if(k==='pipe'){P('#9a4f2a',6,0,4,16);P('#6e3519',5,4,6,2);P('#6e3519',5,10,6,2);P('#7a4a2a',10,6,1,4);P('#a86a3a',11,13,1,2);}
}
function featHTML(L){
  const fs=FEATS.filter(([k])=>L.feat[k]);
  return `<div class="feats">${fs.length?fs.map(([k,n,e,g])=>`<span class="fb ${g>0?'g':'b'}"><canvas class="ico" width="16" height="16" data-feat="${k}"></canvas><span><b>${n}</b><br>${e}</span></span>`).join('')
    :'<span class="small">눈에 띄는 장점도 하자도 없어요</span>'}</div>`;
}
function drawFeatIcons(){document.querySelectorAll('canvas[data-feat]').forEach(cv=>{const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;drawFeatIcon(ctx,cv.dataset.feat);});}
function visitSummary(L){const good=FEATS.filter(([k,,,g])=>g>0&&L.feat[k]).length, bad=FEATS.filter(([k,,,g])=>g<0&&L.feat[k]).length;
  return `입지 <b class="stars">${starStr(locStars(L.loc))}</b> · 장점 <b style="color:var(--ok)">${good}</b> · 하자 <b style="color:var(--up)">${bad}</b>`;}


/* ---------- 12-4. 부동산: 임장 하는 날 ---------- */
function ownedCard(p,i){
  const eq=p.value-p.loan, mr=mktRent(p), interest=p.loan*loanRate(), chg=p.prevValue?p.value/p.prevValue-1:0;
  const st=p.tenant
    ? `<div class="st ok">세입자 있음 · 월세 하루 ${won(p.tenant.rent)} · 계약 ${p.tenant.days}일 남음</div>`
    : `<div class="st vac">공실 · 오늘 저녁 세입자 구할 확률 ${Math.round(findP(p,p.mult)*100)}%</div>`;
  const sell=p.sell
    ? `<div class="st sell">매도 등록 중 · ${won(p.value*p.sell)} · 오늘 저녁 팔릴 확률 ${Math.round(sellP(p,p.sell)*100)}%</div>
       <div class="act"><span class="need">팔리면 손에 <b>${won(p.value*p.sell*(1-RE_TAX)-p.loan)}</b></span><button class="btn sec sm" data-unsell="${i}">등록 취소</button></div>`
    : `<div class="lbl">매도 호가</div>
       <div class="quick">${[[.9,'급매 90%'],[1,'시세 100%'],[1.1,'110%']].map(([m,tx])=>`<button data-sellsel="${i}" data-m="${m}" class="${(p.sellSel??1)===m?'on':''}">${tx}</button>`).join('')}</div>
       <div class="act"><span class="need">오늘 저녁 팔릴 확률 <b>${Math.round(sellP(p,p.sellSel??1)*100)}%</b></span><button class="btn sec sm" data-sell="${i}">매도 등록</button></div>`;
  return `<div class="re own">
    <div class="top"><span class="nm">${propName(p)}</span><span class="${cls(chg)}" style="font-size:13px">어제보다 ${pct(chg)}</span></div>
    <div class="kv"><span>시세 <b>${won(p.value)}</b></span><span>대출 <b>${won(p.loan)}</b></span>
      <span>내 지분 <b class="${cls(eq-p.paid)}">${won(eq)}</b></span><span>이자 <b>하루 ${won(interest)}</b></span></div>
    ${st}
    <div class="lbl">${p.tenant?'다음 계약 월세':'내가 정한 월세'} (시세 하루 ${won(mr)} 기준)</div>
    <div class="quick">${[.9,1,1.1,1.2].map(m=>`<button data-rent="${i}" data-m="${m}" class="${p.mult===m?'on':''}">${Math.round(m*100)}%</button>`).join('')}</div>
    ${sell}
    <button class="linkbtn" data-look="${i}" style="align-self:flex-start">지도·집 안 다시 보기</button>
  </div>`;
}
function listingCard(L,inWatch){
  return `<div class="re">
    <div class="top"><span class="nm">${propName(L)}</span><span class="tag" style="background:${L.visited?'#3f7a5c':'#3a3260'}">${inWatch?`D-${S.watch.find(w=>w.L===L).until-S.day}`:(L.visited?'임장 완료':AREA[L.t][L.sz]+'평')}</span></div>
    <div class="kv"><span>호가 <b>${won(L.ask)}</b></span><span>보통 시세 <b>${won(L.base)}</b></span>
      <span>보통 월세 <b>하루 ${(REG[L.r].yieldT[L.t]*100).toFixed(2)}%</b></span><span>팔리는 속도 <b>${'●'.repeat(Math.max(1,Math.round(REG[L.r].liq[L.t]*5)))}</b></span></div>
    <div class="act"><span class="need">${L.visited?(S.hints?visitSummary(L):'임장 완료'):`오늘 남은 임장 <b>${S.visits}번</b>`}</span>
      <button class="btn ${L.visited?'sec':''} sm" data-visit="${L.id}" ${(!L.visited&&S.visits<=0)?'disabled':''}>${L.visited?'다시 보기':'임장 가기'}</button></div>
    ${buyHTML(L)}
  </div>`;
}
function screenListings(){
  const committed=S.action==='realty';
  app.innerHTML=`${hud()}
    <h2 class="sh">🏠 임장 가는 날</h2>
    <div class="summary">
      <div><div class="lab">현금</div><div class="val">${won(S.cash)}</div></div>
      <div><div class="lab">남은 임장</div><div class="val">${S.visits}번</div></div>
      <div><div class="lab">대출 금리</div><div class="val">${(loanRate()*100).toFixed(2)}%</div></div>
    </div>
    <div class="small" style="text-align:left">둘러본 매물은 3일 동안 "관심 매물"로 남아서, 다른 날에도 <b style="color:var(--ink)">내 자산</b>에서 살 수 있어요.</div>
    ${S.listings.map(L=>listingCard(L,false)).join('')||'<div class="small">오늘은 매물이 없어요</div>'}
    ${committed?'':'<button class="btn sec" id="back">← 다른 걸 할래요</button>'}
    <button class="btn" id="end">하루 마치기 →</button>`;
  bindBuy(()=>keepScroll(screenListings));
  app.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>{const L=S.listings.find(x=>x.id===b.dataset.visit);
    if(!L.visited){ if(S.visits<=0)return; S.visits--; L.visited=true; S.action='realty';
      if(!S.watch.some(w=>w.L===L)) S.watch.push({L,until:S.day+2}); }
    beep(880); screenVisit(L,'listings');});
  const bk=document.getElementById('back'); if(bk) bk.onclick=()=>{beep(660);screenHub();};
  document.getElementById('end').onclick=()=>{S.action='realty';beep(880);finishDay(null);};
}
// 내 자산: 보유한 집 관리 + 관심 매물 사기 (행동 소모 없음)
function screenAssets(){
  const watch=S.watch.filter(w=>!S.listings.includes(w.L)||S.action!=='realty');
  app.innerHTML=`${hud()}
    <h2 class="sh">🏘 내 자산</h2>
    <div class="summary">
      <div><div class="lab">현금</div><div class="val">${won(S.cash)}</div></div>
      <div><div class="lab">부동산 지분</div><div class="val">${won(reEquity())}</div></div>
      <div><div class="lab">대출 금리</div><div class="val">${(loanRate()*100).toFixed(2)}%</div></div>
    </div>
    ${S.props.length?`<h3 class="sub">내 부동산</h3>${S.props.map(ownedCard).join('')}`:''}
    ${watch.length?`<h3 class="sub">관심 매물 (둘러본 집, 3일간)</h3>${watch.map(w=>listingCard(w.L,true)).join('')}`:''}
    ${!S.props.length&&!watch.length?'<div class="small">아직 집도 관심 매물도 없어요</div>':''}
    <button class="btn sec" id="back">← 돌아가기</button>`;
  const re=()=>keepScroll(screenAssets);
  bindBuy(re);
  app.querySelectorAll('[data-rent]').forEach(b=>b.onclick=()=>{S.props[+b.dataset.rent].mult=+b.dataset.m;beep(520,.04);re();});
  app.querySelectorAll('[data-sellsel]').forEach(b=>b.onclick=()=>{S.props[+b.dataset.sellsel].sellSel=+b.dataset.m;beep(520,.04);re();});
  app.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{const p=S.props[+b.dataset.sell]; p.sell=p.sellSel??1; beep(660,.06);re();});
  app.querySelectorAll('[data-unsell]').forEach(b=>b.onclick=()=>{S.props[+b.dataset.unsell].sell=null; beep(440,.06);re();});
  app.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{beep(660);screenVisit(S.props[+b.dataset.look],'assets');});
  app.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>{const w=S.watch.find(x=>x.L.id===b.dataset.visit); beep(660); screenVisit(w.L,'assets');});
  document.getElementById('back').onclick=()=>{beep(660); S.action==='realty'?screenListings():screenHub();};
}
function keepScroll(fn){const y=window.scrollY; fn(); window.scrollTo(0,y);}
const findListing=id=>S.listings.find(x=>x.id===id)||(S.watch.find(w=>w.L.id===id)||{}).L;
function buyHTML(L){
  const ltv=S.ltvSel[L.id]??.7, need=L.ask*(1-ltv)+L.ask*RE_TAX, ok=S.cash>=need;
  return `<div class="lbl">대출 비율</div>
    <div class="quick">${[0,.3,.5,.7].map(v=>`<button data-ltv="${L.id}" data-v="${v}" class="${ltv===v?'on':''}">${Math.round(v*100)}%</button>`).join('')}</div>
    <div class="act"><span class="need">필요 현금 <b>${won(need)}</b> · 대출 <b>${won(L.ask*ltv)}</b></span>
      <button class="btn sm" data-buy="${L.id}" ${ok?'':'disabled'}>매입</button></div>`;
}
function bindBuy(rerender){
  app.querySelectorAll('[data-ltv]').forEach(b=>b.onclick=()=>{S.ltvSel[b.dataset.ltv]=+b.dataset.v;beep(520,.04);rerender();});
  app.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
    const L=findListing(b.dataset.buy); if(!L)return; const ltv=S.ltvSel[L.id]??.7, need=L.ask*(1-ltv)+L.ask*RE_TAX;
    if(S.cash<need)return; S.cash-=need;
    if(S.listings.includes(L)) S.action='realty';
    // 산 순간부터 "시세"는 적정가로 보인다 → 비싸게 샀는지 싸게 샀는지 드러남
    S.props.push({...L, value:L.fair, prevValue:L.fair, loan:L.ask*ltv, paid:need, mult:1, tenant:null, sell:null, bought:S.day});
    S.listings=S.listings.filter(x=>x!==L); S.watch=S.watch.filter(w=>w.L!==L);
    beep(988,.06);beep(1318,.1);buzz(30); rerender();});
}
// 임장: 지도 + 집 안
function screenVisit(L,from){
  const owned=S.props.includes(L), canBuy=!owned&&!!findListing(L.id);
  app.innerHTML=`${hud()}
    <h2 class="sh">${owned?'내 집 둘러보기':'임장'} · ${propName(L)}</h2>
    <div class="small" style="text-align:left">${AREA[L.t][L.sz]}평 · ${owned?`시세 <b>${won(L.value)}</b>`:`호가 <b>${won(L.ask)}</b> (보통 시세 ${won(L.base)})`}</div>
    <h3 class="sub">동네 지도</h3>
    <canvas id="map" class="pix" width="160" height="110"></canvas>
    ${legendHTML()}
    ${S.hints?locHTML(L):''}
    <div class="small" style="text-align:left">점선 원이 생활권이에요. 원 안에, 집에서 가까이 있을수록 영향이 커요.${S.hints?' 초록 선은 이 집에 좋은 시설, 빨간 선은 나쁜 시설이에요.':''}</div>
    <h3 class="sub">집 안</h3>
    <canvas id="room" class="pix" width="160" height="100"></canvas>
    ${S.hints?featHTML(L):''}
    <button class="linkbtn" id="hint" style="align-self:flex-start">${S.hints?'힌트 숨기기 (그림만 보고 판단하기)':'힌트 보기'}</button>
    ${canBuy?`<div class="re">${buyHTML(L)}</div>`:''}
    <button class="btn sec" id="back">← 돌아가기</button>`;
  startMap(document.getElementById('map'),L);
  startInterior(document.getElementById('room'),L);
  drawLegend(); drawFeatIcons();
  document.getElementById('hint').onclick=()=>{S.hints=!S.hints;beep(520,.04);screenVisit(L,from);};
  if(canBuy) bindBuy(()=>{ S.props.some(p=>p.id===L.id)? (from==='assets'?screenAssets():screenListings()) : screenVisit(L,from); });
  document.getElementById('back').onclick=()=>{beep(660); from==='assets'?screenAssets():screenListings();};
}
