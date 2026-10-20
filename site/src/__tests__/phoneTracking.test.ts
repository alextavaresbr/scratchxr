/**
 * ScratchXR — Positional tracking continuity and camera lifecycle regression.
 * Subsistema: EDU. Depende de: Vitest, Three, phoneTracking. Usado por: npm test.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {PerspectiveCamera,Quaternion,Vector3} from 'three';
import {PhonePose,PhoneTracking,type PhoneReality} from '../phoneTracking';

const reality=(x=0,y=0,z=0,rotation=new Quaternion(),trackingStatus='NORMAL'):PhoneReality=>({
  position:{x,y,z},rotation:{x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w},trackingStatus,
});
function camera(){const result=new PerspectiveCamera();result.position.set(0,1.6,5);return result;}
function position(actual:Vector3,expected:number[]){actual.toArray().forEach((value,i)=>expect(value).toBeCloseTo(expected[i],7));}

describe('phone SLAM pose',()=>{
  it('moves the scene camera in metres along all three axes',()=>{
    const cam=camera(),mapper=new PhonePose(cam.position,cam.quaternion);
    expect(mapper.apply(reality(2,1,3),cam)).toBe(true);
    position(cam.position,[0,1.6,5]);
    mapper.apply(reality(2.2,1.1,2.6),cam);
    position(cam.position,[.2,1.7,4.6]);
  });
  it('rotates translation into the initial scene heading, preserving pitch',()=>{
    const cam=camera();cam.quaternion.setFromAxisAngle(new Vector3(0,1,0),Math.PI/2);
    const mapper=new PhonePose(cam.position,cam.quaternion);
    mapper.apply(reality(),cam);mapper.apply(reality(0,0,-.2),cam);
    position(cam.position,[-.2,1.6,5]);
    const pitch=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.4);
    mapper.apply(reality(0,0,-.2,pitch),cam);
    const expected=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/2).multiply(pitch);
    expect(cam.quaternion.angleTo(expected)).toBeCloseTo(0,7);
  });
  it('absorbs a SLAM origin reset without teleporting, then resumes translation',()=>{
    const cam=camera(),mapper=new PhonePose(cam.position,cam.quaternion);
    mapper.apply(reality(),cam);mapper.apply(reality(.2),cam);
    mapper.apply(reality(10),cam);position(cam.position,[.2,1.6,5]);
    mapper.apply(reality(10.1),cam);position(cam.position,[.3,1.6,5]);
  });
  it('holds position while tracking is limited and rebases on recovery',()=>{
    const cam=camera(),mapper=new PhonePose(cam.position,cam.quaternion);
    mapper.apply(reality(),cam);mapper.apply(reality(.2),cam);
    expect(mapper.apply(reality(.4,0,0,new Quaternion(),'LIMITED'),cam)).toBe(false);
    position(cam.position,[.2,1.6,5]);
    mapper.apply(reality(.7),cam);position(cam.position,[.2,1.6,5]);
    mapper.apply(reality(.8),cam);position(cam.position,[.3,1.6,5]);
  });
  it('rejects corrupt positions and rotations without moving the view',()=>{
    const cam=camera(),mapper=new PhonePose(cam.position,cam.quaternion);
    expect(mapper.apply(reality(NaN),cam)).toBe(false);
    expect(mapper.apply(reality(0,0,0,new Quaternion(0,0,0,0)),cam)).toBe(false);
    position(cam.position,[0,1.6,5]);
  });
});

const sessions:PhoneTracking[]=[];
afterEach(()=>{sessions.forEach(session=>session.stop());sessions.length=0;vi.unstubAllGlobals();vi.useRealTimers();});
function fixture(){
  vi.useFakeTimers();
  let pipeline:any;
  const engine={
    XrController:{pipelineModule:vi.fn(()=>({name:'slam'})),configure:vi.fn()},
    XrConfig:{device:()=>({MOBILE:'mobile'})},
    addCameraPipelineModules:vi.fn((modules:any[])=>{pipeline=modules[1];}),
    clearCameraPipelineModules:vi.fn(),run:vi.fn(),stop:vi.fn(),
  };
  const getUserMedia=vi.fn();
  vi.stubGlobal('window',{XR8:engine});
  vi.stubGlobal('navigator',{maxTouchPoints:1,userAgent:'Android',mediaDevices:{getUserMedia}});
  const styles=new Map([['style','width: 390px; height: 844px;']]);
  const canvas={getAttribute:(key:string)=>styles.get(key)??null,setAttribute:(key:string,value:string)=>styles.set(key,value),removeAttribute:(key:string)=>styles.delete(key)} as unknown as HTMLCanvasElement;
  const callbacks={status:vi.fn(),sensors:vi.fn(),pose:vi.fn(),running:vi.fn(),render:vi.fn()};
  const cam=camera(),session=new PhoneTracking(canvas,cam,callbacks);sessions.push(session);
  return {engine,getUserMedia,canvas,callbacks,session,cam,pipeline:()=>pipeline};
}
describe('phone camera pipeline',()=>{
  it('lets XR8 open the camera once, uses absolute scale and reports actual poses',async()=>{
    const f=fixture();f.session.start();
    expect(f.getUserMedia).not.toHaveBeenCalled();
    await vi.waitFor(()=>expect(f.engine.run).toHaveBeenCalledOnce());
    expect(f.engine.XrController.configure).toHaveBeenCalledWith({disableWorldTracking:false,scale:'absolute'});
    expect(f.engine.run).toHaveBeenCalledWith({canvas:f.canvas,allowedDevices:'mobile',webgl2:true});
    f.pipeline().onStart();
    expect(f.callbacks.status).toHaveBeenLastCalledWith('limited');
    f.pipeline().onUpdate({processCpuResult:{reality:reality()}});
    f.pipeline().onUpdate({processCpuResult:{reality:reality(0,0,-.3)}});
    position(f.cam.position,[0,1.6,4.7]);
    expect(f.callbacks.status).toHaveBeenLastCalledWith('tracking');
    f.session.stop();
    expect(f.engine.stop).toHaveBeenCalledOnce();
    expect(f.callbacks.running).toHaveBeenLastCalledWith(false);
    f.pipeline().onUpdate({processCpuResult:{reality:reality(0,0,-.6)}});
    position(f.cam.position,[0,1.6,4.7]);
  });
  it('ignores a sensor permission granted after exiting, without opening the camera',async()=>{
    let resolve!:(permission:string)=>void;
    const f=fixture();
    Object.assign(window,{DeviceOrientationEvent:{requestPermission:()=>new Promise(r=>{resolve=r;})}});
    f.session.start();f.session.stop();resolve('granted');
    await vi.waitFor(()=>expect(f.callbacks.sensors).toHaveBeenCalledWith(true));
    expect(f.engine.run).not.toHaveBeenCalled();
  });
  it('reports camera denial and keeps sensor permission available for orientation',async()=>{
    const f=fixture();f.engine.run.mockRejectedValueOnce({name:'NotAllowedError'});f.session.start();
    await vi.waitFor(()=>expect(f.callbacks.status).toHaveBeenLastCalledWith('camera-denied'));
    expect(f.engine.stop).toHaveBeenCalledOnce();
    expect(f.callbacks.sensors).toHaveBeenCalledWith(true);
  });
  it('stops camera resources and restores the render loop after an engine error',async()=>{
    const f=fixture();f.session.start();
    await vi.waitFor(()=>expect(f.engine.run).toHaveBeenCalledOnce());
    f.canvas.setAttribute('style','height: 20px;');
    f.pipeline().onException(new Error('camera lost'));
    expect(f.engine.stop).toHaveBeenCalledOnce();
    expect(f.canvas.getAttribute('style')).toBe('width: 390px; height: 844px;');
    expect(f.callbacks.running).toHaveBeenLastCalledWith(false);
    expect(f.callbacks.status).toHaveBeenLastCalledWith('error');
    f.pipeline().onRender();
    expect(f.callbacks.render).not.toHaveBeenCalled();
  });
  it('keeps mapping after 30 seconds of limited tracking and accepts a later valid pose',async()=>{
    const f=fixture();f.session.start();
    await vi.waitFor(()=>expect(f.engine.run).toHaveBeenCalledOnce());
    f.pipeline().onStart();
    f.pipeline().onUpdate({processCpuResult:{reality:reality(0,0,0,new Quaternion(),'LIMITED')}});
    expect(f.callbacks.status).toHaveBeenLastCalledWith('limited');
    expect(f.callbacks.pose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60000);
    expect(f.callbacks.status).toHaveBeenLastCalledWith('limited');
    expect(f.engine.stop).not.toHaveBeenCalled();
    f.pipeline().onUpdate({processCpuResult:{reality:reality()}});
    expect(f.callbacks.status).toHaveBeenLastCalledWith('tracking');
  });
  it('reports a stalled startup as an error, not unsupported hardware',async()=>{
    const f=fixture();f.session.start();
    await vi.waitFor(()=>expect(f.engine.run).toHaveBeenCalledOnce());
    vi.advanceTimersByTime(45000);
    expect(f.callbacks.status).toHaveBeenLastCalledWith('error');
    expect(f.engine.stop).toHaveBeenCalledOnce();
  });
  it('distinguishes a camera failure from unavailable browser access',async()=>{
    const f=fixture();f.session.start();
    await vi.waitFor(()=>expect(f.engine.run).toHaveBeenCalledOnce());
    f.pipeline().onCameraStatusChange({status:'failed'});
    expect(f.callbacks.status).toHaveBeenLastCalledWith('camera-error');
    expect(f.engine.stop).toHaveBeenCalledOnce();
  });
  it('explains an insecure connection before starting XR8',()=>{
    const f=fixture();Object.assign(window,{isSecureContext:false});f.session.start();
    expect(f.callbacks.status).toHaveBeenLastCalledWith('insecure');
    expect(f.engine.run).not.toHaveBeenCalled();
  });
});
