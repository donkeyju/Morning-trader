/* =========================================================
   도트 아이콘 — 게임 안의 이모지를 전부 이걸로 바꿈 (v0.6.6)
   · 작은 아이콘: 16x16 칸 (체크 표시 같은 건 8x8)
   · 승진 팝업 그림: 32x32 칸 (P_로 시작)
   만드는 법: 칸에 도형을 칠함 → 바깥 테두리(검정)를 자동으로 붙임
            → 위·왼쪽이 빈 칸은 밝게, 아래·오른쪽이 빈 칸은 어둡게 (통통한 느낌)
   쓰는 법:  HTML 안에 ic('stock') 또는 ic('P_box',128) 를 넣기만 하면 됨.
            화면에 <canvas class="pi"> 가 생기면 맨 아래 감시자가 알아서 그려 줌
   ========================================================= */
const ICON_COL={k:'#0d0b18',w:'#f4ecd8',W:'#ffffff',x:'#c9c2d8',s:'#a79fc4',S:'#6b6390',p:'#3a3260',c:'#152431',
  r:'#ff5a5f',R:'#c23b45',a:'#ff8fb8',o:'#ff9f43',O:'#c26a1e',g:'#ffd166',G:'#d48a2c',y:'#fff1b0',
  b:'#4ea8ff',B:'#2f6fb8',m:'#5ad19a',M:'#2f8a63',e:'#1f3b2c',n:'#9a6630',N:'#5e3b17',t:'#e0b878',T:'#b8864a',z:'#f2c29b'};

/* ---------- 칠하기 도구 ---------- */
function iconGrid(n=16){ return Array.from({length:n},()=>Array(n).fill('.')); }
const inG=(g,i,j)=>j>=0&&j<g.length&&i>=0&&i<g.length;
function iRect(g,x,y,w,h,c){ for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++) if(inG(g,i,j)) g[j][i]=c; }   // 사각형
function iPx(g,pts,c){ pts.forEach(([x,y])=>iRect(g,x,y,1,1,c)); }                                       // 점 여러 개
function iDisc(g,cx,cy,r,c){ for(let j=0;j<g.length;j++)for(let i=0;i<g.length;i++) if((i+.5-cx)**2+(j+.5-cy)**2<=r*r) g[j][i]=c; }  // 원
function iLine(g,x0,y0,x1,y1,c,t=1){ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;               // 선 (굵기 t)
  for(let k=0;k<=n;k++) iRect(g,Math.round(x0+(x1-x0)*k/n),Math.round(y0+(y1-y0)*k/n),t,t,c); }
function iPoly(g,pts,c){ for(let j=0;j<g.length;j++)for(let i=0;i<g.length;i++){ const x=i+.5,y=j+.5; let inside=false;   // 다각형 (꼭짓점 목록)
  for(let a=0,b=pts.length-1;a<pts.length;b=a++){ const [xa,ya]=pts[a],[xb,yb]=pts[b];
    if((ya>y)!==(yb>y)&&x<(xb-xa)*(y-ya)/(yb-ya)+xa) inside=!inside; } if(inside) g[j][i]=c; } }
// 칠한 칸 바로 바깥 빈칸에 검은 테두리
function iOutline(g){
  const o=g.map(r=>r.slice()), on=(i,j)=>inG(g,i,j)&&g[j][i]!=='.'&&g[j][i]!=='k';
  for(let j=0;j<g.length;j++)for(let i=0;i<g.length;i++) if(g[j][i]==='.'&&(on(i+1,j)||on(i-1,j)||on(i,j+1)||on(i,j-1))) o[j][i]='k';
  return o;
}
function iMix(hex,toWhite,a){ const n=parseInt(hex.slice(1),16), T=toWhite?255:0;   // 색을 밝게/어둡게
  return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(v+(T-v)*a).toString(16).padStart(2,'0')).join(''); }

