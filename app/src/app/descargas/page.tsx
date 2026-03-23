'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Metadata, DataQualityReport } from '@/types';

export default function DescargasPage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [quality, setQuality] = useState<DataQualityReport | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [metaRes, qualityRes] = await Promise.all([
          fetch('/data/metadata.json'),
          fetch('/data/data_quality_report.json')
        ]);
        
        if (metaRes.ok) setMetadata(await metaRes.json());
        if (qualityRes.ok) setQuality(await qualityRes.json());
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    }
    loadData();
  }, []);

  const downloads = [
    {
      title: 'Indicadores completos',
      description: 'Catálogo completo de todos los indicadores institucionales con sus metadatos.',
      formats: [
        { name: 'CSV', url: '/data/indicators.csv', icon: '📊' },
        { name: 'JSON', url: '/data/indicators.json', icon: '📋' },
      ],
      count: metadata?.total_indicadores || '-'
    },
    {
      title: 'Observaciones / Series temporales',
      description: 'Datos históricos de valores y metas por periodo para cada indicador.',
      formats: [
        { name: 'CSV', url: '/data/observations.csv', icon: '📊' },
        { name: 'JSON', url: '/data/observations.json', icon: '📋' },
      ],
      count: metadata?.total_observaciones || '-'
    },
    {
      title: 'Indicadores 2025',
      description: 'Indicadores del Programa Operativo Anual y MIR 2025.',
      formats: [
        { name: 'CSV', url: '/data/indicators_2025.csv', icon: '📊' },
        { name: 'JSON', url: '/data/indicators_2025.json', icon: '📋' },
      ],
      badge: '2025'
    },
    {
      title: 'Indicadores 2026',
      description: 'Indicadores del FiME y documentación institucional 2026.',
      formats: [
        { name: 'CSV', url: '/data/indicators_2026.csv', icon: '📊' },
        { name: 'JSON', url: '/data/indicators_2026.json', icon: '📋' },
      ],
      badge: '2026'
    },
    {
      title: 'Diccionario de datos',
      description: 'Definición y descripción de cada campo del dataset.',
      formats: [
        { name: 'JSON', url: '/data/data_dictionary.json', icon: '📋' },
      ],
    },
    {
      title: 'Reporte de calidad',
      description: 'Información sobre la validez y completitud de los datos.',
      formats: [
        { name: 'JSON', url: '/data/data_quality_report.json', icon: '📋' },
      ],
    },
    {
      title: 'Metadatos del dataset',
      description: 'Información general sobre las fuentes y fecha de extracción.',
      formats: [
        { name: 'JSON', url: '/data/metadata.json', icon: '📋' },
      ],
    }
  ];

  const originalDocuments = [
    {
      title: 'POA 2025',
      description: 'Programa Operativo Anual 2025 - Documento original.',
      formats: [
        { name: 'Excel', url: '/documents/POA_2025.xlsx', icon: '📑' },
      ],
      badge: '2025'
    },
    {
      title: 'MIR G005 2025',
      description: 'Matriz de Indicadores para Resultados del programa G005 - 2025.',
      formats: [
        { name: 'Excel', url: '/documents/MIR_G005_2025.xlsx', icon: '📑' },
      ],
      badge: '2025'
    },
    {
      title: 'FiME 2026',
      description: 'Ficha de Monitoreo y Evaluación 2026 PROFEPA.',
      formats: [
        { name: 'Excel', url: '/documents/FiME 2026 PFPA.xlsx', icon: '📑' },
      ],
      badge: '2026'
    },
    {
      title: 'G014 para Auditoría',
      description: 'Documento del programa G014 para Auditoría.',
      formats: [
        { name: 'Word', url: '/documents/G014 para Auditoría.docx', icon: '📄' },
      ],
    }
  ];

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page">Descargas</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Descargas de datos</h1>
          <p className="text-gray-600">
            Descarga los datasets completos en formatos abiertos para tu propio análisis. 
            Todos los archivos están en formato UTF-8.
          </p>
        </div>

        {/* Aviso de uso */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-800">Aviso de uso de datos</h3>
              <p className="text-sm text-blue-700 mt-1">
                La información contenida en estos archivos proviene de documentos institucionales 
                de PROFEPA y se publica con fines informativos y de transparencia. El uso 
                de estos datos es responsabilidad del usuario. La interpretación oficial 
                corresponde a PROFEPA.
              </p>
            </div>
          </div>
        </div>

        {/* Resumen de datos */}
        {(metadata || quality) && (
          <div className="grid-kpis mb-8">
            <div className="kpi-card">
              <div className="kpi-value">{metadata?.total_indicadores || '-'}</div>
              <div className="kpi-label">Indicadores</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{metadata?.total_observaciones || '-'}</div>
              <div className="kpi-label">Observaciones</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{quality?.resumen?.porcentaje_validas?.toFixed(0) || '-'}%</div>
              <div className="kpi-label">Datos válidos</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{metadata?.version || '1.0'}</div>
              <div className="kpi-label">Versión</div>
            </div>
          </div>
        )}

        {/* Lista de descargas */}
        <div className="space-y-4">
          {downloads.map((download, index) => (
            <div key={index} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{download.title}</h3>
                    {download.badge && (
                      <span className="badge-gob">{download.badge}</span>
                    )}
                    {download.count && (
                      <span className="badge-gray">{download.count} registros</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{download.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {download.formats.map((format, fIdx) => (
                    <a
                      key={fIdx}
                      href={format.url}
                      download
                      className="btn-primary text-sm py-2"
                    >
                      <span className="mr-1">{format.icon}</span>
                      Descargar {format.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Documentos originales */}
        <div className="mt-12 mb-8">
          <h2 className="text-2xl font-bold mb-2">Documentos originales</h2>
          <p className="text-gray-600 mb-6">
            Descarga los documentos institucionales originales en sus formatos nativos.
          </p>
          <div className="space-y-4">
            {originalDocuments.map((doc, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow border-l-4 border-gob-green-500">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{doc.title}</h3>
                      {doc.badge && (
                        <span className="badge-gob">{doc.badge}</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{doc.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {doc.formats.map((format, fIdx) => (
                      <a
                        key={fIdx}
                        href={format.url}
                        download
                        className="btn-secondary text-sm py-2"
                      >
                        <span className="mr-1">{format.icon}</span>
                        Descargar {format.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Información de fuentes */}
        {metadata?.fuentes_procesadas && (
          <div className="card mt-8">
            <h2 className="text-xl font-bold mb-4">Fuentes originales procesadas</h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th>Nombre</th>
                    <th>Archivo</th>
                    <th>Tipo</th>
                    <th>Programa</th>
                    <th>Año</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {metadata.fuentes_procesadas.map((fuente, index) => (
                    <tr key={index}>
                      <td className="font-medium">{fuente.nombre}</td>
                      <td className="text-sm text-gray-500">{fuente.archivo}</td>
                      <td>
                        <span className="badge-gray">{fuente.tipo.toUpperCase()}</span>
                      </td>
                      <td>{fuente.programa}</td>
                      <td>{fuente.anio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Completitud */}
        {quality?.completitud_indicadores && (
          <div className="card mt-8">
            <h2 className="text-xl font-bold mb-4">Completitud de datos</h2>
            <p className="text-sm text-gray-600 mb-4">
              Porcentaje de indicadores que cuentan con cada campo informacional:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(quality.completitud_indicadores).map(([campo, valor]) => (
                <div key={campo} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    (valor as number) >= 80 ? 'text-green-600' :
                    (valor as number) >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(valor as number).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {campo.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fecha de actualización */}
        {metadata?.fecha_extraccion && (
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Última actualización de datos: {' '}
              <time dateTime={metadata.fecha_extraccion}>
                {new Date(metadata.fecha_extraccion).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </time>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
