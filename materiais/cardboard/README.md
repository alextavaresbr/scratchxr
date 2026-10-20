# Visor de papelão — material para o ScratchXR

Preparado em 20/10/2026.

## PDFs para download no futuro site

- [Português Brasil](scratchxr-visor-cardboard-pt-BR.pdf)
- [English](scratchxr-visor-cardboard-en.pdf)

Cada PDF contém **duas páginas de orientações e seis folhas de molde A4**.
Imprimir o molde (páginas 3–8) em retrato, tamanho real / 100%, somente na
frente. As partes A, B e C têm metades esquerda/direita com sobreposição de
10 mm e cruzes de alinhamento. Cada folha inclui régua de 50 mm.

As linhas do molde mantêm as dimensões do original. Os rótulos do molde
também foram traduzidos na versão em português.

## Origem dos arquivos

O molde doméstico usado é **Cardboard 1.0**, preservado pelo portal ScienceAll:

- URL: https://www.scienceall.com/jnrepo/uploads/2020/10/CardBoard_print_yourself.pdf
- Cópia sem alterações: `originais/cardboard-v1-molde-impressao.pdf`
- SHA-256: `a86f7ecb07079a65bd1e2bef3a46bab6da59bf2391e02265a46e7ad7930e9ae3`
- Original: três folhas em formato Carta, paisagem (279,4 × 215,9 mm).

O molde não foi baixado diretamente do Google. O kit que os links oficiais
atualmente entregam contém desenhos industriais da versão I/O 2015.
Esse kit foi preservado separadamente como referência:

- Página: https://developers.google.com/cardboard/manufacturers
- Download: https://www.gstatic.com/cardboard_assets/wwgc_manufacturers_kit.zip
- Arquivo: `google-cardboard-kit-original.zip`
- SHA-256: `780e1edca1b0de85e0db74dffc21d377685d89ecf338b3adc7451ad33d8467d3`
- PDFs técnicos selecionados: `originais/referencia-v2/`

**Não misturar as lentes e as medidas dos desenhos v2 com o molde v1.**

## Verificação e limites

- Arquivos abertos e renderizados; cada versão tem oito páginas A4.
- Divisão do molde sem redimensionamento: o recorte original e seu destino
  têm exatamente a mesma largura e altura em pontos PDF.
- Rótulos em português substituídos preservando os caminhos vetoriais.
- Conferência visual das instruções e folhas renderizadas; prévias em
  `verificacao/`.
- A montagem física, a impressão em papel e o alinhamento óptico ainda
  precisam ser testados. A régua permite conferir a impressora.
- O modelo v1 pode não acomodar celulares grandes. Fazer primeiro um
  teste em papel; não aumentar a escala para tentar corrigir o encaixe.
- São necessárias lentes compatíveis; papelão e celular, sozinhos, não
  completam o visor.
- Não há QR code de acesso ao ScratchXR: o endereço público do site ainda
  não existe. Acrescentá-lo quando a URL estiver definida.
- O modo Cardboard do Logvesp é a base de software a adaptar e validar.
  Este PDF não demonstra compatibilidade em dispositivos.

## Regeneração

Com Python e PyMuPDF instalados:

```powershell
python ScratchXR/materiais/cardboard/gerar_pdfs.py
```

O script gera os dois PDFs, as prévias e um registro SHA-256 em
`verificacao/pdfs.json`.
