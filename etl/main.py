"""
Script principal de ETL para Dashboard de Transparencia PROFEPA.
Orquesta la extracción, transformación y carga de datos.
"""
import sys
import os
from pathlib import Path
import json
import csv
from datetime import datetime
from typing import List, Dict, Any
import logging

# Agregar path del proyecto
sys.path.insert(0, str(Path(__file__).parent))

from config import SOURCE_FILES, DATA_OUTPUT_DIR, EXTRACTION_CONFIG
from models import Indicator, Observation, DataQualityReport, STANDARD_DATA_DICTIONARY
from extractors.excel_extractor import MIRFiMEExtractor, POAExtractor
from extractors.docx_extractor import extract_from_docx

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ETLPipeline:
    """Pipeline de ETL para procesar todas las fuentes de datos."""
    
    def __init__(self):
        self.all_indicators: List[Indicator] = []
        self.all_observations: List[Observation] = []
        self.all_reports: List[DataQualityReport] = []
        self.narrative_content: Dict[str, str] = {}
        self.output_dir = DATA_OUTPUT_DIR
    
    def run(self):
        """Ejecuta el pipeline completo."""
        logger.info("=" * 60)
        logger.info("Iniciando ETL para Dashboard de Transparencia PROFEPA")
        logger.info("=" * 60)
        
        # 1. Crear directorio de salida
        self._ensure_output_dir()
        
        # 2. Procesar cada fuente
        for source_name, config in SOURCE_FILES.items():
            self._process_source(source_name, config)
        
        # 3. Deduplicar y normalizar
        self._deduplicate_indicators()
        
        # 4. Generar archivos de salida
        self._generate_outputs()
        
        # 5. Generar reporte de calidad consolidado
        self._generate_quality_report()
        
        # 6. Generar diccionario de datos
        self._generate_data_dictionary()
        
        logger.info("=" * 60)
        logger.info("ETL completado exitosamente")
        logger.info(f"Total indicadores: {len(self.all_indicators)}")
        logger.info(f"Total observaciones: {len(self.all_observations)}")
        logger.info(f"Archivos generados en: {self.output_dir}")
        logger.info("=" * 60)
    
    def _ensure_output_dir(self):
        """Crea el directorio de salida si no existe."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Directorio de salida: {self.output_dir}")
    
    def _process_source(self, source_name: str, config: dict):
        """Procesa una fuente de datos."""
        file_path = config["path"]
        file_type = config["type"]
        
        logger.info(f"\nProcesando: {source_name}")
        logger.info(f"  Archivo: {file_path}")
        logger.info(f"  Tipo: {file_type}")
        
        if not file_path.exists():
            logger.warning(f"  Archivo no encontrado: {file_path}")
            return
        
        try:
            if file_type == "excel":
                # Determinar qué extractor usar basado en el nombre del archivo
                filename = file_path.name.upper()
                if "POA" in filename:
                    extractor = POAExtractor(file_path, config)
                else:
                    extractor = MIRFiMEExtractor(file_path, config)
                
                indicators, observations, report = extractor.extract()
                self.all_indicators.extend(indicators)
                self.all_observations.extend(observations)
                self.all_reports.append(report)
                logger.info(f"  Indicadores extraídos: {len(indicators)}")
                logger.info(f"  Observaciones extraídas: {len(observations)}")
                
            elif file_type == "docx":
                indicators, narrative, report = extract_from_docx(file_path, config)
                self.all_indicators.extend(indicators)
                self.narrative_content.update(narrative)
                self.all_reports.append(report)
                logger.info(f"  Indicadores extraídos: {len(indicators)}")
            
        except Exception as e:
            logger.error(f"  Error: {str(e)}")
    
    def _deduplicate_indicators(self):
        """Elimina indicadores duplicados manteniendo el más completo."""
        logger.info("\nDeduplicando indicadores...")
        
        unique_indicators: Dict[str, Indicator] = {}
        
        for ind in self.all_indicators:
            if ind.id not in unique_indicators:
                unique_indicators[ind.id] = ind
            else:
                # Mantener el más completo
                existing = unique_indicators[ind.id]
                if self._indicator_completeness(ind) > self._indicator_completeness(existing):
                    unique_indicators[ind.id] = ind
        
        original_count = len(self.all_indicators)
        self.all_indicators = list(unique_indicators.values())
        logger.info(f"  Indicadores originales: {original_count}")
        logger.info(f"  Indicadores únicos: {len(self.all_indicators)}")
    
    def _indicator_completeness(self, ind: Indicator) -> int:
        """Calcula un score de completitud del indicador."""
        score = 0
        if ind.definicion:
            score += 2
        if ind.metodo_calculo:
            score += 2
        if ind.unidad_medida:
            score += 1
        if ind.nivel:
            score += 1
        if ind.notas:
            score += 1
        return score
    
    def _generate_outputs(self):
        """Genera todos los archivos de salida."""
        logger.info("\nGenerando archivos de salida...")
        
        # 1. Indicadores JSON
        self._write_json(
            "indicators.json",
            [ind.to_dict() for ind in self.all_indicators]
        )
        
        # 2. Observaciones JSON
        self._write_json(
            "observations.json",
            [obs.to_dict() for obs in self.all_observations]
        )
        
        # 3. Indicadores CSV
        self._write_csv(
            "indicators.csv",
            [ind.to_dict() for ind in self.all_indicators]
        )
        
        # 4. Observaciones CSV
        self._write_csv(
            "observations.csv",
            [obs.to_dict() for obs in self.all_observations]
        )
        
        # 5. Contenido narrativo
        self._write_json("narrative_content.json", self.narrative_content)
        
        # 6. Metadatos
        self._generate_metadata()
        
        # 7. Indicadores por año
        self._generate_by_year()
    
    def _write_json(self, filename: str, data: Any):
        """Escribe datos a archivo JSON."""
        filepath = self.output_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"  Generado: {filename}")
    
    def _write_csv(self, filename: str, data: List[dict]):
        """Escribe datos a archivo CSV."""
        if not data:
            return
        
        filepath = self.output_dir / filename
        fieldnames = list(data[0].keys())
        
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        
        logger.info(f"  Generado: {filename}")
    
    def _generate_metadata(self):
        """Genera archivo de metadatos."""
        metadata = {
            "version": EXTRACTION_CONFIG["version"],
            "fecha_extraccion": datetime.now().isoformat(),
            "total_indicadores": len(self.all_indicators),
            "total_observaciones": len(self.all_observations),
            "programas": list(set(ind.programa for ind in self.all_indicators)),
            "anios": list(set(ind.anio for ind in self.all_indicators)),
            "fuentes_procesadas": [
                {
                    "nombre": name,
                    "archivo": str(config["path"].name),
                    "tipo": config["type"],
                    "programa": config.get("programa", ""),
                    "anio": config.get("anio", ""),
                    "descripcion": config.get("descripcion", "")
                }
                for name, config in SOURCE_FILES.items()
                if config["path"].exists()
            ]
        }
        self._write_json("metadata.json", metadata)
    
    def _generate_by_year(self):
        """Genera archivos separados por año."""
        # Indicadores 2025
        ind_2025 = [ind.to_dict() for ind in self.all_indicators if ind.anio == 2025]
        if ind_2025:
            self._write_json("indicators_2025.json", ind_2025)
            self._write_csv("indicators_2025.csv", ind_2025)
        
        # Indicadores 2026
        ind_2026 = [ind.to_dict() for ind in self.all_indicators if ind.anio == 2026]
        if ind_2026:
            self._write_json("indicators_2026.json", ind_2026)
            self._write_csv("indicators_2026.csv", ind_2026)
        
        # Observaciones por indicador
        obs_by_indicator: Dict[str, List[dict]] = {}
        for obs in self.all_observations:
            if obs.indicator_id not in obs_by_indicator:
                obs_by_indicator[obs.indicator_id] = []
            obs_by_indicator[obs.indicator_id].append(obs.to_dict())
        
        self._write_json("observations_by_indicator.json", obs_by_indicator)
    
    def _generate_quality_report(self):
        """Genera el reporte consolidado de calidad de datos."""
        logger.info("\nGenerando reporte de calidad...")
        
        total_leidas = sum(r.filas_leidas for r in self.all_reports)
        total_validas = sum(r.filas_validas for r in self.all_reports)
        total_descartadas = sum(r.filas_descartadas for r in self.all_reports)
        
        report = {
            "fecha_generacion": datetime.now().isoformat(),
            "resumen": {
                "total_filas_leidas": total_leidas,
                "total_filas_validas": total_validas,
                "total_filas_descartadas": total_descartadas,
                "porcentaje_validas": round(total_validas / max(total_leidas, 1) * 100, 2),
                "total_indicadores": len(self.all_indicators),
                "total_observaciones": len(self.all_observations)
            },
            "completitud_indicadores": self._calculate_completeness(),
            "por_archivo": [r.to_dict() for r in self.all_reports],
            "todos_errores": [err for r in self.all_reports for err in r.errores],
            "todas_advertencias": [warn for r in self.all_reports for warn in r.advertencias]
        }
        
        self._write_json("data_quality_report.json", report)
    
    def _calculate_completeness(self) -> dict:
        """Calcula estadísticas de completitud por campo."""
        if not self.all_indicators:
            return {}
        
        total = len(self.all_indicators)
        
        return {
            "con_definicion": round(sum(1 for i in self.all_indicators if i.definicion) / total * 100, 2),
            "con_metodo_calculo": round(sum(1 for i in self.all_indicators if i.metodo_calculo) / total * 100, 2),
            "con_unidad_medida": round(sum(1 for i in self.all_indicators if i.unidad_medida) / total * 100, 2),
            "con_nivel": round(sum(1 for i in self.all_indicators if i.nivel) / total * 100, 2),
            "con_observaciones": round(
                len(set(o.indicator_id for o in self.all_observations)) / total * 100, 2
            )
        }
    
    def _generate_data_dictionary(self):
        """Genera el diccionario de datos."""
        logger.info("\nGenerando diccionario de datos...")
        
        dictionary = {
            "version": EXTRACTION_CONFIG["version"],
            "fecha_generacion": datetime.now().isoformat(),
            "descripcion": "Diccionario de datos del Dashboard de Transparencia PROFEPA",
            "columnas": [entry.to_dict() for entry in STANDARD_DATA_DICTIONARY]
        }
        
        self._write_json("data_dictionary.json", dictionary)


def main():
    """Punto de entrada principal."""
    pipeline = ETLPipeline()
    pipeline.run()


if __name__ == "__main__":
    main()
