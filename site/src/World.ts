/**
 * ScratchXR — Shared desktop, WebXR and phone stereo presentation.
 * Subsistema: EDU. Depende de: Three, sceneAssets, trace. Usado por: WorldView.
 */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {sceneById,type SceneId} from './sceneAssets';
import {createEnvironment,addEnvironmentLights} from './sceneGeometry';
import {frameAt,worldPosition} from './trace';
import {text,type ActorState,type AvatarId,type Locale,type MotionData,type Trace} from './types';
import {captureBind,motionClip,type BindBone} from './generatedMotion';
import {plantedIdle} from './avatarIdle';
import {PhoneTracking,type PhoneTrackingStatus} from './phoneTracking';
import {addAvatarOutline} from './avatarOutline';
import {AvatarAttention} from './avatarAttention';
import type {VoicePhase} from './voiceCapture';
type Avatar={root:T.Group;body:T.Group;mixer:T.AnimationMixer;actions:Record<string,T.AnimationAction>;bind:BindBone[];current:string;position:T.Vector3;floor:number;movingUntil:number;disposeOutline:()=>void;attention:AvatarAttention};
export class World {
  renderer:T.WebGLRenderer;
  scene=new T.Scene();
  camera=new T.PerspectiveCamera(42,1,.05,300);
  controls:OrbitControls;
  content=new T.Group();
  private environment=new T.Group();
  private actors=new Map<string,Avatar>();
  private cache=new Map<AvatarId,Promise<{scene:T.Group;animations:T.AnimationClip[]}>>();
  private loader=new GLTFLoader();
  private resize:ResizeObserver;
  private seq=0;
  private actorSeq=0;
  private playbackRequest=0;
  private disposed=false;
  private trace?:Trace;
  private replayAt=0;
  private repeatAt=0;
  private playing=false;
  private last=0;
  private stereo=false;
  private stereoRequest=0;
  private stereoPose?:{position:T.Vector3;quaternion:T.Quaternion;target:T.Vector3;controlsEnabled:boolean;fov:number;focus:number};
  private phoneTracking?:PhoneTracking;
  private hasPhonePose=false;
  private stereoCamera=new T.StereoCamera();
  private stereoImageShift=90/844; // Lens alignment used by the iPhone 12 viewer in Logvesp.
  private orientation?:DeviceOrientationEvent;
  private orientHandler=(e:DeviceOrientationEvent)=>{this.orientation=e;};
  private activeScene:SceneId='forest';
  private selected:AvatarId='avatar-a';
  private generatedUntil=0;
  private speaking=false;
  private conversation=false;
  private viewerPosition=new T.Vector3();
  private floorOffsets:Record<string,number>={};
  private arSession=false;
  private hitSource?:XRHitTestSource;
  private hitPosition?:T.Vector3;
  private reticle=new T.Mesh(new T.RingGeometry(.12,.16,40).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x8d68f1,side:T.DoubleSide}));
  private tutorHud=new T.Group();
  private tutorCanvas=document.createElement('canvas');
  private tutorTexture=new T.CanvasTexture(this.tutorCanvas);
  private tutorText='';
  private voicePhase:VoicePhase='off';
  private tutorLocale:Locale='pt-BR';
  private tutorCallback?: (mode:'question'|'movement')=>void;
  private tutorButtons:T.Mesh[]=[];
  private controllers:T.Group[]=[];
  constructor(private host:HTMLElement,private onText:(text:string)=>void,private onState:(playing:boolean)=>void,private onError:(message:string)=>void,private onReplayComplete:()=>void=()=>{}){
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.1;this.renderer.xr.enabled=true;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.camera.position.set(7,5,10);this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.target.set(0,.7,-2);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.47;
    this.controls.minDistance=3;this.controls.maxDistance=40;
    addEnvironmentLights(this.scene);
    this.scene.add(this.content);this.content.add(this.environment);
    this.reticle.visible=false;this.scene.add(this.reticle);
    this.tutorCanvas.width=1024;this.tutorCanvas.height=480;
    this.tutorTexture.colorSpace=T.SRGBColorSpace;
    const panel=new T.Mesh(new T.PlaneGeometry(1.4,.656),new T.MeshBasicMaterial({map:this.tutorTexture,transparent:true,depthTest:false}));
    panel.renderOrder=20;this.tutorHud.add(panel);this.tutorHud.visible=false;this.scene.add(this.tutorHud);
    for(const [i,mode]of (['question','movement'] as const).entries()){
      const hit=new T.Mesh(new T.PlaneGeometry(.61,.14),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      hit.position.set(i===0?-.34:.34,-.225,.01);hit.userData.mode=mode;this.tutorHud.add(hit);this.tutorButtons.push(hit);
    }
    for(let i=0;i<2;i++){
      const controller=this.renderer.xr.getController(i);
      const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-2)]),new T.LineBasicMaterial({color:0x9f80f2}));
      controller.add(line);this.scene.add(controller);this.controllers.push(controller);
      controller.addEventListener('select',()=>{
        if(!this.tutorHud.visible)return;
        const ray=new T.Raycaster(controller.getWorldPosition(new T.Vector3()),new T.Vector3(0,0,-1).applyQuaternion(controller.getWorldQuaternion(new T.Quaternion())));
        const hit=ray.intersectObjects(this.tutorButtons,false)[0];
        if(hit)this.tutorCallback?.(hit.object.userData.mode);
      });
    }
    this.resize=new ResizeObserver(()=>this.resizeCanvas());this.resize.observe(host);this.resizeCanvas();
    void fetch('/avatars/manifest.json').then(r=>r.json()).then(m=>{for(const a of m.avatars)this.floorOffsets[a.id]=a.floorOffset;});
    this.renderer.setAnimationLoop((time,frame)=>this.draw(time,frame));
    void this.setScene('forest');void this.setAvatar('avatar-a');
  }
  private resizeCanvas(){
    if(this.renderer.xr.isPresenting)return;
    const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);
    this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  async setScene(id:SceneId){
    this.activeScene=id;const seq=++this.seq;const spec=sceneById[id];
    const group=createEnvironment(id);
    if(seq!==this.seq||this.disposed){this.disposeObject(group);return;}
    this.content.remove(this.environment);this.disposeObject(this.environment);this.environment=group;this.content.add(group);
    if(!this.arSession){this.scene.background=new T.Color(spec.skyColor);this.scene.fog=new T.Fog(spec.skyColor,30,85);}
  }
  private async createAvatar(id:AvatarId):Promise<Avatar>{
    let resource=this.cache.get(id);if(!resource){resource=this.loader.loadAsync(`/avatars/${id}.glb`);this.cache.set(id,resource);}
    const gltf=await resource;const body=clone(gltf.scene) as T.Group;
    body.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    const disposeOutline=addAvatarOutline(body);
    const bind=captureBind(body);const root=new T.Group();root.add(body);body.position.y=this.floorOffsets[id]||.02;
    const attention=new AvatarAttention(body);
    const mixer=new T.AnimationMixer(body),actions:Record<string,T.AnimationAction>={};
    for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip.name==='idle'?plantedIdle(body,clip):clip);
    actions.idle?.play();
    return {root,body,mixer,actions,bind,current:'idle',position:new T.Vector3(),floor:body.position.y,movingUntil:0,disposeOutline,attention};
  }
  async setAvatar(id:AvatarId){
    const seq=++this.actorSeq;this.selected=id;this.playing=false;
    const avatar=await this.createAvatar(id).catch(()=>{this.onError('avatar');return null;});
    if(!avatar)return;
    if(seq!==this.actorSeq||this.disposed){avatar.disposeOutline();return;}
    for(const a of this.actors.values()){this.content.remove(a.root);a.mixer.stopAllAction();a.disposeOutline();}
    this.actors.clear();this.actors.set('selected',avatar);this.content.add(avatar.root);
  }
  private action(a:Avatar,name:string){
    if(a.current===name||!a.actions[name])return;
    a.actions[a.current]?.fadeOut(.15);a.actions[name].reset().fadeIn(.15).play();a.current=name;
  }
  async replay(trace:Trace){
    this.onText('');
    if(!trace.frames.length)return;
    this.trace=trace;this.playing=false;this.repeatAt=0;this.generatedUntil=0;const seq=++this.actorSeq,request=++this.playbackRequest;
    for(const a of this.actors.values()){this.content.remove(a.root);a.mixer.stopAllAction();a.disposeOutline();}this.actors.clear();
    const initial=trace.frames[0];
    const identities=new Map<string,AvatarId>();
    for(const f of trace.frames)for(const a of f.actors)identities.set(`${a.id}:${a.avatar}`,a.avatar);
    // Shared lesson projects are deliberately bounded to avoid unbounded WebGL allocation.
    await Promise.all([...identities].slice(0,25).map(async([id,avatarId])=>{
      const avatar=await this.createAvatar(avatarId);if(seq!==this.actorSeq||this.disposed){avatar.disposeOutline();return;}
      avatar.root.visible=false;this.actors.set(id,avatar);this.content.add(avatar.root);
    })).catch(error=>{this.onError('avatar');throw error;});
    if(seq!==this.actorSeq||this.disposed)return;
    if(initial.scene!==this.activeScene)await this.setScene(initial.scene);
    if(seq!==this.actorSeq||this.disposed)return;
    if(request!==this.playbackRequest){for(const a of this.actors.values())a.root.visible=true;return;}
    this.replayAt=performance.now();this.playing=true;this.onState(true);
  }
  setSpeaking(active:boolean){this.speaking=active;}
  private frameConversation(){
    this.configureConversationOrbit(true);
    this.controls.target.set(0,1.05,0);
    this.camera.position.set(0,.4,3.6).normalize().multiplyScalar(this.controls.minDistance).add(this.controls.target);
    this.camera.lookAt(this.controls.target);this.controls.enabled=true;
  }
  private configureConversationOrbit(web:boolean){
    this.controls.enableZoom=!web;this.controls.enablePan=!web;
    this.controls.minDistance=1.8;this.controls.maxDistance=web?1.8:40;
    this.controls.minAzimuthAngle=web?-50*Math.PI/180:-Infinity;
    this.controls.maxAzimuthAngle=web?50*Math.PI/180:Infinity;
    const polar=Math.atan2(3.6,.4);
    this.controls.minPolarAngle=web?polar-20*Math.PI/180:0;
    this.controls.maxPolarAngle=web?polar:Math.PI*.47;
  }
  setConversation(locale:Locale,caption:string,callback?:(mode:'question'|'movement')=>void){
    this.conversation=true;this.tutorLocale=locale;this.tutorCallback=callback;
    if(!this.stereo&&!this.renderer.xr.isPresenting)this.frameConversation();
    this.setCaption(caption);
  }
  setCaption(caption:string){
    this.tutorText=caption;const ctx=this.tutorCanvas.getContext('2d')!;
    ctx.clearRect(0,0,1024,480);ctx.fillStyle='#fbf8ffff';ctx.beginPath();ctx.roundRect(0,0,1024,480,30);ctx.fill();
    ctx.fillStyle='#7250cf';ctx.font='600 25px sans-serif';ctx.fillText('ScratchXR',40,50);
    const labels:Record<VoicePhase,[string,string]>={off:['Microfone desligado','Microphone off'],starting:['Abrindo microfone…','Opening microphone…'],listening:['Microfone ligado · Estou ouvindo','Microphone on · Listening'],transcribing:['Entendendo sua fala…','Transcribing…'],thinking:['Pensando na resposta…','Thinking…'],speaking:['Respondendo…','Speaking…'],'audio-blocked':['Toque para ativar áudio','Tap to enable audio'],error:['Confira o microfone','Check microphone']};
    ctx.font='22px sans-serif';ctx.fillText(text(this.tutorLocale,...labels[this.voicePhase]),230,50);
    ctx.fillStyle='#383047';ctx.font='25px sans-serif';let line='',y=105;
    for(const word of caption.slice(0,450).split(/\s+/)){
      if(ctx.measureText(line+word).width>930){ctx.fillText(line,40,y);line='';y+=35;}
      line+=word+' ';if(y>330)break;
    }
    if(y<=330)ctx.fillText(line,40,y);
    for(const [i,label]of [this.voicePhase==='audio-blocked'?text(this.tutorLocale,'Ativar áudio','Enable audio'):this.voicePhase==='off'||this.voicePhase==='error'?text(this.tutorLocale,'Ligar microfone','Turn microphone on'):text(this.tutorLocale,'Desligar microfone','Turn microphone off'),text(this.tutorLocale,'Pedir um movimento','Request a movement')].entries()){
      ctx.fillStyle=i===0?'#7250cf':'#eed5b8';ctx.beginPath();ctx.roundRect(30+i*500,355,465,100,16);ctx.fill();
      ctx.fillStyle=i===0?'#ffffff':'#745239';ctx.font='600 24px sans-serif';ctx.fillText(label,50+i*500,414);
    }
    this.tutorTexture.needsUpdate=true;
  }
  setVoicePhase(phase:VoicePhase){this.voicePhase=phase;this.setCaption(this.tutorText);}
  async gesture(data?:MotionData){
    ++this.playbackRequest;this.repeatAt=0;this.playing=false;this.onState(false);
    const a=this.actors.values().next().value;if(!a)return;
    a.root.visible=true;
    if(data){
      const clip=motionClip(data,a.bind);
      if(a.actions.generated){a.actions.generated.stop();a.mixer.uncacheClip(a.actions.generated.getClip());}
      a.actions.generated=a.mixer.clipAction(clip);a.actions.generated.setLoop(T.LoopOnce,1);a.actions.generated.clampWhenFinished=true;
      this.action(a,'generated');this.generatedUntil=performance.now()+clip.duration*1000;
    }else{this.action(a,'wave');this.generatedUntil=performance.now()+1800;}
  }
  async enterXR(mode:'immersive-ar'|'immersive-vr',onEnd:()=>void=()=>{}){
    if(!navigator.xr)throw new Error('XR unavailable');
    const session=await navigator.xr.requestSession(mode,{optionalFeatures:['local-floor','hit-test','dom-overlay'],
      domOverlay:{root:this.host.closest<HTMLElement>('.world-panel')??this.host.parentElement!}});
    session.addEventListener('end',onEnd,{once:true});
    this.arSession=mode==='immersive-ar';this.controls.enabled=false;this.stereo=false;
    this.content.position.set(0,0,-4);this.content.scale.setScalar(this.arSession ? .2 : 1);
    if(this.arSession){this.scene.background=null;this.scene.fog=null;this.environment.visible=false;
      // Floor stays hidden while choosing placement, then the complete scene is shown.
      try{const space=await session.requestReferenceSpace('viewer');this.hitSource=await session.requestHitTestSource?.({space});}catch{/* Head-relative placement remains available. */}
      session.addEventListener('select',()=>{if(this.hitPosition)this.content.position.copy(this.hitPosition);this.environment.visible=true;this.reticle.visible=false;});
    }
    this.renderer.xr.setReferenceSpaceType('local');
    await this.renderer.xr.setSession(session);
    session.addEventListener('end',()=>{this.repeatAt=0;if(!this.playing)this.onState(false);this.arSession=false;this.hitSource?.cancel();this.hitSource=undefined;this.reticle.visible=false;this.tutorHud.visible=false;
      this.content.position.set(0,0,0);this.content.scale.setScalar(1);this.environment.visible=true;
      this.scene.background=new T.Color(sceneById[this.activeScene].skyColor);this.controls.enabled=true;
      if(this.conversation)this.frameConversation();
      this.resizeCanvas();});
  }
  async enterStereo(onTracking:(status:PhoneTrackingStatus)=>void=()=>{}){
    if(this.stereo||this.disposed)return;
    const request=++this.stereoRequest;
    this.stereoPose={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),target:this.controls.target.clone(),controlsEnabled:this.controls.enabled,fov:this.camera.fov,focus:this.camera.focus};
    if(this.conversation)this.configureConversationOrbit(false);
    this.stereo=true;this.orientation=undefined;this.controls.enabled=true;
    this.hasPhonePose=false;this.camera.fov=70;this.camera.focus=5;
    this.camera.position.set(0,1.6,5);this.controls.target.set(0,1.2,0);
    this.camera.lookAt(this.controls.target);this.resizeCanvas();
    this.phoneTracking=new PhoneTracking(this.renderer.domElement,this.camera,{
      status:onTracking,
      sensors:allowed=>{if(allowed&&window.DeviceOrientationEvent&&request===this.stereoRequest&&!this.disposed)window.addEventListener('deviceorientation',this.orientHandler);},
      pose:()=>{this.hasPhonePose=true;this.controls.enabled=false;},
      running:active=>{
        if(active)this.renderer.setAnimationLoop(null);
        else if(!this.disposed){
          this.hasPhonePose=false;this.renderer.resetState();this.resizeCanvas();
          this.renderer.setAnimationLoop((time,frame)=>this.draw(time,frame));
        }
      },
      render:()=>{if(this.stereo&&!this.disposed){this.renderer.resetState();this.draw(performance.now(),undefined);}},
    });
    this.phoneTracking.start();
  }
  exitStereo(){
    ++this.stereoRequest;
    if(!this.stereo)return;
    this.stereo=false;this.repeatAt=0;if(!this.playing)this.onState(false);this.phoneTracking?.stop();this.phoneTracking=undefined;this.hasPhonePose=false;
    this.orientation=undefined;window.removeEventListener('deviceorientation',this.orientHandler);
    if(this.stereoPose){
      this.camera.position.copy(this.stereoPose.position);this.camera.quaternion.copy(this.stereoPose.quaternion);
      this.camera.fov=this.stereoPose.fov;this.camera.focus=this.stereoPose.focus;
      this.controls.target.copy(this.stereoPose.target);this.controls.enabled=this.stereoPose.controlsEnabled;this.stereoPose=undefined;
    }
    if(this.conversation)this.configureConversationOrbit(true);
    this.resizeCanvas();
  }
  setStereoAlignment(value:number){if(Number.isFinite(value))this.stereoImageShift=T.MathUtils.clamp(value,-.2,.2);}
  setScale(value:number){if(this.arSession)this.content.scale.setScalar(value);}
  stop(){++this.playbackRequest;this.repeatAt=0;this.playing=false;this.generatedUntil=0;this.onState(false);for(const a of this.actors.values())this.action(a,'idle');}
  private draw(now:number,frame?:XRFrame){
    if(this.disposed)return;
    const delta=Math.min((now-this.last)/1000,.05);this.last=now;
    this.tutorHud.visible=this.renderer.xr.isPresenting&&!!this.tutorCallback;
    if(this.tutorHud.visible){
      const xrCamera=this.renderer.xr.getCamera();this.tutorHud.position.set(0,-.45,-1.65).applyQuaternion(xrCamera.quaternion).add(xrCamera.position);
      this.tutorHud.quaternion.copy(xrCamera.quaternion);
    }
    if(frame&&this.hitSource){const hits=frame.getHitTestResults(this.hitSource),space=this.renderer.xr.getReferenceSpace();
      const pose=hits[0]&&space?hits[0].getPose(space):null;
      if(pose){this.hitPosition=new T.Vector3(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);this.reticle.position.copy(this.hitPosition);this.reticle.visible=!this.environment.visible;}}
    if(this.repeatAt&&now>=this.repeatAt){
      this.repeatAt=0;
      if(this.trace&&(this.stereo||this.renderer.xr.isPresenting)){this.replayAt=now;this.playing=true;this.onState(true);}
    }
    if(this.playing&&this.trace){
      const time=now-this.replayAt,f=frameAt(this.trace,time);
      if(f){
        if(f.scene!==this.activeScene)void this.setScene(f.scene);
        const ids=new Set(f.actors.map(a=>`${a.id}:${a.avatar}`));
        for(const[id,a]of this.actors)if(!ids.has(id))a.root.visible=false;
        for(const state of f.actors)this.applyState(state,now);
        this.onText(f.actors.filter(a=>a.visible).map(a=>a.text).filter(Boolean).join(' · '));
      }
      if(time>=this.trace.duration){
        this.playing=false;for(const a of this.actors.values())this.action(a,'idle');
        if(this.stereo||this.renderer.xr.isPresenting)this.repeatAt=now+3000;
        this.onState(this.repeatAt>0);
        this.onReplayComplete();
      }
    }
    if(this.generatedUntil&&now>=this.generatedUntil){this.generatedUntil=0;for(const a of this.actors.values())this.action(a,'idle');}
    if(this.conversation)(this.renderer.xr.isPresenting?this.renderer.xr.getCamera():this.camera).getWorldPosition(this.viewerPosition);
    for(const a of this.actors.values()){
      if(this.conversation)a.attention.beforeMixer();
      a.mixer.update(delta);
      if(this.conversation)a.attention.update(delta,this.generatedUntil?null:this.viewerPosition,now);
      a.body.traverse(o=>{const mesh=o as T.Mesh;if(!mesh.morphTargetDictionary||!mesh.morphTargetInfluences)return;
        const jaw=mesh.morphTargetDictionary.viseme_aa;if(jaw!==undefined)mesh.morphTargetInfluences[jaw]=this.speaking?.22+Math.abs(Math.sin(now*.018))*.45:0;
        const blink=mesh.morphTargetDictionary.eyesClosed;if(blink!==undefined)mesh.morphTargetInfluences[blink]=now%4800<110?.8:0;
      });
    }
    if(this.stereo){
      const e=this.orientation;this.controls.enabled=!this.hasPhonePose&&(!e||e.alpha===null);
      if(!this.hasPhonePose&&e&&e.alpha!==null){const deg=Math.PI/180;this.camera.quaternion.setFromEuler(new T.Euler((e.beta||0)*deg,e.alpha*deg,-(e.gamma||0)*deg,'YXZ'))
        .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2))
        .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-(screen.orientation?.angle??(window as Window & {orientation?:number}).orientation??0)*deg));}
      else if(!this.hasPhonePose)this.controls.update();
      // XR8 may resize the drawing buffer independently of Three's cached size.
      const pixelRatio=this.renderer.getPixelRatio(),canvas=this.renderer.domElement;
      const size=new T.Vector2(canvas.width/pixelRatio,canvas.height/pixelRatio);
      // Perspective follows the displayed eye area, even if XR8 uses a differently
      // shaped camera buffer. The split and lens shift follow that buffer's pixels.
      this.camera.aspect=this.host.clientWidth/(2*Math.max(1,this.host.clientHeight));this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();this.stereoCamera.update(this.camera);
      const shift=size.x*this.stereoImageShift;
      this.renderer.setScissorTest(true);
      for(const [i,eye]of [this.stereoCamera.cameraL,this.stereoCamera.cameraR].entries()){
        this.renderer.setViewport(i*size.x/2+(i===0?shift:-shift),0,size.x/2,size.y);
        this.renderer.setScissor(i*size.x/2,0,size.x/2,size.y);this.renderer.render(this.scene,eye);}
      this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,size.x,size.y);this.renderer.setScissor(0,0,size.x,size.y);
    }else{if(!this.renderer.xr.isPresenting)this.controls.update();this.renderer.render(this.scene,this.camera);}
  }
  private applyState(state:ActorState,now:number){
    const a=this.actors.get(`${state.id}:${state.avatar}`);if(!a)return;
    const position=new T.Vector3(...worldPosition(state)),moved=position.distanceToSquared(a.position)>1e-7;
    a.root.position.copy(position);a.position.copy(position);
    a.root.rotation.y=(180-state.direction)*Math.PI/180;a.root.scale.setScalar(state.size/100);a.root.visible=state.visible;
    if(moved)a.movingUntil=now+75;
    this.action(a,now<a.movingUntil?'walk':'idle');
  }
  private disposeObject(root:T.Object3D){
    root.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();
      for(const mat of (Array.isArray(m.material)?m.material:[m.material]).filter(Boolean)){for(const value of Object.values(mat))if(value instanceof T.Texture)value.dispose();mat.dispose();}});
  }
  dispose(){
    this.exitStereo();
    this.disposed=true;++this.seq;++this.actorSeq;this.renderer.setAnimationLoop(null);this.resize.disconnect();this.controls.dispose();
    window.removeEventListener('deviceorientation',this.orientHandler);
    void this.renderer.xr.getSession()?.end();
    this.disposeObject(this.scene);this.renderer.dispose();this.renderer.domElement.remove();
  }
}
