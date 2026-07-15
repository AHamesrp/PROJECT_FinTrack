#!/usr/bin/env python3
"""
FinTrack - OCR para PDFs baseados em imagem.
Converte PDF em texto usando Tesseract e retorna JSON.
Uso: python pdf_ocr.py <caminho_do_pdf>
Saída (stdout): {"success": true, "text": "..."} ou {"success": false, "error": "..."}
"""

import json
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        output_error("Uso: python pdf_ocr.py <caminho_do_pdf>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        output_error(f"Arquivo não encontrado: {pdf_path}")
        sys.exit(1)

    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError as e:
        output_error(
            f"Dependências Python não instaladas. Execute: pip install -r scripts/requirements.txt. Erro: {e}"
        )
        sys.exit(1)

    try:
        images = convert_from_path(str(pdf_path), dpi=300)
    except Exception as e:
        output_error(f"Erro ao converter PDF em imagens. Instale Poppler. Detalhes: {e}")
        sys.exit(1)

    text_parts = []
    try:
        for i, image in enumerate(images):
            page_text = pytesseract.image_to_string(
                image,
                lang="por",
                config="--psm 6"
            )
            text_parts.append(page_text)
    except Exception as e:
        output_error(
            f"Erro no OCR. Instale Tesseract e o idioma 'por'. Detalhes: {e}"
        )
        sys.exit(1)

    full_text = "\n\n".join(text_parts).strip()
    output_success(full_text)


def output_success(text: str):
    print(json.dumps({"success": True, "text": text}, ensure_ascii=False))


def output_error(message: str):
    print(json.dumps({"success": False, "error": message, "text": ""}, ensure_ascii=False))


if __name__ == "__main__":
    main()
