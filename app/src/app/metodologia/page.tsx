'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DataDictionary, Metadata } from '@/types';

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export default function MetodologiaPage() {
  const [dictionary, setDictionary] = useState<DataDictionary | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [dictRes, metaRes] = await Promise.all([
          fetch('/data/data_dictionary.json'), fetch('/data/metadata.json')
        ]);
        if (dictRes.ok) setDictionary(await dictRes.json());
        if (metaRes.ok) setMetadata(await metaRes.json());
      } catch (error) { console.error('Error:', error); }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gob-green-600 via-gob-green-500 to-gob-green-700 overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <nav className="text-sm text-white/50 mb-6 flex items-center gap-2">
              <Link href="/" className="hover:text-white/80 transition-colors">Inicio</Link><span>/</span>
              <span className="text-white/80">Metodología</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">Metodología y fuentes</h1>
            <p className="text-white/70 max-w-2xl text-lg">Origen de los datos, proceso de extracción y definiciones del tablero.</p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* TOC */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6 -mt-12 relative z-10 mb-12">
          <h2 className="font-bold text-gray-800 mb-4">Contenido</h2>
          <nav className="grid sm:grid-cols-2 gap-2">
            {['Fuentes de información', 'Proceso de extracción', 'Diccionario de datos', 'Limitaciones', 'Control de versiones'].map((item, i) => (
              <a key={item} href={`#sec-${i + 1}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <span className="w-8 h-8 rounded-lg bg-gob-green-50 text-gob-green-600 flex items-center justify-center text-sm font-bold group-hover:bg-gob-green-500 group-hover:text-white transition-colors">{i + 1}</span>
                <span className="text-sm font-medium text-gray-700">{item}</span>
              </a>
            ))}
          </nav>
        </motion.div>

        {/* 1: Fuentes */}
        <section id="sec-1" className="mb-16">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gob-green-500 text-white flex items-center justify-center text-lg font-bold">1</span>
              Fuentes de información
            </h2>
          </FadeIn>
          <FadeIn>
            <p className="text-gray-600 mb-6 leading-relaxed">Los datos provienen exclusivamente de documentos institucionales oficiales de PROFEPA.</p>
          </FadeIn>
          <div className="space-y-4">
            {[
              { title: 'POA - Programa Operativo Anual', desc: 'Metas y actividades de cada ejercicio fiscal con indicadores de gestión operativo.', file: 'POA_2025.xlsx', year: '2025' },
              { title: 'MIR - Matriz de Indicadores para Resultados', desc: 'Planeación estratégica vinculando objetivos con indicadores de medición.', file: 'MIR_G005_2025.xlsx', year: '2025', prog: 'G005' },
              { title: 'FiME - Ficha de Indicadores de Monitoreo y Evaluación', desc: 'Descripción detallada de cada indicador: definición, método de cálculo, frecuencia y metas.', file: 'FiME 2026 PFPA.xlsx', year: '2026' },
            ].map((src, i) => (
              <FadeIn key={src.title} delay={i * 0.1}>
                <div className="card-hover border-l-4 border-gob-green-500">
                  <h3 className="font-bold text-gray-900 mb-2">{src.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">{src.desc}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="badge-gray">{src.file}</span>
                    <span className="badge-gob">{src.year}</span>
                    {src.prog && <span className="badge-gray">{src.prog}</span>}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* 2: Proceso */}
        <section id="sec-2" className="mb-16">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gob-green-500 text-white flex items-center justify-center text-lg font-bold">2</span>
              Proceso de extracción
            </h2>
          </FadeIn>
          <FadeIn>
            <p className="text-gray-600 mb-6 leading-relaxed">Pipeline ETL automatizado que procesa los documentos fuente:</p>
          </FadeIn>
          <FadeIn>
            <ol className="space-y-3 mb-8">
              {['Lee archivos Excel desde las fuentes originales', 'Identifica hojas y secciones relevantes', 'Extrae indicadores, definiciones y metas', 'Normaliza datos a un esquema unificado', 'Genera archivos JSON y CSV', 'Produce reporte de calidad de datos'].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-gob-green-50 text-gob-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </FadeIn>
          <FadeIn>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: '📥', title: 'Extracción', desc: 'Lectura de archivos fuente', color: 'from-emerald-50 to-white border-emerald-200' },
                { icon: '⚙️', title: 'Transformación', desc: 'Normalización y limpieza', color: 'from-blue-50 to-white border-blue-200' },
                { icon: '📤', title: 'Carga', desc: 'Publicación de datos', color: 'from-violet-50 to-white border-violet-200' },
              ].map(step => (
                <div key={step.title} className={`text-center p-6 rounded-2xl bg-gradient-to-b border ${step.color}`}>
                  <div className="text-3xl mb-3">{step.icon}</div>
                  <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-6">
              <p className="text-sm text-amber-800"><strong>Nota:</strong> El proceso es semi-automático. Algunos campos pueden requerir validación manual.</p>
            </div>
          </FadeIn>
        </section>

        {/* 3: Diccionario */}
        <section id="sec-3" className="mb-16">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gob-green-500 text-white flex items-center justify-center text-lg font-bold">3</span>
              Diccionario de datos
            </h2>
          </FadeIn>
          {dictionary?.columnas ? (
            <div className="space-y-3">
              {dictionary.columnas.map((col, i) => (
                <FadeIn key={i} delay={i * 0.03}>
                  <div className="card-hover border-l-4 border-gob-green-500">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-mono font-semibold text-gray-800">{col.columna}</code>
                      <span className="badge-gray">{col.tipo_dato}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{col.descripcion}</p>
                    {col.ejemplo && <p className="text-xs text-gray-400 mt-2"><strong>Ejemplo:</strong> {col.ejemplo}</p>}
                    {col.valores_permitidos && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {col.valores_permitidos.map((val, j) => <span key={j} className="badge-gray text-xs">{val}</span>)}
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          ) : (
            <div className="card p-10 text-center"><div className="w-10 h-10 border-4 border-gob-green-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="mt-3 text-gray-500 text-sm">Cargando diccionario...</p></div>
          )}
        </section>

        {/* 4: Limitaciones */}
        <section id="sec-4" className="mb-16">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gob-green-500 text-white flex items-center justify-center text-lg font-bold">4</span>
              Limitaciones y consideraciones
            </h2>
          </FadeIn>
          <div className="space-y-4">
            {[
              { title: 'Interpretación oficial', desc: 'La interpretación oficial de los datos corresponde exclusivamente a PROFEPA.', color: 'border-red-400 bg-red-50' },
              { title: 'Datos incompletos', desc: 'Algunos indicadores pueden no contar con series temporales completas.', color: 'border-yellow-400 bg-yellow-50' },
              { title: 'Periodicidad', desc: 'Los datos se actualizan cuando PROFEPA publica nuevas versiones de los documentos fuente.', color: 'border-blue-400 bg-blue-50' },
              { title: 'Privacidad', desc: 'Este tablero no muestra datos personales. Toda la información es institucional y agregada.', color: 'border-gray-300 bg-gray-50' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <div className={`rounded-2xl border-l-4 p-5 ${item.color}`}>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-700">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* 5: Versiones */}
        <section id="sec-5" className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gob-green-500 text-white flex items-center justify-center text-lg font-bold">5</span>
              Control de versiones
            </h2>
          </FadeIn>
          <FadeIn>
            <div className="card p-8">
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Versión</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 px-4"><span className="badge-gob">{metadata?.version || '1.0.0'}</span></td>
                      <td className="py-3 px-4 text-gray-500">{metadata?.fecha_extraccion ? new Date(metadata.fecha_extraccion).toLocaleDateString('es-MX') : '-'}</td>
                      <td className="py-3 px-4 text-gray-700">Versión inicial con datos POA 2025, MIR G005 2025 y POA 2026.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        </section>
      </div>
    </div>
  );
}