/* ---------- 아이콘 모양 ---------- */
const ICONS={
  /* 행동 (오늘 뭐 할까 카드) */
  stock(){ const g=iconGrid();
    iRect(g,1,2,14,10,'S'); iRect(g,2,3,12,8,'c');                          // 모니터 테두리, 화면
    iRect(g,3,8,2,2,'r'); iRect(g,6,6,2,3,'b'); iRect(g,9,5,2,3,'r');       // 캔들 (빨강 = 오름, 파랑 = 내림)
    iRect(g,11,4,2,1,'r'); iRect(g,12,3,1,1,'r');
    iRect(g,7,12,2,2,'S'); iRect(g,5,13,6,1,'S');                            // 받침대
    return iOutline(g); },
  job(){ const g=iconGrid();
    iRect(g,2,1,12,2,'o');                                                   // 간판
    for(let x=1;x<15;x++) iRect(g,x,3,1,2,(x>>1)%2?'w':'m');                 // 줄무늬 차양
    iRect(g,2,5,12,9,'w'); for(let x=1;x<15;x+=2) iRect(g,x,5,1,1,'m');
    iRect(g,3,7,5,4,'b'); iRect(g,4,7,1,1,'W');                              // 유리창
    iRect(g,9,7,4,7,'s'); iRect(g,12,10,1,1,'k');                            // 문
    return iOutline(g); },
  realty(){ const g=iconGrid();
    for(let i=0;i<5;i++) iRect(g,5-i,2+i,2+i*2,1,'r');                       // 지붕
    iRect(g,2,7,7,6,'w'); iRect(g,4,9,2,4,'n'); iRect(g,7,8,1,2,'b');
    iDisc(g,11,10,3,'g'); iDisc(g,11,10,1.9,'b'); iRect(g,10,9,1,1,'W');     // 돋보기
    iPx(g,[[13,12],[13,13],[14,13],[14,14]],'N');
    return iOutline(g); },
  house(){ const g=iconGrid();                                               // 그냥 집 (내 자산, 집 N채)
    iPoly(g,[[8,1],[1,8],[15,8]],'r'); iRect(g,3,8,10,6,'w');
    iRect(g,7,10,2,4,'n'); iRect(g,4,9,2,2,'b'); iRect(g,10,9,2,2,'b'); iRect(g,11,2,2,4,'S');
    return iOutline(g); },

  /* 주식 */
  up(){ const g=iconGrid();                                                  // 오른다 (빨강 지그재그 화살표)
    iLine(g,1,12,5,8,'r',2); iLine(g,5,8,8,10,'r',2); iLine(g,8,10,12,5,'r',2);
    iRect(g,9,2,5,2,'r'); iRect(g,12,2,2,5,'r'); return iOutline(g); },
  down(){ const g=iconGrid();                                                // 내린다 (파랑)
    iLine(g,1,3,5,7,'b',2); iLine(g,5,7,8,5,'b',2); iLine(g,8,5,12,10,'b',2);
    iRect(g,9,12,5,2,'b'); iRect(g,12,9,2,5,'b'); return iOutline(g); },
  report(){ const g=iconGrid();                                              // 막대 그래프
    iRect(g,2,9,3,5,'b'); iRect(g,6,5,3,9,'r'); iRect(g,10,2,3,12,'m'); iRect(g,1,14,14,1,'s'); return iOutline(g); },
  ant(){ const g=iconGrid();                                                 // 개미
    iLine(g,7,9,5,13,'N'); iLine(g,8,9,9,13,'N'); iLine(g,9,9,12,12,'N');   // 다리
    iDisc(g,4,8,3,'n'); iDisc(g,8,8,1.8,'n'); iDisc(g,12,7,2.3,'n');        // 배, 가슴, 머리
    iLine(g,12,5,13,2,'N'); iLine(g,13,5,15,3,'N'); iRect(g,13,6,1,1,'W');  // 더듬이, 눈
    return iOutline(g); },
  superant(){ const g=iconGrid();                                            // 슈퍼개미 (빨간 망토)
    iPoly(g,[[7,6],[10,7],[3,14],[0,11]],'r');
    iLine(g,7,9,5,13,'N'); iLine(g,9,9,12,12,'N');
    iDisc(g,4,8,2.6,'n'); iDisc(g,8,8,1.8,'n'); iDisc(g,12,7,2.3,'n');
    iLine(g,12,5,13,2,'N'); iLine(g,13,5,15,3,'N'); iRect(g,12,6,2,1,'g'); // 금색 가면
    return iOutline(g); },

  /* 편의점 단계 */
  register(){ const g=iconGrid();                                            // 계산대 (금전등록기 + 영수증)
    iRect(g,3,2,3,5,'w'); iPx(g,[[4,3],[4,5]],'x');                          // 영수증
    iRect(g,9,2,5,3,'c'); iPx(g,[[10,3],[12,3]],'m'); iRect(g,11,5,1,2,'S'); // 화면
    iRect(g,1,7,14,7,'s'); iRect(g,1,12,14,2,'S');                           // 몸통, 서랍
    iPx(g,[[3,9],[5,9],[7,9],[3,11],[5,11],[7,11]],'W'); iRect(g,10,9,3,2,'g');
    return iOutline(g); },
  box(){ const g=iconGrid();                                                 // 택배 상자
    iRect(g,2,4,12,10,'t'); iRect(g,2,4,12,2,'T'); iRect(g,7,4,2,10,'y');
    iRect(g,10,9,3,2,'w'); iPx(g,[[3,12],[4,12]],'T'); return iOutline(g); },
  tie(){ const g=iconGrid();                                                 // 셔츠 + 넥타이 + 이름표
    iRect(g,2,3,12,12,'w'); iPoly(g,[[4,3],[8,3],[6,7]],'x'); iPoly(g,[[8,3],[12,3],[10,7]],'x');
    iRect(g,7,4,2,2,'r'); iRect(g,7,6,2,1,'r'); iRect(g,6,7,4,5,'r'); iRect(g,7,12,2,1,'r');
    iPx(g,[[6,8],[7,9],[8,10],[9,11]],'R'); iRect(g,11,9,2,2,'g'); return iOutline(g); },
  key(){ const g=iconGrid();                                                 // 가게 열쇠 (인수 제안)
    iDisc(g,4.5,7.5,3.6,'g'); iDisc(g,4.5,7.5,1.5,'.'); iRect(g,7,7,8,2,'g'); iRect(g,11,9,1,2,'g'); iRect(g,13,9,1,3,'g');
    return iOutline(g); },

  /* 하루·기타 */
  ticket(){ const g=iconGrid();                                              // 복권
    iRect(g,1,4,14,8,'g'); iPx(g,[[1,7],[1,8],[14,7],[14,8]],'.');
    for(let y=5;y<11;y+=2) iRect(g,10,y,1,1,'G'); iPoly(g,[[5,5],[6,7],[8,7],[6.5,8.5],[7,11],[5,9.5],[3,11],[3.5,8.5],[2,7],[4,7]],'r');
    return iOutline(g); },
  lock(){ const g=iconGrid();                                                // 자물쇠
    iRect(g,5,2,6,1,'s'); iRect(g,4,3,1,4,'s'); iRect(g,11,3,1,4,'s');
    iRect(g,3,7,10,7,'g'); iRect(g,7,9,2,2,'N'); iRect(g,7,11,2,1,'N'); return iOutline(g); },
  party(){ const g=iconGrid();                                               // 축하 폭죽
    iPoly(g,[[1,15],[4,6],[10,12]],'o'); iLine(g,3,11,6,13,'y'); iLine(g,3,9,8,12,'y');
    iPx(g,[[9,2],[13,4],[12,8],[6,3],[14,11]],'r'); iPx(g,[[11,1],[8,5],[14,7]],'b'); iPx(g,[[10,4],[12,11],[7,1]],'m'); iPx(g,[[13,2],[10,7]],'g');
    return iOutline(g); },
  coffee(){ const g=iconGrid();                                              // 쉬는 날 커피
    iPx(g,[[5,1],[6,2],[5,3],[8,1],[9,2],[8,3]],'x');
    iRect(g,3,5,9,8,'w'); iRect(g,4,5,7,1,'n'); iRect(g,12,6,2,1,'w'); iRect(g,13,7,1,3,'w'); iRect(g,12,10,2,1,'w');
    iRect(g,1,13,14,1,'s'); return iOutline(g); },
  warn(){ const g=iconGrid();                                                // 경고
    iPoly(g,[[8,0.5],[0.5,14.5],[15.5,14.5]],'g'); iRect(g,7,5,2,5,'k'); iRect(g,7,11,2,2,'k'); return iOutline(g); },
  trophy(){ const g=iconGrid();                                              // 트로피
    iRect(g,4,2,8,6,'g'); iRect(g,5,8,6,1,'g'); iRect(g,1,3,3,1,'g'); iRect(g,1,3,1,3,'g'); iRect(g,2,6,2,1,'g');
    iRect(g,12,3,3,1,'g'); iRect(g,14,3,1,3,'g'); iRect(g,12,6,2,1,'g');
    iRect(g,7,9,2,2,'G'); iRect(g,5,11,6,2,'G'); iRect(g,4,13,8,1,'n'); iRect(g,6,3,1,3,'y'); return iOutline(g); },
  smile(){ const g=iconGrid();                                               // 손님 웃음
    iDisc(g,8,8,6.5,'g'); iRect(g,5,5,2,2,'k'); iRect(g,9,5,2,2,'k');
    iPx(g,[[4,9],[5,10],[6,11],[7,11],[8,11],[9,11],[10,10],[11,9]],'k'); iPx(g,[[3,8],[12,8]],'a'); return iOutline(g); },
  pin(){ const g=iconGrid();                                                 // 압정 (동네 소식)
    iLine(g,7,9,3,14,'s'); iRect(g,6,7,6,2,'R'); iDisc(g,10,5,3.4,'r'); iRect(g,9,3,1,1,'W'); return iOutline(g); },

  /* 물류 진열대 */
  drink(){ const g=iconGrid();                                               // 음료 컵
    for(let j=5;j<15;j++){ const d=Math.floor((j-5)/4); iRect(g,4+d,j,8-2*d,1,'r'); }
    iRect(g,5,8,6,2,'w'); iRect(g,3,4,10,1,'w'); iLine(g,9,3,12,0,'w'); return iOutline(g); },
  cookie(){ const g=iconGrid();                                              // 과자
    iDisc(g,8,8,6.4,'t'); iPx(g,[[5,5],[9,4],[11,8],[6,9],[8,12],[4,11],[11,11]],'N'); return iOutline(g); },
  onigiri(){ const g=iconGrid();                                             // 삼각김밥 (즉석식품)
    for(let i=0;i<10;i++) iRect(g,7-Math.floor(i*.7),2+i,2+Math.floor(i*.7)*2,1,'w'); iRect(g,1,12,14,2,'w');
    iRect(g,5,9,6,5,'e'); iRect(g,6,10,4,2,'r'); return iOutline(g); },
  trash(){ const g=iconGrid();                                               // 폐기 (휴지통)
    iRect(g,6,1,4,1,'s'); iRect(g,2,2,12,2,'s'); iRect(g,3,4,10,10,'S'); for(let x=5;x<12;x+=3) iRect(g,x,6,1,6,'p');
    return iOutline(g); },

  /* 점장 발주 상품군 — 글자 없이 그림만 봐도 알게 */
  ice(){ const g=iconGrid();                                                 // 아이스크림·음료: 콘 아이스크림
    iPoly(g,[[4,8],[12,8],[8,15.5]],'t'); iPx(g,[[6,9],[8,9],[10,9],[7,11],[9,11],[8,13]],'T');
    iDisc(g,8,6,4,'a'); iDisc(g,5.5,4.5,1.6,'W'); iPx(g,[[5,9],[11,9]],'a'); iRect(g,8,1,1,1,'r'); return iOutline(g); },
  hot(){ const g=iconGrid();                                                 // 따뜻한 즉석식품: 김 나는 컵라면
    iPx(g,[[4,0],[5,1],[4,2],[8,0],[9,1],[8,2],[12,0],[11,1],[12,2]],'x');
    iRect(g,3,4,10,2,'y'); iPx(g,[[4,4],[6,5],[9,4],[11,5]],'g');           // 면
    for(let j=6;j<15;j++){ const d=Math.floor((j-6)/4); iRect(g,2+d,j,12-2*d,1,'w'); }
    iRect(g,3,8,10,2,'r'); iRect(g,2,6,12,1,'o'); return iOutline(g); },
  health(){ const g=iconGrid();                                              // 위생·건강용품: 구급상자
    iRect(g,6,2,4,1,'s'); iRect(g,5,3,1,2,'s'); iRect(g,10,3,1,2,'s');
    iRect(g,1,5,14,9,'w'); iRect(g,7,6,2,7,'r'); iRect(g,4,8,8,3,'r'); return iOutline(g); },
  snack(){ const g=iconGrid();                                               // 과자·맥주: 과자 봉지 + 맥주 캔
    iRect(g,1,3,7,11,'r'); iPx(g,[[1,2],[3,2],[5,2],[7,2]],'R'); iDisc(g,4.5,8.5,2,'g'); iRect(g,2,4,5,1,'y');
    iRect(g,9,5,6,9,'g'); iRect(g,9,4,6,1,'x'); iRect(g,9,8,6,2,'B'); iRect(g,10,5,1,3,'y'); return iOutline(g); },

  /* 8x8 작은 표시 (✅⬜ 진행, 발주 결과) */
  chk(){ const g=iconGrid(8); iRect(g,0,0,8,8,'k'); iRect(g,1,1,6,6,'m'); iPx(g,[[1,4],[2,4],[2,5],[3,5],[3,6],[4,5],[4,4],[5,4],[5,3],[6,3],[6,2]],'W'); return g; },
  emp(){ const g=iconGrid(8); iRect(g,0,0,8,8,'k'); iRect(g,1,1,6,6,'S'); iRect(g,1,1,6,1,'s'); return g; },
  half(){ const g=iconGrid(8); iPoly(g,[[4,0],[8,4],[4,8],[0,4]],'k'); iPoly(g,[[4,1.2],[6.8,4],[4,6.8],[1.2,4]],'o'); return g; },
  xmark(){ const g=iconGrid(8); iLine(g,0,0,6,6,'k',2); iLine(g,6,0,0,6,'k',2); iLine(g,1,1,6,6,'r'); iLine(g,6,1,1,6,'r'); return g; },

  fund(){ const g=iconGrid();                                                // 펀드 (서류가방 + 오르는 그래프)
    iRect(g,6,2,4,1,'N'); iRect(g,5,3,1,2,'N'); iRect(g,10,3,1,2,'N');
    iRect(g,1,5,14,9,'n'); iRect(g,1,8,14,1,'N'); iRect(g,7,8,2,2,'g');
    iLine(g,3,12,6,10,'m'); iLine(g,6,10,9,11,'m'); iLine(g,9,11,12,6,'m'); return iOutline(g); },

  /* ---------- 승진 팝업용 큰 그림 (32x32) ---------- */
  P_owner(){ const g=iconGrid(32);                                           // 사장 취임: 가게 + OPEN 간판 + 꽃가루
    iRect(g,3,8,26,4,'o'); for(let x=2;x<30;x++) iRect(g,x,12,1,4,(x>>1)%2?'w':'m');
    iRect(g,3,16,26,13,'w'); iRect(g,5,18,10,8,'b'); iRect(g,6,18,3,1,'W'); iRect(g,18,18,9,11,'s'); iRect(g,25,23,1,2,'k');
    iRect(g,8,3,16,4,'r'); iPx(g,[[10,4],[10,5],[11,4],[11,5],[13,4],[13,5],[14,4],[16,4],[16,5],[17,4],[19,4],[19,5],[20,5],[21,4],[21,5]],'W');   // OPEN 느낌 글씨
    iLine(g,11,7,13,8,'S'); iLine(g,21,7,19,8,'S');
    iPx(g,[[1,2],[5,1],[27,2],[30,5],[1,6],[29,9]],'g'); iPx(g,[[3,4],[26,0],[31,1]],'a'); iPx(g,[[0,9],[28,6]],'b');
    return iOutline(g); },
  P_fund(){ const g=iconGrid(32);                                            // 펀드 운용 제안: 서류가방 + 오르는 그래프 + 동전
    iRect(g,11,5,10,2,'N'); iRect(g,9,7,2,4,'N'); iRect(g,21,7,2,4,'N');
    iRect(g,2,11,28,17,'n'); iRect(g,2,17,28,2,'N'); iRect(g,14,16,4,4,'g'); iRect(g,15,17,2,1,'y');
    iLine(g,5,25,10,21,'m',2); iLine(g,10,21,15,23,'m',2); iLine(g,15,23,24,13,'m',2); iRect(g,22,11,5,2,'m'); iRect(g,25,11,2,5,'m');
    iDisc(g,27,27,3.6,'g'); iRect(g,26,25,2,4,'G'); iDisc(g,5,5,2.6,'g'); iRect(g,4,4,2,2,'y');
    return iOutline(g); },
  P_register(){ const g=iconGrid(32);                                        // 계산 알바 → (시작 단계라 팝업엔 안 나오지만 리포트용)
    iRect(g,5,3,7,12,'w'); for(let y=5;y<13;y+=2) iRect(g,7,y,3,1,'x');      // 영수증
    iRect(g,17,3,12,7,'S'); iRect(g,18,4,10,5,'c'); iPx(g,[[19,6],[20,6],[22,6],[24,6],[25,6]],'m'); iRect(g,22,10,2,4,'S');
    iRect(g,2,14,28,14,'s'); iRect(g,2,24,28,4,'S'); iRect(g,12,25,8,1,'p');
    for(let r=0;r<3;r++)for(let c=0;c<4;c++) iRect(g,5+c*4,16+r*3,3,2,'W');
    iRect(g,22,16,6,6,'g'); iRect(g,23,17,2,2,'y');
    return iOutline(g); },
  P_box(){ const g=iconGrid(32);                                             // 물류 담당자: 손수레 위 상자 3개
    iRect(g,4,2,2,26,'S'); iRect(g,2,2,4,2,'S');                             // 손잡이
    iRect(g,6,24,22,2,'S'); iDisc(g,9,28.5,2.6,'p'); iDisc(g,24,28.5,2.6,'p'); iDisc(g,9,28.5,1,'s'); iDisc(g,24,28.5,1,'s');
    const box=(x,y,w,h)=>{ iRect(g,x,y,w,h,'t'); iRect(g,x,y,w,2,'T'); iRect(g,x+(w>>1)-1,y,2,h,'y'); iRect(g,x+w-5,y+h-4,3,2,'w'); };
    box(7,14,20,10); box(9,4,15,10); iRect(g,7,13,20,1,'k'); return iOutline(g); },
  P_tie(){ const g=iconGrid(32);                                             // 점장: 셔츠·넥타이·금색 이름표
    iRect(g,3,6,26,24,'w'); iRect(g,0,10,4,20,'b'); iRect(g,28,10,4,20,'b');
    iPoly(g,[[8,6],[16,6],[12,14]],'x'); iPoly(g,[[16,6],[24,6],[20,14]],'x');
    iRect(g,14,7,4,4,'r'); iPoly(g,[[14,11],[18,11],[20,24],[16,28],[12,24]],'r');
    for(let k=0;k<2;k++) iLine(g,14,17+k*5,18,15+k*5,'R');
    iRect(g,21,17,6,4,'g'); iRect(g,22,18,4,1,'G'); iRect(g,22,20,3,0,'G');
    iPx(g,[[24,14],[24,15],[23,15],[25,15]],'y'); return iOutline(g); },
  P_key(){ const g=iconGrid(32);                                             // 인수 제안: 가게 + 큰 열쇠
    iRect(g,2,4,20,3,'o'); for(let x=1;x<23;x++) iRect(g,x,7,1,3,(x>>1)%2?'w':'m');
    iRect(g,2,10,20,12,'w'); iRect(g,4,12,8,6,'b'); iRect(g,5,12,2,1,'W'); iRect(g,14,12,6,10,'s');
    iDisc(g,22,22,5,'g'); iDisc(g,22,22,2.2,'.'); iLine(g,18,26,9,31,'g',3);
    iRect(g,10,28,2,3,'g'); iRect(g,13,27,2,3,'g'); iPx(g,[[25,18],[26,19]],'y'); return iOutline(g); },
  P_superant(){ const g=iconGrid(32);                                        // 슈퍼개미: 망토 휘날리는 개미
    iPoly(g,[[18,11],[19,15],[10,13],[0,12],[2,8],[0,3],[9,7]],'r'); iPoly(g,[[17,12],[17,14],[9,11],[3,9],[9,9]],'R');
    iLine(g,15,18,11,26,'N',2); iLine(g,17,18,19,26,'N',2); iLine(g,18,17,25,24,'N',2);
    iDisc(g,9,16,5.5,'n'); iDisc(g,16,16,3.4,'n'); iDisc(g,24,13,4.6,'n');
    iRect(g,21,11,7,2,'g'); iRect(g,25,11,2,1,'W');                         // 금색 가면, 눈
    iLine(g,24,8,26,2,'N'); iLine(g,26,9,30,4,'N'); iDisc(g,26,2,1.2,'g'); iDisc(g,30,4,1.2,'g');
    iPx(g,[[3,4],[2,5],[4,5],[3,6],[29,24],[28,25],[30,25],[29,26]],'y');   // 반짝
    return iOutline(g); },
};

