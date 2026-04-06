/**
 * Tipos para el sistema de captura POA 2026
 */

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  area_id?: string;
  entidad_id?: number;
  descripcion?: string;
  siglas?: string;
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'SUBCOR' | 'ORPA';

export interface AreaPOA {
  id: string;
  nombre: string;
  siglas: string;
}

export interface EntidadFederativa {
  id: number;
  clave: string;
  nombre: string;
  abreviatura: string;
}

export interface IndicadorPOA {
  id: number;
  clave: string;
  nombre: string;
  area_id: string;
  area_nombre?: string;
  unidad_medida?: string;
  metodo_calculo?: string;
  definicion?: string;
  nivel?: string;
  activo: boolean;
}

export interface MetaPOA {
  id: number;
  indicador_id: number;
  indicador_clave?: string;
  indicador_nombre?: string;
  entidad_id: number;
  entidad_nombre?: string;
  mes: number;
  anio: number;
  valor_planeado?: number;
  valor_real?: number;
}

export interface BitacoraEntry {
  id: number;
  usuario_nombre?: string;
  usuario_id: number;
  operacion: string;
  meta_id?: number;
  detalles?: string;
  created_at: string;
}

export interface UserPOA {
  id: number;
  nombre: string;
  email: string;
  descripcion?: string;
  siglas?: string;
  area_id?: string;
  area_nombre?: string;
  entidad_id?: number;
  entidad_nombre?: string;
  rol: UserRole;
  activo: boolean;
}

export interface ReporteArea {
  area_id: string;
  area_nombre: string;
  indicadores: ReporteIndicador[];
}

export interface ReporteIndicador {
  id: number;
  clave: string;
  nombre: string;
  unidad_medida?: string;
  entidades: ReporteEntidad[];
}

export interface ReporteEntidad {
  entidad_id: number;
  entidad_nombre: string;
  meses: Record<number, { id: number; valor_planeado?: number; valor_real?: number }>;
}

export interface DashboardIndicador {
  indicador_id: number;
  clave: string;
  nombre: string;
  area?: string;
  unidad_medida?: string;
  meses: Record<number, { planeado: number; real: number; count: number }>;
  total_planeado: number;
  total_real: number;
}

export const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

export const MESES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;
