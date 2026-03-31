'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Indicator, Metadata, Observation } from '@/types';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#235B4E', '#BC955C', '#691C32', '#10B981', '#3B82F6', '#8B5CF6'];

/* ── Section wrapper with scroll animation ── */
function FadeSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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

  const ind2025 = useMemo(() => indicators.filter(i => i.anios?.includes(2025)), [indicators]);
  const ind2026 = useMemo(() => indicators.filter(i => i.anios?.includes(2026)), [indicators]);

  const programaData = useMemo(() => {
    const counts: Record<string, number> = {};
    indicators.forEach(i => { counts[i.programa] = (counts[i.programa] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [indicators]);

  const nivelData = useMemo(() => {
    const counts: Record<string, number> = {};
    ind2025.forEach(i => { if (i.nivel) counts[i.nivel] = (counts[i.nivel] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [ind2025]);

  const nivelFimeData = useMemo(() => {
    const counts: Record<string, number> = {};
    ind2026.forEach(i => { if (i.nivel) counts[i.nivel] = (counts[i.nivel] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [ind2026]);

  const anioData = [
    { name: '2025', indicadores: ind2025.length, color: '#235B4E', label: 'POA/MIR' },
    { name: '2026', indicadores: ind2026.length, color: '#BC955C', label: 'POA/FiME' }
  ];

  return (
    <div className="bg-mesh">
      {/* ═══════ 1. HERO ═══════ */}
      <section className="relative bg-gradient-to-br from-gob-green-500 via-gob-green-600 to-gob-green-700 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeSection>
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-3xl md:text-5xl font-bold mb-2"
                >
                  Tablero de Indicadores
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-sm md:text-base opacity-80 font-semibold mb-6"
                >
                  Programa presupuestario G005 Inspección y vigilancia<br />
                  del medio ambiente y los recursos naturales
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed"
                >
                  Consulta los indicadores institucionales de la Procuraduría Federal
                  de Protección al Ambiente (PROFEPA) de manera clara y accesible.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="flex flex-wrap gap-4"
                >
                  <Link href="/indicadores" className="group inline-flex items-center gap-2 bg-white text-gob-green-600 px-8 py-4 rounded-2xl font-bold text-sm hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:-translate-y-1">
                    Ver indicadores
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link href="/descargas" className="btn-secondary border-white text-white hover:bg-white/10 px-8 py-4 rounded-2xl">
                    Descargar datos
                  </Link>
                </motion.div>
              </div>
            </FadeSection>

            {/* KPIs destacados en el hero */}
            {!loading && (
              <FadeSection delay={0.3}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-6 rounded-2xl text-center hover:bg-white/15 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold">{indicators.length}</div>
                    <div className="text-white/80 mt-1 text-sm font-medium">Indicadores</div>
                  </div>
                  <div className="glass p-6 rounded-2xl text-center hover:bg-white/15 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold">{observations.length.toLocaleString()}</div>
                    <div className="text-white/80 mt-1 text-sm font-medium">Registros</div>
                  </div>
                  <div className="glass p-6 rounded-2xl text-center hover:bg-white/15 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold">{new Set(indicators.map(i => i.programa)).size}</div>
                    <div className="text-white/80 mt-1 text-sm font-medium">Programas</div>
                  </div>
                  <div className="glass p-6 rounded-2xl text-center hover:bg-white/15 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold">{metadata?.fuentes_procesadas?.length || 0}</div>
                    <div className="text-white/80 mt-1 text-sm font-medium">Fuentes</div>
                  </div>
                </div>
              </FadeSection>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ 2. CHARTS (4 original charts) ═══════ */}
      {!loading && indicators.length > 0 && (
        <section className="relative -mt-8 z-10 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Gráfica por Año */}
              <FadeSection delay={0.1}>
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-4 text-center text-gray-800">Indicadores por Año</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={anioData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="indicadores" radius={[8, 8, 0, 0]} label={({ x, y, width, index }: { x: number; y: number; width: number; index: number }) => {
                          const entry = anioData[index];
                          return (
                            <g>
                              <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={10} fill={entry.color} fontWeight="bold">{entry.label}</text>
                              <text x={x + width / 2} y={y + 20} textAnchor="middle" fontSize={16} fill="#fff" fontWeight="bold">{entry.indicadores}</text>
                            </g>
                          );
                        }}>
                          {anioData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </FadeSection>

              {/* Gráfica por Programa */}
              <FadeSection delay={0.2}>
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-0 text-center text-gray-800">Distribución por Programa</h3>
                  <p className="text-center text-sm font-semibold" style={{ color: '#BC955C' }}>Presupuestario</p>
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
                          label={({ name, percent, cx: cxl, cy: cyl, midAngle, outerRadius: oR }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = oR + 18;
                            const x = cxl + radius * Math.cos(-midAngle * RADIAN);
                            const y = cyl + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} textAnchor={x > cxl ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                                {name} {(percent * 100).toFixed(0)}%
                              </text>
                            );
                          }}
                        >
                          {programaData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <text x="50%" y="42%" textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight="bold" fill="#235B4E">{programaData[0]?.value}</text>
                        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight="bold" fill="#BC955C">{programaData[1]?.value}</text>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </FadeSection>

              {/* Gráfica por Nivel MIR 2025 */}
              <FadeSection delay={0.3}>
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-0 text-center text-gray-800">Indicadores por Nivel</h3>
                  <p className="text-center text-sm font-semibold" style={{ color: '#BC955C' }}>MIR 2025</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={nivelData} layout="vertical" margin={{ top: 5, right: 40, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" fill="#235B4E" radius={[0, 4, 4, 0]}
                          label={({ x, y, width, height, value }: { x: number; y: number; width: number; height: number; value: number }) => (
                            <text x={x + width + 5} y={y + height / 2} dominantBaseline="central" fontSize={12} fontWeight="bold" fill="#235B4E">{value}</text>
                          )}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </FadeSection>

              {/* Gráfica por Nivel FiME 2026 */}
              <FadeSection delay={0.4}>
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-0 text-center text-gray-800">Indicadores por Nivel</h3>
                  <p className="text-center text-sm font-semibold" style={{ color: '#BC955C' }}>FiME 2026</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={nivelFimeData} layout="vertical" margin={{ top: 5, right: 40, left: 5, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" fill="#235B4E" radius={[0, 4, 4, 0]}
                          label={({ x, y, width, height, value }: { x: number; y: number; width: number; height: number; value: number }) => (
                            <text x={x + width + 5} y={y + height / 2} dominantBaseline="central" fontSize={12} fontWeight="bold" fill="#235B4E">{value}</text>
                          )}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </FadeSection>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ 3. INSTITUTIONAL TEXT ═══════ */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <div className="max-w-5xl mx-auto">
              <p className="text-gray-700 text-justify leading-relaxed">
                La Procuraduría Federal de Protección al Ambiente (PROFEPA) tiene como objeto la procuración de la justicia ambiental, la defensa del derecho humano a un medio ambiente sano para el desarrollo y bienestar de la persona, y la protección del ambiente y de la biodiversidad, a través de la prevención del daño y la determinación de la responsabilidad ambiental, la inspección, investigación, análisis de información y vigilancia de las actividades que regula la Normativa Ambiental, el impulso de las acciones judiciales conducentes para el cumplimiento de la Normativa Ambiental, la promoción e impulso de la autorregulación, la aplicación de las políticas públicas ambientales que permitan asegurar el acceso a la información y la participación pública, y el reconocimiento de los derechos de las personas defensoras ambientales en el ámbito administrativo de procuración de justicia.
              </p>
              <p className="text-gray-700 text-justify leading-relaxed mt-4">
                Para cumplir con las tareas que le han sido encomendadas, la PROFEPA realiza, entre otras, las siguientes acciones: programar, ordenar y realizar actos de inspección, vigilancia y evaluación del cumplimiento de disposiciones jurídicas en materia de protección, restauración y aprovechamiento sustentable de los recursos naturales, vida silvestre, ecosistemas y áreas naturales protegidas; vigilar el cumplimiento de la regulación en materia de bioseguridad, especies exóticas y zonas costeras, prevención y control de la contaminación atmosférica, de suelos y aguas nacionales, manejo de residuos peligrosos e impacto ambiental, además de fomentar la auditoría ambiental y la emisión de lineamientos administrativos para garantizar la protección ambiental.
              </p>
              <p className="text-gray-700 text-justify leading-relaxed mt-4">
                Durante 2025 la PROFEPA contaba con el Programa Presupuestario G005 &ldquo;Inspección y Vigilancia del Medio Ambiente y Recursos Naturales&rdquo;, cuyo fin era contribuir al bienestar social e igualdad mediante la ejecución de acciones de inspección y vigilancia en materia de recursos naturales e industria, la promoción y atención de la denuncia ambiental ciudadana, así como el impulso de los mecanismos voluntarios de mejora del desempeño ambiental en los sectores productivos, garantizando el acceso a la justicia ambiental mediante la aplicación de la normatividad correspondiente.
              </p>
              <p className="text-gray-700 text-justify leading-relaxed mt-4">
                En el año 2026, la PROFEPA operará el Programa Presupuestario G014 &ldquo;Inspección, Vigilancia y Regulación del Medio Ambiente y Recursos Naturales&rdquo;, resultado de la Estrategia de Simplificación de la Estructura Programática 2026 para el ramo 16 &ldquo;Medio Ambiente y Recursos Naturales&rdquo;, llevada a cabo por la Unidad de Política y Estrategia para Resultados (UPER) de la Secretaría de Hacienda y Crédito Público. En dicha estrategia se contempló la fusión de algunos programas presupuestarios para la reorganización administrativa y la optimización de procesos internos. El propósito del Programa Presupuestario G014 &ldquo;Inspección, Vigilancia y Regulación del Medio Ambiente y Recursos Naturales&rdquo; es fortalecer las acciones de prevención, inspección y vigilancia que permitan supervisar y hacer cumplir la regulación en materia de biodiversidad, protección, conservación, restauración y aprovechamiento sustentable de los recursos naturales en beneficio de la población y los ecosistemas de México.
              </p>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ═══════ 4. ¿QUÉ ES ESTE TABLERO? ═══════ */}
      <section className="section bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="section-title">¿Qué es este tablero?</h2>
              <p className="text-lg text-gray-600 mb-6">
                Este tablero de indicadores pone a disposición de la ciudadanía información sobre los indicadores de desempeño de PROFEPA en materia de Prevención ambiental, inspección y vigilancia del medio ambiente y los recursos naturales.
              </p>
            </div>
          </FadeSection>

          <div className="grid md:grid-cols-3 gap-6 mt-8 max-w-3xl mx-auto">
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                title: 'Consulta indicadores',
                desc: 'Explora los indicadores del POA, MIR y FiME con sus definiciones, metas y avances.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />,
                title: 'Visualiza tendencias',
                desc: 'Observa la evolución de los indicadores en gráficas interactivas por periodo.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
                title: 'Descarga datos',
                desc: 'Obtén los datasets en formatos abiertos (CSV, JSON) para tu propio análisis.',
              },
            ].map((item, i) => (
              <FadeSection key={item.title} delay={i * 0.15}>
                <div className="card-hover p-6 h-full group text-left">
                  <div className="w-12 h-12 bg-gob-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 5. YEAR ACCESS CARDS ═══════ */}
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <h2 className="section-title text-center">Consulta por año</h2>
            <p className="section-subtitle text-center">
              Selecciona el año fiscal para ver los indicadores correspondientes
            </p>
          </FadeSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <FadeSection delay={0.1}>
              <Link href="/indicadores?anio=2025" className="card-hover group relative overflow-hidden">
                <img src="/picture/profepa_logo.jpg" alt="" className="absolute top-2 right-2 w-20 h-auto opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="flex items-center justify-between mb-4">
                  <span className="badge-gob">POA / MIR</span>
                  <span className="text-4xl font-bold text-gob-green-500 group-hover:text-gob-green-600 transition-colors">
                    2025
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-2">Indicadores 2025</h3>
                <p className="text-gray-600 mb-4">
                  Programa Operativo Anual (datos mensuales por estado) y Matriz de Indicadores
                  para Resultados del ejercicio fiscal 2025.
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
            </FadeSection>

            <FadeSection delay={0.25}>
              <Link href="/indicadores?anio=2026" className="card-hover group relative overflow-hidden">
                <img src="/picture/profepa_logo.jpg" alt="" className="absolute top-2 right-2 w-20 h-auto opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="flex items-center justify-between mb-4">
                  <span className="badge-gob">POA / FiME</span>
                  <span className="text-4xl font-bold text-gob-gold-600 group-hover:text-gob-gold-700 transition-colors">
                    2026
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-2">Indicadores 2026</h3>
                <p className="text-gray-600 mb-4">
                  Programa Operativo Anual (corte febrero) y Ficha de Indicadores
                  de Monitoreo y Evaluación del ejercicio fiscal 2026.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gob-gold-600 font-medium">
                    <span>Ver {ind2026.length} indicadores</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="text-sm text-gray-400">G005 / G014</div>
                </div>
              </Link>
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ═══════ 6. HIGHLIGHTED INDICATORS ═══════ */}
      {!loading && indicators.length > 0 && (
        <section className="section bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <FadeSection>
              <h2 className="section-title text-center">Indicadores destacados</h2>
              <p className="section-subtitle text-center">Algunos indicadores clave de la gestión ambiental</p>
            </FadeSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {indicators.filter(ind => {
                const highlightNames = [
                  'Porcentaje de denuncias populares en materia ambiental concluidas',
                  'Porcentaje de certificados y reconocimientos ambientales emitidos',
                  'Porcentaje de inspecciones realizadas en materia de recursos naturales',
                  'Porcentaje de operativos realizados en materia de recursos naturales',
                  'Porcentaje de comités de vigilancia ambiental participativa en operación',
                  'Porcentaje de recorridos de vigilancia realizados en materia de recursos naturales',
                  'Porcentaje de acciones de Inspección y verificación realizadas sobre la cuales',
                ];
                return highlightNames.some(h => ind.nombre.startsWith(h));
              }).map((ind, i) => (
                <FadeSection key={ind.id} delay={i * 0.1}>
                  <Link href={`/indicadores/${ind.id}`} className="card-hover group h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-gob">{ind.programa}</span>
                      {ind.anios?.map(a => (
                        <span key={a} className="badge-gray">{a}</span>
                      ))}
                      {ind.nivel && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          ind.nivel === 'Actividad' ? 'bg-orange-50 text-orange-600' :
                          ind.nivel === 'Componente' ? 'bg-green-50 text-green-600' :
                          ind.nivel === 'Propósito' ? 'bg-blue-50 text-blue-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>{ind.nivel}</span>
                      )}
                    </div>
                    <h3 className="font-semibold line-clamp-2 group-hover:text-gob-green-600 transition-colors mb-2">
                      {ind.nombre}
                    </h3>
                    {ind.unidad_medida && (
                      <p className="text-sm text-gray-500">Unidad: {ind.unidad_medida}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center text-sm text-gob-green-600 font-medium">
                      <span>Ver detalle</span>
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </FadeSection>
              ))}
            </div>

            <FadeSection>
              <div className="text-center mt-8">
                <Link href="/indicadores" className="btn-primary px-10 py-4">
                  Ver todos los indicadores
                </Link>
              </div>
            </FadeSection>
          </div>
        </section>
      )}

      {/* ═══════ 7. TRANSPARENCY NOTICE ═══════ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50 to-blue-100 p-10 md:p-14 text-center">
              <div className="relative max-w-3xl mx-auto">
                <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-bold mb-4 text-gray-900">Aviso de Transparencia</h2>
                <p className="text-gray-600 leading-relaxed">
                  La información presentada en este tablero proviene de documentos institucionales oficiales (POA, MIR, FiME) y se publica con fines informativos e integrar información uniforme y específica para elaborar y registrar los avances de avances de las metas de los Programas Operativos Anuales de las 32 ORPAyGTs de la PROFEPA, permitiendo alimentar las fórmulas establecidas para los indicadores de la MIR Programa presupuestario G005 y de transparencia. La interpretación oficial de los datos corresponde a PROFEPA.
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
          </FadeSection>
        </div>
      </section>

      {/* ═══════ 8. DATA SOURCES ═══════ */}
      {metadata && metadata.fuentes_procesadas && (
        <section className="section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <FadeSection>
              <h2 className="section-title text-center">Fuentes de datos</h2>
            </FadeSection>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metadata.fuentes_procesadas.map((fuente, index) => (
                <FadeSection key={index} delay={index * 0.1}>
                  <div className="card-hover">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
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
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${fuente.tipo === 'excel' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                        {fuente.tipo.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-bold mb-1 text-gray-900">{fuente.nombre}</h3>
                    <p className="text-sm text-gray-600 mb-3">{fuente.descripcion}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2.5 py-1 rounded-full">{fuente.programa}</span>
                      <span className="bg-gray-100 px-2.5 py-1 rounded-full">{fuente.anio}</span>
                    </div>
                  </div>
                </FadeSection>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
