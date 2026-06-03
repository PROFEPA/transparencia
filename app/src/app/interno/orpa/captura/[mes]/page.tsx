'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

const MES_NOMBRE: Record<number, string> = {
  1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',
  7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre',
};
const MES_KEY: Record<number, string> = {
  1:'prog_ene',2:'prog_feb',3:'prog_mzo',4:'prog_abr',5:'prog_may',6:'prog_jun',
  7:'prog_jul',8:'prog_ago',9:'prog_sep',10:'prog_oct',11:'prog_nov',12:'prog_dic',
};

interface Indicador {
  id: number; codigo: string; nombre: string; serie: string;
  [key: string]: unknown;
}
interface Captura {
  id?: number; indicador_id: number; avance: number | null; notas: string; status: string;
  programado: number | null; motivo_rechazo?: string;
}

function pct(avance: number | null, prog: number | null): number | null {
  if (avance === null || prog === null || prog === 0) return null;
  return Math.round((avance / prog) * 100);
}
function semaforoClass(avance: number | null, prog: number | null): string {
  const p = pct(avance, prog);
  if (p === null) return 'bg-gray-100 text-gray-500';
  if (p >= 90) return 'bg-emerald-100 text-emerald-700 font-bold';
  if (p >= 70) return 'bg-amber-100 text-amber-700 font-bold';
  return 'bg-red-100 text-red-700 font-bold';
}
function semaforoBar(avance: number | null, prog: number | null): string {
  const p = pct(avance, prog);
  if (p === null) return '#E5E7EB';
  if (p >= 90) return '#10B981';
  if (p >= 70) return '#F59E0B';
  return '#EF4444';
}

