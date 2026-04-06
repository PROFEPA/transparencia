'use client';
import { useState, useEffect } from 'react';
import { getEntidades, getReporte, getExportUrl } from '@/lib/poa-api';
import type { EntidadFederativa, ReporteArea } from '@/types/poa';

const MESES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function ReportePage() {
  const [entidades, setEntidades] = useState<EntidadFederativa[]>([]);
  const [selectedEntidad, setSelectedEntidad] = useState<number | ''>('');
  const [data, setData] = useState<ReporteArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getEntidades().then(setEntidades).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getReporte({
      entidad_id: selectedEntidad || undefined,
    })
      .then(d => {
        setData(d);
        // Expand all areas by default
        const expanded: Record<string, boolean> = {};
        d.forEach(a => { expanded[a.area_id] = true; });
        setExpandedAreas(expanded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedEntidad]);

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
              Reporte de Control de Indicadores
            </h2>
            <p className="text-gray-500 mt-1">
              Monitoreo mensual de cumplimiento por entidad federativa
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Estado Actual</label>
              <div className="relative">
                <select
                  value={selectedEntidad}
                  onChange={e => setSelectedEntidad(e.target.value ? parseInt(e.target.value) : '')}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none pr-10 cursor-pointer"
                >
                  <option value="">Todas las Entidades</option>
                  {entidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <a
              href={getExportUrl({ entidad_id: selectedEntidad || undefined })}
              className="px-4 py-2 bg-gob-green-600 text-white rounded-xl text-sm font-medium hover:bg-gob-green-700 transition-colors flex items-center gap-2"
              download
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </a>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-gob-green-200 border-t-gob-green-600 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <p className="text-gray-400">No hay datos de metas registrados aún.</p>
        </div>
      )}

      {/* Report data */}
      {!loading && data.map(area => (
        <div key={area.area_id} className="space-y-4">
          {/* Area header */}
          <button
            onClick={() => toggleArea(area.area_id)}
            className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-lg font-bold text-gob-green-700">{area.area_nombre}</h3>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedAreas[area.area_id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedAreas[area.area_id] && area.indicadores.map(ind => (
            <div key={ind.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h4 className="font-bold text-gray-800">
                  {ind.clave} - {ind.nombre}
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ID Indicador</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Entidad</th>
                      {MESES_LABELS.map(m => (
                        <th key={m} className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase min-w-[80px]">{m}</th>
                      ))}
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ind.entidades.length === 0 && (
                      <tr>
                        <td colSpan={15} className="text-center py-4 text-gray-400 text-sm">
                          Sin datos registrados
                        </td>
                      </tr>
                    )}
                    {ind.entidades.map(ent => (
                      <tr key={ent.entidad_id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-700">{ind.clave}</td>
                        <td className="py-3 px-4 text-gray-600">{ent.entidad_nombre}</td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                          const d = ent.meses[mes];
                          return (
                            <td key={mes} className="py-2 px-2 text-center">
                              {d ? (
                                <a
                                  href={`/admin/editar?indicador=${ind.id}&entidad=${ent.entidad_id}&mes=${mes}`}
                                  className="inline-block px-2 py-1 rounded-lg hover:bg-gob-green-50 transition-colors border border-transparent hover:border-gob-green-200"
                                >
                                  <div className="text-xs text-gray-500">{d.valor_planeado?.toFixed(2) ?? '-'}</div>
                                  <div className="text-sm font-bold text-gray-800">{d.valor_real?.toFixed(2) ?? '-'}</div>
                                </a>
                              ) : (
                                <span className="text-gray-300 text-xs">- -</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center">
                          <a
                            href={`/admin/editar?indicador=${ind.id}&entidad=${ent.entidad_id}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gob-green-600 hover:bg-gob-green-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
