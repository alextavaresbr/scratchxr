# ScratchXR — primeira versão local

Recurso educacional PT-BR/inglês para 10–16 anos. Seleção de idioma,
conceitos, catálogo interativo, programação Scratch 2D, reprodução 3D/XR,
diálogo e PDF do visor. Estado e limitações em [PARECER.md](../PARECER.md).

## Executar

```powershell
cd site
npm ci
npm run dev
```

Abra https://localhost:4310 e aceite o certificado local de desenvolvimento.
Para testar: escolher idioma → começar → responder ao desafio → conhecer
blocos → programar → executar → alternar o palco para 3D → conversar.
O editor já contém um percurso de dois segundos.

Requer Node.js 24. Os assets já acompanham o repositório; `prepare:assets`
é uma ferramenta opcional de reconstrução a partir do acervo original.
`npm test` verifica a ponte, voz, servidor e política de movimentos.
`python tools/check-browser.py` percorre o site com Playwright/Chromium.
`npm run build` gera o cliente em `build/` e o servidor em `build-server/`.
`npm start` serve ambos na porta `PORT` (padrão 3000); `npm run preview`
é apenas uma prévia Vite na porta 4311. O Dockerfile/Railway fica na raiz
do repositório. Consulte [a configuração de hospedagem](../README.md).

## Serviços

Chaves são lidas no servidor a partir do `.env` do workspace ou de
`.env.local` nesta pasta. Nunca usar prefixo `VITE_` para segredos.
Veja `.env.example`. Haiku responde; Voxtral transcreve e sintetiza.
O Voxtral usa referências do Logvesp, incluídas em `voices/`: Emily/Luna,
Ryan/Leo e Lola/Maya. Os IDs `SCRATCHXR_VOICE_PT`/`SCRATCHXR_VOICE_EN` são
substituições opcionais. Falhas de TTS mantêm a resposta em texto e exibem
um aviso; não há substituição automática pela voz do sistema.
As três vozes e uma transcrição em português foram verificadas na API.
Na conversa VR/Cardboard, `voiceCapture.ts` mantém o microfone aberto,
delimita falas por silêncio e descarta áudio enquanto o tutor responde.
O áudio usa um AudioContext liberado no clique, inclusive no celular.
Uma interrupção mantém a voz decodificada pendente até “Ativar áudio”;
esse botão retoma o contexto sem desligar o microfone. Durante a resposta,
o track fica aberto sem reiniciar o MediaRecorder repetidamente.
O formato enviado à transcrição prioriza MP4 e aceita WebM conforme o navegador.
Saída, erro e permissões tardias encerram os tracks; o indicador e o botão
de microfone ficam disponíveis na web, no Cardboard e no painel XR.
`python tools/check-voice.py` verifica texto, captura e ciclo de vida com
microfone sintético; testes acústicos no iPhone e Quest continuam necessários.
`python tools/check-safari.py` confere viewport e rolagem em WebKit/Chromium,
além de decodificação e retomada de áudio com interrupções controladas no
Chromium. A distribuição WebKit para Windows não inclui Web Audio/MediaRecorder.
“Ver meu movimento” rola imediatamente até o avatar da conversa.

Kimodo foi reinstalado em `D:/kimodo`, com `kmd-generate.exe` compilado
para CPU em `repo/build/win-cpu`. Commit:
`ed8a931aedb132f768190f6931c365855caba74c`.
O script `tools/install-kimodo-weights.py D:/kimodo` baixa pesos fixados
por revisão, retoma downloads e confere os SHA-256.

O servidor usa SOMA RP v1.1 F32, texto Llama-3-Kimodo Q8_0 e tokenizer.
`KIMODO_DIR=D:/kimodo`, `KIMODO_BACKEND=cpu`.
O toolchain existente fica em `C:/msys64/mingw64/bin`.
A API não expõe executáveis, caminhos ou chaves ao estudante.

Movimentos usam dez prompts seguros fixos, classificação no servidor,
uma geração por vez, cache em `.cache/motions` e limite de dez minutos.
Um aceno de 90 quadros a 30 fps foi realmente gerado e validado.
WebGPU não faz parte do escopo. O estudante não instala Kimodo; para acesso
público é necessário hospedar o serviço e implementar controles de acesso,
fila e limites de uso adequados à quantidade de alunos.

## Alcance

A testeira recolhe ao rolar para baixo. Ao subir, reaparece somente quando
o início de uma seção chega ao topo da tela; permanece oculta no meio das
seções. No início da página também fica visível. No celular, o menu inferior
acompanha esse comportamento.
Pequenos movimentos são filtrados, e o foco por teclado revela a navegação.

