# ScratchXR

Recurso educacional interativo, em português brasileiro e inglês, para
estudantes de 10–16 anos. Combina pensamento computacional, programação
Scratch em 2D e reprodução com personagens VRoid em 3D, AR, VR e Cardboard.

**Por: Alexandre Tavares.** Recurso independente baseado no Scratch.

## Hospedar no Railway

1. Crie um projeto no Railway e selecione **Deploy from GitHub repo** →
   `alextavaresbr/scratchxr`, branch `main`.
2. Mantenha o **Root Directory na raiz do repositório**. O Dockerfile e o
   `railway.json` já definem a compilação, a inicialização e o healthcheck.
   Não é necessário configurar comandos de build/start no painel.
3. Em **Networking**, gere o domínio público HTTPS do serviço.
4. Se desejar o diálogo e reconhecimento de voz online, configure as
   variáveis abaixo no serviço e faça o redeploy.

O servidor escuta em `0.0.0.0`, usa a variável `PORT` disponibilizada pelo
Railway e responde ao healthcheck em `/api/health`. O HTTPS é terminado
pelo Railway. Referências: [Dockerfiles](https://docs.railway.com/builds/dockerfiles)
e [healthchecks](https://docs.railway.com/deployments/healthchecks).

| Variável | Finalidade |
| --- | --- |
| `CLAUDE_API_KEY` ou `ANTHROPIC_API_KEY` | Diálogo com Claude Haiku |
| `MISTRAL_API_KEY` | Transcrição e síntese com os samples incluídos |
| `SCRATCHXR_VOICE_PT` | Opcional: substitui os samples por um ID de voz em português |
| `SCRATCHXR_VOICE_EN` | Opcional: substitui os samples por um ID de voz em inglês |

As chaves ficam somente no servidor. Não as coloque no GitHub nem use
prefixo `VITE_`. O arquivo [site/.env.example](site/.env.example) contém
apenas nomes e valores vazios.

O site abre sem essas variáveis. Nesse caso o tutor oferece uma explicação
local e a síntese de voz usa os recursos disponíveis no navegador.

As referências do Logvesp ficam em `site/voices`: Emily para Luna, Ryan para
Leo e Lola para Maya. O servidor escolhe pelo personagem; nenhum cadastro
adicional de voz é necessário. As chaves do ambiente local **não são
transferidas para o Railway**: configure-as no painel do serviço.
No diálogo VR/Cardboard, a permissão do microfone é solicitada ao entrar.
A fala é enviada após uma pausa e a escuta retoma depois da resposta.
Sair do visor ou desligar o ícone encerra a captura. Sem permissão, use texto.

**Kimodo é opcional e não está instalado na imagem Docker.** A instalação
Windows do workspace não acompanha o deploy. Sem executável e pesos no
servidor, os pedidos de movimento usam o aceno já preparado. Para habilitar
geração, é necessária uma instalação Linux compatível e persistente,
configurada por `KIMODO_DIR`, `KIMODO_EXE`, `KIMODO_MOTION` e `KIMODO_TEXT`.
Os limites e a fila atuais ficam na memória de cada instância.

## Executar localmente

Requer Node.js 24.

```sh
cd site
npm ci
npm run dev
```

Desenvolvimento: `https://localhost:4310`. O certificado é local.
O conteúdo público já está incluído, sem necessidade de acessar o zEngine.

Para testar a distribuição de produção:

```sh
npm run build
npm start
```

Produção local: `http://localhost:3000`, ou a porta configurada em `PORT`.
Use HTTPS na hospedagem para câmera, sensores e WebXR. Em produção,
as variáveis são lidas do ambiente do processo; `.env` não é publicado.

```sh
npm test
```

## Conteúdo

- `site/src`: interface, VM Scratch, ponte 2D/3D, cenas e serviços.
- `site/public`: modelos, recortes, cenários, arte, fontes, peças PT/EN,
  bibliotecas, binários XR8 com licença e PDFs para download.
- `Utilizados`: peças SVG originais selecionadas.
- `materiais/cardboard`: molde, instruções bilíngues e fontes do material.
- [PARECER.md](PARECER.md): decisões, implementação e limitações.
- [PONTE-SCRATCH-VROID.md](PONTE-SCRATCH-VROID.md): correspondência Scratch/3D.
- [site/README.md](site/README.md): detalhes e ferramentas de desenvolvimento.

Os assets necessários à hospedagem estão no repositório. Algumas ferramentas
opcionais de **reexportação** dos avatares utilizam o workspace zEngine;
elas não são executadas no build do Railway.

Os cenários usam geometria própria. Luna, Leo e Maya usam presets padrão
VRoid e animações adaptadas. Licenças e atribuições de terceiros continuam
aplicáveis e são preservadas nas respectivas pastas, incluindo XR8 e Scratch.
Não há licença geral que substitua os termos desses materiais.

Verificação de dependências: o `npm audit` atual sinaliza quatro entradas
(três críticas e uma moderada) ligadas a dependências legadas de Scratch,
incluindo `hull.js` e `uuid`. A imagem de execução contém somente o servidor
compilado e assets; isso não elimina os alertas das bibliotecas do cliente.
A atualização desses componentes deve preservar a compatibilidade da VM.
