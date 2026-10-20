/**
 * ScratchXR — Tutor text/voice and optional moderated movement invitation.
 * Subsistema: EDU. Depende de: React, server API. Usado por: App.
 */
import {useEffect,useImperativeHandle,useRef,useState,type Ref} from 'react';
import {Send,Mic,MicOff,Volume2,Sparkles} from 'lucide-react';
import {text,type AvatarId,type Locale,type MotionData,type Trace} from './types';
import {VoiceCapture,type VoicePhase} from './voiceCapture';
type Message={role:'user'|'assistant';content:string};
export type DialogueHandle={startListening:()=>void;stopListening:()=>void;requestVoice:(mode:'question'|'movement')=>void};
export function Dialogue({locale,avatar,trace,onGesture,onSpeaking,onCaption,onResponse,ref,onVoicePhase,onShowAvatar}:{
  locale:Locale;avatar:AvatarId;trace?:Trace;onGesture:(data?:MotionData)=>void;onSpeaking:(active:boolean)=>void;
  onCaption:(caption:string)=>void;ref?:Ref<DialogueHandle>;onVoicePhase:(phase:VoicePhase)=>void;onResponse:()=>void;onShowAvatar?:()=>void;
}){
  const [messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false);
  const [move,setMove]=useState(''),[moving,setMoving]=useState(false),[notice,setNotice]=useState(''),[offline,setOffline]=useState(false);
  const [recording,setRecording]=useState(false),[voice,setVoice]=useState(true),[phase,setPhase]=useState<VoicePhase>('off');
  const capture=useRef<VoiceCapture|null>(null),audioContext=useRef<AudioContext|null>(null);
  const output=useRef<AudioBufferSourceNode|null>(null),finishAudio=useRef<(()=>void)|null>(null);
  const pendingAudio=useRef<{buffer:AudioBuffer;sequence:number}|null>(null);
  const audioNeedsTap=useRef(false);
  const voiceSession=useRef(0),voiceMode=useRef<'question'|'movement'>('question'),busyRef=useRef(false),talking=useRef(false);
  const messagesRef=useRef<Message[]>([]),voiceEnabled=useRef(true),latest=useRef({send,movement});
  latest.current={send,movement};
  const alive=useRef(true),request=useRef<AbortController|null>(null),list=useRef<HTMLDivElement>(null);
  const speechSequence=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;stopListening();void audioContext.current?.close();audioContext.current=null;};},[]);
  useEffect(()=>{list.current?.scrollTo({top:list.current.scrollHeight,behavior:'smooth'});},[messages,busy]);
  useImperativeHandle(ref,()=>({startListening,stopListening,requestVoice}));
  function status(value:VoicePhase){
    if(value==='audio-blocked')audioNeedsTap.current=true;
    if(value==='off'||value==='error')audioNeedsTap.current=false;
    // Keep the recovery action stable even if Safari resumes just before the tap.
    if(value==='listening'&&audioNeedsTap.current)value='audio-blocked';
    if(alive.current){setPhase(value);onVoicePhase(value);}
  }
  function unlockAudio(){
    if(!audioContext.current||audioContext.current.state==='closed'){
      const context=new AudioContext();audioContext.current=context;
      context.onstatechange=()=>{
        if(!alive.current||!capture.current&&!talking.current)return;
        if(context.state!=='running')status('audio-blocked');
        else if(!pendingAudio.current&&!talking.current&&!busyRef.current)status('listening');
      };
    }
    const context=audioContext.current;
    void context.resume().catch(()=>{});
    // A real source started in the tap unlocks output on iOS, before network work.
    const warmup=context.createBufferSource();warmup.buffer=context.createBuffer(1,1,context.sampleRate);
    warmup.connect(context.destination);warmup.onended=()=>warmup.disconnect();warmup.start();
    return context;
  }
  function stopAudio(){
    ++speechSequence.current;pendingAudio.current=null;output.current?.stop();output.current=null;finishAudio.current?.();finishAudio.current=null;
    talking.current=false;onSpeaking(false);
  }
  async function resumeContext(context:AudioContext){
    const running=()=>context.state==='running';
    if(running())return true;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      await Promise.race([context.resume(),new Promise<void>(done=>{timer=setTimeout(done,1500);})]);
    }catch{/* Keep the real voice queued for an explicit tap. */}
    finally{clearTimeout(timer);}
    return running();
  }
  async function playVoice(buffer:AudioBuffer,sequence:number){
    const context=audioContext.current!;
    if(!await resumeContext(context)){
      if(alive.current&&sequence===speechSequence.current){
        pendingAudio.current={buffer,sequence};status('audio-blocked');
        setNotice(text(locale,'Toque em “Ativar áudio” para ouvir a voz do personagem.','Tap “Enable audio” to hear the character’s voice.'));
      }
      return;
    }
    if(!alive.current||sequence!==speechSequence.current)return;
    pendingAudio.current=null;audioNeedsTap.current=false;talking.current=true;setNotice('');status(capture.current?'speaking':'off');
    await new Promise<void>(done=>{
      const source=context.createBufferSource();output.current=source;source.buffer=buffer;source.connect(context.destination);
      finishAudio.current=done;source.onended=()=>{source.disconnect();done();};onSpeaking(true);source.start();
    });
  }
  async function enableAudio(){
    const context=unlockAudio(),pending=pendingAudio.current;
    voiceEnabled.current=true;setVoice(true);
    if(pending){
      await playVoice(pending.buffer,pending.sequence);
      if(pending.sequence===speechSequence.current){talking.current=false;onSpeaking(false);}
    }else if(!await resumeContext(context)){status('audio-blocked');return;}
    if(!pendingAudio.current){audioNeedsTap.current=false;setNotice('');status(capture.current?(talking.current?'speaking':'listening'):'off');}
  }
  async function speak(content:string){
    if(!voiceEnabled.current)return;
    stopAudio();talking.current=true;if(capture.current)status('speaking');
    const sequence=++speechSequence.current;
    try{
      const response=await fetch('/api/tts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:content,locale,avatar}),signal:AbortSignal.timeout(50000)});
      if(!response.ok)throw new Error('Voice unavailable');
      const context=audioContext.current||unlockAudio(),buffer=await context.decodeAudioData(await response.arrayBuffer());
      if(!alive.current||sequence!==speechSequence.current)return;
      await playVoice(buffer,sequence);
    }catch{
      if(!alive.current||sequence!==speechSequence.current)return;
      setNotice(text(locale,'A voz do personagem não carregou. A resposta continua no texto; tente ouvir novamente.','The character’s voice could not load. The text is still available; try listening again.'));
    }finally{
      if(sequence===speechSequence.current){talking.current=false;onSpeaking(false);output.current=null;finishAudio.current=null;}
    }
  }
  async function send(value=input){
    const content=value.trim();if(!content||busyRef.current)return;
    unlockAudio();busyRef.current=true;
    const next=[...messagesRef.current,{role:'user' as const,content}];messagesRef.current=next;setMessages(next);setInput('');setBusy(true);setNotice('');
    if(capture.current)status('thinking');
    const controller=new AbortController();request.current=controller;
    try{
      const result=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(40000)]),
        body:JSON.stringify({locale,messages:next,context:trace?`Execution duration ${Math.round(trace.duration)} ms; ${trace.frames.length} recorded state changes; warnings ${trace.warnings.join(',')}.`:'No recording yet.'})});
      if(!result.ok)throw new Error('Unavailable');const data=await result.json();
      if(!alive.current||controller.signal.aborted)return;
      if(typeof data.text!=='string'||!data.text.trim())throw new Error('Empty response');
      messagesRef.current=[...next,{role:'assistant',content:data.text}];setMessages(messagesRef.current);setOffline(data.mode==='offline');onCaption(data.text);onResponse();
      await speak(data.text);
    }catch{if(alive.current&&!controller.signal.aborted)setNotice(text(locale,'Não consegui responder agora. Tente novamente.','I could not respond now. Please try again.'));}
    finally{busyRef.current=false;if(alive.current)setBusy(false);if(pendingAudio.current)status('audio-blocked');else if(capture.current)status('listening');}
  }
  function stopListening(){
    ++voiceSession.current;capture.current?.stop();capture.current=null;request.current?.abort();stopAudio();
    if(alive.current){setRecording(false);status('off');}
  }
  function startListening(){
    if(capture.current)return;
    const session=++voiceSession.current;
    try{
      const context=unlockAudio();setNotice('');status('starting');
      const failed=()=>{
        if(session!==voiceSession.current||!alive.current)return;
        stopListening();status('error');
        const message=text(locale,'Não consegui ouvir. Confira a permissão do microfone e tente ligá-lo novamente.','I could not listen. Check microphone permission and try switching it on again.');
        setNotice(message);onCaption(message);
      };
      const listener=new VoiceCapture(context,()=>talking.current||busyRef.current||audioNeedsTap.current||!!pendingAudio.current||context.state!=='running',async blob=>{
        if(session!==voiceSession.current)return;
        status('transcribing');
        const controller=new AbortController();request.current=controller;
        const response=await fetch('/api/stt',{method:'POST',headers:{'content-type':blob.type,'x-language':locale},body:blob,
          signal:AbortSignal.any([controller.signal,AbortSignal.timeout(50000)])});
        if(session!==voiceSession.current)return;
        if(!response.ok){
          stopListening();status('error');
          const message=text(locale,'A transcrição está indisponível. Você pode digitar ou tentar o microfone novamente.','Transcription is unavailable. You can type or try the microphone again.');
          setNotice(message);onCaption(message);return;
        }
        const data=await response.json();if(session!==voiceSession.current||!data.text?.trim())return;
        if(voiceMode.current==='movement'){voiceMode.current='question';void latest.current.movement(data.text);}
        else await latest.current.send(data.text);
        await new Promise(resolve=>setTimeout(resolve,400));
      },()=>{if(!talking.current&&!busyRef.current&&session===voiceSession.current)status(context.state==='running'?'listening':'audio-blocked');},failed);
      capture.current=listener;setRecording(true);void listener.start().catch(failed);
    }catch{stopListening();status('error');setNotice(text(locale,'O microfone não está disponível neste navegador.','The microphone is unavailable in this browser.'));}
  }
  function requestVoice(mode:'question'|'movement'){
    if(audioNeedsTap.current||pendingAudio.current||capture.current&&audioContext.current?.state!=='running'){void enableAudio();return;}
    if(mode==='question'){if(capture.current)stopListening();else startListening();}
    else{voiceMode.current='movement';startListening();onCaption(text(locale,'Estou ouvindo seu pedido de movimento.','I am listening to your movement request.'));}
  }
  async function movement(value=move){
    if(!value.trim()||moving)return;unlockAudio();setMoving(true);setNotice('');
    try{
      const response=await fetch('/api/motion',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({request:value,locale})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);if(!alive.current)return;
      messagesRef.current=[...messagesRef.current,{role:'assistant',content:result.reply}];setMessages(messagesRef.current);onCaption(result.reply);await speak(result.reply);setMove('');
      if(result.state==='fallback'){onGesture();setNotice(result.note);onCaption(result.note);return;}
      const deadline=Date.now()+610000;
      while(alive.current&&Date.now()<deadline){
        await new Promise(resolve=>setTimeout(resolve,2000));if(!alive.current)return;
        const status=await (await fetch(`/api/motion/${result.id}`)).json();
        if(status.state==='ready'){onGesture(status.data);return;}
        if(status.state==='error')throw new Error('failed');
      }
      throw new Error('timeout');
    }catch{if(alive.current){const message=text(locale,'Não consegui criar esse movimento agora. Aqui vai um aceno já preparado.','I could not create this movement now. Here is a ready-to-play greeting.');setNotice(message);onCaption(message);onGesture();}}
    finally{if(alive.current)setMoving(false);}
  }
  return <div className="dialogue-grid">
    <div className="chat-card">
      <div className="chat-header"><img src={`/avatars/${avatar}-portrait.png`} alt=""/><div><strong>{text(locale,'Vamos conversar?','Let’s talk!')}</strong><span>{text(locale,'Seu espaço para perguntar e descobrir','Your space to ask and discover')}</span></div>
        <button className={`icon-button ${voice?'active':''}`} title={text(locale,'Ativar ou desativar voz','Toggle voice')} aria-pressed={voice} onClick={()=>{if(pendingAudio.current||phase==='audio-blocked'){void enableAudio();return;}unlockAudio();stopAudio();voiceEnabled.current=!voice;setVoice(!voice);if(!voice){const last=[...messagesRef.current].reverse().find(m=>m.role==='assistant');if(last)void speak(last.content);}}}><Volume2 size={19}/></button>
      </div>
      <div className="chat-messages" ref={list} aria-live="polite">
        <div className="chat-message assistant">{text(locale,'Você transformou instruções em movimento! O que precisou mudar no código para chegar ao resultado que queria?','You turned instructions into movement! What did you change in your code to get the result you wanted?')}</div>
        {messages.map((m,i)=><div key={i} className={`chat-message ${m.role}`}>{m.content}</div>)}
        {busy&&messages[messages.length-1]?.role==='user'&&<div className="chat-message assistant loading-dots">•••</div>}
      </div>
      {!messages.length&&<div className="question-chips">{[
        ['Qual é a diferença entre AR e VR?','What is the difference between AR and VR?'],
        ['Para que serve repetir?','What are loops for?'],
      ].map(([pt,en])=><button key={en} onClick={()=>void send(text(locale,pt,en))}>{text(locale,pt,en)}</button>)}</div>}
      <form className="chat-input" onSubmit={e=>{e.preventDefault();void send();}}>
        <input aria-label={text(locale,'Sua pergunta','Your question')} placeholder={text(locale,'O que você quer descobrir?','What would you like to discover?')} value={input} maxLength={1500} onChange={e=>setInput(e.target.value)}/>
        <button type="button" className={recording?'recording':''} aria-pressed={recording} aria-label={recording?text(locale,'Desligar microfone','Turn microphone off'):text(locale,'Ligar microfone','Turn microphone on')} onClick={()=>requestVoice('question')}>{recording?<MicOff size={20}/>:<Mic size={20}/>}</button>
        <button type="submit" className="send-button" disabled={busy||!input.trim()} aria-label={text(locale,'Enviar','Send')}><Send size={19}/></button>
      </form>
      {recording&&<p className="chat-voice-status" role="status">{phase==='listening'?text(locale,'Microfone ligado · Estou ouvindo','Microphone on · Listening'):text(locale,'Microfone ligado · Preparando a resposta','Microphone on · Preparing the reply')}</p>}
      {notice&&<p className="notice chat-notice" role="status">{notice}</p>}
      {phase==='audio-blocked'&&<button className="light-button chat-audio-enable" onClick={()=>void enableAudio()}><Volume2 size={18}/>{text(locale,'Ativar áudio','Enable audio')}</button>}
      <p className="chat-privacy">{offline?text(locale,'Modo de estudo local: o tutor online está indisponível. ','Local study mode: the online tutor is unavailable. '):''}{text(locale,'Escreva apenas sobre a atividade, sem dados pessoais. Na conversa VR/Cardboard, o microfone ouve suas falas e as envia após uma pausa. Desligue pelo ícone ou saia do visor.','Keep it about the activity, without personal details. In VR/Cardboard conversation, the microphone listens and sends each turn after a pause. Switch it off with the icon or exit the viewer.')}</p>
    </div>
    <aside className="movement-card"><div className="round-icon"><Sparkles size={27}/></div>
      <span className="eyebrow">{text(locale,'UM ÚLTIMO EXPERIMENTO','ONE LAST EXPERIMENT')}</span>
      <h3>{text(locale,'E se eu fizesse um movimento seu?','What if I tried your move?')}</h3>
      <p>{text(locale,'Gostaria que eu executasse algum movimento? Pode pedir um aceno, um giro, uma dança ou um salto pequeno.','Would you like me to perform a movement? Try a wave, a turn, a dance or a small jump.')}</p>
      <form onSubmit={e=>{
        e.preventDefault();(document.activeElement as HTMLElement|null)?.blur();
        void movement();
        // Let focus/disabled-input updates settle before scrolling on mobile Safari.
        requestAnimationFrame(()=>onShowAvatar?.());
      }}>
        <label htmlFor="motion-request">{text(locale,'Sua ideia','Your idea')}</label>
        <input id="motion-request" value={move} maxLength={500} placeholder={text(locale,'Faça uma dança alegre…','Do a cheerful dance…')} onChange={e=>setMove(e.target.value)} disabled={moving}/>
        <button className="primary-button" disabled={moving||!move.trim()}>{moving?text(locale,'Preparando o movimento…','Getting the movement ready…'):text(locale,'Ver meu movimento','See my move')}<Sparkles size={16}/></button>
      </form>
      {moving&&<p className="small-note">{text(locale,'Pode levar alguns minutos. Enquanto isso, continue a conversa.','This may take a few minutes. Keep chatting while you wait.')}</p>}
    </aside>
  </div>;
}
