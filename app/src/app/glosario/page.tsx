'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface GlosarioTerm {
  termino: string;
  definicion: string;
  ejemplos?: string[];
}

const glosarioTerms: GlosarioTerm[] = [
  { termino: "Indicador", definicion: "Expresión cuantitativa o cualitativa que permite medir el grado de cumplimiento de los objetivos y metas establecidos.", ejemplos: ["Porcentaje de inspecciones realizadas", "Número de empresas verificadas"] },
  { termino: "Meta", definicion: "Valor objetivo que se espera alcanzar para un indicador en un periodo determinado. Las metas sirven como referencia para medir el avance.", ejemplos: ["Meta anual: 500 inspecciones", "Meta trimestral: 90% de cumplimiento"] },
  { termino: "Avance", definicion: "Valor alcanzado del indicador en un momento determinado. Se compara contra la meta para determinar el porcentaje de cumplimiento." },
  { termino: "Avance porcentual", definicion: "Relación entre el valor alcanzado y la meta establecida, expresada como porcentaje: (Avance / Meta) × 100.", ejemplos: ["Si la meta es 100 y el avance es 85, el avance porcentual es 85%"] },
  { termino: "Unidad de medida", definicion: "Forma en la que se expresa cuantitativamente el indicador.", ejemplos: ["Porcentaje", "Número", "Índice", "Pesos", "Hectáreas"] },
  { termino: "POA - Programa Operativo Anual", definicion: "Instrumento de planeación que establece las metas y actividades a realizar durante un ejercicio fiscal." },
  { termino: "MIR - Matriz de Indicadores para Resultados", definicion: "Herramienta de planeación estratégica organizada en una matriz de cuatro filas (Fin, Propósito, Componentes, Actividades) y cuatro columnas." },
  { termino: "FiME - Ficha de Indicadores de Monitoreo y Evaluación", definicion: "Documento con información detallada de cada indicador: definición, método de cálculo, unidad de medida, frecuencia y metas." },
  { termino: "Nivel - Fin", definicion: "Primer nivel de la MIR. Impacto de largo plazo al que contribuye el programa." },
  { termino: "Nivel - Propósito", definicion: "Segundo nivel. Resultado directo esperado en la población objetivo." },
  { termino: "Nivel - Componente", definicion: "Tercer nivel. Bienes o servicios que produce el programa.", ejemplos: ["Inspecciones realizadas", "Resoluciones emitidas"] },
  { termino: "Nivel - Actividad", definicion: "Cuarto nivel. Acciones para producir cada componente.", ejemplos: ["Programación de inspecciones", "Capacitación de personal"] },
  { termino: "Programa presupuestario", definicion: "Categoría programática identificada con clave alfanumérica.", ejemplos: ["G005", "G014"] },
  { termino: "G005", definicion: "Programa presupuestario 'Regulación y vigilancia ambiental' de PROFEPA (2025)." },
  { termino: "G014", definicion: "Programa presupuestario 'Inspección, Vigilancia y Regulación del Medio Ambiente y Recursos Naturales' (2026)." },
  { termino: "Periodo", definicion: "Intervalo de tiempo al que corresponde una medición.", ejemplos: ["2025 (anual)", "2025-01 (mensual)"] },
  { termino: "Método de cálculo", definicion: "Fórmula matemática para obtener el valor del indicador.", ejemplos: ["(Inspecciones realizadas / Total programadas) × 100"] },
  { termino: "Fuente de verificación", definicion: "Documento o registro que contiene la información para verificar el valor del indicador." },
  { termino: "PROFEPA", definicion: "Procuraduría Federal de Protección al Ambiente. Órgano desconcentrado de SEMARNAT encargado de vigilar el cumplimiento de las disposiciones legales en materia ambiental." },
  { termino: "Trazabilidad", definicion: "Capacidad de identificar el origen y la ruta de un dato desde su fuente hasta su presentación final." },
  { termino: "Datos abiertos", definicion: "Datos que pueden ser libremente utilizados, reutilizados y redistribuidos. Se publican en formatos CSV y JSON." },
];

export default function GlosarioPage() {
  const [search, setSearch] = useState('');
  const sortedTerms = [...glosarioTerms].sort((a, b) => a.termino.localeCompare(b.termino, 'es'));

  const filteredTerms = search
    ? sortedTerms.filter(t => t.termino.toLowerCase().includes(search.toLowerCase()) || t.definicion.toLowerCase().includes(search.toLowerCase()))
    : sortedTerms;

  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const letter = term.termino[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(term);
    return acc;
  }, {} as Record<string, GlosarioTerm[]>);

  const letters = Object.keys(groupedTerms).sort();

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
              <span className="text-white/80">Glosario</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">Glosario</h1>
            <p className="text-white/70 max-w-2xl text-lg">Definiciones de los términos utilizados en el tablero de indicadores.</p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Search + alphabet nav */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6 -mt-12 relative z-10 mb-10">
          <div className="relative mb-4">
            <input type="search" placeholder="Buscar término..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-gob-green-500/30 focus:border-gob-green-500 transition-all outline-none" />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {letters.map(letter => (
              <a key={letter} href={`#letra-${letter}`} className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gob-green-500 hover:text-white text-sm font-bold transition-all">{letter}</a>
            ))}
          </div>
        </motion.div>

        {/* Terms */}
        <div className="space-y-10">
          {letters.map(letter => (
            <section key={letter} id={`letra-${letter}`}>
              <h2 className="text-3xl font-extrabold text-gob-green-600 mb-4 pb-2 border-b border-gray-200">{letter}</h2>
              <div className="space-y-3">
                {groupedTerms[letter].map((term, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="card-hover" id={term.termino.toLowerCase().replace(/\s+/g, '-')}>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{term.termino}</h3>
                    <p className="text-gray-600 leading-relaxed">{term.definicion}</p>
                    {term.ejemplos && term.ejemplos.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ejemplos</p>
                        <ul className="list-disc list-inside text-sm text-gray-500 space-y-0.5">
                          {term.ejemplos.map((ej, j) => <li key={j}>{ej}</li>)}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {filteredTerms.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">No se encontraron términos</h3>
            <p className="text-gray-500 text-sm">Intenta con otra palabra.</p>
          </div>
        )}

        {/* Footer note */}
        <div className="card p-8 mt-12 bg-gradient-to-br from-gray-50 to-white border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-2">¿No encuentras un término?</h3>
          <p className="text-gray-500 text-sm mb-4">Consulta los documentos oficiales de PROFEPA o la metodología del tablero.</p>
          <div className="flex gap-4">
            <Link href="/metodologia" className="text-sm font-semibold text-gob-green-600 hover:text-gob-green-700">Ver metodología</Link>
            <a href="https://www.gob.mx/profepa" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gob-green-600 hover:text-gob-green-700">Sitio oficial PROFEPA</a>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 text-sm font-semibold text-gob-green-600 hover:text-gob-green-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            Volver arriba
          </button>
        </div>
      </div>
    </div>
  );
}
