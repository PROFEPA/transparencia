'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAreas, getEntidades, getIndicadoresPOA, getDashboard } from '@/lib/poa-api';
import type { AreaPOA, EntidadFederativa, IndicadorPOA, DashboardIndicador, MESES } from '@/types/poa';

const MESES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<AreaPOA[]>([]);
  const [entidades, setEntidades] = useState<EntidadFederativa[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadorPOA[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedIndicadores, setSelectedIndicadores] = useState<number[]>([]);
  const [selectedEntidades, setSelectedEntidades] = useState<number[]>([]);
  const [showIndDropdown, setShowIndDropdown] = useState(false);
  const [showEntDropdown, setShowEntDropdown] = useState(false);
  const [data, setData] = useState<DashboardIndicador[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAreas().then(setAreas).catch(() => {});
    getEntidades().then(setEntidades).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedArea) {
      getIndicadoresPOA(selectedArea).then(setIndicadores).catch(() => {});
      setSelectedIndicadores([]);
    } else {
      setIndicadores([]);
      setSelectedIndicadores([]);
    }
  }, [selectedArea]);

  useEffect(() => {
    if (selectedArea && selectedIndicadores.length > 0) {
      setLoading(true);
      getDashboard({
        area_id: selectedArea,
        indicador_ids: selectedIndicadores,
        entidad_ids: selectedEntidades.length > 0 ? selectedEntidades : undefined,
      })
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setData([]);
    }
  }, [selectedArea, selectedIndicadores, selectedEntidades]);

  const toggleIndicador = (id: number) => {
    setSelectedIndicadores(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleEntidad = (id: number) => {
    setSelectedEntidades(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllIndicadores = () => {
    setSelectedIndicadores(indicadores.map(i => i.id));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Area */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              1. Área / Subprocuraduría
            </label>
            <div className="relative">
              <select
                value={selectedArea}
                onChange={e => setSelectedArea(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer"
              >
                <option value="">Seleccione Área...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Indicadores multi-select */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              2. Indicadores (Metas)
            </label>
            <button
              onClick={() => selectedArea && setShowIndDropdown(!showIndDropdown)}
              disabled={!selectedArea}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span className="truncate">
                {selectedIndicadores.length > 0
                  ? `${selectedIndicadores.length} seleccionado(s)`
                  : 'Ninguno seleccionado'}
              </span>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showIndDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                <button
                  onClick={selectAllIndicadores}
                  className="w-full px-4 py-2 text-left text-sm text-gob-green-600 font-semibold hover:bg-gray-50 border-b"
                >
                  Seleccionar Todo
                </button>
                {indicadores.map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => toggleIndicador(ind.id)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                      selectedIndicadores.includes(ind.id) ? 'bg-gob-green-50 text-gob-green-700' : 'text-gray-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      selectedIndicadores.includes(ind.id) ? 'bg-gob-green-600 border-gob-green-600' : 'border-gray-300'
                    }`}>
                      {selectedIndicadores.includes(ind.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{ind.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Entidades multi-select */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              3. Entidades Federativas (ORPAs)
            </label>
            <button
              onClick={() => selectedArea && setShowEntDropdown(!showEntDropdown)}
              disabled={!selectedArea}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span className="truncate">
                {selectedEntidades.length > 0
                  ? `${selectedEntidades.length} seleccionada(s)`
                  : 'Ninguno seleccionado'}
              </span>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showEntDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {entidades.map(ent => (
                  <button
                    key={ent.id}
                    onClick={() => toggleEntidad(ent.id)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                      selectedEntidades.includes(ent.id) ? 'bg-gob-green-50 text-gob-green-700' : 'text-gray-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      selectedEntidades.includes(ent.id) ? 'bg-gob-green-600 border-gob-green-600' : 'border-gray-300'
                    }`}>
                      {selectedEntidades.includes(ent.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span>{ent.clave} - {ent.abreviatura}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-gob-green-200 border-t-gob-green-600 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-300 uppercase tracking-wider mb-2">
            Consola Nacional de Metas
          </h3>
          <p className="text-gray-400 text-sm">
            Como Coordinación, puede seleccionar múltiples indicadores y entidades para una vista consolidada.
          </p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="space-y-6">
          {data.map(ind => (
            <div key={ind.indicador_id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gob-green-800 mb-1">{ind.clave} - {ind.nombre}</h3>
              <p className="text-sm text-gray-500 mb-4">{ind.area} · {ind.unidad_medida}</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Mes</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Planeado</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Real</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MESES_LABELS.map((mes, i) => {
                      const d = ind.meses[i + 1];
                      const avance = d && d.planeado > 0 ? ((d.real / d.planeado) * 100) : null;
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-700">{mes}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{d ? d.planeado.toFixed(2) : '-'}</td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-800">{d ? d.real.toFixed(2) : '-'}</td>
                          <td className="py-2 px-3 text-right">
                            {avance !== null ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                avance >= 100 ? 'bg-green-100 text-green-700' :
                                avance >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {avance.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-gray-50">
                      <td className="py-2 px-3">Total</td>
                      <td className="py-2 px-3 text-right">{ind.total_planeado.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{ind.total_real.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">
                        {ind.total_planeado > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            (ind.total_real / ind.total_planeado * 100) >= 100 ? 'bg-green-100 text-green-700' :
                            (ind.total_real / ind.total_planeado * 100) >= 70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {(ind.total_real / ind.total_planeado * 100).toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
