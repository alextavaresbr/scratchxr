"""Build A4 guides without scaling the downloaded Cardboard 1.0 cut lines.

Requires PyMuPDF (fitz). Originals are retained separately.
Run: python ScratchXR/materiais/cardboard/gerar_pdfs.py
"""
from pathlib import Path
import hashlib
import json

import fitz

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "originais" / "cardboard-v1-molde-impressao.pdf"
MM = 72 / 25.4
W, H = 210 * MM, 297 * MM
INK = (0.12, 0.17, 0.22)
ACCENT = (0.0, 0.38, 0.42)
GRAY = (0.42, 0.45, 0.48)


def box(page, rect, text, size=10.5, bold=False, color=INK, align=0):
    remaining = page.insert_textbox(
        fitz.Rect(*[v * MM for v in rect]),
        text,
        fontsize=size,
        fontname="hebo" if bold else "helv",
        color=color,
        align=align,
        lineheight=1.25,
    )
    if remaining < 0:
        raise ValueError(f"Text overflow: {text[:70]!r}: {remaining}")


def base(doc, title, subtitle):
    page = doc.new_page(width=W, height=H)
    page.draw_rect(fitz.Rect(0, 0, W, 9 * MM), color=None, fill=ACCENT)
    box(page, (17, 17, 193, 29), title, 19, True)
    box(page, (17, 32, 193, 46), subtitle, 10, color=GRAY)
    return page


