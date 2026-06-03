'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import mexicoMap from '@svg-maps/mexico';

type Location = { id: string; name: string; path: string };

// Maps internal ORPA oficina names → SVG location name
const ORPA_TO_SVG: Record<string, string> = {
  'CDMX-ZMVM': 'Mexico City',
  'ZMVM': 'Mexico City',
};

export interface OficinaPct {
  oficina: string;
  pct: number | null;
}

function semaforoFill(pct: number | null): string {
  if (pct === null) return '#E5E7EB';
  if (pct >= 90) return '#059669';
  if (pct >= 70) return '#D97706';
  return '#DC2626';
}

function semaforoText(pct: number | null): string {
  if (pct === null) return 'text-gray-400';
  if (pct >= 90) return 'text-emerald-700';
  if (pct >= 70) return 'text-amber-700';
  return 'text-red-700';
}

export default function MapaInternoPOA({ data }: { data: OficinaPct[] }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const locations: Location[] = (mexicoMap as { locations: Location[] }).locations;
  const viewBox: string = (mexicoMap as { viewBox: string }).viewBox;

  // Build lookup: SVG name → entry (last write wins for CDMX-ZMVM / ZMVM conflict)
  const byName = new Map<string, OficinaPct>();
  data.forEach(d => {
    const svgName = ORPA_TO_SVG[d.oficina] ?? d.oficina;
    const existing = byName.get(svgName);
    if (!existing || (d.pct !== null && (existing.pct === null || d.pct > existing.pct))) {
      byName.set(svgName, d);
    }
  });

  const hEntry = hovered ? byName.get(hovered) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-800 mb-0.5">Cumplimiento por Estado</h2>
      <p className="text-xs text-gray-500 mb-4">Avance vs programado acumulado — POA 2026. Clic en un estado para ver detalle.</p>

      {/* Semaphore legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-600">
        {[
          { color: '#059669', label: '≥ 90% — En meta' },
          { color: '#D97706', label: '70–89% — En riesgo' },
          { color: '#DC2626', label: '< 70% — Rezagado' },
          { color: '#E5E7EB', label: 'Sin datos' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-gray-200/50" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg viewBox={viewBox} className="w-full" style={{ maxHeight: 280 }} role="img" aria-label="Mapa de México — cumplimiento POA 2026">
          {locations.map(loc => {
            const entry = byName.get(loc.name);
            const isHover = hovered === loc.name;
            return (
              <path
                key={loc.id}
                d={loc.path}
                fill={semaforoFill(entry?.pct ?? null)}
                stroke={isHover ? '#235B4E' : '#fff'}
                strokeWidth={isHover ? 1.8 : 0.5}
                style={{ cursor: entry ? 'pointer' : 'default', transition: 'stroke 0.1s, fill 0.1s' }}
                onMouseEnter={() => setHovered(loc.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => entry && router.push(`/interno/admin/orpa/${encodeURIComponent(entry.oficina)}`)}
              >
                <title>
                  {loc.name}{entry ? `: ${entry.pct !== null ? entry.pct + '%' : 'Sin datos'}` : ': Sin datos'}
                </title>
              </path>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && hEntry && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-3 py-2.5 rounded-xl shadow-lg text-xs pointer-events-none border border-gray-100 min-w-[120px]">
            <div className="font-semibold text-gray-800 mb-1">{hEntry.oficina}</div>
            <div className={`text-lg font-black ${semaforoText(hEntry.pct)}`}>
              {hEntry.pct !== null ? `${hEntry.pct}%` : '—'}
            </div>
            {hEntry.pct !== null && (
              <div className="text-gray-400 mt-0.5">cumplimiento</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        {[
          { label: 'En meta ≥90%', color: 'text-emerald-700 bg-emerald-50', count: data.filter(d => d.pct !== null && d.pct >= 90).length },
          { label: 'En riesgo 70–89%', color: 'text-amber-700 bg-amber-50', count: data.filter(d => d.pct !== null && d.pct >= 70 && d.pct < 90).length },
          { label: 'Rezagado <70%', color: 'text-red-700 bg-red-50', count: data.filter(d => d.pct !== null && d.pct < 70).length },
        ].map(({ label, color, count }) => (
          <div key={label} className={`rounded-lg px-2 py-2 ${color}`}>
            <div className="text-xl font-black">{count}</div>
            <div className="leading-tight mt-0.5 opacity-80">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
