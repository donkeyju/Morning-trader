# CLAUDE.md — 모닝 트레이더 작업 안내서

이 파일은 새 대화를 시작한 Claude가 프로젝트를 바로 이어갈 수 있게 쓴 안내서예요.
**작업을 시작하기 전에 끝까지 읽어주세요.** 사용자와 정한 결정, 숫자의 이유, 작업 규칙이 다 여기 있어요.

## 사용자와 대화 방식
- 사용자는 **한국어**로 대화하고, 코드 설명은 **초보자도 이해할 수 있게** 해달라고 했어요.
- 사용자는 모바일 앱으로 대화하는 경우가 많아요. 답은 짧게, 결론 먼저.
- 기획은 대화로 하나씩 정하는 걸 좋아해요. 큰 변경은 제안 → 확인 → 구현 순서로.
- 피드백은 직접 플레이해보고 줘요("주식으로 다 잃었어", "집이 안 팔려" 등). 감 대신 **시뮬레이션 숫자**로 답하면 좋아해요.

## 게임 한 줄 요약
매일 아침 가상 뉴스 5개를 읽고, 오늘 **한 가지**(📈 주식장 / 🏠 임장 / 🧾 편의점 알바)를 골라
**30일 안에 순자산 1,000만 원 → 1억**을 만드는 도트 스타일 모바일 투자 게임 (PoC).

## 파일 구조
빌드 도구 없이 브라우저에서 바로 돌아가요. 모든 함수와 상수는 **전역**이라 파일끼리 그냥 서로 불러 써요.
`index.html`의 `<script>` **순서가 중요해요**: data → core → realty → stock → job → day (day.js 마지막 줄에서 게임 시작).

| 파일 | 내용 | 주요 함수·상수 |
|---|---|---|
| `index.html` | 뼈대, 폰트, 스크립트 불러오기 | |
| `css/style.css` | 모든 스타일. 색은 맨 위 `:root` 변수 | |
| `js/data.js` | **밸런스 숫자와 데이터 대부분** | `START_MONEY` `GOAL` `DAYS` `STOCK_TREND` `STOCK_NOISE` `FEE` `LOAN_SPREAD` `RE_TAX` `CONTRACT_DAYS` `STOCKS` `VOL` `UNLOCK_RE` `UNLOCK_DAY` `REG` `TYPES` `SIZES` `LOC_W` `MAP_R` `feat*()` `STOCK_NEWS` `REALTY_NEWS` `CRASH_NEWS` `MOODS` `BREAKING` |
| `js/core.js` | 랜덤, 숫자 표시, 효과음, 게임 상태, 도트 주인공·사무실 | `mulberry32` `dayRng` `won` `pct` `beep` `newRun`(상태 S 초기화) `saveRate` `loanRate` `mktRent` `findP` `sellP` `netWorth` `hud` `animate` `startScene` `SPR` |
| `js/realty.js` | 부동산 전부 | `genListing` `startMap` `drawIcon` `startInterior` `locHTML` `FEATS` `featHTML` `screenListings`(임장 날) `screenAssets`(내 자산) `screenVisit` `buyHTML` `bindBuy` |
| `js/stock.js` | 주식장 | `screenPick`(금액·종목) `screenTrade` `runTicks`(가격 움직임) `doBuy` `doSell` `drawChart` `endTrade` |
| `js/job.js` | 편의점 알바 | `ITEMS` `MONEY` `jobPay` `screenJob` `runJob` `startShop` |
| `js/day.js` | 하루 흐름 | `screenTitle` `startDay`(분위기·뉴스·매물 생성) `screenNews` `screenHub`(오늘 뭐 할까) `LOTTO_*` `finishDay`(저녁 결산) `screenDayEnd`(마감 팝업) `screenEnd` `reportHTML` `drawReport` |
| `tools/balance-bot.js` | 밸런스 봇 (게임 함수를 써서 30일 자동 플레이) | `runBot("skilled"/"average", 판수)` |
| `tools/run-balance.py` | 봇 실행기 | |
| `tools/smoke-test.py` | 전체 흐름 자동 테스트 + 스크린샷 | |

