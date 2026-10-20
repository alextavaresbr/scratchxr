"""Real Scratch speech timing, bounded conversation orbit and N00 attention.

XR camera positions in the final attention checks are controlled inputs, not
physical headset tracking. The VM, models, mixers and attention are real.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT=Path(__file__).resolve().parents[1]

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=["--ignore-certificate-errors"])
        page=await browser.new_page(ignore_https_errors=True,viewport={"width":1440,"height":1000})
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        try:
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
            await page.evaluate("""async()=>{
              const vm=window.__scratchxr.vm,project=JSON.parse(vm.toJSON()),sprite=project.targets.find(t=>!t.isStage);
              const b=(opcode,next,parent,inputs={})=>({opcode,next,parent,inputs,fields:{},shadow:false,topLevel:!parent,x:30,y:30});
              const number=v=>[1,[4,String(v)]],text=v=>[1,[10,v]];
              sprite.blocks={
                flag:b('event_whenflagclicked','wait',null),
                wait:b('control_wait','say','flag',{DURATION:number(.4)}),
                say:b('looks_sayforsecs','pause','wait',{MESSAGE:text('Primeira fala'),SECS:number(.4)}),
                pause:b('control_wait','last','say',{DURATION:number(.4)}),
                last:b('looks_say',null,'pause',{MESSAGE:text('Fala final')})
              };
              await vm.loadProject(JSON.stringify(project));
              const source=await(await fetch('/src/WorldView.tsx')).text();
              const moduleUrl=source.match(/from\\s+["']([^"']*\\/World\\.ts[^"']*)["']/)[1];
              const {World}=await import(moduleUrl),original=World.prototype.setConversation;
              World.prototype.setConversation=function(...args){window.__qaConversation=this;return original.apply(this,args);};
            }""")
            stage=page.locator("#step-3 .unified-stage")
            for attempt in range(2):
                await page.evaluate("()=>{const vm=window.__scratchxr.vm;vm.runtime.emit('SAY',vm.editingTarget,'say','Texto anterior');}")
                await page.locator(".run-button").click()
                assert await page.evaluate("window.__scratchxr.vm.editingTarget.getCustomState('Scratch.looks').text")==""
                await expect(page.locator(".run-button")).to_be_enabled(timeout=10000)
                trace=await page.evaluate("window.__scratchxr.getTrace()")
                changes=[]
                for frame in trace["frames"]:
                    value=frame["actors"][0]["text"]
                    if not changes or changes[-1][1]!=value: changes.append([frame["t"],value])
                assert [c[1] for c in changes]==["","Primeira fala","","Fala final"],changes
                assert changes[1][0]>=350 and changes[2][0]-changes[1][0]>=350,changes
                assert changes[3][0]-changes[2][0]>=350,changes
                await stage.locator(".stage-mode-button").click()
                bubble=stage.locator(".world-bubble")
                await expect(bubble).to_have_count(0)
                await expect(bubble).to_have_text("Primeira fala")
                await expect(bubble).to_have_count(0)
                await expect(bubble).to_have_text("Fala final")
                # Replay the exact recording; no cached caption during model setup.
                await stage.get_by_role("button",name="Reproduzir",exact=True).click()
                await expect(bubble).to_have_count(0)
                await expect(bubble).to_have_text("Fala final")
                await stage.locator(".stage-mode-button").click()
                assert await bubble.count()==0
                print("SPEECH",attempt,changes,flush=True)
            # A new program without say/think must remain silent.
            await page.evaluate("""async()=>{
              const vm=window.__scratchxr.vm,p=JSON.parse(vm.toJSON()),b=p.targets.find(t=>!t.isStage).blocks;
              b.wait.next=null;delete b.say;delete b.pause;delete b.last;
              await vm.loadProject(JSON.stringify(p));
            }""")
            await page.locator(".run-button").click()
            await expect(page.locator(".run-button")).to_be_enabled()
            assert await page.evaluate("window.__scratchxr.getTrace().frames.every(f=>f.actors.every(a=>!a.text))")
            await stage.locator(".stage-mode-button").click()
            await expect(page.get_by_role("button",name="Conversar sobre a descoberta")).to_be_enabled()
            await expect(stage.locator(".world-bubble")).to_have_count(0)
            await page.get_by_role("button",name="Conversar sobre a descoberta").click()
            await page.wait_for_function("window.__qaConversation?.actors.size===1")
            view=page.locator("#step-5 .world-canvas")
            await view.scroll_into_view_if_needed()
            await page.wait_for_timeout(700)
            state="(()=>{const w=window.__qaConversation;return {distance:w.camera.position.distanceTo(w.controls.target),azimuth:w.controls.getAzimuthalAngle(),polar:w.controls.getPolarAngle()};})()"
            initial=await page.evaluate(state)
            assert abs(initial["distance"]-1.8)<1e-6,initial
            box=await view.bounding_box()
            await page.mouse.move(box["x"]+box["width"]/2,box["y"]+box["height"]/2)
            await page.mouse.wheel(0,-1000)
            await page.wait_for_timeout(200)
            assert abs((await page.evaluate(state))["distance"]-1.8)<1e-6
            # Real pointer drags must rotate horizontally and tilt downward.
            await view.scroll_into_view_if_needed()
            box=await view.bounding_box()
            x=box["x"]+box["width"]/2;y=box["y"]+box["height"]/2
            await page.mouse.move(x,y);await page.mouse.down()
            await page.mouse.move(x+250,y+130,steps=12);await page.mouse.up()
            await page.wait_for_timeout(700)
            rotated=await page.evaluate(state)
            assert .05<abs(rotated["azimuth"])<=50*3.141592654/180+.001,rotated
            assert initial["polar"]-20*3.141592654/180-.001<=rotated["polar"]<initial["polar"]-.01,rotated
            assert abs(rotated["distance"]-1.8)<1e-6,rotated
            await page.locator("#step-5 .world-panel").screenshot(path=str(ROOT/".cache/conversation-orbit.png"))
            # Restore the front view and check native fullscreen exit keeps orbit limits.
            await page.evaluate("window.__qaConversation.frameConversation()")
            await page.wait_for_timeout(700)
            await page.locator("#step-5 .world-panel").screenshot(path=str(ROOT/".cache/conversation-close.png"))
            await page.locator("#step-5").get_by_role("button",name="Visor de celular",exact=True).click()
            await expect(page.locator(".stereo-active")).to_have_count(1)
            await page.get_by_role("button",name="Sair do visor",exact=True).click()
            await page.wait_for_function("!document.fullscreenElement && !document.querySelector('.stereo-active')")
            assert abs((await page.evaluate(state))["distance"]-1.8)<1e-6
            # Audit all three real models: left/right, behind, transforms, XR target.
            report=await page.evaluate("""async()=>{
              const w=window.__qaConversation,T=await import('/node_modules/.vite/deps/three.js');
              w.renderer.setAnimationLoop(null);const report=[];
              for(const id of ['avatar-a','avatar-b','avatar-c']){
                await w.setAvatar(id);
                const a=[...w.actors.values()][0],feet=['LeftFoot','RightFoot'].map(n=>a.body.getObjectByName(n));
                a.mixer.update(.1);a.body.updateWorldMatrix(true,true);
                const before=feet.map(b=>b.getWorldPosition(new T.Vector3()));
                const target=new T.Vector3(),head=a.body.getObjectByName('Head');
                const settle=(x,y,z)=>{
                  target.set(x,y,z);
                  for(let i=0;i<120;i++){a.attention.beforeMixer();a.attention.update(1/60,target,i*1000/60);}
                  return a.attention.state;
                };
                const right=settle(1.5,1.5,2),left=settle(-1.5,1.5,2),rear=settle(0,1.5,-2);
                if(!right.tracking||right.yaw<.2||left.yaw>-.2||rear.tracking||Math.abs(rear.yaw)>.01)throw Error(id+': gaze directions');
                feet.forEach((b,i)=>{if(b.getWorldPosition(new T.Vector3()).distanceTo(before[i])>1e-7)throw Error('Attention moved feet');});
                a.body.traverse(m=>{if(m.morphTargetInfluences&&!m.morphTargetInfluences.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid morph weight');});
                const savedRender=w.renderer.render,savedCamera=w.renderer.xr.getCamera;
                const xrCamera=new T.PerspectiveCamera();xrCamera.position.set(1.5,1.5,2);
                w.camera.position.set(-1.5,1.5,2);w.renderer.xr.isPresenting=true;
                w.renderer.xr.getCamera=()=>xrCamera;w.renderer.render=()=>{};
                let time=performance.now();
                for(let i=0;i<120;i++)w.draw(time+i*1000/60);
                if(a.attention.state.yaw<.2)throw Error('Gaze used desktop camera instead of XR viewer');
                w.renderer.xr.isPresenting=false;w.renderer.xr.getCamera=savedCamera;
                w.stereo=true;w.hasPhonePose=true;w.camera.position.set(-1.5,1.5,2);
                for(let i=0;i<120;i++)w.draw(time+2000+i*1000/60);
                if(a.attention.state.yaw>-.2)throw Error('Cardboard gaze did not follow supplied position');
                w.stereo=false;w.hasPhonePose=false;w.renderer.render=savedRender;
                w.frameConversation();report.push({id,right,left,rear});
              }
              return report;
            }""")
            print("CONVERSATION",json.dumps({"orbit":rotated,"gaze":report}),flush=True)
            assert not errors,errors
            print("PASS: speech reset/timed clear/no-speech; 1.8m fixed zoom, 100-degree front orbit and 20-degree downward tilt; N00 head/iris tracking and XR camera selection.",flush=True)
        except Exception:
            await page.screenshot(path=str(ROOT/".cache/conversation-failure.png"))
            print("ERRORS",errors,flush=True)
            raise
        finally:
            await browser.close()

asyncio.run(main())
