/* =========================================================
   자동 저장 · 이어하기 (v0.7.1)
   이 기기(브라우저)에 지금 판을 저장. 로그인 없이 같은 기기·같은 브라우저에서 이어할 수 있음
   저장 시점: 매일 아침 / 행동을 시작하는 순간 / 돈을 쓰는 화면(허브·임장·내 자산) / 저녁 결산 직후
   꼼수 방지: 주식장·편의점 미니게임을 하다가 끄면 그날은 "쉬는 날"로 처리 (투자한 돈은 그대로)
             → 결과를 보고 끈 뒤 같은 날을 다시 하는 걸 막음 (같은 날 같은 종목은 가격 흐름도 같아서)
   ========================================================= */
const SAVE_KEY='omz_save';
function saveGame(){ try{ if(S) localStorage.setItem(SAVE_KEY,JSON.stringify(S)); }catch(e){} }
function loadSave(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); }catch(e){ return null; } }
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

// 행동(주식장·편의점 미니게임)을 시작하는 순간: "진행 중"으로 저장
function markInProgress(kind){ S.inProgress=kind; saveGame(); }

function resumeGame(){
  const s=loadSave(); if(!s) return false;
  S=s;
  // JSON으로 저장하면 같은 매물이 두 군데(오늘 매물·관심 매물)에 따로 생김 → 같은 물건으로 다시 묶기
  S.watch=(S.watch||[]).map(w=>({...w, L:S.listings.find(x=>x.id===w.L.id)||w.L}));
  if(S.phase==='dayDone') nextDay();                 // 저녁 결산까지 끝난 날 → 다음 날 아침
  else if(S.inProgress){                             // 미니게임 도중에 끔 → 쉬는 날
    S.inProgress=null; S.action=null; S.jobPay=0; S.jobGood=false; S.storeQ=null; S.forfeit=true;
    finishDay(null);
  }
  else screenNews();                                 // 아침·허브 단계 → 오늘 아침 뉴스부터
  return true;
}

// 다음 날로 (마감 팝업의 [다음 날]과 이어하기가 같이 씀)
function nextDay(){
  const net=netWorth();
  if(net>=GOAL){ saveRecord(true,S.day,net); clearSave(); screenEnd('win'); }
  else if(net<100000){ saveRecord(false,S.day,net); clearSave(); screenEnd('broke'); }
  else if(S.day>=DAYS){ saveRecord(false,S.day,net); clearSave(); screenEnd('fail'); }
  else { S.day++; startDay(); }
}