COPY = {
    "pt-BR": {
        "title": "Monte seu visor de papelão",
        "sub": "ScratchXR | Guia em português + molde Cardboard 1.0 em escala real",
        "intro": (
            "Uma atividade de montagem para explorar a visão estéreo no celular. "
            "O molde é antigo: faça primeiro um teste de encaixe em papel. "
            "Celulares grandes podem não caber; não amplie o desenho para acomodá-los."
        ),
        "materials": "O que separar",
        "materials_body": (
            "- 6 folhas A4 para o molde, impressas somente de um lado.\n"
            "- Papelão fino e firme, cerca de 1,5 mm; área mínima aproximada de 22 x 56 cm.\n"
            "- Duas lentes próprias para Cardboard v1, compatíveis com os furos e a distância "
            "lente-tela do molde. A referência do Google indica distância focal de cerca de 45 mm.\n"
            "- Régua, lápis, cola adequada para papelão, fita, velcro e elástico para prender o celular.\n"
            "- Tesoura; recortes internos com estilete devem ser feitos por um adulto."
        ),
        "print": "Imprima sem alterar as medidas",
        "print_body": (
            "Imprima as páginas 3 a 8 em A4, orientação retrato, tamanho real / 100%. "
            "Desative 'ajustar à página' e a impressão de várias páginas por folha.\n\n"
            "Meça a régua de 50 mm em cada folha. Se ela não medir exatamente 5 cm, corrija "
            "a configuração de impressão antes de recortar.\n\n"
            "Cada folha do original foi dividida em duas partes, com 10 mm de sobreposição. "
            "As linhas de corte e dobra mantêm as dimensões do PDF de origem."
        ),
        "note": (
            "O papelão não substitui as lentes. O uso no site também depende do celular, dos sensores "
            "e do navegador. Este material ainda precisa de montagem física e teste de encaixe."
        ),
        "assembly_title": "Da impressão à montagem",
        "assembly_sub": "Leia esta sequência antes de cortar o papelão.",
        "steps": [
            ("1. Una as folhas",
             "Junte A-esquerda com A-direita; repita para B e C. Recorte apenas a margem branca "
             "na emenda e sobreponha os desenhos. Alinhe as cruzes de cima e de baixo e as linhas "
             "do molde. A faixa repetida mede 10 mm."),
            ("2. Prepare as peças",
             "Una os trechos do corpo pelos números iguais: claros sobre escuros. Teste o encaixe "
             "do celular em papel. Cole o molde no papelão. Linhas pretas indicam corte; vermelhas, "
             "dobra. Não corte as linhas de dobra."),
            ("3. Monte o suporte",
             "Coloque as lentes na peça A seguindo a orientação desenhada. Dobre as três partes "
             "do suporte para reter as lentes. Monte a divisória central e encaixe as abas do "
             "corpo, sem forçar ou deformar as lentes."),
            ("4. Prenda e experimente",
             "Fixe o fechamento com velcro e segure o celular com elástico. Confirme que ele não "
             "escorrega. Abra a experiência estéreo antes de encaixar o aparelho. Segure o visor "
             "com as mãos, sentado; retire-o se a imagem estiver dupla ou causar desconforto."),
        ],
        "optional": (
            "O desenho original inclui ímãs e um botão magnético. Eles não são necessários para "
            "sustentar o visor, e seu funcionamento como controle no navegador não é garantido. "
            "Mantenha peças pequenas sob supervisão adulta. Não exponha as lentes ao sol."
        ),
        "source": (
            "Origem: molde Cardboard 1.0 preservado por ScienceAll; diretrizes de materiais do Google. "
            "Esta adaptação acrescenta instruções e divide as folhas em A4. Não representa "
            "certificação do visor nem validação em todos os celulares."
        ),
        "tile_title": "Molde",
        "left": "esquerda",
        "right": "direita",
        "tile_sub": "A4 retrato | 100% / tamanho real | régua de conferência: 50 mm",
        "tile_instruction": "Una com a outra metade da mesma letra. Alinhe as duas cruzes.",
        "ruler": "Esta linha deve medir exatamente 5 cm.",
        "footer": "Preto = cortar | Vermelho = dobrar | 10 mm de sobreposição",
    },
    "en": {
        "title": "Build your cardboard viewer",
        "sub": "ScratchXR | English guide + full-size Cardboard 1.0 template",
        "intro": (
            "A hands-on activity to explore stereo viewing on a phone. This is an older template: "
            "first check the fit with a paper mock-up. Large phones may not fit; do not enlarge "
            "the drawing to accommodate them."
        ),
        "materials": "Gather your materials",
        "materials_body": (
            "- 6 A4 sheets for the template, printed on one side only.\n"
            "- Thin, firm cardboard, about 1.5 mm thick; approximately 22 x 56 cm minimum.\n"
            "- Two Cardboard v1 lenses matching the holes and lens-to-screen spacing. "
            "Google's reference suggests a focal length of about 45 mm.\n"
            "- A ruler, pencil, cardboard-safe glue, tape, hook-and-loop fastener and a rubber band.\n"
            "- Scissors; an adult should make any internal cuts requiring a craft knife."
        ),
        "print": "Keep the original dimensions",
        "print_body": (
            "Print pages 3 to 8 on A4 paper, portrait orientation, actual size / 100%. "
            "Turn off 'fit to page' and multiple-pages-per-sheet printing.\n\n"
            "Measure the 50 mm ruler on every sheet. If it is not exactly 5 cm, correct the "
            "print settings before cutting.\n\n"
            "Each original sheet is split into two halves with a 10 mm overlap. "
            "Cut and fold lines retain the dimensions of the source PDF."
        ),
        "note": (
            "Cardboard cannot replace the lenses. Website viewing also depends on the phone, "
            "sensors and browser. A physical assembly and phone-fit test are still required."
        ),
        "assembly_title": "From paper to viewer",
        "assembly_sub": "Read these steps before cutting the cardboard.",
        "steps": [
            ("1. Join the sheets",
             "Join A-left to A-right, then repeat for B and C. Trim only the white margin at "
             "the seam and overlap the drawings. Align the upper and lower crosses and the "
             "template lines. The repeated strip is 10 mm wide."),
            ("2. Prepare the parts",
             "Join the body sections using matching numbers, light numbers over dark ones. "
             "Check your phone's fit in paper first. Glue the template to cardboard. Black "
             "lines are cuts; red lines are folds. Do not cut the fold lines."),
            ("3. Assemble the support",
             "Place the lenses in part A, following the illustrated orientation. Fold the "
             "three lens-holder panels to retain the lenses. Fit the central divider and "
             "body tabs without forcing or distorting the lenses."),
            ("4. Secure and try it",
             "Secure the closure with hook-and-loop fastener and retain the phone with a rubber "
             "band. Check it cannot slide out. Open the stereo experience before inserting "
             "the phone. Hold the viewer while seated; remove it if you see double or feel discomfort."),
        ],
        "optional": (
            "The original drawing includes magnets and a magnetic button. They are not needed "
            "to support the viewer, and browser input compatibility is not guaranteed. Keep "
            "small parts under adult supervision. Keep the lenses out of direct sunlight."
        ),
        "source": (
            "Source: Cardboard 1.0 template preserved by ScienceAll; Google material guidelines. "
            "This adaptation adds instructions and splits the sheets into A4 pages. It is not "
            "viewer certification or a guarantee of compatibility with every phone."
        ),
        "tile_title": "Template",
        "left": "left",
        "right": "right",
        "tile_sub": "A4 portrait | 100% / actual size | scale-check ruler: 50 mm",
        "tile_instruction": "Join to the other half with the same letter. Align both crosses.",
        "ruler": "This line must measure exactly 5 cm.",
        "footer": "Black = cut | Red = fold | 10 mm overlap",
    },
}


