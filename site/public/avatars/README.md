# ScratchXR — avatares VRoid

Três personagens montados exclusivamente com presets nativos padrão N00 do
acervo local do VRoid Studio. Nenhuma receita ou peça dos personagens de
Chrono Trigger foi usada. Os arquivos originais permaneceram inalterados.

| ID | Nome | Cabelo padrão | Roupa padrão |
| --- | --- | --- | --- |
| avatar-a | Luna | HairSet 002 | ClothingSet 107 |
| avatar-b | Leo | HairSet 017 | ClothingSet 104 |
| avatar-c | Maya | HairSet 009 | ClothingSet 007 |

`manifest.json` contém os caminhos, dimensões, estatísticas, morphs, receita
dos presets e resultados da validação. As receitas completas também estão
nos arquivos `.recipe.json`.

## Uso no site

- Carregar `/avatars/avatar-a.glb` etc. com `GLTFLoader`. São GLBs comuns,
  sem extensões VRM e sem necessidade de Draco ou Meshopt.
- A unidade é metro; eixo vertical `+Y` e frente `+Z`.
- Aplicar `floorOffset` à posição Y da raiz visual para apoiar o modelo no
  chão. O grupo pai recebe posição, direção e escala da ponte Scratch.
- Usar `gltf.animations`, com os nomes exatos `idle`, `walk`, `wave`.
  Os clips já foram adaptados ao esqueleto de cada avatar.
- `idle` e `walk` podem repetir; `wave` deve tocar uma vez, com transição
  de volta para `idle`. Não é necessário chamar Kimodo para essas ações.
- O runtime passa `idle` por `src/avatarIdle.ts`: mantém quadril, seus
  ancestrais e pernas na pose de 0,2 s, preservando a respiração do tronco
  e dos braços. A correção também foi incluída no exportador para futuras
  exportações; os GLBs existentes continuam com seu clipe original.
  A auditoria de 121 instantes por ciclo, nos três modelos, encontrou
  10,5–11,9 cm de deslizamento nos clipes originais e menos de 0,00001 m
  após a correção. A caminhada continuou com movimento de pés de 39–44 cm.
- `src/avatarOutline.ts` acrescenta contornos de aproximadamente 0,8 px
  lógicos, em carvão arroxeado, ao corpo, rosto, cabelo e roupa. O GLB comum
  não transporta o shader de contorno VRoid/MToon. A camada acompanha o
  mesmo esqueleto e os mesmos visemas e respeita os recortes transparentes.
  Olhos, cílios, sobrancelhas e boca mantêm seus detalhes pintados.
  O efeito é usado no 3D, AR, VR, visor de celular e nos retratos de seleção.
  Os sprites de corpo inteiro usados no palco 2D não recebem esse contorno.
- Na conversa, `src/avatarAttention.ts` aplica uma correção suave à cabeça
  depois do mixer e usa os morphs `eyeLook*` para mover as íris. A superfície
  plana N00 dos olhos permanece no lugar. O alvo é a câmera web ou a posição
  do observador em XR/Cardboard, com limites de ângulo e distância.
  A correção é removida antes de cada atualização do mixer para não acumular
  rotação. Boca, piscadas, pés e animações de demonstração são preservados.
- O deslocamento horizontal do quadril foi removido dos clips; a ponte é
  responsável pelo trajeto e pelo tempo do programa.
- Os ossos mantêm os nomes canônicos `Hips`, `Spine`, `Head`,
  `LeftUpLeg`, `LeftLeg`, `LeftFoot`, `RightHand` etc. `retargetToCtr`
  pode adaptar outros clips a esses modelos usando sua pose de bind.
- Percorrer as malhas para localizar `morphTargetDictionary` e
  `morphTargetInfluences`; o rosto possui múltiplas primitivas.

Visemas:

```text
viseme_sil viseme_PP viseme_FF viseme_TH viseme_DD
viseme_kk viseme_CH viseme_SS viseme_nn viseme_RR
viseme_aa viseme_E viseme_I viseme_O viseme_U
```

Os 52 canais ARKit e cinco aliases adicionais também foram preservados.
Os materiais usam `KHR_materials_unlit` para manter a aparência pintada.
As normais de morphs foram omitidas por não influírem nesses materiais;
as posições de todos os morphs foram preservadas. As texturas têm no
máximo 512 px e os modelos estão entre 7,09 e 7,46 MB. Carregar apenas o
personagem selecionado.

Os arquivos `avatar-a.png` etc. são sprites transparentes de corpo inteiro
com 1024 × 1280 px, sem contorno externo. `avatar-a-portrait.png` etc. são retratos transparentes
com 320 × 320 px. Ambos foram renderizados a partir do mesmo GLB final.
A função `renderAvatar` em `tools/scene-preview.ts` permite renderizá-los
novamente sem reexportar os modelos:
`python tools/render-backdrops.py --avatars-only`.
O exportador completo mantém a mesma separação: sprite sem contorno,
retrato com contorno. O Scratch incorpora o PNG completo em um traje SVG
de 92 × 115 unidades; assim, não reduz a fonte para 184 × 230 pixels.
As coordenadas, o tamanho 100% e o centro (46; 57,5) permanecem iguais.
O SVG é autossuficiente e acompanha a exportação `.sb3`.

## Origem e validação

- Catálogo original: `E:/vroid-studio/editor/catalog.json`, VRoid Studio
  2.14.0 / N00.
- Pipeline local: `apps/chared/src/vroidCharacter.ts`,
  `vroidGlbRig.ts` e `src/core/retarget/retarget-ctr.ts`.
- Clips do acervo local `E:/GAP/mixamo`: `0217.fbx` (Breathing Idle),
  `2244.fbx` (Walking Forward) e `2300.fbx` (Waving).
- As licenças originais dos presets e clips continuam aplicáveis; este
  pacote não atribui uma nova licença a materiais de terceiros.

A produção reimporta cada GLB e verifica altura, 15 visemas presentes,
deformação facial finita e não nula nos 14 visemas sonoros, duração útil
dos clips, movimento do pé na caminhada, movimento da mão no aceno e
limites dos vértices deformados em oito instantes de cada animação.
`viseme_sil` é neutro e tem delta zero por definição. As imagens finais
foram conferidas visualmente.

Para reproduzir, a partir de `E:/zengine`, iniciar em um terminal:

```powershell
node node_modules/vite/bin/vite.js --config ScratchXR/site/tools/avatar-export.config.ts
```

E executar em outro:

```powershell
python ScratchXR/site/tools/export-avatars.py
```

O servidor de produção usa apenas `127.0.0.1:5197`, fornece acesso de
leitura ao acervo e não abre o CharEd nem uma janela visível de navegador.
