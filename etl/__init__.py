"""
ETL Module para Tablero de Indicadores PROFEPA.
"""
from .main import ETLPipeline, main
from .config import SOURCE_FILES, DATA_OUTPUT_DIR
from .models import Indicator, Observation, DataQualityReport

__all__ = [
    "ETLPipeline",
    "main",
    "SOURCE_FILES",
    "DATA_OUTPUT_DIR",
    "Indicator",
    "Observation",
    "DataQualityReport"
]
