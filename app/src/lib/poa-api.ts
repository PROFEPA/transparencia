/**
 * API client for POA 2026 capture system.
 */
import type {
  AuthUser, AreaPOA, EntidadFederativa, IndicadorPOA,
  MetaPOA, BitacoraEntry, UserPOA, ReporteArea, DashboardIndicador,
} from '@/types/poa';

const API_BASE = process.env.NEXT_PUBLIC_POA_API_URL || 'http://localhost:8001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('poa_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('poa_token');
      localStorage.removeItem('poa_user');
      window.location.href = '/admin/login';
    }
    throw new Error('No autorizado');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de servidor' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }

  return res.json();
}

// Auth
export async function login(email: string, password: string): Promise<{ access_token: string; user: AuthUser }> {
  return apiFetch('/api/poa/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch('/api/poa/auth/me');
}

// Catalogs
export async function getAreas(): Promise<AreaPOA[]> {
  return apiFetch('/api/poa/areas');
}

export async function getEntidades(): Promise<EntidadFederativa[]> {
  return apiFetch('/api/poa/entidades');
}

// Indicadores POA
export async function getIndicadoresPOA(area_id?: string): Promise<IndicadorPOA[]> {
  const params = area_id ? `?area_id=${area_id}` : '';
  return apiFetch(`/api/poa/indicadores${params}`);
}

export async function createIndicadorPOA(data: Partial<IndicadorPOA>): Promise<IndicadorPOA> {
  return apiFetch('/api/poa/indicadores', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Metas
export async function getMetas(params: {
  indicador_id?: number;
  entidad_id?: number;
  area_id?: string;
  mes?: number;
  anio?: number;
}): Promise<MetaPOA[]> {
  const searchParams = new URLSearchParams();
  if (params.indicador_id) searchParams.set('indicador_id', String(params.indicador_id));
  if (params.entidad_id) searchParams.set('entidad_id', String(params.entidad_id));
  if (params.area_id) searchParams.set('area_id', params.area_id);
  if (params.mes) searchParams.set('mes', String(params.mes));
  if (params.anio) searchParams.set('anio', String(params.anio));
  const qs = searchParams.toString();
  return apiFetch(`/api/poa/metas${qs ? '?' + qs : ''}`);
}

export async function createMeta(data: {
  indicador_id: number;
  entidad_id: number;
  mes: number;
  anio?: number;
  valor_planeado?: number;
}): Promise<MetaPOA> {
  return apiFetch('/api/poa/metas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMeta(id: number, data: {
  valor_planeado?: number;
  valor_real?: number;
}): Promise<MetaPOA> {
  return apiFetch(`/api/poa/metas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMeta(id: number): Promise<void> {
  return apiFetch(`/api/poa/metas/${id}`, { method: 'DELETE' });
}

// Reporte
export async function getReporte(params: {
  entidad_id?: number;
  area_id?: string;
  anio?: number;
}): Promise<ReporteArea[]> {
  const searchParams = new URLSearchParams();
  if (params.entidad_id) searchParams.set('entidad_id', String(params.entidad_id));
  if (params.area_id) searchParams.set('area_id', params.area_id);
  if (params.anio) searchParams.set('anio', String(params.anio));
  const qs = searchParams.toString();
  return apiFetch(`/api/poa/reporte${qs ? '?' + qs : ''}`);
}

// Dashboard
export async function getDashboard(params: {
  area_id?: string;
  indicador_ids?: number[];
  entidad_ids?: number[];
  anio?: number;
}): Promise<DashboardIndicador[]> {
  const searchParams = new URLSearchParams();
  if (params.area_id) searchParams.set('area_id', params.area_id);
  if (params.indicador_ids?.length) searchParams.set('indicador_ids', params.indicador_ids.join(','));
  if (params.entidad_ids?.length) searchParams.set('entidad_ids', params.entidad_ids.join(','));
  if (params.anio) searchParams.set('anio', String(params.anio));
  const qs = searchParams.toString();
  return apiFetch(`/api/poa/dashboard${qs ? '?' + qs : ''}`);
}

// Users
export async function getUsers(): Promise<UserPOA[]> {
  return apiFetch('/api/poa/usuarios');
}

export async function createUser(data: {
  nombre: string;
  email: string;
  password: string;
  descripcion?: string;
  siglas?: string;
  area_id?: string;
  entidad_id?: number;
  rol: string;
  activo?: boolean;
}): Promise<UserPOA> {
  return apiFetch('/api/poa/usuarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: number, data: Partial<UserPOA & { password?: string }>): Promise<UserPOA> {
  return apiFetch(`/api/poa/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Bitacora
export async function getBitacora(page: number = 1, pageSize: number = 20): Promise<BitacoraEntry[]> {
  return apiFetch(`/api/poa/bitacora?page=${page}&page_size=${pageSize}`);
}

// Export
export function getExportUrl(params: {
  entidad_id?: number;
  area_id?: string;
  anio?: number;
  format?: string;
}): string {
  const searchParams = new URLSearchParams();
  if (params.entidad_id) searchParams.set('entidad_id', String(params.entidad_id));
  if (params.area_id) searchParams.set('area_id', params.area_id);
  if (params.anio) searchParams.set('anio', String(params.anio));
  searchParams.set('format', params.format || 'csv');
  const token = getToken();
  if (token) searchParams.set('token', token);
  return `${API_BASE}/api/poa/export/reporte?${searchParams.toString()}`;
}
