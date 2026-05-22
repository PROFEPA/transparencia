'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Indicator, Metadata, Observation } from '@/types';
import MapaPorEstado from '@/components/MapaPorEstado';
import { isHiddenIndicator } from '@/lib/indicators-filter';

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

  const ind2025 = useMemo(
    () => indicators.filter(i => !isHiddenIndicator(i.id) && i.anios?.includes(2025)),
    [indicators]
  );

  // KPIs globales: Total programado / Total alcanzado (suma ene-dic de todos los indicadores visibles)
  const totalesGlobales = useMemo(() => {
    let totalProgramado = 0;
    let totalAlcanzado = 0;
    let hayProgramado = false;
    let hayAlcanzado = false;
    ind2025.forEach(ind => {
      const obs = observations.filter(o =>
        o.indicator_id === ind.id &&
        (o.entidad === 'Nacional' || !o.entidad) &&
        o.periodo.startsWith('2025')
      );
      const anual = obs.find(o => !o.periodo.includes('-'));
      if (anual && (anual.valor != null || anual.meta != null)) {
        if (typeof anual.meta === 'number') { totalProgramado += anual.meta; hayProgramado = true; }
        if (typeof anual.valor === 'number') { totalAlcanzado += anual.valor; hayAlcanzado = true; }
      } else {
        const meses = obs.filter(o => o.periodo.includes('-'));
        meses.forEach(m => {
          if (typeof m.meta === 'number') { totalProgramado += m.meta; hayProgramado = true; }
          if (typeof m.valor === 'number') { totalAlcanzado += m.valor; hayAlcanzado = true; }
        });
      }
    });
    return {
      programado: hayProgramado ? totalProgramado : null,
      alcanzado: hayAlcanzado ? totalAlcanzado : null,
      avance: hayProgramado && totalProgramado > 0 ? (totalAlcanzado / totalProgramado) * 100 : null,
    };
  }, [ind2025, observations]);

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
                  Programa Operativo Anual 2025 de la PROFEPA
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
                  <Link href="/indicadores?anio=2025" className="group inline-flex items-center gap-2 bg-white text-gob-green-600 px-8 py-4 rounded-2xl font-bold text-sm hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:-translate-y-1">
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
                    <div className="text-4xl md:text-5xl font-bold">24</div>
                    <div className="text-white/80 mt-1 text-sm font-medium">Indicadores</div>
                  </div>
                  <div className="glass p-6 rounded-2xl text-center hover:bg-white/15 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold">14,206</div>
                    <div className="text-white/80 mt-1 text-sm font-medium">Registros</div>
                  </div>
                  <div className="glass p-6 rounded-2xl text-center col-span-2 hover:bg-white/15 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold">1</div>
                    <div className="text-white/80 mt-1 text-sm font-medium">Programa Operativo Anual</div>
                  </div>
                </div>
              </FadeSection>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ 2. CHARTS ═══════ */}
      {!loading && indicators.length > 0 && (
        <section className="relative pb-8 pt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-6">
              <MapaPorEstado observations={observations} indicators={indicators} />
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
                Durante 2025 la PROFEPA opera el Programa Operativo Anual de Inspección y Vigilancia del Medio Ambiente y los Recursos Naturales, cuyo fin es contribuir al bienestar social e igualdad mediante la ejecución de acciones de inspección y vigilancia en materia de recursos naturales e industria, la promoción y atención de la denuncia ambiental ciudadana, así como el impulso de los mecanismos voluntarios de mejora del desempeño ambiental en los sectores productivos, garantizando el acceso a la justicia ambiental mediante la aplicación de la normatividad correspondiente.
              </p>
              <p className="text-gray-700 text-justify leading-relaxed mt-4">
                A través del Programa Operativo Anual, la PROFEPA fortalece las acciones de prevención, inspección y vigilancia que permiten supervisar y hacer cumplir la regulación en materia de biodiversidad, protección, conservación, restauración y aprovechamiento sustentable de los recursos naturales en beneficio de la población y los ecosistemas de México.
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
                desc: 'Explora los indicadores del Programa Operativo Anual con sus definiciones, metas y avances.',
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

          <div className="grid gap-8 max-w-xl mx-auto">
            <FadeSection delay={0.1}>
              <Link href="/indicadores?anio=2025" className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gob-green-200 hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="badge-gob">POA</span>
                  <span className="text-4xl font-bold text-gob-green-500 group-hover:text-gob-green-600 transition-colors">
                    2025
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-2">Indicadores 2025</h3>
                <p className="text-gray-600 mb-4">
                  Programa Operativo Anual (datos mensuales por estado) del ejercicio fiscal 2025.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gob-green-500 font-medium">
                    <span>Ver {ind2025.length} indicadores</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
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
                  <Link href={`/indicadores/${ind.id}?anio=2025`} className="card-hover group h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-gob">POA</span>
                      <span className="badge-gray">2025</span>
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
                <Link href="/indicadores?anio=2025" className="btn-primary px-10 py-4">
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
                  La información presentada en este tablero proviene del Programa Operativo Anual (POA) de la PROFEPA y se publica con fines informativos. Integra los avances de las metas reportadas por las 32 Oficinas de Representación de Protección Ambiental y Gestión Territorial (ORPAyGTs), permitiendo dar seguimiento al cumplimiento de los indicadores institucionales y fortalecer la transparencia. La interpretación oficial de los datos corresponde a PROFEPA.
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
      {metadata && metadata.fuentes_procesadas && metadata.fuentes_procesadas.some(f => f.nombre?.toUpperCase().startsWith('POA')) && (
        <section className="section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <FadeSection>
              <h2 className="section-title text-center">Fuentes de datos</h2>
            </FadeSection>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metadata.fuentes_procesadas.filter(f => f.nombre?.toUpperCase().startsWith('POA')).map((fuente, index) => (
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
