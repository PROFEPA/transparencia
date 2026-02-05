'use client';

import Link from 'next/link';

interface GlosarioTerm {
  termino: string;
  definicion: string;
  ejemplos?: string[];
}

const glosarioTerms: GlosarioTerm[] = [
  {
    termino: "Indicador",
    definicion: "Expresión cuantitativa o cualitativa que permite medir el grado de cumplimiento de los objetivos y metas establecidos. Los indicadores permiten hacer seguimiento y evaluación del desempeño institucional.",
    ejemplos: ["Porcentaje de inspecciones realizadas", "Número de empresas verificadas"]
  },
  {
    termino: "Meta",
    definicion: "Valor objetivo que se espera alcanzar para un indicador en un periodo determinado. Las metas son establecidas en la etapa de planeación y sirven como referencia para medir el avance.",
    ejemplos: ["Meta anual: 500 inspecciones", "Meta trimestral: 90% de cumplimiento"]
  },
  {
    termino: "Avance",
    definicion: "Valor alcanzado del indicador en un momento determinado. El avance se compara contra la meta para determinar el porcentaje de cumplimiento.",
  },
  {
    termino: "Avance porcentual",
    definicion: "Relación entre el valor alcanzado (avance) y la meta establecida, expresada como porcentaje. Se calcula como: (Avance / Meta) × 100.",
    ejemplos: ["Si la meta es 100 y el avance es 85, el avance porcentual es 85%"]
  },
  {
    termino: "Unidad de medida",
    definicion: "Forma en la que se expresa cuantitativamente el indicador. Define la escala o tipo de medición utilizada.",
    ejemplos: ["Porcentaje", "Número", "Índice", "Pesos", "Hectáreas"]
  },
  {
    termino: "POA - Programa Operativo Anual",
    definicion: "Instrumento de planeación que establece las metas y actividades a realizar por una dependencia o entidad durante un ejercicio fiscal. Vincula la programación con la asignación de recursos.",
  },
  {
    termino: "MIR - Matriz de Indicadores para Resultados",
    definicion: "Herramienta de planeación estratégica organizada en una matriz de cuatro filas (Fin, Propósito, Componentes, Actividades) y cuatro columnas (Resumen Narrativo, Indicadores, Medios de Verificación, Supuestos). Permite vincular los objetivos de un programa con sus indicadores de medición.",
  },
  {
    termino: "FiME - Ficha de Indicadores de Monitoreo y Evaluación",
    definicion: "Documento que contiene la información detallada de cada indicador, incluyendo: nombre, definición, método de cálculo, unidad de medida, frecuencia de medición, sentido del indicador y metas.",
  },
  {
    termino: "Nivel - Fin",
    definicion: "Primer nivel de la MIR. Describe el impacto de largo plazo o el objetivo de desarrollo al que contribuye el programa. Generalmente está vinculado a los objetivos del Plan Nacional de Desarrollo.",
  },
  {
    termino: "Nivel - Propósito",
    definicion: "Segundo nivel de la MIR. Describe el resultado directo que se espera alcanzar en la población o área de enfoque como consecuencia de utilizar los componentes del programa.",
  },
  {
    termino: "Nivel - Componente",
    definicion: "Tercer nivel de la MIR. Son los bienes o servicios que produce el programa y que recibe la población o área de enfoque para cumplir con el propósito.",
    ejemplos: ["Inspecciones realizadas", "Resoluciones emitidas", "Operativos ejecutados"]
  },
  {
    termino: "Nivel - Actividad",
    definicion: "Cuarto nivel de la MIR. Son las principales acciones o tareas que deben realizarse para producir cada uno de los componentes del programa.",
    ejemplos: ["Programación de inspecciones", "Capacitación de personal", "Elaboración de informes"]
  },
  {
    termino: "Programa presupuestario",
    definicion: "Categoría programática que permite organizar las acciones de las dependencias y entidades para el cumplimiento de sus objetivos. Se identifica con una clave alfanumérica.",
    ejemplos: ["G005", "G014"]
  },
  {
    termino: "G005",
    definicion: "Clave del programa presupuestario 'Regulación y vigilancia ambiental' de PROFEPA, enfocado en la inspección y vigilancia del cumplimiento de la normatividad ambiental.",
  },
  {
    termino: "G014",
    definicion: "Clave del programa presupuestario relacionado con las actividades de procuración de justicia ambiental de PROFEPA.",
  },
  {
    termino: "Periodo",
    definicion: "Intervalo de tiempo al que corresponde una medición del indicador. Puede ser anual, semestral, trimestral o mensual.",
    ejemplos: ["2025 (anual)", "2025-Q1 (trimestral)", "2025-01 (mensual)"]
  },
  {
    termino: "Método de cálculo",
    definicion: "Fórmula o procedimiento matemático utilizado para obtener el valor del indicador. Define la operación que relaciona las variables que componen el indicador.",
    ejemplos: ["(Número de inspecciones realizadas / Total programadas) × 100"]
  },
  {
    termino: "Fuente de verificación",
    definicion: "Documento, sistema o registro que contiene la información para verificar el valor del indicador. Permite la auditoría y comprobación de los datos reportados.",
  },
  {
    termino: "PROFEPA",
    definicion: "Procuraduría Federal de Protección al Ambiente. Es un órgano administrativo desconcentrado de la Secretaría de Medio Ambiente y Recursos Naturales (SEMARNAT), encargado de vigilar el cumplimiento de las disposiciones legales aplicables en materia ambiental.",
  },
  {
    termino: "Trazabilidad",
    definicion: "Capacidad de identificar el origen y la ruta que siguió un dato desde su fuente original hasta su presentación final. En este tablero, cada indicador incluye información sobre el archivo y la ubicación exacta de donde fue extraído.",
  },
  {
    termino: "Datos abiertos",
    definicion: "Datos que pueden ser libremente utilizados, reutilizados y redistribuidos por cualquier persona. Los datos en este tablero se publican en formatos abiertos (CSV, JSON) para promover la transparencia y el análisis independiente.",
  },
];

