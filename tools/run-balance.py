"""밸런스 시뮬레이션 실행기

게임을 헤드리스 크롬으로 열고 tools/balance-bot.js 를 넣어서
'완벽한 봇'과 '평범한 봇'을 각각 여러 판 돌린 결과를 출력한다.

사용법 (저장소 루트에서):
    pip install playwright && python -m playwright install chromium
    python tools/run-balance.py            # 각 200판
    python tools/run-balance.py 100        # 각 100판

목표 (CLAUDE.md '밸런스 목표' 참고):
    완벽한 봇: 1억 달성 70~80%, 보통 DAY 22~26
    평범한 봇: 30일 뒤 중간값 2,000만~4,000만, 1억 달성 0%
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 200


async def main():
    async with async_playwright() as p:
        exe = os.environ.get("CHROME_PATH")  # 시스템 크롬을 쓰려면 경로 지정
        browser = await p.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe \
            else await p.chromium.launch()
        page = await browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("file://" + os.path.join(ROOT, "index.html"))
        await page.wait_for_timeout(300)
        await page.add_script_tag(path=os.path.join(ROOT, "tools", "balance-bot.js"))
        for strategy in ["skilled", "average"]:
            print(await page.evaluate(f'runBot("{strategy}", {RUNS})'))
        if errors:
            print("페이지 오류:", errors)
        await browser.close()


asyncio.run(main())
