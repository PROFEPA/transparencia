'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Metadata, DataQualityReport } from '@/types';

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export default function DescargasPage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [quality, setQuality] = useState<DataQualityReport | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [metaRes, qualityRes] = await Promise.all([
          fetch('/data/metadata.json'), fetch('/data/data_quality_report.json')
        ]);
        if (metaRes.ok) setMetadata(await metaRes.json());
        if (qualityRes.ok) setQuality(await qualityRes.json());
      } catch (error) { console.error('Error cargando datos:', error); }
    }
    loadData();
  }, []);

  const downloads = [
    { title: 'Indicadores completos', description: 'Catálogo de todos los indicadores con metadatos.', formats: [{ name: 'CSV', url: '/data/indicators.csv', icon: '📊' }, { name: 'JSON', url: '/data/indicators.json', icon: '📋' }], count: metadata?.total_indicadores || '-' },
    { title: 'Observaciones / Series temporales', description: 'Datos históricos de valores y metas por periodo.', formats: [{ name: 'CSV', url: '/data/observations.csv', icon: '📊' }, { name: 'JSON', url: '/data/observations.json', icon: '📋' }], count: metadata?.total_observaciones || '-' },
    { title: 'Indicadores 2025', description: 'POA y MIR 2025.', formats: [{ name: 'CSV', url: '/data/indicators_2025.csv', icon: '📊' }, { name: 'JSON', url: '/data/indicators_2025.json', icon: '📋' }], badge: '2025' },
    { title: 'Indicadores 2026', description: 'POA y documentación 2026.', formats: [{ name: 'CSV', url: '/data/indicators_2026.csv', icon: '📊' }, { name: 'JSON', url: '/data/indicators_2026.json', icon: '📋' }], badge: '2026' },
    { title: 'Diccionario de datos', description: 'Definición de cada campo.', formats: [{ name: 'JSON', url: '/data/data_dictionary.json', icon: '📋' }] },
    { title: 'Reporte de calidad', description: 'Validez y completitud.', formats: [{ name: 'JSON', url: '/data/data_quality_report.json', icon: '📋' }] },
    { title: 'Metadatos del dataset', description: 'Fuentes y fecha de extracción.', formats: [{ name: 'JSON', url: '/data/metadata.json', icon: '📋' }] },
  ];

  const originalDocuments = [
    { title: 'POA 2025', description: 'Programa Operativo Anual 2025.', formats: [{ name: 'Excel', url: '/documents/POA_2025.xlsx', icon: '📑' }], badge: '2025' },
    { title: 'MIR G005 2025', description: 'Matriz de Indicadores para Resultados G005.', formats: [{ name: 'Excel', url: '/documents/MIR_G005_2025.xlsx', icon: '📑' }], badge: '2025' },
    { title: 'FiME 2026', description: 'Ficha de Monitoreo y Evaluación 2026.', formats: [{ name: 'Excel', url: '/documents/FiME 2026 PFPA.xlsx', icon: '📑' }], badge: '2026' },
    { title: 'G014 para Auditoría', description: 'Documento G014 para Auditoría.', formats: [{ name: 'Word', url: '/documents/G014 para Auditoría.docx', icon: '📄' }] },
  ];

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
              <span className="text-white/80">Descargas</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">Descargas de datos</h1>
            <p className="text-white/70 max-w-2xl text-lg">Datasets completos en formatos abiertos (CSV, JSON) para análisis independiente.</p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* KPIs */}
        {(metadata || quality) && (
          <FadeIn className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-14 relative z-10 mb-10">
            <div className="card p-6 text-center"><div className="text-3xl font-extrabold text-gob-green-600">{metadata?.total_indicadores || '-'}</div><div className="text-sm text-gray-500 mt-1">Indicadores</div></div>
            <div className="card p-6 text-center"><div className="text-3xl font-extrabold text-blue-600">{metadata?.total_observaciones?.toLocaleString() || '-'}</div><div className="text-sm text-gray-500 mt-1">Observaciones</div></div>
            <div className="card p-6 text-center"><div className="text-3xl font-extrabold text-emerald-600">{quality?.resumen?.porcentaje_validas?.toFixed(0) || '-'}%</div><div className="text-sm text-gray-500 mt-1">Datos válidos</div></div>
            <div className="card p-6 text-center"><div className="text-3xl font-extrabold text-violet-600">{metadata?.version || '1.0'}</div><div className="text-sm text-gray-500 mt-1">Versión</div></div>
          </FadeIn>
        )}

        {/* Notice */}
        <FadeIn className="mb-10">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-blue-900 mb-1">Aviso de uso de datos</h3>
                <p className="text-sm text-blue-700">La información proviene de documentos institucionales de PROFEPA y se publica con fines de transparencia. La interpretación oficial corresponde a PROFEPA.</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Downloads */}
        <div className="space-y-4 mb-16">
          {downloads.map((dl, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="card-hover flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{dl.title}</h3>
                    {dl.badge && <span className="badge-gob">{dl.badge}</span>}
                    {dl.count && <span className="badge-gray">{dl.count} registros</span>}
                  </div>
                  <p className="text-sm text-gray-500">{dl.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dl.formats.map((fmt, fi) => (
                    <a key={fi} href={fmt.url} download className="inline-flex items-center gap-2 bg-gob-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gob-green-600 hover:-translate-y-0.5 transition-all shadow-sm">
                      <span>{fmt.icon}</span> {fmt.name}
                    </a>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Original docs */}
        <FadeIn>
          <h2 className="section-title mb-8">Documentos originales</h2>
        </FadeIn>
        <div className="space-y-4 mb-16">
          {originalDocuments.map((doc, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="card-hover border-l-4 border-gob-green-500 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{doc.title}</h3>
                    {doc.badge && <span className="badge-gob">{doc.badge}</span>}
                  </div>
                  <p className="text-sm text-gray-500">{doc.description}</p>
                </div>
                <div className="flex gap-2">
                  {doc.formats.map((fmt, fi) => (
                    <a key={fi} href={fmt.url} download className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:-translate-y-0.5 transition-all">
                      <span>{fmt.icon}</span> {fmt.name}
                    </a>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Sources table */}
        {metadata?.fuentes_procesadas && (
          <FadeIn>
            <div className="card p-8 mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Fuentes procesadas</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Nombre</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Archivo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Programa</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Año</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {metadata.fuentes_procesadas.map((f, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{f.nombre}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{f.archivo}</td>
                        <td className="py-3 px-4"><span className="badge-gray">{f.tipo.toUpperCase()}</span></td>
                        <td className="py-3 px-4">{f.programa}</td>
                        <td className="py-3 px-4">{f.anio}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Completeness */}
        {quality?.completitud_indicadores && (
          <FadeIn>
            <div className="card p-8 mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Completitud de datos</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(quality.completitud_indicadores).map(([campo, valor]) => (
                  <div key={campo} className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className={`text-2xl font-extrabold ${(valor as number) >= 80 ? 'text-emerald-600' : (valor as number) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{(valor as number).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">{campo.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {metadata?.fecha_extraccion && (
          <p className="text-center text-sm text-gray-400 mb-8">
            Última actualización: {new Date(metadata.fecha_extraccion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}