### 상태 객체
- `S` (core.js `newRun`): 한 판 전체 상태. `day` `cash` `base`(기준금리) `prices` `props`(보유 집) `listings`(오늘 매물) `watch`(관심 매물 3일) `visits` `action`(오늘 행동) `lotto` `jobPay` `history`(하루 기록 → 종료 리포트) `reUnlocked` `hints`
- `T` (stock.js): 1분 장 진행 상태. `J` (job.js): 알바 진행 상태.
- `S.today` (day.js `startDay`): 오늘 뉴스 `items`, 섹터 영향 `eff`, 부동산 영향 `reEff` `reTypeEff` `rentEff` `rentTypeEff`, 분위기 `mood`

## 하루 흐름
`startDay` → `screenNews` → `screenHub` → (`screenPick`→`screenTrade` | `screenListings`→`screenVisit` | `screenJob`→`runJob`) → `finishDay` → `screenDayEnd` → 다음 날 `startDay`
- 안 쓴 현금은 자동 적금. 복권·내 자산·뉴스 보기는 행동을 쓰지 않음.
- `finishDay`의 하루 기록(`S.history`) 항목: stock, job, save, rent, loan, re, lotto, deal(나머지 = 집 사고판 차익·세금). 새 수입원을 넣으면 **여기와 `CAT_STYLE`(day.js), 마감 팝업 줄**에 같이 추가.

## 설계 원칙 (사용자와 합의)
1. **하루에 행동은 하나.** 신경 쓸 게 많으면 하루가 숙제가 됨 (사용자 피드백으로 v0.5에서 바꿈). 새 기능은 "탭 한 번"이거나 기존 칸을 대신하게.
2. **뉴스는 해석하기 나름이어야 재밌다.** 뉴스 추세와 랜덤 흔들림을 비슷한 크기로 유지. 뉴스를 너무 확실하게 만들지 말 것.
3. **속보는 대응 못 하면 당하는 것.** 확률 30%, 세기는 그대로.
4. **정보는 그림이 먼저.** 집 안 하자·장점은 그림으로. 다만 알아보기 어렵다는 피드백으로 힌트(기본 켬)를 같이 보여줌.
5. **도트 아트:** 데이브 더 다이버 느낌(화풍만 참고, 캐릭터·그림은 직접 제작). 과장된 코믹 리액션.
6. 회사·지역·뉴스는 모두 **가상**. 실제 기업처럼 보이는 이름 금지.

## 밸런스 목표와 현재 값
**밸런스 숫자를 바꾸면 반드시 `python tools/run-balance.py`로 다시 재고, 결과를 사용자에게 숫자로 알려줄 것.**

| 봇 | 목표 | 현재 (v0.5, 200판) |
|---|---|---|
| 완벽한 봇 (뉴스 영향을 정확히 앎) | 1억 달성 70~80% | 76%, 보통 DAY 24, 중간값 1.25억 |
| 평범한 봇 (랜덤) | 중간값 2~4천만, 1억 0% | 중간값 2,495만, 하위10% 1,690만 |

- 완벽한 봇 행동: 주식 16.5일 / 임장 8.8일 / 알바 4.7일 (세 가지를 골고루 써야 이기는 게 좋은 상태)
- 완벽한 봇 수익원: 월세 > 주식 > 매입 차익 > 집값 > 알바

