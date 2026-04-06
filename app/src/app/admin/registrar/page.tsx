'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAreas, getEntidades, getIndicadoresPOA, createMeta } from '@/lib/poa-api';
import type { AreaPOA, EntidadFederativa, IndicadorPOA } from '@/types/poa';

const MESES_OPTIONS = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export default function RegistrarPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<AreaPOA[]>([]);
  const [entidades, setEntidades] = useState<EntidadFederativa[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadorPOA[]>([]);

  const [selectedArea, setSelectedArea] = useState('');
  const [selectedIndicador, setSelectedIndicador] = useState<number | ''>('');
  const [selectedMes, setSelectedMes] = useState<number | ''>('');
  const [selectedEntidad, setSelectedEntidad] = useState<number | ''>('');
  const [valorPlaneado, setValorPlaneado] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getAreas().then(setAreas).catch(() => {});
    getEntidades().then(setEntidades).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedArea) {
      getIndicadoresPOA(selectedArea).then(setIndicadores).catch(() => {});
      setSelectedIndicador('');
      setSelectedMes('');
    } else {
      setIndicadores([]);
    }
  }, [selectedArea]);

  const selectedIndicadorObj = indicadores.find(i => i.id === selectedIndicador);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedIndicador || !selectedMes || !selectedEntidad) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createMeta({
        indicador_id: selectedIndicador as number,
        entidad_id: selectedEntidad as number,
        mes: selectedMes as number,
        valor_planeado: valorPlaneado ? parseFloat(valorPlaneado) : undefined,
      });
      setSuccess('Meta registrada exitosamente');
      setValorPlaneado('');
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gob-green-700 to-gob-green-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 right-12 w-32 h-32 bg-white/5 rounded-full translate-y-1/4" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Registro POA 2026</h2>
            <p className="text-white/70 mt-1">Capture los avances correspondientes al cumplimiento de metas federales.</p>
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
            {/* 1. Area */}
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

            {/* 2. Indicador */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                2. Indicador POA
              </label>
              <div className="relative">
                <select
                  value={selectedIndicador}
                  onChange={e => setSelectedIndicador(e.target.value ? parseInt(e.target.value) : '')}
                  disabled={!selectedArea}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* 3. Mes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                3. Mes de Reporte
              </label>
              <div className="relative">
                <select
                  value={selectedMes}
                  onChange={e => setSelectedMes(e.target.value ? parseInt(e.target.value) : '')}
                  disabled={!selectedIndicador}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* 4. Entidad */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                4. Entidad Federativa (ORPA)
              </label>
              <div className="relative">
                <select
                  value={selectedEntidad}
                  onChange={e => setSelectedEntidad(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none cursor-pointer"
                >
                  <option value="">Seleccione Entidad...</option>
                  {entidades.map(e => (
                    <option key={e.id} value={e.id}>{e.clave} - {e.abreviatura}</option>
                  ))}
                </select>
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Value input */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-8">
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-800 mb-1">Valor Planeado (Meta)</h4>
              <p className="text-sm text-gray-500">
                {selectedIndicadorObj
                  ? `Unidad de medida: ${selectedIndicadorObj.unidad_medida || 'No especificada'}`
                  : 'Seleccione un indicador para ver la unidad de medida.'}
              </p>
            </div>
            <div className="text-center">
              <span className="inline-block px-3 py-0.5 bg-gob-gold-100 text-gob-gold-700 text-xs font-bold uppercase rounded-full mb-2">
                Planeado
              </span>
              <input
                type="number"
                step="0.01"
                value={valorPlaneado}
                onChange={e => setValorPlaneado(e.target.value)}
                placeholder="0.00"
                className="w-40 px-4 py-3 border-2 border-gob-gold-200 rounded-xl text-center text-2xl font-light text-gray-600 focus:outline-none focus:ring-2 focus:ring-gob-gold-400 focus:border-transparent"
              />
            </div>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {submitting ? 'Registrando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}
