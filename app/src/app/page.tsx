'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Indicator, Metadata, Observation } from '@/types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = ['#235B4E', '#BC955C', '#691C32', '#10B981', '#3B82F6', '#8B5CF6'];

export default function HomePage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [metaRes, indRes, obsRes] = await Promise.all([
          fetch('/data/metadata.json'),
          fetch('/data/indicators.json'),
          fetch('/data/observations.json')
        ]);
        
        if (metaRes.ok) setMetadata(await metaRes.json());
        if (indRes.ok) setIndicators(await indRes.json());
        if (obsRes.ok) setObservations(await obsRes.json());
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const ind2025 = indicators.filter(i => i.anio === 2025);
  const ind2026 = indicators.filter(i => i.anio === 2026);

  // Datos para gráfica por programa
  const byPrograma = indicators.reduce((acc, ind) => {
    acc[ind.programa] = (acc[ind.programa] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const programaData = Object.entries(byPrograma).map(([name, value]) => ({ name, value }));

  // Datos para gráfica por nivel
  const byNivel = indicators.reduce((acc, ind) => {
    const nivel = ind.nivel || 'Sin clasificar';
    acc[nivel] = (acc[nivel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const nivelData = Object.entries(byNivel).map(([name, value]) => ({ name, value }));

  // Datos para gráfica por año
  const anioData = [
    { name: '2025', indicadores: ind2025.length, color: '#235B4E' },
    { name: '2026', indicadores: ind2026.length, color: '#BC955C' }
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section con estadísticas */}
      <section className="bg-gradient-to-br from-gob-green-500 via-gob-green-600 to-gob-green-700 text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-6">
                Dashboard de Transparencia
              </h1>
              <p className="text-xl md:text-2xl opacity-90 mb-8">
                Consulta los indicadores institucionales de la Procuraduría Federal 
                de Protección al Ambiente (PROFEPA) de manera clara y accesible.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/indicadores" className="btn-primary bg-white text-gob-green-600 hover:bg-gray-100">
                  Ver indicadores
                </Link>
                <Link href="/descargas" className="btn-secondary border-white text-white hover:bg-white/10">
                  Descargar datos
                </Link>
              </div>
            </div>
            
            {/* KPIs destacados en el hero */}
            {!loading && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
                  <div className="text-4xl md:text-5xl font-bold">{indicators.length}</div>
                  <div className="text-white/80 mt-1">Indicadores</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
                  <div className="text-4xl md:text-5xl font-bold">{observations.length}</div>
                  <div className="text-white/80 mt-1">Registros</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
                  <div className="text-4xl md:text-5xl font-bold">{metadata?.programas?.length || 2}</div>
                  <div className="text-white/80 mt-1">Programas</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
                  <div className="text-4xl md:text-5xl font-bold">4</div>
                  <div className="text-white/80 mt-1">Fuentes</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Gráficas de resumen */}
      {!loading && indicators.length > 0 && (
        <section className="section bg-white -mt-8 relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Gráfica por Año */}
              <div className="card">
                <h3 className="font-bold text-lg mb-4 text-center">Indicadores por Año</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={anioData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="indicadores" radius={[8, 8, 0, 0]}>
                        {anioData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfica por Programa */}
              <div className="card">
                <h3 className="font-bold text-lg mb-4 text-center">Distribución por Programa</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={programaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {programaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfica por Nivel */}
              <div className="card">
                <h3 className="font-bold text-lg mb-4 text-center">Indicadores por Nivel MIR</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nivelData} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#235B4E" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Qué es este tablero */}
      <section className="section bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="section-title">¿Qué es este tablero?</h2>
            <p className="text-lg text-gray-600 mb-6">
              Este tablero de transparencia pone a disposición de la ciudadanía 
              información sobre los indicadores de desempeño de PROFEPA en materia 
              de inspección, vigilancia y regulación ambiental.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8 text-left">
              <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gob-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Consulta indicadores</h3>
                <p className="text-gray-600 text-sm">
                  Explora los indicadores del POA, MIR y FiME con sus definiciones, 
                  metas y avances.
                </p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gob-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Visualiza tendencias</h3>
                <p className="text-gray-600 text-sm">
                  Observa la evolución de los indicadores en gráficas interactivas 
                  por periodo.
                </p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gob-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Descarga datos</h3>
                <p className="text-gray-600 text-sm">
                  Obtén los datasets en formatos abiertos (CSV, JSON) para tu 
                  propio análisis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accesos rápidos por año */}
      <section className="section">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="section-title text-center">Consulta por año</h2>
          <p className="section-subtitle text-center">
            Selecciona el año fiscal para ver los indicadores correspondientes
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link href="/indicadores?anio=2025" className="card-hover group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gob-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="badge-gob">POA / MIR</span>
                <span className="text-4xl font-bold text-gob-green-500 group-hover:text-gob-green-600">
                  2025
                </span>
              </div>
              <h3 className="font-bold text-xl mb-2">Indicadores 2025</h3>
              <p className="text-gray-600 mb-4">
                Programa Operativo Anual y Matriz de Indicadores para Resultados 
                del ejercicio fiscal 2025.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gob-green-500 font-medium">
                  <span>Ver {ind2025.length} indicadores</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="text-sm text-gray-400">G005</div>
              </div>
            </Link>
            
            <Link href="/indicadores?anio=2026" className="card-hover group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gob-gold-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="badge-gob">FiME</span>
                <span className="text-4xl font-bold text-gob-gold-600 group-hover:text-gob-gold-700">
                  2026
                </span>
              </div>
              <h3 className="font-bold text-xl mb-2">Indicadores 2026</h3>
              <p className="text-gray-600 mb-4">
                Ficha de Indicadores de Monitoreo y Evaluación del ejercicio 
                fiscal 2026.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gob-gold-600 font-medium">
                  <span>Ver {ind2026.length} indicadores</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="text-sm text-gray-400">G014</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Indicadores destacados */}
      {!loading && indicators.length > 0 && (
        <section className="section bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="section-title text-center">Indicadores destacados</h2>
            <p className="section-subtitle text-center">Algunos indicadores clave de la gestión ambiental</p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {indicators.slice(0, 6).map((ind, i) => (
                <Link key={ind.id} href={`/indicadores/${ind.id}`} className="card hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge-gob">{ind.programa}</span>
                    <span className="badge-gray">{ind.anio}</span>
                    {ind.nivel && <span className="text-xs text-gray-400">{ind.nivel}</span>}
                  </div>
                  <h3 className="font-semibold line-clamp-2 group-hover:text-gob-green-600 mb-2">
                    {ind.nombre}
                  </h3>
                  {ind.unidad_medida && (
                    <p className="text-sm text-gray-500">Unidad: {ind.unidad_medida}</p>
                  )}
                  <div className="mt-4 pt-4 border-t flex items-center text-sm text-gob-green-600 font-medium">
                    <span>Ver detalle</span>
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Link href="/indicadores" className="btn-primary">
                Ver todos los indicadores
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Aviso de transparencia */}
      <section className="section bg-blue-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-4">Aviso de Transparencia</h2>
            <p className="text-gray-600">
              La información presentada en este tablero proviene de documentos institucionales 
              oficiales (POA, MIR, FiME) y se publica con fines informativos y de transparencia. 
              La interpretación oficial de los datos corresponde a PROFEPA.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link href="/metodologia" className="text-blue-600 hover:underline font-medium">
                Ver metodología
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/glosario" className="text-blue-600 hover:underline font-medium">
                Consultar glosario
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Fuentes de datos */}
      {metadata && metadata.fuentes_procesadas && (
        <section className="section">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="section-title text-center">Fuentes de datos</h2>
            <div className="grid-cards">
              {metadata.fuentes_procesadas.map((fuente, index) => (
                <div key={index} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {fuente.tipo === 'excel' ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${fuente.tipo === 'excel' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {fuente.tipo.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold mb-1">{fuente.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-2">{fuente.descripcion}</p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">{fuente.programa}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">{fuente.anio}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
