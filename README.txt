OBJETIVO
- Crie um RECURSO EDUCACIONAL em formato Site/Web para ensino sobre Introdução ao Pensamento Computacional e à Realidade Estendida (XR) para crianças e adolescentes de 10 a 16 anos.

REQUISITOS TÉCNICOS
- Site dinâmico e interativo em formato single-page e Scroll-Driven UI/Scrollytelling:  usuário consome a apresentação do início ao fim, onde o avanço depende da ação dele
- Página única (após a seleção de idiomas)
- Identidade visual consistente
- Tecnologias Three.js, WebXR ...
- 3 personagens baseados nos modelos padrão do VRoid Studio, com visemas e representações 2D correspondentes. Não utilizar personagens de Chrono Trigger.
- 3 Cenários 3D criados no GPT Astra, que combinem com a Identidade e personagens
- Criar os três cenários com geometria própria, sem assets Poly Pizza. Chão procedural amplo, com construções/vegetação periféricas; centro livre para reproduzir as ações programadas. Os fundos 2D são renderizados das mesmas cenas 3D.
- APIs: STT - Voxtral / diálogo e respostas - Claude Haiku / TTS - Voxtral.
- Utilizar peças e interface no respectivo idioma selecionado no início.
- Reaproveitar a base do editor e do motor de execução do Scratch, com interface web 2D personalizada na identidade ScratchXR.
- Toda seleção de personagem/cenário e toda programação por blocos acontecem na interface 2D web. AR/VR apresentam o resultado 3D e, ao final, o diálogo com o personagem.
- Não há edição nem manipulação de blocos em AR/VR.
- O programa criado no editor deve determinar a ação tanto na prévia 2D quanto na apresentação 3D; a ponte entre os dois modos deve definir as correspondências de movimento, orientação, tempo e demais blocos utilizados.
- Criar a ponte Scratch → VRoid, preservando a execução do programa. Priorizar animações Mixamo adaptadas aos personagens padrão do VRoid e movimentos controlados pela ponte.
- Os blocos nativos do Scratch não exigem Kimodo. Mixamo e a ponte atendem a reprodução básica; Kimodo pode complementar o acervo e gerar movimentos pedidos ao personagem no diálogo final.
- Proposta técnica e critérios de validação da ponte em PONTE-SCRATCH-VROID.md.

---

Tela inicial: 
- Logotipo "ScratchXR" (imagegen)
- Seleção de idioma (imagegen: bandeiras): inglês / português Brasil

Seção 1 - Introdução ao Pensamento Computacional
- texto breve e infográfico didático sobre o tema
(imagegen: infográfico isométrico, flat, sem linhas/traços)

Seção 2 - Introdução ao Scratch e seus bloquinhos
- texto breve e infográfico didático sobre o Scratch
(imagegen: infográfico isométrico, flat, sem linhas/traços)
- A tabela icompute-periodic-table-scratch-3.png é uma referência central para esta seção. Adaptá-la como catálogo interativo de categorias e blocos, com a identidade do site.
- Permitir explorar as categorias por clique/toque/teclado; ao selecionar um bloco, mostrar sua função, seus parâmetros e um exemplo curto com os personagens do projeto.
- Oferecer exemplos executáveis em 2D e uma passagem clara do catálogo para o editor. No celular, apresentar as categorias progressivamente para manter a legibilidade.
- Reaproveitar as peças SVG em Utilizados/<categoria>/br e Utilizados/<categoria>/eng, conforme o idioma selecionado. Conferir a equivalência funcional entre os conjuntos; as contagens de arquivos diferem em algumas categorias.
- seleção de personagem no nosso Scratch
- seleção de cenário no nosso Scratch
- criação de lógica no nosso Scratch
- visualização 2D da animação gerada pelo programa no editor personalizado do Scratch, com executar, parar e repetir.

Seção 3 - Introdução à Realidade Mista
- visualização AR do personagem escolhido (versão 3d) no cenário escolhido (versão 3d) realizando a ação programada
(Meta Quest 3 e celulares compatíveis / WebXR; área procedural ampla posicionada no ambiente real, com escala ajustável)

- visualização VR do personagem no cenário realizando a ação programada 
(Meta Quest 3 e dispositivos WebXR compatíveis; Google Cardboard em modo próprio para celular, reaproveitando o Logvesp)

- diálogo VR com o personagem no cenário sobre o que aprendeu e plantão de dúvidas
(Após a reprodução da ação; oferecer alternativa na tela para quem não utilizar visor ou microfone)
- No encerramento, o avatar pergunta se o aluno gostaria de vê-lo executar algum movimento. O pedido pode gerar uma animação Kimodo em segundo plano, dentro da conversa, sem painel técnico.
- Filtrar pedidos de movimento no servidor, em português e inglês, antes da geração. Conteúdos de violência, ódio, sexo e demais temas inadequados devem ser substituídos por movimento seguro de intenção semelhante, sem pedir confirmação. O avatar diz: "Vou fazer algo melhor" (ou equivalente em inglês).

Material complementar - Monte seu visor de papelão para celular
- Disponibilizar, junto da Seção 3 e ao final da experiência, um botão para baixar o PDF no idioma selecionado (português Brasil / inglês).
- O PDF deve conter o molde em escala real para imprimir, recortar e montar em casa, com marcas de corte, dobra e colagem, indicação de impressão a 100% e régua para conferir a escala.
- Incluir lista de materiais, especificações das lentes compatíveis com o molde, montagem ilustrada, encaixe seguro do celular e orientações de uso e auxílio de um adulto nas etapas de corte.
- Incluir link e QR code para a experiência no celular, com instruções de configuração e compatibilidade do modo Cardboard.
- Reaproveitar a implementação de Cardboard do workspace C:/Users/alexa/Área de Trabalho/logvesp, especialmente src/stage/useCardboardMode.ts; adaptar ao ScratchXR e validar nos celulares e navegadores definidos para o projeto.
- Tratar o modo Cardboard para celular separadamente das sessões WebXR AR/VR dos headsets; oferecer também a visualização na tela.
- Validar a escala do molde, a montagem física e o alinhamento das lentes com o modo de visualização antes de disponibilizar o PDF.
- PDFs preparados: materiais/cardboard/scratchxr-visor-cardboard-pt-BR.pdf e materiais/cardboard/scratchxr-visor-cardboard-en.pdf. Cada versão tem duas páginas de orientações e seis folhas A4 de molde.
- Molde Cardboard 1.0 obtido do acervo público ScienceAll, preservado sem alterações e adaptado para impressão A4 sem redimensionar as peças. Origem, limites e instruções de regeneração em materiais/cardboard/README.md.
- Pendências do material: validar montagem física e encaixe do celular; acrescentar o link/QR code do ScratchXR quando seu endereço público estiver definido.

REVISÃO INICIAL
- Decisões confirmadas, recursos reaproveitáveis e ajustes recomendados documentados em PARECER.md.