A abertura mostra somente logotipo e botões de idioma: Português/Brasil e
ENGLISH/EUA, com a bandeira dos Estados Unidos também no seletor do cabeçalho.
As próximas seções dependem da atividade e do avanço: resposta correta,
oito famílias exploradas, reprodução 3D completa e uma resposta do tutor.
Após executar o Scratch, a explicação da etapa Explorar aparece automaticamente
abaixo do palco, sem botão “Levar para o 3D”. Interromper a reprodução não
conclui a etapa; editar o programa invalida o resultado.
O catálogo mostra uma peça por vez, com setas laterais e troca a cada cinco
segundos enquanto estiver visível. O ícone no cabeçalho permite pausar.
No celular, as oito siglas aparecem em quadrados na coluna esquerda,
sem setas verticais. Tocar em qualquer quadrado troca as peças à direita;
a coluna se ajusta à altura da tela e mantém todas as famílias visíveis.
Os oito cartões têm o mesmo tamanho. Famílias já exploradas mantêm o fundo
e as bordas na cor da família, com textos brancos; as restantes
continuam claras. A família atual também recebe um contorno interno.
Título e explicação ficam como legenda abaixo. As peças compartilham a largura
de Movimento (até 395 px), preservando proporções; blocos altos crescem na vertical.
`python tools/check-browser.py` verifica esse fluxo em Chromium, as setas
em desktop/celular e os dois idiomas; somente a resposta do tutor é simulada.
`python tools/check-keyboard.py` usa eventos reais de teclado e a VM para
verificar espaço/setas sem rolagem, repetição, foco após Reproduzir, digitação
nos campos e navegação fora do editor. Reproduzir focaliza o palco; clicar
na área de blocos também permite usar os eventos de tecla do programa.
A etapa Criar apresenta os seletores de personagem e cenário lado a lado;
no celular em pé, um abaixo do outro. O Scratch ocupa toda a largura abaixo
dos seletores e pede para girar para a horizontal ao lado de “Meu primeiro
mundo” somente em retrato. O aviso não aparece nas demais seções.
Em seguida vem o Palco, compartilhado entre 2D e 3D. Abaixo,
à esquerda, os botões aparecem na ordem 3D / CARDBOARD / VR / AR; à direita,
ficam os controles da execução atual. No celular estreito, cada grupo tem
sua própria linha. Clicar em 3D reproduz o resultado gravado no mesmo espaço;
clicar novamente retorna ao 2D, preservando a VM e o programa. Os dois modos
ocupam a mesma janela, reservando altura para os controles. No 2D, o canvas
480 × 360 fica centralizado e um panorama da mesma cena preenche as laterais,
sem esticar personagens nem alterar as coordenadas dos blocos.
Reproduzir usa o mesmo botão roxo com ícone de play nos dois modos.
Em CARDBOARD/AR/VR, o resultado gravado se repete após uma pausa de três
segundos. O 3D comum toca uma vez; parar ou sair do modo imersivo cancela
a repetição. Um movimento do diálogo também cancela a repetição pendente.
`python tools/check-phone-tracking.py` carrega o XR8 real com câmera
sintética, verifica encerramento e aplica poses controladas ao World real.
Também confere proporção por olho, centros das lentes e alinhamento vertical
com rotação, diferentes resoluções do buffer e densidade de pixels.
O teste não valida rastreamento físico; a câmera sintética não tem posição.

