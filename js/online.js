/* =========================================================
   온라인: Google 로그인 · 온라인 랭킹 · 다른 기기 이어하기 (v0.8, Firebase)
   - Firebase 프로그램(SDK)은 처음 필요할 때 인터넷에서 불러옴. 못 불러오면(대화 속 게임 페이지, 인터넷 끊김)
     조용히 "이 기기 기록" 모드로 동작 → 게임은 그대로 할 수 있음
   - 저장소(Firestore) 구조
       scores/{로그인한 사람 uid} = {name 닉네임, win 1억 달성, days 날짜, money 최종 순자산, score 순위용 점수, at 시간, ver 버전}
                                    한 사람당 최고 기록 1개. 더 좋은 기록일 때만 바꿈
       saves/{uid}               = {data 지금 판 전체(JSON 글자), day, savedAt} → 다른 기기에서 이어하기
   - 보안 규칙(firestore.rules)이 "자기 기록만 쓰기, 말이 안 되는 기록 막기"를 맡음
   - apiKey는 비밀번호가 아니라 원래 공개되는 값 (Firebase 안내도 그렇게 말함)
   ========================================================= */
const FB_CONFIG = {
  apiKey: "AIzaSyDg2sTmcw7C0oMLJuFiUxPlDSd_AqhoKJU",
  authDomain: "morning-trader.firebaseapp.com",
  projectId: "morning-trader",
  storageBucket: "morning-trader.firebasestorage.app",
  messagingSenderId: "940305390988",
  appId: "1:940305390988:web:5f9a318ebaa9e3e0954aa9",
};
const FB_VER = '13.2.0';
const GAME_VER = '0.8';
const ON = { tried:false, ready:false, user:null, A:null, F:null, auth:null, db:null, mine:null, err:null };

// 순위용 점수 하나로 합치기: 1억 달성한 판이 무조건 위, 빨리 달성할수록 위, 같으면 순자산 많은 순
const scoreOf=r=>(r.win?1e12+(31-r.days)*1e10:0)+Math.min(Math.round(r.money),9.9e9);

