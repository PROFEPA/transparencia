"""
Extractores de datos para Dashboard de Transparencia PROFEPA.
"""
from .excel_extractor import ExcelExtractor, extract_from_excel
from .docx_extractor import DocxExtractor, extract_from_docx

__all__ = [
    "ExcelExtractor",
    "DocxExtractor", 
    "extract_from_excel",
    "extract_from_docx"
]