Scratch VM decide a lógica; a ponte registra o resultado, sem reinterpretar
os laços ou sortear novamente. Gravação máxima de 30 segundos.
Os balões são lidos do estado nativo de aparência, inclusive o fim de falas
temporizadas; uma nova reprodução 3D limpa o texto antes de carregar os atores.
Na conversa web, o zoom fica fixo na distância mínima (1,8 m), com giro
horizontal de 100° na frente do personagem e até 20° de inclinação para
baixo. Cardboard e XR mantêm a liberdade de movimento do visor.
`avatarAttention.ts` acompanha a câmera com a cabeça e os morphs das íris,
depois do mixer, preservando respiração, boca e piscadas. O movimento tem
limites e suavização; atrás do personagem ou durante um gesto demonstrado,
o olhar retorna suavemente à animação. Em XR usa a câmera do observador.
`python tools/check-conversation.py` verifica falas reais da VM, trajes,
câmera da conversa e olhar nos três GLBs, com posições XR controladas.
Os três avatares são padrão VRoid; sprites saem dos mesmos modelos.
Contornos finos usam `src/avatarOutline.ts` no 3D/XR e nos retratos de seleção.
Os recortes do palco 2D têm 1024 × 1280 px, transparência suavizada e nenhum
contorno acrescentado. A VM recebe o PNG completo dentro de um traje SVG
de 92 × 115 unidades, preservando a escala e a qualidade em telas densas,
inclusive ao salvar e reabrir `.sb3`. Para recriar somente essas imagens:
`python tools/render-backdrops.py --avatars-only`.
As três cenas usam exclusivamente geometria original em `src/sceneGeometry.ts`.
Os fundos 2D são renderizados das mesmas cenas com iluminação compartilhada:
execute `python tools/render-backdrops.py` com o servidor local em execução.
As cópias antigas de Poly Pizza estão arquivadas fora de `public`, em
`../materiais/arquivo-poly-pizza`, e não são carregadas nem distribuídas.
Consulte `public/backdrops/README.md` e os manifests de avatares e ilustrações.

AR/VR dependem de suporte do navegador/dispositivo e ainda precisam de
testes físicos. A etapa Explorar apresenta “A tela era só o começo” e os
conceitos AR/VR/XR em toda a largura, sem um segundo visualizador.
As orientações de compatibilidade e a dica “Experimente” ficam no ícone de ajuda do palco.
O crédito 6DoF/8th Wall foi incorporado à página de licença, cujo link
permanece disponível. Os termos originais da licença são preservados.
O ajuste de escala aparece quando há suporte a AR. CARDBOARD abre o visor
em tela inteira, inclusive diretamente do palco 2D.
O visor usa o binário 8th Wall XR8 1.0.0 encontrado no
Logvesp, copiado sem alterações para `public/xr8`. `phoneTracking.ts`
adapta a integração: câmera traseira e sensores, SLAM em metros, alinhamento
de rumo e recuperação de origem sem teletransportar a câmera.
O indicador só mostra “6DoF ativo” após receber uma pose válida com
rastreamento NORMAL. Carga, rastreamento limitado e falhas são informados.
Sensores são solicitados no toque; o XR8 abre a câmera uma única vez, sem
abrir/fechar um stream de aquecimento antes. Rastreamento limitado continua
tentando reconhecer o ambiente depois de 30 segundos; somente uma inicialização
sem resposta por 45 segundos encerra a sessão com erro. Falhas de câmera,
permissão, contexto HTTPS e acesso do navegador têm mensagens distintas.
Sair libera a câmera, cancela resultados
atrasados e restaura o enquadramento e a rolagem.
Ao abrir, a cena ocupa toda a área da página e solicita
tela cheia nativa e orientação horizontal. Se o navegador recusar essas
APIs, mantém a cena expandida e permite girar o aparelho manualmente.
Um portal leva o mesmo canvas para o `body`, fora das restrições de tamanho
da seção. Suas dimensões acompanham o `visualViewport`, inclusive ao fechar
o teclado ou girar o aparelho; a saída devolve o canvas ao lugar original.
Sem sensores, a exploração por arraste continua disponível. O botão
“Sair do visor”, Escape e a saída nativa restauram a apresentação normal.
Isso vale tanto para o resultado 3D quanto para o avatar do diálogo.
O estéreo calcula a perspectiva pela área exibida e a divisão pelo buffer real.
O alinhamento inicial das lentes reaproveita o ajuste do iPhone 12 no Logvesp
(90/844 da largura para dentro em cada olho). “Alinhar imagens” permite
calibrar esse valor para outro visor e salva a preferência neste navegador.
Rastreamento 6DoF e calibração óptica precisam de teste no celular real,
com câmera traseira descoberta e ambiente iluminado. Os PDFs também
precisam de montagem física de conferência.
A boca tem animação aproximada; alinhamento dos 15 visemas ao áudio pendente.
Nem todo recurso do Scratch GUI foi incorporado; detalhes no parecer.

Os componentes Scratch utilizados incluem código AGPL-3.0 e Apache-2.0.
Licenças copiadas ficam em `public/vendor`. Uma publicação deve acompanhar
as obrigações dos componentes e os termos dos assets. Este recurso é
independente e não representa endosso da Scratch Foundation.
O binário 8th Wall tem licença própria, incluída em `public/xr8/LICENSE`
e vinculada na interface, com crédito a Niantic Spatial. Não é o pacote MIT.