def localized_source(locale):
    src = fitz.open(SOURCE)
    if locale == "en":
        return src
    replacements = {
        0: [
            ((646, 545, 746, 583), "Cardboard 1.0\nMolde de impressão", 9),
            ((205, 181, 259, 221), "Lente: lado\ncurvo para\nbaixo", 8),
            ((59, 102, 158, 122), "Imprima o molde", 10),
            ((208, 102, 305, 137), "Cole o molde\nno papelão", 10),
            ((504, 102, 604, 122), "Recorte o papelão", 10),
            ((351, 102, 459, 137), "Cole os números claros\nsobre os escuros", 9),
            ((657, 102, 746, 137), "Monte conforme\no guia", 10),
        ],
        2: [
            ((102, 163, 146, 180), "ÍMÃ", 9),
            ((298, 96, 393, 150), "Dobre esta aba\npara trás da outra.\nO ímã fica no\nlado de trás.", 8),
        ],
    }
    for page_no, changes in replacements.items():
        page = src[page_no]
        for rect, _, _ in changes:
            page.add_redact_annot(fitz.Rect(rect), fill=(1, 1, 1))
        # Keep the engineering paths and images intact; remove text only.
        page.apply_redactions(images=0, graphics=0, text=0)
        for rect, text, size in changes:
            spare = page.insert_textbox(
                fitz.Rect(rect), text, fontsize=size, fontname="helv",
                color=GRAY, align=1, lineheight=1.1,
            )
            if spare < 0:
                raise ValueError(f"Translation overflow: {text}")
    return src


def guide_pages(doc, locale):
    c = COPY[locale]
    p = base(doc, c["title"], c["sub"])
    box(p, (17, 49, 193, 77), c["intro"])
    box(p, (17, 82, 193, 93), c["materials"], 14, True, ACCENT)
    box(p, (17, 96, 193, 165), c["materials_body"])
    box(p, (17, 170, 193, 181), c["print"], 14, True, ACCENT)
    box(p, (17, 184, 193, 250), c["print_body"])
    box(p, (17, 259, 193, 283), c["note"], 9, color=GRAY)
    p = base(doc, c["assembly_title"], c["assembly_sub"])
    for i, (title, text) in enumerate(c["steps"]):
        top = 49 + i * 40
        box(p, (17, top, 193, top + 9), title, 12, True, ACCENT)
        box(p, (17, top + 10, 193, top + 38), text, 10)
    box(p, (17, 214, 193, 242), c["optional"], 9)
    box(p, (17, 249, 193, 273), c["source"], 8.5, color=GRAY)
    box(p, (17, 277, 193, 288), "developers.google.com/cardboard/manufacturers", 9, color=ACCENT)
    p.insert_link({
        "kind": fitz.LINK_URI, "from": fitz.Rect(17*MM, 277*MM, 193*MM, 289*MM),
        "uri": "https://developers.google.com/cardboard/manufacturers",
    })