### 숫자가 이렇게 된 이유 (바꾸기 전에 읽기)
- `STOCK_TREND 0.5` / `STOCK_NOISE 1.4`: v0.3에서 완벽한 봇도 1억 0%여서 올림. 둘을 같이 올려서 "해석하기 나름"은 유지.
- 가격 흔들림 식의 `.33`: 흔들림이 이전 흐름을 이어가서(z=.85z+…) 실제 크기가 약 3.5배 커지는 걸 보정한 값. 지우면 1분에 ±90%가 나옴.
- 월세 수익률(`REG.yieldT`): 사용자가 "월세가 너무 낮다"고 해서 ×1.8. 대출 70%여도 월세 > 이자.
- 팔릴 확률(`REG.liq`): "집이 안 팔린다"는 피드백으로 ×1.5, 급매 보정 ×2.0.
- 집값 뉴스 계수 `.03`(finishDay): 처음 .12였을 때 레버리지로 하루 지분 +20%가 나와서 줄임.
- 지역 기본 상승률: 서울 +0.12% / 수도권 +0.04% / 지방 −0.12% → "서울은 시세 차익, 지방은 월세" 성격.
- 대출 금리 = 기준금리 + 0.15%p: 대출 받아 적금 넣는 허점 방지.
- 알바 일당 30~100만(실력제): 고정 100만이면 알바만 해도 위험 없이 3,000만 → 초반 정답이 알바가 돼버림.
- 복권: 0.01%로 6천만만 있으면 30일 60장에도 당첨 0.6% → 등수를 4단계로 나눠 작은 당첨이 가끔 나오게.
- 부동산 해금: 순자산 3,000만 **또는** DAY 7 (사용자가 "3천만 도달이 너무 어렵다"고 해서 DAY 조건 추가).
- 매물 4개 중 최소 2개는 현재 현금으로 살 수 있게, 돈이 적으면 지방 소형 빌라를 끼워 넣음.

## 작업 규칙
1. **수정 후 확인:** `python tools/smoke-test.py` (오류 0이어야 함, 스크린샷은 `tools/shots/`, 커밋 안 함). 화면을 바꿨으면 스크린샷을 직접 보고 확인.
2. **밸런스 확인:** 결산·가격·수익 관련 숫자를 바꾸면 `python tools/run-balance.py`. 결산 식을 바꾸면 `tools/balance-bot.js`의 같은 식도 맞춰서 고칠 것.
3. 테스트 실행 환경: `pip install playwright`. 시스템 크롬을 쓰려면 `CHROME_PATH=/usr/bin/google-chrome`.
4. 랜덤은 `dayRng(salt)`(씨앗 고정)를 쓰면 같은 씨앗에서 같은 결과 → 비교 테스트 가능. salt 번호: 1 뉴스, 2 주식장, 3 저녁 결산, 5 매물, 6 복권.
5. **배포:** `main`에 push하면 GitHub Pages(https://donkeyju.github.io/Morning-trader/)에 자동 반영. 사용자가 Settings → Pages에서 직접 켜야 함(이 환경에서 Pages API는 막혀 있음).
6. 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지.
7. 기획 문서는 claude.ai 프로젝트 "모바일게임 프로젝트1"의 `기획/게임컨셉_v0.2.md`에도 있음(내용은 v0.5). 큰 결정을 하면 이 파일과 그 문서를 같이 갱신.

## 다음에 할 것 (아이디어, 미정)
- 뉴스 분류 알바 (호재/악재 넘기기 → 뉴스 읽기 연습)
- 힌트를 단계적으로 줄이는 숙련도 시스템
- 블랙먼데이 때 집값도 빠지게 해서 "언제 팔지"가 중요해지게 (지금은 집을 한 번도 안 팔아도 이김) — 단, 신경 쓸 거리 늘리지 않는 선에서
- 적금이 거의 의미 없음(30일 수십만 원) → 역할 재검토
- 금·달러 안전자산, 공모주 청약, 코인, 사업
- 온라인 랭킹 (Firebase 등 별도 서버 필요), 같은 날 같은 뉴스(씨앗 = 날짜)로 공정한 랭킹
- 앱 배포: Capacitor로 감싸기, 종목 이름 KIPRIS 상표 확인
