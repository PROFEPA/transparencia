"""
Script principal de ETL para Tablero de Indicadores PROFEPA.
Orquesta la extracción, transformación y carga de datos.
"""
import sys
import os
from pathlib import Path
import json
import csv
import shutil
from datetime import datetime
from typing import List, Dict, Any
import logging

# Agregar path del proyecto
sys.path.insert(0, str(Path(__file__).parent))

from config import SOURCE_FILES, DATA_OUTPUT_DIR, EXTRACTION_CONFIG
from models import Indicator, Observation, DataQualityReport, STANDARD_DATA_DICTIONARY
from extractors.excel_extractor import MIRFiMEExtractor, POAExtractor, MIR25Extractor
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
        # Also copy to app/public/data for the frontend
        self.app_data_dir = Path(__file__).parent.parent / "app" / "public" / "data"
    
    def run(self):
        """Ejecuta el pipeline completo."""
        logger.info("=" * 60)
        logger.info("Iniciando ETL para Tablero de Indicadores PROFEPA")
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
        
        # 7. Sincronizar con app/public/data
        self._sync_to_app()
        
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
                # Use explicit extractor type if configured, otherwise auto-detect
                extractor_type = config.get("extractor", "auto")
                if extractor_type == "poa":
                    extractor = POAExtractor(file_path, config)
                elif extractor_type == "mir25":
                    extractor = MIR25Extractor(file_path, config)
                elif extractor_type == "mir":
                    extractor = MIRFiMEExtractor(file_path, config)
                else:
                    # Auto-detect by filename
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
        """Elimina indicadores duplicados manteniendo el más completo.
        
        Dos indicadores se consideran duplicados si tienen el mismo año
        y un nombre normalizado similar (>85% del texto coincide).
        Cuando se fusionan, se redirigen las observaciones del duplicado
        al indicador maestro.
        """
        logger.info("\nDeduplicando indicadores...")
        original_count = len(self.all_indicators)

        # Paso 1: agrupar por (nombre_normalizado, año)
        import re as _re
        from slugify import slugify

        def _norm_name(name: str) -> str:
            """Normaliza agresivamente el nombre para matching."""
            s = name.lower().strip()
            # Colapsar espacios múltiples
            s = _re.sub(r'\s+', ' ', s)
            # Quitar puntuación final
            s = s.rstrip('.,:;')
            # Quitar palabras de relleno que varían entre fuentes
            s = s.replace(' de ', ' ').replace(' del ', ' ').replace(' las ', ' ').replace(' los ', ' ').replace(' la ', ' ')
            s = _re.sub(r'\s+', ' ', s).strip()
            # Slug con max 50 chars para ignorar diferencias en cola
            return slugify(s[:50], lowercase=True)

        def _is_garbage(ind: Indicator) -> bool:
            """Detecta indicadores basura extraídos de docx."""
            n = ind.nombre.strip().lower()
            # Fórmulas o fragmentos de texto que no son indicadores
            if n.startswith(('i1 ', 'mide ', 'nombre del indicador')):
                return True
            # Muy corto y sin 'porcentaje'/'número'/'acciones'
            if len(n) < 20 and not any(kw in n for kw in ('porcentaje', 'número', 'acciones')):
                return True
            return False

        # Filtrar basura
        clean_indicators = []
        garbage_count = 0
        for ind in self.all_indicators:
            if _is_garbage(ind):
                garbage_count += 1
                logger.info(f"  Descartado (basura): {ind.nombre[:60]}")
            else:
                clean_indicators.append(ind)
        self.all_indicators = clean_indicators

        groups: Dict[str, List[Indicator]] = {}
        # Equivalencias conocidas: indicadores que son iguales pero con nombre
        # ligeramente distinto entre fuentes oficiales
        _KNOWN_EQUIV = {
            "porcentaje-personas-contactadas-en-jornadas-ambien": "porcentaje-personas-contactadas-en-jornadas-bienes",
            "porcentaje-anp-con-acciones-inspeccion-operativos": "porcentaje-areas-naturales-protegidas-con-acciones",
            "acciones-difusion-para-promocion-y-participacion-c": "porcentaje-acciones-difusion-para-promocion-y-part",
            "porcentaje-municipios-y-alcaldias-cubiertos-con-ac": "porcentaje-municipios-y-alcaldias-con-acciones-ins",
        }
        for ind in self.all_indicators:
            norm = _norm_name(ind.nombre)
            norm = _KNOWN_EQUIV.get(norm, norm)
            key = f"{norm}|{ind.anio}"
            groups.setdefault(key, []).append(ind)

        # Paso 2: elegir el maestro de cada grupo y redirigir observaciones
        unique_indicators: Dict[str, Indicator] = {}
        id_redirect: Dict[str, str] = {}  # old_id -> master_id

        # Prioridad de fuente: MIR/FiME > docx > POA
        def _source_priority(ind: Indicator) -> int:
            f = ind.fuente.lower()
            if "mir" in f or "fime" in f:
                return 3
            if ".docx" in f:
                return 2
            return 1

        for key, group in groups.items():
            # Ordenar: mayor prioridad de fuente, luego mayor completitud
            group.sort(key=lambda i: (_source_priority(i), self._indicator_completeness(i)), reverse=True)
            master = group[0]

            # Enriquecer maestro con campos faltantes de los demás
            for other in group[1:]:
                if not master.definicion and other.definicion:
                    master.definicion = other.definicion
                if not master.metodo_calculo and other.metodo_calculo:
                    master.metodo_calculo = other.metodo_calculo
                if not master.unidad_medida and other.unidad_medida:
                    master.unidad_medida = other.unidad_medida
                if not master.nivel and other.nivel:
                    master.nivel = other.nivel
                # Registrar redirección
                if other.id != master.id:
                    id_redirect[other.id] = master.id

            unique_indicators[master.id] = master

        # Paso 3: redirigir observaciones
        if id_redirect:
            redirected = 0
            for obs in self.all_observations:
                if obs.indicator_id in id_redirect:
                    obs.indicator_id = id_redirect[obs.indicator_id]
                    redirected += 1
            logger.info(f"  Observaciones redirigidas: {redirected}")

        self.all_indicators = list(unique_indicators.values())
        logger.info(f"  Indicadores originales: {original_count}")
        logger.info(f"  Indicadores únicos: {len(self.all_indicators)}")
        logger.info(f"  Duplicados fusionados: {original_count - len(self.all_indicators)}")
    
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
            "descripcion": "Diccionario de datos del Tablero de Indicadores PROFEPA",
            "columnas": [entry.to_dict() for entry in STANDARD_DATA_DICTIONARY]
        }
        
        self._write_json("data_dictionary.json", dictionary)

    def _sync_to_app(self):
        """Copia todos los archivos JSON/CSV generados a app/public/data."""
        if not self.app_data_dir.exists():
            logger.info(f"  app/public/data no existe, omitiendo sincronización")
            return
        
        count = 0
        for src_file in self.output_dir.glob("*"):
            if src_file.suffix in (".json", ".csv"):
                dst = self.app_data_dir / src_file.name
                shutil.copy2(src_file, dst)
                count += 1
        
        logger.info(f"  Sincronizados {count} archivos a {self.app_data_dir}")


def main():
    """Punto de entrada principal."""
    pipeline = ETLPipeline()
    pipeline.run()


if __name__ == "__main__":
    main()
