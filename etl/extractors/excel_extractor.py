"""
Extractor de datos para archivos Excel.
Procesa POA, MIR y FiME para obtener indicadores y series.
VERSIÓN MEJORADA: Lee columnas específicas con datos reales.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional, Any
from datetime import datetime
import re
import logging
from slugify import slugify

from models import Indicator, Observation, DataQualityReport
from config import COLUMN_MAPPINGS, NIVELES_MIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MIRFiMEExtractor:
    """
    Extractor especializado para formato MIR/FiME de SHCP.
    Lee columnas específicas con valores reales:
    - Col 1: Nivel (Fin/Propósito/Componente/Actividad)
    - Col 2: Objetivos
    - Col 8: Denominación (nombre del indicador)
    - Col 11: Método de cálculo
    - Col 15: Unidad de medida
    - Col 18: Meta anual Modificada
    - Col 19: Realizado al periodo (VALOR REAL)
    - Col 20: Avance % anual
    """
    
    def __init__(self, file_path: Path, source_config: dict):
        self.file_path = file_path
        self.config = source_config
        self.indicators: List[Indicator] = []
        self.observations: List[Observation] = []
        self.quality_report = DataQualityReport(
            archivo_fuente=str(file_path),
            fecha_extraccion=datetime.now().isoformat()
        )
    
    def extract(self) -> Tuple[List[Indicator], List[Observation], DataQualityReport]:
        """Extrae datos del formato MIR/FiME."""
        try:
            xl = pd.ExcelFile(self.file_path)
            for sheet_name in xl.sheet_names:
                if 'G0' in sheet_name or 'Indicador' in sheet_name.lower():
                    self._process_mir_sheet(xl, sheet_name)
        except Exception as e:
            logger.error(f"Error procesando {self.file_path}: {e}")
            self.quality_report.add_error(str(e))
        
        return self.indicators, self.observations, self.quality_report
    
    def _process_mir_sheet(self, xl: pd.ExcelFile, sheet_name: str):
        """Procesa hoja MIR/FiME leyendo columnas específicas."""
        df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
        
        logger.info(f"Procesando hoja {sheet_name} con {len(df)} filas")
        
        # Variables para tracking de nivel
        current_nivel = None
        current_objetivo = None
        
        # Procesar cada fila desde la 10 (donde empiezan los datos)
        for idx in range(2, len(df)):
            row = df.iloc[idx]
            
            # Detectar nivel MIR (columna 1)
            nivel_val = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
            if nivel_val in NIVELES_MIR:
                current_nivel = nivel_val
                # Objetivo está en columna 2
                if pd.notna(row.iloc[2]):
                    current_objetivo = str(row.iloc[2]).strip()[:500]
            
            # Leer denominación del indicador (columna 8)
            denominacion = ""
            if pd.notna(row.iloc[8]):
                denominacion = str(row.iloc[8]).strip()
            
            # Saltar si no hay denominación válida
            if len(denominacion) < 20:
                continue
            
            # Verificar que no sea encabezado
            if "Denominación" in denominacion or "denominación" in denominacion.lower():
                continue
            
            # Leer método de cálculo (columna 11)
            metodo = None
            if pd.notna(row.iloc[11]):
                metodo = str(row.iloc[11]).strip()[:1000]
            
            # Leer unidad de medida (columna 15)
            unidad = None
            if pd.notna(row.iloc[15]):
                unidad = str(row.iloc[15]).strip()
            
            # Leer valores numéricos reales
            meta = self._parse_numeric(row.iloc[18])      # Meta anual Modificada
            realizado = self._parse_numeric(row.iloc[19]) # Realizado al periodo
            avance = self._parse_numeric(row.iloc[20])    # Avance %
            
            # Generar ID único
            indicator_id = self._generate_id(denominacion)
            
            # Verificar si ya existe
            if indicator_id in [i.id for i in self.indicators]:
                continue
            
            # Crear indicador
            indicator = Indicator(
                id=indicator_id,
                nombre=denominacion[:200],
                programa=self.config.get("programa", ""),
                anio=self.config.get("anio", 2025),
                fuente=f"{self.file_path.name} - {sheet_name}",
                definicion=current_objetivo,
                metodo_calculo=metodo,
                unidad_medida=unidad,
                nivel=current_nivel,
                notas=None,
                ultima_actualizacion=datetime.now().strftime("%Y-%m-%d")
            )
            self.indicators.append(indicator)
            self.quality_report.filas_validas += 1
            
            logger.info(f"  Indicador: {denominacion[:50]}... Meta={meta}, Realizado={realizado}")
            
            # Crear observación con valores reales
            if meta is not None or realizado is not None:
                # Si no tenemos avance calculado, calcularlo
                if avance is None and meta and realizado:
                    avance = round((realizado / meta) * 100, 2) if meta > 0 else None
                
                obs = Observation(
                    indicator_id=indicator_id,
                    periodo=f"{self.config.get('anio', 2025)}",
                    valor=realizado,
                    meta=meta,
                    avance_porcentual=avance,
                    entidad="Nacional",
                    fuente_detalle=f"{self.file_path.name}"
                )
                self.observations.append(obs)
    
    def _generate_id(self, nombre: str) -> str:
        prog = self.config.get("programa", "").lower()
        anio = self.config.get("anio", 2025)
        base = slugify(nombre[:60], lowercase=True, separator="-")
        return f"{base}-{prog}-{anio}"
    
    def _is_numeric(self, val) -> bool:
        if isinstance(val, (int, float)):
            return not pd.isna(val)
        try:
            float(str(val).replace(",", "").replace("%", ""))
            return True
        except:
            return False
    
    def _parse_numeric(self, val) -> Optional[float]:
        if pd.isna(val):
            return None
        if isinstance(val, (int, float)):
            return float(val)
        try:
            return float(str(val).replace(",", "").replace("%", "").strip())
        except:
            return None
    
    def _calc_avance(self, valor, meta) -> Optional[float]:
        if valor is None or meta is None or meta == 0:
            return None
        return round((valor / meta) * 100, 2)


class POAExtractor:
    """
    Extractor especializado para formato POA con datos mensuales por estado.
    VERSIÓN MEJORADA: Lee columnas Programada/Alcanzada numeradas y agrega totales nacionales.
    
    Columnas:
    - ID, Denominación, Unidad de medida, Oficina de Representación
    - Programada (enero), Alcanzada (enero)
    - Programada.1 (febrero), Alcanzada.1 (febrero)
    - ... hasta Programada.11 / Alcanzada.11 (diciembre)
    """
    
    MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    
    def __init__(self, file_path: Path, source_config: dict):
        self.file_path = file_path
        self.config = source_config
        self.indicators: List[Indicator] = []
        self.observations: List[Observation] = []
        self.quality_report = DataQualityReport(
            archivo_fuente=str(file_path),
            fecha_extraccion=datetime.now().isoformat()
        )
    
    def extract(self) -> Tuple[List[Indicator], List[Observation], DataQualityReport]:
        """Extrae datos del formato POA."""
        try:
            xl = pd.ExcelFile(self.file_path)
            for sheet_name in xl.sheet_names:
                if 'Avance' in sheet_name:
                    self._process_poa_sheet(xl, sheet_name)
        except Exception as e:
            logger.error(f"Error procesando POA {self.file_path}: {e}")
            self.quality_report.add_error(str(e))
        
        return self.indicators, self.observations, self.quality_report
    
    def _process_poa_sheet(self, xl: pd.ExcelFile, sheet_name: str):
        """Procesa hoja POA con datos mensuales, agregando valores por estado."""
        # Leer con encabezado en fila 1
        df = pd.read_excel(xl, sheet_name=sheet_name, header=1)
        
        if 'ID' not in df.columns and 'Denominación' not in df.columns:
            logger.warning(f"Formato POA no reconocido en {sheet_name}")
            return
        
        logger.info(f"Procesando POA hoja {sheet_name} con {len(df)} filas")
        
        # Agrupar por indicador (ID + Denominación)
        id_col = 'ID' if 'ID' in df.columns else df.columns[0]
        denom_col = 'Denominación' if 'Denominación' in df.columns else df.columns[1]
        unidad_col = 'Unidad de medida' if 'Unidad de medida' in df.columns else None
        
        # Obtener indicadores únicos
        indicadores_unicos = df[[id_col, denom_col]].drop_duplicates().dropna(subset=[id_col])
        
        for _, row in indicadores_unicos.iterrows():
            ind_id = str(row[id_col]).strip()
            ind_nombre = str(row[denom_col]).strip()
            
            if pd.isna(ind_id) or ind_id == 'nan' or ind_id == '':
                continue
            
            full_id = self._generate_id(ind_id, ind_nombre)
            unidad = None
            if unidad_col:
                unidad_rows = df[df[id_col] == row[id_col]][unidad_col]
                if len(unidad_rows) > 0:
                    unidad = str(unidad_rows.iloc[0])
            
            indicator = Indicator(
                id=full_id,
                nombre=ind_nombre,
                programa=self.config.get("programa", "G005"),
                anio=self.config.get("anio", 2025),
                fuente=f"{self.file_path.name} - {sheet_name}",
                definicion=None,
                metodo_calculo=None,
                unidad_medida=unidad,
                nivel="Actividad",
                notas=f"ID interno: {ind_id}",
                ultima_actualizacion=datetime.now().strftime("%Y-%m-%d")
            )
            self.indicators.append(indicator)
            self.quality_report.filas_validas += 1
            
            # Filtrar filas del indicador
            ind_data = df[df[id_col] == row[id_col]]
            
            # Agregar observaciones NACIONALES (sumando todos los estados) por mes
            anio = self.config.get("anio", 2025)
            total_prog_anual = 0.0
            total_alc_anual = 0.0
            
            for i, mes in enumerate(self.MESES):
                # Nombres de columna: Programada, Programada.1, Programada.2, etc.
                prog_col = 'Programada' if i == 0 else f'Programada.{i}'
                alc_col = 'Alcanzada' if i == 0 else f'Alcanzada.{i}'
                
                if prog_col not in df.columns or alc_col not in df.columns:
                    continue
                
                # Sumar valores de todos los estados, con manejo de errores
                try:
                    prog_nacional = pd.to_numeric(ind_data[prog_col], errors='coerce').fillna(0).sum()
                    alc_nacional = pd.to_numeric(ind_data[alc_col], errors='coerce').fillna(0).sum()
                except Exception:
                    continue
                
                total_prog_anual += float(prog_nacional)
                total_alc_anual += float(alc_nacional)
                
                # Solo crear observación si hay valores
                if prog_nacional > 0 or alc_nacional > 0:
                    avance = round((alc_nacional / prog_nacional) * 100, 2) if prog_nacional > 0 else None
                    
                    obs = Observation(
                        indicator_id=full_id,
                        periodo=f"{anio}-{i+1:02d}",
                        valor=float(alc_nacional),
                        meta=float(prog_nacional),
                        avance_porcentual=avance,
                        entidad="Nacional",
                        fuente_detalle=f"POA {sheet_name} - {mes.capitalize()}"
                    )
                    self.observations.append(obs)
            
            # Agregar observación anual acumulada
            if total_prog_anual > 0 or total_alc_anual > 0:
                avance_anual = round((total_alc_anual / total_prog_anual) * 100, 2) if total_prog_anual > 0 else None
                obs_anual = Observation(
                    indicator_id=full_id,
                    periodo=f"{anio}",
                    valor=total_alc_anual,
                    meta=total_prog_anual,
                    avance_porcentual=avance_anual,
                    entidad="Nacional",
                    fuente_detalle=f"POA {sheet_name} - Acumulado anual"
                )
                self.observations.append(obs_anual)
                
                logger.info(f"  {ind_id}: Prog={total_prog_anual:.0f}, Alc={total_alc_anual:.0f}, Avance={avance_anual}%")
    
    def _generate_id(self, code: str, nombre: str) -> str:
        prog = self.config.get("programa", "").lower()
        anio = self.config.get("anio", 2025)
        base = slugify(f"{code}-{nombre[:40]}", lowercase=True, separator="-")
        return f"{base}-{prog}-{anio}"
    
    def _parse_numeric(self, val) -> Optional[float]:
        if pd.isna(val):
            return None
        if isinstance(val, (int, float)):
            return float(val)
        try:
            return float(str(val).replace(",", "").replace("%", "").strip())
        except:
            return None


class ExcelExtractor:
    """Extrae datos de archivos Excel del POA/MIR/FiME."""
    
    def __init__(self, file_path: Path, source_config: dict):
        self.file_path = file_path
        self.config = source_config
        self.quality_report = DataQualityReport(
            archivo_fuente=str(file_path),
            fecha_extraccion=datetime.now().isoformat()
        )
        self.indicators: List[Indicator] = []
        self.observations: List[Observation] = []
    
    def extract(self) -> Tuple[List[Indicator], List[Observation], DataQualityReport]:
        """Extrae indicadores y observaciones del archivo Excel."""
        try:
            logger.info(f"Procesando archivo: {self.file_path}")
            
            # Leer todas las hojas del Excel
            xl = pd.ExcelFile(self.file_path)
            sheet_names = xl.sheet_names
            logger.info(f"Hojas encontradas: {sheet_names}")
            
            for sheet_name in sheet_names:
                self._process_sheet(xl, sheet_name)
            
            logger.info(f"Extracción completada: {len(self.indicators)} indicadores, {len(self.observations)} observaciones")
            
        except Exception as e:
            error_msg = f"Error procesando {self.file_path}: {str(e)}"
            logger.error(error_msg)
            self.quality_report.add_error(error_msg)
        
        return self.indicators, self.observations, self.quality_report
    
    def _process_sheet(self, xl: pd.ExcelFile, sheet_name: str):
        """Procesa una hoja del Excel."""
        try:
            # Intentar leer la hoja, detectando encabezados
            df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
            
            if df.empty:
                self.quality_report.add_warning(f"Hoja vacía: {sheet_name}")
                return
            
            # Detectar fila de encabezados
            header_row = self._detect_header_row(df)
            
            if header_row is not None:
                df = pd.read_excel(xl, sheet_name=sheet_name, header=header_row)
                df.columns = [self._normalize_column_name(str(c)) for c in df.columns]
            else:
                # Usar primera fila como encabezado
                df.columns = [f"columna_{i}" for i in range(len(df.columns))]
            
            self.quality_report.filas_leidas += len(df)
            
            # Extraer indicadores de esta hoja
            self._extract_indicators_from_df(df, sheet_name)
            
        except Exception as e:
            self.quality_report.add_warning(f"Error en hoja {sheet_name}: {str(e)}")
    
    def _detect_header_row(self, df: pd.DataFrame) -> Optional[int]:
        """Detecta la fila de encabezados basándose en patrones."""
        keywords = ["indicador", "nombre", "meta", "avance", "unidad", "periodo", 
                   "objetivo", "componente", "actividad", "descripcion", "definicion",
                   "resumen narrativo", "fin", "proposito", "propósito"]
        
        for i in range(min(10, len(df))):
            row_values = [str(v).lower() for v in df.iloc[i].values if pd.notna(v)]
            row_text = " ".join(row_values)
            
            matches = sum(1 for kw in keywords if kw in row_text)
            if matches >= 2:
                return i
        
        return 0
    
    def _normalize_column_name(self, name: str) -> str:
        """Normaliza el nombre de columna."""
        name = str(name).lower().strip()
        name = re.sub(r'\s+', '_', name)
        name = re.sub(r'[^\w_]', '', name)
        return name
    
    def _find_column(self, df: pd.DataFrame, field: str) -> Optional[str]:
        """Encuentra una columna que coincida con el mapeo del campo."""
        if field not in COLUMN_MAPPINGS:
            return None
        
        possible_names = COLUMN_MAPPINGS[field]
        df_cols = [c.lower() for c in df.columns]
        
        for name in possible_names:
            for col in df.columns:
                if name in col.lower():
                    return col
        
        return None
    
    def _extract_indicators_from_df(self, df: pd.DataFrame, sheet_name: str):
        """Extrae indicadores del DataFrame."""
        # Buscar columna de indicadores
        indicator_col = self._find_column(df, "indicador")
        
        if not indicator_col:
            # Intentar con primera columna que tenga texto
            for col in df.columns:
                if df[col].dtype == object and df[col].notna().sum() > 0:
                    indicator_col = col
                    break
        
        if not indicator_col:
            self.quality_report.add_warning(f"No se encontró columna de indicadores en {sheet_name}")
            return
        
        # Columnas adicionales
        meta_col = self._find_column(df, "meta")
        avance_col = self._find_column(df, "avance")
        unidad_col = self._find_column(df, "unidad_medida")
        definicion_col = self._find_column(df, "definicion")
        metodo_col = self._find_column(df, "metodo_calculo")
        nivel_col = self._find_column(df, "nivel")
        periodo_col = self._find_column(df, "periodo")
        
        # Procesar cada fila
        for idx, row in df.iterrows():
            try:
                nombre_indicador = row.get(indicator_col)
                
                if pd.isna(nombre_indicador) or str(nombre_indicador).strip() == "":
                    continue
                
                nombre_indicador = str(nombre_indicador).strip()
                
                # Omitir filas que parecen ser encabezados o totales
                skip_patterns = ["total", "subtotal", "suma", "unnamed", "nan"]
                if any(p in nombre_indicador.lower() for p in skip_patterns):
                    continue
                
                # Generar ID único
                indicator_id = self._generate_indicator_id(
                    nombre_indicador, 
                    self.config.get("programa", ""),
                    self.config.get("anio", 2025)
                )
                
                # Verificar si ya existe
                existing_ids = [ind.id for ind in self.indicators]
                if indicator_id in existing_ids:
                    # Agregar observación al indicador existente
                    self._add_observation(indicator_id, row, sheet_name, meta_col, avance_col, periodo_col)
                    continue
                
                # Crear indicador
                indicator = Indicator(
                    id=indicator_id,
                    nombre=nombre_indicador,
                    programa=self.config.get("programa", "No especificado"),
                    anio=self.config.get("anio", 2025),
                    fuente=f"{self.file_path.name} - Hoja: {sheet_name} - Fila: {idx + 2}",
                    definicion=self._safe_get(row, definicion_col),
                    metodo_calculo=self._safe_get(row, metodo_col),
                    unidad_medida=self._safe_get(row, unidad_col),
                    nivel=self._detect_nivel(row, nivel_col, nombre_indicador),
                    notas=None,
                    ultima_actualizacion=datetime.now().strftime("%Y-%m-%d")
                )
                
                self.indicators.append(indicator)
                self.quality_report.filas_validas += 1
                
                # Agregar observación si hay datos de meta/avance
                self._add_observation(indicator_id, row, sheet_name, meta_col, avance_col, periodo_col)
                
            except Exception as e:
                self.quality_report.add_warning(f"Error en fila {idx}: {str(e)}")
                self.quality_report.filas_descartadas += 1
    
    def _generate_indicator_id(self, nombre: str, programa: str, anio: int) -> str:
        """Genera un ID único y estable para el indicador."""
        base = slugify(nombre[:50], lowercase=True, separator="-")
        return f"{base}-{programa.lower()}-{anio}"
    
    def _safe_get(self, row: pd.Series, col: Optional[str]) -> Optional[str]:
        """Obtiene valor de columna de forma segura."""
        if col is None:
            return None
        
        val = row.get(col)
        if pd.isna(val):
            return None
        
        return str(val).strip()
    
    def _parse_numeric(self, value: Any) -> Optional[float]:
        """Parsea un valor numérico manejando diferentes formatos."""
        if pd.isna(value):
            return None
        
        if isinstance(value, (int, float)):
            return float(value)
        
        try:
            # Limpiar string
            val_str = str(value).strip()
            val_str = val_str.replace(",", "").replace("%", "").replace("$", "")
            val_str = val_str.replace(" ", "")
            
            if val_str == "" or val_str.lower() in ["na", "n/a", "nd", "n/d", "-"]:
                return None
            
            return float(val_str)
        except:
            return None
    
    def _detect_nivel(self, row: pd.Series, nivel_col: Optional[str], nombre: str) -> Optional[str]:
        """Detecta el nivel MIR del indicador."""
        if nivel_col:
            val = self._safe_get(row, nivel_col)
            if val:
                for nivel in NIVELES_MIR:
                    if nivel.lower() in val.lower():
                        return nivel
        
        # Intentar detectar por nombre
        nombre_lower = nombre.lower()
        if "fin" in nombre_lower[:10]:
            return "Fin"
        elif "propósito" in nombre_lower or "proposito" in nombre_lower:
            return "Propósito"
        elif "componente" in nombre_lower:
            return "Componente"
        elif "actividad" in nombre_lower:
            return "Actividad"
        
        return None
    
    def _add_observation(self, indicator_id: str, row: pd.Series, sheet_name: str,
                        meta_col: Optional[str], avance_col: Optional[str], 
                        periodo_col: Optional[str]):
        """Agrega una observación para el indicador."""
        meta = self._parse_numeric(row.get(meta_col) if meta_col else None)
        avance = self._parse_numeric(row.get(avance_col) if avance_col else None)
        
        # Determinar periodo
        if periodo_col:
            periodo = self._parse_periodo(row.get(periodo_col))
        else:
            periodo = str(self.config.get("anio", 2025))
        
        # Solo agregar si hay al menos un valor
        if meta is not None or avance is not None:
            observation = Observation(
                indicator_id=indicator_id,
                periodo=periodo,
                valor=avance,
                meta=meta,
                avance_porcentual=self._calculate_avance(avance, meta),
                fuente_detalle=f"{self.file_path.name} - {sheet_name}"
            )
            self.observations.append(observation)
    
    def _parse_periodo(self, value: Any) -> str:
        """Parsea un valor de periodo a formato estandarizado."""
        if pd.isna(value):
            return str(self.config.get("anio", 2025))
        
        val_str = str(value).strip()
        
        # Detectar formatos comunes
        # YYYY
        if re.match(r"^\d{4}$", val_str):
            return val_str
        
        # YYYY-MM
        if re.match(r"^\d{4}-\d{2}$", val_str):
            return val_str
        
        # Trimestres
        trimestre_match = re.search(r"[Tt](\d)", val_str)
        if trimestre_match:
            q = trimestre_match.group(1)
            year = re.search(r"\d{4}", val_str)
            if year:
                return f"{year.group(0)}-Q{q}"
        
        # Meses en español
        meses = {
            "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
            "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
            "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
        }
        
        for mes, num in meses.items():
            if mes in val_str.lower():
                year = re.search(r"\d{4}", val_str)
                if year:
                    return f"{year.group(0)}-{num}"
        
        return str(self.config.get("anio", 2025))
    
    def _calculate_avance(self, valor: Optional[float], meta: Optional[float]) -> Optional[float]:
        """Calcula el porcentaje de avance."""
        if valor is None or meta is None or meta == 0:
            return None
        
        return round((valor / meta) * 100, 2)


def extract_from_excel(file_path: Path, config: dict) -> Tuple[List[Indicator], List[Observation], DataQualityReport]:
    """Función de conveniencia para extraer de Excel."""
    extractor = ExcelExtractor(file_path, config)
    return extractor.extract()
