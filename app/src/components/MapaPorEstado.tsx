'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import mexicoMap from '@svg-maps/mexico';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Indicator, Observation } from '@/types';
import { ExportPNGButton } from '@/components/ExportButtons';
import { isHiddenIndicator } from '@/lib/indicators-filter';

type Location = { id: string; name: string; path: string };

type StateAgg = {
  estado: string;
  registros: number;
  indicadores: number;
  avancePromedio: number | null;
  valorTotal: number;
};

type Detalle = {
  estado: string;
  registros: number;
  indicadores: { id: string; nombre: string; valor: number; meta?: number; avance?: number }[];
  avancePromedio: number | null;
  valorTotal: number;
};

const ESTADOS_NO_GEOGRAFICOS = new Set([
  'Nacional',
  'ZMVM',
  'Coordinación de Oficinas de Representación de Protección Ambiental y Gestión Territorial',
  'Coordinación de Oficinas de Representación de Protección Ambiental y Gestión Territorial - SIVI',
  'Coordinación de Oficinas de Representación de Protección Ambiental y Gestión Territorial - SRN',
  'Subprocuraduría Jurídica',
  'Subprocuraduría de Auditoría Ambiental',
  'Subprocuraduría de Inspección Industrial',
  'Subprocuraduría de Inspección y Vigilancia Industrial',
  'Subprocuraduría de Litigio Estratégico y Justicia Ambiental',
  'Subprocuraduría de Recursos Naturales',
]);

// Algunos posibles alias entre el SVG y los datos
const ALIAS: Record<string, string> = {
  'Mexico City': 'Ciudad de México',
};

function colorFor(value: number, max: number): string {
  if (!max || value <= 0) return '#E5E7EB'; // gray-200
  const t = Math.max(0.08, Math.min(1, value / max));
  // Interpolación de verde claro → verde institucional PROFEPA (#235B4E)
  const r = Math.round(220 - (220 - 35) * t);
  const g = Math.round(240 - (240 - 91) * t);
  const b = Math.round(225 - (225 - 78) * t);
  return `rgb(${r},${g},${b})`;
}

