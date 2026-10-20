# Parecer e primeira implementação do ScratchXR

20/10/2026 — requisitos revisados e primeira versão local em execução.
Prévia local: https://localhost:4310.
Site publicado: https://scratchxr-production.up.railway.app/.
Instruções em [site/README.md](site/README.md).

## Produção e verificação realizadas

- Hospedagem preparada para Railway: Dockerfile na raiz, Node 24, cliente
  e APIs no mesmo serviço, porta `PORT` e healthcheck `/api/health`.
  Segredos ficam nas variáveis do Railway e não acompanham o GitHub.
  O servidor também entrega GLB/WASM/PDF com MIME e ranges apropriados.
  Kimodo e seus pesos não acompanham a imagem; sem instalação Linux,
  os pedidos de movimento usam o gesto pronto. Há CI de testes/build/Docker.
- O serviço Railway estava sem as chaves de tutor, STT e TTS. As variáveis
  foram configuradas somente no serviço. Falhas de voz agora preservam
  o texto e mostram um aviso, sem substituição pela voz mecânica do sistema.
  Áudio interrompido pode ser retomado por “Ativar áudio”, sem desligar
  o microfone. O MP4 é priorizado na captura quando suportado.
- Cardboard usa um portal no `body` e acompanha o `visualViewport`,
  preservando o canvas ao entrar e sair. “Ver meu movimento” rola até
  o avatar automaticamente. Permissões e áudio acústico no iPhone físico
  ainda precisam de conferência.
- A tela do Cardboard mantém apenas os ícones de fechar e alinhar imagens.
  Avisos de rastreamento ficam na ajuda, fora do visor. O microfone pode ser
  ativado na visualização normal antes de entrar; seu botão não cobre a cena.
- Validação local: build, 30 testes unitários, percurso completo nos três
  cenários e conversa com duas falas automáticas passaram. Viewport e
  retorno ao avatar passaram em WebKit/Chromium; a recuperação de áudio
  e manutenção do microfone passaram com interrupções controladas no Chromium.
- A validação de origem aceita o cabeçalho `:authority` do HTTP/2 usado no
  HTTPS local, corrigindo o erro 403 que impedia a conversa no navegador.
  Origem externa continua recusada. Avisos de falha ficam junto ao chat.
- Em celular vertical, somente o editor Scratch exibe “Rotacione o seu
  celular para a horizontal.” ao lado de “Meu primeiro mundo”.

- Site bilíngue com cinco etapas, progressão por ações, identidade própria,
  logotipo, dois infográficos e tabela interativa com 220 peças SVG locais.
  Abertura reduzida a logotipo e botões Português/Brasil e ENGLISH/EUA.
  A bandeira dos Estados Unidos substitui a britânica na interface.
- Testeira e menu recolhem na rolagem para baixo e reaparecem ao subir
  até o início de uma seção, mantendo-se ocultos no meio do conteúdo.
  No celular, isso inclui o menu inferior. Movimentos mínimos são filtrados;
  início da página e foco de teclado revelam a navegação, sem alterar o
  espaço do conteúdo nem a posição fixa do menu no celular.
- Etapas futuras ficam ausentes até concluir a atividade atual **e clicar
  no avanço**, exceto a explicação de Explorar, que aparece automaticamente
  após executar o programa no palco. Critérios: resposta correta, exploração das oito famílias,
  execução no Scratch, reprodução 3D até o fim e conversa com o tutor.
  O download do visor aparece ao concluir a conversa. Reexecutar ou editar
  invalida as etapas dependentes; parar o replay não conta como conclusão.
- Catálogo com uma peça ampliada e setas laterais, troca automática a cada
  cinco segundos, pausa por ícone e suspensão quando fora da área visível.
  Sem lista de miniaturas nem textos de contador/temporizador abaixo.
  No celular, as oito siglas ficam em quadrados na coluna esquerda, sem
  setas verticais, ajustadas para caber na altura disponível. Tocar em uma
  família troca as peças à direita, que mantêm suas setas laterais.
  Textos movidos para legenda abaixo. Largura comum às peças, baseada em
  Movimento (máximo de 395 px), preservando a proporção inclusive dos blocos C.
  A tabela completa continua disponível no desktop.
  Cartões das famílias com dimensões iguais, sem largura ditada pelo nome.
  Famílias exploradas mantêm fundo e bordas na cor da categoria, com textos
  brancos. A seleção atual usa contorno interno, sem ampliar o cartão.
  Elementos inclinados removidos da entrada e da abertura.
  Crédito “Por: Alexandre Tavares” abaixo do aviso de recurso independente,
  com mesmo alinhamento e tamanho de fonte.
