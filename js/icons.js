/* =========================================================
   행동 아이콘 (16x16 도트) — 사용자가 고른 A안 "물건형"
   주식장 = 차트 모니터, 편의점 = 줄무늬 차양 가게, 임장 = 집 + 돋보기
   만드는 법: 16x16 칸에 도형을 칠함 → 바깥 테두리(검정)를 자동으로 붙임
            → 위·왼쪽이 빈 칸은 밝게, 아래·오른쪽이 빈 칸은 어둡게 (통통한 느낌)
   쓰는 법: <canvas class="pi" data-ic="stock" width="48" height="48"></canvas> 를 넣고 paintIcons(부모)
   ========================================================= */
const ICON_COL={k:'#0d0b18',w:'#f4ecd8',W:'#ffffff',r:'#ff5a5f',b:'#4ea8ff',m:'#5ad19a',o:'#ff9f43',
  s:'#a79fc4',S:'#6b6390',c:'#152431',n:'#9a6630',N:'#5e3b17',g:'#ffd166'};

function iconGrid(){ return Array.from({length:16},()=>Array(16).fill('.')); }
// 사각형 칠하기 (x, y, 너비, 높이, 색 글자)
function iRect(g,x,y,w,h,c){ for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++) if(i>=0&&i<16&&j>=0&&j<16) g[j][i]=c; }
// 원 칠하기 (중심 cx, cy, 반지름 r)
function iDisc(g,cx,cy,r,c){ for(let j=0;j<16;j++)for(let i=0;i<16;i++) if((i+.5-cx)**2+(j+.5-cy)**2<=r*r) g[j][i]=c; }
// 칠한 칸 바로 바깥 빈칸에 검은 테두리
function iOutline(g){
  const o=g.map(r=>r.slice()), on=(i,j)=>g[j]&&g[j][i]&&g[j][i]!=='.'&&g[j][i]!=='k';
  for(let j=0;j<16;j++)for(let i=0;i<16;i++) if(g[j][i]==='.'&&(on(i+1,j)||on(i-1,j)||on(i,j+1)||on(i,j-1))) o[j][i]='k';
  return o;
}
// 색을 밝게(toWhite=true) 또는 어둡게
function iMix(hex,toWhite,a){ const n=parseInt(hex.slice(1),16), T=toWhite?255:0;
  return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(v+(T-v)*a).toString(16).padStart(2,'0')).join(''); }

const ICONS={
  stock(){ const g=iconGrid();
    iRect(g,1,2,14,10,'S'); iRect(g,2,3,12,8,'c');                          // 모니터 테두리, 화면
    iRect(g,3,8,2,2,'r'); iRect(g,6,6,2,3,'b'); iRect(g,9,5,2,3,'r');       // 캔들 (빨강 = 오름, 파랑 = 내림)
    iRect(g,11,4,2,1,'r'); iRect(g,12,3,1,1,'r');                            // 오른쪽 위로 치솟는 끝
    iRect(g,7,12,2,2,'S'); iRect(g,5,13,6,1,'S');                            // 받침대
    return iOutline(g); },
  job(){ const g=iconGrid();
    iRect(g,2,1,12,2,'o');                                                   // 간판
    for(let x=1;x<15;x++) iRect(g,x,3,1,2,(x>>1)%2?'w':'m');                 // 줄무늬 차양
    iRect(g,2,5,12,9,'w'); for(let x=1;x<15;x+=2) iRect(g,x,5,1,1,'m');      // 가게 벽 + 차양 끝 물결
    iRect(g,3,7,5,4,'b'); iRect(g,4,7,1,1,'W');                              // 유리창 + 반짝
    iRect(g,9,7,4,7,'s'); iRect(g,12,10,1,1,'k');                            // 문 + 손잡이
    return iOutline(g); },
  realty(){ const g=iconGrid();
    for(let i=0;i<5;i++) iRect(g,5-i,2+i,2+i*2,1,'r');                       // 빨간 지붕 (계단식 삼각형)
    iRect(g,2,7,7,6,'w'); iRect(g,4,9,2,4,'n'); iRect(g,7,8,1,2,'b');        // 벽, 문, 창문
    iDisc(g,11,10,3,'g'); iDisc(g,11,10,1.9,'b'); iRect(g,10,9,1,1,'W');     // 돋보기 테두리, 렌즈, 반짝
    for(let k=0;k<=2;k++) iRect(g,13+Math.round(k/2),12+k,1,1,'N'); iRect(g,13,13,1,1,'N');   // 손잡이
    return iOutline(g); },
};

// 캔버스 하나에 아이콘 그리기
function drawPixIcon(cv,kind){
  const ctx=cv.getContext('2d'), g=ICONS[kind](), px=cv.width/16; ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,cv.width,cv.height);
  const empty=(i,j)=>!g[j]||!g[j][i]||g[j][i]==='.'||g[j][i]==='k';
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){ const c=g[j][i]; if(c==='.')continue; let col=ICON_COL[c];
    if(c!=='k'){ if(empty(i,j-1)||empty(i-1,j)) col=iMix(col,true,.28); else if(empty(i,j+1)||empty(i+1,j)) col=iMix(col,false,.25); }
    ctx.fillStyle=col; ctx.fillRect(i*px,j*px,px,px); }
}
// 화면 안의 <canvas class="pi" data-ic="..."> 를 모두 그리기
function paintIcons(root){ root.querySelectorAll('canvas.pi').forEach(cv=>drawPixIcon(cv,cv.dataset.ic)); }
