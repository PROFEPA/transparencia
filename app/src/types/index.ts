/**
 * Tipos de datos para el Dashboard de Transparencia PROFEPA
 */

export interface Indicator {
  id: string;
  nombre: string;
  programa: string;
  anio: number;
  fuente: string;
  definicion?: string;
  metodo_calculo?: string;
  unidad_medida?: string;
  nivel?: string;
  notas?: string;
  ultima_actualizacion: string;
}

export interface Observation {
  indicator_id: string;
  periodo: string;
  valor?: number;
  meta?: number;
  avance_porcentual?: number;
  entidad?: string;
  categoria?: string;
  fuente_detalle: string;
}

export interface Metadata {
  version: string;
  fecha_extraccion: string;
  total_indicadores: number;
  total_observaciones: number;
  programas: string[];
  anios: number[];
  fuentes_procesadas: FuenteProcesada[];
}

export interface FuenteProcesada {
  nombre: string;
  archivo: string;
  tipo: string;
  programa: string;
  anio: number;
  descripcion: string;
}

export interface DataQualityReport {
  fecha_generacion: string;
  resumen: {
    total_filas_leidas: number;
    total_filas_validas: number;
    total_filas_descartadas: number;
    porcentaje_validas: number;
    total_indicadores: number;
    total_observaciones: number;
  };
  completitud_indicadores: {
    con_definicion: number;
    con_metodo_calculo: number;
    con_unidad_medida: number;
    con_nivel: number;
    con_observaciones: number;
  };
}

export interface DataDictionary {
  version: string;
  fecha_generacion: string;
  descripcion: string;
  columnas: ColumnDefinition[];
}

export interface ColumnDefinition {
  columna: string;
  tipo_dato: string;
  descripcion: string;
  ejemplo?: string;
  valores_permitidos?: string[];
  fuente_original?: string;
}

export interface IndicatorWithObservations {
  indicador: Indicator;
  observaciones: Observation[];
  tiene_serie: boolean;
}

// Tipos para filtros
export type NivelMIR = 'Fin' | 'Propósito' | 'Componente' | 'Actividad';
export type Programa = 'G005' | 'G014';
export type Anio = 2025 | 2026;

export interface FilterState {
  anio?: Anio;
  programa?: Programa;
  nivel?: NivelMIR;
  search?: string;
}
