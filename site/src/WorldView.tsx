/**
 * ScratchXR — XR capability UI and shared viewer lifecycle.
 * Subsistema: EDU. Depende de: React, World. Usado por: App.
 */
import {useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Box,HelpCircle,Play,Glasses,Scan,Maximize,Mic,MicOff,Square,SlidersHorizontal,X} from 'lucide-react';
import {World} from './World';
import {text,type AvatarId,type Locale,type MotionData,type Trace} from './types';
import type {SceneId} from './sceneAssets';
import {loadPhoneEngine,phoneTrackingAvailable,type PhoneTrackingStatus} from './phoneTracking';
import type {VoicePhase} from './voiceCapture';
export function WorldView({locale,avatar,scene,trace,gesture,speaking,onReplay,onReplayStart,conversation,caption='',onXRVoice,onVoiceSession,voicePhase='off',stage,stageActions,busy=false}:{
  locale:Locale;avatar:AvatarId;scene:SceneId;trace?:Trace;gesture?:{sequence:number;data?:MotionData};
  speaking:boolean;onReplay:()=>void;onReplayStart?:()=>void;
  conversation?:boolean;caption?:string;onXRVoice?:(mode:'question'|'movement')=>void;
  onVoiceSession?:(active:boolean)=>void;voicePhase?:VoicePhase;
  stage?:ReactNode;stageActions?:ReactNode;busy?:boolean;
}){
  const host=useRef<HTMLDivElement>(null),world=useRef<World|null>(null),inlineMount=useRef<HTMLDivElement>(null);
  const [portalRoot]=useState(()=>{const root=document.createElement('div');root.style.display='contents';return root;});
  const panel=useRef<HTMLDivElement>(null),viewerButton=useRef<HTMLButtonElement>(null),exitButton=useRef<HTMLButtonElement>(null);
  const viewerActive=useRef(false),viewerRequest=useRef(0);
  const viewerScroll=useRef({x:0,y:0});
  const [bubble,setBubble]=useState(''),[playing,setPlaying]=useState(false),[error,setError]=useState('');
  const [show3D,setShow3D]=useState(!stage),[help,setHelp]=useState(false);
  const helpId=useId(),helpButton=useRef<HTMLButtonElement>(null);
  const previousTrace=useRef(trace);
  const [support,setSupport]=useState({ar:false,vr:false}),[stereo,setStereo]=useState(false);
  const [tracking,setTracking]=useState<PhoneTrackingStatus>('loading');
  const [aligning,setAligning]=useState(false);
  const [alignment,setAlignment]=useState(()=>{
    const saved=localStorage.getItem('scratchxr-viewer-alignment'),value=saved===null?90/844:Number(saved);
    return Number.isFinite(value)?Math.max(-.2,Math.min(.2,value)):90/844;
  });
  const mountedAvatar=useRef(avatar),mountedScene=useRef(scene);
  const replayComplete=useRef(onReplay);replayComplete.current=onReplay;
  const voiceSession=useRef(onVoiceSession);voiceSession.current=onVoiceSession;
  const unified=!!stage;
  // Keep the same canvas and React tree when lifting the viewer out of the lesson.
  useLayoutEffect(()=>{inlineMount.current?.appendChild(portalRoot);return()=>portalRoot.remove();},[portalRoot]);
  useLayoutEffect(()=>{
    if(!unified||!panel.current)return;
    const element=panel.current;
    const observer=new ResizeObserver(([entry])=>element.style.setProperty('--stage-width',`${entry.contentRect.width}px`));
    observer.observe(element);
    return()=>observer.disconnect();
  },[unified]);
  useEffect(()=>{
    if(!host.current)return;let instance:World;
    try{instance=new World(host.current,setBubble,setPlaying,()=>setError(text(locale,'Um modelo não carregou. Tente novamente.','A model could not load. Try again.')),()=>replayComplete.current());world.current=instance;
      if(avatar!=='avatar-a')void instance.setAvatar(avatar);if(scene!=='forest')void instance.setScene(scene);
      if(conversation)instance.setConversation(locale,caption,onXRVoice);
    }catch{setError(text(locale,'A prévia 3D precisa de WebGL neste navegador.','The 3D preview needs WebGL in this browser.'));return;}
    void Promise.all([navigator.xr?.isSessionSupported('immersive-ar'),navigator.xr?.isSessionSupported('immersive-vr')])
      .then(([ar,vr])=>setSupport({ar:!!ar,vr:!!vr})).catch(()=>{});
    if(phoneTrackingAvailable())void loadPhoneEngine().catch(()=>{});
    return()=>{if(conversation)voiceSession.current?.(false);instance.dispose();world.current=null;};
  },[]);
  useEffect(()=>{if(mountedAvatar.current!==avatar){mountedAvatar.current=avatar;void world.current?.setAvatar(avatar);}},[avatar]);
  useEffect(()=>{if(mountedScene.current!==scene){mountedScene.current=scene;void world.current?.setScene(scene);}},[scene]);
  useEffect(()=>{world.current?.setSpeaking(speaking);},[speaking]);
  useEffect(()=>{if(conversation)world.current?.setConversation(locale,caption,onXRVoice);},[locale,conversation]);
  useEffect(()=>{if(conversation)world.current?.setCaption(caption);},[caption]);
  useEffect(()=>{if(conversation)world.current?.setVoicePhase(voicePhase);},[voicePhase,conversation]);
  useEffect(()=>{if(gesture)void world.current?.gesture(gesture.data).catch(()=>setError(text(locale,'Não consegui reproduzir esse movimento.','I could not play that movement.')));},[gesture]);
  useEffect(()=>{
    if(previousTrace.current&&previousTrace.current!==trace){world.current?.stop();setBubble('');}
    previousTrace.current=trace;
  },[trace]);
  useEffect(()=>{
    if(!help)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setHelp(false);helpButton.current?.focus({preventScroll:true});}};
    window.addEventListener('keydown',close);
    return()=>window.removeEventListener('keydown',close);
  },[help]);
  const startReplay=()=>{
    if(!trace||!world.current)return;
    onReplayStart?.();setBubble('');setPlaying(true);setError('');
    void world.current.replay(trace).catch(()=>{
      setPlaying(false);setError(text(locale,'Não consegui reproduzir o programa. Tente novamente.','Could not replay your program. Please try again.'));
    });
  };
  const toggle3D=()=>{
    setHelp(false);
    if(show3D){world.current?.stop();setShow3D(false);}
    else{setShow3D(true);startReplay();}
  };
  const closeViewer=()=>{if(conversation)voiceSession.current?.(false);viewerActive.current=false;++viewerRequest.current;setStereo(false);setAligning(false);};
  useLayoutEffect(()=>{
    if(!stereo||!panel.current)return;
    const element=panel.current,instance=world.current;
    document.body.appendChild(portalRoot);
    const bodyOverflow=document.body.style.overflow,rootOverflow=document.documentElement.style.overflow;
    document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
    const viewport=window.visualViewport;
    const sizeViewport=()=>{
      element.style.setProperty('--viewer-width',`${viewport?.width??innerWidth}px`);
      element.style.setProperty('--viewer-height',`${viewport?.height??innerHeight}px`);
      element.style.setProperty('--viewer-left',`${viewport?.offsetLeft??0}px`);
      element.style.setProperty('--viewer-top',`${viewport?.offsetTop??0}px`);
    };
    sizeViewport();viewport?.addEventListener('resize',sizeViewport);viewport?.addEventListener('scroll',sizeViewport);
    window.addEventListener('resize',sizeViewport);
    let hadFullscreen=document.fullscreenElement===element;
    const fullscreenChanged=()=>{
      if(document.fullscreenElement===element)hadFullscreen=true;
      else if(hadFullscreen)closeViewer();
    };
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeViewer();}
      if(event.key==='Tab'){
        const controls=[...element.querySelectorAll<HTMLElement>('button:not(:disabled),input')].filter(control=>control.getClientRects().length);
        const index=controls.indexOf(document.activeElement as HTMLElement);
        if(index<0||!event.shiftKey&&index===controls.length-1||event.shiftKey&&index===0){
          event.preventDefault();controls[event.shiftKey?controls.length-1:0]?.focus({preventScroll:true});
        }
      }
    };
    document.addEventListener('fullscreenchange',fullscreenChanged);
    window.addEventListener('keydown',keydown,true);
    exitButton.current?.focus({preventScroll:true});
    return()=>{
      viewerActive.current=false;const request=++viewerRequest.current;
      document.removeEventListener('fullscreenchange',fullscreenChanged);
      window.removeEventListener('keydown',keydown,true);
      viewport?.removeEventListener('resize',sizeViewport);viewport?.removeEventListener('scroll',sizeViewport);
      window.removeEventListener('resize',sizeViewport);
      document.body.style.overflow=bodyOverflow;document.documentElement.style.overflow=rootOverflow;
      instance?.exitStereo();
      inlineMount.current?.appendChild(portalRoot);
      for(const key of ['width','height','left','top'])element.style.removeProperty(`--viewer-${key}`);
      try{screen.orientation?.unlock?.();}catch{/* Not available in every browser. */}
      const position=viewerScroll.current;
      const restore=()=>{if(element.isConnected&&request===viewerRequest.current){
        window.scrollTo({left:position.x,top:position.y,behavior:'instant'});
        viewerButton.current?.focus({preventScroll:true});
      }};
      requestAnimationFrame(restore);
      if(document.fullscreenElement===element)void document.exitFullscreen().then(()=>requestAnimationFrame(restore)).catch(()=>{});
    };
  },[stereo]);
  const openViewer=()=>{
    const element=panel.current,instance=world.current;
    if(!element||!instance||viewerActive.current)return;
    viewerScroll.current={x:window.scrollX,y:window.scrollY};
    (document.activeElement as HTMLElement|null)?.blur?.();
    document.body.appendChild(portalRoot);
    viewerActive.current=true;const request=++viewerRequest.current;
    setError('');setHelp(false);setShow3D(true);setTracking('loading');setStereo(true);
    instance.setStereoAlignment(alignment);
    // Start both permission requests in the click gesture, before awaiting either.
    void instance.enterStereo(status=>{if(viewerActive.current&&request===viewerRequest.current)setTracking(status);});
    if(stage)startReplay();
    void (async()=>{
      try{await element.requestFullscreen?.({navigationUI:'hide'});}catch{/* The fixed viewport remains available. */}
      if(request!==viewerRequest.current){
        if(!viewerActive.current&&document.fullscreenElement===element)void document.exitFullscreen().catch(()=>{});
        return;
      }
      if(document.fullscreenElement===element){
        try{
          await (screen.orientation as ScreenOrientation & {lock?:(mode:'landscape')=>Promise<void>})?.lock?.('landscape');
          if(request!==viewerRequest.current)screen.orientation?.unlock?.();
        }catch{/* Manual rotation still works. */}
      }
    })();
    if(conversation)voiceSession.current?.(true);
  };
  const xr=async(mode:'immersive-ar'|'immersive-vr')=>{
    try{
      setError('');setHelp(false);setShow3D(true);
      // Request XR and audio in the same user gesture, before awaiting permission.
      const entering=world.current?.enterXR(mode,()=>{if(conversation)voiceSession.current?.(false);});
      if(conversation)voiceSession.current?.(true);
      await entering;if(stage)startReplay();
    }catch{if(conversation)voiceSession.current?.(false);setError(text(locale,'Não foi possível iniciar a sessão. Confira a permissão e o dispositivo.','Could not start the session. Check permissions and your device.'));}
  };
  const trackingMessages:Record<PhoneTrackingStatus,[string,string]>={
    loading:['Preparando rastreamento…','Preparing tracking…'],
    tracking:['6DoF ativo','6DoF active'],
    limited:['Mova o celular devagar em um ambiente iluminado. Mantenha a câmera descoberta.','Move the phone slowly in a well-lit space. Keep the camera uncovered.'],
    'camera-denied':['Sem posição: permita a câmera e abra o visor novamente.','No position tracking: allow the camera and reopen the viewer.'],
    'camera-error':['A câmera não abriu. Confira a permissão da câmera neste site e tente novamente.','The camera did not open. Check this site’s camera permission and try again.'],
    'sensors-denied':['Sem posição: permita os sensores de movimento e abra o visor novamente.','No position tracking: allow motion sensors and reopen the viewer.'],
    insecure:['Abra o site por HTTPS para permitir o acesso à câmera e aos sensores.','Open the site over HTTPS to allow camera and sensor access.'],
    unavailable:['Este navegador não disponibilizou a câmera. No iPhone, abra o link diretamente no Safari.','This browser did not provide camera access. On iPhone, open the link directly in Safari.'],
    error:['O rastreamento não iniciou. Saia do visor e tente novamente.','Tracking did not start. Exit the viewer and try again.'],
  };
  const replayControls=!conversation&&<div className="toolbar-actions replay-actions">
    <button className="icon-button" title={text(locale,'Parar reprodução','Stop replay')} disabled={!playing} onClick={()=>world.current?.stop()}><Square size={15}/></button>
    <button className="viewer-replay-button" disabled={!trace||playing} onClick={startReplay}><Play size={14}/>{text(locale,'Reproduzir','Replay')}</button>
  </div>;
  return <><div ref={inlineMount} className="viewer-mount"/>{createPortal(<div ref={panel} className={`world-panel ${stage?'unified-stage':''} ${show3D?'showing-3d':'showing-2d'} ${stereo?'stereo-active':''}`} role={stereo?'dialog':undefined} aria-modal={stereo?true:undefined} aria-label={stereo?text(locale,'Visor de celular','Phone viewer'):undefined}>
    <div className="world-toolbar"><span className="live-dot"/><span>{stage?text(locale,'Palco','Stage'):conversation?text(locale,'Uma conversa no seu mundo','A conversation in your world'):text(locale,'Seu programa ganhou espaço','Your program has room to move')}</span>
      {!stage&&replayControls}
      {conversation&&<button className={`icon-button conversation-mic ${voicePhase!=='off'&&voicePhase!=='error'?'active':''}`} aria-label={voicePhase==='off'||voicePhase==='error'?text(locale,'Ligar microfone','Turn microphone on'):text(locale,'Desligar microfone','Turn microphone off')} onClick={()=>onXRVoice?.('question')}>{voicePhase==='off'||voicePhase==='error'?<MicOff size={18}/>:<Mic size={18}/>}</button>}
      <button ref={helpButton} className="icon-button viewer-help-button" aria-label={text(locale,'Ajuda do palco','Stage help')} aria-expanded={help} aria-controls={helpId} onClick={()=>setHelp(value=>!value)}><HelpCircle size={18}/></button>
    </div>
    <div className="stage-surface">
      {stage&&<div className="stage-2d" hidden={show3D}>{stage}</div>}
      <div ref={host} className="world-canvas" hidden={!show3D}/>
    </div>
    {stereo&&<button ref={exitButton} className="viewer-exit" onClick={closeViewer}><X size={20}/>{text(locale,'Sair do visor','Exit viewer')}</button>}
    {stereo&&conversation&&<button className="viewer-microphone" onClick={()=>onXRVoice?.('question')}><Mic size={16}/>{voicePhase==='audio-blocked'?text(locale,'Ativar áudio','Enable audio'):voicePhase==='off'||voicePhase==='error'?text(locale,'Ligar microfone','Turn microphone on'):text(locale,'Microfone ligado','Microphone on')}</button>}
    {stereo&&<button className="viewer-align-toggle" aria-expanded={aligning} onClick={()=>setAligning(value=>!value)}><SlidersHorizontal size={18}/>{text(locale,'Alinhar imagens','Align images')}</button>}
    {stereo&&aligning&&<div className="viewer-alignment"><label>{text(locale,'Ajuste até unir as duas imagens no visor.','Adjust until the two images merge in the viewer.')}
      <input aria-label={text(locale,'Alinhamento das imagens','Image alignment')} type="range" min={-.2} max={.2} step={.002} value={alignment} onChange={event=>{
        const value=Number(event.target.value);setAlignment(value);world.current?.setStereoAlignment(value);localStorage.setItem('scratchxr-viewer-alignment',String(value));
      }}/></label></div>}
    {stereo&&<p className={`viewer-tracking ${tracking==='tracking'?'tracking-ready':''}`} role="status">{text(locale,...trackingMessages[tracking])}</p>}
    {show3D&&bubble&&<div className="world-bubble" aria-live="polite">{bubble}</div>}
    <div className="stage-controls"><div className="xr-controls">
      {stage&&<button className="stage-mode-button" disabled={busy} aria-pressed={show3D} title={show3D?text(locale,'Voltar ao 2D','Return to 2D'):text(locale,'Ver em 3D','View in 3D')} onClick={toggle3D}><Box size={18}/>3D</button>}
      <button ref={viewerButton} disabled={busy} title={text(locale,'Visor de celular','Phone viewer')} aria-label={text(locale,'Visor de celular','Phone viewer')} onClick={openViewer}><Maximize size={18}/>CARDBOARD</button>
      <button disabled={busy||!support.vr} title={text(locale,'Entrar em VR','Enter VR')} aria-label={text(locale,'Entrar em VR','Enter VR')} onClick={()=>void xr('immersive-vr')}><Glasses size={18}/>VR</button>
      <button disabled={busy||!support.ar} title={text(locale,'Ver no meu ambiente','View in my room')} aria-label={text(locale,'Ver no meu ambiente','View in my room')} onClick={()=>void xr('immersive-ar')}><Scan size={18}/>AR</button>
      {support.ar&&<label className="ar-scale"><span>{text(locale,'Escala AR','AR scale')}</span><input type="range" aria-label={text(locale,'Escala do mundo em AR','AR world scale')} min=".05" max="1" step=".05" defaultValue=".2" onChange={e=>world.current?.setScale(Number(e.target.value))}/></label>}
    </div>{stage&&<div className="stage-playback">{show3D?replayControls:stageActions}</div>}</div>
    {error&&<p className="notice" role="alert">{error}</p>}
    {help&&<aside id={helpId} className="viewer-help"><p className="compatibility">{text(locale,'AR e VR aparecem quando o navegador e o dispositivo oferecem suporte. Em AR, toque no chão para colocar o cenário. Para acompanhar seus deslocamentos no visor de celular, permita câmera e sensores. A câmera traseira deve ficar descoberta.','AR and VR are enabled when your browser and device support them. In AR, tap the floor to place the scene. To track your position in the phone viewer, allow the camera and sensors. Keep the rear camera uncovered.')}</p>{!conversation&&<p>{text(locale,'No 3D, arraste para explorar e role para aproximar.','In 3D, drag to explore and scroll to zoom.')}{stage&&text(locale,' Clique novamente em 3D para voltar ao palco 2D.',' Click 3D again to return to the 2D stage.')}</p>}
      {stage&&<div className="mini-challenge"><span>✦ {text(locale,'EXPERIMENTE','TRY THIS')}</span><p>{text(locale,'No bloco “deslize”, mude 2 para 1. O destino mudou ou só a velocidade?','In the “glide” block, change 2 to 1. Did the destination change, or just the speed?')}</p></div>}
    </aside>}
    <p className="tracking-credit"><a href="/xr8/LICENSE" target="_blank" rel="noreferrer">{text(locale,'Licença e isenção de garantias','License and warranty disclaimer')}</a></p>
  </div>,portalRoot)}</>;
}
