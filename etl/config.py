"""
Configuración central del ETL para Tablero de Indicadores PROFEPA.
"""
import os
from pathlib import Path
from datetime import datetime

# Rutas base
BASE_DIR = Path(__file__).parent.parent
DATA_INPUT_DIR = BASE_DIR / "Documents"
DATA_OUTPUT_DIR = BASE_DIR / "public" / "data"

# Archivos fuente
SOURCE_FILES = {
    "POA_2025": {
        "path": DATA_INPUT_DIR / "POA_2025.xlsx",
        "type": "excel",
        "extractor": "poa",
        "programa": "G005",
        "anio": 2025,
        "descripcion": "Programa Operativo Anual 2025 (datos mensuales por estado)"
    },
    "MIR_G005_2025": {
        "path": DATA_INPUT_DIR / "MIR_G005_2025.xlsx",
        "type": "excel",
        "extractor": "mir",
        "programa": "G005",
        "anio": 2025,
        "descripcion": "Matriz de Indicadores para Resultados G005 2025"
    },
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
