/* =========================================================
   ONE MORE ZERO — 설정값과 데이터
   1 기본 설정값 / 2 주식 종목 / 3 부동산 / 4 뉴스 (밸런스 숫자는 대부분 여기)
   (파일 구조와 규칙은 저장소의 CLAUDE.md 참고)
   ========================================================= */
/* ---------- 1. 기본 설정값 ---------- */
const START_MONEY = 10_000_000;
const GOAL = 100_000_000;
const DAYS = 30;
const TICKS = 600, TICK_MS = window.FAST_TEST ? 8 : 100;  // 1분 = 0.1초 × 600번 (FAST_TEST는 자동 테스트용 빨리감기)
const FEE = 0.0015;
const STOCK_TREND = 0.5;          // 뉴스가 만드는 1분 추세의 세기
const STOCK_NOISE = 1.4;          // 랜덤 흔들림 배율 (추세와 같이 키워서 '해석하기 나름'은 유지)                // 주식 수수료 0.15%
const LOAN_SPREAD = 0.0015;        // (기본값) 대출금리 = 기준금리 + 0.15%p
// 많이 빌릴수록 비싼 대출: 대출 비율별 가산금리 (하루 기준). 70%를 껴도 무조건 이득이 되지 않게
const LTV_SPREAD = {0:0, 0.3:0.0015, 0.5:0.0025, 0.7:0.004};
const RE_CONVERGE = 0.15;          // 산 집의 시세는 '산 가격'에서 시작해 매일 적정가 쪽으로 15%씩 다가감 (바로 차익 못 내게)
const RE_TAX = 0.01;               // 부동산 살 때·팔 때 비용 1%
const CONTRACT_DAYS = 5;           // 세입자 계약 기간

/* ---------- 2. 주식 종목 ----------
   mcap = 시장 크기. 내 주문이 이것에 비해 클수록 체결가가 밀린다(슬리피지). */
const STOCKS = [
  {k:'semi',  sec:'반도체',      name:'루미나세미콘',     code:'LUMN', v:'mid',  base:72000},
  {k:'bio',   sec:'바이오',      name:'젠타리스바이오',   code:'GNTR', v:'high', base:38000},
  {k:'build', sec:'건설',        name:'한결건설',         code:'HKCN', v:'low',  base:21000},
  {k:'ent',   sec:'엔터',        name:'스텔라웨이브',     code:'STLW', v:'mid',  base:54000},
  {k:'energy',sec:'에너지',      name:'볼테라에너지',     code:'VOLT', v:'mid',  base:46000},
  {k:'food',  sec:'식품',        name:'온담푸드',         code:'ONDM', v:'low',  base:31000},
  {k:'space', sec:'우주항공',    name:'카이로스에어로',   code:'KAIR', v:'high', base:27000},
  {k:'auto',  sec:'자동차(로봇)',name:'오토메타모빌리티', code:'ATMT', v:'mid',  base:63000},
];
const SEC_NAME = Object.fromEntries(STOCKS.map(s=>[s.k, s.sec]));
const VOL = {
  low: {n:0.06, t:0.6, label:'안정',  size:'대형주', mcap:2e9},
  mid: {n:0.11, t:1.0, label:'보통',  size:'중형주', mcap:8e8},
  high:{n:0.20, t:1.5, label:'급등락',size:'소형주', mcap:3e8},
};

/* ---------- 3. 부동산 ----------
   매물 = 지역(3) × 유형(3) × 크기(3).  가격·월세·상승률·거래량은 지도(입지)와 집 안(하자·장점)이 정한다. */
