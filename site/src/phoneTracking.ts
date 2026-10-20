/**
 * ScratchXR — Phone position tracking with the locally hosted 8th Wall engine.
 * Subsistema: EDU. Depende de: Three, XR8 binary. Usado por: World, WorldView.
 * Adapts the Cardboard tracking and origin rebasing from the user's Logvesp.
 */
import {PerspectiveCamera,Quaternion,Vector3} from 'three';

export type PhoneTrackingStatus='loading'|'tracking'|'limited'|'camera-denied'|'camera-error'|'sensors-denied'|'insecure'|'unavailable'|'error';
export interface PhoneReality {
  position:{x:number;y:number;z:number};
  rotation:{x:number;y:number;z:number;w:number};
  trackingStatus?:string;
}
interface PipelineModule {
  name:string;
  onStart?:()=>void;
  onUpdate?:(args:{processCpuResult:{reality?:PhoneReality}})=>void;
  onRender?:()=>void;
  onCameraStatusChange?:(args:{status:string})=>void;
  onException?:(error:unknown)=>void;
  onPaused?:()=>void;
}
interface PhoneEngine {
  XrController:{pipelineModule:()=>PipelineModule;configure:(options:{disableWorldTracking:boolean;scale:'absolute'})=>void};
  XrConfig:{device:()=>{MOBILE:string}};
  addCameraPipelineModules:(modules:PipelineModule[])=>void;
  clearCameraPipelineModules:()=>void;
  run:(options:{canvas:HTMLCanvasElement;allowedDevices:string;webgl2:boolean})=>void|Promise<void>;
  stop:()=>void;
}
declare global {interface Window {XR8?:PhoneEngine}}

export const phoneTrackingAvailable=()=>navigator.maxTouchPoints>0||/Android|iPhone|iPad/i.test(navigator.userAgent);
let engineLoad:Promise<PhoneEngine>|undefined;
let owner:PhoneTracking|undefined;

export function loadPhoneEngine():Promise<PhoneEngine>{
  if(window.XR8?.XrController)return Promise.resolve(window.XR8);
  if(engineLoad)return engineLoad;
  engineLoad=new Promise<PhoneEngine>((resolve,reject)=>{
    let script=document.querySelector<HTMLScriptElement>('script[data-scratchxr-tracking]');
    const created=!script;
    if(!script){script=document.createElement('script');script.src='/xr8/xr.js';script.async=true;script.dataset.preloadChunks='slam';script.dataset.scratchxrTracking='true';}
    const cleanup=()=>{clearInterval(poll);clearTimeout(timeout);window.removeEventListener('xrloaded',ready);script.removeEventListener('error',failed);};
    const ready=()=>{if(window.XR8?.XrController){cleanup();resolve(window.XR8);}};
    const failed=()=>{cleanup();script.remove();reject(new Error('Phone tracking engine unavailable'));};
    const poll=setInterval(ready,100),timeout=setTimeout(failed,15000);
    window.addEventListener('xrloaded',ready);script.addEventListener('error',failed,{once:true});
    if(created)document.head.appendChild(script);
    ready();
  }).catch(error=>{engineLoad=undefined;throw error;});
  return engineLoad;
}

function yaw(q:Quaternion){const forward=new Vector3(0,0,-1).applyQuaternion(q);return Math.atan2(-forward.x,-forward.z);}

/** Maps metre-based SLAM positions into the scene, keeping gravity and continuity. */
export class PhonePose {
  private origin?:Vector3;
  private lastRaw=new Vector3();
  private correction=new Quaternion();
  private recovering=false;
  private base:Vector3;
  constructor(position:Vector3,private facing:Quaternion){this.base=position.clone();this.facing=facing.clone();}
  lost(){this.recovering=true;}
  apply(reality:PhoneReality,camera:PerspectiveCamera):boolean{
    const p=reality.position,q=reality.rotation;
    if(!p||!q||![p.x,p.y,p.z,q.x,q.y,q.z,q.w].every(Number.isFinite)||
      q.x*q.x+q.y*q.y+q.z*q.z+q.w*q.w<.0001||reality.trackingStatus!=='NORMAL'){
      this.lost();return false;
    }
    const raw=new Vector3(p.x,p.y,p.z),rotation=new Quaternion(q.x,q.y,q.z,q.w).normalize();
    if(!this.origin){
      this.origin=raw.clone();
      this.correction.setFromAxisAngle(new Vector3(0,1,0),yaw(this.facing)-yaw(rotation));
    }else if(this.recovering||raw.distanceTo(this.lastRaw)>.75){
      this.correction.setFromAxisAngle(new Vector3(0,1,0),yaw(camera.quaternion)-yaw(rotation));
      this.origin.copy(raw).sub(camera.position.clone().sub(this.base).applyQuaternion(this.correction.clone().invert()));
    }
    this.recovering=false;this.lastRaw.copy(raw);
    camera.position.copy(raw).sub(this.origin).applyQuaternion(this.correction).add(this.base);
    camera.quaternion.copy(rotation).premultiply(this.correction);
    camera.updateMatrixWorld(true);
    return true;
  }
}

