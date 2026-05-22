'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { Indicator, Observation } from '@/types';
import { isHiddenIndicator } from '@/lib/indicators-filter';
import { ExportPNGButton } from '@/components/ExportButtons';

const MAX_INDICATORS = 3;
const COLORS = ['#235B4E', '#BC955C', '#691C32'];

function ComparadorContent() {
  const sp = useSearchParams();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selected, setSelected] = useState<string[]>(() => {
    const ids = sp.get('ids');
    return ids ? ids.split(',').filter(Boolean).slice(0, MAX_INDICATORS) : [];
  });
  const [normalize, setNormalize] = useState<'absoluto' | 'porcentaje'>('porcentaje');
  const [busqueda, setBusqueda] = useState('');
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/indicators_2025.json').then(r => r.json()),
      fetch('/data/observations.json').then(r => r.json()),
    ])
      .then(([inds, obs]: [Indicator[], Observation[]]) => {
        setIndicators(inds.filter(i => !isHiddenIndicator(i.id)));
        setObservations(obs);
      })
      .catch(e => console.error('Error cargando datos comparador:', e));
  }, []);

  // Persistencia URL
  useEffect(() => {
    const url = selected.length > 0 ? `/comparar?ids=${selected.join(',')}` : '/comparar';
    window.history.replaceState(null, '', url);
  }, [selected]);

  const indicatorsById = useMemo(() => {
    const m = new Map<string, Indicator>();
    indicators.forEach(i => m.set(i.id, i));
    return m;
  }, [indicators]);

  const filteredCatalog = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return indicators
      .filter(i => !selected.includes(i.id))
      .filter(i => !q || i.nombre.toLowerCase().includes(q));
  }, [indicators, selected, busqueda]);

  // Construir serie unificada por periodo
  const chartData = useMemo(() => {
    if (selected.length === 0) return [];
    const periodos = new Set<string>();
    const seriesById: Record<string, Map<string, { valor: number | null; meta: number | null; avance: number | null }>> = {};
    selected.forEach(id => {
      seriesById[id] = new Map();
      observations
        .filter(o => o.indicator_id === id && (o.entidad || 'Nacional') === 'Nacional' && o.periodo.includes('-'))
        .forEach(o => {
          periodos.add(o.periodo);
          seriesById[id].set(o.periodo, {
            valor: o.valor ?? null,
            meta: o.meta ?? null,
            avance: o.avance_porcentual ?? null,
          });
        });
    });
    const ordered = Array.from(periodos).sort();
    return ordered.map(periodo => {
      const row: Record<string, string | number | null> = { periodo };
      selected.forEach(id => {
        const v = seriesById[id].get(periodo);
        if (!v) {
          row[id] = null;
          return;
        }
        if (normalize === 'porcentaje') {
          row[id] = v.avance ?? (v.valor != null && v.meta && v.meta > 0 ? (v.valor / v.meta) * 100 : null);
        } else {
          row[id] = v.valor;
        }
      });
      return row;
    });
  }, [selected, observations, normalize]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_INDICATORS) return prev;
      return [...prev, id];
    });
  };

  const colorOf = (id: string) => COLORS[selected.indexOf(id)] ?? '#6B7280';

  return (
    <div className="min-h-screen bg-mesh">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page">Comparador</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Comparador de indicadores</h1>
          <p className="text-gray-600 max-w-3xl">
            Selecciona hasta {MAX_INDICATORS} indicadores y compáralos en una sola gráfica. Útil para detectar correlaciones y diferencias de comportamiento entre métricas.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Selector */}
          <div className="card p-6 lg:col-span-1">
            <h2 className="font-bold text-gray-900 mb-3">Indicadores seleccionados ({selected.length}/{MAX_INDICATORS})</h2>
            {selected.length === 0 ? (
              <p className="text-sm text-gray-400 italic mb-4">Aún no has elegido ninguno.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {selected.map(id => {
                  const ind = indicatorsById.get(id);
                  return (
                    <li key={id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colorOf(id) }} />
                      <span className="flex-1 text-xs text-gray-700 line-clamp-2">{ind?.nombre || id}</span>
                      <button onClick={() => toggle(id)} className="text-red-500 hover:text-red-700 text-xs font-bold" aria-label="Quitar">×</button>
                    </li>
                  );
                })}
              </ul>
            )}

            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar para añadir…"
              className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gob-green-500/30 focus:border-gob-green-500 outline-none"
            />
            <div className="max-h-72 overflow-y-auto pr-1 space-y-1">
              {filteredCatalog.slice(0, 50).map(ind => {
                const disabled = selected.length >= MAX_INDICATORS;
                return (
                  <button
                    key={ind.id}
                    onClick={() => toggle(ind.id)}
                    disabled={disabled}
                    className="w-full text-left text-xs p-2 rounded-lg hover:bg-gob-green-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 transition-colors line-clamp-2"
                  >
                    + {ind.nombre}
                  </button>
                );
              })}
              {filteredCatalog.length === 0 && (
                <p className="text-xs text-gray-400 italic p-2">Sin resultados.</p>
              )}
            </div>
          </div>

          {/* Gráfica */}
          <div ref={chartRef} className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-bold text-gray-900">Comparativa temporal</h2>
              <div className="flex items-center gap-2">
                <ExportPNGButton targetRef={chartRef} filename="comparador" />
                <div data-export-ignore="true" className="flex gap-1 bg-gray-100 rounded-xl p-1 text-xs">
                  <button onClick={() => setNormalize('porcentaje')} className={`px-3 py-1.5 rounded-lg font-medium transition-all ${normalize === 'porcentaje' ? 'bg-white text-gob-green-700 shadow-sm' : 'text-gray-500'}`}>% Avance</button>
                  <button onClick={() => setNormalize('absoluto')} className={`px-3 py-1.5 rounded-lg font-medium transition-all ${normalize === 'absoluto' ? 'bg-white text-gob-green-700 shadow-sm' : 'text-gray-500'}`}>Valor absoluto</button>
                </div>
              </div>
            </div>

            {selected.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
                Selecciona uno o más indicadores para ver la comparativa.
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
                Los indicadores seleccionados no tienen serie mensual nacional disponible.
              </div>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(v) => normalize === 'porcentaje' ? `${v}%` : v.toLocaleString('es-MX')}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string) => [
                        value == null ? '—' : (normalize === 'porcentaje' ? `${value.toFixed(1)}%` : value.toLocaleString('es-MX', { maximumFractionDigits: 2 })),
                        indicatorsById.get(name)?.nombre.slice(0, 50) || name,
                      ]}
                    />
                    <Legend formatter={(value: string) => indicatorsById.get(value)?.nombre.slice(0, 60) || value} wrapperStyle={{ fontSize: 11 }} />
                    {normalize === 'porcentaje' && (
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" label={{ value: '100%', fontSize: 10, fill: '#10b981' }} />
                    )}
                    {selected.map(id => (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        stroke={colorOf(id)}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Tabla resumen */}
        {selected.length > 0 && chartData.length > 0 && (
          <div className="card p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Resumen estadístico</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase">Indicador</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs uppercase">Promedio</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs uppercase">Máximo</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs uppercase">Mínimo</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs uppercase">Último</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map(id => {
                    const values = chartData
                      .map(r => r[id])
                      .filter((v): v is number => typeof v === 'number');
                    if (values.length === 0) return null;
                    const avg = values.reduce((s, v) => s + v, 0) / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    const last = values[values.length - 1];
                    const fmt = (v: number) => normalize === 'porcentaje' ? `${v.toFixed(1)}%` : v.toLocaleString('es-MX', { maximumFractionDigits: 2 });
                    return (
                      <tr key={id} className="border-b border-gray-100">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colorOf(id) }} />
                            <span className="text-xs text-gray-700 line-clamp-1">{indicatorsById.get(id)?.nombre || id}</span>
                          </div>
                        </td>
                        <td className="text-right py-2 px-3 font-mono text-xs">{fmt(avg)}</td>
                        <td className="text-right py-2 px-3 font-mono text-xs text-emerald-600">{fmt(max)}</td>
                        <td className="text-right py-2 px-3 font-mono text-xs text-red-600">{fmt(min)}</td>
                        <td className="text-right py-2 px-3 font-mono text-xs font-bold">{fmt(last)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparadorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Cargando…</div>}>
      <ComparadorContent />
    </Suspense>
  );
}
