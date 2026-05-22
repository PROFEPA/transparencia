'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const STATUS_COLOR: Record<string, string> = {
  aprobado: '#10B981', enviado: '#3B82F6', borrador: '#F59E0B',
  rechazado: '#EF4444', sin_captura: '#E5E7EB',
};

function pctColor(pct: number | null): string {
  if (pct === null) return 'bg-gray-100 text-gray-400';
  if (pct >= 90) return 'bg-emerald-100 text-emerald-700 font-bold';
  if (pct >= 70) return 'bg-amber-100 text-amber-700 font-bold';
  return 'bg-red-100 text-red-700 font-bold';
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
interface IndicadorRow { codigo: string; nombre: string; serie: string; capturas: number; aprobadas: number; oficinas: number; pct: number | null; }
interface PieEntry { name: string; value: number; color: string; }

const NavLink = ({ href, label, active }: { href: string; label: string; active?: boolean }) => (
  <Link href={href} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
    {label}
  </Link>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [resumen, setResumen] = useState<{ global: Record<string, number>; totalIndicadores: number; totalOficinas: number } | null>(null);
  const [stats, setStats] = useState<{ porMesChart: MesData[]; matriz: OficinaRow[]; indicadores: IndicadorRow[]; pie: PieEntry[]; total: number } | null>(null);
  const [tab, setTab] = useState<'resumen' | 'orpas' | 'indicadores'>('resumen');
  const [mesTab, setMesTab] = useState<'capturas' | 'avance'>('capturas');

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
  const pctGlobal = (g.aprobadas && resumen?.totalIndicadores)
    ? Math.round((g.aprobadas / (resumen.totalIndicadores * 37)) * 100) : 0;

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
            { label: 'Indicadores POA', value: resumen?.totalIndicadores ?? 0, icon: '📋', color: 'text-[#235B4E]' },
            { label: 'Oficinas ORPA', value: resumen?.totalOficinas ?? 0, icon: '🏢', color: 'text-[#235B4E]' },
            { label: 'Capturas totales', value: stats?.total ?? 0, icon: '📊', color: 'text-gray-700' },
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

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-6 flex gap-1">
          {([
            { id: 'resumen', label: 'Resumen general' },
            { id: 'orpas', label: `Por ORPA (${stats?.matriz.length ?? 0})` },
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
            <div className="grid lg:grid-cols-3 gap-6">

              {/* Monthly chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">Capturas por mes — 2026</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Distribución de estados por mes</p>
                  </div>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setMesTab('capturas')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${mesTab === 'capturas' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>Capturas</button>
                    <button onClick={() => setMesTab('avance')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${mesTab === 'avance' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>Prog vs Avan</button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  {mesTab === 'capturas' ? (
                    <BarChart data={stats.porMesChart} barSize={22} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="aprobadas" name="Aprobadas" stackId="a" fill="#10B981" radius={[0,0,0,0]} />
                      <Bar dataKey="enviadas" name="Enviadas" stackId="a" fill="#3B82F6" />
                      <Bar dataKey="borradores" name="Borradores" stackId="a" fill="#F59E0B" />
                      <Bar dataKey="rechazadas" name="Rechazadas" stackId="a" fill="#EF4444" radius={[4,4,0,0]} />
                    </BarChart>
                  ) : (
                    <BarChart data={stats.porMesChart.filter(m => m.prog > 0)} barSize={22} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                        formatter={(val: number, name: string) => [val, name === 'prog' ? 'Programado' : 'Avance']} />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => v === 'prog' ? 'Programado' : 'Avance'} />
                      <Bar dataKey="prog" name="prog" fill="#CBD5E1" radius={[4,4,0,0]} />
                      <Bar dataKey="avan" name="avan" fill="#10B981" radius={[4,4,0,0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Pie + quick actions */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Estado actual</h2>
                  {stats.pie.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-sm">Sin capturas todavía</p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={stats.pie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                            {stats.pie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {stats.pie.map(d => (
                          <div key={d.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                              <span className="text-gray-600">{d.name}</span>
                            </div>
                            <span className="font-semibold text-gray-800">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/interno/admin/capturas?status=enviado"
                  className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-2xl p-5 transition-all group">
                  <div className="text-3xl font-bold text-blue-700">{g.pendientes ?? 0}</div>
                  <div className="text-sm text-blue-600 font-medium">Pendientes de revisión</div>
                  <div className="text-xs text-blue-500 mt-2 group-hover:underline">Revisar ahora →</div>
                </Link>
              </div>
            </div>

            {/* Heat matrix */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-800">Matriz de capturas — Oficina × Mes</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Haz clic en una oficina para ver su detalle completo</p>
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
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium min-w-[140px]">Oficina</th>
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
                                {pct !== null ? `${pct}%` : status === 'sin_captura' ? '—' : status[0].toUpperCase()}
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

        {/* ── TAB: POR ORPA ── */}
        {tab === 'orpas' && stats && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Haz clic en cualquier tarjeta para ver el detalle completo de esa oficina.
            </p>
            {stats.matriz.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🏢</p>
                <p className="font-medium">Sin capturas de ninguna ORPA todavía</p>
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
                                background: (ind.pct ?? 0) >= 90 ? '#10B981' : (ind.pct ?? 0) >= 70 ? '#F59E0B' : '#EF4444',
                              }} />
                          </div>
                          <span className={`text-xs font-bold w-12 text-right ${pctColor(ind.pct)}`}>
                            {ind.pct !== null ? `${ind.pct}%` : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right text-xs text-gray-400">
                        <div>{ind.aprobadas}/{ind.capturas}</div>
                        <div>{ind.oficinas} ofic.</div>
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
                        <Cell key={idx} fill={(ind.pct ?? 0) >= 90 ? '#10B981' : (ind.pct ?? 0) >= 70 ? '#F59E0B' : '#EF4444'} />
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
