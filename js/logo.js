/* =========================================================
   타이틀 로고 「ONE MORE ZERO」
   10,000,000(시작 돈) 뒤에 민트색 0 하나가 톡 튀어나와 붙으면 100,000,000(목표).
   글자는 5x7 칸 도트 글꼴을 직접 그려요 (폰트 파일 없이 캔버스에 사각형만 찍음).
   ========================================================= */

// 글자 모양: '#'은 칠하는 칸, '.'은 빈칸. 한 글자 = 7줄
const LOGO_GLYPH={
 '0':['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'],
 '1':['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],
 ',':['..','..','..','..','##','##','.#'],
 ' ':['...','...','...','...','...','...','...'],
 'O':['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
 'N':['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
 'E':['#####','#....','#....','####.','#....','#....','#####'],
 'M':['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#'],
 'R':['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
 'Z':['#####','....#','...#.','..#..','.#...','#....','#####'],
};
// 위→아래 7단계 색 (줄마다 색을 바꿔서 그라데이션처럼 보이게)
const LOGO_GOLD =['#fff1b0','#ffe27a','#ffd166','#f7b94a','#eaa33a','#d48a2c','#b8722a'];
const LOGO_MINT =['#e9fff4','#bff5da','#8ee8bd','#5ad19a','#42b57f','#33996a','#2a7f58'];
const LOGO_CREAM=['#fffaf0','#f8eedb','#f3e8cf','#eadcbd','#e0d0ae','#d4c39d','#c7b48d'];

// 글자들의 전체 너비(칸 수). gap = 글자 사이 빈칸
const logoTextW=(s,gap=1)=>[...s].reduce((a,ch)=>a+LOGO_GLYPH[ch][0].length+gap,0)-gap;

// 글자 한 줄 그리기. px = 한 칸 크기, shadow = 오른쪽 아래 그림자 색. 끝난 x 위치를 돌려줌
function logoText(ctx,s,x,y,px,pal,shadow,gap=1){
  for(const ch of s){ const g=LOGO_GLYPH[ch];
    if(shadow){ ctx.fillStyle=shadow;
      g.forEach((row,r)=>[...row].forEach((c,k)=>{ if(c==='#')ctx.fillRect(x+k*px+(px>>1),y+r*px+(px>>1),px,px); })); }
    g.forEach((row,r)=>[...row].forEach((c,k)=>{ if(c==='#'){ctx.fillStyle=pal[r]; ctx.fillRect(x+k*px,y+r*px,px,px);} }));
    x+=(g[0].length+gap)*px; }
  return x;
}

// 로고 그리기. t = 시간(프레임 수) → 반짝임과 새 0의 통통 튀는 움직임에 씀
function drawLogo(cv,t=0){
  const ctx=cv.getContext('2d'),W=cv.width,H=cv.height; ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#1b1830'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.06)';                      // 은은한 도트 무늬 배경
  for(let y=0;y<H;y+=6)for(let x=(y/6%2)*3;x<W;x+=6)ctx.fillRect(x,y,1,1);

  const px=7, s='10,000,000', w=logoTextW(s)*px, extraW=6*px;
  let x=(W-w-extraW)/2|0; const y=62;
  x=logoText(ctx,s,x,y,px,LOGO_GOLD,'#0d0b18');
  // 새로 붙는 0: 살짝 위에서 통통 (2칸 정도 위아래로)
  const hop=Math.round(Math.abs(Math.sin(t/14))*2)*px*-1;
  const ex=x+px*2, ey=y-px+hop;
  logoText(ctx,'0',ex,ey,px,LOGO_MINT,'#0d0b18');
  // 반짝이 십자 두 개: 번갈아 켜졌다 꺼짐
  const spark=(cx,cy,c,on)=>{ if(!on)return; ctx.fillStyle=c; ctx.fillRect(cx-px,cy,px*3,px); ctx.fillRect(cx,cy-px,px,px*3); };
  spark(ex+6*px,ey-px,'#bff5da',(t/20|0)%2===0);
  spark(ex-px,ey-px*2,'#ffffff',(t/20|0)%2===1);

  const name='ONE MORE ZERO', p2=4, w2=logoTextW(name)*p2;
  logoText(ctx,name,(W-w2)/2|0,y+px*7+30,p2,LOGO_CREAM,'#0d0b18');
}

// 타이틀 화면에서 로고를 계속 움직이기. 화면이 바뀌어 캔버스가 사라지면 저절로 멈춤
function startLogo(cv){
  let t=0;
  const loop=()=>{ if(!cv.isConnected)return; drawLogo(cv,t++); requestAnimationFrame(loop); };
  loop();
}
