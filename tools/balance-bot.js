/* =========================================================
   밸런스 봇 — 게임 함수(startDay, genListing, findP, mktRent …)를 그대로 써서 30일을 자동으로 플레이
   전략:
   - skilled : 투자형. 뉴스 영향(S.today.eff)을 정확히 앎. 좋은 매물이 있으면 임장,
               아니면 강한 뉴스 2종목 주식장(현금 75%, 슈퍼개미가 되면 악재 종목은 공매도), 약한 날엔 편의점
   - biz     : 사업형. 매일 편의점 출근 (승진 사다리만 탐)
   - hybrid  : 섞기. 투자형과 같지만 뉴스가 아주 강한 날만 주식장, 나머지는 편의점
   - average : 평범. 행동 랜덤, 주식 종목 랜덤(현금 50%, 매수만), 편의점 성적 들쭉날쭉, 복권 반반 확률로 2장
   편의점 일당: 잘하는 봇은 단계별 범위의 90% 지점 + 매번 좋은 근무 / 평범한 봇은 20~80% 랜덤, 55% 넘으면 좋은 근무
   주의: 게임의 결산 로직(js/day.js finishDay, js/stock.js 가격식, js/job.js 일당)을 바꾸면 이 파일의 같은 식도 맞춰서 고칠 것
   사용: tools/run-balance.py 가 이 파일을 페이지에 넣고 runBot(전략, 판수) 실행
   ========================================================= */
