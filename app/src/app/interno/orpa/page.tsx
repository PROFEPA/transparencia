'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: string; ring: string }> = {
  aprobado: { label: 'Aprobado',  bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: '✓', ring: 'ring-emerald-300' },
  enviado:  { label: 'En revisión', bg: 'bg-blue-50',   text: 'text-blue-700',    icon: '⏳', ring: 'ring-blue-300' },
  borrador: { label: 'Borrador',  bg: 'bg-amber-50',    text: 'text-amber-700',   icon: '✏', ring: 'ring-amber-300' },
  rechazado:{ label: 'Rechazado', bg: 'bg-red-50',      text: 'text-red-700',     icon: '✗', ring: 'ring-red-300' },
};
const BORDER_STATUS: Record<string, string> = {
  aprobado: 'border-emerald-300 bg-emerald-50',
  enviado: 'border-blue-300 bg-blue-50',
  rechazado: 'border-red-300 bg-red-50',
  borrador: 'border-amber-300 bg-amber-50',
};

interface User { nombre: string; oficina: string; email: string; }
interface Captura { mes: number; status: string; avance: number | null; programado: number | null; }
interface Indicador { id: number; codigo: string; nombre: string; serie: string; }

export default function OrpaDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/interno/auth/me').then(r => r.json()),
      fetch('/api/interno/indicadores').then(r => r.json()),
      fetch('/api/interno/capturas').then(r => r.json()),
    ]).then(([me, inds, caps]) => {
      if (me.error) { router.push('/interno/login'); return; }
      setUser(me.user);
      const unique = new Map<number, Indicador>();
      (inds as Indicador[]).forEach((i: Indicador) => unique.set(i.id, i));
      setIndicadores([...unique.values()]);
      setCapturas(caps);
    }).finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/interno/auth/logout', { method: 'POST' });
    router.push('/interno/login');
  }

  function statusForMes(mes: number): string | null {
    const c = capturas.find(c => c.mes === mes);
    return c ? c.status : null;
  }

  const mesActual = new Date().getMonth() + 1;

  const statsCount = {
    aprobado: capturas.filter(c => c.status === 'aprobado').length,
    enviado: capturas.filter(c => c.status === 'enviado').length,
    borrador: capturas.filter(c => c.status === 'borrador').length,
    rechazado: capturas.filter(c => c.status === 'rechazado').length,
  };

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const cap = capturas.find(c => c.mes === mes);
    return { label: MESES[mes], mes, status: cap?.status ?? 'sin_captura' };
  });

  const pctGlobal = (() => {
    const approved = capturas.filter(c => c.status === 'aprobado');
    const prog = approved.reduce((s, c) => s + (c.programado ?? 0), 0);
    const avan = approved.reduce((s, c) => s + (c.avance ?? 0), 0);
    return prog > 0 ? Math.round((avan / prog) * 100) : null;
  })();

  const barColor: Record<string, string> = {
    aprobado: '#10B981', enviado: '#3B82F6', borrador: '#F59E0B',
    rechazado: '#EF4444', sin_captura: '#E5E7EB',
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando tu portal...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#235B4E] to-[#1a4439] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="font-bold text-lg leading-tight">POA 2026 — Portal ORPA</h1>
              <p className="text-green-300 text-xs font-medium">{user?.oficina}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-200 text-sm hidden sm:block">{user?.nombre}</span>
              <button onClick={handleLogout}
                className="text-sm border border-white/30 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Welcome + global % */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">Hola, {user?.nombre?.split(' ')[0]}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Estás registrando el avance de <strong className="text-gray-700">{indicadores.length} indicadores</strong> para la oficina <strong className="text-[#235B4E]">{user?.oficina}</strong> durante 2026.
            </p>
          </div>
          {pctGlobal !== null && (
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className={`text-4xl font-black ${pctGlobal >= 90 ? 'text-emerald-600' : pctGlobal >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                {pctGlobal}%
              </div>
              <div className="text-xs text-gray-500 mt-0.5">cumplimiento global</div>
            </div>
          )}
        </div>

        {/* Status counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(STATUS_META) as [string, typeof STATUS_META[string]][]).map(([st, meta]) => (
            <div key={st} className={`${meta.bg} rounded-2xl border border-transparent p-5`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${meta.text} bg-white/70`}>
                  {meta.icon}
                </span>
                <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
              </div>
              <div className={`text-3xl font-black ${meta.text}`}>{statsCount[st as keyof typeof statsCount]}</div>
              <div className={`text-xs ${meta.text} opacity-70 mt-0.5`}>meses</div>
            </div>
          ))}
        </div>

        {/* Año calendario */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Calendario de capturas 2026</h2>
              <p className="text-xs text-gray-500 mt-0.5">Haz clic en cualquier mes pasado o actual para registrar avances</p>
            </div>
            <div className="text-xs text-gray-500 bg-[#235B4E]/5 text-[#235B4E] px-3 py-1.5 rounded-lg font-medium">
              Mes actual: {MESES_FULL[mesActual]}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
              const status = statusForMes(mes);
              const isFuture = mes > mesActual;
              const isCurrentMonth = mes === mesActual;
              const borderClass = status ? BORDER_STATUS[status] ?? 'border-gray-200 bg-white' : 'border-gray-200 bg-white';
              return (
                <Link key={mes}
                  href={`/interno/orpa/captura/${mes}`}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                    ${isFuture ? 'border-gray-100 bg-gray-50 opacity-40 pointer-events-none' : `${borderClass} cursor-pointer hover:shadow-md hover:scale-105`}
                    ${isCurrentMonth && !status ? 'ring-2 ring-[#235B4E] ring-offset-2 border-[#235B4E]/40' : ''}`}
                >
                  <span className="text-sm font-bold text-gray-700">{MESES[mes]}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{mes.toString().padStart(2,'0')}/26</span>
                  {status ? (
                    <div className="mt-2">
                      <span className={`text-lg ${
                        status === 'aprobado' ? 'text-emerald-600' :
                        status === 'enviado' ? 'text-blue-600' :
                        status === 'rechazado' ? 'text-red-600' : 'text-amber-600'}`}>
                        {status === 'aprobado' ? '✓' : status === 'enviado' ? '⏳' : status === 'rechazado' ? '✗' : '✏'}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {isFuture
                        ? <span className="text-gray-300 text-sm">—</span>
                        : isCurrentMonth
                          ? <span className="text-xs text-[#235B4E] font-semibold">Capturar</span>
                          : <span className="text-xs text-gray-400">Pendiente</span>
                      }
                    </div>
                  )}
                  {isCurrentMonth && (
                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#235B4E] rounded-full ring-2 ring-white" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Monthly status bar chart */}
        {capturas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Estado de capturas por mes</h2>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} barSize={28} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                  formatter={(_: unknown, __: string, props: {payload?: {status: string}}) => [props.payload?.status ?? '—', 'Estado']}
                />
                <Bar dataKey={() => 1} radius={[4, 4, 4, 4]} isAnimationActive>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={barColor[entry.status] ?? '#E5E7EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3">
              {Object.entries({ aprobado: 'Aprobado', enviado: 'En revisión', borrador: 'Borrador', rechazado: 'Rechazado', sin_captura: 'Sin captura' }).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded-sm" style={{ background: barColor[k] }} />
                  {v}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicadores list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              Indicadores asignados
              <span className="ml-2 text-sm font-normal text-gray-400">({indicadores.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {indicadores.map(ind => (
              <div key={ind.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors group">
                <span className="text-xs font-bold bg-[#235B4E]/10 text-[#235B4E] px-2.5 py-1 rounded-lg flex-shrink-0">
                  {ind.codigo}
                </span>
                <span className="text-sm text-gray-700 flex-1 line-clamp-1">{ind.nombre}</span>
                <span className="text-xs text-gray-400 hidden sm:block">{ind.serie}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