// Firebase 불러오기 (한 번만). 5초 안에 안 되면 포기
async function onlineInit(){
  if(ON.tried) return ON.ready; ON.tried=true;
  try{
    const base=`https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const load=window.__FB_MOCK?Promise.resolve(window.__FB_MOCK)   // 자동 테스트용 가짜 Firebase
      :Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')])
        .then(([a,b,c])=>({...a,...b,...c}));
    const M=await Promise.race([load,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),5000))]);
    const app=M.initializeApp(FB_CONFIG);
    ON.A=M; ON.F=M; ON.auth=M.getAuth(app); ON.db=M.getFirestore(app); ON.ready=true;
    try{ await M.getRedirectResult?.(ON.auth); }catch(e){}            // 리다이렉트 로그인에서 돌아온 경우
    M.onAuthStateChanged(ON.auth,async u=>{ ON.user=u; ON.mine=null;
      if(u){ await fetchMine(); await cloudPull(); }
      onlineChanged(); });
  }catch(e){ ON.err=e; ON.ready=false; }
  return ON.ready;
}
// 로그인 상태가 바뀌면 첫 화면이면 다시 그리기
function onlineChanged(){ if(document.getElementById('rankbox')&&!S) screenTitle(); }

/* ---------- 로그인 ---------- */
async function onlineLogin(){
  if(!await onlineInit()) return false;
  const p=new ON.A.GoogleAuthProvider();
  try{ await ON.A.signInWithPopup(ON.auth,p); return true; }
  catch(e){ const c=e.code||'';
    if(c.includes('popup-blocked')||c.includes('operation-not-supported')) await ON.A.signInWithRedirect(ON.auth,p);   // 팝업이 막힌 브라우저 → 페이지 이동 방식
    return false; }   // 사용자가 창을 닫은 경우 등
}
async function onlineLogout(){ if(ON.ready) await ON.A.signOut(ON.auth); }
const myName=()=>{ try{ return (ON.mine&&ON.mine.name)||localStorage.getItem('omz_name')||''; }catch(e){ return ''; } };

/* ---------- 랭킹 ---------- */
async function fetchTop(n=5){
  const {collection,query,orderBy,limit,getDocs}=ON.F;
  const snap=await getDocs(query(collection(ON.db,'scores'),orderBy('score','desc'),limit(n)));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function fetchMine(){
  if(!ON.user) return null;
  const s=await ON.F.getDoc(ON.F.doc(ON.db,'scores',ON.user.uid)); ON.mine=s.exists()?s.data():null; return ON.mine;
}
// 내 순위 = 나보다 점수 높은 사람 수 + 1
async function rankOf(score){
  const {collection,query,where,getCountFromServer}=ON.F;
  const c=await getCountFromServer(query(collection(ON.db,'scores'),where('score','>',score)));
  return c.data().count+1;
}
// 기록 올리기. 이미 더 좋은 기록이 있으면 그대로 두고 순위만 알려줌
async function uploadScore(rec,name){
  const sc=scoreOf(rec), old=await fetchMine();
  if(old&&old.score>=sc) return {kept:true, rank:await rankOf(old.score), old};
  const data={name, win:!!rec.win, days:rec.days, money:Math.round(rec.money), score:sc, at:ON.F.serverTimestamp(), ver:GAME_VER};
  await ON.F.setDoc(ON.F.doc(ON.db,'scores',ON.user.uid),data); ON.mine={...data};
  return {kept:false, rank:await rankOf(sc)};
}

/* ---------- 다른 기기에서 이어하기 (클라우드 저장) ---------- */
// 아침·저녁 결산 때만 올림 (save.js가 부름). 너무 자주 쓰지 않게 1초 모아서 한 번
let cloudTimer=null;
function cloudSaveSoon(){
  if(!ON.ready||!ON.user||!S) return;
  clearTimeout(cloudTimer); cloudTimer=setTimeout(()=>{
    if(!S) return;
    ON.F.setDoc(ON.F.doc(ON.db,'saves',ON.user.uid),{data:JSON.stringify(S),day:S.day,savedAt:S.savedAt||0}).catch(()=>{});
  },1000);
}
function cloudClear(){ if(ON.ready&&ON.user) ON.F.deleteDoc(ON.F.doc(ON.db,'saves',ON.user.uid)).catch(()=>{}); }
// 로그인하면: 클라우드 저장이 이 기기 저장보다 새거면 가져옴
async function cloudPull(){
  try{
    const s=await ON.F.getDoc(ON.F.doc(ON.db,'saves',ON.user.uid)); if(!s.exists()) return;
    const c=s.data(), local=loadSave();
    if(!local||(c.savedAt||0)>(local.savedAt||0)) localStorage.setItem(SAVE_KEY,c.data);
  }catch(e){}
}

/* ---------- 닉네임 정하기 (처음 올릴 때 한 번) ---------- */
function askName(){
  return new Promise(res=>{
    const d=document.createElement('div'); d.className='promo-ov';
    d.innerHTML=`<div class="promo-card"><div class="ph" style="font-size:24px">닉네임 정하기</div>
      <div class="ps">랭킹에 보일 이름이에요 (1~12자). 실명 대신 별명을 추천해요</div>
      <input id="nick" class="nick" maxlength="12" value="${myName().replace(/"/g,'')}" placeholder="예: 동키개미">
      <div class="btns" style="width:100%"><button class="btn sec" id="nc" style="font-size:18px">취소</button><button class="btn" id="nk" style="font-size:18px">확인</button></div></div>`;
    document.body.appendChild(d);
    const inp=d.querySelector('#nick'); inp.focus();
    d.querySelector('#nc').onclick=()=>{ d.remove(); res(null); };
    d.querySelector('#nk').onclick=()=>{ const v=inp.value.trim().slice(0,12); if(!v){ inp.focus(); beep(200,.08); return; }
      try{ localStorage.setItem('omz_name',v); }catch(e){} d.remove(); res(v); };
  });
}

/* ---------- 종료 화면의 [온라인 랭킹에 올리기] ---------- */
async function shareScore(rec,btn,out){
  btn.disabled=true; out.textContent='연결하는 중…';
  if(!await onlineInit()){ out.textContent='온라인에 연결할 수 없어요. 게임 사이트(one-more-zero.web.app)에서 열어 주세요'; btn.disabled=false; return; }
  if(!ON.user){ out.textContent='Google 로그인 창을 확인해 주세요'; if(!await onlineLogin()){ out.textContent='로그인하지 않았어요'; btn.disabled=false; return; } }
  let name=myName(); if(!name) name=await askName(); if(!name){ out.textContent=''; btn.disabled=false; return; }
  out.textContent='올리는 중…';
  try{ const r=await uploadScore(rec,name);
    out.innerHTML=r.kept?`이전 최고 기록이 더 좋아서 그대로 뒀어요 · <b>전체 ${r.rank}위</b>`:`${ic('trophy')} <b>전체 ${r.rank}위</b>로 올라갔어요!`;
    btn.textContent='올림 완료'; beep(1046,.1); setTimeout(()=>beep(1568,.2),120);
  }catch(e){ out.textContent='올리지 못했어요 ('+(e.code||e.message||'오류')+')'; btn.disabled=false; }
}