- Todos os avanços usam o mesmo botão roxo elevado da abertura, com seta
  para baixo, em uma linha abaixo do conteúdo e alinhados à esquerda.
- Editor personalizado com Scratch VM, Blocks, Render, Storage e Audio
  reais; exemplo de dois segundos e importação/exportação `.sb3`.
  É uma integração desses componentes, não uma incorporação integral do GUI.
  Seletores de personagem/cenário no topo, lado a lado na horizontal e
  empilhados no celular em pé. Scratch com largura completa abaixo, seguido
  pelo Palco compartilhado entre 2D e 3D. No canto inferior esquerdo:
  3D / CARDBOARD / VR / AR; controles de execução à direita. Em telas
  estreitas, os dois grupos usam linhas próprias. O botão 3D troca a vista
  e reproduz o resultado; um novo clique retorna ao 2D sem recriar a VM.
  Ambos ocupam a mesma janela, com altura reservada aos controles. Um
  panorama renderizado da mesma cena preenche as laterais do canvas 2D
  central, preservando as coordenadas 480 × 360 e as proporções do avatar.
  Reproduzir usa o mesmo botão roxo nos dois modos. A dica “Experimente”
  aparece somente dentro da ajuda.
  CARDBOARD abre o visor em tela inteira. Removido “Levar para o 3D”.
- Teclado corrigido: espaço e setas acionam a VM após interagir com o editor,
  sem rolar a página, inclusive ao segurar a tecla. Reproduzir focaliza o palco.
  Campos de texto, Tab e atalhos mantêm seu comportamento; sair do editor
  devolve a navegação à página. Perda de foco libera as teclas pressionadas.
  O teste `site/tools/check-keyboard.py` verificou esses casos com a VM real.
- Botões nativos de criação de variável, lista e bloco têm fundo roxo
  sólido e texto branco. Aviso de idade e compatibilidade no rodapé com
  marca-texto roxo chapado e letras brancas, inclusive no layout de celular.
- Luna, Leo e Maya produzidos exclusivamente com presets padrão do VRoid.
  Sprites e retratos renderizados dos GLBs, 15 visemas e clipes de repouso,
  caminhada e aceno. Nenhum personagem de Chrono Trigger.
- Contornos finos aplicados aos três personagens no renderizador do site,
  pois os GLBs comuns não preservam o shader VRoid/MToon. Corpo, rosto,
  cabelo e roupa usam traço de aproximadamente 0,8 px; olhos e demais
  detalhes pintados são preservados. Esqueleto, visemas e recortes
  transparentes continuam compartilhados. O efeito permanece no 3D/XR e
  nos retratos. Os sprites do palco 2D foram re-renderizados sem contorno,
  em 1024 × 1280 px. Um traje SVG incorpora o PNG completo nas mesmas
  92 × 115 unidades lógicas, evitando a antiga redução a 184 × 230 px.
  Escala e importação/exportação `.sb3` preservadas, sem modificar GLBs.
- Repouso corrigido em runtime: quadril e pernas estáveis, tronco e braços
  ainda animados. Auditoria nos três GLBs, com 121 amostras por ciclo:
  deslizamento original de 10,5–11,9 cm, reduzido a menos de 0,00001 m.
  Caminhada preservada; exportador preparado para aplicar a mesma correção.
- Três cenários refeitos com geometria original, conforme revisão do usuário:
  Bosque das ideias, Vila das descobertas e Jardim das estrelas. Árvores,
  arquitetura, móveis, flores e paisagem são construídos em Three.js, sem
  modelos ou texturas Poly Pizza. Chão de 160 m e centro livre de 10 × 10 m.
  Os fundos 2D agora são renderizações das mesmas cenas 3D, com luz e paleta
  compartilhadas. Malhas estáticas agrupadas em 23–27 lotes por cenário.
  Árvores refeitas conforme a referência low-poly: copas irregulares com
  faces triangulares e cores por face. Geometria aprovada pelo usuário;
  paleta posteriormente suavizada para menta e sálvia. Árvores próximas ao
  pavilhão afastadas do telhado, inclusive no enquadramento inicial.