const UNLOCK_RE = 30_000_000;      // 순자산 3,000만 원 또는
const UNLOCK_DAY = 7;              // DAY 7 중 먼저 오는 쪽에 부동산 중개소 오픈
const REG = {
  //            중형 아파트 기준가 / 매일 기본 상승률 / 흔들림 / 월세 수익률(하루) / 하루에 팔릴 확률 / 시설 개수 [역,학원,상권,공원,공장]
  seoul:{name:'서울',  base:3e8,   drift:.0012, vol:.008, yieldT:{villa:.009, apt:.0072,shop:.0108}, liq:{villa:.5, apt:.85,shop:.45},
         cnt:[[1,2],[1,3],[1,3],[1,2],[0,1]], ground:'#8b8b96', bld:['#6b6b7a','#7a7a88','#5d5d6b'], density:.85},
  metro:{name:'수도권',base:1.5e8, drift:.0004, vol:.006, yieldT:{villa:.0108,apt:.009, shop:.0126}, liq:{villa:.38,apt:.65,shop:.33},
         cnt:[[0,1],[0,2],[1,2],[0,2],[0,1]], ground:'#8e9781', bld:['#7b7f72','#8a7f6e','#6e7468'], density:.5},
  local:{name:'지방',  base:6e7,   drift:-.0012,vol:.005, yieldT:{villa:.0135,apt:.0108,shop:.0162}, liq:{villa:.25,apt:.45,shop:.2 },
         cnt:[[0,1],[0,1],[0,1],[0,1],[0,2]], ground:'#7ea35d', bld:['#8a7a5e','#9a8466','#7a6b52'], density:.22},
};
const TYPES = { villa:{name:'빌라',k:.6, vac:.05}, apt:{name:'아파트',k:1, vac:.03}, shop:{name:'상가',k:.8, vac:.12} };
const SIZES = { s:{name:'소형',k:.5}, m:{name:'중형',k:1}, l:{name:'대형',k:1.8} };
const AREA  = { villa:{s:12,m:20,l:32}, apt:{s:15,m:25,l:40}, shop:{s:10,m:20,l:35} };
const CATS = ['station','academy','commerce','culture','nuisance'];
const CAT_NAME = {station:'역', academy:'학원가', commerce:'상권', culture:'공원', nuisance:'공장'};
// 유형마다 중요하게 보는 시설이 다르다 (공장은 마이너스)
const LOC_W = {
  villa:{station:.35, academy:.10, commerce:.25, culture:.15, nuisance:-.40},
  apt:  {station:.30, academy:.40, commerce:.15, culture:.25, nuisance:-.50},
  shop: {station:.30, academy:.05, commerce:.60, culture:.15, nuisance:-.30},
};
const MAP_R = 38;   // 지도에서 집 주변 "생활권" 반경 (점선 원)
// 집 안 요소가 주는 영향 (호가에는 반영 안 됨!)
const featRent  = f=>(f.sun?1.08:1)*(f.remodel?1.10:1)*(f.mold?.90:1);          // 월세
const featGrowth= f=>(f.remodel?.001:0)+(f.view?.001:0)-(f.crack?.003:0);       // 매일 상승률
const featLiq   = f=>(f.view?1.2:1)*(f.pipe?.7:1);                              // 팔릴 확률
const featVac   = f=>(f.leak?.15:0)-(f.sun?.05:0);                              // 공실 확률
const propName = p=>`${REG[p.r].name} ${SIZES[p.sz].name} ${TYPES[p.t].name}`;

/* ---------- 3-2. 편의점 커리어 / 투자자 등급 ----------
   좋은 근무(또는 좋은 장)를 need번 쌓으면 다음 단계로. 횟수는 누적(연속 아니어도 됨) */
const CAREER = [
  {title:'계산 알바',   icon:'🧾', need:4, pay:[300000, 1000000]},   // 좋은 근무: 맞힘 4명↑ & 틀림 1명↓
  {title:'물류 담당자', icon:'📦', need:3, pay:[600000, 1500000]},   // 좋은 근무: 8개↑ 처리, 정확도 80%↑, 유통기한 실수 1개↓
  {title:'점장',        icon:'👔', need:4, pay:[700000, 1600000]},   // 좋은 근무: 발주 적중 70%↑ → 다 채우면 인수 제안
];
const INV_TIERS = [
  {title:'개미',     icon:'🐜', need:4},     // 좋은 장: 그날 주식 수익이 투자금의 +5% 이상
  {title:'슈퍼개미', icon:'🦸', need:null},  // 공매도 해금. 다음 등급(전업투자자)은 다음 업데이트
];
const INV_GOOD = 0.05;
const SHORT_FEE = 0.005;   // 공매도 들어갈 때 주식 빌리는 비용 0.5% (공매도가 너무 쉬운 돈이 되지 않게)
// 점장 발주: 4가지 상품군. 뉴스의 cvs 값 + 동네 소식 + 약간의 랜덤으로 그날 수요(적게/보통/많이)가 정해짐
const CVS_CATS = [
  {k:'ice',    name:'아이스크림·음료', icon:'🍦'},
  {k:'hot',    name:'따뜻한 즉석식품', icon:'🍜'},
  {k:'health', name:'위생·건강용품',   icon:'💊'},
  {k:'snack',  name:'과자·맥주',       icon:'🍺'},
];

const NEWS_MAX_SEEN = 2;   // 같은 아침 뉴스는 한 판에 최대 2번까지
// 오늘의 분위기 (확률 %)
const MOODS = [['stock',40,'주식장'],['realty',25,'부동산장'],['mixed',25,'혼조'],['crash',10,'블랙먼데이']];

// 뉴스 데이터(STOCK_NEWS · REALTY_NEWS · CRASH_NEWS · BREAKING · LOCAL_NEWS)는 js/news.js