export default function MapaPorEstado({
  observations,
  indicators,
}: {
  observations: Observation[];
  indicators: Indicator[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  type Metric = 'registros' | 'avance' | 'valor';
  const [metric, setMetric] = useState<Metric>('registros');
  const mapaRef = useRef<HTMLDivElement>(null);
  const top10Ref = useRef<HTMLDivElement>(null);

  const METRIC_LABELS: Record<Metric, { titulo: string; subtitulo: string; sufijo: string; descCorta: string; descripcion: string }> = {
    registros: {
      titulo: 'Registros por entidad',
      subtitulo: 'Da clic en un estado',
      sufijo: 'registros',
      descCorta: 'Por número de registros',
      descripcion: 'Número total de observaciones reportadas por la entidad. Mide el volumen de actividad de seguimiento.',
    },
    avance: {
      titulo: 'Avance promedio por entidad',
      subtitulo: '% de cumplimiento de metas',
      sufijo: '% avance',
      descCorta: 'Por avance promedio (%)',
      descripcion: 'Promedio del porcentaje de avance frente a la meta anual de los indicadores reportados por la entidad.',
    },
    valor: {
      titulo: 'Valor total reportado por entidad',
      subtitulo: 'Suma de valores observados',
      sufijo: 'unid.',
      descCorta: 'Por valor total acumulado',
      descripcion: 'Suma de los valores reportados por la entidad en todos los indicadores y periodos del año.',
    },
  };

  const indicatorsById = useMemo(() => {
    const m = new Map<string, Indicator>();
    indicators.forEach(i => m.set(i.id, i));
    return m;
  }, [indicators]);

  const aggByEstado = useMemo(() => {
    const map = new Map<string, StateAgg & { _avancesSum: number; _avancesCount: number; _ids: Set<string> }>();
    observations.forEach(o => {
      const ent = o.entidad;
      if (!ent || ESTADOS_NO_GEOGRAFICOS.has(ent)) return;
      if (o.indicator_id && isHiddenIndicator(o.indicator_id)) return;
      const cur = map.get(ent) || {
        estado: ent,
        registros: 0,
        indicadores: 0,
        avancePromedio: null,
        valorTotal: 0,
        _avancesSum: 0,
        _avancesCount: 0,
        _ids: new Set<string>(),
      };
      cur.registros += 1;
      if (typeof o.valor === 'number' && Number.isFinite(o.valor)) cur.valorTotal += o.valor;
      if (typeof o.avance_porcentual === 'number' && Number.isFinite(o.avance_porcentual)) {
        cur._avancesSum += o.avance_porcentual;
        cur._avancesCount += 1;
      }
      if (o.indicator_id) cur._ids.add(o.indicator_id);
      map.set(ent, cur);
    });
    const result: StateAgg[] = [];
    map.forEach(v => {
      result.push({
        estado: v.estado,
        registros: v.registros,
        indicadores: v._ids.size,
        avancePromedio: v._avancesCount > 0 ? v._avancesSum / v._avancesCount : null,
        valorTotal: v.valorTotal,
      });
    });
    return result;
  }, [observations]);

  const aggIndex = useMemo(() => {
    const idx = new Map<string, StateAgg>();
    aggByEstado.forEach(a => idx.set(a.estado, a));
    return idx;
  }, [aggByEstado]);

  const metricValue = (a: StateAgg | undefined): number => {
    if (!a) return 0;
    switch (metric) {
      case 'registros': return a.registros;
      case 'avance': return a.avancePromedio ?? 0;
      case 'valor': return a.valorTotal;
    }
  };

  const maxValue = useMemo(
    () => aggByEstado.reduce((m, a) => Math.max(m, metricValue(a)), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggByEstado, metric]
  );

  const top10 = useMemo(
    () => [...aggByEstado]
      .map(a => ({ ...a, _metric: metricValue(a) }))
      .sort((a, b) => b._metric - a._metric)
      .slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggByEstado, metric]
  );

  const detalle: Detalle | null = useMemo(() => {
    if (!selected) return null;
    const agg = aggIndex.get(selected);
    if (!agg) return null;
    // Agrupar valores por indicador
    const porInd = new Map<string, { valorSum: number; metaSum: number; avanceSum: number; n: number; nMeta: number; nAv: number }>();
    observations
      .filter(o => o.entidad === selected)
      .forEach(o => {
        const cur = porInd.get(o.indicator_id) || { valorSum: 0, metaSum: 0, avanceSum: 0, n: 0, nMeta: 0, nAv: 0 };
        if (typeof o.valor === 'number') { cur.valorSum += o.valor; cur.n += 1; }
        if (typeof o.meta === 'number') { cur.metaSum += o.meta; cur.nMeta += 1; }
        if (typeof o.avance_porcentual === 'number') { cur.avanceSum += o.avance_porcentual; cur.nAv += 1; }
        porInd.set(o.indicator_id, cur);
      });
    const inds = Array.from(porInd.entries())
      .map(([id, v]) => ({
        id,
        nombre: indicatorsById.get(id)?.nombre || id,
        valor: v.valorSum,
        meta: v.nMeta > 0 ? v.metaSum : undefined,
        avance: v.nAv > 0 ? v.avanceSum / v.nAv : undefined,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
    return {
      estado: selected,
      registros: agg.registros,
      indicadores: inds,
      avancePromedio: agg.avancePromedio,
      valorTotal: agg.valorTotal,
    };
  }, [selected, aggIndex, observations, indicatorsById]);

  // Cerrar con tecla ESC
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const locations: Location[] = (mexicoMap as { locations: Location[] }).locations;
  const viewBox: string = (mexicoMap as { viewBox: string }).viewBox;

  return (
    <>
      <div ref={mapaRef} className="card p-6">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-0 text-center text-gray-800">{METRIC_LABELS[metric].titulo}</h3>
            <p className="text-center text-sm font-semibold mb-0" style={{ color: '#BC955C' }}>{METRIC_LABELS[metric].subtitulo}</p>
          </div>
          <ExportPNGButton targetRef={mapaRef} filename={`mapa-${metric}`} />
        </div>
        <div data-export-ignore="true" className="flex flex-wrap justify-center gap-1 bg-gray-100 rounded-xl p-1 mb-2 text-xs">
          {(['registros', 'avance', 'valor'] as Metric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${metric === m ? 'bg-white text-gob-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {m === 'registros' ? 'Registros' : m === 'avance' ? '% Avance' : 'Valor total'}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mb-3 px-2">{METRIC_LABELS[metric].descripcion}</p>
        <div className="relative h-56">
          <svg viewBox={viewBox} className="w-full h-full" role="img" aria-label="Mapa de México por entidad federativa">
            {locations.map(loc => {
              const nombreReal = ALIAS[loc.name] || loc.name;
              const agg = aggIndex.get(nombreReal);
              const valor = metricValue(agg);
              const isHover = hovered === nombreReal;
              return (
                <path
                  key={loc.id}
                  d={loc.path}
                  fill={colorFor(valor, maxValue)}
                  stroke={isHover ? '#235B4E' : '#fff'}
                  strokeWidth={isHover ? 1.5 : 0.6}
                  style={{ cursor: agg ? 'pointer' : 'default', transition: 'fill 0.2s, stroke 0.2s' }}
                  onMouseEnter={() => setHovered(nombreReal)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => agg && setSelected(nombreReal)}
                >
                  <title>{`${nombreReal}: ${metric === 'avance' ? valor.toFixed(1) + '%' : valor.toLocaleString('es-MX')} ${METRIC_LABELS[metric].sufijo}`}</title>
                </path>
              );
            })}
          </svg>
          {hovered && (
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow text-xs font-semibold pointer-events-none">
              <div className="text-gray-900">{hovered}</div>
              <div className="text-gob-green-600">
                {metric === 'avance'
                  ? `${(aggIndex.get(hovered)?.avancePromedio ?? 0).toFixed(1)}% avance`
                  : `${metricValue(aggIndex.get(hovered)).toLocaleString('es-MX')} ${METRIC_LABELS[metric].sufijo}`}
              </div>
            </div>
          )}
        </div>
        {/* Escala / leyenda visual */}
        <div className="mt-3 px-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span>Menos</span>
            <span className="font-medium text-gray-600">Escala de {METRIC_LABELS[metric].sufijo}</span>
            <span>Más</span>
          </div>
          <div
            className="h-3 rounded-full border border-gray-200"
            style={{ background: 'linear-gradient(to right, #E5E7EB 0%, #DCF0E1 15%, #8FC9A6 50%, #4F9A75 80%, #235B4E 100%)' }}
            aria-hidden
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
            <span>0</span>
            <span>{metric === 'avance' ? `${(maxValue / 2).toFixed(0)}%` : Math.round(maxValue / 2).toLocaleString('es-MX')}</span>
            <span>{metric === 'avance' ? `${maxValue.toFixed(0)}%` : Math.round(maxValue).toLocaleString('es-MX')}</span>
          </div>
        </div>
      </div>

      <div ref={top10Ref} className="card p-6">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-0 text-center text-gray-800">Top 10 entidades</h3>
            <p className="text-center text-sm font-semibold mb-0" style={{ color: '#BC955C' }}>{METRIC_LABELS[metric].descCorta}</p>
          </div>
          <ExportPNGButton targetRef={top10Ref} filename={`top10-${metric}`} />
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="estado" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => [
                  metric === 'avance' ? `${value.toFixed(1)}%` : value.toLocaleString('es-MX'),
                  METRIC_LABELS[metric].sufijo,
                ]}
              />
              <Bar
                dataKey="_metric"
                radius={[0, 4, 4, 0]}
                onClick={(d: { estado?: string }) => d?.estado && setSelected(d.estado)}
                style={{ cursor: 'pointer' }}
              >
                {top10.map((d, i) => (
                  <Cell key={i} fill={colorFor(d._metric, maxValue)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{detalle.estado}</h3>
                <p className="text-sm text-gray-500 mt-1">Detalle de indicadores POA</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gob-green-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-gob-green-600">{detalle.registros.toLocaleString()}</div>
                  <div className="text-xs text-gray-600 mt-1">Registros</div>
                </div>
                <div className="bg-gob-gold-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold" style={{ color: '#BC955C' }}>{detalle.indicadores.length}</div>
                  <div className="text-xs text-gray-600 mt-1">Indicadores</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {detalle.avancePromedio != null ? `${detalle.avancePromedio.toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Avance prom.</div>
                </div>
              </div>

              <h4 className="font-bold text-gray-900 mb-3">Principales indicadores</h4>
              <ul className="space-y-2">
                {detalle.indicadores.map(ind => (
                  <li key={ind.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={`/indicadores/${ind.id}?anio=2025`}
                          className="font-semibold text-sm text-gray-900 hover:text-gob-green-600 line-clamp-2"
                        >
                          {ind.nombre}
                        </a>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span>Valor: <strong className="text-gray-700">{ind.valor.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
                          {ind.meta != null && <span>Meta: <strong className="text-gray-700">{ind.meta.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>}
                          {ind.avance != null && <span>Avance: <strong className="text-gob-green-600">{ind.avance.toFixed(1)}%</strong></span>}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 text-center">
                <a
                  href={`/indicadores?anio=2025&entidad=${encodeURIComponent(detalle.estado)}`}
                  className="inline-flex items-center gap-2 text-gob-green-600 font-medium hover:underline"
                >
                  Ver todos los indicadores de {detalle.estado}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