def cross(page, x, y):
    page.draw_line((x - 2*MM, y), (x + 2*MM, y), color=ACCENT, width=0.65)
    page.draw_line((x, y - 2*MM), (x, y + 2*MM), color=ACCENT, width=0.65)


def build(locale):
    c = COPY[locale]
    src = localized_source(locale)
    out = fitz.open()
    guide_pages(out, locale)
    for index, source_page in enumerate(src):
        midpoint = source_page.rect.width / 2
        overlap = 10 * MM
        clips = [
            fitz.Rect(0, 0, midpoint + overlap/2, source_page.rect.height),
            fitz.Rect(midpoint - overlap/2, 0, source_page.rect.width, source_page.rect.height),
        ]
        for side, clip in zip(("left", "right"), clips):
            name = f'{c["tile_title"]} {chr(65+index)} - {c[side]}'
            page = base(out, name, c["tile_sub"])
            # Equal point dimensions are essential: no resizing of the template.
            x = (W - clip.width) / 2
            y = 45 * MM
            target = fitz.Rect(x, y, x + clip.width, y + clip.height)
            assert abs(target.width - clip.width) < 1e-8
            assert abs(target.height - clip.height) < 1e-8
            page.show_pdf_page(target, src, index, clip=clip)
            page.draw_rect(target, color=(0.75, 0.77, 0.78), width=0.35)
            seam_x = x + midpoint - clip.x0
            cross(page, seam_x, y - 3 * MM)
            cross(page, seam_x, target.y1 + 3 * MM)
            box(page, (17, 267, 193, 274), c["tile_instruction"], 8, color=GRAY)
            ruler_y = 281 * MM
            page.draw_line((20*MM, ruler_y), (70*MM, ruler_y), color=INK, width=1)
            for k in range(6):
                xx = (20 + k*10) * MM
                page.draw_line((xx, ruler_y-1.5*MM), (xx, ruler_y+1.5*MM), color=INK, width=0.7)
            box(page, (77, 277, 193, 285), c["ruler"], 8)
            box(page, (17, 289, 193, 296), c["footer"], 8, color=GRAY)
    out.set_metadata({
        "title": f'ScratchXR - {c["title"]}',
        "author": "ScratchXR; source template: Google Cardboard 1.0",
        "subject": "A4 print-at-100-percent template with assembly guide; physical validation pending",
    })
    target = ROOT / f"scratchxr-visor-cardboard-{locale}.pdf"
    out.save(target, garbage=4, deflate=True)
    out.close()
    check = fitz.open(target)
    assert len(check) == 8
    assert all(abs(p.rect.width-W) < 0.01 and abs(p.rect.height-H) < 0.01 for p in check)
    preview_dir = ROOT / "verificacao"
    preview_dir.mkdir(exist_ok=True)
    for index in (0, 1, 2, 3, 6, 7):
        check[index].get_pixmap(matrix=fitz.Matrix(1, 1)).save(
            preview_dir / f"{locale}-pagina-{index+1}.png"
        )
    return {"file": target.name, "pages": len(check), "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}


if __name__ == "__main__":
    results = [build(locale) for locale in COPY]
    (ROOT / "verificacao" / "pdfs.json").write_text(
        json.dumps(results, indent=2), encoding="utf-8"
    )
    print(json.dumps(results, indent=2))
