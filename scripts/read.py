#!/usr/bin/env python3
"""
FinTrack - OCR para PDFs baseados em imagem.
Converte PDF em texto usando Tesseract e retorna JSON.
Uso: python pdf_ocr.py <caminho_do_pdf>
Saída (stdout): {"success": true, "text": "..."} ou {"success": false, "error": "..."}
"""

import csv
import json
import re
import sys
from datetime import datetime
from io import StringIO
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        output_error("Uso: python read.py <caminho_do_arquivo>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        output_error(f"Arquivo não encontrado: {file_path}")
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
        if file_path.suffix.lower() == ".pdf":
            full_text = ocr_pdf(file_path)
            initial_transactions = []
        elif file_path.suffix.lower() in {".csv", ".txt"}:
            full_text, initial_transactions = parse_csv_or_txt(file_path)
        else:
            output_error(
                "Formato de arquivo não suportado pelo script. Use PDF, CSV ou TXT."
            )
            sys.exit(1)
    except Exception as e:
        output_error(f"Erro ao ler o arquivo. Detalhes: {e}")
        sys.exit(1)

    try:
        statement, transactions = analyze_statement(full_text, initial_transactions)
        output_success(full_text, statement, transactions)
    except Exception as e:
        output_error(f"Erro ao analisar o extrato. Detalhes: {e}")
        sys.exit(1)


def ocr_pdf(pdf_path: Path) -> str:
    from pdf2image import convert_from_path
    import pytesseract

    images = convert_from_path(str(pdf_path), dpi=300)
    text_parts = []
    for image in images:
        page_text = pytesseract.image_to_string(
            image,
            lang="por",
            config="--psm 6"
        )
        text_parts.append(page_text)

    return "\n\n".join(text_parts).strip()


def parse_csv_or_txt(file_path: Path):
    raw_text = file_path.read_text(encoding="utf-8", errors="replace")
    transactions = []

    if file_path.suffix.lower() == ".csv":
        rows = list(csv.reader(StringIO(raw_text), delimiter=","))
        if rows:
            headers = [normalize_header(cell) for cell in rows[0]]
            date_idx = find_index(headers, ["date", "data"])
            desc_idx = find_index(headers, ["description", "descricao", "historico", "histórico", "history"])
            amount_idx = find_index(headers, ["amount", "valor", "total", "valorbruto", "valor liquido"])
            credit_idx = find_index(headers, ["credit", "credito"])
            debit_idx = find_index(headers, ["debit", "debito"])

            if desc_idx is not None and (amount_idx is not None or (credit_idx is not None and debit_idx is not None)):
                for row in rows[1:]:
                    if not any(row):
                        continue
                    date = row[date_idx].strip() if date_idx is not None and date_idx < len(row) else ""
                    desc = row[desc_idx].strip() if desc_idx < len(row) else ""
                    amount = None
                    tx_type = None

                    if amount_idx is not None and amount_idx < len(row):
                        amount = parse_amount(row[amount_idx])
                    elif credit_idx is not None and credit_idx < len(row) and row[credit_idx].strip():
                        amount = parse_amount(row[credit_idx])
                        tx_type = "credit"
                    elif debit_idx is not None and debit_idx < len(row) and row[debit_idx].strip():
                        amount = -parse_amount(row[debit_idx])
                        tx_type = "debit"

                    if amount is not None:
                        if tx_type is None:
                            tx_type = "credit" if amount >= 0 else "debit"
                        transactions.append({
                            "description": desc,
                            "amount": amount,
                            "type": tx_type,
                            "category": None,
                            "transaction_date": normalize_date(date),
                        })
                return raw_text, transactions

    return raw_text, parse_transactions(raw_text)


def analyze_statement(full_text: str, initial_transactions=None):
    lines = [line.strip() for line in full_text.splitlines() if line.strip()]
    bank_name = extract_bank_name(lines)
    period_start, period_end = extract_period(lines)
    transactions = initial_transactions or parse_transactions(full_text)

    total_income = sum(tx["amount"] for tx in transactions if tx["type"] == "credit")
    total_expenses = sum(abs(tx["amount"]) for tx in transactions if tx["type"] == "debit")
    balance = total_income - total_expenses

    return {
        "bank_name": bank_name,
        "period_start": period_start,
        "period_end": period_end,
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(balance, 2),
    }, transactions


def extract_bank_name(lines):
    for line in lines[:6]:
        normalized = line.lower()
        if any(term in normalized for term in ["extrato", "banco", "agência", "conta", "saldo"]):
            continue
        return line
    return None


def extract_period(lines):
    text = "\n".join(lines)
    match = re.search(r"periodo[:\s]*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})\s*(?:a|até|to)\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})", text, re.IGNORECASE)
    if match:
        return normalize_date(match.group(1)), normalize_date(match.group(2))

    dates = [normalize_date(token) for token in re.findall(r"\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}", text)]
    if len(dates) >= 2:
        return dates[0], dates[-1]
    return None, None


def parse_transactions(full_text: str):
    transactions = []
    lines = [line.strip() for line in full_text.splitlines() if line.strip()]

    for line in lines:
        tx = parse_transaction_line(line)
        if tx:
            transactions.append(tx)

    if not transactions and len(lines) > 0:
        transactions = parse_transaction_line_fallback(full_text)

    return transactions


def parse_transaction_line(line: str):
    line = re.sub(r"\s{2,}", " ", line)
    patterns = [
        re.compile(r"(?P<date>\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s+(?P<desc>.+?)\s+(?P<debit>-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s+(?P<credit>-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))$"),
        re.compile(r"(?P<date>\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s+(?P<desc>.+?)\s+(?P<amount>-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))$")
    ]

    for pattern in patterns:
        match = pattern.search(line)
        if not match:
            continue

        date_str = match.groupdict().get("date")
        description = match.groupdict().get("desc", "").strip()
        debit_str = match.groupdict().get("debit")
        credit_str = match.groupdict().get("credit")
        amount_str = match.groupdict().get("amount")

        amount = None
        tx_type = "credit"
        transaction_date = normalize_date(date_str)

        if debit_str and debit_str.strip():
            amount = -abs(parse_amount(debit_str))
            tx_type = "debit"
        elif credit_str and credit_str.strip():
            amount = abs(parse_amount(credit_str))
            tx_type = "credit"
        elif amount_str:
            amount = parse_amount(amount_str)
            tx_type = "credit" if amount >= 0 else "debit"

        if amount is None:
            continue

        return {
            "description": description,
            "amount": round(amount, 2),
            "type": tx_type,
            "category": None,
            "transaction_date": transaction_date,
        }

    return None


def parse_transaction_line_fallback(full_text: str):
    transactions = []
    numbers = re.findall(r"-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})", full_text)
    if not numbers:
        return []

    for line in full_text.splitlines():
        tx = parse_transaction_line(line)
        if tx:
            transactions.append(tx)
    return transactions


def parse_amount(value: str) -> float:
    cleaned = value.replace(".", "").replace(",", ".").replace("R$", "").replace("$", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def find_index(headers, candidates):
    for idx, header in enumerate(headers):
        for candidate in candidates:
            if candidate in header:
                return idx
    return None


def normalize_date(value: str):
    if not value:
        return None

    value = value.strip().replace(".", "/").replace("-", "/")
    parts = value.split("/")
    try:
        if len(parts) == 3:
            day, month, year = [int(part) for part in parts]
            if year < 100:
                year += 2000
            return datetime(year, month, day).strftime("%Y-%m-%d")
    except ValueError:
        pass

    return None


def output_success(text: str, statement: dict, transactions: list):
    print(json.dumps(
        {
            "success": True,
            "text": text,
            "statement": statement,
            "transactions": transactions,
        },
        ensure_ascii=False,
    ))


def output_error(message: str):
    print(json.dumps({"success": False, "error": message, "text": ""}, ensure_ascii=False))


if __name__ == "__main__":
    main()