- Ponte implementada em `site/src/scratchEngine.ts`, `trace.ts` e `World.ts`:
  estados ordenados da execução real da VM, reprodução em Three.js,
  X/Y do palco para X/Z do chão, 60 unidades por metro.
  CARDBOARD/AR/VR repetem a gravação após três segundos de pausa; a vista
  3D comum toca uma vez. Parar, editar ou sair do modo imersivo cancela
  a repetição pendente. Solicitar um gesto também cancela a repetição.
  O texto é lido do estado nativo dos balões, inclusive o encerramento de
  “diga/pense por segundos”. Nova reprodução limpa a legenda anterior;
  as falas reaparecem somente nos instantes registrados pelo Scratch.
- Conversa web com zoom fixo em 1,8 m, giro frontal de 100° (50° por lado)
  e inclinação de até 20° para baixo. Cabeça e íris acompanham a câmera
  com limites e suavização, inclusive o observador em VR/Cardboard.
  O olhar cede à animação durante demonstrações de movimentos; a boca e
  as piscadas continuam independentes. `avatarAttention.ts` adapta o
  princípio usado em StarsAttention aos morphs N00, sem rotacionar a
  superfície plana dos olhos nem importar personagens de outros projetos.
- Entradas WebXR AR/VR, visão estéreo para celular, avatar de diálogo e
  controles de voz/legendas em XR implementados, ainda sem homologação física.
  Etapa Explorar agora contém somente a explicação “A tela era só o começo”
  e os conceitos AR/VR/XR em toda a largura. O visualizador fica no palco
  da etapa Criar. As orientações de compatibilidade aparecem apenas na ajuda.
  O crédito 6DoF/8th Wall está na página de licença, acessível pelo link.
  O visor de celular agora expande a cena para toda a área da página,
  solicita tela cheia nativa e orientação horizontal e oferece um botão
  sobreposto para sair. A expansão funciona mesmo sem a API de tela cheia;
  ocultar as barras do navegador depende do suporte e da permissão.
  Saída nativa/Escape encerram o visor; sem sensores é possível arrastar.
  Perspectiva por olho calculada pela área exibida; divisão central baseada
  no buffer real, mesmo quando redimensionado pelo XR8. Ajuste de lentes
  reaproveitado do Logvesp/iPhone 12, proporcional à tela, com controle
  “Alinhar imagens” e preferência persistida no navegador.
- Binário 6DoF localizado no Logvesp: `@8thwall/engine-binary@1.0.0`,
  de 8th Wall/Niantic Spatial. `xr.js` e `xr-slam.js` foram conferidos
  por SHA-256 e copiados sem alterações para `site/public/xr8`.
  A página LICENSE contém a atribuição 6DoF seguida dos termos originais;
  `prepare-assets.mjs` preserva essa composição. `phoneTracking.ts` reaproveita o
  rastreamento Cardboard do Logvesp: câmera traseira, sensores, escala
  absoluta em metros, correção de rumo e recuperação contínua de origem.
  O visor informa carga, rastreamento limitado e falhas; “6DoF ativo”
  exige pose válida com status NORMAL. A câmera é liberada ao sair.
  Corrigido o timeout que encerrava rastreamento limitado após 30 segundos
  e o apresentava como falta de suporte do aparelho. Uma câmera iniciada
  continua mapeando; somente inicialização sem resposta por 45 segundos
  termina com erro. A abertura da câmera fica exclusivamente com XR8,
  evitando abrir/fechar um stream de aquecimento antes no Safari.
  Mensagens distinguem câmera, sensores, HTTPS e ausência de API no navegador.
- PDFs bilíngues do visor preparados e ligados ao site. Montagem física e
  calibração óptica do modo estéreo ainda pendentes.
- Tutor Haiku e Voxtral com chaves no servidor. O TTS usa samples do Logvesp:
  Luna/Emily, Leo/Ryan, Maya/Lola; as três sínteses e a transcrição em
  português foram verificadas na API. IDs de voz são substituições opcionais.
  Sem serviço, há resposta educativa local em texto e aviso de voz indisponível.
  Na conversa imersiva o microfone começa ao entrar, mediante permissão,
  envia a fala após um segundo de pausa e retoma após a resposta.
  A captura para ao sair/desligar; áudio do próprio tutor é descartado.
  Há controles na visualização normal e no painel XR. Respostas atrasadas de uma
  captura encerrada são ignoradas. O áudio web é liberado no clique.
  Os 15 visemas existem, mas a animação atual da boca é aproximada, sem
  alinhamento completo com os fonemas do áudio.
