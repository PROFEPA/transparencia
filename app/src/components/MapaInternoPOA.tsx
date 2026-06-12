'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import mexicoMap from '@svg-maps/mexico';

type Location = { id: string; name: string; path: string };

// Maps internal Unidad Responsable names to SVG location names
const ORPA_TO_SVG: Record<string, string> = {
  'CDMX-ZMVM': 'Mexico City',
  'ZMVM': 'Mexico City',
};

export interface OficinaPct {
  oficina: string;
  pct: number | null;
}

const MAP_FILL = '#059669';

function mapFill(pct: number | null): string {
  return pct === null ? '#E5E7EB' : MAP_FILL;
}

function pctText(pct: number | null): string {
  return pct === null ? 'text-gray-400' : 'text-[#235B4E]';
}

export default function MapaInternoPOA({ data }: { data: OficinaPct[] }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const locations: Location[] = (mexicoMap as { locations: Location[] }).locations;
  const viewBox: string = (mexicoMap as { viewBox: string }).viewBox;

  // Build lookup: SVG name to entry.
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
      <h2 className="font-semibold text-gray-800 mb-0.5">Referencia geográfica por Estado</h2>
      <p className="text-xs text-gray-500 mb-4">Avance vs programado acumulado — POA 2026. Clic en un estado para ver detalle.</p>

      <div className="relative">
        <svg viewBox={viewBox} className="w-full" style={{ maxHeight: 280 }} role="img" aria-label="Mapa de México — cumplimiento POA 2026">
          {locations.map(loc => {
            const entry = byName.get(loc.name);
            const isHover = hovered === loc.name;
            return (
              <path
                key={loc.id}
                d={loc.path}
                fill={mapFill(entry?.pct ?? null)}
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
            <div className={`text-lg font-black ${pctText(hEntry.pct)}`}>
              {hEntry.pct !== null ? `${hEntry.pct}%` : '—'}
            </div>
            {hEntry.pct !== null && (
              <div className="text-gray-400 mt-0.5">cumplimiento</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
