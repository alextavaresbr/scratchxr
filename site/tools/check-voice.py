"""Browser conversation regression: real UI/MediaRecorder, controlled microphone.

One real tutor request checks text delivery. Subsequent cloud requests are
stubbed to verify multiple hands-free turns, echo suppression and exit races.
This does not certify acoustic capture on physical iPhone/Quest hardware.
"""
import asyncio
import io
import json
import wave
from playwright.async_api import async_playwright, expect


async def main():
    wav = io.BytesIO()
    with wave.open(wav, "wb") as f:
        f.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        f.writeframes(b"\0\0" * 8000)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--ignore-certificate-errors"])
        page = await browser.new_page(ignore_https_errors=True, viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("requestfailed", lambda r: print("REQUEST FAILED",r.url,r.failure,flush=True) if "/api/" in r.url else None)
        await page.add_init_script("Object.defineProperty(navigator,'xr',{value:{isSessionSupported:async mode=>mode==='immersive-vr'}})")
        await page.goto("https://localhost:4310")
        await page.add_style_tag(content="html{scroll-behavior:auto!important}")
        await page.locator(".language-options button").first.click()
        await page.locator(".hero .course-advance").click()
        await page.locator(".quiz-options button").nth(1).click()
        await page.locator(".quiz-card .course-advance").click()
        for i in range(8):
            await page.locator(".element-card").nth(i).click()
        await page.locator(".catalog-advance button").click()
        await page.wait_for_function("window.__scratchxr?.vm?.editingTarget")
        await page.set_viewport_size({"width": 390, "height": 844})
        await expect(page.locator(".scratch-rotate-hint")).to_be_visible()
        assert await page.locator("#step-3 .scratch-rotate-hint").count() == 1
        await page.set_viewport_size({"width": 844, "height": 390})
        await expect(page.locator(".scratch-rotate-hint")).not_to_be_visible()
        await page.set_viewport_size({"width": 1280, "height": 900})
        await page.locator(".run-button").click()
        await expect(page.locator(".run-button")).to_be_enabled(timeout=15000)
        await page.locator("#step-3 .stage-mode-button").click()
        await page.get_by_role("button", name="Conversar sobre a descoberta").click(timeout=15000)

        await page.evaluate("""async()=>{
          window.__micStreams=[];window.__micGains=[];window.__micContexts=[];window.__denyMic=false;window.__pendingMic=false;
          window.__rms=0;window.__samples=0;
          const read=AnalyserNode.prototype.getFloatTimeDomainData;
          AnalyserNode.prototype.getFloatTimeDomainData=function(values){read.call(this,values);window.__samples++;window.__rms=Math.max(window.__rms,Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length));};
          const getMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia=async constraints=>{
            if(!constraints.audio)throw new DOMException('Synthetic camera unavailable','NotAllowedError');
            if(window.__denyMic)throw new DOMException('Denied','NotAllowedError');
            if(window.__pendingMic)await new Promise(r=>window.__resolveMic=r);
            const ctx=new AudioContext();await ctx.resume();
            const osc=ctx.createOscillator(),gain=ctx.createGain(),dest=ctx.createMediaStreamDestination();
            osc.frequency.value=190;gain.gain.value=0;osc.connect(gain);gain.connect(dest);osc.start();
            window.__micContexts.push(ctx);window.__micGains.push(gain);window.__micStreams.push(dest.stream);return dest.stream;
          };
          const source=await(await fetch('/src/WorldView.tsx')).text();
          const moduleUrl=source.match(/from\\s+["']([^"']*\\/World\\.ts[^"']*)["']/)[1];
          const {World}=await import(moduleUrl);
          World.prototype.enterXR=async function(mode,onEnd){window.__xrEnd=onEnd;};
        }""")
        tts_avatars = []
        async def tts(route):
            tts_avatars.append(route.request.post_data_json["avatar"])
            await route.fulfill(content_type="audio/wav", body=wav.getvalue())
        await page.route("**/api/tts", tts)
        # Real tutor response, with only the playback fixture shortened.
        await page.locator(".chat-input input").fill("Para que serve repetir? Responda em uma frase.")
        async with page.expect_response("**/api/chat", timeout=40000) as pending:
            await page.locator(".chat-input .send-button").click()
        response = await pending.value
        print("CHAT HTTP",response.status,flush=True)
        assert response.status==200
        await expect(page.locator(".chat-message.assistant:not(.loading-dots)").nth(1)).to_be_visible(timeout=40000)
        await expect(page.locator(".loading-dots")).to_have_count(0, timeout=10000)
        await page.wait_for_timeout(1000)
        print("TEXT displayed; audio requested", flush=True)

        chats = []
        stt_calls = []
        stt_delay = 0
        async def chat(route):
            chats.append(route.request.post_data_json["messages"])
            await route.fulfill(json={"mode": "online", "text": f"Resposta de teste {len(chats)}"})
        async def stt(route):
            stt_calls.append(route.request.headers["content-type"])
            await asyncio.sleep(stt_delay)
            await route.fulfill(json={"text": f"Pergunta de teste {len(stt_calls)}"})
        await page.route("**/api/chat", chat)
        await page.route("**/api/stt", stt)
        panel = page.locator("#step-5 .world-panel")
        await panel.get_by_role("button", name="Visor de celular", exact=True).click()
        await page.wait_for_function("window.__micStreams.length===1")
        await expect(page.locator(".viewer-microphone")).to_have_text("Microfone ligado")
        await page.wait_for_timeout(1300)
        assert not stt_calls, "Silence was uploaded"
        for turn in range(2):
            await page.evaluate("window.__micGains.at(-1).gain.value=.1")
            await page.wait_for_timeout(700)
            await page.evaluate("window.__micGains.at(-1).gain.value=0")
            await page.wait_for_timeout(1600)
            print("TURN",turn,"requests",len(stt_calls),len(chats),"audio",await page.evaluate("({samples:window.__samples,rms:window.__rms,states:window.__micContexts.map(c=>c.state),notice:document.querySelector('.chat-notice')?.textContent,status:document.querySelector('.chat-voice-status')?.textContent})"),flush=True)
            await expect(page.locator(".chat-message.assistant").filter(has_text=f"Resposta de teste {turn+1}")).to_have_count(1, timeout=10000)
            await expect(page.locator(".loading-dots")).to_have_count(0, timeout=10000)
            await expect(page.locator(".chat-voice-status")).to_contain_text("Estou ouvindo",timeout=10000)
            await page.wait_for_timeout(1000)
        assert len(chats[1]) == len(chats[0]) + 2, "Conversation history lost between turns"
        assert len(stt_calls) == 2 and len(tts_avatars) == 3
        assert await page.evaluate("window.__micStreams[0].getAudioTracks()[0].readyState") == "live"
        await panel.get_by_role("button", name="Sair do visor").click()
        await page.wait_for_function("window.__micStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
        print("CARDBOARD two automatic turns, history and microphone cleanup passed", flush=True)

        # Leaving during transcription cannot send a late chat request.
        stt_delay = 2
        await panel.get_by_role("button", name="Visor de celular", exact=True).click()
        await page.wait_for_function("window.__micStreams.length===2")
        await page.evaluate("window.__micGains.at(-1).gain.value=.1")
        await page.wait_for_timeout(700)
        await page.evaluate("window.__micGains.at(-1).gain.value=0")
        await page.wait_for_timeout(1250)
        await panel.get_by_role("button", name="Sair do visor").click()
        await page.wait_for_timeout(2200)
        assert len(chats) == 2, "Late transcription triggered a reply after leaving"
        # Simulated native session invokes the same synchronous audio start/end.
        await panel.get_by_role("button", name="Entrar em VR", exact=True).click()
        await page.wait_for_function("window.__micStreams.length===3")
        await page.evaluate("window.__xrEnd()")
        await page.wait_for_function("window.__micStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
        # A permission granted after exit must immediately close the new stream.
        await page.evaluate("window.__pendingMic=true")
        await panel.get_by_role("button", name="Visor de celular", exact=True).click()
        await page.wait_for_function("!!window.__resolveMic")
        await panel.get_by_role("button", name="Sair do visor").click()
        await page.evaluate("window.__resolveMic()")
        await page.wait_for_function("window.__micStreams.length===4&&window.__micStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
        await page.evaluate("window.__pendingMic=false;window.__denyMic=true")
        await panel.get_by_role("button", name="Visor de celular", exact=True).click()
        await expect(page.locator(".chat-notice")).to_contain_text("Confira a permissão")
        await expect(page.locator(".viewer-microphone")).to_have_text("Ligar microfone")
        await panel.get_by_role("button", name="Sair do visor").click()
        assert not errors, errors
        print("VR lifecycle, cancelled requests, late permissions and denial passed", flush=True)
        await browser.close()


asyncio.run(main())