- Kimodo reinstalado em `D:/kimodo`, port `localai-org/kimodo.cpp` para CPU,
  SOMA RP v1.1 F32 e texto Q8_0. Downloads de 9.282.520.590 bytes conferidos
  por SHA-256. O endpoint do site gerou um aceno real de 90 quadros a 30 fps,
  com saída finita validada; a revisão visual do retargeting está pendente.
- Decisão posterior do usuário: **não implementar WebGPU**. Kimodo gera
  no servidor; o estudante recebe a animação pelo site, sem instalação local.
  A publicação futura exige hospedar esse serviço além dos arquivos estáticos.
- Pedidos inadequados são convertidos em uma das dez ações seguras
  aprovadas, com “Vou fazer algo melhor”. O texto original não vai ao gerador.
  Cache por ação e alternativa de aceno pronto em caso de falha.

O percurso desktop em Chromium passou da escolha do idioma à execução
Scratch, reprodução 3D e diálogo sem erros de JavaScript. Na revisão dos
cenários, a seleção e reprodução foram repetidas nos três ambientes;
o exemplo terminou em X=90, Y=0 em todos. As capturas de cada cenário,
fundo 2D e enquadramento de diálogo foram inspecionadas. Nenhuma requisição
ao catálogo antigo foi feita. Os nove testes próprios passaram.
O fluxo de bloqueios passou com verificação de ausência das seções futuras,
interrupção e conclusão do replay, edição do projeto e avanço explícito
até o PDF. Setas, troca em cinco segundos, pausa, peças bilíngues e crédito
foram conferidos em desktop e viewport de celular. Nessa verificação,
a resposta do tutor foi simulada; Scratch e WebGL foram executados de fato.
Na revisão mobile, foram conferidos siglas/setas em 320, 390 e 430 px,
tela cheia nativa, expansão sem essa API, permissão de sensores pendente,
saída por botão/Escape e restauração da rolagem. A revisão seguinte conferiu
limites das setas, legenda e largura uniforme também em 844 e 1440 px.
Os 22 testes próprios passaram, incluindo recuperação após mais de 30 segundos
de rastreamento limitado. O XR8 real carregou e executou
18 quadros com câmera sintética; ficou em rastreamento limitado, como
esperado sem um ambiente físico. Poses controladas moveram a câmera Three
em X/Y/Z, com preservação da posição em mudanças de origem. A projeção estéreo
passou em retrato/paisagem, buffers com proporção distinta da tela e densidade
de 1,5, com centros das lentes corretos e sem disparidade vertical. Isso verifica
a integração, não a qualidade do SLAM no celular real.
Headsets, celulares físicos e todas as combinações de movimentos e
personagens ainda precisam de validação.

A cobertura XR inclui posição, direção, escala, visibilidade, fala, cenários
e as três fantasias locais. Sons, efeitos gráficos, camadas e conteúdo
arbitrário importado ainda não têm equivalência integral. Gravação limitada
a 30 segundos, conforme aviso; reprodução limitada a 25 combinações de ator
e fantasia. Monitores de variáveis/listas, pintura de fantasias, extensões
e o diálogo completo de parâmetros de “Meus Blocos” ainda não fazem parte
da interface personalizada.

TypeScript do workspace principal passou; a suíte geral teve falhas em
módulos externos ao ScratchXR (2.576 testes aprovados, sete falhas e sete
pendentes nesta execução; relatório em `site/.cache/root-keyboard-check.json`).
As falhas estão em fronteiras, modelCreator, vroidClothPhysics, acervoLocal,
coberturaPovoamento e GardeningCatalogo; nenhuma está no site.
O build completo do site passou após esta revisão e está em `site/build/`.
Essa saída substitui o antigo `dist/`,
que estava bloqueado pelo Windows. O bundle do editor Scratch ainda produz
aviso de tamanho; é carregado separadamente quando a etapa do editor abre.

## Avaliação

A proposta é consistente como recurso educacional: apresentar conceitos,
permitir construir um programa em 2D, observar seu resultado em 3D e discutir
o aprendizado. As definições abaixo tornam o escopo mais claro.

## Decisões confirmadas