export default function CapturaPage() {
  const router = useRouter();
  const params = useParams();
  const mes = Number(params.mes);

  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [capturas, setCapturas] = useState<Record<number, Captura>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oficina, setOficina] = useState('');
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<Record<number, string>>({});

  const loadData = useCallback(async () => {
    const [me, inds, caps] = await Promise.all([
      fetch('/api/interno/auth/me').then(r => r.json()),
      fetch('/api/interno/indicadores').then(r => r.json()),
      fetch(`/api/interno/capturas?mes=${mes}`).then(r => r.json()),
    ]);
    if (me.error) { router.push('/interno/login'); return; }
    setOficina(me.user.oficina);

    const unique = new Map<number, Indicador>();
    (inds as Indicador[]).forEach((i: Indicador) => unique.set(i.id, i));
    setIndicadores([...unique.values()]);

    const capMap: Record<number, Captura> = {};
    (caps as Captura[]).forEach((c: Captura) => { capMap[c.indicador_id] = c; });
    setCapturas(capMap);
    setLoading(false);
  }, [mes, router]);

  useEffect(() => { loadData(); }, [loadData]);

  function getCaptura(indId: number): Captura {
    return capturas[indId] ?? { indicador_id: indId, avance: null, notas: '', status: 'borrador', programado: null };
  }

  async function saveCaptura(ind: Indicador, avance: number | null, notas: string) {
    const existing = capturas[ind.id];
    setSaving(ind.id);
    setError(prev => ({ ...prev, [ind.id]: '' }));
    try {
      const method = existing?.id ? 'PUT' : 'POST';
      const url = existing?.id ? `/api/interno/capturas/${existing.id}` : '/api/interno/capturas';
      const body = existing?.id
        ? { avance, notas }
        : { indicador_id: ind.id, mes, avance, notas };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setCapturas(prev => ({
          ...prev,
          [ind.id]: { ...getCaptura(ind.id), id: data.id ?? existing?.id, avance, notas, status: 'borrador' },
        }));
        setSaved(prev => ({ ...prev, [ind.id]: true }));
        setTimeout(() => setSaved(prev => ({ ...prev, [ind.id]: false })), 2000);
      } else {
        const err = await res.json();
        setError(prev => ({ ...prev, [ind.id]: err.error ?? 'Error al guardar' }));
      }
    } finally {
      setSaving(null);
    }
  }

  async function submitAll() {
    setSubmitting(true);
    const borradores = Object.values(capturas).filter(c => c.id && ['borrador','rechazado'].includes(c.status));
    for (const c of borradores) {
      await fetch(`/api/interno/capturas/${c.id}/submit`, { method: 'POST' });
    }
    await loadData();
    setSubmitting(false);
  }

  const allSubmitted = Object.values(capturas).every(c => c.status === 'aprobado');
  const anyBorrador = Object.values(capturas).some(c => c.id && ['borrador','rechazado'].includes(c.status));

  const capturaCount = {
    aprobado: Object.values(capturas).filter(c => c.status === 'aprobado').length,
    enviado: 0,
    borrador: Object.values(capturas).filter(c => c.status === 'borrador').length,
    rechazado: Object.values(capturas).filter(c => c.status === 'rechazado').length,
  };

  const mesAnterior = mes > 1 ? mes - 1 : null;
  const mesSiguiente = mes < 12 ? mes + 1 : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando indicadores...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#235B4E] to-[#1a4439] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-4 h-16">
            <Link href="/interno/orpa"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="font-bold text-lg leading-tight">Captura — {MES_NOMBRE[mes]} 2026</h1>
              <p className="text-green-300 text-xs">{oficina}</p>
            </div>
            {/* Month nav */}
            <div className="hidden sm:flex items-center gap-1">
              {mesAnterior && (
                <Link href={`/interno/orpa/captura/${mesAnterior}`}
                  className="text-xs border border-white/30 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors">
                  ← {MES_NOMBRE[mesAnterior].slice(0,3)}
                </Link>
              )}
              {mesSiguiente && (
                <Link href={`/interno/orpa/captura/${mesSiguiente}`}
                  className="text-xs border border-white/30 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors">
                  {MES_NOMBRE[mesSiguiente].slice(0,3)} →
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Locked notice — all data already registered (imported) */}
        {allSubmitted && Object.keys(capturas).length > 0 && capturaCount.aprobado === indicadores.length && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">Datos de {MES_NOMBRE[mes]} ya registrados</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Los avances de este mes fueron importados del Excel oficial y están confirmados. Para hacer correcciones, contacta al administrador.
              </p>
            </div>
          </div>
        )}

        {/* Status bar + submit */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-gray-600"><strong className="text-gray-800">{capturaCount.aprobado}</strong> registrados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-gray-600"><strong className="text-gray-800">{capturaCount.borrador}</strong> sin confirmar</span>
                </div>
                {capturaCount.rechazado > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-red-600"><strong>{capturaCount.rechazado}</strong> rechazados</span>
                  </div>
                )}
                <span className="text-gray-400">de {indicadores.length} indicadores</span>
              </div>
              {allSubmitted && Object.keys(capturas).length > 0 && (
                <p className="text-sm text-emerald-700 font-medium mt-2">✓ Todos los avances del mes han sido registrados</p>
              )}
            </div>
            {anyBorrador && (
              <button onClick={submitAll} disabled={submitting}
                className="bg-[#235B4E] hover:bg-[#1a4439] text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2 flex-shrink-0">
                {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {submitting ? 'Registrando...' : `Confirmar ${capturaCount.borrador} avances`}
              </button>
            )}
          </div>
        </div>

        {/* Capture cards */}
        <div className="space-y-3">
          {indicadores.map(ind => {
            const cap = getCaptura(ind.id);
            const prog = (ind[MES_KEY[mes]] as number | null) ?? cap.programado;
            const isLocked = cap.status === 'enviado' || cap.status === 'aprobado';
            const p = pct(cap.avance, prog);
            const statusColors: Record<string, string> = {
              aprobado: 'border-emerald-200 bg-emerald-50/30',
              enviado: 'border-blue-200 bg-blue-50/20',
              rechazado: 'border-red-200 bg-red-50/20',
            };
            const cardBorder = statusColors[cap.status] ?? 'border-gray-100 bg-white';

            return (
              <div key={ind.id} className={`rounded-2xl border shadow-sm p-5 transition-all ${cardBorder}`}>
                {/* Indicator header */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xs font-bold bg-[#235B4E]/10 text-[#235B4E] px-2.5 py-1 rounded-lg flex-shrink-0">
                    {ind.codigo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{ind.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ind.serie}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${
                    cap.status === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
                    cap.status === 'enviado' ? 'bg-blue-100 text-blue-700' :
                    cap.status === 'rechazado' ? 'bg-red-100 text-red-700' :
                    cap.id ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {cap.status === 'borrador' ? 'Sin confirmar' :
                     cap.status === 'enviado' ? 'Registrado' :
                     cap.status === 'aprobado' ? 'Registrado' :
                     cap.status === 'rechazado' ? 'Rechazado' : 'Sin captura'}
                  </span>
                </div>

                {cap.motivo_rechazo && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex gap-2">
                    <span className="flex-shrink-0 font-bold">Motivo de rechazo:</span>
                    <span>{cap.motivo_rechazo}</span>
                  </div>
                )}

                {/* Progress bar */}
                {prog !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Avance vs programado</span>
                      <span className={`font-bold ${p === null ? 'text-gray-400' : p >= 90 ? 'text-emerald-600' : p >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {p !== null ? `${p}%` : '—'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(p ?? 0, 100)}%`, background: semaforoBar(cap.avance, prog) }}
                      />
                    </div>
                  </div>
                )}

                {/* Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Programado</label>
                    <div className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 text-center">
                      {prog ?? '—'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Avance *
                      {!isLocked && <span className="ml-1 text-gray-400 font-normal">(se guarda al salir)</span>}
                    </label>
                    <input
                      type="number" min="0" step="any"
                      disabled={isLocked}
                      defaultValue={cap.avance ?? ''}
                      key={`${ind.id}-${cap.avance}`}
                      onBlur={e => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        if (val !== cap.avance) saveCaptura(ind, val, cap.notas ?? '');
                      }}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E] transition-colors
                        ${isLocked ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'}`}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">% Avance</label>
                    <div className={`px-3 py-2.5 rounded-xl text-sm border text-center ${semaforoClass(cap.avance, prog)}`}>
                      {p !== null ? `${p}%` : '—'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Observaciones</label>
                    <input
                      type="text" disabled={isLocked}
                      defaultValue={cap.notas ?? ''}
                      key={`${ind.id}-notas-${cap.notas}`}
                      onBlur={e => {
                        if (e.target.value !== (cap.notas ?? '')) saveCaptura(ind, cap.avance, e.target.value);
                      }}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E] transition-colors
                        ${isLocked ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'}`}
                      placeholder="Notas..."
                    />
                  </div>
                </div>

                {/* Feedback */}
                <div className="mt-2 min-h-[20px]">
                  {saving === ind.id && (
                    <p className="text-xs text-blue-600 flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </p>
                  )}
                  {saved[ind.id] && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <span>✓</span> Guardado correctamente
                    </p>
                  )}
                  {error[ind.id] && (
                    <p className="text-xs text-red-600">{error[ind.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/interno/orpa" className="text-sm text-gray-500 hover:text-[#235B4E] flex items-center gap-1.5 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al portal
          </Link>
          <div className="flex gap-2">
            {mesAnterior && (
              <Link href={`/interno/orpa/captura/${mesAnterior}`}
                className="text-sm border border-gray-300 hover:border-[#235B4E] px-4 py-2 rounded-xl transition-colors">
                ← {MES_NOMBRE[mesAnterior]}
              </Link>
            )}
            {anyBorrador && (
              <button onClick={submitAll} disabled={submitting}
                className="bg-[#235B4E] hover:bg-[#1a4439] text-white text-sm font-semibold px-6 py-2 rounded-xl transition-colors disabled:opacity-60">
                {submitting ? 'Registrando...' : 'Confirmar avances'}
              </button>
            )}
            {mesSiguiente && (
              <Link href={`/interno/orpa/captura/${mesSiguiente}`}
                className="text-sm border border-gray-300 hover:border-[#235B4E] px-4 py-2 rounded-xl transition-colors">
                {MES_NOMBRE[mesSiguiente]} →
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
