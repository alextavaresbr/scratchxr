"""Load the real XR8 binary with fake camera input; verify World with supplied poses.

This checks integration, permissions and cleanup. It does not validate physical SLAM.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=[
            "--ignore-certificate-errors","--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
        ])
        context=await browser.new_context(
            viewport={"width":844,"height":390},ignore_https_errors=True,
            is_mobile=True,has_touch=True,device_scale_factor=1,
            user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
            permissions=["camera"],
        )
        page=await context.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.on("console",lambda message:errors.append(message.text) if message.type=="error" and "THREE.WebGLProgram" in message.text else None)
        await page.goto("https://localhost:4310",wait_until="networkidle")
        # A real World and real binary, isolated from the gated lesson only for QA.
        await page.evaluate("""async()=>{
          const {World}=await import('/src/World.ts');
          const {loadPhoneEngine}=await import('/src/phoneTracking.ts');
          const host=document.createElement('div');
          host.style.cssText='position:fixed;inset:0;width:100vw;height:100dvh;z-index:2000';
          document.body.appendChild(host);
          window.__qaWorld=new World(host,()=>{},()=>{},()=>{});
          window.__qaStreams=[];window.__qaCameraErrors=[];
          const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia=async options=>{
            // Chromium's synthetic camera has no "environment" facingMode.
            // Only this harness relaxes that constraint; production still uses the rear camera.
            const fakeOptions=structuredClone(options);
            if(typeof fakeOptions.video==='object')delete fakeOptions.video.facingMode;
            try{const stream=await get(fakeOptions);window.__qaStreams.push(stream);return stream;}
            catch(error){window.__qaCameraErrors.push({name:error.name,message:error.message,constraint:error.constraint,options});throw error;}
          };
          window.__qaXR8=await loadPhoneEngine();
          window.__qaFrames=0;
          const add=window.__qaXR8.addCameraPipelineModules;
          window.__qaXR8.addCameraPipelineModules=modules=>{
            for(const module of modules)if(module.name==='scratchxr-phone'){
              const render=module.onRender;
              module.onRender=()=>{window.__qaFrames++;render?.();};
            }
            return add(modules);
          };
          const run=window.__qaXR8.run;
          window.__qaXR8.run=options=>{window.__qaRan=true;return run(options);};
          const open=document.createElement('button');
          open.textContent='Open phone viewer';
          open.style.cssText='position:fixed;top:0;right:0;z-index:3000';
          open.onclick=()=>window.__qaWorld.enterStereo(status=>window.__qaStatus=status);
          document.body.appendChild(open);
        }""")
        assert await page.evaluate("!!window.XR8?.XrController")
        await page.get_by_role("button",name="Open phone viewer").click()
        await page.wait_for_function("window.__qaRan || ['error','camera-denied','unavailable'].includes(window.__qaStatus)",timeout=20000)
        await page.wait_for_timeout(2000)
        real=await page.evaluate("""()=>({
          loaded:!!window.XR8.XrController,run:!!window.__qaRan,status:window.__qaStatus,
          canvas:[window.__qaWorld.renderer.domElement.width,window.__qaWorld.renderer.domElement.height],
          cameraErrors:window.__qaCameraErrors,frames:window.__qaFrames
        })""")
        print("REAL ENGINE, SYNTHETIC CAMERA",json.dumps(real),flush=True)
        assert real["loaded"] and real["run"],real
        assert real["frames"]>0 and real["status"] in ["tracking","limited"],real
        await page.evaluate("window.__qaWorld.exitStereo()")
        await page.wait_for_function("window.__qaStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
        # Keep real Three.js/skinning/rendering, replace only camera pose production.
        await page.evaluate("""()=>{
          let modules=[],raf;
          const frame=()=>{modules.forEach(m=>m.onRender?.());raf=requestAnimationFrame(frame);};
          window.XR8={
            XrController:{pipelineModule:()=>({name:'qa-slam'}),configure:options=>window.__qaConfig=options},
            XrConfig:{device:()=>({MOBILE:'mobile'})},
            clearCameraPipelineModules:()=>{modules=[];},
            addCameraPipelineModules:value=>{modules=value;window.__qaPipeline=value[1];},
            run:()=>{modules.forEach(m=>m.onStart?.());frame();},
            stop:()=>cancelAnimationFrame(raf)
          };
          window.__qaPose=(x,y,z,status='NORMAL')=>window.__qaPipeline.onUpdate({
            processCpuResult:{reality:{position:{x,y,z},rotation:{x:0,y:0,z:0,w:1},trackingStatus:status}}
          });
          window.__qaBefore={
            position:window.__qaWorld.camera.position.toArray(),
            rotation:window.__qaWorld.camera.quaternion.toArray()
          };
        }""")
        await page.get_by_role("button",name="Open phone viewer").click()
        await page.wait_for_function("!!window.__qaPipeline")
        assert await page.evaluate("window.__qaConfig.scale")=="absolute"
        await page.evaluate("window.__qaPose(0,0,0)")
        await page.evaluate("window.__qaPose(.25,.1,-.3)")
        movement=await page.evaluate("window.__qaWorld.camera.position.toArray()")
        for actual,expected in zip(movement,[.25,1.7,4.7]):
            assert abs(actual-expected)<1e-6,movement
        await page.evaluate("window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:90,beta:0,gamma:0}))")
        await page.wait_for_timeout(100)
        rotation=await page.evaluate("window.__qaWorld.camera.quaternion.toArray()")
        assert rotation==[0,0,0,1],rotation
        await page.evaluate("window.__qaPose(10,1,10)")
        rebased=await page.evaluate("window.__qaWorld.camera.position.toArray()")
        for actual,expected in zip(rebased,movement):
            assert abs(actual-expected)<1e-6,(rebased,movement)
        # XR8 can use a camera-shaped buffer while CSS stretches it to the screen.
        # Verify perspective from displayed dimensions and lens centres from the
        # actual split, including rotated cameras and non-unit pixel density.
        await page.evaluate("""async()=>{
          const T=await import('/node_modules/.vite/deps/three.js'),world=window.__qaWorld;
          const render=world.renderer.render.bind(world.renderer);
          window.__qaEyes=[];
          world.renderer.render=(scene,eye)=>{
            render(scene,eye);
            if(![world.stereoCamera.cameraL,world.stereoCamera.cameraR].includes(eye))return;
            const viewport=world.renderer.getViewport(new T.Vector4());
            const scissor=world.renderer.getScissor(new T.Vector4());
            const target=new T.Vector3(0,0,-world.camera.focus).applyMatrix4(world.camera.matrixWorld).project(eye);
            window.__qaEyes.push({viewport:viewport.toArray(),scissor:scissor.toArray(),target:target.toArray(),
              aspect:eye.projectionMatrix.elements[5]/eye.projectionMatrix.elements[0]});
            window.__qaEyes=window.__qaEyes.slice(-2);
          };
          world.camera.quaternion.setFromEuler(new T.Euler(.25,.6,-.2));
          world.renderer.setPixelRatio(1.5);
        }""")
        for width,height,buffer_width,buffer_height in [(844,390,640,480),(390,844,1536,2048),(844,390,1266,585)]:
            await page.set_viewport_size({"width":width,"height":height})
            await page.wait_for_timeout(100)
            await page.evaluate("""size=>{
              const canvas=window.__qaWorld.renderer.domElement;
              canvas.width=size[0];canvas.height=size[1];window.__qaEyes=[];
            }""",[buffer_width,buffer_height])
            await page.wait_for_function("window.__qaEyes.length===2")
            eyes=await page.evaluate("window.__qaEyes")
            for index,eye in enumerate(eyes):
                assert abs(eye["aspect"]-width/(2*height))<1e-6,eyes
                assert abs(eye["scissor"][0]-index*buffer_width/3)<1e-5,eyes
                assert abs(eye["scissor"][2]-buffer_width/3)<1e-5,eyes
                screen_x=(eye["viewport"][0]+(eye["target"][0]+1)*eye["viewport"][2]/2)/(buffer_width/1.5)*width
                expected=width*((.25+90/844) if index==0 else (.75-90/844))
                assert abs(screen_x-expected)<.01,(width,eyes,screen_x,expected)
            assert abs(eyes[0]["target"][1]-eyes[1]["target"][1])<1e-7,eyes
        await page.evaluate("window.__qaWorld.setStereoAlignment(.08)")
        await page.wait_for_function("Math.abs(window.__qaEyes[0].viewport[0]-844*.08)<.01")
        await page.screenshot(path=str(ROOT/".cache/phone-tracking-supplied-pose.png"))
        await page.evaluate("window.__qaWorld.exitStereo()")
        await page.wait_for_function("window.__qaStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
        restored=await page.evaluate("""()=>({
          before:window.__qaBefore,position:window.__qaWorld.camera.position.toArray(),
          rotation:window.__qaWorld.camera.quaternion.toArray()
        })""")
        for key in ["position","rotation"]:
            assert all(abs(a-b)<1e-6 for a,b in zip(restored[key],restored["before"][key])),restored
        # Exercise real playback/skinning with controlled render timestamps.
        # AR/VR presentation flags are supplied here; no physical XR session.
        loops=await page.evaluate("""async()=>{
          const w=window.__qaWorld,render=w.renderer.render;
          w.renderer.setAnimationLoop(null);
          const actor={id:'qa',avatar:'avatar-a',x:-90,y:0,direction:90,size:100,visible:true,text:'',costume:0,rotationStyle:'left-right'};
          const trace={duration:200,truncated:false,warnings:[],frames:[
            {t:0,order:0,scene:'forest',actors:[actor]},
            {t:200,order:1,scene:'forest',actors:[{...actor,x:90}]}
          ]},report=[];
          const assert=(ok,message)=>{if(!ok)throw Error(message);};
          for(const mode of ['flat','cardboard','vr','ar']){
            w.stereo=mode==='cardboard';w.renderer.xr.isPresenting=['ar','vr'].includes(mode);
            w.renderer.render=w.renderer.xr.isPresenting?()=>{}:render;
            await w.replay(trace);
            const end=w.replayAt+trace.duration;
            w.draw(end);assert(!w.playing,mode+': never finished');
            if(mode==='flat'){
              w.draw(end+5000);assert(!w.playing&&!w.repeatAt,'Flat view repeated');
            }else{
              assert(w.repeatAt===end+3000,mode+': wrong delay');
              w.draw(end+2999);assert(!w.playing,mode+': repeated early');
              w.draw(end+3000);assert(w.playing,mode+': failed to restart');
              assert(Math.abs([...w.actors.values()][0].root.position.x+1.5)<1e-6,mode+': did not rewind position');
              w.draw(end+3200);assert(w.repeatAt===end+6200,mode+': failed to schedule next cycle');
              w.stop();w.draw(end+6500);assert(!w.playing&&!w.repeatAt,mode+': stop failed');
              await w.replay(trace);w.draw(w.replayAt+200);
              await w.gesture();assert(!w.repeatAt,mode+': gesture did not cancel replay');
              if(mode==='cardboard'){
                await w.replay(trace);w.draw(w.replayAt+200);
                w.exitStereo();w.renderer.setAnimationLoop(null);
                assert(!w.repeatAt,'Exit left a pending replay');
              }
            }
            report.push(mode);
            w.stop();w.stereo=false;w.renderer.xr.isPresenting=false;
          }
          w.renderer.render=render;return report;
        }""")
        print("REPLAY: 3-second pause, rewind, repeated cycles, stop/gesture/exit cancellation",loops,flush=True)
        await page.evaluate("window.__qaWorld.dispose()")
        assert not errors,errors
        print("PASS: real XR8 assets/run/cleanup; supplied poses move World in XYZ; stereo keeps display aspect, lens alignment and equal vertical projection across rotation/buffer changes. Physical SLAM not tested.",flush=True)
        await browser.close()

asyncio.run(main())