function sensorPermission():Promise<boolean>{
  const permissions=[window.DeviceOrientationEvent,window.DeviceMotionEvent].map(api=>{
    const sensor=api as {requestPermission?:()=>Promise<string>}|undefined;
    try{return sensor?.requestPermission?Promise.resolve(sensor.requestPermission()).then(value=>value==='granted',()=>false):Promise.resolve(true);}
    catch{return Promise.resolve(false);}
  });
  return Promise.all(permissions).then(results=>results.every(Boolean));
}

/** Owns exactly one camera pipeline; stop also cancels late permission results. */
export class PhoneTracking {
  private active=false;
  private engine?:PhoneEngine;
  private status?:PhoneTrackingStatus;
  private timeout?:ReturnType<typeof setTimeout>;
  private watchdog?:ReturnType<typeof setInterval>;
  private lastPose=0;
  private canvasStyle:string|null=null;
  private pose:PhonePose;
  constructor(private canvas:HTMLCanvasElement,private camera:PerspectiveCamera,private callbacks:{
    status:(status:PhoneTrackingStatus)=>void;
    sensors:(allowed:boolean)=>void;
    pose:()=>void;
    running:(active:boolean)=>void;
    render:()=>void;
  }){this.pose=new PhonePose(camera.position,camera.quaternion);}
  private report(status:PhoneTrackingStatus){if(this.active&&status!==this.status){this.status=status;this.callbacks.status(status);}}
  start(){
    if(this.active)return;
    this.active=true;
    const sensors=sensorPermission();
    void sensors.then(allowed=>this.callbacks.sensors(allowed));
    if(window.isSecureContext===false){this.fail('insecure');return;}
    if(!phoneTrackingAvailable()||!navigator.mediaDevices?.getUserMedia){this.fail('unavailable');return;}
    this.report('loading');
    // iOS motion permission needs this tap. XR8 opens the camera once, after loading;
    // opening a warm-up stream and immediately reopening it can interrupt Safari.
    void this.initialize(sensors);
  }
  private async initialize(sensors:Promise<boolean>){
    try{
      const [engine,allowed]=await Promise.all([loadPhoneEngine(),sensors]);
      if(!this.active)return;
      if(!allowed){this.fail('sensors-denied');return;}
      owner?.stop();owner=this;this.engine=engine;
      this.canvasStyle=this.canvas.getAttribute('style');
      const module:PipelineModule={
        name:'scratchxr-phone',
        onStart:()=>{if(this.active){clearTimeout(this.timeout);this.report('limited');}},
        onCameraStatusChange:({status})=>{if(this.active&&status==='failed')this.fail('camera-error');},
        onException:error=>{if(this.active)this.fail((error as {name?:string})?.name==='NotAllowedError'?'camera-denied':'error');},
        onPaused:()=>{this.pose.lost();this.report('limited');},
        onUpdate:({processCpuResult})=>{
          if(!this.active)return;
          const reality=processCpuResult?.reality;
          if(reality&&this.pose.apply(reality,this.camera)){
            this.lastPose=performance.now();clearTimeout(this.timeout);
            this.callbacks.pose();this.report('tracking');
          }else{this.pose.lost();this.report('limited');}
        },
        onRender:()=>{if(this.active)this.callbacks.render();},
      };
      engine.clearCameraPipelineModules();
      engine.XrController.configure({disableWorldTracking:false,scale:'absolute'});
      engine.addCameraPipelineModules([engine.XrController.pipelineModule(),module]);
      this.callbacks.running(true);
      // Detect a stalled startup, not a camera still mapping a feature-poor room.
      this.timeout=setTimeout(()=>this.fail('error'),45000);
      this.watchdog=setInterval(()=>{
        if(this.lastPose&&performance.now()-this.lastPose>1500){this.pose.lost();this.report('limited');}
      },500);
      await engine.run({canvas:this.canvas,allowedDevices:engine.XrConfig.device().MOBILE,webgl2:true});
    }catch(error){if(this.active)this.fail((error as {name?:string})?.name==='NotAllowedError'?'camera-denied':'error');}
  }
  private fail(status:PhoneTrackingStatus){
    this.report(status);this.stop();
  }
  stop(){
    this.active=false;clearTimeout(this.timeout);clearInterval(this.watchdog);
    if(owner===this){
      owner=undefined;
      try{this.engine?.stop();}catch{/* Finish local cleanup even after an engine failure. */}
      this.engine?.clearCameraPipelineModules();
      if(this.canvasStyle===null)this.canvas.removeAttribute('style');else this.canvas.setAttribute('style',this.canvasStyle);
      this.callbacks.running(false);
    }
    this.engine=undefined;
  }
}
