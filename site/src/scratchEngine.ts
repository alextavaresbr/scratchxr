/**
 * ScratchXR — Native Scratch VM / Blocks / Render integration.
 * Subsistema: EDU. Depende de: Scratch libraries, trace. Usado por: ScratchEditor.
 */
import * as Blocks from 'scratch-blocks';
// @ts-expect-error Scratch Audio is an upstream CommonJS browser library.
import AudioEngine from 'scratch-audio';
// @ts-expect-error Upstream toolbox generator is JavaScript without declarations.
import makeToolbox from './scratchToolbox.js';
import {TraceRecorder} from './trace';
import {avatars,type ActorState,type AvatarId,type Locale,type Trace} from './types';
import {sceneAssets,type SceneId} from './sceneAssets';
type HostCallbacks={onRun:(active:boolean)=>void;onTrace:(trace:Trace)=>void;onError:(message:string)=>void;onDirty:()=>void;
  onAsk:(question:string|null,answer:(value:string)=>void)=>void};
const xmlEscape=(s:string)=>s.replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]!));
const shadow=(name:string,value:number|string)=>`<value name="${name}"><shadow type="${typeof value==='number'?'math_number':'text'}"><field name="${typeof value==='number'?'NUM':'TEXT'}">${xmlEscape(String(value))}</field></shadow></value>`;
export const starterXML=(locale:Locale)=>`<xml><block type="event_whenflagclicked" x="32" y="32">
<next><block type="motion_gotoxy">${shadow('X',-90)}${shadow('Y',0)}
<next><block type="motion_pointindirection">${shadow('DIRECTION',90)}
<next><block type="motion_glidesecstoxy">${shadow('SECS',2)}${shadow('X',90)}${shadow('Y',0)}
<next><block type="looks_say">${shadow('MESSAGE',locale==='pt-BR'?'Eu programei esse caminho!':'I coded this path!')}</block></next>
</block></next></block></next></block></next></block></xml>`;

