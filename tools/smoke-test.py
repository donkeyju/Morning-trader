"""전체 흐름 자동 테스트 (스모크 테스트)

폰 크기 화면으로 게임을 열고 실제 버튼을 눌러가며 한 바퀴 돈다.
계산 알바 → 복권 → 주식장 → DAY 7 임장·매입 → 관심 매물 매입 → 물류 담당자 → 점장 발주 → 공매도 → 30일 종료 리포트
자바스크립트 오류가 하나라도 나면 실패로 끝난다. 스크린샷은 tools/shots/ 에 저장.

사용법 (저장소 루트에서):
    python tools/smoke-test.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "tools", "shots")
# 알바 정답 자동 입력: 거스름돈을 큰 돈부터 채워서 건네기
SOLVE = '''()=>{const c=J.cust; let w=c.paid-c.total;
  for(const m of MONEY){while(w>=m){document.querySelector(`.money button[data-m="${m}"]`).click(); w-=m;}}
  document.getElementById('give').click();}'''
# 물류 정답 자동 입력: 기한 지난 건 폐기, 나머지는 알맞은 칸
SHELF = '''()=>{const g=J.good; const k=g.expired?'trash':g.cat; document.querySelector(`.shelves button[data-s="${k}"]`).click();}'''


async def main():
    os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        exe = os.environ.get("CHROME_PATH")
        browser = await p.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe \
            else await p.chromium.launch()
        pg = await browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.add_init_script("window.FAST_TEST=true")   # 1분 장을 빨리감기
        await pg.goto("file://" + os.path.join(ROOT, "index.html"))
        await pg.wait_for_timeout(300)
        shot = lambda name: pg.screenshot(path=os.path.join(SHOTS, name), full_page=True)

        await shot("1_title.png")
        await pg.click("#go"); await pg.click("#next"); await pg.wait_for_timeout(200)
        await shot("2_hub.png")
        # DAY 1: 복권 2장 + 알바
        await pg.click("#lotto"); await pg.click("#lotto")
        await pg.click('[data-act="job"]'); await pg.click("#go")
        await pg.evaluate("window.JOB_SPEED=3")
        for _ in range(4):
            await pg.wait_for_timeout(250); await pg.evaluate(SOLVE)
        await shot("3_job.png")
        await pg.wait_for_selector("#end", timeout=20000); await pg.click("#end")
        await pg.wait_for_selector("#dayend"); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=os.path.join(SHOTS, "4_dayend.png"))
        await pg.click("#next"); await pg.wait_for_timeout(200)
        # DAY 2: 주식장
        await pg.click("#next"); await pg.click('[data-act="stock"]')
        await pg.click('#amt button[data-p="75"]'); await pg.click('.card[data-k="semi"]'); await pg.click('.card[data-k="bio"]')
        await pg.click("#next"); await pg.wait_for_timeout(2600)
        await pg.click('#ratio button[data-r="0.5"]'); await pg.click("#buy")
        await shot("5_trade.png")
        await pg.wait_for_selector("#dayend", timeout=30000); await pg.click("#next"); await pg.wait_for_timeout(200)
        # DAY 7: 임장 2곳 + 매입
        await pg.evaluate("S.day=7; startDay()"); await pg.click("#next")
        await pg.click('[data-act="realty"]'); await pg.wait_for_timeout(200)
        await pg.click("[data-visit]"); await pg.wait_for_timeout(400)
        await shot("6_visit.png")
        await pg.click("#back"); await pg.click("[data-visit]:not(.sec)"); await pg.wait_for_timeout(300); await pg.click("#back")
        await pg.evaluate("S.cash=80000000"); await pg.evaluate("screenListings()")
        await pg.click("[data-buy]:not([disabled])"); await pg.wait_for_timeout(200)
        await pg.click("#end"); await pg.wait_for_selector("#dayend"); await pg.click("#next"); await pg.wait_for_timeout(200)
        # DAY 8: 내 자산에서 관심 매물 매입(행동 소모 X) → 알바
        await pg.click("#next"); await pg.click("#assets"); await pg.wait_for_timeout(200)
        await shot("7_assets.png")
        if await pg.locator("[data-buy]:not([disabled])").count():
            await pg.click("[data-buy]:not([disabled])")
        assert await pg.evaluate("S.action") is None, "관심 매물 매입이 행동을 소모하면 안 됨"
        await pg.click("#back"); await pg.click('[data-act="job"]'); await pg.click("#go")
        await pg.evaluate("window.JOB_SPEED=30")
        await pg.wait_for_selector("#end", timeout=20000); await pg.click("#end"); await pg.wait_for_selector("#dayend")
        await pg.click("#next"); await pg.wait_for_timeout(200)
        # 물류 담당자 (단계를 직접 올려서 확인)
        await pg.evaluate("S.career={stage:1,good:2}"); await pg.click("#next")
        await pg.click('[data-act="job"]'); await pg.click("#go"); await pg.evaluate("window.JOB_SPEED=3")
        for i in range(10):
            await pg.wait_for_timeout(60); await pg.evaluate(SHELF)
        await shot("8_shelf.png")
        await pg.wait_for_selector("#end", timeout=20000); await pg.click("#end"); await pg.wait_for_selector("#dayend")
        assert await pg.evaluate("S.career.stage")==2, "물류 담당자 3번째 좋은 근무 뒤 점장 승진이 안 됨"
        # 승진하면 마감 팝업 위에 승진 알림 팝업이 뜸 → 찍고 [확인]
        await pg.wait_for_selector(".promo-ov", timeout=3000); await pg.wait_for_timeout(500); await shot("8_promo.png")
        await pg.click(".promo-ov button"); await pg.wait_for_timeout(100)
        assert not await pg.query_selector(".promo-ov"), "승진 팝업이 안 닫힘"
        await pg.click("#next"); await pg.wait_for_timeout(200)
        # 점장 발주
        await pg.click("#next"); await pg.click('[data-act="job"]'); await pg.click("#go"); await pg.wait_for_timeout(200)
        await shot("9_order.png"); await pg.click("#go"); await pg.wait_for_timeout(200)
        await pg.click("#end"); await pg.wait_for_selector("#dayend"); await pg.click("#next"); await pg.wait_for_timeout(200)
        # 슈퍼개미 공매도
        await pg.evaluate("S.inv.tier=1"); await pg.click("#next"); await pg.click('[data-act="stock"]')
        await pg.click('.card[data-k="space"]'); await pg.click('.card[data-k="food"]'); await pg.click('[data-dir="space"][data-v="-1"]')
        await pg.click("#next"); await pg.wait_for_timeout(2600); await pg.click("#buy")
        assert await pg.evaluate("T.stocks[0].dir")==-1, "공매도 방향이 반영되지 않음"
        await shot("10_short.png")
        await pg.wait_for_selector("#dayend", timeout=30000)
        # 종료 리포트
        await pg.evaluate("S.day=30"); await pg.click("#next"); await pg.wait_for_timeout(500)
        await shot("11_end.png")
        await browser.close()

    if errors:
        print("❌ 자바스크립트 오류:", errors); sys.exit(1)
    print("✅ 전체 흐름 통과 (스크린샷:", SHOTS, ")")


asyncio.run(main())