window.runBot=function(strategy,runs,opt={}){
  const finals=[], hits=[], perRun=[];
  screenNews=()=>{};
  const smart=strategy!=='average';
  for(let run=0;run<runs;run++){
    newRun(); S.seed=run*31+7; let hit=null;
    const my={stock:0,job:0,save:0,rent:0,loan:0,re:0,deal:0,lotto:0}, acts={stock:0,realty:0,job:0};
    for(let d=1;d<=30;d++){
      S.day=d; startDay(); const td=S.today, r=dayRng(2), rr=dayRng(9);
      let lottoNet=0; if(!smart&&rr()<.5){ for(let i=0;i<2;i++){ S.cash-=50000; lottoNet-=50000; let x=rr(),acc=0; for(const [p,a] of LOTTO_TIERS){acc+=p; if(x<acc){S.cash+=a; lottoNet+=a; break;}} } }
      // ── 주식 후보: 슈퍼개미면 |영향|이 큰 순서(방향 = 부호), 개미면 호재만
      const canShort=S.inv.tier>=1;
      const ranked=STOCKS.slice().sort((a,b)=>canShort?Math.abs(td.eff[b.k])-Math.abs(td.eff[a.k]):td.eff[b.k]-td.eff[a.k]).slice(0,2);
      const strength=ranked.reduce((a,s)=>a+(canShort?Math.abs(td.eff[s.k]):td.eff[s.k]),0)/2;
      const score=L=>L.fair/L.ask+featScore(L.feat);
      const afford=S.reUnlocked?S.listings.filter(L=>L.ask*(.3+RE_TAX)<=S.cash*.9):[];
      const bestRe=afford.slice().sort((a,b)=>score(b)-score(a))[0];
      // ── 오늘 행동
      let act;
      if(strategy==='biz') act='job';
      else if(strategy==='average'){ const o=['stock','job']; if(S.reUnlocked) o.push('realty'); act=o[Math.floor(rr()*o.length)]; }
      else { const stockBar=strategy==='hybrid'?(opt.hybridBar??.4):(opt.stockBar??.2);
        if(bestRe&&score(bestRe)>(opt.reBar??1.08)) act='realty';
        else if((td.mood!=='crash'||canShort)&&strength>stockBar) act='stock';
        else act='job'; }
      acts[act]++;
      let stockPL=0, invest=0, job=0;
      if(act==='realty'){ let c=afford.slice(); if(smart) c.sort((a,b)=>score(b)-score(a)); else c=shuffle(c,rr);
        for(const L of c.slice(0,smart?2:1)){ if(L.ask*(.3+RE_TAX)>S.cash*.9) continue; if(smart&&score(L)<1.0) continue; if(!smart&&rr()<.4) continue;
          my.deal-=L.ask*RE_TAX; S.cash-=L.ask*(.3+RE_TAX); S.props.push({...L,value:L.ask,prevValue:L.ask,fairV:L.fair,ltv:.7,loan:L.ask*.7,paid:0,mult:1,tenant:null,sell:null}); } }
      else if(act==='job'){ const st=S.career.stage, [lo,hi]=CAREER[st].pay;
        const q=smart?(opt.jobSkill??.9):(.2+rr()*.6); job=Math.round(lo+(hi-lo)*q);
        const good=smart?true:q>.55;
        if(good){ S.career.good++; if(st<CAREER.length-1&&S.career.good>=CAREER[st].need){S.career.stage++; S.career.good=0;} } }
      else { invest=S.cash*(smart?.75:.5); const picks=smart?ranked:shuffle(STOCKS,r).slice(0,2);
        const brk = r()<.30 ? {t:200+Math.floor(r()*200), i:Math.floor(r()*2), e:BREAKING[Math.floor(r()*BREAKING.length)].e} : null;
        picks.forEach((s,i)=>{const v=VOL[s.v], budget=invest/2;
          const dir=smart?(td.eff[s.k]>=0?1:(canShort?-1:0)):1; if(dir===0) return;
          let drift=clamp(td.eff[s.k],-1,1)*STOCK_TREND*v.t, p=S.prices[s.k], z=0;
          const fill0=p*(1+dir*budget/v.mcap), sh=budget*(1-FEE-(dir<0?SHORT_FEE:0))/fill0;
          for(let k=1;k<=600;k++){ if(brk&&brk.t===k&&brk.i===i){drift=drift*.4+brk.e*.8; p*=Math.exp(brk.e*.03);}
            z=.85*z+.527*gauss(r); p*=Math.exp(drift/600+v.n*Math.sqrt(1/600)*z*.33*STOCK_NOISE);
            if(smart&&brk&&brk.i===i&&k===brk.t+5&&brk.e*dir<0) break; }   // 반대 방향 속보엔 바로 청산
          const amt=sh*p, sl=amt/v.mcap;
          const end=dir>0? sh*p*(1-sl)*(1-FEE) : sh*Math.max(0,2*fill0-p*(1+sl))*(1-FEE);
          stockPL+=end-budget; S.prices[s.k]=p; });
        if(invest>0&&stockPL/invest>=INV_GOOD&&INV_TIERS[S.inv.tier].need){ S.inv.good++; if(S.inv.good>=INV_TIERS[S.inv.tier].need){S.inv.tier++; S.inv.good=0;} } }
      const save=S.cash-invest, interest=save*saveRate();
      let rentIn=0,loanOut=0;
      for(const p of S.props){ loanOut+=p.loan*propRate(p); if(r()<findP(p,1)) rentIn+=mktRent(p); }
      const before=reEquity();
      for(const p of S.props){ const g=Math.exp(clamp(td.reEff[p.r]+td.reTypeEff[p.t],-1,1)*.03 + REG[p.r].drift + .002*p.loc + featGrowth(p.feat) + REG[p.r].vol*gauss(r));
        p.value*=g; p.fairV*=g; p.value+=(p.fairV-p.value)*RE_CONVERGE; }
      const reMove=reEquity()-before;
      S.cash=save+interest+invest+stockPL+job+rentIn-loanOut;
      while(S.cash<0&&S.props.length){const p=S.props.sort((a,b)=>b.loan-a.loan)[0]; S.cash+=p.value*.8-p.loan; S.props.splice(0,1);}
      my.stock+=stockPL; my.job+=job; my.save+=interest; my.rent+=rentIn; my.loan-=loanOut; my.re+=reMove; my.lotto+=lottoNet;
      if(!hit&&netWorth()>=GOAL) hit=d;
      if(netWorth()<1e5) break;
    }
    finals.push(netWorth()); hits.push(hit); perRun.push({hit,my,acts,stage:S.career.stage,tier:S.inv.tier});
  }
  finals.sort((a,b)=>a-b);
  const q=x=>Math.round(finals[Math.floor(x*(finals.length-1))]/1e4)+'만';
  const h=hits.filter(x=>x).sort((a,b)=>a-b);
  const avgK=k=>Math.round(perRun.reduce((a,x)=>a+x.my[k],0)/runs/1e4);
  const actAvg=k=>(perRun.reduce((a,x)=>a+x.acts[k],0)/runs).toFixed(1);
  const share=f=>Math.round(perRun.filter(f).length/runs*100)+'%';
  return `${strategy}: 하위10% ${q(.1)} / 중간 ${q(.5)} / 상위10% ${q(.9)} / 1억 ${h.length}/${runs}판`+(h.length?` (빠른 날 ${h[0]}, 중간 ${h[Math.floor(h.length/2)]})`:'')
   +`\n    평균 기여(만): 주식 ${avgK('stock')} 편의점 ${avgK('job')} 월세 ${avgK('rent')} 이자 ${avgK('loan')} 집값 ${avgK('re')} 매입차익 ${avgK('deal')} 적금 ${avgK('save')} 복권 ${avgK('lotto')}`
   +`\n    행동 횟수: 주식 ${actAvg('stock')} 임장 ${actAvg('realty')} 편의점 ${actAvg('job')} · 점장 도달 ${share(x=>x.stage>=2)} · 슈퍼개미 도달 ${share(x=>x.tier>=1)}`;
};
window.featScore=f=>(f.sun?.05:0)+(f.remodel?.05:0)+(f.view?.04:0)-(f.leak?.06:0)-(f.mold?.04:0)-(f.crack?.08:0)-(f.pipe?.03:0);
