"""
Configuración central del ETL para Tablero de Indicadores PROFEPA.
"""
import os
from pathlib import Path
from datetime import datetime

# Rutas base
BASE_DIR = Path(__file__).parent.parent
DATA_INPUT_DIR = BASE_DIR / "Documents"
DATA_NUEVOS_DIR = DATA_INPUT_DIR / "Nuevos"
DATA_OUTPUT_DIR = BASE_DIR / "public" / "data"

# Archivos fuente — se priorizan los de Documents/Nuevos (datos corregidos)
SOURCE_FILES = {
    # ── Nuevos (corregidos) ──
    "MIR_2025_Final": {
        "path": DATA_NUEVOS_DIR / "MIR_2025_FinalPúblico.xlsx",
        "type": "excel",
        "extractor": "mir25",
        "programa": "G005",
        "anio": 2025,
        "descripcion": "MIR 2025 — versión final pública (hoja MIR25)"
    },
    "POA_2025_Final": {
        "path": DATA_NUEVOS_DIR / "POA_2025_FinalPúblico.xlsx",
        "type": "excel",
        "extractor": "poa",
        "programa": "G005",
        "anio": 2025,
        "descripcion": "POA 2025 — versión final pública (ene-dic completo)"
    },
    "POA_2026_feb": {
        "path": DATA_NUEVOS_DIR / "POA_2026_feb.xlsx",
        "type": "excel",
        "extractor": "poa",
        "programa": "G005",
        "anio": 2026,
        "descripcion": "POA 2026 — corte febrero (ene-feb con avance)"
    },
    # ── Originales que siguen vigentes ──
    "FiME_2026": {
        "path": DATA_INPUT_DIR / "FiME 2026 PFPA.xlsx",
        "type": "excel",
        "extractor": "mir",
        "programa": "G014",
        "anio": 2026,
        "descripcion": "Ficha de Indicadores de Monitoreo y Evaluación 2026"
    },
    "G014_Auditoria": {
        "path": DATA_INPUT_DIR / "G014 para Auditoría.docx",
        "type": "docx",
        "programa": "G014",
        "anio": 2026,
        "descripcion": "Documentación narrativa del programa G014 para Auditoría"
    }
}

# Configuración de extracción
EXTRACTION_CONFIG = {
    "fecha_extraccion": datetime.now().isoformat(),
    "version": "1.0.0",
    "encoding": "utf-8"
}

# Niveles MIR estándar
NIVELES_MIR = ["Fin", "Propósito", "Componente", "Actividad"]

# Mapeo de columnas comunes (normalización)
COLUMN_MAPPINGS = {
    "indicador": ["indicador", "nombre_indicador", "nombre", "indicator", "descripcion_indicador"],
    "meta": ["meta", "meta_programada", "meta_anual", "valor_meta"],
    "avance": ["avance", "avance_fisico", "avance_porcentual", "porcentaje_avance", "%_avance"],
    "unidad_medida": ["unidad_medida", "unidad", "um", "medida"],
    "periodo": ["periodo", "mes", "trimestre", "año", "fecha"],
    "definicion": ["definicion", "descripcion", "concepto", "objetivo"],
    "metodo_calculo": ["metodo_calculo", "formula", "método", "calculo"],
    "nivel": ["nivel", "nivel_mir", "tipo"]
}

# Configuración de calidad de datos
QUALITY_CONFIG = {
    "min_rows_valid": 1,
    "required_fields": ["indicador"],
    "numeric_fields": ["meta", "avance", "valor"],
    "date_formats": ["%Y-%m-%d", "%d/%m/%Y", "%Y-%m", "%Y"]
}
