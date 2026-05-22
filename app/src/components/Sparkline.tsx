'use client';

interface SparklineProps {
  data: Array<number | null | undefined>;
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Mini gráfica de tendencia (SVG puro, sin recharts).
 * Coloreada según dirección: verde sube, rojo baja, gris plana.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 32,
  className = '',
  ariaLabel = 'Tendencia',
}: SparklineProps) {
  const valid = data.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length < 2) {
    return (
      <div
        className={`text-[10px] text-gray-400 italic ${className}`}
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        Sin serie
      </div>
    );
  }
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;

  const stepX = width / Math.max(1, data.length - 1);
  const points = data.map((v, i) => {
    if (typeof v !== 'number' || Number.isNaN(v)) return null;
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).filter((p): p is string => p !== null);

  // Tendencia
  const first = valid[0];
  const last = valid[valid.length - 1];
  const delta = last - first;
  const pct = first !== 0 ? (delta / Math.abs(first)) * 100 : 0;
  const color = Math.abs(pct) < 2 ? '#9ca3af' : delta > 0 ? '#10b981' : '#ef4444';

  // Área bajo la curva (suave)
  const areaPath = `M ${points[0].split(',')[0]},${height} L ${points.join(' L ')} L ${points[points.length - 1].split(',')[0]},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ overflow: 'visible' }}
    >
      <path d={areaPath} fill={color} fillOpacity={0.12} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Punto final */}
      <circle
        cx={points[points.length - 1].split(',')[0]}
        cy={points[points.length - 1].split(',')[1]}
        r={2}
        fill={color}
      />
    </svg>
  );
}
