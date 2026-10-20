"""Render the same original geometry for Scratch stage backdrops and visual QA."""
import asyncio
import base64
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--ignore-certificate-errors"])
        page = await browser.new_page(ignore_https_errors=True, viewport={"width":1360,"height":900})
        errors, external_models, report = [], [], {}
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: external_models.append(r.url) if "/models/" in r.url or "poly.pizza" in r.url else None)
        await page.goto("https://localhost:4310/tools/scene-preview.html")
        await page.wait_for_function("window.scenePreview",timeout=60000)
        if "--avatars-only" in sys.argv:
            for avatar in ["avatar-a","avatar-b","avatar-c"]:
                result=await page.evaluate("id=>window.scenePreview.renderAvatar(id)",avatar)
                for key,suffix in [("preview",""),("portrait","-portrait")]:
                    (ROOT/f"public/avatars/{avatar}{suffix}.png").write_bytes(base64.b64decode(result[key].split(",")[1]))
                print("AVATAR",avatar,"1024 x 1280; unoutlined stage, outlined portrait",flush=True)
            assert not errors,errors
            await browser.close()
            return
        idle = await page.evaluate("()=>window.scenePreview.auditIdle()")
        (ROOT/".cache/idle-check.json").write_text(json.dumps(idle,indent=2))
        print("IDLE",json.dumps(idle),flush=True)
        for scene in ["forest","village","garden"]:
            report[scene] = {}
            for mode in ["review","backdrop","panorama","conversation"]:
                result = await page.evaluate("([id,mode])=>window.scenePreview.render(id,mode)",[scene,mode])
                image = base64.b64decode(result.pop("image").split(",")[1])
                path=ROOT/("public/backdrops/"+scene+".png" if mode=="backdrop" else "public/backdrops/"+scene+"-panorama.png" if mode=="panorama" else ".cache/"+scene+"-"+mode+".png")
                path.parent.mkdir(parents=True,exist_ok=True)
                path.write_bytes(image)
                report[scene][mode]=result
        assert not errors, errors
        assert not external_models, external_models
        (ROOT/".cache/scenes-check.json").write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2))
        await browser.close()
asyncio.run(main())
