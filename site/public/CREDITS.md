# ScratchXR — créditos e origens / credits and origins

Recurso educacional independente. Não representa endosso da Scratch Foundation.
Independent educational resource, not endorsed by the Scratch Foundation.

Código-fonte / source: https://github.com/alextavaresbr/scratchxr

- **Cenários / environments:** geometria original escrita para o ScratchXR
  em `src/sceneGeometry.ts`. Fundos 2D renderizados da mesma geometria.
  Nenhum modelo ou textura de Poly Pizza é usado nestes cenários.
- **Personagens / characters:** presets padrão N00 do VRoid Studio.
  Sprites e retratos renderizados dos GLBs finais. Receita e validação em
  `/avatars/README.md` e `/avatars/manifest.json`. Termos originais dos
  presets continuam aplicáveis.
- **Animações básicas / base animation:** clipes do acervo Mixamo adaptados
  aos avatares. Termos originais da Adobe/Mixamo continuam aplicáveis.
- **Identidade e infográficos / identity and illustrations:** imagens
  produzidas com imagegen; prompts e origem em `/art/manifest.json`.
- **Vozes / voices:** referências do acervo usado pelo Logvesp:
  Emily para Luna, Ryan para Leo e Lola para Maya. Síntese com Voxtral.
  Os termos do acervo original continuam aplicáveis.
- **Blocos / blocks:** bibliotecas da Scratch Foundation e Blockly.
  As licenças dos pacotes copiados estão em `/vendor/`; incluem componentes
  AGPL-3.0 e Apache-2.0. A publicação do código deve cumprir essas licenças.
- **Tabela didática / learning table:** adaptação interativa por famílias
  inspirada na referência fornecida `icompute-periodic-table-scratch-3`.
  Peças SVG bilíngues fornecidas no acervo do projeto.
- **Three.js, React e Lucide:** bibliotecas de renderização e interface,
  sob suas respectivas licenças MIT/ISC.
- **Visor / viewer:** orientações bilíngues e montagem de folhas A4 a
  partir do molde Cardboard original; referências constam dos PDFs.
- **Geração de movimento / motion generation:** NVIDIA Kimodo SOMA RP v1.1
  através de `localai-org/kimodo.cpp` no servidor. O port usa Apache-2.0;
  os pesos mantêm os termos NVIDIA Open Model License e Meta Llama 3.

Referências / references:
[Scratch](https://github.com/scratchfoundation/scratch-editor),
[VRoid](https://vroid.com/en/studio),
[Three.js](https://threejs.org/),
[Kimodo.cpp](https://github.com/localai-org/kimodo.cpp).
