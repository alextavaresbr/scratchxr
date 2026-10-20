"""WebKit/Chromium regressions for the mobile viewer and interrupted audio.

Uses real canvas, and real decoding/audio nodes when the engine supports them.
Windows WebKit has no Web Audio/MediaRecorder, so it checks viewport and scroll.
Permission, interruption and cloud responses are controlled inputs;
this is not a physical iPhone microphone test.
"""
import asyncio
import io
import wave
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

async def check(browser_type):
    browser = await browser_type.launch(headless=True)
    page = await browser.new_page(ignore_https_errors=True, viewport={"width":390,"height":844},has_touch=True,is_mobile=True)
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    wav=io.BytesIO()
    with wave.open(wav,"wb") as f:
        f.setparams((1,2,16000,0,"NONE","not compressed"));f.writeframes(b"\0\0"*4000)
    sample=ROOT/".cache/avatar-a-voice.mp3"
    audio=sample.read_bytes() if sample.exists() else wav.getvalue()
    tts_fails=True
    async def tts(route):
        if tts_fails:await route.fulfill(status=503,json={"error":"unavailable"})
        else:await route.fulfill(content_type="audio/mpeg" if sample.exists() else "audio/wav",body=audio)
    await page.route("**/api/chat",lambda r:r.fulfill(json={"text":"Vamos testar os blocos.","mode":"online"}))
    await page.route("**/api/tts",tts)
    await page.route("**/api/motion",lambda r:r.fulfill(json={"reply":"Vou experimentar.","state":"fallback","note":"Aceno preparado"}))
    await page.goto("https://localhost:4310")
    supports_audio=await page.evaluate("typeof AudioContext==='function'&&typeof MediaRecorder==='function'")
    await page.evaluate("""async()=>{
      document.getElementById('root').remove();
      const mount=document.createElement('div');mount.id='qa-root';document.body.appendChild(mount);
      const {default:React}=await import('/node_modules/.vite/deps/react.js');
      const {default:DOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
      const {WorldView}=await import('/src/WorldView.tsx');
      const {Dialogue}=await import('/src/Dialogue.tsx');
      Element.prototype.requestFullscreen=undefined;
      window.DeviceOrientationEvent={requestPermission:async()=> 'denied'};
      window.__blockAudio=false;window.__voiceStarts=0;window.__systemVoices=0;window.__contexts=[];window.__streams=[];
      const NativeAudioContext=window.AudioContext;
      if(NativeAudioContext){
      window.AudioContext=class extends NativeAudioContext {
        constructor(...args){super(...args);window.__contexts.push(this);}
        get state(){return window.__blockAudio?'suspended':super.state;}
        resume(){return window.__blockAudio?Promise.resolve():super.resume();}
      };
      const start=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...args){
        if(this.buffer?.length>1)window.__voiceStarts++;
        return start.apply(this,args);
      };
      speechSynthesis.speak=()=>{window.__systemVoices++;};
      navigator.mediaDevices.getUserMedia=async()=>{
        const context=new NativeAudioContext();await context.resume();
        const dest=context.createMediaStreamDestination(),osc=context.createOscillator(),gain=context.createGain();
        gain.gain.value=0;osc.connect(gain);gain.connect(dest);osc.start();
        window.__streams.push(dest.stream);return dest.stream;
      };
      }
      function Test(){
        const dialogue=React.useRef(null),view=React.useRef(null);
        const [phase,setPhase]=React.useState('off'),[speaking,setSpeaking]=React.useState(false),[caption,setCaption]=React.useState('');
        return React.createElement(React.Fragment,null,
          React.createElement('div',{ref:view,className:'conversation-world',style:{transform:'translateZ(0)',overflow:'hidden',marginTop:200}},
            React.createElement(WorldView,{locale:'pt-BR',avatar:'avatar-a',scene:'forest',speaking,onReplay:()=>{},conversation:true,caption,voicePhase:phase,
              onXRVoice:mode=>dialogue.current.requestVoice(mode),onVoiceSession:active=>active?dialogue.current.startListening():dialogue.current.stopListening()})),
          React.createElement('div',{style:{height:1000}}),
          React.createElement(Dialogue,{ref:dialogue,locale:'pt-BR',avatar:'avatar-a',onVoicePhase:setPhase,onSpeaking:setSpeaking,onCaption:setCaption,
            onResponse:()=>{},onGesture:()=>{},onShowAvatar:()=>{window.__showAvatar=true;view.current.scrollIntoView({behavior:'instant',block:'start'});}}));
      }
      DOM.createRoot(mount).render(React.createElement(Test));
    }""")
    if supports_audio:
        await page.locator(".chat-input input").fill("Teste de voz indisponível")
        await page.locator(".send-button").click()
        await expect(page.locator(".chat-notice")).to_contain_text("não carregou")
        assert await page.evaluate("window.__systemVoices")==0
        tts_fails=False
        await page.evaluate("window.__blockAudio=true")
        await page.locator(".chat-input input").fill("Teste de permissão")
        await page.locator(".send-button").click()
        await expect(page.locator(".chat-audio-enable")).to_be_visible(timeout=12000)
        await page.evaluate("window.__blockAudio=false")
        await page.locator(".chat-audio-enable").click()
        await page.wait_for_function("window.__voiceStarts===1")
        await expect(page.locator(".chat-audio-enable")).to_have_count(0)
        await page.wait_for_timeout(6000)
        assert await page.evaluate("window.__systemVoices")==0
        # Enable and recover audio before entering Cardboard.
        await page.locator(".conversation-mic").click()
        await page.wait_for_function("window.__streams.length===1")
        await page.evaluate("window.__blockAudio=true;window.__contexts.forEach(c=>c.dispatchEvent(new Event('statechange')))")
        await expect(page.locator(".conversation-mic")).to_have_attribute("aria-label","Ativar áudio")
        await page.evaluate("window.__blockAudio=false")
        await page.locator(".conversation-mic").click()
        await expect(page.locator(".conversation-mic")).to_have_attribute("aria-label","Desligar microfone")
        assert await page.evaluate("window.__streams.length===1&&window.__streams[0].getTracks().every(t=>t.readyState==='live')")

    await page.get_by_role("button",name="Visor de celular",exact=True).click()
    if supports_audio:await page.wait_for_function("window.__streams.length===1")
    await expect(page.locator(".viewer-tracking,.viewer-microphone")).to_have_count(0)
    for name in ["Sair do visor","Alinhar imagens"]:
        control=page.get_by_role("button",name=name,exact=True)
        await expect(control).to_have_text("")
        assert await control.evaluate("el=>el.offsetWidth===44&&el.offsetHeight===44")
    await expect(page.locator(".stereo-active button:visible")).to_have_count(2)
    canvas=page.locator(".stereo-active .world-canvas canvas")
    await expect(page.locator("body>.stereo-active,body>div>.stereo-active")).to_have_count(1)
    for width,height in [(390,844),(844,390),(844,320)]:
        await page.set_viewport_size({"width":width,"height":height})
        await page.wait_for_function("""()=>{
          const r=document.querySelector('.stereo-active .world-canvas canvas').getBoundingClientRect(),v=visualViewport;
          return Math.abs(r.width-v.width)<1&&Math.abs(r.height-v.height)<1&&Math.abs(r.left-v.offsetLeft)<1&&Math.abs(r.top-v.offsetTop)<1;
        }""")
    await page.screenshot(path=str(ROOT/f".cache/viewer-{browser_type.name}.png"))
    await page.get_by_role("button",name="Alinhar imagens",exact=True).click()
    await expect(page.get_by_role("slider",name="Alinhamento das imagens")).to_be_visible()
    await page.get_by_role("button",name="Alinhar imagens",exact=True).click()
    await page.get_by_role("button",name="Sair do visor",exact=True).click()
    await expect(page.locator(".conversation-world .world-panel")).to_have_count(1)
    if supports_audio:assert await page.evaluate("window.__streams[0].getTracks().every(t=>t.readyState==='ended')")
    await page.set_viewport_size({"width":390,"height":844})
    # WebKit on Windows lacks audio APIs; provide the minimum warmup for this
    # scrolling-only case, without claiming to test playback.
    if not supports_audio:
        await page.evaluate("""()=>{window.AudioContext=class {
          state='running';sampleRate=44100;resume(){return Promise.resolve();}
          createBuffer(){return {};}createBufferSource(){return {connect(){},start(){},disconnect(){}};}
        };}""")
    await page.locator("#motion-request").fill("Faça um aceno")
    await page.get_by_role("button",name="Ver meu movimento",exact=True).click()
    await page.wait_for_function("window.__showAvatar")
    try:
        await page.wait_for_function("Math.abs(document.querySelector('.conversation-world').getBoundingClientRect().top)<30",timeout=6000)
    except Exception:
        print("SCROLL",await page.evaluate("""()=>({
          top:document.querySelector('.conversation-world').getBoundingClientRect().top,
          scrollY,height:innerHeight,documentHeight:document.documentElement.scrollHeight,
          bodyOverflow:document.body.style.overflow,rootOverflow:document.documentElement.style.overflow,
          margin:getComputedStyle(document.querySelector('.conversation-world')).scrollMarginTop
        })"""),flush=True)
        raise
    assert not errors,errors
    print(browser_type.name,"PASS: full viewport and movement scroll"+("; real voice decode, no system fallback, audio recovery and microphone cleanup" if supports_audio else " (audio APIs unavailable in this engine build)"),flush=True)
    await browser.close()

async def main():
    async with async_playwright() as p:
        await check(p.webkit)
        await check(p.chromium)

asyncio.run(main())
