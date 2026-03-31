'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Indicator, FilterState } from '@/types';

const ITEMS_PER_PAGE = 12;

// Función para explicar el nivel en lenguaje sencillo
function explicarNivel(nivel: string | undefined): string {
  switch (nivel) {
    case 'Fin': return 'Objetivo general del programa';
    case 'Propósito': return 'Resultado esperado';
    case 'Componente': return 'Productos o servicios';
    case 'Actividad': return 'Acciones específicas';
    default: return '';
  }
}

// Función para obtener color según nivel
function colorNivel(nivel: string | undefined): string {
  switch (nivel) {
    case 'Fin': return 'bg-purple-100 text-purple-700';
    case 'Propósito': return 'bg-blue-100 text-blue-700';
    case 'Componente': return 'bg-green-100 text-green-700';
    case 'Actividad': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// Función para verificar si tiene información completa
function tieneInfoCompleta(ind: Indicator): boolean {
  return !!(ind.definicion && ind.metodo_calculo);
}

// Componente interno que usa useSearchParams
function IndicadoresContent() {
  const searchParams = useSearchParams();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estado de filtros
  const [filters, setFilters] = useState<FilterState>({
    anio: searchParams.get('anio') ? Number(searchParams.get('anio')) as 2025 | 2026 : undefined,
    programa: searchParams.get('programa') as 'G005' | 'G014' | undefined,
    nivel: searchParams.get('nivel') as any,
    search: searchParams.get('q') || '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/data/indicators.json');
        if (res.ok) {
          setIndicators(await res.json());
        }
      } catch (error) {
        console.error('Error cargando indicadores:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtrar indicadores
  const filteredIndicators = useMemo(() => {
    return indicators.filter(ind => {
      if (filters.anio && !ind.anios?.includes(filters.anio)) return false;
      if (filters.programa && ind.programa !== filters.programa) return false;
      if (filters.nivel && ind.nivel !== filters.nivel) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchNombre = ind.nombre.toLowerCase().includes(search);
        const matchDef = ind.definicion?.toLowerCase().includes(search);
        if (!matchNombre && !matchDef) return false;
      }
      return true;
    });
  }, [indicators, filters]);

  // Paginación
  const totalPages = Math.ceil(filteredIndicators.length / ITEMS_PER_PAGE);
  const paginatedIndicators = filteredIndicators.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Valores únicos para filtros
  const uniqueAnios = Array.from(new Set(indicators.flatMap(i => i.anios || []))).sort();
  const uniqueProgramas = Array.from(new Set(indicators.map(i => i.programa))).filter(Boolean);
  const uniqueNiveles = Array.from(new Set(indicators.map(i => i.nivel).filter(Boolean)));

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page">Catálogo de indicadores</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header con info para ciudadanos */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Catálogo de Indicadores</h1>
          <p className="text-lg text-gray-500 mb-4">
            da seguimiento a las acciones para la protección y vigilancia del medio ambiente y los recursos naturales
          </p>
          <p className="text-gray-600 mb-4">
            Aquí puedes consultar todos los indicadores con los que PROFEPA mide su trabajo 
            en protección del medio ambiente. Cada indicador muestra qué se mide, cómo se calcula 
            y cuál es su avance.
          </p>
          
          {/* Mini guía explicativa */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900 mb-1">¿Qué es un indicador?</p>
                <p className="text-sm text-blue-800 mb-2">
                  Es un instrumento para medir el logro de los objetivos de los programas y un referente para el seguimiento de los avances y para la evaluación de los resultados alcanzados.
                </p>
                <p className="text-xs text-blue-700">
                  Gobierno de México. Secretaría de Hacienda y Crédito Público. (s/f). Guía para el diseño de la Matriz de Indicadores para Resultados.<br/>
                  <a href="https://www.transparenciapresupuestaria.gob.mx/work/models/PTP/Capacitacion/GuiaMIR.pdf" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
                    https://www.transparenciapresupuestaria.gob.mx/work/models/PTP/Capacitacion/GuiaMIR.pdf
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros con mejor explicación */}
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Buscar indicadores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por palabra clave
              </label>
              <div className="relative">
                <input
                  type="search"
                  id="search"
                  className="input pl-10"
                  placeholder="Ej: inspección, denuncia, certificado..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filtro por año */}
            <div>
              <label htmlFor="anio" className="block text-sm font-medium text-gray-700 mb-1">
                Año fiscal
              </label>
              <select
                id="anio"
                className="select"
                value={filters.anio || ''}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  anio: e.target.value ? Number(e.target.value) as 2025 | 2026 : undefined 
                })}
              >
                <option value="">Todos</option>
                {uniqueAnios.map(anio => (
                  <option key={anio} value={anio}>{anio}</option>
                ))}
              </select>
            </div>

            {/* Filtro por programa */}
            <div>
              <label htmlFor="programa" className="block text-sm font-medium text-gray-700 mb-1">
                Programa presupuestario
              </label>
              <select
                id="programa"
                className="select"
                value={filters.programa || ''}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  programa: e.target.value as 'G005' | 'G014' | undefined 
                })}
              >
                <option value="">Todos</option>
                {uniqueProgramas.map(prog => (
                  <option key={prog} value={prog}>{prog === 'G005' ? 'G005 (2025)' : 'G014 (2026)'}</option>
                ))}
              </select>
            </div>

            {/* Filtro por nivel */}
            <div>
              <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de indicador
              </label>
              <select
                id="nivel"
                className="select"
                value={filters.nivel || ''}
                onChange={(e) => setFilters({ ...filters, nivel: e.target.value as any })}
              >
                <option value="">Todos</option>
                {uniqueNiveles.map(nivel => (
                  <option key={nivel} value={nivel}>{nivel}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Limpiar filtros */}
          {(filters.anio || filters.programa || filters.nivel || filters.search) && (
            <div className="mt-4 pt-4 border-t">
              <button
                type="button"
                className="text-sm text-gob-green-500 hover:underline flex items-center gap-1"
                onClick={() => setFilters({ search: '' })}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Quitar todos los filtros
              </button>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded font-bold text-base mr-1">27</span> indicadores encontrados
            {filters.search && <span className="text-gray-400"> para "{filters.search}"</span>}
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </p>
          )}
        </div>

        {/* Vista de tarjetas de indicadores */}
        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gob-green-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando indicadores...</p>
          </div>
        ) : paginatedIndicators.length === 0 ? (
          <div className="card p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron indicadores</h3>
            <p className="text-gray-600">Intenta con otras palabras o quita los filtros.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedIndicators.map((indicator) => (
              <Link 
                key={indicator.id}
                href={`/indicadores/${indicator.id}`}
                className="card hover:shadow-lg transition-all group flex flex-col relative"
              >
                {/* Header con badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="badge-gob">{indicator.programa}</span>
                  <span className="badge-gray">{indicator.anios?.join(', ')}</span>
                  {indicator.nivel && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colorNivel(indicator.nivel)}`}>
                      {indicator.nivel}
                    </span>
                  )}
                </div>
                
                {/* Nombre del indicador */}
                <h3 className="font-semibold text-gray-900 group-hover:text-gob-green-600 mb-2 leading-snug">
                  {indicator.nombre}
                </h3>
                
                {/* Descripción o mensaje */}
                <div className="flex-1">
                  {indicator.definicion && indicator.definicion.length < 300 ? (
                    <p className="text-sm text-gray-600 mb-3">
                      {indicator.definicion.substring(0, 150)}
                      {indicator.definicion.length > 150 && '...'}
                    </p>
                  ) : indicator.nivel ? (
                    <p className="text-sm text-gray-500 italic mb-3">
                      {explicarNivel(indicator.nivel)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 mb-3">
                      Consulta el detalle para más información
                    </p>
                  )}
                </div>
                
                {/* Footer con info y acción */}
                <div className="pt-3 border-t mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {indicator.unidad_medida && (
                        <span>Mide: {indicator.unidad_medida}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gob-green-600 group-hover:underline flex items-center gap-1">
                      Ver detalle
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
                
                {/* Indicador de info incompleta */}
                {!tieneInfoCompleta(indicator) && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Info limitada
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <nav 
            className="flex items-center justify-center gap-2 mt-6"
            aria-label="Paginación"
          >
            <button
              type="button"
              className="btn-outline py-2 px-3"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`w-10 h-10 rounded-lg font-medium ${
                    currentPage === pageNum
                      ? 'bg-gob-green-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              type="button"
              className="btn-outline py-2 px-3"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

// Componente principal con Suspense boundary
export default function IndicadoresPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gob-green-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Cargando indicadores...</p>
          </div>
        </div>
      </div>
    }>
      <IndicadoresContent />
    </Suspense>
  );
}
