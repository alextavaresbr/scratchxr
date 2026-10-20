/**
 * ScratchXR — Custom 2D editor chrome around the native Scratch engine.
 * Subsistema: EDU. Depende de: React, ScratchEngine. Usado por: App.
 */
import {useEffect,useRef,useState} from 'react';
import {Play,Square,RotateCcw,Download,Upload} from 'lucide-react';
import {ScratchEngine} from './scratchEngine';
import {WorldView} from './WorldView';
import {avatars,text,type AvatarId,type Locale,type Trace} from './types';
import {sceneAssets,type SceneId} from './sceneAssets';
export function ScratchEditor({locale,avatar,scene,trace,onAvatar,onScene,onTrace,onReplay,onReplayStart,onDirty}:{
  locale:Locale;avatar:AvatarId;scene:SceneId;onAvatar:(id:AvatarId)=>void;onScene:(id:SceneId)=>void;
  trace?:Trace;onTrace:(trace:Trace)=>void;onReplay:()=>void;onReplayStart:()=>void;onDirty:()=>void;
}){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),engine=useRef<ScratchEngine|null>(null);
  const callbacks=useRef({onTrace,onDirty});callbacks.current={onTrace,onDirty};
  const [ready,setReady]=useState(false),[running,setRunning]=useState(false),[error,setError]=useState('');
  const [question,setQuestion]=useState<{text:string;answer:(value:string)=>void}|null>(null),[answer,setAnswer]=useState('');
  const file=useRef<HTMLInputElement>(null),lastLocale=useRef(locale);
  useEffect(()=>{
    if(!host.current||!canvas.current)return;
    const instance=new ScratchEngine(host.current,canvas.current,locale,{onRun:setRunning,onTrace:t=>callbacks.current.onTrace(t),
      onDirty:()=>callbacks.current.onDirty(),
      onError:setError,onAsk:(q,answer)=>setQuestion(q===null?null:{text:q,answer})});
    engine.current=instance;let live=true;
    instance.init().then(()=>{if(live)setReady(true);}).catch(error=>setError(text(locale,'O editor não pôde carregar. ','The editor could not load. ')+(import.meta.env.DEV?String(error.stack||error.message):text(locale,'Recarregue a página.','Reload this page.'))));
    return()=>{live=false;instance.dispose();engine.current=null;};
  },[]);
  useEffect(()=>{if(ready&&locale!==lastLocale.current){lastLocale.current=locale;void engine.current?.setLocale(locale);}},[locale,ready]);
  useEffect(()=>{if(ready)engine.current?.selectAvatar(avatar);},[avatar,ready]);
  useEffect(()=>{if(ready)engine.current?.selectScene(scene);},[scene,ready]);
  return <div className="editor-shell">
    <div className="editor-selectors">
      <div className="selector-group">
        <h4>{text(locale,'Quem vai explorar?','Who will explore?')}</h4>
        <div className="avatar-choices">{avatars.map(a=><button key={a.id} aria-pressed={avatar===a.id} disabled={running}
          onClick={()=>onAvatar(a.id)} className={avatar===a.id?'selected':''} style={{'--avatar-color':a.color} as React.CSSProperties}>
          <img src={`/avatars/${a.id}-portrait.png`} alt=""/><span>{a.name}</span>
        </button>)}</div>
      </div>
      <div className="selector-group">
        <h4>{text(locale,'Escolha um cenário','Choose a setting')}</h4>
        <div className="scene-choices">{sceneAssets.map(s=><button key={s.id} aria-pressed={scene===s.id} disabled={running} className={scene===s.id?'selected':''} onClick={()=>onScene(s.id)}>
          <img src={`/backdrops/${s.id}.png`} alt=""/><span>{s.name[locale]}</span>
        </button>)}</div>
      </div>
    </div>
    <div className="editor-toolbar">
      <div className="editor-title"><span className="live-dot"/>{text(locale,'Meu primeiro mundo','My first world')}<span className="scratch-rotate-hint">{text(locale,'Rotacione o seu celular para a horizontal.','Rotate your phone to landscape.')}</span><span className="pill">Scratch 3</span></div>
    </div>
    {error&&<p className="notice" role="alert">{error}</p>}
    <div className="editor-body">
      <div className="workspace-wrap"><div ref={host} className="blocks-workspace" aria-label={text(locale,'Área de programação Scratch','Scratch programming workspace')}/>
        {!ready&&!error&&<div className="loading-overlay">{text(locale,'Preparando seus blocos…','Getting your blocks ready…')}</div>}
      </div>
      <div className="stage-panel"><div className="stage-preview">
        <WorldView locale={locale} avatar={avatar} scene={scene} trace={trace} speaking={false} busy={running||!ready}
          onReplay={onReplay} onReplayStart={onReplayStart} stage={<>
          <div className="stage-window" style={{backgroundImage:`url(/backdrops/${scene}-panorama.png)`}}><canvas ref={canvas} width={480} height={360} tabIndex={0} className="scratch-stage" aria-label={text(locale,'Palco Scratch; clique para usar as teclas no programa','Scratch stage; click to use keyboard controls')}/></div>
          {question&&<form className="ask-form" onSubmit={e=>{e.preventDefault();question.answer(answer);setAnswer('');setQuestion(null);}}><label>{question.text}<input value={answer} onChange={e=>setAnswer(e.target.value)}/></label><button type="submit">OK</button></form>}
        </>} stageActions={<div className="toolbar-actions stage-actions">
        <button className="icon-button" title={text(locale,'Repor exemplo','Restore example')} disabled={!ready||running} onClick={()=>engine.current?.setExample()}><RotateCcw size={17}/></button>
        <button className="icon-button" title={text(locale,'Abrir projeto .sb3','Open .sb3 project')} disabled={!ready||running} onClick={()=>file.current?.click()}><Upload size={17}/></button>
        <button className="icon-button" title={text(locale,'Baixar projeto .sb3','Download .sb3 project')} disabled={!ready} onClick={()=>void engine.current?.save()}><Download size={17}/></button>
        <input ref={file} hidden type="file" accept=".sb3" onChange={e=>{const f=e.target.files?.[0];if(f)void engine.current?.load(f).catch(()=>setError(text(locale,'Este projeto não pôde ser aberto.','This project could not be opened.')));e.target.value='';}}/>
        <button className="run-button viewer-replay-button" disabled={!ready||running} onClick={()=>engine.current?.run()}><Play size={14}/>{text(locale,'Reproduzir','Replay')}</button>
        <button className="stop-button icon-button" title={text(locale,'Parar','Stop')} disabled={!running} onClick={()=>engine.current?.stop()}><Square size={16} fill="currentColor"/></button>
        </div>}/>
      </div></div>
    </div>
    <div className="editor-footer"><span>{text(locale,'Arraste, encaixe e teste. A gravação termina em até 30 segundos.','Drag, snap and test. Recording stops after 30 seconds.')}</span></div>
  </div>;
}
