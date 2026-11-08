"""온라인 기능 자동 테스트 (가짜 Firebase 사용 — 실제 서버에는 접속하지 않음)
   로그인 → 첫 화면 온라인 랭킹 → 1억 달성 → 닉네임 → 랭킹에 올리기 → 순위 → 다른 기기에서 이어하기
   실행: CHROME_PATH=/usr/bin/google-chrome python tools/online-test.py"""
import asyncio, os, sys
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SHOTS=os.path.join(ROOT,'tools','shots'); os.makedirs(SHOTS,exist_ok=True)
URL="file://"+os.path.join(ROOT,"index.html")

async def main():
    async with async_playwright() as p:
        exe=os.environ.get("CHROME_PATH")
        b=await (p.chromium.launch(executable_path=exe,args=["--no-sandbox"]) if exe else p.chromium.launch())
        ctx=await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2)
        await ctx.add_init_script(path=os.path.join(ROOT,'tools','fake-firebase.js'))
        await ctx.add_init_script("window.FAST_TEST=true")
        pg=await ctx.new_page(); errors=[]; pg.on("pageerror",lambda e:errors.append(str(e)))
        shot=lambda n: pg.screenshot(path=os.path.join(SHOTS,n),full_page=True)
        await pg.goto(URL); await pg.wait_for_timeout(400)
        # 다른 사람 기록 미리 넣기
        await pg.evaluate("""()=>{const s=__FB_STORE.scores;
          s.a={name:'빠른개미',win:true,days:15,money:1.2e8,score:scoreOf({win:true,days:15,money:1.2e8})};
          s.b={name:'월세왕',win:false,days:30,money:8.1e7,score:scoreOf({win:false,days:30,money:8.1e7})};
          s.c={name:'편의점사장',win:false,days:30,money:6.5e7,score:scoreOf({win:false,days:30,money:6.5e7})}; screenTitle();}""")
        await pg.wait_for_timeout(300)
        assert "빠른개미" in await pg.inner_text("#rankbox"), "온라인 랭킹이 안 보임"
        assert await pg.query_selector("#rklogin"), "로그인 버튼이 없음"
        await shot("20_online_title.png")
        # 로그인
        await pg.click("#rklogin"); await pg.wait_for_timeout(400)
        assert await pg.query_selector("#rklogout"), "로그인 후 로그아웃 버튼이 없음"
        # 1억 달성 판 (개발자 모드 아님)
        await pg.click("#go"); await pg.wait_for_timeout(1300)   # 아침 저장 → 1초 뒤 클라우드 저장
        assert await pg.evaluate("!!__FB_STORE.saves['u-test']"), "클라우드 저장이 안 됨"
        await pg.evaluate("S.day=20; S.cash=1.05e8; finishDay(null)"); await pg.wait_for_selector("#dayend")
        await pg.click("#dayend #next"); await pg.wait_for_selector("#share")
        await pg.click("#share"); await pg.wait_for_selector("#nick")
        await pg.fill("#nick","동키개미"); await shot("21_nick.png"); await pg.click("#nk")
        await pg.wait_for_function("document.getElementById('shareout').textContent.includes('위')",timeout=3000)
        out=await pg.inner_text("#shareout"); assert "2위" in out, "순위가 이상함: "+out
        await shot("22_shared.png")
        assert await pg.evaluate("!__FB_STORE.saves['u-test']"), "끝난 판의 클라우드 저장이 안 지워짐"
        # 더 나쁜 기록은 덮어쓰지 않음
        r=await pg.evaluate("uploadScore({win:false,days:30,money:3e7},'동키개미')")
        assert r["kept"], "더 나쁜 기록이 최고 기록을 덮어씀"
        # 첫 화면: 내 최고 기록 · 전체 순위
        await pg.click("#home"); await pg.wait_for_timeout(400)
        assert "전체 2위" in await pg.inner_text("#rkmine"), "첫 화면에 내 순위가 없음"
        await shot("23_title_mine.png")
        # 다른 기기에서 이어하기: 판 시작 → 이 기기 저장 지움 → 로그인하면 클라우드에서 가져옴
        await pg.click("#go"); await pg.wait_for_timeout(1300)
        await pg.evaluate("localStorage.removeItem('omz_save'); screenTitle()"); await pg.wait_for_timeout(200)
        assert not await pg.query_selector("#resume"), "저장을 지웠는데 이어하기가 보임"
        await pg.evaluate("cloudPull().then(()=>screenTitle())"); await pg.wait_for_timeout(300)
        assert await pg.query_selector("#resume"), "클라우드 저장에서 이어하기가 안 됨"
        # 개발자 모드 판은 올리기 버튼 없음
        await pg.evaluate("newRun(); S.dev=true; S.day=20; S.cash=1.05e8; screenEnd('win')"); await pg.wait_for_timeout(100)
        assert not await pg.query_selector("#share"), "개발자 모드 판에 올리기 버튼이 보임"
        await b.close()
        if errors: print("❌ 오류:",errors); sys.exit(1)
        print("✅ 온라인 흐름 통과 (가짜 Firebase)")
asyncio.run(main())