- Aplicação web com narrativa progressiva, em português Brasil e inglês.
- Público de 10 a 16 anos.
- Interface 2D personalizada sobre a base do Scratch para seleção,
  programação e execução. Não se pretende criar um editor de blocos em XR.
- Personagens baseados nos modelos padrão do VRoid, com versões 2D
  correspondentes; não usar personagens de Chrono Trigger.
- Três personagens e três cenários; as representações 2D e 3D precisam
  corresponder entre si.
- Em AR/VR, apresentar o resultado personagem/cenário/ação e, ao final,
  permitir o diálogo com o personagem.
- Adaptar a tabela `icompute-periodic-table-scratch-3.png` como recurso
  didático interativo central: categorias, explicações, parâmetros,
  exemplos executáveis e passagem ao editor.
- Usar as peças locais nos respectivos idiomas.
- Reaproveitar o modo Cardboard do Logvesp e oferecer PDF de montagem.
- Criar a ponte Scratch → VRoid com Mixamo como primeira fonte de animações.
  Os blocos nativos do Scratch não dependem de Kimodo: "Meus blocos" define
  procedimentos e combina comandos, sem gerar animações por IA.
  Kimodo pode complementar o acervo e atender pedidos de movimento no diálogo final. A proposta
  técnica está em [PONTE-SCRATCH-VROID.md](PONTE-SCRATCH-VROID.md).
- Usar geometria própria para construções, vegetação e decoração, conforme
  decisão posterior do usuário. O acervo Poly Pizza deixou de ser utilizado.
  Criar chão procedural amplo, com decoração sem colisões impostas ao programa.
- No final, o personagem convida o aluno a pedir um movimento. A geração
  acontece em segundo plano, sem painel técnico. Uma verificação no servidor
  substitui pedidos inadequados por movimentos seguros de intenção próxima;
  o avatar responde "Vou fazer algo melhor" (equivalente em inglês).

## Recursos existentes

| Recurso | Origem observada | Alcance da constatação |
| --- | --- | --- |
| Sessões AR e VR | `src/core/vr/WebXRSessionManager.ts` | Código para os dois modos e detecção de suporte |
| Face VRoid | `apps/chared/src/vroidFacial.ts` | Geração de canais faciais e contrato de 15 visemas OVR |
| Diálogo e voz | `src/core/dialogo/ClienteIA.ts` | Haiku para texto, Voxtral para transcrição e síntese |
| Cardboard | `C:/Users/alexa/Área de Trabalho/logvesp/src/stage/useCardboardMode.ts` | Visão estéreo, orientação do celular e integração opcional com XR8 |
| Blocos ilustrados | `ScratchXR/Utilizados/` | SVGs em `br` e `eng`, além de arquivos de autoria |
| Molde e orientações | `ScratchXR/materiais/cardboard/` | PDFs preparados nos dois idiomas; montagem física pendente |

Esses recursos são bases para adaptação. Sua existência não demonstra que
a integração completa do ScratchXR esteja pronta.

## Ajustes técnicos e pedagógicos

1. **Separar transcrição, diálogo e voz.** O fluxo é microfone → Voxtral STT
   → Claude Haiku → Voxtral TTS → áudio e sincronização labial. Essa separação
   já existe no workspace. Os visemas precisam ser conferidos nos três
   modelos exportados e associados ao áudio em execução.

2. **Definir a ponte entre Scratch e 3D.** O resultado em XR deve preservar
   sequência, duração, repetições e escolhas da execução 2D. Definir como
   passos e coordenadas viram distâncias no cenário e como tratar fantasias,
   efeitos, camadas, bordas e sensores. Preservar a base do Scratch não
   equivale a ter uma tradução automática de todos os blocos para 3D.
   Para programas dependentes de entradas ou aleatoriedade, registrar a
   execução evita mostrar um resultado diferente na reprodução.
   A criação dessa ponte foi confirmada. Preservar também a diferença
   entre movimento instantâneo e movimento com duração: o clipe corporal
   não deve acrescentar tempo ou deslocamento ao programa.

3. **Apresentação AR em área ampla.** Posicionar o conjunto no ambiente real
   com escala ajustável. O chão procedural deve comportar o percurso do
   programa; construções e vegetação organizam o cenário sem formar uma
   caixa restrita. Decoração não deve impor colisões que alterem silenciosamente
   o resultado do Scratch. A borda do palco Scratch, quando usada pelo programa,
   mantém sua semântica própria. Na VR, observar a ação no mesmo mundo.

