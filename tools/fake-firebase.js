/* 자동 테스트용 가짜 Firebase — 실제 서버 대신 브라우저 메모리에 저장
   online.js가 window.__FB_MOCK이 있으면 진짜 Firebase 대신 이걸 씀 (tools/online-test.py에서 사용) */
(function(){
  const store={scores:{},saves:{}}, listeners=[];
  const auth={currentUser:null};
  const snap=(id,v)=>({id,exists:()=>v!==undefined,data:()=>v&&JSON.parse(JSON.stringify(v))});
  const fire=()=>listeners.forEach(cb=>cb(auth.currentUser));
  window.__FB_STORE=store;
  window.__FB_MOCK={
    initializeApp:()=>({}), getAuth:()=>auth, getFirestore:()=>({}), getRedirectResult:async()=>null,
    onAuthStateChanged:(a,cb)=>{ listeners.push(cb); setTimeout(()=>cb(auth.currentUser),0); },
    GoogleAuthProvider:function(){}, signInWithRedirect:async()=>{},
    signInWithPopup:async()=>{ auth.currentUser={uid:window.__FB_UID||'u-test',displayName:'테스트'}; setTimeout(fire,0); return {user:auth.currentUser}; },
    signOut:async()=>{ auth.currentUser=null; setTimeout(fire,0); },
    collection:(db,name)=>({col:name,cons:[]}),
    doc:(db,col,id)=>({col,id}),
    getDoc:async r=>snap(r.id,store[r.col][r.id]),
    setDoc:async(r,d)=>{ store[r.col][r.id]=JSON.parse(JSON.stringify({...d,at:d.at==='TS'?Date.now():d.at})); },
    deleteDoc:async r=>{ delete store[r.col][r.id]; },
    serverTimestamp:()=>'TS',
    query:(c,...cons)=>({col:c.col,cons}), orderBy:(f,d)=>({t:'o',f,d}), limit:n=>({t:'l',n}), where:(f,op,v)=>({t:'w',f,op,v}),
    getDocs:async q=>{ let rows=Object.entries(store[q.col]).map(([id,v])=>({id,v}));
      for(const c of q.cons){ if(c.t==='w') rows=rows.filter(r=>c.op==='>'?r.v[c.f]>c.v:true);
        if(c.t==='o') rows.sort((a,b)=>c.d==='desc'?b.v[c.f]-a.v[c.f]:a.v[c.f]-b.v[c.f]);
        if(c.t==='l') rows=rows.slice(0,c.n); }
      return {docs:rows.map(r=>snap(r.id,r.v))}; },
    getCountFromServer:async q=>{ const r=await window.__FB_MOCK.getDocs(q); return {data:()=>({count:r.docs.length})}; },
  };
})();