export default function GlosarioPage() {
  // Ordenar términos alfabéticamente
  const sortedTerms = [...glosarioTerms].sort((a, b) => 
    a.termino.localeCompare(b.termino, 'es')
  );

  // Agrupar por letra inicial
  const groupedTerms = sortedTerms.reduce((acc, term) => {
    const letter = term.termino[0].toUpperCase();
    if (!acc[letter]) {
      acc[letter] = [];
    }
    acc[letter].push(term);
    return acc;
  }, {} as Record<string, GlosarioTerm[]>);

  const letters = Object.keys(groupedTerms).sort();

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page">Glosario</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Glosario</h1>
          <p className="text-gray-600">
            Definiciones de los términos utilizados en este tablero para facilitar 
            la comprensión de la información presentada.
          </p>
        </div>

        {/* Índice alfabético */}
        <div className="card mb-8">
          <div className="flex flex-wrap gap-2">
            {letters.map(letter => (
              <a
                key={letter}
                href={`#letra-${letter}`}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gob-green-500 hover:text-white font-bold transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>

        {/* Términos agrupados por letra */}
        <div className="space-y-8">
          {letters.map(letter => (
            <section key={letter} id={`letra-${letter}`}>
              <h2 className="text-2xl font-bold text-gob-green-600 mb-4 pb-2 border-b">
                {letter}
              </h2>
              <div className="space-y-4">
                {groupedTerms[letter].map((term, index) => (
                  <div 
                    key={index}
                    id={term.termino.toLowerCase().replace(/\s+/g, '-')}
                    className="card hover:border-gob-green-200 transition-colors"
                  >
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {term.termino}
                    </h3>
                    <p className="text-gray-700">
                      {term.definicion}
                    </p>
                    {term.ejemplos && term.ejemplos.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Ejemplos:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {term.ejemplos.map((ejemplo, i) => (
                            <li key={i}>{ejemplo}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Nota final */}
        <div className="card bg-gray-50 mt-12">
          <h3 className="font-bold mb-2">¿No encuentras un término?</h3>
          <p className="text-gray-600 text-sm">
            Si hay algún término que no comprende o que considera debería incluirse 
            en este glosario, puede consultarlo en los documentos oficiales de 
            PROFEPA o contactar a través de los canales institucionales.
          </p>
          <div className="mt-4 flex gap-4">
            <Link href="/metodologia" className="text-gob-green-600 hover:underline text-sm font-medium">
              Ver metodología completa
            </Link>
            <a 
              href="https://www.gob.mx/profepa" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gob-green-600 hover:underline text-sm font-medium"
            >
              Sitio oficial PROFEPA
            </a>
          </div>
        </div>

        {/* Volver arriba */}
        <div className="mt-8 text-center">
          <a 
            href="#"
            className="inline-flex items-center text-gob-green-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Volver arriba
          </a>
        </div>
      </div>
    </div>
  );
}
