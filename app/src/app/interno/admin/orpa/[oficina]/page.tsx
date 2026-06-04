'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STATUS_COLOR: Record<string, string> = {
  aprobado: '#10B981',
  enviado: '#3B82F6',
  borrador: '#F59E0B',
  rechazado: '#EF4444',
  sin_captura: '#E5E7EB',
};
const STATUS_LABEL: Record<string, string> = {
  aprobado: 'Aprobado', enviado: 'Enviado', borrador: 'Borrador',
  rechazado: 'Rechazado', sin_captura: 'Sin captura',
};

function pctColor(pct: number | null): string {
  if (pct === null) return 'bg-gray-100 text-gray-400';
  if (pct >= 90) return 'bg-emerald-100 text-emerald-700 font-bold';
  if (pct >= 70) return 'bg-amber-100 text-amber-700 font-bold';
  return 'bg-red-100 text-red-700 font-bold';
}
function pctBg(pct: number | null): string {
  if (pct === null) return '#E5E7EB';
  if (pct >= 90) return '#10B981';
  if (pct >= 70) return '#F59E0B';
  return '#EF4444';
}

interface MesChart { mes: number; label: string; prog: number; avan: number; pct: number | null; capturas: number; }
interface CellData { id: number; status: string; avance: number | null; programado: number | null; pct: number | null; notas: string | null; }
interface Indicador { id: number; codigo: string; nombre: string; serie: string; meta_anual: number | null; }
interface OrpaDetail {
  oficina: string;
  indicadores: Indicador[];
  matrix: Record<string, Record<number, CellData>>;
  chartMeses: MesChart[];
  stats: {
    total_indicadores: number; total_capturas: number;
    aprobadas: number; enviadas: number; borradores: number; rechazadas: number;
    prog_sum: number; avan_sum: number; pct_overall: number | null;
    last_activity: string | null;
  };
}

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
      {icon && <span className="text-2xl flex-shrink-0">{icon}</span>}
      <div>
        <div className={`text-2xl font-bold ${color ?? 'text-gray-800'}`}>{value}</div>
        <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {name:string; value:number; fill:string}[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.name}</span>
          </div>
          <span className="font-bold text-gray-800">{p.value}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-gray-500">
          {Math.round((payload[1].value / payload[0].value) * 100)}% avance
        </div>
      )}
    </div>
  );
};

