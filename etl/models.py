"""
Modelos de datos para el Tablero de Indicadores PROFEPA.
Define los esquemas para Indicator y Observation.
"""
from dataclasses import dataclass, field, asdict
from typing import Optional, List
from datetime import datetime
import json
import numpy as np


def convert_to_native(obj):
    """Convierte tipos numpy a tipos nativos de Python para JSON."""
    if isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(i) for i in obj]
    return obj


@dataclass
class Indicator:
    """
    Modelo de indicador institucional.
    Representa un indicador del POA/MIR/FiME.
    """
    id: str  # Slug único
    nombre: str
    programa: str  # G005 o G014
    anio: int
    fuente: str  # Archivo + hoja/celda o sección doc
    definicion: Optional[str] = None
    metodo_calculo: Optional[str] = None
    unidad_medida: Optional[str] = None
    nivel: Optional[str] = None  # Fin/Propósito/Componente/Actividad
    notas: Optional[str] = None
    ultima_actualizacion: str = field(default_factory=lambda: datetime.now().isoformat()[:10])
    
    def to_dict(self) -> dict:
        """Convierte a diccionario para serialización, convirtiendo tipos numpy."""
        return convert_to_native(asdict(self))
    
    def to_json(self) -> str:
        """Serializa a JSON."""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


@dataclass
class Observation:
    """
    Modelo de observación/serie temporal de un indicador.
    Representa un punto de dato en el tiempo.
    """
    indicator_id: str
    periodo: str  # YYYY-MM o YYYY-Qn o YYYY
    valor: Optional[float] = None
    meta: Optional[float] = None
    avance_porcentual: Optional[float] = None
    entidad: Optional[str] = None  # Entidad/región si aplica
    categoria: Optional[str] = None
    fuente_detalle: str = ""  # Hoja/rango específico
    
    def to_dict(self) -> dict:
        """Convierte a diccionario para serialización, convirtiendo tipos numpy."""
        return convert_to_native(asdict(self))


@dataclass
class DataQualityReport:
    """
    Reporte de calidad de datos generado durante la extracción.
    """
    archivo_fuente: str
    fecha_extraccion: str
    filas_leidas: int = 0
    filas_validas: int = 0
    filas_descartadas: int = 0
    campos_faltantes: dict = field(default_factory=dict)
    errores: List[str] = field(default_factory=list)
    advertencias: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """Convierte a diccionario para serialización."""
        return asdict(self)
    
    def add_error(self, mensaje: str):
        """Agrega un error al reporte."""
        self.errores.append(mensaje)
        
    def add_warning(self, mensaje: str):
        """Agrega una advertencia al reporte."""
        self.advertencias.append(mensaje)


@dataclass
class DataDictionary:
    """
    Diccionario de datos que describe las columnas y su significado.
    """
    columna: str
    tipo_dato: str
    descripcion: str
    ejemplo: Optional[str] = None
    valores_permitidos: Optional[List[str]] = None
    fuente_original: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convierte a diccionario para serialización."""
        return asdict(self)


# Definiciones del diccionario de datos estándar
STANDARD_DATA_DICTIONARY = [
    DataDictionary(
        columna="id",
        tipo_dato="string",
        descripcion="Identificador único del indicador (slug normalizado)",
        ejemplo="indicador-cobertura-inspeccion-2025"
    ),
    DataDictionary(
        columna="nombre",
        tipo_dato="string",
        descripcion="Nombre completo del indicador tal como aparece en la fuente original",
        ejemplo="Porcentaje de cobertura de inspección ambiental"
    ),
    DataDictionary(
        columna="programa",
        tipo_dato="string",
        descripcion="Programa presupuestario al que pertenece el indicador",
        ejemplo="G005",
        valores_permitidos=["G005", "G014", "No especificado"]
    ),
    DataDictionary(
        columna="anio",
        tipo_dato="integer",
        descripcion="Año fiscal al que corresponde el indicador",
        ejemplo="2025",
        valores_permitidos=["2025", "2026"]
    ),
    DataDictionary(
        columna="fuente",
        tipo_dato="string",
        descripcion="Archivo y ubicación de origen del dato (hoja, celda o sección)",
        ejemplo="POA_2025.xlsx - Hoja: Indicadores - Fila 15"
    ),
    DataDictionary(
        columna="definicion",
        tipo_dato="string",
        descripcion="Definición conceptual del indicador según documentación institucional",
        ejemplo="Mide el porcentaje de empresas inspeccionadas respecto al universo total..."
    ),
    DataDictionary(
        columna="metodo_calculo",
        tipo_dato="string",
        descripcion="Fórmula o método utilizado para calcular el indicador",
        ejemplo="(Empresas inspeccionadas / Total empresas reguladas) x 100"
    ),
    DataDictionary(
        columna="unidad_medida",
        tipo_dato="string",
        descripcion="Unidad en la que se expresa el valor del indicador",
        ejemplo="Porcentaje",
        valores_permitidos=["Porcentaje", "Número", "Índice", "Otro"]
    ),
    DataDictionary(
        columna="nivel",
        tipo_dato="string",
        descripcion="Nivel del indicador en la Matriz de Indicadores para Resultados (MIR)",
        ejemplo="Componente",
        valores_permitidos=["Fin", "Propósito", "Componente", "Actividad"]
    ),
    DataDictionary(
        columna="periodo",
        tipo_dato="string",
        descripcion="Periodo de la observación en formato estandarizado",
        ejemplo="2025-01",
        valores_permitidos=["YYYY", "YYYY-MM", "YYYY-Q1", "YYYY-Q2", "YYYY-Q3", "YYYY-Q4"]
    ),
    DataDictionary(
        columna="valor",
        tipo_dato="number",
        descripcion="Valor observado/alcanzado del indicador en el periodo",
        ejemplo="85.5"
    ),
    DataDictionary(
        columna="meta",
        tipo_dato="number",
        descripcion="Meta programada para el indicador en el periodo",
        ejemplo="90.0"
    ),
    DataDictionary(
        columna="avance_porcentual",
        tipo_dato="number",
        descripcion="Porcentaje de avance respecto a la meta (valor/meta * 100)",
        ejemplo="95.0"
    ),
    DataDictionary(
        columna="ultima_actualizacion",
        tipo_dato="date",
        descripcion="Fecha en que se extrajo/actualizó el dato desde la fuente",
        ejemplo="2025-01-15"
    ),
]
