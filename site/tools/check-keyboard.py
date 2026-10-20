"""Browser regression: real Scratch keyboard hats, held keys and page focus."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--ignore-certificate-errors"])
        page = await browser.new_page(ignore_https_errors=True, viewport={"width":1440,"height":1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            await page.emulate_media(reduced_motion="reduce")
            await page.goto("https://localhost:4310")
            await page.add_style_tag(content="html{scroll-behavior:auto!important}")
            await page.locator(".language-options button").first.click()
            await page.locator(".hero .course-advance").click()
            await page.locator(".quiz-options button").nth(1).click()
            await page.locator(".quiz-card .course-advance").click()
            for i in range(8):
                await page.locator(".element-card").nth(i).click()
            await page.locator(".catalog-advance button").click()
            await expect(page.locator(".run-button")).to_be_enabled(timeout=30000)
            await page.evaluate("""async()=>{
              const vm=window.__scratchxr.vm,project=JSON.parse(vm.toJSON());
              const sprite=project.targets.find(t=>!t.isStage);
              sprite.x=0;sprite.y=0;
              const block=(opcode,next,parent,fields={},inputs={})=>({
                opcode,next,parent,fields,inputs,shadow:false,topLevel:parent===null,x:40,y:40
              });
              sprite.blocks={
                flag:block('event_whenflagclicked','reset',null),
                reset:block('motion_setx',null,'flag',{}, {X:[1,[4,'0']]}),
                space:block('event_whenkeypressed','move',null,{KEY_OPTION:['space',null]}),
                move:block('motion_changexby',null,'space',{}, {DX:[1,[4,'10']]}),
                arrow:block('event_whenkeypressed','nudge',null,{KEY_OPTION:['right arrow',null]}),
                nudge:block('motion_changexby',null,'arrow',{}, {DX:[1,[4,'3']]})
              };
              sprite.blocks.space.y=160;sprite.blocks.arrow.y=280;
              await vm.loadProject(JSON.stringify(project));
            }""")
            await page.locator(".run-button").click()
            await expect(page.locator(".scratch-stage")).to_be_focused()
            await expect(page.locator(".run-button")).to_be_enabled()
            await page.wait_for_timeout(300)
            y = await page.evaluate("scrollY")
            await page.keyboard.down("Space")
            await page.wait_for_function("window.__scratchxr.vm.editingTarget.x===10")
            assert await page.evaluate("window.__scratchxr.vm.runtime.ioDevices.keyboard.getKeyIsDown('space')")
            for _ in range(8):
                await page.keyboard.down("Space")
                await page.wait_for_timeout(70)
            assert abs(await page.evaluate("scrollY")-y)<1, "Holding Space scrolled the page"
            assert await page.evaluate("window.__scratchxr.vm.editingTarget.x")==10, "Repeated keydown restarted the hat"
            await page.keyboard.up("Space")
            assert not await page.evaluate("window.__scratchxr.vm.runtime.ioDevices.keyboard.getKeyIsDown('space')")
            await page.keyboard.press("Space")
            await page.wait_for_function("window.__scratchxr.vm.editingTarget.x===20")
            await page.wait_for_function("window.__scratchxr.getTrace().frames.at(-1).actors[0].x===20")

            await page.keyboard.down("ArrowRight")
            await page.wait_for_function("window.__scratchxr.vm.editingTarget.x===23")
            for _ in range(4):
                await page.keyboard.down("ArrowRight")
            await page.wait_for_timeout(400)
            await page.keyboard.up("ArrowRight")
            assert abs(await page.evaluate("scrollY")-y)<1, "Arrow key scrolled the page"

            # A click in the block workspace must also allow keyboard hats.
            await page.locator(".blocklyMainBackground").click(position={"x":500,"y":390})
            y = await page.evaluate("scrollY")
            await page.keyboard.press("Space")
            await page.wait_for_function("window.__scratchxr.vm.editingTarget.x===33")
            await page.wait_for_timeout(400)
            assert abs(await page.evaluate("scrollY")-y)<1

            # A lost window or input focus cannot leave sensing keys stuck down.
            await page.locator(".scratch-stage").click()
            await page.keyboard.down("Space")
            await page.wait_for_function("window.__scratchxr.vm.editingTarget.x===43")
            await page.evaluate("window.dispatchEvent(new Event('blur'))")
            assert not await page.evaluate("window.__scratchxr.vm.runtime.ioDevices.keyboard.getKeyIsDown('any')")
            await page.keyboard.up("Space")
            await page.evaluate("window.__scratchxr.vm.runtime.emit('QUESTION','Type your answer')")
            answer = page.locator(".ask-form input")
            await answer.click()
            await page.keyboard.type("one two")
            await expect(answer).to_have_value("one two")
            assert await page.evaluate("window.__scratchxr.vm.editingTarget.x")==43

            # Tab and browser shortcuts are not swallowed by the Scratch listener.
            await page.locator(".scratch-stage").focus()
            await page.keyboard.press("Tab")
            await expect(answer).to_be_focused()
            await page.keyboard.press("Control+a")
            await page.keyboard.type("three four")
            await expect(answer).to_have_value("three four")
            await page.evaluate("window.__scratchxr.vm.runtime.emit('QUESTION',null)")
            await page.locator("#step-1 h2").click()
            y = await page.evaluate("scrollY")
            await page.keyboard.press("Space")
            await page.wait_for_timeout(600)
            assert await page.evaluate("scrollY")>y+20, "Space should scroll outside the editor"
            assert await page.evaluate("window.__scratchxr.vm.editingTarget.x")==43
            assert not errors, errors
            print("PASS: Space/arrow hats, repeat without scrolling, workspace and Run focus, key release, typing, Tab and outside scrolling.")
        except Exception:
            await page.screenshot(path=str(ROOT/".cache/keyboard-failure.png"))
            raise
        finally:
            await browser.close()

asyncio.run(main())
