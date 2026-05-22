'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface Captura {
  id: number; indicador_id: number; oficina: string; mes: number;
  status: string; avance: number | null; programado: number | null;
  codigo: string; nombre: string;
}

export default function PublicarPage() {
  const router = useRouter();
  const [mesesSeleccionados, setMesesSeleccionados] = useState<number[]>([]);
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; capturas_publicadas?: number; message?: string } | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    Promise.all([
      fetch('/api/interno/auth/me').then(r => r.json()),
      fetch('/api/interno/capturas?status=aprobado').then(r => r.json()),
    ]).then(([me, caps]) => {
      if (me.error || me.user?.role !== 'admin') { router.push('/interno/login'); return; }
      setCapturas(Array.isArray(caps) ? caps : []);
    }).finally(() => setLoading(false));
  }, [router]);

  function toggleMes(mes: number) {
    setMesesSeleccionados(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes].sort((a, b) => a - b)
    );
    setResult(null);
  }

  const mesesConAprobadas = [...new Set(capturas.map(c => c.mes))].sort((a, b) => a - b);
  const filtradas = mesesSeleccionados.length > 0
    ? capturas.filter(c => mesesSeleccionados.includes(c.mes))
    : capturas;

  const oficinasAPublicar = new Set(filtradas.map(c => c.oficina)).size;
  const indicadoresAPublicar = new Set(filtradas.map(c => c.codigo)).size;

  async function publicar() {
    if (mesesSeleccionados.length === 0) return;
    setPublishing(true);
    setResult(null);
    try {
      const res = await fetch('/api/interno/admin/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meses: mesesSeleccionados, descripcion }),
      });
      const data = await res.json();
      setResult(res.ok ? { ok: true, capturas_publicadas: data.capturas_publicadas } : { ok: false, message: data.error });
      if (res.ok) setStep(3);
    } catch {
      setResult({ ok: false, message: 'Error de conexión al publicar' });
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando datos...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#235B4E] to-[#1a4439] text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-4 h-16">
            <Link href="/interno/admin"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="font-bold text-lg leading-tight">Publicar al dashboard público</h1>
              <p className="text-green-300 text-xs">Solo capturas aprobadas · POA 2026</p>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/interno/admin/capturas" className="hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors">Capturas</Link>
              <Link href="/interno/admin/publicar" className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium">Publicar</Link>
              <Link href="/interno/admin/usuarios" className="hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors">Usuarios</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Info banner */}
        <div className="bg-[#235B4E]/5 border border-[#235B4E]/20 rounded-2xl p-5 flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-[#235B4E]/10 rounded-xl flex items-center justify-center text-[#235B4E] text-xl">
            📢
          </div>
          <div>
            <p className="text-sm font-semibold text-[#235B4E]">Publicación de datos POA 2026</p>
            <p className="text-xs text-gray-600 mt-1">
              Selecciona los meses cuyos datos aprobados deseas integrar al dashboard público.
              Esta acción hace visible la información en el sitio web de PROFEPA.
              Puede ejecutarse tantas veces como sea necesario — las publicaciones anteriores se actualizan.
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span><strong className="text-[#235B4E]">{capturas.length}</strong> capturas aprobadas disponibles</span>
              <span><strong className="text-[#235B4E]">{mesesConAprobadas.length}</strong> meses con datos</span>
            </div>
          </div>
        </div>

        {/* Step 1: Select months */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              mesesSeleccionados.length > 0 ? 'bg-[#235B4E] text-white' : 'bg-gray-100 text-gray-500'}`}>
              1
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Selecciona los meses a publicar</h2>
              <p className="text-xs text-gray-500 mt-0.5">Solo aparecen meses con capturas aprobadas disponibles</p>
            </div>
          </div>

          {mesesConAprobadas.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div>
                <p className="font-medium">Sin capturas aprobadas</p>
                <p className="text-xs mt-1">Debes aprobar capturas en la sección de revisión antes de poder publicar.</p>
                <Link href="/interno/admin/capturas?status=enviado" className="text-xs text-amber-700 underline mt-2 inline-block">
                  Ir a revisar capturas →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                  const hasApproved = mesesConAprobadas.includes(mes);
                  const selected = mesesSeleccionados.includes(mes);
                  const count = capturas.filter(c => c.mes === mes).length;
                  return (
                    <button key={mes}
                      onClick={() => hasApproved && toggleMes(mes)}
                      disabled={!hasApproved}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all
                        ${!hasApproved ? 'opacity-30 cursor-not-allowed border-gray-100 bg-gray-50' :
                          selected
                            ? 'border-[#235B4E] bg-[#235B4E]/5 shadow-sm ring-2 ring-[#235B4E]/20 ring-offset-1'
                            : 'border-gray-200 hover:border-[#235B4E]/40 bg-white cursor-pointer hover:shadow-sm'}`}
                    >
                      <span className="text-sm font-bold text-gray-700">{MESES[mes].slice(0,3)}</span>
                      {hasApproved ? (
                        <span className="text-xs text-emerald-700 mt-0.5 font-medium">{count}</span>
                      ) : (
                        <span className="text-xs text-gray-300 mt-0.5">—</span>
                      )}
                      {selected && <span className="text-[#235B4E] text-xs mt-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setMesesSeleccionados(mesesConAprobadas)}
                  className="text-xs text-[#235B4E] hover:underline">
                  Seleccionar todos
                </button>
                {mesesSeleccionados.length > 0 && (
                  <button onClick={() => setMesesSeleccionados([])}
                    className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                    Limpiar selección
                  </button>
                )}
                {mesesSeleccionados.length > 0 && (
                  <span className="text-xs text-gray-500 ml-auto">
                    {mesesSeleccionados.map(m => MESES[m].slice(0,3)).join(', ')} seleccionados
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Step 2: Preview */}
        {mesesSeleccionados.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#235B4E] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <h2 className="font-semibold text-gray-800">Vista previa de la publicación</h2>
                <p className="text-xs text-gray-500 mt-0.5">Resumen de lo que se integrará al dashboard</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center p-4 bg-[#235B4E]/5 rounded-xl border border-[#235B4E]/10">
                <div className="text-2xl font-black text-[#235B4E]">{filtradas.length}</div>
                <div className="text-xs text-gray-600 mt-0.5 font-medium">capturas</div>
              </div>
              <div className="text-center p-4 bg-[#235B4E]/5 rounded-xl border border-[#235B4E]/10">
                <div className="text-2xl font-black text-[#235B4E]">{oficinasAPublicar}</div>
                <div className="text-xs text-gray-600 mt-0.5 font-medium">oficinas ORPA</div>
              </div>
              <div className="text-center p-4 bg-[#235B4E]/5 rounded-xl border border-[#235B4E]/10">
                <div className="text-2xl font-black text-[#235B4E]">{indicadoresAPublicar}</div>
                <div className="text-xs text-gray-600 mt-0.5 font-medium">indicadores</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Descripción de la publicación <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E]"
                placeholder={`Ej: Corte POA 2026 ${mesesSeleccionados.map(m => MESES[m].slice(0,3)).join('-')}`} />
            </div>
          </div>
        )}

        {/* Step 3: Publish button */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              result?.ok ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {result?.ok ? '✓' : '3'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Publicar al dashboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">Acción reversible — puedes republicar en cualquier momento</p>
            </div>
          </div>

          {result && (
            <div className={`mb-4 p-4 rounded-xl border ${result.ok ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
              {result.ok ? (
                <div>
                  <p className="font-semibold text-emerald-800 flex items-center gap-2">
                    <span>✓</span> Publicación exitosa
                  </p>
                  <p className="text-sm text-emerald-700 mt-1">
                    {result.capturas_publicadas} capturas integradas al dashboard público.
                  </p>
                  <Link href="/" target="_blank" rel="noopener noreferrer"
                    className="text-sm text-emerald-700 underline mt-2 inline-flex items-center gap-1">
                    Ver dashboard público <span>↗</span>
                  </Link>
                </div>
              ) : (
                <p className="text-red-800 text-sm">{result.message}</p>
              )}
            </div>
          )}

          <button onClick={publicar}
            disabled={mesesSeleccionados.length === 0 || publishing}
            className="w-full py-3.5 bg-[#235B4E] hover:bg-[#1a4439] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
            {publishing && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {publishing ? 'Publicando datos...' :
              mesesSeleccionados.length === 0
                ? 'Selecciona al menos un mes para continuar'
                : `Publicar ${filtradas.length} capturas — ${mesesSeleccionados.map(m => MESES[m].slice(0,3)).join(', ')}`}
          </button>
        </div>

      </main>
    </div>
  );
}
