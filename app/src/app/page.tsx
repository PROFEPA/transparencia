'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Indicator, Metadata, Observation } from '@/types';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const COLORS = ['#235B4E', '#BC955C', '#691C32', '#10B981', '#3B82F6', '#8B5CF6'];

/* ── Animated Counter ── */
function AnimatedCounter({ end, duration = 2, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

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

/* ── Floating orbs for hero ── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gob-green-400/10 rounded-full blur-3xl animate-float" />
      <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] bg-gob-gold-500/8 rounded-full blur-3xl animate-float-delay" />
      <div className="absolute -bottom-20 right-1/3 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl animate-float-slow" />
    </div>
  );
}

export default function HomePage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

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

  const nivelData = useMemo(() => {
    const counts: Record<string, number> = {};
    indicators.forEach(i => { if (i.nivel) counts[i.nivel] = (counts[i.nivel] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [indicators]);

  const anioData = [
    { name: '2025', indicadores: ind2025.length, color: '#235B4E' },
    { name: '2026', indicadores: ind2026.length, color: '#BC955C' }
  ];

  const kpis = [
    { label: 'Indicadores', value: indicators.length, icon: '📊', color: 'from-emerald-500 to-teal-600' },
    { label: 'Registros', value: observations.length, icon: '📈', color: 'from-blue-500 to-indigo-600' },
    { label: 'Programas', value: new Set(indicators.map(i => i.programa)).size, icon: '🏛️', color: 'from-amber-500 to-orange-600' },
    { label: 'Fuentes', value: metadata?.fuentes_procesadas?.length || 0, icon: '📂', color: 'from-purple-500 to-violet-600' },
  ];

  return (
    <div className="bg-mesh">
      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center bg-gradient-animated overflow-hidden">
        <FloatingOrbs />
        <div className="absolute inset-0 dot-pattern opacity-30" />
        
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-8">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/80 text-sm font-medium">Datos actualizados · Marzo 2026</span>
                </div>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6"
              >
                Tablero de
                <br />
                <span className="text-gradient-gold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #d4aa6a, #BC955C, #d4aa6a)' }}>
                  Indicadores
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-lg text-white/70 mb-10 max-w-lg leading-relaxed"
              >
                Inspección y vigilancia del medio ambiente y los recursos naturales. 
                Información pública, transparente y accesible.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-wrap gap-4"
              >
                <Link href="/indicadores" className="group relative inline-flex items-center gap-2 bg-white text-gob-green-600 px-8 py-4 rounded-2xl font-bold text-sm hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:-translate-y-1">
                  Explorar indicadores
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="/descargas" className="btn-secondary px-8 py-4 rounded-2xl">
                  Descargar datos
                </Link>
              </motion.div>
            </div>

            {/* Hero KPIs */}
            {!loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 1, delay: 0.6 }}
                className="grid grid-cols-2 gap-4"
              >
                {kpis.map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 + i * 0.15 }}
                    className="glass p-6 rounded-2xl text-center group hover:bg-white/15 transition-all duration-300"
                  >
                    <div className="text-3xl mb-2">{kpi.icon}</div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
                      <AnimatedCounter end={kpi.value} duration={1.5 + i * 0.3} />
                    </div>
                    <div className="text-white/60 text-sm font-medium">{kpi.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div 
            animate={{ y: [0, 8, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ CHARTS DASHBOARD ═══════ */}
      {!loading && indicators.length > 0 && (
        <section className="relative -mt-16 z-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-3 gap-6">
              <FadeSection delay={0.1}>
                <div className="card p-8 glow-green">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gob-green-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-800">Por Año Fiscal</h3>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={anioData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="indicadores" radius={[12, 12, 0, 0]}>
                          {anioData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </FadeSection>

              <FadeSection delay={0.2}>
                <div className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-800">Por Nivel MIR</h3>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={nivelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                          {nivelData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {nivelData.map((d, i) => (
                      <span key={d.name} className="text-xs font-medium flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {d.name} ({d.value})
                      </span>
                    ))}
                  </div>
                </div>
              </FadeSection>

              <FadeSection delay={0.3}>
                <div className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-800">Cobertura</h3>
                  </div>
                  <div className="space-y-5 mt-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">2025</span>
                        <span className="font-bold text-gob-green-600">{ind2025.length} indicadores</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(ind2025.length / indicators.length) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-gob-green-500 to-emerald-400 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">2026</span>
                        <span className="font-bold text-gob-gold-600">{ind2026.length} indicadores</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(ind2026.length / indicators.length) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-gob-gold-500 to-amber-400 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">Ambos años</span>
                        <span className="font-bold text-violet-600">{indicators.filter(i => (i.anios?.length || 0) > 1).length} indicadores</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(indicators.filter(i => (i.anios?.length || 0) > 1).length / indicators.length) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.6 }}
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </FadeSection>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ ABOUT ═══════ */}
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <div className="text-center mb-16">
              <h2 className="section-title">¿Qué es este tablero?</h2>
              <p className="section-subtitle">
                Una plataforma de datos abiertos para la ciudadanía sobre el desempeño ambiental de PROFEPA
              </p>
            </div>
          </FadeSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                title: 'Consulta indicadores',
                desc: 'Explora indicadores del POA y MIR con definiciones, metas y avances en tiempo real.',
                color: 'bg-emerald-50 text-emerald-600',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />,
                title: 'Visualiza tendencias',
                desc: 'Gráficas interactivas mensuales por entidad federativa con comparativos anuales.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
                title: 'Descarga datos',
                desc: 'Datasets en formatos abiertos (CSV, JSON) disponibles para análisis independiente.',
                color: 'bg-violet-50 text-violet-600',
              },
            ].map((item, i) => (
              <FadeSection key={item.title} delay={i * 0.15}>
                <div className="card-hover p-8 h-full group">
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ YEAR CARDS ═══════ */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <div className="text-center mb-16">
              <h2 className="section-title">Consulta por año fiscal</h2>
              <p className="section-subtitle">Selecciona el ejercicio fiscal para explorar sus indicadores</p>
            </div>
          </FadeSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <FadeSection delay={0.1}>
              <Link href="/indicadores?anio=2025" className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-gob-green-500 to-gob-green-700 p-10 text-white hover:shadow-2xl hover:shadow-gob-green-500/20 transition-all duration-500 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-xs font-bold mb-6">POA / MIR</span>
                  <div className="text-6xl font-black mb-4 tracking-tight">2025</div>
                  <p className="text-white/70 mb-6 max-w-[280px]">
                    Programa Operativo Anual con datos mensuales completos y Matriz de Indicadores para Resultados.
                  </p>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    Ver {ind2025.length} indicadores
                    <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </FadeSection>

            <FadeSection delay={0.25}>
              <Link href="/indicadores?anio=2026" className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-gob-gold-600 to-gob-gold-700 p-10 text-white hover:shadow-2xl hover:shadow-gob-gold-500/20 transition-all duration-500 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-xs font-bold mb-6">POA / FiME</span>
                  <div className="text-6xl font-black mb-4 tracking-tight">2026</div>
                  <p className="text-white/70 mb-6 max-w-[280px]">
                    Nuevo programa presupuestario G014 con corte a febrero y estructura reorganizada.
                  </p>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    Ver {ind2026.length} indicadores
                    <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ═══════ HIGHLIGHTED INDICATORS ═══════ */}
      {!loading && indicators.length > 0 && (
        <section className="section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <FadeSection>
              <div className="text-center mb-16">
                <h2 className="section-title">Indicadores destacados</h2>
                <p className="section-subtitle">Algunos indicadores clave de la gestión ambiental</p>
              </div>
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
                ];
                return highlightNames.some(h => ind.nombre.startsWith(h));
              }).map((ind, i) => (
                <FadeSection key={ind.id} delay={i * 0.1}>
                  <Link href={`/indicadores/${ind.id}`} className="card-hover group h-full flex flex-col">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
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
                    <h3 className="font-bold text-gray-900 group-hover:text-gob-green-600 transition-colors mb-3 leading-snug line-clamp-2">
                      {ind.nombre}
                    </h3>
                    {ind.unidad_medida && (
                      <p className="text-sm text-gray-400 mb-4">Mide: {ind.unidad_medida}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <span className="text-sm font-semibold text-gob-green-600 flex items-center gap-1.5 group-hover:gap-3 transition-all">
                        Ver detalle
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                </FadeSection>
              ))}
            </div>

            <FadeSection>
              <div className="text-center mt-12">
                <Link href="/indicadores" className="btn-primary text-base px-10 py-4">
                  Ver todos los indicadores
                </Link>
              </div>
            </FadeSection>
          </div>
        </section>
      )}

      {/* ═══════ INSTITUTIONAL INFO ═══════ */}
      <section className="section bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <div className="relative rounded-3xl bg-gradient-to-br from-gray-50 to-white p-10 md:p-14 border border-gray-100">
              <div className="absolute top-6 right-6">
                <svg className="w-16 h-16 text-gob-green-500/10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Sobre PROFEPA</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-[15px]">
                <p>La Procuraduría Federal de Protección al Ambiente tiene como objeto la procuración de la justicia ambiental, la defensa del derecho humano a un medio ambiente sano, y la protección del ambiente y de la biodiversidad.</p>
                <p>Durante 2025 la PROFEPA contaba con el Programa Presupuestario G005 &ldquo;Inspección y Vigilancia del Medio Ambiente y Recursos Naturales&rdquo;. En 2026, opera el G014 &ldquo;Inspección, Vigilancia y Regulación del Medio Ambiente y Recursos Naturales&rdquo;, resultado de la Estrategia de Simplificación de la Estructura Programática 2026.</p>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ═══════ TRANSPARENCY NOTICE ═══════ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeSection>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gob-green-500 to-gob-green-600 p-10 md:p-14 text-white">
              <div className="absolute inset-0 dot-pattern opacity-20" />
              <div className="relative max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">Transparencia y datos abiertos</h2>
                <p className="text-white/80 mb-8 leading-relaxed">
                  La información presentada proviene de documentos institucionales oficiales (POA, MIR, FiME) y se publica para impulsar la transparencia y la rendición de cuentas.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/metodologia" className="inline-flex items-center gap-2 bg-white text-gob-green-600 px-6 py-3 rounded-xl font-semibold text-sm hover:shadow-lg transition-all">
                    Ver metodología
                  </Link>
                  <Link href="/glosario" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all">
                    Consultar glosario
                  </Link>
                </div>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>
    </div>
  );
}
