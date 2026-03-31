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
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page">Metodología y fuentes</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Metodología y fuentes</h1>
          <p className="text-gray-600">
            Información sobre el origen de los datos, proceso de extracción y 
            definiciones utilizadas en este tablero.
          </p>
        </div>

        {/* Tabla de contenidos */}
        <div className="card mb-8">
          <h2 className="font-bold text-lg mb-4">Contenido</h2>
          <nav>
            <ul className="space-y-2 text-gob-green-600">
              <li><a href="#fuentes" className="hover:underline">1. Fuentes de información</a></li>
              <li><a href="#proceso" className="hover:underline">2. Proceso de extracción</a></li>
              <li><a href="#diccionario" className="hover:underline">3. Diccionario de datos</a></li>
              <li><a href="#limitaciones" className="hover:underline">4. Limitaciones y consideraciones</a></li>
              <li><a href="#versiones" className="hover:underline">5. Control de versiones</a></li>
            </ul>
          </nav>
        </div>

        {/* Sección: Fuentes */}
        <section id="fuentes" className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-4">1. Fuentes de información</h2>
          </FadeIn>
          <FadeIn>
            <div className="prose max-w-none text-gray-700">
              <p className="mb-4">
                Los datos presentados en este tablero provienen exclusivamente de 
                documentos institucionales oficiales de la Procuraduría Federal de 
                Protección al Ambiente (PROFEPA). Las fuentes incluyen:
              </p>
            </div>
          </FadeIn>

          <div className="space-y-4 mt-6">
            <FadeIn>
              <div className="card bg-gray-50">
                <h3 className="font-bold text-lg mb-2">POA - Programa Operativo Anual</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Documento que establece las metas y actividades programadas por 
                  PROFEPA para cada ejercicio fiscal. Contiene indicadores de gestión 
                  y desempeño a nivel operativo.
                </p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Archivo: POA_2025.xlsx</span>
                  <span>Año: 2025</span>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="card bg-gray-50">
                <h3 className="font-bold text-lg mb-2">MIR - Matriz de Indicadores para Resultados</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Herramienta de planeación estratégica que permite vincular los 
                  distintos instrumentos para el diseño, organización, ejecución, 
                  seguimiento, evaluación y mejora de los programas presupuestarios.
                </p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Archivo: MIR_G005_2025.xlsx</span>
                  <span>Programa: G005</span>
                  <span>Año: 2025</span>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="card bg-gray-50">
                <h3 className="font-bold text-lg mb-2">FiME - Ficha de Indicadores de Monitoreo y Evaluación</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Documento que contiene la descripción detallada de cada indicador, 
                  incluyendo definición, método de cálculo, unidad de medida, 
                  frecuencia de medición y metas.
                </p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Archivo: FiME 2026 PFPA.xlsx</span>
                  <span>Año: 2026</span>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="card bg-gray-50">
                <h3 className="font-bold text-lg mb-2">Documentación para Auditoría</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Documento narrativo que describe los programas, objetivos, 
                  propósitos e indicadores del programa G014 para efectos de 
                  auditoría y rendición de cuentas.
                </p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Archivo: G014 para Auditoría.docx</span>
                  <span>Programa: G014</span>
                  <span>Año: 2026</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Sección: Proceso */}
        <section id="proceso" className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-4">2. Proceso de extracción</h2>
          </FadeIn>
          <FadeIn>
            <div className="prose max-w-none text-gray-700">
              <p className="mb-4">
                Los datos son procesados mediante un pipeline de ETL (Extracción, 
                Transformación y Carga) automatizado que:
              </p>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>Lee los archivos Excel y Word desde las fuentes originales</li>
                <li>Identifica automáticamente las hojas y secciones relevantes</li>
                <li>Extrae indicadores, definiciones, metas y valores</li>
                <li>Normaliza los datos a un esquema unificado</li>
                <li>Genera archivos JSON y CSV para publicación</li>
                <li>Produce un reporte de calidad de datos</li>
              </ol>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> El proceso de extracción es semi-automático. 
                  Algunos campos pueden requerir validación manual, especialmente 
                  cuando la estructura de los documentos fuente varía.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 border rounded-xl">
                <div className="text-3xl mb-2">📥</div>
                <h4 className="font-bold">Extracción</h4>
                <p className="text-sm text-gray-500">Lectura de archivos fuente</p>
              </div>
              <div className="text-center p-4 border rounded-xl">
                <div className="text-3xl mb-2">⚙️</div>
                <h4 className="font-bold">Transformación</h4>
                <p className="text-sm text-gray-500">Normalización y limpieza</p>
              </div>
              <div className="text-center p-4 border rounded-xl">
                <div className="text-3xl mb-2">📤</div>
                <h4 className="font-bold">Carga</h4>
                <p className="text-sm text-gray-500">Publicación de datos</p>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Sección: Diccionario */}
        <section id="diccionario" className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-4">3. Diccionario de datos</h2>
            <p className="text-gray-600 mb-6">
              Descripción de cada campo presente en los datasets publicados:
            </p>
          </FadeIn>

          {dictionary?.columnas ? (
            <div className="space-y-4">
              {dictionary.columnas.map((col, index) => (
                <FadeIn key={index} delay={index * 0.03}>
                  <div className="card border-l-4 border-gob-green-500">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{col.columna}</code>
                      <span className="badge-gray">{col.tipo_dato}</span>
                    </div>
                    <p className="text-gray-700">{col.descripcion}</p>
                    {col.ejemplo && (
                      <p className="text-sm text-gray-500 mt-2">
                        <strong>Ejemplo:</strong> {col.ejemplo}
                      </p>
                    )}
                    {col.valores_permitidos && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">Valores permitidos: </span>
                        {col.valores_permitidos.map((val, i) => (
                          <span key={i} className="badge-gray text-xs ml-1">{val}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          ) : (
            <div className="card bg-gray-50 text-center p-8">
              <p className="text-gray-500">Cargando diccionario de datos...</p>
            </div>
          )}
        </section>

        {/* Sección: Limitaciones */}
        <section id="limitaciones" className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-4">4. Limitaciones y consideraciones</h2>
          </FadeIn>
          <div className="space-y-4">
            <FadeIn>
              <div className="card bg-red-50 border-l-4 border-red-400">
                <h3 className="font-bold mb-2">Interpretación oficial</h3>
                <p className="text-sm text-gray-700">
                  La información presentada en este tablero tiene fines informativos. 
                  La interpretación oficial de los datos corresponde exclusivamente a PROFEPA.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="card bg-yellow-50 border-l-4 border-yellow-400">
                <h3 className="font-bold mb-2">Datos incompletos</h3>
                <p className="text-sm text-gray-700">
                  Algunos indicadores pueden no contar con series temporales completas. 
                  Esto puede deberse a que el indicador es nuevo, a cambios metodológicos, 
                  o a que la información no está disponible en las fuentes originales.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="card bg-blue-50 border-l-4 border-blue-400">
                <h3 className="font-bold mb-2">Periodicidad</h3>
                <p className="text-sm text-gray-700">
                  Los datos se actualizan cuando PROFEPA publica nuevas versiones 
                  de los documentos fuente. La frecuencia de actualización depende 
                  del ciclo de planeación institucional.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="card bg-gray-50 border-l-4 border-gray-400">
                <h3 className="font-bold mb-2">Privacidad</h3>
                <p className="text-sm text-gray-700">
                  Este tablero no muestra datos personales. Toda la información 
                  publicada corresponde a datos institucionales agregados.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Sección: Versiones */}
        <section id="versiones" className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-4">5. Control de versiones</h2>
          </FadeIn>
          <FadeIn>
            <div className="card">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Versión</th>
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3">
                      <span className="badge-gob">{metadata?.version || '1.0.0'}</span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {metadata?.fecha_extraccion 
                        ? new Date(metadata.fecha_extraccion).toLocaleDateString('es-MX')
                        : 'Fecha no disponible'}
                    </td>
                    <td className="py-3 text-sm">
                      Versión inicial del tablero con datos POA 2025, MIR G005 2025, 
                      FiME 2026 y documentación G014.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FadeIn>
        </section>

        {/* Contacto */}
        <FadeIn>
          <div className="card bg-gob-green-50 border-gob-green-200">
            <h2 className="font-bold text-lg mb-2">¿Tienes dudas sobre la metodología?</h2>
            <p className="text-gray-700 text-sm mb-4">
              Para consultas sobre la interpretación de los datos o la metodología 
              utilizada, puedes contactar a PROFEPA a través de sus canales oficiales.
            </p>
            <a href="https://www.gob.mx/profepa" target="_blank" rel="noopener noreferrer"
              className="btn-primary inline-flex items-center">
              Ir al sitio oficial de PROFEPA
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
