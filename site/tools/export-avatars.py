"""Export native preset avatars with the isolated Vite server on port 5197."""
import asyncio
import base64
import json
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).resolve().parents[1] / "public" / "avatars"

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifests = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.on("console", lambda msg: print(msg.type, msg.text[:250], flush=True))
        page.on("pageerror", lambda error: print("PAGE ERROR", str(error)[:500], flush=True))
        await page.goto("http://127.0.0.1:5197/avatar-export.html", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_function("window.avatarReady", timeout=60000)
        for index in range(3):
            print("Exporting", index, flush=True)
            result = await page.evaluate("index => window.exportAvatar(index)", index)
            entry = result["metadata"]
            (OUT / (entry["id"] + ".glb")).write_bytes(base64.b64decode(result["glb"]))
            (OUT / (entry["id"] + ".png")).write_bytes(base64.b64decode(result["preview"].split(",")[1]))
            (OUT / (entry["id"] + "-portrait.png")).write_bytes(base64.b64decode(result["portrait"].split(",")[1]))
            (OUT / (entry["id"] + ".recipe.json")).write_text(json.dumps(result["recipe"], ensure_ascii=False, indent=2), encoding="utf-8")
            manifests.append(entry)
            print(entry["id"], entry["bytes"], entry["height"], "visemes", len(entry["visemes"]), flush=True)
        (OUT / "manifest.json").write_text(json.dumps({"version": 1, "avatars": manifests}, ensure_ascii=False, indent=2), encoding="utf-8")
        await browser.close()

asyncio.run(main())
