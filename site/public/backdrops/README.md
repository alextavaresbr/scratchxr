# Cenários originais do ScratchXR

Os três cenários são produzidos inteiramente por geometria própria em
`src/sceneGeometry.ts`, com metadados bilíngues em `src/sceneAssets.ts`.
Não usam meshes, texturas ou modelos do acervo Poly Pizza.

- **Bosque das ideias / Grove of ideas**: árvores de menta, pavilhão de
  madeira, riacho, ponte, bancos e flores claras.
- **Vila das descobertas / Discovery village**: fachadas com arcos,
  telhados de argila, observatório de cúpula lavanda, toldo e bandeirolas.
- **Jardim das estrelas / Garden of stars**: estufa aberta com arcos de
  cobre, escultura de anéis, flores de lavanda e lago com folhas flutuantes.

Os PNGs de 960 × 720 são renderizações dessas mesmas cenas, sem personagem.
O Scratch os usa com resolução de bitmap 2 (palco 480 × 360).
Os arquivos `*-panorama.png`, de 5760 × 720, ampliam o enquadramento
horizontal com a mesma câmera ortográfica. A área central corresponde ao
fundo original; as laterais preenchem a janela compartilhada com o 3D,
sem alterar a proporção ou as coordenadas do canvas Scratch.
`python tools/render-backdrops.py` os recria usando o servidor Vite local.
O script também salva capturas com o avatar e informações de renderização
em `.cache/`, e verifica ausência de requisições ao antigo catálogo.

Os IDs `forest`, `village`, `garden` foram preservados para os programas.
Chão de 160 m, área central de 10 × 10 m sem obstáculos sólidos, decoração
sem colisões. Caminhos são marcas no piso e não restringem a programação.
As malhas estáticas são agrupadas por material para reduzir chamadas de desenho.

As árvores seguem a referência low-poly do usuário: copas com volumes
irregulares e faces triangulares planas, usando cores por face. A geometria
foi aprovada; a paleta foi suavizada para menta e sálvia, acompanhando o
cenário. As plantas em vasos usam o mesmo acabamento facetado.
As copas projetam sombra no chão sem receber a própria sombra.
As árvores próximas ao pavilhão foram afastadas para liberar a cobertura
e o enquadramento inicial. São 23–27 lotes estáticos por cenário.
