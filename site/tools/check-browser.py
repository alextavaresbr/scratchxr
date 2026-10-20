"""Exercise the gated journey, carousel and real Scratch/WebGL; mock tutor reply only."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://localhost:4310"

async def absent_from(page, step):
    for n in range(step, 7):
        assert await page.locator(f"#step-{n}").count() == 0, f"Stage {n} visible early"

async def check_header_scroll(page):
    for width,height in [(1440,1000),(390,844)]:
        await page.set_viewport_size({"width":width,"height":height})
        await page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        await page.wait_for_function("document.querySelector('.site-header').getBoundingClientRect().top===0")
        before=await page.locator(".hero").evaluate("el=>el.offsetTop")
        await page.mouse.move(width/2,height/2)
        await page.mouse.wheel(0,350)
        await page.wait_for_function("document.querySelector('.site-header').getBoundingClientRect().bottom<=.5")
        assert await page.locator(".hero").evaluate("el=>el.offsetTop")==before,"Header changed document layout"
        if width<=760:
            await page.wait_for_function("document.querySelector('.site-header nav').getBoundingClientRect().top>=innerHeight")
        # Upward scrolling in the middle of a section must keep navigation hidden.
        await page.evaluate("window.scrollBy({top:-2,behavior:'instant'})")
        await page.wait_for_timeout(100)
        assert await page.locator(".site-header").evaluate("el=>el.getBoundingClientRect().bottom<=.5")
        await page.mouse.wheel(0,-40)
        await page.wait_for_timeout(300)
        assert await page.locator(".site-header").evaluate("el=>el.getBoundingClientRect().bottom<=.5")
        start=await page.locator("#step-1").evaluate("el=>el.getBoundingClientRect().top+scrollY")
        await page.evaluate("y=>window.scrollTo({top:y+300,behavior:'instant'})",start)
        await page.wait_for_function("document.querySelector('.site-header').getBoundingClientRect().bottom<=.5")
        await page.mouse.wheel(0,-120)
        await page.wait_for_timeout(300)
        assert await page.locator(".site-header").evaluate("el=>el.getBoundingClientRect().bottom<=.5")
        header_height=await page.locator(".site-header").evaluate("el=>el.offsetHeight")
        await page.evaluate("y=>window.scrollTo({top:y,behavior:'instant'})",start-header_height)
        await page.wait_for_function("Math.abs(document.querySelector('.site-header').getBoundingClientRect().top)<.5")
        if width<=760:
            await page.wait_for_function("Math.abs(document.querySelector('.site-header nav').getBoundingClientRect().bottom-innerHeight)<.5")
        # Continuing upward beyond the boundary also hides the menu.
        await page.mouse.wheel(0,-180)
        await page.wait_for_function("document.querySelector('.site-header').getBoundingClientRect().bottom<=.5")
        await page.evaluate("y=>window.scrollTo({top:y+300,behavior:'instant'})",start)
        await page.wait_for_timeout(100)
        await page.evaluate("y=>window.scrollTo({top:y,behavior:'instant'})",start-header_height)
        await page.wait_for_function("Math.abs(document.querySelector('.site-header').getBoundingClientRect().top)<.5")
        await page.mouse.wheel(0,100)
        await page.wait_for_function("document.querySelector('.site-header').getBoundingClientRect().bottom<=.5")
        await page.screenshot(path=str(ROOT/f".cache/header-hidden-{width}.png"))
        # Hidden navigation remains reachable with keyboard focus.
        await page.locator(".locale-toggle").focus()
        await page.wait_for_function("Math.abs(document.querySelector('.site-header').getBoundingClientRect().top)<.5")
        await expect(page.locator(".locale-toggle")).to_be_focused()
        await page.locator(".locale-toggle").evaluate("el=>el.blur()")
        await page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        await page.wait_for_function("Math.abs(document.querySelector('.site-header').getBoundingClientRect().top)<.5")
    await page.emulate_media(reduced_motion="reduce")
    assert await page.locator(".site-header").evaluate("el=>getComputedStyle(el).transitionDuration")=="0s"
    await page.emulate_media(reduced_motion="no-preference")
    await page.set_viewport_size({"width":1440,"height":1000})

async def check_arrows(page):
    boxes = await page.locator(".piece-carousel").evaluate("""el=>[...el.children].map(e=>{
      const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})""")
    left, picture, right = boxes
    assert left["x"]+left["w"] <= picture["x"] and picture["x"]+picture["w"] <= right["x"], boxes
    assert abs(left["y"]+left["h"]/2-picture["y"]-picture["h"]/2)<1, boxes
    assert abs(right["y"]+right["h"]/2-picture["y"]-picture["h"]/2)<1, boxes
    assert await page.locator(".carousel-meta,.piece-grid").count()==0

async def check_credit(page):
    spans = page.locator(".footer-attribution>span")
    assert await spans.nth(1).inner_text() in ["Por: Alexandre Tavares","By: Alexandre Tavares"]
    data = await spans.evaluate_all("""els=>els.map(e=>{const r=e.getBoundingClientRect();
      const s=getComputedStyle(e);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,font:s.font};})""")
    assert data[0]["font"]==data[1]["font"],data
    assert data[1]["y"]>=data[0]["bottom"],data
    side="x" if page.viewport_size["width"]<=760 else "right"
    assert abs(data[0][side]-data[1][side])<1,data

async def check_category_cards(page):
    cards=page.locator(".element-card")
    for locale in ["pt","en"]:
        if locale=="en":
            await page.locator(".locale-toggle").focus()
            await page.locator(".locale-toggle").click()
        for width in [1440,1024,844,768]:
            await page.set_viewport_size({"width":width,"height":1000})
            await page.locator(".category-grid").scroll_into_view_if_needed()
            boxes=await cards.evaluate_all("els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))")
            assert max(b["w"] for b in boxes)-min(b["w"] for b in boxes)<1,(width,boxes)
            assert max(b["h"] for b in boxes)-min(b["h"] for b in boxes)<1,(width,boxes)
            assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.set_viewport_size({"width":1440,"height":1000})
        for i in [1,3,0]:
            await cards.nth(i).click()
        await page.locator(".category-grid").evaluate("el=>Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{})))")
        for i in range(8):
            style=await cards.nth(i).evaluate("""el=>{
              const s=getComputedStyle(el),hex=el.style.getPropertyValue('--category').slice(1);
              const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ');
              return {background:s.backgroundColor,border:s.borderBottomColor,
                category:`rgb(${rgb})`,visited:el.classList.contains('visited'),
                text:[...el.children].map(child=>getComputedStyle(child).color)};
            }""")
            assert style["visited"]==(i in [0,1,3]),(i,style)
            if style["visited"]:
                assert style["background"]==style["category"],(i,style)
                assert style["border"]==style["category"],(i,style)
                assert all(color=="rgb(255, 255, 255)" for color in style["text"]),(i,style)
            else:
                assert style["background"]=="rgb(255, 255, 255)",(i,style)
        await page.locator(".category-grid").screenshot(path=str(ROOT/f".cache/family-cards-{locale}.png"))
    await page.locator(".locale-toggle").focus()
    await page.locator(".locale-toggle").click()

async def check_mobile_catalog(page):
    families=["Movimento","Aparência","Som","Eventos","Controle","Sensores","Operadores","Variáveis"]
    for width in [320,390,430]:
        await page.set_viewport_size({"width":width,"height":844})
        await page.locator(".catalog-layout").scroll_into_view_if_needed()
        await expect(page.locator(".element-card:visible")).to_have_count(8)
        await expect(page.locator(".category-arrow")).to_have_count(0)
        tiles=await page.locator(".element-card").evaluate_all("els=>els.map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,y:r.y,bottom:r.bottom}})")
        assert all(abs(t["w"]-t["h"])<1 and t["x"]==tiles[0]["x"] for t in tiles),tiles
        assert tiles[-1]["bottom"]-tiles[0]["y"]<844,tiles
        boxes=await page.locator(".category-browser,.catalog-detail").evaluate_all("""els=>els.map(e=>{
          const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};})""")
        assert boxes[0]["right"]<=boxes[1]["x"] and abs(boxes[0]["y"]-boxes[1]["y"])<1,boxes
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await check_arrows(page)
        await expect(page.get_by_role("button",name="Família anterior",exact=True)).to_have_count(0)
        reference=await page.locator(".piece-preview img").bounding_box()
        for i in range(1,8):
            await page.locator(".element-card").nth(i).click()
            await expect(page.locator(".element-card.chosen")).to_have_attribute("aria-label",families[i])
            await expect(page.locator(".piece-preview img")).to_have_attribute("alt",f"Peça 1 de {families[i]}")
            image=await page.locator(".piece-preview img").bounding_box()
            assert abs(image["width"]-reference["width"])<1,(width,i,image,reference)
        await expect(page.get_by_role("button",name="Próxima família",exact=True)).to_have_count(0)
        await page.locator(".catalog-layout").screenshot(path=str(ROOT/f".cache/catalog-last-{width}.png"))
        for i in range(6,-1,-1):
            await page.locator(".element-card").nth(i).click()
            await expect(page.locator(".element-card.chosen")).to_have_attribute("aria-label",families[i])
        caption=await page.locator(".piece-caption").bounding_box()
        carousel=await page.locator(".piece-carousel").bounding_box()
        assert caption["y"]>=carousel["y"]+carousel["height"],(caption,carousel)
    await page.locator(".locale-toggle").focus()
    await page.get_by_role("button",name="Mudar para inglês").click()
    await page.locator(".element-card").nth(1).click()
    await expect(page.locator(".piece-preview img")).to_have_attribute("alt","Looks block 1")
    await page.locator(".element-card").first.click()
    await page.locator(".locale-toggle").focus()
    await page.get_by_role("button",name="Switch to Portuguese").click()
    await page.set_viewport_size({"width":390,"height":844})
    await page.locator(".catalog-layout").screenshot(path=str(ROOT/".cache/catalog-mobile-squares.png"))
    await expect(page.get_by_role("button",name="Vamos programar")).to_be_enabled()
    for width,height in [(844,390),(1440,1000)]:
        await page.set_viewport_size({"width":width,"height":height})
        reference=None
        for i in range(8):
            await page.locator(".element-card").nth(i).click()
            await page.locator(".piece-preview img").evaluate("img=>img.decode()")
            box=await page.locator(".piece-preview img").bounding_box()
            if reference is None: reference=box["width"]
            assert abs(box["width"]-reference)<1,(width,i,box,reference)
        # Tall C-shaped blocks must keep that width, without cropping or stretching.
        await page.locator(".element-card").nth(4).click()
        for i in range(11):
            image=page.locator(".piece-preview img")
            await image.evaluate("img=>img.decode()")
            assert abs((await image.bounding_box())["width"]-reference)<1
            await page.get_by_role("button",name="Próxima peça",exact=True).click()
    await page.locator(".element-card").first.click()
    await page.set_viewport_size({"width":390,"height":844})

async def check_world_layout(page):
    section=page.locator("#step-4")
    stage=page.locator("#step-3 .unified-stage")
    assert await section.locator(".world-panel").count()==0
    assert await stage.locator(".xr-controls>button").all_text_contents()==["3D","CARDBOARD","VR","AR"]
    assert await stage.locator(".compatibility").count()==0
    assert await page.locator(".mini-challenge").count()==0
    await page.evaluate("()=>{window.__qaVM=window.__scratchxr.vm;window.__qaCanvas=document.querySelector('.scratch-stage');window.__qaTrace=window.__scratchxr.getTrace();}")
    for width,height in [(1440,1000),(844,390),(568,320),(390,844),(320,568)]:
        await page.set_viewport_size({"width":width,"height":height})
        surface_size=None
        for mode in ["2d","3d"]:
            if mode=="3d":
                await stage.get_by_role("button",name="3D",exact=True).click()
                await stage.get_by_role("button",name="Parar reprodução",exact=True).click()
            await expect(stage.locator(".scratch-stage")).to_be_visible() if mode=="2d" else await expect(stage.locator(".scratch-stage")).to_be_hidden()
            await expect(stage.locator(".world-canvas")).to_be_hidden() if mode=="2d" else await expect(stage.locator(".world-canvas")).to_be_visible()
            bounds=await stage.evaluate("""el=>{
              const rect=el.getBoundingClientRect(),controls=el.querySelector('.stage-controls').getBoundingClientRect();
              return {height:rect.height,buttons:[...el.querySelectorAll('.xr-controls>button')].map(b=>b.getBoundingClientRect().top),controlsBottom:controls.bottom-rect.top};
            }""")
            assert bounds["controlsBottom"]<=height,(width,height,bounds)
            assert max(bounds["buttons"])-min(bounds["buttons"])<1,bounds
            assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
            surface=await stage.locator(".stage-window" if mode=="2d" else ".world-canvas").bounding_box()
            if mode=="2d":
                surface_size=surface
                assert "panorama.png" in await stage.locator(".stage-window").evaluate("el=>getComputedStyle(el).backgroundImage")
            else:
                assert abs(surface["width"]-surface_size["width"])<1 and abs(surface["height"]-surface_size["height"])<1,(surface,surface_size)
            await stage.screenshot(path=str(ROOT/f".cache/unified-stage-{mode}-{width}.png"))
        await stage.get_by_role("button",name="3D",exact=True).click()
        assert await page.evaluate("window.__qaVM===window.__scratchxr.vm && window.__qaCanvas===document.querySelector('.scratch-stage') && window.__qaTrace===window.__scratchxr.getTrace()")
        copy=await section.locator(".section-heading").bounding_box()
        explainer=await section.locator(".xr-explainer").bounding_box()
        assert abs(copy["width"]-explainer["width"])<1,(copy,explainer)
    await stage.get_by_role("button",name="Ajuda do palco",exact=True).click()
    await expect(stage.locator(".compatibility")).to_be_visible()
    await expect(stage.locator(".viewer-help .mini-challenge")).to_contain_text("EXPERIMENTE")
    await page.keyboard.press("Escape")
    await expect(stage.locator(".compatibility")).to_have_count(0)
    await expect(page.locator(".mini-challenge")).to_have_count(0)
    license=await page.request.get(BASE+"/xr8/LICENSE")
    assert "6DoF: 8th Wall" in await license.text()
    assert "Niantic" not in await stage.inner_text()
    await page.set_viewport_size({"width":1440,"height":1000})
    await page.locator(".locale-toggle").focus()
    await page.get_by_role("button",name="Mudar para inglês").click()
    await expect(stage.locator(".world-toolbar")).to_contain_text("Stage")
    await stage.get_by_role("button",name="Stage help",exact=True).click()
    await expect(stage.locator(".compatibility")).to_contain_text("AR and VR")
    await page.keyboard.press("Escape")
    await page.locator(".locale-toggle").focus()
    await page.get_by_role("button",name="Switch to Portuguese").click()
    await stage.get_by_role("button",name="3D",exact=True).click()
    await stage.get_by_role("button",name="Parar reprodução",exact=True).click()

async def check_viewer_bounds(page):
    await page.wait_for_function("""()=>{
      const canvas=document.querySelector('.stereo-active .world-canvas canvas');
      if(!canvas)return false;
      const r=canvas.getBoundingClientRect();
      return Math.abs(r.x)<1 && Math.abs(r.y)<1 &&
        Math.abs(r.width-innerWidth)<1 && Math.abs(r.height-innerHeight)<1 &&
        Math.abs(canvas.width/r.width-canvas.height/r.height)<.01;
    }""")
    await expect(page.get_by_role("button",name="Sair do visor",exact=True)).to_be_visible()
    assert await page.locator(".stereo-active .xr-controls:visible,.stereo-active .world-toolbar:visible").count()==0
    assert await page.evaluate("getComputedStyle(document.body).overflow")=="hidden"

async def check_phone_viewer(page,section):
    viewer=page.locator(section).get_by_role("button",name="Visor de celular",exact=True)
    await page.set_viewport_size({"width":390,"height":844})
    await viewer.click()
    await page.wait_for_function("document.fullscreenElement?.classList.contains('stereo-active')")
    await check_viewer_bounds(page)
    await page.screenshot(path=str(ROOT/f".cache/viewer-{section[1:]}-portrait.png"))
    # The browser's own exit must also restore the ordinary viewer.
    await page.evaluate("document.exitFullscreen()")
    await expect(page.locator(".stereo-active")).to_have_count(0)
    await expect(viewer).to_be_visible()
    assert await page.evaluate("getComputedStyle(document.body).overflow")!="hidden"
    # Desktop Chromium must leave native fullscreen before Playwright can resize it.
    await page.set_viewport_size({"width":844,"height":390})
    await viewer.click()
    await check_viewer_bounds(page)
    await page.screenshot(path=str(ROOT/f".cache/viewer-{section[1:]}-landscape.png"))
    await page.get_by_role("button",name="Sair do visor",exact=True).click()
    await page.wait_for_function("!document.fullscreenElement && !document.querySelector('.stereo-active')")
    # Simulate a denied fullscreen request and missing orientation permission.
    await page.evaluate("""()=>{
      window.__qaFullscreen=Element.prototype.requestFullscreen;
      window.__qaOrientation=window.DeviceOrientationEvent;
      Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Not allowed'));
      window.DeviceOrientationEvent={requestPermission:()=>Promise.resolve('denied')};
    }""")
    try:
        await viewer.scroll_into_view_if_needed()
        previous_scroll=await page.evaluate("scrollY")
        await viewer.click()
        await check_viewer_bounds(page)
        assert await page.evaluate("!document.fullscreenElement")
        await page.set_viewport_size({"width":390,"height":844})
        await check_viewer_bounds(page)
        await page.set_viewport_size({"width":844,"height":390})
        await check_viewer_bounds(page)
        await page.keyboard.press("Tab")
        await expect(page.get_by_role("button",name="Alinhar imagens",exact=True)).to_be_focused()
        await page.keyboard.press("Enter")
        await expect(page.get_by_role("slider",name="Alinhamento das imagens")).to_be_visible()
        await page.get_by_role("slider",name="Alinhamento das imagens").fill("0.08")
        await page.screenshot(path=str(ROOT/f".cache/viewer-{section[1:]}-fallback.png"))
        await page.keyboard.press("Escape")
        await expect(page.locator(".stereo-active")).to_have_count(0)
        await expect(viewer).to_be_focused()
        await page.wait_for_function("expected=>Math.abs(scrollY-expected)<2",arg=previous_scroll)
        await page.evaluate("Element.prototype.requestFullscreen=undefined;window.DeviceOrientationEvent=undefined")
        await page.set_viewport_size({"width":390,"height":844})
        await viewer.click()
        await check_viewer_bounds(page)
        await page.get_by_role("button",name="Sair do visor",exact=True).click()
        await expect(page.locator(".stereo-active")).to_have_count(0)
    finally:
        await page.evaluate("""()=>{
          Element.prototype.requestFullscreen=window.__qaFullscreen;
          window.DeviceOrientationEvent=window.__qaOrientation;
        }""")
    # Waiting for the motion permission must not postpone the fullscreen request.
    await page.evaluate("()=>{window.DeviceOrientationEvent={requestPermission:()=>new Promise(resolve=>window.__qaAllowMotion=resolve)};}")
    await viewer.click()
    await page.wait_for_function("document.fullscreenElement?.classList.contains('stereo-active')")
    await check_viewer_bounds(page)
    await page.get_by_role("button",name="Sair do visor",exact=True).click()
    await page.wait_for_function("!document.fullscreenElement && !document.querySelector('.stereo-active')")
    await page.evaluate("()=>{window.__qaAllowMotion('granted');window.DeviceOrientationEvent=window.__qaOrientation;}")
    await expect(page.locator(".stereo-active")).to_have_count(0)
    await page.set_viewport_size({"width":1440,"height":1000})

async def run_scratch(page,scene="forest"):
    mode=page.locator("#step-3 .stage-mode-button")
    if await mode.get_attribute("aria-pressed")=="true":
        await mode.click()
    await page.locator(".run-button").click()
    await absent_from(page,4)
    await page.wait_for_function("""id=>{
      const t=window.__scratchxr?.getTrace();
      return !document.querySelector('.run-button').disabled &&
        t?.frames.at(-1)?.scene===id && t.duration>=1900;
    }""",arg=scene,timeout=15000)
    await expect(page.locator("#step-4")).to_be_visible()
    await absent_from(page,5)
    trace=await page.evaluate("window.__scratchxr.getTrace()")
    assert trace["frames"][-1]["actors"][0]["x"]==90,trace["frames"][-1]
    await expect(page.get_by_role("button",name="Levar para o 3D")).to_have_count(0)
    return trace

async def check_avatar_costumes(page):
    report=await page.evaluate("""async()=>{
      const vm=window.__scratchxr.vm;
      const check=async()=>{
        const results=[];
        for(const costume of vm.editingTarget.getCostumes()){
          const svg=new TextDecoder().decode(costume.asset.data);
          const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),img=new Image();
          img.src=doc.querySelector('image').getAttributeNS('http://www.w3.org/1999/xlink','href');
          await img.decode();
          results.push({format:costume.dataFormat,size:vm.runtime.renderer.getSkinSize(costume.skinId),
            source:[img.naturalWidth,img.naturalHeight],center:[costume.rotationCenterX,costume.rotationCenterY]});
        }
        return results;
      };
      const before=await check(),saved=await vm.saveProjectSb3();
      await vm.loadProject(await saved.arrayBuffer());
      return {before,after:await check(),scale:vm.editingTarget.size};
    }""")
    assert report["before"]==report["after"],report
    assert report["scale"]==100,report
    for costume in report["after"]:
        assert costume=={"format":"svg","size":[92,115],"source":[1024,1280],"center":[46,57.5]},costume
    print("HIGH RESOLUTION COSTUMES: native dimensions and SB3 round-trip preserved",flush=True)

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=["--ignore-certificate-errors"])
        page=await browser.new_page(viewport={"width":1440,"height":1000},ignore_https_errors=True)
        errors=[]
        page.on("pageerror",lambda e:errors.append(e.stack or str(e)))
        await page.route("**/api/chat",lambda route:route.fulfill(json={"text":"A repetição organiza uma sequência de ações. Teste mudar o número de vezes!","mode":"test"}))
        try:
            await page.goto(BASE,wait_until="networkidle")
            assert await page.locator(".language-sticker,.floating-tag").count()==0
            assert await page.locator(".language-card>h1,.language-card>p,.language-card>.eyebrow,.language-foot").count()==0
            await expect(page.get_by_role("button",name="ENGLISH EUA")).to_be_visible()
            await expect(page.locator(".language-options button").nth(1).locator("img")).to_have_attribute("src","/art/flag-us.svg")
            await page.screenshot(path=str(ROOT/".cache/language.png"))
            await page.get_by_role("button",name="Português Brasil").click()
            await absent_from(page,1)
            await check_credit(page)
            await page.screenshot(path=str(ROOT/".cache/hero.png"))
            await page.get_by_role("button",name="Começar a explorar").click()
            await expect(page.locator("#step-1")).to_be_visible()
            await check_header_scroll(page)
            await absent_from(page,2)
            await expect(page.get_by_role("button",name="Conhecer os blocos")).to_be_disabled()
            await page.get_by_role("button",name="Trocar a cor do cenário",exact=True).click()
            await expect(page.get_by_role("button",name="Conhecer os blocos")).to_be_disabled()
            await page.get_by_role("button",name="Reconhecer a repetição e usar um laço").click()
            await absent_from(page,2)
            await page.get_by_role("button",name="Conhecer os blocos").click()
            await expect(page.locator(".piece-preview img")).to_be_visible()
            await check_arrows(page)
            await expect(page.get_by_role("button",name="Vamos programar")).to_be_disabled()
            await check_category_cards(page)
            await page.get_by_role("button",name="Pausar troca automática").click()
            pic=page.locator(".piece-preview img")
            first=await pic.get_attribute("src")
            await page.get_by_role("button",name="Peça anterior",exact=True).click()
            assert await pic.get_attribute("src")!=first
            await page.get_by_role("button",name="Próxima peça",exact=True).click()
            assert await pic.get_attribute("src")==first
            await page.get_by_role("button",name="Próxima peça",exact=True).click()
            second=await pic.get_attribute("src")
            assert second!=first
            await page.wait_for_timeout(5200)
            assert await pic.get_attribute("src")==second,"Pause ignored"
            await page.get_by_role("button",name="Retomar troca automática").click()
            await page.wait_for_timeout(5200)
            assert await pic.get_attribute("src")!=second,"5s autoplay did not advance"
            await page.get_by_role("button",name="Pausar troca automática").click()
            await page.locator(".catalog-detail").screenshot(path=str(ROOT/".cache/carousel-desktop.png"))
            await page.locator(".locale-toggle").focus()
            await page.get_by_role("button",name="Mudar para inglês").click()
            await expect(pic).to_have_attribute("alt","Motion block 1")
            assert await pic.get_attribute("src")!=first,"Locale did not replace the piece"
            await check_credit(page)
            await page.locator(".locale-toggle").focus()
            await page.get_by_role("button",name="Switch to Portuguese").click()
            await expect(pic).to_have_attribute("src",first)
            await check_mobile_catalog(page)
            await page.locator(".catalog-detail").screenshot(path=str(ROOT/".cache/carousel-mobile.png"))
            await check_credit(page)
            await page.locator("footer").screenshot(path=str(ROOT/".cache/footer-mobile.png"))
            await page.set_viewport_size({"width":1440,"height":1000})
            await expect(page.locator(".element-card:visible")).to_have_count(8)
            for i in range(8):
                await page.locator(".element-card").nth(i).click()
            await expect(page.get_by_role("button",name="Vamos programar")).to_be_enabled()
            await absent_from(page,3)
            await page.get_by_role("button",name="Vamos programar").click()
            await page.wait_for_function("window.__scratchxr?.vm?.editingTarget",timeout=30000)
            await check_avatar_costumes(page)
            await expect(page.get_by_role("button",name="Levar para o 3D")).to_have_count(0)
            trace=await run_scratch(page)
            print("TRACE",json.dumps({"duration":trace["duration"],"frames":len(trace["frames"])}),flush=True)
            await page.locator("#step-3").screenshot(path=str(ROOT/".cache/editor.png"))
            await check_world_layout(page)
            await expect(page.get_by_role("button",name="Conversar sobre a descoberta")).to_be_disabled()
            await page.get_by_role("button",name="Reproduzir",exact=True).click()
            await expect(page.get_by_role("button",name="Parar reprodução",exact=True)).to_be_enabled()
            await page.get_by_role("button",name="Parar reprodução",exact=True).click()
            await page.wait_for_timeout(2400)
            await expect(page.get_by_role("button",name="Conversar sobre a descoberta")).to_be_disabled()
            await absent_from(page,5)
            await page.get_by_role("button",name="Reproduzir",exact=True).click()
            await absent_from(page,5)
            await expect(page.get_by_role("button",name="Conversar sobre a descoberta")).to_be_enabled(timeout=15000)
            await absent_from(page,5)
            await page.locator("#step-4").screenshot(path=str(ROOT/".cache/world.png"))
            await check_phone_viewer(page,"#step-3")
            await page.get_by_role("button",name="Conversar sobre a descoberta").click()
            await absent_from(page,6)
            await expect(page.get_by_role("button",name="Concluir e levar para casa")).to_be_disabled()
            await page.get_by_role("button",name="Ativar ou desativar voz").click()
            await page.get_by_role("button",name="Para que serve repetir?",exact=True).click()
            await expect(page.get_by_role("button",name="Concluir e levar para casa")).to_be_enabled()
            await absent_from(page,6)
            await page.locator("#step-5").screenshot(path=str(ROOT/".cache/dialogue.png"))
            await check_phone_viewer(page,"#step-5")
            await page.get_by_role("button",name="Concluir e levar para casa").click()
            await expect(page.locator("#step-6")).to_be_visible()
            pdf=await page.locator("#step-6 a[download]").get_attribute("href")
            response=await page.request.get(BASE+pdf)
            assert response.status==200 and (await response.body()).startswith(b"%PDF")
            await page.locator("footer").screenshot(path=str(ROOT/".cache/footer-desktop.png"))
            for scene,name in [("forest","Bosque das ideias"),("village","Vila das descobertas"),("garden","Jardim das estrelas")]:
                await page.get_by_role("button",name=name,exact=True).click()
                await absent_from(page,4)
                await run_scratch(page,scene)
                await page.locator("#step-3 .stage-mode-button").click()
                await expect(page.get_by_role("button",name="Conversar sobre a descoberta")).to_be_enabled(timeout=15000)
                await absent_from(page,5)
                print("SCENE PASSED",scene,flush=True)
            # Re-running an unchanged program also hides its old 3D result immediately.
            await run_scratch(page,"garden")
            assert not errors,errors
            print("PASS: gates, eight mobile family squares, carousel desktop/mobile/PT/EN, unified stage dimensions/help, high resolution costumes/SB3, fullscreen and fallback viewers, credit, real Scratch + WebGL; tutor response mocked.",flush=True)
        except Exception:
            await page.screenshot(path=str(ROOT/".cache/failure.png"))
            print("PAGE ERRORS",json.dumps(errors),flush=True)
            raise
        finally:
            await browser.close()

asyncio.run(main())
