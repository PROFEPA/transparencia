"""
Extractor de datos para archivos Excel.
Procesa POA, MIR y FiME para obtener indicadores y series.

Formatos soportados:
- POA: Datos mensuales por estado (hoja "Avance")
- MIR: Matriz de Indicadores para Resultados (hoja "16 G005")
- FiME: Ficha de Monitoreo y Evaluación (hoja "16 G014")

Estructura MIR/FiME (por índice de columna, header=None):
  [1] = Nivel (Fin/Propósito/Componente/Actividad)
  [2] = Objetivos
  [8] = Denominación del indicador
  [11] = Método de cálculo
  [15] = Unidad de medida
  [16] = Tipo-Dimensión-Frecuencia
  [17] = Meta anual Aprobada
  [18] = Meta anual Modificada
  [19] = Realizado al periodo
  [20] = Avance % anual
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional
from datetime import datetime
import logging
from slugify import slugify

from models import Indicator, Observation, DataQualityReport
from config import NIVELES_MIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# MIR / FiME Extractor
# ---------------------------------------------------------------------------
class MIRFiMEExtractor:
    """
    Extractor para formato MIR/FiME de SHCP.
    Lee hojas cuyo nombre contiene 'G0' (ej. '16 G005', '16 G014').
    """

    # Columnas fijas del formato SHCP (por iloc)
    COL_NIVEL = 1
    COL_OBJETIVO = 2
    COL_DENOMINACION = 8
    COL_METODO = 11
    COL_UNIDAD = 15
    COL_FRECUENCIA = 16
    COL_META_APROBADA = 17
    COL_META_MODIFICADA = 18
    COL_REALIZADO = 19
    COL_AVANCE = 20

    # Fila mínima donde arrancan los datos reales (después de encabezados)
    FIRST_DATA_ROW = 10

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
        """Extrae datos de todas las hojas relevantes."""
        try:
            xl = pd.ExcelFile(self.file_path)
            for sheet_name in xl.sheet_names:
                if "G0" in sheet_name.upper():
                    self._process_sheet(xl, sheet_name)
        except Exception as e:
            logger.error(f"Error procesando {self.file_path}: {e}")
            self.quality_report.add_error(str(e))

        return self.indicators, self.observations, self.quality_report

    def _process_sheet(self, xl: pd.ExcelFile, sheet_name: str):
        """Procesa una hoja MIR/FiME leyendo columnas específicas."""
        df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
        logger.info(f"Procesando hoja '{sheet_name}' ({len(df)} filas, {df.shape[1]} cols)")

        if df.shape[1] <= self.COL_AVANCE:
            logger.warning(f"  Hoja '{sheet_name}' tiene pocas columnas ({df.shape[1]}), se omite")
            return

        current_nivel = None
        current_objetivo = None
        seen_ids: set = set()

        for idx in range(self.FIRST_DATA_ROW, len(df)):
            row = df.iloc[idx]

            # --- Detectar fin de datos ---
            nivel_val = self._cell_str(row, self.COL_NIVEL)
            if nivel_val == "PRESUPUESTO":
                break

            # --- Nivel MIR ---
            if nivel_val in NIVELES_MIR:
                current_nivel = nivel_val

            # --- Objetivo ---
            obj_val = self._cell_str(row, self.COL_OBJETIVO)
            if obj_val and len(obj_val) > 10:
                current_objetivo = obj_val[:500]

            # --- Denominación del indicador ---
            denominacion = self._cell_str(row, self.COL_DENOMINACION)
            if not denominacion or len(denominacion) < 15:
                continue
            if denominacion.lower().startswith("denominación"):
                continue

            # --- Campos descriptivos ---
            metodo = self._cell_str(row, self.COL_METODO, max_len=1000)
            unidad = self._cell_str(row, self.COL_UNIDAD)
            frecuencia = self._cell_str(row, self.COL_FRECUENCIA)

            # --- Valores numéricos ---
            meta_aprobada = self._parse_numeric(row.iloc[self.COL_META_APROBADA])
            meta_modificada = self._parse_numeric(row.iloc[self.COL_META_MODIFICADA])
            realizado = self._parse_numeric(row.iloc[self.COL_REALIZADO])
            avance = self._parse_numeric(row.iloc[self.COL_AVANCE])

            # Preferir meta modificada; si no hay, usar aprobada
            meta = meta_modificada if meta_modificada is not None else meta_aprobada

            # --- Generar ID ---
            indicator_id = self._generate_id(denominacion)
            if indicator_id in seen_ids:
                continue
            seen_ids.add(indicator_id)

            # --- Crear indicador ---
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
                notas=f"Frecuencia: {frecuencia}" if frecuencia else None,
                ultima_actualizacion=datetime.now().strftime("%Y-%m-%d")
            )
            self.indicators.append(indicator)
            self.quality_report.filas_validas += 1

            logger.info(f"  [{current_nivel}] {denominacion[:55]}... Meta={meta}, Real={realizado}")

            # --- Crear observación ---
            if meta is not None or realizado is not None:
                if avance is None and meta and realizado and meta > 0:
                    avance = round((realizado / meta) * 100, 2)
                # Normalizar avance si viene como ratio (< 10) en vez de %
                if avance is not None and avance < 10 and meta and realizado and meta > 0:
                    avance = round((realizado / meta) * 100, 2)

                obs = Observation(
                    indicator_id=indicator_id,
                    periodo=str(self.config.get("anio", 2025)),
                    valor=realizado,
                    meta=meta,
                    avance_porcentual=avance,
                    entidad="Nacional",
                    fuente_detalle=f"{self.file_path.name} - {sheet_name}"
                )
                self.observations.append(obs)

    # --- Helpers ---

    def _cell_str(self, row, col_idx: int, max_len: int = 500) -> str:
        """Lee una celda como string limpio o retorna cadena vacía."""
        try:
            val = row.iloc[col_idx]
        except IndexError:
            return ""
        if pd.isna(val):
            return ""
        text = str(val).strip().strip('"').strip()
        text = " ".join(text.split())
        return text[:max_len] if text else ""

    def _generate_id(self, nombre: str) -> str:
        prog = self.config.get("programa", "").lower()
        anio = self.config.get("anio", 2025)
        base = slugify(nombre[:60], lowercase=True, separator="-")
        return f"{base}-{prog}-{anio}"

    def _parse_numeric(self, val) -> Optional[float]:
        if pd.isna(val):
            return None
        if isinstance(val, (int, float)):
            return None if np.isnan(val) else float(val)
        try:
            cleaned = str(val).replace(",", "").replace("%", "").strip()
            if cleaned.upper() in ("", "N/A", "N/D", "-"):
                return None
            return float(cleaned)
        except (ValueError, TypeError):
            return None


# ---------------------------------------------------------------------------
# POA Extractor
# ---------------------------------------------------------------------------
class POAExtractor:
    """
    Extractor para formato POA con datos mensuales por estado.

    Encabezados esperados (fila 2, header index 1):
      ID | Denominación | Unidad de medida | Oficina de Representación
      Programada | Alcanzada | Programada.1 | Alcanzada.1 | ... (x12 meses)
    """

    MESES = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]

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
        try:
            xl = pd.ExcelFile(self.file_path)
            processed = False
            for sheet_name in xl.sheet_names:
                if "Avance" in sheet_name or "POA" in sheet_name.upper():
                    self._process_poa_sheet(xl, sheet_name)
                    processed = True
                    break  # solo procesar la primera hoja POA/Avance
            if not processed:
                logger.warning(f"POA: No se encontró hoja Avance/POA en {self.file_path}")
        except Exception as e:
            logger.error(f"Error procesando POA {self.file_path}: {e}")
            self.quality_report.add_error(str(e))

        return self.indicators, self.observations, self.quality_report

    def _process_poa_sheet(self, xl: pd.ExcelFile, sheet_name: str):
        """Procesa hoja POA con datos mensuales, generando observaciones
        nacionales (suma de todos los estados) y por cada estado individual."""
        df = pd.read_excel(xl, sheet_name=sheet_name, header=1)

        id_col = self._find_col(df, ["ID", "id"])
        denom_col = self._find_col(df, ["Denominación", "Denominacion", "denominación"])
        unidad_col = self._find_col(df, ["Unidad de medida", "Unidad"])
        state_col = self._find_col(df, [
            "Oficina de Representación", "Oficina de Representacion",
            "Oficina Responsable",
            "Entidad", "Estado",
        ])

        if id_col is None or denom_col is None:
            logger.warning(f"POA '{sheet_name}': columnas ID/Denominación no encontradas. "
                           f"Cols: {list(df.columns[:6])}")
            return

        logger.info(f"Procesando POA hoja '{sheet_name}' ({len(df)} filas)")
        if state_col:
            logger.info(f"  Columna de estado detectada: '{state_col}' "
                         f"({df[state_col].nunique()} entidades)")

        prog_alc_pairs = self._detect_month_columns(df)
        logger.info(f"  Meses detectados: {len(prog_alc_pairs)}")

        indicadores_unicos = df[[id_col, denom_col]].drop_duplicates().dropna(subset=[id_col])

        # Consolidar indicadores con mismo ID pero nombres ligeramente distintos
        # (ej. CORPA.01 con typo "Procentaje" vs "Porcentaje")
        id_to_name = {}
        for _, urow in indicadores_unicos.iterrows():
            ind_code = str(urow[id_col]).strip()
            ind_nombre = str(urow[denom_col]).strip()
            if not ind_code or ind_code == "nan":
                continue
            if ind_code not in id_to_name:
                id_to_name[ind_code] = ind_nombre
            else:
                # Preferir el nombre más largo / sin typos
                if len(ind_nombre) > len(id_to_name[ind_code]):
                    id_to_name[ind_code] = ind_nombre

        for ind_code, ind_nombre in id_to_name.items():

            full_id = self._generate_id(ind_code, ind_nombre)

            unidad = None
            if unidad_col:
                unidad_vals = df.loc[df[id_col] == ind_code, unidad_col].dropna()
                if len(unidad_vals) > 0:
                    unidad = str(unidad_vals.iloc[0]).strip()

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
                notas=f"ID interno: {ind_code}",
                ultima_actualizacion=datetime.now().strftime("%Y-%m-%d")
            )
            self.indicators.append(indicator)
            self.quality_report.filas_validas += 1

            ind_data = df[df[id_col] == ind_code]
            anio = self.config.get("anio", 2025)

            # ---- Observaciones Nacional (suma de todos los estados) ----
            total_prog = 0.0
            total_alc = 0.0

            for i, (prog_col, alc_col) in enumerate(prog_alc_pairs):
                prog_sum = pd.to_numeric(ind_data[prog_col], errors="coerce").fillna(0).sum()
                alc_sum = pd.to_numeric(ind_data[alc_col], errors="coerce").fillna(0).sum()

                total_prog += float(prog_sum)
                total_alc += float(alc_sum)

                if prog_sum > 0 or alc_sum > 0:
                    avance = round((alc_sum / prog_sum) * 100, 2) if prog_sum > 0 else None
                    mes_nombre = self.MESES[i] if i < 12 else f"mes_{i+1}"

                    self.observations.append(Observation(
                        indicator_id=full_id,
                        periodo=f"{anio}-{i+1:02d}",
                        valor=float(alc_sum),
                        meta=float(prog_sum),
                        avance_porcentual=avance,
                        entidad="Nacional",
                        fuente_detalle=f"POA {sheet_name} - {mes_nombre.capitalize()}"
                    ))

            if total_prog > 0 or total_alc > 0:
                avance_anual = round((total_alc / total_prog) * 100, 2) if total_prog > 0 else None
                self.observations.append(Observation(
                    indicator_id=full_id,
                    periodo=str(anio),
                    valor=total_alc,
                    meta=total_prog,
                    avance_porcentual=avance_anual,
                    entidad="Nacional",
                    fuente_detalle=f"POA {sheet_name} - Acumulado anual"
                ))
                logger.info(f"  {ind_code}: Prog={total_prog:.0f}, Alc={total_alc:.0f}, Avance={avance_anual}%")

            # ---- Observaciones por estado ----
            if state_col is None:
                continue  # No hay columna de estado

            states = ind_data[state_col].dropna().unique()
            for state_name in states:
                state_str = str(state_name).strip()
                if not state_str or state_str.lower() == "nan":
                    continue

                state_data = ind_data[ind_data[state_col] == state_name]
                st_total_prog = 0.0
                st_total_alc = 0.0

                for i, (prog_col, alc_col) in enumerate(prog_alc_pairs):
                    prog_val = pd.to_numeric(state_data[prog_col], errors="coerce").fillna(0).sum()
                    alc_val = pd.to_numeric(state_data[alc_col], errors="coerce").fillna(0).sum()

                    st_total_prog += float(prog_val)
                    st_total_alc += float(alc_val)

                    if prog_val > 0 or alc_val > 0:
                        avance = round((alc_val / prog_val) * 100, 2) if prog_val > 0 else None
                        mes_nombre = self.MESES[i] if i < 12 else f"mes_{i+1}"

                        self.observations.append(Observation(
                            indicator_id=full_id,
                            periodo=f"{anio}-{i+1:02d}",
                            valor=float(alc_val),
                            meta=float(prog_val),
                            avance_porcentual=avance,
                            entidad=state_str,
                            fuente_detalle=f"POA {sheet_name} - {mes_nombre.capitalize()} - {state_str}"
                        ))

                if st_total_prog > 0 or st_total_alc > 0:
                    avance_anual = round((st_total_alc / st_total_prog) * 100, 2) if st_total_prog > 0 else None
                    self.observations.append(Observation(
                        indicator_id=full_id,
                        periodo=str(anio),
                        valor=st_total_alc,
                        meta=st_total_prog,
                        avance_porcentual=avance_anual,
                        entidad=state_str,
                        fuente_detalle=f"POA {sheet_name} - Acumulado anual - {state_str}"
                    ))

    # --- Helpers ---

    def _find_col(self, df: pd.DataFrame, candidates: list) -> Optional[str]:
        df_cols_lower = {str(c).lower(): c for c in df.columns}
        for cand in candidates:
            if cand.lower() in df_cols_lower:
                return df_cols_lower[cand.lower()]
        return None

    def _detect_month_columns(self, df: pd.DataFrame) -> List[Tuple[str, str]]:
        """Detecta pares (Programada, Alcanzada) en orden de columnas.
        Solo devuelve los primeros 12 pares (meses); el par 13, si existe,
        suele ser 'Avance del periodo' y se excluye."""
        prog_cols = [c for c in df.columns if str(c).lower().startswith("programada")]
        alc_cols = [c for c in df.columns if str(c).lower().startswith("alcanzada")]
        pairs = list(zip(prog_cols, alc_cols))
        # Máximo 12 meses
        return pairs[:12]

    def _generate_id(self, code: str, nombre: str) -> str:
        prog = self.config.get("programa", "").lower()
        anio = self.config.get("anio", 2025)
        base = slugify(f"{code}-{nombre[:40]}", lowercase=True, separator="-")
        return f"{base}-{prog}-{anio}"


# ---------------------------------------------------------------------------
# MIR 2025 Extractor (formato tabla simple — hoja "MIR25")
# ---------------------------------------------------------------------------
class MIR25Extractor:
    """
    Extractor para el formato MIR simplificado (tabla resumen).
    Columnas esperadas (header en fila 1):
      [0] N°
      [1] Nombre Indicador
      [2] Oficina Responsable
      [3] Nivel MIR
      [4] META Porcentaje    [5] META Numerador    [6] META Denominador
      [7] AVANCE Porcentaje  [8] AVANCE Numerador  [9] AVANCE Denominador
      [10] Porcentaje de Cumplimiento
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
        try:
            xl = pd.ExcelFile(self.file_path)
            for sheet_name in xl.sheet_names:
                if "MIR" in sheet_name.upper() and "2014" not in sheet_name:
                    self._process_sheet(xl, sheet_name)
        except Exception as e:
            logger.error(f"Error procesando MIR25 {self.file_path}: {e}")
            self.quality_report.add_error(str(e))
        return self.indicators, self.observations, self.quality_report

    def _process_sheet(self, xl: pd.ExcelFile, sheet_name: str):
        df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
        logger.info(f"Procesando MIR25 hoja '{sheet_name}' ({len(df)} filas, {df.shape[1]} cols)")

        if df.shape[1] < 11:
            logger.warning(f"  Hoja '{sheet_name}' tiene pocas columnas ({df.shape[1]}), se omite")
            return

        # Detectar fila de encabezado (buscar "N°" o "Nombre Indicador")
        header_row = None
        for r in range(min(5, len(df))):
            val = str(df.iloc[r, 0]).strip()
            if val in ("N°", "No.", "N"):
                header_row = r
                break
            val1 = str(df.iloc[r, 1]).strip().lower()
            if "nombre" in val1 and "indicador" in val1:
                header_row = r
                break
        if header_row is None:
            header_row = 1  # default

        data_start = header_row + 1
        anio = self.config.get("anio", 2025)
        programa = self.config.get("programa", "G005")
        seen_ids = set()

        for idx in range(data_start, len(df)):
            row = df.iloc[idx]

            # Nombre del indicador (col 1)
            nombre = self._cell_str(row, 1)
            if not nombre or len(nombre) < 10:
                continue

            nivel = self._cell_str(row, 3)
            oficina = self._cell_str(row, 2)

            # Valores de meta y avance (pueden ser ratios 0-1 o porcentajes)
            meta_pct = self._parse_numeric(row.iloc[4])
            meta_num = self._parse_numeric(row.iloc[5])
            meta_den = self._parse_numeric(row.iloc[6])
            avance_pct = self._parse_numeric(row.iloc[7])
            avance_num = self._parse_numeric(row.iloc[8])
            avance_den = self._parse_numeric(row.iloc[9])
            cumplimiento = self._parse_numeric(row.iloc[10])

            # Convertir ratios a porcentajes si están en rango 0-2
            if meta_pct is not None and meta_pct <= 2:
                meta_pct = round(meta_pct * 100, 4)
            if avance_pct is not None and avance_pct <= 2:
                avance_pct = round(avance_pct * 100, 4)
            if cumplimiento is not None and cumplimiento <= 5:
                cumplimiento = round(cumplimiento * 100, 4)

            indicator_id = self._generate_id(nombre)
            if indicator_id in seen_ids:
                continue
            seen_ids.add(indicator_id)

            # Construir método de cálculo a partir de numerador/denominador
            metodo = None
            if meta_num is not None and meta_den is not None:
                metodo = f"(Numerador / Denominador) × 100. Meta: {meta_num} / {meta_den}"

            indicator = Indicator(
                id=indicator_id,
                nombre=nombre[:200],
                programa=programa,
                anio=anio,
                fuente=f"{self.file_path.name} - {sheet_name}",
                definicion=None,
                metodo_calculo=metodo,
                unidad_medida="Porcentaje",
                nivel=nivel if nivel in NIVELES_MIR else None,
                notas=f"Oficina: {oficina}" if oficina else None,
                ultima_actualizacion=datetime.now().strftime("%Y-%m-%d")
            )
            self.indicators.append(indicator)
            self.quality_report.filas_validas += 1

            logger.info(f"  [{nivel}] {nombre[:55]}... Meta={meta_pct}%, Avance={avance_pct}%")

            # Observación anual
            obs = Observation(
                indicator_id=indicator_id,
                periodo=str(anio),
                valor=avance_pct,
                meta=meta_pct,
                avance_porcentual=cumplimiento,
                entidad="Nacional",
                categoria=nivel,
                fuente_detalle=f"{self.file_path.name} - {sheet_name}"
            )
            self.observations.append(obs)

    def _cell_str(self, row, col_idx: int) -> str:
        try:
            val = row.iloc[col_idx]
        except IndexError:
            return ""
        if pd.isna(val):
            return ""
        return str(val).strip()

    def _parse_numeric(self, val) -> Optional[float]:
        if pd.isna(val):
            return None
        if isinstance(val, (int, float)):
            return None if np.isnan(val) else float(val)
        try:
            cleaned = str(val).replace(",", "").replace("%", "").strip()
            if cleaned.upper() in ("", "N/A", "N/D", "-"):
                return None
            return float(cleaned)
        except (ValueError, TypeError):
            return None

    def _generate_id(self, nombre: str) -> str:
        prog = self.config.get("programa", "").lower()
        anio = self.config.get("anio", 2025)
        base = slugify(nombre[:60], lowercase=True, separator="-")
        return f"{base}-{prog}-{anio}"


# ---------------------------------------------------------------------------
# Generic Excel Extractor (auto-detect)
# ---------------------------------------------------------------------------
class ExcelExtractor:
    """Detecta el formato automáticamente y delega al extractor correcto."""

    def __init__(self, file_path: Path, source_config: dict):
        self.file_path = file_path
        self.config = source_config

    def extract(self) -> Tuple[List[Indicator], List[Observation], DataQualityReport]:
        xl = pd.ExcelFile(self.file_path)
        for sheet in xl.sheet_names:
            if "Avance" in sheet:
                return POAExtractor(self.file_path, self.config).extract()
        return MIRFiMEExtractor(self.file_path, self.config).extract()


def extract_from_excel(file_path: Path, config: dict) -> Tuple[List[Indicator], List[Observation], DataQualityReport]:
    """Función de conveniencia."""
    return ExcelExtractor(file_path, config).extract()
