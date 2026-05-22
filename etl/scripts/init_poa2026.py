#!/usr/bin/env python3
"""
Extrae datos de POA 2026 desde el Excel y genera seed_poa2026.json
para inicializar la base de datos SQLite del sistema interno.

Uso: python etl/scripts/init_poa2026.py
"""
import json
import os
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("ERROR: instala openpyxl: pip install openpyxl")
    sys.exit(1)

ROOT = Path(__file__).parent.parent.parent
EXCEL_PATH = ROOT / "documentos" / "0 POA_2026_abr.xlsx"
OUT_DIR = ROOT / "app" / "data"
OUT_PATH = OUT_DIR / "seed_poa2026.json"

MESES = ["ene", "feb", "mzo", "abr", "may", "jun",
         "jul", "ago", "sep", "oct", "nov", "dic"]

SERIES = ["SPA", "SIVI", "SLEJA", "SRN", "CORPA"]


def serie_de(codigo: str) -> str:
    for s in SERIES:
        if codigo.startswith(s):
            return s
    return codigo.split(".")[0] if codigo else "OTRO"


def safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if f != f else round(f, 4)  # NaN check
    except (TypeError, ValueError):
        return None


def main():
    if not EXCEL_PATH.exists():
        print(f"ERROR: No se encontró {EXCEL_PATH}")
        sys.exit(1)

    print(f"Leyendo {EXCEL_PATH}...")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb["Desglose ORPA_mes"]

    indicadores = []
    seen = set()   # (codigo, oficina)

    for row in ws.iter_rows(min_row=2, values_only=True):
        codigo = str(row[0]).strip() if row[0] else None
        nombre = str(row[1]).strip() if row[1] else None
        oficina = str(row[2]).strip() if row[2] else None

        if not codigo or not nombre or not oficina:
            continue
        if codigo == "ID":
            continue

        key = (codigo, oficina)
        if key in seen:
            continue
        seen.add(key)

        # Columnas 5-28: pares prog/avan por mes (índices 4-27)
        prog = {}
        for i, mes in enumerate(MESES):
            prog_col = 4 + i * 2      # 4,6,8,10,...
            prog[f"prog_{mes}"] = safe_float(row[prog_col])

        meta_anual = safe_float(row[28])   # columna 29 (índice 28)

        indicadores.append({
            "codigo": codigo,
            "nombre": nombre,
            "serie": serie_de(codigo),
            "oficina": oficina,
            "meta_anual": meta_anual,
            **prog,
        })

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(indicadores, f, ensure_ascii=False, indent=2)

    print(f"OK: {len(indicadores)} registros → {OUT_PATH}")

    # Resumen
    by_codigo = {}
    by_oficina = {}
    for ind in indicadores:
        by_codigo[ind["codigo"]] = by_codigo.get(ind["codigo"], 0) + 1
        by_oficina[ind["oficina"]] = by_oficina.get(ind["oficina"], 0) + 1

    print(f"  Indicadores únicos: {len(by_codigo)}")
    print(f"  Oficinas únicas:    {len(by_oficina)}")


if __name__ == "__main__":
    main()
