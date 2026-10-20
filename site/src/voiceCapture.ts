/**
 * ScratchXR — Continuous microphone capture with silence-delimited turns.
 * Subsistema: EDU. Depende de: browser audio APIs. Usado por: Dialogue.
 */
export type VoicePhase='off'|'starting'|'listening'|'transcribing'|'thinking'|'speaking'|'error';

/** Kept separate from recording so timing and echo suppression can be checked. */
export class SpeechBoundary{
  private started=0;
  private lastVoice=0;
  private voiced=0;
  private previous=0;
  reset(){this.started=0;this.lastVoice=0;this.voiced=0;this.previous=0;}
  sample(level:number,now:number){
    const elapsed=this.previous?Math.min(250,Math.max(0,now-this.previous)):50;this.previous=now;
    if(!this.started)this.started=now;
    if(level>=.018){this.lastVoice=now;this.voiced+=elapsed;}
    if(this.voiced>=250&&(now-this.lastVoice>=1000||now-this.started>=20000)){this.reset();return 'send';}
    if(now-this.started>=20000){this.reset();return 'discard';}
    return 'wait';
  }
}

export class VoiceCapture{
  private stream?:MediaStream;
  private recorder?:MediaRecorder;
  private source?:MediaStreamAudioSourceNode;
  private analyser?:AnalyserNode;
  private timer?:ReturnType<typeof setInterval>;
  private stopped=false;
  private boundary=new SpeechBoundary();
  private recordingSince=0;
  constructor(private context:AudioContext,private suppressed:()=>boolean,
    private onAudio:(blob:Blob)=>Promise<void>,private onListening:()=>void,private onError:()=>void){}
  async start(){
    // Called directly in the viewer's click gesture. Late permissions cannot revive a closed session.
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(this.stopped){stream.getTracks().forEach(t=>t.stop());return;}
    this.stream=stream;this.source=this.context.createMediaStreamSource(stream);
    this.analyser=this.context.createAnalyser();this.analyser.fftSize=2048;this.source.connect(this.analyser);
    stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(!this.stopped){this.stop();this.onError();}}));
    this.record();
  }
  private record(){
    if(this.stopped||!this.stream)return;
    const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    const rec=new MediaRecorder(this.stream,type?{mimeType:type}:undefined),chunks:BlobPart[]=[];
    this.recorder=rec;this.boundary.reset();this.recordingSince=performance.now();let send=false;
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    rec.onerror=()=>{this.stop();this.onError();};
    rec.onstop=async()=>{
      clearInterval(this.timer);
      if(this.stopped)return;
      try{if(send&&chunks.length)await this.onAudio(new Blob(chunks,{type:rec.mimeType}));}
      catch{if(!this.stopped){this.stop();this.onError();return;}}
      if(!this.stopped)this.record();
    };
    const values=new Float32Array(this.analyser!.fftSize);
    rec.start(250);this.onListening();
    this.timer=setInterval(()=>{
      if(this.stopped||rec.state!=='recording')return;
      if(this.suppressed()){
        this.boundary.reset();
        // Drop audio accumulated while the tutor speaks/thinks.
        if(performance.now()-this.recordingSince>=300)rec.stop();
        return;
      }
      this.analyser!.getFloatTimeDomainData(values);
      const rms=Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length);
      const decision=this.boundary.sample(rms,performance.now());
      if(decision!=='wait'){send=decision==='send';rec.stop();}
    },50);
  }
  stop(){
    this.stopped=true;clearInterval(this.timer);
    if(this.recorder?.state==='recording')this.recorder.stop();
    this.stream?.getTracks().forEach(t=>t.stop());this.source?.disconnect();this.analyser?.disconnect();
  }
}