export class ScratchEngine {
  readonly vm:any;
  workspace!:Blocks.WorkspaceSvg;
  renderer:any;
  private recorder=new TraceRecorder();
  private timer=0;
  private rendering=0;
  private disposed=false;
  private restoring=false;
  private hooked=new WeakSet<object>();
  private bubbles=new Map<string,string>();
  private lastTrace?:Trace;
  private avatar:AvatarId='avatar-a';
  private scene:SceneId='forest';
  private backdropName='';
  private resize?:ResizeObserver;
  private warnings=new Set<string>();
  private assetUrls=new Map<string,string>();
  private blobUrls:string[]=[];
  private startTime=0;
  private keyboardDown:(e:KeyboardEvent)=>void;
  private keyboardUp:(e:KeyboardEvent)=>void;
  private keyboardContext:(e:Event)=>void;
  private keyboardEngaged=false;
  private pressedKeys=new Map<string,string>();
  private releaseKeys=()=>{
    for(const key of this.pressedKeys.values())this.vm.postIOData('keyboard',{key,isDown:false});
    this.pressedKeys.clear();
  };
  private visibilityChanged=()=>{if(document.hidden)this.releaseKeys();};
  private stagePointer:(e:PointerEvent)=>void;
  constructor(private container:HTMLElement,private canvas:HTMLCanvasElement,
    private locale:Locale,private callbacks:HostCallbacks){
    this.vm=new window.VirtualMachine();
    const storage=new window.ScratchStorage.ScratchStorage();
    storage.addWebStore([storage.AssetType.ImageBitmap,storage.AssetType.ImageVector,storage.AssetType.Sound],
      (asset:any)=>this.assetUrls.get(asset.assetId));
    this.vm.attachStorage(storage);
    this.renderer=new window.ScratchRender(canvas);
    this.vm.attachRenderer(this.renderer);
    this.vm.attachV2BitmapAdapter(new window.ScratchSVGRenderer.BitmapAdapter());
    this.vm.attachAudioEngine(new AudioEngine());
    this.vm.setCompatibilityMode(true);
    this.vm.runtime.on('SAY',()=>this.capture());
    this.vm.runtime.on('QUESTION',(question:string|null)=>callbacks.onAsk(question,value=>this.vm.runtime.emit('ANSWER',value)));
    this.vm.on('workspaceUpdate',({xml}:{xml:string})=>this.restoreWorkspace(xml));
    this.vm.runtime.on('targetWasCreated',()=>this.hookTargets());
    this.vm.runtime.on('PROJECT_RUN_START',()=>{
      if(!this.recorder.active){this.startRecording();}callbacks.onRun(true);
    });
    this.vm.runtime.on('PROJECT_RUN_STOP',()=>{if(this.recorder.active)this.finish(false);});
    this.vm.runtime.on('PROJECT_STOP_ALL',()=>{if(this.recorder.active)this.finish(false);});
    const editor=container.closest('.editor-shell')??container;
    const isControl=(target:EventTarget|null)=>target instanceof Element&&!!target.closest(
      'input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="button"],[role="menu"],[role="listbox"]');
    this.keyboardContext=e=>{
      this.keyboardEngaged=e.target instanceof Node&&editor.contains(e.target);
      if(!this.keyboardEngaged||isControl(e.target))this.releaseKeys();
    };
    this.keyboardDown=e=>{
      if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||isControl(e.target))return;
      const focused=e.target instanceof Node&&editor.contains(e.target),r=editor.getBoundingClientRect();
      if((!focused&&!this.keyboardEngaged)||r.bottom<=0||r.top>=innerHeight)return;
      if(e.key.length!==1&&!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key))return;
      // Prevent the browser action on every repeat, but send one key-down per press.
      e.preventDefault();
      const code=e.code||e.key;
      if(e.repeat||this.pressedKeys.has(code))return;
      this.pressedKeys.set(code,e.key);this.vm.postIOData('keyboard',{key:e.key,isDown:true});
    };
    this.keyboardUp=e=>{
      const code=e.code||e.key,key=this.pressedKeys.get(code);if(key===undefined)return;
      this.pressedKeys.delete(code);this.vm.postIOData('keyboard',{key,isDown:false});
    };
    this.stagePointer=e=>{
      const r=canvas.getBoundingClientRect();
      this.vm.postIOData('mouse',{x:e.clientX-r.left,y:e.clientY-r.top,canvasWidth:r.width,canvasHeight:r.height,
        isDown:e.type==='pointerdown'?true:e.type==='pointerup'?false:undefined});
      if(e.type==='pointerdown')canvas.focus({preventScroll:true});
    };
    window.addEventListener('keydown',this.keyboardDown);window.addEventListener('keyup',this.keyboardUp);
    window.addEventListener('pointerdown',this.keyboardContext,true);window.addEventListener('focusin',this.keyboardContext);
    window.addEventListener('blur',this.releaseKeys);document.addEventListener('visibilitychange',this.visibilityChanged);
    for(const event of ['pointerdown','pointerup','pointermove'])canvas.addEventListener(event,this.stagePointer as EventListener);
  }
  async init(){
    await this.vm.setLocale(this.locale==='pt-BR'?'pt-br':'en');
    const project=await this.makeProject();
    if(this.disposed)return;
    await this.vm.loadProject(JSON.stringify(project));
    if(this.disposed)return;
    this.vm.start();
    this.mountBlocks();
    this.setExample();
    this.hookTargets();
    const draw=()=>{
      if(this.disposed)return;
      // Timed say/think blocks clear their native state without emitting SAY.
      // Observe that state as well, so the recording matches the actual bubble.
      if(this.recorder.active&&this.vm.runtime.targets.some((t:any)=>!t.isStage&&
        (t.getCustomState('Scratch.looks')?.text??'')!==(this.bubbles.get(t.id)??'')))this.capture();
      this.renderer.draw();this.rendering=requestAnimationFrame(draw);
    };draw();
    window.__scratchxr={vm:this.vm,getTrace:()=>this.lastTrace,locale:this.locale};
  }
  private mountBlocks(){
    Blocks.ScratchMsgs.setLocale(this.locale==='pt-BR'?'pt-br':'en');
    const menu=(type:string,field:string,options:()=>string[][],category:string)=>{
      Blocks.Blocks[type]={init:function(this:Blocks.Block){this.jsonInit({
        message0:'%1',args0:[{type:'field_dropdown',name:field,options}],
        extensions:[`colours_${category}`,'output_string'],
      });}};
    };
    const otherTargets=()=>this.vm.runtime.targets.filter((t:any)=>!t.isStage).map((t:any)=>[t.sprite.name,t.sprite.name]);
    const pointer=()=>[[this.locale==='en'?'mouse-pointer':'ponteiro do mouse','_mouse_'],...otherTargets()];
    menu('motion_pointtowards_menu','TOWARDS',pointer,'motion');
    for(const type of ['motion_goto_menu','motion_glideto_menu'])menu(type,'TO',()=>[[this.locale==='en'?'random position':'posição aleatória','_random_'],...pointer()],'motion');
    menu('sensing_touchingobjectmenu','TOUCHINGOBJECTMENU',()=>[[this.locale==='en'?'edge':'borda','_edge_'],...pointer()],'sensing');
    menu('sensing_distancetomenu','DISTANCETOMENU',pointer,'sensing');
    menu('sensing_of_object_menu','OBJECT',()=>[['Stage','_stage_'],...otherTargets()],'sensing');
    menu('looks_costume','COSTUME',()=>avatars.map(a=>[a.name,a.name]),'looks');
    menu('looks_backdrops','BACKDROP',()=>sceneAssets.map(s=>[s.name[this.locale],s.id]),'looks');
    menu('sound_sounds_menu','SOUND_MENU',()=>[['tone','tone']],'sounds');
    menu('control_create_clone_of_menu','CLONE_OPTION',()=>[[this.locale==='en'?'myself':'este ator','_myself_'],...otherTargets()],'control');
    Blocks.Blocks.event_whenbackdropswitchesto={init:function(this:Blocks.Block){this.jsonInit({
      message0:Blocks.Msg.EVENT_WHENBACKDROPSWITCHESTO,args0:[{type:'field_dropdown',name:'BACKDROP',options:sceneAssets.map(s=>[s.name[Blocks.ScratchMsgs.currentLocale_==='en'?'en':'pt-BR'],s.id])}],extensions:['colours_event','shape_hat']});}};
    Blocks.Blocks.sensing_of={init:function(this:Blocks.Block){this.jsonInit({
      message0:Blocks.Msg.SENSING_OF,args0:[{type:'field_dropdown',name:'PROPERTY',options:[['x position','x position'],['y position','y position'],['direction','direction'],['size','size'],['volume','volume']]},{type:'input_value',name:'OBJECT'}],extensions:['colours_sensing','output_string']});}};
    Blocks.ScratchVariables.setPromptHandler((message,value,done)=>{const result=window.prompt(message,value);if(result!==null)done(result,[],{scope:'local'});});
    const blockStyles=Object.fromEntries(Object.entries({motion:'#4c97ff',looks:'#9966ff',sounds:'#cf63cf',
      event:'#ffbf00',control:'#ffab19',sensing:'#5cb1d6',operators:'#59c059',data:'#ff8c1a',data_lists:'#ff661a',
      more:'#ff6680',textField:'#ffffff',textFieldSelected:'#eeeeee',pen:'#0fbd8c'}).map(([name,color])=>[
        name,{colourPrimary:color,colourSecondary:color,colourTertiary:color}]));
    const theme=Blocks.Theme.defineTheme('scratchxr',{name:'scratchxr',blockStyles,
      componentStyles:{workspaceBackgroundColour:'#ffffff',toolboxBackgroundColour:'#f8f5fc',flyoutBackgroundColour:'#f5f2f8',
        toolboxForegroundColour:'#6f657e',flyoutForegroundColour:'#6f657e',flyoutOpacity:1},
      fontStyle:{family:'DM Sans, sans-serif',weight:'500',size:12}});
    // Scratch's variable and procedure categories retain native XML mutations.
    this.workspace=Blocks.inject(this.container,{
      theme,media:'/vendor/blocks-media/',toolbox:'<xml><category name="..." colour="#4c97ff" secondaryColour="#4c97ff"/></xml>',
      trashcan:true,scrollbars:true,sounds:false,zoom:{controls:true,wheel:true,startScale:.75,maxScale:1.4,minScale:.35},
      move:{scrollbars:true,drag:true,wheel:true},grid:{spacing:28,length:2,colour:'#ddd8ed',snap:false},
    });
    this.workspace.registerToolboxCategoryCallback('VARIABLE',Blocks.ScratchVariables.getVariablesCategory);
    this.workspace.registerToolboxCategoryCallback('PROCEDURE',Blocks.ScratchProcedures.getProceduresCategory);
    this.workspace.updateToolbox(makeToolbox(false,false,this.vm.editingTarget?.id,[],
      avatars.find(a=>a.id===this.avatar)!.name,this.scene,'tone'));
    (this.workspace.getToolbox() as any).forceRerender();
    this.workspace.addChangeListener((event:any)=>{
      if(!this.restoring){this.vm.blockListener(event);if(!event.isUiEvent)this.callbacks.onDirty();}
      if(event.type.startsWith('var_'))requestAnimationFrame(()=>(this.workspace.getToolbox() as any)?.forceRerender());
      if(event.type==='click'&&event.blockId&&event.element==='stackclick')this.vm.runtime.toggleScript(event.blockId);
    });
    this.workspace.getFlyout()?.getWorkspace().addChangeListener((e:any)=>this.vm.flyoutBlockListener(e));
    this.resize=new ResizeObserver(entries=>{
      for(const entry of entries){
        if(entry.target===this.container)Blocks.svgResize(this.workspace);
        else if(entry.contentRect.width>0&&entry.contentRect.height>0)this.renderer.resize(entry.contentRect.width,entry.contentRect.height);
      }
    });
    this.resize.observe(this.container);this.resize.observe(this.canvas);
    // The upstream host callback is a single prompt; full procedure argument editor follows the same mutation schema.
    Blocks.ScratchProcedures.externalProcedureDefCallback=(mutation,done)=>{
      const name=window.prompt(this.locale==='pt-BR'?'Nome do meu bloco':'Name of my block',mutation.getAttribute('proccode')||'');
      if(!name?.trim()){done();return;}
      mutation.setAttribute('proccode',name.trim().replace(/%[sbn]/g,''));
      mutation.setAttribute('argumentids','[]');mutation.setAttribute('argumentnames','[]');mutation.setAttribute('argumentdefaults','[]');mutation.setAttribute('warp','false');done(mutation);
    };
  }
  private restoreWorkspace(xml:string){
    if(!this.workspace)return;
    this.restoring=true;
    try{Blocks.Events.disable();Blocks.clearWorkspaceAndLoadFromXml(Blocks.utils.xml.textToDom(xml),this.workspace);}
    finally{Blocks.Events.enable();this.restoring=false;}
  }
  setExample(){this.stop();Blocks.clearWorkspaceAndLoadFromXml(Blocks.utils.xml.textToDom(starterXML(this.locale)),this.workspace);}
  insertBlock(type:string){
    const block=this.workspace.newBlock(type);block.initSvg();block.render();block.moveBy(60,50);
  }
  async setLocale(locale:Locale){
    this.locale=locale;this.stop();
    const xml=Blocks.Xml.domToText(Blocks.Xml.workspaceToDom(this.workspace));
    this.resize?.disconnect();this.workspace.dispose();
    await this.vm.setLocale(locale==='pt-BR'?'pt-br':'en');
    this.mountBlocks();this.restoreWorkspace(xml);
    if(window.__scratchxr)window.__scratchxr.locale=locale;
  }
  selectAvatar(id:AvatarId){
    this.stop();this.avatar=id;const target=this.vm.editingTarget;
    if(target){target.setCostume(avatars.findIndex(a=>a.id===id));target.sprite.name=avatars.find(a=>a.id===id)!.name;}
  }
  selectScene(id:SceneId){this.stop();this.scene=id;this.vm.runtime.getTargetForStage()?.setCostume(sceneAssets.findIndex(s=>s.id===id));}
  private snapshot():ActorState[]{
    return this.vm.runtime.targets.filter((t:any)=>!t.isStage).map((t:any)=>({
      id:t.id,avatar:avatars[t.currentCostume%avatars.length]?.id??this.avatar,
      x:t.x,y:t.y,direction:t.direction,size:t.size,visible:t.visible,
      text:String(t.getCustomState('Scratch.looks')?.text??''),costume:t.currentCostume,rotationStyle:t.rotationStyle,
    }));
  }
  private capture(){
    const stage=this.vm.runtime.getTargetForStage();
    const backdrop=stage?.getCostumes()[stage.currentCostume]?.name??'';
    if(backdrop!==this.backdropName){
      this.backdropName=backdrop;
      const known=sceneAssets.some(scene=>scene.id===backdrop);
      if(this.canvas.parentElement)this.canvas.parentElement.style.backgroundImage=known?`url(/backdrops/${backdrop}-panorama.png)`:'none';
    }
    this.scene=sceneAssets[stage?.currentCostume??0]?.id??this.scene;
    const actors=this.snapshot();
    this.bubbles.clear();for(const actor of actors)this.bubbles.set(actor.id,actor.text);
    this.recorder.capture(performance.now(),actors,this.scene);
  }
  private hookTargets(){
    for(const target of this.vm.runtime.targets){
      if(this.hooked.has(target))continue;this.hooked.add(target);
      for(const method of ['setXY','setDirection','setSize','setVisible','setCostume','setRotationStyle','setEffect','clearEffects']){
        if(typeof target[method]!=='function')continue;
        const original=target[method];
        target[method]=(...args:unknown[])=>{const value=original.apply(target,args);this.capture();return value;};
      }
    }
  }
  private startRecording(){
    this.callbacks.onDirty();
    this.startTime=performance.now();this.recorder.begin(this.startTime);this.warnings.clear();this.hookTargets();this.capture();
    const blocks=Object.values(this.vm.editingTarget?.blocks?._blocks??{}) as any[];
    for(const b of blocks){
      if(b.opcode?.startsWith('sound_'))this.warnings.add('sound');
      if(/looks_(.*effect|.*layer|goto)/.test(b.opcode))this.warnings.add('effects');
      if(/control_create_clone/.test(b.opcode))this.warnings.add('clones');
      if(/looks_(nextcostume|switchcostumeto)/.test(b.opcode))this.warnings.add('costumes');
    }
    // A finite recording window is a lesson constraint, never an implicit Scratch semantic.
    clearTimeout(this.timer);this.timer=window.setTimeout(()=>this.stop(true),30000);
  }
  run(){this.stop();this.vm.greenFlag();this.startRecording();this.callbacks.onRun(true);this.canvas.focus({preventScroll:true});}
  stop(truncated=false){
    if(this.recorder.active)this.finish(truncated);
    this.vm.stopAll();this.callbacks.onRun(false);
  }
  private finish(truncated:boolean){
    clearTimeout(this.timer);this.capture();
    this.lastTrace=this.recorder.finish(performance.now(),truncated,[...this.warnings]);
    this.callbacks.onRun(false);this.callbacks.onTrace(this.lastTrace);
  }
  async save(){
    const blob=await this.vm.saveProjectSb3();const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='ScratchXR.sb3';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  async load(file:File){this.stop();this.callbacks.onDirty();await this.vm.loadProject(await file.arrayBuffer());this.hookTargets();}
  private async makeProject(){
    const storage=this.vm.runtime.storage;
    const asset=async(url:string,name:string,format:'png'|'svg',cx:number,cy:number)=>{
      let data=new Uint8Array(await (await fetch(url)).arrayBuffer());
      let source=url;
      // Preserve the full-resolution cutout inside a native SVG costume. Its
      // logical dimensions stay 92 x 115; Scratch rasterizes it for screen/DPR.
      // Bitmap costumes are forced to resolution 2 by VM and lose fine edges.
      if(format==='png'&&url.startsWith('/avatars/')){
        let binary='';
        for(let offset=0;offset<data.length;offset+=32768)binary+=String.fromCharCode(...data.subarray(offset,offset+32768));
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="92" height="115" viewBox="0 0 92 115"><image width="92" height="115" xlink:href="data:image/png;base64,${btoa(binary)}"/></svg>`;
        data=new TextEncoder().encode(svg);format='svg';cx=46;cy=57.5;
        source=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'}));this.blobUrls.push(source);
      }
      const a=storage.createAsset(format==='png'?storage.AssetType.ImageBitmap:storage.AssetType.ImageVector,
        format,data,null,true);
      this.assetUrls.set(a.assetId,source);
      return {assetId:a.assetId,name,bitmapResolution:format==='png'?2:1,md5ext:`${a.assetId}.${format}`,dataFormat:format,
        rotationCenterX:cx,rotationCenterY:cy};
    };
    const costumes=await Promise.all(avatars.map(a=>asset(`/avatars/${a.id}.png`,a.name,'png',256,320)));
    const backdrops=await Promise.all(sceneAssets.map(s=>asset(`/backdrops/${s.id}.png`,s.id,'png',480,360)));
    const wav=new Uint8Array(await(await fetch('/sounds/tone.wav')).arrayBuffer());
    const audio=storage.createAsset(storage.AssetType.Sound,'wav',wav,null,true);
    this.assetUrls.set(audio.assetId,'/sounds/tone.wav');
    const sounds=[{assetId:audio.assetId,name:'tone',dataFormat:'wav',format:'',rate:22050,sampleCount:Math.round(22050*.35),md5ext:`${audio.assetId}.wav`}];
    const base={variables:{},lists:{},broadcasts:{},blocks:{},comments:{},currentCostume:0,sounds,volume:100,layerOrder:0};
    return {targets:[
      {...base,isStage:true,name:'Stage',costumes:backdrops,tempo:60,videoTransparency:50,videoState:'off',textToSpeechLanguage:null},
      {...base,isStage:false,name:'Luna',costumes,x:-90,y:0,size:100,direction:90,draggable:false,rotationStyle:'left-right',layerOrder:1},
    ],monitors:[],extensions:[],meta:{semver:'3.0.0',vm:'15.2.0',agent:'ScratchXR'}};
  }
  dispose(){
    this.disposed=true;clearTimeout(this.timer);cancelAnimationFrame(this.rendering);
    this.releaseKeys();
    this.resize?.disconnect();this.workspace?.dispose();this.vm.quit();
    window.removeEventListener('keydown',this.keyboardDown);window.removeEventListener('keyup',this.keyboardUp);
    window.removeEventListener('pointerdown',this.keyboardContext,true);window.removeEventListener('focusin',this.keyboardContext);
    window.removeEventListener('blur',this.releaseKeys);document.removeEventListener('visibilitychange',this.visibilityChanged);
    for(const event of ['pointerdown','pointerup','pointermove'])this.canvas.removeEventListener(event,this.stagePointer as EventListener);
    this.renderer?.dispose?.();delete window.__scratchxr;
    this.blobUrls.forEach(url=>URL.revokeObjectURL(url));
  }
}
