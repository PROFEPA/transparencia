"""
Importa los avances ya registrados en el Excel POA 2026 (meses 1-4)
hacia la base de datos SQLite del sistema interno.

Uso: python3 etl/scripts/import_avances_poa2026.py
"""

import sqlite3, openpyxl, sys, os
from datetime import datetime

EXCEL_PATH = "documentos/0 POA_2026_abr.xlsx"
DB_PATH    = "app/data/interno.db"

# columnas (0-indexed) en la hoja 'Desglose ORPA_mes'
# Mes  : (col_prog, col_avan)
MES_COLS = {
    1: (4,  5),   # Ene
    2: (6,  7),   # Feb
    3: (8,  9),   # Mzo
    4: (10, 11),  # Abr
}

def to_num(val):
    """Convierte celda a float o None."""
    if val is None:
        return None
    s = str(val).strip()
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None

def main():
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: no se encontró {EXCEL_PATH}")
        sys.exit(1)
    if not os.path.exists(DB_PATH):
        print(f"ERROR: base de datos no encontrada en {DB_PATH}")
        print("Arranca el servidor al menos una vez para que se inicialice la DB.")
        sys.exit(1)

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb["Desglose ORPA_mes"]

    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    # Obtener el ID del admin para reviewed_by
    admin = cur.execute("SELECT id FROM users WHERE role='admin' LIMIT 1").fetchone()
    admin_id = admin["id"] if admin else None

    ahora = datetime.utcnow().isoformat()

    ins = 0    # registros insertados
    upd = 0    # registros actualizados
    skip = 0   # sin avance (null)
    err  = 0   # indicador no encontrado en DB

    for row_vals in ws.iter_rows(min_row=2, values_only=True):
        codigo  = str(row_vals[0]).strip() if row_vals[0] else None
        nombre  = str(row_vals[1]).strip() if row_vals[1] else None
        oficina = str(row_vals[2]).strip() if row_vals[2] else None

        if not codigo or not oficina:
            continue

        # Buscar indicador en DB
        ind = cur.execute(
            "SELECT id FROM indicadores_2026 WHERE codigo=? AND oficina=? LIMIT 1",
            (codigo, oficina)
        ).fetchone()

        if not ind:
            # Intento con nombre parcial de oficina
            ind = cur.execute(
                "SELECT id FROM indicadores_2026 WHERE codigo=? AND oficina LIKE ? LIMIT 1",
                (codigo, f"%{oficina.split()[0]}%")
            ).fetchone()

        if not ind:
            print(f"  WARN: no encontrado en DB — {codigo} / {oficina}")
            err += 1
            continue

        ind_id = ind["id"]

        for mes, (col_prog, col_avan) in MES_COLS.items():
            avan = to_num(row_vals[col_avan])
            prog = to_num(row_vals[col_prog])

            if avan is None:
                skip += 1
                continue

            existing = cur.execute(
                "SELECT id, status FROM capturas WHERE indicador_id=? AND oficina=? AND anio=2026 AND mes=?",
                (ind_id, oficina, mes)
            ).fetchone()

            if existing:
                cap_id  = existing["id"]
                old_st  = existing["status"]
                # Si ya está aprobado o enviado, actualizar igual con los datos del Excel
                cur.execute("""
                    UPDATE capturas
                    SET avance=?, programado=?, status='aprobado',
                        reviewed_by=?, reviewed_at=?, updated_at=?,
                        notas='Importado desde Excel POA 2026'
                    WHERE id=?
                """, (avan, prog, admin_id, ahora, ahora, cap_id))
                upd += 1
            else:
                cur.execute("""
                    INSERT INTO capturas
                      (indicador_id, oficina, anio, mes, programado, avance,
                       status, created_by, reviewed_by, reviewed_at,
                       submitted_at, updated_at, notas)
                    VALUES (?,?,2026,?,?,?, 'aprobado',?,?,?,?,?, 'Importado desde Excel POA 2026')
                """, (ind_id, oficina, mes, prog, avan,
                      admin_id, admin_id, ahora, ahora, ahora))
                ins += 1

    con.commit()
    con.close()

    total = ins + upd
    print(f"\n✓ Importación completa")
    print(f"  Insertados: {ins}")
    print(f"  Actualizados: {upd}")
    print(f"  Sin avance (omitidos): {skip}")
    print(f"  No encontrados en DB: {err}")
    print(f"  Total capturas procesadas: {total}")

if __name__ == "__main__":
    main()