/* ---------- 그리기 ---------- */
// 캔버스에 아이콘 그리기 (캔버스 크기는 칸 수 × 4 로 맞춰서 화면에서 선명하게)
function drawPixIcon(cv,kind){
  const f=ICONS[kind]; if(!f) return;
  const g=f(), N=g.length, px=4; cv.width=cv.height=N*px;
  const ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=false;
  const empty=(i,j)=>!inG(g,i,j)||g[j][i]==='.'||g[j][i]==='k';
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){ const c=g[j][i]; if(c==='.')continue; let col=ICON_COL[c];
    if(c!=='k'&&N>8){ if(empty(i,j-1)||empty(i-1,j)) col=iMix(col,true,.28); else if(empty(i,j+1)||empty(i+1,j)) col=iMix(col,false,.25); }
    ctx.fillStyle=col; ctx.fillRect(i*px,j*px,px,px); }
  cv.dataset.done='1';
}
// HTML 안에 넣을 아이콘. size = 화면에 보이는 크기(px). 16칸 아이콘은 16·32·48, 8칸은 16, 32칸은 128 추천
function ic(kind,size=16){ return `<canvas class="pi" data-ic="${kind}" style="width:${size}px;height:${size}px"></canvas>`; }
// 아직 안 그린 아이콘 캔버스를 모두 그리기
function paintIcons(root=document){ root.querySelectorAll('canvas.pi:not([data-done])').forEach(cv=>drawPixIcon(cv,cv.dataset.ic)); }
// 화면에 새 아이콘이 생기면 자동으로 그림 (화면 함수마다 따로 부를 필요 없음)
new MutationObserver(()=>paintIcons()).observe(document.documentElement,{childList:true,subtree:true});
