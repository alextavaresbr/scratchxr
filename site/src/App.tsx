/**
 * ScratchXR — Bilingual scrollytelling learning journey.
 * Subsistema: EDU. Depende de: React, course components. Usado por: main.
 */
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowRight,Check,ChevronLeft,ChevronRight,Download,MousePointer2,Pause,Play,Stars} from 'lucide-react';
import {text,type AvatarId,type Locale,type MotionData,type Trace} from './types';
import type {SceneId} from './sceneAssets';
import {Dialogue,type DialogueHandle} from './Dialogue';
import type {VoicePhase} from './voiceCapture';
const ScratchEditor=lazy(()=>import('./ScratchEditor').then(m=>({default:m.ScratchEditor})));
const WorldView=lazy(()=>import('./WorldView').then(m=>({default:m.WorldView})));
const categories=[
  {id:'Movimento',symbol:'Mo',en:'Motion',color:'#4c97ff',block:'motion_movesteps',pt:'Onde estou e para onde vou?',desc:'Where am I and where am I going?',tip:['Mude posição e direção. Um passo é uma unidade do palco. “Deslize” também define quanto tempo o trajeto leva.','Change position and direction. A step is one stage unit. “Glide” also sets how long the journey takes.']},
  {id:'Aparência',symbol:'Ap',en:'Looks',color:'#9966ff',block:'looks_say',pt:'Como eu apareço?',desc:'How do I appear?',tip:['Mostre, esconda, troque a fantasia ou exiba uma fala. Na nossa atividade, as fantasias correspondem aos três avatares.','Show, hide, switch costume or display a speech bubble. In this activity, costumes match the three avatars.']},
  {id:'Som',symbol:'So',en:'Sound',color:'#c65fc5',block:'sound_play',pt:'O que podemos ouvir?',desc:'What can we hear?',tip:['Toque sons, altere o volume e use pausas. Esperar o som terminar muda a ordem do que acontece.','Play sounds, change volume and use pauses. Waiting for a sound to finish changes the order of events.']},
  {id:'Eventos',symbol:'Ev',en:'Events',color:'#d9a500',block:'event_whenflagclicked',pt:'O que faz tudo começar?',desc:'What starts it all?',tip:['A bandeira verde inicia o programa. Teclas, cliques e mensagens também podem disparar sequências.','The green flag starts the program. Keys, clicks and broadcasts can also trigger sequences.']},
  {id:'Controle',symbol:'Co',en:'Control',color:'#ec9215',block:'control_repeat',pt:'Quando e quantas vezes?',desc:'When and how many times?',tip:['Repita ações, espere e tome decisões com “se… então”. Os blocos em forma de C guardam outros blocos dentro deles.','Repeat actions, wait and make decisions with “if… then”. C-shaped blocks hold other blocks inside.']},
  {id:'Sensores',symbol:'Se',en:'Sensing',color:'#329bc5',block:'sensing_keypressed',pt:'O que está acontecendo?',desc:'What is happening?',tip:['Pergunte, detecte uma tecla ou teste se encostou na borda. O programa usa essas respostas para decidir.','Ask, detect a key or check for an edge. Your program can use these answers to make decisions.']},
  {id:'Operadores',symbol:'Op',en:'Operators',color:'#3da76b',block:'operator_add',pt:'Como calcular e comparar?',desc:'How can I calculate and compare?',tip:['Some, compare números e combine condições com “e”, “ou” e “não”. Os encaixes mostram quais tipos de resposta cabem.','Add, compare numbers and combine conditions with “and”, “or” and “not”. Block shapes show which answers fit.']},
  {id:'Variáveis',symbol:'Va',en:'Variables',color:'#ed7e26',block:'data_setvariableto',pt:'O que preciso lembrar?',desc:'What do I need to remember?',tip:['Guarde uma pontuação, um número de passos ou uma resposta. Uma variável é um valor que pode mudar.','Store a score, a step count or an answer. A variable is a value that can change.']},
];
function Catalog({locale,onContinue}:{locale:Locale;onContinue:()=>void}){
  const [active,setActive]=useState(0),[assets,setAssets]=useState<{category:string;locale:string;url:string}[]>([]),[chosen,setChosen]=useState(0);
  const [visited,setVisited]=useState(()=>new Set([0])),[paused,setPaused]=useState(false),[visible,setVisible]=useState(false);
  const [awake,setAwake]=useState(!document.hidden);
  const detail=useRef<HTMLDivElement>(null);
  useEffect(()=>{void fetch('/blocks.json').then(r=>r.json()).then(setAssets);},[]);
  useEffect(()=>setChosen(0),[locale,active]);
  const category=categories[active],pieces=assets.filter(a=>a.category===category.id&&a.locale===(locale==='en'?'eng':'br'));
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{threshold:.15});
    if(detail.current)observer.observe(detail.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{const update=()=>setAwake(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  useEffect(()=>{
    if(paused||!visible||!awake||pieces.length<2)return;
    const timer=setTimeout(()=>setChosen(v=>(v+1)%pieces.length),5000);
    return()=>clearTimeout(timer);
  },[paused,visible,awake,chosen,active,locale,pieces.length]);
  const change=(direction:number)=>setChosen(v=>(v+direction+pieces.length)%pieces.length);
  const selectCategory=(index:number)=>{setActive(index);setChosen(0);setVisited(v=>new Set([...v,index]));};
  return <div className="catalog-layout"><div className="catalog-sidebar">
    <div className="category-browser">
    <div className="category-grid">{categories.map((c,i)=><button key={c.id} className={`element-card ${active===i?'chosen':''} ${visited.has(i)?'visited':''}`} style={{'--category':c.color} as React.CSSProperties} aria-label={locale==='en'?c.en:c.id} aria-description={visited.has(i)?text(locale,'Família explorada','Explored family'):text(locale,'Família ainda não explorada','Family not explored yet')} aria-pressed={active===i} onClick={()=>selectCategory(i)}>
      <span className="element-number">{String(i+1).padStart(2,'0')}</span><strong>{c.symbol}</strong><span>{locale==='en'?c.en:c.id}</span>
    </button>)}</div>
    </div><div className="catalog-notes">
    <p className="catalog-credit">{text(locale,'Explore as oito famílias de blocos para avançar. Use as setas para conhecer as peças de cada família.','Explore all eight block families to continue. Use the arrows to discover the blocks in each family.')}</p>
    <p className="catalog-progress" role="status">{text(locale,`${visited.size} de 8 famílias exploradas`,`${visited.size} of 8 families explored`)}</p>
    </div></div><div ref={detail} className="catalog-detail" style={{'--category':category.color} as React.CSSProperties}>
    <div className="catalog-detail-top"><span className="category-dot"/><span>{locale==='en'?category.en:category.id}</span><span className="piece-count">{pieces.length} {text(locale,'peças do acervo','library blocks')}</span>
      <button className="carousel-pause" aria-label={paused?text(locale,'Retomar troca automática','Resume automatic rotation'):text(locale,'Pausar troca automática','Pause automatic rotation')} title={paused?text(locale,'Retomar troca automática','Resume automatic rotation'):text(locale,'Pausar troca automática','Pause automatic rotation')} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>
    </div>
    <figure className="piece-figure">
    <div className="piece-carousel" role="region" aria-label={text(locale,'Peças desta família','Blocks in this family')}>
      <button className="carousel-arrow" aria-label={text(locale,'Peça anterior','Previous block')} disabled={pieces.length<2} onClick={()=>change(-1)}><ChevronLeft size={30}/></button>
      <div className="piece-preview">{pieces.length>0&&<img src={pieces[chosen%pieces.length].url} alt={text(locale,`Peça ${chosen+1} de ${category.id}`,`${category.en} block ${chosen+1}`)}/>}</div>
      <button className="carousel-arrow" aria-label={text(locale,'Próxima peça','Next block')} disabled={pieces.length<2} onClick={()=>change(1)}><ChevronRight size={30}/></button>
    </div>
    <figcaption className="piece-caption"><h3>{text(locale,category.pt,category.desc)}</h3><p>{text(locale,...category.tip as [string,string])}</p></figcaption>
    </figure>
  </div><div className="catalog-advance"><button className="primary-button course-advance" disabled={visited.size<categories.length} onClick={onContinue}>{text(locale,'Vamos programar','Let’s code')}<ArrowDown size={18}/></button></div></div>;
}
export default function App(){
  const [locale,setLocale]=useState<Locale>(()=>(localStorage.getItem('scratchxr-language')==='en'?'en':'pt-BR'));
  const [started,setStarted]=useState(false),[unlocked,setUnlocked]=useState(0),[active,setActive]=useState(0);
  const [headerHidden,setHeaderHidden]=useState(false);
  const header=useRef<HTMLElement>(null);
  const headerFocusUntil=useRef(0);
  const [concept,setConcept]=useState(0),[quiz,setQuiz]=useState<number|null>(null);
  const [avatar,setAvatar]=useState<AvatarId>('avatar-a'),[scene,setScene]=useState<SceneId>('forest');
  const [trace,setTrace]=useState<Trace>(),[replayed,setReplayed]=useState(false),[reflected,setReflected]=useState(false);
  const [speaking,setSpeaking]=useState(false),[gesture,setGesture]=useState<{sequence:number;data?:MotionData}>();
  const [caption,setCaption]=useState(''),[voicePhase,setVoicePhase]=useState<VoicePhase>('off');
  const dialogue=useRef<DialogueHandle>(null);
  const t=(pt:string,en:string)=>text(locale,pt,en);
  useEffect(()=>{document.documentElement.lang=locale;localStorage.setItem('scratchxr-language',locale);},[locale]);
  useEffect(()=>{
    if(!started)return;
    // Clamp Safari's elastic overscroll and accumulate small movements by direction.
    const scrollPosition=()=>Math.max(0,Math.min(window.scrollY,document.documentElement.scrollHeight-window.innerHeight));
    let previous=scrollPosition(),direction=0,distance=0,frame=0;
    const update=()=>{
      frame=0;
      const current=scrollPosition(),delta=current-previous;previous=current;
      if(performance.now()<headerFocusUntil.current)return;
      if(current<=2){direction=0;distance=0;setHeaderHidden(false);return;}
      if(!delta)return;
      const nextDirection=Math.sign(delta);
      distance=nextDirection===direction?distance+Math.abs(delta):Math.abs(delta);
      direction=nextDirection;
      if(direction>0){
        if(distance>=12){setHeaderHidden(true);distance=0;}
        return;
      }
      // Reveal only as the beginning of a section returns to the top of the viewport.
      const headerHeight=header.current?.offsetHeight??84;
      const atSectionStart=[...document.querySelectorAll('main>section')].some(section=>{
        const top=section.getBoundingClientRect().top;
        return top>=-24&&top<=headerHeight+32;
      });
      if(!atSectionStart)setHeaderHidden(true);
      else if(distance>=6)setHeaderHidden(false);
    };
    const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update);};
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>{window.removeEventListener('scroll',onScroll);cancelAnimationFrame(frame);};
  },[started]);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)setActive(Number((e.target as HTMLElement).dataset.step));},{rootMargin:'-15% 0px -50% 0px'});
    document.querySelectorAll('[data-step]').forEach(e=>observer.observe(e));return()=>observer.disconnect();
  },[started,unlocked]);
  function advance(step:number){
    if(step>unlocked+1)return;
    if(step===2&&quiz!==1||step===4&&!trace||step===5&&!replayed||step===6&&!reflected)return;
    setUnlocked(v=>Math.max(v,step));
    setTimeout(()=>document.getElementById(`step-${step}`)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}),50);
  }
  function invalidate(){setTrace(undefined);setReplayed(false);setReflected(false);setUnlocked(v=>Math.min(v,3));}
  const concepts=[
    [t('Dividir','Decompose'),t('Separe uma ideia grande em pequenas partes.','Break a big idea into smaller parts.'),t('Para explorar um lugar: escolher um caminho, caminhar e olhar ao redor.','To explore a place: choose a path, walk and look around.')],
    [t('Reconhecer padrões','Spot patterns'),t('Encontre o que se repete.','Find what repeats.'),t('Se o movimento se repete, você pode descrevê-lo uma vez e usar uma repetição.','If a movement repeats, describe it once and use a loop.')],
    [t('Focar no essencial','Abstract'),t('Escolha os detalhes que importam agora.','Choose the details that matter now.'),t('Para programar o trajeto, a posição importa. A cor do cabelo não muda o destino.','To code the route, position matters. Hair color does not change the destination.')],
    [t('Criar uma sequência','Make an algorithm'),t('Organize instruções em uma ordem clara.','Arrange instructions in a clear order.'),t('Primeiro escolha o ponto inicial. Depois defina o caminho. Por fim, execute e confira.','First choose the starting point. Then define the path. Finally, run and check.')],
  ];
  return <><a className="skip-link" href="#top">{t('Pular para o conteúdo','Skip to content')}</a>
    {!started&&<div className="language-screen"><div className="language-orb orb-one"/><div className="language-orb orb-two"/>
      <div className="language-card"><img className="language-logo" src="/art/scratchxr-logo.png" alt="ScratchXR"/>
        <div className="language-options"><button onClick={()=>{setLocale('pt-BR');setStarted(true);window.scrollTo(0,0);}}><img src="/art/flag-br.png" alt=""/><span><strong>Português</strong><small>Brasil</small></span><ArrowRight size={20}/></button>
          <button onClick={()=>{setLocale('en');setStarted(true);window.scrollTo(0,0);}}><img src="/art/flag-us.svg" alt=""/><span><strong>ENGLISH</strong><small>EUA</small></span><ArrowRight size={20}/></button></div>
      </div>
    </div>}
    <div aria-hidden={!started} inert={!started}>
      <header ref={header} className={`site-header${headerHidden?' header-hidden':''}`} onFocusCapture={()=>{headerFocusUntil.current=performance.now()+250;setHeaderHidden(false);}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))headerFocusUntil.current=0;}}><a href="#top" aria-label="ScratchXR"><img src="/art/scratchxr-logo.png" alt="ScratchXR"/></a>
        <nav aria-label={t('Etapas da jornada','Journey steps')}>{[t('Descobrir','Discover'),t('Blocos','Blocks'),t('Criar','Create'),t('Explorar','Explore'),t('Conversar','Reflect')].map((label,i)=><button key={i} disabled={unlocked<i+1} className={active===i+1?'current':''} onClick={()=>document.getElementById(`step-${i+1}`)?.scrollIntoView({behavior:'smooth'})}><span>{unlocked>i+1?<Check size={11}/>:i+1}</span>{label}</button>)}</nav>
        <button className="locale-toggle" onClick={()=>setLocale(locale==='en'?'pt-BR':'en')} aria-label={t('Mudar para inglês','Switch to Portuguese')}><img src={locale==='en'?'/art/flag-us.svg':'/art/flag-br.png'} alt=""/>{locale==='en'?'EN':'PT'}<span>⌄</span></button>
      </header>
      <main id="top">
        <section className="hero" data-step="0"><div className="hero-copy"><div className="eyebrow"><span className="tiny-star">✦</span>{t('UMA IDEIA. INFINITAS DESCOBERTAS.','ONE IDEA. ENDLESS DISCOVERIES.')}</div>
          <h1>{t('Imagine.','Imagine.')}<br/>{t('Programe.','Code.')}<br/><span className="gradient-word">{t('Entre no seu mundo.','Step into your world.')}</span></h1>
          <p>{t('Dê vida às suas ideias com blocos de programação. Depois, veja sua criação sair da tela e ganhar espaço em 3D.','Bring your ideas to life with coding blocks. Then watch your creation step off the screen and into 3D.')}</p>
          <button className="primary-button course-advance" onClick={()=>advance(1)}>{t('Começar a explorar','Start exploring')}<ArrowDown size={18}/></button>
          <div className="hero-meta"><span><MousePointer2 size={15}/>{t('Você decide o ritmo','You set the pace')}</span><span><Stars size={15}/>{t('Nenhuma experiência necessária','No experience needed')}</span></div>
        </div><div className="hero-art"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><img src="/art/blocks-to-world.png" alt={t('Blocos de programação conectados a um mundo com personagem e natureza','Programming blocks connected to a world with a character and nature')}/>
        </div><div className="hero-bottom"><span>SCROLL TO DISCOVER</span><span className="hero-line"/><span>2D → 3D → XR</span></div></section>
        {unlocked>=1&&<section id="step-1" data-step="1" className="course-section concepts-section">
          <div className="section-heading"><span className="section-number">01 / {t('DESCOBRIR','DISCOVER')}</span><h2>{t('Pensar é o primeiro','Thinking is the first')}<br/><em>{t('superpoder.','superpower.')}</em></h2>
            <p>{t('Pensamento computacional é uma maneira de resolver problemas. Você pode usá-lo para criar um jogo, organizar uma tarefa ou explicar uma ideia.','Computational thinking is a way to solve problems. Use it to create a game, organize a task or explain an idea.')}</p></div>
          <div className="concept-layout"><div className="concept-illustration"><img src="/art/computational-thinking.png" alt={t('Quatro ilustrações: separar partes, reconhecer repetições, selecionar o essencial e ordenar instruções','Four illustrations: divide parts, recognize patterns, choose essentials and order instructions')}/><span className="art-caption">{t('Pequenas ideias constroem grandes mundos.','Small ideas build big worlds.')}</span></div>
            <div className="concept-tabs">{concepts.map(([name,desc,example],i)=><button key={i} aria-expanded={concept===i} onClick={()=>setConcept(i)} className={concept===i?'open':''}><span className="concept-index">0{i+1}</span><div><h3>{name}</h3><p>{desc}</p>{concept===i&&<div className="concept-example">{example}</div>}</div><ChevronRight size={19}/></button>)}</div></div>
          <div className="quiz-card"><div><span className="eyebrow">{t('SUA VEZ DE PENSAR','YOUR TURN TO THINK')}</span><h3>{t('Você quer repetir uma caminhada quatro vezes. O que ajuda?','You want to repeat a walk four times. What helps?')}</h3></div>
            <div className="quiz-options">{[t('Trocar a cor do cenário','Change the scene color'),t('Reconhecer a repetição e usar um laço','Spot the pattern and use a loop')].map((a,i)=><button className={quiz===i?(i===1?'correct':'try-again'):''} key={i} onClick={()=>setQuiz(i)}>{quiz===i&&i===1?<Check size={17}/>:<span className="answer-circle"/>}{a}</button>)}</div>
            {quiz!==null&&<p className="quiz-feedback" role="status">{quiz===1?t('Isso! Uma repetição torna a sequência mais simples de entender e alterar.','Yes! A loop makes the sequence easier to understand and change.'):t('A cor muda a aparência. Procure a opção que ajuda a organizar as ações.','Color changes the appearance. Look for the option that helps organize actions.')}</p>}
            <button className="primary-button course-advance" disabled={quiz!==1} onClick={()=>advance(2)}>{t('Conhecer os blocos','Meet the blocks')}<ArrowDown size={18}/></button>
          </div>
        </section>}
        {unlocked>=2&&<section id="step-2" data-step="2" className="course-section catalog-section"><div className="section-heading horizontal"><div><span className="section-number">02 / {t('BLOCOS','BLOCKS')}</span><h2>{t('Um alfabeto de','An alphabet of')}<br/><em>{t('possibilidades.','possibilities.')}</em></h2></div>
          <p>{t('No Scratch, você programa encaixando blocos. As cores reúnem famílias de ações; as formas ajudam a descobrir o que combina.','In Scratch, you code by snapping blocks together. Colors group families of actions; shapes help you discover what fits.')}</p></div>
          {<Catalog locale={locale} onContinue={()=>advance(3)}/>}
        </section>}
        {unlocked>=3&&<section id="step-3" data-step="3" className="course-section lab-section"><div className="section-heading horizontal"><div><span className="section-number">03 / {t('CRIAR','CREATE')}</span><h2>{t('Sua ideia,','Your idea,')}<br/><em>{t('em movimento.','in motion.')}</em></h2></div><p>{t('Escolha quem explora e onde a aventura acontece. Um programa já está encaixado para você testar — e transformar do seu jeito.','Choose who explores and where the adventure happens. A program is already snapped together for you to test — and make your own.')}</p></div>
          {<Suspense fallback={<div className="loading-card">{t('Abrindo seu laboratório…','Opening your lab…')}</div>}><ScratchEditor locale={locale} avatar={avatar} scene={scene} trace={trace} onAvatar={id=>{setAvatar(id);invalidate();}} onScene={id=>{setScene(id);invalidate();}} onDirty={invalidate} onTrace={t=>{setTrace(t);setReplayed(false);setReflected(false);setUnlocked(4);}} onReplay={()=>setReplayed(true)} onReplayStart={()=>{setReplayed(false);setReflected(false);setUnlocked(v=>Math.min(v,4));}}/></Suspense>}
        </section>}
        {unlocked>=4&&<section id="step-4" data-step="4" className="course-section world-section">
          <div className="section-heading horizontal"><div><span className="section-number">04 / {t('EXPLORAR','EXPLORE')}</span><h2>{t('A tela era só','The screen was just')}<br/><em>{t('o começo.','the beginning.')}</em></h2></div><p>{t('O mesmo personagem. O mesmo cenário. O resultado do seu código, agora em um espaço tridimensional.','The same character. The same setting. Your code’s result, now in three-dimensional space.')}</p></div>
          <div className="xr-explainer"><article><span className="xr-label">AR</span><div><h3>{t('Realidade aumentada','Augmented reality')}</h3><p>{t('Elementos digitais aparecem no ambiente que você vê ao seu redor.','Digital elements appear in the real space around you.')}</p></div></article><article><span className="xr-label">VR</span><div><h3>{t('Realidade virtual','Virtual reality')}</h3><p>{t('Você observa um ambiente digital que envolve sua visão.','You look into a digital environment that surrounds your view.')}</p></div></article><article><span className="xr-label">XR</span><div><h3>{t('Realidade estendida','Extended reality')}</h3><p>{t('É o nome que reúne essas experiências. Realidade mista combina elementos reais e virtuais com interação espacial.','The umbrella term for these experiences. Mixed reality combines real and virtual elements with spatial interaction.')}</p></div></article></div>
          {trace?.warnings.length? <p className="notice">{t('Nesta primeira versão, sons, efeitos gráficos e mudanças de fantasia durante o programa precisam de adaptação específica no 3D. Confira o resultado completo no palco Scratch.','In this first version, sounds, graphic effects and costume changes during the program need specific 3D adaptation. Check the complete result on the Scratch stage.')}</p>:null}
          {trace?.truncated&&<p className="notice">{t('A gravação atingiu 30 segundos. A reprodução mostra esse trecho.','The recording reached 30 seconds. Replay shows this excerpt.')}</p>}
          <div className="after-world"><p>{t('A posição X/Y do Scratch vira posição no chão X/Z do 3D. O cenário decorativo não cria obstáculos para o código.','Scratch X/Y positions become X/Z ground positions in 3D. Decorative scenery does not create obstacles for the code.')}</p><button className="primary-button course-advance" disabled={!replayed} onClick={()=>advance(5)}>{t('Conversar sobre a descoberta','Talk about your discovery')}<ArrowDown size={18}/></button></div>
        </section>}
        {unlocked>=5&&<section id="step-5" data-step="5" className="course-section dialogue-section"><div className="section-heading"><span className="section-number">05 / {t('CONVERSAR','REFLECT')}</span><h2>{t('Toda descoberta','Every discovery')}<br/><em>{t('abre uma nova pergunta.','opens a new question.')}</em></h2><p>{t('Relembre o que criou, tire dúvidas e invente seu próximo experimento.','Reflect on what you created, ask questions and imagine your next experiment.')}</p></div>
          {<><div className="conversation-world"><Suspense fallback={<div className="loading-card">…</div>}><WorldView locale={locale} avatar={avatar} scene={scene} gesture={gesture} speaking={speaking} onReplay={()=>{}} conversation caption={caption||t('O que você descobriu ao programar? Depois da conversa, gostaria que eu executasse algum movimento?','What did you discover while coding? After our conversation, would you like me to perform a movement?')} voicePhase={voicePhase} onXRVoice={mode=>dialogue.current?.requestVoice(mode)} onVoiceSession={active=>active?dialogue.current?.startListening():dialogue.current?.stopListening()}/></Suspense></div>
            <Dialogue ref={dialogue} onVoicePhase={setVoicePhase} onResponse={()=>setReflected(true)} locale={locale} avatar={avatar} trace={trace} onSpeaking={setSpeaking} onCaption={setCaption} onGesture={data=>setGesture({sequence:Date.now(),data})}/></>}
        <div className="course-finish"><p>{reflected?t('Sua descoberta está pronta para continuar fora da tela.','Your discovery is ready to continue beyond the screen.'):t('Converse com o personagem sobre o que aprendeu para concluir a jornada.','Talk with the character about what you learned to finish the journey.')}</p><button className="primary-button course-advance" disabled={!reflected} onClick={()=>advance(6)}>{t('Concluir e levar para casa','Finish and take it home')}<ArrowDown size={18}/></button></div>
        </section>}
        {unlocked>=6&&<section id="step-6" className="take-home"><div className="cardboard-illustration"><div className="cardboard-body"><div className="cardboard-lens"/><div className="cardboard-lens"/></div><span className="cut-line"/><span className="scissors">✂</span></div><div className="take-home-copy"><span className="section-number">{t('A EXPLORAÇÃO CONTINUA','KEEP EXPLORING')}</span><h2>{t('Monte seu visor.','Build your viewer.')}<br/><em>{t('Leve a ideia para casa.','Take the idea home.')}</em></h2><p>{t('Um molde para recortar, montar e experimentar com o celular. O PDF inclui orientações, materiais e impressão em tamanho real.','A template to cut, assemble and try with your phone. The PDF includes instructions, materials and full-size printing guidance.')}</p><a className="primary-button" href={`/downloads/cardboard-${locale}.pdf`} download><Download size={18}/>{t('Baixar molde e instruções','Download template & instructions')}<span className="download-meta">PDF · A4</span></a><p className="small-note">{t('Precisa de lentes e ajuda de um adulto para cortar. Imprima em 100%, confira a régua e teste o encaixe do seu celular. Use sentado, faça pausas e pare se sentir desconforto.','Requires lenses and adult help with cutting. Print at 100%, check the ruler and test your phone’s fit. Use while seated, take breaks and stop if uncomfortable.')}</p></div></section>}
      </main><footer><img src="/art/scratchxr-logo.png" alt="ScratchXR"/><p>{t('Ideias pequenas. Mundos inteiros.','Small ideas. Whole worlds.')}</p><div><a href="/CREDITS.md" target="_blank" rel="noreferrer">{t('Créditos e licenças','Credits & licenses')}</a><span className="footer-attribution"><span>{t('Recurso independente baseado no Scratch.','An independent resource built on Scratch.')}</span><span>{t('Por: Alexandre Tavares','By: Alexandre Tavares')}</span></span></div><p className="small-note age-note"><mark>{t('10–16 anos. No Meta Quest, estudantes de 10–12 anos precisam de conta gerenciada por responsáveis e supervisão. A compatibilidade depende do dispositivo e do navegador.','Ages 10–16. On Meta Quest, students aged 10–12 need a parent-managed account and supervision. Compatibility depends on the device and browser.')}</mark></p></footer>
    </div>
  </>;
}
