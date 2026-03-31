'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Indicator, FilterState } from '@/types';

const ITEMS_PER_PAGE = 12;

function explicarNivel(nivel: string | undefined): string {
  switch (nivel) {
    case 'Fin': return 'Objetivo general del programa';
    case 'Propósito': return 'Resultado esperado';
    case 'Componente': return 'Productos o servicios';
    case 'Actividad': return 'Acciones específicas';
    default: return '';
  }
}

function colorNivel(nivel: string | undefined): string {
  switch (nivel) {
    case 'Fin': return 'bg-purple-50 text-purple-600 ring-1 ring-purple-200';
    case 'Propósito': return 'bg-blue-50 text-blue-600 ring-1 ring-blue-200';
    case 'Componente': return 'bg-green-50 text-green-600 ring-1 ring-green-200';
    case 'Actividad': return 'bg-orange-50 text-orange-600 ring-1 ring-orange-200';
    default: return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  }
}

function tieneInfoCompleta(ind: Indicator): boolean {
  return !!(ind.definicion && ind.metodo_calculo);
}

function IndicadoresContent() {
  const searchParams = useSearchParams();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
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
        if (res.ok) setIndicators(await res.json());
      } catch (error) {
        console.error('Error cargando indicadores:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

  const totalPages = Math.ceil(filteredIndicators.length / ITEMS_PER_PAGE);
  const paginatedIndicators = filteredIndicators.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const uniqueAnios = Array.from(new Set(indicators.flatMap(i => i.anios || []))).sort();
  const uniqueProgramas = Array.from(new Set(indicators.map(i => i.programa))).filter(Boolean);
  const uniqueNiveles = Array.from(new Set(indicators.map(i => i.nivel).filter(Boolean)));

  const activeFilters = [filters.anio, filters.programa, filters.nivel, filters.search].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-mesh">
      {/* Hero mini */}
      <section className="relative bg-gradient-to-br from-gob-green-600 via-gob-green-500 to-gob-green-700 overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gob-gold-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <nav className="text-sm text-white/50 mb-6 flex items-center gap-2">
              <Link href="/" className="hover:text-white/80 transition-colors">Inicio</Link>
              <span>/</span>
              <span className="text-white/80">Catálogo de indicadores</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Catálogo de Indicadores
            </h1>
            <p className="text-white/70 max-w-2xl text-lg">
              Consulta todos los indicadores con los que PROFEPA mide su trabajo en protección del medio ambiente.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="relative -mt-8 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gob-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h2 className="font-bold text-gray-800">Filtrar indicadores</h2>
              </div>
              {activeFilters > 0 && (
                <button
                  type="button"
                  className="text-sm text-gob-green-600 hover:text-gob-green-700 font-medium flex items-center gap-1"
                  onClick={() => setFilters({ search: '' })}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar ({activeFilters})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-gray-600 mb-2">Buscar por palabra clave</label>
                <div className="relative">
                  <input
                    type="search"
                    id="search"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-gob-green-500/30 focus:border-gob-green-500 transition-all outline-none"
                    placeholder="Ej: inspección, denuncia, certificado..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="anio" className="block text-sm font-medium text-gray-600 mb-2">Año fiscal</label>
                <select
                  id="anio"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gob-green-500/30 focus:border-gob-green-500 transition-all outline-none appearance-none"
                  value={filters.anio || ''}
                  onChange={(e) => setFilters({ ...filters, anio: e.target.value ? Number(e.target.value) as 2025 | 2026 : undefined })}
                >
                  <option value="">Todos</option>
                  {uniqueAnios.map(anio => <option key={anio} value={anio}>{anio}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="programa" className="block text-sm font-medium text-gray-600 mb-2">Programa</label>
                <select
                  id="programa"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gob-green-500/30 focus:border-gob-green-500 transition-all outline-none appearance-none"
                  value={filters.programa || ''}
                  onChange={(e) => setFilters({ ...filters, programa: e.target.value as 'G005' | 'G014' | undefined })}
                >
                  <option value="">Todos</option>
                  {uniqueProgramas.map(prog => <option key={prog} value={prog}>{prog === 'G005' ? 'G005 (2025)' : 'G014 (2026)'}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="nivel" className="block text-sm font-medium text-gray-600 mb-2">Nivel MIR</label>
                <select
                  id="nivel"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gob-green-500/30 focus:border-gob-green-500 transition-all outline-none appearance-none"
                  value={filters.nivel || ''}
                  onChange={(e) => setFilters({ ...filters, nivel: e.target.value as any })}
                >
                  <option value="">Todos</option>
                  {uniqueNiveles.map(nivel => <option key={nivel} value={nivel}>{nivel}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            <span className="text-2xl font-extrabold text-gray-900 mr-1">{filteredIndicators.length}</span>
            indicadores encontrados
            {filters.search && <span className="text-gray-400"> para &ldquo;{filters.search}&rdquo;</span>}
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-gray-400">Página {currentPage} de {totalPages}</p>
          )}
        </div>

        {loading ? (
          <div className="card p-16 text-center">
            <div className="w-12 h-12 border-4 border-gob-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-500">Cargando indicadores...</p>
          </div>
        ) : paginatedIndicators.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No se encontraron indicadores</h3>
            <p className="text-gray-500">Intenta con otras palabras o quita los filtros.</p>
          </motion.div>
        ) : (
          <motion.div layout className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {paginatedIndicators.map((indicator, i) => (
                <motion.div
                  key={indicator.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                >
                  <Link 
                    href={`/indicadores/${indicator.id}`}
                    className="card-hover group h-full flex flex-col relative"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="badge-gob">{indicator.programa}</span>
                      {indicator.anios?.map(a => (
                        <span key={a} className="badge-gray">{a}</span>
                      ))}
                      {indicator.nivel && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${colorNivel(indicator.nivel)}`}>
                          {indicator.nivel}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-gray-900 group-hover:text-gob-green-600 transition-colors mb-3 leading-snug line-clamp-2">
                      {indicator.nombre}
                    </h3>
                    
                    <div className="flex-1">
                      {indicator.definicion && indicator.definicion.length < 300 ? (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-3">{indicator.definicion}</p>
                      ) : indicator.nivel ? (
                        <p className="text-sm text-gray-400 italic mb-3">{explicarNivel(indicator.nivel)}</p>
                      ) : (
                        <p className="text-sm text-gray-400 mb-3">Consulta el detalle para más información</p>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 mt-auto">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          {indicator.unidad_medida && <span>{indicator.unidad_medida}</span>}
                        </div>
                        <span className="text-sm font-semibold text-gob-green-600 flex items-center gap-1.5 group-hover:gap-3 transition-all">
                          Ver detalle
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {!tieneInfoCompleta(indicator) && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1 ring-1 ring-amber-200/50">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Info limitada
                        </span>
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Paginación">
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                    currentPage === pageNum
                      ? 'bg-gob-green-500 text-white shadow-lg shadow-gob-green-500/30'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}

export default function IndicadoresPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gob-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <IndicadoresContent />
    </Suspense>
  );
}
