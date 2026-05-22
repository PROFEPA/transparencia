'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTO = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface Captura {
  id: number; indicador_id: number; oficina: string; mes: number; status: string;
  programado: number | null; avance: number | null; notas: string | null;
  codigo: string; nombre: string; serie: string;
  submitted_at: string | null; motivo_rechazo: string | null;
  updated_at: string | null;
}

function pct(avance: number | null, prog: number | null): number | null {
  if (avance === null || prog === null || prog === 0) return null;
  return Math.round((avance / prog) * 100);
}
function pctClass(p: number | null): string {
  if (p === null) return 'bg-gray-100 text-gray-400';
  if (p >= 90) return 'bg-emerald-100 text-emerald-700 font-bold';
  if (p >= 70) return 'bg-amber-100 text-amber-700 font-bold';
  return 'bg-red-100 text-red-700 font-bold';
}

const STATUS_META: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  aprobado: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Aprobado' },
  enviado:  { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Enviado' },
  borrador: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Borrador' },
  rechazado:{ bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Rechazado' },
};

function AdminCapturasInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? '');
  const [filterMes, setFilterMes] = useState(searchParams.get('mes') ?? '');
  const [filterOficina, setFilterOficina] = useState(searchParams.get('oficina') ?? '');
  const [filterCodigo, setFilterCodigo] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: number; codigo: string; oficina: string } | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadCapturas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterMes) params.set('mes', filterMes);
    if (filterOficina) params.set('oficina', filterOficina);
    const res = await fetch(`/api/interno/capturas?${params}`);
    if (res.status === 401) { router.push('/interno/login'); return; }
    const data = await res.json();
    setCapturas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filterStatus, filterMes, filterOficina, router]);

  useEffect(() => { loadCapturas(); }, [loadCapturas]);

  async function approve(id: number) {
    setProcessing(id);
    const r = await fetch(`/api/interno/capturas/${id}/approve`, { method: 'POST' });
    if (r.ok) showToast('Captura aprobada');
    else showToast('Error al aprobar', 'err');
    await loadCapturas();
    setProcessing(null);
  }

  async function reject(id: number) {
    setProcessing(id);
    const r = await fetch(`/api/interno/capturas/${id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo: rejectMotivo }),
    });
    if (r.ok) showToast('Captura rechazada');
    else showToast('Error al rechazar', 'err');
    setRejectModal(null);
    setRejectMotivo('');
    await loadCapturas();
    setProcessing(null);
  }

  async function approveAll() {
    const enviadas = capturas.filter(c => c.status === 'enviado');
    setProcessing(-1);
    for (const c of enviadas) {
      await fetch(`/api/interno/capturas/${c.id}/approve`, { method: 'POST' });
    }
    showToast(`${enviadas.length} capturas aprobadas`);
    await loadCapturas();
    setProcessing(null);
  }

  const oficinas = [...new Set(capturas.map(c => c.oficina))].sort();
  const enviadas = capturas.filter(c => c.status === 'enviado');
  const filtered = filterCodigo
    ? capturas.filter(c => c.codigo.toLowerCase().includes(filterCodigo.toLowerCase()) || c.nombre.toLowerCase().includes(filterCodigo.toLowerCase()))
    : capturas;

  const countByStatus = {
    aprobado: capturas.filter(c => c.status === 'aprobado').length,
    enviado: capturas.filter(c => c.status === 'enviado').length,
    borrador: capturas.filter(c => c.status === 'borrador').length,
    rechazado: capturas.filter(c => c.status === 'rechazado').length,
  };

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
            <div className="flex-1">
              <h1 className="font-bold text-lg leading-tight">Revisión de capturas</h1>
              <p className="text-green-300 text-xs">POA 2026 · Panel Administrador</p>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/interno/admin/capturas" className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium">Capturas</Link>
              <Link href="/interno/admin/publicar" className="hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors">Publicar</Link>
              <Link href="/interno/admin/usuarios" className="hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors">Usuarios</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Status summary strip */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex gap-4 overflow-x-auto">
          {Object.entries(STATUS_META).map(([st, meta]) => (
            <button key={st} onClick={() => setFilterStatus(filterStatus === st ? '' : st)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
                filterStatus === st ? `${meta.bg} ${meta.text} ring-2 ring-offset-1 ring-current` : 'hover:bg-gray-100 text-gray-600'
              }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              {meta.label}
              <span className={`ml-0.5 text-xs font-bold ${filterStatus === st ? meta.text : 'text-gray-400'}`}>
                {countByStatus[st as keyof typeof countByStatus]}
              </span>
            </button>
          ))}
          <div className="flex-1" />
          {enviadas.length > 0 && (
            <button onClick={approveAll} disabled={processing !== null}
              className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2">
              {processing === -1 && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Aprobar todas enviadas ({enviadas.length})
            </button>
          )}
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-6 py-6">

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
            <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E] bg-white">
              <option value="">Todos los meses</option>
              {MESES_CORTO.slice(1).map((m, i) => <option key={i+1} value={i+1}>{MESES[i+1]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Oficina</label>
            <select value={filterOficina} onChange={e => setFilterOficina(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E] bg-white min-w-[160px]">
              <option value="">Todas las oficinas</option>
              {oficinas.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Indicador</label>
            <input type="text" value={filterCodigo} onChange={e => setFilterCodigo(e.target.value)}
              placeholder="Buscar código o nombre..."
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E] w-52" />
          </div>
          {(filterStatus || filterMes || filterOficina || filterCodigo) && (
            <button onClick={() => { setFilterStatus(''); setFilterMes(''); setFilterOficina(''); setFilterCodigo(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              Limpiar filtros
            </button>
          )}
          <div className="flex-1" />
          <span className="text-sm text-gray-500 self-center">{filtered.length} resultados</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Cargando capturas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium text-gray-600">No hay capturas con estos filtros</p>
            <p className="text-sm text-gray-400 mt-1">Ajusta los filtros para ver resultados</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Oficina / Mes</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Indicador</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prog.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avance</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const p = pct(c.avance, c.programado);
                  const meta = STATUS_META[c.status];
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${c.status === 'enviado' ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-5 py-3.5">
                        <Link href={`/interno/admin/orpa/${encodeURIComponent(c.oficina)}`}
                          className="font-semibold text-[#235B4E] hover:underline text-sm block">
                          {c.oficina}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-500">{MESES_CORTO[c.mes]}</span>
                          {c.submitted_at && (
                            <span className="text-xs text-gray-400">
                              · {new Date(c.submitted_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold bg-[#235B4E]/10 text-[#235B4E] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{c.codigo}</span>
                          <div className="min-w-0">
                            <p className="text-gray-800 font-medium line-clamp-1">{c.nombre}</p>
                            {c.notas && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{c.notas}</p>}
                            {c.motivo_rechazo && (
                              <p className="text-xs text-red-600 mt-0.5 line-clamp-1">⚠ {c.motivo_rechazo}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums">{c.programado ?? '—'}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-800 tabular-nums">{c.avance ?? '—'}</td>
                      <td className="px-4 py-3.5 text-center">
                        {p !== null ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${pctClass(p)}`}>{p}%</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {meta && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${meta.bg} ${meta.text}`}>
                            {meta.label}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.status === 'enviado' && (
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => approve(c.id)}
                              disabled={processing !== null}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors font-medium flex items-center gap-1">
                              {processing === c.id ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '✓'}
                              Aprobar
                            </button>
                            <button onClick={() => { setRejectModal({ id: c.id, codigo: c.codigo, oficina: c.oficina }); setRejectMotivo(''); }}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                              Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-lg flex-shrink-0">✗</div>
              <div>
                <h3 className="font-semibold text-gray-800">Rechazar captura</h3>
                <p className="text-xs text-gray-500">{rejectModal.codigo} · {rejectModal.oficina}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">Indica el motivo del rechazo para que la ORPA pueda corregirlo:</p>
            <textarea value={rejectMotivo} onChange={e => setRejectMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              rows={3} placeholder="Ej: El valor de avance no coincide con el reporte mensual enviado..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => reject(rejectModal.id)} disabled={!rejectMotivo.trim() || processing !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                Confirmar rechazo
              </button>
              <button onClick={() => { setRejectModal(null); setRejectMotivo(''); }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'ok' ? '✓ ' : '✗ '}{toast.msg}
        </div>
      )}
    </div>
  );
}

export default function AdminCapturas() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin" /></div>}>
      <AdminCapturasInner />
    </Suspense>
  );
}
