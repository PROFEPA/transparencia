'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts';
import MapaInternoPOA from '@/components/MapaInternoPOA';
import type { OficinaPct } from '@/components/MapaInternoPOA';

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const STATUS_COLOR: Record<string, string> = {
  aprobado: '#10B981', enviado: '#3B82F6', borrador: '#F59E0B',
  rechazado: '#EF4444', sin_captura: '#E5E7EB',
};

function pctColor(pct: number | null): string {
  if (pct === null) return 'bg-gray-100 text-gray-400';
  return 'bg-[#235B4E]/10 text-[#235B4E] font-bold';
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    aprobado: 'bg-emerald-500', enviado: 'bg-blue-500',
    borrador: 'bg-amber-400', rechazado: 'bg-red-500', sin_captura: 'bg-gray-200',
  };
  return <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${colors[status] ?? 'bg-gray-200'}`} />;
}

interface MesData { mes: number; label: string; aprobadas: number; enviadas: number; borradores: number; rechazadas: number; prog: number; avan: number; pct: number | null; }
interface MesCell { status: string; pct: number | null; avance: number | null; programado: number | null; }
interface OficinaRow { oficina: string; total: number; aprobadas: number; enviadas: number; pct_overall: number | null; meses: Record<number, MesCell>; }
interface IndicadorRow { codigo: string; nombre: string; serie: string; capturas: number; aprobadas: number; oficinas: number; pct: number | null; prog_pct: number | null; avan_pct: number | null; }
interface PieEntry { name: string; value: number; color: string; }

const COMPLIANCE_COLOR = '#059669';

const NavLink = ({ href, label, active }: { href: string; label: string; active?: boolean }) => (
  <Link href={href} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
    {label}
  </Link>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [resumen, setResumen] = useState<{ global: Record<string, number>; totalIndicadores: number; totalOficinas: number; totalIndicadoresDistinct: number; metasRegistradas: number } | null>(null);
  const [stats, setStats] = useState<{ porMesChart: MesData[]; matriz: OficinaRow[]; indicadores: IndicadorRow[]; pie: PieEntry[]; total: number; corteMes: number | null } | null>(null);
  const [tab, setTab] = useState<'resumen' | 'orpas' | 'indicadores'>('resumen');

  useEffect(() => {
    Promise.all([
      fetch('/api/interno/auth/me').then(r => r.json()),
      fetch('/api/interno/admin/resumen').then(r => r.json()),
      fetch('/api/interno/admin/estadisticas').then(r => r.json()),
    ]).then(([me, res, st]) => {
      if (me.error || me.user?.role !== 'admin') { router.push('/interno/login'); return; }
      setUser(me.user);
      setResumen(res);
      setStats(st);
    }).finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/interno/auth/logout', { method: 'POST' });
    router.push('/interno/login');
  }

  const g = resumen?.global ?? {};

  const mapaData: OficinaPct[] = (stats?.matriz ?? []).map(ofc => ({
    oficina: ofc.oficina,
    pct: ofc.pct_overall,
  }));
  const corteLabel = stats?.corteMes ? MESES[stats.corteMes] : 'Abr';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando panel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#235B4E] to-[#1a4439] text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="font-bold text-lg leading-tight">POA 2026</h1>
                <p className="text-green-300 text-xs">Panel Administrador · PROFEPA</p>
              </div>
              <nav className="hidden md:flex items-center gap-1">
                <NavLink href="/interno/admin" label="Dashboard" active />
                <NavLink href="/interno/admin/capturas" label="Capturas" />
                <NavLink href="/interno/admin/publicar" label="Publicar" />
                <NavLink href="/interno/admin/usuarios" label="Usuarios" />
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-200 text-sm hidden sm:block">{user?.nombre}</span>
              <button onClick={handleLogout}
                className="text-sm border border-white/30 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Registros en el POA', value: resumen?.totalIndicadores ?? 0, icon: '📋', color: 'text-[#235B4E]' },
            { label: 'Unidades Responsables', value: resumen?.totalOficinas ?? 0, icon: '🏢', color: 'text-[#235B4E]' },
            { label: 'Indicadores POA', value: resumen?.totalIndicadoresDistinct ?? 0, icon: '📊', color: 'text-gray-700' },
            { label: 'Aprobadas', value: g.aprobadas ?? 0, icon: '✅', color: 'text-emerald-700' },
            { label: 'Pendientes revisión', value: g.pendientes ?? 0, icon: '⏳', color: 'text-blue-700' },
            { label: 'Borradores abiertos', value: g.borradores ?? 0, icon: '✏️', color: 'text-amber-700' },
          ].map(k => (
            <div key={k.label} className="flex items-center gap-3">
              <span className="text-2xl">{k.icon}</span>
              <div>
                <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                <div className="text-xs text-gray-500 leading-tight">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparativo Metas vs Avances */}
      <div className="bg-[#235B4E]/5 border-b border-[#235B4E]/10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-6 flex-wrap">
          <span className="text-xs font-semibold text-[#235B4E] uppercase tracking-wide">Avance nacional 2026</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Metas Registradas</span>
            <span className="text-sm font-bold text-[#235B4E]">{(resumen?.metasRegistradas ?? 0).toLocaleString('es-MX')}</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Avances Capturados</span>
            <span className="text-sm font-bold text-emerald-600">{(g.aprobadas ?? 0).toLocaleString('es-MX')}</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Cobertura</span>
            <span className="text-sm font-bold text-gray-700">
              {resumen?.metasRegistradas ? `${Math.round(((g.aprobadas ?? 0) / resumen.metasRegistradas) * 100)}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-6 flex gap-1">
          {([
            { id: 'resumen', label: 'Resumen general' },
            { id: 'orpas', label: `Por UR (${stats?.matriz.length ?? 0})` },
            { id: 'indicadores', label: `Por Indicador (${stats?.indicadores.length ?? 0})` },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id
                ? 'border-[#235B4E] text-[#235B4E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-screen-2xl mx-auto px-6 py-6">

        {/* ── TAB: RESUMEN ── */}
        {tab === 'resumen' && stats && (
          <div className="space-y-6">

            {/* ── GRÁFICA TIPO EXCEL: Cumplimiento por Indicador ── */}
            {stats.indicadores.some(i => i.pct !== null) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-gray-800">Porcentaje de Cumplimiento — Indicadores Institucionales</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Avance acumulado vs programado (Ene–{corteLabel} 2026). Promedio nacional por indicador.
                  </p>
                </div>
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                  <span>— Línea 100%</span>
                </div>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: Math.max(600, stats.indicadores.length * 42) }}>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={stats.indicadores}
                        barSize={20}
                        margin={{ top: 28, right: 16, left: 8, bottom: 55 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                        <XAxis
                          dataKey="codigo"
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          angle={-40}
                          textAnchor="end"
                          interval={0}
                          height={60}
                        />
                        <YAxis
                          tickFormatter={v => `${v}%`}
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          domain={[0, (dataMax: number) => Math.max(120, Math.min(dataMax + 20, 400))]}
                          width={46}
                        />
                        <ReferenceLine y={100} stroke="#64748B" strokeDasharray="5 3" strokeWidth={1.5}
                          label={{ value: '100%', position: 'right', fontSize: 10, fill: '#64748B' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
                          formatter={(val: number) => [`${val ?? '—'}%`, 'Cumplimiento']}
                          labelFormatter={(code: string) => {
                            const ind = stats.indicadores.find(i => i.codigo === code);
                            return ind ? `${code} — ${ind.nombre}` : code;
                          }}
                        />
                        <Bar dataKey="pct" radius={[4, 4, 0, 0]} fill="#059669">
                          <LabelList dataKey="pct" position="top" style={{ fontSize: 9, fontWeight: 600 }}
                            formatter={(v: number | null) => v != null ? `${v}%` : ''} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">

              {/* Mexico map */}
              <MapaInternoPOA data={mapaData} />

              {/* % Cumplimiento por UR */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-gray-800">% Cumplimiento por Unidad Responsable</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Avance acumulado vs programado — Ene–Abr 2026</p>
                </div>
                {mapaData.filter(d => d.pct !== null).length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">Sin datos disponibles</div>
                ) : (
                  <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={Math.max(260, mapaData.filter(d => d.pct !== null).length * 26)}>
                      <BarChart
                        data={[...mapaData].filter(d => d.pct !== null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))}
                        layout="vertical"
                        barSize={14}
                        margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                        <XAxis type="number" domain={[0, (max: number) => Math.max(100, max + 10)]}
                          tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#6B7280' }} />
                        <YAxis type="category" dataKey="oficina" width={90}
                          tick={{ fontSize: 10, fill: '#6B7280' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                          formatter={(val: number) => [`${val}%`, 'Cumplimiento']}
                        />
                        <Bar dataKey="pct" name="Cumplimiento" radius={[0, 4, 4, 0]}>
                          {[...mapaData].filter(d => d.pct !== null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).map((d, i) => (
                            <Cell key={i} fill={COMPLIANCE_COLOR} />
                          ))}
                          <LabelList dataKey="pct" position="right" style={{ fontSize: 10, fontWeight: 600, fill: '#374151' }}
                            formatter={(v: number) => `${v}%`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: COMPLIANCE_COLOR }} />
                  Porcentaje acumulado por Unidad Responsable
                </div>
              </div>
            </div>

            {/* Heat matrix */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-800">Matriz de capturas — Unidad Responsable × Mes</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Haz clic en una unidad responsable para ver su detalle completo</p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                  {Object.entries({ aprobado: 'Aprobado', enviado: 'Enviado', borrador: 'Borrador', rechazado: 'Rechazado', sin_captura: 'Sin captura' }).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLOR[k] }} />
                      {v}
                    </div>
                  ))}
                </div>
              </div>
              {stats.matriz.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Sin capturas registradas aún</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium min-w-[140px]">Unidad Responsable</th>
                      {MESES.slice(1).map((m, i) => (
                        <th key={i} className="text-center py-2 px-1 text-gray-400 font-medium w-9">{m}</th>
                      ))}
                      <th className="text-center py-2 px-2 text-gray-500 font-medium">Total</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium">% Cum.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.matriz.map(ofc => (
                      <tr key={ofc.oficina} className="hover:bg-gray-50 group">
                        <td className="py-1.5 pr-4">
                          <Link href={`/interno/admin/orpa/${encodeURIComponent(ofc.oficina)}`}
                            className="font-medium text-[#235B4E] hover:underline truncate block max-w-[140px]" title={ofc.oficina}>
                            {ofc.oficina}
                          </Link>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                          const cell = ofc.meses[mes];
                          const status = cell?.status ?? 'sin_captura';
                          const pct = cell?.pct;
                          return (
                            <td key={mes} className="py-1.5 px-0.5 text-center">
                              <div
                                className="w-8 h-8 rounded-md mx-auto flex items-center justify-center text-[10px] font-bold transition-transform group-hover:scale-105 cursor-default"
                                style={{ background: STATUS_COLOR[status] ?? STATUS_COLOR.sin_captura,
                                  color: status === 'sin_captura' ? '#9CA3AF' : '#fff' }}
                                title={`${ofc.oficina} - ${MESES[mes]}: ${status}${pct !== null ? ` (${pct}%)` : ''}`}
                              >
                                {pct != null ? `${pct}%` : '—'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-center font-medium text-gray-700">{ofc.aprobadas}/{ofc.total}</td>
                        <td className="py-1.5 px-2 text-center">
                          {ofc.pct_overall !== null ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${pctColor(ofc.pct_overall)}`}>
                              {ofc.pct_overall}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: POR UR ── */}
        {tab === 'orpas' && stats && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Haz clic en cualquier tarjeta para ver el detalle completo de esa unidad responsable.
            </p>
            {stats.matriz.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🏢</p>
                <p className="font-medium">Sin capturas de ninguna unidad responsable todavía</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stats.matriz.map(ofc => {
                  const mesesData = Array.from({ length: 12 }, (_, i) => {
                    const mes = i + 1;
                    return ofc.meses[mes] ?? { status: 'sin_captura', pct: null };
                  });
                  return (
                    <Link key={ofc.oficina} href={`/interno/admin/orpa/${encodeURIComponent(ofc.oficina)}`}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-[#235B4E]/30 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-[#235B4E]">{ofc.oficina}</h3>
                        {ofc.pct_overall !== null && (
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${pctColor(ofc.pct_overall)}`}>
                            {ofc.pct_overall}%
                          </span>
                        )}
                      </div>

                      {/* Mini month grid */}
                      <div className="grid grid-cols-6 gap-1 mb-3">
                        {mesesData.map((cell, i) => (
                          <div key={i}
                            className="h-3 rounded-sm"
                            style={{ background: STATUS_COLOR[cell.status] ?? STATUS_COLOR.sin_captura }}
                            title={`${MESES[i + 1]}: ${cell.status}`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><StatusDot status="aprobado" />{ofc.aprobadas} apr.</span>
                        <span className="flex items-center gap-1"><StatusDot status="enviado" />{ofc.enviadas} env.</span>
                        <span className="text-gray-400 ml-auto">{ofc.total} capturas</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: POR INDICADOR ── */}
        {tab === 'indicadores' && stats && (
          <div className="space-y-4">
            {/* Serie legend */}
            <div className="flex flex-wrap gap-2">
              {[...new Set(stats.indicadores.map(i => i.serie))].map(serie => (
                <span key={serie} className="text-xs font-bold px-2.5 py-1 bg-[#235B4E]/10 text-[#235B4E] rounded-lg">{serie}</span>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-6">Cumplimiento por indicador (capturas aprobadas)</h2>
              {stats.indicadores.filter(i => i.pct !== null).length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Sin capturas aprobadas todavía</p>
              ) : (
                <div className="space-y-3">
                  {stats.indicadores.map(ind => (
                    <div key={ind.codigo} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-20">
                        <span className="text-xs font-bold bg-[#235B4E]/10 text-[#235B4E] px-2 py-0.5 rounded">{ind.codigo}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate mb-1" title={ind.nombre}>{ind.nombre}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(ind.pct ?? 0, 100)}%`,
                                background: COMPLIANCE_COLOR,
                              }} />
                          </div>
                          <span className={`text-xs font-bold w-12 text-right ${pctColor(ind.pct)}`}>
                            {ind.pct !== null ? `${ind.pct}%` : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right text-xs text-gray-400">
                        <div>{ind.aprobadas}/{ind.capturas}</div>
                        <div>{ind.oficinas} UR</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart version */}
            {stats.indicadores.some(i => i.pct !== null) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Gráfica de cumplimiento por indicador</h2>
                <ResponsiveContainer width="100%" height={Math.max(300, stats.indicadores.length * 28)}>
                  <BarChart
                    data={stats.indicadores.filter(i => i.pct !== null)}
                    layout="vertical" barSize={14} margin={{ left: 10, right: 50, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis type="category" dataKey="codigo" width={70} tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                      formatter={(val: number) => [`${val}%`, 'Cumplimiento']}
                    />
                    <Bar dataKey="pct" name="Cumplimiento" radius={[0, 4, 4, 0]}>
                      {stats.indicadores.filter(i => i.pct !== null).map((ind, idx) => (
                        <Cell key={idx} fill={COMPLIANCE_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
