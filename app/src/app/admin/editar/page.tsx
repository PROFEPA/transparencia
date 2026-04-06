'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAreas, getEntidades, getIndicadoresPOA, getMetas, updateMeta, createMeta } from '@/lib/poa-api';
import type { AreaPOA, EntidadFederativa, IndicadorPOA, MetaPOA } from '@/types/poa';

const MESES_OPTIONS = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export default function EditarPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [areas, setAreas] = useState<AreaPOA[]>([]);
  const [entidades, setEntidades] = useState<EntidadFederativa[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadorPOA[]>([]);
  const [existingMeta, setExistingMeta] = useState<MetaPOA | null>(null);

  const [selectedArea, setSelectedArea] = useState('');
  const [selectedIndicador, setSelectedIndicador] = useState<number | ''>('');
  const [selectedMes, setSelectedMes] = useState<number | ''>('');
  const [selectedEntidad, setSelectedEntidad] = useState<number | ''>('');
  const [valorPlaneado, setValorPlaneado] = useState('');
  const [valorReal, setValorReal] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getAreas().then(setAreas).catch(() => {});
    getEntidades().then(setEntidades).catch(() => {});
  }, []);

  // Pre-fill from URL params
  useEffect(() => {
    const indParam = searchParams?.get('indicador');
    const entParam = searchParams?.get('entidad');
    const mesParam = searchParams?.get('mes');

    if (indParam) setSelectedIndicador(parseInt(indParam));
    if (entParam) setSelectedEntidad(parseInt(entParam));
    if (mesParam) setSelectedMes(parseInt(mesParam));
  }, [searchParams]);

  useEffect(() => {
    if (selectedArea) {
      getIndicadoresPOA(selectedArea).then(setIndicadores).catch(() => {});
    } else {
      setIndicadores([]);
    }
  }, [selectedArea]);

  // Load existing meta when all selectors are filled
  useEffect(() => {
    if (selectedIndicador && selectedEntidad && selectedMes) {
      getMetas({
        indicador_id: selectedIndicador as number,
        entidad_id: selectedEntidad as number,
        mes: selectedMes as number,
      }).then(metas => {
        if (metas.length > 0) {
          const m = metas[0];
          setExistingMeta(m);
          setValorPlaneado(m.valor_planeado?.toString() || '');
          setValorReal(m.valor_real?.toString() || '');
        } else {
          setExistingMeta(null);
          setValorPlaneado('');
          setValorReal('');
        }
      }).catch(() => {});
    }
  }, [selectedIndicador, selectedEntidad, selectedMes]);

  const selectedIndicadorObj = indicadores.find(i => i.id === selectedIndicador);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedIndicador || !selectedMes || !selectedEntidad) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (existingMeta) {
        await updateMeta(existingMeta.id, {
          valor_planeado: valorPlaneado ? parseFloat(valorPlaneado) : undefined,
          valor_real: valorReal ? parseFloat(valorReal) : undefined,
        });
        setSuccess('Información actualizada exitosamente');
      } else {
        await createMeta({
          indicador_id: selectedIndicador as number,
          entidad_id: selectedEntidad as number,
          mes: selectedMes as number,
          valor_planeado: valorPlaneado ? parseFloat(valorPlaneado) : undefined,
        });
        setSuccess('Meta registrada exitosamente');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          <a
            href="/admin/reporte"
            className="px-4 py-2 bg-gob-green-600 text-white rounded-xl text-sm font-medium hover:bg-gob-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reporte Completo
          </a>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gob-green-700 to-gob-green-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Edición POA 2026</h2>
            <p className="text-white/70 mt-1">Corrija o actualice los avances previamente capturados.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gob-gold-300 uppercase font-semibold">Entidad Responsable</p>
            <p className="text-lg font-bold">S. {user?.nombre}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selectors */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                1. Subprocuraduría / Área
              </label>
              <div className="relative">
                <select
                  value={selectedArea}
                  onChange={e => setSelectedArea(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer"
                >
                  <option value="">Seleccione Área...</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                2. Indicador POA
              </label>
              <div className="relative">
                <select
                  value={selectedIndicador}
                  onChange={e => setSelectedIndicador(e.target.value ? parseInt(e.target.value) : '')}
                  disabled={!selectedArea}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{selectedArea ? 'Seleccione Indicador...' : 'Elija un Área primero'}</option>
                  {indicadores.map(i => (
                    <option key={i.id} value={i.id}>{i.clave} - {i.nombre}</option>
                  ))}
                </select>
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                3. Mes de Reporte
              </label>
              <div className="relative">
                <select
                  value={selectedMes}
                  onChange={e => setSelectedMes(e.target.value ? parseInt(e.target.value) : '')}
                  disabled={!selectedIndicador}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{selectedIndicador ? 'Seleccione Mes...' : 'Seleccione Indicador...'}</option>
                  {MESES_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                4. Entidad Federativa
              </label>
              <div className="relative">
                <select
                  value={selectedEntidad}
                  onChange={e => setSelectedEntidad(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer"
                >
                  <option value="">Seleccione Entidad...</option>
                  {entidades.map(e => (
                    <option key={e.id} value={e.id}>{e.clave} - {e.nombre}</option>
                  ))}
                </select>
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Value inputs - side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Planeado */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h4 className="text-lg font-bold text-gray-800 mb-3">Valor Planeado (Meta)</h4>
            <input
              type="number"
              step="0.01"
              value={valorPlaneado}
              onChange={e => setValorPlaneado(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 border-2 border-gob-gold-200 rounded-xl text-center text-3xl font-light text-gray-500 focus:outline-none focus:ring-2 focus:ring-gob-gold-400 focus:border-transparent bg-gob-gold-50/30"
            />
          </div>

          {/* Real */}
          <div className="bg-white rounded-2xl border-2 border-gob-green-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold text-gray-800">Valor Real (Ejecutado)</h4>
              <span className="px-2.5 py-0.5 bg-gob-green-100 text-gob-green-700 text-xs font-bold rounded-full uppercase">
                Editable
              </span>
            </div>
            <input
              type="number"
              step="0.01"
              value={valorReal}
              onChange={e => setValorReal(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 border-2 border-gob-green-200 rounded-xl text-center text-3xl font-light text-gray-800 focus:outline-none focus:ring-2 focus:ring-gob-green-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-200 text-sm font-medium">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !selectedIndicador || !selectedMes || !selectedEntidad}
          className="w-full bg-gob-green-600 hover:bg-gob-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gob-green-600/20 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {submitting ? 'Actualizando...' : 'Actualizar Información'}
        </button>
      </form>
    </div>
  );
}