4. **Tratar os dispositivos separadamente.** Cardboard é o visor para
   celular; Google Glass é outro produto. Definir uma matriz de celulares,
   navegadores e headsets, testar os modos disponíveis e manter uma versão
   completa na tela. HTTPS e uma ação explícita para iniciar a sessão são
   necessários para a integração WebXR.

5. **Acomodar a faixa de 10 a 16 anos.** Oferecer explicações e desafios em
   níveis, por exemplo uma trilha inicial e outra de aprofundamento.
   Uma atividade deve envolver previsão, execução e correção, com objetivos
   verificáveis: ordenar instruções, reconhecer repetição e explicar o
   resultado. O visor não deve ser requisito para concluir o aprendizado.
   Observar as regras de conta e supervisão para as idades atendidas pela Meta;
   mudar a faixa etária não elimina esses requisitos. Manter a experiência na tela.

6. **Definir a progressão.** Scroll organiza a narrativa; ações e pequenos
   desafios marcam o avanço. Permitir voltar, repetir e navegar por teclado.
   Dentro da sessão imersiva, usar os controles adequados a ela e preservar
   o progresso ao retornar à página.

7. **Localizar conteúdo além dos blocos.** Traduzir interface, tabela,
   explicações, desafios, legendas, diálogos e PDF. A troca de idioma deve
   preservar o programa. Preferir texto de interface separado das imagens
   dos infográficos e identificar os idiomas pelos seus nomes.

8. **Especificar os cenários entregáveis.** “Criado com GPT Astra” descreve
   o processo de autoria; o produto precisa de cenas e modelos 3D utilizáveis,
   materiais, escala e limites de complexidade adequados aos dispositivos.
   Produzir as versões 2D a partir do mesmo conjunto visual ajuda a manter
   consistência.

9. **Preparar o diálogo para uso educacional.** Vincular as respostas ao
   conteúdo e ao programa do aluno, com linguagem apropriada e alternativa
   por texto. Definir tratamento de áudio, retenção, controles de acesso e
   limites de uso. Os adaptadores agora são compartilhados pelo Vite e
   pelo servidor Node de produção; chaves ficam no ambiente do servidor.

10. **Movimento pedido no encerramento.** Verificar conteúdo e converter a
    intenção em um comando de movimento seguro antes da geração Kimodo. O
    filtro combina normalização de termos e análise de intenção; apenas
    procurar palavras não cobre todos os pedidos. Se a verificação não
    puder concluir, usar um movimento previamente aprovado. A entrada
    original não deve chegar diretamente ao gerador. O estado de espera
    aparece como fala do personagem; falhas não devem ser apresentadas como
    geração bem-sucedida.

## Peças bilíngues: conferência inicial

As contagens abaixo são de arquivos SVG, não de funções já pareadas.
Diferenças podem representar peças agrupadas, repetidas ou ausentes.
Conferir o conteúdo antes de concluir que falta um bloco.

| Categoria | Português (`br`) | Inglês (`eng`) |
| --- | ---: | ---: |
| Aparência | 19 | 19 |
| Controle | 11 | 10 |
| Eventos | 8 | 6 |
| Movimento | 18 | 17 |
| Operadores | 18 | 18 |
| Sensores | 18 | 19 |
| Som | 9 | 9 |
| Variáveis | 5 | 16 |

Os SVGs servem à apresentação e ao catálogo. Encaixes, campos editáveis,
execução e traduções do editor devem ser integrados com os componentes do
Scratch; as imagens isoladas não fornecem esse comportamento.

## Referências

- [Editor oficial da Scratch Foundation](https://github.com/scratchfoundation/scratch-editor):
  fonte do editor e da máquina virtual. Conferir as licenças dos componentes
  escolhidos na integração.
- [Áudio Voxtral](https://docs.mistral.ai/studio/audio/overview):
  transcrição, geração de fala e composição com um modelo de diálogo.
- [Modelos Claude](https://platform.claude.com/docs/en/models/overview):
  entradas e saídas dos modelos.
- [Detecção de suporte WebXR](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported)
  e [início de sessão](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown).
- [Faixas etárias da Meta](https://developers.meta.com/vr/resources/age-groups/).
- [Documentação de fabricação Cardboard](https://developers.google.com/cardboard/manufacturers).

As fontes externas foram consultadas para esta revisão; os limites de
suporte devem ser reconferidos ao homologar o produto.