export default function OrpaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const oficina = decodeURIComponent(params.oficina as string);

  const [data, setData] = useState<OrpaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [hoveredCell, setHoveredCell] = useState<{ codigo: string; mes: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/interno/auth/me').then(r => r.json()),
      fetch(`/api/interno/admin/orpa/${encodeURIComponent(oficina)}`).then(r => r.json()),
    ]).then(([me, detail]) => {
      if (me.error || me.user?.role !== 'admin') { router.push('/interno/login'); return; }
      if (detail.error) { setError(detail.error); return; }
      setData(detail);
    }).catch(() => setError('Error al cargar los datos'))
      .finally(() => setLoading(false));
  }, [oficina, router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando detalle de {oficina}...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-600 font-medium">{error}</p>
        <Link href="/interno/admin" className="mt-4 inline-block text-sm text-[#235B4E] hover:underline">← Volver al panel</Link>
      </div>
    </div>
  );

  const { stats, indicadores, matrix, chartMeses } = data!;
  const chartData = chartMeses.filter(m => m.prog > 0 || m.avan > 0);
  const lastDate = stats.last_activity
    ? new Date(stats.last_activity).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#235B4E] to-[#1a4439] text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-center gap-4 h-16">
            <Link href="/interno/admin"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">Panel Admin</span>
                <span className="text-white/40 text-sm">/</span>
                <span className="text-white/60 text-sm">ORPAs</span>
                <span className="text-white/40 text-sm">/</span>
                <span className="font-semibold truncate">{oficina}</span>
              </div>
              <p className="text-green-300 text-xs">POA 2026 · Detalle de oficina</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/interno/admin/capturas?oficina=${encodeURIComponent(oficina)}`}
                className="text-sm border border-white/30 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
                Ver capturas
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Indicadores" value={stats.total_indicadores} sub="POA 2026" color="text-[#235B4E]" icon="📋" />
          <KpiCard label="Capturas totales" value={stats.total_capturas} color="text-gray-800" icon="📊" />
          <KpiCard label="Aprobadas" value={stats.aprobadas} color="text-emerald-600" icon="✅"
            sub={stats.total_capturas > 0 ? `${Math.round((stats.aprobadas / stats.total_capturas) * 100)}% del total` : undefined} />
          <KpiCard label="Enviadas" value={stats.enviadas} color="text-blue-600" sub="pendiente revisión" icon="⏳" />
          <KpiCard label="Borradores" value={stats.borradores} color="text-amber-600" icon="✏️" />
          <KpiCard
            label="Cumplimiento global"
            value={stats.pct_overall !== null ? `${stats.pct_overall}%` : '—'}
            color={pctColor(stats.pct_overall).replace('bg-', 'text-').replace('-100', '-700').replace(' font-bold', '')}
            sub={lastDate ? `Última actividad: ${lastDate}` : undefined}
            icon="🎯"
          />
        </div>

        {/* Indicator compliance bars */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Cumplimiento por indicador (capturas aprobadas)</h2>
          {indicadores.every(ind => !Object.values(matrix[ind.codigo] ?? {}).some(c => c.status === 'aprobado')) ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin capturas aprobadas todavía</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              {indicadores.map(ind => {
                const cells = Object.values(matrix[ind.codigo] ?? {});
                const approved = cells.filter(c => c.status === 'aprobado');
                const prog = approved.reduce((s, c) => s + (c.programado ?? 0), 0);
                const avan = approved.reduce((s, c) => s + (c.avance ?? 0), 0);
                const pct = prog > 0 ? Math.round((avan / prog) * 100) : null;
                return (
                  <div key={ind.codigo} className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-[#235B4E]/10 text-[#235B4E] px-2 py-0.5 rounded flex-shrink-0 w-20 text-center">
                      {ind.codigo}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate mb-1" title={ind.nombre}>{ind.nombre}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: pctBg(pct) }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-10 text-right flex-shrink-0 ${pctColor(pct).replace('bg-', 'text-').replace('-100', '-700')}`}>
                          {pct !== null ? `${pct}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Monthly chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-gray-800">Programado vs Avance por mes</h2>
                <p className="text-xs text-gray-500 mt-0.5">Solo capturas con status aprobado</p>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setChartType('bar')}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  Barras
                </button>
                <button onClick={() => setChartType('line')}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${chartType === 'line' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  Líneas
                </button>
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
                Sin datos aprobados para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                {chartType === 'bar' ? (
                  <BarChart data={chartData} barGap={4} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Bar dataKey="prog" name="Programado" fill="#CBD5E1" radius={[4,4,0,0]} />
                    <Bar dataKey="avan" name="Avance" fill="#10B981" radius={[4,4,0,0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Line type="monotone" dataKey="prog" name="Programado" stroke="#CBD5E1" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="avan" name="Avance" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* % por mes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-5">% Cumplimiento mensual</h2>
            <div className="space-y-2">
              {chartMeses.map(m => (
                <div key={m.mes} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 w-8 flex-shrink-0">{m.label}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: m.pct !== null ? `${Math.min(m.pct, 100)}%` : '0%',
                        background: pctBg(m.pct),
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right flex-shrink-0 ${
                    m.pct === null ? 'text-gray-300' :
                    m.pct >= 90 ? 'text-emerald-600' : m.pct >= 70 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {m.pct !== null ? `${m.pct}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
            {stats.pct_overall !== null && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Global acumulado</span>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${pctColor(stats.pct_overall)}`}>
                  {stats.pct_overall}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Indicator × Month Matrix */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Matriz indicador × mes</h2>
              <p className="text-xs text-gray-500 mt-0.5">Avance / Programado por cada indicador y mes</p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              {(['aprobado','enviado','borrador','rechazado','sin_captura'] as const).map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
                  <span>{STATUS_LABEL[s]}</span>
                </div>
              ))}
            </div>
          </div>

          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 text-gray-500 font-medium w-20">Código</th>
                <th className="text-left py-2 pr-4 text-gray-500 font-medium min-w-[200px]">Indicador</th>
                {MESES.slice(1).map((m, i) => (
                  <th key={i} className="text-center py-2 px-0.5 text-gray-400 font-medium w-10">{m}</th>
                ))}
                <th className="text-center py-2 px-2 text-gray-500 font-medium">Meta anual</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.map(ind => (
                <tr key={ind.codigo} className="hover:bg-gray-50/80 group border-t border-gray-50">
                  <td className="py-2 pr-3">
                    <span className="text-xs font-bold bg-[#235B4E]/10 text-[#235B4E] px-1.5 py-0.5 rounded whitespace-nowrap">
                      {ind.codigo}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <p className="text-gray-700 leading-tight line-clamp-2" title={ind.nombre}>{ind.nombre}</p>
                    <span className="text-gray-400 text-[10px]">{ind.serie}</span>
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                    const cell = matrix[ind.codigo]?.[mes];
                    const status = cell?.status ?? 'sin_captura';
                    const pct = cell?.pct ?? null;
                    const isHovered = hoveredCell?.codigo === ind.codigo && hoveredCell?.mes === mes;
                    return (
                      <td key={mes} className="py-1.5 px-0.5 text-center">
                        <div
                          onMouseEnter={() => setHoveredCell({ codigo: ind.codigo, mes })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className="relative w-9 h-9 rounded-lg mx-auto flex items-center justify-center cursor-default transition-all"
                          style={{
                            background: STATUS_COLOR[status] ?? STATUS_COLOR.sin_captura,
                            color: status === 'sin_captura' ? '#9CA3AF' : '#fff',
                            transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                          }}
                          title={`${ind.codigo} · ${MESES_FULL[mes]}\nEstado: ${STATUS_LABEL[status]}${pct !== null ? `\nCumplimiento: ${pct}%` : ''}${cell?.avance !== null ? `\nAvance: ${cell?.avance}` : ''}${cell?.programado !== null ? `\nProgramado: ${cell?.programado}` : ''}`}
                        >
                          <span className="text-[10px] font-bold leading-none">
                            {pct !== null ? `${pct}%` : '—'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-center">
                    <span className="text-gray-600 font-medium">{ind.meta_anual ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status summary for this ORPA */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { status: 'aprobado', label: 'Aprobadas', count: stats.aprobadas, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '✓' },
            { status: 'enviado', label: 'En revisión', count: stats.enviadas, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '⏳' },
            { status: 'borrador', label: 'Borradores', count: stats.borradores, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '✏' },
            { status: 'rechazado', label: 'Rechazadas', count: stats.rechazadas, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '✗' },
          ]).map(s => (
            <Link key={s.status}
              href={`/interno/admin/capturas?oficina=${encodeURIComponent(oficina)}&status=${s.status}`}
              className={`${s.bg} border-2 ${s.border} rounded-2xl p-5 hover:shadow-md transition-all group`}>
              <div className={`text-3xl font-bold ${s.text}`}>{s.count}</div>
              <div className={`text-sm font-medium ${s.text} mt-1`}>{s.label}</div>
              <div className="text-xs text-gray-500 mt-2 group-hover:underline">Ver capturas →</div>
            </Link>
          ))}
        </div>

      </main>
    </div>
  );
}
